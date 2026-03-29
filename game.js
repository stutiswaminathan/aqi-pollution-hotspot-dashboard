// ============================================================
// BREATHE SAFE — "CLEAN AIR RUN" Game Engine
// ============================================================

(function () {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // --- Responsive sizing ---
  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // --- State ---
  let state = 'idle'; // idle | running | dead
  let score = 0;
  let highScore = parseInt(localStorage.getItem('breathesafe_hs') || '0');
  let frame = 0;
  let speed = 4;
  let aqi = 0; // game's live AQI (rises with score)

  // --- Player ---
  const player = {
    x: 90,
    y: 0,
    vy: 0,
    radius: 18,
    onGround: false,
    trail: [],
    jumpCount: 0,
  };

  // --- Obstacles & collectibles ---
  let obstacles = [];
  let orbs = [];
  let particles = [];
  let bgParticles = [];

  // --- Ground ---
  const GROUND_Y = () => canvas.height - 70;

  // --- Colours (match dashboard palette) ---
  const ACCENT = { good: '#00ff9d', moderate: '#f59e0b', bad: '#ef4444', hazard: '#9333ea' };
  function aqiColor(v) {
    if (v < 50) return ACCENT.good;
    if (v < 150) return ACCENT.moderate;
    if (v < 300) return ACCENT.bad;
    return ACCENT.hazard;
  }

  // --- Init background particles ---
  function initBgParticles() {
    bgParticles = [];
    for (let i = 0; i < 60; i++) {
      bgParticles.push({
        x: Math.random() * 2000,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.3,
        speed: Math.random() * 0.4 + 0.1,
        opacity: Math.random() * 0.5 + 0.1,
      });
    }
  }
  initBgParticles();

  // --- Spawn helpers ---
  function spawnObstacle() {
    const types = ['smog', 'chimney', 'truck'];
    const type = types[Math.floor(Math.random() * types.length)];
    let h, w;
    if (type === 'smog') { w = 55 + Math.random() * 40; h = 45 + Math.random() * 30; }
    else if (type === 'chimney') { w = 22; h = 60 + Math.random() * 40; }
    else { w = 70; h = 32; }
    obstacles.push({ x: canvas.width + 20, w, h, type, frame: 0 });
  }

  function spawnOrb() {
    const groundY = GROUND_Y();
    orbs.push({
      x: canvas.width + 20,
      y: groundY - 50 - Math.random() * 80,
      r: 10,
      pulse: Math.random() * Math.PI * 2,
      collected: false,
    });
  }

  // --- Particle burst ---
  function burst(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const sp = 2 + Math.random() * 3;
      particles.push({ x, y, vx: Math.cos(angle) * sp, vy: Math.sin(angle) * sp - 1, life: 1, color, r: 3 + Math.random() * 3 });
    }
  }

  // --- Reset ---
  function reset() {
    score = 0; frame = 0; speed = 4; aqi = 0;
    obstacles = []; orbs = []; particles = [];
    player.y = GROUND_Y() - player.radius;
    player.vy = 0; player.onGround = true; player.trail = []; player.jumpCount = 0;
    state = 'running';
  }

  // --- Jump ---
  function jump() {
    if (state === 'idle' || state === 'dead') { reset(); return; }
    if (player.jumpCount < 2) {
      player.vy = -13;
      player.jumpCount++;
      burst(player.x, player.y, aqiColor(aqi), 8);
    }
  }

  // --- Input ---
  document.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); }
  });
  canvas.addEventListener('pointerdown', () => jump());

  // --- Draw helpers ---
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawSmog(ob) {
    const x = ob.x, y = GROUND_Y() - ob.h, w = ob.w, h = ob.h;
    ob.frame++;
    // pulsing smog cloud
    const pulse = Math.sin(ob.frame * 0.04) * 3;
    const col = ob.type === 'smog' ? 'rgba(156,163,175,' : 'rgba(239,68,68,';
    const grad = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, w / 2 + pulse);
    grad.addColorStop(0, col + '0.55)');
    grad.addColorStop(1, col + '0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2 + pulse, h / 2 + pulse * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // glow border
    ctx.strokeStyle = ob.type === 'smog' ? 'rgba(156,163,175,0.5)' : 'rgba(239,68,68,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // label
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = 'bold 9px Space Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SMOG', x + w / 2, y + h / 2 + 3);
  }

  function drawChimney(ob) {
    const x = ob.x, gY = GROUND_Y(), h = ob.h;
    // stack
    const grad = ctx.createLinearGradient(x, gY - h, x + ob.w, gY);
    grad.addColorStop(0, '#374151');
    grad.addColorStop(1, '#1f2937');
    ctx.fillStyle = grad;
    roundRect(x, gY - h, ob.w, h, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // smoke puffs
    for (let i = 0; i < 3; i++) {
      const pY = gY - h - 15 - i * 14 + Math.sin(frame * 0.05 + i) * 4;
      const pX = x + ob.w / 2 + Math.sin(frame * 0.03 + i * 1.2) * 6;
      const r = 8 + i * 4;
      const g2 = ctx.createRadialGradient(pX, pY, 0, pX, pY, r);
      g2.addColorStop(0, 'rgba(107,114,128,0.7)');
      g2.addColorStop(1, 'rgba(107,114,128,0)');
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.arc(pX, pY, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = 'bold 8px Space Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CO₂', x + ob.w / 2, gY - h / 2 + 3);
  }

  function drawTruck(ob) {
    const x = ob.x, y = GROUND_Y() - ob.h;
    // body
    const grad = ctx.createLinearGradient(x, y, x, y + ob.h);
    grad.addColorStop(0, '#374151');
    grad.addColorStop(1, '#111827');
    ctx.fillStyle = grad;
    roundRect(x, y, ob.w, ob.h, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(239,68,68,0.5)';
    ctx.lineWidth = 1.5; ctx.stroke();
    // cab window
    ctx.fillStyle = 'rgba(59,130,246,0.3)';
    roundRect(x + ob.w - 22, y + 5, 18, 12, 2);
    ctx.fill();
    // wheels
    [x + 12, x + ob.w - 16].forEach(wx => {
      ctx.fillStyle = '#1f2937';
      ctx.beginPath(); ctx.arc(wx, GROUND_Y() - 4, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#374151'; ctx.lineWidth = 2; ctx.stroke();
    });
    // exhaust
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = 'bold 8px Space Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NO₂', x + ob.w / 2, y + ob.h / 2 + 3);
  }

  function drawPlayer() {
    const x = player.x, y = player.y;
    const col = aqiColor(aqi);

    // trail
    player.trail.push({ x, y, life: 1 });
    if (player.trail.length > 14) player.trail.shift();
    player.trail.forEach((t, i) => {
      const a = (i / player.trail.length) * 0.35 * t.life;
      ctx.globalAlpha = a;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(t.x, t.y, player.radius * (i / player.trail.length) * 0.8, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // glow
    const glow = ctx.createRadialGradient(x, y, 0, x, y, player.radius * 2.2);
    glow.addColorStop(0, col + '55');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, y, player.radius * 2.2, 0, Math.PI * 2); ctx.fill();

    // body — lung-shaped (two lobes)
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = 18;
    // left lobe
    ctx.beginPath(); ctx.arc(-6, 0, 11, 0, Math.PI * 2); ctx.fill();
    // right lobe
    ctx.beginPath(); ctx.arc(6, 0, 11, 0, Math.PI * 2); ctx.fill();
    // trachea stem
    ctx.fillRect(-3, -14, 6, 10);
    ctx.shadowBlur = 0;
    // inner highlight
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.arc(-6, -3, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6, -3, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawOrb(orb) {
    orb.pulse += 0.06;
    const r = orb.r + Math.sin(orb.pulse) * 2;
    const col = '#00ff9d';
    const glow = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, r * 3);
    glow.addColorStop(0, 'rgba(0,255,157,0.5)');
    glow.addColorStop(1, 'rgba(0,255,157,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(orb.x, orb.y, r * 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = col;
    ctx.shadowColor = col; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(orb.x, orb.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // O₂ label
    ctx.fillStyle = '#001a0d';
    ctx.font = 'bold 7px Space Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('O₂', orb.x, orb.y + 2.5);
  }

  function drawGround() {
    const gY = GROUND_Y();
    const col = aqiColor(aqi);
    // ground line
    ctx.strokeStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, gY); ctx.lineTo(canvas.width, gY); ctx.stroke();
    ctx.shadowBlur = 0;
    // grid beneath
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const lineCount = 6;
    for (let i = 1; i <= lineCount; i++) {
      const yy = gY + (canvas.height - gY) * (i / lineCount);
      ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(canvas.width, yy); ctx.stroke();
    }
    // scrolling vertical lines
    const spacing = 80;
    const offset = (frame * speed * 0.6) % spacing;
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    for (let x = -offset; x < canvas.width; x += spacing) {
      ctx.beginPath(); ctx.moveTo(x, gY); ctx.lineTo(x + 30, canvas.height); ctx.stroke();
    }
  }

  function drawHUD() {
    const col = aqiColor(aqi);
    // Score
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(12, 12, 140, 38, 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '9px Space Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('SCORE', 20, 26);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Space Mono, monospace';
    ctx.fillText(Math.floor(score).toString().padStart(5, '0'), 20, 44);

    // AQI badge
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    roundRect(canvas.width - 152, 12, 140, 38, 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '9px Space Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText('LIVE AQI', canvas.width - 20, 26);
    ctx.fillStyle = col;
    ctx.shadowColor = col; ctx.shadowBlur = 10;
    ctx.font = 'bold 18px Space Mono, monospace';
    ctx.fillText(Math.floor(aqi), canvas.width - 20, 44);
    ctx.shadowBlur = 0;

    // HS
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '9px Space Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BEST ' + Math.floor(highScore).toString().padStart(5, '0'), canvas.width / 2, 24);

    // double jump indicator
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.arc(canvas.width / 2 - 10 + i * 22, 38, 5, 0, Math.PI * 2);
      ctx.fillStyle = i < (2 - player.jumpCount) ? col : 'rgba(255,255,255,0.15)';
      ctx.fill();
    }
  }

  function drawParticles() {
    particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawBgParticles() {
    bgParticles.forEach(p => {
      ctx.globalAlpha = p.opacity * (0.5 + 0.5 * Math.sin(frame * 0.01 + p.x));
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(p.x % canvas.width, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      p.x -= p.speed;
      if (p.x < 0) p.x += canvas.width;
    });
    ctx.globalAlpha = 1;
  }

  function drawIdle() {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 28px Space Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CLEAN AIR RUN', canvas.width / 2, canvas.height / 2 - 32);
    ctx.fillStyle = 'rgba(0,255,157,0.9)';
    ctx.font = '12px Space Mono, monospace';
    ctx.fillText('PRESS SPACE / TAP TO BEGIN', canvas.width / 2, canvas.height / 2 + 2);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px Space Mono, monospace';
    ctx.fillText('Dodge smog • Collect O₂ • Double-jump allowed', canvas.width / 2, canvas.height / 2 + 26);
  }

  function drawDead() {
    // overlay
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const col = aqiColor(aqi);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 32px Space Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LUNGS COMPROMISED', canvas.width / 2, canvas.height / 2 - 38);

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '12px Space Mono, monospace';
    ctx.fillText('SCORE: ' + Math.floor(score).toString().padStart(5, '0') + '   BEST: ' + Math.floor(highScore).toString().padStart(5, '0'), canvas.width / 2, canvas.height / 2 - 4);

    ctx.fillStyle = col;
    ctx.font = 'bold 11px Space Mono, monospace';
    ctx.fillText('FINAL AQI EXPOSURE: ' + Math.floor(aqi), canvas.width / 2, canvas.height / 2 + 20);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px Space Mono, monospace';
    ctx.fillText('SPACE / TAP TO RETRY', canvas.width / 2, canvas.height / 2 + 48);
  }

  // --- Collision (AABB + radius for smog) ---
  function collides(ob) {
    const px = player.x, py = player.y, pr = player.radius - 4;
    const gY = GROUND_Y();
    if (ob.type === 'smog') {
      const cx = ob.x + ob.w / 2, cy = gY - ob.h / 2;
      const dx = px - cx, dy = py - cy;
      return Math.sqrt(dx * dx + dy * dy) < pr + Math.min(ob.w, ob.h) / 2 - 6;
    }
    // AABB for chimney / truck
    const ox = ob.x, oy = gY - ob.h, ow = ob.w, oh = ob.h;
    return px + pr > ox && px - pr < ox + ow && py + pr > oy && py - pr < oy + oh;
  }

  // --- Main loop ---
  function loop() {
    requestAnimationFrame(loop);
    const W = canvas.width, H = canvas.height;
    const gY = GROUND_Y();

    // clear
    ctx.clearRect(0, 0, W, H);

    // bg
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#050d1a');
    bgGrad.addColorStop(1, '#0a1120');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    drawBgParticles();
    drawGround();

    if (state === 'idle') {
      player.y = gY - player.radius;
      player.trail = [];
      drawPlayer();
      drawHUD();
      drawIdle();
      return;
    }

    if (state === 'running') {
      frame++;
      score += speed * 0.08;
      aqi = Math.min(400, score * 0.35);
      speed = 4 + score * 0.004;
      if (score > highScore) { highScore = score; localStorage.setItem('breathesafe_hs', highScore); }

      // gravity
      player.vy += 0.6;
      player.y += player.vy;
      if (player.y >= gY - player.radius) {
        player.y = gY - player.radius;
        player.vy = 0;
        player.onGround = true;
        player.jumpCount = 0;
      } else {
        player.onGround = false;
      }

      // spawn
      const obstacleRate = Math.max(55, 110 - score * 0.06);
      if (frame % Math.floor(obstacleRate) === 0) spawnObstacle();
      const orbRate = Math.max(80, 160 - score * 0.05);
      if (frame % Math.floor(orbRate) === 0) spawnOrb();

      // update obstacles
      obstacles = obstacles.filter(ob => ob.x + ob.w + 20 > 0);
      obstacles.forEach(ob => {
        ob.x -= speed;
        if (ob.type === 'smog') drawSmog(ob);
        else if (ob.type === 'chimney') drawChimney(ob);
        else drawTruck(ob);
        if (collides(ob)) {
          burst(player.x, player.y, '#ef4444', 20);
          state = 'dead';
        }
      });

      // update orbs
      orbs = orbs.filter(o => o.x + o.r + 10 > 0 && !o.collected);
      orbs.forEach(orb => {
        orb.x -= speed;
        drawOrb(orb);
        const dx = player.x - orb.x, dy = player.y - orb.y;
        if (Math.sqrt(dx * dx + dy * dy) < player.radius + orb.r + 4) {
          orb.collected = true;
          score += 50;
          burst(orb.x, orb.y, '#00ff9d', 14);
          // update dashboard AQI if possible
          try {
            const el = document.getElementById('aqiDisplay');
            if (el) { el.style.color = '#00ff9d'; setTimeout(() => el.style.color = '', 400); }
          } catch (e) {}
        }
      });

      // particles
      particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life -= 0.03; p.r *= 0.97; });
      particles = particles.filter(p => p.life > 0);
    }

    drawParticles();
    drawPlayer();
    drawHUD();

    if (state === 'dead') drawDead();
  }

  loop();
})();
