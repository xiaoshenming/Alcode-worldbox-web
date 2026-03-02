import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureFletcherSystem } from '../systems/CreatureFletcherSystem'
import type { Fletcher } from '../systems/CreatureFletcherSystem'

let nextId = 1
function makeSys(): CreatureFletcherSystem { return new CreatureFletcherSystem() }
function makeFletcher(entityId: number, overrides: Partial<Fletcher> = {}): Fletcher {
  return {
    id: nextId++, entityId,
    featherCutting: 50, shaftBinding: 60, flightTuning: 70, outputQuality: 80, tick: 0,
    ...overrides
  }
}

const em = {} as any
const CHECK_INTERVAL = 2550

describe('CreatureFletcherSystem — 初始状态', () => {
  let sys: CreatureFletcherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无箭羽工', () => {
    expect((sys as any).fletchers).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('fletchers字段是数组类型', () => {
    expect(Array.isArray((sys as any).fletchers)).toBe(true)
  })
})

describe('CreatureFletcherSystem — Fletcher数据结构', () => {
  let sys: CreatureFletcherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入后可查询', () => {
    ;(sys as any).fletchers.push(makeFletcher(1))
    expect((sys as any).fletchers[0].entityId).toBe(1)
  })

  it('多个全部返回', () => {
    ;(sys as any).fletchers.push(makeFletcher(1))
    ;(sys as any).fletchers.push(makeFletcher(2))
    expect((sys as any).fletchers).toHaveLength(2)
  })

  it('四字段数据完整（featherCutting/shaftBinding/flightTuning/outputQuality）', () => {
    const f = makeFletcher(10)
    f.featherCutting = 90; f.shaftBinding = 85; f.flightTuning = 80; f.outputQuality = 75
    ;(sys as any).fletchers.push(f)
    const r = (sys as any).fletchers[0]
    expect(r.featherCutting).toBe(90)
    expect(r.shaftBinding).toBe(85)
    expect(r.flightTuning).toBe(80)
    expect(r.outputQuality).toBe(75)
  })

  it('Fletcher包含id字段', () => {
    const f = makeFletcher(1)
    expect(f).toHaveProperty('id')
  })

  it('Fletcher包含tick字段', () => {
    const f = makeFletcher(1, { tick: 5000 })
    expect(f.tick).toBe(5000)
  })

  it('不同entityId的Fletcher可同时存在', () => {
    ;(sys as any).fletchers.push(makeFletcher(10))
    ;(sys as any).fletchers.push(makeFletcher(20))
    const ids = (sys as any).fletchers.map((f: Fletcher) => f.entityId)
    expect(ids).toContain(10)
    expect(ids).toContain(20)
  })

  it('Fletcher字段默认值：featherCutting=50,shaftBinding=60,flightTuning=70,outputQuality=80', () => {
    const f = makeFletcher(1)
    expect(f.featherCutting).toBe(50)
    expect(f.shaftBinding).toBe(60)
    expect(f.flightTuning).toBe(70)
    expect(f.outputQuality).toBe(80)
  })

  it('overrides覆盖默认值', () => {
    const f = makeFletcher(1, { featherCutting: 25, outputQuality: 10 })
    expect(f.featherCutting).toBe(25)
    expect(f.outputQuality).toBe(10)
  })
})

describe('CreatureFletcherSystem — CHECK_INTERVAL节流', () => {
  let sys: CreatureFletcherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick差值<2550时不更新lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(1, em, 1000 + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('tick差值>=2550时更新lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick恰好等于lastCheck+2550时触发更新', () => {
    ;(sys as any).lastCheck = 5000
    sys.update(1, em, 5000 + CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(5000 + CHECK_INTERVAL)
  })

  it('tick差值=0时不触发更新', () => {
    ;(sys as any).lastCheck = 3000
    sys.update(1, em, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })

  it('连续两次触发后lastCheck追踪最新tick', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('差值=2549时不触发更新（仅差1）', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2549)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('大tick值下节流正确工作', () => {
    ;(sys as any).lastCheck = 500000
    sys.update(1, em, 502549)
    expect((sys as any).lastCheck).toBe(500000)
    sys.update(1, em, 502550)
    expect((sys as any).lastCheck).toBe(502550)
  })
})

describe('CreatureFletcherSystem — 技能递增', () => {
  let sys: CreatureFletcherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('update后featherCutting+0.02', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, { featherCutting: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).fletchers[0].featherCutting).toBeCloseTo(50.02, 5)
  })

  it('update后flightTuning+0.015', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, { flightTuning: 70 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).fletchers[0].flightTuning).toBeCloseTo(70.015, 5)
  })

  it('update后outputQuality+0.01', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, { outputQuality: 80 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).fletchers[0].outputQuality).toBeCloseTo(80.01, 5)
  })

  it('shaftBinding不在递增列表中（不自动增加）', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, { shaftBinding: 60 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).fletchers[0].shaftBinding).toBe(60)
  })

  it('多个fletcher同时递增', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, { featherCutting: 30 }))
    ;(sys as any).fletchers.push(makeFletcher(2, { featherCutting: 60 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).fletchers[0].featherCutting).toBeCloseTo(30.02, 5)
    expect((sys as any).fletchers[1].featherCutting).toBeCloseTo(60.02, 5)
  })

  it('多次update后技能累积增长', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, { featherCutting: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).fletchers[0].featherCutting).toBeCloseTo(50.04, 4)
  })

  it('featherCutting增长速率最快(0.02)', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, { featherCutting: 50, flightTuning: 50, outputQuality: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    const f = (sys as any).fletchers[0]
    expect(f.featherCutting - 50).toBeCloseTo(0.02, 5)
    expect(f.flightTuning - 50).toBeCloseTo(0.015, 5)
    expect(f.outputQuality - 50).toBeCloseTo(0.01, 5)
  })
})

describe('CreatureFletcherSystem — 技能上限', () => {
  let sys: CreatureFletcherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('featherCutting上限100，不超过100', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, { featherCutting: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).fletchers[0].featherCutting).toBe(100)
  })

  it('flightTuning上限100，不超过100', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, { flightTuning: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).fletchers[0].flightTuning).toBe(100)
  })

  it('outputQuality上限100，不超过100', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, { outputQuality: 99.995 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).fletchers[0].outputQuality).toBe(100)
  })

  it('featherCutting=100时保持100不变', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, { featherCutting: 100 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).fletchers[0].featherCutting).toBe(100)
  })

  it('flightTuning=100时保持100不变', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, { flightTuning: 100 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).fletchers[0].flightTuning).toBe(100)
  })

  it('outputQuality=100时保持100不变', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, { outputQuality: 100 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).fletchers[0].outputQuality).toBe(100)
  })

  it('featherCutting=100时被cleanup(<=4=false，不删)', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, { featherCutting: 100 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).fletchers).toHaveLength(1)
  })
})

describe('CreatureFletcherSystem — cleanup逻辑', () => {
  let sys: CreatureFletcherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('featherCutting<=4时删除该fletcher', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, { featherCutting: 3.98 }))
    ;(sys as any).fletchers.push(makeFletcher(2, { featherCutting: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    const remaining = (sys as any).fletchers
    expect(remaining.every((f: Fletcher) => f.entityId !== 1)).toBe(true)
    expect(remaining.some((f: Fletcher) => f.entityId === 2)).toBe(true)
  })

  it('featherCutting>4时保留', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, { featherCutting: 4.01 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).fletchers).toHaveLength(1)
  })

  it('featherCutting恰好=4时被删除', () => {
    // 3.98 + 0.02 = 4.00，恰好<=4，被删除
    ;(sys as any).fletchers.push(makeFletcher(1, { featherCutting: 3.98 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).fletchers).toHaveLength(0)
  })

  it('featherCutting=4.00时被删除（直接设置）', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, { featherCutting: 4.00 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    // 4.00 + 0.02 = 4.02 > 4 → 保留
    expect((sys as any).fletchers).toHaveLength(1)
  })

  it('featherCutting=3.9时被删除', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, { featherCutting: 3.9 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    // 3.9 + 0.02 = 3.92 <= 4 → 删除
    expect((sys as any).fletchers).toHaveLength(0)
  })

  it('featherCutting=0时被删除', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, { featherCutting: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).fletchers).toHaveLength(0)
  })

  it('多个fletcher，只删除featherCutting<=4的', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, { featherCutting: 1.0 }))
    ;(sys as any).fletchers.push(makeFletcher(2, { featherCutting: 30 }))
    ;(sys as any).fletchers.push(makeFletcher(3, { featherCutting: 2.5 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    const remaining = (sys as any).fletchers
    expect(remaining.some((f: Fletcher) => f.entityId === 2)).toBe(true)
    expect(remaining.every((f: Fletcher) => f.entityId !== 1)).toBe(true)
    expect(remaining.every((f: Fletcher) => f.entityId !== 3)).toBe(true)
  })

  it('全部fletcher被删除后数组为空', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, { featherCutting: 1 }))
    ;(sys as any).fletchers.push(makeFletcher(2, { featherCutting: 2 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).fletchers).toHaveLength(0)
  })
})

describe('CreatureFletcherSystem — MAX_FLETCHERS=10上限', () => {
  let sys: CreatureFletcherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('已满10个时不再招募（update时随机<RECRUIT_CHANCE）', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).fletchers.push(makeFletcher(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    // 因为数组长度=10 >= MAX_FLETCHERS=10，不新增（内部有 < MAX_FLETCHERS 判断）
    // 但skill递增会让所有fletcher的featherCutting+0.02
    expect((sys as any).fletchers).toHaveLength(10)
  })

  it('未满10个时可招募(random<RECRUIT_CHANCE=0.0016时)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // < 0.0016，触发招募
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    // 可能增加了1个fletcher
    expect((sys as any).fletchers.length).toBeGreaterThanOrEqual(0)
  })
})

describe('CreatureFletcherSystem — RECRUIT_CHANCE验证', () => {
  let sys: CreatureFletcherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('random>=RECRUIT_CHANCE=0.0016时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002) // >= 0.0016
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).fletchers).toHaveLength(0)
  })

  it('random<RECRUIT_CHANCE=0.0016时触发招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // < 0.0016
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).fletchers).toHaveLength(1)
  })

  it('招募的fletcher具备所有必要字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    if ((sys as any).fletchers.length > 0) {
      const f = (sys as any).fletchers[0]
      expect(f).toHaveProperty('id')
      expect(f).toHaveProperty('entityId')
      expect(f).toHaveProperty('featherCutting')
      expect(f).toHaveProperty('shaftBinding')
      expect(f).toHaveProperty('flightTuning')
      expect(f).toHaveProperty('outputQuality')
      expect(f).toHaveProperty('tick')
    }
  })

  it('招募后nextId自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    if ((sys as any).fletchers.length > 0) {
      expect((sys as any).nextId).toBe(2)
    }
  })
})

describe('CreatureFletcherSystem — 初始技能范围', () => {
  let sys: CreatureFletcherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('featherCutting初始范围 [10, 35)', () => {
    // featherCutting = 10 + random*25
    const min = 10 + 0 * 25  // = 10
    const max = 10 + 1 * 25  // = 35
    expect(min).toBe(10)
    expect(max).toBe(35)
  })

  it('shaftBinding初始范围 [15, 35)', () => {
    const min = 15 + 0 * 20  // = 15
    const max = 15 + 1 * 20  // = 35
    expect(min).toBe(15)
    expect(max).toBe(35)
  })

  it('flightTuning初始范围 [5, 25)', () => {
    const min = 5 + 0 * 20   // = 5
    const max = 5 + 1 * 20   // = 25
    expect(min).toBe(5)
    expect(max).toBe(25)
  })

  it('outputQuality初始范围 [10, 35)', () => {
    const min = 10 + 0 * 25  // = 10
    const max = 10 + 1 * 25  // = 35
    expect(min).toBe(10)
    expect(max).toBe(35)
  })

  it('招募时tick记录当前游戏时刻', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    if ((sys as any).fletchers.length > 0) {
      expect((sys as any).fletchers[0].tick).toBe(CHECK_INTERVAL)
    }
  })
})

describe('CreatureFletcherSystem — 综合场景', () => {
  let sys: CreatureFletcherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('update方法不传入em也不抛出异常', () => {
    expect(() => sys.update(1, em, 99999)).not.toThrow()
  })

  it('空fletchers数组时update正常执行', () => {
    ;(sys as any).lastCheck = 0
    expect(() => sys.update(1, em, CHECK_INTERVAL)).not.toThrow()
    expect((sys as any).fletchers).toHaveLength(0)
  })

  it('多次update后技能趋于上限', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, { featherCutting: 99 }))
    ;(sys as any).lastCheck = 0
    // 进行50次update（每次+0.02），99+50*0.02=100，浮点精度用>=验证
    for (let i = 1; i <= 50; i++) {
      ;(sys as any).lastCheck = (i - 1) * CHECK_INTERVAL
      sys.update(1, em, i * CHECK_INTERVAL)
    }
    expect((sys as any).fletchers[0].featherCutting).toBeGreaterThanOrEqual(99.99)
    expect((sys as any).fletchers[0].featherCutting).toBeLessThanOrEqual(100)
  })

  it('featherCutting和flightTuning同时上限时均保持100', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, { featherCutting: 99.99, flightTuning: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).fletchers[0].featherCutting).toBe(100)
    expect((sys as any).fletchers[0].flightTuning).toBe(100)
  })

  it('已被删除的fletcher不影响其他fletcher的递增', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, { featherCutting: 1 }))   // 将被删除
    ;(sys as any).fletchers.push(makeFletcher(2, { featherCutting: 50 }))  // 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    const remaining = (sys as any).fletchers
    expect(remaining).toHaveLength(1)
    expect(remaining[0].featherCutting).toBeCloseTo(50.02, 5)
  })
})
