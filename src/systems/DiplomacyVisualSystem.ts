/**
 * DiplomacyVisualSystem - 外交关系可视化系统
 * 在地图上显示文明间的外交关系连线、事件气泡、关系矩阵面板和领土高亮
 */

/** 外交事件数据 */
export interface DiplomacyEvent {
  type: 'war' | 'peace' | 'alliance' | 'trade'
  civA: string
  civB: string
  x: number; y: number
}

/** 文明关系数据 */
export interface CivRelationData {
  id: number
  name: string
  color: string
  capitalX: number; capitalY: number
  relations: Map<number, number>
}

interface ActiveBubble {
  type: DiplomacyEvent['type']
  x: number; y: number
  startTick: number
  text: string
  color: string
}

const MAX_BUBBLES = 10;
const BUBBLE_DURATION = 120;

// Pre-allocated line style objects to avoid per-draw allocation in getLineStyle()
interface LineStyle { color: string; dash: number[]; width: number; alpha: number }
const _STYLE_ALLY:    LineStyle = { color: '#2ecc71', dash: [],      width: 2.5, alpha: 0.9 }
const _STYLE_FRIEND:  LineStyle = { color: '#a8e6a3', dash: [8, 4],  width: 1.5, alpha: 0.7 }
const _STYLE_NEUTRAL: LineStyle = { color: '#888',    dash: [2, 4],  width: 1,   alpha: 0.4 }
const _STYLE_HOSTILE: LineStyle = { color: '#e67e22', dash: [6, 4],  width: 1.5, alpha: 0.7 }
const _STYLE_WAR:     LineStyle = { color: '#e74c3c', dash: [],      width: 3,   alpha: 0.9 }
/** Pre-computed relation value strings [-100, 100] — avoids String(val) per-cell per-frame in matrix panel */
const _REL_STR: readonly string[] = (() => {
  const a: string[] = []
  for (let v = -100; v <= 100; v++) a.push(String(v))
  return a
})()
const _relStr = (v: number): string => _REL_STR[Math.max(-100, Math.min(100, v)) + 100]
const _EMPTY_DASH: number[] = []

// Pre-computed relation colors: 201 steps for val -100..100
// Fixed alpha 0.7
const RELATION_COLORS: string[] = (() => {
  const cols: string[] = []
  for (let i = 0; i <= 200; i++) {
    const val = i - 100 // -100..100
    const t = (val + 100) / 200
    const r = Math.round(t < 0.5 ? 220 : 220 - (t - 0.5) * 2 * 180)
    const g = Math.round(t < 0.5 ? t * 2 * 200 : 200)
    cols.push(`rgba(${r},${g},40,0.7)`)
  }
  return cols
})()

const EVENT_CONFIG: Record<DiplomacyEvent['type'], { text: string; color: string }> = {
  war:      { text: '\u2694 \u5BA3\u6218!', color: '#e74c3c' },
  peace:    { text: '\uD83D\uDD4A \u548C\u5E73',  color: '#2ecc71' },
  alliance: { text: '\uD83E\uDD1D \u7ED3\u76DF',  color: '#3498db' },
  trade:    { text: '\uD83D\uDCB0 \u8D38\u6613',  color: '#f1c40f' },
};

export class DiplomacyVisualSystem {
  private civs: CivRelationData[] = [];
  private bubbles: ActiveBubble[] = [];
  private visible = true;
  private panelVisible = false;
  private hoveredCivId: number | null = null;
  private panelX = 0;
  private panelY = 0;
  private _lastZoom = -1;
  private _labelFont = '';

  /** 更新文明数据快照 */
  updateCivData(civs: CivRelationData[]): void {
    this.civs = civs;
  }

  /** 添加外交事件气泡 */
  addEvent(event: DiplomacyEvent): void {
    const cfg = EVENT_CONFIG[event.type];
    if (this.bubbles.length >= MAX_BUBBLES) {
      this.bubbles.shift();
    }
    this.bubbles.push({
      type: event.type,
      x: event.x,
      y: event.y,
      startTick: -1,
      text: cfg.text,
      color: cfg.color,
    });
  }

  /** 切换关系面板显示 */
  toggle(): void {
    this.panelVisible = !this.panelVisible;
  }

  /** 关系面板是否可见 */
  isVisible(): boolean {
    return this.panelVisible;
  }

  /** 每 tick 更新气泡生命周期 */
  update(tick: number): void {
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i]
      if (b.startTick < 0) b.startTick = tick
      if (tick - b.startTick >= BUBBLE_DURATION) this.bubbles.splice(i, 1)
    }
  }

  /** 在世界坐标中渲染关系连线、气泡、领土高亮 */
  render(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number): void {
    if (!this.visible || this.civs.length < 2) return;
    ctx.save();
    this.renderRelationLines(ctx, camX, camY, zoom);
    this.renderBubbles(ctx, camX, camY, zoom);
    this.renderTerritoryHighlight(ctx, camX, camY, zoom);
    ctx.restore();
  }

  /** 渲染关系矩阵面板（屏幕坐标） */
  renderPanel(ctx: CanvasRenderingContext2D, screenWidth: number, screenHeight: number): void {
    if (!this.panelVisible || this.civs.length === 0) return;
    const n = this.civs.length;
    const cellSize = 40;
    const headerSize = 60;
    const pw = headerSize + n * cellSize;
    const ph = headerSize + n * cellSize;
    const px = Math.floor((screenWidth - pw) / 2);
    const py = Math.floor((screenHeight - ph) / 2);
    this.panelX = px;
    this.panelY = py;

    ctx.save();
    // 背景
    ctx.fillStyle = 'rgba(20, 20, 30, 0.92)';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, pw, ph);

    // 标题
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 列头
    for (let i = 0; i < n; i++) {
      const cx = px + headerSize + i * cellSize + cellSize / 2;
      ctx.save();
      ctx.translate(cx, py + headerSize / 2);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = this.civs[i].color;
      ctx.fillText(this.civs[i].name.slice(0, 4), 0, 0);
      ctx.restore();
    }

    // 行头 + 单元格
    for (let r = 0; r < n; r++) {
      const civR = this.civs[r];
      const ry = py + headerSize + r * cellSize;
      ctx.fillStyle = civR.color;
      ctx.textAlign = 'right';
      ctx.fillText(civR.name.slice(0, 5), px + headerSize - 4, ry + cellSize / 2);

      for (let c = 0; c < n; c++) {
        const cx = px + headerSize + c * cellSize;
        const civC = this.civs[c];
        if (r === c) {
          ctx.fillStyle = 'rgba(100,100,100,0.3)';
          ctx.fillRect(cx, ry, cellSize, cellSize);
          continue;
        }
        const val = civR.relations.get(civC.id) ?? 0;
        ctx.fillStyle = this.relationColor(val);
        ctx.fillRect(cx, ry, cellSize, cellSize);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.strokeRect(cx, ry, cellSize, cellSize);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = '10px monospace';
        ctx.fillText(_relStr(val), cx + cellSize / 2, ry + cellSize / 2);
      }
    }
    ctx.restore();
  }

  /** 处理面板点击，返回是否消费了事件 */
  handleClick(x: number, y: number): boolean {
    if (!this.panelVisible) return false;
    const n = this.civs.length;
    const cellSize = 40;
    const headerSize = 60;
    const pw = headerSize + n * cellSize;
    const ph = headerSize + n * cellSize;
    if (x >= this.panelX && x <= this.panelX + pw &&
        y >= this.panelY && y <= this.panelY + ph) {
      const col = Math.floor((x - this.panelX - headerSize) / cellSize);
      if (col >= 0 && col < n) {
        this.hoveredCivId = this.civs[col].id;
      }
      return true;
    }
    this.hoveredCivId = null;
    return false;
  }

  // ---- 私有渲染方法 ----

  private renderRelationLines(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number): void {
    if (zoom !== this._lastZoom) {
      this._lastZoom = zoom
      this._labelFont = `bold ${Math.round(11 * zoom)}px monospace`
    }
    const tileSize = 16 * zoom;
    for (let i = 0; i < this.civs.length; i++) {
      for (let j = i + 1; j < this.civs.length; j++) {
        const a = this.civs[i];
        const b = this.civs[j];
        const val = a.relations.get(b.id) ?? 0;
        const ax = (a.capitalX - camX) * tileSize;
        const ay = (a.capitalY - camY) * tileSize;
        const bx = (b.capitalX - camX) * tileSize;
        const by = (b.capitalY - camY) * tileSize;

        const style = this.getLineStyle(val);
        ctx.beginPath();
        ctx.setLineDash(style.dash);
        ctx.strokeStyle = style.color;
        ctx.lineWidth = style.width;
        ctx.globalAlpha = style.alpha;
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
        ctx.setLineDash(_EMPTY_DASH);
        ctx.globalAlpha = 1;

        // 同盟心形
        if (val >= 80) {
          const mx = (ax + bx) / 2;
          const my = (ay + by) / 2;
          this.drawHeart(ctx, mx, my, 6 * zoom);
        }
        // 战争闪烁
        if (val <= -80) {
          const mx = (ax + bx) / 2;
          const my = (ay + by) / 2;
          if (Math.random() > 0.5) {
            this.drawCrossedSwords(ctx, mx, my, 5 * zoom);
          }
        }
      }
    }
  }

  private getLineStyle(val: number): LineStyle {
    if (val >= 80)  return _STYLE_ALLY;
    if (val >= 30)  return _STYLE_FRIEND;
    if (val >= -30) return _STYLE_NEUTRAL;
    if (val >= -80) return _STYLE_HOSTILE;
    return _STYLE_WAR;
  }

  private drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.save();
    ctx.fillStyle = '#e74c7b';
    ctx.beginPath();
    const s = size;
    ctx.moveTo(x, y + s * 0.3);
    ctx.bezierCurveTo(x, y - s * 0.3, x - s, y - s * 0.3, x - s, y + s * 0.1);
    ctx.bezierCurveTo(x - s, y + s * 0.6, x, y + s, x, y + s);
    ctx.bezierCurveTo(x, y + s, x + s, y + s * 0.6, x + s, y + s * 0.1);
    ctx.bezierCurveTo(x + s, y - s * 0.3, x, y - s * 0.3, x, y + s * 0.3);
    ctx.fill();
    ctx.restore();
  }

  private drawCrossedSwords(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.save();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - size, y - size);
    ctx.lineTo(x + size, y + size);
    ctx.moveTo(x + size, y - size);
    ctx.lineTo(x - size, y + size);
    ctx.stroke();
    ctx.restore();
  }

  private renderBubbles(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number): void {
    const tileSize = 16 * zoom;
    for (const b of this.bubbles) {
      const elapsed = b.startTick >= 0 ? Math.max(0, BUBBLE_DURATION - 1) : 0;
      const progress = b.startTick >= 0 ? Math.min(1, elapsed / BUBBLE_DURATION) : 0;
      const floatY = progress * 30 * zoom;
      const alpha = 1 - progress * 0.7;

      const sx = (b.x - camX) * tileSize;
      const sy = (b.y - camY) * tileSize - floatY;

      ctx.save();
      ctx.globalAlpha = Math.max(0.1, alpha);
      ctx.font = this._labelFont;
      const metrics = ctx.measureText(b.text);
      const tw = metrics.width + 12 * zoom;
      const th = 18 * zoom;

      this.drawRoundRect(ctx, sx - tw / 2, sy - th / 2, tw, th, 5 * zoom);
      ctx.fillStyle = b.color;
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.text, sx, sy);
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  private renderTerritoryHighlight(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number): void {
    if (this.hoveredCivId === null) return;
    const civ = this.civs.find(c => c.id === this.hoveredCivId);
    if (!civ) return;
    const tileSize = 16 * zoom;
    const radius = 5;
    const cx = (civ.capitalX - camX) * tileSize;
    const cy = (civ.capitalY - camY) * tileSize;
    const r = radius * tileSize;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = civ.color + '33';
    ctx.fill();
    ctx.strokeStyle = civ.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  private drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
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

  /** 关系值 -> 颜色（红-黄-绿渐变） */
  private relationColor(val: number): string {
    return RELATION_COLORS[Math.min(200, Math.max(0, Math.round(val) + 100))]
  }
}
