// Hero Legend System - tracks hero fame, legendary deeds, and monuments

import { EntityManager, EntityId, HeroComponent, CreatureComponent, PositionComponent } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'
import { CivMemberComponent } from '../civilization/Civilization'
import { World } from '../game/World'
import { ParticleSystem } from './ParticleSystem'
import { EventLog } from './EventLog'

export interface LegendaryDeed {
  type: string
  description: string
  tick: number
}

export interface HeroFame {
  entityId: number
  name: string
  fame: number
  title: string
  deeds: LegendaryDeed[]
  civId: number
}

interface Monument {
  entityId: number
  heroName: string
  deeds: LegendaryDeed[]
  civId: number
  x: number
  y: number
}

const FAME_TITLES: { threshold: number; title: string }[] = [
  { threshold: 800, title: 'Mythical' },
  { threshold: 500, title: 'Legendary' },
  { threshold: 300, title: 'Famous' },
  { threshold: 100, title: 'Known' },
]

const DEED_FAME: Record<string, number> = {
  first_kill: 10,
  dragon_slayer: 100,
  hundred_kills: 80,
  survived_disaster: 40,
  war_hero: 60,
}

export class HeroLegendSystem {
  private fameMap: Map<number, HeroFame> = new Map()
  private monuments: Monument[] = []
  private trackedHeroes: Set<number> = new Set()
  private lastSurvivalTick: Map<number, number> = new Map()
  // Reusable set to avoid GC pressure
  private _aliveSet: Set<number> = new Set()

  update(em: EntityManager, civManager: CivManager, world: World, particles: ParticleSystem, tick: number): void {
    const heroIds = em.getEntitiesWithComponents('position', 'hero', 'creature')

    // Track new heroes
    for (const id of heroIds) {
      if (!this.fameMap.has(id)) {
        const creature = em.getComponent<CreatureComponent>(id, 'creature')
        if (!creature) continue
        const civMember = em.getComponent<CivMemberComponent>(id, 'civMember')
        this.fameMap.set(id, {
          entityId: id,
          name: creature.name,
          fame: 0,
          title: '',
          deeds: [],
          civId: civMember?.civId ?? 0,
        })
        this.lastSurvivalTick.set(id, tick)
        this.trackedHeroes.add(id)
      }
    }

    // Update survival fame and check kills
    const aliveSet = this._aliveSet
    aliveSet.clear()
    for (const id of heroIds) aliveSet.add(id)
    for (const id of heroIds) {
      const fame = this.fameMap.get(id)
      if (!fame) continue
      const hero = em.getComponent<HeroComponent>(id, 'hero')
      if (!hero) continue

      // Survival fame: +1 per 600 ticks
      const lastTick = this.lastSurvivalTick.get(id) ?? tick
      if (tick - lastTick >= 600) {
        const intervals = Math.floor((tick - lastTick) / 600)
        this.addFame(id, intervals)
        this.lastSurvivalTick.set(id, lastTick + intervals * 600)
      }

      // Check kill-based deeds
      if (hero.kills >= 1 && !fame.deeds.some(d => d.type === 'first_kill')) {
        this.recordDeed(id, 'first_kill', `${fame.name} claimed their first kill`, tick)
      }
      if (hero.kills >= 100 && !fame.deeds.some(d => d.type === 'hundred_kills')) {
        this.recordDeed(id, 'hundred_kills', `${fame.name} has slain 100 enemies`, tick)
      }

      // Update title
      this.updateTitle(id)
    }

    // Detect dead heroes and spawn monuments
    for (const id of this.trackedHeroes) {
      if (!aliveSet.has(id) && !em.hasComponent(id, 'hero')) {
        const fame = this.fameMap.get(id)
        if (fame && fame.fame >= 500) {
          this.spawnMonument(id, em, civManager, world, particles, tick)
        }
        this.trackedHeroes.delete(id)
        this.lastSurvivalTick.delete(id)
        this.fameMap.delete(id)
      }
    }

    // Cap monuments to prevent unbounded growth
    if (this.monuments.length > 50) {
      this.monuments.splice(0, this.monuments.length - 50)
    }

    // Monument happiness aura (every 300 ticks)
    if (tick % 300 === 0) {
      this.applyMonumentAura(civManager)
    }
  }

  recordDeed(entityId: number, type: string, description: string, tick: number): void {
    const fame = this.fameMap.get(entityId)
    if (!fame) return
    if (fame.deeds.some(d => d.type === type)) return

    fame.deeds.push({ type, description, tick })
    const bonus = DEED_FAME[type] ?? 10
    this.addFame(entityId, bonus)
    EventLog.log('hero', `[Deed] ${description}`, tick)
  }

  getLeaderboard(): HeroFame[] {
    const alive = [...this.fameMap.values()]
      .filter(f => this.trackedHeroes.has(f.entityId))
      .sort((a, b) => b.fame - a.fame)
    return alive.slice(0, 10)
  }

  getFame(entityId: number): HeroFame | undefined {
    return this.fameMap.get(entityId)
  }

  getMonuments(): Monument[] {
    return this.monuments
  }

  private addFame(entityId: number, amount: number): void {
    const fame = this.fameMap.get(entityId)
    if (!fame) return
    fame.fame = Math.min(1000, fame.fame + amount)
  }

  private updateTitle(entityId: number): void {
    const fame = this.fameMap.get(entityId)
    if (!fame) return
    const entry = FAME_TITLES.find(t => fame.fame >= t.threshold)
    const newTitle = entry?.title ?? ''
    if (newTitle !== fame.title) {
      fame.title = newTitle
      if (newTitle) {
        EventLog.log('hero', `${fame.name} is now ${newTitle}!`, 0)
      }
    }
  }

  private spawnMonument(
    heroId: number,
    em: EntityManager,
    civManager: CivManager,
    world: World,
    particles: ParticleSystem,
    tick: number
  ): void {
    const fame = this.fameMap.get(heroId)
    if (!fame) return

    // Try to find the hero's last known position from the entity, or use a fallback
    const pos = em.getComponent<PositionComponent>(heroId, 'position')
    const mx = pos ? pos.x : Math.floor(Math.random() * 200)
    const my = pos ? pos.y : Math.floor(Math.random() * 200)

    const id = em.createEntity()
    em.addComponent(id, { type: 'position', x: mx, y: my } as PositionComponent)
    em.addComponent(id, { type: 'render', color: '#ffd700', size: 4 })

    this.monuments.push({
      entityId: id,
      heroName: fame.name,
      deeds: [...fame.deeds],
      civId: fame.civId,
      x: mx,
      y: my,
    })

    // Emit particles at monument location
    particles.spawn(mx, my, 8, '#ffd700', 1.5)

    EventLog.log('hero', `A monument was erected for ${fame.title} ${fame.name} (Fame: ${fame.fame})`, tick)
  }

  private applyMonumentAura(civManager: CivManager): void {
    for (const mon of this.monuments) {
      if (mon.civId <= 0) continue
      const civ = civManager.civilizations.get(mon.civId)
      if (civ) {
        civ.happiness = Math.min(100, civ.happiness + 5)
      }
    }
  }
}
