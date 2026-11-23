// 點擊可愛特效：點按鈕、卡片、問題時，從點的位置放出小特效。
// 只是裝飾：不攔截點擊、不擋畫面；開了「減少動態效果」就不播放。
// 樣式：cute（腳印愛心星星）、firework（煙火）、confetti（彩色紙片）、bubble（泡泡）、heart（愛心飄起）
// 想先試別的樣式，可在網址後面加 ?fx=firework 之類的參數。
(function(){
 const STYLE_DEFAULT='bubble';
 const STYLES=['cute','firework','confetti','bubble','heart'];
 const q=new URLSearchParams(location.search).get('fx');
 let style=STYLES.includes(q)?q:STYLE_DEFAULT;
 const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)');
 const TARGET='button,a[href],summary,[role="button"],[role="menuitem"],.type-btn,.tab,.faq-more,.line-btn';
 const css=document.createElement('style');
 css.textContent='.cfx{position:fixed;left:0;top:0;z-index:10000;pointer-events:none;will-change:transform,opacity;user-select:none}'+
  '.cfx-bit{font-size:18px;line-height:1}'+
  '.cfx-ring{z-index:9999;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;border:3px solid #FF8FB1}'+
  '.cfx-dot{width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%}'+
  '.cfx-paper{width:7px;height:11px;margin:-5px 0 0 -3px;border-radius:2px}'+
  '.cfx-bubble{border-radius:50%;border:2px solid #7FB8F0;background:radial-gradient(circle at 32% 30%,#fff 0 18%,#CFE6FF66 19% 60%,#9FCBF533 61%)}';
 document.head.appendChild(css);
 const rnd=(a,b)=>a+Math.random()*(b-a);
 function spawn(cls,styleText){const el=document.createElement('span');el.className='cfx '+cls;el.setAttribute('aria-hidden','true');if(styleText)el.style.cssText=styleText;document.body.appendChild(el);return el}
 const go=(el,frames,opt)=>{el.animate(frames,opt).onfinish=()=>el.remove()};
 const T=(x,y,extra)=>'translate('+x.toFixed(1)+'px,'+y.toFixed(1)+'px)'+(extra||'');
 function ring(x,y,color){const r=spawn('cfx-ring');if(color)r.style.borderColor=color;go(r,[{transform:T(x,y,' scale(.4)'),opacity:.9},{transform:T(x,y,' scale(4.2)'),opacity:0}],{duration:520,easing:'cubic-bezier(.2,.7,.3,1)'})}
 const FX={
  // 腳印、愛心、星星噴出去
  cute(x,y){ring(x,y);const BITS=['🐾','💖','✨','⭐','🐾','💕','🌸'],n=7,start=rnd(0,Math.PI*2);
   for(let i=0;i<n;i++){const el=spawn('cfx-bit');el.textContent=BITS[(i+Math.floor(rnd(0,BITS.length)))%BITS.length];
    const a=start+i*(Math.PI*2/n)+rnd(-.25,.25),d=rnd(34,60),dx=Math.cos(a)*d,dy=Math.sin(a)*d-14,rot=rnd(-35,35),s=rnd(.7,1.2),w=9;
    go(el,[{transform:T(x-w,y-w,' scale(.2)'),opacity:1},{transform:T(x-w+dx,y-w+dy,' scale('+s+') rotate('+rot+'deg)'),opacity:1,offset:.55},{transform:T(x-w+dx*1.15,y-w+dy+18,' scale('+s*.8+') rotate('+rot*1.4+'deg)'),opacity:0}],{duration:rnd(760,960),easing:'cubic-bezier(.2,.8,.3,1)'})}},
  // 煙火：一圈彩色火花炸開、受重力往下掉，再閃幾顆小星星
  firework(x,y){const PAL=[['#FF4D6D','#FFB3C1'],['#FFB703','#FFE08A'],['#4CC9F0','#B8ECFA'],['#80ED99','#D3F8DC'],['#B388FF','#E2D4FF']],[c1,c2]=PAL[Math.floor(rnd(0,PAL.length))];
   ring(x,y,c1);const n=22;
   for(let i=0;i<n;i++){const a=i*(Math.PI*2/n)+rnd(-.12,.12),v=rnd(55,95),c=i%3?c1:c2,el=spawn('cfx-dot','background:'+c+';box-shadow:0 0 6px '+c+',0 0 2px #fff');
    const pts=[0,.25,.5,.75,1].map(t=>{const e=1-Math.pow(1-t,2.2);return{x:x+Math.cos(a)*v*e,y:y+Math.sin(a)*v*e+60*t*t}});
    go(el,pts.map((p,k)=>({transform:T(p.x,p.y,' scale('+(k===0?.6:1.1-k*.2)+')'),opacity:k===4?0:1,offset:k/4})),{duration:rnd(900,1200),easing:'linear'})}
   for(let i=0;i<6;i++){const el=spawn('cfx-bit');el.textContent='✨';el.style.fontSize='13px';const sx=x+rnd(-70,70)-6,sy=y+rnd(-60,40)-6;
    go(el,[{transform:T(sx,sy,' scale(0)'),opacity:0},{transform:T(sx,sy,' scale(1.1)'),opacity:1,offset:.5},{transform:T(sx,sy+6,' scale(0)'),opacity:0}],{duration:rnd(500,800),delay:rnd(250,550),easing:'ease-out',fill:'backwards'})}},
  // 彩色紙片往上噴再飄落
  confetti(x,y){const PAL=['#FF6B8B','#FFC145','#5DD39E','#58A6FF','#B48CFF','#FF8FB1'];
   for(let i=0;i<18;i++){const el=spawn('cfx-paper','background:'+PAL[i%PAL.length]);const dx=rnd(-80,80),up=rnd(50,100),r1=rnd(-200,200);
    go(el,[{transform:T(x,y,' rotate(0deg)'),opacity:1},{transform:T(x+dx*.6,y-up,' rotate('+r1*.5+'deg)'),opacity:1,offset:.35},{transform:T(x+dx,y-up+90,' rotate('+r1+'deg) rotateX(540deg)'),opacity:0}],{duration:rnd(1000,1400),easing:'cubic-bezier(.15,.6,.4,1)'})}},
  // 泡泡：4 顆藍色系泡泡，第一顆包著小腳印或星星，邊飄邊QQ晃動，最後啵一下變成小亮點
  bubble(x,y){const PAL=['#6FC3F7','#9ED8FF','#4FA8E8','#8FE0F0','#B3D4FF'],INSIDE=['🐾','⭐'];
   for(let i=0;i<4;i++){const s=rnd(18,32),c=PAL[Math.floor(rnd(0,PAL.length))],c2=PAL[Math.floor(rnd(0,PAL.length))];
    const el=spawn('cfx-bubble','width:'+s+'px;height:'+s+'px;margin:'+(-s/2)+'px 0 0 '+(-s/2)+'px;border-color:'+c+';background:radial-gradient(circle at 30% 28%,#fff 0 14%,transparent 15%),radial-gradient(circle at 68% 72%,#ffffffcc 0 6%,transparent 7%),radial-gradient(circle at 50% 50%,#ffffff22 0 55%,'+c+'55 80%,'+c2+'66 100%);box-shadow:0 0 8px '+c+'66');
    if(i===0){const k=document.createElement('span');k.textContent=INSIDE[Math.floor(rnd(0,INSIDE.length))];k.style.cssText='position:absolute;inset:0;display:grid;place-items:center;font-size:'+(s*.45).toFixed(0)+'px;line-height:1';el.appendChild(k)}
    const order=[0,2,1,3][i],dx=(-90+order*60)+rnd(-12,12),up=rnd(80,150),sw=rnd(8,14)*(Math.random()<.5?-1:1),dur=rnd(1300,1700),delay=i*110;
    const P=(t,xo,sx,sy,o)=>({transform:T(x+dx*t+xo,y-up*t,' scale('+sx+','+sy+')'),opacity:o,offset:t});
    go(el,[P(0,0,.2,.2,0),P(.12,sw*.3,1.1,.9,1),P(.3,sw,.94,1.08,1),P(.5,-sw*.6,1.07,.95,1),P(.7,sw*.5,.96,1.05,1),P(.9,-sw*.3,1.03,.98,1),P(1,0,1.35,1.35,0)],{duration:dur,delay,easing:'ease-out',fill:'backwards'});
    // 啵！破掉的地方冒出 4 顆小亮點
    setTimeout(()=>{const px=x+dx,py=y-up;for(let j=0;j<4;j++){const a=j*Math.PI/2+Math.PI/4,d=s*.7,dot=spawn('cfx-dot','background:'+c+';width:5px;height:5px');
      go(dot,[{transform:T(px,py,' scale(1)'),opacity:1},{transform:T(px+Math.cos(a)*d,py+Math.sin(a)*d,' scale(.3)'),opacity:0}],{duration:320,easing:'ease-out'})}},delay+dur*.92)}},
  // 愛心一顆顆往上飄
  heart(x,y){const H=['💖','💗','💕','💓','🩷'];for(let i=0;i<6;i++){const el=spawn('cfx-bit');el.textContent=H[i%H.length];const dx=rnd(-36,36),up=rnd(60,110),w=9;
    go(el,[{transform:T(x-w,y-w,' scale(.3)'),opacity:0},{transform:T(x-w+dx*.4,y-w-up*.3,' scale(1.1)'),opacity:1,offset:.25},{transform:T(x-w+dx,y-w-up,' scale(.8) rotate('+rnd(-20,20)+'deg)'),opacity:0}],{duration:rnd(900,1200),delay:i*60,easing:'ease-out',fill:'backwards'})}}
 };
 let last=0;
 document.addEventListener('pointerdown',e=>{
  if(reduce&&reduce.matches)return;
  if(e.button!==0)return;
  const t=e.target.closest&&e.target.closest(TARGET);if(!t||t.disabled)return;
  if(t.closest('.lc-wand-ov'))return; // 玩逗逗棒時不放特效
  const now=Date.now();if(now-last<120)return;last=now;
  FX[style](e.clientX,e.clientY);
 },{passive:true,capture:true});
 window.LeyanClickFx={styles:STYLES,set(s){if(FX[s])style=s},play(s,x,y){(FX[s]||FX[style])(x,y)}};
})();
