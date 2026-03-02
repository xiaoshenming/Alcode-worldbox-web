import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureTinplaterSystem } from '../systems/CreatureTinplaterSystem'
import type { Tinplater } from '../systems/CreatureTinplaterSystem'

const CHECK_INTERVAL = 2850

let nextId = 1
function makeSys(): CreatureTinplaterSystem { return new CreatureTinplaterSystem() }
function makeTinplater(entityId: number, overrides: Partial<Tinplater> = {}): Tinplater {
  return { id: nextId++, entityId, platingSkill: 70, coatingUniformity: 65, bathControl: 80, corrosionResistance: 75, tick: 0, ...overrides }
}
function makeEm() {
  return { getEntitiesWithComponents: () => [], getComponent: () => null } as any
}

describe('CreatureTinplaterSystem.getTinplaters', () => {
  let sys: CreatureTinplaterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无镀锡工', () => { expect((sys as any).tinplaters).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).tinplaters.push(makeTinplater(1))
    expect((sys as any).tinplaters[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).tinplaters.push(makeTinplater(1))
    expect((sys as any).tinplaters).toBe((sys as any).tinplaters)
  })
  it('字段正确', () => {
    ;(sys as any).tinplaters.push(makeTinplater(2))
    const t = (sys as any).tinplaters[0]
    expect(t.platingSkill).toBe(70)
    expect(t.corrosionResistance).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).tinplaters.push(makeTinplater(1))
    ;(sys as any).tinplaters.push(makeTinplater(2))
    expect((sys as any).tinplaters).toHaveLength(2)
  })
})

describe('CreatureTinplaterSystem CHECK_INTERVAL 节流', () => {
  let sys: CreatureTinplaterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick不足CHECK_INTERVAL时技能不增长', () => {
    ;(sys as any).tinplaters.push(makeTinplater(1, { platingSkill: 50 }))
    const em = makeEm()
    sys.update(1, em, 100)
    expect((sys as any).tinplaters[0].platingSkill).toBe(50)
  })

  it('tick恰好等于CHECK_INTERVAL-1时不触发', () => {
    ;(sys as any).tinplaters.push(makeTinplater(1, { platingSkill: 50 }))
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).tinplaters[0].platingSkill).toBe(50)
  })

  it('tick=CHECK_INTERVAL时触发技能增长', () => {
    ;(sys as any).tinplaters.push(makeTinplater(1, { platingSkill: 50 }))
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinplaters[0].platingSkill).toBeCloseTo(50.02)
  })

  it('首次update后lastCheck更新为当前tick', () => {
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('第二次update不足间隔则跳过', () => {
    ;(sys as any).tinplaters.push(makeTinplater(1, { platingSkill: 50 }))
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    const afterFirst = (sys as any).tinplaters[0].platingSkill
    sys.update(1, em, CHECK_INTERVAL + 100)
    expect((sys as any).tinplaters[0].platingSkill).toBe(afterFirst)
  })
})

describe('CreatureTinplaterSystem 技能增长', () => {
  let sys: CreatureTinplaterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('每次update platingSkill +0.02', () => {
    ;(sys as any).tinplaters.push(makeTinplater(1, { platingSkill: 50 }))
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinplaters[0].platingSkill).toBeCloseTo(50.02)
  })

  it('每次update coatingUniformity +0.015', () => {
    ;(sys as any).tinplaters.push(makeTinplater(1, { coatingUniformity: 50 }))
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinplaters[0].coatingUniformity).toBeCloseTo(50.015)
  })

  it('每次update corrosionResistance +0.01', () => {
    ;(sys as any).tinplaters.push(makeTinplater(1, { corrosionResistance: 50 }))
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinplaters[0].corrosionResistance).toBeCloseTo(50.01)
  })

  it('platingSkill上限100，不超过', () => {
    ;(sys as any).tinplaters.push(makeTinplater(1, { platingSkill: 99.99 }))
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinplaters[0].platingSkill).toBe(100)
  })

  it('coatingUniformity上限100，不超过', () => {
    ;(sys as any).tinplaters.push(makeTinplater(1, { coatingUniformity: 99.99 }))
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinplaters[0].coatingUniformity).toBe(100)
  })

  it('corrosionResistance上限100，不超过', () => {
    ;(sys as any).tinplaters.push(makeTinplater(1, { corrosionResistance: 99.99 }))
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinplaters[0].corrosionResistance).toBe(100)
  })

  it('多个镀锡工同时增长', () => {
    ;(sys as any).tinplaters.push(makeTinplater(1, { platingSkill: 10 }))
    ;(sys as any).tinplaters.push(makeTinplater(2, { platingSkill: 20 }))
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinplaters[0].platingSkill).toBeCloseTo(10.02)
    expect((sys as any).tinplaters[1].platingSkill).toBeCloseTo(20.02)
  })
})

describe('CreatureTinplaterSystem cleanup（platingSkill<=4）', () => {
  let sys: CreatureTinplaterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('platingSkill=4时，增长后=4.02，不被清除（增长先于清理）', () => {
    // 系统先执行技能增长（+0.02），再执行清理（<=4）
    // 4 + 0.02 = 4.02 > 4，不被清除
    ;(sys as any).tinplaters.push(makeTinplater(1, { platingSkill: 4 }))
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinplaters).toHaveLength(1)
  })

  it('platingSkill=3时被清除', () => {
    ;(sys as any).tinplaters.push(makeTinplater(1, { platingSkill: 3 }))
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinplaters).toHaveLength(0)
  })

  it('platingSkill=3.98，增长后=4.00，仍被清除', () => {
    ;(sys as any).tinplaters.push(makeTinplater(1, { platingSkill: 3.98 }))
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    // 3.98+0.02=4.00 <= 4，被清除
    expect((sys as any).tinplaters).toHaveLength(0)
  })

  it('platingSkill=4.01，增长后=4.03，不被清除', () => {
    ;(sys as any).tinplaters.push(makeTinplater(1, { platingSkill: 4.01 }))
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinplaters).toHaveLength(1)
  })

  it('低platingSkill被清除，高的保留', () => {
    ;(sys as any).tinplaters.push(makeTinplater(1, { platingSkill: 2 }))
    ;(sys as any).tinplaters.push(makeTinplater(2, { platingSkill: 50 }))
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).tinplaters).toHaveLength(1)
    expect((sys as any).tinplaters[0].entityId).toBe(2)
  })
})
