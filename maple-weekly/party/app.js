(function(){
"use strict";
const SUPABASE="https://ibqpjcedzcllacbamrnu.supabase.co";
const API_KEY="sb_publishable_s-EiUNh66D17Xd3JFGUyvA_aNEDNMKq";
const API_ROOT=SUPABASE+"/functions/v1/";
const TABS={rates:"배율 관리",plan:"파티 계획",recruit:"파티 모집"};
const STORE_TAB="boss-party-workspace-tab-v1";
const THEME_KEY="boss-board-theme-v1";
const BOSSES=[
  {name:"발드릭스",diff:["익스트림","데스티니","하드","노말"]},
  {name:"림보",diff:["익스트림","데스티니","하드","노말"]},
  {name:"유피테르",diff:["하드","노말"]},
  {name:"카링",diff:["익스트림","데스티니","하드","노말","이지"]},
  {name:"대적자",diff:["익스트림","데스티니","하드","노말","이지"]},
  {name:"칼로스",diff:["익스트림","데스티니","카오스","챔피언","노말","이지"]},
  {name:"벨로나",diff:["하드","노말","이지"]},
  {name:"흉성",diff:["하드","노말"]},
  {name:"세렌",diff:["익스트림","데스티니","챔피언","하드","노말"]},
  {name:"검은 마법사",diff:["익스트림","챔피언","하드"]},
  {name:"스우",diff:["익스트림"]}
];
/* Manual copy/paste template, checked against the 2026-11-05 boss-cut screenshots.
   Order is row-major, from Extreme Baldrix through Normal Seren. */
const IMPORT_ORDER=[
  ["발드릭스","익스트림"],["림보","익스트림"],["유피테르","하드"],["카링","익스트림"],
  ["대적자","익스트림"],["칼로스","익스트림"],["발드릭스","데스티니"],["발드릭스","하드"],
  ["벨로나","하드"],["림보","데스티니"],["림보","하드"],["흉성","하드"],
  ["유피테르","노말"],["대적자","데스티니"],["대적자","하드"],["발드릭스","노말"],
  ["카링","하드"],["세렌","익스트림"],["검은 마법사","익스트림"],["카링","데스티니"],
  ["림보","노말"],["칼로스","데스티니"],["칼로스","카오스"],["벨로나","노말"],
  ["세렌","데스티니"],["카링","노말"],["흉성","노말"],["스우","익스트림"],
  ["칼로스","챔피언"],["대적자","노말"],["칼로스","노말"],["벨로나","이지"],
  ["세렌","챔피언"],["카링","이지"],["세렌","하드"],["대적자","이지"],
  ["검은 마법사","챔피언"],["칼로스","이지"],["검은 마법사","하드"],["세렌","노말"]
];

let currentTab="rates",characters=[],selected="",rates={};
let initialLoaded=false,fetching=false,saving=false,lastLoaded=0,loadError="";
let edits=new Map();
let pasteText="",pasteMessage="",pasteIsError=false,pasteParsedCount=0;
function parseBossCutCopy(text){
  let source=String(text||"").replace(/[％﹪]/g,"%");
  // Full-page copy includes many unrelated percentages; isolate the actual boss-cut list.
  const marker=source.lastIndexOf("보스컷 관련 공지");
  if(marker>=0)source=source.slice(marker+"보스컷 관련 공지".length);
  const beforeTime=source.search(/보스 시간\s*(?:\(|\n|$)/);
  if(beforeTime>=0)source=source.slice(0,beforeTime);
  const matches=Array.from(source.matchAll(/(?:\[파티\]\s*)?(\d[\d,]*(?:\.\d+)?)\s*%/g));
  const numbers=matches.map(m=>Number(m[1].replace(/,/g,"")));
  const valid=numbers.every(x=>Number.isFinite(x)&&x>=0&&x<=100000);
  return {numbers,valid,expected:IMPORT_ORDER.length};
}
function importBossCutText(text){
  pasteText=String(text||"").slice(0,30000);
  if(!selected){pasteMessage="캐릭터를 먼저 선택해 주세요.";pasteIsError=true;renderRates();return}
  const match=pasteText.match(/Lv\.\s*\d+\s+([^\/\n\r]+)\s*\//);
  if(match){
    const pastedName=match[1].trim();
    const matches=characters.filter(c=>c.name===pastedName);
    if(matches.length===1){
      selected=matches[0].key; // Full-page copy identifies the registered character unambiguously.
    }else if(matches.length===0){
      pasteMessage="붙여넣은 캐릭터("+pastedName+")가 보스 현황판에 등록되어 있지 않아요.";
      pasteIsError=true;pasteParsedCount=0;renderRates();return;
    }else if(!matches.some(c=>c.key===selected)){
      pasteMessage="캐릭터명 "+pastedName+"이(가) 중복돼요. 소속을 확인해 캐릭터를 직접 선택해 주세요.";
      pasteIsError=true;pasteParsedCount=0;renderRates();return;
    }
  }
  const parsed=parseBossCutCopy(pasteText);
  if(!parsed.valid||parsed.numbers.length!==parsed.expected){
    pasteMessage="배율 "+parsed.numbers.length+"개가 감지됐어요. 기준 순서 40개(익스트림 발드릭스 ~ 노말 세렌)가 모두 있어야 자동 입력해요. 기존 입력값은 변경하지 않았어요.";
    pasteIsError=true;pasteParsedCount=parsed.numbers.length;renderRates();return;
  }
  IMPORT_ORDER.forEach(([boss,difficulty],i)=>{
    const ref=makeKey(selected,boss,difficulty);
    const value=String(parsed.numbers[i]),stored=readRate(selected,boss,difficulty);
    if(value===stored)edits.delete(ref);
    else edits.set(ref,value);
  });
  pasteMessage="40개 배율을 입력칸에 채웠어요. 첫 항목 "+parsed.numbers[0]+"% · 마지막 항목 "+parsed.numbers[39]+"%. 아직 저장되지 않았어요. 값을 확인한 뒤 ‘변경 저장’을 눌러 주세요.";
  pasteIsError=false;pasteParsedCount=parsed.numbers.length;
  renderRates();
}
const htmlEscape=x=>String(x==null?"":x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const panel=()=>document.getElementById("rateManagerPanel");
function notify(message){
  const toast=document.getElementById("toast");
  if(!toast)return;
  toast.textContent=message;toast.classList.add("show");
  setTimeout(()=>toast.classList.remove("show"),2300);
}
async function api(slug,action,params={}){
  const res=await fetch(API_ROOT+slug,{
    method:"POST",cache:"no-store",mode:"cors",
    headers:{"Content-Type":"application/json","apikey":API_KEY},
    body:JSON.stringify({action,...params})
  });
  let data={};try{data=await res.json()}catch(e){}
  if(!res.ok||data.ok===false){const err=new Error(data.error||"서버 연결 오류");err.status=res.status;throw err}
  return data;
}
function toggleTheme(){
  const dark=document.documentElement.getAttribute("data-theme")==="dark";
  if(dark){document.documentElement.removeAttribute("data-theme");localStorage.setItem(THEME_KEY,"light")}
  else{document.documentElement.setAttribute("data-theme","dark");localStorage.setItem(THEME_KEY,"dark")}
  applyThemeUI();
}
function applyThemeUI(){
  const dark=document.documentElement.getAttribute("data-theme")==="dark";
  const button=document.getElementById("partyThemeToggle");
  if(button){button.textContent=dark?"☀ 라이트":"☾ 다크";button.setAttribute("aria-label",dark?"라이트모드 켜기":"다크모드 켜기")}
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.setAttribute("content",dark?"#22272e":"#f4f5f7");
}
function activateTab(tab,writeHash=true){
  if(!TABS[tab])tab="rates";
  currentTab=tab;localStorage.setItem(STORE_TAB,tab);
  document.querySelectorAll("[data-party-tab]").forEach(b=>{
    const active=b.dataset.partyTab===tab;
    b.classList.toggle("active",active);
    b.setAttribute("aria-selected",String(active));
  });
  panel().hidden=tab!=="rates";
  document.getElementById("partyBossPanel").hidden=tab!=="plan";
  document.getElementById("routePanel").hidden=tab!=="recruit";
  const description=document.getElementById("partyDescription");
  if(description)description.textContent={
    rates:"캐릭터 · 보스 · 난이도별 배율을 한 번에 관리합니다.",
    plan:"저장된 배율로 파티를 편성하고 결과를 비교합니다.",
    recruit:"여러 보스를 함께 갈 파티원을 모집합니다."
  }[tab];
  document.title=TABS[tab]+" | 파티";
  if(writeHash&&location.hash!=="#"+tab)history.replaceState(null,"","#"+tab);
  if(tab==="rates"){
    if(!initialLoaded&&!fetching)loadAll();
    else if(initialLoaded&&!edits.size&&!fetching&&Date.now()-lastLoaded>3000)refreshRates();
    else renderRates();
  }
  if(tab==="plan"&&typeof window.renderPartyBossPage==="function")window.renderPartyBossPage();
  if(tab==="recruit"){
    if(typeof window.renderPartyRecruitPage==="function")window.renderPartyRecruitPage();
    if(typeof window.refreshPartyRecruitRates==="function")window.refreshPartyRecruitRates();
  }
}
function chooseCharacters(owners,guests,manuals){
  const chars=[],seen=new Set();
  function add(row){
    if(!row||!row.key||seen.has(row.key))return;
    seen.add(row.key);chars.push(row);
  }
  (owners||[]).forEach(o=>{
    const list=Array.isArray(o.board&&o.board.players)?o.board.players:[];
    list.forEach(name=>{
      const n=String(name||"").trim();
      if(n)add({key:String(o.id)+"|"+n,name:n,owner:String(o.name||""),category:"등록 캐릭터"});
    });
  });
  (guests||[]).forEach(g=>{
    if(g&&g.id&&g.name)add({key:"guest|"+g.id,name:String(g.name),owner:String(g.owner||"외부"),category:"계획 용병"});
  });
  (manuals||[]).forEach(person=>{
    if(person&&person.id&&person.name)add({key:"manual|"+person.id,name:String(person.name),owner:String(person.owner||"외부"),category:"모집 외부인"});
  });
  return chars;
}
async function loadAll(){
  if(fetching)return;
  fetching=true;loadError="";renderRates();
  try{
    const [bootstrap,plan,recruit,rateData]=await Promise.all([
      api("boss-board-api","bootstrap"),
      api("boss-board-api","party_boss_state_get"),
      api("boss-party-recruit","load"),
      api("boss-party-recruit","rate_get")
    ]);
    characters=chooseCharacters(bootstrap.owners,(plan.state||{}).guests,((recruit.state||{}).people)||[]);
    rates=rateData.rates||{};
    const previous=selected;
    selected=characters.some(c=>c.key===previous)?previous:(characters[0]&&characters[0].key)||"";
    initialLoaded=true;lastLoaded=Date.now();loadError="";
  }catch(e){loadError=e.message||"정보를 불러오지 못했어요."}
  finally{fetching=false;renderRates()}
}
async function refreshRates(){
  if(fetching||saving||edits.size)return;
  fetching=true;
  try{
    const [p,rateData]=await Promise.all([
      api("boss-board-api","party_boss_state_get"),
      api("boss-party-recruit","rate_get")
    ]);
    rates=rateData.rates||{};
    lastLoaded=Date.now();loadError="";
  }catch(e){loadError=e.message||"배율을 새로고침하지 못했어요."}
  finally{fetching=false;renderRates()}
}
function makeKey(character,boss,difficulty){return JSON.stringify([character,boss,difficulty])}
function readRate(character,boss,difficulty){
  const byDiff=rates[boss]&&rates[boss][difficulty];
  return byDiff&&Object.prototype.hasOwnProperty.call(byDiff,character)?String(byDiff[character]):"";
}
function renderRates(){
  const root=panel();if(!root)return;
  if(!initialLoaded){
    root.innerHTML='<div class="rate-loading">'+htmlEscape(fetching?"배율과 캐릭터 정보를 불러오는 중…":loadError||"배율 관리를 준비하고 있어요.")+'</div>';
    return;
  }
  const chosen=characters.find(x=>x.key===selected);
  let code='<div class="rate-panel-header"><div><h2>배율 관리</h2><p>캐릭터 하나를 선택해 보스별 배율을 한번에 수정하고 저장합니다.</p></div></div>';
  code+='<div class="rate-char-picker"><label for="rateCharacter">캐릭터</label><select id="rateCharacter" aria-label="캐릭터 선택">';
  let lastOwner="";
  characters.forEach(char=>{
    if(lastOwner!==char.owner){
      if(lastOwner)code+='</optgroup>';
      lastOwner=char.owner;
      code+='<optgroup label="'+htmlEscape(char.owner||"미등록")+'">';
    }
    code+='<option value="'+htmlEscape(char.key)+'"'+(selected===char.key?' selected':'')+'>'+htmlEscape(char.name)+"</option>";
  });
  if(lastOwner)code+='</optgroup>';
  code+='</select><span class="rate-char-meta">'+htmlEscape(chosen?chosen.owner:"선택 없음")+'</span></div>';
  code+='<div class="rate-hint"><b>캐릭터 · 보스 · 난이도별 배율</b>을 관리합니다. 입력·붙여넣기만으로는 저장되지 않아요. 아래 <b>변경 저장</b>을 눌러야 공용 DB에 반영됩니다.</div>';
  if(chosen){
    code+='<section class="rate-import"><div class="rate-import-head"><strong>환산주스탯 텍스트 붙여넣기</strong><span>익스트림 발드릭스 → 노말 세렌 · 40개 고정 순서</span></div>';
    code+='<textarea id="ratePaste" rows="3" maxlength="30000" placeholder="환산주스탯의 보스컷 배율 부분을 복사해서 여기에 붙여넣으세요. 자동으로 40개 배율을 채웁니다." aria-label="환산주스탯 보스컷 텍스트 붙여넣기">'+htmlEscape(pasteText)+'</textarea>';
    code+='<div class="rate-import-bottom"><span class="rate-import-note'+(pasteIsError?' error':'')+'">'+htmlEscape(pasteMessage||"붙여넣으면 자동 분석합니다. 40개가 아니면 저장하지 않아요.")+'</span>';
    code+='<button type="button" class="rate-reload" id="rateAnalyze"'+(saving?' disabled':'')+'>순서대로 채우기</button></div>';
    code+='</section>';
  }
  if(!chosen){code+='<div class="rate-empty">등록된 캐릭터가 없어요. 보스 현황판에서 캐릭터를 추가해 주세요.</div>';}
  else {
    code+='<div class="rate-grid">';
    BOSSES.forEach(b=>{
      code+='<section class="rate-group"><h3>'+htmlEscape(b.name)+'<small>'+b.diff.length+'개 난이도</small></h3>';
      b.diff.forEach(difficulty=>{
        const editKey=makeKey(selected,b.name,difficulty);
        const draft=edits.has(editKey)?edits.get(editKey):null;
        const stored=readRate(selected,b.name,difficulty);
        const value=draft!==null?draft:stored;
        code+='<div class="rate-line"><div><span class="rate-label">'+htmlEscape(difficulty)+'</span></div>';
        code+='<input class="rate-input'+(edits.has(editKey)?' is-dirty':'')+'" type="number" step="0.01" min="0" max="100000" inputmode="decimal" data-rate-boss="'+htmlEscape(b.name)+'" data-rate-difficulty="'+htmlEscape(difficulty)+'" aria-label="'+htmlEscape(b.name+" "+difficulty+" 배율")+'" placeholder="미입력" value="'+htmlEscape(value)+'"'+(saving?' disabled':'')+'>';
        code+='<span class="rate-unit">%</span></div>';
      });
      code+='</section>';
    });
    code+='</div>';
  }
  const count=edits.size;
  code+='<div class="rate-actions"><div><b id="rateSaveStatus">'+(saving?"수동 저장 중…":(count?"미저장 배율 "+count+"개":"저장할 변경사항 없음"))+'</b><small>변경 저장을 눌러야 파티 계획·모집에도 반영됩니다.</small></div>';
  code+='<div class="rate-buttons"><button type="button" class="rate-reload" id="rateRefresh"'+(saving||count?' disabled':'')+'>새로고침</button>';
  code+='<button type="button" class="rate-save" id="rateSave"'+(saving||!count?' disabled':'')+'>'+(saving?"저장 중…":"변경 저장")+'</button></div></div>';
  if(loadError)code+='<p style="color:#c94141;font-size:12px">'+htmlEscape(loadError)+'</p>';
  root.innerHTML=code;
}
function fieldChanged(input){
  if(!selected||saving)return;
  const boss=input.dataset.rateBoss,difficulty=input.dataset.rateDifficulty;
  const key=makeKey(selected,boss,difficulty);
  const value=String(input.value||"").trim();
  const stored=readRate(selected,boss,difficulty);
  if(value===""||value===stored){edits.delete(key);input.classList.remove("is-dirty")}
  else{edits.set(key,value);input.classList.add("is-dirty")}
  const info=document.getElementById("rateSaveStatus");
  if(info)info.textContent=edits.size?"미저장 배율 "+edits.size+"개":"저장할 변경사항 없음";
  const save=document.getElementById("rateSave");
  if(save)save.disabled=!edits.size;
  const reload=document.getElementById("rateRefresh");
  if(reload)reload.disabled=!!edits.size;
}
async function saveChanges(){
  if(saving||!edits.size)return;
  const all=[];
  for(const [key,value] of edits){
    const [char,boss,difficulty]=JSON.parse(key),number=Number(value);
    if(value===""||!Number.isFinite(number)||number<0||number>100000){
      notify(boss+" "+difficulty+" 배율을 확인해 주세요.");return;
    }
    all.push({key:char,boss,difficulty,value:number});
  }
  saving=true;renderRates();
  let done=0;
  try{
    for(let i=0;i<all.length;i+=150){
      const batch=all.slice(i,i+150);
      await api("boss-party-recruit","rate_bulk_set",{items:batch});
      batch.forEach(row=>{
        const ref=makeKey(row.key,row.boss,row.difficulty);
        edits.delete(ref);
        if(!rates[row.boss])rates[row.boss]={};
        if(!rates[row.boss][row.difficulty])rates[row.boss][row.difficulty]={};
        rates[row.boss][row.difficulty][row.key]=row.value;
      });
      done+=batch.length;
    }
    lastLoaded=Date.now();
    notify("공용 배율 "+done+"개를 저장했어요.");
  }catch(e){loadError=e.message||"공용 저장에 실패했어요.";notify("저장 실패: "+loadError)}
  finally{saving=false;renderRates()}
}
document.addEventListener("DOMContentLoaded",()=>{
  applyThemeUI();
  document.getElementById("partyThemeToggle").addEventListener("click",toggleTheme);
  document.querySelectorAll("[data-party-tab]").forEach(b=>b.addEventListener("click",()=>activateTab(b.dataset.partyTab)));
  const root=panel();
  root.addEventListener("change",e=>{
    if(e.target.id==="rateCharacter"){
      selected=e.target.value;
      pasteText="";pasteMessage="";pasteParsedCount=0;pasteIsError=false;
      renderRates();
    }
  });
  root.addEventListener("input",e=>{
    if(e.target.id==="ratePaste"){
      pasteText=e.target.value;
      // Pasted text is parsed on the paste event below. Manual edits use the analyze button.
    }else if(e.target.matches("[data-rate-boss]"))fieldChanged(e.target);
  });
  root.addEventListener("paste",e=>{
    if(e.target.id!=="ratePaste"||saving)return;
    const raw=e.clipboardData&&e.clipboardData.getData("text/plain");
    if(typeof raw==="string"&&raw){
      e.preventDefault();
      importBossCutText(raw);
    }
  });
  root.addEventListener("click",e=>{
    if(e.target.id==="rateSave")saveChanges();
    else if(e.target.id==="rateRefresh")loadAll();
    else if(e.target.id==="rateAnalyze")importBossCutText(pasteText);
  });
  const tabFromHash=location.hash.replace("#","");
  const preferred=TABS[tabFromHash]?tabFromHash:localStorage.getItem(STORE_TAB);
  activateTab(preferred||"rates",!TABS[tabFromHash]);
  window.addEventListener("hashchange",()=>{
    const tab=location.hash.replace("#","");
    if(TABS[tab]&&tab!==currentTab)activateTab(tab,false);
  });
  window.addEventListener("beforeunload",e=>{
    if(!edits.size)return;
    e.preventDefault();e.returnValue="";
  });
});
})();