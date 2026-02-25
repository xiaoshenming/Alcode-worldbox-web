// Creature Pilgrimage System (v3.36) - Creatures undertake sacred journeys
// Pilgrims travel to holy sites, gaining wisdom and spiritual power

import { EntityManager, CreatureComponent, PositionComponent } from '../ecs/Entity'

export type PilgrimageGoal = 'sacred_mountain' | 'ancient_temple' | 'holy_spring' | 'ancestor_grave' | 'world_edge'

export interface Pilgrimage {
  id: number
  entityId: number
  goal: PilgrimageGoal
  targetX: number
  targetY: number
  distanceTraveled: number
  wisdom: number      // 0-100 gained during journey
  startTick: number
  completed: boolean
}

const CHECK_INTERVAL = 900
const PILGRIMAGE_CHANCE = 0.006
const MAX_PILGRIMAGES = 40
const WISDOM_GAIN = 0.3

const GOALS: PilgrimageGoal[] = ['sacred_mountain', 'ancient_temple', 'holy_spring', 'ancestor_grave', 'world_edge']

export class CreaturePilgrimageSystem {
  private pilgrimages: Pilgrimage[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, world: any, tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.startPilgrimages(em, world, tick)
      this.checkCompletion(em)
    }

    this.progressPilgrimages(em)
    this.cleanup()
  }

  private startPilgrimages(em: EntityManager, world: any, tick: number): void {
    if (this.pilgrimages.length >= MAX_PILGRIMAGES) return

    const entities = em.getEntitiesWithComponents('creature', 'position')
    for (const eid of entities) {
      if (Math.random() > PILGRIMAGE_CHANCE) continue
      if (this.isOnPilgrimage(eid)) continue
      if (this.pilgrimages.length >= MAX_PILGRIMAGES) break

      const width = world.width || 200
      const height = world.height || 200
      const goal = GOALS[Math.floor(Math.random() * GOALS.length)]

      this.pilgrimages.push({
        id: this.nextId++,
        entityId: eid,
        goal,
        targetX: Math.floor(Math.random() * width),
        targetY: Math.floor(Math.random() * height),
        distanceTraveled: 0,
        wisdom: 0,
        startTick: tick,
        completed: false,
      })
    }
  }

  private progressPilgrimages(em: EntityManager): void {
    for (const p of this.pilgrimages) {
      if (p.completed) continue

      const pos = em.getComponent<PositionComponent>(p.entityId, 'position')
      if (!pos) continue

      const dx = p.targetX - pos.x
      const dy = p.targetY - pos.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist > 2) {
        // Move toward target
        const speed = 0.2
        pos.x += (dx / dist) * speed
        pos.y += (dy / dist) * speed
        p.distanceTraveled += speed
        p.wisdom = Math.min(100, p.wisdom + WISDOM_GAIN)
      }
    }
  }

  private checkCompletion(em: EntityManager): void {
    for (const p of this.pilgrimages) {
      if (p.completed) continue

      const pos = em.getComponent<PositionComponent>(p.entityId, 'position')
      if (!pos) continue

      const dx = p.targetX - pos.x
      const dy = p.targetY - pos.y
      if (Math.sqrt(dx * dx + dy * dy) < 3) {
        p.completed = true
      }
    }
  }

  private cleanup(): void {
    // Remove old completed pilgrimages
    const active = this.pilgrimages.filter(p => !p.completed)
    const completed = this.pilgrimages.filter(p => p.completed)
    completed.sort((a, b) => b.wisdom - a.wisdom)
    this.pilgrimages = [...active, ...completed.slice(0, 20)]
  }

  private isOnPilgrimage(entityId: number): boolean {
    return this.pilgrimages.some(p => p.entityId === entityId && !p.completed)
  }

  getPilgrimages(): Pilgrimage[] { return this.pilgrimages }
  getActivePilgrimages(): Pilgrimage[] { return this.pilgrimages.filter(p => !p.completed) }
}
