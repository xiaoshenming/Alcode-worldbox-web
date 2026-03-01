/**
 * WorldHeatmapSystem - 世界热力图叠加系统
 *
 * 在地图上渲染半透明热力图层，支持多种可视化模式：
 * - population: 人口密度
 * - resource: 资源分布
 * - war: 战争热度
 * - territory: 文明领土
 *
 * 按 M 键循环切换模式，数据按 8x8 tile 网格聚合，
 * 使用双线性插值实现平滑渐变效果。
 */

/** 热力图模式定义 */
const HEATMAP_MODES = ['off', 'population', 'resource', 'war', 'territory'] as const;

/** 模式中文标签 */
const MODE_LABELS: Record<string, string> = {
  off: '',
  population: '人口密度',
  resource: '资源分布',
  war: '战争热度',
  territory: '文明领土',
};

/** 每个采样格子覆盖的 tile 数 */
const CELL_SIZE = 8;

/** 热力网格最大尺寸（200/8 = 25，留余量） */
const GRID_MAX = 64;

/** 图层透明度 */
const OVERLAY_ALPHA = 0.45;

/** 图例渐变色停点（蓝→绿→黄→红） */
const COLOR_STOPS: [number, number, number][] = [
  [0, 0, 255],   // 蓝
  [0, 200, 0],   // 绿
  [255, 255, 0], // 黄
  [255, 0, 0],   // 红
];

/**
 * 根据归一化值 [0,1] 返回 RGBA 颜色字符串
 * @param t - 归一化值，0 为最低，1 为最高
 * @param alpha - 透明度
 */
function valueToColor(t: number, alpha: number): string {
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  const seg = clamped * (COLOR_STOPS.length - 1);
  const idx = seg | 0;
  const frac = seg - idx;
  const a = COLOR_STOPS[idx < COLOR_STOPS.length - 1 ? idx : COLOR_STOPS.length - 1];
  const b = COLOR_STOPS[idx < COLOR_STOPS.length - 2 ? idx + 1 : COLOR_STOPS.length - 1];
  const r = (a[0] + (b[0] - a[0]) * frac) | 0;
  const g = (a[1] + (b[1] - a[1]) * frac) | 0;
  const bl = (a[2] + (b[2] - a[2]) * frac) | 0;
  return `rgba(${r},${g},${bl},${alpha})`;
}

// Pre-computed color table for OVERLAY_ALPHA: 101 steps t 0.00..1.00
const HEATMAP_COLOR_TABLE: string[] = (() => {
  const tbl: string[] = []
  for (let i = 0; i <= 100; i++) {
    tbl.push(valueToColor(i / 100, OVERLAY_ALPHA))
  }
  return tbl
})()

/**
 * 双线性插值
 * @param grid - 数据网格
 * @param cols - 网格列数
 * @param fx - 浮点列坐标
 * @param fy - 浮点行坐标
 * @param rows - 网格行数
 */
function bilerp(grid: Float32Array, cols: number, rows: number, fx: number, fy: number): number {
  const x0 = fx | 0;
  const y0 = fy | 0;
  const x1 = x0 + 1 < cols ? x0 + 1 : x0;
  const y1 = y0 + 1 < rows ? y0 + 1 : y0;
  const dx = fx - x0;
  const dy = fy - y0;
  const v00 = grid[y0 * cols + x0];
  const v10 = grid[y0 * cols + x1];
  const v01 = grid[y1 * cols + x0];
  const v11 = grid[y1 * cols + x1];
  return v00 * (1 - dx) * (1 - dy) + v10 * dx * (1 - dy) + v01 * (1 - dx) * dy + v11 * dx * dy;
}

/**
 * 世界热力图系统
 *
 * 自包含的热力图渲染系统，不依赖项目内其他模块。
 * 外部通过 setData / clearData 注入数据，通过 render 绘制叠加层。
 *
 * @example
 * ```ts
 * const heatmap = new WorldHeatmapSystem();
 * heatmap.setData('population', 3, 5, 0.8);
 * heatmap.handleKey('m');
 * heatmap.render(ctx, camX, camY, zoom, screenW, screenH);
 * ```
 */
export class WorldHeatmapSystem {
  /** 当前模式索引 */
  private modeIndex = 0;

  /** 各模式的数据网格，使用 Float32Array 避免 GC */
  private grids: Map<string, Float32Array> = new Map();

  /** 各模式数据的最大值，用于归一化 */
  private maxValues: Map<string, number> = new Map();
  /** Pre-computed max value strings — avoids toFixed per frame */
  private maxValStrs: Map<string, string> = new Map();

  /** 渲染用的临时像素步长，避免热路径分配 */
  private readonly renderStep = CELL_SIZE;

  constructor() {
    for (let i = 1; i < HEATMAP_MODES.length; i++) {
      const mode = HEATMAP_MODES[i];
      this.grids.set(mode, new Float32Array(GRID_MAX * GRID_MAX));
      this.maxValues.set(mode, 0);
      this.maxValStrs.set(mode, '0');
    }
  }

  /** 当前激活的模式名称 */
  get currentMode(): string {
    return HEATMAP_MODES[this.modeIndex];
  }

  /**
   * 处理键盘输入，M 键循环切换热力图模式
   * @param key - 按键名称
   * @returns 是否消费了该按键事件
   */
  handleKey(key: string): boolean {
    if (key.toLowerCase() !== 'm') return false;
    this.modeIndex = (this.modeIndex + 1) % HEATMAP_MODES.length;
    return true;
  }

  /**
   * 每帧更新（预留，当前无逻辑）
   * @param _tick - 当前 tick
   */
  update(_tick: number): void {
    // 预留：可用于数据衰减、动画等
  }

  /**
   * 渲染热力图叠加层和右上角 HUD
   * @param ctx - Canvas 2D 上下文
   * @param camX - 摄像机 X 偏移（世界像素坐标）
   * @param camY - 摄像机 Y 偏移（世界像素坐标）
   * @param zoom - 缩放倍率
   * @param screenW - 屏幕宽度（像素）
   * @param screenH - 屏幕高度（像素）
   */
  render(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    zoom: number,
    screenW: number,
    screenH: number,
  ): void {
    const mode = HEATMAP_MODES[this.modeIndex];
    if (mode === 'off') return;

    const grid = this.grids.get(mode);
    const maxVal = this.maxValues.get(mode) ?? 1;
    if (!grid || maxVal <= 0) return;

    const maxValStr = this.maxValStrs.get(mode) ?? '0';
    this.renderOverlay(ctx, grid, maxVal, camX, camY, zoom, screenW, screenH);
    this.renderHUD(ctx, mode, maxVal, maxValStr, screenW);
  }

  /**
   * 绘制热力图叠加层（双线性插值平滑）
   */
  private renderOverlay(
    ctx: CanvasRenderingContext2D,
    grid: Float32Array,
    maxVal: number,
    camX: number,
    camY: number,
    zoom: number,
    screenW: number,
    screenH: number,
  ): void {
    const step = this.renderStep;

    // 可见区域对应的网格范围
    const gxStart = Math.max(0, ((camX / zoom) / CELL_SIZE - 1) | 0);
    const gyStart = Math.max(0, ((camY / zoom) / CELL_SIZE - 1) | 0);
    const gxEnd = Math.min(GRID_MAX - 1, (((camX / zoom + screenW / zoom) / CELL_SIZE) | 0) + 2);
    const gyEnd = Math.min(GRID_MAX - 1, (((camY / zoom + screenH / zoom) / CELL_SIZE) | 0) + 2);

    ctx.save();

    // 逐像素步长绘制插值色块
    for (let sy = 0; sy < screenH; sy += step) {
      for (let sx = 0; sx < screenW; sx += step) {
        // 屏幕坐标 → 世界 tile 坐标 → 网格浮点坐标
        const worldX = (sx + camX) / zoom;
        const worldY = (sy + camY) / zoom;
        const fx = worldX / CELL_SIZE;
        const fy = worldY / CELL_SIZE;

        // 跳过可见范围外
        if (fx < gxStart || fx > gxEnd || fy < gyStart || fy > gyEnd) continue;

        const raw = bilerp(grid, GRID_MAX, GRID_MAX, fx, fy);
        if (raw <= 0.001) continue;

        const normalized = raw / maxVal;
        ctx.fillStyle = HEATMAP_COLOR_TABLE[Math.round(normalized * 100)];
        ctx.fillRect(sx, sy, step, step);
      }
    }

    ctx.restore();
  }

  /**
   * 绘制右上角模式标签和颜色图例
   */
  private renderHUD(
    ctx: CanvasRenderingContext2D,
    mode: string,
    maxVal: number,
    maxValStr: string,
    screenW: number,
  ): void {
    const label = MODE_LABELS[mode] ?? mode;
    const padding = 10;
    const boxW = 160;
    const boxH = 60;
    const x = screenW - boxW - padding;
    const y = padding;

    ctx.save();

    // 背景
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath();
    ctx.roundRect(x, y, boxW, boxH, 6);
    ctx.fill();

    // 标题
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 8, y + 18);

    // 渐变图例条 — 用预计算颜色表绘制100段矩形，消除每帧createLinearGradient分配
    const barX = x + 8;
    const barY = y + 28;
    const barW = boxW - 16;
    const barH = 10;
    const segW = barW / 100;
    for (let si = 0; si < 100; si++) {
      ctx.fillStyle = HEATMAP_COLOR_TABLE[si];
      ctx.fillRect(barX + si * segW, barY, segW + 0.5, barH);
    }

    // 图例刻度
    ctx.fillStyle = '#ccc';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('0', barX, barY + barH + 12);
    ctx.textAlign = 'right';
    ctx.fillText(maxValStr, barX + barW, barY + barH + 12);

    ctx.restore();
  }
}
