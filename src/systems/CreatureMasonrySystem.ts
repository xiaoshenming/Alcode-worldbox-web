// Creature Masonry System (v3.106) - Skilled masons build stone structures
// Masons improve building durability and create monuments for their civilization

import { EntityManager, EntityId } from '../ecs/Entity'

export type StoneProject = 'wall' | 'tower' | 'monument' | 'bridge' | 'aqueduct'
export type ProjectPhase = 'quarrying' | 'shaping' | 'building' | 'complete'

export interface MasonryProject {
  id: number
  masonId: EntityId
  type: StoneProject
  phase: ProjectPhase
  x: number
  y: number
  quality: number
  progress: number
  tick: number
}

const CHECK_INTERVAL = 2500
const START_CHANCE = 0.004
const MAX_PROJECTS = 30

const PROJECT_TYPES: StoneProject[] = ['wall', 'tower', 'monument', 'bridge', 'aqueduct']

export class CreatureMasonrySystem {
  private projects: MasonryProject[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Start new projects
    if (this.projects.length < MAX_PROJECTS && Math.random() < START_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        const pos = em.getComponent(eid, 'position') as { x: number; y: number } | undefined
        if (pos) {
          this.projects.push({
            id: this.nextId++,
            masonId: eid,
            type: PROJECT_TYPES[Math.floor(Math.random() * PROJECT_TYPES.length)],
            phase: 'quarrying',
            x: pos.x,
            y: pos.y,
            quality: 30 + Math.floor(Math.random() * 70),
            progress: 0,
            tick,
          })
        }
      }
    }

    // Advance project phases
    for (const p of this.projects) {
      if (p.phase === 'complete') continue
      p.progress += 0.5 + p.quality * 0.005
      if (p.progress >= 100) {
        p.progress = 0
        if (p.phase === 'quarrying') p.phase = 'shaping'
        else if (p.phase === 'shaping') p.phase = 'building'
        else if (p.phase === 'building') p.phase = 'complete'
      }
    }

    // Remove old completed projects
    const cutoff = tick - 120000
    for (let i = this.projects.length - 1; i >= 0; i--) {
      if (this.projects[i].phase === 'complete' && this.projects[i].tick < cutoff) {
        this.projects.splice(i, 1)
      }
    }
  }

  getProjects(): readonly MasonryProject[] { return this.projects }
}
