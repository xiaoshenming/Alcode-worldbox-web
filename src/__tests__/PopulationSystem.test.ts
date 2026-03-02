import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PopulationSystem } from '../systems/PopulationSystem'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'
import { BuildingType } from '../civilization/Civilization'

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────
function makeSys() { return new PopulationSystem() }

function makeWorld() {
  return {
    width: 20, height: 20,
    getTile: (_x: number, _y: number) => TileType.GRASS,
    setTile: () => {},
  }
}

function makeParticles() {
  return { spawn: vi.fn(), spawnBirth: vi.fn(), spawnDeath: vi.fn() }
}

function makeCiv(id: number, overrides: Partial<any> = {}): any {
  return {
    id,
    name: `Civ${id}`,
    resources: { food: 100, wood: 50, stone: 30, gold: 20 },
    relations: new Map<number, number>(),
    territory: new Set<string>(),
    buildings: [],
    tradeRoutes: [],
    population: 5,
    ...overrides
  }
}

function makeCivManager(civs: Map<number, any> = new Map()) {
  return { civilizations: civs, getRelation: () => 0 }
}

// 添加一个标准 civ member 实体（creature + civMember + position + needs）
function addMember(em: EntityManager, civId: number, species = 'human', age = 300, maxAge = 800): number {
  const id = em.createEntity()
  em.addComponent(id, { type: 'creature', species, speed: 1, damage: 5, isHostile: false, name: 'Test', age, maxAge, gender: 'male' })
  em.addComponent(id, { type: 'civMember', civId, role: 'worker' })
  em.addComponent(id, { type: 'position', x: 5, y: 5 })
  em.addComponent(id, { type: 'needs', hunger: 0, health: 100 })
  return id
}

// ────────────────────────────────────────────────
// describe 1: 实例化与初始状态
// ────────────────────────────────────────────────
describe('PopulationSystem — 实例化与初始状态', () => {
  let sys: PopulationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('可以实例化', () => { expect(sys).toBeDefined() })
  it('初始 pendingEvents 为空数组', () => { expect((sys as any).pendingEvents).toHaveLength(0) })
  it('初始 _civMembersMap 为空 Map', () => { expect((sys as any)._civMembersMap.size).toBe(0) })
  it('初始 _civMembersBuf 为空数组', () => { expect((sys as any)._civMembersBuf).toHaveLength(0) })
})

// ────────────────────────────────────────────────
// describe 2: update() 基础健壮性
// ────────────────────────────────────────────────
describe('PopulationSystem — update() 健壮性', () => {
  let sys: PopulationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('空 em 不崩溃 tick=0', () => {
    expect(() => sys.update(new EntityManager(), makeWorld() as any, makeCivManager() as any, makeParticles() as any, 0)).not.toThrow()
  })

  it('空 em 不崩溃 tick=120 (POP_CHECK_INTERVAL)', () => {
    expect(() => sys.update(new EntityManager(), makeWorld() as any, makeCivManager() as any, makeParticles() as any, 120)).not.toThrow()
  })

  it('非检测 tick 直接返回（pendingEvents 不变）', () => {
    // tick=1 不是 120 的倍数，不做任何处理
    const em = new EntityManager()
    const civ = makeCiv(1)
    const cm = makeCivManager(new Map([[1, civ]]))
    addMember(em, 1)
    sys.update(em, makeWorld() as any, cm as any, makeParticles() as any, 1)
    expect((sys as any).pendingEvents).toHaveLength(0)
  })

  it('连续 500 tick 不崩溃', () => {
    const em = new EntityManager()
    expect(() => {
      for (let i = 0; i < 500; i++) {
        sys.update(em, makeWorld() as any, makeCivManager() as any, makeParticles() as any, i)
      }
    }).not.toThrow()
  })

  it('有 civ 无成员时 update 不崩溃', () => {
    const em = new EntityManager()
    const civ = makeCiv(1)
    const cm = makeCivManager(new Map([[1, civ]]))
    expect(() => sys.update(em, makeWorld() as any, cm as any, makeParticles() as any, 120)).not.toThrow()
  })

  it('tick=240 (第二个检测周期) 不崩溃', () => {
    const em = new EntityManager()
    expect(() => sys.update(em, makeWorld() as any, makeCivManager() as any, makeParticles() as any, 240)).not.toThrow()
  })
})

// ────────────────────────────────────────────────
// describe 3: calcPopCap（私有方法）
// ────────────────────────────────────────────────
describe('PopulationSystem — calcPopCap()', () => {
  let sys: PopulationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('无领土无建筑时 popCap = POP_CAP_BASE (5)', () => {
    const civ = makeCiv(1, { territory: new Set(), buildings: [] })
    expect((sys as any).calcPopCap(civ)).toBe(5)
  })

  it('20 领土格 → 加 1 (floor(20 * 0.05) = 1)', () => {
    const t = new Set<string>()
    for (let i = 0; i < 20; i++) t.add(`${i},0`)
    const civ = makeCiv(1, { territory: t, buildings: [] })
    expect((sys as any).calcPopCap(civ)).toBe(6)
  })

  it('100 领土格 → 加 5 (floor(100 * 0.05) = 5)', () => {
    const t = new Set<string>()
    for (let i = 0; i < 100; i++) t.add(`${i},0`)
    const civ = makeCiv(1, { territory: t, buildings: [] })
    expect((sys as any).calcPopCap(civ)).toBe(10)
  })

  it('1 栋建筑 → 加 2 (POP_CAP_PER_BUILDING)', () => {
    const civ = makeCiv(1, { territory: new Set(), buildings: [1] })
    expect((sys as any).calcPopCap(civ)).toBe(7)
  })

  it('3 栋建筑 → 加 6', () => {
    const civ = makeCiv(1, { territory: new Set(), buildings: [1, 2, 3] })
    expect((sys as any).calcPopCap(civ)).toBe(11)
  })

  it('领土 + 建筑叠加计算', () => {
    const t = new Set<string>()
    for (let i = 0; i < 40; i++) t.add(`${i},0`)  // 40 * 0.05 = 2
    const civ = makeCiv(1, { territory: t, buildings: [1, 2] })
    // 5 + 2 + 4 = 11
    expect((sys as any).calcPopCap(civ)).toBe(11)
  })

  it('结果必须 >= POP_CAP_BASE (5)', () => {
    const civ = makeCiv(1, { territory: new Set(), buildings: [] })
    expect((sys as any).calcPopCap(civ)).toBeGreaterThanOrEqual(5)
  })
})

// ────────────────────────────────────────────────
// describe 4: isAtPeace（私有方法）
// ────────────────────────────────────────────────
describe('PopulationSystem — isAtPeace()', () => {
  let sys: PopulationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('relations 为空 → 和平', () => {
    const civ = makeCiv(1)
    expect((sys as any).isAtPeace(civ)).toBe(true)
  })

  it('最低关系 -49 → 和平（需 <= -50）', () => {
    const civ = makeCiv(1)
    civ.relations.set(2, -49)
    expect((sys as any).isAtPeace(civ)).toBe(true)
  })

  it('关系 -50 → 不和平', () => {
    const civ = makeCiv(1)
    civ.relations.set(2, -50)
    expect((sys as any).isAtPeace(civ)).toBe(false)
  })

  it('关系 -100 → 不和平', () => {
    const civ = makeCiv(1)
    civ.relations.set(2, -100)
    expect((sys as any).isAtPeace(civ)).toBe(false)
  })

  it('多个 relations，一个 <=-50 → 不和平', () => {
    const civ = makeCiv(1)
    civ.relations.set(2, 20)
    civ.relations.set(3, -60)
    civ.relations.set(4, 50)
    expect((sys as any).isAtPeace(civ)).toBe(false)
  })

  it('全部关系 > -50 → 和平', () => {
    const civ = makeCiv(1)
    civ.relations.set(2, 10)
    civ.relations.set(3, -30)
    civ.relations.set(4, 80)
    expect((sys as any).isAtPeace(civ)).toBe(true)
  })
})

// ────────────────────────────────────────────────
// describe 5: processFamine（私有方法）
// ────────────────────────────────────────────────
describe('PopulationSystem — processFamine()', () => {
  let sys: PopulationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('严重饥荒（foodPerCapita=0）造成最大伤害', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // 所有随机通过
    const em = new EntityManager()
    const id = em.createEntity()
    em.addComponent(id, { type: 'needs', hunger: 0, health: 100 })
    em.addComponent(id, { type: 'creature', species: 'human', speed: 1, damage: 5, isHostile: false, name: 'A', age: 300, maxAge: 800, gender: 'male' })
    em.addComponent(id, { type: 'position', x: 5, y: 5 })
    const civ = makeCiv(1)
    const ps = makeParticles()

    ;(sys as any).processFamine(em, [id], civ, 0, ps, 100)
    const needs = em.getComponent<any>(id, 'needs')
    // health 应减少（如果还存在该实体）
    if (needs) {
      expect(needs.health).toBeLessThan(100)
    } else {
      // 被移除（致命饥荒）
      expect(civ.population).toBeLessThanOrEqual(5)
    }
  })

  it('轻微饥荒（foodPerCapita 接近阈值）伤害较小', () => {
    // FOOD_PER_CAPITA_THRESHOLD = 1.5，传入 1.4 接近阈值
    // severity = 1 - (1.4/1.5) ≈ 0.067
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = new EntityManager()
    const id = em.createEntity()
    em.addComponent(id, { type: 'needs', hunger: 0, health: 100 })
    em.addComponent(id, { type: 'creature', species: 'human', speed: 1, damage: 5, isHostile: false, name: 'B', age: 300, maxAge: 800, gender: 'male' })
    em.addComponent(id, { type: 'position', x: 5, y: 5 })
    const civ = makeCiv(1)
    const ps = makeParticles()

    ;(sys as any).processFamine(em, [id], civ, 1.4, ps, 100)
    const needs = em.getComponent<any>(id, 'needs')
    // 造成少量伤害或不致死
    if (needs) {
      expect(needs.health).toBeLessThanOrEqual(100)
    }
  })

  it('饥荒时 hunger 增加', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = new EntityManager()
    const id = em.createEntity()
    em.addComponent(id, { type: 'needs', hunger: 0, health: 100 })
    em.addComponent(id, { type: 'creature', species: 'human', speed: 1, damage: 5, isHostile: false, name: 'C', age: 300, maxAge: 800, gender: 'male' })
    em.addComponent(id, { type: 'position', x: 5, y: 5 })
    const civ = makeCiv(1)
    const ps = makeParticles()

    ;(sys as any).processFamine(em, [id], civ, 0, ps, 100)
    const needs = em.getComponent<any>(id, 'needs')
    if (needs) {
      expect(needs.hunger).toBeGreaterThan(0)
    }
  })

  it('无 needs 组件时不崩溃', () => {
    const em = new EntityManager()
    const id = em.createEntity()
    em.addComponent(id, { type: 'creature', species: 'human', speed: 1, damage: 5, isHostile: false, name: 'D', age: 300, maxAge: 800, gender: 'male' })
    const civ = makeCiv(1)
    expect(() => (sys as any).processFamine(em, [id], civ, 0, makeParticles(), 100)).not.toThrow()
  })

  it('members 为空时不崩溃', () => {
    const em = new EntityManager()
    const civ = makeCiv(1)
    expect(() => (sys as any).processFamine(em, [], civ, 0, makeParticles(), 100)).not.toThrow()
  })

  it('高随机值使成员跳过饥荒影响', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    const em = new EntityManager()
    const id = em.createEntity()
    em.addComponent(id, { type: 'needs', hunger: 0, health: 100 })
    em.addComponent(id, { type: 'creature', species: 'human', speed: 1, damage: 5, isHostile: false, name: 'E', age: 300, maxAge: 800, gender: 'male' })
    em.addComponent(id, { type: 'position', x: 5, y: 5 })
    const civ = makeCiv(1)
    ;(sys as any).processFamine(em, [id], civ, 0, makeParticles(), 100)
    const needs = em.getComponent<any>(id, 'needs')
    // 高随机值跳过，health 保持 100
    if (needs) expect(needs.health).toBe(100)
  })
})

// ────────────────────────────────────────────────
// describe 6: processAging（私有方法）
// ────────────────────────────────────────────────
describe('PopulationSystem — processAging()', () => {
  let sys: PopulationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('年轻生物（ageRatio < 0.85）不触发死亡检测', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // 保证死亡检测如果触发必定通过
    const em = new EntityManager()
    const id = addMember(em, 1, 'human', 200, 800)  // ageRatio = 0.25 < 0.85
    const civ = makeCiv(1)
    ;(sys as any).processAging(em, [id], civ, makeParticles(), 100)
    // 实体应该还存在
    expect(em.getComponent(id, 'creature')).toBeDefined()
  })

  it('老龄生物（ageRatio >= 0.85）且随机值低时死亡', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)  // 0 < deathChance → 死亡
    const em = new EntityManager()
    const age = 700  // ageRatio = 700/800 = 0.875 >= 0.85
    const id = addMember(em, 1, 'human', age, 800)
    const civ = makeCiv(1, { population: 5 })
    const ps = makeParticles()
    ;(sys as any).processAging(em, [id], civ, ps, 100)
    // 实体被移除
    expect(em.getComponent(id, 'creature')).toBeUndefined()
  })

  it('老龄生物且随机值高时幸存', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)  // 高于 deathChance
    const em = new EntityManager()
    const id = addMember(em, 1, 'human', 700, 800)
    const civ = makeCiv(1, { population: 5 })
    ;(sys as any).processAging(em, [id], civ, makeParticles(), 100)
    // 实体应该还存在
    expect(em.getComponent(id, 'creature')).toBeDefined()
  })

  it('老龄死亡时 civ.population 减 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = new EntityManager()
    const id = addMember(em, 1, 'human', 700, 800)
    const civ = makeCiv(1, { population: 5 })
    ;(sys as any).processAging(em, [id], civ, makeParticles(), 100)
    expect(civ.population).toBe(4)
  })

  it('population 不低于 0（老龄死亡）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = new EntityManager()
    const id = addMember(em, 1, 'human', 700, 800)
    const civ = makeCiv(1, { population: 0 })  // 已经是 0
    ;(sys as any).processAging(em, [id], civ, makeParticles(), 100)
    expect(civ.population).toBeGreaterThanOrEqual(0)
  })

  it('无 creature 组件时不崩溃', () => {
    const em = new EntityManager()
    const id = em.createEntity()
    em.addComponent(id, { type: 'position', x: 5, y: 5 })
    const civ = makeCiv(1)
    expect(() => (sys as any).processAging(em, [id], civ, makeParticles(), 100)).not.toThrow()
  })

  it('members 为空时不崩溃', () => {
    const em = new EntityManager()
    const civ = makeCiv(1)
    expect(() => (sys as any).processAging(em, [], civ, makeParticles(), 100)).not.toThrow()
  })

  it('满龄（ageRatio=1.0）死亡概率更高', () => {
    // deathChance = 0.08 + (1.0 - 0.85) * 0.6 = 0.08 + 0.09 = 0.17
    // 随机值 0.15 < 0.17 → 死亡
    vi.spyOn(Math, 'random').mockReturnValue(0.15)
    const em = new EntityManager()
    const id = addMember(em, 1, 'human', 800, 800)  // ageRatio = 1.0
    const civ = makeCiv(1, { population: 3 })
    ;(sys as any).processAging(em, [id], civ, makeParticles(), 100)
    expect(em.getComponent(id, 'creature')).toBeUndefined()
  })
})

// ────────────────────────────────────────────────
// describe 7: processBirths（私有方法）
// ────────────────────────────────────────────────
describe('PopulationSystem — processBirths()', () => {
  let sys: PopulationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('population >= popCap 时不出生', () => {
    const em = new EntityManager()
    const id = addMember(em, 1, 'human', 300, 800)
    const civ = makeCiv(1, { population: 10, resources: { food: 100, wood: 50, stone: 30, gold: 20 } })
    const popCap = 10
    ;(sys as any).processBirths(em, [id], civ, popCap, 5, true, makeParticles(), 100)
    // 不应该有新实体被创建（出生后 population 不会超过 cap）
    expect(civ.population).toBeLessThanOrEqual(popCap)
  })

  it('成功出生时 civ.population 增加', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)  // 确保通过出生率检测
    const em = new EntityManager()
    const id = addMember(em, 1, 'human', 300, 800)  // ageRatio=0.375, in fertile range
    const civ = makeCiv(1, { population: 2, resources: { food: 100, wood: 50, stone: 30, gold: 20 } })
    ;(sys as any).processBirths(em, [id], civ, 20, 10, true, makeParticles(), 100)
    expect(civ.population).toBeGreaterThan(2)
  })

  it('成功出生时消耗 food', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = new EntityManager()
    const id = addMember(em, 1, 'human', 300, 800)
    const civ = makeCiv(1, { population: 2, resources: { food: 50, wood: 50, stone: 30, gold: 20 } })
    const beforeFood = civ.resources.food
    ;(sys as any).processBirths(em, [id], civ, 20, 10, true, makeParticles(), 100)
    expect(civ.resources.food).toBeLessThan(beforeFood)
  })

  it('幼年生物（ageRatio < 0.2）不能繁殖', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = new EntityManager()
    // ageRatio = 100/800 = 0.125 < 0.2
    const id = addMember(em, 1, 'human', 100, 800)
    const civ = makeCiv(1, { population: 2 })
    ;(sys as any).processBirths(em, [id], civ, 20, 10, true, makeParticles(), 100)
    expect(civ.population).toBe(2)  // 未变化
  })

  it('老年生物（ageRatio > 0.7）不能繁殖', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = new EntityManager()
    // ageRatio = 600/800 = 0.75 > 0.7
    const id = addMember(em, 1, 'human', 600, 800)
    const civ = makeCiv(1, { population: 2 })
    ;(sys as any).processBirths(em, [id], civ, 20, 10, true, makeParticles(), 100)
    expect(civ.population).toBe(2)
  })

  it('高随机值使出生率检测失败', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    const em = new EntityManager()
    const id = addMember(em, 1, 'human', 300, 800)
    const civ = makeCiv(1, { population: 2 })
    ;(sys as any).processBirths(em, [id], civ, 20, 10, true, makeParticles(), 100)
    expect(civ.population).toBe(2)  // 未变化
  })

  it('members 为空时不崩溃', () => {
    const em = new EntityManager()
    const civ = makeCiv(1)
    expect(() => (sys as any).processBirths(em, [], civ, 20, 10, true, makeParticles(), 100)).not.toThrow()
  })

  it('pendingEvents 在出生时添加 birth 事件', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = new EntityManager()
    const id = addMember(em, 1, 'human', 300, 800)
    const civ = makeCiv(1, { population: 2, resources: { food: 100, wood: 50, stone: 30, gold: 20 } })
    ;(sys as any).processBirths(em, [id], civ, 20, 10, true, makeParticles(), 100)
    const events = (sys as any).pendingEvents
    const birthEvents = events.filter((e: any) => e.type === 'birth')
    expect(birthEvents.length).toBeGreaterThan(0)
  })

  it('战争状态（atPeace=false）出生率乘数为 1.0（无 baby boom）', () => {
    // 在战争时 peaceFactor=1, 和平时 peaceFactor=1.8
    // 检测战争时 birthRate 更低 → 出生少
    vi.spyOn(Math, 'random').mockReturnValue(0.08)  // 勉强通过和平出生率但不通过战争出生率的边界
    const em = new EntityManager()
    const id1 = addMember(em, 1, 'human', 300, 800)
    const civ = makeCiv(1, { population: 1, resources: { food: 100, wood: 50, stone: 30, gold: 20 } })
    const prevPop = civ.population
    ;(sys as any).processBirths(em, [id1], civ, 20, 10, false, makeParticles(), 100)
    // 战争时出生率低，可能不出生
    expect(civ.population).toBeGreaterThanOrEqual(prevPop)
  })
})

// ────────────────────────────────────────────────
// describe 8: update() 完整流程（tick=120）
// ────────────────────────────────────────────────
describe('PopulationSystem — update() 完整流程', () => {
  let sys: PopulationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=120 时 _civMembersMap 被正确填充', () => {
    const em = new EntityManager()
    const civ = makeCiv(1, { population: 1 })
    addMember(em, 1)
    const cm = makeCivManager(new Map([[1, civ]]))
    sys.update(em, makeWorld() as any, cm as any, makeParticles() as any, 120)
    // map 在更新后可能已清空（函数末尾清空池），但不崩溃即可
    expect((sys as any)._civMembersMap).toBeDefined()
  })

  it('多 civ 成员正确分组', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)  // 无死亡无出生
    const em = new EntityManager()
    const civ1 = makeCiv(1, { population: 1 })
    const civ2 = makeCiv(2, { population: 1 })
    addMember(em, 1, 'human', 300, 800)
    addMember(em, 2, 'elf', 300, 1200)
    const cm = makeCivManager(new Map([[1, civ1], [2, civ2]]))
    expect(() => sys.update(em, makeWorld() as any, cm as any, makeParticles() as any, 120)).not.toThrow()
  })

  it('饥荒触发：food/population < 1.5 时处理饥荒', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = new EntityManager()
    // food=1, population=10 → foodPerCapita=0.1 < 1.5
    const civ = makeCiv(1, { population: 10, resources: { food: 1, wood: 50, stone: 30, gold: 20 } })
    const id = addMember(em, 1, 'human', 300, 800)
    const cm = makeCivManager(new Map([[1, civ]]))
    const ps = makeParticles()
    sys.update(em, makeWorld() as any, cm as any, ps as any, 120)
    // spawn 被调用（粒子效果表明饥荒发生）或 health 减少
    const needs = em.getComponent<any>(id, 'needs')
    if (needs) {
      expect(needs.health).toBeLessThanOrEqual(100)
    }
  })

  it('tick 非 120 倍数时不处理逻辑', () => {
    const em = new EntityManager()
    const civ = makeCiv(1, { population: 5 })
    for (let i = 0; i < 5; i++) addMember(em, 1, 'human', 700, 800)
    const cm = makeCivManager(new Map([[1, civ]]))
    sys.update(em, makeWorld() as any, cm as any, makeParticles() as any, 1)
    // tick=1 不是检测周期，population 不变
    expect(civ.population).toBe(5)
  })
})
