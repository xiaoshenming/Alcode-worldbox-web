import { CivManager } from '../civilization/CivManager'
import { Civilization } from '../civilization/Civilization'
import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { EventLog } from './EventLog'

export type TreatyType = 'non_aggression' | 'trade_agreement' | 'military_alliance' | 'vassalage'

export interface Treaty {
  id: number
  type: TreatyType
  civA: number
  civB: number
  startTick: number
  duration: number      // -1 = permanent until broken
  strength: number      // 0-100, how strong the treaty is
  broken: boolean
}

export interface DiplomaticEvent {
  tick: number
  type: 'treaty_signed' | 'treaty_broken' | 'betrayal' | 'embassy_built' | 'gift_sent' | 'insult' | 'marriage'
  civA: number
  civB: number
  description: string
}

const TREATY_LABELS: Record<TreatyType, string> = {
  non_aggression: 'Non-Aggression Pact',
  trade_agreement: 'Trade Agreement',
  military_alliance: 'Military Alliance',
  vassalage: 'Vassalage',
}

const TREATY_RELATION_TICK: Record<TreatyType, number> = {
  non_aggression: 0.5,
  trade_agreement: 1,
  military_alliance: 2,
  vassalage: 0.3,
}

let nextTreatyId = 1

export class DiplomacySystem {
  private treaties: Treaty[] = []
  private events: DiplomaticEvent[] = []
  private maxEvents = 50
  private _civsBuf: Civilization[] = []
  // Reusable buffer for getActiveTreatiesBetween to avoid new array per call
  private _treatyBuf: Treaty[] = []

  update(civManager: CivManager, world: World, em: EntityManager): void {
    const tick = world.tick
    const civs = this._civsBuf
    civs.length = 0
    for (const c of civManager.civilizations.values()) civs.push(c)

    // Update existing treaties
    this.updateTreaties(civManager, tick)

    // Embassy relation maintenance
    this.updateEmbassies(civManager)

    // Process civ pairs for new diplomatic actions
    for (let i = 0; i < civs.length; i++) {
      for (let j = i + 1; j < civs.length; j++) {
        const a = civs[i]
        const b = civs[j]
        const relation = a.relations.get(b.id) ?? 0

        // Treaty formation
        this.tryFormTreaty(a, b, relation, tick)

        // Betrayal: break treaties when relations drop
        if (relation < -60) {
          this.tryBetrayal(a, b, tick, civManager)
        }

        // Random diplomatic events
        this.tryRandomEvent(a, b, tick)

        // Embassy construction
        this.tryBuildEmbassy(a, b, relation, civManager, world)
        this.tryBuildEmbassy(b, a, relation, civManager, world)
      }
    }
  }

  private updateTreaties(civManager: CivManager, tick: number): void {
    for (const treaty of this.treaties) {
      if (treaty.broken) continue

      // Check duration expiry
      if (treaty.duration > 0 && tick - treaty.startTick > treaty.duration) {
        treaty.broken = true
        this.removeTreatyFromCivs(treaty, civManager)
        this.addEvent(tick, 'treaty_broken', treaty.civA, treaty.civB,
          `${this.getCivName(treaty.civA, civManager)} and ${this.getCivName(treaty.civB, civManager)}'s ${TREATY_LABELS[treaty.type]} expired`)
        continue
      }

      // Active treaties improve relations each tick
      const bonus = TREATY_RELATION_TICK[treaty.type]
      const civA = civManager.civilizations.get(treaty.civA)
      const civB = civManager.civilizations.get(treaty.civB)
      if (civA && civB) {
        const relA = civA.relations.get(civB.id) ?? 0
        const relB = civB.relations.get(civA.id) ?? 0
        civA.relations.set(civB.id, Math.min(100, relA + bonus * 0.01))
        civB.relations.set(civA.id, Math.min(100, relB + bonus * 0.01))
      }

      // Strength slowly decays
      treaty.strength = Math.max(0, treaty.strength - 0.002)
      if (treaty.strength <= 0) {
        treaty.broken = true
        this.removeTreatyFromCivs(treaty, civManager)
      }
    }
  }

  private tryFormTreaty(a: Civilization, b: Civilization, relation: number, tick: number): void {
    // Already have a treaty of this type?
    const existing = this.getActiveTreatiesBetween(a.id, b.id)

    if (relation > 30 && Math.random() < 0.001 && !existing.some(t => t.type === 'non_aggression')) {
      this.signTreaty('non_aggression', a, b, tick, -1, 60)
    }

    if (relation > 50 && Math.random() < 0.0008 && !existing.some(t => t.type === 'trade_agreement')) {
      this.signTreaty('trade_agreement', a, b, tick, -1, 70)
    }

    if (relation > 70 && Math.random() < 0.0005 && !existing.some(t => t.type === 'military_alliance')) {
      this.signTreaty('military_alliance', a, b, tick, -1, 80)
    }
  }

  private signTreaty(type: TreatyType, a: Civilization, b: Civilization, tick: number, duration: number, strength: number): void {
    const treaty: Treaty = {
      id: nextTreatyId++,
      type,
      civA: a.id,
      civB: b.id,
      startTick: tick,
      duration,
      strength,
      broken: false,
    }
    this.treaties.push(treaty)
    a.treaties.push(treaty.id)
    b.treaties.push(treaty.id)

    const desc = `${a.name} and ${b.name} signed a ${TREATY_LABELS[type]}`
    this.addEvent(tick, 'treaty_signed', a.id, b.id, desc)
    EventLog.log('peace', desc, tick)
  }

  private tryBetrayal(a: Civilization, b: Civilization, tick: number, civManager: CivManager): void {
    const active = this.getActiveTreatiesBetween(a.id, b.id)
    if (active.length === 0) return
    if (Math.random() > 0.002) return

    // Break all treaties between them
    for (const treaty of active) {
      treaty.broken = true
      this.removeTreatyFromCivs(treaty, civManager)
    }

    // Betrayal penalty: -30 relation
    const relA = a.relations.get(b.id) ?? 0
    const relB = b.relations.get(a.id) ?? 0
    a.relations.set(b.id, Math.max(-100, relA - 30))
    b.relations.set(a.id, Math.max(-100, relB - 30))

    const desc = `${a.name} betrayed ${b.name}! All treaties broken`
    this.addEvent(tick, 'betrayal', a.id, b.id, desc)
    EventLog.log('war', desc, tick)

    // Chain reaction: allies of the betrayed also lose relation with betrayer
    for (const [otherId, otherCiv] of civManager.civilizations) {
      if (otherId === a.id || otherId === b.id) continue
      const allyTreaties = this.getActiveTreatiesBetween(b.id, otherId)
      if (allyTreaties.some(t => t.type === 'military_alliance')) {
        const rel = otherCiv.relations.get(a.id) ?? 0
        otherCiv.relations.set(a.id, Math.max(-100, rel - 15))
      }
    }
  }

  private tryRandomEvent(a: Civilization, b: Civilization, tick: number): void {
    const roll = Math.random()

    // Gift: +5 relation
    if (roll < 0.0003 && a.resources.gold > 10) {
      a.resources.gold -= 5
      b.resources.gold += 5
      const relA = a.relations.get(b.id) ?? 0
      const relB = b.relations.get(a.id) ?? 0
      a.relations.set(b.id, Math.min(100, relA + 5))
      b.relations.set(a.id, Math.min(100, relB + 5))
      const desc = `${a.name} sent a gift to ${b.name}`
      this.addEvent(tick, 'gift_sent', a.id, b.id, desc)
      EventLog.log('trade', desc, tick)
      return
    }

    // Insult: -10 relation
    if (roll > 0.9997) {
      const relA = a.relations.get(b.id) ?? 0
      const relB = b.relations.get(a.id) ?? 0
      a.relations.set(b.id, Math.max(-100, relA - 10))
      b.relations.set(a.id, Math.max(-100, relB - 10))
      const desc = `${a.name} insulted ${b.name}`
      this.addEvent(tick, 'insult', a.id, b.id, desc)
      EventLog.log('war', desc, tick)
      return
    }

    // Marriage: +20 relation (rare, requires positive relations)
    if (roll > 0.99965 && roll < 0.9997) {
      const rel = a.relations.get(b.id) ?? 0
      if (rel > 10 && a.population > 3 && b.population > 3) {
        a.relations.set(b.id, Math.min(100, rel + 20))
        b.relations.set(a.id, Math.min(100, (b.relations.get(a.id) ?? 0) + 20))
        const desc = `Royal marriage between ${a.name} and ${b.name}!`
        this.addEvent(tick, 'marriage', a.id, b.id, desc)
        EventLog.log('peace', desc, tick)
      }
    }
  }

  private tryBuildEmbassy(builder: Civilization, host: Civilization, relation: number, civManager: CivManager, world: World): void {
    if (builder.techLevel < 3) return
    if (relation < 30) return
    if (Math.random() > 0.0002) return

    // Already has embassy with this civ?
    if (builder.embassies.some(e => e.civId === host.id)) return

    // Find a tile in host territory to place embassy
    const hostTerritory = Array.from(host.territory)
    if (hostTerritory.length === 0) return

    const key = hostTerritory[Math.floor(Math.random() * hostTerritory.length)]
    const [x, y] = key.split(',').map(Number)

    builder.embassies.push({ civId: host.id, x, y })

    const desc = `${builder.name} built an embassy in ${host.name}`
    this.addEvent(world.tick, 'embassy_built', builder.id, host.id, desc)
    EventLog.log('building', desc, world.tick)
  }

  private updateEmbassies(civManager: CivManager): void {
    for (const [, civ] of civManager.civilizations) {
      for (const embassy of civ.embassies) {
        const host = civManager.civilizations.get(embassy.civId)
        if (!host) continue

        // Embassy provides slow relation maintenance
        const rel = civ.relations.get(host.id) ?? 0
        civ.relations.set(host.id, Math.min(100, rel + 0.01))
        const hostRel = host.relations.get(civ.id) ?? 0
        host.relations.set(civ.id, Math.min(100, hostRel + 0.005))
      }

      // Clean up embassies for dead civs
      for (let i = civ.embassies.length - 1; i >= 0; i--) {
        if (!civManager.civilizations.has(civ.embassies[i].civId)) {
          civ.embassies.splice(i, 1)
        }
      }
    }
  }

  private getActiveTreatiesBetween(civA: number, civB: number): Treaty[] {
    const buf = this._treatyBuf
    buf.length = 0
    for (const t of this.treaties) {
      if (!t.broken && ((t.civA === civA && t.civB === civB) || (t.civA === civB && t.civB === civA))) {
        buf.push(t)
      }
    }
    return buf
  }

  private removeTreatyFromCivs(treaty: Treaty, civManager: CivManager): void {
    const a = civManager.civilizations.get(treaty.civA)
    const b = civManager.civilizations.get(treaty.civB)
    if (a) {
      const idx = a.treaties.indexOf(treaty.id)
      if (idx >= 0) a.treaties.splice(idx, 1)
    }
    if (b) {
      const idx = b.treaties.indexOf(treaty.id)
      if (idx >= 0) b.treaties.splice(idx, 1)
    }
  }

  private getCivName(civId: number, civManager: CivManager): string {
    return civManager.civilizations.get(civId)?.name ?? `Civ#${civId}`
  }

  private addEvent(tick: number, type: DiplomaticEvent['type'], civA: number, civB: number, description: string): void {
    this.events.push({ tick, type, civA, civB, description })
    if (this.events.length > this.maxEvents) {
      this.events.shift()
    }
  }

  getTreaties(): Treaty[] {
    return this.treaties.filter(t => !t.broken)
  }

  getEvents(count: number = 20): DiplomaticEvent[] {
    return this.events.slice(-count)
  }
}
