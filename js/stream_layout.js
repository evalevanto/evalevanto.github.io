// Seeded "table of prints": the same seed and posts give the same layout; a new post reshuffles gently.
// Pure function: returns placements, the page draws them.

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RULES = {
  left: 160, right: 1300, textHeight: 160,
  gaps: [[60, 3], [110, 4], [170, 3], [240, 1]],
  breathEvery: [6, 8], breath: 260,
  flipSide: 0.75, pairChance: 0.45, bleed: 0.2, tilt: 5,
};

function pick(r, weighted) {
  let x = r() * weighted.reduce((s, [, w]) => s + w, 0);
  for (const [v, w] of weighted) if ((x -= w) <= 0) return v;
  return weighted[weighted.length - 1][0];
}

// one print with its words beside it, inside the band x0..x1
function placePrint(p, r, left, y, x0, x1) {
  const rules = RULES;
  const w = 210 + r() * 110, h = w / p.img.ratio;
  let x = left ? x0 : x1 - w;
  if (r() < rules.bleed) x += left ? -100 : 100;
  const tw = Math.min(520, x1 - x0 - w - 60), gap = 40 + r() * 70;
  return {
    media: { x, y: y - 20 + r() * 40, w, h, rot: (r() * 2 - 1) * rules.tilt },
    text: { x: left ? x + w + gap : x - gap - tw, y: y + 20 + r() * 50, w: tw },
    bottom: y + Math.max(h, rules.textHeight),
  };
}

// on a phone: one print per row, drifting left and right, its words underneath
function layoutNarrow(posts, seed, width) {
  const out = [], pad = 20;
  let y = 0;
  for (const p of posts) {
    const r = rng(hash(seed + ":" + p.slug));
    const w = width * (0.52 + r() * 0.24), h = w / p.img.ratio;
    const x = pad + r() * (width - 2 * pad - w);
    out.push({ slug: p.slug, media: { x, y, w, h, rot: (r() * 2 - 1) * 3 }, text: { x: pad, y: y + h + 22, w: width - 2 * pad } });
    y += h + 22 + 150 + pick(r, [[30, 3], [70, 2], [120, 1]]);
  }
  return { items: out, height: y };
}

function layout(posts, seed, width = 1440) {
  if (width < 800) return layoutNarrow(posts, seed, width);
  const rules = RULES;
  const out = [];
  let y = 0, left = true, run = 0, nextBreath = rules.breathEvery[0];
  for (let i = 0; i < posts.length; i++) {
    const p = posts[i], q = posts[i + 1];
    const r = rng(hash(seed + ":" + p.slug));
    if (r() < rules.flipSide || run >= 1) { left = !left; run = 0; } else run++;
    let bottom;
    if (q && r() < rules.pairChance) {
      // two things share one row, side by side, staggered
      const mid = (rules.left + rules.right) / 2;
      const a = placePrint(p, r, true, y, rules.left, mid - 20);
      const b = placePrint(q, rng(hash(seed + ":" + q.slug)), true, y + 120 + r() * 160, mid + 40, rules.right);
      a.text.w = b.text.w = Math.min(a.text.w, 300);
      out.push({ slug: p.slug, ...a }, { slug: q.slug, ...b });
      bottom = Math.max(a.bottom, b.bottom);
      i++;
    } else {
      const a = placePrint(p, r, left, y, rules.left, rules.right);
      out.push({ slug: p.slug, ...a });
      bottom = a.bottom;
    }
    y = bottom + pick(r, rules.gaps);
    if (out.length >= nextBreath) {
      y += rules.breath;
      nextBreath += rules.breathEvery[0] + Math.floor(r() * (rules.breathEvery[1] - rules.breathEvery[0] + 1));
    }
  }
  return { items: out, height: y };
}
