/**
 * PollutionSystem - 世界污染系统 (v1.92)
 *
 * 工业化文明产生污染，污染扩散到周围地块，影响地形颜色、生物健康和作物产量。
 * 污染可通过森林吸收自然消散。按 Shift+P 打开污染热力图叠加层。
 */

import { WORLD_WIDTH, WORLD_HEIGHT, TileType } from '../utils/Constants'
type TileGrid = TileType[][]

/** 污染源 */
interface PollutionSource {
  x: number
  y: number
  /** 每 tick 排放量 */
  rate: number
  /** 所属文明 ID */
  civId: number
}

/** 配置常量 */
const MAX_POLLUTION = 1.0
const DIFFUSION_RATE = 0.02
const NATURAL_DECAY = 0.001
const FOREST_ABSORB = 0.005
const HEALTH_THRESHOLD = 0.4
const CROP_PENALTY_THRESHOLD = 0.3
const UPDATE_INTERVAL = 10
const OVERLAY_ALPHA_MAX = 0.55
// Pre-computed pollution overlay colors (p quantized to 100 steps, 0.01-1.00)
const POLLUTION_COLORS: string[] = (() => {
  const cols: string[] = ['']  // index 0 unused (p < 0.01 skipped)
  for (let i = 1; i <= 100; i++) {
    const p = i / 100
    const r = Math.floor(80 + p * 175)
    const g = Math.floor(180 * (1 - p))
    const b = Math.floor(p * 120)
    const alpha = (p * OVERLAY_ALPHA_MAX).toFixed(3)
    cols.push(`rgba(${r},${g},${b},${alpha})`)
  }
  return cols
})()

function clamp01(v: number): number { return v < 0 ? 0 : v > 1 ? 1 : v }

export class PollutionSystem {
  /** 污染浓度网格 */
  private grid: Float32Array
  private sources: PollutionSource[] = []
  private overlayVisible = false
  private tickCounter = 0
  private w: number
  private h: number
  // Cached render string — avoids toFixed(1) per frame when overlay is visible
  private _avgPollutionStr = '0.0'
  private _pollutionHeaderStr = '\u{2623} 污染热力图 (avg: 0.0%)'

  constructor() {
    this.w = WORLD_WIDTH
    this.h = WORLD_HEIGHT
    this.grid = new Float32Array(this.w * this.h)
  }

  /* ── 公共 API ── */

  /** 获取某地块污染值 0-1 */
  getPollution(x: number, y: number): number {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return 0
    return this.grid[y * this.w + x]
  }

  /** 是否影响健康 */
  isHealthHazard(x: number, y: number): boolean {
    return this.getPollution(x, y) >= HEALTH_THRESHOLD
  }

  /** 作物产量惩罚系数 0-1 */
  getCropPenalty(x: number, y: number): number {
    const p = this.getPollution(x, y)
    if (p < CROP_PENALTY_THRESHOLD) return 1
    return Math.max(0.1, 1 - (p - CROP_PENALTY_THRESHOLD) / (MAX_POLLUTION - CROP_PENALTY_THRESHOLD) * 0.8)
  }

  /** 获取全局平均污染 */
  getAveragePollution(): number {
    let sum = 0
    for (let i = 0; i < this.grid.length; i++) sum += this.grid[i]
    return this.grid.length > 0 ? sum / this.grid.length : 0
  }

  /* ── 更新 ── */

  update(worldTiles: TileGrid): void {
    this.tickCounter++
    if (this.tickCounter % UPDATE_INTERVAL !== 0) return

    // 排放
    for (let i = 0; i < this.sources.length; i++) {
      const s = this.sources[i]
      const idx = s.y * this.w + s.x
      this.grid[idx] = clamp01(this.grid[idx] + s.rate)
    }

    // 扩散 + 衰减
    const w = this.w, h = this.h
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x
        const cur = this.grid[idx]
        if (cur < 0.001) continue

        // 向四邻扩散
        const spread = cur * DIFFUSION_RATE * 0.25
        this.grid[idx - 1] = clamp01(this.grid[idx - 1] + spread)
        this.grid[idx + 1] = clamp01(this.grid[idx + 1] + spread)
        this.grid[idx - w] = clamp01(this.grid[idx - w] + spread)
        this.grid[idx + w] = clamp01(this.grid[idx + w] + spread)

        // 自然衰减
        let decay = NATURAL_DECAY
        // 森林加速吸收
        const tile = worldTiles[y]?.[x]
        if (tile === TileType.FOREST) decay += FOREST_ABSORB

        this.grid[idx] = clamp01(cur - spread * 4 - decay)
      }
    }
    // Rebuild cached avg string after each update cycle
    this._avgPollutionStr = (this.getAveragePollution() * 100).toFixed(1)
    this._pollutionHeaderStr = `\u{2623} 污染热力图 (avg: ${this._avgPollutionStr}%)`
  }

  /* ── 输入 ── */

  handleKeyDown(e: KeyboardEvent): boolean {
    if (e.shiftKey && e.key.toUpperCase() === 'P') {
      this.overlayVisible = !this.overlayVisible
      return true
    }
    return false
  }

  /* ── 渲染叠加层 ── */

  renderOverlay(ctx: CanvasRenderingContext2D, camX: number, camY: number, camZoom: number, tileSize: number): void {
    if (!this.overlayVisible) return

    const startTX = Math.max(0, Math.floor(camX / tileSize))
    const startTY = Math.max(0, Math.floor(camY / tileSize))
    const endTX = Math.min(this.w, Math.ceil((camX + ctx.canvas.width / camZoom) / tileSize))
    const endTY = Math.min(this.h, Math.ceil((camY + ctx.canvas.height / camZoom) / tileSize))

    for (let ty = startTY; ty < endTY; ty++) {
      for (let tx = startTX; tx < endTX; tx++) {
        const p = this.grid[ty * this.w + tx]
        if (p < 0.01) continue
        ctx.fillStyle = POLLUTION_COLORS[Math.max(1, Math.min(100, Math.round(p * 100)))]
        ctx.fillRect(tx * tileSize, ty * tileSize, tileSize, tileSize)
      }
    }

    // 标题
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(10, 10, 180, 28)
    ctx.fillStyle = '#ff8844'
    ctx.font = 'bold 13px monospace'
    ctx.fillText(this._pollutionHeaderStr, 18, 29)
    ctx.restore()
  }
}
