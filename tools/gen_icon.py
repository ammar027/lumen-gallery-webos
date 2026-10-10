#!/usr/bin/env python3
"""App icon (80x80, 130x130) and launch screen (1920x1080) for Lumen Gallery. The artwork is tools/icon-gallery.html (a mitred walnut frame with a gold liner,
a landscape and a brass picture light on a dark wall), rendered once at 1024 px by headless Chrome and scaled down so the small sizes stay crisp. Output: public/.
Run: python3 tools/gen_icon.py  (needs Google Chrome and macOS `sips`)"""
import base64, os, re, subprocess, tempfile
ROOT = os.path.expanduser('~/Developer/webos-frame')
OUT = f'{ROOT}/public'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
FONT = f'{ROOT}/src/assets/geist-wght.woff2'
NAME = os.environ.get('APP_NAME', 'Lumen Gallery')
ART = open(f'{ROOT}/tools/icon-gallery.html').read()

def shot(html, w, h, dst):
    with tempfile.NamedTemporaryFile('w', suffix='.html', delete=False) as f:
        f.write(html); src = f.name
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', f'--window-size={w},{h}', '--force-device-scale-factor=1',
                    '--virtual-time-budget=1500', f'--screenshot={dst}', f'file://{src}'], capture_output=True)
    os.unlink(src)

master = '/tmp/gallery-icon-1024.png'
shot(ART, 1024, 1024, master)
for size, name in ((130, 'largeIcon.png'), (80, 'icon.png')):
    subprocess.run(['sips', '-z', str(size), str(size), master, '--out', f'{OUT}/{name}'], capture_output=True)
    print(name, os.path.getsize(f'{OUT}/{name}') // 1024, 'KB')

# No launch screen: Lumen Gallery is a screensaver and should come up at once, so appinfo.json has no bgImage/splashBackground (only the black bgColor).
