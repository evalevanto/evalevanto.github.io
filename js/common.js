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
