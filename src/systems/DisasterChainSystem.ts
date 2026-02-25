// Disaster Chain & Ecological Crisis System
// Handles cascading disaster reactions and long-term ecological degradation/recovery

import { EventLog } from './EventLog'

export interface ChainEvent {
  sourceType: string
  targetType: string
  probability: number       // 0-1 base probability
  delay: number             // ticks before chain triggers
  magnitudeMultiplier: number
}

interface PendingChain {
  type: string
  x: number
  y: number
  magnitude: number
  triggerTick: number
}

export interface EcoCrisis {
  type: 'deforestation' | 'extinction' | 'pollution' | 'climate_shift'
  severity: number          // 0-1
  affectedArea: { x: number; y: number; radius: number }
  ticksActive: number
}

interface RecoveryZone {
  x: number
  y: number
  radius: number
  stage: number             // 0=lava, 1=rock, 2=sand, 3=grass
  nextStageTick: number
}

// Callbacks the system fires — Game.ts wires these to actual world/entity operations
export interface DisasterChainCallbacks {
  triggerEarthquake(x: number, y: number, magnitude: number): void
  triggerTsunami(x: number, y: number, magnitude: number): void
  triggerWildfire(x: number, y: number, magnitude: number): void
  triggerDesertification(x: number, y: number, radius: number): void
  triggerDiseaseOutbreak(x: number, y: number, magnitude: number): void
  triggerBuildingDamage(x: number, y: number, radius: number, severity: number): void
  triggerCooling(magnitude: number): void
  triggerCropFailure(x: number, y: number, radius: number, severity: number): void
  setTileAt(x: number, y: number, stage: number): void
  isWaterNear(x: number, y: number, radius: number): boolean
  countForestTiles(): number
  countTotalLand(): number
  getSpeciesCounts(): Map<string, number>
  countWarZones(): number
}

const ECO_CHECK_INTERVAL = 120
const RECOVERY_CHECK_INTERVAL = 180
const TEMPERATURE_DRIFT_RATE = 0.002
const MAX_CRISES = 8
const MAX_PENDING = 20
const MAX_RECOVERY_ZONES = 15

// Pre-defined chain rules
const DEFAULT_CHAIN_RULES: ChainEvent[] = [
  // Volcano chains
  { sourceType: 'volcano',    targetType: 'earthquake',     probability: 0.6,  delay: 30,  magnitudeMultiplier: 0.7 },
  { sourceType: 'earthquake', targetType: 'tsunami',        probability: 0.35, delay: 60,  magnitudeMultiplier: 0.8 },
  { sourceType: 'volcano',    targetType: 'wildfire',       probability: 0.3,  delay: 45,  magnitudeMultiplier: 0.5 },

  // Drought / fire chains
  { sourceType: 'drought',    targetType: 'wildfire',       probability: 0.5,  delay: 90,  magnitudeMultiplier: 1.2 },
  { sourceType: 'wildfire',   targetType: 'desertification', probability: 0.4, delay: 120, magnitudeMultiplier: 0.6 },

  // Flood chains
  { sourceType: 'flood',      targetType: 'disease',        probability: 0.45, delay: 80,  magnitudeMultiplier: 0.6 },
  { sourceType: 'flood',      targetType: 'crop_failure',   probability: 0.5,  delay: 40,  magnitudeMultiplier: 0.7 },

  // Earthquake chains
  { sourceType: 'earthquake', targetType: 'building_damage', probability: 0.7, delay: 5,   magnitudeMultiplier: 0.9 },
  { sourceType: 'earthquake', targetType: 'volcano',        probability: 0.1,  delay: 200, magnitudeMultiplier: 0.4 },

  // Meteor chains
  { sourceType: 'meteor',     targetType: 'cooling',        probability: 0.8,  delay: 60,  magnitudeMultiplier: 1.0 },
  { sourceType: 'meteor',     targetType: 'wildfire',       probability: 0.5,  delay: 10,  magnitudeMultiplier: 0.6 },
  { sourceType: 'meteor',     targetType: 'earthquake',     probability: 0.4,  delay: 20,  magnitudeMultiplier: 0.5 },

  // Cooling chains
  { sourceType: 'cooling',    targetType: 'crop_failure',   probability: 0.6,  delay: 150, magnitudeMultiplier: 0.8 },
]

// Thresholds for ecological crises
const FOREST_RATIO_THRESHOLD = 0.08       // below 8% forest = deforestation crisis
const SPECIES_ENDANGERED_THRESHOLD = 3    // fewer than 3 individuals = endangered
const POLLUTION_WAR_ZONE_THRESHOLD = 3    // 3+ active war zones = pollution
const CLIMATE_TEMP_THRESHOLD = 2.5        // |temp| > 2.5 = climate shift

export class DisasterChainSystem {
  private chainRules: ChainEvent[] = []
  private pendingChains: PendingChain[] = []
  private ecoCrises: EcoCrisis[] = []
  private recoveryZones: RecoveryZone[] = []
  private globalTemperature: number = 0   // deviation from normal, -5 to +5
  private targetTemperature: number = 0
  private callbacks: DisasterChainCallbacks | null = null

  constructor() {
    this.chainRules = [...DEFAULT_CHAIN_RULES]
  }

  setCallbacks(cb: DisasterChainCallbacks): void {
    this.callbacks = cb
  }

  // --- Main update ---

  update(tick: number): void {
    this.processPendingChains(tick)
    this.updateTemperature()

    if (tick % ECO_CHECK_INTERVAL === 0) {
      this.checkEcologicalCrises(tick)
    }

    if (tick % RECOVERY_CHECK_INTERVAL === 0) {
      this.processRecovery(tick)
    }

    this.tickCrises()
  }

  // --- Disaster occurred hook (called by DisasterSystem / GodPowerSystem) ---

  onDisasterOccurred(type: string, x: number, y: number, magnitude: number, tick: number): void {
    // Clamp magnitude
    magnitude = Math.max(1, Math.min(10, magnitude))

    // Evaluate all chain rules for this source type
    for (const rule of this.chainRules) {
      if (rule.sourceType !== type) continue

      const prob = this.getChainProbability(type, rule.targetType, magnitude)
      if (Math.random() >= prob) continue

      // Special check: tsunami only triggers near water
      if (rule.targetType === 'tsunami' && this.callbacks) {
        if (!this.callbacks.isWaterNear(x, y, 15)) continue
      }

      if (this.pendingChains.length >= MAX_PENDING) continue

      const chainMag = Math.max(1, Math.min(10, magnitude * rule.magnitudeMultiplier))
      // Scatter position slightly for chain events
      const scatter = Math.floor(magnitude * 1.5)
      const cx = x + Math.floor((Math.random() - 0.5) * scatter * 2)
      const cy = y + Math.floor((Math.random() - 0.5) * scatter * 2)

      this.pendingChains.push({
        type: rule.targetType,
        x: cx,
        y: cy,
        magnitude: chainMag,
        triggerTick: tick + rule.delay
      })

      EventLog.log('disaster', `${type} may trigger ${rule.targetType} near (${cx},${cy})`, tick)
    }

    // Volcano / meteor create recovery zones
    if (type === 'volcano' || type === 'meteor') {
      this.addRecoveryZone(x, y, Math.ceil(magnitude * 0.8), tick)
    }

    // Temperature effects
    if (type === 'volcano') {
      this.targetTemperature += magnitude * 0.15
    } else if (type === 'meteor' || type === 'cooling') {
      this.targetTemperature -= magnitude * 0.3
    }
    this.targetTemperature = Math.max(-5, Math.min(5, this.targetTemperature))
  }

  // --- Getters ---

  getGlobalTemperature(): number {
    return this.globalTemperature
  }

  getActiveCrises(): EcoCrisis[] {
    return this.ecoCrises
  }

  getChainProbability(sourceType: string, targetType: string, magnitude: number): number {
    const rule = this.chainRules.find(r => r.sourceType === sourceType && r.targetType === targetType)
    if (!rule) return 0

    // Higher magnitude increases probability (linear scale, capped at 0.95)
    const magBonus = (magnitude - 1) / 9 * 0.3  // 0 at mag 1, 0.3 at mag 10
    return Math.min(0.95, rule.probability + magBonus)
  }

  getPendingChainCount(): number {
    return this.pendingChains.length
  }

  getRecoveryZoneCount(): number {
    return this.recoveryZones.length
  }

  // --- Internal: process pending chains ---

  private processPendingChains(tick: number): void {
    if (!this.callbacks) return

    for (let i = this.pendingChains.length - 1; i >= 0; i--) {
      const chain = this.pendingChains[i]
      if (tick < chain.triggerTick) continue

      this.pendingChains.splice(i, 1)
      this.executeChainEvent(chain, tick)
    }
  }

  private executeChainEvent(chain: PendingChain, tick: number): void {
    const cb = this.callbacks!
    const { type, x, y, magnitude } = chain
    const radius = Math.ceil(magnitude * 1.2)

    switch (type) {
      case 'earthquake':
        cb.triggerEarthquake(x, y, magnitude)
        EventLog.log('disaster', `Chain earthquake (mag ${magnitude.toFixed(1)}) at (${x},${y})`, tick)
        // Earthquake can itself trigger further chains
        this.onDisasterOccurred('earthquake', x, y, magnitude, tick)
        break

      case 'tsunami':
        cb.triggerTsunami(x, y, magnitude)
        EventLog.log('disaster', `Tsunami triggered near (${x},${y})!`, tick)
        this.onDisasterOccurred('tsunami', x, y, magnitude, tick)
        break

      case 'wildfire':
        cb.triggerWildfire(x, y, magnitude)
        EventLog.log('disaster', `Chain wildfire ignited at (${x},${y})`, tick)
        break

      case 'desertification':
        cb.triggerDesertification(x, y, radius)
        EventLog.log('disaster', `Desertification spreading near (${x},${y})`, tick)
        break

      case 'disease':
        cb.triggerDiseaseOutbreak(x, y, magnitude)
        EventLog.log('disease', `Post-flood disease outbreak near (${x},${y})`, tick)
        break

      case 'building_damage':
        cb.triggerBuildingDamage(x, y, radius, magnitude / 10)
        EventLog.log('disaster', `Buildings damaged by earthquake at (${x},${y})`, tick)
        break

      case 'cooling':
        cb.triggerCooling(magnitude)
        this.targetTemperature -= magnitude * 0.4
        this.targetTemperature = Math.max(-5, this.targetTemperature)
        EventLog.log('disaster', `Nuclear winter effect — temperature dropping`, tick)
        break

      case 'crop_failure':
        cb.triggerCropFailure(x, y, radius, magnitude / 10)
        EventLog.log('disaster', `Crop failure near (${x},${y})`, tick)
        break

      case 'volcano':
        // Rare earthquake-triggered eruption
        EventLog.log('disaster', `Seismic activity triggered volcanic eruption at (${x},${y})!`, tick)
        this.onDisasterOccurred('volcano', x, y, magnitude, tick)
        break
    }
  }

  // --- Internal: ecological crisis checks ---

  private checkEcologicalCrises(tick: number): void {
    if (!this.callbacks) return

    const cb = this.callbacks
    const forestTiles = cb.countForestTiles()
    const totalLand = cb.countTotalLand()
    const speciesCounts = cb.getSpeciesCounts()
    const warZones = cb.countWarZones()

    // 1. Deforestation
    if (totalLand > 0) {
      const forestRatio = forestTiles / totalLand
      if (forestRatio < FOREST_RATIO_THRESHOLD) {
        const severity = 1 - (forestRatio / FOREST_RATIO_THRESHOLD)
        this.addOrUpdateCrisis('deforestation', severity, 100, 100, 50, tick)
        // Deforestation warms the planet
        this.targetTemperature += severity * 0.05
      } else {
        this.removeCrisisType('deforestation')
      }
    }

    // 2. Species extinction risk
    for (const [species, count] of speciesCounts) {
      if (count > 0 && count < SPECIES_ENDANGERED_THRESHOLD) {
        const severity = 1 - (count / SPECIES_ENDANGERED_THRESHOLD)
        this.addOrUpdateCrisis('extinction', severity, 100, 100, 40, tick)
        EventLog.log('disaster', `${species} endangered — only ${count} remaining`, tick)
        break // one extinction crisis at a time
      }
    }

    // 3. Pollution from war zones
    if (warZones >= POLLUTION_WAR_ZONE_THRESHOLD) {
      const severity = Math.min(1, (warZones - POLLUTION_WAR_ZONE_THRESHOLD + 1) / 5)
      this.addOrUpdateCrisis('pollution', severity, 100, 100, 60, tick)
      this.targetTemperature += severity * 0.03
    } else {
      this.removeCrisisType('pollution')
    }

    // 4. Climate shift
    if (Math.abs(this.globalTemperature) > CLIMATE_TEMP_THRESHOLD) {
      const severity = Math.min(1, (Math.abs(this.globalTemperature) - CLIMATE_TEMP_THRESHOLD) / 2.5)
      this.addOrUpdateCrisis('climate_shift', severity, 100, 100, 80, tick)
    } else {
      this.removeCrisisType('climate_shift')
    }

    // Natural temperature recovery toward 0 when no active pressure
    if (this.ecoCrises.length === 0) {
      this.targetTemperature *= 0.98
    }

    this.targetTemperature = Math.max(-5, Math.min(5, this.targetTemperature))
  }

  private addOrUpdateCrisis(
    type: EcoCrisis['type'], severity: number,
    cx: number, cy: number, radius: number, _tick: number
  ): void {
    const existing = this.ecoCrises.find(c => c.type === type)
    if (existing) {
      // Blend severity upward
      existing.severity = Math.min(1, existing.severity * 0.8 + severity * 0.2)
      existing.ticksActive++
    } else {
      if (this.ecoCrises.length >= MAX_CRISES) return
      this.ecoCrises.push({
        type,
        severity: Math.min(1, severity),
        affectedArea: { x: cx, y: cy, radius },
        ticksActive: 0
      })
    }
  }

  private removeCrisisType(type: EcoCrisis['type']): void {
    const idx = this.ecoCrises.findIndex(c => c.type === type)
    if (idx !== -1) {
      // Fade out gradually
      const crisis = this.ecoCrises[idx]
      crisis.severity -= 0.05
      if (crisis.severity <= 0) {
        this.ecoCrises.splice(idx, 1)
      }
    }
  }

  private tickCrises(): void {
    for (let i = this.ecoCrises.length - 1; i >= 0; i--) {
      this.ecoCrises[i].ticksActive++
    }
  }

  // --- Internal: temperature ---

  private updateTemperature(): void {
    if (Math.abs(this.globalTemperature - this.targetTemperature) < 0.001) return
    const diff = this.targetTemperature - this.globalTemperature
    this.globalTemperature += diff * TEMPERATURE_DRIFT_RATE
    this.globalTemperature = Math.max(-5, Math.min(5, this.globalTemperature))
  }

  // --- Internal: recovery ---

  private addRecoveryZone(x: number, y: number, radius: number, tick: number): void {
    if (this.recoveryZones.length >= MAX_RECOVERY_ZONES) return
    this.recoveryZones.push({
      x, y, radius,
      stage: 0,
      nextStageTick: tick + 600  // first recovery after 600 ticks
    })
  }

  private processRecovery(tick: number): void {
    if (!this.callbacks) return

    for (let i = this.recoveryZones.length - 1; i >= 0; i--) {
      const zone = this.recoveryZones[i]
      if (tick < zone.nextStageTick) continue

      zone.stage++

      // Apply terrain recovery in the zone
      // stage 1: lava→mountain, 2: mountain stays, 3: edges→grass
      for (let dy = -zone.radius; dy <= zone.radius; dy++) {
        for (let dx = -zone.radius; dx <= zone.radius; dx++) {
          if (dx * dx + dy * dy > zone.radius * zone.radius) continue
          if (Math.random() > 0.3) continue // sparse recovery
          this.callbacks.setTileAt(zone.x + dx, zone.y + dy, zone.stage)
        }
      }

      if (zone.stage >= 3) {
        this.recoveryZones.splice(i, 1)
        EventLog.log('disaster', `Terrain near (${zone.x},${zone.y}) has recovered`, tick)
      } else {
        zone.nextStageTick = tick + 600
      }
    }
  }
}
