/**
 * PowerFavoriteSystem - 上帝之力快捷收藏栏
 *
 * 屏幕底部最多 8 个槽位，数字键 1-8 快速选择，右键移除。
 * 收藏数据自动持久化到 localStorage。
 */

interface FavoriteSlot { powerId: string; label: string; color: string }

const STORAGE_KEY = 'worldbox_power_favorites';
const MAX_SLOTS = 8;
const SLOT_SIZE = 52;
const SLOT_GAP = 6;
const BAR_PADDING = 8;
const BAR_HEIGHT = SLOT_SIZE + BAR_PADDING * 2;
const BAR_BOTTOM_MARGIN = 12;
const ICON_RADIUS = 16;

/**
 * 上帝之力收藏栏系统
 *
 * 自包含的 Canvas UI 组件，不依赖项目内其他模块。
 * 提供收藏管理、键盘快捷键、点击交互和渲染功能。
 */
export class PowerFavoriteSystem {
  private slots: (FavoriteSlot | null)[] = new Array(MAX_SLOTS).fill(null);
  private selectedIndex: number = -1;

  constructor() { this.load(); }

  /**
   * 将一个上帝之力添加到指定槽位
   * @param slot 槽位索引 (0-7)
   * @param powerId 力量唯一标识
   * @param label 显示名称
   * @param color CSS 颜色值，用于图标绘制
   */
  addFavorite(slot: number, powerId: string, label: string, color: string): void {
    if (slot < 0 || slot >= MAX_SLOTS) return;
    this.slots[slot] = { powerId, label, color };
    this.save();
  }

  /**
   * 移除指定槽位的收藏
   * @param slot 槽位索引 (0-7)
   */
  removeFavorite(slot: number): void {
    if (slot < 0 || slot >= MAX_SLOTS) return;
    this.slots[slot] = null;
    if (this.selectedIndex === slot) this.selectedIndex = -1;
    this.save();
  }

  /**
   * 获取当前选中槽位的 powerId
   * @returns 选中的 powerId，无选中时返回 null
   */
  getSelectedPower(): string | null {
    if (this.selectedIndex < 0 || this.selectedIndex >= MAX_SLOTS) return null;
    const slot = this.slots[this.selectedIndex];
    return slot ? slot.powerId : null;
  }

  /**
   * 处理键盘输入，数字键 1-8 选择对应槽位
   * @param key 按键字符串（KeyboardEvent.key）
   * @returns 是否消费了该按键
   */
  handleKey(key: string): boolean {
    const num = parseInt(key, 10);
    if (num >= 1 && num <= MAX_SLOTS && this.slots[num - 1]) {
      this.selectedIndex = this.selectedIndex === num - 1 ? -1 : num - 1;
      return true;
    }
    return false;
  }

  /**
   * 处理鼠标点击，判断是否命中收藏栏槽位
   * @param x 鼠标 x 坐标（屏幕像素）
   * @param y 鼠标 y 坐标（屏幕像素）
   * @param screenW 屏幕宽度
   * @param screenH 屏幕高度
   * @returns 命中槽位的 powerId，未命中返回 null
   */
  handleClick(x: number, y: number, screenW: number, screenH: number): string | null {
    const idx = this.hitTest(x, y, screenW, screenH);
    if (idx < 0) return null;
    const slot = this.slots[idx];
    if (!slot) return null;
    this.selectedIndex = this.selectedIndex === idx ? -1 : idx;
    return slot.powerId;
  }

  /**
   * 处理右键点击，移除命中的槽位
   * @param x 鼠标 x 坐标
   * @param y 鼠标 y 坐标
   * @param screenW 屏幕宽度
   * @param screenH 屏幕高度
   * @returns 是否成功移除
   */
  handleRightClick(x: number, y: number, screenW: number, screenH: number): boolean {
    const idx = this.hitTest(x, y, screenW, screenH);
    if (idx < 0 || !this.slots[idx]) return false;
    this.removeFavorite(idx);
    return true;
  }

  /**
   * 渲染收藏栏到 Canvas
   * @param ctx Canvas 2D 渲染上下文
   * @param screenW 屏幕宽度
   * @param screenH 屏幕高度
   */
  render(ctx: CanvasRenderingContext2D, screenW: number, screenH: number): void {
    const barW = this.getBarWidth();
    const barX = (screenW - barW) / 2;
    const barY = screenH - BAR_HEIGHT - BAR_BOTTOM_MARGIN;

    ctx.save();
    // 背景
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = '#1a1a2e';
    this.roundRect(ctx, barX, barY, barW, BAR_HEIGHT, 8);
    ctx.fill();
    ctx.globalAlpha = 1;
    // 边框
    ctx.strokeStyle = '#3a3a5e';
    ctx.lineWidth = 1;
    this.roundRect(ctx, barX, barY, barW, BAR_HEIGHT, 8);
    ctx.stroke();
    // 槽位
    for (let i = 0; i < MAX_SLOTS; i++) {
      this.renderSlot(ctx, barX + BAR_PADDING + i * (SLOT_SIZE + SLOT_GAP), barY + BAR_PADDING, i);
    }
    ctx.restore();
  }

  /** 命中测试，返回槽位索引，未命中返回 -1 */
  private hitTest(x: number, y: number, screenW: number, screenH: number): number {
    const barW = this.getBarWidth();
    const barX = (screenW - barW) / 2;
    const barY = screenH - BAR_HEIGHT - BAR_BOTTOM_MARGIN;
    if (x < barX || x > barX + barW || y < barY || y > barY + BAR_HEIGHT) return -1;
    const localX = x - barX - BAR_PADDING;
    const idx = Math.floor(localX / (SLOT_SIZE + SLOT_GAP));
    if (idx < 0 || idx >= MAX_SLOTS) return -1;
    const slotStart = idx * (SLOT_SIZE + SLOT_GAP);
    if (localX < slotStart || localX > slotStart + SLOT_SIZE) return -1;
    return idx;
  }

  /** 渲染单个槽位 */
  private renderSlot(ctx: CanvasRenderingContext2D, x: number, y: number, index: number): void {
    const isSelected = index === this.selectedIndex;
    const slot = this.slots[index];

    ctx.fillStyle = isSelected ? '#4a4a8e' : '#2a2a4e';
    this.roundRect(ctx, x, y, SLOT_SIZE, SLOT_SIZE, 6);
    ctx.fill();

    if (isSelected) {
      ctx.strokeStyle = '#8888ff';
      ctx.lineWidth = 2;
      this.roundRect(ctx, x, y, SLOT_SIZE, SLOT_SIZE, 6);
      ctx.stroke();
    }

    // 快捷键数字
    ctx.fillStyle = '#666688';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`${index + 1}`, x + 3, y + 2);

    if (slot) {
      const cx = x + SLOT_SIZE / 2;
      const cy = y + SLOT_SIZE / 2 - 2;
      // 图标圆形
      ctx.fillStyle = slot.color;
      ctx.beginPath();
      ctx.arc(cx, cy, ICON_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      // 十字图案
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy);
      ctx.lineTo(cx + 6, cy);
      ctx.moveTo(cx, cy - 6);
      ctx.lineTo(cx, cy + 6);
      ctx.stroke();
      // 标签
      ctx.fillStyle = '#ccccee';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const lbl = slot.label.length > 6 ? slot.label.slice(0, 5) + '..' : slot.label;
      ctx.fillText(lbl, cx, y + SLOT_SIZE - 1);
    }
  }

  private getBarWidth(): number {
    return BAR_PADDING * 2 + MAX_SLOTS * SLOT_SIZE + (MAX_SLOTS - 1) * SLOT_GAP;
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as (FavoriteSlot | null)[];
      if (!Array.isArray(data)) return;
      for (let i = 0; i < MAX_SLOTS; i++) {
        const item = data[i];
        if (item && typeof item.powerId === 'string' && typeof item.label === 'string' && typeof item.color === 'string') {
          this.slots[i] = { powerId: item.powerId, label: item.label, color: item.color };
        }
      }
    } catch { /* 数据损坏时静默忽略 */ }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.slots));
    } catch { /* 存储不可用时静默忽略 */ }
  }
}
