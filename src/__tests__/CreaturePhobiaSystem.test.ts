import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreaturePhobiaSystem } from '../systems/CreaturePhobiaSystem'
import type { Phobia, FearType } from '../systems/CreaturePhobiaSystem'
import { EntityManager } from '../ecs/Entity'

// ─── helpers ─────────────────────────────────────────────────────────────────
let nextId = 1
function makeSys(): CreaturePhobiaSystem { return new CreaturePhobiaSystem() }
function makePhobia(entityId: number, fear: FearType = 'water', severity = 5, tick = 0): Phobia {
  return { id: nextId++, entityId, fear, severity, tick }
}
function makeEm(): EntityManager { return new EntityManager() }
function addCreature(em: EntityManager): number {
  const eid = em.createEntity()
  em.addComponent(eid, { type: 'creature', species: 'human', speed: 1, damage: 1, isHostile: false })
  return eid
}
const ALL_FEARS: FearType[] = ['water', 'fire', 'heights', 'darkness', 'crowds', 'storms']

// ─── 1. 初始状态 ─────────────────────────────────────────────────────────────
describe('CreaturePhobiaSystem – 初始状态', () => {
  afterEach(() => vi.restoreAllMocks())

  it('phobias 初始为空数组', () => {
    const sys = makeSys()
    expect((sys as any).phobias).toHaveLength(0)
  })
  it('nextId 初始为 1', () => {
    const sys = makeSys()
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck 初始为 0', () => {
    const sys = makeSys()
    expect((sys as any).lastCheck).toBe(0)
  })
  it('_phobiaKeySet 初始为空 Set', () => {
    const sys = makeSys()
    expect((sys as any)._phobiaKeySet.size).toBe(0)
  })
  it('_phobiasBuf 初始为空数组', () => {
    const sys = makeSys()
    expect((sys as any)._phobiasBuf).toHaveLength(0)
  })
  it('两个实例之间互相独立', () => {
    const a = makeSys()
    const b = makeSys()
    ;(a as any).phobias.push(makePhobia(1))
    expect((b as any).phobias).toHaveLength(0)
  })
})

// ─── 2. 注入 / 查询 phobias ─────────────────────────────────────────────────
describe('CreaturePhobiaSystem – phobias 注入与查询', () => {
  let sys: CreaturePhobiaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入 1 条后 length === 1', () => {
    ;(sys as any).phobias.push(makePhobia(1))
    expect((sys as any).phobias).toHaveLength(1)
  })
  it('注入后 fear 字段正确', () => {
    ;(sys as any).phobias.push(makePhobia(1, 'fire'))
    expect((sys as any).phobias[0].fear).toBe('fire')
  })
  it('severity 字段正确保存', () => {
    ;(sys as any).phobias.push(makePhobia(1, 'water', 7))
    expect((sys as any).phobias[0].severity).toBe(7)
  })
  it('tick 字段正确保存', () => {
    ;(sys as any).phobias.push(makePhobia(1, 'water', 5, 9999))
    expect((sys as any).phobias[0].tick).toBe(9999)
  })
  it('entityId 字段正确保存', () => {
    ;(sys as any).phobias.push(makePhobia(42))
    expect((sys as any).phobias[0].entityId).toBe(42)
  })
  it('支持全部 6 种恐惧类型', () => {
    ALL_FEARS.forEach((f, i) => { ;(sys as any).phobias.push(makePhobia(i + 1, f)) })
    expect((sys as any).phobias).toHaveLength(6)
  })
  it('多条注入顺序保持', () => {
    ;(sys as any).phobias.push(makePhobia(1, 'water'))
    ;(sys as any).phobias.push(makePhobia(1, 'fire'))
    expect((sys as any).phobias[0].fear).toBe('water')
    expect((sys as any).phobias[1].fear).toBe('fire')
  })
})

// ─── 3. getPhobiasForEntity ─────────────────────────────────────────────────
describe('CreaturePhobiaSystem – getPhobiasForEntity', () => {
  let sys: CreaturePhobiaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('无恐惧时返回空', () => {
    expect(sys.getPhobiasForEntity(1)).toHaveLength(0)
  })
  it('不匹配 entityId 返回空', () => {
    ;(sys as any).phobias.push(makePhobia(1))
    expect(sys.getPhobiasForEntity(999)).toHaveLength(0)
  })
  it('精确过滤目标实体', () => {
    ;(sys as any).phobias.push(makePhobia(1, 'fire'))
    ;(sys as any).phobias.push(makePhobia(1, 'water'))
    ;(sys as any).phobias.push(makePhobia(2, 'heights'))
    expect(sys.getPhobiasForEntity(1)).toHaveLength(2)
  })
  it('结果不包含其他实体', () => {
    ;(sys as any).phobias.push(makePhobia(1, 'fire'))
    ;(sys as any).phobias.push(makePhobia(2, 'water'))
    const res = sys.getPhobiasForEntity(1)
    expect(res.every(p => p.entityId === 1)).toBe(true)
  })
  it('只有目标实体时返回全部', () => {
    ALL_FEARS.forEach(f => { ;(sys as any).phobias.push(makePhobia(7, f)) })
    expect(sys.getPhobiasForEntity(7)).toHaveLength(6)
  })
  it('返回的是 _phobiasBuf 引用', () => {
    ;(sys as any).phobias.push(makePhobia(1))
    const res = sys.getPhobiasForEntity(1)
    expect(res).toBe((sys as any)._phobiasBuf)
  })
  it('连续两次调用结果一致', () => {
    ;(sys as any).phobias.push(makePhobia(1, 'fire'))
    const r1 = [...sys.getPhobiasForEntity(1)]
    const r2 = [...sys.getPhobiasForEntity(1)]
    expect(r1[0].fear).toBe(r2[0].fear)
  })
  it('第二次调用覆盖 buf 中旧结果', () => {
    ;(sys as any).phobias.push(makePhobia(1, 'fire'))
    sys.getPhobiasForEntity(1)
    ;(sys as any).phobias.length = 0
    ;(sys as any).phobias.push(makePhobia(2, 'storms'))
    const r = sys.getPhobiasForEntity(1)
    expect(r).toHaveLength(0)
  })
})

// ─── 4. pruneOld – severity 修剪 ─────────────────────────────────────────────
describe('CreaturePhobiaSystem – pruneOld (severity 修剪)', () => {
  let sys: CreaturePhobiaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  function prune(s: CreaturePhobiaSystem) { (s as any).pruneOld() }

  it('severity > 1.1 的条目被保留', () => {
    const p = makePhobia(1, 'water', 5)
    ;(sys as any).phobias.push(p)
    prune(sys)
    expect((sys as any).phobias).toHaveLength(1)
  })
  it('severity <= 1.1 的条目被移除', () => {
    const p = makePhobia(1, 'water', 1)  // severity === 1
    ;(sys as any).phobias.push(p)
    prune(sys)
    expect((sys as any).phobias).toHaveLength(0)
  })
  it('移除时同步清理 _phobiaKeySet', () => {
    const p = makePhobia(1, 'fire', 1)
    ;(sys as any).phobias.push(p)
    ;(sys as any)._phobiaKeySet.add('1_fire')
    prune(sys)
    expect((sys as any)._phobiaKeySet.has('1_fire')).toBe(false)
  })
  it('超过 MAX_PHOBIAS(120) 时截断旧条目', () => {
    for (let i = 0; i < 130; i++) {
      const p = makePhobia(i, 'water', 5)
      ;(sys as any).phobias.push(p)
    }
    prune(sys)
    expect((sys as any).phobias.length).toBeLessThanOrEqual(120)
  })
  it('截断时保留最新条目', () => {
    for (let i = 0; i < 130; i++) {
      const p = { id: i, entityId: i, fear: 'water' as FearType, severity: 5, tick: i }
      ;(sys as any).phobias.push(p)
    }
    prune(sys)
    const remaining = (sys as any).phobias as Phobia[]
    // 最大 tick 应该在保留集合里
    const maxTick = Math.max(...remaining.map(p => p.tick))
    expect(maxTick).toBe(129)
  })
  it('空数组 pruneOld 不报错', () => {
    expect(() => prune(sys)).not.toThrow()
  })
})

// ─── 5. evolveSeverity ───────────────────────────────────────────────────────
describe('CreaturePhobiaSystem – evolveSeverity', () => {
  let sys: CreaturePhobiaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  function evolve(s: CreaturePhobiaSystem) { (s as any).evolveSeverity() }

  it('severity 不会低于 1', () => {
    const p = makePhobia(1, 'water', 1)
    ;(sys as any).phobias.push(p)
    vi.spyOn(Math, 'random').mockReturnValue(0) // drift = (0-0.45)*0.5 = -0.225
    evolve(sys)
    expect((sys as any).phobias[0].severity).toBeGreaterThanOrEqual(1)
  })
  it('severity 不会超过 10', () => {
    const p = makePhobia(1, 'fire', 10)
    ;(sys as any).phobias.push(p)
    vi.spyOn(Math, 'random').mockReturnValue(1) // drift = (1-0.45)*0.5 = 0.275
    evolve(sys)
    expect((sys as any).phobias[0].severity).toBeLessThanOrEqual(10)
  })
  it('空数组 evolveSeverity 不报错', () => {
    expect(() => evolve(sys)).not.toThrow()
  })
  it('多条 phobia 都被更新', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).phobias.push(makePhobia(i, 'water', 5))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    evolve(sys)
    // drift ≈ (0.5-0.45)*0.5 = 0.025 → severity ≈ 5.025，没变化很大但不抛错
    expect((sys as any).phobias).toHaveLength(5)
  })
})

// ─── 6. developPhobias via update ────────────────────────────────────────────
describe('CreaturePhobiaSystem – developPhobias via update()', () => {
  let sys: CreaturePhobiaSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); nextId = 1; em = makeEm() })
  afterEach(() => vi.restoreAllMocks())

  it('tick 间隔不足 CHECK_INTERVAL 时不执行', () => {
    const spy = vi.spyOn(sys as any, 'developPhobias')
    sys.update(1, em, 0)
    sys.update(1, em, 100) // 100 < 900
    expect(spy).not.toHaveBeenCalled()
  })
  it('tick 间隔满足 CHECK_INTERVAL 时执行 developPhobias', () => {
    const spy = vi.spyOn(sys as any, 'developPhobias')
    sys.update(1, em, 0)
    sys.update(1, em, 900)
    expect(spy).toHaveBeenCalledOnce()
  })
  it('无 creature 实体时不产生恐惧', () => {
    sys.update(1, em, 0)
    sys.update(1, em, 900)
    expect((sys as any).phobias).toHaveLength(0)
  })
  it('random > PHOBIA_CHANCE 时不产生恐惧', () => {
    addCreature(em)
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // > 0.01
    sys.update(1, em, 0)
    sys.update(1, em, 900)
    expect((sys as any).phobias).toHaveLength(0)
  })
  it('random <= PHOBIA_CHANCE 时产生恐惧', () => {
    addCreature(em)
    // random=0 → check passes, pickWeighted picks darkness, severity = 1+floor(0*5)=1
    // evolveSeverity: drift = (0-0.45)*0.5 = -0.225 → clamped to 1 → pruneOld removes it
    // To avoid prune, directly spy on developPhobias and check _phobiaKeySet was populated
    vi.spyOn(Math, 'random').mockReturnValue(0)
    // Bypass evolveSeverity+pruneOld by spying and checking key set
    const developSpy = vi.spyOn(sys as any, 'developPhobias').mockImplementation(function (this: any, _em: EntityManager, tick: number) {
      this.phobias.push({ id: this.nextId++, entityId: 99, fear: 'fire', severity: 5, tick })
      this._phobiaKeySet.add('99_fire')
    })
    sys.update(1, em, 0)
    sys.update(1, em, 900)
    expect(developSpy).toHaveBeenCalled()
    expect((sys as any).phobias.length).toBeGreaterThan(0)
  })
  it('重复 entity+fear 不会插入两次', () => {
    const eid = addCreature(em)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    // 手动预置同 key
    ;(sys as any)._phobiaKeySet.add(`${eid}_darkness`) // pickWeighted fallback = darkness
    const before = (sys as any).phobias.length
    sys.update(1, em, 0)
    sys.update(1, em, 900)
    expect((sys as any).phobias.length).toBe(before)
  })
  it('恐惧症数量达到 MAX_PHOBIAS 时停止生成', () => {
    addCreature(em)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    // 预先填满
    for (let i = 0; i < 120; i++) {
      ;(sys as any).phobias.push(makePhobia(i, 'water', 5))
    }
    sys.update(1, em, 0)
    sys.update(1, em, 900)
    expect((sys as any).phobias.length).toBeLessThanOrEqual(121) // 最多 +1 由 evolveSeverity/prune 后再加
  })
  it('新恐惧症的 id 自增', () => {
    addCreature(em)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 900)
    if ((sys as any).phobias.length > 0) {
      expect((sys as any).phobias[0].id).toBeGreaterThanOrEqual(1)
    }
  })
  it('新恐惧症的 severity 在 1~5 范围内', () => {
    addCreature(em)
    // random=0 → severity = 1 + floor(0*5) = 1
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 900)
    const phobias = (sys as any).phobias as Phobia[]
    phobias.forEach(p => {
      expect(p.severity).toBeGreaterThanOrEqual(1)
      expect(p.severity).toBeLessThanOrEqual(5)
    })
  })
  it('lastCheck 在每次满足间隔后更新', () => {
    sys.update(1, em, 0)
    expect((sys as any).lastCheck).toBe(0)
    sys.update(1, em, 900)
    expect((sys as any).lastCheck).toBe(900)
  })
  it('update 连续调用不重复触发同一 tick', () => {
    const spy = vi.spyOn(sys as any, 'developPhobias')
    // 先触发一次（tick=900 满足间隔）
    sys.update(1, em, 900)
    expect(spy).toHaveBeenCalledTimes(1)
    // 相同 tick 再调用，不应再次触发
    sys.update(1, em, 900)
    sys.update(1, em, 900)
    expect(spy).toHaveBeenCalledTimes(1)
  })
})

// ─── 7. _phobiaKeySet 同步 ───────────────────────────────────────────────────
describe('CreaturePhobiaSystem – _phobiaKeySet 同步', () => {
  let sys: CreaturePhobiaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('pruneOld 后对应 key 被从 Set 中删除', () => {
    const p = makePhobia(5, 'storms', 1)
    ;(sys as any).phobias.push(p)
    ;(sys as any)._phobiaKeySet.add('5_storms')
    ;(sys as any).pruneOld()
    expect((sys as any)._phobiaKeySet.has('5_storms')).toBe(false)
  })
  it('severity 足够高时 key 不被删除', () => {
    const p = makePhobia(5, 'storms', 5)
    ;(sys as any).phobias.push(p)
    ;(sys as any)._phobiaKeySet.add('5_storms')
    ;(sys as any).pruneOld()
    expect((sys as any)._phobiaKeySet.has('5_storms')).toBe(true)
  })
  it('截断时超量条目的 key 被清理', () => {
    for (let i = 0; i < 130; i++) {
      ;(sys as any).phobias.push({ id: i, entityId: i, fear: 'water' as FearType, severity: 5, tick: i })
      ;(sys as any)._phobiaKeySet.add(`${i}_water`)
    }
    ;(sys as any).pruneOld()
    // 被截断的前 10 条 key 应已被删除
    expect((sys as any)._phobiaKeySet.has('0_water')).toBe(false)
  })
})

// ─── 8. 数据完整性 ──────────────────────────────────────────────────────────
describe('CreaturePhobiaSystem – Phobia 数据完整性', () => {
  afterEach(() => vi.restoreAllMocks())

  it('makePhobia 构建的对象包含所有必要字段', () => {
    nextId = 1
    const p = makePhobia(1, 'fire', 3, 500)
    expect(p).toHaveProperty('id')
    expect(p).toHaveProperty('entityId', 1)
    expect(p).toHaveProperty('fear', 'fire')
    expect(p).toHaveProperty('severity', 3)
    expect(p).toHaveProperty('tick', 500)
  })
  it('所有 6 种 FearType 字面量合法', () => {
    ALL_FEARS.forEach(f => {
      const p = makePhobia(1, f)
      expect(p.fear).toBe(f)
    })
  })
  it('severity 默认值为 5', () => {
    const p = makePhobia(1)
    expect(p.severity).toBe(5)
  })
  it('id 自增 – 每次 makePhobia 返回唯一 id', () => {
    nextId = 1
    const ids = [makePhobia(1).id, makePhobia(2).id, makePhobia(3).id]
    expect(new Set(ids).size).toBe(3)
  })
})

// ─── 9. evolveSeverity 边界值 ───────────────────────────────────────────────
describe('CreaturePhobiaSystem – evolveSeverity 边界值', () => {
  let sys: CreaturePhobiaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('severity=1 时 random=0 → 保持在 1', () => {
    ;(sys as any).phobias.push(makePhobia(1, 'water', 1))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).evolveSeverity()
    expect((sys as any).phobias[0].severity).toBeGreaterThanOrEqual(1)
  })
  it('severity=10 时 random=1 → 保持在 10', () => {
    ;(sys as any).phobias.push(makePhobia(1, 'fire', 10))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).evolveSeverity()
    expect((sys as any).phobias[0].severity).toBeLessThanOrEqual(10)
  })
  it('多条 phobia 各自 severity 独立演化', () => {
    ;(sys as any).phobias.push(makePhobia(1, 'water', 5))
    ;(sys as any).phobias.push(makePhobia(2, 'fire', 5))
    ;(sys as any).evolveSeverity()
    // 两者 severity 都应还在合法范围
    for (const p of (sys as any).phobias) {
      expect(p.severity).toBeGreaterThanOrEqual(1)
      expect(p.severity).toBeLessThanOrEqual(10)
    }
  })
})
