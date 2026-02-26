/** CustomSpeciesSystem - 自定义种族创建器 */

export type Diet = 'herbivore' | 'carnivore' | 'omnivore';
export type CreatureSize = 'tiny' | 'small' | 'medium' | 'large' | 'huge';

export interface SpeciesConfig {
  id: string;
  name: string;
  color: string;
  baseHealth: number;
  baseSpeed: number;
  baseDamage: number;
  lifespan: number;
  reproductionRate: number;
  diet: Diet;
  size: CreatureSize;
  aquatic: boolean;
}

interface SliderDef {
  key: keyof SpeciesConfig;
  label: string;
  min: number;
  max: number;
  step: number;
}

const SLIDERS: SliderDef[] = [
  { key: 'baseHealth', label: 'HP', min: 10, max: 500, step: 5 },
  { key: 'baseSpeed', label: 'SPD', min: 0.5, max: 5.0, step: 0.1 },
  { key: 'baseDamage', label: 'DMG', min: 1, max: 50, step: 1 },
  { key: 'lifespan', label: 'LIFE', min: 100, max: 10000, step: 100 },
  { key: 'reproductionRate', label: 'REPR', min: 0.1, max: 3.0, step: 0.1 },
];

const DIETS: Diet[] = ['herbivore', 'carnivore', 'omnivore'];
const SIZES: CreatureSize[] = ['tiny', 'small', 'medium', 'large', 'huge'];
const STORAGE_KEY = 'worldbox_species';
const PANEL_W = 320;
const PANEL_H = 420;
const ROW_H = 22;
const PAD = 12;

export class CustomSpeciesSystem {
  private species = new Map<string, SpeciesConfig>();
  private panelOpen = false;
  private nextId = 1;

  // 编辑状态
  private editName = 'NewSpecies';
  private editColor = '#44aaff';
  private editValues: Record<string, number> = {
    baseHealth: 100, baseSpeed: 1.5, baseDamage: 5, lifespan: 1000, reproductionRate: 1.0,
  };
  private editDietIdx = 2;
  private editSizeIdx = 2;
  private editAquatic = false;
  private activeField: string | null = null;
  private draggingSlider: string | null = null;
  private listScroll = 0;
  private panelX = 0;
  private panelY = 0;

  constructor() {
    this.load();
  }

  createSpecies(config: Omit<SpeciesConfig, 'id'>): string {
    const id = `species_${this.nextId++}`;
    this.species.set(id, { ...config, id });
    this.save();
    return id;
  }

  getSpecies(id: string): SpeciesConfig | null {
    return this.species.get(id) ?? null;
  }

  getAllSpecies(): SpeciesConfig[] {
    return [...this.species.values()];
  }

  deleteSpecies(id: string): void {
    this.species.delete(id);
    this.save();
  }

  togglePanel(): void { this.panelOpen = !this.panelOpen; }
  isPanelOpen(): boolean { return this.panelOpen; }

  save(): void {
    try {
      const data = { nextId: this.nextId, list: this.getAllSpecies() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* noop */ }
  }

  load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as { nextId: number; list: SpeciesConfig[] };
      this.nextId = data.nextId ?? 1;
      this.species.clear();
      for (const s of data.list) this.species.set(s.id, s);
    } catch { /* noop */ }
  }

  handleInput(key: string): void {
    if (!this.panelOpen || !this.activeField) return;
    if (this.activeField === 'name') {
      if (key === 'Backspace') this.editName = this.editName.slice(0, -1);
      else if (key === 'Enter' || key === 'Escape') this.activeField = null;
      else if (key.length === 1 && this.editName.length < 16) this.editName += key;
    } else if (this.activeField === 'color') {
      if (key === 'Backspace') this.editColor = this.editColor.slice(0, -1);
      else if (key === 'Enter' || key === 'Escape') this.activeField = null;
      else if (key.length === 1 && this.editColor.length < 7) this.editColor += key;
    }
  }

  handleDrag(x: number, y: number): boolean {
    if (!this.panelOpen || !this.draggingSlider) return false;
    const def = SLIDERS.find(s => s.key === this.draggingSlider);
    if (!def) return false;
    const sliderX = this.panelX + 70;
    const sliderW = PANEL_W - 70 - PAD - 40;
    const ratio = Math.max(0, Math.min(1, (x - sliderX) / sliderW));
    const raw = def.min + ratio * (def.max - def.min);
    this.editValues[def.key] = Math.round(raw / def.step) * def.step;
    return true;
  }

  handleClick(x: number, y: number, screenW: number, screenH: number): boolean {
    if (!this.panelOpen) return false;
    this.panelX = (screenW - PANEL_W) / 2;
    this.panelY = (screenH - PANEL_H) / 2;
    const px = this.panelX, py = this.panelY;

    // 在面板外点击 -> 关闭
    if (x < px || x > px + PANEL_W || y < py || y > py + PANEL_H) {
      this.panelOpen = false;
      this.draggingSlider = null;
      return true;
    }

    this.activeField = null;
    this.draggingSlider = null;
    const ry = y - py - 30; // 相对于标题下方

    // 名称行
    if (ry >= 0 && ry < ROW_H) { this.activeField = 'name'; return true; }
    // 颜色行
    if (ry >= ROW_H && ry < ROW_H * 2) { this.activeField = 'color'; return true; }

    // 滑块行
    const sliderStart = ROW_H * 2;
    for (let i = 0; i < SLIDERS.length; i++) {
      const top = sliderStart + i * ROW_H;
      if (ry >= top && ry < top + ROW_H) {
        this.draggingSlider = SLIDERS[i].key as string;
        this.handleDrag(x, y);
        return true;
      }
    }

    const afterSliders = sliderStart + SLIDERS.length * ROW_H;

    // Diet 行
    if (ry >= afterSliders && ry < afterSliders + ROW_H) {
      this.editDietIdx = (this.editDietIdx + 1) % DIETS.length;
      return true;
    }
    // Size 行
    if (ry >= afterSliders + ROW_H && ry < afterSliders + ROW_H * 2) {
      this.editSizeIdx = (this.editSizeIdx + 1) % SIZES.length;
      return true;
    }
    // Aquatic 行
    if (ry >= afterSliders + ROW_H * 2 && ry < afterSliders + ROW_H * 3) {
      this.editAquatic = !this.editAquatic;
      return true;
    }

    // 创建按钮
    const btnY = afterSliders + ROW_H * 3 + 4;
    if (ry >= btnY && ry < btnY + 26) {
      this.createSpecies({
        name: this.editName || 'Unnamed',
        color: this.editColor || '#ffffff',
        baseHealth: this.editValues['baseHealth'],
        baseSpeed: this.editValues['baseSpeed'],
        baseDamage: this.editValues['baseDamage'],
        lifespan: this.editValues['lifespan'],
        reproductionRate: this.editValues['reproductionRate'],
        diet: DIETS[this.editDietIdx],
        size: SIZES[this.editSizeIdx],
        aquatic: this.editAquatic,
      });
      return true;
    }

    // 列表区域 - 删除按钮
    const listStart = btnY + 30;
    const all = this.getAllSpecies();
    const idx = Math.floor((ry - listStart + this.listScroll) / ROW_H);
    if (idx >= 0 && idx < all.length) {
      const delX = px + PANEL_W - PAD - 30;
      if (x >= delX) { this.deleteSpecies(all[idx].id); return true; }
    }

    return true;
  }

  render(ctx: CanvasRenderingContext2D, screenW: number, screenH: number): void {
    if (!this.panelOpen) return;
    const px = (screenW - PANEL_W) / 2;
    const py = (screenH - PANEL_H) / 2;
    this.panelX = px;
    this.panelY = py;

    ctx.save();

    // 背景
    ctx.fillStyle = 'rgba(12,14,24,0.94)';
    ctx.strokeStyle = 'rgba(100,180,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(px, py, PANEL_W, PANEL_H, 8);
    ctx.fill();
    ctx.stroke();

    // 标题
    ctx.fillStyle = '#7ec8e3';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Custom Species Creator', px + PANEL_W / 2, py + 20);

    let cy = py + 34;
    ctx.textAlign = 'left';
    ctx.font = '11px monospace';

    // 名称
    ctx.fillStyle = '#aaa';
    ctx.fillText('Name', px + PAD, cy + 14);
    this.drawInputBox(ctx, px + 70, cy, PANEL_W - 70 - PAD, ROW_H - 2, this.editName, this.activeField === 'name');
    cy += ROW_H;

    // 颜色
    ctx.fillStyle = '#aaa';
    ctx.fillText('Color', px + PAD, cy + 14);
    this.drawInputBox(ctx, px + 70, cy, PANEL_W - 70 - PAD - 26, ROW_H - 2, this.editColor, this.activeField === 'color');
    ctx.fillStyle = this.editColor;
    ctx.fillRect(px + PANEL_W - PAD - 20, cy + 3, 16, 14);
    cy += ROW_H;

    // 滑块
    for (const def of SLIDERS) {
      ctx.fillStyle = '#aaa';
      ctx.fillText(def.label, px + PAD, cy + 14);
      const val = this.editValues[def.key];
      const range = def.max - def.min;
      const ratio = range > 0 ? (val - def.min) / range : 0;
      const sliderX = px + 70;
      const sliderW = PANEL_W - 70 - PAD - 40;
      // 轨道
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(sliderX, cy + 8, sliderW, 4);
      // 填充
      ctx.fillStyle = 'rgba(100,180,255,0.6)';
      ctx.fillRect(sliderX, cy + 8, sliderW * ratio, 4);
      // 手柄
      ctx.fillStyle = '#7ec8e3';
      ctx.beginPath();
      ctx.arc(sliderX + sliderW * ratio, cy + 10, 5, 0, Math.PI * 2);
      ctx.fill();
      // 数值
      ctx.fillStyle = '#ddd';
      ctx.textAlign = 'right';
      const display = def.step < 1 ? val.toFixed(1) : String(Math.round(val));
      ctx.fillText(display, px + PANEL_W - PAD, cy + 14);
      ctx.textAlign = 'left';
      cy += ROW_H;
    }

    // Diet
    ctx.fillStyle = '#aaa';
    ctx.fillText('Diet', px + PAD, cy + 14);
    ctx.fillStyle = '#ffd700';
    ctx.fillText(DIETS[this.editDietIdx], px + 70, cy + 14);
    cy += ROW_H;

    // Size
    ctx.fillStyle = '#aaa';
    ctx.fillText('Size', px + PAD, cy + 14);
    ctx.fillStyle = '#ffd700';
    ctx.fillText(SIZES[this.editSizeIdx], px + 70, cy + 14);
    cy += ROW_H;

    // Aquatic
    ctx.fillStyle = '#aaa';
    ctx.fillText('Aquatic', px + PAD, cy + 14);
    ctx.fillStyle = this.editAquatic ? '#4fc3f7' : '#666';
    ctx.fillText(this.editAquatic ? 'YES' : 'NO', px + 70, cy + 14);
    cy += ROW_H;

    // 创建按钮
    cy += 4;
    ctx.fillStyle = 'rgba(100,180,255,0.25)';
    ctx.strokeStyle = '#7ec8e3';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(px + PAD, cy, PANEL_W - PAD * 2, 24, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#7ec8e3';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('+ Create Species', px + PANEL_W / 2, cy + 16);
    cy += 30;

    // 已创建列表
    ctx.textAlign = 'left';
    ctx.font = '11px monospace';
    const all = this.getAllSpecies();
    const listH = py + PANEL_H - cy - 6;
    ctx.save();
    ctx.beginPath();
    ctx.rect(px, cy, PANEL_W, listH);
    ctx.clip();

    for (let i = 0; i < all.length; i++) {
      const iy = cy + i * ROW_H - this.listScroll;
      if (iy + ROW_H < cy || iy > cy + listH) continue;
      const s = all[i];
      ctx.fillStyle = s.color;
      ctx.fillRect(px + PAD, iy + 4, 10, 10);
      ctx.fillStyle = '#ddd';
      ctx.fillText(`${s.name}  HP:${s.baseHealth} SPD:${s.baseSpeed.toFixed(1)}`, px + PAD + 16, iy + 14);
      // 删除按钮
      ctx.fillStyle = 'rgba(255,80,80,0.7)';
      ctx.fillText('X', px + PANEL_W - PAD - 10, iy + 14);
    }

    ctx.restore();
    ctx.restore();
  }

  private drawInputBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, text: string, active: boolean): void {
    ctx.fillStyle = active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)';
    ctx.strokeStyle = active ? '#7ec8e3' : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y + 2, w, h, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#eee';
    ctx.fillText(text + (active ? '|' : ''), x + 4, y + 14);
  }
}
