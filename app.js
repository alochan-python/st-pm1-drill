// 反射キー（常識モード用・10〜20字の要約）
const RK={1:"人増やせない→負荷削減で捻出",2:"品質重視→温度等の輸送条件",3:"欠品防止→納入日数を提示",4:"接続→即時参照→回答が速い",5:"需要の先行情報＝特売イベント",6:"本社集約→量で価格交渉",7:"追跡＝出荷先×ロット番号",8:"見直し最小→新旧の対応整理",9:"一元化の副作用＝適時性欠如",10:"体制見直し＝当事者を参加",11:"既存記録あり→自動連携",12:"記述の標準化＋中心組織の支援",13:"工程別集計→ボトルネック予測",14:"顧客の人不足→業務を受託",15:"品目増→事前準備の割合増",16:"枠＝時間帯ごとの作業者数",17:"品質向上の理由＝一段手前の精度",18:"学習データ＝人が見つけた正解",19:"ニーズ＝自ら解決したい",20:"KPI＝単位を守る（割合）",21:"現象→品質特性へ抽象化",22:"ボトルネック＝最大負荷の1作業",23:"統制＝自動化を管理できない",24:"リスク＝原因→事業への結果",25:"新規構築＝外部の制約を解消",26:"狙い＝顧客が新たにできる事",27:"販促の狙い＝顧客行動の変化",28:"権限委譲＝機会損失を防ぐ",29:"機能→対応する業務の取組",30:"再構築＝変更しにくさを解消",31:"API連携→新顧客層の注文獲得",32:"予測で決める＝量・時期・確保",33:"事業リスク＝原因でなく悪影響",34:"新基盤の目的＝保証したい成果",35:"技術採用理由＝固有の性質",36:"解決する問題＝今の悪い状態",37:"仕組み上の課題＝不都合を状態で",38:"抑止＝加害者に不利益",39:"強み＝資源／弱み＝全体の不利",40:"基盤の狙い＝変更容易性と連携",41:"データ取得の目的＝個別最適化",42:"PoCのKPI＝利用者数（人数）",43:"自社の強み＝他社比較で優位",44:"多く必要な理由＝性能差分",45:"提携理由＝自社で作れない技術",46:"市場の問題＝今の不足状態",47:"競争優位＝シェア・保有機能",48:"将来構想の再構築＝拡張性",49:"地域密着＋双方向＝価値共創",50:"IT活用→体験する新サービス",51:"強み＝満足に直結する組織能力",52:"分析の目的＝誰にいつ働き掛け",53:"技術×顧客課題＝具体用途",54:"背景＝必要になった現状制約",55:"提携理由＝阻害要因を解消",56:"いつまでに＝期限＋完了行為",57:"環境変化＝外部の変化",58:"表面化した問題＝原因の先の実害",59:"ニーズ＝誰が何を・主体確認",60:"戦略の狙い＝企業側の達成事項",61:"機能＝どの内容をどの方法へ",62:"具体例→能力へ一段抽象化"};

const SPEED={1:{name:"じっくり",sec:30},2:{name:"標準",sec:15},3:{name:"高速",sec:8},4:{name:"超高速",sec:4}};
const KEY="st-pm1-drill-v1";
const $=s=>document.querySelector(s);

function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function fresh(){return{speed:2,mode:null,lastMode:"A",lastNo:{A:null,B:null},
  A:{order:shuffle(DATA.map(d=>d.no)),pos:0,res:{}},B:{order:shuffle(DATA.map(d=>d.no)),pos:0,res:{}},
  C:{queue:[],cur:null},answered:0}}
let S;
try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){}
if(!S||!S.A||!S.B)S=fresh();
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}

const byNo=n=>DATA.find(d=>d.no===n);
let phase="q",cur=null,curMode=null,timer=null,tLeft=0,tTotal=0,suggested=null,userAns="";

// ---------- 速度ゲージ ----------
const slider=$("#speed");
function setSpeed(v){v=Math.max(1,Math.min(4,v));S.speed=v;slider.value=v;
  $("#spdLabel").innerHTML=`速度${v}：${SPEED[v].name}<small>答えまで ${SPEED[v].sec}秒／表示量 ${["","詳しく","標準","最小限","○△×と核心のみ"][v]}</small>`;
  save();if(phase==="a")renderAnswer(); else if(phase==="q"&&cur){tTotal=SPEED[v].sec;deadline=Math.min(deadline,Date.now()+tTotal*1000)}}
slider.addEventListener("input",()=>setSpeed(+slider.value));

// ---------- 進捗 ----------
function counts(m){const r=Object.values(S[m].res);return{o:r.filter(x=>x==="o").length,t:r.filter(x=>x==="t").length,x:r.filter(x=>x==="x").length,n:r.length}}
function renderProg(){
  const m=curMode==="C"?S.lastMode:(curMode||S.lastMode);const c=counts(m);
  const lab=curMode==="C"?`C復習（残り${S.C.queue.length+(S.C.cur?1:0)}件・${m}）｜`:`${m==="A"?"A IPA解答":"B 常識"}｜`;
  $("#prog").innerHTML=`${lab}進捗 ${c.n} / 62　<b class="o">○ ${c.o}</b>　<b class="t">△ ${c.t}</b>　<b class="x">× ${c.x}</b>`;
  document.querySelectorAll(".menu [data-m]").forEach(b=>b.classList.toggle("on",b.dataset.m===curMode));
}

// ---------- タイマー ----------
let deadline=0;
function startTimer(){stopTimer();tTotal=SPEED[S.speed].sec;deadline=Date.now()+tTotal*1000;tick();timer=setInterval(tick,100)}
function tick(){tLeft=(deadline-Date.now())/1000;$("#bar").style.width=Math.max(0,tLeft/tTotal*100)+"%";
  const c=$("#count");if(c)c.textContent=Math.max(0,Math.ceil(tLeft))+"秒後に答え";
  if(tLeft<=0){stopTimer();submit(true)}}
function stopTimer(){if(timer)clearInterval(timer);timer=null}

// ---------- 採点補助（文字バイグラム一致率） ----------
const norm=s=>(s||"").replace(/[\s，,。．、・／\/（）()「」『』①②：:]/g,"");
function bigrams(s){s=norm(s);const g=new Set();for(let i=0;i<s.length-1;i++)g.add(s.slice(i,i+2));return g}
function coverage(user,ref){const r=bigrams(ref),u=bigrams(user);if(!r.size)return 0;let h=0;r.forEach(b=>{if(u.has(b))h++});return h/r.size}
function missing(user,ref){
  const parts=ref.replace(/^(ハードウェア面|要員面|検討内容|留意点|サプライチェーン|仕入先と顧客|強み|弱み)：/gm,"")
    .split(/[，、。・\n／]|や|と|を|が|に|の|で|から|ため|こと/).map(s=>s.trim()).filter(s=>s.length>=2);
  const u=norm(user);return [...new Set(parts)].filter(p=>coverage(u,p)<0.5);
}
function suggest(user,ref){if(!norm(user))return"x";const c=coverage(user,ref);return c>=0.55?"o":c>=0.28?"t":"x"}

// ---------- 出題 ----------
function nextNo(m){
  if(m==="C"){
    if(!S.C.cur){if(!S.C.queue.length)return null;S.C.cur=S.C.queue.shift()}
    return S.C.cur;
  }
  const st=S[m];if(st.pos>=st.order.length)return null;
  // 別モードの直前問題と同じなら後ろへ回す（A/B同一問題の連続出題を避ける）
  const other=m==="A"?"B":"A";
  if(st.order[st.pos]===S.lastNo[other]&&st.pos+1<st.order.length){const i=st.pos;[st.order[i],st.order[i+1]]=[st.order[i+1],st.order[i]]}
  return st.order[st.pos];
}
function start(m){
  if(m==="C"){
    const src=S.lastMode;
    const q=Object.entries(S[src].res).filter(([,v])=>v!=="o").map(([k])=>+k);
    if(!q.length){curMode="C";phase="none";stopTimer();renderProg();$("#main").innerHTML=`<div class="card">${src}モードの△×はありません。</div>`;return}
    if(!S.C.cur&&!S.C.queue.length||S.C.src!==src){S.C={queue:shuffle(q),cur:null,src}}
  }else S.lastMode=m;
  curMode=m;S.mode=m;save();show();
}
function show(){
  const n=nextNo(curMode);renderProg();
  if(n==null){stopTimer();phase="none";
    $("#main").innerHTML=`<div class="card big">${curMode==="C"?"復習対象はすべて正解しました。":curMode+"モード 全62件終了。"}<div class="btns"><button onclick="showResult()">成績を見る</button></div></div>`;return}
  cur=byNo(n);phase="q";userAns="";
  const m=curMode==="C"?S.C.src:curMode;
  const tag=curMode==="C"?`C復習・${m}`:m==="A"?"A IPA解答":"B 常識";
  let body;
  if(m==="A"){
    body=`<div class="q">${esc(cur.q)}</div>${S.speed<=2?`<div class="kw">本文キーワード：${esc(cur.k)}</div>`:""}`;
  }else{
    body=`<div class="kw">本文キーワード：${esc(cur.k)}</div><div class="q big">${esc(cur.sq)}</div><div class="hint">→ この設問で働かせる「常識」を答える</div>`;
  }
  $("#main").innerHTML=`<div class="card"><div class="hd"><span class="tag">${tag}</span>No.${cur.no}　${esc(cur.h)}</div>${body}
  <textarea id="ans" placeholder="（任意）回答を入力するとアプリが仮判定します。入力しなくても時間が来れば答えが出ます"></textarea><div class="cnt" id="cnt">0字</div>
  <div class="btns"><button onclick="submit()">すぐ答えを見る ⏎</button></div><div class="hint" id="count"></div></div>`;
  const ta=$("#ans");
  ta.addEventListener("input",()=>$("#cnt").textContent=norm(ta.value).length+"字");
  ta.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing){e.preventDefault();submit()}});
  startTimer();
}
function submit(timeout){
  if(phase!=="q")return;stopTimer();
  userAns=$("#ans")?$("#ans").value:"";
  const m=curMode==="C"?S.C.src:curMode;
  suggested=norm(userAns)?suggest(userAns,m==="A"?cur.a:cur.c):null;
  phase="a";renderAnswer(timeout);
}
const J={o:"○",t:"△",x:"×"},JC={o:"j-o",t:"j-t",x:"j-x"};
function renderAnswer(timeout){
  const m=curMode==="C"?S.C.src:curMode,sp=S.speed;let h="";
  const jd=suggested?`<div class="judge ${JC[suggested]}">【判定】${J[suggested]} <span class="hint">（仮判定・下のボタンで修正可）</span></div>`:`<div class="judge">【判定】<span class="hint">○△×を自己判定（1・2・3）</span></div>`;
  h+=m==="A"?`<div class="blk"><h4>設問</h4><div class="qa">${esc(cur.q)}</div>${sp<=2?`<div class="kw">本文キーワード：${esc(cur.k)}</div>`:""}</div>`:`<div class="blk"><h4>設問</h4><div class="qa">${esc(cur.sq)}</div><div><span class="kw">（本文キーワード：${esc(cur.k)}）</span></div></div>`;
  if(userAns)h+=`<div class="blk"><h4>あなたの回答</h4><div>${esc(userAns)}</div></div>`;
  if(m==="A"){
    h+=`<div class="blk"><h4>【IPA解答】</h4><div class="ans">${esc(cur.a)}</div></div>`;
    if(sp<=3){const ms=missing(userAns,cur.a);h+=`<div class="blk miss"><h4>【不足語句】</h4><div>${ms.length?ms.map(x=>`<span>${esc(x)}</span>`).join(""):"なし"}</div></div>`}
    h+=`<div class="blk"><h4>【核心】</h4><div>${esc(cur.sq)} → <b>${esc(cur.sa)}</b></div></div>`;
    h+=`<div class="blk"><h4 class="star">★ 常識として覚えること</h4><div class="cmn">${esc(cur.c)}</div></div>`;
        if(sp===1){if(cur.n)h+=`<div class="blk"><h4>注記</h4><div class="note">${esc(cur.n)}</div></div>`}
  }else{
    h+=`<div class="blk"><h4 class="star">★ 常識として覚えること</h4><div class="cmn">${esc(cur.c)}</div></div>`;
    h+=`<div class="blk"><h4>【反射キー】</h4><div class="big"><b>${esc(RK[cur.no])}</b></div></div>`;
    if(sp<=3){const ms=missing(userAns,cur.c);if(sp<=2)h+=`<div class="blk miss"><h4>不足語句</h4><div>${ms.length?ms.slice(0,8).map(x=>`<span>${esc(x)}</span>`).join(""):"なし"}</div></div>`}
    if(sp<=2)h+=`<div class="blk"><h4>設問→答え</h4><div>${esc(cur.sq)} → ${esc(cur.sa)}</div></div>`;
    
  }
  $("#main").innerHTML=`<div class="card"><div class="hd">No.${cur.no}　${esc(cur.h)}</div>${jd}${h}
  <div class="btns"><button class="bo" onclick="decide('o')">○ 1</button><button class="bt" onclick="decide('t')">△ 2</button><button class="bx" onclick="decide('x')">× 3</button></div>
  <div class="hint">1・2・3で判定して次へ${suggested?"／Enter＝仮判定のまま次へ":""}</div></div>`;
}
function decide(j){
  if(phase!=="a")return;
  const m=curMode==="C"?S.C.src:curMode;
  S[m].res[cur.no]=j;S.lastNo[m]=cur.no;
  if(curMode==="C"){if(j!=="o")S.C.queue.push(cur.no);S.C.cur=null}
  else S[m].pos++;
  S.answered=(S.answered||0)+1;save();
  if(S.answered%10===0){const c=counts(m);show();$("#main").insertAdjacentHTML("afterbegin",`<div class="toast">10問経過｜${m} 進捗 ${c.n}/62　○${c.o} △${c.t} ×${c.x}</div>`);return}
  show();
}

// ---------- 切替・終了 ----------
$("#btnSwitch").onclick=()=>start(S.lastMode==="A"?"B":"A");
$("#btnEnd").onclick=()=>showResult();
$("#btnHome").onclick=()=>home();
document.querySelectorAll(".menu [data-m]").forEach(b=>b.onclick=()=>start(b.dataset.m));
function showResult(){
  stopTimer();phase="none";curMode=null;renderProg();
  const a=counts("A"),b=counts("B");
  const pri=[];
  ["x","t"].forEach(j=>DATA.forEach(d=>{const ja=S.A.res[d.no],jb=S.B.res[d.no];
    const score=(ja==="x")*2+(jb==="x")*2+(ja==="t")+(jb==="t");
    if((ja===j||jb===j)&&!pri.find(p=>p.d.no===d.no))pri.push({d,score,ja,jb})}));
  pri.sort((p,q)=>q.score-p.score);
  $("#main").innerHTML=`<div class="card"><table>
  <tr><th>IPA解答モード</th><td>○${a.o}件／△${a.t}件／×${a.x}件</td></tr>
  <tr><th>常識モード</th><td>○${b.o}件／△${b.t}件／×${b.x}件</td></tr></table>
  <div class="blk"><h4>最優先復習10件</h4><table>${pri.slice(0,10).map(p=>`<tr><td>No.${p.d.no}</td><td>${esc(p.d.h)}</td><td>A:${J[p.ja]||"-"} B:${J[p.jb]||"-"}</td></tr>`).join("")||"<tr><td>なし</td></tr>"}</table></div>
  <div class="btns"><button onclick="if(confirm('成績と進捗をリセットしますか？')){S=fresh();save();home()}">リセット</button></div></div>`;
}
function home(){stopTimer();$("#bar").style.width="100%";curMode=null;phase="none";renderProg();
  const a=counts("A"),b=counts("B");
  $("#main").innerHTML=`<div class="card"><div class="big">モードを選んでください</div>
  <div class="btns"><button onclick="start('A')">A：IPA解答（${a.n}/62）</button><button onclick="start('B')">B：常識（${b.n}/62）</button></div>
  <div class="btns"><button onclick="start('C')">C：△×だけ復習</button><button onclick="showResult()">E：終了・成績</button></div>
  <div class="hint">速度ゲージは上のスライダー（キー：[ ] または ← →）。速度で答えが出るまでの秒数（30/15/8/4秒）と表示量が変わります。入力は任意、Space/Enterですぐ答えを表示。Escまたは「⌂ メイン」でこの画面に戻れます（進捗は保持）。進捗はこのブラウザに保存され、再開時は続きから始まります。</div></div>`}

// ---------- キー操作 ----------
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){e.preventDefault();home();return}
  if(e.target.tagName==="TEXTAREA")return;
  if(e.key==="["||e.key==="ArrowLeft"){setSpeed(S.speed-1);e.preventDefault()}
  else if(e.key==="]"||e.key==="ArrowRight"){setSpeed(S.speed+1);e.preventDefault()}
  else if(phase==="a"){if(e.key==="1")decide("o");else if(e.key==="2")decide("t");else if(e.key==="3")decide("x");else if(e.key==="Enter"&&suggested){e.preventDefault();decide(suggested)}}
  else if(phase==="q"&&(e.key===" "||e.key==="Enter")){e.preventDefault();submit()}
});
function esc(s){return String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}

setSpeed(S.speed||2);home();
