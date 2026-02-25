export type OverlayMode = 'terrain' | 'political' | 'population' | 'resources' | 'military';

export interface PoliticalEntry {
  color: string;
  territory: Set<number>;
}

export interface MilitaryUnit {
  x: number;
  y: number;
  faction: string;
  color: string;
}

export interface ResourceMarker {
  x: number;
  y: number;
  type: string;
}

export interface OverlayData {
  political?: PoliticalEntry[];
  population?: number[][];
  military?: MilitaryUnit[];
  resources?: ResourceMarker[];
  worldWidth?: number;
  worldHeight?: number;
}

const MODES: OverlayMode[] = ['terrain', 'political', 'population', 'resources', 'military'];

const RESOURCE_COLORS: Record<string, string> = {
  wood: '#228B22',
  stone: '#808080',
  gold: '#FFD700',
  iron: '#A0522D',
  food: '#FF6347',
  crystal: '#00CED1',
};

export class MinimapOverlaySystem {
  private mode: OverlayMode = 'terrain';

  getMode(): OverlayMode {
    return this.mode;
  }

  setMode(mode: OverlayMode): void {
    this.mode = mode;
  }

  nextMode(): OverlayMode {
    const idx = MODES.indexOf(this.mode);
    this.mode = MODES[(idx + 1) % MODES.length];
    return this.mode;
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, data: OverlayData): void {
    switch (this.mode) {
      case 'terrain':
        break;
      case 'political':
        this.renderPolitical(ctx, width, height, data);
        break;
      case 'population':
        this.renderPopulation(ctx, width, height, data);
        break;
      case 'resources':
        this.renderResources(ctx, width, height, data);
        break;
      case 'military':
        this.renderMilitary(ctx, width, height, data);
        break;
    }
    this.renderModeLabel(ctx, width);
  }

  private renderPolitical(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    data: OverlayData
  ): void {
    const entries = data.political;
    if (!entries || !data.worldWidth || !data.worldHeight) return;

    const ww = data.worldWidth;
    const wh = data.worldHeight;
    const scaleX = width / ww;
    const scaleY = height / wh;

    ctx.globalAlpha = 0.45;
    for (const entry of entries) {
      ctx.fillStyle = entry.color;
      for (const tileIdx of entry.territory) {
        const tx = tileIdx % ww;
        const ty = Math.floor(tileIdx / ww);
        ctx.fillRect(
          Math.floor(tx * scaleX),
          Math.floor(ty * scaleY),
          Math.ceil(scaleX) || 1,
          Math.ceil(scaleY) || 1
        );
      }
    }
    ctx.globalAlpha = 1;
  }

  private renderPopulation(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    data: OverlayData
  ): void {
    const grid = data.population;
    if (!grid || grid.length === 0) return;

    const rows = grid.length;
    const cols = grid[0].length;
    const cellW = width / cols;
    const cellH = height / rows;

    let max = 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] > max) max = grid[r][c];
      }
    }

    ctx.globalAlpha = 0.55;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = grid[r][c];
        if (v <= 0) continue;
        const t = Math.min(v / max, 1);
        const red = Math.floor(255 * t);
        const green = Math.floor(255 * (1 - t));
        ctx.fillStyle = `rgb(${red},${green},0)`;
        ctx.fillRect(
          Math.floor(c * cellW),
          Math.floor(r * cellH),
          Math.ceil(cellW) || 1,
          Math.ceil(cellH) || 1
        );
      }
    }
    ctx.globalAlpha = 1;
  }

  private renderResources(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    data: OverlayData
  ): void {
    const markers = data.resources;
    if (!markers || !data.worldWidth || !data.worldHeight) return;

    const scaleX = width / data.worldWidth;
    const scaleY = height / data.worldHeight;
    const dotSize = Math.max(2, Math.ceil(Math.min(scaleX, scaleY)));

    ctx.globalAlpha = 0.8;
    for (const m of markers) {
      ctx.fillStyle = RESOURCE_COLORS[m.type] || '#FFFFFF';
      ctx.fillRect(
        Math.floor(m.x * scaleX),
        Math.floor(m.y * scaleY),
        dotSize,
        dotSize
      );
    }
    ctx.globalAlpha = 1;
  }

  private renderMilitary(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    data: OverlayData
  ): void {
    const units = data.military;
    if (!units || !data.worldWidth || !data.worldHeight) return;

    const scaleX = width / data.worldWidth;
    const scaleY = height / data.worldHeight;
    const radius = Math.max(2, Math.ceil(Math.min(scaleX, scaleY) * 0.8));

    ctx.globalAlpha = 0.85;
    for (const u of units) {
      const cx = Math.floor(u.x * scaleX);
      const cy = Math.floor(u.y * scaleY);
      ctx.fillStyle = u.color;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private renderModeLabel(ctx: CanvasRenderingContext2D, width: number): void {
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, 14);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.mode.toUpperCase(), width / 2, 11);
    ctx.textAlign = 'start';
  }
}
