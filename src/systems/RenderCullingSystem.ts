export interface CullingStats {
  totalEntities: number;
  visibleEntities: number;
  culledEntities: number;
  cullingRatio: number;
}

export interface TileBounds {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export class RenderCullingSystem {
  readonly CHUNK_SIZE = 16;

  private vpX = 0;
  private vpY = 0;
  private vpW = 0;
  private vpH = 0;
  private zoom = 1;
  private centerX = 0;
  private centerY = 0;

  private worldW = 200;
  private worldH = 200;
  private chunksX = 0;
  private chunksY = 0;
  private visibleChunks: Set<number> = new Set();
  private _visibleBuf: number[] = [];

  private stats: CullingStats = {
    totalEntities: 0,
    visibleEntities: 0,
    culledEntities: 0,
    cullingRatio: 0,
  };
  /** Reusable tile bounds object — avoids per-call allocation in getVisibleTileBounds */
  private _tileBounds: TileBounds = { startX: 0, startY: 0, endX: 0, endY: 0 };

  constructor() {
    this.updateChunkGrid();
  }

  setWorldSize(width: number, height: number): void {
    this.worldW = width;
    this.worldH = height;
    this.updateChunkGrid();
  }

  setViewport(x: number, y: number, width: number, height: number, zoom: number): void {
    this.vpX = x;
    this.vpY = y;
    this.vpW = width;
    this.vpH = height;
    this.zoom = zoom;
    this.centerX = x + width / 2;
    this.centerY = y + height / 2;
    this.rebuildVisibleChunks();
  }

  isVisible(entityX: number, entityY: number, margin = 32): boolean {
    const m = margin / this.zoom;
    return (
      entityX >= this.vpX - m &&
      entityX <= this.vpX + this.vpW + m &&
      entityY >= this.vpY - m &&
      entityY <= this.vpY + this.vpH + m
    );
  }

  cullEntities(entities: Array<{ id: number; x: number; y: number }>): number[] {
    this.stats.totalEntities = entities.length;
    const visible = this._visibleBuf; visible.length = 0;

    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      const cx = Math.floor(e.x / this.CHUNK_SIZE);
      const cy = Math.floor(e.y / this.CHUNK_SIZE);
      const chunkKey = cy * this.chunksX + cx;

      if (this.visibleChunks.has(chunkKey)) {
        visible.push(e.id);
      }
    }

    this.stats.visibleEntities = visible.length;
    this.stats.culledEntities = entities.length - visible.length;
    this.stats.cullingRatio = entities.length > 0
      ? this.stats.culledEntities / entities.length
      : 0;

    return visible;
  }

  getLODLevel(entityX: number, entityY: number): 0 | 1 | 2 {
    const dx = entityX - this.centerX;
    const dy = entityY - this.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const halfDiag = Math.sqrt(this.vpW * this.vpW + this.vpH * this.vpH) / 2;

    if (dist < halfDiag * 0.4) return 0;
    if (dist < halfDiag * 0.75) return 1;
    return 2;
  }

  getVisibleTileBounds(): TileBounds {
    this._tileBounds.startX = Math.max(0, Math.floor(this.vpX));
    this._tileBounds.startY = Math.max(0, Math.floor(this.vpY));
    this._tileBounds.endX = Math.min(this.worldW - 1, Math.ceil(this.vpX + this.vpW));
    this._tileBounds.endY = Math.min(this.worldH - 1, Math.ceil(this.vpY + this.vpH));
    return this._tileBounds;
  }

  shouldRenderDetail(x: number, y: number): boolean {
    if (this.zoom >= 0.5) return true;
    const dx = x - this.centerX;
    const dy = y - this.centerY;
    const dist = dx * dx + dy * dy;
    const threshold = (this.vpW * 0.3) * (this.vpW * 0.3);
    return dist < threshold;
  }

  isChunkVisible(chunkX: number, chunkY: number): boolean {
    return this.visibleChunks.has(chunkY * this.chunksX + chunkX);
  }

  private updateChunkGrid(): void {
    this.chunksX = Math.ceil(this.worldW / this.CHUNK_SIZE);
    this.chunksY = Math.ceil(this.worldH / this.CHUNK_SIZE);
  }

  private rebuildVisibleChunks(): void {
    this.visibleChunks.clear();
    const margin = this.CHUNK_SIZE;
    const startCX = Math.max(0, Math.floor((this.vpX - margin) / this.CHUNK_SIZE));
    const startCY = Math.max(0, Math.floor((this.vpY - margin) / this.CHUNK_SIZE));
    const endCX = Math.min(this.chunksX - 1, Math.floor((this.vpX + this.vpW + margin) / this.CHUNK_SIZE));
    const endCY = Math.min(this.chunksY - 1, Math.floor((this.vpY + this.vpH + margin) / this.CHUNK_SIZE));

    for (let cy = startCY; cy <= endCY; cy++) {
      for (let cx = startCX; cx <= endCX; cx++) {
        this.visibleChunks.add(cy * this.chunksX + cx);
      }
    }
  }
}
