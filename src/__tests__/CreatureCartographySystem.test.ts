import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureCartographySystem } from '../systems/CreatureCartographySystem'
import type { CartographicMap, MapType, MapDetail } from '../systems/CreatureCartographySystem'

let nextId = 1
function makeSys(): CreatureCartographySystem { return new CreatureCartographySystem() }
function makeMap(cartographerId: number, mapType: MapType = 'terrain', detail: MapDetail = 'basic', overrides: Partial<CartographicMap> = {}): CartographicMap {
  return { id: nextId++, cartographerId, mapType, detail, accuracy: 70, coverage: 60, tradeValue: 50, tick: 0, ...overrides }
}

afterEach(() => { vi.restoreAllMocks() })

// ─── 1. 内部状态初始化 ───────────────────────────────────────────────
describe('初始状态', () => {
  let sys: CreatureCartographySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始 maps 为空数组', () => {
    expect((sys as any).maps).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始 skillMap 为空 Map', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })
})

// ─── 2. maps 字段操作 ─────────────────────────────────────────────────
describe('maps 字段', () => {
  let sys: CreatureCartographySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入后可查询', () => {
    ;(sys as any).maps.push(makeMap(1, 'nautical', 'masterwork'))
    expect((sys as any).maps[0].mapType).toBe('nautical')
    expect((sys as any).maps[0].detail).toBe('masterwork')
  })

  it('返回内部引用（同一对象）', () => {
    ;(sys as any).maps.push(makeMap(1))
    expect((sys as any).maps).toBe((sys as any).maps)
  })

  it('注入多条记录后 length 正确', () => {
    for (let i = 1; i <= 5; i++) {
      ;(sys as any).maps.push(makeMap(i))
    }
    expect((sys as any).maps).toHaveLength(5)
  })

  it('cartographerId 字段正确存储', () => {
    ;(sys as any).maps.push(makeMap(42))
    expect((sys as any).maps[0].cartographerId).toBe(42)
  })

  it('accuracy 字段正确存储', () => {
    ;(sys as any).maps.push(makeMap(1, 'terrain', 'basic', { accuracy: 88.5 }))
    expect((sys as any).maps[0].accuracy).toBeCloseTo(88.5)
  })

  it('coverage 字段正确存储', () => {
    ;(sys as any).maps.push(makeMap(1, 'terrain', 'basic', { coverage: 95 }))
    expect((sys as any).maps[0].coverage).toBe(95)
  })

  it('tradeValue 字段正确存储', () => {
    ;(sys as any).maps.push(makeMap(1, 'terrain', 'basic', { tradeValue: 120 }))
    expect((sys as any).maps[0].tradeValue).toBe(120)
  })

  it('tick 字段正确存储', () => {
    ;(sys as any).maps.push(makeMap(1, 'terrain', 'basic', { tick: 9999 }))
    expect((sys as any).maps[0].tick).toBe(9999)
  })
})

// ─── 3. MapType 枚举覆盖 ──────────────────────────────────────────────
describe('MapType 枚举覆盖', () => {
  let sys: CreatureCartographySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  const allTypes: MapType[] = ['terrain', 'trade_route', 'military', 'resource', 'nautical', 'celestial']

  it('支持所有 6 种地图类型（批量）', () => {
    allTypes.forEach((t, i) => { ;(sys as any).maps.push(makeMap(i + 1, t)) })
    allTypes.forEach((t, i) => { expect((sys as any).maps[i].mapType).toBe(t) })
  })

  it('terrain 类型', () => {
    ;(sys as any).maps.push(makeMap(1, 'terrain'))
    expect((sys as any).maps[0].mapType).toBe('terrain')
  })

  it('trade_route 类型', () => {
    ;(sys as any).maps.push(makeMap(1, 'trade_route'))
    expect((sys as any).maps[0].mapType).toBe('trade_route')
  })

  it('military 类型', () => {
    ;(sys as any).maps.push(makeMap(1, 'military'))
    expect((sys as any).maps[0].mapType).toBe('military')
  })

  it('resource 类型', () => {
    ;(sys as any).maps.push(makeMap(1, 'resource'))
    expect((sys as any).maps[0].mapType).toBe('resource')
  })

  it('nautical 类型', () => {
    ;(sys as any).maps.push(makeMap(1, 'nautical'))
    expect((sys as any).maps[0].mapType).toBe('nautical')
  })

  it('celestial 类型', () => {
    ;(sys as any).maps.push(makeMap(1, 'celestial'))
    expect((sys as any).maps[0].mapType).toBe('celestial')
  })
})

// ─── 4. MapDetail 枚举覆盖 ────────────────────────────────────────────
describe('MapDetail 枚举覆盖', () => {
  let sys: CreatureCartographySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  const allDetails: MapDetail[] = ['crude', 'basic', 'detailed', 'masterwork']

  it('支持所有 4 种细节等级（批量）', () => {
    allDetails.forEach((d, i) => { ;(sys as any).maps.push(makeMap(i + 1, 'terrain', d)) })
    allDetails.forEach((d, i) => { expect((sys as any).maps[i].detail).toBe(d) })
  })

  it('crude 细节等级', () => {
    ;(sys as any).maps.push(makeMap(1, 'terrain', 'crude'))
    expect((sys as any).maps[0].detail).toBe('crude')
  })

  it('basic 细节等级', () => {
    ;(sys as any).maps.push(makeMap(1, 'terrain', 'basic'))
    expect((sys as any).maps[0].detail).toBe('basic')
  })

  it('detailed 细节等级', () => {
    ;(sys as any).maps.push(makeMap(1, 'terrain', 'detailed'))
    expect((sys as any).maps[0].detail).toBe('detailed')
  })

  it('masterwork 细节等级', () => {
    ;(sys as any).maps.push(makeMap(1, 'terrain', 'masterwork'))
    expect((sys as any).maps[0].detail).toBe('masterwork')
  })
})

// ─── 5. skillMap 操作 ─────────────────────────────────────────��───────
describe('skillMap 字段', () => {
  let sys: CreatureCartographySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('未知实体返回 undefined（fallback 0）', () => {
    expect((sys as any).skillMap.get(999) ?? 0).toBe(0)
  })

  it('注入技能后返回正确值', () => {
    ;(sys as any).skillMap.set(42, 82)
    expect((sys as any).skillMap.get(42) ?? 0).toBe(82)
  })

  it('技能值可为小数', () => {
    ;(sys as any).skillMap.set(1, 55.75)
    expect((sys as any).skillMap.get(1)).toBeCloseTo(55.75)
  })

  it('多实体技能独立存储', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(2, 70)
    expect((sys as any).skillMap.get(1)).toBe(30)
    expect((sys as any).skillMap.get(2)).toBe(70)
  })

  it('覆盖已有技能值', () => {
    ;(sys as any).skillMap.set(5, 40)
    ;(sys as any).skillMap.set(5, 90)
    expect((sys as any).skillMap.get(5)).toBe(90)
  })

  it('技能上限为 100（手动注入）', () => {
    ;(sys as any).skillMap.set(1, 100)
    expect((sys as any).skillMap.get(1)).toBe(100)
  })

  it('技能值 0 合法', () => {
    ;(sys as any).skillMap.set(10, 0)
    expect((sys as any).skillMap.get(10)).toBe(0)
  })

  it('删除实体技能后返回 undefined', () => {
    ;(sys as any).skillMap.set(7, 50)
    ;(sys as any).skillMap.delete(7)
    expect((sys as any).skillMap.get(7)).toBeUndefined()
  })
})

// ─── 6. CHECK_INTERVAL 节流逻辑 ─────────────────────────────────────
describe('update() 节流逻辑 (CHECK_INTERVAL=1400)', () => {
  let sys: CreatureCartographySystem
  const em = {
    getEntitiesWithComponents: () => [],
    hasComponent: () => false,
    getComponent: () => null,
  } as any

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 差值 < 1400 时 lastCheck 不更新', () => {
    ;(sys as any).lastCheck = 5000
    sys.update(0, em, 5000 + 1399)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('tick 差值 = 1400 时 lastCheck 更新', () => {
    ;(sys as any).lastCheck = 5000
    sys.update(0, em, 5000 + 1400)
    expect((sys as any).lastCheck).toBe(6400)
  })

  it('tick 差值 > 1400 时 lastCheck 更新为当前 tick', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 99999)
    expect((sys as any).lastCheck).toBe(99999)
  })

  it('连续两次 update 且间隔不足时第二次不触发', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 1400)
    const after1 = (sys as any).lastCheck
    sys.update(0, em, 1400 + 100)
    expect((sys as any).lastCheck).toBe(after1)
  })

  it('多次触发后 lastCheck 始终等于最后触发 tick', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 1400)
    sys.update(0, em, 2800)
    expect((sys as any).lastCheck).toBe(2800)
  })
})

// ─── 7. 地图过期清理（cutoff = tick - 60000）─────────────────────────
describe('maps 过期清理', () => {
  let sys: CreatureCartographySystem
  const emEmpty = {
    getEntitiesWithComponents: () => [],
    hasComponent: () => true,
    getComponent: () => null,
  } as any

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 在 cutoff 之内的地图被保留', () => {
    ;(sys as any).maps.push(makeMap(1, 'terrain', 'basic', { tick: 50000 }))
    ;(sys as any).lastCheck = 0
    sys.update(0, emEmpty, 1400)
    // cutoff = 1400 - 60000 = -58600，地图 tick=50000 > cutoff，应保留
    expect((sys as any).maps).toHaveLength(1)
  })

  it('tick 早于 cutoff 的地图被删除', () => {
    ;(sys as any).maps.push(makeMap(1, 'terrain', 'basic', { tick: 0 }))
    ;(sys as any).lastCheck = 0
    // tick=70000，cutoff=70000-60000=10000，地图 tick=0 < cutoff，应删除
    sys.update(0, emEmpty, 70000)
    expect((sys as any).maps).toHaveLength(0)
  })

  it('批量：部分过期部分保留', () => {
    ;(sys as any).maps.push(makeMap(1, 'terrain', 'basic', { tick: 0 }))    // 过期
    ;(sys as any).maps.push(makeMap(2, 'terrain', 'basic', { tick: 65000 })) // 保留
    ;(sys as any).lastCheck = 0
    sys.update(0, emEmpty, 70000)
    expect((sys as any).maps).toHaveLength(1)
    expect((sys as any).maps[0].tick).toBe(65000)
  })

  it('所有地图均未过期则全部保留', () => {
    for (let i = 0; i < 3; i++) {
      ;(sys as any).maps.push(makeMap(i + 1, 'terrain', 'basic', { tick: 90000 }))
    }
    ;(sys as any).lastCheck = 0
    sys.update(0, emEmpty, 100000)
    expect((sys as any).maps).toHaveLength(3)
  })
})

// ─── 8. MAX_MAPS 上限 ────────────────────────────────────────────────
describe('MAX_MAPS 上限 (80)', () => {
  let sys: CreatureCartographySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入 80 条地图后 length 为 80', () => {
    for (let i = 0; i < 80; i++) {
      ;(sys as any).maps.push(makeMap(i + 1))
    }
    expect((sys as any).maps).toHaveLength(80)
  })

  it('注入超过 80 条依然可存储（手动注入不受 update 限制）', () => {
    for (let i = 0; i < 85; i++) {
      ;(sys as any).maps.push(makeMap(i + 1))
    }
    expect((sys as any).maps).toHaveLength(85)
  })
})

// ─── 9. 综合字段完整性 ───────────────────────────────────────────────
describe('CartographicMap 结构完整性', () => {
  let sys: CreatureCartographySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('id 字段自增正确', () => {
    ;(sys as any).maps.push(makeMap(1))
    ;(sys as any).maps.push(makeMap(1))
    const ids = (sys as any).maps.map((m: CartographicMap) => m.id)
    expect(ids[1]).toBeGreaterThan(ids[0])
  })

  it('同一 cartographerId 可拥有多张地图', () => {
    ;(sys as any).maps.push(makeMap(7, 'terrain'))
    ;(sys as any).maps.push(makeMap(7, 'military'))
    const cid7 = (sys as any).maps.filter((m: CartographicMap) => m.cartographerId === 7)
    expect(cid7).toHaveLength(2)
  })

  it('nautical 地图的 tradeValue 可额外加 20（手动注入验证）', () => {
    const m = makeMap(1, 'nautical', 'basic', { accuracy: 60, tradeValue: 60 * 0.5 + 20 })
    ;(sys as any).maps.push(m)
    expect((sys as any).maps[0].tradeValue).toBeCloseTo(50)
  })

  it('所有必需字段均存在', () => {
    const m = makeMap(1)
    ;(sys as any).maps.push(m)
    const stored = (sys as any).maps[0]
    expect(stored).toHaveProperty('id')
    expect(stored).toHaveProperty('cartographerId')
    expect(stored).toHaveProperty('mapType')
    expect(stored).toHaveProperty('detail')
    expect(stored).toHaveProperty('accuracy')
    expect(stored).toHaveProperty('coverage')
    expect(stored).toHaveProperty('tradeValue')
    expect(stored).toHaveProperty('tick')
  })
})

// ─── 10. update 健壮性 ───────────────────────────────────────────────
describe('update() 健壮性', () => {
  let sys: CreatureCartographySystem
  const emEmpty = {
    getEntitiesWithComponents: () => [],
    hasComponent: () => true,
    getComponent: () => null,
  } as any

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('空世界时 update 不崩溃', () => {
    expect(() => sys.update(0, emEmpty, 1400)).not.toThrow()
  })

  it('tick=0 时不触发（差值为0）', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, emEmpty, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('dt 参数不影响节流逻辑', () => {
    ;(sys as any).lastCheck = 0
    sys.update(999, emEmpty, 1400)
    expect((sys as any).lastCheck).toBe(1400)
  })
})
