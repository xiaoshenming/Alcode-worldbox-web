export interface ChartDataPoint {
  tick: number;
  population: number;
  civCount: number;
  warCount: number;
  avgTechLevel: number;
  totalTerritory: number;
}

export type ChartType = 'population' | 'civilizations' | 'wars' | 'technology' | 'territory';

const CHART_TYPES: ChartType[] = ['population', 'civilizations', 'wars', 'technology', 'territory'];

const CHART_CONFIG: Record<ChartType, { label: string; color: string; fill: string; key: keyof ChartDataPoint }> = {
  population:    { label: '人口', color: '#4fc3f7', fill: 'rgba(79,195,247,0.18)', key: 'population' },
  civilizations: { label: '文明数', color: '#aed581', fill: 'rgba(174,213,129,0.18)', key: 'civCount' },
  wars:          { label: '战争', color: '#ef5350', fill: 'rgba(239,83,80,0.18)', key: 'warCount' },
  technology:    { label: '科技等级', color: '#ffb74d', fill: 'rgba(255,183,77,0.18)', key: 'avgTechLevel' },
  territory:     { label: '领土总量', color: '#ce93d8', fill: 'rgba(206,147,216,0.18)', key: 'totalTerritory' },
};

const MAX_BUFFER = 500;

export class ChartPanelSystem {
  private buffer: ChartDataPoint[] = [];
  private head = 0;
  private count = 0;
  private chartIndex = 0;
  private timeRange = 5000;
  isVisible = false;
  private _ptsBuf: { px: number; py: number }[] = [];

  addDataPoint(tick: number, data: Omit<ChartDataPoint, 'tick'>): void {
    const point: ChartDataPoint = { tick, ...data };
    if (this.count < MAX_BUFFER) {
      this.buffer[this.count] = point;
      this.count++;
    } else {
      this.buffer[this.head] = point;
      this.head = (this.head + 1) % MAX_BUFFER;
    }
  }

  setChartType(type: ChartType): void {
    const idx = CHART_TYPES.indexOf(type);
    if (idx >= 0) this.chartIndex = idx;
  }

  nextChart(): void { this.chartIndex = (this.chartIndex + 1) % CHART_TYPES.length; }
  prevChart(): void { this.chartIndex = (this.chartIndex - 1 + CHART_TYPES.length) % CHART_TYPES.length; }

  show(): void { this.isVisible = true; }
  hide(): void { this.isVisible = false; }
  toggle(): void { this.isVisible = !this.isVisible; }

  setTimeRange(ticks: number): void { this.timeRange = Math.max(100, ticks); }

  private getOrderedData(): ChartDataPoint[] {
    if (this.count === 0) return [];
    const result: ChartDataPoint[] = [];
    const start = this.count < MAX_BUFFER ? 0 : this.head;
    for (let i = 0; i < this.count; i++) {
      result.push(this.buffer[(start + i) % MAX_BUFFER]);
    }
    return result;
  }

  private _filteredBuf: ChartDataPoint[] = [];
  private filterByRange(data: ChartDataPoint[]): ChartDataPoint[] {
    if (data.length === 0) return data;
    const maxTick = data[data.length - 1].tick;
    const minTick = maxTick - this.timeRange;
    this._filteredBuf.length = 0;
    for (const d of data) { if (d.tick >= minTick) this._filteredBuf.push(d); }
    return this._filteredBuf;
  }

  private niceScale(maxVal: number): { max: number; step: number } {
    if (maxVal <= 0) return { max: 10, step: 2 };
    const mag = Math.pow(10, Math.floor(Math.log10(maxVal)));
    const norm = maxVal / mag;
    let niceMax: number;
    if (norm <= 1.5) niceMax = 1.5 * mag;
    else if (norm <= 3) niceMax = 3 * mag;
    else if (norm <= 5) niceMax = 5 * mag;
    else if (norm <= 7) niceMax = 7 * mag;
    else niceMax = 10 * mag;
    return { max: niceMax, step: niceMax / 5 };
  }

  render(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    if (!this.isVisible) return;

    const type = CHART_TYPES[this.chartIndex];
    const cfg = CHART_CONFIG[type];
    const pad = { top: 38, right: 14, bottom: 28, left: 52 };
    const cw = width - pad.left - pad.right;
    const ch = height - pad.top - pad.bottom;
    const cx = x + pad.left;
    const cy = y + pad.top;

    // Background
    ctx.save();
    ctx.fillStyle = 'rgba(10,12,18,0.88)';
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 6);
    ctx.fill();
    ctx.stroke();

    const data = this.filterByRange(this.getOrderedData());
    const key = cfg.key;
    let rawMax = 0;
    let currentVal = 0;
    for (const d of data) {
      const v = d[key] as number;
      if (v > rawMax) rawMax = v;
      currentVal = v;
    }
    const { max: yMax, step: yStep } = this.niceScale(rawMax);

    // Title + current value
    ctx.fillStyle = cfg.color;
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(cfg.label, x + 12, y + 10);
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText(`${currentVal.toFixed(key === 'avgTechLevel' ? 1 : 0)}`, x + 12 + ctx.measureText(cfg.label).width + 10, y + 11);

    // Nav arrows
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('< >', x + width - 12, y + 12);

    // Grid lines + Y labels
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = '9px monospace';
    const gridCount = 5;
    for (let i = 0; i <= gridCount; i++) {
      const gy = cy + ch - (i / gridCount) * ch;
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.moveTo(cx, gy);
      ctx.lineTo(cx + cw, gy);
      ctx.stroke();
      const label = (yStep * i).toFixed(yStep * i >= 1000 ? 0 : yStep * i >= 1 ? 0 : 1);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText(label, cx - 5, gy);
    }

    // X-axis ticks
    if (data.length >= 2) {
      const tMin = data[0].tick;
      const tMax = data[data.length - 1].tick;
      const tRange = tMax - tMin || 1;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let i = 0; i <= 4; i++) {
        const t = tMin + (tRange * i) / 4;
        const tx = cx + (i / 4) * cw;
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillText(Math.round(t).toString(), tx, cy + ch + 4);
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.beginPath();
        ctx.moveTo(tx, cy);
        ctx.lineTo(tx, cy + ch);
        ctx.stroke();
      }
    }

    // Line chart + filled area
    if (data.length >= 2) {
      const tMin = data[0].tick;
      const tMax = data[data.length - 1].tick;
      const tRange = tMax - tMin || 1;

      // 预分配坐标buf，避免每帧 new {px,py} 对象
      const pts = this._ptsBuf;
      pts.length = data.length;
      for (let i = 0; i < data.length; i++) {
        if (!pts[i]) pts[i] = { px: 0, py: 0 };
        pts[i].px = cx + ((data[i].tick - tMin) / tRange) * cw;
        pts[i].py = cy + ch - ((data[i][key] as number) / yMax) * ch;
      }

      // Filled area
      ctx.beginPath();
      ctx.moveTo(pts[0].px, cy + ch);
      for (let i = 0; i < pts.length - 1; i++) {
        const mx = (pts[i].px + pts[i + 1].px) / 2;
        const my = (pts[i].py + pts[i + 1].py) / 2;
        ctx.quadraticCurveTo(pts[i].px, pts[i].py, mx, my);
      }
      ctx.lineTo(pts[pts.length - 1].px, pts[pts.length - 1].py);
      ctx.lineTo(pts[pts.length - 1].px, cy + ch);
      ctx.closePath();
      ctx.fillStyle = cfg.fill;
      ctx.fill();

      // Line
      ctx.beginPath();
      ctx.moveTo(pts[0].px, pts[0].py);
      for (let i = 0; i < pts.length - 1; i++) {
        const mx = (pts[i].px + pts[i + 1].px) / 2;
        const my = (pts[i].py + pts[i + 1].py) / 2;
        ctx.quadraticCurveTo(pts[i].px, pts[i].py, mx, my);
      }
      ctx.lineTo(pts[pts.length - 1].px, pts[pts.length - 1].py);
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // End dot
      const last = pts[pts.length - 1];
      ctx.beginPath();
      ctx.arc(last.px, last.py, 3, 0, Math.PI * 2);
      ctx.fillStyle = cfg.color;
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('等待数据...', cx + cw / 2, cy + ch / 2);
    }

    ctx.restore();
  }
}
