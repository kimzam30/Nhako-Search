/**
 * The launch video, as a pure function of time: renderFrame(t) poses every
 * element for second t. render.mjs calls it once per frame and screenshots,
 * so the film is identical on every run and every machine. Open
 * scene.html?play to watch it in real time while editing.
 */
import {
  INTRO, BRIDGE, CAPTIONS, PHONE_SCREENS, DUO_SCREENS, PHONE_POSES, DUO, INSTALL, DEVICES, DARK, END,
} from './timeline.mjs';

const $ = id => document.getElementById(id);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const inOut = x => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const outCubic = x => 1 - (1 - x) ** 3;
const outBack = x => 1 + 2.2 * (x - 1) ** 3 + 1.2 * (x - 1) ** 2;
const lerp = (a, b, x) => a + (b - a) * x;
const SHOT = name => `/launch/video/shots/${name}.png`;

/** Keyframed pose at t: holds before the first and after the last key. */
function pose(keys, t) {
  if (t <= keys[0].t) return keys[0];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i].t) {
      const a = keys[i - 1], b = keys[i];
      const x = inOut(prog(t, a.t, b.t));
      const out = {};
      for (const k of Object.keys(b)) if (k !== 't') out[k] = lerp(a[k] ?? 0, b[k], x);
      return out;
    }
  }
  return keys[keys.length - 1];
}
const at = (list, t) => list.reduce((cur, s) => (t >= s.t ? s : cur), list[0]);

// ------------------------------------------------------------------- setup
// Lawn tufts and night stars, from a fixed seed.
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
for (let i = 0; i < 70; i++) {
  const g = document.createElement('i');
  g.style.left = `${rnd() * 1068}px`;
  g.style.top = `${rnd() * 1908}px`;
  g.style.background = ['#6bb784', '#b5e3be', '#6bb784', '#f49ac1', '#b893ea'][i % 5];
  $('lawn').append(g);
}
const stars = [];
for (let i = 0; i < 60; i++) {
  const s = document.createElement('i');
  s.style.left = `${rnd() * 1074}px`;
  s.style.top = `${rnd() * 1914}px`;
  $('night').append(s);
  stars.push({ el: s, ph: rnd() * 6.28, sp: 1 + rnd() * 2 });
}
// The app's ambient butterflies, drifting behind everything.
const WINGS = [['#FF9AC4', '#C3A6F0'], ['#9FD3F7', '#8EDDB0'], ['#FFD27A', '#FFB08A'], ['#C3A6F0', '#FF9AC4'], ['#8EDDB0', '#9FD3F7']];
const flies = WINGS.map(([w1, w2]) => {
  const el = document.createElement('div');
  el.className = 'fly';
  el.innerHTML = `<svg viewBox="0 0 48 40"><g stroke="#4A1942" stroke-width="2.4" stroke-linejoin="round">
    <path class="wl" d="M23 19C19 9 11 3.5 5.5 5.2C1.2 6.6 2 13.5 6.8 17.3C10.5 20.2 16.8 21 23 19Z" fill="${w1}"/>
    <path class="wr" d="M25 19C29 9 37 3.5 42.5 5.2C46.8 6.6 46 13.5 41.2 17.3C37.5 20.2 31.2 21 25 19Z" fill="${w1}"/>
    <path d="M23 20.5C17.5 21.5 10.8 24.8 10.2 30.2C9.8 34.2 14 36 17.6 33.6C21 31.3 22.6 25.8 23 20.5Z" fill="${w2}"/>
    <path d="M25 20.5C30.5 21.5 37.2 24.8 37.8 30.2C38.2 34.2 34 36 30.4 33.6C27 31.3 25.4 25.8 25 20.5Z" fill="${w2}"/>
    <path d="M24 12.5C22.6 16 22.6 25 24 30.5C25.4 25 25.4 16 24 12.5Z" fill="#4A1942"/></g></svg>`;
  $('flies').append(el);
  return { el, x0: rnd() * 1080, y0: rnd() * 1920, vx: (rnd() - 0.5) * 60, vy: -30 - rnd() * 40, ph: rnd() * 6 };
});
// Home-screen apps for the install scene; one slot is left for ours.
const APP_COLORS = ['#FF9AC4', '#9FD3F7', '#FFD27A', '#8EDDB0', '#C3A6F0', '#FFB08A', '#B8E07E', '#E7A8F2', '#9FD3F7', '#FFD27A', '#FF9AC4', '#8EDDB0', '#FFB08A', '#C3A6F0', '#B8E07E', '#9FD3F7'];
APP_COLORS.forEach((c, i) => {
  const s = document.createElement('span');
  if (i === 9) s.className = 'slot';
  else s.style.background = `linear-gradient(160deg, ${c}, color-mix(in srgb, ${c} 70%, #4A1942))`;
  $('apps').append(s);
});

const show = (el, o) => { el.style.opacity = String(clamp(o)); el.style.visibility = o <= 0.001 ? 'hidden' : 'visible'; };

// ------------------------------------------------------------------- frame
function renderFrame(t) {
  // Backdrop: lawn for the opening and the end card, night for dark mode.
  const lawn = Math.max(1 - prog(t, INTRO.out[0], INTRO.out[1]), prog(t, END.icon - 0.5, END.icon));
  show($('lawn'), lawn * 0.92);
  const night = prog(t, DARK.in[0], DARK.in[1]) * (1 - prog(t, DARK.out[0], DARK.out[1]));
  show($('night'), night);
  document.body.classList.toggle('dark', night > 0.5);
  for (const s of stars) s.el.style.opacity = String(0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph)));

  for (const f of flies) {
    const x = ((f.x0 + f.vx * t) % 1180 + 1180) % 1180 - 50;
    const y = ((f.y0 + f.vy * t) % 2020 + 2020) % 2020 - 50;
    const flap = 0.55 + 0.45 * Math.abs(Math.sin(t * 9 + f.ph));
    f.el.style.transform = `translate(${x}px, ${y + Math.sin(t * 2 + f.ph) * 20}px) rotate(${Math.sin(t + f.ph) * 14}deg) scaleX(${flap})`;
    f.el.style.opacity = '0.55';
  }

  // Opening words.
  const iOut = 1 - prog(t, INTRO.out[0], INTRO.out[1]);
  const w1 = outBack(prog(t, INTRO.words[0], INTRO.words[0] + 0.45));
  const w2 = outBack(prog(t, INTRO.words[1], INTRO.words[1] + 0.45));
  show($('intro1'), Math.min(prog(t, INTRO.words[0], INTRO.words[0] + 0.2), iOut));
  $('intro1').style.transform = `translateY(${(1 - w1) * 80 - (1 - iOut) * 120}px) scale(${0.8 + 0.2 * w1})`;
  show($('intro2'), Math.min(prog(t, INTRO.words[1], INTRO.words[1] + 0.2), iOut));
  $('intro2').style.transform = `translateY(${(1 - w2) * 80 - (1 - iOut) * 120}px) scale(${0.8 + 0.2 * w2})`;
  $('introCap').style.strokeDasharray = '1';
  $('introCap').style.strokeDashoffset = String(1 - outCubic(prog(t, INTRO.capsule[0], INTRO.capsule[1])));
  $('introCap').style.fill = prog(t, INTRO.capsule[0], INTRO.capsule[1]) >= 1 ? 'var(--w1)' : 'none';
  const logo = outBack(prog(t, 2.5, 3.0));
  show($('introLogo'), Math.min(prog(t, 2.5, 2.7), iOut));
  $('introLogo').style.transform = `scale(${0.4 + 0.6 * logo}) rotate(${(1 - logo) * -25 - 4}deg)`;

  // The bridge into multiplayer.
  const bOut = 1 - prog(t, BRIDGE.out[0], BRIDGE.out[1]);
  const b1 = outBack(prog(t, BRIDGE.in, BRIDGE.in + 0.4));
  const b2 = outBack(prog(t, BRIDGE.line2, BRIDGE.line2 + 0.35));
  show($('bridge1'), Math.min(prog(t, BRIDGE.in, BRIDGE.in + 0.15), bOut));
  $('bridge1').style.transform = `translateY(${(1 - b1) * 60}px) scale(${(0.85 + 0.15 * b1) * (2 - bOut)})`;
  show($('bridge2'), Math.min(prog(t, BRIDGE.line2, BRIDGE.line2 + 0.12), bOut));
  $('bridge2').style.transform = `scale(${(0.5 + 0.5 * b2) * (1 + (1 - bOut) * 1.5)}) rotate(-3deg)`;

  // Captions: eyebrow, then headline, then the grey line, each rising in.
  const ci = CAPTIONS.findLastIndex(c => t >= c.t);
  const cap = CAPTIONS[ci];
  if (!cap || cap.end || cap.hide) show($('caption'), 0);
  else {
    const next = CAPTIONS[ci + 1];
    const out = next ? 1 - prog(t, next.t - 0.18, next.t) : 1;
    show($('caption'), out);
    if ($('head').textContent !== cap.head) {
      $('eyebrow').textContent = cap.eyebrow;
      $('head').textContent = cap.head;
      $('sub').textContent = cap.sub ?? '';
    }
    [['eyebrow', 0], ['head', 0.07], ['sub', 0.16]].forEach(([id, d]) => {
      const p = outCubic(prog(t, cap.t + d, cap.t + d + 0.42));
      $(id).style.opacity = String(p);
      $(id).style.transform = `translateY(${(1 - p) * 34}px)`;
    });
  }

  // The single phone.
  const ps = pose(PHONE_POSES, t);
  const phoneOn = t < 20.2 || (t > 33.2 && t < 44.8);
  show($('phone'), phoneOn ? 1 : 0);
  const si = PHONE_SCREENS.findLastIndex(s => t >= s.t);
  const scr = PHONE_SCREENS[si];
  const prev = PHONE_SCREENS[si - 1];
  const fade = scr.via === 'fade' && prev ? prog(t, scr.t, scr.t + 0.4) : 1;
  if ($('phA').dataset.shot !== scr.shot) { $('phA').src = SHOT(scr.shot); $('phA').dataset.shot = scr.shot; }
  if (prev && $('phB').dataset.shot !== prev.shot) { $('phB').src = SHOT(prev.shot); $('phB').dataset.shot = prev.shot; }
  $('phA').style.opacity = String(fade);
  $('phB').style.opacity = String(prev && fade < 1 ? 1 : 0);
  const bump = scr.via === 'pop' ? Math.sin(Math.PI * prog(t, scr.t, scr.t + 0.28)) * 0.035 : 0;
  $('phone').style.transform = `translateY(${ps.y}px) rotate(${ps.r}deg) scale(${ps.s + bump})`;

  // The duo: you and your friend.
  const duoIn = outCubic(prog(t, DUO.in[0], DUO.in[1]));
  const duoOut = inOut(prog(t, DUO.out[0], DUO.out[1]));
  const duoOn = t >= DUO.in[0] && t <= DUO.out[1] + 0.05;
  show($('duoA'), duoOn ? 1 : 0);
  show($('duoB'), duoOn ? 1 : 0);
  const ds = at(DUO_SCREENS, t);
  const ia = $('duoA').querySelector('img'), ib = $('duoB').querySelector('img');
  if (ia.dataset.shot !== ds.you) { ia.src = SHOT(ds.you); ia.dataset.shot = ds.you; }
  if (ib.dataset.shot !== ds.friend) { ib.src = SHOT(ds.friend); ib.dataset.shot = ds.friend; }
  // A small bump each time both screens change together.
  const dBump = ds.t > DUO.in[0] ? Math.sin(Math.PI * prog(t, ds.t, ds.t + 0.3)) * 0.03 : 0;
  $('duoA').style.transform = `translate(${(1 - duoIn) * -700 - duoOut * 700}px, ${Math.sin(t * 1.6) * 6}px) rotate(${-4 + (1 - duoIn) * -12}deg) scale(${1 + dBump})`;
  $('duoB').style.transform = `translate(${(1 - duoIn) * 700 + duoOut * 700}px, ${Math.sin(t * 1.6 + 1.5) * 6}px) rotate(${4 + (1 - duoIn) * 12}deg) scale(${1 + dBump})`;
  const vs = outBack(prog(t, DUO.vs, DUO.vs + 0.35));
  const vsOn = t >= DUO.vs && t < 29.4;
  show($('vs'), vsOn ? Math.min(1, prog(t, DUO.vs, DUO.vs + 0.1)) * (1 - prog(t, 29.1, 29.4)) : 0);
  $('vs').style.transform = `scale(${vs * (1 + Math.sin(t * 8) * 0.03)}) rotate(${(1 - vs) * 90 - 8}deg)`;

  // Install: the steps tick in, the icon drops into the home screen.
  const insOn = t >= INSTALL.in[0] && t < INSTALL.out[1];
  const insIn = outCubic(prog(t, INSTALL.in[0], INSTALL.in[1]));
  const insOut = inOut(prog(t, INSTALL.out[0], INSTALL.out[1]));
  show($('steps'), insOn ? 1 - insOut : 0);
  [...$('steps').children].forEach((el, i) => {
    const p = outBack(prog(t, INSTALL.steps[i], INSTALL.steps[i] + 0.35));
    el.style.opacity = String(prog(t, INSTALL.steps[i], INSTALL.steps[i] + 0.1));
    el.style.transform = `translateX(${(1 - p) * -120}px) scale(${0.9 + 0.1 * p})`;
  });
  show($('home'), insOn ? 1 : 0);
  $('home').style.transform = `translateY(${(1 - insIn) * 1100 + insOut * 1100}px) rotate(${(1 - insIn) * 6}deg)`;
  // Slot 10 of the 4-column grid: column 2, row 3.
  const slot = $('apps').children[9];
  const sx = slot.offsetLeft + 34, sy = slot.offsetTop + 110;
  const drop = prog(t, INSTALL.drop, INSTALL.drop + 0.55);
  const dy = drop < 1 ? -700 * (1 - outBack(drop)) : 0;
  const open = prog(t, INSTALL.tapOpen, INSTALL.tapOpen + 0.3);
  show($('dropIcon'), t >= INSTALL.drop ? 1 : 0);
  $('dropIcon').style.left = `${sx}px`;
  $('dropIcon').style.top = `${sy + dy}px`;
  $('dropIcon').style.width = $('dropIcon').style.height = `${slot.offsetWidth}px`;
  $('dropIcon').style.transform = `scale(${1 - 0.12 * Math.sin(Math.PI * open)})`;
  show($('dropLabel'), prog(t, INSTALL.drop + 0.4, INSTALL.drop + 0.6));
  $('dropLabel').style.left = `${sx + slot.offsetWidth / 2 - 70}px`;
  $('dropLabel').style.top = `${sy + slot.offsetWidth + 8}px`;
  const tap = prog(t, INSTALL.tapOpen, INSTALL.tapOpen + 0.45);
  show($('tap'), tap > 0 && tap < 1 ? 1 - tap : 0);
  $('tap').style.left = `${sx + slot.offsetWidth / 2}px`;
  $('tap').style.top = `${sy + slot.offsetWidth / 2}px`;
  $('tap').style.transform = `scale(${0.4 + tap * 0.9})`;

  // Every device.
  const devIn = (d) => outBack(prog(t, DEVICES.in[0] + d, DEVICES.in[1] + d));
  const devOut = inOut(prog(t, DEVICES.out[0], DEVICES.out[1]));
  const devOn = t >= DEVICES.in[0] && t < DEVICES.out[1];
  for (const [id, d, from] of [['laptop', 0, 900], ['tablet', 0.18, 1000], ['phone2', 0.32, 1000]]) {
    show($(id), devOn ? 1 : 0);
    const p = devIn(d);
    $(id).style.transform = `translateY(${(1 - p) * from + devOut * 1100}px) rotate(${id === 'tablet' ? -5 : id === 'phone2' ? 6 : 0}deg)`;
  }

  // End card.
  const e = (k, dur = 0.45) => outBack(prog(t, END[k], END[k] + dur));
  const endFade = 1 - prog(t, END.fadeOut, END.fadeOut + 0.9);
  show($('end'), t >= END.icon ? endFade : 0);
  [['endIcon', 'icon'], ['endTitle', 'title'], ['endTag', 'tagline'], ['endUrl', 'url'], ['endSmall', 'small']].forEach(([id, k]) => {
    const p = e(k);
    $(id).style.opacity = String(prog(t, END[k], END[k] + 0.15));
    $(id).style.transform = id === 'endIcon'
      ? `scale(${p}) rotate(${(1 - p) * -30 - 4 + Math.sin(t * 2) * 2}deg) translateY(${Math.sin(t * 2.2) * 8}px)`
      : `translateY(${(1 - p) * 50}px) scale(${0.9 + 0.1 * p})`;
  });
}

window.renderFrame = renderFrame;
/** For the renderer: pose the frame, then wait until every swapped image is decoded. */
window.renderFrameDecoded = async t => {
  renderFrame(t);
  await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
};

// Ready once fonts and every image have loaded (render.mjs waits on this).
const shots = [...new Set([...PHONE_SCREENS.map(s => s.shot), ...DUO_SCREENS.flatMap(d => [d.you, d.friend])])];
await Promise.all([
  document.fonts.ready,
  ...shots.map(s => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = SHOT(s); })),
  ...[...document.images].map(i => (i.complete ? null : new Promise(r => { i.onload = i.onerror = r; }))),
]);
renderFrame(0);
window.sceneReady = true;

if (new URLSearchParams(location.search).has('play')) {
  const t0 = performance.now();
  const loop = () => { renderFrame(((performance.now() - t0) / 1000) % 60); requestAnimationFrame(loop); };
  loop();
}
