// Creature Coiner Mint System (v3.743) - Coin minting artisans
// Specialized minters who strike coins with precise dies and controlled force

import { EntityManager } from '../ecs/Entity'

export interface CoinerMint {
  id: number
  entityId: number
  mintingSkill: number
  dieAlignment: number
  strikeForce: number
  coinQuality: number
  tick: number
}

const CHECK_INTERVAL = 3288
const RECRUIT_CHANCE = 0.0015
const MAX_COINER_MINTS = 10

export class CreatureCoinerMintSystem {
  private coinerMints: CoinerMint[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.coinerMints.length < MAX_COINER_MINTS && Math.random() < RECRUIT_CHANCE) {
      this.coinerMints.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        mintingSkill: 10 + Math.random() * 25,
        dieAlignment: 15 + Math.random() * 20,
        strikeForce: 5 + Math.random() * 20,
        coinQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const c of this.coinerMints) {
      c.mintingSkill = Math.min(100, c.mintingSkill + 0.02)
      c.dieAlignment = Math.min(100, c.dieAlignment + 0.015)
      c.coinQuality = Math.min(100, c.coinQuality + 0.01)
    }

    for (let _i = this.coinerMints.length - 1; _i >= 0; _i--) { if (this.coinerMints[_i].mintingSkill <= 4) this.coinerMints.splice(_i, 1) }
  }

  getCoinerMints(): CoinerMint[] { return this.coinerMints }
}
