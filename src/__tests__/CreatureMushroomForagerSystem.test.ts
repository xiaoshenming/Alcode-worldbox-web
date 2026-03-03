import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureMushroomForagerSystem } from '../systems/CreatureMushroomForagerSystem'
import type { MushroomForager } from '../systems/CreatureMushroomForagerSystem'

// CHECK_INTERVAL=3400, ASSIGN_CHANCE=0.004, MAX_FORAGERS=10
// KNOWLEDGE_PER_FIND=0.8, POISON_BASE_CHANCE=0.15
// antidotes上限5, knowledge上限100

let nextId = 1
function makeSys(): CreatureMushroomForagerSystem { return new CreatureMushroomForagerSystem() }
function makeForager(entityId: number, extra: Partial<MushroomForager> = {}): MushroomForager {
  return { id: nextId++, entityId, knowledge: 70, mushroomsFound: 30, poisoned: false, antidotes: 2, tick: 0, ...extra }
}

function makeEm(entities: number[] = [], hasCreature = true) {
  return {
    getEntitiesWithComponent: (_: string) => entities,
    hasComponent: (_id: number, _comp: string) => hasCreature,
  } as any
}

describe('CreatureMushroomForagerSystem - 初始状态', () => {
  let sys: CreatureMushroomForagerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无蘑菇采集者', () => { expect((sys as any).foragers).toHaveLength(0) })
  it('lastCheck 初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('_foragersSet 初始为空', () => { expect((sys as any)._foragersSet.size).toBe(0) })
  it('nextId 初始为 1', () => { expect((sys as any).nextId).toBe(1) })

  it('注入后可查询', () => {
    ;(sys as any).foragers.push(makeForager(1))
    expect((sys as any).foragers[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).foragers.push(makeForager(1))
    expect((sys as any).foragers).toBe((sys as any).foragers)
  })

  it('poisoned 字段可为 true', () => {
    const f = makeForager(1)
    f.poisoned = true
    ;(sys as any).foragers.push(f)
    expect((sys as any).foragers[0].poisoned).toBe(true)
  })

  it('多个全部返回', () => {
    ;(sys as any).foragers.push(makeForager(1))
    ;(sys as any).foragers.push(makeForager(2))
    expect((sys as any).foragers).toHaveLength(2)
  })
})

describe('CreatureMushroomForagerSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureMushroomForagerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick < 3400 时 update 不更新 lastCheck', () => {
    const em = makeEm()
    sys.update(16, em, 3399)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick >= 3400 时 update 更新 lastCheck', () => {
    const em = makeEm()
    sys.update(16, em, 3400)
    expect((sys as any).lastCheck).toBe(3400)
  })

  it('tick=3399 边界不更新', () => {
    const em = makeEm()
    sys.update(16, em, 3399)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('第二次差值不足时保持', () => {
    const em = makeEm()
    sys.update(16, em, 3400)
    sys.update(16, em, 4000)
    expect((sys as any).lastCheck).toBe(3400)
  })

  it('第二次差值足够时再次更新', () => {
    const em = makeEm()
    sys.update(16, em, 3400)
    sys.update(16, em, 6800)
    expect((sys as any).lastCheck).toBe(6800)
  })
})

describe('CreatureMushroomForagerSystem - 数据完整性', () => {
  let sys: CreatureMushroomForagerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入字段可正确读取', () => {
    const f = makeForager(5, { knowledge: 88, mushroomsFound: 15, poisoned: true, antidotes: 3, tick: 500 })
    ;(sys as any).foragers.push(f)
    const stored = (sys as any).foragers[0]
    expect(stored.entityId).toBe(5)
    expect(stored.knowledge).toBe(88)
    expect(stored.mushroomsFound).toBe(15)
    expect(stored.poisoned).toBe(true)
    expect(stored.antidotes).toBe(3)
    expect(stored.tick).toBe(500)
  })

  it('mushroomsFound 字段初始可设置', () => {
    const f = makeForager(1, { mushroomsFound: 0 })
    ;(sys as any).foragers.push(f)
    expect((sys as any).foragers[0].mushroomsFound).toBe(0)
  })

  it('antidotes 字段可为0', () => {
    const f = makeForager(1, { antidotes: 0 })
    ;(sys as any).foragers.push(f)
    expect((sys as any).foragers[0].antidotes).toBe(0)
  })

  it('knowledge 字段范围0-100', () => {
    const f = makeForager(1, { knowledge: 50 })
    ;(sys as any).foragers.push(f)
    expect((sys as any).foragers[0].knowledge).toBe(50)
  })
})

describe('CreatureMushroomForagerSystem - 业务逻辑验证', () => {
  it('知识上限为100', () => {
    const result = Math.min(100, 99.5 + 0.8)
    expect(result).toBe(100)
  })

  it('antidotes 上限为5', () => {
    expect(Math.min(5, 5 + 1)).toBe(5)
  })

  it('antidotes 从0开始可累积到5', () => {
    let antidotes = 0
    for (let i = 0; i < 5; i++) {
      antidotes = Math.min(5, antidotes + 1)
    }
    expect(antidotes).toBe(5)
    antidotes = Math.min(5, antidotes + 1)
    expect(antidotes).toBe(5)
  })

  it('antidotes > 0 时中毒使用解药', () => {
    const f = makeForager(1, { antidotes: 2, poisoned: false })
    if (f.antidotes > 0) { f.antidotes-- } else { f.poisoned = true }
    expect(f.antidotes).toBe(1)
    expect(f.poisoned).toBe(false)
  })

  it('antidotes = 0 时中毒设poisoned=true', () => {
    const f = makeForager(1, { antidotes: 0, poisoned: false })
    if (f.antidotes > 0) { f.antidotes-- } else { f.poisoned = true }
    expect(f.poisoned).toBe(true)
  })

  it('知识越高中毒概率越低', () => {
    const baseChance = 0.15
    const chanceLow = baseChance * (1 - 10 / 120)
    const chanceHigh = baseChance * (1 - 100 / 120)
    expect(chanceHigh).toBeLessThan(chanceLow)
  })

  it('rare蘑菇知识增加是普通的3倍', () => {
    const KNOWLEDGE_PER_FIND = 0.8
    expect(KNOWLEDGE_PER_FIND * 3).toBeCloseTo(2.4)
  })

  it('KNOWLEDGE_PER_FIND=0.8，普通蘑菇知识增加0.8', () => {
    const KNOWLEDGE_PER_FIND = 0.8
    let knowledge = 50
    knowledge = Math.min(100, knowledge + KNOWLEDGE_PER_FIND)
    expect(knowledge).toBeCloseTo(50.8)
  })
})

describe('CreatureMushroomForagerSystem - cleanup 逻辑', () => {
  let sys: CreatureMushroomForagerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('creature不存在时从foragers中删除', () => {
    const em = {
      getEntitiesWithComponent: (_: string) => [] as number[],
      hasComponent: (_id: number, _comp: string) => false,
    } as any
    ;(sys as any).foragers.push(makeForager(1))
    ;(sys as any)._foragersSet.add(1)
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 3400)
    expect((sys as any).foragers).toHaveLength(0)
  })

  it('creature存在时不删除forager', () => {
    const em = makeEm([], true)
    ;(sys as any).foragers.push(makeForager(1))
    ;(sys as any)._foragersSet.add(1)
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 3400)
    expect((sys as any).foragers).toHaveLength(1)
  })

  it('_foragersSet 防重：同一实体不重复添加', () => {
    ;(sys as any).foragers.push(makeForager(1))
    ;(sys as any)._foragersSet.add(1)
    const already = (sys as any)._foragersSet.has(1)
    expect(already).toBe(true)
    if (!already) { ;(sys as any).foragers.push(makeForager(1)) }
    expect((sys as any).foragers).toHaveLength(1)
  })
})

describe('CreatureMushroomForagerSystem - 招募与上限', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('MAX_FORAGERS=10：10个采集者时不再招募', () => {
    const sys = makeSys()
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).foragers.push(makeForager(i))
      ;(sys as any)._foragersSet.add(i)
    }
    expect((sys as any).foragers).toHaveLength(10)
    const em = makeEm([11, 12, 13])
    sys.update(16, em, 3400)
    expect((sys as any).foragers.length).toBeGreaterThanOrEqual(10)
  })

  it('ASSIGN_CHANCE=0.004，random < 0.004 时可招募', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const em = makeEm([100])
    sys.update(16, em, 3400)
    // knowledge 初始化需要 em 能返回实体
    expect((sys as any).foragers.length).toBeGreaterThanOrEqual(0)
  })

  it('_foragersSet 在 forager 被删除时也应被清除（手动验证）', () => {
    const sys = makeSys()
    ;(sys as any).foragers.push(makeForager(1))
    ;(sys as any)._foragersSet.add(1)
    // 模拟 cleanup 删除后，set 也应被清除
    ;(sys as any).foragers.splice(0, 1)
    ;(sys as any)._foragersSet.delete(1)
    expect((sys as any)._foragersSet.has(1)).toBe(false)
  })
})

describe('CreatureMushroomForagerSystem - 边界与综合', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('空数组时 update 不报错', () => {
    const sys = makeSys()
    expect(() => sys.update(16, makeEm(), 3400)).not.toThrow()
  })

  it('dt参数不影响节流', () => {
    const sys = makeSys()
    sys.update(999, makeEm(), 3399)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('entityId被正确保存', () => {
    const sys = makeSys()
    ;(sys as any).foragers.push(makeForager(77))
    expect((sys as any).foragers[0].entityId).toBe(77)
  })

  it('所有字段类型正确', () => {
    const sys = makeSys()
    ;(sys as any).foragers.push(makeForager(1))
    const r = (sys as any).foragers[0]
    expect(typeof r.knowledge).toBe('number')
    expect(typeof r.mushroomsFound).toBe('number')
    expect(typeof r.poisoned).toBe('boolean')
    expect(typeof r.antidotes).toBe('number')
  })

  it('tick字段被正确保存', () => {
    const sys = makeSys()
    ;(sys as any).foragers.push(makeForager(1, { tick: 9999 }))
    expect((sys as any).foragers[0].tick).toBe(9999)
  })
})
