// ═══════════════════════════════════════════
//  RENDER.JS — canvas drawing
// ═══════════════════════════════════════════

let CS = 52;

function resizeCanvas() {
  const a = document.getElementById('game-area');
  const rows = gameMap.length, cols = gameMap[0].length;
  CS = Math.max(32, Math.floor(Math.min(a.clientWidth / cols, a.clientHeight / rows)));
  const c = document.getElementById('game-canvas');
  c.width = cols * CS;
  c.height = rows * CS;
}

function renderGame() {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < gameMap.length; y++)
    for (let x = 0; x < gameMap[y].length; x++) {
      const c = gameMap[y][x];
      if (c === T.VOID) continue;
      drawCell(ctx, c, x * CS, y * CS, CS);
    }
}

function drawCell(ctx, cell, px, py, C) {
  if (cell === T.WALL) {
    ctx.fillStyle = '#b8ad9c'; ctx.fillRect(px, py, C, C);
    ctx.fillStyle = '#a89e8d'; ctx.fillRect(px + 2, py + 2, C - 2, C - 2);
    ctx.fillStyle = '#ccc3b0'; ctx.fillRect(px, py, C, 2); ctx.fillRect(px, py, 2, C);
    ctx.fillStyle = '#8c8070'; ctx.fillRect(px + C - 2, py, 2, C); ctx.fillRect(px, py + C - 2, C, 2);
    return;
  }
  ctx.fillStyle = '#e8e2d4'; ctx.fillRect(px, py, C, C);
  ctx.fillStyle = '#ede8db'; ctx.fillRect(px + 1, py + 1, C - 2, C - 2);
  if (cell === T.FLOOR) return;

  if (cell === T.TARGET || cell === T.PLAYER_ON) {
    const pad = Math.floor(C * 0.2), lw = Math.max(2, Math.floor(C * 0.07));
    ctx.strokeStyle = 'rgba(192,57,43,0.18)'; ctx.lineWidth = lw + 3; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px + pad, py + pad); ctx.lineTo(px + C - pad, py + C - pad);
    ctx.moveTo(px + C - pad, py + pad); ctx.lineTo(px + pad, py + C - pad);
    ctx.stroke();
    ctx.strokeStyle = cell === T.PLAYER_ON ? 'rgba(192,57,43,0.5)' : '#c0392b';
    ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px + pad, py + pad); ctx.lineTo(px + C - pad, py + C - pad);
    ctx.moveTo(px + C - pad, py + pad); ctx.lineTo(px + pad, py + C - pad);
    ctx.stroke();
    if (cell === T.PLAYER_ON) drawPlayer(ctx, px, py, C);
    return;
  }
  if (cell === T.BOX || cell === T.BOX_ON) { drawBox(ctx, px, py, C, cell === T.BOX_ON); return; }
  if (cell === T.PLAYER) { drawPlayer(ctx, px, py, C); return; }
}

function drawBox(ctx, px, py, C, solved) {
  const p = Math.floor(C * 0.1), s = C - p * 2, bx = px + p, by = py + p;
  ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(bx + 3, by + 3, s, s);
  if (solved) {
    ctx.fillStyle = '#155e47'; ctx.fillRect(bx, by, s, s);
    ctx.fillStyle = '#1e8060'; ctx.fillRect(bx + 2, by + 2, s - 4, s - 4);
    ctx.fillStyle = '#28a878'; ctx.fillRect(bx + 2, by + 2, s - 4, 3); ctx.fillRect(bx + 2, by + 2, 3, s - 4);
    ctx.fillStyle = '#0d3d2a'; ctx.fillRect(bx + s - 4, by + 2, 2, s - 4); ctx.fillRect(bx + 2, by + s - 4, s - 4, 2);
    ctx.strokeStyle = '#d4f5e0'; ctx.lineWidth = Math.max(2, C * .08); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const cx = bx + s / 2, cy = by + s / 2;
    ctx.beginPath();
    ctx.moveTo(cx - s * .2, cy); ctx.lineTo(cx - s * .02, cy + s * .18); ctx.lineTo(cx + s * .22, cy - s * .15);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#8a5c2a'; ctx.fillRect(bx, by, s, s);
    ctx.fillStyle = '#b07838'; ctx.fillRect(bx + 2, by + 2, s - 4, s - 4);
    ctx.strokeStyle = '#9a6830'; ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) { const gy = by + s / 4 * i; ctx.beginPath(); ctx.moveTo(bx + 3, gy); ctx.lineTo(bx + s - 3, gy); ctx.stroke(); }
    ctx.fillStyle = '#d09050'; ctx.fillRect(bx + 2, by + 2, s - 4, 3); ctx.fillRect(bx + 2, by + 2, 3, s - 4);
    ctx.fillStyle = '#5a3a18'; ctx.fillRect(bx + s - 4, by + 2, 2, s - 4); ctx.fillRect(bx + 2, by + s - 4, s - 4, 2);
    ctx.strokeStyle = '#4a2e10'; ctx.lineWidth = 2; ctx.strokeRect(bx + 1, by + 1, s - 2, s - 2);
  }
}

function drawPlayer(ctx, px, py, C) {
  const cx = px + C / 2, cy = py + C / 2, r = C * 0.31;
  const g = ctx.createRadialGradient(cx, cy, r * .2, cx, cy, r * 1.5);
  g.addColorStop(0, 'rgba(41,128,185,0.18)'); g.addColorStop(1, 'transparent');
  ctx.fillStyle = g; ctx.fillRect(px, py, C, C);
  ctx.fillStyle = '#1a5a8a'; ctx.beginPath(); ctx.arc(cx + 1, cy + 1, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2980b9'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5dade2'; ctx.beginPath(); ctx.arc(cx - r * .25, cy - r * .28, r * .38, 0, Math.PI * 2); ctx.fill();
  const er = r * .17, ey = cy - r * .08;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(cx - r * .3, ey, er, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + r * .3, ey, er, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a3a5c';
  ctx.beginPath(); ctx.arc(cx - r * .27, ey + 1, er * .55, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + r * .33, ey + 1, er * .55, 0, Math.PI * 2); ctx.fill();
}

function drawTitleCanvas() {
  const canvas = document.getElementById('title-canvas');
  const preview = [[1,1,1,1,1],[1,2,3,2,1],[1,3,5,3,1],[1,2,7,2,1],[1,1,1,1,1]];
  const C = Math.min(Math.floor(window.innerWidth * .13), 44);
  canvas.width = 5 * C; canvas.height = 5 * C;
  const ctx = canvas.getContext('2d');
  for (let y = 0; y < preview.length; y++)
    for (let x = 0; x < preview[y].length; x++)
      drawCell(ctx, preview[y][x], x * C, y * C, C);
}
