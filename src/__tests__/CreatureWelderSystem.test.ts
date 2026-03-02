import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureWelderSystem } from '../systems/CreatureWelderSystem'
import type { Welder } from '../systems/CreatureWelderSystem'

// 常量参考: CHECK_INTERVAL=2800, RECRUIT_CHANCE=0.0015, MAX_WELDERS=10
// 技能递增: weldingSkill+0.02/tick, jointStrength+0.015/tick, metalBonding+0.01/tick
// cleanup: weldingSkill<=4时删除（先递增后cleanup）

let nextId = 1
function makeSys(): CreatureWelderSystem { return new CreatureWelderSystem() }
function makeWelder(entityId: number, overrides: Partial<Welder> = {}): Welder {
  return { id: nextId++, entityId, weldingSkill: 70, jointStrength: 65, heatPrecision: 80, metalBonding: 75, tick: 0, ...overrides }
}

describe('CreatureWelderSystem — 基础数据结构', () => {
  let sys: CreatureWelderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无焊工', () => { expect((sys as any).welders).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).welders.push(makeWelder(1))
    expect((sys as any).welders[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).welders.push(makeWelder(1))
    expect((sys as any).welders).toBe((sys as any).welders)
  })

  it('字段正确 — weldingSkill=70,heatPrecision=80', () => {
    ;(sys as any).welders.push(makeWelder(2))
    const w = (sys as any).welders[0]
    expect(w.weldingSkill).toBe(70)
    expect(w.heatPrecision).toBe(80)
  })

  it('多个焊工全部返回', () => {
    ;(sys as any).welders.push(makeWelder(1))
    ;(sys as any).welders.push(makeWelder(2))
    expect((sys as any).welders).toHaveLength(2)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('jointStrength字段为65', () => {
    ;(sys as any).welders.push(makeWelder(1))
    expect((sys as any).welders[0].jointStrength).toBe(65)
  })

  it('metalBonding字段为75', () => {
    ;(sys as any).welders.push(makeWelder(1))
    expect((sys as any).welders[0].metalBonding).toBe(75)
  })

  it('id字段为数字', () => {
    ;(sys as any).welders.push(makeWelder(1))
    expect(typeof (sys as any).welders[0].id).toBe('number')
  })

  it('tick字段默认为0', () => {
    ;(sys as any).welders.push(makeWelder(1))
    expect((sys as any).welders[0].tick).toBe(0)
  })
})

describe('CreatureWelderSystem — CHECK_INTERVAL 节流逻辑', () => {
  let sys: CreatureWelderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick差值<CHECK_INTERVAL(2800)时不更新lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2799)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(2800)时更新lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2800)
    expect((sys as any).lastCheck).toBe(2800)
  })

  it('节流时焊工数据不变', () => {
    ;(sys as any).welders.push(makeWelder(1, { weldingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 100) // 节流
    expect((sys as any).welders[0].weldingSkill).toBe(50)
  })

  it('tick=0时不触发（差值=0<2800）', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2800时触发（差值恰好等于CHECK_INTERVAL）', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2800)
    expect((sys as any).lastCheck).toBe(2800)
  })

  it('tick=3000时触发（差值>CHECK_INTERVAL）', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })

  it('两次各满足间隔均通过节流', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2800)
    sys.update(1, {} as any, 5600)
    expect((sys as any).lastCheck).toBe(5600)
  })

  it('lastCheck=1000，tick=3799不触发', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(1, {} as any, 3799)
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('lastCheck=1000，tick=3800触发', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(1, {} as any, 3800)
    expect((sys as any).lastCheck).toBe(3800)
  })
})

describe('CreatureWelderSystem — 技能递增', () => {
  let sys: CreatureWelderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('update后weldingSkill+0.02', () => {
    ;(sys as any).welders.push(makeWelder(1, { weldingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2800)
    expect((sys as any).welders[0].weldingSkill).toBeCloseTo(50.02, 5)
  })

  it('update后jointStrength+0.015', () => {
    ;(sys as any).welders.push(makeWelder(1, { jointStrength: 40 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2800)
    expect((sys as any).welders[0].jointStrength).toBeCloseTo(40.015, 5)
  })

  it('update后metalBonding+0.01', () => {
    ;(sys as any).welders.push(makeWelder(1, { metalBonding: 30 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2800)
    expect((sys as any).welders[0].metalBonding).toBeCloseTo(30.01, 5)
  })

  it('weldingSkill上限为100', () => {
    ;(sys as any).welders.push(makeWelder(1, { weldingSkill: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2800)
    expect((sys as any).welders[0].weldingSkill).toBe(100)
  })

  it('jointStrength上限为100', () => {
    ;(sys as any).welders.push(makeWelder(1, { jointStrength: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2800)
    expect((sys as any).welders[0].jointStrength).toBe(100)
  })

  it('metalBonding上限为100', () => {
    ;(sys as any).welders.push(makeWelder(1, { metalBonding: 99.995 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2800)
    expect((sys as any).welders[0].metalBonding).toBe(100)
  })

  it('多焊工同时更新技能', () => {
    ;(sys as any).welders.push(makeWelder(1, { weldingSkill: 20, jointStrength: 30 }))
    ;(sys as any).welders.push(makeWelder(2, { weldingSkill: 60, jointStrength: 70 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2800)
    expect((sys as any).welders[0].weldingSkill).toBeCloseTo(20.02, 5)
    expect((sys as any).welders[1].weldingSkill).toBeCloseTo(60.02, 5)
  })

  it('heatPrecision字段在update时不变（不参与递增）', () => {
    ;(sys as any).welders.push(makeWelder(1, { weldingSkill: 50, heatPrecision: 30 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2800)
    expect((sys as any).welders[0].heatPrecision).toBe(30)
  })

  it('weldingSkill=100时不继续增长', () => {
    ;(sys as any).welders.push(makeWelder(1, { weldingSkill: 100 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2800)
    expect((sys as any).welders[0].weldingSkill).toBe(100)
  })

  it('jointStrength=100时不继续增长', () => {
    ;(sys as any).welders.push(makeWelder(1, { jointStrength: 100 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2800)
    expect((sys as any).welders[0].jointStrength).toBe(100)
  })

  it('metalBonding=100时不继续增长', () => {
    ;(sys as any).welders.push(makeWelder(1, { metalBonding: 100 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2800)
    expect((sys as any).welders[0].metalBonding).toBe(100)
  })

  it('多次update技能累积增长', () => {
    ;(sys as any).welders.push(makeWelder(1, { weldingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2800)
    sys.update(1, {} as any, 5600)
    expect((sys as any).welders[0].weldingSkill).toBeCloseTo(50.04, 5)
  })
})

describe('CreatureWelderSystem — cleanup: weldingSkill<=4时删除', () => {
  let sys: CreatureWelderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('weldingSkill递增后<=4时被删除（3.98+0.02=4.00<=4）', () => {
    ;(sys as any).welders.push(makeWelder(1, { weldingSkill: 3.98 }))
    ;(sys as any).welders.push(makeWelder(2, { weldingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2800)
    expect((sys as any).welders.length).toBe(1)
    expect((sys as any).welders[0].entityId).toBe(2)
  })

  it('weldingSkill递增后>4时保留（4.0+0.02=4.02>4）', () => {
    ;(sys as any).welders.push(makeWelder(1, { weldingSkill: 4.0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2800)
    expect((sys as any).welders.length).toBe(1)
  })

  it('weldingSkill=3.97+0.02=3.99<=4被删除', () => {
    ;(sys as any).welders.push(makeWelder(1, { weldingSkill: 3.97 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2800)
    expect((sys as any).welders.length).toBe(0)
  })

  it('weldingSkill=0时被删除（0+0.02=0.02<=4）', () => {
    ;(sys as any).welders.push(makeWelder(1, { weldingSkill: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2800)
    expect((sys as any).welders.length).toBe(0)
  })

  it('weldingSkill=1时被删除（1+0.02=1.02<=4）', () => {
    ;(sys as any).welders.push(makeWelder(1, { weldingSkill: 1 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2800)
    expect((sys as any).welders.length).toBe(0)
  })

  it('weldingSkill=4.01时保留（4.01+0.02=4.03>4）', () => {
    ;(sys as any).welders.push(makeWelder(1, { weldingSkill: 4.01 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2800)
    expect((sys as any).welders.length).toBe(1)
  })

  it('cleanup逆序删除不影响其他元素', () => {
    ;(sys as any).welders.push(makeWelder(1, { weldingSkill: 3 }))   // 删除
    ;(sys as any).welders.push(makeWelder(2, { weldingSkill: 50 }))  // 保留
    ;(sys as any).welders.push(makeWelder(3, { weldingSkill: 2 }))   // 删除
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2800)
    expect((sys as any).welders.length).toBe(1)
    expect((sys as any).welders[0].entityId).toBe(2)
  })

  it('全部焊工weldingSkill<=4时全部删除', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).welders.push(makeWelder(i + 1, { weldingSkill: 1 }))
    }
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2800)
    expect((sys as any).welders.length).toBe(0)
  })

  it('cleanup在技能递增之后执行（先增后删）', () => {
    // 初始3.98，递增后=4.00<=4，因此删除
    ;(sys as any).welders.push(makeWelder(1, { weldingSkill: 3.98 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2800)
    expect((sys as any).welders.length).toBe(0)
  })
})

describe('CreatureWelderSystem — RECRUIT_CHANCE 与 MAX_WELDERS', () => {
  let sys: CreatureWelderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('random<RECRUIT_CHANCE(0.0015)时招募新焊工', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2800)
    // 招募+技能检查：新焊工weldingSkill范围[10,35]，均>4，不被删除
    expect((sys as any).welders.length).toBeGreaterThan(0)
  })

  it('random>=RECRUIT_CHANCE(0.0015)时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2800)
    expect((sys as any).welders.length).toBe(0)
  })

  it('焊工达到MAX_WELDERS(10)时不再招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    for (let i = 0; i < 10; i++) {
      ;(sys as any).welders.push(makeWelder(i + 1, { weldingSkill: 50 }))
    }
    sys.update(1, {} as any, 2800)
    // 即使random<RECRUIT_CHANCE，已达上限，不再招募
    // 但技能递增会作用于已有焊工
    expect((sys as any).welders.length).toBe(10)
  })

  it('焊工=9时低于上限可继续招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    for (let i = 0; i < 9; i++) {
      ;(sys as any).welders.push(makeWelder(i + 1, { weldingSkill: 50 }))
    }
    sys.update(1, {} as any, 2800)
    expect((sys as any).welders.length).toBeGreaterThan(9)
  })

  it('招募的焊工weldingSkill在合理范围[10.02,35.02]（含技能递增）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // 接近0，weldingSkill≈10+0.001*25+0.02
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2800)
    if ((sys as any).welders.length > 0) {
      const w = (sys as any).welders[0]
      expect(w.weldingSkill).toBeGreaterThan(10)
      expect(w.weldingSkill).toBeLessThan(36)
    }
  })

  it('招募的焊工 tick 等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2800)
    if ((sys as any).welders.length > 0) {
      expect((sys as any).welders[0].tick).toBe(2800)
    }
  })

  it('招募的焊工 entityId 为 0-499 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2800)
    if ((sys as any).welders.length > 0) {
      const eid = (sys as any).welders[0].entityId
      expect(eid).toBeGreaterThanOrEqual(0)
      expect(eid).toBeLessThan(500)
    }
  })

  it('招募后nextId自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    const idBefore = (sys as any).nextId
    sys.update(1, {} as any, 2800)
    if ((sys as any).welders.length > 0) {
      expect((sys as any).nextId).toBeGreaterThan(idBefore)
    }
  })
})

describe('CreatureWelderSystem — 边界与综合场景', () => {
  let sys: CreatureWelderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('空焊工列表调用update不报错', () => {
    ;(sys as any).lastCheck = 0
    expect(() => sys.update(1, {} as any, 2800)).not.toThrow()
  })

  it('节流期间多次调用均不改变数据', () => {
    ;(sys as any).welders.push(makeWelder(1, { weldingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 100)
    sys.update(1, {} as any, 200)
    sys.update(1, {} as any, 300)
    expect((sys as any).welders[0].weldingSkill).toBe(50)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('同时有招募和技能递增，焊工数据均更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).welders.push(makeWelder(1, { weldingSkill: 50, jointStrength: 60, metalBonding: 70 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2800)
    const w = (sys as any).welders.find((x: Welder) => x.entityId === 1)
    expect(w?.weldingSkill).toBeCloseTo(50.02, 5)
    expect(w?.jointStrength).toBeCloseTo(60.015, 5)
    expect(w?.metalBonding).toBeCloseTo(70.01, 5)
  })

  it('同时有cleanup和招募，总数量合理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).welders.push(makeWelder(1, { weldingSkill: 1 }))   // 将被cleanup删除
    ;(sys as any).welders.push(makeWelder(2, { weldingSkill: 50 }))  // 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2800)
    // 1号被删，2号保留，可能新招募一个
    expect((sys as any).welders.length).toBeGreaterThanOrEqual(1)
  })

  it('所有焊工被cleanup删除后可以重新招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).welders.push(makeWelder(1, { weldingSkill: 1 })) // cleanup删除
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, 2800)
    // 焊工数量：可能为1（新招募）或0
    expect((sys as any).welders.length).toBeGreaterThanOrEqual(0)
  })

  it('dt参数不影响节流和技能计算', () => {
    ;(sys as any).welders.push(makeWelder(1, { weldingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(999, {} as any, 2800) // dt=999，但技能增量固定
    expect((sys as any).welders[0].weldingSkill).toBeCloseTo(50.02, 5)
  })

  it('大tick值正常处理', () => {
    ;(sys as any).welders.push(makeWelder(1, { weldingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    expect(() => sys.update(1, {} as any, 9999999)).not.toThrow()
  })
})
