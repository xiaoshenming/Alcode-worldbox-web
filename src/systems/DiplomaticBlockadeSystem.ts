// Diplomatic Blockade System (v2.58) - Naval/land blockades between civilizations
// Blockades cut off supply routes and starve enemy cities
// Can be broken by military force or diplomatic negotiation

import { Civilization } from '../civilization/Civilization'
import { EntityManager } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'

export type BlockadeType = 'naval' | 'land' | 'trade' | 'total'

export interface Blockade {
  id: number
  blockaderId: number   // civ imposing blockade
  targetId: number      // civ being blockaded
  type: BlockadeType
  strength: number      // 0-100
  supplyReduction: number // 0.0-1.0
  startedAt: number
  duration: number
}

const CHECK_INTERVAL = 1000
const MAX_BLOCKADES = 25
const BLOCKADE_CHANCE = 0.05

const TYPE_SUPPLY: Record<BlockadeType, number> = {
  naval: 0.3,
  land: 0.4,
  trade: 0.5,
  total: 0.85,
}

const TYPE_DURATION: Record<BlockadeType, [number, number]> = {
  naval: [2000, 6000],
  land: [3000, 7000],
  trade: [2500, 5500],
  total: [5000, 12000],
}

export class DiplomaticBlockadeSystem {
  private _civsBuf: Civilization[] = []
  private blockades: Blockade[] = []
  private nextId = 1
  private lastCheck = 0
  private totalImposed = 0
  private totalBroken = 0

  update(dt: number, em: EntityManager, civManager: CivManager, tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.evaluateBlockades(civManager, tick)
      this.expireBlockades(tick)
    }
  }

  private evaluateBlockades(civManager: CivManager, tick: number): void {
    if (this.blockades.length >= MAX_BLOCKADES) return
    const civs = this._civsBuf; civs.length = 0
    for (const civ of civManager.civilizations.values()) civs.push(civ)
    if (civs.length < 2) return

    for (const civ of civs) {
      if (Math.random() > BLOCKADE_CHANCE) continue
      // Pick a random target that is not the current civ
      if (civs.length < 2) continue
      let target: typeof civs[0]
      do {
        target = civs[Math.floor(Math.random() * civs.length)]
      } while (target.id === civ.id)
      if (this.blockades.some(b => b.blockaderId === civ.id && b.targetId === target.id)) continue

      const types: BlockadeType[] = ['naval', 'land', 'trade', 'total']
      const type = types[Math.floor(Math.random() * types.length)]
      const [minDur, maxDur] = TYPE_DURATION[type]

      this.blockades.push({
        id: this.nextId++,
        blockaderId: civ.id,
        targetId: target.id,
        type,
        strength: 30 + Math.floor(Math.random() * 70),
        supplyReduction: TYPE_SUPPLY[type],
        startedAt: tick,
        duration: minDur + Math.floor(Math.random() * (maxDur - minDur)),
      })
      this.totalImposed++
      if (this.blockades.length >= MAX_BLOCKADES) break
    }
  }

  private expireBlockades(tick: number): void {
    const expired: number[] = []
    for (let i = 0; i < this.blockades.length; i++) {
      const b = this.blockades[i]
      // Blockades weaken over time
      b.strength -= 0.5
      if (tick - b.startedAt > b.duration || b.strength <= 0) {
        expired.push(i)
        this.totalBroken++
      }
    }
    for (let i = expired.length - 1; i >= 0; i--) {
      this.blockades.splice(expired[i], 1)
    }
  }

  private _blockadesBuf: Blockade[] = []
  getBlockades(): Blockade[] { return this.blockades }
  getBlockadesAgainst(civId: number): Blockade[] {
    this._blockadesBuf.length = 0
    for (const b of this.blockades) { if (b.targetId === civId) this._blockadesBuf.push(b) }
    return this._blockadesBuf
  }
  getTotalImposed(): number { return this.totalImposed }
  getTotalBroken(): number { return this.totalBroken }
}
