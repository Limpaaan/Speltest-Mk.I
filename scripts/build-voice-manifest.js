import { writeFile } from 'node:fs/promises';
import { SPEECH, VOICE_PROFILES } from '../shared/speech.js';
await writeFile(
  process.argv[2] || '.local/voice-manifest.json',
  JSON.stringify({ profiles: VOICE_PROFILES, lines: SPEECH }, null, 2) + '\n',
);
console.log(
  `${SPEECH.length} speech clips, ${Object.keys(VOICE_PROFILES).length} character profiles`,
);
