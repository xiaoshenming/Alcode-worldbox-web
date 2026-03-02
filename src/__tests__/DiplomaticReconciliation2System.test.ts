import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticReconciliation2System } from '../systems/DiplomaticReconciliation2System'

const W = {} as any, EM = {} as any
function makeSys() { return new DiplomaticReconciliation2System() }
function makeProc(overrides = {}) {
  return { id: 1, civIdA: 10, civIdB: 20, tick: 0, stage: 'acknowledgment' as const,
    grievanceResolved: 0, mutualRespect: 10, culturalExchange: 5, publicSupport: 20, duration: 0, ...overrides }
}
// spawn需要: chance<INITIATE_CHANCE, civA≠civB
// random序列: 0(chance), 0(civA→1), 0.5(civB→5), 0(rest...)
function mockSpawn() {
  return vi.spyOn(Math, 'random')
    .mockReturnValueOnce(0)    // chance check passes
    .mockReturnValueOnce(0)    // civA = 1
    .mockReturnValueOnce(0.5)  // civB = 5 (≠1)
    .mockReturnValue(0.5)      // rest
}

describe('DiplomaticReconciliation2System', () => {
  let sys: DiplomaticReconciliation2System
  beforeEach(() => { sys = makeSys() })

  it('初始processes为空', () => { expect((sys as any).processes).toHaveLength(0) })
  it('初始nextId为1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始lastCheck为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('processes是数组', () => { expect(Array.isArray((sys as any).processes)).toBe(true) })

  it('tick不足CHECK_INTERVAL时不更新lastCheck', () => {
    sys.update(1, W, EM, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick>=CHECK_INTERVAL时更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2600)
    expect((sys as any).lastCheck).toBe(2600)
    vi.restoreAllMocks()
  })

  it('random=1时不spawn新process', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2600)
    expect((sys as any).processes).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('spawn条件满足时创建process', () => {
    const spy = mockSpawn()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 2600)
    expect((sys as any).processes).toHaveLength(1)
    spy.mockRestore()
  })
  it('spawn后nextId递增', () => {
    const spy = mockSpawn()
    sys.update(1, W, EM, 2600)
    expect((sys as any).nextId).toBe(2)
    spy.mockRestore()
  })
  it('spawn的process初始stage为acknowledgment', () => {
    const spy = mockSpawn()
    sys.update(1, W, EM, 2600)
    expect((sys as any).processes[0].stage).toBe('acknowledgment')
    spy.mockRestore()
  })
  it('spawn的process经过update后duration为1', () => {
    const spy = mockSpawn()
    sys.update(1, W, EM, 2600)
    expect((sys as any).processes[0].duration).toBe(1)
    spy.mockRestore()
  })

  it('processes达到14时不再spawn', () => {
    const spy = mockSpawn()
    for (let i = 0; i < 14; i++) (sys as any).processes.push(makeProc({ id: i }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 2600)
    expect((sys as any).processes).toHaveLength(14)
    spy.mockRestore()
  })

  it('每次update后process.duration递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).processes.push(makeProc())
    sys.update(1, W, EM, 2600)
    expect((sys as any).processes[0].duration).toBe(1)
    vi.restoreAllMocks()
  })
  it('mutualRespect每tick+0.03', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).processes.push(makeProc({ mutualRespect: 10 }))
    sys.update(1, W, EM, 2600)
    expect((sys as any).processes[0].mutualRespect).toBeCloseTo(10.03)
    vi.restoreAllMocks()
  })
  it('culturalExchange每tick+0.02', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).processes.push(makeProc({ culturalExchange: 5 }))
    sys.update(1, W, EM, 2600)
    expect((sys as any).processes[0].culturalExchange).toBeCloseTo(5.02)
    vi.restoreAllMocks()
  })
  it('mutualRespect上限100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).processes.push(makeProc({ mutualRespect: 100 }))
    sys.update(1, W, EM, 2600)
    expect((sys as any).processes[0].mutualRespect).toBe(100)
    vi.restoreAllMocks()
  })

  it('acknowledgment→dialogue当mutualRespect>35', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).processes.push(makeProc({ stage: 'acknowledgment', mutualRespect: 35.5 }))
    sys.update(1, W, EM, 2600)
    expect((sys as any).processes[0].stage).toBe('dialogue')
    vi.restoreAllMocks()
  })
  it('acknowledgment不转换当mutualRespect<=35', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).processes.push(makeProc({ stage: 'acknowledgment', mutualRespect: 30 }))
    sys.update(1, W, EM, 2600)
    expect((sys as any).processes[0].stage).toBe('acknowledgment')
    vi.restoreAllMocks()
  })
  it('dialogue→healing当culturalExchange>40', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).processes.push(makeProc({ stage: 'dialogue', culturalExchange: 41 }))
    sys.update(1, W, EM, 2600)
    expect((sys as any).processes[0].stage).toBe('healing')
    vi.restoreAllMocks()
  })
  it('healing→renewed当mutualRespect>70', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).processes.push(makeProc({ stage: 'healing', mutualRespect: 71 }))
    sys.update(1, W, EM, 2600)
    expect((sys as any).processes[0].stage).toBe('renewed')
    vi.restoreAllMocks()
  })
  it('healing→renewed时grievanceResolved递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).processes.push(makeProc({ stage: 'healing', mutualRespect: 71, grievanceResolved: 0 }))
    sys.update(1, W, EM, 2600)
    expect((sys as any).processes[0].grievanceResolved).toBe(1)
    vi.restoreAllMocks()
  })

  // cleanup: duration++ 先执行，所以 duration=99 → 100 → 被删
  it('renewed且duration>=100时被删除(初始99,+1后=100)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).processes.push(makeProc({ stage: 'renewed', duration: 99 }))
    sys.update(1, W, EM, 2600)
    expect((sys as any).processes).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('renewed但duration+1后<100时不删除(初始98)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).processes.push(makeProc({ stage: 'renewed', duration: 98 }))
    sys.update(1, W, EM, 2600)
    expect((sys as any).processes).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('非renewed且duration>=100时不删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).processes.push(makeProc({ stage: 'healing', duration: 200 }))
    sys.update(1, W, EM, 2600)
    expect((sys as any).processes).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('多个process中只删除符合条件的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).processes.push(makeProc({ id: 1, stage: 'renewed', duration: 99 }))
    ;(sys as any).processes.push(makeProc({ id: 2, stage: 'dialogue', duration: 50 }))
    sys.update(1, W, EM, 2600)
    expect((sys as any).processes).toHaveLength(1)
    expect((sys as any).processes[0].id).toBe(2)
    vi.restoreAllMocks()
  })
})
