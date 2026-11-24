const fs=require('fs'),assert=require('assert/strict');const m=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
assert.equal(m.start_url,'./cat.html');assert.equal(new URL(m.id,'https://rou0212.github.io/').href,new URL(m.start_url,'https://rou0212.github.io/customer-help/manifest.webmanifest').href,'manifest id resolves against origin and must match prior implicit start URL');assert.equal(m.scope,'./cat');assert.equal(m.display,'standalone');assert.equal(m.icons.length,2);
const html=fs.readFileSync('cat.html','utf8');assert.match(html,/manifest\.webmanifest\?v=single-query-/);assert.match(html,/assistant\.js\?v=single-query-/);assert.match(html,/assistant\.css\?v=single-query-/);
for(const icon of m.icons)assert.ok(fs.existsSync(icon.src));
console.log('PASS stable desktop manifest identity, existing standalone entry/icons and versioned assets');
