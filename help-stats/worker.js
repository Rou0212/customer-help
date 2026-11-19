const origin = 'https://rou0212.github.io';
const cities = new Set('臺北市 新北市 基隆市 宜蘭縣 金門縣 連江縣 桃園市 新竹市 新竹縣 苗栗縣 臺中市 彰化縣 南投縣 雲林縣 嘉義市 嘉義縣 臺南市 高雄市 屏東縣 澎湖縣 花蓮縣 臺東縣'.split(' '));
const categories = new Set('硬體問題 健保申報 掛號・帳務 網路・VPN・上傳 電子病歷・表單 系統設定 Google日曆 牙科支付標準 分區管控指標 人工客服 未分類'.split(' '));

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname !== '/question') return new Response(null, { status: 404 });
    if (request.method !== 'POST' || request.headers.get('Origin') !== origin) {
      return new Response(null, { status: 403 });
    }
    const headers = { 'Access-Control-Allow-Origin': origin, Vary: 'Origin', 'Cache-Control': 'no-store' };
    if (!/^text\/plain(?:;|$)/i.test(request.headers.get('Content-Type') || '')) return new Response(null, {status:415,headers});
    const reader = request.body?.getReader();
    if (!reader) return new Response(null, {status:400,headers});
    const bytes = [];
    while (true) {
      const {done,value} = await reader.read();
      if (done) break;
      bytes.push(...value.subarray(0, 257));
      if (bytes.length > 256) {
        await reader.cancel();
        return new Response(null, {status:413,headers});
      }
    }
    let event;
    try { event = JSON.parse(new TextDecoder().decode(Uint8Array.from(bytes))); }
    catch { return new Response(null, { status:400,headers }); }
    if (!event || Object.keys(event).length !== 2 || !cities.has(event.city) || !categories.has(event.category)) {
      return new Response(null, {status:400,headers});
    }
    const day = new Date(Date.now() + 8 * 3600000).toISOString().slice(0,10);
    await env.STATS.prepare(
      'INSERT INTO question_counts (day, city, category) VALUES (?, ?, ?) ' +
      'ON CONFLICT(day, city, category) DO UPDATE SET count=count+1'
    ).bind(day,event.city,event.category).run();
    return new Response(null, {status:204,headers});
  }
};
