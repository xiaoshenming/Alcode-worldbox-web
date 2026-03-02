import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CityLayoutSystem } from '../systems/CityLayoutSystem'
import type { CityData, RoadSegment } from '../systems/CityLayoutSystem'

// CityLayoutSystem 测试：
// - getCityLevel(cityId)  → 未注册返回 'village'，注入后返回正确等级
// - getRoads(cityId)      → 未注册返回 []，注入后返回道路数组
// - removeCity(cityId)    → 删除城市布局
// - update(tick)          → 每 120 tick 重置脏标记
// calcLevel 规则：<10 buildings=village, >=10=town, >25=city, >50=capital

function makeCLS(): CityLayoutSystem {
  return new CityLayoutSystem()
}

function makeCityLayout(
  level: string,
  roads: RoadSegment[] = [],
  walls: { x: number; y: number }[] = [],
  gates: { x: number; y: number }[] = [],
  dirty = false
) {
  return { level, roads, walls, gates, zones: new Map(), dirty }
}

function makeRoad(
  x1 = 0, y1 = 0, x2 = 10, y2 = 0,
  width = 2, isPrimary = true
): RoadSegment {
  return { x1, y1, x2, y2, width, isPrimary }
}

describe('CityLayoutSystem 初始化状态', () => {
  let cls: CityLayoutSystem

  beforeEach(() => { cls = makeCLS() })
  afterEach(() => vi.restoreAllMocks())

  it('layouts 初始为空 Map', () => {
    expect((cls as any).layouts instanceof Map).toBe(true)
    expect((cls as any).layouts.size).toBe(0)
  })

  it('_gateKeySet 初始为空 Set', () => {
    expect((cls as any)._gateKeySet instanceof Set).toBe(true)
    expect((cls as any)._gateKeySet.size).toBe(0)
  })
})

describe('CityLayoutSystem.getCityLevel', () => {
  let cls: CityLayoutSystem

  beforeEach(() => { cls = makeCLS() })
  afterEach(() => vi.restoreAllMocks())

  it('未注册城市返回 village', () => {
    expect(cls.getCityLevel(1)).toBe('village')
    expect(cls.getCityLevel(999)).toBe('village')
  })

  it('注入 village 级别布局后正确返回', () => {
    ;(cls as any).layouts.set(1, makeCityLayout('village'))
    expect(cls.getCityLevel(1)).toBe('village')
  })

  it('注入 town 级别布局后正确返回', () => {
    ;(cls as any).layouts.set(2, makeCityLayout('town'))
    expect(cls.getCityLevel(2)).toBe('town')
  })

  it('注入 city 级别布局后正确返回', () => {
    ;(cls as any).layouts.set(3, makeCityLayout('city'))
    expect(cls.getCityLevel(3)).toBe('city')
  })

  it('注入 capital 级别布局后正确返回', () => {
    ;(cls as any).layouts.set(4, makeCityLayout('capital'))
    expect(cls.getCityLevel(4)).toBe('capital')
  })

  it('不同城市独立存储', () => {
    ;(cls as any).layouts.set(1, makeCityLayout('village'))
    ;(cls as any).layouts.set(2, makeCityLayout('capital'))
    expect(cls.getCityLevel(1)).toBe('village')
    expect(cls.getCityLevel(2)).toBe('capital')
    expect(cls.getCityLevel(3)).toBe('village') // 未注册返回默认
  })

  it('id=0 未注册时返回 village', () => {
    expect(cls.getCityLevel(0)).toBe('village')
  })

  it('负数 id 未注册时返回 village', () => {
    expect(cls.getCityLevel(-1)).toBe('village')
  })

  it('大数 id 未注册时返回 village', () => {
    expect(cls.getCityLevel(99999)).toBe('village')
  })

  it('注入后删除城市，getCityLevel 重新返回 village', () => {
    ;(cls as any).layouts.set(1, makeCityLayout('capital'))
    cls.removeCity(1)
    expect(cls.getCityLevel(1)).toBe('village')
  })

  it('连续注入相同 id 时最后一次覆盖前一次', () => {
    ;(cls as any).layouts.set(1, makeCityLayout('town'))
    ;(cls as any).layouts.set(1, makeCityLayout('capital'))
    expect(cls.getCityLevel(1)).toBe('capital')
  })

  it('注入 10 个不同城市都能正确查询', () => {
    const levels = ['village', 'town', 'city', 'capital', 'village', 'town', 'city', 'capital', 'village', 'capital']
    levels.forEach((level, i) => {
      ;(cls as any).layouts.set(i + 1, makeCityLayout(level))
    })
    levels.forEach((level, i) => {
      expect(cls.getCityLevel(i + 1)).toBe(level)
    })
  })
})

describe('CityLayoutSystem.getRoads', () => {
  let cls: CityLayoutSystem

  beforeEach(() => { cls = makeCLS() })
  afterEach(() => vi.restoreAllMocks())

  it('未注册城市返回空数组', () => {
    expect(cls.getRoads(1)).toHaveLength(0)
  })

  it('注入道路后可查询', () => {
    const roads: RoadSegment[] = [
      { x1: 0, y1: 0, x2: 10, y2: 0, width: 2, isPrimary: true },
      { x1: 5, y1: 0, x2: 5, y2: 10, width: 1, isPrimary: false },
    ]
    ;(cls as any).layouts.set(1, makeCityLayout('town', roads))
    expect(cls.getRoads(1)).toHaveLength(2)
    expect(cls.getRoads(1)[0].isPrimary).toBe(true)
    expect(cls.getRoads(1)[1].isPrimary).toBe(false)
  })

  it('返回的是内部引用', () => {
    const roads: RoadSegment[] = [{ x1: 0, y1: 0, x2: 5, y2: 5, width: 1, isPrimary: true }]
    ;(cls as any).layouts.set(1, makeCityLayout('village', roads))
    expect(cls.getRoads(1)).toBe((cls as any).layouts.get(1).roads)
  })

  it('道路 x1/y1/x2/y2 坐标正确存储', () => {
    const road = makeRoad(3, 4, 15, 20, 2, true)
    ;(cls as any).layouts.set(1, makeCityLayout('town', [road]))
    const r = cls.getRoads(1)[0]
    expect(r.x1).toBe(3)
    expect(r.y1).toBe(4)
    expect(r.x2).toBe(15)
    expect(r.y2).toBe(20)
  })

  it('道路 width 字段正确存储', () => {
    const road = makeRoad(0, 0, 10, 10, 5, true)
    ;(cls as any).layouts.set(1, makeCityLayout('city', [road]))
    expect(cls.getRoads(1)[0].width).toBe(5)
  })

  it('isPrimary=false 的道路正确存储', () => {
    const road = makeRoad(0, 0, 10, 10, 1, false)
    ;(cls as any).layouts.set(1, makeCityLayout('village', [road]))
    expect(cls.getRoads(1)[0].isPrimary).toBe(false)
  })

  it('空道路数组注入后查询返回空数组', () => {
    ;(cls as any).layouts.set(1, makeCityLayout('village', []))
    expect(cls.getRoads(1)).toHaveLength(0)
  })

  it('注入 10 条道路后能全部查到', () => {
    const roads = Array.from({ length: 10 }, (_, i) => makeRoad(i, 0, i + 1, 0))
    ;(cls as any).layouts.set(1, makeCityLayout('capital', roads))
    expect(cls.getRoads(1)).toHaveLength(10)
  })

  it('不同城市的道路独立', () => {
    const roads1 = [makeRoad(0, 0, 5, 0)]
    const roads2 = [makeRoad(10, 10, 20, 10), makeRoad(15, 10, 15, 20)]
    ;(cls as any).layouts.set(1, makeCityLayout('town', roads1))
    ;(cls as any).layouts.set(2, makeCityLayout('city', roads2))
    expect(cls.getRoads(1)).toHaveLength(1)
    expect(cls.getRoads(2)).toHaveLength(2)
  })

  it('删除城市后 getRoads 返回空数组', () => {
    const roads = [makeRoad()]
    ;(cls as any).layouts.set(1, makeCityLayout('town', roads))
    cls.removeCity(1)
    expect(cls.getRoads(1)).toHaveLength(0)
  })
})

describe('CityLayoutSystem.removeCity', () => {
  let cls: CityLayoutSystem

  beforeEach(() => { cls = makeCLS() })
  afterEach(() => vi.restoreAllMocks())

  it('删除已注册城市后查询返回默认值', () => {
    ;(cls as any).layouts.set(1, makeCityLayout('capital'))
    cls.removeCity(1)
    expect(cls.getCityLevel(1)).toBe('village')
    expect(cls.getRoads(1)).toHaveLength(0)
  })

  it('删除不存在的城市不报错', () => {
    expect(() => cls.removeCity(999)).not.toThrow()
  })

  it('删除后 layouts 大小减少', () => {
    ;(cls as any).layouts.set(1, makeCityLayout('town'))
    ;(cls as any).layouts.set(2, makeCityLayout('city'))
    cls.removeCity(1)
    expect((cls as any).layouts.size).toBe(1)
  })

  it('删除一个城市不影响其他城市', () => {
    ;(cls as any).layouts.set(1, makeCityLayout('town'))
    ;(cls as any).layouts.set(2, makeCityLayout('capital'))
    cls.removeCity(1)
    expect(cls.getCityLevel(2)).toBe('capital')
  })

  it('重复删除同一城市不报错', () => {
    ;(cls as any).layouts.set(1, makeCityLayout('town'))
    cls.removeCity(1)
    expect(() => cls.removeCity(1)).not.toThrow()
  })

  it('删除后重新注入相同 id 的城市有效', () => {
    ;(cls as any).layouts.set(1, makeCityLayout('town'))
    cls.removeCity(1)
    ;(cls as any).layouts.set(1, makeCityLayout('capital'))
    expect(cls.getCityLevel(1)).toBe('capital')
  })
})

describe('CityLayoutSystem.update 脏标记处理', () => {
  let cls: CityLayoutSystem

  beforeEach(() => { cls = makeCLS() })
  afterEach(() => vi.restoreAllMocks())

  it('tick 非 120 的倍数时不处理', () => {
    const layout = makeCityLayout('town', [], [], [], true)
    ;(cls as any).layouts.set(1, layout)
    cls.update(1)
    // dirty 仍然是 true，因为 1 % 120 !== 0
    expect((cls as any).layouts.get(1).dirty).toBe(true)
  })

  it('tick=0 时处理脏标记（0 % 120 === 0）', () => {
    const layout = makeCityLayout('town', [], [], [], true)
    ;(cls as any).layouts.set(1, layout)
    cls.update(0)
    expect((cls as any).layouts.get(1).dirty).toBe(false)
  })

  it('tick=120 时处理脏标记', () => {
    const layout = makeCityLayout('city', [], [], [], true)
    ;(cls as any).layouts.set(1, layout)
    cls.update(120)
    expect((cls as any).layouts.get(1).dirty).toBe(false)
  })

  it('tick=240 时处理脏标记', () => {
    const layout = makeCityLayout('capital', [], [], [], true)
    ;(cls as any).layouts.set(1, layout)
    cls.update(240)
    expect((cls as any).layouts.get(1).dirty).toBe(false)
  })

  it('tick=119 时不处理脏标记', () => {
    const layout = makeCityLayout('village', [], [], [], true)
    ;(cls as any).layouts.set(1, layout)
    cls.update(119)
    expect((cls as any).layouts.get(1).dirty).toBe(true)
  })

  it('tick=121 时不处理脏标记', () => {
    const layout = makeCityLayout('town', [], [], [], true)
    ;(cls as any).layouts.set(1, layout)
    cls.update(121)
    expect((cls as any).layouts.get(1).dirty).toBe(true)
  })

  it('dirty=false 时 update 不会改变其状态', () => {
    const layout = makeCityLayout('town', [], [], [], false)
    ;(cls as any).layouts.set(1, layout)
    cls.update(120)
    expect((cls as any).layouts.get(1).dirty).toBe(false)
  })

  it('多个城市都在 tick=120 时被处理', () => {
    ;(cls as any).layouts.set(1, makeCityLayout('town', [], [], [], true))
    ;(cls as any).layouts.set(2, makeCityLayout('city', [], [], [], true))
    ;(cls as any).layouts.set(3, makeCityLayout('capital', [], [], [], true))
    cls.update(120)
    expect((cls as any).layouts.get(1).dirty).toBe(false)
    expect((cls as any).layouts.get(2).dirty).toBe(false)
    expect((cls as any).layouts.get(3).dirty).toBe(false)
  })
})

describe('CityLayoutSystem layouts Map 高级操作', () => {
  let cls: CityLayoutSystem

  beforeEach(() => { cls = makeCLS() })
  afterEach(() => vi.restoreAllMocks())

  it('layouts.size 与注入城市数量匹配', () => {
    ;(cls as any).layouts.set(1, makeCityLayout('village'))
    ;(cls as any).layouts.set(2, makeCityLayout('town'))
    ;(cls as any).layouts.set(3, makeCityLayout('city'))
    expect((cls as any).layouts.size).toBe(3)
  })

  it('注入带 walls 的布局', () => {
    const walls = [{ x: 0, y: 0 }, { x: 1, y: 0 }]
    ;(cls as any).layouts.set(1, makeCityLayout('town', [], walls))
    const layout = (cls as any).layouts.get(1)
    expect(layout.walls).toHaveLength(2)
  })

  it('注入带 gates 的布局', () => {
    const gates = [{ x: 5, y: 0 }]
    ;(cls as any).layouts.set(1, makeCityLayout('city', [], [], gates))
    const layout = (cls as any).layouts.get(1)
    expect(layout.gates).toHaveLength(1)
  })

  it('zones 是 Map 类型', () => {
    ;(cls as any).layouts.set(1, makeCityLayout('capital'))
    const layout = (cls as any).layouts.get(1)
    expect(layout.zones instanceof Map).toBe(true)
  })

  it('注入带 zones 的布局', () => {
    const zones = new Map<number, string>([[1000, 'center'], [2000, 'commercial']])
    const layout = { level: 'capital', roads: [], walls: [], gates: [], zones, dirty: false }
    ;(cls as any).layouts.set(1, layout)
    const stored = (cls as any).layouts.get(1)
    expect(stored.zones.get(1000)).toBe('center')
    expect(stored.zones.get(2000)).toBe('commercial')
  })

  it('实例隔离：两个 CLS 实例不共享 layouts', () => {
    const cls1 = makeCLS()
    const cls2 = makeCLS()
    ;(cls1 as any).layouts.set(1, makeCityLayout('capital'))
    expect((cls2 as any).layouts.size).toBe(0)
  })
})
