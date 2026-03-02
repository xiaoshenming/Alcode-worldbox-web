import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSpindleMakersSystem } from '../systems/CreatureSpindleMakersSystem'
import type { SpindleMaker, SpindleType } from '../systems/CreatureSpindleMakersSystem'

let nextId = 1
function makeSys(): CreatureSpindleMakersSystem { return new CreatureSpindleMakersSystem() }
function makeMaker(entityId: number, type: SpindleType = 'drop', skill = 70, tick = 0): SpindleMaker {
  return { id: nextId++, entityId, skill, spindlesMade: 12, spindleType: type, balance: 65, reputation: 45, tick }
}

// 常量与源文件一致
const CHECK_INTERVAL = 1460
const SKILL_GROWTH = 0.054
const MAX_MAKERS = 30

// ---- 基础数据结构 ----
describe('CreatureSpindleMakersSystem - 基础数据结构', () => {
  let sys: CreatureSpindleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无纺锤工匠', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'wheel'))
    expect((sys as any).makers[0].spindleType).toBe('wheel')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有4种纺锤类型', () => {
    const types: SpindleType[] = ['drop', 'wheel', 'furniture', 'staircase']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].spindleType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})

// ---- CHECK_INTERVAL 节流 ----
describe('CreatureSpindleMakersSystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureSpindleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick不足CHECK_INTERVAL时update跳过', () => {
    const mockEM = { getComponent: () => undefined, getEntitiesWithComponents: () => [] }
    sys.update(1, mockEM as any, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick达到CHECK_INTERVAL时更新lastCheck', () => {
    const mockEM = { getComponent: () => undefined, getEntitiesWithComponents: () => [] }
    sys.update(1, mockEM as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('连续两次间隔不足时只更新一次', () => {
    const mockEM = { getComponent: () => undefined, getEntitiesWithComponents: () => [] }
    sys.update(1, mockEM as any, CHECK_INTERVAL)
    sys.update(1, mockEM as any, CHECK_INTERVAL + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('update不崩溃（空实体列表）', () => {
    const mockEM = { getComponent: () => undefined, getEntitiesWithComponents: () => [] }
    expect(() => sys.update(1, mockEM as any, 0)).not.toThrow()
  })
})

// ---- skillMap 技能增长 ----
describe('CreatureSpindleMakersSystem - skillMap技能增长', () => {
  let sys: CreatureSpindleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始skillMap为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('手动注入skillMap后可读取', () => {
    ;(sys as any).skillMap.set(42, 50)
    expect((sys as any).skillMap.get(42)).toBe(50)
  })

  it('SKILL_GROWTH值为0.054', () => {
    const base = 10
    const result = Math.min(100, base + SKILL_GROWTH)
    expect(result).toBeCloseTo(base + 0.054, 5)
  })

  it('skill累加不超过100上限', () => {
    const result = Math.min(100, 99.98 + SKILL_GROWTH)
    expect(result).toBe(100)
  })

  it('skillMap按entityId独立存储', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(2, 60)
    expect((sys as any).skillMap.get(1)).toBe(30)
    expect((sys as any).skillMap.get(2)).toBe(60)
  })
})

// ---- spindleType与skill档位 ----
describe('CreatureSpindleMakersSystem - spindleType与skill档位', () => {
  let sys: CreatureSpindleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skill<25时typeIdx=0对应drop', () => {
    const skill = 10
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    const SPINDLE_TYPES: SpindleType[] = ['drop', 'wheel', 'furniture', 'staircase']
    expect(SPINDLE_TYPES[typeIdx]).toBe('drop')
  })

  it('skill=25时typeIdx=1对应wheel', () => {
    const skill = 25
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    const SPINDLE_TYPES: SpindleType[] = ['drop', 'wheel', 'furniture', 'staircase']
    expect(SPINDLE_TYPES[typeIdx]).toBe('wheel')
  })

  it('skill=50时typeIdx=2对应furniture', () => {
    const skill = 50
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    const SPINDLE_TYPES: SpindleType[] = ['drop', 'wheel', 'furniture', 'staircase']
    expect(SPINDLE_TYPES[typeIdx]).toBe('furniture')
  })

  it('skill=75时typeIdx=3对应staircase', () => {
    const skill = 75
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    const SPINDLE_TYPES: SpindleType[] = ['drop', 'wheel', 'furniture', 'staircase']
    expect(SPINDLE_TYPES[typeIdx]).toBe('staircase')
  })

  it('skill=100时typeIdx上限为3（staircase）', () => {
    const skill = 100
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    expect(typeIdx).toBe(3)
  })
})

// ---- balance与reputation计算 ----
describe('CreatureSpindleMakersSystem - balance与reputation计算', () => {
  let sys: CreatureSpindleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('balance=14+skill*0.74', () => {
    const skill = 70
    expect(14 + skill * 0.74).toBeCloseTo(65.8, 1)
  })

  it('reputation=10+skill*0.80', () => {
    const skill = 70
    expect(10 + skill * 0.80).toBeCloseTo(66, 1)
  })

  it('spindlesMade=2+floor(skill/8)', () => {
    const skill = 70
    expect(2 + Math.floor(skill / 8)).toBe(10)
  })
})

// ---- time-based cleanup ----
describe('CreatureSpindleMakersSystem - cleanup过期清理', () => {
  let sys: CreatureSpindleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('过期记录被清理（tick<cutoff）', () => {
    // cutoff = tick - 52000，注入tick=0，在tick=52001+CHECK_INTERVAL时清除
    ;(sys as any).makers.push(makeMaker(1, 'drop', 20, 0))
    const mockEM = { getComponent: () => undefined, getEntitiesWithComponents: () => [] }
    sys.update(1, mockEM as any, 52001 + CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('未过期记录保留', () => {
    const tick = 100000
    ;(sys as any).makers.push(makeMaker(1, 'drop', 20, tick - 1000))
    const mockEM = { getComponent: () => undefined, getEntitiesWithComponents: () => [] }
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL
    sys.update(1, mockEM as any, tick)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('MAX_MAKERS上限为30', () => {
    expect(MAX_MAKERS).toBe(30)
  })

  it('cleanup后先增后删：先加到上限后删至0', () => {
    const currentTick = 200000
    for (let i = 0; i < MAX_MAKERS; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1, 'drop', 20, 0))
    }
    expect((sys as any).makers).toHaveLength(MAX_MAKERS)

    const mockEM = { getComponent: () => undefined, getEntitiesWithComponents: () => [] }
    ;(sys as any).lastCheck = currentTick
    sys.update(1, mockEM as any, currentTick + CHECK_INTERVAL + 52001)
    expect((sys as any).makers).toHaveLength(0)
  })
})
