// ============ УТИЛИТЫ ============
(function (G) {
  const U = {};

  U.clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.rand = (a, b) => a + Math.random() * (b - a);
  U.randInt = (a, b) => Math.floor(U.rand(a, b + 1));
  U.pick = arr => arr[Math.floor(Math.random() * arr.length)];
  U.chance = p => Math.random() < p;

  U.dist2 = (x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; };
  U.dist = (x1, y1, x2, y2) => Math.sqrt(U.dist2(x1, y1, x2, y2));
  U.angle = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);

  U.massToR = mass => Math.sqrt(Math.max(mass, 1)) * 4;
  U.rToMass = r => (r / 4) * (r / 4);

  U.fmt = n => {
    n = Math.floor(n);
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e4) return (n / 1e3).toFixed(1) + 'k';
    return String(n);
  };

  U.time = s => {
    s = Math.max(0, Math.floor(s));
    const m = Math.floor(s / 60);
    return m + ':' + String(s % 60).padStart(2, '0');
  };

  // rgb-строки
  U.rgba = (r, g, b, a) => `rgba(${r|0},${g|0},${b|0},${a})`;
  U.parseColor = str => {
    if (str[0] === '#') return U.hexRgb(str);
    const m = String(str).match(/\d+/g);
    return m && m.length >= 3 ? [+m[0], +m[1], +m[2]] : [180, 180, 180];
  };
  U.hexRgb = hex => {
    const h = hex.replace('#', '');
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
  };
  U.shade = (hex, k) => { // k>1 светлее, k<1 темнее
    const [r, g, b] = U.parseColor(hex);
    return U.rgba(U.clamp(r * k, 0, 255), U.clamp(g * k, 0, 255), U.clamp(b * k, 0, 255), 1);
  };
  U.hexA = (hex, a) => { const [r, g, b] = U.parseColor(hex); return U.rgba(r, g, b, a); };

  // круг vs прямоугольник — глубина проникновения + нормаль
  U.circleRect = (cx, cy, r, rx, ry, rw, rh) => {
    const nx = U.clamp(cx, rx, rx + rw);
    const ny = U.clamp(cy, ry, ry + rh);
    const dx = cx - nx, dy = cy - ny;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) return null;
    if (d2 > 1e-9) {
      const d = Math.sqrt(d2);
      return { depth: r - d, nx: dx / d, ny: dy / d, px: nx, py: ny };
    }
    // центр внутри прямоугольника — выталкиваем по кратчайшей грани
    const left = cx - rx, right = rx + rw - cx, top = cy - ry, bottom = ry + rh - cy;
    const m = Math.min(left, right, top, bottom);
    if (m === left) return { depth: r + left, nx: -1, ny: 0, px: rx, py: cy };
    if (m === right) return { depth: r + right, nx: 1, ny: 0, px: rx + rw, py: cy };
    if (m === top) return { depth: r + top, nx: 0, ny: -1, px: cx, py: ry };
    return { depth: r + bottom, nx: 0, ny: 1, px: cx, py: ry + rh };
  };

  U.hexHsl = (h, s, l) => { // h 0..360 → css rgb
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(Math.min(k(n) - 3, 9 - k(n)), 1));
    return `rgb(${Math.round(f(0)*255)},${Math.round(f(8)*255)},${Math.round(f(4)*255)})`;
  };

  G.U = U;
})(window.G = window.G || {});
