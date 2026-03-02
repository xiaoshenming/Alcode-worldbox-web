import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureRopeWalkerSystem } from '../systems/CreatureRopeWalkerSystem'
import type { RopeWalker } from '../systems/CreatureRopeWalkerSystem'

// CHECK_INTERVAL = 2590, MAX_ROPEWALKERS = 10, RECRUIT_CHANCE = 0.0015

let nextId = 1
function makeSys(): CreatureRopeWalkerSystem { return new CreatureRopeWalkerSystem() }
function makeWalker(entityId: number, overrides: Partial<RopeWalker> = {}): RopeWalker {
  return { id: nextId++, entityId, fiberBraiding: 70, tensileStrength: 65, knotTying: 80, outputQuality: 75, tick: 0, ...overrides }
}
function makeEm() {
  return { getEntitiesWithComponent: vi.fn().mockReturnValue([]) } as any
}

describe('CreatureRopeWalkerSystem.getRopeWalkers', () => {
  let sys: CreatureRopeWalkerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无绳索行者', () => { expect((sys as any).ropeWalkers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).ropeWalkers.push(makeWalker(1))
    expect((sys as any).ropeWalkers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).ropeWalkers.push(makeWalker(1))
    expect((sys as any).ropeWalkers).toBe((sys as any).ropeWalkers)
  })
  it('字段正确', () => {
    ;(sys as any).ropeWalkers.push(makeWalker(2))
    const w = (sys as any).ropeWalkers[0]
    expect(w.fiberBraiding).toBe(70)
    expect(w.knotTying).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).ropeWalkers.push(makeWalker(1))
    ;(sys as any).ropeWalkers.push(makeWalker(2))
    expect((sys as any).ropeWalkers).toHaveLength(2)
  })
})

describe('CreatureRopeWalkerSystem CHECK_INTERVAL 节���', () => {
  let sys: CreatureRopeWalkerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick不足CHECK_INTERVAL时不更新lastCheck', () => {
    const em = makeEm()
    sys.update(1, em, 100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2590时触发更新并更新lastCheck', () => {
    const em = makeEm()
    sys.update(1, em, 2590)
    expect((sys as any).lastCheck).toBe(2590)
  })

  it('第二次tick不足间隔时跳过（lastCheck保持上次值）', () => {
    const em = makeEm()
    sys.update(1, em, 2590)
    sys.update(1, em, 2700)
    expect((sys as any).lastCheck).toBe(2590)
  })

  it('两次tick都达到间隔时lastCheck更新为第二次tick', () => {
    const em = makeEm()
    sys.update(1, em, 2590)
    sys.update(1, em, 5180)
    expect((sys as any).lastCheck).toBe(5180)
  })
})

describe('CreatureRopeWalkerSystem 技能递增', () => {
  let sys: CreatureRopeWalkerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('update后fiberBraiding增加0.02', () => {
    ;(sys as any).ropeWalkers.push(makeWalker(1, { fiberBraiding: 50 }))
    const em = makeEm()
    sys.update(1, em, 2590)
    expect((sys as any).ropeWalkers[0].fiberBraiding).toBeCloseTo(50.02)
  })

  it('update后knotTying增加0.015', () => {
    ;(sys as any).ropeWalkers.push(makeWalker(1, { knotTying: 50 }))
    const em = makeEm()
    sys.update(1, em, 2590)
    expect((sys as any).ropeWalkers[0].knotTying).toBeCloseTo(50.015)
  })

  it('update后outputQuality增加0.01', () => {
    ;(sys as any).ropeWalkers.push(makeWalker(1, { outputQuality: 50 }))
    const em = makeEm()
    sys.update(1, em, 2590)
    expect((sys as any).ropeWalkers[0].outputQuality).toBeCloseTo(50.01)
  })

  it('fiberBraiding不超过100（上限钳制）', () => {
    ;(sys as any).ropeWalkers.push(makeWalker(1, { fiberBraiding: 99.99 }))
    const em = makeEm()
    sys.update(1, em, 2590)
    expect((sys as any).ropeWalkers[0].fiberBraiding).toBe(100)
  })

  it('knotTying不超过100（上限钳制）', () => {
    ;(sys as any).ropeWalkers.push(makeWalker(1, { knotTying: 99.99 }))
    const em = makeEm()
    sys.update(1, em, 2590)
    expect((sys as any).ropeWalkers[0].knotTying).toBe(100)
  })

  it('outputQuality不超过100（上限钳制）', () => {
    ;(sys as any).ropeWalkers.push(makeWalker(1, { outputQuality: 99.99 }))
    const em = makeEm()
    sys.update(1, em, 2590)
    expect((sys as any).ropeWalkers[0].outputQuality).toBe(100)
  })

  it('多个walker同时增长', () => {
    ;(sys as any).ropeWalkers.push(makeWalker(1, { fiberBraiding: 30 }))
    ;(sys as any).ropeWalkers.push(makeWalker(2, { fiberBraiding: 60 }))
    const em = makeEm()
    sys.update(1, em, 2590)
    expect((sys as any).ropeWalkers[0].fiberBraiding).toBeCloseTo(30.02)
    expect((sys as any).ropeWalkers[1].fiberBraiding).toBeCloseTo(60.02)
  })

  it('节流期内不增长技能', () => {
    ;(sys as any).ropeWalkers.push(makeWalker(1, { fiberBraiding: 50 }))
    const em = makeEm()
    sys.update(1, em, 100)  // tick不足CHECK_INTERVAL
    expect((sys as any).ropeWalkers[0].fiberBraiding).toBe(50)
  })
})

describe('CreatureRopeWalkerSystem cleanup（fiberBraiding<=4剔除）', () => {
  let sys: CreatureRopeWalkerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('fiberBraiding增长后恰好=4时被移除（初始3.98+0.02=4.00<=4）', () => {
    ;(sys as any).ropeWalkers.push(makeWalker(1, { fiberBraiding: 3.98 }))
    const em = makeEm()
    sys.update(1, em, 2590)
    expect((sys as any).ropeWalkers).toHaveLength(0)
  })

  it('fiberBraiding=2时也被移除（增长后仍<=4）', () => {
    ;(sys as any).ropeWalkers.push(makeWalker(1, { fiberBraiding: 2 }))
    const em = makeEm()
    sys.update(1, em, 2590)
    expect((sys as any).ropeWalkers).toHaveLength(0)
  })

  it('fiberBraiding>4的walker保留', () => {
    ;(sys as any).ropeWalkers.push(makeWalker(1, { fiberBraiding: 4.01 }))
    const em = makeEm()
    sys.update(1, em, 2590)
    // 增长0.02后为4.03，仍>4，保留
    expect((sys as any).ropeWalkers).toHaveLength(1)
  })

  it('混合列表：低于阈值的被删除，高于阈值的保留', () => {
    ;(sys as any).ropeWalkers.push(makeWalker(1, { fiberBraiding: 2 }))
    ;(sys as any).ropeWalkers.push(makeWalker(2, { fiberBraiding: 55 }))
    ;(sys as any).ropeWalkers.push(makeWalker(3, { fiberBraiding: 1 }))
    const em = makeEm()
    sys.update(1, em, 2590)
    expect((sys as any).ropeWalkers).toHaveLength(1)
    expect((sys as any).ropeWalkers[0].entityId).toBe(2)
  })

  it('节流期内不执行cleanup（低fiberBraiding仍保留）', () => {
    ;(sys as any).ropeWalkers.push(makeWalker(1, { fiberBraiding: 1 }))
    const em = makeEm()
    sys.update(1, em, 100)  // tick不足CHECK_INTERVAL
    expect((sys as any).ropeWalkers).toHaveLength(1)
  })
})

describe('CreatureRopeWalkerSystem nextId 自增', () => {
  let sys: CreatureRopeWalkerSystem
  beforeEach(() => { sys = makeSys() })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
})
