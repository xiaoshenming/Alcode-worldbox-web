import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureUpholsterersSystem } from '../systems/CreatureUpholsterersSystem'
import type { Upholsterer, UpholsteryMaterial } from '../systems/CreatureUpholsterersSystem'

const CHECK_INTERVAL = 1390
const EXPIRE_AFTER   = 51500
const SKILL_GROWTH   = 0.058

let nextId = 1
function makeSys(): CreatureUpholsterersSystem { return new CreatureUpholsterersSystem() }
function makeMaker(entityId: number, overrides: Partial<Upholsterer> = {}): Upholsterer {
  return {
    id: nextId++,
    entityId,
    skill: 70,
    piecesUpholstered: 12,
    material: 'leather',
    comfortRating: 65,
    reputation: 45,
    tick: 0,
    ...overrides,
  }
}

/**
 * EntityManager stub.
 * getEntitiesWithComponents → 返回 creatureIds
 * getComponent             → 返回带 age 的 creature 组件
 * hasComponent             → entityId 在 creatureIds 内才返回 true
 */
function makeEm(creatureIds: number[], age = 20): any {
  return {
    getEntitiesWithComponents: (..._types: string[]) => creatureIds,
    getComponent: (id: number, type: string) => {
      if (type === 'creature' && creatureIds.includes(id)) return { type: 'creature', age }
      return undefined
    },
    hasComponent: (id: number, type: string) =>
      type === 'creature' && creatureIds.includes(id),
  }
}

describe('CreatureUpholsterersSystem', () => {
  let sys: CreatureUpholsterersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ── 原有5个基础测试 ──────────────────────────────────────────────────���───
  it('初始无室内装潢工', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, { material: 'velvet' }))
    expect((sys as any).makers[0].material).toBe('velvet')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有4种装潢材料', () => {
    const materials: UpholsteryMaterial[] = ['leather', 'velvet', 'silk', 'tapestry']
    materials.forEach((m, i) => { ;(sys as any).makers.push(makeMaker(i + 1, { material: m })) })
    const all = (sys as any).makers
    materials.forEach((m, i) => { expect(all[i].material).toBe(m) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })

  // ── CHECK_INTERVAL 节流 ──────────────────────────────────────────────────
  describe('CHECK_INTERVAL 节流', () => {
    it('tick 未达到 CHECK_INTERVAL 时 update() 跳过（lastCheck 不更新）', () => {
      const em = makeEm([])
      sys.update(1, em, CHECK_INTERVAL - 1)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick 达到 CHECK_INTERVAL 时 update() 执行（lastCheck 更新）', () => {
      const em = makeEm([])
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('同一 tick 第二次调用不重复执行', () => {
      // 强制随机总是通过 CRAFT_CHANCE，让有实体就一定录用
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = makeEm([1, 2, 3])
      sys.update(1, em, CHECK_INTERVAL)
      const countAfterFirst = (sys as any).makers.length
      sys.update(1, em, CHECK_INTERVAL)   // lastCheck 已等于 tick，不触发
      expect((sys as any).makers.length).toBe(countAfterFirst)
      vi.restoreAllMocks()
    })
  })

  // ── skillMap：技能持久化 ─────────────────────────────────────────────────
  describe('skillMap 技能持久化与递增', () => {
    it('同一实体第二次触发时 skill 从 skillMap 中读取并增加 SKILL_GROWTH', () => {
      // 强制每次 random()=0 使 CRAFT_CHANCE 总被通过（random()=0 < 0.005？不对，0 > CRAFT_CHANCE 为 false → 通过）
      // 源码: if (Math.random() > CRAFT_CHANCE) continue  → random()=0 不 > 0.005 → 不 skip
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = makeEm([1])

      sys.update(1, em, CHECK_INTERVAL)
      const skill1 = (sys as any).skillMap.get(1) as number
      expect(skill1).toBeGreaterThan(0)

      // 第二次触发需要更大的 tick
      sys.update(1, em, CHECK_INTERVAL * 2)
      const skill2 = (sys as any).skillMap.get(1) as number
      expect(skill2).toBeCloseTo(skill1 + SKILL_GROWTH, 5)

      vi.restoreAllMocks()
    })

    it('skill 上限为 100', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = makeEm([1])
      // 预置 skillMap 接近上限
      ;(sys as any).skillMap.set(1, 99.99)
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).skillMap.get(1)).toBe(100)
      vi.restoreAllMocks()
    })

    it('未注册实体首次 skill 在 [2, 9] 范围内（2 + random()*7）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)  // random()=0
      const em = makeEm([1])
      sys.update(1, em, CHECK_INTERVAL)
      // 初始 skill = (2 + 0*7) + SKILL_GROWTH = 2.058
      const skill = (sys as any).skillMap.get(1) as number
      expect(skill).toBeCloseTo(2 + SKILL_GROWTH, 5)
      vi.restoreAllMocks()
    })
  })

  // ── material 由 skill 决定 ───────────────────────────────────────────────
  describe('material 由 skill 区间决定', () => {
    it('skill < 25 → leather (index 0)', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = makeEm([1])
      // skill 初始很低（~2）
      sys.update(1, em, CHECK_INTERVAL)
      const maker = (sys as any).makers.find((m: Upholsterer) => m.entityId === 1)
      expect(maker?.material).toBe('leather')
      vi.restoreAllMocks()
    })

    it('skill >= 75 → tapestry (index 3)', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = makeEm([1])
      ;(sys as any).skillMap.set(1, 99)   // 99/25=3 → index 3 = tapestry
      sys.update(1, em, CHECK_INTERVAL)
      const maker = (sys as any).makers.find((m: Upholsterer) => m.entityId === 1)
      expect(maker?.material).toBe('tapestry')
      vi.restoreAllMocks()
    })
  })

  // ── time-based cleanup (cutoff = tick - EXPIRE_AFTER) ───────────────────
  describe('time-based cleanup', () => {
    it('tick 字段大于 cutoff 时条目保留', () => {
      const tick = 100000
      const cutoff = tick - EXPIRE_AFTER   // 48500
      const maker = makeMaker(1, { tick: cutoff + 1 })   // 刚好在 cutoff 之后
      ;(sys as any).makers.push(maker)
      // em 返回空避免招募干扰
      const em = makeEm([])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, em, tick)
      expect((sys as any).makers).toHaveLength(1)
    })

    it('tick 字段小于 cutoff 时条目被删除', () => {
      const tick = 100000
      const cutoff = tick - EXPIRE_AFTER
      const maker = makeMaker(1, { tick: cutoff - 1 })   // 超期
      ;(sys as any).makers.push(maker)
      const em = makeEm([])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, em, tick)
      expect((sys as any).makers).toHaveLength(0)
    })

    it('tick 字段恰好等于 cutoff 时条目保留（严格 < 判断，等于时不删）', () => {
      const tick = 100000
      const cutoff = tick - EXPIRE_AFTER
      const maker = makeMaker(1, { tick: cutoff })       // 正好等于 cutoff，条件 < cutoff 为 false → 保留
      ;(sys as any).makers.push(maker)
      const em = makeEm([])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, em, tick)
      expect((sys as any).makers).toHaveLength(1)
    })

    it('混合：过期和未过期共存时只删过期', () => {
      const tick = 100000
      const cutoff = tick - EXPIRE_AFTER
      ;(sys as any).makers.push(makeMaker(1, { tick: cutoff - 1 }))  // 过期
      ;(sys as any).makers.push(makeMaker(2, { tick: cutoff + 1 }))  // 未过期
      const em = makeEm([])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, em, tick)
      expect((sys as any).makers).toHaveLength(1)
      expect((sys as any).makers[0].entityId).toBe(2)
    })
  })

  // ── MAX_MAKERS=30 上限 ───────────────────────────────────────────────────
  describe('MAX_MAKERS=30 上限', () => {
    it('已满30个时不再招募新 maker', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      for (let i = 0; i < 30; i++) {
        ;(sys as any).makers.push(makeMaker(i + 1, { tick: 100000 }))
      }
      const em = makeEm([99], 20)
      sys.update(1, em, CHECK_INTERVAL)
      // cleanup 以 tick=CHECK_INTERVAL, cutoff=CHECK_INTERVAL-51500 < 0，所有 tick=100000 都 > cutoff，不删
      // 招募条件 length >= MAX_MAKERS → break，不新增
      expect((sys as any).makers.length).toBe(30)
      vi.restoreAllMocks()
    })
  })

  // ── 年龄过滤（age < 10 时跳过） ─────────────────────────────────────────
  describe('age 过滤', () => {
    it('creature age < 10 时不创建 maker', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = makeEm([1], 5)    // age=5 < 10
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).makers).toHaveLength(0)
      vi.restoreAllMocks()
    })

    it('creature age >= 10 时可创建 maker', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = makeEm([1], 10)   // age=10，刚好满足
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).makers.length).toBeGreaterThanOrEqual(1)
      vi.restoreAllMocks()
    })
  })
})
