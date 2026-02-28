/**
 * EventNotificationSystem - 迷你事件通知系统
 * 屏幕边缘指示器、弹幕滚动、事件历史面板
 */
export type EventPriority = 'critical' | 'high' | 'medium' | 'low';
export type EventCategory = 'war' | 'disaster' | 'build' | 'discovery' | 'diplomacy' | 'death';

export interface GameEvent {
  id: number;
  category: EventCategory;
  priority: EventPriority;
  message: string;
  worldX: number; worldY: number;
  tick: number;
}

interface EdgeIndicator {
  event: GameEvent;
  screenX: number; screenY: number;
  angle: number;
}

interface Marquee {
  event: GameEvent;
  x: number;
  textWidth: number;
}

const COLORS: Record<EventCategory, string> = {
  war: '#ff4444', disaster: '#ff8800', build: '#4488ff',
  discovery: '#ffcc00', diplomacy: '#aa66ff', death: '#888888',
};
const ICONS: Record<EventCategory, string> = {
  war: '\u2694', disaster: '\u26a0', build: '\u2692',
  discovery: '\u2605', diplomacy: '\u2696', death: '\u2620',
};

const MAX_IND = 6;
const MAX_QUEUE = 20;
const HIST_CAP = 50;
const MQ_SPEED = 2;
const MQ_H = 28;
const IND_SZ = 14;
const IND_MARGIN = 30;
const HIST_W = 320;
const HIST_ROW = 24;

export class EventNotificationSystem {
  private nextId = 1;
  private indicators: EdgeIndicator[] = [];
  private activeMarquee: Marquee | null = null;
  private marqueeQueue: GameEvent[] = [];
  private histBuf: (GameEvent | null)[];
  private histHead = 0;
  private histCount = 0;
  private histVisible = false;
  private flashAlpha = 0;
  private _candidatesBuf: GameEvent[] = [];

  constructor() {
    this.histBuf = new Array<GameEvent | null>(HIST_CAP).fill(null);
  }

  /** 推送一条游戏事件 */
  pushEvent(
    category: EventCategory, priority: EventPriority,
    message: string, worldX: number, worldY: number, tick: number
  ): void {
    const evt: GameEvent = { id: this.nextId++, category, priority, message, worldX, worldY, tick };
    this.addHistory(evt);
    if (priority === 'critical') this.flashAlpha = 0.6;
    if (priority !== 'low') this.enqueueMarquee(evt);
  }

  /** 每帧更新 */
  update(
    _tick: number, camX: number, camY: number,
    screenWidth: number, screenHeight: number, zoom: number
  ): void {
    this.rebuildIndicators(camX, camY, screenWidth, screenHeight, zoom);
    this.updateMarquee(screenWidth);
    if (this.flashAlpha > 0) this.flashAlpha = Math.max(0, this.flashAlpha - 0.02);
  }

  /** 渲染所有通知 UI */
  render(ctx: CanvasRenderingContext2D, screenWidth: number, screenHeight: number): void {
    if (this.flashAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = this.flashAlpha * 0.3;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, screenWidth, screenHeight);
      ctx.restore();
    }
    this.renderIndicators(ctx);
    this.renderMarquee(ctx, screenWidth);
    if (this.histVisible) this.renderHistory(ctx, screenWidth, screenHeight);
  }

  toggleHistory(): void { this.histVisible = !this.histVisible; }
  isHistoryVisible(): boolean { return this.histVisible; }

  /** 处理点击，返回需要导航到的世界坐标 */
  handleClick(x: number, y: number): { navigateTo?: { x: number; y: number } } | null {
    const hitR = (IND_SZ + 10) * (IND_SZ + 10);
    for (let i = 0; i < this.indicators.length; i++) {
      const ind = this.indicators[i];
      const dx = x - ind.screenX, dy = y - ind.screenY;
      if (dx * dx + dy * dy < hitR) {
        return { navigateTo: { x: ind.event.worldX, y: ind.event.worldY } };
      }
    }
    return null;
  }

  /** 获取最近 N 条事件 */
  getRecentEvents(count: number): GameEvent[] {
    const result: GameEvent[] = [];
    const n = Math.min(count, this.histCount);
    for (let i = 0; i < n; i++) {
      const evt = this.histBuf[(this.histHead - 1 - i + HIST_CAP) % HIST_CAP];
      if (evt) result.push(evt);
    }
    return result;
  }

  /** 清空所有通知状态 */
  clear(): void {
    this.indicators.length = 0;
    this.activeMarquee = null;
    this.marqueeQueue.length = 0;
    this.histBuf.fill(null);
    this.histHead = 0;
    this.histCount = 0;
    this.flashAlpha = 0;
  }

  // ---- 内部方法 ----

  private addHistory(evt: GameEvent): void {
    this.histBuf[this.histHead] = evt;
    this.histHead = (this.histHead + 1) % HIST_CAP;
    if (this.histCount < HIST_CAP) this.histCount++;
  }

  private enqueueMarquee(evt: GameEvent): void {
    if (this.marqueeQueue.length >= MAX_QUEUE) return;
    const last = this.marqueeQueue[this.marqueeQueue.length - 1];
    if (last && last.id === evt.id) return;
    if (this.activeMarquee && this.activeMarquee.event.id === evt.id) return;
    this.marqueeQueue.push(evt);
  }

  private rebuildIndicators(
    camX: number, camY: number, sw: number, sh: number, zoom: number
  ): void {
    this.indicators.length = 0;
    const candidates = this._candidatesBuf; candidates.length = 0;
    for (let i = 0; i < this.histCount && candidates.length < MAX_IND * 2; i++) {
      const evt = this.histBuf[(this.histHead - 1 - i + HIST_CAP) % HIST_CAP];
      if (!evt || (evt.priority !== 'critical' && evt.priority !== 'high')) continue;
      const sx = (evt.worldX - camX) * zoom, sy = (evt.worldY - camY) * zoom;
      if (sx >= 0 && sx <= sw && sy >= 0 && sy <= sh) continue;
      candidates.push(evt);
    }

    const m = IND_MARGIN;
    for (let i = 0; i < Math.min(candidates.length, MAX_IND); i++) {
      const evt = candidates[i];
      const sx = (evt.worldX - camX) * zoom, sy = (evt.worldY - camY) * zoom;
      const cx = sw / 2, cy = sh / 2;
      const angle = Math.atan2(sy - cy, sx - cx);
      const absCos = Math.abs(Math.cos(angle));
      const absSin = Math.abs(Math.sin(angle));
      let edgeX = cx, edgeY = cy;

      if (absCos > 0.001) {
        const t = (sw / 2 - m) / absCos;
        const cY = cy + t * Math.sin(angle);
        if (Math.abs(cY - cy) <= sh / 2 - m) {
          edgeX = cx + (sw / 2 - m) * Math.sign(Math.cos(angle));
          edgeY = cY;
        }
      }
      if (edgeX === cx && edgeY === cy && absSin > 0.001) {
        const t = (sh / 2 - m) / absSin;
        edgeX = Math.max(m, Math.min(sw - m, cx + t * Math.cos(angle)));
        edgeY = cy + (sh / 2 - m) * Math.sign(Math.sin(angle));
      }
      this.indicators.push({ event: evt, screenX: edgeX, screenY: edgeY, angle });
    }
  }

  private updateMarquee(screenWidth: number): void {
    if (this.activeMarquee) {
      this.activeMarquee.x -= MQ_SPEED;
      if (this.activeMarquee.x + this.activeMarquee.textWidth < 0) this.activeMarquee = null;
    }
    if (!this.activeMarquee && this.marqueeQueue.length > 0) {
      const evt = this.marqueeQueue.shift()!;
      this.activeMarquee = { event: evt, x: screenWidth, textWidth: 0 };
    }
  }

  private renderIndicators(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (let i = 0; i < this.indicators.length; i++) {
      const ind = this.indicators[i];
      const color = COLORS[ind.event.category];
      // 三角形箭头
      ctx.save();
      ctx.translate(ind.screenX, ind.screenY);
      ctx.rotate(ind.angle);
      ctx.beginPath();
      ctx.moveTo(IND_SZ, 0);
      ctx.lineTo(-IND_SZ * 0.6, -IND_SZ * 0.6);
      ctx.lineTo(-IND_SZ * 0.6, IND_SZ * 0.6);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
      // 文字标签
      const label = `${ICONS[ind.event.category]} ${ind.event.message}`;
      ctx.font = '11px monospace';
      ctx.globalAlpha = 0.9;
      const tw = ctx.measureText(label).width;
      const lx = ind.screenX + (Math.cos(ind.angle) > 0 ? -tw - 20 : 20);
      const ly = ind.screenY - 6;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(lx - 3, ly - 10, tw + 6, 16);
      ctx.fillStyle = color;
      ctx.fillText(label, lx, ly);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  private renderMarquee(ctx: CanvasRenderingContext2D, screenWidth: number): void {
    if (!this.activeMarquee) return;
    const mq = this.activeMarquee;
    const color = COLORS[mq.event.category];
    const text = `${ICONS[mq.event.category]} [${mq.event.priority.toUpperCase()}] ${mq.event.message}`;
    ctx.save();
    ctx.font = 'bold 13px monospace';
    const measured = ctx.measureText(text).width;
    if (mq.textWidth === 0 || Math.abs(mq.textWidth - measured) > 1) mq.textWidth = measured;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, screenWidth, MQ_H);
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, mq.x, MQ_H / 2);
    ctx.restore();
  }

  private renderHistory(
    ctx: CanvasRenderingContext2D, screenWidth: number, screenHeight: number
  ): void {
    const px = screenWidth - HIST_W - 10, py = 40;
    const rows = Math.min(this.histCount, 15);
    const ph = rows * HIST_ROW + 36;
    ctx.save();
    // 面板背景 + 边框
    ctx.fillStyle = 'rgba(10,10,20,0.82)';
    ctx.beginPath();
    ctx.roundRect(px, py, HIST_W, ph, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // 标题 + 分隔线
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#cccccc';
    ctx.fillText('Event History', px + 10, py + 18);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.moveTo(px + 8, py + 28);
    ctx.lineTo(px + HIST_W - 8, py + 28);
    ctx.stroke();
    // 事件列表
    ctx.font = '11px monospace';
    const startY = py + 44;
    const maxMsgW = HIST_W - 90;
    for (let i = 0; i < rows; i++) {
      const evt = this.histBuf[(this.histHead - 1 - i + HIST_CAP) % HIST_CAP];
      if (!evt) continue;
      const rowY = startY + i * HIST_ROW;
      if (rowY + HIST_ROW > screenHeight - 10) break;
      const color = COLORS[evt.category];
      ctx.fillStyle = '#666666';
      ctx.fillText(`T${evt.tick}`, px + 10, rowY);
      ctx.fillStyle = color;
      ctx.fillText(ICONS[evt.category], px + 60, rowY);
      let msg = evt.message;
      while (ctx.measureText(msg).width > maxMsgW && msg.length > 3) {
        msg = msg.slice(0, -4) + '...';
      }
      ctx.fillStyle = '#aaaaaa';
      ctx.fillText(msg, px + 80, rowY);
    }
    ctx.restore();
  }
}
