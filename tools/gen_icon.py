#!/usr/bin/env python3
"""App icon (80x80, 130x130) and launch screen (1920x1080) for Frame: a small gilt-framed landscape on a dark wall. Output goes to public/.
Run: python3 tools/gen_icon.py  (needs Google Chrome for the headless render)"""
import os, subprocess, tempfile
ROOT = os.path.expanduser('~/Developer/webos-frame')
OUT = f'{ROOT}/public'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
FONT = f'{ROOT}/src/assets/geist-wght.woff2'

def art(w, h, border, rad):
    return f'''<div class="f" style="width:{w}px;height:{h}px;border-width:{border}px;border-radius:{rad}px"><div class="p"><i class="sun"></i><i class="h1"></i><i class="h2"></i></div></div>'''

PAGE = '''<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:G;font-weight:100 900;src:url("file://%(font)s") format("woff2")}
*{box-sizing:border-box;margin:0}html,body{width:%(w)dpx;height:%(h)dpx;overflow:hidden;background:#000;font-family:G,sans-serif}
.bg{width:%(w)dpx;height:%(h)dpx;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(120%% 90%% at 50%% 10%%,#2a2d3a 0%%,#12141b 55%%,#07080b 100%%)}
.f{position:relative;border-style:solid;border-image:none;border-color:#c9a24a;background:#0b0b0d;box-shadow:0 12px 40px rgba(0,0,0,.6),inset 0 0 0 2px rgba(255,236,170,.55),0 0 0 2px rgba(120,86,20,.8)}
.p{position:absolute;inset:0;overflow:hidden;background:linear-gradient(#f4c07a,#e98f5a 45%%,#8f5a7a);border-radius:inherit}
.sun{position:absolute;left:62%%;top:22%%;width:24%%;aspect-ratio:1;border-radius:50%%;background:#fff3c8;display:block}
.h1{position:absolute;left:-10%%;bottom:-6%%;width:80%%;height:52%%;border-radius:50%% 50%% 0 0;background:#3f3558;display:block}
.h2{position:absolute;left:30%%;bottom:-10%%;width:90%%;height:40%%;border-radius:50%% 50%% 0 0;background:#271f3a;display:block}
.t{color:#f4f2ee;font-weight:300;letter-spacing:.06em;margin-top:56px;font-size:64px}
</style><div class="bg">%(body)s</div>'''

def render(name, w, h, body):
    with tempfile.NamedTemporaryFile('w', suffix='.html', delete=False) as f:
        f.write(PAGE % dict(font=FONT, w=w, h=h, body=body)); src = f.name
    dst = f'{OUT}/{name}'
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', f'--window-size={w},{h}', '--force-device-scale-factor=1',
                    '--virtual-time-budget=1500', f'--screenshot={dst}', f'file://{src}'], capture_output=True)
    os.unlink(src); print(name, os.path.getsize(dst) // 1024, 'KB')

render('icon.png', 80, 80, art(54, 42, 5, 2))
render('largeIcon.png', 130, 130, art(88, 68, 8, 3))
render('splash.png', 1920, 1080, art(380, 280, 22, 6) + '<div class="t">Lumen Gallery</div>')
