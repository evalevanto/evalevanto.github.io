const floatsEl = document.getElementById("floats");
// coming back up from the stream: the print descends into place
try { if (sessionStorage.getItem("from") === "stream") { sessionStorage.removeItem("from"); document.body.classList.add("arriving"); } } catch {}
const card = document.getElementById("card");

// the prints that rise over the words: a different set every visit, some of the newest always among them
const { slots, pool } = DATA;  // pool is newest first
const shuffle = xs => xs.map(x => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
const picks = shuffle(pool.slice(0, 6)).slice(0, 3);
for (const p of shuffle(pool)) if (picks.length < slots.length && !picks.includes(p)) picks.push(p);
picks.forEach((p, i) => {
  const [x, w, depth] = slots[i];
  const el = document.createElement("div");
  el.className = "float";
  const dur = 38 + depth * 70;
  el.style.cssText = `left:${x}vw;width:${w}vw;--w:${w};--y:${x < 60 ? 62 + (i * 13) % 20 : 6 + (i * 41) % 70}vh;animation-duration:${dur}s;animation-delay:${-dur * ((i * 0.37) % 1)}s;` +
    `opacity:${1 - depth * 0.35};--blur:${depth > 0.55 ? 1 + depth * 1.5 : 0}px`;
  el.innerHTML = `<div class="sway" style="--amp:${6 + (1 - depth) * 12}px;--tilt:${(i % 2 ? 1 : -1) * (1.5 + (i % 3))}deg;animation-duration:${5 + (i % 4)}s">` +
    `<img src="${p.img.src}" alt="" decoding="async"><span class="cap"><b></b><span class="mono"></span></span></div>`;
  el.querySelector("b").textContent = p.title;
  el.querySelector(".cap .mono").textContent = `${p.type} · ${p.date}`;
  el.addEventListener("mouseenter", () => { el.classList.add("hot"); floatsEl.classList.add("hovering"); hover = true; setRate(); });
  el.addEventListener("mouseleave", () => { el.classList.remove("hot"); floatsEl.classList.remove("hovering"); hover = false; setRate(); });
  el.addEventListener("click", () => openPost(p));
  floatsEl.appendChild(el);
});

// the words arrive one at a time, like a title sequence
const poem = document.getElementById("poem");
let w = 0;
(function wrap(node) {
  for (const n of [...node.childNodes]) {
    if (n.nodeType === 3) {
      const frag = document.createDocumentFragment();
      for (const t of n.textContent.split(/(\s+)/)) {
        if (!t.trim()) { frag.append(t); continue; }
        const s = document.createElement("span");
        s.className = "w"; s.textContent = t; s.style.transitionDelay = `${0.3 + w++ * 0.16}s`;
        frag.append(s);
      }
      n.replaceWith(frag);
    } else if (n.nodeName !== "BR") wrap(n);
  }
})(poem);
requestAnimationFrame(() => requestAnimationFrame(() => poem.classList.add("on")));

// the back of the print is the #back address: links, the back button and deep links all just work
const showSide = () => card.classList.toggle("flipped", location.hash === "#back");
const flip = () => location.hash = card.classList.contains("flipped") ? "" : "back";
addEventListener("hashchange", showSide);
showSide();
document.querySelector(".topbar .avatar").addEventListener("click", e => { e.preventDefault(); flip(); });

// scroll is time: the wheel speeds the drift up or runs it backwards; keep going and you fall into the stream
const drift = floatsEl.getAnimations({ subtree: true });
// start every clock far into its loop: rewinding to zero would finish the animation and freeze the prints
for (const a of drift) a.currentTime += a.effect.getComputedTiming().duration * 2000;
const hint = document.getElementById("hint");
let hover = false, push = 0, travel = 0, frozen = false, ticking = false, leaving = false, lastRate = 1;
function setRate() {
  const rate = frozen ? 0 : (hover ? 0.3 : 1) + push;
  if (Math.abs(rate - lastRate) < 0.01 && rate !== 0) return;
  lastRate = rate;
  for (const a of drift) {
    a.updatePlaybackRate(rate);
    if (a.playState === "finished") a.play();  // never stay stuck at an end
  }
}
function tick() {
  push *= 0.93; travel *= 0.995;
  setRate();
  ticking = Math.abs(push) > 0.01;
  if (ticking) requestAnimationFrame(tick);
}
function onScroll(dy) {
  if (leaving || card.classList.contains("flipped")) return;
  push = Math.max(-8, Math.min(10, push + dy * 0.02));
  travel = Math.max(0, travel + dy);
  hint.style.opacity = 0;
  if (travel > 1100) {  // about one deliberate trackpad swipe
    leaving = true; document.body.classList.add("leaving"); setTimeout(() => location.href = "/stream/", 1300); }
  if (!ticking) { ticking = true; requestAnimationFrame(tick); }
}
addEventListener("wheel", e => onScroll(e.deltaY), { passive: true });
let ty = null;
addEventListener("touchstart", e => ty = e.touches[0].clientY, { passive: true });
addEventListener("touchmove", e => { onScroll((ty - e.touches[0].clientY) * 2); ty = e.touches[0].clientY; }, { passive: true });
addEventListener("keydown", e => {
  if (!plainKey(e)) return;
  if (e.key === "l" || e.key === "L") flip();
  if (e.code === "Space") { e.preventDefault(); frozen = !frozen; setRate(); }
  if (e.key === "r") openRandom(pool);
});
