/** WorldSeedSystem - deterministic PRNG based on world seed (mulberry32) */

export class WorldSeedSystem {
  private seed: number
  private state: number
  // Pre-computed display text — updated only when seed changes
  private _displayText: string
  /** Cached measureText width of _displayText at 11px monospace — reset when seed changes */
  private _displayTextWidth = 0

  constructor(seed?: number) {
    this.seed = seed ?? (Math.random() * 0xFFFFFFFF) >>> 0
    this.state = this.seed
    this._displayText = `Seed: ${this.seed.toString(16).toUpperCase().padStart(8, '0')}`
  }

  getSeed(): number {
    return this.seed
  }

  setSeed(seed: number): void {
    this.seed = seed >>> 0
    this.state = this.seed
    this._displayText = `Seed: ${this.seed.toString(16).toUpperCase().padStart(8, '0')}`
    this._displayTextWidth = 0 // reset width cache
  }

  /** Hash a user-provided string into a 32-bit integer seed */
  seedFromString(str: string): number {
    let h = 0
    for (let i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
    }
    return h >>> 0
  }

  /** Mulberry32 PRNG - returns deterministic float in [0, 1) */
  random(): number {
    let t = (this.state += 0x6D2B79F5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000
  }

  /** Deterministic random integer in [min, max] inclusive */
  randomInt(min: number, max: number): number {
    return min + Math.floor(this.random() * (max - min + 1))
  }

  /** Deterministic random float in [min, max) */
  randomFloat(min: number, max: number): number {
    return min + this.random() * (max - min)
  }

  /** Reset PRNG state back to the current seed */
  reset(): void {
    this.state = this.seed
  }

  /** Human-readable hex string of the seed */
  getSeedString(): string {
    return this.seed.toString(16).toUpperCase().padStart(8, '0')
  }

  /** Render seed display in the bottom-left corner */
  render(ctx: CanvasRenderingContext2D, screenWidth: number): void {
    const text = this._displayText
    const x = 8
    const y = ctx.canvas.height - 10

    ctx.save()
    ctx.font = '11px monospace'
    ctx.globalAlpha = 0.5
    ctx.fillStyle = '#000'
    if (this._displayTextWidth === 0) this._displayTextWidth = ctx.measureText(text).width
    const metrics = { width: this._displayTextWidth }
    ctx.fillRect(x - 2, y - 11, metrics.width + 4, 14)
    ctx.globalAlpha = 0.8
    ctx.fillStyle = '#aaa'
    ctx.fillText(text, x, y)
    ctx.restore()
  }
}
