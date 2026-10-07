(function(){
"use strict";

var SUPABASE_URL="https://ibqpjcedzcllacbamrnu.supabase.co";
var SUPABASE_KEY="sb_publishable_s-EiUNh66D17Xd3JFGUyvA_aNEDNMKq";
var API_URL=SUPABASE_URL+"/functions/v1/boss-board-api";
var BOSSES=["스우","가엔슬","세렌","칼로스","대적자","카링","흉성","벨로나","림보","발드릭스","유피테르","검은 마법사"];
var BOSS_DIFFICULTIES={
  "스우":["노말","하드","익스트림"],
  "가엔슬":["노말","카오스"],
  "세렌":["노말","하드","익스트림"],
  "칼로스":["이지","노말","카오스","익스트림"],
  "대적자":["이지","노말","하드","익스트림"],
  "카링":["이지","노말","하드","익스트림"],
  "흉성":["노말","하드"],
  "벨로나":["이지","노말","하드"],
  "림보":["노말","하드"],
  "발드릭스":["노말","하드"],
  "유피테르":["노말","하드"],
  "검은 마법사":["하드","익스트림"]
};
var BOSS_CRYSTAL_PRICES={
  "스우":{"노말":8350000,"하드":48900000,"익스트림":545000000},
  "가엔슬":{"노말":12700000,"카오스":71300000},
  "세렌":{"노말":167000000,"하드":302000000,"익스트림":1840000000},
  "칼로스":{"이지":238000000,"노말":479000000,"카오스":1230000000,"익스트림":4140000000},
  "대적자":{"이지":261000000,"노말":532000000,"하드":1390000000,"익스트림":4712000000},
  "카링":{"이지":320000000,"노말":593000000,"하드":1560000000,"익스트림":5387000000},
  "흉성":{"노말":576000000,"하드":2678000000},
  "벨로나":{"이지":396000000,"노말":824000000,"하드":2950000000},
  "림보":{"노말":995000000,"하드":2385000000},
  "발드릭스":{"노말":1320000000,"하드":3078000000},
  "유피테르":{"노말":1560000000,"하드":4845000000},
  "검은 마법사":{"하드":465000000,"익스트림":5680000000}
};
var MULT_KEY="boss-board-party-boss-multipliers-v2";
var LEGACY_MULT_KEY="boss-board-party-boss-multipliers-v1";
var SELECT_KEY="boss-board-party-boss-selection-v1";
var SETTINGS_KEY="boss-board-party-boss-settings-v1";
var RESULT_KEY="boss-board-party-boss-result-v1";
var DATA={owners:[]};
var RESULT=[];
var loading=false;
var DIRTY=false;
var SAVING=false;
var SHARED_UPDATED_BY="";
var SHARED_UPDATED_AT="";
var SHARED_LOADED=false;
var RENDERING=false;
var RENDER_PENDING=false;
var RENDER_TIMER=null;

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
var SETTINGS=Object.assign({boss:"카링",difficulty:"하드",partySize:3,targetRate:0},readJSON(SETTINGS_KEY,{}));
var SAVED_RESULT=readJSON(RESULT_KEY,[]);

function defaultDifficulty(boss){
  var list=BOSS_DIFFICULTIES[boss]||[];
  return list.indexOf("하드")>=0?"하드":String(list[0]||"");
}
function normalizeDifficulty(){
  var list=BOSS_DIFFICULTIES[SETTINGS.boss]||[];
  if(list.indexOf(SETTINGS.difficulty)<0)SETTINGS.difficulty=defaultDifficulty(SETTINGS.boss);
}
function crystalPrice(){
  normalizeDifficulty();
  return Math.max(0,Number((BOSS_CRYSTAL_PRICES[SETTINGS.boss]||{})[SETTINGS.difficulty])||0);
}
function formatMeso(n){
  n=Math.max(0,Number(n)||0);
  if(n>=100000000){
    return (n/100000000).toFixed(2).replace(/\.00$/,"").replace(/(\.\d)0$/,"$1")+"억";
  }
  if(n>=10000){
    return (n/10000).toFixed(1).replace(/\.0$/,"")+"만";
  }
  return Math.round(n).toLocaleString("ko-KR");
}
function ownerMesoTotals(){
  var totals={};
  var base=crystalPrice();
  RESULT.forEach(function(p){
    var count=Math.max(1,p.members.length);
    var each=base/count;
    p.members.forEach(function(c){
      var key=String(c.ownerId||c.ownerName||"");
      if(!totals[key])totals[key]={ownerId:c.ownerId,ownerName:c.ownerName,theme:c.theme,total:0,runs:0};
      totals[key].total+=each;
      totals[key].runs++;
    });
  });
  return totals;
}
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
    var ownerIds=members.map(function(c){return String(c.ownerId||c.ownerName||"")});
    if(new Set(ownerIds).size!==ownerIds.length)return null;
    return {
      id:Number(saved.id)||i+1,
      max:members.length,
      members:members,
      total:members.reduce(function(sum,c){return sum+c.multiplier},0)
    };
  }).filter(Boolean);
  if(RESULT.length!==SAVED_RESULT.length)RESULT=[];
}
function persistLocalCache(){
  localStorage.setItem(MULT_KEY,JSON.stringify(MULT));
  localStorage.setItem(SELECT_KEY,JSON.stringify(SELECTED));
  localStorage.setItem(SETTINGS_KEY,JSON.stringify(SETTINGS));
  localStorage.setItem(RESULT_KEY,JSON.stringify(serializeResult()));
}
function currentSaverName(){
  var activeId=localStorage.getItem("boss-board-active-owner-v6")||"";
  var found=(DATA.owners||[]).find(function(o){return String(o.id)===String(activeId)});
  return found?String(found.name||""):"";
}
function partyEditing(){
  var panel=document.getElementById("partyBossPanel");
  var active=document.activeElement;
  return !!(panel&&active&&panel.contains(active)&&/^(INPUT|SELECT|TEXTAREA)$/.test(active.tagName));
}
function sharedMetaText(){
  if(!SHARED_LOADED)return "공용 저장본 연결 중";
  if(!SHARED_UPDATED_AT)return "공용 저장본 없음";
  var who=SHARED_UPDATED_BY?(" · "+SHARED_UPDATED_BY):"";
  var when="";
  try{
    var d=new Date(SHARED_UPDATED_AT);
    when=" · "+new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).format(d);
  }catch(e){}
  return "공용 저장"+who+when;
}
function apiCall(action,payload){
  payload=payload||{};
  var body=JSON.stringify(Object.assign({action:action},payload));
  function attempt(n){
    return fetch(API_URL,{
      method:"POST",
      mode:"cors",
      cache:"no-store",
      headers:{"Content-Type":"application/json","apikey":SUPABASE_KEY},
      body:body
    }).then(function(res){
      return res.text().then(function(t){
        var data={};try{data=JSON.parse(t)}catch(e){}
        if(!res.ok){var err=new Error(data.error||("요청 실패 ("+res.status+")"));err.status=res.status;throw err}
        return data;
      });
    }).catch(function(err){
      var transient=!err.status||err.status===500||err.status===502||err.status===503||err.status===504;
      if(transient&&n<2){
        return new Promise(function(resolve){setTimeout(resolve,n===0?350:900)}).then(function(){return attempt(n+1)});
      }
      throw err;
    });
  }
  return attempt(0);
}
function sharedPayload(){
  materializeCurrentBossMultipliers();
  return {
    settings:{
      boss:String(SETTINGS.boss||"카링"),
      difficulty:String(SETTINGS.difficulty||defaultDifficulty(SETTINGS.boss)),
      partySize:SETTINGS.partySize,
      targetRate:Math.max(0,Number(SETTINGS.targetRate)||0)
    },
    selected:SELECTED.slice(),
    multipliers:JSON.parse(JSON.stringify(MULT||{})),
    result:serializeResult()
  };
}
function applySharedState(state,updatedBy,updatedAt){
  if(!state||typeof state!=="object"||Array.isArray(state))return false;
  if(!state.settings&&!state.multipliers&&!state.selected&&!state.result)return false;
  SETTINGS=Object.assign({boss:"카링",difficulty:"하드",partySize:3,targetRate:0},state.settings||{});
  normalizeDifficulty();
  SELECTED=Array.isArray(state.selected)?state.selected.slice():[];
  MULT=(state.multipliers&&typeof state.multipliers==="object"&&!Array.isArray(state.multipliers))
    ?JSON.parse(JSON.stringify(state.multipliers))
    :{};
  SAVED_RESULT=Array.isArray(state.result)?JSON.parse(JSON.stringify(state.result)):[];
  SHARED_UPDATED_BY=String(updatedBy||"");
  SHARED_UPDATED_AT=String(updatedAt||"");
  SHARED_LOADED=true;
  restoreSavedResult();
  DIRTY=false;
  return true;
}
function loadSharedState(showError){
  if(DIRTY||SAVING||partyEditing())return Promise.resolve(false);
  return apiCall("party_boss_state_get").then(function(data){
    SHARED_LOADED=true;
    if(DIRTY||SAVING||partyEditing())return false;
    var nextUpdatedAt=String(data.updatedAt||"");
    if(nextUpdatedAt&&nextUpdatedAt===SHARED_UPDATED_AT)return false;
    var applied=applySharedState(data.state,data.updatedBy,data.updatedAt);
    if(!applied){
      SHARED_UPDATED_BY=String(data.updatedBy||"");
      SHARED_UPDATED_AT=nextUpdatedAt;
    }
    if(applied)render();
    return applied;
  }).catch(function(e){
    SHARED_LOADED=true;
    if(showError)notify(e.message||"공용 파티보스를 불러오지 못했어요.");
    return false;
  });
}
function savePrefs(){
  if(SAVING||!DIRTY)return;
  var payload=sharedPayload();
  SAVING=true;
  render();
  apiCall("party_boss_state_save",{payload:payload,updatedBy:currentSaverName()}).then(function(data){
    applySharedState(data.state,data.updatedBy,data.updatedAt);
    persistLocalCache();
    notify("공용 파티보스로 저장했어요.");
  }).catch(function(e){
    notify(e.message||"공용 파티보스를 저장하지 못했어요.");
  }).finally(function(){
    SAVING=false;
    render();
  });
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
    MULT[boss]={};
    return MULT[boss];
  }
  return null;
}
function getBossMultiplier(boss,key){
  var map=bossMultiplierMap(boss,false);
  if(map)return Math.max(0,Number(map[key])||0);
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
function partyHasOwner(party,ownerId,exceptIndex){
  return party.members.some(function(member,index){
    return index!==exceptIndex&&String(member.ownerId)===String(ownerId);
  });
}
function maxSelectedOwnerCount(chars){
  var counts={};
  chars.forEach(function(c){
    var key=String(c.ownerId||c.ownerName||"");
    counts[key]=(counts[key]||0)+1;
  });
  var max=0;
  Object.keys(counts).forEach(function(key){if(counts[key]>max)max=counts[key]});
  return max;
}
function canMakeTwoPlusParties(chars){
  if(chars.length<2)return false;
  return maxSelectedOwnerCount(chars)<=Math.floor(chars.length/2);
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
            var aMember=A.members[am],bMember=B.members[bm];
            if(partyHasOwner(A,bMember.ownerId,am))continue;
            if(partyHasOwner(B,aMember.ownerId,bm))continue;
            var av=aMember.multiplier,bv=bMember.multiplier;
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
function balanceByPartyCount(chars,partyCount,maxPartySize){
  partyCount=Math.max(1,Math.min(chars.length,Number(partyCount)||1));
  maxPartySize=Math.max(1,Math.min(6,Number(maxPartySize)||6));
  var parties=[];
  for(var i=0;i<partyCount;i++){
    parties.push({id:i+1,max:maxPartySize,members:[],total:0});
  }
  var ownerCounts={};
  chars.forEach(function(c){
    var ownerKey=String(c.ownerId||c.ownerName||"");
    ownerCounts[ownerKey]=(ownerCounts[ownerKey]||0)+1;
  });
  var ordered=chars.slice().sort(function(a,b){
    var ao=ownerCounts[String(a.ownerId||a.ownerName||"")]||0;
    var bo=ownerCounts[String(b.ownerId||b.ownerName||"")]||0;
    if(bo!==ao)return bo-ao;
    if(b.multiplier!==a.multiplier)return b.multiplier-a.multiplier;
    return String(a.name).localeCompare(String(b.name),"ko");
  });

  for(var oi=0;oi<ordered.length;oi++){
    var ch=ordered[oi];
    var candidates=parties.filter(function(p){
      return p.members.length<p.max&&!partyHasOwner(p,ch.ownerId,-1);
    });
    if(!candidates.length)return null;
    candidates.sort(function(a,b){
      if(a.total!==b.total)return a.total-b.total;
      return a.members.length-b.members.length;
    });
    var p=candidates[0];
    p.members.push(ch);p.total+=ch.multiplier;
  }
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
  var ownerMin=maxSelectedOwnerCount(chars);

  if(partySize!=="any"){
    var fixed=Math.max(2,Math.min(6,Number(partySize)||3));
    var count=Math.max(1,Math.ceil(chars.length/fixed),ownerMin);
    var fixedResult=balanceByPartyCount(chars,count,fixed);
    return fixedResult||[];
  }

  var n=chars.length;
  if(n<=2){
    var tiny=balanceByPartyCount(chars,Math.max(1,ownerMin),6);
    return tiny||[];
  }
  var minParties=Math.max(1,Math.ceil(n/6),ownerMin);
  var maxParties=Math.max(1,Math.floor(n/2));
  if(maxParties<minParties)return[];

  var target=Math.max(0,Number(targetRate)||0);
  var best=null,bestScore=Number.POSITIVE_INFINITY;
  for(var k=minParties;k<=maxParties;k++){
    var candidate=balanceByPartyCount(chars,k,6);
    if(!candidate)continue;
    if(candidate.some(function(p){return p.members.length<2}))continue;
    var score=scoreParties(candidate,target);
    if(score<bestScore){
      bestScore=score;
      best=candidate;
    }
  }
  return best||[];
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
  if(!canMakeTwoPlusParties(chars)){
    RESULT=[];
    markDirty();
    render();
    notify("같은 주인의 캐릭터가 너무 많아서 한 파티에 1캐릭터씩 나눌 수 없어요. 다른 주인 캐릭터를 더 선택해 주세요.");
    return;
  }
  RESULT=balance(chars,SETTINGS.partySize,SETTINGS.targetRate);
  if(!RESULT.length){
    markDirty();
    render();
    notify("같은 주인 캐릭터가 한 파티에 겹치지 않도록 편성할 수 없어요.");
    return;
  }
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
  if(RENDERING){
    RENDER_PENDING=true;
    return;
  }
  RENDERING=true;
  try{
    return renderNow();
  }finally{
    RENDERING=false;
    if(RENDER_PENDING){
      RENDER_PENDING=false;
      clearTimeout(RENDER_TIMER);
      RENDER_TIMER=setTimeout(render,0);
    }
  }
}
function renderNow(){
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
  html+='<span class="party-boss-shared-meta">'+esc(sharedMetaText())+'</span>';
  html+='<button class="party-boss-save '+(DIRTY&&!SAVING?"needs-save":"")+'" type="button" data-pb-save="1" '+(SAVING?"disabled":"")+'>'+(SAVING?"저장 중…":(DIRTY?"저장":"공용 저장됨"))+'</button>';
  html+='<button class="party-boss-reset" type="button" data-pb-reset="1">선택 초기화</button>';
  html+='</div>';
  html+='</header>';

  html+='<section class="party-boss-controls">';
  html+='<label><span>보스</span><select data-pb-boss="1">';
  BOSSES.forEach(function(b){
    html+='<option value="'+esc(b)+'" '+(SETTINGS.boss===b?"selected":"")+'>'+esc(b)+'</option>';
  });
  html+='</select></label>';
  normalizeDifficulty();
  html+='<label><span>난이도</span><select data-pb-difficulty="1">';
  (BOSS_DIFFICULTIES[SETTINGS.boss]||[]).forEach(function(d){
    html+='<option value="'+esc(d)+'" '+(SETTINGS.difficulty===d?"selected":"")+'>'+esc(d)+'</option>';
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
      html+='<label><span>'+esc(SETTINGS.boss)+' 배율</span><input type="number" min="0" step="0.01" inputmode="decimal" data-pb-mult="'+esc(c.key)+'" value="'+String(c.multiplier||0)+'" placeholder="0"></label>';
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
    html+='<header><div><span>자동 편성 결과</span><strong>'+esc(SETTINGS.boss)+' · '+esc(SETTINGS.difficulty)+' · '+sizeLabel+targetLabel+'</strong></div>';
    html+='<div class="party-boss-gap"><span>파티간 차이</span><b>'+formatRate(max-min)+'</b></div></header>';
    html+='<div class="party-boss-result-grid">';
    RESULT.forEach(function(p){
      html+='<article class="party-boss-party-card '+(target>0?(p.total>=target&&p.total<=target+10?"in-target":"out-target"):"")+'">';
      var status=target>0?(p.total<target?"목표보다 낮음":(p.total>target+10?"목표보다 높음":"목표 범위")):"";
      var partyMesoEach=crystalPrice()/Math.max(1,p.members.length);
      html+='<header><div><span>'+p.id+'</span><b>'+p.id+'파티 · '+p.members.length+'명</b>'+(status?'<em>'+status+'</em>':'')+'</div><div class="party-boss-party-totals"><strong>'+formatRate(p.total)+'</strong><small>인당 '+formatMeso(partyMesoEach)+'</small></div></header>';
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
    html+='</div>';
    var mesoTotals=ownerMesoTotals();
    var mesoRows=(DATA.owners||[]).map(function(o){return mesoTotals[String(o.id)]}).filter(Boolean);
    if(mesoRows.length){
      html+='<section class="party-boss-meso-summary">';
      html+='<header><div><span>OWNER MESO</span><strong>주인별 예상 메소 총합</strong></div><small>'+esc(SETTINGS.boss)+' · '+esc(SETTINGS.difficulty)+' 결정석 기준</small></header>';
      html+='<div class="party-boss-meso-grid">';
      mesoRows.forEach(function(row){
        html+='<article class="party-boss-meso-card owner-themed" data-theme="'+esc(row.theme)+'"><div><b>'+esc(row.ownerName)+'</b><small>'+row.runs+'캐릭터</small></div><strong>'+formatMeso(row.total)+'</strong></article>';
      });
      html+='</div></section>';
    }
    html+='</section>';
  }else{
    html+='<div class="party-boss-empty"><strong>캐릭터를 선택하고 배율을 입력해 주세요.</strong><span>자동 균형 맞추기를 누르면 파티별 총 배율 차이가 가장 작도록 나눕니다.</span></div>';
  }

  html+='</section>';
  panel.innerHTML=html;

  var boss=panel.querySelector("[data-pb-boss]");
  if(boss)boss.onchange=function(){SETTINGS.boss=boss.value;SETTINGS.difficulty=defaultDifficulty(SETTINGS.boss);RESULT=[];markDirty();render()};
  var difficulty=panel.querySelector("[data-pb-difficulty]");
  if(difficulty)difficulty.onchange=function(){SETTINGS.difficulty=difficulty.value;markDirty();render()};
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
  if(saveBtn)saveBtn.onclick=savePrefs;
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

window.refreshPartyBossShared=function(){
  if(DIRTY||SAVING||partyEditing())return Promise.resolve(false);
  return loadSharedState(false);
};
window.renderPartyBossPage=function(){
  fetchBoard(false).then(function(){
    return loadSharedState(false);
  }).then(render).catch(function(e){
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
    return loadSharedState(false);
  }).then(function(){
    if(document.getElementById("partyBossPanel"))render();
  }).catch(function(){});
});
})();