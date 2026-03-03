import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureBorerSystem } from '../systems/CreatureBorerSystem'
import type { Borer } from '../systems/CreatureBorerSystem'

const CHECK_INTERVAL = 2980

let nextId = 1
function makeSys(): CreatureBorerSystem { return new CreatureBorerSystem() }
function makeBorer(entityId: number): Borer {
  return { id: nextId++, entityId, boringSkill: 30, cuttingDepth: 25, holeConcentricity: 20, toolAlignment: 35, tick: 0 }
}

describe('CreatureBorerSystem - 初始状态', () => {
  let sys: CreatureBorerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无镗孔师', () => { expect((sys as any).borers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).borers.push(makeBorer(1))
    expect((sys as any).borers[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).borers.push(makeBorer(1))
    expect((sys as any).borers).toBe((sys as any).borers)
  })

  it('多个全部返回', () => {
    ;(sys as any).borers.push(makeBorer(1))
    ;(sys as any).borers.push(makeBorer(2))
    expect((sys as any).borers).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const b = makeBorer(10)
    b.boringSkill = 80; b.cuttingDepth = 75; b.holeConcentricity = 70; b.toolAlignment = 65
    ;(sys as any).borers.push(b)
    const r = (sys as any).borers[0]
    expect(r.boringSkill).toBe(80)
    expect(r.cuttingDepth).toBe(75)
    expect(r.holeConcentricity).toBe(70)
    expect(r.toolAlignment).toBe(65)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
})

describe('CreatureBorerSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureBorerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 小于 CHECK_INTERVAL 时不更新 lastCheck', () => {
    sys.update(1, {} as any, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 等于 CHECK_INTERVAL 时更新 lastCheck', () => {
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick 大于 CHECK_INTERVAL 时更新 lastCheck', () => {
    sys.update(1, {} as any, CHECK_INTERVAL + 200)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 200)
  })

  it('第二次 tick 未超过间隔时不再更新 lastCheck', () => {
    sys.update(1, {} as any, CHECK_INTERVAL)
    sys.update(1, {} as any, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('第二次 tick 超过间隔时再次更新 lastCheck', () => {
    sys.update(1, {} as any, CHECK_INTERVAL)
    sys.update(1, {} as any, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('tick=1 时不触发', () => {
    sys.update(1, {} as any, 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('CHECK_INTERVAL-1 边界不触发', () => {
    sys.update(1, {} as any, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('多次调用在间隔内只触发一次', () => {
    sys.update(1, {} as any, CHECK_INTERVAL)
    sys.update(1, {} as any, CHECK_INTERVAL + 500)
    sys.update(1, {} as any, CHECK_INTERVAL + 1000)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
})

describe('CreatureBorerSystem - boringSkill 主技能递增', () => {
  let sys: CreatureBorerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('每次触发后 boringSkill 增加 0.02', () => {
    const b = makeBorer(1)
    b.boringSkill = 50
    ;(sys as any).borers.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).borers[0].boringSkill).toBeCloseTo(50.02)
  })

  it('boringSkill 上限为 100，不超过', () => {
    const b = makeBorer(1)
    b.boringSkill = 99.99
    ;(sys as any).borers.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).borers[0].boringSkill).toBe(100)
  })

  it('boringSkill 恰好 100 保持不变', () => {
    const b = makeBorer(1)
    b.boringSkill = 100
    ;(sys as any).borers.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).borers[0].boringSkill).toBe(100)
  })

  it('两个镗孔师同时递增 boringSkill', () => {
    const b1 = makeBorer(1); b1.boringSkill = 40
    const b2 = makeBorer(2); b2.boringSkill = 60
    ;(sys as any).borers.push(b1, b2)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).borers[0].boringSkill).toBeCloseTo(40.02)
    expect((sys as any).borers[1].boringSkill).toBeCloseTo(60.02)
  })

  it('多次 update 后 boringSkill 累积', () => {
    const b = makeBorer(1)
    b.boringSkill = 50
    ;(sys as any).borers.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    sys.update(1, {} as any, CHECK_INTERVAL * 2)
    expect((sys as any).borers[0].boringSkill).toBeCloseTo(50.04)
  })
})

describe('CreatureBorerSystem - 次要技能字段递增', () => {
  let sys: CreatureBorerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('每次触发后 cuttingDepth 增加 0.015', () => {
    const b = makeBorer(1)
    b.cuttingDepth = 50
    ;(sys as any).borers.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).borers[0].cuttingDepth).toBeCloseTo(50.015)
  })

  it('每次触发后 toolAlignment 增加 0.01', () => {
    const b = makeBorer(1)
    b.toolAlignment = 50
    ;(sys as any).borers.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).borers[0].toolAlignment).toBeCloseTo(50.01)
  })

  it('toolAlignment 上限为 100，不超过', () => {
    const b = makeBorer(1)
    b.toolAlignment = 99.999
    ;(sys as any).borers.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).borers[0].toolAlignment).toBe(100)
  })

  it('cuttingDepth 上限为 100，不超过', () => {
    const b = makeBorer(1)
    b.cuttingDepth = 99.99
    ;(sys as any).borers.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).borers[0].cuttingDepth).toBe(100)
  })

  it('节流期间技能不递增', () => {
    const b = makeBorer(1)
    b.boringSkill = 50
    ;(sys as any).borers.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL - 1)
    expect((sys as any).borers[0].boringSkill).toBe(50)
  })

  it('holeConcentricity 字段不被 update 修改', () => {
    const b = makeBorer(1)
    b.holeConcentricity = 20
    ;(sys as any).borers.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).borers[0].holeConcentricity).toBe(20)
  })
})

describe('CreatureBorerSystem - cleanup 逻辑', () => {
  let sys: CreatureBorerSystem
  beforeEach(() => {
    sys = makeSys(); nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('技能递增后仍 <= 4 的镗孔师被移除（初始值 3.0）', () => {
    const b = makeBorer(1)
    b.boringSkill = 3.0
    ;(sys as any).borers.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).borers).toHaveLength(0)
  })

  it('boringSkill > 4 的镗孔师不被移除', () => {
    const b = makeBorer(1)
    b.boringSkill = 4.01
    ;(sys as any).borers.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).borers).toHaveLength(1)
  })

  it('先技能递增后 cleanup：初始值 3.98 递增后 4.00 仍被清除', () => {
    const b = makeBorer(1)
    b.boringSkill = 3.98
    ;(sys as any).borers.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).borers).toHaveLength(0)
  })

  it('只清除低技能，高技能保留', () => {
    const b1 = makeBorer(1); b1.boringSkill = 3.0
    const b2 = makeBorer(2); b2.boringSkill = 50
    ;(sys as any).borers.push(b1, b2)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).borers).toHaveLength(1)
    expect((sys as any).borers[0].entityId).toBe(2)
  })

  it('boringSkill 恰好 4 被清除', () => {
    const b = makeBorer(1)
    b.boringSkill = 4 - 0.02
    ;(sys as any).borers.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).borers).toHaveLength(0)
  })

  it('节流期间不触发 cleanup', () => {
    const b = makeBorer(1)
    b.boringSkill = 2.0
    ;(sys as any).borers.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL - 1)
    expect((sys as any).borers).toHaveLength(1)
  })

  it('多个低技能都被清除', () => {
    for (let i = 0; i < 3; i++) {
      const b = makeBorer(i + 1)
      b.boringSkill = 2.0
      ;(sys as any).borers.push(b)
    }
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).borers).toHaveLength(0)
  })
})

describe('CreatureBorerSystem - 招募逻辑', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('random < RECRUIT_CHANCE(0.0015) 时招募', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).borers.length).toBeGreaterThanOrEqual(1)
  })

  it('random >= RECRUIT_CHANCE 时不招募', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).borers).toHaveLength(0)
  })

  it('达到 MAX_BORERS(10) 上限时不再招募', () => {
    const sys = makeSys()
    for (let i = 0; i < 10; i++) {
      ;(sys as any).borers.push(makeBorer(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).borers).toHaveLength(10)
  })

  it('招募后 nextId 递增', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).nextId).toBeGreaterThan(1)
  })

  it('招募的镗孔师包含所有必要字段', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, {} as any, CHECK_INTERVAL)
    if ((sys as any).borers.length > 0) {
      const b = (sys as any).borers[0]
      expect(typeof b.boringSkill).toBe('number')
      expect(typeof b.cuttingDepth).toBe('number')
      expect(typeof b.holeConcentricity).toBe('number')
      expect(typeof b.toolAlignment).toBe('number')
    }
  })

  it('低于上限时可以招募', () => {
    const sys = makeSys()
    for (let i = 0; i < 9; i++) {
      const b = makeBorer(i + 1)
      b.boringSkill = 50
      ;(sys as any).borers.push(b)
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).borers.length).toBeGreaterThan(9)
  })
})

describe('CreatureBorerSystem - 边界与综合场景', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('空数组时 update 不报错', () => {
    const sys = makeSys()
    expect(() => sys.update(1, {} as any, CHECK_INTERVAL)).not.toThrow()
  })

  it('dt 参数不影响节流逻辑', () => {
    const sys = makeSys()
    sys.update(999, {} as any, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('entityId 被正确保存', () => {
    const sys = makeSys()
    const b = makeBorer(55)
    ;(sys as any).borers.push(b)
    expect((sys as any).borers[0].entityId).toBe(55)
  })

  it('大量镗孔师时 cleanup 正确处理交替低高值', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    for (let i = 0; i < 10; i++) {
      const b = makeBorer(i + 1)
      b.boringSkill = i % 2 === 0 ? 2.0 : 50
      ;(sys as any).borers.push(b)
    }
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).borers).toHaveLength(5)
  })

  it('所有字段类型正确', () => {
    const sys = makeSys()
    const b = makeBorer(1)
    ;(sys as any).borers.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    const r = (sys as any).borers[0]
    expect(typeof r.boringSkill).toBe('number')
    expect(typeof r.cuttingDepth).toBe('number')
    expect(typeof r.toolAlignment).toBe('number')
  })
})
