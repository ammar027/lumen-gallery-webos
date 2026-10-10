// Takes the README screenshots from the dev server (npm run dev, port 5200) with headless Chrome over the DevTools protocol.
// Usage: node tools/screenshots.mjs   (Node 22+, Google Chrome installed)
import {spawn} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {setTimeout as sleep} from 'node:timers/promises';

const BASE = process.env.BASE || 'http://localhost:5200/';
const OUT = new URL('../docs/screenshots/', import.meta.url).pathname;
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9334;
mkdirSync(OUT, {recursive: true});

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, '--window-size=1920,1080', '--force-device-scale-factor=1', '--user-data-dir=/tmp/gallery-shots-profile', 'about:blank'], {stdio: 'ignore'});
await sleep(2500);
const target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || {}); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({id: i, method, params})); });
const evalJs = async (expression) => (await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true})).result?.value;
await send('Emulation.setDeviceMetricsOverride', {width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false});

const KEYS = {left: 37, up: 38, right: 39, down: 40, enter: 13};
const press = async (name, wait = 300) => {
	const c = KEYS[name];
	await evalJs(`window.dispatchEvent(new KeyboardEvent('keydown',{keyCode:${c},which:${c},bubbles:true}))`);
	await sleep(wait);
};
const open = async (settings) => {
	await send('Page.navigate', {url: BASE});
	await sleep(1200);
	await evalJs(`localStorage.clear(); localStorage.setItem('frame-settings-v1', ${JSON.stringify(JSON.stringify(settings))});`);
	await send('Page.navigate', {url: BASE});
	await sleep(9000);
};
const title = () => evalJs(`document.querySelector('.details__title')?.innerText || ''`);   // the caption is always in the page (hidden when Details is Off)
/** step through pictures until the caption matches (so the screenshot shows a good one) */
const until = async (re, max = 14) => { for (let i = 0; i < max && !re.test(await title()); i++) await press('right', 7000); await sleep(1500); };
const shot = async (name) => {
	const r = await send('Page.captureScreenshot', {format: 'jpeg', quality: 90});
	writeFileSync(OUT + name + '.jpg', Buffer.from(r.data, 'base64'));
	console.log('saved', name, '-', await title());
};

const ONLY = process.argv[2];   // optional: only this scenario (landscape-walnut, shadowbox-matte, settings-panel)
const want = (n) => !ONLY || ONLY === n;
const base = {details: 'off', people: 'hide', shuffle: true, look: 'subtle', tone: 'off'};

if (want('landscape-walnut')) {
	await open({...base, collection: 'Landscapes', matte: 'fill', frame: 'walnut', frameWidth: 'medium', liner: 'none'});
	await until(/lake|river|valley|sunset|morning|evening|autumn|harbor|coast/i);
	await shot('landscape-walnut');
}

if (want('shadowbox-matte')) {
	await open({...base, collection: 'Asian Art', matte: 'shadowbox', matteColor: 9, frame: 'ebony', frameWidth: 'medium', liner: 'none'});
	await until(/flower|butterfl|blossom|bamboo|peon|lotus|chrysanth/i, 30);
	await shot('shadowbox-matte');
}

if (want('settings-panel')) {
	await open({...base, collection: 'Landscapes', matte: 'fill', frame: 'walnut', frameWidth: 'medium', liner: 'none'});
	await until(/lake|river|mountain|sunset|forest|valley|coast|sea|cloud|morning|evening/i);
	await until(/lake|river|mountain|sunset|forest|valley|coast|sea|cloud|morning|evening/i);
	await press('enter', 1200);
	await shot('settings-panel');
}

ws.close();
chrome.kill();
