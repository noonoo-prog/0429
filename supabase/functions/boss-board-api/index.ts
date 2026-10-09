import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const BOSSES = ["스우","데미안","가엔슬","루시드","윌","더스크","진힐라","듄켈","세렌","칼로스","대적자","카링","흉성","벨로나","림보","발드릭스","유피테르","검은 마법사"];
const BOSS_DIFFICULTIES:any = {
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
const SOLO = new Set(["데미안","루시드","윌","더스크","진힐라","듄켈"]);
const MONTHLY = new Set(["검은 마법사"]);
const SYNC_OWNER_PRIORITY = ["츠죠","오똑","피콕","띵스","꿈품은","달하늘의별을"];
function syncOwnerRank(name:string){
  const i=SYNC_OWNER_PRIORITY.indexOf(String(name||""));
  return i>=0?i:999;
}
const enc = new TextEncoder();

const INITIAL = {
  players:["오똑","쇼똑","오뿡","옥수수목금","파똑"],
  cells:{
    "스우":[
      {difficulty:"익스트림",count:1,names:[]},
      {difficulty:"익스트림",count:2,names:["키네달별"]},
      {difficulty:"익스트림",count:2,names:["웃토"]},
      {difficulty:"익스트림",count:2,names:["콩국수목금"]},
      {difficulty:"익스트림",count:2,names:["달하늘의치킨"]}
    ],
    "데미안":[
      {difficulty:"x",count:0,names:[]},{difficulty:"x",count:0,names:[]},{difficulty:"x",count:0,names:[]},{difficulty:"",count:0,names:[]},{difficulty:"",count:0,names:[]}
    ],
    "루시드":[
      {difficulty:"하드",count:1,names:[]},{difficulty:"하드",count:1,names:[]},{difficulty:"하드",count:1,names:[]},{difficulty:"하드",count:1,names:[]},{difficulty:"하드",count:1,names:[]}
    ],
    "윌":[
      {difficulty:"하드",count:1,names:[]},{difficulty:"하드",count:1,names:[]},{difficulty:"하드",count:1,names:[]},{difficulty:"하드",count:1,names:[]},{difficulty:"하드",count:1,names:[]}
    ],
    "더스크":[
      {difficulty:"하드",count:1,names:[]},{difficulty:"하드",count:1,names:[]},{difficulty:"하드",count:1,names:[]},{difficulty:"하드",count:1,names:[]},{difficulty:"하드",count:1,names:[]}
    ],
    "진힐라":[
      {difficulty:"하드",count:1,names:[]},{difficulty:"하드",count:1,names:[]},{difficulty:"하드",count:1,names:[]},{difficulty:"하드",count:1,names:[]},{difficulty:"하드",count:1,names:[]}
    ],
    "듄켈":[
      {difficulty:"x",count:0,names:[]},{difficulty:"x",count:0,names:[]},{difficulty:"하드",count:1,names:[]},{difficulty:"",count:0,names:[]},{difficulty:"",count:0,names:[]}
    ],
    "세렌":[
      {difficulty:"익스트림",count:3,names:["츠죠","웃토"]},
      {difficulty:"익스트림",count:3,names:["피콕","꿈품은"]},
      {difficulty:"하드",count:1,names:[]},
      {difficulty:"",count:0,names:[]},{difficulty:"",count:0,names:[]}
    ],
    "칼로스":[
      {difficulty:"카오스",count:2,names:["츠죠"]},
      {difficulty:"노말",count:1,names:[]},
      {difficulty:"노말",count:1,names:[]},
      {difficulty:"",count:0,names:[]},{difficulty:"",count:0,names:[]}
    ],
    "카링":[
      {difficulty:"하드",count:4,names:["피콕","츠죠","꿈품은"]},
      {difficulty:"노말",count:3,names:["웃토","츠죡"]},
      {difficulty:"이지",count:1,names:[]},
      {difficulty:"",count:0,names:[]},{difficulty:"",count:0,names:[]}
    ],
    "림보":[
      {difficulty:"노말",count:2,names:["츠죠"]},
      {difficulty:"노말",count:3,names:["꿈품은","렌별달"]},
      {difficulty:"x",count:0,names:[]},
      {difficulty:"",count:0,names:[]},{difficulty:"",count:0,names:[]}
    ],
    "대적자":[
      {difficulty:"하드",count:3,names:["츠죠","꿈품은"]},
      {difficulty:"노말",count:1,names:[]},
      {difficulty:"노말",count:1,names:[]},
      {difficulty:"",count:0,names:[]},{difficulty:"",count:0,names:[]}
    ],
    "흉성":[
      {difficulty:"노말",count:1,names:[]},
      {difficulty:"노말",count:2,names:["달하늘의치킨"]},
      {difficulty:"노말",count:2,names:["미정"]},
      {difficulty:"",count:0,names:[]},{difficulty:"",count:0,names:[]}
    ],
    "벨로나":[
      {difficulty:"노말",count:2,names:["츠죡"]},
      {difficulty:"이지",count:1,names:[]},
      {difficulty:"이지",count:1,names:[]},
      {difficulty:"",count:0,names:[]},{difficulty:"",count:0,names:[]}
    ],
    "검은 마법사":[
      {difficulty:"익스트림",count:4,names:["웃토","꿈쉐릴","키네달별"]},
      {difficulty:"익스트림",count:3,names:["츠죠","달하늘의치킨"]},
      {difficulty:"익스트림",count:3,names:["피콕","츠죠"]},
      {difficulty:"",count:0,names:[]},{difficulty:"",count:0,names:[]}
    ]
  }
};

const cors = {
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};

async function postgrestFetch(input:any,init?:any):Promise<Response>{
  const retryDelays=[250,600,1200];
  for(let attempt=0;;attempt++){
    const res=await fetch(input,init);
    if(attempt>=retryDelays.length) return res;
    if(res.status===500||res.status===401){
      let body="";
      try{ body=await res.clone().text(); }catch{}
      if(body.includes("PGRST303")||body.includes("JWT issued at future")){
        await new Promise(r=>setTimeout(r,retryDelays[attempt]));
        continue;
      }
    }
    return res;
  }
}

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  {
    auth:{ persistSession:false, autoRefreshToken:false },
    global:{ fetch:postgrestFetch }
  }
);

function clone(v:any){ return JSON.parse(JSON.stringify(v)); }
function emptyCell(){ return {difficulty:"",count:0,names:[]}; }
function blankBoard(name:string){
  const cells:any = {};
  for(const b of BOSSES) cells[b]=[emptyCell()];
  return {players:[name],cells};
}
function isInitialPlaceholder(data:any,name:string){
  return name==="오똑" && Array.isArray(data?.players) && data.players.length===1 &&
    data.players[0]==="오똑" && (!data.cells || Object.keys(data.cells).length===0);
}
function normalizeCell(v:any,boss:string){
  let d = typeof v?.difficulty==="string" ? v.difficulty : "";
  if(d && d!=="x" && Array.isArray(BOSS_DIFFICULTIES[boss]) && !BOSS_DIFFICULTIES[boss].includes(d)) d="";
  let count = Number.isFinite(Number(v?.count)) ? Math.max(0,Math.min(6,Number(v.count))) : 0;
  if(!d || d==="x") count=0;
  if(SOLO.has(boss) && d && d!=="x") count=1;
  const names = Array.isArray(v?.names) ? v.names.map((x:any)=>String(x).trim()).filter(Boolean).slice(0,Math.max(0,count-1)) : [];
  const out:any = {difficulty:d,count,names};
  if(v?._sync && typeof v._sync==="object") out._sync=v._sync;
  if(v?._originAt && typeof v._originAt==="string") out._originAt=v._originAt;
  return out;
}
function normalizeBoard(data:any,ownerName:string){
  if(isInitialPlaceholder(data,ownerName)) return clone(INITIAL);
  const players = Array.isArray(data?.players) && data.players.length
    ? data.players.map((x:any,i:number)=>String(x||("캐릭터 "+(i+1))).slice(0,30))
    : [ownerName];
  const cells:any={};
  for(const b of BOSSES){
    const src=Array.isArray(data?.cells?.[b])?data.cells[b]:[];
    cells[b]=players.map((_:any,i:number)=>normalizeCell(src[i],b));
  }
  return {players,cells};
}
function stripSync(board:any){
  const out=clone(board);
  for(const b of BOSSES){
    out.cells[b]=out.cells[b].map((c:any)=>c?._sync?emptyCell():normalizeCell(c,b));
  }
  return out;
}
function planned(c:any){ return !!c && c.difficulty!=="" && c.difficulty!=="x"; }
function cleanName(v:any){ return String(v||"").trim().slice(0,30); }
function partyMemberKey(ownerId:any,characterName:any){
  return String(ownerId||"")+"|"+cleanName(characterName);
}
function partyKeyFor(items:any[]){
  return items.map((item:any)=>partyMemberKey(item.ownerId,item.characterName)).sort().join("||");
}
async function partyOwnerNames(ownerIds:string[]){
  const {data,error}=await db.from("boss_owners").select("id,name").in("id",ownerIds);
  if(error) throw error;
  return new Map((data||[]).map((row:any)=>[String(row.id),String(row.name||"")]));
}
async function getPartyLock(scope:string,periodStart:string,bossName:string,partyKey:string){
  const {data,error}=await db.from("boss_party_run_locks")
    .select("scope,period_start,boss_name,party_key,source_owner_id,source_character_name,run_date,created_at,updated_at")
    .eq("scope",scope).eq("period_start",periodStart).eq("boss_name",bossName).eq("party_key",partyKey)
    .maybeSingle();
  if(error) throw error;
  return data||null;
}
async function insertPartyLock(scope:string,periodStart:string,bossName:string,partyKey:string,sourceOwnerId:string,sourceCharacterName:string,runDate:string){
  const row={
    scope,
    period_start:periodStart,
    boss_name:bossName,
    party_key:partyKey,
    source_owner_id:sourceOwnerId,
    source_character_name:sourceCharacterName,
    run_date:runDate,
    updated_at:new Date().toISOString()
  };
  const {data,error}=await db.from("boss_party_run_locks").insert(row)
    .select("scope,period_start,boss_name,party_key,source_owner_id,source_character_name,run_date,created_at,updated_at")
    .single();
  if(!error)return data;
  if(String(error.code)!=="23505")throw error;
  return await getPartyLock(scope,periodStart,bossName,partyKey);
}
async function updatePartyLock(lock:any,sourceOwnerId:string,sourceCharacterName:string,runDate:string){
  const {data,error}=await db.from("boss_party_run_locks")
    .update({
      source_owner_id:sourceOwnerId,
      source_character_name:sourceCharacterName,
      run_date:runDate,
      updated_at:new Date().toISOString()
    })
    .eq("scope",lock.scope).eq("period_start",lock.period_start).eq("boss_name",lock.boss_name).eq("party_key",lock.party_key)
    .select("scope,period_start,boss_name,party_key,source_owner_id,source_character_name,run_date,created_at,updated_at")
    .single();
  if(error)throw error;
  return data;
}
async function deletePartyLock(lock:any){
  const {error}=await db.from("boss_party_run_locks")
    .delete()
    .eq("scope",lock.scope).eq("period_start",lock.period_start).eq("boss_name",lock.boss_name).eq("party_key",lock.party_key);
  if(error)throw error;
}
function chooseExistingPartyAuthority(rows:any[],ownerNames:Map<string,string>){
  const completed=(rows||[]).filter((row:any)=>!!row.completed);
  completed.sort((a:any,b:any)=>{
    const ad=String(a.run_date||"9999-12-31"),bd=String(b.run_date||"9999-12-31");
    if(ad!==bd)return ad.localeCompare(bd);
    const ar=syncOwnerRank(ownerNames.get(String(a.owner_id))||"");
    const br=syncOwnerRank(ownerNames.get(String(b.owner_id))||"");
    if(ar!==br)return ar-br;
    const au=String(a.updated_at||""),bu=String(b.updated_at||"");
    if(au!==bu)return au.localeCompare(bu);
    return String(a.character_name||"").localeCompare(String(b.character_name||""),"ko");
  });
  return completed[0]||null;
}
function partyLockOwnedBy(lock:any,ownerId:string,characterName:string){
  return !!lock&&String(lock.source_owner_id)===String(ownerId)&&cleanName(lock.source_character_name)===cleanName(characterName);
}

function b64(bytes:Uint8Array){
  let s=""; for(const x of bytes)s+=String.fromCharCode(x); return btoa(s);
}
function fromB64(s:string){
  const raw=atob(s); const out=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++) out[i]=raw.charCodeAt(i);
  return out;
}
async function pinHash(pin:string){
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const iterations=210000;
  const key=await crypto.subtle.importKey("raw",enc.encode(pin),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt,iterations},key,256);
  return `pbkdf2_sha256$${iterations}$${b64(salt)}$${b64(new Uint8Array(bits))}`;
}
async function verifyHash(pin:string,stored:string){
  try{
    const [alg,it,salt64,hash64]=stored.split("$");
    if(alg!=="pbkdf2_sha256") return false;
    const iterations=Number(it);
    if(!Number.isFinite(iterations)||iterations<100000) return false;
    const salt=fromB64(salt64),expected=fromB64(hash64);
    const key=await crypto.subtle.importKey("raw",enc.encode(pin),"PBKDF2",false,["deriveBits"]);
    const bits=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt,iterations},key,expected.length*8);
    const got=new Uint8Array(bits);
    if(got.length!==expected.length) return false;
    let diff=0; for(let i=0;i<got.length;i++) diff|=got[i]^expected[i];
    return diff===0;
  }catch{ return false; }
}
async function getRows(){
  const {data:owners,error:e1}=await db.from("boss_owners").select("id,name,password_hash,created_at,updated_at").order("created_at");
  if(e1) throw e1;
  const {data:boards,error:e2}=await db.from("boss_boards").select("owner_id,data,updated_at");
  if(e2) throw e2;
  const map=new Map((boards||[]).map((b:any)=>[b.owner_id,b]));
  return (owners||[]).map((o:any)=>{
    const row=map.get(o.id);
    const rawBoard=row?.data;
    return {owner:o,rawBoard,boardUpdatedAt:row?.updated_at,board:normalizeBoard(rawBoard,o.name)};
  });
}
async function verifyOwner(ownerId:string,pin:string){
  if(!ownerId || !pin) return null;
  const {data,error}=await db.from("boss_owners").select("id,name,password_hash").eq("id",ownerId).maybeSingle();
  if(error || !data) return null;
  const ok=await verifyHash(String(pin),data.password_hash);
  if(!ok){ await new Promise(r=>setTimeout(r,900)); return null; }
  return data;
}
async function getOwnerById(ownerId:string){
  if(!ownerId) return null;
  const {data,error}=await db.from("boss_owners").select("id,name,password_hash").eq("id",ownerId).maybeSingle();
  return error?null:data;
}
async function verifyAdminCode(code:string){
  if(!code) return false;
  const {data,error}=await db
    .from("app_private_settings")
    .select("setting_value")
    .eq("setting_key","owner_delete_hash")
    .single();
  if(error || !data?.setting_value) return false;
  return await verifyHash(String(code),String(data.setting_value));
}
async function ownerAuth(ownerId:string,pin:string,adminCode:string){
  const adminOk=await verifyAdminCode(adminCode);
  if(adminOk) return await getOwnerById(ownerId);
  return await verifyOwner(ownerId,pin);
}
function priorityMs(cell:any,row:any){
  const raw=cell?._originAt || row?.boardUpdatedAt || row?.owner?.created_at || "9999-12-31T23:59:59.999Z";
  const ms=Date.parse(raw);
  return Number.isFinite(ms)?ms:Number.MAX_SAFE_INTEGER;
}
function sameManualCell(a:any,b:any){
  if(!a||!b) return false;
  return a.difficulty===b.difficulty &&
    Number(a.count||0)===Number(b.count||0) &&
    JSON.stringify((a.names||[]).map(cleanName))===JSON.stringify((b.names||[]).map(cleanName));
}
function cellCore(cell:any,boss:string){
  const c=normalizeCell(cell||{},boss);
  return {difficulty:c.difficulty,count:Number(c.count||0),names:(c.names||[]).map(cleanName)};
}
function cellChanged(baseCell:any,incomingCell:any,boss:string){
  return JSON.stringify(cellCore(baseCell,boss))!==JSON.stringify(cellCore(incomingCell,boss));
}
function mergeBoardChanges(baseRaw:any,incomingRaw:any,currentRaw:any,ownerName:string){
  const base=stripSync(normalizeBoard(baseRaw||{},ownerName));
  const incoming=stripSync(normalizeBoard(incomingRaw||{},ownerName));
  const current=stripSync(normalizeBoard(currentRaw||{},ownerName));

  // Character add/delete/rename/reorder is a structural edit. It is intentionally
  // treated as one atomic edit, while normal boss-cell changes are merged below.
  if(JSON.stringify(base.players)!==JSON.stringify(incoming.players)) return incoming;

  const merged=clone(current);
  for(let pi=0;pi<base.players.length;pi++){
    const player=cleanName(base.players[pi]);
    let targetIndex=merged.players.findIndex((p:any)=>cleanName(p)===player);
    if(targetIndex<0 && merged.players.length===base.players.length) targetIndex=pi;
    if(targetIndex<0) continue;

    for(const boss of BOSSES){
      if(cellChanged(base.cells?.[boss]?.[pi],incoming.cells?.[boss]?.[pi],boss)){
        merged.cells[boss][targetIndex]=normalizeCell(incoming.cells?.[boss]?.[pi],boss);
      }
    }
  }
  return merged;
}
async function saveBoardWithRetry(owner:any,baseRaw:any,incomingRaw:any){
  for(let attempt=0;attempt<5;attempt++){
    const {data:currentRow,error:readError}=await db
      .from("boss_boards")
      .select("data,updated_at")
      .eq("owner_id",owner.id)
      .single();
    if(readError) throw readError;

    const merged=mergeBoardChanges(baseRaw,incomingRaw,currentRow?.data,owner.name);
    const board=attachOrigins(merged,currentRow?.data,currentRow?.updated_at);
    const nextUpdatedAt=new Date(Date.now()+attempt).toISOString();

    let q=db.from("boss_boards")
      .update({data:board,updated_at:nextUpdatedAt})
      .eq("owner_id",owner.id);
    if(currentRow?.updated_at) q=q.eq("updated_at",currentRow.updated_at);

    const {data:updated,error:updateError}=await q.select("owner_id").maybeSingle();
    if(updateError) throw updateError;
    if(updated) return board;

    // Someone saved between our read and write. Re-read and merge again.
    await new Promise(r=>setTimeout(r,20*(attempt+1)));
  }
  throw new Error("동시 저장 충돌을 해결하지 못했습니다.");
}
function attachOrigins(incoming:any,current:any,currentUpdatedAt?:string){
  const out=clone(incoming);
  const old=normalizeBoard(current||{}, "");
  const fallback=currentUpdatedAt || new Date().toISOString();
  for(const boss of BOSSES){
    for(let i=0;i<out.players.length;i++){
      const c=out.cells[boss][i];
      if(!planned(c)) continue;
      const prev=old.cells?.[boss]?.[i];
      if(prev && planned(prev) && !prev._sync){
        c._originAt=prev._originAt || fallback;
      }else{
        c._originAt=new Date().toISOString();
      }
    }
  }
  return out;
}
function buildSynced(rows:any[]){
  const bases=new Map<string,any>();
  const rowById=new Map<string,any>();
  for(const r of rows){
    rowById.set(r.owner.id,r);
    bases.set(r.owner.id,stripSync(normalizeBoard(r.board,r.owner.name)));
  }
  const results=new Map<string,any>();
  for(const r of rows) results.set(r.owner.id,clone(bases.get(r.owner.id)));

  const sources:any[]=[];
  for(const r of rows){
    const sourceBoard=bases.get(r.owner.id);
    for(let pi=0;pi<sourceBoard.players.length;pi++){
      const sourcePlayer=cleanName(sourceBoard.players[pi])||r.owner.name;
      for(const boss of BOSSES){
        const c=sourceBoard.cells[boss][pi];
        if(!planned(c) || c.count<2 || !Array.isArray(c.names) || !c.names.length) continue;
        sources.push({
          row:r,
          ownerId:r.owner.id,
          ownerName:r.owner.name,
          pi,
          boss,
          sourcePlayer,
          cell:c,
          ownerRank:syncOwnerRank(r.owner.name),
          priority:priorityMs(c,r)
        });
      }
    }
  }

  sources.sort((a,b)=>{
    if(a.ownerRank!==b.ownerRank) return a.ownerRank-b.ownerRank;
    if(a.priority!==b.priority) return a.priority-b.priority;
    const ownerCmp=String(a.ownerName).localeCompare(String(b.ownerName),"ko");
    if(ownerCmp) return ownerCmp;
    return String(a.sourcePlayer).localeCompare(String(b.sourcePlayer),"ko");
  });

  for(const source of sources){
    const sourceResult=results.get(source.ownerId);
    const sourceCurrent=sourceResult.cells[source.boss][source.pi];

    // Fixed owner priority is authoritative. Once an earlier source has claimed
    // this character/boss, this source cannot compete.
    if(sourceCurrent?._sync) continue;

    for(const target of rows){

      const targetBoard=results.get(target.owner.id);
      const matchedIndices=targetBoard.players
        .map((p:string,i:number)=>source.cell.names.some((n:string)=>cleanName(n)===cleanName(p))?i:-1)
        .filter((i:number)=>i>=0);

      for(const tpi of matchedIndices){
        if(target.owner.id===source.ownerId && tpi===source.pi) continue;
        const targetPlayer=cleanName(targetBoard.players[tpi]);
        const existing=targetBoard.cells[source.boss][tpi];

        if(planned(existing)){
          let existingRank=syncOwnerRank(target.owner.name);
          let existingPriority=priorityMs(existing,target);
          if(existing._sync){
            existingRank=syncOwnerRank(existing._sync.sourceOwnerName||target.owner.name);
            const ms=Date.parse(existing._sync.sourceOriginAt||"");
            if(Number.isFinite(ms)) existingPriority=ms;
          }

          // Lower owner rank wins. Input timestamp only breaks ties within
          // the same owner priority.
          if(existingRank<source.ownerRank) continue;
          if(existingRank===source.ownerRank && existingPriority<=source.priority) continue;
        }

        const reciprocalNames=[
          source.sourcePlayer,
          ...source.cell.names.filter((n:string)=>cleanName(n)!==targetPlayer && cleanName(n)!==source.sourcePlayer)
        ];
        const needed=Math.max(0,source.cell.count-1);
        const names=Array.from(new Set(reciprocalNames.map(cleanName).filter(Boolean))).slice(0,needed);

        targetBoard.cells[source.boss][tpi]={
          difficulty:source.cell.difficulty,
          count:source.cell.count,
          names,
          _sync:{
            sourceOwnerId:source.ownerId,
            sourceOwnerName:source.ownerName,
            sourcePlayer:source.sourcePlayer,
            targetPlayer,
            boss:source.boss,
            sourceOriginAt:new Date(source.priority).toISOString()
          }
        };
      }
    }
  }
  return results;
}
async function persistSynced(rows:any[]){
  const synced=buildSynced(rows);
  for(const r of rows){
    const next=synced.get(r.owner.id);
    if(JSON.stringify(normalizeBoard(r.board,r.owner.name))!==JSON.stringify(next)){
      const {error}=await db.from("boss_boards").update({data:next,updated_at:new Date().toISOString()}).eq("owner_id",r.owner.id);
      if(error) throw error;
      r.board=next;
    }else{
      r.board=next;
    }
  }
  return rows;
}
function boardVersion(rows:any[]){
  return JSON.stringify(rows.map((r:any)=>[
    r.owner.id,r.owner.updated_at||"",r.boardUpdatedAt||""
  ]).sort((a:any,b:any)=>String(a[0]).localeCompare(String(b[0]))));
}
function checklistVersion(weekly:any[],monthly:any[]){
  return JSON.stringify([
    ...weekly.map((r:any)=>["w",r.owner_id,r.week_start,String(r.revision)]),
    ...monthly.map((r:any)=>["m",r.owner_id,r.month_start,String(r.revision)])
  ].sort((a:any,b:any)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
}
function publicPayload(rows:any[]){
  return {
    boardVersion:boardVersion(rows),
    owners:rows.map(r=>({id:r.owner.id,name:r.owner.name,created_at:r.owner.created_at,updated_at:r.owner.updated_at,board:r.board}))
  };
}
async function ensureInitial(rows:any[]){
  let changed=false;
  for(const r of rows){
    if(isInitialPlaceholder(r.rawBoard,r.owner.name)){
      r.board=clone(INITIAL); changed=true;
      const {error}=await db.from("boss_boards").update({data:r.board,updated_at:new Date().toISOString()}).eq("owner_id",r.owner.id);
      if(error) throw error;
    }
  }
  return changed;
}
async function rebuild(){
  let rows=await getRows();
  await ensureInitial(rows);
  rows=await getRows();
  return await persistSynced(rows);
}
function json(body:any,status=200){
  return new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}});
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  if(req.method!=="POST") return json({error:"POST only"},405);

  try{
    const body=await req.json().catch(()=>({}));
    const action=String(body.action||"bootstrap");


    // Shared route slots are collaborative, like public boss-run checks.
    if(action==="route_slots"){
      const {data,error}=await db.from("boss_route_slots").select("slot,name,runs,revision,updated_at").order("slot");
      if(error) throw error;
      return json({ok:true,slots:data});
    }
    if(["save_route_slot","rename_route_slot","delete_route_slot"].includes(action)){
      const slot=Number(body.slot),revision=Number(body.revision);
      if(!Number.isInteger(slot)||slot<1||slot>3||!Number.isInteger(revision)||revision<0)
        return json({error:"올바른 저장칸이 아닙니다."},400);
      const patch:any={revision:revision+1,updated_at:new Date().toISOString()};
      if(action==="delete_route_slot"){patch.name="";patch.runs=[];}
      else{
        const name=typeof body.name==="string"?body.name.trim():"";
        if(!name||name.length>40)return json({error:"루트 이름을 1~40자로 입력해 주세요."},400);
        patch.name=name;
        if(action==="save_route_slot"){
          if(!Array.isArray(body.runs)||!body.runs.length||body.runs.length>300||JSON.stringify(body.runs).length>150000)
            return json({error:"저장할 루트가 올바르지 않습니다."},400);
          const runs=[];
          for(const r of body.runs){
            if(!BOSSES.includes(r?.boss)||!BOSS_DIFFICULTIES[r.boss]?.includes(r.difficulty)||!Array.isArray(r.participants)||r.participants.length<2||r.participants.length>6)
              return json({error:"파티 정보가 올바르지 않습니다."},400);
            const participants=r.participants.map((p:any)=>({owner:cleanName(p?.owner),character:cleanName(p?.character)}));
            if(participants.some((p:any)=>!p.character))return json({error:"캐릭터 이름이 없습니다."},400);
            runs.push({id:String(r.id||"").slice(0,600),boss:r.boss,difficulty:r.difficulty,
              partyCount:Math.max(2,Math.min(6,Number(r.partyCount)||participants.length)),
              participants,focusCharacter:cleanName(r.focusCharacter),sourceOwner:cleanName(r.sourceOwner),sourceCharacter:cleanName(r.sourceCharacter)});
          }
          patch.runs=runs;
        }
      }
      let q=db.from("boss_route_slots").update(patch).eq("slot",slot).eq("revision",revision);
      if(action==="rename_route_slot")q=q.neq("runs",JSON.stringify([]));
      const {data,error}=await q.select("slot,name,runs,revision,updated_at").maybeSingle();
      if(error)throw error;
      if(!data)return json({error:"다른 기기에서 변경된 루트입니다. 최신 목록을 확인한 뒤 다시 저장해 주세요."},409);
      return json({ok:true,item:data});
    }

    if(action==="bootstrap"){
      // All writes already call rebuild(); polling should never rewrite boards.
      const rows=await getRows();
      return json({ok:true,...publicPayload(rows)});
    }

    // Poll changes using only compact metadata; never rebuild or send board JSON.
    if(action==="poll_status"){
      const includeChecklist=body.includeChecklist===true;
      const queries:any[]=[
        db.from("boss_owners").select("id,updated_at"),
        db.from("boss_boards").select("owner_id,updated_at")
      ];
      if(includeChecklist){
        queries.push(db.from("boss_owner_weekly_snapshots").select("owner_id,week_start,revision"));
        queries.push(db.from("boss_owner_monthly_snapshots").select("owner_id,month_start,revision"));
      }
      const results=await Promise.all(queries);
      for(const r of results){if(r.error)throw r.error;}
      const owners=results[0].data||[];
      const times=new Map((results[1].data||[]).map((x:any)=>[x.owner_id,x.updated_at]));
      const rows=owners.map((o:any)=>({owner:o,boardUpdatedAt:times.get(o.id)||""}));
      return json({ok:true,boardVersion:boardVersion(rows),
        checklistVersion:includeChecklist?checklistVersion(results[2].data||[],results[3].data||[]):null});
    }

    if(action==="verify"){
      const owner=await verifyOwner(String(body.ownerId||""),String(body.pin||""));
      return owner?json({ok:true,name:owner.name}):json({ok:false,error:"비밀번호가 맞지 않습니다."},401);
    }

    if(action==="checklist_bootstrap"){
      const [
        {data,error},
        {data:characterData,error:characterError},
        {data:weeklySnapshots,error:bossRunError},
        {data:monthlySnapshots,error:monthlySnapshotError}
      ]=await Promise.all([
        db.from("boss_weekly_checklists")
          .select("owner_id,week_start,completed,meso_earned,updated_at")
          .gte("week_start","2026-09-24").order("week_start",{ascending:true}),
        db.from("boss_character_weekly_checklists")
          .select("owner_id,week_start,character_name,completed,meso_earned,updated_at")
          .gte("week_start","2026-09-24").order("week_start",{ascending:true}),
        db.from("boss_owner_weekly_snapshots")
          .select("owner_id,week_start,checks")
          .gte("week_start","2026-09-24")
          .order("week_start",{ascending:true}).order("owner_id",{ascending:true})
          .range(0,499),
        db.from("boss_owner_monthly_snapshots")
          .select("owner_id,month_start,checks")
          .gte("month_start","2026-09-01")
          .order("month_start",{ascending:true}).order("owner_id",{ascending:true})
          .range(0,499)
      ]);
      if(error)throw error;
      if(characterError)throw characterError;
      if(bossRunError)throw bossRunError;
      if(monthlySnapshotError)throw monthlySnapshotError;
      // Exactly one overwriteable snapshot per owner/Thursday-Wednesday week.
      // Paginate snapshots rather than individual boss rows, avoiding 1,000-row truncation.
      const snapshots=[...(weeklySnapshots||[])];
      for(let offset=500;snapshots.length===offset&&offset<50000;offset+=500){
        const {data:page,error:pageError}=await db.from("boss_owner_weekly_snapshots")
          .select("owner_id,week_start,checks")
          .gte("week_start","2026-09-24")
          .order("week_start",{ascending:true}).order("owner_id",{ascending:true})
          .range(offset,offset+499);
        if(pageError)throw pageError;
        snapshots.push(...(page||[]));
        if(!page||page.length<500)break;
      }
      const allBossRuns:any[]=[];
      for(const snapshot of snapshots){
        for(const [characterName,bosses] of Object.entries(snapshot.checks||{})){
          if(!bosses||typeof bosses!=="object")continue;
          for(const [bossName,value] of Object.entries(bosses as Record<string,any>)){
            if(bossName==="검은 마법사")continue; // Monthly record stays separate.
            const item=value as Record<string,any>;
            allBossRuns.push({
              owner_id:snapshot.owner_id,week_start:snapshot.week_start,
              character_name:characterName,boss_name:bossName,
              completed:!!item.completed,
              meso_earned:Math.max(0,Number(item.meso_earned)||0),
              run_date:item.run_date||snapshot.week_start,
              updated_at:item.updated_at||""
            });
          }
        }
      }
      // Monthly Black Mage checks: one mutable snapshot per owner per calendar
      // month. Only the current month's snapshot changes; previous months
      // remain available as the last saved state for that month.
      const allMonthlySnapshots=[...(monthlySnapshots||[])];
      for(let offset=500;allMonthlySnapshots.length===offset&&offset<50000;offset+=500){
        const {data:page,error:pageError}=await db.from("boss_owner_monthly_snapshots")
          .select("owner_id,month_start,checks")
          .gte("month_start","2026-09-01")
          .order("month_start",{ascending:true}).order("owner_id",{ascending:true})
          .range(offset,offset+499);
        if(pageError)throw pageError;
        allMonthlySnapshots.push(...(page||[]));
        if(!page||page.length<500)break;
      }
      const allMonthlyRuns:any[]=[];
      for(const snapshot of allMonthlySnapshots){
        for(const [characterName,bosses] of Object.entries(snapshot.checks||{})){
          if(!bosses||typeof bosses!=="object")continue;
          for(const [bossName,value] of Object.entries(bosses as Record<string,any>)){
            if(!MONTHLY.has(bossName))continue;
            const item=value as Record<string,any>;
            allMonthlyRuns.push({
              owner_id:snapshot.owner_id,month_start:snapshot.month_start,
              character_name:characterName,boss_name:bossName,
              completed:!!item.completed,
              meso_earned:Math.max(0,Number(item.meso_earned)||0),
              run_date:item.run_date||null,
              updated_at:item.updated_at||""
            });
          }
        }
      }
      return json({
        ok:true,
        checklists:data||[],
        characterChecklists:characterData||[],
        bossRunChecklists:allBossRuns,
        monthlyBossRunChecklists:allMonthlyRuns
      });
    }

    if(action==="save_checklist"){
      const owner=await ownerAuth(String(body.ownerId||""),String(body.pin||""),String(body.adminCode||""));
      if(!owner) return json({ok:false,error:"수정 권한을 확인할 수 없습니다."},401);

      const weekStart=String(body.weekStart||"");
      if(!/^\d{4}-\d{2}-\d{2}$/.test(weekStart) || weekStart<"2026-09-24"){
        return json({ok:false,error:"올바른 주차가 아닙니다."},400);
      }
      const completed=!!body.completed;
      const rawMeso=Number(body.mesoEarned||0);
      const mesoEarned=completed&&Number.isFinite(rawMeso)?Math.max(0,Math.round(rawMeso)):0;
      const updatedAt=new Date().toISOString();
      const {data,error}=await db
        .from("boss_weekly_checklists")
        .upsert({owner_id:owner.id,week_start:weekStart,completed,meso_earned:mesoEarned,updated_at:updatedAt},{onConflict:"owner_id,week_start"})
        .select("owner_id,week_start,completed,meso_earned,updated_at")
        .single();
      if(error) throw error;
      return json({ok:true,item:data});
    }

    if(action==="save_character_checklist"){
      const owner=await ownerAuth(String(body.ownerId||""),String(body.pin||""),String(body.adminCode||""));
      if(!owner) return json({ok:false,error:"수정 권한을 확인할 수 없습니다."},401);

      const weekStart=String(body.weekStart||"");
      const characterName=cleanName(body.characterName);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(weekStart) || weekStart<"2026-09-24"){
        return json({ok:false,error:"올바른 주차가 아닙니다."},400);
      }
      if(!characterName) return json({ok:false,error:"캐릭터 이름이 없습니다."},400);

      const completed=!!body.completed;
      const rawMeso=Number(body.mesoEarned||0);
      const mesoEarned=completed&&Number.isFinite(rawMeso)?Math.max(0,Math.round(rawMeso)):0;
      const updatedAt=new Date().toISOString();

      const {data,error}=await db
        .from("boss_character_weekly_checklists")
        .upsert({
          owner_id:owner.id,
          week_start:weekStart,
          character_name:characterName,
          completed,
          meso_earned:mesoEarned,
          updated_at:updatedAt
        },{onConflict:"owner_id,week_start,character_name"})
        .select("owner_id,week_start,character_name,completed,meso_earned,updated_at")
        .single();
      if(error) throw error;
      return json({ok:true,item:data});
    }

    if(action==="save_boss_run_check"){
      const owner=await getOwnerById(String(body.ownerId||""));
      if(!owner) return json({ok:false,error:"주인을 찾을 수 없습니다."},404);

      const weekStart=String(body.weekStart||"");
      const characterName=cleanName(body.characterName);
      const bossName=cleanName(body.bossName);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(weekStart) || weekStart<"2026-09-24"){
        return json({ok:false,error:"올바른 주차가 아닙니다."},400);
      }
      if(!characterName || !bossName) return json({ok:false,error:"캐릭터 또는 보스 정보가 없습니다."},400);

      const completed=!!body.completed;
      const rawMeso=Number(body.mesoEarned||0);
      const mesoEarned=completed&&Number.isFinite(rawMeso)?Math.max(0,Math.round(rawMeso)):0;
      const runDate=String(body.runDate||weekStart);
      const weekEnd=new Date(weekStart+"T00:00:00Z");
      weekEnd.setUTCDate(weekEnd.getUTCDate()+6);
      const weekEndKey=weekEnd.toISOString().slice(0,10);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(runDate) || runDate<weekStart || runDate>weekEndKey){
        return json({ok:false,error:"선택한 날짜가 해당 주차 범위를 벗어났습니다."},400);
      }
      const updatedAt=new Date().toISOString();

      const {data,error}=await db
        .from("boss_character_run_checks")
        .upsert({
          owner_id:owner.id,
          week_start:weekStart,
          character_name:characterName,
          boss_name:bossName,
          completed,
          meso_earned:mesoEarned,
          run_date:runDate,
          updated_at:updatedAt
        },{onConflict:"owner_id,week_start,character_name,boss_name"})
        .select("owner_id,week_start,character_name,boss_name,completed,meso_earned,run_date,updated_at")
        .single();
      if(error) throw error;
      return json({ok:true,item:data});
    }

    if(action==="save_party_run_atomic"){
      const weekStart=String(body.weekStart||"");
      const runDate=String(body.runDate||weekStart);
      const items=Array.isArray(body.items)?body.items:[];
      if(!/^\d{4}-\d{2}-\d{2}$/.test(weekStart) || weekStart<"2026-09-24"){
        return json({ok:false,error:"올바른 주차가 아닙니다."},400);
      }
      const weekEnd=new Date(weekStart+"T00:00:00Z");
      weekEnd.setUTCDate(weekEnd.getUTCDate()+6);
      const weekEndKey=weekEnd.toISOString().slice(0,10);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(runDate) || runDate<weekStart || runDate>weekEndKey){
        return json({ok:false,error:"선택한 날짜가 해당 주차 범위를 벗어났습니다."},400);
      }
      if(items.length<2 || items.length>12){
        return json({ok:false,error:"공용 파티는 등록된 캐릭터 2~12명만 한 번에 저장할 수 있습니다."},400);
      }

      const normalized=items.map((item:any)=>({
        ownerId:String(item?.ownerId||""),
        characterName:cleanName(item?.characterName),
        bossName:cleanName(item?.bossName),
        completed:!!item?.completed,
        mesoEarned:Number(item?.mesoEarned||0)
      }));
      if(normalized.some((item:any)=>!item.ownerId||!item.characterName||!item.bossName||MONTHLY.has(item.bossName))){
        return json({ok:false,error:"주간 공용 파티 정보가 올바르지 않습니다."},400);
      }
      const bossName=normalized[0].bossName;
      if(normalized.some((item:any)=>item.bossName!==bossName)){
        return json({ok:false,error:"한 번의 공용 저장에는 같은 보스만 포함할 수 있습니다."},400);
      }
      const completed=normalized[0].completed;
      if(normalized.some((item:any)=>item.completed!==completed)){
        return json({ok:false,error:"공용 파티의 체크 상태가 서로 다릅니다."},400);
      }
      const uniqueKeys=new Set(normalized.map((item:any)=>item.ownerId+"|"+item.characterName));
      if(uniqueKeys.size!==normalized.length){
        return json({ok:false,error:"공용 파티에 중복 캐릭터가 있습니다."},400);
      }

      const sourceOwnerId=String(body.sourceOwnerId||normalized[0].ownerId);
      const sourceCharacterName=cleanName(body.sourceCharacterName||normalized[0].characterName);
      if(!normalized.some((item:any)=>item.ownerId===sourceOwnerId&&item.characterName===sourceCharacterName)){
        return json({ok:false,error:"체크한 기준 캐릭터가 파티에 없습니다."},400);
      }

      const ownerIds=Array.from(new Set(normalized.map((item:any)=>item.ownerId)));
      const {data:boards,error:boardsError}=await db
        .from("boss_boards")
        .select("owner_id,data")
        .in("owner_id",ownerIds);
      if(boardsError) throw boardsError;
      const boardMap=new Map((boards||[]).map((row:any)=>[String(row.owner_id),row.data]));
      for(const item of normalized){
        const board:any=boardMap.get(item.ownerId);
        if(!board) return json({ok:false,error:"파티원의 보스판을 찾을 수 없습니다."},400);
        const players=Array.isArray(board.players)?board.players.map(cleanName):[];
        const pi=players.findIndex((name:string)=>name===item.characterName);
        if(pi<0) return json({ok:false,error:item.characterName+" 캐릭터가 메인 목록에 없습니다."},400);
        const cell=board.cells?.[bossName]?.[pi];
        if(!planned(normalizeCell(cell,bossName))){
          return json({ok:false,error:item.characterName+" 캐릭터에 "+bossName+"가 등록되어 있지 않습니다."},400);
        }
      }

      const partyKey=partyKeyFor(normalized);
      const ownerNames=await partyOwnerNames(ownerIds);
      const memberSet=new Set(normalized.map((item:any)=>partyMemberKey(item.ownerId,item.characterName)));
      const {data:rawExisting,error:existingError}=await db
        .from("boss_character_run_checks")
        .select("owner_id,week_start,character_name,boss_name,completed,meso_earned,run_date,updated_at")
        .eq("week_start",weekStart).eq("boss_name",bossName).in("owner_id",ownerIds);
      if(existingError)throw existingError;
      let existing=(rawExisting||[]).filter((row:any)=>memberSet.has(partyMemberKey(row.owner_id,row.character_name)));
      let lock=await getPartyLock("weekly",weekStart,bossName,partyKey);

      if(!lock&&completed){
        // Do not create a lock or mark other members complete during an uncheck.
        const authority=chooseExistingPartyAuthority(existing,ownerNames);
        if(authority){
          lock=await insertPartyLock("weekly",weekStart,bossName,partyKey,String(authority.owner_id),String(authority.character_name),String(authority.run_date||weekStart));
          const existingMap=new Map(existing.map((row:any)=>[partyMemberKey(row.owner_id,row.character_name),row]));
          const alignRows=normalized.map((item:any)=>{
            const old:any=existingMap.get(partyMemberKey(item.ownerId,item.characterName));
            const meso=old&&Number(old.meso_earned)>0?Math.max(0,Number(old.meso_earned)||0):Math.max(0,Math.round(Number(item.mesoEarned)||0));
            return {
              owner_id:item.ownerId,week_start:weekStart,character_name:item.characterName,boss_name:bossName,
              completed:true,meso_earned:meso,run_date:String(lock.run_date),updated_at:new Date().toISOString()
            };
          });
          const {data:aligned,error:alignError}=await db.from("boss_character_run_checks")
            .upsert(alignRows,{onConflict:"owner_id,week_start,character_name,boss_name"})
            .select("owner_id,week_start,character_name,boss_name,completed,meso_earned,run_date,updated_at");
          if(alignError)throw alignError;
          existing=aligned||[];
        }
      }

      if(lock&&!partyLockOwnedBy(lock,sourceOwnerId,sourceCharacterName)){
        const incomingRank=syncOwnerRank(ownerNames.get(sourceOwnerId)||"");
        const lockRank=syncOwnerRank(ownerNames.get(String(lock.source_owner_id))||"");
        if(completed&&String(lock.run_date)===runDate&&incomingRank<lockRank){
          lock=await updatePartyLock(lock,sourceOwnerId,sourceCharacterName,runDate);
        }else if(completed){
          // A member can join a previously checked party without moving the
          // original authority/date or overwriting any already completed member.
          // This fixes a newly checked member reverting to unchecked on refresh.
          const existingMap=new Map(existing.map((row:any)=>[partyMemberKey(row.owner_id,row.character_name),row]));
          const missing=normalized.filter((item:any)=>!existingMap.get(partyMemberKey(item.ownerId,item.characterName))?.completed);
          if(missing.length){
            const rows=missing.map((item:any)=>({
              owner_id:item.ownerId,week_start:weekStart,character_name:item.characterName,boss_name:bossName,
              completed:true,meso_earned:Math.max(0,Math.round(Number(item.mesoEarned)||0)),
              run_date:String(lock.run_date),updated_at:new Date().toISOString()
            }));
            const {error:joinError}=await db.from("boss_character_run_checks")
              .upsert(rows,{onConflict:"owner_id,week_start,character_name,boss_name"});
            if(joinError)throw joinError;
          }
          const {data:joined,error:joinReadError}=await db.from("boss_character_run_checks")
            .select("owner_id,week_start,character_name,boss_name,completed,meso_earned,run_date,updated_at")
            .eq("week_start",weekStart).eq("boss_name",bossName).in("owner_id",ownerIds);
          if(joinReadError)throw joinReadError;
          return json({
            ok:true,atomic:true,joinedExistingParty:true,
            lockedByCharacterName:String(lock.source_character_name||""),
            lockedRunDate:String(lock.run_date||""),
            items:(joined||[]).filter((row:any)=>memberSet.has(partyMemberKey(row.owner_id,row.character_name)))
          });
        }else{
          return json({
            ok:true,atomic:true,locked:true,
            lockedByOwnerId:String(lock.source_owner_id),
            lockedByCharacterName:String(lock.source_character_name||""),
            lockedRunDate:String(lock.run_date||""),
            items:existing
          });
        }
      }

      if(!lock&&completed){
        lock=await insertPartyLock("weekly",weekStart,bossName,partyKey,sourceOwnerId,sourceCharacterName,runDate);
        if(lock&&!partyLockOwnedBy(lock,sourceOwnerId,sourceCharacterName)){
          const incomingRank=syncOwnerRank(ownerNames.get(sourceOwnerId)||"");
          const lockRank=syncOwnerRank(ownerNames.get(String(lock.source_owner_id))||"");
          if(String(lock.run_date)===runDate&&incomingRank<lockRank){
            lock=await updatePartyLock(lock,sourceOwnerId,sourceCharacterName,runDate);
          }else{
            return json({
              ok:true,atomic:true,locked:true,
              lockedByOwnerId:String(lock.source_owner_id),
              lockedByCharacterName:String(lock.source_character_name||""),
              lockedRunDate:String(lock.run_date||""),
              items:existing
            });
          }
        }
      }

      const updatedAt=new Date().toISOString();
      const rows=normalized.map((item:any)=>{
        const mesoEarned=completed&&Number.isFinite(item.mesoEarned)?Math.max(0,Math.round(item.mesoEarned)):0;
        return {
          owner_id:item.ownerId,
          week_start:weekStart,
          character_name:item.characterName,
          boss_name:item.bossName,
          completed,
          meso_earned:mesoEarned,
          run_date:completed?runDate:(existing.find((r:any)=>partyMemberKey(r.owner_id,r.character_name)===partyMemberKey(item.ownerId,item.characterName))?.run_date||runDate),
          updated_at:updatedAt
        };
      });

      const {data,error}=await db
        .from("boss_character_run_checks")
        .upsert(rows,{onConflict:"owner_id,week_start,character_name,boss_name"})
        .select("owner_id,week_start,character_name,boss_name,completed,meso_earned,run_date,updated_at");
      if(error) throw error;
      if((data||[]).length!==rows.length) throw new Error("공용 파티 저장 결과 수가 일치하지 않습니다.");

      if(lock&&partyLockOwnedBy(lock,sourceOwnerId,sourceCharacterName)){
        if(completed) await updatePartyLock(lock,sourceOwnerId,sourceCharacterName,runDate);
        else await deletePartyLock(lock);
      }
      return json({ok:true,atomic:true,locked:false,items:data||[]});
    }

    if(action==="save_boss_run_bulk"){
      const owner=await getOwnerById(String(body.ownerId||""));
      if(!owner) return json({ok:false,error:"주인을 찾을 수 없습니다."},404);

      const weekStart=String(body.weekStart||"");
      const runDate=String(body.runDate||weekStart);
      const items=Array.isArray(body.items)?body.items:[];
      if(!/^\d{4}-\d{2}-\d{2}$/.test(weekStart) || weekStart<"2026-09-24"){
        return json({ok:false,error:"올바른 주차가 아닙니다."},400);
      }
      const weekEnd=new Date(weekStart+"T00:00:00Z");
      weekEnd.setUTCDate(weekEnd.getUTCDate()+6);
      const weekEndKey=weekEnd.toISOString().slice(0,10);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(runDate) || runDate<weekStart || runDate>weekEndKey){
        return json({ok:false,error:"선택한 날짜가 해당 주차 범위를 벗어났습니다."},400);
      }
      if(!items.length) return json({ok:true,items:[]});
      if(items.length>200) return json({ok:false,error:"한 번에 저장할 수 있는 보스 수를 초과했습니다."},400);

      const updatedAt=new Date().toISOString();
      const rows=items.map((item:any)=>{
        const characterName=cleanName(item.characterName);
        const bossName=cleanName(item.bossName);
        const completed=!!item.completed;
        const rawMeso=Number(item.mesoEarned||0);
        const mesoEarned=completed&&Number.isFinite(rawMeso)?Math.max(0,Math.round(rawMeso)):0;
        if(!characterName||!bossName) throw new Error("캐릭터 또는 보스 정보가 없습니다.");
        return {
          owner_id:owner.id,
          week_start:weekStart,
          character_name:characterName,
          boss_name:bossName,
          completed,
          meso_earned:mesoEarned,
          run_date:runDate,
          updated_at:updatedAt
        };
      });

      const {data,error}=await db
        .from("boss_character_run_checks")
        .upsert(rows,{onConflict:"owner_id,week_start,character_name,boss_name"})
        .select("owner_id,week_start,character_name,boss_name,completed,meso_earned,run_date,updated_at");
      if(error) throw error;
      return json({ok:true,items:data||[]});
    }

    if(action==="save_monthly_boss_run_check"){
      const owner=await getOwnerById(String(body.ownerId||""));
      if(!owner) return json({ok:false,error:"주인을 찾을 수 없습니다."},404);

      const monthStart=String(body.monthStart||"");
      const characterName=cleanName(body.characterName);
      const bossName=cleanName(body.bossName);
      const runDate=String(body.runDate||monthStart);
      if(!/^\d{4}-\d{2}-01$/.test(monthStart) || monthStart<"2026-09-01"){
        return json({ok:false,error:"올바른 월이 아닙니다."},400);
      }
      if(!characterName || !MONTHLY.has(bossName)){
        return json({ok:false,error:"월간 보스 정보가 올바르지 않습니다."},400);
      }
      if(!/^\d{4}-\d{2}-\d{2}$/.test(runDate) || runDate.slice(0,7)!==monthStart.slice(0,7)){
        return json({ok:false,error:"선택한 날짜가 해당 월 범위를 벗어났습니다."},400);
      }

      const completed=!!body.completed;
      const rawMeso=Number(body.mesoEarned||0);
      const mesoEarned=completed&&Number.isFinite(rawMeso)?Math.max(0,Math.round(rawMeso)):0;
      const updatedAt=new Date().toISOString();
      const {data,error}=await db
        .from("boss_character_monthly_checks")
        .upsert({
          owner_id:owner.id,
          month_start:monthStart,
          character_name:characterName,
          boss_name:bossName,
          completed,
          meso_earned:mesoEarned,
          run_date:completed?runDate:null,
          updated_at:updatedAt
        },{onConflict:"owner_id,month_start,character_name,boss_name"})
        .select("owner_id,month_start,character_name,boss_name,completed,meso_earned,run_date,updated_at")
        .single();
      if(error) throw error;
      return json({ok:true,item:data});
    }

    if(action==="save_monthly_party_run_atomic"){
      const monthStart=String(body.monthStart||"");
      const runDate=String(body.runDate||monthStart);
      const items=Array.isArray(body.items)?body.items:[];
      if(!/^\d{4}-\d{2}-01$/.test(monthStart) || monthStart<"2026-09-01"){
        return json({ok:false,error:"올바른 월이 아닙니다."},400);
      }
      if(!/^\d{4}-\d{2}-\d{2}$/.test(runDate) || runDate.slice(0,7)!==monthStart.slice(0,7)){
        return json({ok:false,error:"선택한 날짜가 해당 월 범위를 벗어났습니다."},400);
      }
      if(items.length<2 || items.length>12){
        return json({ok:false,error:"공용 월간 파티는 등록된 캐릭터 2~12명만 한 번에 저장할 수 있습니다."},400);
      }

      const normalized=items.map((item:any)=>({
        ownerId:String(item?.ownerId||""),
        characterName:cleanName(item?.characterName),
        bossName:cleanName(item?.bossName),
        completed:!!item?.completed,
        mesoEarned:Number(item?.mesoEarned||0)
      }));
      if(normalized.some((item:any)=>!item.ownerId||!item.characterName||!MONTHLY.has(item.bossName))){
        return json({ok:false,error:"월간 공용 파티 정보가 올바르지 않습니다."},400);
      }
      const bossName=normalized[0].bossName;
      if(normalized.some((item:any)=>item.bossName!==bossName)){
        return json({ok:false,error:"한 번의 공용 저장에는 같은 월간 보스만 포함할 수 있습니다."},400);
      }
      const completed=normalized[0].completed;
      if(normalized.some((item:any)=>item.completed!==completed)){
        return json({ok:false,error:"공용 월간 파티의 체크 상태가 서로 다릅니다."},400);
      }
      const uniqueKeys=new Set(normalized.map((item:any)=>item.ownerId+"|"+item.characterName));
      if(uniqueKeys.size!==normalized.length){
        return json({ok:false,error:"공용 파티에 중복 캐릭터가 있습니다."},400);
      }

      const sourceOwnerId=String(body.sourceOwnerId||normalized[0].ownerId);
      const sourceCharacterName=cleanName(body.sourceCharacterName||normalized[0].characterName);
      if(!normalized.some((item:any)=>item.ownerId===sourceOwnerId&&item.characterName===sourceCharacterName)){
        return json({ok:false,error:"체크한 기준 캐릭터가 파티에 없습니다."},400);
      }

      const ownerIds=Array.from(new Set(normalized.map((item:any)=>item.ownerId)));
      const {data:boards,error:boardsError}=await db
        .from("boss_boards")
        .select("owner_id,data")
        .in("owner_id",ownerIds);
      if(boardsError) throw boardsError;
      const boardMap=new Map((boards||[]).map((row:any)=>[String(row.owner_id),row.data]));
      for(const item of normalized){
        const board:any=boardMap.get(item.ownerId);
        if(!board) return json({ok:false,error:"파티원의 보스판을 찾을 수 없습니다."},400);
        const players=Array.isArray(board.players)?board.players.map(cleanName):[];
        const pi=players.findIndex((name:string)=>name===item.characterName);
        if(pi<0) return json({ok:false,error:item.characterName+" 캐릭터가 메인 목록에 없습니다."},400);
        const cell=board.cells?.[bossName]?.[pi];
        if(!planned(normalizeCell(cell,bossName))){
          return json({ok:false,error:item.characterName+" 캐릭터에 "+bossName+"가 등록되어 있지 않습니다."},400);
        }
      }

      const partyKey=partyKeyFor(normalized);
      const ownerNames=await partyOwnerNames(ownerIds);
      const memberSet=new Set(normalized.map((item:any)=>partyMemberKey(item.ownerId,item.characterName)));
      const {data:rawExisting,error:existingError}=await db
        .from("boss_character_monthly_checks")
        .select("owner_id,month_start,character_name,boss_name,completed,meso_earned,run_date,updated_at")
        .eq("month_start",monthStart).eq("boss_name",bossName).in("owner_id",ownerIds);
      if(existingError)throw existingError;
      let existing=(rawExisting||[]).filter((row:any)=>memberSet.has(partyMemberKey(row.owner_id,row.character_name)));
      let lock=await getPartyLock("monthly",monthStart,bossName,partyKey);

      if(!lock&&completed){
        // Do not create a lock or mark other members complete during an uncheck.
        const authority=chooseExistingPartyAuthority(existing,ownerNames);
        if(authority){
          lock=await insertPartyLock("monthly",monthStart,bossName,partyKey,String(authority.owner_id),String(authority.character_name),String(authority.run_date||monthStart));
          const existingMap=new Map(existing.map((row:any)=>[partyMemberKey(row.owner_id,row.character_name),row]));
          const alignRows=normalized.map((item:any)=>{
            const old:any=existingMap.get(partyMemberKey(item.ownerId,item.characterName));
            const meso=old&&Number(old.meso_earned)>0?Math.max(0,Number(old.meso_earned)||0):Math.max(0,Math.round(Number(item.mesoEarned)||0));
            return {
              owner_id:item.ownerId,month_start:monthStart,character_name:item.characterName,boss_name:bossName,
              completed:true,meso_earned:meso,run_date:String(lock.run_date),updated_at:new Date().toISOString()
            };
          });
          const {data:aligned,error:alignError}=await db.from("boss_character_monthly_checks")
            .upsert(alignRows,{onConflict:"owner_id,month_start,character_name,boss_name"})
            .select("owner_id,month_start,character_name,boss_name,completed,meso_earned,run_date,updated_at");
          if(alignError)throw alignError;
          existing=aligned||[];
        }
      }

      if(lock&&!partyLockOwnedBy(lock,sourceOwnerId,sourceCharacterName)){
        const incomingRank=syncOwnerRank(ownerNames.get(sourceOwnerId)||"");
        const lockRank=syncOwnerRank(ownerNames.get(String(lock.source_owner_id))||"");
        if(completed&&String(lock.run_date)===runDate&&incomingRank<lockRank){
          lock=await updatePartyLock(lock,sourceOwnerId,sourceCharacterName,runDate);
        }else{
          return json({
            ok:true,atomic:true,locked:true,
            lockedByOwnerId:String(lock.source_owner_id),
            lockedByCharacterName:String(lock.source_character_name||""),
            lockedRunDate:String(lock.run_date||""),
            items:existing
          });
        }
      }

      if(!lock&&completed){
        lock=await insertPartyLock("monthly",monthStart,bossName,partyKey,sourceOwnerId,sourceCharacterName,runDate);
        if(lock&&!partyLockOwnedBy(lock,sourceOwnerId,sourceCharacterName)){
          const incomingRank=syncOwnerRank(ownerNames.get(sourceOwnerId)||"");
          const lockRank=syncOwnerRank(ownerNames.get(String(lock.source_owner_id))||"");
          if(String(lock.run_date)===runDate&&incomingRank<lockRank){
            lock=await updatePartyLock(lock,sourceOwnerId,sourceCharacterName,runDate);
          }else{
            return json({
              ok:true,atomic:true,locked:true,
              lockedByOwnerId:String(lock.source_owner_id),
              lockedByCharacterName:String(lock.source_character_name||""),
              lockedRunDate:String(lock.run_date||""),
              items:existing
            });
          }
        }
      }

      const updatedAt=new Date().toISOString();
      const rows=normalized.map((item:any)=>{
        const mesoEarned=completed&&Number.isFinite(item.mesoEarned)?Math.max(0,Math.round(item.mesoEarned)):0;
        return {
          owner_id:item.ownerId,
          month_start:monthStart,
          character_name:item.characterName,
          boss_name:item.bossName,
          completed,
          meso_earned:mesoEarned,
          run_date:completed?runDate:null,
          updated_at:updatedAt
        };
      });

      const {data,error}=await db
        .from("boss_character_monthly_checks")
        .upsert(rows,{onConflict:"owner_id,month_start,character_name,boss_name"})
        .select("owner_id,month_start,character_name,boss_name,completed,meso_earned,run_date,updated_at");
      if(error) throw error;
      if((data||[]).length!==rows.length) throw new Error("공용 월간 파티 저장 결과 수가 일치하지 않습니다.");

      if(lock&&partyLockOwnedBy(lock,sourceOwnerId,sourceCharacterName)){
        if(completed) await updatePartyLock(lock,sourceOwnerId,sourceCharacterName,runDate);
        else await deletePartyLock(lock);
      }
      return json({ok:true,atomic:true,locked:false,items:data||[]});
    }

    if(action==="save_monthly_boss_run_bulk"){
      const owner=await getOwnerById(String(body.ownerId||""));
      if(!owner) return json({ok:false,error:"주인을 찾을 수 없습니다."},404);

      const monthStart=String(body.monthStart||"");
      const runDate=String(body.runDate||monthStart);
      const items=Array.isArray(body.items)?body.items:[];
      if(!/^\d{4}-\d{2}-01$/.test(monthStart) || monthStart<"2026-09-01"){
        return json({ok:false,error:"올바른 월이 아닙니다."},400);
      }
      if(!/^\d{4}-\d{2}-\d{2}$/.test(runDate) || runDate.slice(0,7)!==monthStart.slice(0,7)){
        return json({ok:false,error:"선택한 날짜가 해당 월 범위를 벗어났습니다."},400);
      }
      if(!items.length) return json({ok:true,items:[]});
      if(items.length>200) return json({ok:false,error:"한 번에 저장할 수 있는 보스 수를 초과했습니다."},400);

      const updatedAt=new Date().toISOString();
      const rows=items.map((item:any)=>{
        const characterName=cleanName(item.characterName);
        const bossName=cleanName(item.bossName);
        if(!characterName||!MONTHLY.has(bossName)) throw new Error("월간 보스 정보가 올바르지 않습니다.");
        const completed=!!item.completed;
        const rawMeso=Number(item.mesoEarned||0);
        const mesoEarned=completed&&Number.isFinite(rawMeso)?Math.max(0,Math.round(rawMeso)):0;
        return {
          owner_id:owner.id,
          month_start:monthStart,
          character_name:characterName,
          boss_name:bossName,
          completed,
          meso_earned:mesoEarned,
          run_date:completed?runDate:null,
          updated_at:updatedAt
        };
      });

      const {data,error}=await db
        .from("boss_character_monthly_checks")
        .upsert(rows,{onConflict:"owner_id,month_start,character_name,boss_name"})
        .select("owner_id,month_start,character_name,boss_name,completed,meso_earned,run_date,updated_at");
      if(error) throw error;
      return json({ok:true,items:data||[]});
    }

    if(action==="party_boss_state_get"){
      const {data,error}=await db.from("boss_party_balancer_state")
        .select("id,payload,updated_by,updated_at")
        .eq("id",1)
        .maybeSingle();
      if(error) throw error;
      return json({
        ok:true,
        state:data?.payload||{},
        updatedBy:String(data?.updated_by||""),
        updatedAt:String(data?.updated_at||"")
      });
    }

    if(action==="party_boss_state_save"){
      const raw=body.payload;
      if(!raw||typeof raw!=="object"||Array.isArray(raw)){
        return json({ok:false,error:"파티보스 저장 정보가 올바르지 않습니다."},400);
      }
      const rawText=JSON.stringify(raw);
      if(rawText.length>180000){
        return json({ok:false,error:"파티보스 저장 정보가 너무 큽니다."},413);
      }

      const settingsRaw=(raw.settings&&typeof raw.settings==="object"&&!Array.isArray(raw.settings))?raw.settings:{};
      const boss=cleanName(settingsRaw.boss);
      if(!BOSSES.includes(boss)){
        return json({ok:false,error:"파티보스 보스 정보가 올바르지 않습니다."},400);
      }
      const partySizeRaw=settingsRaw.partySize;
      const partySize=(partySizeRaw==="any"||Number(partySizeRaw)===0)
        ?"any"
        :Math.max(2,Math.min(6,Number(partySizeRaw)||3));
      const partyCount=Math.max(0,Math.min(50,Math.floor(Number(settingsRaw.partyCount)||0)));
      const targetRate=Math.max(0,Math.min(100000,Number(settingsRaw.targetRate)||0));
      const allowedDifficulties=BOSS_DIFFICULTIES[boss]||[];
      const rawDifficulty=cleanName(settingsRaw.difficulty);
      const difficulty=allowedDifficulties.includes(rawDifficulty)
        ?rawDifficulty
        :(boss==="검은 마법사"&&allowedDifficulties.includes("익스트림")
          ?"익스트림"
          :(allowedDifficulties.includes("하드")?"하드":String(allowedDifficulties[0]||"")));

      const selected=Array.isArray(raw.selected)
        ?raw.selected.map((x:any)=>String(x||"").slice(0,120)).filter(Boolean).slice(0,500)
        :[];

      const multipliers:any={};
      const rawMultipliers=(raw.multipliers&&typeof raw.multipliers==="object"&&!Array.isArray(raw.multipliers))?raw.multipliers:{};
      for(const b of BOSSES){
        const src=rawMultipliers[b];
        if(!src||typeof src!=="object"||Array.isArray(src))continue;
        const out:any={};
        let count=0;
        for(const [key,value] of Object.entries(src)){
          if(count>=500)break;
          const v=Math.max(0,Math.min(100000,Number(value)||0));
          if(v>0){
            out[String(key).slice(0,120)]=v;
            count++;
          }
        }
        multipliers[b]=out;
      }

      const result=Array.isArray(raw.result)
        ?raw.result.slice(0,100).map((p:any,i:number)=>({
            id:Math.max(1,Math.min(100,Number(p?.id)||i+1)),
            memberKeys:Array.isArray(p?.memberKeys)
              ?p.memberKeys.map((x:any)=>String(x||"").slice(0,120)).filter(Boolean).slice(0,6)
              :[]
          })).filter((p:any)=>p.memberKeys.length)
        :[];

      const mode=["balanced","strong","equal","small","safe"].includes(String(settingsRaw.mode||""))?String(settingsRaw.mode):"strong";
      const payload={settings:{boss,difficulty,partySize,partyCount,targetRate,mode},selected,multipliers,result};
      const updatedBy=cleanName(body.updatedBy||"");

      const {data,error}=await db.from("boss_party_balancer_state")
        .upsert({
          id:1,
          payload,
          updated_by:updatedBy,
          updated_at:new Date().toISOString()
        },{onConflict:"id"})
        .select("id,payload,updated_by,updated_at")
        .single();
      if(error) throw error;
      return json({
        ok:true,
        state:data.payload||{},
        updatedBy:String(data.updated_by||""),
        updatedAt:String(data.updated_at||"")
      });
    }

    if(action==="verify_admin"){
      const ok=await verifyAdminCode(String(body.adminCode||""));
      return ok?json({ok:true}):json({ok:false,error:"관리자 번호가 맞지 않습니다."},403);
    }

    if(action==="save_board"){
      const owner=await ownerAuth(String(body.ownerId||""),String(body.pin||""),String(body.adminCode||""));
      if(!owner) return json({ok:false,error:"수정 권한을 확인할 수 없습니다."},401);
      const incoming=stripSync(normalizeBoard(body.board,owner.name));
      const base=stripSync(normalizeBoard(body.baseBoard||body.board,owner.name));
      await saveBoardWithRetry(owner,base,incoming);
      const rows=await rebuild();
      return json({ok:true,merged:true,...publicPayload(rows)});
    }

    if(action==="change_pin"){
      const auth=await ownerAuth(String(body.ownerId||""),String(body.currentPin||""),String(body.adminCode||""));
      if(!auth) return json({ok:false,error:"비밀번호 또는 관리자 권한이 맞지 않습니다."},401);
      const newPin=String(body.newPin||"");
      if(!/^\d{4,12}$/.test(newPin)) return json({ok:false,error:"새 비밀번호는 숫자 4~12자리로 입력해 주세요."},400);
      const password_hash=await pinHash(newPin);
      const {error}=await db.from("boss_owners")
        .update({password_hash,updated_at:new Date().toISOString()})
        .eq("id",auth.id);
      if(error) throw error;
      return json({ok:true});
    }

    if(action==="create_owner"){
      const adminOk=await verifyAdminCode(String(body.adminCode||""));
      if(!adminOk) return json({ok:false,error:"관리자 번호가 맞지 않습니다."},403);

      const name=cleanName(body.name);
      const newPin=String(body.newPin||"");
      if(!name) return json({ok:false,error:"주인 이름을 입력해 주세요."},400);
      if(!/^\d{4,12}$/.test(newPin)) return json({ok:false,error:"새 비밀번호는 숫자 4~12자리로 입력해 주세요."},400);
      const password_hash=await pinHash(newPin);
      const {data:newOwner,error:e1}=await db.from("boss_owners").insert({name,password_hash}).select("id,name").single();
      if(e1){
        if(String(e1.code)==="23505") return json({ok:false,error:"이미 같은 이름의 주인이 있습니다."},409);
        throw e1;
      }
      const {error:e2}=await db.from("boss_boards").insert({owner_id:newOwner.id,data:blankBoard(name)});
      if(e2) throw e2;
      const rows=await rebuild();
      return json({ok:true,newOwnerId:newOwner.id,...publicPayload(rows)});
    }

    if(action==="rename_owner"){
      const auth=await ownerAuth(String(body.ownerId||""),String(body.pin||""),String(body.adminCode||""));
      if(!auth) return json({ok:false,error:"수정 권한을 확인할 수 없습니다."},401);
      const newName=cleanName(body.newName);
      if(!newName) return json({ok:false,error:"새 이름을 입력해 주세요."},400);
      const oldName=auth.name;
      const {error:e1}=await db.from("boss_owners").update({name:newName,updated_at:new Date().toISOString()}).eq("id",auth.id);
      if(e1){
        if(String(e1.code)==="23505") return json({ok:false,error:"이미 같은 이름의 주인이 있습니다."},409);
        throw e1;
      }

      let rows=await getRows();
      for(const r of rows){
        const b=stripSync(normalizeBoard(r.board,r.owner.id===auth.id?newName:r.owner.name));
        if(r.owner.id===auth.id){
          b.players=b.players.map((p:string)=>cleanName(p)===oldName?newName:p);
        }
        for(const boss of BOSSES){
          for(const c of b.cells[boss]) c.names=(c.names||[]).map((n:string)=>cleanName(n)===oldName?newName:n);
        }
        const {error}=await db.from("boss_boards").update({data:b,updated_at:new Date().toISOString()}).eq("owner_id",r.owner.id);
        if(error) throw error;
      }
      rows=await rebuild();
      return json({ok:true,...publicPayload(rows)});
    }

    if(action==="delete_owner"){
      const adminOk=await verifyAdminCode(String(body.adminCode||""));
      if(!adminOk) return json({ok:false,error:"관리자 번호가 맞지 않습니다."},403);
      const auth=await getOwnerById(String(body.ownerId||""));
      if(!auth) return json({ok:false,error:"주인을 찾을 수 없습니다."},404);

      const {count}=await db.from("boss_owners").select("id",{count:"exact",head:true});
      if((count||0)<=1) return json({ok:false,error:"보스판은 1개 이상 있어야 합니다."},400);
      const {error}=await db.from("boss_owners").delete().eq("id",auth.id);
      if(error) throw error;
      const rows=await rebuild();
      return json({ok:true,...publicPayload(rows)});
    }

    return json({ok:false,error:"Unknown action"},400);
  }catch(error){
    console.error(error);
    return json({ok:false,error:"서버 처리 중 오류가 발생했습니다."},500);
  }
});