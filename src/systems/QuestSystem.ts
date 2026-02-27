import { EntityManager, PositionComponent, HeroComponent, CreatureComponent, NeedsComponent, AIComponent, ArtifactComponent } from '../ecs/Entity'
import { CivMemberComponent, BuildingComponent } from '../civilization/Civilization'
import { CivManager } from '../civilization/CivManager'
import { ParticleSystem } from './ParticleSystem'
import { EventLog } from './EventLog'
import { TileType, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'
import { World } from '../game/World'
import { QUEST_DESCRIPTIONS, BALLAD_TEMPLATES } from './QuestData'

export type QuestType = 'slay_dragon' | 'explore_ruins' | 'defend_village' | 'find_artifact' | 'escort_caravan' | 'holy_pilgrimage'

export interface Quest {
  id: number
  type: QuestType
  heroId: number
  civId: number
  targetX: number
  targetY: number
  progress: number      // 0-100
  reward: { xp: number; gold: number; fame: number }
  description: string
  startTick: number
  timeLimit: number     // ticks before quest expires
  completed: boolean
  failed: boolean
}

export interface Legend {
  heroId: number
  heroName: string
  deeds: string[]       // list of legendary deed descriptions
  fame: number          // accumulated fame score
  ballads: number       // number of ballads written about this hero
  civId: number
}

export class QuestSystem {
  private quests: Quest[] = []
  private legends: Map<number, Legend> = new Map()
  private nextQuestId: number = 1
  private lastGenerateTick: number = 0
  private _activeQuestsBuf: Quest[] = []
  private _legendsBuf: Legend[] = []

  getActiveQuests(): Quest[] {
    this._activeQuestsBuf.length = 0
    for (const q of this.quests) { if (!q.completed && !q.failed) this._activeQuestsBuf.push(q) }
    return this._activeQuestsBuf
  }

  getLegends(): Legend[] {
    this._legendsBuf.length = 0
    for (const l of this.legends.values()) this._legendsBuf.push(l)
    return this._legendsBuf
  }

  update(em: EntityManager, world: World, civManager: CivManager, particles: ParticleSystem, tick: number): void {
    // Generate new quests every ~500 ticks
    if (tick - this.lastGenerateTick >= 500) {
      this.lastGenerateTick = tick
      this.generateQuests(em, world, civManager, tick)
    }

    // Update active quests
    for (const quest of this.quests) {
      if (quest.completed || quest.failed) continue

      // Check timeout
      if (tick - quest.startTick > quest.timeLimit) {
        quest.failed = true
        const hero = em.getComponent<CreatureComponent>(quest.heroId, 'creature')
        const heroName = hero ? hero.name : 'A hero'
        EventLog.log('hero', `${heroName} failed quest: ${quest.description}`, tick)
        continue
      }

      // Check hero still alive
      if (!em.hasComponent(quest.heroId, 'position')) {
        quest.failed = true
        continue
      }

      this.updateQuestProgress(em, world, civManager, particles, quest, tick)
    }

    // Ballad generation for high-fame legends every ~1000 ticks
    if (tick % 1000 === 0) {
      this.generateBallads(em, civManager, tick)
    }

    // Prune old completed/failed quests (keep last 50)
    if (this.quests.length > 100) {
      let finishedCount = 0
      for (let _qi = 0; _qi < this.quests.length; _qi++) {
        const q = this.quests[_qi]
        if (q.completed || q.failed) finishedCount++
      }
      if (finishedCount > 50) {
        let toRemove = finishedCount - 50
        for (let _qi = 0; _qi < this.quests.length && toRemove > 0; ) {
          if (this.quests[_qi].completed || this.quests[_qi].failed) {
            this.quests.splice(_qi, 1)
            toRemove--
          } else {
            _qi++
          }
        }
      }
    }
  }

  private generateQuests(em: EntityManager, world: World, civManager: CivManager, tick: number): void {
    const heroes = em.getEntitiesWithComponents('position', 'hero', 'creature', 'civMember', 'ai')

    for (const heroId of heroes) {
      // Max 1 active quest per hero
      if (this.quests.some(q => q.heroId === heroId && !q.completed && !q.failed)) continue

      const hero = em.getComponent<HeroComponent>(heroId, 'hero')
      const civMember = em.getComponent<CivMemberComponent>(heroId, 'civMember')
      const heroPos = em.getComponent<PositionComponent>(heroId, 'position')
      if (!hero || !civMember || !heroPos) continue
      const civ = civManager.civilizations.get(civMember.civId)
      if (!civ) continue

      const questType = this.pickQuestType(em, world, civManager, civMember.civId)
      if (!questType) continue

      const target = this.findQuestTarget(em, world, civManager, questType, heroPos, civMember.civId)
      if (!target) continue

      // Difficulty scales with hero level
      const levelMult = 1 + hero.level * 0.3
      const baseXp = this.getBaseReward(questType)

      const quest: Quest = {
        id: this.nextQuestId++,
        type: questType,
        heroId,
        civId: civMember.civId,
        targetX: target.x,
        targetY: target.y,
        progress: 0,
        reward: {
          xp: Math.floor(baseXp.xp * levelMult),
          gold: Math.floor(baseXp.gold * levelMult),
          fame: Math.floor(baseXp.fame * levelMult)
        },
        description: this.pickDescription(questType),
        startTick: tick,
        timeLimit: Math.floor(3000 + 1000 * levelMult),
        completed: false,
        failed: false
      }

      this.quests.push(quest)

      // Direct hero toward quest target
      const ai = em.getComponent<AIComponent>(heroId, 'ai')
      if (ai) {
        ai.state = 'wandering'
        ai.targetX = target.x
        ai.targetY = target.y
      }

      const creature = em.getComponent<CreatureComponent>(heroId, 'creature')
      EventLog.log('hero', `${creature ? creature.name : 'A hero'} embarked on quest: ${quest.description}`, tick)
    }
  }

  private pickQuestType(em: EntityManager, world: World, civManager: CivManager, civId: number): QuestType | null {
    const candidates: QuestType[] = []

    // Check if dragons exist
    const creatures = em.getEntitiesWithComponent('creature')
    let hasDragons = false
    for (const id of creatures) {
      const c = em.getComponent<CreatureComponent>(id, 'creature')
      if (!c) continue
      if (c.species === 'dragon') { hasDragons = true; break }
    }
    if (hasDragons) candidates.push('slay_dragon', 'slay_dragon') // weighted

    // Check if artifacts exist unclaimed
    const artifacts = em.getEntitiesWithComponent('artifact')
    let hasUnclaimed = false
    for (const id of artifacts) {
      const art = em.getComponent<ArtifactComponent>(id, 'artifact')
      if (art && !art.claimed) { hasUnclaimed = true; break }
    }
    if (hasUnclaimed) candidates.push('find_artifact')

    // Check if civ is at war -> defend_village
    const civ = civManager.civilizations.get(civId)
    if (civ) {
      for (const [, rel] of civ.relations) {
        if (rel <= -50) { candidates.push('defend_village', 'defend_village'); break }
      }
      // Temples -> holy_pilgrimage
      if (civ.religion.temples > 0) candidates.push('holy_pilgrimage')
      // Trade routes -> escort_caravan
      if (civ.tradeRoutes.length > 0) candidates.push('escort_caravan')
    }

    // Always available
    candidates.push('explore_ruins')

    if (candidates.length === 0) return null
    return candidates[Math.floor(Math.random() * candidates.length)]
  }

  private findQuestTarget(
    em: EntityManager, world: World, civManager: CivManager,
    questType: QuestType, heroPos: PositionComponent, civId: number
  ): { x: number; y: number } | null {
    switch (questType) {
      case 'slay_dragon': {
        const creatures = em.getEntitiesWithComponent('creature')
        let nearest: { x: number; y: number; dist: number } | null = null
        for (const id of creatures) {
          const c = em.getComponent<CreatureComponent>(id, 'creature')
          if (!c) continue
          if (c.species !== 'dragon') continue
          const pos = em.getComponent<PositionComponent>(id, 'position')
          if (!pos) continue
          const dx = pos.x - heroPos.x
          const dy = pos.y - heroPos.y
          const dist = dx * dx + dy * dy
          if (!nearest || dist < nearest.dist) nearest = { x: pos.x, y: pos.y, dist }
        }
        return nearest ? { x: nearest.x, y: nearest.y } : null
      }

      case 'defend_village': {
        // Target own civ's territory center
        const civ = civManager.civilizations.get(civId)
        if (!civ || civ.buildings.length === 0) return null
        const bId = civ.buildings[Math.floor(Math.random() * civ.buildings.length)]
        const bPos = em.getComponent<PositionComponent>(bId, 'position')
        return bPos ? { x: bPos.x, y: bPos.y } : null
      }

      case 'find_artifact': {
        const artifacts = em.getEntitiesWithComponent('artifact')
        for (const id of artifacts) {
          const art = em.getComponent<ArtifactComponent>(id, 'artifact')
          if (art && !art.claimed) {
            const pos = em.getComponent<PositionComponent>(id, 'position')
            if (pos) return { x: pos.x, y: pos.y }
          }
        }
        return null
      }

      case 'escort_caravan': {
        const civ = civManager.civilizations.get(civId)
        if (!civ || civ.tradeRoutes.length === 0) return null
        const route = civ.tradeRoutes[Math.floor(Math.random() * civ.tradeRoutes.length)]
        return { x: route.toPort.x, y: route.toPort.y }
      }

      case 'holy_pilgrimage': {
        // Find a temple in own civ
        const civ = civManager.civilizations.get(civId)
        if (!civ) return null
        for (const bId of civ.buildings) {
          const b = em.getComponent<BuildingComponent>(bId, 'building')
          if (b && b.buildingType === 'temple') {
            const pos = em.getComponent<PositionComponent>(bId, 'position')
            if (pos) return { x: pos.x, y: pos.y }
          }
        }
        // Fallback: random distant location
        return this.randomWalkableTarget(world)
      }

      case 'explore_ruins':
      default:
        return this.randomWalkableTarget(world)
    }
  }

  private randomWalkableTarget(world: World): { x: number; y: number } | null {
    const walkable = new Set([TileType.SAND, TileType.GRASS, TileType.FOREST, TileType.MOUNTAIN, TileType.SNOW])
    for (let attempt = 0; attempt < 30; attempt++) {
      const x = Math.floor(Math.random() * WORLD_WIDTH)
      const y = Math.floor(Math.random() * WORLD_HEIGHT)
      const tile = world.getTile(x, y)
      if (tile !== null && walkable.has(tile)) return { x, y }
    }
    return null
  }

  private getBaseReward(type: QuestType): { xp: number; gold: number; fame: number } {
    switch (type) {
      case 'slay_dragon':     return { xp: 80, gold: 30, fame: 50 }
      case 'explore_ruins':   return { xp: 30, gold: 10, fame: 15 }
      case 'defend_village':  return { xp: 50, gold: 15, fame: 30 }
      case 'find_artifact':   return { xp: 40, gold: 20, fame: 25 }
      case 'escort_caravan':  return { xp: 35, gold: 25, fame: 20 }
      case 'holy_pilgrimage': return { xp: 25, gold: 5,  fame: 35 }
    }
  }

  private pickDescription(type: QuestType): string {
    const pool = QUEST_DESCRIPTIONS[type]
    return pool[Math.floor(Math.random() * pool.length)]
  }

  private updateQuestProgress(
    em: EntityManager, world: World, civManager: CivManager,
    particles: ParticleSystem, quest: Quest, tick: number
  ): void {
    const heroPos = em.getComponent<PositionComponent>(quest.heroId, 'position')
    if (!heroPos) return

    const ai = em.getComponent<AIComponent>(quest.heroId, 'ai')

    // Keep hero directed toward target
    if (ai && (ai.state === 'idle' || ai.state === 'wandering')) {
      ai.state = 'wandering'
      ai.targetX = quest.targetX
      ai.targetY = quest.targetY
    }

    const dx = heroPos.x - quest.targetX
    const dy = heroPos.y - quest.targetY
    const dist = Math.sqrt(dx * dx + dy * dy)

    // Progress increases when near target
    if (dist < 5) {
      // Faster progress the closer the hero is
      const progressRate = dist < 2 ? 3 : 1.5
      quest.progress = Math.min(100, quest.progress + progressRate)

      // Special: slay_dragon requires the dragon to actually die nearby
      if (quest.type === 'slay_dragon' && quest.progress >= 50) {
        // Check if any dragon is still alive near target
        const creatures = em.getEntitiesWithComponent('creature')
        let dragonNearby = false
        for (const id of creatures) {
          const c = em.getComponent<CreatureComponent>(id, 'creature')
          if (!c) continue
          if (c.species !== 'dragon') continue
          const cPos = em.getComponent<PositionComponent>(id, 'position')
          if (!cPos) continue
          const ddx = cPos.x - quest.targetX
          const ddy = cPos.y - quest.targetY
          if (ddx * ddx + ddy * ddy < 100) { dragonNearby = true; break }
        }
        // If dragon is gone, quest completes; if still alive, cap progress at 80
        if (dragonNearby) {
          quest.progress = Math.min(80, quest.progress)
          // Set hero to attack mode toward dragon
          if (ai) {
            ai.state = 'attacking'
          }
        }
      }
    }

    // Quest complete
    if (quest.progress >= 100) {
      this.completeQuest(em, civManager, particles, quest, tick)
    }
  }

  private completeQuest(
    em: EntityManager, civManager: CivManager,
    particles: ParticleSystem, quest: Quest, tick: number
  ): void {
    quest.completed = true

    const hero = em.getComponent<HeroComponent>(quest.heroId, 'hero')
    const creature = em.getComponent<CreatureComponent>(quest.heroId, 'creature')
    const heroPos = em.getComponent<PositionComponent>(quest.heroId, 'position')
    const heroName = creature ? creature.name : 'A hero'

    // XP reward
    if (hero) {
      hero.xp += quest.reward.xp
      // Check level up
      if (hero.xp >= hero.xpToNext) {
        hero.xp -= hero.xpToNext
        hero.level++
        hero.xpToNext = Math.floor(hero.xpToNext * 1.5)
        if (creature) {
          creature.damage += 3
          creature.speed += 0.5
        }
        const needs = em.getComponent<NeedsComponent>(quest.heroId, 'needs')
        if (needs) needs.health = 100
        EventLog.log('hero', `${heroName} leveled up to Lv.${hero.level} from quest rewards!`, tick)
      }
    }

    // Gold reward to civ
    const civ = civManager.civilizations.get(quest.civId)
    if (civ) {
      civ.resources.gold += quest.reward.gold
    }

    // Fame -> legend tracking
    this.addFame(quest.heroId, heroName, quest.civId, quest.reward.fame, quest.description)

    // Particles
    if (heroPos) {
      particles.spawnFirework(heroPos.x, heroPos.y, '#ffd700')
    }

    // Reset hero AI to idle
    const ai = em.getComponent<AIComponent>(quest.heroId, 'ai')
    if (ai) {
      ai.state = 'idle'
      ai.cooldown = 0
    }

    EventLog.log('hero', `${heroName} completed quest: ${quest.description} (+${quest.reward.xp}xp, +${quest.reward.gold}g, +${quest.reward.fame} fame)`, tick)
  }

  private addFame(heroId: number, heroName: string, civId: number, fame: number, deed: string): void {
    let legend = this.legends.get(heroId)
    if (!legend) {
      legend = {
        heroId,
        heroName,
        deeds: [],
        fame: 0,
        ballads: 0,
        civId
      }
      this.legends.set(heroId, legend)
    }

    legend.fame += fame
    legend.heroName = heroName // update in case name changed
    if (legend.deeds.length < 20) {
      legend.deeds.push(deed)
    }
  }

  private generateBallads(em: EntityManager, civManager: CivManager, tick: number): void {
    for (const [heroId, legend] of this.legends) {
      // Need at least 50 fame for a ballad
      if (legend.fame < 50) continue

      // One ballad per 100 fame
      const maxBallads = Math.floor(legend.fame / 100)
      if (legend.ballads >= maxBallads) continue

      // Hero must still be alive
      if (!em.hasComponent(heroId, 'position')) continue

      const hero = em.getComponent<HeroComponent>(heroId, 'hero')
      const creature = em.getComponent<CreatureComponent>(heroId, 'creature')
      if (!hero || !creature) continue

      legend.ballads++

      // Ballad boosts civ happiness
      const civ = civManager.civilizations.get(legend.civId)
      if (civ) {
        civ.happiness = Math.min(100, civ.happiness + 3)
      }

      const template = BALLAD_TEMPLATES[Math.floor(Math.random() * BALLAD_TEMPLATES.length)]
      const balladName = template
        .replace('{name}', creature.name)
        .replace('{title}', hero.title)
        .replace('{civ}', civ ? civ.name : 'the realm')

      EventLog.log('hero', `A bard composed: "${balladName}" (${legend.civId ? civ?.name : 'unknown'} +3 happiness)`, tick)
    }
  }
}
