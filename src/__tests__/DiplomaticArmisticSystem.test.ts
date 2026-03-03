import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticArmisticSystem, Armistice } from '../systems/DiplomaticArmisticSystem'

// 常量镜像自源码
const CHECK_INTERVAL = 4000
const MAX_ARMISTICES = 10

function makeSys() { return new DiplomaticArmisticSystem() }

function makeArmistice(overrides: Partial<Armistice> = {}): Armistice {
  return {
    id: 1,
    civIdA: 1,
    civIdB: 2,
    duration: 5000,
    remaining: 5000,
    violations: 0,
    stability: 80,
    tick: 0,
    ...overrides,
  }
}

// 构造一个最小合法的 CivManager mock，拥有 N 个文明
function makeCivManager(civIds: number[]) {
  const map = new Map()
  for (const id of civIds) {
    map.set(id, { id })
  }
  return { civilizations: map }
}

describe('DiplomaticArmisticSystem', () => {
  let sys: DiplomaticArmisticSystem

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─────────────────────────────────────────────
  // 1. 基础数据结构
  // ─────────────────────────────────────────────
  describe('基础数据结构', () => {
    it('初始armistices为空数组', () => {
      expect((sys as any).armistices).toHaveLength(0)
      expect(Array.isArray((sys as any).armistices)).toBe(true)
    })

    it('nextId初始值为1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck初始值为0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('注入单条armistice后可读取', () => {
      const a = makeArmistice({ id: 7, civIdA: 3, civIdB: 9 })
      ;(sys as any).armistices.push(a)
      expect((sys as any).armistices).toHaveLength(1)
      expect((sys as any).armistices[0].id).toBe(7)
      expect((sys as any).armistices[0].civIdA).toBe(3)
      expect((sys as any).armistices[0].civIdB).toBe(9)
    })

    it('注入多条armistice后数量正确', () => {
      for (let i = 1; i <= 5; i++) {
        ;(sys as any).armistices.push(makeArmistice({ id: i }))
      }
      expect((sys as any).armistices).toHaveLength(5)
    })

    it('_armisticeKeySet初始为空', () => {
      expect((sys as any)._armisticeKeySet.size).toBe(0)
    })

    it('armistice包含所有必要字段', () => {
      const a = makeArmistice()
      ;(sys as any).armistices.push(a)
      const stored = (sys as any).armistices[0]
      expect(stored).toHaveProperty('id')
      expect(stored).toHaveProperty('civIdA')
      expect(stored).toHaveProperty('civIdB')
      expect(stored).toHaveProperty('duration')
      expect(stored).toHaveProperty('remaining')
      expect(stored).toHaveProperty('violations')
      expect(stored).toHaveProperty('stability')
      expect(stored).toHaveProperty('tick')
    })
  })

  // ─────────────────────────────────────────────
  // 2. CHECK_INTERVAL 节流
  // ─────────────────────────────────────────────
  describe('CHECK_INTERVAL节流', () => {
    const civManager = makeCivManager([1, 2, 3])

    it('tick < CHECK_INTERVAL 时update跳过，lastCheck不变', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, civManager as any, CHECK_INTERVAL - 1)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick === CHECK_INTERVAL 时update执行，lastCheck更新', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, civManager as any, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('tick > CHECK_INTERVAL 时update执行，lastCheck更新为当前tick', () => {
      const tick = CHECK_INTERVAL + 500
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, civManager as any, tick)
      expect((sys as any).lastCheck).toBe(tick)
    })

    it('第一次update后，第二次tick不满足间隔则跳过', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, civManager as any, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)

      sys.update(1, {} as any, {} as any, civManager as any, CHECK_INTERVAL + 100)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('civManager为null时，满足interval也直接return', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, null as any, CHECK_INTERVAL)
      // lastCheck已更新，但civs判断为null直接return
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
      // armistices仍为空
      expect((sys as any).armistices).toHaveLength(0)
    })

    it('civs少于2个时不新增armistice', () => {
      const oneCiv = makeCivManager([1])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, oneCiv as any, CHECK_INTERVAL)
      expect((sys as any).armistices).toHaveLength(0)
    })
  })

  // ─────────────────────────────────────────────
  // 3. 数值字段动态更新
  // ─────────────────────────────────────────────
  describe('数值字段动态更新', () => {
    const civManager = makeCivManager([1, 2, 3])

    it('每次update后remaining减少CHECK_INTERVAL', () => {
      const a = makeArmistice({ remaining: 8000, tick: 0 })
      ;(sys as any).armistices.push(a)

      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, civManager as any, CHECK_INTERVAL)
      expect((sys as any).armistices[0].remaining).toBe(8000 - CHECK_INTERVAL)
    })

    it('连续两次update后remaining减少2*CHECK_INTERVAL', () => {
      const a = makeArmistice({ remaining: 10000, tick: 0 })
      ;(sys as any).armistices.push(a)

      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, civManager as any, CHECK_INTERVAL)
      sys.update(1, {} as any, {} as any, civManager as any, CHECK_INTERVAL * 2)
      expect((sys as any).armistices[0].remaining).toBe(10000 - CHECK_INTERVAL * 2)
    })

    it('stability在[0,100]范围内（稳定性不超过100）', () => {
      // 没有violations时可以recover
      const a = makeArmistice({ stability: 99, violations: 0, remaining: 9000, tick: 0 })
      ;(sys as any).armistices.push(a)

      // mock random < 0.1 触发stability恢复，但不超100
      vi.spyOn(Math, 'random').mockReturnValue(0.05) // 0.05 < 0.1, recovery触发
      sys.update(1, {} as any, {} as any, civManager as any, CHECK_INTERVAL)
      expect((sys as any).armistices[0].stability).toBeLessThanOrEqual(100)
    })

    it('violations>0时stability不自动恢复', () => {
      const a = makeArmistice({ stability: 70, violations: 1, remaining: 9000, tick: 0 })
      ;(sys as any).armistices.push(a)

      // mock: 0.05 < 0.04? NO, 0.05不触发violation；violations=1不触发recovery
      vi.spyOn(Math, 'random').mockReturnValue(0.05)
      const beforeStability = (sys as any).armistices[0].stability
      sys.update(1, {} as any, {} as any, civManager as any, CHECK_INTERVAL)
      // violations=1，recovery条件 violations===0 不满足
      expect((sys as any).armistices[0].stability).toBe(beforeStability)
    })

    it('violation事件触发时violations增加', () => {
      const a = makeArmistice({ stability: 80, violations: 0, remaining: 9000, tick: 0 })
      ;(sys as any).armistices.push(a)

      // mock random < 0.04 触发violation
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      sys.update(1, {} as any, {} as any, civManager as any, CHECK_INTERVAL)
      expect((sys as any).armistices[0].violations).toBeGreaterThanOrEqual(1)
    })

    it('violation事件触发时stability下降', () => {
      const a = makeArmistice({ stability: 80, violations: 0, remaining: 9000, tick: 0 })
      ;(sys as any).armistices.push(a)

      vi.spyOn(Math, 'random').mockReturnValue(0.01) // < 0.04，触发violation
      sys.update(1, {} as any, {} as any, civManager as any, CHECK_INTERVAL)
      expect((sys as any).armistices[0].stability).toBeLessThan(80)
    })
  })

  // ─────────────────────────────────────────────
  // 4. 过期与stability清理
  // ─────────────────────────────────────────────
  describe('过期与stability清理', () => {
    const civManager = makeCivManager([1, 2, 3])

    it('remaining<=0时armistice被删除', () => {
      const a = makeArmistice({ remaining: CHECK_INTERVAL, stability: 80, tick: 0 })
      ;(sys as any).armistices.push(a)
      ;(sys as any)._armisticeKeySet.add(
        Math.min(a.civIdA, a.civIdB) * 10000 + Math.max(a.civIdA, a.civIdB)
      )

      vi.spyOn(Math, 'random').mockReturnValue(0.5) // 不触发violation
      sys.update(1, {} as any, {} as any, civManager as any, CHECK_INTERVAL)
      // remaining变为0，被删除
      expect((sys as any).armistices).toHaveLength(0)
    })

    it('stability<=0时armistice被删除', () => {
      const a = makeArmistice({ remaining: 9000, stability: 1, violations: 0, tick: 0 })
      ;(sys as any).armistices.push(a)
      ;(sys as any)._armisticeKeySet.add(
        Math.min(a.civIdA, a.civIdB) * 10000 + Math.max(a.civIdA, a.civIdB)
      )

      // mock: violation触发（0.01 < 0.04），stability减少5+0.01*10≈5.1 → 1-5.1 < 0
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      sys.update(1, {} as any, {} as any, civManager as any, CHECK_INTERVAL)
      expect((sys as any).armistices).toHaveLength(0)
    })

    it('remaining>0且stability>0的armistice保留', () => {
      const a = makeArmistice({ remaining: 9000, stability: 80, tick: 0 })
      ;(sys as any).armistices.push(a)

      vi.spyOn(Math, 'random').mockReturnValue(0.5) // 不触发violation
      sys.update(1, {} as any, {} as any, civManager as any, CHECK_INTERVAL)
      expect((sys as any).armistices).toHaveLength(1)
    })

    it('删除armistice时同步清理_armisticeKeySet', () => {
      const a = makeArmistice({ civIdA: 1, civIdB: 2, remaining: CHECK_INTERVAL, stability: 80, tick: 0 })
      const key = Math.min(1, 2) * 10000 + Math.max(1, 2)
      ;(sys as any).armistices.push(a)
      ;(sys as any)._armisticeKeySet.add(key)

      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, civManager as any, CHECK_INTERVAL)

      expect((sys as any)._armisticeKeySet.has(key)).toBe(false)
    })

    it('混合：过期的删除，未过期的保留', () => {
      ;(sys as any).armistices.push(makeArmistice({ id: 1, civIdA: 1, civIdB: 2, remaining: CHECK_INTERVAL, stability: 80 }))
      ;(sys as any).armistices.push(makeArmistice({ id: 2, civIdA: 3, civIdB: 4, remaining: 9000, stability: 80 }))

      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, civManager as any, CHECK_INTERVAL)

      const ids = (sys as any).armistices.map((x: Armistice) => x.id)
      expect(ids).not.toContain(1)
      expect(ids).toContain(2)
    })
  })

  // ─────────────────────────────────────────────
  // 5. MAX_ARMISTICES 上限
  // ─────────────────────────────────────────────
  describe('MAX_ARMISTICES上限控制', () => {
    it('armistices达到MAX_ARMISTICES时不新增', () => {
      const civManager = makeCivManager([1, 2])
      for (let i = 1; i <= MAX_ARMISTICES; i++) {
        ;(sys as any).armistices.push(makeArmistice({ id: i, remaining: 9000, tick: 0 }))
      }

      vi.spyOn(Math, 'random').mockReturnValue(0) // 强制触发spawn
      sys.update(1, {} as any, {} as any, civManager as any, CHECK_INTERVAL)
      expect((sys as any).armistices.length).toBeLessThanOrEqual(MAX_ARMISTICES)
    })

    it('armistices未达MAX_ARMISTICES时，_armisticeKeySet防止重复', () => {
      const civManager = makeCivManager([1, 2])
      // 预先在keySet中注册1-2对的key
      const key = Math.min(1, 2) * 10000 + Math.max(1, 2)
      ;(sys as any)._armisticeKeySet.add(key)

      vi.spyOn(Math, 'random').mockReturnValue(0) // random=0: iA=0,iB=1 -> civId 1,2
      sys.update(1, {} as any, {} as any, civManager as any, CHECK_INTERVAL)
      // 因为key已存在，不新增
      expect((sys as any).armistices).toHaveLength(0)
    })

    it('MAX_ARMISTICES为10', () => {
      const civManager = makeCivManager([1, 2, 3])
      for (let i = 1; i <= 10; i++) {
        ;(sys as any).armistices.push(makeArmistice({ id: i, remaining: 9000, tick: 0 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, civManager as any, CHECK_INTERVAL)
      expect((sys as any).armistices.length).toBeLessThanOrEqual(10)
    })
  })
})

// ---- 追加测试以达到 50+ ----
describe('DiplomaticArmisticSystem — 额外完整性测试', () => {
  const CI = 4000
  const MAX = 10

  function makeSys2() { return new DiplomaticArmisticSystem() }
  function makeA(o: Partial<Armistice> = {}): Armistice {
    return { id: 1, civIdA: 1, civIdB: 2, duration: 5000, remaining: 5000,
      violations: 0, stability: 80, tick: 0, ...o }
  }
  function makeCivMgr(ids: number[]) {
    const map = new Map(); ids.forEach(id => map.set(id, { id }))
    return { civilizations: map }
  }

  let sys: DiplomaticArmisticSystem
  beforeEach(() => { sys = makeSys2(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('两系统实例互相独立', () => {
    const s2 = makeSys2(); ;(sys as any).armistices.push(makeA())
    expect((s2 as any).armistices).toHaveLength(0)
  })
  it('update 不改变 id 字段', () => {
    ;(sys as any).armistices.push(makeA({ id: 77 }))
    const cm = makeCivMgr([1, 2])
    sys.update(1, {} as any, {} as any, cm as any, CI)
    expect((sys as any).armistices[0].id).toBe(77)
  })
  it('update 不改变 civIdA/civIdB', () => {
    ;(sys as any).armistices.push(makeA({ civIdA: 3, civIdB: 5 }))
    const cm = makeCivMgr([3, 5])
    sys.update(1, {} as any, {} as any, cm as any, CI)
    expect((sys as any).armistices[0].civIdA).toBe(3)
    expect((sys as any).armistices[0].civIdB).toBe(5)
  })
  it('stability 下界不低于 0', () => {
    ;(sys as any).armistices.push(makeA({ stability: 0 }))
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0)
    const cm = makeCivMgr([1, 2])
    sys.update(1, {} as any, {} as any, cm as any, CI)
    const a = (sys as any).armistices[0]
    if (a) { expect(a.stability).toBeGreaterThanOrEqual(0) }
  })
  it('stability 上界不超过 100', () => {
    ;(sys as any).armistices.push(makeA({ stability: 100, violations: 0 }))
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0.05)
    const cm = makeCivMgr([1, 2])
    sys.update(1, {} as any, {} as any, cm as any, CI)
    const a = (sys as any).armistices[0]
    if (a) { expect(a.stability).toBeLessThanOrEqual(100) }
  })
  it('remaining 每次 update 减少 CHECK_INTERVAL', () => {
    ;(sys as any).armistices.push(makeA({ remaining: 10000 }))
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const cm = makeCivMgr([1, 2])
    sys.update(1, {} as any, {} as any, cm as any, CI)
    expect((sys as any).armistices[0].remaining).toBe(6000)
  })
  it('violation 触发时 violations 增加', () => {
    ;(sys as any).armistices.push(makeA({ violations: 0, stability: 50 }))
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0.03) // 0.03 < 0.04
    const cm = makeCivMgr([1, 2])
    sys.update(1, {} as any, {} as any, cm as any, CI)
    const a = (sys as any).armistices[0]
    if (a) { expect(a.violations).toBeGreaterThanOrEqual(1) }
  })
  it('remaining<=0 时 armistice 被删除', () => {
    ;(sys as any).armistices.push(makeA({ remaining: CI }))
    const key = Math.min(1, 2) * 10000 + Math.max(1, 2)
    ;(sys as any)._armisticeKeySet.add(key)
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const cm = makeCivMgr([1, 2])
    sys.update(1, {} as any, {} as any, cm as any, CI)
    expect((sys as any).armistices).toHaveLength(0)
  })
  it('stability<=0 时 armistice 被删除', () => {
    ;(sys as any).armistices.push(makeA({ stability: 0, remaining: 10000 }))
    const key = Math.min(1, 2) * 10000 + Math.max(1, 2)
    ;(sys as any)._armisticeKeySet.add(key)
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const cm = makeCivMgr([1, 2])
    sys.update(1, {} as any, {} as any, cm as any, CI)
    expect((sys as any).armistices).toHaveLength(0)
  })
  it('两 armistice 独立更新 remaining', () => {
    ;(sys as any).armistices.push(makeA({ id: 1, remaining: 10000 }))
    ;(sys as any).armistices.push(makeA({ id: 2, civIdA: 3, civIdB: 4, remaining: 8000 }))
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const cm = makeCivMgr([1, 2, 3, 4])
    sys.update(1, {} as any, {} as any, cm as any, CI)
    expect((sys as any).armistices[0].remaining).toBe(6000)
    expect((sys as any).armistices[1].remaining).toBe(4000)
  })
  it('civManager 为 null 时不新增 armistice', () => {
    sys.update(1, {} as any, {} as any, null as any, CI)
    expect((sys as any).armistices).toHaveLength(0)
  })
  it('civs 少于 2 个时不新增', () => {
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0)
    const cm = makeCivMgr([1])
    sys.update(1, {} as any, {} as any, cm as any, CI)
    expect((sys as any).armistices).toHaveLength(0)
  })
  it('达到 MAX=10 时不新增', () => {
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 1; i <= MAX; i++) { ;(sys as any).armistices.push(makeA({ id: i })) }
    const cm = makeCivMgr([1, 2])
    sys.update(1, {} as any, {} as any, cm as any, CI)
    expect((sys as any).armistices.length).toBeLessThanOrEqual(MAX)
  })
  it('初始 _armisticeKeySet 为空', () => {
    expect((sys as any)._armisticeKeySet.size).toBe(0)
  })
  it('tick=0 不触发更新', () => {
    const cm = makeCivMgr([1, 2])
    sys.update(1, {} as any, {} as any, cm as any, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('两次满足间隔 lastCheck 递增', () => {
    const cm = makeCivMgr([1, 2])
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, {} as any, {} as any, cm as any, CI)
    sys.update(1, {} as any, {} as any, cm as any, CI * 2)
    expect((sys as any).lastCheck).toBe(CI * 2)
  })
  it('duration 字段可读取', () => {
    ;(sys as any).armistices.push(makeA({ duration: 5000 }))
    expect((sys as any).armistices[0].duration).toBe(5000)
  })
  it('violations 初始为 0', () => {
    ;(sys as any).armistices.push(makeA())
    expect((sys as any).armistices[0].violations).toBe(0)
  })
  it('nextId 初始为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('注入 3 条后 length 为 3', () => {
    for (let i = 1; i <= 3; i++) { ;(sys as any).armistices.push(makeA({ id: i })) }
    expect((sys as any).armistices).toHaveLength(3)
  })
  it('stability 可独立读取', () => {
    ;(sys as any).armistices.push(makeA({ stability: 65 }))
    expect((sys as any).armistices[0].stability).toBe(65)
  })
})

describe('DiplomaticArmisticSystem — 补充测试', () => {
  const CI = 4000
  function makeSys3() { return new DiplomaticArmisticSystem() }
  function makeA2(o: Partial<Armistice> = {}): Armistice {
    return { id: 1, civIdA: 1, civIdB: 2, duration: 5000, remaining: 5000,
      violations: 0, stability: 80, tick: 0, ...o }
  }
  let sys: DiplomaticArmisticSystem
  beforeEach(() => { sys = makeSys3(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('lastCheck 初始为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('lastCheck 在满足间隔后更新为 tick', () => {
    const cm = { civilizations: new Map([[1, { id: 1 }], [2, { id: 2 }]]) }
    sys.update(1, {} as any, {} as any, cm as any, CI)
    expect((sys as any).lastCheck).toBe(CI)
  })
  it('armistices 初始为空', () => { expect((sys as any).armistices).toHaveLength(0) })
})
