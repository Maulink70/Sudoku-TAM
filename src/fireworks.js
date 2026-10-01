// Feux d'artifice sur un <canvas> plein écran.
export const Fireworks = (() => {
  let canvas;
  let ctx;
  let raf = 0;
  let running = false;
  let rockets = [];
  let particles = [];
  let lastLaunch = 0;
  let dpr = 1;
  let onExplode = null;

  const rand = (a, b) => a + Math.random() * (b - a);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
  }

  function launch() {
    const w = canvas.width;
    const h = canvas.height;
    rockets.push({
      x: rand(w * 0.15, w * 0.85),
      y: h,
      vx: rand(-1, 1) * dpr,
      vy: -rand(h * 0.011, h * 0.015),
      targetY: rand(h * 0.12, h * 0.45),
      hue: Math.floor(rand(0, 360)),
    });
  }

  function explode(r) {
    if (onExplode) onExplode();
    const count = Math.floor(rand(60, 100));
    const speed = rand(2.5, 5) * dpr;
    const ring = Math.random() < 0.3;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + rand(-0.05, 0.05);
      const s = ring ? speed : speed * rand(0.2, 1);
      particles.push({
        x: r.x,
        y: r.y,
        vx: Math.cos(angle) * s,
        vy: Math.sin(angle) * s,
        life: 1,
        decay: rand(0.008, 0.016),
        hue: r.hue + rand(-25, 25),
        size: rand(1.5, 3) * dpr,
      });
    }
  }

  function frame(t) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (t - lastLaunch > rand(280, 650)) {
      launch();
      if (Math.random() < 0.35) launch();
      lastLaunch = t;
    }

    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'lighter';

    rockets = rockets.filter((r) => {
      r.x += r.vx;
      r.y += r.vy;
      r.vy += 0.06 * dpr;
      ctx.fillStyle = `hsl(${r.hue},100%,70%)`;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 2.5 * dpr, 0, Math.PI * 2);
      ctx.fill();
      if (r.y <= r.targetY || r.vy >= 0) {
        explode(r);
        return false;
      }
      return true;
    });

    particles = particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.985;
      p.vy = p.vy * 0.985 + 0.045 * dpr;
      p.life -= p.decay;
      if (p.life <= 0) return false;
      ctx.fillStyle = `hsla(${p.hue},100%,${55 + 20 * p.life}%,${p.life})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      return true;
    });
  }

  function start(el, options = {}) {
    canvas = el;
    onExplode = options.onExplode || null;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    rockets = [];
    particles = [];
    running = true;
    lastLaunch = 0;
    for (let i = 0; i < 3; i++) launch();
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  return { start, stop };
})();
