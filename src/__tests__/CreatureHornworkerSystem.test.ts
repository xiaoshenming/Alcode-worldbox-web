import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureHornworkerSystem } from '../systems/CreatureHornworkerSystem'
import type { Hornworker } from '../systems/CreatureHornworkerSystem'

let nextId = 1
function makeSys(): CreatureHornworkerSystem { return new CreatureHornworkerSystem() }
function makeWorker(entityId: number, hornShaping = 70, heatTreatment = 65, carvingDetail = 80, outputQuality = 75): Hornworker {
  return { id: nextId++, entityId, hornShaping, heatTreatment, carvingDetail, outputQuality, tick: 0 }
}

describe('CreatureHornworkerSystem — 数据注入与查询', () => {
  let sys: CreatureHornworkerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无角加工工', () => {
    expect((sys as any).workers).toHaveLength(0)
  })

  it('注入后可查询 entityId', () => {
    ;(sys as any).workers.push(makeWorker(1))
    expect((sys as any).workers[0].entityId).toBe(1)
  })

  it('多个全部返回', () => {
    ;(sys as any).workers.push(makeWorker(1))
    ;(sys as any).workers.push(makeWorker(2))
    expect((sys as any).workers).toHaveLength(2)
  })

  it('四字段完整存储', () => {
    ;(sys as any).workers.push(makeWorker(3, 60, 55, 70, 65))
    const w = (sys as any).workers[0]
    expect(w.hornShaping).toBe(60)
    expect(w.heatTreatment).toBe(55)
    expect(w.carvingDetail).toBe(70)
    expect(w.outputQuality).toBe(65)
  })
})

describe('CreatureHornworkerSystem — CHECK_INTERVAL 节流', () => {
  let sys: CreatureHornworkerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 差 < 2620 时 update 不改变 lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    const em = {} as any
    sys.update(0, em, 2000)   // diff=1000 < 2620 => skip
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('tick 差 = 2620 时 update 不更新（严格小于）', () => {
    ;(sys as any).lastCheck = 1000
    const em = {} as any
    sys.update(0, em, 3620)   // diff=2620, 条件 tick - lastCheck < 2620 => false when equal => 实际进入
    // 实际上 3620 - 1000 = 2620, 条件是 < 2620, 不满足所以 lastCheck 会被更新
    expect((sys as any).lastCheck).toBe(3620)
  })

  it('tick 差 > 2620 时 update 更新 lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    const em = {} as any
    sys.update(0, em, 3700)   // diff=2700 >= 2620 => proceed
    expect((sys as any).lastCheck).toBe(3700)
  })

  it('tick 差 < 2620 时 workers 不变', () => {
    ;(sys as any).lastCheck = 5000
    ;(sys as any).workers.push(makeWorker(1, 50, 50, 50, 50))
    const em = {} as any
    sys.update(0, em, 6000)   // diff=1000 < 2620 => skip
    expect((sys as any).workers[0].hornShaping).toBe(50)  // 未增长
  })
})

describe('CreatureHornworkerSystem — update 后技能增长', () => {
  let sys: CreatureHornworkerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  function triggerUpdate(s: CreatureHornworkerSystem, tick: number): void {
    ;(s as any).lastCheck = 0
    const em = {} as any
    s.update(0, em, tick)
  }

  it('update 后 hornShaping + 0.02', () => {
    ;(sys as any).workers.push(makeWorker(1, 50))
    triggerUpdate(sys, 3000)
    expect((sys as any).workers[0].hornShaping).toBeCloseTo(50.02, 5)
  })

  it('update 后 carvingDetail + 0.015', () => {
    ;(sys as any).workers.push(makeWorker(1, 50, 50, 50, 50))
    triggerUpdate(sys, 3000)
    expect((sys as any).workers[0].carvingDetail).toBeCloseTo(50.015, 5)
  })

  it('update 后 outputQuality + 0.01', () => {
    ;(sys as any).workers.push(makeWorker(1, 50, 50, 50, 50))
    triggerUpdate(sys, 3000)
    expect((sys as any).workers[0].outputQuality).toBeCloseTo(50.01, 5)
  })

  it('hornShaping 上限为 100', () => {
    ;(sys as any).workers.push(makeWorker(1, 99.99))
    triggerUpdate(sys, 3000)
    expect((sys as any).workers[0].hornShaping).toBe(100)
  })

  it('outputQuality 上限为 100', () => {
    ;(sys as any).workers.push(makeWorker(1, 50, 50, 50, 99.999))
    triggerUpdate(sys, 3000)
    expect((sys as any).workers[0].outputQuality).toBe(100)
  })
})

describe('CreatureHornworkerSystem — cleanup hornShaping <= 4', () => {
  let sys: CreatureHornworkerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  function triggerUpdate(s: CreatureHornworkerSystem, tick: number): void {
    ;(s as any).lastCheck = 0
    const em = {} as any
    s.update(0, em, tick)
  }

  it('hornShaping <= 4 时记录被删除', () => {
    // 注入 hornShaping=3 (增长后 3.02, 仍 <= 4 所以删除)
    ;(sys as any).workers.push(makeWorker(1, 3))
    triggerUpdate(sys, 3000)
    expect((sys as any).workers).toHaveLength(0)
  })

  it('hornShaping=3.98 增长后=4.00，边界情况：4 <= 4 所以被删除', () => {
    ;(sys as any).workers.push(makeWorker(1, 3.98))
    triggerUpdate(sys, 3000)
    // 3.98 + 0.02 = 4.00, 条件 <= 4 => 删除
    expect((sys as any).workers).toHaveLength(0)
  })

  it('hornShaping > 4 时记录保留', () => {
    ;(sys as any).workers.push(makeWorker(1, 50))
    triggerUpdate(sys, 3000)
    expect((sys as any).workers).toHaveLength(1)
  })
})
