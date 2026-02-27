import { describe, it, expect, beforeEach } from 'vitest'
import { CityLayoutSystem } from '../systems/CityLayoutSystem'
import type { CityData, RoadSegment } from '../systems/CityLayoutSystem'

// CityLayoutSystem 测试：
// - getCityLevel(cityId)  → 未注册返回 'village'，注入后返回正确等级
// - getRoads(cityId)      → 未注册返回 []，注入后返回道路数组
// - removeCity(cityId)    → 删除城市布局
// updateCity() 内部调用 rebuildLayout（A* 寻路），测试通过注入 layouts 绕过。
// calcLevel 规则：<10 buildings=village, >=10=town, >25=city, >50=capital

function makeCLS(): CityLayoutSystem {
  return new CityLayoutSystem()
}

function makeCityLayout(level: string, roads: RoadSegment[] = []) {
  return { level, roads, walls: [], gates: [], zones: new Map(), dirty: false }
}

describe('CityLayoutSystem.getCityLevel', () => {
  let cls: CityLayoutSystem

  beforeEach(() => { cls = makeCLS() })

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
    expect(cls.getCityLevel(3)).toBe('village')  // 未注册返回默认
  })
})

describe('CityLayoutSystem.getRoads', () => {
  let cls: CityLayoutSystem

  beforeEach(() => { cls = makeCLS() })

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
})

describe('CityLayoutSystem.removeCity', () => {
  let cls: CityLayoutSystem

  beforeEach(() => { cls = makeCLS() })

  it('删除已注册城市后查询返回默认值', () => {
    ;(cls as any).layouts.set(1, makeCityLayout('capital'))
    ;(cls as any).cities.set(1, { id: 1, centerX: 0, centerY: 0, buildings: [], population: 0 })
    cls.removeCity(1)
    expect(cls.getCityLevel(1)).toBe('village')
    expect(cls.getRoads(1)).toHaveLength(0)
  })

  it('删除不存在的城市不报错', () => {
    expect(() => cls.removeCity(999)).not.toThrow()
  })
})
