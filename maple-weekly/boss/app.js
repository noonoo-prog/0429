(function(){
"use strict";

const SUPABASE_URL="https://ibqpjcedzcllacbamrnu.supabase.co";
const SUPABASE_KEY="sb_publishable_s-EiUNh66D17Xd3JFGUyvA_aNEDNMKq";
const API_URL=SUPABASE_URL+"/functions/v1/boss-board-api";
const BOSSES=["스우","데미안","루시드","윌","더스크","진힐라","듄켈","세렌","칼로스","카링","림보","대적자","흉성","벨로나","검은 마법사"];
const MONTHLY=new Set(["검은 마법사"]);
const SOLO=new Set(["데미안","루시드","윌","더스크","진힐라","듄켈"]);
const LIMIT=12,DIFFS=["","x","이지","노말","하드","카오스","익스트림"];
const ACTIVE_KEY="boss-board-active-owner-v6",PIN_PREFIX="boss-board-pin-",CHAR_PREFIX="boss-board-active-char-";

let APP={owners:[]};
let activeOwnerId=localStorage.getItem(ACTIVE_KEY)||"";
let activeCharByOwner={};
let saveTimer=null,dirty=false,saving=false,pollTimer=null;

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
  el.innerHTML=APP.owners.map(function(o){return'<button class="owner-tab '+(o.id===activeOwnerId?"active ":"")+(isUnlocked(o.id)?"unlocked":"locked")+'" data-owner="'+esc(o.id)+'">'+esc(o.name)+'</button>'}).join("");
  Array.prototype.forEach.call(el.querySelectorAll("[data-owner]"),function(b){b.onclick=function(){
    if(dirty){toast("저장 중인 변경사항이 있어요.");return}
    activeOwnerId=b.dataset.owner;localStorage.setItem(ACTIVE_KEY,activeOwnerId);render();
  }});
  var o=owner(),unlocked=o&&isUnlocked(o.id),title=document.getElementById("boardTitle");
  title.innerHTML=o?esc(o.name)+'의 보스 현황 <span class="lock-state '+(unlocked?"open":"")+'">'+(unlocked?"수정 가능":"보기 전용")+'</span>':"";
  document.getElementById("unlockOwner").textContent=unlocked?"수정 잠그기":"수정 잠금 해제";
  document.getElementById("renameOwner").disabled=!unlocked;
  document.getElementById("removeOwner").disabled=!unlocked;
  document.getElementById("addPlayer").disabled=!unlocked;
}

function diffOptions(c,editable,bi,pi,mobile){
  return'<select class="difficulty '+(mobile?"m-diff":"")+'" data-b="'+bi+'" data-p="'+pi+'" data-v="'+esc(c.difficulty)+'" '+(editable?"":"disabled")+'>'+
    DIFFS.map(function(x){return'<option value="'+esc(x)+'" '+(x===c.difficulty?"selected":"")+'>'+(x||"—")+'</option>'}).join("")+'</select>';
}
function desktopMembers(c,bi,pi,editable){
  if(!c.count)return'<div class="solo">인원수 선택</div>';
  if(c.count===1)return'<div class="solo">본인 단독</div>';
  var h='<div class="member-list">';
  for(var i=0;i<c.count-1;i++)h+='<input class="member" data-b="'+bi+'" data-p="'+pi+'" data-m="'+i+'" value="'+esc(c.names[i]||"")+'" placeholder="파티원 '+(i+1)+' 이름" '+(editable?"":"disabled")+'>';
  return h+"</div>";
}
function renderDesktop(){
  var st=state(),board=document.getElementById("board");if(!st){board.innerHTML="";return}
  var unlocked=isUnlocked(owner().id),h='<thead><tr><th class="boss-head">BOSS</th>';
  st.players.forEach(function(p,i){var w=weekly(i),m=monthly(i);h+='<th class="player-head"><div class="player-row"><input class="player-input" data-player="'+i+'" value="'+esc(p)+'" '+(unlocked?"":"disabled")+'><button class="remove-player" data-remove="'+i+'" '+(unlocked?"":"disabled")+'>×</button></div><div class="sub"><span class="'+(w>=LIMIT?"full":"")+'">주간 '+w+'/'+LIMIT+'</span> · 월간 '+m+'/1</div></th>'});
  h+="</tr></thead><tbody>";
  BOSSES.forEach(function(b,bi){var mon=MONTHLY.has(b);h+='<tr class="'+(mon?"monthly-row":"")+'"><td class="boss"><div class="boss-name"><span>'+b+'</span><span class="badge '+(mon?"monthly":"")+'">'+(mon?"월간":"주간")+'</span></div></td>';
    st.players.forEach(function(_,pi){var c=st.cells[b][pi]||emptyCell(),auto=!!c._sync,editable=unlocked&&!auto,party="";
      if(SOLO.has(b))party='<div class="solo">'+(planned(c)?"1인 고정":"난이도 선택 시 1인")+'</div>';
      else{var counts=[1,2,3,4,5,6].map(function(n){return'<label class="count"><input type="radio" name="c-'+bi+'-'+pi+'" data-count="'+n+'" data-b="'+bi+'" data-p="'+pi+'" '+(c.count===n?"checked ":"")+(editable?"":"disabled")+'><span>'+n+'인</span></label>'}).join("");party='<div class="counts">'+counts+'</div>'+desktopMembers(c,bi,pi,editable)}
      if(auto)party+='<div class="sync-note">↔ '+esc(c._sync.sourcePlayer||c._sync.sourceOwnerName||"다른 보스판")+'에서 자동 연동</div>';
      h+='<td class="slot"><div class="slot-grid">'+diffOptions(c,editable,bi,pi,false)+'<div class="party">'+party+'</div></div></td>';
    });h+="</tr>";
  });h+="</tbody>";board.innerHTML=h;bindCommon(board);
}
function mobileMemberInputs(c,bi,pi,editable){
  if(!c.count)return'<div class="solo">인원수를 선택해 주세요</div>';
  if(c.count===1)return'<div class="solo">본인 단독</div>';
  var h="";for(var i=0;i<c.count-1;i++)h+='<input class="member mobile-member" data-b="'+bi+'" data-p="'+pi+'" data-m="'+i+'" value="'+esc(c.names[i]||"")+'" placeholder="파티원 '+(i+1)+' 닉네임" '+(editable?"":"disabled")+'>';
  return h;
}
function renderMobile(){
  var box=document.getElementById("mobileBoard"),st=state(),o=owner();if(!st||!o){box.innerHTML='<div class="mobile-loading">보스판이 없습니다.</div>';return}
  var pi=activeChar(),unlocked=isUnlocked(o.id);
  var strip='<div class="character-strip">'+st.players.map(function(p,i){return'<button class="char-tab '+(i===pi?"active":"")+'" data-char="'+i+'">'+esc(p)+'<span class="mini-count">주간 '+weekly(i)+'/'+LIMIT+'</span></button>'}).join("")+'</div>';
  var summary='<div class="mobile-summary"><div><strong>'+esc(st.players[pi])+'</strong><br><span>'+esc(o.name)+' 보유 캐릭터</span></div><div><strong>주간 '+weekly(pi)+'/'+LIMIT+'</strong><br><span>월간 '+monthly(pi)+'/1</span></div></div>';
  var cards='<div class="mobile-boss-list">';
  BOSSES.forEach(function(b,bi){
    var c=st.cells[b][pi]||emptyCell(),auto=!!c._sync,editable=unlocked&&!auto,mon=MONTHLY.has(b);
    var party="";
    if(SOLO.has(b)){party='<div class="solo">'+(planned(c)?"1인 고정":"난이도 선택 시 1인")+'</div>'}
    else{
      party='<select class="mobile-count-select" data-mobile-count="1" data-b="'+bi+'" data-p="'+pi+'" '+(editable?"":"disabled")+'>'+
        '<option value="0" '+(!c.count?"selected":"")+'>인원수</option>'+
        [1,2,3,4,5,6].map(function(n){return'<option value="'+n+'" '+(c.count===n?"selected":"")+'>'+n+'인</option>'}).join("")+'</select>'+
        mobileMemberInputs(c,bi,pi,editable);
    }
    if(auto)party+='<div class="sync-note">↔ '+esc(c._sync.sourcePlayer||c._sync.sourceOwnerName||"다른 보스판")+'에서 자동 연동</div>';
    cards+='<article class="mobile-boss-card '+(mon?"monthly ":"")+(auto?"synced":"")+'"><div class="mobile-boss-head"><div class="mobile-boss-name">'+esc(b)+' <span class="badge '+(mon?"monthly":"")+'">'+(mon?"월간":"주간")+'</span></div><div class="mobile-boss-state">'+(auto?"자동연동":(unlocked?"수정 가능":"보기 전용"))+'</div></div><div class="mobile-controls">'+diffOptions(c,editable,bi,pi,true)+'<div class="mobile-party">'+party+'</div></div></article>';
  });
  cards+="</div>";box.innerHTML=strip+summary+cards;
  Array.prototype.forEach.call(box.querySelectorAll("[data-char]"),function(b){b.onclick=function(){setActiveChar(+b.dataset.char)}});
  bindCommon(box);
}
function render(){renderOwners();renderDesktop();renderMobile()}

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
  Array.prototype.forEach.call(root.querySelectorAll(".member:not(:disabled)"),function(e){e.oninput=function(){var b=BOSSES[+e.dataset.b];st.cells[b][+e.dataset.p].names[+e.dataset.m]=e.value;queueSave()}});
  Array.prototype.forEach.call(root.querySelectorAll("[data-remove]:not(:disabled)"),function(e){e.onclick=function(){
    var i=+e.dataset.remove;if(st.players.length<=1){toast("캐릭터는 1명 이상 있어야 해요.");return}
    if(!confirm("“"+(st.players[i]||"캐릭터")+"” 열을 삭제할까요?"))return;
    st.players.splice(i,1);BOSSES.forEach(function(b){st.cells[b].splice(i,1)});queueSave(120);render();
  }});
}
function changeCount(bi,pi,n){
  var st=state(),b=BOSSES[bi],c=st.cells[b][pi];c.count=n;c.names=(c.names||[]).slice(0,Math.max(0,n-1));while(c.names.length<n-1)c.names.push("");queueSave(120);render();
}

document.getElementById("unlockOwner").onclick=function(){
  var o=owner();if(!o)return;
  if(isUnlocked(o.id)){Promise.resolve(dirty?saveBoardNow():null).then(function(){clearPin(o.id);render();toast("수정을 잠갔어요.")})}
  else ensureUnlocked();
};
document.getElementById("addOwner").onclick=function(){
  var current=owner();if(!current)return;
  ensureUnlocked().then(function(ok){if(!ok)return;var name=(prompt("새 보스판의 주인 이름을 입력해 주세요. 예: 웃토")||"").trim();if(!name)return;
    var newPin=(prompt("“"+name+"”의 수정 비밀번호를 숫자 4~12자리로 입력해 주세요.")||"").trim();if(!/^\d{4,12}$/.test(newPin)){toast("비밀번호는 숫자 4~12자리로 입력해 주세요.");return}
    return callApi("create_owner",{authorizingOwnerId:current.id,pin:getPin(current.id),name:name,newPin:newPin}).then(function(data){
      applyPayload(data);activeOwnerId=data.newOwnerId;localStorage.setItem(ACTIVE_KEY,activeOwnerId);setPin(activeOwnerId,newPin);render();toast(name+" 보스판을 만들었어요.")
    }).catch(function(e){toast(e.message||"새 보스판을 만들지 못했습니다.")});
  });
};
document.getElementById("renameOwner").onclick=function(){var o=owner();if(!o||!isUnlocked(o.id))return;var n=(prompt("주인 이름을 수정해 주세요.",o.name)||"").trim();if(!n||n===o.name)return;callApi("rename_owner",{ownerId:o.id,pin:getPin(o.id),newName:n}).then(function(data){applyPayload(data);render();toast("주인 이름을 변경했어요.")}).catch(function(e){toast(e.message||"이름을 변경하지 못했습니다.")})};
document.getElementById("removeOwner").onclick=function(){var o=owner();if(!o||!isUnlocked(o.id))return;if(!confirm("“"+o.name+"” 보스판 전체를 삭제할까요?"))return;callApi("delete_owner",{ownerId:o.id,pin:getPin(o.id)}).then(function(data){clearPin(o.id);applyPayload(data);activeOwnerId=APP.owners[0]?APP.owners[0].id:"";if(activeOwnerId)localStorage.setItem(ACTIVE_KEY,activeOwnerId);render();toast("보스판을 삭제했어요.")}).catch(function(e){toast(e.message||"보스판을 삭제하지 못했습니다.")})};
document.getElementById("addPlayer").onclick=function(){var o=owner();if(!o||!isUnlocked(o.id))return;var st=state();st.players.push("새 닉네임");BOSSES.forEach(function(b){st.cells[b].push(emptyCell())});activeCharByOwner[o.id]=st.players.length-1;render();queueSave(120)};
document.getElementById("reloadBtn").onclick=function(){if(dirty&&!confirm("아직 저장 중인 변경사항이 있습니다. DB 내용을 다시 불러올까요?"))return;loadRemote(true)};
document.getElementById("shareBtn").onclick=function(){var url=location.origin+location.pathname;if(navigator.share){navigator.share({title:"보스 현황판",url:url}).catch(function(){})}else if(navigator.clipboard){navigator.clipboard.writeText(url).then(function(){toast("홈페이지 주소를 복사했어요.")})}else{prompt("주소를 복사해 주세요.",url)}};

window.addEventListener("resize",function(){clearTimeout(window.__bossResize);window.__bossResize=setTimeout(render,120)});
window.addEventListener("pageshow",function(e){if(e.persisted)loadRemote(false)});

function startPolling(){
  clearInterval(pollTimer);
  pollTimer=setInterval(function(){if(document.hidden||dirty||saving)return;loadRemote(false)},4000);
}
loadRemote(true).then(startPolling);
})();