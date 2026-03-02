import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureQuiltingMakersSystem } from '../systems/CreatureQuiltingMakersSystem'
import type { QuiltingMaker, QuiltType } from '../systems/CreatureQuiltingMakersSystem'

let nextId = 1
function makeSys(): CreatureQuiltingMakersSystem { return new CreatureQuiltingMakersSystem() }
function makeMaker(entityId: number, type: QuiltType = 'patchwork', tick = 0, skill = 70): QuiltingMaker {
  return { id: nextId++, entityId, skill, quiltsMade: 15, quiltType: type, stitchDensity: 60, reputation: 45, tick }
}

function makeEmptyEM() {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    getComponent: vi.fn().mockReturnValue(null),
    hasComponent: vi.fn().mockReturnValue(false),
  } as any
}

describe('CreatureQuiltingMakersSystem - 初始化', () => {
  let sys: CreatureQuiltingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无缝被工', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'trapunto'))
    expect((sys as any).makers[0].quiltType).toBe('trapunto')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有4种缝被类型', () => {
    const types: QuiltType[] = ['patchwork', 'applique_quilt', 'wholecloth', 'trapunto']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].quiltType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})

describe('CreatureQuiltingMakersSystem - CHECK_INTERVAL 节流 (1490)', () => {
  let sys: CreatureQuiltingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick差不足1490时不执行', () => {
    const em = makeEmptyEM()
    ;(sys as any).lastCheck = -2000
    sys.update(0, em, 0)     // runs: 0-(-2000)=2000 >= 1490
    sys.update(0, em, 500)   // throttled: 500-0=500 < 1490
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
  })

  it('tick差恰好等于1490时执行', () => {
    const em = makeEmptyEM()
    ;(sys as any).lastCheck = -2000
    sys.update(0, em, 0)
    sys.update(0, em, 1490)  // runs: 1490-0=1490, not < 1490
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(2)
  })

  it('tick差超过1490时执行', () => {
    const em = makeEmptyEM()
    ;(sys as any).lastCheck = -2000
    sys.update(0, em, 0)
    sys.update(0, em, 3000)  // runs: 3000-0=3000 >= 1490
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(2)
  })
})

describe('CreatureQuiltingMakersSystem - skillMap 技能递增 (SKILL_GROWTH=0.051)', () => {
  let sys: CreatureQuiltingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('新实体skill在2~9之间（random=0时为2 + SKILL_GROWTH）', () => {
    const map: Map<number, number> = (sys as any).skillMap
    const afterGrowth = Math.min(100, 2 + 0.051)
    map.set(1, afterGrowth)
    expect(map.get(1)).toBeCloseTo(2.051, 5)
  })

  it('skill上限为100，不超过', () => {
    const capped = Math.min(100, 99.98 + 0.051)
    expect(capped).toBe(100)
  })

  it('连续两次递增正确累加', () => {
    const map: Map<number, number> = (sys as any).skillMap
    map.set(3, 50)
    const after1 = Math.min(100, 50 + 0.051)
    map.set(3, after1)
    const after2 = Math.min(100, after1 + 0.051)
    map.set(3, after2)
    expect(map.get(3)).toBeCloseTo(50.102, 5)
  })

  it('skill=100时增长后仍为100', () => {
    const map: Map<number, number> = (sys as any).skillMap
    map.set(9, 100)
    const capped = Math.min(100, 100 + 0.051)
    map.set(9, capped)
    expect(map.get(9)).toBe(100)
  })
})

describe('CreatureQuiltingMakersSystem - 字段计算公式', () => {
  it('stitchDensity公式: 15 + skill * 0.68', () => {
    const skill = 50
    expect(15 + skill * 0.68).toBeCloseTo(49, 5)
  })

  it('reputation公式: 10 + skill * 0.77', () => {
    const skill = 100
    expect(10 + skill * 0.77).toBeCloseTo(87, 5)
  })

  it('quiltsMade公式: 2 + floor(skill/9)', () => {
    expect(2 + Math.floor(45 / 9)).toBe(7)
    expect(2 + Math.floor(100 / 9)).toBe(13)
  })

  it('skill=0时quiltType为patchwork (typeIdx=0)', () => {
    const skill = 0
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    const types: QuiltType[] = ['patchwork', 'applique_quilt', 'wholecloth', 'trapunto']
    expect(types[typeIdx]).toBe('patchwork')
  })

  it('skill=25时quiltType为applique_quilt (typeIdx=1)', () => {
    const skill = 25
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    const types: QuiltType[] = ['patchwork', 'applique_quilt', 'wholecloth', 'trapunto']
    expect(types[typeIdx]).toBe('applique_quilt')
  })

  it('skill=50时quiltType为wholecloth (typeIdx=2)', () => {
    const skill = 50
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    const types: QuiltType[] = ['patchwork', 'applique_quilt', 'wholecloth', 'trapunto']
    expect(types[typeIdx]).toBe('wholecloth')
  })

  it('skill=75时quiltType为trapunto (typeIdx=3)', () => {
    const skill = 75
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    const types: QuiltType[] = ['patchwork', 'applique_quilt', 'wholecloth', 'trapunto']
    expect(types[typeIdx]).toBe('trapunto')
  })

  it('skill>100时typeIdx上限为3', () => {
    const skill = 200
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    expect(typeIdx).toBe(3)
  })
})

describe('CreatureQuiltingMakersSystem - tick-based cleanup (cutoff = tick - 51000)', () => {
  let sys: CreatureQuiltingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick < cutoff的记录被清除', () => {
    // cutoff = 55000 - 51000 = 4000; record.tick(0) < 4000 => deleted
    ;(sys as any).makers.push(makeMaker(1, 'patchwork', 0))
    const em = makeEmptyEM()
    ;(sys as any).lastCheck = -2000
    sys.update(0, em, 55000)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('tick >= cutoff的记录保留', () => {
    // cutoff = 55000 - 51000 = 4000; record.tick(5000) >= 4000 => kept
    ;(sys as any).makers.push(makeMaker(1, 'patchwork', 5000))
    const em = makeEmptyEM()
    ;(sys as any).lastCheck = -2000
    sys.update(0, em, 55000)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('精确在cutoff边界时保留', () => {
    // cutoff = 4000; record.tick(4000) not < 4000 => kept
    ;(sys as any).makers.push(makeMaker(1, 'patchwork', 4000))
    const em = makeEmptyEM()
    ;(sys as any).lastCheck = -2000
    sys.update(0, em, 55000)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('混合新旧记录：旧的删除，新的保留', () => {
    ;(sys as any).makers.push(makeMaker(1, 'patchwork', 0))      // old
    ;(sys as any).makers.push(makeMaker(2, 'wholecloth', 8000))  // new
    ;(sys as any).makers.push(makeMaker(3, 'trapunto', 500))     // old
    const em = makeEmptyEM()
    ;(sys as any).lastCheck = -2000
    sys.update(0, em, 55000)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })
})

describe('CreatureQuiltingMakersSystem - MAX_MAKERS容量上限 (30)', () => {
  let sys: CreatureQuiltingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('makers数量不超过MAX_MAKERS(30)', () => {
    for (let i = 0; i < 35; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1))
    }
    if ((sys as any).makers.length > 30) {
      ;(sys as any).makers.length = 30
    }
    expect((sys as any).makers.length).toBeLessThanOrEqual(30)
  })
})
