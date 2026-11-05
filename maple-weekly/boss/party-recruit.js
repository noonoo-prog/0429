(function(){
"use strict";
var ROOT="https://ibqpjcedzcllacbamrnu.supabase.co/functions/v1/";
var KEY="sb_publishable_s-EiUNh66D17Xd3JFGUyvA_aNEDNMKq";
var BOSSES=["스우","데미안","가엔슬","루시드","윌","더스크","진힐라","듄켈","세렌","칼로스","대적자","카링","흉성","벨로나","림보","발드릭스","유피테르","검은 마법사"];
var DIFFS={"스우":["노말","하드","익스트림"],"데미안":["노말","하드"],"가엔슬":["노말","카오스"],"루시드":["이지","노말","하드"],"윌":["이지","노말","하드"],"더스크":["노말","카오스"],"진힐라":["노말","하드"],"듄켈":["노말","하드"],"세렌":["노말","하드","익스트림"],"칼로스":["이지","노말","카오스","익스트림"],"대적자":["이지","노말","하드","익스트림"],"카링":["이지","노말","하드","익스트림"],"흉성":["노말","하드"],"벨로나":["이지","노말","하드"],"림보":["노말","하드"],"발드릭스":["노말","하드"],"유피테르":["노말","하드"],"검은 마법사":["하드","익스트림"]};
var state={groups:[],people:[]},plan={},owners=[],people=[],revision=0;
var pendingRates={},rateQueue={},rateSequence=0;
var loaded=false,loading=false,dirty=false,saving=false,lastFetch=0,filter="recruiting",error="";
var openIds=new Set();
function esc(value){return String(value==null?"":value).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function id(){return "grp-"+(window.crypto&&crypto.randomUUID?crypto.randomUUID():""+Date.now()+"-"+Math.floor(Math.random()*100000))}
function notify(msg){var toast=document.getElementById("toast");if(!toast)return;toast.textContent=msg;toast.classList.add("show");setTimeout(function(){toast.classList.remove("show")},2300)}
function api(path,body){
  return fetch(ROOT+path,{method:"POST",mode:"cors",cache:"no-store",headers:{"Content-Type":"application/json","apikey":KEY},body:JSON.stringify(body)}).then(function(r){
    return r.json().catch(function(){return {}}).then(function(data){
      if(!r.ok||data.ok===false){var e=new Error(data.error||"서버 연결 오류");e.status=r.status;throw e}
      return data;
    });
  });
}
function normalize(){
  if(!state||typeof state!=="object")state={};
  if(!Array.isArray(state.groups))state.groups=[];
  if(!Array.isArray(state.people))state.people=[];
}
function buildPeople(){
  var all=[];
  owners.forEach(function(o){
    var players=o.board&&Array.isArray(o.board.players)?o.board.players:[];
    players.forEach(function(n){
      var name=String(n||"").trim();if(!name)return;
      all.push({key:String(o.id)+"|"+name,name:name,owner:String(o.name||""),ownerKey:String(o.id)});
    });
  });
  (plan.guests||[]).forEach(function(g){
    if(!g||!g.id)return;
    all.push({key:"guest|"+g.id,name:String(g.name||""),owner:String(g.owner||"외부"),ownerKey:"guest:"+(String(g.owner||"").toLowerCase()||g.id)});
  });
  state.people.forEach(function(p){
    if(!p||!p.id)return;
    all.push({key:"manual|"+p.id,name:String(p.name||""),owner:String(p.owner||"외부"),ownerKey:"manual:"+p.id});
  });
  var found=new Set();
  people=all.filter(function(p){if(found.has(p.key))return false;found.add(p.key);return true});
}
function member(key){return people.find(function(p){return p.key===key})||{key:key,name:key.split("|").slice(-1)[0]||"알 수 없음",owner:"미등록",ownerKey:key}}
function rateFor(boss,key){
  var pending=pendingRates[boss+"||"+key];
  if(pending)return {value:pending.value,source:"저장 중"};
  var base=plan.multipliers&&plan.multipliers[boss]&&plan.multipliers[boss][key];
  return {value:Math.max(0,Number(base)||0),source:"공용"};
}
function setSharedRate(boss,key,value){
  var ref=boss+"||"+key,seq=++rateSequence;
  pendingRates[ref]={value:value,seq:seq};
  var prior=rateQueue[ref]||Promise.resolve();
  var next=prior.catch(function(){}).then(function(){
    return api("boss-party-recruit",{action:"rate_set",boss:boss,key:key,value:value});
  }).then(function(data){
    if(!plan.multipliers)plan.multipliers={};
    if(!plan.multipliers[boss])plan.multipliers[boss]={};
    if(data.value>0)plan.multipliers[boss][key]=data.value;
    else delete plan.multipliers[boss][key];
    if(pendingRates[ref]&&pendingRates[ref].seq===seq){
      delete pendingRates[ref];
      notify("공용 배율을 저장했어요.");
    }
    render();
    var planPanel=document.getElementById("partyBossPanel");
    if(planPanel&&!planPanel.hidden&&window.refreshPartyBossShared){
      window.refreshPartyBossShared();
    }
  }).catch(function(e){
    if(pendingRates[ref]&&pendingRates[ref].seq===seq){
      delete pendingRates[ref];
      notify("배율 저장 실패: "+(e.message||"연결 오류"));
      render();
    }
  });
  rateQueue[ref]=next;
  return next;
}
function formatRate(n){return Number(n).toFixed(2).replace(/\.00$/,"").replace(/(\.\d)0$/,"$1")+"%"}
function group(id){return state.groups.find(function(g){return g.id===id})}
function mark(){dirty=true;render()}
function defaultDifficulty(boss){return (DIFFS[boss]||[]).includes("하드")?"하드":(DIFFS[boss]||["노말"])[0]}
function loadAll(force){
  if(loading)return;
  if(dirty&&force){refreshPlan();return}
  loading=true;error="";
  if(!loaded)render();
  Promise.all([
    api("boss-board-api",{action:"bootstrap"}),
    api("boss-board-api",{action:"party_boss_state_get"}),
    api("boss-party-recruit",{action:"load"})
  ]).then(function(results){
    owners=Array.isArray(results[0].owners)?results[0].owners:[];
    plan=results[1].state||{};
    state=results[2].state||{groups:[],people:[]};
    revision=Number(results[2].revision)||0;
    normalize();buildPeople();loaded=true;dirty=false;lastFetch=Date.now();
  }).catch(function(e){error=e.message||"모집 정보를 불러오지 못했어요."}).finally(function(){loading=false;render()});
}
function refreshPlan(){
  if(loading)return;
  api("boss-board-api",{action:"party_boss_state_get"}).then(function(data){
    plan=data.state||{};buildPeople();lastFetch=Date.now();render();
  }).catch(function(){});
}
function save(){
  if(saving||!dirty)return;
  saving=true;render();
  api("boss-party-recruit",{action:"save",revision:revision,payload:state}).then(function(data){
    state=data.state;revision=Number(data.revision)||revision+1;
    normalize();buildPeople();dirty=false;lastFetch=Date.now();notify("모집판을 공용으로 저장했어요.");
  }).catch(function(e){error=e.message;notify("저장 실패: "+e.message)}).finally(function(){saving=false;render()});
}
function options(list,selected){
  return list.map(function(x){return '<option value="'+esc(x)+'"'+(x===selected?' selected':'')+'>'+esc(x)+'</option>'}).join("");
}
function badgeFor(status){
  if(status==="confirmed")return '<span class="recruit-status confirmed">모집 완료</span>';
  if(status==="closed")return '<span class="recruit-status closed">종료</span>';
  return '<span class="recruit-status active">모집 중</span>';
}
function groupHtml(g){
  var members=Array.isArray(g.members)?g.members:[];
  var bosses=Array.isArray(g.bosses)?g.bosses:[];
  var missing=Math.max(0,(Number(g.capacity)||3)-members.length);
  var open=openIds.has(g.id);
  var html='<details class="recruit-card" data-r-card="'+esc(g.id)+'"'+(open?' open':'')+'>';
  html+='<summary><span class="recruit-card-title">'+esc(g.name||"새 파티")+'</span><span class="recruit-card-sub">'+bosses.length+'보스 · '+members.length+'/'+g.capacity+'명';
  if(g.status==="recruiting")html+=' · '+(missing?missing+'명 모집':'인원 충족');
  html+='</span>'+badgeFor(g.status)+'</summary>';
  html+='<div class="recruit-details">';
  html+='<div class="recruit-fields">';
  html+='<label>파티 이름<input data-r-edit="name" data-r-id="'+esc(g.id)+'" value="'+esc(g.name||"")+'" maxlength="40" placeholder="파티 이름"></label>';
  html+='<label>정원<select data-r-edit="capacity" data-r-id="'+esc(g.id)+'">'+options(["2","3","4","5","6"],String(g.capacity||3))+'</select></label>';
  html+='<label>상태<select data-r-edit="status" data-r-id="'+esc(g.id)+'"><option value="recruiting"'+(g.status==="recruiting"?' selected':'')+'>모집 중</option><option value="confirmed"'+(g.status==="confirmed"?' selected':'')+'>모집 완료</option><option value="closed"'+(g.status==="closed"?' selected':'')+'>종료</option></select></label>';
  html+='<label>요일<input data-r-edit="day" data-r-id="'+esc(g.id)+'" value="'+esc(g.day||"")+'" maxlength="30" placeholder="예: 토요일"></label>';
  html+='<label>시간<input data-r-edit="time" data-r-id="'+esc(g.id)+'" value="'+esc(g.time||"")+'" maxlength="30" placeholder="예: 21:00"></label>';
  html+='</div>';
  html+='<div class="recruit-block"><div class="recruit-line"><strong>같이 갈 보스</strong><button type="button" class="recruit-small-btn" data-r-action="add-boss" data-r-id="'+esc(g.id)+'">+ 보스 추가</button></div>';
  bosses.forEach(function(b,i){
    html+='<div class="recruit-boss-row"><select aria-label="보스 선택" data-r-edit="boss" data-r-id="'+esc(g.id)+'" data-r-i="'+i+'">'+options(BOSSES,b.boss)+'</select>';
    html+='<select aria-label="난이도" data-r-edit="difficulty" data-r-id="'+esc(g.id)+'" data-r-i="'+i+'">'+options(DIFFS[b.boss]||["하드"],b.difficulty)+'</select>';
    html+='<label class="recruit-rate-limit"><input aria-label="모집 희망 배율" type="number" min="0" step="0.01" data-r-edit="minRate" data-r-id="'+esc(g.id)+'" data-r-i="'+i+'" value="'+esc(b.minRate)+'"><span>% 이상</span></label>';
    html+='<button type="button" class="recruit-icon-btn" aria-label="보스 삭제" data-r-action="remove-boss" data-r-id="'+esc(g.id)+'" data-r-i="'+i+'">×</button></div>';
  });
  html+='</div>';
  html+='<div class="recruit-block"><div class="recruit-line"><strong>파티원 '+members.length+'/'+g.capacity+'</strong><span class="recruit-muted">한 사람당 한 캐릭터</span></div>';
  html+='<div class="recruit-member-list">';
  members.forEach(function(key){
    var p=member(key);
    html+='<span class="recruit-member-chip"><b>'+esc(p.name)+'</b><small>'+esc(p.owner)+'</small><button type="button" aria-label="'+esc(p.name)+' 제외" data-r-action="remove-member" data-r-id="'+esc(g.id)+'" data-r-key="'+esc(key)+'">×</button></span>';
  });
  if(!members.length)html+='<span class="recruit-muted">아직 확정된 파티원이 없어요.</span>';
  html+='</div><div class="recruit-join-row"><select aria-label="파티원 선택" data-r-member-select="'+esc(g.id)+'"><option value="">등록된 캐릭터 선택</option>';
  people.forEach(function(p){if(members.indexOf(p.key)<0)html+='<option value="'+esc(p.key)+'">'+esc(p.name)+' · '+esc(p.owner)+'</option>'});
  html+='</select><button type="button" class="recruit-small-btn" data-r-action="add-member" data-r-id="'+esc(g.id)+'">추가</button></div>';
  html+='<div class="recruit-join-row"><input aria-label="외부 파티원 닉네임" data-r-manual-name="'+esc(g.id)+'" maxlength="30" placeholder="외부 파티원 닉네임"><button type="button" class="recruit-small-btn" data-r-action="add-manual" data-r-id="'+esc(g.id)+'">외부인 추가</button></div>';
  html+='</div>';
  if(members.length&&bosses.length){
    html+='<div class="recruit-block"><div class="recruit-line"><strong>캐릭터별 배율</strong><span class="recruit-muted">공용 배율 · 수정 즉시 저장</span></div>';
    html+='<div class="recruit-matrix-scroll"><table class="recruit-matrix"><thead><tr><th>캐릭터</th>';
    bosses.forEach(function(b){html+='<th>'+esc(b.difficulty)+' '+esc(b.boss)+'</th>'});
    html+='</tr></thead><tbody>';
    members.forEach(function(key){
      var p=member(key);
      html+='<tr><th>'+esc(p.name)+'</th>';
      bosses.forEach(function(b){
        var v=rateFor(b.boss,key);
        html+='<td><div class="recruit-rate-cell"><input type="number" min="0" max="100000" step="0.01" inputmode="decimal" aria-label="'+esc(p.name)+' '+esc(b.boss)+' 배율" data-r-edit="rate" data-r-id="'+esc(g.id)+'" data-r-boss="'+esc(b.boss)+'" data-r-key="'+esc(key)+'" value="'+(v.value?esc(v.value):"")+'" placeholder="미입력"><span>% · '+(v.value?esc(v.source):"미입력")+'</span></div></td>';
      });
      html+='</tr>';
    });
    html+='</tbody></table></div><p class="recruit-muted">배율은 보스별 개인 기록입니다. 파티 배율과 동일한 값으로 계산하지 않습니다.</p></div>';
  }
  html+='<div class="recruit-block"><label class="recruit-note">메모<input data-r-edit="note" data-r-id="'+esc(g.id)+'" value="'+esc(g.note||"")+'" maxlength="240" placeholder="연습/클리어 등"></label></div>';
  html+='<div class="recruit-actions"><button type="button" class="recruit-primary" data-r-action="copy" data-r-id="'+esc(g.id)+'">모집글 복사</button><button type="button" class="recruit-delete" data-r-action="delete-group" data-r-id="'+esc(g.id)+'">파티 삭제</button></div>';
  html+='</div></details>';
  return html;
}
function render(){
  var panel=document.getElementById("routePanel");if(!panel)return;
  if(!loaded){
    panel.innerHTML='<div class="recruit-loading">'+(loading?"모집 정보를 불러오는 중…":error||"모집판을 준비하고 있어요.")+'</div>';
    return;
  }
  var shown=state.groups.filter(function(g){return filter==="all"||(filter==="recruiting"?g.status==="recruiting":g.status!=="recruiting")});
  var active=state.groups.filter(function(g){return g.status==="recruiting"}).length;
  var html='<div class="recruit-shell"><div class="recruit-heading"><div><strong>파티보스 모집</strong><p>같은 멤버로 여러 보스 · 계획 배율 자동 연결</p></div><button class="recruit-primary" type="button" data-r-action="add-group">+ 파티 추가</button></div>';
  html+='<div class="recruit-toolbar"><div class="recruit-filters">';
  [["recruiting","모집 중"],["all","전체"],["finished","완료·종료"]].forEach(function(f){
    html+='<button type="button" data-r-action="filter" data-r-filter="'+f[0]+'" class="'+(filter===f[0]?"selected":"")+'">'+f[1]+'</button>';
  });
  html+='</div><span class="recruit-muted">모집 중 '+active+'팀</span></div>';
  if(shown.length){shown.forEach(function(g){html+=groupHtml(g)})}
  else html+='<div class="recruit-empty">표시할 파티가 없어요. <b>+ 파티 추가</b>로 시작해 보세요.</div>';
  html+='<div class="recruit-footer"><div><strong>'+(dirty?"저장하지 않은 변경사항":saving?"저장 중…":"공용 저장됨")+'</strong><span>모집 정보는 저장 버튼 · 배율은 수정 즉시 파티보스 계획에 공유</span></div>';
  html+='<button type="button" class="recruit-small-btn" data-r-action="reload"'+(dirty||saving?' disabled':'')+'>새로고침</button>';
  html+='<button type="button" class="recruit-primary" data-r-action="save"'+(!dirty||saving?' disabled':'')+'>'+(saving?"저장 중…":"저장")+'</button></div>';
  if(error)html+='<p class="recruit-error">'+esc(error)+'</p>';
  html+='</div>';panel.innerHTML=html;
}
function copyGroup(g){
  var lines=["["+g.name+"] 파티원 모집"];
  g.bosses.forEach(function(b){lines.push("• "+b.difficulty+" "+b.boss+" · 희망 개인 배율 "+formatRate(b.minRate||0)+" 이상")});
  lines.push("인원 "+g.members.length+"/"+g.capacity+"명 · "+Math.max(0,g.capacity-g.members.length)+"명 모집");
  if(g.day||g.time)lines.push("일정 "+[g.day,g.time].filter(Boolean).join(" "));
  if(g.members.length){
    lines.push("현재 멤버");
    g.members.forEach(function(k){var p=member(k);lines.push(" - "+p.name+" ("+g.bosses.map(function(b){var v=rateFor(b.boss,k).value;return b.boss+" "+(v?formatRate(v):"미입력")}).join(", ")+")")});
  }
  if(g.note)lines.push(g.note);
  var text=lines.join("\n");
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){notify("모집글을 복사했어요.")}).catch(function(){window.prompt("모집글 복사",text)})}
  else window.prompt("모집글 복사",text);
}
function addToGroup(g,key){
  if(g.members.indexOf(key)>=0)return;
  if(g.members.length>=g.capacity){notify("파티 정원이 찼어요.");return}
  var next=member(key);
  if(g.members.some(function(k){return member(k).ownerKey===next.ownerKey})){notify("한 파티에 같은 주인 캐릭터는 1명만 추가할 수 있어요.");return}
  g.members.push(key);mark();
}
function click(e){
  var button=e.target.closest("[data-r-action]");if(!button)return;
  var action=button.dataset.rAction,groupId=button.dataset.rId,g=groupId&&group(groupId);
  if(action==="filter"){filter=button.dataset.rFilter;render();return}
  if(action==="add-group"){
    var newGroup={id:id(),name:"새 모집 파티",capacity:3,day:"",time:"",note:"",status:"recruiting",members:[],bosses:[{boss:"림보",difficulty:"하드",minRate:130}]};
    state.groups.unshift(newGroup);openIds.add(newGroup.id);filter="all";mark();return;
  }
  if(action==="save"){save();return}
  if(action==="reload"){loadAll(true);return}
  if(!g)return;
  openIds.add(groupId);
  if(action==="add-boss"){
    var next=BOSSES.find(function(b){return !g.bosses.some(function(x){return x.boss===b})});
    if(!next){notify("추가할 보스가 없어요.");return}
    g.bosses.push({boss:next,difficulty:defaultDifficulty(next),minRate:130});mark();return;
  }
  if(action==="remove-boss"){
    if(g.bosses.length<=1){notify("보스는 최소 1개 필요해요.");return}
    g.bosses.splice(Number(button.dataset.rI),1);mark();return;
  }
  if(action==="add-member"){
    var select=panel().querySelector('[data-r-member-select="'+groupId+'"]');
    if(select&&select.value)addToGroup(g,select.value);return;
  }
  if(action==="add-manual"){
    var input=panel().querySelector('[data-r-manual-name="'+groupId+'"]');
    var name=input&&input.value.trim();
    if(!name){notify("닉네임을 입력해 주세요.");return}
    if(g.members.length>=g.capacity){notify("파티 정원이 찼어요.");return}
    var person={id:"manual-"+id(),name:name.slice(0,30),owner:"외부"};
    state.people.push(person);buildPeople();g.members.push("manual|"+person.id);mark();return;
  }
  if(action==="remove-member"){g.members=g.members.filter(function(k){return k!==button.dataset.rKey});mark();return}
  if(action==="delete-group"){
    if(!window.confirm(g.name+" 파티를 삭제할까요?"))return;
    state.groups=state.groups.filter(function(item){return item.id!==g.id});openIds.delete(g.id);mark();return;
  }
  if(action==="copy"){copyGroup(g);return}
}
function panel(){return document.getElementById("routePanel")}
function change(e){
  var target=e.target,field=target.dataset.rEdit;
  if(!field)return;
  var g=group(target.dataset.rId);if(!g)return;
  openIds.add(g.id);
  var value=target.value;
  if(["name","day","time","note","status"].includes(field)){
    g[field]=value;
  }else if(field==="capacity"){
    var capacity=Number(value)||3;
    if(g.members.length>capacity){notify("현재 파티원보다 적은 정원은 설정할 수 없어요.");render();return}
    g.capacity=capacity;
  }else if(["boss","difficulty","minRate"].includes(field)){
    var i=Number(target.dataset.rI),b=g.bosses[i];if(!b)return;
    if(field==="boss"){
      if(g.bosses.some(function(x,j){return i!==j&&x.boss===value})){notify("같은 보스를 두 번 추가할 수 없어요.");render();return}
      b.boss=value;b.difficulty=defaultDifficulty(value);
    }else if(field==="difficulty"){b.difficulty=value}
    else b.minRate=Math.max(0,Number(value)||0);
  }else if(field==="rate"){
    var boss=target.dataset.rBoss,key=target.dataset.rKey,v=Number(value);
    if(value.trim()!==""&&(!Number.isFinite(v)||v<0||v>100000)){
      notify("배율은 0~100000 사이로 입력해 주세요.");render();return;
    }
    setSharedRate(boss,key,value.trim()===""?0:v);
    render();
    return;
  }
  mark();
}
function trackDetails(e){
  var d=e.target;if(!d.matches||!d.matches("details[data-r-card]"))return;
  var k=d.dataset.rCard;
  if(d.open)openIds.add(k);else openIds.delete(k);
}
var wired=false;
function wire(){
  if(wired)return;
  var el=panel();if(!el)return;
  wired=true;
  el.addEventListener("click",click);
  el.addEventListener("change",change);
  el.addEventListener("toggle",trackDetails,true);
}
window.renderPartyRecruitPage=function(){
  wire();
  if(!loaded&&!loading){loadAll(false);return}
  if(loaded&&!dirty&&Date.now()-lastFetch>30000&&!loading){loadAll(true);return}
  if(loaded&&!panel().querySelector(".recruit-shell"))render();
};
document.addEventListener("click",function(e){
  var btn=e.target.closest&&e.target.closest('[data-page-view="route"]');
  if(btn&&loaded&&!dirty)loadAll(true);
},true);
})();