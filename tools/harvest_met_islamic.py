#!/usr/bin/env python3
"""Islamic art from The Metropolitan Museum of Art's Open Access collection (department 14, public domain, with images) into tools/met_islamic.json.
Run: python3 tools/harvest_met_islamic.py"""
import json, os, struct, subprocess, sys, time, urllib.parse, concurrent.futures as cf
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) frame-art-tv'
API = 'https://collectionapi.metmuseum.org/public/collection'
OUT = os.path.expanduser('~/Developer/webos-frame/tools/met_islamic.json')
TERMS = ['Quran', 'Qur\'an', 'calligraphy', 'Kufic', 'folio', 'tile', 'panel', 'mihrab', 'carpet', 'rug', 'textile', 'lamp', 'mosque', 'bowl', 'dish', 'ewer', 'vase', 'tray',
         'astrolabe', 'candlestick', 'glass', 'Iran', 'Iznik', 'Ottoman', 'Safavid', 'Mamluk', 'Timurid', 'Mughal', 'Seljuq', 'Syria', 'Egypt', 'Turkey', 'Spain', 'Morocco',
         'Uzbekistan', 'Afghanistan', 'Iraq', 'geometric', 'arabesque', 'inscription', 'ceiling', 'door', 'jug', 'cup', 'box', 'casket', 'brass', 'inlaid', 'lusterware', 'minai']

def get(url, tries=5):
    for i in range(tries):
        r = subprocess.run(['curl', '-s', '--max-time', '25', '-A', UA, url], capture_output=True, text=True)
        try: return json.loads(r.stdout)
        except Exception: time.sleep(1.0 * (i + 1))
    return None

def dims(buf):
    if buf[:8] == b'\x89PNG\r\n\x1a\n': return struct.unpack('>II', buf[16:24])
    if buf[:2] == b'\xff\xd8':
        i = 2
        while i + 9 < len(buf):
            if buf[i] != 0xFF: i += 1; continue
            m = buf[i + 1]
            if m in (0xD8, 0x01) or 0xD0 <= m <= 0xD7: i += 2; continue
            n = struct.unpack('>H', buf[i + 2:i + 4])[0]
            if 0xC0 <= m <= 0xCF and m not in (0xC4, 0xC8, 0xCC):
                h, w = struct.unpack('>HH', buf[i + 5:i + 9]); return w, h
            i += 2 + n
    return None

ids = set()
for t in TERMS:
    d = get(f'{API}/v1.1/search?' + urllib.parse.urlencode({'hasImages': 'true', 'isPublicDomain': 'true', 'departmentId': 14, 'q': t, 'limit': 1000, 'offset': 0}))
    got = (d or {}).get('objectIDs') or []
    ids.update(got)
    print(f'{t:14s} +{len(got):4d} -> {len(ids)}', file=sys.stderr)

def detail(oid):
    d = get(f'{API}/v1/objects/{oid}')
    if not d or not d.get('isPublicDomain') or 'images.metmuseum.org/' not in (d.get('primaryImage') or ''): return None
    # picture shape from the object's measurements (Height x Width, cm): no extra image request needed
    w = h = 0
    for m in (d.get('measurements') or []):
        em = m.get('elementMeasurements') or {}
        if em.get('Height') and (em.get('Width') or em.get('Length')):
            h = int(float(em['Height']) * 100); w = int(float(em.get('Width') or em.get('Length')) * 100); break
    who = d.get('artistDisplayName') or ', '.join(x for x in (d.get('culture'), d.get('dynasty')) if x) or 'Islamic art'
    return {'id': 'm' + str(d['objectID']), 't': d.get('title') or d.get('objectName') or 'Untitled', 'a': who, 'd': d.get('objectDate') or '',
            'u': d['primaryImage'].split('images.metmuseum.org/', 1)[1], 'w': w, 'h': h,
            'cl': d.get('classification') or '', 'on': d.get('objectName') or '', 'md': d.get('medium') or '', 'cu': d.get('culture') or '', 'tags': [t.get('term', '') for t in (d.get('tags') or [])]}

rows, n = [], 0
with cf.ThreadPoolExecutor(12) as ex:
    for r in ex.map(detail, sorted(ids)):
        n += 1
        if r: rows.append(r)
        if n % 250 == 0:
            print(f'{n}/{len(ids)} fetched, {len(rows)} usable', file=sys.stderr)
            json.dump(rows, open(OUT, 'w'), ensure_ascii=False)   # partial results survive an interruption
json.dump(rows, open(OUT, 'w'), ensure_ascii=False)
print(len(rows), 'records ->', OUT)
