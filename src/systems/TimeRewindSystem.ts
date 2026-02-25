/** TimeRewindSystem - periodic world state snapshots with rewind capability */

export interface WorldSnapshot {
  tick: number
  timestamp: number
  populationCount: number
  civCount: number
  label: string
}

const MAX_SNAPSHOTS = 20
const CAPTURE_INTERVAL = 600

export class TimeRewindSystem {
  private snapshots: WorldSnapshot[] = []
  private selectedIndex = -1
  private timelineVisible = false
  private confirmPending = false

  constructor() {}

  /** Capture a snapshot of the current world state */
  captureSnapshot(tick: number, populationCount: number, civCount: number): void {
    const snapshot: WorldSnapshot = {
      tick,
      timestamp: Date.now(),
      populationCount,
      civCount,
      label: `Tick ${tick} - ${civCount} civs, ${populationCount} pop`,
    }
    this.snapshots.push(snapshot)
    if (this.snapshots.length > MAX_SNAPSHOTS) {
      this.snapshots.shift()
      if (this.selectedIndex > 0) this.selectedIndex--
      else this.selectedIndex = -1
    }
  }

  getSnapshots(): WorldSnapshot[] {
    return this.snapshots
  }

  getSnapshotCount(): number {
    return this.snapshots.length
  }

  getSelectedIndex(): number {
    return this.selectedIndex
  }

  /** Select a snapshot by index; returns it or null if invalid */
  selectSnapshot(index: number): WorldSnapshot | null {
    if (index < 0 || index >= this.snapshots.length) return null
    this.selectedIndex = index
    this.confirmPending = true
    return this.snapshots[index]
  }

  isTimelineVisible(): boolean {
    return this.timelineVisible
  }

  toggleTimeline(): void {
    this.timelineVisible = !this.timelineVisible
    if (!this.timelineVisible) {
      this.selectedIndex = -1
      this.confirmPending = false
    }
  }

  /** Called every tick; auto-captures every CAPTURE_INTERVAL ticks */
  update(tick: number, populationCount: number, civCount: number): void {
    if (tick > 0 && tick % CAPTURE_INTERVAL === 0) {
      this.captureSnapshot(tick, populationCount, civCount)
    }
  }

  /** Render the timeline bar and confirmation prompt */
  render(ctx: CanvasRenderingContext2D, screenW: number, screenH: number): void {
    if (!this.timelineVisible || this.snapshots.length === 0) return

    const barH = 28
    const barX = 60
    const barW = screenW - 120
    const barY = screenH - barH - 40

    ctx.save()

    // Background panel
    ctx.fillStyle = 'rgba(0,0,0,0.75)'
    ctx.fillRect(barX - 10, barY - 22, barW + 20, barH + 50)

    // Track
    ctx.fillStyle = '#2a2a2a'
    ctx.fillRect(barX, barY, barW, barH)

    // Snapshot markers
    const count = this.snapshots.length
    for (let i = 0; i < count; i++) {
      const x = count === 1 ? barX + barW / 2 : barX + (i / (count - 1)) * barW
      const isSelected = i === this.selectedIndex
      ctx.fillStyle = isSelected ? '#ffcc00' : '#5588cc'
      const r = isSelected ? 6 : 4
      ctx.beginPath()
      ctx.arc(x, barY + barH / 2, r, 0, Math.PI * 2)
      ctx.fill()
    }

    // Label for selected snapshot
    if (this.selectedIndex >= 0 && this.selectedIndex < count) {
      const snap = this.snapshots[this.selectedIndex]
      ctx.fillStyle = '#eee'
      ctx.font = '11px monospace'
      ctx.textAlign = 'left'
      ctx.fillText(snap.label, barX, barY - 6)
    }

    // Confirmation prompt
    if (this.confirmPending && this.selectedIndex >= 0) {
      ctx.fillStyle = '#ffcc00'
      ctx.font = '11px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('Click again to rewind  |  ESC to cancel', screenW / 2, barY + barH + 16)
    } else {
      ctx.fillStyle = '#888'
      ctx.font = '10px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('Click a snapshot to rewind  |  T to close', screenW / 2, barY + barH + 16)
    }

    ctx.restore()
  }

  /** Handle click on the timeline; returns snapshot if confirmed, null otherwise */
  handleClick(x: number, y: number, screenW: number, screenH: number): WorldSnapshot | null {
    if (!this.timelineVisible || this.snapshots.length === 0) return null

    const barH = 28
    const barX = 60
    const barW = screenW - 120
    const barY = screenH - barH - 40

    // Check if click is within the timeline area
    if (y < barY - 5 || y > barY + barH + 5 || x < barX - 5 || x > barX + barW + 5) return null

    // Find closest snapshot
    const count = this.snapshots.length
    let closest = 0
    let closestDist = Infinity
    for (let i = 0; i < count; i++) {
      const sx = count === 1 ? barX + barW / 2 : barX + (i / (count - 1)) * barW
      const dist = Math.abs(x - sx)
      if (dist < closestDist) {
        closestDist = dist
        closest = i
      }
    }

    // Confirm on second click of same snapshot
    if (this.confirmPending && closest === this.selectedIndex) {
      this.confirmPending = false
      return this.snapshots[closest]
    }

    // First click: select and show confirm
    this.selectedIndex = closest
    this.confirmPending = true
    return null
  }
}
