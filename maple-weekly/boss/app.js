(function(){
"use strict";

const SUPABASE_URL="https://ibqpjcedzcllacbamrnu.supabase.co";
const SUPABASE_KEY="sb_publishable_s-EiUNh66D17Xd3JFGUyvA_aNEDNMKq";
const API_URL=SUPABASE_URL+"/functions/v1/boss-board-api";
const BOSSES=["스우","데미안","가엔슬","루시드","윌","더스크","진힐라","듄켈","세렌","칼로스","대적자","카링","흉성","벨로나","림보","발드릭스","유피테르","검은 마법사"];
const BOSS_DIFFICULTIES={
  "스우":["노말","하드","익스트림"],
  "데미안":["노말","하드"],
  "가엔슬":["노말","카오스"],
  "루시드":["이지","노말","하드"],
  "윌":["이지","노말","하드"],
  "더스크":["노말","카오스"],
  "진힐라":["노말","하드"],
  "듄켈":["노말","하드"],
  "세렌":["노말","하드","익스트림"],
  "칼로스":["이지","노말","카오스","익스트림"],
  "카링":["이지","노말","하드","익스트림"],
  "림보":["노말","하드"],
  "발드릭스":["노말","하드"],
  "유피테르":["노말","하드"],
  "대적자":["이지","노말","하드","익스트림"],
  "흉성":["노말","하드"],
  "벨로나":["이지","노말","하드"],
  "검은 마법사":["하드","익스트림"]
};
const BOSS_CRYSTAL_PRICES={
  "스우":{"노말":8350000,"하드":48900000,"익스트림":545000000},
  "데미안":{"노말":8750000,"하드":46400000},
  "가엔슬":{"노말":12700000,"카오스":71300000},
  "루시드":{"이지":14900000,"노말":17800000,"하드":59700000},
  "윌":{"이지":16100000,"노말":20500000,"하드":73200000},
  "더스크":{"노말":22000000,"카오스":66300000},
  "듄켈":{"노말":23700000,"하드":89600000},
  "진힐라":{"노말":67600000,"하드":100000000},
  "세렌":{"노말":167000000,"하드":302000000,"익스트림":1840000000},
  "칼로스":{"이지":238000000,"노말":479000000,"카오스":1230000000},
  "대적자":{"이지":261000000,"노말":532000000,"하드":1390000000},
  "카링":{"이지":320000000,"노말":593000000,"하드":1560000000},
  "흉성":{"노말":576000000},
  "벨로나":{"이지":396000000,"노말":824000000},
  "림보":{"노말":995000000},
  "발드릭스":{"노말":1320000000},
  "유피테르":{"노말":1560000000},
  "검은 마법사":{"하드":465000000,"익스트림":5680000000}
};
const MONTHLY=new Set(["검은 마법사"]);
const SOLO=new Set(["데미안","루시드","윌","더스크","진힐라","듄켈"]);
const LIMIT=12,DIFFS=["","x","이지","노말","하드","카오스","익스트림"];
const ACTIVE_KEY="boss-board-active-owner-v6",PIN_PREFIX="boss-board-pin-",CHAR_PREFIX="boss-board-active-char-",MOBILE_VIEW_KEY="boss-board-mobile-view-v1";
const FIXED_OWNER_ORDER=["오똑","츠죠","피콕","꿈품은","달하늘의별을"];

let APP={owners:[]};
let activeOwnerId=localStorage.getItem(ACTIVE_KEY)||"";
let activeCharByOwner={};
let saveTimer=null,dirty=false,saving=false,pollTimer=null;
let PICKER=null;
let MOBILE_VIEW=localStorage.getItem(MOBILE_VIEW_KEY)==="all"?"all":"active";
let SEARCH_QUERY="";

function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(m){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]})}
function toast(m){var e=document.getElementById("toast");e.textContent=m;e.classList.add("show");setTimeout(function(){e.classList.remove("show")},1900)}
function pinKey(id){return PIN_PREFIX+id}
function getPin(id){return sessionStorage.getItem(pinKey(id))||""}
function setPin(id,pin){sessionStorage.setItem(pinKey(id),pin)}
function clearPin(id){sessionStorage.removeItem(pinKey(id))}
function isUnlocked(id){return !!getPin(id)}
function owner(){return APP.owners.find(function(o){return o.id===activeOwnerId})||APP.owners[0]||null}
function state(){var o=owner();return o?o.board:null}
function planned(c){return !!c&&c.difficulty!==""&&c.difficulty!=="x"}
function normalizeSearch(v){return String(v||"").trim().toLowerCase()}
function cellMatchesSearch(c,playerName,query){
  var q=normalizeSearch(query);
  if(!q)return true;
  if(!planned(c))return false;
  var values=[playerName].concat(c.names||[]);
  if(c._sync){
    values.push(c._sync.sourcePlayer||"",c._sync.targetPlayer||"",c._sync.sourceOwnerName||"");
  }
  return values.some(function(v){return normalizeSearch(v).indexOf(q)>=0});
}
function searchResultCount(){
  var st=state(),q=normalizeSearch(SEARCH_QUERY),n=0;
  if(!st||!q)return 0;
  st.players.forEach(function(p,pi){
    BOSSES.forEach(function(b){
      var c=st.cells[b][pi]||emptyCell();
      if(cellMatchesSearch(c,p,q))n++;
    });
  });
  return n;
}
function updateSearchUI(){
  var input=document.getElementById("partySearchInput");
  var clear=document.getElementById("partySearchClear");
  var status=document.getElementById("partySearchStatus");
  if(!input||!clear||!status)return;
  if(input.value!==SEARCH_QUERY)input.value=SEARCH_QUERY;
  clear.hidden=!SEARCH_QUERY;
  if(!SEARCH_QUERY){
    status.textContent="닉네임을 입력하면 그 캐릭터가 포함된 파티만 표시됩니다.";
  }else{
    var n=searchResultCount();
    status.innerHTML='<strong>“'+esc(SEARCH_QUERY)+'”</strong> 포함 파티 <b>'+n+'건</b>';
  }
}

function ownerTheme(name){
  if(name==="오똑")return"ottok";
  if(name==="츠죠")return"tsujyo";
  if(name==="피콕")return"peacock";
  if(name==="꿈품은")return"dream";
  if(name==="달하늘의별을")return"sky";
  return"default";
}

function emptyCell(){return{difficulty:"",count:0,names:[]}}
function isMobile(){return window.matchMedia&&window.matchMedia("(max-width:760px)").matches}
function activeChar(){var o=owner(),st=state();if(!o||!st)return 0;var k=CHAR_PREFIX+o.id;if(activeCharByOwner[o.id]==null){var stored=Number(localStorage.getItem(k));activeCharByOwner[o.id]=Number.isInteger(stored)&&stored>=0&&stored<st.players.length?stored:0}if(activeCharByOwner[o.id]>=st.players.length)activeCharByOwner[o.id]=0;return activeCharByOwner[o.id]}
function setActiveChar(i){var o=owner();if(!o)return;activeCharByOwner[o.id]=i;localStorage.setItem(CHAR_PREFIX+o.id,String(i));renderMobile()}

function normalizeBoard(board,name){
  var players=Array.isArray(board&&board.players)&&board.players.length?board.players.map(function(p,i){return String(p||("캐릭터 "+(i+1)))}):[name];
  var cells={};
  BOSSES.forEach(function(b){
    var src=Array.isArray(board&&board.cells&&board.cells[b])?board.cells[b]:[];
    cells[b]=players.map(function(_,i){
      var v=src[i]||emptyCell(),d=typeof v.difficulty==="string"?v.difficulty:"";
      var count=Math.max(0,Math.min(6,Number(v.count)||0));
      if(!d||d==="x")count=0;if(SOLO.has(b)&&d&&d!=="x")count=1;
      var names=Array.isArray(v.names)?v.names.map(function(x){return String(x).trim()}).filter(Boolean).slice(0,Math.max(0,count-1)):[];
      var out={difficulty:d,count:count,names:names};if(v._sync)out._sync=v._sync;return out;
    });
  });
  return{players:players,cells:cells};
}

function callApi(action,payload){
  payload=payload||{};
  return fetch(API_URL,{
    method:"POST",
    mode:"cors",
    cache:"no-store",
    headers:{"Content-Type":"application/json","apikey":SUPABASE_KEY},
    body:JSON.stringify(Object.assign({action:action},payload))
  }).then(function(res){
    return res.text().then(function(t){
      var data={};try{data=JSON.parse(t)}catch(e){}
      if(!res.ok){var err=new Error(data.error||("요청 실패 ("+res.status+")"));err.status=res.status;throw err}
      return data;
    });
  });
}

function applyPayload(data){
  APP.owners=(data.owners||[]).map(function(o){return Object.assign({},o,{board:normalizeBoard(o.board,o.name)})});
  APP.owners.sort(function(a,b){
    var ai=FIXED_OWNER_ORDER.indexOf(a.name),bi=FIXED_OWNER_ORDER.indexOf(b.name);
    if(ai<0)ai=999;if(bi<0)bi=999;
    if(ai!==bi)return ai-bi;
    return String(a.created_at||"").localeCompare(String(b.created_at||""));
  });
  if(!APP.owners.some(function(o){return o.id===activeOwnerId})){activeOwnerId=APP.owners[0]?APP.owners[0].id:"";if(activeOwnerId)localStorage.setItem(ACTIVE_KEY,activeOwnerId)}
}

function loadRemote(show){
  if(show!==false){document.getElementById("saveText").textContent="공용 DB 불러오는 중…";document.getElementById("mobileBoard").innerHTML='<div class="mobile-loading">보스판을 불러오는 중…</div>'}
  return callApi("bootstrap").then(function(data){
    applyPayload(data);dirty=false;render();document.getElementById("saveText").textContent="공용 DB 연결됨";
  }).catch(function(e){
    document.getElementById("saveText").textContent="DB 연결 실패";
    document.getElementById("mobileBoard").innerHTML='<div class="mobile-loading">연결하지 못했어요.<br><button class="btn" style="margin-top:10px" onclick="location.reload()">다시 시도</button></div>';
    toast(e.message||"보스판을 불러오지 못했습니다.");
  });
}

function ensureUnlocked(){
  var o=owner();if(!o)return Promise.resolve(false);
  if(isUnlocked(o.id))return Promise.resolve(true);
  var pin=prompt("“"+o.name+"” 보스판 수정 비밀번호를 입력해 주세요.");
  if(pin===null)return Promise.resolve(false);
  return callApi("verify",{ownerId:o.id,pin:String(pin)}).then(function(){
    setPin(o.id,String(pin));render();toast(o.name+" 보스판 수정 잠금을 해제했어요.");return true;
  }).catch(function(e){clearPin(o.id);toast(e.message||"비밀번호가 맞지 않습니다.");return false});
}
function weekly(pi,except){var st=state();if(!st)return 0;return BOSSES.reduce(function(n,b){return b===except||MONTHLY.has(b)?n:n+(planned(st.cells[b]&&st.cells[b][pi])?1:0)},0)}
function monthly(pi){var st=state();if(!st)return 0;return BOSSES.reduce(function(n,b){return n+(MONTHLY.has(b)&&planned(st.cells[b]&&st.cells[b][pi])?1:0)},0)}
function crystalBasePrice(boss,difficulty){
  if(MONTHLY.has(boss))return 0;
  return Number((BOSS_CRYSTAL_PRICES[boss]||{})[difficulty]||0);
}
function effectivePartyCount(boss,c){
  if(!planned(c))return 0;
  if(SOLO.has(boss))return 1;
  return Math.max(1,Number(c.count)||1);
}
function bossWeeklyIncome(boss,c){
  var base=crystalBasePrice(boss,c&&c.difficulty);
  if(!base)return 0;
  return base/effectivePartyCount(boss,c);
}
function formatEok(value){
  return (Math.max(0,Number(value)||0)/100000000).toFixed(1)+"억";
}
function characterWeeklyIncome(pi){
  var st=state();if(!st)return 0;
  return BOSSES.reduce(function(sum,b){
    if(MONTHLY.has(b))return sum;
    var c=st.cells[b]&&st.cells[b][pi];
    return sum+(planned(c)?bossWeeklyIncome(b,c):0);
  },0);
}
function characterMissingPriceCount(pi){
  var st=state();if(!st)return 0;
  return BOSSES.reduce(function(n,b){
    if(MONTHLY.has(b))return n;
    var c=st.cells[b]&&st.cells[b][pi];
    return n+(planned(c)&&!crystalBasePrice(b,c.difficulty)?1:0);
  },0);
}
function ownerWeeklyIncome(){
  var st=state();if(!st)return 0;
  return st.players.reduce(function(sum,_,pi){return sum+characterWeeklyIncome(pi)},0);
}
function ownerMissingPriceCount(){
  var st=state();if(!st)return 0;
  return st.players.reduce(function(sum,_,pi){return sum+characterMissingPriceCount(pi)},0);
}

function queueSave(delay){
  if(delay==null)delay=420;
  var o=owner();if(!o||!isUnlocked(o.id))return;
  dirty=true;clearTimeout(saveTimer);document.getElementById("saveText").textContent="변경사항 저장 중…";
  saveTimer=setTimeout(saveBoardNow,delay);
}
function saveBoardNow(){
  var o=owner(),st=state();if(!o||!st||saving||!dirty)return Promise.resolve();
  var pin=getPin(o.id);if(!pin)return Promise.resolve();saving=true;
  return callApi("save_board",{ownerId:o.id,pin:pin,board:st}).then(function(data){
    applyPayload(data);dirty=false;document.getElementById("saveText").textContent="공용 DB에 저장됨";render();
  }).catch(function(e){
    if(e.status===401){clearPin(o.id);toast("수정 잠금이 풀렸어요. 다시 비밀번호를 입력해 주세요.");return loadRemote(false)}
    toast(e.message||"저장하지 못했습니다.");document.getElementById("saveText").textContent="저장 실패";
  }).finally(function(){saving=false});
}

function renderOwners(){
  var el=document.getElementById("ownerTabs");
  el.innerHTML=APP.owners.map(function(o){return'<button class="owner-tab '+(o.id===activeOwnerId?"active ":"")+(isUnlocked(o.id)?"unlocked":"locked")+'" data-theme="'+ownerTheme(o.name)+'" data-owner="'+esc(o.id)+'">'+esc(o.name)+'</button>'}).join("");
  Array.prototype.forEach.call(el.querySelectorAll("[data-owner]"),function(b){b.onclick=function(){
    if(dirty){toast("저장 중인 변경사항이 있어요.");return}
    activeOwnerId=b.dataset.owner;localStorage.setItem(ACTIVE_KEY,activeOwnerId);render();
    document.documentElement.scrollLeft=0;document.body.scrollLeft=0;
    var mb=document.getElementById("mobileBoard");if(mb)mb.scrollLeft=0;
  }});
  var o=owner(),unlocked=o&&isUnlocked(o.id),title=document.getElementById("boardTitle");
  title.className="board-title owner-themed"; if(o)title.setAttribute("data-theme",ownerTheme(o.name)); else title.removeAttribute("data-theme"); title.innerHTML=o?esc(o.name)+'의 보스 현황 <span class="lock-state '+(unlocked?"open":"")+'">'+(unlocked?"수정 가능":"보기 전용")+'</span>':"";
  document.getElementById("unlockOwner").textContent=unlocked?"수정 잠그기":"수정 잠금 해제";
  document.getElementById("renameOwner").disabled=!unlocked;
  document.getElementById("changePinOwner").disabled=!unlocked;
  document.getElementById("removeOwner").disabled=!unlocked;
  document.getElementById("addPlayer").disabled=!unlocked;
}

function characterOwner(charName){
  var target=String(charName||"").trim();
  if(!target)return null;
  for(var oi=0;oi<APP.owners.length;oi++){
    var o=APP.owners[oi],players=(o.board&&o.board.players)||[];
    for(var pi=0;pi<players.length;pi++){
      if(String(players[pi]||"").trim()===target)return o;
    }
  }
  return null;
}
function memberPickButton(c,bi,pi,mi,editable){
  var name=(c.names&&c.names[mi])||"";
  var owned=name?characterOwner(name):null;
  var theme=owned?ownerTheme(owned.name):"default";
  return '<button class="member-pick party-picker-trigger '+(name?"":"empty")+' owner-themed" data-theme="'+theme+'" data-b="'+bi+'" data-p="'+pi+'" data-m="'+mi+'" '+(editable?"":"disabled")+'>'+
    '<span class="member-pick-name">'+esc(name||"파티원 선택")+'</span>'+
    '<span class="member-slot-label">#'+(mi+1)+'</span></button>';
}
function openPartyPicker(bi,pi,mi){
  var st=state();if(!st)return;
  PICKER={bi:bi,pi:pi,mi:mi};
  var boss=BOSSES[bi],source=st.players[pi]||"캐릭터";
  document.getElementById("partyPickerTitle").textContent=boss+" · 파티원 "+(mi+1)+" 선택";
  document.getElementById("partyPickerSub").textContent=source+"의 파티";
  var q=document.getElementById("partyPickerSearch");q.value="";
  document.getElementById("partyPicker").hidden=false;
  document.body.classList.add("picker-open");
  renderPartyPicker("");
  setTimeout(function(){q.focus()},80);
}
function closePartyPicker(){
  PICKER=null;
  document.getElementById("partyPicker").hidden=true;
  document.body.classList.remove("picker-open");
}
function renderPartyPicker(query){
  if(!PICKER)return;
  var st=state(),c=st.cells[BOSSES[PICKER.bi]][PICKER.pi];
  var current=(c.names&&c.names[PICKER.mi])||"";
  var source=String(st.players[PICKER.pi]||"").trim();
  var used=(c.names||[]).filter(function(_,i){return i!==PICKER.mi}).map(function(x){return String(x||"").trim()}).filter(Boolean);
  var needle=String(query||"").trim().toLowerCase();
  var html="";
  APP.owners.forEach(function(o){
    var theme=ownerTheme(o.name);
    var chars=((o.board&&o.board.players)||[]).filter(function(name){
      return !needle||String(name).toLowerCase().indexOf(needle)>=0||String(o.name).toLowerCase().indexOf(needle)>=0;
    });
    if(!chars.length)return;
    html+='<section class="picker-owner-group owner-themed" data-theme="'+theme+'">'+
      '<div class="picker-owner-title owner-themed" data-theme="'+theme+'">'+esc(o.name)+' <span class="picker-owner-count">'+chars.length+'명</span></div>'+
      '<div class="picker-grid">';
    chars.forEach(function(name){
      var clean=String(name||"").trim();
      var disabled=clean===source||used.indexOf(clean)>=0;
      html+='<button class="picker-character owner-themed '+(clean===current?"selected":"")+'" data-theme="'+theme+'" data-pick-character="'+esc(clean)+'" '+(disabled?"disabled":"")+'>'+esc(clean)+'</button>';
    });
    html+='</div></section>';
  });
  if(!html)html='<div class="picker-empty">검색 결과가 없습니다.</div>';
  var root=document.getElementById("partyPickerContent");root.innerHTML=html;
  Array.prototype.forEach.call(root.querySelectorAll("[data-pick-character]:not(:disabled)"),function(btn){
    btn.onclick=function(){
      if(!PICKER)return;
      var st2=state(),cell=st2.cells[BOSSES[PICKER.bi]][PICKER.pi];
      cell.names[PICKER.mi]=btn.dataset.pickCharacter;
      queueSave(100);
      closePartyPicker();
      render();
    };
  });
}
function diffOptions(c,editable,bi,pi,mobile){
  var boss=BOSSES[bi];
  var allowed=["","x"].concat(BOSS_DIFFICULTIES[boss]||["이지","노말","하드","카오스","익스트림"]);
  return'<select class="difficulty '+(mobile?"m-diff":"")+'" data-b="'+bi+'" data-p="'+pi+'" data-v="'+esc(c.difficulty)+'" '+(editable?"":"disabled")+'>'+
    allowed.map(function(x){return'<option value="'+esc(x)+'" '+(x===c.difficulty?"selected":"")+'>'+(x||"—")+'</option>'}).join("")+'</select>';
}
function desktopMembers(c,bi,pi,editable){
  if(!c.count)return'<div class="solo">인원수 선택</div>';
  if(c.count===1)return'<div class="solo">본인 단독</div>';
  var h='<div class="member-list">';
  for(var i=0;i<c.count-1;i++)h+=memberPickButton(c,bi,pi,i,editable);
  return h+"</div>";
}
function compactDifficultySelect(c,editable,bi,pi){
  var boss=BOSSES[bi];
  var current=(c.difficulty==="x"?"":c.difficulty);
  var allowed=[""].concat(BOSS_DIFFICULTIES[boss]||["이지","노말","하드","카오스","익스트림"]);
  return '<select class="difficulty compact-difficulty" data-b="'+bi+'" data-p="'+pi+'" data-v="'+esc(current)+'" '+(editable?"":"disabled")+'>'+
    allowed.map(function(x){
      var label=x==="이지"?"EASY":x==="노말"?"NORMAL":x==="하드"?"HARD":x==="카오스"?"CHAOS":x==="익스트림"?"EXTREME":"미설정";
      return '<option value="'+esc(x)+'" '+(x===current?"selected":"")+'>'+label+'</option>';
    }).join("")+
  '</select>';
}
function compactCountSelect(c,editable,bi,pi){
  if(!planned(c))return "";
  if(SOLO.has(BOSSES[bi]))return '<span class="compact-solo" aria-label="1인"></span>';
  return '<select class="compact-count '+(c.count===1?"is-one":"")+'" aria-label="파티 인원" data-mobile-count="1" data-b="'+bi+'" data-p="'+pi+'" '+(editable?"":"disabled")+'>'+
    '<option value="0" '+(!c.count?"selected":"")+'>인원</option>'+
    [1,2,3,4,5,6].map(function(n){return '<option value="'+n+'" '+(c.count===n?"selected":"")+'>'+(n===1?"":n+"인")+'</option>'}).join("")+
  '</select>';
}
function compactPartyMembers(c,bi,pi,editable){
  if(!planned(c)||!c.count||c.count<=1)return "";
  var st=state(),currentOwner=owner();
  var selfName=(st&&st.players&&st.players[pi])?String(st.players[pi]):"";
  var selfTheme=currentOwner?ownerTheme(currentOwner.name):"default";
  var h='<div class="compact-party-members">';
  h+='<span class="compact-member compact-member-self owner-themed" data-theme="'+selfTheme+'">'+esc(selfName)+'</span>';
  for(var i=0;i<c.count-1;i++){
    var name=(c.names&&c.names[i])||"";
    var owned=name?characterOwner(name):null;
    var theme=owned?ownerTheme(owned.name):"default";
    h+='<button class="compact-member party-picker-trigger owner-themed '+(name?"":"empty")+'" data-theme="'+theme+'" data-b="'+bi+'" data-p="'+pi+'" data-m="'+i+'" '+(editable?"":"disabled")+'>'+esc(name||"파티원")+'</button>';
  }
  return h+'</div>';
}
function compactBossCard(b,bi,c,pi,unlocked){
  var auto=!!c._sync,editable=unlocked&&!auto,mon=MONTHLY.has(b);
  var sync="";
  if(auto&&unlocked){
    var so=c._sync.sourceOwnerName||"";
    var sp=c._sync.sourcePlayer||"";
    sync='<span class="compact-sync">↔ '+esc(so)+(sp?' · '+esc(sp):'')+'</span>';
  }
  var income='<span class="compact-income-slot"></span>';
  if(planned(c)&&!mon){
    var price=crystalBasePrice(b,c.difficulty);
    income=price
      ?'<span class="compact-income-slot"><span class="compact-income">'+formatEok(bossWeeklyIncome(b,c))+'</span></span>'
      :'<span class="compact-income-slot"><span class="compact-income missing">미등록</span></span>';
  }
  return '<article class="compact-boss-card '+(planned(c)?"is-set ":"is-empty ")+(auto?"is-sync ":"")+(mon?"is-monthly":"")+'">'+
    '<div class="compact-main">'+
      compactDifficultySelect(c,editable,bi,pi)+
      '<div class="compact-name-wrap"><strong class="compact-boss-name">'+esc(b)+'</strong>'+sync+'</div>'+
      '<div class="compact-count-slot">'+compactCountSelect(c,editable,bi,pi)+'</div>'+
      income+
    '</div>'+
    compactPartyMembers(c,bi,pi,editable)+
  '</article>';
}
function renderDesktop(){
  var st=state(),root=document.getElementById("desktopBoard");
  if(!st){root.innerHTML="";return}
  var o=owner(),unlocked=isUnlocked(o.id),theme=ownerTheme(o.name),q=normalizeSearch(SEARCH_QUERY);
  var visible=[];
  st.players.forEach(function(p,pi){
    var full=weekly(pi)>=LIMIT;
    var bosses=BOSSES.filter(function(b){
      var c=st.cells[b][pi]||emptyCell();
      if(q)return cellMatchesSearch(c,p,q);
      if(full && !MONTHLY.has(b) && !planned(c))return false;
      return true;
    });
    if(!q||bosses.length)visible.push({p:p,pi:pi,bosses:bosses});
  });

  var ownerIncome=ownerWeeklyIncome(),ownerMissing=ownerMissingPriceCount();
  var h='<div class="desktop-board-meta"><div><strong>'+esc(o.name)+' 캐릭터 보드</strong><span>'+st.players.length+'명</span><b class="owner-weekly-total">총 주간 '+formatEok(ownerIncome)+(ownerMissing?' · 미등록 '+ownerMissing+'건':'')+'</b></div><div>'+(q?'검색 결과 '+searchResultCount()+'건':'주간 최대 '+LIMIT+'개 · 검은 마법사 월간')+'</div></div>';
  if(q&&!visible.length){
    root.innerHTML=h+'<div class="search-empty"><strong>일치하는 파티가 없어요.</strong><span>다른 닉네임으로 검색해 보세요.</span></div>';
    return;
  }
  var cols=visible.length;
  h+='<div class="character-columns '+(q?"is-searching":"")+'" style="--cols:'+cols+'">';
  visible.forEach(function(item){
    var p=item.p,pi=item.pi,w=weekly(pi),m=monthly(pi);
    var charIncome=characterWeeklyIncome(pi),missingPrices=characterMissingPriceCount(pi);
    h+='<section class="character-column owner-themed" data-theme="'+theme+'">'+
      '<header class="character-column-head">'+
        '<div class="character-title-row">'+
          '<span class="drag-dots" aria-hidden="true">⠿</span>'+
          '<input class="column-player-name player-input" data-player="'+pi+'" value="'+esc(p)+'" '+(unlocked?"":"disabled")+'>'+
          (pi===0?'<span class="representative-badge">대표</span>':'')+
          (w>=LIMIT?'<span class="complete-badge">완료</span>':'')+
          '<strong class="column-count '+(w>=LIMIT?"full":"")+'">'+w+'/'+LIMIT+'</strong>'+
          '<button class="remove-player column-remove" data-remove="'+pi+'" '+(unlocked?"":"disabled")+' aria-label="캐릭터 삭제">×</button>'+
        '</div>'+
        '<div class="column-sub"><span>주간 '+formatEok(charIncome)+(missingPrices?' · 미등록 '+missingPrices+'건':'')+'</span>'+(pi===0?'<b class="representative-total">전체 '+formatEok(ownerIncome)+(ownerMissing?' +미등록 '+ownerMissing:'')+'</b>':'')+'</div>'+
      '</header>'+
      '<div class="character-boss-list">';
    item.bosses.forEach(function(b){
      var bi=BOSSES.indexOf(b),c=st.cells[b][pi]||emptyCell();
      h+=compactBossCard(b,bi,c,pi,unlocked);
    });
    h+='</div></section>';
  });
  if(unlocked)h+='<button class="add-character-column" data-add-character="1"><strong>＋ 캐릭터 추가</strong><span>새 캐릭터 열 만들기</span></button>';
  h+='</div>';
  root.innerHTML=h;
  bindCommon(root);
}
function mobileMemberInputs(c,bi,pi,editable){
  if(!c.count)return'<div class="solo">인원수를 선택해 주세요</div>';
  if(c.count===1)return'<div class="solo">본인 단독</div>';
  var h="";for(var i=0;i<c.count-1;i++)h+=memberPickButton(c,bi,pi,i,editable);
  return h;
}
function renderMobile(){
  var box=document.getElementById("mobileBoard"),st=state(),o=owner();
  if(!st||!o){box.innerHTML='<div class="mobile-loading">보스판이 없습니다.</div>';return}
  var unlocked=isUnlocked(o.id),theme=ownerTheme(o.name),q=normalizeSearch(SEARCH_QUERY);

  if(q){
    var groups=[];
    st.players.forEach(function(p,pi){
      var matches=BOSSES.filter(function(b){
        return cellMatchesSearch(st.cells[b][pi]||emptyCell(),p,q);
      });
      if(matches.length)groups.push({p:p,pi:pi,matches:matches});
    });
    if(!groups.length){
      box.innerHTML='<div class="mobile-search-title"><strong>“'+esc(SEARCH_QUERY)+'” 검색</strong><span>0건</span></div>'+
        '<div class="search-empty"><strong>일치하는 파티가 없어요.</strong><span>닉네임 철자를 확인해 주세요.</span></div>';
      return;
    }
    var result='<div class="mobile-search-title"><strong>“'+esc(SEARCH_QUERY)+'” 포함 파티</strong><span>'+searchResultCount()+'건</span></div>';
    groups.forEach(function(g){
      result+='<section class="mobile-search-group owner-themed" data-theme="'+theme+'">'+
        '<header><strong>'+esc(g.p)+'</strong><span>'+g.matches.length+'건</span></header>'+
        '<div class="mobile-compact-list">';
      g.matches.forEach(function(b){
        var bi=BOSSES.indexOf(b),c=st.cells[b][g.pi]||emptyCell();
        result+=compactBossCard(b,bi,c,g.pi,unlocked);
      });
      result+='</div></section>';
    });
    box.innerHTML=result;
    bindCommon(box);
    return;
  }

  var pi=activeChar(),w=weekly(pi),m=monthly(pi);
  var strip='<div class="character-strip">'+st.players.map(function(p,i){
    var wi=weekly(i);
    return '<button class="char-tab owner-themed '+(i===pi?"active":"")+'" data-theme="'+theme+'" data-char="'+i+'">'+
      esc(p)+(wi>=LIMIT?'<span class="tab-complete">완료</span>':'')+'<span class="mini-count">'+wi+'/'+LIMIT+'</span></button>';
  }).join("")+(unlocked?'<button class="char-tab add-char-tab" data-add-character="1">＋ 캐릭터</button>':'')+'</div>';

  var charIncome=characterWeeklyIncome(pi),ownerIncome=ownerWeeklyIncome(),missingPrices=characterMissingPriceCount(pi),ownerMissing=ownerMissingPriceCount();
  var summary='<div class="mobile-character-head owner-themed" data-theme="'+theme+'">'+
    '<div><div class="mobile-character-name-line"><strong>'+esc(st.players[pi])+'</strong>'+(pi===0?'<span class="representative-badge">대표</span>':'')+(w>=LIMIT?'<span class="complete-badge">완료</span>':'')+'</div>'+
      '<span>주간 수익 <b class="mobile-income">'+formatEok(charIncome)+'</b>'+(missingPrices?' · 가격 미등록 '+missingPrices+'건':'')+(w>=LIMIT?' · 미설정 숨김':'')+'</span>'+
      (pi===0?'<span class="mobile-owner-total">전체 주간 '+formatEok(ownerIncome)+(ownerMissing?' · 미등록 '+ownerMissing+'건':'')+'</span>':'')+
    '</div>'+
    '<div class="mobile-char-actions"><div class="mobile-char-count"><b>'+w+'/'+LIMIT+'</b><small>월간 '+m+'/1</small></div>'+(unlocked?'<button class="mobile-remove-character" data-remove="'+pi+'" aria-label="현재 캐릭터 삭제">삭제</button>':'')+'</div>'+
  '</div>';

  var list='<div class="mobile-compact-list">';
  BOSSES.forEach(function(b,bi){
    var c=st.cells[b][pi]||emptyCell();
    if(w>=LIMIT && !MONTHLY.has(b) && !planned(c))return;
    list+=compactBossCard(b,bi,c,pi,unlocked);
  });
  list+='</div>';

  box.innerHTML=strip+summary+list;
  Array.prototype.forEach.call(box.querySelectorAll("[data-char]"),function(btn){
    btn.onclick=function(){setActiveChar(+btn.dataset.char)};
  });
  bindCommon(box);
}
function render(){renderOwners();renderDesktop();renderMobile();updateSearchUI()}

function bindCommon(root){
  var st=state();if(!st)return;
  Array.prototype.forEach.call(root.querySelectorAll(".player-input:not(:disabled)"),function(e){e.oninput=function(){st.players[+e.dataset.player]=e.value;queueSave()}});
  Array.prototype.forEach.call(root.querySelectorAll(".difficulty:not(:disabled)"),function(e){e.onchange=function(){
    var b=BOSSES[+e.dataset.b],pi=+e.dataset.p,c=st.cells[b][pi],n=e.value;
    if(!MONTHLY.has(b)&&n&&n!=="x"&&!planned(c)&&weekly(pi,b)>=LIMIT){toast("주간 보스는 최대 "+LIMIT+"개까지만 선택할 수 있어요.");render();return}
    c.difficulty=n;if(!n||n==="x"){c.count=0;c.names=[]}else if(SOLO.has(b)){c.count=1;c.names=[]}
    queueSave(120);render();
  }});
  Array.prototype.forEach.call(root.querySelectorAll("[data-count]:not(:disabled)"),function(e){e.onchange=function(){if(!e.checked)return;changeCount(+e.dataset.b,+e.dataset.p,+e.dataset.count)}});
  Array.prototype.forEach.call(root.querySelectorAll("[data-mobile-count]:not(:disabled)"),function(e){e.onchange=function(){changeCount(+e.dataset.b,+e.dataset.p,+e.value)}});
  Array.prototype.forEach.call(root.querySelectorAll(".party-picker-trigger:not(:disabled)"),function(e){e.onclick=function(){openPartyPicker(+e.dataset.b,+e.dataset.p,+e.dataset.m)}});
  Array.prototype.forEach.call(root.querySelectorAll("[data-add-character]"),function(e){e.onclick=addCharacter});
  Array.prototype.forEach.call(root.querySelectorAll("[data-remove]:not(:disabled)"),function(e){e.onclick=function(){
    var i=+e.dataset.remove;if(st.players.length<=1){toast("캐릭터는 1명 이상 있어야 해요.");return}
    if(!confirm("“"+(st.players[i]||"캐릭터")+"” 열을 삭제할까요?"))return;
    st.players.splice(i,1);BOSSES.forEach(function(b){st.cells[b].splice(i,1)});queueSave(120);render();
  }});
}
function changeCount(bi,pi,n){
  var st=state(),b=BOSSES[bi],c=st.cells[b][pi];c.count=n;c.names=(c.names||[]).slice(0,Math.max(0,n-1));while(c.names.length<n-1)c.names.push("");queueSave(120);render();
}

document.getElementById("partyPickerClose").onclick=closePartyPicker;
document.getElementById("partyPicker").onclick=function(e){if(e.target===this)closePartyPicker()};
document.getElementById("partyPickerSearch").oninput=function(){renderPartyPicker(this.value)};
document.getElementById("partyPickerManual").onclick=function(){
  if(!PICKER)return;
  var st=state(),cell=st.cells[BOSSES[PICKER.bi]][PICKER.pi];
  var current=(cell.names&&cell.names[PICKER.mi])||"";
  var name=(prompt("등록되지 않은 파티원 닉네임을 입력해 주세요.",current)||"").trim();
  if(!name)return;
  cell.names[PICKER.mi]=name;queueSave(100);closePartyPicker();render();
};
document.getElementById("partyPickerClear").onclick=function(){
  if(!PICKER)return;
  var st=state(),cell=st.cells[BOSSES[PICKER.bi]][PICKER.pi];
  cell.names[PICKER.mi]="";queueSave(100);closePartyPicker();render();
};
document.addEventListener("keydown",function(e){if(e.key==="Escape"&&PICKER)closePartyPicker()});

document.getElementById("unlockOwner").onclick=function(){
  var o=owner();if(!o)return;
  if(isUnlocked(o.id)){Promise.resolve(dirty?saveBoardNow():null).then(function(){clearPin(o.id);render();toast("수정을 잠갔어요.")})}
  else ensureUnlocked();
};
document.getElementById("addOwner").onclick=function(){
  var current=owner();if(!current)return;
  ensureUnlocked().then(function(ok){
    if(!ok)return;
    var adminCode=(prompt("새 주인을 추가하려면 관리자 번호를 입력해 주세요.")||"").trim();
    if(!adminCode)return;
    var name=(prompt("새 보스판의 주인 이름을 입력해 주세요. 예: 웃토")||"").trim();
    if(!name)return;
    var newPin=(prompt("“"+name+"”의 수정 비밀번호를 숫자 4~12자리로 입력해 주세요.")||"").trim();
    if(!/^\d{4,12}$/.test(newPin)){toast("비밀번호는 숫자 4~12자리로 입력해 주세요.");return}
    return callApi("create_owner",{authorizingOwnerId:current.id,pin:getPin(current.id),adminCode:adminCode,name:name,newPin:newPin}).then(function(data){
      applyPayload(data);activeOwnerId=data.newOwnerId;localStorage.setItem(ACTIVE_KEY,activeOwnerId);setPin(activeOwnerId,newPin);render();toast(name+" 보스판을 만들었어요.")
    }).catch(function(e){toast(e.message||"새 보스판을 만들지 못했습니다.")});
  });
};
document.getElementById("renameOwner").onclick=function(){var o=owner();if(!o||!isUnlocked(o.id))return;var n=(prompt("주인 이름을 수정해 주세요.",o.name)||"").trim();if(!n||n===o.name)return;callApi("rename_owner",{ownerId:o.id,pin:getPin(o.id),newName:n}).then(function(data){applyPayload(data);render();toast("주인 이름을 변경했어요.")}).catch(function(e){toast(e.message||"이름을 변경하지 못했습니다.")})};
document.getElementById("changePinOwner").onclick=function(){
  var o=owner();if(!o||!isUnlocked(o.id))return;
  var first=(prompt("새 수정 비밀번호를 숫자 4~12자리로 입력해 주세요.")||"").trim();
  if(!first)return;
  if(!/^\d{4,12}$/.test(first)){toast("비밀번호는 숫자 4~12자리로 입력해 주세요.");return}
  var second=(prompt("새 비밀번호를 한 번 더 입력해 주세요.")||"").trim();
  if(first!==second){toast("새 비밀번호가 서로 다릅니다.");return}
  callApi("change_pin",{ownerId:o.id,currentPin:getPin(o.id),newPin:first}).then(function(){
    setPin(o.id,first);
    render();
    toast("비밀번호를 변경했어요.");
  }).catch(function(e){toast(e.message||"비밀번호를 변경하지 못했습니다.")});
};

document.getElementById("removeOwner").onclick=function(){
  var o=owner();if(!o||!isUnlocked(o.id))return;
  var adminCode=(prompt("현재 주인을 삭제하려면 관리자 번호를 입력해 주세요.")||"").trim();
  if(!adminCode)return;
  if(!confirm("“"+o.name+"” 보스판 전체를 삭제할까요?\n삭제 후 되돌릴 수 없습니다."))return;
  callApi("delete_owner",{ownerId:o.id,pin:getPin(o.id),adminCode:adminCode}).then(function(data){
    clearPin(o.id);
    applyPayload(data);
    activeOwnerId=APP.owners[0]?APP.owners[0].id:"";
    if(activeOwnerId)localStorage.setItem(ACTIVE_KEY,activeOwnerId);
    render();
    toast("보스판을 삭제했어요.");
  }).catch(function(e){
    toast(e.message||"보스판을 삭제하지 못했습니다.");
  });
};
function addCharacter(){
  var o=owner();if(!o||!isUnlocked(o.id))return;
  var st=state();
  st.players.push("새 닉네임");
  BOSSES.forEach(function(b){st.cells[b].push(emptyCell())});
  activeCharByOwner[o.id]=st.players.length-1;
  render();queueSave(120);
}
document.getElementById("addPlayer").onclick=addCharacter;
document.getElementById("reloadBtn").onclick=function(){if(dirty&&!confirm("아직 저장 중인 변경사항이 있습니다. DB 내용을 다시 불러올까요?"))return;loadRemote(true)};
document.getElementById("shareBtn").onclick=function(){var url=location.origin+location.pathname;if(navigator.share){navigator.share({title:"보스 현황판",url:url}).catch(function(){})}else if(navigator.clipboard){navigator.clipboard.writeText(url).then(function(){toast("홈페이지 주소를 복사했어요.")})}else{prompt("주소를 복사해 주세요.",url)}};

var partySearchInput=document.getElementById("partySearchInput");
var partySearchClear=document.getElementById("partySearchClear");
partySearchInput.addEventListener("input",function(){
  SEARCH_QUERY=this.value.trim();
  renderDesktop();renderMobile();updateSearchUI();
});
partySearchClear.addEventListener("click",function(){
  SEARCH_QUERY="";
  partySearchInput.value="";
  renderDesktop();renderMobile();updateSearchUI();
  partySearchInput.focus();
});

window.addEventListener("resize",function(){clearTimeout(window.__bossResize);window.__bossResize=setTimeout(render,120)});
window.addEventListener("pageshow",function(e){if(e.persisted)loadRemote(false)});

function startPolling(){
  clearInterval(pollTimer);
  pollTimer=setInterval(function(){if(document.hidden||dirty||saving)return;loadRemote(false)},4000);
}
loadRemote(true).then(startPolling);
})();