// 產生單一檔案 dist/worker.js（手冊、常見問題、比對規則都打包在裡面）
// 用法：在 customer-help 資料夾執行  node line-cat-worker/build.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const assistant = read('assistant.js');
const pick = re => { const m = assistant.match(re); if (!m) throw new Error('找不到 ' + re); return m[0]; };
const norm = pick(/const norm=s=>[^\n]*;/);
const intents = pick(/const INTENTS=\{[\s\S]*?\};/);
const out = [
  '// 由 build.mjs 自動產生，請勿直接修改。更新手冊或常見問題後重新執行 build 再貼上。',
  '// 產生時間：' + new Date().toISOString(),
  read('manuals.js'), read('faq.js'), norm, intents,
  read('line-cat-worker/src/handler.js'),
  'export default { fetch: handleFetch };', ''
].join('\n');
mkdirSync(new URL('line-cat-worker/dist/', root), { recursive: true });
writeFileSync(new URL('line-cat-worker/dist/worker.js', root), out);
console.log('dist/worker.js', out.length, 'bytes');
