import { describe, it, expect, beforeEach } from 'vitest'
import { CreaturePetSystem } from '../systems/CreaturePetSystem'
import type { PetType, CreaturePet } from '../systems/CreaturePetSystem'

// CHECK_INTERVAL=900, BOND_INTERVAL=600, MAX_PETS=120, BOND_GAIN=2

function makeSys() { return new CreaturePetSystem() }

describe('CreaturePetSystem', () => {
  let sys: CreaturePetSystem

  beforeEach(() => { sys = makeSys() })

  it('初始化不崩溃', () => { expect(sys).toBeDefined() })
  it('pets Map初始为空', () => { expect((sys as any).pets.size).toBe(0) })
  it('getPets()初始返回空Map', () => { expect(sys.getPets().size).toBe(0) })

  // ── CHECK_INTERVAL / BOND_INTERVAL 节流 ─────────────────────────────────

  it('tick差值<CHECK_INTERVAL(900)时不触发adoptPets', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 800)  // 800 < 900
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(900)时更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 900)
    expect((sys as any).lastCheck).toBe(900)
  })

  it('tick差值<BOND_INTERVAL(600)时不触发updateBonds', () => {
    const em = { getEntitiesWithComponents: () => [] as number[], getComponent: () => ({}) } as any
    ;(sys as any).lastBond = 0
    // 仅触发bond（不触发check）
    ;(sys as any).lastCheck = 999999  // 让check不触发
    sys.update(1, em, 500)  // 500 < 600
    expect((sys as any).lastBond).toBe(0)
  })

  it('tick差值>=BOND_INTERVAL(600)时更新lastBond', () => {
    const em = { getEntitiesWithComponents: () => [] as number[], getComponent: () => ({}) } as any
    ;(sys as any).lastBond = 0
    ;(sys as any).lastCheck = 999999
    sys.update(1, em, 600)  // 600 >= 600
    expect((sys as any).lastBond).toBe(600)
  })

  // ── updateBonds: bond递增 ────────────────────────────────────────────────

  it('updateBonds增加bond（BOND_GAIN=2），上限100', () => {
    const pets = (sys as any).pets as Map<number, CreaturePet>
    pets.set(1, { entityId: 1, petType: 'cat', name: 'Whiskers', bond: 50, age: 0, adoptedAt: 0 })
    const em = { getComponent: (id: number, _: string) => id === 1 ? {} : null } as any
    ;(sys as any).updateBonds(em)
    expect(pets.get(1)!.bond).toBe(52)
    expect(pets.get(1)!.age).toBe(1)
  })

  it('updateBonds：bond上限100不超出', () => {
    const pets = (sys as any).pets as Map<number, CreaturePet>
    pets.set(1, { entityId: 1, petType: 'dog', name: 'Rex', bond: 99, age: 0, adoptedAt: 0 })
    const em = { getComponent: (id: number, _: string) => id === 1 ? {} : null } as any
    ;(sys as any).updateBonds(em)
    expect(pets.get(1)!.bond).toBe(100)  // Math.min(100, 99+2) = 100
  })

  it('updateBonds：无creature时删除pet', () => {
    const pets = (sys as any).pets as Map<number, CreaturePet>
    pets.set(1, { entityId: 1, petType: 'bird', name: 'Chirp', bond: 50, age: 0, adoptedAt: 0 })
    pets.set(2, { entityId: 2, petType: 'rabbit', name: 'Clover', bond: 30, age: 0, adoptedAt: 0 })
    const em = { getComponent: (id: number, _: string) => id === 1 ? {} : null } as any
    ;(sys as any).updateBonds(em)
    expect(pets.has(1)).toBe(true)   // id=1有creature，保留
    expect(pets.has(2)).toBe(false)  // id=2无creature，删除
  })

  // ── PetType 完整性 ───────────────────────────────────────────────────────

  it('6种PetType可以注入到pets Map', () => {
    const types: PetType[] = ['cat', 'dog', 'bird', 'rabbit', 'ferret', 'lizard']
    const pets = (sys as any).pets as Map<number, CreaturePet>
    for (let i = 0; i < types.length; i++) {
      pets.set(i, { entityId: i, petType: types[i], name: 'test', bond: 20, age: 0, adoptedAt: 0 })
    }
    expect(pets.size).toBe(6)
  })

  it('getPets()返回内部Map引用', () => {
    const pets = (sys as any).pets as Map<number, CreaturePet>
    pets.set(1, { entityId: 1, petType: 'cat', name: 'Ash', bond: 30, age: 0, adoptedAt: 0 })
    expect(sys.getPets().get(1)!.petType).toBe('cat')
  })
})
