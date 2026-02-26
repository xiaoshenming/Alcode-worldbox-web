// TickBudgetSystem.ts - v1.16 Performance Optimization
// Per-frame computation budget management and spatial hashing for proximity queries

export type SystemPriority = 'critical' | 'high' | 'medium' | 'low';

export interface SystemProfile {
  name: string;
  priority: SystemPriority;
  avgTime: number;
  lastTime: number;
  skipCount: number;
  frequency: number;
}

interface SystemRecord {
  priority: SystemPriority;
  times: Float64Array;
  writeIdx: number;
  sum: number;
  lastTime: number;
  skipCount: number;
  frequency: number;
  frameCounter: number;
  startMark: number;
}

const HISTORY = 60;
const DEFAULT_BUDGET_MS = 12;
const FPS_THROTTLE_MEDIUM = 45;
const FPS_THROTTLE_LOW = 30;
const FPS_RECOVER = 55;

export class TickBudgetSystem {
  private budgetMs: number;
  private systems: Map<string, SystemRecord> = new Map();
  private frameStart = 0;
  private frameElapsed = 0;
  private currentFps = 60;
  private frameCount = 0;
  private reportCache: SystemProfile[] = [];
  private reportDirty = true;

  constructor(budgetMs: number = DEFAULT_BUDGET_MS) {
    this.budgetMs = budgetMs;
  }

  beginFrame(fps: number): void {
    this.frameStart = performance.now();
    this.frameElapsed = 0;
    this.currentFps = fps;
    this.frameCount++;
    this.reportDirty = true;
    this.adaptFrequencies();
  }

  endFrame(): void {
    this.frameElapsed = performance.now() - this.frameStart;
  }

  /** Returns false if the system should be skipped this frame. */
  beginSystem(name: string, priority: SystemPriority): boolean {
    let rec = this.systems.get(name);
    if (!rec) {
      rec = {
        priority, times: new Float64Array(HISTORY), writeIdx: 0,
        sum: 0, lastTime: 0, skipCount: 0, frequency: 1, frameCounter: 0, startMark: 0,
      };
      this.systems.set(name, rec);
    }
    rec.frameCounter++;
    if (priority === 'critical') {
      rec.startMark = performance.now();
      return true;
    }
    if (rec.frameCounter < rec.frequency) { rec.skipCount++; return false; }
    const elapsed = performance.now() - this.frameStart;
    if (elapsed >= this.budgetMs && priority !== 'high') { rec.skipCount++; return false; }
    rec.frameCounter = 0;
    rec.startMark = performance.now();
    return true;
  }

  endSystem(name: string): void {
    const rec = this.systems.get(name);
    if (!rec) return;
    const elapsed = performance.now() - rec.startMark;
    rec.lastTime = elapsed;
    const idx = rec.writeIdx;
    rec.sum -= rec.times[idx];
    rec.times[idx] = elapsed;
    rec.sum += elapsed;
    rec.writeIdx = (idx + 1) % HISTORY;
  }

  private adaptFrequencies(): void {
    const fps = this.currentFps;
    for (const rec of this.systems.values()) {
      const p = rec.priority;
      if (p === 'critical') { rec.frequency = 1; continue; }
      if (fps < FPS_THROTTLE_LOW) {
        if (p === 'low') rec.frequency = 4;
        else if (p === 'medium') rec.frequency = 2;
        else rec.frequency = 1;
      } else if (fps < FPS_THROTTLE_MEDIUM) {
        if (p === 'low') rec.frequency = 2;
        else if (p === 'medium') rec.frequency = 2;
        else rec.frequency = 1;
      } else if (fps >= FPS_RECOVER) {
        if (rec.frequency > 1) rec.frequency--;
      }
    }
  }

  getPerformanceReport(): SystemProfile[] {
    if (!this.reportDirty) return this.reportCache;
    this.reportCache.length = 0;
    for (const [name, rec] of this.systems) {
      this.reportCache.push({
        name, priority: rec.priority, avgTime: rec.sum / HISTORY,
        lastTime: rec.lastTime, skipCount: rec.skipCount, frequency: rec.frequency,
      });
    }
    this.reportDirty = false;
    return this.reportCache;
  }

  getTotalTickTime(): number { return this.frameElapsed; }

  resetSkipCounts(): void {
    for (const rec of this.systems.values()) rec.skipCount = 0;
  }
}

// --- Spatial Hash ---

export class SpatialHash {
  private invCell: number;
  private cells: Map<string, number[]> = new Map();
  private resultSet: Set<number> = new Set();

  constructor(cellSize: number = 16) {
    this.invCell = 1 / cellSize;
  }

  clear(): void {
    for (const arr of this.cells.values()) arr.length = 0;
  }

  insert(id: number, x: number, y: number): void {
    const key = this.toKey(x, y);
    let bucket = this.cells.get(key);
    if (!bucket) { bucket = []; this.cells.set(key, bucket); }
    bucket.push(id);
  }

  /** Query entity ids within radius tiles of (x, y). */
  query(x: number, y: number, radius: number): number[] {
    return this.collect(
      Math.floor((x - radius) * this.invCell), Math.floor((y - radius) * this.invCell),
      Math.floor((x + radius) * this.invCell), Math.floor((y + radius) * this.invCell),
    );
  }

  /** Query entity ids within a rectangular region. */
  queryRect(x1: number, y1: number, x2: number, y2: number): number[] {
    return this.collect(
      Math.floor(x1 * this.invCell), Math.floor(y1 * this.invCell),
      Math.floor(x2 * this.invCell), Math.floor(y2 * this.invCell),
    );
  }

  private collect(minCX: number, minCY: number, maxCX: number, maxCY: number): number[] {
    this.resultSet.clear();
    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const bucket = this.cells.get(cx + ',' + cy);
        if (bucket) {
          for (let i = 0, len = bucket.length; i < len; i++) this.resultSet.add(bucket[i]);
        }
      }
    }
    const out: number[] = [];
    for (const id of this.resultSet) out.push(id);
    return out;
  }

  private toKey(x: number, y: number): string {
    return Math.floor(x * this.invCell) + ',' + Math.floor(y * this.invCell);
  }
}
