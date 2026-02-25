// Creature Falconry System (v3.110) - Trained falcons for hunting
// Falconers train birds of prey to assist in hunting and scouting

import { EntityManager, EntityId } from '../ecs/Entity'

export type FalconBreed = 'peregrine' | 'gyrfalcon' | 'merlin' | 'kestrel'
export type FalconTask = 'hunting' | 'scouting' | 'resting' | 'training'

export interface TrainedFalcon {
  id: number
  ownerId: EntityId
  breed: FalconBreed
  task: FalconTask
  skill: number
  loyalty: number
  stamina: number
  tick: number
}

const CHECK_INTERVAL = 2500
const TAME_CHANCE = 0.003
const MAX_FALCONS = 25

const BREEDS: FalconBreed[] = ['peregrine', 'gyrfalcon', 'merlin', 'kestrel']
const TASKS: FalconTask[] = ['hunting', 'scouting', 'resting', 'training']

export class CreatureFalconrySystem {
  private falcons: TrainedFalcon[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Tame new falcons
    if (this.falcons.length < MAX_FALCONS && Math.random() < TAME_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        this.falcons.push({
          id: this.nextId++,
          ownerId: eid,
          breed: BREEDS[Math.floor(Math.random() * BREEDS.length)],
          task: 'training',
          skill: 10 + Math.floor(Math.random() * 30),
          loyalty: 40 + Math.floor(Math.random() * 30),
          stamina: 100,
          tick,
        })
      }
    }

    // Update falcon activities
    for (const f of this.falcons) {
      switch (f.task) {
        case 'training':
          f.skill = Math.min(100, f.skill + 0.3)
          f.loyalty = Math.min(100, f.loyalty + 0.2)
          if (f.skill > 50) f.task = TASKS[Math.floor(Math.random() * 2)] // hunting or scouting
          break
        case 'hunting':
          f.stamina -= 1.5
          if (f.stamina < 20) f.task = 'resting'
          break
        case 'scouting':
          f.stamina -= 0.8
          if (f.stamina < 20) f.task = 'resting'
          break
        case 'resting':
          f.stamina = Math.min(100, f.stamina + 3)
          if (f.stamina > 80) f.task = TASKS[Math.floor(Math.random() * 2)]
          break
      }
      f.loyalty -= 0.05
    }

    // Remove falcons with no loyalty
    for (let i = this.falcons.length - 1; i >= 0; i--) {
      if (this.falcons[i].loyalty <= 0) this.falcons.splice(i, 1)
    }
  }

  getFalcons(): readonly TrainedFalcon[] { return this.falcons }
}
