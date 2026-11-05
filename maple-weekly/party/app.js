(function(){
"use strict";
const SUPABASE="https://ibqpjcedzcllacbamrnu.supabase.co";
const API_KEY="sb_publishable_s-EiUNh66D17Xd3JFGUyvA_aNEDNMKq";
const API_ROOT=SUPABASE+"/functions/v1/";
const TABS={rates:"배율 관리",plan:"파티 계획",recruit:"파티 모집"};
const STORE_TAB="boss-party-workspace-tab-v1";
const THEME_KEY="boss-board-theme-v1";
const BOSSES=[
  {name:"스우",diff:["익스트림"]},
  {name:"세렌",diff:["하드","익스트림"]},
  {name:"칼로스",diff:["이지","노말","카오스","익스트림"]},
  {name:"대적자",diff:["이지","노말","하드","익스트림"]},
  {name:"카링",diff:["이지","노말","하드","익스트림"]},
  {name:"흉성",diff:["노말","하드"]},
  {name:"벨로나",diff:["이지","노말","하드"]},
  {name:"림보",diff:["노말","하드"]},
  {name:"발드릭스",diff:["노말","하드"]},
  {name:"유피테르",diff:["노말","하드"]},
  {name:"검은 마법사",diff:["하드","익스트림"]}
];
let currentTab="rates",characters=[],selected="",rates={},legacy={};
let initialLoaded=false,fetching=false,saving=false,lastLoaded=0,loadError="";
let edits=new Map();
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
    legacy=(plan.state||{}).multipliers||{};
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
    rates=rateData.rates||{};legacy=(p.state||{}).multipliers||{};
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
  code+='<div class="rate-hint"><b>하드 세렌 · 익스트림 스우 이상 중심</b>으로 관리합니다. 기존에 보스명만 저장된 배율은 난이도가 확인되지 않아 참고값으로만 표시합니다. <b>미입력은 빈칸, 0%는 숫자 0</b>으로 구분해 주세요.</div>';
  if(!chosen){code+='<div class="rate-empty">등록된 캐릭터가 없어요. 보스 현황판에서 캐릭터를 추가해 주세요.</div>';}
  else {
    code+='<div class="rate-grid">';
    BOSSES.forEach(b=>{
      const legacyRate=Number((legacy[b.name]||{})[chosen.key])||0;
      code+='<section class="rate-group"><h3>'+htmlEscape(b.name)+'<small>'+b.diff.length+'개 난이도</small></h3>';
      b.diff.forEach(difficulty=>{
        const editKey=makeKey(selected,b.name,difficulty);
        const draft=edits.has(editKey)?edits.get(editKey):null;
        const stored=readRate(selected,b.name,difficulty);
        const value=draft!==null?draft:stored;
        const hint=legacyRate?'기존 난이도 미분류 '+legacyRate+'%':'';
        code+='<div class="rate-line"><div><span class="rate-label">'+htmlEscape(difficulty)+'</span>'+(hint?'<p class="rate-legacy" title="기존 배율이며 특정 난이도로 자동 분류하지 않았습니다">'+htmlEscape(hint)+'</p>':'')+'</div>';
        code+='<input class="rate-input'+(edits.has(editKey)?' is-dirty':'')+'" type="number" step="0.01" min="0" max="100000" inputmode="decimal" data-rate-boss="'+htmlEscape(b.name)+'" data-rate-difficulty="'+htmlEscape(difficulty)+'" aria-label="'+htmlEscape(b.name+" "+difficulty+" 배율")+'" placeholder="미입력" value="'+htmlEscape(value)+'"'+(saving?' disabled':'')+'>';
        code+='<span class="rate-unit">%</span></div>';
      });
      code+='</section>';
    });
    code+='</div>';
  }
  const count=edits.size;
  code+='<div class="rate-actions"><div><b id="rateSaveStatus">'+(saving?"공용 배율 저장 중…":(count?"변경한 배율 "+count+"개":"모든 배율은 공용 DB에 저장됩니다."))+'</b><small>저장한 값은 파티 계획·모집에 함께 반영됩니다.</small></div>';
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
  if(info)info.textContent=edits.size?"변경한 배율 "+edits.size+"개":"모든 배율은 공용 DB에 저장됩니다.";
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
      renderRates();
    }
  });
  root.addEventListener("input",e=>{
    if(e.target.matches("[data-rate-boss]"))fieldChanged(e.target);
  });
  root.addEventListener("click",e=>{
    if(e.target.id==="rateSave")saveChanges();
    else if(e.target.id==="rateRefresh")loadAll();
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