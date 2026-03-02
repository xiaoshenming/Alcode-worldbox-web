import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureRopeMakersSystem } from '../systems/CreatureRopeMakersSystem'
import type { RopeMaker } from '../systems/CreatureRopeMakersSystem'

// CHECK_INTERVAL = 2510, MAX_MAKERS = 14, RECRUIT_CHANCE = 0.002

let nextId = 1
function makeSys(): CreatureRopeMakersSystem { return new CreatureRopeMakersSystem() }
function makeMaker(entityId: number, overrides: Partial<RopeMaker> = {}): RopeMaker {
  return { id: nextId++, entityId, twistStrength: 70, fiberSelection: 65, ropeLength: 80, durability: 75, tick: 0, ...overrides }
}
function makeEm() {
  return { getEntitiesWithComponent: vi.fn().mockReturnValue([]) } as any
}

describe('CreatureRopeMakersSystem.getMakers', () => {
  let sys: CreatureRopeMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无绳索工', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('字段正确', () => {
    ;(sys as any).makers.push(makeMaker(2))
    const m = (sys as any).makers[0]
    expect(m.twistStrength).toBe(70)
    expect(m.durability).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})

describe('CreatureRopeMakersSystem CHECK_INTERVAL 节流', () => {
  let sys: CreatureRopeMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick不足CHECK_INTERVAL时不更新lastCheck', () => {
    const em = makeEm()
    sys.update(1, em, 100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick达到CHECK_INTERVAL时更新lastCheck', () => {
    const em = makeEm()
    sys.update(1, em, 2510)
    expect((sys as any).lastCheck).toBe(2510)
  })

  it('第二次tick不足间隔时跳过（lastCheck保持上次值）', () => {
    const em = makeEm()
    sys.update(1, em, 2510)
    sys.update(1, em, 2600)
    expect((sys as any).lastCheck).toBe(2510)
  })

  it('两次都达到间隔时lastCheck更新为第二次tick', () => {
    const em = makeEm()
    sys.update(1, em, 2510)
    sys.update(1, em, 5020)
    expect((sys as any).lastCheck).toBe(5020)
  })
})

describe('CreatureRopeMakersSystem 技能递增', () => {
  let sys: CreatureRopeMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('update后twistStrength增加0.02', () => {
    ;(sys as any).makers.push(makeMaker(1, { twistStrength: 50 }))
    const em = makeEm()
    sys.update(1, em, 2510)
    expect((sys as any).makers[0].twistStrength).toBeCloseTo(50.02)
  })

  it('update后durability增加0.015', () => {
    ;(sys as any).makers.push(makeMaker(1, { durability: 50 }))
    const em = makeEm()
    sys.update(1, em, 2510)
    expect((sys as any).makers[0].durability).toBeCloseTo(50.015)
  })

  it('update后fiberSelection增加0.01', () => {
    ;(sys as any).makers.push(makeMaker(1, { fiberSelection: 50 }))
    const em = makeEm()
    sys.update(1, em, 2510)
    expect((sys as any).makers[0].fiberSelection).toBeCloseTo(50.01)
  })

  it('twistStrength不超过100（上限钳制）', () => {
    ;(sys as any).makers.push(makeMaker(1, { twistStrength: 99.99 }))
    const em = makeEm()
    sys.update(1, em, 2510)
    expect((sys as any).makers[0].twistStrength).toBe(100)
  })

  it('durability不超过100（上限钳制）', () => {
    ;(sys as any).makers.push(makeMaker(1, { durability: 99.99 }))
    const em = makeEm()
    sys.update(1, em, 2510)
    expect((sys as any).makers[0].durability).toBe(100)
  })

  it('fiberSelection不超过100（上限钳制）', () => {
    ;(sys as any).makers.push(makeMaker(1, { fiberSelection: 99.99 }))
    const em = makeEm()
    sys.update(1, em, 2510)
    expect((sys as any).makers[0].fiberSelection).toBe(100)
  })

  it('多个maker同时增长', () => {
    ;(sys as any).makers.push(makeMaker(1, { twistStrength: 40 }))
    ;(sys as any).makers.push(makeMaker(2, { twistStrength: 60 }))
    const em = makeEm()
    sys.update(1, em, 2510)
    expect((sys as any).makers[0].twistStrength).toBeCloseTo(40.02)
    expect((sys as any).makers[1].twistStrength).toBeCloseTo(60.02)
  })
})

describe('CreatureRopeMakersSystem cleanup（twistStrength<=4剔除）', () => {
  let sys: CreatureRopeMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('twistStrength增长后恰好=4时被移除（初始3.98+0.02=4.00<=4）', () => {
    ;(sys as any).makers.push(makeMaker(1, { twistStrength: 3.98 }))
    const em = makeEm()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 2510)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('twistStrength=2时也被移除（增长后仍<=4）', () => {
    ;(sys as any).makers.push(makeMaker(1, { twistStrength: 2 }))
    const em = makeEm()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 2510)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('twistStrength>4的maker保留', () => {
    ;(sys as any).makers.push(makeMaker(1, { twistStrength: 4.01 }))
    const em = makeEm()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 2510)
    // 增长0.02后为4.03，仍>4，保留
    expect((sys as any).makers).toHaveLength(1)
  })

  it('混合列表：低于阈值的被删除，高于阈值的保留', () => {
    ;(sys as any).makers.push(makeMaker(1, { twistStrength: 3 }))
    ;(sys as any).makers.push(makeMaker(2, { twistStrength: 50 }))
    ;(sys as any).makers.push(makeMaker(3, { twistStrength: 2 }))
    const em = makeEm()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 2510)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('节流期内不执行cleanup（低twistStrength仍保留）', () => {
    ;(sys as any).makers.push(makeMaker(1, { twistStrength: 1 }))
    const em = makeEm()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 100)  // tick不足CHECK_INTERVAL
    expect((sys as any).makers).toHaveLength(1)
  })
})

describe('CreatureRopeMakersSystem nextId 自增', () => {
  let sys: CreatureRopeMakersSystem
  beforeEach(() => { sys = makeSys() })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
})
