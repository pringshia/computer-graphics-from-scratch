import type { PageLoad, PageLoadEvent } from './$types';

export const load: PageLoad = (_e: PageLoadEvent) => {
	return {
		title: `Chapter 4 - Shadows and Reflections`
	};
};
