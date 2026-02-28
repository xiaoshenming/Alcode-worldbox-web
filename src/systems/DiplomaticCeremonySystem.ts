// Diplomatic Ceremony System (v2.78) - Civilizations hold formal ceremonies
// Coronations, peace treaties, trade pacts, and victory celebrations affect diplomacy

import { CivManager } from '../civilization/CivManager'
import { Civilization } from '../civilization/Civilization'

export type CeremonyType = 'coronation' | 'peace_treaty' | 'trade_pact' | 'victory' | 'mourning' | 'festival'
const CEREMONY_TYPES: CeremonyType[] = ['coronation', 'peace_treaty', 'trade_pact', 'victory', 'mourning', 'festival']
export type CeremonyStatus = 'preparing' | 'active' | 'completed' | 'disrupted'

export interface Ceremony {
  id: number
  type: CeremonyType
  hostCivId: number
  guestCivIds: number[]
  status: CeremonyStatus
  prestige: number      // 0-100, affects outcome strength
  duration: number      // ticks remaining
  startTick: number
  locationX: number
  locationY: number
}

export interface CeremonyRecord {
  id: number
  type: CeremonyType
  hostCivId: number
  guestCivIds: number[]
  prestige: number
  tick: number
  success: boolean
}

const CHECK_INTERVAL = 1000
const MAX_CEREMONIES = 5
const INITIATE_CHANCE = 0.012
const CEREMONY_DURATION = 15
const DISRUPT_CHANCE = 0.03

const PRESTIGE_BY_TYPE: Record<CeremonyType, number> = {
  coronation: 80,
  peace_treaty: 60,
  trade_pact: 40,
  victory: 90,
  mourning: 30,
  festival: 50,
}

export class DiplomaticCeremonySystem {
  private _civsBuf: Civilization[] = []
  private ceremonies: Ceremony[] = []
  private history: CeremonyRecord[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, civManager: CivManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.initiateCeremonies(civManager, tick)
    this.updateCeremonies(civManager, tick)
  }

  private initiateCeremonies(civManager: CivManager, tick: number): void {
    if (this.ceremonies.length >= MAX_CEREMONIES) return
    if (Math.random() > INITIATE_CHANCE) return

    const civs = this._civsBuf; civs.length = 0
    for (const civ of civManager.civilizations.values()) civs.push(civ)
    if (civs.length < 1) return

    const host = civs[Math.floor(Math.random() * civs.length)]
    const type = this.pickType()

    // Select guests (other civs)
    const guests: number[] = []
    if (type !== 'coronation' && type !== 'mourning') {
      for (const civ of civs) {
        if (civ.id !== host.id && Math.random() < 0.4 && guests.length < 3) {
          guests.push(civ.id)
        }
      }
    }

    // Use first territory tile as ceremony location
    const territoryIter = host.territory.values().next()
    const territoryKey = territoryIter.value as string | undefined
    let lx = 100, ly = 100
    if (territoryKey) {
      const comma = territoryKey.indexOf(',')
      lx = +territoryKey.substring(0, comma)
      ly = +territoryKey.substring(comma + 1)
    }

    this.ceremonies.push({
      id: this.nextId++,
      type,
      hostCivId: host.id,
      guestCivIds: guests,
      status: 'preparing',
      prestige: PRESTIGE_BY_TYPE[type] * (0.7 + Math.random() * 0.3),
      duration: CEREMONY_DURATION,
      startTick: tick,
      locationX: lx,
      locationY: ly,
    })
  }

  private updateCeremonies(civManager: CivManager, tick: number): void {
    for (let i = this.ceremonies.length - 1; i >= 0; i--) {
      const c = this.ceremonies[i]

      if (c.status === 'preparing') {
        c.status = 'active'
        continue
      }

      if (c.status === 'active') {
        c.duration--

        // Random disruption
        if (Math.random() < DISRUPT_CHANCE) {
          c.status = 'disrupted'
          this.recordCeremony(c, tick, false)
          this.ceremonies.splice(i, 1)
          continue
        }

        if (c.duration <= 0) {
          c.status = 'completed'
          this.applyCeremonyEffects(c, civManager)
          this.recordCeremony(c, tick, true)
          this.ceremonies.splice(i, 1)
        }
      }
    }
  }

  private applyCeremonyEffects(_ceremony: Ceremony, _civManager: CivManager): void {
    // Effects are applied through prestige - higher prestige ceremonies
    // have stronger diplomatic impact (handled by diplomacy system integration)
  }

  private recordCeremony(c: Ceremony, tick: number, success: boolean): void {
    this.history.push({
      id: c.id,
      type: c.type,
      hostCivId: c.hostCivId,
      guestCivIds: [...c.guestCivIds],
      prestige: c.prestige,
      tick,
      success,
    })
    if (this.history.length > 40) this.history.splice(0, this.history.length - 40)
  }

  private pickType(): CeremonyType {
    const types = CEREMONY_TYPES
    return types[Math.floor(Math.random() * types.length)]
  }

  getCeremonies(): Ceremony[] { return this.ceremonies }
  getHistory(): CeremonyRecord[] { return this.history }
}
