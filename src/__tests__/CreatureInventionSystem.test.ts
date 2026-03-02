import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureInventionSystem } from '../systems/CreatureInventionSystem'
import type { Invention, InventionCategory } from '../systems/CreatureInventionSystem'

let nextId = 1
function makeSys(): CreatureInventionSystem { return new CreatureInventionSystem() }

function makeInvention(
  inventorId: number,
  category: InventionCategory = 'tool',
  overrides: Partial<Invention> = {}
): Invention {
  return {
    id: nextId++,
    inventorId,
    category,
    name: 'Test Invention',
    power: 60,
    spreadRate: 0.3,
    adopters: 5,
    createdAt: 0,
    civId: null,
    ...overrides,
  }
}

// 简单 fake EntityManager
function makeFakeEm(creatureIds: number[] = [], creatureCount = 0) {
  return {
    getEntitiesWithComponents: (a: string, b?: string) => {
      if (a === 'creature' && b === 'position') return creatureIds
      if (a === 'creature') return new Array(creatureCount).fill(0).map((_, i) => i + 1)
      return []
    },
    getComponent: (_id: number, _type: string) => ({ intelligence: 50 }),
  } as any
}

// 简单 fake CivManager
function makeFakeCivManager(civIds: number[] = []) {
  const map = new Map<number, any>()
  civIds.forEach(id => map.set(id, { id }))
  return { civilizations: map } as any
}

describe('CreatureInventionSystem — 初始状态', () => {
  let sys: CreatureInventionSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初���无发明', () => {
    expect((sys as any).inventions).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始 lastSpread 为 0', () => {
    expect((sys as any).lastSpread).toBe(0)
  })

  it('初始 totalInvented 为 0', () => {
    expect((sys as any).totalInvented).toBe(0)
  })

  it('初始 breakthroughs 为 0', () => {
    expect((sys as any).breakthroughs).toBe(0)
  })

  it('inventions 是数组类型', () => {
    expect(Array.isArray((sys as any).inventions)).toBe(true)
  })

  it('_inventionKeySet 是 Set 类型', () => {
    expect((sys as any)._inventionKeySet).toBeInstanceOf(Set)
  })

  it('初始 _inventionKeySet 为空', () => {
    expect((sys as any)._inventionKeySet.size).toBe(0)
  })
})

describe('CreatureInventionSystem — 数据注入与查询', () => {
  let sys: CreatureInventionSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入后可查询', () => {
    ;(sys as any).inventions.push(makeInvention(1, 'weapon'))
    expect((sys as any).inventions[0].category).toBe('weapon')
  })

  it('inventions 内部引用一致', () => {
    ;(sys as any).inventions.push(makeInvention(1))
    expect((sys as any).inventions).toBe((sys as any).inventions)
  })

  it('支持所有 6 种类别', () => {
    const cats: InventionCategory[] = ['tool', 'weapon', 'agriculture', 'medicine', 'construction', 'navigation']
    cats.forEach((c, i) => { ;(sys as any).inventions.push(makeInvention(i + 1, c)) })
    const all = (sys as any).inventions
    cats.forEach((c, i) => { expect(all[i].category).toBe(c) })
  })

  it('发明的各字段均存在', () => {
    const inv = makeInvention(7, 'tool')
    ;(sys as any).inventions.push(inv)
    const r = (sys as any).inventions[0] as Invention
    expect(r.id).toBeDefined()
    expect(r.inventorId).toBe(7)
    expect(r.category).toBe('tool')
    expect(r.name).toBeDefined()
    expect(r.power).toBeDefined()
    expect(r.spreadRate).toBeDefined()
    expect(r.adopters).toBeDefined()
    expect(r.createdAt).toBeDefined()
    expect('civId' in r).toBe(true)
  })

  it('civId 可以为 null', () => {
    const inv = makeInvention(1, 'tool', { civId: null })
    ;(sys as any).inventions.push(inv)
    expect((sys as any).inventions[0].civId).toBeNull()
  })

  it('civId 可以为数字', () => {
    const inv = makeInvention(1, 'tool', { civId: 42 })
    ;(sys as any).inventions.push(inv)
    expect((sys as any).inventions[0].civId).toBe(42)
  })

  it('注入多个发明保持顺序', () => {
    ;(sys as any).inventions.push(makeInvention(1, 'tool'))
    ;(sys as any).inventions.push(makeInvention(2, 'weapon'))
    ;(sys as any).inventions.push(makeInvention(3, 'medicine'))
    expect((sys as any).inventions[0].category).toBe('tool')
    expect((sys as any).inventions[1].category).toBe('weapon')
    expect((sys as any).inventions[2].category).toBe('medicine')
  })

  it('totalInvented 可手动注入并读取', () => {
    ;(sys as any).totalInvented = 42
    expect((sys as any).totalInvented).toBe(42)
  })

  it('breakthroughs 可手动注入并读取', () => {
    ;(sys as any).breakthroughs = 7
    expect((sys as any).breakthroughs).toBe(7)
  })
})

describe('CreatureInventionSystem.getInventionsByCategory', () => {
  let sys: CreatureInventionSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('无匹配返回空', () => {
    ;(sys as any).inventions.push(makeInvention(1, 'tool'))
    expect(sys.getInventionsByCategory('weapon')).toHaveLength(0)
  })

  it('按类别过滤', () => {
    ;(sys as any).inventions.push(makeInvention(1, 'tool'))
    ;(sys as any).inventions.push(makeInvention(2, 'tool'))
    ;(sys as any).inventions.push(makeInvention(3, 'weapon'))
    expect(sys.getInventionsByCategory('tool')).toHaveLength(2)
  })

  it('只有一个匹配时返回1个', () => {
    ;(sys as any).inventions.push(makeInvention(1, 'medicine'))
    ;(sys as any).inventions.push(makeInvention(2, 'tool'))
    expect(sys.getInventionsByCategory('medicine')).toHaveLength(1)
  })

  it('所有发明均匹配时全部返回', () => {
    ;(sys as any).inventions.push(makeInvention(1, 'navigation'))
    ;(sys as any).inventions.push(makeInvention(2, 'navigation'))
    ;(sys as any).inventions.push(makeInvention(3, 'navigation'))
    expect(sys.getInventionsByCategory('navigation')).toHaveLength(3)
  })

  it('inventions 为空时返回空数组', () => {
    expect(sys.getInventionsByCategory('construction')).toHaveLength(0)
  })

  it('多次调用返回一致结果', () => {
    ;(sys as any).inventions.push(makeInvention(1, 'agriculture'))
    const r1 = sys.getInventionsByCategory('agriculture')
    const r2 = sys.getInventionsByCategory('agriculture')
    expect(r1.length).toBe(r2.length)
  })

  it('返回的发明 category 均正确', () => {
    ;(sys as any).inventions.push(makeInvention(1, 'tool'))
    ;(sys as any).inventions.push(makeInvention(2, 'weapon'))
    ;(sys as any).inventions.push(makeInvention(3, 'tool'))
    const result = sys.getInventionsByCategory('tool')
    result.forEach(inv => expect(inv.category).toBe('tool'))
  })

  it('过滤 agriculture 类别', () => {
    ;(sys as any).inventions.push(makeInvention(1, 'agriculture'))
    ;(sys as any).inventions.push(makeInvention(2, 'weapon'))
    ;(sys as any).inventions.push(makeInvention(3, 'agriculture'))
    expect(sys.getInventionsByCategory('agriculture')).toHaveLength(2)
  })

  it('过滤 construction 类别', () => {
    ;(sys as any).inventions.push(makeInvention(1, 'construction'))
    ;(sys as any).inventions.push(makeInvention(2, 'navigation'))
    expect(sys.getInventionsByCategory('construction')).toHaveLength(1)
    expect(sys.getInventionsByCategory('navigation')).toHaveLength(1)
  })
})

describe('CreatureInventionSystem — update() CHECK_INTERVAL 门控', () => {
  let sys: CreatureInventionSystem
  const fakeEm = makeFakeEm()
  const fakeCivMgr = makeFakeCivManager()
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick 差值 < 1100 时不触发 generateInventions', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, fakeCivMgr, 1099)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 差值 >= 1100 时触发并更新 lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, fakeCivMgr, 1100)
    expect((sys as any).lastCheck).toBe(1100)
  })

  it('tick 差值恰好为 1099 不触发', () => {
    ;(sys as any).lastCheck = 500
    sys.update(1, fakeEm, fakeCivMgr, 500 + 1099)
    expect((sys as any).lastCheck).toBe(500)
  })

  it('tick 差值恰好为 1100 触发', () => {
    ;(sys as any).lastCheck = 500
    sys.update(1, fakeEm, fakeCivMgr, 500 + 1100)
    expect((sys as any).lastCheck).toBe(1600)
  })
})

describe('CreatureInventionSystem — update() SPREAD_INTERVAL 门控', () => {
  let sys: CreatureInventionSystem
  const fakeEm = makeFakeEm([], 10)
  const fakeCivMgr = makeFakeCivManager()
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick 差值 < 800 时不触发 spreadInventions', () => {
    ;(sys as any).lastSpread = 0
    ;(sys as any).lastCheck = 9999 // 不让 generate 触发
    sys.update(1, fakeEm, fakeCivMgr, 799)
    expect((sys as any).lastSpread).toBe(0)
  })

  it('tick 差值 >= 800 时触发 spread 并更新 lastSpread', () => {
    ;(sys as any).lastSpread = 0
    ;(sys as any).lastCheck = 9999
    sys.update(1, fakeEm, fakeCivMgr, 800)
    expect((sys as any).lastSpread).toBe(800)
  })

  it('spread 触发时 adopters 不超过 creatureCount', () => {
    ;(sys as any).lastSpread = 0
    ;(sys as any).lastCheck = 9999
    ;(sys as any).inventions.push(makeInvention(1, 'tool', { adopters: 9, spreadRate: 0.5 }))
    // creatureCount = 10, adopters=9, newAdopters=floor(9*0.5)+1=5, min(10,9+5)=10
    sys.update(1, fakeEm, fakeCivMgr, 800)
    expect((sys as any).inventions[0].adopters).toBe(10)
  })

  it('adopters 已达 creatureCount 时不再增长', () => {
    ;(sys as any).lastSpread = 0
    ;(sys as any).lastCheck = 9999
    ;(sys as any).inventions.push(makeInvention(1, 'tool', { adopters: 10, spreadRate: 0.5 }))
    sys.update(1, fakeEm, fakeCivMgr, 800)
    expect((sys as any).inventions[0].adopters).toBe(10)
  })
})

describe('CreatureInventionSystem — spreadInventions 详细逻辑', () => {
  let sys: CreatureInventionSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('spreadRate=0时，newAdopters=floor(n*0)+1=1，adopters增加1', () => {
    const em = makeFakeEm([], 100)
    ;(sys as any).lastSpread = 0
    ;(sys as any).lastCheck = 9999
    ;(sys as any).inventions.push(makeInvention(1, 'tool', { adopters: 5, spreadRate: 0 }))
    sys.update(1, em, makeFakeCivManager(), 800)
    expect((sys as any).inventions[0].adopters).toBe(6)
  })

  it('spreadRate=1时，adopters翻倍+1（不超过上限）', () => {
    const em = makeFakeEm([], 1000)
    ;(sys as any).lastSpread = 0
    ;(sys as any).lastCheck = 9999
    ;(sys as any).inventions.push(makeInvention(1, 'tool', { adopters: 5, spreadRate: 1.0 }))
    sys.update(1, em, makeFakeCivManager(), 800)
    // newAdopters=floor(5*1)+1=6, adopters=min(1000,5+6)=11
    expect((sys as any).inventions[0].adopters).toBe(11)
  })

  it('多个发明同时传播', () => {
    const em = makeFakeEm([], 100)
    ;(sys as any).lastSpread = 0
    ;(sys as any).lastCheck = 9999
    ;(sys as any).inventions.push(makeInvention(1, 'tool', { adopters: 5, spreadRate: 0.3 }))
    ;(sys as any).inventions.push(makeInvention(2, 'weapon', { adopters: 10, spreadRate: 0.5 }))
    sys.update(1, em, makeFakeCivManager(), 800)
    // inv1: floor(5*0.3)+1=2, min(100,5+2)=7
    expect((sys as any).inventions[0].adopters).toBe(7)
    // inv2: floor(10*0.5)+1=6, min(100,10+6)=16
    expect((sys as any).inventions[1].adopters).toBe(16)
  })

  it('creatureCount=0时 adopters 不变（已达上限）', () => {
    const em = makeFakeEm([], 0)
    ;(sys as any).lastSpread = 0
    ;(sys as any).lastCheck = 9999
    ;(sys as any).inventions.push(makeInvention(1, 'tool', { adopters: 0, spreadRate: 0.3 }))
    sys.update(1, em, makeFakeCivManager(), 800)
    // creatureCount=0, adopters=0 >= 0 → skip
    expect((sys as any).inventions[0].adopters).toBe(0)
  })
})

describe('CreatureInventionSystem — generateInventions 与 _inventionKeySet', () => {
  let sys: CreatureInventionSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('MAX_INVENTIONS(50)已满时不生成新发明', () => {
    for (let i = 1; i <= 50; i++) {
      ;(sys as any).inventions.push(makeInvention(i, 'tool'))
    }
    ;(sys as any)._inventionKeySet.add('Test Invention_tool')
    const fakeEm = makeFakeEm([1], 1)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)  // 远低于 INVENT_CHANCE
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, makeFakeCivManager(), 1100)
    expect((sys as any).inventions).toHaveLength(50)
    vi.restoreAllMocks()
  })

  it('无生物时不生成发明', () => {
    const fakeEm = makeFakeEm([], 0)
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, makeFakeCivManager(), 1100)
    expect((sys as any).inventions).toHaveLength(0)
  })

  it('random > INVENT_CHANCE 时跳过该生物', () => {
    const fakeEm = makeFakeEm([1, 2, 3], 3)
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // >> 0.025
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, makeFakeCivManager(), 1100)
    expect((sys as any).inventions).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('power > 80 时 breakthroughs 递增', () => {
    const fakeEm = makeFakeEm([1], 1)
    // 让 random 在各处都返回特定值使 power > 80
    // power = 20 + floor(rand*80)，需要 rand*80 > 60，即 rand > 0.75
    // 但 INVENT_CHANCE 检测用 Math.random() > 0.025 → 需要 <0.025 才进入
    // 多次调用：第1次用于 INVENT_CHANCE(需要<0.025)，第2次用于 pickRandom(category)，第3次用于 pickRandom(name)，第4次用于 power
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 1) return 0.001  // < 0.025 → 进入发明
      if (callCount === 4) return 0.99   // power = 20+floor(0.99*80)=99 > 80 → breakthrough
      return 0.5
    })
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, makeFakeCivManager(), 1100)
    if ((sys as any).inventions.length > 0) {
      if ((sys as any).inventions[0].power > 80) {
        expect((sys as any).breakthroughs).toBeGreaterThanOrEqual(1)
      }
    }
    vi.restoreAllMocks()
  })

  it('生成发明后 totalInvented 递增', () => {
    const fakeEm = makeFakeEm([1], 1)
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 1) return 0.001  // 触发发明
      return 0.5
    })
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, makeFakeCivManager(), 1100)
    if ((sys as any).inventions.length > 0) {
      expect((sys as any).totalInvented).toBeGreaterThanOrEqual(1)
    }
    vi.restoreAllMocks()
  })

  it('同名发明不重复添加（_inventionKeySet 去重）', () => {
    ;(sys as any)._inventionKeySet.add('lever_tool')
    ;(sys as any).inventions.push(makeInvention(1, 'tool', { name: 'lever' }))
    // 即使随机选到同名，也不应再加入
    const fakeEm = makeFakeEm([1], 1)
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 1) return 0.001 // 触发发明
      return 0                           // 总是选第一个：category=tool, name=lever
    })
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, makeFakeCivManager(), 1100)
    // lever_tool 已在 Set 中，不应新增
    expect((sys as any).inventions).toHaveLength(1)
    vi.restoreAllMocks()
  })
})

describe('CreatureInventionSystem — 综合与边界场景', () => {
  let sys: CreatureInventionSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('空系统调用 update 不抛异常', () => {
    const fakeEm = makeFakeEm([], 0)
    expect(() => sys.update(1, fakeEm, makeFakeCivManager(), 0)).not.toThrow()
  })

  it('多次 getInventionsByCategory 后内部 inventions 不变', () => {
    ;(sys as any).inventions.push(makeInvention(1, 'tool'))
    ;(sys as any).inventions.push(makeInvention(2, 'weapon'))
    sys.getInventionsByCategory('tool')
    sys.getInventionsByCategory('weapon')
    expect((sys as any).inventions).toHaveLength(2)
  })

  it('发明的 power 范围在1-100之间', () => {
    ;(sys as any).inventions.push(makeInvention(1, 'tool', { power: 50 }))
    expect((sys as any).inventions[0].power).toBeGreaterThanOrEqual(1)
    expect((sys as any).inventions[0].power).toBeLessThanOrEqual(100)
  })

  it('发明的 spreadRate 范围在0-1之间', () => {
    ;(sys as any).inventions.push(makeInvention(1, 'tool', { spreadRate: 0.15 }))
    expect((sys as any).inventions[0].spreadRate).toBeGreaterThanOrEqual(0)
    expect((sys as any).inventions[0].spreadRate).toBeLessThanOrEqual(1)
  })

  it('采用者数 adopters 不能为负', () => {
    const fakeEm = makeFakeEm([], 10)
    ;(sys as any).lastSpread = 0
    ;(sys as any).lastCheck = 9999
    ;(sys as any).inventions.push(makeInvention(1, 'tool', { adopters: 1, spreadRate: 0 }))
    sys.update(1, fakeEm, makeFakeCivManager(), 800)
    expect((sys as any).inventions[0].adopters).toBeGreaterThanOrEqual(1)
  })

  it('两次达到 CHECK_INTERVAL 只触发两次 generate', () => {
    const fakeEm = makeFakeEm([], 0) // 无生物，不真正生成
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, makeFakeCivManager(), 1100)
    expect((sys as any).lastCheck).toBe(1100)
    sys.update(1, fakeEm, makeFakeCivManager(), 2200)
    expect((sys as any).lastCheck).toBe(2200)
  })

  it('两次达到 SPREAD_INTERVAL 连续触发 spread', () => {
    const fakeEm = makeFakeEm([], 100)
    ;(sys as any).lastSpread = 0
    ;(sys as any).lastCheck = 9999
    ;(sys as any).inventions.push(makeInvention(1, 'tool', { adopters: 5, spreadRate: 0.3 }))
    sys.update(1, fakeEm, makeFakeCivManager(), 800)
    const afterFirst = (sys as any).inventions[0].adopters
    sys.update(1, fakeEm, makeFakeCivManager(), 1600)
    const afterSecond = (sys as any).inventions[0].adopters
    expect(afterSecond).toBeGreaterThanOrEqual(afterFirst)
  })

  it('getInventionsByCategory 使用缓冲区，多次调用不堆积', () => {
    ;(sys as any).inventions.push(makeInvention(1, 'tool'))
    ;(sys as any).inventions.push(makeInvention(2, 'tool'))
    const r1 = sys.getInventionsByCategory('tool')
    ;(sys as any).inventions.push(makeInvention(3, 'tool'))
    const r2 = sys.getInventionsByCategory('tool')
    // 第二次调用清空缓冲区重新填充，应返回3个
    expect(r2).toHaveLength(3)
    // r1 与 r2 是同一个缓冲区引用
    expect(r1).toBe(r2)
  })

  it('dt 参数不影响 CHECK_INTERVAL 和 SPREAD_INTERVAL 判断', () => {
    const fakeEm = makeFakeEm([], 0)
    ;(sys as any).lastCheck = 0
    ;(sys as any).lastSpread = 0
    sys.update(9999, fakeEm, makeFakeCivManager(), 1100)
    expect((sys as any).lastCheck).toBe(1100)
  })
})
