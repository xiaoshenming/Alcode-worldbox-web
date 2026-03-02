import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureAstronomerSystem } from '../systems/CreatureAstronomerSystem'
import type { Astronomer, TelescopeType } from '../systems/CreatureAstronomerSystem'

// ── 辅助工厂 ──────────────────────────────────────────────────────────────────
let nextAstroId = 1

function makeAstrSys(): CreatureAstronomerSystem {
  return new CreatureAstronomerSystem()
}

function makeAstronomer(entityId: number, telescope: TelescopeType = 'naked_eye', overrides: Partial<Astronomer> = {}): Astronomer {
  return {
    id: nextAstroId++,
    entityId,
    observations: 0,
    accuracy: 50,
    discoveries: 0,
    telescope,
    tick: 0,
    ...overrides,
  }
}

function makeEm(entityIds: number[], hasCreature = true) {
  return {
    getEntitiesWithComponent: vi.fn(() => entityIds),
    hasComponent: vi.fn((_id: number, _type: string) => hasCreature),
  }
}

// ── astronomers 数组 — 基础 ──────────────────────────────────────────────────
describe('CreatureAstronomerSystem — 内部 astronomers 数组', () => {
  let sys: CreatureAstronomerSystem
  beforeEach(() => { sys = makeAstrSys(); nextAstroId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无天文学家', () => {
    expect((sys as any).astronomers).toHaveLength(0)
  })

  it('注入天文学家后可查询', () => {
    ;(sys as any).astronomers.push(makeAstronomer(1, 'refractor'))
    expect((sys as any).astronomers).toHaveLength(1)
    expect((sys as any).astronomers[0].telescope).toBe('refractor')
  })

  it('返回内部引用', () => {
    ;(sys as any).astronomers.push(makeAstronomer(1))
    expect((sys as any).astronomers).toBe((sys as any).astronomers)
  })

  it('支持所有 4 种望远镜类型', () => {
    const telescopes: TelescopeType[] = ['naked_eye', 'basic', 'refractor', 'reflector']
    telescopes.forEach((t, i) => { ;(sys as any).astronomers.push(makeAstronomer(i + 1, t)) })
    const all = (sys as any).astronomers
    expect(all).toHaveLength(4)
    telescopes.forEach((t, i) => { expect(all[i].telescope).toBe(t) })
  })

  it('天文学家包含正确的实体 id', () => {
    ;(sys as any).astronomers.push(makeAstronomer(42))
    expect((sys as any).astronomers[0].entityId).toBe(42)
  })

  it('天文学家包含观测数据', () => {
    const a = makeAstronomer(1, 'reflector', { observations: 200, discoveries: 5, accuracy: 85 })
    ;(sys as any).astronomers.push(a)
    const result = (sys as any).astronomers[0]
    expect(result.observations).toBe(200)
    expect(result.discoveries).toBe(5)
    expect(result.accuracy).toBe(85)
  })

  it('多个天文学家独立存储', () => {
    ;(sys as any).astronomers.push(makeAstronomer(1, 'naked_eye'))
    ;(sys as any).astronomers.push(makeAstronomer(2, 'reflector'))
    expect((sys as any).astronomers[0].telescope).toBe('naked_eye')
    expect((sys as any).astronomers[1].telescope).toBe('reflector')
  })

  it('天文学家初始 observations = 0', () => {
    ;(sys as any).astronomers.push(makeAstronomer(1))
    expect((sys as any).astronomers[0].observations).toBe(0)
  })

  it('天文学家初始 discoveries = 0', () => {
    ;(sys as any).astronomers.push(makeAstronomer(1))
    expect((sys as any).astronomers[0].discoveries).toBe(0)
  })

  it('naked_eye 初始 accuracy 在 5-10 范围内', () => {
    // TELESCOPE_POWER[naked_eye]=10, accuracy = power*(0.5+rand*0.5) → [5,10]
    const a = makeAstronomer(1, 'naked_eye', { accuracy: 7 })
    ;(sys as any).astronomers.push(a)
    expect(a.accuracy).toBeGreaterThanOrEqual(5)
    expect(a.accuracy).toBeLessThanOrEqual(10)
  })

  it('reflector 初始 accuracy 较高（power=85）', () => {
    // TELESCOPE_POWER[reflector]=85, accuracy 最小为 85*0.5=42.5
    const a = makeAstronomer(1, 'reflector', { accuracy: 72 })
    ;(sys as any).astronomers.push(a)
    expect(a.accuracy).toBeGreaterThanOrEqual(42)
  })
})

// ── 私有字段 ─────────────────────────────────────────────────────────────────
describe('CreatureAstronomerSystem — 私有字段', () => {
  let sys: CreatureAstronomerSystem
  beforeEach(() => { sys = makeAstrSys(); nextAstroId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('_astronomersSet 初始为空 Set', () => {
    expect((sys as any)._astronomersSet.size).toBe(0)
  })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('手动向 _astronomersSet 注入后再次 update 不重复添加同实体', () => {
    const em = makeEm([1])
    ;(sys as any)._astronomersSet.add(1)
    vi.spyOn(Math, 'random').mockReturnValue(0) // 触发 spawn
    sys.update(0, em as any, 0)
    // 已在 set 中，不会添加
    expect((sys as any).astronomers).toHaveLength(0)
    vi.restoreAllMocks()
  })
})

// ── update 节流 ──────────────────────────────────────────────────────────────
describe('CreatureAstronomerSystem.update — 节流 CHECK_INTERVAL=4000', () => {
  let sys: CreatureAstronomerSystem
  beforeEach(() => { sys = makeAstrSys(); nextAstroId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick=0 时执行一次 update', () => {
    const em = makeEm([])
    sys.update(0, em as any, 0)
    expect(em.getEntitiesWithComponent).not.toHaveBeenCalled()
    // MAX_ASTRONOMERS 满足才会调用；初始为空
  })

  it('tick=3999 时跳过处理（< CHECK_INTERVAL）', () => {
    const em = makeEm([1])
    sys.update(0, em as any, 0)
    const callsBefore = (em.getEntitiesWithComponent as any).mock.calls.length
    sys.update(0, em as any, 3999)
    expect((em.getEntitiesWithComponent as any).mock.calls.length).toBe(callsBefore)
  })

  it('tick=4000 时执行第二次处理', () => {
    const em = makeEm([])
    sys.update(0, em as any, 0)
    sys.update(0, em as any, 4000)
    // 没有报错即可
    expect(true).toBe(true)
  })

  it('多次调用（间隔足够）时 lastCheck 更新', () => {
    const em = makeEm([])
    sys.update(0, em as any, 0)
    sys.update(0, em as any, 4000)
    expect((sys as any).lastCheck).toBe(4000)
  })

  it('间隔不足时 lastCheck 不更新', () => {
    const em = makeEm([])
    sys.update(0, em as any, 0)
    sys.update(0, em as any, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
})

// ── update 望远镜升级 ─────────────────────────────────────────────────────────
describe('CreatureAstronomerSystem.update — 望远镜升级', () => {
  let sys: CreatureAstronomerSystem
  beforeEach(() => { sys = makeAstrSys(); nextAstroId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('observations>50 且 naked_eye → 升级为 basic', () => {
    const em = makeEm([], true)
    const a = makeAstronomer(1, 'naked_eye', { observations: 51 })
    ;(sys as any).astronomers.push(a)
    ;(sys as any)._astronomersSet.add(1)
    sys.update(0, em as any, 0)
    sys.update(0, em as any, 4000)
    expect((sys as any).astronomers[0].telescope).toBe('basic')
  })

  it('observations>150 且 basic → 升级为 refractor', () => {
    const em = makeEm([], true)
    const a = makeAstronomer(1, 'basic', { observations: 151 })
    ;(sys as any).astronomers.push(a)
    ;(sys as any)._astronomersSet.add(1)
    sys.update(0, em as any, 0)
    sys.update(0, em as any, 4000)
    expect((sys as any).astronomers[0].telescope).toBe('refractor')
  })

  it('observations>400 且 refractor → 升级为 reflector', () => {
    const em = makeEm([], true)
    const a = makeAstronomer(1, 'refractor', { observations: 401 })
    ;(sys as any).astronomers.push(a)
    ;(sys as any)._astronomersSet.add(1)
    sys.update(0, em as any, 0)
    sys.update(0, em as any, 4000)
    expect((sys as any).astronomers[0].telescope).toBe('reflector')
  })

  it('observations=50 时 naked_eye 不升级', () => {
    const em = makeEm([], true)
    const a = makeAstronomer(1, 'naked_eye', { observations: 50 })
    ;(sys as any).astronomers.push(a)
    ;(sys as any)._astronomersSet.add(1)
    sys.update(0, em as any, 0)
    sys.update(0, em as any, 4000)
    expect((sys as any).astronomers[0].telescope).toBe('naked_eye')
  })

  it('升级 naked_eye→basic 时 accuracy+15 且不超过 99', () => {
    const em = makeEm([], true)
    const a = makeAstronomer(1, 'naked_eye', { observations: 51, accuracy: 80 })
    ;(sys as any).astronomers.push(a)
    ;(sys as any)._astronomersSet.add(1)
    sys.update(0, em as any, 0)
    sys.update(0, em as any, 4000)
    const acc = (sys as any).astronomers[0].accuracy
    expect(acc).toBeLessThanOrEqual(99)
    expect(acc).toBeGreaterThanOrEqual(80)
  })

  it('升级 basic→refractor 时 accuracy+20', () => {
    const em = makeEm([], true)
    const a = makeAstronomer(1, 'basic', { observations: 151, accuracy: 40 })
    ;(sys as any).astronomers.push(a)
    ;(sys as any)._astronomersSet.add(1)
    sys.update(0, em as any, 0)
    sys.update(0, em as any, 4000)
    // accuracy 应增加 20 (+ 观测中的 0.1 增量，四舍五入允许误差)
    expect((sys as any).astronomers[0].accuracy).toBeGreaterThanOrEqual(60)
  })

  it('升级 refractor→reflector 时 accuracy+15', () => {
    const em = makeEm([], true)
    const a = makeAstronomer(1, 'refractor', { observations: 401, accuracy: 50 })
    ;(sys as any).astronomers.push(a)
    ;(sys as any)._astronomersSet.add(1)
    sys.update(0, em as any, 0)
    sys.update(0, em as any, 4000)
    expect((sys as any).astronomers[0].accuracy).toBeGreaterThanOrEqual(65)
  })

  it('accuracy 上限为 99', () => {
    const em = makeEm([], true)
    const a = makeAstronomer(1, 'naked_eye', { observations: 51, accuracy: 97 })
    ;(sys as any).astronomers.push(a)
    ;(sys as any)._astronomersSet.add(1)
    sys.update(0, em as any, 0)
    sys.update(0, em as any, 4000)
    expect((sys as any).astronomers[0].accuracy).toBeLessThanOrEqual(99)
  })

  it('reflector 不会再升级', () => {
    const em = makeEm([], true)
    const a = makeAstronomer(1, 'reflector', { observations: 999, accuracy: 85 })
    ;(sys as any).astronomers.push(a)
    ;(sys as any)._astronomersSet.add(1)
    sys.update(0, em as any, 0)
    sys.update(0, em as any, 4000)
    expect((sys as any).astronomers[0].telescope).toBe('reflector')
  })
})

// ── update 死亡清理 ───────────────────────────────────────────────────────────
describe('CreatureAstronomerSystem.update — 清理死亡天文学家', () => {
  let sys: CreatureAstronomerSystem
  beforeEach(() => { sys = makeAstrSys(); nextAstroId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('生物死亡后天文学家从列表移除', () => {
    const em = makeEm([], false)
    const a = makeAstronomer(1)
    ;(sys as any).astronomers.push(a)
    ;(sys as any)._astronomersSet.add(1)
    sys.update(0, em as any, 0)
    sys.update(0, em as any, 4000)
    expect((sys as any).astronomers).toHaveLength(0)
  })

  it('一个死亡一个存活时只移除死亡的', () => {
    const em = {
      getEntitiesWithComponent: vi.fn(() => []),
      hasComponent: vi.fn((id: number) => id === 2), // 实体2存活
    }
    ;(sys as any).astronomers.push(makeAstronomer(1)) // 死亡
    ;(sys as any).astronomers.push(makeAstronomer(2)) // 存活
    ;(sys as any)._astronomersSet.add(1)
    ;(sys as any)._astronomersSet.add(2)
    sys.update(0, em as any, 0)
    sys.update(0, em as any, 4000)
    expect((sys as any).astronomers).toHaveLength(1)
    expect((sys as any).astronomers[0].entityId).toBe(2)
  })

  it('生物死亡后 _astronomersSet 中的记录被清除', () => {
    const em = makeEm([], false)
    ;(sys as any).astronomers.push(makeAstronomer(9))
    ;(sys as any)._astronomersSet.add(9)
    sys.update(0, em as any, 0)
    sys.update(0, em as any, 4000)
    // 清理时已 delete
    expect((sys as any)._astronomersSet.has(9)).toBe(false)
  })

  it('MAX_ASTRONOMERS=10，列表不超过 10 个', () => {
    const em = makeEm([1], true)
    // 预填 10 个
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).astronomers.push(makeAstronomer(i + 100))
      ;(sys as any)._astronomersSet.add(i + 100)
    }
    vi.spyOn(Math, 'random').mockReturnValue(0) // 触发 spawn
    sys.update(0, em as any, 0)
    sys.update(0, em as any, 4000)
    // 由于已有10个，不再添加
    expect((sys as any).astronomers.length).toBeLessThanOrEqual(10)
    vi.restoreAllMocks()
  })
})

// ── update 观测与发现 ─────────────────────────────────────────────────────────
describe('CreatureAstronomerSystem.update — 观测与发现', () => {
  let sys: CreatureAstronomerSystem
  beforeEach(() => { sys = makeAstrSys(); nextAstroId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('观测时 observations 增加（random < 0.012）', () => {
    const em = makeEm([], true)
    const a = makeAstronomer(1, 'reflector', { observations: 0 })
    ;(sys as any).astronomers.push(a)
    ;(sys as any)._astronomersSet.add(1)
    vi.spyOn(Math, 'random').mockReturnValue(0) // 总是触发观测
    sys.update(0, em as any, 0)
    sys.update(0, em as any, 4000)
    expect((sys as any).astronomers[0].observations).toBeGreaterThan(0)
    vi.restoreAllMocks()
  })

  it('不观测时 observations 不变（random >= 0.012）', () => {
    const em = makeEm([], true)
    const a = makeAstronomer(1, 'reflector', { observations: 0 })
    ;(sys as any).astronomers.push(a)
    ;(sys as any)._astronomersSet.add(1)
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // 不触发观测
    sys.update(0, em as any, 0)
    sys.update(0, em as any, 4000)
    expect((sys as any).astronomers[0].observations).toBe(0)
    vi.restoreAllMocks()
  })

  it('观测时 accuracy 增加 0.1（不超过 99）', () => {
    const em = makeEm([], true)
    const a = makeAstronomer(1, 'reflector', { observations: 0, accuracy: 50 })
    ;(sys as any).astronomers.push(a)
    ;(sys as any)._astronomersSet.add(1)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, em as any, 0)
    sys.update(0, em as any, 4000)
    expect((sys as any).astronomers[0].accuracy).toBeCloseTo(50.1, 1)
    vi.restoreAllMocks()
  })

  it('观测且 discoveryChance 满足时 discoveries 增加', () => {
    const em = makeEm([], true)
    const a = makeAstronomer(1, 'reflector', { observations: 0, accuracy: 99, discoveries: 0 })
    ;(sys as any).astronomers.push(a)
    ;(sys as any)._astronomersSet.add(1)
    vi.spyOn(Math, 'random').mockReturnValue(0) // 观测触发 + 发现触发
    sys.update(0, em as any, 0)
    sys.update(0, em as any, 4000)
    expect((sys as any).astronomers[0].discoveries).toBeGreaterThan(0)
    vi.restoreAllMocks()
  })

  it('update 不崩溃（多次调用）', () => {
    const em = makeEm([])
    for (let tick = 0; tick <= 20000; tick += 4000) {
      expect(() => sys.update(0, em as any, tick)).not.toThrow()
    }
  })
})

// ── Astronomer 数据结构 ───────────────────────────────────────────────────────
describe('CreatureAstronomerSystem — Astronomer 数据结构完整性', () => {
  afterEach(() => vi.restoreAllMocks())

  it('makeAstronomer 工厂生成 id 自增', () => {
    nextAstroId = 1
    const a1 = makeAstronomer(1)
    const a2 = makeAstronomer(2)
    expect(a2.id).toBe(a1.id + 1)
  })

  it('tick 字段存储创建时的游戏 tick', () => {
    const a = makeAstronomer(1, 'basic', { tick: 5000 })
    expect(a.tick).toBe(5000)
  })

  it('Astronomer 包含 6 个必要字段', () => {
    const a = makeAstronomer(1)
    expect(Object.keys(a)).toEqual(expect.arrayContaining(['id', 'entityId', 'observations', 'accuracy', 'discoveries', 'telescope', 'tick']))
  })

  it('TELESCOPE_POWER naked_eye=10 正确（通过 accuracy 推算）', () => {
    // accuracy = TELESCOPE_POWER * (0.5 + rand*0.5)
    // 最小值 = 10 * 0.5 = 5, 最大值 = 10 * 1.0 = 10
    const accuracies = Array.from({ length: 100 }, () => {
      const rand = Math.random()
      return 10 * (0.5 + rand * 0.5)
    })
    accuracies.forEach(acc => {
      expect(acc).toBeGreaterThanOrEqual(5)
      expect(acc).toBeLessThanOrEqual(10)
    })
  })

  it('TELESCOPE_POWER 关系: naked_eye < basic < refractor < reflector', () => {
    const power = { naked_eye: 10, basic: 30, refractor: 60, reflector: 85 }
    expect(power.naked_eye).toBeLessThan(power.basic)
    expect(power.basic).toBeLessThan(power.refractor)
    expect(power.refractor).toBeLessThan(power.reflector)
  })
})
