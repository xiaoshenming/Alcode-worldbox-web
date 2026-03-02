import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticReconciliationSystem } from '../systems/DiplomaticReconciliationSystem'

const W = {} as any, EM = {} as any
function makeSys() { return new DiplomaticReconciliationSystem() }
function makeProc(overrides = {}) {
  return { id: 1, civIdA: 10, civIdB: 20, tick: 0, stage: 'acknowledgment' as const,
    truthProgress: 10, forgiveness: 5, reparationsPaid: 0, communityHealing: 10, duration: 0, ...overrides }
}
function mockSpawn() {
  return vi.spyOn(Math, 'random')
    .mockReturnValueOnce(0)    // chance check passes
    .mockReturnValueOnce(0)    // civA = 1
    .mockReturnValueOnce(0.5)  // civB = 5 (≠1)
    .mockReturnValue(0.5)
}

describe('DiplomaticReconciliationSystem', () => {
  let sys: DiplomaticReconciliationSystem
  beforeEach(() => { sys = makeSys() })

  it('初始processes为空', () => { expect((sys as any).processes).toHaveLength(0) })
  it('初始nextId为1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始lastCheck为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('processes是数组', () => { expect(Array.isArray((sys as any).processes)).toBe(true) })

  it('tick不足2500时不更新lastCheck', () => {
    sys.update(1, W, EM, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick>=2500时更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2500)
    expect((sys as any).lastCheck).toBe(2500)
    vi.restoreAllMocks()
  })

  it('random=1时不spawn新process', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2500)
    expect((sys as any).processes).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('spawn条件满足时创建process', () => {
    const spy = mockSpawn()
    sys.update(1, W, EM, 2500)
    expect((sys as any).processes).toHaveLength(1)
    spy.mockRestore()
  })
  it('spawn后nextId递增', () => {
    const spy = mockSpawn()
    sys.update(1, W, EM, 2500)
    expect((sys as any).nextId).toBe(2)
    spy.mockRestore()
  })
  it('spawn的process有tick字段', () => {
    const spy = mockSpawn()
    sys.update(1, W, EM, 2500)
    expect((sys as any).processes[0]).toHaveProperty('tick', 2500)
    spy.mockRestore()
  })
  it('spawn的process stage为STAGES之一', () => {
    const spy = mockSpawn()
    sys.update(1, W, EM, 2500)
    const valid = ['acknowledgment', 'dialogue', 'reparation', 'healing']
    expect(valid).toContain((sys as any).processes[0].stage)
    spy.mockRestore()
  })

  it('processes达到18时不再spawn', () => {
    const spy = mockSpawn()
    for (let i = 0; i < 18; i++) (sys as any).processes.push(makeProc({ id: i }))
    sys.update(1, W, EM, 2500)
    expect((sys as any).processes).toHaveLength(18)
    spy.mockRestore()
  })

  it('reparationsPaid每tick+0.008', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).processes.push(makeProc({ reparationsPaid: 10 }))
    sys.update(1, W, EM, 2500)
    expect((sys as any).processes[0].reparationsPaid).toBeCloseTo(10.008, 5)
    vi.restoreAllMocks()
  })
  it('reparationsPaid上限100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).processes.push(makeProc({ reparationsPaid: 100 }))
    sys.update(1, W, EM, 2500)
    expect((sys as any).processes[0].reparationsPaid).toBe(100)
    vi.restoreAllMocks()
  })
  it('truthProgress不低于5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).processes.push(makeProc({ truthProgress: 5 }))
    sys.update(1, W, EM, 2500)
    expect((sys as any).processes[0].truthProgress).toBeGreaterThanOrEqual(5)
    vi.restoreAllMocks()
  })
  it('forgiveness不低于2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).processes.push(makeProc({ forgiveness: 2 }))
    sys.update(1, W, EM, 2500)
    expect((sys as any).processes[0].forgiveness).toBeGreaterThanOrEqual(2)
    vi.restoreAllMocks()
  })
  it('communityHealing不低于3', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).processes.push(makeProc({ communityHealing: 3 }))
    sys.update(1, W, EM, 2500)
    expect((sys as any).processes[0].communityHealing).toBeGreaterThanOrEqual(3)
    vi.restoreAllMocks()
  })
  it('duration每tick递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).processes.push(makeProc({ duration: 0 }))
    sys.update(1, W, EM, 2500)
    expect((sys as any).processes[0].duration).toBe(1)
    vi.restoreAllMocks()
  })

  it('tick超过cutoff(86000)的process被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).processes.push(makeProc({ tick: 0 }))
    sys.update(1, W, EM, 86100)
    expect((sys as any).processes).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('tick在cutoff内的process保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).processes.push(makeProc({ tick: 50000 }))
    sys.update(1, W, EM, 86100)
    expect((sys as any).processes).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('多个process中只删除过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).processes.push(makeProc({ id: 1, tick: 0 }))
    ;(sys as any).processes.push(makeProc({ id: 2, tick: 80000 }))
    sys.update(1, W, EM, 86100)
    expect((sys as any).processes).toHaveLength(1)
    expect((sys as any).processes[0].id).toBe(2)
    vi.restoreAllMocks()
  })
  it('边界tick=cutoff时不删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).processes.push(makeProc({ tick: 100 }))
    sys.update(1, W, EM, 86100)
    expect((sys as any).processes).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('注入两个process后长度为2', () => {
    ;(sys as any).processes.push(makeProc({ id: 1 }))
    ;(sys as any).processes.push(makeProc({ id: 2 }))
    expect((sys as any).processes).toHaveLength(2)
  })
})
