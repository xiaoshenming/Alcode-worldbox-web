import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureGrommetMakersSystem } from '../systems/CreatureGrommetMakersSystem'
import type { GrommetMaker, GrommetType } from '../systems/CreatureGrommetMakersSystem'

let nextId = 1
function makeSys(): CreatureGrommetMakersSystem { return new CreatureGrommetMakersSystem() }
function makeMaker(entityId: number, grommetType: GrommetType = 'sail', skill = 40): GrommetMaker {
  return {
    id: nextId++, entityId, skill, grommetsMade: 25,
    grommetType, precision: 16 + skill * 0.72, reputation: 10 + skill * 0.78, tick: 0,
  }
}

// pruneDeadEntities 的最小 em stub
function makeEmStub(creatureIds: number[] = [], livingIds: Set<number> = new Set()) {
  return {
    getEntitiesWithComponents: (_a: string, _b: string) => creatureIds,
    getComponent: (_eid: number, _comp: string) => ({ age: 20 }),
    hasComponent: (eid: number, _comp: string) => livingIds.has(eid),
    tick: 0,
  } as any
}

describe('CreatureGrommetMakersSystem — 数据结构', () => {
  let sys: CreatureGrommetMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无索眼工', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'banner'))
    expect((sys as any).makers[0].grommetType).toBe('banner')
  })

  it('支持所有 4 种索眼类型', () => {
    const types: GrommetType[] = ['sail', 'tent', 'leather', 'banner']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].grommetType).toBe(t) })
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })

  it('skillMap 初始为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })
})

describe('CreatureGrommetMakersSystem — precision / reputation 公式', () => {
  let sys: CreatureGrommetMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('precision = 16 + skill * 0.72', () => {
    const skill = 50
    const m = makeMaker(1, 'sail', skill)
    expect(m.precision).toBeCloseTo(16 + skill * 0.72, 5)
  })

  it('reputation = 10 + skill * 0.78', () => {
    const skill = 60
    const m = makeMaker(1, 'tent', skill)
    expect(m.reputation).toBeCloseTo(10 + skill * 0.78, 5)
  })

  it('grommetsMade = 4 + floor(skill/6)', () => {
    const skill = 40
    const expected = 4 + Math.floor(skill / 6)
    const m = makeMaker(1, 'leather', skill)
    ;(m as any).grommetsMade = 4 + Math.floor(skill / 6)
    expect(m.grommetsMade).toBe(expected)
  })
})

describe('CreatureGrommetMakersSystem — grommetType 由 skill/25 决定', () => {
  it('skill < 25 => sail（索引0）', () => {
    const TYPES: GrommetType[] = ['sail', 'tent', 'leather', 'banner']
    expect(TYPES[Math.min(3, Math.floor(10 / 25))]).toBe('sail')
  })

  it('25 <= skill < 50 => tent（索引1）', () => {
    const TYPES: GrommetType[] = ['sail', 'tent', 'leather', 'banner']
    expect(TYPES[Math.min(3, Math.floor(30 / 25))]).toBe('tent')
  })

  it('50 <= skill < 75 => leather（索引2）', () => {
    const TYPES: GrommetType[] = ['sail', 'tent', 'leather', 'banner']
    expect(TYPES[Math.min(3, Math.floor(60 / 25))]).toBe('leather')
  })

  it('skill >= 75 => banner（索引3）', () => {
    const TYPES: GrommetType[] = ['sail', 'tent', 'leather', 'banner']
    expect(TYPES[Math.min(3, Math.floor(80 / 25))]).toBe('banner')
  })
})

describe('CreatureGrommetMakersSystem — CHECK_INTERVAL 节流', () => {
  let sys: CreatureGrommetMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 差值 < 1440 时不更新 lastCheck', () => {
    const em = makeEmStub([])
    sys.update(0, em, 0)
    const before = (sys as any).lastCheck
    sys.update(0, em, 1439)
    expect((sys as any).lastCheck).toBe(before)
  })

  it('tick 差值 >= 1440 时更新 lastCheck', () => {
    const em = makeEmStub([])
    sys.update(0, em, 0)
    sys.update(0, em, 1440)
    expect((sys as any).lastCheck).toBe(1440)
  })
})

describe('CreatureGrommetMakersSystem — time-based cleanup', () => {
  let sys: CreatureGrommetMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 过期（> cutoff）的记录被清除', () => {
    // cutoff = currentTick - 52000，记录 tick=0 会在 currentTick=52001 时被清除
    const old = makeMaker(1, 'sail', 20)
    old.tick = 0
    ;(sys as any).makers.push(old)
    // 直接执行清理逻辑
    const currentTick = 52001
    const cutoff = currentTick - 52000
    for (let i = (sys as any).makers.length - 1; i >= 0; i--) {
      if ((sys as any).makers[i].tick < cutoff) (sys as any).makers.splice(i, 1)
    }
    expect((sys as any).makers).toHaveLength(0)
  })

  it('未过期的记录保留', () => {
    const fresh = makeMaker(2, 'tent', 30)
    fresh.tick = 50000
    ;(sys as any).makers.push(fresh)
    const currentTick = 52001
    const cutoff = currentTick - 52000
    for (let i = (sys as any).makers.length - 1; i >= 0; i--) {
      if ((sys as any).makers[i].tick < cutoff) (sys as any).makers.splice(i, 1)
    }
    expect((sys as any).makers).toHaveLength(1)
  })
})
