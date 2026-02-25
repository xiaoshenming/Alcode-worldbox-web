// Diplomatic Tribute System (v3.13) - Weaker civilizations pay tribute to stronger ones
// Tribute improves relations; refusal may trigger war

import { EntityManager } from '../ecs/Entity'

export type TributeResource = 'food' | 'wood' | 'stone' | 'gold' | 'gem'

export interface Tribute {
  id: number
  vassalCivId: string
  overlordCivId: string
  amount: number
  resource: TributeResource
  duration: number
  tick: number
}

const CHECK_INTERVAL = 800
const TRIBUTE_CHANCE = 0.015
const MAX_TRIBUTES = 50

const RESOURCES: TributeResource[] = ['food', 'wood', 'stone', 'gold', 'gem']
const CIVS = ['human', 'elf', 'dwarf', 'orc']

export class DiplomaticTributeSystem {
  private tributes: Tribute[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.formTributes(tick)
    this.ageTributes()
    this.pruneExpired()
  }

  private formTributes(tick: number): void {
    if (this.tributes.length >= MAX_TRIBUTES) return
    if (Math.random() > TRIBUTE_CHANCE) return

    const vassal = CIVS[Math.floor(Math.random() * CIVS.length)]
    let overlord = CIVS[Math.floor(Math.random() * CIVS.length)]
    while (overlord === vassal) {
      overlord = CIVS[Math.floor(Math.random() * CIVS.length)]
    }

    const resource = RESOURCES[Math.floor(Math.random() * RESOURCES.length)]

    this.tributes.push({
      id: this.nextId++,
      vassalCivId: vassal,
      overlordCivId: overlord,
      amount: 10 + Math.floor(Math.random() * 90),
      resource,
      duration: 0,
      tick,
    })
  }

  private ageTributes(): void {
    for (const t of this.tributes) {
      t.duration++
      // Tribute amount decays as vassal resists over time
      t.amount = Math.max(0, t.amount - Math.random() * 0.5)
    }
  }

  private pruneExpired(): void {
    // Remove tributes that have been depleted or very old
    this.tributes = this.tributes.filter(t =>
      t.amount > 0 && t.duration < 5000
    )
    if (this.tributes.length > MAX_TRIBUTES) {
      this.tributes.splice(0, this.tributes.length - MAX_TRIBUTES)
    }
  }

  getTributes(): Tribute[] { return this.tributes }
  getActiveTributes(): Tribute[] {
    return this.tributes.filter(t => t.amount > 0)
  }
}
