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

    const effects = this.cachedEffects; effects.length = 0

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

    this.effectsDirty = false
    return effects
  }

  /**
   * Get the number of active warnings.
   */
  getWarningCount(): number {
    return this.warnings.length
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
