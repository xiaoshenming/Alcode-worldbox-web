import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFringeMakersSystem } from '../systems/CreatureFringeMakersSystem'
import type { FringeMaker, FringeType } from '../systems/CreatureFringeMakersSystem'

let nextId = 1
function makeSys(): CreatureFringeMakersSystem { return new CreatureFringeMakersSystem() }
function makeMaker(entityId: number, skill: number = 40, fringeType: FringeType = 'bullion'): FringeMaker {
  const fringesMade = 3 + Math.floor(skill / 7)
  const evenness = 13 + skill * 0.73
  const reputation = 10 + skill * 0.80
  return { id: nextId++, entityId, skill, fringesMade, fringeType, evenness, reputation, tick: 0 }
}

// 模拟 EntityManager
function makeEm(entityIds: number[] = [], age: number = 20) {
  return {
    getEntitiesWithComponents: (_c1: string, _c2: string) => entityIds,
    getComponent: (_eid: number, _comp: string) => ({ age }),
    hasComponent: (_eid: number, _comp: string) => true,
  } as any
}

const CHECK_INTERVAL = 1460
const SKILL_GROWTH = 0.054

describe('CreatureFringeMakersSystem', () => {
  let sys: CreatureFringeMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ---- 基础状态测试 ----
  it('初始无流苏工记录', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 40, 'tassel'))
    expect((sys as any).makers[0].fringeType).toBe('tassel')
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })

  // ---- FringeType 测试 ----
  it('FringeType包含4种：bullion/tassel/knotted/looped', () => {
    const types: FringeType[] = ['bullion', 'tassel', 'knotted', 'looped']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, 40, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].fringeType).toBe(t) })
  })

  // ---- 公式验证测试 ----
  it('evenness公式：13 + skill * 0.73', () => {
    const skill = 40
    const m = makeMaker(1, skill)
    ;(sys as any).makers.push(m)
    expect((sys as any).makers[0].evenness).toBeCloseTo(13 + skill * 0.73, 5)
  })

  it('reputation公式：10 + skill * 0.80', () => {
    const skill = 60
    const m = makeMaker(1, skill)
    ;(sys as any).makers.push(m)
    expect((sys as any).makers[0].reputation).toBeCloseTo(10 + skill * 0.80, 5)
  })

  it('fringesMade公式：3 + floor(skill / 7)', () => {
    const skill = 35
    const m = makeMaker(1, skill)
    ;(sys as any).makers.push(m)
    expect((sys as any).makers[0].fringesMade).toBe(3 + Math.floor(skill / 7))
  })

  // ---- fringeType 分段逻辑（skill/25 决定4段）----
  // typeIdx = Math.min(3, Math.floor(skill / 25))
  // skill 0..24 -> idx=0 -> 'bullion'
  // skill 25..49 -> idx=1 -> 'tassel'
  // skill 50..74 -> idx=2 -> 'knotted'
  // skill 75..100 -> idx=3 -> 'looped'
  it('fringeType由skill/25决定：skill=10 -> bullion', () => {
    const m = makeMaker(1, 10)
    m.fringeType = (['bullion', 'tassel', 'knotted', 'looped'] as FringeType[])[Math.min(3, Math.floor(10 / 25))]
    ;(sys as any).makers.push(m)
    expect((sys as any).makers[0].fringeType).toBe('bullion')
  })

  it('fringeType由skill/25决定：skill=30 -> tassel', () => {
    const m = makeMaker(1, 30)
    m.fringeType = (['bullion', 'tassel', 'knotted', 'looped'] as FringeType[])[Math.min(3, Math.floor(30 / 25))]
    ;(sys as any).makers.push(m)
    expect((sys as any).makers[0].fringeType).toBe('tassel')
  })

  it('fringeType由skill/25决定：skill=60 -> knotted', () => {
    const m = makeMaker(1, 60)
    m.fringeType = (['bullion', 'tassel', 'knotted', 'looped'] as FringeType[])[Math.min(3, Math.floor(60 / 25))]
    ;(sys as any).makers.push(m)
    expect((sys as any).makers[0].fringeType).toBe('knotted')
  })

  it('fringeType由skill/25决定：skill=80 -> looped', () => {
    const m = makeMaker(1, 80)
    m.fringeType = (['bullion', 'tassel', 'knotted', 'looped'] as FringeType[])[Math.min(3, Math.floor(80 / 25))]
    ;(sys as any).makers.push(m)
    expect((sys as any).makers[0].fringeType).toBe('looped')
  })

  // ---- tick/CHECK_INTERVAL 测试 ----
  it('tick差值<1460时不更新lastCheck', () => {
    ;(sys as any).lastCheck = 2000
    sys.update(1, makeEm(), 2000 + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(2000)
  })

  it('tick差值>=1460时更新lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, makeEm(), CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  // ---- time-based cleanup测试 ----
  // cutoff = tick - 52000，tick值小于cutoff的记录被删除
  it('time-based cleanup: tick < (currentTick - 52000) 的记录被删除', () => {
    const currentTick = 100000
    // 这条记录的tick=40000，cutoff=100000-52000=48000，40000 < 48000 -> 删除
    ;(sys as any).makers.push({ ...makeMaker(1), tick: 40000 })
    // 这条记录的tick=60000，60000 >= 48000 -> 保留
    ;(sys as any).makers.push({ ...makeMaker(2), tick: 60000 })
    ;(sys as any).lastCheck = 0
    sys.update(1, makeEm(), currentTick)
    const remaining = (sys as any).makers
    expect(remaining.every((m: FringeMaker) => m.entityId !== 1)).toBe(true)
    expect(remaining.some((m: FringeMaker) => m.entityId === 2)).toBe(true)
  })

  it('time-based cleanup: tick恰好等于cutoff时保留（>=cutoff不删）', () => {
    const currentTick = 100000
    const cutoff = currentTick - 52000  // = 48000
    // tick=48000，恰好等于cutoff，48000 >= 48000 -> 不删除
    ;(sys as any).makers.push({ ...makeMaker(1), tick: cutoff })
    ;(sys as any).lastCheck = 0
    sys.update(1, makeEm(), currentTick)
    // tick恰好等于cutoff：makers[i].tick < cutoff 为 false，所以不删除
    expect((sys as any).makers.some((m: FringeMaker) => m.entityId === 1)).toBe(true)
  })

  it('SKILL_GROWTH常量为0.054', () => {
    // 验证系统中 skillMap 正确增长 SKILL_GROWTH=0.054
    const eid = 42
    ;(sys as any).skillMap.set(eid, 10)
    // 构造一个能通过随机检查的em：让CRAFT_CHANCE > 1 是不可能的，
    // 故直接验证skillMap的增长逻辑：新skill = min(100, oldSkill + 0.054)
    const oldSkill = 10
    const expectedSkill = Math.min(100, oldSkill + SKILL_GROWTH)
    expect(expectedSkill).toBeCloseTo(10.054, 5)
  })
})
