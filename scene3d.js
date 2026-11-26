// ============================================================================
// EXODUS — 3D layer (three.js)
// Space scene (Earth, Moon, asteroid, impact wave), zoom-lens renders and the
// 3D cell viewer (Archaea).
// Exposes window.Exodus3D for the story logic in script.js.
// ============================================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const DPR = Math.min(window.devicePixelRatio || 1, 2);
const clock = new THREE.Clock();

// ---------------------------------------------------------------------------
// Model loading
// ---------------------------------------------------------------------------
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const MODEL_LIST = ['earth', 'asteroid', 'archaea', 'bonfire'];
const modelCache = {};
let loadedCount = 0;

// Models come from window.EXODUS_MODELS (base64, single-file build) when
// present, otherwise from the models/ folder.
function base64ToBuffer(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

function loadModel(name) {
  if (!modelCache[name]) {
    const embedded = window.EXODUS_MODELS && window.EXODUS_MODELS[name];
    const p = embedded
      ? loader.parseAsync(base64ToBuffer(embedded), '')
      : loader.loadAsync('models/' + name + '.glb');
    modelCache[name] = p.then(function (g) {
      loadedCount++;
      updateLoadStatus();
      return g.scene;
    }).catch(function (e) {
      showLoadError('Could not load models/' + name + '.glb', e);
      throw e;
    });
  }
  return modelCache[name];
}

function showLoadError(msg, e) {
  console.error(msg, e);
  const el = document.getElementById('load-status');
  if (!el) return;
  el.classList.remove('done');
  el.classList.add('error');
  el.textContent = msg + (location.protocol === 'file:' ? ' (open the page through a web server, not as a file)' : '');
}

function updateLoadStatus() {
  const el = document.getElementById('load-status');
  if (!el) return;
  el.textContent = 'Loading 3D models ' + loadedCount + '/' + MODEL_LIST.length;
  if (loadedCount >= MODEL_LIST.length) el.classList.add('done');
}

// Centre a model at the origin and scale its largest dimension to `size`.
function normalizeModel(obj, size) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const c = box.getCenter(new THREE.Vector3());
  const s = box.getSize(new THREE.Vector3());
  const k = size / Math.max(s.x, s.y, s.z);
  obj.position.sub(c);
  const pivot = new THREE.Group();
  pivot.add(obj);
  pivot.scale.setScalar(k);
  pivot.userData.norm = { center: c, k: k, maxDim: Math.max(s.x, s.y, s.z) };
  return pivot;
}

// ---------------------------------------------------------------------------
// Procedural textures
// ---------------------------------------------------------------------------
function makeGlowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.75)');
  grd.addColorStop(0.6, 'rgba(255,255,255,0.18)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function makeSmokeTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  for (let i = 0; i < 26; i++) {
    const x = 64 + (Math.random() - 0.5) * 50, y = 64 + (Math.random() - 0.5) * 50;
    const r = 18 + Math.random() * 26;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(255,255,255,0.22)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  // circular falloff so sprites never show square edges
  g.globalCompositeOperation = 'destination-in';
  const m = g.createRadialGradient(64, 64, 20, 64, 64, 64);
  m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = m; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function makeMoonTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#8d8a86'; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 9; i++) { // maria
    g.fillStyle = 'rgba(60,58,56,0.35)';
    g.beginPath(); g.ellipse(Math.random() * 512, 60 + Math.random() * 140, 30 + Math.random() * 60, 20 + Math.random() * 30, Math.random() * 3, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 260; i++) { // craters
    const x = Math.random() * 512, y = Math.random() * 256, r = 1 + Math.pow(Math.random(), 3) * 16;
    g.fillStyle = 'rgba(40,38,36,0.35)'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(210,205,200,0.25)'; g.lineWidth = Math.max(0.6, r * 0.18);
    g.beginPath(); g.arc(x - r * 0.12, y - r * 0.12, r, Math.PI * 0.9, Math.PI * 1.9); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function makeCraterGroundTexture() {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  const base = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  base.addColorStop(0, '#0a0402'); base.addColorStop(0.22, '#1d0d05');
  base.addColorStop(0.34, '#5a3a22'); base.addColorStop(0.42, '#3c2616');
  base.addColorStop(0.7, '#2a1a10'); base.addColorStop(1, '#120a06');
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 40; i++) { // ejecta rays
    const a = Math.random() * Math.PI * 2, l = S * (0.25 + Math.random() * 0.25);
    g.strokeStyle = 'rgba(15,8,4,' + (0.25 + Math.random() * 0.3) + ')';
    g.lineWidth = 2 + Math.random() * 6;
    g.beginPath(); g.moveTo(S / 2 + Math.cos(a) * S * 0.2, S / 2 + Math.sin(a) * S * 0.2);
    g.lineTo(S / 2 + Math.cos(a) * l, S / 2 + Math.sin(a) * l); g.stroke();
  }
  for (let i = 0; i < 900; i++) { // gravel
    const x = Math.random() * S, y = Math.random() * S, r = Math.random() * 3.2;
    const v = 30 + Math.random() * 70;
    g.fillStyle = 'rgba(' + (v + 20) + ',' + v + ',' + (v - 15) + ',0.55)';
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const glow = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S * 0.24);
  glow.addColorStop(0, 'rgba(255,90,20,0.22)'); glow.addColorStop(1, 'rgba(255,60,0,0)');
  g.fillStyle = glow; g.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const GLOW_TEX = makeGlowTexture();
const SMOKE_TEX = makeSmokeTexture();

// ---------------------------------------------------------------------------
// GPU particle pool (points with per-particle size and 3-stop colour ramp)
// ---------------------------------------------------------------------------
class Particles {
  constructor(max, tex, blending) {
    this.max = max; this.cursor = 0;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 4);
    this.size = new Float32Array(max);
    this.vel = new Float32Array(max * 3);
    this.age = new Float32Array(max);
    this.life = new Float32Array(max);
    this.s0 = new Float32Array(max); this.s1 = new Float32Array(max);
    this.c = new Float32Array(max * 12);
    this.drag = new Float32Array(max); this.grav = new Float32Array(max);
    this.kill = new Uint8Array(max);
    const geo = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.aPos);
    geo.setAttribute('aColor', this.aCol);
    geo.setAttribute('aSize', this.aSize);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: tex }, uScale: { value: 500 } },
      vertexShader: [
        'attribute float aSize; attribute vec4 aColor; varying vec4 vColor; uniform float uScale;',
        'void main(){ vColor=aColor; vec4 mv=modelViewMatrix*vec4(position,1.0);',
        ' gl_PointSize = aSize*uScale/max(0.001,-mv.z); gl_Position=projectionMatrix*mv; }'
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D uTex; varying vec4 vColor;',
        'void main(){ vec4 t=texture2D(uTex,gl_PointCoord); float a=vColor.a*t.a; if(a<0.003) discard;',
        ' gl_FragColor=vec4(vColor.rgb*t.rgb,a); }'
      ].join('\n'),
      transparent: true, depthWrite: false, blending: blending
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
  }
  // o: {p:Vector3, v:Vector3, life, s0, s1, c:[r,g,b,a x3], drag, grav, kill}
  emit(o) {
    const i = this.cursor; this.cursor = (this.cursor + 1) % this.max;
    this.pos[i * 3] = o.p.x; this.pos[i * 3 + 1] = o.p.y; this.pos[i * 3 + 2] = o.p.z;
    this.vel[i * 3] = o.v.x; this.vel[i * 3 + 1] = o.v.y; this.vel[i * 3 + 2] = o.v.z;
    this.age[i] = 0; this.life[i] = o.life; this.s0[i] = o.s0; this.s1[i] = o.s1;
    for (let k = 0; k < 12; k++) this.c[i * 12 + k] = o.c[k];
    this.drag[i] = o.drag || 0; this.grav[i] = o.grav || 0; this.kill[i] = o.kill ? 1 : 0;
  }
  update(dt) {
    const P = this.pos, V = this.vel;
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) { this.size[i] = 0; this.col[i * 4 + 3] = 0; continue; }
      this.age[i] += dt;
      const t = this.age[i] / this.life[i];
      if (t >= 1) { this.life[i] = 0; this.size[i] = 0; this.col[i * 4 + 3] = 0; continue; }
      const dr = Math.exp(-this.drag[i] * dt);
      let vx = V[i * 3] * dr, vy = V[i * 3 + 1] * dr, vz = V[i * 3 + 2] * dr;
      let px = P[i * 3], py = P[i * 3 + 1], pz = P[i * 3 + 2];
      if (this.grav[i]) { // pull towards Earth centre (origin of the earth root)
        const dx = px - EARTH_CENTER.x, dy = py - EARTH_CENTER.y, dz = pz - EARTH_CENTER.z;
        const L = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        vx -= dx / L * this.grav[i] * dt; vy -= dy / L * this.grav[i] * dt; vz -= dz / L * this.grav[i] * dt;
        if (this.kill[i] && L < EARTH_R * 0.995) { this.life[i] = 0; this.size[i] = 0; this.col[i * 4 + 3] = 0; continue; }
      }
      V[i * 3] = vx; V[i * 3 + 1] = vy; V[i * 3 + 2] = vz;
      P[i * 3] = px + vx * dt; P[i * 3 + 1] = py + vy * dt; P[i * 3 + 2] = pz + vz * dt;
      this.size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * t;
      const c = this.c, b = i * 12;
      let a, k;
      if (t < 0.3) { k = t / 0.3; a = 0; } else { k = (t - 0.3) / 0.7; a = 4; }
      for (let j = 0; j < 4; j++) this.col[i * 4 + j] = c[b + a + j] + (c[b + a + 4 + j] - c[b + a + j]) * k;
    }
    this.aPos.needsUpdate = true; this.aCol.needsUpdate = true; this.aSize.needsUpdate = true;
  }
}

// ---------------------------------------------------------------------------
// GLSL helpers
// ---------------------------------------------------------------------------
const GLSL_NOISE = [
  'float hash3(vec3 p){ p=fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }',
  'float vnoise(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);',
  ' return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),',
  '            mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z); }'
].join('\n');

const SHELL_VERT = [
  'varying vec3 vP; varying vec3 vN; varying vec3 vView;',
  'void main(){ vP=position; vN=normalize(normalMatrix*normal);',
  ' vec4 mv=modelViewMatrix*vec4(position,1.0); vView=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }'
].join('\n');

// Crater, ejecta rays and the surface shock waves that sweep round the globe.
const SURFACE_FRAG = [
  'uniform vec3 uImpact; uniform float uT;',
  'varying vec3 vP; varying vec3 vN; varying vec3 vView;',
  GLSL_NOISE,
  'void main(){',
  ' if(uT<0.0) discard;',
  ' vec3 p=normalize(vP);',
  ' float ang=acos(clamp(dot(p,uImpact),-1.0,1.0));',
  ' vec3 ref=abs(uImpact.y)<0.9?vec3(0.0,1.0,0.0):vec3(1.0,0.0,0.0);',
  ' vec3 t1=normalize(cross(uImpact,ref)); vec3 t2=cross(uImpact,t1);',
  ' float az=atan(dot(p,t2),dot(p,t1));',
  ' float n1=vnoise(p*38.0); float n2=vnoise(p*120.0+vec3(uT*0.7));',
  ' float appear=smoothstep(0.0,0.45,uT);',
  ' float CR=0.065;',
  ' float blanket=smoothstep(0.34,0.05,ang+(n1-0.5)*0.1);',
  ' float rays=pow(abs(sin(az*6.0+n1*2.5)),5.0)*smoothstep(0.6,0.08,ang)*smoothstep(CR,CR*1.6,ang);',
  ' float dark=clamp(blanket*0.72+rays*0.45,0.0,0.86)*appear;',
  ' float bowl=smoothstep(CR*1.04,CR*0.55,ang)*appear;',
  ' dark=max(dark,bowl*0.96);',
  ' float heat=0.3+0.7*exp(-uT*0.16);',
  ' float rim=exp(-pow((ang-CR)/0.016,2.0))*(0.55+0.45*n2);',
  ' float molten=bowl*smoothstep(0.3,0.85,n2);',
  ' float cracks=smoothstep(0.07,0.0,abs(n1-0.5))*smoothstep(0.24,0.07,ang)*0.9;',
  ' float glow=(rim*1.3+molten*1.4+cracks)*heat*appear;',
  ' float wave=0.0; float hot=0.0;',
  ' for(int i=0;i<4;i++){',
  '  float fi=float(i); float tt=uT-fi*0.42;',
  '  if(tt<0.0) continue;',
  '  float front=CR+tt*0.95;',
  '  float w=0.035+tt*0.03;',
  '  float d=ang-front;',
  '  float ring=exp(-d*d/(w*w));',
  '  float wake=smoothstep(0.0,-0.25,d)*smoothstep(-0.7,-0.15,d)*0.22*n1;',
  '  float fade=exp(-tt*0.36)*(1.0-smoothstep(2.5,3.12,front));',
  '  float k=(1.0-fi*0.2)*fade;',
  '  wave+=(ring*(0.85+0.3*n1)+wake)*k;',
  '  if(i==0) hot=ring*fade;',
  ' }',
  ' vec3 waveCol=mix(vec3(0.55,0.85,1.0),vec3(1.0,0.62,0.22),clamp(hot*1.4,0.0,1.0));',
  ' vec3 lava=vec3(1.0,0.36,0.06);',
  ' float ga=clamp(glow+wave,0.0,1.0);',
  ' vec3 col=vec3(0.05,0.025,0.012)*(1.0-ga)+lava*glow+waveCol*wave*2.2;',
  ' gl_FragColor=vec4(col,max(dark,ga));',
  '}'
].join('\n');

// Air blast running through the atmosphere + fireball glow.
const AIR_FRAG = [
  'uniform vec3 uImpact; uniform float uT;',
  'varying vec3 vP; varying vec3 vN; varying vec3 vView;',
  'void main(){',
  ' if(uT<0.0) discard;',
  ' vec3 p=normalize(vP);',
  ' float ang=acos(clamp(dot(p,uImpact),-1.0,1.0));',
  ' float fr=pow(1.0-abs(dot(normalize(vN),normalize(vView))),1.6);',
  ' float c=0.0;',
  ' for(int i=0;i<2;i++){',
  '  float tt=uT-float(i)*0.6; if(tt<0.0) continue;',
  '  float front=0.06+tt*1.35; float d=ang-front; float w=0.07+tt*0.02;',
  '  c+=exp(-d*d/(w*w))*exp(-tt*0.5)*(1.0-smoothstep(2.6,3.12,front))*(1.0-float(i)*0.4);',
  ' }',
  ' float fire=exp(-uT*1.1)*smoothstep(0.75,0.0,ang);',
  ' vec3 col=vec3(0.75,0.88,1.0)*c*(0.45+fr*1.4)+vec3(1.0,0.5,0.15)*fire*(0.6+fr);',
  ' gl_FragColor=vec4(col,1.0);',
  '}'
].join('\n');

const RING_FRAG = [
  'uniform vec3 uColor; uniform float uAlpha; uniform float uThick; uniform float uSeed;',
  'varying vec2 vUv;',
  'void main(){',
  ' vec2 q=vUv-0.5; float r=length(q)*2.0; float a=atan(q.y,q.x);',
  ' r+=(0.012*sin(a*11.0+uSeed)+0.007*sin(a*23.0-uSeed*2.0))*(0.4+uThick*3.0);',
  ' float ring=exp(-pow((r-0.9)/uThick,2.0));',
  ' float fill=smoothstep(0.9,0.2,r)*0.12;',
  ' float al=(ring+fill)*uAlpha*smoothstep(1.0,0.96,r);',
  ' gl_FragColor=vec4(uColor*al,al);',
  '}'
].join('\n');

const RING_VERT = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }';

// ===========================================================================
// SPACE SCENE
// ===========================================================================
const EARTH_R = 1;
const EARTH_CENTER = new THREE.Vector3();
const space = {};

function initSpace(earthModel, asteroidModel) {
  const canvas = document.getElementById('space-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(DPR);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.setClearColor(0x000000, 0);
  space.renderer = renderer;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 200);
  space.scene = scene; space.camera = camera;

  // Sunlight from the upper left
  space.sunDir = new THREE.Vector3(-0.75, 0.42, 0.52).normalize();
  const sun = new THREE.DirectionalLight(0xfff4e6, 4.2);
  sun.position.copy(space.sunDir).multiplyScalar(20);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x3a4a66, 0.35));

  // Earth hierarchy: root (turn-to-impact) > tilt (axial tilt) > spin (daily rotation)
  const root = new THREE.Group(); scene.add(root);
  const tilt = new THREE.Group(); tilt.rotation.z = 0.41; root.add(tilt);
  const spin = new THREE.Group(); tilt.add(spin);
  space.root = root; space.tilt = tilt; space.spin = spin;
  space.spinSpeed = 0.06;

  // Earth model (normalised to radius 1). The cloud layer is taken out before
  // measuring and rebuilt on our own sphere so it can drift independently.
  let cloudMat = null;
  const cloudMeshes = [];
  earthModel.traverse(function (o) {
    if (o.isMesh && (/cloud/i.test(o.name) || /62/.test(o.material.name))) { cloudMat = o.material; cloudMeshes.push(o); }
  });
  cloudMeshes.forEach(function (o) { o.parent.remove(o); });
  const earthPivot = normalizeModel(earthModel, 2 * EARTH_R);
  const sunView = new THREE.Vector3();
  space.sunView = sunView;
  earthPivot.traverse(function (o) {
    if (!o.isMesh) return;
    const m = o.material;
    m.metalness = 0;            // no environment map: metallic oceans would render black
    m.roughness = 0.85;
    m.emissiveIntensity = 1.4;
    // City lights only on the night side
    m.onBeforeCompile = function (sh) {
      sh.uniforms.uSunView = { value: sunView };
      sh.fragmentShader = 'uniform vec3 uSunView;\n' + sh.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n totalEmissiveRadiance *= smoothstep(0.12, -0.3, dot(normal, uSunView));'
      );
    };
  });
  spin.add(earthPivot);

  if (cloudMat) {
    const cm = new THREE.MeshStandardMaterial({
      map: cloudMat.map, alphaMap: null, transparent: true, depthWrite: false,
      roughness: 1, metalness: 0, opacity: 0.9
    });
    const clouds = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R * 1.012, 96, 64), cm);
    clouds.rotation.y = 0.6;
    spin.add(clouds);
    space.clouds = clouds;
  }

  // Atmosphere rim glow
  const atmoMat = new THREE.ShaderMaterial({
    uniforms: { uSun: { value: space.sunDir }, uBoost: { value: 0 } },
    vertexShader: [
      'varying vec3 vN; varying vec3 vWN;',
      'void main(){ vN=normalize(normalMatrix*normal); vWN=normalize(mat3(modelMatrix)*normal);',
      ' gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }'
    ].join('\n'),
    fragmentShader: [
      'uniform vec3 uSun; uniform float uBoost; varying vec3 vN; varying vec3 vWN;',
      'void main(){ float i=pow(clamp(0.6-dot(vN,vec3(0.0,0.0,1.0)),0.0,1.0),5.0);',
      ' float day=0.08+0.92*smoothstep(-0.2,0.6,dot(-vWN,uSun));',
      ' vec3 c=mix(vec3(0.35,0.62,1.0),vec3(1.0,0.55,0.2),clamp(uBoost,0.0,1.0));',
      ' gl_FragColor=vec4(c*i*(day*0.55+uBoost*1.5),1.0); }'
    ].join('\n'),
    side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false
  });
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R * 1.025, 64, 48), atmoMat);
  root.add(atmo);
  space.atmoMat = atmoMat;

  // Impact shells (children of spin so they stick to the surface)
  space.impactLocal = new THREE.Vector3(0, 0, 1);
  space.surfaceMat = new THREE.ShaderMaterial({
    uniforms: { uImpact: { value: space.impactLocal }, uT: { value: -1 } },
    vertexShader: SHELL_VERT, fragmentShader: SURFACE_FRAG,
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2
  });
  spin.add(new THREE.Mesh(new THREE.SphereGeometry(EARTH_R * 1.004, 160, 120), space.surfaceMat));
  space.airMat = new THREE.ShaderMaterial({
    uniforms: { uImpact: { value: space.impactLocal }, uT: { value: -1 } },
    vertexShader: SHELL_VERT, fragmentShader: AIR_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  spin.add(new THREE.Mesh(new THREE.SphereGeometry(EARTH_R * 1.045, 128, 96), space.airMat));

  // Moon
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 48, 32),
    new THREE.MeshStandardMaterial({ map: makeMoonTexture(), roughness: 1, metalness: 0 })
  );
  const moonOrbit = new THREE.Group(); moonOrbit.rotation.x = 0.32; moonOrbit.rotation.z = -0.12;
  moonOrbit.add(moon); root.add(moonOrbit);
  space.moon = moon; space.moonOrbit = moonOrbit; space.moonAngle = 2.2;

  // Asteroid
  const ast = normalizeModel(asteroidModel, 0.27);
  ast.traverse(function (o) {
    if (o.isMesh && o.material) { o.material.emissiveIntensity = 2.2; }
  });
  const astHolder = new THREE.Group(); astHolder.add(ast); astHolder.visible = false;
  scene.add(astHolder);
  space.asteroid = astHolder;
  const astGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: GLOW_TEX, color: 0xff7a2a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85
  }));
  astGlow.scale.setScalar(0.42); astHolder.add(astGlow);
  space.astGlow = astGlow;

  // Particle systems
  space.fire = new Particles(1400, GLOW_TEX, THREE.AdditiveBlending);
  space.smoke = new Particles(260, SMOKE_TEX, THREE.NormalBlending);
  scene.add(space.smoke.points); scene.add(space.fire.points);

  // Space shock rings + flash
  space.rings = [];
  space.flash = new THREE.Sprite(new THREE.SpriteMaterial({
    map: GLOW_TEX, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, opacity: 0
  }));
  scene.add(space.flash);

  space.impactT = -1;
  space.shake = 0;
  space.faceAnim = null;
  space.baseCam = new THREE.Vector3();
  resizeSpace();
  window.addEventListener('resize', resizeSpace);
}

function resizeSpace() {
  if (!space.renderer) return;
  const W = window.innerWidth, H = window.innerHeight;
  space.renderer.setSize(W, H, false);
  const cam = space.camera;
  cam.aspect = W / H; cam.updateProjectionMatrix();
  const tanH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
  const diam = Math.max(170, Math.min(W * 0.62, H * 0.42, 520));
  const d = EARTH_R * H / (diam * tanH);
  space.baseCam.set(0, 0, d);
  cam.position.copy(space.baseCam);
  cam.lookAt(0, 0, 0);
  // Push Earth slightly below centre so the title card has room
  const worldPerPx = 2 * d * tanH / H;
  space.root.position.y = -H * 0.05 * worldPerPx;
  EARTH_CENTER.copy(space.root.position);
  space.fire.mat.uniforms.uScale.value = H * DPR / (2 * tanH);
  space.smoke.mat.uniforms.uScale.value = H * DPR / (2 * tanH);
  // Moon orbit sized to stay on screen
  space.moonR = Math.min(2.7, (W / H) * d * tanH * 0.82);
}

// ---- Launch -----------------------------------------------------------------
const flight = { active: false };

function launch(callbacks) {
  const cam = space.camera;
  // Start point: off the top-right of the screen
  const ndc = new THREE.Vector3(1.15, 1.1, 0.5).unproject(cam);
  const dir = ndc.sub(cam.position).normalize();
  const start = cam.position.clone().add(dir.multiplyScalar(cam.position.z * 0.72));
  // Target: upper-right of the visible hemisphere
  const n = new THREE.Vector3(0.52, 0.4, 0.75).normalize();
  const target = EARTH_CENTER.clone().add(n.clone().multiplyScalar(EARTH_R));
  const ctrl = start.clone().lerp(target, 0.5).add(new THREE.Vector3(0.35, 0.55, 0.2));
  space.asteroid.position.copy(start);
  space.asteroid.visible = true;
  space.spinSpeed = 0.025;
  Object.assign(flight, {
    active: true, t: 0, dur: 2.8, start: start, ctrl: ctrl, target: target,
    spinAxis: new THREE.Vector3(0.3, 1, 0.2).normalize(), cb: callbacks || {}, entry: false
  });
}

function bezier(a, b, c, t, out) {
  const u = 1 - t;
  return out.set(
    u * u * a.x + 2 * u * t * b.x + t * t * c.x,
    u * u * a.y + 2 * u * t * b.y + t * t * c.y,
    u * u * a.z + 2 * u * t * b.z + t * t * c.z
  );
}

const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();

function rnd(a, b) { return a + Math.random() * (b - a); }

function updateFlight(dt) {
  if (!flight.active) return;
  flight.t += dt / flight.dur;
  const t = Math.min(1, flight.t);
  const e = Math.pow(t, 1.55);           // accelerating fall
  const prev = space.asteroid.position.clone();
  bezier(flight.start, flight.ctrl, flight.target, e, space.asteroid.position);
  space.asteroid.rotateOnAxis(flight.spinAxis, dt * 3.2);
  const vel = _v1.copy(space.asteroid.position).sub(prev).divideScalar(Math.max(dt, 1e-4));
  const speed = vel.length();
  const back = vel.clone().normalize().multiplyScalar(-1);

  // Atmospheric entry
  const distToSurface = space.asteroid.position.distanceTo(EARTH_CENTER) - EARTH_R;
  if (!flight.entry && distToSurface < 0.55) { flight.entry = true; flight.cb.onEntry && flight.cb.onEntry(); }
  const heat = THREE.MathUtils.clamp(1 - distToSurface / 0.6, 0, 1);
  space.astGlow.scale.setScalar(0.42 + heat * 0.55 + Math.sin(performance.now() * 0.03) * 0.03);
  space.astGlow.material.color.setRGB(1, 0.45 + heat * 0.4, 0.15 + heat * 0.45);
  space.atmoMat.uniforms.uBoost.value = heat * 0.25;

  // Comet trail
  const n = 7 + Math.round(heat * 10);
  for (let i = 0; i < n; i++) {
    const f = Math.random();
    const p = _v2.copy(prev).lerp(space.asteroid.position, f).add(
      _v3.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(0.025));
    space.fire.emit({
      p: p, v: back.clone().multiplyScalar(speed * rnd(0.02, 0.12)).add(_v3.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(0.04)),
      life: rnd(0.45, 0.95), s0: rnd(0.1, 0.16) * (1 + heat), s1: 0.01, drag: 1.5,
      c: [1, 1, 0.85, 1, 1, 0.55, 0.15, 0.85, 0.5, 0.08, 0.02, 0]
    });
  }
  if (Math.random() < 0.5) {
    space.smoke.emit({
      p: prev.clone(), v: back.clone().multiplyScalar(speed * 0.03), life: rnd(0.9, 1.6),
      s0: 0.06, s1: 0.22, drag: 1, c: [0.35, 0.3, 0.28, 0.0, 0.3, 0.26, 0.24, 0.28, 0.2, 0.18, 0.17, 0]
    });
  }

  if (t >= 1) {
    flight.active = false;
    space.asteroid.visible = false;
    impact(flight.target.clone());
    flight.cb.onImpact && flight.cb.onImpact();
  }
}

// ---- Impact -----------------------------------------------------------------
function impact(worldPoint) {
  // Store impact in Earth-surface coordinates so the crater rides with the globe
  const local = space.spin.worldToLocal(worldPoint.clone());
  space.impactLocal.copy(local.normalize());
  space.impactT = 0;
  space.spinSpeed = 0;
  space.shake = 1;
  space.emitTimer = 0;

  const nW = worldPoint.clone().sub(EARTH_CENTER).normalize();
  space.impactWorld = worldPoint.clone();
  space.impactNormal = nW.clone();

  // Flash
  space.flash.position.copy(worldPoint).addScaledVector(nW, 0.05);
  space.flashT = 0;

  // Shock rings in space: tangent to the surface at the impact point
  const ringSpecs = [
    { color: [1.0, 0.85, 0.6], to: 3.0, dur: 1.8, thick: 0.05, alpha: 1.2, delay: 0 },
    { color: [1.0, 0.45, 0.12], to: 2.2, dur: 3.0, thick: 0.16, alpha: 0.9, delay: 0.1 },
    { color: [0.55, 0.75, 1.0], to: 4.2, dur: 2.8, thick: 0.03, alpha: 0.55, delay: 0.25 },
    { color: [0.9, 0.6, 0.35], to: 1.6, dur: 3.6, thick: 0.3, alpha: 0.5, delay: 0.45 }
  ];
  ringSpecs.forEach(function (s, i) {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Vector3().fromArray(s.color) }, uAlpha: { value: 0 },
        uThick: { value: s.thick }, uSeed: { value: Math.random() * 6.28 }
      },
      vertexShader: RING_VERT, fragmentShader: RING_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    m.position.copy(worldPoint).addScaledVector(nW, 0.01 + i * 0.004);
    m.lookAt(m.position.clone().add(nW));
    m.scale.setScalar(0.001);
    space.scene.add(m);
    space.rings.push({ mesh: m, spec: s, t: -s.delay });
  });

  // Ejecta, fireball, debris
  const t1 = new THREE.Vector3().crossVectors(nW, Math.abs(nW.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize();
  const t2 = new THREE.Vector3().crossVectors(nW, t1);
  space.basis = { n: nW, t1: t1, t2: t2 };
  for (let i = 0; i < 520; i++) {
    const th = rnd(0.15, 1.25), ph = rnd(0, Math.PI * 2);
    const dir = nW.clone().multiplyScalar(Math.cos(th))
      .addScaledVector(t1, Math.sin(th) * Math.cos(ph)).addScaledVector(t2, Math.sin(th) * Math.sin(ph));
    space.fire.emit({
      p: worldPoint.clone().addScaledVector(nW, 0.01), v: dir.multiplyScalar(rnd(0.4, 2.3)),
      life: rnd(1.1, 2.8), s0: rnd(0.025, 0.06), s1: 0.008, drag: 0.35, grav: 1.5, kill: true,
      c: [1, 1, 0.9, 1, 1, 0.55, 0.12, 0.95, 0.45, 0.07, 0.02, 0]
    });
  }
  for (let i = 0; i < 90; i++) { // fireball
    const dir = nW.clone().addScaledVector(t1, rnd(-0.6, 0.6)).addScaledVector(t2, rnd(-0.6, 0.6)).normalize();
    space.fire.emit({
      p: worldPoint.clone(), v: dir.multiplyScalar(rnd(0.15, 0.85)), life: rnd(0.8, 1.7),
      s0: rnd(0.12, 0.22), s1: rnd(0.35, 0.6), drag: 1.6,
      c: [1, 0.95, 0.8, 1, 1, 0.5, 0.12, 0.7, 0.4, 0.05, 0.02, 0]
    });
  }
}

function updateImpact(dt) {
  if (space.impactT < 0) return;
  space.impactT += dt;
  const T = space.impactT;
  space.surfaceMat.uniforms.uT.value = T;
  space.airMat.uniforms.uT.value = T;
  space.atmoMat.uniforms.uBoost.value = Math.max(0, 1.1 * Math.exp(-T * 1.2) - 0.05);

  // Flash sprite
  if (space.flashT !== undefined && space.flashT < 1.2) {
    space.flashT += dt;
    const f = space.flashT;
    space.flash.material.opacity = Math.max(0, 1 - f / 0.9);
    space.flash.scale.setScalar(0.2 + Math.min(1, f / 0.25) * 2.4);
    space.flash.material.color.setRGB(1, 0.9 - f * 0.4, 0.75 - f * 0.6);
  }

  // Rings
  for (let i = space.rings.length - 1; i >= 0; i--) {
    const r = space.rings[i];
    r.t += dt;
    if (r.t < 0) continue;
    const k = r.t / r.spec.dur;
    if (k >= 1) { space.scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); space.rings.splice(i, 1); continue; }
    const ease = 1 - Math.pow(1 - k, 2.4);
    r.mesh.scale.setScalar(0.05 + ease * r.spec.to);
    r.mesh.material.uniforms.uAlpha.value = r.spec.alpha * Math.min(1, k * 8) * Math.pow(1 - k, 1.3);
  }

  // Lingering plume and embers
  space.emitTimer += dt;
  if (T < 7 && space.emitTimer > 0.05) {
    space.emitTimer = 0;
    const b = space.basis, P = space.impactWorld;
    const strength = Math.exp(-T * 0.35);
    for (let i = 0; i < 2; i++) {
      const dir = b.n.clone().addScaledVector(b.t1, rnd(-0.35, 0.35)).addScaledVector(b.t2, rnd(-0.35, 0.35)).normalize();
      space.smoke.emit({
        p: P.clone().addScaledVector(b.n, 0.02), v: dir.multiplyScalar(rnd(0.12, 0.42) * (0.5 + strength)),
        life: rnd(2.5, 5), s0: rnd(0.08, 0.14), s1: rnd(0.4, 0.75), drag: 0.6,
        c: [0.25, 0.18, 0.14, 0.15, 0.22, 0.18, 0.16, 0.55 * (0.4 + strength), 0.15, 0.14, 0.14, 0]
      });
    }
    if (Math.random() < strength + 0.2) {
      space.fire.emit({
        p: P.clone().addScaledVector(b.t1, rnd(-0.04, 0.04)).addScaledVector(b.t2, rnd(-0.04, 0.04)),
        v: b.n.clone().multiplyScalar(rnd(0.05, 0.25)), life: rnd(0.5, 1.1), s0: rnd(0.05, 0.1), s1: 0.02, drag: 1,
        c: [1, 0.85, 0.5, 0.9, 1, 0.4, 0.08, 0.7, 0.4, 0.05, 0.01, 0]
      });
    }
  }

  // Screen shake decays
  space.shake = Math.max(0, space.shake - dt * 0.55);
}

// ---- Turn Earth so the impact site faces the viewer --------------------------
function faceImpact(on) {
  if (space.impactT < 0) return;
  const from = space.root.quaternion.clone();
  let to;
  if (on) {
    if (!space.homeQ) space.homeQ = space.root.quaternion.clone();
    space.root.updateMatrixWorld(true);
    const dW = space.spin.localToWorld(space.impactLocal.clone()).sub(EARTH_CENTER).normalize();
    const toCam = space.camera.position.clone().sub(EARTH_CENTER).normalize();
    // Aim slightly up-right of centre so the lens does not cover the whole globe
    toCam.add(new THREE.Vector3(0.18, 0.12, 0)).normalize();
    to = new THREE.Quaternion().setFromUnitVectors(dW, toCam).multiply(from);
  } else {
    to = (space.homeQ || new THREE.Quaternion()).clone();
  }
  space.faceAnim = { from: from, to: to, t: 0, dur: 1.4 };
}

function updateFace(dt) {
  const a = space.faceAnim;
  if (!a) return;
  a.t += dt / a.dur;
  const k = Math.min(1, a.t);
  const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  space.root.quaternion.slerpQuaternions(a.from, a.to, e);
  if (k >= 1) space.faceAnim = null;
}

function getImpactScreen() {
  if (space.impactT < 0) return null;
  const p = space.spin.localToWorld(space.impactLocal.clone().multiplyScalar(EARTH_R));
  const n = p.clone().sub(EARTH_CENTER).normalize();
  const toCam = space.camera.position.clone().sub(p).normalize();
  const v = p.clone().project(space.camera);
  return {
    x: (v.x * 0.5 + 0.5) * window.innerWidth,
    y: (-v.y * 0.5 + 0.5) * window.innerHeight,
    visible: n.dot(toCam) > 0.05
  };
}

let spaceVisible = true;
function renderSpace(dt, time) {
  if (!space.renderer || !spaceVisible) return;
  space.spin.rotation.y += space.spinSpeed * dt;
  if (space.clouds) space.clouds.rotation.y += 0.008 * dt;

  space.moonAngle += dt * 0.12;
  space.moon.position.set(Math.cos(space.moonAngle) * space.moonR, 0, Math.sin(space.moonAngle) * space.moonR);
  space.moon.rotation.y = -space.moonAngle;

  updateFlight(dt);
  updateImpact(dt);
  updateFace(dt);
  space.fire.update(dt);
  space.smoke.update(dt);

  // Camera shake
  const s = space.shake * space.shake * 0.05;
  space.camera.position.set(
    space.baseCam.x + (Math.random() - 0.5) * s,
    space.baseCam.y + (Math.random() - 0.5) * s,
    space.baseCam.z * (1 - space.shake * 0.035)
  );
  space.camera.lookAt(0, 0, 0);

  space.sunView.copy(space.sunDir).transformDirection(space.camera.matrixWorldInverse);
  space.renderer.render(space.scene, space.camera);
}

// ===========================================================================
// LENS (20x burning rock, 50x first glimpse of the cell)
// ===========================================================================
const lens = { mode: 'none' };

function initLens(asteroidModel, bonfireModel, cellModel) {
  const canvas = document.getElementById('lens-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(DPR * 1.5);
  renderer.setSize(220, 220, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);
  lens.renderer = renderer;

  // --- Rock scene
  const rock = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(40, 1, 0.05, 50);
  cam.position.set(0, 2.1, 2.7); cam.lookAt(0, 0.25, 0);
  lens.rockCam = cam;
  rock.add(new THREE.AmbientLight(0x8a7a6a, 1.1));
  const rim = new THREE.DirectionalLight(0x99bbff, 0.8); rim.position.set(-3, 3, -2); rock.add(rim);
  const key = new THREE.DirectionalLight(0xffe2c0, 2.6); key.position.set(-2, 4, 3); rock.add(key);
  const fireLight = new THREE.PointLight(0xff7a2a, 2.2, 4, 2); fireLight.position.set(0, 1.4, 0.2); rock.add(fireLight);
  lens.fireLight = fireLight;

  const ground = new THREE.Mesh(new THREE.CircleGeometry(3.4, 64),
    new THREE.MeshStandardMaterial({ map: makeCraterGroundTexture(), roughness: 1, metalness: 0 }));
  ground.rotation.x = -Math.PI / 2; rock.add(ground);

  const ast = normalizeModel(asteroidModel.clone(true), 1.05);
  ast.position.y = 0.3;
  ast.traverse(function (o) { if (o.isMesh) { o.material = o.material.clone(); o.material.emissiveIntensity = 2.4; } });
  rock.add(ast);
  lens.rock = ast;

  // Bonfire flames + glowing coals (the stone pit and logs are left out)
  lens.flames = [];
  const fires = [
    { x: -0.62, z: -0.25, s: 1.15, ry: 0 },
    { x: 0.6, z: -0.15, s: 0.95, ry: 1.7 },
    { x: 0.05, z: -0.6, s: 1.35, ry: 3.1 },
    { x: -0.25, z: 0.55, s: 0.6, ry: 4.4 }
  ];
  fires.forEach(function (f, idx) {
    const b = bonfireModel.clone(true);
    const remove = [];
    b.traverse(function (o) {
      if (!o.isMesh) return;
      const n = o.material.name;
      if (n === 'fire_01') {
        const src = o.material;
        o.material = new THREE.MeshBasicMaterial({
          map: src.emissiveMap || src.map, color: 0xffffff, transparent: true,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        });
        o.renderOrder = 5;
      } else if (n === 'coals') {
        o.material = o.material.clone(); o.material.emissiveIntensity = 0.9;
      } else {
        remove.push(o);
      }
    });
    remove.forEach(function (o) { o.parent.remove(o); });
    const piv = normalizeModel(b, 0.85 * f.s);
    piv.position.set(f.x, 0.36 * f.s, f.z);
    piv.rotation.y = f.ry;
    rock.add(piv);
    lens.flames.push({ obj: piv, base: piv.scale.x, phase: idx * 1.7 });
  });
  lens.rockScene = rock;

  // --- Cell scene
  const cell = new THREE.Scene();
  const ccam = new THREE.PerspectiveCamera(35, 1, 0.05, 50);
  ccam.position.set(0, 1.4, 2.6); ccam.lookAt(0, 0, 0);
  lens.cellCam = ccam;
  cell.add(new THREE.HemisphereLight(0xdfefff, 0x223344, 2.2));
  const k2 = new THREE.DirectionalLight(0xffffff, 1.5); k2.position.set(2, 3, 2); cell.add(k2);
  const lm = normalizeModel(cellModel.clone(true), 2.3);
  const lh = new THREE.Group(); lh.add(lm); cell.add(lh);
  lens.cellModel = lh;
  lens.cellScene = cell;
}

function setLensMode(mode) { lens.mode = mode; }

function renderLens(dt, time) {
  if (!lens.renderer || lens.mode === 'none') return;
  if (lens.mode === 'rock') {
    lens.rock.rotation.y += dt * 0.15;
    lens.flames.forEach(function (f) {
      const n = Math.sin(time * 9 + f.phase) * 0.06 + Math.sin(time * 23 + f.phase * 2) * 0.04;
      f.obj.scale.set(f.base * (1 - n * 0.5), f.base * (1 + n), f.base * (1 - n * 0.5));
      f.obj.rotation.y += dt * 0.6;
    });
    lens.fireLight.intensity = 2 + Math.sin(time * 13) * 0.5 + Math.random() * 0.5;
    lens.renderer.render(lens.rockScene, lens.rockCam);
  } else if (lens.mode === 'cell') {
    lens.cellModel.rotation.y += dt * 0.5;
    lens.renderer.render(lens.cellScene, lens.cellCam);
  }
}

// ===========================================================================
// CELL VIEWER
// ===========================================================================
const SPECIMENS = {
  archaea: {
    model: 'archaea',
    tab: 'Archaea',
    intro: 'Panspermia survivor detected: an archaeon. Archaea thrive in extreme heat, salt and acid. Drag to rotate, pinch to zoom, tap a dot to explore.',
    umPerUnit: 1.0,
    labels: [
      { key: 'archaella', name: 'Archaella and Pili', mats: null, target: [0.8, -0.02, 0.26], tour: 'Archaella: rotating propulsion fibres',
        desc: 'Archaella rotate like bacterial flagella but are built from different proteins, related to type IV pili. Many thinner pili help the cell attach to surfaces.' },
      { key: 'slayer', name: 'S-layer Cell Wall', mats: null, mesh: /Box001/, target: [-0.42, 0.0, 0.27], tour: 'S-layer: protein cell wall',
        desc: 'A crystalline protein surface layer. Archaea lack peptidoglycan; a few have pseudopeptidoglycan instead.' },
      { key: 'membrane', name: 'Plasma Membrane', mesh: /Box001/, target: [0.05, 0.15, 0.232], tour: 'Membrane: ether-linked lipids',
        desc: 'Built from branched isoprenoid lipids joined to glycerol by ether bonds. Some species form a lipid monolayer that stays stable at high temperature.' },
      { key: 'cytoplasm', name: 'Cytoplasm', snap: false, target: [-0.6, 0.155, 0.1], tour: 'Cytoplasm: site of metabolism',
        desc: 'Fluid interior holding ribosomes, DNA and enzymes, some of which work at temperatures near boiling.' },
      { key: 'nucleoid', name: 'Nucleoid (DNA)', mesh: /Box001/, target: [-0.18, 0.14, 0.02], tour: 'Nucleoid: circular chromosome',
        desc: 'A single circular chromosome. Many archaea wrap their DNA around histone-like proteins, as eukaryotes do.' },
      { key: 'plasmid', name: 'Plasmid DNA', mesh: /Box001/, target: [-0.56, 0.14, -0.1], tour: 'Plasmid: extra DNA ring',
        desc: 'Small circular DNA molecules separate from the chromosome.' },
      { key: 'ribosome', name: 'Ribosomes (70S)', mesh: /Box002/, target: [-0.22, 0.15, 0.136], tour: 'Ribosomes: protein synthesis',
        desc: '70S like bacterial ribosomes, but their proteins and antibiotic sensitivity are closer to eukaryotic ribosomes.' }
    ]
  }
};

const cellV = { key: 'archaea', zoom: 0, idleT: 0, tour: null, labels: [], card: null };

function initCell() {
  const canvas = document.getElementById('cell-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(DPR);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);
  cellV.renderer = renderer;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(32, 1, 0.02, 100);
  cellV.scene = scene; cellV.camera = cam;
  scene.add(new THREE.HemisphereLight(0xe8f2ff, 0x2a2418, 1.9));
  const key = new THREE.DirectionalLight(0xfff2dd, 2.2); key.position.set(-2.5, 4, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fdcff, 2.0); rim.position.set(3, 1.5, -3); scene.add(rim);
  cellV.holder = new THREE.Group(); scene.add(cellV.holder);

  // Suspended particles at several depths (depth-of-field feel)
  const N = 220, pos = new Float32Array(N * 3), seed = new Float32Array(N), size = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 9;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 5;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 7 - 0.5;
    seed[i] = Math.random() * 100;
    size[i] = Math.random() < 0.15 ? 0.06 + Math.random() * 0.08 : 0.012 + Math.random() * 0.025;
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  pg.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  cellV.motes = new THREE.Points(pg, new THREE.ShaderMaterial({
    uniforms: { uTex: { value: GLOW_TEX }, uTime: { value: 0 }, uScale: { value: 500 } },
    vertexShader: [
      'attribute float aSeed; attribute float aSize; uniform float uTime; uniform float uScale; varying float vA;',
      'void main(){ vec3 p=position;',
      ' p.x+=sin(uTime*0.13+aSeed)*0.25; p.y+=sin(uTime*0.11+aSeed*1.7)*0.18+mod(uTime*0.02+aSeed,1.0)*0.0;',
      ' p.z+=cos(uTime*0.09+aSeed*0.6)*0.2;',
      ' vec4 mv=modelViewMatrix*vec4(p,1.0); float d=-mv.z;',
      ' float focus=abs(d-3.2); vA=clamp(0.55-focus*0.09,0.08,0.55);',
      ' gl_PointSize=(aSize+focus*0.012)*uScale/d; gl_Position=projectionMatrix*mv; }'
    ].join('\n'),
    fragmentShader: [
      'uniform sampler2D uTex; varying float vA;',
      'void main(){ float a=texture2D(uTex,gl_PointCoord).a*vA; gl_FragColor=vec4(vec3(0.62,0.86,0.95)*a,a); }'
    ].join('\n'),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  cellV.motes.frustumCulled = false;
  scene.add(cellV.motes);
  const controls = new OrbitControls(cam, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.enablePan = false; controls.rotateSpeed = 0.7;
  controls.addEventListener('start', function () { cellV.idleT = 0; cellV.userBusy = true; });
  controls.addEventListener('end', function () { cellV.userBusy = false; });
  cellV.controls = controls;
  cellV.raycaster = new THREE.Raycaster();
  cellV.lastRay = 0;
  resizeCell();
  window.addEventListener('resize', resizeCell);

  document.querySelectorAll('.specimen-tab').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      if (b.dataset.specimen !== cellV.key) showSpecimen(b.dataset.specimen, true);
    });
  });
}

function fitDistance() {
  const cam = cellV.camera;
  const tanH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
  const halfW = cam.aspect < 0.8 ? 1.15 : 1.55, halfH = 0.9;
  return Math.max(halfH / tanH, halfW / (tanH * cam.aspect)) * 1.12;
}

function resizeCell() {
  if (!cellV.renderer) return;
  const W = window.innerWidth, H = window.innerHeight;
  cellV.renderer.setSize(W, H, false);
  cellV.camera.aspect = W / H; cellV.camera.updateProjectionMatrix();
  cellV.fit = fitDistance();
  if (cellV.motes) cellV.motes.material.uniforms.uScale.value = H * DPR / (2 * Math.tan(THREE.MathUtils.degToRad(cellV.camera.fov / 2)));
  cellV.controls.minDistance = cellV.fit * 0.35;
  cellV.controls.maxDistance = cellV.fit * 3;
}

function setCameraDistance(d, instant) {
  const cam = cellV.camera, t = cellV.controls.target;
  const dir = cam.position.clone().sub(t);
  if (dir.lengthSq() < 1e-6) dir.set(0, 0.55, 1);
  dir.normalize();
  cellV.camGoal = t.clone().addScaledVector(dir, d);
  if (instant) cam.position.copy(cellV.camGoal);
}

async function showSpecimen(key, announce) {
  cellV.key = key;
  const spec = SPECIMENS[key];
  document.querySelectorAll('.specimen-tab').forEach(function (b) {
    b.classList.toggle('active', b.dataset.specimen === key);
  });
  endTour(); hideCard();
  const src = await loadModel(spec.model);
  // clear previous
  while (cellV.holder.children.length) cellV.holder.remove(cellV.holder.children[0]);
  cellV.holder.rotation.set(0, 0, 0);
  const model = normalizeModel(src.clone(true), 2.6);
  model.traverse(function (o) {
    if (!o.isMesh) return;
    o.material = o.material.clone();
    if (o.material.transparent || o.material.alphaTest > 0 || o.material.name === 'material_1') o.material.userData.seeThrough = true;
  });
  cellV.holder.add(model);
  cellV.model = model;
  cellV.holder.updateMatrixWorld(true);

  // Pin each label to the nearest vertex of its structure
  const norm = model.userData.norm;
  cellV.labels.forEach(function (l) { l.el.remove(); });
  cellV.labels = [];
  const layer = document.getElementById('cell-labels');
  spec.labels.forEach(function (L) {
    const targetW = new THREE.Vector3().fromArray(L.target).multiplyScalar(1.3); // normalised [-1,1] -> world
    const best = new THREE.Vector3().copy(targetW);
    let bestD = L.snap === false ? -1 : Infinity;
    const mats = [];
    const v = new THREE.Vector3();
    model.traverse(function (o) {
      if (!o.isMesh || bestD < 0) return;
      if (L.mats && L.mats.indexOf(o.material.name) < 0) return;
      if (L.mesh && !L.mesh.test(o.name)) return;
      mats.push(o.material);
      const pos = o.geometry.attributes.position;
      if (o.isInstancedMesh) {
        // repeated parts (e.g. ribosomes) are GPU instances: test each instance centre
        o.geometry.computeBoundingBox();
        const c0 = o.geometry.boundingBox.getCenter(new THREE.Vector3());
        const im = new THREE.Matrix4();
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, im);
          v.copy(c0).applyMatrix4(im).applyMatrix4(o.matrixWorld);
          const d = v.distanceToSquared(targetW);
          if (d < bestD) { bestD = d; best.copy(v); }
        }
        return;
      }
      const step = Math.max(1, Math.floor(pos.count / 60000));
      for (let i = 0; i < pos.count; i += step) {
        v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        const d = v.distanceToSquared(targetW);
        if (d < bestD) { bestD = d; best.copy(v); }
      }
    });
    const anchor = new THREE.Object3D();
    anchor.position.copy(cellV.holder.worldToLocal(best.clone()));
    cellV.holder.add(anchor);

    const el = document.createElement('div');
    el.className = 'label-container label-3d';
    el.dataset.label = L.key;
    el.innerHTML = '<div class="label-dot"></div><div class="label-text"></div>';
    el.querySelector('.label-text').textContent = L.name;
    layer.appendChild(el);
    const rec = { def: L, anchor: anchor, el: el, mats: L.mats ? mats : [], sx: 0, sy: 0, occluded: false };
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      endTour();
      const was = el.classList.contains('active');
      cellV.labels.forEach(function (o) { o.el.classList.remove('active'); });
      hideCard();
      if (!was) { el.classList.add('active'); showCard(rec); highlight(rec); }
    });
    cellV.labels.push(rec);
  });

  // Camera
  cellV.controls.target.set(0, 0, 0);
  cellV.camera.position.set(0, 1.05, 1.9);
  cellV.zoom = 0;
  setCameraDistance(cellV.fit, true);
  cellV.controls.update();

  if (announce && window.typewriterText) window.typewriterText(spec.intro);
}

function highlight(rec) {
  rec.mats.forEach(function (m) {
    if (!m.emissive) return;
    m.userData.hlT = 0;
    m.userData.hlBase = m.userData.hlBase || m.emissive.clone();
    if (!cellV.hlMats) cellV.hlMats = new Set();
    cellV.hlMats.add(m);
  });
}

function updateHighlights(dt) {
  if (!cellV.hlMats) return;
  cellV.hlMats.forEach(function (m) {
    m.userData.hlT += dt;
    const t = m.userData.hlT;
    if (t > 1.6) { m.emissive.copy(m.userData.hlBase); cellV.hlMats.delete(m); return; }
    const k = Math.sin(Math.min(1, t / 1.6) * Math.PI) * (0.65 + 0.35 * Math.sin(t * 14));
    m.emissive.setRGB(0.85 * k, 0.75 * k, 0.3 * k);
  });
}

// ---- Info card ---------------------------------------------------------------
function showCard(rec) {
  const card = document.getElementById('hotspot-info-card');
  document.getElementById('card-name').textContent = rec.def.name;
  document.getElementById('card-desc').textContent = rec.def.desc;
  card.style.visibility = 'hidden'; card.style.left = '-9999px'; card.style.top = '-9999px';
  card.classList.add('visible');
  cellV.card = rec;
  requestAnimationFrame(function () {
    const dot = rec.el.querySelector('.label-dot').getBoundingClientRect();
    const W = card.offsetWidth || 280, H = card.offsetHeight || 110, m = 12;
    const vw = window.innerWidth, vh = window.innerHeight;
    let x = dot.right + 14, y = dot.top - 10;
    if (x + W > vw - m) x = dot.left - W - 14;
    if (x < m) { x = Math.max(m, Math.min(dot.left + dot.width / 2 - W / 2, vw - W - m)); y = dot.bottom + 10; }
    if (y + H > vh - m) y = vh - H - m;
    if (y < m) y = m;
    card.style.left = x + 'px'; card.style.top = y + 'px'; card.style.visibility = '';
  });
}

function hideCard() {
  const card = document.getElementById('hotspot-info-card');
  if (card) card.classList.remove('visible');
  cellV.card = null;
}

// ---- Guided tour -------------------------------------------------------------
function startTour() {
  hideCard();
  cellV.labels.forEach(function (l) { l.el.classList.remove('active'); });
  cellV.tour = { i: 0, t: 0 };
  showTourStep();
}

function showTourStep() {
  const tr = cellV.tour;
  if (!tr) return;
  if (tr.i >= cellV.labels.length) { endTour(); return; }
  tr.t = 0;
  cellV.labels.forEach(function (l, i) { l.el.classList.toggle('touring', i === tr.i); });
  const b = document.getElementById('tour-bubble');
  b.textContent = cellV.labels[tr.i].def.tour;
  b.style.display = 'block';
  highlight(cellV.labels[tr.i]);
}

function advanceTour() {
  if (!cellV.tour) return false;
  cellV.tour.i++;
  showTourStep();
  return true;
}

function endTour() {
  cellV.tour = null;
  cellV.labels.forEach(function (l) { l.el.classList.remove('touring'); });
  const b = document.getElementById('tour-bubble');
  if (b) b.style.display = 'none';
}

// ---- Per-frame cell update ---------------------------------------------------
let cellActive = false;

function renderCell(dt, time) {
  if (!cellActive || !cellV.renderer || !cellV.model) return;
  const cam = cellV.camera;

  if (cellV.camGoal) {
    cam.position.lerp(cellV.camGoal, 1 - Math.exp(-dt * 5));
    if (cam.position.distanceTo(cellV.camGoal) < 0.002) cellV.camGoal = null;
  }

  // Gentle sway while idle, paused during tour, cards and user drags
  cellV.idleT += dt;
  const calm = cellV.tour || cellV.card || cellV.userBusy;
  if (!calm && cellV.idleT > 2.5) {
    cellV.swayT = (cellV.swayT || 0) + dt;
    cellV.holder.rotation.y = Math.sin(cellV.swayT * 0.35) * 0.3;
  }
  cellV.controls.update();
  if (cellV.motes) cellV.motes.material.uniforms.uTime.value = time;
  updateHighlights(dt);
  cellV.renderer.render(cellV.scene, cam);

  // Project labels
  const W = window.innerWidth, H = window.innerHeight;
  const doRay = time - cellV.lastRay > 0.25;
  if (doRay) cellV.lastRay = time;
  const v = new THREE.Vector3();
  cellV.labels.forEach(function (l) {
    l.anchor.getWorldPosition(v);
    const world = v.clone();
    v.project(cam);
    l.sx = (v.x * 0.5 + 0.5) * W; l.sy = (-v.y * 0.5 + 0.5) * H;
    const off = v.z > 1 || l.sx < -40 || l.sx > W + 40 || l.sy < -40 || l.sy > H + 40;
    if (doRay && !off) {
      const dir = world.clone().sub(cam.position);
      const dist = dir.length();
      cellV.raycaster.set(cam.position, dir.normalize());
      cellV.raycaster.far = dist - 0.03;
      const hit = cellV.raycaster.intersectObject(cellV.model, true);
      // see-through surfaces (the cut face of the archaeon) do not hide labels
      l.occluded = hit.some(function (h) { const m = h.object.material; return !(m.transparent && m.opacity < 0.99) && !m.userData.seeThrough; });
    }
    l.el.style.transform = 'translate(' + l.sx.toFixed(1) + 'px,' + l.sy.toFixed(1) + 'px)';
    l.el.classList.toggle('occluded', l.occluded || off);
    l.el.classList.toggle('flip', l.sx > W * 0.62);
  });

  // Tour bubble follows its label
  if (cellV.tour) {
    const tr = cellV.tour;
    tr.t += dt;
    const l = cellV.labels[tr.i];
    const b = document.getElementById('tour-bubble');
    if (l) {
      const above = l.sy > H * 0.3;
      b.style.left = Math.max(110, Math.min(W - 110, l.sx)) + 'px';
      b.style.top = (above ? l.sy - 34 : l.sy + 34) + 'px';
      b.classList.toggle('below', !above);
    }
    if (tr.t > 4) advanceTour();
  }

  // Live scale bar: 1 µm at the target depth
  const sb = document.getElementById('scale-line');
  if (sb) {
    const d = cam.position.distanceTo(cellV.controls.target);
    const pxPerUnit = H / (2 * d * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)));
    const um = SPECIMENS[cellV.key].umPerUnit;
    let len = 1, txt = '1 µm';
    if (pxPerUnit / um > 240) { len = 0.5; txt = '0.5 µm'; }
    if (pxPerUnit / um < 50) { len = 2; txt = '2 µm'; }
    sb.style.width = (pxPerUnit / um * len).toFixed(0) + 'px';
    const st = document.getElementById('scale-text');
    if (st && st.textContent !== txt) st.textContent = txt;
  }
}

function enterCell() {
  cellActive = true;
  spaceVisible = false;
  lens.mode = 'none';
  resizeCell();
  return showSpecimen(cellV.key, false);
}

function cellZoom(level) {
  const mult = [1, 1.35, 1.8, 2.4][level] || 1;
  setCameraDistance(cellV.fit * mult, false);
}

function cellZoomBy(f) {
  const d = cellV.camera.position.distanceTo(cellV.controls.target) * f;
  setCameraDistance(THREE.MathUtils.clamp(d, cellV.controls.minDistance, cellV.controls.maxDistance), false);
}

function resetView() {
  cellV.controls.target.set(0, 0, 0);
  cellV.holder.rotation.set(0, 0, 0);
  cellV.swayT = 0; cellV.idleT = 0;
  const dir = new THREE.Vector3(0, 1.05, 1.9).normalize();
  cellV.camGoal = dir.multiplyScalar(cellV.fit);
}

function cellContrast(on) {
  if (cellV.renderer) cellV.renderer.toneMappingExposure = on ? 1.45 : 1.0;
}

// Tap on empty space: close card / advance tour
function cellBackgroundTap() {
  cellV.labels.forEach(function (l) { l.el.classList.remove('active'); });
  const hadCard = !!cellV.card;
  hideCard();
  if (!hadCard) advanceTour();
}

// ===========================================================================
// Boot
// ===========================================================================
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  renderSpace(dt, time);
  renderLens(dt, time);
  renderCell(dt, time);
  if (window.ExodusFrame) window.ExodusFrame(dt);
  requestAnimationFrame(loop);
}

updateLoadStatus();
const spaceReady = Promise.all([loadModel('earth'), loadModel('asteroid')]).then(function (r) {
  initSpace(r[0], r[1]);
  requestAnimationFrame(loop);
});
const allReady = Promise.all([spaceReady, loadModel('bonfire'), loadModel('archaea')]).then(function () {
  return Promise.all([loadModel('asteroid'), loadModel('bonfire'), loadModel('archaea')]).then(function (r) {
    initLens(r[0], r[1], r[2]);
    initCell();
  });
});

window.Exodus3D = {
  ready: spaceReady,
  allReady: allReady,
  launch: launch,
  faceImpact: faceImpact,
  getImpactScreen: getImpactScreen,
  setLensMode: setLensMode,
  enterCell: enterCell,
  showSpecimen: showSpecimen,
  startTour: startTour,
  advanceTour: advanceTour,
  endTour: endTour,
  cellZoom: cellZoom,
  cellZoomBy: cellZoomBy,
  resetView: resetView,
  cellContrast: cellContrast,
  cellBackgroundTap: cellBackgroundTap,
  isCardOpen: function () { return !!cellV.card; }
};
window.dispatchEvent(new Event('exodus3d-module'));
spaceReady.then(function () { window.dispatchEvent(new Event('exodus3d-ready')); });
spaceReady.catch(function (e) { showLoadError('Could not start the 3D scene', e); });
