// Disaster Warning System — visual/gameplay warnings before natural disasters strike
// Provides ground shaking, sky darkening, animal fleeing, and water receding effects

import { EventLog } from './EventLog'

/** Types of disaster warnings that can precede actual disasters */
export type WarningType =
  | 'EARTHQUAKE_TREMOR'
  | 'VOLCANO_RUMBLE'
  | 'TSUNAMI_WAVE'
  | 'METEOR_STREAK'
  | 'TORNADO_WIND'
  | 'PLAGUE_OMEN'

/** An active warning instance tracking countdown to disaster */
export interface DisasterWarning {
  type: WarningType
  x: number
  y: number
  intensity: number // 0-1
  ticksRemaining: number
  radius: number
}

/** Ground shake effect — tiles vibrate around a point */
export interface GroundShakeEffect { kind: 'GroundShake'; x: number; y: number; intensity: number }

/** Sky darken effect — screen overlay dims */
export interface SkyDarkenEffect { kind: 'SkyDarken'; intensity: number }

/** Animal flee effect — creatures run from epicenter */
export interface AnimalFleeEffect { kind: 'AnimalFlee'; fromX: number; fromY: number; radius: number }

/** Water recede effect — coastal water pulls back before tsunami */
export interface WaterRecedeEffect { kind: 'WaterRecede'; coastX: number; coastY: number }

export type VisualEffect = GroundShakeEffect | SkyDarkenEffect | AnimalFleeEffect | WaterRecedeEffect

const MIN_LEAD_TICKS = 60
const MAX_LEAD_TICKS = 180
const FLEE_INTELLIGENCE_THRESHOLD = 5

/** Maps warning types to the visual effects they produce */
const WARNING_EFFECTS: Record<WarningType, ReadonlyArray<VisualEffect['kind']>> = {
  EARTHQUAKE_TREMOR: ['GroundShake', 'AnimalFlee'],
  VOLCANO_RUMBLE: ['GroundShake', 'SkyDarken', 'AnimalFlee'],
  TSUNAMI_WAVE: ['WaterRecede', 'AnimalFlee'],
  METEOR_STREAK: ['SkyDarken'],
  TORNADO_WIND: ['SkyDarken', 'AnimalFlee'],
  PLAGUE_OMEN: ['AnimalFlee'],
}

/** Human-readable names for event log messages */
const WARNING_NAMES: Record<WarningType, string> = {
  EARTHQUAKE_TREMOR: 'earthquake tremors',
  VOLCANO_RUMBLE: 'volcanic rumbling',
  TSUNAMI_WAVE: 'a receding shoreline',
  METEOR_STREAK: 'strange streaks in the sky',
  TORNADO_WIND: 'ominous swirling winds',
  PLAGUE_OMEN: 'sickly omens in the air',
}

/**
 * Provides visual and gameplay warnings before natural disasters strike.
 *
 * Warnings appear 60-180 ticks before the actual disaster and produce
 * visual effects (ground shaking, sky darkening, animal fleeing, water receding)
 * that the renderer can consume. Intelligent creatures can sense warnings and flee.
 */
export class DisasterWarningSystem {
  private warnings: DisasterWarning[] = []
  private cachedEffects: VisualEffect[] = []
  private effectsDirty: boolean = true
  private _shakeOffset = { dx: 0, dy: 0 }

  /**
   * Process active warnings: decay intensity, remove expired, rebuild effects.
   * @param tick Current game tick
   */
  update(tick: number): void {
    if (this.warnings.length === 0) return

    this.effectsDirty = true

    for (let i = this.warnings.length - 1; i >= 0; i--) {
      const w = this.warnings[i]
      w.ticksRemaining--

      // Intensity ramps up as disaster approaches (peaks at 0 ticks remaining)
      const totalDuration = this.estimateTotalDuration(w)
      const elapsed = totalDuration - w.ticksRemaining
      const progress = Math.min(1, elapsed / Math.max(1, totalDuration))
      w.intensity = Math.min(1, progress * progress) // quadratic ramp

      if (w.ticksRemaining <= 0) {
        this.warnings.splice(i, 1)
        EventLog.log('disaster', `The ${WARNING_NAMES[w.type]} have culminated!`, tick)
      }
    }
  }

  /**
   * Queue a new disaster warning.
   * @param type The warning type
   * @param x World x coordinate of the warning epicenter
   * @param y World y coordinate of the warning epicenter
   * @param ticksUntilDisaster Ticks before the actual disaster (clamped to 60-180)
   */
  addWarning(type: WarningType, x: number, y: number, ticksUntilDisaster: number): void {
    const ticks = Math.max(MIN_LEAD_TICKS, Math.min(MAX_LEAD_TICKS, ticksUntilDisaster))
    const radius = this.getDefaultRadius(type)

    const warning: DisasterWarning = {
      type,
      x,
      y,
      intensity: 0,
      ticksRemaining: ticks,
      radius,
    }

    this.warnings.push(warning)
    this.effectsDirty = true
    EventLog.log('disaster', `Signs of ${WARNING_NAMES[type]} detected near (${x}, ${y})`, 0)
  }

  /**
   * Get all currently active warnings.
   * @returns Shallow copy of the active warnings array
   */
  getActiveWarnings(): DisasterWarning[] {
    return this.warnings.slice()
  }

  /**
   * Get visual effect descriptors for the renderer to consume.
   * Effects are rebuilt only when warnings change.
   * @returns Array of visual effect descriptors
   */
  getVisualEffects(): VisualEffect[] {
    if (!this.effectsDirty) return this.cachedEffects

    const effects: VisualEffect[] = []

    for (const w of this.warnings) {
      if (w.intensity < 0.01) continue

      const effectKinds = WARNING_EFFECTS[w.type]
      for (const kind of effectKinds) {
        switch (kind) {
          case 'GroundShake':
            effects.push({ kind: 'GroundShake', x: w.x, y: w.y, intensity: w.intensity })
            break
          case 'SkyDarken':
            effects.push({ kind: 'SkyDarken', intensity: w.intensity * 0.6 })
            break
          case 'AnimalFlee':
            effects.push({ kind: 'AnimalFlee', fromX: w.x, fromY: w.y, radius: w.radius })
            break
          case 'WaterRecede':
            effects.push({ kind: 'WaterRecede', coastX: w.x, coastY: w.y })
            break
        }
      }
    }

    this.cachedEffects = effects
    this.effectsDirty = false
    return effects
  }

  /**
   * Check if a creature at the given position with the given intelligence
   * should sense danger and flee. Returns the nearest warning to flee from,
   * or null if no warning is sensed.
   * @param cx Creature x position
   * @param cy Creature y position
   * @param intelligence Creature intelligence stat
   */
  shouldCreatureFlee(cx: number, cy: number, intelligence: number): DisasterWarning | null {
    if (intelligence < FLEE_INTELLIGENCE_THRESHOLD) return null

    let nearest: DisasterWarning | null = null
    let nearestDist = Infinity

    for (const w of this.warnings) {
      if (w.intensity < 0.15) continue

      const dx = cx - w.x
      const dy = cy - w.y
      const dist = dx * dx + dy * dy
      // Smarter creatures sense from further away
      const senseRadius = w.radius * (1 + (intelligence - FLEE_INTELLIGENCE_THRESHOLD) * 0.2)

      if (dist < senseRadius * senseRadius && dist < nearestDist) {
        nearestDist = dist
        nearest = w
      }
    }

    return nearest
  }

  /**
   * Get the number of active warnings.
   */
  getWarningCount(): number {
    return this.warnings.length
  }

  /**
   * Remove all warnings of a specific type (e.g., if the disaster was cancelled).
   * @param type Warning type to clear
   */
  clearWarningsOfType(type: WarningType): void {
    for (let i = this.warnings.length - 1; i >= 0; i--) {
      if (this.warnings[i].type === type) {
        this.warnings.splice(i, 1)
      }
    }
    this.effectsDirty = true
  }

  /**
   * Remove all active warnings.
   */
  clearAll(): void {
    this.warnings.length = 0
    this.cachedEffects.length = 0
    this.effectsDirty = true
  }

  /** Compute ground shake offset for rendering (small position jitter) */
  getShakeOffset(tick: number): { dx: number; dy: number } {
    let maxIntensity = 0
    for (const w of this.warnings) {
      if (w.type === 'EARTHQUAKE_TREMOR' || w.type === 'VOLCANO_RUMBLE') {
        if (w.intensity > maxIntensity) maxIntensity = w.intensity
      }
    }
    if (maxIntensity < 0.01) { this._shakeOffset.dx = 0; this._shakeOffset.dy = 0; return this._shakeOffset }

    const amplitude = maxIntensity * 3
    this._shakeOffset.dx = Math.sin(tick * 1.7) * amplitude * (0.5 + Math.random() * 0.5)
    this._shakeOffset.dy = Math.cos(tick * 2.3) * amplitude * (0.5 + Math.random() * 0.5)
    return this._shakeOffset
  }

  private getDefaultRadius(type: WarningType): number {
    switch (type) {
      case 'EARTHQUAKE_TREMOR': return 25
      case 'VOLCANO_RUMBLE': return 20
      case 'TSUNAMI_WAVE': return 30
      case 'METEOR_STREAK': return 15
      case 'TORNADO_WIND': return 18
      case 'PLAGUE_OMEN': return 22
    }
  }

  private estimateTotalDuration(_w: DisasterWarning): number {
    return MAX_LEAD_TICKS
  }
}
