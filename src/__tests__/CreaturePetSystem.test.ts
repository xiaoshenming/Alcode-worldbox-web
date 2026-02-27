import { describe, it, expect, beforeEach } from 'vitest'
import { CreaturePetSystem } from '../systems/CreaturePetSystem'
function makeSys() { return new CreaturePetSystem() }
describe('CreaturePetSystem', () => {
  let sys: CreaturePetSystem
  beforeEach(() => { sys = makeSys() })
  it('getPets初始为空Map', () => { expect(sys.getPets().size).toBe(0) })
  it('getPetCount初始为0', () => { expect(sys.getPetCount()).toBe(0) })
  it('getPet未知id返回undefined', () => { expect(sys.getPet(999)).toBeUndefined() })
  it('注入后getPetCount增加', () => {
    ;(sys as any).pets.set(1, { ownerId: 1, petId: 2, bond: 50 })
    expect(sys.getPetCount()).toBe(1)
  })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
