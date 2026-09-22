import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/+esm";

const SUPABASE_URL="https://ibqpjcedzcllacbamrnu.supabase.co";
const SUPABASE_KEY="sb_publishable_s-EiUNh66D17Xd3JFGUyvA_aNEDNMKq";
const API_URL=SUPABASE_URL+"/functions/v1/boss-board-api";

const BOSSES=["스우","데미안","루시드","윌","더스크","진힐라","듄켈","세렌","칼로스","카링","림보","대적자","흉성","벨로나","검은 마법사"];
const MONTHLY=new Set(["검은 마법사"]);
const SOLO=new Set(["데미안","루시드","윌","더스크","진힐라","듄켈"]);
const LIMIT=12;
const DIFFS=["","x","이지","노말","하드","카오스","익스트림"];
const ACTIVE_KEY="boss-board-active-owner-v5";
const PIN_PREFIX="boss-board-pin-";

const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
});

let APP={owners:[]};
let activeOwnerId=localStorage.getItem(ACTIVE_KEY)||"";
let saveTimer=null;
let refreshTimer=null;
let dirty=false;
let saving=false;

function clone(v){return JSON.parse(JSON.stringify(v))}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function toast(m){const e=document.getElementById("toast");e.textContent=m;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),1900)}
function pinKey(id){return PIN_PREFIX+id}
function getPin(id){return sessionStorage.getItem(pinKey(id))||""}
function setPin(id,pin){sessionStorage.setItem(pinKey(id),pin)}
function clearPin(id){sessionStorage.removeItem(pinKey(id))}
function isUnlocked(id){return !!getPin(id)}
function owner(){return APP.owners.find(o=>o.id===activeOwnerId)||APP.owners[0]||null}
function state(){return owner()?.board||null}
function planned(c){return !!c&&c.difficulty!==""&&c.difficulty!=="x"}

function emptyCell(){return{difficulty:"",count:0,names:[]}}
function normalizeBoard(board,name){
  const players=Array.isArray(board?.players)&&board.players.length?board.players.map((p,i)=>String(p||("캐릭터 "+(i+1)))):[name];
  const cells={};
  for(const b of BOSSES){
    const src=Array.isArray(board?.cells?.[b])?board.cells[b]:[];
    cells[b]=players.map((_,i)=>{
      const v=src[i]||emptyCell();
      const d=typeof v.difficulty==="string"?v.difficulty:"";
      let count=Math.max(0,Math.min(6,Number(v.count)||0));
      if(!d||d==="x")count=0;
      if(SOLO.has(b)&&d&&d!=="x")count=1;
      const names=Array.isArray(v.names)?v.names.map(x=>String(x).trim()).filter(Boolean).slice(0,Math.max(0,count-1)):[];
      const out={difficulty:d,count,names};
      if(v._sync)out._sync=v._sync;
      return out;
    });
  }
  return{players,cells};
}

async function callApi(action,payload={}){
  const res=await fetch(API_URL,{
    method:"POST",
    headers:{"Content-Type":"application/json","apikey":SUPABASE_KEY},
    body:JSON.stringify({action,...payload})
  });
  let data={};
  try{data=await res.json()}catch{}
  if(!res.ok){
    const err=new Error(data.error||("요청 실패 ("+res.status+")"));
    err.status=res.status;
    throw err;
  }
  return data;
}

function applyPayload(data){
  APP.owners=(data.owners||[]).map(o=>({...o,board:normalizeBoard(o.board,o.name)}));
  if(!APP.owners.some(o=>o.id===activeOwnerId)){
    activeOwnerId=APP.owners[0]?.id||"";
    if(activeOwnerId)localStorage.setItem(ACTIVE_KEY,activeOwnerId);
  }
}

async function loadRemote(show=true){
  if(show){
    document.getElementById("saveText").textContent="공용 DB 불러오는 중…";
    document.getElementById("board").innerHTML='<tbody><tr><td class="loading">보스판을 불러오는 중…</td></tr></tbody>';
  }
  try{
    const data=await callApi("bootstrap");
    applyPayload(data);
    dirty=false;
    render();
    document.getElementById("saveText").textContent="공용 DB에 연결됨";
  }catch(e){
    document.getElementById("saveText").textContent="DB 연결 실패";
    toast(e.message||"보스판을 불러오지 못했습니다.");
  }
}

async function ensureUnlocked(){
  const o=owner();
  if(!o)return false;
  if(isUnlocked(o.id))return true;
  const pin=prompt("“"+o.name+"” 보스판 수정 비밀번호를 입력해 주세요.");
  if(pin===null)return false;
  try{
    await callApi("verify",{ownerId:o.id,pin:String(pin)});
    setPin(o.id,String(pin));
    render();
    toast(o.name+" 보스판 수정 잠금을 해제했어요.");
    return true;
  }catch(e){
    clearPin(o.id);
    toast(e.message||"비밀번호가 맞지 않습니다.");
    return false;
  }
}

function weekly(pi,except){
  const st=state();
  if(!st)return 0;
  return BOSSES.reduce((n,b)=>b===except||MONTHLY.has(b)?n:n+(planned(st.cells[b]?.[pi])?1:0),0);
}
function monthly(pi){
  const st=state();
  if(!st)return 0;
  return BOSSES.reduce((n,b)=>n+(MONTHLY.has(b)&&planned(st.cells[b]?.[pi])?1:0),0);
}

function queueSave(delay=450){
  if(!isUnlocked(owner()?.id))return;
  dirty=true;
  clearTimeout(saveTimer);
  document.getElementById("saveText").textContent="변경사항 저장 중…";
  saveTimer=setTimeout(saveBoardNow,delay);
}

async function saveBoardNow(){
  const o=owner(),st=state();
  if(!o||!st||saving||!dirty)return;
  const pin=getPin(o.id);
  if(!pin)return;
  saving=true;
  try{
    const data=await callApi("save_board",{ownerId:o.id,pin,board:st});
    applyPayload(data);
    dirty=false;
    document.getElementById("saveText").textContent="공용 DB에 저장됨";
    render();
  }catch(e){
    if(e.status===401){
      clearPin(o.id);
      toast("비밀번호 확인이 풀렸어요. 다시 잠금을 해제해 주세요.");
      await loadRemote(false);
    }else{
      toast(e.message||"저장하지 못했습니다.");
      document.getElementById("saveText").textContent="저장 실패";
    }
  }finally{
    saving=false;
  }
}

function renderOwners(){
  const el=document.getElementById("ownerTabs");
  el.innerHTML=APP.owners.map(o=>
    '<button class="owner-tab '+(o.id===activeOwnerId?"active ":"")+(isUnlocked(o.id)?"unlocked":"locked")+'" data-owner="'+esc(o.id)+'">'+esc(o.name)+'</button>'
  ).join("");
  el.querySelectorAll("[data-owner]").forEach(b=>{
    b.onclick=()=>{
      if(dirty){toast("저장 중인 변경사항이 있어요.");return}
      activeOwnerId=b.dataset.owner;
      localStorage.setItem(ACTIVE_KEY,activeOwnerId);
      render();
    };
  });

  const o=owner();
  const unlocked=o&&isUnlocked(o.id);
  const title=document.getElementById("boardTitle");
  title.innerHTML=o
    ? esc(o.name)+'의 보스 현황 <span class="lock-state '+(unlocked?"open":"")+'">'+(unlocked?"수정 가능":"보기 전용")+'</span>'
    :"";

  const ub=document.getElementById("unlockOwner");
  ub.textContent=unlocked?"수정 잠그기":"수정 잠금 해제";
  document.getElementById("renameOwner").disabled=!unlocked;
  document.getElementById("removeOwner").disabled=!unlocked;
  document.getElementById("addPlayer").disabled=!unlocked;
}

function members(c,bi,pi,editable){
  if(!c.count)return'<div class="solo">인원수 선택</div>';
  if(c.count===1)return'<div class="solo">본인 단독</div>';
  let h='<div class="member-list">';
  for(let i=0;i<c.count-1;i++){
    h+='<input class="member" data-b="'+bi+'" data-p="'+pi+'" data-m="'+i+'" value="'+esc(c.names[i]||"")+'" placeholder="파티원 '+(i+1)+' 이름" '+(editable?"":"disabled")+'>';
  }
  return h+"</div>";
}

function render(){
  renderOwners();
  const st=state();
  if(!st){
    document.getElementById("board").innerHTML='<tbody><tr><td class="loading">보스판이 없습니다.</td></tr></tbody>';
    return;
  }
  const unlocked=isUnlocked(owner().id);
  let h='<thead><tr><th class="boss-head">BOSS</th>';
  st.players.forEach((p,i)=>{
    const w=weekly(i),m=monthly(i);
    h+='<th class="player-head"><div class="player-row"><input class="player-input" data-player="'+i+'" value="'+esc(p)+'" '+(unlocked?"":"disabled")+'><button class="remove-player" data-remove="'+i+'" '+(unlocked?"":"disabled")+'>×</button></div><div class="sub"><span class="'+(w>=LIMIT?"full":"")+'">주간 '+w+"/"+LIMIT+"</span> · 월간 "+m+"/1</div></th>";
  });
  h+="</tr></thead><tbody>";

  BOSSES.forEach((b,bi)=>{
    const mon=MONTHLY.has(b);
    h+='<tr class="'+(mon?"monthly-row":"")+'"><td class="boss"><div class="boss-name"><span>'+b+'</span><span class="badge '+(mon?"monthly":"")+'">'+(mon?"월간":"주간")+"</span></div></td>";
    st.players.forEach((_,pi)=>{
      const c=st.cells[b][pi]||emptyCell();
      const auto=!!c._sync;
      const editable=unlocked&&!auto;
      const opts=DIFFS.map(x=>'<option value="'+esc(x)+'" '+(x===c.difficulty?"selected":"")+'>'+(x||"—")+"</option>").join("");
      let party;
      if(SOLO.has(b)){
        party='<div class="solo">'+(planned(c)?"1인 고정":"난이도 선택 시 1인")+"</div>";
      }else{
        const counts=[1,2,3,4,5,6].map(n=>
          '<label class="count"><input type="radio" name="c-'+bi+"-"+pi+'" data-count="'+n+'" data-b="'+bi+'" data-p="'+pi+'" '+(c.count===n?"checked ":"")+(editable?"":"disabled")+"><span>'+n+"인</span></label>"
        ).join("");
        party='<div class="counts">'+counts+"</div>"+members(c,bi,pi,editable);
      }
      if(auto){
        party+='<div class="sync-note">↔ '+esc(c._sync.sourceOwnerName||c._sync.sourcePlayer||"다른 보스판")+'에서 자동 연동</div>';
      }
      h+='<td class="slot"><div class="slot-grid"><select class="difficulty" data-b="'+bi+'" data-p="'+pi+'" data-v="'+esc(c.difficulty)+'" '+(editable?"":"disabled")+'>'+opts+'</select><div class="party">'+party+"</div></div></td>";
    });
    h+="</tr>";
  });
  h+="</tbody>";
  document.getElementById("board").innerHTML=h;
  bind();
}

function bind(){
  const st=state();
  if(!st)return;
  document.querySelectorAll(".player-input:not(:disabled)").forEach(e=>{
    e.oninput=()=>{st.players[+e.dataset.player]=e.value;queueSave()};
  });

  document.querySelectorAll(".difficulty:not(:disabled)").forEach(e=>{
    e.onchange=()=>{
      const b=BOSSES[+e.dataset.b],pi=+e.dataset.p,c=st.cells[b][pi],n=e.value;
      if(!MONTHLY.has(b)&&n&&n!=="x"&&!planned(c)&&weekly(pi,b)>=LIMIT){
        toast("주간 보스는 최대 "+LIMIT+"개까지만 선택할 수 있어요.");
        render();
        return;
      }
      c.difficulty=n;
      if(!n||n==="x"){c.count=0;c.names=[]}
      else if(SOLO.has(b)){c.count=1;c.names=[]}
      queueSave(100);
      render();
    };
  });

  document.querySelectorAll("[data-count]:not(:disabled)").forEach(e=>{
    e.onchange=()=>{
      if(!e.checked)return;
      const b=BOSSES[+e.dataset.b],pi=+e.dataset.p,c=st.cells[b][pi],n=+e.dataset.count;
      c.count=n;
      c.names=(c.names||[]).slice(0,Math.max(0,n-1));
      while(c.names.length<n-1)c.names.push("");
      queueSave(100);
      render();
    };
  });

  document.querySelectorAll(".member:not(:disabled)").forEach(e=>{
    e.oninput=()=>{
      const b=BOSSES[+e.dataset.b];
      st.cells[b][+e.dataset.p].names[+e.dataset.m]=e.value;
      queueSave();
    };
  });

  document.querySelectorAll("[data-remove]:not(:disabled)").forEach(e=>{
    e.onclick=()=>{
      const i=+e.dataset.remove;
      if(st.players.length<=1){toast("캐릭터는 1명 이상 있어야 해요.");return}
      if(!confirm("“"+(st.players[i]||"캐릭터")+"” 열을 삭제할까요?"))return;
      st.players.splice(i,1);
      BOSSES.forEach(b=>st.cells[b].splice(i,1));
      queueSave(100);
      render();
    };
  });
}

document.getElementById("unlockOwner").onclick=async()=>{
  const o=owner();
  if(!o)return;
  if(isUnlocked(o.id)){
    if(dirty)await saveBoardNow();
    clearPin(o.id);
    render();
    toast("수정을 잠갔어요.");
  }else{
    await ensureUnlocked();
  }
};

document.getElementById("addOwner").onclick=async()=>{
  const current=owner();
  if(!current)return;
  if(!(await ensureUnlocked()))return;
  const name=(prompt("새 보스판의 주인 이름을 입력해 주세요. 예: 웃토")||"").trim();
  if(!name)return;
  const newPin=(prompt("“"+name+"”의 수정 비밀번호를 숫자 4~12자리로 입력해 주세요.")||"").trim();
  if(!/^\d{4,12}$/.test(newPin)){toast("비밀번호는 숫자 4~12자리로 입력해 주세요.");return}
  try{
    const data=await callApi("create_owner",{
      authorizingOwnerId:current.id,
      pin:getPin(current.id),
      name,
      newPin
    });
    applyPayload(data);
    activeOwnerId=data.newOwnerId;
    localStorage.setItem(ACTIVE_KEY,activeOwnerId);
    setPin(activeOwnerId,newPin);
    render();
    toast(name+" 보스판을 만들었어요.");
  }catch(e){toast(e.message||"새 보스판을 만들지 못했습니다.")}
};

document.getElementById("renameOwner").onclick=async()=>{
  const o=owner();
  if(!o||!isUnlocked(o.id))return;
  const newName=(prompt("주인 이름을 수정해 주세요.",o.name)||"").trim();
  if(!newName||newName===o.name)return;
  try{
    const data=await callApi("rename_owner",{ownerId:o.id,pin:getPin(o.id),newName});
    applyPayload(data);
    render();
    toast("주인 이름을 변경했어요.");
  }catch(e){toast(e.message||"이름을 변경하지 못했습니다.")}
};

document.getElementById("removeOwner").onclick=async()=>{
  const o=owner();
  if(!o||!isUnlocked(o.id))return;
  if(!confirm("“"+o.name+"” 보스판 전체를 삭제할까요?"))return;
  try{
    const data=await callApi("delete_owner",{ownerId:o.id,pin:getPin(o.id)});
    clearPin(o.id);
    applyPayload(data);
    activeOwnerId=APP.owners[0]?.id||"";
    if(activeOwnerId)localStorage.setItem(ACTIVE_KEY,activeOwnerId);
    render();
    toast("보스판을 삭제했어요.");
  }catch(e){toast(e.message||"보스판을 삭제하지 못했습니다.")}
};

document.getElementById("addPlayer").onclick=()=>{
  if(!isUnlocked(owner()?.id))return;
  const st=state();
  st.players.push("새 닉네임");
  BOSSES.forEach(b=>st.cells[b].push(emptyCell()));
  render();
  queueSave(100);
  setTimeout(()=>{
    const a=document.querySelectorAll(".player-input:not(:disabled)");
    const e=a[a.length-1];
    if(e){e.focus();e.select()}
  },0);
};

document.getElementById("reloadBtn").onclick=async()=>{
  if(dirty&& !confirm("아직 저장 중인 변경사항이 있습니다. DB 내용을 다시 불러올까요?"))return;
  await loadRemote(true);
};

document.getElementById("shareBtn").onclick=async()=>{
  const url=location.origin+location.pathname;
  try{
    if(navigator.share){
      await navigator.share({title:"보스 현황판",url});
    }else{
      await navigator.clipboard.writeText(url);
      toast("홈페이지 주소를 복사했어요.");
    }
  }catch(e){
    try{await navigator.clipboard.writeText(url);toast("홈페이지 주소를 복사했어요.")}catch{}
  }
};

function scheduleRemoteRefresh(){
  clearTimeout(refreshTimer);
  refreshTimer=setTimeout(async()=>{
    if(dirty||saving){scheduleRemoteRefresh();return}
    await loadRemote(false);
  },350);
}

supabase
  .channel("boss-board-live")
  .on("postgres_changes",{event:"*",schema:"public",table:"boss_boards"},scheduleRemoteRefresh)
  .on("postgres_changes",{event:"*",schema:"public",table:"boss_owners"},scheduleRemoteRefresh)
  .subscribe(status=>{
    if(status==="SUBSCRIBED")document.getElementById("saveText").textContent="공용 DB 실시간 연결됨";
  });

await loadRemote(true);
