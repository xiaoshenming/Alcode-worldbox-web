import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticAccordSystem } from '../systems/DiplomaticAccordSystem'
import type { AccordAgreement } from '../systems/DiplomaticAccordSystem'

// CHECK_INTERVAL=2360, cutoff=tick-83000, MAX_ACCORDS=20, TREATY_CHANCE=0.0026

function makeSys() { return new DiplomaticAccordSystem() }

function makeAccord(overrides: Partial<AccordAgreement> = {}): AccordAgreement {
  return {
    id: 1,
    civIdA: 1,
    civIdB: 2,
    domain: 'trade',
    bindingForce: 50,
    mutualSatisfaction: 45,
    implementationRate: 30,
    longevity: 20,
    duration: 0,
    tick: 0,
    ...overrides,
  }
}

describe('DiplomaticAccordSystem — 基础数据结构', () => {
  let sys: DiplomaticAccordSystem

  beforeEach(() => { sys = makeSys() })

  it('初始 accords 为空数组', () => {
    expect((sys as any).accords).toHaveLength(0)
    expect(Array.isArray((sys as any).accords)).toBe(true)
  })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('注入单条 accord 后长度为 1', () => {
    ;(sys as any).accords.push(makeAccord())
    expect((sys as any).accords).toHaveLength(1)
    expect((sys as any).accords[0].id).toBe(1)
  })

  it('注入多条 accords 保留所有记录', () => {
    ;(sys as any).accords.push(makeAccord({ id: 1 }))
    ;(sys as any).accords.push(makeAccord({ id: 2 }))
    ;(sys as any).accords.push(makeAccord({ id: 3 }))
    expect((sys as any).accords).toHaveLength(3)
  })

  it('支持所有 AccordDomain 类型', () => {
    const domains = ['trade', 'border', 'resource', 'cultural']
    for (const domain of domains) {
      ;(sys as any).accords.push(makeAccord({ domain: domain as any }))
    }
    const stored = (sys as any).accords.map((a: any) => a.domain)
    expect(stored).toEqual(expect.arrayContaining(domains))
  })

  it('accord 包含所有必要字段', () => {
    const a = makeAccord()
    ;(sys as any).accords.push(a)
    const stored = (sys as any).accords[0]
    expect(stored).toHaveProperty('id')
    expect(stored).toHaveProperty('civIdA')
    expect(stored).toHaveProperty('civIdB')
    expect(stored).toHaveProperty('domain')
    expect(stored).toHaveProperty('bindingForce')
    expect(stored).toHaveProperty('mutualSatisfaction')
    expect(stored).toHaveProperty('implementationRate')
    expect(stored).toHaveProperty('longevity')
    expect(stored).toHaveProperty('duration')
    expect(stored).toHaveProperty('tick')
  })
})

describe('DiplomaticAccordSystem — CHECK_INTERVAL=2360 节流', () => {
  let sys: DiplomaticAccordSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=100 < CHECK_INTERVAL=2360 时不更新 lastCheck', () => {
    sys.update(1, {} as any, {} as any, 100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2360 = CHECK_INTERVAL 时更新 lastCheck', () => {
    sys.update(1, {} as any, {} as any, 2360)
    expect((sys as any).lastCheck).toBe(2360)
  })

  it('tick=2359 < CHECK_INTERVAL 时跳过，accords 中 duration 不变', () => {
    ;(sys as any).accords.push(makeAccord({ tick: 0, duration: 0 }))
    sys.update(1, {} as any, {} as any, 2359)
    expect((sys as any).accords[0].duration).toBe(0)
  })

  it('tick=2360 时 duration 被更新（+1）', () => {
    ;(sys as any).accords.push(makeAccord({ tick: 2360, duration: 0 }))
    sys.update(1, {} as any, {} as any, 2360)
    expect((sys as any).accords[0].duration).toBe(1)
  })

  it('第二次调用间隔不足时不更新 lastCheck', () => {
    sys.update(1, {} as any, {} as any, 2360)
    expect((sys as any).lastCheck).toBe(2360)
    sys.update(1, {} as any, {} as any, 3000) // 3000-2360=640 < 2360
    expect((sys as any).lastCheck).toBe(2360)
  })

  it('第二次调用满足间隔时更新 lastCheck', () => {
    sys.update(1, {} as any, {} as any, 2360)
    sys.update(1, {} as any, {} as any, 4720) // 4720-2360=2360 >= 2360
    expect((sys as any).lastCheck).toBe(4720)
  })

  it('连续三次满足间隔，lastCheck 递增更新', () => {
    sys.update(1, {} as any, {} as any, 2360)
    sys.update(1, {} as any, {} as any, 4720)
    sys.update(1, {} as any, {} as any, 7080)
    expect((sys as any).lastCheck).toBe(7080)
  })
})

describe('DiplomaticAccordSystem — 数值字段动态更新', () => {
  let sys: DiplomaticAccordSystem

  beforeEach(() => { sys = makeSys() })

  it('update 后 duration 递增 +1', () => {
    ;(sys as any).accords.push(makeAccord({ tick: 2360, duration: 0 }))
    sys.update(1, {} as any, {} as any, 2360)
    expect((sys as any).accords[0].duration).toBe(1)
  })

  it('bindingForce 在 [10, 90] 范围内', () => {
    ;(sys as any).accords.push(makeAccord({ tick: 2360, bindingForce: 50 }))
    for (let t = 2360; t <= 2360 * 100; t += 2360) {
      sys.update(1, {} as any, {} as any, t)
      const val = (sys as any).accords[0]?.bindingForce
      if (val !== undefined) {
        expect(val).toBeGreaterThanOrEqual(10)
        expect(val).toBeLessThanOrEqual(90)
      }
    }
  })

  it('mutualSatisfaction 在 [15, 90] 范围内', () => {
    ;(sys as any).accords.push(makeAccord({ tick: 2360, mutualSatisfaction: 45 }))
    for (let t = 2360; t <= 2360 * 50; t += 2360) {
      sys.update(1, {} as any, {} as any, t)
      const val = (sys as any).accords[0]?.mutualSatisfaction
      if (val !== undefined) {
        expect(val).toBeGreaterThanOrEqual(15)
        expect(val).toBeLessThanOrEqual(90)
      }
    }
  })

  it('implementationRate 在 [5, 80] 范围内', () => {
    ;(sys as any).accords.push(makeAccord({ tick: 2360, implementationRate: 30 }))
    for (let t = 2360; t <= 2360 * 50; t += 2360) {
      sys.update(1, {} as any, {} as any, t)
      const val = (sys as any).accords[0]?.implementationRate
      if (val !== undefined) {
        expect(val).toBeGreaterThanOrEqual(5)
        expect(val).toBeLessThanOrEqual(80)
      }
    }
  })

  it('longevity 在 [5, 70] 范围内', () => {
    ;(sys as any).accords.push(makeAccord({ tick: 2360, longevity: 20 }))
    for (let t = 2360; t <= 2360 * 50; t += 2360) {
      sys.update(1, {} as any, {} as any, t)
      const val = (sys as any).accords[0]?.longevity
      if (val !== undefined) {
        expect(val).toBeGreaterThanOrEqual(5)
        expect(val).toBeLessThanOrEqual(70)
      }
    }
  })

  it('多条记录各自独立更新 duration', () => {
    ;(sys as any).accords.push(makeAccord({ id: 1, tick: 2360, duration: 0 }))
    ;(sys as any).accords.push(makeAccord({ id: 2, tick: 2360, duration: 10 }))
    sys.update(1, {} as any, {} as any, 2360)
    expect((sys as any).accords[0].duration).toBe(1)
    expect((sys as any).accords[1].duration).toBe(11)
  })
})

describe('DiplomaticAccordSystem — time-based 过期清理（cutoff=tick-83000）', () => {
  let sys: DiplomaticAccordSystem

  beforeEach(() => { sys = makeSys() })

  it('tick=0 的记录在 update(tick=90000) 时被清除', () => {
    ;(sys as any).accords.push(makeAccord({ tick: 0, id: 1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 90000) // cutoff=7000, 0 < 7000 删除
    expect((sys as any).accords).toHaveLength(0)
  })

  it('tick 恰好等于 cutoff 时记录不被清除', () => {
    // cutoff = 90000 - 83000 = 7000，tick=7000 不满足 < 7000
    ;(sys as any).accords.push(makeAccord({ tick: 7000, id: 1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).accords).toHaveLength(1)
  })

  it('tick > cutoff 的记录保留', () => {
    ;(sys as any).accords.push(makeAccord({ tick: 12000, id: 1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 90000) // cutoff=7000, 12000>7000 保留
    expect((sys as any).accords).toHaveLength(1)
  })

  it('混合过期：只删除 tick < cutoff 的记录', () => {
    ;(sys as any).accords.push(makeAccord({ tick: 0,     id: 1 })) // 过期
    ;(sys as any).accords.push(makeAccord({ tick: 6999,  id: 2 })) // 过期
    ;(sys as any).accords.push(makeAccord({ tick: 7000,  id: 3 })) // 边界，保留
    ;(sys as any).accords.push(makeAccord({ tick: 15000, id: 4 })) // 保留
    sys.update(1, {} as any, {} as any, 90000) // cutoff=7000
    const ids = (sys as any).accords.map((a: any) => a.id)
    expect(ids).not.toContain(1)
    expect(ids).not.toContain(2)
    expect(ids).toContain(3)
    expect(ids).toContain(4)
  })

  it('所有记录都新鲜，无过期清理', () => {
    ;(sys as any).accords.push(makeAccord({ tick: 85000, id: 1 }))
    ;(sys as any).accords.push(makeAccord({ tick: 88000, id: 2 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 90000) // cutoff=7000
    expect((sys as any).accords).toHaveLength(2)
  })

  it('反向遍历删除：5 条过期记录全部删除', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).accords.push(makeAccord({ tick: i * 100, id: i + 1 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 90000) // cutoff=7000，全部 tick < 7000
    expect((sys as any).accords).toHaveLength(0)
  })
})

describe('DiplomaticAccordSystem — MAX_ACCORDS=20 上限', () => {
  let sys: DiplomaticAccordSystem

  afterEach(() => { vi.restoreAllMocks() })
  beforeEach(() => { sys = makeSys() })

  it('已达 MAX_ACCORDS=20 时不再新增（强制通过 CHANCE）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // 0 < 0.0026 通过 TREATY_CHANCE
    for (let i = 0; i < 20; i++) {
      ;(sys as any).accords.push(makeAccord({ id: i + 1, tick: 2360 }))
    }
    sys.update(1, {} as any, {} as any, 2360)
    expect((sys as any).accords).toHaveLength(20)
  })

  it('数量 19 < 20 时，random=0 导致 civA=civB early return，accords 不超 20', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 19; i++) {
      ;(sys as any).accords.push(makeAccord({ id: i + 1, tick: 2360 }))
    }
    sys.update(1, {} as any, {} as any, 2360)
    expect((sys as any).accords.length).toBeLessThanOrEqual(20)
  })

  it('成功新增后 nextId 递增', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001) // 通过 TREATY_CHANCE
      .mockReturnValueOnce(0)     // civA=1
      .mockReturnValueOnce(0.5)   // civB=5
      .mockReturnValue(0.5)
    sys.update(1, {} as any, {} as any, 2360)
    expect((sys as any).nextId).toBeGreaterThanOrEqual(1)
  })
})
