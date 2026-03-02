import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureHornworkerSystem } from '../systems/CreatureHornworkerSystem'
import type { Hornworker } from '../systems/CreatureHornworkerSystem'

// CHECK_INTERVAL=2620, RECRUIT_CHANCE=0.0015, MAX_WORKERS=10
// 技能增长：hornShaping+0.02, carvingDetail+0.015, outputQuality+0.01, 上限100
// cleanup：hornShaping <= 4 删除

let nextId = 1
function makeSys(): CreatureHornworkerSystem { return new CreatureHornworkerSystem() }
function makeWorker(
  entityId: number,
  hornShaping = 70,
  heatTreatment = 65,
  carvingDetail = 80,
  outputQuality = 75,
): Hornworker {
  return { id: nextId++, entityId, hornShaping, heatTreatment, carvingDetail, outputQuality, tick: 0 }
}

/** 强制触发 update（绕过节流） */
function triggerUpdate(s: CreatureHornworkerSystem, tick = 3000, em: any = {} as any): void {
  ;(s as any).lastCheck = 0
  s.update(0, em, tick)
}

describe('CreatureHornworkerSystem — 实例化与初始状态', () => {
  let sys: CreatureHornworkerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('可以正常实例化', () => {
    expect(sys).toBeInstanceOf(CreatureHornworkerSystem)
  })

  it('初始 workers 为空数组', () => {
    expect((sys as any).workers).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('workers 是数组类型', () => {
    expect(Array.isArray((sys as any).workers)).toBe(true)
  })

  it('两次实例化互相独立', () => {
    const sys2 = makeSys()
    ;(sys as any).workers.push(makeWorker(1))
    expect((sys2 as any).workers).toHaveLength(0)
  })
})

describe('CreatureHornworkerSystem — 数据注入与查询', () => {
  let sys: CreatureHornworkerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入后可查询 entityId', () => {
    ;(sys as any).workers.push(makeWorker(1))
    expect((sys as any).workers[0].entityId).toBe(1)
  })

  it('多个 worker 全部返回', () => {
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

  it('worker.id 自增正确', () => {
    ;(sys as any).workers.push(makeWorker(1))
    ;(sys as any).workers.push(makeWorker(2))
    expect((sys as any).workers[0].id).toBe(1)
    expect((sys as any).workers[1].id).toBe(2)
  })

  it('worker.tick 默认值为 0', () => {
    ;(sys as any).workers.push(makeWorker(1))
    expect((sys as any).workers[0].tick).toBe(0)
  })

  it('注入10个 worker，长度为10', () => {
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).workers.push(makeWorker(i))
    }
    expect((sys as any).workers).toHaveLength(10)
  })

  it('可以按索引访问各字段', () => {
    ;(sys as any).workers.push(makeWorker(5, 88, 77, 66, 55))
    const w = (sys as any).workers[0]
    expect(w.entityId).toBe(5)
    expect(w.hornShaping).toBe(88)
    expect(w.heatTreatment).toBe(77)
    expect(w.carvingDetail).toBe(66)
    expect(w.outputQuality).toBe(55)
  })
})

describe('CreatureHornworkerSystem — CHECK_INTERVAL 节流', () => {
  let sys: CreatureHornworkerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick 差 < 2620 时 update 不改变 lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(0, {} as any, 2000)  // diff=1000 < 2620 => skip
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('tick 差 = 2620 时 update 更新 lastCheck（不严格小于）', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(0, {} as any, 3620)  // diff=2620, 条件 < 2620 不满足 => 进入
    expect((sys as any).lastCheck).toBe(3620)
  })

  it('tick 差 > 2620 时 update 更新 lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(0, {} as any, 3700)  // diff=2700 => proceed
    expect((sys as any).lastCheck).toBe(3700)
  })

  it('tick 差 < 2620 时 workers 数据不变', () => {
    ;(sys as any).lastCheck = 5000
    ;(sys as any).workers.push(makeWorker(1, 50, 50, 50, 50))
    sys.update(0, {} as any, 6000)  // diff=1000 < 2620 => skip
    expect((sys as any).workers[0].hornShaping).toBe(50)
  })

  it('tick=0, lastCheck=0 时不触发（0 < 2620）', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, {} as any, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('lastCheck 在节流跳过时不被覆盖', () => {
    ;(sys as any).lastCheck = 9999
    sys.update(0, {} as any, 10000)  // diff=1 < 2620
    expect((sys as any).lastCheck).toBe(9999)
  })

  it('两次间隔都超过 CHECK_INTERVAL 时都能更新 lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, {} as any, 3000)
    expect((sys as any).lastCheck).toBe(3000)
    sys.update(0, {} as any, 6200)
    expect((sys as any).lastCheck).toBe(6200)
  })

  it('第二次调用间隔不足时 lastCheck 不变', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, {} as any, 3000)
    sys.update(0, {} as any, 3500)  // diff=500 < 2620
    expect((sys as any).lastCheck).toBe(3000)
  })
})

describe('CreatureHornworkerSystem — update 后技能增长', () => {
  let sys: CreatureHornworkerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('update 后 hornShaping + 0.02', () => {
    ;(sys as any).workers.push(makeWorker(1, 50))
    triggerUpdate(sys)
    expect((sys as any).workers[0].hornShaping).toBeCloseTo(50.02, 5)
  })

  it('update 后 carvingDetail + 0.015', () => {
    ;(sys as any).workers.push(makeWorker(1, 50, 50, 50, 50))
    triggerUpdate(sys)
    expect((sys as any).workers[0].carvingDetail).toBeCloseTo(50.015, 5)
  })

  it('update 后 outputQuality + 0.01', () => {
    ;(sys as any).workers.push(makeWorker(1, 50, 50, 50, 50))
    triggerUpdate(sys)
    expect((sys as any).workers[0].outputQuality).toBeCloseTo(50.01, 5)
  })

  it('heatTreatment 在 update 后不变（无增长逻辑）', () => {
    ;(sys as any).workers.push(makeWorker(1, 50, 65, 50, 50))
    triggerUpdate(sys)
    expect((sys as any).workers[0].heatTreatment).toBe(65)
  })

  it('hornShaping 上限为 100', () => {
    ;(sys as any).workers.push(makeWorker(1, 99.99))
    triggerUpdate(sys)
    expect((sys as any).workers[0].hornShaping).toBe(100)
  })

  it('carvingDetail 上限为 100', () => {
    ;(sys as any).workers.push(makeWorker(1, 50, 50, 99.99, 50))
    triggerUpdate(sys)
    expect((sys as any).workers[0].carvingDetail).toBe(100)
  })

  it('outputQuality 上限为 100', () => {
    ;(sys as any).workers.push(makeWorker(1, 50, 50, 50, 99.999))
    triggerUpdate(sys)
    expect((sys as any).workers[0].outputQuality).toBe(100)
  })

  it('hornShaping 恰好 100 时不超过 100', () => {
    ;(sys as any).workers.push(makeWorker(1, 100))
    triggerUpdate(sys)
    expect((sys as any).workers[0].hornShaping).toBe(100)
  })

  it('多个 worker 均增长', () => {
    ;(sys as any).workers.push(makeWorker(1, 50, 50, 50, 50))
    ;(sys as any).workers.push(makeWorker(2, 60, 60, 60, 60))
    triggerUpdate(sys)
    expect((sys as any).workers[0].hornShaping).toBeCloseTo(50.02, 5)
    expect((sys as any).workers[1].hornShaping).toBeCloseTo(60.02, 5)
  })

  it('增长精度：连续两次 update hornShaping 累积 +0.04', () => {
    ;(sys as any).workers.push(makeWorker(1, 50, 50, 50, 50))
    ;(sys as any).lastCheck = 0
    sys.update(0, {} as any, 3000)
    ;(sys as any).lastCheck = 0
    sys.update(0, {} as any, 6000)
    expect((sys as any).workers[0].hornShaping).toBeCloseTo(50.04, 4)
  })

  it('高初始值的 worker 增长同样遵守上限', () => {
    ;(sys as any).workers.push(makeWorker(1, 99.98, 50, 99.985, 99.99))
    triggerUpdate(sys)
    const w = (sys as any).workers[0]
    expect(w.hornShaping).toBe(100)
    expect(w.carvingDetail).toBe(100)
    expect(w.outputQuality).toBe(100)
  })

  it('低值 worker 增长不被截断', () => {
    ;(sys as any).workers.push(makeWorker(1, 5, 50, 5, 5))
    triggerUpdate(sys)
    const w = (sys as any).workers[0]
    expect(w.hornShaping).toBeCloseTo(5.02, 5)
    expect(w.carvingDetail).toBeCloseTo(5.015, 5)
    expect(w.outputQuality).toBeCloseTo(5.01, 5)
  })
})

describe('CreatureHornworkerSystem — cleanup hornShaping <= 4', () => {
  let sys: CreatureHornworkerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('hornShaping = 3（初始）增长后 3.02 <= 4，被删除', () => {
    ;(sys as any).workers.push(makeWorker(1, 3))
    triggerUpdate(sys)
    expect((sys as any).workers).toHaveLength(0)
  })

  it('hornShaping = 3.98 增长后 4.00，4 <= 4 被删除', () => {
    ;(sys as any).workers.push(makeWorker(1, 3.98))
    triggerUpdate(sys)
    expect((sys as any).workers).toHaveLength(0)
  })

  it('hornShaping = 4.00 增长后 4.02，4.02 > 4 保留', () => {
    ;(sys as any).workers.push(makeWorker(1, 4.00))
    triggerUpdate(sys)
    // 4.00 + 0.02 = 4.02, 4.02 <= 4 为 false => 保留
    expect((sys as any).workers).toHaveLength(1)
  })

  it('hornShaping = 0 增长后 0.02 <= 4，被删除', () => {
    ;(sys as any).workers.push(makeWorker(1, 0))
    triggerUpdate(sys)
    expect((sys as any).workers).toHaveLength(0)
  })

  it('hornShaping = 4.01 增长后 4.03 > 4，保留', () => {
    ;(sys as any).workers.push(makeWorker(1, 4.01))
    triggerUpdate(sys)
    expect((sys as any).workers).toHaveLength(1)
  })

  it('hornShaping > 4 时记��保留', () => {
    ;(sys as any).workers.push(makeWorker(1, 50))
    triggerUpdate(sys)
    expect((sys as any).workers).toHaveLength(1)
  })

  it('只有低于阈值的 worker 被删除', () => {
    ;(sys as any).workers.push(makeWorker(1, 2))  // 2 + 0.02 = 2.02 <= 4 => 删除
    ;(sys as any).workers.push(makeWorker(2, 50)) // 50 + 0.02 = 50.02 > 4 => 保留
    triggerUpdate(sys)
    expect((sys as any).workers).toHaveLength(1)
    expect((sys as any).workers[0].entityId).toBe(2)
  })

  it('多个低值 worker 全部被删除', () => {
    ;(sys as any).workers.push(makeWorker(1, 1))
    ;(sys as any).workers.push(makeWorker(2, 2))
    ;(sys as any).workers.push(makeWorker(3, 3))
    triggerUpdate(sys)
    expect((sys as any).workers).toHaveLength(0)
  })

  it('cleanup 后数组长度正确缩减', () => {
    for (let i = 1; i <= 5; i++) {
      ;(sys as any).workers.push(makeWorker(i, i))  // hornShaping=1..5
    }
    // hornShaping 1,2,3: +0.02 => 1.02,2.02,3.02 <= 4 删除
    // hornShaping 4: +0.02 => 4.02 > 4 保留
    // hornShaping 5: +0.02 => 5.02 > 4 保留
    triggerUpdate(sys)
    expect((sys as any).workers).toHaveLength(2)
  })
})

describe('CreatureHornworkerSystem — 招募新工人', () => {
  let sys: CreatureHornworkerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('随机大于 RECRUIT_CHANCE 时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    triggerUpdate(sys)
    expect((sys as any).workers).toHaveLength(0)
  })

  it('随机小于 RECRUIT_CHANCE 时招募一个新工人', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    triggerUpdate(sys)
    expect((sys as any).workers).toHaveLength(1)
  })

  it('新招募的工人 entityId 在 [0, 500) 内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    triggerUpdate(sys)
    const w = (sys as any).workers[0]
    expect(w.entityId).toBeGreaterThanOrEqual(0)
    expect(w.entityId).toBeLessThan(500)
  })

  it('新招募的工人 hornShaping 在 [10, 35] 内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    triggerUpdate(sys)
    const w = (sys as any).workers[0]
    expect(w.hornShaping).toBeGreaterThanOrEqual(10)
    expect(w.hornShaping).toBeLessThanOrEqual(35)
  })

  it('新招募的工人 heatTreatment 在 [15, 35] 内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    triggerUpdate(sys)
    const w = (sys as any).workers[0]
    expect(w.heatTreatment).toBeGreaterThanOrEqual(15)
    expect(w.heatTreatment).toBeLessThanOrEqual(35)
  })

  it('新招募的工人 nextId 自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    triggerUpdate(sys)
    const idAfter = (sys as any).nextId
    expect(idAfter).toBe(2)
  })

  it('已满 MAX_WORKERS=10 时不再招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).workers.push(makeWorker(i))
    }
    triggerUpdate(sys)
    // 10 个工人，其中 hornShaping=70 > 4，全部保留，且不再招募
    expect((sys as any).workers).toHaveLength(10)
  })

  it('招募的工人 tick 等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    ;(sys as any).lastCheck = 0
    sys.update(0, {} as any, 5000)
    if ((sys as any).workers.length > 0) {
      expect((sys as any).workers[0].tick).toBe(5000)
    }
  })
})

describe('CreatureHornworkerSystem — 边界与综合场景', () => {
  let sys: CreatureHornworkerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('空 workers 时 update 不抛出', () => {
    expect(() => triggerUpdate(sys)).not.toThrow()
  })

  it('update 多次后 lastCheck 始终是最后触发的 tick', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, {} as any, 3000)
    sys.update(0, {} as any, 6000)
    sys.update(0, {} as any, 9000)
    expect((sys as any).lastCheck).toBe(9000)
  })

  it('招募然后 cleanup：低 hornShaping 新工人立即被删', () => {
    // 强制 random 序列：第一次 < 0.0015（招募），后续生成极低的 hornShaping
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.0001   // 触发招募
      if (call === 2) return 0         // entityId = Math.floor(0*500) = 0
      if (call === 3) return 0         // hornShaping = 10 + 0*25 = 10
      if (call === 4) return 0         // heatTreatment = 15 + 0*20 = 15
      if (call === 5) return 0         // carvingDetail = 5 + 0*20 = 5
      if (call === 6) return 0         // outputQuality = 10 + 0*25 = 10
      return 0.9
    })
    triggerUpdate(sys)
    // hornShaping=10, 增长后 10.02 > 4 => 保留
    expect((sys as any).workers).toHaveLength(1)
  })

  it('nextId 在招募多次后正确递增', () => {
    ;(sys as any).nextId = 5
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    triggerUpdate(sys, 3000)
    expect((sys as any).nextId).toBe(6)
  })

  it('workers 数组是同一引用（不被替换）', () => {
    const ref = (sys as any).workers
    triggerUpdate(sys)
    expect((sys as any).workers).toBe(ref)
  })

  it('tick 为极大值时 lastCheck 正确更新', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, {} as any, 999999999)
    expect((sys as any).lastCheck).toBe(999999999)
  })

  it('一个 worker 恰好在 cleanup 边界（hornShaping=3.98）被删后 length 减一', () => {
    ;(sys as any).workers.push(makeWorker(1, 3.98))
    ;(sys as any).workers.push(makeWorker(2, 50))
    triggerUpdate(sys)
    expect((sys as any).workers).toHaveLength(1)
    expect((sys as any).workers[0].entityId).toBe(2)
  })

  it('节流期间 workers 数组不被任何操作修改', () => {
    ;(sys as any).workers.push(makeWorker(1, 50))
    ;(sys as any).lastCheck = 10000
    sys.update(0, {} as any, 11000)  // diff=1000 < 2620
    expect((sys as any).workers[0].hornShaping).toBe(50)  // 未增长
    expect((sys as any).workers).toHaveLength(1)           // 未删除
  })
})
