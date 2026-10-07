(function(){
"use strict";

var SUPABASE_URL="https://ibqpjcedzcllacbamrnu.supabase.co";
var SUPABASE_KEY="sb_publishable_s-EiUNh66D17Xd3JFGUyvA_aNEDNMKq";
var API_URL=SUPABASE_URL+"/functions/v1/boss-board-api";
var BOSSES=["스우","가엔슬","세렌","칼로스","대적자","카링","흉성","벨로나","림보","발드릭스","유피테르","검은 마법사"];
var MULT_KEY="boss-board-party-boss-multipliers-v2";
var LEGACY_MULT_KEY="boss-board-party-boss-multipliers-v1";
var SELECT_KEY="boss-board-party-boss-selection-v1";
var SETTINGS_KEY="boss-board-party-boss-settings-v1";
var RESULT_KEY="boss-board-party-boss-result-v1";
var DATA={owners:[]};
var RESULT=[];
var loading=false;
var DIRTY=false;

function esc(s){
  return String(s==null?"":s).replace(/[&<>"']/g,function(m){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];
  });
}
function readJSON(key,fallback){
  try{
    var value=JSON.parse(localStorage.getItem(key)||"null");
    return value==null?fallback:value;
  }catch(e){return fallback}
}
var MULT=readJSON(MULT_KEY,{});
var LEGACY_MULT=readJSON(LEGACY_MULT_KEY,{});
var SELECTED=readJSON(SELECT_KEY,[]);
var SETTINGS=Object.assign({boss:"카링",partySize:3,targetRate:0},readJSON(SETTINGS_KEY,{}));
var SAVED_RESULT=readJSON(RESULT_KEY,[]);

function markDirty(){DIRTY=true}
function serializeResult(){
  return RESULT.map(function(p){
    return {id:p.id,memberKeys:p.members.map(function(c){return c.key})};
  });
}
function restoreSavedResult(){
  if(!Array.isArray(SAVED_RESULT)||!SAVED_RESULT.length){RESULT=[];return}
  var byKey={};
  allChars().forEach(function(c){byKey[c.key]=c});
  RESULT=SAVED_RESULT.map(function(saved,i){
    var members=(saved.memberKeys||[]).map(function(key){return byKey[key]}).filter(Boolean);
    if(!members.length)return null;
    return {
      id:Number(saved.id)||i+1,
      max:members.length,
      members:members,
      total:members.reduce(function(sum,c){return sum+c.multiplier},0)
    };
  }).filter(Boolean);
}
function savePrefs(){
  materializeCurrentBossMultipliers();
  localStorage.setItem(MULT_KEY,JSON.stringify(MULT));
  localStorage.setItem(SELECT_KEY,JSON.stringify(SELECTED));
  localStorage.setItem(SETTINGS_KEY,JSON.stringify(SETTINGS));
  localStorage.setItem(RESULT_KEY,JSON.stringify(serializeResult()));
  SAVED_RESULT=serializeResult();
  DIRTY=false;
  render();
  notify("파티보스를 저장했어요.");
}
function ownerTheme(name){
  if(name==="오똑")return"ottok";
  if(name==="츠죠")return"tsujyo";
  if(name==="피콕")return"peacock";
  if(name==="꿈품은")return"dream";
  if(name==="달하늘의별을")return"sky";
  if(name==="띵스")return"ochre";
  return"default";
}
function charKey(ownerId,name){return String(ownerId||"")+"|"+String(name||"").trim()}
function bossMultiplierMap(boss,create){
  boss=String(boss||SETTINGS.boss||"");
  var map=MULT[boss];
  if(map&&typeof map==="object"&&!Array.isArray(map))return map;
  if(create){
    MULT[boss]=Object.assign({},LEGACY_MULT);
    return MULT[boss];
  }
  return null;
}
function getBossMultiplier(boss,key){
  var map=bossMultiplierMap(boss,false);
  if(map)return Math.max(0,Number(map[key])||0);
  if(Number(LEGACY_MULT[key])>0)return Math.max(0,Number(LEGACY_MULT[key])||0);
  return 0;
}
function setBossMultiplier(boss,key,value){
  var map=bossMultiplierMap(boss,true);
  value=Math.max(0,Number(value)||0);
  if(value>0)map[key]=value;
  else delete map[key];
}
function materializeCurrentBossMultipliers(){
  bossMultiplierMap(String(SETTINGS.boss||""),true);
}
function allChars(){
  var out=[];
  (DATA.owners||[]).forEach(function(o){
    var board=o.board||{},players=Array.isArray(board.players)?board.players:[];
    players.forEach(function(name,pi){
      var clean=String(name||"").trim();
      if(!clean)return;
      var key=charKey(o.id,clean);
      out.push({
        key:key,
        ownerId:o.id,
        ownerName:o.name,
        theme:ownerTheme(o.name),
        name:clean,
        pi:pi,
        multiplier:getBossMultiplier(SETTINGS.boss,key)
      });
    });
  });
  return out;
}
function selectedChars(){
  var set=new Set(SELECTED);
  return allChars().filter(function(c){return set.has(c.key)});
}
function formatRate(n){
  n=Math.max(0,Number(n)||0);
  return n.toFixed(2).replace(/\.00$/,"").replace(/(\.\d)0$/,"$1")+"%";
}
function improveParties(parties){
  var loops=0,improved=true;
  while(improved&&loops<120){
    improved=false;loops++;
    var totals=parties.map(function(p){return p.total});
    var currentRange=Math.max.apply(null,totals)-Math.min.apply(null,totals);
    outer:
    for(var ai=0;ai<parties.length;ai++){
      for(var bi=ai+1;bi<parties.length;bi++){
        var A=parties[ai],B=parties[bi];
        for(var am=0;am<A.members.length;am++){
          for(var bm=0;bm<B.members.length;bm++){
            var av=A.members[am].multiplier,bv=B.members[bm].multiplier;
            var newA=A.total-av+bv,newB=B.total-bv+av;
            var check=parties.map(function(p){return p===A?newA:(p===B?newB:p.total)});
            var nextRange=Math.max.apply(null,check)-Math.min.apply(null,check);
            if(nextRange+0.000001<currentRange){
              var temp=A.members[am];A.members[am]=B.members[bm];B.members[bm]=temp;
              A.total=newA;B.total=newB;improved=true;
              break outer;
            }
          }
        }
      }
    }
  }
  return parties;
}
function balanceByPartyCount(chars,partyCount){
  partyCount=Math.max(1,Math.min(chars.length,Number(partyCount)||1));
  var base=Math.floor(chars.length/partyCount);
  var extra=chars.length%partyCount;
  var parties=[];
  for(var i=0;i<partyCount;i++){
    parties.push({id:i+1,max:base+(i<extra?1:0),members:[],total:0});
  }
  var ordered=chars.slice().sort(function(a,b){
    if(b.multiplier!==a.multiplier)return b.multiplier-a.multiplier;
    return String(a.name).localeCompare(String(b.name),"ko");
  });
  ordered.forEach(function(ch){
    var candidates=parties.filter(function(p){return p.members.length<p.max});
    candidates.sort(function(a,b){
      if(a.total!==b.total)return a.total-b.total;
      return a.members.length-b.members.length;
    });
    var p=candidates[0];
    p.members.push(ch);p.total+=ch.multiplier;
  });
  return improveParties(parties);
}
function targetBandPenalty(parties,target){
  if(!(target>0))return 0;
  var low=target,high=target+10;
  return parties.reduce(function(score,p){
    var miss=p.total<low?low-p.total:(p.total>high?p.total-high:0);
    return score+miss*miss*100;
  },0);
}
function scoreParties(parties,target){
  if(!parties.length)return Number.POSITIVE_INFINITY;
  var totals=parties.map(function(p){return p.total});
  var spread=Math.max.apply(null,totals)-Math.min.apply(null,totals);
  var center=(target>0)?target+5:totals.reduce(function(a,b){return a+b},0)/totals.length;
  var centerError=totals.reduce(function(sum,v){var d=v-center;return sum+d*d},0);
  return targetBandPenalty(parties,target)+spread*spread+centerError*.03;
}
function balance(chars,partySize,targetRate){
  if(!chars.length)return[];
  if(partySize!=="any"){
    var fixed=Math.max(2,Math.min(6,Number(partySize)||3));
    var count=Math.max(1,Math.ceil(chars.length/fixed));
    return balanceByPartyCount(chars,count);
  }

  var n=chars.length;
  if(n<=2)return balanceByPartyCount(chars,1);
  var minParties=Math.max(1,Math.ceil(n/6));
  var maxParties=Math.max(1,Math.floor(n/2));
  if(maxParties<minParties)maxParties=minParties;

  var target=Math.max(0,Number(targetRate)||0);
  var best=null,bestScore=Number.POSITIVE_INFINITY;
  for(var k=minParties;k<=maxParties;k++){
    var candidate=balanceByPartyCount(chars,k);
    var score=scoreParties(candidate,target);
    if(score<bestScore){
      bestScore=score;
      best=candidate;
    }
  }
  return best||balanceByPartyCount(chars,1);
}
function fetchBoard(restoreResult){
  if(loading)return Promise.resolve();
  loading=true;
  return fetch(API_URL,{
    method:"POST",
    mode:"cors",
    cache:"no-store",
    headers:{"Content-Type":"application/json","apikey":SUPABASE_KEY},
    body:JSON.stringify({action:"bootstrap"})
  }).then(function(res){
    return res.json().then(function(data){
      if(!res.ok||data.ok===false)throw new Error(data.error||"보스 현황판을 불러오지 못했습니다.");
      DATA.owners=Array.isArray(data.owners)?data.owners:[];
      if(restoreResult)restoreSavedResult();
    });
  }).finally(function(){loading=false});
}
function build(){
  var chars=selectedChars();
  if(chars.length<2){
    RESULT=[];
    markDirty();
    render();
    notify("파티를 짤 캐릭터를 2명 이상 선택해 주세요.");
    return;
  }
  var missing=chars.filter(function(c){return !(c.multiplier>0)});
  if(missing.length){
    RESULT=[];
    markDirty();
    render();
    notify("선택한 캐릭터의 배율을 모두 입력해 주세요.");
    return;
  }
  RESULT=balance(chars,SETTINGS.partySize,SETTINGS.targetRate);
  markDirty();
  render();
}
function notify(msg){
  var toast=document.getElementById("toast");
  if(!toast)return;
  toast.textContent=msg;
  toast.classList.add("show");
  setTimeout(function(){toast.classList.remove("show")},1900);
}
function toggleOwner(ownerId){
  var chars=allChars().filter(function(c){return c.ownerId===ownerId});
  var all=chars.length&&chars.every(function(c){return SELECTED.indexOf(c.key)>=0});
  chars.forEach(function(c){
    var i=SELECTED.indexOf(c.key);
    if(all&&i>=0)SELECTED.splice(i,1);
    if(!all&&i<0)SELECTED.push(c.key);
  });
  RESULT=[];
  markDirty();
  render();
}
function render(){
  var panel=document.getElementById("partyBossPanel");
  if(!panel)return;
  var chars=allChars();
  if(!chars.length){
    panel.innerHTML='<div class="party-boss-empty"><strong>캐릭터 정보를 불러오는 중…</strong><span>잠시만 기다려 주세요.</span></div>';
    return;
  }
  var selectedSet=new Set(SELECTED);
  var selected=chars.filter(function(c){return selectedSet.has(c.key)});
  var html='';

  html+='<section class="party-boss-shell">';
  html+='<header class="party-boss-head">';
  html+='<div><span>PARTY BALANCER</span><strong>파티보스</strong><p>선택한 캐릭터들의 총 배율이 최대한 비슷하게 자동 편성됩니다.</p></div>';
  html+='<div class="party-boss-head-actions">';
  html+='<button class="party-boss-save '+(DIRTY?"needs-save":"")+'" type="button" data-pb-save="1">'+(DIRTY?"저장":"저장됨")+'</button>';
  html+='<button class="party-boss-reset" type="button" data-pb-reset="1">선택 초기화</button>';
  html+='</div>';
  html+='</header>';

  html+='<section class="party-boss-controls">';
  html+='<label><span>보스</span><select data-pb-boss="1">';
  BOSSES.forEach(function(b){
    html+='<option value="'+esc(b)+'" '+(SETTINGS.boss===b?"selected":"")+'>'+esc(b)+'</option>';
  });
  html+='</select></label>';
  html+='<label><span>파티 인원</span><select data-pb-size="1">';
  html+='<option value="any" '+(String(SETTINGS.partySize)==="any"?"selected":"")+'>상관없음</option>';
  [2,3,4,5,6].forEach(function(n){
    html+='<option value="'+n+'" '+(String(SETTINGS.partySize)===String(n)?"selected":"")+'>'+n+'인</option>';
  });
  html+='</select></label>';
  html+='<label class="party-boss-target"><span>목표 배율</span><div><input type="number" min="0" step="1" inputmode="decimal" data-pb-target="1" value="'+(Number(SETTINGS.targetRate)>0?String(SETTINGS.targetRate):"")+'" placeholder="140"><em>입력값 ~ +10%</em></div></label>';
  html+='<div class="party-boss-summary"><span>선택 캐릭터</span><b>'+selected.length+'명</b></div>';
  html+='<button class="party-boss-build" type="button" data-pb-build="1">자동 균형 맞추기</button>';
  html+='</section>';

  html+='<section class="party-boss-owner-groups">';
  (DATA.owners||[]).forEach(function(o){
    var own=chars.filter(function(c){return c.ownerId===o.id});
    if(!own.length)return;
    var allSelected=own.every(function(c){return selectedSet.has(c.key)});
    html+='<section class="party-boss-owner owner-themed" data-theme="'+ownerTheme(o.name)+'">';
    html+='<header><strong>'+esc(o.name)+'</strong><button type="button" data-pb-owner="'+esc(o.id)+'">'+(allSelected?"전체 해제":"전체 선택")+'</button></header>';
    html+='<div class="party-boss-char-grid">';
    own.forEach(function(c){
      var active=selectedSet.has(c.key);
      html+='<article class="party-boss-char owner-themed '+(active?"active":"")+'" data-theme="'+c.theme+'">';
      html+='<button class="party-boss-char-toggle" type="button" data-pb-char="'+esc(c.key)+'" aria-pressed="'+(active?"true":"false")+'">';
      html+='<span class="party-boss-avatar">'+esc(c.name.slice(0,1))+'</span>';
      html+='<span class="party-boss-char-name"><b>'+esc(c.name)+'</b><small>'+esc(c.ownerName)+'</small></span>';
      html+='</button>';
      html+='<label><span>'+esc(SETTINGS.boss)+' 배율</span><input type="number" min="0" step="0.01" inputmode="decimal" data-pb-mult="'+esc(c.key)+'" value="'+(c.multiplier?String(c.multiplier):"")+'" placeholder="78.32"></label>';
      html+='</article>';
    });
    html+='</div></section>';
  });
  html+='</section>';

  if(RESULT.length){
    var totals=RESULT.map(function(p){return p.total});
    var max=Math.max.apply(null,totals),min=Math.min.apply(null,totals);
    html+='<section class="party-boss-result">';
    var sizeLabel=String(SETTINGS.partySize)==="any"?"인원 상관없음":SETTINGS.partySize+"인 기준";
    var target=Number(SETTINGS.targetRate)||0;
    var targetLabel=target>0?" · 목표 "+formatRate(target)+" ~ "+formatRate(target+10):"";
    html+='<header><div><span>자동 편성 결과</span><strong>'+esc(SETTINGS.boss)+' · '+sizeLabel+targetLabel+'</strong></div>';
    html+='<div class="party-boss-gap"><span>파티간 차이</span><b>'+formatRate(max-min)+'</b></div></header>';
    html+='<div class="party-boss-result-grid">';
    RESULT.forEach(function(p){
      html+='<article class="party-boss-party-card '+(target>0?(p.total>=target&&p.total<=target+10?"in-target":"out-target"):"")+'">';
      var status=target>0?(p.total<target?"목표보다 낮음":(p.total>target+10?"목표보다 높음":"목표 범위")):"";
      html+='<header><div><span>'+p.id+'</span><b>'+p.id+'파티 · '+p.members.length+'명</b>'+(status?'<em>'+status+'</em>':'')+'</div><strong>'+formatRate(p.total)+'</strong></header>';
      html+='<div class="party-boss-members">';
      p.members.forEach(function(c){
        html+='<div class="party-boss-member owner-themed" data-theme="'+c.theme+'">';
        html+='<span class="party-boss-member-dot"></span>';
        html+='<div><b>'+esc(c.name)+'</b><small>'+esc(c.ownerName)+'</small></div>';
        html+='<strong>'+formatRate(c.multiplier)+'</strong>';
        html+='</div>';
      });
      html+='</div></article>';
    });
    html+='</div></section>';
  }else{
    html+='<div class="party-boss-empty"><strong>캐릭터를 선택하고 배율을 입력해 주세요.</strong><span>자동 균형 맞추기를 누르면 파티별 총 배율 차이가 가장 작도록 나눕니다.</span></div>';
  }

  html+='</section>';
  panel.innerHTML=html;

  var boss=panel.querySelector("[data-pb-boss]");
  if(boss)boss.onchange=function(){SETTINGS.boss=boss.value;RESULT=[];markDirty();render()};
  var size=panel.querySelector("[data-pb-size]");
  if(size)size.onchange=function(){SETTINGS.partySize=size.value==="any"?"any":(Number(size.value)||3);RESULT=[];markDirty();render()};
  var targetInput=panel.querySelector("[data-pb-target]");
  if(targetInput)targetInput.onchange=function(){
    SETTINGS.targetRate=Math.max(0,Number(targetInput.value)||0);
    RESULT=[];
    markDirty();
    render();
  };
  var buildBtn=panel.querySelector("[data-pb-build]");
  if(buildBtn)buildBtn.onclick=build;
  var saveBtn=panel.querySelector("[data-pb-save]");
  if(saveBtn)saveBtn.onclick=function(){if(DIRTY)savePrefs()};
  var resetBtn=panel.querySelector("[data-pb-reset]");
  if(resetBtn)resetBtn.onclick=function(){SELECTED=[];RESULT=[];markDirty();render()};

  Array.prototype.forEach.call(panel.querySelectorAll("[data-pb-owner]"),function(btn){
    btn.onclick=function(){toggleOwner(btn.dataset.pbOwner)};
  });
  Array.prototype.forEach.call(panel.querySelectorAll("[data-pb-char]"),function(btn){
    btn.onclick=function(){
      var key=btn.dataset.pbChar;
      var i=SELECTED.indexOf(key);
      if(i>=0)SELECTED.splice(i,1);else SELECTED.push(key);
      RESULT=[];
      markDirty();
      render();
    };
  });
  Array.prototype.forEach.call(panel.querySelectorAll("[data-pb-mult]"),function(input){
    input.onchange=function(){
      var key=input.dataset.pbMult;
      var v=Math.max(0,Number(input.value)||0);
      setBossMultiplier(SETTINGS.boss,key,v);
      RESULT=[];
      markDirty();
      render();
    };
    input.onclick=function(e){e.stopPropagation()};
  });
}

window.renderPartyBossPage=function(){
  fetchBoard(false).then(render).catch(function(e){
    var panel=document.getElementById("partyBossPanel");
    if(panel)panel.innerHTML='<div class="party-boss-empty"><strong>파티보스를 불러오지 못했어요.</strong><span>'+esc(e.message||"연결 오류")+'</span></div>';
  });
};

window.addEventListener("beforeunload",function(e){
  if(!DIRTY)return;
  e.preventDefault();
  e.returnValue="";
});

document.addEventListener("DOMContentLoaded",function(){
  fetchBoard(true).then(function(){
    if(document.getElementById("partyBossPanel"))render();
  }).catch(function(){});
});
})();