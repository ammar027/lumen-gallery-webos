// Where the picture sits on the 1920x1080 screen for each matte layout.

import type {MatteLayout} from './settings';

export interface Box {left: number; top: number; width: number; height: number}

export const SCREEN_W = 1920;
export const SCREEN_H = 1080;

/** the margin (px) kept free around the picture */
const MARGIN: Record<MatteLayout, number> = {fill: 0, none: 0, modern: 84, wide: 190, flexible: 150, shadowbox: 130};

/** Fits a picture of the given aspect (width / height) into the screen minus the margin, centred. */
export function pictureBox (matte: MatteLayout, aspect: number): Box {
	if (matte === 'fill') return {left: 0, top: 0, width: SCREEN_W, height: SCREEN_H};   // the picture fills the screen (the img is cropped with object-fit: cover)
	const m = MARGIN[matte];
	const aw = SCREEN_W - 2 * m;
	const ah = SCREEN_H - 2 * m;
	const wide = aw / ah > aspect;
	const height = wide ? ah : aw / aspect;
	const width = wide ? ah * aspect : aw;
	return {left: (SCREEN_W - width) / 2, top: (SCREEN_H - height) / 2, width, height};
}

export const grow = (b: Box, by: number): Box => ({left: b.left - by, top: b.top - by, width: b.width + 2 * by, height: b.height + 2 * by});
export const css = (b: Box): string => `left:${b.left}px;top:${b.top}px;width:${b.width}px;height:${b.height}px`;
