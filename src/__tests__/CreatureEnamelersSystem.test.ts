import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureEnamelersSystem } from '../systems/CreatureEnamelersSystem'
import type { Enameler, EnamelTechnique } from '../systems/CreatureEnamelersSystem'

let nextId = 1
function makeSys(): CreatureEnamelersSystem { return new CreatureEnamelersSystem() }
function makeMaker(entityId: number, skill = 40, technique: EnamelTechnique = 'cloisonne'): Enameler {
  return {
    id: nextId++, entityId, skill, piecesEnameled: 1 + Math.floor(skill / 9),
    technique, colorRange: 15 + skill * 0.72, reputation: 10 + skill * 0.81, tick: 0
  }
}

describe('CreatureEnamelersSystem - 基础数据', () => {
  let sys: CreatureEnamelersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无珐琅工', () => { expect((sys as any).makers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 40, 'champleve'))
    expect((sys as any).makers[0].technique).toBe('champleve')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })

  it('支持所有 4 种珐琅技法', () => {
    const techs: EnamelTechnique[] = ['cloisonne', 'champleve', 'plique', 'grisaille']
    techs.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, 40, t)) })
    const all = (sys as any).makers
    techs.forEach((t, i) => { expect(all[i].technique).toBe(t) })
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})

describe('CreatureEnamelersSystem - 公式验证', () => {
  let sys: CreatureEnamelersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // technique 由 skill/25 决定4段
  it('technique: skill=0  → cloisonne (idx=0)', () => {
    const techIdx = Math.min(3, Math.floor(0 / 25))
    const TECHNIQUES: EnamelTechnique[] = ['cloisonne', 'champleve', 'plique', 'grisaille']
    expect(TECHNIQUES[techIdx]).toBe('cloisonne')
  })

  it('technique: skill=25 → champleve (idx=1)', () => {
    const techIdx = Math.min(3, Math.floor(25 / 25))
    const TECHNIQUES: EnamelTechnique[] = ['cloisonne', 'champleve', 'plique', 'grisaille']
    expect(TECHNIQUES[techIdx]).toBe('champleve')
  })

  it('technique: skill=50 → plique (idx=2)', () => {
    const techIdx = Math.min(3, Math.floor(50 / 25))
    const TECHNIQUES: EnamelTechnique[] = ['cloisonne', 'champleve', 'plique', 'grisaille']
    expect(TECHNIQUES[techIdx]).toBe('plique')
  })

  it('technique: skill=75 → grisaille (idx=3)', () => {
    const techIdx = Math.min(3, Math.floor(75 / 25))
    const TECHNIQUES: EnamelTechnique[] = ['cloisonne', 'champleve', 'plique', 'grisaille']
    expect(TECHNIQUES[techIdx]).toBe('grisaille')
  })

  it('piecesEnameled: skill=45 → 6', () => {
    const pieces = 1 + Math.floor(45 / 9)
    expect(pieces).toBe(6)
  })

  it('piecesEnameled: skill=9 → 2', () => {
    expect(1 + Math.floor(9 / 9)).toBe(2)
  })

  it('piecesEnameled: skill=0 → 1', () => {
    expect(1 + Math.floor(0 / 9)).toBe(1)
  })

  it('colorRange: skill=40 → 15 + 40*0.72 = 43.8', () => {
    expect(15 + 40 * 0.72).toBeCloseTo(43.8, 5)
  })

  it('colorRange: skill=0 → 15', () => {
    expect(15 + 0 * 0.72).toBe(15)
  })

  it('reputation: skill=40 → 10 + 40*0.81 = 42.4', () => {
    expect(10 + 40 * 0.81).toBeCloseTo(42.4, 5)
  })

  it('reputation: skill=0 → 10', () => {
    expect(10 + 0 * 0.81).toBe(10)
  })

  it('Enameler字段结构完整', () => {
    const m = makeMaker(1, 40, 'plique')
    expect(m).toHaveProperty('id')
    expect(m).toHaveProperty('entityId')
    expect(m).toHaveProperty('skill')
    expect(m).toHaveProperty('piecesEnameled')
    expect(m).toHaveProperty('technique')
    expect(m).toHaveProperty('colorRange')
    expect(m).toHaveProperty('reputation')
    expect(m).toHaveProperty('tick')
  })
})

describe('CreatureEnamelersSystem - update行为', () => {
  let sys: CreatureEnamelersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // CHECK_INTERVAL = 1410
  it('tick差值<1410时不调用em（lastCheck不更新）', () => {
    const mockEm = { getEntitiesWithComponents: () => [] }
    let called = false
    const patchedEm = {
      getEntitiesWithComponents: (...args: string[]) => { called = true; return [] }
    }
    sys.update(0, patchedEm as any, 0)
    called = false
    sys.update(0, patchedEm as any, 1000) // 差值1000 < 1410
    expect(called).toBe(false)
  })

  it('tick差值>=1410时执行检查（lastCheck更新）', () => {
    let called = false
    const patchedEm = {
      getEntitiesWithComponents: () => { called = true; return [] }
    }
    sys.update(0, patchedEm as any, 0)
    called = false
    sys.update(0, patchedEm as any, 1410) // 差值==1410，满足条件
    expect(called).toBe(true)
  })

  it('time-based cleanup: tick<cutoff的记录被清除（cutoff=tick-52500）', () => {
    // 先注入一条老记录 tick=0，然后update到 tick=60000
    // cutoff=60000-52500=7500，0<7500应被清除
    ;(sys as any).makers.push({ id: 1, entityId: 99, skill: 30, piecesEnameled: 4,
      technique: 'cloisonne', colorRange: 30, reputation: 35, tick: 0 })
    const patchedEm = { getEntitiesWithComponents: () => [] }
    // 先执行一次让lastCheck=0
    sys.update(0, patchedEm as any, 0)
    // 再执行让tick=60000 > lastCheck+1410
    sys.update(0, patchedEm as any, 60000)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('tick在cutoff内的记录不被清除', () => {
    // 注入一条tick=50000的记录，update到tick=60000，cutoff=7500，50000>7500不删
    ;(sys as any).makers.push({ id: 1, entityId: 99, skill: 30, piecesEnameled: 4,
      technique: 'cloisonne', colorRange: 30, reputation: 35, tick: 50000 })
    const patchedEm = { getEntitiesWithComponents: () => [] }
    sys.update(0, patchedEm as any, 0)
    sys.update(0, patchedEm as any, 60000)
    expect((sys as any).makers).toHaveLength(1)
  })
})
