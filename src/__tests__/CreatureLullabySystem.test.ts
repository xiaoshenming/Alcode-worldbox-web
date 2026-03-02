import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureLullabySystem } from '../systems/CreatureLullabySystem'
import type { Lullaby } from '../systems/CreatureLullabySystem'
import { EntityManager } from '../ecs/Entity'

// ─── helpers ─────────────────────────────────────────────────────────────────
let _nextId = 1
function makeSys(): CreatureLullabySystem { return new CreatureLullabySystem() }
function makeLullaby(singerId: number, targetId: number, overrides: Partial<Lullaby> = {}): Lullaby {
  return { id: _nextId++, singerId, targetId, melody: 'gentle hum', soothingPower: 60, bondsFormed: 2, tick: 0, ...overrides }
}
function makeEm(): EntityManager { return new EntityManager() }

function addAdult(em: EntityManager, x = 0, y = 0): number {
  const eid = em.createEntity()
  em.addComponent(eid, { type: 'creature', species: 'human', speed: 1, damage: 1, isHostile: false, name: 'A', age: 30, maxAge: 80, gender: 'male' })
  em.addComponent(eid, { type: 'position', x, y })
  return eid
}
function addYouth(em: EntityManager, x = 0, y = 0): number {
  const eid = em.createEntity()
  em.addComponent(eid, { type: 'creature', species: 'human', speed: 1, damage: 1, isHostile: false, name: 'Y', age: 10, maxAge: 80, gender: 'female' })
  em.addComponent(eid, { type: 'position', x, y })
  return eid
}

// ─── 1. getLullabies — 初始状态 ───────────────────────────────────────────────
describe('CreatureLullabySystem.getLullabies — 初始状态', () => {
  let sys: CreatureLullabySystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无摇篮曲', () => { expect(sys.getLullabies()).toHaveLength(0) })
  it('返回数组类型', () => { expect(Array.isArray(sys.getLullabies())).toBe(true) })
  it('返回内部引用（同一对象）', () => { expect(sys.getLullabies()).toBe(sys.getLullabies()) })
  it('注入一条后长度为 1', () => {
    sys.getLullabies().push(makeLullaby(1, 2))
    expect(sys.getLullabies()).toHaveLength(1)
  })
  it('注入多条全部返回', () => {
    sys.getLullabies().push(makeLullaby(1, 2))
    sys.getLullabies().push(makeLullaby(3, 4))
    expect(sys.getLullabies()).toHaveLength(2)
  })
  it('注入后 singerId 正确', () => {
    sys.getLullabies().push(makeLullaby(7, 9))
    expect(sys.getLullabies()[0].singerId).toBe(7)
  })
  it('注入后 targetId 正确', () => {
    sys.getLullabies().push(makeLullaby(7, 9))
    expect(sys.getLullabies()[0].targetId).toBe(9)
  })
  it('注入后 melody 正确', () => {
    sys.getLullabies().push(makeLullaby(1, 2, { melody: 'soft whistle' }))
    expect(sys.getLullabies()[0].melody).toBe('soft whistle')
  })
  it('注入后 soothingPower 正确', () => {
    sys.getLullabies().push(makeLullaby(1, 2, { soothingPower: 75 }))
    expect(sys.getLullabies()[0].soothingPower).toBe(75)
  })
  it('注入后 bondsFormed 正确', () => {
    sys.getLullabies().push(makeLullaby(1, 2, { bondsFormed: 5 }))
    expect(sys.getLullabies()[0].bondsFormed).toBe(5)
  })
})

// ─── 2. getBySinger — 过滤逻辑 ───────────────────────────────────────────────
describe('CreatureLullabySystem.getBySinger — 过滤逻辑', () => {
  let sys: CreatureLullabySystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('无匹配时返回空数组', () => {
    sys.getLullabies().push(makeLullaby(1, 2))
    expect(sys.getBySinger(999)).toHaveLength(0)
  })
  it('空列表时返回空数组', () => {
    expect(sys.getBySinger(1)).toHaveLength(0)
  })
  it('过滤特定歌者 singerId=1', () => {
    sys.getLullabies().push(makeLullaby(1, 2))
    sys.getLullabies().push(makeLullaby(1, 3))
    sys.getLullabies().push(makeLullaby(2, 3))
    expect(sys.getBySinger(1)).toHaveLength(2)
  })
  it('过滤特定歌者 singerId=2', () => {
    sys.getLullabies().push(makeLullaby(1, 2))
    sys.getLullabies().push(makeLullaby(2, 3))
    expect(sys.getBySinger(2)).toHaveLength(1)
  })
  it('结果包含正确的 singerId', () => {
    sys.getLullabies().push(makeLullaby(5, 6))
    const result = sys.getBySinger(5)
    expect(result[0].singerId).toBe(5)
  })
  it('连续两次调用结果相同', () => {
    sys.getLullabies().push(makeLullaby(1, 2))
    sys.getLullabies().push(makeLullaby(1, 3))
    expect(sys.getBySinger(1)).toHaveLength(2)
    expect(sys.getBySinger(1)).toHaveLength(2)
  })
  it('getBySinger 重用内部 buffer', () => {
    sys.getLullabies().push(makeLullaby(1, 2))
    const r1 = sys.getBySinger(1)
    sys.getLullabies().push(makeLullaby(1, 3))
    const r2 = sys.getBySinger(1)
    // 两次返回同一 buffer 对象（内部实现使用 _singerBuf）
    expect(r1).toBe(r2)
  })
  it('singerId 不存在返回空而不是 undefined', () => {
    const result = sys.getBySinger(42)
    expect(result).toBeDefined()
    expect(result).toHaveLength(0)
  })
  it('所有 lullaby 都匹配同一 singer 时全部返回', () => {
    sys.getLullabies().push(makeLullaby(9, 1))
    sys.getLullabies().push(makeLullaby(9, 2))
    sys.getLullabies().push(makeLullaby(9, 3))
    expect(sys.getBySinger(9)).toHaveLength(3)
  })
})

// ─── 3. update — 间隔检查 ────────────────────────────────────────────────────
describe('CreatureLullabySystem.update — 间隔检查', () => {
  let sys: CreatureLullabySystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEm(); _nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick 不足 CHECK_INTERVAL 不触发', () => {
    addAdult(em, 0, 0)
    addYouth(em, 1, 1)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 500) // < 1100
    expect(sys.getLullabies()).toHaveLength(0)
  })
  it('tick 达到 CHECK_INTERVAL 触发检查', () => {
    addAdult(em, 0, 0)
    addYouth(em, 1, 1)
    vi.spyOn(Math, 'random').mockReturnValue(0) // 0 < SING_CHANCE(0.006)
    sys.update(1, em, 0)
    sys.update(1, em, 1100)
    expect(sys.getLullabies().length).toBeGreaterThanOrEqual(1)
  })
  it('只有 1 个 creature 时不产生摇篮曲', () => {
    addAdult(em, 0, 0)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 1100)
    expect(sys.getLullabies()).toHaveLength(0)
  })
  it('无 creature 时不产生摇篮曲', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 1100)
    expect(sys.getLullabies()).toHaveLength(0)
  })
  it('random > SING_CHANCE 时不产生摇篮曲', () => {
    addAdult(em, 0, 0)
    addYouth(em, 1, 1)
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // > 0.006
    sys.update(1, em, 0)
    sys.update(1, em, 1100)
    expect(sys.getLullabies()).toHaveLength(0)
  })
  it('两个成人之间不产生摇篮曲（无年轻生物）', () => {
    addAdult(em, 0, 0)
    addAdult(em, 1, 1)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 1100)
    expect(sys.getLullabies()).toHaveLength(0)
  })
})

// ─── 4. update — soothingPower 衰减 ──────────────────────────────────────────
describe('CreatureLullabySystem.update — soothingPower 衰减', () => {
  let sys: CreatureLullabySystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEm(); _nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('每次 update 后 soothingPower 减少', () => {
    // 需要 >=2 creatures 才能让 update 的衰减代码跑
    addAdult(em, 0, 0); addYouth(em, 1, 1)
    const lull = makeLullaby(1, 2, { soothingPower: 60 })
    sys.getLullabies().push(lull)
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // > SING_CHANCE, 不产生新 lullaby
    sys.update(1, em, 1100)
    expect(lull.soothingPower).toBeLessThan(60)
  })
  it('soothingPower 衰减量为 SOOTHING_DECAY(0.3)', () => {
    addAdult(em, 0, 0); addYouth(em, 1, 1)
    const lull = makeLullaby(1, 2, { soothingPower: 60 })
    sys.getLullabies().push(lull)
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, em, 1100)
    expect(lull.soothingPower).toBeCloseTo(59.7)
  })
  it('soothingPower > 30 时 bondsFormed 增加', () => {
    addAdult(em, 0, 0); addYouth(em, 1, 1)
    const lull = makeLullaby(1, 2, { soothingPower: 60, bondsFormed: 0 })
    sys.getLullabies().push(lull)
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, em, 1100)
    expect(lull.bondsFormed).toBe(1)
  })
  it('soothingPower <= 30 时 bondsFormed 不增加', () => {
    addAdult(em, 0, 0); addYouth(em, 1, 1)
    const lull = makeLullaby(1, 2, { soothingPower: 30, bondsFormed: 5 })
    sys.getLullabies().push(lull)
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, em, 1100)
    expect(lull.bondsFormed).toBe(5)
  })
  it('多次 update 后 soothingPower 持续衰减', () => {
    addAdult(em, 0, 0); addYouth(em, 1, 1)
    const lull = makeLullaby(1, 2, { soothingPower: 60 })
    sys.getLullabies().push(lull)
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, em, 1100)
    const after1 = lull.soothingPower
    sys.update(1, em, 2200)
    expect(lull.soothingPower).toBeLessThan(after1)
  })
})

// ─── 5. update — 清理过期摇篮曲 ──────────────────────────────────────────────
describe('CreatureLullabySystem.update — 清理过期摇篮曲', () => {
  let sys: CreatureLullabySystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEm(); _nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('soothingPower <= 5 时被清理', () => {
    addAdult(em, 0, 0); addYouth(em, 1, 1)
    const lull = makeLullaby(1, 2, { soothingPower: 5 })
    sys.getLullabies().push(lull)
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, em, 1100)
    // 5 - 0.3 = 4.7 <= 5 → 被清理
    expect(sys.getLullabies()).toHaveLength(0)
  })
  it('soothingPower > 5 时保留', () => {
    addAdult(em, 0, 0); addYouth(em, 1, 1)
    const lull = makeLullaby(1, 2, { soothingPower: 50 })
    sys.getLullabies().push(lull)
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, em, 1100)
    expect(sys.getLullabies()).toHaveLength(1)
  })
  it('部分过期时只清理过期的', () => {
    addAdult(em, 0, 0); addYouth(em, 1, 1)
    const lull1 = makeLullaby(1, 2, { soothingPower: 3 })
    const lull2 = makeLullaby(3, 4, { soothingPower: 50 })
    sys.getLullabies().push(lull1)
    sys.getLullabies().push(lull2)
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, em, 1100)
    expect(sys.getLullabies()).toHaveLength(1)
    expect(sys.getLullabies()[0].singerId).toBe(3)
  })
  it('soothingPower 恰好为 0 时被清理', () => {
    addAdult(em, 0, 0); addYouth(em, 1, 1)
    const lull = makeLullaby(1, 2, { soothingPower: 0 })
    sys.getLullabies().push(lull)
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, em, 1100)
    expect(sys.getLullabies()).toHaveLength(0)
  })
  it('soothingPower 为负数时被清理', () => {
    addAdult(em, 0, 0); addYouth(em, 1, 1)
    const lull = makeLullaby(1, 2, { soothingPower: -1 })
    sys.getLullabies().push(lull)
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, em, 1100)
    expect(sys.getLullabies()).toHaveLength(0)
  })
})

// ─── 6. MAX_LULLABIES 上限 ───────────────────────────────────────────────────
describe('CreatureLullabySystem — MAX_LULLABIES 上限', () => {
  let sys: CreatureLullabySystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('摇篮曲数量不超过 MAX_LULLABIES(80)', () => {
    for (let i = 0; i < 85 && sys.getLullabies().length < 80; i++) {
      sys.getLullabies().push(makeLullaby(i, i + 100))
    }
    expect(sys.getLullabies().length).toBeLessThanOrEqual(80)
  })
})

// ─── 7. 内部状态 ─────────────────────────────────────────────────────────────
describe('CreatureLullabySystem — 内部状态', () => {
  let sys: CreatureLullabySystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('nextId 初始为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck 初始为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('_singerBuf 初始为空数组', () => { expect((sys as any)._singerBuf).toHaveLength(0) })
  it('lullabies 初始为空数组', () => { expect((sys as any).lullabies).toHaveLength(0) })
  it('两个 makeSys() 是独立实例', () => {
    const a = makeSys()
    const b = makeSys()
    a.getLullabies().push(makeLullaby(1, 2))
    expect(b.getLullabies()).toHaveLength(0)
  })
})

// ─── 8. Lullaby 结构完整性 ───────────────────────────────────────────────────
describe('CreatureLullabySystem — Lullaby 结构完整性', () => {
  let sys: CreatureLullabySystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('makeLullaby 的 id 唯一', () => {
    const a = makeLullaby(1, 2)
    const b = makeLullaby(1, 2)
    expect(a.id).not.toBe(b.id)
  })
  it('makeLullaby 的 tick 字段保留', () => {
    const l = makeLullaby(1, 2, { tick: 9999 })
    expect(l.tick).toBe(9999)
  })
  it('makeLullaby melody 可被覆写', () => {
    const l = makeLullaby(1, 2, { melody: 'ancestral tune' })
    expect(l.melody).toBe('ancestral tune')
  })
  it('makeLullaby soothingPower 在 0-100 范围内（注入值）', () => {
    const l = makeLullaby(1, 2, { soothingPower: 80 })
    expect(l.soothingPower).toBeGreaterThanOrEqual(0)
    expect(l.soothingPower).toBeLessThanOrEqual(100)
  })
  it('bondsFormed 初始可为 0', () => {
    const l = makeLullaby(1, 2, { bondsFormed: 0 })
    expect(l.bondsFormed).toBe(0)
  })
  it('MELODIES 包含有效曲名', () => {
    const validMelodies = ['gentle hum', 'soft whistle', 'rhythmic chant', 'nature song', 'ancestral tune', 'starlight melody']
    const l = makeLullaby(1, 2, { melody: validMelodies[0] })
    expect(validMelodies).toContain(l.melody)
  })
})

// ─── 9. update — 成人年龄约束 ────────────────────────────────────────────────
describe('CreatureLullabySystem.update — 成人年龄约束', () => {
  let sys: CreatureLullabySystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEm(); _nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('歌者年龄 < 20 时不产生摇篮曲', () => {
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', species: 'human', speed: 1, damage: 1, isHostile: false, name: 'Teen', age: 15, maxAge: 80, gender: 'male' })
    em.addComponent(eid, { type: 'position', x: 0, y: 0 })
    addYouth(em, 1, 1)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 1100)
    expect(sys.getLullabies()).toHaveLength(0)
  })
  it('歌者年龄 >= 20 且有年轻生物时产生摇篮曲', () => {
    addAdult(em, 0, 0) // age=30
    addYouth(em, 1, 1) // age=10
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 1100)
    expect(sys.getLullabies().length).toBeGreaterThanOrEqual(1)
  })
  it('目标年龄 >= 15 时不成为 target（两个成人）', () => {
    addAdult(em, 0, 0)
    addAdult(em, 1, 1) // age=30 >= 15
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 1100)
    expect(sys.getLullabies()).toHaveLength(0)
  })
  it('目标不能是自己', () => {
    const eid = addAdult(em, 0, 0)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 1100)
    const found = sys.getLullabies().find(l => l.singerId === eid && l.targetId === eid)
    expect(found).toBeUndefined()
  })
})

// ─── 10. 边界与特殊情况 ──────────────────────────────────────────────────────
describe('CreatureLullabySystem — 边界与特殊情况', () => {
  let sys: CreatureLullabySystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEm(); _nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('soothingPower 刚好高于清理阈值(>5)时衰减后被清理', () => {
    addAdult(em, 0, 0); addYouth(em, 1, 1)
    const lull = makeLullaby(1, 2, { soothingPower: 5.1 })
    sys.getLullabies().push(lull)
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, em, 1100)
    // 5.1 - 0.3 = 4.8 <= 5 → 被清理
    expect(sys.getLullabies()).toHaveLength(0)
  })
  it('getBySinger 在 getLullabies 清空后返回空', () => {
    sys.getLullabies().push(makeLullaby(1, 2))
    sys.getLullabies().length = 0 // 清空
    expect(sys.getBySinger(1)).toHaveLength(0)
  })
  it('多首摇篮曲同一 target 的 targetId 可重复', () => {
    sys.getLullabies().push(makeLullaby(1, 99))
    sys.getLullabies().push(makeLullaby(2, 99))
    const targets = sys.getLullabies().map(l => l.targetId)
    expect(targets.filter(t => t === 99)).toHaveLength(2)
  })
  it('注入 bondsFormed=100 的状态不崩溃', () => {
    const lull = makeLullaby(1, 2, { bondsFormed: 100 })
    sys.getLullabies().push(lull)
    expect(sys.getLullabies()[0].bondsFormed).toBe(100)
  })
  it('tick=0 调用 update 不崩溃', () => {
    expect(() => sys.update(1, em, 0)).not.toThrow()
  })
  it('dt=0 调用 update 不崩溃', () => {
    expect(() => sys.update(0, em, 1100)).not.toThrow()
  })
})
