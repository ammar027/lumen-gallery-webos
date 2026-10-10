#!/usr/bin/env python3
"""Builds src/config/art.ts from tools/cma.json (Cleveland Museum of Art Open Access, CC0): sorts works into collections and flags works that show people.
Run: python3 tools/harvest_cma.py && python3 tools/build_art.py"""
import collections, json, os, re
ROOT = os.path.expanduser('~/Developer/webos-frame')
rows = json.load(open(f'{ROOT}/tools/cma.json'))

PEOPLE = re.compile(r"\b(portrait|portraits|portraiture|self-portrait|figure|figures|figural|man|men|woman|women|lady|ladies|girl|girls|boy|boys|child|children|infant|baby|saint|saints|st\.|madonna|virgin|christ|jesus|nude|bather|bathers|soldier|soldiers|peasant|peasants|family|king|queen|prince|princess|emperor|empress|courtier|courtiers|musician|musicians|dancer|dancers|lovers|horseman|horsemen|rider|riders|hunter|hunters|hunting|battle|shepherd|shepherdess|fisherman|fishermen|actor|actors|geisha|courtesan|mother|father|bride|groom|apostle|apostles|prophet|nativity|annunciation|crucifixion|adoration|holy|sitter|gaze|face|faces|head|worshipers|monk|monks|buddha|bodhisattva|deity|deities|goddess|god|gods|scholar|scholars|sage|sages|official|travelers|travellers|pilgrims|villagers|workers|laborers|crowd|spectators|couple|silhouette|strolling|woodcutter|boatman|angler|farmer|farmers|servants|attendants|maiden|beauty|beauties|poet|poets|immortals|hermit|hermits|brother|brothers|sister|sisters|sculpture|people|persons|person|inhabitants|gentleman|gentlemen|lord|lords|warrior|warriors|queen|dancing|bodies|body|hand|hands|eyes|smile|dressed|costume)\b", re.I)
ANIMAL = re.compile(r"\b(animals?|beasts?|creatures?|menagerie|zoo|horses?|stallions?|mares?|foals?|colts?|ponies|pony|dogs?|hounds?|puppy|puppies|cats?|kittens?|lions?|lioness|tigers?|leopards?|panthers?|cheetahs?|bears?|wolf|wolves|foxes|fox|deer|stags?|does|elks?|moose|buffalos?|buffaloes|bulls?|oxen|ox|cows?|cattle|calf|calves|sheep|lambs?|goats?|pigs?|boars?|swine|hares?|rabbits?|squirrels?|monkeys?|apes?|elephants?|camels?|donkeys?|mules?|zebras?|giraffes?|birds?|eagles?|hawks?|falcons?|owls?|doves?|pigeons?|swans?|ducks?|geese|goose|cranes?|herons?|storks?|peacocks?|peahens?|pheasants?|parrots?|roosters?|cocks?|hens?|chickens?|sparrows?|swallows?|nightingales?|fish|fishes|carps?|koi|trouts?|salmon|whales?|dolphins?|sharks?|crabs?|lobsters?|shrimps?|oysters?|butterfl(y|ies)|moths?|bees?|insects?|dragonfl(y|ies)|crickets?|beetles?|spiders?|snakes?|serpents?|lizards?|frogs?|toads?|turtles?|tortoises?|dragons?|phoenix|griffins?|unicorns?|simurgh|flocks?|herds?|hunting|hunt|hunter|hunters|hawking|falconry)\b", re.I)
IMPRESSION = re.compile(r"impressionis|monet|pissarro|sisley|renoir|degas|morisot|caillebotte|post-impression|cezanne|cézanne|gauguin|van gogh|seurat|signac", re.I)
STILL = re.compile(r"still life|still-life|flowers?|bouquet|fruits?|vase|floral|lilies|lily|roses?|tulips?|peonies|chrysanthemum|blossoms?|orchid|bamboo", re.I)
SEA = re.compile(r"\b(sea|ocean|coast|coastal|harbor|harbour|beach|shore|seashore|marine|waves?|seascape|ships?|boats?|sailing|lighthouse|surf)\b", re.I)
LAND = re.compile(r"\b(landscape|landscapes|valley|mountains?|river|lake|forest|woods?|trees?|meadow|fields?|pasture|hills?|countryside|garden|vista|view|cliffs?|sky|clouds?|sunset|sunrise|dawn|winter|snow|autumn|village|canal|waterfall|pond|plains?|desert|bridge|road|path|moonlight|mist|fog|rocks?)\b", re.I)

def classify(r):
    if r['src'] == 'Islamic Art': return 'Islamic Art'
    if r['src'] == 'Japanese prints': return 'Japanese Prints'
    dep = r['dep']
    text = f"{r['t']} {r['desc']}"
    if any(k in dep for k in ('Chinese', 'Japanese', 'Korean', 'Indian')): return 'Asian Art'
    if IMPRESSION.search(r['a']) or re.search(r'impressionis', text, re.I): return 'Impressionism'
    if STILL.search(text) and not LAND.search(r['t']): return 'Flowers & Still Life'
    if SEA.search(r['t']) or (SEA.search(text) and not LAND.search(r['t'])): return 'Seascapes'
    if LAND.search(r['t']) or LAND.search(text): return 'Landscapes'
    if 'Modern' in dep or re.search(r'abstract', text, re.I): return 'Modern & Abstract'
    return 'Paintings'

out, seen = [], set()
for r in rows:
    if r['id'] in seen or max(r['w'], r['h']) < 1400: continue
    seen.add(r['id'])
    text = f"{r['t']} {r['desc']}"
    coll = classify(r)
    named = bool(PEOPLE.search(text))
    # a work counts as people-free only with positive evidence: its title (or, for Asian art, its description) is about landscape, sea, flowers or still life;
    # Islamic art and abstract works are judged on the people words alone
    safe = bool(LAND.search(r['t']) or SEA.search(r['t']) or STILL.search(r['t']) or (coll == 'Asian Art' and (LAND.search(text) or STILL.search(text))))
    people = named if coll in ('Islamic Art', 'Modern & Abstract') else (named or not safe)
    animals = bool(ANIMAL.search(text))
    out.append({'id': r['id'], 't': r['t'], 'a': r['a'], 'd': r['d'], 'u': r['u'], 'w': r['w'], 'h': r['h'], 'p': 1 if people else 0, 'n': 1 if animals else 0, 'c': coll, 's': 'c'})

# ---- Islamic art from The Met (department 14) and from Wikimedia Commons: added to the Islamic Art collection when their files exist
ISL_SAFE = re.compile(r"qur'?an|koran|calligraph|kufic|naskh|thuluth|muhaqqaq|bifolium|folio from a qur|tile|panel|mihrab|carpet|rug|lamp|geometric|arabesque|inscri|mosque|astrolabe|candlestick|bowl|dish|ewer|vase|tray|jug|cup|casket|box|ceiling|door|window|dome|minaret|courtyard|ornament|pattern|medallion|lusterware|minai|textile|brocade|velvet|silk", re.I)
ISL_PEOPLE = re.compile(r"\b(portrait|prince|princes|princess|shah|sultan|emperor|king|queen|lovers|battle|hunt|hunting|court|figures?|man|men|woman|women|girl|boy|children|child|horseman|rider|shahnama|shahnameh|khamsa|illustrat\w*|miniature|painting|scene|story|tale|poet|saint|prophet|angel|devil|demon|dragon|simurgh|bull|lion|elephant|peacock|people|worshipers?|pilgrims?|crowd|prayers?|praying|visitors?|tourists?)\b", re.I)
ORNAMENT_CATS = {'Islamic calligraphy', 'Arabic calligraphy', 'Quran manuscripts', "Qur'an manuscripts", 'Islamic geometric patterns', 'Muqarnas', 'Zellige', 'Mihrabs', 'Islamic tiles', 'Iznik tiles', 'Persian carpets', 'Ottoman calligraphy', 'Kufic script', 'Arabesques', 'Islamic architectural ornament', 'Mosque ceilings', 'Mosque domes'}
DETAIL = re.compile(r'dome|ceiling|muqarnas|tile|tiles|calligraph|mihrab|ornament|detail|pattern|arch|inscription|door|window|mosaic|vault|stucco|carpet|panel|zellige|arabesque|geometric|interior view of the dome|chandelier|lamp', re.I)
isl = []
mi = f'{ROOT}/tools/met_islamic.json'
if os.path.exists(mi):
    for r in json.load(open(mi)):
        text = f"{r['t']} {r['on']} {r['cl']} {' '.join(r.get('tags', []))}"
        if r['cl'] in ('Paintings', 'Drawings', 'Miniatures', 'Costumes', 'Costume', 'Photographs', 'Coins', 'Arms and Armor', 'Jewelry'): people = True
        else: people = bool(ISL_PEOPLE.search(text)) or not ISL_SAFE.search(text)
        isl.append({'id': r['id'], 't': r['t'], 'a': r['a'], 'd': r['d'], 'u': r['u'], 'w': r['w'], 'h': r['h'], 'p': 1 if people else 0, 'n': 1 if ANIMAL.search(text) else 0, 'c': 'Islamic Art', 's': 'm'})
cm = f'{ROOT}/tools/commons.json'
if os.path.exists(cm):
    for r in json.load(open(cm)):
        text = f"{r['t']} {r['cat']}"
        # ornament, script and tile categories hold no people; photographs of whole mosques and monuments often have visitors in them, so those count as
        # people-free only when the title is about a detail (dome, ceiling, tile, calligraphy ...)
        ornament = r['cat'] in ORNAMENT_CATS or bool(DETAIL.search(r['t']))
        people = bool(ISL_PEOPLE.search(text)) or not ornament
        isl.append({'id': r['id'], 't': r['t'], 'a': r['a'], 'd': r['d'], 'u': r['u'], 'w': r['w'], 'h': r['h'], 'p': 1 if people else 0, 'n': 1 if ANIMAL.search(text) else 0, 'c': 'Islamic Art', 's': 'w'})
for r in isl:
    if r['id'] not in seen: seen.add(r['id']); out.append(r)

order = ['Landscapes', 'Seascapes', 'Impressionism', 'Flowers & Still Life', 'Asian Art', 'Japanese Prints', 'Islamic Art', 'Modern & Abstract', 'Paintings']
colls = [c for c in order if any(a['c'] == c for a in out)]
with open(f'{ROOT}/src/config/art.ts', 'w') as f:
    f.write('// Generated by tools/build_art.py - do not edit by hand.\n// Public-domain (CC0) works from the Cleveland Museum of Art Open Access collection. u = image path on openaccess-cdn.clevelandart.org;\n// w/h = picture size; p = 1 when the work shows (or may show) people or faces; n = 1 when it shows an animal or other living creature; s = source.\n\n')
    f.write("export interface Artwork { id: string; t: string; a: string; d: string; u: string; w: number; h: number; p: number; n: number; c: string; s: string }\n\n")
    f.write('export const COLLECTIONS: string[] = ' + json.dumps(colls) + ';\n\n')
    f.write('export const ARTWORKS: Artwork[] = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
free = [a for a in out if not a['p']]
print(len(out), 'works;', len(free), 'without people;', sum(1 for a in free if a['w'] / a['h'] >= 1.25), 'people-free and wide;', sum(1 for a in out if not a['p'] and not a['n']), 'without people or animals')
for c in colls:
    allc = [a for a in out if a['c'] == c]; fr = [a for a in allc if not a['p']]
    print(f'  {c:22s} {len(allc):5d} total  {len(fr):5d} people-free  {sum(1 for a in fr if a["w"] / a["h"] >= 1.25):5d} wide')
