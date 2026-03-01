/**
 * AutoSaveSystem - Periodically saves game state to the 'auto' slot
 * Displays a fade-in/fade-out indicator ("Saving..." / "Saved") on the canvas.
 * v1.61
 */

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'
import { ResourceSystem } from '../systems/ResourceSystem'
import { SaveSystem } from '../game/SaveSystem'

/** Snapshot used to detect meaningful world changes between save checks. */
interface WorldSnapshot {
  tick: number
  population: number
  civCount: number
}

/** Visual states for the save indicator. */
const enum IndicatorState {
  Hidden,
  Saving,
  Saved,
}

/** Default number of ticks between auto-saves (~50 s at 60 fps). */
const DEFAULT_INTERVAL = 3000

/** Duration (in ticks) the "Saving..." text is shown. */
const SAVING_DISPLAY_TICKS = 30

/** Duration (in ticks) the "Saved" text is shown before fading out. */
const SAVED_DISPLAY_TICKS = 120

/** Fade-out duration in ticks. */
const FADE_TICKS = 60

/** Indicator position offset from top-right corner. */
const INDICATOR_MARGIN_X = 16
const INDICATOR_MARGIN_Y = 16

export class AutoSaveSystem {
  /** Ticks between auto-saves. */
  private interval: number = DEFAULT_INTERVAL

  /** Tick counter since last save. */
  private ticksSinceLastSave: number = 0

  /** Timestamp (Date.now()) of the most recent successful save. */
  private lastSaveTime: number = 0

  /** Previous snapshot for change detection. */
  private prevSnapshot: WorldSnapshot | null = null

  // ---- Indicator visual state ----
  private indicatorState: IndicatorState = IndicatorState.Hidden
  private indicatorTimer: number = 0
  private indicatorAlpha: number = 0

  /** Whether the most recent save attempt succeeded. */
  private lastSaveOk: boolean = true

  /** Cached measureText widths for the two fixed indicator strings (lazy-init on first render). */
  private _savingTextWidth = 0
  private _savedTextWidth = 0

  // ----------------------------------------------------------------
  // Public API
  // ----------------------------------------------------------------

  /**
   * Called every game tick. Increments the internal counter and triggers
   * an auto-save when the interval elapses and meaningful changes exist.
   */
  update(
    tick: number,
    world: World,
    em: EntityManager,
    civManager: CivManager,
    resources: ResourceSystem,
  ): void {
    this.ticksSinceLastSave++
    this.advanceIndicator()

    if (this.ticksSinceLastSave >= this.interval) {
      if (this.hasChanged(world, em, civManager)) {
        this.triggerSave(world, em, civManager, resources)
      }
      // Reset counter even when skipped so we don't re-check every tick.
      this.ticksSinceLastSave = 0
    }
  }

  /**
   * Immediately perform an auto-save to the 'auto' slot.
   * Can also be called externally (e.g. before a risky god-power).
   */
  triggerSave(
    world: World,
    em: EntityManager,
    civManager: CivManager,
    resources: ResourceSystem,
  ): void {
    this.showIndicator(IndicatorState.Saving)

    const ok = SaveSystem.save(world, em, civManager, resources, 'auto')
    this.lastSaveOk = ok

    if (ok) {
      this.lastSaveTime = Date.now()
      this.takeSnapshot(world, em, civManager)
    }

    // Transition to "Saved" (or stay hidden on failure).
    this.showIndicator(ok ? IndicatorState.Saved : IndicatorState.Hidden)
  }

  /**
   * Render the save-status indicator in the top-right corner of the viewport.
   * Call this after all other HUD rendering so it draws on top.
   */
  render(ctx: CanvasRenderingContext2D): void {
    if (this.indicatorState === IndicatorState.Hidden && this.indicatorAlpha <= 0) {
      return
    }

    const alpha = Math.max(0, Math.min(1, this.indicatorAlpha))
    if (alpha <= 0.01) return

    const text = this.indicatorState === IndicatorState.Saving ? 'Saving...' : 'Saved'
    const x = ctx.canvas.width - INDICATOR_MARGIN_X
    const y = INDICATOR_MARGIN_Y + 14

    ctx.save()
    ctx.globalAlpha = alpha

    // Background pill
    ctx.font = '13px monospace'
    // Lazy-cache measureText widths — only two fixed strings ever appear
    if (this._savingTextWidth === 0) {
      this._savingTextWidth = ctx.measureText('Saving...').width
      this._savedTextWidth  = ctx.measureText('Saved').width
    }
    const textWidth = this.indicatorState === IndicatorState.Saving ? this._savingTextWidth : this._savedTextWidth
    const padX = 10
    const padY = 6
    const pillW = textWidth + padX * 2
    const pillH = 20 + padY
    const pillX = x - pillW
    const pillY = y - 14

    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.beginPath()
    roundRect(ctx, pillX, pillY, pillW, pillH, 6)
    ctx.fill()

    // Text
    ctx.fillStyle = this.lastSaveOk ? '#8f8' : '#f88'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'top'
    ctx.fillText(text, x - padX, y - 12 + padY)

    ctx.restore()
  }

  /** Set the auto-save interval in ticks. */
  setInterval(ticks: number): void {
    this.interval = Math.max(60, ticks) // minimum ~1 second at 60 fps
  }

  /** Get the auto-save interval in ticks. */
  getInterval(): number {
    return this.interval
  }

  /** Timestamp (ms since epoch) of the last successful auto-save, or 0. */
  getLastSaveTime(): number {
    return this.lastSaveTime
  }

  // ----------------------------------------------------------------
  // Change detection
  // ----------------------------------------------------------------

  /**
   * Returns true when the world has changed meaningfully since the last
   * snapshot. On the very first check (no snapshot yet) it always returns true.
   */
  private hasChanged(world: World, em: EntityManager, civManager: CivManager): boolean {
    if (this.prevSnapshot === null) {
      this.takeSnapshot(world, em, civManager)
      return true
    }

    const pop = em.getEntitiesWithComponents('position', 'creature').length
    const civs = civManager.civilizations.size

    if (world.tick !== this.prevSnapshot.tick) return true
    if (pop !== this.prevSnapshot.population) return true
    if (civs !== this.prevSnapshot.civCount) return true

    return false
  }

  private takeSnapshot(world: World, em: EntityManager, civManager: CivManager): void {
    const pop = em.getEntitiesWithComponents('position', 'creature').length
    if (this.prevSnapshot === null) {
      this.prevSnapshot = { tick: 0, population: 0, civCount: 0 }
    }
    this.prevSnapshot.tick = world.tick
    this.prevSnapshot.population = pop
    this.prevSnapshot.civCount = civManager.civilizations.size
  }

  // ----------------------------------------------------------------
  // Indicator animation
  // ----------------------------------------------------------------

  private showIndicator(state: IndicatorState): void {
    this.indicatorState = state
    if (state === IndicatorState.Saving) {
      this.indicatorTimer = SAVING_DISPLAY_TICKS
      this.indicatorAlpha = 1
    } else if (state === IndicatorState.Saved) {
      this.indicatorTimer = SAVED_DISPLAY_TICKS
      this.indicatorAlpha = 1
    } else {
      this.indicatorTimer = 0
    }
  }

  private advanceIndicator(): void {
    if (this.indicatorState === IndicatorState.Hidden) {
      if (this.indicatorAlpha > 0) {
        this.indicatorAlpha -= 1 / FADE_TICKS
      }
      return
    }

    if (this.indicatorTimer > 0) {
      this.indicatorTimer--
      return
    }

    // Timer expired — start fading out.
    if (this.indicatorAlpha > 0) {
      this.indicatorAlpha -= 1 / FADE_TICKS
    }
    if (this.indicatorAlpha <= 0) {
      this.indicatorState = IndicatorState.Hidden
      this.indicatorAlpha = 0
    }
  }
}

// ----------------------------------------------------------------
// Canvas helper — rounded rectangle (works in all target browsers)
// ----------------------------------------------------------------

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}
