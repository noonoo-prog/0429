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
const BLACK=["검은 마법사",[["하드",65000],["익스트림",874000]]];
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
  OWNERS.forEach(owner=>{if(!S.profiles.characters.some(c=>c.owner===owner)){const n=owner===OWNERS[0]?0:1;S.profiles.characters.push({id:owner===OWNERS[0]?"corn-1":"bean-1",owner,name:owner==="옥수수목금"?"옥수수 1":"콩국수 1"})}});
  const c=allChars().find(x=>x.id===S.profiles.selected)||allChars()[0];S.charId=c.id;S.owner=c.owner;
}
function keyWeek(){return PREFIX+"week-"+weekKey()}
function keyMonth(k){return PREFIX+"month-"+k}
function normalWeek(obj){if(!obj||typeof obj!=="object")obj={};if(!obj.byId||typeof obj.byId!=="object")obj.byId={};return obj}
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
function dayExpense(date,scope){let v=0;allChars().forEach(c=>{if(isInScope(c,scope))v+=Number(records(c.id).expenses[date]?.amount||0)});return v}
function weekExpense(scope){let v=0;for(let i=0;i<7;i++)v+=dayExpense(iso(S.week+i*DAY),scope);return v}
function monthIncome(scope){let v=0;allChars().forEach(c=>{if(isInScope(c,scope)){const r=S.month.byId[c.id];if(r)v+=savedAmount(BLACK,r)}});return v}
function notify(msg){const n=$("status");if(!n)return;n.textContent=msg;clearTimeout(notify.t);notify.t=setTimeout(()=>{n.textContent=""},3500)}
function renderOwners(){
  $("ownerTabs").innerHTML=OWNERS.map(owner=>`<button type="button" class="owner-tab ${S.owner===owner?"active":""}" data-owner="${owner}"><span class="owner-dot"></span><span>${owner}</span><small>${ownerChars(owner).length}캐릭터</small></button>`).join("");
}
function renderCharacters(){
  $("characterList").innerHTML=ownerChars(S.owner).map(c=>`<button type="button" class="character-chip ${c.id===S.charId?"active":""}" data-char-id="${esc(c.id)}">${esc(c.name)}</button>`).join("");
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
function renderPreviewTabs(){
  const opts=[["all","전체"],[OWNERS[0],"옥수수"],[OWNERS[1],"콩국수"],["char:"+S.charId,"이 캐릭터"]];
  $("previewTabs").innerHTML=opts.map(x=>`<button type="button" data-scope="${esc(x[0])}" class="${S.view===x[0]?"active":""}">${x[1]}</button>`).join("");
}
function render(){
  document.documentElement.dataset.theme=S.theme;document.documentElement.dataset.owner=S.owner;
  $("themeToggle").textContent=S.theme==="dark"?"☀ 라이트 모드":"☾ 다크 모드";
  renderOwners();renderCharacters();renderWeekNav();renderStats();renderExpense();renderBosses();renderMonthly();renderPreviewTabs();renderSyncStatus();renderSyncNotes();drawShort();
}
function addCharacter(){
  const owner=S.owner;const value=$("newCharInput").value.trim();
  if(!value){notify("추가할 캐릭터 이름을 입력해 주세요.");$("newCharInput").focus();return}
  if(ownerChars(owner).some(x=>x.name===value)){notify("같은 주인에게 동일한 이름이 있어요.");return}
  const id=(owner===OWNERS[0]?"corn":"bean")+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7);
  S.profiles.characters.push({id,owner,name:value});S.profiles.selected=id;save(KEY_PROFILES,S.profiles);
  S.charId=id;if(S.view.startsWith("char:"))S.view="char:"+id;$("newCharInput").value="";render();notify(value+" 캐릭터가 추가됐어요.");
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
function drawShort(){
  const canvas=$("shortCanvas"),ctx=canvas.getContext("2d");if(!ctx)return;
  const scope=S.view,date=dayKey(),list=dayItems(date,scope),income=dayIncome(date,scope),expense=dayExpense(date,scope),net=income-expense,weekly=weekIncome(scope),weeklySpend=weekExpense(scope);
  const base=scope==="all"?"#efca82":scope==="char:"+S.charId?OWNER_META[S.owner].color:OWNER_META[scope]?.color||"#efca82";
  const bg=ctx.createLinearGradient(0,0,1080,1920);bg.addColorStop(0,"#202c3b");bg.addColorStop(.55,"#111c2b");bg.addColorStop(1,"#0b1321");
  ctx.fillStyle=bg;ctx.fillRect(0,0,1080,1920);
  const glow=ctx.createRadialGradient(900,120,1,900,120,680);glow.addColorStop(0,base+"44");glow.addColorStop(1,"#00000000");ctx.fillStyle=glow;ctx.fillRect(0,0,1080,1920);
  rounded(ctx,68,78,945,65,17,"#0f1a2b","#526477");
  rounded(ctx,81,90,16,40,8,OWNER_META[OWNERS[0]].color);
  rounded(ctx,103,90,16,40,8,OWNER_META[OWNERS[1]].color);
  txt(ctx,"옥수수목금  ×  콩국수목금",145,123,35,"#f2e8d2","900");
  txt(ctx,"BOSS  /  DAILY SHORTS",68,213,37,base,"900");
  txt(ctx,date.replaceAll("-",".")+" · "+DAYS[S.day]+"요일",68,268,32,"#adbdcb","800");
  const title=scope==="all"?"오늘의 합산 수익":scope==="char:"+S.charId?selectedChar().name+" 수익":scope+" 합계";
  txt(ctx,title,68,350,fitting(ctx,title,940,60,32),"#fff","900");
  rounded(ctx,62,395,956,390,36,"#203144","#4b5e71");
  txt(ctx,"오늘 벌어들인 메소",100,456,33,base,"800");
  txt(ctx,compact(income),100,571,fitting(ctx,compact(income),850,106,45),"#fff3d0","900");
  ctx.fillStyle="#46596b";ctx.fillRect(102,615,868,2);
  txt(ctx,"오늘 사용",101,672,31,"#adbece","700");txt(ctx,"−"+compact(expense),977,672,41,"#f9b9c7","900","right");
  txt(ctx,"오늘 순수익",101,744,33,"#d3e3ea","900");txt(ctx,compact(net),976,744,fitting(ctx,compact(net),580,48,26),net<0?"#ffacc6":base,"900","right");
  rounded(ctx,62,812,956,151,29,"#182735","#455769");
  txt(ctx,"이번 주 수익",98,870,28,"#afbecd","700");txt(ctx,compact(weekly),976,870,37,"#f3d394","900","right");
  txt(ctx,"이번 주 사용",98,932,27,"#afbecd","700");txt(ctx,compact(weeklySpend),976,932,35,"#ffafc1","900","right");
  txt(ctx,"TODAY'S BOSS",70,1040,35,"#f5f0e4","900");
  txt(ctx,list.length+" CLEARED",1010,1040,28,"#a5bac9","800","right");
  ctx.fillStyle="#60758a";ctx.fillRect(67,1060,944,2);
  if(!list.length){rounded(ctx,69,1100,942,214,23,"#172637","#3b5264");txt(ctx,"아직 잡은 보스가 없어요",99,1200,43,"#d5e3eb","800");txt(ctx,"날짜를 선택하고 보스를 체크해 주세요.",99,1255,27,"#8ea6b6","600")}
  else{
    list.slice(0,14).forEach((r,i)=>{
      const x=69+(i>=7?473:0),y=1090+(i%7)*86;
      rounded(ctx,x,y,463,76,15,"#1c2d3e","#395165");
      rounded(ctx,x+10,y+12,46,48,11,OWNER_META[r.c.owner].color);
      txt(ctx,OWNER_META[r.c.owner].short,x+33,y+46,26,"#161922","900","center");
      txt(ctx,crop(ctx,r.name,252),x+69,y+30,24,"#e8eff3","900");
      txt(ctx,r.c.name+" · "+r.diff+(r.monthly?" · 월간":""),x+69,y+59,19,"#aabac8","700");
      txt(ctx,compact(r.amount),x+448,y+62,fitting(ctx,compact(r.amount),202,25,17),OWNER_META[r.c.owner].color,"900","right");
    });
    if(list.length>14)txt(ctx,"외 "+(list.length-14)+"개 보스 · 위 합계에 포함",75,1735,24,"#b2bfcd","700");
  }
  rounded(ctx,69,1747,942,102,22,"#253141","#7f7464");
  txt(ctx,"주간 순수익",98,1810,33,"#d3e1e9","900");
  txt(ctx,compact(weekly-weeklySpend),976,1812,fitting(ctx,compact(weekly-weeklySpend),580,45,28),base,"900","right");
  txt(ctx,"검은 마법사는 월간 보스 · 주간 누적 제외",70,1901,24,"#8ca3b6","700");
  txt(ctx,"SHORTS  ·  9 : 16",1010,1901,22,"#9badba","700","right");
}
function download(){
  const canvas=$("shortCanvas"),a=document.createElement("a");
  a.download="boss-shorts-"+dayKey()+"-"+(S.view.startsWith("char:")?selectedChar().name:S.view)+".png";
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
const BOARD_CRYSTAL_PRICES={
  "스우":{"노말":8350000,"하드":48900000,"익스트림":545000000},
  "데미안":{"노말":8750000,"하드":46400000},
  "가엔슬":{"노말":12700000,"카오스":71300000},
  "루시드":{"이지":14900000,"노말":17800000,"하드":59700000},
  "윌":{"이지":16100000,"노말":20500000,"하드":73200000},
  "더스크":{"노말":22000000,"카오스":66300000},
  "듄켈":{"노말":23700000,"하드":89600000},
  "진힐라":{"노말":67600000,"하드":100000000},
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
  const base=Number((BOARD_CRYSTAL_PRICES[name]||{})[diff]||0);
  return{diff,party,amount:base?Math.round(base/party):earned(b,diff,party),cell};
}
function savedAmount(b,r){return r&&r.fromBoss===true&&Number.isFinite(Number(r.mesoEarned))?Math.max(0,Number(r.mesoEarned)):earned(b,r.diff,r.party)}
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
function mergeRemoteRecords(){
  if(!SYNC.ready)return false;
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
  if(!SYNC.ready){
    el.textContent=SYNC.error?"보스판 연결 실패 · 쇼츠 기록은 정상 사용 가능":"보스판 체크 기록 연결 중…";
  }else{
    const nick=linked(c)?c.remoteCharacter:null;
    el.textContent=nick?"✓ 보스판 연결됨 · "+o.name+" → "+nick:"보스판 미연결 · 캐릭터 연결을 선택해 주세요";
  }
  el.classList.toggle("linked",!!linked(c));
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
    const base=Number((BOARD_CRYSTAL_PRICES[n]||{})[diff]||0);
    const key=targetOwner.id+"|"+nick;
    if(seen.has(key))return;
    seen.add(key);
    out.push({ownerId:targetOwner.id,characterName:nick,payout:base?Math.round(base/party):0});
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
  $("characterList").addEventListener("click",e=>{const b=e.target.closest("[data-char-id]");if(b)selectChar(b.dataset.charId)});
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
  $("previewTabs").addEventListener("click",e=>{const b=e.target.closest("[data-scope]");if(!b)return;S.view=b.dataset.scope;renderPreviewTabs();drawShort()});
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
}
boot();
})();