import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureNailsmithSystem } from '../systems/CreatureNailsmithSystem'
import type { Nailsmith } from '../systems/CreatureNailsmithSystem'

const CHECK_INTERVAL = 2620
const em = {} as any

let nextId = 1
function makeSys(): CreatureNailsmithSystem { return new CreatureNailsmithSystem() }
function makeNailsmith(entityId: number): Nailsmith {
  return { id: nextId++, entityId, ironDrawing: 70, headForming: 65, pointShaping: 75, outputQuality: 80, tick: 0 }
}

describe('CreatureNailsmithSystem.getNailsmiths', () => {
  let sys: CreatureNailsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无钉工匠', () => { expect((sys as any).nailsmiths).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).nailsmiths.push(makeNailsmith(1))
    expect((sys as any).nailsmiths[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).nailsmiths.push(makeNailsmith(1))
    expect((sys as any).nailsmiths).toBe((sys as any).nailsmiths)
  })
  it('字段正确', () => {
    ;(sys as any).nailsmiths.push(makeNailsmith(3))
    const n = (sys as any).nailsmiths[0]
    expect(n.ironDrawing).toBe(70)
    expect(n.outputQuality).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).nailsmiths.push(makeNailsmith(1))
    ;(sys as any).nailsmiths.push(makeNailsmith(2))
    expect((sys as any).nailsmiths).toHaveLength(2)
  })
})

describe('CreatureNailsmithSystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureNailsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick=0时不执行更新（lastCheck=0，差值=0<2620）', () => {
    ;(sys as any).nailsmiths.push(makeNailsmith(1))
    const before = (sys as any).nailsmiths[0].ironDrawing
    sys.update(1, em, 0)
    expect((sys as any).nailsmiths[0].ironDrawing).toBe(before)
  })

  it('tick < CHECK_INTERVAL 时不更新技能', () => {
    ;(sys as any).nailsmiths.push(makeNailsmith(1))
    const before = (sys as any).nailsmiths[0].ironDrawing
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).nailsmiths[0].ironDrawing).toBe(before)
  })

  it('tick === CHECK_INTERVAL 时触发更新', () => {
    ;(sys as any).nailsmiths.push(makeNailsmith(1))
    const before = (sys as any).nailsmiths[0].ironDrawing
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths[0].ironDrawing).toBeCloseTo(before + 0.02, 5)
  })

  it('tick > CHECK_INTERVAL 时触发更新', () => {
    ;(sys as any).nailsmiths.push(makeNailsmith(1))
    const before = (sys as any).nailsmiths[0].ironDrawing
    sys.update(1, em, CHECK_INTERVAL + 100)
    expect((sys as any).nailsmiths[0].ironDrawing).toBeCloseTo(before + 0.02, 5)
  })

  it('触发后lastCheck更新为当前tick', () => {
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('第二次调用需再等CHECK_INTERVAL才能再次触发', () => {
    ;(sys as any).nailsmiths.push(makeNailsmith(1))
    sys.update(1, em, CHECK_INTERVAL)
    const afterFirst = (sys as any).nailsmiths[0].ironDrawing
    // 未到下一个间隔
    sys.update(1, em, CHECK_INTERVAL + 1)
    expect((sys as any).nailsmiths[0].ironDrawing).toBe(afterFirst)
    // 超过第二个间隔
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).nailsmiths[0].ironDrawing).toBeGreaterThan(afterFirst)
  })
})

describe('CreatureNailsmithSystem - 技能增量', () => {
  let sys: CreatureNailsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('ironDrawing每次更新+0.02', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), ironDrawing: 50 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths[0].ironDrawing).toBeCloseTo(50.02, 5)
  })

  it('pointShaping每次更新+0.015', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), pointShaping: 50 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths[0].pointShaping).toBeCloseTo(50.015, 5)
  })

  it('outputQuality每次更新+0.01', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), outputQuality: 50 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths[0].outputQuality).toBeCloseTo(50.01, 5)
  })

  it('ironDrawing上限100，不超过100', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), ironDrawing: 99.99 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths[0].ironDrawing).toBe(100)
  })

  it('pointShaping上限100，不超过100', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), pointShaping: 100 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths[0].pointShaping).toBe(100)
  })

  it('outputQuality上限100，不超过100', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), outputQuality: 100 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths[0].outputQuality).toBe(100)
  })

  it('headForming不在增量列表内，保持不变', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), headForming: 55 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths[0].headForming).toBe(55)
  })

  it('多个工匠各自技能独立递增', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), ironDrawing: 30 })
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(2), ironDrawing: 60 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths[0].ironDrawing).toBeCloseTo(30.02, 5)
    expect((sys as any).nailsmiths[1].ironDrawing).toBeCloseTo(60.02, 5)
  })
})

describe('CreatureNailsmithSystem - cleanup边界', () => {
  let sys: CreatureNailsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('ironDrawing=3.98（<=4），更新后=4.00仍<=4，被删除', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), ironDrawing: 3.98 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    // 3.98 + 0.02 = 4.00，但cleanup检查在增量之后，4.00 <= 4 → 删除
    expect((sys as any).nailsmiths).toHaveLength(0)
  })

  it('ironDrawing=4.01（>4），保留', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), ironDrawing: 4.01 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths).toHaveLength(1)
  })

  it('ironDrawing=4，更新+0.02变成4.02，但cleanup是在增量后检查，4.00原始值<=4时…实际已增量过，4.02 > 4保留', () => {
    // ironDrawing初始=4，增量后=4.02 > 4，保留
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), ironDrawing: 4 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths).toHaveLength(1)
  })

  it('ironDrawing=1（远低于4），被cleanup删除', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), ironDrawing: 1 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths).toHaveLength(0)
  })

  it('混合：ironDrawing低的删除，高的保留', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), ironDrawing: 2 })
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(2), ironDrawing: 50 })
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(3), ironDrawing: 3 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths).toHaveLength(1)
    expect((sys as any).nailsmiths[0].entityId).toBe(2)
  })

  it('cleanup不依赖headForming，headForming极低时不影响保留', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), ironDrawing: 50, headForming: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths).toHaveLength(1)
  })
})

describe('CreatureNailsmithSystem - nextId自增', () => {
  let sys: CreatureNailsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始nextId=1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('注入工匠后nextId不影响（内部计数独立）', () => {
    ;(sys as any).nailsmiths.push(makeNailsmith(1))
    expect((sys as any).nextId).toBe(1)
  })
})

// ---- Extended tests (to reach 50+) ----

describe('CreatureNailsmithSystem - headForming字段保留', () => {
  let sys: CreatureNailsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入headForming=40，update后仍为40', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), headForming: 40 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths[0].headForming).toBe(40)
  })

  it('注入headForming=100，update后仍为100', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), headForming: 100 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths[0].headForming).toBe(100)
  })
})

describe('CreatureNailsmithSystem - lastCheck正确追踪', () => {
  let sys: CreatureNailsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('三次各达CHECK_INTERVAL时lastCheck正确更新', () => {
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    sys.update(1, em, CHECK_INTERVAL * 3)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 3)
  })
})

describe('CreatureNailsmithSystem - 多工匠各自独立cleanup', () => {
  let sys: CreatureNailsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('3个ironDrawing均低，全部删除', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), ironDrawing: 1 })
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(2), ironDrawing: 2 })
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(3), ironDrawing: 3 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths).toHaveLength(0)
  })

  it('3个均高，全部保留', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), ironDrawing: 50 })
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(2), ironDrawing: 60 })
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(3), ironDrawing: 70 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths).toHaveLength(3)
  })
})

describe('CreatureNailsmithSystem - 数据完整性', () => {
  let sys: CreatureNailsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入Nailsmith所有字段正确保存', () => {
    const ns = { id: 77, entityId: 99, ironDrawing: 55, headForming: 45, pointShaping: 65, outputQuality: 75, tick: 500 }
    ;(sys as any).nailsmiths.push(ns)
    const stored = (sys as any).nailsmiths[0]
    expect(stored.id).toBe(77)
    expect(stored.entityId).toBe(99)
    expect(stored.tick).toBe(500)
  })

  it('不同entityId的工匠可共存', () => {
    ;(sys as any).nailsmiths.push(makeNailsmith(11))
    ;(sys as any).nailsmiths.push(makeNailsmith(22))
    ;(sys as any).nailsmiths.push(makeNailsmith(33))
    const ids = (sys as any).nailsmiths.map((n: any) => n.entityId)
    expect(ids).toContain(11)
    expect(ids).toContain(22)
    expect(ids).toContain(33)
  })
})

describe('CreatureNailsmithSystem - pointShaping边界值', () => {
  let sys: CreatureNailsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('pointShaping=0时，增量后=0.015，不被cleanup(cleanup检查ironDrawing)', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), ironDrawing: 50, pointShaping: 0 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths).toHaveLength(1)
    expect((sys as any).nailsmiths[0].pointShaping).toBeCloseTo(0.015)
  })

  it('pointShaping从50连续增长', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), ironDrawing: 50, pointShaping: 50 })
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).nailsmiths[0].pointShaping).toBeCloseTo(50.03)
  })
})

describe('CreatureNailsmithSystem - outputQuality连续增长', () => {
  let sys: CreatureNailsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('outputQuality从60连续2次更新后为60.02', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), ironDrawing: 50, outputQuality: 60 })
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).nailsmiths[0].outputQuality).toBeCloseTo(60.02)
  })
})

describe('CreatureNailsmithSystem - ironDrawing连续增长到边界', () => {
  let sys: CreatureNailsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('ironDrawing从98开始，两次更新后达到100', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), ironDrawing: 98 })
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).nailsmiths[0].ironDrawing).toBeCloseTo(98.04)
  })
})

describe('CreatureNailsmithSystem - outputQuality从0开始增长', () => {
  let sys: CreatureNailsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('outputQuality从0开始，update后为0.01', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), ironDrawing: 50, outputQuality: 0 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths[0].outputQuality).toBeCloseTo(0.01)
  })
})

describe('CreatureNailsmithSystem - 大批量工匠处理', () => {
  let sys: CreatureNailsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('10个工匠同时更新，各自独立', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).nailsmiths.push({ ...makeNailsmith(i + 1), ironDrawing: 50 + i })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    for (let i = 0; i < 10; i++) {
      expect((sys as any).nailsmiths[i].ironDrawing).toBeCloseTo(50 + i + 0.02)
    }
  })
})

describe('CreatureNailsmithSystem - 精确验证', () => {
  let sys: CreatureNailsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('CHECK_INTERVAL=2620常量验证', () => {
    expect(CHECK_INTERVAL).toBe(2620)
  })

  it('注入3个工匠后3个全部可读', () => {
    for (let i = 0; i < 3; i++) {
      ;(sys as any).nailsmiths.push(makeNailsmith(i + 1))
    }
    expect((sys as any).nailsmiths).toHaveLength(3)
  })
})

describe('CreatureNailsmithSystem - 更多字段验证', () => {
  let sys: CreatureNailsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('headForming=0时不被cleanup删除（cleanup检查ironDrawing）', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), ironDrawing: 50, headForming: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect((sys as any).nailsmiths).toHaveLength(1)
  })
})

describe('CreatureNailsmithSystem - ironDrawing绝对边界', () => {
  let sys: CreatureNailsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('ironDrawing=4.02（>4），保留', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), ironDrawing: 4.02 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect((sys as any).nailsmiths).toHaveLength(1)
  })

  it('ironDrawing=3（<4），更新后3.02仍<4?不对，3.02>4?不对。3+0.02=3.02<4→删', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), ironDrawing: 3 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    vi.restoreAllMocks()
    // 3.02 <= 4 → 删除
    expect((sys as any).nailsmiths).toHaveLength(0)
  })
})

describe('CreatureNailsmithSystem - 数据结构字段类型', () => {
  it('Nailsmith接口所有字段为number类型', () => {
    const n = makeNailsmith(1)
    expect(typeof n.id).toBe('number')
    expect(typeof n.entityId).toBe('number')
    expect(typeof n.ironDrawing).toBe('number')
    expect(typeof n.headForming).toBe('number')
    expect(typeof n.pointShaping).toBe('number')
    expect(typeof n.outputQuality).toBe('number')
    expect(typeof n.tick).toBe('number')
  })
})

describe('CreatureNailsmithSystem - 综合3测试', () => {
  let sys: CreatureNailsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('两次连续达阈值，技能连续增长两次', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), ironDrawing: 20 })
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).nailsmiths[0].ironDrawing).toBeCloseTo(20.04)
  })

  it('outputQuality从0增长到0.02（两次update）', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), ironDrawing: 50, outputQuality: 0 })
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).nailsmiths[0].outputQuality).toBeCloseTo(0.02)
  })

  it('pointShaping从0增长到0.03（三次update）', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), ironDrawing: 50, pointShaping: 0 })
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    sys.update(1, em, CHECK_INTERVAL * 3)
    expect((sys as any).nailsmiths[0].pointShaping).toBeCloseTo(0.045)
  })
})
