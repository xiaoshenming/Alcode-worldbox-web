// Disaster Chain & Ecological Crisis System — cascading disasters and ecological degradation/recovery
import { EventLog } from './EventLog'

export interface ChainEvent {
  sourceType: string; targetType: string
  probability: number; delay: number; magnitudeMultiplier: number
}
interface PendingChain { type: string; x: number; y: number; magnitude: number; triggerTick: number }

export interface EcoCrisis {
  type: 'deforestation' | 'extinction' | 'pollution' | 'climate_shift'
  severity: number; affectedArea: { x: number; y: number; radius: number }; ticksActive: number
}
interface RecoveryZone { x: number; y: number; radius: number; stage: number; nextStageTick: number }

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

const ECO_INTERVAL = 120, RECOVERY_INTERVAL = 180, TEMP_DRIFT = 0.002
const MAX_CRISES = 8, MAX_PENDING = 20, MAX_RECOVERY = 15
const FOREST_THRESH = 0.08, SPECIES_THRESH = 3, WAR_THRESH = 3, CLIMATE_THRESH = 2.5

const CHAIN_RULES: ChainEvent[] = [
  { sourceType: 'volcano',    targetType: 'earthquake',      probability: 0.6,  delay: 30,  magnitudeMultiplier: 0.7 },
  { sourceType: 'earthquake', targetType: 'tsunami',         probability: 0.35, delay: 60,  magnitudeMultiplier: 0.8 },
  { sourceType: 'volcano',    targetType: 'wildfire',        probability: 0.3,  delay: 45,  magnitudeMultiplier: 0.5 },
  { sourceType: 'drought',    targetType: 'wildfire',        probability: 0.5,  delay: 90,  magnitudeMultiplier: 1.2 },
  { sourceType: 'wildfire',   targetType: 'desertification', probability: 0.4,  delay: 120, magnitudeMultiplier: 0.6 },
  { sourceType: 'flood',      targetType: 'disease',         probability: 0.45, delay: 80,  magnitudeMultiplier: 0.6 },
  { sourceType: 'flood',      targetType: 'crop_failure',    probability: 0.5,  delay: 40,  magnitudeMultiplier: 0.7 },
  { sourceType: 'earthquake', targetType: 'building_damage', probability: 0.7,  delay: 5,   magnitudeMultiplier: 0.9 },
  { sourceType: 'earthquake', targetType: 'volcano',         probability: 0.1,  delay: 200, magnitudeMultiplier: 0.4 },
  { sourceType: 'meteor',     targetType: 'cooling',         probability: 0.8,  delay: 60,  magnitudeMultiplier: 1.0 },
  { sourceType: 'meteor',     targetType: 'wildfire',        probability: 0.5,  delay: 10,  magnitudeMultiplier: 0.6 },
  { sourceType: 'meteor',     targetType: 'earthquake',      probability: 0.4,  delay: 20,  magnitudeMultiplier: 0.5 },
  { sourceType: 'cooling',    targetType: 'crop_failure',    probability: 0.6,  delay: 150, magnitudeMultiplier: 0.8 },
]

export class DisasterChainSystem {
  private chainRules: ChainEvent[] = [...CHAIN_RULES]
  private pendingChains: PendingChain[] = []
  private ecoCrises: EcoCrisis[] = []
  private recoveryZones: RecoveryZone[] = []
  private globalTemperature: number = 0
  private targetTemperature: number = 0
  private callbacks: DisasterChainCallbacks | null = null

  constructor() {}

  setCallbacks(cb: DisasterChainCallbacks): void { this.callbacks = cb }

  update(tick: number): void {
    this.processPendingChains(tick)
    this.updateTemperature()
    if (tick % ECO_INTERVAL === 0) this.checkEcologicalCrises(tick)
    if (tick % RECOVERY_INTERVAL === 0) this.processRecovery(tick)
    for (const c of this.ecoCrises) c.ticksActive++
  }

  onDisasterOccurred(type: string, x: number, y: number, magnitude: number, tick: number): void {
    magnitude = Math.max(1, Math.min(10, magnitude))
    for (const rule of this.chainRules) {
      if (rule.sourceType !== type) continue
      const prob = this.getChainProbability(type, rule.targetType, magnitude)
      if (Math.random() >= prob) continue
      if (rule.targetType === 'tsunami' && this.callbacks && !this.callbacks.isWaterNear(x, y, 15)) continue
      if (this.pendingChains.length >= MAX_PENDING) continue
      const chainMag = Math.max(1, Math.min(10, magnitude * rule.magnitudeMultiplier))
      const scatter = Math.floor(magnitude * 1.5)
      const cx = x + Math.floor((Math.random() - 0.5) * scatter * 2)
      const cy = y + Math.floor((Math.random() - 0.5) * scatter * 2)
      this.pendingChains.push({ type: rule.targetType, x: cx, y: cy, magnitude: chainMag, triggerTick: tick + rule.delay })
      EventLog.log('disaster', `${type} may trigger ${rule.targetType} near (${cx},${cy})`, tick)
    }
    if (type === 'volcano' || type === 'meteor') this.addRecoveryZone(x, y, Math.ceil(magnitude * 0.8), tick)
    if (type === 'volcano') this.targetTemperature += magnitude * 0.15
    else if (type === 'meteor' || type === 'cooling') this.targetTemperature -= magnitude * 0.3
    this.targetTemperature = Math.max(-5, Math.min(5, this.targetTemperature))
  }


  getChainProbability(sourceType: string, targetType: string, magnitude: number): number {
    const rule = this.chainRules.find(r => r.sourceType === sourceType && r.targetType === targetType)
    if (!rule) return 0
    const magBonus = (magnitude - 1) / 9 * 0.3
    return Math.min(0.95, rule.probability + magBonus)
  }

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
        EventLog.log('disaster', `Seismic activity triggered volcanic eruption at (${x},${y})!`, tick)
        this.onDisasterOccurred('volcano', x, y, magnitude, tick)
        break
    }
  }

  private checkEcologicalCrises(tick: number): void {
    if (!this.callbacks) return
    const cb = this.callbacks
    const forestTiles = cb.countForestTiles()
    const totalLand = cb.countTotalLand()
    const speciesCounts = cb.getSpeciesCounts()
    const warZones = cb.countWarZones()

    // Deforestation
    if (totalLand > 0) {
      const ratio = forestTiles / totalLand
      if (ratio < FOREST_THRESH) {
        this.upsertCrisis('deforestation', 1 - ratio / FOREST_THRESH, 100, 100, 50)
        this.targetTemperature += (1 - ratio / FOREST_THRESH) * 0.05
      } else this.fadeCrisis('deforestation')
    }
    // Species extinction risk
    for (const [species, count] of speciesCounts) {
      if (count > 0 && count < SPECIES_THRESH) {
        this.upsertCrisis('extinction', 1 - count / SPECIES_THRESH, 100, 100, 40)
        EventLog.log('disaster', `${species} endangered — only ${count} remaining`, tick)
        break
      }
    }
    // Pollution from war
    if (warZones >= WAR_THRESH) {
      const sev = Math.min(1, (warZones - WAR_THRESH + 1) / 5)
      this.upsertCrisis('pollution', sev, 100, 100, 60)
      this.targetTemperature += sev * 0.03
    } else this.fadeCrisis('pollution')
    // Climate shift
    if (Math.abs(this.globalTemperature) > CLIMATE_THRESH) {
      this.upsertCrisis('climate_shift', Math.min(1, (Math.abs(this.globalTemperature) - CLIMATE_THRESH) / 2.5), 100, 100, 80)
    } else this.fadeCrisis('climate_shift')
    // Natural recovery
    if (this.ecoCrises.length === 0) this.targetTemperature *= 0.98
    this.targetTemperature = Math.max(-5, Math.min(5, this.targetTemperature))
  }

  private upsertCrisis(type: EcoCrisis['type'], severity: number, cx: number, cy: number, radius: number): void {
    const existing = this.ecoCrises.find(c => c.type === type)
    if (existing) {
      existing.severity = Math.min(1, existing.severity * 0.8 + severity * 0.2)
      existing.ticksActive++
    } else if (this.ecoCrises.length < MAX_CRISES) {
      this.ecoCrises.push({ type, severity: Math.min(1, severity), affectedArea: { x: cx, y: cy, radius }, ticksActive: 0 })
    }
  }

  private fadeCrisis(type: EcoCrisis['type']): void {
    const idx = this.ecoCrises.findIndex(c => c.type === type)
    if (idx === -1) return
    this.ecoCrises[idx].severity -= 0.05
    if (this.ecoCrises[idx].severity <= 0) this.ecoCrises.splice(idx, 1)
  }

  private updateTemperature(): void {
    if (Math.abs(this.globalTemperature - this.targetTemperature) < 0.001) return
    this.globalTemperature += (this.targetTemperature - this.globalTemperature) * TEMP_DRIFT
    this.globalTemperature = Math.max(-5, Math.min(5, this.globalTemperature))
  }

  private addRecoveryZone(x: number, y: number, radius: number, tick: number): void {
    if (this.recoveryZones.length >= MAX_RECOVERY) return
    this.recoveryZones.push({ x, y, radius, stage: 0, nextStageTick: tick + 600 })
  }

  private processRecovery(tick: number): void {
    if (!this.callbacks) return
    for (let i = this.recoveryZones.length - 1; i >= 0; i--) {
      const zone = this.recoveryZones[i]
      if (tick < zone.nextStageTick) continue
      zone.stage++
      for (let dy = -zone.radius; dy <= zone.radius; dy++) {
        for (let dx = -zone.radius; dx <= zone.radius; dx++) {
          if (dx * dx + dy * dy > zone.radius * zone.radius) continue
          if (Math.random() > 0.3) continue
          this.callbacks.setTileAt(zone.x + dx, zone.y + dy, zone.stage)
        }
      }
      if (zone.stage >= 3) {
        this.recoveryZones.splice(i, 1)
        EventLog.log('disaster', `Terrain near (${zone.x},${zone.y}) has recovered`, tick)
      } else zone.nextStageTick = tick + 600
    }
  }
}
