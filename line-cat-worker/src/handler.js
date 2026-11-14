// ===== 小黑貓 LINE 自動回覆（Cloudflare Worker）=====
// 需要的設定（Cloudflare → Worker → 設定 → 變數和祕密）：
//   LINE_CHANNEL_SECRET        LINE Messaging API 的 Channel secret（祕密）
//   LINE_CHANNEL_ACCESS_TOKEN  LINE Messaging API 的 Channel access token（祕密）
//   TELEGRAM_BOT_TOKEN         發通知用的 Telegram bot token，可直接用 OpenClaw 的 bot（祕密）
//   TELEGRAM_CHAT_ID           接收通知的 Telegram chat id（你本人）
//   DUTY_KEY                   自訂一串英數亂碼，OpenClaw 切換值班時要帶（祕密）
//   LOG_AUTO_REPLIES           "true"：每次自動回覆也通知你一份（預設 true）
//   DEFAULT_SHIFT_HOURS        開始值班沒寫時數時的預設值（預設 9）
//   TELEGRAM_RECEIVE           只有用「專屬」bot 時才設 "true"（讓 bot 接收 /值班開始 指令）。
//                              用 OpenClaw 的 bot 時不要設，否則會搶走 OpenClaw 的訊息。
//   TELEGRAM_WEBHOOK_SECRET    搭配 TELEGRAM_RECEIVE 使用（祕密）
//   KV 命名空間綁定：CAT_KV
const SITE = 'https://rou0212.github.io/customer-help/';
const HUMAN_WORDS = ['真人', '客服', '人工', '專人', '打電話', '電話給我'];
const ALWAYS_HUMAN = ['調閱', '監視器', '錄音', '權限異動', '同意書', '報價', '合約', '收費', '費用', '退費', '開業', '抱怨', '投訴', '取消', '合併患者', '更換負責', '機構代碼'];
// 常見問題若出現「請客戶提供密碼/PIN/身分證」這類內容，小黑貓不會拿來自動回覆
const UNSAFE = /(提供|傳給|告訴|回覆|私訊|給我們|給客服).{0,8}(密碼|pin|puk|身分證|身份證|驗證碼|帳號密碼)/i;

// ---------- 讀資料：不執行程式，只解析 JS 裡的資料（物件、陣列、字串、數字）----------
function parseLiteral(src, i) {
  const ws = () => { for (;;) { while (i < src.length && /\s/.test(src[i])) i++; if (src.startsWith('//', i)) { while (i < src.length && src[i] !== '\n') i++; } else if (src.startsWith('/*', i)) { i = src.indexOf('*/', i + 2); if (i < 0) throw new Error('註解沒關'); i += 2; } else return; } };
  const str = () => { const q = src[i++]; let o = ''; while (src[i] !== q) { if (i >= src.length) throw new Error('字串沒關'); let c = src[i++]; if (c === '\\') { c = src[i++]; o += c === 'n' ? '\n' : c === 't' ? '\t' : c === 'u' ? String.fromCharCode(parseInt(src.slice(i, (i += 4)), 16)) : c; } else o += c; } i++; return o; };
  const val = () => {
    ws(); const c = src[i];
    if (c === '{') { i++; const o = {}; for (;;) { ws(); if (src[i] === '}') { i++; return o; } let k; if (src[i] === '"' || src[i] === "'") k = str(); else { const m = /^[A-Za-z_$][\w$]*/.exec(src.slice(i, i + 64)); if (!m) throw new Error('看不懂的鍵 @' + i); k = m[0]; i += k.length; } ws(); if (src[i++] !== ':') throw new Error('少了冒號 @' + i); o[k] = val(); ws(); if (src[i] === ',') i++; else if (src[i] !== '}') throw new Error('少了逗號 @' + i); } }
    if (c === '[') { i++; const a = []; for (;;) { ws(); if (src[i] === ']') { i++; return a; } a.push(val()); ws(); if (src[i] === ',') i++; else if (src[i] !== ']') throw new Error('少了逗號 @' + i); } }
    if (c === '"' || c === "'") return str();
    const m = /^(-?\d+(\.\d+)?|true|false|null)/.exec(src.slice(i, i + 32)); if (!m) throw new Error('看不懂的值 @' + i);
    i += m[0].length; return JSON.parse(m[0]);
  };
  const v = val(); return v;
}
function extract(src, name) {
  const m = new RegExp('const\\s+' + name + '\\s*=').exec(src);
  if (!m) throw new Error('找不到 ' + name);
  return parseLiteral(src, m.index + m[0].length);
}
function validFaq(f) { return f && typeof f.id === 'string' && typeof f.title === 'string' && typeof f.tags === 'string' && (Array.isArray(f.steps) || typeof f.text === 'string'); }

const bigrams = s => { const r = new Set(); for (let i = 0; i < s.length - 1; i++) r.add(s.slice(i, i + 2)); return r; };
function buildData(raw, source) {
  const pool = raw.documents.filter(d => !d.region && d.id && d.title);
  const faqs = raw.FAQS.filter(validFaq);
  const skipped = raw.FAQS.filter(f => !validFaq(f)).map(f => (f && f.id) || '?');
  const unsafe = faqs.filter(f => UNSAFE.test(f.title + (f.text || '') + (f.steps || []).join(' '))).map(f => f.id);
  return {
    source, loaded: Date.now(), STATION: raw.STATION, INTENTS: raw.INTENTS || {}, pool, skipped, unsafe,
    faqCount: faqs.length,
    prepared: pool.map(d => ({ d, toks: [...new Set(String(d.keywords || '').split(/\s+/).map(norm).filter(t => t.length >= 2))], title: norm(d.title), bg: bigrams(norm(d.title + (d.description || '') + (d.steps || []).join(''))) })),
    faqPool: faqs.filter(f => !unsafe.includes(f.id)).map(f => ({ f, toks: [...new Set(f.tags.split(/\s+/).map(norm).filter(t => t.length >= 2))], title: norm(f.title), bg: bigrams(norm(f.title + (f.text || '') + (f.steps || []).join(''))) }))
  };
}
// 內建資料（打包時的版本）＝ 網站讀不到時的備援
let DATA = buildData({ documents, FAQS, STATION, INTENTS }, 'bundled');
const REFRESH_MS = 5 * 60e3;
// 每 5 分鐘到網站抓一次最新的手冊與常見問題；OpenClaw 改了 GitHub，這裡就會跟著更新
async function refresh(env) {
  // 成功後 5 分鐘再抓；失敗後 1 分鐘再試
  if (Date.now() - (DATA.tried || 0) < (DATA.ok ? REFRESH_MS : 60e3)) return;
  DATA.tried = Date.now(); DATA.ok = false;
  const v = Math.floor(Date.now() / REFRESH_MS);
  try {
    const get = async f => { const r = await fetch(SITE + f + '?v=' + v, { cf: { cacheTtl: 60 } }); if (!r.ok) throw new Error(f + ' HTTP ' + r.status); return r.text(); };
    const [m, q, a] = await Promise.all([get('manuals.js'), get('faq.js'), get('assistant.js')]);
    const raw = { documents: extract(m, 'documents'), STATION: extract(m, 'STATION'), FAQS: extract(q, 'FAQS'), INTENTS: extract(a, 'INTENTS') };
    if (!Array.isArray(raw.documents) || !Array.isArray(raw.FAQS) || raw.FAQS.length < 5) throw new Error('資料筆數不對');
    const next = buildData(raw, 'live');
    const prevIds = new Set(DATA.faqPool.map(p => p.f.id));
    next.tried = Date.now(); next.ok = true;
    DATA = next;
    const problems = [...next.skipped.map(id => id + '（格式不完整）'), ...next.unsafe.map(id => id + '（含索取密碼/個資字眼）')];
    if (problems.length && env) await warnOnce(env, 'warn:faq:' + problems.join(','), '⚠️ 小黑貓有幾題常見問題沒有採用：\n' + problems.join('\n') + '\n請檢查 faq.js。');
    if (prevIds.size && env) { const added = next.faqPool.filter(p => !prevIds.has(p.f.id)).map(p => p.f.title); if (added.length) await warnOnce(env, 'learn:' + added.join(','), '🐾 小黑貓學會了新題目：\n' + added.join('\n')); }
  } catch (e) {
    console.log('refresh failed', e && e.message);
    if (env) await warnOnce(env, 'warn:parse', '⚠️ 小黑貓讀不懂網站上最新的手冊／常見問題，先用之前的版本回覆。\n原因：' + (e && e.message) + '\n通常是 faq.js 少了逗號、引號或括號。', 6 * 3600);
  }
}
const hash = t => { let h = 5381; for (let i = 0; i < t.length; i++) h = (h * 33 + t.charCodeAt(i)) >>> 0; return h.toString(36); };
async function warnOnce(env, key, text, ttl = 7 * 86400) {
  key = key.split(':').slice(0, 2).join(':') + ':' + hash(key);
  try { if (await env.CAT_KV.get(key)) return; await env.CAT_KV.put(key, '1', { expirationTtl: ttl }); } catch (e) {}
  await notify(env, text);
}
const codeOf2 = d => DATA.STATION[d.parent || d.id] || '';

// ---------- 比對（跟網站上的小黑貓同一套規則）----------
function rankDocs(q) {
  const n = norm(q); if (!n) return [];
  const cm = n.match(/(^|[^a-z])([nvuedg])0?(\d{1,2})(?!\d)/);
  if (cm) { const code = cm[2].toUpperCase() + String(cm[3]).padStart(2, '0'); const d = DATA.pool.find(x => !x.parent && DATA.STATION[x.id] === code); if (d) return [{ d, score: 100 }]; }
  return DATA.prepared.map(p => {
    let s = 0;
    (DATA.INTENTS[p.d.id] || []).forEach(ph => { const k = norm(ph); if (n.includes(k)) s += (p.d.parent ? 20 : 10) + k.length; });
    p.toks.forEach(t => { if (n.includes(t)) s += Math.min(t.length, 6) * 1.5; });
    if (n.includes(p.title)) s += 15;
    if (/\d{4}/.test(n) && p.d.id === 'card-reader-errors') { const nums = n.match(/\d{4}/g); if (nums.some(x => String(p.d.keywords).includes(x))) s += 40; }
    if (n.length >= 2) { let o = 0; bigrams(n).forEach(b => { if (p.bg.has(b)) o++; }); s += o * 1.2; }
    if (p.d.parent) s -= 4;
    return { d: p.d, score: s };
  }).filter(r => r.score >= 8).sort((a, b) => b.score - a.score);
}
function rankFaqs(q) {
  const n = norm(q); if (!n) return [];
  return DATA.faqPool.map(p => {
    let s = 0;
    p.toks.forEach(t => { if (n.includes(t)) s += /^\d{4}$/.test(t) ? 55 : Math.min(t.length, 6) * 3; });
    if (n.includes(p.title)) s += 15;
    let o = 0; bigrams(n).forEach(b => { if (p.bg.has(b)) o++; }); s += o;
    return { f: p.f, score: s };
  }).filter(r => r.score >= 10).sort((a, b) => b.score - a.score);
}
// 決定要回什麼：{kind:'faq'|'doc'|'human'|'unknown', ...}
function decide(text) {
  const n = norm(text);
  if (HUMAN_WORDS.some(w => n.includes(norm(w)))) return { kind: 'human', why: '客戶要求真人' };
  if (ALWAYS_HUMAN.some(w => n.includes(norm(w)))) return { kind: 'human', why: '需要人工處理的事項' };
  const r = rankDocs(text), fr = rankFaqs(text);
  const faqFirst = fr.length && (!r.length || (fr[0].score * 1.2 >= r[0].score && r[0].score < 100));
  if (faqFirst && fr[0].score >= 20) return { kind: 'faq', f: fr[0].f, score: fr[0].score };
  if (!faqFirst && r.length && r[0].score >= 25) return { kind: 'doc', d: r[0].d, score: r[0].score, f: fr.length && fr[0].score >= 20 ? fr[0].f : null };
  return { kind: 'unknown', hint: fr[0] ? fr[0].f.title : (r[0] ? r[0].d.title : '') };
}
function faqText(f) {
  const lines = ['🐾 小黑貓自動回覆', '', '【' + f.title + '】'];
  if (f.text) lines.push(f.text);
  if (f.steps) f.steps.forEach((s, i) => lines.push((i + 1) + '. ' + s));
  const rel = f.doc && DATA.pool.find(x => x.id === f.doc);
  if (rel) lines.push('', '📄 相關手冊：' + codeOf2(rel) + ' ' + rel.title, SITE + '?doc=' + codeOf2(rel));
  else lines.push('', '🔗 ' + SITE + '?faq=' + f.id);
  lines.push('', '還是不行？回覆「真人」，客服會接手。');
  return lines.join('\n');
}
function docText(d, f) {
  const code = d.parent ? d.id : codeOf2(d);
  const lines = ['🐾 小黑貓自動回覆', '', '這份手冊應該能幫上忙：', '📄 ' + codeOf2(d) + ' ' + d.title, d.description, SITE + '?doc=' + code + '&read=1'];
  if (f) lines.push('', '常見狀況：' + f.title, SITE + '?faq=' + f.id);
  lines.push('', '照著做還是卡住？回覆「真人」，客服會接手。');
  return lines.join('\n');
}

// ---------- LINE ----------
async function verifyLine(env, body, sig) {
  if (!sig) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.LINE_CHANNEL_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return b64 === sig;
}
async function lineApi(env, path, payload) {
  const res = await fetch('https://api.line.me/v2/bot/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + env.LINE_CHANNEL_ACCESS_TOKEN }, body: JSON.stringify(payload) });
  if (!res.ok) console.log('LINE API error', path, res.status, await res.text());
  return res.ok;
}
async function lineName(env, userId) {
  try { const r = await fetch('https://api.line.me/v2/bot/profile/' + userId, { headers: { Authorization: 'Bearer ' + env.LINE_CHANNEL_ACCESS_TOKEN } }); if (r.ok) return (await r.json()).displayName || '（未知）'; } catch (e) {}
  return '（未知）';
}
// 通知附 LINE 後台聊天列表連結（用客戶名稱找人）
const chatLink = (dest, userId) => 'https://chat.line.biz/' + dest;

// ---------- Telegram ----------
const clean = v => String(v || '').trim().replace(/^["']|["']$/g, '').trim();
let lastTgError = '';
async function tg(env, method, payload) {
  const res = await fetch('https://api.telegram.org/bot' + clean(env.TELEGRAM_BOT_TOKEN) + '/' + method, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) { let d = ''; try { d = (await res.json()).description || ''; } catch (e) {} lastTgError = res.status + ' ' + d; console.log('Telegram error', method, lastTgError); }
  return res.ok;
}
const notify = (env, text) => tg(env, 'sendMessage', { chat_id: clean(env.TELEGRAM_CHAT_ID).replace(/^id[:：]\s*/i, ''), text, disable_web_page_preview: true });

// ---------- 值班狀態（存在 KV）----------
async function getDuty(env) {
  const v = await env.CAT_KV.get('duty', 'json');
  if (!v || !v.on) return { on: false };
  if (v.until && Date.now() > v.until) return { on: false, expired: true };
  return v;
}
const fmt = ts => new Date(ts).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

// 開始／結束值班（Telegram 指令和 OpenClaw 都走這裡）
async function setDuty(env, action, hours) {
  if (action === 'on') {
    const h = Math.min(Math.max(parseFloat(hours) || parseFloat(env.DEFAULT_SHIFT_HOURS) || 9, 0.25), 24);
    const until = Date.now() + h * 3600e3;
    await env.CAT_KV.put('duty', JSON.stringify({ on: true, since: Date.now(), until }));
    await notify(env, '🐾 小黑貓開始值班，會自動回覆 LINE@ 訊息。\n預計到 ' + fmt(until) + ' 自動下班。');
    return { on: true, until, untilText: fmt(until) };
  }
  if (action === 'off') {
    await env.CAT_KV.put('duty', JSON.stringify({ on: false }));
    await notify(env, '🐾 小黑貓下班了，LINE@ 訊息交還給人工。');
    return { on: false };
  }
  const d = await getDuty(env);
  return d.on ? { on: true, until: d.until, untilText: fmt(d.until) } : { on: false };
}
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
const authed = (req, env) => !!env.DUTY_KEY && (req.headers.get('Authorization') || '') === 'Bearer ' + clean(env.DUTY_KEY);

// OpenClaw 呼叫：POST /duty  標頭 Authorization: Bearer <DUTY_KEY>  內容 {"action":"on","hours":4} / {"action":"off"} / {"action":"status"}
async function handleDuty(req, env) {
  if (!authed(req, env)) return json({ error: 'forbidden' }, 403);
  let b = {}; try { b = await req.json(); } catch (e) {}
  if (!['on', 'off', 'status'].includes(b.action)) return json({ error: 'action 要是 on / off / status' }, 400);
  return json(await setDuty(env, b.action, b.hours));
}

// 只有用專屬 bot（TELEGRAM_RECEIVE=true）時才會用到
async function handleTelegram(req, env) {
  if (env.TELEGRAM_RECEIVE !== 'true' || !env.TELEGRAM_WEBHOOK_SECRET || req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.TELEGRAM_WEBHOOK_SECRET) return new Response('forbidden', { status: 403 });
  const u = await req.json();
  const m = u.message; if (!m || !m.text) return new Response('ok');
  if (String(m.chat.id) !== String(env.TELEGRAM_CHAT_ID)) return new Response('ok');
  const t = m.text.trim();
  if (/^\/?(值班開始|on|start_duty)/i.test(t)) await setDuty(env, 'on', (t.match(/(\d+(\.\d+)?)/) || [])[1]);
  else if (/^\/?(值班結束|off|stop_duty)/i.test(t)) await setDuty(env, 'off');
  else if (/^\/?(狀態|status)/i.test(t)) { const d = await setDuty(env, 'status'); await notify(env, d.on ? '🐾 值班中，到 ' + d.untilText + '。' : '😴 目前沒有值班。'); }
  else await notify(env, '指令：\n/值班開始（或 /值班開始 4 代表 4 小時）\n/值班結束\n/狀態');
  return new Response('ok');
}

async function forwardImage(env, messageId, caption) {
  const r = await fetch('https://api-data.line.me/v2/bot/message/' + messageId + '/content', { headers: { Authorization: 'Bearer ' + env.LINE_CHANNEL_ACCESS_TOKEN } });
  if (!r.ok) return notify(env, caption + '\n（截圖下載失敗，請到 LINE 後台查看）');
  const fd = new FormData();
  fd.append('chat_id', clean(env.TELEGRAM_CHAT_ID).replace(/^id[:：]\s*/i, ''));
  fd.append('caption', caption.slice(0, 1000));
  fd.append('photo', new Blob([await r.arrayBuffer()], { type: r.headers.get('content-type') || 'image/jpeg' }), 'screenshot.jpg');
  const res = await fetch('https://api.telegram.org/bot' + clean(env.TELEGRAM_BOT_TOKEN) + '/sendPhoto', { method: 'POST', body: fd });
  if (!res.ok) await notify(env, caption + '\n（截圖轉發失敗，請到 LINE 後台查看）');
}

async function ackOnce(env, ev, text) {
  const k = 'ack:' + ev.source.userId;
  if (await env.CAT_KV.get(k)) return;
  await env.CAT_KV.put(k, '1', { expirationTtl: 1800 });
  await lineApi(env, 'message/reply', { replyToken: ev.replyToken, messages: [{ type: 'text', text }] });
}

async function handleEvent(env, ev, dest) {
  if (ev.type !== 'message' || !ev.source || ev.source.type !== 'user') return;
  const duty = await getDuty(env);
  if (!duty.on) return; // 非值班時間：不動作，交給人工
  const userId = ev.source.userId, msg = ev.message;
  const log = env.LOG_AUTO_REPLIES !== 'false';
  if (msg.type === 'image') {
    const name = await lineName(env, userId);
    await ackOnce(env, ev, '已收到您的截圖，客服會盡快協助您 🙏');
    return forwardImage(env, msg.id, '🖼️ ' + name + ' 傳了截圖\n👉 ' + chatLink(dest, userId));
  }
  if (msg.type !== 'text') return; // 貼圖等不處理
  await refresh(env);
  const text = msg.text.slice(0, 500), dec = decide(text);
  if (dec.kind === 'faq' || dec.kind === 'doc') {
    const messages = [{ type: 'text', text: dec.kind === 'faq' ? faqText(dec.f) : docText(dec.d, dec.f) }];
    if (dec.kind === 'faq' && dec.f.img) { const url = SITE + 'images/faq/' + dec.f.img + '.png'; messages.push({ type: 'image', originalContentUrl: url, previewImageUrl: url }); }
    await lineApi(env, 'message/reply', { replyToken: ev.replyToken, messages });
    if (log) { const name = await lineName(env, userId); await notify(env, '✅ 已自動回覆 ' + name + '\n問：' + text + '\n答：' + (dec.kind === 'faq' ? dec.f.title : codeOf2(dec.d) + ' ' + dec.d.title) + '\n👉 ' + chatLink(dest, userId)); }
    return;
  }
  const name = await lineName(env, userId);
  if (dec.kind === 'human') await lineApi(env, 'message/reply', { replyToken: ev.replyToken, messages: [{ type: 'text', text: '好的，已經幫您通知客服，請稍候 🙏' }] });
  else await ackOnce(env, ev, '已收到您的訊息，客服會盡快回覆您 🙏\n也可以先到操作手冊找找看：' + SITE);
  await notify(env, (dec.kind === 'human' ? '🙋 需要你處理（' + dec.why + '）' : '❓ 小黑貓看不懂') + '\n客戶：' + name + '\n訊息：' + text + (dec.hint ? '\n（最接近：' + dec.hint + '）' : '') + '\n👉 ' + chatLink(dest, userId) + (dec.kind === 'unknown' ? '\n💡 回覆這則訊息告訴我正確處理方式，就能加進常見問題。' : ''));
}

async function handleLine(req, env, ctx) {
  const body = await req.text();
  if (!(await verifyLine(env, body, req.headers.get('x-line-signature')))) return new Response('bad signature', { status: 401 });
  const data = JSON.parse(body || '{}');
  ctx.waitUntil(Promise.all((data.events || []).map(ev => handleEvent(env, ev, data.destination).catch(e => console.log('event error', e && e.stack)))));
  return new Response('ok');
}

async function handleFetch(req, env, ctx) {
  const url = new URL(req.url);
  const txt = t => new Response(t, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  if (req.method === 'POST' && url.pathname === '/line') return handleLine(req, env, ctx);
  if (req.method === 'POST' && url.pathname === '/duty') return handleDuty(req, env);
  if (req.method === 'POST' && url.pathname === '/telegram') return handleTelegram(req, env);
  if (url.pathname === '/setup') {
    // 只發一則測試通知；不會更動 bot 設定，所以可以安心用 OpenClaw 的 bot
    if (!env.DUTY_KEY || (url.searchParams.get('key') || '').trim() !== clean(env.DUTY_KEY)) return new Response('forbidden', { status: 403 });
    let ok = await notify(env, '🐾 小黑貓已連上！之後 LINE@ 看不懂的訊息會從這裡通知你。');
    let extra = '';
    if (ok && env.TELEGRAM_RECEIVE === 'true' && env.TELEGRAM_WEBHOOK_SECRET) {
      ok = await tg(env, 'setWebhook', { url: url.origin + '/telegram', secret_token: env.TELEGRAM_WEBHOOK_SECRET, allowed_updates: ['message'] });
      extra = '（已設定專屬 bot 接收指令）';
    }
    if (ok) return txt('完成！請到 Telegram 看小黑貓的測試訊息。' + extra);
    const e = lastTgError, tok = clean(env.TELEGRAM_BOT_TOKEN), id = clean(env.TELEGRAM_CHAT_ID).replace(/^id[:：]\s*/i, '');
    let why = '';
    if (!tok) why = '沒有讀到 TELEGRAM_BOT_TOKEN（名稱要完全一樣，大寫加底線）。';
    else if (!id) why = '沒有讀到 TELEGRAM_CHAT_ID（名稱要完全一樣，大寫加底線）。';
    else if (/^401|^404/.test(e)) why = 'bot token 不對。請到 @BotFather → /mybots → 選 bot → API Token 重新複製（整串，包含中間的冒號）。';
    else if (/chat not found/i.test(e)) why = '找不到這個 Telegram Id。請確認：1) 填的是 @userinfobot 回你的「Id」數字；2) 你有在這個 bot 的對話按過「開始」或傳過訊息。';
    else if (/blocked/i.test(e)) why = '你封鎖了這個 bot，請在 Telegram 解除封鎖。';
    else if (/chat_id is empty|invalid/i.test(e)) why = 'TELEGRAM_CHAT_ID 格式不對，只要填數字。';
    else why = '其他原因，請把下面這行錯誤訊息給 Claude 看。';
    return txt('Telegram 發送失敗：' + why + '\n\nTelegram 回應：' + e + '\n（目前讀到的 Id：' + id.replace(/\d(?=\d{3})/g, '*') + '，token 長度：' + tok.length + '）');
  }
  if (url.pathname === '/health') {
    await refresh(env);
    return json({ ok: true, data: DATA.source, loadedAt: fmt(DATA.loaded), manuals: DATA.pool.length, faqs: DATA.faqPool.length, skipped: DATA.skipped, unsafe: DATA.unsafe });
  }
  if (url.pathname === '/test') {
    await refresh(env);
    const q = url.searchParams.get('q') || '';
    const d = decide(q);
    const out = d.kind === 'faq' ? faqText(d.f) : d.kind === 'doc' ? docText(d.d, d.f) : d.kind === 'human' ? '（轉人工：' + d.why + '）' : '（看不懂，會通知你）';
    return txt(out);
  }
  return txt('🐾 小黑貓 LINE 自動回覆伺服器運作中');
}
