// Frame's settings, kept in localStorage (private to this app on the TV).

export type MatteLayout = 'fill' | 'none' | 'modern' | 'wide' | 'flexible' | 'shadowbox';
export type FrameStyle = 'none' | 'black' | 'ebony' | 'white' | 'walnut' | 'cherry' | 'oak' | 'gold' | 'antique' | 'silver' | 'copper';
export type FrameWidth = 'thin' | 'medium' | 'wide' | 'grand';
export type Liner = 'none' | 'gold' | 'silver' | 'black' | 'white';

export interface Settings {
	/** 'All', 'Favorites' or a collection name from config/art.ts */
	collection: string;
	intervalSec: number;
	shuffle: boolean;
	matte: MatteLayout;
	matteColor: number;
	frame: FrameStyle;
	frameWidth: FrameWidth;
	/** a thin inner line between the frame and the picture */
	liner: Liner;
	details: 'change' | 'always' | 'off';
	clock: boolean;
	tone: 'off' | 'night' | 'warm';
	/** show works that have people or faces in them (hidden by default) */
	people: 'hide' | 'show';
	/** Islamic art (calligraphy, tiles, carpets ...) inside the All collection */
	islamic: 'include' | 'exclude';
	/** how much the picture is made to look like real paint on canvas */
	look: 'off' | 'subtle' | 'strong';
	/** how the screen is made to look like lit paint or paper instead of a lit screen */
	display: 'screen' | 'print' | 'gallery';
	/** extra darkening, percent */
	dim: number;
	/** turn the screen off after this many hours (0 = never) */
	sleepHours: number;
	favorites: string[];
}

export const DEFAULTS: Settings = {
	collection: 'All', intervalSec: 60, shuffle: true, matte: 'fill', matteColor: 0, frame: 'walnut', frameWidth: 'medium', liner: 'none', people: 'hide', islamic: 'include', look: 'subtle', display: 'print',
	details: 'change', clock: false, tone: 'night', dim: 0, sleepHours: 0, favorites: []
};

/** The 16 matte colours (like the Frame's palette). */
export const MATTE_COLORS: {name: string; color: string}[] = [
	{name: 'Black', color: '#0c0c0e'}, {name: 'White', color: '#f4f2ee'}, {name: 'Ivory', color: '#e9e1cf'}, {name: 'Warm grey', color: '#b9b2a6'},
	{name: 'Grey', color: '#8b8d90'}, {name: 'Charcoal', color: '#33363b'}, {name: 'Navy', color: '#1d2c4a'}, {name: 'Slate blue', color: '#4b6485'},
	{name: 'Teal', color: '#2b6b6c'}, {name: 'Sage', color: '#8fa28a'}, {name: 'Olive', color: '#5e6338'}, {name: 'Sand', color: '#cdb58f'},
	{name: 'Terracotta', color: '#b7623f'}, {name: 'Burgundy', color: '#5c1f2e'}, {name: 'Mustard', color: '#c59a2c'}, {name: 'Blush', color: '#dcb3a8'}
];

const KEY = 'frame-settings-v1';

export function loadSettings (): Settings {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return {...DEFAULTS};
		const p = JSON.parse(raw) as Partial<Settings>;
		return {...DEFAULTS, ...p, favorites: Array.isArray(p.favorites) ? p.favorites : []};
	} catch {
		return {...DEFAULTS};
	}
}

export function saveSettings (s: Settings): void {
	try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* nothing sensible to do */ }
}

export interface Choice {value: string; label: string}
export interface OptionDef {
	id: keyof Settings;
	label: string;
	/** build the choices (the collection list depends on the art data) */
	choices: (s: Settings) => Choice[];
	/** how the current value is read back as a choice value */
	read: (s: Settings) => string;
	write: (s: Settings, value: string) => Settings;
}

const num = (id: 'intervalSec' | 'dim' | 'sleepHours' | 'matteColor') => (s: Settings, v: string): Settings => ({...s, [id]: Number(v)});

export function buildOptions (collections: string[]): OptionDef[] {
	return [
		{id: 'collection', label: 'Collection', choices: () => ['All', 'Favorites'].concat(collections).map((c) => ({value: c, label: c})), read: (s) => s.collection, write: (s, v) => ({...s, collection: v})},
		{id: 'intervalSec', label: 'Change every', choices: () => [[15, '15 seconds'], [30, '30 seconds'], [60, '1 minute'], [300, '5 minutes'], [900, '15 minutes'], [3600, '1 hour'], [21600, '6 hours'], [86400, '1 day']].map(([v, l]) => ({value: String(v), label: String(l)})), read: (s) => String(s.intervalSec), write: num('intervalSec')},
		{id: 'shuffle', label: 'Order', choices: () => [{value: 'true', label: 'Shuffle'}, {value: 'false', label: 'In order'}], read: (s) => String(s.shuffle), write: (s, v) => ({...s, shuffle: v === 'true'})},
		{id: 'matte', label: 'Matte', choices: () => [{value: 'fill', label: 'None, fill the screen'}, {value: 'none', label: 'None, whole picture'}, {value: 'modern', label: 'Modern'}, {value: 'wide', label: 'Modern wide'}, {value: 'flexible', label: 'Flexible'}, {value: 'shadowbox', label: 'Shadowbox'}], read: (s) => s.matte, write: (s, v) => ({...s, matte: v as MatteLayout})},
		{id: 'matteColor', label: 'Matte colour', choices: () => MATTE_COLORS.map((c, i) => ({value: String(i), label: c.name})), read: (s) => String(s.matteColor), write: num('matteColor')},
		{id: 'frame', label: 'Frame', choices: () => [['none', 'None'], ['black', 'Black'], ['ebony', 'Ebony'], ['white', 'White'], ['walnut', 'Walnut'], ['cherry', 'Cherry'], ['oak', 'Oak'], ['gold', 'Gold'], ['antique', 'Antique gold'], ['silver', 'Silver'], ['copper', 'Copper']].map(([v, l]) => ({value: v, label: l})), read: (s) => s.frame, write: (s, v) => ({...s, frame: v as FrameStyle})},
		{id: 'frameWidth', label: 'Frame width', choices: () => [['thin', 'Thin'], ['medium', 'Medium'], ['wide', 'Wide'], ['grand', 'Grand']].map(([v, l]) => ({value: v, label: l})), read: (s) => s.frameWidth, write: (s, v) => ({...s, frameWidth: v as FrameWidth})},
		{id: 'liner', label: 'Inner liner', choices: () => [['none', 'None'], ['gold', 'Gold'], ['silver', 'Silver'], ['black', 'Black'], ['white', 'White']].map(([v, l]) => ({value: v, label: l})), read: (s) => s.liner, write: (s, v) => ({...s, liner: v as Liner})},
		{id: 'people', label: 'People in art', choices: () => [{value: 'hide', label: 'Hide'}, {value: 'show', label: 'Show'}], read: (s) => s.people, write: (s, v) => ({...s, people: v as Settings['people']})},
		{id: 'islamic', label: 'Islamic art in All', choices: () => [{value: 'include', label: 'Include'}, {value: 'exclude', label: 'Leave out'}], read: (s) => s.islamic, write: (s, v) => ({...s, islamic: v as Settings['islamic']})},
		{id: 'look', label: 'Painting look', choices: () => [{value: 'off', label: 'Off'}, {value: 'subtle', label: 'Subtle'}, {value: 'strong', label: 'Strong'}], read: (s) => s.look, write: (s, v) => ({...s, look: v as Settings['look']})},
		{id: 'display', label: 'Display look', choices: () => [{value: 'screen', label: 'Screen (as it is)'}, {value: 'print', label: 'Print (matte paper)'}, {value: 'gallery', label: 'Gallery (dim, soft light)'}], read: (s) => s.display, write: (s, v) => ({...s, display: v as Settings['display']})},
		{id: 'details', label: 'Details', choices: () => [{value: 'change', label: 'When it changes'}, {value: 'always', label: 'Always'}, {value: 'off', label: 'Off'}], read: (s) => s.details, write: (s, v) => ({...s, details: v as Settings['details']})},
		{id: 'clock', label: 'Clock', choices: () => [{value: 'false', label: 'Off'}, {value: 'true', label: 'On'}], read: (s) => String(s.clock), write: (s, v) => ({...s, clock: v === 'true'})},
		{id: 'tone', label: 'Colour tone', choices: () => [{value: 'off', label: 'Off'}, {value: 'night', label: 'Warmer at night'}, {value: 'warm', label: 'Always warm'}], read: (s) => s.tone, write: (s, v) => ({...s, tone: v as Settings['tone']})},
		{id: 'dim', label: 'Brightness', choices: () => [[0, 'Full'], [15, 'Softer'], [30, 'Dim'], [50, 'Very dim']].map(([v, l]) => ({value: String(v), label: String(l)})), read: (s) => String(s.dim), write: num('dim')},
		{id: 'sleepHours', label: 'Screen off after', choices: () => [[0, 'Never'], [1, '1 hour'], [2, '2 hours'], [4, '4 hours'], [8, '8 hours']].map(([v, l]) => ({value: String(v), label: String(l)})), read: (s) => String(s.sleepHours), write: num('sleepHours')}
	];
}
