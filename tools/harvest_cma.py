#!/usr/bin/env python3
"""Fetches public-domain (CC0) works with images from the Cleveland Museum of Art Open Access API into tools/cma.json.
One request returns up to 1000 records with picture sizes and a curator's description (used to sort works into collections and to flag works with people).
Run: python3 tools/harvest_cma.py"""
import json, os, re, subprocess, sys, urllib.parse
UA = 'frame-art-tv (personal screensaver)'
API = 'https://openaccess-api.clevelandart.org/api/artworks/'
OUT = os.path.expanduser('~/Developer/webos-frame/tools/cma.json')
FIELDS = 'id,accession_number,title,creation_date,department,type,culture,description,images,creators'
QUERIES = [  # (label, parameters)
    ('Paintings', {'type': 'Painting'}),
    ('Islamic Art', {'department': 'Islamic Art'}),
    ('Japanese prints', {'type': 'Print', 'department': 'Japanese Art'}),
]

def fetch(params, skip):
    p = {'cc0': '', 'has_image': 1, 'limit': 1000, 'skip': skip, 'fields': FIELDS}
    p.update(params)
    url = API + '?' + urllib.parse.urlencode(p).replace('cc0=', 'cc0')
    for _ in range(5):
        r = subprocess.run(['curl', '-s', '--max-time', '120', '-A', UA, url], capture_output=True, text=True)
        try: return json.loads(r.stdout)
        except Exception: pass
    return None

rows = []
for label, params in QUERIES:
    skip = 0
    while True:
        d = fetch(params, skip)
        if not d or not d.get('data'): break
        for a in d['data']:
            im = (a.get('images') or {})
            pr, web = im.get('print') or {}, im.get('web') or {}
            if not pr.get('url') and not web.get('url'): continue
            src = pr if pr.get('url') else web
            creators = a.get('creators') or []
            artist = (creators[0].get('description') if creators else '') or ''
            artist = re.sub(r'\s*\(.*', '', artist).strip() or (', '.join(a.get('culture') or []) or 'Unknown')
            rows.append({'id': 'c' + str(a['id']), 't': a.get('title') or 'Untitled', 'a': artist, 'd': a.get('creation_date') or '',
                         'u': src['url'].split('openaccess-cdn.clevelandart.org/', 1)[1], 'w': int(src.get('width') or 0), 'h': int(src.get('height') or 0),
                         'dep': a.get('department') or '', 'ty': a.get('type') or '', 'cu': ', '.join(a.get('culture') or []), 'desc': a.get('description') or '', 'src': label})
        print(f'{label}: {len(rows)} so far (skip {skip}, total {d["info"]["total"]})', file=sys.stderr)
        skip += 1000
        if skip >= d['info']['total']: break
json.dump(rows, open(OUT, 'w'), ensure_ascii=False)
print(len(rows), 'records ->', OUT)
