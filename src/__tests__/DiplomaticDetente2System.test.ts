import { describe, it, expect } from 'vitest'
import { DiplomaticDetente2System, DetenteProcess2, DetentePhase2 } from '../systems/DiplomaticDetente2System'

const world = {} as any
const em = {} as any

function makeSys() { return new DiplomaticDetente2System() }

function inject(sys: any, items: Partial<DetenteProcess2>[]) {
  sys.processes.push(...items)
}

describe('基础数据结构', () => {
  it('初始processes为空', () => {
    expect((makeSys() as any).processes).toHaveLength(0)
  })
  it('注入后可查询', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, civIdA: 1, civIdB: 2, phase: 'signaling', tensionReduction: 10, tradeVolume: 0, culturalTies: 5, militaryTransparency: 0, duration: 0, tick: 0 }])
    expect(sys.processes).toHaveLength(1)
  })
  it('nextId初始为1', () => {
    expect((makeSys() as any).nextId).toBe(1)
  })
  it('lastCheck初始为0', () => {
    expect((makeSys() as any).lastCheck).toBe(0)
  })
  it('4种phase均可存储', () => {
    const phases: DetentePhase2[] = ['signaling', 'confidence_building', 'normalization', 'partnership']
    const sys = makeSys() as any
    phases.forEach((p, i) => inject(sys, [{ id: i+1, civIdA: i, civIdB: i+10, phase: p, tensionReduction: 10, tradeVolume: 0, culturalTies: 5, militaryTransparency: 0, duration: 0, tick: 0 }]))
    expect(sys.processes).toHaveLength(4)
  })
})

describe('CHECK_INTERVAL=2610节流', () => {
  it('tick=0不更新lastCheck', () => {
    const sys = makeSys()
    sys.update(1, world, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=2609不触发更新', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, civIdA: 1, civIdB: 2, phase: 'signaling', tensionReduction: 10, tradeVolume: 0, culturalTies: 5, militaryTransparency: 0, duration: 0, tick: 0 }])
    const before = sys.processes[0].duration
    sys.update(1, world, em, 2609)
    expect(sys.processes[0].duration).toBe(before)
  })
  it('tick=2610触发更新lastCheck', () => {
    const sys = makeSys()
    sys.update(1, world, em, 2610)
    expect((sys as any).lastCheck).toBe(2610)
  })
  it('tick=2610触发duration递增', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, civIdA: 1, civIdB: 2, phase: 'signaling', tensionReduction: 10, tradeVolume: 0, culturalTies: 5, militaryTransparency: 0, duration: 0, tick: 0 }])
    sys.update(1, world, em, 2610)
    expect(sys.processes[0].duration).toBe(1)
  })
  it('lastCheck更新后下一tick不再触发', () => {
    const sys = makeSys() as any
    sys.update(1, world, em, 2610)
    inject(sys, [{ id: 1, civIdA: 1, civIdB: 2, phase: 'signaling', tensionReduction: 10, tradeVolume: 0, culturalTies: 5, militaryTransparency: 0, duration: 0, tick: 0 }])
    const before = sys.processes[0].duration
    sys.update(1, world, em, 2611)
    expect(sys.processes[0].duration).toBe(before)
  })
})

describe('数值字段递增', () => {
  it('tensionReduction每次update+0.03', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, civIdA: 1, civIdB: 2, phase: 'signaling', tensionReduction: 10, tradeVolume: 0, culturalTies: 5, militaryTransparency: 0, duration: 0, tick: 0 }])
    sys.update(1, world, em, 2610)
    expect(sys.processes[0].tensionReduction).toBeCloseTo(10.03, 5)
  })
  it('tradeVolume每次update+0.02', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, civIdA: 1, civIdB: 2, phase: 'signaling', tensionReduction: 10, tradeVolume: 5, culturalTies: 5, militaryTransparency: 0, duration: 0, tick: 0 }])
    sys.update(1, world, em, 2610)
    expect(sys.processes[0].tradeVolume).toBeCloseTo(5.02, 5)
  })
  it('duration每次update+1', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, civIdA: 1, civIdB: 2, phase: 'signaling', tensionReduction: 10, tradeVolume: 0, culturalTies: 5, militaryTransparency: 0, duration: 7, tick: 0 }])
    sys.update(1, world, em, 2610)
    expect(sys.processes[0].duration).toBe(8)
  })
  it('tensionReduction上限100', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, civIdA: 1, civIdB: 2, phase: 'normalization', tensionReduction: 99.99, tradeVolume: 0, culturalTies: 5, militaryTransparency: 0, duration: 0, tick: 0 }])
    sys.update(1, world, em, 2610)
    expect(sys.processes[0].tensionReduction).toBeLessThanOrEqual(100)
  })
})

describe('phase转换逻辑', () => {
  it('signaling且tensionReduction>25转为confidence_building', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, civIdA: 1, civIdB: 2, phase: 'signaling', tensionReduction: 26, tradeVolume: 0, culturalTies: 5, militaryTransparency: 0, duration: 0, tick: 0 }])
    sys.lastCheck = 0
    sys.update(1, world, em, 2610)
    expect(sys.processes[0].phase).toBe('confidence_building')
  })
  it('confidence_building且tradeVolume>30转为normalization', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, civIdA: 1, civIdB: 2, phase: 'confidence_building', tensionReduction: 30, tradeVolume: 31, culturalTies: 5, militaryTransparency: 0, duration: 0, tick: 0 }])
    sys.lastCheck = 0
    sys.update(1, world, em, 2610)
    expect(sys.processes[0].phase).toBe('normalization')
  })
  it('normalization且tensionReduction>70转为partnership', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, civIdA: 1, civIdB: 2, phase: 'normalization', tensionReduction: 71, tradeVolume: 35, culturalTies: 5, militaryTransparency: 0, duration: 0, tick: 0 }])
    sys.lastCheck = 0
    sys.update(1, world, em, 2610)
    expect(sys.processes[0].phase).toBe('partnership')
  })
  it('signaling且tensionReduction<=25不转换', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, civIdA: 1, civIdB: 2, phase: 'signaling', tensionReduction: 10, tradeVolume: 0, culturalTies: 5, militaryTransparency: 0, duration: 0, tick: 0 }])
    sys.lastCheck = 0
    sys.update(1, world, em, 2610)
    expect(sys.processes[0].phase).toBe('signaling')
  })
})

describe('partnership+duration>=150时删除', () => {
  it('partnership且duration>=150时删除', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, civIdA: 1, civIdB: 2, phase: 'partnership', tensionReduction: 80, tradeVolume: 40, culturalTies: 5, militaryTransparency: 0, duration: 150, tick: 0 }])
    sys.lastCheck = 0
    sys.update(1, world, em, 2610)
    expect(sys.processes).toHaveLength(0)
  })
  it('partnership且duration<150时保留', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, civIdA: 1, civIdB: 2, phase: 'partnership', tensionReduction: 80, tradeVolume: 40, culturalTies: 5, militaryTransparency: 0, duration: 100, tick: 0 }])
    sys.lastCheck = 0
    sys.update(1, world, em, 2610)
    expect(sys.processes).toHaveLength(1)
  })
  it('非partnership即使duration>=150也不删除', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, civIdA: 1, civIdB: 2, phase: 'normalization', tensionReduction: 50, tradeVolume: 35, culturalTies: 5, militaryTransparency: 0, duration: 200, tick: 0 }])
    sys.lastCheck = 0
    sys.update(1, world, em, 2610)
    expect(sys.processes).toHaveLength(1)
  })
  it('混合场景：partnership>=150删除，其他保留', () => {
    const sys = makeSys() as any
    inject(sys, [
      { id: 1, civIdA: 1, civIdB: 2, phase: 'partnership', tensionReduction: 80, tradeVolume: 40, culturalTies: 5, militaryTransparency: 0, duration: 150, tick: 0 },
      { id: 2, civIdA: 3, civIdB: 4, phase: 'signaling', tensionReduction: 10, tradeVolume: 0, culturalTies: 5, militaryTransparency: 0, duration: 200, tick: 0 },
    ])
    sys.lastCheck = 0
    sys.update(1, world, em, 2610)
    expect(sys.processes).toHaveLength(1)
    expect(sys.processes[0].id).toBe(2)
  })
})

describe('MAX_PROCESSES=14上限', () => {
  it('processes.length < 14时spawn条件满足', () => {
    expect((makeSys() as any).processes.length).toBeLessThan(14)
  })
  it('注入14个后spawn不再添加', () => {
    const sys = makeSys() as any
    for (let i = 0; i < 14; i++) {
      inject(sys, [{ id: i+1, civIdA: i, civIdB: i+100, phase: 'signaling', tensionReduction: 10, tradeVolume: 0, culturalTies: 5, militaryTransparency: 0, duration: 0, tick: 999999 }])
    }
    const before = sys.processes.length
    for (let t = 2610; t <= 2610 * 100; t += 2610) sys.update(1, world, em, t)
    expect(sys.processes.length).toBeLessThanOrEqual(before)
  })
  it('多个process同时更新', () => {
    const sys = makeSys() as any
    for (let i = 0; i < 3; i++) {
      inject(sys, [{ id: i+1, civIdA: i, civIdB: i+10, phase: 'signaling', tensionReduction: 10, tradeVolume: 0, culturalTies: 5, militaryTransparency: 0, duration: 0, tick: 0 }])
    }
    sys.lastCheck = 0
    sys.update(1, world, em, 2610)
    sys.processes.forEach((p: any) => expect(p.duration).toBe(1))
  })
  it('注入14个全部duration递增', () => {
    const sys = makeSys() as any
    for (let i = 0; i < 14; i++) {
      inject(sys, [{ id: i+1, civIdA: i, civIdB: i+100, phase: 'signaling', tensionReduction: 10, tradeVolume: 0, culturalTies: 5, militaryTransparency: 0, duration: 0, tick: 999999 }])
    }
    sys.lastCheck = 0
    sys.update(1, world, em, 2610)
    sys.processes.forEach((p: any) => expect(p.duration).toBe(1))
  })
})
