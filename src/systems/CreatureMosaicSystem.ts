// Creature Mosaic System (v3.114) - Decorative mosaic art creation
// Artisans create mosaics that beautify buildings and boost culture

import { EntityManager, EntityId } from '../ecs/Entity'

export type MosaicStyle = 'geometric' | 'figurative' | 'abstract' | 'narrative'
export type MosaicMaterial = 'stone' | 'glass' | 'ceramic' | 'gem'

export interface Mosaic {
  id: number
  artistId: EntityId
  style: MosaicStyle
  material: MosaicMaterial
  beauty: number
  size: number
  completeness: number
  tick: number
}

const CHECK_INTERVAL = 3000
const CREATE_CHANCE = 0.004
const MAX_MOSAICS = 30

const STYLES: MosaicStyle[] = ['geometric', 'figurative', 'abstract', 'narrative']
const MATERIALS: MosaicMaterial[] = ['stone', 'glass', 'ceramic', 'gem']
const MATERIAL_BEAUTY: Record<MosaicMaterial, number> = {
  stone: 10, glass: 25, ceramic: 20, gem: 40,
}

export class CreatureMosaicSystem {
  private mosaics: Mosaic[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Start new mosaics
    if (this.mosaics.length < MAX_MOSAICS && Math.random() < CREATE_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        const material = MATERIALS[Math.floor(Math.random() * MATERIALS.length)]
        this.mosaics.push({
          id: this.nextId++,
          artistId: eid,
          style: STYLES[Math.floor(Math.random() * STYLES.length)],
          material,
          beauty: MATERIAL_BEAUTY[material] + Math.floor(Math.random() * 40),
          size: 1 + Math.floor(Math.random() * 5),
          completeness: 0,
          tick,
        })
      }
    }

    // Progress mosaics
    for (const m of this.mosaics) {
      if (m.completeness < 100) {
        m.completeness = Math.min(100, m.completeness + 0.5 / m.size)
      }
    }

    // Remove old completed mosaics
    const cutoff = tick - 180000
    for (let i = this.mosaics.length - 1; i >= 0; i--) {
      if (this.mosaics[i].completeness >= 100 && this.mosaics[i].tick < cutoff) {
        this.mosaics.splice(i, 1)
      }
    }
  }

  getMosaics(): readonly Mosaic[] { return this.mosaics }
}
