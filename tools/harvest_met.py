#!/usr/bin/env python3
"""Builds src/config/art.ts: public-domain artworks from The Metropolitan Museum of Art's Open Access API (CC0).
Each entry: id, title, artist, date, image path on images.metmuseum.org, collection, width/height of the picture, and p = 1 when the work shows people
or faces (from the Met's own subject tags plus title words), so the app can hide those. Object details are cached in tools/met_cache.json.
Run: python3 tools/harvest_met.py"""
import json, os, re, struct, subprocess, sys, time, urllib.parse, concurrent.futures as cf
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) frame-art-tv'
API = 'https://collectionapi.metmuseum.org/public/collection'
ROOT = os.path.expanduser('~/Developer/webos-frame')
OUT = f'{ROOT}/src/config/art.ts'
CACHE = f'{ROOT}/tools/met_cache.json'
# (query, collection, departmentId or None, how many to keep)
QUERIES = [
 ('landscape', 'Landscapes', 11, 70), ('river', 'Landscapes', 11, 30), ('mountains', 'Landscapes', 11, 30), ('forest', 'Landscapes', 11, 25), ('sunset', 'Landscapes', 11, 20),
 ('sea', 'Seascapes', 11, 40), ('harbor', 'Seascapes', 11, 25), ('coast', 'Seascapes', 11, 25),
 ('portrait', 'Portraits', 11, 40), ('woman', 'Portraits', 11, 25),
 ('still life', 'Still Life', 11, 45), ('flowers', 'Flowers', 11, 45), ('fruit', 'Still Life', 11, 20), ('garden', 'Flowers', 11, 20),
 ('Claude Monet', 'Impressionism', 11, 30), ('Camille Pissarro', 'Impressionism', 11, 20), ('Alfred Sisley', 'Impressionism', 11, 15), ('Edgar Degas', 'Impressionism', 11, 12),
 ('Vincent van Gogh', 'Post-Impressionism', 11, 25), ('Paul Cezanne', 'Post-Impressionism', 11, 20), ('Paul Gauguin', 'Post-Impressionism', 11, 10),
 ('Johannes Vermeer', 'Dutch Golden Age', 11, 6), ('Rembrandt', 'Dutch Golden Age', 11, 20), ('Jacob van Ruisdael', 'Dutch Golden Age', 11, 15),
 ('J. M. W. Turner', 'Romantic', 11, 12), ('John Constable', 'Romantic', 11, 12), ('Eugene Delacroix', 'Romantic', 11, 12), ('Caspar David Friedrich', 'Romantic', 11, 6),
 ('Katsushika Hokusai', 'Japanese Prints', None, 20), ('Utagawa Hiroshige', 'Japanese Prints', None, 30),
 ('Winslow Homer', 'American', None, 20), ('John Singer Sargent', 'American', None, 15), ('Frederic Edwin Church', 'American', None, 10), ('Albert Bierstadt', 'American', None, 10), ('Thomas Cole', 'American', None, 10),
 # Islamic art (department 14): calligraphy, tiles, carpets, metalwork, manuscripts, glass
 ('calligraphy', 'Islamic Art', 14, 40), ('Quran', 'Islamic Art', 14, 40), ('tile', 'Islamic Art', 14, 40), ('carpet', 'Islamic Art', 14, 30),
 ('mosque lamp', 'Islamic Art', 14, 15), ('geometric', 'Islamic Art', 14, 25), ('bowl', 'Islamic Art', 14, 25), ('mihrab', 'Islamic Art', 14, 10),
 ('manuscript', 'Islamic Art', 14, 25), ('textile', 'Islamic Art', 14, 20), ('astrolabe', 'Islamic Art', 14, 10), ('arabesque', 'Islamic Art', 14, 15),
]
PEOPLE_TAGS = {'men', 'women', 'girls', 'boys', 'children', 'babies', 'portraits', 'nudes', 'saints', 'christ', 'madonna', 'virgin', 'angels', 'gods', 'goddesses', 'faces', 'soldiers',
               'kings', 'queens', 'courtiers', 'peasants', 'musicians', 'dancers', 'families', 'self-portraits', 'figures', 'warriors', 'lovers', 'infants', 'ladies', 'princes', 'priests',
               'bathers', 'workers', 'fishermen', 'farmers', 'riders', 'horsemen', 'monks', 'nuns', 'hunters', 'actors', 'kimono', 'geisha'}
PEOPLE_WORDS = re.compile(r"\b(portrait|self-portrait|man|men|woman|women|lady|ladies|girl|girls|boy|boys|child|children|infant|baby|saint|st\.|madonna|virgin|christ|jesus|venus|nude|bather|bathers|soldier|peasant|family|figure|figures|king|queen|prince|princess|shah|sultan|emperor|courtier|musician|dancer|lovers|horseman|rider|hunter|hunt|battle|shepherd|fisherman|fishermen|actor|geisha|courtesan|beauty|beauties|mother|father|bride|groom|apostle|prophet|nativity|annunciation|crucifixion|adoration|holy|judith|david|salome)\b", re.I)

def sh(cmd, **kw): return subprocess.run(cmd, capture_output=True, **kw)

def get(url, tries=6):
    for i in range(tries):
        r = sh(['curl', '-s', '--max-time', '25', '-A', UA, url], text=True)
        try: return json.loads(r.stdout)
        except Exception: time.sleep(1.2 * (i + 1))
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

cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}

def detail(oid):
    key = str(oid)
    if key in cache: return cache[key]
    d = get(f'{API}/v1/objects/{oid}')
    if d is None: return None          # a failed request is not cached, so the next run tries again
    row = None
    if d and d.get('isPublicDomain') and d.get('primaryImage') and 'images.metmuseum.org/' in d['primaryImage']:
        path = d['primaryImage'].split('images.metmuseum.org/', 1)[1]
        small = 'https://images.metmuseum.org/' + (d.get('primaryImageSmall') or d['primaryImage']).split('images.metmuseum.org/', 1)[1]
        r = sh(['curl', '-s', '--max-time', '20', '-A', UA, '-r', '0-65535', small])
        dm = dims(r.stdout)
        tags = [t.get('term', '').lower() for t in (d.get('tags') or [])]
        title = d.get('title') or 'Untitled'
        people = any(t in PEOPLE_TAGS for t in tags) or bool(PEOPLE_WORDS.search(title))
        row = {'id': key, 't': title, 'a': d.get('artistDisplayName') or d.get('culture') or d.get('dynasty') or 'Unknown', 'd': d.get('objectDate') or '', 'u': path,
               'w': dm[0] if dm else 0, 'h': dm[1] if dm else 0, 'p': 1 if people else 0, 'cl': d.get('classification') or ''}
    cache[key] = row
    return row

def search(q, dept):
    p = {'hasImages': 'true', 'isPublicDomain': 'true', 'q': q, 'limit': 100, 'offset': 0}
    if dept: p['departmentId'] = dept
    d = get(f'{API}/v1.1/search?' + urllib.parse.urlencode(p))
    return (d or {}).get('objectIDs') or []

seen, out = set(), []
for q, coll, dept, want in QUERIES:
    ids = [i for i in search(q, dept) if str(i) not in seen][: want * 3]
    with cf.ThreadPoolExecutor(6) as ex: rows = [r for r in ex.map(detail, ids) if r]
    kept = 0
    for r in rows:
        if r['id'] in seen or kept >= want or r['w'] < 600 or r['h'] < 400 and coll != 'Islamic Art': continue
        if coll != 'Islamic Art' and r['cl'] and not any(k in r['cl'] for k in ('Painting', 'Print', 'Drawing')): continue
        seen.add(r['id']); r = dict(r); r['c'] = coll; out.append(r); kept += 1
    json.dump(cache, open(CACHE, 'w'))
    print(f'{q:24s} {coll:20s} {kept}/{want}', file=sys.stderr)
colls = []
for r in out:
    if r['c'] not in colls: colls.append(r['c'])
for r in out: r.pop('cl', None)
with open(OUT, 'w') as f:
    f.write('// Generated by tools/harvest_met.py - do not edit by hand.\n// Public-domain works from The Metropolitan Museum of Art Open Access collection (CC0). u = image path on images.metmuseum.org;\n// w/h = picture size (for the aspect ratio); p = 1 when the work shows people or faces.\n\n')
    f.write('export interface Artwork { id: string; t: string; a: string; d: string; u: string; w: number; h: number; p: number; c: string }\n\n')
    f.write('export const COLLECTIONS: string[] = ' + json.dumps(colls) + ';\n\n')
    f.write('export const ARTWORKS: Artwork[] = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
import collections
print(len(out), 'artworks;', len(colls), 'collections;', 'people-free:', sum(1 for r in out if not r['p']), dict(collections.Counter(r['c'] for r in out)))
