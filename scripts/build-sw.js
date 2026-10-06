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
  urls = ['/', ...paths.map((p) => p.slice(4))];
await writeFile(
  'dist/sw.js',
  `
const CACHE=${JSON.stringify(cache)};
const URLS=${JSON.stringify(urls)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(URLS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('avesta-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname==='/health'||url.pathname==='/ws')return;
 event.respondWith(caches.match(event.request,{cacheName:CACHE}).then(cached=>cached||fetch(event.request)));
});
`,
);
console.log(`Offline cache ${cache}: ${urls.length} resources`);
