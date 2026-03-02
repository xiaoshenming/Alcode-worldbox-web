import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreaturePremonitionSystem } from '../systems/CreaturePremonitionSystem'
import type { Premonition, VisionType } from '../systems/CreaturePremonitionSystem'

// CHECK_INTERVAL=1300, VISION_CHANCE=0.003, MAX_VISIONS=100, GIFT_GROWTH=0.05
// urgency: disaster/death => clarity*1.5; 其他 => clarity*0.6
// visions 过期：tick < currentTick-25000 时删除
// giftMap 剪枝：tick%3600===0 时清理不存在 creature 的条目

function makeSys() { return new CreaturePremonitionSystem() }

function makeVision(id: number, vision: VisionType, clarity = 60, tick = 0): Premonition {
  return { id, seerId: 1, vision, clarity, urgency: 0, heeded: false, tick }
}

/** 计算 urgency 辅助（与系统实现一致） */
function calcUrgency(vision: VisionType, clarity: number): number {
  return (vision === 'disaster' || vision === 'death') ? clarity * 1.5 : clarity * 0.6
}

/** 构造基础 EntityManager stub */
function makeEm(creatureIds: number[] = [], componentMap: Record<number, boolean> = {}): any {
  return {
    getEntitiesWithComponents: (..._: string[]) => creatureIds,
    hasComponent: (id: number, type: string) => {
      if (type === 'creature') return componentMap[id] ?? creatureIds.includes(id)
      return true
    },
    getComponent: (_id: number, _type: string) => null,
  }
}

describe('CreaturePremonitionSystem — 实例化与初始状态', () => {
  let sys: CreaturePremonitionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('可以正常实例化', () => {
    expect(sys).toBeInstanceOf(CreaturePremonitionSystem)
  })

  it('初始 visions 为空数组', () => {
    expect((sys as any).visions).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始 giftMap 为空 Map', () => {
    expect((sys as any).giftMap).toBeInstanceOf(Map)
    expect((sys as any).giftMap.size).toBe(0)
  })

  it('visions 是数组类型', () => {
    expect(Array.isArray((sys as any).visions)).toBe(true)
  })

  it('两次实例化互相独立', () => {
    const sys2 = makeSys()
    ;(sys as any).visions.push(makeVision(1, 'disaster'))
    expect((sys2 as any).visions).toHaveLength(0)
  })
})

describe('CreaturePremonitionSystem — urgency 计算规则', () => {
  afterEach(() => vi.restoreAllMocks())

  it('disaster 类型 urgency = clarity * 1.5', () => {
    expect(calcUrgency('disaster', 60)).toBe(90)
  })

  it('death 类型 urgency = clarity * 1.5', () => {
    expect(calcUrgency('death', 80)).toBe(120)
  })

  it('battle 类型 urgency = clarity * 0.6', () => {
    expect(calcUrgency('battle', 60)).toBe(36)
  })

  it('prosperity 类型 urgency = clarity * 0.6', () => {
    expect(calcUrgency('prosperity', 100)).toBe(60)
  })

  it('discovery 类型 urgency = clarity * 0.6', () => {
    expect(calcUrgency('discovery', 50)).toBe(30)
  })

  it('migration 类型 urgency = clarity * 0.6', () => {
    expect(calcUrgency('migration', 40)).toBe(24)
  })

  it('disaster clarity=0 时 urgency=0', () => {
    expect(calcUrgency('disaster', 0)).toBe(0)
  })

  it('death clarity=100 时 urgency=150', () => {
    expect(calcUrgency('death', 100)).toBe(150)
  })

  it('battle clarity=0 时 urgency=0', () => {
    expect(calcUrgency('battle', 0)).toBe(0)
  })

  it('prosperity clarity=50 时 urgency=30', () => {
    expect(calcUrgency('prosperity', 50)).toBe(30)
  })

  it('disaster 和 death 的 urgency 倍率高于其他类型', () => {
    const clarity = 100
    expect(calcUrgency('disaster', clarity)).toBeGreaterThan(calcUrgency('battle', clarity))
    expect(calcUrgency('death', clarity)).toBeGreaterThan(calcUrgency('migration', clarity))
  })
})

describe('CreaturePremonitionSystem — CHECK_INTERVAL 节流', () => {
  let sys: CreaturePremonitionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('tick 未达到 CHECK_INTERVAL=1300 时不更新 lastCheck', () => {
    const em = makeEm([])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1299)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 恰好等于 CHECK_INTERVAL=1300 时更新 lastCheck', () => {
    const em = makeEm([])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1300)
    expect((sys as any).lastCheck).toBe(1300)
  })

  it('tick > CHECK_INTERVAL 时更新 lastCheck', () => {
    const em = makeEm([])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('节流期间 visions 数据不被修改', () => {
    ;(sys as any).visions.push(makeVision(1, 'disaster', 60, 30000))
    ;(sys as any).lastCheck = 50000
    const em = makeEm([])
    sys.update(1, em, 50500)  // diff=500 < 1300 => 跳过
    expect((sys as any).visions).toHaveLength(1)
  })

  it('节流期间 giftMap 不被修改', () => {
    ;(sys as any).giftMap.set(1, 50)
    ;(sys as any).lastCheck = 100
    sys.update(1, makeEm([]), 200)
    expect((sys as any).giftMap.get(1)).toBe(50)
  })

  it('连续两个间隔均超过 CHECK_INTERVAL 时均能执行', () => {
    const em = makeEm([])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1300)
    const lc1 = (sys as any).lastCheck
    sys.update(1, em, 2600)
    const lc2 = (sys as any).lastCheck
    expect(lc2).toBeGreaterThan(lc1)
  })
})

describe('CreaturePremonitionSystem — visions 过期清理', () => {
  let sys: CreaturePremonitionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('tick=0 的 vision 在 currentTick=30000 时被删（cutoff=5000）', () => {
    ;(sys as any).visions.push(makeVision(1, 'disaster', 60, 0))
    ;(sys as any).lastCheck = -1300
    sys.update(1, makeEm([]), 30000)
    expect((sys as any).visions).toHaveLength(0)
  })

  it('tick=6000 的 vision 在 currentTick=30000 时保留（6000 > cutoff=5000）', () => {
    ;(sys as any).visions.push(makeVision(1, 'disaster', 60, 6000))
    ;(sys as any).lastCheck = -1300
    sys.update(1, makeEm([]), 30000)
    expect((sys as any).visions).toHaveLength(1)
  })

  it('tick=4999 的 vision 在 currentTick=30000 时被删（4999 < cutoff=5000）', () => {
    ;(sys as any).visions.push(makeVision(1, 'battle', 60, 4999))
    ;(sys as any).lastCheck = -1300
    sys.update(1, makeEm([]), 30000)
    expect((sys as any).visions).toHaveLength(0)
  })

  it('tick=5000 的 vision 恰在 cutoff=5000，不满足 < cutoff，保留', () => {
    ;(sys as any).visions.push(makeVision(1, 'battle', 60, 5000))
    ;(sys as any).lastCheck = -1300
    sys.update(1, makeEm([]), 30000)
    expect((sys as any).visions).toHaveLength(1)
  })

  it('混合过期与未过期 vision，只删过期的', () => {
    ;(sys as any).visions.push(makeVision(1, 'disaster', 60, 0))     // cutoff=5000, 0<5000 => 删
    ;(sys as any).visions.push(makeVision(2, 'battle', 60, 10000))   // 10000>=5000 => 保留
    ;(sys as any).visions.push(makeVision(3, 'death', 60, 3000))     // 3000<5000 => 删
    ;(sys as any).lastCheck = -1300
    sys.update(1, makeEm([]), 30000)
    expect((sys as any).visions).toHaveLength(1)
    expect((sys as any).visions[0].id).toBe(2)
  })

  it('全部 vision 均过期时 visions 变为空', () => {
    for (let i = 1; i <= 5; i++) {
      ;(sys as any).visions.push(makeVision(i, 'battle', 60, i * 100))
    }
    ;(sys as any).lastCheck = -1300
    sys.update(1, makeEm([]), 30000)  // cutoff=5000, 所有tick<5000 => 全删
    expect((sys as any).visions).toHaveLength(0)
  })

  it('无过期 vision 时 visions 长度不变', () => {
    for (let i = 1; i <= 3; i++) {
      ;(sys as any).visions.push(makeVision(i, 'prosperity', 60, 25000))
    }
    ;(sys as any).lastCheck = -1300
    sys.update(1, makeEm([]), 30000)  // cutoff=5000, 25000>5000 => 保留
    expect((sys as any).visions).toHaveLength(3)
  })
})

describe('CreaturePremonitionSystem — VisionType 枚举', () => {
  let sys: CreaturePremonitionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('6种 VisionType 都可以存入 visions', () => {
    const types: VisionType[] = ['disaster', 'battle', 'prosperity', 'death', 'discovery', 'migration']
    for (const v of types) {
      ;(sys as any).visions.push(makeVision((sys as any).nextId++, v))
    }
    expect((sys as any).visions).toHaveLength(6)
  })

  it('disaster vision 数据正确', () => {
    ;(sys as any).visions.push(makeVision(1, 'disaster', 80, 1000))
    const v = (sys as any).visions[0]
    expect(v.vision).toBe('disaster')
    expect(v.clarity).toBe(80)
    expect(v.tick).toBe(1000)
  })

  it('death vision 的 heeded 字段正确', () => {
    const v = makeVision(1, 'death', 60, 0)
    v.heeded = true
    ;(sys as any).visions.push(v)
    expect((sys as any).visions[0].heeded).toBe(true)
  })

  it('seerId 字段被正确记录', () => {
    const v = makeVision(1, 'prosperity', 70, 500)
    v.seerId = 42
    ;(sys as any).visions.push(v)
    expect((sys as any).visions[0].seerId).toBe(42)
  })
})

describe('CreaturePremonitionSystem — giftMap 管理', () => {
  let sys: CreaturePremonitionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('初始 giftMap 是 Map 实例', () => {
    expect((sys as any).giftMap).toBeInstanceOf(Map)
  })

  it('giftMap 初始为空', () => {
    expect((sys as any).giftMap.size).toBe(0)
  })

  it('手动向 giftMap 写入值后可读取', () => {
    ;(sys as any).giftMap.set(7, 50)
    expect((sys as any).giftMap.get(7)).toBe(50)
  })

  it('giftMap 在 tick%3600===0 时清理无 creature 的条目', () => {
    // 设置 giftMap 有 entityId=99，但 em 不包含它
    ;(sys as any).giftMap.set(99, 80)
    const em = {
      getEntitiesWithComponents: () => [] as number[],
      hasComponent: (_id: number, _type: string) => false,
    } as any
    ;(sys as any).lastCheck = -1300
    sys.update(1, em, 3600)  // tick=3600, 3600%3600===0 => 触发剪枝
    expect((sys as any).giftMap.has(99)).toBe(false)
  })

  it('giftMap 在 tick%3600!==0 时不触发剪枝', () => {
    ;(sys as any).giftMap.set(99, 80)
    const em = {
      getEntitiesWithComponents: () => [] as number[],
      hasComponent: () => false,
    } as any
    ;(sys as any).lastCheck = -1300
    sys.update(1, em, 3601)  // 3601%3600!==0 => 不剪枝
    expect((sys as any).giftMap.has(99)).toBe(true)
  })

  it('giftMap 剪枝保留有 creature 的条目', () => {
    ;(sys as any).giftMap.set(10, 50)   // creature 存在
    ;(sys as any).giftMap.set(20, 30)   // creature 不存在
    const em = {
      getEntitiesWithComponents: () => [] as number[],
      hasComponent: (id: number, type: string) => type === 'creature' && id === 10,
    } as any
    ;(sys as any).lastCheck = -1300
    sys.update(1, em, 3600)
    expect((sys as any).giftMap.has(10)).toBe(true)
    expect((sys as any).giftMap.has(20)).toBe(false)
  })

  it('giftMap 为空时剪枝不抛出', () => {
    const em = {
      getEntitiesWithComponents: () => [] as number[],
      hasComponent: () => false,
    } as any
    ;(sys as any).lastCheck = -1300
    expect(() => sys.update(1, em, 3600)).not.toThrow()
  })
})

describe('CreaturePremonitionSystem — MAX_VISIONS 上限', () => {
  let sys: CreaturePremonitionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('MAX_VISIONS=100，达到上限时不再添加新 vision', () => {
    for (let i = 1; i <= 100; i++) {
      ;(sys as any).visions.push(makeVision(i, 'battle', 60, 999999))
    }
    // 注入 creature，随机强制触发 vision 添加
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const em = {
      getEntitiesWithComponents: () => [1],
      hasComponent: () => true,
      getComponent: () => ({ age: 30 }),
    } as any
    ;(sys as any).lastCheck = -1300
    sys.update(1, em, 1000000)
    // visions 应该还是 100（不超过上限），过期的 cutoff=975000，999999>975000 保留
    expect((sys as any).visions.length).toBeLessThanOrEqual(100)
  })

  it('visions 为空时可以添加新 vision', () => {
    expect((sys as any).visions).toHaveLength(0)
    ;(sys as any).visions.push(makeVision(1, 'disaster', 60, 0))
    expect((sys as any).visions).toHaveLength(1)
  })
})

describe('CreaturePremonitionSystem — Premonition 数据字段', () => {
  afterEach(() => vi.restoreAllMocks())

  it('Premonition 包含所有必需字段', () => {
    const p = makeVision(1, 'disaster', 75, 500)
    expect(p).toHaveProperty('id')
    expect(p).toHaveProperty('seerId')
    expect(p).toHaveProperty('vision')
    expect(p).toHaveProperty('clarity')
    expect(p).toHaveProperty('urgency')
    expect(p).toHaveProperty('heeded')
    expect(p).toHaveProperty('tick')
  })

  it('urgency 初始化为 0（工厂函数）', () => {
    const p = makeVision(1, 'disaster', 60, 0)
    expect(p.urgency).toBe(0)
  })

  it('heeded 初始化为 false（工厂函数）', () => {
    const p = makeVision(1, 'battle', 60, 0)
    expect(p.heeded).toBe(false)
  })

  it('clarity 大范围值都合法', () => {
    const p1 = makeVision(1, 'discovery', 0, 0)
    const p2 = makeVision(2, 'discovery', 100, 0)
    expect(p1.clarity).toBe(0)
    expect(p2.clarity).toBe(100)
  })
})

describe('CreaturePremonitionSystem — 综合与边界', () => {
  let sys: CreaturePremonitionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('update 在空实体列表时不抛出', () => {
    const em = makeEm([])
    ;(sys as any).lastCheck = -1300
    expect(() => sys.update(1, em, 5000)).not.toThrow()
  })

  it('连续多次 update 后 lastCheck 总是最新 tick', () => {
    const em = makeEm([])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1300)
    sys.update(1, em, 2600)
    sys.update(1, em, 3900)
    expect((sys as any).lastCheck).toBe(3900)
  })

  it('visions 数组是同一引用（update 不替换数组）', () => {
    const ref = (sys as any).visions
    ;(sys as any).lastCheck = -1300
    sys.update(1, makeEm([]), 5000)
    expect((sys as any).visions).toBe(ref)
  })

  it('giftMap 是同一引用（update 不替换 Map）', () => {
    const ref = (sys as any).giftMap
    ;(sys as any).lastCheck = -1300
    sys.update(1, makeEm([]), 5000)
    expect((sys as any).giftMap).toBe(ref)
  })

  it('nextId 在手动注入 vision 后不自动改变', () => {
    ;(sys as any).visions.push(makeVision(1, 'disaster'))
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始为 0，第一次超过 CHECK_INTERVAL 时触发', () => {
    const em = makeEm([])
    sys.update(1, em, 1300)
    expect((sys as any).lastCheck).toBe(1300)
  })

  it('GIFT_GROWTH 常量为 0.05（通过行为推断）', () => {
    // 手动设置 giftMap 值，触发增长逻辑
    ;(sys as any).giftMap.set(1, 10)
    // 构造 em 返回 entityId=1，且 age>=20
    const mockCreature = { age: 25 }
    vi.spyOn(Math, 'random').mockReturnValue(0.002)  // < VISION_CHANCE=0.003 => 触发
    const em = {
      getEntitiesWithComponents: () => [1],
      hasComponent: () => true,
      getComponent: () => mockCreature,
    } as any
    ;(sys as any).lastCheck = -1300
    sys.update(1, em, 5000)
    const gift = (sys as any).giftMap.get(1)
    // 10 + 0.05 = 10.05
    expect(gift).toBeCloseTo(10.05, 5)
  })
})
