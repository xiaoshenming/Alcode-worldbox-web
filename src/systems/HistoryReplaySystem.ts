/** HistoryReplaySystem - timeline scrubbing and world history snapshots */

export interface HistorySnapshot {
  tick: number
  population: number
  civCount: number
  wars: number
  events: string[]
  civData: { id: number; name: string; pop: number; color: string }[]
}

const MAX_SNAPSHOTS = 600  // ~10 minutes at 1/sec
const SNAPSHOT_INTERVAL = 60  // every 60 ticks
const _EMPTY_EVENTS: string[] = []

export class HistoryReplaySystem {
  private snapshots: HistorySnapshot[] = []
  private recording = true
  private replayIndex = -1  // -1 = live mode
  private scrubbing = false
  // Object pool for civData entries — reused across snapshots
  private _civDataPool: { id: number; name: string; pop: number; color: string }[] = []
  private _civDataPoolNext = 0
  /** Incrementally maintained max — avoids O(N) scan in render each frame */
  private _maxPop = 1
  private _maxCiv = 1
  /** Cached info string for current replay snapshot — rebuilt when replayIndex changes */
  private _prevInfoIdx = -2
  private _infoStr = ''

  /** Record a snapshot of current world state */
  recordSnapshot(
    tick: number,
    population: number,
    civCount: number,
    wars: number,
    events: string[],
    civData: { id: number; name: string; pop: number; color: string }[]
  ): void {
    if (!this.recording) return
    if (tick % SNAPSHOT_INTERVAL !== 0) return

    // Evict oldest snapshot and reclaim its civData objects into pool
    if (this.snapshots.length >= MAX_SNAPSHOTS) {
      const evicted = this.snapshots.shift()!
      for (const obj of evicted.civData) this._civDataPool.push(obj)
      this._civDataPoolNext = Math.max(0, this._civDataPoolNext - evicted.civData.length)
    }

    // Build civData array using pooled objects
    const civDataCopy: { id: number; name: string; pop: number; color: string }[] = []
    for (const c of civData) {
      let obj = this._civDataPool[this._civDataPoolNext]
      if (!obj) { obj = { id: 0, name: '', pop: 0, color: '' }; this._civDataPool.push(obj) }
      this._civDataPoolNext++
      obj.id = c.id; obj.name = c.name; obj.pop = c.pop; obj.color = c.color
      civDataCopy.push(obj)
    }

    // Share empty events reference (no slice needed for empty arrays)
    const eventsSnap = events.length === 0 ? _EMPTY_EVENTS : events.slice(-5)

    this.snapshots.push({
      tick, population, civCount, wars,
      events: eventsSnap,
      civData: civDataCopy,
    })
    // Incrementally maintain maxPop/maxCiv — avoids O(N) scan in render
    if (population > this._maxPop) this._maxPop = population
    if (civCount > this._maxCiv) this._maxCiv = civCount
  }

  /** Get snapshot at a specific index */
  getSnapshot(index: number): HistorySnapshot | null {
    return this.snapshots[index] ?? null
  }

  /** Get current replay snapshot (or null if live) */
  getCurrentReplaySnapshot(): HistorySnapshot | null {
    if (this.replayIndex < 0) return null
    return this.snapshots[this.replayIndex] ?? null
  }

  /** Start replay mode */
  startReplay(): void {
    if (this.snapshots.length === 0) return
    this.replayIndex = this.snapshots.length - 1
    this.scrubbing = true
  }

  /** Exit replay mode */
  stopReplay(): void {
    this.replayIndex = -1
    this.scrubbing = false
  }

  /** Scrub to a position (0.0 - 1.0) */
  scrubTo(pct: number): void {
    if (this.snapshots.length === 0) return
    this.replayIndex = Math.floor(pct * (this.snapshots.length - 1))
    this.scrubbing = true
  }

  /** Step forward/backward */
  step(delta: number): void {
    if (this.snapshots.length === 0) return
    this.replayIndex = Math.max(0, Math.min(this.snapshots.length - 1, this.replayIndex + delta))
  }

  isReplaying(): boolean {
    return this.scrubbing
  }

  getSnapshotCount(): number {
    return this.snapshots.length
  }

  getReplayIndex(): number {
    return this.replayIndex
  }

  getReplayProgress(): number {
    if (this.snapshots.length <= 1) return 0
    return this.replayIndex / (this.snapshots.length - 1)
  }

  /** Render timeline bar and replay info */
  render(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number): void {
    if (!this.scrubbing) return

    const barH = 30
    const barY = canvasH - barH - 10
    const barX = 60
    const barW = canvasW - 120

    ctx.save()

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.8)'
    ctx.fillRect(barX - 10, barY - 25, barW + 20, barH + 35)

    // Timeline bar
    ctx.fillStyle = '#333'
    ctx.fillRect(barX, barY, barW, barH)

    // Population graph overlay
    if (this.snapshots.length > 1) {
      const maxPop = this._maxPop
      ctx.strokeStyle = '#4488ff'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let i = 0; i < this.snapshots.length; i++) {
        const x = barX + (i / (this.snapshots.length - 1)) * barW
        const y = barY + barH - (this.snapshots[i].population / maxPop) * barH
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()

      // Civ count line
      const maxCiv = this._maxCiv
      ctx.strokeStyle = '#44cc44'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 0; i < this.snapshots.length; i++) {
        const x = barX + (i / (this.snapshots.length - 1)) * barW
        const y = barY + barH - (this.snapshots[i].civCount / maxCiv) * barH
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }

    // Playhead
    const progress = this.getReplayProgress()
    const headX = barX + progress * barW
    ctx.fillStyle = '#fff'
    ctx.fillRect(headX - 2, barY - 3, 4, barH + 6)

    // Current snapshot info — cache string, rebuild only when index changes
    const snap = this.getCurrentReplaySnapshot()
    if (snap) {
      if (this.replayIndex !== this._prevInfoIdx) {
        this._prevInfoIdx = this.replayIndex
        this._infoStr = `Tick ${snap.tick} | Pop: ${snap.population} | Civs: ${snap.civCount} | Wars: ${snap.wars}`
      }
      ctx.fillStyle = '#ddd'
      ctx.font = '11px monospace'
      ctx.textAlign = 'left'
      ctx.fillText(this._infoStr, barX, barY - 8)
    }

    // Controls hint
    ctx.fillStyle = '#888'
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('← → Scrub | ESC Exit Replay', canvasW / 2, barY + barH + 12)

    ctx.restore()
  }

  /** Get population history for charts */
  getPopulationHistory(): { tick: number; pop: number }[] {
    return this.snapshots.map(s => ({ tick: s.tick, pop: s.population }))
  }

  /** Get civ history for charts */
  getCivHistory(): { tick: number; count: number }[] {
    return this.snapshots.map(s => ({ tick: s.tick, count: s.civCount }))
  }
}
