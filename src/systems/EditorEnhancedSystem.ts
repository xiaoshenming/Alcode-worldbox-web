/**
 * EditorEnhancedSystem - 世界编辑器增强系统
 * 提供画笔大小调节、地形预览、撤销/重做、油漆桶填充、网格显示
 */

/** 编辑操作记录 */
const _EMPTY_DASH: number[] = []
const _DASH_4_4: number[] = [4, 4]
export type EditAction = {
  type: 'terrain' | 'spawn' | 'disaster'
  tiles: Array<{ x: number; y: number; oldValue: number; newValue: number }>
  tick: number
}

const MAX_UNDO_STEPS = 50;
const MIN_BRUSH_SIZE = 1;
const MAX_BRUSH_SIZE = 20;
const MAX_FLOOD_FILL = 500;
const GRID_MIN_ZOOM = 8;
/** Pre-allocated 4-directional offsets — avoids per-flood-fill object literal array creation */
const _FLOOD_DIRS = [
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
] as const

export class EditorEnhancedSystem {
  // 画笔状态
  private brushSize: number = 3;
  private softEdge: boolean = false;

  // 预览状态
  private previewTerrain: number = -1;

  // 撤销/重做栈（固定大小数组）
  private undoStack: Array<EditAction | null>;
  private undoTop: number = -1;
  private undoCount: number = 0;
  private redoStack: Array<EditAction | null>;
  private redoTop: number = -1;
  private redoCount: number = 0;

  // 网格
  private gridVisible: boolean = false;
  private _lastZoom = -1;
  private _brushFont = '';

  constructor() {
    this.undoStack = new Array<EditAction | null>(MAX_UNDO_STEPS).fill(null);
    this.redoStack = new Array<EditAction | null>(MAX_UNDO_STEPS).fill(null);
  }

  // ─── 画笔 ───────────────────────────────────────────

  /** 设置画笔大小，钳制到 [1, 20] */
  setBrushSize(size: number): void {
    this.brushSize = Math.max(MIN_BRUSH_SIZE, Math.min(MAX_BRUSH_SIZE, Math.round(size)));
  }

  /** 获取当前画笔大小 */
  getBrushSize(): number {
    return this.brushSize;
  }

  /** 增减画笔大小 */
  adjustBrushSize(delta: number): void {
    this.setBrushSize(this.brushSize + delta);
  }

  /** 设置边缘柔化 */
  setSoftEdge(enabled: boolean): void {
    this.softEdge = enabled;
  }

  // ─── 预览 ───────────────────────────────────────────

  /** 设置预览地形类型 */
  setPreviewTerrain(terrainType: number): void {
    this.previewTerrain = terrainType;
  }

  /** 清除预览 */
  clearPreview(): void {
    this.previewTerrain = -1;
  }

  // ─── 撤销/重做 ──────────────────────────────────────

  /** 压入一个编辑操作 */
  pushAction(action: EditAction): void {
    this.undoTop = (this.undoTop + 1) % MAX_UNDO_STEPS;
    this.undoStack[this.undoTop] = action;
    if (this.undoCount < MAX_UNDO_STEPS) {
      this.undoCount++;
    }
    // 新操作清空重做栈
    this.redoTop = -1;
    this.redoCount = 0;
  }

  /** 撤销，返回被撤销的操作（用于恢复旧值），无可撤销返回 null */
  undo(): EditAction | null {
    if (this.undoCount === 0) return null;
    const action = this.undoStack[this.undoTop];
    this.undoStack[this.undoTop] = null;
    this.undoTop = (this.undoTop - 1 + MAX_UNDO_STEPS) % MAX_UNDO_STEPS;
    this.undoCount--;
    // 推入重做栈
    if (action) {
      this.redoTop = (this.redoTop + 1) % MAX_UNDO_STEPS;
      this.redoStack[this.redoTop] = action;
      if (this.redoCount < MAX_UNDO_STEPS) {
        this.redoCount++;
      }
    }
    return action;
  }

  /** 重做，返回被重做的操作（用于应用新值），无可重做返回 null */
  redo(): EditAction | null {
    if (this.redoCount === 0) return null;
    const action = this.redoStack[this.redoTop];
    this.redoStack[this.redoTop] = null;
    this.redoTop = (this.redoTop - 1 + MAX_UNDO_STEPS) % MAX_UNDO_STEPS;
    this.redoCount--;
    // 推回撤销栈
    if (action) {
      this.undoTop = (this.undoTop + 1) % MAX_UNDO_STEPS;
      this.undoStack[this.undoTop] = action;
      if (this.undoCount < MAX_UNDO_STEPS) {
        this.undoCount++;
      }
    }
    return action;
  }

  canUndo(): boolean {
    return this.undoCount > 0;
  }

  canRedo(): boolean {
    return this.redoCount > 0;
  }

  // ─── 油漆桶填充 (BFS) ──────────────────────────────

  /**
   * 从 (startX, startY) 开始 flood fill，替换为 newTerrain
   * @param getTerrain 获取指定坐标地形类型的回调
   * @returns 被填充的 tile 坐标列表
   */
  floodFill(
    startX: number,
    startY: number,
    newTerrain: number,
    getTerrain: (x: number, y: number) => number
  ): Array<{ x: number; y: number }> {
    const oldTerrain = getTerrain(startX, startY);
    if (oldTerrain === newTerrain) return [];

    const filled: Array<{ x: number; y: number }> = [];
    const visited = new Set<string>();
    const queue: Array<{ x: number; y: number }> = [];

    const key = (x: number, y: number) => `${x},${y}`;

    queue.push({ x: startX, y: startY });
    visited.add(key(startX, startY));

    const dirs = _FLOOD_DIRS;

    let head = 0

    while (head < queue.length && filled.length < MAX_FLOOD_FILL) {
      const cur = queue[head++];
      filled.push(cur);

      for (let i = 0; i < dirs.length; i++) {
        const nx = cur.x + dirs[i].dx;
        const ny = cur.y + dirs[i].dy;
        const k = key(nx, ny);
        if (!visited.has(k) && getTerrain(nx, ny) === oldTerrain) {
          visited.add(k);
          queue.push({ x: nx, y: ny });
        }
      }
    }

    return filled;
  }

  // ─── 渲染：画笔预览 ────────────────────────────────

  /**
   * 绘制圆形画笔预览（半透明圆圈 + 大小数字）
   */
  renderBrushPreview(
    ctx: CanvasRenderingContext2D,
    mouseX: number,
    mouseY: number,
    camX: number,
    camY: number,
    zoom: number
  ): void {
    if (zoom !== this._lastZoom) {
      this._lastZoom = zoom
      this._brushFont = `${Math.max(10, zoom)}px monospace`
    }
    const worldX = (mouseX / zoom) + camX;
    const worldY = (mouseY / zoom) + camY;
    const centerScreenX = (worldX - camX) * zoom;
    const centerScreenY = (worldY - camY) * zoom;
    const radius = (this.brushSize / 2) * zoom;

    ctx.save();

    // 圆形轮廓
    ctx.beginPath();
    ctx.arc(centerScreenX, centerScreenY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 半透明填充
    ctx.fillStyle = this.softEdge
      ? 'rgba(255, 255, 255, 0.1)'
      : 'rgba(255, 255, 255, 0.15)';
    ctx.fill();

    // 柔化边缘虚线环
    if (this.softEdge) {
      ctx.beginPath();
      ctx.arc(centerScreenX, centerScreenY, radius * 0.75, 0, Math.PI * 2);
      ctx.setLineDash(_DASH_4_4);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash(_EMPTY_DASH);
    }

    // 画笔大小数字
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = this._brushFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(this.brushSize), centerScreenX, centerScreenY - radius - zoom * 0.8);

    ctx.restore();
  }

  // ─── 渲染：地形预览 ────────────────────────────────

  /**
   * 在画笔范围内绘制半透明地形预览
   */
  renderTerrainPreview(
    ctx: CanvasRenderingContext2D,
    mouseX: number,
    mouseY: number,
    camX: number,
    camY: number,
    zoom: number,
    terrainColor: string
  ): void {
    if (this.previewTerrain < 0) return;

    const worldX = (mouseX / zoom) + camX;
    const worldY = (mouseY / zoom) + camY;
    const centerTileX = Math.floor(worldX);
    const centerTileY = Math.floor(worldY);
    const halfBrush = this.brushSize / 2;
    const radiusSq = halfBrush * halfBrush;

    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = terrainColor;

    const range = Math.ceil(halfBrush);
    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        const distSq = dx * dx + dy * dy;
        if (distSq > radiusSq) continue;

        // 柔化边缘：外圈 tile 随机跳过
        if (this.softEdge && distSq > radiusSq * 0.5) {
          if (Math.random() > 0.5) continue;
        }

        const tx = centerTileX + dx;
        const ty = centerTileY + dy;
        const sx = (tx - camX) * zoom;
        const sy = (ty - camY) * zoom;
        ctx.fillRect(sx, sy, zoom, zoom);
      }
    }

    ctx.restore();
  }

  // ─── 渲染：网格 ─────────────────────────────────────

  /**
   * 绘制 tile 网格线（仅 zoom > 8 时显示）
   */
  renderGrid(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    zoom: number,
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ): void {
    if (!this.gridVisible || zoom < GRID_MIN_ZOOM) return;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();

    // 垂直线
    for (let x = startX; x <= endX; x++) {
      const sx = (x - camX) * zoom;
      const syStart = (startY - camY) * zoom;
      const syEnd = (endY - camY) * zoom;
      ctx.moveTo(sx, syStart);
      ctx.lineTo(sx, syEnd);
    }

    // 水平线
    for (let y = startY; y <= endY; y++) {
      const sy = (y - camY) * zoom;
      const sxStart = (startX - camX) * zoom;
      const sxEnd = (endX - camX) * zoom;
      ctx.moveTo(sxStart, sy);
      ctx.lineTo(sxEnd, sy);
    }

    ctx.stroke();
    ctx.restore();
  }

  // ─── 渲染：撤销/重做指示器 ──────────────────────────

  /**
   * 在指定位置绘制撤销/重做状态指示
   */
  renderUndoIndicator(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number
  ): void {
    ctx.save();
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const undoText = `Undo: ${this.undoCount}`;
    const redoText = `Redo: ${this.redoCount}`;

    // 背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x, y, 120, 36);

    // 撤销计数
    ctx.fillStyle = this.undoCount > 0 ? 'rgba(100, 200, 255, 0.9)' : 'rgba(150, 150, 150, 0.6)';
    ctx.fillText(undoText, x + 6, y + 4);

    // 重做计数
    ctx.fillStyle = this.redoCount > 0 ? 'rgba(100, 255, 150, 0.9)' : 'rgba(150, 150, 150, 0.6)';
    ctx.fillText(redoText, x + 6, y + 20);

    ctx.restore();
  }

  // ─── 网格开关 ───────────────────────────────────────

  /** 设置网格可见性 */
  setGridVisible(visible: boolean): void {
    this.gridVisible = visible;
  }

  /** 获取网格可见性 */
  isGridVisible(): boolean {
    return this.gridVisible;
  }
}
