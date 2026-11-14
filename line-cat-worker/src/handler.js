// ===== 小黑貓 LINE 自動回覆（Cloudflare Worker）=====
// 需要的設定（Cloudflare → Worker → 設定 → 變數和祕密）：
//   LINE_CHANNEL_SECRET        LINE Messaging API 的 Channel secret（祕密）
//   LINE_CHANNEL_ACCESS_TOKEN  LINE Messaging API 的 Channel access token（祕密）
//   TELEGRAM_BOT_TOKEN         Telegram bot token（祕密）
//   TELEGRAM_CHAT_ID           接收通知的 Telegram chat id（你本人）
//   TELEGRAM_WEBHOOK_SECRET    自訂一串英數亂碼，保護 Telegram 連線（祕密）
//   LOG_AUTO_REPLIES           "true"：每次自動回覆也通知你一份（預設 true）
//   DEFAULT_SHIFT_HOURS        /值班開始 沒寫時數時的預設值（預設 9）
//   KV 命名空間綁定：CAT_KV
const SITE = 'https://rou0212.github.io/customer-help/';
const HUMAN_WORDS = ['真人', '客服', '人工', '專人', '打電話', '電話給我'];
const ALWAYS_HUMAN = ['調閱', '監視器', '錄音', '權限異動', '同意書', '報價', '合約', '收費', '費用', '退費', '開業', '抱怨', '投訴', '取消', '合併患者', '更換負責', '機構代碼'];

// ---------- 比對（跟網站上的小黑貓同一套資料）----------
const bigrams = s => { const r = new Set(); for (let i = 0; i < s.length - 1; i++) r.add(s.slice(i, i + 2)); return r; };
const pool = documents.filter(d => !d.region);
const prepared = pool.map(d => ({ d, toks: [...new Set(d.keywords.split(/\s+/).map(norm).filter(t => t.length >= 2))], title: norm(d.title), bg: bigrams(norm(d.title + d.description + d.steps.join(''))) }));
const faqPool = FAQS.map(f => ({ f, toks: [...new Set(f.tags.split(/\s+/).map(norm).filter(t => t.length >= 2))], title: norm(f.title), bg: bigrams(norm(f.title + (f.text || '') + (f.steps || []).join(''))) }));
function rankDocs(q) {
  const n = norm(q); if (!n) return [];
  const cm = n.match(/(^|[^a-z])([nvuedg])0?(\d{1,2})(?!\d)/);
  if (cm) { const code = cm[2].toUpperCase() + String(cm[3]).padStart(2, '0'); const d = pool.find(x => !x.parent && STATION[x.id] === code); if (d) return [{ d, score: 100 }]; }
  return prepared.map(p => {
    let s = 0;
    (INTENTS[p.d.id] || []).forEach(ph => { const k = norm(ph); if (n.includes(k)) s += (p.d.parent ? 20 : 10) + k.length; });
    p.toks.forEach(t => { if (n.includes(t)) s += Math.min(t.length, 6) * 1.5; });
    if (n.includes(p.title)) s += 15;
    if (/\d{4}/.test(n) && p.d.id === 'card-reader-errors') { const nums = n.match(/\d{4}/g); if (nums.some(x => p.d.keywords.includes(x))) s += 40; }
    if (n.length >= 2) { let o = 0; bigrams(n).forEach(b => { if (p.bg.has(b)) o++; }); s += o * 1.2; }
    if (p.d.parent) s -= 4;
    return { d: p.d, score: s };
  }).filter(r => r.score >= 8).sort((a, b) => b.score - a.score);
}
function rankFaqs(q) {
  const n = norm(q); if (!n) return [];
  return faqPool.map(p => {
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
  const rel = f.doc && pool.find(x => x.id === f.doc);
  if (rel) lines.push('', '📄 相關手冊：' + codeOf(rel) + ' ' + rel.title, SITE + '?doc=' + codeOf(rel));
  else lines.push('', '🔗 ' + SITE + '?faq=' + f.id);
  lines.push('', '還是不行？回覆「真人」，客服會接手。');
  return lines.join('\n');
}
function docText(d, f) {
  const code = d.parent ? d.id : codeOf(d);
  const lines = ['🐾 小黑貓自動回覆', '', '這份手冊應該能幫上忙：', '📄 ' + codeOf(d) + ' ' + d.title, d.description, SITE + '?doc=' + code + '&read=1'];
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
async function tg(env, method, payload) {
  const res = await fetch('https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + '/' + method, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) console.log('Telegram error', method, res.status, await res.text());
  return res.ok;
}
const notify = (env, text) => tg(env, 'sendMessage', { chat_id: env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true });

// ---------- 值班狀態（存在 KV）----------
async function getDuty(env) {
  const v = await env.CAT_KV.get('duty', 'json');
  if (!v || !v.on) return { on: false };
  if (v.until && Date.now() > v.until) return { on: false, expired: true };
  return v;
}
const fmt = ts => new Date(ts).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

async function handleTelegram(req, env) {
  if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.TELEGRAM_WEBHOOK_SECRET) return new Response('forbidden', { status: 403 });
  const u = await req.json();
  const m = u.message; if (!m || !m.text) return new Response('ok');
  if (String(m.chat.id) !== String(env.TELEGRAM_CHAT_ID)) return new Response('ok');
  const t = m.text.trim();
  if (/^\/?(值班開始|on|start_duty)/i.test(t)) {
    const h = parseFloat((t.match(/(\d+(\.\d+)?)/) || [])[1]) || parseFloat(env.DEFAULT_SHIFT_HOURS) || 9;
    const until = Date.now() + h * 3600e3;
    await env.CAT_KV.put('duty', JSON.stringify({ on: true, since: Date.now(), until }));
    await notify(env, '🐾 小黑貓開始值班，會自動回覆 LINE@ 訊息。\n預計到 ' + fmt(until) + ' 自動下班（或傳 /值班結束）。');
  } else if (/^\/?(值班結束|off|stop_duty)/i.test(t)) {
    await env.CAT_KV.put('duty', JSON.stringify({ on: false }));
    await notify(env, '🐾 小黑貓下班了，LINE@ 訊息交還給人工。');
  } else if (/^\/?(狀態|status)/i.test(t)) {
    const d = await getDuty(env);
    await notify(env, d.on ? '🐾 值班中，到 ' + fmt(d.until) + '。' : '😴 目前沒有值班。傳 /值班開始 讓小黑貓上班（可加時數，例如 /值班開始 4）。');
  } else {
    await notify(env, '指令：\n/值班開始（或 /值班開始 4 代表 4 小時）\n/值班結束\n/狀態');
  }
  return new Response('ok');
}

async function forwardImage(env, messageId, caption) {
  const r = await fetch('https://api-data.line.me/v2/bot/message/' + messageId + '/content', { headers: { Authorization: 'Bearer ' + env.LINE_CHANNEL_ACCESS_TOKEN } });
  if (!r.ok) return notify(env, caption + '\n（截圖下載失敗，請到 LINE 後台查看）');
  const fd = new FormData();
  fd.append('chat_id', String(env.TELEGRAM_CHAT_ID));
  fd.append('caption', caption.slice(0, 1000));
  fd.append('photo', new Blob([await r.arrayBuffer()], { type: r.headers.get('content-type') || 'image/jpeg' }), 'screenshot.jpg');
  const res = await fetch('https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + '/sendPhoto', { method: 'POST', body: fd });
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
  const text = msg.text.slice(0, 500), dec = decide(text);
  if (dec.kind === 'faq' || dec.kind === 'doc') {
    const messages = [{ type: 'text', text: dec.kind === 'faq' ? faqText(dec.f) : docText(dec.d, dec.f) }];
    if (dec.kind === 'faq' && dec.f.img) { const url = SITE + 'images/faq/' + dec.f.img + '.png'; messages.push({ type: 'image', originalContentUrl: url, previewImageUrl: url }); }
    await lineApi(env, 'message/reply', { replyToken: ev.replyToken, messages });
    if (log) { const name = await lineName(env, userId); await notify(env, '✅ 已自動回覆 ' + name + '\n問：' + text + '\n答：' + (dec.kind === 'faq' ? dec.f.title : codeOf(dec.d) + ' ' + dec.d.title) + '\n👉 ' + chatLink(dest, userId)); }
    return;
  }
  const name = await lineName(env, userId);
  if (dec.kind === 'human') await lineApi(env, 'message/reply', { replyToken: ev.replyToken, messages: [{ type: 'text', text: '好的，已經幫您通知客服，請稍候 🙏' }] });
  else await ackOnce(env, ev, '已收到您的訊息，客服會盡快回覆您 🙏\n也可以先到操作手冊找找看：' + SITE);
  await notify(env, (dec.kind === 'human' ? '🙋 需要你處理（' + dec.why + '）' : '❓ 小黑貓看不懂') + '\n客戶：' + name + '\n訊息：' + text + (dec.hint ? '\n（最接近：' + dec.hint + '）' : '') + '\n👉 ' + chatLink(dest, userId));
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
  if (req.method === 'POST' && url.pathname === '/line') return handleLine(req, env, ctx);
  if (req.method === 'POST' && url.pathname === '/telegram') return handleTelegram(req, env);
  if (url.pathname === '/setup') {
    if (url.searchParams.get('key') !== env.TELEGRAM_WEBHOOK_SECRET) return new Response('forbidden', { status: 403 });
    const ok = await tg(env, 'setWebhook', { url: url.origin + '/telegram', secret_token: env.TELEGRAM_WEBHOOK_SECRET, allowed_updates: ['message'] });
    if (ok) await notify(env, '🐾 小黑貓已連上 Telegram！傳 /狀態 試試看。');
    return new Response(ok ? '完成！請到 Telegram 看小黑貓的訊息。' : 'Telegram 設定失敗，請檢查 TELEGRAM_BOT_TOKEN。', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  if (url.pathname === '/test') {
    const q = url.searchParams.get('q') || '';
    const d = decide(q);
    const out = d.kind === 'faq' ? faqText(d.f) : d.kind === 'doc' ? docText(d.d, d.f) : d.kind === 'human' ? '（轉人工：' + d.why + '）' : '（看不懂，會通知你）';
    return new Response(out, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  return new Response('🐾 小黑貓 LINE 自動回覆伺服器運作中', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
