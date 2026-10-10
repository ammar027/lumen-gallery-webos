// The order artworks are shown in: the chosen collection, shuffled or in order.

import {ARTWORKS, type Artwork} from '../config/art';
import type {Settings} from './settings';

/** What may be shown: the chosen collection, minus works with people (unless allowed), and for the fill layout only wide pictures (so little is cropped). */
export function pool (s: Settings): Artwork[] {
	let list = ARTWORKS;
	if (s.hidden.length) list = list.filter((a) => s.hidden.indexOf(a.id) === -1);
	if (s.people === 'hide') list = list.filter((a) => !a.p);
	if (s.animals === 'hide') list = list.filter((a) => !a.n);
	if (s.matte === 'fill') list = list.filter((a) => a.w > 0 && a.h > 0 && a.w / a.h >= 1.25);
	if (s.collection === 'Favorites') return list.filter((a) => s.favorites.indexOf(a.id) !== -1);
	if (s.collection === 'All') return s.islamic === 'exclude' ? list.filter((a) => a.c !== 'Islamic Art') : list;
	return list.filter((a) => a.c === s.collection);
}

export function shuffled<T> (list: T[]): T[] {
	const a = list.slice();
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const t = a[i]; a[i] = a[j]; a[j] = t;
	}
	return a;
}

/** The picture, resized to the screen by images.weserv.nl (the Met's originals can be many megabytes). */
export function imageUrl (a: Artwork): string {
	if (a.s === 'w') return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(a.u)}?width=1920`;   // Wikimedia Commons resizes on request
	const host = a.s === 'c' ? 'openaccess-cdn.clevelandart.org/' : 'images.metmuseum.org/';
	return `https://images.weserv.nl/?url=${encodeURIComponent(host + a.u)}&w=1920&h=1080&fit=inside&q=85&output=jpg`;
}

/** Shuffled, but taking turns between collections so one big collection does not crowd out the rest. */
export function shuffledByCollection (list: Artwork[]): Artwork[] {
	const groups: Record<string, Artwork[]> = {};
	list.forEach((a) => { (groups[a.c] = groups[a.c] || []).push(a); });
	const lists = Object.keys(groups).map((k) => shuffled(groups[k]));
	const out: Artwork[] = [];
	for (let i = 0; out.length < list.length; i++) lists.forEach((l) => { if (i < l.length) out.push(l[i]); });
	return out;
}
