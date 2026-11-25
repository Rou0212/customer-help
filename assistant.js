// 樂衍小黑貓：依文字或語音提出候選問題，使用者確認後才顯示答案或手冊。需先載入 manuals.js。
// 用法：LeyanCat.mount(元素, {mode:'page'|'fab', onOpen:function(doc,url){...}})
(function(){
const BASE=new URL('./',location.href).href;
const norm=s=>String(s).toLowerCase().replace(/[\s，。？！、,.?!:：;；「」『』（）()]/g,'').replace(/臺/g,'台').replace(/申復|申複/g,'申覆').replace(/日曆/g,'行事曆').replace(/健保局/g,'健保署').replace(/^不是(?:報價|查帳|讀卡機|藥品)(?:而是|是|我要|要)?/,'');
// 一般看帳查帳先確認院所；特定押金、帳號等主題不走日結分流。
function isAccountLookup(q){const n=norm(q);if(/押金|欠卡|退費|預付|儲值|點數|補報|申報|抽審|收據|帳號|密碼|帳密/.test(n))return false;return /(?:當天|當日|今天|今日|每天|每日).{0,8}帳|對帳|日結|下診.{0,8}帳|日報表.{0,3}實收|(?:看|查)(?:到|詢)?(?:一下)?(?:現金)?帳|帳.{0,8}(?:看|查)|帳(?:務|本)?(?:在哪|在那|哪邊|哪裡|那邊|那裡)|^現金帳$/.test(n);}
// 上傳失敗不等於擷取不到照片；只有明確情境才直接提出該分支候選。
function imageUploadRoute(q){const n=norm(q),pano=n.includes('pano');
 if(pano&&/finding|病歷.*(?:帶入|帶出)/.test(n))return {type:'topics',faqs:['batch-50'],docs:['nhi-image-upload']};
 if(!pano&&(/ai|finding|抽審|申覆|夾帶/.test(n)||!/(?:x光|醫療影像|每日影像|每日照片|影像)/.test(n)||!/上傳|擷取|傳輸|傳不上|傳不出/.test(n)))return null;
 const missing=/沒有照片|沒照片|無照片|照片.*(?:找不到|擷取不到|擷取不出|抓不到)|(?:擷取|抓|找)不到.*(?:照片|影像)|擷取不到照片/.test(n);
 const transmission=/有照片|已(?:有|擷取|抓到)|擷取(?:成功|正常)|傳輸失敗|傳輸錯誤/.test(n.replace(/沒有照片/g,''));
 if(missing&&transmission)return {type:'image-upload'};
 if(missing)return {type:'topics',faqs:['image-no-photo'],docs:['nhi-image-upload']};
 if(transmission)return {type:'topics',faqs:['clear-eii'],docs:['nhi-image-upload']};
 if(pano||/失敗|傳不上|傳不出|不能|無法|不成功/.test(n))return {type:'image-upload'};
 return null;
}
// 優先判斷詢問對象與缺失情境；不從歷史對話或主題欄補錯誤碼。
function routeQuestion(q){const n=norm(q);const xrayOpen=/(?:x光|ｘ光|x射線|pano)/.test(n)&&/打不開|開不了|開不起來|不能(?:開|打開|用|使用)|無法(?:開|打開|使用)|開啟失敗/.test(n);
 if(xrayOpen&&!/上傳|傳輸|擷取|finding/.test(n))return {type:'xray-open'};
 const appealText=n.normalize('NFKC');
 if(/(?:^|[^a-z0-9])e201(?![0-9])|附件資料未送達/.test(appealText))return {type:'appeal-e201'};
 // The database filename survives common OCR mistakes such as E1I and 資畔庫.
 const eiiWarning=/(?:小綠人|共[同通]傳輸平台|nhi[_-]?e[i1l]{2}mdb)/.test(n);
 const eiiSpace=/(?:空間|容量).{0,12}(?:不足|不夠|不夠用|滿|不到10m|剩下?不到10m)|(?:滿了|滿ㄌ)/.test(n);
 if(eiiWarning&&eiiSpace)return {type:'topics',faqs:['clear-eii'],docs:[]};
 const imageRoute=imageUploadRoute(q);if(imageRoute)return imageRoute;
 // A delayed result after submission is not a transfer failure.
 const reviewUpload=/(?:抽審|申報)/.test(n)&&/(?:上傳|傳了|傳很久|傳完|送出|送件)/.test(n);
 const delayedResult=/排隊|等(?:了)?很久|(?:上?傳|等)(?:了)?(?:很久|[0-9０-９一二三四五六七八九十]+(?:分鐘|小時))|查不到|還沒(?:好|結果|完成)|沒有結果|沒結果|未出結果/.test(n);
 if(reviewUpload&&delayedResult&&!/上傳失敗|送出失敗|無法上傳|不能上傳|傳不上|傳不出|錯誤|錯誤碼|擷取|電子簽章|x光|ｘ光|pano/.test(n)){
  return {type:'topics',faqs:['vpn-queue'],docs:[]};
 }
 // 匯出位置必須先確認系統與動作對象，不以泛圖片字詞連到影像上傳或牙周表。
 const imageObject=/圖片|照片|圖檔|影像/.test(n), exportAction=/匯出|導出|下載/.test(n), locationAsk=/存|儲|位置|哪|去/.test(n);
 if(n.includes('樂易秀')&&imageObject&&(exportAction||locationAsk))return {type:'topics',faqs:['leyshow-image-export'],docs:[]};
 if(!/樂易秀|牙周|上傳|健保|申報/.test(n)&&imageObject&&(exportAction||locationAsk))return {type:'clarify',message:'請問是哪一個系統的圖片（例如樂易秀），以及是匯出、下載還是上傳？確認系統與操作後才能提供對應位置。'};

 // General reasonable-volume questions use the approved software FAQ; explicit regional indicators retain their document route.
 if(/合理量|合理門診點數/.test(n)&&!/指標|管控|免審|快速通關|規範|官方|分區/.test(n))return {type:'topics',faqs:['reasonable-volume-adjustment'],docs:[]};
 if(rejectedCandidates(q))return {type:'clarify',message:'請補充您真正要處理的功能、操作步驟或完整錯誤碼；不會沿用剛才的候選。'};
 if(/其他訊息|不是簡訊/.test(n)||(!/簡訊/.test(n)&&/不能發訊息|訊息.*(?:不能發|發不出)/.test(n)))return {type:'clarify',message:'請問是簡訊，還是其他功能的訊息？若不是簡訊，請補充功能名稱與完整畫面訊息（請勿提供個資），不直接套用簡訊處理方式。'};
 if(/帳密忘記|帳號.*(?:哪|忘)|查詢帳號密碼|帳號密碼忘/.test(n))return {type:'clarify',message:'請問是哪一個系統的帳號（看診系統、樂易智、Google 或健保 VPN）？請勿輸入密碼或驗證碼；確認系統後才能判斷對應主題。'};
 if(/掛號費/.test(n)&&/調整|改/.test(n))return {type:'topics',faqs:['batch-38'],docs:[]};
 if(/報價|合約|簽約|續約/.test(n)||(!/醫療費用|申報費用|日結費用|收據|掛號費|診察費|部分負擔/.test(n)&&/系統.{0,12}(?:價格|價錢|多少錢|收費|費用)|(?:價格|價錢|多少錢|收費|費用).{0,12}系統|^(?:請問)?(?:價格|價錢|多少錢|收費|費用)(?:是多少|多少|怎麼算|嗎)?$/.test(n)))return {type:'human'};
 if(/(?:現在|目前|大家).*(?:雲端|健保系統).*(?:異常|問題|不能|無法)|(?:雲端|健保系統).*(?:目前|現在).*(?:異常|問題)/.test(n))return {type:'human',message:'目前沒有可核對的即時服務狀態，請由官方人工客服確認；不能以過往異常紀錄判定現在的狀態。'};
 if(/申覆/.test(n)&&/錯誤|失敗|有問題|出問題|異常|不成功|傳不上|傳不出|不能上傳|無法上傳|壓縮檔/.test(n)){
  if(/e300/.test(appealText))return {type:'topics',faqs:['e300'],docs:[]};
  if(/e465|壓縮檔/.test(appealText))return {type:'topics',faqs:['e465'],docs:[]};
  return {type:'appeal-error'};
 }
 const missing=/這個|這裡|這邊|這兩個/.test(n)&&/跳出|出現|問題|代碼|重設|讀卡機|ic上傳|檢核/.test(n)&&!/(?:[a-z]?\d{4}|不屬於同一人)/i.test(n);
 if(missing||/怎麼不能寫卡|不能寫卡怎麼|上傳檢核.*錯誤|等了.*分鐘.*上傳/.test(n))return {type:'clarify',message:'請先補充發生問題的功能／操作步驟，以及畫面上的完整錯誤碼或訊息文字（請勿提供患者個資）。若是上傳，請說明是 IC 就醫資料、X 光影像、申報或電子簽章；目前資訊不足，不能直接判定原因。'};
 // Editing a past appointment is distinct from asking why an appointment disappeared.
 if(/預約|約診/.test(n)&&/超過|過了|已過|過期|昨天|已到及刪除/.test(n)&&/更改|修改|編輯|改內容|改時間|調整|改期|改資料/.test(n)){
  return {type:'topics',faqs:['batch-48'],docs:[]};
 }
 if((/自費/.test(n)&&/開藥|開.*藥|領藥|處方|藥單|列印.*藥/.test(n)||/院內開藥/.test(n))&&!/新增藥品|建藥品|藥品新增/.test(n))return {type:'topics',faqs:['self-pay-prescription-print'],docs:[]};
 if(/退押金.*(?:日結|現金帳)|後台.*幫忙修改|護照.*新增患者|初診表單.*簽名區|(?:p7101|p7102).*帶入.*icd|抽審.*icd.*修改|維護.*(?:正常使用|看診)|員工打卡.*忘記|自費藥單|塗氟.*時間未到|昨天.*預約.*病人|預約.*昨天|同個人.*整合|新增殘根/.test(n))return {type:'human'};
 if(/格式不符/.test(n)&&!/電子簽章|電子病歷|收據/.test(n))return {type:'clarify',message:'請問「格式不符」出現在哪個功能（電子簽章、申報、收據或其他上傳）？請提供完整畫面訊息文字，不含患者個資，才能確認對應主題。'};
 // Refill with a missing diagnosis code is 9127, not the ICD9/ICD10 mapping workflow.
 if(/補卡/.test(n)&&/icd(?:[-－]?10)?|傷病碼|診斷碼/.test(n)&&/未填|沒填|沒有填|漏填|未輸入|沒輸入|空白/.test(n)&&!/對照|轉換/.test(n)){
  return {type:'topics',faqs:['9127'],docs:[]};
 }
 // 福保身分詢問與補卡後的收退費問題分開。
 if(/^(?:(?:請問|想問))?(?:福保|健保卡福字|福字)(?:是|釋|是不是|算|代表)?低收(?:入戶)?(?:嗎|嘛)?$/.test(n)){
  return {type:'topics',faqs:['copay-exemption-eligibility'],docs:[]};
 }
 // Creating a clinic user is distinct from granting VPN access or editing existing rights.
 const newUserAction=/新增|新建|建立|加開|開通|開(?:一個|個)?帳(?:號|戶)|加入|加一個/;
 const clinicRole=/醫師|醫生|護理師|護士|助理|員工|人員|櫃[檯台]|使用者|同仁/;
 const explicitExternal=/vpn|google|gmail|line@|健保署|醫事卡|hca|健保網路服務/i;
 const accountCreation=newUserAction.test(n)&&/帳[號戶]|使用者/.test(n);
 const roleCreation=/新增|新建|建立|加一個/.test(n)&&clinicRole.test(n)
  &&!/簽名|簽章|權限|排班|班表|約診|掛號|病歷|處置|專科|報表|群組|追蹤/.test(n);
 if(!explicitExternal.test(n)&&(accountCreation||roleCreation)){
  return {type:'topics',faqs:['leyizhi-user-list'],docs:[]};
 }
 if(/(?:^|[^a-z0-9])1082(?![a-z0-9])|(?:寫卡|病歷寫入).*undefinedindexaction/.test(n.normalize('NFKC')))return {type:'topics',faqs:['1082'],docs:[]};
 if(/初診(?:表單|問卷)/.test(n)&&/修改|更改|變更|編輯|調整|改內容|設定|新增.{0,8}(?:題|欄位)/.test(n)&&!/客源|顧客來源|撈取|解鎖|鎖住|簽名|裁切|患者.*已填|已填.*患者/.test(n)){
  return {type:'topics',faqs:['initial-form-settings'],docs:[]};
 }
 if(/身[分份]證|身[分份]字號|證號/.test(n)&&(/更換|更正|修改|變更|調整|改|換/.test(n))&&!/欠卡|補卡|寫卡|5020|新辦|補發|戶政/.test(n)&&(/患者|病患|病人|字號|證號|系統/.test(n)||/如何|怎麼/.test(n))){
  return {type:'topics',faqs:['patient-id-edit'],docs:[]};
 }
 const missingAction='打不出|找不到|查不到|沒有|不見|無法打出|缺少';
 const procedureTarget='(?:牙科)?處置(?:代碼|碼)?|醫令(?:代碼|碼)?|健保代碼|[0-9]{5}[a-z]?(?![a-z0-9])';
 const missingProcedure=new RegExp('(?:'+missingAction+')(?:這個|該筆|這筆)?(?:'+procedureTarget+')|(?:'+procedureTarget+')(?:一直|都|也)?(?:'+missingAction+')(?:了|嗎|怎麼辦|如何處理)?$').test(n.normalize('NFKC'));
 if((missingProcedure||/新增(?:牙科)?處置/.test(n))&&!/支付標準|給付|點數|申報|資格|選單|權限|錯誤碼/.test(n)){
  return {type:'topics',faqs:['ley-procedure-add'],docs:[]};
 }
 // Separate repeat-restoration intervals from unrelated claim workflows.
 if(/補牙|填補|充填|重補率|乳牙|恆牙|恒牙/.test(n)&&/再報|再申報|重複申報|重新申報|多久|一年|兩年|重補率/.test(n)&&!/窩溝|封填|根管|拔牙|洗牙|塗氟|[0-9０-９]{5}/.test(n)){
  return {type:'topics',faqs:['od-rate'],docs:[]};
 }
 if(/診[斷断]證明|certificateofdiagnosis/.test(n)&&/英文|英語|雙語|中英|english/.test(n))return {type:'topics',faqs:['diagnosis-certificate-bilingual'],docs:[]};
 const routes=[
 [/(?:(?:免(?:收|除)?(?:健保)?部分負擔|部分負擔.*免(?:收|除)?).*(?:哪些|什麼|誰|身分|身份|對象|資格|榮|福)|(?:哪些|什麼|誰|身分|身份|對象|資格|榮福).*(?:免(?:收|除)?(?:健保)?部分負擔|部分負擔.*免(?:收|除)?)|^免(?:收|除)?(?:健保)?部分負擔$|^榮福(?:身分|身份)?$)/,['copay-exemption-eligibility'],[]],
 [/(?:合理量|合理門診點數).*(?:是什麼|調升|調降|調整|怎麼用)|(?:調升|調降).*(?:合理量|診察碼)/,['reasonable-volume-adjustment'],[]],
 [/(?:轉診單|轉診院所|建議轉診).*(?:查不到|找不到|沒看到|沒有院所)/,['referral-clinic-not-found'],[]],
 [/(?:(?:中華電信|電信|網路).*(?:維修|故障|不通|異常|斷).*(?:掛號)|(?:掛號).*(?:電信|網路).*(?:維修|故障|不通|異常|斷))/,['telecom-outage-registration'],[]],
 [/(?:(?:換|更換|變更).*(?:身分證|身份證|證號).*(?:補卡|欠卡)|(?:補卡|欠卡).*(?:換|更換|變更).*(?:身分證|身份證|證號))/,['id-change-refill-card'],[]],
 [/(?:(?:姓名|名字|特殊字|生僻字|罕用字).*(?:問號|打不出|無法打)|(?:問號).*(?:姓名|名字))/,['patient-name-question-mark'],[]],
 [/(?:(?:他院|外院|別家|其他院所|其他診所).*(?:處置|申報|警告|警示|黃框)|(?:處置|警告|警示|黃框).*(?:他院|外院|別家|其他院所|其他診所))/,['other-clinic-procedure-warning'],[]],
 [/列表機|印表機.*連不上/,['printer'],[]],
 [/讀取.*ic醫令.*沒有.*就醫紀錄/i,['ic-vs-cloud'],[]],
 [/(?=.*(?:ic(?:卡|醫令)?|健保卡))(?=.*雲端(?:的)?(?:牙科|藥歷|醫令))(?=.*(?:讀|紀錄|看|差異|不一樣|不同))/,['ic-vs-cloud'],[]],
 [/抽審.*p3601.*自評表/i,['batch-18'],[]],
 [/多生牙.*牙位/,['batch-25'],['tooth-correction']],
 [/不屬於同一人/,['batch-08'],[]],
 [/手動.*標誌雲|標誌雲.*出現/,['cloud-icon'],[]],
 [/不能發訊息|訊息.*(?:不能發|發不出)/,['batch-49'],[]],
 [/申覆.*錯誤壓縮檔/,[],['nhi-appeal']],
 [/(?:半年|六個月|6個月).*沒.*洗牙/,['scaling-followup-list'],[]],

 [/監視器.*(?:調|畫面)|調.*監視器/,['m061'],[]],
 [/停電.*(?:注意|系統|電腦)/,['power-outage'],[]],
 [/同意書.*(?:預設|保固).*(?:改|一年)/,['batch-31','consent-backend'],[]],
 [/讀不到健保卡|健保卡讀不到/,[],['card-reader-errors']],
 [/(?:新增|增加).*約診.*窩溝|約診窩溝.*新增/,['ley-phrases'],[]]
 ];
 for(const [re,faqs,docs] of routes)if(re.test(n))return {type:'topics',faqs,docs};
 return null;
}
// 常見說法 → 手冊（客戶口語、錯字與同義詞補在這裡）
const INTENTS={
'nhi-claim':['申報','月申報','總表','線上確認','補正','欠卡','點值'],
'nhi-review':['抽審','抽樣','送審','審查資料','電子審查'],
'nhi-appeal':['申覆','補件','專業審查','小綠人','申覆上傳'],
'nhi-dispute':['爭議','爭審','爭議審議'],
'tooth-correction':['牙位','牙位更正','拔牙更正','牙位錯','更正清單'],
'nhi-dentist-handbook-2026':['醫令代碼','牙科支付標準','支付標準表','牙醫支付標準','給付項目','牙結石清除','牙結石','氟化物治療','特定疾病病人牙科就醫安全','高風險疾病口腔照護','91003C','91004C','91090C','P3601C','P7302C'],
'nhi-doctor-access':['授權','受僱醫師','新醫師vpn','醫師權限','vpn權限','新增醫師'],
'nhi-clinic-hours':['看診時段','門診時段','掛號費','連假','春節','快易通','長假'],
'nhi-lab-upload':['檢驗','檢查結果','每日上傳','xml'],
'nhi-image-upload':['影像上傳','x光上傳','醫療影像','每日影像'],
'emr-sign':['拋轉','簽章','電子病歷','emr','加簽','簽病歷','醫事人員卡密碼'],
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
const bigrams=s=>{const r=new Set();for(let i=0;i<s.length-1;i++)r.add(s.slice(i,i+2));return r};
const FQ=(typeof FAQS!=='undefined')?FAQS.concat(typeof FUNCTION_INDEX!=='undefined'?FUNCTION_INDEX:[]):[],FG=(typeof FAQ_GROUPS!=='undefined')?FAQ_GROUPS:[];
const faqPool=FQ.map(f=>({f,toks:[...new Set(f.tags.split(/\s+/).map(norm).filter(t=>t.length>=2))],title:norm(f.title),bg:bigrams(norm(f.title+(f.text||'')+(f.steps||[]).join('')))}));
// 語音常把「上傳」辨識為「上船」；只在同意書情境校正，避免誤改其他查詢。
function faqQuery(q){
 const n=norm(q);
 if(!n.includes('同意書'))return n;
 const corrected=n.replace(/上船/g,'上傳');
 // 辨識「同意書怎麼上傳」等倒裝問法，同時保留原本的搜尋字詞。
 return corrected.includes('上傳')&&!corrected.includes('上傳同意書')
  ? corrected+' 上傳同意書'
  : corrected;
}
// 通用動作／錯誤詞不是主題證據，不能單靠「找不到、異常、調整」把不同領域接起來。
const topicCore=s=>norm(s).replace(/如何|怎麼|怎樣|可以|請問|我要|要怎|怎辦|怎看|什麼|意思|代表|哪些|哪裡|在哪|多少|有沒有|怎麼辦|嗎|的|了|找不到|沒反應|看不到|沒有|無法|失敗|異常|錯誤|調整|修改|新增|設定|查詢|顯示|操作|完成|進行|需要|出現|資料/g,'');
const faqTopicEvidence=(n,p)=>p.toks.some(t=>topicCore(t).length>=2&&n.includes(t))||[...bigrams(topicCore(n))].some(b=>topicCore(p.title).includes(b));
function rankFaq(q){const route=routeQuestion(q);if(route)return route.type==='topics'?faqPool.filter(p=>route.faqs.includes(p.f.id)).map(p=>({f:p.f,score:100})):[];const n=faqQuery(q).replace(/如何|怎麼|怎樣|可以|請問|我要|要怎|嗎/g,'');if(!n)return [];if(/讀卡機/.test(n)&&/代碼|錯誤碼/.test(n)&&!/[0-9]{4}/.test(n))return [];return faqPool.map(p=>{let s=0;
 if(!faqTopicEvidence(n,p))return {f:p.f,score:0};
 if(p.f.excludeAny?.some(t=>n.includes(norm(t))))return {f:p.f,score:0};
 if(p.f.matchAny){if(!p.f.matchAny.some(t=>n.includes(norm(t))))return {f:p.f,score:0};s+=30;}
 const required={'copay-exemption-eligibility':/部分負擔|榮福/,'reasonable-volume-adjustment':/合理量|合理門診點數/,'referral-clinic-not-found':/轉診/,'telecom-outage-registration':/中華電信|電信|網路/,'id-change-refill-card':/身分證|身份證|證號/,'patient-name-question-mark':/姓名|名字|特殊字|生僻字|罕用字/,'other-clinic-procedure-warning':/(?:他院|外院|別家|其他院所|其他診所)/,'diag-fee':/診察碼|診察費/,'batch-36':/打不開|api|無法開啟|主機/i,'user-pw':/密碼/,'progress-1-7':/進度/,'receipt-stamp-image':/收據|總繳章|戳章|印花稅.*章/,'supplement-claim-upload':/補報/,'supplement-review-upload':/補報/,'consent-signature-missing':/簽名|png/i};
 if(required[p.f.id]&&!required[p.f.id].test(n))return {f:p.f,score:0};
 if(p.f.id==='progress-1-7'&&/申報|補報|抽審|上傳|簽章/.test(n)&&!/樂晴|掛號|寫卡/.test(n))return {f:p.f,score:0};
 if(p.f.id==='supplement-review-upload'&&!/抽審|送審/.test(n))return {f:p.f,score:0};
 if(p.f.id==='e300'&&/補報/.test(n)&&!/e300/i.test(n))return {f:p.f,score:0};
if(p.f.kind&&typeof functionMatches!=='undefined'&&!functionMatches(n,p.f))return {f:p.f,score:0};p.toks.forEach(t=>{if(n.includes(t))s+=/^\d{4}$/.test(t)?55:Math.min(t.length,6)*3});if(n.includes(p.title))s+=15;let o=0;bigrams(n).forEach(b=>{if(p.bg.has(b))o++});s+=o;
 if(p.f.kind&&functionMatches(n,p.f))s+=80;
 if(p.f.id==='registration-time'&&/掛號.*時間|結束時間/.test(n))s+=150;
 if(p.f.permission&&/不見|沒有|看不到|權限|不能|只能/.test(n))s+=60;
 // Short directory terms are valid candidates; title overlap outranks incidental answer text.
 const titleHits=[...bigrams(n)].filter(b=>p.title.includes(b)).length;
 s+=titleHits*4;
 if(n.length>=2&&p.title.includes(n))s+=15;
 if(/押金.*收據/.test(n)&&/押金收據/.test(p.title))s+=50;
 if(/抽審/.test(n)&&/牙位/.test(n)&&/抽審/.test(p.title)&&/牙位/.test(p.title))s+=80;
 if(/手機/.test(n)&&!/手機/.test(p.title))s-=20;
 return {f:p.f,score:s}}).filter(r=>r.score>=10).sort((a,b)=>b.score-a.score).filter((r,i,all)=>r.score>=all[0].score*0.6)}
// ---- 看圖：在瀏覽器內用 Tesseract.js 辨識截圖文字（圖片不會上傳）----
const KNOWN_CODES=new Set();FQ.forEach(f=>f.tags.split(/\s+/).forEach(t=>{if(/^\d{4}$/.test(t))KNOWN_CODES.add(t)}));pool.forEach(d=>(d.keywords.match(/\b\d{4}\b/g)||[]).forEach(c=>KNOWN_CODES.add(c)));
function analyzeScreen(raw){const t=norm(raw.replace(/[OoＯ](?=\d{3})/g,'0'));const codes=[...new Set((t.match(/\d{4}/g)||[]).filter(c=>KNOWN_CODES.has(c)))];
 const lc=(t.match(/e\d{3}|d11|aa(?![a-z])/g)||[]);
 const faqs=faqPool.map(p=>{let s=0;p.toks.forEach(k=>{if(/^\d{4}$/.test(k)){if(codes.includes(k))s+=60}else if(lc.includes(k))s+=40;else if(k.length>=3&&t.includes(k))s+=k.length*2});return {f:p.f,score:s}}).filter(r=>r.score>=8).sort((a,b)=>b.score-a.score);
 let doc=null;if(codes.length&&!faqs.some(r=>r.score>=60)){doc=pool.find(d=>d.id==='card-reader-errors'&&codes.some(c=>d.keywords.includes(c)))||null}
 const lines=raw.split(/\n+/).map(x=>x.trim().replace(/([\u3000-\u303f\u4e00-\u9fff\uff00-\uffef])\s+(?=[\u3000-\u303f\u4e00-\u9fff\uff00-\uffef])/g,'$1')).filter(x=>x&&(codes.some(c=>x.includes(c))||/錯誤|找不到|失敗|無法|不正確|請先|無卡號/.test(x))).slice(0,3);
 return {codes,faqs:faqs.slice(0,2),doc,lines}}
let ocrLib=null;
function loadOcr(){if(ocrLib)return ocrLib;ocrLib=new Promise((res,rej)=>{if(window.Tesseract)return res(window.Tesseract);const sc=document.createElement('script');sc.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';sc.onload=()=>res(window.Tesseract);sc.onerror=()=>{ocrLib=null;rej(new Error('load'))};document.head.appendChild(sc)});return ocrLib}
let ocrWorker=null;
// OCR 常把 5 讀成 S、0 讀成 O：在 4 位數錯誤碼前後先修正
const fixDigits=t=>String(t).replace(/[Ss$](?=[0-9OoＯ]{3})/g,'5').replace(/[OoＯ](?=\d{3})/g,'0').replace(/(\d{3})[OoＯ]/g,(m,a)=>a+'0');
// 讀成不存在的代碼時，只修正一個常見混淆的數字（例如 9022→5022）；修正後剛好只有一個已知代碼才採用
const CONFUSE={'5':'96','9':'5','6':'58','8':'036','0':'8','3':'8','1':'7','7':'1'};
function nearCode(c){const hits=new Set();for(let i=0;i<4;i++)for(const r of (CONFUSE[c[i]]||'')){const k=c.slice(0,i)+r+c.slice(i+1);if(KNOWN_CODES.has(k))hits.add(k)}return hits.size===1?[...hits][0]:''}
function popupCode(raw,fuzzy){
 const lines=fixDigits(raw).split(/\r?\n/);
 for(const line of lines){
  const m=line.match(/(?:^|[^\d])([0-9]{4})\s*[-－—–)）:：]/);
  if(m&&KNOWN_CODES.has(m[1]))return m[1]
 }
 const all=(fixDigits(raw).match(/(^|\D)(\d{4})(?!\d)/g)||[]).map(x=>x.slice(-4));
 const codes=[...new Set(all.filter(c=>KNOWN_CODES.has(c)))];
 if(codes.length===1)return codes[0];
 if(fuzzy&&!codes.length){const n=[...new Set(all.filter(c=>!/^(19|20)\d\d$/.test(c)).map(nearCode).filter(Boolean))];if(n.length===1)return n[0]}
 return ''
}
// 找瀏覽器警告視窗的藍色「確定」按鈕，回傳按鈕上方的對話框範圍（找不到回傳 null）
function findDialog(c){
 const sw=600,s=sw/c.width,sh=Math.round(c.height*s),t=document.createElement('canvas');t.width=sw;t.height=sh;
 const tg=t.getContext('2d');tg.drawImage(c,0,0,sw,sh);const d=tg.getImageData(0,0,sw,sh).data,m=new Uint8Array(sw*sh);
 for(let i=0;i<sw*sh;i++){const r=d[i*4],g=d[i*4+1],b=d[i*4+2];if(b>150&&b-r>90&&b-g>40&&r<110)m[i]=1}
 let best=null;const st=[];
 for(let i=0;i<sw*sh;i++){if(m[i]!==1)continue;m[i]=2;st.push(i);let n=0,x0=sw,x1=0,y0=sh,y1=0;
  while(st.length){const k=st.pop(),x=k%sw,y=(k-x)/sw;n++;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
   for(const q of [k-1,k+1,k-sw,k+sw]){if(q>=0&&q<sw*sh&&m[q]===1&&Math.abs(q%sw-x)<=1){m[q]=2;st.push(q)}}}
  const bw=x1-x0+1,bh=y1-y0+1,asp=bw/bh,fill=n/(bw*bh);
  if(asp>1.6&&asp<3.8&&fill>.5&&bw>=sw*.015&&bw<=sw*.14&&y0>bh*2){const sc=n-Math.abs((x0+x1)/2-sw/2)*.3;if(!best||sc>best.sc)best={sc,x0,y0,bw,bh}}}
 if(!best)return null;
 const R=v=>v/s,bx=R(best.x0),by=R(best.y0),bw=R(best.bw),bh=R(best.bh);
 const x=Math.max(0,bx+bw-7.6*bw),y=Math.max(0,by-3.4*bh);return {x,y,w:Math.min(c.width,bx+bw*1.3)-x,h:by-y}}
// 裁出範圍、放大、輕微模糊（去掉翻拍螢幕的紋路）、轉灰階拉對比
function prepCrop(c,r,bl){if(bl==null)bl=1.2;
 const k=Math.min(4,Math.max(1.5,1800/r.w)),o=document.createElement('canvas');o.width=Math.round(r.w*k);o.height=Math.round(r.h*k);
 const g=o.getContext('2d');g.imageSmoothingQuality='high';if('filter' in g)g.filter='blur('+(bl*k).toFixed(1)+'px)';
 g.drawImage(c,r.x,r.y,r.w,r.h,0,0,o.width,o.height);if('filter' in g)g.filter='none';
 const im=g.getImageData(0,0,o.width,o.height),p=im.data,h=new Uint32Array(256);
 for(let i=0;i<p.length;i+=4){const v=(p[i]*299+p[i+1]*587+p[i+2]*114)/1000|0;p[i]=v;h[v]++}
 let lo=0,hi=255,acc=0,cut=p.length/4*.02;while(acc+h[lo]<cut)acc+=h[lo++];acc=0;while(acc+h[hi]<cut)acc+=h[hi--];const sp=Math.max(1,hi-lo);
 for(let i=0;i<p.length;i+=4){const v=Math.max(0,Math.min(255,(p[i]-lo)*255/sp));p[i]=p[i+1]=p[i+2]=v}
 g.putImageData(im,0,0);return o}
async function ocr(file){const T=await loadOcr();if(!ocrWorker)ocrWorker=await T.createWorker(['chi_tra','eng']);
 const src=URL.createObjectURL(file);let img;
 try{img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src})}finally{URL.revokeObjectURL(src)}
 const scale=Math.min(3,Math.max(1,2000/img.width));const c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);const g=c.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(img,0,0,c.width,c.height);
 // 1) 有藍色「確定」按鈕的警告視窗：只讀視窗裡的字
 const dlg=findDialog(c);
 if(dlg){const votes={};for(const bl of [1.2,0,0.6]){const t=(await ocrWorker.recognize(prepCrop(c,dlg,bl))).data.text||'';const k=popupCode(t,true);if(k){votes[k]=(votes[k]||0)+1;if(votes[k]>=2)return {t:k,how:'dialog'}}}
  const ks=Object.keys(votes);if(ks.length===1)return {t:ks[0],how:'dialog'};return {t:'',how:'unclear'}}
 // 2) 畫面中央（彈窗通常在中間）
 const ctr={x:c.width*.15,y:c.height*.28,w:c.width*.7,h:c.height*.42};
 const focused=(await ocrWorker.recognize(prepCrop(c,ctr))).data.text||'';
 const code=popupCode(focused);if(code)return {t:code,how:'center'};
 // 3) 整張（不確定，會請使用者確認）
 return {t:(await ocrWorker.recognize(c)).data.text||'',how:'full'}}
const prepared=pool.map(d=>({d,toks:[...new Set(d.keywords.split(/\s+/).map(norm).filter(t=>t.length>=2))],title:norm(d.title),bg:bigrams(norm(d.title+d.description+d.steps.join('')))}));
function rank(q){const route=routeQuestion(q);if(route)return route.type==='topics'?pool.filter(d=>route.docs.includes(d.id)).map(d=>({d,score:100})):[];const n=norm(q);if(!n)return [];
 const policy=typeof matchNhiProcedureCode==='function'?matchNhiProcedureCode(q):null;if(policy){const d=pool.find(x=>x.id==='nhi-dentist-handbook-2026');return policy.status==='found'&&d?[{d,score:100}]:[]}
 if(n.includes('新特約'))return [];
 const cm=n.match(/(^|[^a-z])([nvuedg])0?(\d{1,2})(?!\d)/);if(cm){const code=cm[2].toUpperCase()+String(cm[3]).padStart(2,'0');const d=pool.find(x=>!x.parent&&STATION[x.id]===code);if(d)return [{d,score:100}]}
 return prepared.map(p=>{let s=0;
  if(/同意書/.test(n)&&!/同意書/.test(p.d.title+' '+p.d.keywords))return {d:p.d,score:0};
  (INTENTS[p.d.id]||[]).forEach(ph=>{const k=norm(ph);if(n.includes(k))s+=(p.d.parent?20:10)+k.length});
  p.toks.forEach(t=>{if(n.includes(t))s+=Math.min(t.length,6)*1.5});
  if(n.includes(p.title))s+=15;
  if(/\d{4}/.test(n)&&p.d.id==='card-reader-errors'){const nums=n.match(/\d{4}/g);if(nums.some(x=>p.d.keywords.includes(x)))s+=40}
  if(n.length>=2){let o=0;bigrams(n).forEach(b=>{if(p.bg.has(b))o++});s+=o*1.2}
  if(/關機/.test(n)&&p.d.id==='ic-card-incident-form'&&!/報備|健保卡|異常/.test(n))s=0;
  if(p.d.parent)s-=4;
  return {d:p.d,score:s}}).filter(r=>r.score>=8).sort((a,b)=>b.score-a.score)}
const urlOf=d=>BASE+'?doc='+encodeURIComponent(d.parent?d.id:codeOf(d))+'&read=1';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LINE_URL='https://line.me/R/ti/p/%40leyan';
const humanRequest=q=>/人工客服|轉人工|找真人|找客服|聯絡客服|需要人工|官方line|line@|客服電話/i.test(norm(q));
// 輸入框提示：舉一個完整問句當例子；手機輸入框比較窄，用短一點的說法
const lcHint=()=>matchMedia("(max-width:640px)").matches?"例：健保上傳一直失敗":"輸入問題，例：健保上傳一直失敗…";
const supportHtml=name=>'<div class="lc-support"><div class="lc-sup-head"><span class="lc-sup-ic"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z\"/></svg></span><b>交給真人客服幫你看看</b></div><p>有些狀況要看診所的實際資料，'+esc(name||'小黑貓')+'沒辦法直接查。別擔心，客服夥伴會接手幫你處理。</p><a class="lc-line-link" href="'+LINE_URL+'" target="_blank" rel="noopener noreferrer">用 LINE 找客服（@leyan）</a><div class="lc-sup-alt"><a class="lc-line-qr" href="'+LINE_URL+'" target="_blank" rel="noopener noreferrer" aria-label="掃描 QR code 加入官方 LINE@ @leyan"><img src="'+BASE+'images/line-official-qr.png" alt="官方 LINE@ @leyan 加入好友 QR code" loading="lazy"></a><small>用另一支手機掃描也可以。<br>不方便用 LINE 的話，<br>請撥 <b>04-2251-8815</b> 分機 9。</small></div></div>';
const CAT_SVG='<svg class="lc-cat" viewBox="0 0 120 120" aria-hidden="true"><g class="lc-tail"><path d="M84 96c18-2 26-14 22-30-2-8-9-10-12-5" fill="none" stroke="#15191E" stroke-width="9" stroke-linecap="round"/></g><ellipse cx="58" cy="88" rx="30" ry="24" fill="#15191E"/><g class="lc-head-g"><path d="M30 44 34 18 50 34zM86 44 82 18 66 34z" fill="#15191E"/><path d="M35 38 37 26 45 34zM81 38 79 26 71 34z" fill="#E8A0A8"/><circle cx="58" cy="52" r="28" fill="#15191E"/><g class="lc-look"><g class="lc-eyes"><ellipse cx="47" cy="52" rx="6.5" ry="7.5" fill="#F6C945"/><ellipse cx="69" cy="52" rx="6.5" ry="7.5" fill="#F6C945"/><ellipse cx="47" cy="53" rx="2.2" ry="5" fill="#15191E"/><ellipse cx="69" cy="53" rx="2.2" ry="5" fill="#15191E"/></g></g><path d="M55 63h6l-3 3z" fill="#E8A0A8"/><ellipse class="lc-mouth" cx="58" cy="70" rx="4" ry="3.2" fill="#7A2E3A"/><path d="M40 64 26 62M40 68 27 70M76 64l14-2M76 68l13 2" stroke="#8A9199" stroke-width="1.6" stroke-linecap="round"/></g><g class="lc-paw"><ellipse cx="70" cy="96" rx="7" ry="10" fill="#15191E" stroke="#5B6470" stroke-width="1.4"/><path d="M67 90v4M71 89v5" stroke="#5B6470" stroke-width="1.1" stroke-linecap="round"/></g><ellipse class="lc-tongue" cx="59" cy="70" rx="3" ry="4" fill="#E8708A"/><g class="lc-treat"><path d="M49 8c4-5 12-5 16 0-4 5-12 5-16 0zM65 8l7-4v8z" fill="#E9A15B"/><circle cx="53" cy="7" r="1.1" fill="#15191E"/></g></svg>';
// 可選的夥伴：每隻都沿用小黑貓的動畫部位（lc-tail／lc-head-g／lc-eyes／lc-mouth／lc-paw／lc-tongue／lc-treat），所以舔毛、睡覺、吃東西、追逗逗棒都通用
const PET_SVG=(body)=>'<svg class="lc-cat" viewBox="0 0 120 120" aria-hidden="true">'+body+'</svg>';
const TOY_SVG={
 wand:'<g class="lc-w-pom"><path d="M-4 8-12 20M0 9V24M4 8 12 20" stroke="#F6C945" stroke-width="3" stroke-linecap="round" fill="none"/><circle r="10" fill="#E9524A"/></g>',
 ball:'<g class="lc-w-pom"><g class="lc-w-spin"><circle r="14" fill="#6FC3F7"/><path d="M-14 0a14 14 0 0 0 28 0z" fill="#F6C945"/><path d="M0-14a14 14 0 0 1 0 28a7 14 0 0 1 0-28z" fill="#F28AA0"/><circle r="14" fill="none" stroke="#2C6FA8" stroke-width="1.6"/></g><ellipse cx="-5" cy="-6" rx="4" ry="2.6" fill="#fff" opacity=".75"/></g>',
 grass:'<g class="lc-w-pom"><g class="lc-w-spin"><circle r="14" fill="#C9DE8C"/><g fill="none" stroke="#8DAF4A" stroke-width="1.6"><ellipse rx="14" ry="5.5"/><ellipse rx="5.5" ry="14"/><ellipse rx="14" ry="5.5" transform="rotate(60)"/><ellipse rx="14" ry="5.5" transform="rotate(-60)"/></g><path d="M9 -11l5-6M11 -9l7-3M-12 9l-6 4" stroke="#A7C25E" stroke-width="1.6" stroke-linecap="round"/><circle r="14" fill="none" stroke="#7A9A3C" stroke-width="1.4"/></g></g>',
 fish:'<g class="lc-w-pom"><g class="lc-w-sway"><path d="M17 0l13-10q-3 10 0 20z" fill="#F6A6B8" stroke="#E07A93" stroke-width="1.2" stroke-linejoin="round"/><ellipse rx="20" ry="12" fill="#8FD0F2" stroke="#4FA8E8" stroke-width="1.4"/><path d="M-2-11q6-7 12-1" fill="#F6A6B8" stroke="#E07A93" stroke-width="1.2"/><path d="M2-11v22M8-10v20" stroke="#BFE5F8" stroke-width="1.6" stroke-dasharray="2.4 2.4"/><circle cx="-11" cy="-3" r="2.6" fill="#16203A"/><circle cx="-10.2" cy="-3.8" r=".9" fill="#fff"/><ellipse cx="-12" cy="4" rx="3" ry="1.8" fill="#F6A6B8" opacity=".8"/><path d="M-19 1q2 2.4 4 0" stroke="#16203A" stroke-width="1.2" fill="none" stroke-linecap="round"/></g></g>',
 wheel:'<g class="lc-w-pom"><path d="M-30 50 0 0 30 50" stroke="#9AA4B2" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M-38 50h20M18 50h20" stroke="#7B8594" stroke-width="5" stroke-linecap="round"/><g class="lc-w-spin"><circle r="48" fill="#EAF6FF" fill-opacity=".55" stroke="#6FC3F7" stroke-width="5"/><g stroke="#9ED8FF" stroke-width="2.4">'+[0,30,60,90,120,150].map(a=>'<path d="M0-48V48" transform="rotate('+a+')"/>').join('')+'</g><circle r="48" fill="none" stroke="#4FA8E8" stroke-width="2" stroke-dasharray="3 6"/><circle r="6" fill="#4FA8E8"/></g></g>'
};
const PETS={
 cat:{name:'小黑貓',icon:'🐈‍⬛',svg:CAT_SVG,treat:'🐟 餵零食',toy:'逗貓棒',play:'wand',toyMenu:'🪶 玩逗貓棒',
  treatSays:['喵～好吃！謝謝你','咕嚕咕嚕…這個零食超讚','吃飽了就有力氣幫你找手冊','喵嗚～再來一口也可以喔','好滿足～我繼續值班囉'],
  toySays:['喵！抓到了～','嘿咻！','再甩一次～','這個我要咬！'],wakeSay:'喵…（伸懶腰）',sound:'喵',hello:'喵～小黑貓回來值班了'},
 poodle:{name:'小貴賓',icon:'🐩',toy:'球',play:'ball',toyMenu:'🎾 玩球',treat:'🦴 餵骨頭',
  svg:PET_SVG('<g class="lc-tail"><path d="M87.5 98.0Q88.4 100.6 85.9 101.9Q84.6 104.4 82.0 103.5Q79.4 104.4 78.1 101.9Q75.6 100.6 76.5 98.0Q75.6 95.4 78.1 94.1Q79.4 91.6 82.0 92.5Q84.6 91.6 85.9 94.1Q88.4 95.4 87.5 98.0z" fill="#D9A274"/></g><path d="M83.0 92.0Q84.8 96.0 81.5 99.2Q81.6 103.6 77.2 105.5Q75.5 109.8 70.5 110.2Q67.3 113.8 62.3 112.7Q58.0 115.2 53.7 112.7Q48.7 113.8 45.5 110.2Q40.5 109.8 38.8 105.5Q34.4 103.6 34.5 99.2Q31.2 96.0 33.0 92.0Q31.2 88.0 34.5 84.8Q34.4 80.4 38.8 78.5Q40.5 74.2 45.5 73.8Q48.7 70.2 53.7 71.3Q58.0 68.8 62.3 71.3Q67.3 70.2 70.5 73.8Q75.5 74.2 77.2 78.5Q81.6 80.4 81.5 84.8Q84.8 88.0 83.0 92.0z" fill="#D9A274"/><ellipse cx="58" cy="90" rx="13" ry="12" fill="#E9BD93" opacity=".7"/><path d="M52.5 109.0Q53.2 111.3 50.5 112.5Q48.9 114.9 45.5 114.4Q42.3 115.7 39.8 113.8Q36.5 113.4 36.0 110.9Q34.2 109.0 36.0 107.1Q36.5 104.6 39.8 104.2Q42.3 102.3 45.5 103.6Q48.9 103.1 50.5 105.5Q53.2 106.7 52.5 109.0z" fill="#D9A274"/><path d="M80.5 109.0Q81.2 111.3 78.5 112.5Q76.9 114.9 73.5 114.4Q70.3 115.7 67.8 113.8Q64.5 113.4 64.0 110.9Q62.2 109.0 64.0 107.1Q64.5 104.6 67.8 104.2Q70.3 102.3 73.5 103.6Q76.9 103.1 78.5 105.5Q81.2 106.7 80.5 109.0z" fill="#D9A274"/><g class="lc-head-g"><path d="M42.0 60.0Q43.6 64.7 40.7 68.2Q40.7 73.1 37.1 74.9Q35.5 78.9 31.9 78.5Q29.0 81.0 26.1 78.5Q22.5 78.9 20.9 74.9Q17.3 73.1 17.3 68.2Q14.4 64.7 16.0 60.0Q14.4 55.3 17.3 51.8Q17.3 46.9 20.9 45.1Q22.5 41.1 26.1 41.5Q29.0 39.0 31.9 41.5Q35.5 41.1 37.1 45.1Q40.7 46.9 40.7 51.8Q43.6 55.3 42.0 60.0z" fill="#C68A5E" transform="rotate(14 29 60)"/><path d="M100.0 60.0Q101.6 64.7 98.7 68.2Q98.7 73.1 95.1 74.9Q93.5 78.9 89.9 78.5Q87.0 81.0 84.1 78.5Q80.5 78.9 78.9 74.9Q75.3 73.1 75.3 68.2Q72.4 64.7 74.0 60.0Q72.4 55.3 75.3 51.8Q75.3 46.9 78.9 45.1Q80.5 41.1 84.1 41.5Q87.0 39.0 89.9 41.5Q93.5 41.1 95.1 45.1Q98.7 46.9 98.7 51.8Q101.6 55.3 100.0 60.0z" fill="#C68A5E" transform="rotate(-14 87 60)"/><path d="M87.0 48.0Q89.1 51.8 86.0 55.0Q87.0 59.3 83.1 61.5Q82.9 65.9 78.5 67.1Q77.1 71.3 72.5 71.4Q70.0 75.2 65.5 74.1Q62.1 77.1 58.0 75.0Q53.9 77.1 50.5 74.1Q46.0 75.2 43.5 71.4Q38.9 71.3 37.5 67.1Q33.1 65.9 32.9 61.5Q29.0 59.3 30.0 55.0Q26.9 51.8 29.0 48.0Q26.9 44.2 30.0 41.0Q29.0 36.7 32.9 34.5Q33.1 30.1 37.5 28.9Q38.9 24.7 43.5 24.6Q46.0 20.8 50.5 21.9Q53.9 18.9 58.0 21.0Q62.1 18.9 65.5 21.9Q70.0 20.8 72.5 24.6Q77.1 24.7 78.5 28.9Q82.9 30.1 83.1 34.5Q87.0 36.7 86.0 41.0Q89.1 44.2 87.0 48.0z" fill="#D9A274"/><ellipse cx="58" cy="40" rx="18" ry="9" fill="#E9BD93" opacity=".35"/><path d="M71.0 63.0Q72.0 65.6 69.7 67.6Q69.3 70.4 66.1 71.2Q64.2 73.7 60.9 73.2Q58.0 74.9 55.1 73.2Q51.8 73.7 49.9 71.2Q46.7 70.4 46.3 67.6Q44.0 65.6 45.0 63.0Q44.0 60.4 46.3 58.4Q46.7 55.6 49.9 54.8Q51.8 52.3 55.1 52.8Q58.0 51.1 60.9 52.8Q64.2 52.3 66.1 54.8Q69.3 55.6 69.7 58.4Q72.0 60.4 71.0 63.0z" fill="#E9BD93"/><g class="lc-look"><g class="lc-eyes"><circle cx="46" cy="51" r="4.6" fill="#2A1C18"/><circle cx="70" cy="51" r="4.6" fill="#2A1C18"/><circle cx="47.6" cy="49.4" r="1.6" fill="#fff"/><circle cx="71.6" cy="49.4" r="1.6" fill="#fff"/></g></g><ellipse cx="58" cy="59.5" rx="4.8" ry="3.6" fill="#4A3734"/><ellipse cx="56.8" cy="58.4" rx="1.4" ry=".9" fill="#fff" opacity=".5"/><path d="M58 63v1.8M53.5 65q2.2 2.6 4.5 0q2.3 2.6 4.5 0" stroke="#4A3734" stroke-width="1.2" fill="none" stroke-linecap="round"/><ellipse class="lc-mouth" cx="58" cy="68" rx="3.4" ry="2.8" fill="#7A2E3A"/></g><path d="M56.2 79.0Q56.7 81.3 54.4 82.5Q52.8 84.6 50.0 84.0Q47.2 84.6 45.6 82.5Q43.3 81.3 43.8 79.0Q43.3 76.7 45.6 75.5Q47.2 73.4 50.0 74.0Q52.8 73.4 54.4 75.5Q56.7 76.7 56.2 79.0z" fill="#D9A274"/><path d="M72.2 79.0Q72.7 81.3 70.4 82.5Q68.8 84.6 66.0 84.0Q63.2 84.6 61.6 82.5Q59.3 81.3 59.8 79.0Q59.3 76.7 61.6 75.5Q63.2 73.4 66.0 74.0Q68.8 73.4 70.4 75.5Q72.7 76.7 72.2 79.0z" fill="#D9A274"/><g class="lc-paw"><path d="M76.0 96.0Q76.7 99.1 74.6 101.1Q73.5 103.9 71.0 103.9Q68.8 105.0 67.0 102.9Q64.6 101.8 64.4 98.7Q62.9 96.0 64.4 93.3Q64.6 90.2 67.0 89.1Q68.8 87.0 71.0 88.1Q73.5 88.1 74.6 90.9Q76.7 92.9 76.0 96.0z" fill="#D9A274"/></g><ellipse class="lc-tongue" cx="59" cy="69.5" rx="3" ry="4" fill="#E8708A"/><g class="lc-treat" fill="#F5ECD7" stroke="#C9B48A" stroke-width="1"><path d="M49 6h16v4H49z"/><circle cx="48" cy="5" r="3"/><circle cx="48" cy="11" r="3"/><circle cx="66" cy="5" r="3"/><circle cx="66" cy="11" r="3"/></g>'),
  treatSays:['汪！骨頭好香～','尾巴搖不停…謝謝你！','吃飽了就有力氣幫你找手冊','汪汪～再來一根也可以喔','好滿足～我繼續值班囉'],
  toySays:['汪！接到球了～','球球別跑！','再滾一次～','這顆球我要叼走！'],wakeSay:'汪…（伸懶腰）',sound:'汪',hello:'汪！小貴賓來幫你找手冊囉'},
 rabbit:{name:'小白兔',icon:'🐇',toy:'草球',play:'grass',toyMenu:'🌾 玩草球',treat:'🥕 餵紅蘿蔔',
  svg:PET_SVG('<g class="lc-tail"><circle cx="80" cy="100" r="5" fill="#FFFDF9"/></g><ellipse cx="58" cy="83" rx="32" ry="28" fill="#FFFDF9" stroke="#1B2340" stroke-width=".9"/><ellipse cx="58" cy="91" rx="22" ry="17" fill="#FBEFE6"/><ellipse cx="45" cy="108" rx="7.5" ry="4.6" fill="#FFFDF9" stroke="#1B2340" stroke-width=".9"/><ellipse cx="71" cy="108" rx="7.5" ry="4.6" fill="#FFFDF9" stroke="#1B2340" stroke-width=".9"/><path d="M42 107v2.5M45 106.5v3M48 107v2.5M68 107v2.5M71 106.5v3M74 107v2.5" stroke="#F0A3AE" stroke-width="1" stroke-linecap="round"/><g class="lc-head-g"><ellipse cx="46" cy="22" rx="8.5" ry="19" transform="rotate(-12 46 22)" fill="#FFFDF9" stroke="#1B2340" stroke-width=".9"/><ellipse cx="70" cy="22" rx="8.5" ry="19" transform="rotate(12 70 22)" fill="#FFFDF9" stroke="#1B2340" stroke-width=".9"/><ellipse cx="46" cy="24" rx="4.5" ry="14" transform="rotate(-12 46 24)" fill="#F2A9A0"/><ellipse cx="70" cy="24" rx="4.5" ry="14" transform="rotate(12 70 24)" fill="#F2A9A0"/><ellipse cx="58" cy="53" rx="27" ry="24" fill="#FFFDF9" stroke="#1B2340" stroke-width=".9"/><g class="lc-look"><g class="lc-eyes"><circle cx="48" cy="51" r="4.6" fill="#16203A"/><circle cx="68" cy="51" r="4.6" fill="#16203A"/><circle cx="49.6" cy="49.4" r="1.6" fill="#fff"/><circle cx="69.6" cy="49.4" r="1.6" fill="#fff"/></g></g><path d="M55.5 57.5h5l-2.5 2.8z" fill="#F2A9A0"/><path d="M54 61.5q2 2.6 4 0q2 2.6 4 0" stroke="#16203A" stroke-width="1.3" fill="none" stroke-linecap="round"/><ellipse class="lc-mouth" cx="58" cy="65" rx="3.4" ry="2.8" fill="#7A2E3A"/><path d="M37 57 26 55.5M37 60 26 61.5M79 57l11-1.5M79 60l11 1.5" stroke="#16203A" stroke-width="1.1" stroke-linecap="round"/></g><ellipse cx="51" cy="77" rx="5.6" ry="4.6" fill="#FFFDF9" stroke="#1B2340" stroke-width=".9"/><ellipse cx="65" cy="77" rx="5.6" ry="4.6" fill="#FFFDF9" stroke="#1B2340" stroke-width=".9"/><path d="M49.5 77.5l1 2M52.5 77.5l.5 2M63.5 77.5l-1 2M66.5 77.5l-.5 2" stroke="#F0A3AE" stroke-width="1" stroke-linecap="round"/><g class="lc-paw"><ellipse cx="70" cy="96" rx="6" ry="8" fill="#FFFDF9" stroke="#1B2340" stroke-width=".9"/></g><ellipse class="lc-tongue" cx="59" cy="65" rx="2.6" ry="3.4" fill="#E8708A"/><g class="lc-treat"><path d="M50 6q8-3 16 1l-9 12z" fill="#F08A2C"/><path d="M63 6l5-5M64 7l7-2M62 5l2-5" stroke="#4FA34A" stroke-width="2" stroke-linecap="round"/></g>'),
  treatSays:['喀滋喀滋…紅蘿蔔好甜','耳朵開心得豎起來了！','吃飽了就有力氣幫你找手冊','再來一根也可以喔～','好滿足～我繼續值班囉'],
  toySays:['蹦！抓到草球了～','跳跳跳！','草球香香的','再滾一次～'],wakeSay:'嗯…（揉揉眼睛）',sound:'噗',hello:'蹦！小白兔來幫你找手冊囉'},
 bear:{name:'小熊',icon:'🐻',toy:'魚玩偶',play:'fish',toyMenu:'🐟 玩魚玩偶',treat:'🍯 餵蜂蜜',
  svg:PET_SVG('<g class="lc-tail"><circle cx="80" cy="98" r="4" fill="#A8663F"/></g><ellipse cx="58" cy="86" rx="30" ry="25" fill="#A8663F"/><ellipse cx="58" cy="92" rx="18" ry="15" fill="#FAE9CF"/><ellipse cx="42" cy="106" rx="9" ry="6.5" fill="#B97650"/><ellipse cx="74" cy="106" rx="9" ry="6.5" fill="#B97650"/><path d="M39 105v2.6M42 104.5v2.6M45 105v2.6M71 105v2.6M74 104.5v2.6M77 105v2.6" stroke="#7E4A2C" stroke-width="1" stroke-linecap="round"/><g class="lc-head-g"><circle cx="34" cy="32" r="11" fill="#A8663F"/><circle cx="82" cy="32" r="11" fill="#A8663F"/><circle cx="36" cy="34" r="6" fill="#E8968C"/><circle cx="80" cy="34" r="6" fill="#E8968C"/><ellipse cx="58" cy="52" rx="28" ry="24" fill="#A8663F"/><ellipse cx="58" cy="62" rx="10.5" ry="8.5" fill="#FAE9CF"/><g class="lc-look"><g class="lc-eyes"><circle cx="48" cy="52" r="4.8" fill="#16203A"/><circle cx="68" cy="52" r="4.8" fill="#16203A"/><circle cx="49.7" cy="50.3" r="1.7" fill="#fff"/><circle cx="69.7" cy="50.3" r="1.7" fill="#fff"/></g></g><path d="M54.4 57q3.6-1.6 7.2 0q-1 3.2-3.6 4.2q-2.6-1-3.6-4.2z" fill="#16203A"/><path d="M58 61.8v1.6M53.5 63.3q2.2 2.8 4.5 0q2.3 2.8 4.5 0" stroke="#16203A" stroke-width="1.3" fill="none" stroke-linecap="round"/><ellipse class="lc-mouth" cx="58" cy="67" rx="3.4" ry="2.8" fill="#7A2E3A"/></g><ellipse cx="48" cy="76" rx="6.5" ry="5.5" fill="#B97650"/><ellipse cx="68" cy="76" rx="6.5" ry="5.5" fill="#B97650"/><path d="M46 77v2.6M49 77v2.6M67 77v2.6M70 77v2.6" stroke="#7E4A2C" stroke-width="1" stroke-linecap="round"/><g class="lc-paw"><ellipse cx="70" cy="96" rx="6.5" ry="8.5" fill="#B97650"/></g><ellipse class="lc-tongue" cx="59" cy="67" rx="2.6" ry="3.4" fill="#E8708A"/><g class="lc-treat"><path d="M49 4h16v2c3 1 3 11-1 12H50c-4-1-4-11-1-12z" fill="#E9A13B"/><path d="M48 3h18v3H48z" fill="#B9741C"/></g>'),
  treatSays:['嗯～蜂蜜好甜！謝謝你','舔舔…黏在嘴邊了','吃飽了就有力氣幫你找手冊','再來一罐也可以喔～','好滿足～我繼續值班囉'],
  toySays:['嘿！抱住小魚了～','小魚別游走！','嘿咻！','這條魚我要抱著睡'],wakeSay:'呼啊…（伸懶腰）',sound:'嗚',hello:'嗨～小熊來幫你找手冊囉'},
 hamster:{name:'小倉鼠',icon:'🐹',toy:'滾輪',play:'wheel',toyMenu:'🎡 跑滾輪',treat:'🌻 餵瓜子',
  svg:PET_SVG('<g class="lc-tail"><circle cx="80" cy="100" r="3" fill="#D6943F"/></g><ellipse cx="58" cy="83" rx="32" ry="28" fill="#D6943F"/><ellipse cx="58" cy="91" rx="22" ry="17" fill="#FDF1DC"/><ellipse cx="45" cy="108" rx="7.5" ry="4.6" fill="#F4B2A8"/><ellipse cx="71" cy="108" rx="7.5" ry="4.6" fill="#F4B2A8"/><path d="M42 107v2.5M45 106.5v3M48 107v2.5M68 107v2.5M71 106.5v3M74 107v2.5" stroke="#C97F78" stroke-width="1" stroke-linecap="round"/><g class="lc-head-g"><circle cx="37" cy="33" r="10" fill="#D6943F"/><circle cx="79" cy="33" r="10" fill="#D6943F"/><circle cx="38" cy="34" r="6" fill="#F2A9A0"/><circle cx="78" cy="34" r="6" fill="#F2A9A0"/><ellipse cx="58" cy="53" rx="27" ry="24" fill="#D6943F"/><ellipse cx="40" cy="63" rx="12" ry="9.5" fill="#FDF1DC"/><ellipse cx="76" cy="63" rx="12" ry="9.5" fill="#FDF1DC"/><ellipse cx="58" cy="64" rx="14" ry="8" fill="#FDF1DC"/><g class="lc-look"><g class="lc-eyes"><circle cx="48" cy="51" r="4.6" fill="#16203A"/><circle cx="68" cy="51" r="4.6" fill="#16203A"/><circle cx="49.6" cy="49.4" r="1.6" fill="#fff"/><circle cx="69.6" cy="49.4" r="1.6" fill="#fff"/></g></g><path d="M55.5 57.5h5l-2.5 2.8z" fill="#F2A9A0"/><path d="M54 61.5q2 2.6 4 0q2 2.6 4 0" stroke="#16203A" stroke-width="1.3" fill="none" stroke-linecap="round"/><ellipse class="lc-mouth" cx="58" cy="65" rx="3.4" ry="2.8" fill="#7A2E3A"/><path d="M37 57 26 55.5M37 60 26 61.5M79 57l11-1.5M79 60l11 1.5" stroke="#16203A" stroke-width="1.1" stroke-linecap="round"/></g><ellipse cx="51" cy="77" rx="5.6" ry="4.6" fill="#F4B2A8"/><ellipse cx="65" cy="77" rx="5.6" ry="4.6" fill="#F4B2A8"/><path d="M49.5 77.5l1 2M52.5 77.5l.5 2M63.5 77.5l-1 2M66.5 77.5l-.5 2" stroke="#C97F78" stroke-width="1" stroke-linecap="round"/><g class="lc-paw"><ellipse cx="70" cy="96" rx="6" ry="8" fill="#F4B2A8"/></g><ellipse class="lc-tongue" cx="59" cy="65" rx="2.6" ry="3.4" fill="#E8708A"/><g class="lc-treat"><path d="M57 0c5 3 6 11 0 17-6-6-5-14 0-17z" fill="#2E2A28"/><path d="M55 3v11M59 3v11" stroke="#EDE6D8" stroke-width="1.2" stroke-linecap="round"/></g>'),
  treatSays:['吱！瓜子好香～','先塞進臉頰…等等再吃','吃飽了就有力氣幫你找手冊','吱吱～再來一顆也可以喔','臉頰鼓鼓～我繼續值班囉'],
  toySays:['吱吱！衝衝衝～','滾輪轉起來了！','跑好快～','吱！再快一點！'],wakeSay:'吱…（揉揉臉）',sound:'吱',hello:'吱吱！小倉鼠來幫你找手冊囉'}
};
// 各物種的睡姿（小黑貓除外）：狗捲成一圈、兔子耳朵往後貼平趴成吐司、熊趴著流鼻涕泡泡、倉鼠縮成一顆球
const PET_SLEEP={
 // 小貴賓（泰迪熊造型）：側趴捲成一圈，下巴靠在前腳上，大耳朵垂下
 poodle:'<path d="M98.0 100.0Q99.6 102.2 96.3 103.7Q96.1 106.4 91.5 107.1Q89.5 109.9 84.0 109.7Q80.3 112.5 74.5 111.4Q69.6 113.8 64.0 112.0Q58.4 113.8 53.5 111.4Q47.7 112.5 44.0 109.7Q38.5 109.9 36.5 107.1Q31.9 106.4 31.7 103.7Q28.4 102.2 30.0 100.0Q28.4 97.8 31.7 96.3Q31.9 93.6 36.5 92.9Q38.5 90.1 44.0 90.3Q47.7 87.5 53.5 88.6Q58.4 86.2 64.0 88.0Q69.6 86.2 74.5 88.6Q80.3 87.5 84.0 90.3Q89.5 90.1 91.5 92.9Q96.1 93.6 96.3 96.3Q99.6 97.8 98.0 100.0z" fill="#D9A274"/><path d="M92.0 90.0Q93.5 93.1 90.3 95.4Q90.0 98.9 85.6 99.9Q83.3 103.3 78.4 102.9Q74.7 105.7 70.0 104.0Q65.3 105.7 61.6 102.9Q56.7 103.3 54.4 99.9Q50.0 98.9 49.7 95.4Q46.5 93.1 48.0 90.0Q46.5 86.9 49.7 84.6Q50.0 81.1 54.4 80.1Q56.7 76.7 61.6 77.1Q65.3 74.3 70.0 76.0Q74.7 74.3 78.4 77.1Q83.3 76.7 85.6 80.1Q90.0 81.1 90.3 84.6Q93.5 86.9 92.0 90.0z" fill="#D9A274"/><path d="M103.0 104.0Q103.7 106.8 101.2 108.2Q99.8 110.7 97.0 110.0Q94.2 110.7 92.8 108.2Q90.3 106.8 91.0 104.0Q90.3 101.2 92.8 99.8Q94.2 97.3 97.0 98.0Q99.8 97.3 101.2 99.8Q103.7 101.2 103.0 104.0z" fill="#D9A274"/><path d="M44.0 108.0Q44.6 109.9 42.1 111.0Q40.5 112.9 37.4 112.5Q34.4 113.6 32.0 112.0Q29.0 111.7 28.5 109.6Q26.9 108.0 28.5 106.4Q29.0 104.3 32.0 104.0Q34.4 102.4 37.4 103.5Q40.5 103.1 42.1 105.0Q44.6 106.1 44.0 108.0z" fill="#D9A274"/><path d="M60.0 109.0Q60.6 110.9 58.1 112.0Q56.5 113.9 53.4 113.5Q50.4 114.6 48.0 113.0Q45.0 112.7 44.5 110.6Q42.9 109.0 44.5 107.4Q45.0 105.3 48.0 105.0Q50.4 103.4 53.4 104.5Q56.5 104.1 58.1 106.0Q60.6 107.1 60.0 109.0z" fill="#D9A274"/><path d="M34.0 96.0Q35.2 100.0 32.8 103.0Q32.5 107.0 29.5 108.1Q27.7 111.1 25.0 110.0Q22.3 111.1 20.5 108.1Q17.5 107.0 17.2 103.0Q14.8 100.0 16.0 96.0Q14.8 92.0 17.2 89.0Q17.5 85.0 20.5 83.9Q22.3 80.9 25.0 82.0Q27.7 80.9 29.5 83.9Q32.5 85.0 32.8 89.0Q35.2 92.0 34.0 96.0z" fill="#C68A5E" transform="rotate(10 25 96)"/><path d="M59.0 87.0Q60.7 90.1 57.9 92.5Q58.3 96.0 54.8 97.3Q53.9 100.8 50.0 100.9Q47.8 103.9 44.1 102.8Q41.0 105.0 37.9 102.8Q34.2 103.9 32.0 100.9Q28.1 100.8 27.2 97.3Q23.7 96.0 24.1 92.5Q21.3 90.1 23.0 87.0Q21.3 83.9 24.1 81.5Q23.7 78.0 27.2 76.7Q28.1 73.2 32.0 73.1Q34.2 70.1 37.9 71.2Q41.0 69.0 44.1 71.2Q47.8 70.1 50.0 73.1Q53.9 73.2 54.8 76.7Q58.3 78.0 57.9 81.5Q60.7 83.9 59.0 87.0z" fill="#D9A274"/><path d="M65.0 95.0Q65.9 99.1 63.5 102.1Q62.5 105.8 59.5 106.4Q57.0 108.4 54.5 106.4Q51.5 105.8 50.5 102.1Q48.1 99.1 49.0 95.0Q48.1 90.9 50.5 87.9Q51.5 84.2 54.5 83.6Q57.0 81.6 59.5 83.6Q62.5 84.2 63.5 87.9Q65.9 90.9 65.0 95.0z" fill="#C68A5E" transform="rotate(-14 57 95)"/><path d="M50.0 96.0Q50.7 98.5 48.3 100.1Q47.0 102.6 43.8 102.7Q41.0 104.2 38.2 102.7Q35.0 102.6 33.7 100.1Q31.3 98.5 32.0 96.0Q31.3 93.5 33.7 91.9Q35.0 89.4 38.2 89.3Q41.0 87.8 43.8 89.3Q47.0 89.4 48.3 91.9Q50.7 93.5 50.0 96.0z" fill="#E9BD93"/><ellipse cx="41" cy="93" rx="3.4" ry="2.6" fill="#4A3734"/><path d="M31 85.5q3.2 2.8 6.4 0M44.6 85.5q3.2 2.8 6.4 0" stroke="#2A1C18" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M38 98.5q1.5 1.6 3 0q1.5 1.6 3 0" stroke="#4A3734" stroke-width="1.1" fill="none" stroke-linecap="round"/>',
 // 小白兔：趴成一條吐司，長耳朵往後貼平在背上，前腳收在胸前
 rabbit:'<ellipse cx="64" cy="96" rx="36" ry="17" fill="#FFFDF9" stroke="#1B2340" stroke-width=".9"/>'
  +'<circle cx="99" cy="98" r="5.5" fill="#FFFDF9" stroke="#1B2340" stroke-width=".9"/>'
  +'<ellipse cx="74" cy="75" rx="23" ry="6.8" transform="rotate(9 74 75)" fill="#FFFDF9" stroke="#1B2340" stroke-width=".9"/><ellipse cx="74" cy="75" rx="17" ry="3.2" transform="rotate(9 74 75)" fill="#F2A9A0"/>'
  +'<ellipse cx="71" cy="81" rx="22" ry="6.4" transform="rotate(15 71 81)" fill="#FFFDF9" stroke="#1B2340" stroke-width=".9"/><ellipse cx="71" cy="81" rx="16" ry="3" transform="rotate(15 71 81)" fill="#F2A9A0"/>'
  +'<ellipse cx="38" cy="107" rx="7" ry="4.2" fill="#FFFDF9" stroke="#1B2340" stroke-width=".9"/><ellipse cx="53" cy="108" rx="7" ry="4.2" fill="#FFFDF9" stroke="#1B2340" stroke-width=".9"/>'
  +'<ellipse cx="45" cy="88" rx="23" ry="19" fill="#FFFDF9" stroke="#1B2340" stroke-width=".9"/>'
  +'<ellipse cx="33" cy="94" rx="4.5" ry="2.6" fill="#F6C6CC" opacity=".8"/><ellipse cx="57" cy="94" rx="4.5" ry="2.6" fill="#F6C6CC" opacity=".8"/>'
  +'<path d="M33.5 87q3.2 2.8 6.4 0M50 87q3.2 2.8 6.4 0" stroke="#16203A" stroke-width="1.5" fill="none" stroke-linecap="round"/>'
  +'<path d="M42.6 92h4.8l-2.4 2.6z" fill="#F2A9A0"/><path d="M41.6 96q1.7 2 3.4 0q1.7 2 3.4 0" stroke="#16203A" stroke-width="1.1" fill="none" stroke-linecap="round"/>'
  +'<path d="M26 92 17 90.5M26 95 17 96.5M64 92l9-1.5M64 95l9 1.5" stroke="#16203A" stroke-width="1" stroke-linecap="round"/>',
 // 小熊：大字形趴著，下巴靠在兩隻前掌上，鼻子吹出鼻涕泡泡
 bear:'<ellipse cx="68" cy="98" rx="36" ry="15" fill="#A8663F"/><circle cx="102" cy="96" r="4" fill="#A8663F"/>'
  +'<ellipse cx="98" cy="108" rx="9" ry="5" fill="#B97650"/>'
  +'<circle cx="33" cy="66" r="9" fill="#A8663F"/><circle cx="71" cy="66" r="9" fill="#A8663F"/><circle cx="34" cy="67" r="5" fill="#E8968C"/><circle cx="70" cy="67" r="5" fill="#E8968C"/>'
  +'<ellipse cx="52" cy="85" rx="25" ry="21" fill="#A8663F"/>'
  +'<ellipse cx="52" cy="93" rx="10" ry="7.5" fill="#FAE9CF"/>'
  +'<path d="M48.8 89.3q3.2-1.4 6.4 0q-.9 2.8-3.2 3.7q-2.3-.9-3.2-3.7z" fill="#16203A"/>'
  +'<path d="M40 83q3.4 3 6.8 0M57.2 83q3.4 3 6.8 0" stroke="#16203A" stroke-width="1.6" fill="none" stroke-linecap="round"/>'
  +'<path d="M49 96.5q1.5 1.6 3 0q1.5 1.6 3 0" stroke="#16203A" stroke-width="1.1" fill="none" stroke-linecap="round"/>'
  +'<ellipse cx="36" cy="106" rx="11" ry="6.5" fill="#B97650"/><ellipse cx="66" cy="106" rx="11" ry="6.5" fill="#B97650"/>'
  +'<path d="M31 104v2.6M35 103.5v2.6M39 104v2.6M61 104v2.6M65 103.5v2.6M69 104v2.6" stroke="#7E4A2C" stroke-width="1" stroke-linecap="round"/>'
  +'<g class="lc-snot"><circle cx="60" cy="92" r="5.5" fill="#CDEBFA" fill-opacity=".75" stroke="#8CC8EA" stroke-width=".9"/><circle cx="58.3" cy="90.3" r="1.4" fill="#fff"/></g>',
 // 小倉鼠：縮成一顆圓滾滾的毛球，臉埋在肚子前，小手抱在下巴
 hamster:'<circle cx="60" cy="88" r="27" fill="#D6943F"/>'
  +'<circle cx="45" cy="64" r="6.5" fill="#D6943F"/><circle cx="71" cy="62" r="6.5" fill="#D6943F"/><circle cx="45.5" cy="64.5" r="3.6" fill="#F2A9A0"/><circle cx="70.5" cy="62.5" r="3.6" fill="#F2A9A0"/>'
  +'<circle cx="60" cy="88" r="27" fill="none" stroke="#C17F31" stroke-width="1" stroke-dasharray="2 3" opacity=".5"/>'
  +'<path d="M78 74q6 8 2 18" stroke="#C17F31" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".6"/>'
  +'<ellipse cx="54" cy="100" rx="19" ry="11" fill="#FDF1DC"/>'
  +'<ellipse cx="42" cy="93" rx="8" ry="6" fill="#FDF1DC"/><ellipse cx="64" cy="93" rx="8" ry="6" fill="#FDF1DC"/>'
  +'<path d="M42.5 88q2.8 2.4 5.6 0M58 88q2.8 2.4 5.6 0" stroke="#16203A" stroke-width="1.5" fill="none" stroke-linecap="round"/>'
  +'<path d="M50.8 92h4.4l-2.2 2.4z" fill="#F2A9A0"/>'
  +'<path d="M38 94 30 93M38 96.5 30 98M68 94l8-1M68 96.5l8 1.5" stroke="#16203A" stroke-width="1" stroke-linecap="round"/>'
  +'<circle cx="49" cy="100" r="3.6" fill="#F4B2A8"/><circle cx="57" cy="100" r="3.6" fill="#F4B2A8"/>'
  +'<ellipse cx="45" cy="113" rx="6.5" ry="3.6" fill="#F4B2A8"/><ellipse cx="73" cy="112" rx="6.5" ry="3.6" fill="#F4B2A8"/>'
};
// 睡覺時換成牠們自己的睡姿（小黑貓維持原本的樣子）；睡姿比較矮，放大一點移到圓框中間
for(const k in PET_SLEEP)PETS[k].svg=PETS[k].svg.replace('</svg>','<g class="lc-asleep"><g transform="translate(60 72) scale(1.15) translate(-61 -88)">'+PET_SLEEP[k]+'</g></g></svg>');
const PET_ORDER=['cat','poodle','rabbit','bear','hamster'],PET_KEY='leyan-pet';
const QUICK=['取到 02 卡號','讀卡機沒反應','PIN 碼鎖住','停電要怎麼關機','上傳無法夾帶檔案','手機看不到約診'];
// Standalone waiting requests control only an active batch; ordinary questions are never substring-matched.
const rejectedCandidates=q=>/^(?:都不是|不是這個|都不對|不對(?:耶|喔)?|不是我要的|不是這個問題)[。！! ]*$/.test(q.trim());
function isWaitCommand(q){
 const short=q.replace(/[\s，。？！、,.?!:：;；「」『』～~…！]/g,'');
 return /^(?:(?:請(?:你)?|麻煩(?:你)?|先|再))*(?:等等(?:一下)?|等一下(?:下)?|等一等|等我一下|稍等(?:一下)?)(?:我)?(?:喔|哦|唷|噢|啦|吧)?$/.test(short);
}
// Only a recognized change of topic drops the earlier batch. Symptom corrections
// keep its device and error code; additive statements are not corrections.
function applyBatchCorrection(parts, question){
 const match=question.match(/^不是(?![只僅單光])\s*([^，,。！？!?；;\r\n]{1,40}?)(?:[，,；;]\s*(?:而?是|我指的是|我的意思是)|\s*而?是)\s*([^，,。！？!?；;\s][\s\S]*)$/);
 if(!match)return [...parts,question];
 const [,rejected,replacement]=match;
 const topics=[/讀卡機|健保卡|取卡|寫卡|讀卡/,/印表機|列表機/,/合理量|合理門診點數/,/申報/,/pano|x光|醫療影像/i,/密碼/,/掛號/,/轉診/,/電子簽章/];
 const topicOf=value=>topics.findIndex(pattern=>pattern.test(value));
 const previous=topicOf(rejected), next=topicOf(replacement);
 if(previous!==-1&&next!==-1&&previous!==next)return [replacement];
 const incorrect=rejected.trim();
 const retained=parts.map(part=>part.replaceAll(incorrect,'').trim()).filter(Boolean);
 return [...retained,replacement];
}
// Each flush consumes its text before routing. No question text survives into a later batch.
function createQueryBatch({run,start=()=>{},pending=()=>{},idleWait=()=>{},clock={now:()=>Date.now(),set:(f,n)=>setTimeout(f,n),clear:t=>clearTimeout(t)}}){
 let parts=[],first=null,deadline=0,timer=null,waiting=false;
 const cancel=()=>{if(timer!==null)clock.clear(timer);timer=null};
 function reset(){cancel();parts=[];first=null;deadline=0;waiting=false;pending(null)}
 function flush(){if(!parts.length)return false;const q=parts.join('\n');reset();run(q);return true}
 function update(reason){
  if(!parts.length)return;
  const remaining=deadline-clock.now();
  if(remaining<=0){flush();return}
  pending({seconds:Math.ceil(remaining/1000),waiting,reason});
  timer=clock.set(()=>{timer=null;update('tick')},Math.min(remaining,remaining%1000||1000));
 }
 function submit(q){
  q=String(q).trim();if(!q)return;
  if(parts.length&&clock.now()>=deadline)flush();
  const hold=isWaitCommand(q);
  if(hold&&!parts.length){idleWait();return 'idle-wait'}
  if(!parts.length){first=clock.now();start()}
  if(!hold)parts=applyBatchCorrection(parts,q);
  waiting=hold;deadline=Math.min(clock.now()+(hold?15000:5000),first+60000);
  cancel();update(hold?'wait':'input');return hold?'wait':'input';
 }
 return {submit,flush,reset,get active(){return parts.length>0},get text(){return parts.join('\n')}};
}
function mount(root,opt){opt=opt||{};const mode=opt.mode||'page';
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 root.classList.add('lc-root','lc-mode-'+mode);
 let petKey='cat';try{const s=localStorage.getItem(PET_KEY);if(PETS[s])petKey=s}catch{}
 // 桌面小動物打開問答視窗時會在網址帶 ?pet=，跟桌面那隻一樣
 try{const u=new URLSearchParams(location.search).get('pet');if(PETS[u]){petKey=u;localStorage.setItem(PET_KEY,u)}}catch{}
 // 問答視窗（cat.html）的標題是「樂衍＋夥伴名字」，桌面小動物靠標題知道網站上換成哪一隻
 const setTitle=()=>{if(mode==='page')document.title='樂衍'+PETS[petKey].name};
 let pet=PETS[petKey];root.dataset.pet=petKey;setTitle();
 root.innerHTML=(mode==='fab'?'<button type="button" class="lc-fab" aria-expanded="false" aria-controls="lc-panel" aria-label="開啟'+pet.name+'助手">'+pet.svg+'<span class="lc-fab-tip" aria-hidden="true">需要幫忙嗎？</span></button>':'')+
 '<section class="lc-panel" id="lc-panel" aria-label="'+pet.name+'助手"'+(mode==='fab'?' hidden':'')+'>'+
 '<div class="lc-head">'+(mode==='page'?pet.svg:'')+'<strong class="lc-title">'+pet.name+'</strong><div class="lc-head-actions"><button type="button" class="lc-new">新問題</button><button type="button" class="lc-swap" aria-haspopup="menu" title="換一個夥伴陪你">🐾 換夥伴</button>'+(mode==='fab'?'<button type="button" class="lc-close" aria-label="關閉助手">✕</button>':'')+'</div></div>'+
 '<aside class="lc-notice" aria-label="查詢提醒"><span class="lc-notice-pin" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 3 8 3-3 4 1 4-3 1-2-3-4-1 4-3zM10 14l-3 6"/></svg></span><div><div class="lc-notice-main"><mark>麻煩將問題一次輸入完整</mark>，方便<span class="lc-notice-name">'+esc(pet.name)+'</span>查詢。</div><div class="lc-notice-sub">送出後5秒內可補充；複雜問題請洽<button type="button" class="lc-human">人工客服</button></div></div></aside>'+
 '<div class="lc-announcer lc-sr" role="status" aria-live="polite" aria-atomic="true"></div><div class="lc-log" role="log" aria-live="polite"></div>'+
 '<div class="lc-quick">'+QUICK.map(q=>'<button type="button" data-q="'+esc(q)+'">'+esc(q)+'</button>').join('')+'</div>'+
 '<form class="lc-form"><label class="lc-sr" for="lc-input-'+mode+'">輸入你的問題</label><input id="lc-input-'+mode+'" class="lc-input" autocomplete="off" enterkeyhint="send" placeholder="'+lcHint()+'">'+
 '<label class="lc-pic" title="選擇圖片辨識"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="m21 17-5-5-8 7"/></svg><input type="file" accept="image/*" class="lc-file" aria-label="在本機辨識已遮蔽個資的錯誤畫面"></label>'+(SR?'<button type="button" class="lc-mic" aria-label="用語音說"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button>':'')+
 '<button type="submit" class="lc-send">送出</button></form></section>';
 const $=s=>root.querySelector(s),log=$('.lc-log'),input=$('.lc-input'),panel=$('.lc-panel');let lastQuestion='';const policyHit=()=>typeof matchNhiProcedureCode==='function'?matchNhiProcedureCode(lastQuestion):null;const policyPage=d=>{const hit=d.id==='nhi-dentist-handbook-2026'&&policyHit();return hit&&hit.status==='found'?hit.pages[0]:1};
 function say(html,who){const el=document.createElement('div');el.className='lc-msg lc-'+(who||'bot');el.innerHTML=html;log.appendChild(el);log.scrollTop=log.scrollHeight;return el}
 function open(d){const url=urlOf(d)+(policyPage(d)>1?'&excerptPage='+policyPage(d):'');if(opt.onOpen){opt.onOpen(d,url,policyPage(d));return true}const w=window.open(url,'leyan-manual');if(w){try{w.focus()}catch{}return true}return false}
 function card(d){return '<a class="lc-doc" href="'+urlOf(d)+(policyPage(d)>1?'&excerptPage='+policyPage(d):'')+'" target="leyan-manual" data-id="'+d.id+'"><span><b>'+esc(d.title)+'</b><small>'+esc(d.description)+'</small></span></a>'+(d.id==='nhi-dentist-handbook-2026'&&policyPage(d)>1?'<small>對應摘錄第 '+policyPage(d)+' 頁；請核對原文與現行公告。</small>':'')+(OFFICIAL_URLS[d.id]?'<a class="lc-official" href="'+esc(OFFICIAL_URLS[d.id])+'" target="_blank" rel="noopener noreferrer">前往官方解鎖卡網站 ↗</a>':'')}
 function policyImage(hit){const src=BASE+'images/nhi-payment/'+hit.code+'.webp';return '<div class="lc-payment"><b>'+esc(hit.code)+' 支付標準原文截圖</b><a href="'+src+'" target="_blank" rel="noopener" aria-label="放大檢視 '+esc(hit.code)+' 原文截圖"><img src="'+src+'" alt="'+esc(hit.code)+' 的支付標準原文表格與註記" decoding="async"></a><small>摘自 2026 年牙科支付標準表第 '+hit.pages[0]+' 頁。左右滑動看完整表格，點圖可放大；實際申報請核對健保署現行公告。</small></div>'}
 function faqHtml(f){const g=FG.find(x=>x.id===f.group)||{color:'#15191E'},rel=f.doc&&pool.find(x=>x.id===f.doc);return '<div class="lc-faq" style="--c:'+g.color+'"><b>'+esc(f.title)+'</b>'+(f.text?'<p>'+esc(f.text)+'</p>':'')+(f.steps?'<ol>'+f.steps.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol>':'')+(f.id==='clear-eii'&&imageUploadRoute(lastQuestion)?.faqs?.includes('clear-eii')?'<p>清理完成後，再重新嘗試傳輸。</p>':'')+(f.img?'<a class="lc-img" href="'+BASE+'images/faq/'+f.img+'.png" target="_blank" rel="noopener"><img src="'+BASE+'images/faq/'+f.img+'.png" alt="'+esc(f.title)+' 圖卡"></a>':'')+'</div>'+(f.form?'<p><a class="lc-official" href="'+BASE+esc(f.form.url)+'" download="'+esc(f.form.filename)+'">下載空白服務事項確認單（PDF）</a></p>'+supportHtml(pet.name):'')+(f.page?'<button type="button" class="lc-choice" data-function-page="'+f.page+'">核對原手冊第 '+f.page+' 頁</button>':'')+(f.source?'<p>'+esc(f.source)+'</p>':'')+(f.sourceUrl?'<p class="lc-alt"><a href="'+esc(f.sourceUrl)+'" target="_blank" rel="noopener noreferrer">'+esc(f.sourceLabel||'查看官方原文')+' ↗</a></p>':'')+(f.docs||[]).map(id=>pool.find(d=>d.id===id)).filter(Boolean).map(d=>card(d)).join('')+(rel?'<p class="lc-alt">相關手冊：</p>'+card(rel):'')}
 function faqChoice(f){return '<button type="button" class="lc-choice" data-faq="'+esc(f.id)+'">常見問題：'+esc(f.title)+'</button>'}
 function docChoice(d){const hit=d.id==='nhi-dentist-handbook-2026'&&policyHit();const label=hit&&hit.status==='found'?`牙科支付標準：${hit.code}（摘錄第 ${hit.pages[0]} 頁）`:`操作手冊：${d.title}`;return '<button type="button" class="lc-choice" data-doc="'+esc(d.id)+'">'+esc(label)+'</button>'}
 function choices(faqs,docs){const fs=faqs.slice(0,2).map(x=>faqChoice(x.f)),ds=docs.slice(0,2).map(x=>docChoice(x.d));return fs.concat(ds).join('')}
 const indicatorRegions=[
  {name:'臺北',cities:['臺北市','新北市','基隆市','宜蘭縣','金門縣','連江縣']},
  {name:'北區',cities:['桃園市','新竹市','新竹縣','苗栗縣'],doc:'nhi-north-exemption-notes'},
  {name:'中區',cities:['臺中市','彰化縣','南投縣'],doc:'nhi-central-notes'},
  {name:'南區',cities:['雲林縣','嘉義市','嘉義縣','臺南市'],doc:'nhi-south-notes'},
  {name:'高屏',cities:['高雄市','屏東縣','澎湖縣'],doc:'nhi-kaoping-notes'},
  {name:'東區',cities:['花蓮縣','臺東縣']}
 ];
 // 依中區、南區及高屏區整理版的指標名稱，涵蓋常見縮寫與口語。
 const endoIncomplete=/未(?:完成|完)(?:比率|比例|率)|(?:根管|endo).*完成|完成.*(?:根管|endo)/;
 const namedIndicator=q=>{
  const n=norm(q);
  return endoIncomplete.test(n) || /再補率|重補率|再洗牙率|再洗牙比率|根管再治療率|醫療耗用|耗用點數|耗用值|耗格數|費用成長率|點數成長率|平均就醫次數|月最高總點數|月點數上限|全國歸戶|管控額度|輔導積分|紅單抽審|初審核減率|口檢(?:比率|占率|佔率)|雲端藥歷查詢率|影像(?:醫令)?上傳率|rbrvs|(?:od|填補|根管|困難拔牙).{0,10}(?:占率|佔率|比率|點數比|平均面數|平均填補顆數|平均顆數)|平均(?:od|填補)顆數|(?:pacs|核定電子化|總表線上確認|即時查詢|感染管制|跨區支援|牙周病統合|91022c|到宅服務|新開業|星期日看診).{0,16}(?:加分|扣分|減分|積分|計分|權值|門檻|上限|抽審)|(?:指標|積分).{0,8}s\d{1,2}|(?:^|[^a-z0-9])s(?:[1-9]|[12]\d)(?![a-z0-9])/.test(n);
 };
 const incompletePages={'nhi-central-notes':9,'nhi-south-notes':6,'nhi-kaoping-notes':8};
 const regionalIndicatorQuestion=q=>{
  const n=norm(q);
  if(/處置|支付標準|給付|醫令/.test(n) && !/指標|合理量|合理門診點數/.test(n))return false;
  if(/(?:申報|抽審|送審|輔導積分)(?:的|相關)?(?:規範|規則|規定|須知|注意事項|原則|標準)|分區(?:申報|抽審)|輔導積分/.test(n))return true;
  return /指標|管控|合理量|合理門診點數|免審|快速通關/.test(n);
 };
 const cityKey='leyan-clinic-city';
 const cityOptions=indicatorRegions.flatMap(region=>region.cities);
 let clinicCity='';
 try {const saved=localStorage.getItem(cityKey);if(cityOptions.includes(saved))clinicCity=saved}catch{}
 const cityBar=document.createElement('div');
 cityBar.className='lc-city-bar';
 $('.lc-title').after(cityBar);
 const citySelect=document.createElement('select');
 citySelect.setAttribute('aria-label','診所所在縣市');
 citySelect.add(new Option('請選診所縣市',''));
 for(const city of cityOptions)citySelect.add(new Option(city,city));
 cityBar.append(citySelect);
 citySelect.title='選擇會記在此瀏覽器。統計只計縣市與問題分類。';
 function updateCity(){
  citySelect.value=clinicCity;
  for(const field of root.querySelectorAll('.lc-form input,.lc-form button,.lc-quick button'))field.disabled=!clinicCity;
 }
 citySelect.onchange=()=>{
  resetQuery();clinicCity=citySelect.value;
  try {if(clinicCity)localStorage.setItem(cityKey,clinicCity);else localStorage.removeItem(cityKey)}catch{}
  updateCity();
  window.dispatchEvent(new Event('leyan-city-change'));
  if(clinicCity)input.focus();
 };
 updateCity();
 function countQuestion(city,category){
  if(!city)return;
  fetch('https://leyan-help-stats.leyan-help.workers.dev/question',{
   method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},
   body:JSON.stringify({city,category}),keepalive:true,credentials:'omit'
  }).catch(()=>{});
 }
 function questionCategory(faq,doc){
  const problem=typeof PROBLEM_TYPES!=='undefined'&&PROBLEM_TYPES.find(type=>
   faq?type.groups.includes(faq.group):doc&&type.cats.includes(doc.category));
  return problem?problem.name.replace(/\s/g,''):'未分類';
 }
 function taipeiIndicatorChoices(question){
  const n=norm(question);
  // 「怎看」可能是查詢報表或規範，不把它當作排除項目的確認。
  const ids=/新特約/.test(n)?['taipei-control-06','taipei-control-07','taipei-control-08']:
   /超標/.test(n)?['taipei-control-02','taipei-control-01','taipei-control-05']:
   /照片|拍照/.test(n)?['taipei-control-04','taipei-control-16']:
   /申復|申覆|申訴/.test(n)?['taipei-control-05']:
   ['taipei-control-14','taipei-control-02','taipei-control-06'];
  return ids.map(id=>FQ.find(f=>f.id===id)).filter(Boolean);
 }
 function chooseTaipeiIndicator(question){
  const faqs=[...(/怎看|怎麼看|怎麼查|哪查|在哪|指標/.test(norm(question))?[FQ.find(f=>f.id==='batch-19')]:[]),...taipeiIndicatorChoices(question)].filter(Boolean);
  say('臺北分區已有管控規範與核可問答。請先確認要查的主題，點選後才顯示內容：'+faqs.map(faqChoice).join('')+'<button type="button" class="lc-choice" data-taipei-source="1">臺北區管控作業指標規範（官方原文，114年12月23日修訂／115年1月費用起）</button><small>候選不代表已判定個案超標或排除；特定指標仍須核對原文項目與適用期間。</small>');
 }
 function chooseIndicatorCity(city,question){
  const region=indicatorRegions.find(item=>item.cities.includes(city));
  if(!region){say(supportHtml(pet.name));return}
  if(region.name==='臺北'){chooseTaipeiIndicator(question);return}
  const doc=documents.find(item=>item.id===region.doc);
  const label=region.name+(region.name.endsWith('區')?'':'區');
  if(doc){
   const page=endoIncomplete.test(norm(question))?incompletePages[doc.id]:null;
   say(esc(city)+'屬於'+label+'。請確認要查的文件，點選後才顯示內容：<button type="button" class="lc-choice" data-indicator-doc="'+esc(doc.id)+'" data-indicator-page="'+(page||'')+'">'+esc(doc.title)+(doc.title.includes(doc.kind)?'':'（'+esc(doc.kind)+'）')+'</button>');
  }else{
   say(esc(city)+'屬於'+label+'。網站目前沒有這區的指標文件，可從健保署業務組查詢。<a class="lc-official" href="https://www.nhi.gov.tw/ch/np-2334-1.html" target="_blank" rel="noopener noreferrer">健保署各區服務據點 ↗</a><small>如需協助，可輸入「轉人工」。</small>');
  }
 }
 function showIndicatorDocument(id,label,page){
  const doc=documents.find(item=>item.id===id&&item.region);
  if(!doc)return;
  const pageLabel=page?'（根管未完成率：第 '+page+' 頁）':'';
  const url=doc.url+(page?'#page='+page:'');
  if(doc.id==='nhi-north-exemption-notes'){say(esc(doc.note)+'<a class="lc-official" href="'+esc(doc.url)+'" target="_blank" rel="noopener noreferrer">開啟 '+esc(doc.title)+' PDF ↗</a><a class="lc-official" href="'+esc(doc.url)+'" download="'+esc(doc.filename)+'">下載原 PDF（14頁）</a><a class="lc-official" href="'+esc(doc.official_pdf)+'" target="_blank" rel="noopener noreferrer">引用的官方會議原文 ↗</a><a class="lc-official" href="'+esc(doc.source_page)+'" target="_blank" rel="noopener noreferrer">健保署北區公告 ↗</a>');return}
  say('這邊提供'+label+'的申報規範給您參考（'+esc(doc.kind)+'，非官方原文）。請核對文件適用期間；實際規定以官方公告為準。<a class="lc-official" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(doc.title)+pageLabel+' PDF ↗</a><a class="lc-official" href="'+esc(doc.source_page)+'" target="_blank" rel="noopener noreferrer">健保署公告 ↗</a><small>看完如果還有問題，可輸入「轉人工」。</small>');
 }
 // 新特約只列核可主題；分區文件須已確認實際含新特約段落。
 function newContractFaqs(q,city){
  const region=indicatorRegions.find(r=>r.cities.includes(city));
  const ids=['g000-no-card',...(region?.name==='臺北'?['taipei-control-06','taipei-control-07','taipei-control-08']:[])];
  const hits=ids.map(id=>FQ.find(f=>f.id===id)).filter(Boolean);
  if(/g000|欠卡|忘帶|沒帶|健保卡|取卡/i.test(q))return hits.filter(f=>f.id==='g000-no-card');
  return hits.sort((a,b)=>(a.id==='g000-no-card')-(b.id==='g000-no-card'));
 }
 function chooseNewContract(q){
  const region=indicatorRegions.find(r=>r.cities.includes(clinicCity));
  const faqs=newContractFaqs(q,clinicCity);
  const doc=!/g000|欠卡|忘帶|沒帶|健保卡|取卡/i.test(q)&&['nhi-south-notes','nhi-central-notes'].includes(region?.doc)?documents.find(d=>d.id===region.doc):null;
  say('請先確認要查的主題，點選後才顯示內容：'+faqs.map(faqChoice).join('')+(doc?'<button type="button" class="lc-choice" data-indicator-doc="'+esc(doc.id)+'" data-indicator-page="">'+esc(doc.title)+'（'+esc(doc.kind)+'；含新特約規範）</button>':'')+(!doc&&region?.name!=='臺北'?' <p>本站目前沒有'+esc((region?.name||clinicCity).replace(/區$/,''))+'區的新特約管控資料，不套用其他分區規定。可輸入「轉人工」協助確認。</p>':''));
 }
 let imageUploadPending=false;
 const appealChoice=(value,label)=>'<button type="button" class="lc-choice" data-appeal-error="'+value+'">'+label+'</button>';
 function chooseAppealError(){
  say('請選擇申覆畫面上的錯誤內容：'+appealChoice('e201','E201：附件資料未送達')+appealChoice('e300','E300')+appealChoice('e465','E465／壓縮檔錯誤')+appealChoice('other','其他錯誤／不確定'));
 }
 function chooseAppealPopup(){
  say('請先查看共通傳輸平台（小綠人）是否跳出視窗，並確認視窗上的文字：'+appealChoice('port','讀卡機 COM Port 尚未設定')+appealChoice('space','資料庫空間不足')+appealChoice('other','沒有跳出視窗／文字不同'));
 }
 function chooseXrayOpen(){
  say('請問 X 光在哪裡打不開？<button type="button" class="lc-choice" data-xray-open="system">樂晴系統內打不開，桌面可以打開</button><button type="button" class="lc-choice" data-xray-open="both">樂晴系統和桌面都打不開</button>');
 }
 function chooseImageUpload(){imageUploadPending=true;say('請問目前是哪一種情況？<button type="button" class="lc-choice" data-image-upload="missing">擷取不到照片</button><button type="button" class="lc-choice" data-image-upload="transfer">有照片，但傳輸失敗</button>');}
 function showImageUpload(kind){imageUploadPending=false;lastQuestion=kind==='missing'?'醫療影像上傳擷取不到照片':'醫療影像上傳有照片但傳輸失敗';const f=FQ.find(x=>x.id===(kind==='missing'?'image-no-photo':'clear-eii')),d=pool.find(x=>x.id==='nhi-image-upload');say('請先確認要查的主題，點選後才顯示內容：'+(f?faqChoice(f):'')+(d?docChoice(d):''));}

 let accountClinicPending=false;
 function chooseAccountClinic(){accountClinicPending=true;say('請問是牙科院所還是非牙科？<button type="button" class="lc-choice" data-account-clinic="dental">牙科院所</button><button type="button" class="lc-choice" data-account-clinic="other">非牙科院所</button>');}
 function showAccountClinic(kind){accountClinicPending=false;const f=FQ.find(x=>x.id===(kind==='dental'?'dental-daily-cash':'report-daily-receipts'));if(f)say(faqHtml(f));}
 function query(q){lastQuestion=q;const accountReply=norm(q);if(accountClinicPending&&/^(?:我是|我們是|是)?(?:非牙科|牙科)(?:院所|診所)?$/.test(accountReply)){showAccountClinic(accountReply.includes('非牙科')?'other':'dental');return}accountClinicPending=false;if(humanRequest(q)){countQuestion(clinicCity,'人工客服');say(supportHtml(pet.name));return}const route=routeQuestion(q);if(route?.type==='appeal-error'||route?.type==='appeal-e201'){countQuestion(clinicCity,'申覆上傳錯誤');if(route.type==='appeal-e201')chooseAppealPopup();else chooseAppealError();return}if(route?.type==='xray-open'){countQuestion(clinicCity,'X光開啟情境確認');chooseXrayOpen();return}if(route?.type==='image-upload'){countQuestion(clinicCity,'醫療影像上傳情境確認');chooseImageUpload();return}if(route&&route.type!=='topics'){countQuestion(clinicCity,route.type==='human'?'人工客服':'補充操作情境');say((route.message?esc(route.message):'')+(route.type==='human'?supportHtml(pet.name):''));return}if(isAccountLookup(accountReply)){countQuestion(clinicCity,'當天帳院所分流');chooseAccountClinic();return}if(/^(?:(?:請|我要|我想|幫我|可以|怎麼|如何))*(?:人工客服|轉人工(?:客服)?|找真人|找客服|聯絡客服|需要人工(?:客服)?|官方line@?|line@|客服電話)(?:嗎|在哪裡?|是多少)?$/i.test(norm(q))){countQuestion(clinicCity,'人工客服');say(supportHtml(pet.name));return}const policy=route?.faqs?.includes("ley-procedure-add")?null:policyHit();if(!policy&&norm(q).includes('新特約')){countQuestion(clinicCity,'新特約');chooseNewContract(q);return}if(!route&&!policy&&!(/報表.*(?:不見|看不到|權限)|(?:ENDO|牙統)未完成.*(?:看不到|不見)/i.test(q))&&(namedIndicator(q)||regionalIndicatorQuestion(q))){countQuestion(clinicCity,'分區管控指標');chooseIndicatorCity(clinicCity,q);return}if(policy&&policy.status!=='found'){countQuestion(clinicCity,'牙科支付標準');say(policy.status==='ambiguous'?'這組牙科處置代碼有多個尾碼，請輸入完整代碼再查詢。':'在目前的支付標準表找不到「'+esc(policy.input)+'」。請核對完整代碼（含尾碼）後再查；個案申報請由人工客服協助確認。');return}const r=rank(q),fr=policy?faqPool.filter(p=>matchesNhiProcedureFaq(policy,p.f)).map(p=>({f:p.f,score:100})):rankFaq(q).filter(x=>x.f.group!=='taipei'||indicatorRegions.find(r=>r.cities.includes(clinicCity))?.name==='臺北');
  if(!fr.length&&!r.length&&humanRequest(q)){countQuestion(clinicCity,'人工客服');say(supportHtml(pet.name));return}
  countQuestion(clinicCity,policy?'牙科支付標準':questionCategory(fr[0]?.f,r[0]?.d));
  if(!fr.length&&!r.length){say(('嗯…'+pet.name+'還不太確定你遇到的是哪個問題。請將功能、操作步驟與錯誤代碼一起輸入，我再幫你找找看！')+supportHtml(pet.name));return}
  say('我找到幾個可能的主題，請先確認妳要問的是哪一個；點選後才會顯示內容。'+choices(fr,r)+'<small class="lc-choice-hint">下一則訊息會另開查詢；請一次提供完整問題與錯誤代碼。</small>')}

 let roundEpoch=0,pendingNode=null;
 const announcer=$('.lc-announcer');
 function invalidateChoices(){for(const b of log.querySelectorAll('button'))b.disabled=true;for(const a of log.querySelectorAll('a')){a.removeAttribute('href');a.setAttribute('aria-disabled','true')}}
 function renderPending(state){
  if(!state){if(pendingNode)pendingNode.remove();pendingNode=null;return}
  if(!pendingNode){pendingNode=say('<span class="lc-clock" aria-hidden="true"></span><div class="lc-pending-body"><strong class="lc-count-label" aria-hidden="true"></strong><small></small></div><button type="button" class="lc-flush">立即查詢</button>');pendingNode.classList.add('lc-pending');pendingNode.setAttribute('aria-live','off');pendingNode.querySelector('.lc-flush').onclick=()=>batch.flush()}
  pendingNode.classList.toggle('lc-waiting',state.waiting);
  const icon=pendingNode.querySelector('.lc-clock');
  if(state.waiting){if(!icon.querySelector('.lc-sloth'))icon.innerHTML='<span class="lc-sloth">🦥</span>'}else icon.textContent=state.seconds;
  pendingNode.querySelector('.lc-count-label').textContent=state.waiting?'等你補充，還有 '+state.seconds+' 秒':state.seconds+' 秒後一起查詢';
  pendingNode.querySelector('small').textContent=state.waiting?'已延長等待，補送問題後回到 5 秒':'還可補充，送出後重新倒數';
  if(state.reason!=='tick'){log.appendChild(pendingNode);log.scrollTop=log.scrollHeight;announcer.textContent=state.waiting?'已延長等待，可補送問題或立即查詢。':'已收到問題，倒數後一起查詢。'}
 }
 const batch=createQueryBatch({start:()=>{roundEpoch++;lastQuestion='';accountClinicPending=false;imageUploadPending=false;invalidateChoices()},pending:renderPending,run:q=>{roundEpoch++;invalidateChoices();query(q);announcer.textContent='本次查詢完成，請確認顯示的主題或操作選項。'},idleWait:()=>{say('目前沒有等待中的查詢。麻煩先將問題一次輸入完整，再送出查詢。')}});
 function resetQuery(showDivider=false){batch.reset();roundEpoch++;lastQuestion='';accountClinicPending=false;imageUploadPending=false;invalidateChoices();announcer.textContent='待查已取消，可輸入新問題。';if(showDivider){input.value='';const el=say('已開始新問題。','divider');el.setAttribute('role','status')}}
 function ask(q){q=String(q).trim();if(!q)return;
  if(humanRequest(q)){say(esc(q),'user');input.value='';resetQuery();query(q);return}
  if(!clinicCity){citySelect.focus();return}
  say(esc(q),'user');input.value='';
  if(/^(?:新問題|重新開始|重置)$/.test(q)){resetQuery(true);return}
  if(/^(?:立即查詢|現在查詢)$/.test(q)){if(!batch.flush())say('目前沒有等待中的查詢，請先輸入完整問題。');return}
  // This is an answer to an explicit operational choice, not another search batch.
  if(accountClinicPending&&/^(?:我是|我們是|是)?(?:非牙科|牙科)(?:院所|診所)?$/.test(norm(q))){invalidateChoices();showAccountClinic(norm(q).includes('非牙科')?'other':'dental');return}
  if(imageUploadPending&&/^(?:是|我|我是)?(?:擷取不到照片|有照片但傳輸失敗)$/.test(norm(q))){invalidateChoices();showImageUpload(norm(q).includes('擷取不到')?'missing':'transfer');return}
  batch.submit(q);
 }
 $('.lc-new').onclick=()=>{resetQuery(true);input.focus()};
 $('.lc-human').onclick=()=>ask('人工客服');
 // ---- 小黑貓互動：閒置舔毛；對貓按右鍵（手機長按）→ 餵零食／玩逗貓棒，都在桌面上，不寫進對話 ----
 const motionOK=()=>!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
 let runnerEl=null;const catEl=()=>runnerEl?runnerEl.querySelector('.lc-cat'):root.querySelector('.lc-cat');
 let idleT=0,actT=0,acting='',lastLine=-1,lastAct=Date.now();
 const pick=a=>{let i;do{i=Math.floor(Math.random()*a.length)}while(a.length>1&&i===lastLine);lastLine=i;return a[i]};
 function endAct(){clearTimeout(actT);root.classList.remove('lc-licking','lc-feeding','lc-sleeping');acting=''}
 // 睡覺：閒置 45 秒以上就打瞌睡，冒出 Zzz；碰一下就醒
 function sleep(){const c=root.querySelector('.lc-cat');if(c&&!c.querySelector('.lc-zzz')){const NS='http://www.w3.org/2000/svg',g=document.createElementNS(NS,'g');g.setAttribute('class','lc-zzz');[[84,34,12],[94,24,15],[104,13,18]].forEach(([x,y,f],i)=>{const t=document.createElementNS(NS,'text');t.setAttribute('x',x);t.setAttribute('y',y);t.setAttribute('font-size',f);t.style.animationDelay=(i*.9)+'s';t.textContent='z';g.appendChild(t)});c.appendChild(g)}
  acting='sleep';root.classList.add('lc-sleeping')}
 function armIdle(){clearTimeout(idleT);idleT=setTimeout(()=>{if(!root.isConnected)return;if(acting||document.hidden){armIdle();return}
  if(Date.now()-lastAct>45000){sleep();return}
  if(!motionOK()){armIdle();return}
  acting='lick';root.classList.add('lc-licking');actT=setTimeout(()=>{endAct();armIdle()},2900)},10000+Math.random()*6000)}
 function wake(){lastAct=Date.now();if(acting==='sleep'){endAct();if(Math.random()<.5)petSay(Math.random()<.5?pet.wakeSay:'嗯？我醒了！',1800)}else if(acting==='lick')endAct();armIdle()}
 ['pointerdown','keydown','input'].forEach(ev=>root.addEventListener(ev,wake,true));
 // 貓旁邊的短話泡泡
 let sayEl=null,sayT=0;
 function placeSay(){if(!sayEl||!sayEl.classList.contains('on'))return;const c=catEl();if(!c)return;const r=c.getBoundingClientRect(),w=sayEl.offsetWidth,h=sayEl.offsetHeight;let l,t;
  if(runnerEl){l=r.left+r.width/2-w/2;t=r.top-h-6}else if(mode==='fab'){l=r.left-w-8;t=r.top+r.height/2-h/2;if(l<8){l=r.left+r.width/2-w/2;t=r.top-h-8}}else{l=r.left;t=r.bottom+6}
  sayEl.style.left=Math.max(8,Math.min(l,innerWidth-w-8))+'px';sayEl.style.top=Math.max(8,Math.min(t,innerHeight-h-8))+'px'}
 function petSay(text,ms){if(!sayEl){sayEl=document.createElement('div');sayEl.className='lc-pet-say';sayEl.setAttribute('role','status');document.body.appendChild(sayEl)}
  sayEl.textContent=text;sayEl.classList.add('on');placeSay();clearTimeout(sayT);sayT=setTimeout(()=>sayEl.classList.remove('on'),ms||2600)}
 // 餵零食：掉小魚、吃一口、搖尾巴、說一句話
 function feed(){if(acting==='feed'||acting==='wand')return;endAct();acting='feed';const m=motionOK();if(m)root.classList.add('lc-feeding');
  setTimeout(()=>{if(acting==='feed')petSay(pick(pet.treatSays))},m?1300:0);
  actT=setTimeout(()=>{endAct();armIdle()},m?2800:600)}
 // 玩具遊戲（全畫面）：小黑貓追逗貓棒、小貴賓追球、小白兔追草球、小熊撲魚玩偶，都是另一隻分身追著游標（手機追手指）跑，湊近就撲；
 // 小倉鼠則是滾輪跟著游標走，倉鼠跑進滾輪裡，滾輪移動越快轉得越快。
 function startWand(){
  if(!motionOK()){petSay('你的裝置設定了「減少動態效果」，'+pet.toy+'先休息'+pet.sound+'～',3200);return}
  if(acting==='wand')return;endAct();acting='wand';if(mode==='fab'&&root.close)root.close();
  const kind=TOY_SVG[pet.play]?pet.play:'wand',hang=kind==='wand'||kind==='fish',rolls=kind==='ball'||kind==='grass';
  const ov=document.createElement('div');ov.className='lc-wand-ov lc-toy-'+kind;
  ov.innerHTML='<svg aria-hidden="true">'+(kind==='wand'?'<line class="lc-w-rod" stroke="#6B4A2B" stroke-width="5" stroke-linecap="round"/>':'')+(hang?'<line class="lc-w-str" stroke="#8A9199" stroke-width="1.6"/>':'')+TOY_SVG[kind]+'</svg><button type="button" class="lc-wand-end">收起'+pet.toy+' ✕</button>';
  document.body.appendChild(ov);root.classList.add('lc-playing');
  const rod=ov.querySelector('.lc-w-rod'),str=ov.querySelector('.lc-w-str'),pomG=ov.querySelector('.lc-w-pom'),spinG=ov.querySelector('.lc-w-spin'),swayG=ov.querySelector('.lc-w-sway'),endBtn=ov.querySelector('.lc-wand-end');
  const home=root.querySelector('.lc-cat').getBoundingClientRect(),SZ=76;
  const runner=document.createElement('div');runner.className='lc-runner';runner.innerHTML='<div class="lc-runner-in"></div>';runner.firstChild.appendChild(root.querySelector('.lc-cat').cloneNode(true));ov.appendChild(runner);runnerEl=runner;
  // 球類從指標位置往下一點；吊著的玩具掛在指標下方
  const drop=hang?(kind==='fish'?44:30):0;
  const st={x:innerWidth/2,y:innerHeight*.45},pom={x:st.x,y:st.y+drop},cat={x:home.left+home.width/2,y:home.top+home.height/2};
  let raf=0,face=1,lastPounce=0,lastMove=Date.now(),spin=0,sway=0,boost=0,hop=0,inWheel=false;
  function pounce(){const n=Date.now();if(n-lastPounce<900)return;lastPounce=n;
   if(kind==='wheel'){boost=Math.min(boost+14,26);if(inWheel&&Math.random()<.6)petSay(pick(pet.toySays),1500);return}
   if(rolls)hop=1;runner.classList.remove('pounce');void runner.offsetWidth;runner.classList.add('pounce');setTimeout(()=>runner.classList.remove('pounce'),520);if(Math.random()<.45)petSay(pick(pet.toySays),1500)}
  function frame(){
   const px=pom.x,lag=kind==='wheel'?.1:rolls?.12:.16;
   pom.x+=(st.x-pom.x)*lag;pom.y+=(st.y+drop-pom.y)*lag;const dx=pom.x-px;
   if(rod){rod.setAttribute('x1',st.x);rod.setAttribute('y1',st.y);rod.setAttribute('x2',st.x+46);rod.setAttribute('y2',st.y-58)}
   if(str){str.setAttribute('x1',st.x);str.setAttribute('y1',st.y);str.setAttribute('x2',pom.x);str.setAttribute('y2',pom.y-(kind==='fish'?12:9))}
   // 球往哪邊滾就往哪邊轉；點一下會彈跳
   if(rolls){spin+=dx/14*57.3;hop=Math.max(0,hop-.04)}
   const hopY=rolls?-Math.sin(hop*Math.PI)*26:0;
   pomG.setAttribute('transform','translate('+pom.x.toFixed(1)+','+(pom.y+hopY).toFixed(1)+')');
   if(kind==='fish'){sway+=((st.x-pom.x)*.9-sway)*.15;swayG.setAttribute('transform','rotate('+Math.max(-40,Math.min(40,sway)).toFixed(1)+')')}
   let tx,ty;
   if(kind==='wheel'){tx=pom.x;ty=pom.y+14}
   else if(rolls){const side=cat.x<pom.x?-1:1;tx=pom.x+side*SZ*.5;ty=pom.y-SZ*.18}
   else{tx=pom.x;ty=pom.y+SZ*.55}
   tx=Math.max(SZ/2,Math.min(innerWidth-SZ/2,tx));ty=Math.max(SZ/2,Math.min(innerHeight-SZ/2,ty));
   const vx=tx-cat.x,vy=ty-cat.y,d=Math.hypot(vx,vy),sp=Math.min(d,Math.max(3,d*.09),11);
   if(kind==='wheel'&&inWheel){cat.x=tx;cat.y=ty}else if(d>2){cat.x+=vx/d*sp;cat.y+=vy/d*sp}
   if(kind==='wheel'){
    if(!inWheel&&d<6){inWheel=true;petSay(pick(pet.toySays),1500)}
    // 滾輪：倉鼠在裡面一直跑，滾輪移動越快、點越多下，轉得越快
    boost*=.97;const rate=inWheel?4+Math.min(14,Math.abs(dx)*1.5)+boost:0;spin+=rate;
    if(inWheel&&Math.abs(dx)>.4)face=dx>0?1:-1;else if(!inWheel&&Math.abs(vx)>6)face=vx>0?1:-1;
    runner.classList.toggle('run',inWheel||d>14);runner.style.setProperty('--run-speed',(inWheel?Math.max(.12,.3-rate/120):.28).toFixed(2)+'s');
   }else{if(Math.abs(vx)>6)face=vx>0?1:-1;runner.classList.toggle('run',d>14)}
   if(spinG){const r=kind==='wheel'?(face>0?-spin:spin):spin;spinG.setAttribute('transform','rotate('+r.toFixed(1)+')')}
   runner.style.transform='translate('+(cat.x-SZ/2).toFixed(1)+'px,'+(cat.y-SZ/2).toFixed(1)+'px)';runner.firstChild.style.transform='scaleX('+face+')'+(kind==='wheel'&&inWheel?' scale(.82)':'');
   const c=runner.querySelector('.lc-cat');c.style.setProperty('--ex',Math.max(-3,Math.min(3,(pom.x-cat.x)/60*face)).toFixed(2)+'px');c.style.setProperty('--ey',Math.max(-2,Math.min(2,(pom.y-cat.y)/80)).toFixed(2)+'px');
   const now=Date.now();if(kind!=='wheel'&&now-lastMove<600&&Math.hypot(pom.x-cat.x,pom.y-cat.y)<SZ*.9)pounce();
   if(now-lastMove>90000){end();return}
   placeSay();raf=requestAnimationFrame(frame)}
  function onKey(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();end()}}
  function end(){cancelAnimationFrame(raf);document.removeEventListener('keydown',onKey,true);ov.remove();runnerEl=null;
   root.classList.remove('lc-run','lc-pounce','lc-playing');root.style.transform='';acting='';
   setTimeout(()=>petSay('好玩～謝謝你陪我玩',2200),500);armIdle()}
  ov.addEventListener('pointermove',e=>{st.x=e.clientX;st.y=e.clientY;lastMove=Date.now()});
  ov.addEventListener('pointerdown',e=>{if(e.target===endBtn)return;st.x=e.clientX;st.y=e.clientY;lastMove=Date.now();pounce()});
  endBtn.onclick=end;document.addEventListener('keydown',onKey,true);endBtn.focus({preventScroll:true});raf=requestAnimationFrame(frame)}
 // 右鍵（手機長按）選單
 let menu=null,lp=0,lpAt=0;
 function closeMenu(){if(!menu)return;menu.remove();menu=null;document.removeEventListener('pointerdown',onDocDown,true);document.removeEventListener('keydown',onMenuKey,true);removeEventListener('blur',closeMenu);removeEventListener('scroll',closeMenu,true);removeEventListener('resize',closeMenu)}
 function onDocDown(e){if(menu&&!menu.contains(e.target))closeMenu()}
 function onMenuKey(e){if(!menu)return;const it=[...menu.querySelectorAll('button')],i=it.indexOf(document.activeElement);
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeMenu()}
  else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();it[(i+(e.key==='ArrowDown'?1:-1)+it.length)%it.length].focus()}
  else if(e.key==='Tab')closeMenu()}
 function openMenu(x,y,touch,pickPets){closeMenu();if(acting==='wand')return;
  menu=document.createElement('div');menu.className='lc-menu';menu.setAttribute('role','menu');menu.setAttribute('aria-label',pickPets?'換夥伴':pet.name);
  const items=pickPets?PET_ORDER.map(k=>['pet:'+k,PETS[k].icon+' '+PETS[k].name+(k===petKey?'　✓':'')]):[['feed',pet.treat],['wand',pet.toyMenu||'🪶 玩'+pet.toy],['pets','🐾 換夥伴']];if(!pickPets&&mode==='fab')items.push(['chat','💬 開啟對話']);
  menu.innerHTML=items.map(i=>'<button type="button" role="menuitem" data-act="'+i[0]+'">'+esc(i[1])+'</button>').join('');
  document.body.appendChild(menu);const w=menu.offsetWidth,h=menu.offsetHeight;
  menu.style.left=Math.max(8,Math.min(x,innerWidth-w-8))+'px';menu.style.top=Math.max(8,Math.min(touch?y-h-24:y,innerHeight-h-8))+'px';
  menu.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;closeMenu();const act=b.dataset.act;if(act.startsWith('pet:'))setPet(act.slice(4));else if(act==='pets')openMenu(x,y,touch,true);else if(act==='feed')feed();else if(act==='wand')startWand();else{const f=root.querySelector('.lc-fab');if(f)f.click()}});
  document.addEventListener('pointerdown',onDocDown,true);document.addEventListener('keydown',onMenuKey,true);addEventListener('blur',closeMenu);addEventListener('scroll',closeMenu,true);addEventListener('resize',closeMenu);
  menu.querySelector('button').focus()}
 const petHit=t=>t.closest&&t.closest('.lc-cat,.lc-fab');
 root.addEventListener('contextmenu',e=>{if(!petHit(e.target))return;e.preventDefault();clearTimeout(lp);
  let x=e.clientX,y=e.clientY;if(!x&&!y){const r=catEl().getBoundingClientRect();x=r.left+r.width/2;y=r.top+r.height/2}openMenu(x,y,false)});
 root.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||!petHit(e.target))return;const x=e.clientX,y=e.clientY;clearTimeout(lp);lp=setTimeout(()=>{lpAt=Date.now();openMenu(x,y,true)},550);
  const stop=ev=>{if(ev.type==='pointermove'&&Math.hypot(ev.clientX-x,ev.clientY-y)<10)return;clearTimeout(lp);['pointermove','pointerup','pointercancel'].forEach(t=>root.removeEventListener(t,stop))};
  ['pointermove','pointerup','pointercancel'].forEach(t=>root.addEventListener(t,stop))});
 root.addEventListener('click',e=>{if(Date.now()-lpAt<800){e.stopPropagation();e.preventDefault()}},true);
 // 換夥伴：換掉畫面上的動物、標題與說話方式，並記住選擇
 function setPet(k){if(!PETS[k])return;endAct();root.querySelectorAll('.lc-zzz').forEach(z=>z.remove());
  petKey=k;pet=PETS[k];root.dataset.pet=k;try{localStorage.setItem(PET_KEY,k)}catch{}setTitle();
  root.querySelectorAll('.lc-cat').forEach(el=>{el.insertAdjacentHTML('afterend',pet.svg);el.remove()});
  const t=root.querySelector('.lc-title');if(t)t.textContent=pet.name;const noticeName=root.querySelector('.lc-notice-name');if(noticeName)noticeName.textContent=pet.name;
  panel.setAttribute('aria-label',pet.name+'助手');const f=root.querySelector('.lc-fab');if(f)f.setAttribute('aria-label','開啟'+pet.name+'助手');
  lastAct=Date.now();armIdle();petSay(pet.hello,2400)}
 const swapBtn=root.querySelector('.lc-swap');
 if(swapBtn)swapBtn.addEventListener('click',()=>{const r=swapBtn.getBoundingClientRect();openMenu(r.left,r.bottom+4,false,true)});
 armIdle();
 root.addEventListener('click',e=>{
  if(e.target.closest('button:disabled,[aria-disabled="true"]')){e.preventDefault();return}const ib=e.target.closest('[data-indicator-doc]');if(ib){const region=indicatorRegions.find(item=>item.cities.includes(clinicCity));if(!region)return;if(region.doc!==ib.dataset.indicatorDoc){chooseIndicatorCity(clinicCity,lastQuestion);return}const page=Number(ib.dataset.indicatorPage)||null;showIndicatorDocument(region.doc,region.name+(region.name.endsWith('區')?'':'區'),page===incompletePages[region.doc]?page:null);return}
  const tb=e.target.closest('[data-taipei-source]');if(tb){const region=indicatorRegions.find(r=>r.cities.includes(clinicCity));if(region?.name!=='臺北'){chooseIndicatorCity(clinicCity,lastQuestion);return}const source=FQ.find(f=>f.id==='taipei-control-14');if(source?.sourceUrl)say('臺北分區官方原文；請核對實際指標及適用期間。<a class="lc-official" href="'+esc(source.sourceUrl.replace(/#.*$/,''))+'" target="_blank" rel="noopener noreferrer">臺北區管控作業指標規範 PDF ↗</a>');return}
  const appeal=e.target.closest('[data-appeal-error]');
  if(appeal){
   invalidateChoices();
   const verify='<p>處理完成後，請確認申覆附件是否已上傳成功；若確認尚未上傳，才需要重新上傳。</p>';
   switch(appeal.dataset.appealError){
    case 'e201':chooseAppealPopup();break;
    case 'e300':
    case 'e465':say(faqHtml(FQ.find(f=>f.id===appeal.dataset.appealError)));break;
    case 'port':{
     const src=BASE+'images/faq/e201-com-port.jpg';
     say('請依圖在小綠人的【系統設定】確認讀卡機連接 COM Port。<a class="lc-img" href="'+src+'" target="_blank" rel="noopener"><img src="'+src+'" alt="讀卡機 COM Port 設定圖卡"></a>'+verify);
     break;
    }
    case 'space':say(faqHtml(FQ.find(f=>f.id==='clear-eii'))+verify);break;
    default:say('如果沒有視窗或顯示其他錯誤，請洽真人客服協助確認。'+supportHtml(pet.name));
   }
   return;
  }
  const xr=e.target.closest('[data-xray-open]');
  if(xr){
   invalidateChoices();
   say(xr.dataset.xrayOpen==='system'?'桌面可開啟，但樂晴系統內無法開啟，請洽真人客服。'+supportHtml(pet.name):'樂晴系統和桌面都打不開，請聯絡診所使用的 X 光廠商協助。');
   return;
  }
  const iu=e.target.closest('[data-image-upload]');if(iu){if(!imageUploadPending)return;invalidateChoices();showImageUpload(iu.dataset.imageUpload);return}const ac=e.target.closest('[data-account-clinic]');if(ac){if(!accountClinicPending)return;invalidateChoices();showAccountClinic(ac.dataset.accountClinic);return}const fp=e.target.closest('[data-function-page]');if(fp){const d=pool.find(x=>x.id==='leyizhi-backend'),p=Number(fp.dataset.functionPage);if(d){if(opt.onOpen)opt.onOpen(d,BASE+d.url,p);else window.open(BASE+'index.html?manual=leyizhi-backend&page='+p,'_blank','noopener')}return}const fb=e.target.closest('[data-faq]');if(fb){const f=FQ.find(x=>x.id===fb.dataset.faq);if(f){if(f.group==='taipei'&&indicatorRegions.find(r=>r.cities.includes(clinicCity))?.name!=='臺北'){chooseIndicatorCity(clinicCity,lastQuestion);return}if(norm(lastQuestion).includes('新特約')&&!newContractFaqs(lastQuestion,clinicCity).some(x=>x.id===f.id)){chooseNewContract(lastQuestion);return}say(faqHtml(f))}return}const db=e.target.closest('[data-doc]');if(db){const d=pool.find(x=>x.id===db.dataset.doc);if(d){const hit=d.id==='nhi-dentist-handbook-2026'&&policyHit();say(hit&&hit.status==='found'?policyImage(hit):'妳選的是這份手冊；點開即可查看內容：'+card(d))}return}const a=e.target.closest('.lc-doc');if(a&&opt.onOpen){e.preventDefault();const d=pool.find(x=>x.id===a.dataset.id);if(d)open(d);return}const q=e.target.closest('[data-q]');if(q)ask(q.dataset.q)});
 $('.lc-form').onsubmit=e=>{e.preventDefault();ask(input.value)};
 async function look(file){const city=clinicCity,epoch=roundEpoch;if(!city){citySelect.focus();return}if(!file||!/^image\//.test(file.type))return;const url=URL.createObjectURL(file);say('<img class="lc-shot" src="'+url+'" alt="你傳的截圖">','user');
  const wait=say('我看一下畫面喔…'+(ocrWorker?'':'<br><small>第一次要下載辨識程式，大約 10～20 秒，之後就很快。圖片只在你的電腦上辨識，不會上傳。</small>'));
  let text='',how='';try{const r=await ocr(file);text=r.t;how=r.how}catch(e){countQuestion(city,'未分類');wait.innerHTML=pet.sound+'…沒辦法辨識這張圖（可能是網路擋住了辨識程式）。可以直接打字告訴我畫面上的錯誤代碼或訊息。';return}
  if(how==='unclear'){countQuestion(city,'未分類');wait.innerHTML='我有看到錯誤視窗，但上面的數字看不清楚 😿<br>請直接<b>打出視窗上的錯誤代碼</b>（例如 5022），我再列出可能的主題讓你確認。';log.scrollTop=log.scrollHeight;return}
  if(city!==clinicCity||epoch!==roundEpoch){wait.innerHTML='縣市已切換，請依目前縣市重新輸入問題。';return}
  // Never treat a partial four-digit OCR hit as a five-digit medical procedure.
  const recognized=String(text).replace(/([\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])/g,'$1').trim();
  wait.innerHTML='辨識文字僅供核對，請修正後按「用這段文字查詢」，再確認候選主題。<br><textarea class="lc-ocr-text" aria-label="核對或修正辨識文字" rows="3" style="width:100%;box-sizing:border-box"></textarea><button type="button" class="lc-choice lc-ocr-query">用這段文字查詢</button><small>看不清楚時，可直接改填醫令代碼（如 92133C、91021）或問題文字；圖片不會上傳。</small>';
  wait.querySelector('textarea').value=recognized;
  wait.querySelector('button').onclick=()=>{const q=wait.querySelector('textarea').value.trim();if(epoch!==roundEpoch||city!==clinicCity)return;if(q)ask(q);else wait.querySelector('textarea').focus()};
  log.scrollTop=log.scrollHeight}

 // Use the native file control directly, including in Edge app windows.
 const fileIn=$('.lc-file');fileIn.onchange=()=>{look(fileIn.files[0]);fileIn.value=''};
 root.addEventListener('paste',e=>{const it=[...(e.clipboardData||{}).items||[]].find(x=>x.type&&x.type.startsWith('image/'));if(it){e.preventDefault();look(it.getAsFile())}});
 panel.addEventListener('dragover',e=>{e.preventDefault();panel.classList.add('lc-drop')});panel.addEventListener('dragleave',()=>panel.classList.remove('lc-drop'));
 panel.addEventListener('drop',e=>{e.preventDefault();panel.classList.remove('lc-drop');const f=[...e.dataTransfer.files].find(x=>x.type.startsWith('image/'));if(f)look(f)});
 if(mode==='fab'){const fab=$('.lc-fab');const toggle=on=>{panel.hidden=!on;fab.setAttribute('aria-expanded',on);root.classList.toggle('lc-open',on);if(on)(clinicCity?input:citySelect).focus();else fab.focus()};fab.onclick=()=>toggle(panel.hidden);$('.lc-close').onclick=()=>toggle(false);root.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)toggle(false)});root.close=()=>{if(!panel.hidden)toggle(false)}}
 if(SR){const mic=$('.lc-mic');let rec=null;mic.onclick=()=>{if(rec){rec.stop();return}rec=new SR();rec.lang='zh-TW';rec.interimResults=true;rec.maxAlternatives=1;let final='';mic.classList.add('on');mic.setAttribute('aria-label','停止語音');input.placeholder='請說話…';
  rec.onresult=ev=>{let t='';for(const r of ev.results){t+=r[0].transcript;if(r.isFinal)final=t}input.value=t};
  rec.onerror=ev=>{if(ev.error==='not-allowed')say('需要允許麥克風權限才能用語音喔。也可以直接打字。')};
  rec.onend=()=>{mic.classList.remove('on');mic.setAttribute('aria-label','用語音說');input.placeholder=lcHint();rec=null;if((final||input.value).trim())ask(final||input.value)};
  try{rec.start()}catch{rec=null;mic.classList.remove('on')}}}
 return root}
window.LeyanCat={createQueryBatch,isWaitCommand,mount,rank,rankFaq,routeQuestion,analyzeScreen,isAccountLookup,_ocrPrep:{findDialog,prepCrop,popupCode}};
})();
