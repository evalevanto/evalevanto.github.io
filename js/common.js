// Shared: page data, and the silent title card that plays before opening a post.
const DATA = JSON.parse(document.getElementById("data")?.textContent || "null");

function openPost(p) {
  const tc = document.createElement("div");
  tc.className = "titlecard";
  tc.innerHTML = "<div><h1></h1><p></p><p class=\"mono\"></p></div>";
  const [h, sub, meta] = tc.querySelectorAll("h1, p");
  h.textContent = p.title;
  sub.textContent = p.sub || "";
  meta.textContent = `session ${p.s} · ${p.date}`;
  document.body.appendChild(tc);
  requestAnimationFrame(() => tc.classList.add("on"));
  setTimeout(() => location.href = `/posts/${p.slug}/`, 1500);
}

const openRandom = list => list.length && openPost(list[Math.floor(Math.random() * list.length)]);
const plainKey = e => !(e.metaKey || e.ctrlKey || e.altKey);

// leave for another page: the CSS slide (.5s, see .leaving/.returning) plays, then the page changes
const TRAVEL_MS = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 500;
let traveling = false;
function travel(url, cls) {
  if (traveling) return;
  traveling = true;
  document.body.classList.add(cls);
  setTimeout(() => location.href = url, TRAVEL_MS);
}

// scroll intent from a wheel or a finger, as a vertical delta (positive = down)
function onScrollIntent(fn) {
  addEventListener("wheel", e => fn(e.deltaY), { passive: true });
  let ty = null;
  addEventListener("touchstart", e => ty = e.touches[0].clientY, { passive: true });
  addEventListener("touchmove", e => { fn((ty - e.touches[0].clientY) * 2); ty = e.touches[0].clientY; }, { passive: true });
}

// "one of 12 in …" at the end of a post opens the stream through that lens, without putting it in the address
document.addEventListener("click", e => {
  const a = e.target.closest("a[data-lens]");
  if (a) try { sessionStorage.setItem("lens", a.dataset.lens); } catch {}
});
