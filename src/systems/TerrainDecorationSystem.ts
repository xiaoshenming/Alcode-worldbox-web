/**
 * TerrainDecorationSystem - 地形装饰增强系统
 * 为地形添加动态视觉细节：草丛摇摆、水面波纹、岩石纹理、沙地粒子、花朵点缀
 */

type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

// 地形类型常量（与项目约定一致）
const TERRAIN_DEEP_WATER = 0;
const TERRAIN_SHALLOW_WATER = 1;
const TERRAIN_SAND = 2;
const TERRAIN_GRASS = 3;
const TERRAIN_FOREST = 4;
const TERRAIN_MOUNTAIN = 5;

const TILE_SIZE = 16;
const MAX_RIPPLES = 100;
const MAX_SAND_PARTICLES = 80;

// 伪随机哈希
function hash(x: number, y: number): number {
  let h = (x * 73856093) ^ (y * 19349663);
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = (h >> 16) ^ h;
  return (h & 0x7fffffff) / 0x7fffffff; // 0..1
}

function hashInt(x: number, y: number, seed: number): number {
  return hash(x + seed * 137, y + seed * 251);
}

// --- 数据结构 ---

interface GrassBlade {
  ox: number; // tile 内偏移
  oy: number;
  height: number;
  phase: number;
}

interface GrassTile {
  blades: GrassBlade[];
}

interface Ripple {
  x: number; // 世界像素坐标
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

interface RockCrack {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface SandParticle {
  x: number;
  y: number;
  speed: number;
  alpha: number;
}

interface Flower {
  ox: number;
  oy: number;
  color: string;
  petalCount: number;
  size: number;
}

const FLOWER_COLORS = ['#e74c3c', '#f1c40f', '#9b59b6', '#ecf0f1'];

export class TerrainDecorationSystem {
  private worldW = 0;
  private worldH = 0;
  private getTerrain: (x: number, y: number) => number = () => 0;

  private windX = 1;
  private windY = 0;
  private season = 'spring';

  // 缓存：按 tile 坐标索引
  private grassCache: Map<number, GrassTile> = new Map();
  private rockCache: Map<number, RockCrack[]> = new Map();
  private flowerCache: Map<number, Flower[]> = new Map();

  // 动态对象
  private ripples: Ripple[] = [];
  private sandParticles: SandParticle[] = [];

  private tick = 0;

  // OffscreenCanvas cache for static decorations (flowers, rocks)
  private staticCache: OffscreenCanvas | null = null;
  private staticCacheCtx: OffscreenCanvasRenderingContext2D | null = null;
  private staticCacheBounds: { sx: number; sy: number; ex: number; ey: number; camX: number; camY: number; zoom: number } | null = null;
  private staticCacheDirty = true;

  // Grass rendering frame skip
  private frameCounter = 0;
  private grassCanvas: OffscreenCanvas | null = null;
  private grassCtx: OffscreenCanvasRenderingContext2D | null = null;
  private readonly GRASS_UPDATE_INTERVAL = 3;

  // --- 公共接口 ---

  init(worldWidth: number, worldHeight: number, getTerrain: (x: number, y: number) => number): void {
    this.worldW = worldWidth;
    this.worldH = worldHeight;
    this.getTerrain = getTerrain;
    this.grassCache.clear();
    this.rockCache.clear();
    this.flowerCache.clear();
    this.ripples.length = 0;
    this.sandParticles.length = 0;
  }

  setWind(windX: number, windY: number): void {
    this.windX = windX;
    this.windY = windY;
  }

  setSeason(season: string): void {
    this.season = season;
    // 季节变化时清除花朵缓存以重新生成
    this.flowerCache.clear();
    this.staticCacheDirty = true;
  }

  update(tick: number): void {
    this.tick = tick;
    this.updateRipples();
    this.updateSandParticles();
  }

  render(
    ctx: Ctx2D,
    camX: number, camY: number, zoom: number,
    startX: number, startY: number, endX: number, endY: number
  ): void {
    const sx = Math.max(0, startX);
    const sy = Math.max(0, startY);
    const ex = Math.min(this.worldW - 1, endX);
    const ey = Math.min(this.worldH - 1, endY);
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    this.frameCounter++;

    // --- Static decorations (flowers, rock cracks) cached ---
    const boundsChanged = !this.staticCacheBounds ||
      this.staticCacheBounds.sx !== sx || this.staticCacheBounds.sy !== sy ||
      this.staticCacheBounds.ex !== ex || this.staticCacheBounds.ey !== ey ||
      this.staticCacheBounds.camX !== camX || this.staticCacheBounds.camY !== camY ||
      this.staticCacheBounds.zoom !== zoom;

    if (boundsChanged || this.staticCacheDirty) {
      if (!this.staticCache || this.staticCache.width !== width || this.staticCache.height !== height) {
        this.staticCache = new OffscreenCanvas(width, height);
        this.staticCacheCtx = this.staticCache.getContext('2d')!;
      }
      const sctx = this.staticCacheCtx!;
      sctx.clearRect(0, 0, width, height);

      for (let ty = sy; ty <= ey; ty++) {
        for (let tx = sx; tx <= ex; tx++) {
          const terrain = this.getTerrain(tx, ty);
          const px = (tx * TILE_SIZE - camX) * zoom;
          const py = (ty * TILE_SIZE - camY) * zoom;
          const sz = TILE_SIZE * zoom;

          if (terrain === TERRAIN_GRASS || terrain === TERRAIN_FOREST) {
            this.renderFlowers(sctx, tx, ty, px, py, sz);
          } else if (terrain === TERRAIN_MOUNTAIN) {
            this.renderRockCracks(sctx, tx, ty, px, py, sz);
          }
        }
      }

      this.staticCacheBounds = { sx, sy, ex, ey, camX, camY, zoom };
      this.staticCacheDirty = false;
    }

    ctx.drawImage(this.staticCache!, 0, 0);

    // --- Dynamic grass (updated every N frames) ---
    const needsGrassRedraw = boundsChanged || this.frameCounter % this.GRASS_UPDATE_INTERVAL === 0;

    if (needsGrassRedraw) {
      if (!this.grassCanvas || this.grassCanvas.width !== width || this.grassCanvas.height !== height) {
        this.grassCanvas = new OffscreenCanvas(width, height);
        this.grassCtx = this.grassCanvas.getContext('2d')!;
      }
      const gctx = this.grassCtx!;
      gctx.clearRect(0, 0, width, height);

      for (let ty = sy; ty <= ey; ty++) {
        for (let tx = sx; tx <= ex; tx++) {
          const terrain = this.getTerrain(tx, ty);
          if (terrain === TERRAIN_GRASS || terrain === TERRAIN_FOREST) {
            const px = (tx * TILE_SIZE - camX) * zoom;
            const py = (ty * TILE_SIZE - camY) * zoom;
            const sz = TILE_SIZE * zoom;
            this.renderGrass(gctx, tx, ty, px, py, sz);
          }
        }
      }
    }

    if (this.grassCanvas) {
      ctx.drawImage(this.grassCanvas, 0, 0);
    }

    // 渲染波纹（全局）
    this.renderRipples(ctx, camX, camY, zoom);
    // 渲染沙粒（全局）
    this.renderSandParticles(ctx, camX, camY, zoom);
  }

  getActiveParticleCount(): number {
    return this.ripples.length + this.sandParticles.length;
  }

  // --- 草丛 ---

  private getGrassTile(tx: number, ty: number): GrassTile {
    const key = ty * this.worldW + tx;
    let cached = this.grassCache.get(key);
    if (cached) return cached;

    const count = 2 + Math.floor(hash(tx, ty) * 3); // 2-4
    const blades: GrassBlade[] = [];
    for (let i = 0; i < count; i++) {
      blades.push({
        ox: hashInt(tx, ty, i * 3) * TILE_SIZE,
        oy: hashInt(tx, ty, i * 3 + 1) * TILE_SIZE * 0.5 + TILE_SIZE * 0.4,
        height: 4 + hashInt(tx, ty, i * 3 + 2) * 6,
        phase: hashInt(tx, ty, i * 7) * Math.PI * 2,
      });
    }
    cached = { blades };
    this.grassCache.set(key, cached);
    return cached;
  }

  private renderGrass(
    ctx: Ctx2D, tx: number, ty: number,
    px: number, py: number, sz: number
  ): void {
    const tile = this.getGrassTile(tx, ty);
    const scale = sz / TILE_SIZE;
    const windAngle = Math.atan2(this.windY, this.windX);
    const windStrength = Math.sqrt(this.windX * this.windX + this.windY * this.windY);

    ctx.strokeStyle = '#2d8a4e';
    ctx.lineWidth = Math.max(1, scale * 1.2);

    for (const blade of tile.blades) {
      const sway = Math.sin(this.tick * 0.03 + blade.phase + windAngle) * windStrength * 3;
      const bx = px + blade.ox * scale;
      const by = py + blade.oy * scale;
      const tipX = bx + sway * scale;
      const tipY = by - blade.height * scale;
      const cpX = bx + sway * 0.5 * scale;
      const cpY = by - blade.height * 0.6 * scale;

      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(cpX, cpY, tipX, tipY);
      ctx.stroke();
    }
  }

  // --- 水面波纹 ---

  private updateRipples(): void {
    // 移除过期波纹
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += 0.3;
      r.alpha -= 0.008;
      if (r.alpha <= 0 || r.radius >= r.maxRadius) {
        this.ripples[i] = this.ripples[this.ripples.length - 1];
        this.ripples.pop();
      }
    }

    // 随机生成新波纹
    if (this.ripples.length < MAX_RIPPLES && this.tick % 8 === 0) {
      // 用 tick 做伪随机选取水 tile
      const rx = Math.floor(hash(this.tick, 0) * this.worldW);
      const ry = Math.floor(hash(0, this.tick) * this.worldH);
      const terrain = this.getTerrain(rx, ry);
      if (terrain === TERRAIN_DEEP_WATER || terrain === TERRAIN_SHALLOW_WATER) {
        this.ripples.push({
          x: rx * TILE_SIZE + hash(this.tick, 1) * TILE_SIZE,
          y: ry * TILE_SIZE + hash(this.tick, 2) * TILE_SIZE,
          radius: 1,
          maxRadius: 8 + hash(this.tick, 3) * 8,
          alpha: 0.6,
        });
      }
    }
  }

  private renderRipples(
    ctx: Ctx2D, camX: number, camY: number, zoom: number
  ): void {
    ctx.lineWidth = Math.max(0.5, zoom * 0.8);
    for (const r of this.ripples) {
      const sx = (r.x - camX) * zoom;
      const sy = (r.y - camY) * zoom;
      ctx.strokeStyle = `rgba(255,255,255,${r.alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, r.radius * zoom, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // --- 岩石纹理 ---

  private getRockCracks(tx: number, ty: number): RockCrack[] {
    const key = ty * this.worldW + tx;
    let cached = this.rockCache.get(key);
    if (cached) return cached;

    const count = 1 + Math.floor(hash(tx, ty) * 3); // 1-3 条裂纹
    const cracks: RockCrack[] = [];
    for (let i = 0; i < count; i++) {
      cracks.push({
        x1: hashInt(tx, ty, i * 4) * TILE_SIZE,
        y1: hashInt(tx, ty, i * 4 + 1) * TILE_SIZE,
        x2: hashInt(tx, ty, i * 4 + 2) * TILE_SIZE,
        y2: hashInt(tx, ty, i * 4 + 3) * TILE_SIZE,
      });
    }
    cached = cracks;
    this.rockCache.set(key, cached);
    return cached;
  }

  private renderRockCracks(
    ctx: Ctx2D, tx: number, ty: number,
    px: number, py: number, sz: number
  ): void {
    const cracks = this.getRockCracks(tx, ty);
    const scale = sz / TILE_SIZE;

    ctx.strokeStyle = 'rgba(30,20,10,0.35)';
    ctx.lineWidth = Math.max(0.5, scale * 0.8);

    for (const c of cracks) {
      ctx.beginPath();
      ctx.moveTo(px + c.x1 * scale, py + c.y1 * scale);
      ctx.lineTo(px + c.x2 * scale, py + c.y2 * scale);
      ctx.stroke();
    }
  }

  // --- 沙地粒子 ---

  private updateSandParticles(): void {
    // 更新现有粒子
    for (let i = this.sandParticles.length - 1; i >= 0; i--) {
      const p = this.sandParticles[i];
      p.x += this.windX * p.speed;
      p.y += this.windY * p.speed * 0.3;
      p.alpha -= 0.005;

      // 检查是否还在沙地上
      const tx = Math.floor(p.x / TILE_SIZE);
      const ty = Math.floor(p.y / TILE_SIZE);
      if (
        p.alpha <= 0 ||
        tx < 0 || tx >= this.worldW || ty < 0 || ty >= this.worldH ||
        this.getTerrain(tx, ty) !== TERRAIN_SAND
      ) {
        this.sandParticles[i] = this.sandParticles[this.sandParticles.length - 1];
        this.sandParticles.pop();
      }
    }

    // 生成新粒子
    if (this.sandParticles.length < MAX_SAND_PARTICLES && this.tick % 4 === 0) {
      const rx = Math.floor(hash(this.tick + 99, 7) * this.worldW);
      const ry = Math.floor(hash(7, this.tick + 99) * this.worldH);
      if (
        rx >= 0 && rx < this.worldW && ry >= 0 && ry < this.worldH &&
        this.getTerrain(rx, ry) === TERRAIN_SAND
      ) {
        this.sandParticles.push({
          x: rx * TILE_SIZE + hash(this.tick, 50) * TILE_SIZE,
          y: ry * TILE_SIZE + TILE_SIZE * 0.8 + hash(this.tick, 51) * TILE_SIZE * 0.2,
          speed: 0.3 + hash(this.tick, 52) * 0.7,
          alpha: 0.5 + hash(this.tick, 53) * 0.3,
        });
      }
    }
  }

  private renderSandParticles(
    ctx: Ctx2D, camX: number, camY: number, zoom: number
  ): void {
    const r = Math.max(1, zoom * 1.5);
    for (const p of this.sandParticles) {
      const sx = (p.x - camX) * zoom;
      const sy = (p.y - camY) * zoom;
      ctx.fillStyle = `rgba(210,180,100,${p.alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- 花朵点缀 ---

  private getFlowers(tx: number, ty: number): Flower[] {
    const key = ty * this.worldW + tx;
    let cached = this.flowerCache.get(key);
    if (cached) return cached;

    const flowers: Flower[] = [];

    if (this.season === 'winter') {
      this.flowerCache.set(key, flowers);
      return flowers;
    }

    // 春季概率更高
    const chance = this.season === 'spring' ? 0.4 : 0.15;
    if (hash(tx + 500, ty + 500) > chance) {
      this.flowerCache.set(key, flowers);
      return flowers;
    }

    const count = this.season === 'spring'
      ? 1 + Math.floor(hashInt(tx, ty, 80) * 3)
      : 1;

    for (let i = 0; i < count; i++) {
      const colorIdx = Math.floor(hashInt(tx, ty, 90 + i) * FLOWER_COLORS.length);
      flowers.push({
        ox: hashInt(tx, ty, 100 + i) * TILE_SIZE,
        oy: hashInt(tx, ty, 110 + i) * TILE_SIZE,
        color: FLOWER_COLORS[colorIdx],
        petalCount: 4 + Math.floor(hashInt(tx, ty, 120 + i) * 3),
        size: 1.5 + hashInt(tx, ty, 130 + i) * 1.5,
      });
    }

    this.flowerCache.set(key, flowers);
    return flowers;
  }

  private renderFlowers(
    ctx: Ctx2D, tx: number, ty: number,
    px: number, py: number, sz: number
  ): void {
    const flowers = this.getFlowers(tx, ty);
    if (flowers.length === 0) return;

    const scale = sz / TILE_SIZE;

    for (const f of flowers) {
      const cx = px + f.ox * scale;
      const cy = py + f.oy * scale;
      const r = f.size * scale;

      // 花瓣
      ctx.fillStyle = f.color;
      const step = (Math.PI * 2) / f.petalCount;
      for (let i = 0; i < f.petalCount; i++) {
        const angle = step * i;
        const petalX = cx + Math.cos(angle) * r;
        const petalY = cy + Math.sin(angle) * r;
        ctx.beginPath();
        ctx.arc(petalX, petalY, r * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // 花心
      ctx.fillStyle = '#f39c12';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
