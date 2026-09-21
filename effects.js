export function createEffects() {
  const particles = [];
  let shake = 0;

  const burst = (x, y, color, count = 8, speed = 2.8) => {
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.45;
      particles.push({ x, y, vx: Math.cos(angle) * speed * (0.5 + Math.random()), vy: Math.sin(angle) * speed - 1, life: 1, size: 2 + Math.random() * 3, color });
    }
  };

  return {
    coin: (x, y) => burst(x, y, "#fff1a8", 10, 3),
    stomp: (x, y, color) => { burst(x, y, color, 12, 3.2); shake = Math.max(shake, 5); },
    landing: (x, y) => burst(x, y, "#d4f1df", 6, 1.8),
    goal: (x, y) => { burst(x, y, "#f8c34e", 26, 4.2); shake = 4; },
    update: (dt) => {
      particles.forEach((particle) => {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vy += 0.12 * dt;
        particle.life -= 0.035 * dt;
      });
      for (let i = particles.length - 1; i >= 0; i -= 1) if (particles[i].life <= 0) particles.splice(i, 1);
      shake *= 0.86;
    },
    draw: (ctx) => {
      particles.forEach((particle) => {
        ctx.globalAlpha = Math.max(0, particle.life);
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
      });
      ctx.globalAlpha = 1;
    },
    getShake: () => shake
  };
}
