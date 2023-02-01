import type { PageLoad, PageLoadEvent } from './$types';

export const load: PageLoad = (_e: PageLoadEvent) => {
	return {
		title: `Chapter 3 - Light`
	};
};
