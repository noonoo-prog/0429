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
var GUEST_KEY="boss-board-party-boss-external-v1";
var SLOT_KEY="boss-board-party-boss-saved-slots-v1";
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
var BUILDING=false;
var MESO_SORT="original";
var PANEL_OPEN={};
var EDIT_MODE=false;
var MANUAL_PICK="";
var MANUAL_ADD="";
var MANUAL_DRAG="";
var MANUAL_UNDO=null;
var COMPARING=false;
var COMPARE_RESULTS=[];
var COMPARE_PROGRESS="";
var MODES=[
  {id:"balanced",name:"균형형",desc:"파티별 총 배율을 비슷하게"},
  {id:"strong",name:"강자 우대형",desc:"강한 캐릭터는 소수팟 우선"},
  {id:"equal",name:"수익 균등형",desc:"주인별 결정석 수익 격차 완화"},
  {id:"small",name:"최소 인원형",desc:"가능한 2~3인팟을 많이"},
  {id:"safe",name:"안정형",desc:"목표보다 여유 있는 배율"}
];
function modeName(mode){
  var found=MODES.find(function(m){return m.id===mode});
  return found?found.name:"강자 우대형";
}
function normalizeMode(mode){
  return MODES.some(function(m){return m.id===mode})?mode:"strong";
}

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
var SETTINGS=Object.assign({boss:"카링",difficulty:"하드",partySize:"any",partyCount:0,targetRate:130,mode:"strong"},readJSON(SETTINGS_KEY,{}));
var SAVED_RESULT=readJSON(RESULT_KEY,[]);
var GUESTS=readJSON(GUEST_KEY,[]);
if(!Array.isArray(GUESTS))GUESTS=[];
var SAVED_SLOTS=readJSON(SLOT_KEY,[null,null,null]);
if(!Array.isArray(SAVED_SLOTS))SAVED_SLOTS=[null,null,null];
SAVED_SLOTS=[0,1,2].map(function(i){return SAVED_SLOTS[i]||null});
SETTINGS.targetRate=Math.max(1,Number(SETTINGS.targetRate)||130);
SETTINGS.mode=normalizeMode(SETTINGS.mode);

function defaultDifficulty(boss){
  var list=BOSS_DIFFICULTIES[boss]||[];
  if(boss==="검은 마법사"&&list.indexOf("익스트림")>=0)return "익스트림";
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
  var avgs=ownerAverages(selectedChars());
  Object.keys(totals).forEach(function(key){
    var row=totals[key];
    row.averageRate=avgs[key]||0;
    row.grade=averageGrade(row.averageRate);
    row.averageMeso=row.runs?row.total/row.runs:0;
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
    if(new Set(members.map(function(c){return String(c.ownerId||c.ownerName||"")})).size!==members.length)return null;
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
  localStorage.setItem(GUEST_KEY,JSON.stringify(GUESTS));
  localStorage.setItem(SLOT_KEY,JSON.stringify(SAVED_SLOTS));
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
      partyCount:Math.max(0,Math.floor(Number(SETTINGS.partyCount)||0)),
      targetRate:Math.max(1,Number(SETTINGS.targetRate)||130),
      mode:normalizeMode(SETTINGS.mode)
    },
    selected:SELECTED.slice(),
    guests:GUESTS.map(function(g){return {id:g.id,name:g.name,owner:g.owner||""}}),
    multipliers:JSON.parse(JSON.stringify(MULT||{})),
    result:serializeResult(),
    savedSlots:SAVED_SLOTS.map(function(slot){return slot?JSON.parse(JSON.stringify(slot)):null})
  };
}
function applySharedState(state,updatedBy,updatedAt){
  if(!state||typeof state!=="object"||Array.isArray(state))return false;
  if(!state.settings&&!state.multipliers&&!state.selected&&!state.result&&!state.guests)return false;
  SETTINGS=Object.assign({boss:"카링",difficulty:"하드",partySize:"any",partyCount:0,targetRate:130,mode:"strong"},state.settings||{});
  normalizeDifficulty();
  SETTINGS.targetRate=Math.max(1,Number(SETTINGS.targetRate)||130);
  SETTINGS.mode=normalizeMode(SETTINGS.mode);
  COMPARE_RESULTS=[];
  SELECTED=Array.isArray(state.selected)?state.selected.slice():[];
  MULT=(state.multipliers&&typeof state.multipliers==="object"&&!Array.isArray(state.multipliers))
    ?JSON.parse(JSON.stringify(state.multipliers))
    :{};
  GUESTS=Array.isArray(state.guests)?state.guests.filter(function(g){
    return g&&typeof g.id==="string"&&/^ext-[a-z0-9-]{1,70}$/.test(g.id)&&String(g.name||"").trim();
  }).map(function(g){return {id:g.id,name:String(g.name).trim(),owner:String(g.owner||"").trim()}}):[];
  SAVED_RESULT=Array.isArray(state.result)?JSON.parse(JSON.stringify(state.result)):[];
  SAVED_SLOTS=[0,1,2].map(function(i){
    var slot=Array.isArray(state.savedSlots)?state.savedSlots[i]:null;
    return slot&&typeof slot==="object"&&!Array.isArray(slot)?JSON.parse(JSON.stringify(slot)):null;
  });
  SHARED_UPDATED_BY=String(updatedBy||"");
  SHARED_UPDATED_AT=String(updatedAt||"");
  SHARED_LOADED=true;
  restoreSavedResult();
  MANUAL_PICK="";MANUAL_ADD="";MANUAL_DRAG="";MANUAL_UNDO=null;
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
function currentResultSnapshot(){
  var settings={
    boss:SETTINGS.boss,
    difficulty:SETTINGS.difficulty,
    partySize:SETTINGS.partySize,
    partyCount:Math.max(0,Math.floor(Number(SETTINGS.partyCount)||0)),
    targetRate:Math.max(1,Number(SETTINGS.targetRate)||130),
    mode:normalizeMode(SETTINGS.mode)
  };
  var result=serializeResult();
  var keys=Array.from(new Set(SELECTED.concat(result.reduce(function(a,p){return a.concat(p.memberKeys)},[]))));
  var rates={};
  keys.forEach(function(key){rates[key]=getBossMultiplier(SETTINGS.boss,key)});
  var guestIds=new Set(keys.filter(function(key){return key.indexOf("guest|")===0}).map(function(key){return key.slice(6)}));
  var guests=GUESTS.filter(function(g){return guestIds.has(g.id)}).map(function(g){return {id:g.id,name:g.name,owner:g.owner||""}});
  return {savedAt:new Date().toISOString(),settings:settings,selected:keys,guests:guests,multipliers:rates,result:result};
}
function formatSlotTime(value){
  try{
    var d=new Date(value);
    if(!Number.isFinite(d.getTime()))return "";
    return new Intl.DateTimeFormat("ko-KR",{
      timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit",
      hour:"2-digit",minute:"2-digit",hour12:false
    }).format(d);
  }catch(e){return ""}
}
function saveResultSlot(index){
  if(SAVING||BUILDING||COMPARING)return;
  index=Number(index);
  if(!Number.isInteger(index)||index<0||index>2)return;
  if(!RESULT.length){notify("저장할 편성 결과가 없어요. 먼저 자동 편성하거나 저장된 결과를 불러오세요.");return}
  if(SAVED_SLOTS[index]&&!window.confirm((index+1)+"번 슬롯에 현재 결과를 덮어쓸까요?"))return;
  SAVED_SLOTS[index]=currentResultSnapshot();
  markDirty();
  persistLocalCache();
  render();
  savePrefs(); // A slot save commits the full shared state immediately.
}
function loadResultSlot(index){
  if(SAVING||BUILDING||COMPARING)return;
  index=Number(index);
  var snapshot=SAVED_SLOTS[index];
  if(!snapshot||!snapshot.result||!snapshot.result.length)return;
  if(DIRTY&&!window.confirm("현재 저장하지 않은 수정 사항이 있어요. 저장된 "+(index+1)+"번 편성으로 교체할까요?"))return;
  var old={
    settings:SETTINGS,selected:SELECTED,guests:GUESTS,multipliers:MULT,
    savedResult:SAVED_RESULT,result:RESULT
  };
  SETTINGS=Object.assign({boss:"카링",difficulty:"하드",partySize:"any",partyCount:0,targetRate:130,mode:"strong"},snapshot.settings||{});
  normalizeDifficulty();
  SETTINGS.targetRate=Math.max(1,Number(SETTINGS.targetRate)||130);
  SETTINGS.mode=normalizeMode(SETTINGS.mode);
  SELECTED=Array.isArray(snapshot.selected)?snapshot.selected.slice():[];
  var snapshotGuests=Array.isArray(snapshot.guests)?snapshot.guests:[];
  var snapshotGuestIds=new Set(snapshotGuests.map(function(g){return g.id}));
  GUESTS=old.guests.filter(function(g){return !snapshotGuestIds.has(g.id)}).concat(snapshotGuests.map(function(g){
    return {id:g.id,name:g.name,owner:g.owner||""};
  }));
  MULT=JSON.parse(JSON.stringify(old.multipliers||{}));
  var bossMap=bossMultiplierMap(SETTINGS.boss,true);
  (SELECTED||[]).forEach(function(key){
    if(!Object.prototype.hasOwnProperty.call(snapshot.multipliers||{},key))return;
    var rate=Math.max(0,Number(snapshot.multipliers[key])||0);
    if(rate>0)bossMap[key]=rate;
    else delete bossMap[key];
  });
  SAVED_RESULT=JSON.parse(JSON.stringify(snapshot.result));
  restoreSavedResult();
  var complete=RESULT.length===SAVED_RESULT.length&&RESULT.every(function(p,i){
    var actual=p.members.map(function(c){return c.key});
    var expected=SAVED_RESULT[i].memberKeys||[];
    return actual.length===expected.length&&actual.every(function(key,j){return key===expected[j]});
  });
  if(!complete||!validPartyOwners(RESULT)){
    SETTINGS=old.settings;SELECTED=old.selected;GUESTS=old.guests;
    MULT=old.multipliers;SAVED_RESULT=old.savedResult;RESULT=old.result;
    notify("저장 당시 캐릭터가 현재 목록에 없거나 주인이 겹쳐 불러오지 못했어요.");
    return;
  }
  MANUAL_PICK="";MANUAL_ADD="";MANUAL_DRAG="";MANUAL_UNDO=null;
  invalidateComparison();
  markDirty();
  persistLocalCache();
  render();
  notify((index+1)+"번 슬롯을 불러왔어요. 상단 저장을 누르면 현재 공용 편성에도 반영됩니다.");
}
function deleteResultSlot(index){
  if(SAVING||BUILDING||COMPARING)return;
  index=Number(index);
  if(!Number.isInteger(index)||index<0||index>2||!SAVED_SLOTS[index])return;
  if(!window.confirm((index+1)+"번 저장 슬롯을 삭제할까요? 현재 표시된 파티는 유지됩니다."))return;
  SAVED_SLOTS[index]=null;
  markDirty();
  persistLocalCache();
  render();
  savePrefs();
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
function guestKey(g){return "guest|"+String(g.id||"")}
function guestOwnerKey(g){
  return "guest-owner:"+(String(g.owner||"").trim().toLowerCase()||g.id);
}
function addGuest(name,owner,rate){
  name=String(name||"").trim().slice(0,30);
  owner=String(owner||"").trim().slice(0,30);
  if(!name){notify("용병 캐릭터 이름을 입력해 주세요.");return}
  if(GUESTS.length>=100){notify("용병은 최대 100명까지 등록할 수 있어요.");return}
  if(GUESTS.some(function(g){return g.name===name&&g.owner===owner})){
    notify("같은 이름과 소속의 용병이 이미 등록되어 있어요.");return;
  }
  var g={id:"ext-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8),name:name,owner:owner};
  GUESTS.push(g);
  var key=guestKey(g);
  var value=Math.max(0,Number(rate)||0);
  if(value>0)setBossMultiplier(SETTINGS.boss,key,value);
  SELECTED.push(key);
  RESULT=[];
  invalidateComparison();
  markDirty();
  render();
  notify("용병을 추가했어요. 공용 반영은 저장을 눌러 주세요.");
}
function removeGuest(id){
  var index=GUESTS.findIndex(function(g){return g.id===id});
  if(index<0)return;
  var g=GUESTS[index];
  if(!window.confirm(g.name+" 용병을 삭제할까요?"))return;
  var key=guestKey(g);
  GUESTS.splice(index,1);
  SELECTED=SELECTED.filter(function(k){return k!==key});
  Object.keys(MULT).forEach(function(b){
    if(MULT[b]&&typeof MULT[b]==="object")delete MULT[b][key];
  });
  RESULT=[];
  invalidateComparison();
  markDirty();
  render();
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
  GUESTS.forEach(function(g){
    if(!g||!g.id||!String(g.name||"").trim())return;
    var key=guestKey(g);
    out.push({
      key:key,
      ownerId:guestOwnerKey(g),
      ownerName:g.owner?(g.owner+" (용병)"):(g.name+" (용병)"),
      theme:"guest",
      name:g.name,
      pi:-1,
      external:true,
      multiplier:getBossMultiplier(SETTINGS.boss,key)
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
function ownerAverages(chars){
  var sums={},counts={},out={};
  chars.forEach(function(c){
    var key=String(c.ownerId||c.ownerName||"");
    sums[key]=(sums[key]||0)+c.multiplier;
    counts[key]=(counts[key]||0)+1;
  });
  Object.keys(counts).forEach(function(key){out[key]=sums[key]/counts[key]});
  return out;
}
function averageGrade(rate){
  if(rate>=36)return {level:1,label:"소수팟 우선권 높음"};
  if(rate>=33)return {level:2,label:"소수팟 우선권 중상"};
  if(rate>=30)return {level:3,label:"기본 우선권"};
  return {level:4,label:"다인팟 우선"};
}
function ownerKey(c){return String(c.ownerId||c.ownerName||"")}
function partyHasOwner(p,owner,skip){
  return p.members.some(function(c,i){return i!==skip&&ownerKey(c)===owner});
}
function ownerMaxCount(chars){
  var counts={};
  chars.forEach(function(c){var k=ownerKey(c);counts[k]=(counts[k]||0)+1});
  return Math.max.apply(null,[0].concat(Object.keys(counts).map(function(k){return counts[k]})));
}
function validPartyOwners(parties){
  return parties.every(function(p){
    return new Set(p.members.map(ownerKey)).size===p.members.length;
  });
}
function partyTotal(p){
  return p.members.reduce(function(sum,c){return sum+c.multiplier},0);
}
function normalizeParties(parties){
  parties.forEach(function(p,i){
    p.id=i+1;
    p.total=partyTotal(p);
    p.max=6;
  });
  return parties;
}

/* Party-only manual edits. The original boss/checklist records are untouched. */
function findResultMember(key){
  for(var pi=0;pi<RESULT.length;pi++){
    var mi=RESULT[pi].members.findIndex(function(c){return c.key===String(key||"")});
    if(mi>=0)return {partyIndex:pi,memberIndex:mi,member:RESULT[pi].members[mi]};
  }
  return null;
}
function modifyPartyResult(sourceKey,targetPartyId,swapKey){
  if(BUILDING||COMPARING||SAVING){notify("계산 또는 저장이 끝난 다음 수정해 주세요.");return false}
  var srcInfo=findResultMember(sourceKey);
  var dstIndex=RESULT.findIndex(function(p){return String(p.id)===String(targetPartyId)});
  if(!srcInfo||dstIndex<0){notify("캐릭터나 대상 파티를 찾지 못했어요.");return false}
  if(srcInfo.partyIndex===dstIndex){notify("같은 파티로는 이동할 수 없어요.");return false}
  var swapping=!!swapKey;
  var dstInfo=swapping?findResultMember(swapKey):null;
  if(swapping&&(!dstInfo||dstInfo.partyIndex!==dstIndex)){notify("교환할 캐릭터를 찾지 못했어요.");return false}
  var cap=SETTINGS.partySize==="any"?6:Math.max(2,Math.min(6,Number(SETTINGS.partySize)||3));
  var from=RESULT[srcInfo.partyIndex],to=RESULT[dstIndex];
  if(!swapping&&from.members.length<=2){notify("파티는 최소 2명이어야 해요. 다른 캐릭터와 교환해 주세요.");return false}
  if(!swapping&&to.members.length>=cap){notify("대상 파티가 인원 제한("+cap+"명)에 도달했어요. 교환을 이용해 주세요.");return false}
  var candidate=RESULT.map(function(p){return {id:p.id,max:p.max,members:p.members.slice(),total:p.total}});
  var src=candidate[srcInfo.partyIndex],dst=candidate[dstIndex];
  if(swapping){
    src.members[srcInfo.memberIndex]=dstInfo.member;
    dst.members[dstInfo.memberIndex]=srcInfo.member;
  }else{
    src.members.splice(srcInfo.memberIndex,1);
    dst.members.push(srcInfo.member);
  }
  if(!validPartyOwners(candidate)){notify("한 파티에 같은 주인의 캐릭터가 겹칠 수 없어요. 다른 교환 대상을 골라 주세요.");return false}
  if(candidate.some(function(p){return p.members.length<2||p.members.length>cap})){notify("파티별 2명 이상, 최대 "+cap+"명 조건을 지켜야 해요.");return false}
  var oldKeys=[],newKeys=[];
  RESULT.forEach(function(p){p.members.forEach(function(c){oldKeys.push(c.key)})});
  candidate.forEach(function(p){p.members.forEach(function(c){newKeys.push(c.key)})});
  oldKeys.sort();newKeys.sort();
  if(oldKeys.length!==newKeys.length||oldKeys.some(function(k,i){return k!==newKeys[i]})){
    notify("캐릭터 누락·중복 방지를 위해 수정이 중단됐어요.");return false;
  }
  MANUAL_UNDO=RESULT.map(function(p){return {id:p.id,max:p.max,members:p.members.slice(),total:p.total}});
  RESULT=candidate;
  RESULT.forEach(function(p){p.total=partyTotal(p);p.max=cap});
  MANUAL_PICK="";MANUAL_ADD="";MANUAL_DRAG="";
  invalidateComparison();markDirty();render();
  notify(srcInfo.member.name+(swapping?" ↔ "+dstInfo.member.name+" 교환":" → "+to.id+"파티 이동")+" 완료 · 저장을 누르면 공용 반영됩니다.");
  return true;
}
function undoPartyResult(){
  if(!MANUAL_UNDO||SAVING||BUILDING||COMPARING)return;
  RESULT=MANUAL_UNDO;MANUAL_UNDO=null;MANUAL_PICK="";MANUAL_ADD="";MANUAL_DRAG="";
  invalidateComparison();markDirty();render();
  notify("직전 이동·교환을 취소했어요. 저장하면 공용 반영됩니다.");
}
function selectManualMember(key){
  if(SAVING||BUILDING||COMPARING||!findResultMember(key))return;
  MANUAL_ADD="";MANUAL_PICK=MANUAL_PICK===key?"":key;render();
}

function unassignedChars(){
  var assigned=new Set();
  RESULT.forEach(function(p){p.members.forEach(function(c){assigned.add(c.key)})});
  return selectedChars().filter(function(c){return !assigned.has(c.key)});
}
function removePartyMember(key){
  if(BUILDING||COMPARING||SAVING){notify("계산·저장이 끝난 다음 수정해 주세요.");return false}
  var source=findResultMember(key);
  if(!source){notify("현재 파티에 없는 캐릭터예요.");return false}
  var original=RESULT[source.partyIndex],disband=original.members.length<=2;
  if(disband&&!window.confirm("이 파티는 2인 파티입니다. "+source.member.name+"을 빼면 파티가 해체되고 남은 캐릭터도 미배정으로 돌아갑니다. 계속할까요?"))return false;
  var next=RESULT.map(function(p){return {id:p.id,max:p.max,members:p.members.slice(),total:p.total}});
  if(disband){
    next.splice(source.partyIndex,1);
    next.forEach(function(p,i){p.id=i+1});
  }else next[source.partyIndex].members.splice(source.memberIndex,1);
  MANUAL_UNDO=RESULT.map(function(p){return {id:p.id,max:p.max,members:p.members.slice(),total:p.total}});
  RESULT=next;
  RESULT.forEach(function(p){p.total=partyTotal(p)});
  MANUAL_PICK="";MANUAL_ADD="";MANUAL_DRAG="";
  invalidateComparison();markDirty();render();
  notify(source.member.name+" 미배정 처리"+(disband?" · 2인 파티 해체":"")+" · 공용 반영은 저장을 눌러 주세요.");
  return true;
}
function selectUnassigned(key){
  if(BUILDING||COMPARING||SAVING)return;
  if(!unassignedChars().some(function(c){return c.key===key}))return;
  if(!RESULT.length){notify("배정할 파티가 없어요. 자동 편성으로 파티를 만들어 주세요.");return}
  MANUAL_PICK="";
  MANUAL_ADD=MANUAL_ADD===key?"":key;
  render();
}
function addUnassignedToParty(key,partyId){
  if(BUILDING||COMPARING||SAVING){notify("계산·저장이 끝난 다음 수정해 주세요.");return false}
  var member=unassignedChars().find(function(c){return c.key===key});
  var target=RESULT.findIndex(function(p){return String(p.id)===String(partyId)});
  if(!member||target<0){notify("미배정 캐릭터 또는 대상 파티가 없어요.");return false}
  var cap=SETTINGS.partySize==="any"?6:Math.max(2,Math.min(6,Number(SETTINGS.partySize)||3));
  if(RESULT[target].members.length>=cap){notify("파티 인원 제한("+cap+"명)에 도달했어요.");return false}
  if(partyHasOwner(RESULT[target],ownerKey(member),-1)){notify("같은 주인의 캐릭터는 한 파티에 한 명만 가능합니다.");return false}
  MANUAL_UNDO=RESULT.map(function(p){return {id:p.id,max:p.max,members:p.members.slice(),total:p.total}});
  RESULT[target].members.push(member);
  RESULT[target].total=partyTotal(RESULT[target]);
  MANUAL_ADD="";MANUAL_PICK="";MANUAL_DRAG="";
  invalidateComparison();markDirty();render();
  notify(member.name+" → "+partyId+"파티 배정 완료 · 공용 반영은 저장을 눌러 주세요.");
  return true;
}
function candidateScore(parties,target,ownerAvgs,mode){
  mode=normalizeMode(mode);
  var below=0,shortfall=0,above=0,min=Infinity,max=-Infinity;
  var reward={},runs={};
  var strongSizePenalty=0,duplicateOwners=0,stableShort=0;
  var totalSizeDeviation=0;
  parties.forEach(function(p){
    var total=p.total,sz=p.members.length;
    if(total<target-0.000001){below++;shortfall+=Math.pow(target-total,2)}
    if(total>target*1.1)above+=Math.pow(total-target*1.1,2);
    if(total<target*1.12)stableShort+=Math.pow(target*1.12-total,2);
    min=Math.min(min,total);max=Math.max(max,total);
    totalSizeDeviation+=Math.pow(sz-2,2);
    var seen={};
    p.members.forEach(function(c){
      var key=ownerKey(c);
      if(seen[key])duplicateOwners++;
      seen[key]=true;
      var own=ownerAvgs[key]||0;
      var gradeBonus=own>=36?4:(own>=33?2.5:(own>=30?1:0));
      strongSizePenalty+=(c.multiplier+own*.12+gradeBonus)*Math.pow(sz-2,1.1);
      reward[key]=(reward[key]||0)+1/sz;
      runs[key]=(runs[key]||0)+1;
    });
  });
  var keys=Object.keys(reward);
  var totalShares=keys.reduce(function(sum,k){return sum+reward[k]},0);
  var meanShare=totalShares/Math.max(1,keys.length);
  var equalTotal=keys.reduce(function(sum,k){return sum+Math.pow(reward[k]-meanShare,2)},0);
  var meanPerChar=keys.reduce(function(sum,k){return sum+reward[k]/runs[k]},0)/Math.max(1,keys.length);
  var equalPerChar=keys.reduce(function(sum,k){
    return sum+Math.pow(reward[k]/runs[k]-meanPerChar,2);
  },0);
  // Mandatory: no duplicate owner, minimum target, then mode-specific preferences.
  var mandatory=duplicateOwners*1e12+below*1e9+shortfall*1e6;
  var spread=Math.pow(max-min,2);
  if(mode==="balanced")return mandatory+spread*14+above*.4+strongSizePenalty*2+equalPerChar*1200;
  if(mode==="equal")return mandatory+equalTotal*85000+equalPerChar*12000+spread*.45+strongSizePenalty*4+above*.12;
  if(mode==="small")return mandatory+strongSizePenalty*32+spread*.3+above*.12+equalPerChar*4000;
  if(mode==="safe")return mandatory+stableShort*900+spread*2+strongSizePenalty*3+equalPerChar*2500;
  return mandatory+strongSizePenalty*55+spread*.45+above*.18+equalPerChar*18000;
}
function initialParties(chars,k,cap,target,ownerAvgs,seed){
  var groups={};
  chars.forEach(function(c){
    var key=ownerKey(c);
    if(!groups[key])groups[key]=[];
    groups[key].push(c);
  });
  if(Object.keys(groups).some(function(key){return groups[key].length>k}))return null;
  var parties=Array.from({length:k},function(_,i){return {id:i+1,max:cap,members:[],total:0}});
  var owners=Object.keys(groups).sort(function(a,b){
    return groups[b].length-groups[a].length||a.localeCompare(b,"ko");
  });
  owners.forEach(function(key,oi){
    var ordered=groups[key].slice().sort(function(a,b){
      return b.multiplier-a.multiplier||a.key.localeCompare(b.key,"ko");
    });
    if(seed%2&&oi%2)ordered.reverse();
    ordered.forEach(function(c,ci){
      var choices=parties.filter(function(p){
        return p.members.length<cap&&!partyHasOwner(p,key,-1);
      });
      // Spread owners across the emptiest parties first to preserve room
      // for a second distinct owner in every party.
      choices.sort(function(a,b){
        var ac=a.members.length,bc=b.members.length;
        if(ac!==bc)return ac-bc;
        if(Math.abs(a.total-b.total)>0.000001)return a.total-b.total;
        return ((a.id+seed+oi)%k)-((b.id+seed+oi)%k);
      });
      if(!choices.length)return;
      var p=choices[0];
      p.members.push(c);
      p.total+=c.multiplier;
    });
  });
  if(parties.some(function(p){return p.members.length<2||p.members.length>cap}))return null;
  if(!validPartyOwners(parties))return null;
  if(parties.reduce(function(n,p){return n+p.members.length},0)!==chars.length)return null;
  return parties;
}
function optimizeParties(parties,target,ownerAvgs,cap,deadline,mode){
  normalizeParties(parties);
  var bestScore=candidateScore(parties,target,ownerAvgs,mode);
  for(var round=0;round<12&&Date.now()<deadline;round++){
    var best=null,nextScore=bestScore;
    for(var i=0;i<parties.length;i++){
      var A=parties[i];
      for(var j=i+1;j<parties.length;j++){
        var B=parties[j];
        // Exchange one member; always preserves size.
        for(var ai=0;ai<A.members.length;ai++){
          for(var bj=0;bj<B.members.length;bj++){
            var ca=A.members[ai],cb=B.members[bj];
            if(ca.multiplier===cb.multiplier&&ownerKey(ca)===ownerKey(cb))continue;
            if(partyHasOwner(A,ownerKey(cb),ai)||partyHasOwner(B,ownerKey(ca),bj))continue;
            A.members[ai]=cb;B.members[bj]=ca;
            A.total+=cb.multiplier-ca.multiplier;
            B.total+=ca.multiplier-cb.multiplier;
            var score=candidateScore(parties,target,ownerAvgs,mode);
            if(score<nextScore-0.000001){nextScore=score;best={type:"swap",i:i,j:j,ai:ai,bj:bj}}
            A.members[ai]=ca;B.members[bj]=cb;
            A.total-=cb.multiplier-ca.multiplier;
            B.total-=ca.multiplier-cb.multiplier;
          }
        }
        // Moving a character makes 2/3-person groups possible.
        [[A,B,i,j],[B,A,j,i]].forEach(function(pair){
          var from=pair[0],to=pair[1],fi=pair[2],ti=pair[3];
          if(from.members.length<=2||to.members.length>=cap)return;
          for(var mi=0;mi<from.members.length;mi++){
            if(partyHasOwner(to,ownerKey(from.members[mi]),-1))continue;
            var member=from.members.splice(mi,1)[0];
            to.members.push(member);
            from.total-=member.multiplier;to.total+=member.multiplier;
            var score=candidateScore(parties,target,ownerAvgs,mode);
            if(score<nextScore-0.000001){nextScore=score;best={type:"move",i:fi,j:ti,ai:mi}}
            from.members.splice(mi,0,member);to.members.pop();
            from.total+=member.multiplier;to.total-=member.multiplier;
          }
        });
      }
    }
    if(!best)break;
    var from=parties[best.i],to=parties[best.j];
    if(best.type==="swap"){
      var tmp=from.members[best.ai];from.members[best.ai]=to.members[best.bj];to.members[best.bj]=tmp;
    }else{
      to.members.push(from.members.splice(best.ai,1)[0]);
    }
    normalizeParties(parties);
    bestScore=nextScore;
  }
  return validPartyOwners(parties)?normalizeParties(parties):null;
}
function partyCountOptions(n,cap,requested,total,target,ownerMin,mode){
  var min=Math.max(1,Math.ceil(n/cap),ownerMin),max=Math.floor(n/2);
  if(requested)return requested>=min&&requested<=max?[requested]:[];
  var feasible=[];
  for(var k=min;k<=max;k++)if(total+0.000001>=target*k)feasible.push(k);
  if(!feasible.length)return [min]; // Show an explicitly insufficient result.
  if(mode==="small")return feasible.slice().reverse();
  if(mode==="safe"){
    var safeFeasible=feasible.filter(function(k){return total>=target*1.12*k});
    if(safeFeasible.length)feasible=safeFeasible;
  }
  var priority=feasible.filter(function(k){return k===6||k===7});
  if(priority.length)return priority;
  // Outside the preferred range, choose the nearest feasible count.
  var nearest=feasible.reduce(function(best,k){
    var distance=Math.min(Math.abs(k-6),Math.abs(k-7));
    var old=Math.min(Math.abs(best-6),Math.abs(best-7));
    return distance<old? k:best;
  },feasible[0]);
  return [nearest];
}
function balance(chars,partySize,targetRate,partyCount,mode){
  mode=normalizeMode(mode);
  if(chars.length<2)return[];
  var target=Math.max(1,Number(targetRate)||130);
  var cap=partySize==="any"?6:Math.max(2,Math.min(6,Number(partySize)||3));
  var requested=Math.max(0,Math.floor(Number(partyCount)||0));
  var total=chars.reduce(function(s,c){return s+c.multiplier},0);
  var ownerMin=ownerMaxCount(chars);
  var options=partyCountOptions(chars.length,cap,requested,total,target,ownerMin,mode);
  if(!options.length)return[];
  var avgs=ownerAverages(chars);
  var best=null,bestScore=Infinity;
  var deadline=Date.now()+1100;
  // When auto, favor 6-7 parties as long as the target remains feasible.
  options.forEach(function(k){
    if(mode==="small"&&best&&best.every(function(p){return p.total+0.000001>=target}))return;
    if(Date.now()>deadline&&best)return;
    for(var seed=0;seed<3;seed++){
      if(Date.now()>deadline&&best)break;
      var initial=initialParties(chars,k,cap,target,avgs,seed);
      if(!initial)continue;
      var candidate=optimizeParties(initial,target,avgs,cap,deadline,mode);
      if(!candidate||!validPartyOwners(candidate))continue;
      var score=candidateScore(candidate,target,avgs,mode);
      if(!requested){
        var distance=Math.min(Math.abs(k-6),Math.abs(k-7));
        score+=distance*150;
        if(total>=target*k)score+=(k===6||k===7?0:90);
      }
      if(score<bestScore-0.000001){bestScore=score;best=candidate}
    }
  });
  if(!best||!validPartyOwners(best))return [];
  return best;
}
function comparisonStats(parties,chars,target){
  var price=crystalPrice(),ownerTotals={},ownerNames={};
  chars.forEach(function(c){ownerNames[ownerKey(c)]=c.ownerName});
  parties.forEach(function(p){
    var share=price/p.members.length;
    p.members.forEach(function(c){
      var key=ownerKey(c);
      ownerTotals[key]=(ownerTotals[key]||0)+share;
    });
  });
  var keys=Object.keys(ownerTotals).sort(function(a,b){
    return ownerTotals[b]-ownerTotals[a]||a.localeCompare(b,"ko");
  });
  var clear=parties.filter(function(p){return p.total+0.000001>=target}).length;
  return {
    clear:clear,
    count:parties.length,
    topOwner:keys.length?ownerNames[keys[0]]:"-",
    topMeso:keys.length?ownerTotals[keys[0]]:0,
    spread:parties.length?Math.max.apply(null,parties.map(function(p){return p.total}))-
      Math.min.apply(null,parties.map(function(p){return p.total})):0
  };
}
function invalidateComparison(){
  COMPARE_RESULTS=[];
  COMPARE_PROGRESS="";
}
function compareAllModes(){
  if(BUILDING||COMPARING)return;
  var chars=selectedChars();
  if(chars.length<2){notify("비교할 캐릭터를 2명 이상 선택해 주세요.");return}
  var requestedCount=Math.max(0,Math.floor(Number(SETTINGS.partyCount)||0));
  var cap=SETTINGS.partySize==="any"?6:Math.max(2,Math.min(6,Number(SETTINGS.partySize)||3));
  var ownerMin=ownerMaxCount(chars);
  if((requestedCount&&requestedCount<ownerMin)||
     ownerMin>Math.floor(chars.length/2)||
     (requestedCount&&(chars.length<requestedCount*2||chars.length>requestedCount*cap))){
    notify("파티 수·인원 또는 주인당 1캐릭터 조건을 확인해 주세요.");
    return;
  }
  COMPARING=true;
  COMPARE_RESULTS=[];
  var modes=MODES.slice(),index=0;
  function next(){
    if(index>=modes.length){
      COMPARING=false;
      COMPARE_PROGRESS="";
      render();
      if(!COMPARE_RESULTS.some(function(row){return row.parties.length})){
        notify("현재 설정으로 편성 가능한 결과가 없어요.");
      }
      return;
    }
    var mode=modes[index++];
    COMPARE_PROGRESS=index+" / "+modes.length+" · "+mode.name+" 계산 중";
    render();
    setTimeout(function(){
      try{
        var parties=balance(chars,SETTINGS.partySize,SETTINGS.targetRate,SETTINGS.partyCount,mode.id);
        COMPARE_RESULTS.push({
          mode:mode.id,
          parties:parties,
          stats:comparisonStats(parties,chars,SETTINGS.targetRate)
        });
      }catch(e){
        COMPARE_RESULTS.push({mode:mode.id,parties:[],stats:comparisonStats([],chars,SETTINGS.targetRate)});
      }
      setTimeout(next,25);
    },30);
  }
  next();
}
function applyComparedMode(mode){
  if(COMPARING||BUILDING)return;
  MANUAL_PICK="";MANUAL_ADD="";MANUAL_UNDO=null;
  var found=COMPARE_RESULTS.find(function(row){return row.mode===mode});
  if(!found||!found.parties.length)return;
  if(!validPartyOwners(found.parties)){
    notify("주인 중복이 발견되어 적용할 수 없어요.");
    return;
  }
  SETTINGS.mode=normalizeMode(mode);
  RESULT=found.parties;
  markDirty();
  render();
  notify(modeName(mode)+" 편성을 적용했어요. 공용 반영은 저장 버튼을 눌러 주세요.");
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
function performBuild(){
  MANUAL_PICK="";MANUAL_ADD="";MANUAL_UNDO=null;
  invalidateComparison();
  var chars=selectedChars();
  if(chars.length<2){
    RESULT=[];
    markDirty();
    render();
    notify("파티를 짤 캐릭터를 2명 이상 선택해 주세요.");
    return;
  }
  var requestedCount=Math.max(0,Math.floor(Number(SETTINGS.partyCount)||0));
  var requestedSize=SETTINGS.partySize==="any"?"any":Math.max(2,Math.min(6,Number(SETTINGS.partySize)||3));
  if(requestedCount>0){
    if(chars.length<requestedCount*2){
      RESULT=[];
      markDirty();
      render();
      notify(requestedCount+"파티를 만들려면 최소 "+(requestedCount*2)+"캐릭터가 필요해요.");
      return;
    }
    if(requestedSize!=="any"&&chars.length>requestedCount*requestedSize){
      RESULT=[];
      markDirty();
      render();
      notify(requestedCount+"파티 · "+requestedSize+"인으로는 최대 "+(requestedCount*requestedSize)+"캐릭터까지만 넣을 수 있어요.");
      return;
    }
  }
  var ownerMin=ownerMaxCount(chars);
  var maxCount=requestedCount||Math.floor(chars.length/2);
  if(ownerMin>maxCount){
    RESULT=[];markDirty();render();
    notify("한 주인 캐릭터가 "+ownerMin+"명이라 최소 "+ownerMin+"파티가 필요해요. 현재 조건으로는 주인 중복 없이 편성할 수 없어요.");
    return;
  }
  RESULT=balance(chars,SETTINGS.partySize,SETTINGS.targetRate,SETTINGS.partyCount,SETTINGS.mode);
  if(RESULT.length&&!validPartyOwners(RESULT)){
    RESULT=[];markDirty();render();
    notify("주인 중복 검증에 실패해 편성을 중단했어요.");
    return;
  }
  if(!RESULT.length){
    markDirty();
    render();
    notify("주인당 파티 1캐릭터 규칙과 인원·파티 수 조건을 모두 만족하는 편성이 불가능해요.");
    return;
  }
  markDirty();
  render();
}
// Paint the loading state before the bounded optimizer starts.
function build(){
  if(BUILDING)return;
  BUILDING=true;
  render();
  setTimeout(function(){
    try{performBuild()}
    catch(e){notify("자동 편성 오류: "+(e.message||"다시 시도해 주세요."))}
    finally{BUILDING=false;render()}
  },40);
}
function notify(msg){
  var toast=document.getElementById("toast");
  if(!toast)return;
  toast.textContent=msg;
  toast.classList.add("show");
  setTimeout(function(){toast.classList.remove("show")},1900);
}
function toggleOwner(ownerId){
  invalidateComparison();
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
function organizePartyPanels(panel,selectedCount){
  var shell=panel.querySelector(".party-boss-shell");
  var editing=EDIT_MODE||!RESULT.length;
  shell.classList.toggle("is-editing",editing);
  // Keep the existing form nodes and handlers together in two task-oriented panels.
  var controls=panel.querySelector(".party-boss-controls");
  var strategy=panel.querySelector(".party-boss-mode-panel");
  var settings=document.createElement("section");
  settings.className="party-boss-settings";
  controls.before(settings);
  settings.appendChild(controls);
  settings.appendChild(strategy);
  var roster=panel.querySelector(".party-boss-owner-groups");
  var guests=panel.querySelector(".party-boss-external");
  roster.appendChild(guests);
  var groups=[
    [settings,"settings","편성 설정",SETTINGS.boss+" · "+SETTINGS.difficulty+" · 목표 "+formatRate(SETTINGS.targetRate),!RESULT.length],
    [roster,"roster","참여 인원",selectedCount+"명 선택 · 용병 "+GUESTS.length+"명 등록",true],
    [panel.querySelector(".party-boss-unassigned"),"unassigned","대기 인원",unassignedChars().length+"명",!!MANUAL_ADD],
    [panel.querySelector(".party-boss-slots"),"slots","저장한 편성",SAVED_SLOTS.filter(Boolean).length+" / 3",false]
  ];
  groups.forEach(function(group){
    var content=group[0];
    if(!content)return;
    var fold=document.createElement("details");
    fold.className="party-boss-fold";
    fold.dataset.pbFold=group[1];
    var alwaysVisible=group[1]==="roster";
    fold.open=alwaysVisible?true:(Object.prototype.hasOwnProperty.call(PANEL_OPEN,group[1])?PANEL_OPEN[group[1]]:group[4]);
    if(group[1]!=="slots"&&!alwaysVisible)fold.hidden=!editing;
    if(alwaysVisible){fold.classList.add("always-visible");PANEL_OPEN.roster=true}
    var summary=document.createElement("summary");
    summary.innerHTML="<strong>"+group[2]+"</strong><span>"+esc(group[3])+"</span>";
    content.before(fold);
    fold.appendChild(summary);
    fold.appendChild(content);
    if(alwaysVisible){
      summary.addEventListener("click",function(e){e.preventDefault()});
      summary.setAttribute("aria-label","참여 인원, 항상 표시");
    }
    fold.addEventListener("toggle",function(){
      if(alwaysVisible){if(!fold.open)fold.open=true;PANEL_OPEN.roster=true}
      else PANEL_OPEN[group[1]]=fold.open;
    });
  });
  var result=panel.querySelector(".party-boss-result");
  var waiting=panel.querySelector('[data-pb-fold="unassigned"]');
  if(result&&waiting)result.before(waiting);
  var slots=panel.querySelector('[data-pb-fold="slots"]');
  if(slots)shell.appendChild(slots);
  var meso=panel.querySelector(".party-boss-meso-summary");
  if(meso){
    var fold=document.createElement("details");
    fold.className="party-boss-fold";
    fold.dataset.pbFold="meso";
    fold.open=!!PANEL_OPEN.meso;
    var summary=document.createElement("summary");
    summary.innerHTML="<strong>예상 수익</strong><span>주인별 결정석 수익</span>";
    meso.before(fold);fold.appendChild(summary);fold.appendChild(meso);
    fold.addEventListener("toggle",function(){PANEL_OPEN.meso=fold.open});
  }
}
function renderNow(){
  var panel=document.getElementById("partyBossPanel");
  if(!panel)return;
  var chars=allChars();
  if(!RESULT.length){MANUAL_PICK="";MANUAL_ADD=""}
  if(MANUAL_PICK&&!findResultMember(MANUAL_PICK))MANUAL_PICK="";
  if(MANUAL_ADD&&!unassignedChars().some(function(c){return c.key===MANUAL_ADD}))MANUAL_ADD="";
  if(RESULT.length&&!validPartyOwners(RESULT)){
    RESULT=[];
    markDirty();
    notify("이전 파티에 같은 주인의 캐릭터가 중복되어 결과를 숨겼어요. 자동 편성을 다시 눌러 주세요.");
  }
  if(!chars.length){
    panel.innerHTML='<div class="party-boss-empty"><strong>캐릭터 정보를 불러오는 중…</strong><span>잠시만 기다려 주세요.</span></div>';
    return;
  }
  var editing=EDIT_MODE||!RESULT.length;
  if(!editing){MANUAL_PICK="";MANUAL_ADD="";MANUAL_DRAG=""}
  var selectedSet=new Set(SELECTED);
  var selected=chars.filter(function(c){return selectedSet.has(c.key)});
  var html='';

  html+='<section class="party-boss-shell">';
  html+='<header class="party-boss-head">';
  html+='<div><span>PARTY BALANCER</span><strong>파티보스</strong><p>파티 구성과 배율을 한눈에 확인하세요.</p></div>';
  html+='<div class="party-boss-head-actions">';
  html+='<span class="party-boss-shared-meta">'+esc(sharedMetaText())+'</span>';
  html+='<button class="party-boss-save '+(DIRTY&&!SAVING?"needs-save":"")+'" type="button" data-pb-save="1" '+(SAVING?"disabled":"")+'>'+(SAVING?"저장 중…":(DIRTY?"저장":"공용 저장됨"))+'</button>';
  html+='<button class="party-boss-edit-toggle" type="button" data-pb-edit="1" aria-pressed="'+(editing?'true':'false')+'" '+(!RESULT.length?'disabled':'')+'>'+(editing?'편집 완료':'파티 편집')+'</button>';
  if(editing)html+='<button class="party-boss-reset" type="button" data-pb-reset="1">선택 초기화</button>';
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
  html+='<label class="party-boss-number"><span>파티 인원</span><div><input type="number" min="0" max="6" step="1" inputmode="numeric" data-pb-size="1" value="'+(String(SETTINGS.partySize)==="any"?"0":String(SETTINGS.partySize||0))+'" placeholder="0"><em>0 = 상관없음</em></div></label>';
  html+='<label class="party-boss-number"><span>파티 수</span><div><input type="number" min="0" max="50" step="1" inputmode="numeric" data-pb-count="1" value="'+String(Math.max(0,Number(SETTINGS.partyCount)||0))+'" placeholder="0"><em>0 = 자동</em></div></label>';
  html+='<label class="party-boss-target"><span>목표 배율</span><div><input type="number" min="1" step="0.1" inputmode="decimal" data-pb-target="1" value="'+String(SETTINGS.targetRate)+'" placeholder="130" aria-label="최소 목표 배율 직접 입력"><em>권장 '+formatRate(SETTINGS.targetRate)+'~'+formatRate(SETTINGS.targetRate*1.1)+'</em></div></label>';
  html+='<div class="party-boss-summary"><span>선택 캐릭터</span><b>'+selected.length+'명</b></div>';
  html+='<button class="party-boss-build" type="button" data-pb-build="1" '+(BUILDING?"disabled":"")+'>'+(BUILDING?"편성 계산 중…":"자동 편성")+'</button>';
  html+='</section>';

  html+='<section class="party-boss-mode-panel" aria-label="자동 편성 모드">';
  html+='<div class="party-boss-mode-heading"><div><span>편성 전략</span><strong>원하는 파티 편성 방식 선택</strong></div><small>모든 모드 · 주인당 1캐릭터 / 목표 '+formatRate(SETTINGS.targetRate)+'</small></div>';
  html+='<div class="party-boss-mode-grid">';
  MODES.forEach(function(mode){
    var active=normalizeMode(SETTINGS.mode)===mode.id;
    html+='<button type="button" class="party-boss-mode-option '+(active?"active":"")+'" data-pb-mode="'+mode.id+'" aria-pressed="'+(active?"true":"false")+'" '+(COMPARING||BUILDING?"disabled":"")+'><b>'+mode.name+'</b><small>'+mode.desc+'</small></button>';
  });
  html+='</div>';
  html+='<div class="party-boss-compare-actions"><span>선택한 모드로 자동 편성하거나 5가지 결과를 한 번에 비교할 수 있어요.</span><button type="button" data-pb-compare="1" '+(COMPARING||BUILDING?"disabled":"")+'>'+(COMPARING?"비교 계산 중…":"5가지 모드 비교하기")+'</button></div>';
  if(COMPARING)html+='<div class="party-boss-compare-progress" role="status">'+esc(COMPARE_PROGRESS)+'</div>';
  if(COMPARE_RESULTS.length&&!COMPARING){
    html+='<div class="party-boss-compare-results"><div class="party-boss-compare-title"><strong>5가지 편성 결과 비교</strong><span>메소는 현재 결정석 가격 기준 · 적용 후 저장해야 공용 반영</span></div><div class="party-boss-compare-table-wrap"><table class="party-boss-compare-table"><thead><tr><th>모드</th><th>파티</th><th>목표 충족</th><th>최고 수익 주인</th><th>파티 배율 차이</th><th>선택</th></tr></thead><tbody>';
    COMPARE_RESULTS.forEach(function(row){
      var stat=row.stats,ok=row.parties.length>0,allClear=ok&&stat.clear===stat.count;
      html+='<tr><th>'+esc(modeName(row.mode))+'</th><td>'+(ok?stat.count+'개':'편성 불가')+'</td><td class="'+(allClear?"pb-clear":"pb-fail")+'">'+(ok?stat.clear+'/'+stat.count:'-')+'</td><td>'+esc(ok?stat.topOwner:"-")+(ok?'<small>'+formatMeso(stat.topMeso)+'</small>':'')+'</td><td>'+(ok?formatRate(stat.spread):'-')+'</td><td><button type="button" data-pb-apply-mode="'+row.mode+'" '+(!ok?"disabled":"")+'>이 편성 적용</button></td></tr>';
    });
    html+='</tbody></table></div></div>';
  }
  html+='</section>';


  // Render mercenaries as one more vertical owner roster column.
  var chosenGuests=GUESTS.filter(function(g){return selectedSet.has(guestKey(g))});
  html+='<section class="party-boss-external party-boss-owner owner-themed" data-theme="guest" aria-label="용병 관리">';
  html+='<header class="party-boss-external-heading"><div class="party-boss-owner-title"><strong>용병</strong><span>선택 '+chosenGuests.length+'명 · 등록 '+GUESTS.length+'명</span></div></header>';
  if(GUESTS.length){
    html+='<div class="party-boss-external-grid party-boss-char-grid">';
    GUESTS.forEach(function(g){
      var key=guestKey(g);
      var chosen=selectedSet.has(key);
      var rate=getBossMultiplier(SETTINGS.boss,key);
      html+='<article class="party-boss-external-person party-boss-char owner-themed '+(chosen?"active":"")+'" data-theme="guest">';
      html+='<button type="button" class="party-boss-external-select party-boss-char-toggle" data-pb-char="'+esc(key)+'" aria-pressed="'+(chosen?"true":"false")+'"><span class="party-boss-char-name"><b>'+esc(g.name)+'</b>'+(g.owner?'<small>'+esc(g.owner)+'</small>':'')+'</span></button>';
      html+='<label><span>배율</span><input type="number" min="0" step="0.01" inputmode="decimal" data-pb-mult="'+esc(key)+'" value="'+String(rate)+'" aria-label="'+esc(g.name)+' 배율"></label>';
      html+='<button type="button" class="party-boss-external-remove" data-pb-guest-remove="'+esc(g.id)+'" aria-label="'+esc(g.name)+' 용병 삭제" title="용병 삭제">삭제</button>';
      html+='</article>';
    });
    html+='</div>';
  }else{
    html+='<p class="party-boss-external-empty">등록된 용병이 없습니다.</p>';
  }
  html+='<form class="party-boss-external-form" data-pb-guest-form="1">';
  html+='<label><span>용병 닉네임</span><input data-pb-guest-name="1" type="text" maxlength="30" placeholder="캐릭터 이름" required autocomplete="off"></label>';
  html+='<label><span>주인 / 소속</span><input data-pb-guest-owner="1" type="text" maxlength="30" placeholder="선택 입력" autocomplete="off"></label>';
  html+='<label><span>'+esc(SETTINGS.boss)+' 배율</span><input data-pb-guest-rate="1" type="number" min="0" step="0.01" inputmode="decimal" value="0" aria-label="용병 배율"></label>';
  html+='<button type="submit">+ 용병 추가</button>';
  html+='</form>';
  html+='<p class="party-boss-external-note">용병은 파티보스에서만 사용합니다. 같은 주인은 한 파티에 1명만 배정합니다. 변경 후 저장을 눌러 주세요.</p>';
  html+='</section>';

  html+='<section class="party-boss-owner-groups">';
  (DATA.owners||[]).forEach(function(o){
    var own=chars.filter(function(c){return c.ownerId===o.id});
    if(!own.length)return;
    var allSelected=own.every(function(c){return selectedSet.has(c.key)});
    var ownSelected=own.filter(function(c){return selectedSet.has(c.key)});
    var ownAverage=ownSelected.length
      ?ownSelected.reduce(function(sum,c){return sum+(Number(c.multiplier)||0)},0)/ownSelected.length
      :0;
    html+='<section class="party-boss-owner owner-themed" data-theme="'+ownerTheme(o.name)+'">';
    html+='<header><div class="party-boss-owner-title"><strong>'+esc(o.name)+'</strong><span>선택 '+ownSelected.length+'명 · 평균 '+(ownSelected.length?formatRate(ownAverage):'—')+'</span></div><button type="button" data-pb-owner="'+esc(o.id)+'">'+(allSelected?"전체 해제":"전체 선택")+'</button></header>';
    html+='<div class="party-boss-char-grid">';
    own.forEach(function(c){
      var active=selectedSet.has(c.key);
      html+='<article class="party-boss-char owner-themed '+(active?"active":"")+'" data-theme="'+c.theme+'">';
      html+='<button class="party-boss-char-toggle" type="button" data-pb-char="'+esc(c.key)+'" aria-pressed="'+(active?"true":"false")+'">';
      html+='<span class="party-boss-char-name"><b>'+esc(c.name)+'</b></span>';
      html+='</button>';
      html+='<label><span>'+esc(SETTINGS.boss)+' 배율</span><input type="number" min="0" step="0.01" inputmode="decimal" data-pb-mult="'+esc(c.key)+'" value="'+String(c.multiplier||0)+'" placeholder="0" aria-label="'+esc(c.name)+' 배율 직접 수정" title="배율 직접 수정 가능"></label>';
      html+='</article>';
    });
    html+='</div></section>';
  });
  html+='</section>';


  html+='<section class="party-boss-slots" aria-label="자동 편성 결과 저장 슬롯">';
  html+='<header class="party-boss-slots-heading"><div><span>SAVED PARTIES</span><strong>자동 편성 결과 저장</strong><p>서로 다른 파티 편성을 최대 3개까지 보관합니다. 저장과 삭제는 공용으로 바로 반영되며, 불러온 결과는 상단 저장을 눌러야 현재 편성에 반영됩니다.</p></div></header>';
  html+='<div class="party-boss-slot-grid">';
  for(var si=0;si<3;si++){
    var slot=SAVED_SLOTS[si];
    var exists=!!slot;
    html+='<article class="party-boss-slot '+(exists?"filled":"empty")+'">';
    html+='<div class="party-boss-slot-top"><span>슬롯 '+(si+1)+'</span><b>'+(exists?"저장됨":"비어 있음")+'</b></div>';
    if(exists){
      html+='<strong>'+esc(slot.settings.boss)+' · '+esc(slot.settings.difficulty)+'</strong>';
      html+='<p>'+slot.result.length+'개 파티 · '+modeName(slot.settings.mode)+' · 목표 '+formatRate(slot.settings.targetRate)+'</p>';
      html+='<small>'+esc(formatSlotTime(slot.savedAt))+'</small>';
    }else{
      html+='<strong>편성을 저장해 두세요</strong><p>현재 파티 구성을 따로 보관할 수 있어요.</p><small>저장된 기록 없음</small>';
    }
    html+='<div class="party-boss-slot-actions">';
    html+='<button type="button" class="party-boss-slot-save" data-pb-slot-save="'+si+'" '+(!RESULT.length||SAVING?"disabled":"")+'>'+(exists?"덮어쓰기":"저장")+'</button>';
    html+='<button type="button" data-pb-slot-load="'+si+'" '+(!exists||SAVING?"disabled":"")+'>불러오기</button>';
    html+='<button type="button" class="party-boss-slot-delete" data-pb-slot-delete="'+si+'" '+(!exists||SAVING?"disabled":"")+'>삭제</button>';
    html+='</div></article>';
  }
  html+='</div></section>';

  var unassigned=unassignedChars();
  if(editing&&unassigned.length&&(RESULT.length||MANUAL_UNDO)){
    html+='<section class="party-boss-unassigned" aria-label="대기 인원">';
    html+='<header><div><strong>대기 인원</strong><span>파티에서 빼도 캐릭터 정보는 유지됩니다. 아래 캐릭터를 선택하면 다른 파티에 다시 넣을 수 있어요.</span></div><b>'+unassigned.length+'명</b></header>';
    html+='<div class="party-boss-unassigned-list">';
    unassigned.forEach(function(c){
      var picking=MANUAL_ADD===c.key;
      html+='<div class="party-boss-unassigned-person owner-themed" data-theme="'+c.theme+'"><div><b>'+esc(c.name)+'</b><small>'+esc(c.ownerName)+'</small></div><strong>'+formatRate(c.multiplier)+'</strong><button type="button" data-pb-unassigned="'+esc(c.key)+'" aria-pressed="'+(picking?"true":"false")+'" '+(!RESULT.length?"disabled":"")+'>'+(picking?"취소":"파티에 넣기")+'</button></div>';
    });
    html+='</div>';
    if(MANUAL_ADD){
      var assignChar=unassigned.find(function(c){return c.key===MANUAL_ADD});
      if(assignChar)html+='<p class="party-boss-unassigned-tip"><b>'+esc(assignChar.name)+'</b>을(를) 배정할 파티의 <b>여기에 추가</b> 버튼을 선택하세요.</p>';
    }
    if(MANUAL_UNDO&&!RESULT.length)html+='<button type="button" class="party-boss-empty-undo" data-pb-undo="1">직전 편집 취소</button>';
    html+='</section>';
  }
  if(RESULT.length){
    var totals=RESULT.map(function(p){return p.total});
    var max=Math.max.apply(null,totals),min=Math.min.apply(null,totals);
    html+='<section class="party-boss-result">';
    var sizeLabel=String(SETTINGS.partySize)==="any"?"인원 상관없음":SETTINGS.partySize+"인 기준";
    var countLabel=Math.max(0,Number(SETTINGS.partyCount)||0)>0?" · "+Math.floor(Number(SETTINGS.partyCount))+"파티":"";
    var target=Number(SETTINGS.targetRate)||0;
    var targetLabel=" · "+modeName(SETTINGS.mode)+" · 목표 "+formatRate(target)+" ~ "+formatRate(target*1.1);
    html+='<header><div><span>자동 편성 결과</span><strong>'+esc(SETTINGS.boss)+' · '+esc(SETTINGS.difficulty)+' · '+sizeLabel+countLabel+targetLabel+'</strong></div>';
    html+='<div class="party-boss-gap"><span>파티간 차이</span><b>'+formatRate(max-min)+'</b></div></header>';
    var missingParties=RESULT.filter(function(p){return p.total+0.000001<target});
    if(missingParties.length){
      html+='<div class="party-boss-target-warning" role="status"><strong>목표 미달 '+missingParties.length+'파티</strong><span>'+missingParties.map(function(p){return p.id+'파티 '+formatRate(target-p.total)+' 부족'}).join(' · ')+' · 목표 미달 파티는 클리어 가능으로 표시하지 않습니다.</span></div>';
    }else{
      html+='<div class="party-boss-target-success" role="status">모든 파티가 최소 목표 '+formatRate(target)+'를 충족했습니다.</div>';
    }
    if(editing)html+='<div class="party-boss-manual-help" role="status"><span><b>직접 편집</b> <b>이동</b> · <b>빼기</b>로 조정할 수 있어요. PC에서는 드래그도 가능합니다.</span>'+(MANUAL_UNDO?'<button type="button" data-pb-undo="1">직전 편집 취소</button>':'')+'</div>';
    if(MANUAL_PICK){
      var selectedMember=findResultMember(MANUAL_PICK);
      if(selectedMember)html+='<div class="party-boss-manual-pick"><span><b>'+esc(selectedMember.member.name)+'</b> 선택됨 · 대상 파티나 교환할 캐릭터를 골라 주세요.</span><button type="button" data-pb-cancel-pick="1">취소</button></div>';
    }
    html+='<div class="party-boss-result-grid">';
    RESULT.forEach(function(p){
      html+='<article class="party-boss-party-card '+(p.total<target?"out-target":(p.total<=target*1.1?"in-target":"above-target"))+(MANUAL_PICK?" manual-target":"")+'" data-pb-drop-party="'+p.id+'">';
      var status=p.total<target?"미달 "+formatRate(target-p.total):(p.total>target*1.1?"권장 범위 초과":"목표 충족");
      var partyMesoEach=crystalPrice()/Math.max(1,p.members.length);
      html+='<header><div><span>'+p.id+'</span><b>'+p.id+'파티 · '+p.members.length+'명</b>'+(status?'<em>'+status+'</em>':'')+'</div><div class="party-boss-party-totals"><strong>'+formatRate(p.total)+'</strong><small>인당 '+formatMeso(partyMesoEach)+'</small></div></header>';
      if(MANUAL_PICK&&findResultMember(MANUAL_PICK).partyIndex!==RESULT.indexOf(p)){
        html+='<div class="party-boss-drop-actions"><button type="button" data-pb-move-target="'+p.id+'">여기로 이동</button></div>';
      }
      if(MANUAL_ADD){
        var addChar=unassigned.find(function(c){return c.key===MANUAL_ADD});
        if(addChar){
          var maxSize=SETTINGS.partySize==="any"?6:Math.max(2,Math.min(6,Number(SETTINGS.partySize)||3));
          var canAdd=p.members.length<maxSize&&!partyHasOwner(p,ownerKey(addChar),-1);
          html+='<div class="party-boss-drop-actions"><button type="button" data-pb-add-target="'+p.id+'" '+(!canAdd?'disabled title="같은 주인 또는 인원 제한"':'')+'>여기에 추가</button></div>';
        }
      }
      html+='<div class="party-boss-members">';
      p.members.forEach(function(c){
        var picked=MANUAL_PICK===c.key;
        var other=MANUAL_PICK&&findResultMember(MANUAL_PICK).partyIndex!==RESULT.indexOf(p);
        html+='<div class="party-boss-member owner-themed'+(picked?" manual-picked":"")+'" data-theme="'+c.theme+'" draggable="'+(editing?'true':'false')+'" data-pb-drag-member="'+esc(c.key)+'" data-pb-swap-drop="'+esc(c.key)+'" data-pb-member-party="'+p.id+'">';
        html+='<span class="party-boss-member-dot"></span>';
        html+='<div><b>'+esc(c.name)+'</b>'+(c.external?'<small>'+esc(c.ownerName)+'</small>':'')+'</div>';
        html+='<strong>'+formatRate(c.multiplier)+'</strong>';
        if(editing)html+='<button type="button" class="party-boss-member-action'+(picked?" selected":"")+(other?" swap":"")+'" data-pb-member-action="'+esc(c.key)+'" data-pb-member-party="'+p.id+'" aria-pressed="'+(picked?"true":"false")+'">'+(picked?"취소":(other?"교환":"이동"))+'</button>';
        if(editing)html+='<button type="button" class="party-boss-member-remove" data-pb-remove-member="'+esc(c.key)+'" title="'+esc(c.name)+' 파티에서 빼기 (캐릭터 정보 유지)" aria-label="'+esc(c.name)+' 파티에서 빼기">빼기</button>';
        html+='</div>';
      });
      html+='</div></article>';
    });
    html+='</div>';
    var mesoTotals=ownerMesoTotals();
    var mesoRows=(DATA.owners||[]).map(function(o){return mesoTotals[String(o.id)]}).filter(Boolean);
    var seenGuestOwners=new Set();
    GUESTS.forEach(function(g){
      var id=guestOwnerKey(g);
      if(seenGuestOwners.has(id))return;
      seenGuestOwners.add(id);
      if(mesoTotals[id])mesoRows.push(mesoTotals[id]);
    });
    if(MESO_SORT==="meso")mesoRows.sort(function(a,b){return b.total-a.total||a.ownerName.localeCompare(b.ownerName,"ko")});
    if(mesoRows.length){
      html+='<section class="party-boss-meso-summary">';
        html+='<header><div><span>OWNER MESO</span><strong>주인별 예상 메소 총합</strong></div><div class="party-boss-meso-tools"><small>'+esc(SETTINGS.boss)+' · '+esc(SETTINGS.difficulty)+' 결정석 기준</small><label>정렬 <select data-pb-meso-sort="1"><option value="original" '+(MESO_SORT==="original"?"selected":"")+'>기존 순서</option><option value="meso" '+(MESO_SORT==="meso"?"selected":"")+'>총 메소 높은 순</option></select></label></div></header>';
      html+='<div class="party-boss-meso-grid">';
      mesoRows.forEach(function(row){
        html+='<article class="party-boss-meso-card owner-themed" data-theme="'+esc(row.theme)+'"><div><b>'+esc(row.ownerName)+'</b><small>'+row.runs+'캐릭터 · 평균 '+formatRate(row.averageRate)+'</small><small>'+esc(row.grade.label)+'</small></div><div class="party-boss-meso-amount"><strong>'+formatMeso(row.total)+'</strong><small>캐릭터당 '+formatMeso(row.averageMeso)+'</small></div></article>';
      });
      html+='</div></section>';
    }
    html+='</section>';
  }else{
    html+='<div class="party-boss-empty"><strong>캐릭터를 선택하고 배율을 입력해 주세요.</strong><span>편성 전략을 선택한 다음 자동 편성 또는 5가지 모드 비교하기를 눌러 주세요.</span></div>';
  }

  html+='</section>';
  panel.querySelectorAll("[data-pb-fold]").forEach(function(fold){PANEL_OPEN[fold.dataset.pbFold]=fold.open});
  panel.innerHTML=html;
  organizePartyPanels(panel,selected.length);

  var editBtn=panel.querySelector("[data-pb-edit]");
  if(editBtn)editBtn.onclick=function(){
    EDIT_MODE=!editing;
    MANUAL_PICK="";MANUAL_ADD="";MANUAL_DRAG="";
    render();
  };
  var boss=panel.querySelector("[data-pb-boss]");
  if(boss)boss.onchange=function(){invalidateComparison();SETTINGS.boss=boss.value;SETTINGS.difficulty=defaultDifficulty(SETTINGS.boss);RESULT=[];markDirty();render()};
  var difficulty=panel.querySelector("[data-pb-difficulty]");
  if(difficulty)difficulty.onchange=function(){invalidateComparison();SETTINGS.difficulty=difficulty.value;markDirty();render()};
  var size=panel.querySelector("[data-pb-size]");
  if(size)size.onchange=function(){
    var n=Math.floor(Number(size.value)||0);
    invalidateComparison();
    SETTINGS.partySize=n<=0?"any":Math.max(2,Math.min(6,n));
    RESULT=[];markDirty();render();
  };
  var countInput=panel.querySelector("[data-pb-count]");
  if(countInput)countInput.onchange=function(){
    invalidateComparison();
    SETTINGS.partyCount=Math.max(0,Math.min(50,Math.floor(Number(countInput.value)||0)));
    RESULT=[];markDirty();render();
  };
  var targetInput=panel.querySelector("[data-pb-target]");
  if(targetInput)targetInput.onchange=function(){
    invalidateComparison();
    SETTINGS.targetRate=Math.max(1,Number(targetInput.value)||130);
    RESULT=[];
    markDirty();
    render();
  };
  var mesoSort=panel.querySelector("[data-pb-meso-sort]");
  if(mesoSort)mesoSort.onchange=function(){MESO_SORT=mesoSort.value==="meso"?"meso":"original";render()};
  Array.prototype.forEach.call(panel.querySelectorAll("[data-pb-mode]"),function(btn){
    btn.onclick=function(){
      SETTINGS.mode=normalizeMode(btn.dataset.pbMode);
      RESULT=[];
      markDirty();
      render();
    };
  });
  var compareBtn=panel.querySelector("[data-pb-compare]");
  if(compareBtn)compareBtn.onclick=compareAllModes;
  Array.prototype.forEach.call(panel.querySelectorAll("[data-pb-apply-mode]"),function(btn){
    btn.onclick=function(){applyComparedMode(btn.dataset.pbApplyMode)};
  });
  var buildBtn=panel.querySelector("[data-pb-build]");
  if(buildBtn)buildBtn.onclick=build;
  Array.prototype.forEach.call(panel.querySelectorAll("[data-pb-slot-save]"),function(btn){
    btn.onclick=function(){saveResultSlot(Number(btn.dataset.pbSlotSave))};
  });
  Array.prototype.forEach.call(panel.querySelectorAll("[data-pb-slot-load]"),function(btn){
    btn.onclick=function(){loadResultSlot(Number(btn.dataset.pbSlotLoad))};
  });
  Array.prototype.forEach.call(panel.querySelectorAll("[data-pb-slot-delete]"),function(btn){
    btn.onclick=function(){deleteResultSlot(Number(btn.dataset.pbSlotDelete))};
  });
  var saveBtn=panel.querySelector("[data-pb-save]");
  if(saveBtn)saveBtn.onclick=savePrefs;
  Array.prototype.forEach.call(panel.querySelectorAll("[data-pb-undo]"),function(btn){btn.onclick=undoPartyResult});
  Array.prototype.forEach.call(panel.querySelectorAll("[data-pb-remove-member]"),function(btn){
    btn.onclick=function(){removePartyMember(btn.dataset.pbRemoveMember)};
  });
  Array.prototype.forEach.call(panel.querySelectorAll("[data-pb-unassigned]"),function(btn){
    btn.onclick=function(){selectUnassigned(btn.dataset.pbUnassigned)};
  });
  Array.prototype.forEach.call(panel.querySelectorAll("[data-pb-add-target]"),function(btn){
    btn.onclick=function(){if(MANUAL_ADD)addUnassignedToParty(MANUAL_ADD,btn.dataset.pbAddTarget)};
  });
  var cancelPick=panel.querySelector("[data-pb-cancel-pick]");
  if(cancelPick)cancelPick.onclick=function(){MANUAL_PICK="";MANUAL_ADD="";render()};
  Array.prototype.forEach.call(panel.querySelectorAll("[data-pb-move-target]"),function(btn){
    btn.onclick=function(){if(MANUAL_PICK)modifyPartyResult(MANUAL_PICK,btn.dataset.pbMoveTarget,"")};
  });
  Array.prototype.forEach.call(panel.querySelectorAll("[data-pb-member-action]"),function(btn){
    btn.onclick=function(){
      var key=btn.dataset.pbMemberAction;
      var source=MANUAL_PICK?findResultMember(MANUAL_PICK):null;
      var target=findResultMember(key);
      if(source&&target&&source.partyIndex!==target.partyIndex){
        modifyPartyResult(MANUAL_PICK,btn.dataset.pbMemberParty,key);
      }else selectManualMember(key);
    };
  });
  Array.prototype.forEach.call(panel.querySelectorAll("[data-pb-drag-member]"),function(row){
    row.ondragstart=function(e){
      if(!EDIT_MODE||SAVING||BUILDING||COMPARING){e.preventDefault();return}
      MANUAL_DRAG=row.dataset.pbDragMember;
      if(e.dataTransfer){e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",MANUAL_DRAG)}
      row.classList.add("manual-dragging");
    };
    row.ondragend=function(){
      MANUAL_DRAG="";
      Array.prototype.forEach.call(panel.querySelectorAll(".manual-drag-over"),function(el){el.classList.remove("manual-drag-over")});
      row.classList.remove("manual-dragging");
    };
    row.ondragover=function(e){
      if(!MANUAL_DRAG||MANUAL_DRAG===row.dataset.pbSwapDrop)return;
      var source=findResultMember(MANUAL_DRAG),target=findResultMember(row.dataset.pbSwapDrop);
      if(!source||!target||source.partyIndex===target.partyIndex)return;
      e.preventDefault();e.stopPropagation();
      if(e.dataTransfer)e.dataTransfer.dropEffect="move";
      row.classList.add("manual-drag-over");
    };
    row.ondragleave=function(){row.classList.remove("manual-drag-over")};
    row.ondrop=function(e){
      e.preventDefault();e.stopPropagation();
      row.classList.remove("manual-drag-over");
      var key=MANUAL_DRAG;
      if(key&&key!==row.dataset.pbSwapDrop)modifyPartyResult(key,row.dataset.pbMemberParty,row.dataset.pbSwapDrop);
      MANUAL_DRAG="";
    };
  });
  Array.prototype.forEach.call(panel.querySelectorAll("[data-pb-drop-party]"),function(card){
    card.ondragover=function(e){
      if(!MANUAL_DRAG)return;
      var from=findResultMember(MANUAL_DRAG);
      if(!from||String(RESULT[from.partyIndex].id)===card.dataset.pbDropParty)return;
      e.preventDefault();
      if(e.dataTransfer)e.dataTransfer.dropEffect="move";
      card.classList.add("manual-drag-over");
    };
    card.ondragleave=function(e){
      if(!e.relatedTarget||!card.contains(e.relatedTarget))card.classList.remove("manual-drag-over");
    };
    card.ondrop=function(e){
      e.preventDefault();
      card.classList.remove("manual-drag-over");
      if(MANUAL_DRAG)modifyPartyResult(MANUAL_DRAG,card.dataset.pbDropParty,"");
      MANUAL_DRAG="";
    };
  });
  var resetBtn=panel.querySelector("[data-pb-reset]");
  if(resetBtn)resetBtn.onclick=function(){invalidateComparison();MANUAL_PICK="";MANUAL_ADD="";MANUAL_UNDO=null;SELECTED=[];RESULT=[];markDirty();render()};

  var guestForm=panel.querySelector("[data-pb-guest-form]");
  if(guestForm)guestForm.onsubmit=function(e){
    e.preventDefault();
    addGuest(
      guestForm.querySelector("[data-pb-guest-name]").value,
      guestForm.querySelector("[data-pb-guest-owner]").value,
      guestForm.querySelector("[data-pb-guest-rate]").value
    );
  };
  Array.prototype.forEach.call(panel.querySelectorAll("[data-pb-guest-remove]"),function(btn){
    btn.onclick=function(){removeGuest(btn.dataset.pbGuestRemove)};
  });
  Array.prototype.forEach.call(panel.querySelectorAll("[data-pb-owner]"),function(btn){
    btn.onclick=function(){toggleOwner(btn.dataset.pbOwner)};
  });
  Array.prototype.forEach.call(panel.querySelectorAll("[data-pb-char]"),function(btn){
    btn.onclick=function(){
      invalidateComparison();
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
      invalidateComparison();
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