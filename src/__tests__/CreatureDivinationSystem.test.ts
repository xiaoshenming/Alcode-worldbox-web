import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureDivinationSystem } from '../systems/CreatureDivinationSystem'
import type { DivinationType, Divination } from '../systems/CreatureDivinationSystem'

// CHECK_INTERVAL=1100, DIVINE_CHANCE=0.02, MAX_DIVINATIONS=70

function makeSys() { return new CreatureDivinationSystem() }

function makeDivination(
  id: number,
  creatureId: number,
  method: DivinationType = 'stars',
  prediction = 'great_harvest',
  accuracy = 50,
  believed = true,
  tick = 0,
): Divination {
  return { id, creatureId, method, prediction, accuracy, believed, tick }
}

// ─── 初始化状态 ─────────────────────────────────────────────────────────────
describe('CreatureDivinationSystem 初始化状态', () => {
  let sys: CreatureDivinationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('初始化不崩溃', () => { expect(sys).toBeDefined() })
  it('是 CreatureDivinationSystem 实例', () => { expect(sys).toBeInstanceOf(CreatureDivinationSystem) })
  it('内部 divinations 初始为空数组', () => { expect((sys as any).divinations).toHaveLength(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('多次实例化互不干扰', () => {
    const a = makeSys()
    const b = makeSys()
    ;(a as any).divinations.push(makeDivination(1, 10))
    expect((b as any).divinations).toHaveLength(0)
  })
})

// ─── Divination 数据结构 ─────────────────────────────────────────────────────
describe('Divination 数据结构', () => {
  let sys: CreatureDivinationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('记录包含所有必要字段', () => {
    const d = makeDivination(1, 10, 'stars', 'great_harvest', 75, true, 500)
    expect(d).toHaveProperty('id')
    expect(d).toHaveProperty('creatureId')
    expect(d).toHaveProperty('method')
    expect(d).toHaveProperty('prediction')
    expect(d).toHaveProperty('accuracy')
    expect(d).toHaveProperty('believed')
    expect(d).toHaveProperty('tick')
  })

  it('accuracy 范围 0-100 可被存储', () => {
    ;(sys as any).divinations.push(makeDivination(1, 1, 'stars', 'great_harvest', 0))
    ;(sys as any).divinations.push(makeDivination(2, 2, 'bones', 'coming_war', 100))
    expect((sys as any).divinations[0].accuracy).toBe(0)
    expect((sys as any).divinations[1].accuracy).toBe(100)
  })

  it('believed 为布尔值', () => {
    ;(sys as any).divinations.push(makeDivination(1, 1, 'stars', 'great_harvest', 50, true))
    ;(sys as any).divinations.push(makeDivination(2, 2, 'bones', 'coming_war', 50, false))
    expect((sys as any).divinations[0].believed).toBe(true)
    expect((sys as any).divinations[1].believed).toBe(false)
  })

  it('tick 字段正确记录时间戳', () => {
    ;(sys as any).divinations.push(makeDivination(1, 10, 'water', 'new_alliance', 75, true, 9999))
    expect((sys as any).divinations[0].tick).toBe(9999)
  })

  it('注入数据后 divinations 内部引用稳定', () => {
    const ref = (sys as any).divinations
    ;(sys as any).divinations.push(makeDivination(1, 10))
    expect((sys as any).divinations).toBe(ref)
  })

  it('creatureId 正确存储', () => {
    ;(sys as any).divinations.push(makeDivination(1, 42, 'dreams', 'betrayal_near', 30, false, 100))
    expect((sys as any).divinations[0].creatureId).toBe(42)
  })
})

// ─── DivinationType 6 种方法 ─────────────────────────────────────────────────
describe('DivinationType 6 种方法', () => {
  let sys: CreatureDivinationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('stars 方法可存储', () => {
    ;(sys as any).divinations.push(makeDivination(1, 1, 'stars'))
    expect((sys as any).divinations[0].method).toBe('stars')
  })

  it('bones 方法可存储', () => {
    ;(sys as any).divinations.push(makeDivination(1, 1, 'bones'))
    expect((sys as any).divinations[0].method).toBe('bones')
  })

  it('flames 方法可存储', () => {
    ;(sys as any).divinations.push(makeDivination(1, 1, 'flames'))
    expect((sys as any).divinations[0].method).toBe('flames')
  })

  it('water 方法可存储', () => {
    ;(sys as any).divinations.push(makeDivination(1, 1, 'water'))
    expect((sys as any).divinations[0].method).toBe('water')
  })

  it('dreams 方法可存储', () => {
    ;(sys as any).divinations.push(makeDivination(1, 1, 'dreams'))
    expect((sys as any).divinations[0].method).toBe('dreams')
  })

  it('birds 方法可存储', () => {
    ;(sys as any).divinations.push(makeDivination(1, 1, 'birds'))
    expect((sys as any).divinations[0].method).toBe('birds')
  })

  it('6 种方法全部添加后长度为 6', () => {
    const types: DivinationType[] = ['stars', 'bones', 'flames', 'water', 'dreams', 'birds']
    types.forEach((t, i) => { ;(sys as any).divinations.push(makeDivination(i + 1, i + 1, t)) })
    expect((sys as any).divinations).toHaveLength(6)
  })
})

// ─── prediction 预言类型 ─────────────────────────────────────────────────────
describe('prediction 预言类型完整性', () => {
  let sys: CreatureDivinationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  const PREDICTIONS = [
    'great_harvest', 'coming_war', 'natural_disaster',
    'peaceful_era', 'plague_warning', 'divine_blessing',
    'famine_ahead', 'new_alliance', 'betrayal_near',
  ]

  it('所有 9 种预言类型均可存储', () => {
    PREDICTIONS.forEach((p, i) => {
      ;(sys as any).divinations.push(makeDivination(i + 1, i + 1, 'stars', p))
    })
    expect((sys as any).divinations).toHaveLength(9)
    PREDICTIONS.forEach((p, i) => {
      expect((sys as any).divinations[i].prediction).toBe(p)
    })
  })

  it('great_harvest 预言可存储', () => {
    ;(sys as any).divinations.push(makeDivination(1, 1, 'stars', 'great_harvest'))
    expect((sys as any).divinations[0].prediction).toBe('great_harvest')
  })

  it('betrayal_near 预言可存储', () => {
    ;(sys as any).divinations.push(makeDivination(1, 1, 'bones', 'betrayal_near'))
    expect((sys as any).divinations[0].prediction).toBe('betrayal_near')
  })
})

// ─── CHECK_INTERVAL 节流 ─────────────────────────────────────────────────────
describe('update() 节流逻辑（CHECK_INTERVAL=1100）', () => {
  let sys: CreatureDivinationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('tick 差值 < 1100 时不更新 lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1099)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 差值 = 1100 时更新 lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1100)
    expect((sys as any).lastCheck).toBe(1100)
  })

  it('tick 差值 > 1100 时更新 lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2000)
    expect((sys as any).lastCheck).toBe(2000)
  })

  it('lastCheck=500 时 tick=1599 不满足条件', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 500
    sys.update(1, em, 1599)
    expect((sys as any).lastCheck).toBe(500)
  })

  it('lastCheck=500 时 tick=1600 满足条件', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 500
    sys.update(1, em, 1600)
    expect((sys as any).lastCheck).toBe(1600)
  })

  it('节流期间不调用 getEntitiesWithComponents', () => {
    const fn = vi.fn().mockReturnValue([])
    const em = { getEntitiesWithComponents: fn } as any
    sys.update(1, em, 500)
    expect(fn).not.toHaveBeenCalled()
  })

  it('满足条件时调用 getEntitiesWithComponents(creature)', () => {
    const fn = vi.fn().mockReturnValue([])
    const em = { getEntitiesWithComponents: fn } as any
    sys.update(1, em, 1100)
    expect(fn).toHaveBeenCalledWith('creature')
  })

  it('连续调用：第一次更新后第二次差值不足则跳过', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    sys.update(1, em, 1100)
    sys.update(1, em, 2000) // 900 < 1100
    expect((sys as any).lastCheck).toBe(1100)
  })

  it('连续调用：第二次差值满足时更新', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    sys.update(1, em, 1100)
    sys.update(1, em, 2200)
    expect((sys as any).lastCheck).toBe(2200)
  })
})

// ─── pruneOld（MAX_DIVINATIONS=70）─────────────────────────────────────────
describe('pruneOld() 截断逻辑（MAX_DIVINATIONS=70）', () => {
  let sys: CreatureDivinationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('数量 <= 70 时不截断', () => {
    for (let i = 0; i < 70; i++) {
      ;(sys as any).divinations.push(makeDivination(i + 1, i, 'stars', 'great_harvest', 50, true, i))
    }
    ;(sys as any).pruneOld()
    expect((sys as any).divinations).toHaveLength(70)
  })

  it('数量 = 71 时截断到 70', () => {
    for (let i = 0; i < 71; i++) {
      ;(sys as any).divinations.push(makeDivination(i + 1, i, 'bones', 'coming_war', 60, false, i))
    }
    ;(sys as any).pruneOld()
    expect((sys as any).divinations).toHaveLength(70)
  })

  it('数量 = 80 时截断到 70', () => {
    for (let i = 0; i < 80; i++) {
      ;(sys as any).divinations.push(makeDivination(i + 1, i, 'flames', 'plague_warning', 40, true, i))
    }
    ;(sys as any).pruneOld()
    expect((sys as any).divinations).toHaveLength(70)
  })

  it('截断后保留最新记录（删除头部旧记录）', () => {
    for (let i = 0; i < 75; i++) {
      ;(sys as any).divinations.push(makeDivination(i + 1, i, 'water', 'new_alliance', 50, true, i))
    }
    ;(sys as any).pruneOld()
    const divs = (sys as any).divinations
    expect(divs[0].id).toBe(6)
    expect(divs[69].id).toBe(75)
  })

  it('数量 = 100 时截断到 70（删除前 30 条）', () => {
    for (let i = 0; i < 100; i++) {
      ;(sys as any).divinations.push(makeDivination(i + 1, i, 'dreams', 'divine_blessing', 50, true, i))
    }
    ;(sys as any).pruneOld()
    const divs = (sys as any).divinations
    expect(divs).toHaveLength(70)
    expect(divs[0].id).toBe(31)
    expect(divs[69].id).toBe(100)
  })

  it('空数组时 pruneOld 不崩溃', () => {
    expect(() => { ;(sys as any).pruneOld() }).not.toThrow()
    expect((sys as any).divinations).toHaveLength(0)
  })

  it('恰好 70 条时 pruneOld 不删除任何记录，首尾 id 不变', () => {
    for (let i = 1; i <= 70; i++) {
      ;(sys as any).divinations.push(makeDivination(i, i, 'birds', 'famine_ahead', 50, false, i))
    }
    ;(sys as any).pruneOld()
    const divs = (sys as any).divinations
    expect(divs[0].id).toBe(1)
    expect(divs[69].id).toBe(70)
  })
})

// ─── nextId 递增 ─────────────────────────────────────────────────────────────
describe('nextId 自增行为', () => {
  let sys: CreatureDivinationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })

  it('手动递增后 nextId 变为 2', () => {
    ;(sys as any).nextId++
    expect((sys as any).nextId).toBe(2)
  })

  it('多次递增后 nextId 正确', () => {
    for (let i = 0; i < 5; i++) { ;(sys as any).nextId++ }
    expect((sys as any).nextId).toBe(6)
  })
})

// ─── update() 整体集成 ───────────────────────────────────────────────────────
describe('update() 整体集成测试', () => {
  let sys: CreatureDivinationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('空实体列表时 divinations 不变', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    sys.update(1, em, 1100)
    expect((sys as any).divinations).toHaveLength(0)
  })

  it('update 不抛异常（大量实体）', () => {
    const entities = Array.from({ length: 100 }, (_, i) => i + 1)
    const em = { getEntitiesWithComponents: () => entities } as any
    expect(() => sys.update(1, em, 1100)).not.toThrow()
  })

  it('DIVINE_CHANCE=0.02 时绝大多数不触发（random=0.99）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const em = { getEntitiesWithComponents: () => [1, 2, 3] } as any
    sys.update(1, em, 1100)
    expect((sys as any).divinations).toHaveLength(0)
  })

  it('random=0 时所有实体都触发神谕（3 实体 => 3 条）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = { getEntitiesWithComponents: () => [1, 2, 3] } as any
    sys.update(1, em, 1100)
    expect((sys as any).divinations).toHaveLength(3)
  })

  it('触发的神谕 creatureId 正确', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = { getEntitiesWithComponents: () => [42] } as any
    sys.update(1, em, 1100)
    expect((sys as any).divinations[0].creatureId).toBe(42)
  })

  it('触发的神谕 tick 为当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = { getEntitiesWithComponents: () => [1] } as any
    sys.update(1, em, 1100)
    expect((sys as any).divinations[0].tick).toBe(1100)
  })

  it('触发后 nextId 自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = { getEntitiesWithComponents: () => [1] } as any
    sys.update(1, em, 1100)
    expect((sys as any).nextId).toBe(2)
  })

  it('update 超出 MAX_DIVINATIONS 后自动裁剪', () => {
    // 预填 69 条
    for (let i = 0; i < 69; i++) {
      ;(sys as any).divinations.push(makeDivination(i + 1, i, 'stars', 'great_harvest', 50, true, i))
    }
    // random=0 确保所有实体触发，5 实体 => 新增 5，合计 74 > 70 => 裁剪到 70
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    const em = { getEntitiesWithComponents: () => [101, 102, 103, 104, 105] } as any
    sys.update(1, em, 1100)
    expect((sys as any).divinations.length).toBeLessThanOrEqual(70)
  })
})
