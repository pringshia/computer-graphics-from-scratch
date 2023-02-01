<script lang="ts">
	import { onMount } from 'svelte';

	let w = 400;
	let h = 400;
	let displayText = '';

	// don't run this code server-side
	onMount(() => {
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
		};
		type Pos3D = number[]; // rank 3
		type Dir3D = number[]; // rank 3
		type RGB = number[];
		type RGBA = number[];
		type Unit = number;

		function start(ctx: CanvasRenderingContext2D) {
			const imageData = ctx.createImageData(w, h);

			// First we'll configure our camera and our viewport
			const ORIGIN: Pos3D = [0, 0, 0];
			let BACKGROUND_COLOR: RGB = [255, 255, 255];
			let cameraPos = ORIGIN; // origin
			// let cameraOrientation; // assumed to be facing straight up the z-axis for now
			let viewport = { vh: 1, vw: 1, distance: 1 }; // height, width, distance from camera
			let sceneObjects: Sphere[] = [
				{ type: 'sphere', center: [0, -1, 3], radius: 1, color: [255, 0, 0] }, // red
				{ type: 'sphere', center: [2, 0, 4], radius: 1, color: [0, 0, 255] }, // blue
				{ type: 'sphere', center: [-2, 0, 4], radius: 1, color: [0, 255, 0] } // green
			];
			let tMin = 0;
			let tMax = 300;

			function putPixel(cx: number, cy: number): RGB {
				let canvasToViewport = (cx: number, cy: number) => [
					(cx * viewport.vw) / w,
					(cy * viewport.vh) / h,
					viewport.distance
				];
				let traceRay = (cameraPos: Pos3D, vDirection: Dir3D, tMin: Unit, tMax: Unit): RGB => {
					let closest_t = Infinity;
					let closestObject = null;

					for (let object of sceneObjects) {
						if (object.type !== 'sphere') throw Error('Invalid object found.');
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
					if (closestObject === null) {
						return BACKGROUND_COLOR;
					}
					return closestObject.color;
				};
				let dot = (left: Dir3D, right: Dir3D) => {
					return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
				};
				let intersectRayWithSphere = (cameraPos: Pos3D, vDirection: Dir3D, sphere: Sphere) => {
					let r: Unit = sphere.radius;
					let vCircle: Dir3D = [
						ORIGIN[0] - sphere.center[0],
						ORIGIN[1] - sphere.center[1],
						ORIGIN[2] - sphere.center[2]
					];
					let a = dot(vDirection, vDirection);
					let b = 2 * dot(vCircle, vDirection);
					let c = dot(vCircle, vCircle) - r * r;
					let discriminant = b * b - 4 * a * c;
					if (discriminant < 0) {
						return [Infinity, Infinity];
					}
					let t1 = -b + Math.sqrt(discriminant) / (2 * a);
					let t2 = -b - Math.sqrt(discriminant) / (2 * a);

					return [t1, t2];
				};

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
	});
</script>

<p>Canvas implementation:</p>

<canvas id="ch1" width={w} height={h} />

<p>{displayText}</p>

<style>
	#ch1 {
		border: 3px solid black;
	}
</style>
