import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureHerbalistSystem } from '../systems/CreatureHerbalistSystem'
import type { Herbalist, HerbSpecialty } from '../systems/CreatureHerbalistSystem'

let nextId = 1
function makeSys(): CreatureHerbalistSystem { return new CreatureHerbalistSystem() }
function makeHerbalist(entityId: number, specialty: HerbSpecialty = 'healing', overrides: Partial<Herbalist> = {}): Herbalist {
  return {
    id: nextId++, entityId, skill: 60, herbsGathered: 20,
    potionsBrewed: 5, knowledge: 10, specialty, tick: 0,
    ...overrides
  }
}

describe('CreatureHerbalistSystem', () => {
  let sys: CreatureHerbalistSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // --- 基础数据测试 ---
  it('初始无草药师', () => {
    expect((sys as any).herbalists).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).herbalists.push(makeHerbalist(1, 'poison'))
    expect((sys as any).herbalists[0].specialty).toBe('poison')
  })

  it('HerbSpecialty 包含4种专长', () => {
    const specs: HerbSpecialty[] = ['healing', 'poison', 'buff', 'antidote']
    specs.forEach((s, i) => { ;(sys as any).herbalists.push(makeHerbalist(i + 1, s)) })
    const all = (sys as any).herbalists
    specs.forEach((s, i) => { expect(all[i].specialty).toBe(s) })
  })

  it('多个草药师全部返回', () => {
    ;(sys as any).herbalists.push(makeHerbalist(1))
    ;(sys as any).herbalists.push(makeHerbalist(2))
    ;(sys as any).herbalists.push(makeHerbalist(3))
    expect((sys as any).herbalists).toHaveLength(3)
  })

  it('Herbalist 对象包含全部字段', () => {
    const h = makeHerbalist(1, 'buff')
    ;(sys as any).herbalists.push(h)
    const stored = (sys as any).herbalists[0]
    expect(stored).toHaveProperty('id')
    expect(stored).toHaveProperty('entityId')
    expect(stored).toHaveProperty('skill')
    expect(stored).toHaveProperty('herbsGathered')
    expect(stored).toHaveProperty('potionsBrewed')
    expect(stored).toHaveProperty('knowledge')
    expect(stored).toHaveProperty('specialty')
    expect(stored).toHaveProperty('tick')
  })

  // --- tick 间隔控制测试（CHECK_INTERVAL = 3000）---
  it('tick 差值 < 3000 时不触发更新（lastCheck 不变）', () => {
    const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
    sys.update(0, em, 0)      // 初始化 lastCheck = 0
    const before = (sys as any).lastCheck
    sys.update(0, em, 2999)   // 差值 2999 < 3000，不更新
    expect((sys as any).lastCheck).toBe(before)
  })

  it('tick 差值 >= 3000 时触发更新（lastCheck 变为当前 tick）', () => {
    const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
    sys.update(0, em, 0)
    sys.update(0, em, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })

  it('tick 差值 >= 3000 时 lastCheck 正确递进', () => {
    const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
    sys.update(0, em, 6000)
    expect((sys as any).lastCheck).toBe(6000)
    sys.update(0, em, 9001)
    expect((sys as any).lastCheck).toBe(9001)
  })

  // --- skill 上限 100 ---
  it('skill 不超过上限 100（使用 Math.min 约束）', () => {
    const h = makeHerbalist(1, 'healing', { skill: 99.7 })
    ;(sys as any).herbalists.push(h)
    // 模拟酿造成功：skill + 0.4
    h.skill = Math.min(100, h.skill + 0.4)
    expect(h.skill).toBe(100)
  })

  it('skill 已为 100 时酿造成功仍保持 100', () => {
    const h = makeHerbalist(1, 'healing', { skill: 100 })
    ;(sys as any).herbalists.push(h)
    h.skill = Math.min(100, h.skill + 0.4)
    expect(h.skill).toBe(100)
  })

  // --- plantsKnown / potionsBrewed 字段注入 ---
  it('herbsGathered 字段可自定义注入', () => {
    const h = makeHerbalist(1, 'antidote', { herbsGathered: 42 })
    ;(sys as any).herbalists.push(h)
    expect((sys as any).herbalists[0].herbsGathered).toBe(42)
  })

  it('potionsBrewed 字段可自定义注入', () => {
    const h = makeHerbalist(1, 'buff', { potionsBrewed: 15 })
    ;(sys as any).herbalists.push(h)
    expect((sys as any).herbalists[0].potionsBrewed).toBe(15)
  })

  // --- 清理：死亡实体草药师被移除 ---
  it('死亡实体（hasComponent 返回 false）时草药师被清理', () => {
    ;(sys as any).herbalists.push(makeHerbalist(99, 'healing'))
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => false,
    } as any
    ;(sys as any).lastCheck = -3000  // 确保触发
    sys.update(0, em, 0)
    expect((sys as any).herbalists).toHaveLength(0)
  })

  it('存活实体（hasComponent 返回 true）时草药师不被清理', () => {
    ;(sys as any).herbalists.push(makeHerbalist(42, 'poison'))
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    ;(sys as any).lastCheck = -3000
    sys.update(0, em, 0)
    expect((sys as any).herbalists).toHaveLength(1)
  })
})
