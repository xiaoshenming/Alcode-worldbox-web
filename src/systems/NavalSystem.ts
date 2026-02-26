import { EntityManager, EntityId, PositionComponent, RenderComponent, ShipComponent } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'
import { BuildingComponent, BuildingType, CivMemberComponent } from '../civilization/Civilization'
import { ParticleSystem } from './ParticleSystem'
import { EventLog } from './EventLog'
import { TileType, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'
import { World } from '../game/World'

// Ship type configurations
const SHIP_CONFIGS: Record<ShipComponent['shipType'], {
  health: number; speed: number; damage: number;
  crew: number; cargoCapacity: number; color: string
}> = {
  warship:  { health: 120, speed: 1.0, damage: 15, crew: 50, cargoCapacity: 20, color: '#aa3333' },
  trader:   { health: 60,  speed: 1.0, damage: 0,  crew: 15, cargoCapacity: 100, color: '#33aa66' },
  explorer: { health: 50,  speed: 1.5, damage: 5,  crew: 20, cargoCapacity: 30, color: '#3366aa' },
  fishing:  { health: 40,  speed: 0.5, damage: 0,  crew: 8,  cargoCapacity: 40, color: '#6699aa' },
}

// Max ships allowed per port building
const MAX_SHIPS_PER_PORT = 3

// How often (in ticks) various sub-updates run
const SPAWN_INTERVAL = 120
const TRADE_INTERVAL = 60
const EXPLORE_INTERVAL = 40
const FISH_INTERVAL = 10
const BLOCKADE_INTERVAL = 80

export class NavalSystem {
  // Track how many ships each port has spawned: portEntityId -> count
  private portShipCount: Map<EntityId, number> = new Map()
  // Reusable spatial hash to avoid GC pressure
  private _combatGrid: Map<string, EntityId[]> = new Map()

  update(em: EntityManager, world: World, civManager: CivManager, particles: ParticleSystem, tick: number): void {
    // Spawn ships from ports
    if (tick % SPAWN_INTERVAL === 0) {
      this.spawnShips(em, world, civManager, tick)
    }

    // Move all ships
    this.moveShips(em, world, tick)

    // Naval combat
    this.updateCombat(em, civManager, particles, tick)

    // Trade ships generate gold
    if (tick % TRADE_INTERVAL === 0) {
      this.updateTraders(em, civManager, tick)
    }

    // Explorer ships reveal and find treasure
    if (tick % EXPLORE_INTERVAL === 0) {
      this.updateExplorers(em, civManager, particles, tick)
    }

    // Fishing boats generate food
    if (tick % FISH_INTERVAL === 0) {
      this.updateFishing(em, civManager)
    }

    // Blockade enemy ports
    if (tick % BLOCKADE_INTERVAL === 0) {
      this.updateBlockades(em, civManager, tick)
    }

    // Clean up sunk ships
    this.cleanupSunk(em, particles)
  }

  // ── Spawning ──────────────────────────────────────────────────────────

  private spawnShips(em: EntityManager, world: World, civManager: CivManager, tick: number): void {
    const ports = em.getEntitiesWithComponent('building')

    for (const portId of ports) {
      const b = em.getComponent<BuildingComponent>(portId, 'building')
      if (!b || b.buildingType !== BuildingType.PORT) continue

      const pos = em.getComponent<PositionComponent>(portId, 'position')
      if (!pos) continue

      const civ = civManager.civilizations.get(b.civId)
      if (!civ) continue

      // Count existing ships for this port
      const count = this.portShipCount.get(portId) ?? 0
      if (count >= MAX_SHIPS_PER_PORT) continue

      // Need resources to build a ship
      if (civ.resources.wood < 15) continue

      // Find a water tile adjacent to the port for spawning
      const spawnPos = this.findAdjacentWater(world, pos.x, pos.y)
      if (!spawnPos) continue

      // Decide ship type based on civ needs and randomness
      const shipType = this.chooseShipType(civ, civManager)

      civ.resources.wood -= 15
      const cfg = SHIP_CONFIGS[shipType]

      const shipId = em.createEntity()
      em.addComponent<PositionComponent>(shipId, { type: 'position', x: spawnPos.x, y: spawnPos.y })
      em.addComponent<RenderComponent>(shipId, { type: 'render', color: cfg.color, size: 3 })
      em.addComponent<ShipComponent>(shipId, {
        type: 'ship',
        shipType,
        civId: b.civId,
        health: cfg.health,
        maxHealth: cfg.health,
        speed: cfg.speed,
        damage: cfg.damage,
        cargo: { food: 0, gold: 0, wood: 0 },
        crew: cfg.crew,
        maxCrew: cfg.crew,
        targetX: spawnPos.x,
        targetY: spawnPos.y,
        state: 'idle',
      })

      this.portShipCount.set(portId, count + 1)
      EventLog.log('building', `${civ.name} launched a ${shipType}`, tick)
    }
  }

  private findAdjacentWater(world: World, x: number, y: number): { x: number; y: number } | null {
    const offsets = [
      [0, -1], [0, 1], [-1, 0], [1, 0],
      [-1, -1], [1, -1], [-1, 1], [1, 1],
      [0, -2], [0, 2], [-2, 0], [2, 0],
    ]
    for (const [dx, dy] of offsets) {
      const nx = Math.floor(x) + dx
      const ny = Math.floor(y) + dy
      if (nx < 0 || nx >= WORLD_WIDTH || ny < 0 || ny >= WORLD_HEIGHT) continue
      const tile = world.getTile(nx, ny)
      if (tile === TileType.DEEP_WATER || tile === TileType.SHALLOW_WATER) {
        return { x: nx, y: ny }
      }
    }
    return null
  }

  private chooseShipType(civ: { relations: Map<number, number> }, civManager: CivManager): ShipComponent['shipType'] {
    const atWar = this.civIsAtWar(civ, civManager)
    const roll = Math.random()

    if (atWar) {
      // Prioritize warships during war
      if (roll < 0.5) return 'warship'
      if (roll < 0.7) return 'fishing'
      if (roll < 0.9) return 'trader'
      return 'explorer'
    }

    // Peacetime distribution
    if (roll < 0.15) return 'warship'
    if (roll < 0.40) return 'trader'
    if (roll < 0.60) return 'explorer'
    return 'fishing'
  }

  private civIsAtWar(civ: { relations: Map<number, number> }, civManager: CivManager): boolean {
    for (const [, rel] of civ.relations) {
      if (rel <= -50) return true
    }
    return false
  }

  // ── Movement ──────────────────────────────────────────────────────────

  private moveShips(em: EntityManager, world: World, tick: number): void {
    const ships = em.getEntitiesWithComponents('ship', 'position')

    for (const id of ships) {
      const ship = em.getComponent<ShipComponent>(id, 'ship')
      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (!ship || !pos) continue

      // Assign a new random target if idle or reached destination
      const dx = ship.targetX - pos.x
      const dy = ship.targetY - pos.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (ship.state === 'idle' || dist < 1) {
        this.assignNewTarget(ship, pos, world)
        ship.state = 'sailing'
      }

      if (ship.state === 'combat') continue // Don't move during combat

      // Move toward target, respecting water-only constraint
      const tdx = ship.targetX - pos.x
      const tdy = ship.targetY - pos.y
      const tdist = Math.sqrt(tdx * tdx + tdy * tdy)
      if (tdist < 0.1) continue

      const nx = pos.x + (tdx / tdist) * ship.speed
      const ny = pos.y + (tdy / tdist) * ship.speed

      // Validate the new position is water
      const tileAtNew = world.getTile(Math.floor(nx), Math.floor(ny))
      if (tileAtNew === TileType.DEEP_WATER || tileAtNew === TileType.SHALLOW_WATER) {
        pos.x = nx
        pos.y = ny
      } else {
        // Hit land — pick a new target
        this.assignNewTarget(ship, pos, world)
      }
    }
  }

  private assignNewTarget(ship: ShipComponent, pos: PositionComponent, world: World): void {
    // Try up to 10 random water positions within a reasonable range
    for (let i = 0; i < 10; i++) {
      const range = 30
      const tx = Math.floor(pos.x + (Math.random() - 0.5) * range * 2)
      const ty = Math.floor(pos.y + (Math.random() - 0.5) * range * 2)
      if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) continue
      const tile = world.getTile(tx, ty)
      if (tile === TileType.DEEP_WATER || tile === TileType.SHALLOW_WATER) {
        ship.targetX = tx
        ship.targetY = ty
        return
      }
    }
  }

  // ── Naval Combat ──────────────────────────────────────────────────────

  private updateCombat(em: EntityManager, civManager: CivManager, particles: ParticleSystem, tick: number): void {
    const ships = em.getEntitiesWithComponents('ship', 'position')

    // Spatial hash for fast neighbor lookup (cell size 8)
    const grid = this._combatGrid
    grid.clear()
    for (const id of ships) {
      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (!pos) continue
      const key = `${Math.floor(pos.x / 8)},${Math.floor(pos.y / 8)}`
      let cell = grid.get(key)
      if (!cell) { cell = []; grid.set(key, cell) }
      cell.push(id)
    }

    for (const id of ships) {
      const ship = em.getComponent<ShipComponent>(id, 'ship')
      if (!ship || ship.health <= 0 || ship.damage === 0) continue // Only armed ships fight

      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (!pos) continue
      const cx = Math.floor(pos.x / 8)
      const cy = Math.floor(pos.y / 8)

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const cell = grid.get(`${cx + dx},${cy + dy}`)
          if (!cell) continue

          for (const otherId of cell) {
            if (otherId === id) continue
            const otherShip = em.getComponent<ShipComponent>(otherId, 'ship')
            if (!otherShip || otherShip.health <= 0) continue
            if (otherShip.civId === ship.civId) continue // Same civ

            // Check if hostile
            const civA = civManager.civilizations.get(ship.civId)
            const civB = civManager.civilizations.get(otherShip.civId)
            if (!civA || !civB) continue
            const relation = civA.relations.get(otherShip.civId) ?? 0
            if (relation >= -30) continue // Not hostile enough

            const otherPos = em.getComponent<PositionComponent>(otherId, 'position')
            if (!otherPos) continue
            const ddx = pos.x - otherPos.x
            const ddy = pos.y - otherPos.y
            const dist = Math.sqrt(ddx * ddx + ddy * ddy)
            if (dist > 6) continue // Out of naval combat range

            // Engage combat
            ship.state = 'combat'
            otherShip.state = 'combat'

            if (Math.random() < 0.15) {
              const dmg = ship.damage * (0.5 + Math.random() * 0.5)
              otherShip.health -= dmg
              particles.spawn(otherPos.x, otherPos.y, 3, '#ff6600', 1.0)

              if (otherShip.health <= 0) {
                EventLog.log('combat', `${civA.name}'s ${ship.shipType} sank ${civB.name}'s ${otherShip.shipType}`, tick)
                // Worsen relations
                const rel = civB.relations.get(ship.civId) ?? 0
                civB.relations.set(ship.civId, Math.max(-100, rel - 10))
              }
            }
          }
        }
      }

      // Reset combat state if no enemies nearby
      if (ship.state === 'combat') {
        let enemyNearby = false
        for (let dy = -1; dy <= 1 && !enemyNearby; dy++) {
          for (let dx = -1; dx <= 1 && !enemyNearby; dx++) {
            const cell = grid.get(`${cx + dx},${cy + dy}`)
            if (!cell) continue
            for (const oid of cell) {
              if (oid === id) continue
              const os = em.getComponent<ShipComponent>(oid, 'ship')
              if (os && os.civId !== ship.civId && os.health > 0) {
                const rel = civManager.civilizations.get(ship.civId)?.relations.get(os.civId) ?? 0
                if (rel < -30) { enemyNearby = true; break }
              }
            }
          }
        }
        if (!enemyNearby) ship.state = 'sailing'
      }
    }
  }

  // ── Trade Ships ───────────────────────────────────────────────────────

  private updateTraders(em: EntityManager, civManager: CivManager, tick: number): void {
    const ships = em.getEntitiesWithComponents('ship', 'position')

    for (const id of ships) {
      const ship = em.getComponent<ShipComponent>(id, 'ship')
      if (!ship || ship.shipType !== 'trader' || ship.health <= 0) continue

      const civ = civManager.civilizations.get(ship.civId)
      if (!civ) continue

      // Find an allied port to trade with
      if (ship.state !== 'trading') {
        const targetPort = this.findAlliedPort(em, civManager, ship.civId)
        if (targetPort) {
          ship.targetX = targetPort.x
          ship.targetY = targetPort.y
          ship.state = 'trading'
        }
        continue
      }

      // Check if near target (arrived at port)
      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (!pos) continue
      const dx = ship.targetX - pos.x
      const dy = ship.targetY - pos.y
      if (dx * dx + dy * dy < 4) {
        // Generate trade income
        const tradeBonus = civManager.getCultureBonus(ship.civId, 'trade')
        const goldEarned = 0.5 * tradeBonus
        civ.resources.gold += goldEarned
        ship.cargo.gold += goldEarned

        // Head back or find new trade partner
        ship.state = 'idle'
      }
    }
  }

  private findAlliedPort(em: EntityManager, civManager: CivManager, civId: number): { x: number; y: number } | null {
    const civ = civManager.civilizations.get(civId)
    if (!civ) return null

    const ports = em.getEntitiesWithComponent('building')
    const candidates: { x: number; y: number }[] = []

    for (const portId of ports) {
      const b = em.getComponent<BuildingComponent>(portId, 'building')
      if (!b || b.buildingType !== BuildingType.PORT) continue
      if (b.civId === civId) continue // Skip own ports

      const relation = civ.relations.get(b.civId) ?? 0
      if (relation < 20) continue // Only trade with friendly civs

      const pos = em.getComponent<PositionComponent>(portId, 'position')
      if (pos) candidates.push({ x: pos.x, y: pos.y })
    }

    if (candidates.length === 0) return null
    return candidates[Math.floor(Math.random() * candidates.length)]
  }

  // ── Explorer Ships ────────────────────────────────────────────────────

  private updateExplorers(em: EntityManager, civManager: CivManager, particles: ParticleSystem, tick: number): void {
    const ships = em.getEntitiesWithComponents('ship', 'position')

    for (const id of ships) {
      const ship = em.getComponent<ShipComponent>(id, 'ship')
      if (!ship || ship.shipType !== 'explorer' || ship.health <= 0) continue

      const civ = civManager.civilizations.get(ship.civId)
      if (!civ) continue

      ship.state = 'exploring'
      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (!pos) continue

      // Claim nearby unclaimed water tiles as territory
      const radius = 3
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const tx = Math.floor(pos.x) + dx
          const ty = Math.floor(pos.y) + dy
          if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) continue
          if (dx * dx + dy * dy > radius * radius) continue
          if (civManager.territoryMap[ty][tx] === 0) {
            civManager.territoryMap[ty][tx] = ship.civId
            civ.territory.add(`${tx},${ty}`)
          }
        }
      }

      // Small chance to find treasure
      if (Math.random() < 0.01) {
        const goldFound = 5 + Math.floor(Math.random() * 15)
        civ.resources.gold += goldFound
        particles.spawn(pos.x, pos.y, 6, '#ffd700', 1.5)
        EventLog.log('trade', `${civ.name}'s explorer found ${goldFound} gold at sea!`, tick)
      }
    }
  }

  // ── Fishing Boats ─────────────────────────────────────────────────────

  private updateFishing(em: EntityManager, civManager: CivManager): void {
    const ships = em.getEntitiesWithComponents('ship', 'position')

    for (const id of ships) {
      const ship = em.getComponent<ShipComponent>(id, 'ship')
      if (!ship || ship.shipType !== 'fishing' || ship.health <= 0) continue

      const civ = civManager.civilizations.get(ship.civId)
      if (!civ) continue

      // Generate food passively: 0.1 food per tick
      civ.resources.food += 0.1
      ship.cargo.food += 0.1
    }
  }

  // ── Blockades ─────────────────────────────────────────────────────────

  private updateBlockades(em: EntityManager, civManager: CivManager, tick: number): void {
    const ships = em.getEntitiesWithComponents('ship', 'position')
    const ports = em.getEntitiesWithComponent('building')

    for (const shipId of ships) {
      const ship = em.getComponent<ShipComponent>(shipId, 'ship')
      if (!ship || ship.shipType !== 'warship' || ship.health <= 0) continue

      const shipPos = em.getComponent<PositionComponent>(shipId, 'position')
      if (!shipPos) continue
      const attackerCiv = civManager.civilizations.get(ship.civId)
      if (!attackerCiv) continue

      for (const portId of ports) {
        const b = em.getComponent<BuildingComponent>(portId, 'building')
        if (!b || b.buildingType !== BuildingType.PORT) continue
        if (b.civId === ship.civId) continue

        const relation = attackerCiv.relations.get(b.civId) ?? 0
        if (relation >= -30) continue // Only blockade enemies

        const portPos = em.getComponent<PositionComponent>(portId, 'position')
        if (!portPos) continue

        const dx = shipPos.x - portPos.x
        const dy = shipPos.y - portPos.y
        if (dx * dx + dy * dy > 64) continue // Within 8 tiles

        // Reduce enemy trade income from this port
        const defenderCiv = civManager.civilizations.get(b.civId)
        if (defenderCiv) {
          defenderCiv.resources.gold = Math.max(0, defenderCiv.resources.gold - 0.1)

          // Disable trade routes through this port
          for (const route of defenderCiv.tradeRoutes) {
            if (route.active &&
                Math.abs(route.fromPort.x - portPos.x) < 3 &&
                Math.abs(route.fromPort.y - portPos.y) < 3) {
              route.active = false
            }
          }
        }
      }
    }
  }

  // ── Cleanup ───────────────────────────────────────────────────────────

  private cleanupSunk(em: EntityManager, particles: ParticleSystem): void {
    const ships = em.getEntitiesWithComponents('ship', 'position')

    for (const id of ships) {
      const ship = em.getComponent<ShipComponent>(id, 'ship')
      if (!ship || ship.health > 0) continue

      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (pos) {
        // Sinking particles: water splash + debris
        particles.spawn(pos.x, pos.y, 10, '#4488ff', 2.0)
        particles.spawn(pos.x, pos.y, 6, '#886644', 1.5)
      }

      // Decrement port ship count
      this.decrementPortCount(em, ship.civId)

      em.removeEntity(id)
    }
  }

  private decrementPortCount(em: EntityManager, civId: number): void {
    // Find a port belonging to this civ and decrement its count
    for (const [portId, count] of this.portShipCount) {
      if (count <= 0) continue
      const b = em.getComponent<BuildingComponent>(portId, 'building')
      if (b && b.civId === civId) {
        this.portShipCount.set(portId, count - 1)
        return
      }
    }
  }

  // ── Public helpers ────────────────────────────────────────────────────

  getShipCount(em: EntityManager, civId?: number): number {
    const ships = em.getEntitiesWithComponent('ship')
    if (civId === undefined) return ships.length
    return ships.filter(id => {
      const s = em.getComponent<ShipComponent>(id, 'ship')
      return s && s.civId === civId
    }).length
  }

  getShipsByType(em: EntityManager, civId: number): Record<ShipComponent['shipType'], number> {
    const counts: Record<ShipComponent['shipType'], number> = { warship: 0, trader: 0, explorer: 0, fishing: 0 }
    const ships = em.getEntitiesWithComponent('ship')
    for (const id of ships) {
      const s = em.getComponent<ShipComponent>(id, 'ship')
      if (s && s.civId === civId) counts[s.shipType]++
    }
    return counts
  }
}
