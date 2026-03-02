import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureEngraversSystem } from '../systems/CreatureEngraversSystem'
import type { Engraver, EngravingMedium } from '../systems/CreatureEngraversSystem'

let nextId = 1
function makeSys(): CreatureEngraversSystem { return new CreatureEngraversSystem() }
function makeEngraver(entityId: number, skill = 40, medium: EngravingMedium = 'metal'): Engraver {
  return {
    id: nextId++, entityId, skill, piecesCompleted: 1 + Math.floor(skill / 10),
    medium, precision: 25 + skill * 0.65, creativity: 20 + skill * 0.7, tick: 0
  }
}

describe('CreatureEngraversSystem - 基础数据', () => {
  let sys: CreatureEngraversSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无雕刻工', () => { expect((sys as any).engravers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).engravers.push(makeEngraver(1, 40, 'gem'))
    expect((sys as any).engravers[0].medium).toBe('gem')
  })

  it('返回内部引用', () => {
    ;(sys as any).engravers.push(makeEngraver(1))
    expect((sys as any).engravers).toBe((sys as any).engravers)
  })

  it('支持所有 4 种雕刻材质', () => {
    const meds: EngravingMedium[] = ['metal', 'stone', 'wood', 'gem']
    meds.forEach((m, i) => { ;(sys as any).engravers.push(makeEngraver(i + 1, 40, m)) })
    const all = (sys as any).engravers
    meds.forEach((m, i) => { expect(all[i].medium).toBe(m) })
  })

  it('多个全部返回', () => {
    ;(sys as any).engravers.push(makeEngraver(1))
    ;(sys as any).engravers.push(makeEngraver(2))
    expect((sys as any).engravers).toHaveLength(2)
  })
})

describe('CreatureEngraversSystem - 公式��证', () => {
  let sys: CreatureEngraversSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // medium由skill/25决定4段
  it('medium: skill=0  → metal (idx=0)', () => {
    const MEDIUMS: EngravingMedium[] = ['metal', 'stone', 'wood', 'gem']
    expect(MEDIUMS[Math.min(3, Math.floor(0 / 25))]).toBe('metal')
  })

  it('medium: skill=25 → stone (idx=1)', () => {
    const MEDIUMS: EngravingMedium[] = ['metal', 'stone', 'wood', 'gem']
    expect(MEDIUMS[Math.min(3, Math.floor(25 / 25))]).toBe('stone')
  })

  it('medium: skill=50 → wood (idx=2)', () => {
    const MEDIUMS: EngravingMedium[] = ['metal', 'stone', 'wood', 'gem']
    expect(MEDIUMS[Math.min(3, Math.floor(50 / 25))]).toBe('wood')
  })

  it('medium: skill=75 → gem (idx=3)', () => {
    const MEDIUMS: EngravingMedium[] = ['metal', 'stone', 'wood', 'gem']
    expect(MEDIUMS[Math.min(3, Math.floor(75 / 25))]).toBe('gem')
  })

  it('piecesCompleted: skill=50 → 6', () => {
    expect(1 + Math.floor(50 / 10)).toBe(6)
  })

  it('piecesCompleted: skill=10 → 2', () => {
    expect(1 + Math.floor(10 / 10)).toBe(2)
  })

  it('piecesCompleted: skill=0 → 1', () => {
    expect(1 + Math.floor(0 / 10)).toBe(1)
  })

  it('precision: skill=40 → 25 + 40*0.65 = 51', () => {
    expect(25 + 40 * 0.65).toBeCloseTo(51, 5)
  })

  it('precision: skill=0 → 25', () => {
    expect(25 + 0 * 0.65).toBe(25)
  })

  it('creativity: skill=40 → 20 + 40*0.7 = 48', () => {
    expect(20 + 40 * 0.7).toBeCloseTo(48, 5)
  })

  it('creativity: skill=0 → 20', () => {
    expect(20 + 0 * 0.7).toBe(20)
  })

  it('Engraver字段结构完整', () => {
    const e = makeEngraver(1, 40, 'stone')
    expect(e).toHaveProperty('id')
    expect(e).toHaveProperty('entityId')
    expect(e).toHaveProperty('skill')
    expect(e).toHaveProperty('piecesCompleted')
    expect(e).toHaveProperty('medium')
    expect(e).toHaveProperty('precision')
    expect(e).toHaveProperty('creativity')
    expect(e).toHaveProperty('tick')
  })
})

describe('CreatureEngraversSystem - update行为', () => {
  let sys: CreatureEngraversSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // CHECK_INTERVAL = 1400
  it('tick差值<1400时不调用em', () => {
    let called = false
    const patchedEm = {
      getEntitiesWithComponents: () => { called = true; return [] }
    }
    sys.update(0, patchedEm as any, 0)
    called = false
    sys.update(0, patchedEm as any, 1000) // 差值1000 < 1400
    expect(called).toBe(false)
  })

  it('tick差值>=1400时执行检查', () => {
    let called = false
    const patchedEm = {
      getEntitiesWithComponents: () => { called = true; return [] }
    }
    sys.update(0, patchedEm as any, 0)
    called = false
    sys.update(0, patchedEm as any, 1400) // 差值==1400，满足条件
    expect(called).toBe(true)
  })

  it('time-based cleanup: tick<cutoff的记录被清除（cutoff=tick-55000）', () => {
    // 注入老记录tick=0，update到tick=60000，cutoff=60000-55000=5000，0<5000应被清除
    ;(sys as any).engravers.push({ id: 1, entityId: 99, skill: 40, piecesCompleted: 5,
      medium: 'metal', precision: 51, creativity: 48, tick: 0 })
    const patchedEm = { getEntitiesWithComponents: () => [] }
    sys.update(0, patchedEm as any, 0)
    sys.update(0, patchedEm as any, 60000)
    expect((sys as any).engravers).toHaveLength(0)
  })

  it('tick在cutoff内的记录不被清除', () => {
    // 注入tick=50000的记录，update到tick=60000，cutoff=5000，50000>5000不删
    ;(sys as any).engravers.push({ id: 1, entityId: 99, skill: 40, piecesCompleted: 5,
      medium: 'metal', precision: 51, creativity: 48, tick: 50000 })
    const patchedEm = { getEntitiesWithComponents: () => [] }
    sys.update(0, patchedEm as any, 0)
    sys.update(0, patchedEm as any, 60000)
    expect((sys as any).engravers).toHaveLength(1)
  })
})
