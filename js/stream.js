const { items, lenses } = DATA;
const TOP = matchMedia("(max-width: 800px)").matches ? 190 : 240;
const params = new URLSearchParams(location.search);
let seed = params.get("seed") || "levanto";
let lens = params.get("lens") || "all";
let shown = [], rows = [], kinOf = new Map(), hovered = null;

const nearest = (list, key, v) => list.reduce((b, c) => Math.abs(c[key] - v) < Math.abs(b[key] - v) ? c : b);

function syncURL() {
  const q = new URLSearchParams({ seed });
  if (lens !== "all") q.set("lens", lens);
  history.replaceState(null, "", "?" + q);
}

function render() {
  const root = document.getElementById("stream");
  shown = items.filter(p => p.img && (lens === "all" || p.lenses.includes(lens)));
  const bySlug = Object.fromEntries(shown.map(p => [p.slug, p]));
  const { items: placed, height } = layout(shown, seed, root.clientWidth);
  root.classList.remove("dealt");
  root.replaceChildren();
  root.style.height = height + TOP + 160 + "px";
  for (const it of placed) {
    const p = bySlug[it.slug], m = it.media, t = it.text;
    const img = new Image();
    Object.assign(img, { src: p.img.src, alt: "", loading: "lazy", decoding: "async", className: "item-media" });
    img.style.cssText = `left:${m.x}px;top:${TOP + m.y}px;width:${m.w}px;height:${m.h}px;transform:rotate(${m.rot}deg)`;
    const d = document.createElement("div");
    d.className = "item-text";
    d.style.cssText = `left:${t.x}px;top:${TOP + t.y}px;width:${t.w}px;--age:${p.k}`;
    d.innerHTML = '<p class="t"></p><p class="mono"></p><p class="ex"></p>';
    const [title, meta, ex] = d.children;
    title.textContent = p.title;
    meta.textContent = `${p.type} · ${p.date}`;
    if (p.isNew) meta.insertAdjacentHTML("afterbegin", '<span class="dot">● </span>');
    ex.textContent = p.excerpt;
    for (const el of [img, d]) {
      el.dataset.slug = p.slug;
      el.onclick = () => openPost(p);
      el.onmouseenter = () => kin(p);
      el.onmouseleave = () => kin(null);
    }
    root.append(img, d);
  }
  // positions for the year strip, straight from the layout (no DOM reads on scroll)
  rows = placed.map(it => ({ y: TOP + it.text.y, t: Date.parse(bySlug[it.slug].iso) }));
  // each print's kin: same series, or a shared technique
  kinOf = new Map(shown.map(p => [p.slug, new Set(shown.filter(q => q !== p && q.rel.some(k => p.rel.includes(k))).map(q => q.slug))]));
  const inLens = new Set(shown.map(p => p.slug));
  for (const t of strip.querySelectorAll(".tick")) t.classList.toggle("out", !inLens.has(t.dataset.slug));
  requestAnimationFrame(() => root.classList.add("dealt"));
  document.getElementById("seedtag").textContent = `seed “${seed}” · s shuffles · r opens a random print`;
  for (const a of document.querySelectorAll("#lenses a")) a.classList.toggle("on", a.dataset.lens === lens);
  updateHere();
}

// hovering a print lifts its kin wherever they lie
function kin(p) {
  if (p === hovered) return;
  hovered = p;
  const root = document.getElementById("stream"), rel = p ? kinOf.get(p.slug) : new Set();
  root.classList.toggle("relating", !!p);
  for (const el of root.children) {
    el.classList.toggle("kin", rel.has(el.dataset.slug));
    el.classList.toggle("self", !!p && el.dataset.slug === p.slug);
  }
}

// lenses: the same table, dealt again with fewer prints
function buildLenses() {
  const nav = document.getElementById("lenses");
  for (const l of [{ key: "all", label: "all" }, ...lenses]) {
    const a = document.createElement("a");
    a.className = "mono";
    a.href = l.key === "all" ? "?" : `?lens=${l.key}`;
    a.dataset.lens = l.key;
    a.textContent = l.label;
    a.onclick = e => { e.preventDefault(); lens = l.key; syncURL(); render(); scrollTo({ top: 0 }); };
    nav.appendChild(a);
  }
}

// the year strip: film edge printing. one hairline per post, a year where a year starts.
// lens-filtered posts fade; dragging snaps to a post.
const dates = items.map(p => Date.parse(p.iso));
const y0 = new Date(Math.min(...dates)).getFullYear(), y1 = new Date().getFullYear() + 1;
const t0 = Date.UTC(y0, 0, 1), t1 = Date.UTC(y1, 0, 1);
const pos = t => (1 - (t - t0) / (t1 - t0)) * 100;
const strip = document.getElementById("years");
const here = document.createElement("span");
const narrow = matchMedia("(max-width: 800px)");
narrow.addEventListener("change", () => render());

function buildYears() {
  for (let y = y0; y < y1; y++) strip.insertAdjacentHTML("beforeend", `<span class="yr" style="--p:${pos(Date.UTC(y, 0, 1))}%">${y}</span>`);
  for (const p of items) {
    const a = document.createElement("a");
    a.className = "tick"; a.href = `/posts/${p.slug}/`; a.dataset.slug = p.slug; a.title = `${p.title} · ${p.date}`;
    a.style.setProperty("--p", pos(Date.parse(p.iso)) + "%");
    a.onclick = e => { e.preventDefault(); openPost(p); };
    strip.appendChild(a);
  }
  here.className = "here";
  strip.appendChild(here);
  let rect = null;
  const target = e => {
    const f = narrow.matches ? 1 - (e.clientX - rect.left) / rect.width : (e.clientY - rect.top) / rect.height;
    return nearest(rows, "t", t1 - Math.min(1, Math.max(0, f)) * (t1 - t0));
  };
  const go = (row, smooth) => scrollTo({ top: row.y - innerHeight / 2 + 80, behavior: smooth ? "smooth" : "auto" });
  strip.addEventListener("pointerdown", e => {
    if (e.target.closest(".tick") || !rows.length) return;
    rect = strip.getBoundingClientRect();
    strip.setPointerCapture(e.pointerId);
    go(target(e));
  });
  strip.addEventListener("pointermove", e => rect && go(target(e)));
  strip.addEventListener("pointerup", e => { if (rect) go(target(e), true); rect = null; });  // snap to a post
  let queued = false;
  addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; updateHere(); }); } }, { passive: true });
}

function updateHere() {
  if (rows.length) here.style.setProperty("--p", pos(nearest(rows, "y", scrollY + innerHeight / 2).t) + "%");
}

buildLenses();
buildYears();
render();
addEventListener("keydown", e => {
  if (!plainKey(e)) return;
  if (e.key === "s") { seed = Math.random().toString(36).slice(2, 7); syncURL(); render(); }
  if (e.key === "r") openRandom(shown);
});
