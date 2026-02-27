// World Fungal Network System (v3.182) - Underground mycelium connecting trees
// Forests develop fungal networks that share nutrients between trees

import { EntityManager } from '../ecs/Entity'
import { World } from '../game/World'
import { TileType } from '../utils/Constants'

export type MyceliumType = 'saprophytic' | 'mycorrhizal' | 'parasitic' | 'endophytic'

export interface FungalNetwork {
  id: number
  x: number
  y: number
  nodeCount: number
  connectivity: number
  nutrientFlow: number
  age: number
  myceliumType: MyceliumType
  tick: number
}

const CHECK_INTERVAL = 2800
const SPAWN_CHANCE = 0.004
const MAX_NETWORKS = 30

const MYCELIUM_TYPES: MyceliumType[] = ['saprophytic', 'mycorrhizal', 'parasitic', 'endophytic']
const FLOW_RATE: Record<MyceliumType, number> = {
  saprophytic: 0.5, mycorrhizal: 1.2, parasitic: 0.8, endophytic: 1.0,
}

export class WorldFungalNetworkSystem {
  private networks: FungalNetwork[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const w = world.width
    const h = world.height

    // Spawn networks in forest tiles
    if (this.networks.length < MAX_NETWORKS && Math.random() < SPAWN_CHANCE) {
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      if (tile === TileType.FOREST) {
        if (!this.networks.some(n => n.x === x && n.y === y)) {
          const mtype = MYCELIUM_TYPES[Math.floor(Math.random() * MYCELIUM_TYPES.length)]
          this.networks.push({
            id: this.nextId++, x, y,
            nodeCount: 2 + Math.floor(Math.random() * 4),
            connectivity: 10 + Math.random() * 30,
            nutrientFlow: FLOW_RATE[mtype],
            age: 0, myceliumType: mtype, tick,
          })
        }
      }
    }

    // Update networks
    for (const net of this.networks) {
      net.age += CHECK_INTERVAL

      // Grow nodes
      if (net.connectivity > 30 && Math.random() < 0.02) {
        net.nodeCount = Math.min(50, net.nodeCount + 1)
      }

      // Connectivity improves with age
      net.connectivity = Math.min(100, net.connectivity + 0.05)

      // Nutrient flow scales with nodes and connectivity
      net.nutrientFlow = FLOW_RATE[net.myceliumType] * (net.connectivity / 100) * (net.nodeCount / 10)

      // Parasitic networks decay faster
      if (net.myceliumType === 'parasitic' && Math.random() < 0.01) {
        net.connectivity = Math.max(0, net.connectivity - 2)
      }
    }

    // Remove dead networks
    for (let _i = this.networks.length - 1; _i >= 0; _i--) { if (!((n) => n.connectivity > 1 && n.nodeCount > 0)(this.networks[_i])) this.networks.splice(_i, 1) }
  }

  getNetworks(): readonly FungalNetwork[] { return this.networks }
}
