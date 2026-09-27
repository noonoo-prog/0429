(function app() {
"use strict";
const OWNERS=["옥수수목금","콩국수목금"];
const OWNER_META={"옥수수목금":{color:"#efbc32",short:"옥"},"콩국수목금":{color:"#fb5b9d",short:"콩"}};
const DAYS=["목","금","토","일","월","화","수"];
const BOSSES=[
 ["스우",[["노말",835],["하드",4890],["익스트림",54500]]],
 ["데미안",[["노말",875],["하드",4640]]],
 ["가디언 엔젤 슬라임",[["노말",1270],["카오스",7130]]],
 ["루시드",[["이지",1490],["노말",1780],["하드",5970]]],
 ["윌",[["이지",1610],["노말",2050],["하드",7320]]],
 ["더스크",[["노말",2200],["카오스",6630]]],
 ["진 힐라",[["노말",6760],["하드",10000]]],
 ["듄켈",[["노말",2370],["하드",8960]]],
 ["선택받은 세렌",[["노말",16700],["하드",30200],["익스트림",184000]]],
 ["감시자 칼로스",[["이지",23800],["노말",47900],["카오스",123000],["익스트림",414000]]],
 ["최초의 대적자",[["이지",26100],["노말",53200],["하드",139000],["익스트림",471200]]],
 ["카링",[["이지",32000],["노말",59300],["하드",156000],["익스트림",538700]]],
 ["찬란한 흉성",[["노말",57600],["하드",267800]]],
 ["벨로나",[["이지",39600],["노말",82400],["하드",295000]]],
 ["림보",[["노말",99500],["하드",238500]]],
 ["발드릭스",[["노말",132000],["하드",307800]]],
 ["유피테르",[["노말",156000],["하드",484500]]],
 ["파풀라투스",[["카오스",665]]]
];
const BLACK=["검은 마법사",[["하드",46500],["익스트림",568000]]];
const BASE=Date.UTC(2026,8,24),DAY=86400000,WEEK=7*DAY;
const PREFIX="boss-shorts-v2-",KEY_PROFILES=PREFIX+"profiles",KEY_PREFS=PREFIX+"preferences",KEY_THEME=PREFIX+"theme";
const $=id=>document.getElementById(id);
const S={profiles:null,week:BASE,day:0,owner:OWNERS[0],charId:"",view:"all",weeks:{},month:{},prefs:{},theme:"dark",follow:true};
const memoryCache={};
function load(key,fallback){try{const str=localStorage.getItem(key);return str?JSON.parse(str):fallback}catch{return fallback}}
function save(key,v){try{localStorage.setItem(key,JSON.stringify(v));return true}catch{notify("저장에 실패했어요. 시크릿 모드가 아닌 브라우저에서 열어 주세요.");return false}}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]))}
function pad(n){return String(n).padStart(2,"0")}
function iso(ms){const d=new Date(ms);return d.getUTCFullYear()+"-"+pad(d.getUTCMonth()+1)+"-"+pad(d.getUTCDate())}
function weekKey(){return iso(S.week)}
function dayKey(){return iso(S.week+S.day*DAY)}
function monthKey(){return dayKey().slice(0,7)}
function currentWeek(){const k=new Date(Date.now()+9*3600000),utc=Date.UTC(k.getUTCFullYear(),k.getUTCMonth(),k.getUTCDate());return BASE+Math.max(0,Math.floor((utc-BASE)/WEEK))*WEEK}
function format(n){n=Math.floor(Number(n)||0);const neg=n<0;n=Math.abs(n);if(!n)return"0 메소";const e=Math.floor(n/1e8),m=Math.floor(n%1e8/1e4),rest=n%1e4;const bits=[];if(e)bits.push(e.toLocaleString("ko-KR")+"억");if(m)bits.push(m.toLocaleString("ko-KR")+"만");if(rest)bits.push(rest.toLocaleString("ko-KR"));return (neg?"−":"")+bits.join(" ")+" 메소"}
function compact(n){return format(n).replace(" 메소","")}
function amountFromInput(raw){const s=String(raw||"").trim().replace(/[\s,]/g,"").replace(/메소/g,"");if(!s)return 0;if(/^\d+(?:\.\d+)?$/.test(s))return Math.floor(Number(s));const m=s.match(/^(?:(\d+(?:\.\d+)?)억)?(?:(\d+(?:\.\d+)?)만)?(?:(\d+))?$/);if(!m||!m[0])return null;const n=(Number(m[1]||0)*1e8)+(Number(m[2]||0)*1e4)+Number(m[3]||0);return Number.isFinite(n)&&n>=0?Math.floor(n):null}
function emptyRecords(){return{bosses:{},expenses:{}}}
function startingProfiles(){return{characters:[{id:"corn-1",owner:OWNERS[0],name:"옥수수 1"},{id:"bean-1",owner:OWNERS[1],name:"콩국수 1"}],selected:"corn-1"}}
function allChars(){return S.profiles.characters}
function ownerChars(owner){return allChars().filter(c=>c.owner===owner)}
function selectedChar(){return allChars().find(c=>c.id===S.charId)||allChars()[0]}
function selectChar(id){const c=allChars().find(x=>x.id===id);if(!c)return;S.charId=id;S.owner=c.owner;S.profiles.selected=id;if(S.view.startsWith("char:"))S.view="char:"+id;save(KEY_PROFILES,S.profiles);render()}
function loadProfiles(){
  const p=load(KEY_PROFILES,null);S.profiles=p&&Array.isArray(p.characters)?p:startingProfiles();
  if(!Array.isArray(S.profiles.deletedCharacters))S.profiles.deletedCharacters=[];
  OWNERS.forEach(owner=>{if(!S.profiles.characters.some(c=>c.owner===owner)){const n=owner===OWNERS[0]?0:1;S.profiles.characters.push({id:owner===OWNERS[0]?"corn-1":"bean-1",owner,name:owner==="옥수수목금"?"옥수수 1":"콩국수 1"})}});
  const c=allChars().find(x=>x.id===S.profiles.selected)||allChars()[0];S.charId=c.id;S.owner=c.owner;
}
function keyWeek(){return PREFIX+"week-"+weekKey()}
function keyMonth(k){return PREFIX+"month-"+k}
function normalWeek(obj){if(!obj||typeof obj!=="object")obj={};if(!obj.byId||typeof obj.byId!=="object")obj.byId={};if(!obj.ownerExpenses||typeof obj.ownerExpenses!=="object")obj.ownerExpenses={};return obj}
function records(charId){if(!S.weeks.byId[charId])S.weeks.byId[charId]=emptyRecords();const r=S.weeks.byId[charId];if(!r.bosses)r.bosses={};if(!r.expenses)r.expenses={};return r}
function loadWeek(){
  let s=load(keyWeek(),null);
  if(!s){
    s={byId:{}};
    const old=load("corn-soy-shorts-week-v1-"+weekKey(),null);
    if(old&&old.chars){
      OWNERS.forEach((owner,idx)=>{const id=idx===0?"corn-1":"bean-1",r=old.chars[owner];if(r&&typeof r==="object"){s.byId[id]=emptyRecords();s.byId[id].bosses=r}});
    }
    save(keyWeek(),s);
  }
  S.weeks=normalWeek(s);
}
function loadMonth(){
  let s=load(keyMonth(monthKey()),null);
  if(!s){
    s={byId:{}};
    const old=load("corn-soy-shorts-month-v1-"+monthKey(),null);
    if(old){OWNERS.forEach((owner,i)=>{const id=i===0?"corn-1":"bean-1";if(old[owner])s.byId[id]=old[owner]})}
    save(keyMonth(monthKey()),s);
  }
  if(!s.byId)s.byId={};
  S.month=s;
}
function monthlyForDay(day){
  if(day.slice(0,7)===monthKey())return S.month.byId;
  const s=load(keyMonth(day.slice(0,7)),null);
  if(s&&s.byId)return s.byId;
  const old=load("corn-soy-shorts-month-v1-"+day.slice(0,7),null)||{};
  const result={};OWNERS.forEach((owner,i)=>{if(old[owner])result[i===0?"corn-1":"bean-1"]=old[owner]});
  return result;
}
function saveWeek(){save(keyWeek(),S.weeks)}
function saveMonth(){save(keyMonth(monthKey()),S.month)}
function active(){return records(S.charId)}
function defaultDiff(b){return b[1].some(x=>x[0]==="노말")?"노말":b[1][0][0]}
function pref(b){const old=S.prefs[S.charId+"|"+b[0]];if(old)return old;const legacy=load("corn-soy-shorts-difficulty-v1",{})[S.owner+"|"+b[0]];return legacy||{diff:defaultDiff(b),party:1}}
function setPref(b,diff,party){S.prefs[S.charId+"|"+b[0]]={diff,party:Number(party)||1};save(KEY_PREFS,S.prefs)}
function price(b,diff){const row=b[1].find(x=>x[0]===diff);return Number((row||b[1][0])[1])*10000}
function earned(b,diff,party){return Math.floor(price(b,diff)/Math.max(1,Number(party)||1))}
function counted(){return Object.keys(active().bosses).length}
function isInScope(c,scope){return scope==="all"||scope===c.owner||scope==="char:"+c.id}
function dayItems(date,scope){
  const arr=[],m=monthlyForDay(date);
  allChars().forEach(c=>{
    if(!isInScope(c,scope))return;
    BOSSES.forEach(b=>{
      const rec=records(c.id).bosses[b[0]];
      if(rec&&(rec.day||rec.date)===date)arr.push({c,name:b[0],diff:rec.diff,party:rec.party,monthly:false,amount:savedAmount(b,rec)});
    });
    const black=m[c.id];
    if(black&&(black.day||black.date)===date)arr.push({c,name:BLACK[0],diff:black.diff,party:black.party,monthly:true,amount:savedAmount(BLACK,black)});
  });
  return arr.sort((a,b)=>b.amount-a.amount);
}
function dayIncome(date,scope){return dayItems(date,scope).reduce((a,x)=>a+x.amount,0)}
function weekIncome(scope){let v=0;allChars().forEach(c=>{if(!isInScope(c,scope))return;BOSSES.forEach(b=>{const r=records(c.id).bosses[b[0]];if(r)v+=savedAmount(b,r)})});return v}
function ownerExtraExpense(owner,date){
  return Math.max(0,Number(S.weeks.ownerExpenses?.[owner]?.[date]?.amount||0));
}
function dayExpense(date,scope){
  let v=0;
  allChars().forEach(c=>{if(isInScope(c,scope))v+=Number(records(c.id).expenses[date]?.amount||0)});
  OWNERS.forEach(owner=>{if(scope==="all"||scope===owner)v+=ownerExtraExpense(owner,date)});
  return v;
}
function weekExpense(scope){let v=0;for(let i=0;i<7;i++)v+=dayExpense(iso(S.week+i*DAY),scope);return v}
function monthIncome(scope){let v=0;allChars().forEach(c=>{if(isInScope(c,scope)){const r=S.month.byId[c.id];if(r)v+=savedAmount(BLACK,r)}});return v}
function notify(msg){const n=$("status");if(!n)return;n.textContent=msg;clearTimeout(notify.t);notify.t=setTimeout(()=>{n.textContent=""},3500)}
function renderOwners(){
  $("ownerTabs").innerHTML=OWNERS.map(owner=>`<button type="button" class="owner-tab ${S.owner===owner?"active":""}" data-owner="${owner}"><span class="owner-dot"></span><span>${owner}</span><small>${ownerChars(owner).length}캐릭터</small></button>`).join("");
}
function renderCharacters(){
  $("characterList").innerHTML=ownerChars(S.owner).map(c=>`<span class="character-entry"><button type="button" class="character-chip ${c.id===S.charId?"active":""}" data-char-id="${esc(c.id)}">${esc(c.name)}</button><button type="button" class="character-remove" data-archive-id="${esc(c.id)}" title="쇼츠 목록에서 제거" aria-label="${esc(c.name)} 캐릭터 삭제" ${ownerChars(c.owner).length<=1?"disabled":""}>×</button></span>`).join("");
  const c=selectedChar();$("activeCharTitle").textContent=c.name;
  $("renameCharInput").value=c.name;
  $("characterHint").textContent=S.owner+" · "+ownerChars(S.owner).length+"개 캐릭터 등록됨";
}
function renderWeekNav(){
  $("weekRange").textContent=iso(S.week)+" ~ "+iso(S.week+6*DAY);
  $("prevWeek").disabled=S.week<=BASE;
  $("thisWeek").classList.toggle("active",S.week===currentWeek());
  $("dayTabs").innerHTML=DAYS.map((d,i)=>`<button type="button" class="day ${i===S.day?"active":""}" data-day="${i}" data-name="${d}"><span class="day-name">${d}</span><span class="day-date">${iso(S.week+i*DAY).slice(5).replace("-","/")}</span></button>`).join("");
}
function renderStats(){
  const scope="char:"+S.charId,date=dayKey(),earnedToday=dayIncome(date,scope),earnedWeek=weekIncome(scope),spentWeek=weekExpense(scope);
  $("statDay").textContent=format(earnedToday);
  $("statWeek").textContent=format(earnedWeek);
  $("statSpend").textContent=format(spentWeek);
  $("statNet").textContent=format(earnedWeek-spentWeek);
  $("statBoth").textContent=format(weekIncome(S.owner)-weekExpense(S.owner));
  $("expenseTotal").textContent=format(spentWeek);
  $("expenseNet").textContent=format(earnedWeek-spentWeek);
  $("expenseDayTotal").textContent=format(dayExpense(date,scope));
}
function renderOwnerExpenses(){
  const date=dayKey();
  $("ownerExpenseDate").textContent=date.replaceAll("-",".")+" · 두 사람 추가 사용";
  $("ownerExpenseGrid").innerHTML=OWNERS.map(owner=>{
    const record=S.weeks.ownerExpenses?.[owner]?.[date]||{amount:0,note:""};
    const color=OWNER_META[owner].color;
    return `<div class="owner-expense-card" data-owner-card="${owner}">
      <div class="owner-expense-head"><span class="owner-expense-dot" style="background:${color}"></span><strong>${owner}</strong></div>
      <label class="expense-label" for="shared-${owner}">추가 사용 메소</label>
      <input id="shared-${owner}" data-owner-extra="${owner}" class="expense-input" type="text" inputmode="decimal" autocomplete="off" placeholder="예: 1억 2000만" value="${record.amount||""}">
      <label class="expense-label" for="shared-note-${owner}" style="margin-top:10px">사용 내역 (선택)</label>
      <input id="shared-note-${owner}" data-owner-note="${owner}" class="expense-note" type="text" maxlength="80" autocomplete="off" placeholder="예: 강화, 큐브" value="${esc(record.note||"")}">
      <div class="owner-expense-result">오늘 총사용 <strong id="ownerTotal-${owner}">${format(dayExpense(date,owner))}</strong></div>
    </div>`;
  }).join("");
}
function renderExpense(){
  const e=active().expenses[dayKey()]||{amount:0,note:""};
  $("expenseDate").textContent=dayKey().replaceAll("-",".")+" · "+selectedChar().name;
  $("expenseInput").value=e.amount?String(e.amount):"";
  $("expenseNote").value=e.note||"";
  renderStats();
}
function optionsFor(b,selected){return b[1].map(x=>`<option value="${x[0]}" ${x[0]===selected?"selected":""}>${x[0]}</option>`).join("")}
function partyOptions(p){let s="";for(let n=1;n<=12;n++)s+=`<option value="${n}" ${Number(p)===n?"selected":""}>${n}인</option>`;return s}
function renderBosses(){
  const rec=active().bosses;const date=dayKey();
  $("bossCount").textContent=counted()+" / 12";
  $("bossList").innerHTML=BOSSES.map((b,i)=>{
    const r=rec[b[0]],cfg=configuration(selectedChar(),b),p=cfg||r||pref(b),other=r&&(r.day||r.date)!==date;const pending=SYNC.pending.has(syncKey(selectedChar(),remoteBossName(b[0]),weekKey()));
    return `<article class="boss-card ${r?"done":""} ${other?"other-day":""}">
      <label class="boss-top"><input type="checkbox" data-kind="check" data-index="${i}" ${r?"checked":""} ${pending?"disabled":""}><span class="boss-name">${b[0]}</span>${linked(selectedChar())?`<span class="sync-tag ${cfg?"is-linked":"is-local"}">${cfg?"연동":"로컬"}</span>`:""}${r?`<span class="done-badge">${other?esc((r.day||r.date).slice(5).replace("-","/"))+" 완료":"오늘 완료"}</span>`:""}</label>
      <div class="boss-controls"><select aria-label="${b[0]} 난이도" data-kind="diff" data-index="${i}" ${cfg?"disabled title=\"보스판에서 난이도 변경\"":""}>${optionsFor(b,p.diff)}</select><select aria-label="${b[0]} 파티 인원" data-kind="party" data-index="${i}" ${cfg?"disabled title=\"보스판에서 인원 변경\"":""}>${partyOptions(p.party)}</select></div>
      <div class="price-line"><span>내 결정석 수익</span><strong>${compact(r?savedAmount(b,r):earned(b,p.diff,p.party))}</strong></div>
      ${other?`<button type="button" class="move-button" data-kind="move" data-index="${i}">선택 날짜로 이동 →</button>`:""}
    </article>`;
  }).join("");
}
function renderMonthly(){
  const r=S.month.byId[S.charId],p=configuration(selectedChar(),BLACK)||r||pref(BLACK),other=r&&(r.day||r.date)!==dayKey();
  $("monthlyCard").innerHTML=`<article class="boss-card ${r?"done":""}">
    <label class="boss-top"><input type="checkbox" id="blackCheck" ${r?"checked":""}><span class="boss-name">검은 마법사 · 월 1회</span>${r?`<span class="done-badge">${esc((r.day||r.date).slice(5).replace("-","/"))} 완료</span>`:""}</label>
    <div class="boss-controls"><select id="blackDiff" ${configuration(selectedChar(),BLACK)?"disabled":""}>${optionsFor(BLACK,p.diff)}</select><select id="blackParty" ${configuration(selectedChar(),BLACK)?"disabled":""}>${partyOptions(p.party)}</select></div>
    <div class="price-line"><span>월간 별도 수익</span><strong>${compact(r?savedAmount(BLACK,r):earned(BLACK,p.diff,p.party))}</strong></div>
    ${other?'<button type="button" class="move-button" id="moveBlack">선택 날짜로 이동 →</button>':""}
  </article>`;
  $("monthLabel").textContent=monthKey().replace("-","년 ")+"월 · "+selectedChar().name;
  $("monthAmount").textContent=format(monthIncome("char:"+S.charId));
}
function render(){
  document.documentElement.dataset.theme=S.theme;document.documentElement.dataset.owner=S.owner;
  $("themeToggle").textContent=S.theme==="dark"?"☀ 라이트 모드":"☾ 다크 모드";
  renderOwners();renderCharacters();renderWeekNav();renderStats();renderExpense();renderOwnerExpenses();renderBosses();renderMonthly();renderSyncStatus();renderSyncNotes();drawShort();
}
function addCharacter(){
  const owner=S.owner;const value=$("newCharInput").value.trim();
  if(!value){notify("추가할 캐릭터 이름을 입력해 주세요.");$("newCharInput").focus();return}
  if(ownerChars(owner).some(x=>x.name===value)){notify("같은 주인에게 동일한 이름이 있어요.");return}
  const archived=S.profiles.deletedCharacters||[];
  const index=archived.findIndex(c=>c.owner===owner&&c.name===value);
  const restored=index>=0?archived.splice(index,1)[0]:null;
  const id=restored?.id||(owner===OWNERS[0]?"corn":"bean")+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7);
  S.profiles.characters.push(restored||{id,owner,name:value});S.profiles.selected=id;save(KEY_PROFILES,S.profiles);
  S.charId=id;if(S.view.startsWith("char:"))S.view="char:"+id;$("newCharInput").value="";render();
  notify(value+(restored?" 캐릭터의 이전 기록을 복원했어요.":" 캐릭터가 추가됐어요."));
}
function archiveCharacter(id){
  const c=allChars().find(x=>x.id===id);
  if(!c)return;
  if(ownerChars(c.owner).length<=1){
    notify("주인마다 최소 한 캐릭터는 남겨야 해요.");
    return;
  }
  if(!confirm("'"+c.name+"'을(를) 쇼츠 목록에서 삭제할까요?\n\n보스 현황판은 그대로 유지되고, 쇼츠 기록은 같은 이름으로 다시 추가하면 복원돼요."))return;
  const archive=S.profiles.deletedCharacters;
  S.profiles.deletedCharacters=archive.filter(x=>x.id!==id);
  S.profiles.deletedCharacters.push({...c});
  S.profiles.characters=S.profiles.characters.filter(x=>x.id!==id);
  if(S.charId===id){
    const next=ownerChars(c.owner)[0]||allChars()[0];
    S.charId=next.id;
    S.owner=next.owner;
    S.profiles.selected=next.id;
  }
  if(S.view==="char:"+id)S.view="char:"+S.charId;
  save(KEY_PROFILES,S.profiles);
  render();
  notify("'"+c.name+"' 캐릭터를 목록에서 삭제했어요.");
}
function renameCharacter(){
  const c=selectedChar(),name=$("renameCharInput").value.trim();
  if(!name){notify("이름을 입력해 주세요.");return}
  if(ownerChars(S.owner).some(x=>x.id!==c.id&&x.name===name)){notify("같은 주인에게 동일한 이름이 있어요.");return}
  const old=c.name;c.name=name;save(KEY_PROFILES,S.profiles);render();notify(old+" → "+name+" 저장됐어요. 기존 기록도 유지돼요.");
}
function changeBoss(t){
  const b=BOSSES[Number(t.dataset.index)];if(!b)return;
  const r=active().bosses[b[0]],k=t.dataset.kind;
  if(k==="check"){
    if(r)delete active().bosses[b[0]];
    else if(counted()>=12){notify("캐릭터당 주간 보스는 최대 12개예요.");renderBosses();return}
    else{const p=pref(b);active().bosses[b[0]]={day:dayKey(),diff:p.diff,party:p.party}}
  }else if(k==="move"&&r)r.day=dayKey();
  else if(k==="diff"||k==="party"){
    const p=r||pref(b),diff=k==="diff"?t.value:p.diff,party=k==="party"?Number(t.value):p.party;
    setPref(b,diff,party);if(r){r.diff=diff;r.party=party}
  }
  saveWeek();const changed=active().bosses[b[0]]||null;const list=$("bossList"),y=list.scrollTop;renderBosses();list.scrollTop=y;renderStats();drawShort();if(k==="check"||k==="move"||(changed&&(k==="diff"||k==="party")))maybeSyncCurrentBoss(b,changed,weekKey(),dayKey());
}
function changeBlack(kind,value){
  const r=S.month.byId[S.charId],p=r||pref(BLACK);
  if(kind==="check"){
    S.month.byId[S.charId]=r?null:{day:dayKey(),diff:p.diff,party:p.party}
  }else if(kind==="move"&&r)r.day=dayKey();
  else if(kind==="diff"||kind==="party"){
    const diff=kind==="diff"?value:p.diff,party=kind==="party"?Number(value):p.party;
    setPref(BLACK,diff,party);if(r){r.diff=diff;r.party=party}
  }
  saveMonth();renderMonthly();renderStats();drawShort();if(kind==="check"||kind==="move"||(S.month.byId[S.charId]&&(kind==="diff"||kind==="party")))maybeSyncCurrentBoss(BLACK,S.month.byId[S.charId],weekKey(),dayKey());
}
function editOwnerExpense(e){
  const input=e.target;
  const owner=input.dataset.ownerExtra||input.dataset.ownerNote;
  if(!OWNERS.includes(owner))return;
  const root=$("ownerExpenseGrid");
  const amountInput=root.querySelector('[data-owner-extra="'+owner+'"]');
  const noteInput=root.querySelector('[data-owner-note="'+owner+'"]');
  const amount=amountFromInput(amountInput.value);
  if(amount===null||amount>999999999999999){
    amountInput.setAttribute("aria-invalid","true");
    notify("금액은 숫자 또는 '1억 2000만' 형식으로 입력해 주세요.");
    return;
  }
  amountInput.removeAttribute("aria-invalid");
  if(!S.weeks.ownerExpenses[owner])S.weeks.ownerExpenses[owner]={};
  S.weeks.ownerExpenses[owner][dayKey()]={amount,note:noteInput.value};
  saveWeek();
  $("ownerTotal-"+owner).textContent=format(dayExpense(dayKey(),owner));
  renderStats();drawShort();
}
function editExpense(){
  const text=$("expenseInput").value;
  const amount=amountFromInput(text);
  if(amount===null||amount>999999999999999){$("expenseInput").setAttribute("aria-invalid","true");$("expenseInvalid").textContent="숫자 또는 '1억 2000만' 형식으로 입력해 주세요.";return}
  $("expenseInput").removeAttribute("aria-invalid");$("expenseInvalid").textContent="";
  active().expenses[dayKey()]={amount,note:$("expenseNote").value};
  saveWeek();renderStats();drawShort();
}
function navigateWeek(ms){
  if(ms<BASE)return;S.week=ms;S.day=ms===currentWeek()?Math.min(6,Math.max(0,Math.floor((todayKST()-ms)/DAY))):0;
  S.follow=ms===currentWeek();loadWeek();loadMonth();mergeRemoteRecords();render();
}
function todayKST(){const d=new Date(Date.now()+9*3600000);return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())}
function setDay(day){S.day=day;loadMonth();mergeRemoteRecords();render()}
function rounded(ctx,x,y,w,h,r,fill,stroke){
  ctx.beginPath();
  if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);
  else{
    ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
    ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
    ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);
    ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();
  }
  if(fill){ctx.fillStyle=fill;ctx.fill()}
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}
}
function txt(ctx,v,x,y,size,color,weight,align){
  ctx.font=(weight||"700")+" "+size+'px "Apple SD Gothic Neo",Pretendard,"Malgun Gothic",sans-serif';
  ctx.textAlign=align||"left";ctx.fillStyle=color;ctx.fillText(v,x,y);
}
function fitting(ctx,v,width,start,min){let n=start;while(n>min){ctx.font="900 "+n+'px "Apple SD Gothic Neo",Pretendard,sans-serif';if(ctx.measureText(v).width<=width)break;n-=2}return n}
function crop(ctx,v,w){while(v.length>1&&ctx.measureText(v).width>w)v=v.slice(0,-2)+"…";return v}
function drawOwnerHalf(ctx,owner,y,date){
  const color=OWNER_META[owner].color,isCorn=owner===OWNERS[0];
  const x=50,w=980,h=788,entries=dayItems(date,owner);
  const gain=dayIncome(date,owner),spent=dayExpense(date,owner),net=gain-spent;
  const weekGain=weekIncome(owner),weekSpent=weekExpense(owner),weekNet=weekGain-weekSpent;
  // Two owner areas are equally tall and use only their own point colors.
  const panel=ctx.createLinearGradient(x,y,x+w,y+h);
  panel.addColorStop(0,isCorn?"#29271f":"#30222e");
  panel.addColorStop(.47,"#1b2431");panel.addColorStop(1,"#151d2a");
  rounded(ctx,x,y,w,h,30,panel,"#445366");
  rounded(ctx,x+18,y+18,8,h-36,4,color);
  const badgeX=x+74;
  rounded(ctx,badgeX,y+33,82,82,22,isCorn?"#eac65b":"#f66baf");
  txt(ctx,isCorn?"옥":"콩",badgeX+41,y+92,44,isCorn?"#372a11":"#fff","900","center");
  txt(ctx,owner,x+176,y+89,46,"#fff9ec","900");
  const chars=ownerChars(owner).length;
  txt(ctx,chars+"개 캐릭터 · 오늘 잡은 보스 "+entries.length+"개",x+178,y+126,24,"#bfcadb","700");
  rounded(ctx,x+w-197,y+52,147,51,16,isCorn?"#554a2a":"#583047");
  txt(ctx,isCorn?"CORN":"PINK",x+w-124,y+86,25,color,"900","center");
  // Primary earnings row. Values deliberately use separate cards to aid reading on mobile.
  const gap=13,pad=32,cardW=(w-2*pad-2*gap)/3,start=x+pad,statY=y+164;
  const cells=[["오늘 수익",gain,"#fff5d7"],["오늘 사용",spent,"#d3e1ef"],["오늘 순수익",net,net<0?"#ffb7c8":color]];
  cells.forEach((cell,i)=>{
    const xx=start+i*(cardW+gap);
    rounded(ctx,xx,statY,cardW,141,19,"#0e1725","#405065");
    txt(ctx,cell[0],xx+20,statY+40,25,"#aabdd0","800");
    const value=compact(cell[1]);
    txt(ctx,value,xx+20,statY+104,fitting(ctx,value,cardW-36,50,22),cell[2],"900");
  });
  rounded(ctx,x+pad,y+323,w-pad*2,107,19,"#243141","#415267");
  const second=[["주간 수익",weekGain],["주간 사용",weekSpent],["주간 순수익",weekNet]];
  const wkWidth=(w-pad*2)/3;
  second.forEach((part,i)=>{
    const xx=x+pad+wkWidth*i;
    if(i){ctx.fillStyle="#405264";ctx.fillRect(xx,y+341,2,70)}
    txt(ctx,part[0],xx+19,y+361,23,"#a6b9cb","750");
    const value=compact(part[1]);
    txt(ctx,value,xx+19,y+402,fitting(ctx,value,wkWidth-40,36,20),i===2?(weekNet<0?"#ffb7c8":color):"#f7f0df","900");
  });
  txt(ctx,"오늘 잡은 보스",x+pad,y+481,30,"#f8f1e8","900");
  txt(ctx,entries.length+"개",x+w-pad,y+481,25,color,"900","right");
  ctx.fillStyle="#415469";ctx.fillRect(x+pad,y+499,w-2*pad,2);
  if(!entries.length){
    rounded(ctx,x+pad,y+531,w-2*pad,130,19,"#1e2c3c","#3c4e60");
    txt(ctx,"체크한 보스가 아직 없어요",x+w/2,y+605,29,"#a8bbcb","800","center");
  }else{
    const visible=entries.slice(0,6);
    visible.forEach((item,i)=>{
      const col=i>=3?1:0,row=i%3,cx=x+pad+col*(cardW*1.5+gap),cy=y+520+row*75;
      const ww=(w-pad*2-gap)/2;
      rounded(ctx,cx,cy,ww,66,14,"#203043","#384e62");
      rounded(ctx,cx+11,cy+11,8,44,4,color);
      txt(ctx,crop(ctx,item.name,260),cx+32,cy+28,23,"#f6f8fa","900");
      const desc=item.c.name+" · "+item.diff+(item.monthly?" · 월간":"");
      txt(ctx,crop(ctx,desc,240),cx+32,cy+53,18,"#aebfd0","700");
      const val=compact(item.amount);
      txt(ctx,val,cx+ww-13,cy+49,fitting(ctx,val,175,23,15),color,"900","right");
    });
    if(entries.length>6)txt(ctx,"외 "+(entries.length-6)+"개 보스도 수익 합계에 포함돼요.",x+pad,y+764,21,"#a6b9c9","700");
  }
}
function drawShort(){
  const canvas=$("shortCanvas"),ctx=canvas.getContext("2d");if(!ctx)return;
  const w=1080,h=1920,date=dayKey();
  ctx.clearRect(0,0,w,h);
  const bg=ctx.createLinearGradient(0,0,1080,1920);
  bg.addColorStop(0,"#0f1320");bg.addColorStop(.52,"#0d1420");bg.addColorStop(1,"#10131c");
  ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  ctx.fillStyle="#efbc32";ctx.fillRect(50,43,72,7);
  ctx.fillStyle="#fb5b9d";ctx.fillRect(122,43,72,7);
  txt(ctx,"오늘의 보스 수익",50,105,60,"#fdf8ee","900");
  txt(ctx,date.replaceAll("-",".")+"  /  "+DAYS[S.day]+"요일",1025,105,29,"#b8c6d5","800","right");
  drawOwnerHalf(ctx,OWNERS[0],155,date);
  drawOwnerHalf(ctx,OWNERS[1],963,date);
  const todayGain=dayIncome(date,"all"),todaySpend=dayExpense(date,"all");
  rounded(ctx,50,1773,980,94,21,"#1d2939","#4b596e");
  txt(ctx,"오늘 합산 순수익",79,1831,31,"#ccd5e0","800");
  const net=compact(todayGain-todaySpend);
  txt(ctx,net,1003,1832,fitting(ctx,net,580,49,28),todayGain-todaySpend<0?"#ffa7b9":"#f0d78b","900","right");
  txt(ctx,"검은 마법사: 잡은 날의 수익에 포함 · 주간 수익에서는 제외",50,1900,23,"#9bacbc","700");
}
function download(){
  const canvas=$("shortCanvas"),a=document.createElement("a");
  a.download="boss-shorts-"+dayKey()+"-옥수수-콩국수.png";
  if(canvas.toBlob){
    canvas.toBlob(blob=>{if(!blob){notify("이미지 저장에 실패했어요.");return}const url=URL.createObjectURL(blob);a.href=url;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)},"image/png");
  }else{a.href=canvas.toDataURL("image/png");a.click()}
}

/* The existing boss board owns the shared checklist.
   No PIN or administrator credential is used or stored here. */
const BOSS_API="https://ibqpjcedzcllacbamrnu.supabase.co/functions/v1/boss-board-api";
const BOSS_PUBLIC_KEY="sb_publishable_s-EiUNh66D17Xd3JFGUyvA_aNEDNMKq";
const REMOTE_OWNER_NAMES={"옥수수목금":"오똑","콩국수목금":"츠죠"};
const REMOTE_NAMES={"가디언 엔젤 슬라임":"가엔슬","진 힐라":"진힐라","선택받은 세렌":"세렌","감시자 칼로스":"칼로스","최초의 대적자":"대적자","찬란한 흉성":"흉성"};
const LOCAL_NAMES=Object.fromEntries(BOSSES.concat([BLACK]).map(b=>[REMOTE_NAMES[b[0]]||b[0],b[0]]));
const SOLO_BOSSES=new Set(["데미안","루시드","윌","더스크","진힐라","듄켈"]);
const SYNC={owners:[],rows:[],busy:false,pending:new Set(),ready:false,lastCheck:0,lastOwners:0,error:""};
function remoteOwner(owner){return SYNC.owners.find(o=>o.name===REMOTE_OWNER_NAMES[owner])||null}
function remoteBossName(name){return REMOTE_NAMES[name]||name}
function linked(c){return c&&c.remoteCharacter&&remoteOwner(c.owner)&&remoteOwner(c.owner).board&&remoteOwner(c.owner).board.players.includes(c.remoteCharacter)}
function syncKey(c,boss,week){const o=remoteOwner(c.owner);return o?o.id+"|"+(week||weekKey())+"|"+c.remoteCharacter+"|"+boss:""}
function configuration(c,b){
  const o=remoteOwner(c.owner),name=remoteBossName(b[0]);
  if(!o||!linked(c)||!o.board)return null;
  const pi=o.board.players.indexOf(c.remoteCharacter);
  const row=(o.board.cells||{})[name];
  const cell=Array.isArray(row)?row[pi]:null;
  if(!cell||!cell.difficulty||cell.difficulty==="x")return null;
  const diff=cell.difficulty,party=SOLO_BOSSES.has(name)?1:Math.max(1,Number(cell.count)||1);
  if(!b[1].some(x=>x[0]===diff))return null;
  return{diff,party,amount:earned(b,diff,party),cell};
}
function savedAmount(b,r){return earned(b,r.diff,r.party)}
async function bossApi(action,payload){
  const res=await fetch(BOSS_API,{
    method:"POST",mode:"cors",cache:"no-store",
    headers:{"Content-Type":"application/json","apikey":BOSS_PUBLIC_KEY},
    body:JSON.stringify(Object.assign({action},payload||{}))
  });
  const raw=await res.text();let data;
  try{data=JSON.parse(raw)}catch{data={}}
  if(!res.ok||data.ok===false)throw new Error(data.error||"연동 서버 요청 실패 ("+res.status+")");
  return data;
}
function importBossCharacters(){
  let changed=false,added=0;
  OWNERS.forEach(owner=>{
    const board=remoteOwner(owner)?.board;
    if(!board||!Array.isArray(board.players))return;
    // Preserve existing records stored under the initial default character.
    const primary=owner==="옥수수목금"?"corn-1":"bean-1";
    const placeholder=owner==="옥수수목금"?"옥수수 1":"콩국수 1";
    const main=allChars().find(c=>c.id===primary&&c.owner===owner&&c.name===placeholder&&!c.remoteCharacter);
    if(main&&board.players.includes(owner)&&!ownerChars(owner).some(c=>c.name===owner&&c.id!==main.id)){
      main.name=owner;main.remoteCharacter=owner;changed=true;
    }
    board.players.forEach(name=>{
      const nick=String(name||"").trim();
      if(!nick)return;
      // Respect characters deliberately archived from the Shorts list.
      if((S.profiles.deletedCharacters||[]).some(c=>c.owner===owner&&c.remoteCharacter===nick))return;
      let c=ownerChars(owner).find(x=>x.remoteCharacter===nick)||ownerChars(owner).find(x=>x.name===nick);
      if(c){
        if(!c.remoteCharacter){c.remoteCharacter=nick;changed=true}
        return;
      }
      const id=(owner===OWNERS[0]?"board-c-":"board-b-")+Array.from(nick).map(x=>x.codePointAt(0).toString(36)).join("-");
      if(allChars().some(x=>x.id===id))return;
      S.profiles.characters.push({id,owner,name:nick,remoteCharacter:nick});added++;changed=true;
    });
  });
  if(changed)save(KEY_PROFILES,S.profiles);
  return added;
}
function remoteRowsFor(c,week){
  const o=remoteOwner(c.owner);
  if(!o||!linked(c))return[];
  return SYNC.rows.filter(r=>r.owner_id===o.id&&r.character_name===c.remoteCharacter&&r.week_start===week);
}
function backupBeforeMerge(){
  try{
    const key=PREFIX+"pre-sync-backup-"+weekKey()+"-"+monthKey();
    if(localStorage.getItem(key)===null){
      localStorage.setItem(key,JSON.stringify({
        createdAt:new Date().toISOString(),
        week:S.weeks,month:S.month
      }));
    }
  }catch{}
}
function mergeRemoteRecords(){
  if(!SYNC.ready)return false;
  backupBeforeMerge();
  let changedWeek=false,changedMonth=false;
  allChars().forEach(c=>{
    if(!linked(c))return;
    const rec=records(c.id).bosses;
    remoteRowsFor(c,weekKey()).forEach(r=>{
      const name=LOCAL_NAMES[r.boss_name];if(!name||name===BLACK[0])return;
      if(SYNC.pending.has(syncKey(c,r.boss_name,r.week_start)))return;
      if(!r.completed){
        if(rec[name]){delete rec[name];changedWeek=true}
        return;
      }
      const b=BOSSES.find(x=>x[0]===name);if(!b)return;
      const config=configuration(c,b),before=rec[name]||{};
      const diff=config?.diff||before.diff||defaultDiff(b),party=config?.party||before.party||1;
      const next={day:r.run_date||r.week_start,diff,party,mesoEarned:Math.max(0,Number(r.meso_earned)||0),fromBoss:true};
      if(JSON.stringify(before)!==JSON.stringify(next)){rec[name]=next;changedWeek=true}
    });
    // Black Mage is monthly and may have been checked in a different week.
    const month=monthKey();
    const candidate=SYNC.rows.filter(r=>r.owner_id===remoteOwner(c.owner).id&&r.character_name===c.remoteCharacter&&r.boss_name===BLACK[0]&&(r.run_date||r.week_start).slice(0,7)===month)
      .sort((a,b)=>String(a.updated_at||"").localeCompare(String(b.updated_at||"")));
    if(!candidate.length)return;
    const r=candidate[candidate.length-1];
    if(SYNC.pending.has(syncKey(c,BLACK[0],r.week_start)))return;
    if(!r.completed){
      if(S.month.byId[c.id]){delete S.month.byId[c.id];changedMonth=true}
      return;
    }
    const old=S.month.byId[c.id]||{},cfg=configuration(c,BLACK);
    const next={day:r.run_date||r.week_start,diff:cfg?.diff||old.diff||defaultDiff(BLACK),party:cfg?.party||old.party||1,mesoEarned:Math.max(0,Number(r.meso_earned)||0),fromBoss:true};
    if(JSON.stringify(old)!==JSON.stringify(next)){S.month.byId[c.id]=next;changedMonth=true}
  });
  if(changedWeek)saveWeek();
  if(changedMonth)saveMonth();
  return changedWeek||changedMonth;
}
function renderSyncStatus(){
  const el=$("syncState"),c=selectedChar();
  const o=remoteOwner(S.owner);
  if(SYNC.error){
    el.textContent="보스판 연결 오류 · 쇼츠 기록은 별도 저장 중";
  }else if(!SYNC.ready){
    el.textContent="보스판 체크 기록 연결 중…";
  }else{
    const nick=linked(c)?c.remoteCharacter:null;
    el.textContent=nick?"✓ 보스판 연결됨 · "+o.name+" → "+nick:"보스판 미연결 · 캐릭터 연결을 선택해 주세요";
  }
  el.classList.toggle("linked",!!linked(c)&&!SYNC.error);
  el.classList.toggle("error",!!SYNC.error);
  $("syncNow").disabled=SYNC.busy;
  $("syncNow").textContent=SYNC.busy?"불러오는 중…":"보스판 동기화";
  const select=$("remoteNameSelect"),prior=select.value;
  const players=o?.board?.players||[];
  select.innerHTML='<option value="">연결할 보스판 캐릭터 선택</option>'+players.map(n=>{
    const other=ownerChars(S.owner).find(x=>x.id!==c.id&&x.remoteCharacter===n);
    return '<option value="'+esc(n)+'" '+(other?'disabled':'')+'>' +esc(n)+(other?' · 다른 캐릭터와 연결됨':'')+'</option>';
  }).join("");
  select.value=c.remoteCharacter&&players.includes(c.remoteCharacter)?c.remoteCharacter:(players.includes(prior)?prior:"");
  $("remoteNameSelect").disabled=!SYNC.ready;
  $("linkBossChar").disabled=!SYNC.ready;
  $("unlinkBossChar").disabled=!c.remoteCharacter;
}
function renderSyncNotes(){
  const c=selectedChar(),linkedNow=!!linked(c),board=remoteOwner(c.owner)?.board;
  const pi=linkedNow?board.players.indexOf(c.remoteCharacter):-1;
  $("bossSyncNote").textContent=!linkedNow?"보스판 닉네임과 연결하면 체크 상태가 양쪽에 반영돼요.":("보스판에 설정된 보스만 양쪽에서 체크됩니다. 설정되지 않은 보스와 파풀라투스는 쇼츠에서만 기록돼요.");
}
function connectBossChar(){
  const name=$("remoteNameSelect").value,c=selectedChar();
  if(!name){notify("연결할 보스판 캐릭터를 선택해 주세요.");return}
  if(ownerChars(c.owner).some(x=>x.id!==c.id&&x.remoteCharacter===name)){notify("이미 다른 쇼츠 캐릭터와 연결된 닉네임이에요.");return}
  c.remoteCharacter=name;save(KEY_PROFILES,S.profiles);
  mergeRemoteRecords();render();
  notify("보스판 '"+name+"'와 연결했어요.");
}
async function refreshBossSync(forceOwners){
  if(SYNC.busy)return;
  if(typeof fetch!=="function"){SYNC.error="network unavailable";renderSyncStatus();return}
  SYNC.busy=true;renderSyncStatus();
  try{
    if(forceOwners||!SYNC.owners.length||Date.now()-SYNC.lastOwners>60000){
      const data=await bossApi("bootstrap");
      SYNC.owners=(data.owners||[]).filter(o=>o.name==="오똑"||o.name==="츠죠");
      SYNC.lastOwners=Date.now();
      importBossCharacters();
    }
    const data=await bossApi("checklist_bootstrap");
    SYNC.rows=Array.isArray(data.bossRunChecklists)?data.bossRunChecklists:[];
    SYNC.ready=true;SYNC.error="";SYNC.lastCheck=Date.now();
    mergeRemoteRecords();render();
  }catch(err){
    SYNC.error=String(err?.message||err);
    if(!SYNC.ready)render();
    renderSyncStatus();
    if(forceOwners)notify("보스판 연결 실패: "+SYNC.error);
  }finally{SYNC.busy=false;renderSyncStatus()}
}
function updateRemoteRow(item){
  const idx=SYNC.rows.findIndex(r=>r.owner_id===item.owner_id&&r.week_start===item.week_start&&r.character_name===item.character_name&&r.boss_name===item.boss_name);
  if(idx>=0)SYNC.rows[idx]=item;else SYNC.rows.push(item);
}

function bossPartyTargets(c,b){
  const cfg=configuration(c,b),o=remoteOwner(c.owner);
  if(!cfg||!o)return[];
  const n=remoteBossName(b[0]),names=[c.remoteCharacter];
  if(cfg.cell&&Number(cfg.cell.count)>=2){
    (Array.isArray(cfg.cell.names)?cfg.cell.names:[]).slice(0,Math.max(0,Number(cfg.cell.count)-1)).forEach(name=>{
      const nick=String(name||"").trim();
      if(nick&&nick!=="미정"&&!names.includes(nick))names.push(nick);
    });
  }
  const out=[],seen=new Set();
  names.forEach(nick=>{
    // The user explicitly linked these two owners only.
    const targetOwner=nick===c.remoteCharacter?o:[...SYNC.owners].sort((a,b)=>(a.name==="츠죠"?0:1)-(b.name==="츠죠"?0:1)).find(x=>x.board?.players?.includes(nick));
    if(!targetOwner||!targetOwner.board)return;
    const index=targetOwner.board.players.indexOf(nick),cell=targetOwner.board.cells?.[n]?.[index];
    if(!cell||!cell.difficulty||cell.difficulty==="x")return;
    const diff=cell.difficulty,party=SOLO_BOSSES.has(n)?1:Math.max(1,Number(cell.count)||1);
    if(!b[1].some(x=>x[0]===diff))return;
    const key=targetOwner.id+"|"+nick;
    if(seen.has(key))return;
    seen.add(key);
    out.push({ownerId:targetOwner.id,characterName:nick,payout:earned(b,diff,party)});
  });
  return out;
}
function pushBossCheck(c,b,week,day,rec){
  if(!SYNC.ready||!linked(c))return;
  const bossName=remoteBossName(b[0]),cfg=configuration(c,b);
  if(!LOCAL_NAMES[bossName]||!cfg){
    if(rec)notify(b[0]+"은(는) 보스 현황판에 설정되지 않아 쇼츠에만 저장했어요.");
    return;
  }
  const targets=bossPartyTargets(c,b);
  if(!targets.length)return;
  const keys=targets.map(t=>t.ownerId+"|"+week+"|"+t.characterName+"|"+bossName);
  if(keys.some(k=>SYNC.pending.has(k)))return;
  if(rec){
    rec.diff=cfg.diff;rec.party=cfg.party;rec.mesoEarned=cfg.amount;rec.fromBoss=true;
    if(b[0]===BLACK[0])saveMonth();else saveWeek();
  }
  keys.forEach(k=>SYNC.pending.add(k));
  renderBosses();renderMonthly();renderStats();drawShort();
  // Match /boss/'s existing party behavior: checking a configured party
  // propagates to its participating characters under these two owners.
  const groups={};
  targets.forEach(t=>{
    if(!groups[t.ownerId])groups[t.ownerId]=[];
    groups[t.ownerId].push({characterName:t.characterName,bossName,completed:!!rec,mesoEarned:rec?t.payout:0});
  });
  const send=targets.length===1
    ?bossApi("save_boss_run_check",{
      ownerId:targets[0].ownerId,weekStart:week,runDate:day,
      characterName:targets[0].characterName,bossName,
      completed:!!rec,mesoEarned:rec?targets[0].payout:0
    }).then(data=>[data.item].filter(Boolean))
    :Promise.all(Object.entries(groups).map(([ownerId,items])=>
      bossApi("save_boss_run_bulk",{ownerId,weekStart:week,runDate:day,items})
    )).then(data=>data.flatMap(x=>x.items||[]));
  send.then(items=>{
    items.forEach(updateRemoteRow);
    keys.forEach(k=>SYNC.pending.delete(k));
    mergeRemoteRecords();render();
    notify(b[0]+" · "+targets.length+"명 보스판 체크가 함께 저장됐어요.");
  }).catch(err=>{
    keys.forEach(k=>SYNC.pending.delete(k));
    render();
    notify("보스판 저장 실패: "+(err?.message||"연결 오류")+" · 서버와 다시 확인해 주세요.");
    refreshBossSync(false);
  });
}

function maybeSyncCurrentBoss(b,rec,week,day){pushBossCheck(selectedChar(),b,week,day,rec)}

function register(){
  $("ownerTabs").addEventListener("click",e=>{const b=e.target.closest("[data-owner]");if(!b)return;S.owner=b.dataset.owner;const c=ownerChars(S.owner)[0];selectChar(c.id)});
  $("characterList").addEventListener("click",e=>{const remove=e.target.closest("[data-archive-id]");if(remove){archiveCharacter(remove.dataset.archiveId);return}const b=e.target.closest("[data-char-id]");if(b)selectChar(b.dataset.charId)});
  $("addChar").addEventListener("click",addCharacter);
  $("newCharInput").addEventListener("keydown",e=>{if(e.key==="Enter")addCharacter()});
  $("renameChar").addEventListener("click",renameCharacter);
  $("renameCharInput").addEventListener("keydown",e=>{if(e.key==="Enter")renameCharacter()});
  $("themeToggle").addEventListener("click",()=>{S.theme=S.theme==="dark"?"light":"dark";save(KEY_THEME,S.theme);render()});
  $("prevWeek").addEventListener("click",()=>navigateWeek(S.week-WEEK));
  $("thisWeek").addEventListener("click",()=>navigateWeek(currentWeek()));
  $("nextWeek").addEventListener("click",()=>navigateWeek(S.week+WEEK));
  $("dayTabs").addEventListener("click",e=>{const b=e.target.closest("[data-day]");if(b)setDay(Number(b.dataset.day))});
  $("bossList").addEventListener("change",e=>{if(e.target.dataset.kind)changeBoss(e.target)});
  $("bossList").addEventListener("click",e=>{const b=e.target.closest('[data-kind="move"]');if(b)changeBoss(b)});
  $("monthlyCard").addEventListener("change",e=>{if(e.target.id==="blackCheck")changeBlack("check");if(e.target.id==="blackDiff")changeBlack("diff",e.target.value);if(e.target.id==="blackParty")changeBlack("party",e.target.value)});
  $("monthlyCard").addEventListener("click",e=>{if(e.target.id==="moveBlack")changeBlack("move")});
  $("expenseInput").addEventListener("input",editExpense);
  $("expenseNote").addEventListener("input",editExpense);
  $("ownerExpenseGrid").addEventListener("input",editOwnerExpense);
  $("download").addEventListener("click",download);
  $("syncNow").addEventListener("click",()=>refreshBossSync(true));
  $("linkBossChar").addEventListener("click",connectBossChar);
  $("unlinkBossChar").addEventListener("click",()=>{const c=selectedChar();delete c.remoteCharacter;save(KEY_PROFILES,S.profiles);render();notify("보스판 연결을 해제했어요. 쇼츠 기록은 그대로예요.")});

}
function boot(){
  loadProfiles();S.prefs=load(KEY_PREFS,{})||{};S.theme=load(KEY_THEME,"dark")==="light"?"light":"dark";
  S.week=currentWeek();S.day=Math.min(6,Math.max(0,Math.floor((todayKST()-S.week)/DAY)));
  loadWeek();loadMonth();register();render();refreshBossSync(true);
  setInterval(()=>{const w=currentWeek();if(S.follow&&S.week!==w){navigateWeek(w);notify("새 주간으로 넘어왔어요. 지난 기록은 지난주에서 볼 수 있어요.")}if(!document.hidden&&Date.now()-SYNC.lastCheck>9000)refreshBossSync(false)},4000);
  if(document.addEventListener)document.addEventListener("visibilitychange",()=>{if(!document.hidden)refreshBossSync(false)});
  if(typeof window!=="undefined"&&window.addEventListener)window.addEventListener("focus",()=>refreshBossSync(false));
}
boot();
})();