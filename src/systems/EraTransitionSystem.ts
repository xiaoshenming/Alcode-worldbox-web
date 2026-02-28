/**
 * EraTransitionSystem - 世界纪元增强系统
 * 提供纪元转换动画、历史大事记、文明兴衰图和科技树预览
 */

export type EraName = 'stone' | 'bronze' | 'iron' | 'medieval' | 'renaissance' | 'industrial';

export interface HistoryEntry {
  tick: number;
  type: 'era_change' | 'war' | 'civ_fall' | 'wonder' | 'hero_born';
  description: string;
  icon: string;
  /** Pre-computed "T:${tick}" display string — set by addHistoryEntry */
  tickStr?: string;
}

export interface CivPopSample {
  tick: number;
  populations: Map<string, number>;
  /** Pre-computed "T:${tick}" display string — set by addPopulationSample */
  tickStr?: string;
}

const ERA_COLORS: Record<EraName, string> = {
  stone: '#8B4513',
  bronze: '#CD853F',
  iron: '#708090',
  medieval: '#4169E1',
  renaissance: '#8B008B',
  industrial: '#2F2F2F',
};

const ERA_NAMES_CN: Record<EraName, string> = {
  stone: '石器时代',
  bronze: '青铜时代',
  iron: '铁器时代',
  medieval: '中世纪',
  renaissance: '文艺复兴',
  industrial: '工业时代',
};

const CIV_COLORS = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#42d4f4', '#f032e6'];
const TRANSITION_DURATION = 180;
const FADE_IN = 60;
const HOLD = 60;
const MAX_HISTORY = 100;
const MAX_SAMPLES = 200;

interface TechEntry {
  name: string;
  researched: boolean;
  progress: number;
  /** Pre-computed percentage string */
  progressStr: string;
}

export class EraTransitionSystem {
  private transitionTick = 0;
  private transitionActive = false;
  private fromEra: EraName = 'stone';
  private toEra: EraName = 'stone';
  private eraDescription = '';

  private history: HistoryEntry[] = [];
  private historyVisible = false;
  private historyScroll = 0;
  private _civNameSet: Set<string> = new Set();
  private _civList: string[] = [];

  private popSamples: CivPopSample[] = [];
  private chartVisible = false;
  private _prevMaxTotal = -1;
  private _maxTotalStr = '1';
  /** Pre-allocated flat cumulative buffer: _cumBuf[i * MAX_CUM_STRIDE + c] = cumulative[i][c] */
  private _cumBuf = new Float64Array(MAX_SAMPLES * 10); // stride=10: civCount≤8 + index 0..8

  private techs: TechEntry[] = [];
  private techVisible = false;

  /** 触发纪元转换动画 */
  triggerTransition(fromEra: EraName, toEra: EraName, eraDescription: string): void {
    this.fromEra = fromEra;
    this.toEra = toEra;
    this.eraDescription = eraDescription;
    this.transitionTick = 0;
    this.transitionActive = true;
  }

  isTransitioning(): boolean {
    return this.transitionActive;
  }

  /** 添加历史事件 */
  addHistoryEntry(entry: HistoryEntry): void {
    if (!entry.tickStr) entry.tickStr = `T:${entry.tick}`
    this.history.push(entry);
    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    }
  }

  getHistory(): HistoryEntry[] {
    return this.history;
  }

  toggleHistory(): void {
    this.historyVisible = !this.historyVisible;
    if (this.historyVisible) {
      this.chartVisible = false;
      this.techVisible = false;
    }
  }

  /** 添加人口采样 */
  addPopulationSample(sample: CivPopSample): void {
    if (!sample.tickStr) sample.tickStr = `T:${sample.tick}`
    this.popSamples.push(sample);
    if (this.popSamples.length > MAX_SAMPLES) {
      this.popSamples.shift();
    }
  }

  togglePopulationChart(): void {
    this.chartVisible = !this.chartVisible;
    if (this.chartVisible) {
      this.historyVisible = false;
      this.techVisible = false;
    }
  }

  /** 设置科技数据 */
  setTechData(techs: Array<{ name: string; researched: boolean; progress: number }>): void {
    this.techs = techs.map(t => ({ ...t, progressStr: `${Math.round(t.progress * 100)}%` }));
  }

  toggleTechPreview(): void {
    this.techVisible = !this.techVisible;
    if (this.techVisible) {
      this.historyVisible = false;
      this.chartVisible = false;
    }
  }

  /** 每 tick 更新 */
  update(_tick: number): void {
    if (this.transitionActive) {
      this.transitionTick++;
      if (this.transitionTick >= TRANSITION_DURATION) {
        this.transitionActive = false;
      }
    }
  }

  /** 渲染所有 UI */
  render(ctx: CanvasRenderingContext2D, screenWidth: number, screenHeight: number): void {
    if (this.transitionActive) {
      this.renderTransition(ctx, screenWidth, screenHeight);
    }
    if (this.historyVisible) {
      this.renderHistory(ctx, screenHeight);
    }
    if (this.chartVisible) {
      this.renderPopulationChart(ctx, screenWidth, screenHeight);
    }
    if (this.techVisible) {
      this.renderTechPreview(ctx, screenWidth, screenHeight);
    }
  }

  /** 处理点击 */
  handleClick(x: number, y: number): boolean {
    if (this.historyVisible && x < 280) {
      return true;
    }
    if (this.chartVisible) {
      const cx = 100, cy = 80, cw = 500, ch = 300;
      if (x >= cx && x <= cx + cw && y >= cy && y <= cy + ch) return true;
    }
    if (this.techVisible) {
      const tx = 100, ty = 80, tw = 400, th = 320;
      if (x >= tx && x <= tx + tw && y >= ty && y <= ty + th) return true;
    }
    void y;
    return false;
  }

  /** 处理滚动（历史面板） */
  handleScroll(x: number, _y: number, delta: number): boolean {
    if (this.historyVisible && x < 280) {
      this.historyScroll += delta > 0 ? 30 : -30;
      const maxScroll = Math.max(0, this.history.length * 60 - 400);
      this.historyScroll = Math.max(0, Math.min(this.historyScroll, maxScroll));
      return true;
    }
    return false;
  }

  // ─── 纪元转换动画 ───

  private renderTransition(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const t = this.transitionTick;
    let alpha: number;
    if (t < FADE_IN) {
      alpha = t / FADE_IN;
    } else if (t < FADE_IN + HOLD) {
      alpha = 1;
    } else {
      alpha = 1 - (t - FADE_IN - HOLD) / (TRANSITION_DURATION - FADE_IN - HOLD);
    }
    alpha = Math.max(0, Math.min(1, alpha));

    const progress = t / TRANSITION_DURATION;
    const fromColor = ERA_COLORS[this.fromEra];
    const toColor = ERA_COLORS[this.toEra];
    const blended = this.lerpColor(fromColor, toColor, progress);

    ctx.save();
    ctx.globalAlpha = alpha * 0.85;
    ctx.fillStyle = blended;
    ctx.fillRect(0, 0, w, h);

    ctx.globalAlpha = alpha;
    const title = ERA_NAMES_CN[this.toEra];
    ctx.font = 'bold 64px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#DAA520';
    ctx.lineWidth = 3;
    ctx.strokeText(title, w / 2, h / 2 - 30);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(title, w / 2, h / 2 - 30);

    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#E0E0E0';
    ctx.fillText(this.eraDescription, w / 2, h / 2 + 30);
    ctx.restore();
  }

  private lerpColor(a: string, b: string, t: number): string {
    const ar = parseInt(a.slice(1, 3), 16), ag = parseInt(a.slice(3, 5), 16), ab = parseInt(a.slice(5, 7), 16);
    const br = parseInt(b.slice(1, 3), 16), bg = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16);
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return `rgb(${r},${g},${bl})`;
  }

  // ─── 历史大事记 ───

  private renderHistory(ctx: CanvasRenderingContext2D, screenHeight: number): void {
    const panelW = 270;
    const panelH = screenHeight - 40;
    const px = 10, py = 20;

    ctx.save();
    ctx.fillStyle = 'rgba(20,20,30,0.9)';
    ctx.fillRect(px, py, panelW, panelH);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, panelW, panelH);

    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.fillText('历史大事记', px + panelW / 2, py + 24);

    // 时间线垂直线
    const lineX = px + 40;
    const startY = py + 50;
    const visibleH = panelH - 60;

    ctx.beginPath();
    ctx.moveTo(lineX, startY);
    ctx.lineTo(lineX, startY + visibleH);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.rect(px, startY, panelW, visibleH);
    ctx.clip();

    const entryH = 60;
    for (let i = 0; i < this.history.length; i++) {
      const entry = this.history[i];
      const ey = startY + i * entryH - this.historyScroll;
      if (ey < startY - entryH || ey > startY + visibleH) continue;

      // 圆点
      ctx.beginPath();
      ctx.arc(lineX, ey + 12, 5, 0, Math.PI * 2);
      ctx.fillStyle = this.getEventColor(entry.type);
      ctx.fill();

      // 图标
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#FFF';
      ctx.fillText(entry.icon, lineX + 14, ey + 16);

      // tick
      ctx.font = '10px monospace';
      ctx.fillStyle = '#AAA';
      ctx.fillText(entry.tickStr!, lineX + 14, ey + 32);

      // 描述
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#DDD';
      const desc = entry.description.length > 20 ? entry.description.slice(0, 20) + '...' : entry.description;
      ctx.fillText(desc, lineX + 14, ey + 48);
    }
    ctx.restore();
  }

  private getEventColor(type: HistoryEntry['type']): string {
    switch (type) {
      case 'era_change': return '#FFD700';
      case 'war': return '#FF4444';
      case 'civ_fall': return '#888888';
      case 'wonder': return '#44FF44';
      case 'hero_born': return '#44AAFF';
    }
  }

  // ─── 文明兴衰图（堆叠面积图） ───

  private renderPopulationChart(ctx: CanvasRenderingContext2D, screenWidth: number, screenHeight: number): void {
    const cw = Math.min(500, screenWidth - 200);
    const ch = Math.min(300, screenHeight - 200);
    const cx = (screenWidth - cw) / 2;
    const cy = (screenHeight - ch) / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(20,20,30,0.92)';
    ctx.fillRect(cx - 10, cy - 40, cw + 20, ch + 60);
    ctx.strokeStyle = '#555';
    ctx.strokeRect(cx - 10, cy - 40, cw + 20, ch + 60);

    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.fillText('文明兴衰图', cx + cw / 2, cy - 16);

    if (this.popSamples.length < 2) {
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#AAA';
      ctx.fillText('数据不足，等待采样...', cx + cw / 2, cy + ch / 2);
      ctx.restore();
      return;
    }

    // 收集所有文明名
    const civNameSet = this._civNameSet;
    civNameSet.clear();
    for (const s of this.popSamples) {
      for (const name of s.populations.keys()) civNameSet.add(name)
    }
    const civList = this._civList
    civList.length = 0
    for (const n of civNameSet) civList.push(n)

    // 计算最大堆叠值
    let maxTotal = 1;
    for (const s of this.popSamples) {
      let total = 0;
      for (const name of civList) total += s.populations.get(name) ?? 0;
      if (total > maxTotal) maxTotal = total;
    }
    if (maxTotal !== this._prevMaxTotal) {
      this._prevMaxTotal = maxTotal;
      this._maxTotalStr = String(maxTotal);
    }

    const n = this.popSamples.length;
    const dx = n > 1 ? cw / (n - 1) : 0;

    // 从底部向上逐层绘制面积
    // 先算每个采样点的累积值，写入平坦缓冲区 _cumBuf[i*10+c]，消除每帧 number[][] 分配
    const cum = this._cumBuf;
    const civCount = civList.length;
    for (let i = 0; i < n; i++) {
      const base = i * 10;
      cum[base] = 0;
      let acc = 0;
      for (let c = 0; c < civCount; c++) {
        acc += this.popSamples[i].populations.get(civList[c]) ?? 0;
        cum[base + c + 1] = acc;
      }
    }

    for (let c = civCount - 1; c >= 0; c--) {
      ctx.beginPath();
      // 上边界（当前层顶部）
      for (let i = 0; i < n; i++) {
        const x = cx + i * dx;
        const y = cy + ch - (cum[i * 10 + c + 1] / maxTotal) * ch;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      // 下边界（前一层顶部，反向）
      for (let i = n - 1; i >= 0; i--) {
        const x = cx + i * dx;
        const y = cy + ch - (cum[i * 10 + c] / maxTotal) * ch;
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = CIV_COLORS[c % CIV_COLORS.length] + 'CC';
      ctx.fill();
    }

    // 坐标轴
    ctx.strokeStyle = '#AAA';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy + ch);
    ctx.lineTo(cx + cw, cy + ch);
    ctx.stroke();

    // 轴标签
    ctx.font = '10px monospace';
    ctx.fillStyle = '#AAA';
    ctx.textAlign = 'right';
    ctx.fillText(this._maxTotalStr, cx - 4, cy + 10);
    ctx.fillText('0', cx - 4, cy + ch);
    ctx.textAlign = 'center';
    ctx.fillText(this.popSamples[0].tickStr!, cx, cy + ch + 14);
    ctx.fillText(this.popSamples[n - 1].tickStr!, cx + cw, cy + ch + 14);

    // 图例
    ctx.textAlign = 'left';
    for (let c = 0; c < civList.length && c < 8; c++) {
      const lx = cx + (c % 4) * 120;
      const ly = cy + ch + 28 + Math.floor(c / 4) * 16;
      ctx.fillStyle = CIV_COLORS[c % CIV_COLORS.length];
      ctx.fillRect(lx, ly - 8, 10, 10);
      ctx.fillStyle = '#DDD';
      ctx.font = '10px sans-serif';
      const label = civList[c].length > 10 ? civList[c].slice(0, 10) + '..' : civList[c];
      ctx.fillText(label, lx + 14, ly);
    }
    ctx.restore();
  }

  // ─── 科技树预览 ───

  private renderTechPreview(ctx: CanvasRenderingContext2D, screenWidth: number, screenHeight: number): void {
    const tw = 400, th = 320;
    const tx = (screenWidth - tw) / 2;
    const ty = (screenHeight - th) / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(20,20,30,0.92)';
    ctx.fillRect(tx, ty, tw, th);
    ctx.strokeStyle = '#555';
    ctx.strokeRect(tx, ty, tw, th);

    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.fillText('科技树预览', tx + tw / 2, ty + 24);

    if (this.techs.length === 0) {
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#AAA';
      ctx.fillText('暂无科技数据', tx + tw / 2, ty + th / 2);
      ctx.restore();
      return;
    }

    const cols = 4;
    const cellW = 88, cellH = 64;
    const startX = tx + 16, startY = ty + 48;

    for (let i = 0; i < this.techs.length; i++) {
      const tech = this.techs[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cellW + 8);
      const y = startY + row * (cellH + 8);

      if (y + cellH > ty + th - 8) break;

      // 背景
      ctx.fillStyle = tech.researched ? 'rgba(50,120,50,0.8)' : 'rgba(60,60,60,0.8)';
      ctx.fillRect(x, y, cellW, cellH);
      ctx.strokeStyle = tech.researched ? '#4CAF50' : '#555';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cellW, cellH);

      // 名称
      ctx.font = '11px sans-serif';
      ctx.fillStyle = tech.researched ? '#FFF' : '#999';
      ctx.textAlign = 'center';
      const name = tech.name.length > 8 ? tech.name.slice(0, 8) + '..' : tech.name;
      ctx.fillText(name, x + cellW / 2, y + 24);

      // 进度条
      const barW = cellW - 12, barH = 6;
      const bx = x + 6, by = y + cellH - 16;
      ctx.fillStyle = '#333';
      ctx.fillRect(bx, by, barW, barH);
      ctx.fillStyle = tech.researched ? '#4CAF50' : '#FF9800';
      ctx.fillRect(bx, by, barW * Math.min(1, tech.progress), barH);

      // 百分比
      ctx.font = '9px monospace';
      ctx.fillStyle = '#CCC';
      ctx.fillText(tech.progressStr, x + cellW / 2, y + cellH - 4);
    }
    ctx.restore();
  }
}
