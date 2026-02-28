/** WorldDashboardSystem - 世界统计仪表盘，纯 Canvas 2D 绘制 */
type TabType = 'religion' | 'population' | 'power';
interface CivPowerInput { name: string; power: number; color: string }
interface CivPowerEntry { name: string; power: number; color: string; powerStr: string }
interface PopulationSample { tick: number; populations: Record<string, number>; entries: [string, number][] }

const RELIGION_COLORS: Record<string, string> = {
  sun: '#ffd700', moon: '#c0c0ff', nature: '#44cc44',
  war: '#ff4444', sea: '#4488ff', ancestor: '#cc88ff',
};
const RACE_COLORS: Record<string, string> = {
  human: '#4488ff', elf: '#44cc44', dwarf: '#cc8844', orc: '#cc4444',
};
const MAX_POP_SAMPLES = 60;
/** Pre-computed chart margins — avoids per-render object literal creation */
const _MARGIN_POP = { left: 50, right: 20, top: 20, bottom: 30 } as const
const _MARGIN_PWR = { left: 80, right: 20, top: 10, bottom: 10 } as const
const PANEL_BG = 'rgba(10,15,25,0.85)';
const PANEL_RADIUS = 12;
const TAB_LABELS: { key: TabType; label: string }[] = [
  { key: 'religion', label: '宗教' },
  { key: 'population', label: '人口' },
  { key: 'power', label: '实力' },
];

export class WorldDashboardSystem {
  private visible = false;
  private activeTab: TabType = 'religion';

  private religionData: Map<string, number> = new Map();
  private popSamples: PopulationSample[] = [];
  private popWriteIndex = 0;
  private popCount = 0;
  private powerData: CivPowerEntry[] = [];
  private panelX = 0;
  private panelY = 0;
  private panelW = 0;
  private panelH = 0;
  private _racesSet: Set<string> = new Set();
  private _orderedBuf: PopulationSample[] = new Array(MAX_POP_SAMPLES);
  private _religionEntriesBuf: [string, number][] = [];
  /** Cached religion ratio strings — rebuilt when religionData updates */
  private _religionRatioStrs: Map<string, string> = new Map();
  private _religionLegendStrs: Map<string, string> = new Map();
  /** Cached Y-axis labels for population chart — rebuilt when maxPop changes */
  private _popYLabels: [string, string, string, string, string] = ['0','0','0','0','0'];
  private _prevMaxPop = -1;

  toggle(): void {
    this.visible = !this.visible;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setActiveTab(tab: TabType): void {
    this.activeTab = tab;
  }

  updateReligionData(data: Map<string, number>): void {
    this.religionData = data;
    // Pre-compute ratio strings to avoid toFixed() during render
    let total = 0; for (const v of data.values()) total += v;
    this._religionRatioStrs.clear();
    this._religionLegendStrs.clear();
    if (total > 0) {
      for (const [name, count] of data) {
        this._religionRatioStrs.set(name, `${name} ${((count / total) * 100).toFixed(1)}%`);
        this._religionLegendStrs.set(name, `${name}: ${count}`);
      }
    }
  }

  addPopulationSample(tick: number, populations: Record<string, number>): void {
    const pops = { ...populations }
    const entries = Object.entries(pops) as [string, number][]
    if (this.popSamples.length < MAX_POP_SAMPLES) {
      this.popSamples.push({ tick, populations: pops, entries });
      this.popCount = this.popSamples.length;
    } else {
      this.popSamples[this.popWriteIndex] = { tick, populations: pops, entries };
      this.popWriteIndex = (this.popWriteIndex + 1) % MAX_POP_SAMPLES;
      this.popCount = MAX_POP_SAMPLES;
    }
  }

  updatePowerData(civs: CivPowerInput[]): void {
    // Sort in-place on a copy to avoid mutating caller's array, then fill powerData in-place
    const sorted = civs.slice().sort((a, b) => b.power - a.power)
    const n = Math.min(8, sorted.length)
    this.powerData.length = n
    for (let i = 0; i < n; i++) {
      const c = sorted[i]
      const e = this.powerData[i]
      if (e) { e.name = c.name; e.power = c.power; e.color = c.color; e.powerStr = String(Math.round(c.power)) }
      else this.powerData[i] = { name: c.name, power: c.power, color: c.color, powerStr: String(Math.round(c.power)) }
    }
  }

  render(ctx: CanvasRenderingContext2D, screenWidth: number, screenHeight: number): void {
    if (!this.visible) return;

    this.panelW = Math.min(520, screenWidth - 40);
    this.panelH = Math.min(420, screenHeight - 40);
    this.panelX = Math.floor((screenWidth - this.panelW) / 2);
    this.panelY = Math.floor((screenHeight - this.panelH) / 2);

    this.drawPanelBackground(ctx);
    this.drawTitleBar(ctx);
    this.drawTabs(ctx);

    const contentY = this.panelY + 76;
    const contentH = this.panelH - 86;

    switch (this.activeTab) {
      case 'religion':
        this.drawReligionPie(ctx, contentY, contentH);
        break;
      case 'population':
        this.drawPopulationChart(ctx, contentY, contentH);
        break;
      case 'power':
        this.drawPowerBars(ctx, contentY, contentH);
        break;
    }
  }

  handleClick(x: number, y: number): boolean {
    if (!this.visible) return false;

    // 点击在面板外
    if (
      x < this.panelX || x > this.panelX + this.panelW ||
      y < this.panelY || y > this.panelY + this.panelH
    ) {
      return false;
    }

    // 关闭按钮
    const closeX = this.panelX + this.panelW - 36;
    const closeY = this.panelY + 4;
    if (x >= closeX && x <= closeX + 30 && y >= closeY && y <= closeY + 30) {
      this.visible = false;
      return true;
    }

    // Tab 点击
    const tabY = this.panelY + 40;
    if (y >= tabY && y <= tabY + 30) {
      const tabWidth = Math.floor(this.panelW / TAB_LABELS.length);
      const tabIndex = Math.floor((x - this.panelX) / tabWidth);
      if (tabIndex >= 0 && tabIndex < TAB_LABELS.length) {
        this.activeTab = TAB_LABELS[tabIndex].key;
        return true;
      }
    }

    return true; // 面板内点击都消费
  }

  // ── 绘制 ──

  private drawPanelBackground(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = PANEL_BG;
    this.roundRect(ctx, this.panelX, this.panelY, this.panelW, this.panelH, PANEL_RADIUS);
    ctx.fill();
    ctx.strokeStyle = 'rgba(100,120,160,0.5)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, this.panelX, this.panelY, this.panelW, this.panelH, PANEL_RADIUS);
    ctx.stroke();
    ctx.restore();
  }

  private drawTitleBar(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = '#dde4f0';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('World Dashboard', this.panelX + 16, this.panelY + 22);
    // 关闭按钮
    ctx.fillStyle = '#ff6666';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('X', this.panelX + this.panelW - 21, this.panelY + 20);
    ctx.restore();
  }

  private drawTabs(ctx: CanvasRenderingContext2D): void {
    const tabY = this.panelY + 40;
    const tabW = Math.floor(this.panelW / TAB_LABELS.length);
    const tabH = 28;

    ctx.save();
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < TAB_LABELS.length; i++) {
      const tx = this.panelX + i * tabW;
      const isActive = TAB_LABELS[i].key === this.activeTab;

      ctx.fillStyle = isActive ? 'rgba(60,80,120,0.8)' : 'rgba(30,40,60,0.6)';
      ctx.fillRect(tx, tabY, tabW - 2, tabH);

      ctx.fillStyle = isActive ? '#ffffff' : '#8899aa';
      ctx.fillText(TAB_LABELS[i].label, tx + tabW / 2, tabY + tabH / 2);
    }
    ctx.restore();
  }

  // ── 宗教饼图 ──
  private drawReligionPie(ctx: CanvasRenderingContext2D, contentY: number, contentH: number): void {
    const entries = this._religionEntriesBuf; entries.length = 0;
    for (const e of this.religionData.entries()) entries.push(e)
    let total = 0; for (const e of entries) total += e[1]
    if (total === 0) {
      this.drawEmptyHint(ctx, contentY, contentH, '暂无宗教数据');
      return;
    }

    const cx = this.panelX + this.panelW * 0.35;
    const cy = contentY + contentH * 0.5;
    const radius = Math.min(contentH * 0.4, this.panelW * 0.25);

    ctx.save();
    let startAngle = -Math.PI / 2;

    for (const [name, count] of entries) {
      const ratio = count / total;
      const sweep = ratio * Math.PI * 2;
      const color = RELIGION_COLORS[name] || '#888888';

      // 扇形
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, startAngle + sweep);
      ctx.closePath();
      ctx.fill();

      // 标签
      if (ratio > 0.03) {
        const midAngle = startAngle + sweep / 2;
        const labelR = radius + 18;
        const lx = cx + Math.cos(midAngle) * labelR;
        const ly = cy + Math.sin(midAngle) * labelR;

        ctx.fillStyle = '#dde4f0';
        ctx.font = '11px monospace';
        ctx.textAlign = midAngle > Math.PI / 2 && midAngle < Math.PI * 1.5 ? 'right' : 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(this._religionRatioStrs.get(name)!, lx, ly);
      }

      startAngle += sweep;
    }

    // 图例（右侧）
    const legendX = this.panelX + this.panelW * 0.68;
    let legendY = contentY + 20;
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    for (const [name, count] of entries) {
      const color = RELIGION_COLORS[name] || '#888888';
      ctx.fillStyle = color;
      ctx.fillRect(legendX, legendY - 5, 10, 10);
      ctx.fillStyle = '#bbccdd';
      ctx.fillText(this._religionLegendStrs.get(name)!, legendX + 16, legendY);
      legendY += 18;
    }

    ctx.restore();
  }

  // ── 人口趋势折线图 ──
  private drawPopulationChart(ctx: CanvasRenderingContext2D, contentY: number, contentH: number): void {
    if (this.popCount === 0) {
      this.drawEmptyHint(ctx, contentY, contentH, '暂无人口数据');
      return;
    }

    const margin = _MARGIN_POP;
    const chartX = this.panelX + margin.left;
    const chartY = contentY + margin.top;
    const chartW = this.panelW - margin.left - margin.right;
    const chartH = contentH - margin.top - margin.bottom;

    // 按时间顺序排列样本
    const ordered = this.getOrderedSamples();

    // 找出所有种族和最大值
    const races = this._racesSet;
    races.clear();
    let maxPop = 1;
    for (const sample of ordered) {
      for (const [race, pop] of sample.entries) {
        races.add(race);
        if (pop > maxPop) maxPop = pop;
      }
    }

    ctx.save();

    // 坐标轴
    ctx.strokeStyle = 'rgba(100,120,160,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartX, chartY);
    ctx.lineTo(chartX, chartY + chartH);
    ctx.lineTo(chartX + chartW, chartY + chartH);
    ctx.stroke();

    // Y 轴刻度
    ctx.fillStyle = '#8899aa';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const ySteps = 4;
    if (maxPop !== this._prevMaxPop) {
      this._prevMaxPop = maxPop;
      for (let i = 0; i <= ySteps; i++) {
        this._popYLabels[i] = String(Math.round((maxPop / ySteps) * i));
      }
    }
    for (let i = 0; i <= ySteps; i++) {
      const py = chartY + chartH - (chartH / ySteps) * i;
      ctx.fillText(this._popYLabels[i], chartX - 6, py);
      // 网格线
      if (i > 0) {
        ctx.strokeStyle = 'rgba(100,120,160,0.15)';
        ctx.beginPath();
        ctx.moveTo(chartX, py);
        ctx.lineTo(chartX + chartW, py);
        ctx.stroke();
      }
    }

    // 折线
    const n = ordered.length;
    for (const race of races) {
      const color = RACE_COLORS[race] || '#aaaaaa';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      let started = false;
      for (let i = 0; i < n; i++) {
        const pop = ordered[i].populations[race] || 0;
        const px = chartX + (chartW / Math.max(n - 1, 1)) * i;
        const py = chartY + chartH - (pop / maxPop) * chartH;
        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
    }

    // 图例
    let lx = chartX;
    ctx.font = '11px monospace';
    ctx.textBaseline = 'middle';
    for (const race of races) {
      const color = RACE_COLORS[race] || '#aaaaaa';
      ctx.fillStyle = color;
      ctx.fillRect(lx, chartY + chartH + 14, 10, 10);
      ctx.fillStyle = '#bbccdd';
      ctx.textAlign = 'left';
      ctx.fillText(race, lx + 14, chartY + chartH + 19);
      lx += 80;
    }

    ctx.restore();
  }

  // ── 文明实力柱状图 ──
  private drawPowerBars(ctx: CanvasRenderingContext2D, contentY: number, contentH: number): void {
    if (this.powerData.length === 0) {
      this.drawEmptyHint(ctx, contentY, contentH, '暂无文明数据');
      return;
    }

    const margin = _MARGIN_PWR;
    const areaX = this.panelX + margin.left;
    const areaY = contentY + margin.top;
    const areaW = this.panelW - margin.left - margin.right;
    const areaH = contentH - margin.top - margin.bottom;

    const barCount = this.powerData.length;
    const barH = Math.min(28, (areaH - (barCount - 1) * 4) / barCount);
    const gap = 4;
    let maxPower = 1; for (const c of this.powerData) { if (c.power > maxPower) maxPower = c.power }

    ctx.save();
    ctx.font = '12px monospace';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < barCount; i++) {
      const civ = this.powerData[i];
      const by = areaY + i * (barH + gap);
      const bw = (civ.power / maxPower) * areaW;

      // 名称标签
      ctx.fillStyle = '#bbccdd';
      ctx.textAlign = 'right';
      ctx.fillText(civ.name, areaX - 8, by + barH / 2);

      // 柱体
      ctx.fillStyle = civ.color;
      ctx.fillRect(areaX, by, bw, barH);

      // 数值
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(civ.powerStr, areaX + bw + 6, by + barH / 2);
    }

    ctx.restore();
  }

  // ── 工具方法 ──
  private getOrderedSamples(): PopulationSample[] {
    const buf = this._orderedBuf
    if (this.popCount < MAX_POP_SAMPLES) {
      const n = this.popCount
      for (let i = 0; i < n; i++) buf[i] = this.popSamples[i]
      buf.length = n
      return buf
    }
    // 环形缓冲区：writeIndex 指向最旧的位置
    const wi = this.popWriteIndex
    let k = 0
    for (let i = wi; i < MAX_POP_SAMPLES; i++) buf[k++] = this.popSamples[i]
    for (let i = 0; i < wi; i++) buf[k++] = this.popSamples[i]
    buf.length = MAX_POP_SAMPLES
    return buf
  }

  private drawEmptyHint(ctx: CanvasRenderingContext2D, contentY: number, contentH: number, text: string): void {
    ctx.save();
    ctx.fillStyle = '#667788';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, this.panelX + this.panelW / 2, contentY + contentH / 2);
    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}
