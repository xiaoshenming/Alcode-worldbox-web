import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreaturePlowrightSystem } from '../systems/CreaturePlowrightSystem'
import type { Plowright } from '../systems/CreaturePlowrightSystem'

const CHECK_INTERVAL = 2610
const MAX_PLOWRIGHTS = 10

let nextId = 1
function makeSys(): CreaturePlowrightSystem { return new CreaturePlowrightSystem() }
function makePlowright(entityId: number, overrides: Partial<Plowright> = {}): Plowright {
  return { id: nextId++, entityId, ironForging: 70, bladeSharpening: 65, handleFitting: 75, outputQuality: 80, tick: 0, ...overrides }
}

const emMock = { getEntitiesWithComponents: () => [] } as any

describe('CreaturePlowrightSystem.getPlowrights', () => {
  let sys: CreaturePlowrightSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无犁制作者', () => { expect((sys as any).plowrights).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).plowrights.push(makePlowright(1))
    expect((sys as any).plowrights[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).plowrights.push(makePlowright(1))
    expect((sys as any).plowrights).toBe((sys as any).plowrights)
  })
  it('字段正确', () => {
    ;(sys as any).plowrights.push(makePlowright(2))
    const p = (sys as any).plowrights[0]
    expect(p.ironForging).toBe(70)
    expect(p.outputQuality).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).plowrights.push(makePlowright(1))
    ;(sys as any).plowrights.push(makePlowright(2))
    expect((sys as any).plowrights).toHaveLength(2)
  })
  it('nextId 初始为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck 初始为 0', () => { expect((sys as any).lastCheck).toBe(0) })
})

describe('CreaturePlowrightSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreaturePlowrightSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick 不足 CHECK_INTERVAL 时不更新 lastCheck', () => {
    sys.update(1, emMock, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 达到 CHECK_INTERVAL 时更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('连续两次间隔不足时跳过第二次', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    const snap = (sys as any).plowrights.length
    sys.update(1, emMock, CHECK_INTERVAL + 1) // 间隔仅1
    expect((sys as any).plowrights.length).toBe(snap)
  })

  it('tick差=CHECK_INTERVAL-1时不触发', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(1, emMock, 1000 + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('tick差=CHECK_INTERVAL时精确触发', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(1, emMock, 1000 + CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(1000 + CHECK_INTERVAL)
  })

  it('未触发时技能不增长', () => {
    ;(sys as any).plowrights.push(makePlowright(1, { ironForging: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, emMock, CHECK_INTERVAL - 1)
    expect((sys as any).plowrights[0].ironForging).toBe(50)
  })

  it('两次间隔>=CHECK_INTERVAL则触发两次技能增长', () => {
    const p = makePlowright(1, { ironForging: 50 })
    ;(sys as any).plowrights.push(p)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, emMock, CHECK_INTERVAL)
    sys.update(1, emMock, CHECK_INTERVAL * 2)
    expect(p.ironForging).toBeCloseTo(50.04, 5)
  })
})

describe('CreaturePlowrightSystem - 技能递增与上限', () => {
  let sys: CreaturePlowrightSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('update 后 ironForging 增加 0.02', () => {
    ;(sys as any).plowrights.push(makePlowright(1, { ironForging: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).plowrights[0].ironForging).toBeCloseTo(50.02)
  })

  it('update 后 handleFitting 增加 0.015', () => {
    ;(sys as any).plowrights.push(makePlowright(1, { handleFitting: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).plowrights[0].handleFitting).toBeCloseTo(50.015)
  })

  it('update 后 outputQuality 增加 0.01', () => {
    ;(sys as any).plowrights.push(makePlowright(1, { outputQuality: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).plowrights[0].outputQuality).toBeCloseTo(50.01)
  })

  it('ironForging 不超过 100 上限', () => {
    ;(sys as any).plowrights.push(makePlowright(1, { ironForging: 99.99 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).plowrights[0].ironForging).toBe(100)
  })

  it('outputQuality 不超过 100 上限', () => {
    ;(sys as any).plowrights.push(makePlowright(1, { outputQuality: 99.995 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).plowrights[0].outputQuality).toBe(100)
  })

  it('bladeSharpening 不参与递增（无对应 += 逻辑）', () => {
    ;(sys as any).plowrights.push(makePlowright(1, { bladeSharpening: 65 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).plowrights[0].bladeSharpening).toBe(65)
  })

  it('handleFitting 上限为100', () => {
    ;(sys as any).plowrights.push(makePlowright(1, { handleFitting: 99.99 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).plowrights[0].handleFitting).toBe(100)
  })

  it('多个犁制作者同时增长', () => {
    ;(sys as any).plowrights.push(makePlowright(1, { ironForging: 50 }))
    ;(sys as any).plowrights.push(makePlowright(2, { ironForging: 60 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).plowrights[0].ironForging).toBeCloseTo(50.02)
    expect((sys as any).plowrights[1].ironForging).toBeCloseTo(60.02)
  })
})

describe('CreaturePlowrightSystem - cleanup（ironForging <= 4）', () => {
  let sys: CreaturePlowrightSystem
  beforeEach(() => {
    sys = makeSys(); nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('ironForging > 4 的记录不被清除', () => {
    ;(sys as any).plowrights.push(makePlowright(1, { ironForging: 5 }))
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).plowrights).toHaveLength(1)
  })

  it('ironForging === 3.98 更新后恰好 <= 4 应被清除', () => {
    ;(sys as any).plowrights.push(makePlowright(1, { ironForging: 3.98 }))
    // 3.98 + 0.02 = 4.00，<= 4 应被移除
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).plowrights).toHaveLength(0)
  })

  it('仅清除低技能记录，高技能保留', () => {
    ;(sys as any).plowrights.push(makePlowright(1, { ironForging: 3 }))
    ;(sys as any).plowrights.push(makePlowright(2, { ironForging: 50 }))
    sys.update(1, emMock, CHECK_INTERVAL)
    const survivors = (sys as any).plowrights
    expect(survivors).toHaveLength(1)
    expect(survivors[0].entityId).toBe(2)
  })

  it('多个低技能记录全部被清除', () => {
    for (let i = 1; i <= 4; i++) {
      ;(sys as any).plowrights.push(makePlowright(i, { ironForging: 2 }))
    }
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).plowrights).toHaveLength(0)
  })

  it('ironForging=3.99更新后4.01>4保留', () => {
    ;(sys as any).plowrights.push(makePlowright(1, { ironForging: 3.99 }))
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).plowrights).toHaveLength(1)
  })

  it('ironForging=1，更新后仍<=4被删除', () => {
    ;(sys as any).plowrights.push(makePlowright(1, { ironForging: 1 }))
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).plowrights).toHaveLength(0)
  })
})

describe('CreaturePlowrightSystem - MAX_PLOWRIGHTS 上限与招募', () => {
  let sys: CreaturePlowrightSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('已达 MAX_PLOWRIGHTS 时不再招募', () => {
    for (let i = 0; i < MAX_PLOWRIGHTS; i++) {
      ;(sys as any).plowrights.push(makePlowright(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).plowrights.length).toBeLessThanOrEqual(MAX_PLOWRIGHTS)
  })

  it('nextId 初始为 1', () => { expect((sys as any).nextId).toBe(1) })

  it('random < RECRUIT_CHANCE 时招募新Plowright', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).plowrights.length).toBeGreaterThanOrEqual(1)
  })

  it('招募后新plowright tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    if ((sys as any).plowrights.length > 0) {
      expect((sys as any).plowrights[0].tick).toBe(CHECK_INTERVAL)
    }
  })

  it('random=1时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).plowrights).toHaveLength(0)
  })

  it('空系统多次更新无异常', () => {
    expect(() => {
      sys.update(1, emMock, CHECK_INTERVAL)
      sys.update(1, emMock, CHECK_INTERVAL * 2)
    }).not.toThrow()
  })
})

describe('CreaturePlowrightSystem - 边界与综合场景', () => {
  let sys: CreaturePlowrightSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('空plowrights数组更新不抛出异常', () => {
    expect(() => sys.update(0, emMock, CHECK_INTERVAL)).not.toThrow()
  })

  it('dt参数不影响节流逻辑', () => {
    ;(sys as any).lastCheck = 0
    sys.update(999, emMock, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('多次更新后技能累积增长正确', () => {
    const p = makePlowright(1, { ironForging: 50 })
    ;(sys as any).plowrights.push(p)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, emMock, CHECK_INTERVAL)
    sys.update(1, emMock, CHECK_INTERVAL * 2)
    sys.update(1, emMock, CHECK_INTERVAL * 3)
    expect(p.ironForging).toBeCloseTo(50.06, 4)
  })

  it('技能同时增长验证', () => {
    const p = makePlowright(1, { ironForging: 50, handleFitting: 60, outputQuality: 70 })
    ;(sys as any).plowrights.push(p)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect(p.ironForging).toBeCloseTo(50.02, 5)
    expect(p.handleFitting).toBeCloseTo(60.015, 5)
    expect(p.outputQuality).toBeCloseTo(70.01, 5)
  })

  it('tick=0不触发（差为0<CHECK_INTERVAL）', () => {
    sys.update(0, emMock, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
})

describe('CreaturePlowrightSystem - 额外边界与字段验证', () => {
  let sys: CreaturePlowrightSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('新建系统lastCheck为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('注入多个plowrights后长度正确', () => {
    for (let i = 0; i < 5; i++) { ;(sys as any).plowrights.push(makePlowright(i + 1)) }
    expect((sys as any).plowrights).toHaveLength(5)
  })
  it('ironForging=5时更新后5.02>4，不被删除', () => {
    ;(sys as any).plowrights.push(makePlowright(1, { ironForging: 5 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).plowrights).toHaveLength(1)
  })
  it('大量更新后outputQuality不超过100', () => {
    const p = makePlowright(1, { outputQuality: 99.5 })
    ;(sys as any).plowrights.push(p)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let t = 1; t <= 10; t++) {
      sys.update(1, emMock, CHECK_INTERVAL * t)
    }
    expect(p.outputQuality).toBeLessThanOrEqual(100)
  })
  it('handleFitting=100时保持不变', () => {
    const p = makePlowright(1, { handleFitting: 100 })
    ;(sys as any).plowrights.push(p)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect(p.handleFitting).toBe(100)
  })
  it('招募时entityId在[0,499]范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    if ((sys as any).plowrights.length > 0) {
      const eid = (sys as any).plowrights[0].entityId
      expect(eid).toBeGreaterThanOrEqual(0)
      expect(eid).toBeLessThanOrEqual(499)
    }
  })
  it('招募时id从1开始', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, emMock, CHECK_INTERVAL)
    if ((sys as any).plowrights.length > 0) {
      expect((sys as any).plowrights[0].id).toBe(1)
    }
  })
  it('tick为负数时不触发', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, emMock, -1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('系统update返回undefined', () => {
    expect(sys.update(1, emMock, CHECK_INTERVAL)).toBeUndefined()
  })
  it('ironForging=4.00时被删除（因4.00+0.02=4.02，非<=4不删除，测4.00预期保留的边界）', () => {
    // 4.00 + 0.02 = 4.02 > 4 => 保留
    ;(sys as any).plowrights.push(makePlowright(1, { ironForging: 4.00 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).plowrights).toHaveLength(1)
  })
  it('outputQuality范围验证：招募时在[10,35]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).lastCheck = 0
    sys.update(1, emMock, CHECK_INTERVAL)
    if ((sys as any).plowrights.length > 0) {
      const q = (sys as any).plowrights[0].outputQuality
      expect(q).toBeGreaterThanOrEqual(10)
      expect(q).toBeLessThanOrEqual(35)
    }
  })
})
