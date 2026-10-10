import type {ComponentChildren} from 'preact';

export type BarAction = 'prev' | 'like' | 'hide' | 'next';

interface Props {
	open: boolean;
	index: number;
	liked: boolean;
	onHover: (i: number) => void;
	onPress: (a: BarAction) => void;
}

const heart = (on: boolean) => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.5c0 5.6-7.5 10.2-7.5 10.2z" style={on ? 'fill:#fff' : undefined} /></svg>;
const eyeOff = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.5-6.5 9-6.5S21 12 21 12s-3.5 6.5-9 6.5S3 12 3 12zM9.5 12a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0-5 0zM4 4l16 16" /></svg>;
const chevron = (left: boolean) => <svg viewBox="0 0 24 24" aria-hidden="true"><path d={left ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} /></svg>;

/** Quick actions for the picture on screen: Previous, Like / Unlike, Hide (never show it again), Next. Opened with the Down key; Left/Right move, OK presses. */
export function QuickBar ({open, index, liked, onHover, onPress}: Props) {
	if (!open) return null;
	const items: {a: BarAction; label: string; icon: ComponentChildren}[] = [
		{a: 'prev', label: 'Previous', icon: chevron(true)},
		{a: 'like', label: liked ? 'Unlike' : 'Like', icon: heart(liked)},
		{a: 'hide', label: 'Hide', icon: eyeOff},
		{a: 'next', label: 'Next', icon: chevron(false)}
	];
	return (
		<div class="qbar" onClick={(e) => e.stopPropagation()}>
			{items.map((it, i) => (
				<div key={it.a} class={`qbar__item${i === index ? ' qbar__item--focused' : ''}`} onMouseEnter={() => onHover(i)} onClick={() => onPress(it.a)}>
					<div class="qbar__circle">{it.icon}</div>
					<div class="qbar__label">{it.label}</div>
				</div>
			))}
		</div>
	);
}

/** Arrows at the left and right edges (for the Magic Remote pointer): previous and next picture. Shown while the pointer moves. */
export function EdgeArrows ({visible, onPrev, onNext}: {visible: boolean; onPrev: () => void; onNext: () => void}) {
	return (
		<>
			<div class={`edge edge--left${visible ? ' edge--on' : ''}`} onClick={(e) => { e.stopPropagation(); onPrev(); }}>{chevron(true)}</div>
			<div class={`edge edge--right${visible ? ' edge--on' : ''}`} onClick={(e) => { e.stopPropagation(); onNext(); }}>{chevron(false)}</div>
		</>
	);
}
