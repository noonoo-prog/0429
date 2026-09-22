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
const FIXED_OWNER_ORDER=["오똑","츠죠","피콕","꿈품은","달하늘의별을","띵스"];

let APP={owners:[]};
let BASE_BOARDS={};
let activeOwnerId=localStorage.getItem(ACTIVE_KEY)||"";
let activeCharByOwner={};
let saveTimer=null,dirty=false,saving=false,pollTimer=null;
let EDIT_VERSION=0,SELECT_ACTIVE=false,PENDING_RENDER=false;
let ADMIN_UNLOCKED=false,ADMIN_CODE="";
let PICKER=null;
let MOBILE_VIEW=localStorage.getItem(MOBILE_VIEW_KEY)==="all"?"all":"active";
let SEARCH_QUERY="";

function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(m){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]})}
function toast(m){var e=document.getElementById("toast");e.textContent=m;e.classList.add("show");setTimeout(function(){e.classList.remove("show")},1900)}
function beginSelectInteraction(){SELECT_ACTIVE=true}
function endSelectInteraction(){
  SELECT_ACTIVE=false;
  if(PENDING_RENDER){
    PENDING_RENDER=false;
    setTimeout(function(){if(!SELECT_ACTIVE)render()},0);
  }
}
function guardedRender(){
  if(SELECT_ACTIVE){PENDING_RENDER=true;return}
  render();
}
function updateSaveUI(){
  var btn=document.getElementById("saveBoardBtn");
  var text=document.getElementById("saveText");
  var o=owner();
  var unlocked=!!(o&&isUnlocked(o.id));
  if(btn){
    btn.disabled=!unlocked||!dirty||saving;
    btn.classList.toggle("needs-save",!!(unlocked&&dirty&&!saving));
    btn.textContent=saving?"저장 중…":"저장";
  }
  if(text){
    if(saving)text.textContent="저장 중…";
    else if(dirty)text.textContent="저장 필요";
    else text.textContent="공용 DB 저장됨";
  }
}
function pinKey(id){return PIN_PREFIX+id}
function getPin(id){return sessionStorage.getItem(pinKey(id))||""}
function setPin(id,pin){sessionStorage.setItem(pinKey(id),pin)}
function clearPin(id){sessionStorage.removeItem(pinKey(id))}
function isUnlocked(id){return ADMIN_UNLOCKED||!!getPin(id)}
function owner(){return APP.owners.find(function(o){return o.id===activeOwnerId})||APP.owners[0]||null}
function state(){var o=owner();return o?o.board:null}
function planned(c){return !!c&&c.difficulty!==""&&c.difficulty!=="x"}
function normalizeSearch(v){return String(v||"").trim().toLowerCase()}
function cellMatchesSearch(c,playerName,query){
  var q=normalizeSearch(query);
  if(!q)return true;
  if(!planned(c))return false;

  var names=Array.isArray(c.names)?c.names:[];
  if(q==="미정"&&names.some(function(v){return normalizeSearch(v)==="미정"}))return true;

  var values=[playerName].concat(names);
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
function hasMultiParty(){
  var st=state();
  if(!st)return false;
  for(var bi=0;bi<BOSSES.length;bi++){
    var b=BOSSES[bi],arr=st.cells[b]||[];
    for(var pi=0;pi<arr.length;pi++){
      var c=arr[pi];
      if(planned(c)&&Number(c.count)>=2)return true;
    }
  }
  return false;
}
function updateSearchUI(){
  var input=document.getElementById("partySearchInput");
  var clear=document.getElementById("partySearchClear");
  var status=document.getElementById("partySearchStatus");
  var wrap=document.getElementById("partySearch");
  if(!input||!clear||!status||!wrap)return;

  var visible=hasMultiParty();
  wrap.hidden=!visible;

  if(!visible){
    if(SEARCH_QUERY){
      SEARCH_QUERY="";
      input.value="";
      setTimeout(function(){renderDesktop();renderMobile()},0);
    }
    return;
  }

  if(input.value!==SEARCH_QUERY)input.value=SEARCH_QUERY;
  clear.hidden=!SEARCH_QUERY;
  if(!SEARCH_QUERY){
    status.textContent="2인 이상 파티 닉네임 검색";
  }else{
    var n=searchResultCount();
    status.innerHTML='<strong>“'+esc(SEARCH_QUERY)+'”</strong> 포함 <b>'+n+'건</b>';
  }
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
  BASE_BOARDS={};
  APP.owners.forEach(function(o){BASE_BOARDS[o.id]=JSON.parse(JSON.stringify(o.board))});
  APP.owners.sort(function(a,b){
    var ai=FIXED_OWNER_ORDER.indexOf(a.name),bi=FIXED_OWNER_ORDER.indexOf(b.name);
    if(ai<0)ai=999;if(bi<0)bi=999;
    if(ai!==bi)return ai-bi;
    return String(a.created_at||"").localeCompare(String(b.created_at||""));
  });
  if(!APP.owners.some(function(o){return o.id===activeOwnerId})){activeOwnerId=APP.owners[0]?APP.owners[0].id:"";if(activeOwnerId)localStorage.setItem(ACTIVE_KEY,activeOwnerId)}
}

function loadRemote(show){
  if(show===false&&SELECT_ACTIVE)return Promise.resolve();
  if(show!==false){document.getElementById("saveText").textContent="공용 DB 불러오는 중…";document.getElementById("mobileBoard").innerHTML='<div class="mobile-loading">보스판을 불러오는 중…</div>'}
  return callApi("bootstrap").then(function(data){
    if(SELECT_ACTIVE||dirty||saving)return;
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

function queueSave(){
  var o=owner();if(!o||!isUnlocked(o.id))return;
  EDIT_VERSION++;
  dirty=true;
  clearTimeout(saveTimer);
  updateSaveUI();
}
function saveBoardNow(){
  var o=owner(),st=state();
  if(!o||!st||saving)return Promise.resolve();
  if(!dirty){toast("저장할 변경사항이 없어요.");updateSaveUI();return Promise.resolve();}
  var pin=getPin(o.id);
  if(!pin&&!ADMIN_UNLOCKED)return Promise.resolve();
  var saveVersion=EDIT_VERSION;
  var snapshot=JSON.parse(JSON.stringify(st));
  saving=true;
  updateSaveUI();
  var baseSnapshot=BASE_BOARDS[o.id]?JSON.parse(JSON.stringify(BASE_BOARDS[o.id])):JSON.parse(JSON.stringify(snapshot));
  return callApi("save_board",{ownerId:o.id,pin:pin,adminCode:ADMIN_UNLOCKED?ADMIN_CODE:"",baseBoard:baseSnapshot,board:snapshot}).then(function(data){
    if(saveVersion===EDIT_VERSION){
      dirty=false;
      applyPayload(data);
      toast("저장했어요.");
      render();
    }else{
      dirty=true;
      toast("저장 중 새 수정이 생겼어요. 저장 버튼을 한 번 더 눌러 주세요.");
    }
  }).catch(function(e){
    if(e.status===401){
      if(ADMIN_UNLOCKED){ADMIN_UNLOCKED=false;ADMIN_CODE="";}
      else clearPin(o.id);
      toast("수정 권한이 풀렸어요. 다시 인증해 주세요.");
      render();
      return loadRemote(false);
    }
    toast(e.message||"저장하지 못했습니다.");
  }).finally(function(){
    saving=false;
    updateSaveUI();
  });
}

function renderOwners(){
  var el=document.getElementById("ownerTabs");
  el.innerHTML=APP.owners.map(function(o){return'<button class="owner-tab '+(o.id===activeOwnerId?"active ":"")+(isUnlocked(o.id)?"unlocked":"locked")+'" data-theme="'+ownerTheme(o.name)+'" data-owner="'+esc(o.id)+'">'+esc(o.name)+'</button>'}).join("");
  Array.prototype.forEach.call(el.querySelectorAll("[data-owner]"),function(b){b.onclick=function(){
    if(dirty){toast("저장 버튼을 눌러 변경사항을 먼저 저장해 주세요.");return}
    activeOwnerId=b.dataset.owner;localStorage.setItem(ACTIVE_KEY,activeOwnerId);render();
    document.documentElement.scrollLeft=0;document.body.scrollLeft=0;
    var mb=document.getElementById("mobileBoard");if(mb)mb.scrollLeft=0;
  }});
  var o=owner(),unlocked=o&&isUnlocked(o.id),title=document.getElementById("boardTitle");
  title.className="board-title owner-themed"; if(o)title.setAttribute("data-theme",ownerTheme(o.name)); else title.removeAttribute("data-theme"); title.innerHTML=o?esc(o.name)+'의 보스 현황 <span class="lock-state '+(unlocked?"open":"")+'">'+(unlocked?"수정 가능":"보기 전용")+'</span>':"";
  var ownerUnlock=document.getElementById("unlockOwner");
  ownerUnlock.textContent=ADMIN_UNLOCKED?"관리자 모드 중":(unlocked?"수정 잠그기":"수정 잠금 해제");
  ownerUnlock.disabled=ADMIN_UNLOCKED;
  var adminBtn=document.getElementById("adminUnlock");
  adminBtn.textContent=ADMIN_UNLOCKED?"관리자 수정 종료":"관리자 전체 수정";
  adminBtn.classList.toggle("active",ADMIN_UNLOCKED);
  document.getElementById("renameOwner").disabled=!unlocked;
  document.getElementById("changePinOwner").disabled=!unlocked;
  document.getElementById("removeOwner").disabled=!unlocked;
  document.getElementById("addPlayer").disabled=!unlocked;
  updateSaveUI();
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
  if(!needle||"미정".indexOf(needle)>=0){
    html+='<section class="picker-owner-group picker-tbd-group">'+
      '<div class="picker-owner-title picker-tbd-title">파티원 미정</div>'+
      '<div class="picker-grid">'+
        '<button class="picker-character picker-tbd-character '+(current==="미정"?"selected":"")+'" data-pick-tbd="1">미정</button>'+
      '</div>'+
    '</section>';
  }
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
  Array.prototype.forEach.call(root.querySelectorAll("[data-pick-tbd]"),function(btn){
    btn.onclick=function(){
      if(!PICKER)return;
      var st2=state(),cell=st2.cells[BOSSES[PICKER.bi]][PICKER.pi];
      cell.names[PICKER.mi]="미정";
      queueSave();
      closePartyPicker();
      render();
    };
  });
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
  if(!editable){
    return '<span class="compact-solo">'+(c.count>1?c.count+"인":"")+'</span>';
  }
  return '<select class="compact-count" aria-label="파티 인원" data-mobile-count="1" data-b="'+bi+'" data-p="'+pi+'">'+
    '<option value="0" '+(!c.count?"selected":"")+'>인원</option>'+
    [1,2,3,4,5,6].map(function(n){return '<option value="'+n+'" '+(c.count===n?"selected":"")+'>'+n+'인</option>'}).join("")+
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
    var owned=name&&name!=="미정"?characterOwner(name):null;
    var theme=owned?ownerTheme(owned.name):"default";
    var memberClass=name==="미정"?"tbd":(name?"":"empty");
    h+='<button class="compact-member party-picker-trigger owner-themed '+memberClass+'" data-theme="'+theme+'" data-b="'+bi+'" data-p="'+pi+'" data-m="'+i+'" '+(editable?"":"disabled")+'>'+esc(name||"파티원")+'</button>';
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
function reorderCharacter(fromIndex,toIndex){
  var st=state(),o=owner();
  if(!st||!o||!isUnlocked(o.id))return;
  fromIndex=Number(fromIndex);toIndex=Number(toIndex);
  if(!Number.isInteger(fromIndex)||!Number.isInteger(toIndex))return;
  if(fromIndex<0||toIndex<0||fromIndex>=st.players.length||toIndex>=st.players.length||fromIndex===toIndex)return;

  var movedPlayer=st.players.splice(fromIndex,1)[0];
  st.players.splice(toIndex,0,movedPlayer);
  BOSSES.forEach(function(b){
    var arr=st.cells[b]||[];
    var movedCell=arr.splice(fromIndex,1)[0]||emptyCell();
    arr.splice(toIndex,0,movedCell);
    st.cells[b]=arr;
  });

  var active=activeChar();
  if(active===fromIndex)active=toIndex;
  else if(fromIndex<toIndex&&active>fromIndex&&active<=toIndex)active--;
  else if(toIndex<fromIndex&&active>=toIndex&&active<fromIndex)active++;
  activeCharByOwner[o.id]=active;
  localStorage.setItem(CHAR_PREFIX+o.id,String(active));

  queueSave();
  render();
}
function bindCharacterReorder(root,enabled){
  if(!enabled)return;
  var dragFrom=null;
  Array.prototype.forEach.call(root.querySelectorAll("[data-drag-character]"),function(handle){
    handle.ondragstart=function(e){
      dragFrom=+handle.dataset.dragCharacter;
      var column=handle.closest(".character-column");
      if(column)column.classList.add("is-dragging");
      if(e.dataTransfer){
        e.dataTransfer.effectAllowed="move";
        try{e.dataTransfer.setData("text/plain",String(dragFrom))}catch(_){}
      }
    };
    handle.ondragend=function(){
      dragFrom=null;
      Array.prototype.forEach.call(root.querySelectorAll(".character-column"),function(col){col.classList.remove("is-dragging","drag-over")});
    };
  });
  Array.prototype.forEach.call(root.querySelectorAll(".character-column[data-character-index]"),function(column){
    column.ondragover=function(e){
      if(dragFrom==null)return;
      e.preventDefault();
      column.classList.add("drag-over");
      if(e.dataTransfer)e.dataTransfer.dropEffect="move";
    };
    column.ondragleave=function(){column.classList.remove("drag-over")};
    column.ondrop=function(e){
      e.preventDefault();
      column.classList.remove("drag-over");
      if(dragFrom==null)return;
      var to=+column.dataset.characterIndex,from=dragFrom;
      dragFrom=null;
      reorderCharacter(from,to);
    };
  });
}

function desktopRowColumns(total){
  var w=Math.min(window.innerWidth||1600,1600);
  var maxCols=w>=1380?6:w>=1160?5:w>=960?4:3;
  return Math.max(1,Math.min(total,maxCols));
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
  var cols=visible.length,rowCols=desktopRowColumns(cols);
  h+='<div class="character-columns '+(q?"is-searching":"")+'" style="--cols:'+cols+';--row-cols:'+rowCols+'">';
  visible.forEach(function(item){
    var p=item.p,pi=item.pi,w=weekly(pi),m=monthly(pi);
    var charIncome=characterWeeklyIncome(pi),missingPrices=characterMissingPriceCount(pi);
    h+='<section class="character-column owner-themed" data-theme="'+theme+'" data-character-index="'+pi+'">'+
      '<header class="character-column-head">'+
        '<div class="character-title-row">'+
          '<span class="drag-dots '+(unlocked&&!q?"order-enabled":"")+'" '+(unlocked&&!q?'draggable="true" data-drag-character="'+pi+'" title="드래그해서 캐릭터 순서 변경"':'aria-hidden="true"')+'>⠿</span>'+
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
  bindCharacterReorder(root,unlocked&&!q);
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
    '<div class="mobile-char-actions">'+
      (unlocked?'<div class="mobile-order-actions">'+
        '<button class="mobile-order-btn" data-move-character="-1" '+(pi===0?'disabled':'')+' aria-label="캐릭터를 왼쪽으로 이동">←</button>'+
        '<button class="mobile-order-btn" data-move-character="1" '+(pi===st.players.length-1?'disabled':'')+' aria-label="캐릭터를 오른쪽으로 이동">→</button>'+
      '</div>':'')+
      '<div class="mobile-char-count"><b>'+w+'/'+LIMIT+'</b><small>월간 '+m+'/1</small></div>'+
      (unlocked?'<button class="mobile-remove-character" data-remove="'+pi+'" aria-label="현재 캐릭터 삭제">삭제</button>':'')+
    '</div>'+
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
  Array.prototype.forEach.call(root.querySelectorAll("select:not(:disabled)"),function(e){
    e.onfocus=beginSelectInteraction;
    e.onpointerdown=beginSelectInteraction;
    e.onblur=function(){setTimeout(endSelectInteraction,0)};
  });
  Array.prototype.forEach.call(root.querySelectorAll(".player-input:not(:disabled)"),function(e){e.oninput=function(){st.players[+e.dataset.player]=e.value;queueSave()}});
  Array.prototype.forEach.call(root.querySelectorAll(".difficulty:not(:disabled)"),function(e){e.onchange=function(){
    var b=BOSSES[+e.dataset.b],pi=+e.dataset.p,c=st.cells[b][pi],n=e.value;
    if(!MONTHLY.has(b)&&n&&n!=="x"&&!planned(c)&&weekly(pi,b)>=LIMIT){
      SELECT_ACTIVE=false;PENDING_RENDER=false;
      toast("주간 보스는 최대 "+LIMIT+"개까지만 선택할 수 있어요.");render();return;
    }
    c.difficulty=n;if(!n||n==="x"){c.count=0;c.names=[]}else if(SOLO.has(b)){c.count=1;c.names=[]}
    SELECT_ACTIVE=false;PENDING_RENDER=false;
    queueSave(180);render();
  }});
  Array.prototype.forEach.call(root.querySelectorAll("[data-count]:not(:disabled)"),function(e){e.onchange=function(){if(!e.checked)return;SELECT_ACTIVE=false;PENDING_RENDER=false;changeCount(+e.dataset.b,+e.dataset.p,+e.dataset.count)}});
  Array.prototype.forEach.call(root.querySelectorAll("[data-mobile-count]:not(:disabled)"),function(e){e.onchange=function(){SELECT_ACTIVE=false;PENDING_RENDER=false;changeCount(+e.dataset.b,+e.dataset.p,+e.value)}});
  Array.prototype.forEach.call(root.querySelectorAll(".party-picker-trigger:not(:disabled)"),function(e){e.onclick=function(){openPartyPicker(+e.dataset.b,+e.dataset.p,+e.dataset.m)}});
  Array.prototype.forEach.call(root.querySelectorAll("[data-move-character]:not(:disabled)"),function(e){
    e.onclick=function(){
      var from=activeChar(),delta=Number(e.dataset.moveCharacter)||0;
      reorderCharacter(from,from+delta);
    };
  });
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
  if(ADMIN_UNLOCKED){toast("관리자 전체 수정 모드입니다.");return}
  if(isUnlocked(o.id)){
    if(dirty){toast("저장 버튼을 눌러 변경사항을 먼저 저장해 주세요.");return}
    clearPin(o.id);render();toast("수정을 잠갔어요.");
  }else ensureUnlocked();
};

document.getElementById("adminUnlock").onclick=function(){
  if(ADMIN_UNLOCKED){
    if(dirty){toast("저장 버튼을 눌러 변경사항을 먼저 저장해 주세요.");return}
    ADMIN_UNLOCKED=false;ADMIN_CODE="";
    render();
    toast("관리자 전체 수정을 종료했어요.");
    return;
  }
  var code=(prompt("관리자 번호를 입력해 주세요.")||"").trim();
  if(!code)return;
  callApi("verify_admin",{adminCode:code}).then(function(){
    ADMIN_CODE=code;
    ADMIN_UNLOCKED=true;
    render();
    toast("전체 보스판 관리자 수정을 시작했어요.");
  }).catch(function(e){
    ADMIN_CODE="";ADMIN_UNLOCKED=false;
    toast(e.message||"관리자 번호가 맞지 않습니다.");
  });
};
document.getElementById("addOwner").onclick=function(){
  var current=owner();if(!current)return;
  var adminCode=ADMIN_UNLOCKED?ADMIN_CODE:(prompt("새 주인을 추가하려면 관리자 번호를 입력해 주세요.")||"").trim();
  if(!adminCode)return;
  var name=(prompt("새 보스판의 주인 이름을 입력해 주세요. 예: 웃토")||"").trim();
  if(!name)return;
  var newPin=(prompt("“"+name+"”의 수정 비밀번호를 숫자 4~12자리로 입력해 주세요.")||"").trim();
  if(!/^\d{4,12}$/.test(newPin)){toast("비밀번호는 숫자 4~12자리로 입력해 주세요.");return}
  callApi("create_owner",{adminCode:adminCode,name:name,newPin:newPin}).then(function(data){
    applyPayload(data);activeOwnerId=data.newOwnerId;localStorage.setItem(ACTIVE_KEY,activeOwnerId);
    if(!ADMIN_UNLOCKED)setPin(activeOwnerId,newPin);
    render();toast(name+" 보스판을 만들었어요.");
  }).catch(function(e){toast(e.message||"새 보스판을 만들지 못했습니다.")});
};
document.getElementById("renameOwner").onclick=function(){var o=owner();if(!o||!isUnlocked(o.id))return;var n=(prompt("주인 이름을 수정해 주세요.",o.name)||"").trim();if(!n||n===o.name)return;callApi("rename_owner",{ownerId:o.id,pin:getPin(o.id),adminCode:ADMIN_UNLOCKED?ADMIN_CODE:"",newName:n}).then(function(data){applyPayload(data);render();toast("주인 이름을 변경했어요.")}).catch(function(e){toast(e.message||"이름을 변경하지 못했습니다.")})};
document.getElementById("changePinOwner").onclick=function(){
  var o=owner();if(!o||!isUnlocked(o.id))return;
  var first=(prompt("새 수정 비밀번호를 숫자 4~12자리로 입력해 주세요.")||"").trim();
  if(!first)return;
  if(!/^\d{4,12}$/.test(first)){toast("비밀번호는 숫자 4~12자리로 입력해 주세요.");return}
  var second=(prompt("새 비밀번호를 한 번 더 입력해 주세요.")||"").trim();
  if(first!==second){toast("새 비밀번호가 서로 다릅니다.");return}
  callApi("change_pin",{ownerId:o.id,currentPin:getPin(o.id),adminCode:ADMIN_UNLOCKED?ADMIN_CODE:"",newPin:first}).then(function(){
    if(!ADMIN_UNLOCKED)setPin(o.id,first);
    render();
    toast("비밀번호를 변경했어요.");
  }).catch(function(e){toast(e.message||"비밀번호를 변경하지 못했습니다.")});
};

document.getElementById("removeOwner").onclick=function(){
  var o=owner();if(!o||!isUnlocked(o.id))return;
  var adminCode=ADMIN_UNLOCKED?ADMIN_CODE:(prompt("현재 주인을 삭제하려면 관리자 번호를 입력해 주세요.")||"").trim();
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
document.getElementById("saveBoardBtn").onclick=function(){
  if(saving)return;
  saveBoardNow();
};
document.getElementById("reloadBtn").onclick=function(){if(dirty&&!confirm("저장하지 않은 변경사항이 있습니다. 저장하지 않고 DB 내용을 다시 불러올까요?"))return;dirty=false;updateSaveUI();loadRemote(true)};
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

window.addEventListener("resize",function(){clearTimeout(window.__bossResize);window.__bossResize=setTimeout(guardedRender,120)});
window.addEventListener("pageshow",function(e){if(e.persisted)loadRemote(false)});
window.addEventListener("beforeunload",function(e){
  if(!dirty)return;
  e.preventDefault();
  e.returnValue="";
});

function startPolling(){
  clearInterval(pollTimer);
  pollTimer=setInterval(function(){if(document.hidden||dirty||saving||SELECT_ACTIVE)return;loadRemote(false)},4000);
}
loadRemote(true).then(startPolling);
})();