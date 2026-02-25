/**
 * DayNightRenderer — 昼夜光照渲染系统
 * 在主渲染循环中调用，叠加昼夜光照、火把光源和月光效果。
 */

const TORCH_BUILDING_TYPES = new Set(['TOWER', 'CASTLE', 'TEMPLE']);
const CYCLE_REDRAW_THRESHOLD = 0.005;

export class DayNightRenderer {
  private offscreen: OffscreenCanvas | null = null;
  private offCtx: OffscreenCanvasRenderingContext2D | null = null;
  private cachedCycle = -1;
  private cachedIsDay = true;
  private cachedWidth = 0;
  private cachedHeight = 0;
  private flickerTime = 0;

  /** 计算光照参数：颜色 + alpha */
  private computeOverlay(cycle: number, isDay: boolean): { r: number; g: number; b: number; a: number } {
    // cycle: 0 = 午夜, 0.25 = 黎明, 0.5 = 正午, 0.75 = 黄昏
    if (isDay) {
      // 黎明/黄昏过渡区间
      const dawnStart = 0.2, dawnEnd = 0.3;
      const duskStart = 0.7, duskEnd = 0.8;

      if (cycle >= dawnStart && cycle < dawnEnd) {
        // 黎明：橙色调渐退
        const t = (cycle - dawnStart) / (dawnEnd - dawnStart);
        return { r: 255, g: 180, b: 80, a: 0.2 * (1 - t) };
      }
      if (cycle >= duskStart && cycle < duskEnd) {
        // 黄昏：橙色调渐入
        const t = (cycle - duskStart) / (duskEnd - duskStart);
        return { r: 255, g: 160, b: 60, a: 0.1 + 0.1 * t };
      }
      // 白天：无叠加
      return { r: 0, g: 0, b: 0, a: 0 };
    }

    // 夜晚：深蓝色叠加，越接近午夜越深
    const midDist = Math.abs(cycle - 0.0) < Math.abs(cycle - 1.0) ? Math.abs(cycle) : Math.abs(1 - cycle);
    const nightDepth = 1 - midDist * 2; // 0~1, 午夜最深
    const a = 0.3 + 0.2 * Math.max(0, Math.min(1, nightDepth));
    return { r: 10, g: 15, b: 50, a };
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
      oc.fillStyle = `rgba(${overlay.r},${overlay.g},${overlay.b},${overlay.a})`;
      oc.fillRect(0, 0, width, height);

      // 月光效果（夜晚）
      if (!isDay) {
        const moonAlpha = 0.06 + 0.04 * Math.sin(dayNightCycle * Math.PI * 2);
        oc.fillStyle = `rgba(140,160,220,${Math.max(0, moonAlpha)})`;
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
      ctx.fillStyle = `rgba(${overlay.r},${overlay.g},${overlay.b},${overlay.a * 0.5})`;
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

      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius);
      grad.addColorStop(0, `rgba(255,200,80,${0.35 * flicker})`);
      grad.addColorStop(0.4, `rgba(255,160,40,${0.15 * flicker})`);
      grad.addColorStop(1, 'rgba(255,120,20,0)');

      ctx.fillStyle = grad;
      ctx.fillRect(sx - radius, sy - radius, radius * 2, radius * 2);
    }

    ctx.globalCompositeOperation = prev;
  }
}
