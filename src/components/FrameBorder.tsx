import type {FrameStyle, Liner} from '../lib/settings';

interface Finish {
	/** photographic texture (public/textures/<tex>-h.jpg and -v.jpg: free CC0 textures from ambientCG) */
	tex: string;
	/** colour laid over the texture to make this finish */
	tint: string;
	/** metal finishes get a bright specular line on the bevel */
	metal?: boolean;
}

const FINISH: Record<string, Finish> = {
	black: {tex: 'dark', tint: 'rgba(8,8,10,0.74)'},
	ebony: {tex: 'dark', tint: 'rgba(0,0,0,0.88)'},
	white: {tex: 'pale', tint: 'rgba(250,248,242,0.55)'},
	walnut: {tex: 'walnut', tint: 'rgba(0,0,0,0)'},
	cherry: {tex: 'cherry', tint: 'rgba(0,0,0,0)'},
	oak: {tex: 'oak', tint: 'rgba(0,0,0,0)'},
	gold: {tex: 'gold', tint: 'rgba(255,196,60,0.18)', metal: true},
	antique: {tex: 'gold', tint: 'rgba(78,50,4,0.42)', metal: true},
	silver: {tex: 'pale', tint: 'rgba(140,146,158,0.72)', metal: true},
	copper: {tex: 'copper', tint: 'rgba(210,110,60,0.18)', metal: true}
};

const LINER_COLOR: Record<string, string> = {gold: '#d4b04a', silver: '#c9ccd2', black: '#0a0a0a', white: '#f2f0ea'};
const W = 1920;
const H = 1080;

/** The cross-section of the moulding, outer edge to sight edge, as shading over the texture. A cassetta-style profile: a thin dark outer edge, a scoop that
 *  curves from light to dark, a bright fillet, the flat face, a step, an inner slope, a bright sight-edge fillet and a dark lip. */
function profile (f: Finish, dir: string): string {
	const spec = f.metal ? ', rgba(255,255,255,0.45) 14%, rgba(255,255,255,0.03) 16.5%' : '';
	return `linear-gradient(${dir}, rgba(0,0,0,0.70) 0%, rgba(255,255,255,0.28) 4%, rgba(255,255,255,0.14) 7%${spec}, rgba(0,0,0,0.06) 12%, rgba(0,0,0,0.30) 22%, rgba(255,255,255,0.30) 25%, rgba(255,255,255,0.05) 29%, rgba(0,0,0,0) 36%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.32) 63%, rgba(0,0,0,0.10) 68%, rgba(255,255,255,0.12) 80%, rgba(255,255,255,0.34) 86%, rgba(0,0,0,0.30) 89%, rgba(0,0,0,0.88) 100%)`;
}

const light = (c: string) => `linear-gradient(${c}, ${c})`;

/** A mitred picture frame: four moulding pieces cut at 45 degrees, each lit from the top left, with an optional liner and a soft shadow on the picture. */
export function FrameBorder ({style, width, liner}: {style: FrameStyle; width: number; liner: Liner}) {
	const f = FINISH[style];
	if (!f) return null;
	const w = width;
	const side = (rect: string, clip: string, dir: string, vertical: boolean, tint: string, offset: string) => (
		<div class="fpiece" style={`${rect};clip-path:polygon(${clip});background-color:#222;background-image:${light(tint)}, ${profile(f, dir)}, ${light(f.tint)}, url(textures/${f.tex}-${vertical ? 'v' : 'h'}.jpg);background-size:auto, auto, auto, ${vertical ? '192px 1024px' : '1024px 192px'};background-repeat:no-repeat, no-repeat, no-repeat, ${vertical ? 'repeat-y' : 'repeat-x'};background-position:0 0, 0 0, 0 0, ${offset}`} />
	);
	const lw = liner === 'none' ? 0 : Math.max(5, Math.round(w / 6));
	const inner = [
		lw ? `inset 0 0 0 ${lw}px ${LINER_COLOR[liner]}` : '',
		`inset 0 0 0 ${lw + 2}px rgba(0,0,0,0.55)`,
		'inset 7px 9px 20px rgba(0,0,0,0.55)',
		'inset -3px -4px 10px rgba(0,0,0,0.22)'
	].filter(Boolean).join(', ');
	return (
		<div class="fborder">
			{side(`left:0;top:0;width:${W}px;height:${w}px`, `0 0, ${W}px 0, ${W - w}px ${w}px, ${w}px ${w}px`, 'to bottom', false, 'rgba(255,255,255,0.10)', '0 0')}
			{side(`left:0;top:${H - w}px;width:${W}px;height:${w}px`, `${w}px 0, ${W - w}px 0, ${W}px ${w}px, 0 ${w}px`, 'to top', false, 'rgba(0,0,0,0.30)', '-377px 0')}
			{side(`left:0;top:0;width:${w}px;height:${H}px`, `0 0, ${w}px ${w}px, ${w}px ${H - w}px, 0 ${H}px`, 'to right', true, 'rgba(255,255,255,0.04)', '0 -211px')}
			{side(`left:${W - w}px;top:0;width:${w}px;height:${H}px`, `0 ${w}px, ${w}px 0, ${w}px ${H}px, 0 ${H - w}px`, 'to left', true, 'rgba(0,0,0,0.20)', '0 -619px')}
			<div class="fopening" style={`left:${w}px;top:${w}px;width:${W - 2 * w}px;height:${H - 2 * w}px;box-shadow:${inner}`} />
		</div>
	);
}
