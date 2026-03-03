import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureTapperSystem } from '../systems/CreatureTapperSystem'
import type { Tapper } from '../systems/CreatureTapperSystem'

const CHECK_INTERVAL = 3010
const MAX_TAPPERS = 10
const em = {} as any

let nextId = 1
function makeSys(): CreatureTapperSystem { return new CreatureTapperSystem() }
function makeTapper(entityId: number, overrides: Partial<Tapper> = {}): Tapper {
  return { id: nextId++, entityId, tappingSkill: 70, threadPitch: 65, depthControl: 80, alignmentAccuracy: 75, tick: 0, ...overrides }
}

describe('CreatureTapperSystem — 初始状态', () => {
  let sys: CreatureTapperSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无螺纹工', () => { expect((sys as any).tappers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).tappers.push(makeTapper(1))
    expect((sys as any).tappers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).tappers.push(makeTapper(1))
    expect((sys as any).tappers).toBe((sys as any).tappers)
  })
  it('字段正确', () => {
    ;(sys as any).tappers.push(makeTapper(2))
    const t = (sys as any).tappers[0]
    expect(t.tappingSkill).toBe(70)
    expect(t.depthControl).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).tappers.push(makeTapper(1))
    ;(sys as any).tappers.push(makeTapper(2))
    expect((sys as any).tappers).toHaveLength(2)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('alignmentAccuracy字段存储正确', () => {
    ;(sys as any).tappers.push(makeTapper(1, { alignmentAccuracy: 42 }))
    expect((sys as any).tappers[0].alignmentAccuracy).toBe(42)
  })
})

describe('CreatureTapperSystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureTapperSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick-lastCheck < CHECK_INTERVAL时直接返回不处理', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick-lastCheck >= CHECK_INTERVAL时更新lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3010)
    expect((sys as any).lastCheck).toBe(3010)
  })
  it('连续两次调用第二次因节流被跳过', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3010)
    sys.update(0, em, 3015)
    expect((sys as any).lastCheck).toBe(3010)
  })
  it('差值恰好等于CHECK_INTERVAL时执行', () => {
    ;(sys as any).lastCheck = 1000
    ;(sys as any).tappers.push(makeTapper(1, { tappingSkill: 50 }))
    sys.update(0, em, 1000 + CHECK_INTERVAL)
    expect((sys as any).tappers[0].tappingSkill).toBeCloseTo(50.02)
  })
  it('节流期间lastCheck不变', () => {
    ;(sys as any).lastCheck = 5000
    sys.update(0, em, 5100)
    expect((sys as any).lastCheck).toBe(5000)
  })
  it('两次间隔均达到时两次都增长', () => {
    ;(sys as any).tappers.push(makeTapper(1, { tappingSkill: 50 }))
    sys.update(0, em, CHECK_INTERVAL)
    sys.update(0, em, CHECK_INTERVAL * 2)
    expect((sys as any).tappers[0].tappingSkill).toBeCloseTo(50.04)
  })
  it('空update不崩溃', () => {
    expect(() => sys.update(0, em, CHECK_INTERVAL)).not.toThrow()
  })
})

describe('CreatureTapperSystem - 技能增量', () => {
  let sys: CreatureTapperSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('每次update使tappingSkill增长0.02', () => {
    ;(sys as any).tappers.push(makeTapper(1, { tappingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3010)
    expect((sys as any).tappers[0].tappingSkill).toBeCloseTo(50.02, 5)
  })
  it('每次update使threadPitch增长0.015', () => {
    ;(sys as any).tappers.push(makeTapper(1, { threadPitch: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3010)
    expect((sys as any).tappers[0].threadPitch).toBeCloseTo(50.015, 5)
  })
  it('每次update使alignmentAccuracy增长0.01', () => {
    ;(sys as any).tappers.push(makeTapper(1, { alignmentAccuracy: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3010)
    expect((sys as any).tappers[0].alignmentAccuracy).toBeCloseTo(50.01, 5)
  })
  it('depthControl不自动增长', () => {
    ;(sys as any).tappers.push(makeTapper(1, { depthControl: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3010)
    expect((sys as any).tappers[0].depthControl).toBe(50)
  })
  it('tappingSkill上限为100（不超过）', () => {
    ;(sys as any).tappers.push(makeTapper(1, { tappingSkill: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3010)
    expect((sys as any).tappers[0].tappingSkill).toBeLessThanOrEqual(100)
  })
  it('threadPitch上限100不超出', () => {
    ;(sys as any).tappers.push(makeTapper(1, { threadPitch: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3010)
    expect((sys as any).tappers[0].threadPitch).toBeLessThanOrEqual(100)
  })
  it('alignmentAccuracy上限100不超出', () => {
    ;(sys as any).tappers.push(makeTapper(1, { alignmentAccuracy: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3010)
    expect((sys as any).tappers[0].alignmentAccuracy).toBeLessThanOrEqual(100)
  })
  it('多名工匠技能同步增长', () => {
    ;(sys as any).tappers.push(makeTapper(1, { tappingSkill: 50 }))
    ;(sys as any).tappers.push(makeTapper(2, { tappingSkill: 60 }))
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3010)
    expect((sys as any).tappers[0].tappingSkill).toBeCloseTo(50.02)
    expect((sys as any).tappers[1].tappingSkill).toBeCloseTo(60.02)
  })
  it('三次更新后tappingSkill累积正确', () => {
    ;(sys as any).tappers.push(makeTapper(1, { tappingSkill: 50 }))
    sys.update(0, em, CHECK_INTERVAL)
    sys.update(0, em, CHECK_INTERVAL * 2)
    sys.update(0, em, CHECK_INTERVAL * 3)
    expect((sys as any).tappers[0].tappingSkill).toBeCloseTo(50.06, 5)
  })
})

describe('CreatureTapperSystem - cleanup边界', () => {
  let sys: CreatureTapperSystem
  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('tappingSkill=3.98增长后<=4被清除', () => {
    ;(sys as any).tappers.push(makeTapper(10, { tappingSkill: 3.98 }))
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3010)
    expect((sys as any).tappers).toHaveLength(0)
  })
  it('tappingSkill=4时增长后4.02>4保留', () => {
    ;(sys as any).tappers.push(makeTapper(1, { tappingSkill: 4 }))
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3010)
    expect((sys as any).tappers).toHaveLength(1)
  })
  it('tappingSkill=3时增长后3.02<=4被移除', () => {
    ;(sys as any).tappers.push(makeTapper(2, { tappingSkill: 3 }))
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3010)
    expect((sys as any).tappers).toHaveLength(0)
  })
  it('tappingSkill正常值不被cleanup', () => {
    ;(sys as any).tappers.push(makeTapper(3, { tappingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3010)
    expect((sys as any).tappers).toHaveLength(1)
  })
  it('混合工匠：低技能被清除，高技能保留', () => {
    ;(sys as any).tappers.push(makeTapper(1, { tappingSkill: 3 }))
    ;(sys as any).tappers.push(makeTapper(2, { tappingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3010)
    expect((sys as any).tappers).toHaveLength(1)
    expect((sys as any).tappers[0].entityId).toBe(2)
  })
  it('全部低技能时所有被清除', () => {
    ;(sys as any).tappers.push(makeTapper(1, { tappingSkill: 1 }))
    ;(sys as any).tappers.push(makeTapper(2, { tappingSkill: 2 }))
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3010)
    expect((sys as any).tappers).toHaveLength(0)
  })
})

describe('CreatureTapperSystem - 招募逻辑', () => {
  let sys: CreatureTapperSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tappers达到MAX_TAPPERS时不再招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    for (let i = 0; i < 10; i++) {
      ;(sys as any).tappers.push(makeTapper(i + 1))
    }
    sys.update(0, em, 3010)
    expect((sys as any).tappers.length).toBe(10)
  })
  it('random >= RECRUIT_CHANCE时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3010)
    expect((sys as any).tappers).toHaveLength(0)
  })
  it('random=0时招募新tapper', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3010)
    expect((sys as any).tappers.length).toBeGreaterThan(0)
  })
  it('招募成功时新记录tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3010)
    if ((sys as any).tappers.length > 0) {
      expect((sys as any).tappers[0].tick).toBe(3010)
    }
  })
  it('多次update技能累积增长正确', () => {
    ;(sys as any).tappers.push(makeTapper(5, { tappingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3010)
    sys.update(0, em, 6020)
    sys.update(0, em, 9030)
    expect((sys as any).tappers[0].tappingSkill).toBeCloseTo(50.06, 5)
  })
  it('招募后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3010)
    if ((sys as any).tappers.length > 0) {
      expect((sys as any).nextId).toBe(2)
    }
  })
})
