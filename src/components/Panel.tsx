import {useEffect, useRef} from 'preact/hooks';
import {MATTE_COLORS, type Choice, type OptionDef, type Settings} from '../lib/settings';

export interface PanelRow {
	key: string;
	label: string;
	value: string;
	swatch?: string;
}

export function buildRows (settings: Settings, options: OptionDef[], favorite: boolean, count: number, saverOn: boolean | null): PanelRow[] {
	const rows: PanelRow[] = options.map((o) => {
		const choices: Choice[] = o.choices(settings);
		const current = choices.filter((c) => c.value === o.read(settings))[0];
		return {key: String(o.id), label: o.label, value: current ? current.label : o.read(settings), swatch: o.id === 'matteColor' ? MATTE_COLORS[settings.matteColor].color : undefined};
	});
	if (settings.hidden.length) rows.push({key: 'unhide', label: 'Show hidden pictures again', value: `${settings.hidden.length} hidden`});
	rows.push({key: 'favorite', label: favorite ? 'Remove from favourites' : 'Add to favourites', value: `${settings.favorites.length} saved`});
	if (saverOn !== null) rows.push({key: 'saver', label: 'Use as the TV screensaver', value: saverOn ? 'On' : 'Off'});
	rows.push({key: 'info', label: 'Collection size', value: `${count} works`});
	rows.push({key: 'close', label: 'Back to the art', value: ''});
	rows.push({key: 'exit', label: 'Leave Lumen Gallery', value: ''});
	return rows;
}

/** The settings panel, shown over the art: a dark list on the right that scrolls to keep the chosen row in view. Up/Down choose a row, Left/Right change it, OK steps forward. */
export function Panel ({rows, index, onHover, onPress}: {rows: PanelRow[]; index: number; onHover: (i: number) => void; onPress: (i: number) => void}) {
	const view = useRef<HTMLDivElement>(null);
	const track = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const v = view.current;
		const t = track.current;
		const el = t && (t.children[index] as HTMLElement | undefined);
		if (!v || !t || !el) return;
		const offset = Math.max(0, Math.min(el.offsetTop - (v.clientHeight - el.offsetHeight) / 2, t.scrollHeight - v.clientHeight));
		t.style.transform = `translateY(${-offset}px)`;
	}, [index, rows.length]);
	return (
		<div class="panel">
			<div class="panel__title">Lumen Gallery</div>
			<div class="panel__view" ref={view}>
				<div class="panel__track" ref={track}>
					{rows.map((r, i) => (
						<div key={r.key} class={`row${i === index ? ' row--focused' : ''}${r.key === 'info' ? ' row--info' : ''}`} onMouseEnter={() => onHover(i)} onClick={() => onPress(i)}>
							<span class="row__label">{r.label}</span>
							{r.swatch && <span class="row__swatch" style={`background:${r.swatch}`} />}
							<span class="row__value">{r.value}</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
