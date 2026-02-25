import { EntityManager, PositionComponent, EntityId } from '../ecs/Entity'
import { World } from '../game/World'
import { TileType, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'
import { Civilization, createCivilization, BuildingType, BuildingComponent, CivMemberComponent } from './Civilization'
import { EventLog } from '../systems/EventLog'

export class CivManager {
  private em: EntityManager
  private world: World
  civilizations: Map<number, Civilization> = new Map()
  territoryMap: number[][] = [] // civId per tile, 0 = unclaimed

  constructor(em: EntityManager, world: World) {
    this.em = em
    this.world = world

    // Init territory map
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      this.territoryMap[y] = new Array(WORLD_WIDTH).fill(0)
    }
  }

  createCiv(founderX: number, founderY: number): Civilization {
    const civ = createCivilization()
    this.civilizations.set(civ.id, civ)

    // Claim initial territory (5x5 around founder)
    this.claimTerritory(civ.id, founderX, founderY, 3)

    // Build initial hut
    this.placeBuilding(civ.id, BuildingType.HUT, founderX, founderY)

    return civ
  }

  assignToCiv(entityId: EntityId, civId: number, role: 'worker' | 'soldier' | 'leader' = 'worker'): void {
    const civ = this.civilizations.get(civId)
    if (!civ) return

    this.em.addComponent(entityId, {
      type: 'civMember',
      civId,
      role
    } as CivMemberComponent)

    civ.population++
  }

  placeBuilding(civId: number, buildingType: BuildingType, x: number, y: number): EntityId | null {
    const civ = this.civilizations.get(civId)
    if (!civ) return null

    const tile = this.world.getTile(x, y)
    if (tile === TileType.DEEP_WATER || tile === TileType.SHALLOW_WATER || tile === TileType.LAVA) return null

    const id = this.em.createEntity()

    this.em.addComponent(id, {
      type: 'position',
      x, y
    } as PositionComponent)

    this.em.addComponent(id, {
      type: 'building',
      buildingType,
      civId,
      health: 100,
      maxHealth: 100,
      level: 1
    } as BuildingComponent)

    this.em.addComponent(id, {
      type: 'render',
      color: civ.color,
      size: buildingType === BuildingType.CASTLE ? 5 : buildingType === BuildingType.HUT ? 3 : 4
    })

    civ.buildings.push(id)
    return id
  }

  claimTerritory(civId: number, cx: number, cy: number, radius: number): void {
    const civ = this.civilizations.get(civId)
    if (!civ) return

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = cx + dx
        const y = cy + dy
        if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) continue

        const tile = this.world.getTile(x, y)
        if (tile === TileType.DEEP_WATER) continue

        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist <= radius) {
          this.territoryMap[y][x] = civId
          civ.territory.add(`${x},${y}`)
        }
      }
    }
  }

  update(): void {
    for (const [, civ] of this.civilizations) {
      // Resource gathering
      this.gatherResources(civ)

      // Building effects
      this.applyBuildingEffects(civ)

      // Auto-build when resources allow
      this.autoBuild(civ)

      // Expand territory
      if (civ.population > 5 && Math.random() < 0.005) {
        this.expandTerritory(civ)
      }

      // Tech advancement
      if (civ.resources.gold > 50 * civ.techLevel && Math.random() < 0.001) {
        civ.techLevel = Math.min(5, civ.techLevel + 1)
      }

      // Diplomacy
      this.updateDiplomacy(civ)

      // Trade routes
      if (Math.random() < 0.01) {
        this.updateTradeRoutes(civ)
      }
      this.applyTradeIncome(civ)
    }
  }

  private applyBuildingEffects(civ: Civilization): void {
    for (const id of civ.buildings) {
      const b = this.em.getComponent<BuildingComponent>(id, 'building')
      if (!b) continue

      switch (b.buildingType) {
        case BuildingType.MINE:
          // Mines produce stone and gold passively
          civ.resources.stone += 0.05 * b.level
          civ.resources.gold += 0.02 * b.level
          break
        case BuildingType.PORT:
          // Ports boost gold income through trade
          civ.resources.gold += 0.04 * b.level
          // Ports also provide small food bonus (fishing)
          civ.resources.food += 0.03 * b.level
          break
        case BuildingType.CASTLE:
          // Castle boosts all resource gathering slightly
          civ.resources.food += 0.02 * b.level
          civ.resources.wood += 0.02 * b.level
          civ.resources.stone += 0.02 * b.level
          break
      }
    }
  }

  private updateDiplomacy(civ: Civilization): void {
    for (const [otherId, otherCiv] of this.civilizations) {
      if (otherId === civ.id) continue

      let relation = civ.relations.get(otherId) ?? 0

      // Natural drift: relations slowly move toward 0
      if (Math.random() < 0.01) {
        relation += relation > 0 ? -0.5 : relation < 0 ? 0.5 : 0
      }

      // Neighboring civs develop opinions based on proximity
      if (Math.random() < 0.005) {
        const bordering = this.areBordering(civ, otherCiv)
        if (bordering) {
          // Bordering civs with similar tech levels tend toward alliance
          const techDiff = Math.abs(civ.techLevel - otherCiv.techLevel)
          if (techDiff <= 1) {
            relation += 1
          } else {
            relation -= 0.5
          }
        }
      }

      // Alliance formation: relation > 50
      // War declaration: relation < -50 (already handled by CombatSystem)

      // Allied trade: share resources
      if (relation > 50 && Math.random() < 0.01) {
        this.tradeResources(civ, otherCiv)
      }

      // Hostile territory attack: steal border tiles
      if (relation < -50 && Math.random() < 0.003) {
        this.attackTerritory(civ, otherCiv)
      }

      civ.relations.set(otherId, Math.max(-100, Math.min(100, relation)))
    }
  }

  private areBordering(a: Civilization, b: Civilization): boolean {
    for (const key of a.territory) {
      const [x, y] = key.split(',').map(Number)
      const neighbors = [[0, 1], [0, -1], [1, 0], [-1, 0]]
      for (const [dx, dy] of neighbors) {
        const nx = x + dx, ny = y + dy
        if (nx >= 0 && nx < WORLD_WIDTH && ny >= 0 && ny < WORLD_HEIGHT) {
          if (this.territoryMap[ny][nx] === b.id) return true
        }
      }
    }
    return false
  }

  private tradeResources(a: Civilization, b: Civilization): void {
    // Each civ shares surplus of their strongest resource
    const tradeAmount = 2
    if (a.resources.food > 30 && b.resources.food < 15) {
      a.resources.food -= tradeAmount
      b.resources.food += tradeAmount
    }
    if (b.resources.wood > 30 && a.resources.wood < 15) {
      b.resources.wood -= tradeAmount
      a.resources.wood += tradeAmount
    }
    if (a.resources.stone > 30 && b.resources.stone < 15) {
      a.resources.stone -= tradeAmount
      b.resources.stone += tradeAmount
    }
    // Trade improves relations slightly
    const rel = a.relations.get(b.id) ?? 0
    a.relations.set(b.id, Math.min(100, rel + 1))
    b.relations.set(a.id, Math.min(100, (b.relations.get(a.id) ?? 0) + 1))
  }

  private attackTerritory(attacker: Civilization, defender: Civilization): void {
    // Find border tiles between the two civs and steal some
    const contested: [number, number][] = []

    for (const key of defender.territory) {
      const [x, y] = key.split(',').map(Number)
      const neighbors = [[0, 1], [0, -1], [1, 0], [-1, 0]]
      for (const [dx, dy] of neighbors) {
        const nx = x + dx, ny = y + dy
        if (nx >= 0 && nx < WORLD_WIDTH && ny >= 0 && ny < WORLD_HEIGHT) {
          if (this.territoryMap[ny][nx] === attacker.id) {
            contested.push([x, y])
            break
          }
        }
      }
    }

    if (contested.length === 0) return

    // Steal 1-2 tiles
    const count = Math.min(2, contested.length)
    for (let i = 0; i < count; i++) {
      const [x, y] = contested[Math.floor(Math.random() * contested.length)]
      const key = `${x},${y}`
      defender.territory.delete(key)
      attacker.territory.add(key)
      this.territoryMap[y][x] = attacker.id
    }

    // Worsen relations further
    const rel = attacker.relations.get(defender.id) ?? 0
    attacker.relations.set(defender.id, Math.max(-100, rel - 2))
    defender.relations.set(attacker.id, Math.max(-100, (defender.relations.get(attacker.id) ?? 0) - 5))
  }

  getRelationLabel(value: number): string {
    if (value > 50) return 'Allied'
    if (value > 20) return 'Friendly'
    if (value > -20) return 'Neutral'
    if (value > -50) return 'Hostile'
    return 'At War'
  }

  private gatherResources(civ: Civilization): void {
    // Workers gather resources based on territory tiles
    const workerCount = this.getWorkerCount(civ.id)
    if (workerCount === 0) return

    // Tech bonuses: level 4 = +30%, level 5 = +50%
    const techMultiplier = civ.techLevel >= 5 ? 1.5 : civ.techLevel >= 4 ? 1.3 : 1.0
    const rate = 0.01 * workerCount * techMultiplier

    for (const key of civ.territory) {
      const [x, y] = key.split(',').map(Number)
      const tile = this.world.getTile(x, y)

      switch (tile) {
        case TileType.GRASS:
          civ.resources.food += rate * 0.02
          break
        case TileType.FOREST:
          civ.resources.wood += rate * 0.02
          civ.resources.food += rate * 0.01
          break
        case TileType.MOUNTAIN:
          civ.resources.stone += rate * 0.02
          civ.resources.gold += rate * 0.005
          break
      }
    }

    // Farms produce extra food
    const farms = civ.buildings.filter(id => {
      const b = this.em.getComponent<BuildingComponent>(id, 'building')
      return b && b.buildingType === BuildingType.FARM
    })
    civ.resources.food += farms.length * 0.1

    // Population consumes food
    civ.resources.food -= civ.population * 0.02
    civ.resources.food = Math.max(0, civ.resources.food)
  }

  private getWorkerCount(civId: number): number {
    const members = this.em.getEntitiesWithComponent('civMember')
    return members.filter(id => {
      const m = this.em.getComponent<CivMemberComponent>(id, 'civMember')
      return m && m.civId === civId && m.role === 'worker'
    }).length
  }

  private autoBuild(civ: Civilization): void {
    if (Math.random() > 0.002) return

    // Find a random territory tile to build on
    const territoryArr = Array.from(civ.territory)
    if (territoryArr.length === 0) return

    const key = territoryArr[Math.floor(Math.random() * territoryArr.length)]
    const [x, y] = key.split(',').map(Number)

    // Check if tile is buildable
    const tile = this.world.getTile(x, y)
    if (tile === TileType.DEEP_WATER || tile === TileType.SHALLOW_WATER || tile === TileType.LAVA || tile === TileType.MOUNTAIN) {
      // Mountains allow mines
      if (tile === TileType.MOUNTAIN && civ.techLevel >= 2 && civ.resources.wood >= 15) {
        const hasBuilding = this.hasBuildingAt(civ, x, y)
        if (!hasBuilding) {
          civ.resources.wood -= 15
          this.placeBuilding(civ.id, BuildingType.MINE, x, y)
        }
      }
      return
    }

    // Check no existing building here
    if (this.hasBuildingAt(civ, x, y)) return

    // Decide what to build based on needs and tech
    if (civ.resources.food < 20 && civ.resources.wood >= 10) {
      civ.resources.wood -= 10
      this.placeBuilding(civ.id, BuildingType.FARM, x, y)
    } else if (civ.population > 3 && civ.resources.wood >= 20) {
      civ.resources.wood -= 20
      this.placeBuilding(civ.id, BuildingType.HOUSE, x, y)
    } else if (civ.techLevel >= 2 && civ.resources.stone >= 30 && civ.resources.wood >= 20) {
      civ.resources.stone -= 30
      civ.resources.wood -= 20
      this.placeBuilding(civ.id, BuildingType.BARRACKS, x, y)
    } else if (civ.techLevel >= 3 && civ.resources.stone >= 40 && this.countBuildings(civ, BuildingType.TOWER) < 3) {
      civ.resources.stone -= 40
      this.placeBuilding(civ.id, BuildingType.TOWER, x, y)
    } else if (civ.techLevel >= 4 && civ.resources.stone >= 80 && civ.resources.gold >= 30 && this.countBuildings(civ, BuildingType.CASTLE) < 1) {
      civ.resources.stone -= 80
      civ.resources.gold -= 30
      this.placeBuilding(civ.id, BuildingType.CASTLE, x, y)
    } else if (civ.techLevel >= 2 && tile === TileType.SAND && civ.resources.wood >= 25 && this.countBuildings(civ, BuildingType.PORT) < 2) {
      // Ports on sand (coastal)
      civ.resources.wood -= 25
      this.placeBuilding(civ.id, BuildingType.PORT, x, y)
    }
  }

  private hasBuildingAt(civ: Civilization, x: number, y: number): boolean {
    return civ.buildings.some(id => {
      const pos = this.em.getComponent<PositionComponent>(id, 'position')
      return pos && Math.floor(pos.x) === x && Math.floor(pos.y) === y
    })
  }

  private countBuildings(civ: Civilization, type: BuildingType): number {
    return civ.buildings.filter(id => {
      const b = this.em.getComponent<BuildingComponent>(id, 'building')
      return b && b.buildingType === type
    }).length
  }

  private expandTerritory(civ: Civilization): void {
    // Find border tiles and expand outward
    const border: [number, number][] = []

    for (const key of civ.territory) {
      const [x, y] = key.split(',').map(Number)
      const neighbors = [[0, 1], [0, -1], [1, 0], [-1, 0]]
      for (const [dx, dy] of neighbors) {
        const nx = x + dx, ny = y + dy
        if (nx >= 0 && nx < WORLD_WIDTH && ny >= 0 && ny < WORLD_HEIGHT) {
          if (this.territoryMap[ny][nx] === 0) {
            border.push([nx, ny])
          }
        }
      }
    }

    if (border.length === 0) return

    // Claim a few random border tiles
    const count = Math.min(3, border.length)
    for (let i = 0; i < count; i++) {
      const [x, y] = border[Math.floor(Math.random() * border.length)]
      const tile = this.world.getTile(x, y)
      if (tile !== TileType.DEEP_WATER) {
        this.territoryMap[y][x] = civ.id
        civ.territory.add(`${x},${y}`)
      }
    }
  }

  getCivAt(x: number, y: number): Civilization | null {
    if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) return null
    const civId = this.territoryMap[y][x]
    return civId ? this.civilizations.get(civId) || null : null
  }

  getCivColor(x: number, y: number): string | null {
    const civ = this.getCivAt(x, y)
    return civ ? civ.color : null
  }

  private updateTradeRoutes(civ: Civilization): void {
    for (const [otherId, otherCiv] of this.civilizations) {
      if (otherId === civ.id) continue
      const relation = civ.relations.get(otherId) ?? 0
      const existingIdx = civ.tradeRoutes.findIndex(r => r.partnerId === otherId)

      const myPort = this.findPort(civ)
      const theirPort = this.findPort(otherCiv)

      if (relation > 20 && myPort && theirPort && existingIdx === -1) {
        // Establish trade route
        const avgTech = (civ.techLevel + otherCiv.techLevel) / 2
        civ.tradeRoutes.push({
          partnerId: otherId,
          fromPort: myPort,
          toPort: theirPort,
          active: true,
          income: avgTech * 0.03
        })
        EventLog.log('trade', `${civ.name} established trade with ${otherCiv.name}`, 0)
      } else if (existingIdx !== -1 && (relation < -10 || !myPort || !theirPort)) {
        // Break trade route
        civ.tradeRoutes.splice(existingIdx, 1)
        EventLog.log('trade', `${civ.name} lost trade route with ${otherCiv.name}`, 0)
      }
    }
  }

  private findPort(civ: Civilization): { x: number; y: number } | null {
    for (const id of civ.buildings) {
      const b = this.em.getComponent<BuildingComponent>(id, 'building')
      const pos = this.em.getComponent<PositionComponent>(id, 'position')
      if (b && b.buildingType === BuildingType.PORT && pos) {
        return { x: pos.x, y: pos.y }
      }
    }
    return null
  }

  private applyTradeIncome(civ: Civilization): void {
    for (const route of civ.tradeRoutes) {
      if (!route.active) continue
      civ.resources.gold += route.income
      civ.resources.food += route.income * 0.5
      // Trade also improves relations
      if (Math.random() < 0.001) {
        const rel = civ.relations.get(route.partnerId) ?? 0
        civ.relations.set(route.partnerId, Math.min(100, rel + 0.5))
      }
    }
  }

  getAllTradeRoutes(): { from: { x: number; y: number }; to: { x: number; y: number }; color: string }[] {
    const routes: { from: { x: number; y: number }; to: { x: number; y: number }; color: string }[] = []
    for (const [, civ] of this.civilizations) {
      for (const route of civ.tradeRoutes) {
        if (!route.active) continue
        routes.push({ from: route.fromPort, to: route.toPort, color: civ.color })
      }
    }
    return routes
  }
}
