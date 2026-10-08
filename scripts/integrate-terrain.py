"""Promote the inspected Avesta candidate; the source GeoTIFF is not distributed."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
source = ROOT / '.local/avesta-terrain-candidate.json'
candidate = json.loads(source.read_text())
if candidate['status'] != 'candidate-not-integrated' or candidate['schemaVersion'] != 1:
    raise ValueError('Expected a validated schema-1 import candidate')
if not (ROOT / 'public/licenses/copernicus-dem.pdf').is_file():
    raise ValueError('The full source licence must be available before integration')
crop = candidate.pop('sourceCrop')
candidate['status'] = 'integrated'
(ROOT / 'shared/terrain.json').write_text(json.dumps(candidate, ensure_ascii=False, separators=(',', ':')) + '\n')
(ROOT / 'data/terrain-source-crop.json').write_text(json.dumps({'sourceSha256': candidate['sourceSha256'], 'source': candidate['source'], **crop}, separators=(',', ':')) + '\n')
print('Integrated inspected grid and retained source crop; run game, import and browser tests.')
