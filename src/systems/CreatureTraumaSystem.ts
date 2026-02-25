// Creature Trauma System (v2.76) - Creatures develop psychological trauma from events
// Combat, disasters, and loss cause lasting behavioral changes like avoidance and aggression

import { EntityManager, PositionComponent, CreatureComponent } from '../ecs/Entity'

export type TraumaSource = 'combat' | 'disaster' | 'loss' | 'starvation' | 'exile' | 'betrayal'
export type TraumaEffect = 'avoidance' | 'aggression' | 'withdrawal' | 'hypervigilance' | 'numbness'

export interface Trauma {
  id: number
  creatureId: number
  source: TraumaSource
  effect: TraumaEffect
  severity: number      // 0-100
  locationX: number
  locationY: number
  formedTick: number
  healingRate: number   // how fast it fades
}

const CHECK_INTERVAL = 750
const MAX_TRAUMAS = 50
const FORM_CHANCE = 0.014
const HEAL_BASE = 0.15
const PROXIMITY_TRIGGER = 5
const SEVERITY_THRESHOLD = 10

const EFFECT_BY_SOURCE: Record<TraumaSource, TraumaEffect[]> = {
  combat: ['aggression', 'hypervigilance', 'avoidance'],
  disaster: ['avoidance', 'hypervigilance', 'numbness'],
  loss: ['withdrawal', 'numbness', 'aggression'],
  starvation: ['hypervigilance', 'aggression', 'withdrawal'],
  exile: ['withdrawal', 'numbness', 'avoidance'],
  betrayal: ['hypervigilance', 'aggression', 'withdrawal'],
}

export class CreatureTraumaSystem {
  private traumas: Trauma[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.formTraumas(em, tick)
    this.healTraumas()
    this.applyEffects(em)
  }

  private formTraumas(em: EntityManager, tick: number): void {
    if (this.traumas.length >= MAX_TRAUMAS) return
    const entities = em.getEntitiesWithComponents('position', 'creature')

    for (const id of entities) {
      if (Math.random() > FORM_CHANCE) continue

      const creature = em.getComponent<CreatureComponent>(id, 'creature')
      if (!creature) continue

      // Limit per creature
      const existing = this.traumas.filter(t => t.creatureId === id)
      if (existing.length >= 3) continue

      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (!pos) continue

      const source = this.pickSource(creature)
      const effects = EFFECT_BY_SOURCE[source]
      const effect = effects[Math.floor(Math.random() * effects.length)]

      this.traumas.push({
        id: this.nextId++,
        creatureId: id,
        source,
        effect,
        severity: 25 + Math.random() * 55,
        locationX: pos.x,
        locationY: pos.y,
        formedTick: tick,
        healingRate: HEAL_BASE + Math.random() * 0.2,
      })
    }
  }

  private healTraumas(): void {
    for (let i = this.traumas.length - 1; i >= 0; i--) {
      const t = this.traumas[i]
      t.severity -= t.healingRate
      if (t.severity < SEVERITY_THRESHOLD) {
        this.traumas.splice(i, 1)
      }
    }
  }

  private applyEffects(em: EntityManager): void {
    for (const trauma of this.traumas) {
      if (trauma.severity < 30) continue

      const pos = em.getComponent<PositionComponent>(trauma.creatureId, 'position')
      if (!pos) continue

      // Near trauma location triggers stronger effect
      const dx = pos.x - trauma.locationX
      const dy = pos.y - trauma.locationY
      const nearSite = dx * dx + dy * dy < PROXIMITY_TRIGGER * PROXIMITY_TRIGGER

      if (nearSite && trauma.effect === 'avoidance') {
        // Push away from trauma site
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > 0.5) {
          pos.x += (dx / dist) * 0.2
          pos.y += (dy / dist) * 0.2
        }
      }
    }
  }

  private pickSource(_creature: CreatureComponent): TraumaSource {
    const sources: TraumaSource[] = ['combat', 'disaster', 'loss', 'starvation', 'exile', 'betrayal']
    return sources[Math.floor(Math.random() * sources.length)]
  }

  getTraumas(): Trauma[] { return this.traumas }
  getCreatureTraumas(creatureId: number): Trauma[] {
    return this.traumas.filter(t => t.creatureId === creatureId)
  }
}
