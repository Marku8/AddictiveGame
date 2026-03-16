// ═══════════════════════════════════════════
//  GAME.JS — logic, generator, move engine
// ═══════════════════════════════════════════

// ── TILE CONSTANTS ──
const T = { VOID:0, WALL:1, FLOOR:2, TARGET:3, BOX:4, BOX_ON:5, PLAYER:6, PLAYER_ON:7 };
const DIRS = [[0,-1],[0,1],[-1,0],[1,0]];

// ── STATE ──
let gameMap = [], playerPos = {x:0,y:0}, moves = 0, history = [];
let levelNum = 0, savedMap = null, currentDiff = null;

// ── DIFFICULTY ──
function getDiff(n) {
  if (n<=2)  return {boxes:1,w:5, h:5, walls:2, min:3,  label:'EASY',  cls:'diff-easy'};
  if (n<=5)  return {boxes:1,w:6, h:6, walls:4, min:4,  label:'EASY',  cls:'diff-easy'};
  if (n<=9)  return {boxes:2,w:6, h:6, walls:4, min:5,  label:'MEDIUM',cls:'diff-medium'};
  if (n<=14) return {boxes:2,w:7, h:7, walls:5, min:6,  label:'MEDIUM',cls:'diff-medium'};
  if (n<=20) return {boxes:3,w:7, h:7, walls:6, min:7,  label:'HARD',  cls:'diff-hard'};
  if (n<=28) return {boxes:3,w:7, h:7, walls:8, min:9,  label:'HARD',  cls:'diff-hard'};
  if (n<=36) return {boxes:4,w:7, h:7, walls:7, min:10, label:'HARD',  cls:'diff-hard'};
  if (n<=45) return {boxes:4,w:8, h:8, walls:8, min:11, label:'HARD',  cls:'diff-hard'};
  if (n<=55) return {boxes:5,w:8, h:8, walls:9, min:12, label:'EXPERT',cls:'diff-hard'};
  if (n<=68) return {boxes:5,w:9, h:9, walls:10,min:13, label:'EXPERT',cls:'diff-hard'};
  if (n<=82) return {boxes:6,w:9, h:9, walls:11,min:14, label:'EXPERT',cls:'diff-hard'};
  return           {boxes:6,w:10,h:10,walls:12,min:15, label:'EXPERT',cls:'diff-hard'};
}

// ── UTILS ──
function rnd(n) { return Math.floor(Math.random() * n); }
function shuffle(a) { for (let i=a.length-1;i>0;i--) { const j=rnd(i+1); [a[i],a[j]]=[a[j],a[i]]; } return a; }

// ── ROOM BUILDER ──
function buildRoom(w, h, wallCount) {
  const map = Array.from({length:h}, () => Array(w).fill(T.WALL));
  for (let y=1;y<h-1;y++) for (let x=1;x<w-1;x++) map[y][x] = T.FLOOR;
  const cells = [];
  for (let y=1;y<h-1;y++) for (let x=1;x<w-1;x++) cells.push({x,y});
  shuffle(cells);
  let placed = 0;
  for (const c of cells) {
    if (placed >= wallCount) break;
    map[c.y][c.x] = T.WALL;
    if (countConnected(map,w,h) < (w-2)*(h-2)-placed-1) {
      map[c.y][c.x] = T.FLOOR;
    } else {
      placed++;
    }
  }
  return map;
}

function countConnected(map, w, h) {
  let start = null;
  for (let y=0;y<h&&!start;y++) for (let x=0;x<w&&!start;x++) if (map[y][x]===T.FLOOR) start={x,y};
  if (!start) return 0;
  const vis = new Set();
  const q = [start];
  vis.add(`${start.x},${start.y}`);
  while (q.length) {
    const {x,y} = q.shift();
    for (const [dx,dy] of DIRS) {
      const nx=x+dx, ny=y+dy, k=`${nx},${ny}`;
      if (!vis.has(k) && ny>=0&&ny<h&&nx>=0&&nx<w && map[ny][nx]===T.FLOOR) { vis.add(k); q.push({x:nx,y:ny}); }
    }
  }
  return vis.size;
}

function getFloors(map, w, h) {
  const f = [];
  for (let y=0;y<h;y++) for (let x=0;x<w;x++) if (map[y][x]===T.FLOOR) f.push({x,y});
  return f;
}

// ── DEAD-LOCK CHECKER ──
function isDeadLock(map, boxes, targets, w, h) {
  const tSet = new Set(targets.map(t=>`${t.x},${t.y}`));
  for (const b of boxes) {
    if (tSet.has(`${b.x},${b.y}`)) continue;
    const wu = b.y<=0   || map[b.y-1][b.x]===T.WALL || map[b.y-1][b.x]===T.VOID;
    const wd = b.y>=h-1 || map[b.y+1][b.x]===T.WALL || map[b.y+1][b.x]===T.VOID;
    const wl = b.x<=0   || map[b.y][b.x-1]===T.WALL || map[b.y][b.x-1]===T.VOID;
    const wr = b.x>=w-1 || map[b.y][b.x+1]===T.WALL || map[b.y][b.x+1]===T.VOID;
    if ((wu&&wl)||(wu&&wr)||(wd&&wl)||(wd&&wr)) return true;
  }
  return false;
}

// ── BOX REACHABILITY ──
function boxesCanReachTargets(map, boxes, targets, w, h) {
  const tSet = new Set(targets.map(t=>`${t.x},${t.y}`));
  function isWall(x,y) { return x<0||x>=w||y<0||y>=h||map[y][x]===T.WALL||map[y][x]===T.VOID; }
  function reachable(bx, by) {
    const vis = new Set([`${bx},${by}`]);
    const q = [{x:bx,y:by}];
    while (q.length) {
      const {x,y} = q.shift();
      for (const [dx,dy] of DIRS) {
        const nx=x+dx, ny=y+dy, px=x-dx, py=y-dy;
        if (isWall(nx,ny)||isWall(px,py)) continue;
        const k = `${nx},${ny}`;
        if (!vis.has(k)) { vis.add(k); q.push({x:nx,y:ny}); }
      }
    }
    return vis;
  }
  for (const b of boxes) {
    if (![...tSet].some(t => reachable(b.x,b.y).has(t))) return false;
  }
  return true;
}

// ── BFS SOLVER (used for easy/medium only) ──
function bfsSolve(initMap, w, h) {
  let initPlayer = null;
  const initBoxes = [], targets = [];
  for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
    const c = initMap[y][x];
    if (c===T.PLAYER||c===T.PLAYER_ON) initPlayer = {x,y};
    if (c===T.BOX||c===T.BOX_ON) initBoxes.push({x,y});
    if (c===T.TARGET||c===T.BOX_ON||c===T.PLAYER_ON) targets.push(`${x},${y}`);
  }
  if (!initPlayer||!initBoxes.length) return null;
  const tSet = new Set(targets);
  function isStaticWall(x,y) { return x<0||x>=w||y<0||y>=h||initMap[y][x]===T.WALL||initMap[y][x]===T.VOID; }
  function key(px,py,boxes) { return px+','+py+'|'+[...boxes].sort((a,b)=>a.y===b.y?a.x-b.x:a.y-b.y).map(b=>b.x+','+b.y).join(';'); }
  function solved(boxes) { return boxes.every(b=>tSet.has(`${b.x},${b.y}`)); }
  const visited = new Set([key(initPlayer.x,initPlayer.y,initBoxes)]);
  const queue = [{px:initPlayer.x,py:initPlayer.y,boxes:initBoxes,d:0}];
  let checked = 0;
  const MAX = 200000;
  while (queue.length) {
    if (++checked>120000) return null;
    const {px,py,boxes,d} = queue.shift();
    for (const [dx,dy] of DIRS) {
      const nx=px+dx, ny=py+dy;
      if (isStaticWall(nx,ny)) continue;
      let newBoxes = boxes;
      const bi = boxes.findIndex(b=>b.x===nx&&b.y===ny);
      if (bi>=0) {
        const bnx=nx+dx, bny=ny+dy;
        if (isStaticWall(bnx,bny)) continue;
        if (boxes.some((b,i)=>i!==bi&&b.x===bnx&&b.y===bny)) continue;
        newBoxes = boxes.map((b,i)=>i===bi?{x:bnx,y:bny}:b);
        const tgts = targets.map(t=>{const[tx,ty]=t.split(',').map(Number);return{x:tx,y:ty};});
        if (isDeadLock(initMap,newBoxes,tgts,w,h)) continue;
      }
      if (solved(newBoxes)) return d+1;
      const k = key(nx,ny,newBoxes);
      if (!visited.has(k)) { visited.add(k); queue.push({px:nx,py:ny,boxes:newBoxes,d:d+1}); }
    }
  }
  return null;
}

// ── GENERATOR (BFS verified for all levels) ──
function tryGenerate(diff) {
  const {boxes,w,h,walls,min} = diff;
  const map = buildRoom(w,h,walls);
  const floors = getFloors(map,w,h);
  if (floors.length < boxes*3+2) return null;
  shuffle(floors);
  const targets = floors.slice(0,boxes);
  const rest = floors.slice(boxes);
  if (rest.length < boxes+1) return null;
  const boxPositions = rest.slice(0,boxes);
  const pPos = rest[boxes];
  if (isDeadLock(map,boxPositions,targets,w,h)) return null;
  if (!boxesCanReachTargets(map,boxPositions,targets,w,h)) return null;
  const m = map.map(r=>[...r]);
  for (const t of targets) m[t.y][t.x] = T.TARGET;
  for (const b of boxPositions) m[b.y][b.x] = m[b.y][b.x]===T.TARGET ? T.BOX_ON : T.BOX;
  m[pPos.y][pPos.x] = m[pPos.y][pPos.x]===T.TARGET ? T.PLAYER_ON : T.PLAYER;
  const sol = bfsSolve(m,w,h);
  if (!sol||sol<min) return null;
  return m;
}

// ── ASYNC GENERATOR ──
function generateAsync(diff) {
  return new Promise(resolve => {
    let attempt = 0;
    const batchSize = diff.boxes <= 3 ? 12 : diff.boxes <= 4 ? 8 : 5;
    const maxAttempts = diff.boxes <= 3 ? 600 : diff.boxes <= 4 ? 1000 : 1500;
    function batch() {
      for (let i=0; i<batchSize; i++) {
        attempt++;
        if (attempt > maxAttempts) { resolve(makeFallback(diff)); return; }
        if (attempt % 50 === 0) document.getElementById('gen-status').textContent = `ATTEMPT ${attempt}`;
        const m = tryGenerate(diff);
        if (m) { resolve(m); return; }
      }
      setTimeout(batch, 0);
    }
    setTimeout(batch, 0);
  });
}

function makeFallback(diff) {
  const simple = {boxes:1,w:diff.w,h:diff.h,walls:2,min:3,label:diff.label,cls:diff.cls};
  for (let i=0; i<2000; i++) { const m=tryGenerate(simple); if(m) return m; }
  const w=diff.w, h=diff.h;
  const m = Array.from({length:h},()=>Array(w).fill(T.WALL));
  for (let y=1;y<h-1;y++) for (let x=1;x<w-1;x++) m[y][x]=T.FLOOR;
  const mid=Math.floor(w/2), mh=Math.floor(h/2);
  m[mh][mid]=T.BOX; m[mh+1][mid]=T.PLAYER; m[mh-1][mid]=T.TARGET;
  return m;
}

// ── GAME FLOW ──
async function generateAndPlay() {
  document.getElementById('win-overlay').classList.remove('show');
  if (levelNum > 0 && levelNum % 3 === 0) {
    try { (adsbygoogle = window.adsbygoogle || []).push({google_ad_client:"ca-pub-3452887894702338",enable_page_level_ads:true}); } catch(e) {}
    await new Promise(r => setTimeout(r, 500));
  }
  document.getElementById('gen-overlay').classList.add('show');
  levelNum++;
  localStorage.setItem('bp_level', levelNum);
  currentDiff = getDiff(levelNum);
  const map = await generateAsync(currentDiff);
  document.getElementById('gen-overlay').classList.remove('show');
  loadMap(map, levelNum, currentDiff);
  showScreen('game');
}

function startGame() { levelNum = 0; generateAndPlay(); }

function continueGame() {
  levelNum = Math.max(0, parseInt(localStorage.getItem('bp_level')||'0') - 1);
  generateAndPlay();
}

function loadMap(map, num, diff) {
  gameMap = map.map(r=>[...r]);
  savedMap = map.map(r=>[...r]);
  moves = 0; history = [];
  for (let y=0;y<gameMap.length;y++) for (let x=0;x<gameMap[y].length;x++)
    if (gameMap[y][x]===T.PLAYER||gameMap[y][x]===T.PLAYER_ON) playerPos={x,y};
  const badge = diff ? `<span class="diff-badge ${diff.cls}">${diff.label}</span>` : '';
  document.getElementById('level-label').innerHTML = `LEVEL ${num}${badge}`;
  document.getElementById('move-count').textContent = '0';
  updateHUD(); resizeCanvas(); renderGame();
}

function resetLevel() {
  document.getElementById('win-overlay').classList.remove('show');
  if (savedMap) loadMap(savedMap, levelNum, currentDiff);
}
function replayLevel() { resetLevel(); }

// ── MOVE ENGINE ──
function move(dx, dy) {
  const {x,y} = playerPos;
  const nx=x+dx, ny=y+dy;
  const rows=gameMap.length, cols=gameMap[0].length;
  if (ny<0||ny>=rows||nx<0||nx>=cols) return;
  const dest = gameMap[ny][nx];
  if (dest===T.WALL||dest===T.VOID) return;
  history.push({map:gameMap.map(r=>[...r]), pos:{...playerPos}, moves});
  const isBox = v => v===T.BOX||v===T.BOX_ON;
  if (isBox(dest)) {
    const bnx=nx+dx, bny=ny+dy;
    if (bny<0||bny>=rows||bnx<0||bnx>=cols) { history.pop(); return; }
    const bey = gameMap[bny][bnx];
    if (bey===T.WALL||bey===T.VOID||isBox(bey)) { history.pop(); return; }
    gameMap[bny][bnx] = bey===T.TARGET ? T.BOX_ON : T.BOX;
    gameMap[ny][nx] = dest===T.BOX_ON ? T.TARGET : T.FLOOR;
  }
  const wasOn = gameMap[y][x]===T.PLAYER_ON;
  gameMap[y][x] = wasOn ? T.TARGET : T.FLOOR;
  gameMap[ny][nx] = gameMap[ny][nx]===T.TARGET ? T.PLAYER_ON : T.PLAYER;
  playerPos = {x:nx,y:ny};
  moves++;
  document.getElementById('move-count').textContent = moves;
  updateHUD(); renderGame(); checkWin();
}

function undoMove() {
  if (!history.length) return;
  const s = history.pop();
  gameMap=s.map; playerPos=s.pos; moves=s.moves;
  document.getElementById('move-count').textContent = moves;
  updateHUD(); renderGame();
}

function updateHUD() {
  let boxes=0, on=0;
  for (const row of gameMap) for (const c of row) { if(c===T.BOX||c===T.BOX_ON) boxes++; if(c===T.BOX_ON) on++; }
  document.getElementById('boxes-label').textContent = `${on}/${boxes}`;
  document.getElementById('progress-fill').style.width = boxes ? (on/boxes*100)+'%' : '0%';
}

function checkWin() {
  for (const row of gameMap) for (const c of row) if (c===T.BOX) return;
  document.getElementById('win-sub-text').textContent = `LEVEL ${levelNum}`;
  document.getElementById('win-moves-text').innerHTML = `Completed in <b>${moves}</b> moves`;
  document.getElementById('win-overlay').classList.add('show');
}

// ── SCREENS ──
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+id).classList.add('active');
  if (id!=='game') document.getElementById('win-overlay').classList.remove('show');
  if (id==='title') drawTitleCanvas();
}

// ── INPUT ──
let ts = null;
document.addEventListener('touchstart', e => {
  if (!document.getElementById('screen-game').classList.contains('active')) return;
  ts = {x:e.touches[0].clientX, y:e.touches[0].clientY};
}, {passive:true});
document.addEventListener('touchend', e => {
  if (!ts) return;
  if (!document.getElementById('screen-game').classList.contains('active')) { ts=null; return; }
  const dx=e.changedTouches[0].clientX-ts.x, dy=e.changedTouches[0].clientY-ts.y;
  if (Math.max(Math.abs(dx),Math.abs(dy))<18) { ts=null; return; }
  Math.abs(dx)>Math.abs(dy) ? move(dx>0?1:-1,0) : move(0,dy>0?1:-1);
  ts=null;
}, {passive:true});
document.addEventListener('keydown', e => {
  if (!document.getElementById('screen-game').classList.contains('active')) return;
  const km = {ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],w:[0,-1],s:[0,1],a:[-1,0],d:[1,0]};
  if (km[e.key]) { e.preventDefault(); move(...km[e.key]); }
  if (e.key==='z'||e.key==='Z') undoMove();
  if (e.key==='r'||e.key==='R') resetLevel();
});

function showHowTo() {
  alert('HOW TO PLAY\n\n📦 Push boxes onto the X marks\n\n👆 SWIPE to move (mobile)\n⌨️  ARROW KEYS or WASD (desktop)\n\n↩ UNDO undoes your last move\n↺ RESET restarts the level\n\n⚠️  You can only PUSH boxes,\n    you cannot pull them!\n\nEach level is randomly generated\nand guaranteed to be solvable!');
}

window.addEventListener('resize', () => {
  if (document.getElementById('screen-game').classList.contains('active')) { resizeCanvas(); renderGame(); }
  if (document.getElementById('screen-title').classList.contains('active')) drawTitleCanvas();
});

// ── SERVICE WORKER ──
const SW = `const C='bp-v5';self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(['./','./style.css','./game.js','./render.js']).catch(()=>{})));self.skipWaiting();});self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))));self.clients.claim();});self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>{if(r)return r;return fetch(e.request).then(res=>{if(!res||res.status!==200||res.type==='opaque')return res;caches.open(C).then(c=>c.put(e.request,res.clone()));return res;}).catch(()=>caches.match('./'));}));});`;

window.addEventListener('load', () => {
  drawTitleCanvas();
  const saved = parseInt(localStorage.getItem('bp_level')||'0');
  if (saved > 0) {
    document.getElementById('continue-btn-wrap').style.display = 'block';
    document.getElementById('continue-label').textContent = `LEVEL ${saved}`;
    document.getElementById('new-game-btn').textContent = '↺ START OVER';
  }
  if ('serviceWorker' in navigator) {
    const blob = new Blob([SW], {type:'application/javascript'});
    navigator.serviceWorker.register(URL.createObjectURL(blob), {scope:'./'}).catch(()=>{});
  }
});
