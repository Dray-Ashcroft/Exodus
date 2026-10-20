// ====== CANVAS SETUP ======
const starsCanvas = document.getElementById('stars-canvas');
const starsCtx = starsCanvas.getContext('2d');
const effectsCanvas = document.getElementById('effects-canvas');
const effectsCtx = effectsCanvas.getContext('2d');

function resizeCanvas() {
  starsCanvas.width = effectsCanvas.width = window.innerWidth;
  starsCanvas.height = effectsCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ====== STARS ======
const stars = Array.from({length: 150}, function() {
  return {
    x: Math.random() * starsCanvas.width,
    y: Math.random() * starsCanvas.height,
    size: Math.random() * 2 + 1,
    alpha: Math.random()
  };
});

function drawStars() {
  starsCtx.clearRect(0, 0, starsCanvas.width, starsCanvas.height);
  stars.forEach(function(s) {
    s.alpha += (Math.random() - 0.5) * 0.02;
    if (s.alpha < 0.2) s.alpha = 0.2;
    if (s.alpha > 1) s.alpha = 1;
    starsCtx.fillStyle = 'rgba(255,255,255,' + s.alpha + ')';
    starsCtx.beginPath();
    starsCtx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    starsCtx.fill();
  });
  requestAnimationFrame(drawStars);
}
drawStars();

// ====== METEORITE ROCK CROSS-SECTION ======
(function() {
  const rc = document.getElementById('rock-canvas');
  const rCtx = rc.getContext('2d');

  function resizeRock() {
    rc.width  = window.innerWidth;
    rc.height = window.innerHeight;
    drawRock();
  }
  window.addEventListener('resize', resizeRock);

  // Seeded pseudo-random so grains stay consistent on resize
  function seededRand(seed) {
    let s = seed;
    return function() {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
  }

  function drawRock() {
    const W = rc.width, H = rc.height;
    const cx = W * 0.5, cy = H * 0.5;
    const rng = seededRand(42);

    // ── 1. Deep basalt matrix — rich dark-grey base ───────────────────────
    const matGrad = rCtx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.72);
    matGrad.addColorStop(0,   '#242220');
    matGrad.addColorStop(0.25,'#1c1a17');
    matGrad.addColorStop(0.55,'#151310');
    matGrad.addColorStop(0.82,'#0e0d0b');
    matGrad.addColorStop(1,   '#080807');
    rCtx.fillStyle = matGrad;
    rCtx.fillRect(0, 0, W, H);

    // ── 2. Large-scale rock banding (layered mineral flows) ───────────────
    const bands = [
      { x:cx*0.3, y:cy*0.6, w:W*1.1, h:H*0.18, angle:-0.06, col:'rgba(30,26,22,0.55)' },
      { x:cx*0.5, y:cy*0.9, w:W*0.9, h:H*0.12, angle: 0.04, col:'rgba(22,19,15,0.45)' },
      { x:cx*1.2, y:cy*1.3, w:W*1.0, h:H*0.10, angle:-0.03, col:'rgba(26,22,18,0.4)' },
      { x:cx*0.6, y:cy*1.6, w:W*0.85,h:H*0.08, angle: 0.07, col:'rgba(18,15,12,0.5)' },
      { x:cx*0.2, y:cy*0.2, w:W*1.2, h:H*0.09, angle:-0.05, col:'rgba(28,24,19,0.35)' },
    ];
    bands.forEach(function(b) {
      rCtx.save();
      rCtx.translate(b.x, b.y);
      rCtx.rotate(b.angle);
      rCtx.fillStyle = b.col;
      rCtx.beginPath();
      rCtx.ellipse(0, 0, b.w * 0.5, b.h * 0.5, 0, 0, Math.PI * 2);
      rCtx.fill();
      rCtx.restore();
    });

    // ── 3. Mineral grains (pyroxene dark, plagioclase light, olivine green-grey) ──
    const grainTypes = [
      // pyroxene — very dark, glassy angular
      { count:180, minR:2, maxR:9,  colBase:[28,24,18], colVar:10, alpha:[0.60,0.82], shape:'angular' },
      // plagioclase feldspar — grey to off-white laths (most visible)
      { count:120, minR:3, maxR:12, colBase:[82,75,65],  colVar:22, alpha:[0.45,0.72], shape:'lath'    },
      // olivine — olive-grey rounded
      { count:90,  minR:2, maxR:8,  colBase:[50,55,36],  colVar:14, alpha:[0.55,0.75], shape:'round'   },
      // magnetite — tiny lustrous black specs
      { count:60,  minR:1, maxR:5,  colBase:[18,17,17],  colVar:5,  alpha:[0.75,0.95], shape:'round'   },
      // interstitial matrix — fine dust
      { count:220, minR:1, maxR:3,  colBase:[35,31,25],  colVar:8,  alpha:[0.35,0.55], shape:'round'   },
    ];

    // Pore region — avoid drawing grains over the cavity
    const poreW = Math.min(W * 0.88, 560) * 0.5;
    const poreH = Math.min(H * 0.38, 240) * 0.5;

    function inPore(x, y, margin) {
      const m = margin || 0;
      const dx = (x - cx) / (poreW + m);
      const dy = (y - cy) / (poreH + m);
      return (dx * dx + dy * dy) < 1;
    }

    grainTypes.forEach(function(gt) {
      for (let i = 0; i < gt.count; i++) {
        const gx  = rng() * W;
        const gy  = rng() * H;
        if (inPore(gx, gy, 30)) continue;

        const r   = gt.minR + rng() * (gt.maxR - gt.minR);
        const col = [
          Math.min(255, Math.round(gt.colBase[0] + (rng()-0.5) * gt.colVar * 2)),
          Math.min(255, Math.round(gt.colBase[1] + (rng()-0.5) * gt.colVar * 2)),
          Math.min(255, Math.round(gt.colBase[2] + (rng()-0.5) * gt.colVar * 2)),
        ];
        const alpha = gt.alpha[0] + rng() * (gt.alpha[1] - gt.alpha[0]);

        rCtx.save();
        rCtx.globalAlpha = alpha;
        rCtx.translate(gx, gy);
        rCtx.rotate(rng() * Math.PI * 2);

        if (gt.shape === 'lath') {
          // elongated feldspar crystal lath
          const lw = r * (0.28 + rng() * 0.18);
          const lh = r;
          rCtx.fillStyle = 'rgb(' + col.join(',') + ')';
          rCtx.beginPath();
          rCtx.ellipse(0, 0, lw, lh, 0, 0, Math.PI * 2);
          rCtx.fill();
          // cleavage highlight
          rCtx.globalAlpha = alpha * 0.4;
          rCtx.strokeStyle = 'rgba(130,120,110,0.5)';
          rCtx.lineWidth = 0.5;
          rCtx.beginPath();
          rCtx.moveTo(-lw * 0.6, -lh * 0.2);
          rCtx.lineTo( lw * 0.6,  lh * 0.2);
          rCtx.stroke();
        } else if (gt.shape === 'angular') {
          // angular pyroxene — 5-sided polygon
          const sides = 4 + Math.floor(rng() * 3);
          rCtx.fillStyle = 'rgb(' + col.join(',') + ')';
          rCtx.beginPath();
          for (let v = 0; v < sides; v++) {
            const ang = (v / sides) * Math.PI * 2;
            const vr  = r * (0.65 + rng() * 0.4);
            v === 0 ? rCtx.moveTo(Math.cos(ang)*vr, Math.sin(ang)*vr)
                    : rCtx.lineTo(Math.cos(ang)*vr, Math.sin(ang)*vr);
          }
          rCtx.closePath();
          rCtx.fill();
        } else {
          // round olivine / magnetite
          const g2 = rCtx.createRadialGradient(-r*0.25, -r*0.25, 0, 0, 0, r);
          g2.addColorStop(0,   'rgb(' + [col[0]+15, col[1]+12, col[2]+8].join(',') + ')');
          g2.addColorStop(0.6, 'rgb(' + col.join(',') + ')');
          g2.addColorStop(1,   'rgb(' + [Math.max(0,col[0]-8), Math.max(0,col[1]-8), Math.max(0,col[2]-6)].join(',') + ')');
          rCtx.fillStyle = g2;
          rCtx.beginPath();
          rCtx.arc(0, 0, r, 0, Math.PI * 2);
          rCtx.fill();
        }

        rCtx.restore();
      }
    });

    // ── 4. Micro-cracks and fracture network ──────────────────────────────
    const crackSeeds = [
      { sx:W*0.08, sy:H*0.15, angle:0.3,  len:W*0.22, branches:4 },
      { sx:W*0.78, sy:H*0.12, angle:2.2,  len:W*0.18, branches:3 },
      { sx:W*0.15, sy:H*0.75, angle:-0.5, len:W*0.20, branches:4 },
      { sx:W*0.85, sy:H*0.70, angle:1.8,  len:W*0.16, branches:3 },
      { sx:W*0.05, sy:H*0.48, angle:0.1,  len:W*0.14, branches:2 },
      { sx:W*0.92, sy:H*0.38, angle:3.0,  len:W*0.13, branches:2 },
      { sx:W*0.40, sy:H*0.05, angle:1.5,  len:W*0.10, branches:2 },
      { sx:W*0.60, sy:H*0.95, angle:-1.2, len:W*0.09, branches:2 },
    ];

    function drawCrack(x, y, angle, len, depth, rngFn) {
      if (depth <= 0 || len < 4) return;
      if (inPore(x, y, 60)) return;

      const steps = Math.floor(len / 5);
      let cx2 = x, cy2 = y;
      rCtx.beginPath();
      rCtx.moveTo(cx2, cy2);

      for (let s = 0; s < steps; s++) {
        const deviation = (rngFn() - 0.5) * 0.18;
        cx2 += Math.cos(angle + deviation) * 5;
        cy2 += Math.sin(angle + deviation) * 5;
        if (inPore(cx2, cy2, 50)) break;
        rCtx.lineTo(cx2, cy2);
      }
      rCtx.stroke();

      // spawn sub-cracks
      const numBranch = depth > 1 ? Math.floor(rngFn() * 2) + 1 : 0;
      for (let b = 0; b < numBranch; b++) {
        const bx  = x + (cx2 - x) * (0.3 + rngFn() * 0.5);
        const by  = y + (cy2 - y) * (0.3 + rngFn() * 0.5);
        const ba  = angle + (rngFn() > 0.5 ? 1 : -1) * (0.3 + rngFn() * 0.5);
        drawCrack(bx, by, ba, len * (0.35 + rngFn() * 0.3), depth - 1, rngFn);
      }
    }

    // Dark hairline cracks
    rCtx.save();
    rCtx.strokeStyle = 'rgba(8,7,6,0.85)';
    rCtx.lineWidth   = 1.2;
    rCtx.lineCap     = 'round';
    crackSeeds.forEach(function(c) {
      const r2 = seededRand(c.sx * 3 | 0);
      drawCrack(c.sx, c.sy, c.angle, c.len, c.branches, r2);
    });

    // Secondary thinner cracks (lighter tone — mineral-filled)
    rCtx.strokeStyle = 'rgba(40,34,26,0.5)';
    rCtx.lineWidth   = 0.6;
    const rng2 = seededRand(77);
    for (let i = 0; i < 24; i++) {
      const sx2 = rng2() * W, sy2 = rng2() * H;
      if (inPore(sx2, sy2, 55)) continue;
      drawCrack(sx2, sy2, rng2() * Math.PI * 2, W * (0.04 + rng2() * 0.08), 2, rng2);
    }
    rCtx.restore();

    // ── 5. Vesicles / secondary pores ────────────────────────────────────
    const rng3 = seededRand(123);
    for (let i = 0; i < 28; i++) {
      const vx = rng3() * W;
      const vy = rng3() * H;
      if (inPore(vx, vy, 80)) continue;
      const vr  = 3 + rng3() * 14;
      rng3(); // consume random (was: aspect ratio, now implicit)

      rCtx.save();
      rCtx.globalAlpha = 0.7;
      // dark void
      rCtx.fillStyle = 'rgba(4,4,4,0.9)';
      rCtx.beginPath();
      rCtx.ellipse(vx, vy, vr, vr * (0.65 + rng3() * 0.35), rng3() * Math.PI, 0, Math.PI * 2);
      rCtx.fill();
      // rim highlight
      rCtx.strokeStyle = 'rgba(55,48,38,0.6)';
      rCtx.lineWidth = 0.8;
      rCtx.stroke();
      rCtx.restore();
    }

    // ── 6. Cinematic lighting — directional light from upper-left ─────────
    // Broad warm key-light bloom (rock lit by stellar radiation)
    const keyLight = rCtx.createRadialGradient(W * 0.12, H * 0.12, 0, W * 0.12, H * 0.12, W * 0.75);
    keyLight.addColorStop(0,   'rgba(255,230,180,0.07)');
    keyLight.addColorStop(0.35,'rgba(220,180,120,0.04)');
    keyLight.addColorStop(0.7, 'rgba(160,120,70,0.02)');
    keyLight.addColorStop(1,   'rgba(0,0,0,0)');
    rCtx.save();
    rCtx.fillStyle = keyLight;
    rCtx.fillRect(0, 0, W, H);

    // Cool fill light from lower-right (reflected from planet surface below)
    const fillLight = rCtx.createRadialGradient(W * 0.88, H * 0.88, 0, W * 0.88, H * 0.88, W * 0.65);
    fillLight.addColorStop(0,   'rgba(80,140,220,0.04)');
    fillLight.addColorStop(0.5, 'rgba(60,100,180,0.02)');
    fillLight.addColorStop(1,   'rgba(0,0,0,0)');
    rCtx.fillStyle = fillLight;
    rCtx.fillRect(0, 0, W, H);

    // Edge vignette — deep shadow at rock edges
    const vig = rCtx.createRadialGradient(cx, cy, Math.min(W, H) * 0.3, cx, cy, Math.max(W, H) * 0.75);
    vig.addColorStop(0,   'rgba(0,0,0,0)');
    vig.addColorStop(0.55,'rgba(0,0,0,0.25)');
    vig.addColorStop(0.82,'rgba(0,0,0,0.65)');
    vig.addColorStop(1,   'rgba(0,0,0,0.9)');
    rCtx.fillStyle = vig;
    rCtx.fillRect(0, 0, W, H);
    rCtx.restore();

    // ── 7. Pore cavity rim — warm mineral dampness glow ──────────────────
    rCtx.save();
    // very subtle warm halo at the pore edge (minerals fluorescing)
    const poreGrad = rCtx.createRadialGradient(cx, cy, Math.min(poreW, poreH) * 0.6,
                                                cx, cy, Math.min(poreW, poreH) * 1.6);
    poreGrad.addColorStop(0,   'rgba(0,0,0,0)');
    poreGrad.addColorStop(0.55,'rgba(60,45,25,0.08)');
    poreGrad.addColorStop(0.82,'rgba(80,60,30,0.14)');
    poreGrad.addColorStop(1,   'rgba(40,30,12,0.04)');
    rCtx.fillStyle = poreGrad;
    rCtx.fillRect(0, 0, W, H);

    // Focused catch-light on upper-left pore wall (like a micro-torch from upper left)
    const rimCatch = rCtx.createRadialGradient(
      cx - poreW * 0.55, cy - poreH * 0.52, 0,
      cx - poreW * 0.55, cy - poreH * 0.52, poreW * 0.4
    );
    rimCatch.addColorStop(0,   'rgba(160,140,100,0.07)');
    rimCatch.addColorStop(0.5, 'rgba(110,90,60,0.03)');
    rimCatch.addColorStop(1,   'rgba(0,0,0,0)');
    rCtx.fillStyle = rimCatch;
    rCtx.fillRect(0, 0, W, H);
    rCtx.restore();

    // ── 8. Fine noise texture pass (simulate grain roughness) ─────────────
    const rng4 = seededRand(999);
    rCtx.save();
    rCtx.globalAlpha = 0.018;
    for (let i = 0; i < 14000; i++) {
      const nx = rng4() * W;
      const ny = rng4() * H;
      if (inPore(nx, ny, 15)) continue;
      const nb = Math.floor(rng4() * 60);
      rCtx.fillStyle = 'rgb(' + nb + ',' + nb + ',' + nb + ')';
      rCtx.fillRect(nx, ny, 1, 1);
    }
    rCtx.restore();
  }

  resizeRock();
})();

// ====== EFFECTS CANVAS ======
let dustClouds = [];
let fragments = [];
let shockwaves = [];
let flameSparks = [];
let explosionParticles = [];
let cometTrail = [];   // {x, y, time, size, angle}
let activeCrater = null;   // persistent crater rendered every frame
let asteroidPos  = null;   // {x, y, spin} — drawn on canvas so trail is always behind it

function drawEffects() {
  effectsCtx.clearRect(0, 0, effectsCanvas.width, effectsCanvas.height);

  // Comet tail — tapered glowing streak behind asteroid
  const now = performance.now();
  for (let i = cometTrail.length - 1; i >= 0; i--) {
    const p = cometTrail[i];
    const age = (now - p.time) / 900;   // fade over 900ms — long visible tail
    if (age >= 1) { cometTrail.splice(i, 1); continue; }
    const alpha = Math.pow(1 - age, 1.3) * 0.95;
    const r = p.size * (1 - age * 0.5);   // stays fat longer
    effectsCtx.save();
    effectsCtx.globalAlpha = alpha;
    // Elongate along travel direction
    effectsCtx.translate(p.x, p.y);
    if (p.angle !== undefined) {
      effectsCtx.rotate(p.angle);
      effectsCtx.scale(2.2, 1);
    }
    const g = effectsCtx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0,   'rgba(255,255,200,1.0)');
    g.addColorStop(0.2, 'rgba(255,210,80,0.9)');
    g.addColorStop(0.5, 'rgba(255,100,20,0.65)');
    g.addColorStop(1,   'rgba(255,40,0,0)');
    effectsCtx.fillStyle = g;
    effectsCtx.beginPath();
    effectsCtx.arc(0, 0, r, 0, Math.PI * 2);
    effectsCtx.fill();
    effectsCtx.restore();
  }

  for (let i = dustClouds.length - 1; i >= 0; i--) {
    const dust = dustClouds[i];
    const elapsed = performance.now() - dust.startTime;
    const progress = Math.min(elapsed / 3000, 1);
    if (progress >= 1) { dustClouds.splice(i, 1); continue; }
    const size = dust.size * (1 + progress * 2);
    const opacity = 0.8 * (1 - progress);
    const y = dust.y - progress * 100;
    effectsCtx.save();
    effectsCtx.globalAlpha = opacity;
    const g = effectsCtx.createRadialGradient(dust.x, y, 0, dust.x, y, size);
    g.addColorStop(0, 'rgba(139,115,85,0.6)');
    g.addColorStop(0.4, 'rgba(100,80,60,0.3)');
    g.addColorStop(1, 'rgba(139,115,85,0)');
    effectsCtx.fillStyle = g;
    effectsCtx.beginPath();
    effectsCtx.arc(dust.x, y, size, 0, Math.PI * 2);
    effectsCtx.fill();
    effectsCtx.restore();
  }

  for (let i = fragments.length - 1; i >= 0; i--) {
    const frag = fragments[i];
    const elapsed = performance.now() - frag.startTime;
    const progress = Math.min(elapsed / 800, 1);
    if (progress >= 1) { fragments.splice(i, 1); continue; }
    const fx = frag.x + frag.vx * progress;
    const fy = frag.y + frag.vy * progress + 0.5 * 200 * progress * progress;
    effectsCtx.save();
    effectsCtx.globalAlpha = 1 - progress;
    effectsCtx.translate(fx, fy);
    effectsCtx.rotate(progress * 720 * Math.PI / 180);
    effectsCtx.fillStyle = '#8B7355';
    effectsCtx.beginPath();
    effectsCtx.ellipse(0, 0, frag.size, frag.size * 0.7, 0, 0, Math.PI * 2);
    effectsCtx.fill();
    effectsCtx.restore();
  }

  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const sw = shockwaves[i];
    const elapsed = performance.now() - sw.startTime;
    const progress = Math.min(elapsed / 1500, 1);
    if (progress >= 1) { shockwaves.splice(i, 1); continue; }
    const size = progress * 300;
    effectsCtx.save();
    effectsCtx.globalAlpha = (1 - progress) * 0.6;
    effectsCtx.strokeStyle = 'rgba(255,100,0,0.6)';
    effectsCtx.lineWidth = 3 - progress * 3;
    effectsCtx.beginPath();
    effectsCtx.arc(sw.x, sw.y, size / 2, 0, Math.PI * 2);
    effectsCtx.stroke();
    effectsCtx.restore();
  }

  // Persistent crater — fades in over ~600ms, stays visible indefinitely
  if (activeCrater) {
    activeCrater.opacity = Math.min(activeCrater.opacity + 0.022, activeCrater.targetOpacity);
    const cx = activeCrater.x, cy = activeCrater.y;
    const op = activeCrater.opacity;
    const R  = activeCrater.radius || 38;
    const rx = R * (activeCrater.rx || 1.22);   // horizontal radius — wider oval
    const ry = R * (activeCrater.ry || 0.82);   // vertical radius  — flatter oval
    const tilt = -0.18;                          // slight tilt angle for natural look
    effectsCtx.save();

    // Helper: oval path centred at (cx,cy)
    function ovalPath(scaleX, scaleY) {
      effectsCtx.beginPath();
      effectsCtx.ellipse(cx, cy, rx * scaleX, ry * scaleY, tilt, 0, Math.PI * 2);
    }

    // 1. Scorched ejecta blanket — dark ash halo, oval
    effectsCtx.globalAlpha = op * 0.65;
    const ejecta = effectsCtx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry) * 2.2);
    ejecta.addColorStop(0,    'rgba(0,0,0,0)');
    ejecta.addColorStop(0.28, 'rgba(30,15,5,0.5)');
    ejecta.addColorStop(0.6,  'rgba(20,10,3,0.28)');
    ejecta.addColorStop(1,    'rgba(0,0,0,0)');
    effectsCtx.fillStyle = ejecta;
    effectsCtx.save();
    effectsCtx.scale(1, ry / rx);              // squash circle into oval for gradient fill
    effectsCtx.beginPath();
    effectsCtx.arc(cx, cy * (rx / ry), rx * 2.2, 0, Math.PI * 2);
    effectsCtx.restore();
    ovalPath(2.2, 2.2);
    effectsCtx.fill();

    // 2. Uplifted rim — earthy dark ridge around crater edge
    effectsCtx.globalAlpha = op * 0.88;
    const rim = effectsCtx.createRadialGradient(cx, cy, Math.min(rx,ry)*0.78, cx, cy, Math.max(rx,ry)*1.12);
    rim.addColorStop(0,   'rgba(0,0,0,0)');
    rim.addColorStop(0.4, 'rgba(52,28,8,0.8)');
    rim.addColorStop(0.75,'rgba(32,16,4,0.5)');
    rim.addColorStop(1,   'rgba(0,0,0,0)');
    effectsCtx.fillStyle = rim;
    ovalPath(1.12, 1.12);
    effectsCtx.fill();

    // 3. Deep crater bowl — jet-black depression with depth layers
    effectsCtx.globalAlpha = op;
    const bowl = effectsCtx.createRadialGradient(
      cx - rx*0.12, cy - ry*0.12, Math.min(rx,ry)*0.04,
      cx, cy, Math.max(rx, ry)
    );
    bowl.addColorStop(0,    'rgba(0,0,0,1.0)');
    bowl.addColorStop(0.3,  'rgba(2,1,0,0.99)');
    bowl.addColorStop(0.62, 'rgba(10,5,1,0.93)');
    bowl.addColorStop(0.86, 'rgba(26,12,3,0.78)');
    bowl.addColorStop(1,    'rgba(0,0,0,0)');
    effectsCtx.fillStyle = bowl;
    ovalPath(1.0, 1.0);
    effectsCtx.fill();

    // 4. Dark lit-side rim accent — one thin arc along upper-left
    effectsCtx.globalAlpha = op * 0.5;
    effectsCtx.strokeStyle = 'rgba(65,38,12,0.65)';
    effectsCtx.lineWidth = 2.5;
    effectsCtx.beginPath();
    effectsCtx.ellipse(cx, cy, rx - 1, ry - 1, tilt, Math.PI * 0.8, Math.PI * 1.9);
    effectsCtx.stroke();

    // 5. Embedded impactor rock fragment — lodged at crater centre
    const arx = cx + rx * 0.04, ary = cy + ry * 0.12;
    const ar = Math.min(rx, ry) * 0.34;
    effectsCtx.globalAlpha = op;
    const rockGrad = effectsCtx.createRadialGradient(arx - ar*0.3, ary - ar*0.3, ar*0.04, arx, ary, ar);
    rockGrad.addColorStop(0,   '#8a5a3a');
    rockGrad.addColorStop(0.4, '#5a3318');
    rockGrad.addColorStop(0.75,'#2d1508');
    rockGrad.addColorStop(1,   '#100500');
    effectsCtx.fillStyle = rockGrad;
    effectsCtx.beginPath();
    effectsCtx.ellipse(arx, ary, ar, ar * 0.78, 0.25, 0, Math.PI * 2);
    effectsCtx.fill();
    // surface highlight
    effectsCtx.globalAlpha = op * 0.4;
    effectsCtx.fillStyle = 'rgba(180,130,80,0.45)';
    effectsCtx.beginPath();
    effectsCtx.ellipse(arx - ar*0.25, ary - ar*0.22, ar*0.26, ar*0.16, -0.4, 0, Math.PI * 2);
    effectsCtx.fill();

    // 6. Animated heat-glow dots (red smoke) rising from impactor
    const fTime = performance.now() * 0.001;
    const flameDots = [
      { ox:-0.40, oy:-1.10, phase:0.0,  size:0.18, col:'rgba(220,40,0,'  },
      { ox: 0.10, oy:-1.30, phase:1.2,  size:0.14, col:'rgba(255,20,0,'  },
      { ox: 0.50, oy:-1.00, phase:2.1,  size:0.16, col:'rgba(200,50,10,' },
      { ox:-0.15, oy:-1.50, phase:0.7,  size:0.11, col:'rgba(240,30,5,'  },
      { ox: 0.30, oy:-1.70, phase:1.8,  size:0.10, col:'rgba(180,20,0,'  },
      { ox:-0.55, oy:-0.80, phase:3.0,  size:0.13, col:'rgba(255,50,10,' },
    ];
    flameDots.forEach(function(fd) {
      const pulse = (Math.sin(fTime * 2.8 + fd.phase) + 1) * 0.5;
      const dotR  = ar * fd.size * (0.7 + pulse * 0.6);
      const dotX  = arx + ar * fd.ox;
      const dotY  = ary + ar * fd.oy - pulse * ar * 0.3;
      effectsCtx.globalAlpha = (0.5 + pulse * 0.5) * op;
      const dotG = effectsCtx.createRadialGradient(dotX, dotY, 0, dotX, dotY, dotR);
      dotG.addColorStop(0,   fd.col + '0.95)');
      dotG.addColorStop(0.5, fd.col + '0.55)');
      dotG.addColorStop(1,   fd.col + '0)');
      effectsCtx.fillStyle = dotG;
      effectsCtx.beginPath();
      effectsCtx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
      effectsCtx.fill();
    });

    effectsCtx.restore();
  }

  for (let i = flameSparks.length - 1; i >= 0; i--) {
    const spark = flameSparks[i];
    const elapsed = performance.now() - spark.startTime;
    const progress = Math.min(elapsed / 500, 1);
    if (progress >= 1) { flameSparks.splice(i, 1); continue; }
    const sx = spark.x + spark.vx * progress;
    const sy = spark.y + spark.vy * progress;
    effectsCtx.save();
    effectsCtx.globalAlpha = 1 - progress;
    effectsCtx.fillStyle = 'rgba(255,200,50,0.8)';
    effectsCtx.shadowColor = 'rgba(255,150,0,0.6)';
    effectsCtx.shadowBlur = 6;
    effectsCtx.beginPath();
    effectsCtx.arc(sx, sy, spark.size, 0, Math.PI * 2);
    effectsCtx.fill();
    effectsCtx.restore();
  }

  for (let i = explosionParticles.length - 1; i >= 0; i--) {
    const p = explosionParticles[i];
    const elapsed = performance.now() - p.startTime;
    const progress = Math.min(elapsed / 1000, 1);
    if (progress >= 1) { explosionParticles.splice(i, 1); continue; }
    const px = p.x + Math.cos(p.angle) * p.velocity * progress;
    const py = p.y + Math.sin(p.angle) * p.velocity * progress - 0.5 * 100 * progress * progress;
    effectsCtx.save();
    effectsCtx.globalAlpha = 1 - progress;
    effectsCtx.fillStyle = p.color;
    effectsCtx.translate(px, py);
    effectsCtx.rotate(p.rotation * progress * Math.PI / 180);
    effectsCtx.beginPath();
    effectsCtx.arc(0, 0, p.size * (1 - progress * 0.5), 0, Math.PI * 2);
    effectsCtx.fill();
    effectsCtx.restore();
  }

  // Asteroid body — drawn on canvas AFTER trail so it always sits in front of its tail
  if (asteroidPos) {
    const ax = asteroidPos.x, ay = asteroidPos.y;
    asteroidPos.spin = (asteroidPos.spin || 0) + 0.04;
    const spin = asteroidPos.spin;
    const R = 14;   // radius matches the 28px DOM asteroid

    effectsCtx.save();
    effectsCtx.translate(ax, ay);
    effectsCtx.rotate(spin);

    // Outer glow halo
    const halo = effectsCtx.createRadialGradient(0, 0, R * 0.8, 0, 0, R * 2.8);
    halo.addColorStop(0,   'rgba(255,120,30,0.55)');
    halo.addColorStop(0.5, 'rgba(255,60,0,0.2)');
    halo.addColorStop(1,   'rgba(255,40,0,0)');
    effectsCtx.fillStyle = halo;
    effectsCtx.beginPath();
    effectsCtx.arc(0, 0, R * 2.8, 0, Math.PI * 2);
    effectsCtx.fill();

    // Rock body — radial gradient matching original CSS
    const rock = effectsCtx.createRadialGradient(-R * 0.3, -R * 0.3, 0, 0, 0, R);
    rock.addColorStop(0,   '#ffe0a0');
    rock.addColorStop(0.3, '#ff6b35');
    rock.addColorStop(0.75,'#7a2800');
    rock.addColorStop(1,   '#3a1000');
    effectsCtx.fillStyle = rock;
    effectsCtx.beginPath();
    effectsCtx.arc(0, 0, R, 0, Math.PI * 2);
    effectsCtx.fill();

    // Specular highlight
    effectsCtx.fillStyle = 'rgba(255,240,200,0.35)';
    effectsCtx.beginPath();
    effectsCtx.ellipse(-R * 0.3, -R * 0.3, R * 0.35, R * 0.22, -0.5, 0, Math.PI * 2);
    effectsCtx.fill();

    effectsCtx.restore();
  }

  requestAnimationFrame(drawEffects);
}
drawEffects();

// ====== ANIMATION MANAGER ======
const animations = [];
function addAnimation(fn) { animations.push(fn); }
function animationLoop(time) {
  for (let i = animations.length - 1; i >= 0; i--) {
    const alive = animations[i](time);
    if (!alive) animations.splice(i, 1);
  }
  requestAnimationFrame(animationLoop);
}
requestAnimationFrame(animationLoop);

// ====== DOM ELEMENTS ======
const originateBtn = document.getElementById('originate-btn');
const rotateBtn    = document.getElementById('rotate-btn');
const zoomLens       = document.getElementById('zoom-lens');
const zoomSlider     = document.getElementById('zoom-slider');
const zoomSliderFill = document.getElementById('zoom-slider-fill');
const zoomSliderPanel= document.getElementById('zoom-slider-panel');
const zoomHint       = document.getElementById('zoom-hint');
const lensMagLabel   = document.getElementById('lens-mag-label');
const lensCraterView = document.getElementById('lens-crater-view');
const lensAsteroidView = document.getElementById('lens-asteroid-view');
const lensBacteriaView = document.getElementById('lens-bacteria-view');
const smokeContainer = document.getElementById('smoke-container');
const asteroidContainer = document.getElementById('asteroid-container');
const asteroid = document.getElementById('asteroid');
const earth = document.getElementById('earth');
const earthContainer = document.getElementById('earth-container');
const impactFlash = document.getElementById('impact-flash');
const crater = document.getElementById('crater');
const zoomOverlay = document.getElementById('zoom-overlay');
const bacteriumView = document.getElementById('bacterium-view');
const typewriter = document.getElementById('typewriter');
const scaleBar = document.getElementById('scale-bar');
const atmosphericGlow = document.getElementById('atmospheric-glow');
const hudOverlay = document.getElementById('hud-overlay');
const semOverlay = document.getElementById('sem-overlay');
const tourArrow = document.getElementById('tour-arrow');
const tourBubble = document.getElementById('tour-bubble');
const a11yToggle = document.getElementById('a11y-toggle');

let impactOccurred = false;
let bacteriumTransitionFired = false;  // Bug 2 guard: prevent 50x re-trigger on repeated drags
let impactX = 0, impactY = 0;  // stored for lens positioning

// ====== ASTEROID LAUNCH ======
originateBtn.addEventListener('click', function() {
  if (impactOccurred) return;
  impactOccurred = true;
  originateBtn.style.opacity = '0';
  originateBtn.style.pointerEvents = 'none';
  setStep(1);
  launchAsteroid();
});

function launchAsteroid() {
  hudOverlay.classList.add('active');
  cometTrail.length = 0;  // clear any old trail

  const startX = window.innerWidth * 0.85;
  const startY = window.innerHeight * 0.12;

  asteroidContainer.style.display = 'none';   // canvas draws the rock instead
  asteroidPos = { x: startX, y: startY, spin: 0 };
  const earthRect = earth.getBoundingClientRect();
  // Right-centre face — squarely in the path of a top-right incoming asteroid,
  // fully visible to the viewer and away from both limbs
  const targetX = earthRect.left + earthRect.width  * 0.72;
  const targetY = earthRect.top  + earthRect.height * 0.48;

  const duration = 2200;
  const startTime = performance.now();
  let atmosphereActivated = false;
  let prevX = startX, prevY = startY;

  function animate(now) {
    let t = (now - startTime) / duration;
    if (t > 1) t = 1;

    // Simple lerp — straight diagonal from top-right into Earth face
    // No arc needed; the natural diagonal IS the comet approach vector
    const x = startX + (targetX - startX) * t;
    const y = startY + (targetY - startY) * t;

    // Deposit trail points based on distance travelled
    const ddx = x - prevX, ddy = y - prevY;
    const step = Math.sqrt(ddx*ddx + ddy*ddy);
    if (step > 2) {
      const travelAngle = Math.atan2(ddy, ddx);
      const trailSize = 20 + (1 - t) * 16;   // fat at start, tapers toward impact
      const steps = Math.ceil(step / 3);
      for (let s = 0; s < steps; s++) {
        const f = s / steps;
        cometTrail.push({
          x: prevX + ddx * f,
          y: prevY + ddy * f,
          time: now - (steps - s) * 16,
          size: trailSize * (0.7 + Math.random() * 0.4),
          angle: travelAngle
        });
      }
      prevX = x; prevY = y;
    }

    asteroidPos.x = x;
    asteroidPos.y = y;

    if (t > 0.7 && !atmosphereActivated) {
      atmosphereActivated = true;
      atmosphericGlow.classList.add('active');
    }

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      impact(targetX, targetY);
    }
  }

  requestAnimationFrame(animate);
}

function impact(x, y) {
  impactX = x; impactY = y;
  setTimeout(function() {
    asteroidPos = null;   // remove canvas asteroid on impact
    atmosphericGlow.classList.remove('active');
    hudOverlay.classList.remove('active');

    earthContainer.classList.add('shake');
    setTimeout(function() { earthContainer.classList.remove('shake'); }, 500);

    impactFlash.style.left = x + 'px';
    impactFlash.style.top = y + 'px';
    impactFlash.animate([
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, boxShadow: '0 0 20px #fff' },
      { transform: 'translate(-50%, -50%) scale(15)', opacity: 0, boxShadow: '0 0 100px #ff6600' }
    ], { duration: 600, easing: 'ease-out', fill: 'forwards' });

    spawnParticles(x, y);
    spawnDustClouds(x, y);
    spawnShockwave(x, y);
    spawnFragments(x, y);
    createCrater(x, y);

    earth.classList.add('earth-glow');

    // Show rotate-to-impact button
    setTimeout(function() { rotateBtn.classList.add('visible'); }, 1800);

    // Show zoom lens anchored to impact site + slide up slider
    setTimeout(function() {
      showZoomLens(x, y);
    }, 1200);

    setTimeout(function() { cometTrail.length = 0; }, 4000);
  }, 200);
}

function createCrater(x, y) {
  // Draw crater on effectsCanvas at viewport coords — avoids Earth's overflow:hidden
  // and the rotateEarth animation sweeping it away.
  // radius 38 = ~35% larger than original; rx/ry give it an irregular oval feel
  activeCrater = { x: x, y: y, opacity: 0, targetOpacity: 1, radius: 38, rx: 1.22, ry: 0.82 };
}

function spawnParticles(x, y) {
  const colors = ['#ff4500', '#ff8c00', '#ffd700', '#ff6347', '#ffffff', '#8B4513'];
  for (let i = 0; i < 40; i++) {
    explosionParticles.push({
      x: x, y: y,
      angle: Math.random() * Math.PI * 2,
      velocity: 50 + Math.random() * 200,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 3 + 1.5,
      rotation: Math.random() > 0.5 ? 360 : -360,
      startTime: performance.now()
    });
  }
}

function spawnDustClouds(x, y) {
  for (let i = 0; i < 2; i++) {
    dustClouds.push({
      x: x - 50 + i * 30,
      y: y - 50,
      size: 60 + Math.random() * 40,
      startTime: performance.now()
    });
  }
}

function spawnShockwave(x, y) {
  shockwaves.push({ x: x, y: y, startTime: performance.now() });
}

function spawnFragments(x, y) {
  for (let i = 0; i < 18; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 180;
    fragments.push({
      x: x, y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 60,
      size: 2 + Math.random() * 5,
      startTime: performance.now()
    });
  }
}

// ====== ZOOM LENS SYSTEM ======
let smokePuffInterval = null;

function showZoomLens(x, y) {
  setStep(2);
  // Clamp just enough to keep lens fully on-screen (lens is 220px diameter)
  const lensHalf = 110;
  const cx = Math.max(lensHalf, Math.min(window.innerWidth  - lensHalf, x));
  const cy = Math.max(lensHalf, Math.min(window.innerHeight - lensHalf, y));
  zoomLens.style.left = cx + 'px';
  zoomLens.style.top  = cy + 'px';
  zoomLens.classList.add('visible');

  // Slide up the slider panel
  zoomSliderPanel.classList.add('visible');

  // Reset slider
  zoomSlider.value = 1;
  zoomSliderFill.style.width = '2%';
  updateLensView(1);
}

function spawnSmokePuff() {
  const puff = document.createElement('div');
  puff.className = 'smoke-puff';
  const size = 18 + Math.random() * 22;
  const xPos = 30 + Math.random() * 40;
  const dur  = 1.6 + Math.random() * 1.2;
  puff.style.width  = size + 'px';
  puff.style.height = size + 'px';
  puff.style.left   = xPos + '%';
  puff.style.bottom = '44%';
  puff.style.animationDuration = dur + 's';
  puff.style.animationDelay   = '0s';
  smokeContainer.appendChild(puff);
  setTimeout(function() { puff.remove(); }, dur * 1000 + 200);
}

function updateLensView(val) {
  // Fill bar
  const pct = ((val - 1) / 49) * 100;
  zoomSliderFill.style.width = Math.max(pct, 2) + '%';

  // Mag label
  lensMagLabel.textContent = val < 10 ? '1x'
    : val < 20 ? '10x'
    : val < 50 ? '20x'
    : '50x';

  // Tick highlights
  document.querySelectorAll('.zoom-tick').forEach(function(t) {
    const tv = parseFloat(t.dataset.val);
    t.classList.toggle('active',
      (tv === 1  && val < 10) ||
      (tv === 10 && val >= 10 && val < 20) ||
      (tv === 20 && val >= 20 && val < 50) ||
      (tv === 50 && val >= 50)
    );
  });

  // Layer visibility
  lensCraterView.classList.toggle('visible',   val >= 10);
  lensAsteroidView.classList.toggle('visible', val >= 20);
  lensBacteriaView.classList.toggle('visible', val >= 50);

  // Smoke puffs at 20x
  if (val >= 20 && val < 50) {
    if (!smokePuffInterval) {
      smokePuffInterval = setInterval(spawnSmokePuff, 400);
      spawnSmokePuff();
    }
  } else {
    if (smokePuffInterval) {
      clearInterval(smokePuffInterval);
      smokePuffInterval = null;
    }
  }

  // Lens scale grows with magnification
  const lensScale = 1 + (val / 50) * 0.5;
  zoomLens.style.transform = 'translate(-50%, -50%) scale(' + lensScale + ')';

  // At 50x — transition to bacterium view (guarded: only fires once per session)
  if (val >= 50 && !bacteriumTransitionFired) {
    bacteriumTransitionFired = true;
    zoomHint.textContent = 'Entering cell view...';
    setTimeout(function() {
      zoomLens.classList.remove('visible');
      zoomSliderPanel.classList.remove('visible');
      smokePuffInterval && clearInterval(smokePuffInterval);
      smokePuffInterval = null;

      zoomOverlay.classList.add('active');
      setTimeout(function() {
        document.getElementById('scene').style.display = 'none';
        bacteriumView.classList.add('active');
        setStep(3);
        zoomOverlay.classList.remove('active');
        semOverlay.classList.add('active');
        typewriterText("Panspermia survivor detected — rod-shaped bacillus. Explore its structures below.");
        setTimeout(function() {
          scaleBar.classList.add('visible');
          startGuidedTour();
        }, 2500);
      }, 900);
    }, 800);
  }
}

zoomSlider.addEventListener('input', function() {
  updateLensView(parseFloat(this.value));
});

function typewriterText(text) {
  typewriter.innerHTML = '';
  let i = 0;
  const cursor = document.createElement('span');
  cursor.className = 'cursor';
  typewriter.appendChild(cursor);
  function type() {
    if (i < text.length) {
      typewriter.insertBefore(document.createTextNode(text.charAt(i)), cursor);
      i++;
      setTimeout(type, 30 + Math.random() * 40);
    }
  }
  type();
}

// ====== LENS ASTEROID FLAME DOTS ======
(function() {
  const wrap = document.getElementById('lens-asteroid-wrap');
  if (!wrap) return;
  const flameCfg = [
    { left: '30%', top: '5%',  size: 7,  color: 'rgba(220,30,0,', delay: '0s'    },
    { left: '50%', top: '-5%', size: 6,  color: 'rgba(255,15,0,', delay: '0.3s'  },
    { left: '65%', top: '8%',  size: 8,  color: 'rgba(200,40,5,', delay: '0.6s'  },
    { left: '40%', top: '-8%', size: 5,  color: 'rgba(240,20,0,', delay: '0.15s' },
    { left: '55%', top: '0%',  size: 4,  color: 'rgba(180,20,0,', delay: '0.45s' },
  ];
  flameCfg.forEach(function(f) {
    const dot = document.createElement('div');
    dot.className = 'lens-flame-dot';
    dot.style.left   = f.left;
    dot.style.top    = f.top;
    dot.style.width  = f.size + 'px';
    dot.style.height = f.size + 'px';
    dot.style.background = 'radial-gradient(circle, ' + f.color + '0.95) 0%, ' + f.color + '0.4) 55%, transparent 100%)';
    dot.style.boxShadow  = '0 0 ' + (f.size * 2) + 'px ' + f.color + '0.8)';
    dot.style.animationDelay = f.delay;
    dot.style.animationDuration = (1.0 + Math.random() * 0.6) + 's';
    wrap.appendChild(dot);
  });
})();

// ====== GENERATE RIBOSOMES ======
// Distributed throughout cytoplasm, avoiding the central nucleoid zone
// Nucleoid occupies roughly 35%-65% x, 30%-70% y of the bacterium
const bacterium = document.getElementById('bacterium');

// Fixed anchor ribosome — guarantees label-ribosome dot (wrapper 68%x,27%y)
// lands on a real granule. Bacterium-relative: (68%-10%)/(80%-10%) * 100 ≈ 83%x
// of bacterium width; y: (27%-18%)/(82%-18%) * 100 ≈ 14%y of bacterium height.
// Place it at 82%x, 15%y of bacterium to match the label dot.
(function() {
  const anchor = document.createElement('div');
  anchor.className = 'ribosome';
  anchor.id = 'ribosome-anchor';
  anchor.style.left = '82%';
  anchor.style.top  = '15%';
  anchor.style.width  = '5px';
  anchor.style.height = '5px';
  anchor.style.animationDelay = '0s';
  bacterium.appendChild(anchor);
})();
let ribosomeCount = 0;
let ribosomeAttempts = 0;
while (ribosomeCount < 80 && ribosomeAttempts < 400) {
  ribosomeAttempts++;
  const rx = Math.random() * 88 + 6;   // 6–94% x
  const ry = Math.random() * 72 + 12;  // 12–84% y
  // Skip the central nucleoid region (approx 32–68% x, 28–72% y)
  const inNucleoid = (rx > 32 && rx < 68 && ry > 28 && ry < 72);
  if (inNucleoid && Math.random() > 0.25) continue; // allow sparse ribosomes near nucleoid
  const ribosome = document.createElement('div');
  ribosome.className = 'ribosome';
  ribosome.style.left = rx + '%';
  ribosome.style.top = ry + '%';
  ribosome.style.animationDelay = (Math.random() * 5) + 's';
  ribosome.style.animationDuration = (4 + Math.random() * 3) + 's';
  bacterium.appendChild(ribosome);
  ribosomeCount++;
}

// ====== GENERATE PILI / FIMBRIAE ======
// Guaranteed anchor pili at bottom-centre, pointing straight down (angle=π/2).
// This ensures the label-pili dot (wrapper ~44%x, 85%y) always lands on a real pili.
// bacterium 50%x, 100%y = bottom-centre. Angle π/2 = 90° = straight down.
(function() {
  const anchorPili = document.createElement('div');
  anchorPili.className = 'pili';
  anchorPili.id = 'pili-anchor';
  anchorPili.style.left = '50%';
  anchorPili.style.top  = '100%';
  anchorPili.style.setProperty('--rot', '90deg');
  anchorPili.style.transform = 'rotate(90deg)';
  anchorPili.style.width = '32px';
  anchorPili.style.animationDelay = '0s';
  bacterium.appendChild(anchorPili);
})();
for (let i = 0; i < 40; i++) {
  const pili = document.createElement('div');
  pili.className = 'pili';
  const angle = (Math.random() * Math.PI * 2);
  const radiusX = 210;
  const radiusY = 70;
  const x = 50 + (Math.cos(angle) * radiusX / 4.2);
  const y = 50 + (Math.sin(angle) * radiusY / 1.4);
  pili.style.left = x + '%';
  pili.style.top = y + '%';
  pili.style.setProperty('--rot', (angle * 180 / Math.PI) + 'deg');
  pili.style.transform = 'rotate(' + (angle * 180 / Math.PI) + 'deg)';
  pili.style.animationDelay = (Math.random() * 3) + 's';
  pili.style.width = (25 + Math.random() * 20) + 'px';
  bacterium.appendChild(pili);
}

// ====== GENERATE COSMIC DUST ======
for (let i = 0; i < 15; i++) {
  const dust = document.createElement('div');
  dust.className = 'cosmic-dust';
  dust.style.top = (Math.random() * 100) + '%';
  dust.style.animationDelay = (Math.random() * 12) + 's';
  dust.style.animationDuration = (8 + Math.random() * 8) + 's';
  dust.style.width = (2 + Math.random() * 3) + 'px';
  dust.style.height = dust.style.width;
  bacteriumView.appendChild(dust);
}

// ====== BACKGROUND PARTICLES ======
const bgParticlesContainer = document.getElementById('bg-particles');
for (let i = 0; i < 40; i++) {
  const particle = document.createElement('div');
  particle.className = 'bg-particle';
  const size = Math.random() * 3 + 1;
  particle.style.width = size + 'px';
  particle.style.height = size + 'px';
  particle.style.left = Math.random() * 100 + '%';
  particle.style.top = Math.random() * 100 + '%';
  particle.style.animationDelay = Math.random() * 10 + 's';
  particle.style.animationDuration = (8 + Math.random() * 8) + 's';
  bgParticlesContainer.appendChild(particle);
}

// ====== GENERATE ATP PARTICLES ======
for (let i = 0; i < 12; i++) {
  const atp = document.createElement('div');
  atp.className = 'atp-particle';
  atp.style.left = (Math.random() * 80 + 10) + '%';
  atp.style.top = (Math.random() * 80 + 10) + '%';
  atp.style.setProperty('--tx', (Math.random() * 40 - 20) + 'px');
  atp.style.setProperty('--ty', (Math.random() * -30 - 10) + 'px');
  atp.style.animationDelay = (Math.random() * 4) + 's';
  atp.style.animationDuration = (3 + Math.random() * 3) + 's';
  bacterium.appendChild(atp);
}

// ====== GENERATE MEMBRANE CHANNELS ======
for (let i = 0; i < 8; i++) {
  const channel = document.createElement('div');
  channel.className = 'channel-flash';
  const angle = Math.random() * Math.PI * 2;
  const x = 50 + Math.cos(angle) * 48;
  const y = 50 + Math.sin(angle) * 48;
  channel.style.left = x + '%';
  channel.style.top = y + '%';
  channel.style.transform = 'rotate(' + (angle * 180 / Math.PI + 90) + 'deg)';
  channel.style.animationDelay = (Math.random() * 3) + 's';
  channel.style.animationDuration = (2 + Math.random() * 2) + 's';
  bacterium.appendChild(channel);
}

// ====== HOTSPOT INTERACTIONS (removed — orphaned divs eliminated) ======

// ====== INFO CARD SYSTEM ======
const infoCard     = document.getElementById('hotspot-info-card');
const cardName     = document.getElementById('card-name');
const cardDesc     = document.getElementById('card-desc');
const cardClose    = document.getElementById('card-close');

function showInfoCard(container, dot) {
  const name = container.dataset.name || '';
  const desc = container.dataset.desc || '';
  if (!name) return;

  cardName.textContent = name;
  cardDesc.textContent = desc;

  // Make card temporarily visible off-screen to measure its real size
  infoCard.style.visibility = 'hidden';
  infoCard.style.left = '-9999px';
  infoCard.style.top  = '-9999px';
  infoCard.classList.add('visible');

  // Use requestAnimationFrame so the browser paints+measures before repositioning
  requestAnimationFrame(function() {
    const dotRect = dot.getBoundingClientRect();
    const cardW = infoCard.offsetWidth  || 280;
    const cardH = infoCard.offsetHeight || 110;
    const margin = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Try right of dot first, then left, then centred below
    let cx = dotRect.right + 14;
    let cy = dotRect.top - 10;

    // Flip to left if it would overflow the right edge
    if (cx + cardW > vw - margin) {
      cx = dotRect.left - cardW - 14;
    }
    // If left is also off-screen (dot near left edge), centre under dot
    if (cx < margin) {
      cx = Math.max(margin, Math.min(dotRect.left + dotRect.width / 2 - cardW / 2, vw - cardW - margin));
      cy = dotRect.bottom + 10;
    }

    // Vertical clamping — keep fully inside viewport
    if (cy + cardH > vh - margin) cy = vh - cardH - margin;
    if (cy < margin) cy = margin;

    infoCard.style.left = cx + 'px';
    infoCard.style.top  = cy + 'px';
    infoCard.style.visibility = '';
  });
}

function hideInfoCard() {
  infoCard.classList.remove('visible');
}

cardClose.addEventListener('click', function(e) {
  e.stopPropagation();
  hideInfoCard();
  labelContainers.forEach(function(c) { c.classList.remove('active'); });
});



// ====== HOVER-REACTIVE PILI ======
const allPili = document.querySelectorAll('.pili');
bacteriumView.addEventListener('mousemove', function(e) {
  const rect = bacterium.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  allPili.forEach(function(p) {
    const px = parseFloat(p.style.left) * rect.width / 100;
    const py = parseFloat(p.style.top) * rect.height / 100;
    const dx = mx - px;
    const dy = my - py;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < 80) {
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      const bend = (80 - dist) / 80 * 15;
      p.style.transform = 'rotate(' + (angle + bend) + 'deg)';
    }
  });
});

// ====== CLICKABLE FLAGELLUM BURST ======
const flagellumEl = document.getElementById('flagellum');
flagellumEl.style.pointerEvents = 'auto';
flagellumEl.style.cursor = 'pointer';
flagellumEl.addEventListener('click', function(e) {
  e.stopPropagation();
  // Speed up wave propagation on the SVG paths
  const paths = flagellumEl.querySelectorAll('.flagellum-path, .flagellum-path-ghost');
  paths.forEach(function(p) { p.style.animationDuration = '0.45s'; });

  // Nudge bacterium forward to suggest swimming
  bacterium.style.animationPlayState = 'paused';
  bacterium.style.transition = 'transform 0.28s ease';
  bacterium.style.transform = 'translateX(22px)';
  setTimeout(function() {
    bacterium.style.transform = 'translateX(0)';
    setTimeout(function() {
      paths.forEach(function(p) { p.style.animationDuration = ''; });
      bacterium.style.transition = '';
      bacterium.style.transform = '';
      bacterium.style.animationPlayState = 'running';
    }, 280);
  }, 280);
});

// ====== GUIDED TOUR ======
const tourSteps = [
  { target: '.label-flagella', text: 'Flagellum: whip-like propulsion', arrow: 'left', offset: {x: -80, y: 0} },
  { target: '.label-pili', text: 'Pili: surface attachment fibers', arrow: 'up', offset: {x: 0, y: -60} },
  { target: '.label-nucleoid', text: 'Nucleoid: genetic material storage', arrow: 'down', offset: {x: 0, y: 50} },
  { target: '.label-plasmid-1', text: 'Plasmid DNA: mobile genetic element', arrow: 'right', offset: {x: 60, y: 0} },
  { target: '.label-ribosome', text: 'Ribosomes: protein synthesis', arrow: 'left', offset: {x: -60, y: 0} },
  { target: '.label-cellwall', text: 'Cell Wall: peptidoglycan protection', arrow: 'left', offset: {x: -80, y: 0} },
  { target: '.label-membrane', text: 'Plasma Membrane: selective barrier', arrow: 'left', offset: {x: -80, y: 0} }
];

let tourIndex = 0;
let tourActive = false;

function startGuidedTour() {
  tourActive = true;
  tourIndex = 0;
  showTourStep();
}

function showTourStep() {
  if (!tourActive || tourIndex >= tourSteps.length) {
    endTour();
    return;
  }
  const step = tourSteps[tourIndex];
  const target = document.querySelector(step.target);
  if (!target) {
    // Skip missing target — but if we've now exhausted every step via skips,
    // endTour must wait for the typewriter (≈ text.length * ~50ms ≈ 4 s max).
    // Check if any remaining steps have a valid target; if not, delay end.
    const remaining = tourSteps.slice(tourIndex + 1);
    const anyValid = remaining.some(function(s) { return !!document.querySelector(s.target); });
    if (!anyValid && tourIndex + 1 >= tourSteps.length) {
      // All steps exhausted through skips — give typewriter time to finish
      setTimeout(function() { if (tourActive) endTour(); }, 4500);
      tourActive = false;  // prevent re-entry
      return;
    }
    tourIndex++;
    showTourStep();
    return;
  }

  const rect = target.getBoundingClientRect();
  const arrowX = rect.left + rect.width/2 + step.offset.x;
  const arrowY = rect.top + rect.height/2 + step.offset.y;

  tourArrow.style.left = arrowX + 'px';
  tourArrow.style.top = arrowY + 'px';
  tourArrow.className = 'tour-arrow ' + step.arrow + ' active';

  tourBubble.textContent = step.text;
  tourBubble.style.display = 'block';
  tourBubble.style.left = (arrowX + (step.arrow === 'left' ? 20 : step.arrow === 'right' ? -20 : 0)) + 'px';
  tourBubble.style.top = (arrowY + (step.arrow === 'up' ? 20 : step.arrow === 'down' ? -20 : 0)) + 'px';
  tourBubble.style.transform = 'translate(-50%, -50%)';

  setTimeout(function() {
    if (tourActive) {
      tourIndex++;
      showTourStep();
    }
  }, 4000);
}

function endTour() {
  tourActive = false;
  tourArrow.classList.remove('active');
  tourBubble.style.display = 'none';
}

// ====== ROTATE TO IMPACT TOGGLE ======
let impactFacing = false;

rotateBtn.addEventListener('click', function() {
  impactFacing = !impactFacing;

  if (impactFacing) {
    // Position crater div on the Earth face before showing it
    // Impact was at 72% x, 48% y of Earth rect — place crater there
    crater.style.left = '72%';
    crater.style.top  = '48%';
    crater.classList.add('active');

    // Rotate Earth so impact side faces viewer
    earthContainer.style.transition = 'transform 1.2s cubic-bezier(0.4,0,0.2,1)';
    earthContainer.style.transform  = 'translate(-50%,-50%) rotate(-44deg)';

    earth.classList.add('earth-glow');

    rotateBtn.textContent = '↩';
    rotateBtn.classList.add('facing');
  } else {
    crater.classList.remove('active');

    earthContainer.style.transition = 'transform 1.2s cubic-bezier(0.4,0,0.2,1)';
    earthContainer.style.transform  = 'translate(-50%,-50%) rotate(0deg)';

    rotateBtn.textContent = '🌍';
    rotateBtn.classList.remove('facing');
  }
});
a11yToggle.addEventListener('click', function() {
  bacteriumView.classList.toggle('high-contrast');
});

// ====== MULTI-LEVEL ZOOM-OUT TOGGLE ======
// Cycles: normal → 0.82 → 0.62 → 0.42 → normal
const zoomOutToggle = document.getElementById('zoom-out-toggle');
const bacteriumStage = document.querySelector('.bacterium-stage');
let _zoomLevel = 0; // 0 = normal, 1..3 = zoomed out levels
const _zoomLevels = [0, 1, 2, 3]; // cycles through these
const _zoomLabels = ['&#8722;', '&#8722;', '&#8722;', '&#43;'];
const _zoomTitles = ['Zoom Out', 'Zoom Out More', 'Zoom Out More', 'Zoom In (Reset)'];

zoomOutToggle.addEventListener('click', function() {
  // Remove all zoom-level classes
  bacteriumStage.classList.remove('zoomed-out', 'zoom-level-1', 'zoom-level-2', 'zoom-level-3');
  // Advance level
  _zoomLevel = (_zoomLevel + 1) % 4;
  if (_zoomLevel > 0) {
    bacteriumStage.classList.add('zoom-level-' + _zoomLevel);
  }
  const isZoomed = _zoomLevel > 0;
  zoomOutToggle.classList.toggle('active', isZoomed);
  zoomOutToggle.innerHTML = _zoomLabels[_zoomLevel];
  zoomOutToggle.title = _zoomTitles[_zoomLevel];
});


// ====== CLICKABLE LABEL DOTS → INFO CARD ======
const labelContainers = document.querySelectorAll('.label-container');

// Structure highlight map: data-label → CSS selector of the element to highlight
const structureHighlightMap = {
  nucleoid:  '.nucleoid',
  ribosome:  '.ribosome',
  cellwall:  '#bacterium',
  membrane:  '#bacterium',
  cytoplasm: '#bacterium',
  plasmid:   '.plasmid-ring',
  flagella:  '.flagellum-path, .flagellum-hook, .flagellum-path-tip',
  pili:      null
};

function highlightStructure(label) {
  const sel = structureHighlightMap[label];
  if (!sel) return;
  const els = document.querySelectorAll(sel);
  els.forEach(function(el) {
    el.style.transition = 'filter 0.25s ease, opacity 0.25s ease';
    el.style.filter = 'brightness(2) drop-shadow(0 0 6px rgba(220,195,80,0.8))';
    setTimeout(function() {
      el.style.filter = '';
    }, 1200);
  });
  // Plasmid: briefly spin rings faster
  if (label === 'plasmid') {
    document.querySelectorAll('.plasmid-ring').forEach(function(r) {
      r.style.animationDuration = '1.5s';
      setTimeout(function() { r.style.animationDuration = ''; }, 1400);
    });
  }
  // Nucleoid: trigger replication fork
  if (label === 'nucleoid') {
    const fork = document.getElementById('replication-fork');
    if (fork) { fork.classList.add('active'); setTimeout(function() { fork.classList.remove('active'); }, 2000); }
  }
  // Pili: flash them
  if (label === 'pili') {
    document.querySelectorAll('.pili').forEach(function(p) {
      p.style.transition = 'opacity 0.2s';
      p.style.opacity = '1';
      p.style.filter = 'drop-shadow(0 0 4px rgba(160,220,255,0.8))';
      setTimeout(function() { p.style.filter = ''; p.style.opacity = ''; }, 1200);
    });
  }
  // Flagellum speed burst — accelerate wave propagation on SVG paths
  if (label === 'flagella') {
    document.querySelectorAll('.flagellum-path, .flagellum-path-ghost, .flagellum-path-tip').forEach(function(p) {
      p.style.animationDuration = '0.45s';
      setTimeout(function() { p.style.animationDuration = ''; }, 1400);
    });
    // Also highlight the whole wrap
    const wrap = document.getElementById('flagellum');
    if (wrap) {
      wrap.style.transition = 'filter 0.25s ease';
      wrap.style.filter = 'brightness(1.6) drop-shadow(0 0 4px rgba(220,195,80,0.6))';
      setTimeout(function() { wrap.style.filter = ''; }, 1200);
    }
  }
}

labelContainers.forEach(function(container) {
  container.addEventListener('click', function(e) {
    e.stopPropagation();
    const wasActive = container.classList.contains('active');

    // Close all others
    labelContainers.forEach(function(c) { c.classList.remove('active'); });
    hideInfoCard();

    if (!wasActive) {
      container.classList.add('active');
      const dot = container.querySelector('.label-dot');
      showInfoCard(container, dot);
      highlightStructure(container.dataset.label);
    }
  });
});

// ====== UNIFIED BACTERIUM VIEW CLICK (merged to avoid duplicate handler conflict) ======
bacteriumView.addEventListener('click', function(e) {
  const isLabel = e.target.closest('.label-container');
  const isCard  = e.target.closest('#hotspot-info-card');
  if (!isLabel && !isCard) {
    labelContainers.forEach(function(c) { c.classList.remove('active'); });
    hideInfoCard();
    if (tourActive) {
      tourIndex++;
      showTourStep();
    }
  }
});
// ====== STORY STEPPER ======
const stepperDots = document.querySelectorAll('.stepper-dot');
function setStep(n) {
  stepperDots.forEach(function(d, i) {
    d.classList.toggle('active', i === n);
  });
}

// ====== EM GRAIN NOISE ======
(function() {
  var gc = document.getElementById('em-grain-canvas');
  var gCtx = gc.getContext('2d');
  // Down-sample: draw noise at 1/3 resolution then stretch — cheaper & grainier
  var SCALE = 4;
  var lastFrame = 0;
  var FPS = 8;
  var frameDur = 1000 / FPS;
  var animId = null;
  var running = false;

  function resizeGrain() {
    gc.width  = window.innerWidth;
    gc.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeGrain);
  resizeGrain();

  function drawGrain(ts) {
    if (!running) return;
    animId = requestAnimationFrame(drawGrain);

    if (ts - lastFrame < frameDur) return;
    lastFrame = ts;

    var W = gc.width, H = gc.height;
    var nW = Math.ceil(W / SCALE);
    var nH = Math.ceil(H / SCALE);

    var imageData = gCtx.createImageData(nW, nH);
    var data = imageData.data;

    // Per-row luminance bias — subtle horizontal banding like a slow scan sweep
    var rowBias = new Float32Array(nH);
    for (var r = 0; r < nH; r++) {
      // Low-frequency sine for gentle scan-line structure
      rowBias[r] = Math.sin(r * 0.18 + Math.random() * 0.4) * 3;
    }

    for (var i = 0; i < nW * nH; i++) {
      var row = (i / nW) | 0;
      // Base noise: mostly near-mid grey (128) so overlay blend is neutral
      var v = 128 + (Math.random() * 36 - 18) + rowBias[row];
      v = v < 0 ? 0 : v > 255 ? 255 : v;
      var idx = i * 4;
      // Slight warm tint (higher red, lower blue) mimics tungsten/carbon target noise
      data[idx]     = v + 6  | 0;  // R
      data[idx + 1] = v      | 0;  // G
      data[idx + 2] = v - 10 | 0;  // B
      data[idx + 3] = 255;
    }

    // Draw small then stretch to full canvas
    var offscreen = document.createElement('canvas');
    offscreen.width = nW; offscreen.height = nH;
    offscreen.getContext('2d').putImageData(imageData, 0, 0);

    gCtx.clearRect(0, 0, W, H);
    gCtx.drawImage(offscreen, 0, 0, W, H);
  }

  // Only run while bacterium view is active (saves GPU when hidden)
  var bactView = document.getElementById('bacterium-view');
  var obs = new MutationObserver(function() {
    if (bactView.classList.contains('active')) {
      running = true;
      lastFrame = 0;
      requestAnimationFrame(drawGrain);
    } else {
      running = false;
      if (animId) { cancelAnimationFrame(animId); animId = null; }
    }
  });
  obs.observe(bactView, { attributes: true, attributeFilter: ['class'] });

  // Toggle button
  var grainBtn = document.getElementById('grain-toggle');
  grainBtn.addEventListener('click', function() {
    if (running) {
      // Turn off: stop loop, clear canvas, mark button inactive
      running = false;
      if (animId) { cancelAnimationFrame(animId); animId = null; }
      gCtx.clearRect(0, 0, gc.width, gc.height);
      grainBtn.classList.remove('grain-on');
    } else {
      // Turn on: only if bacterium view is active
      if (bactView.classList.contains('active')) {
        running = true;
        lastFrame = 0;
        animId = requestAnimationFrame(drawGrain);
      }
      grainBtn.classList.add('grain-on');
    }
  });
})();
