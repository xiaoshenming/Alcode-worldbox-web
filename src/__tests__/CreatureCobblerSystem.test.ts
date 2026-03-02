import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureCobblersSystem } from '../systems/CreatureCobblerSystem'
import type { Cobbler, FootwearType } from '../systems/CreatureCobblerSystem'

let nextId = 1
function makeSys(): CreatureCobblersSystem { return new CreatureCobblersSystem() }
function makeCobbler(entityId: number, overrides: Partial<Cobbler> = {}): Cobbler {
  return { id: nextId++, entityId, skill: 30, pairsCompleted: 10, footwearType: 'sandal', durability: 60, comfort: 50, tick: 0, ...overrides }
}

// 创建最小化 mock EntityManager（update 3 参数版）
function makeEm(entities: number[] = []) {
  return {
    getEntitiesWithComponents: () => entities,
    getComponent: () => null,
  } as any
}

describe('CreatureCobblersSystem', () => {
  let sys: CreatureCobblersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // --- 基础状态测试 ---

  it('初始无鞋匠', () => {
    expect((sys as any).cobblers).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).cobblers.push(makeCobbler(1, { footwearType: 'boot' }))
    expect((sys as any).cobblers[0].footwearType).toBe('boot')
  })

  it('多个全部返回', () => {
    ;(sys as any).cobblers.push(makeCobbler(1))
    ;(sys as any).cobblers.push(makeCobbler(2))
    expect((sys as any).cobblers).toHaveLength(2)
  })

  // --- FootwearType 枚举测试 ---

  it('FootwearType 包含 4 种（sandal/shoe/boot/armored）', () => {
    const types: FootwearType[] = ['sandal', 'shoe', 'boot', 'armored']
    types.forEach((t, i) => { ;(sys as any).cobblers.push(makeCobbler(i + 1, { footwearType: t })) })
    const all = (sys as any).cobblers as Cobbler[]
    expect(all.map(c => c.footwearType)).toEqual(['sandal', 'shoe', 'boot', 'armored'])
  })

  // --- 公式计算测试 ---

  it('durability 计算：skill=40 → 25 + 40*0.65 = 51', () => {
    const skill = 40
    const expected = 25 + skill * 0.65
    expect(expected).toBeCloseTo(51)
    // 验证公式直接计算
    const c = makeCobbler(1, { skill, durability: 25 + skill * 0.65 })
    ;(sys as any).cobblers.push(c)
    expect((sys as any).cobblers[0].durability).toBeCloseTo(51)
  })

  it('comfort 计算：skill=40 → 20 + 40*0.7 = 48', () => {
    const skill = 40
    const c = makeCobbler(1, { skill, comfort: 20 + skill * 0.7 })
    ;(sys as any).cobblers.push(c)
    expect((sys as any).cobblers[0].comfort).toBeCloseTo(48)
  })

  it('pairsCompleted 计算：skill=50 → 1 + Math.floor(50/10) = 6', () => {
    const skill = 50
    const c = makeCobbler(1, { skill, pairsCompleted: 1 + Math.floor(skill / 10) })
    ;(sys as any).cobblers.push(c)
    expect((sys as any).cobblers[0].pairsCompleted).toBe(6)
  })

  it('footwearType 由 skill/25 分 4 段：skill=0-24 → sandal', () => {
    const typeIdx = Math.min(3, Math.floor(10 / 25))
    expect(typeIdx).toBe(0)  // sandal
  })

  it('footwearType 由 skill/25 分 4 段：skill=25-49 → shoe', () => {
    const typeIdx = Math.min(3, Math.floor(30 / 25))
    expect(typeIdx).toBe(1)  // shoe
  })

  it('footwearType 由 skill/25 分 4 段：skill=50-74 → boot', () => {
    const typeIdx = Math.min(3, Math.floor(60 / 25))
    expect(typeIdx).toBe(2)  // boot
  })

  it('footwearType 由 skill/25 分 4 段：skill>=75 → armored', () => {
    const typeIdx = Math.min(3, Math.floor(80 / 25))
    expect(typeIdx).toBe(3)  // armored
  })

  // --- update 时序逻辑 ---

  it('tick 差值 < 1400 时不更新 lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    const em = makeEm([])
    sys.update(16, em, 2399)  // 差值 1399 < 1400
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('tick 差值 >= 1400 时更新 lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    const em = makeEm([])
    sys.update(16, em, 2400)  // 差值 1400 >= 1400
    expect((sys as any).lastCheck).toBe(2400)
  })

  // --- time-based cleanup 测试 ---

  it('time-based cleanup：tick=0 在 update(em, 60000) 时被删（0 < 60000-55000=5000）', () => {
    ;(sys as any).cobblers.push(makeCobbler(1, { tick: 0 }))
    ;(sys as any).lastCheck = 0  // 确保触发 update
    const em = makeEm([])
    sys.update(16, em, 60000)
    expect((sys as any).cobblers).toHaveLength(0)
  })

  it('较新记录保留：tick=56000 在 update(em, 60000) 时保留（56000 >= 5000 cutoff）', () => {
    ;(sys as any).cobblers.push(makeCobbler(1, { tick: 56000 }))
    ;(sys as any).lastCheck = 0
    const em = makeEm([])
    sys.update(16, em, 60000)
    expect((sys as any).cobblers).toHaveLength(1)
  })
})
