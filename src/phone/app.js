/* 今天干嘛 · 手机版 app.js
   Step 1（已完成）：四个滚轮（上午玩 / 中午吃 / 下午玩 / 晚上吃）→ 摇 → 出结果。
   Step 2（已完成）：点"看今天的安排"→ 底部升起卡片，摊开一整天的 5 站
                    （上午玩 / 午饭 / 下午玩 / 晚饭 / 晚上，后两站自动补）。 */
(function(){
'use strict';

/* ===================== 常量 ===================== */
var KEY = 'jtmgz_phone_v1';
var CITY = ['锦江','青羊','金牛','武侯','成华','高新','天府'];

var IC_PLAY = '<svg viewBox="0 0 24 24"><path d="M2.5 20L9 7.5l4.2 7.2L16.4 10 22 20H2.5Z" fill="currentColor"/></svg>';
var IC_EAT  = '<svg viewBox="0 0 24 24"><path d="M2 11.5h20a10 10 0 0 1-20 0Z" fill="currentColor"/><path d="M9 3.5v5M12 2.5v6M15 3.5v5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" fill="none"/></svg>';
var IC_BOOK = '<svg viewBox="0 0 24 24"><path d="M4 4.5h6a3 3 0 0 1 3 3v12a2.4 2.4 0 0 0-2.4-2.4H4V4.5Z" fill="currentColor"/><path d="M20 4.5h-6a3 3 0 0 0-3 3v12a2.4 2.4 0 0 1 2.4-2.4H20V4.5Z" fill="currentColor" opacity=".5"/></svg>';
var IC_MOON = '<svg viewBox="0 0 24 24"><path d="M15.5 2.5a9.5 9.5 0 1 0 6 15.2A8 8 0 0 1 15.5 2.5Z" fill="currentColor"/></svg>';
var IC_SPORT= '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 3v18M3.5 12h17" stroke="currentColor" stroke-width="1.5" opacity=".55"/></svg>';

/* Q 版糖果色，跟 style.css 里的 --pink/--orange/... 一套 */
var RAMP = ['#FF7A9C','#FF9F45','#FFC93C','#38C6D9','#7C6BF0','#5AC878','#FF6B5A'];

var BOOK_SUBS  = ['书店','展览','博物馆'];
var NIGHT_SUBS = ['夜生活','演出','酒吧'];
var SPORT_SUBS = ['运动'];
var LIGHT_SUBS = ['甜品','咖啡','茶'];                                   /* 不适合当正餐 */
var FULL_SUBS  = ['火锅','串串','川菜','家常','面食','烧烤','夜宵','异国','粤菜','日料','韩餐','西餐','素食','早餐','不限'];

/* ===================== 状态 ===================== */
function defState(){
  return { recent:[], banned:[], fav:[], mute:false, rolls:[null,null,null,null], spins:0, nightId:null };
}
var S = defState();

function load(){
  try{
    var raw = localStorage.getItem(KEY);
    if(!raw) return;
    var o = JSON.parse(raw), d = defState();
    for(var k in d){ if(o[k]!==undefined) d[k] = o[k]; }
    S = d;
  }catch(e){ S = defState(); }
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} }

/* ===================== 数据 ===================== */
var LIB = [];
var IDX = {};                       /* id -> item，用来把上次存的结果还原回来 */
function mk(name,type,sub,area,price,dur,tags,tip,id){
  return {
    id:id, name:name, type:type, sub:sub, area:area,
    price:price||2, dur:dur||2,
    tags:String(tags||'').split(',').map(function(s){ return s.trim(); }).filter(Boolean),
    tip:tip||''
  };
}
function buildLib(){
  var raw = window.POOL_RAW || [];
  LIB = raw.map(function(r,i){ return mk(r[0],r[1],r[2],r[3],r[4],r[5],r[6],r[7],'L'+i); });
  IDX = {};
  LIB.forEach(function(it){ IDX[it.id] = it; });
}
function byId(id){ return IDX[id] || null; }
function hasTag(it,t){ return it.tags.indexOf(t)>=0; }
function subIn(it,arr){ return arr.indexOf(it.sub)>=0; }
function isNightOnly(it){ return hasTag(it,'夜生活') || it.sub==='酒吧' || it.sub==='夜生活'; }
function isFav(id){ return S.fav.indexOf(id)>=0; }

/* ===================== 抽取 ===================== */
function soft(list,fn,min){
  var f = list.filter(fn);
  return f.length >= (min||6) ? f : list;
}
function relaxed(type,skip){
  skip = skip||[];
  var p = LIB.filter(function(it){
    return it.type===type && skip.indexOf(it.id)<0 && S.banned.indexOf(it.id)<0;
  });
  if(!p.length) p = LIB.filter(function(it){ return it.type===type; });
  /* 优先市内（"不限"也算），够多就只用市内的 */
  p = soft(p, function(it){ return it.area==='不限' || CITY.indexOf(it.area)>=0; }, 8);
  /* 优先最近没摇到过的，避免连着重复 */
  p = soft(p, function(it){ return S.recent.indexOf(it.id)<0; }, 8);
  return p;
}
function weighted(p){
  if(!p || !p.length) return null;
  var tot=0, w=[];
  for(var i=0;i<p.length;i++){ var x = isFav(p[i].id)?3:1; w.push(x); tot+=x; }
  var r = Math.random()*tot;
  for(var j=0;j<p.length;j++){ r -= w[j]; if(r<=0) return p[j]; }
  return p[p.length-1];
}
function playPool(skip,morning){
  var p = relaxed('p', skip);
  p = soft(p, function(it){ return !isNightOnly(it); }, 6);              /* 白天不摇夜店/酒吧 */
  /* "住一晚"这类整日项目塞不进一天的五个格子，直接排除 */
  p = soft(p, function(it){ return (it.dur||2) < 12; }, 6);
  /* 上午的项目别太长，否则"午饭"要排到下午去 */
  if(morning) p = soft(p, function(it){ return (it.dur||2) <= 3; }, 6);
  /* 下午可以长一点，但别长到把晚上拖进后半夜 */
  else        p = soft(p, function(it){ return (it.dur||2) <= 5; }, 6);
  return p;
}
function mealPool(skip,isLunch){
  var p = relaxed('e', skip);
  p = soft(p, function(it){ return FULL_SUBS.indexOf(it.sub)>=0; }, 8);
  p = soft(p, function(it){ return LIGHT_SUBS.indexOf(it.sub)<0; }, 8);   /* 甜品/咖啡/茶 不当正餐 */
  p = soft(p, function(it){ return it.sub!=='酒吧'; }, 6);                /* 酒吧不算"吃" */
  if(isLunch){
    p = soft(p, function(it){ return !hasTag(it,'夜宵'); }, 8);           /* 中午别排夜宵 */
  }
  return p;
}
function pickPlay(skip,morning){ return weighted(playPool(skip,morning)); }
function pickMeal(skip,isLunch){ return weighted(mealPool(skip,isLunch)); }
/* 晚上那一站：只从"夜里才成立"的条目里挑（酒吧 / 夜生活 / 演出） */
function pickNight(skip){
  skip = skip||[];
  var p = LIB.filter(function(it){
    return isNightOnly(it) && skip.indexOf(it.id)<0 && S.banned.indexOf(it.id)<0;
  });
  if(p.length < 3) p = LIB.filter(function(it){ return isNightOnly(it) && skip.indexOf(it.id)<0; });
  if(!p.length)    p = LIB.filter(function(it){ return isNightOnly(it); });
  return weighted(p);
}

/* 某一列该从哪个池子里取（静置铺底和滚动填充都用它，跟正式摇的逻辑保持一致，
   否则「中午吃」那列会飘出酒吧） */
function reelPool(el){
  var label = el.getAttribute('data-label');
  if(el.getAttribute('data-type') === 'e') return mealPool([], label === '中午吃');
  return playPool([], label === '上午玩');
}

/* ===================== 小工具 ===================== */
function esc(s){
  return String(s==null?'':s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
function colorOf(it){
  var s = it.sub||'x', h = 0;
  for(var i=0;i<s.length;i++) h = (h*31 + s.charCodeAt(i)) >>> 0;
  return RAMP[h % RAMP.length];
}
function iconOf(it){
  if(subIn(it,BOOK_SUBS))  return IC_BOOK;
  if(subIn(it,NIGHT_SUBS)) return IC_MOON;
  if(subIn(it,SPORT_SUBS)) return IC_SPORT;
  return it.type==='e' ? IC_EAT : IC_PLAY;
}
var tTimer=null;
function toast(m){
  var t = document.getElementById('toast');
  t.textContent = m;
  t.classList.add('on');
  clearTimeout(tTimer);
  tTimer = setTimeout(function(){ t.classList.remove('on'); }, 2000);
}

/* ===================== 音效（可关） ===================== */
var AC = null;
function ac(){
  if(AC === null){
    try{ AC = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(e){ AC = false; }
  }
  if(AC && AC.state === 'suspended'){ try{ AC.resume(); }catch(e){} }
  return AC || null;
}
function beep(f,dur,type,vol,delay){
  if(S.mute) return;
  var c = ac(); if(!c) return;
  try{
    var t0 = c.currentTime + (delay||0);
    var o = c.createOscillator(), g = c.createGain();
    o.type = type||'sine';
    o.frequency.setValueAtTime(f, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol||0.05, t0+0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0+dur+0.03);
  }catch(e){}
}
function sfxStart(){
  beep(300,0.08,'triangle',0.045,0);
  beep(400,0.08,'triangle',0.04,0.10);
  beep(520,0.10,'triangle',0.035,0.20);
}
function sfxStop(i){
  beep(620 + i*130, 0.09, 'square', 0.030, 0);
}
function sfxWin(){
  beep(784,0.15,'sine',0.070,0);
  beep(1046,0.16,'sine',0.055,0.09);
  beep(1318,0.30,'sine',0.040,0.18);
}
function vib(p){ if(navigator.vibrate){ try{ navigator.vibrate(p); }catch(e){} } }

/* ===================== 滚轮渲染 ===================== */
function reelEls(){ return Array.prototype.slice.call(document.querySelectorAll('#reels .reel')); }
function rowH(){
  var r = reelEls()[0];
  return r ? Math.round(r.clientHeight) : 168;
}
function cellHTML(it){
  if(!it) return '<div class="cell blank"><div class="badge"></div><div class="nm">—</div></div>';
  var c = colorOf(it);
  return '<div class="cell">'+
    '<div class="badge" style="background:radial-gradient(circle at 34% 28%, rgba(255,255,255,.5), rgba(255,255,255,0) 64%), '+c+';color:#fff">'+iconOf(it)+'</div>'+
    '<div class="nm">'+esc(it.name)+'</div>'+
    '<div class="tg">'+esc(it.sub)+'</div>'+
    /* 区域标签永远渲染：没有固定地点的（"不限"）留空占位，否则各列内容会上下错开 */
    (it.area && it.area!=='不限'
      ? '<div class="area">'+esc(it.area)+'</div>'
      : '<div class="area" style="visibility:hidden">·</div>')+
  '</div>';
}
function fillStrip(el,seq){
  el.innerHTML = seq.map(function(x){ return cellHTML(x); }).join('');
}
/* 初始静置：每格先塞几个真实条目，看着像台老虎机，而不是空窗口 */
function idleReels(){
  var els = reelEls(), H = rowH();
  els.forEach(function(el){
    var src = reelPool(el);
    if(!src.length) src = LIB;
    var seq = [];
    for(var k=0;k<8;k++) seq.push(src[Math.floor(Math.random()*src.length)]);
    fillStrip(el.querySelector('.strip'), seq);
    el.querySelector('.strip').style.transition = 'none';
    el.querySelector('.strip').style.transform = 'translateY(' + (-(2+Math.floor(Math.random()*3))*H) + 'px)';
  });
}
function rollReel(el,item,dur){
  var strip = el.querySelector('.strip');
  var H = rowH();
  var src = reelPool(el);
  if(!src.length) src = [item];
  var seq = [];
  for(var i=0;i<16;i++) seq.push(src[Math.floor(Math.random()*src.length)]);
  seq.push(item);
  fillStrip(strip, seq);
  strip.classList.add('moving');                              /* 转的时候加运动模糊 */
  strip.style.transition = 'none';
  strip.style.transform  = 'translateY(0px)';
  void strip.offsetHeight;                                   /* 强制回流，否则不animate */
  strip.style.transition = 'transform ' + dur + 's cubic-bezier(.13,.75,.24,1)';
  strip.style.transform  = 'translateY(' + (-(seq.length-1)*H) + 'px)';
  setTimeout(function(){ strip.classList.remove('moving'); }, dur*1000 + 40);
}

/* ===================== 摇 ===================== */
/* 一整天四格：上午玩 / 中午吃 / 下午玩 / 晚上吃
   格子的 data-type 顺序必须是 p e p e —— 改这里就要改 tpl.html 里的 .reel */
var SLOT_LUNCH = 1, SLOT_DINNER = 3;
var rolls = [null,null,null,null];
var rolling = false;
var spun = false;

/* 横幅一句话（招牌下面那行字） */
function setBanner(txt,pop){
  var b = document.getElementById('banner');
  if(!b) return;
  b.textContent = txt;
  if(pop){ b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
}
/* 主按钮里那行字（按钮里还有个小骰子，别整个 textContent 覆盖掉） */
function spinLabel(txt){
  var t = document.querySelector('#btnPull .txt');
  if(t) t.textContent = txt;
}
/* 彩带：跟「萌虎幸运机」一套，摇完从天而降 */
function confetti(){
  var layer = document.getElementById('confettiLayer');
  if(!layer) return;
  var colors = RAMP.concat(['#FFE27A','#FFD98A','#FFAFCE']);
  for(var i=0;i<16;i++){
    var c = document.createElement('i');
    c.className = 'confetti';
    c.style.left = (3 + Math.random()*94).toFixed(1) + '%';
    c.style.width  = (6 + Math.random()*5).toFixed(0) + 'px';
    c.style.height = (9 + Math.random()*7).toFixed(0) + 'px';
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = (1.5 + Math.random()*1.1).toFixed(2) + 's';
    c.style.animationDelay = (Math.random()*0.28).toFixed(2) + 's';
    layer.appendChild(c);
    (function(x){ setTimeout(function(){ if(x.parentNode) x.parentNode.removeChild(x); }, 3200); })(c);
  }
}

function doSpin(){
  if(rolling) return;
  rolling = true;
  var pull  = document.getElementById('btnPull');
  var mach  = document.getElementById('machine');
  var lever = document.getElementById('lever');
  pull.disabled = true;
  mach.classList.add('rolling');
  lever.classList.add('pulled');
  vib([12,36,12]);
  sfxStart();
  setBanner('转啊转…看今天怎么过～');

  var els = reelEls(), used = [], N = els.length;
  for(var i=0;i<N;i++){
    var it;
    if(i===SLOT_LUNCH)       it = pickMeal(used, true);    /* 中午：排除夜宵 */
    else if(i===SLOT_DINNER) it = pickMeal(used, false);   /* 晚上：可能是夜宵 */
    else                     it = pickPlay(used, i===0);    /* 第0格是上午，别排长项目 */
    if(it) used.push(it.id);
    rolls[i] = it;
  }

  var longest = 0;
  for(var j=0;j<N;j++){
    var d = 1.05 + j*0.26;
    if(d>longest) longest = d;
    (function(el,item,delay,idx){
      setTimeout(function(){
        rollReel(el,item,delay);
        setTimeout(function(){ sfxStop(idx); }, delay*1000*0.82);
      }, 60);
    })(els[j], rolls[j], d, j);
  }

  setTimeout(function(){
    mach.classList.remove('rolling');
    lever.classList.remove('pulled');
    els.forEach(function(el){
      el.classList.add('win');
      setTimeout(function(){ el.classList.remove('win'); }, 470);
    });
    vib(18);
    sfxWin();
    confetti();

    rolls.forEach(function(x){ if(!x) return; S.recent.unshift(x.id); });
    /* 连续摇也不至于把池子摇空：只记最近 60 条 */
    var seen = {};
    S.recent = S.recent.filter(function(id){
      if(seen[id]) return false;
      seen[id] = true;
      return true;
    }).slice(0,60);
    S.rolls = rolls.map(function(x){ return x ? x.id : null; });
    S.spins = (S.spins||0) + 1;

    S.nightId = null;                          /* 新的一把，"晚上"那站重新挑 */
    plan = planOf();                           /* 整天安排在这一刻定稿，后面只渲染不重算 */
    var lastSeg = plan[plan.length-1];
    S.nightId = (lastSeg && lastSeg.label === '晚上') ? lastSeg.item.id : null;
    save();

    document.getElementById('btnDetail').classList.add('on');
    setBanner('今天的安排出炉啦 ✨', true);
    spinLabel('再拉一下');
    pull.disabled = false;
    rolling = false;
    spun = true;
  }, 60 + longest*1000 + 300);
}

/* ===================== 详情卡片（Step 2） ===================== */
/* 一整天 = 摇出来的四格 + 自动补的"晚上"一站，共 5 站。
   时间推法跟桌面版一致：有硬下限（午饭 ≥12:00 / 下午玩 ≥14:00 / 晚饭 ≥18:00 / 晚上 ≥20:00），
   站与站之间至少留 40 分钟路上时间。 */
function fmt(m){
  m = Math.round(m/10)*10;
  var h = Math.floor(m/60), mi = m%60;
  return (h<10?'0':'')+h+':'+(mi<10?'0':'')+mi;
}
/* 排到半夜以后要写"次日 01:10"，不能印出 25:10 这种怪时间 */
function fmtWrap(m){
  m = Math.round(m/10)*10;
  var next = false;
  while(m >= 1440){ m -= 1440; next = true; }
  var h = Math.floor(m/60), mi = m%60;
  return (next ? '次日 ' : '') + (h<10?'0':'')+h+':'+(mi<10?'0':'')+mi;
}
function planOf(){
  var out = [], t = 10*60, used = [];
  if(rolls[0]){ out.push({t:t,label:'上午玩',type:'p',item:rolls[0]}); t += rolls[0].dur*60; used.push(rolls[0].id); }
  if(rolls[1]){ t = Math.max(t+40, 12*60); out.push({t:t,label:'午饭',type:'e',item:rolls[1]}); t += rolls[1].dur*60; used.push(rolls[1].id); }
  if(rolls[2]){ t = Math.max(t+40, 14*60); out.push({t:t,label:'下午玩',type:'p',item:rolls[2]}); t += rolls[2].dur*60; used.push(rolls[2].id); }

  var din = rolls[3] || pickMeal(used, false);
  if(din){ t = Math.max(t+40, 18*60); out.push({t:t,label:'晚饭',type:'e',item:din,auto:!rolls[3]}); t += din.dur*60; used.push(din.id); }

  var night = (S.nightId && used.indexOf(S.nightId) < 0) ? byId(S.nightId) : null;   /* 上次挑的那站优先复用 */
  if(!night) night = pickNight(used);
  if(night){ t = Math.max(t+40, 20*60); out.push({t:t,label:'晚上',type:night.type,item:night,auto:true}); }

  return out;
}
var plan = [];

function renderDetail(){
  var body = document.getElementById('sheetBody');
  var sub  = document.getElementById('sheetSub');
  /* 整天安排是"摇完即定稿"：这里只渲染，不重算，
     否则每开一次卡片，"晚上"那站会重摇一次，前后看到的不一样 */
  if(!plan.length) plan = planOf();
  if(!plan.length){
    if(body) body.innerHTML = '<div class="tl-empty">还没摇呢～<br>先拉一下那根杆，今天就不用想了。</div>';
    if(sub) sub.textContent = '';
    return;
  }
  var html = '<div class="tl">';
  plan.forEach(function(p){
    var it = p.item;
    if(!it) return;
    var meta = [];
    if(it.area && it.area!=='不限') meta.push(it.area);
    if(it.dur)   meta.push(it.dur>=24 ? '住一晚' : ('约 '+it.dur+' 小时'));
    if(it.price) meta.push(it.price===1 ? '便宜' : it.price===2 ? '人均中档' : '人均偏高');
    var tags = it.tags.slice(0,4).map(function(t){ return '<span class="tg">'+esc(t)+'</span>'; }).join('');
    html += '<div class="tl-row">'+
      '<div class="tl-time">'+fmtWrap(p.t)+'</div>'+
      '<div class="tl-rail"><i style="background:'+colorOf(it)+'"></i><s></s></div>'+
      '<div class="tl-body">'+
        '<div class="k '+p.type+'">'+esc(p.label)+'</div>'+
        (p.auto ? '<span class="auto">自动补的</span>' : '')+
        '<div class="v">'+esc(it.name)+'</div>'+
        '<div class="p">'+meta.join(' · ')+'</div>'+
        (it.tip ? '<div class="tip">'+esc(it.tip)+'</div>' : '')+
        '<div class="tags">'+tags+'</div>'+
      '</div></div>';
  });
  html += '</div>';
  if(body) body.innerHTML = html;

  var n = plan.length;
  var end = plan[n-1].t + (plan[n-1].item.dur||2)*60;
  if(sub) sub.textContent = dateText() + ' · ' + fmtWrap(plan[0].t) + '—' + fmtWrap(end) + ' · 共 ' + n + ' 站';
}

function sheetEl(){ return document.getElementById('sheet'); }
function sheetOpen(){ var s = sheetEl(); return !!s && s.classList.contains('on'); }

function openSheet(){
  renderDetail();
  if(!plan.length){ toast('先拉一下拉杆，摇出今天的安排'); return; }
  var m = document.getElementById('sheetMask'), s = sheetEl();
  m.classList.add('on'); s.classList.add('on');
  s.setAttribute('aria-hidden','false');
  vib(8);
}
function closeSheet(){
  var m = document.getElementById('sheetMask'), s = sheetEl();
  s.classList.remove('on'); m.classList.remove('on');
  s.setAttribute('aria-hidden','true');
  s.style.transform = '';
  document.getElementById('sheetBody').scrollTop = 0;
}

/* ===================== 交互 ===================== */
function bindLever(){
  var lv = document.getElementById('lever');
  var dragging = false;
  lv.addEventListener('pointerdown', function(e){
    e.preventDefault();
    ac();                                   /* 在用户手势里解锁音频 */
    dragging = true;
    lv.classList.add('pulled');
    try{ lv.setPointerCapture(e.pointerId); }catch(err){}
  });
  lv.addEventListener('pointerup', function(e){
    if(!dragging) return;
    dragging = false;
    doSpin();                               /* 点一下或往下拉一下都算拉杆 */
  });
  lv.addEventListener('pointercancel', function(){
    dragging = false;
    lv.classList.remove('pulled');
  });
}

function bindSound(){
  var b = document.getElementById('btnSnd');
  function paint(){
    b.classList.toggle('dim', !!S.mute);
    b.textContent = S.mute ? '🔇' : '🔊';
    b.setAttribute('aria-pressed', S.mute ? 'true' : 'false');
  }
  paint();
  b.addEventListener('click', function(){
    S.mute = !S.mute;
    save(); paint();
    if(!S.mute){ ac(); beep(880,0.12,'sine',0.06,0); }
  });
}

function bindDetail(){
  document.getElementById('btnDetail').addEventListener('click', function(){
    ac();                       /* 在用户手势里解锁音频 */
    openSheet();
  });
  document.getElementById('sheetMask').addEventListener('click', closeSheet);
  document.getElementById('sheetClose').addEventListener('click', closeSheet);
  document.getElementById('sheetAgain').addEventListener('click', function(){
    closeSheet();
    ac();
    setTimeout(doSpin, 140);    /* 先收起卡片，再摇，不然看不到机器转 */
  });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && sheetOpen()) closeSheet();
  });

  /* 从把手/标题区往下拖，拖过 78px 就收起 */
  var s = sheetEl();
  var sy = 0, dy = 0, drag = false;
  function down(e){
    /* 标题栏里的 ✕ 是按钮，别被拖拽手势吃掉点击 */
    if(e.target && e.target.closest && e.target.closest('.sh-close')) return;
    drag = true; sy = e.clientY; dy = 0;
    s.style.transition = 'none';
    try{ e.currentTarget.setPointerCapture(e.pointerId); }catch(err){}
  }
  function move(e){
    if(!drag) return;
    dy = Math.max(0, e.clientY - sy);
    s.style.transform = 'translateY(' + dy + 'px)';
  }
  function up(){
    if(!drag) return;
    drag = false;
    s.style.transition = '';
    /* 先决定收不收，再清 inline transform：
       清掉之后浏览器会从当前位置动画到目标位置，不会闪一下 */
    if(dy > 78){ closeSheet(); }         /* closeSheet 里已清 transform */
    else { s.style.transform = ''; }
    dy = 0;
  }
  [s.querySelector('.sheet-grip'), s.querySelector('.sheet-head')].forEach(function(el){
    if(!el) return;
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  });
}

function bindPull(){
  var b = document.getElementById('btnPull');
  b.addEventListener('click', function(){
    ac();                    /* 在用户手势里解锁音频 */
    doSpin();
  });
}

/* ===================== 启动 ===================== */
function dateText(){
  var d = new Date();
  var w = ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()];
  return (d.getMonth()+1) + '月' + d.getDate() + '日 · ' + w;
}
/* 招牌上下两排小灯泡 */
function fillBulbs(){
  [['bulbsTop',13],['bulbsBot',13]].forEach(function(cfg){
    var box = document.getElementById(cfg[0]);
    if(!box) return;
    var html = '';
    for(var i=0;i<cfg[1];i++) html += '<span class="bulb"></span>';
    box.innerHTML = html;
  });
}

/* 关掉页面再打开：上次摇的四格还认得出，就接着显示，不用重新摇一遍 */
function restoreRolls(){
  if(!S.rolls || S.rolls.length !== 4) return false;
  var got = 0, next = [null,null,null,null];
  for(var i=0;i<4;i++){
    var it = S.rolls[i] ? byId(S.rolls[i]) : null;
    if(it){ next[i] = it; got++; }
  }
  if(got < 4) return false;
  rolls = next;
  return true;
}
/* 把上次的结果直接摆到窗口里（不动画，落在最后一格） */
function showStaticResult(){
  var els = reelEls(), H = rowH();
  els.forEach(function(el,i){
    var src = reelPool(el);
    if(!src.length) src = LIB;
    var seq = [], item = rolls[i] || src[0];
    for(var k=0;k<5;k++) seq.push(src[Math.floor(Math.random()*src.length)]);
    seq.push(item);
    var strip = el.querySelector('.strip');
    fillStrip(strip, seq);
    strip.style.transition = 'none';
    strip.style.transform = 'translateY(' + (-(seq.length-1)*H) + 'px)';
  });
}
function paintIdle(){ if(spun) showStaticResult(); else idleReels(); }

function boot(){
  load();
  buildLib();
  fillBulbs();
  document.getElementById('dt').textContent = dateText();

  if(restoreRolls()){
    spun = true;
    plan = planOf();
    document.getElementById('btnDetail').classList.add('on');
    spinLabel('再拉一下');
    setBanner('上次摇的还留着，点下面看安排～');
    showStaticResult();
  }else{
    idleReels();
    setBanner('拉下拉杆，好运降临～');
  }

  bindLever();
  bindPull();
  bindSound();
  bindDetail();

  /* 横竖屏切换会改滚轮高度，重铺一遍静态画面（摇的过程中不动） */
  var tm = null;
  window.addEventListener('resize', function(){
    clearTimeout(tm);
    tm = setTimeout(function(){ if(!rolling) paintIdle(); }, 220);
  });

  if(!LIB.length) toast('内容池没读出来，检查一下 pool.js');
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', boot);
}else{
  boot();
}

/* 给自测用：当前这一把的四个结果 + 摊开后的整天安排 */
window.JTMGZ = {
  get rolls(){ return rolls.slice(); },
  get spun(){ return spun; },
  get plan(){                                  /* 读定稿的那一份，不重算 */
    return plan.map(function(p){
      return { t:p.t, time:fmtWrap(p.t), label:p.label, name:p.item && p.item.name,
               sub:p.item && p.item.sub, dur:p.item && p.item.dur,
               tags:p.item ? p.item.tags.slice() : [], auto:!!p.auto };
    });
  },
  get nightPool(){ return LIB.filter(isNightOnly).map(function(it){ return it.name; }); },
  tips: function(){
    return rolls.map(function(x){ return x ? { name:x.name, tip:x.tip, area:x.area, dur:x.dur, price:x.price } : null; });
  }
};

})();
