/**
 * FogOfWarEnhanced - 增强版战争迷雾系统
 *
 * 为 WorldBox 提供探索记忆和动态视野功能：
 * - 每个文明独立的探索记忆（Uint8Array）
 * - 基于 Bresenham 射线的视野遮挡计算
 * - 三层渲染（未探索/已探索/可见）+ 边缘平滑
 * - 性能优化：dirty flag + tick 间隔更新 + 视口裁剪
 */

/** 迷雾状态常量 */
const FOG_UNEXPLORED = 0;
const FOG_EXPLORED = 1;
const FOG_VISIBLE = 2;

/** 默认配置 */
const DEFAULT_VISION_RANGE = 8;
const UPDATE_INTERVAL = 10;
const TILE_SIZE = 16;

/** 地形类型 ID（山地阻挡视线） */
const TERRAIN_MOUNTAIN = 5;

/** 渲染透明度 */
const ALPHA_UNEXPLORED = 0.95;
const ALPHA_EXPLORED = 0.5;

/** 高地视野加成 */
const HIGHLAND_VISION_BONUS = 3;

/**
 * 增强版战争迷雾系统
 *
 * 管理每个文明的探索记忆，基于单位和建筑位置计算动态视野，
 * 并在 Canvas 上渲染三层迷雾叠加效果。
 */
export class FogOfWarEnhanced {
  private width = 0;
  private height = 0;
  private enabled = true;
  private activeCivId = 0;
  private dirty = true;
  private lastUpdateTick = -UPDATE_INTERVAL;

  /** 每个文明的探索地图：civId -> Uint8Array */
  private civMaps: Map<number, Uint8Array> = new Map();

  /** 当前帧的可见性缓存（仅活跃文明） */
  private visibilityMap: Uint8Array = new Uint8Array(0);

  /** 地形遮挡数据（外部可设置） */
  private terrainData: Uint8Array | null = null;

  /**
   * 初始化迷雾系统
   * @param worldWidth 世界宽度（tile 数）
   * @param worldHeight 世界高度（tile 数）
   */
  init(worldWidth: number, worldHeight: number): void {
    this.width = worldWidth;
    this.height = worldHeight;
    this.civMaps.clear();
    this.visibilityMap = new Uint8Array(worldWidth * worldHeight);
    this.dirty = true;
    this.lastUpdateTick = -UPDATE_INTERVAL;
  }

  /**
   * 设置地形数据用于视线遮挡判断
   * @param terrain 地形类型数组，与世界同大小
   */
  setTerrainData(terrain: Uint8Array): void {
    this.terrainData = terrain;
  }

  /**
   * 切换当前显示的文明视角
   * @param civId 文明 ID
   */
  setActiveCiv(civId: number): void {
    if (this.activeCivId !== civId) {
      this.activeCivId = civId;
      this.dirty = true;
    }
  }

  /** 获取或创建指定文明的探索地图 */
  private getOrCreateCivMap(civId: number): Uint8Array {
    let map = this.civMaps.get(civId);
    if (!map) {
      map = new Uint8Array(this.width * this.height);
      this.civMaps.set(civId, map);
    }
    return map;
  }

  /**
   * 更新视野计算
   * @param tick 当前游戏 tick
   * @param units 单位列表（位置 + 视野半径）
   * @param buildings 建筑列表（位置 + 视野加成）
   */
  updateVision(
    tick: number,
    units: Array<{ x: number; y: number; visionRange: number }>,
    buildings: Array<{ x: number; y: number; visionBonus: number }>
  ): void {
    if (!this.enabled) return;
    if (tick - this.lastUpdateTick < UPDATE_INTERVAL && !this.dirty) return;

    this.lastUpdateTick = tick;
    this.dirty = false;

    const civMap = this.getOrCreateCivMap(this.activeCivId);
    const vis = this.visibilityMap;

    // 将上一帧的可见区域降级为已探索
    for (let i = 0, len = vis.length; i < len; i++) {
      if (vis[i] === FOG_VISIBLE) {
        vis[i] = FOG_EXPLORED;
      }
    }

    // 计算每个单位的视野
    for (let u = 0, uLen = units.length; u < uLen; u++) {
      const unit = units[u];
      const range = unit.visionRange > 0 ? unit.visionRange : DEFAULT_VISION_RANGE;
      const bonus = this.getHighlandBonus(unit.x, unit.y);
      this.revealCircle(unit.x, unit.y, range + bonus, vis);
    }

    // 计算每个建筑的视野
    for (let b = 0, bLen = buildings.length; b < bLen; b++) {
      const bld = buildings[b];
      const range = DEFAULT_VISION_RANGE + bld.visionBonus;
      this.revealCircle(bld.x, bld.y, range, vis);
    }

    // 同步到文明探索记忆：可见和已探索都记录
    for (let i = 0, len = vis.length; i < len; i++) {
      if (vis[i] > civMap[i]) {
        civMap[i] = vis[i];
      }
    }
  }

  /** 获取高地地形的视野加成 */
  private getHighlandBonus(x: number, y: number): number {
    if (!this.terrainData) return 0;
    const idx = y * this.width + x;
    if (idx < 0 || idx >= this.terrainData.length) return 0;
    // 山地本身提供高地视野加成
    return this.terrainData[idx] === TERRAIN_MOUNTAIN ? HIGHLAND_VISION_BONUS : 0;
  }

  /** 判断指定 tile 是否阻挡视线 */
  private isBlocking(x: number, y: number): boolean {
    if (!this.terrainData) return false;
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return true;
    return this.terrainData[y * this.width + x] === TERRAIN_MOUNTAIN;
  }

  /**
   * 使用 Bresenham 射线揭示圆形区域
   * 从中心向圆周上的每个点投射射线，遇到遮挡则停止
   */
  private revealCircle(cx: number, cy: number, radius: number, vis: Uint8Array): void {
    const r = Math.ceil(radius);
    const r2 = radius * radius;

    // 先揭示中心点
    this.setVisible(cx, cy, vis);

    // 向圆周采样点投射射线
    // 采样密度：圆周长 * 1.5 确保无缝覆盖
    const circumference = Math.ceil(2 * Math.PI * r * 1.5);
    const angleStep = (2 * Math.PI) / circumference;

    for (let i = 0; i < circumference; i++) {
      const angle = i * angleStep;
      const tx = cx + Math.round(Math.cos(angle) * r);
      const ty = cy + Math.round(Math.sin(angle) * r);
      this.castRay(cx, cy, tx, ty, r2, vis);
    }
  }

  /**
   * Bresenham 射线投射
   * 从 (x0,y0) 到 (x1,y1)，在距离内揭示 tile，遇到遮挡停止
   */
  private castRay(
    x0: number, y0: number,
    x1: number, y1: number,
    maxDist2: number,
    vis: Uint8Array
  ): void {
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let cx = x0;
    let cy = y0;

    while (true) {
      // 距离检查
      const ddx = cx - x0;
      const ddy = cy - y0;
      if (ddx * ddx + ddy * ddy > maxDist2) break;

      // 边界检查
      if (cx < 0 || cx >= this.width || cy < 0 || cy >= this.height) break;

      this.setVisible(cx, cy, vis);

      // 遮挡检查（中心点本身不算遮挡）
      if ((cx !== x0 || cy !== y0) && this.isBlocking(cx, cy)) break;

      // 到达终点
      if (cx === x1 && cy === y1) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        cx += sx;
      }
      if (e2 < dx) {
        err += dx;
        cy += sy;
      }
    }
  }

  /** 设置 tile 为可见 */
  private setVisible(x: number, y: number, vis: Uint8Array): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    vis[y * this.width + x] = FOG_VISIBLE;
  }

  /**
   * 查询指定 tile 是否已探索（包括当前可见）
   * @param x tile X 坐标
   * @param y tile Y 坐标
   */
  isExplored(x: number, y: number): boolean {
    if (!this.enabled) return true;
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    const civMap = this.civMaps.get(this.activeCivId);
    if (!civMap) return false;
    return civMap[y * this.width + x] >= FOG_EXPLORED;
  }

  /**
   * 查询指定 tile 是否当前可见
   * @param x tile X 坐标
   * @param y tile Y 坐标
   */
  isVisible(x: number, y: number): boolean {
    if (!this.enabled) return true;
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    return this.visibilityMap[y * this.width + x] === FOG_VISIBLE;
  }

  /**
   * 渲染迷雾层
   * 只渲染视口范围内的 tile，使用边缘平滑过渡
   *
   * @param ctx Canvas 2D 上下文
   * @param camX 摄像机 X 偏移
   * @param camY 摄像机 Y 偏移
   * @param zoom 缩放倍率
   * @param startX 视口起始 tile X
   * @param startY 视口起始 tile Y
   * @param endX 视口结束 tile X
   * @param endY 视口结束 tile Y
   */
  render(
    ctx: CanvasRenderingContext2D,
    camX: number, camY: number, zoom: number,
    startX: number, startY: number,
    endX: number, endY: number
  ): void {
    if (!this.enabled) return;

    const civMap = this.civMaps.get(this.activeCivId);
    const vis = this.visibilityMap;
    const tileSize = TILE_SIZE * zoom;

    // 裁剪到世界边界
    const sx = Math.max(0, startX);
    const sy = Math.max(0, startY);
    const ex = Math.min(this.width, endX);
    const ey = Math.min(this.height, endY);

    for (let ty = sy; ty < ey; ty++) {
      for (let tx = sx; tx < ex; tx++) {
        const idx = ty * this.width + tx;
        const state = civMap ? Math.max(civMap[idx], vis[idx]) : FOG_UNEXPLORED;

        if (state === FOG_VISIBLE) continue; // 完全可见，不画迷雾

        const alpha = this.computeSmoothedAlpha(tx, ty, state, civMap, vis);
        if (alpha <= 0.01) continue;

        const px = tx * TILE_SIZE * zoom + camX;
        const py = ty * TILE_SIZE * zoom + camY;

        ctx.fillStyle = `rgba(0,0,0,${alpha.toFixed(2)})`;
        ctx.fillRect(px, py, tileSize + 0.5, tileSize + 0.5);
      }
    }
  }

  /**
   * 计算平滑后的迷雾透明度
   * 对相邻 4 个 tile 的状态取平均，实现边缘过渡
   */
  private computeSmoothedAlpha(
    x: number, y: number,
    centerState: number,
    civMap: Uint8Array | undefined,
    vis: Uint8Array
  ): number {
    const baseAlpha = centerState === FOG_UNEXPLORED ? ALPHA_UNEXPLORED : ALPHA_EXPLORED;

    // 采样四邻居
    let visibleNeighbors = 0;
    let totalNeighbors = 0;

    const offsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (let i = 0; i < 4; i++) {
      const nx = x + offsets[i][0];
      const ny = y + offsets[i][1];
      if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) continue;
      totalNeighbors++;
      const nIdx = ny * this.width + nx;
      const nState = civMap ? Math.max(civMap[nIdx], vis[nIdx]) : FOG_UNEXPLORED;
      if (nState === FOG_VISIBLE) visibleNeighbors++;
    }

    if (totalNeighbors === 0) return baseAlpha;

    // 可见邻居越多，alpha 越低（越透明）
    const blendFactor = visibleNeighbors / totalNeighbors;
    return baseAlpha * (1 - blendFactor * 0.5);
  }

  /**
   * 获取当前文明的探索百分比
   * @returns 0-100 的百分比值
   */
  getExploredPercent(): number {
    const civMap = this.civMaps.get(this.activeCivId);
    if (!civMap || this.width === 0 || this.height === 0) return 0;

    let explored = 0;
    const total = civMap.length;
    for (let i = 0; i < total; i++) {
      if (civMap[i] >= FOG_EXPLORED) explored++;
    }
    return (explored / total) * 100;
  }

  /**
   * 启用或禁用迷雾系统
   * @param enabled 是否启用
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /** 查询迷雾系统是否启用 */
  isEnabled(): boolean {
    return this.enabled;
  }

  /** 强制标记为需要重新计算 */
  markDirty(): void {
    this.dirty = true;
  }

  /** 重置指定文明的探索记忆 */
  resetCivExploration(civId: number): void {
    const map = this.civMaps.get(civId);
    if (map) map.fill(FOG_UNEXPLORED);
    if (civId === this.activeCivId) {
      this.visibilityMap.fill(FOG_UNEXPLORED);
      this.dirty = true;
    }
  }
}
