import {useCallback, useEffect, useMemo, useRef, useState} from 'preact/hooks';
import {COLLECTIONS, type Artwork} from './config/art';
import {Panel, buildRows} from './components/Panel';
import {EdgeArrows, QuickBar, type BarAction} from './components/QuickBar';
import {Stage, type Slide} from './components/Stage';
import {exitToLauncher, isWebOS, readSaverFlag, screenOff, writeSaverFlag} from './lib/luna';
import {imageUrl, pool, shuffled, shuffledByCollection} from './lib/playlist';
import {buildOptions, loadSettings, saveSettings, type Settings} from './lib/settings';

const OPTIONS = buildOptions(COLLECTIONS);
const FADE_MS = 1400;
const KEY = {left: 37, up: 38, right: 39, down: 40, enter: 13, back: 8, webosBack: 461, escape: 27};

export function App () {
	const [settings, setSettings] = useState<Settings>(loadSettings);
	const [slides, setSlides] = useState<Slide[]>([]);
	const [panel, setPanel] = useState(false);
	const [row, setRow] = useState(0);
	const [details, setDetails] = useState(false);
	const [toast, setToast] = useState('');
	const [bar, setBar] = useState(false);
	const [barIndex, setBarIndex] = useState(1);
	const [edges, setEdges] = useState(false);
	const edgeTimer = useRef(0);
	const barRef = useRef({bar, barIndex});
	barRef.current = {bar, barIndex};
	const [saverOn, setSaverOn] = useState<boolean | null>(null);   // whether Frame is the TV's screensaver (null: unknown, e.g. off the TV)
	useEffect(() => { if (isWebOS()) readSaverFlag().then(setSaverOn).catch(() => undefined); }, []);
	const order = useRef<Artwork[]>([]);
	const pos = useRef(-1);
	const slideKey = useRef(0);
	const timer = useRef(0);
	const detailsTimer = useRef(0);
	const toastTimer = useRef(0);
	const settingsRef = useRef(settings);
	settingsRef.current = settings;
	const panelRef = useRef({panel, row});
	panelRef.current = {panel, row};

	const update = useCallback((next: Settings) => { settingsRef.current = next; setSettings(next); saveSettings(next); }, []);
	const say = useCallback((text: string) => {
		window.clearTimeout(toastTimer.current);
		setToast(text);
		toastTimer.current = window.setTimeout(() => setToast(''), 2200);
	}, []);

	const current = slides.length ? slides[slides.length - 1].art : undefined;
	const isFavorite = !!current && settings.favorites.indexOf(current.id) !== -1;

	// ---- the show
	const showArt = useCallback((art: Artwork) => {
		const src = imageUrl(art);
		const img = new Image();
		img.onload = () => {
			const key = ++slideKey.current;
			const slide: Slide = {key, art, aspect: img.naturalWidth / Math.max(1, img.naturalHeight), src};
			setSlides((old) => old.slice(-1).concat(slide));
			window.setTimeout(() => setSlides((old) => (old.length > 1 && old[old.length - 1].key === key ? old.slice(-1) : old)), FADE_MS + 100);
			setDetails(true);
			window.clearTimeout(detailsTimer.current);
			detailsTimer.current = window.setTimeout(() => setDetails(false), 7000);
		};
		img.onerror = () => { window.setTimeout(() => step(1), 300); };   // skip a picture that does not load
		img.src = src;
	}, []);

	const step = useCallback((dir: number) => {
		const list = order.current;
		if (!list.length) return;
		pos.current = (pos.current + dir + list.length) % list.length;
		showArt(list[pos.current]);
	}, [showArt]);

	const restartTimer = useCallback(() => {
		window.clearInterval(timer.current);
		timer.current = window.setInterval(() => { if (!panelRef.current.panel) step(1); }, settingsRef.current.intervalSec * 1000);
	}, [step]);

	/** (re)build the playlist when the collection, the order or the favourites change */
	const collectionKey = `${settings.collection}|${settings.shuffle}|${settings.people}|${settings.animals}|${settings.hidden.length}|${settings.islamic}|${settings.matte === 'fill'}|${settings.collection === 'Favorites' ? settings.favorites.join(',') : ''}`;
	useEffect(() => {
		const list = pool(settingsRef.current);
		order.current = settingsRef.current.shuffle ? (settingsRef.current.collection === 'All' ? shuffledByCollection(list) : shuffled(list)) : list.slice();
		pos.current = -1;
		if (!list.length) { say('No artworks in this collection yet'); return; }
		step(1);
	}, [collectionKey]);
	useEffect(() => { restartTimer(); return () => window.clearInterval(timer.current); }, [settings.intervalSec, restartTimer]);

	// ---- memory: web apps on webOS leak slowly and this TV has little spare memory, so Frame restarts itself every 3 hours (never while the settings are open)
	useEffect(() => {
		const id = window.setInterval(() => { if (!panelRef.current.panel) location.reload(); }, 3 * 3600 * 1000);
		return () => window.clearInterval(id);
	}, []);

	// ---- sleep: turn the screen off after the chosen hours
	useEffect(() => {
		if (!settings.sleepHours) return;
		const id = window.setTimeout(() => { if (isWebOS()) screenOff().catch(() => undefined); exitToLauncher(); }, settings.sleepHours * 3600000);
		return () => window.clearTimeout(id);
	}, [settings.sleepHours]);

	// ---- settings panel
	const rows = useMemo(() => buildRows(settings, OPTIONS, isFavorite, pool(settings).length, saverOn), [settings, isFavorite, saverOn]);

	const toggleFavorite = useCallback(() => {
		const s = settingsRef.current;
		if (!current) return;
		const has = s.favorites.indexOf(current.id) !== -1;
		update({...s, favorites: has ? s.favorites.filter((f) => f !== current.id) : s.favorites.concat(current.id)});
		say(has ? 'Removed from favourites' : 'Added to favourites');
	}, [current, update, say]);

	/** never show this picture again (it can be restored in the settings), and move on */
	const hideCurrent = useCallback(() => {
		const s = settingsRef.current;
		if (!current || s.hidden.indexOf(current.id) !== -1) return;
		update({...s, hidden: s.hidden.concat(current.id), favorites: s.favorites.filter((f) => f !== current.id)});
		say('Hidden. It will not be shown again');
	}, [current, update, say]);

	const barAction = useCallback((a: BarAction) => {
		if (a === 'prev') { step(-1); restartTimer(); }
		else if (a === 'next') { step(1); restartTimer(); }
		else if (a === 'like') toggleFavorite();
		else hideCurrent();
	}, [step, restartTimer, toggleFavorite, hideCurrent]);

	/** the edge arrows follow the pointer: shown while it moves, gone a few seconds after it stops */
	const wakeEdges = useCallback(() => {
		setEdges(true);
		window.clearTimeout(edgeTimer.current);
		edgeTimer.current = window.setTimeout(() => setEdges(false), 4000);
	}, []);

	const change = useCallback((i: number, dir: number) => {
		const def = OPTIONS[i];
		if (!def) return;
		const s = settingsRef.current;
		const choices = def.choices(s);
		const at = Math.max(0, choices.map((c) => c.value).indexOf(def.read(s)));
		const next = choices[(at + dir + choices.length) % choices.length];
		update(def.write(s, next.value));
	}, [update]);

	const press = useCallback((i: number) => {
		const key = rows[i] && rows[i].key;
		if (!key) return;
		if (key === 'favorite') toggleFavorite();
		else if (key === 'unhide') update({...settingsRef.current, hidden: []});
		else if (key === 'close') setPanel(false);
		else if (key === 'saver') { const next = !saverOn; setSaverOn(next); writeSaverFlag(next).catch(() => { setSaverOn(!next); say("Couldn't change the screensaver (it needs the Homebrew Channel)"); }); }
		else if (key === 'exit') exitToLauncher();
		else if (i < OPTIONS.length) change(i, 1);
	}, [rows, toggleFavorite, change, saverOn, say, update]);

	// ---- remote keys and pointer
	const keys = useRef<(e: KeyboardEvent) => void>(() => undefined);
	keys.current = (e: KeyboardEvent) => {
		const k = e.keyCode;
		const {panel: open, row: r} = panelRef.current;
		if (open) {
			e.preventDefault();
			if (k === KEY.up) setRow((x) => Math.max(0, x - 1));
			else if (k === KEY.down) setRow((x) => Math.min(rows.length - 1, x + 1));
			else if (k === KEY.left) { if (r < OPTIONS.length) change(r, -1); }
			else if (k === KEY.right) { if (r < OPTIONS.length) change(r, 1); }
			else if (k === KEY.enter) press(r);
			else if (k === KEY.back || k === KEY.webosBack || k === KEY.escape) setPanel(false);
			return;
		}
		if (barRef.current.bar) {
			e.preventDefault();
			const i = barRef.current.barIndex;
			if (k === KEY.left) setBarIndex(Math.max(0, i - 1));
			else if (k === KEY.right) setBarIndex(Math.min(3, i + 1));
			else if (k === KEY.enter) barAction((['prev', 'like', 'hide', 'next'] as BarAction[])[i]);
			else setBar(false);   // Back, Up or Down closes it
			return;
		}
		if (k === KEY.left) { e.preventDefault(); step(-1); restartTimer(); }
		else if (k === KEY.right) { e.preventDefault(); step(1); restartTimer(); }
		else if (k === KEY.up) { e.preventDefault(); toggleFavorite(); }
		else if (k === KEY.down) { e.preventDefault(); setBarIndex(1); setBar(true); }
		else if (k === KEY.enter) { e.preventDefault(); setRow(0); setPanel(true); }
		else if (k === KEY.back || k === KEY.webosBack || k === KEY.escape) { e.preventDefault(); exitToLauncher(); }
	};
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => keys.current(e);
		let last = 0;
		const onWheel = (e: WheelEvent) => {
			const now = Date.now();
			if (now - last < 400 || panelRef.current.panel) return;
			last = now;
			step(e.deltaY > 0 ? 1 : -1); restartTimer();
		};
		let moved = 0;
		const onMove = () => { const now = Date.now(); if (now - moved > 250) { moved = now; wakeEdges(); } };
		window.addEventListener('keydown', onKey);
		window.addEventListener('wheel', onWheel, {passive: true});
		window.addEventListener('mousemove', onMove);
		return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('wheel', onWheel); window.removeEventListener('mousemove', onMove); };
	}, [step, restartTimer, barAction, wakeEdges]);

	return (
		<div class="app" onClick={(e) => { if (!panel && (e.target as HTMLElement).closest('.panel') === null) { setRow(0); setPanel(true); } }}>
			<Stage slides={slides} settings={settings} showDetails={details || panel || bar} isFavorite={isFavorite} />
			{panel && <Panel rows={rows} index={row} onHover={setRow} onPress={(i) => { setRow(i); press(i); }} />}
			<EdgeArrows visible={edges && !panel && !bar} onPrev={() => { step(-1); restartTimer(); }} onNext={() => { step(1); restartTimer(); }} />
			<QuickBar open={bar && !panel} index={barIndex} liked={isFavorite} onHover={setBarIndex} onPress={barAction} />
			{toast && <div class="toast">{toast}</div>}
		</div>
	);
}
