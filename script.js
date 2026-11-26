// ====== CANVAS SETUP ======
const starsCanvas = document.getElementById('stars-canvas');
const starsCtx = starsCanvas.getContext('2d');

function resizeCanvas() {
  starsCanvas.width = window.innerWidth;
  starsCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ====== STARS ======
const stars = Array.from({length: 220}, function() {
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

// ====== DARKFIELD MICROSCOPE BACKDROP (cell view) ======
// Deep blue-teal field with out-of-focus particles (bokeh), like a
// darkfield light microscope looking into hot-spring water.
(function() {
  const rc = document.getElementById('rock-canvas');
  const ctx = rc.getContext('2d');

  function seeded(seed) {
    let s = seed;
    return function() { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
  }

  function draw() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth, H = window.innerHeight;
    rc.width = W * dpr; rc.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rnd = seeded(7);

    // Base: illuminated centre falling off to deep navy
    const base = ctx.createRadialGradient(W * 0.5, H * 0.46, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
    base.addColorStop(0,    '#123446');
    base.addColorStop(0.35, '#0b2131');
    base.addColorStop(0.7,  '#06121c');
    base.addColorStop(1,    '#03070c');
    ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);

    // Warm glow from below: hydrothermal water
    const warm = ctx.createRadialGradient(W * 0.72, H * 1.05, 0, W * 0.72, H * 1.05, H * 0.8);
    warm.addColorStop(0, 'rgba(255,150,70,0.16)');
    warm.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = warm; ctx.fillRect(0, 0, W, H);

    // Bokeh: large soft discs (out of focus), then small sharper motes
    ctx.globalCompositeOperation = 'lighter';
    const n = Math.round((W * H) / 26000);
    for (let i = 0; i < n; i++) {
      const x = rnd() * W, y = rnd() * H;
      const big = rnd() < 0.35;
      const r = big ? 18 + rnd() * 46 : 1 + rnd() * 3.5;
      const warmTone = rnd() < 0.18;
      const a = big ? 0.025 + rnd() * 0.05 : 0.12 + rnd() * 0.3;
      const col = warmTone ? '255,190,130' : '140,210,235';
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(' + col + ',' + a + ')');
      g.addColorStop(big ? 0.75 : 0.4, 'rgba(' + col + ',' + (a * (big ? 0.8 : 0.4)) + ')');
      g.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    // Objective vignette
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }
  window.addEventListener('resize', draw);
  draw();
})();

// ====== DOM ELEMENTS ======
const originateBtn     = document.getElementById('originate-btn');
const loadStatus       = document.getElementById('load-status');
const rotateBtn        = document.getElementById('rotate-btn');
const zoomLens         = document.getElementById('zoom-lens');
const zoomSlider       = document.getElementById('zoom-slider');
const zsValue          = document.getElementById('zs-value');
const zoomSliderPanel  = document.getElementById('zoom-slider-panel');
const zoomHint         = document.getElementById('zoom-hint');
const lensMagLabel     = document.getElementById('lens-mag-label');
const lensCraterView   = document.getElementById('lens-crater-view');
const lensAsteroidView = document.getElementById('lens-asteroid-view');
const lensBacteriaView = document.getElementById('lens-bacteria-view');
const lensCanvas       = document.getElementById('lens-canvas');
const lensSmokeLayer   = document.getElementById('lens-smoke-layer');
const lensBacteriaTag  = document.getElementById('lens-bacteria-tag');
const smokeContainer   = document.getElementById('smoke-container');
const screenFlash      = document.getElementById('screen-flash');
const zoomOverlay      = document.getElementById('zoom-overlay');
const bacteriumView    = document.getElementById('bacterium-view');
const typewriter       = document.getElementById('typewriter');
const scaleBar         = document.getElementById('scale-bar');
const hudOverlay       = document.getElementById('hud-overlay');
const semOverlay       = document.getElementById('sem-overlay');
const a11yToggle       = document.getElementById('a11y-toggle');
const sceneEl          = document.getElementById('scene');

let impactOccurred = false;
let bacteriumTransitionFired = false;   // 50x transition fires once per session
let lensFollow = false;                  // lens tracks the 3D impact site

// ====== 3D READY ======
function on3DReady() {
  originateBtn.disabled = false;
  originateBtn.classList.remove('loading');
}
window.addEventListener('exodus3d-ready', on3DReady);
if (window.Exodus3D) window.Exodus3D.ready.then(on3DReady);

// ====== ASTEROID LAUNCH ======
originateBtn.addEventListener('click', function() {
  if (impactOccurred || !window.Exodus3D) return;
  impactOccurred = true;
  originateBtn.style.opacity = '0';
  originateBtn.style.pointerEvents = 'none';
  setStep(1);
  hudOverlay.classList.add('active');
  window.Exodus3D.launch({
    onImpact: impact
  });
});

function impact() {
  hudOverlay.classList.remove('active');

  // Full-screen flash and a shake of the whole scene
  screenFlash.classList.remove('go');
  void screenFlash.offsetWidth;
  screenFlash.classList.add('go');
  sceneEl.classList.add('quake');
  setTimeout(function() { sceneEl.classList.remove('quake'); }, 1400);

  // Earth button, then the zoom lens once the wave has travelled
  setTimeout(function() { rotateBtn.classList.add('visible'); }, 4600);
  setTimeout(showZoomLens, 4200);
}

// Called by scene3d.js every frame
window.ExodusFrame = function() {
  if (!lensFollow || !window.Exodus3D) return;
  const p = window.Exodus3D.getImpactScreen();
  if (!p) return;
  const half = 118;
  const x = Math.max(half, Math.min(window.innerWidth  - half, p.x));
  const y = Math.max(half, Math.min(window.innerHeight - half - 90, p.y));
  zoomLens.style.left = x + 'px';
  zoomLens.style.top  = y + 'px';
};

// ====== ZOOM LENS SYSTEM ======
let smokePuffInterval = null;

function showZoomLens() {
  setStep(2);
  lensFollow = true;
  window.ExodusFrame();
  zoomLens.classList.add('visible');
  zoomSliderPanel.classList.add('visible');
  zoomSlider.value = 1;
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
  zoomSlider.style.setProperty('--fill', ((val - 1) / 49 * 100) + '%');
  zsValue.textContent = Math.round(val) + 'x';

  lensMagLabel.textContent = val < 10 ? '1x' : val < 20 ? '10x' : val < 50 ? '20x' : '50x';

  document.querySelectorAll('.zoom-tick').forEach(function(t) {
    const tv = parseFloat(t.dataset.val);
    t.classList.toggle('active',
      (tv === 1  && val < 10) ||
      (tv === 10 && val >= 10 && val < 20) ||
      (tv === 20 && val >= 20 && val < 50) ||
      (tv === 50 && val >= 50)
    );
  });

  // Layer visibility: 10x crater (CSS), 20x burning rock (3D), 50x cell (3D)
  lensCraterView.classList.toggle('visible',   val >= 10);
  lensAsteroidView.classList.toggle('visible', val >= 20);
  lensBacteriaView.classList.toggle('visible', val >= 50);
  lensCanvas.classList.toggle('visible',       val >= 20);
  lensSmokeLayer.classList.toggle('visible',   val >= 20 && val < 50);
  lensBacteriaTag.classList.toggle('visible',  val >= 50);
  if (window.Exodus3D) {
    window.Exodus3D.setLensMode(val >= 50 ? 'cell' : val >= 20 ? 'rock' : 'none');
  }

  if (val >= 20 && val < 50) {
    if (!smokePuffInterval) {
      smokePuffInterval = setInterval(spawnSmokePuff, 400);
      spawnSmokePuff();
    }
  } else if (smokePuffInterval) {
    clearInterval(smokePuffInterval);
    smokePuffInterval = null;
  }

  const lensScale = 1 + (val / 50) * 0.5;
  zoomLens.style.transform = 'translate(-50%, -50%) scale(' + lensScale + ')';

  // At 50x — enter the 3D cell view (once per session)
  if (val >= 50 && !bacteriumTransitionFired) {
    bacteriumTransitionFired = true;
    zoomHint.textContent = 'Entering cell view...';
    setTimeout(function() {
      zoomLens.classList.remove('visible');
      zoomSliderPanel.classList.remove('visible');
      rotateBtn.classList.remove('visible');
      if (smokePuffInterval) { clearInterval(smokePuffInterval); smokePuffInterval = null; }
      lensFollow = false;

      zoomOverlay.classList.add('active');
      setTimeout(function() {
        sceneEl.style.display = 'none';
        bacteriumView.classList.add('active');
        setStep(3);
        const go = function() {
          window.Exodus3D.enterCell().then(function() {
            zoomOverlay.classList.remove('active');
            semOverlay.classList.add('active');
            typewriterText('Panspermia survivor detected: an archaeon. Archaea thrive in extreme heat, salt and acid. Drag to rotate, pinch to zoom, tap a dot to explore.');
            setTimeout(function() {
              scaleBar.classList.add('visible');
              window.Exodus3D.startTour();
            }, 2500);
          });
        };
        window.Exodus3D.allReady.then(go);
      }, 900);
    }, 800);
  }
}

zoomSlider.addEventListener('input', function() {
  updateLensView(parseFloat(this.value));
});

// Tap a stop to glide the slider to it
let _glide = null;
document.querySelectorAll('.zoom-tick').forEach(function(t) {
  t.addEventListener('click', function() {
    const target = parseFloat(t.dataset.val);
    cancelAnimationFrame(_glide);
    const from = parseFloat(zoomSlider.value), t0 = performance.now();
    (function step(now) {
      const k = Math.min(1, (now - t0) / 600), e = 1 - Math.pow(1 - k, 3);
      zoomSlider.value = from + (target - from) * e;
      updateLensView(parseFloat(zoomSlider.value));
      if (k < 1) _glide = requestAnimationFrame(step);
    })(t0);
  });
});

let _typeToken = 0;
function typewriterText(text) {
  const token = ++_typeToken;            // a newer call cancels the old one
  typewriter.innerHTML = '';
  let i = 0;
  const cursor = document.createElement('span');
  cursor.className = 'cursor';
  typewriter.appendChild(cursor);
  function type() {
    if (token !== _typeToken) return;
    if (i < text.length) {
      typewriter.insertBefore(document.createTextNode(text.charAt(i)), cursor);
      i++;
      setTimeout(type, 30 + Math.random() * 40);
    }
  }
  type();
}
window.typewriterText = typewriterText;

// ====== ROTATE TO IMPACT TOGGLE ======
let impactFacing = false;
rotateBtn.addEventListener('click', function() {
  impactFacing = !impactFacing;
  window.Exodus3D.faceImpact(impactFacing);
  rotateBtn.classList.toggle('facing', impactFacing);
  rotateBtn.querySelector('.fab-label').textContent = impactFacing ? 'Back' : 'Impact site';
});

// ====== CELL VIEW CONTROLS (MD3 toolbar) ======
a11yToggle.addEventListener('click', function(e) {
  e.stopPropagation();
  const on = bacteriumView.classList.toggle('high-contrast');
  a11yToggle.classList.toggle('selected', on);
  a11yToggle.setAttribute('aria-pressed', on);
  window.Exodus3D.cellContrast(on);
});
document.getElementById('zoom-in-btn').addEventListener('click', function(e) {
  e.stopPropagation(); window.Exodus3D.cellZoomBy(0.75);
});
document.getElementById('zoom-out-toggle').addEventListener('click', function(e) {
  e.stopPropagation(); window.Exodus3D.cellZoomBy(1.33);
});
document.getElementById('reset-view-btn').addEventListener('click', function(e) {
  e.stopPropagation(); window.Exodus3D.resetView();
});
document.getElementById('tour-btn').addEventListener('click', function(e) {
  e.stopPropagation(); window.Exodus3D.startTour();
});
document.getElementById('restart-toggle').addEventListener('click', function() { location.reload(); });

document.getElementById('card-close').addEventListener('click', function(e) {
  e.stopPropagation();
  window.Exodus3D.cellBackgroundTap();
});

// Tap on empty space: close the card, or move the tour on.
// Drags (rotate/zoom) are ignored so they do not skip tour steps.
let _downX = 0, _downY = 0;
bacteriumView.addEventListener('pointerdown', function(e) { _downX = e.clientX; _downY = e.clientY; });
bacteriumView.addEventListener('click', function(e) {
  if (e.target.closest('.label-container, #hotspot-info-card, .bact-icon-btn')) return;
  if (Math.abs(e.clientX - _downX) + Math.abs(e.clientY - _downY) > 6) return;
  window.Exodus3D.cellBackgroundTap();
});

// ====== © CREDITS CARD ======
const creditsModal = document.getElementById('credits-modal');
let _creditsReturn = null;
function openCredits(e) {
  if (e) e.stopPropagation();
  _creditsReturn = document.activeElement;
  creditsModal.hidden = false;
  requestAnimationFrame(function() { creditsModal.classList.add('open'); });
  document.getElementById('credits-close').focus({ focusVisible: false });
}
function closeCredits() {
  creditsModal.classList.remove('open');
  setTimeout(function() { creditsModal.hidden = true; }, 250);
  if (_creditsReturn && _creditsReturn.focus) _creditsReturn.focus();
}
document.getElementById('credits-btn').addEventListener('click', openCredits);
document.getElementById('credits-tb-btn').addEventListener('click', openCredits);
document.getElementById('credits-close').addEventListener('click', closeCredits);
creditsModal.addEventListener('click', function(e) { if (e.target === creditsModal) closeCredits(); });

// ====== KEYBOARD / CLICKER SHORTCUTS ======
// Space or Enter: launch · Arrows / PageUp/PageDown: zoom · E: impact site
// T: tour · 0: reset view · R: restart · Esc: close card
document.addEventListener('keydown', function(e) {
  if (!creditsModal.hidden) { if (e.key === 'Escape') closeCredits(); return; }
  if (e.target.closest && e.target.closest('input, textarea')) {
    if (e.target === zoomSlider && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return; // native slider keys
  }
  const inCell = bacteriumView.classList.contains('active');
  const k = e.key;
  if ((k === ' ' || k === 'Enter') && !impactOccurred && !originateBtn.disabled) { e.preventDefault(); originateBtn.click(); return; }
  if (k === 'r' || k === 'R') { location.reload(); return; }
  if (!inCell && zoomSliderPanel.classList.contains('visible')) {
    const stops = [1, 10, 20, 50];
    const v = parseFloat(zoomSlider.value);
    let next = null;
    if (k === 'ArrowRight' || k === 'ArrowUp' || k === 'PageDown') next = stops.find(function(s) { return s > v; });
    if (k === 'ArrowLeft' || k === 'ArrowDown' || k === 'PageUp') next = stops.slice().reverse().find(function(s) { return s < v; });
    if (next != null) {
      e.preventDefault();
      document.querySelector('.zoom-tick[data-val="' + next + '"]').click();
      return;
    }
  }
  if ((k === 'e' || k === 'E') && rotateBtn.classList.contains('visible')) { rotateBtn.click(); return; }
  if (inCell && window.Exodus3D) {
    if (k === 'ArrowUp' || k === '+' || k === '=' || k === 'PageUp') { e.preventDefault(); window.Exodus3D.cellZoomBy(0.75); }
    else if (k === 'ArrowDown' || k === '-' || k === 'PageDown') { e.preventDefault(); window.Exodus3D.cellZoomBy(1.33); }
    else if (k === 'ArrowRight' || k === 'ArrowLeft') { e.preventDefault(); window.Exodus3D.advanceTour() || window.Exodus3D.startTour(); }
    else if (k === 't' || k === 'T') window.Exodus3D.startTour();
    else if (k === '0') window.Exodus3D.resetView();
    else if (k === 'Escape') window.Exodus3D.cellBackgroundTap();
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
    if (bactView.classList.contains('active') && grainBtn.classList.contains('grain-on')) {
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
      grainBtn.classList.remove('grain-on'); grainBtn.classList.remove('selected');
    } else {
      // Turn on: only if bacterium view is active
      if (bactView.classList.contains('active')) {
        running = true;
        lastFrame = 0;
        animId = requestAnimationFrame(drawGrain);
      }
      grainBtn.classList.add('grain-on'); grainBtn.classList.add('selected');
    }
  });
})();

