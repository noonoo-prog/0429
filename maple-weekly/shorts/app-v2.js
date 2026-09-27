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
      if(rec&&(rec.day||rec.date)===date)arr.push({c,name:b[0],diff:rec.diff,party:rec.party,monthly:false,amount:earned(b,rec.diff,rec.party)});
    });
    const black=m[c.id];
    if(black&&(black.day||black.date)===date)arr.push({c,name:BLACK[0],diff:black.diff,party:black.party,monthly:true,amount:earned(BLACK,black.diff,black.party)});
  });
  return arr.sort((a,b)=>b.amount-a.amount);
}
function dayIncome(date,scope){return dayItems(date,scope).reduce((a,x)=>a+x.amount,0)}
function weekIncome(scope){let v=0;allChars().forEach(c=>{if(!isInScope(c,scope))return;BOSSES.forEach(b=>{const r=records(c.id).bosses[b[0]];if(r)v+=earned(b,r.diff,r.party)})});return v}
function dayExpense(date,scope){let v=0;allChars().forEach(c=>{if(isInScope(c,scope))v+=Number(records(c.id).expenses[date]?.amount||0)});return v}
function weekExpense(scope){let v=0;for(let i=0;i<7;i++)v+=dayExpense(iso(S.week+i*DAY),scope);return v}
function monthIncome(scope){let v=0;allChars().forEach(c=>{if(isInScope(c,scope)){const r=S.month.byId[c.id];if(r)v+=earned(BLACK,r.diff,r.party)}});return v}
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
    const r=rec[b[0]],p=r||pref(b),other=r&&(r.day||r.date)!==date;
    return `<article class="boss-card ${r?"done":""} ${other?"other-day":""}">
      <label class="boss-top"><input type="checkbox" data-kind="check" data-index="${i}" ${r?"checked":""}><span class="boss-name">${b[0]}</span>${r?`<span class="done-badge">${other?esc((r.day||r.date).slice(5).replace("-","/"))+" 완료":"오늘 완료"}</span>`:""}</label>
      <div class="boss-controls"><select aria-label="${b[0]} 난이도" data-kind="diff" data-index="${i}">${optionsFor(b,p.diff)}</select><select aria-label="${b[0]} 파티 인원" data-kind="party" data-index="${i}">${partyOptions(p.party)}</select></div>
      <div class="price-line"><span>내 결정석 수익</span><strong>${compact(earned(b,p.diff,p.party))}</strong></div>
      ${other?`<button type="button" class="move-button" data-kind="move" data-index="${i}">선택 날짜로 이동 →</button>`:""}
    </article>`;
  }).join("");
}
function renderMonthly(){
  const r=S.month.byId[S.charId],p=r||pref(BLACK),other=r&&(r.day||r.date)!==dayKey();
  $("monthlyCard").innerHTML=`<article class="boss-card ${r?"done":""}">
    <label class="boss-top"><input type="checkbox" id="blackCheck" ${r?"checked":""}><span class="boss-name">검은 마법사 · 월 1회</span>${r?`<span class="done-badge">${esc((r.day||r.date).slice(5).replace("-","/"))} 완료</span>`:""}</label>
    <div class="boss-controls"><select id="blackDiff">${optionsFor(BLACK,p.diff)}</select><select id="blackParty">${partyOptions(p.party)}</select></div>
    <div class="price-line"><span>월간 별도 수익</span><strong>${compact(earned(BLACK,p.diff,p.party))}</strong></div>
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
  renderOwners();renderCharacters();renderWeekNav();renderStats();renderExpense();renderBosses();renderMonthly();renderPreviewTabs();drawShort();
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
  saveWeek();const list=$("bossList"),y=list.scrollTop;renderBosses();list.scrollTop=y;renderStats();drawShort();
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
  saveMonth();renderMonthly();renderStats();drawShort();
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
  S.follow=ms===currentWeek();loadWeek();loadMonth();render();
}
function todayKST(){const d=new Date(Date.now()+9*3600000);return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())}
function setDay(day){S.day=day;loadMonth();render()}
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
}
function boot(){
  loadProfiles();S.prefs=load(KEY_PREFS,{})||{};S.theme=load(KEY_THEME,"dark")==="light"?"light":"dark";
  S.week=currentWeek();S.day=Math.min(6,Math.max(0,Math.floor((todayKST()-S.week)/DAY)));
  loadWeek();loadMonth();register();render();
  setInterval(()=>{const w=currentWeek();if(S.follow&&S.week!==w){navigateWeek(w);notify("새 주간으로 넘어왔어요. 지난 기록은 지난주에서 볼 수 있어요.")}},30000);
}
boot();
})();