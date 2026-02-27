import { EntityManager, EntityId, PositionComponent, AIComponent, CreatureComponent, NomadComponent } from '../ecs/Entity'
import { World } from '../game/World'
import { TileType, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'
import { isWalkable } from '../utils/Pathfinding'
import { CivManager } from '../civilization/CivManager'
import { ParticleSystem } from './ParticleSystem'
import { EventLog } from './EventLog'

interface NomadBand {
  id: number
  leaderId: EntityId
  members: Set<EntityId>
  species: string
  destination: { x: number; y: number }
  formed: number // tick when formed
}

let nextBandId = 1

export class MigrationSystem {
  private bands: Map<number, NomadBand> = new Map()
  // Reusable Set for nearby-member aggregation in tryFormBands inner loop
  private _nearbyBuf: Set<EntityId> = new Set()
  // Pre-allocated structures for tryFormBands (every 60 ticks)
  private _candidatesBuf: EntityId[] = []
  private _speciesGroups: Map<string, Map<number, EntityId[]>> = new Map()
  private _cellPool: EntityId[][] = []
  private _cellPoolNext = 0

  update(em: EntityManager, world: World, civManager: CivManager, particles: ParticleSystem): void {
    const tick = world.tick

    // Band formation check every 60 ticks for performance
    if (tick % 60 === 0) {
      this.tryFormBands(em, world, civManager, particles)
    }

    // Update existing bands every tick
    this.updateBands(em, world, civManager, particles)
  }

  private tryFormBands(em: EntityManager, world: World, civManager: CivManager, _particles: ParticleSystem): void {
    const entities = em.getEntitiesWithComponents('position', 'ai', 'creature', 'needs')

    // Collect unaffiliated civilized creatures — reuse buffer
    const candidates = this._candidatesBuf
    candidates.length = 0
    for (const id of entities) {
      if (em.hasComponent(id, 'civMember')) continue
      if (em.hasComponent(id, 'nomad')) continue
      const creature = em.getComponent<CreatureComponent>(id, 'creature')
      if (!creature) continue
      if (creature.species !== 'human' && creature.species !== 'elf' &&
          creature.species !== 'dwarf' && creature.species !== 'orc') continue
      candidates.push(id)
    }

    if (candidates.length < 3) return

    // Group candidates by species using spatial proximity
    // Build spatial hash (8-tile cells), numeric key = cx * 10000 + cy
    const cellSize = 8
    // Reuse pre-allocated speciesGroups: clear inner maps, keep Map objects
    const speciesGroups = this._speciesGroups
    for (const innerMap of speciesGroups.values()) innerMap.clear()
    this._cellPoolNext = 0

    for (const id of candidates) {
      const pos = em.getComponent<PositionComponent>(id, 'position')
      const creature = em.getComponent<CreatureComponent>(id, 'creature')
      if (!pos || !creature) continue
      const cellKey = Math.floor(pos.x / cellSize) * 10000 + Math.floor(pos.y / cellSize)

      let cells = speciesGroups.get(creature.species)
      if (!cells) { cells = new Map(); speciesGroups.set(creature.species, cells) }
      if (!cells.has(cellKey)) {
        // Get or reuse a cell array from pool
        let arr: EntityId[]
        if (this._cellPoolNext < this._cellPool.length) {
          arr = this._cellPool[this._cellPoolNext++]
          arr.length = 0
        } else {
          arr = []
          this._cellPool.push(arr)
          this._cellPoolNext++
        }
        cells.set(cellKey, arr)
      }
      cells.get(cellKey)!.push(id)
    }

    // For each species, find clusters of 3+ within 8 tiles
    for (const [species, cells] of speciesGroups) {
      for (const [cellKey, cellMembers] of cells) {
        // Also check neighboring cells
        const cx = Math.floor(cellKey / 10000)
        const cy = cellKey % 10000
        const nearby = this._nearbyBuf
        nearby.clear()
        for (const id of cellMembers) nearby.add(id)

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            const neighborMembers = cells.get((cx + dx) * 10000 + (cy + dy))
            if (neighborMembers) for (const id of neighborMembers) nearby.add(id)
          }
        }

        if (nearby.size < 3) continue

        // Filter to only those still valid (not already assigned to a band this tick)
        const valid: EntityId[] = []
        for (const id of nearby) {
          if (!em.hasComponent(id, 'nomad')) valid.push(id)
        }
        if (valid.length < 3) continue

        // Check migration triggers
        if (!this.shouldMigrate(em, world, valid)) continue

        // Random chance gate
        if (Math.random() > 0.15) continue

        // Form band with up to 6 members
        const bandMembers = valid.slice(0, 6)
        this.formBand(em, world, civManager, bandMembers, species)
      }
    }
  }

  private shouldMigrate(em: EntityManager, world: World, candidates: EntityId[]): boolean {
    // Check migration triggers

    // 1. Seasonal: more migrations in autumn
    const seasonBonus = world.season === 'autumn' ? 0.3 : 0

    // 2. Local food scarcity
    const pos0 = em.getComponent<PositionComponent>(candidates[0], 'position')
    if (!pos0) return false
    let grassForestCount = 0
    const checkRadius = 10
    for (let dy = -checkRadius; dy <= checkRadius; dy++) {
      for (let dx = -checkRadius; dx <= checkRadius; dx++) {
        const tile = world.getTile(Math.floor(pos0.x) + dx, Math.floor(pos0.y) + dy)
        if (tile === TileType.GRASS || tile === TileType.FOREST) grassForestCount++
      }
    }
    const totalChecked = (checkRadius * 2 + 1) ** 2
    const foodRatio = grassForestCount / totalChecked
    const scarcityBonus = foodRatio < 0.3 ? 0.3 : 0

    // 3. Overcrowding: count all creatures nearby
    const allCreatures = em.getEntitiesWithComponents('position', 'creature')
    let nearbyCount = 0
    for (const id of allCreatures) {
      const p = em.getComponent<PositionComponent>(id, 'position')
      if (!p) continue
      const dx = p.x - pos0.x
      const dy = p.y - pos0.y
      if (dx * dx + dy * dy < 100) nearbyCount++ // within 10 tiles
    }
    const crowdingBonus = nearbyCount > 15 ? 0.3 : 0

    const totalChance = 0.1 + seasonBonus + scarcityBonus + crowdingBonus
    return Math.random() < totalChance
  }

  private formBand(em: EntityManager, world: World, civManager: CivManager, members: EntityId[], species: string): void {
    // Find strongest member as leader
    let leaderId = members[0]
    let bestDamage = 0
    for (const id of members) {
      const creature = em.getComponent<CreatureComponent>(id, 'creature')
      if (!creature) continue
      if (creature.damage > bestDamage) {
        bestDamage = creature.damage
        leaderId = id
      }
    }

    const leaderPos = em.getComponent<PositionComponent>(leaderId, 'position')
    if (!leaderPos) return
    const bandId = nextBandId++

    // Pick destination: seek unclaimed fertile land away from existing civs
    const destination = this.findMigrationTarget(world, civManager, leaderPos.x, leaderPos.y)

    const band: NomadBand = {
      id: bandId,
      leaderId,
      members: new Set(members),
      species,
      destination,
      formed: world.tick
    }
    this.bands.set(bandId, band)

    // Add NomadComponent to all members and set them migrating
    for (const id of members) {
      const pos = em.getComponent<PositionComponent>(id, 'position')
      const ai = em.getComponent<AIComponent>(id, 'ai')
      if (!pos || !ai) continue
      em.addComponent<NomadComponent>(id, {
        type: 'nomad',
        bandId,
        role: id === leaderId ? 'leader' : 'follower',
        origin: { x: pos.x, y: pos.y },
        destination: { ...destination },
        journeyTicks: 0
      })

      ai.state = 'migrating'
      ai.targetX = destination.x
      ai.targetY = destination.y
    }

    const leaderCreature = em.getComponent<CreatureComponent>(leaderId, 'creature')
    if (leaderCreature) {
      EventLog.log('civ_founded', `${leaderCreature.name}'s band of ${species} (${members.length}) set out to find new land`, world.tick)
    }
  }

  private findMigrationTarget(world: World, civManager: CivManager, fromX: number, fromY: number): { x: number; y: number } {
    // Try multiple random directions, pick the best unclaimed fertile spot
    let bestX = fromX
    let bestY = fromY
    let bestScore = -Infinity

    for (let attempt = 0; attempt < 20; attempt++) {
      // Pick a random direction, 30-80 tiles away
      const angle = Math.random() * Math.PI * 2
      const dist = 30 + Math.random() * 50
      const tx = Math.floor(fromX + Math.cos(angle) * dist)
      const ty = Math.floor(fromY + Math.sin(angle) * dist)

      if (tx < 5 || tx >= WORLD_WIDTH - 5 || ty < 5 || ty >= WORLD_HEIGHT - 5) continue

      const tile = world.getTile(tx, ty)
      if (tile === null || !isWalkable(tile, false)) continue
      if (tile === TileType.SAND || tile === TileType.SNOW) continue

      // Score: prefer unclaimed, fertile land
      let score = 0

      // Fertility: count grass/forest in 8-tile radius
      for (let dy = -8; dy <= 8; dy++) {
        for (let dx = -8; dx <= 8; dx++) {
          const t = world.getTile(tx + dx, ty + dy)
          if (t === TileType.GRASS) score += 1
          if (t === TileType.FOREST) score += 1.5
        }
      }

      // Unclaimed bonus
      if (civManager.isLandUnclaimed(tx, ty, 15)) {
        score += 100
      } else {
        score -= 200 // strongly avoid claimed land
      }

      // Distance from origin (prefer not too close)
      const d = Math.sqrt((tx - fromX) ** 2 + (ty - fromY) ** 2)
      if (d > 25) score += 20

      if (score > bestScore) {
        bestScore = score
        bestX = tx
        bestY = ty
      }
    }

    return { x: bestX, y: bestY }
  }

  private updateBands(em: EntityManager, world: World, civManager: CivManager, particles: ParticleSystem): void {
    const bandsToRemove: number[] = []

    for (const [bandId, band] of this.bands) {
      // Check leader alive
      if (!em.hasComponent(band.leaderId, 'position')) {
        // Leader died - dissolve band
        this.dissolveBand(em, band)
        bandsToRemove.push(bandId)
        continue
      }

      // Remove dead members
      for (const memberId of band.members) {
        if (!em.hasComponent(memberId, 'position')) {
          band.members.delete(memberId)
        }
      }

      // If band is empty or only 1 member, dissolve
      if (band.members.size < 2) {
        this.dissolveBand(em, band)
        bandsToRemove.push(bandId)
        continue
      }

      // Update journey ticks for all members
      for (const memberId of band.members) {
        const nomad = em.getComponent<NomadComponent>(memberId, 'nomad')
        if (nomad) nomad.journeyTicks++
      }

      // Check journey timeout (>500 ticks)
      const leaderNomad = em.getComponent<NomadComponent>(band.leaderId, 'nomad')
      if (leaderNomad && leaderNomad.journeyTicks > 500) {
        this.dissolveBand(em, band)
        bandsToRemove.push(bandId)
        continue
      }

      // Update leader target and follower positions
      const leaderPos = em.getComponent<PositionComponent>(band.leaderId, 'position')
      const leaderAi = em.getComponent<AIComponent>(band.leaderId, 'ai')
      if (!leaderPos || !leaderAi) {
        this.dissolveBand(em, band)
        bandsToRemove.push(bandId)
        continue
      }

      // Ensure leader is still migrating
      if (leaderAi.state !== 'migrating') {
        leaderAi.state = 'migrating'
      }
      leaderAi.targetX = band.destination.x
      leaderAi.targetY = band.destination.y

      // Followers follow the leader
      for (const memberId of band.members) {
        if (memberId === band.leaderId) continue
        const ai = em.getComponent<AIComponent>(memberId, 'ai')
        if (!ai) continue
        if (ai.state !== 'migrating') ai.state = 'migrating'
        // Follow leader with slight offset
        ai.targetX = leaderPos.x + (Math.random() - 0.5) * 3
        ai.targetY = leaderPos.y + (Math.random() - 0.5) * 3
      }

      // Trail particle effect (every 10 ticks)
      if (world.tick % 10 === 0) {
        for (const memberId of band.members) {
          const pos = em.getComponent<PositionComponent>(memberId, 'position')
          if (pos) {
            particles.addParticle({
              x: pos.x, y: pos.y,
              vx: (Math.random() - 0.5) * 0.3,
              vy: -0.2,
              life: 15, maxLife: 15,
              color: '#ffcc44',
              size: 1
            })
          }
        }
      }

      // Check if leader reached destination
      const dx = leaderPos.x - band.destination.x
      const dy = leaderPos.y - band.destination.y
      if (dx * dx + dy * dy < 9) { // within 3 tiles
        const tx = Math.floor(leaderPos.x)
        const ty = Math.floor(leaderPos.y)
        const tile = world.getTile(tx, ty)

        if (tile !== null && isWalkable(tile, false) &&
            tile !== TileType.SAND &&
            civManager.isLandUnclaimed(tx, ty, 15)) {
          // Found good land - settle!
          this.settleBand(em, band, civManager, particles, world)
          bandsToRemove.push(bandId)
        } else {
          // Not suitable - pick a new destination
          band.destination = this.findMigrationTarget(world, civManager, leaderPos.x, leaderPos.y)
          for (const memberId of band.members) {
            const nomad = em.getComponent<NomadComponent>(memberId, 'nomad')
            if (nomad) {
              nomad.destination = { ...band.destination }
            }
          }
        }
      }
    }

    for (const id of bandsToRemove) {
      this.bands.delete(id)
    }
  }

  private settleBand(em: EntityManager, band: NomadBand, civManager: CivManager, particles: ParticleSystem, world: World): void {
    const leaderPos = em.getComponent<PositionComponent>(band.leaderId, 'position')
    const leaderCreature = em.getComponent<CreatureComponent>(band.leaderId, 'creature')
    if (!leaderPos || !leaderCreature) return
    const tx = Math.floor(leaderPos.x)
    const ty = Math.floor(leaderPos.y)

    // Create new civilization
    const civ = civManager.createCiv(tx, ty)

    // Assign leader
    civManager.assignToCiv(band.leaderId, civ.id, 'leader')

    // Assign all other members as workers
    for (const memberId of band.members) {
      if (memberId === band.leaderId) continue
      civManager.assignToCiv(memberId, civ.id, 'worker')
    }

    // Remove NomadComponent from all members and reset AI
    for (const memberId of band.members) {
      em.removeComponent(memberId, 'nomad')
      const ai = em.getComponent<AIComponent>(memberId, 'ai')
      if (ai) {
        ai.state = 'idle'
        ai.cooldown = 0
      }
    }

    // Celebration particles
    particles.spawn(leaderPos.x, leaderPos.y, 15, civ.color, 2.5)
    particles.spawn(leaderPos.x, leaderPos.y, 10, '#ffffff', 1.5)

    EventLog.log('civ_founded', `${leaderCreature.name}'s band of ${band.species} founded ${civ.name}`, world.tick)
  }

  private dissolveBand(em: EntityManager, band: NomadBand): void {
    for (const memberId of band.members) {
      if (!em.hasComponent(memberId, 'nomad')) continue
      em.removeComponent(memberId, 'nomad')
      const ai = em.getComponent<AIComponent>(memberId, 'ai')
      if (ai) {
        ai.state = 'idle'
        ai.cooldown = 0
      }
    }
  }
}
