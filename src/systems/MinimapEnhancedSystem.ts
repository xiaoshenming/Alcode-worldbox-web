/**
 * MinimapEnhancedSystem - 小地图增强系统
 * 提供热力图模式、战争标记、点击导航和缩放预览功能
 */

export type MinimapMode = 'terrain' | 'population' | 'war' | 'resource' | 'faith';

export interface MinimapHeatData {
  data: Float32Array;
  width: number;
  height: number;
}

interface WarMarker { x: number; y: number; intensity: number }
interface HoverState { minimapX: number; minimapY: number; minimapWidth: number; minimapHeight: number }

const MODES: MinimapMode[] = ['terrain', 'population', 'war', 'resource', 'faith'];
const MODE_LABELS: Record<MinimapMode, string> = {
  terrain: 'Terrain', population: 'Population', war: 'War', resource: 'Resources', faith: 'Faith',
};
const MODE_BORDER_COLORS: Record<MinimapMode, string> = {
  terrain: '#888888', population: '#ff4444', war: '#ff0000', resource: '#ffaa00', faith: '#aa44ff',
};

const _c = { r: 0, g: 0, b: 0 };
type ColorBuf = typeof _c;

function lerpPopulation(t: number): ColorBuf {
  if (t < 0.5) {
    _c.r = Math.floor(t * 2 * 255); _c.g = 255; _c.b = 0;
  } else {
    _c.r = 255; _c.g = Math.floor((1 - (t - 0.5) * 2) * 255); _c.b = 0;
  }
  return _c;
}
function lerpWar(t: number): ColorBuf {
  _c.r = 255; _c.g = Math.floor((1 - t) * 60); _c.b = 0; return _c;
}
function lerpResource(t: number): ColorBuf {
  _c.r = Math.floor(100 + t * 155); _c.g = Math.floor(70 + t * 130); _c.b = Math.floor(20 * (1 - t)); return _c;
}
function lerpFaith(t: number): ColorBuf {
  _c.r = Math.floor(80 + t * 120); _c.g = Math.floor(20 + t * 40); _c.b = Math.floor(120 + t * 135); return _c;
}

function getColorLerp(mode: MinimapMode): ((t: number) => ColorBuf) | null {
  switch (mode) {
    case 'population': return lerpPopulation;
    case 'war': return lerpWar;
    case 'resource': return lerpResource;
    case 'faith': return lerpFaith;
    default: return null;
  }
}

const PREVIEW_SIZE = 120;
const PREVIEW_ZOOM = 2;

// Pre-computed heatmap palette: 101 steps for val 0.00..1.00
// Rebuilt whenever mode changes. alpha = 0.30 + val * 0.60
type HeatPalette = string[]
const _HEAT_PALETTES = new Map<MinimapMode, HeatPalette>()

function buildHeatPalette(mode: MinimapMode): HeatPalette {
  const lerpFn = getColorLerp(mode)
  if (!lerpFn) return []
  const pal: HeatPalette = []
  for (let i = 0; i <= 100; i++) {
    const val = i / 100
    const c = lerpFn(val)
    const alpha = (0.3 + val * 0.6).toFixed(2)
    pal.push(`rgba(${c.r},${c.g},${c.b},${alpha})`)
  }
  return pal
}

// Pre-build palettes at module load
;(['population', 'war', 'resource', 'faith'] as MinimapMode[]).forEach(m => {
  _HEAT_PALETTES.set(m, buildHeatPalette(m))
})

export class MinimapEnhancedSystem {
  private mode: MinimapMode = 'terrain';
  private heatmaps: Map<MinimapMode, MinimapHeatData> = new Map();
  private warMarkers: WarMarker[] = [];
  private hoverState: HoverState | null = null;
  /** Persistent HoverState object — reused in handleHover to avoid new{} each call */
  private _hoverBuf: HoverState = { minimapX: 0, minimapY: 0, minimapWidth: 1, minimapHeight: 1 };
  /** Cached tile coordinate label — rebuilt when tileX/tileY changes */
  private _prevTileX = -1;
  private _prevTileY = -1;
  private _tileStr = 'Tile: 0,0';
  private tick = 0;

  setMode(mode: MinimapMode): void { this.mode = mode; }

  /** 循环切换到下一个模式 */
  cycleMode(): void {
    this.mode = MODES[(MODES.indexOf(this.mode) + 1) % MODES.length];
  }

  updateHeatmap(mode: MinimapMode, data: MinimapHeatData): void { this.heatmaps.set(mode, data); }
  addWarMarker(x: number, y: number, intensity: number): void { this.warMarkers.push({ x, y, intensity }); }
  clearWarMarkers(): void { this.warMarkers.length = 0; }

  handleHover(minimapX: number, minimapY: number, minimapWidth: number, minimapHeight: number): void {
    const h = this._hoverBuf;
    h.minimapX = minimapX; h.minimapY = minimapY;
    h.minimapWidth = minimapWidth; h.minimapHeight = minimapHeight;
    this.hoverState = h;
  }

  clearHover(): void { this.hoverState = null; }
  update(tick: number): void { this.tick = tick; }

  /** 渲染小地图 */
  render(
    ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number,
    camX: number, camY: number, camW: number, camH: number
  ): void {
    ctx.save();
    ctx.fillStyle = '#111';
    ctx.fillRect(x, y, width, height);

    if (this.mode !== 'terrain') this.renderHeatmap(ctx, x, y, width, height);
    this.renderWarMarkers(ctx, x, y, width, height);
    this.renderViewport(ctx, x, y, width, height, camX, camY, camW, camH);

    // 边框
    const borderColor = MODE_BORDER_COLORS[this.mode];
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    // 模式标签
    ctx.fillStyle = borderColor;
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(MODE_LABELS[this.mode], x + width / 2, y - 4);
    ctx.restore();
  }

  /** 渲染悬停预览窗口 */
  renderPreview(ctx: CanvasRenderingContext2D, mouseX: number, mouseY: number): void {
    if (!this.hoverState) return;
    const heat = this.heatmaps.get(this.mode);
    if (!heat) return;

    const { minimapX, minimapY, minimapWidth, minimapHeight } = this.hoverState;
    const normX = minimapX / minimapWidth;
    const normY = minimapY / minimapHeight;
    const px = mouseX + 16;
    const py = mouseY - PREVIEW_SIZE - 16;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(px - 2, py - 2, PREVIEW_SIZE + 4, PREVIEW_SIZE + 24);

    const lerpFn = getColorLerp(this.mode);
    if (lerpFn) {
      const pal = _HEAT_PALETTES.get(this.mode);
      const srcR = 1 / (PREVIEW_ZOOM * 2);
      const sU = Math.max(0, normX - srcR), eU = Math.min(1, normX + srcR);
      const sV = Math.max(0, normY - srcR), eV = Math.min(1, normY + srcR);
      const steps = 24;
      const cellS = PREVIEW_SIZE / steps;
      for (let sy = 0; sy < steps; sy++) {
        for (let sx = 0; sx < steps; sx++) {
          const u = sU + (sx / steps) * (eU - sU);
          const v = sV + (sy / steps) * (eV - sV);
          const di = Math.floor(v * heat.height) * heat.width + Math.floor(u * heat.width);
          const val = heat.data[di] ?? 0;
          if (pal && pal.length > 0) {
            ctx.fillStyle = pal[Math.round(val * 100)];
          } else {
            const c = lerpFn(val);
            ctx.fillStyle = `rgb(${c.r},${c.g},${c.b})`;
          }
          ctx.fillRect(px + sx * cellS, py + sy * cellS, cellS + 0.5, cellS + 0.5);
        }
      }
    } else {
      ctx.fillStyle = '#333';
      ctx.fillRect(px, py, PREVIEW_SIZE, PREVIEW_SIZE);
      ctx.fillStyle = '#888';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Terrain Preview', px + PREVIEW_SIZE / 2, py + PREVIEW_SIZE / 2);
    }

    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    const tileX = Math.floor(normX * heat.width);
    const tileY = Math.floor(normY * heat.height);
    if (tileX !== this._prevTileX || tileY !== this._prevTileY) {
      this._prevTileX = tileX; this._prevTileY = tileY;
      this._tileStr = `Tile: ${tileX},${tileY}`;
    }
    ctx.fillText(this._tileStr, px + 2, py + PREVIEW_SIZE + 12);
    ctx.strokeStyle = MODE_BORDER_COLORS[this.mode];
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, PREVIEW_SIZE, PREVIEW_SIZE + 20);
    ctx.restore();
  }

  /** 渲染热力图叠加层 */
  private renderHeatmap(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    const heat = this.heatmaps.get(this.mode);
    if (!heat) return;
    const pal = _HEAT_PALETTES.get(this.mode);
    if (!pal || pal.length === 0) return;

    const stepsX = Math.min(w, heat.width, 100);
    const stepsY = Math.min(h, heat.height, 100);
    const cellW = w / stepsX, cellH = h / stepsY;

    for (let sy = 0; sy < stepsY; sy++) {
      const dataY = Math.floor((sy / stepsY) * heat.height);
      for (let sx = 0; sx < stepsX; sx++) {
        const val = heat.data[dataY * heat.width + Math.floor((sx / stepsX) * heat.width)];
        if (val < 0.01) continue;
        ctx.fillStyle = pal[Math.round(val * 100)];
        ctx.fillRect(x + sx * cellW, y + sy * cellH, cellW + 0.5, cellH + 0.5);
      }
    }
  }

  /** 渲染战争标记 */
  private renderWarMarkers(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    if (this.warMarkers.length === 0) return;
    const flash = 0.5 + 0.5 * Math.sin(this.tick * 0.1);

    ctx.save();
    for (let i = 0; i < this.warMarkers.length; i++) {
      const m = this.warMarkers[i];
      const mx = x + m.x * w, my = y + m.y * h;
      const r = 2 + m.intensity * 4;
      // 闪烁红点 — 用globalAlpha替代rgba模板字符串
      ctx.globalAlpha = flash * m.intensity;
      ctx.fillStyle = '#ff1e00';
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fill();
      // 围城橙色圆圈
      if (m.intensity > 0.6) {
        ctx.globalAlpha = flash * 0.8;
        ctx.strokeStyle = '#ffa000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(mx, my, r + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      // 军队移动箭头
      if (m.intensity > 0.3 && m.intensity <= 0.6) {
        ctx.globalAlpha = flash * 0.7;
        ctx.fillStyle = '#ffc832';
        ctx.beginPath();
        ctx.moveTo(mx, my - r - 2);
        ctx.lineTo(mx + 3, my - r + 2);
        ctx.lineTo(mx - 3, my - r + 2);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /** 渲染当前视口矩形 */
  private renderViewport(
    ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
    camX: number, camY: number, camW: number, camH: number
  ): void {
    const heat = this.heatmaps.get(this.mode) ?? this.heatmaps.values().next().value;
    const worldW = heat ? heat.width : 200;
    const worldH = heat ? heat.height : 200;
    const vx = x + (camX / worldW) * w, vy = y + (camY / worldH) * h;
    const vw = (camW / worldW) * w, vh = (camH / worldH) * h;

    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vx, vy, vw, vh);

    // 视口角标（手动展开，避免每帧创建 4 个子数组）
    const cl = 3;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    // top-left
    ctx.beginPath(); ctx.moveTo(vx, vy + cl); ctx.lineTo(vx, vy); ctx.lineTo(vx + cl, vy); ctx.stroke();
    // top-right
    ctx.beginPath(); ctx.moveTo(vx + vw - cl, vy); ctx.lineTo(vx + vw, vy); ctx.lineTo(vx + vw, vy + cl); ctx.stroke();
    // bottom-left
    ctx.beginPath(); ctx.moveTo(vx, vy + vh - cl); ctx.lineTo(vx, vy + vh); ctx.lineTo(vx + cl, vy + vh); ctx.stroke();
    // bottom-right
    ctx.beginPath(); ctx.moveTo(vx + vw - cl, vy + vh); ctx.lineTo(vx + vw, vy + vh); ctx.lineTo(vx + vw, vy + vh - cl); ctx.stroke();
  }
}
