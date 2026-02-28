/** AchievementProgressSystem - 成就进度追踪器，带分类筛选面板 */

export type AchievementCategory = 'exploration' | 'civilization' | 'combat' | 'nature' | 'special';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  current: number;
  target: number;
  completed: boolean;
  completedAt: number; // tick
}

type AchievementStatus = 'completed' | 'in_progress' | 'pending';

const CATEGORIES: AchievementCategory[] = ['exploration', 'civilization', 'combat', 'nature', 'special'];
const ALL_CATS: (AchievementCategory | null)[] = [null, ...CATEGORIES]
const CAT_LABELS: Record<AchievementCategory, string> = {
  exploration: '探索', civilization: '文明', combat: '战斗', nature: '自然', special: '特殊',
};
const CAT_COLORS: Record<AchievementCategory, string> = {
  exploration: '#4fc3f7', civilization: '#aed581', combat: '#ef5350', nature: '#81c784', special: '#ce93d8',
};
const STORAGE_KEY = 'worldbox_achievements';
const PANEL_W = 380;
const PANEL_H = 420;
const ROW_H = 52;
const TAB_H = 30;
const HEADER_H = 40;

function makeAchievements(): Achievement[] {
  const defs: [string, string, string, AchievementCategory, number][] = [
    // exploration
    ['explore_10', '初出茅庐', '探索10%的地图', 'exploration', 10],
    ['explore_50', '探险家', '探索50%的地图', 'exploration', 50],
    ['explore_100', '制图大师', '探索100%的地图', 'exploration', 100],
    ['discover_biomes', '生态学家', '发现5种生态群落', 'exploration', 5],
    // civilization
    ['first_civ', '文明曙光', '建立第一个文明', 'civilization', 1],
    ['civ_5', '列国争雄', '同时存在5个文明', 'civilization', 5],
    ['pop_100', '人丁兴旺', '总人口达到100', 'civilization', 100],
    ['pop_500', '万民之城', '总人口达到500', 'civilization', 500],
    ['trade_3', '丝绸之路', '建立3条贸易路线', 'civilization', 3],
    // combat
    ['first_kill', '初次交锋', '发生第一次战斗', 'combat', 1],
    ['kills_50', '百战之师', '累计50次击杀', 'combat', 50],
    ['kills_500', '战神降临', '累计500次击杀', 'combat', 500],
    ['wars_3', '乱世枭雄', '爆发3场战争', 'combat', 3],
    // nature
    ['disaster_1', '天灾初现', '触发第一次灾难', 'nature', 1],
    ['disaster_10', '末日使者', '触发10次灾难', 'nature', 10],
    ['rain_5', '呼风唤雨', '降雨5次', 'nature', 5],
    ['volcano_1', '火山之怒', '触发一次火山喷发', 'nature', 1],
    // special
    ['play_10k', '时间领主', '世界运行10000 tick', 'special', 10000],
    ['play_100k', '永恒之主', '世界运行100000 tick', 'special', 100000],
    ['all_races', '众生平等', '同时拥有4个种族', 'special', 4],
  ];
  return defs.map(([id, name, description, category, target]) => ({
    id, name, description, category, current: 0, target, completed: false, completedAt: 0,
  }));
}

export class AchievementProgressSystem {
  private achievements: Achievement[];
  private panelOpen = false;
  private filter: AchievementCategory | null = null;
  private scrollOffset = 0;
  private _filteredBuf: Achievement[] = [];
  private _categoryBuf: Achievement[] = [];

  constructor() {
    this.achievements = makeAchievements();
  }

  updateProgress(id: string, value: number): void {
    const a = this.achievements.find(v => v.id === id);
    if (!a || a.completed) return;
    a.current = Math.min(value, a.target);
    if (a.current >= a.target) {
      a.completed = true;
      a.completedAt = Date.now();
    }
  }

  isCompleted(id: string): boolean {
    return this.achievements.find(a => a.id === id)?.completed ?? false;
  }

  getProgress(id: string): number {
    const a = this.achievements.find(v => v.id === id);
    if (!a) return 0;
    return a.target > 0 ? Math.min(a.current / a.target, 1) : 0;
  }

  getByCategory(category: string): Achievement[] {
    this._categoryBuf.length = 0;
    for (const a of this.achievements) { if (a.category === category) this._categoryBuf.push(a); }
    return this._categoryBuf;
  }

  getCompletionRate(): number {
    if (this.achievements.length === 0) return 0;
    let completed = 0;
    for (const a of this.achievements) { if (a.completed) completed++; }
    return completed / this.achievements.length;
  }

  togglePanel(): void { this.panelOpen = !this.panelOpen; }
  isPanelOpen(): boolean { return this.panelOpen; }
  setFilter(category: string | null): void {
    this.filter = category as AchievementCategory | null;
    this.scrollOffset = 0;
  }

  private getStatus(a: Achievement): AchievementStatus {
    if (a.completed) return 'completed';
    return a.current > 0 ? 'in_progress' : 'pending';
  }

  private getFiltered(): Achievement[] {
    this._filteredBuf.length = 0;
    if (this.filter) {
      for (const a of this.achievements) { if (a.category === this.filter) this._filteredBuf.push(a); }
    } else {
      for (const a of this.achievements) this._filteredBuf.push(a);
    }
    this._filteredBuf.sort((a, b) => {
      const order: Record<AchievementStatus, number> = { in_progress: 0, pending: 1, completed: 2 };
      return order[this.getStatus(a)] - order[this.getStatus(b)];
    });
    return this._filteredBuf;
  }

  private panelRect(screenW: number, screenH: number) {
    const x = (screenW - PANEL_W) / 2;
    const y = (screenH - PANEL_H) / 2;
    return { x, y, w: PANEL_W, h: PANEL_H };
  }

  render(ctx: CanvasRenderingContext2D, screenW: number, screenH: number): void {
    if (!this.panelOpen) return;
    const { x, y, w, h } = this.panelRect(screenW, screenH);

    ctx.save();
    // backdrop
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, screenW, screenH);
    // panel bg
    ctx.fillStyle = 'rgba(12,15,24,0.92)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // header
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const rate = this.getCompletionRate();
    ctx.fillText(`成就  ${(rate * 100).toFixed(0)}%`, x + 14, y + HEADER_H / 2);
    // close btn
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '16px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('X', x + w - 12, y + HEADER_H / 2);

    // overall progress bar
    const barX = x + 14, barY = y + HEADER_H - 6, barW = w - 28, barH = 3;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = '#ce93d8';
    ctx.fillRect(barX, barY, barW * rate, barH);

    // category tabs
    const tabY = y + HEADER_H + 4;
    const allCats = ALL_CATS;
    const tabW = w / allCats.length;
    for (let i = 0; i < allCats.length; i++) {
      const cat = allCats[i];
      const tx = x + i * tabW;
      const active = this.filter === cat;
      ctx.fillStyle = active ? 'rgba(255,255,255,0.12)' : 'transparent';
      ctx.fillRect(tx, tabY, tabW, TAB_H);
      ctx.fillStyle = active ? '#fff' : 'rgba(255,255,255,0.5)';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cat ? CAT_LABELS[cat] : '全部', tx + tabW / 2, tabY + TAB_H / 2);
    }

    // achievement list
    const listY = tabY + TAB_H + 4;
    const listH = h - (listY - y) - 8;
    const items = this.getFiltered();
    const maxScroll = Math.max(0, items.length * ROW_H - listH);
    this.scrollOffset = Math.min(this.scrollOffset, maxScroll);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, listY, w, listH);
    ctx.clip();

    for (let i = 0; i < items.length; i++) {
      const a = items[i];
      const ry = listY + i * ROW_H - this.scrollOffset;
      if (ry + ROW_H < listY || ry > listY + listH) continue;

      const status = this.getStatus(a);
      const catColor = CAT_COLORS[a.category];
      const progress = a.target > 0 ? a.current / a.target : 0;

      // row bg on hover-like alternation
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(x + 4, ry, w - 8, ROW_H);
      }

      // status indicator
      ctx.fillStyle = status === 'completed' ? '#4caf50' : status === 'in_progress' ? '#ffb74d' : 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.arc(x + 20, ry + ROW_H / 2, 5, 0, Math.PI * 2);
      ctx.fill();

      // name + description
      ctx.fillStyle = status === 'completed' ? 'rgba(255,255,255,0.5)' : '#fff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(a.name, x + 34, ry + 6);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '10px monospace';
      ctx.fillText(a.description, x + 34, ry + 22);

      // category tag
      ctx.fillStyle = catColor;
      ctx.font = '9px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(CAT_LABELS[a.category], x + w - 14, ry + 7);

      // progress bar
      const pbX = x + 34, pbY = ry + 36, pbW = w - 110, pbH = 6;
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.roundRect(pbX, pbY, pbW, pbH, 3);
      ctx.fill();
      ctx.fillStyle = status === 'completed' ? '#4caf50' : catColor;
      ctx.beginPath();
      ctx.roundRect(pbX, pbY, pbW * Math.min(progress, 1), pbH, 3);
      ctx.fill();

      // progress text
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(`${a.current}/${a.target} (${(progress * 100).toFixed(0)}%)`, x + w - 14, ry + 34);
    }

    ctx.restore(); // clip
    ctx.restore(); // main save
  }

  handleClick(x: number, y: number, screenW: number, screenH: number): boolean {
    if (!this.panelOpen) return false;
    const p = this.panelRect(screenW, screenH);
    if (x < p.x || x > p.x + p.w || y < p.y || y > p.y + p.h) {
      this.panelOpen = false;
      return true;
    }
    // close button
    if (x > p.x + p.w - 30 && y < p.y + HEADER_H) {
      this.panelOpen = false;
      return true;
    }
    // category tabs
    const tabY = p.y + HEADER_H + 4;
    if (y >= tabY && y <= tabY + TAB_H) {
      const allCats = ALL_CATS;
      const tabW = p.w / allCats.length;
      const idx = Math.floor((x - p.x) / tabW);
      if (idx >= 0 && idx < allCats.length) {
        this.filter = allCats[idx];
        this.scrollOffset = 0;
      }
      return true;
    }
    return true; // consume click inside panel
  }

  save(): void {
    const data = this.achievements.map(a => ({
      id: a.id, current: a.current, completed: a.completed, completedAt: a.completedAt,
    }));
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* quota */ }
  }

  load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data: { id: string; current: number; completed: boolean; completedAt: number }[] = JSON.parse(raw);
      const map = new Map(data.map(d => [d.id, d]));
      for (const a of this.achievements) {
        const saved = map.get(a.id);
        if (saved) {
          a.current = saved.current;
          a.completed = saved.completed;
          a.completedAt = saved.completedAt;
        }
      }
    } catch { /* corrupt data */ }
  }
}
