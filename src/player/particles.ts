export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

export class Particles {
  list: Particle[] = [];
  private cap = 400;

  burst(x: number, y: number, color: string, n: number, speed = 4, rand: () => number = Math.random): void {
    for (let i = 0; i < n; i++) {
      if (this.list.length >= this.cap) this.list.shift();
      const a = rand() * Math.PI * 2;
      const s = speed * (0.3 + rand() * 0.7);
      const life = 0.35 + rand() * 0.45;
      this.list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, life, max: life, color, size: 0.08 + rand() * 0.1 });
    }
  }

  update(dt: number): void {
    let w = 0;
    for (const p of this.list) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.vy += 20 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      this.list[w++] = p;
    }
    this.list.length = w;
  }
}
