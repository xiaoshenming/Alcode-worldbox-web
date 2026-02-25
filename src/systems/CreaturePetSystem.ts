// Creature Pet System (v2.46) - Creatures adopt small animals as pets
// Pets boost mood, provide companionship, and can assist in tasks
// Different pet types offer different bonuses

import { EntityManager, EntityId } from '../ecs/Entity'

export type PetType = 'cat' | 'dog' | 'bird' | 'rabbit' | 'ferret' | 'lizard'

export interface CreaturePet {
  entityId: EntityId
  petType: PetType
  name: string
  bond: number          // 0-100
  age: number
  adoptedAt: number
}

const CHECK_INTERVAL = 900
const BOND_INTERVAL = 600
const MAX_PETS = 120
const BOND_GAIN = 2

const PET_TYPES: PetType[] = ['cat', 'dog', 'bird', 'rabbit', 'ferret', 'lizard']

const PET_NAMES: Record<PetType, string[]> = {
  cat: ['Whiskers', 'Shadow', 'Mittens', 'Luna', 'Ash'],
  dog: ['Rex', 'Buddy', 'Fang', 'Scout', 'Bear'],
  bird: ['Chirp', 'Sky', 'Feather', 'Pip', 'Sparrow'],
  rabbit: ['Clover', 'Cotton', 'Hop', 'Snowball', 'Bun'],
  ferret: ['Noodle', 'Bandit', 'Ziggy', 'Dash', 'Weasel'],
  lizard: ['Scales', 'Spike', 'Gecko', 'Drake', 'Basil'],
}

export class CreaturePetSystem {
  private pets: Map<EntityId, CreaturePet> = new Map()
  private lastCheck = 0
  private lastBond = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.adoptPets(em, tick)
    }
    if (tick - this.lastBond >= BOND_INTERVAL) {
      this.lastBond = tick
      this.updateBonds(em)
    }
  }

  private adoptPets(em: EntityManager, tick: number): void {
    if (this.pets.size >= MAX_PETS) return
    const creatures = em.getEntitiesWithComponents('creature')
    for (const id of creatures) {
      if (this.pets.has(id)) continue
      if (this.pets.size >= MAX_PETS) break
      if (Math.random() > 0.04) continue
      const petType = PET_TYPES[Math.floor(Math.random() * PET_TYPES.length)]
      const names = PET_NAMES[petType]
      this.pets.set(id, {
        entityId: id,
        petType,
        name: names[Math.floor(Math.random() * names.length)],
        bond: 20 + Math.floor(Math.random() * 30),
        age: 0,
        adoptedAt: tick,
      })
    }
  }

  private updateBonds(em: EntityManager): void {
    for (const [id, pet] of this.pets) {
      if (!em.getComponent(id, 'creature')) {
        this.pets.delete(id)
        continue
      }
      pet.age++
      pet.bond = Math.min(100, pet.bond + BOND_GAIN)
      // Old pets may pass away
      if (pet.age > 200 && Math.random() < 0.01) {
        this.pets.delete(id)
      }
    }
  }

  getPet(id: EntityId): CreaturePet | undefined {
    return this.pets.get(id)
  }

  getPets(): Map<EntityId, CreaturePet> {
    return this.pets
  }

  getPetCount(): number {
    return this.pets.size
  }
}
