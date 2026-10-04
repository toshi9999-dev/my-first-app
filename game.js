import { createAudio } from "./audio.js";
import { createEffects } from "./effects.js";

const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const coinsEl = document.querySelector("#coins");
const statusEl = document.querySelector("#status");
const stageEl = document.querySelector("#stage");
const message = document.querySelector("#message");
const restartButton = document.querySelector("#restart-button");
const musicButton = document.querySelector("#music-button");
const stageButtons = [...document.querySelectorAll("[data-stage]")];

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const keys = {};
let stageIndex = 0;
let level;
let gameState = "ready";
let cameraX = 0;
let lastTime = 0;
let jumpHeld = false;
const audio = createAudio(musicButton);
const effects = createEffects();
let animationTime = 0;

const player = { x: 110, y: 390, width: 28, height: 41, vx: 0, vy: 0, grounded: false };
const stageData = [
  {
    name: "夕映えの里", sky: ["#7bcac5", "#d8ebca"], width: 3800,
    blocks: [
      [0, 475, 620, 65], [740, 415, 250, 125], [1110, 475, 420, 65],
      [1180, 390, 80, 25], [1360, 340, 80, 25], [1650, 405, 250, 135],
      [2000, 475, 420, 65], [2200, 395, 80, 25], [2580, 430, 270, 110], [3000, 475, 800, 65]
    ],
    coins: [[300, 420], [480, 420], [830, 360], [920, 360], [1230, 340], [1400, 290], [1770, 350], [2250, 350]],
    enemies: [[530, 441, 350, 575, "stompable"], [1290, 441, 1140, 1470, "armored"], [2180, 441, 2010, 2370, "stompable"]]
  },
  {
    name: "月影の街", sky: ["#252d59", "#9b6c91"], width: 4300,
    blocks: [
      [0, 475, 500, 65], [610, 420, 180, 120], [900, 360, 170, 180], [1180, 475, 400, 65],
      [1660, 425, 170, 115], [1910, 365, 170, 175], [2160, 475, 500, 65],
      [2750, 400, 230, 140], [3090, 335, 170, 205], [3410, 475, 890, 65]
    ],
    coins: [[250, 420], [680, 365], [970, 305], [1260, 420], [1730, 370], [1980, 310], [2300, 420], [2820, 350], [3160, 285]],
    enemies: [[390, 441, 120, 470, "stompable"], [1330, 441, 1210, 1530, "armored"], [2370, 441, 2200, 2600, "stompable"], [3500, 441, 3420, 3800, "armored"]]
  },
  {
    name: "紅蓮の山道", sky: ["#3f2940", "#df805d"], width: 4800,
    blocks: [
      [0, 475, 440, 65], [530, 430, 180, 110], [800, 375, 180, 165], [1070, 320, 180, 220],
      [1360, 475, 380, 65], [1810, 410, 200, 130], [2110, 345, 200, 195], [2410, 475, 360, 65],
      [2850, 420, 180, 120], [3120, 365, 180, 175], [3400, 310, 180, 230], [3690, 475, 1110, 65]
    ],
    coins: [[220, 420], [600, 375], [870, 320], [1140, 265], [1510, 420], [1870, 365], [2170, 300], [2550, 420], [2910, 365], [3180, 310], [3460, 255]],
    enemies: [[320, 441, 100, 400, "stompable"], [1450, 441, 1380, 1680, "armored"], [2510, 441, 2430, 2700, "stompable"], [3840, 441, 3720, 4100, "armored"]]
  }
];

function createLevel(data) {
  return {
    ...data,
    blocks: data.blocks.map(([x, y, w, h]) => ({ x, y, w, h })),
    coins: data.coins.map(([x, y]) => ({ x, y, collected: false })),
    enemies: data.enemies.map(([x, y, min, max, type]) => ({ x, y, w: 30, h: 34, min, max, vx: 1.2, type, defeated: false })),
    goal: { x: data.width - 240, y: 365, w: 50, h: 110 }
  };
}

function loadStage(index) {
  stageIndex = index;
  level = createLevel(stageData[stageIndex]);
  player.x = 110; player.y = 390; player.vx = 0; player.vy = 0; player.grounded = false;
  cameraX = 0; gameState = "ready"; jumpHeld = false;
  stageEl.textContent = `${stageIndex + 1} / 3`;
  statusEl.textContent = "待機中";
  stageButtons.forEach((button) => button.classList.toggle("active", Number(button.dataset.stage) === stageIndex));
  showMessage(`エリア ${stageIndex + 1}`, level.name, "スペースキーまたは画面タップで開始");
  updateHud();
}

function start() {
  if (gameState === "ready") { gameState = "playing"; statusEl.textContent = "進行中"; message.classList.add("hidden"); }
}

function beginJump() {
  if (gameState !== "playing") { start(); return; }
  if (player.grounded) { player.vy = -13; player.grounded = false; jumpHeld = true; audio.jump(); }
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.width > b.x && a.y < b.y + b.h && a.y + a.height > b.y;
}

function finishStage() {
  effects.goal(player.x + player.width / 2, player.y + player.height / 2);
  audio.goal();
  if (stageIndex < stageData.length - 1) {
    gameState = "won"; statusEl.textContent = "達成";
    showMessage("エリア達成！", `次は「${stageData[stageIndex + 1].name}」`, "スペースキーまたは画面タップで続行");
  } else {
    gameState = "complete"; statusEl.textContent = "全達成";
    showMessage("全エリア達成！", "街の灯りを取り戻した", "スペースキーまたは画面タップでもう一度遊ぶ");
  }
}

function update(dt) {
  if (gameState !== "playing") return;
  animationTime += dt;
  const input = (keys.ArrowRight || keys.d ? 5.4 : 0) - (keys.ArrowLeft || keys.a ? 5.4 : 0);
  player.vx += (input - player.vx) * 0.7;
  // Releasing jump cuts the upward arc, while holding allows the full height.
  const gravity = player.vy < 0 && jumpHeld ? 0.42 : 0.75;
  player.vy += gravity * dt;
  player.x += player.vx * dt; player.y += player.vy * dt;
  player.x = Math.max(0, Math.min(level.width - player.width, player.x));
  player.grounded = false;
  level.blocks.forEach((block) => {
    if (player.x + player.width > block.x && player.x < block.x + block.w &&
      player.y + player.height > block.y && player.y + player.height < block.y + 26 && player.vy >= 0) {
      const wasAirborne = !player.grounded;
      player.y = block.y - player.height; player.vy = 0; player.grounded = true;
      if (wasAirborne) { effects.landing(player.x + player.width / 2, block.y); audio.land(); }
    }
  });
  level.enemies.forEach((enemy) => {
    if (enemy.defeated) return;
    enemy.x += enemy.vx * dt;
    if (enemy.x < enemy.min || enemy.x + enemy.w > enemy.max) enemy.vx *= -1;
    if (overlaps(player, enemy)) {
      const stomping = player.vy > 0 && player.y + player.height - enemy.y < 18;
      if (stomping && enemy.type === "stompable") {
        enemy.defeated = true; player.y = enemy.y - player.height; player.vy = -8;
        effects.stomp(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#e94e3d"); audio.stomp();
      } else {
        gameState = "dead"; statusEl.textContent = "失敗";
        showMessage("ゲームオーバー", enemy.type === "armored" ? "鎧が固すぎる！" : "出直そう", "スペースキーまたは画面タップで再挑戦", "再挑戦");
      }
    }
  });
  level.coins.forEach((coin) => {
    if (!coin.collected && player.x < coin.x + 14 && player.x + player.width > coin.x - 14 &&
      player.y < coin.y + 14 && player.y + player.height > coin.y - 14) {
      coin.collected = true; effects.coin(coin.x, coin.y); audio.coin();
    }
  });
  if (overlaps(player, level.goal)) finishStage();
  if (player.y > HEIGHT + 100) {
    gameState = "dead"; statusEl.textContent = "失敗"; showMessage("ゲームオーバー", "足元に注意！", "スペースキーまたは画面タップで再挑戦", "再挑戦");
  }
  cameraX += (Math.max(0, Math.min(level.width - WIDTH, player.x - 260)) - cameraX) * 0.1;
  effects.update(dt);
  updateHud();
}

function showMessage(kicker, title, hint, action = "") {
  message.innerHTML = `<span class="message-kicker">${kicker}</span><strong>${title}</strong><small>${hint}</small>${action ? `<button class="message-action" type="button" data-message-action="${action}">${action}</button>` : ""}`;
  message.classList.toggle("game-over", kicker === "ゲームオーバー");
  message.classList.remove("hidden");
}

function updateHud() {
  const collected = level.coins.filter((coin) => coin.collected).length;
  scoreEl.textContent = String(collected * 250 + Math.floor(player.x / 2)).padStart(6, "0");
  coinsEl.textContent = `${collected} / ${level.coins.length}`;
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, level.sky[0]); sky.addColorStop(1, level.sky[1]);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.save();
  const shake = effects.getShake();
  ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  drawParallax();
  ctx.translate(-cameraX, 0);
  level.blocks.forEach((block) => {
    const surface = ctx.createLinearGradient(0, block.y, 0, block.y + block.h);
    surface.addColorStop(0, "#1c5260"); surface.addColorStop(1, "#0b2435");
    ctx.shadowColor = "rgba(4, 12, 24, .7)"; ctx.shadowBlur = 14; ctx.shadowOffsetY = 8;
    ctx.fillStyle = surface; ctx.fillRect(block.x, block.y, block.w, block.h);
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.strokeStyle = "rgba(86,224,210,.16)"; ctx.lineWidth = 1;
    for (let x = block.x + 32; x < block.x + block.w; x += 32) { ctx.beginPath(); ctx.moveTo(x, block.y + 9); ctx.lineTo(x, block.y + block.h); ctx.stroke(); }
    const edge = ctx.createLinearGradient(block.x, block.y, block.x, block.y + 10);
    edge.addColorStop(0, "#f4c86b"); edge.addColorStop(1, "#d47e46");
    ctx.fillStyle = edge; ctx.fillRect(block.x, block.y, block.w, 8);
    ctx.fillStyle = "rgba(255,255,255,.22)"; ctx.fillRect(block.x, block.y, block.w, 1);
  });
  level.coins.forEach((coin) => {
    if (coin.collected) return;
    const bob = Math.sin(animationTime * 0.12 + coin.x) * 3;
    ctx.save(); ctx.translate(coin.x, coin.y + bob);
    ctx.shadowColor = "#f4c86b"; ctx.shadowBlur = 14;
    ctx.fillStyle = "#f4c86b"; ctx.beginPath(); ctx.ellipse(0, 0, 9, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = "#fff3bd"; ctx.fillRect(-2, -7, 3, 14);
    ctx.strokeStyle = "#a9613d"; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  });
  level.enemies.forEach((enemy) => {
    if (enemy.defeated) return;
    const armored = enemy.type === "armored";
    const bob = Math.sin(animationTime * 0.15 + enemy.x) * 2;
    ctx.save(); ctx.translate(enemy.x + enemy.w / 2, enemy.y + bob + enemy.h / 2);
    ctx.shadowColor = armored ? "#a982e8" : "#ff704d"; ctx.shadowBlur = 12;
    ctx.fillStyle = armored ? "#694fa4" : "#bd3f4c";
    ctx.beginPath(); ctx.roundRect(-15, -17, 30, 34, 7); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = armored ? "#bba9f1" : "#ff9270";
    ctx.fillRect(-8, -11, 16, 5); ctx.fillStyle = "#0a1725";
    ctx.fillRect(-9, -3, 5, 5); ctx.fillRect(4, -3, 5, 5);
    ctx.fillStyle = armored ? "#f4c86b" : "#ff704d"; ctx.fillRect(-11, 8, 22, 4);
    if (armored) { ctx.strokeStyle = "#f4c86b"; ctx.lineWidth = 2; ctx.strokeRect(-17, -19, 34, 38); }
    ctx.restore();
  });
  ctx.shadowColor = "#ff704d"; ctx.shadowBlur = 12; ctx.fillStyle = "#10202c"; ctx.fillRect(level.goal.x, level.goal.y, 6, level.goal.h); ctx.shadowBlur = 0;
  ctx.fillStyle = "#ff704d"; ctx.beginPath(); ctx.moveTo(level.goal.x + 6, level.goal.y); ctx.lineTo(level.goal.x + level.goal.w, level.goal.y + 18); ctx.lineTo(level.goal.x + 6, level.goal.y + 36); ctx.fill();
  drawPlayer();
  effects.draw(ctx);
  ctx.restore();
}

function drawPlayer() {
  const stride = player.grounded ? Math.sin(animationTime * 0.3) * 3 : 0;
  const cx = player.x + player.width / 2;
  const top = player.y;
  ctx.save();
  ctx.translate(cx, top);
  ctx.shadowColor = "rgba(255,112,77,.38)"; ctx.shadowBlur = 8;
  ctx.fillStyle = "#ff704d";
  ctx.beginPath(); ctx.moveTo(-15, 9); ctx.lineTo(-12, 1); ctx.lineTo(12, 1); ctx.lineTo(15, 9); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#eeb28d"; ctx.beginPath(); ctx.arc(0, 15, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#172d42"; ctx.fillRect(-9, 12, 18, 6);
  ctx.fillStyle = "#3d91a3"; ctx.beginPath(); ctx.roundRect(-10, 24, 20, 15, 4); ctx.fill();
  ctx.fillStyle = "#56e0d2"; ctx.fillRect(-10, 24, 20, 3);
  ctx.fillStyle = "#eeb28d"; ctx.fillRect(-14, 25, 4, 12); ctx.fillRect(10, 25, 4, 12);
  ctx.fillStyle = "#10202c"; ctx.fillRect(-7, 14, 3, 3); ctx.fillRect(4, 14, 3, 3);
  ctx.fillStyle = "#172331"; ctx.fillRect(-8, 39 + stride, 7, 5); ctx.fillRect(1, 39 - stride, 7, 5);
  ctx.fillStyle = "#f4c86b"; ctx.fillRect(-9, 38 + stride, 8, 2); ctx.fillRect(1, 38 - stride, 8, 2);
  ctx.restore();
}

function drawParallax() {
  const night = stageIndex === 1;
  const sunset = stageIndex === 2;
  const light = night ? "#c2a3e8" : sunset ? "#ff9c68" : "#fff0b0";
  const sunX = ((WIDTH * 0.72 - cameraX * 0.035) % (WIDTH + 240) + WIDTH + 240) % (WIDTH + 240) - 120;
  const sunY = sunset ? 205 : 145;
  const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 190);
  glow.addColorStop(0, night ? "rgba(183,157,232,.19)" : sunset ? "rgba(255,159,98,.28)" : "rgba(255,238,176,.3)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, 390);

  if (night) {
    ctx.save();
    ctx.shadowColor = light;
    ctx.shadowBlur = 28;
    ctx.fillStyle = "rgba(225,211,255,.82)";
    ctx.beginPath();
    ctx.arc(sunX, sunY, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#41446f";
    ctx.beginPath();
    ctx.arc(sunX + 10, sunY - 8, 21, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    for (let i = 0; i < 38; i += 1) {
      const x = ((i * 197 - cameraX * 0.035) % (WIDTH + 60) + WIDTH + 60) % (WIDTH + 60) - 30;
      const y = 32 + ((i * 71) % 205);
      const radius = i % 6 === 0 ? 1.5 : 0.8;
      ctx.globalAlpha = 0.4 + (i % 4) * 0.15;
      ctx.fillStyle = "#f5e9ff";
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else {
    const sun = ctx.createRadialGradient(sunX - 8, sunY - 9, 2, sunX, sunY, 39);
    sun.addColorStop(0, "#fff9d9");
    sun.addColorStop(0.68, light);
    sun.addColorStop(1, sunset ? "#f0785e" : "#f4c86b");
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 31, 0, Math.PI * 2);
    ctx.fill();
    drawClouds();
  }

  drawMountainLayer(0.1, 340, 36, 0.0035, night ? "rgba(81,91,133,.48)" : sunset ? "rgba(119,75,84,.36)" : "rgba(76,132,137,.34)", 2);
  drawMountainLayer(0.22, 390, 30, 0.0055, night ? "rgba(49,57,94,.68)" : sunset ? "rgba(89,58,72,.66)" : "rgba(54,99,107,.58)", 7);
  if (night) drawDistantCity();
  drawMountainLayer(0.38, 454, 19, 0.008, night ? "rgba(26,35,62,.78)" : sunset ? "rgba(52,41,55,.76)" : "rgba(28,62,70,.76)", 13);
}

function drawClouds() {
  const cloudColor = stageIndex === 2 ? "rgba(255,205,177,.13)" : "rgba(255,255,255,.2)";
  ctx.fillStyle = cloudColor;
  for (let i = 0; i < 5; i += 1) {
    const x = ((i * 263 - cameraX * 0.06) % (WIDTH + 300) + WIDTH + 300) % (WIDTH + 300) - 150;
    const y = 82 + ((i * 59) % 115);
    const width = 54 + (i % 3) * 15;
    ctx.beginPath();
    ctx.moveTo(x - width, y + 10);
    ctx.bezierCurveTo(x - width * 0.9, y + 2, x - width * 0.75, y - 9, x - width * 0.48, y - 7);
    ctx.bezierCurveTo(x - width * 0.34, y - 25, x - width * 0.04, y - 24, x + width * 0.08, y - 8);
    ctx.bezierCurveTo(x + width * 0.35, y - 17, x + width * 0.59, y - 8, x + width * 0.58, y + 3);
    ctx.bezierCurveTo(x + width * 0.9, y + 2, x + width, y + 8, x + width, y + 12);
    ctx.closePath();
    ctx.fill();
  }
}

function drawMountainLayer(speed, baseY, height, frequency, color, phase) {
  const offset = cameraX * speed;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, HEIGHT);
  for (let x = -20; x <= WIDTH + 20; x += 16) {
    const worldX = x + offset;
    const ridge = Math.sin(worldX * frequency + phase) * 0.48
      + Math.sin(worldX * frequency * 0.47 + phase * 2.1) * 0.31
      + Math.sin(worldX * frequency * 1.83 + phase * 0.7) * 0.14
      + Math.sin(worldX * frequency * 3.2 + phase * 1.4) * 0.07;
    ctx.lineTo(x, baseY - ridge * height);
  }
  ctx.lineTo(WIDTH, HEIGHT);
  ctx.closePath();
  ctx.fill();
}

function drawDistantCity() {
  const offset = -(cameraX * 0.16) % 700;
  ctx.save();
  ctx.translate(offset, 0);
  for (let x = -700; x < WIDTH + 700; x += 700) {
    for (let i = 0; i < 12; i += 1) {
      const width = 24 + (i * 13) % 30;
      const height = 32 + (i * 29) % 78;
      const buildingX = x + i * 57;
      const top = 430 - height;
      ctx.fillStyle = i % 3 === 0 ? "rgba(40,43,76,.68)" : "rgba(31,38,70,.72)";
      ctx.beginPath();
      ctx.moveTo(buildingX, 432);
      ctx.lineTo(buildingX, top + 5);
      ctx.quadraticCurveTo(buildingX + width / 2, top - (i % 4 === 0 ? 7 : 0), buildingX + width, top + 5);
      ctx.lineTo(buildingX + width, 432);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,184,137,.38)";
      for (let row = 0; row < Math.floor(height / 20); row += 1) {
        for (let column = 0; column < Math.floor(width / 11); column += 1) {
          if ((i + row * 3 + column * 5) % 4 === 0) continue;
          ctx.fillRect(buildingX + 5 + column * 11, top + 12 + row * 20, 3, 5);
        }
      }
    }
  }
  ctx.restore();
}

function handleJumpAction() {
  if (gameState === "dead") { loadStage(stageIndex); return; }
  if (gameState === "won") { loadStage(stageIndex + 1); return; }
  if (gameState === "complete") { loadStage(0); return; }
  beginJump();
}

function loop(time) { const dt = Math.min((time - lastTime) / 16.67 || 1, 2); lastTime = time; update(dt); if (gameState !== "playing") effects.update(dt); draw(); requestAnimationFrame(loop); }
window.addEventListener("keydown", (event) => {
  keys[event.key] = true;
  if (event.key === " " || event.key === "ArrowUp" || event.key === "w") { event.preventDefault(); if (!event.repeat) handleJumpAction(); jumpHeld = true; }
});
window.addEventListener("keyup", (event) => { keys[event.key] = false; if (event.key === " " || event.key === "ArrowUp" || event.key === "w") { jumpHeld = false; if (player.vy < -4) player.vy *= 0.55; } });
canvas.addEventListener("pointerdown", () => { handleJumpAction(); jumpHeld = true; });
canvas.addEventListener("pointerup", () => { jumpHeld = false; if (player.vy < -4) player.vy *= 0.55; });
message.addEventListener("click", (event) => {
  if (event.target.closest("[data-message-action='再挑戦']")) handleJumpAction();
});
restartButton.addEventListener("click", () => loadStage(stageIndex));
stageButtons.forEach((button) => button.addEventListener("click", () => loadStage(Number(button.dataset.stage))));
loadStage(0); requestAnimationFrame(loop);
