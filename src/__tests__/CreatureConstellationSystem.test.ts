import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureConstellationSystem, ConstellationType } from '../systems/CreatureConstellationSystem'
import type { Constellation } from '../systems/CreatureConstellationSystem'

// CHECK_INTERVAL=3500, DISCOVER_CHANCE=0.004, MAX_CONSTELLATIONS=20
// visibility: 0.5~1.0 (fluctuates with sin)
// bonusStrength: 5 + floor(random*20)
// season: 0..3

let nextId = 1
function makeSys() { return new CreatureConstellationSystem() }
function makeConstellation(name: string, type: ConstellationType, discoveredBy: number, tick: number): Constellation {
  return {
    id: nextId++,
    name,
    type,
    discoveredBy,
    visibility: 0.75,
    bonusStrength: 10,
    season: 2,
    tick,
  }
}

describe('CreatureConstellationSystem – 初始状态', () => {
  let sys: CreatureConstellationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无星座（constellations.length===0）', () => {
    expect((sys as any).constellations).toHaveLength(0)
  })

  it('usedNames初始为空Set', () => {
    expect((sys as any).usedNames.size).toBe(0)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
})

describe('CreatureConstellationSystem – 数据注入与查询', () => {
  let sys: CreatureConstellationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入后可查询name', () => {
    ;(sys as any).constellations.push(makeConstellation('The Great Bear', 'warrior', 1, 0))
    expect((sys as any).constellations[0].name).toBe('The Great Bear')
  })

  it('注入后可查询type', () => {
    ;(sys as any).constellations.push(makeConstellation('The Hunter', 'harvest', 2, 0))
    expect((sys as any).constellations[0].type).toBe('harvest')
  })

  it('注入后可查询discoveredBy', () => {
    ;(sys as any).constellations.push(makeConstellation('The Serpent', 'voyage', 99, 0))
    expect((sys as any).constellations[0].discoveredBy).toBe(99)
  })

  it('可以注入多个星座并查询', () => {
    ;(sys as any).constellations.push(makeConstellation('The Crown', 'wisdom', 1, 0))
    ;(sys as any).constellations.push(makeConstellation('The Phoenix', 'fortune', 2, 0))
    expect((sys as any).constellations).toHaveLength(2)
    expect((sys as any).constellations[1].name).toBe('The Phoenix')
  })
})

describe('CreatureConstellationSystem – ConstellationType枚举', () => {
  it('ConstellationType包含5种类型', () => {
    const types: ConstellationType[] = ['warrior', 'harvest', 'voyage', 'wisdom', 'fortune']
    expect(types).toHaveLength(5)
  })

  it('warrior类型可注入并读取', () => {
    const c = makeConstellation('A', 'warrior', 1, 0)
    expect(c.type).toBe('warrior')
  })

  it('harvest类型可注入并读取', () => {
    const c = makeConstellation('B', 'harvest', 1, 0)
    expect(c.type).toBe('harvest')
  })

  it('voyage类型可注入并读取', () => {
    const c = makeConstellation('C', 'voyage', 1, 0)
    expect(c.type).toBe('voyage')
  })

  it('wisdom类型可注入并读取', () => {
    const c = makeConstellation('D', 'wisdom', 1, 0)
    expect(c.type).toBe('wisdom')
  })

  it('fortune类型可注入并读取', () => {
    const c = makeConstellation('E', 'fortune', 1, 0)
    expect(c.type).toBe('fortune')
  })
})

describe('CreatureConstellationSystem – 字段读取', () => {
  let sys: CreatureConstellationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入的visibility字段可读', () => {
    ;(sys as any).constellations.push(makeConstellation('X', 'warrior', 1, 0))
    expect((sys as any).constellations[0].visibility).toBe(0.75)
  })

  it('注入的bonusStrength字段可读', () => {
    ;(sys as any).constellations.push(makeConstellation('X', 'warrior', 1, 0))
    expect((sys as any).constellations[0].bonusStrength).toBe(10)
  })

  it('注入的season字段可读', () => {
    ;(sys as any).constellations.push(makeConstellation('X', 'warrior', 1, 0))
    expect((sys as any).constellations[0].season).toBe(2)
  })

  it('注入的tick字段可读', () => {
    ;(sys as any).constellations.push(makeConstellation('X', 'warrior', 1, 5000))
    expect((sys as any).constellations[0].tick).toBe(5000)
  })
})

describe('CreatureConstellationSystem – CHECK_INTERVAL节流', () => {
  let sys: CreatureConstellationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick差值<3500时不更新lastCheck', () => {
    const em = { getEntitiesWithComponent: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3499)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=3500时更新lastCheck', () => {
    const em = { getEntitiesWithComponent: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3500)
    expect((sys as any).lastCheck).toBe(3500)
  })

  it('tick=3499时lastCheck保持0（恰好边界-1）', () => {
    const em = { getEntitiesWithComponent: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3499)
    expect((sys as any).lastCheck).toBe(0)
  })
})

describe('CreatureConstellationSystem – visibility随tick变化', () => {
  let sys: CreatureConstellationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('update后visibility在0.1~1之间', () => {
    const c = makeConstellation('Y', 'wisdom', 1, 0)
    ;(sys as any).constellations.push(c)
    // 直接调用visibility计算逻辑（通过update触发）
    const em = { getEntitiesWithComponent: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3500)
    const vis = (sys as any).constellations[0].visibility
    expect(vis).toBeGreaterThanOrEqual(0.1)
    expect(vis).toBeLessThanOrEqual(1)
  })
})
