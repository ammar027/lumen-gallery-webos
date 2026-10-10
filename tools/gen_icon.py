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

body = re.search(r'<div class="i">.*</div>\s*$', ART, re.S).group(0)
style = re.search(r'<style>(.*?)</style>', ART, re.S).group(1)
FONT64 = base64.b64encode(open(FONT, 'rb').read()).decode()
splash = f'''<!doctype html><meta charset="utf-8"><style>@font-face{{font-family:G;font-weight:100 900;font-display:block;src:url(data:font/woff2;base64,{FONT64}) format("woff2")}}{style}
html,body{{width:1920px;height:1080px}}body{{background:radial-gradient(120% 100% at 50% 6%,#3a2e29 0%,#1c1512 55%,#0a0706 100%);position:relative}}
.w{{position:absolute;left:760px;top:250px;width:1024px;height:1024px;transform:scale(.390625);transform-origin:0 0;border-radius:230px;overflow:hidden;box-shadow:0 0 0 2px rgba(255,255,255,.1)}}
.t{{position:absolute;left:0;width:1920px;top:690px;text-align:center;color:#f4f2ee;font:600 84px G,sans-serif;letter-spacing:-.01em}}</style>
<div class="w">{body}</div><div class="t">{NAME}</div>'''
shot(splash, 1920, 1080, f'{OUT}/splash.png')
print('splash.png', os.path.getsize(f'{OUT}/splash.png') // 1024, 'KB')
