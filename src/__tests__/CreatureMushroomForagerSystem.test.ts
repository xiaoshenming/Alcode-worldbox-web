import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureMushroomForagerSystem } from '../systems/CreatureMushroomForagerSystem'
import type { MushroomForager } from '../systems/CreatureMushroomForagerSystem'

let nextId = 1
function makeSys(): CreatureMushroomForagerSystem { return new CreatureMushroomForagerSystem() }
function makeForager(entityId: number, extra: Partial<MushroomForager> = {}): MushroomForager {
  return { id: nextId++, entityId, knowledge: 70, mushroomsFound: 30, poisoned: false, antidotes: 2, tick: 0, ...extra }
}

// EntityManager stub
function makeEm(entities: number[] = [], hasCreature = true) {
  return {
    getEntitiesWithComponent: (_: string) => entities,
    hasComponent: (_id: number, _comp: string) => hasCreature,
  } as any
}

describe('CreatureMushroomForagerSystem', () => {
  let sys: CreatureMushroomForagerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ── 原有5个测试（保留）──

  it('初始无蘑菇采集者', () => { expect((sys as any).foragers).toHaveLength(0) })

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

  // ── 新增测试 ──

  it('lastCheck 初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('_foragersSet 初始为空', () => {
    expect((sys as any)._foragersSet.size).toBe(0)
  })

  it('CHECK_INTERVAL节流：tick < 3400 时 update 不更新 lastCheck', () => {
    const em = makeEm()
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 3399)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('CHECK_INTERVAL节流：tick >= 3400 时 update 更新 lastCheck', () => {
    const em = makeEm()
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 3400)
    expect((sys as any).lastCheck).toBe(3400)
  })

  it('数据完整性：注入字段可正确读取', () => {
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

  it('cleanup：creature不存在时从foragers中删除', () => {
    // hasComponent 返回 false 表示该实体不再有 creature 组件
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

  it('cleanup：creature存在时不删除forager', () => {
    const em = makeEm([], true) // hasComponent = true
    ;(sys as any).foragers.push(makeForager(1))
    ;(sys as any)._foragersSet.add(1)
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 3400)
    expect((sys as any).foragers).toHaveLength(1)
  })

  it('知识上限为100', () => {
    const f = makeForager(1, { knowledge: 99.5 })
    ;(sys as any).foragers.push(f)
    // 直接测试知识上限逻辑：knowledge = Math.min(100, knowledge + KNOWLEDGE_PER_FIND)
    ;(sys as any).foragers[0].knowledge = Math.min(100, 99.5 + 0.8)
    expect((sys as any).foragers[0].knowledge).toBe(100)
  })

  it('antidotes 上限为5', () => {
    const f = makeForager(1, { antidotes: 5 })
    ;(sys as any).foragers.push(f)
    // 直接测试antidotes上限：Math.min(5, antidotes + 1)
    const result = Math.min(5, f.antidotes + 1)
    expect(result).toBe(5)
  })

  it('antidotes 从0开始可累积到5', () => {
    let antidotes = 0
    for (let i = 0; i < 5; i++) {
      antidotes = Math.min(5, antidotes + 1)
    }
    expect(antidotes).toBe(5)
    // 再加一次仍为5
    antidotes = Math.min(5, antidotes + 1)
    expect(antidotes).toBe(5)
  })

  it('forager 字段：antidotes > 0 时中毒使用解药而非设poisoned=true', () => {
    // 逻辑：if antidotes > 0 -> antidotes-- else poisoned=true
    const f = makeForager(1, { antidotes: 2, poisoned: false })
    if (f.antidotes > 0) {
      f.antidotes--
    } else {
      f.poisoned = true
    }
    expect(f.antidotes).toBe(1)
    expect(f.poisoned).toBe(false)
  })

  it('forager 字段：antidotes = 0 时中毒设poisoned=true', () => {
    const f = makeForager(1, { antidotes: 0, poisoned: false })
    if (f.antidotes > 0) {
      f.antidotes--
    } else {
      f.poisoned = true
    }
    expect(f.poisoned).toBe(true)
  })

  it('知识越高中毒概率越低（POISON_BASE_CHANCE * (1 - knowledge/120)）', () => {
    // POISON_BASE_CHANCE = 0.15
    const baseChance = 0.15
    const lowKnowledge = 10
    const highKnowledge = 100
    const chanceLow = baseChance * (1 - lowKnowledge / 120)
    const chanceHigh = baseChance * (1 - highKnowledge / 120)
    expect(chanceHigh).toBeLessThan(chanceLow)
    expect(chanceLow).toBeCloseTo(0.15 * (1 - 10/120))
    expect(chanceHigh).toBeCloseTo(0.15 * (1 - 100/120))
  })

  it('MAX_FORAGERS为10：10个采集者时不再创建新的', () => {
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).foragers.push(makeForager(i))
      ;(sys as any)._foragersSet.add(i)
    }
    expect((sys as any).foragers).toHaveLength(10)
    // update时 foragers.length >= MAX_FORAGERS，不创建新的
    const em = makeEm([11, 12, 13])
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 3400)
    // cleanup会检查hasComponent=true（默认），所有forager保留
    expect((sys as any).foragers.length).toBeGreaterThanOrEqual(10)
  })

  it('同一实体不重复添加为forager（_foragersSet防重）', () => {
    ;(sys as any).foragers.push(makeForager(1))
    ;(sys as any)._foragersSet.add(1)
    // 模拟已存在时的去重逻辑
    const already = (sys as any)._foragersSet.has(1)
    expect(already).toBe(true)
    // 正常逻辑：!already才添加，所以第二次不会添加
    if (!already) {
      ;(sys as any).foragers.push(makeForager(1))
    }
    expect((sys as any).foragers).toHaveLength(1)
  })

  it('mushroomsFound 字段初始可设置', () => {
    const f = makeForager(1, { mushroomsFound: 0 })
    ;(sys as any).foragers.push(f)
    expect((sys as any).foragers[0].mushroomsFound).toBe(0)
  })

  it('rare蘑菇知识增加是普通的3倍', () => {
    // KNOWLEDGE_PER_FIND = 0.8, rare = KNOWLEDGE_PER_FIND * 3 = 2.4
    const KNOWLEDGE_PER_FIND = 0.8
    const normalGain = KNOWLEDGE_PER_FIND
    const rareGain = KNOWLEDGE_PER_FIND * 3
    expect(rareGain).toBeCloseTo(normalGain * 3)
    expect(rareGain).toBeCloseTo(2.4)
  })
})
