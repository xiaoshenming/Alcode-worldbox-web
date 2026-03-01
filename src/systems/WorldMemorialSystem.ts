// World Memorial System (v3.00) - Memorials mark significant world events
// Battle sites, disaster zones, and legendary locations become permanent landmarks

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type MemorialType = 'battle' | 'disaster' | 'founding' | 'miracle' | 'tragedy' | 'victory'

export interface Memorial {
  id: number
  type: MemorialType
  x: number
  y: number
  name: string
  significance: number  // 0-100
  age: number
  tick: number
}

const CHECK_INTERVAL = 2000
const MEMORIAL_CHANCE = 0.008
const MAX_MEMORIALS = 50

const MEMORIAL_NAMES: Record<MemorialType, string[]> = {
  battle: ['Field of Valor', 'Crimson Plains', 'Last Stand Hill'],
  disaster: ['Scorched Hollow', 'Drowned Valley', 'Shattered Peak'],
  founding: ['First Settlement', 'Dawn Stone', 'Origin Spring'],
  miracle: ['Blessed Grove', 'Light Pillar', 'Healing Waters'],
  tragedy: ['Weeping Stone', 'Lost Souls Crossing', 'Silent Ruins'],
  victory: ['Triumph Arch', 'Glory Summit', 'Champions Rest'],
}

const MEMORIAL_WEIGHTS: Record<MemorialType, number> = {
  battle: 0.25,
  disaster: 0.2,
  founding: 0.15,
  miracle: 0.1,
  tragedy: 0.15,
  victory: 0.15,
}

const MEMORIAL_TYPES = Object.keys(MEMORIAL_WEIGHTS) as MemorialType[]

export class WorldMemorialSystem {
  private memorials: Memorial[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.generateMemorials(world, tick)
    this.ageMemorials()
    this.pruneOld()
  }

  private generateMemorials(world: World, tick: number): void {
    if (this.memorials.length >= MAX_MEMORIALS) return
    if (Math.random() > MEMORIAL_CHANCE) return

    const type = this.pickType()
    const names = MEMORIAL_NAMES[type]
    const name = names[Math.floor(Math.random() * names.length)]

    const x = Math.floor(Math.random() * world.width)
    const y = Math.floor(Math.random() * world.height)

    this.memorials.push({
      id: this.nextId++,
      type,
      x, y,
      name,
      significance: 30 + Math.random() * 70,
      age: 0,
      tick,
    })
  }

  private pickType(): MemorialType {
    const r = Math.random()
    let cum = 0
    for (const t of MEMORIAL_TYPES) {
      cum += MEMORIAL_WEIGHTS[t]
      if (r <= cum) return t
    }
    return 'battle'
  }

  private ageMemorials(): void {
    for (const m of this.memorials) {
      m.age++
      // Significance fades very slowly
      m.significance *= 0.9998
    }
  }

  private pruneOld(): void {
    if (this.memorials.length > MAX_MEMORIALS) {
      // Remove least significant
      this.memorials.sort((a, b) => b.significance - a.significance)
      this.memorials.length = MAX_MEMORIALS
    }
  }

  private _byTypeBuf: Memorial[] = []
  getByType(type: MemorialType): Memorial[] {
    this._byTypeBuf.length = 0
    for (const m of this.memorials) { if (m.type === type) this._byTypeBuf.push(m) }
    return this._byTypeBuf
  }
}
