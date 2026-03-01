import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureCartographerSystem } from '../systems/CreatureCartographerSystem'
import type { Cartographer, MapType } from '../systems/CreatureCartographerSystem'

let nextId = 1
function makeSys(): CreatureCartographerSystem { return new CreatureCartographerSystem() }
function makeCartographer(entityId: number, mapType: MapType = 'terrain'): Cartographer {
  return { id: nextId++, entityId, skill: 30, mapsDrawn: 5, mapType, accuracy: 60, coverage: 40, tick: 0 }
}

describe('CreatureCartographerSystem.getCartographers', () => {
  let sys: CreatureCartographerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无制图师', () => { expect((sys as any).cartographers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).cartographers.push(makeCartographer(1, 'nautical'))
    expect((sys as any).cartographers[0].mapType).toBe('nautical')
  })

  it('返回只读引用', () => {
    ;(sys as any).cartographers.push(makeCartographer(1))
    expect((sys as any).cartographers).toBe((sys as any).cartographers)
  })

  it('支持所有 4 种地图类型', () => {
    const types: MapType[] = ['terrain', 'trade', 'military', 'nautical']
    types.forEach((t, i) => { ;(sys as any).cartographers.push(makeCartographer(i + 1, t)) })
    const all = (sys as any).cartographers
    types.forEach((t, i) => { expect(all[i].mapType).toBe(t) })
  })
})

describe('CreatureCartographerSystem.getSkill', () => {
  let sys: CreatureCartographerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('未知实体返回 0', () => { expect(((sys as any).skillMap.get(999) ?? 0)).toBe(0) })

  it('注入技能后返回正确值', () => {
    ;(sys as any).skillMap.set(42, 75)
    expect(((sys as any).skillMap.get(42) ?? 0)).toBe(75)
  })
})
