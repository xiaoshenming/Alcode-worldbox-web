import { EntityManager, PositionComponent, EntityId } from '../ecs/Entity'
import { World } from '../game/World'
import { TileType, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'
import { Civilization, createCivilization, BuildingType, BuildingComponent, CivMemberComponent, RELIGION_NAMES } from './Civilization'
import { EventLog } from '../systems/EventLog'

export class CivManager {
  private em: EntityManager
  private world: World
  civilizations: Map<number, Civilization> = new Map()
  territoryMap: number[][] = [] // civId per tile, 0 = unclaimed
  private previousRelations: Map<number, number> = new Map() // civA * 10000 + civB -> previous relation
  private updateTick: number = 0
  // Reusable flat buffers for expandTerritory (called per-civ per ~200 ticks)
  private _borderXBuf: number[] = []
  private _borderYBuf: number[] = []
  // Reusable buffer for getAllTradeRoutes (called every render frame)
  private _tradeRoutesBuf: { from: { x: number; y: number }; to: { x: number; y: number }; color: string }[] = []

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
    this.updateTick++
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

      // Tech advancement - handled by TechSystem

      // Culture strength grows slowly over time
      if (civ.culture.strength < 100 && Math.random() < 0.005) {
        civ.culture.strength = Math.min(100, civ.culture.strength + 0.5)
      }

      // Diplomacy
      this.updateDiplomacy(civ)

      // Trade routes
      if (Math.random() < 0.01) {
        this.updateTradeRoutes(civ)
      }
      this.applyTradeIncome(civ)

      // Religion
      this.updateReligion(civ)

      // Happiness & revolt
      this.updateHappiness(civ)
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

      // Track previous relation for threshold detection
      const relKey = civ.id * 10000 + otherId
      const prevRelation = this.previousRelations.get(relKey) ?? (civ.relations.get(otherId) ?? 0)
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

      // Culture affinity: same culture trait = slow drift toward alliance, different = slow drift toward hostility
      if (Math.random() < 0.01) {
        if (civ.culture.trait === otherCiv.culture.trait) {
          relation += 1
        } else {
          relation -= 0.5
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

      const newRelation = Math.max(-100, Math.min(100, relation))
      civ.relations.set(otherId, newRelation)

      // Detect war/peace threshold crossings
      if (prevRelation > -50 && newRelation <= -50) {
        EventLog.log('war', `${civ.name} declared war on ${otherCiv.name}!`, 0)
      } else if (prevRelation <= -50 && newRelation > -50) {
        EventLog.log('peace', `${civ.name} made peace with ${otherCiv.name}`, 0)
      }

      this.previousRelations.set(relKey, newRelation)
    }
  }

  private areBordering(a: Civilization, b: Civilization): boolean {
    for (const key of a.territory) {
      const comma = key.indexOf(',')
      const x = +key.substring(0, comma)
      const y = +key.substring(comma + 1)
      if (x > 0 && this.territoryMap[y][x - 1] === b.id) return true
      if (x < WORLD_WIDTH - 1 && this.territoryMap[y][x + 1] === b.id) return true
      if (y > 0 && this.territoryMap[y - 1][x] === b.id) return true
      if (y < WORLD_HEIGHT - 1 && this.territoryMap[y + 1][x] === b.id) return true
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
    const cX = this._borderXBuf; cX.length = 0
    const cY = this._borderYBuf; cY.length = 0

    for (const key of defender.territory) {
      const comma = key.indexOf(',')
      const x = +key.substring(0, comma)
      const y = +key.substring(comma + 1)
      if ((x > 0 && this.territoryMap[y][x - 1] === attacker.id) ||
          (x < WORLD_WIDTH - 1 && this.territoryMap[y][x + 1] === attacker.id) ||
          (y > 0 && this.territoryMap[y - 1][x] === attacker.id) ||
          (y < WORLD_HEIGHT - 1 && this.territoryMap[y + 1][x] === attacker.id)) {
        cX.push(x); cY.push(y)
      }
    }

    if (cX.length === 0) return

    // Steal 1-2 tiles
    const count = Math.min(2, cX.length)
    for (let i = 0; i < count; i++) {
      const ri = Math.floor(Math.random() * cX.length)
      const x = cX[ri], y = cY[ri]
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
      // Parse territory key using indexOf for less GC than split+map
      const comma = key.indexOf(',')
      const x = +key.substring(0, comma)
      const y = +key.substring(comma + 1)
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
    let farmCount = 0
    for (let i = 0; i < civ.buildings.length; i++) {
      const b = this.em.getComponent<BuildingComponent>(civ.buildings[i], 'building')
      if (b && b.buildingType === BuildingType.FARM) farmCount++
    }
    civ.resources.food += farmCount * 0.1

    // Nature culture bonus: +20% food production
    const foodBonus = this.getCultureBonus(civ.id, 'food')
    if (foodBonus > 1.0) {
      civ.resources.food *= foodBonus
    }

    // Population consumes food
    civ.resources.food -= civ.population * 0.02
    civ.resources.food = Math.max(0, civ.resources.food)
  }

  private workerCountCache: Map<number, number> = new Map()
  private workerCacheTick: number = -1

  private getWorkerCount(civId: number): number {
    // Rebuild cache once per update() call (all civs share same tick)
    const tick = this.updateTick
    if (tick !== this.workerCacheTick) {
      this.workerCountCache.clear()
      const members = this.em.getEntitiesWithComponent('civMember')
      for (let i = 0; i < members.length; i++) {
        const m = this.em.getComponent<CivMemberComponent>(members[i], 'civMember')
        if (m && m.role === 'worker') {
          this.workerCountCache.set(m.civId, (this.workerCountCache.get(m.civId) ?? 0) + 1)
        }
      }
      this.workerCacheTick = tick
    }
    return this.workerCountCache.get(civId) ?? 0
  }

  private autoBuild(civ: Civilization): void {
    if (Math.random() > 0.002) return

    // Builder culture: reduce resource costs
    const costMult = this.getCultureBonus(civ.id, 'buildCost')

    // Find a random territory tile to build on — iterate without Array.from
    const terrSize = civ.territory.size
    if (terrSize === 0) return
    let targetIdx = Math.floor(Math.random() * terrSize)
    let key: string | undefined
    for (const k of civ.territory) {
      if (targetIdx-- === 0) { key = k; break }
    }
    if (!key) return
    const comma = key.indexOf(',')
    const x = +key.substring(0, comma)
    const y = +key.substring(comma + 1)

    // Check if tile is buildable
    const tile = this.world.getTile(x, y)
    if (tile === TileType.DEEP_WATER || tile === TileType.SHALLOW_WATER || tile === TileType.LAVA || tile === TileType.MOUNTAIN) {
      // Mountains allow mines
      if (tile === TileType.MOUNTAIN && civ.techLevel >= 2 && civ.resources.wood >= 15 * costMult) {
        const hasBuilding = this.hasBuildingAt(civ, x, y)
        if (!hasBuilding) {
          civ.resources.wood -= 15 * costMult
          this.placeBuilding(civ.id, BuildingType.MINE, x, y)
        }
      }
      return
    }

    // Check no existing building here
    if (this.hasBuildingAt(civ, x, y)) return

    // Decide what to build based on needs and tech
    if (civ.resources.food < 20 && civ.resources.wood >= 10 * costMult) {
      civ.resources.wood -= 10 * costMult
      this.placeBuilding(civ.id, BuildingType.FARM, x, y)
    } else if (civ.population > 3 && civ.resources.wood >= 20 * costMult) {
      civ.resources.wood -= 20 * costMult
      this.placeBuilding(civ.id, BuildingType.HOUSE, x, y)
    } else if (civ.techLevel >= 2 && civ.resources.stone >= 30 * costMult && civ.resources.wood >= 20 * costMult) {
      civ.resources.stone -= 30 * costMult
      civ.resources.wood -= 20 * costMult
      this.placeBuilding(civ.id, BuildingType.BARRACKS, x, y)
    } else if (civ.techLevel >= 3 && civ.resources.stone >= 40 * costMult && this.countBuildings(civ, BuildingType.TOWER) < 3) {
      civ.resources.stone -= 40 * costMult
      this.placeBuilding(civ.id, BuildingType.TOWER, x, y)
    } else if (civ.techLevel >= 4 && civ.resources.stone >= 80 * costMult && civ.resources.gold >= 30 * costMult && this.countBuildings(civ, BuildingType.CASTLE) < 1) {
      civ.resources.stone -= 80 * costMult
      civ.resources.gold -= 30 * costMult
      this.placeBuilding(civ.id, BuildingType.CASTLE, x, y)
    } else if (civ.techLevel >= 2 && tile === TileType.SAND && civ.resources.wood >= 25 * costMult && this.countBuildings(civ, BuildingType.PORT) < 2) {
      // Ports on sand (coastal)
      civ.resources.wood -= 25 * costMult
      this.placeBuilding(civ.id, BuildingType.PORT, x, y)
    } else if (civ.techLevel >= 2 && civ.resources.stone >= 25 * costMult && civ.resources.gold >= 10 * costMult && this.countBuildings(civ, BuildingType.TEMPLE) < 2) {
      // Temples
      civ.resources.stone -= 25 * costMult
      civ.resources.gold -= 10 * costMult
      this.placeBuilding(civ.id, BuildingType.TEMPLE, x, y)
      EventLog.log('building', `${civ.name} built a temple to ${RELIGION_NAMES[civ.religion.type]}`, 0)
    }
  }

  private hasBuildingAt(civ: Civilization, x: number, y: number): boolean {
    return civ.buildings.some(id => {
      const pos = this.em.getComponent<PositionComponent>(id, 'position')
      return pos && Math.floor(pos.x) === x && Math.floor(pos.y) === y
    })
  }

  private countBuildings(civ: Civilization, type: BuildingType): number {
    let count = 0
    for (const id of civ.buildings) {
      const b = this.em.getComponent<BuildingComponent>(id, 'building')
      if (b && b.buildingType === type) count++
    }
    return count
  }

  private expandTerritory(civ: Civilization): void {
    // Find border tiles and expand outward
    const borderX = this._borderXBuf; borderX.length = 0
    const borderY = this._borderYBuf; borderY.length = 0

    for (const key of civ.territory) {
      const comma = key.indexOf(',')
      const x = +key.substring(0, comma)
      const y = +key.substring(comma + 1)
      if (x > 0 && this.territoryMap[y][x - 1] === 0) { borderX.push(x - 1); borderY.push(y) }
      if (x < WORLD_WIDTH - 1 && this.territoryMap[y][x + 1] === 0) { borderX.push(x + 1); borderY.push(y) }
      if (y > 0 && this.territoryMap[y - 1][x] === 0) { borderX.push(x); borderY.push(y - 1) }
      if (y < WORLD_HEIGHT - 1 && this.territoryMap[y + 1][x] === 0) { borderX.push(x); borderY.push(y + 1) }
    }

    if (borderX.length === 0) return

    // Claim a few random border tiles
    const count = Math.min(3, borderX.length)
    for (let i = 0; i < count; i++) {
      const ri = Math.floor(Math.random() * borderX.length)
      const x = borderX[ri], y = borderY[ri]
      const tile = this.world.getTile(x, y)
      if (tile !== TileType.DEEP_WATER) {
        this.territoryMap[y][x] = civ.id
        civ.territory.add(`${x},${y}`)
      }
    }
  }

  isLandUnclaimed(x: number, y: number, radius: number): boolean {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || nx >= WORLD_WIDTH || ny < 0 || ny >= WORLD_HEIGHT) continue
        if (dx * dx + dy * dy > radius * radius) continue
        if (this.territoryMap[ny][nx] !== 0) return false
      }
    }
    return true
  }

  getCivAt(x: number, y: number): Civilization | null {
    if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) return null
    const civId = this.territoryMap[y][x]
    return civId ? this.civilizations.get(civId) || null : null
  }

  /** Search for the nearest civilization within a given radius using territoryMap */
  getNearestCiv(x: number, y: number, radius: number): Civilization | null {
    // First check exact tile
    const exact = this.getCivAt(x, y)
    if (exact) return exact
    // Spiral outward to find nearest civ territory
    for (let r = 1; r <= radius; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue // only check perimeter
          const nx = x + dx, ny = y + dy
          if (nx < 0 || nx >= WORLD_WIDTH || ny < 0 || ny >= WORLD_HEIGHT) continue
          const civId = this.territoryMap[ny][nx]
          if (civId) {
            const civ = this.civilizations.get(civId)
            if (civ) return civ
          }
        }
      }
    }
    return null
  }

  getCivColor(x: number, y: number): string | null {
    const civ = this.getCivAt(x, y)
    return civ ? civ.color : null
  }

  getCultureBonus(civId: number, bonusType: 'combat' | 'trade' | 'tech' | 'food' | 'buildSpeed' | 'buildHealth' | 'buildCost'): number {
    const civ = this.civilizations.get(civId)
    if (!civ) return 1.0
    const strength = civ.culture.strength / 100 // 0-1 scale
    switch (bonusType) {
      case 'combat':
        return civ.culture.trait === 'warrior' ? 1 + 0.2 * strength : 1.0
      case 'trade':
        return civ.culture.trait === 'merchant' ? 1 + 0.3 * strength : 1.0
      case 'tech':
        return civ.culture.trait === 'scholar' ? 1 + 0.5 * strength : 1.0
      case 'food':
        return civ.culture.trait === 'nature' ? 1 + 0.2 * strength : 1.0
      case 'buildSpeed':
        return civ.culture.trait === 'builder' ? 1 + 0.3 * strength : 1.0
      case 'buildCost':
        return civ.culture.trait === 'builder' ? 1 - 0.3 * strength : 1.0
      case 'buildHealth':
        return civ.culture.trait === 'builder' ? 1 + 0.2 * strength : 1.0
      default:
        return 1.0
    }
  }

  private updateHappiness(civ: Civilization): void {
    // Base happiness factors
    let delta = 0

    // Food surplus = happy, shortage = unhappy
    if (civ.resources.food > civ.population * 2) delta += 0.02
    else if (civ.resources.food < civ.population * 0.5) delta -= 0.05
    else if (civ.resources.food < civ.population) delta -= 0.02

    // Tax impact: higher tax = less happy
    const taxPenalty = [0, -0.01, -0.03, -0.06][civ.taxRate] ?? 0
    delta += taxPenalty

    // Tax generates gold
    const taxIncome = [0, 0.02, 0.05, 0.1][civ.taxRate] ?? 0
    civ.resources.gold += taxIncome * civ.population

    // Houses boost happiness
    let houseCount = 0
    for (let i = 0; i < civ.buildings.length; i++) {
      const b = this.em.getComponent<BuildingComponent>(civ.buildings[i], 'building')
      if (b && b.buildingType === BuildingType.HOUSE) houseCount++
    }
    if (houseCount * 3 >= civ.population) delta += 0.01 // enough housing

    // Temples boost happiness via faith
    if (civ.religion.faith > 50) delta += 0.01

    // At war = unhappy
    for (const [, rel] of civ.relations) {
      if (rel <= -50) { delta -= 0.02; break }
    }

    // Active blessing bonus
    if (civ.religion.blessing === 'fertility') delta += 0.015

    // Apply delta
    civ.happiness = Math.max(0, Math.min(100, civ.happiness + delta))

    // Revolt check
    if (civ.revoltTimer > 0) {
      civ.revoltTimer--
    } else if (civ.happiness < 20 && civ.population > 2 && Math.random() < 0.002) {
      this.triggerRevolt(civ)
      civ.revoltTimer = 1000 // cooldown before next revolt
    }
  }

  private triggerRevolt(civ: Civilization): void {
    // Some members leave the civilization
    const members = this.em.getEntitiesWithComponent('civMember')
    let civMembersLen = 0
    for (const id of members) {
      const m = this.em.getComponent<CivMemberComponent>(id, 'civMember')
      if (m && m.civId === civ.id && m.role !== 'leader') civMembersLen++
    }
    // Collect non-leader members for revolt
    const civMembers: EntityId[] = []
    for (const id of members) {
      const m = this.em.getComponent<CivMemberComponent>(id, 'civMember')
      if (m && m.civId === civ.id && m.role !== 'leader') civMembers.push(id)
    }

    const revolters = Math.min(Math.ceil(civMembers.length * 0.3), civMembers.length)
    for (let i = 0; i < revolters; i++) {
      const idx = Math.floor(Math.random() * civMembers.length)
      const id = civMembers[idx]
      this.em.removeComponent(id, 'civMember')
      civ.population = Math.max(0, civ.population - 1)
      civMembers.splice(idx, 1)
    }

    // Revolt damages some buildings
    if (civ.buildings.length > 0 && Math.random() < 0.3) {
      const bIdx = Math.floor(Math.random() * civ.buildings.length)
      const bId = civ.buildings[bIdx]
      const b = this.em.getComponent<BuildingComponent>(bId, 'building')
      if (b) {
        b.health = Math.max(0, b.health - 40)
        if (b.health <= 0) {
          this.em.removeEntity(bId)
          civ.buildings.splice(bIdx, 1)
        }
      }
    }

    // Happiness rebounds slightly after revolt
    civ.happiness = Math.min(100, civ.happiness + 15)

    EventLog.log('war', `Revolt in ${civ.name}! ${revolters} citizens left, happiness was ${Math.round(civ.happiness)}%`, 0)
  }

  private updateReligion(civ: Civilization): void {
    // Count temples (no filter allocation)
    let templeCount = 0
    for (let i = 0; i < civ.buildings.length; i++) {
      const b = this.em.getComponent<BuildingComponent>(civ.buildings[i], 'building')
      if (b && b.buildingType === BuildingType.TEMPLE) templeCount++
    }
    civ.religion.temples = templeCount

    // Faith grows with temples, slowly decays without
    if (civ.religion.temples > 0) {
      civ.religion.faith = Math.min(100, civ.religion.faith + 0.01 * civ.religion.temples)
    } else {
      civ.religion.faith = Math.max(0, civ.religion.faith - 0.005)
    }

    // Blessing timer countdown
    if (civ.religion.blessingTimer > 0) {
      civ.religion.blessingTimer--
      if (civ.religion.blessingTimer <= 0) {
        civ.religion.blessing = null
      }
    }

    // Random divine events at high faith
    if (civ.religion.faith > 60 && !civ.religion.blessing && Math.random() < 0.001) {
      this.grantBlessing(civ)
    }

    // Curse at very low faith with temples (angered gods)
    if (civ.religion.faith < 10 && civ.religion.temples > 0 && Math.random() < 0.0005) {
      this.applyCurse(civ)
    }

    // Apply passive temple effects
    this.applyTempleEffects(civ)
  }

  private grantBlessing(civ: Civilization): void {
    const blessings: [string, string][] = [
      ['harvest', 'Divine Harvest - bonus food production'],
      ['shield', 'Divine Shield - reduced combat damage taken'],
      ['wisdom', 'Divine Wisdom - faster tech advancement'],
      ['fertility', 'Divine Fertility - increased birth rate'],
      ['gold', 'Divine Fortune - bonus gold income'],
    ]
    const [type, desc] = blessings[Math.floor(Math.random() * blessings.length)]
    civ.religion.blessing = type
    civ.religion.blessingTimer = 3000 // ~50 seconds at normal speed
    EventLog.log('building', `${RELIGION_NAMES[civ.religion.type]}: ${civ.name} received ${desc}`, 0)
  }

  private applyCurse(civ: Civilization): void {
    // Curses: lose some resources or population health
    const curseType = Math.random()
    if (curseType < 0.33) {
      civ.resources.food = Math.max(0, civ.resources.food - 20)
      EventLog.log('disaster', `${RELIGION_NAMES[civ.religion.type]} cursed ${civ.name} - famine!`, 0)
    } else if (curseType < 0.66) {
      civ.resources.gold = Math.max(0, civ.resources.gold - 15)
      EventLog.log('disaster', `${RELIGION_NAMES[civ.religion.type]} cursed ${civ.name} - gold withered!`, 0)
    } else {
      civ.resources.wood = Math.max(0, civ.resources.wood - 15)
      civ.resources.stone = Math.max(0, civ.resources.stone - 10)
      EventLog.log('disaster', `${RELIGION_NAMES[civ.religion.type]} cursed ${civ.name} - resources crumbled!`, 0)
    }
  }

  private applyTempleEffects(civ: Civilization): void {
    if (civ.religion.temples === 0) return
    const faithMult = civ.religion.faith / 100

    // Passive: temples generate small gold (tithes)
    civ.resources.gold += 0.01 * civ.religion.temples * faithMult

    // Active blessing bonuses
    if (civ.religion.blessing) {
      switch (civ.religion.blessing) {
        case 'harvest':
          civ.resources.food += 0.05 * faithMult
          break
        case 'gold':
          civ.resources.gold += 0.03 * faithMult
          break
        case 'wisdom':
          // Tech advancement boost handled via getCultureBonus extension
          break
      }
    }
  }

  getReligionCombatBonus(civId: number): number {
    const civ = this.civilizations.get(civId)
    if (!civ) return 1.0
    if (civ.religion.blessing === 'shield') {
      return 1.0 + 0.15 * (civ.religion.faith / 100)
    }
    return 1.0
  }

  getReligionTechBonus(civId: number): number {
    const civ = this.civilizations.get(civId)
    if (!civ) return 1.0
    if (civ.religion.blessing === 'wisdom') {
      return 1.0 + 0.3 * (civ.religion.faith / 100)
    }
    return 1.0
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
    const routes = this._tradeRoutesBuf; routes.length = 0
    for (const [, civ] of this.civilizations) {
      for (const route of civ.tradeRoutes) {
        if (!route.active) continue
        routes.push({ from: route.fromPort, to: route.toPort, color: civ.color })
      }
    }
    return routes
  }
}
