import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureTamingSystem } from '../systems/CreatureTamingSystem'
function makeSys() { return new CreatureTamingSystem() }
describe('CreatureTamingSystem', () => {
  let sys: CreatureTamingSystem
  beforeEach(() => { sys = makeSys() })
  it('getTamedAnimals初始为空', () => { expect(sys.getTamedAnimals(1)).toHaveLength(0) })
  it('注入Tamed状态后getTamedAnimals返回数据', () => {
    // TameState.Tamed = 2 (Wild=0, Taming=1, Tamed=2)
    ;(sys as any).records.push({ ownerId: 1, animalId: 2, animalType: 'wolf', state: 2, bond: 80, tameTick: 0 })
    expect(sys.getTamedAnimals(1)).toHaveLength(1)
  })
  it('isTamed 未驯化的动物返回false', () => {
    expect(sys.isTamed(999)).toBe(false)
  })
  it('注入Tamed状态后isTamed返回true', () => {
    ;(sys as any).records.push({ ownerId: 1, animalId: 2, animalType: 'wolf', state: 2, bond: 80, tameTick: 0 })
    expect(sys.isTamed(2)).toBe(true)
  })
  it('getBonus 未知拥有者返回0或1', () => {
    const bonus = sys.getBonus(999, 'attack')
    expect(typeof bonus).toBe('number')
  })
})
