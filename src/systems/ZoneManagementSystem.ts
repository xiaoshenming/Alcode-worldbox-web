/**
 * ZoneManagementSystem - 区域管理系统
 *
 * 玩家可在地图上划定矩形区域并分类管理。
 * 支持禁区、保护区、战区、资源区四种类型，
 * 每种类型以不同颜色的半透明覆盖层 + 虚线边框渲染。
 * 按 Z 键切换区域管理面板的显示。
 */

/** 区域类型与对应颜色映射 */
const ZONE_COLORS: Record<string, { fill: string; stroke: string }> = {
  forbidden:  { fill: 'rgba(255,60,60,0.18)',   stroke: 'rgba(255,60,60,0.8)' },
  protected:  { fill: 'rgba(60,200,60,0.18)',   stroke: 'rgba(60,200,60,0.8)' },
  warzone:    { fill: 'rgba(255,160,40,0.18)',  stroke: 'rgba(255,160,40,0.8)' },
  resource:   { fill: 'rgba(60,120,255,0.18)',  stroke: 'rgba(60,120,255,0.8)' },
};

/** 区域类型的中文标签 */
const ZONE_LABELS: Record<string, string> = {
  forbidden: '禁区',
  protected: '保护区',
  warzone:   '战区',
  resource:  '资源区',
};

/** 合法的区域类型列表 */
const ZONE_TYPES = Object.keys(ZONE_COLORS);

/** 单个区域的数据结构 */
interface Zone {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  type: string;
  name: string;
  description: string;
}

/**
 * 区域管理系统
 *
 * 负责区域的增删查、键盘交互、渲染覆盖层以及管理面板的绘制。
 * 自包含，不依赖项目内其他模块。
 */
export class ZoneManagementSystem {
  /** 所有区域，按 id 索引 */
  private zones: Map<number, Zone> = new Map();
  /** 自增 ID 计数器 */
  private nextId = 1;
  /** 管理面板是否可见 */
  private panelVisible = false;
  /** 面板滚动偏移 */
  private panelScroll = 0;
  /** 虚线动画偏移量（像素） */
  private dashOffset = 0;

  /**
   * 添加一个矩形区域
   * @param x 区域左上角世界坐标 X
   * @param y 区域左上角世界坐标 Y
   * @param w 区域宽度（世界单位）
   * @param h 区域高度（世界单位）
   * @param type 区域类型：forbidden | protected | warzone | resource
   * @param name 区域名称
   * @returns 新区域的唯一 ID
   */
  addZone(x: number, y: number, w: number, h: number, type: string, name: string): number {
    const resolvedType = ZONE_TYPES.includes(type) ? type : 'forbidden';
    const id = this.nextId++;
    this.zones.set(id, { id, x, y, w, h, type: resolvedType, name, description: '' });
    return id;
  }

  /**
   * 删除指定 ID 的区域
   * @param id 区域 ID
   */
  removeZone(id: number): void {
    this.zones.delete(id);
  }

  /**
   * 查询某个世界坐标所在的区域类型
   * @param worldX 世界坐标 X
   * @param worldY 世界坐标 Y
   * @returns 区域类型字符串，若不在任何区域内则返回 null
   */
  getZoneAt(worldX: number, worldY: number): string | null {
    for (const zone of this.zones.values()) {
      if (
        worldX >= zone.x && worldX < zone.x + zone.w &&
        worldY >= zone.y && worldY < zone.y + zone.h
      ) {
        return zone.type;
      }
    }
    return null;
  }

  /**
   * 获取指定 ID 的区域（用于外部读取/修改描述等）
   * @param id 区域 ID
   */
  getZone(id: number): Zone | undefined {
    return this.zones.get(id);
  }

  /**
   * 设置区域描述
   * @param id 区域 ID
   * @param desc 描述文本
   */
  setDescription(id: number, desc: string): void {
    const zone = this.zones.get(id);
    if (zone) zone.description = desc;
  }

  /**
   * 切换区域类型
   * @param id 区域 ID
   * @param newType 新类型
   */
  changeZoneType(id: number, newType: string): void {
    const zone = this.zones.get(id);
    if (zone && ZONE_TYPES.includes(newType)) {
      zone.type = newType;
    }
  }

  /**
   * 处理键盘输入
   * @param key 按键名称（KeyboardEvent.key）
   * @returns 是否消费了该按键事件
   */
  handleKey(key: string): boolean {
    if (key === 'z' || key === 'Z') {
      this.panelVisible = !this.panelVisible;
      this.panelScroll = 0;
      return true;
    }
    return false;
  }

  /**
   * 每帧更新（驱动虚线动画）
   * @param _tick 当前 tick 数
   */
  update(_tick: number): void {
    this.dashOffset = (this.dashOffset + 0.4) % 16;
  }

  /**
   * 渲染所有区域覆盖层及管理面板
   * @param ctx Canvas 2D 上下文
   * @param camX 摄像机世界坐标 X
   * @param camY 摄像机世界坐标 Y
   * @param zoom 缩放倍率
   * @param screenW 屏幕宽度（像素）
   * @param screenH 屏幕高度（像素）
   */
  render(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    zoom: number,
    screenW: number,
    screenH: number,
  ): void {
    this.renderZones(ctx, camX, camY, zoom, screenW, screenH);
    if (this.panelVisible) {
      this.renderPanel(ctx, screenW, screenH);
    }
  }

  // ── 内部渲染方法 ──────────────────────────────────────────

  /** 渲染地图上的区域覆盖层 */
  private renderZones(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    zoom: number,
    screenW: number,
    screenH: number,
  ): void {
    ctx.save();
    for (const zone of this.zones.values()) {
      const sx = (zone.x - camX) * zoom;
      const sy = (zone.y - camY) * zoom;
      const sw = zone.w * zoom;
      const sh = zone.h * zoom;

      // 视口裁剪
      if (sx + sw < 0 || sy + sh < 0 || sx > screenW || sy > screenH) continue;

      const colors = ZONE_COLORS[zone.type] ?? ZONE_COLORS.forbidden;

      // 半透明填充
      ctx.fillStyle = colors.fill;
      ctx.fillRect(sx, sy, sw, sh);

      // 虚线边框
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = -this.dashOffset;
      ctx.strokeRect(sx + 1, sy + 1, sw - 2, sh - 2);

      // 区域名称标签
      if (sw > 40 && sh > 20) {
        ctx.setLineDash([]);
        ctx.font = `${Math.min(14, Math.max(10, sw / 8))}px monospace`;
        ctx.fillStyle = colors.stroke;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(zone.name, sx + sw / 2, sy + sh / 2, sw - 8);
      }
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  /** 渲染区域管理面板（屏幕右侧） */
  private renderPanel(
    ctx: CanvasRenderingContext2D,
    screenW: number,
    screenH: number,
  ): void {
    const pw = 260;
    const px = screenW - pw - 12;
    const py = 50;
    const ph = Math.min(screenH - 100, 420);

    ctx.save();

    // 面板背景
    ctx.fillStyle = 'rgba(20,20,30,0.88)';
    ctx.strokeStyle = 'rgba(180,180,200,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 6);
    ctx.fill();
    ctx.stroke();

    // 标题
    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('区域管理 [Z]', px + pw / 2, py + 10);

    // 分隔线
    ctx.strokeStyle = 'rgba(180,180,200,0.3)';
    ctx.beginPath();
    ctx.moveTo(px + 10, py + 32);
    ctx.lineTo(px + pw - 10, py + 32);
    ctx.stroke();

    // 区域列表
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const rowH = 52;
    const listY = py + 40;
    const maxRows = Math.floor((ph - 50) / rowH);
    const zones: Zone[] = []
    for (const z of this.zones.values()) zones.push(z)

    if (zones.length === 0) {
      ctx.fillStyle = 'rgba(180,180,180,0.6)';
      ctx.font = '12px monospace';
      ctx.fillText('暂无区域', px + 20, listY + 10);
    }

    ctx.beginPath();
    ctx.rect(px, listY, pw, ph - 50);
    ctx.clip();

    for (let i = 0; i < zones.length && i < maxRows + this.panelScroll; i++) {
      if (i < this.panelScroll) continue;
      const zone = zones[i];
      const ry = listY + (i - this.panelScroll) * rowH;
      if (ry + rowH > py + ph) break;

      const colors = ZONE_COLORS[zone.type] ?? ZONE_COLORS.forbidden;
      const label = ZONE_LABELS[zone.type] ?? zone.type;

      // 行背景
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(px + 6, ry, pw - 12, rowH - 4);

      // 类型色块
      ctx.fillStyle = colors.stroke;
      ctx.fillRect(px + 12, ry + 6, 8, 8);

      // 名称 + 类型
      ctx.fillStyle = '#ddd';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`${zone.name}`, px + 26, ry + 4);
      ctx.fillStyle = 'rgba(180,180,180,0.7)';
      ctx.font = '10px monospace';
      ctx.fillText(`[${label}] ${zone.w}x${zone.h}`, px + 26, ry + 20);

      // 描述（截断）
      if (zone.description) {
        ctx.fillStyle = 'rgba(160,160,160,0.6)';
        ctx.font = '10px monospace';
        const desc = zone.description.length > 24
          ? zone.description.slice(0, 24) + '...'
          : zone.description;
        ctx.fillText(desc, px + 26, ry + 34);
      }
    }

    ctx.restore();
  }
}
