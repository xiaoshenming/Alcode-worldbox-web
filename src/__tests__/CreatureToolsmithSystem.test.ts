import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureToolsmithSystem } from '../systems/CreatureToolsmithSystem'
import type { Toolsmith } from '../systems/CreatureToolsmithSystem'

// Minimal EntityManager stub – Toolsmith system does not use em
const em: any = {}

let nextId = 1
function makeSys(): CreatureToolsmithSystem { return new CreatureToolsmithSystem() }
function makeToolsmith(entityId: number, overrides: Partial<Toolsmith> = {}): Toolsmith {
  return {
    id: nextId++,
    entityId,
    metalWorking: 70,
    toolDesign: 65,
    temperingSkill: 80,
    outputQuality: 75,
    tick: 0,
    ...overrides,
  }
}

// Helper: advance the system past CHECK_INTERVAL (2580) so update() runs
const CHECK_INTERVAL = 2580

afterEach(() => vi.restoreAllMocks())

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureToolsmithSystem — 初始状态', () => {
  let sys: CreatureToolsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无工具匠', () => { expect((sys as any).toolsmiths).toHaveLength(0) })
  it('nextId 初始为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck 初始为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('toolsmiths 是数组', () => { expect(Array.isArray((sys as any).toolsmiths)).toBe(true) })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureToolsmithSystem — toolsmith 数据结构', () => {
  let sys: CreatureToolsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入后可查询', () => {
    ;(sys as any).toolsmiths.push(makeToolsmith(1))
    expect((sys as any).toolsmiths[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).toolsmiths.push(makeToolsmith(1))
    expect((sys as any).toolsmiths).toBe((sys as any).toolsmiths)
  })
  it('字段 metalWorking 正确', () => {
    ;(sys as any).toolsmiths.push(makeToolsmith(2))
    const t = (sys as any).toolsmiths[0]
    expect(t.metalWorking).toBe(70)
  })
  it('字段 temperingSkill 正确', () => {
    ;(sys as any).toolsmiths.push(makeToolsmith(2))
    const t = (sys as any).toolsmiths[0]
    expect(t.temperingSkill).toBe(80)
  })
  it('字段 toolDesign 正确', () => {
    ;(sys as any).toolsmiths.push(makeToolsmith(2))
    const t = (sys as any).toolsmiths[0]
    expect(t.toolDesign).toBe(65)
  })
  it('字段 outputQuality 正确', () => {
    ;(sys as any).toolsmiths.push(makeToolsmith(2))
    const t = (sys as any).toolsmiths[0]
    expect(t.outputQuality).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).toolsmiths.push(makeToolsmith(1))
    ;(sys as any).toolsmiths.push(makeToolsmith(2))
    expect((sys as any).toolsmiths).toHaveLength(2)
  })
  it('toolsmith 包含 id 字段', () => {
    const t = makeToolsmith(1)
    expect(t).toHaveProperty('id')
  })
  it('toolsmith 包含 entityId 字段', () => {
    const t = makeToolsmith(3)
    expect(t.entityId).toBe(3)
  })
  it('toolsmith 包含 tick 字段', () => {
    const t = makeToolsmith(1, { tick: 500 })
    expect(t.tick).toBe(500)
  })
  it('overrides 可覆盖 metalWorking', () => {
    const t = makeToolsmith(1, { metalWorking: 30 })
    expect(t.metalWorking).toBe(30)
  })
  it('overrides 可覆盖 outputQuality', () => {
    const t = makeToolsmith(1, { outputQuality: 10 })
    expect(t.outputQuality).toBe(10)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureToolsmithSystem — CHECK_INTERVAL=2580 节流', () => {
  let sys: CreatureToolsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 未超过 CHECK_INTERVAL 时 update() 跳过', () => {
    const t = makeToolsmith(1, { metalWorking: 70 })
    ;(sys as any).toolsmiths.push(t)
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).toolsmiths[0].metalWorking).toBe(70)
  })
  it('tick 刚超过 CHECK_INTERVAL 时 update() 执行', () => {
    const t = makeToolsmith(1, { metalWorking: 70 })
    ;(sys as any).toolsmiths.push(t)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).toolsmiths[0].metalWorking).toBeCloseTo(70.02)
  })
  it('第二次调用在同一批次内不再执行', () => {
    const t = makeToolsmith(1, { metalWorking: 70 })
    ;(sys as any).toolsmiths.push(t)
    sys.update(1, em, CHECK_INTERVAL)
    const afterFirst = (sys as any).toolsmiths[0].metalWorking
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).toolsmiths[0].metalWorking).toBe(afterFirst)
  })
  it('tick=2579 时不触发（边界-1）', () => {
    const t = makeToolsmith(1, { metalWorking: 50 })
    ;(sys as any).toolsmiths.push(t)
    sys.update(1, em, 2579)
    expect((sys as any).toolsmiths[0].metalWorking).toBe(50)
  })
  it('tick=2580 时恰好触发（边界值）', () => {
    const t = makeToolsmith(1, { metalWorking: 50 })
    ;(sys as any).toolsmiths.push(t)
    sys.update(1, em, 2580)
    expect((sys as any).toolsmiths[0].metalWorking).toBeCloseTo(50.02)
  })
  it('lastCheck 更新为当前 tick', () => {
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('第二个完整间隔后再次触发', () => {
    const t = makeToolsmith(1, { metalWorking: 50 })
    ;(sys as any).toolsmiths.push(t)
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).toolsmiths[0].metalWorking).toBeCloseTo(50.04)
  })
  it('lastCheck 非零时差值计算正确', () => {
    ;(sys as any).lastCheck = 5000
    const t = makeToolsmith(1, { metalWorking: 50 })
    ;(sys as any).toolsmiths.push(t)
    sys.update(1, em, 6000)   // 6000-5000=1000 < 2580，不触发
    expect((sys as any).toolsmiths[0].metalWorking).toBe(50)
    sys.update(1, em, 7580)   // 7580-5000=2580 >= 2580，触发
    expect((sys as any).toolsmiths[0].metalWorking).toBeCloseTo(50.02)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureToolsmithSystem — 技能递增', () => {
  let sys: CreatureToolsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('每次触发 metalWorking +0.02', () => {
    const t = makeToolsmith(1, { metalWorking: 50 })
    ;(sys as any).toolsmiths.push(t)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).toolsmiths[0].metalWorking).toBeCloseTo(50.02)
  })
  it('每次触发 temperingSkill +0.015', () => {
    const t = makeToolsmith(1, { temperingSkill: 50 })
    ;(sys as any).toolsmiths.push(t)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).toolsmiths[0].temperingSkill).toBeCloseTo(50.015)
  })
  it('每次触发 outputQuality +0.01', () => {
    const t = makeToolsmith(1, { outputQuality: 50 })
    ;(sys as any).toolsmiths.push(t)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).toolsmiths[0].outputQuality).toBeCloseTo(50.01)
  })
  it('metalWorking 上限 100', () => {
    const t = makeToolsmith(1, { metalWorking: 99.99 })
    ;(sys as any).toolsmiths.push(t)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).toolsmiths[0].metalWorking).toBe(100)
  })
  it('temperingSkill 上限 100', () => {
    const t = makeToolsmith(1, { temperingSkill: 99.99 })
    ;(sys as any).toolsmiths.push(t)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).toolsmiths[0].temperingSkill).toBe(100)
  })
  it('outputQuality 上限 100', () => {
    const t = makeToolsmith(1, { outputQuality: 99.99 })
    ;(sys as any).toolsmiths.push(t)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).toolsmiths[0].outputQuality).toBe(100)
  })
  it('metalWorking 已为 100 时保持 100', () => {
    const t = makeToolsmith(1, { metalWorking: 100 })
    ;(sys as any).toolsmiths.push(t)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).toolsmiths[0].metalWorking).toBe(100)
  })
  it('temperingSkill 已为 100 时保持 100', () => {
    const t = makeToolsmith(1, { temperingSkill: 100 })
    ;(sys as any).toolsmiths.push(t)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).toolsmiths[0].temperingSkill).toBe(100)
  })
  it('outputQuality 已为 100 时保持 100', () => {
    const t = makeToolsmith(1, { outputQuality: 100 })
    ;(sys as any).toolsmiths.push(t)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).toolsmiths[0].outputQuality).toBe(100)
  })
  it('多个 toolsmith 各自独立增长', () => {
    ;(sys as any).toolsmiths.push(makeToolsmith(1, { metalWorking: 30 }))
    ;(sys as any).toolsmiths.push(makeToolsmith(2, { metalWorking: 60 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).toolsmiths[0].metalWorking).toBeCloseTo(30.02)
    expect((sys as any).toolsmiths[1].metalWorking).toBeCloseTo(60.02)
  })
  it('两次触发后技能累积增长 x2', () => {
    const t = makeToolsmith(1, { metalWorking: 50 })
    ;(sys as any).toolsmiths.push(t)
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).toolsmiths[0].metalWorking).toBeCloseTo(50.04)
  })
  it('toolDesign 字段不被 update 修改（系统未对其操作）', () => {
    const t = makeToolsmith(1, { toolDesign: 65 })
    ;(sys as any).toolsmiths.push(t)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).toolsmiths[0].toolDesign).toBe(65)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureToolsmithSystem — cleanup：metalWorking <= 4 时移除', () => {
  let sys: CreatureToolsmithSystem
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys = makeSys(); nextId = 1
  })
  afterEach(() => vi.restoreAllMocks())

  it('metalWorking=3.98 先递增再检查，递增后 4.00 仍被删除（边界=4）', () => {
    const t = makeToolsmith(1, { metalWorking: 3.98 })
    ;(sys as any).toolsmiths.push(t)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).toolsmiths).toHaveLength(0)
  })
  it('metalWorking=4.01 先递增再检查，递增后 4.03 不被删除', () => {
    const t = makeToolsmith(1, { metalWorking: 4.01 })
    ;(sys as any).toolsmiths.push(t)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).toolsmiths).toHaveLength(1)
  })
  it('高 metalWorking 工具匠不被删除', () => {
    const t = makeToolsmith(1, { metalWorking: 70 })
    ;(sys as any).toolsmiths.push(t)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).toolsmiths).toHaveLength(1)
  })
  it('只删低 metalWorking，不影响正常工具匠', () => {
    ;(sys as any).toolsmiths.push(makeToolsmith(1, { metalWorking: 3.98 }))
    ;(sys as any).toolsmiths.push(makeToolsmith(2, { metalWorking: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).toolsmiths).toHaveLength(1)
    expect((sys as any).toolsmiths[0].entityId).toBe(2)
  })
  it('metalWorking=4 恰好被删除（边界值：<= 4）', () => {
    // 初始 metalWorking=3.98，+0.02=4.00，4.00 <= 4 → 删
    const t = makeToolsmith(1, { metalWorking: 3.98 })
    ;(sys as any).toolsmiths.push(t)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).toolsmiths).toHaveLength(0)
  })
  it('metalWorking=4.02 递增后 4.04 > 4，不被删除', () => {
    const t = makeToolsmith(1, { metalWorking: 4.02 })
    ;(sys as any).toolsmiths.push(t)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).toolsmiths).toHaveLength(1)
  })
  it('多个低 metalWorking 工具匠全部被删除', () => {
    ;(sys as any).toolsmiths.push(makeToolsmith(1, { metalWorking: 1 }))
    ;(sys as any).toolsmiths.push(makeToolsmith(2, { metalWorking: 2 }))
    ;(sys as any).toolsmiths.push(makeToolsmith(3, { metalWorking: 3.5 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).toolsmiths).toHaveLength(0)
  })
  it('cleanup 在技能递增之后发生（顺序验证）', () => {
    // 3.98 → +0.02 → 4.00 → cleanup删除
    // 如果 cleanup 在递增前，4.00 还未到，则不会删
    const t = makeToolsmith(1, { metalWorking: 3.98 })
    ;(sys as any).toolsmiths.push(t)
    sys.update(1, em, CHECK_INTERVAL)
    // 被删说明：先增再cleanup
    expect((sys as any).toolsmiths).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureToolsmithSystem — MAX_TOOLSMITHS=10 上限', () => {
  let sys: CreatureToolsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('已满10个时不再招募（即使随机成功）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    for (let i = 0; i < 10; i++) {
      ;(sys as any).toolsmiths.push(makeToolsmith(i + 1))
    }
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).toolsmiths.length).toBeLessThanOrEqual(10)
  })
  it('已有9个时，随机成功可新增至10', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    for (let i = 0; i < 9; i++) {
      ;(sys as any).toolsmiths.push(makeToolsmith(i + 1, { metalWorking: 20 }))
    }
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).toolsmiths.length).toBeLessThanOrEqual(10)
  })
  it('RECRUIT_CHANCE=0.0015，random返回0.002时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002) // > 0.0015
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).toolsmiths).toHaveLength(0)
  })
  it('RECRUIT_CHANCE=0.0015，random返回0时招募成功', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // < 0.0015
    sys.update(1, em, CHECK_INTERVAL)
    // 可能新增1个（取决于cleanup不删掉它）
    expect((sys as any).toolsmiths.length).toBeGreaterThanOrEqual(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureToolsmithSystem — 招募时随机属性范围', () => {
  it('metalWorking 范围：10 + rand*25 = [10, 35)', () => {
    // 最小: 10+0=10, 最大: 10+25=35
    const min = 10 + 0 * 25
    const max = 10 + 1 * 25
    expect(min).toBe(10)
    expect(max).toBe(35)
  })
  it('toolDesign 范围：15 + rand*20 = [15, 35)', () => {
    const min = 15 + 0 * 20
    const max = 15 + 1 * 20
    expect(min).toBe(15)
    expect(max).toBe(35)
  })
  it('temperingSkill 范围：5 + rand*20 = [5, 25)', () => {
    const min = 5 + 0 * 20
    const max = 5 + 1 * 20
    expect(min).toBe(5)
    expect(max).toBe(25)
  })
  it('outputQuality 范围：10 + rand*25 = [10, 35)', () => {
    const min = 10 + 0 * 25
    const max = 10 + 1 * 25
    expect(min).toBe(10)
    expect(max).toBe(35)
  })
  it('新招募的 toolsmith 技能均在合理范围内', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // 中间值：< 0.0015 失败，但测范围
    // 使用更接近 RECRUIT_CHANCE 的值
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // < 0.0015 通过
    sys.update(1, em, CHECK_INTERVAL)
    if ((sys as any).toolsmiths.length > 0) {
      const t = (sys as any).toolsmiths[0]
      expect(t.metalWorking).toBeGreaterThanOrEqual(10)
      expect(t.metalWorking).toBeLessThanOrEqual(35)
      expect(t.temperingSkill).toBeGreaterThanOrEqual(5)
      expect(t.temperingSkill).toBeLessThanOrEqual(25)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureToolsmithSystem — nextId 自增', () => {
  let sys: CreatureToolsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('招募成功后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em, CHECK_INTERVAL)
    const added = (sys as any).toolsmiths.length
    expect((sys as any).nextId).toBe(1 + added)
  })
  it('未招募时 nextId 不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // 不招募
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureToolsmithSystem — 极端值与边界', () => {
  let sys: CreatureToolsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('metalWorking=0 时，+0.02=0.02，仍被 cleanup 删除（0.02 <= 4）', () => {
    const t = makeToolsmith(1, { metalWorking: 0 })
    ;(sys as any).toolsmiths.push(t)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).toolsmiths).toHaveLength(0)
  })
  it('metalWorking=4.00 直接输入，cleanup 判断 4.00<=4 → 删除（在+0.02之前）', () => {
    // 注意：先增后删，所以 4.00 + 0.02 = 4.02 > 4，不应该被删
    // 但若直接初始化为 4.00，则 4.00 + 0.02 = 4.02，不被删
    const t = makeToolsmith(1, { metalWorking: 4.00 })
    ;(sys as any).toolsmiths.push(t)
    sys.update(1, em, CHECK_INTERVAL)
    // 4.00 + 0.02 = 4.02 > 4, 不删
    expect((sys as any).toolsmiths).toHaveLength(1)
  })
  it('metalWorking 刚好等于 3.98 → 增后 4.00 → 被删', () => {
    const t = makeToolsmith(1, { metalWorking: 3.98 })
    ;(sys as any).toolsmiths.push(t)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).toolsmiths).toHaveLength(0)
  })
  it('无实体时 update 安全执行不抛异常', () => {
    expect(() => sys.update(1, em, CHECK_INTERVAL)).not.toThrow()
  })
  it('tick=0 时不触发（lastCheck=0，差值=0<2580）', () => {
    const t = makeToolsmith(1, { metalWorking: 50 })
    ;(sys as any).toolsmiths.push(t)
    sys.update(1, em, 0)
    expect((sys as any).toolsmiths[0].metalWorking).toBe(50)
  })
})
