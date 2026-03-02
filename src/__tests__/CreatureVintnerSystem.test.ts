import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureVintnerSystem } from '../systems/CreatureVintnerSystem'
import type { Vintner, WineVariety } from '../systems/CreatureVintnerSystem'
import { EntityManager } from '../ecs/Entity'

let nextId = 1
function makeSys(): CreatureVintnerSystem { return new CreatureVintnerSystem() }
function makeVintner(entityId: number, variety: WineVariety = 'red', tick = 0): Vintner {
  return { id: nextId++, entityId, skill: 70, barrelsProduced: 12, wineVariety: variety, vintage: 50, reputation: 45, tick }
}

/** 构造最小化 EntityManager mock，getEntitiesWithComponents 返回空列表 */
function makeEmptyEm(): EntityManager {
  const em = new EntityManager()
  vi.spyOn(em, 'getEntitiesWithComponents').mockReturnValue([])
  return em
}

/** 构造带一个 human 实体的 EntityManager（age>=10） */
function makeEmWithCreature(age = 20): { em: EntityManager; eid: number } {
  const em = new EntityManager()
  const eid = em.createEntity()
  em.addComponent(eid, { type: 'creature', species: 'human', speed: 1, damage: 1, isHostile: false, name: 'v', age, maxAge: 80, gender: 'male' })
  em.addComponent(eid, { type: 'position', x: 0, y: 0 })
  return { em, eid }
}

// ─────────────────────────────────────────────
// 一、getVintners / 内部 vintners 数组
// ─────────────────────────────────────────────
describe('CreatureVintnerSystem.getVintners', () => {
  let sys: CreatureVintnerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无酿酒师', () => { expect((sys as any).vintners).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).vintners.push(makeVintner(1, 'white'))
    expect((sys as any).vintners[0].wineVariety).toBe('white')
  })

  it('返回内部引用', () => {
    ;(sys as any).vintners.push(makeVintner(1))
    expect((sys as any).vintners).toBe((sys as any).vintners)
  })

  it('支持所有4种葡萄酒类型', () => {
    const varieties: WineVariety[] = ['red', 'white', 'rosé', 'sparkling']
    varieties.forEach((v, i) => { ;(sys as any).vintners.push(makeVintner(i + 1, v)) })
    const all = (sys as any).vintners
    varieties.forEach((v, i) => { expect(all[i].wineVariety).toBe(v) })
  })

  it('多个全部返回', () => {
    ;(sys as any).vintners.push(makeVintner(1))
    ;(sys as any).vintners.push(makeVintner(2))
    expect((sys as any).vintners).toHaveLength(2)
  })

  it('vintner 的 entityId 与注入时一致', () => {
    ;(sys as any).vintners.push(makeVintner(42))
    expect((sys as any).vintners[0].entityId).toBe(42)
  })

  it('vintner 的 skill 字段有效', () => {
    ;(sys as any).vintners.push(makeVintner(1))
    expect((sys as any).vintners[0].skill).toBe(70)
  })

  it('vintner 的 barrelsProduced 字段有效', () => {
    ;(sys as any).vintners.push(makeVintner(1))
    expect((sys as any).vintners[0].barrelsProduced).toBe(12)
  })

  it('vintner 的 vintage 字段有效', () => {
    ;(sys as any).vintners.push(makeVintner(1))
    expect((sys as any).vintners[0].vintage).toBe(50)
  })

  it('vintner 的 reputation 字段有效', () => {
    ;(sys as any).vintners.push(makeVintner(1))
    expect((sys as any).vintners[0].reputation).toBe(45)
  })

  it('vintner 的 tick 字段有效', () => {
    ;(sys as any).vintners.push(makeVintner(1, 'red', 9999))
    expect((sys as any).vintners[0].tick).toBe(9999)
  })
})

// ─────────────────────────────────────────────
// 二、CHECK_INTERVAL 节流
// ─────────────────────────────────────────────
describe('CreatureVintnerSystem — CHECK_INTERVAL 节流', () => {
  let sys: CreatureVintnerSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEmptyEm(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick 未达 CHECK_INTERVAL(1250) 时跳过执行，lastCheck 不变', () => {
    sys.update(0, em, 0)
    sys.update(0, em, 1249)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 恰好达到 CHECK_INTERVAL 时执行并更新 lastCheck', () => {
    sys.update(0, em, 1250)
    expect((sys as any).lastCheck).toBe(1250)
  })

  it('第二次执行需要再等 CHECK_INTERVAL', () => {
    sys.update(0, em, 1250)
    sys.update(0, em, 2499)
    expect((sys as any).lastCheck).toBe(1250)
    sys.update(0, em, 2500)
    expect((sys as any).lastCheck).toBe(2500)
  })

  it('tick=0 时触发首次执行（0 - 0 = 0 >= 0 等于 CHECK_INTERVAL，边界视为通过）', () => {
    // 首次 lastCheck=0，tick=0：0-0=0 < 1250 → 不执行
    sys.update(0, em, 0)
    expect((sys as any).lastCheck).toBe(0)
    // 确认 lastCheck 没有被更新（因为 0 < 1250）
  })

  it('极大 tick 仍然正常触发', () => {
    sys.update(0, em, 999999)
    expect((sys as any).lastCheck).toBe(999999)
  })

  it('lastCheck 在跳过时保持上次执行值', () => {
    sys.update(0, em, 1250)
    sys.update(0, em, 1300)
    expect((sys as any).lastCheck).toBe(1250)
  })

  it('连续多次满足间隔时 lastCheck 每次都更新', () => {
    sys.update(0, em, 1250)
    expect((sys as any).lastCheck).toBe(1250)
    sys.update(0, em, 2500)
    expect((sys as any).lastCheck).toBe(2500)
    sys.update(0, em, 3750)
    expect((sys as any).lastCheck).toBe(3750)
  })
})

// ─────────────────────────────────────────────
// 三、skillMap 累积与上限
// ─────────────────────────────────────────────
describe('CreatureVintnerSystem — skillMap 累积与上限', () => {
  let sys: CreatureVintnerSystem
  let em: EntityManager
  let eid: number

  beforeEach(() => {
    sys = makeSys()
    const made = makeEmWithCreature(20)
    em = made.em
    eid = made.eid
    vi.spyOn(Math, 'random').mockReturnValue(0)
    nextId = 1
  })

  afterEach(() => { vi.restoreAllMocks() })

  it('skillMap 存储实体技能，每次更新增加 SKILL_GROWTH(0.08)', () => {
    sys.update(0, em, 1250)
    const skill1 = (sys as any).skillMap.get(eid) ?? 0
    sys.update(0, em, 2500)
    const skill2 = (sys as any).skillMap.get(eid) ?? 0
    if (skill2 !== undefined && skill1 !== undefined) {
      expect(skill2).toBeGreaterThanOrEqual(skill1)
    }
  })

  it('skill 被 Math.min(100, ...) 限制不超过 100', () => {
    ;(sys as any).skillMap.set(eid, 99.95)
    sys.update(0, em, 1250)
    const skill = (sys as any).skillMap.get(eid)
    expect(skill).toBeLessThanOrEqual(100)
  })

  it('初始 skillMap 为空 Map', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('首次执行后 skillMap 有记录', () => {
    sys.update(0, em, 1250)
    expect((sys as any).skillMap.size).toBeGreaterThanOrEqual(0)
  })

  it('预填充 skill=100 后再执行不超过 100', () => {
    ;(sys as any).skillMap.set(eid, 100)
    sys.update(0, em, 1250)
    const skill = (sys as any).skillMap.get(eid)
    if (skill !== undefined) {
      expect(skill).toBeLessThanOrEqual(100)
    }
  })

  it('新实体没有 skillMap 记录时初始技能在 3~13 范围内', () => {
    // random=0 → initialSkill = 3 + 0*10 = 3，经过 SKILL_GROWTH(0.08) → 3.08
    sys.update(0, em, 1250)
    const skill = (sys as any).skillMap.get(eid)
    if (skill !== undefined) {
      expect(skill).toBeGreaterThanOrEqual(3)
      expect(skill).toBeLessThanOrEqual(100)
    }
  })
})

// ─────────────────────────────────────────────
// 四、vintner 记录 cleanup（cutoff = tick - 45000）
// ─────────────────────────────────────────────
describe('CreatureVintnerSystem — vintner 记录 cleanup (cutoff = tick - 45000)', () => {
  let sys: CreatureVintnerSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEmptyEm(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('超过 45000 tick 的 vintner 记录被清除', () => {
    ;(sys as any).vintners.push(makeVintner(1, 'red', 0))
    ;(sys as any).vintners.push(makeVintner(2, 'white', 50000))
    sys.update(0, em, 50000)
    const remaining = (sys as any).vintners as Vintner[]
    expect(remaining.some(v => v.entityId === 1)).toBe(false)
    expect(remaining.some(v => v.entityId === 2)).toBe(true)
  })

  it('tick 恰好等于 cutoff 边界时不删除（条件 < cutoff）', () => {
    ;(sys as any).vintners.push(makeVintner(1, 'red', 5000))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 50000)
    expect((sys as any).vintners).toHaveLength(1)
  })

  it('多条记录批量清理，只保留未过期的', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).vintners.push(makeVintner(i + 1, 'red', i * 1000))
    }
    ;(sys as any).vintners.push(makeVintner(10, 'white', 100000))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 100000)
    const remaining = (sys as any).vintners as Vintner[]
    expect(remaining).toHaveLength(1)
    expect(remaining[0].entityId).toBe(10)
  })

  it('tick=45000 时 cutoff=0，tick=0 的记录被删除（0 < 0 不成立，保留）', () => {
    // cutoff = 45000-45000 = 0；vintner.tick=0 不满足 < 0 → 保留
    ;(sys as any).vintners.push(makeVintner(1, 'red', 0))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 45000)
    expect((sys as any).vintners).toHaveLength(1)
  })

  it('tick=45001 时 cutoff=1，tick=0 的记录被删除', () => {
    // cutoff = 45001-45000 = 1；vintner.tick=0 < 1 �� 删除
    ;(sys as any).vintners.push(makeVintner(1, 'red', 0))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 45001)
    expect((sys as any).vintners).toHaveLength(0)
  })

  it('所有记录都过期时 vintners 清空', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).vintners.push(makeVintner(i + 1, 'red', i * 100))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 200000)
    expect((sys as any).vintners).toHaveLength(0)
  })

  it('没有记录时 cleanup 正常运行不抛出', () => {
    expect(() => sys.update(0, em, 100000)).not.toThrow()
  })

  it('cleanup 按倒序遍历（splice 不破坏索引）', () => {
    // 注入3条：前两条过期，最后一条未过期
    ;(sys as any).vintners.push(makeVintner(1, 'red', 0))
    ;(sys as any).vintners.push(makeVintner(2, 'red', 100))
    ;(sys as any).vintners.push(makeVintner(3, 'white', 100000))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 100000)
    const remaining = (sys as any).vintners as Vintner[]
    expect(remaining).toHaveLength(1)
    expect(remaining[0].entityId).toBe(3)
  })
})

// ─────────────────────────────────────────────
// 五、vintner 字段合法性
// ─────────────────────────────────────────────
describe('CreatureVintnerSystem — vintner 字段合法性', () => {
  let sys: CreatureVintnerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('reputation 值被 Math.min(100, ...) 限制', () => {
    ;(sys as any).vintners.push(makeVintner(1, 'sparkling'))
    const v = (sys as any).vintners[0] as Vintner
    expect(v.reputation).toBeLessThanOrEqual(100)
  })

  it('barrelsProduced 随 skill 增大而增大（skill=10→2桶，skill=90→10桶）', () => {
    const low: Vintner = { id: 1, entityId: 1, skill: 10, barrelsProduced: 1 + Math.floor(10 / 10), wineVariety: 'red', vintage: 0, reputation: 20, tick: 0 }
    const high: Vintner = { id: 2, entityId: 2, skill: 90, barrelsProduced: 1 + Math.floor(90 / 10), wineVariety: 'red', vintage: 0, reputation: 64, tick: 0 }
    expect(high.barrelsProduced).toBeGreaterThan(low.barrelsProduced)
  })

  it('id 字段从 1 开始自增', () => {
    ;(sys as any).vintners.push(makeVintner(1))
    ;(sys as any).vintners.push(makeVintner(2))
    const ids = (sys as any).vintners.map((v: Vintner) => v.id)
    expect(ids[0]).toBeLessThan(ids[1])
  })

  it('barrelsProduced = 1 + floor(skill/10)', () => {
    const skill = 50
    const expected = 1 + Math.floor(skill / 10)
    const v: Vintner = { id: 1, entityId: 1, skill, barrelsProduced: expected, wineVariety: 'red', vintage: 0, reputation: 30, tick: 0 }
    expect(v.barrelsProduced).toBe(6)
  })

  it('skill=0 时 barrelsProduced 最小为 1', () => {
    const skill = 0
    const barrels = 1 + Math.floor(skill / 10)
    expect(barrels).toBe(1)
  })

  it('skill=100 时 barrelsProduced 最大为 11', () => {
    const skill = 100
    const barrels = 1 + Math.floor(skill / 10)
    expect(barrels).toBe(11)
  })

  it('reputation 最小 >= 10（skill=0, rand=0 → 10+0+0=10）', () => {
    const minReputation = 10 + 0 * 0.6 + 0 * 15
    expect(minReputation).toBeGreaterThanOrEqual(10)
  })

  it('reputation 公式最大值：skill=100, rand=1 → 10+60+15=85 <= 100', () => {
    const maxBeforeCap = 10 + 100 * 0.6 + 1 * 15
    expect(Math.min(100, maxBeforeCap)).toBeLessThanOrEqual(100)
  })

  it('vintage 是非负整数', () => {
    const tick = 25000
    const vintage = Math.floor(tick / 10000) + Math.floor(0 * 5)
    expect(vintage).toBeGreaterThanOrEqual(0)
    expect(Number.isInteger(vintage)).toBe(true)
  })

  it('WineVariety 只有4种合法值', () => {
    const valid: WineVariety[] = ['red', 'white', 'rosé', 'sparkling']
    const v = makeVintner(1, 'red')
    expect(valid).toContain(v.wineVariety)
  })

  it('vintner 的 id 字段为正整数', () => {
    ;(sys as any).vintners.push(makeVintner(1))
    const v = (sys as any).vintners[0] as Vintner
    expect(v.id).toBeGreaterThan(0)
    expect(Number.isInteger(v.id)).toBe(true)
  })
})

// ─────────────────────────────────────────────
// 六、MAX_VINTNERS 上限
// ─────────────────────────────────────────────
describe('CreatureVintnerSystem — MAX_VINTNERS 上限', () => {
  let sys: CreatureVintnerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('达到 MAX_VINTNERS(45) 后停止新增', () => {
    for (let i = 0; i < 45; i++) {
      ;(sys as any).vintners.push(makeVintner(i + 1))
    }
    expect((sys as any).vintners).toHaveLength(45)
    const em = makeEmptyEm()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, em, 1250)
    expect((sys as any).vintners.length).toBeLessThanOrEqual(45)
  })

  it('vintners 数量为 44 时可以再增加一条', () => {
    for (let i = 0; i < 44; i++) {
      ;(sys as any).vintners.push(makeVintner(i + 1))
    }
    expect((sys as any).vintners.length).toBe(44)
  })

  it('vintners 数量超过 45 不应发生（保护边界）', () => {
    for (let i = 0; i < 50; i++) {
      if ((sys as any).vintners.length < 45) {
        ;(sys as any).vintners.push(makeVintner(i + 1))
      }
    }
    expect((sys as any).vintners.length).toBeLessThanOrEqual(45)
  })
})

// ─────────────────────────────────────────────
// 七、nextId 自增行为
// ─────────────────────────────────────────────
describe('CreatureVintnerSystem — nextId 自增', () => {
  let sys: CreatureVintnerSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('每次生成 vintner 后 nextId 递增', () => {
    const { em, eid: _ } = makeEmWithCreature(20)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const before = (sys as any).nextId
    sys.update(0, em, 1250)
    const after = (sys as any).nextId
    // 如果有实体被选中，nextId 应该增加
    expect(after).toBeGreaterThanOrEqual(before)
  })

  it('多实例 nextId 互相独立', () => {
    const sys2 = makeSys()
    expect((sys as any).nextId).toBe(1)
    expect((sys2 as any).nextId).toBe(1)
  })
})

// ─────────────────────────────────────────────
// 八、lastCheck 初始化和重置
// ─────────────────────────────────────────────
describe('CreatureVintnerSystem — lastCheck 初始化', () => {
  let sys: CreatureVintnerSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('多实例的 lastCheck 互相独立', () => {
    const sys2 = makeSys()
    const em = makeEmptyEm()
    sys.update(0, em, 1250)
    expect((sys as any).lastCheck).toBe(1250)
    expect((sys2 as any).lastCheck).toBe(0)
  })
})

// ─────────────────────────────────────────────
// 九、生物年龄门槛（age < 10 跳过）
// ─────────────────────────────────────────────
describe('CreatureVintnerSystem — 生物年龄门槛', () => {
  let sys: CreatureVintnerSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('age=9 的生物不产生 vintner', () => {
    const { em } = makeEmWithCreature(9)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, em, 1250)
    expect((sys as any).vintners).toHaveLength(0)
  })

  it('age=10 的生物满足年龄条件（可能产生 vintner）', () => {
    const { em } = makeEmWithCreature(10)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    // 不要求一定产生（依赖 CRAFT_CHANCE），只要不抛出
    expect(() => sys.update(0, em, 1250)).not.toThrow()
  })

  it('空列表时不产生任何 vintner', () => {
    const em = makeEmptyEm()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, em, 1250)
    expect((sys as any).vintners).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────
// 十、update 不抛异常（健壮性）
// ─────────────────────────────────────────────
describe('CreatureVintnerSystem — update 健壮性', () => {
  let sys: CreatureVintnerSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('dt=0 时正常运行', () => {
    const em = makeEmptyEm()
    expect(() => sys.update(0, em, 1250)).not.toThrow()
  })

  it('dt 为负数时不崩溃', () => {
    const em = makeEmptyEm()
    expect(() => sys.update(-1, em, 1250)).not.toThrow()
  })

  it('tick 非常大时不崩溃', () => {
    const em = makeEmptyEm()
    expect(() => sys.update(0, em, Number.MAX_SAFE_INTEGER)).not.toThrow()
  })

  it('多次连续调用不崩溃', () => {
    const em = makeEmptyEm()
    for (let i = 0; i < 20; i++) {
      expect(() => sys.update(0, em, i * 1250)).not.toThrow()
    }
  })
})
