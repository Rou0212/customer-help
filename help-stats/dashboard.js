const escape = value => String(value).replace(/[&<>"']/g, char =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
const headers = {
  'Cache-Control':'private, no-store',
  'X-Content-Type-Options':'nosniff',
  'X-Frame-Options':'DENY',
  'Referrer-Policy':'no-referrer',
  'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"
};

async function authorized(request, password) {
  if (!password) return false;
  const encode = new TextEncoder();
  const digest = value => crypto.subtle.digest('SHA-256', encode.encode(value));
  const [actual, expected] = await Promise.all([
    digest(request.headers.get('Authorization') || ''),
    digest('Basic '+btoa('rou:'+password))
  ]);
  return crypto.subtle.timingSafeEqual(actual, expected);
}

export async function dashboard(request, env, cities) {
  if (!await authorized(request, env.DASHBOARD_PASSWORD)) {
    return new Response('需登入才能查看統計。', {
      status:401,headers:{...headers,'WWW-Authenticate':'Basic realm="Ley an Help Stats", charset="UTF-8"'}
    });
  }
  const params = new URL(request.url).searchParams;
  const days = [7,30,90].includes(Number(params.get('days'))) ? Number(params.get('days')) : 30;
  const city = cities.has(params.get('city')) ? params.get('city') : '';
  const today = Date.now()+8*3600000;
  const end = new Date(today).toISOString().slice(0,10);
  const start = new Date(today-(days-1)*86400000).toISOString().slice(0,10);
  const {results} = await env.STATS.prepare(
    'SELECT city, category, SUM(count) AS total FROM question_counts WHERE day BETWEEN ? AND ? GROUP BY city, category'
  ).bind(start,end).all();
  const cityTotals = new Map(), categoryTotals = new Map();
  for(const row of results){
    cityTotals.set(row.city,(cityTotals.get(row.city)||0)+row.total);
    if(!city || row.city===city) categoryTotals.set(row.category,(categoryTotals.get(row.category)||0)+row.total);
  }
  const ranked = totals => [...totals].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0],'zh-Hant'));
  const cityRank = ranked(cityTotals), categoryRank = ranked(categoryTotals);
  const total = categoryRank.reduce((sum,row)=>sum+row[1],0);
  const cityLinks = cityRank.map(([name,count],i)=>
    '<tr><td>'+(i+1)+'</td><td><a href="?days='+days+'&amp;city='+encodeURIComponent(name)+'">'+escape(name)+'</a></td><td>'+count+'</td></tr>').join('');
  const bars = categoryRank.map(([name,count])=>
    '<li><div><span>'+escape(name)+'</span><strong>'+count+' 次</strong></div><meter min="0" max="'+categoryRank[0][1]+'" value="'+count+'" aria-label="'+escape(name)+'"></meter></li>').join('');
  const scope = city || '全縣市';
  const empty = '<p class="empty">這段期間還沒有提問紀錄。</p>';
  return new Response(`<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>小黑貓｜提問統計</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f4f7f8;color:#182c35;font:16px/1.55 system-ui,sans-serif}main{max-width:1080px;margin:auto;padding:36px 20px}
h1{font-size:clamp(1.8rem,5vw,2.6rem);margin:0}h2{font-size:1.2rem;margin:0 0 14px}p{margin:6px 0;color:#4c626b}
form{display:flex;flex-wrap:wrap;gap:12px;align-items:end;margin:22px 0}label{display:grid;gap:4px;font-weight:650}select,button{font:inherit;border-radius:8px;padding:8px 12px;border:1px solid #a6b9c1;background:white;color:inherit}
button{background:#116458;color:white;border-color:#116458;cursor:pointer}a{color:#075e54}section{background:white;border:1px solid #dbe5e9;border-radius:14px;padding:20px;min-width:0}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.summary{margin-bottom:16px}.summary strong{font-size:2rem;margin-right:8px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:8px;border-bottom:1px solid #edf2f4}th:last-child,td:last-child{text-align:right}
ul{list-style:none;margin:0;padding:0}li{margin:0 0 10px}li div{display:flex;justify-content:space-between;gap:10px}meter{width:100%;height:14px;accent-color:#168575}.empty{padding:10px 0}footer{margin-top:16px;color:#4c626b;font-size:.88rem}@media(max-width:600px){.grid{grid-template-columns:1fr}main{padding:20px 14px}}
</style>
<main><header><h1>小黑貓提問統計</h1><p>${start} ～ ${end}（臺灣時間）</p></header>
<form method="get"><label>期間<select name="days">${[7,30,90].map(n=>'<option'+(n===days?' selected':'')+' value="'+n+'">最近 '+n+' 天</option>').join('')}</select></label>
<label>問題類型範圍<select name="city"><option value="">全縣市</option>${[...cities].map(name=>'<option'+(name===city?' selected':'')+'>'+escape(name)+'</option>').join('')}</select></label><button>套用</button></form>
<section class="summary"><h2>${escape(scope)}提問量</h2><strong>${total.toLocaleString('zh-TW')}</strong>次提問</section>
<div class="grid"><section><h2>縣市提問排行</h2>${cityLinks?'<table><thead><tr><th scope="col">名次</th><th scope="col">縣市</th><th scope="col">提問次數</th></tr></thead><tbody>'+cityLinks+'</tbody></table>':empty}</section>
<section><h2>${escape(scope)}｜問題類型排行</h2>${bars?'<ul>'+bars+'</ul>':empty}</section></div>
<footer>提問量以次數計算，不是人數；只統計縣市與自動分類，不顯示問題原文或截圖。</footer></main></html>`,{
    headers:{...headers,'Content-Type':'text/html; charset=utf-8'}
  });
}
