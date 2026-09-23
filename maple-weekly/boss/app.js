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
const MONTHLY=new Set(["검은 마법사"]);
const SOLO=new Set(["데미안","루시드","윌","더스크","진힐라","듄켈"]);
const LIMIT=12,DIFFS=["","x","이지","노말","하드","카오스","익스트림"];
const ACTIVE_KEY="boss-board-active-owner-v6",PIN_PREFIX="boss-board-pin-",CHAR_PREFIX="boss-board-active-char-",MOBILE_VIEW_KEY="boss-board-mobile-view-v1";
const THEME_KEY="boss-board-theme-v1",PARTY_FILTER_KEY="boss-board-party-only-v1";
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
let PARTY_ONLY=localStorage.getItem(PARTY_FILTER_KEY)==="1";
let THEME_MODE=localStorage.getItem(THEME_KEY)==="dark"?"dark":"light";
const CHECKLIST_START="2026-09-24";
const PAGE_VIEW_KEY="boss-board-page-view-v1",ROUTE_SELECTION_PREFIX="boss-board-route-selection-v1-";
const ROUTE_SAVED_SLOTS_KEY="boss-board-route-saved-slots-v1";
let PAGE_VIEW=(function(){var v=localStorage.getItem(PAGE_VIEW_KEY);return v==="checklist"||v==="route"?v:"board"})();
let CHECKLIST_MONTH=(function(){
  var d=new Date(),y=d.getFullYear(),m=d.getMonth()+1;
  if(y<2026||(y===2026&&m<9))return "2026-09";
  return y+"-"+String(m).padStart(2,"0");
})();
let CHECKLISTS={};
let BOSS_RUN_CHECKS={};
let SELECTED_RUN_DATES={};
let CHECKLIST_SELECTED_DATE="";
let CHECKLIST_LOADED=false;
let CHECKLIST_LOADING=false;
let CHECKLIST_SAVING="";
let ROUTE_RESULT_READY=false;
let ROUTE_LOADED_RUNS=null;
let ROUTE_LOADED_SLOT=0;

function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(m){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]})}
function applyTheme(mode){
  THEME_MODE=mode==="dark"?"dark":"light";
  if(THEME_MODE==="dark")document.documentElement.setAttribute("data-theme","dark");
  else document.documentElement.removeAttribute("data-theme");
  localStorage.setItem(THEME_KEY,THEME_MODE);

  var meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.setAttribute("content",THEME_MODE==="dark"?"#22272e":"#f4f5f7");

  var btn=document.getElementById("themeToggle");
  if(btn){
    var dark=THEME_MODE==="dark";
    var icon=btn.querySelector(".theme-toggle-icon");
    var label=btn.querySelector(".theme-toggle-text");
    if(icon)icon.textContent=dark?"☀":"☾";
    if(label)label.textContent=dark?"라이트":"다크";
    btn.setAttribute("aria-label",dark?"라이트모드 켜기":"다크모드 켜기");
    btn.classList.toggle("is-dark",dark);
  }
}
function toggleTheme(){applyTheme(THEME_MODE==="dark"?"light":"dark")}
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
function isMultiPartyCell(c){
  return planned(c)&&Number(c.count)>=2;
}
function partyOnlyCount(){
  var st=state(),n=0;
  if(!st)return 0;
  st.players.forEach(function(_,pi){
    BOSSES.forEach(function(b){
      if(isMultiPartyCell(st.cells[b][pi]||emptyCell()))n++;
    });
  });
  return n;
}
function updatePartyFilterUI(){
  var btn=document.getElementById("partyOnlyBtn");
  var row=document.getElementById("partyFilterRow");
  if(!btn||!row)return;
  row.hidden=PAGE_VIEW!=="board";
  var o=owner();
  btn.classList.add("owner-themed");
  if(o)btn.setAttribute("data-theme",ownerTheme(o.name));
  btn.classList.toggle("active",PARTY_ONLY);
  btn.setAttribute("aria-pressed",PARTY_ONLY?"true":"false");
  var label=btn.querySelector("span:last-child");
  if(label)label.textContent=PARTY_ONLY?"2인 이상 파티만 보는 중":"2인 이상 파티만 보기";
}
function togglePartyOnly(){
  PARTY_ONLY=!PARTY_ONLY;
  localStorage.setItem(PARTY_FILTER_KEY,PARTY_ONLY?"1":"0");
  renderDesktop();
  renderMobile();
  updatePartyFilterUI();
}

function pad2(n){return String(n).padStart(2,"0")}
function dateKeyUTC(d){return d.getUTCFullYear()+"-"+pad2(d.getUTCMonth()+1)+"-"+pad2(d.getUTCDate())}
function parseDateUTC(s){var p=String(s).split("-").map(Number);return new Date(Date.UTC(p[0],p[1]-1,p[2]))}
function addDaysUTC(d,n){var x=new Date(d.getTime());x.setUTCDate(x.getUTCDate()+n);return x}
function formatShortDate(d){return (d.getUTCMonth()+1)+"."+pad2(d.getUTCDate())}
function monthWeeks(monthKey){
  var p=monthKey.split("-").map(Number),y=p[0],m=p[1]-1;
  var first=new Date(Date.UTC(y,m,1));
  var offset=(4-first.getUTCDay()+7)%7;
  var d=addDaysUTC(first,offset),out=[];
  while(d.getUTCMonth()===m){
    var key=dateKeyUTC(d);
    if(key>=CHECKLIST_START)out.push({start:key,end:dateKeyUTC(addDaysUTC(d,6))});
    d=addDaysUTC(d,7);
  }
  return out;
}
function changeChecklistMonth(delta){
  var p=CHECKLIST_MONTH.split("-").map(Number);
  var d=new Date(Date.UTC(p[0],p[1]-1+delta,1));
  var next=d.getUTCFullYear()+"-"+pad2(d.getUTCMonth()+1);
  if(next<"2026-09")return;
  CHECKLIST_MONTH=next;
  CHECKLIST_SELECTED_DATE="";
  renderChecklist();
}
function weekStartForDate(dateKey){
  var d=parseDateUTC(dateKey);
  var delta=(d.getUTCDay()-4+7)%7;
  return dateKeyUTC(addDaysUTC(d,-delta));
}
function koreaDateKey(){
  try{
    var parts=new Intl.DateTimeFormat("en-US",{
      timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"
    }).formatToParts(new Date());
    var values={};
    parts.forEach(function(p){if(p.type!=="literal")values[p.type]=p.value});
    return values.year+"-"+values.month+"-"+values.day;
  }catch(e){
    var now=new Date(Date.now()+9*60*60*1000);
    return now.getUTCFullYear()+"-"+pad2(now.getUTCMonth()+1)+"-"+pad2(now.getUTCDate());
  }
}
function currentBossWeekStart(){
  return weekStartForDate(koreaDateKey());
}
function monthGridDates(monthKey){
  var p=monthKey.split("-").map(Number),y=p[0],m=p[1]-1;
  var first=new Date(Date.UTC(y,m,1));
  var last=new Date(Date.UTC(y,m+1,0));
  var start=addDaysUTC(first,-first.getUTCDay());
  var endDelta=(6-last.getUTCDay()+7)%7;
  var end=addDaysUTC(last,endDelta);
  var out=[];
  for(var d=new Date(start.getTime());d<=end;d=addDaysUTC(d,1))out.push(dateKeyUTC(d));
  return out;
}
function defaultSelectedDateForMonth(monthKey){
  if(monthKey==="2026-09")return CHECKLIST_START;
  return monthKey+"-01";
}
function selectedCalendarDate(){
  if(!CHECKLIST_SELECTED_DATE || CHECKLIST_SELECTED_DATE.slice(0,7)!==CHECKLIST_MONTH){
    CHECKLIST_SELECTED_DATE=defaultSelectedDateForMonth(CHECKLIST_MONTH);
  }
  if(CHECKLIST_SELECTED_DATE<CHECKLIST_START)CHECKLIST_SELECTED_DATE=CHECKLIST_START;
  return CHECKLIST_SELECTED_DATE;
}
function setSelectedCalendarDate(dateKey){
  if(dateKey<CHECKLIST_START)return;
  CHECKLIST_SELECTED_DATE=dateKey;
  renderChecklist();
}
function monthRunStats(ownerId,monthKey){
  var total=0,count=0;
  var ownerRuns=BOSS_RUN_CHECKS[ownerId]||{};
  Object.keys(ownerRuns).forEach(function(weekStart){
    var week=ownerRuns[weekStart]||{};
    Object.keys(week).forEach(function(characterName){
      var bosses=week[characterName]||{};
      Object.keys(bosses).forEach(function(bossName){
        var x=bosses[bossName];
        var runDate=x&&String(x.runDate||weekStart);
        if(x&&x.completed&&runDate.slice(0,7)===monthKey){
          count++;
          total+=Math.max(0,Number(x.meso)||0);
        }
      });
    });
  });
  return{count:count,total:total};
}
function bossRunItem(ownerId,weekStart,characterName,bossName){
  var o=BOSS_RUN_CHECKS[ownerId];
  var w=o&&o[weekStart];
  var c=w&&w[characterName];
  var item=c&&c[bossName];
  return item&&typeof item==="object"?item:{completed:false,meso:0,runDate:weekStart};
}
function setBossRunItem(ownerId,weekStart,characterName,bossName,item){
  if(!BOSS_RUN_CHECKS[ownerId])BOSS_RUN_CHECKS[ownerId]={};
  if(!BOSS_RUN_CHECKS[ownerId][weekStart])BOSS_RUN_CHECKS[ownerId][weekStart]={};
  if(!BOSS_RUN_CHECKS[ownerId][weekStart][characterName])BOSS_RUN_CHECKS[ownerId][weekStart][characterName]={};
  BOSS_RUN_CHECKS[ownerId][weekStart][characterName][bossName]=item;
}
function selectedRunDate(weekStart){
  var d=SELECTED_RUN_DATES[weekStart]||weekStart;
  var end=dateKeyUTC(addDaysUTC(parseDateUTC(weekStart),6));
  if(d<weekStart||d>end)d=weekStart;
  return d;
}
function setSelectedRunDate(weekStart,runDate){
  SELECTED_RUN_DATES[weekStart]=runDate;
  renderChecklist();
}
function sumBossRunMeso(ownerId,weekStart,characterName){
  var week=BOSS_RUN_CHECKS[ownerId]&&BOSS_RUN_CHECKS[ownerId][weekStart];
  if(!week)return 0;
  if(characterName){
    var bosses=week[characterName]||{};
    return Object.keys(bosses).reduce(function(sum,b){
      var x=bosses[b];return sum+(x&&x.completed?Math.max(0,Number(x.meso)||0):0);
    },0);
  }
  return Object.keys(week).reduce(function(sum,name){
    var bosses=week[name]||{};
    return sum+Object.keys(bosses).reduce(function(s,b){
      var x=bosses[b];return s+(x&&x.completed?Math.max(0,Number(x.meso)||0):0);
    },0);
  },0);
}
function dayRunData(ownerId,weekStart,runDate){
  var week=BOSS_RUN_CHECKS[ownerId]&&BOSS_RUN_CHECKS[ownerId][weekStart];
  var entries=[],total=0;
  if(!week)return{entries:entries,total:0};
  Object.keys(week).forEach(function(characterName){
    var bosses=week[characterName]||{};
    Object.keys(bosses).forEach(function(bossName){
      var x=bosses[bossName];
      if(x&&x.completed&&(x.runDate||weekStart)===runDate){
        var meso=Math.max(0,Number(x.meso)||0);
        total+=meso;
        entries.push({character:characterName,boss:bossName,meso:meso});
      }
    });
  });
  return{entries:entries,total:total};
}
function loadChecklist(show){
  if(CHECKLIST_LOADING)return Promise.resolve();
  CHECKLIST_LOADING=true;
  if(show!==false)renderChecklist();
  return callApi("checklist_bootstrap").then(function(data){
    CHECKLISTS={};
    BOSS_RUN_CHECKS={};
    (data.checklists||[]).forEach(function(x){
      if(!CHECKLISTS[x.owner_id])CHECKLISTS[x.owner_id]={};
      CHECKLISTS[x.owner_id][x.week_start]={
        completed:!!x.completed,
        meso:Math.max(0,Number(x.meso_earned)||0)
      };
    });
    (data.bossRunChecklists||[]).forEach(function(x){
      setBossRunItem(
        x.owner_id,
        x.week_start,
        String(x.character_name||""),
        String(x.boss_name||""),
        {
          completed:!!x.completed,
          meso:Math.max(0,Number(x.meso_earned)||0),
          runDate:String(x.run_date||x.week_start||"")
        }
      );
    });
    CHECKLIST_LOADED=true;
    if(PAGE_VIEW==="checklist")renderChecklist();
    else if(PAGE_VIEW==="board"){renderDesktop();renderMobile()}
  }).catch(function(e){
    toast(e.message||"체크리스트를 불러오지 못했습니다.");
  }).finally(function(){CHECKLIST_LOADING=false});
}
function renderBossCheckState(){
  if(PAGE_VIEW==="checklist")renderChecklist();
  else if(PAGE_VIEW==="board"){renderDesktop();renderMobile()}
}
function saveBossRunCheck(weekStart,runDate,characterName,bossName,pi,completed){
  var o=owner(),st=state();if(!o||!st)return;
  var c=st.cells[bossName]&&st.cells[bossName][pi];
  var payout=completed?Math.round(bossWeeklyIncome(bossName,c)):0;
  var saveKey=o.id+"|"+weekStart+"|"+characterName+"|"+bossName;

  function doSave(){
    var before=JSON.parse(JSON.stringify(bossRunItem(o.id,weekStart,characterName,bossName)));
    setBossRunItem(o.id,weekStart,characterName,bossName,{
      completed:completed,
      meso:payout,
      runDate:completed?runDate:(before.runDate||weekStart)
    });
    CHECKLIST_SAVING=saveKey;
    renderBossCheckState();

    callApi("save_boss_run_check",{
      ownerId:o.id,
      pin:getPin(o.id),
      adminCode:ADMIN_UNLOCKED?ADMIN_CODE:"",
      weekStart:weekStart,
      runDate:runDate,
      characterName:characterName,
      bossName:bossName,
      completed:completed,
      mesoEarned:payout
    }).then(function(data){
      var item=data.item||{};
      setBossRunItem(o.id,weekStart,characterName,bossName,{
        completed:!!item.completed,
        meso:Math.max(0,Number(item.meso_earned)||0),
        runDate:String(item.run_date||runDate)
      });
      toast(completed?formatShortDate(parseDateUTC(runDate))+" · "+bossName+" "+formatEok(payout):bossName+" 체크를 해제했어요.");
    }).catch(function(e){
      setBossRunItem(o.id,weekStart,characterName,bossName,before);
      toast(e.message||"보스 체크를 저장하지 못했습니다.");
    }).finally(function(){
      CHECKLIST_SAVING="";
      renderBossCheckState();
    });
  }

  doSave();
}
function plannedWeeklyBossesForCharacter(pi){
  var st=state();if(!st)return[];
  return BOSSES.filter(function(b){
    if(MONTHLY.has(b))return false;
    return planned(st.cells[b]&&st.cells[b][pi]);
  });
}
function weekRunProgress(ownerId,weekStart){
  var st=state();if(!st)return{done:0,total:0};
  var done=0,total=0;
  st.players.forEach(function(name,pi){
    plannedWeeklyBossesForCharacter(pi).forEach(function(b){
      total++;
      if(bossRunItem(ownerId,weekStart,name,b).completed)done++;
    });
  });
  return{done:done,total:total};
}
function characterBossRunsChecked(ownerId,weekStart,characterName,pi){
  var bosses=plannedWeeklyBossesForCharacter(pi);
  return bosses.length>0&&bosses.every(function(b){
    return !!bossRunItem(ownerId,weekStart,characterName,b).completed;
  });
}
function toggleCharacterBossRuns(weekStart,runDate,characterName,pi){
  var o=owner(),st=state();if(!o||!st||CHECKLIST_SAVING)return;
  var bosses=plannedWeeklyBossesForCharacter(pi);
  if(!bosses.length){toast("이 캐릭터에 등록된 주간 보스가 없어요.");return}

  var completed=!characterBossRunsChecked(o.id,weekStart,characterName,pi);
  var items=[],before=[];
  bosses.forEach(function(b){
    var c=st.cells[b]&&st.cells[b][pi];
    var payout=completed?Math.round(bossWeeklyIncome(b,c)):0;
    before.push({
      bossName:b,
      item:JSON.parse(JSON.stringify(bossRunItem(o.id,weekStart,characterName,b)))
    });
    items.push({characterName:characterName,bossName:b,completed:completed,mesoEarned:payout});
    setBossRunItem(o.id,weekStart,characterName,b,{
      completed:completed,
      meso:payout,
      runDate:runDate
    });
  });

  var savingKey="charbulk|"+weekStart+"|"+characterName;
  CHECKLIST_SAVING=savingKey;
  renderChecklist();

  callApi("save_boss_run_bulk",{
    ownerId:o.id,
    weekStart:weekStart,
    runDate:runDate,
    items:items
  }).then(function(data){
    (data.items||[]).forEach(function(item){
      setBossRunItem(
        item.owner_id,
        item.week_start,
        String(item.character_name||""),
        String(item.boss_name||""),
        {
          completed:!!item.completed,
          meso:Math.max(0,Number(item.meso_earned)||0),
          runDate:String(item.run_date||runDate)
        }
      );
    });
    toast(completed?characterName+"의 보스를 모두 체크했어요.":characterName+"의 보스를 모두 해제했어요.");
  }).catch(function(e){
    before.forEach(function(x){
      setBossRunItem(o.id,weekStart,characterName,x.bossName,x.item);
    });
    toast(e.message||"캐릭터 전체 체크를 저장하지 못했습니다.");
  }).finally(function(){
    CHECKLIST_SAVING="";
    renderChecklist();
  });
}
function renderChecklist(){
  var panel=document.getElementById("checklistPanel");
  if(!panel)return;
  var o=owner(),st=state();
  if(!o||!st){panel.innerHTML='<div class="checklist-loading">주인이 없습니다.</div>';return}
  if(!CHECKLIST_LOADED){
    panel.innerHTML='<div class="checklist-loading">'+(CHECKLIST_LOADING?"체크리스트를 불러오는 중…":"체크리스트를 불러와 주세요.")+'</div>';
    return;
  }

  var p=CHECKLIST_MONTH.split("-"),monthNum=Number(p[1]),title=Number(p[0])+"년 "+monthNum+"월";
  var theme=ownerTheme(o.name);
  var gridDates=monthGridDates(CHECKLIST_MONTH);
  var pickedDate=selectedCalendarDate();
  var pickedWeek=weekStartForDate(pickedDate);
  var pickedWeekEnd=dateKeyUTC(addDaysUTC(parseDateUTC(pickedWeek),6));
  var progress=weekRunProgress(o.id,pickedWeek);
  var weekMeso=sumBossRunMeso(o.id,pickedWeek);
  var weekEstimate=Math.round(ownerWeeklyIncome());
  var monthStats=monthRunStats(o.id,CHECKLIST_MONTH);

  var h='<div class="checklist-card monthly-calendar owner-themed" data-theme="'+theme+'">'+
    '<div class="checklist-toolbar">'+
      '<button class="checklist-month-btn" data-month-move="-1" '+(CHECKLIST_MONTH==="2026-09"?"disabled":"")+' aria-label="이전 달">‹</button>'+
      '<div class="checklist-month-title"><strong>'+title+'</strong>'+
        '<span>'+esc(o.name)+' · '+monthStats.count+'개 보스 완료</span>'+
        '<b class="checklist-month-meso">월 누적 획득 '+formatEok(monthStats.total)+'</b>'+
      '</div>'+
      '<button class="checklist-month-btn" data-month-move="1" aria-label="다음 달">›</button>'+
    '</div>'+
    '<div class="calendar-weekdays month-weekdays">'+
      '<span class="weekday-sun">일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span class="weekday-sat">토</span>'+
    '</div>'+
    '<div class="month-calendar-grid">';

  gridDates.forEach(function(dateKey,index){
    var d=parseDateUTC(dateKey);
    var weekStart=weekStartForDate(dateKey);
    var dayData=dayRunData(o.id,weekStart,dateKey);
    var outside=dateKey.slice(0,7)!==CHECKLIST_MONTH;
    var disabled=dateKey<CHECKLIST_START;
    var day=d.getUTCDay();
    var weekendClass=day===6?" saturday":(day===0?" sunday":"");
    var selected=dateKey===pickedDate;

    h+='<button type="button" class="month-day'+weekendClass+(outside?" outside":"")+(disabled?" disabled":"")+(selected?" selected":"")+'" data-month-date="'+dateKey+'" '+(disabled?"disabled":"")+'>'+
      '<span class="month-day-date">'+formatShortDate(d)+'</span>'+
      '<span class="month-day-runs">';

    dayData.entries.slice(0,4).forEach(function(entry){
      h+='<em><i>'+esc(entry.character)+'</i> '+esc(entry.boss)+' <strong>'+formatEok(entry.meso)+'</strong></em>';
    });
    if(dayData.entries.length>4)h+='<em class="more">+'+(dayData.entries.length-4)+'개</em>';

    h+='</span>'+
      (dayData.total>0?'<span class="month-day-total">총 '+formatEok(dayData.total)+'</span>':'')+
    '</button>';
  });

  h+='</div>'+
    '<section class="selected-day-panel">'+
      '<div class="week-run-head selected-day-head">'+
        '<div><strong>'+formatShortDate(parseDateUTC(pickedDate))+'에 잡은 보스 체크</strong>'+
        '<span>'+formatShortDate(parseDateUTC(pickedWeek))+' 목 ~ '+formatShortDate(parseDateUTC(pickedWeekEnd))+' 수 · '+progress.done+'/'+progress.total+' 보스 완료</span></div>'+
        '<div class="selected-day-actions">'+
          '<div class="week-run-money"><small>주간 획득</small><b>'+formatEok(weekMeso)+'</b><em>예상 '+formatEok(weekEstimate)+'</em></div>'+
        '</div>'+
      '</div>'+
      '<div class="character-run-grid">';

  st.players.forEach(function(characterName,pi){
    var bosses=plannedWeeklyBossesForCharacter(pi);
    var charEarned=sumBossRunMeso(o.id,pickedWeek,characterName);
    var charEstimate=Math.round(characterWeeklyIncome(pi));
    var charDone=bosses.filter(function(b){return bossRunItem(o.id,pickedWeek,characterName,b).completed}).length;

    var charAllChecked=characterBossRunsChecked(o.id,pickedWeek,characterName,pi);
    var charBulkSaving=CHECKLIST_SAVING==="charbulk|"+pickedWeek+"|"+characterName;
    h+='<section class="character-run-card">'+
      '<header class="character-run-head">'+
        '<div class="character-run-title"><strong>'+esc(characterName)+'</strong><span>'+charDone+'/'+bosses.length+' 완료</span></div>'+
        '<div class="character-run-tools">'+
          '<button type="button" class="character-toggle-all '+(charAllChecked?"all-checked":"")+'" data-char-toggle="1" data-week="'+pickedWeek+'" data-run-date="'+pickedDate+'" data-character="'+esc(characterName)+'" data-pi="'+pi+'" '+((CHECKLIST_SAVING||!bosses.length)?"disabled":"")+'>'+(charBulkSaving?"저장 중…":(charAllChecked?"전체 해제":"전체 체크"))+'</button>'+
          '<div class="character-run-income"><small>획득</small><b>'+formatEok(charEarned)+'</b><em>/ '+formatEok(charEstimate)+'</em></div>'+
        '</div>'+
      '</header>'+
      '<div class="boss-run-list">';

    if(!bosses.length){
      h+='<div class="boss-run-empty">등록된 주간 보스 없음</div>';
    }else{
      bosses.forEach(function(b){
        var c=st.cells[b][pi]||emptyCell();
        var item=bossRunItem(o.id,pickedWeek,characterName,b);
        var checked=!!item.completed;
        var payout=checked?Math.max(0,Number(item.meso)||0):Math.round(bossWeeklyIncome(b,c));
        var saveKey=o.id+"|"+pickedWeek+"|"+characterName+"|"+b;
        var saving=CHECKLIST_SAVING===saveKey||CHECKLIST_SAVING==="charbulk|"+pickedWeek+"|"+characterName;
        var runLabel=checked&&item.runDate?formatShortDate(parseDateUTC(item.runDate))+" 완료":formatShortDate(parseDateUTC(pickedDate))+"에 체크";

        h+='<label class="boss-run-row '+(checked?"done":"")+'">'+
          '<input class="boss-run-checkbox" type="checkbox" data-week="'+pickedWeek+'" data-run-date="'+pickedDate+'" data-character="'+esc(characterName)+'" data-pi="'+pi+'" data-boss="'+esc(b)+'" '+(checked?"checked":"")+' '+(saving?"disabled":"")+'>'+
          '<span class="boss-run-check">'+(checked?"✓":"")+'</span>'+
          '<span class="boss-run-name"><strong>'+esc(b)+'</strong><small>'+esc(c.difficulty||"")+' · '+runLabel+'</small></span>'+
          '<span class="boss-run-meso"><small>'+(checked?"획득":"예상")+'</small><b>'+formatEok(payout)+'</b></span>'+
        '</label>';
      });
    }

    h+='</div></section>';
  });

  h+='</div></section></div>';
  panel.innerHTML=h;

  Array.prototype.forEach.call(panel.querySelectorAll("[data-month-move]"),function(btn){
    btn.onclick=function(){changeChecklistMonth(Number(btn.dataset.monthMove)||0)};
  });
  Array.prototype.forEach.call(panel.querySelectorAll(".month-day[data-month-date]"),function(btn){
    btn.onclick=function(){setSelectedCalendarDate(btn.dataset.monthDate)};
  });
  Array.prototype.forEach.call(panel.querySelectorAll("[data-char-toggle]"),function(btn){
    btn.onclick=function(){
      toggleCharacterBossRuns(
        btn.dataset.week,
        btn.dataset.runDate,
        btn.dataset.character,
        Number(btn.dataset.pi)
      );
    };
  });
  Array.prototype.forEach.call(panel.querySelectorAll(".boss-run-checkbox"),function(input){
    input.onchange=function(){
      saveBossRunCheck(
        input.dataset.week,
        input.dataset.runDate,
        input.dataset.character,
        input.dataset.boss,
        Number(input.dataset.pi),
        !!input.checked
      );
    };
  });
}

function routeOwnerRank(name){
  var i=FIXED_OWNER_ORDER.indexOf(name);
  return i<0?999:i;
}
function routeParticipantSort(a,b){
  var ar=routeOwnerRank(a.owner),br=routeOwnerRank(b.owner);
  if(ar!==br)return ar-br;
  if(a.owner!==b.owner)return String(a.owner||"").localeCompare(String(b.owner||""),"ko");
  return String(a.character||"").localeCompare(String(b.character||""),"ko");
}
function routeParticipantsForCell(sourceOwner,sourceCharacter,c){
  var people=[{owner:sourceOwner.name,character:String(sourceCharacter||"").trim()}];
  var need=Math.max(0,Number(c.count||0)-1);
  for(var i=0;i<need;i++){
    var character=String((c.names&&c.names[i])||"").trim()||"미정";
    var owned=character!=="미정"?characterOwner(character):null;
    people.push({owner:owned?owned.name:"",character:character});
  }
  return people.sort(routeParticipantSort);
}
function routeRunKey(boss,difficulty,participants){
  return boss+"|"+difficulty+"|"+participants.map(function(p){return(p.owner||"?")+":"+p.character}).join("|");
}
function partyRouteSignature(run){
  return run.participants.map(function(p){return(p.owner||"?")+"::"+p.character}).join("|");
}
function collectPartyRouteRuns(focusOwner,includeAll){
  var runs=[],seen={};
  if(!focusOwner)return runs;
  APP.owners.forEach(function(sourceOwner){
    var st=sourceOwner.board;
    if(!st)return;
    st.players.forEach(function(sourceCharacter,pi){
      BOSSES.forEach(function(boss){
        if(MONTHLY.has(boss))return;
        var c=st.cells[boss]&&st.cells[boss][pi];
        if(!isMultiPartyCell(c)||c._sync)return;

        var participants=routeParticipantsForCell(sourceOwner,sourceCharacter,c);
        var focus=participants.find(function(p){return p.owner===focusOwner.name});

        /* Personal mode only: current owner must participate.
           Party-wide mode: every original 2+ party from every board is included. */
        if(!includeAll&&!focus)return;

        var key=routeRunKey(boss,c.difficulty,participants);
        if(seen[key])return;
        seen[key]=1;
        runs.push({
          id:key,
          boss:boss,
          difficulty:c.difficulty,
          partyCount:Math.max(2,Number(c.count)||participants.length),
          participants:participants,
          focusCharacter:focus?focus.character:"",
          sourceOwner:sourceOwner.name,
          sourceCharacter:String(sourceCharacter||"").trim()
        });
      });
    });
  });

  runs.sort(function(a,b){
    if(!includeAll){
      var ac=(focusOwner.board&&focusOwner.board.players||[]).indexOf(a.focusCharacter);
      var bc=(focusOwner.board&&focusOwner.board.players||[]).indexOf(b.focusCharacter);
      if(ac<0)ac=999;if(bc<0)bc=999;
      return ac-bc||BOSSES.indexOf(a.boss)-BOSSES.indexOf(b.boss)||a.id.localeCompare(b.id,"ko");
    }
    var ai=BOSSES.indexOf(a.boss),bi=BOSSES.indexOf(b.boss);
    return ai-bi||partyRouteSignature(a).localeCompare(partyRouteSignature(b),"ko")||a.id.localeCompare(b.id,"ko");
  });
  return runs;
}
function routeSelectionKey(){
  return ROUTE_SELECTION_PREFIX+"simple-v5";
}
function routeQuickStateKey(){
  return ROUTE_SELECTION_PREFIX+"simple-state-v5";
}
function routeCharacterSelectorKey(ownerName,characterName){
  return String(ownerName||"")+"\u0001"+String(characterName||"");
}
function emptyRouteQuickState(){
  return{characters:[],excludedCharacters:[],excludedRuns:[]};
}
function routeQuickState(){
  try{
    var storageKey=routeQuickStateKey();
    var raw=localStorage.getItem(storageKey);
    if(raw===null){
      var legacy=localStorage.getItem(ROUTE_SELECTION_PREFIX+"simple-state-v4");
      if(legacy!==null){
        var old=JSON.parse(legacy);
        var migrated={
          characters:Array.isArray(old.characters)?old.characters.filter(Boolean):[],
          excludedCharacters:[],
          excludedRuns:Array.isArray(old.excludedRuns)?old.excludedRuns.filter(Boolean):[]
        };
        localStorage.setItem(storageKey,JSON.stringify(migrated));
        return migrated;
      }
    }
    var parsed=JSON.parse(raw||"{}");
    return{
      characters:Array.isArray(parsed.characters)?parsed.characters.filter(Boolean):[],
      excludedCharacters:Array.isArray(parsed.excludedCharacters)?parsed.excludedCharacters.filter(Boolean):[],
      excludedRuns:Array.isArray(parsed.excludedRuns)?parsed.excludedRuns.filter(Boolean):[]
    };
  }catch(e){
    return emptyRouteQuickState();
  }
}
function saveRouteQuickState(state){
  localStorage.setItem(routeQuickStateKey(),JSON.stringify({
    characters:(state.characters||[]).slice(),
    excludedCharacters:(state.excludedCharacters||[]).slice(),
    excludedRuns:(state.excludedRuns||[]).slice()
  }));
}
function routeSelectedFromState(runs,state){
  state=state||emptyRouteQuickState();
  var characterSet=new Set(state.characters||[]);
  var excludedCharacterSet=new Set(state.excludedCharacters||[]);
  var excludedRunSet=new Set(state.excludedRuns||[]);
  var valid=new Set((runs||[]).map(function(run){return run.id}));
  return new Set((runs||[]).filter(function(run){
    if(excludedRunSet.has(run.id))return false;
    if(run.participants.some(function(p){
      return excludedCharacterSet.has(routeCharacterSelectorKey(p.owner,p.character));
    }))return false;
    return run.participants.some(function(p){
      return characterSet.has(routeCharacterSelectorKey(p.owner,p.character));
    });
  }).map(function(run){return run.id}).filter(function(id){return valid.has(id)}));
}
function selectedRouteIds(focusOwner,runs){
  return routeSelectedFromState(runs,routeQuickState());
}
function saveRouteSelection(focusOwner,ids){
  var state=routeQuickState();
  var keep=new Set(ids||[]);
  state.excludedRuns=(state.excludedRuns||[]).filter(function(id){return !keep.has(id)});
  saveRouteQuickState(state);
}
function groupPartyRouteRuns(runs){
  var map={},order=[];
  runs.forEach(function(run){
    var sig=partyRouteSignature(run);
    if(!map[sig]){
      map[sig]={signature:sig,participants:run.participants,bosses:[]};
      order.push(sig);
    }
    map[sig].bosses.push({name:run.boss,difficulty:run.difficulty,id:run.id});
  });
  return order.map(function(sig){
    var g=map[sig];
    g.bosses.sort(function(a,b){
      var ai=BOSSES.indexOf(a.name),bi=BOSSES.indexOf(b.name);
      return ai-bi||String(a.difficulty).localeCompare(String(b.difficulty),"ko");
    });
    return g;
  });
}
function routeGroupScore(group,lastByOwner,focusOwnerName){
  var changes=0,same=0;
  group.participants.forEach(function(p){
    if(!p.owner||p.owner===focusOwnerName)return;
    if(lastByOwner[p.owner]){
      if(lastByOwner[p.owner]===p.character)same++;
      else changes++;
    }
  });
  return changes*100-same*10-group.bosses.length;
}
function orderRouteGroups(groups,lastByOwner,focusOwnerName){
  var left=groups.slice(),out=[];
  while(left.length){
    left.sort(function(a,b){
      var d=routeGroupScore(a,lastByOwner,focusOwnerName)-routeGroupScore(b,lastByOwner,focusOwnerName);
      if(d)return d;
      d=b.bosses.length-a.bosses.length;
      if(d)return d;
      return a.signature.localeCompare(b.signature,"ko");
    });
    var g=left.shift();
    out.push(g);
    g.participants.forEach(function(p){if(p.owner)lastByOwner[p.owner]=p.character});
  }
  return out;
}
function simulateCharacterRoute(runs,lastByOwner,focusOwnerName){
  var before=Object.assign({},lastByOwner);
  var next=Object.assign({},lastByOwner);
  var groups=orderRouteGroups(groupPartyRouteRuns(runs),next,focusOwnerName);
  var scan=Object.assign({},before),changes=0,same=0;
  groups.forEach(function(group){
    group.participants.forEach(function(p){
      if(!p.owner||p.owner===focusOwnerName)return;
      if(scan[p.owner]){
        if(scan[p.owner]===p.character)same++;
        else changes++;
      }
      scan[p.owner]=p.character;
    });
  });
  return{groups:groups,nextLast:next,score:changes*100-same*8-runs.length};
}
function buildPartyRoute(focusOwner,runs){
  runs=runs||[];
  var byCharacter={};
  runs.forEach(function(run){
    if(!byCharacter[run.focusCharacter])byCharacter[run.focusCharacter]=[];
    byCharacter[run.focusCharacter].push(run);
  });

  var remaining=Object.keys(byCharacter),lastByOwner={},blocks=[];
  while(remaining.length){
    var best=null;
    remaining.forEach(function(character){
      var sim=simulateCharacterRoute(byCharacter[character],lastByOwner,focusOwner.name);
      var candidate={
        character:character,
        groups:sim.groups,
        nextLast:sim.nextLast,
        score:sim.score,
        count:byCharacter[character].length,
        boardIndex:(focusOwner.board&&focusOwner.board.players||[]).indexOf(character)
      };
      if(candidate.boardIndex<0)candidate.boardIndex=999;
      if(!best||
        candidate.score<best.score||
        (candidate.score===best.score&&candidate.count>best.count)||
        (candidate.score===best.score&&candidate.count===best.count&&candidate.boardIndex<best.boardIndex)
      )best=candidate;
    });
    blocks.push({character:best.character,groups:best.groups});
    lastByOwner=best.nextLast;
    remaining=remaining.filter(function(name){return name!==best.character});
  }

  return{
    runs:runs,
    blocks:blocks,
    bossCount:runs.length,
    characterSessions:blocks.length,
    focusSwitches:Math.max(0,blocks.length-1)
  };
}
function overallGroupMetrics(group,lastByOwner,seenByOwner){
  var changed=[],same=[],revisited=[];
  group.participants.forEach(function(p){
    if(!p.owner||!p.character||p.character==="미정")return;
    var last=lastByOwner[p.owner];
    if(last){
      if(last===p.character)same.push(p.owner);
      else{
        changed.push(p.owner);
        if(seenByOwner[p.owner]&&seenByOwner[p.owner][p.character])revisited.push(p.owner);
      }
    }
  });
  return{
    changed:changed,
    same:same,
    revisited:revisited,
    score:changed.length*100+revisited.length*260-same.length*12-group.bosses.length
  };
}
function applyOverallGroupState(group,lastByOwner,seenByOwner){
  group.participants.forEach(function(p){
    if(!p.owner||!p.character||p.character==="미정")return;
    lastByOwner[p.owner]=p.character;
    if(!seenByOwner[p.owner])seenByOwner[p.owner]={};
    seenByOwner[p.owner][p.character]=true;
  });
}
function routeSavedSlots(){
  try{
    var raw=JSON.parse(localStorage.getItem(ROUTE_SAVED_SLOTS_KEY)||"[]");
    var out=[null,null,null];
    for(var i=0;i<3;i++){
      var item=raw&&raw[i];
      if(item&&Array.isArray(item.runs)&&item.runs.length){
        out[i]={
          runs:item.runs,
          savedAt:String(item.savedAt||"")
        };
      }
    }
    return out;
  }catch(e){
    return [null,null,null];
  }
}
function saveRouteSlots(slots){
  localStorage.setItem(ROUTE_SAVED_SLOTS_KEY,JSON.stringify((slots||[]).slice(0,3)));
}
function cloneRouteRuns(runs){
  return JSON.parse(JSON.stringify(runs||[]));
}
function routeSavedAtLabel(value){
  if(!value)return "";
  try{
    return new Date(value).toLocaleString("ko-KR",{
      month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"
    });
  }catch(e){
    return "";
  }
}
function invalidateRouteResult(){
  ROUTE_RESULT_READY=false;
  ROUTE_LOADED_RUNS=null;
  ROUTE_LOADED_SLOT=0;
}
function routeSaveSlotsHtml(displayRuns){
  var slots=routeSavedSlots();
  return '<section class="route-save-section">'+
    '<div class="route-save-head">'+
      '<div><strong>루트 저장</strong><span>이 기기에 최대 3개까지 저장됩니다.</span></div>'+
    '</div>'+
    '<div class="route-save-grid">'+
      slots.map(function(slot,index){
        var no=index+1;
        if(!slot){
          return '<article class="route-save-slot empty">'+
            '<div><b>슬롯 '+no+'</b><span>비어 있음</span></div>'+
            '<button type="button" data-route-save-slot="'+no+'" '+((displayRuns&&displayRuns.length)?'':'disabled')+'>현재 루트 저장</button>'+
          '</article>';
        }
        return '<article class="route-save-slot filled '+(ROUTE_LOADED_SLOT===no?'active':'')+'">'+
          '<div><b>슬롯 '+no+'</b><span>'+slot.runs.length+'개 파티 · '+esc(routeSavedAtLabel(slot.savedAt))+'</span></div>'+
          '<div class="route-save-actions">'+
            '<button type="button" class="primary" data-route-load-slot="'+no+'">불러오기</button>'+
            '<button type="button" data-route-save-slot="'+no+'" '+((displayRuns&&displayRuns.length)?'':'disabled')+'>덮어쓰기</button>'+
            '<button type="button" class="danger" data-route-delete-slot="'+no+'" aria-label="저장 루트 '+no+' 삭제">삭제</button>'+
          '</div>'+
        '</article>';
      }).join("")+
    '</div>'+
  '</section>';
}
function routeParticipantKey(p){
  return String(p&&p.owner||"")+"\u0001"+String(p&&p.character||"");
}
function routeGroupOverlap(a,b){
  if(!a||!b)return 0;
  var prev=new Set((a.participants||[]).map(routeParticipantKey));
  return (b.participants||[]).reduce(function(n,p){
    return n+(prev.has(routeParticipantKey(p))?1:0);
  },0);
}
function buildOverallPartyRoute(runs){
  var left=groupPartyRouteRuns(runs||[]),groups=[];
  var lastByOwner={},seenByOwner={},totalChanges=0,totalRevisits=0;
  var previous=null;

  while(left.length){
    left.sort(function(a,b){
      var d;
      if(!previous){
        /* 시작은 가장 많은 인원. 같은 인원이면 보스를 많이 묶은 파티 우선. */
        d=b.participants.length-a.participants.length;
        if(d)return d;
        d=b.bosses.length-a.bosses.length;
        if(d)return d;
      }else{
        /* 이후는 직전 파티와 같은 캐릭터가 많이 남는 순. */
        d=routeGroupOverlap(previous,b)-routeGroupOverlap(previous,a);
        if(d)return d;
        /* 겹치는 수가 같을 때만 인원 많은 파티 우선. */
        d=b.participants.length-a.participants.length;
        if(d)return d;
        d=b.bosses.length-a.bosses.length;
        if(d)return d;
      }
      return a.signature.localeCompare(b.signature,"ko");
    });

    var group=left.shift();
    var metrics=overallGroupMetrics(group,lastByOwner,seenByOwner);
    group.routeTransition={
      changed:metrics.changed.slice(),
      same:metrics.same.slice(),
      revisited:metrics.revisited.slice(),
      overlap:previous?routeGroupOverlap(previous,group):0
    };
    totalChanges+=metrics.changed.length;
    totalRevisits+=metrics.revisited.length;
    groups.push(group);
    applyOverallGroupState(group,lastByOwner,seenByOwner);
    previous=group;
  }

  return{
    runs:runs||[],
    groups:groups,
    bossCount:(runs||[]).length,
    groupCount:groups.length,
    totalChanges:totalChanges,
    totalRevisits:totalRevisits
  };
}
function routeTransitionHtml(transition,isFirst){
  if(isFirst)return '<div class="route-transition start"><span>시작</span></div>';
  var changed=(transition&&transition.changed)||[];
  if(!changed.length)return '<div class="route-transition keep"><span>↓</span><b>모두 현재 캐릭터 유지</b></div>';
  return '<div class="route-transition change"><span>↓</span><b>'+changed.map(esc).join(' · ')+' 교체</b></div>';
}
function routeParticipantHtml(p,focusOwnerName){
  var theme=ownerTheme(p.owner);
  return '<span class="route-member owner-themed '+(p.owner===focusOwnerName?'focus':'')+'" data-theme="'+theme+'">'+
    (p.owner?'<i>'+esc(p.owner)+'</i>':'')+'<b>'+esc(p.character)+'</b></span>';
}
function routeSelectedPartyHtml(run,focusOwnerName){
  return '<article class="route-selected-party">'+
    '<div class="route-selected-party-main">'+
      '<div class="route-choice-main"><b>'+esc(run.boss)+'</b><i>'+esc(run.difficulty)+'</i></div>'+
      '<div class="route-choice-members">'+run.participants.map(function(p){return routeParticipantHtml(p,focusOwnerName)}).join('<span class="route-plus">+</span>')+'</div>'+
    '</div>'+
    '<button type="button" class="route-party-exclude" data-route-exclude="'+esc(run.id)+'" aria-label="'+esc(run.boss)+' 파티 제외">× 제외</button>'+
  '</article>';
}
function bindRouteSelection(panel,focus,runs,selectedIds){
  Array.prototype.forEach.call(panel.querySelectorAll("[data-route-select-character]"),function(btn){
    btn.onclick=function(){
      var key=routeCharacterSelectorKey(btn.dataset.routeOwner,btn.dataset.routeSelectCharacter);
      var state=routeQuickState();
      var excludedIndex=state.excludedCharacters.indexOf(key);
      if(excludedIndex>=0)state.excludedCharacters.splice(excludedIndex,1);
      var i=state.characters.indexOf(key);
      if(i>=0)state.characters.splice(i,1);
      else state.characters.push(key);
      saveRouteQuickState(state);
      invalidateRouteResult();
      renderPartyRoute();
    };
  });

  Array.prototype.forEach.call(panel.querySelectorAll("[data-route-exclude-character]"),function(btn){
    btn.onclick=function(e){
      if(e&&e.stopPropagation)e.stopPropagation();
      var key=routeCharacterSelectorKey(btn.dataset.routeOwner,btn.dataset.routeExcludeCharacter);
      var state=routeQuickState();
      var i=state.excludedCharacters.indexOf(key);
      if(i>=0){
        state.excludedCharacters.splice(i,1);
      }else{
        state.characters=state.characters.filter(function(x){return x!==key});
        state.excludedCharacters.push(key);
      }
      saveRouteQuickState(state);
      invalidateRouteResult();
      renderPartyRoute();
    };
  });

  Array.prototype.forEach.call(panel.querySelectorAll("[data-route-owner-all]"),function(btn){
    btn.onclick=function(){
      var ownerName=btn.dataset.routeOwnerAll;
      var keys=[];
      runs.forEach(function(run){
        run.participants.forEach(function(p){
          if(p.owner!==ownerName||!p.character||p.character==="미정")return;
          var key=routeCharacterSelectorKey(p.owner,p.character);
          if(keys.indexOf(key)<0)keys.push(key);
        });
      });
      var state=routeQuickState();
      var allOn=keys.length>0&&keys.every(function(key){
        return state.characters.indexOf(key)>=0&&state.excludedCharacters.indexOf(key)<0;
      });
      if(allOn){
        state.characters=state.characters.filter(function(key){return keys.indexOf(key)<0});
      }else{
        state.excludedCharacters=state.excludedCharacters.filter(function(key){return keys.indexOf(key)<0});
        keys.forEach(function(key){if(state.characters.indexOf(key)<0)state.characters.push(key)});
      }
      saveRouteQuickState(state);
      invalidateRouteResult();
      renderPartyRoute();
    };
  });

  Array.prototype.forEach.call(panel.querySelectorAll("[data-route-owner-exclude-all]"),function(btn){
    btn.onclick=function(){
      var ownerName=btn.dataset.routeOwnerExcludeAll;
      var keys=[];
      runs.forEach(function(run){
        run.participants.forEach(function(p){
          if(p.owner!==ownerName||!p.character||p.character==="미정")return;
          var key=routeCharacterSelectorKey(p.owner,p.character);
          if(keys.indexOf(key)<0)keys.push(key);
        });
      });

      var state=routeQuickState();
      var allExcluded=keys.length>0&&keys.every(function(key){
        return state.excludedCharacters.indexOf(key)>=0;
      });

      if(allExcluded){
        state.excludedCharacters=state.excludedCharacters.filter(function(key){
          return keys.indexOf(key)<0;
        });
      }else{
        state.characters=state.characters.filter(function(key){
          return keys.indexOf(key)<0;
        });
        keys.forEach(function(key){
          if(state.excludedCharacters.indexOf(key)<0)state.excludedCharacters.push(key);
        });
      }

      saveRouteQuickState(state);
      invalidateRouteResult();
      renderPartyRoute();
    };
  });

  Array.prototype.forEach.call(panel.querySelectorAll("[data-route-exclude]"),function(btn){
    btn.onclick=function(){
      var id=btn.dataset.routeExclude;
      var state=routeQuickState();
      if(state.excludedRuns.indexOf(id)<0)state.excludedRuns.push(id);
      saveRouteQuickState(state);
      invalidateRouteResult();
      renderPartyRoute();
    };
  });

  var restore=panel.querySelector("[data-route-restore-excluded]");
  if(restore)restore.onclick=function(){
    var state=routeQuickState();
    state.excludedRuns=[];
    saveRouteQuickState(state);
    invalidateRouteResult();
    renderPartyRoute();
  };

  var clear=panel.querySelector("[data-route-clear-characters]");
  if(clear)clear.onclick=function(){
    saveRouteQuickState(emptyRouteQuickState());
    invalidateRouteResult();
    renderPartyRoute();
  };

  Array.prototype.forEach.call(panel.querySelectorAll("[data-route-save-slot]"),function(btn){
    btn.onclick=function(){
      var slotNo=Math.max(1,Math.min(3,Number(btn.dataset.routeSaveSlot)||1));
      var displayRuns=ROUTE_LOADED_RUNS&&ROUTE_LOADED_RUNS.length?ROUTE_LOADED_RUNS:runs.filter(function(run){return selectedIds.has(run.id)});
      if(!displayRuns.length)return;
      var slots=routeSavedSlots();
      slots[slotNo-1]={runs:cloneRouteRuns(displayRuns),savedAt:new Date().toISOString()};
      saveRouteSlots(slots);
      ROUTE_LOADED_SLOT=slotNo;
      toast("루트 "+slotNo+"에 저장했어요.");
      renderPartyRoute();
    };
  });

  Array.prototype.forEach.call(panel.querySelectorAll("[data-route-load-slot]"),function(btn){
    btn.onclick=function(){
      var slotNo=Math.max(1,Math.min(3,Number(btn.dataset.routeLoadSlot)||1));
      var slot=routeSavedSlots()[slotNo-1];
      if(!slot||!slot.runs||!slot.runs.length)return;
      ROUTE_LOADED_RUNS=cloneRouteRuns(slot.runs);
      ROUTE_LOADED_SLOT=slotNo;
      ROUTE_RESULT_READY=true;
      renderPartyRoute();
      setTimeout(function(){
        var result=document.querySelector(".route-simple-result");
        if(result&&result.scrollIntoView)result.scrollIntoView({behavior:"smooth",block:"start"});
      },0);
    };
  });

  Array.prototype.forEach.call(panel.querySelectorAll("[data-route-delete-slot]"),function(btn){
    btn.onclick=function(){
      var slotNo=Math.max(1,Math.min(3,Number(btn.dataset.routeDeleteSlot)||1));
      var slots=routeSavedSlots();
      slots[slotNo-1]=null;
      saveRouteSlots(slots);
      if(ROUTE_LOADED_SLOT===slotNo){
        ROUTE_LOADED_SLOT=0;
        ROUTE_LOADED_RUNS=null;
        ROUTE_RESULT_READY=false;
      }
      toast("루트 "+slotNo+" 저장을 삭제했어요.");
      renderPartyRoute();
    };
  });

  var make=panel.querySelector("[data-route-build]");
  if(make)make.onclick=function(){
    if(!selectedIds.size)return;
    ROUTE_LOADED_RUNS=null;
    ROUTE_LOADED_SLOT=0;
    ROUTE_RESULT_READY=true;
    renderPartyRoute();
    setTimeout(function(){
      var result=document.querySelector(".route-simple-result");
      if(result&&result.scrollIntoView)result.scrollIntoView({behavior:"smooth",block:"start"});
    },0);
  };
}
function routeCharacterQuickSelectHtml(runs,selectedIds){
  var state=routeQuickState();
  var selectedSet=new Set(state.characters||[]);
  var excludedSet=new Set(state.excludedCharacters||[]);
  var groups=[];

  APP.owners.slice().sort(function(a,b){
    var ar=routeOwnerRank(a.name),br=routeOwnerRank(b.name);
    if(ar!==br)return ar-br;
    return String(a.name||"").localeCompare(String(b.name||""),"ko");
  }).forEach(function(o){
    var seen={},items=[];
    runs.forEach(function(run){
      run.participants.forEach(function(p){
        if(p.owner!==o.name||!p.character||p.character==="미정"||seen[p.character])return;
        seen[p.character]=1;
        var count=runs.filter(function(r){
          return r.participants.some(function(x){return x.owner===o.name&&x.character===p.character});
        }).length;
        var key=routeCharacterSelectorKey(o.name,p.character);
        items.push({
          character:p.character,
          count:count,
          active:selectedSet.has(key),
          excluded:excludedSet.has(key)
        });
      });
    });
    if(items.length){
      items.sort(function(a,b){
        var ai=(o.board&&o.board.players||[]).indexOf(a.character);
        var bi=(o.board&&o.board.players||[]).indexOf(b.character);
        if(ai<0)ai=999;if(bi<0)bi=999;
        return ai-bi||a.character.localeCompare(b.character,"ko");
      });
      var selectable=items.filter(function(item){return !item.excluded});
      groups.push({
        owner:o.name,
        items:items,
        allOn:selectable.length>0&&selectable.length===items.length&&selectable.every(function(item){return item.active}),
        allExcluded:items.length>0&&items.every(function(item){return item.excluded})
      });
    }
  });

  if(!groups.length)return '<div class="route-character-empty">선택한 인원 조건에 해당하는 등록 캐릭터가 없어요.</div>';

  return '<div class="route-character-quick">'+
    '<div class="route-character-simple-head">'+
      '<div><span>1</span><strong>갈 캐릭터 선택</strong><p>이름을 누르면 선택 · ×를 누르면 그 캐릭터 파티 전체 제외</p></div>'+
      '<button type="button" data-route-clear-characters>선택 초기화</button>'+
    '</div>'+
    '<div class="route-character-quick-groups">'+
      groups.map(function(group){
        return '<section class="route-character-quick-group owner-themed" data-theme="'+ownerTheme(group.owner)+'">'+
          '<div class="route-character-owner-head">'+
            '<strong>'+esc(group.owner)+'</strong>'+
            '<div class="route-character-owner-actions">'+
              '<button type="button" class="route-owner-select-all" data-route-owner-all="'+esc(group.owner)+'">'+(group.allOn?'전체 해제':'전체 선택')+'</button>'+
              '<button type="button" class="route-owner-exclude-all '+(group.allExcluded?'active':'')+'" data-route-owner-exclude-all="'+esc(group.owner)+'">'+(group.allExcluded?'제외 취소':'전체 제외')+'</button>'+
            '</div>'+
          '</div>'+
          '<div class="route-character-buttons">'+
            group.items.map(function(item){
              return '<span class="route-character-chip '+(item.excluded?'excluded ':'')+(item.active?'active ':'')+'">'+
                '<button type="button" class="route-character-quick-btn '+(item.active?'active':'')+'" '+
                  'data-route-owner="'+esc(group.owner)+'" data-route-select-character="'+esc(item.character)+'" '+
                  'aria-pressed="'+(item.active?'true':'false')+'">'+
                  '<b>'+esc(item.character)+'</b>'+
                  (item.excluded?'<em>제외</em>':'<small>'+item.count+'</small>')+
                '</button>'+
                '<button type="button" class="route-character-exclude-btn '+(item.excluded?'is-excluded':'')+'" '+
                  'data-route-owner="'+esc(group.owner)+'" data-route-exclude-character="'+esc(item.character)+'" '+
                  'aria-label="'+esc(item.character)+(item.excluded?' 제외 취소':' 포함 파티 전부 제외')+'" '+
                  'title="'+esc(item.character)+(item.excluded?' 제외 취소':' 포함 파티 전부 제외')+'">'+
                  (item.excluded?'↶':'×')+
                '</button>'+
              '</span>';
            }).join("")+
          '</div>'+
        '</section>';
      }).join("")+
    '</div>'+
  '</div>';
}
function renderPartyRoute(){
  var panel=document.getElementById("routePanel");
  if(!panel)return;
  var focus=owner();
  if(!focus){
    panel.innerHTML='<div class="route-empty">주인이 없습니다.</div>';
    return;
  }

  var allRuns=collectPartyRouteRuns(focus,true),theme=ownerTheme(focus.name);
  if(!allRuns.length){
    panel.innerHTML='<div class="route-empty owner-themed" data-theme="'+theme+'"><strong>전체 보스판에 2인 이상 주간 파티가 없어요.</strong><span>보스 현황판에서 2인 이상 파티를 등록하면 여기에 자동으로 나타납니다.</span></div>';
    return;
  }

  var selectedIds=selectedRouteIds(focus,allRuns);
  var selectedRuns=allRuns.filter(function(run){return selectedIds.has(run.id)});
  var displayRuns=ROUTE_LOADED_RUNS&&ROUTE_LOADED_RUNS.length?ROUTE_LOADED_RUNS:selectedRuns;
  var route=ROUTE_RESULT_READY&&displayRuns.length?buildOverallPartyRoute(displayRuns):null;
  var state=routeQuickState();
  var excludedVisible=(state.excludedRuns||[]).filter(function(id){
    return allRuns.some(function(run){return run.id===id});
  }).length;
  var excludedCharacterCount=(state.excludedCharacters||[]).length;

  var h='<div class="route-simple-head">'+
      '<div><span>도핑 최소 루트</span><strong>갈 파티만 빠르게 고르세요.</strong><p>캐릭터 선택 → 파티 확인 → 루트 만들기</p></div>'+
    '</div>';

  h+=routeCharacterQuickSelectHtml(allRuns,selectedIds);

  h+='<section class="route-step route-step-parties">'+
    '<div class="route-step-title route-step-title-row">'+
      '<div><span>2</span><div><strong>갈 파티 확인</strong><p>필요 없는 파티만 × 제외하세요.</p></div></div>'+
      ((excludedVisible||excludedCharacterCount)?'<span class="route-exclude-summary">'+
        (excludedCharacterCount?'<b>캐릭터 '+excludedCharacterCount+'명 제외</b>':'')+
        (excludedVisible?'<button type="button" class="route-restore-excluded" data-route-restore-excluded>파티 '+excludedVisible+'개 복구</button>':'')+
      '</span>':'')+
    '</div>';

  if(selectedRuns.length){
    h+='<div class="route-selected-list">'+
      selectedRuns.map(function(run){return routeSelectedPartyHtml(run,focus.name)}).join("")+
    '</div>'+
    '<div class="route-simple-footer">'+
      '<div class="route-selection-summary"><b>'+selectedRuns.length+'</b>개 파티로 이동</div>'+
      '<button type="button" class="route-build-btn" data-route-build>이 파티들로 루트 만들기</button>'+
    '</div>';
  }else{
    var hasCharacters=(state.characters||[]).length>0;
    h+='<div class="route-selection-empty"><strong>'+(hasCharacters?'선택한 캐릭터의 파티를 모두 제외했어요.':'먼저 갈 캐릭터를 선택하세요.')+'</strong>'+
      '<span>'+(hasCharacters?'제외한 파티를 복구하거나 다른 캐릭터를 선택해 보세요.':'캐릭터를 누르면 해당 파티가 자동으로 여기에 모입니다.')+'</span></div>';
  }
  h+='</section>';

  if(ROUTE_RESULT_READY&&route){
    h+='<section class="route-simple-result owner-themed" data-theme="'+theme+'">'+
      '<header><span>'+(ROUTE_LOADED_SLOT?'저장 루트 '+ROUTE_LOADED_SLOT:'추천 루트')+'</span><strong>이 순서대로 돌면 됩니다.</strong></header>'+
      '<div class="route-flow route-party-flow">';

    route.groups.forEach(function(group,index){
      h+=routeTransitionHtml(group.routeTransition,index===0);
      h+='<section class="route-group route-party-group owner-themed" data-theme="'+theme+'">'+
        '<div class="route-group-top">'+
          '<span class="route-order">'+(index+1)+'</span>'+
          '<div class="route-members">'+group.participants.map(function(p){return routeParticipantHtml(p,focus.name)}).join('<span class="route-plus">+</span>')+'</div>'+
        '</div>'+
        '<div class="route-bosses">';
      group.bosses.forEach(function(b){
        h+='<span class="route-boss"><b>'+esc(b.name)+'</b><i>'+esc(b.difficulty)+'</i></span>';
      });
      h+='</div></section>';
    });

    h+='</div><p class="route-note">첫 파티는 인원이 많은 파티로 시작하고, 이후에는 직전 파티와 같은 캐릭터가 가장 많이 남는 순서로 이어집니다. 같은 파티 구성의 보스는 한 번에 묶습니다.</p></section>';
  }

  h+=routeSaveSlotsHtml(ROUTE_RESULT_READY&&displayRuns.length?displayRuns:[]);
  panel.innerHTML=h;
  bindRouteSelection(panel,focus,allRuns,selectedIds);
}
function updatePageView(){
  var checklist=PAGE_VIEW==="checklist",route=PAGE_VIEW==="route",board=PAGE_VIEW==="board";
  var desktop=document.querySelector(".desktop-board");
  var mobile=document.getElementById("mobileBoard");
  var hint=document.getElementById("boardHint");
  var panel=document.getElementById("checklistPanel");
  var routePanel=document.getElementById("routePanel");
  var partyFilter=document.getElementById("partyFilterRow");
  var ownerbar=document.querySelector(".ownerbar");
  var save=document.querySelector(".save-controls");
  if(desktop)desktop.hidden=!board;
  if(mobile)mobile.hidden=!board;
  if(hint)hint.hidden=!board;
  if(panel)panel.hidden=!checklist;
  if(routePanel)routePanel.hidden=!route;
  if(save)save.hidden=!board;
  if(partyFilter)partyFilter.hidden=!board;
  if(ownerbar)ownerbar.hidden=route;

  var pageTitle=document.getElementById("pageTitle"),pageSub=document.getElementById("pageSub");
  if(pageTitle)pageTitle.textContent=checklist?"보스 체크리스트":(route?"도핑 최소 루트":"보스 현황판");
  if(pageSub)pageSub.textContent=checklist?"달력은 일~토 · 보스 초기화는 목요일~수요일":(route?"2인 이상 파티 선택 · 루트 만들기":"주간 최대 12개 · 검은 마법사는 월간");

  Array.prototype.forEach.call(document.querySelectorAll("[data-page-view]"),function(btn){
    btn.classList.toggle("active",btn.dataset.pageView===PAGE_VIEW);
  });

  var boardOnlyIds=["addPlayer","renameOwner","changePinOwner","removeOwner"];
  boardOnlyIds.forEach(function(id){var el=document.getElementById(id);if(el)el.hidden=!board});
}
function setPageView(view){
  PAGE_VIEW=view==="checklist"?"checklist":(view==="route"?"route":"board");
  localStorage.setItem(PAGE_VIEW_KEY,PAGE_VIEW);
  updatePageView();
  render();
  if((PAGE_VIEW==="checklist"||PAGE_VIEW==="board")&&!CHECKLIST_LOADED)loadChecklist(PAGE_VIEW==="checklist");
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
      var out={difficulty:d,count:count,names:names};
      if(v._sync)out._sync=v._sync;
      if(v._originAt&&typeof v._originAt==="string")out._originAt=v._originAt;
      return out;
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
    if((PAGE_VIEW==="checklist"||PAGE_VIEW==="board")&&!CHECKLIST_LOADED)loadChecklist(false);
    document.documentElement.scrollLeft=0;document.body.scrollLeft=0;
    var mb=document.getElementById("mobileBoard");if(mb)mb.scrollLeft=0;
  }});
  var o=owner(),unlocked=o&&isUnlocked(o.id),title=document.getElementById("boardTitle");
  title.className="board-title owner-themed"; if(o)title.setAttribute("data-theme",ownerTheme(o.name)); else title.removeAttribute("data-theme");
  if(PAGE_VIEW==="route"){
    title.innerHTML='전체 2인 이상 파티 <span class="lock-state open">루트 선택</span>';
  }else{
    title.innerHTML=o?esc(o.name)+(PAGE_VIEW==="checklist"?'의 보스 체크리스트':'의 보스 현황')+
      ' <span class="lock-state '+((PAGE_VIEW==="checklist"||unlocked)?"open":"")+'">'+
      (PAGE_VIEW==="checklist"?"비밀번호 없이 체크":(unlocked?"수정 가능":"보기 전용"))+'</span>':"";
  }
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
  if(!planned(c)||SOLO.has(BOSSES[bi]))return "";
  if(!editable){
    return c.count>1?'<span class="compact-party-count">· '+c.count+'인</span>':"";
  }
  return '<span class="compact-party-count-edit"><span class="compact-party-dot">·</span>'+
    '<select class="compact-count compact-count-inline-select" aria-label="파티 인원" data-mobile-count="1" data-b="'+bi+'" data-p="'+pi+'">'+
      '<option value="0" '+(!c.count?"selected":"")+'>인원</option>'+
      [1,2,3,4,5,6].map(function(n){return '<option value="'+n+'" '+(c.count===n?"selected":"")+'>'+n+'인</option>'}).join("")+
    '</select></span>';
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
function boardBossChecked(bossName,pi){
  var o=owner(),st=state();
  if(!o||!st||!CHECKLIST_LOADED||!st.players[pi])return false;
  return !!bossRunItem(o.id,currentBossWeekStart(),String(st.players[pi]),bossName).completed;
}
function sharedPartyBossTargets(bossName,pi){
  var currentOwner=owner(),st=state();
  if(!currentOwner||!st)return[];
  var cell=st.cells[bossName]&&st.cells[bossName][pi];
  var selfName=String(st.players[pi]||"").trim();
  if(!cell||!selfName||!isMultiPartyCell(cell))return[];

  var participantNames=[selfName].concat(
    (cell.names||[]).slice(0,Math.max(0,Number(cell.count||0)-1))
  );
  var targets=[],seen={};

  participantNames.forEach(function(rawName){
    var characterName=String(rawName||"").trim();
    if(!characterName||characterName==="미정")return;

    var targetOwner=characterName===selfName?currentOwner:characterOwner(characterName);
    if(!targetOwner||!targetOwner.board)return;

    var targetPi=(targetOwner.board.players||[]).findIndex(function(name){
      return String(name||"").trim()===characterName;
    });
    if(targetPi<0)return;

    var targetCell=targetOwner.board.cells[bossName]&&targetOwner.board.cells[bossName][targetPi];
    if(!planned(targetCell))return;

    var key=targetOwner.id+"|"+characterName;
    if(seen[key])return;
    seen[key]=1;
    targets.push({
      ownerId:targetOwner.id,
      ownerName:targetOwner.name,
      characterName:characterName,
      pi:targetPi,
      cell:targetCell,
      payout:Math.round(bossWeeklyIncome(bossName,targetCell))
    });
  });

  return targets;
}
function saveSharedPartyBossCheck(bossName,pi,completed){
  var weekStart=currentBossWeekStart(),runDate=koreaDateKey();
  var targets=sharedPartyBossTargets(bossName,pi);
  if(targets.length<=1){
    var o=owner(),st=state();
    if(!o||!st)return;
    saveBossRunCheck(weekStart,runDate,String(st.players[pi]||""),bossName,pi,completed);
    return;
  }

  var before=targets.map(function(t){
    return {
      target:t,
      item:JSON.parse(JSON.stringify(bossRunItem(t.ownerId,weekStart,t.characterName,bossName)))
    };
  });

  before.forEach(function(x){
    setBossRunItem(x.target.ownerId,weekStart,x.target.characterName,bossName,{
      completed:completed,
      meso:completed?x.target.payout:0,
      runDate:completed?runDate:(x.item.runDate||weekStart)
    });
  });

  var groups={};
  targets.forEach(function(t){
    if(!groups[t.ownerId])groups[t.ownerId]=[];
    groups[t.ownerId].push({
      characterName:t.characterName,
      bossName:bossName,
      completed:completed,
      mesoEarned:completed?t.payout:0
    });
  });

  CHECKLIST_SAVING="party|"+weekStart+"|"+bossName+"|"+targets.map(function(t){return t.characterName}).join(",");
  renderBossCheckState();

  Promise.all(Object.keys(groups).map(function(ownerId){
    return callApi("save_boss_run_bulk",{
      ownerId:ownerId,
      weekStart:weekStart,
      runDate:runDate,
      items:groups[ownerId]
    });
  })).then(function(responses){
    responses.forEach(function(data){
      (data.items||[]).forEach(function(item){
        setBossRunItem(
          item.owner_id,
          item.week_start,
          String(item.character_name||""),
          String(item.boss_name||""),
          {
            completed:!!item.completed,
            meso:Math.max(0,Number(item.meso_earned)||0),
            runDate:String(item.run_date||runDate)
          }
        );
      });
    });
    toast(bossName+" · 공용 파티 "+targets.length+"명 "+(completed?"같이 체크했어요.":"같이 해제했어요."));
  }).catch(function(e){
    before.forEach(function(x){
      setBossRunItem(x.target.ownerId,weekStart,x.target.characterName,bossName,x.item);
    });
    toast(e.message||"공용 파티 체크를 저장하지 못했습니다.");
    loadChecklist(false);
  }).finally(function(){
    CHECKLIST_SAVING="";
    renderBossCheckState();
  });
}
function toggleBoardBossCheck(bi,pi){
  var o=owner(),st=state();
  if(!o||!st||isUnlocked(o.id)||CHECKLIST_SAVING)return;
  var boss=BOSSES[bi],cell=st.cells[boss]&&st.cells[boss][pi];
  if(!boss||!planned(cell))return;
  if(!CHECKLIST_LOADED){
    toast("보스 체크 상태를 불러오는 중이에요.");
    loadChecklist(false);
    return;
  }
  var characterName=String(st.players[pi]||"");
  if(!characterName)return;
  var weekStart=currentBossWeekStart(),runDate=koreaDateKey();
  var completed=!!bossRunItem(o.id,weekStart,characterName,boss).completed;
  if(isMultiPartyCell(cell)){
    saveSharedPartyBossCheck(boss,pi,!completed);
  }else{
    saveBossRunCheck(weekStart,runDate,characterName,boss,pi,!completed);
  }
}
function compactBossCard(b,bi,c,pi,unlocked){
  var auto=!!c._sync,editable=unlocked&&!auto,mon=MONTHLY.has(b);
  var checkable=!unlocked&&planned(c),checked=checkable&&boardBossChecked(b,pi);
  var sync="";
  if(auto&&unlocked){
    var so=c._sync.sourceOwnerName||"";
    var sp=c._sync.sourcePlayer||"";
    sync='<span class="compact-sync">↔ 자동 연동'+(so?' · '+esc(so):'')+(sp?' · '+esc(sp):'')+'</span>';
  }
  var income='<span class="compact-income-slot"></span>';
  if(planned(c)){
    var price=crystalBasePrice(b,c.difficulty);
    income=price
      ?'<span class="compact-income-slot"><span class="compact-income">'+formatEok(bossWeeklyIncome(b,c))+'</span></span>'
      :'<span class="compact-income-slot"><span class="compact-income missing">미등록</span></span>';
  }
  return '<article class="compact-boss-card '+(planned(c)?"is-set ":"is-empty ")+(auto?"is-sync ":"")+(mon?"is-monthly ":"")+(checkable?"is-checkable ":"")+(checked?"is-cleared":"")+'" '+(checkable?'data-board-check-bi="'+bi+'" data-board-check-pi="'+pi+'" aria-pressed="'+(checked?"true":"false")+'" title="클릭해서 이번 주 보스 체크"':"")+'>'+
    '<div class="compact-main">'+
      compactDifficultySelect(c,editable,bi,pi)+
      '<div class="compact-name-wrap"><div class="compact-title-line"><strong class="compact-boss-name">'+esc(b)+'</strong>'+compactCountSelect(c,editable,bi,pi)+'</div>'+sync+'</div>'+
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
  var o=owner(),unlocked=isUnlocked(o.id),theme=ownerTheme(o.name),partyOnly=PARTY_ONLY;
  var visible=[];
  st.players.forEach(function(p,pi){
    var full=weekly(pi)>=LIMIT;
    var bosses=BOSSES.filter(function(b){
      var c=st.cells[b][pi]||emptyCell();
      if(partyOnly)return isMultiPartyCell(c);
      if(full && !MONTHLY.has(b) && !planned(c))return false;
      return true;
    });
    if(!partyOnly||bosses.length)visible.push({p:p,pi:pi,bosses:bosses});
  });

  var ownerIncome=ownerWeeklyIncome(),ownerMissing=ownerMissingPriceCount();
  var h='<div class="desktop-board-meta"><div><strong>'+esc(o.name)+' 캐릭터 보드</strong><span>'+st.players.length+'명</span><b class="owner-weekly-total">총 주간 '+formatEok(ownerIncome)+(ownerMissing?' · 미등록 '+ownerMissing+'건':'')+'</b></div><div>'+(partyOnly?'2인 이상 파티 '+partyOnlyCount()+'건':'주간 최대 '+LIMIT+'개 · 검은 마법사 월간')+'</div></div>';
  if(partyOnly&&!visible.length){
    root.innerHTML=h+'<div class="party-filter-empty"><strong>2인 이상 파티가 없어요.</strong><span>버튼을 다시 누르면 전체 보스를 볼 수 있어요.</span></div>';
    return;
  }
  var cols=visible.length,rowCols=desktopRowColumns(cols);
  h+='<div class="character-columns '+(partyOnly?"is-party-filtered":"")+'" style="--cols:'+cols+';--row-cols:'+rowCols+'">';
  visible.forEach(function(item){
    var p=item.p,pi=item.pi,w=weekly(pi),m=monthly(pi);
    var charIncome=characterWeeklyIncome(pi),missingPrices=characterMissingPriceCount(pi);
    h+='<section class="character-column owner-themed" data-theme="'+theme+'" data-character-index="'+pi+'">'+
      '<header class="character-column-head">'+
        '<div class="character-title-row">'+
          '<span class="drag-dots '+(unlocked&&!partyOnly?"order-enabled":"")+'" '+(unlocked&&!partyOnly?'draggable="true" data-drag-character="'+pi+'" title="드래그해서 캐릭터 순서 변경"':'aria-hidden="true"')+'>⠿</span>'+
          '<input class="column-player-name player-input" data-player="'+pi+'" value="'+esc(p)+'" '+(unlocked?"":"disabled")+'>'+
          (pi===0?'<span class="representative-badge">대표</span>':'')+
          (w>=LIMIT?'<span class="complete-badge">완료</span>':'')+
          '<strong class="column-count '+(w>=LIMIT?"full":"")+'">'+w+'/'+LIMIT+'</strong>'+
          '<button class="remove-player column-remove" data-remove="'+pi+'" '+(unlocked?"":"disabled")+' aria-label="캐릭터 삭제">×</button>'+
        '</div>'+
        '<div class="column-sub"><span>주간 수익 '+formatEok(charIncome)+(missingPrices?' · 미등록 '+missingPrices+'건':'')+'</span></div>'+
      '</header>'+
      '<div class="character-boss-list">';
    var weeklyBosses=item.bosses.filter(function(b){return !MONTHLY.has(b)});
    var monthlyBosses=item.bosses.filter(function(b){return MONTHLY.has(b)});

    if(weeklyBosses.length){
      h+='<div class="boss-section-label boss-section-weekly"><strong>주간 보스</strong><span>'+w+'/'+LIMIT+'</span></div>';
      weeklyBosses.forEach(function(b){
        var bi=BOSSES.indexOf(b),c=st.cells[b][pi]||emptyCell();
        h+=compactBossCard(b,bi,c,pi,unlocked);
      });
    }
    if(monthlyBosses.length){
      h+='<div class="boss-section-label boss-section-monthly"><strong>월간 보스</strong><span>'+m+'/1</span></div>';
      monthlyBosses.forEach(function(b){
        var bi=BOSSES.indexOf(b),c=st.cells[b][pi]||emptyCell();
        h+=compactBossCard(b,bi,c,pi,unlocked);
      });
    }
    h+='</div></section>';
  });
  if(unlocked)h+='<button class="add-character-column" data-add-character="1"><strong>＋ 캐릭터 추가</strong><span>새 캐릭터 열 만들기</span></button>';
  h+='</div>';
  root.innerHTML=h;
  bindCommon(root);
  bindCharacterReorder(root,unlocked&&!partyOnly);
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
  var unlocked=isUnlocked(o.id),theme=ownerTheme(o.name),partyOnly=PARTY_ONLY;

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
  var weeklyList=BOSSES.filter(function(b){
    if(MONTHLY.has(b))return false;
    var c=st.cells[b][pi]||emptyCell();
    if(partyOnly)return isMultiPartyCell(c);
    if(w>=LIMIT&&!planned(c))return false;
    return true;
  });
  var monthlyList=BOSSES.filter(function(b){
    if(!MONTHLY.has(b))return false;
    if(!partyOnly)return true;
    return isMultiPartyCell(st.cells[b][pi]||emptyCell());
  });

  if(weeklyList.length){
    list+='<div class="boss-section-label boss-section-weekly"><strong>주간 보스</strong><span>'+w+'/'+LIMIT+'</span></div>';
    weeklyList.forEach(function(b){
      var bi=BOSSES.indexOf(b),c=st.cells[b][pi]||emptyCell();
      list+=compactBossCard(b,bi,c,pi,unlocked);
    });
  }
  if(monthlyList.length){
    list+='<div class="boss-section-label boss-section-monthly"><strong>월간 보스</strong><span>'+m+'/1</span></div>';
    monthlyList.forEach(function(b){
      var bi=BOSSES.indexOf(b),c=st.cells[b][pi]||emptyCell();
      list+=compactBossCard(b,bi,c,pi,unlocked);
    });
  }
  if(partyOnly&&!weeklyList.length&&!monthlyList.length){
    list+='<div class="party-filter-empty compact"><strong>2인 이상 파티가 없어요.</strong><span>다른 캐릭터를 선택하거나 필터를 해제해 주세요.</span></div>';
  }
  list+='</div>';

  box.innerHTML=strip+summary+list;
  Array.prototype.forEach.call(box.querySelectorAll("[data-char]"),function(btn){
    btn.onclick=function(){setActiveChar(+btn.dataset.char)};
  });
  bindCommon(box);
}
function render(){
  renderOwners();
  updatePageView();
  if(PAGE_VIEW==="checklist"){
    renderChecklist();
  }else if(PAGE_VIEW==="route"){
    renderPartyRoute();
  }else{
    renderDesktop();renderMobile();updatePartyFilterUI();
  }
}

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
  Array.prototype.forEach.call(root.querySelectorAll("[data-board-check-bi]"),function(card){
    card.onclick=function(e){
      if(e.target&&e.target.closest&&e.target.closest("button,select,input"))return;
      toggleBoardBossCheck(+card.dataset.boardCheckBi,+card.dataset.boardCheckPi);
    };
  });
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

var partyOnlyBtn=document.getElementById("partyOnlyBtn");
if(partyOnlyBtn)partyOnlyBtn.addEventListener("click",togglePartyOnly);

Array.prototype.forEach.call(document.querySelectorAll("[data-page-view]"),function(btn){
  btn.onclick=function(){setPageView(btn.dataset.pageView)};
});

window.addEventListener("resize",function(){clearTimeout(window.__bossResize);window.__bossResize=setTimeout(guardedRender,120)});
window.addEventListener("pageshow",function(e){if(e.persisted)loadRemote(false)});
window.addEventListener("beforeunload",function(e){
  if(!dirty)return;
  e.preventDefault();
  e.returnValue="";
});

var themeToggle=document.getElementById("themeToggle");
if(themeToggle)themeToggle.onclick=toggleTheme;
applyTheme(THEME_MODE);

function startPolling(){
  clearInterval(pollTimer);
  pollTimer=setInterval(function(){
    if(document.hidden||dirty||saving||SELECT_ACTIVE)return;
    if(PAGE_VIEW==="checklist"){
      loadChecklist(false);
    }else if(PAGE_VIEW==="board"){
      loadRemote(false);
      loadChecklist(false);
    }else{
      loadRemote(false);
    }
  },4000);
}
loadRemote(true).then(function(){
  updatePageView();
  if(PAGE_VIEW==="checklist")return loadChecklist(true);
  if(PAGE_VIEW==="board")return loadChecklist(false);
}).then(startPolling);
})();