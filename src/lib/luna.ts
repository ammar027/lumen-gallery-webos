// Minimal Luna (LS2) bridge: webOS gives every web app a PalmServiceBridge; each call gets its own bridge object.

interface PalmServiceBridgeInstance {
	onservicecallback: ((message: string) => void) | null;
	call (uri: string, params: string): void;
	cancel? (): void;
}

declare global {
	interface Window {
		PalmServiceBridge?: new () => PalmServiceBridgeInstance;
	}
}

export interface LunaResponse {
	returnValue?: boolean;
	errorText?: string;
	stdoutString?: string;
	[key: string]: unknown;
}

export function isWebOS (): boolean {
	return typeof window.PalmServiceBridge === 'function';
}

export function lunaCall<T extends LunaResponse = LunaResponse> (uri: string, params: object = {}, timeoutMs = 5000): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const Bridge = window.PalmServiceBridge;
		if (!Bridge) { reject(new Error('Not running on webOS')); return; }
		const bridge = new Bridge();
		let settled = false;
		const finish = (fn: () => void) => {
			if (settled) return;
			settled = true;
			window.clearTimeout(timer);
			try { bridge.cancel && bridge.cancel(); } catch { /* ignore */ }
			fn();
		};
		const timer = window.setTimeout(() => finish(() => reject(new Error(`Timed out: ${uri}`))), timeoutMs);
		bridge.onservicecallback = (message) => {
			let data: T;
			try { data = JSON.parse(message) as T; } catch (e) { finish(() => reject(e as Error)); return; }
			if (data.returnValue === false) finish(() => reject(new Error(data.errorText || `${uri} failed`)));
			else finish(() => resolve(data));
		};
		try { bridge.call(uri, JSON.stringify(params)); } catch (e) { finish(() => reject(e as Error)); }
	});
}

const LAUNCHER_ID = 'works.partridge.webos-launcher';
const HOMEBREW_EXEC = 'luna://org.webosbrew.hbchannel.service/exec';

/** Back to the launcher (or close the app if the launcher is not there). */
export function exitToLauncher (): void {
	lunaCall('luna://com.webos.applicationManager/launch', {id: LAUNCHER_ID}).catch(() => { try { window.close(); } catch { /* nothing else to do */ } });
}

const SAVER_FLAG = '/var/lib/homehook/frame-screensaver';

/** Whether Frame is the TV's screensaver (the Home-button/screensaver watcher looks for this file; see the launcher project's tools/tv/watch.sh). */
export function readSaverFlag (): Promise<boolean> {
	return lunaCall(HOMEBREW_EXEC, {command: `[ -f ${SAVER_FLAG} ] && echo on || echo off`}, 6000).then((r) => (r.stdoutString || '').indexOf('on') === 0);
}

export function writeSaverFlag (on: boolean): Promise<void> {
	return lunaCall(HOMEBREW_EXEC, {command: on ? `touch ${SAVER_FLAG}` : `rm -f ${SAVER_FLAG}`}, 6000).then(() => undefined);
}

/** Screen off (needs the Homebrew Channel's root service); the TV keeps running. */
export function screenOff (): Promise<void> {
	return lunaCall(HOMEBREW_EXEC, {command: "luna-send -n 1 luna://com.webos.service.tvpower/power/turnOffScreen '{}'"}, 6000).then(() => undefined);
}
