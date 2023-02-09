<script lang="ts">
	import { onMount } from 'svelte';

	let w = 400;
	let h = 400;
	let displayText = '';

	let showSpecular = true;
	let showShadows = true;
	let showReflections = true;

	// the conditional below seems silly because it always resolves
	// to true, but it's the only way I could figure out how to make
	// the binding reactive to `showSpecular`
	$: if (
		showSpecular === true ||
		showSpecular === false ||
		showShadows === true ||
		showShadows === false ||
		showReflections === true ||
		showReflections === false
	) {
		init();
	}

	// don't run this code server-side (unnecessary now that i disabled SSR)
	onMount(() => init());
	function init() {
		let canvas = document.getElementById('ch1') as HTMLCanvasElement | null;
		let ctx = canvas?.getContext('2d');

		if (!ctx) {
			console.error('Error setting up canvas');
		} else {
			start(ctx);
		}

		type Sphere = {
			type: 'sphere';
			center: Pos3D;
			radius: Unit;
			color: RGB;
			reflective: number;
			specular: number;
		};
		type Light = AmbientLight | PointLight | DirectionLight;
		type BaseLight = {
			intensity: number;
		};
		type AmbientLight = { type: 'ambient' } & BaseLight;
		type PointLight = { type: 'point'; position: Pos3D } & BaseLight;
		type DirectionLight = { type: 'directional'; direction: Dir3D } & BaseLight;

		type Pos3D = number[]; // rank 3
		type Dir3D = number[]; // rank 3
		type RGB = number[];
		type RGBA = number[];
		type Unit = number;

		function start(ctx: CanvasRenderingContext2D) {
			const imageData = ctx.createImageData(w, h);

			// First we'll configure our camera and our viewport
			const ORIGIN: Pos3D = [0, 0, 0];
			// let BACKGROUND_COLOR: RGB = [255, 255, 255];
			let BACKGROUND_COLOR: RGB = [0, 0, 0];
			let cameraPos = ORIGIN; // origin
			// let cameraOrientation; // assumed to be facing straight up the z-axis for now
			let viewport = { vh: 1, vw: 1, distance: 1 }; // height, width, distance from camera
			let sceneObjects: Sphere[] = [
				{
					type: 'sphere',
					center: [0, -1, 3],
					radius: 1,
					color: [255, 0, 0], // red
					specular: 500, // shiny
					reflective: 0.3 // a bit reflective
				},
				{
					type: 'sphere',
					center: [2, 0, 4],
					radius: 1,
					color: [0, 0, 255], // blue
					specular: 500, // shiny
					reflective: 0.4 // a bit more reflective
				},
				{
					type: 'sphere',
					center: [-2, 0, 4],
					radius: 1,
					color: [0, 255, 0], // green
					specular: 10, // somewhat shiny
					reflective: 0.4 // even more reflective
				},
				{
					type: 'sphere',
					center: [0, -5001, 0],
					radius: 5000,
					color: [255, 255, 0], // yellow
					specular: 1000, // very shiny
					reflective: 0.5 // half reflective
				}
			];
			let lights: Light[] = [
				{ type: 'ambient', intensity: 0.2 },
				{ type: 'point', intensity: 0.6, position: [2, 1, 0] },
				{ type: 'directional', intensity: 0.2, direction: [1, 4, 4] }
			];

			let canvasToViewport = (cx: number, cy: number) => [
				(cx * viewport.vw) / w,
				(cy * viewport.vh) / h,
				viewport.distance
			];
			let closestIntersection = (
				cameraPos: Pos3D,
				vDirection: Dir3D,
				tMin: Unit,
				tMax: Unit
			): { object: Sphere | null; t: Unit } => {
				let closest_t = Infinity;
				let closestObject = null;

				for (let object of sceneObjects.filter((o) => o.type === 'sphere')) {
					let [t1, t2] = intersectRayWithSphere(cameraPos, vDirection, object);
					if (t1 > tMin && t1 < tMax && t1 < closest_t) {
						closest_t = t1;
						closestObject = object;
					}
					if (t2 > tMin && t2 < tMax && t2 < closest_t) {
						closest_t = t2;
						closestObject = object;
					}
				}

				return {
					object: closestObject,
					t: closest_t
				};
			};
			let traceRay = (
				cameraPos: Pos3D,
				vDirection: Dir3D,
				tMin: Unit,
				tMax: Unit,
				recursionDepth: number = 3
			): RGB => {
				let { t: closest_t, object: closestObject } = closestIntersection(
					cameraPos,
					vDirection,
					tMin,
					tMax
				);
				if (closestObject === null) {
					return BACKGROUND_COLOR;
				}
				let P = add(cameraPos, scale(vDirection, closest_t));
				let N = sub(P, closestObject.center);
				N = scale(N, 1 / len(N));
				// return closestObject.color;
				// return scale([255, 255, 255], computeLighting(P, N));
				let localColor = scale(
					closestObject.color,
					computeLighting(P, N, scale(vDirection, -1), closestObject.specular)
				);

				if (!showReflections) return localColor;

				let r = closestObject.reflective;
				if (recursionDepth <= 0 || r <= 0) {
					return localColor;
				}

				let R = reflectRay(scale(vDirection, -1), N);
				let reflectedColor = traceRay(P, R, 0.001, Infinity, recursionDepth - 1);

				return add(scale(localColor, 1 - r), scale(reflectedColor, r));
			};
			let dot = (left: Dir3D, right: Dir3D) => {
				return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
			};
			let zip = <T>(left: number[], right: number[], op: (left: number, right: number) => T) => {
				return left.map((val, idx) => op(val, right[idx]));
			};
			let add = (left: number[], right: number[]): number[] => {
				return zip(left, right, (a, b) => a + b);
			};
			let sub = (left: number[], right: number[]): number[] => {
				return zip(left, right, (a, b) => a - b);
			};
			let scale = (left: number[], scale: number): number[] => {
				return zip(left, [], (a) => a * scale);
			};
			let len = (vector: number[]): number => {
				return Math.sqrt(dot(vector, vector));
			};
			let reflectRay = (ray: Dir3D, normal: Dir3D): Dir3D => {
				return sub(scale(normal, 2 * dot(normal, ray)), ray);
			};
			let intersectRayWithSphere = (origin: Pos3D, vDirection: Dir3D, sphere: Sphere) => {
				let r: Unit = sphere.radius;
				let vCircle: Dir3D = [
					origin[0] - sphere.center[0],
					origin[1] - sphere.center[1],
					origin[2] - sphere.center[2]
				];
				let a = dot(vDirection, vDirection);
				let b = 2 * dot(vCircle, vDirection);
				let c = dot(vCircle, vCircle) - r * r;
				let discriminant = b * b - 4 * a * c;
				if (discriminant < 0) {
					return [Infinity, Infinity];
				}
				let t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
				let t2 = (-b - Math.sqrt(discriminant)) / (2 * a);

				return [t1, t2];
			};
			let computeLighting = (point: Pos3D, normal: Dir3D, view: Dir3D, specular: number) => {
				let i = 0; // total intensity at this point
				for (let light of lights) {
					if (light.type === 'ambient') {
						i += light.intensity;
					} else {
						let L;
						let t_max;

						if (light.type === 'point') {
							L = sub(light.position, point);
							t_max = 1;
						} else {
							L = light.direction;
							t_max = Infinity;
						}

						// shadow check
						let obstruction = closestIntersection(point, L, 0.001, t_max);
						if (obstruction.object !== null && showShadows) {
							continue;
						}

						// diffuse
						let normalLight = dot(normal, L);
						if (normalLight > 0) {
							i += (light.intensity * normalLight) / (len(normal) * len(L));
						}

						// specular
						if (specular !== -1 && showSpecular) {
							let R = sub(scale(normal, 2 * dot(normal, L)), L);
							let RdotV = dot(R, view);
							if (RdotV > 0) {
								i += light.intensity * Math.pow(RdotV / (len(R) * len(view)), specular);
							}
						}
					}
				}
				return i;
			};

			let tMin = 0;
			let tMax = 7000;
			function putPixel(cx: number, cy: number): RGB {
				let vDirection = canvasToViewport(cx, cy);
				let pixelColor = traceRay(cameraPos, vDirection, tMin, tMax);
				let [r, g, b, a] = pixelColor;

				return [r, g, b, 255];
			}

			// //////////////////////////////////////////////////////////////////
			// Iterate through every pixel
			displayText = `Rendering...`;
			// Run in a microtask:
			setTimeout(() => {
				let start = performance.now();

				for (let i = 0; i < imageData.data.length; i += 4) {
					let xCoord = ((i / 4) % h) - w / 2;
					let yCoord = -1 * (Math.floor(i / 4 / h) - h / 2);
					let color = putPixel(xCoord, yCoord);
					let [r, g, b, a = 255] = color;

					// Modify pixel data
					imageData.data[i + 0] = r; // R value
					imageData.data[i + 1] = g; // G value
					imageData.data[i + 2] = b; // B value
					imageData.data[i + 3] = a; // A value
				}
				// Draw image data to the canvas
				ctx.putImageData(imageData, 0, 0);
				displayText = `Rendered in ${((performance.now() - start) / 1000).toFixed(2)}s `;
			});
		}
	}
</script>

<p><label><input bind:checked={showSpecular} type="checkbox" /> Show specular?</label></p>
<p><label><input bind:checked={showShadows} type="checkbox" /> Show shadows?</label></p>
<p><label><input bind:checked={showReflections} type="checkbox" /> Show reflections?</label></p>

<p>Canvas implementation:</p>

<canvas id="ch1" width={w} height={h} />

<p>{displayText}</p>

<style>
	#ch1 {
		border: 3px solid black;
	}
</style>
