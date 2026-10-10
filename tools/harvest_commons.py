#!/usr/bin/env python3
"""Islamic art and architecture pictures from Wikimedia Commons categories into tools/commons.json (public domain / CC0 / CC BY / CC BY-SA, at least 1920 px wide).
The category API returns picture sizes, licence and author in batches of 50, so no per-picture requests are needed.
Run: python3 tools/harvest_commons.py"""
import json, os, re, subprocess, sys, time, urllib.parse
UA = 'frame-art-tv/1.0 (personal screensaver; contact: owner)'
API = 'https://commons.wikimedia.org/w/api.php'
OUT = os.path.expanduser('~/Developer/webos-frame/tools/commons.json')
CATS = ['Islamic calligraphy', 'Arabic calligraphy', 'Quran manuscripts', 'Qur\'an manuscripts', 'Islamic geometric patterns', 'Muqarnas', 'Zellige', 'Mihrabs', 'Mosque interiors',
        'Mosque domes', 'Islamic tiles', 'Iznik tiles', 'Persian carpets', 'Ottoman calligraphy', 'Kufic script', 'Featured pictures of mosques', 'Mosque ceilings', 'Arabesques',
        'Islamic architectural ornament', 'Mosques by country', 'Alhambra', 'Sheikh Lotfollah Mosque', 'Shah Mosque (Isfahan)', 'Sultan Ahmed Mosque', 'Hagia Sophia', 'Sheikh Zayed Grand Mosque',
        'Taj Mahal', 'Great Mosque of Kairouan', 'Umayyad Mosque', 'Al-Masjid an-Nabawi', 'Masjid al-Haram', 'Dome of the Rock', 'Selimiye Mosque', 'Suleymaniye Mosque', 'Nasir al-Mulk Mosque']
OK_LICENSE = re.compile(r'public domain|pd|cc0|cc by|cc-by', re.I)

def api(params, tries=4):
    url = API + '?' + urllib.parse.urlencode(params)
    for i in range(tries):
        r = subprocess.run(['curl', '-s', '--max-time', '40', '-A', UA, url], capture_output=True, text=True)
        try: return json.loads(r.stdout)
        except Exception: time.sleep(1.5 * (i + 1))
    return None

def members(cat, kind, limit=500):
    out, cont = [], {}
    while len(out) < limit:
        d = api({'action': 'query', 'format': 'json', 'list': 'categorymembers', 'cmtitle': 'Category:' + cat, 'cmtype': kind, 'cmlimit': 500, **cont})
        if not d or 'query' not in d: break
        out += [m['title'] for m in d['query']['categorymembers']]
        if 'continue' not in d: break
        cont = d['continue']
    return out[:limit]

def strip(html): return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', html or '')).strip()

rows, seen = [], set()
def add_files(titles, label):
    for i in range(0, len(titles), 50):
        d = api({'action': 'query', 'format': 'json', 'titles': '|'.join(titles[i:i + 50]), 'prop': 'imageinfo', 'iiprop': 'url|size|mime|extmetadata', 'iiextmetadatafilter': 'LicenseShortName|Artist|ObjectName|ImageDescription'})
        for p in ((d or {}).get('query', {}).get('pages', {}) or {}).values():
            ii = (p.get('imageinfo') or [{}])[0]
            if not ii or ii.get('mime') not in ('image/jpeg', 'image/png'): continue
            w, h = ii.get('width', 0), ii.get('height', 0)
            if w < 1920 or h < 900 or p['pageid'] in seen: continue
            md = ii.get('extmetadata') or {}
            lic = (md.get('LicenseShortName') or {}).get('value', '')
            if not OK_LICENSE.search(lic): continue
            seen.add(p['pageid'])
            name = p['title'][5:]
            title = re.sub(r'\.(jpe?g|png)$', '', name, flags=re.I).replace('_', ' ')
            rows.append({'id': 'w' + str(p['pageid']), 't': title, 'a': strip((md.get('Artist') or {}).get('value', ''))[:60] or 'Wikimedia Commons', 'd': lic, 'u': name, 'w': w, 'h': h, 'cat': label})

for cat in CATS:
    files = members(cat, 'file', 300)
    subs = members(cat, 'subcat', 12)
    for s in subs[:8]: files += members(s[9:], 'file', 60)
    add_files(files, cat)
    print(f'{cat:36s} {len(files):4d} files -> {len(rows)} kept', file=sys.stderr)
json.dump(rows, open(OUT, 'w'), ensure_ascii=False)
print(len(rows), 'records ->', OUT)
