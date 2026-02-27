import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureCartographySystem } from '../systems/CreatureCartographySystem'
import type { CartographicMap, MapType, MapDetail } from '../systems/CreatureCartographySystem'

let nextId = 1
function makeSys(): CreatureCartographySystem { return new CreatureCartographySystem() }
function makeMap(cartographerId: number, mapType: MapType = 'terrain', detail: MapDetail = 'basic'): CartographicMap {
  return { id: nextId++, cartographerId, mapType, detail, accuracy: 70, coverage: 60, tradeValue: 50, tick: 0 }
}

describe('CreatureCartographySystem.getMaps', () => {
  let sys: CreatureCartographySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无地图', () => { expect(sys.getMaps()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).maps.push(makeMap(1, 'nautical', 'masterwork'))
    expect(sys.getMaps()[0].mapType).toBe('nautical')
    expect(sys.getMaps()[0].detail).toBe('masterwork')
  })

  it('返回只读引用', () => {
    ;(sys as any).maps.push(makeMap(1))
    expect(sys.getMaps()).toBe((sys as any).maps)
  })

  it('支持所有 6 种地图类型', () => {
    const types: MapType[] = ['terrain', 'trade_route', 'military', 'resource', 'nautical', 'celestial']
    types.forEach((t, i) => { ;(sys as any).maps.push(makeMap(i + 1, t)) })
    const all = sys.getMaps()
    types.forEach((t, i) => { expect(all[i].mapType).toBe(t) })
  })

  it('支持所有 4 种细节等级', () => {
    const details: MapDetail[] = ['crude', 'basic', 'detailed', 'masterwork']
    details.forEach((d, i) => { ;(sys as any).maps.push(makeMap(i + 1, 'terrain', d)) })
    const all = sys.getMaps()
    details.forEach((d, i) => { expect(all[i].detail).toBe(d) })
  })
})

describe('CreatureCartographySystem.getSkill', () => {
  let sys: CreatureCartographySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('未知实体返回 0', () => { expect(sys.getSkill(999)).toBe(0) })

  it('注入技能后返回正确值', () => {
    ;(sys as any).skillMap.set(42, 82)
    expect(sys.getSkill(42)).toBe(82)
  })
})
