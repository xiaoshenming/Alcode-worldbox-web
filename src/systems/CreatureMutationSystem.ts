// Creature Mutation System (v2.13) - Environmental factors cause genetic mutations
// Pollution, ley lines, corruption, and radiation zones trigger mutations

import { EntityManager, EntityId, PositionComponent, CreatureComponent, NeedsComponent, GeneticsComponent } from '../ecs/Entity'
import { EventLog } from './EventLog'

export type MutationType = 'strength' | 'speed' | 'resilience' | 'gigantism' | 'bioluminescence'

export interface Mutation {
  type: MutationType
  magnitude: number    // 0.1 - 1.0
  tick: number
  /** Pre-computed render string — avoids toFixed per frame */
  magnitudeStr: string
}

interface WorldLike {
  tick: number
  getTile(x: number, y: number): number | null
}

const MUTATION_LABELS: Record<MutationType, string> = {
  strength: 'Enhanced Strength',
  speed: 'Hyper Speed',
  resilience: 'Thick Hide',
  gigantism: 'Gigantism',
  bioluminescence: 'Bioluminescence',
}

const MUTATION_COLORS: Record<MutationType, string> = {
  strength: '#f44',
  speed: '#4f4',
  resilience: '#88f',
  gigantism: '#f84',
  bioluminescence: '#4ff',
}

const CHECK_INTERVAL = 800
const MUTATION_CHANCE = 0.02
const MAX_MUTATIONS_PER_ENTITY = 3
const MAX_DISPLAY = 5

const MUTATION_TYPES: MutationType[] = ['strength', 'speed', 'resilience', 'gigantism', 'bioluminescence']

export class CreatureMutationSystem {
  private mutations: Map<EntityId, Mutation[]> = new Map()
  private nextCheckTick = CHECK_INTERVAL
  private recentMutations: { entityId: EntityId; mutation: Mutation; fadeTick: number }[] = []

  /** Get all mutations for an entity. */
  getMutations(entityId: EntityId): Mutation[] {
    return this.mutations.get(entityId) ?? []
  }

  /** Check if entity has a specific mutation type. */
  hasMutation(entityId: EntityId, type: MutationType): boolean {
    return this.getMutations(entityId).some(m => m.type === type)
  }

  update(dt: number, em: EntityManager, world: WorldLike): void {
    const tick = world.tick

    // Fade recent mutation notifications
    for (let _i = this.recentMutations.length - 1; _i >= 0; _i--) { if (!((r) => tick < r.fadeTick)(this.recentMutations[_i])) this.recentMutations.splice(_i, 1) }

    if (tick < this.nextCheckTick) return
    this.nextCheckTick = tick + CHECK_INTERVAL

    const entities = em.getEntitiesWithComponents('position', 'creature', 'genetics')
    for (const eid of entities) {
      const existing = this.mutations.get(eid)
      if (existing && existing.length >= MAX_MUTATIONS_PER_ENTITY) continue

      if (Math.random() > MUTATION_CHANCE) continue

      const pos = em.getComponent<PositionComponent>(eid, 'position')
      const genetics = em.getComponent<GeneticsComponent>(eid, 'genetics')
      if (!pos || !genetics) continue

      const tile = world.getTile(Math.floor(pos.x), Math.floor(pos.y))
      const envFactor = (tile === 7) ? 3.0 : 1.0

      if (Math.random() > MUTATION_CHANCE * envFactor) continue

      const type = MUTATION_TYPES[Math.floor(Math.random() * MUTATION_TYPES.length)]
      if (this.hasMutation(eid, type)) continue

      const magnitude = 0.1 + Math.random() * 0.9
      const mutation: Mutation = { type, magnitude, tick, magnitudeStr: (magnitude * 100).toFixed(0) }

      let muts = this.mutations.get(eid)
      if (!muts) {
        muts = []
        this.mutations.set(eid, muts)
      }
      muts.push(mutation)

      // Apply stat effects
      this.applyMutation(em, eid, mutation)

      this.recentMutations.push({ entityId: eid, mutation, fadeTick: tick + 300 })
      if (this.recentMutations.length > MAX_DISPLAY) this.recentMutations.shift()

      const cc = em.getComponent<CreatureComponent>(eid, 'creature')
      const name = cc?.name ?? `Entity#${eid}`
      EventLog.log('mutation', `${name} mutated: ${MUTATION_LABELS[type]} (${(magnitude * 100).toFixed(0)}%)`, tick)
    }
  }

  private applyMutation(em: EntityManager, eid: EntityId, mutation: Mutation): void {
    const cc = em.getComponent<CreatureComponent>(eid, 'creature')
    const needs = em.getComponent<NeedsComponent>(eid, 'needs')
    if (!cc) return

    switch (mutation.type) {
      case 'strength':
        cc.damage = Math.floor(cc.damage * (1 + mutation.magnitude * 0.5))
        break
      case 'speed':
        cc.speed = Math.min(cc.speed * (1 + mutation.magnitude * 0.3), 5)
        break
      case 'resilience':
        if (needs) needs.health = Math.min(100, needs.health + Math.floor(mutation.magnitude * 20))
        break
      case 'gigantism':
        cc.damage = Math.floor(cc.damage * (1 + mutation.magnitude * 0.3))
        if (needs) needs.health = Math.min(100, needs.health + Math.floor(mutation.magnitude * 15))
        break
      case 'bioluminescence':
        // Visual only - no stat change
        break
    }
  }

  /** Clean up mutations for dead entities. */
  cleanup(em: EntityManager): void {
    for (const eid of this.mutations.keys()) {
      const needs = em.getComponent<NeedsComponent>(eid, 'needs')
      if (!needs || needs.health <= 0) this.mutations.delete(eid)
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.recentMutations.length === 0) return

    ctx.save()
    ctx.font = '10px monospace'
    for (let i = 0; i < this.recentMutations.length; i++) {
      const r = this.recentMutations[i]
      const label = MUTATION_LABELS[r.mutation.type]
      const color = MUTATION_COLORS[r.mutation.type]
      const bx = ctx.canvas.width - 240, by = 300 + i * 20

      ctx.globalAlpha = 0.8
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(bx, by, 230, 16)
      ctx.fillStyle = color
      ctx.fillText(`* ${label} (${r.mutation.magnitudeStr}%)`, bx + 4, by + 12)
    }
    ctx.restore()
  }
}
