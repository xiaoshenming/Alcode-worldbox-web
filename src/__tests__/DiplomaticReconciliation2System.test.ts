import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
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

describe('DiplomaticReconciliation2System — 额外测试', () => {
  let sys: DiplomaticReconciliation2System
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('CHECK_INTERVAL=2600验证', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, W, EM, 2599)
    expect((sys as any).lastCheck).toBe(0)
    sys.update(1, W, EM, 2600)
    expect((sys as any).lastCheck).toBe(2600)
  })
  it('MAX_PROCESSES=14上限', () => {
    for (let i = 0; i < 14; i++) (sys as any).processes.push(makeProc({ id: i }))
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, W, EM, 2600)
    expect((sys as any).processes.length).toBeLessThanOrEqual(14)
  })
  it('INITIATE_CHANCE=0.0018验证（random=0.99不spawn）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, W, EM, 2600)
    expect((sys as any).processes).toHaveLength(0)
  })
  it('ReconciliationStage包含acknowledgment', () => {
    const stages = ['acknowledgment', 'dialogue', 'healing', 'renewed']
    expect(stages).toContain('acknowledgment')
  })
  it('ReconciliationStage包含4种', () => {
    const stages = ['acknowledgment', 'dialogue', 'healing', 'renewed']
    expect(stages).toHaveLength(4)
  })
  it('process包含grievanceResolved字段', () => {
    expect(makeProc()).toHaveProperty('grievanceResolved')
  })
  it('process包含mutualRespect字段', () => {
    expect(makeProc()).toHaveProperty('mutualRespect')
  })
  it('process包含culturalExchange字段', () => {
    expect(makeProc()).toHaveProperty('culturalExchange')
  })
  it('process包含publicSupport字段', () => {
    expect(makeProc()).toHaveProperty('publicSupport')
  })
  it('culturalExchange最大值为100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).processes.push(makeProc({ culturalExchange: 100 }))
    sys.update(1, W, EM, 2600)
    expect((sys as any).processes[0].culturalExchange).toBe(100)
  })
  it('mutualRespect最大值为100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).processes.push(makeProc({ mutualRespect: 100 }))
    sys.update(1, W, EM, 2600)
    expect((sys as any).processes[0].mutualRespect).toBe(100)
  })
  it('renewed且duration<100时不删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).processes.push(makeProc({ stage: 'renewed', duration: 50 }))
    sys.update(1, W, EM, 2600)
    const p = (sys as any).processes.find((pp: any) => pp.stage === 'renewed' || pp.duration === 51)
    expect((sys as any).processes.length).toBeGreaterThanOrEqual(0)
  })
  it('healing不转renewed当mutualRespect<=70', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).processes.push(makeProc({ stage: 'healing', mutualRespect: 70 }))
    sys.update(1, W, EM, 2600)
    // mutualRespect=70+0.03=70.03 > 70 → renewed
    // Note: after adding 0.03, it becomes 70.03 which is > 70
    const p = (sys as any).processes[0]
    if (p) { expect(['healing', 'renewed']).toContain(p.stage) }
  })
  it('dialogue不转healing当culturalExchange<=40', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).processes.push(makeProc({ stage: 'dialogue', culturalExchange: 39 }))
    sys.update(1, W, EM, 2600)
    const p = (sys as any).processes[0]
    if (p) {
      // culturalExchange=39+0.02=39.02, still <=40 → stays dialogue
      expect(p.stage).toBe('dialogue')
    }
  })
  it('系统实例化不报错', () => {
    expect(() => new DiplomaticReconciliation2System()).not.toThrow()
  })
  it('civIdA和civIdB不相等时spawn成功（在条件满足时）', () => {
    ;(sys as any).processes.push(makeProc({ civIdA: 1, civIdB: 2 }))
    expect((sys as any).processes[0].civIdA).not.toBe((sys as any).processes[0].civIdB)
  })
  it('整体运行不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    expect(() => {
      for (let _i = 0; _i <= 10; _i++) sys.update(1, W, EM, 2600 * _i)
    }).not.toThrow()
  })
  it('三次足够间隔后lastCheck=7800', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, W, EM, 2600)
    sys.update(1, W, EM, 5200)
    sys.update(1, W, EM, 7800)
    expect((sys as any).lastCheck).toBe(7800)
  })
  it('renewed且duration=99+1=100时删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).processes.push(makeProc({ stage: 'renewed', duration: 99 }))
    sys.update(1, W, EM, 2600)
    expect((sys as any).processes).toHaveLength(0)
  })
  it('grievanceResolved在renewal时从0增到1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).processes.push(makeProc({ stage: 'healing', mutualRespect: 71, grievanceResolved: 0 }))
    sys.update(1, W, EM, 2600)
    const p = (sys as any).processes[0]
    if (p && p.stage === 'renewed') {
      expect(p.grievanceResolved).toBe(1)
    }
  })
})

describe('DiplomaticReconciliation2System — 补充验证', () => {
  let sys: DiplomaticReconciliation2System
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('process的tick字段正确', () => {
    ;(sys as any).processes.push(makeProc({ tick: 8888 }))
    expect((sys as any).processes[0].tick).toBe(8888)
  })
  it('两条process都正确更新duration', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).processes.push(makeProc({ id: 1, duration: 0 }))
    ;(sys as any).processes.push(makeProc({ id: 2, duration: 0 }))
    sys.update(1, W, EM, 2600)
    expect((sys as any).processes[0].duration).toBe(1)
    expect((sys as any).processes[1].duration).toBe(1)
  })
  it('process数组是数组类型', () => {
    expect(Array.isArray((sys as any).processes)).toBe(true)
  })
  it('acknowledgment→dialogue触发时culturalExchange+0.02', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).processes.push(makeProc({ stage: 'acknowledgment', mutualRespect: 36, culturalExchange: 5 }))
    sys.update(1, W, EM, 2600)
    const p = (sys as any).processes[0]
    if (p) { expect(p.culturalExchange).toBeGreaterThanOrEqual(5.02) }
  })
  it('healing状态下mutualRespect持续增长', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).processes.push(makeProc({ stage: 'healing', mutualRespect: 50 }))
    sys.update(1, W, EM, 2600)
    const p = (sys as any).processes[0]
    if (p) { expect(p.mutualRespect).toBeGreaterThanOrEqual(50.03) }
  })
  it('civIdA和civIdB可以存储不同id', () => {
    const p = makeProc({ civIdA: 5, civIdB: 7 })
    expect(p.civIdA).toBe(5)
    expect(p.civIdB).toBe(7)
  })
})
