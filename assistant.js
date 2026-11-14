// 樂衍小黑貓：依文字或語音找出手冊並開啟。需先載入 manuals.js。
// 用法：LeyanCat.mount(元素, {mode:'page'|'fab', onOpen:function(doc,url){...}})
(function(){
const BASE=new URL('./',location.href).href;
const norm=s=>String(s).toLowerCase().replace(/[\s，。？！、,.?!:：;；「」『』（）()]/g,'').replace(/臺/g,'台').replace(/申復/g,'申覆').replace(/日曆/g,'行事曆').replace(/健保局/g,'健保署');
// 常見說法 → 手冊（客戶口語、錯字與同義詞補在這裡）
const INTENTS={
'nhi-claim':['申報','月申報','總表','線上確認','補正','欠卡','合理量','指標','點值'],
'nhi-review':['抽審','抽樣','送審','審查資料','電子審查'],
'nhi-appeal':['申覆','補件','專業審查','小綠人','申覆上傳'],
'nhi-dispute':['爭議','爭審','爭議審議'],
'tooth-correction':['牙位','牙位更正','拔牙更正','牙位錯','更正清單'],
'nhi-doctor-access':['授權','受僱醫師','新醫師vpn','醫師權限','vpn權限','新增醫師'],
'nhi-clinic-hours':['看診時段','門診時段','掛號費','連假','春節','快易通','長假'],
'nhi-lab-upload':['檢驗','檢查結果','每日上傳','xml'],
'nhi-image-upload':['影像上傳','x光上傳','醫療影像','每日影像'],
'emr-sign':['簽章','電子病歷','emr','加簽','簽病歷','醫事人員卡密碼'],
'emr-cloud-sign':['雲端簽章','雲端emr','emr加簽連結','hca元件','跨平台網頁元件'],
'perio-chart':['牙周','囊袋','牙菌斑','probing','牙周病歷'],
'card-reader-errors':['讀卡機','讀不到卡','卡讀不到','讀不到','讀卡','讀取失敗','無法讀卡','錯誤碼','錯誤代碼','卡片錯誤','ic卡錯誤','認證失敗','com埠','安全模組'],
'hca-unlock':['鎖卡','卡鎖住','鎖住','解卡','解鎖','pin','puk','密碼錯','密碼鎖','密碼輸入錯誤','錯誤太多次','輸錯太多','卡被鎖'],
'ic-card-incident-form':['停電','當機','網路斷','網路不通','報備','異常報備','無法上傳就醫'],
'edge-ie-mode':['edge','ie模式','相容性','無法夾帶','夾帶','附件上傳','上傳失敗','瀏覽器','選擇檔案'],
'google-members':['共用','新進醫師','醫師離職','加入行事曆','刪除醫師','行事曆權限'],
'google-sync':['看不到約診','手機看不到','同步','手機行事曆','行事曆app','接受邀請','邀請信']};
const pool=documents.filter(d=>!d.region);
const codeOf=d=>STATION[d.parent||d.id]||'';
const lineOf=d=>LINES[(d.parent?documents.find(x=>x.id===d.parent):d).category]||{color:'#15191E'};
const bigrams=s=>{const r=new Set();for(let i=0;i<s.length-1;i++)r.add(s.slice(i,i+2));return r};
const prepared=pool.map(d=>({d,toks:[...new Set(d.keywords.split(/\s+/).map(norm).filter(t=>t.length>=2))],title:norm(d.title),bg:bigrams(norm(d.title+d.description+d.steps.join('')))}));
function rank(q){const n=norm(q);if(!n)return [];
 const cm=n.match(/(^|[^a-z])([nvuedg])0?(\d{1,2})(?!\d)/);if(cm){const code=cm[2].toUpperCase()+String(cm[3]).padStart(2,'0');const d=pool.find(x=>!x.parent&&STATION[x.id]===code);if(d)return [{d,score:100}]}
 return prepared.map(p=>{let s=0;
  (INTENTS[p.d.id]||[]).forEach(ph=>{const k=norm(ph);if(n.includes(k))s+=(p.d.parent?20:10)+k.length});
  p.toks.forEach(t=>{if(n.includes(t))s+=Math.min(t.length,6)*1.5});
  if(n.includes(p.title))s+=15;
  if(/\d{4}/.test(n)&&p.d.id==='card-reader-errors'){const nums=n.match(/\d{4}/g);if(nums.some(x=>p.d.keywords.includes(x)))s+=40}
  if(n.length>=2){let o=0;bigrams(n).forEach(b=>{if(p.bg.has(b))o++});s+=o*1.2}
  if(p.d.parent)s-=4;
  return {d:p.d,score:s}}).filter(r=>r.score>=8).sort((a,b)=>b.score-a.score)}
const urlOf=d=>BASE+'?doc='+encodeURIComponent(d.parent?d.id:codeOf(d))+'&read=1';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CAT='<svg class="lc-cat" viewBox="0 0 120 120" aria-hidden="true"><g class="lc-tail"><path d="M84 96c18-2 26-14 22-30-2-8-9-10-12-5" fill="none" stroke="#15191E" stroke-width="9" stroke-linecap="round"/></g><ellipse cx="58" cy="88" rx="30" ry="24" fill="#15191E"/><path d="M30 44 34 18 50 34zM86 44 82 18 66 34z" fill="#15191E"/><path d="M35 38 37 26 45 34zM81 38 79 26 71 34z" fill="#E8A0A8"/><circle cx="58" cy="52" r="28" fill="#15191E"/><g class="lc-eyes"><ellipse cx="47" cy="52" rx="6.5" ry="7.5" fill="#F6C945"/><ellipse cx="69" cy="52" rx="6.5" ry="7.5" fill="#F6C945"/><ellipse cx="47" cy="53" rx="2.2" ry="5" fill="#15191E"/><ellipse cx="69" cy="53" rx="2.2" ry="5" fill="#15191E"/></g><path d="M55 63h6l-3 3z" fill="#E8A0A8"/><path d="M40 64 26 62M40 68 27 70M76 64l14-2M76 68l13 2" stroke="#8A9199" stroke-width="1.6" stroke-linecap="round"/></svg>';
const QUICK=['讀卡機跳錯誤碼','卡片鎖住了','手機看不到約診','上傳無法夾帶檔案','健保申報'];
function mount(root,opt){opt=opt||{};const mode=opt.mode||'page';
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 root.classList.add('lc-root','lc-mode-'+mode);
 root.innerHTML=(mode==='fab'?'<button type="button" class="lc-fab" aria-expanded="false" aria-controls="lc-panel" aria-label="開啟小黑貓助手">'+CAT+'<span class="lc-fab-tip" aria-hidden="true">需要幫忙嗎？</span></button>':'')+
 '<section class="lc-panel" id="lc-panel" aria-label="小黑貓助手"'+(mode==='fab'?' hidden':'')+'>'+
 '<div class="lc-head">'+(mode==='page'?CAT:'')+'<div class="lc-bubble"><strong>喵～有什麼需要幫忙嗎？</strong><span>直接說或打字，例如「讀卡機跳 4029」、「看不到約診」。</span></div>'+(mode==='fab'?'<button type="button" class="lc-close" aria-label="關閉助手">✕</button>':'')+'</div>'+
 '<div class="lc-log" role="log" aria-live="polite"></div>'+
 '<div class="lc-quick">'+QUICK.map(q=>'<button type="button" data-q="'+esc(q)+'">'+esc(q)+'</button>').join('')+'</div>'+
 '<form class="lc-form"><label class="lc-sr" for="lc-input-'+mode+'">輸入你的問題</label><input id="lc-input-'+mode+'" class="lc-input" autocomplete="off" enterkeyhint="send" placeholder="輸入問題或站號…">'+
 (SR?'<button type="button" class="lc-mic" aria-label="用語音說"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button>':'')+
 '<button type="submit" class="lc-send">送出</button></form></section>';
 const $=s=>root.querySelector(s),log=$('.lc-log'),input=$('.lc-input'),panel=$('.lc-panel');
 function say(html,who){const el=document.createElement('div');el.className='lc-msg lc-'+(who||'bot');el.innerHTML=html;log.appendChild(el);log.scrollTop=log.scrollHeight;return el}
 function open(d){const url=urlOf(d);if(opt.onOpen){opt.onOpen(d,url);return true}const w=window.open(url,'leyan-manual');if(w){try{w.focus()}catch{}return true}return false}
 function card(d){const l=lineOf(d);return '<a class="lc-doc" href="'+urlOf(d)+'" target="leyan-manual" data-id="'+d.id+'"><span class="lc-code" style="background:'+l.color+'">'+codeOf(d)+'</span><span><b>'+esc(d.title)+'</b><small>'+esc(d.description)+'</small></span></a>'}
 function ask(q){q=q.trim();if(!q)return;say(esc(q),'user');input.value='';const r=rank(q);
  if(!r.length){say('喵…我找不到相關的手冊。可以換個說法，或直接<a href="tel:0422518815,9">撥客服 04-2251-8815 分機 9</a>。');return}
  const top=r[0].d,alts=r.slice(1,3).filter(x=>x.score>=r[0].score*0.6).map(x=>x.d);
  const m=say('找到了！幫你打開 <b>'+codeOf(top)+' '+esc(top.title)+'</b>'+card(top)+(alts.length?'<p class="lc-alt">不是這份？也可能是：</p>'+alts.map(card).join(''):''));
  setTimeout(()=>{if(!open(top))m.insertAdjacentHTML('beforeend','<p class="lc-alt">瀏覽器擋住了自動開啟，請點上面的手冊。</p>')},700)}
 root.addEventListener('click',e=>{const a=e.target.closest('.lc-doc');if(a&&opt.onOpen){e.preventDefault();const d=pool.find(x=>x.id===a.dataset.id);if(d)open(d);return}const q=e.target.closest('[data-q]');if(q)ask(q.dataset.q)});
 $('.lc-form').onsubmit=e=>{e.preventDefault();ask(input.value)};
 if(mode==='fab'){const fab=$('.lc-fab');const toggle=on=>{panel.hidden=!on;fab.setAttribute('aria-expanded',on);root.classList.toggle('lc-open',on);if(on)input.focus();else fab.focus()};fab.onclick=()=>toggle(panel.hidden);$('.lc-close').onclick=()=>toggle(false);root.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)toggle(false)});root.close=()=>{if(!panel.hidden)toggle(false)}}
 if(SR){const mic=$('.lc-mic');let rec=null;mic.onclick=()=>{if(rec){rec.stop();return}rec=new SR();rec.lang='zh-TW';rec.interimResults=true;rec.maxAlternatives=1;let final='';mic.classList.add('on');mic.setAttribute('aria-label','停止語音');input.placeholder='請說話…';
  rec.onresult=ev=>{let t='';for(const r of ev.results){t+=r[0].transcript;if(r.isFinal)final=t}input.value=t};
  rec.onerror=ev=>{if(ev.error==='not-allowed')say('需要允許麥克風權限才能用語音喔。也可以直接打字。')};
  rec.onend=()=>{mic.classList.remove('on');mic.setAttribute('aria-label','用語音說');input.placeholder='輸入問題或站號…';rec=null;if((final||input.value).trim())ask(final||input.value)};
  try{rec.start()}catch{rec=null;mic.classList.remove('on')}}}
 return root}
window.LeyanCat={mount,rank};
})();
