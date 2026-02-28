/**
 * DayNightRenderer — 昼夜光照渲染系统
 * 在主渲染循环中调用，叠加昼夜光照、火把光源和月光效果。
 */

const TORCH_BUILDING_TYPES = new Set(['TOWER', 'CASTLE', 'TEMPLE']);
const CYCLE_REDRAW_THRESHOLD = 0.005;

/**
 * Pre-built rgba string cache to avoid template literal allocations on hot paths.
 * Key = "r,g,b,a" (alpha rounded to 2 decimals), value = "rgba(r,g,b,a)" string.
 */
const _rgbaCache = new Map<string, string>();

/** Return a cached rgba() string — zero allocation on cache hit. */
function rgbaCached(r: number, g: number, b: number, a: number): string {
  // Round alpha to 2 decimal places to keep cache bounded
  const aRound = Math.round(a * 100) / 100;
  const key = `${r},${g},${b},${aRound}`;
  let v = _rgbaCache.get(key);
  if (v === undefined) {
    v = `rgba(${r},${g},${b},${aRound})`;
    _rgbaCache.set(key, v);
    // Prevent unbounded growth — very unlikely to exceed this in practice
    if (_rgbaCache.size > 512) _rgbaCache.clear();
  }
  return v;
}

export class DayNightRenderer {
  private offscreen: OffscreenCanvas | null = null;
  private offCtx: OffscreenCanvasRenderingContext2D | null = null;
  private cachedCycle = -1;
  private cachedIsDay = true;
  private cachedWidth = 0;
  private cachedHeight = 0;
  private flickerTime = 0;

  /** Reusable overlay object — avoids allocating a new {r,g,b,a} every frame */
  private readonly _overlay = { r: 0, g: 0, b: 0, a: 0 };

  /** 计算光照参数：颜色 + alpha（写入 this._overlay，零分配） */
  private computeOverlay(cycle: number, isDay: boolean): { r: number; g: number; b: number; a: number } {
    const o = this._overlay;
    // cycle: 0 = 午夜, 0.25 = 黎明, 0.5 = 正午, 0.75 = 黄昏
    if (isDay) {
      // 黎明/黄昏过渡区间
      const dawnStart = 0.2, dawnEnd = 0.3;
      const duskStart = 0.7, duskEnd = 0.8;

      if (cycle >= dawnStart && cycle < dawnEnd) {
        // 黎明：橙色调渐退
        const t = (cycle - dawnStart) / (dawnEnd - dawnStart);
        o.r = 255; o.g = 180; o.b = 80; o.a = 0.2 * (1 - t);
        return o;
      }
      if (cycle >= duskStart && cycle < duskEnd) {
        // 黄昏：橙色调渐入
        const t = (cycle - duskStart) / (duskEnd - duskStart);
        o.r = 255; o.g = 160; o.b = 60; o.a = 0.1 + 0.1 * t;
        return o;
      }
      // 白天：无叠加
      o.r = 0; o.g = 0; o.b = 0; o.a = 0;
      return o;
    }

    // 夜晚：深蓝色叠加，越接近午夜越深
    const midDist = Math.abs(cycle - 0.0) < Math.abs(cycle - 1.0) ? Math.abs(cycle) : Math.abs(1 - cycle);
    const nightDepth = 1 - midDist * 2; // 0~1, 午夜最深
    o.r = 10; o.g = 15; o.b = 50;
    o.a = 0.3 + 0.2 * Math.max(0, Math.min(1, nightDepth));
    return o;
  }

  /** 确保 OffscreenCanvas 尺寸匹配 */
  private ensureOffscreen(w: number, h: number): void {
    if (!this.offscreen || this.cachedWidth !== w || this.cachedHeight !== h) {
      this.offscreen = new OffscreenCanvas(w, h);
      this.offCtx = this.offscreen.getContext('2d');
      this.cachedWidth = w;
      this.cachedHeight = h;
      this.cachedCycle = -1; // 强制重绘
    }
  }

  /** 主光照叠加层渲染 */
  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    dayNightCycle: number,
    isDay: boolean
  ): void {
    const overlay = this.computeOverlay(dayNightCycle, isDay);
    if (overlay.a <= 0) return;

    this.ensureOffscreen(width, height);
    const needsRedraw =
      Math.abs(dayNightCycle - this.cachedCycle) > CYCLE_REDRAW_THRESHOLD ||
      isDay !== this.cachedIsDay;

    if (needsRedraw && this.offCtx) {
      const oc = this.offCtx;
      oc.clearRect(0, 0, width, height);

      // 基础光照层
      oc.fillStyle = rgbaCached(overlay.r, overlay.g, overlay.b, overlay.a);
      oc.fillRect(0, 0, width, height);

      // 月光效果（夜晚）
      if (!isDay) {
        const moonAlpha = 0.06 + 0.04 * Math.sin(dayNightCycle * Math.PI * 2);
        oc.fillStyle = rgbaCached(140, 160, 220, Math.max(0, moonAlpha));
        oc.fillRect(0, 0, width, height);
      }

      this.cachedCycle = dayNightCycle;
      this.cachedIsDay = isDay;
    }

    if (this.offscreen) {
      const prev = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(this.offscreen, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      // 再叠加一层半透明色调
      ctx.fillStyle = rgbaCached(overlay.r, overlay.g, overlay.b, overlay.a * 0.5);
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = prev;
    }
  }

  /** 火把光源渲染 — 只渲染视口内的建筑 */
  renderTorchLights(
    ctx: CanvasRenderingContext2D,
    buildings: Array<{ x: number; y: number; type: string }>,
    camera: { x: number; y: number; zoom: number },
    tileSize: number
  ): void {
    this.flickerTime += 0.02;

    const viewLeft = camera.x;
    const viewTop = camera.y;
    const viewRight = camera.x + ctx.canvas.width / camera.zoom;
    const viewBottom = camera.y + ctx.canvas.height / camera.zoom;
    const margin = 3; // 额外 tile 余量

    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';

    for (const b of buildings) {
      if (!TORCH_BUILDING_TYPES.has(b.type)) continue;

      // 视口裁剪
      if (
        b.x < viewLeft - margin || b.x > viewRight + margin ||
        b.y < viewTop - margin || b.y > viewBottom + margin
      ) continue;

      const sx = (b.x - camera.x) * tileSize * camera.zoom + tileSize * camera.zoom * 0.5;
      const sy = (b.y - camera.y) * tileSize * camera.zoom + tileSize * camera.zoom * 0.5;

      // 闪烁：每个建筑用不同相位
      const phase = (b.x * 7 + b.y * 13) % 6.28;
      const flicker = 0.85 + 0.15 * Math.sin(this.flickerTime * 3 + phase);
      const radius = tileSize * camera.zoom * 2.5 * flicker;

      // Two overlapping arcs replace createRadialGradient to avoid per-building gradient allocation
      ctx.globalAlpha = 0.18 * flicker;
      ctx.fillStyle = 'rgb(255,160,40)';
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.35 * flicker;
      ctx.fillStyle = 'rgb(255,200,80)';
      ctx.beginPath();
      ctx.arc(sx, sy, radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = prev;
  }
}
