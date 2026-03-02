import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureGladiatorSystem } from '../systems/CreatureGladiatorSystem'
import type { Gladiator, WeaponSkill } from '../systems/CreatureGladiatorSystem'

let nextId = 1
function makeSys(): CreatureGladiatorSystem { return new CreatureGladiatorSystem() }
function makeGladiator(entityId: number, overrides: Partial<Gladiator> = {}): Gladiator {
  return {
    id: nextId++,
    entityId,
    wins: 0,
    losses: 0,
    fame: 0,
    weaponSkill: 'sword',
    arenaId: 1,
    tick: 0,
    ...overrides,
  }
}

describe('CreatureGladiatorSystem', () => {
  let sys: CreatureGladiatorSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // 1. 初始无记录
  it('初始无角斗士', () => {
    expect((sys as any).gladiators).toHaveLength(0)
  })

  // 2. 注入后可查询
  it('注入后可按 entityId 查询', () => {
    ;(sys as any).gladiators.push(makeGladiator(99))
    expect((sys as any).gladiators[0].entityId).toBe(99)
  })

  // 3. WeaponSkill 包含5种
  it('WeaponSkill 支持 sword', () => {
    const g = makeGladiator(1, { weaponSkill: 'sword' })
    ;(sys as any).gladiators.push(g)
    expect((sys as any).gladiators[0].weaponSkill).toBe('sword')
  })

  it('WeaponSkill 支持 spear', () => {
    const g = makeGladiator(2, { weaponSkill: 'spear' })
    ;(sys as any).gladiators.push(g)
    expect((sys as any).gladiators[0].weaponSkill).toBe('spear')
  })

  it('WeaponSkill 支持 axe', () => {
    const g = makeGladiator(3, { weaponSkill: 'axe' })
    ;(sys as any).gladiators.push(g)
    expect((sys as any).gladiators[0].weaponSkill).toBe('axe')
  })

  it('WeaponSkill ��持 fists', () => {
    const g = makeGladiator(4, { weaponSkill: 'fists' })
    ;(sys as any).gladiators.push(g)
    expect((sys as any).gladiators[0].weaponSkill).toBe('fists')
  })

  it('WeaponSkill 支持 trident', () => {
    const g = makeGladiator(5, { weaponSkill: 'trident' })
    ;(sys as any).gladiators.push(g)
    expect((sys as any).gladiators[0].weaponSkill).toBe('trident')
  })

  // 4. fame 上限100（注入 fame=100，验证字段值）
  it('fame 字段可存储最大值100', () => {
    const g = makeGladiator(1, { fame: 100 })
    ;(sys as any).gladiators.push(g)
    expect((sys as any).gladiators[0].fame).toBe(100)
  })

  // 5. tick差值<3200不更新lastCheck
  it('tick差值<3200时不更新lastCheck', () => {
    ;(sys as any).lastCheck = 10000
    const em = { getEntitiesWithComponent: () => [], hasComponent: () => false } as any
    sys.update(0, em, 10000 + 3199)
    expect((sys as any).lastCheck).toBe(10000)
  })

  // 6. tick差值>=3200更新lastCheck
  it('tick差值>=3200时更新lastCheck', () => {
    ;(sys as any).lastCheck = 10000
    const em = { getEntitiesWithComponent: () => [], hasComponent: () => false } as any
    sys.update(0, em, 10000 + 3200)
    expect((sys as any).lastCheck).toBe(13200)
  })

  // 7. 多个角斗士可共存
  it('多个角斗士可共存', () => {
    const skills: WeaponSkill[] = ['sword', 'spear', 'axe', 'fists', 'trident']
    skills.forEach((s, i) => {
      ;(sys as any).gladiators.push(makeGladiator(i + 1, { weaponSkill: s }))
    })
    expect((sys as any).gladiators).toHaveLength(5)
    skills.forEach((s, i) => {
      expect((sys as any).gladiators[i].weaponSkill).toBe(s)
    })
  })

  // 8. wins/losses 字段存储正确
  it('wins 和 losses 字段存储正确', () => {
    const g = makeGladiator(1, { wins: 10, losses: 3 })
    ;(sys as any).gladiators.push(g)
    expect((sys as any).gladiators[0].wins).toBe(10)
    expect((sys as any).gladiators[0].losses).toBe(3)
  })

  // 9. arenaId 分组字段存储正确
  it('arenaId 分组字段存储正确', () => {
    ;(sys as any).gladiators.push(makeGladiator(1, { arenaId: 0 }))
    ;(sys as any).gladiators.push(makeGladiator(2, { arenaId: 4 }))
    expect((sys as any).gladiators[0].arenaId).toBe(0)
    expect((sys as any).gladiators[1].arenaId).toBe(4)
  })

  // 10. cleanup：entity不存在时被删除
  it('update 时 creature 不存在的角斗士被删除', () => {
    ;(sys as any).gladiators.push(makeGladiator(1))
    ;(sys as any).lastCheck = 0
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: (_eid: number, _comp: string) => false,
    } as any
    sys.update(0, em, 3200)
    expect((sys as any).gladiators).toHaveLength(0)
  })

  // 11. cleanup：entity存在时保留
  it('update 时 creature 存在的角斗士保留', () => {
    ;(sys as any).gladiators.push(makeGladiator(1))
    ;(sys as any).lastCheck = 0
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: (eid: number, _comp: string) => eid === 1,
    } as any
    sys.update(0, em, 3200)
    expect((sys as any).gladiators).toHaveLength(1)
  })

  // 12. nextId 自增
  it('nextId 从1开始自增', () => {
    expect((sys as any).nextId).toBe(1)
  })
})
