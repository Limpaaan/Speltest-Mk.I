"""Optional asset-authoring tool. The game itself needs no TTS service or API key.

Requires edge-tts. Run build-voice-manifest.js first; pass the manifest and output
directory. Voice profiles use generic synthetic voices, never voice cloning.
"""
import asyncio
import json
from pathlib import Path
import sys
import edge_tts

async def main():
    manifest=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    output=Path(sys.argv[2])
    timing_path=output/'timings.json'
    timings=json.loads(timing_path.read_text(encoding='utf-8')) if timing_path.exists() else {}
    for index,line in enumerate(manifest['lines']):
        target=output/line['file']
        target.parent.mkdir(parents=True,exist_ok=True)
        if target.exists() and target.stat().st_size>1000 and line['id'] in timings:
            continue
        p=manifest['profiles'][line['profile']]
        for attempt in range(3):
            try:
                cues=[]
                with target.open('wb') as audio:
                    async for chunk in edge_tts.Communicate(line['text'],p['voice'],rate=p['rate'],pitch=p['pitch'],boundary='WordBoundary').stream():
                        if chunk['type']=='audio':
                            audio.write(chunk['data'])
                        elif chunk['type']=='WordBoundary':
                            cues.append({'start':round(chunk['offset']/10000000,3),'end':round((chunk['offset']+chunk['duration'])/10000000,3),'text':chunk['text']})
                timings[line['id']]=cues
                timing_path.write_text(json.dumps(timings,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
                break
            except edge_tts.exceptions.NoAudioReceived:
                if attempt == 2:
                    raise
                await asyncio.sleep(2 * (attempt + 1))
        print(f"{index+1}/{len(manifest['lines'])} {line['id']} {target.stat().st_size}",flush=True)
    (output/'voice-provenance.json').write_text(json.dumps({
        'created':'2026-10-12','method':'generic neural text-to-speech, distinct rate and pitch profiles',
        'voices':manifest['profiles'],'lines':manifest['lines'],
        'note':'No voice of a real NPC namesake was cloned. Profiles sharing a base voice are pitch/rate variants.'
    },ensure_ascii=False,indent=2),encoding='utf-8')

asyncio.run(main())
