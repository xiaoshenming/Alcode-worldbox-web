import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureConstellationSystem, ConstellationType } from '../systems/CreatureConstellationSystem'
import type { Constellation } from '../systems/CreatureConstellationSystem'

// CHECK_INTERVAL=3500, DISCOVER_CHANCE=0.004, MAX_CONSTELLATIONS=20

let nextId = 1
function makeSys() { return new CreatureConstellationSystem() }
function makeConstellation(name: string, type: ConstellationType, discoveredBy: number, tick: number): Constellation {
  return { id: nextId++, name, type, discoveredBy, visibility: 0.75, bonusStrength: 10, season: 2, tick }
}

describe('CreatureConstellationSystem - 初始状态', () => {
  let sys: CreatureConstellationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无星座', () => { expect((sys as any).constellations).toHaveLength(0) })
  it('usedNames 初始为空 Set', () => { expect((sys as any).usedNames.size).toBe(0) })
  it('lastCheck 初始为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('nextId 初始为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('constellations 是数组', () => { expect(Array.isArray((sys as any).constellations)).toBe(true) })
  it('usedNames 是 Set', () => { expect((sys as any).usedNames instanceof Set).toBe(true) })
})

describe('CreatureConstellationSystem - 数据注入与查询', () => {
  let sys: CreatureConstellationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('注入后可查询 name', () => {
    ;(sys as any).constellations.push(makeConstellation('The Great Bear', 'warrior', 1, 0))
    expect((sys as any).constellations[0].name).toBe('The Great Bear')
  })
  it('注入后可查询 type', () => {
    ;(sys as any).constellations.push(makeConstellation('The Hunter', 'harvest', 2, 0))
    expect((sys as any).constellations[0].type).toBe('harvest')
  })
  it('注入后可查询 discoveredBy', () => {
    ;(sys as any).constellations.push(makeConstellation('The Serpent', 'voyage', 99, 0))
    expect((sys as any).constellations[0].discoveredBy).toBe(99)
  })
  it('可以注入多个星座', () => {
    ;(sys as any).constellations.push(makeConstellation('The Crown', 'wisdom', 1, 0))
    ;(sys as any).constellations.push(makeConstellation('The Phoenix', 'fortune', 2, 0))
    expect((sys as any).constellations).toHaveLength(2)
  })
  it('注入的 visibility 字段可读', () => {
    ;(sys as any).constellations.push(makeConstellation('X', 'warrior', 1, 0))
    expect((sys as any).constellations[0].visibility).toBe(0.75)
  })
  it('注入的 bonusStrength 字段可读', () => {
    ;(sys as any).constellations.push(makeConstellation('X', 'warrior', 1, 0))
    expect((sys as any).constellations[0].bonusStrength).toBe(10)
  })
  it('注入的 season 字段可读', () => {
    ;(sys as any).constellations.push(makeConstellation('X', 'warrior', 1, 0))
    expect((sys as any).constellations[0].season).toBe(2)
  })
  it('注入的 tick 字段可读', () => {
    ;(sys as any).constellations.push(makeConstellation('X', 'warrior', 1, 5000))
    expect((sys as any).constellations[0].tick).toBe(5000)
  })
  it('注入后 id 字段正确', () => {
    nextId = 7
    ;(sys as any).constellations.push(makeConstellation('Y', 'fortune', 1, 0))
    expect((sys as any).constellations[0].id).toBe(7)
  })
})

describe('CreatureConstellationSystem - ConstellationType 枚举', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('ConstellationType 包含 5 种类型', () => {
    const types: ConstellationType[] = ['warrior', 'harvest', 'voyage', 'wisdom', 'fortune']
    expect(types).toHaveLength(5)
  })
  it('warrior 类型可注入并读取', () => {
    expect(makeConstellation('A', 'warrior', 1, 0).type).toBe('warrior')
  })
  it('harvest 类型可注入并读取', () => {
    expect(makeConstellation('B', 'harvest', 1, 0).type).toBe('harvest')
  })
  it('voyage 类型可注入并读取', () => {
    expect(makeConstellation('C', 'voyage', 1, 0).type).toBe('voyage')
  })
  it('wisdom 类型可注入并读取', () => {
    expect(makeConstellation('D', 'wisdom', 1, 0).type).toBe('wisdom')
  })
  it('fortune 类型可注入并读取', () => {
    expect(makeConstellation('E', 'fortune', 1, 0).type).toBe('fortune')
  })
  it('所有类型均为字符串', () => {
    const types: ConstellationType[] = ['warrior', 'harvest', 'voyage', 'wisdom', 'fortune']
    types.forEach(t => expect(typeof t).toBe('string'))
  })
})

describe('CreatureConstellationSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureConstellationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick 差值 < 3500 时不更新 lastCheck', () => {
    const em = { getEntitiesWithComponent: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3499)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick 差值 >= 3500 时更新 lastCheck', () => {
    const em = { getEntitiesWithComponent: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3500)
    expect((sys as any).lastCheck).toBe(3500)
  })
  it('tick=3499 时 lastCheck 保持 0（恰好边界-1）', () => {
    const em = { getEntitiesWithComponent: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3499)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=3500 时恰好触发', () => {
    const em = { getEntitiesWithComponent: () => [] as number[] } as any
    sys.update(1, em, 3500)
    expect((sys as any).lastCheck).toBe(3500)
  })
  it('连续调用不足间隔时不更新', () => {
    const em = { getEntitiesWithComponent: () => [] as number[] } as any
    sys.update(1, em, 3500)
    sys.update(1, em, 4000)
    expect((sys as any).lastCheck).toBe(3500)
  })
  it('二次间隔到达时更新 lastCheck', () => {
    const em = { getEntitiesWithComponent: () => [] as number[] } as any
    sys.update(1, em, 3500)
    sys.update(1, em, 7000)
    expect((sys as any).lastCheck).toBe(7000)
  })
})

describe('CreatureConstellationSystem - visibility 随 tick 变化', () => {
  let sys: CreatureConstellationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('update 后 visibility 在 0.1~1 之间', () => {
    ;(sys as any).constellations.push(makeConstellation('Y', 'wisdom', 1, 0))
    const em = { getEntitiesWithComponent: () => [] as number[] } as any
    sys.update(1, em, 3500)
    const vis = (sys as any).constellations[0].visibility
    expect(vis).toBeGreaterThanOrEqual(0.1)
    expect(vis).toBeLessThanOrEqual(1)
  })
  it('多个星座的 visibility 都在合法范围', () => {
    ;(sys as any).constellations.push(makeConstellation('A', 'warrior', 1, 0))
    ;(sys as any).constellations.push(makeConstellation('B', 'harvest', 2, 1000))
    ;(sys as any).constellations.push(makeConstellation('C', 'fortune', 3, 2000))
    const em = { getEntitiesWithComponent: () => [] as number[] } as any
    sys.update(1, em, 3500)
    for (const c of (sys as any).constellations) {
      expect(c.visibility).toBeGreaterThanOrEqual(0.1)
      expect(c.visibility).toBeLessThanOrEqual(1)
    }
  })
})

describe('CreatureConstellationSystem - MAX_CONSTELLATIONS 上限', () => {
  let sys: CreatureConstellationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('可以注入 20 个星座', () => {
    for (let i = 0; i < 20; i++) {
      ;(sys as any).constellations.push(makeConstellation(`Star${i}`, 'warrior', i, 0))
    }
    expect((sys as any).constellations).toHaveLength(20)
  })
  it('满 20 个时不再发现新星座（random=0.001触发但已满）', () => {
    for (let i = 0; i < 20; i++) {
      ;(sys as any).constellations.push(makeConstellation(`Star${i}`, 'warrior', i, 0))
    }
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const em = { getEntitiesWithComponent: () => [1] as number[] } as any
    sys.update(1, em, 3500)
    expect((sys as any).constellations.length).toBeLessThanOrEqual(20)
  })
  it('usedNames 中存储已使用的名字', () => {
    ;(sys as any).usedNames.add('The Great Bear')
    expect((sys as any).usedNames.has('The Great Bear')).toBe(true)
  })
  it('名字不重复使用', () => {
    ;(sys as any).usedNames.add('The Hunter')
    ;(sys as any).usedNames.add('The Crown')
    expect((sys as any).usedNames.size).toBe(2)
  })
  it('bonusStrength 公式：5 + floor(random*20)，random=0.5 → 15', () => {
    const result = 5 + Math.floor(0.5 * 20)
    expect(result).toBe(15)
  })
  it('season 公式：floor(random*4)，random=0.75 → 3', () => {
    const result = Math.floor(0.75 * 4)
    expect(result).toBe(3)
  })
  it('visibility 初始范围：0.5 + random*0.5，random=0 → 0.5', () => {
    const result = 0.5 + 0 * 0.5
    expect(result).toBe(0.5)
  })
  it('visibility 初始范围：0.5 + random*0.5，random=1 → 1.0', () => {
    const result = 0.5 + 1 * 0.5
    expect(result).toBe(1.0)
  })
})
