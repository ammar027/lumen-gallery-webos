import {render} from 'preact';
import {App} from './app';
import './theme/global.css';

render(<App />, document.getElementById('root')!);

// Dev preview only (import.meta.env.DEV is false in the real build): scale the fixed 1920x1080 "TV screen" to the window, with black bars.
if (import.meta.env.DEV) {
	const style = document.createElement('style');
	style.textContent = 'html{background:#000;overflow:hidden}';
	document.head.appendChild(style);
	const fit = () => {
		const z = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
		const root = document.documentElement;
		root.style.zoom = String(z);
		document.body.style.marginLeft = Math.max(0, (window.innerWidth / z - 1920) / 2) + 'px';
		document.body.style.marginTop = Math.max(0, (window.innerHeight / z - 1080) / 2) + 'px';
	};
	fit();
	window.addEventListener('resize', fit);
}
