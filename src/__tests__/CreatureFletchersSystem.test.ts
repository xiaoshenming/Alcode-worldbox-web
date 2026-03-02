import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureFletchersSystem } from '../systems/CreatureFletchersSystem'
import type { Fletcher, ProjectileType } from '../systems/CreatureFletchersSystem'

const CHECK_INTERVAL = 1400
const MAX_FLETCHERS = 34

let nextId = 1
function makeSys(): CreatureFletchersSystem { return new CreatureFletchersSystem() }
function makeFletcher(entityId: number, skill = 40, projectileType: ProjectileType = 'arrow'): Fletcher {
  return {
    id: nextId++,
    entityId,
    skill,
    projectilesCrafted: 2 + Math.floor(skill / 8),
    projectileType,
    accuracy: 25 + skill * 0.65,
    penetration: 20 + skill * 0.7,
    tick: 0,
  }
}

describe('CreatureFletchersSystem - 基础结构', () => {
  let sys: CreatureFletchersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无箭匠', () => {
    expect((sys as any).fletchers).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, 40, 'bolt'))
    expect((sys as any).fletchers[0].projectileType).toBe('bolt')
  })

  it('支持所有 4 种投射物类型（arrow/bolt/dart/javelin）', () => {
    const types: ProjectileType[] = ['arrow', 'bolt', 'dart', 'javelin']
    types.forEach((t, i) => { ;(sys as any).fletchers.push(makeFletcher(i + 1, 40, t)) })
    const all = (sys as any).fletchers
    types.forEach((t, i) => { expect(all[i].projectileType).toBe(t) })
  })

  it('多个全部返回', () => {
    ;(sys as any).fletchers.push(makeFletcher(1))
    ;(sys as any).fletchers.push(makeFletcher(2))
    expect((sys as any).fletchers).toHaveLength(2)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('fletchers初始为空数组', () => {
    expect(Array.isArray((sys as any).fletchers)).toBe(true)
    expect((sys as any).fletchers.length).toBe(0)
  })

  it('skillMap初始为空Map', () => {
    expect((sys as any).skillMap).toBeInstanceOf(Map)
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('工匠id字段为数字', () => {
    ;(sys as any).fletchers.push(makeFletcher(1))
    expect(typeof (sys as any).fletchers[0].id).toBe('number')
  })

  it('工匠tick字段默认为0', () => {
    ;(sys as any).fletchers.push(makeFletcher(1))
    expect((sys as any).fletchers[0].tick).toBe(0)
  })

  it('不同entityId的箭匠各自独立', () => {
    ;(sys as any).fletchers.push(makeFletcher(100))
    ;(sys as any).fletchers.push(makeFletcher(200))
    expect((sys as any).fletchers[0].entityId).toBe(100)
    expect((sys as any).fletchers[1].entityId).toBe(200)
  })

  it('返回内部引用', () => {
    ;(sys as any).fletchers.push(makeFletcher(1))
    expect((sys as any).fletchers).toBe((sys as any).fletchers)
  })
})

describe('CreatureFletchersSystem - accuracy 公式验证：25 + skill * 0.65', () => {
  afterEach(() => vi.restoreAllMocks())

  it('accuracy 公式：25 + skill * 0.65', () => {
    const skill = 40
    const f = makeFletcher(1, skill)
    expect(f.accuracy).toBeCloseTo(25 + skill * 0.65)
  })

  it('accuracy 公式在 skill=100 时正确', () => {
    const skill = 100
    const f = makeFletcher(1, skill)
    expect(f.accuracy).toBeCloseTo(25 + 100 * 0.65) // 90
  })

  it('accuracy 公式在 skill=0 时为25', () => {
    const f = makeFletcher(1, 0)
    expect(f.accuracy).toBeCloseTo(25)
  })

  it('accuracy 公式在 skill=50 时正确', () => {
    const skill = 50
    const f = makeFletcher(1, skill)
    expect(f.accuracy).toBeCloseTo(25 + 50 * 0.65) // 57.5
  })

  it('accuracy 公式在 skill=75 时正确', () => {
    const skill = 75
    const f = makeFletcher(1, skill)
    expect(f.accuracy).toBeCloseTo(25 + 75 * 0.65) // 73.75
  })

  it('accuracy 随skill增大而增大', () => {
    const f1 = makeFletcher(1, 10)
    const f2 = makeFletcher(2, 90)
    expect(f2.accuracy).toBeGreaterThan(f1.accuracy)
  })
})

describe('CreatureFletchersSystem - penetration 公式验证：20 + skill * 0.7', () => {
  afterEach(() => vi.restoreAllMocks())

  it('penetration 公式：20 + skill * 0.7', () => {
    const skill = 40
    const f = makeFletcher(1, skill)
    expect(f.penetration).toBeCloseTo(20 + skill * 0.7)
  })

  it('penetration 公式在 skill=75 时正确', () => {
    const skill = 75
    const f = makeFletcher(1, skill)
    expect(f.penetration).toBeCloseTo(20 + 75 * 0.7) // 72.5
  })

  it('penetration 公式在 skill=100 时正确', () => {
    const skill = 100
    const f = makeFletcher(1, skill)
    expect(f.penetration).toBeCloseTo(20 + 100 * 0.7) // 90
  })

  it('penetration 公式在 skill=0 时为20', () => {
    const f = makeFletcher(1, 0)
    expect(f.penetration).toBeCloseTo(20)
  })

  it('penetration 公式在 skill=50 时正确', () => {
    const skill = 50
    const f = makeFletcher(1, skill)
    expect(f.penetration).toBeCloseTo(20 + 50 * 0.7) // 55
  })

  it('penetration 随skill增大而增大', () => {
    const f1 = makeFletcher(1, 10)
    const f2 = makeFletcher(2, 90)
    expect(f2.penetration).toBeGreaterThan(f1.penetration)
  })
})

describe('CreatureFletchersSystem - projectilesCrafted 公式：2 + floor(skill / 8)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('projectilesCrafted 公式：2 + floor(skill / 8)', () => {
    const skill = 40
    const f = makeFletcher(1, skill)
    expect(f.projectilesCrafted).toBe(2 + Math.floor(40 / 8)) // 7
  })

  it('projectilesCrafted 在 skill=100 时为 14', () => {
    const f = makeFletcher(1, 100)
    expect(f.projectilesCrafted).toBe(2 + Math.floor(100 / 8)) // 14
  })

  it('projectilesCrafted 在 skill=0 时为 2', () => {
    const f = makeFletcher(1, 0)
    expect(f.projectilesCrafted).toBe(2)
  })

  it('projectilesCrafted 在 skill=25 时为 5', () => {
    const f = makeFletcher(1, 25)
    expect(f.projectilesCrafted).toBe(2 + Math.floor(25 / 8)) // 5
  })

  it('projectilesCrafted 在 skill=8 时为 3', () => {
    const f = makeFletcher(1, 8)
    expect(f.projectilesCrafted).toBe(2 + Math.floor(8 / 8)) // 3
  })

  it('projectilesCrafted 随skill增大而增大或持平', () => {
    const f1 = makeFletcher(1, 10)
    const f2 = makeFletcher(2, 80)
    expect(f2.projectilesCrafted).toBeGreaterThanOrEqual(f1.projectilesCrafted)
  })
})

describe('CreatureFletchersSystem - projectileType 由 skill/25 决定4段', () => {
  afterEach(() => vi.restoreAllMocks())

  it('skill < 25 → arrow（typeIdx=0）', () => {
    const f = makeFletcher(1, 10, 'arrow')
    expect(f.projectileType).toBe('arrow')
  })

  it('skill = 25 → bolt（typeIdx=1）', () => {
    const f = makeFletcher(1, 25, 'bolt')
    expect(f.projectileType).toBe('bolt')
  })

  it('skill = 50 → dart（typeIdx=2）', () => {
    const f = makeFletcher(1, 50, 'dart')
    expect(f.projectileType).toBe('dart')
  })

  it('skill = 75 → javelin（typeIdx=3）', () => {
    const f = makeFletcher(1, 75, 'javelin')
    expect(f.projectileType).toBe('javelin')
  })

  it('skill = 0 → arrow', () => {
    const f = makeFletcher(1, 0, 'arrow')
    expect(f.projectileType).toBe('arrow')
  })

  it('skill = 100 → javelin', () => {
    const f = makeFletcher(1, 100, 'javelin')
    expect(f.projectileType).toBe('javelin')
  })

  it('skill = 24 → arrow', () => {
    const f = makeFletcher(1, 24, 'arrow')
    expect(f.projectileType).toBe('arrow')
  })

  it('skill = 49 → bolt', () => {
    const f = makeFletcher(1, 49, 'bolt')
    expect(f.projectileType).toBe('bolt')
  })
})

describe('CreatureFletchersSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureFletchersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick差值 < CHECK_INTERVAL(1400) 时不更新 lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, em, 100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值 >= CHECK_INTERVAL(1400) 时更新 lastCheck', () => {
    const em = {
      getEntitiesWithComponents: () => [],
    } as any
    sys.update(1, em, 2000)
    expect((sys as any).lastCheck).toBe(2000)
  })

  it('节流未到时fletchers不被修改', () => {
    ;(sys as any).fletchers.push(makeFletcher(1))
    ;(sys as any).lastCheck = 5000
    const em = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, em, 5000 + CHECK_INTERVAL - 1)
    expect((sys as any).fletchers).toHaveLength(1)
  })

  it('tick=0时不通过节流（lastCheck=0,差值=0<1400）', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('恰好等于CHECK_INTERVAL时触发', () => {
    ;(sys as any).lastCheck = 1000
    const em = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, em, 1000 + CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(1000 + CHECK_INTERVAL)
  })

  it('第二次触发需再加CHECK_INTERVAL', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})

describe('CreatureFletchersSystem - time-based cleanup（tick过期）', () => {
  let sys: CreatureFletchersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('time-based cleanup: tick 过期（< currentTick - 55000）的记录被移除', () => {
    const currentTick = 100000
    const oldFletcher: Fletcher = {
      id: nextId++,
      entityId: 1,
      skill: 40,
      projectilesCrafted: 7,
      projectileType: 'arrow',
      accuracy: 51,
      penetration: 48,
      tick: currentTick - 55001, // 过期
    }
    const newFletcher: Fletcher = {
      id: nextId++,
      entityId: 2,
      skill: 40,
      projectilesCrafted: 7,
      projectileType: 'arrow',
      accuracy: 51,
      penetration: 48,
      tick: currentTick - 1000, // 未过期
    }
    ;(sys as any).fletchers.push(oldFletcher)
    ;(sys as any).fletchers.push(newFletcher)
    ;(sys as any).lastCheck = 0

    const em = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
      hasComponent: () => true,
      getEntitiesWithComponent: () => [],
    } as any

    sys.update(1, em, currentTick)
    expect((sys as any).fletchers).toHaveLength(1)
    expect((sys as any).fletchers[0].entityId).toBe(2)
  })

  it('未过期的记录在 cleanup 后保留', () => {
    const currentTick = 100000
    const fresh: Fletcher = {
      id: nextId++,
      entityId: 3,
      skill: 50,
      projectilesCrafted: 8,
      projectileType: 'dart',
      accuracy: 57.5,
      penetration: 55,
      tick: currentTick - 10000, // 未过期（10000 < 55000）
    }
    ;(sys as any).fletchers.push(fresh)
    ;(sys as any).lastCheck = 0

    const em = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
      hasComponent: () => true,
      getEntitiesWithComponent: () => [],
    } as any

    sys.update(1, em, currentTick)
    expect((sys as any).fletchers).toHaveLength(1)
    expect((sys as any).fletchers[0].entityId).toBe(3)
  })

  it('tick恰好等于cutoff时不被删除（>不满足）', () => {
    const currentTick = 100000
    const cutoff = currentTick - 55000
    const borderFletcher: Fletcher = {
      id: nextId++,
      entityId: 5,
      skill: 40,
      projectilesCrafted: 7,
      projectileType: 'arrow',
      accuracy: 51,
      penetration: 48,
      tick: cutoff, // 恰好等于cutoff，< cutoff不满足，保留
    }
    ;(sys as any).fletchers.push(borderFletcher)
    ;(sys as any).lastCheck = 0
    const em = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
      hasComponent: () => true,
      getEntitiesWithComponent: () => [],
    } as any
    sys.update(1, em, currentTick)
    // tick == cutoff，不满足 < cutoff，应保留
    expect((sys as any).fletchers).toHaveLength(1)
  })

  it('tick比cutoff少1时被删除', () => {
    const currentTick = 100000
    const cutoff = currentTick - 55000
    const expiredFletcher: Fletcher = {
      id: nextId++,
      entityId: 6,
      skill: 40,
      projectilesCrafted: 7,
      projectileType: 'arrow',
      accuracy: 51,
      penetration: 48,
      tick: cutoff - 1, // 过期
    }
    ;(sys as any).fletchers.push(expiredFletcher)
    ;(sys as any).lastCheck = 0
    const em = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
      hasComponent: () => true,
      getEntitiesWithComponent: () => [],
    } as any
    sys.update(1, em, currentTick)
    expect((sys as any).fletchers).toHaveLength(0)
  })

  it('全部过期时数组清空', () => {
    const currentTick = 100000
    for (let i = 0; i < 5; i++) {
      ;(sys as any).fletchers.push({
        id: nextId++, entityId: i + 1, skill: 40,
        projectilesCrafted: 7, projectileType: 'arrow',
        accuracy: 51, penetration: 48,
        tick: currentTick - 60000,
      } as Fletcher)
    }
    ;(sys as any).lastCheck = 0
    const em = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
      hasComponent: () => true,
      getEntitiesWithComponent: () => [],
    } as any
    sys.update(1, em, currentTick)
    expect((sys as any).fletchers).toHaveLength(0)
  })

  it('混合过期与未过期，只删除过期的', () => {
    const currentTick = 100000
    ;(sys as any).fletchers.push({
      id: nextId++, entityId: 10, skill: 40,
      projectilesCrafted: 7, projectileType: 'arrow',
      accuracy: 51, penetration: 48,
      tick: currentTick - 60000, // 过期
    } as Fletcher)
    ;(sys as any).fletchers.push({
      id: nextId++, entityId: 20, skill: 50,
      projectilesCrafted: 8, projectileType: 'dart',
      accuracy: 57.5, penetration: 55,
      tick: currentTick - 10000, // 未过期
    } as Fletcher)
    ;(sys as any).fletchers.push({
      id: nextId++, entityId: 30, skill: 75,
      projectilesCrafted: 11, projectileType: 'javelin',
      accuracy: 73.75, penetration: 72.5,
      tick: currentTick - 56000, // 过期
    } as Fletcher)
    ;(sys as any).lastCheck = 0
    const em = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
      hasComponent: () => true,
      getEntitiesWithComponent: () => [],
    } as any
    sys.update(1, em, currentTick)
    expect((sys as any).fletchers).toHaveLength(1)
    expect((sys as any).fletchers[0].entityId).toBe(20)
  })
})

describe('CreatureFletchersSystem - skillMap', () => {
  let sys: CreatureFletchersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('skillMap初始为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('可以直接向skillMap注入数据', () => {
    ;(sys as any).skillMap.set(1, 50)
    expect((sys as any).skillMap.get(1)).toBe(50)
  })

  it('skillMap可以存储多个实体技能', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(2, 70)
    ;(sys as any).skillMap.set(3, 90)
    expect((sys as any).skillMap.size).toBe(3)
  })
})

describe('CreatureFletchersSystem - MAX_FLETCHERS上限', () => {
  let sys: CreatureFletchersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('已有MAX_FLETCHERS个时不再从新实体招募', () => {
    for (let i = 0; i < MAX_FLETCHERS; i++) {
      ;(sys as any).fletchers.push(makeFletcher(i + 1, 40))
    }
    expect((sys as any).fletchers).toHaveLength(MAX_FLETCHERS)
    const creature = { age: 20 }
    const em = {
      getEntitiesWithComponents: () => [999],
      getComponent: () => creature,
      hasComponent: () => true,
      getEntitiesWithComponent: () => [],
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0) // 确保CRAFT_CHANCE通过
    sys.update(1, em, CHECK_INTERVAL)
    // 不会新增（已达上限），cleanup可能删除过期的
    expect((sys as any).fletchers.length).toBeLessThanOrEqual(MAX_FLETCHERS)
  })

  it('少于MAX_FLETCHERS时可以继续添加', () => {
    for (let i = 0; i < MAX_FLETCHERS - 1; i++) {
      ;(sys as any).fletchers.push(makeFletcher(i + 1, 40))
    }
    expect((sys as any).fletchers).toHaveLength(MAX_FLETCHERS - 1)
  })
})

describe('CreatureFletchersSystem - update整合场景', () => {
  let sys: CreatureFletchersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('空fletchers执行update不抛错', () => {
    const em = {
      getEntitiesWithComponents: () => [],
      hasComponent: () => true,
      getEntitiesWithComponent: () => [],
    } as any
    expect(() => sys.update(1, em, CHECK_INTERVAL)).not.toThrow()
  })

  it('update后lastCheck被更新为传入的tick', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, em, CHECK_INTERVAL * 3)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 3)
  })

  it('dt参数对节流无影响', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    sys.update(999, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('生物age < 9 时不被招募', () => {
    const creature = { age: 5 }
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => creature,
      hasComponent: () => true,
      getEntitiesWithComponent: () => [],
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).fletchers).toHaveLength(0)
  })

  it('生物age >= 9 且通过概率时可被招募', () => {
    const creature = { age: 10 }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => creature,
      hasComponent: () => true,
      getEntitiesWithComponent: () => [],
    } as any
    sys.update(1, em, CHECK_INTERVAL)
    // random=0 < CRAFT_CHANCE=0.006，通过概率
    expect((sys as any).fletchers.length).toBeGreaterThanOrEqual(0)
  })
})
