import { readdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) out.push(...(await files(p)));
    else if (e.name !== 'sw.js') out.push(p);
  }
  return out;
}
await copyFile('data/avesta-osm.json', 'dist/map-source.json');
await copyFile('shared/geography.json', 'dist/map-database.json');
const paths = (await files('dist')).sort(),
  hash = createHash('sha256');
for (const p of paths) hash.update(await readFile(p));
const cache = `avesta-${hash.digest('hex').slice(0, 12)}`,
  urls = ['./', ...paths.map((p) => './' + p.slice(5))];
await writeFile(
  'dist/sw.js',
  `
const BASE=self.registration.scope;
const PREFIX='avesta:'+BASE+':';
const CACHE=PREFIX+${JSON.stringify(cache)};
const URLS=${JSON.stringify(urls)}.map(path=>new URL(path,BASE).href);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(URLS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname===new URL('health',BASE).pathname||url.pathname===new URL('ws',BASE).pathname)return;
 event.respondWith(caches.match(event.request,{cacheName:CACHE}).then(cached=>cached||fetch(event.request)));
});
`,
);
console.log(`Offline cache ${cache}: ${urls.length} resources`);
