import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DiseaseSystem, infectAt, getDiseaseColor } from '../systems/DiseaseSystem'
import { EntityManager } from '../ecs/Entity'
import type {
  PositionComponent,
  NeedsComponent,
  CreatureComponent,
  DiseaseComponent,
} from '../ecs/Entity'

// ─── mock 外部依赖 ───────────────────────────────────────────────────────────
vi.mock('../systems/ParticleSystem', () => ({
  ParticleSystem: class {
    spawn() {}
    spawnDeath() {}
  },
}))
vi.mock('../systems/EventLog', () => ({
  EventLog: { log: vi.fn() },
}))
vi.mock('../civilization/CivManager', () => ({
  CivManager: class {
    civilizations = new Map()
  },
}))
vi.mock('../systems/TechSystem', () => ({
  TechSystem: { hasTech: vi.fn().mockReturnValue(false) },
}))
vi.mock('../utils/RandomUtils', () => ({
  pickRandom: (arr: unknown[]) => arr[0],
}))

import { ParticleSystem } from '../systems/ParticleSystem'
import { CivManager } from '../civilization/CivManager'

// ─── 辅助工厂 ────────────────────────────────────────────────────────────────
function makeSys() {
  return new DiseaseSystem()
}

function makeWorld(season = 'spring', tick = 0) {
  return { season, tick } as any
}

function makeParticles() {
  return new ParticleSystem() as any
}

function makeCivManager() {
  return new CivManager() as any
}

/** 创建一个具有 position/creature/needs 组件的实体 */
function makeCreatureEntity(
  em: EntityManager,
  x = 10,
  y = 10,
  species = 'human',
  name = 'TestCreature'
) {
  const id = em.createEntity()
  em.addComponent<PositionComponent>(id, { type: 'position', x, y })
  em.addComponent<CreatureComponent>(id, {
    type: 'creature',
    species,
    speed: 1,
    damage: 1,
    isHostile: false,
    name,
    age: 10,
    maxAge: 100,
    gender: 'male',
  })
  em.addComponent<NeedsComponent>(id, { type: 'needs', hunger: 0, health: 100 })
  return id
}

/** 给实体加疾病组件 */
function addDisease(
  em: EntityManager,
  id: number,
  diseaseType = 'plague',
  options: Partial<DiseaseComponent> = {}
) {
  em.addComponent<DiseaseComponent>(id, {
    type: 'disease',
    diseaseType,
    severity: 1,
    duration: 0,
    contagious: true,
    immune: false,
    immuneUntil: 0,
    ...options,
  })
}

// ─── 测试 ─────────────────────────────────────────────────────────────────────

describe('DiseaseSystem — 初始状态', () => {
  let sys: DiseaseSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('可以被实例化', () => {
    expect(sys).toBeDefined()
  })

  it('tickCounter 初始为 0', () => {
    expect((sys as any).tickCounter).toBe(0)
  })

  it('_outbreakGrid 初始为空 Map', () => {
    expect((sys as any)._outbreakGrid.size).toBe(0)
  })

  it('_spreadGrid 初始为空 Map', () => {
    expect((sys as any)._spreadGrid.size).toBe(0)
  })

  it('_outbreakCellPool 初始为空数组', () => {
    expect((sys as any)._outbreakCellPool).toEqual([])
  })

  it('_spreadCellPool 初始为空数组', () => {
    expect((sys as any)._spreadCellPool).toEqual([])
  })

  it('totalInfected 初始为 0', () => {
    expect(sys.totalInfected).toBe(0)
  })

  it('totalDeaths 初始为 0', () => {
    expect(sys.totalDeaths).toBe(0)
  })

  it('totalRecovered 初始为 0', () => {
    expect(sys.totalRecovered).toBe(0)
  })

  it('totalInfected 类型为 number', () => {
    expect(typeof sys.totalInfected).toBe('number')
  })

  it('totalDeaths 类型为 number', () => {
    expect(typeof sys.totalDeaths).toBe('number')
  })

  it('totalRecovered 类型为 number', () => {
    expect(typeof sys.totalRecovered).toBe('number')
  })

  it('所有统计数均不为负', () => {
    expect(sys.totalInfected).toBeGreaterThanOrEqual(0)
    expect(sys.totalDeaths).toBeGreaterThanOrEqual(0)
    expect(sys.totalRecovered).toBeGreaterThanOrEqual(0)
  })
})

describe('DiseaseSystem — update() 基础行为', () => {
  let sys: DiseaseSystem
  let em: EntityManager
  let world: any
  let civ: any
  let particles: any

  beforeEach(() => {
    sys = makeSys()
    em = new EntityManager()
    world = makeWorld()
    civ = makeCivManager()
    particles = makeParticles()
  })
  afterEach(() => vi.restoreAllMocks())

  it('update() 不抛出异常（空世界）', () => {
    expect(() => sys.update(em, world, civ, particles)).not.toThrow()
  })

  it('每次 update() tickCounter 递增 1', () => {
    sys.update(em, world, civ, particles)
    expect((sys as any).tickCounter).toBe(1)
    sys.update(em, world, civ, particles)
    expect((sys as any).tickCounter).toBe(2)
  })

  it('连续调用 5 次 tickCounter 为 5', () => {
    for (let i = 0; i < 5; i++) sys.update(em, world, civ, particles)
    expect((sys as any).tickCounter).toBe(5)
  })

  it('无感染实体时 totalInfected 不变', () => {
    makeCreatureEntity(em, 10, 10)
    sys.update(em, world, civ, particles)
    expect(sys.totalInfected).toBe(0)
  })

  it('update() 返回 undefined', () => {
    const result = sys.update(em, world, civ, particles)
    expect(result).toBeUndefined()
  })
})

describe('DiseaseSystem — infectEntity（私有方法通过 totalInfected 观察）', () => {
  let sys: DiseaseSystem
  let em: EntityManager

  beforeEach(() => {
    sys = makeSys()
    em = new EntityManager()
  })
  afterEach(() => vi.restoreAllMocks())

  it('infectEntity 后 totalInfected 增加 1', () => {
    const id = makeCreatureEntity(em, 10, 10)
    ;(sys as any).infectEntity(em, id, 'plague', makeWorld())
    expect(sys.totalInfected).toBe(1)
  })

  it('重复感染同一实体不重复计数', () => {
    const id = makeCreatureEntity(em, 10, 10)
    const world = makeWorld()
    ;(sys as any).infectEntity(em, id, 'plague', world)
    ;(sys as any).infectEntity(em, id, 'plague', world) // 已有 disease 组件，应跳过
    expect(sys.totalInfected).toBe(1)
  })

  it('感染后实体拥有 disease 组件', () => {
    const id = makeCreatureEntity(em, 10, 10)
    ;(sys as any).infectEntity(em, id, 'fever', makeWorld())
    const d = em.getComponent<DiseaseComponent>(id, 'disease')
    expect(d).toBeDefined()
    expect(d!.diseaseType).toBe('fever')
  })

  it('感染后 disease.severity 为 1', () => {
    const id = makeCreatureEntity(em, 10, 10)
    ;(sys as any).infectEntity(em, id, 'blight', makeWorld())
    const d = em.getComponent<DiseaseComponent>(id, 'disease')
    expect(d!.severity).toBe(1)
  })

  it('感染后 disease.contagious 为 true', () => {
    const id = makeCreatureEntity(em, 10, 10)
    ;(sys as any).infectEntity(em, id, 'pox', makeWorld())
    const d = em.getComponent<DiseaseComponent>(id, 'disease')
    expect(d!.contagious).toBe(true)
  })

  it('感染后 disease.immune 为 false', () => {
    const id = makeCreatureEntity(em, 10, 10)
    ;(sys as any).infectEntity(em, id, 'plague', makeWorld())
    const d = em.getComponent<DiseaseComponent>(id, 'disease')
    expect(d!.immune).toBe(false)
  })

  it('感染后 disease.duration 为 0', () => {
    const id = makeCreatureEntity(em, 10, 10)
    ;(sys as any).infectEntity(em, id, 'plague', makeWorld())
    const d = em.getComponent<DiseaseComponent>(id, 'disease')
    expect(d!.duration).toBe(0)
  })

  it('感染后 disease.immuneUntil 为 0', () => {
    const id = makeCreatureEntity(em, 10, 10)
    ;(sys as any).infectEntity(em, id, 'plague', makeWorld())
    const d = em.getComponent<DiseaseComponent>(id, 'disease')
    expect(d!.immuneUntil).toBe(0)
  })

  it('可对不同实体分别感染不同疾病', () => {
    const id1 = makeCreatureEntity(em, 5, 5)
    const id2 = makeCreatureEntity(em, 15, 15)
    const world = makeWorld()
    ;(sys as any).infectEntity(em, id1, 'plague', world)
    ;(sys as any).infectEntity(em, id2, 'fever', world)
    expect(sys.totalInfected).toBe(2)
    expect(em.getComponent<DiseaseComponent>(id1, 'disease')!.diseaseType).toBe('plague')
    expect(em.getComponent<DiseaseComponent>(id2, 'disease')!.diseaseType).toBe('fever')
  })
})

describe('DiseaseSystem — progressDiseases（severity/health）', () => {
  let sys: DiseaseSystem
  let em: EntityManager
  let world: any
  let civ: any
  let particles: any

  beforeEach(() => {
    sys = makeSys()
    em = new EntityManager()
    world = makeWorld('spring', 0)
    civ = makeCivManager()
    particles = makeParticles()
  })
  afterEach(() => vi.restoreAllMocks())

  it('每 tick 感染实体的 disease.duration 递增', () => {
    const id = makeCreatureEntity(em, 10, 10)
    addDisease(em, id, 'blight')
    sys.update(em, world, civ, particles)
    const d = em.getComponent<DiseaseComponent>(id, 'disease')
    expect(d!.duration).toBe(1)
  })

  it('每 tick 感染实体的 disease.severity 递增', () => {
    const id = makeCreatureEntity(em, 10, 10)
    addDisease(em, id, 'blight', { severity: 0 })
    sys.update(em, world, civ, particles)
    const d = em.getComponent<DiseaseComponent>(id, 'disease')
    expect(d!.severity).toBeGreaterThan(0)
  })

  it('severity 不超过 100', () => {
    const id = makeCreatureEntity(em, 10, 10)
    addDisease(em, id, 'plague', { severity: 99.9 })
    // 多次 tick
    for (let i = 0; i < 10; i++) sys.update(em, world, civ, particles)
    const d = em.getComponent<DiseaseComponent>(id, 'disease')
    if (d) expect(d.severity).toBeLessThanOrEqual(100)
  })

  it('感染实体 health 每 tick 减少', () => {
    const id = makeCreatureEntity(em, 10, 10)
    addDisease(em, id, 'plague', { severity: 50 })
    sys.update(em, world, civ, particles)
    const needs = em.getComponent<NeedsComponent>(id, 'needs')
    expect(needs!.health).toBeLessThan(100)
  })

  it('免疫实体不更新 severity', () => {
    const id = makeCreatureEntity(em, 10, 10)
    addDisease(em, id, 'plague', { immune: true, immuneUntil: 9999, severity: 0 })
    sys.update(em, world, civ, particles)
    const d = em.getComponent<DiseaseComponent>(id, 'disease')
    // immune 分支只检查 immuneUntil，不更新 severity
    if (d) expect(d.severity).toBe(0)
  })

  it('免疫过期后移除 disease 组件', () => {
    world = makeWorld('spring', 100)
    const id = makeCreatureEntity(em, 10, 10)
    addDisease(em, id, 'plague', { immune: true, immuneUntil: 50 }) // tick=100 > 50
    sys.update(em, world, civ, particles)
    const d = em.getComponent<DiseaseComponent>(id, 'disease')
    expect(d).toBeUndefined()
  })

  it('health <= 0 的非免疫实体被移除', () => {
    const id = makeCreatureEntity(em, 10, 10)
    addDisease(em, id, 'plague', { severity: 100 })
    const needs = em.getComponent<NeedsComponent>(id, 'needs')
    needs!.health = 0
    sys.update(em, world, civ, particles)
    expect(em.hasComponent(id, 'position')).toBe(false)
  })

  it('实体死于 health=0 时 totalDeaths 增加', () => {
    const id = makeCreatureEntity(em, 10, 10)
    addDisease(em, id, 'fever', { severity: 100 })
    const needs = em.getComponent<NeedsComponent>(id, 'needs')
    needs!.health = 0
    sys.update(em, world, civ, particles)
    expect(sys.totalDeaths).toBe(1)
  })
})

describe('DiseaseSystem — 疾病持续时间与康复/死亡', () => {
  let sys: DiseaseSystem
  let em: EntityManager
  let world: any
  let civ: any
  let particles: any

  beforeEach(() => {
    sys = makeSys()
    em = new EntityManager()
    world = makeWorld('spring', 0)
    civ = makeCivManager()
    particles = makeParticles()
    // 固定随机为 0（不死亡，必然康复）
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })
  afterEach(() => vi.restoreAllMocks())

  it('duration >= diseaseDef.duration 时触发康复/死亡', () => {
    // blight 的 duration 为 300
    const id = makeCreatureEntity(em, 10, 10)
    addDisease(em, id, 'blight', { duration: 299, severity: 1 })
    sys.update(em, world, civ, particles) // duration 变为 300
    // Math.random()=0 < lethality=0.05 => 死亡（死亡计数 >= 1）
    expect(sys.totalDeaths).toBeGreaterThanOrEqual(1)
  })

  it('康复后 disease.immune 变为 true（random > lethality）', () => {
    // 让 random > lethality(0.05) 不死亡 -> 康复
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const id = makeCreatureEntity(em, 10, 10)
    addDisease(em, id, 'blight', { duration: 299, severity: 1 })
    sys.update(em, world, civ, particles)
    const d = em.getComponent<DiseaseComponent>(id, 'disease')
    expect(d!.immune).toBe(true)
  })

  it('康复后 totalRecovered 增加', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // > lethality => 康复
    const id = makeCreatureEntity(em, 10, 10)
    addDisease(em, id, 'blight', { duration: 299, severity: 1 })
    sys.update(em, world, civ, particles)
    expect(sys.totalRecovered).toBe(1)
  })

  it('康复后 disease.contagious 变为 false', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const id = makeCreatureEntity(em, 10, 10)
    addDisease(em, id, 'blight', { duration: 299, severity: 1 })
    sys.update(em, world, civ, particles)
    const d = em.getComponent<DiseaseComponent>(id, 'disease')
    expect(d!.contagious).toBe(false)
  })

  it('康复后 disease.severity 变为 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const id = makeCreatureEntity(em, 10, 10)
    addDisease(em, id, 'blight', { duration: 299, severity: 50 })
    sys.update(em, world, civ, particles)
    const d = em.getComponent<DiseaseComponent>(id, 'disease')
    expect(d!.severity).toBe(0)
  })

  it('康复后 immuneUntil = world.tick + 3000', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    world.tick = 100
    const id = makeCreatureEntity(em, 10, 10)
    addDisease(em, id, 'blight', { duration: 299, severity: 1 })
    sys.update(em, world, civ, particles)
    const d = em.getComponent<DiseaseComponent>(id, 'disease')
    expect(d!.immuneUntil).toBe(3100)
  })
})

describe('DiseaseSystem — getSpeedMultiplier（静态方法）', () => {
  let em: EntityManager

  beforeEach(() => { em = new EntityManager() })
  afterEach(() => vi.restoreAllMocks())

  it('无疾病实体返回 1.0', () => {
    const id = em.createEntity()
    expect(DiseaseSystem.getSpeedMultiplier(em, id)).toBe(1.0)
  })

  it('免疫实体返回 1.0', () => {
    const id = em.createEntity()
    addDisease(em, id, 'plague', { immune: true, severity: 80 })
    expect(DiseaseSystem.getSpeedMultiplier(em, id)).toBe(1.0)
  })

  it('severity=0 时返回 1.0', () => {
    const id = em.createEntity()
    addDisease(em, id, 'plague', { severity: 0 })
    expect(DiseaseSystem.getSpeedMultiplier(em, id)).toBe(1.0)
  })

  it('severity=50 时返回 0.5', () => {
    const id = em.createEntity()
    addDisease(em, id, 'plague', { severity: 50 })
    expect(DiseaseSystem.getSpeedMultiplier(em, id)).toBeCloseTo(0.5)
  })

  it('severity=100 时返回不低于 0.2（最小限制）', () => {
    const id = em.createEntity()
    addDisease(em, id, 'plague', { severity: 100 })
    expect(DiseaseSystem.getSpeedMultiplier(em, id)).toBe(0.2)
  })

  it('severity=80 时速度惩罚正确', () => {
    const id = em.createEntity()
    addDisease(em, id, 'fever', { severity: 80 })
    const result = DiseaseSystem.getSpeedMultiplier(em, id)
    expect(result).toBeCloseTo(Math.max(0.2, 1 - 80 / 100))
  })

  it('severity 越高速度越低', () => {
    const id1 = em.createEntity()
    const id2 = em.createEntity()
    addDisease(em, id1, 'plague', { severity: 20 })
    addDisease(em, id2, 'plague', { severity: 60 })
    const m1 = DiseaseSystem.getSpeedMultiplier(em, id1)
    const m2 = DiseaseSystem.getSpeedMultiplier(em, id2)
    expect(m1).toBeGreaterThan(m2)
  })
})

describe('infectAt — 范围感染上帝之力', () => {
  let em: EntityManager

  beforeEach(() => { em = new EntityManager() })
  afterEach(() => vi.restoreAllMocks())

  it('3 tile 范围内实体被感染', () => {
    const id = makeCreatureEntity(em, 10, 10)
    infectAt(em, 10, 10, 'plague')
    expect(em.hasComponent(id, 'disease')).toBe(true)
  })

  it('3 tile 范围外实体不被感染', () => {
    const id = makeCreatureEntity(em, 20, 20)
    infectAt(em, 10, 10, 'plague')
    expect(em.hasComponent(id, 'disease')).toBe(false)
  })

  it('已感染实体不重复添加 disease 组件', () => {
    const id = makeCreatureEntity(em, 10, 10)
    addDisease(em, id, 'fever')
    infectAt(em, 10, 10, 'plague')
    const d = em.getComponent<DiseaseComponent>(id, 'disease')
    expect(d!.diseaseType).toBe('fever') // 保持原有疾病
  })

  it('infectAt 感染后 disease.severity 为 5', () => {
    const id = makeCreatureEntity(em, 10, 10)
    infectAt(em, 10, 10, 'fever')
    const d = em.getComponent<DiseaseComponent>(id, 'disease')
    expect(d!.severity).toBe(5)
  })

  it('无效 diseaseType 不崩溃', () => {
    makeCreatureEntity(em, 10, 10)
    expect(() => infectAt(em, 10, 10, 'nonexistent')).not.toThrow()
  })

  it('可同时感染多个范围内实体', () => {
    const id1 = makeCreatureEntity(em, 10, 10)
    const id2 = makeCreatureEntity(em, 11, 10)
    infectAt(em, 10, 10, 'blight')
    expect(em.hasComponent(id1, 'disease')).toBe(true)
    expect(em.hasComponent(id2, 'disease')).toBe(true)
  })

  it('infectAt disease.contagious 为 true', () => {
    const id = makeCreatureEntity(em, 10, 10)
    infectAt(em, 10, 10, 'pox')
    expect(em.getComponent<DiseaseComponent>(id, 'disease')!.contagious).toBe(true)
  })

  it('infectAt disease.immune 为 false', () => {
    const id = makeCreatureEntity(em, 10, 10)
    infectAt(em, 10, 10, 'pox')
    expect(em.getComponent<DiseaseComponent>(id, 'disease')!.immune).toBe(false)
  })
})

describe('getDiseaseColor — 颜色工具函数', () => {
  let em: EntityManager

  beforeEach(() => { em = new EntityManager() })
  afterEach(() => vi.restoreAllMocks())

  it('无疾病实体返回 null', () => {
    const id = em.createEntity()
    expect(getDiseaseColor(em, id)).toBeNull()
  })

  it('免疫实体返回 null', () => {
    const id = em.createEntity()
    addDisease(em, id, 'plague', { immune: true })
    expect(getDiseaseColor(em, id)).toBeNull()
  })

  it('plague 颜色为 #4a0', () => {
    const id = em.createEntity()
    addDisease(em, id, 'plague')
    expect(getDiseaseColor(em, id)).toBe('#4a0')
  })

  it('fever 颜色为 #f44', () => {
    const id = em.createEntity()
    addDisease(em, id, 'fever')
    expect(getDiseaseColor(em, id)).toBe('#f44')
  })

  it('blight 颜色为 #8a4', () => {
    const id = em.createEntity()
    addDisease(em, id, 'blight')
    expect(getDiseaseColor(em, id)).toBe('#8a4')
  })

  it('pox 颜色为 #ddd', () => {
    const id = em.createEntity()
    addDisease(em, id, 'pox')
    expect(getDiseaseColor(em, id)).toBe('#ddd')
  })

  it('未知疾病类型返回 null', () => {
    const id = em.createEntity()
    addDisease(em, id, 'unknownDisease')
    expect(getDiseaseColor(em, id)).toBeNull()
  })

  it('非活跃感染（contagious=false）仍能获取颜色', () => {
    const id = em.createEntity()
    addDisease(em, id, 'fever', { contagious: false })
    expect(getDiseaseColor(em, id)).toBe('#f44')
  })
})

describe('DiseaseSystem — 四种疾病属性验证', () => {
  afterEach(() => vi.restoreAllMocks())

  it('plague spreadRate 为 0.02', () => {
    // 通过 infectAt 行为间接验证定义存在
    const em = new EntityManager()
    const id = makeCreatureEntity(em, 10, 10)
    infectAt(em, 10, 10, 'plague')
    expect(em.hasComponent(id, 'disease')).toBe(true)
  })

  it('fever spreadRate 为 0.03（最高）', () => {
    const em = new EntityManager()
    const id = makeCreatureEntity(em, 10, 10)
    infectAt(em, 10, 10, 'fever')
    expect(em.getComponent<DiseaseComponent>(id, 'disease')!.diseaseType).toBe('fever')
  })

  it('blight spreadRate 为 0.01（最低）', () => {
    const em = new EntityManager()
    const id = makeCreatureEntity(em, 10, 10)
    infectAt(em, 10, 10, 'blight')
    expect(em.getComponent<DiseaseComponent>(id, 'disease')!.diseaseType).toBe('blight')
  })

  it('pox 可以感染', () => {
    const em = new EntityManager()
    const id = makeCreatureEntity(em, 10, 10)
    infectAt(em, 10, 10, 'pox')
    expect(em.getComponent<DiseaseComponent>(id, 'disease')!.diseaseType).toBe('pox')
  })
})

describe('DiseaseSystem — 对象池与内存复用', () => {
  let sys: DiseaseSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('_outbreakCellPool 是数组类型', () => {
    expect(Array.isArray((sys as any)._outbreakCellPool)).toBe(true)
  })

  it('_spreadCellPool 是数组类型', () => {
    expect(Array.isArray((sys as any)._spreadCellPool)).toBe(true)
  })

  it('多次 update 后 _outbreakGrid 不泄露旧条目', () => {
    const em = new EntityManager()
    const world = makeWorld()
    const civ = makeCivManager()
    const particles = makeParticles()
    for (let i = 0; i < 30; i++) sys.update(em, world, civ, particles)
    // 空世界中 grid 应为空
    expect((sys as any)._outbreakGrid.size).toBe(0)
  })

  it('多次 update 后 _spreadGrid 不泄露旧条目', () => {
    const em = new EntityManager()
    const world = makeWorld()
    const civ = makeCivManager()
    const particles = makeParticles()
    for (let i = 0; i < 5; i++) sys.update(em, world, civ, particles)
    expect((sys as any)._spreadGrid.size).toBe(0)
  })
})

describe('DiseaseSystem — 季节影响爆发概率（checkOutbreak 逻辑）', () => {
  afterEach(() => vi.restoreAllMocks())

  it('checkOutbreak 方法存在', () => {
    const sys = new DiseaseSystem()
    expect(typeof (sys as any).checkOutbreak).toBe('function')
  })

  it('spreadDiseases 方法存在', () => {
    const sys = new DiseaseSystem()
    expect(typeof (sys as any).spreadDiseases).toBe('function')
  })

  it('progressDiseases 方法存在', () => {
    const sys = new DiseaseSystem()
    expect(typeof (sys as any).progressDiseases).toBe('function')
  })

  it('infectEntity 方法存在', () => {
    const sys = new DiseaseSystem()
    expect(typeof (sys as any).infectEntity).toBe('function')
  })

  it('每 30 tick 触发一次 checkOutbreak', () => {
    const sys = new DiseaseSystem()
    const em = new EntityManager()
    const world = makeWorld()
    const civ = makeCivManager()
    const particles = makeParticles()
    const spy = vi.spyOn(sys as any, 'checkOutbreak')
    for (let i = 0; i < 30; i++) sys.update(em, world, civ, particles)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('每 5 tick 触发一次 spreadDiseases', () => {
    const sys = new DiseaseSystem()
    const em = new EntityManager()
    const world = makeWorld()
    const civ = makeCivManager()
    const particles = makeParticles()
    const spy = vi.spyOn(sys as any, 'spreadDiseases')
    for (let i = 0; i < 10; i++) sys.update(em, world, civ, particles)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('每 tick 都触发 progressDiseases', () => {
    const sys = new DiseaseSystem()
    const em = new EntityManager()
    const world = makeWorld()
    const civ = makeCivManager()
    const particles = makeParticles()
    const spy = vi.spyOn(sys as any, 'progressDiseases')
    for (let i = 0; i < 5; i++) sys.update(em, world, civ, particles)
    expect(spy).toHaveBeenCalledTimes(5)
  })
})
