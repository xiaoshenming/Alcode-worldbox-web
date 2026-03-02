import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureTinkerSystem } from '../systems/CreatureTinkerSystem'
import type { Tinker } from '../systems/CreatureTinkerSystem'

const CHECK_INTERVAL = 2610

let nextId = 1
function makeSys(): CreatureTinkerSystem { return new CreatureTinkerSystem() }
function makeTinker(entityId: number, overrides: Partial<Tinker> = {}): Tinker {
  return { id: nextId++, entityId, metalRepair: 70, solderingSkill: 65, resourcefulness: 80, outputQuality: 75, tick: 0, ...overrides }
}
function makeEm(eids: number[] = []) {
  return { getEntitiesWithComponents: () => eids, getComponent: () => null } as any
}

describe('CreatureTinkerSystem.getTinkers', () => {
  let sys: CreatureTinkerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无修锅匠', () => { expect((sys as any).tinkers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).tinkers.push(makeTinker(1))
    expect((sys as any).tinkers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).tinkers.push(makeTinker(1))
    expect((sys as any).tinkers).toBe((sys as any).tinkers)
  })
  it('字段正确', () => {
    ;(sys as any).tinkers.push(makeTinker(2))
    const t = (sys as any).tinkers[0]
    expect(t.metalRepair).toBe(70)
    expect(t.outputQuality).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).tinkers.push(makeTinker(1))
    ;(sys as any).tinkers.push(makeTinker(2))
    expect((sys as any).tinkers).toHaveLength(2)
  })
})

describe('CreatureTinkerSystem CHECK_INTERVAL 节流', () => {
  let sys: CreatureTinkerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick不足CHECK_INTERVAL时不执行技能增长', () => {
    ;(sys as any).tinkers.push(makeTinker(1, { metalRepair: 50, tick: 0 }))
    const em = makeEm()
    // lastCheck=0, tick=100 => 100-0=100 < 2610，应跳过
    sys.update(1, em, 100)
    expect((sys as any).tinkers[0].metalRepair).toBe(50)
  })

  it('tick恰好等于CHECK_INTERVAL时不触发（严格小于）', () => {
    ;(sys as any).tinkers.push(makeTinker(1, { metalRepair: 50, tick: 0 }))
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).tinkers[0].metalRepair).toBe(50)
  })

  it('tick超过CHECK_INTERVAL后执行技能增长', () => {
    ;(sys as any).tinkers.push(makeTinker(1, { metalRepair: 50, tick: 0 }))
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinkers[0].metalRepair).toBeCloseTo(50.02)
  })

  it('lastCheck在首次update后更新为当前tick', () => {
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('连续两次update，第二次tick不足间隔则跳过', () => {
    ;(sys as any).tinkers.push(makeTinker(1, { metalRepair: 50, tick: 0 }))
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)           // 第一次执行
    const afterFirst = (sys as any).tinkers[0].metalRepair
    sys.update(1, em, CHECK_INTERVAL + 100)     // 距上次不足间隔
    expect((sys as any).tinkers[0].metalRepair).toBe(afterFirst)
  })
})

describe('CreatureTinkerSystem 技能增长', () => {
  let sys: CreatureTinkerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('每次update metalRepair +0.02', () => {
    ;(sys as any).tinkers.push(makeTinker(1, { metalRepair: 50 }))
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinkers[0].metalRepair).toBeCloseTo(50.02)
  })

  it('每次update resourcefulness +0.015', () => {
    ;(sys as any).tinkers.push(makeTinker(1, { resourcefulness: 50 }))
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinkers[0].resourcefulness).toBeCloseTo(50.015)
  })

  it('每次update outputQuality +0.01', () => {
    ;(sys as any).tinkers.push(makeTinker(1, { outputQuality: 50 }))
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinkers[0].outputQuality).toBeCloseTo(50.01)
  })

  it('metalRepair上限100，不超过', () => {
    ;(sys as any).tinkers.push(makeTinker(1, { metalRepair: 99.99 }))
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinkers[0].metalRepair).toBe(100)
  })

  it('resourcefulness上限100，不超过', () => {
    ;(sys as any).tinkers.push(makeTinker(1, { resourcefulness: 99.99 }))
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinkers[0].resourcefulness).toBe(100)
  })

  it('outputQuality上限100，不超过', () => {
    ;(sys as any).tinkers.push(makeTinker(1, { outputQuality: 99.99 }))
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinkers[0].outputQuality).toBe(100)
  })

  it('多个修锅匠同时增长', () => {
    ;(sys as any).tinkers.push(makeTinker(1, { metalRepair: 10 }))
    ;(sys as any).tinkers.push(makeTinker(2, { metalRepair: 20 }))
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinkers[0].metalRepair).toBeCloseTo(10.02)
    expect((sys as any).tinkers[1].metalRepair).toBeCloseTo(20.02)
  })
})

describe('CreatureTinkerSystem cleanup（metalRepair<=4）', () => {
  let sys: CreatureTinkerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('metalRepair=4时，增长后=4.02，不被清除（增长先于清理）', () => {
    // 系统先执行技能增长（+0.02），再执行清理（<=4）
    // 4 + 0.02 = 4.02 > 4，不被清除
    ;(sys as any).tinkers.push(makeTinker(1, { metalRepair: 4 }))
    const em = makeEm()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinkers).toHaveLength(1)
  })

  it('metalRepair=3时被清除', () => {
    ;(sys as any).tinkers.push(makeTinker(1, { metalRepair: 3 }))
    const em = makeEm()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinkers).toHaveLength(0)
  })

  it('metalRepair=4.02（增长后恰好超过4）不被清除', () => {
    // 先设置metalRepair=3.98，update后变为4.00，但4<=4仍被清除
    // 设4.01，update后4.03>4，不清除
    ;(sys as any).tinkers.push(makeTinker(1, { metalRepair: 4.01 }))
    const em = makeEm()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    // 4.01+0.02=4.03 > 4，不清除
    expect((sys as any).tinkers).toHaveLength(1)
  })

  it('metalRepair=3.98，增长后=4.00，仍被清除（<=4）', () => {
    ;(sys as any).tinkers.push(makeTinker(1, { metalRepair: 3.98 }))
    const em = makeEm()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    // 3.98+0.02=4.00 <= 4，被清除
    expect((sys as any).tinkers).toHaveLength(0)
  })

  it('低metalRepair的被清除，高的保留', () => {
    ;(sys as any).tinkers.push(makeTinker(1, { metalRepair: 2 }))
    ;(sys as any).tinkers.push(makeTinker(2, { metalRepair: 50 }))
    const em = makeEm()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinkers).toHaveLength(1)
    expect((sys as any).tinkers[0].entityId).toBe(2)
  })
})
