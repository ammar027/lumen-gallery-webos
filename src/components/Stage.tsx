import {useEffect, useState} from 'preact/hooks';
import type {Artwork} from '../config/art';
import {css, grow, pictureBox} from '../lib/layout';
import {FrameBorder} from './FrameBorder';
import {MATTE_COLORS, type Settings} from '../lib/settings';

export interface Slide {
	key: number;
	art: Artwork;
	/** width / height of the picture as loaded */
	aspect: number;
	src: string;
}

const FRAME_WIDTH: Record<string, number> = {thin: 16, medium: 40, wide: 72, grand: 110};

interface Props {
	slides: Slide[];
	settings: Settings;
	/** show the details card now (set for a few seconds after a change, or while the settings are open) */
	showDetails: boolean;
	/** the current artwork is a favourite */
	isFavorite: boolean;
}

/** One moment of the show: the matte, the picture on it, the frame around, and the overlays (tone, dimming, details, clock). Slides cross-fade by opacity only. */
export function Stage ({slides, settings, showDetails, isFavorite}: Props) {
	const wall = settings.matte === 'flexible' ? '#15171b' : MATTE_COLORS[settings.matteColor].color;
	const night = (() => { const h = new Date().getHours(); return h >= 19 || h < 7; })();
	const warm = settings.tone === 'warm' || (settings.tone === 'night' && night);
	const top = slides[slides.length - 1];
	return (
		<div class="stage" style={`background:${wall}`}>
			{slides.map((s) => {
				const box = pictureBox(settings.matte, s.aspect);
				const matted = settings.matte !== 'fill' && settings.matte !== 'none';
				return (
					<div class="slide" key={s.key}>
						{settings.matte === 'flexible' && <div class="mat" style={`${css(grow(box, 96))};background:${MATTE_COLORS[settings.matteColor].color}`} />}
						{matted && <div class="paper" />}
						{matted && <div class={`core${settings.matte === 'shadowbox' ? ' core--deep' : ''}`} style={css(grow(box, settings.matte === 'shadowbox' ? 10 : 5))} />}
						<img class={`art${settings.matte === 'fill' ? ' art--fill' : ''}`} src={s.src} alt="" style={css(box)} />
						{settings.look !== 'off' && <div class={`look look--${settings.look}`} style={css(box)} />}
						{matted && <div class={`artshadow${settings.matte === 'shadowbox' ? ' artshadow--deep' : ''}`} style={css(box)} />}
					</div>
				);
			})}
			{settings.frame !== 'none' && <FrameBorder style={settings.frame} width={FRAME_WIDTH[settings.frameWidth]} liner={settings.liner} />}
			{warm && <div class="tone" />}
			{settings.dim > 0 && <div class="dim" style={`opacity:${settings.dim / 100}`} />}
			{top && <Details art={top.art} visible={settings.details === 'always' || (settings.details === 'change' && showDetails)} favorite={isFavorite} />}
			{settings.clock && <MiniClock />}
		</div>
	);
}

function Details ({art, visible, favorite}: {art: Artwork; visible: boolean; favorite: boolean}) {
	return (
		<div class={`details${visible ? ' details--on' : ''}`}>
			<div class="details__title">{art.t}{favorite ? ' ♥' : ''}</div>
			<div class="details__sub">{art.a}{art.d ? ` · ${art.d}` : ''}</div>
		</div>
	);
}

function MiniClock () {
	const [now, setNow] = useState(new Date());
	useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 20000); return () => window.clearInterval(id); }, []);
	return <div class="miniclock">{now.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}</div>;
}
