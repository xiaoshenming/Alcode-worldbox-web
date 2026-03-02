import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldHotSpring2System } from '../systems/WorldHotSpringSystem2'
import type { HotSpring2 } from '../systems/WorldHotSpringSystem2'

function makeSys(): WorldHotSpring2System { return new WorldHotSpring2System() }
let nextId = 1
function makeSpring(overrides: Partial<HotSpring2> = {}): HotSpring2 {
  return {
    id: nextId++, x: 20, y: 30,
    waterTemp: 60, mineralRichness: 70, flowRate: 15,
    healingPotency: 80, tick: 0,
    ...overrides,
  }
}

const mockWorld = { width: 200, height: 200 } as any
const mockEm = {} as any

describe('WorldHotSpring2System - 初始状态', () => {
  let sys: WorldHotSpring2System
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无温泉', () => { expect((sys as any).springs).toHaveLength(0) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('注入后可查询', () => {
    ;(sys as any).springs.push(makeSpring())
    expect((sys as any).springs).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).springs).toBe((sys as any).springs)
  })
  it('温泉字段正确', () => {
    ;(sys as any).springs.push(makeSpring())
    const s = (sys as any).springs[0]
    expect(s.waterTemp).toBe(60)
    expect(s.mineralRichness).toBe(70)
    expect(s.healingPotency).toBe(80)
  })
})

describe('WorldHotSpring2System - CHECK_INTERVAL节流', () => {
  let sys: WorldHotSpring2System
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < CHECK_INTERVAL(2640)时不执行任何逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, mockWorld, mockEm, 100)
    expect((sys as any).springs).toHaveLength(0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick恰好等于CHECK_INTERVAL时不执行（严格小于）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, mockWorld, mockEm, 2639)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=CHECK_INTERVAL时触发更新，lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mockWorld, mockEm, 2640)
    expect((sys as any).lastCheck).toBe(2640)
  })

  it('第��次update间隔不足时不再触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mockWorld, mockEm, 2640)
    const checkAfterFirst = (sys as any).lastCheck
    sys.update(1, mockWorld, mockEm, 3000)
    expect((sys as any).lastCheck).toBe(checkAfterFirst)
  })

  it('第二次update间隔足够时再次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mockWorld, mockEm, 2640)
    sys.update(1, mockWorld, mockEm, 5280)
    expect((sys as any).lastCheck).toBe(5280)
  })
})

describe('WorldHotSpring2System - spawn逻辑', () => {
  let sys: WorldHotSpring2System
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('random=0.9时不spawn（FORM_CHANCE=0.0014，0.9>0.0014）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mockWorld, mockEm, 2640)
    expect((sys as any).springs).toHaveLength(0)
  })

  it('random=0时spawn一个温泉', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mockWorld, mockEm, 2640)
    expect((sys as any).springs).toHaveLength(1)
  })

  it('spawn后nextId递增为2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mockWorld, mockEm, 2640)
    expect((sys as any).nextId).toBe(2)
  })

  it('spawn后温泉x在[0, width)范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mockWorld, mockEm, 2640)
    const s = (sys as any).springs[0]
    expect(s.x).toBeGreaterThanOrEqual(0)
    expect(s.x).toBeLessThan(200)
  })

  it('spawn的waterTemp在[35,80)范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mockWorld, mockEm, 2640)
    // waterTemp = 35 + 0*45 = 35, then decayed by 0.005 → 34.995, max(30, 34.995)=34.995
    const s = (sys as any).springs[0]
    expect(s.waterTemp).toBeGreaterThanOrEqual(30)
    expect(s.waterTemp).toBeLessThan(80)
  })
})

describe('WorldHotSpring2System - update数值逻辑', () => {
  let sys: WorldHotSpring2System
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('waterTemp每次update后衰减0.005', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).springs.push(makeSpring({ waterTemp: 50 }))
    sys.update(1, mockWorld, mockEm, 2640)
    const s = (sys as any).springs[0]
    expect(s.waterTemp).toBeCloseTo(49.995, 5)
  })

  it('waterTemp下限为30（Math.max(30, ...)），30.001衰减后被钳至30并触发cleanup删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).springs.push(makeSpring({ waterTemp: 30.001 }))
    sys.update(1, mockWorld, mockEm, 2640)
    // 30.001 - 0.005 = 29.996 < 30 → Math.max(30, 29.996) = 30 → 30<=30 → cleanup删除
    expect((sys as any).springs).toHaveLength(0)
  })

  it('mineralRichness每次update后增加0.008', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).springs.push(makeSpring({ mineralRichness: 50 }))
    sys.update(1, mockWorld, mockEm, 2640)
    const s = (sys as any).springs[0]
    expect(s.mineralRichness).toBeCloseTo(50.008, 5)
  })

  it('mineralRichness上限为100（Math.min(100, ...)）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).springs.push(makeSpring({ mineralRichness: 99.999 }))
    sys.update(1, mockWorld, mockEm, 2640)
    const s = (sys as any).springs[0]
    expect(s.mineralRichness).toBe(100)
  })

  it('healingPotency每次update后增加0.005', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).springs.push(makeSpring({ healingPotency: 50 }))
    sys.update(1, mockWorld, mockEm, 2640)
    const s = (sys as any).springs[0]
    expect(s.healingPotency).toBeCloseTo(50.005, 5)
  })

  it('healingPotency上限为100（Math.min(100, ...)）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).springs.push(makeSpring({ healingPotency: 99.999 }))
    sys.update(1, mockWorld, mockEm, 2640)
    const s = (sys as any).springs[0]
    expect(s.healingPotency).toBe(100)
  })
})

describe('WorldHotSpring2System - cleanup逻辑', () => {
  let sys: WorldHotSpring2System
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('waterTemp精确衰减至30时被删除（30.005-0.005=30 → <=30 → 删除）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).springs.push(makeSpring({ waterTemp: 30.005 }))
    sys.update(1, mockWorld, mockEm, 2640)
    // 30.005 - 0.005 = 30.000; Math.max(30, 30.0) = 30; 30 <= 30 → 删除
    expect((sys as any).springs).toHaveLength(0)
  })

  it('waterTemp=30.006时经update后保留（30.006-0.005=30.001 > 30）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).springs.push(makeSpring({ waterTemp: 30.006 }))
    sys.update(1, mockWorld, mockEm, 2640)
    // 30.006 - 0.005 = 30.001 > 30，保留
    expect((sys as any).springs).toHaveLength(1)
  })

  it('waterTemp=31时经update后保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).springs.push(makeSpring({ waterTemp: 31 }))
    sys.update(1, mockWorld, mockEm, 2640)
    expect((sys as any).springs).toHaveLength(1)
  })

  it('混合cleanup：低温泉被删，高温泉保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).springs.push(makeSpring({ waterTemp: 30.004 }))
    ;(sys as any).springs.push(makeSpring({ waterTemp: 50 }))
    sys.update(1, mockWorld, mockEm, 2640)
    expect((sys as any).springs).toHaveLength(1)
    expect((sys as any).springs[0].waterTemp).toBeCloseTo(49.995, 5)
  })

  it('多个低温泉全部被删', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).springs.push(makeSpring({ waterTemp: 30 }))
    ;(sys as any).springs.push(makeSpring({ waterTemp: 29 }))
    sys.update(1, mockWorld, mockEm, 2640)
    expect((sys as any).springs).toHaveLength(0)
  })
})

describe('WorldHotSpring2System - MAX_SPRINGS上限', () => {
  let sys: WorldHotSpring2System
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('已有10个温泉时不再spawn（MAX_SPRINGS=10）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 10; i++) {
      ;(sys as any).springs.push(makeSpring({ waterTemp: 60 }))
    }
    sys.update(1, mockWorld, mockEm, 2640)
    // 先cleanup：waterTemp=60 > 30，无删除；spawn检查 length>=10，跳过
    expect((sys as any).springs).toHaveLength(10)
  })

  it('9个温泉时random<FORM_CHANCE可spawn到10', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 9; i++) {
      ;(sys as any).springs.push(makeSpring({ waterTemp: 60 }))
    }
    sys.update(1, mockWorld, mockEm, 2640)
    // 9个保留（60-0.005=59.995>30），spawn时length=9<10，random=0<0.0014 → spawn
    expect((sys as any).springs).toHaveLength(10)
  })
})
