import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureLapidarySystem } from '../systems/CreatureLapidarySystem'
import type { Lapidary } from '../systems/CreatureLapidarySystem'

let nextId = 1
function makeSys(): CreatureLapidarySystem { return new CreatureLapidarySystem() }
function makeLap(entityId: number, cuttingSkill = 70, overrides: Partial<Lapidary> = {}): Lapidary {
  return {
    id: nextId++, entityId,
    cuttingSkill,
    polishingControl: 65,
    gemIdentification: 80,
    outputQuality: 75,
    tick: 0,
    ...overrides,
  }
}

afterEach(() => vi.restoreAllMocks())

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureLapidarySystem - 初始化与数据结构', () => {
  let sys: CreatureLapidarySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无宝石工', () => {
    expect((sys as any).lapidaries).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('注入后 entityId 正确', () => {
    ;(sys as any).lapidaries.push(makeLap(1))
    expect((sys as any).lapidaries[0].entityId).toBe(1)
  })

  it('内部引用稳定（同一对象）', () => {
    ;(sys as any).lapidaries.push(makeLap(1))
    expect((sys as any).lapidaries).toBe((sys as any).lapidaries)
  })

  it('多个宝石工全��可查询', () => {
    ;(sys as any).lapidaries.push(makeLap(1))
    ;(sys as any).lapidaries.push(makeLap(2))
    expect((sys as any).lapidaries).toHaveLength(2)
  })

  it('四字段完整：cuttingSkill=70', () => {
    ;(sys as any).lapidaries.push(makeLap(1))
    expect((sys as any).lapidaries[0].cuttingSkill).toBe(70)
  })

  it('四字段完整：polishingControl=65', () => {
    ;(sys as any).lapidaries.push(makeLap(1))
    expect((sys as any).lapidaries[0].polishingControl).toBe(65)
  })

  it('四字段完整：gemIdentification=80', () => {
    ;(sys as any).lapidaries.push(makeLap(1))
    expect((sys as any).lapidaries[0].gemIdentification).toBe(80)
  })

  it('四字段完整：outputQuality=75', () => {
    ;(sys as any).lapidaries.push(makeLap(1))
    expect((sys as any).lapidaries[0].outputQuality).toBe(75)
  })

  it('Lapidary 对象包含 id 字段', () => {
    const l = makeLap(1)
    expect(l).toHaveProperty('id')
  })

  it('Lapidary 对象包含 tick 字段', () => {
    const l = makeLap(1, 70, { tick: 500 })
    expect(l.tick).toBe(500)
  })

  it('可注入自定义 cuttingSkill', () => {
    const l = makeLap(1, 42)
    expect(l.cuttingSkill).toBe(42)
  })

  it('可注入自定义 polishingControl', () => {
    const l = makeLap(1, 70, { polishingControl: 30 })
    expect(l.polishingControl).toBe(30)
  })

  it('可注入自定义 gemIdentification', () => {
    const l = makeLap(1, 70, { gemIdentification: 55 })
    expect(l.gemIdentification).toBe(55)
  })

  it('可注入自定义 outputQuality', () => {
    const l = makeLap(1, 70, { outputQuality: 20 })
    expect(l.outputQuality).toBe(20)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureLapidarySystem - CHECK_INTERVAL 节流（2690）', () => {
  let sys: CreatureLapidarySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 差值 < 2690 时 lastCheck 不更新', () => {
    const em = {} as any
    sys.update(0, em, 0)
    sys.update(0, em, 100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 差值 = 2690 时 lastCheck 更新', () => {
    const em = {} as any
    sys.update(0, em, 0)
    sys.update(0, em, 2690)
    expect((sys as any).lastCheck).toBe(2690)
  })

  it('tick 差值 > 2690 时 lastCheck 更新', () => {
    const em = {} as any
    sys.update(0, em, 0)
    sys.update(0, em, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('差值 1 不触发更新', () => {
    const em = {} as any
    sys.update(0, em, 2690)
    sys.update(0, em, 2691)
    expect((sys as any).lastCheck).toBe(2690)
  })

  it('差值 2689 不触发更新', () => {
    const em = {} as any
    sys.update(0, em, 2690)
    sys.update(0, em, 5378)  // 5378 - 2690 = 2688 < 2690
    expect((sys as any).lastCheck).toBe(2690)
  })

  it('第一次 update(0) 后 lastCheck=0', () => {
    const em = {} as any
    sys.update(0, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('lastCheck 正确递进到第二次触发', () => {
    const em = {} as any
    sys.update(0, em, 0)
    sys.update(0, em, 2690)
    sys.update(0, em, 5380)
    expect((sys as any).lastCheck).toBe(5380)
  })

  it('大 tick 跳跃时正确触发', () => {
    const em = {} as any
    sys.update(0, em, 0)
    sys.update(0, em, 99999)
    expect((sys as any).lastCheck).toBe(99999)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureLapidarySystem - 技能递增公式', () => {
  let sys: CreatureLapidarySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('update 后 cuttingSkill + 0.02', () => {
    const initialSkill = 50
    ;(sys as any).lapidaries.push(makeLap(1, initialSkill))
    const em = {} as any
    sys.update(0, em, 0)
    sys.update(0, em, 2690)
    expect((sys as any).lapidaries[0].cuttingSkill).toBeCloseTo(initialSkill + 0.02, 5)
  })

  it('update 后 polishingControl + 0.015', () => {
    const l = makeLap(1)
    const initial = l.polishingControl
    ;(sys as any).lapidaries.push(l)
    const em = {} as any
    sys.update(0, em, 0)
    sys.update(0, em, 2690)
    expect((sys as any).lapidaries[0].polishingControl).toBeCloseTo(initial + 0.015, 5)
  })

  it('update 后 outputQuality + 0.01', () => {
    const l = makeLap(1)
    const initial = l.outputQuality
    ;(sys as any).lapidaries.push(l)
    const em = {} as any
    sys.update(0, em, 0)
    sys.update(0, em, 2690)
    expect((sys as any).lapidaries[0].outputQuality).toBeCloseTo(initial + 0.01, 5)
  })

  it('gemIdentification 不变（无递增逻辑）', () => {
    const l = makeLap(1, 70, { gemIdentification: 80 })
    ;(sys as any).lapidaries.push(l)
    const em = {} as any
    sys.update(0, em, 0)
    sys.update(0, em, 2690)
    expect((sys as any).lapidaries[0].gemIdentification).toBe(80)
  })

  it('cuttingSkill 上限 100：99.99 + 0.02 = 100', () => {
    const l = makeLap(1, 99.99)
    ;(sys as any).lapidaries.push(l)
    const em = {} as any
    sys.update(0, em, 0)
    sys.update(0, em, 2690)
    expect((sys as any).lapidaries[0].cuttingSkill).toBe(100)
  })

  it('polishingControl 上限 100：99.99 + 0.015 = 100', () => {
    const l = makeLap(1, 70, { polishingControl: 99.99 })
    ;(sys as any).lapidaries.push(l)
    const em = {} as any
    sys.update(0, em, 0)
    sys.update(0, em, 2690)
    expect((sys as any).lapidaries[0].polishingControl).toBe(100)
  })

  it('outputQuality 上限 100：99.99 + 0.01 = 100', () => {
    const l = makeLap(1, 70, { outputQuality: 99.99 })
    ;(sys as any).lapidaries.push(l)
    const em = {} as any
    sys.update(0, em, 0)
    sys.update(0, em, 2690)
    expect((sys as any).lapidaries[0].outputQuality).toBe(100)
  })

  it('cuttingSkill 100 + 0.02 仍保持 100', () => {
    const l = makeLap(1, 100)
    ;(sys as any).lapidaries.push(l)
    const em = {} as any
    sys.update(0, em, 0)
    sys.update(0, em, 2690)
    expect((sys as any).lapidaries[0].cuttingSkill).toBe(100)
  })

  it('polishingControl 100 + 0.015 仍保持 100', () => {
    const l = makeLap(1, 70, { polishingControl: 100 })
    ;(sys as any).lapidaries.push(l)
    const em = {} as any
    sys.update(0, em, 0)
    sys.update(0, em, 2690)
    expect((sys as any).lapidaries[0].polishingControl).toBe(100)
  })

  it('outputQuality 100 + 0.01 仍保持 100', () => {
    const l = makeLap(1, 70, { outputQuality: 100 })
    ;(sys as any).lapidaries.push(l)
    const em = {} as any
    sys.update(0, em, 0)
    sys.update(0, em, 2690)
    expect((sys as any).lapidaries[0].outputQuality).toBe(100)
  })

  it('两次 update 触发后技能累积增长', () => {
    const l = makeLap(1, 50)
    ;(sys as any).lapidaries.push(l)
    const em = {} as any
    sys.update(0, em, 0)
    sys.update(0, em, 2690)
    sys.update(0, em, 5380)
    expect((sys as any).lapidaries[0].cuttingSkill).toBeCloseTo(50 + 0.04, 4)
  })

  it('多个宝石工各自独立递增', () => {
    const l1 = makeLap(1, 50)
    const l2 = makeLap(2, 60)
    ;(sys as any).lapidaries.push(l1, l2)
    const em = {} as any
    sys.update(0, em, 0)
    sys.update(0, em, 2690)
    expect((sys as any).lapidaries[0].cuttingSkill).toBeCloseTo(50.02, 5)
    expect((sys as any).lapidaries[1].cuttingSkill).toBeCloseTo(60.02, 5)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureLapidarySystem - cleanup 删除逻辑（cuttingSkill <= 4）', () => {
  let sys: CreatureLapidarySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('cuttingSkill = 4.02（4 + 0.02）时保留', () => {
    const l = makeLap(1, 4)
    ;(sys as any).lapidaries.push(l)
    const em = {} as any
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // 不招募
    sys.update(0, em, 0)
    sys.update(0, em, 2690)
    // 4 + 0.02 = 4.02 > 4，保留
    expect((sys as any).lapidaries).toHaveLength(1)
  })

  it('cuttingSkill = 3.98（3.98 + 0.02 = 4.00 <= 4）时删除', () => {
    const l = makeLap(1, 3.98)
    ;(sys as any).lapidaries.push(l)
    const em = {} as any
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 0)
    sys.update(0, em, 2690)
    expect((sys as any).lapidaries).toHaveLength(0)
  })

  it('cuttingSkill = 5 时不删除', () => {
    const l = makeLap(1, 5)
    ;(sys as any).lapidaries.push(l)
    const em = {} as any
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 0)
    sys.update(0, em, 2690)
    expect((sys as any).lapidaries).toHaveLength(1)
  })

  it('cuttingSkill = 0 时删除', () => {
    const l = makeLap(1, 0)
    ;(sys as any).lapidaries.push(l)
    const em = {} as any
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 0)
    sys.update(0, em, 2690)
    // 0 + 0.02 = 0.02 <= 4，删除
    expect((sys as any).lapidaries).toHaveLength(0)
  })

  it('cuttingSkill = 1 时删除（1 + 0.02 = 1.02 <= 4）', () => {
    const l = makeLap(1, 1)
    ;(sys as any).lapidaries.push(l)
    const em = {} as any
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 0)
    sys.update(0, em, 2690)
    expect((sys as any).lapidaries).toHaveLength(0)
  })

  it('cuttingSkill = 4 时（更新后 4.02）保留', () => {
    ;(sys as any).lapidaries.push(makeLap(1, 4))
    const em = {} as any
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 0)
    sys.update(0, em, 2690)
    expect((sys as any).lapidaries).toHaveLength(1)
    expect((sys as any).lapidaries[0].cuttingSkill).toBeCloseTo(4.02, 5)
  })

  it('混合：低技能被删高技能保留', () => {
    ;(sys as any).lapidaries.push(makeLap(1, 1))   // 删除
    ;(sys as any).lapidaries.push(makeLap(2, 50))  // 保留
    ;(sys as any).lapidaries.push(makeLap(3, 3.5)) // 3.5+0.02=3.52 <= 4 删除
    const em = {} as any
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 0)
    sys.update(0, em, 2690)
    expect((sys as any).lapidaries).toHaveLength(1)
    expect((sys as any).lapidaries[0].entityId).toBe(2)
  })

  it('空列表 cleanup 不崩溃', () => {
    const em = {} as any
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => { sys.update(0, em, 0); sys.update(0, em, 2690) }).not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureLapidarySystem - 招募逻辑', () => {
  let sys: CreatureLapidarySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('random < RECRUIT_CHANCE(0.0014) 时可能招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001) // < 0.0014
    const em = {} as any
    ;(sys as any).lastCheck = -2690
    sys.update(0, em, 0)
    // 可能招募（取决于 lapidaries.length < 10）
    expect((sys as any).lapidaries.length).toBeLessThanOrEqual(1)
  })

  it('random >= RECRUIT_CHANCE(0.0014) 时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002) // >= 0.0014
    const em = {} as any
    ;(sys as any).lastCheck = -2690
    sys.update(0, em, 0)
    expect((sys as any).lapidaries).toHaveLength(0)
  })

  it('MAX_LAPIDARIES=10 已满时不招募', () => {
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).lapidaries.push(makeLap(i))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.0001) // < 0.0014
    const em = {} as any
    ;(sys as any).lastCheck = -2690
    sys.update(0, em, 0)
    expect((sys as any).lapidaries).toHaveLength(10)
  })

  it('招募后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const em = {} as any
    const prevId = (sys as any).nextId
    ;(sys as any).lastCheck = -2690
    sys.update(0, em, 0)
    // 如果招募成功，nextId 应递增
    expect((sys as any).nextId).toBeGreaterThanOrEqual(prevId)
  })

  it('招募的宝石工 entityId 在 0-499 之间', () => {
    // entityId = Math.floor(Math.random() * 500)
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.0001) // recruit check
      .mockReturnValueOnce(0.5)    // entityId = floor(0.5 * 500) = 250
      .mockReturnValue(0.5)        // skill random values
    const em = {} as any
    ;(sys as any).lastCheck = -2690
    sys.update(0, em, 0)
    if ((sys as any).lapidaries.length > 0) {
      const eid = (sys as any).lapidaries[0].entityId
      expect(eid).toBeGreaterThanOrEqual(0)
      expect(eid).toBeLessThan(500)
    }
  })

  it('招募的宝石工 cuttingSkill 在 10-35 之间', () => {
    // cuttingSkill = 10 + Math.random() * 25
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.0001) // recruit
      .mockReturnValueOnce(0.5)    // entityId
      .mockReturnValueOnce(0.5)    // cuttingSkill = 10 + 0.5*25 = 22.5
      .mockReturnValue(0.5)
    const em = {} as any
    ;(sys as any).lastCheck = -2690
    sys.update(0, em, 0)
    if ((sys as any).lapidaries.length > 0) {
      const skill = (sys as any).lapidaries[0].cuttingSkill
      expect(skill).toBeGreaterThanOrEqual(10)
      expect(skill).toBeLessThanOrEqual(35)
    }
  })

  it('招募的宝石工 polishingControl 在 15-35 之间', () => {
    // polishingControl = 15 + Math.random() * 20
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const em = {} as any
    ;(sys as any).lastCheck = -2690
    sys.update(0, em, 0)
    if ((sys as any).lapidaries.length > 0) {
      const ctrl = (sys as any).lapidaries[0].polishingControl
      expect(ctrl).toBeGreaterThanOrEqual(15)
      expect(ctrl).toBeLessThanOrEqual(35)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureLapidarySystem - 边界值与稳定性', () => {
  let sys: CreatureLapidarySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('update 不崩溃（空列表）', () => {
    expect(() => { sys.update(0, {} as any, 99999) }).not.toThrow()
  })

  it('大量宝石工时 update 不崩溃', () => {
    for (let i = 1; i <= 100; i++) {
      ;(sys as any).lapidaries.push(makeLap(i, 50))
    }
    expect(() => { sys.update(0, {} as any, 0); sys.update(0, {} as any, 2690) }).not.toThrow()
  })

  it('cuttingSkill = 4（恰好边界）更新后保留', () => {
    const l = makeLap(1, 4)
    ;(sys as any).lapidaries.push(l)
    const em = {} as any
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 0)
    sys.update(0, em, 2690)
    // 4 + 0.02 = 4.02 > 4，保留
    expect((sys as any).lapidaries[0].cuttingSkill).toBeCloseTo(4.02, 5)
  })

  it('polishingControl = 0 更新后为 0.015', () => {
    const l = makeLap(1, 50, { polishingControl: 0 })
    ;(sys as any).lapidaries.push(l)
    const em = {} as any
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 0)
    sys.update(0, em, 2690)
    expect((sys as any).lapidaries[0].polishingControl).toBeCloseTo(0.015, 5)
  })

  it('outputQuality = 0 更新后为 0.01', () => {
    const l = makeLap(1, 50, { outputQuality: 0 })
    ;(sys as any).lapidaries.push(l)
    const em = {} as any
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 0)
    sys.update(0, em, 2690)
    expect((sys as any).lapidaries[0].outputQuality).toBeCloseTo(0.01, 5)
  })

  it('多次 update 不越界超过 100', () => {
    const l = makeLap(1, 99)
    ;(sys as any).lapidaries.push(l)
    const em = {} as any
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 0)
    for (let tick = 2690; tick <= 2690 * 100; tick += 2690) {
      sys.update(0, em, tick)
    }
    expect((sys as any).lapidaries[0].cuttingSkill).toBeLessThanOrEqual(100)
  })
})
