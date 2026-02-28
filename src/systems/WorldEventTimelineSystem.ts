/**
 * WorldEventTimelineSystem - 世界事件时间轴面板系统
 *
 * 记录并展示世界重大事件（战争、文明建立、灾难、纪元变化等），
 * 提供可滚动的 Canvas 时间轴 UI，支持点击事件跳转到对应世界坐标。
 * 按 T 键切换面板显示/隐藏。
 */

/** 单条世界事件 */
interface WorldEvent {
  tick: number;
  type: string;
  typeUpper: string;  // Pre-computed type.toUpperCase() for render
  description: string;
  worldX: number;
  worldY: number;
  hasLocation: boolean;
}

/** 事件类型对应的颜色映射 */
const EVENT_COLORS: Record<string, string> = {
  war: '#e74c3c',
  civilization: '#3498db',
  disaster: '#e67e22',
  era: '#9b59b6',
  diplomacy: '#2ecc71',
  death: '#7f8c8d',
  birth: '#f1c40f',
  building: '#1abc9c',
};

const DEFAULT_EVENT_COLOR = '#bdc3c7';

/** 面板布局常量 */
const PANEL_WIDTH_RATIO = 0.3;
const PANEL_MIN_WIDTH = 280;
const PANEL_MAX_WIDTH = 420;
const PANEL_MARGIN = 12;
const HEADER_HEIGHT = 36;
const ROW_HEIGHT = 52;
const SCROLLBAR_WIDTH = 8;
const TYPE_DOT_RADIUS = 5;
const PANEL_BG = 'rgba(20, 20, 30, 0.92)';
const PANEL_HEADER_BG = 'rgba(40, 40, 60, 0.95)';
const PANEL_BORDER = 'rgba(100, 100, 140, 0.6)';
const TEXT_PRIMARY = '#e0e0e0';
const TEXT_SECONDARY = '#a0a0b0';
const HOVER_BG = 'rgba(80, 80, 120, 0.4)';

/**
 * 世界事件时间轴系统
 *
 * @example
 * ```ts
 * const timeline = new WorldEventTimelineSystem();
 * timeline.addEvent(1200, 'war', '人类与兽人爆发战争', 100, 50);
 * timeline.addEvent(2400, 'civilization', '精灵建立新城市', 80, 120);
 * ```
 */
export class WorldEventTimelineSystem {
  private events: WorldEvent[] = [];
  private visible = false;
  private scrollOffset = 0;
  private hoveredIndex = -1;
  private _prevEventCount = -1;
  private _headerStr = 'World Timeline (0)';

  /** 创建世界事件时间轴系统 */
  constructor() {
    // 自包含，无需参数
  }

  /**
   * 添加一条世界事件
   * @param tick - 事件发生的游戏 tick
   * @param type - 事件类型（war/civilization/disaster/era/diplomacy/death/birth/building）
   * @param description - 事件描述文本
   * @param worldX - 事件发生的世界 X 坐标（可选）
   * @param worldY - 事件发生的世界 Y 坐标（可选）
   */
  addEvent(tick: number, type: string, description: string, worldX?: number, worldY?: number): void {
    const evt: WorldEvent = {
      tick,
      type,
      typeUpper: type.toUpperCase(),
      description,
      worldX: worldX ?? 0,
      worldY: worldY ?? 0,
      hasLocation: worldX !== undefined && worldY !== undefined,
    };
    // 插入排序，保持按 tick 升序
    let i = this.events.length;
    while (i > 0 && this.events[i - 1].tick > tick) {
      i--;
    }
    this.events.splice(i, 0, evt);
  }

  /**
   * 每帧更新（当前为空，预留扩展）
   * @param _tick - 当前游戏 tick
   */
  update(_tick: number): void {
    // 预留：可用于自动记录事件或动画
  }

  /**
   * 处理键盘输入
   * @param key - 按键名称
   * @returns 是否消费了该按键事件
   */
  handleKey(key: string): boolean {
    if (key === 't' || key === 'T') {
      this.visible = !this.visible;
      this.scrollOffset = 0;
      return true;
    }
    if (!this.visible) return false;

    if (key === 'ArrowUp') {
      this.scrollOffset = Math.max(0, this.scrollOffset - ROW_HEIGHT);
      return true;
    }
    if (key === 'ArrowDown') {
      this.scrollOffset += ROW_HEIGHT;
      return true;
    }
    if (key === 'Escape') {
      this.visible = false;
      return true;
    }
    return false;
  }

  /**
   * 处理鼠标点击，如果点击了有坐标的事件则返回世界坐标
   * @param x - 屏幕点击 X
   * @param y - 屏幕点击 Y
   * @param screenW - 屏幕宽度
   * @param screenH - 屏幕高度
   * @returns 事件的世界坐标，或 null
   */
  handleClick(x: number, y: number, screenW: number, screenH: number): { worldX: number; worldY: number } | null {
    if (!this.visible) return null;

    const panelRect = this.getPanelRect(screenW, screenH);
    if (x < panelRect.x || x > panelRect.x + panelRect.w || y < panelRect.y || y > panelRect.y + panelRect.h) {
      return null;
    }

    // 滚动条区域处理
    const contentX = x - panelRect.x;
    if (contentX > panelRect.w - SCROLLBAR_WIDTH - 4) {
      const contentH = panelRect.h - HEADER_HEIGHT;
      const totalH = this.events.length * ROW_HEIGHT;
      if (totalH > contentH) {
        const ratio = (y - panelRect.y - HEADER_HEIGHT) / contentH;
        this.scrollOffset = Math.max(0, Math.floor(ratio * totalH - contentH / 2));
      }
      return null;
    }

    const relY = y - panelRect.y - HEADER_HEIGHT + this.scrollOffset;
    const idx = Math.floor(relY / ROW_HEIGHT);

    if (idx >= 0 && idx < this.events.length) {
      const evt = this.events[idx];
      if (evt.hasLocation) {
        return { worldX: evt.worldX, worldY: evt.worldY };
      }
    }
    return null;
  }

  /**
   * 处理鼠标滚轮（外部调用）
   * @param deltaY - 滚轮增量
   */
  handleWheel(deltaY: number): void {
    if (!this.visible) return;
    this.scrollOffset = Math.max(0, this.scrollOffset + Math.sign(deltaY) * ROW_HEIGHT);
  }

  /**
   * 更新鼠标位置用于 hover 高亮
   * @param x - 屏幕 X
   * @param y - 屏幕 Y
   * @param screenW - 屏幕宽度
   * @param screenH - 屏幕高度
   */
  handleMouseMove(x: number, y: number, screenW: number, screenH: number): void {
    if (!this.visible) {
      this.hoveredIndex = -1;
      return;
    }
    const panelRect = this.getPanelRect(screenW, screenH);
    if (x < panelRect.x || x > panelRect.x + panelRect.w || y < panelRect.y || y > panelRect.y + panelRect.h) {
      this.hoveredIndex = -1;
      return;
    }
    const relY = y - panelRect.y - HEADER_HEIGHT + this.scrollOffset;
    this.hoveredIndex = Math.floor(relY / ROW_HEIGHT);
  }

  /**
   * 渲染时间轴面板
   * @param ctx - Canvas 2D 渲染上下文
   * @param screenW - 屏幕宽度
   * @param screenH - 屏幕高度
   */
  render(ctx: CanvasRenderingContext2D, screenW: number, screenH: number): void {
    if (!this.visible) return;

    const p = this.getPanelRect(screenW, screenH);
    const contentH = p.h - HEADER_HEIGHT;
    const totalH = this.events.length * ROW_HEIGHT;
    const maxScroll = Math.max(0, totalH - contentH);
    if (this.scrollOffset > maxScroll) this.scrollOffset = maxScroll;

    // 面板背景
    ctx.fillStyle = PANEL_BG;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = PANEL_BORDER;
    ctx.lineWidth = 1;
    ctx.strokeRect(p.x, p.y, p.w, p.h);

    // 标题栏
    ctx.fillStyle = PANEL_HEADER_BG;
    ctx.fillRect(p.x, p.y, p.w, HEADER_HEIGHT);
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = 'bold 14px monospace';
    ctx.textBaseline = 'middle';
    const el = this.events.length;
    if (el !== this._prevEventCount) { this._prevEventCount = el; this._headerStr = `World Timeline (${el})` }
    ctx.fillText(this._headerStr, p.x + 10, p.y + HEADER_HEIGHT / 2);
    ctx.fillStyle = TEXT_SECONDARY;
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('[T] close  [Arrows] scroll', p.x + p.w - 10, p.y + HEADER_HEIGHT / 2);
    ctx.textAlign = 'left';

    // 裁剪内容区域
    ctx.save();
    ctx.beginPath();
    ctx.rect(p.x, p.y + HEADER_HEIGHT, p.w, contentH);
    ctx.clip();

    // 绘制事件行
    const startIdx = Math.max(0, Math.floor(this.scrollOffset / ROW_HEIGHT));
    const endIdx = Math.min(this.events.length, startIdx + Math.ceil(contentH / ROW_HEIGHT) + 1);

    for (let i = startIdx; i < endIdx; i++) {
      const evt = this.events[i];
      const rowY = p.y + HEADER_HEIGHT + i * ROW_HEIGHT - this.scrollOffset;

      // hover 高亮
      if (i === this.hoveredIndex) {
        ctx.fillStyle = HOVER_BG;
        ctx.fillRect(p.x + 1, rowY, p.w - SCROLLBAR_WIDTH - 6, ROW_HEIGHT);
      }

      // 时间轴线
      const lineX = p.x + 20;
      ctx.strokeStyle = 'rgba(100,100,140,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lineX, rowY);
      ctx.lineTo(lineX, rowY + ROW_HEIGHT);
      ctx.stroke();

      // 类型圆点
      const color = EVENT_COLORS[evt.type] || DEFAULT_EVENT_COLOR;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(lineX, rowY + ROW_HEIGHT / 2, TYPE_DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      // tick 标签
      ctx.fillStyle = TEXT_SECONDARY;
      ctx.font = '10px monospace';
      ctx.fillText(`T:${evt.tick}`, p.x + 32, rowY + 14);

      // 类型标签
      ctx.fillStyle = color;
      ctx.font = 'bold 10px monospace';
      ctx.fillText(evt.typeUpper, p.x + 90, rowY + 14);

      // 描述
      ctx.fillStyle = TEXT_PRIMARY;
      ctx.font = '12px monospace';
      const maxTextW = p.w - 50 - SCROLLBAR_WIDTH;
      const desc = this.truncateText(ctx, evt.description, maxTextW);
      ctx.fillText(desc, p.x + 32, rowY + 34);

      // 位置图标
      if (evt.hasLocation) {
        ctx.fillStyle = '#5dade2';
        ctx.font = '10px monospace';
        ctx.fillText('\u2316', p.x + p.w - SCROLLBAR_WIDTH - 20, rowY + ROW_HEIGHT / 2 + 3);
      }

      // 分隔线
      ctx.strokeStyle = 'rgba(100,100,140,0.15)';
      ctx.beginPath();
      ctx.moveTo(p.x + 8, rowY + ROW_HEIGHT);
      ctx.lineTo(p.x + p.w - SCROLLBAR_WIDTH - 8, rowY + ROW_HEIGHT);
      ctx.stroke();
    }

    ctx.restore();

    // 滚动条
    if (totalH > contentH) {
      const barH = Math.max(20, (contentH / totalH) * contentH);
      const barY = p.y + HEADER_HEIGHT + (this.scrollOffset / totalH) * contentH;
      ctx.fillStyle = 'rgba(100,100,140,0.4)';
      ctx.fillRect(p.x + p.w - SCROLLBAR_WIDTH - 2, p.y + HEADER_HEIGHT, SCROLLBAR_WIDTH, contentH);
      ctx.fillStyle = 'rgba(160,160,200,0.6)';
      ctx.fillRect(p.x + p.w - SCROLLBAR_WIDTH - 2, barY, SCROLLBAR_WIDTH, barH);
    }

    // 空状态
    if (this.events.length === 0) {
      ctx.fillStyle = TEXT_SECONDARY;
      ctx.font = '13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No events recorded yet', p.x + p.w / 2, p.y + p.h / 2);
      ctx.textAlign = 'left';
    }
  }

  /** 获取面板矩形区域 */
  private getPanelRect(screenW: number, screenH: number): { x: number; y: number; w: number; h: number } {
    const w = Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, screenW * PANEL_WIDTH_RATIO));
    const h = screenH - PANEL_MARGIN * 2;
    const x = screenW - w - PANEL_MARGIN;
    const y = PANEL_MARGIN;
    return { x, y, w, h };
  }

  /** 截断文本以适应最大宽度 */
  private truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let truncated = text;
    while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + '...';
  }

  /** 获取当前事件总数 */
  get eventCount(): number {
    return this.events.length;
  }

  /** 面板是否可见 */
  get isVisible(): boolean {
    return this.visible;
  }
}
