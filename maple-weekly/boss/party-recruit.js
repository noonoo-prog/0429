(function(){
"use strict";
var ROOT="https://ibqpjcedzcllacbamrnu.supabase.co/functions/v1/";
var KEY="sb_publishable_s-EiUNh66D17Xd3JFGUyvA_aNEDNMKq";
var BOSSES=["스우","세렌","칼로스","대적자","카링","흉성","벨로나","림보","발드릭스","유피테르","검은 마법사"];
var DIFFICULTY_RATES={};
function activeDifficulties(boss){if(boss==="스우")return ["익스트림"];return (DIFFS[boss]||[]).slice()}
function bossOptions(current){var list=BOSSES.slice();if(current&&list.indexOf(current)<0)list.push(current);return list}
var DIFFS={"스우":["노말","하드","익스트림"],"데미안":["노말","하드"],"가엔슬":["노말","카오스"],"루시드":["이지","노말","하드"],"윌":["이지","노말","하드"],"더스크":["노말","카오스"],"진힐라":["노말","하드"],"듄켈":["노말","하드"],"세렌":["노말","하드","익스트림","데스티니","챔피언"],"칼로스":["이지","노말","카오스","익스트림","데스티니","챔피언"],"대적자":["이지","노말","하드","익스트림","데스티니"],"카링":["이지","노말","하드","익스트림","데스티니"],"흉성":["노말","하드"],"벨로나":["이지","노말","하드"],"림보":["노말","하드","익스트림","데스티니"],"발드릭스":["노말","하드","익스트림","데스티니"],"유피테르":["노말","하드"],"검은 마법사":["하드","익스트림","챔피언"]};
var state={groups:[],people:[]},plan={},owners=[],people=[],revision=0;
var loaded=false,loading=false,dirty=false,saving=false,lastFetch=0,filter="all",error="";
var openIds=new Set();
var planDraft=null;
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
  var allGuests=(Array.isArray(plan.guests)?plan.guests:[]).slice();
  (Array.isArray(plan.savedSlots)?plan.savedSlots:[]).forEach(function(slot){if(slot&&Array.isArray(slot.guests))allGuests=allGuests.concat(slot.guests)});
  allGuests.forEach(function(g){
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
function rateFor(boss,difficulty,key){
  var byBoss=DIFFICULTY_RATES[boss]&&DIFFICULTY_RATES[boss][difficulty];
  if(byBoss&&Object.prototype.hasOwnProperty.call(byBoss,key))return {value:Number(byBoss[key])||0,source:"저장값"};
  return {value:0,source:"미입력"};
}
function formatRate(n){return Number(n).toFixed(2).replace(/\.00$/,"").replace(/(\.\d)0$/,"$1")+"%"}
function group(id){return state.groups.find(function(g){return g.id===id})}
function mark(){dirty=true;render()}
function defaultDifficulty(boss){var choices=activeDifficulties(boss);return choices.includes("하드")?"하드":(choices[0]||"노말")}
function loadAll(force){
  if(loading)return;
  if(dirty&&force){refreshPlan();return}
  loading=true;error="";
  if(!loaded)render();
  Promise.all([
    api("boss-board-api",{action:"bootstrap"}),
    api("boss-board-api",{action:"party_boss_state_get"}),
    api("boss-party-recruit",{action:"load"}),
    api("boss-party-recruit",{action:"rate_get"})
  ]).then(function(results){
    owners=Array.isArray(results[0].owners)?results[0].owners:[];
    plan=results[1].state||{};
    state=results[2].state||{groups:[],people:[]};
    DIFFICULTY_RATES=results[3].rates||{};
    revision=Number(results[2].revision)||0;
    normalize();buildPeople();loaded=true;dirty=false;lastFetch=Date.now();
  }).catch(function(e){error=e.message||"모집 정보를 불러오지 못했어요."}).finally(function(){loading=false;render()});
}
function refreshPlan(){
  if(loading)return;
  Promise.all([api("boss-board-api",{action:"party_boss_state_get"}),api("boss-party-recruit",{action:"rate_get"})]).then(function(data){
    plan=data[0].state||{};DIFFICULTY_RATES=data[1].rates||{};buildPeople();lastFetch=Date.now();render();
  }).catch(function(){});
}
function save(){
  if(saving||!dirty)return;
  saving=true;render();
  api("boss-party-recruit",{action:"save",revision:revision,payload:state}).then(function(data){
    state=data.state;revision=Number(data.revision)||revision+1;
    normalize();buildPeople();dirty=false;lastFetch=Date.now();notify("직접 편성을 공용으로 저장했어요.");
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
  html+='<summary><span class="recruit-card-title">'+esc(g.name||"새 파티")+'</span><span class="recruit-card-sub">'+bosses.map(function(b){return esc(b.difficulty+' '+b.boss)}).join(' · ')+' · '+members.length+'/'+g.capacity+'명';
  if(g.status==="recruiting")html+=' · '+(missing?missing+'명 모집':'인원 충족');
  html+='</span>'+badgeFor(g.status);
  html+='<button type="button" class="recruit-card-delete" data-r-action="delete-group" data-r-id="'+esc(g.id)+'" aria-label="'+esc(g.name||"파티")+' 삭제" title="모집 목록에서 삭제">삭제</button></summary>';
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
    html+='<div class="recruit-boss-row"><select aria-label="보스 선택" data-r-edit="boss" data-r-id="'+esc(g.id)+'" data-r-i="'+i+'">'+options(bossOptions(b.boss),b.boss)+'</select>';
    var choices=activeDifficulties(b.boss);if(choices.indexOf(b.difficulty)<0)choices.push(b.difficulty);
    html+='<select aria-label="난이도" data-r-edit="difficulty" data-difficulty="'+esc(b.difficulty)+'" data-r-id="'+esc(g.id)+'" data-r-i="'+i+'">'+options(choices,b.difficulty)+'</select>';
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
    html+='<div class="recruit-block"><div class="recruit-line"><strong>캐릭터별 배율</strong><a href="#rates" class="recruit-rate-link">배율 관리에서 수정·수동 저장</a></div>';
    html+='<div class="recruit-matrix-scroll"><table class="recruit-matrix"><thead><tr><th>캐릭터</th>';
    bosses.forEach(function(b){html+='<th>'+esc(b.difficulty)+' '+esc(b.boss)+'</th>'});
    html+='</tr></thead><tbody>';
    members.forEach(function(key){
      var p=member(key);
      html+='<tr><th>'+esc(p.name)+'</th>';
      bosses.forEach(function(b){
        var v=rateFor(b.boss,b.difficulty,key);
        html+='<td><div class="recruit-rate-cell"><input type="number" min="0" max="100000" step="0.01" readonly inputmode="decimal" aria-label="'+esc(p.name)+' '+esc(b.boss)+' 배율 (읽기 전용)" title="배율 관리에서 수정 후 직접 저장" value="'+(v.value?esc(v.value):"")+'" placeholder="미입력"><span>% · '+esc(v.source)+'</span></div></td>';
      });
      html+='</tr>';
    });
    html+='</tbody></table></div><p class="recruit-muted">배율은 보스별 개인 기록입니다. 파티 배율과 동일한 값으로 계산하지 않습니다.</p></div>';
  }
  html+='<div class="recruit-block"><label class="recruit-note">메모<input data-r-edit="note" data-r-id="'+esc(g.id)+'" value="'+esc(g.note||"")+'" maxlength="240" placeholder="연습/클리어 등"></label></div>';
  html+='<div class="recruit-actions"><button type="button" class="recruit-primary" data-r-action="copy" data-r-id="'+esc(g.id)+'">편성 공유</button><button type="button" class="recruit-delete" data-r-action="delete-group" data-r-id="'+esc(g.id)+'">파티 삭제</button></div>';
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
  var html='<div class="recruit-shell"><div class="recruit-heading"><div><strong>직접 편성</strong><p>보스와 난이도를 고르고 캐릭터 배율을 보며 파티원을 직접 배치하세요.</p></div><button class="recruit-primary" type="button" data-r-action="add-group">+ 파티 편성</button></div>';
  html+='<div class="recruit-toolbar"><div class="recruit-filters">';
  [["all","전체 "+state.groups.length],["recruiting","모집 중 "+active],["finished","완료·종료 "+(state.groups.length-active)]].forEach(function(f){
    html+='<button type="button" data-r-action="filter" data-r-filter="'+f[0]+'" class="'+(filter===f[0]?"selected":"")+'">'+f[1]+'</button>';
  });
  html+='</div><span class="recruit-muted">저장된 파티 '+state.groups.length+'팀</span></div>';
  if(shown.length){
    var regular=shown.filter(function(g){return !/^grp-hist-/.test(g.id)});
    if(regular.length){
      html+='<div class="recruit-collection-title"><strong>모집판에 저장한 파티</strong><span>'+regular.length+'팀</span></div>';
      regular.forEach(function(g){html+=groupHtml(g)});
    }
    var archiveGroups={};
    shown.filter(function(g){return /^grp-hist-/.test(g.id)}).forEach(function(g){
      var label=String(g.name||"").split(" · ")[0]||"파티 계획 저장본";
      if(!archiveGroups[label])archiveGroups[label]=[];
      archiveGroups[label].push(g);
    });
    Object.keys(archiveGroups).forEach(function(label){
      var list=archiveGroups[label];
      html+='<section class="recruit-history-group"><div class="recruit-collection-title"><strong>'+esc(label)+'</strong><span>파티 계획 저장본 · '+list.length+'팀</span></div>';
      list.forEach(function(g){html+=groupHtml(g)});
      html+='</section>';
    });
  }else html+='<div class="recruit-empty">표시할 파티가 없어요. 전체 보기에서 다른 파티를 확인해 주세요.</div>';
  html+='<div class="recruit-footer"><div><strong>'+(dirty?"미저장 변경사항":saving?"저장 중…":"저장된 상태")+'</strong><span>모집 변경은 아래 저장 버튼 · 배율 변경은 배율 관리에서 수동 저장</span></div>';
  html+='<button type="button" class="recruit-small-btn" data-r-action="reload"'+(dirty||saving?' disabled':'')+'>새로고침</button>';
  html+='<button type="button" class="recruit-primary" data-r-action="save"'+(!dirty||saving?' disabled':'')+'>'+(saving?"저장 중…":"저장")+'</button></div>';
  if(error)html+='<p class="recruit-error">'+esc(error)+'</p>';
  html+='</div>';panel.innerHTML=html;
  if(planDraft)renderPlanDraft();
}
function renderPlanDraft(){
  var old=document.getElementById('planRecruitDialog');if(old)return;
  var draft=planDraft,room=Math.max(0,6-draft.members.length);
  var dialog=document.createElement('dialog');dialog.id='planRecruitDialog';dialog.className='plan-recruit-dialog';
  dialog.innerHTML='<form method="dialog"><h2>모집글 만들기</h2><p>'+esc(draft.difficulty+' '+draft.boss+' · '+draft.partyId+'파티')+'</p><div class="plan-recruit-members">'+draft.members.map(function(m){return '<span>'+esc(m.name)+'</span>'}).join('')+'</div><label>시간<input name="schedule" required maxlength="30" placeholder="예: 목요일 21:00" autocomplete="off"></label><label>추가 모집 인원<input name="count" type="number" min="0" max="'+room+'" step="1" value="'+(room?1:0)+'" required></label><small>현재 '+draft.members.length+'명 · 최대 '+room+'명 추가 가능</small><p>멤버·보스·난이도를 가져옵니다. 만든 뒤 저장을 눌러 공용 반영하세요.</p><div class="plan-recruit-actions"><button type="button" data-draft-cancel>취소</button><button type="submit">모집글 만들기</button></div></form>';
  document.body.appendChild(dialog);
  function close(){planDraft=null;dialog.close();dialog.remove()}
  dialog.addEventListener('cancel',function(e){e.preventDefault();close()});
  dialog.querySelector('[data-draft-cancel]').onclick=close;
  dialog.querySelector('form').onsubmit=function(e){
    e.preventDefault();if(saving||loading){notify('불러오기 또는 저장이 끝난 뒤 다시 시도해 주세요.');return}
    var schedule=dialog.querySelector('[name="schedule"]').value.trim();
    var count=Number(dialog.querySelector('[name="count"]').value);
    if(!schedule||!Number.isInteger(count)||count<0||count>room)return;
    var keys=draft.members.map(function(m){
      if(people.some(function(p){return p.key===m.key}))return m.key;
      var person={id:'manual-'+id(),name:m.name,owner:m.owner||'외부'};
      state.people.push(person);return 'manual|'+person.id;
    });
    var g={id:id(),name:draft.boss+' '+draft.partyId+'파티',capacity:keys.length+count,day:'',time:schedule,note:'',status:count?'recruiting':'confirmed',members:keys,bosses:[{boss:draft.boss,difficulty:draft.difficulty,minRate:0}]};
    state.groups.unshift(g);buildPeople();openIds.add(g.id);filter='all';close();mark();notify('모집글을 만들었어요. 저장을 눌러 공용 반영하세요.');
  };
  dialog.showModal();
}
window.createRecruitFromPlan=function(draft){
  if(saving){notify('모집판 저장이 끝난 뒤 다시 시도해 주세요.');return}
  planDraft=JSON.parse(JSON.stringify(draft));
  location.hash='recruit';
  wire();
  if(!loaded){if(!loading)loadAll(false)}else renderPlanDraft();
};
function copyGroup(g){
  var lines=["["+g.name+"] 파티원 모집"];
  g.bosses.forEach(function(b){lines.push("• "+b.difficulty+" "+b.boss+" · 희망 개인 배율 "+formatRate(b.minRate||0)+" 이상")});
  lines.push("인원 "+g.members.length+"/"+g.capacity+"명 · "+Math.max(0,g.capacity-g.members.length)+"명 모집");
  if(g.day||g.time)lines.push("일정 "+[g.day,g.time].filter(Boolean).join(" "));
  if(g.members.length){
    lines.push("현재 멤버");
    g.members.forEach(function(k){var p=member(k);lines.push(" - "+p.name+" ("+g.bosses.map(function(b){var v=rateFor(b.boss,b.difficulty,k).value;return b.difficulty+" "+b.boss+" "+(v?formatRate(v):"미입력")}).join(", ")+")")});
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
  if(action==="delete-group"){e.preventDefault();e.stopPropagation()}
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
    if(saving){notify("저장 중에는 파티를 삭제할 수 없어요.");return}
    if(!window.confirm("["+g.name+"] 모집 파티를 삭제할까요?\n파티를 삭제하고 아래 ‘저장’을 눌러야 공용 DB에 반영됩니다.\n캐릭터 배율과 파티 계획은 그대로 유지됩니다."))return;
    state.groups=state.groups.filter(function(item){return item.id!==g.id});
    openIds.delete(g.id);
    mark(); // Explicit manual save persists deletion. Nothing is written automatically.
    notify("삭제 내용을 적용했어요. 아래 ‘저장’을 눌러 확정하세요.");
    return;
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
window.refreshPartyRecruitRates=function(){
  if(!loaded||loading)return;
  if(dirty)refreshPlan();
  else loadAll(true);
};
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