import { EntityManager, EntityId, PositionComponent, RenderComponent, ArtifactComponent, InventoryComponent, CreatureComponent, NeedsComponent, AIComponent } from '../ecs/Entity'
import { World } from '../game/World'
import { ParticleSystem } from './ParticleSystem'
import { EventLog } from './EventLog'
import { TileType, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'

const ARTIFACTS = [
  { type: 'excalibur', name: 'Excalibur', rarity: 'mythic' as const, effect: '+50% combat damage', bonusType: 'combat' as const, bonusValue: 1.5 },
  { type: 'holy_grail', name: 'Holy Grail', rarity: 'mythic' as const, effect: 'Regenerate 2 HP/tick', bonusType: 'regen' as const, bonusValue: 2 },
  { type: 'mjolnir', name: 'Mjölnir', rarity: 'legendary' as const, effect: '+30% combat + stun', bonusType: 'combat' as const, bonusValue: 1.3 },
  { type: 'ring_of_power', name: 'Ring of Power', rarity: 'mythic' as const, effect: '2x XP gain', bonusType: 'xp' as const, bonusValue: 2 },
  { type: 'crystal_orb', name: 'Crystal Orb', rarity: 'legendary' as const, effect: '+50% speed', bonusType: 'speed' as const, bonusValue: 1.5 },
  { type: 'dragon_crown', name: 'Dragon Crown', rarity: 'mythic' as const, effect: 'Heal nearby allies', bonusType: 'aura' as const, bonusValue: 1 },
]

// Walkable tiles for artifact spawning (no water, no lava)
const SPAWN_TILES = new Set([TileType.SAND, TileType.GRASS, TileType.FOREST, TileType.SNOW, TileType.MOUNTAIN])

export class ArtifactSystem {
  private spawnedCount: number = 0
  private maxArtifacts: number = 6
  private lastSpawnTick: number = 0
  private _existingTypesSet: Set<string> = new Set()
  // Reusable buffers for updateHeroQuesting (every tick)
  private _unclaimedIdBuf: EntityId[] = []
  private _unclaimedXBuf: number[] = []
  private _unclaimedYBuf: number[] = []

  update(em: EntityManager, world: World, particles: ParticleSystem, tick: number): void {
    // Spawn new artifacts periodically
    if (tick - this.lastSpawnTick >= 3000) {
      this.lastSpawnTick = tick
      this.trySpawnArtifact(em, world, particles, tick)
    }

    // Hero questing: heroes seek unclaimed artifacts
    this.updateHeroQuesting(em)

    // Apply artifact buffs each tick
    this.applyBuffs(em, tick)
  }

  private trySpawnArtifact(em: EntityManager, world: World, particles: ParticleSystem, tick: number): void {
    // Count unclaimed artifacts
    const artifactEntities = em.getEntitiesWithComponent('artifact')
    let unclaimedCount = 0
    const existingTypes = this._existingTypesSet
    existingTypes.clear()

    for (const id of artifactEntities) {
      const art = em.getComponent<ArtifactComponent>(id, 'artifact')
      if (!art) continue
      existingTypes.add(art.artifactType)
      if (!art.claimed) unclaimedCount++
    }

    if (unclaimedCount >= this.maxArtifacts) return

    // Pick a random artifact type that doesn't already exist in the world — 两阶段采样，零分配
    let availCount = 0
    for (const a of ARTIFACTS) { if (!existingTypes.has(a.type)) availCount++ }
    if (availCount === 0) return
    let targetIdx = Math.floor(Math.random() * availCount)
    let template: typeof ARTIFACTS[0] | undefined
    for (const a of ARTIFACTS) {
      if (!existingTypes.has(a.type)) { if (targetIdx-- === 0) { template = a; break } }
    }
    if (!template) return

    // Find a random walkable tile
    for (let attempt = 0; attempt < 50; attempt++) {
      const x = Math.floor(Math.random() * WORLD_WIDTH)
      const y = Math.floor(Math.random() * WORLD_HEIGHT)
      const tile = world.getTile(x, y)
      if (tile === null || !SPAWN_TILES.has(tile)) continue

      // Create artifact entity
      const id = em.createEntity()
      em.addComponent<PositionComponent>(id, { type: 'position', x, y })
      em.addComponent<RenderComponent>(id, { type: 'render', color: '#ffd700', size: 3 })
      em.addComponent<ArtifactComponent>(id, {
        type: 'artifact',
        artifactType: template.type,
        name: template.name,
        rarity: template.rarity,
        effect: template.effect,
        bonusType: template.bonusType,
        bonusValue: template.bonusValue,
        claimed: false,
        claimedBy: null
      })

      this.spawnedCount++
      particles.spawn(x, y, 12, '#ffd700', 2)
      particles.spawn(x, y, 6, '#ffffff', 1)
      EventLog.log('artifact', `${template.name} (${template.rarity}) has appeared in the world!`, tick)
      return
    }
  }

  private updateHeroQuesting(em: EntityManager): void {
    const heroes = em.getEntitiesWithComponents('position', 'hero', 'ai', 'creature')
    const artifactEntities = em.getEntitiesWithComponent('artifact')

    // Collect unclaimed artifact positions into flat buffers (zero object alloc)
    const unclaimedId = this._unclaimedIdBuf
    const unclaimedX = this._unclaimedXBuf
    const unclaimedY = this._unclaimedYBuf
    unclaimedId.length = 0
    unclaimedX.length = 0
    unclaimedY.length = 0
    for (const artId of artifactEntities) {
      const art = em.getComponent<ArtifactComponent>(artId, 'artifact')
      if (!art || art.claimed) continue
      const pos = em.getComponent<PositionComponent>(artId, 'position')
      if (pos) {
        unclaimedId.push(artId)
        unclaimedX.push(pos.x)
        unclaimedY.push(pos.y)
      }
    }

    if (unclaimedId.length === 0) return

    for (const heroId of heroes) {
      const inv = em.getComponent<InventoryComponent>(heroId, 'inventory')
      // Heroes with 2+ artifacts don't seek more
      if (inv && inv.artifacts.length >= 2) continue

      const heroPos = em.getComponent<PositionComponent>(heroId, 'position')
      const ai = em.getComponent<AIComponent>(heroId, 'ai')
      if (!heroPos || !ai) continue

      // Find nearest unclaimed artifact using flat buffers (no object alloc)
      let nearestIdx = -1
      let nearestDist = Infinity
      for (let i = 0; i < unclaimedId.length; i++) {
        const dx = unclaimedX[i] - heroPos.x
        const dy = unclaimedY[i] - heroPos.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < nearestDist) { nearestDist = dist; nearestIdx = i }
      }

      if (nearestIdx < 0) continue

      // Check if hero is close enough to claim
      if (nearestDist < 1.5) {
        this.claimArtifact(em, heroId, unclaimedId[nearestIdx])
        continue
      }

      // Direct hero towards artifact if idle or wandering
      if (ai.state === 'idle' || ai.state === 'wandering') {
        ai.state = 'wandering'
        ai.targetX = unclaimedX[nearestIdx]
        ai.targetY = unclaimedY[nearestIdx]
      }
    }
  }

  private claimArtifact(em: EntityManager, heroId: EntityId, artifactEntityId: EntityId): void {
    const art = em.getComponent<ArtifactComponent>(artifactEntityId, 'artifact')
    if (!art) return
    const heroCreature = em.getComponent<CreatureComponent>(heroId, 'creature')
    const artPos = em.getComponent<PositionComponent>(artifactEntityId, 'position')

    art.claimed = true
    art.claimedBy = heroId

    // Add to hero's inventory
    let inv = em.getComponent<InventoryComponent>(heroId, 'inventory')
    if (!inv) {
      em.addComponent<InventoryComponent>(heroId, { type: 'inventory', artifacts: [] })
      inv = em.getComponent<InventoryComponent>(heroId, 'inventory')
    }
    if (inv) inv.artifacts.push(art.artifactType)

    // Remove the artifact entity's render/position (it's now carried by the hero)
    em.removeComponent(artifactEntityId, 'position')
    em.removeComponent(artifactEntityId, 'render')

    // Golden particle burst
    if (artPos) {
      // Use a local import-free reference to particles — caller handles via update()
      // We'll spawn particles from Game.ts side; for now log the event
    }

    const heroName = heroCreature ? heroCreature.name : 'A hero'
    EventLog.log('artifact', `${heroName} claimed ${art.name}! (${art.effect})`, 0)
  }

  // Called from Game.ts after update to spawn claim particles
  spawnClaimParticles(em: EntityManager, particles: ParticleSystem, tick: number): void {
    const artifactEntities = em.getEntitiesWithComponent('artifact')
    for (const artId of artifactEntities) {
      const art = em.getComponent<ArtifactComponent>(artId, 'artifact')
      if (!art || !art.claimed || art.claimedBy === null) continue

      const heroPos = em.getComponent<PositionComponent>(art.claimedBy, 'position')
      if (!heroPos) continue

      // Aura effect: dragon crown heals nearby allies every 60 ticks
      if (art.bonusType === 'aura' && tick % 60 === 0) {
        const allies = em.getEntitiesWithComponents('position', 'needs')
        for (const allyId of allies) {
          if (allyId === art.claimedBy) continue
          const allyPos = em.getComponent<PositionComponent>(allyId, 'position')
          if (!allyPos) continue
          const dx = heroPos.x - allyPos.x
          const dy = heroPos.y - allyPos.y
          if (dx * dx + dy * dy < 36) { // 6 tile range
            const allyNeeds = em.getComponent<NeedsComponent>(allyId, 'needs')
            if (allyNeeds && allyNeeds.health < 100) {
              allyNeeds.health = Math.min(100, allyNeeds.health + 3)
              particles.spawn(allyPos.x, allyPos.y, 2, '#44ffaa', 0.5)
            }
          }
        }
      }
    }
  }

  private applyBuffs(em: EntityManager, tick: number): void {
    const artifactEntities = em.getEntitiesWithComponent('artifact')

    for (const artId of artifactEntities) {
      const art = em.getComponent<ArtifactComponent>(artId, 'artifact')
      if (!art || !art.claimed || art.claimedBy === null) continue

      // Check holder still exists
      if (!em.hasComponent(art.claimedBy, 'position')) {
        // Holder is dead — drop artifact
        this.dropArtifact(em, artId, art)
        continue
      }

      // Regen buff: heal holder every 30 ticks
      if (art.bonusType === 'regen' && tick % 30 === 0) {
        const needs = em.getComponent<NeedsComponent>(art.claimedBy, 'needs')
        if (needs) {
          needs.health = Math.min(100, needs.health + art.bonusValue)
        }
      }
    }
  }

  dropArtifact(em: EntityManager, artifactEntityId: EntityId, art?: ArtifactComponent): void {
    if (!art) {
      art = em.getComponent<ArtifactComponent>(artifactEntityId, 'artifact')
      if (!art) return
    }

    const holderId = art.claimedBy
    if (holderId !== null) {
      // Get holder's last position to place artifact
      const holderPos = em.getComponent<PositionComponent>(holderId, 'position')
      const dropX = holderPos ? holderPos.x : Math.random() * WORLD_WIDTH
      const dropY = holderPos ? holderPos.y : Math.random() * WORLD_HEIGHT

      // Re-add position and render to the artifact entity
      em.addComponent<PositionComponent>(artifactEntityId, { type: 'position', x: dropX, y: dropY })
      em.addComponent<RenderComponent>(artifactEntityId, { type: 'render', color: '#ffd700', size: 3 })

      // Remove from holder's inventory
      const inv = em.getComponent<InventoryComponent>(holderId, 'inventory')
      if (inv) {
        const idx = inv.artifacts.indexOf(art.artifactType)
        if (idx !== -1) inv.artifacts.splice(idx, 1)
      }

      EventLog.log('artifact', `${art.name} was dropped!`, 0)
    }

    art.claimed = false
    art.claimedBy = null
  }

  // Drop all artifacts held by a dying entity
  dropAllArtifacts(em: EntityManager, entityId: EntityId): void {
    const artifactEntities = em.getEntitiesWithComponent('artifact')
    for (const artId of artifactEntities) {
      const art = em.getComponent<ArtifactComponent>(artId, 'artifact')
      if (!art) continue
      if (art.claimed && art.claimedBy === entityId) {
        this.dropArtifact(em, artId, art)
      }
    }
  }
}

/** Returns the total bonus multiplier for a given entity and bonus type */
export function getArtifactBonus(em: EntityManager, entityId: EntityId, bonusType: string): number {
  let total = 1
  const artifactEntities = em.getEntitiesWithComponent('artifact')
  for (const artId of artifactEntities) {
    const art = em.getComponent<ArtifactComponent>(artId, 'artifact')
    if (!art) continue
    if (art.claimed && art.claimedBy === entityId && art.bonusType === bonusType) {
      total *= art.bonusValue
    }
  }
  return total
}

/** Returns the combat bonus multiplier for a given entity */
export function getArtifactCombatBonus(em: EntityManager, entityId: EntityId): number {
  return getArtifactBonus(em, entityId, 'combat')
}
