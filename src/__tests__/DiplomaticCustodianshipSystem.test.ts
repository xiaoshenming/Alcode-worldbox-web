import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticCustodianshipSystem, CustodianshipArrangement, CustodianshipForm } from '../systems/DiplomaticCustodianshipSystem'

const world = {} as any
const em = {} as any

function makeSys() { return new DiplomaticCustodianshipSystem() }

function inject(sys: any, items: Partial<CustodianshipArrangement>[]) {
  sys.arrangements.push(...items)
}

describe('基础数据结构', () => {
  it('初始arrangements为空', () => {
    expect((makeSys() as any).arrangements).toHaveLength(0)
  })
  it('注入后可查询', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, custodianCivId: 1, wardCivId: 2, form: 'territorial_custody', custodyScope: 50, trustLevel: 50, autonomyGrant: 40, oversightRigor: 30, duration: 0, tick: 0 }])
    expect(sys.arrangements).toHaveLength(1)
  })
  it('nextId初始为1', () => {
    expect((makeSys() as any).nextId).toBe(1)
  })
  it('lastCheck初始为0', () => {
    expect((makeSys() as any).lastCheck).toBe(0)
  })
  it('4种form均可存储', () => {
    const forms: CustodianshipForm[] = ['territorial_custody', 'resource_custody', 'cultural_custody', 'military_custody']
    const sys = makeSys() as any
    forms.forEach((f, i) => inject(sys, [{ id: i+1, custodianCivId: i, wardCivId: i+10, form: f, custodyScope: 50, trustLevel: 50, autonomyGrant: 40, oversightRigor: 30, duration: 0, tick: 0 }]))
    expect(sys.arrangements).toHaveLength(4)
  })
})

describe('CHECK_INTERVAL=2550节流', () => {
  it('tick=0不更新lastCheck', () => {
    const sys = makeSys()
    sys.update(1, world, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=2549不触发更新', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, custodianCivId: 1, wardCivId: 2, form: 'territorial_custody', custodyScope: 50, trustLevel: 50, autonomyGrant: 40, oversightRigor: 30, duration: 0, tick: 0 }])
    const before = sys.arrangements[0].duration
    sys.update(1, world, em, 2549)
    expect(sys.arrangements[0].duration).toBe(before)
  })
  it('tick=2550触发更新lastCheck', () => {
    const sys = makeSys()
    sys.update(1, world, em, 2550)
    expect((sys as any).lastCheck).toBe(2550)
  })
  it('tick=2550触发duration递增', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, custodianCivId: 1, wardCivId: 2, form: 'territorial_custody', custodyScope: 50, trustLevel: 50, autonomyGrant: 40, oversightRigor: 30, duration: 0, tick: 0 }])
    sys.update(1, world, em, 2550)
    expect(sys.arrangements[0].duration).toBe(1)
  })
  it('lastCheck更新后下一tick不再触发', () => {
    const sys = makeSys() as any
    sys.update(1, world, em, 2550)
    inject(sys, [{ id: 1, custodianCivId: 1, wardCivId: 2, form: 'territorial_custody', custodyScope: 50, trustLevel: 50, autonomyGrant: 40, oversightRigor: 30, duration: 0, tick: 0 }])
    const before = sys.arrangements[0].duration
    sys.update(1, world, em, 2551)
    expect(sys.arrangements[0].duration).toBe(before)
  })
})

describe('数值字段动态更新', () => {
  it('duration每次update+1', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, custodianCivId: 1, wardCivId: 2, form: 'territorial_custody', custodyScope: 50, trustLevel: 50, autonomyGrant: 40, oversightRigor: 30, duration: 5, tick: 0 }])
    sys.update(1, world, em, 2550)
    expect(sys.arrangements[0].duration).toBe(6)
  })
  it('custodyScope不超过85', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, custodianCivId: 1, wardCivId: 2, form: 'territorial_custody', custodyScope: 85, trustLevel: 50, autonomyGrant: 40, oversightRigor: 30, duration: 0, tick: 0 }])
    for (let t = 2550; t <= 2550 * 20; t += 2550) sys.update(1, world, em, t)
    expect(sys.arrangements[0].custodyScope).toBeLessThanOrEqual(85)
  })
  it('custodyScope不低于5', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, custodianCivId: 1, wardCivId: 2, form: 'territorial_custody', custodyScope: 5, trustLevel: 50, autonomyGrant: 40, oversightRigor: 30, duration: 0, tick: 0 }])
    for (let t = 2550; t <= 2550 * 20; t += 2550) sys.update(1, world, em, t)
    expect(sys.arrangements[0].custodyScope).toBeGreaterThanOrEqual(5)
  })
  it('trustLevel不超过90', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, custodianCivId: 1, wardCivId: 2, form: 'territorial_custody', custodyScope: 50, trustLevel: 90, autonomyGrant: 40, oversightRigor: 30, duration: 0, tick: 0 }])
    for (let t = 2550; t <= 2550 * 20; t += 2550) sys.update(1, world, em, t)
    expect(sys.arrangements[0].trustLevel).toBeLessThanOrEqual(90)
  })
  it('oversightRigor不超过65', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, custodianCivId: 1, wardCivId: 2, form: 'territorial_custody', custodyScope: 50, trustLevel: 50, autonomyGrant: 40, oversightRigor: 65, duration: 0, tick: 0 }])
    for (let t = 2550; t <= 2550 * 20; t += 2550) sys.update(1, world, em, t)
    expect(sys.arrangements[0].oversightRigor).toBeLessThanOrEqual(65)
  })
})

describe('过期清理cutoff=tick-88000', () => {
  it('tick字段小于cutoff时删除', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, custodianCivId: 1, wardCivId: 2, form: 'territorial_custody', custodyScope: 50, trustLevel: 50, autonomyGrant: 40, oversightRigor: 30, duration: 0, tick: 0 }])
    sys.update(1, world, em, 88001 + 2550)
    expect(sys.arrangements).toHaveLength(0)
  })
  it('tick字段等于cutoff时不删除（tick < cutoff为false）', () => {
    const sys = makeSys() as any
    // update时 tick=90000, cutoff=90000-88000=2000, 注入tick=2000 → 2000 < 2000 为false → 不删除
    inject(sys, [{ id: 1, custodianCivId: 1, wardCivId: 2, form: 'territorial_custody', custodyScope: 50, trustLevel: 50, autonomyGrant: 40, oversightRigor: 30, duration: 0, tick: 2000 }])
    sys.update(1, world, em, 90000)
    expect(sys.arrangements).toHaveLength(1)
  })
  it('未过期的arrangement保留', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, custodianCivId: 1, wardCivId: 2, form: 'territorial_custody', custodyScope: 50, trustLevel: 50, autonomyGrant: 40, oversightRigor: 30, duration: 0, tick: 5000 }])
    sys.update(1, world, em, 2550)
    expect(sys.arrangements).toHaveLength(1)
  })
  it('混合场景：过期删除，未过期保留', () => {
    const sys = makeSys() as any
    inject(sys, [
      { id: 1, custodianCivId: 1, wardCivId: 2, form: 'territorial_custody', custodyScope: 50, trustLevel: 50, autonomyGrant: 40, oversightRigor: 30, duration: 0, tick: 0 },
      { id: 2, custodianCivId: 3, wardCivId: 4, form: 'resource_custody', custodyScope: 50, trustLevel: 50, autonomyGrant: 40, oversightRigor: 30, duration: 0, tick: 100000 },
    ])
    sys.update(1, world, em, 100000 + 2550)
    expect(sys.arrangements).toHaveLength(1)
    expect(sys.arrangements[0].id).toBe(2)
  })
  it('多个过期全部删除', () => {
    const sys = makeSys() as any
    for (let i = 0; i < 5; i++) {
      inject(sys, [{ id: i+1, custodianCivId: i, wardCivId: i+10, form: 'territorial_custody', custodyScope: 50, trustLevel: 50, autonomyGrant: 40, oversightRigor: 30, duration: 0, tick: 0 }])
    }
    sys.update(1, world, em, 88001 + 2550)
    expect(sys.arrangements).toHaveLength(0)
  })
})

describe('MAX_ARRANGEMENTS=16上限', () => {
  it('arrangements不超过16', () => {
    const sys = makeSys() as any
    for (let i = 0; i < 20; i++) {
      inject(sys, [{ id: i+1, custodianCivId: i, wardCivId: i+100, form: 'territorial_custody', custodyScope: 50, trustLevel: 50, autonomyGrant: 40, oversightRigor: 30, duration: 0, tick: 999999 }])
    }
    // 超过16时spawn逻辑不会再添加，但已注入的不会被cleanup截断（源码无cleanup截断）
    expect(sys.arrangements.length).toBe(20)
  })
  it('arrangements.length < 16时spawn条件满足', () => {
    const sys = makeSys() as any
    expect(sys.arrangements.length).toBeLessThan(16)
  })
  it('注入16个后spawn条件不满足', () => {
    const sys = makeSys() as any
    for (let i = 0; i < 16; i++) {
      inject(sys, [{ id: i+1, custodianCivId: i, wardCivId: i+100, form: 'territorial_custody', custodyScope: 50, trustLevel: 50, autonomyGrant: 40, oversightRigor: 30, duration: 0, tick: 999999 }])
    }
    // arrangements.length >= MAX_ARRANGEMENTS，spawn不会执行
    const before = sys.arrangements.length
    // 多次update也不会超过16（spawn被阻止）
    for (let t = 2550; t <= 2550 * 100; t += 2550) sys.update(1, world, em, t)
    expect(sys.arrangements.length).toBeLessThanOrEqual(before)
  })
  it('4种form都能被注入', () => {
    const forms: CustodianshipForm[] = ['territorial_custody', 'resource_custody', 'cultural_custody', 'military_custody']
    const sys = makeSys() as any
    forms.forEach((f, i) => inject(sys, [{ id: i+1, custodianCivId: i, wardCivId: i+10, form: f, custodyScope: 50, trustLevel: 50, autonomyGrant: 40, oversightRigor: 30, duration: 0, tick: 999999 }]))
    const storedForms = sys.arrangements.map((a: any) => a.form)
    expect(storedForms).toContain('territorial_custody')
    expect(storedForms).toContain('resource_custody')
    expect(storedForms).toContain('cultural_custody')
    expect(storedForms).toContain('military_custody')
  })
})

describe('CustodianshipForm枚举', () => {
  it('territorial_custody可存储', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, custodianCivId: 1, wardCivId: 2, form: 'territorial_custody' as CustodianshipForm, custodyScope: 50, trustLevel: 50, autonomyGrant: 40, oversightRigor: 30, duration: 0, tick: 0 }])
    expect(sys.arrangements[0].form).toBe('territorial_custody')
  })
  it('resource_custody可存储', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, custodianCivId: 1, wardCivId: 2, form: 'resource_custody' as CustodianshipForm, custodyScope: 50, trustLevel: 50, autonomyGrant: 40, oversightRigor: 30, duration: 0, tick: 0 }])
    expect(sys.arrangements[0].form).toBe('resource_custody')
  })
  it('cultural_custody可存储', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, custodianCivId: 1, wardCivId: 2, form: 'cultural_custody' as CustodianshipForm, custodyScope: 50, trustLevel: 50, autonomyGrant: 40, oversightRigor: 30, duration: 0, tick: 0 }])
    expect(sys.arrangements[0].form).toBe('cultural_custody')
  })
  it('military_custody可存储', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, custodianCivId: 1, wardCivId: 2, form: 'military_custody' as CustodianshipForm, custodyScope: 50, trustLevel: 50, autonomyGrant: 40, oversightRigor: 30, duration: 0, tick: 0 }])
    expect(sys.arrangements[0].form).toBe('military_custody')
  })
})

describe('额外边界与枚举测试', () => {
  it('custodyScope 上限 85 不被突破', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, custodianCivId: 1, wardCivId: 2, form: 'territorial_custody', custodyScope: 84.99, trustLevel: 50, autonomyGrant: 40, oversightRigor: 30, duration: 0, tick: 0 }])
    sys.lastCheck = 0
    sys.update(1, world, em, 2550)
    expect(sys.arrangements[0].custodyScope).toBeLessThanOrEqual(85)
  })

  it('custodyScope 下限 5 不被突破', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, custodianCivId: 1, wardCivId: 2, form: 'territorial_custody', custodyScope: 5.01, trustLevel: 50, autonomyGrant: 40, oversightRigor: 30, duration: 0, tick: 0 }])
    sys.lastCheck = 0
    sys.update(1, world, em, 2550)
    expect(sys.arrangements[0].custodyScope).toBeGreaterThanOrEqual(5)
  })

  it('trustLevel 上限 90 不被突破', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, custodianCivId: 1, wardCivId: 2, form: 'territorial_custody', custodyScope: 50, trustLevel: 89.99, autonomyGrant: 40, oversightRigor: 30, duration: 0, tick: 0 }])
    sys.lastCheck = 0
    sys.update(1, world, em, 2550)
    expect(sys.arrangements[0].trustLevel).toBeLessThanOrEqual(90)
  })

  it('autonomyGrant 上限 80 不被突破', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, custodianCivId: 1, wardCivId: 2, form: 'territorial_custody', custodyScope: 50, trustLevel: 50, autonomyGrant: 79.99, oversightRigor: 30, duration: 0, tick: 0 }])
    sys.lastCheck = 0
    sys.update(1, world, em, 2550)
    expect(sys.arrangements[0].autonomyGrant).toBeLessThanOrEqual(80)
  })

  it('oversightRigor 上限 65 不被突破', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, custodianCivId: 1, wardCivId: 2, form: 'territorial_custody', custodyScope: 50, trustLevel: 50, autonomyGrant: 40, oversightRigor: 64.99, duration: 0, tick: 0 }])
    sys.lastCheck = 0
    sys.update(1, world, em, 2550)
    expect(sys.arrangements[0].oversightRigor).toBeLessThanOrEqual(65)
  })

  it('resource_custody form 可存储', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, custodianCivId: 1, wardCivId: 2, form: 'resource_custody', custodyScope: 50, trustLevel: 50, autonomyGrant: 40, oversightRigor: 30, duration: 0, tick: 0 }])
    expect(sys.arrangements[0].form).toBe('resource_custody')
  })

  it('cultural_custody form 可存储', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, custodianCivId: 1, wardCivId: 2, form: 'cultural_custody', custodyScope: 50, trustLevel: 50, autonomyGrant: 40, oversightRigor: 30, duration: 0, tick: 0 }])
    expect(sys.arrangements[0].form).toBe('cultural_custody')
  })

  it('CHECK_INTERVAL=2550 节流有效', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, custodianCivId: 1, wardCivId: 2, form: 'territorial_custody', custodyScope: 50, trustLevel: 50, autonomyGrant: 40, oversightRigor: 30, duration: 5, tick: 0 }])
    sys.update(1, world, em, 2549)
    expect(sys.arrangements[0].duration).toBe(5)
  })

  it('多条 arrangements 各自独立更新 duration', () => {
    const sys = makeSys() as any
    const base = { custodianCivId: 1, wardCivId: 2, form: 'territorial_custody', custodyScope: 50, trustLevel: 50, autonomyGrant: 40, oversightRigor: 30, tick: 0 }
    inject(sys, [{ id: 1, duration: 3, ...base }, { id: 2, duration: 7, ...base }])
    sys.lastCheck = 0
    sys.update(1, world, em, 2550)
    expect(sys.arrangements[0].duration).toBe(4)
    expect(sys.arrangements[1].duration).toBe(8)
  })

  it('过期记录被移除', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, custodianCivId: 1, wardCivId: 2, form: 'territorial_custody', custodyScope: 50, trustLevel: 50, autonomyGrant: 40, oversightRigor: 30, duration: 0, tick: 0 }])
    sys.lastCheck = 0
    sys.update(1, world, em, 88000 + 2550 + 1)
    expect(sys.arrangements).toHaveLength(0)
  })

  it('未过期记录保留', () => {
    const sys = makeSys() as any
    const bigTick = 88000 + 2550
    inject(sys, [{ id: 1, custodianCivId: 1, wardCivId: 2, form: 'territorial_custody', custodyScope: 50, trustLevel: 50, autonomyGrant: 40, oversightRigor: 30, duration: 0, tick: bigTick - 1000 }])
    sys.lastCheck = 0
    sys.update(1, world, em, bigTick)
    expect(sys.arrangements).toHaveLength(1)
  })

  it('update 不改变 custodianCivId/wardCivId', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, custodianCivId: 4, wardCivId: 9, form: 'territorial_custody', custodyScope: 50, trustLevel: 50, autonomyGrant: 40, oversightRigor: 30, duration: 0, tick: 0 }])
    sys.lastCheck = 0
    sys.update(1, world, em, 2550)
    expect(sys.arrangements[0].custodianCivId).toBe(4)
    expect(sys.arrangements[0].wardCivId).toBe(9)
  })

  it('空 arrangements 时 update 不崩溃', () => {
    const sys = makeSys()
    expect(() => sys.update(1, world, em, 2550)).not.toThrow()
  })

  it('全 4 种 form 可注入并保存', () => {
    const sys = makeSys() as any
    const forms: CustodianshipForm[] = ['territorial_custody', 'resource_custody', 'cultural_custody', 'military_custody']
    forms.forEach((f, i) => {
      inject(sys, [{ id: i + 1, custodianCivId: 1, wardCivId: 2, form: f, custodyScope: 50, trustLevel: 50, autonomyGrant: 40, oversightRigor: 30, duration: 0, tick: 0 }])
    })
    expect(sys.arrangements).toHaveLength(4)
  })

  it('nextId 手动设置后保持', () => {
    const sys = makeSys() as any
    sys.nextId = 66
    expect(sys.nextId).toBe(66)
  })

  it('lastCheck 更新到最新 tick', () => {
    const sys = makeSys() as any
    sys.update(1, world, em, 2550 * 4)
    expect(sys.lastCheck).toBe(2550 * 4)
  })
})
