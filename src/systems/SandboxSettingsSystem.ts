/** Sandbox settings panel — adjustable game rule parameters with localStorage persistence. */

const STORAGE_KEY = 'worldbox_sandbox';

interface ParamDef {
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  decimals: number;
}

interface BoolDef {
  label: string;
  default: boolean;
}

const PARAM_DEFS: Record<string, ParamDef> = {
  reproductionRate:  { label: '繁殖率',   min: 0.1, max: 5,     step: 0.1, default: 1,    decimals: 1 },
  warFrequency:      { label: '战争频率', min: 0,   max: 3,     step: 0.1, default: 1,    decimals: 1 },
  disasterChance:    { label: '灾难概率', min: 0,   max: 5,     step: 0.1, default: 1,    decimals: 1 },
  resourceAbundance: { label: '资源丰富度', min: 0.1, max: 5,   step: 0.1, default: 1,    decimals: 1 },
  agingSpeed:        { label: '老化速度', min: 0.1, max: 3,     step: 0.1, default: 1,    decimals: 1 },
  techSpeed:         { label: '科技速度', min: 0.1, max: 5,     step: 0.1, default: 1,    decimals: 1 },
  maxPopulation:     { label: '最大人口', min: 100, max: 10000, step: 100, default: 2000, decimals: 0 },
};

const BOOL_DEFS: Record<string, BoolDef> = {
  peacefulMode: { label: '和平模式', default: false },
};

const PARAM_KEYS = Object.keys(PARAM_DEFS);
const BOOL_KEYS = Object.keys(BOOL_DEFS);

const PANEL_W = 280;
const ROW_H = 32;
const HEADER_H = 36;
const FOOTER_H = 34;
const SLIDER_PAD = 12;

export class SandboxSettingsSystem {
  private values: Record<string, number> = {};
  private bools: Record<string, boolean> = {};
  /** Pre-computed render strings — avoids toFixed per frame */
  private valueStrs: Record<string, string> = {};
  private panelOpen = false;
  private draggingKey: string | null = null;
  /** Cached panel rect — rebuilt when screen size changes */
  private _panelRect = { x: 0, y: 0, w: PANEL_W, h: 0 };
  private _panelSW = 0;
  private _panelSH = 0;

  constructor() {
    this.resetToDefaults();
    this.load();
  }

  /** Get a parameter value by key. */
  get(key: string): number | boolean {
    if (key in this.bools) return this.bools[key];
    return this.values[key] ?? 0;
  }

  /** Set a parameter value by key. */
  set(key: string, value: number | boolean): void {
    if (key in BOOL_DEFS) {
      this.bools[key] = !!value;
    } else if (key in PARAM_DEFS) {
      const d = PARAM_DEFS[key];
      this.values[key] = Math.round(Math.min(d.max, Math.max(d.min, value as number)) / d.step) * d.step;
      this.valueStrs[key] = this.values[key].toFixed(d.decimals);
    }
    this.save();
  }

  resetToDefaults(): void {
    for (const k of PARAM_KEYS) {
      this.values[k] = PARAM_DEFS[k].default;
      this.valueStrs[k] = PARAM_DEFS[k].default.toFixed(PARAM_DEFS[k].decimals);
    }
    for (const k of BOOL_KEYS) this.bools[k] = BOOL_DEFS[k].default;
    this.save();
  }

  togglePanel(): void { this.panelOpen = !this.panelOpen; }
  isPanelOpen(): boolean { return this.panelOpen; }

  // ── Persistence ──────────────────────────────────────────────

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: this.values, b: this.bools }));
    } catch { /* quota exceeded — silently ignore */ }
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.v) for (const k of PARAM_KEYS) {
        if (typeof data.v[k] === 'number') this.set(k, data.v[k]);
      }
      if (data.b) for (const k of BOOL_KEYS) {
        if (typeof data.b[k] === 'boolean') this.bools[k] = data.b[k];
      }
    } catch { /* corrupt data — keep defaults */ }
  }

  // ── Layout helpers ───────────────────────────────────────────

  private panelRect(sw: number, sh: number) {
    if (sw !== this._panelSW || sh !== this._panelSH) {
      this._panelSW = sw; this._panelSH = sh;
      const rows = PARAM_KEYS.length + BOOL_KEYS.length;
      const h = HEADER_H + rows * ROW_H + FOOTER_H;
      this._panelRect.x = Math.round((sw - PANEL_W) / 2);
      this._panelRect.y = Math.round((sh - h) / 2);
      this._panelRect.h = h;
    }
    return this._panelRect;
  }

  private sliderRect(px: number, py: number, rowIdx: number) {
    const sx = px + 110;
    const sy = py + HEADER_H + rowIdx * ROW_H + 10;
    const sw = PANEL_W - 110 - SLIDER_PAD - 40;
    return { sx, sy, sw, sh: 12 };
  }

  // ── Render ───────────────────────────────────────────────────

  render(ctx: CanvasRenderingContext2D, screenW: number, screenH: number): void {
    if (!this.panelOpen) return;
    const { x, y, w, h } = this.panelRect(screenW, screenH);

    ctx.save();

    // Backdrop
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, screenW, screenH);

    // Panel bg
    ctx.fillStyle = 'rgba(16,18,26,0.94)';
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();

    // Title
    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('沙盒设置', x + w / 2, y + 10);

    // Close button
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('✕', x + w - 10, y + 10);

    // Param sliders
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < PARAM_KEYS.length; i++) {
      const k = PARAM_KEYS[i];
      const d = PARAM_DEFS[k];
      const v = this.values[k];
      const ry = y + HEADER_H + i * ROW_H + ROW_H / 2;

      // Label
      ctx.fillStyle = '#bbb';
      ctx.font = '11px monospace';
      ctx.fillText(d.label, x + SLIDER_PAD, ry);

      // Slider track
      const { sx, sy, sw, sh } = this.sliderRect(x, y, i);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.roundRect(sx, sy, sw, sh, 4);
      ctx.fill();

      // Slider fill
      const range = d.max - d.min;
      const ratio = range > 0 ? (v - d.min) / range : 0;
      ctx.fillStyle = 'rgba(79,195,247,0.5)';
      ctx.beginPath();
      ctx.roundRect(sx, sy, sw * ratio, sh, 4);
      ctx.fill();

      // Thumb
      const tx = sx + sw * ratio;
      ctx.fillStyle = '#4fc3f7';
      ctx.beginPath();
      ctx.arc(tx, sy + sh / 2, 6, 0, Math.PI * 2);
      ctx.fill();

      // Value text
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(this.valueStrs[k], x + w - SLIDER_PAD, ry);
      ctx.textAlign = 'left';
    }

    // Bool toggles
    const boolStart = PARAM_KEYS.length;
    for (let i = 0; i < BOOL_KEYS.length; i++) {
      const k = BOOL_KEYS[i];
      const d = BOOL_DEFS[k];
      const on = this.bools[k];
      const ry = y + HEADER_H + (boolStart + i) * ROW_H + ROW_H / 2;

      ctx.fillStyle = '#bbb';
      ctx.font = '11px monospace';
      ctx.fillText(d.label, x + SLIDER_PAD, ry);

      // Toggle box
      const bx = x + w - SLIDER_PAD - 36;
      const by = ry - 8;
      ctx.fillStyle = on ? 'rgba(79,195,247,0.6)' : 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.roundRect(bx, by, 36, 16, 8);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(on ? bx + 26 : bx + 10, by + 8, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Reset button
    const btnY = y + h - FOOTER_H + 6;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.roundRect(x + w / 2 - 50, btnY, 100, 24, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('重置默认', x + w / 2, btnY + 12);

    ctx.restore();
  }

  // ── Input ────────────────────────────────────────────────────

  handleClick(mx: number, my: number, screenW: number, screenH: number): boolean {
    if (!this.panelOpen) return false;
    const { x, y, w, h } = this.panelRect(screenW, screenH);
    if (mx < x || mx > x + w || my < y || my > y + h) { this.panelOpen = false; return true; }

    // Close button
    if (mx > x + w - 28 && my < y + 28) { this.panelOpen = false; return true; }

    // Slider click → start drag
    for (let i = 0; i < PARAM_KEYS.length; i++) {
      const { sx, sy, sw, sh } = this.sliderRect(x, y, i);
      if (mx >= sx - 6 && mx <= sx + sw + 6 && my >= sy - 4 && my <= sy + sh + 4) {
        this.draggingKey = PARAM_KEYS[i];
        this.applySlider(mx, sx, sw, PARAM_KEYS[i]);
        return true;
      }
    }

    // Bool toggle
    const boolStart = PARAM_KEYS.length;
    for (let i = 0; i < BOOL_KEYS.length; i++) {
      const ry = y + HEADER_H + (boolStart + i) * ROW_H + ROW_H / 2;
      const bx = x + w - SLIDER_PAD - 36;
      if (mx >= bx && mx <= bx + 36 && my >= ry - 10 && my <= ry + 10) {
        this.bools[BOOL_KEYS[i]] = !this.bools[BOOL_KEYS[i]];
        this.save();
        return true;
      }
    }

    // Reset button
    const btnY = y + h - FOOTER_H + 6;
    if (mx >= x + w / 2 - 50 && mx <= x + w / 2 + 50 && my >= btnY && my <= btnY + 24) {
      this.resetToDefaults();
      return true;
    }

    return true; // consume click inside panel
  }

  handleDrag(mx: number, my: number, screenW: number, screenH: number): boolean {
    if (!this.panelOpen || !this.draggingKey) return false;
    const { x, y } = this.panelRect(screenW, screenH);
    const i = PARAM_KEYS.indexOf(this.draggingKey);
    if (i < 0) { this.draggingKey = null; return false; }
    const { sx, sw } = this.sliderRect(x, y, i);
    this.applySlider(mx, sx, sw, this.draggingKey);
    return true;
  }

  /** Call on mouseup to end slider drag. */
  endDrag(): void { this.draggingKey = null; }

  private applySlider(mx: number, sx: number, sw: number, key: string): void {
    const d = PARAM_DEFS[key];
    const ratio = Math.max(0, Math.min(1, (mx - sx) / sw));
    const raw = d.min + ratio * (d.max - d.min);
    this.values[key] = Math.round(raw / d.step) * d.step;
    this.save();
  }
}
