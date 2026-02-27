/**
 * WeatherParticleSystem - 天气粒子视觉效果系统
 * 支持雨、暴风雨、雪、龙卷风、雾气等天气的粒子渲染
 */

export type WeatherType = 'clear' | 'rain' | 'storm' | 'snow' | 'tornado' | 'fog';
interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; alpha: number; life: number; maxLife: number;
  active: boolean; angle: number; param: number;
}

const MAX_RAIN = 500;
const MAX_SPLASH = 50;
const MAX_SNOW = 200;
const MAX_TORNADO = 100;
const MAX_FOG = 20;
const TRANSITION_TICKS = 60;
// Pre-computed tornado color palette (gray 80-139 quantized to 12 steps) to avoid template literals in render loop
const TORNADO_COLORS: string[] = ((): string[] => {
  const cols: string[] = []
  for (let i = 0; i < 12; i++) {
    const gray = 80 + Math.round(i * 5)
    cols.push(`rgb(${gray + 40},${gray + 20},${gray})`)
  }
  return cols
})()
function createPool(count: number): Particle[] {
  const pool: Particle[] = [];
  for (let i = 0; i < count; i++) {
    pool.push({ x: 0, y: 0, vx: 0, vy: 0, size: 1, alpha: 1, life: 0, maxLife: 0, active: false, angle: 0, param: 0 });
  }
  return pool;
}
function resetParticle(p: Particle): void {
  p.x = 0; p.y = 0; p.vx = 0; p.vy = 0;
  p.size = 1; p.alpha = 1; p.life = 0; p.maxLife = 0; p.active = false; p.angle = 0; p.param = 0;
}

export class WeatherParticleSystem {
  private currentWeather: WeatherType = 'clear';
  private targetWeather: WeatherType = 'clear';
  private transitionProgress = 1;
  private intensity = 1;

  private rainPool = createPool(MAX_RAIN);
  private splashPool = createPool(MAX_SPLASH);
  private snowPool = createPool(MAX_SNOW);
  private tornadoPool = createPool(MAX_TORNADO);
  private fogPool = createPool(MAX_FOG);

  private lightningTimer = 0;
  private lightningFlash = 0;
  private lightningSegments: number[] = [];
  private tornadoCenterX = 0;
  private tornadoCenterY = 0;

  /** Reusable lightning style pairs [color, lineWidth] — avoids array alloc per frame */
  private readonly _lightningStyles: [string, number][] = [['', 6], ['', 2]];
  /** Cached splash style keyed by alpha to reduce template-literal GC */
  private _cachedSplashAlpha = -1;
  private _cachedSplashStyle = '';
  /** Cached flash overlay style */
  private _cachedFlashAlpha = -1;
  private _cachedFlashStyle = '';

  /** 切换天气类型，触发平滑过渡 */
  setWeather(type: WeatherType): void {
    if (type === this.targetWeather) return;
    this.targetWeather = type;
    this.transitionProgress = 0;
  }

  /** 获取当前目标天气 */
  getWeather(): WeatherType {
    return this.targetWeather;
  }

  /** 设置天气强度 0-1 */
  setIntensity(intensity: number): void {
    this.intensity = Math.max(0, Math.min(1, intensity));
  }

  /** 获取当前活跃粒子总数 */
  getParticleCount(): number {
    let count = 0;
    const pools = [this.rainPool, this.splashPool, this.snowPool, this.tornadoPool, this.fogPool];
    for (let p = 0; p < pools.length; p++) {
      const pool = pools[p];
      for (let i = 0; i < pool.length; i++) {
        if (pool[i].active) count++;
      }
    }
    return count;
  }

  /** 每 tick 更新粒子状态 */
  update(tick: number, windX: number, windY: number): void {
    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + 1 / TRANSITION_TICKS);
      if (this.transitionProgress >= 1) {
        this.currentWeather = this.targetWeather;
      }
    }

    const newAlpha = this.transitionProgress < 1 ? this.transitionProgress : 1;
    const activeWeather = this.targetWeather;
    const prevWeather = this.currentWeather;

    if (activeWeather === 'rain' || activeWeather === 'storm') {
      this.updateRain(tick, windX, newAlpha, activeWeather === 'storm');
    } else if (prevWeather === 'rain' || prevWeather === 'storm') {
      this.fadePool(this.rainPool);
      this.fadePool(this.splashPool);
    }

    if (activeWeather === 'storm') {
      this.updateLightning(tick);
    } else {
      this.lightningFlash = 0;
    }

    if (activeWeather === 'snow') {
      this.updateSnow(tick, windX, newAlpha);
    } else if (prevWeather === 'snow') {
      this.fadePool(this.snowPool);
    }

    if (activeWeather === 'tornado') {
      this.updateTornado(tick, newAlpha);
    } else if (prevWeather === 'tornado') {
      this.fadePool(this.tornadoPool);
    }

    if (activeWeather === 'fog') {
      this.updateFog(tick, windX, newAlpha);
    } else if (prevWeather === 'fog') {
      this.fadePool(this.fogPool);
    }

    if (activeWeather === 'clear' && this.transitionProgress >= 1) {
      this.fadePool(this.rainPool); this.fadePool(this.splashPool);
      this.fadePool(this.snowPool); this.fadePool(this.tornadoPool);
      this.fadePool(this.fogPool);
    }
  }

  /** 渲染所有天气粒子到 Canvas */
  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const w = this.targetWeather;
    if (w === 'rain' || w === 'storm') this.renderRain(ctx, width, height);
    if (w === 'storm') this.renderLightning(ctx, width, height);
    if (w === 'snow') this.renderSnow(ctx);
    if (w === 'tornado') this.renderTornado(ctx, width, height);
    if (w === 'fog') this.renderFog(ctx);
    // 过渡期间也渲染旧天气残留粒子
    if (this.transitionProgress < 1) {
      const prev = this.currentWeather;
      if (prev !== w) {
        if (prev === 'rain' || prev === 'storm') this.renderRain(ctx, width, height);
        if (prev === 'snow') this.renderSnow(ctx);
        if (prev === 'tornado') this.renderTornado(ctx, width, height);
        if (prev === 'fog') this.renderFog(ctx);
      }
    }
  }

  // --- 雨滴 ---
  private updateRain(_tick: number, windX: number, alpha: number, isStorm: boolean): void {
    const maxCount = isStorm ? MAX_RAIN : 300;
    const angle = isStorm ? 0.4 : 0.2;
    const speed = isStorm ? 18 : 12;
    const spawnRate = this.intensity * alpha;

    for (let i = 0; i < this.rainPool.length; i++) {
      const p = this.rainPool[i];
      if (!p.active) {
        if (i >= maxCount) continue;
        if (Math.random() > spawnRate * 0.3) continue;
        p.active = true;
        p.x = Math.random() * 1200;
        p.y = -Math.random() * 100;
        p.vx = -Math.sin(angle) * speed + windX * 2;
        p.vy = Math.cos(angle) * speed;
        p.size = 1 + Math.random();
        p.alpha = 0.4 + Math.random() * 0.3;
        p.life = 0; p.maxLife = 60 + Math.random() * 40;
        continue;
      }
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      if (p.y > 800 || p.life > p.maxLife) {
        this.spawnSplash(p.x, 800);
        resetParticle(p);
      }
    }

    for (let i = 0; i < this.splashPool.length; i++) {
      const s = this.splashPool[i];
      if (!s.active) continue;
      s.life++;
      s.size += 0.5;
      s.alpha -= 0.08;
      if (s.alpha <= 0 || s.life > 10) resetParticle(s);
    }
  }

  private spawnSplash(x: number, y: number): void {
    for (let i = 0; i < this.splashPool.length; i++) {
      const s = this.splashPool[i];
      if (!s.active) {
        s.active = true; s.x = x; s.y = y;
        s.size = 1; s.alpha = 0.5; s.life = 0; s.maxLife = 10;
        return;
      }
    }
  }

  private renderRain(ctx: CanvasRenderingContext2D, _w: number, _h: number): void {
    ctx.strokeStyle = 'rgba(120,160,255,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < this.rainPool.length; i++) {
      const p = this.rainPool[i];
      if (!p.active) continue;
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.vx * 0.3, p.y + p.vy * 0.3);
    }
    ctx.stroke();

    for (let i = 0; i < this.splashPool.length; i++) {
      const s = this.splashPool[i];
      if (!s.active) continue;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      if (s.alpha !== this._cachedSplashAlpha) {
        this._cachedSplashAlpha = s.alpha;
        this._cachedSplashStyle = `rgba(150,190,255,${s.alpha})`;
      }
      ctx.strokeStyle = this._cachedSplashStyle;
      ctx.stroke();
    }
  }

  // --- 闪电 ---
  private updateLightning(tick: number): void {
    if (this.lightningFlash > 0) {
      this.lightningFlash--;
      return;
    }
    this.lightningTimer++;
    if (this.lightningTimer > 60 + Math.random() * 120) {
      this.lightningTimer = 0;
      this.lightningFlash = 3 + Math.floor(Math.random() * 3);
      this.generateLightningPath();
    }
  }

  private generateLightningPath(): void {
    this.lightningSegments.length = 0;
    let x = 100 + Math.random() * 1000;
    let y = 0;
    const targetY = 200 + Math.random() * 500;
    while (y < targetY) {
      this.lightningSegments.push(x, y);
      x += (Math.random() - 0.5) * 60;
      y += 20 + Math.random() * 30;
    }
    this.lightningSegments.push(x, y);
  }

  private renderLightning(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (this.lightningFlash <= 0) return;
    const flashAlpha = this.lightningFlash / 5;
    // Cache flash overlay style
    if (flashAlpha !== this._cachedFlashAlpha) {
      this._cachedFlashAlpha = flashAlpha;
      this._cachedFlashStyle = `rgba(255,255,255,${flashAlpha * 0.15})`;
      // Update reusable lightning stroke styles in-place
      this._lightningStyles[0][0] = `rgba(200,200,255,${flashAlpha * 0.4})`;
      this._lightningStyles[1][0] = `rgba(255,255,255,${flashAlpha * 0.9})`;
    }
    ctx.fillStyle = this._cachedFlashStyle;
    ctx.fillRect(0, 0, width, height);
    if (this.lightningSegments.length < 4) return;
    for (const [color, lw] of this._lightningStyles) {
      ctx.strokeStyle = color; ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(this.lightningSegments[0], this.lightningSegments[1]);
      for (let i = 2; i < this.lightningSegments.length; i += 2) ctx.lineTo(this.lightningSegments[i], this.lightningSegments[i + 1]);
      ctx.stroke();
    }
  }

  // --- 雪花 ---
  private updateSnow(tick: number, windX: number, alpha: number): void {
    const spawnRate = this.intensity * alpha;
    for (let i = 0; i < this.snowPool.length; i++) {
      const p = this.snowPool[i];
      if (!p.active) {
        if (Math.random() > spawnRate * 0.15) continue;
        p.active = true;
        p.x = Math.random() * 1200;
        p.y = -Math.random() * 50;
        p.size = 1 + Math.random() * 3;
        p.vx = windX * 0.5;
        p.vy = 0.5 + Math.random() * 1.5;
        p.alpha = 0.6 + Math.random() * 0.4;
        p.life = 0; p.maxLife = 200 + Math.random() * 200;
        p.angle = Math.random() * Math.PI * 2;
        p.param = 0.5 + Math.random() * 1.5;
        continue;
      }
      p.angle += 0.03;
      p.x += Math.sin(p.angle) * p.param * 0.3 + p.vx;
      p.y += p.vy;
      p.life++;
      if (p.y > 800 || p.life > p.maxLife) resetParticle(p);
    }
  }

  private renderSnow(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#fff';
    for (let i = 0; i < this.snowPool.length; i++) {
      const p = this.snowPool[i];
      if (!p.active) continue;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // --- 龙卷风 ---
  private updateTornado(tick: number, alpha: number): void {
    this.tornadoCenterX = 600 + Math.sin(tick * 0.01) * 100;
    this.tornadoCenterY = 500;
    const spawnRate = this.intensity * alpha;

    for (let i = 0; i < this.tornadoPool.length; i++) {
      const p = this.tornadoPool[i];
      if (!p.active) {
        if (Math.random() > spawnRate * 0.2) continue;
        p.active = true;
        p.angle = Math.random() * Math.PI * 2;
        p.param = 10 + Math.random() * 80;
        p.x = this.tornadoCenterX + Math.cos(p.angle) * p.param;
        p.y = this.tornadoCenterY;
        p.size = 2 + Math.random() * 3;
        p.alpha = 0.5 + Math.random() * 0.5;
        p.life = 0; p.maxLife = 80 + Math.random() * 60;
        p.vx = 0; p.vy = 0;
        continue;
      }
      p.angle += 0.08 + (1 - p.param / 90) * 0.1;
      p.life++;
      const progress = p.life / p.maxLife;
      const radius = p.param * (1 - progress * 0.6);
      p.x = this.tornadoCenterX + Math.cos(p.angle) * radius;
      p.y = this.tornadoCenterY - progress * 400;
      p.alpha = (1 - progress) * 0.7;
      if (p.life > p.maxLife) resetParticle(p);
    }
  }

  private renderTornado(ctx: CanvasRenderingContext2D, _w: number, _h: number): void {
    for (let i = 0; i < this.tornadoPool.length; i++) {
      const p = this.tornadoPool[i];
      if (!p.active) continue;
      const colorIdx = Math.floor(Math.random() * 12)
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = TORNADO_COLORS[colorIdx];
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  // --- 雾气 ---
  private updateFog(_tick: number, windX: number, alpha: number): void {
    const spawnRate = this.intensity * alpha;
    for (let i = 0; i < this.fogPool.length; i++) {
      const p = this.fogPool[i];
      if (!p.active) {
        if (Math.random() > spawnRate * 0.05) continue;
        p.active = true;
        p.x = Math.random() * 1400 - 100;
        p.y = 100 + Math.random() * 600;
        p.size = 100 + Math.random() * 200;
        p.alpha = 0.05 + Math.random() * 0.1;
        p.vx = (0.2 + Math.random() * 0.3) * (windX >= 0 ? 1 : -1);
        p.vy = 0;
        p.life = 0; p.maxLife = 300 + Math.random() * 300;
        continue;
      }
      p.x += p.vx;
      p.life++;
      const fadeIn = Math.min(1, p.life / 30);
      const fadeOut = Math.max(0, 1 - (p.life - p.maxLife + 30) / 30);
      p.alpha = (0.05 + Math.random() * 0.01) * fadeIn * (p.life > p.maxLife - 30 ? fadeOut : 1);
      if (p.life > p.maxLife || p.x > 1400 || p.x < -300) resetParticle(p);
    }
  }

  private renderFog(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.fogPool.length; i++) {
      const p = this.fogPool[i];
      if (!p.active) continue;
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      gradient.addColorStop(0, `rgba(220,220,220,${p.alpha})`);
      gradient.addColorStop(1, 'rgba(220,220,220,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- 工具 ---
  private fadePool(pool: Particle[]): void {
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (!p.active) continue;
      p.alpha -= 0.02;
      if (p.alpha <= 0) resetParticle(p);
    }
  }
}
