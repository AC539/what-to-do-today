/* 今天干嘛 · app.js */
(function(){
'use strict';

/* ===================== 常量 ===================== */
var KEY = 'jtmgz_v1';
var CITY = ['锦江','青羊','金牛','武侯','成华','高新','天府'];
var NEAR = ['龙泉','温江','双流','郫都','新都','新津','金堂'];
var AREAS = {
  '锦江':[104.081,30.657],'青羊':[103.980,30.674],'金牛':[104.048,30.707],
  '武侯':[104.043,30.642],'成华':[104.102,30.668],'高新':[104.066,30.573],
  '天府':[104.068,30.420],'龙泉':[104.275,30.561],'温江':[103.856,30.682],
  '双流':[103.923,30.575],'郫都':[103.888,30.809],'新都':[104.159,30.823],
  '新津':[103.810,30.410],'金堂':[104.412,30.862],'都江堰':[103.617,30.988],
  '崇州':[103.673,30.630],'彭州':[103.958,30.990],'大邑':[103.511,30.587],
  '邛崃':[103.464,30.410]
};
var FAR = ['都江堰','崇州','彭州','大邑','邛崃'];
var ROW_H = 104;

var IC_PLAY = '<svg viewBox="0 0 24 24"><path d="M2.5 20L9 7.5l4.2 7.2L16.4 10 22 20H2.5Z" fill="currentColor"/></svg>';
var IC_EAT  = '<svg viewBox="0 0 24 24"><path d="M2 11.5h20a10 10 0 0 1-20 0Z" fill="currentColor"/><path d="M9 3.5v5M12 2.5v6M15 3.5v5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" fill="none"/></svg>';
var IC_BOOK = '<svg viewBox="0 0 24 24"><path d="M4 4.5h6a3 3 0 0 1 3 3v12a2.4 2.4 0 0 0-2.4-2.4H4V4.5Z" fill="currentColor"/><path d="M20 4.5h-6a3 3 0 0 0-3 3v12a2.4 2.4 0 0 1 2.4-2.4H20V4.5Z" fill="currentColor" opacity=".5"/></svg>';
var IC_MOON = '<svg viewBox="0 0 24 24"><path d="M15.5 2.5a9.5 9.5 0 1 0 6 15.2A8 8 0 0 1 15.5 2.5Z" fill="currentColor"/></svg>';
var IC_SPORT= '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 3v18M3.5 12h17" stroke="currentColor" stroke-width="1.5" opacity=".55"/></svg>';

var C_PURPLE='#6C5CE7', C_CORAL='#FF6B4A', C_MINT='#17B890', C_AMBER='#F5A623', C_BLUE='#3B8DF0';
var RAMP = [C_PURPLE, C_CORAL, C_MINT, C_AMBER, C_BLUE];

var EAT_WORDS = ['吃','餐','饭','火锅','串串','烧烤','咖啡','茶','酒','面','粉','甜品','小吃','包','饼','日料','烤肉','brunch','西餐','食堂','早餐','夜宵','汤','鸭','鸡','鱼','牛','饺','抄手','锅盔','兔'];
var BOOK_SUBS = ['书店','展览','博物馆'];
var NIGHT_SUBS = ['夜生活','演出','酒吧'];
var SPORT_SUBS = ['运动'];

/* ===================== 状态 ===================== */
function defState(){
  return {
    cond:{scope:'city',traffic:'car',budget:0,energy:'any',len:'full',repeat:'norepeat'},
    custom:[], banned:[], fav:[], recent:[], combos:[],
    amapKey:'', amapArea:'锦江', live:[], ideasSeen:[],
    cand:[]
  };
}
var S = defState();

function load(){
  try{
    var raw = localStorage.getItem(KEY);
    if(raw){
      var o = JSON.parse(raw);
      var d = defState();
      for(var k in d){ if(o[k]!==undefined) d[k]=o[k]; }
      for(var k2 in d.cond){ if(!o.cond || o.cond[k2]===undefined) d.cond[k2]=defState().cond[k2]; }
      S = d;
    }
  }catch(e){ S = defState(); }
}
function save(){
  try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){}
}

/* ===================== 数据 ===================== */
var LIB = [];
function buildLib(){
  var raw = window.POOL_RAW || [];
  LIB = raw.map(function(r,i){ return mk(r[0],r[1],r[2],r[3],r[4],r[5],r[6],r[7],'L'+i,'lib'); });
}
function mk(name,type,sub,area,price,dur,tags,tip,id,src){
  return {
    id:id, name:name, type:type, sub:sub, area:area,
    price:price||2, dur:dur||2,
    tags:String(tags||'').split(',').map(function(s){return s.trim();}).filter(Boolean),
    tip:tip||'', src:src||'lib'
  };
}
function allItems(){
  return LIB.concat(S.custom, S.live);
}
function byId(id){
  var a = allItems();
  for(var i=0;i<a.length;i++){ if(a[i].id===id) return a[i]; }
  return null;
}
function isBanned(id){ return S.banned.indexOf(id)>=0; }
function isFav(id){ return S.fav.indexOf(id)>=0; }
function inCity(it){ return it.area==='不限' || CITY.indexOf(it.area)>=0; }
function isFar(it){ return FAR.indexOf(it.area)>=0; }
function hasTag(it,t){ return it.tags.indexOf(t)>=0; }
function subIn(it,arr){ return arr.indexOf(it.sub)>=0; }

function walkable(it){
  if(it.area!=='不限' && CITY.indexOf(it.area)<0) return false;
  if(it.type==='e') return it.price<=2;
  return ['公园','街区','活动','咖啡','茶'].indexOf(it.sub)>=0 || it.dur<=1.5;
}

/* ===================== 筛选与抽取 ===================== */
var LIGHT_SUBS = ['甜品','咖啡','茶'];                 /* 不适合当正餐 */
var FULL_SUBS  = ['火锅','串串','川菜','家常','面食','烧烤','夜宵','异国','粤菜','日料','韩餐','西餐','素食','早餐','不限'];

function isNightOnly(it){
  return hasTag(it,'夜生活') || it.sub==='酒吧' || it.sub==='夜生活';
}
function passesCond(it){
  var c = S.cond;
  if(isBanned(it.id)) return false;
  if(c.scope==='city' && !inCity(it)) return false;
  if(c.scope==='near' && isFar(it)) return false;
  if(c.budget>0 && it.price>Number(c.budget)) return false;
  if(c.energy==='chill' && hasTag(it,'体力活')) return false;
  if(c.traffic==='walk' && !walkable(it)) return false;
  if(c.repeat==='norepeat' && S.recent.indexOf(it.id)>=0 && !isFav(it.id)) return false;
  return true;
}
function poolOf(type, skipIds){
  var skip = skipIds||[];
  return allItems().filter(function(it){
    if(it.type!==type) return false;
    if(skip.indexOf(it.id)>=0) return false;
    return passesCond(it);
  });
}
function relaxed(type, skipIds){
  var p = poolOf(type, skipIds);
  if(p.length>=4) return p;
  var old = S.cond;
  var tmp = JSON.parse(JSON.stringify(old));
  tmp.repeat = 'allow'; tmp.energy = 'any'; tmp.budget = 0; tmp.traffic = 'car';
  S.cond = tmp;
  p = poolOf(type, skipIds);
  S.cond = old;
  if(p.length) return p;
  return allItems().filter(function(it){ return it.type===type && !isBanned(it.id); });
}
function weighted(p){
  if(!p || !p.length) return null;
  var tot=0, w=[];
  for(var i=0;i<p.length;i++){ var x = isFav(p[i].id)?3:1; w.push(x); tot+=x; }
  var r = Math.random()*tot;
  for(var j=0;j<p.length;j++){ r-=w[j]; if(r<=0) return p[j]; }
  return p[p.length-1];
}
/* 软过滤：候选够多才剔除，否则保留，避免筛到没东西 */
function soft(list, fn, min){
  var f = list.filter(fn);
  return f.length >= (min||6) ? f : list;
}
function pickItem(type, skipIds){ return weighted(relaxed(type, skipIds)); }

function pickPlay(skip, isMorning){           /* 白天玩：排除只有晚上才成立的 */
  var p = relaxed('p', skip);
  p = soft(p, function(it){ return !isNightOnly(it); }, 6);
  /* "住一晚"这类整日项目塞不进一天的格子 */
  p = soft(p, function(it){ return (it.dur||2) < 12; }, 6);
  /* 上午别排长项目，否则"午饭"要排到下午去；下午也别长到把晚上拖进后半夜 */
  if(isMorning) p = soft(p, function(it){ return (it.dur||2) <= 3; }, 6);
  else          p = soft(p, function(it){ return (it.dur||2) <= 5; }, 6);
  return weighted(p) || pickItem('p', skip);
}
function pickMeal(skip, isLunch){              /* 饭点：优先正餐，中午排除夜宵和酒吧 */
  var p = relaxed('e', skip);
  p = soft(p, function(it){ return FULL_SUBS.indexOf(it.sub)>=0; }, 8);
  p = soft(p, function(it){ return LIGHT_SUBS.indexOf(it.sub)<0; }, 8);
  if(isLunch){
    p = soft(p, function(it){ return !hasTag(it,'夜宵') && it.sub!=='酒吧'; }, 8);
  }
  return weighted(p) || pickItem('e', skip);
}
function pickNight(skip){                      /* 晚上那一站 */
  var p = allItems().filter(function(it){
    return isNightOnly(it) && skip.indexOf(it.id)<0 && passesCond(it);
  });
  if(p.length<3){
    p = allItems().filter(function(it){ return isNightOnly(it) && skip.indexOf(it.id)<0 && !isBanned(it.id); });
  }
  return weighted(p);
}

/* ===================== 时间轴 ===================== */
var plan = [];
function fmt(m){ m = Math.round(m/10)*10; var h=Math.floor(m/60), mi=m%60; return (h<10?'0':'')+h+':'+(mi<10?'0':'')+mi; }
/* 排到半夜以后写"次日 01:10"，不印 25:10 这种怪时间 */
function fmtWrap(m){
  m = Math.round(m/10)*10;
  var next = false;
  while(m >= 1440){ m -= 1440; next = true; }
  var h = Math.floor(m/60), mi = m%60;
  return (next?'次日 ':'') + (h<10?'0':'')+h+':'+(mi<10?'0':'')+mi;
}

function buildPlan(rolls){
  plan = [];
  var half = S.cond.len==='half';
  var t = 10*60;
  var used = [];

  if(rolls[0]){ plan.push({t:t,label:'玩',type:'p',item:rolls[0],slot:0}); t += rolls[0].dur*60; used.push(rolls[0].id); }
  if(rolls[1]){ t = Math.max(t+40, 12*60); plan.push({t:t,label:'午饭',type:'e',item:rolls[1],slot:1}); t += rolls[1].dur*60; used.push(rolls[1].id); }
  if(half) return;

  if(rolls[2]){ t = Math.max(t+40, 14*60); plan.push({t:t,label:'玩',type:'p',item:rolls[2],slot:2}); t += rolls[2].dur*60; used.push(rolls[2].id); }

  var din = pickMeal(used, false);
  if(din){ t = Math.max(t+40, 18*60); plan.push({t:t,label:'晚饭',type:'e',item:din,slot:3,auto:true}); t += din.dur*60; used.push(din.id); }

  var night = pickNight(used);
  if(night){ t = Math.max(t+40, 20*60); plan.push({t:t,label:'晚上',type:night.type,item:night,slot:4,auto:true}); }
}

/* ===================== 摇 ===================== */
var rolls = [null,null,null];
var rolling = false;

function iconOf(it){
  if(subIn(it,BOOK_SUBS)) return IC_BOOK;
  if(subIn(it,NIGHT_SUBS)) return IC_MOON;
  if(subIn(it,SPORT_SUBS)) return IC_SPORT;
  return it.type==='e' ? IC_EAT : IC_PLAY;
}
function colorOf(it){
  var s = it.sub||'x', h=0;
  for(var i=0;i<s.length;i++) h = (h*31 + s.charCodeAt(i)) >>> 0;
  return RAMP[h % RAMP.length];
}
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function slotLabel(i){
  if(i===0) return '上午 · 玩';
  if(i===1) return '中午 · 吃';
  if(i===2) return '下午 · 玩';
  return '晚上 · 吃';
}
function cellHTML(it,label){
  if(!it) return '<div class="cell"><div class="nm" style="color:var(--ink3)">—</div></div>';
  return '<div class="cell">'+
    '<div class="ic" style="color:'+colorOf(it)+'">'+iconOf(it)+'</div>'+
    '<div class="tag">'+esc(label)+'</div>'+
    '<div class="nm">'+esc(it.name)+'</div>'+
  '</div>';
}
function reelEls(){ return Array.prototype.slice.call(document.querySelectorAll('#reels .reel')); }

function rollReel(reel, item, dur){
  var strip = reel.querySelector('.strip');
  var type = reel.getAttribute('data-type');
  var label = reel.getAttribute('data-label');
  var filler = [];
  var src = relaxed(type, []);
  for(var i=0;i<18;i++){ filler.push(src[Math.floor(Math.random()*src.length)]); }
  var seq = filler.concat([item]);
  strip.innerHTML = seq.map(function(x){ return cellHTML(x,label); }).join('');
  strip.style.transition = 'none';
  strip.style.transform = 'translateY(0px)';
  void strip.offsetHeight;
  strip.style.transition = 'transform '+dur+'s cubic-bezier(.13,.75,.24,1)';
  strip.style.transform = 'translateY(' + (-(seq.length-1)*ROW_H) + 'px)';
}

function doSpin(){
  if(rolling) return;
  rolling = true;
  var btn = document.getElementById('btnSpin');
  btn.disabled = true;
  btn.textContent = '在摇了…';
  var mach = document.getElementById('machine');
  mach.classList.add('rolling');
  document.getElementById('lever').classList.add('pulled');
  if(navigator.vibrate) try{ navigator.vibrate([12,40,12]); }catch(e){}

  var els = reelEls();
  var half = S.cond.len==='half';
  var count = half ? 2 : 3;
  var types = half ? ['p','e'] : ['p','e','p'];
  var used = [];

  for(var i=0;i<count;i++){
    var it = i===1 ? pickMeal(used, true) : pickPlay(used, i===0);
    if(it) used.push(it.id);
    rolls[i] = it;
  }
  if(half) rolls[2] = null;

  var longest = 0;
  for(var j=0;j<els.length;j++){
    if(j>=count){ els[j].style.visibility='hidden'; continue; }
    els[j].style.visibility='visible';
    var d = 1.05 + j*0.26;
    if(d>longest) longest = d;
    (function(el,item,delay){
      setTimeout(function(){ rollReel(el, item, delay); }, 60);
    })(els[j], rolls[j], d);
  }

  setTimeout(function(){
    mach.classList.remove('rolling');
    document.getElementById('lever').classList.remove('pulled');
    for(var k=0;k<count;k++){ els[k].classList.add('win'); (function(e){ setTimeout(function(){e.classList.remove('win');},450); })(els[k]); }
    if(navigator.vibrate) try{ navigator.vibrate(16); }catch(e){}
    // 记录
    for(var m=0;m<count;m++){
      var id = rolls[m] && rolls[m].id;
      if(id && S.recent.indexOf(id)<0) S.recent.unshift(id);
    }
    if(S.recent.length>90) S.recent = S.recent.slice(0,90);
    buildPlan(rolls);
    save();
    renderPlan();
    rolling = false;
    btn.disabled = false;
    btn.textContent = '再 拉 一 下';
  }, 60 + (longest*1000) + 260);
}

function spinOne(idx){
  if(rolling) return;
  if(S.cond.len==='half' && idx>1) return;
  rolling = true;
  var el = reelEls()[idx];
  var used = rolls.filter(Boolean).map(function(x){return x.id;});
  var it = idx===1 ? pickMeal(used, true) : pickPlay(used, idx===0);
  rolls[idx] = it;
  el.classList.add('win');
  rollReel(el, it, 1.15);
  setTimeout(function(){
    el.classList.remove('win');
    if(it && S.recent.indexOf(it.id)<0) S.recent.unshift(it.id);
    if(S.recent.length>90) S.recent = S.recent.slice(0,90);
    buildPlan(rolls);
    renderPlan(); save();
    rolling = false;
  }, 1350);
}

function swapPlanRow(slot){
  if(rolling) return;
  var used = rolls.filter(Boolean).map(function(x){return x.id;});
  if(slot===3 || slot===4){
    plan.forEach(function(p){ if(p.slot===3 || p.slot===4) used.push(p.item.id); });
    if(slot===3){
      var din = pickMeal(used, false);
      plan.forEach(function(p){ if(p.slot===3) p.item = din; });
    }else{
      var nt = pickNight(used);
      plan.forEach(function(p){ if(p.slot===4) p.item = nt; });
    }
    renderPlan(); save();
    return;
  }
  spinOne(slot);
}

/* ===================== 渲染 ===================== */
function $(id){ return document.getElementById(id); }

function renderCond(){
  var c = S.cond;
  document.querySelectorAll('#condCard .chips').forEach(function(g){
    var k = g.getAttribute('data-k');
    g.querySelectorAll('.chip').forEach(function(b){
      b.classList.toggle('on', String(c[k])===b.getAttribute('data-v'));
    });
  });
  var names = {city:'主城区',near:'含近郊',any:'不限'};
  var bud = {0:'不限',1:'50内',2:'100内',3:'200内'};
  var en = {chill:'躺平',any:'随便',active:'想动'};
  var tr = {car:'开车',metro:'地铁',walk:'走路'};
  $('condSum').textContent = names[c.scope]+' · '+tr[c.traffic]+' · '+bud[c.budget]+' · '+en[c.energy]+' · '+(c.len==='half'?'半天':'一整天');
  $('amapKey').value = S.amapKey || '';
  renderLiveNote();
}
function renderLiveNote(){
  var n = $('liveNote');
  var cnt = (S.live||[]).length;
  if(cnt){
    n.innerHTML = '已有 <b>'+cnt+'</b> 条实时数据参与摇号。高德个人配额有限，不用频繁拉。';
  }else if(S.amapKey){
    n.textContent = 'Key 已保存。点「拉取附近」按当前位置或所选区域拉一批真实营业的店。';
  }else{
    n.textContent = '不填也能用。填了可以按当前位置拉一次真实营业的店，拉完存本地，之后摇杆秒回。';
  }
}

function renderMachine(){
  var els = reelEls();
  var half = S.cond.len==='half';
  els.forEach(function(el,i){
    var label = el.getAttribute('data-label');
    if(half && i===2){ el.style.visibility='hidden'; return; }
    el.style.visibility='visible';
    var strip = el.querySelector('.strip');
    var cur = rolls[i];
    var type = el.getAttribute('data-type');
    if(!cur){ var tmp = relaxed(type,[]); cur = tmp[0] || null; }
    strip.innerHTML = cellHTML(cur,label);
    strip.style.transition='none';
    strip.style.transform='translateY(0px)';
  });
  if(S.cond.len==='half'){ els[2].style.visibility='hidden'; }
}

function renderPlan(){
  var box = $('planBox'), acts = $('planActs');
  if(!plan.length){
    box.innerHTML = '<div class="plan-empty">还没摇。<br>拉一下那根杆，今天就不用想了。</div>';
    acts.style.display='none';
    $('planCount').textContent='';
    return;
  }
  var html = '<div class="tl">';
  plan.forEach(function(p,i){
    var it = p.item;
    if(!it) return;
    var col = colorOf(it);
    var kindTxt = p.label || (p.type==='e' ? '吃' : '玩');
    var meta = [];
    if(it.area && it.area!=='不限') meta.push(it.area);
    if(it.dur) meta.push(it.dur>=24?'住一晚':('约 '+it.dur+' 小时'));
    if(it.price) meta.push(it.price===1?'便宜':it.price===2?'人均中档':'人均偏高');
    var tags = it.tags.slice(0,4).map(function(t){ return '<span class="tg">'+esc(t)+'</span>'; }).join('');
    html += '<div class="tl-row">'+
      '<div class="tl-time">'+fmtWrap(p.t)+'</div>'+
      '<div class="tl-rail"><i style="background:'+col+'"></i><s></s></div>'+
      '<div class="tl-body">'+
        '<div class="k">'+esc(kindTxt)+'</div>'+
        '<div class="v">'+esc(it.name)+'</div>'+
        '<div class="p">'+meta.join(' · ')+'</div>'+
        (it.tip?'<div class="p" style="color:var(--ink3)">'+esc(it.tip)+'</div>':'')+
        '<div class="tags">'+tags+'</div>'+
        '<div class="tl-acts"><button class="mini" data-swap="'+p.slot+'">换一个</button>'+
        (p.auto?'<span class="mini gray">自动补的</span>':'')+
        (it.src==='live'?'<span class="mini gray">实时</span>':'')+
        '</div>'+
      '</div></div>';
  });
  html += '</div>';
  box.innerHTML = html;
  acts.style.display='flex';
  var n = plan.length;
  var end = plan[n-1].t + (plan[n-1].item.dur||2)*60;
  $('planCount').textContent = fmtWrap(plan[0].t)+' — '+fmtWrap(end);
}

/* ---------- 灵感 ---------- */
function guessType(s){
  for(var i=0;i<EAT_WORDS.length;i++){
    if(s.toLowerCase().indexOf(EAT_WORDS[i].toLowerCase())>=0) return 'e';
  }
  return 'p';
}
function parsePaste(txt){
  var parts = txt.split(/\n+|。|！|？|；|;|(?:\d{1,2}[\.、)）])/);
  var out = [], seen = {};
  parts.forEach(function(s){
    s = s.trim().replace(/^[-•·*\s]+/,'').replace(/^[\(（].{0,3}[\)）]/,'').trim();
    if(s.length<2 || s.length>38) return;
    if(seen[s]) return; seen[s]=1;
    out.push({ name:s, type:guessType(s) });
  });
  return out.slice(0,20);
}
function renderCand(){
  var box = $('candBox'), card = $('candCard');
  if(!S.cand.length){ card.style.display='none'; box.innerHTML=''; return; }
  card.style.display='block';
  $('candCount').textContent = S.cand.length + ' 条';
  box.innerHTML = S.cand.map(function(c,i){
    return '<div class="item">'+
      '<div class="bul '+(c.type==='e'?'e':'p')+'">'+(c.type==='e'?'吃':'玩')+'</div>'+
      '<div class="bd"><div class="h">'+esc(c.name)+'</div>'+
      '<div class="s">我猜是'+(c.type==='e'?'吃的':'玩的')+'，点一下能改</div></div>'+
      '<div class="op">'+
      '<button class="icon-btn" data-flip="'+i+'" title="切换类型"><svg viewBox="0 0 24 24" fill="none"><path d="M4 8h13l-3-3M20 16H7l3 3" stroke="#6B6862" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'+
      '<button class="icon-btn add" data-cadd="'+i+'" title="加进池子"><svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#0E8E6E" stroke-width="2.2" stroke-linecap="round"/></svg></button>'+
      '<button class="icon-btn del" data-cdel="'+i+'" title="不要"><svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="#E0522F" stroke-width="2.2" stroke-linecap="round"/></svg></button>'+
      '</div></div>';
  }).join('');
}
function addCustom(name,type,sub,tip,src){
  var it = mk(name,type,sub||'自定义','不限',1,1.5,'','' ,
    'U'+Date.now()+Math.floor(Math.random()*1000), src||'user');
  if(tip) it.tip = tip;
  if(sub) it.sub = sub;
  S.custom.unshift(it);
  return it;
}
function renderIdeas(){
  var all = window.IDEA_RAW || [];
  if(!all.length) return;
  var unseen = [];
  all.forEach(function(r,i){ if(S.ideasSeen.indexOf('I'+i)<0) unseen.push(i); });
  if(unseen.length < 6){ S.ideasSeen = []; unseen = all.map(function(_,i){ return i; }); }
  var pool = unseen.slice(), idx = [];
  while(idx.length<6 && pool.length){
    idx.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
  }
  idx.forEach(function(i){ if(S.ideasSeen.indexOf('I'+i)<0) S.ideasSeen.push('I'+i); });
  $('ideaBox').innerHTML = idx.map(function(i){
    var r = all[i];
    var src = r[8]==='news' ? '<span class="tg b">报道</span>' : '<span class="tg a">AI</span>';
    return '<div class="item">'+
      '<div class="bul '+(r[1]==='e'?'e':'p')+'">'+(r[1]==='e'?'吃':'玩')+'</div>'+
      '<div class="bd"><div class="h">'+esc(r[0])+'</div>'+
      '<div class="s">'+esc(r[3]||'不限')+' · '+(r[5]||2)+' 小时</div>'+
      '<div class="t">'+esc(r[7]||'')+'</div>'+
      '<div class="tags">'+src+'</div></div>'+
      '<div class="op">'+
      '<button class="icon-btn add" data-iadd="'+i+'" title="加进池子"><svg viewBox="0 0 24 24" fill="none" width="15" height="15"><path d="M12 5v14M5 12h14" stroke="#0E8E6E" stroke-width="2.2" stroke-linecap="round"/></svg></button>'+
      '<button class="icon-btn" data-iskip="'+i+'" title="不感兴趣"><svg viewBox="0 0 24 24" fill="none" width="15" height="15"><path d="M6 6l12 12M18 6L6 18" stroke="#6B6862" stroke-width="2.2" stroke-linecap="round"/></svg></button>'+
      '</div></div>';
  }).join('');
  save();
}

/* ---------- 池子 ---------- */
var poolTab = 'all', poolQ = '';
function renderPool(){
  var list;
  if(poolTab==='u') list = S.custom.slice();
  else if(poolTab==='x') list = S.banned.map(byId).filter(Boolean);
  else list = allItems().filter(function(it){ return poolTab==='all' || it.type===poolTab; });

  if(poolQ){
    var q = poolQ.toLowerCase();
    list = list.filter(function(it){
      return (it.name+' '+it.area+' '+it.sub+' '+(it.tags||[]).join(' ')).toLowerCase().indexOf(q)>=0;
    });
  }
  var CAP = 40;
  var more = list.length > CAP ? list.length - CAP : 0;
  list = list.slice(0, CAP);

  if(!list.length){
    $('poolBox').innerHTML = '<div class="empty"><b>这里没东西</b>去灵感页挑几个，或者在下面手动加一条</div>';
  }else{
    $('poolBox').innerHTML = list.map(function(it){
      var banned = isBanned(it.id);
      return '<div class="item">'+
        '<div class="bul '+(it.type==='e'?'e':'p')+'">'+(it.type==='e'?'吃':'玩')+'</div>'+
        '<div class="bd"><div class="h">'+esc(it.name)+'</div>'+
        '<div class="s">'+esc(it.sub)+' · '+esc(it.area)+' · '+(it.src==='live'?'实时数据':it.src==='lib'?'内容库':'我加的')+'</div>'+
        (it.tip?'<div class="t">'+esc(it.tip)+'</div>':'')+
        '</div>'+
        '<div class="op">'+
        '<button class="icon-btn" data-fav="'+it.id+'" title="常去，多摇到"><svg viewBox="0 0 24 24" fill="none" width="15" height="15"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z" stroke="'+(isFav(it.id)?'#F5A623':'#6B6862')+'" stroke-width="1.6" fill="'+(isFav(it.id)?'#F5A623':'none')+'"/></svg></button>'+
        '<button class="icon-btn '+(banned?'add':'del')+'" data-ban="'+it.id+'" title="'+(banned?'恢复':'拉黑')+'">'+
          (banned
            ? '<svg viewBox="0 0 24 24" fill="none" width="15" height="15"><path d="M4 12h16" stroke="#0E8E6E" stroke-width="2.2" stroke-linecap="round"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" width="15" height="15"><path d="M6 6l12 12M18 6L6 18" stroke="#E0522F" stroke-width="2.2" stroke-linecap="round"/></svg>')+
        '</button></div>'+
      '</div>';
    }).join('');
    if(more>0) $('poolBox').innerHTML += '<div class="note">还有 '+more+' 条没显示。切上面分类，或者搜名字 / 区域 / 标签。</div>';
  }
  $('statNote').innerHTML = '内容库 '+LIB.length+' 条 · 我加的 '+S.custom.length+' 条 · 实时 '+(S.live||[]).length+
    ' 条 · 拉黑 '+S.banned.length+' 条 · 最近摇过 '+S.recent.length+' 条';
  renderCombos();
}
function renderCombos(){
  var box = $('comboBox');
  if(!S.combos.length){ box.innerHTML = '<div class="empty" style="padding:18px">摇出满意的组合，点「存进池子」就会留在这里</div>'; return; }
  box.innerHTML = S.combos.slice(0,20).map(function(c,i){
    return '<div class="item">'+
      '<div class="bul p">'+(i+1)+'</div>'+
      '<div class="bd"><div class="h">'+esc(c.title)+'</div>'+
      '<div class="t">'+esc(c.body)+'</div></div>'+
      '<div class="op"><button class="icon-btn del" data-cdelcombo="'+i+'"><svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="#E0522F" stroke-width="2.2" stroke-linecap="round"/></svg></button></div>'+
    '</div>';
  }).join('');
}

/* ===================== 高德实时 ===================== */
function amapKey(){ return (S.amapKey||'').trim(); }
function fetchLive(){
  var key = amapKey();
  if(!key){ toast('先填高德 Key'); return; }
  var run = function(lng,lat,label){
    var tasks = [
      {types:'050000|050500', radius:3000, kind:'e', label:label},
      {types:'110000|110100|060300', radius:5000, kind:'p', label:label}
    ];
    var got = [], total = tasks.length, doneN = 0, netErr = 0;
    $('btnLive').textContent = '拉取中…';
    tasks.forEach(function(t){
      var url = 'https://restapi.amap.com/v3/place/around?key='+encodeURIComponent(key)+
        '&location='+lng.toFixed(6)+','+lat.toFixed(6)+
        '&types='+encodeURIComponent(t.types)+
        '&radius='+t.radius+'&offset=25&page=1&extensions=base';
      fetch(url).then(function(r){ return r.json(); }).then(function(j){
        if(j && j.status==='0'){
          netErr++;
        }
        if(j && j.pois){
          j.pois.forEach(function(p){
            got.push({
              id:'R'+p.id, name:p.name, type:t.kind,
              sub:subFromType(p.type), area:t.label,
              price:2, dur:t.kind==='e'?1.5:2,
              tags:['实时','附近'],
              tip:(p.address&&typeof p.address==='string'?p.address:'')+(p.distance?' · 约'+Math.round(Number(p.distance))+'米':''),
              src:'live', dist:Number(p.distance||9999)
            });
          });
        }
        doneN++;
        if(doneN===total){ finish(); }
      }).catch(function(){ doneN++; netErr++; if(doneN===total) finish(); });
    });
    function finish(){
      got = got.filter(function(x){ return x.name && x.dist<=4000; })
               .sort(function(a,b){ return a.dist-b.dist; }).slice(0,120);
      S.live = got;
      save(); renderLiveNote(); renderPool();
      if(got.length){
        $('btnLive').textContent = '已拉 '+got.length+' 条';
        toast('拉到 '+got.length+' 条附近数据，已经进池子了');
      }else{
        $('btnLive').textContent = '拉取失败';
        toast(netErr>=total
          ? '被浏览器拦了。这个页面是本地打开的，联网请求会被拦，用本地池就行'
          : '没拉到数据，看看 Key 和类型权限对不对');
      }
      setTimeout(function(){ $('btnLive').textContent='拉取附近'; },2600);
    }
  };
  var fallback = function(){
    var a = S.amapArea || '锦江';
    var c = AREAS[a] || AREAS['锦江'];
    run(c[0], c[1], a);
  };
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(
      function(p){ run(p.coords.longitude, p.coords.latitude, '我附近'); },
      fallback, {timeout:6000, maximumAge:60000}
    );
  } else fallback();
}
function subFromType(t){
  if(!t) return '附近';
  var a = String(t).split(';')[0].split('|');
  var last = a[a.length-1] || '附近';
  return last.length>6 ? last.slice(-4) : last;
}

/* ===================== 交互绑定 ===================== */
function toast(msg){
  var t = $('toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toast._t);
  toast._t = setTimeout(function(){ t.classList.remove('on'); }, 2100);
}

function bind(){
  // 条件折叠
  $('condHead').addEventListener('click', function(){ $('condCard').classList.toggle('open'); });
  document.querySelectorAll('#condCard .chips').forEach(function(g){
    g.addEventListener('click', function(e){
      var b = e.target.closest('.chip'); if(!b) return;
      var k = g.getAttribute('data-k');
      S.cond[k] = (k==='budget') ? Number(b.getAttribute('data-v')) : b.getAttribute('data-v');
      save(); renderCond();
      if(k==='len'){ renderMachine(); if(plan.length){ buildPlan(rolls); renderPlan(); } }
    });
  });

  // 拉杆
  var lever = $('lever'), dragging=false, y0=0;
  lever.addEventListener('pointerdown', function(e){ dragging=true; y0=e.clientY; lever.setPointerCapture(e.pointerId); });
  lever.addEventListener('pointermove', function(e){
    if(!dragging) return;
    if(e.clientY - y0 > 26){ dragging=false; lever.classList.add('pulled'); doSpin();
      setTimeout(function(){ lever.classList.remove('pulled'); }, 700); }
  });
  lever.addEventListener('pointerup', function(){ dragging=false; });
  lever.addEventListener('click', function(){ if(!dragging) doSpin(); });

  // 摇
  $('btnSpin').addEventListener('click', doSpin);
  document.querySelectorAll('#reels .reel').forEach(function(el,i){
    el.addEventListener('click', function(){ spinOne(i); });
  });

  // 计划操作
  $('planBox').addEventListener('click', function(e){
    var b = e.target.closest('[data-swap]');
    if(b) swapPlanRow(Number(b.getAttribute('data-swap')));
  });
  $('btnRerollAll').addEventListener('click', doSpin);
  $('btnSaveCombo').addEventListener('click', function(){
    if(!plan.length) return;
    var title = fmtWrap(plan[0].t)+' 出发 · '+plan.length+' 站';
    var body = plan.map(function(p){
      return fmtWrap(p.t)+' '+(p.label||'')+' '+p.item.name;
    }).join('  /  ');
    S.combos.unshift({ title:title, body:body });
    S.combos = S.combos.slice(0,30);
    save(); renderCombos();
    toast('存好了，在「池子」里能看到');
  });
  $('btnCopyPlan').addEventListener('click', function(){
    if(!plan.length){ toast('先摇一次'); return; }
    var txt = '今天这样过\n' + plan.map(function(p){
      return fmtWrap(p.t)+'  '+(p.label||'')+'  '+p.item.name+(p.item.tip?'（'+p.item.tip+'）':'');
    }).join('\n');
    if(copy(txt)) toast('计划已复制，可以直接发给她');
    else toast('复制没成功，长按下面文字自己选');
  });

  // 灵感
  $('btnParse').addEventListener('click', function(){
    var t = $('pasteBox').value.trim();
    if(!t){ toast('先粘点东西进来'); return; }
    var arr = parsePaste(t);
    if(!arr.length){ toast('没解析出条目，一行一个试试'); return; }
    S.cand = arr; save(); renderCand();
    $('pasteBox').value='';
    toast('解析出 '+arr.length+' 条，确认一下');
  });
  $('btnPasteClear').addEventListener('click', function(){ $('pasteBox').value=''; });
  $('candBox').addEventListener('click', function(e){
    var f = e.target.closest('[data-flip]'), a = e.target.closest('[data-cadd]'), d = e.target.closest('[data-cdel]');
    if(f){ var i=Number(f.getAttribute('data-flip')); S.cand[i].type = S.cand[i].type==='e'?'p':'e'; save(); renderCand(); }
    else if(a){ var j=Number(a.getAttribute('data-cadd')); addCustom(S.cand[j].name,S.cand[j].type); S.cand.splice(j,1); save(); renderCand(); renderPool(); toast('加进池子了'); }
    else if(d){ S.cand.splice(Number(d.getAttribute('data-cdel')),1); save(); renderCand(); }
  });
  $('btnCandAll').addEventListener('click', function(){
    S.cand.forEach(function(c){ addCustom(c.name,c.type); });
    var n = S.cand.length; S.cand=[]; save(); renderCand(); renderPool();
    toast('加了 '+n+' 条');
  });
  $('btnMoreIdeas').addEventListener('click', function(){ renderIdeas(); });
  $('ideaBox').addEventListener('click', function(e){
    var a = e.target.closest('[data-iadd]'), k = e.target.closest('[data-iskip]');
    if(a){
      var i = Number(a.getAttribute('data-iadd')), r = window.IDEA_RAW[i];
      addCustom(r[0], r[1], r[2], r[7], 'idea');
      S.ideasSeen.push('I'+i); save(); renderPool();
      a.closest('.item').style.opacity='.45';
      a.disabled = true; toast('已加进池子');
    }else if(k){
      S.ideasSeen.push('I'+k.getAttribute('data-iskip')); save();
      k.closest('.item').style.display='none';
    }
  });

  // 池子
  $('poolSeg').addEventListener('click', function(e){
    var b = e.target.closest('button'); if(!b) return;
    poolTab = b.getAttribute('data-v');
    $('poolSeg').querySelectorAll('button').forEach(function(x){ x.classList.toggle('on', x===b); });
    renderPool();
  });
  $('poolSearch').addEventListener('input', function(){ poolQ = $('poolSearch').value.trim(); renderPool(); });
  $('poolBox').addEventListener('click', function(e){
    var f = e.target.closest('[data-fav]'), b = e.target.closest('[data-ban]');
    if(f){
      var id = f.getAttribute('data-fav'), i = S.fav.indexOf(id);
      if(i>=0) S.fav.splice(i,1); else S.fav.push(id);
      save(); renderPool();
    }else if(b){
      var id2 = b.getAttribute('data-ban'), j = S.banned.indexOf(id2);
      if(j>=0) S.banned.splice(j,1); else S.banned.push(id2);
      save(); renderPool();
    }
  });
  $('addType').addEventListener('click', function(e){
    var b = e.target.closest('.chip'); if(!b) return;
    $('addType').querySelectorAll('.chip').forEach(function(x){ x.classList.toggle('on', x===b); });
  });
  $('btnAdd').addEventListener('click', function(){
    var n = $('addName').value.trim();
    if(!n){ toast('写个名字'); return; }
    var t = $('addType').querySelector('.chip.on').getAttribute('data-v');
    addCustom(n,t); $('addName').value=''; save(); renderPool(); renderPool();
    toast('加好了');
  });
  $('comboBox').addEventListener('click', function(e){
    var d = e.target.closest('[data-cdelcombo]');
    if(d){ S.combos.splice(Number(d.getAttribute('data-cdelcombo')),1); save(); renderCombos(); }
  });
  $('comboClear').addEventListener('click', function(){ S.combos=[]; save(); renderCombos(); toast('清空了'); });
  $('btnResetRecent').addEventListener('click', function(){ S.recent=[]; save(); renderPool(); toast('「摇过的」记录清了，老地方会重新出现'); });
  $('btnResetAll').addEventListener('click', function(){
    if(!confirm('会清掉你自己加的所有条目和收藏，确定吗？')) return;
    localStorage.removeItem(KEY); S = defState(); location.reload();
  });

  // 实时
  $('amapKey').addEventListener('change', function(){ S.amapKey = $('amapKey').value.trim(); save(); renderLiveNote(); });
  $('amapKey').addEventListener('blur', function(){ S.amapKey = $('amapKey').value.trim(); save(); renderLiveNote(); });
  $('btnLive').addEventListener('click', fetchLive);
  $('btnLiveClear').addEventListener('click', function(){ S.live=[]; save(); renderLiveNote(); renderPool(); toast('实时数据清了'); });

  // 导航
  $('nav').addEventListener('click', function(e){
    var b = e.target.closest('button'); if(!b) return;
    var p = b.getAttribute('data-p');
    $('nav').querySelectorAll('button').forEach(function(x){ x.classList.toggle('on', x===b); });
    $('pgRoll').classList.toggle('hide', p!=='roll');
    $('pgIdea').classList.toggle('hide', p!=='idea');
    $('pgPool').classList.toggle('hide', p!=='pool');
    window.scrollTo({top:0, behavior:'smooth'});
    if(p==='pool') renderPool();
    if(p==='idea') renderIdeas();
  });
}

function copy(txt){
  if(navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext){
    navigator.clipboard.writeText(txt).catch(function(){ legacyCopy(txt); });
    return true;
  }
  return legacyCopy(txt);
}
function legacyCopy(t){
  var ta = document.createElement('textarea');
  ta.value = t; ta.style.position='fixed'; ta.style.top='0'; ta.style.left='0';
  ta.style.opacity='0.01'; ta.style.fontSize='16px';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  ta.setSelectionRange(0, t.length);
  var ok = false;
  try{ ok = document.execCommand('copy'); }catch(e){ ok = false; }
  document.body.removeChild(ta);
  return ok;
}

/* ===================== 启动 ===================== */
function initDate(){
  var d = new Date();
  var w = ['日','一','二','三','四','五','六'][d.getDay()];
  $('dToday').textContent = (d.getMonth()+1)+' 月 '+d.getDate()+' 日';
  $('dWeek').textContent = '星期'+w;
}

function init(){
  load(); buildLib(); initDate(); bind(); renderCond(); renderMachine(); renderPlan();
  save();
  var first = new Date().getHours();
  if(first>=6 && first<11) $('condCard').classList.add('open');
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
