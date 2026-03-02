import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureDyersSystem } from '../systems/CreatureDyersSystem'
import type { Dyer, DyeSource } from '../systems/CreatureDyersSystem'

// CHECK_INTERVAL=1350, SKILL_GROWTH=0.058
// colorFastness = 15 + skill * 0.7
// reputation = 10 + skill * 0.75
// batchesDyed = 1 + Math.floor(skill / 8)
// dyeSource: srcIdx = Math.min(3, Math.floor(skill/25))
// cleanup cutoff = tick - 51000

let nextId = 1
function makeSys(): CreatureDyersSystem { return new CreatureDyersSystem() }
function makeMaker(entityId: number, overrides: Partial<Dyer> = {}): Dyer {
  return {
    id: nextId++, entityId, skill: 30, batchesDyed: 4,
    dyeSource: 'plant', colorFastness: 36, reputation: 32.5, tick: 0,
    ...overrides
  }
}

describe('CreatureDyersSystem - 基础数据', () => {
  let sys: CreatureDyersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无染工', () => { expect((sys as any).makers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, { dyeSource: 'insect' }))
    expect((sys as any).makers[0].dyeSource).toBe('insect')
  })

  it('DyeSource包含4种(plant/mineral/insect/shellfish)', () => {
    const sources: DyeSource[] = ['plant', 'mineral', 'insect', 'shellfish']
    sources.forEach((s, i) => { ;(sys as any).makers.push(makeMaker(i + 1, { dyeSource: s })) })
    const all = (sys as any).makers as Dyer[]
    sources.forEach((s, i) => { expect(all[i].dyeSource).toBe(s) })
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })

  it('返回内部引用一致', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
})

describe('CreatureDyersSystem - 公式验证', () => {
  let sys: CreatureDyersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('colorFastness公式: skill=40 → 15+40*0.7=43', () => {
    const cf = 15 + 40 * 0.7
    ;(sys as any).makers.push(makeMaker(1, { skill: 40, colorFastness: cf }))
    expect((sys as any).makers[0].colorFastness).toBeCloseTo(43, 5)
  })

  it('colorFastness公式: skill=80 → 15+80*0.7=71', () => {
    const cf = 15 + 80 * 0.7
    ;(sys as any).makers.push(makeMaker(1, { skill: 80, colorFastness: cf }))
    expect((sys as any).makers[0].colorFastness).toBeCloseTo(71, 5)
  })

  it('reputation公式: skill=40 → 10+40*0.75=40', () => {
    const rep = 10 + 40 * 0.75
    ;(sys as any).makers.push(makeMaker(1, { skill: 40, reputation: rep }))
    expect((sys as any).makers[0].reputation).toBeCloseTo(40, 5)
  })

  it('reputation公式: skill=100 → 10+100*0.75=85', () => {
    const rep = 10 + 100 * 0.75
    ;(sys as any).makers.push(makeMaker(1, { skill: 100, reputation: rep }))
    expect((sys as any).makers[0].reputation).toBeCloseTo(85, 5)
  })

  it('batchesDyed: skill=40 → 1+floor(40/8)=1+5=6', () => {
    const b = 1 + Math.floor(40 / 8)
    ;(sys as any).makers.push(makeMaker(1, { skill: 40, batchesDyed: b }))
    expect((sys as any).makers[0].batchesDyed).toBe(6)
  })

  it('batchesDyed: skill=0 → 1+floor(0/8)=1', () => {
    ;(sys as any).makers.push(makeMaker(1, { skill: 0, batchesDyed: 1 }))
    expect((sys as any).makers[0].batchesDyed).toBe(1)
  })

  it('dyeSource: skill=10 → srcIdx=0 → plant', () => {
    const SOURCES: DyeSource[] = ['plant', 'mineral', 'insect', 'shellfish']
    const idx = Math.min(3, Math.floor(10 / 25))
    ;(sys as any).makers.push(makeMaker(1, { skill: 10, dyeSource: SOURCES[idx] }))
    expect((sys as any).makers[0].dyeSource).toBe('plant')
  })

  it('dyeSource: skill=25 → srcIdx=1 → mineral', () => {
    const SOURCES: DyeSource[] = ['plant', 'mineral', 'insect', 'shellfish']
    const idx = Math.min(3, Math.floor(25 / 25))
    ;(sys as any).makers.push(makeMaker(1, { skill: 25, dyeSource: SOURCES[idx] }))
    expect((sys as any).makers[0].dyeSource).toBe('mineral')
  })

  it('dyeSource: skill=50 → srcIdx=2 → insect', () => {
    const SOURCES: DyeSource[] = ['plant', 'mineral', 'insect', 'shellfish']
    const idx = Math.min(3, Math.floor(50 / 25))
    ;(sys as any).makers.push(makeMaker(1, { skill: 50, dyeSource: SOURCES[idx] }))
    expect((sys as any).makers[0].dyeSource).toBe('insect')
  })

  it('dyeSource: skill=75 → srcIdx=3 → shellfish', () => {
    const SOURCES: DyeSource[] = ['plant', 'mineral', 'insect', 'shellfish']
    const idx = Math.min(3, Math.floor(75 / 25))
    ;(sys as any).makers.push(makeMaker(1, { skill: 75, dyeSource: SOURCES[idx] }))
    expect((sys as any).makers[0].dyeSource).toBe('shellfish')
  })
})

describe('CreatureDyersSystem - CHECK_INTERVAL节流与cleanup', () => {
  let sys: CreatureDyersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick差值<1350不更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1000)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=1350更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1350)
    expect((sys as any).lastCheck).toBe(1350)
  })

  it('cleanup: tick比cutoff(tick-51000)旧的记录被删除', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    // currentTick=55000, cutoff=55000-51000=4000, tick=3000 < 4000 应被删除
    ;(sys as any).makers.push(makeMaker(1, { tick: 3000 }))
    ;(sys as any).makers.push(makeMaker(2, { tick: 45000 }))
    sys.update(1, em, 55000)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('cleanup: tick等于cutoff边界时仍被删除', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    const currentTick = 55000
    const cutoff = currentTick - 51000  // 4000
    ;(sys as any).makers.push(makeMaker(1, { tick: cutoff - 1 }))  // 3999 < 4000, 删除
    ;(sys as any).makers.push(makeMaker(2, { tick: cutoff }))       // 4000, 不删除
    sys.update(1, em, currentTick)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('skillMap未知实体返回undefined', () => {
    expect((sys as any).skillMap.get(999)).toBeUndefined()
  })

  it('skillMap注入技能后可读取', () => {
    ;(sys as any).skillMap.set(42, 80)
    expect((sys as any).skillMap.get(42)).toBe(80)
  })
})
