// Diplomatic Garble System (v3.727) - Garbler governance
// Officers inspecting spices and ensuring purity of goods between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type GarblerForm = 'royal_garbler' | 'guild_garbler' | 'market_garbler' | 'port_garbler'

export interface GarblerArrangement {
  id: number
  spiceCivId: number
  inspectionCivId: number
  form: GarblerForm
  spiceInspection: number
  purityStandards: number
  adulterationDetection: number
  tradeCompliance: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 3060
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: GarblerForm[] = ['royal_garbler', 'guild_garbler', 'market_garbler', 'port_garbler']

export class DiplomaticGarbleSystem {
  private arrangements: GarblerArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const spice = 1 + Math.floor(Math.random() * 8)
      const inspection = 1 + Math.floor(Math.random() * 8)
      if (spice === inspection) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        spiceCivId: spice,
        inspectionCivId: inspection,
        form,
        spiceInspection: 20 + Math.random() * 40,
        purityStandards: 25 + Math.random() * 35,
        adulterationDetection: 10 + Math.random() * 30,
        tradeCompliance: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.spiceInspection = Math.max(5, Math.min(85, a.spiceInspection + (Math.random() - 0.48) * 0.12))
      a.purityStandards = Math.max(10, Math.min(90, a.purityStandards + (Math.random() - 0.5) * 0.11))
      a.adulterationDetection = Math.max(5, Math.min(80, a.adulterationDetection + (Math.random() - 0.42) * 0.13))
      a.tradeCompliance = Math.max(5, Math.min(65, a.tradeCompliance + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): GarblerArrangement[] { return this.arrangements }
}
