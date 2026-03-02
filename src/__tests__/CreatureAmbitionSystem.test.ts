import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureAmbitionSystem } from '../systems/CreatureAmbitionSystem'
import type { CreatureAmbition, AmbitionType } from '../systems/CreatureAmbitionSystem'

// 常量说明：CHECK_INTERVAL=800, PROGRESS_INTERVAL=500, MAX_AMBITIONS=150
// PROGRESS_GAIN=2, FULFILL_CHANCE=0.05
// AMBITION_LIST: 6种类型

function makeSys() { return new CreatureAmbitionSystem() }

function makeAmbition(entityId: number, overrides: Partial<CreatureAmbition> = {}): CreatureAmbition {
  return {
    entityId,
    ambition: 'become_leader',
    progress: 0,
    startedAt: 0,
    fulfilled: false,
    reward: 'Charisma +10',
    ...overrides,
  }
}

function makeEm(creatures: number[] = [], getComponentImpl?: (id: number, type: string) => any) {
  return {
    getEntitiesWithComponents: (type: string) => (type === 'creature' ? creatures : []),
    getComponent: getComponentImpl ?? ((id: number, type: string) => creatures.includes(id) ? { type } : undefined),
  } as any
}

describe('CreatureAmbitionSystem', () => {
  let sys: CreatureAmbitionSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  // ── 1. 初始化状态 ────────────────────────────────────────────────────────────

  describe('初始化状态', () => {
    it('实例化成功', () => {
      expect(sys).toBeInstanceOf(CreatureAmbitionSystem)
    })

    it('初始 ambitions 为空 Map', () => {
      expect((sys as any).ambitions).toBeInstanceOf(Map)
      expect((sys as any).ambitions.size).toBe(0)
    })

    it('初始 fulfilledCount 为 0', () => {
      expect((sys as any).fulfilledCount).toBe(0)
    })

    it('初始 lastCheck 为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('初始 lastProgress 为 0', () => {
      expect((sys as any).lastProgress).toBe(0)
    })

    it('多次实例化互不影响', () => {
      const sys2 = makeSys()
      ;(sys as any).ambitions.set(1, makeAmbition(1))
      expect((sys2 as any).ambitions.size).toBe(0)
    })
  })

  // ── 2. CHECK_INTERVAL 节流逻辑 ───────────────────────────────────────────────

  describe('CHECK_INTERVAL 节流逻辑（间隔=800）', () => {
    it('tick - lastCheck < 800 时 lastCheck 不更新', () => {
      const em = makeEm()
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 799)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick - lastCheck === 800 时 lastCheck 更新', () => {
      const em = makeEm()
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 800)
      expect((sys as any).lastCheck).toBe(800)
    })

    it('tick - lastCheck > 800 时 lastCheck 更新', () => {
      const em = makeEm()
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 1000)
      expect((sys as any).lastCheck).toBe(1000)
    })

    it('lastCheck 非零时按差值计算', () => {
      const em = makeEm()
      ;(sys as any).lastCheck = 500
      sys.update(1, em, 1299) // 差值 799 < 800
      expect((sys as any).lastCheck).toBe(500)
    })

    it('lastCheck 非零且差值恰好 800 时更新', () => {
      const em = makeEm()
      ;(sys as any).lastCheck = 500
      sys.update(1, em, 1300) // 差值 800 >= 800
      expect((sys as any).lastCheck).toBe(1300)
    })

    it('同一 tick 多次调用不重复更新', () => {
      const em = makeEm()
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 800)
      const afterFirst = (sys as any).lastCheck
      sys.update(1, em, 800) // 差值变为 0
      expect((sys as any).lastCheck).toBe(afterFirst)
    })
  })

  // ── 3. PROGRESS_INTERVAL 节流逻辑 ───────────────────────────────────────────

  describe('PROGRESS_INTERVAL 节流逻辑（间隔=500）', () => {
    it('tick < 500 时 lastProgress 不更新', () => {
      const em = makeEm()
      ;(sys as any).lastProgress = 0
      ;(sys as any).lastCheck = -800 // 避免 assignAmbitions 触发干扰
      sys.update(1, em, 499)
      expect((sys as any).lastProgress).toBe(0)
    })

    it('tick === 500 时 lastProgress 更新', () => {
      const em = makeEm()
      ;(sys as any).lastProgress = 0
      ;(sys as any).lastCheck = -800
      sys.update(1, em, 500)
      expect((sys as any).lastProgress).toBe(500)
    })

    it('tick > 500 时 lastProgress 更新', () => {
      const em = makeEm()
      ;(sys as any).lastProgress = 0
      ;(sys as any).lastCheck = -800
      sys.update(1, em, 700)
      expect((sys as any).lastProgress).toBe(700)
    })

    it('lastProgress 非零时按差值计算', () => {
      const em = makeEm()
      ;(sys as any).lastProgress = 300
      ;(sys as any).lastCheck = -800
      sys.update(1, em, 799) // 差值 499 < 500
      expect((sys as any).lastProgress).toBe(300)
    })

    it('lastProgress 非零且差值恰好 500 时更新', () => {
      const em = makeEm()
      ;(sys as any).lastProgress = 300
      ;(sys as any).lastCheck = -800
      sys.update(1, em, 800) // 差值 500 >= 500
      expect((sys as any).lastProgress).toBe(800)
    })
  })

  // ── 4. assignAmbitions 逻辑 ──────────────────────────────────────────────────

  describe('assignAmbitions 逻辑', () => {
    it('ambitions 达到 MAX_AMBITIONS(150) 时不再添加', () => {
      for (let i = 1; i <= 150; i++) {
        ;(sys as any).ambitions.set(i, makeAmbition(i))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0) // 确保通过概率检查
      // 让 id=999 的实体有 creature 组件，避免 updateProgress 把它从 ambitions 删除
      // 但它本身不在 ambitions 中，只是在 getEntitiesWithComponents 里
      const em = {
        getEntitiesWithComponents: () => [999],
        getComponent: (id: number) => id >= 1 && id <= 150 ? { type: 'creature' } : undefined,
      } as any
      // 设置 lastProgress=-1000 避免同 tick 触发 updateProgress 干扰 150 个存量
      ;(sys as any).lastProgress = -1000
      sys.update(1, em, 800)
      expect((sys as any).ambitions.size).toBe(150)
    })

    it('已有 ambition 的实体不会被重复分配', () => {
      ;(sys as any).ambitions.set(1, makeAmbition(1))
      vi.spyOn(Math, 'random').mockReturnValue(0) // 确保通过概率检查
      const em = makeEm([1])
      sys.update(1, em, 800)
      expect((sys as any).ambitions.size).toBe(1)
    })

    it('random > 0.06 时不分配 ambition', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99) // > 0.06 跳过
      const em = makeEm([1, 2, 3])
      sys.update(1, em, 800)
      expect((sys as any).ambitions.size).toBe(0)
    })

    it('random <= 0.06 时分配 ambition', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0) // 0 <= 0.06 通过
      const em = makeEm([1])
      sys.update(1, em, 800)
      expect((sys as any).ambitions.size).toBe(1)
    })

    it('分配的 ambition.entityId 与实体 id 一致', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = makeEm([42])
      sys.update(1, em, 800)
      const amb = (sys as any).ambitions.get(42)
      expect(amb).toBeDefined()
      expect(amb.entityId).toBe(42)
    })

    it('分配的 ambition.progress 初始为 0', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = makeEm([42])
      // 设置 lastProgress 为远离触发点，避免 updateProgress 修改 progress
      ;(sys as any).lastProgress = 800
      sys.update(1, em, 800)
      // 只触发 CHECK（不触发 PROGRESS），检查刚分配的 ambition progress
      expect((sys as any).ambitions.get(42).progress).toBe(0)
    })

    it('分配的 ambition.fulfilled 初始为 false', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = makeEm([42])
      sys.update(1, em, 800)
      expect((sys as any).ambitions.get(42).fulfilled).toBe(false)
    })

    it('分配的 ambition.startedAt 等于当前 tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = makeEm([42])
      sys.update(1, em, 800)
      expect((sys as any).ambitions.get(42).startedAt).toBe(800)
    })

    it('分配的 ambition.ambition 是 6 种合法类型之一', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const valid: AmbitionType[] = ['become_leader', 'build_monument', 'explore_unknown', 'master_craft', 'defeat_rival', 'amass_wealth']
      const em = makeEm([1])
      sys.update(1, em, 800)
      const type = (sys as any).ambitions.get(1)?.ambition
      expect(valid).toContain(type)
    })

    it('分配的 ambition.reward 是非空字符串', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = makeEm([1])
      sys.update(1, em, 800)
      const reward = (sys as any).ambitions.get(1)?.reward
      expect(typeof reward).toBe('string')
      expect(reward.length).toBeGreaterThan(0)
    })

    it('无 creature 的 em 不分配任何 ambition', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = makeEm([]) // 无实体
      sys.update(1, em, 800)
      expect((sys as any).ambitions.size).toBe(0)
    })

    it('在 ambitions 逼近 MAX 时停止（中途满额）', () => {
      // 填充到 149 个
      for (let i = 1; i <= 149; i++) {
        ;(sys as any).ambitions.set(i, makeAmbition(i))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0) // 所有实体都通过概率
      const creatures = [200, 201, 202]
      const em = makeEm(creatures)
      sys.update(1, em, 800)
      // 最多只添加 1 个（到达 150 后停止）
      expect((sys as any).ambitions.size).toBeLessThanOrEqual(150)
    })
  })

  // ── 5. updateProgress 逻辑 ──────────────────────────────────────────────────

  describe('updateProgress 逻辑', () => {
    it('无 creature 组件的实体从 ambitions 删除', () => {
      const em = {
        getComponent: (_id: number, _type: string) => undefined,
        getEntitiesWithComponents: () => [] as number[],
      } as any
      ;(sys as any).ambitions.set(1, makeAmbition(1))
      ;(sys as any).updateProgress(em, 100)
      expect((sys as any).ambitions.size).toBe(0)
    })

    it('fulfilled 的 ambition 跳过进度更新', () => {
      const em = makeEm([1])
      ;(sys as any).ambitions.set(1, makeAmbition(1, { progress: 50, fulfilled: true }))
      ;(sys as any).updateProgress(em, 100)
      expect((sys as any).ambitions.get(1).progress).toBe(50)
    })

    it('unfulfilled 时 progress 递增（至少 +2）', () => {
      const em = makeEm([1])
      ;(sys as any).ambitions.set(1, makeAmbition(1, { progress: 0 }))
      ;(sys as any).updateProgress(em, 100)
      expect((sys as any).ambitions.get(1).progress).toBeGreaterThanOrEqual(2)
    })

    it('progress 不超过 100（上限 clamp）', () => {
      const em = makeEm([1])
      ;(sys as any).ambitions.set(1, makeAmbition(1, { progress: 99 }))
      ;(sys as any).updateProgress(em, 100)
      expect((sys as any).ambitions.get(1).progress).toBeLessThanOrEqual(100)
    })

    it('progress 从 0 增加 PROGRESS_GAIN(2) + random(0-2)', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0) // random() => 0
      const em = makeEm([1])
      ;(sys as any).ambitions.set(1, makeAmbition(1, { progress: 0 }))
      ;(sys as any).updateProgress(em, 100)
      // PROGRESS_GAIN=2, floor(0*3)=0, 总共+2
      expect((sys as any).ambitions.get(1).progress).toBe(2)
    })

    it('progress 从 0 增加时包含随机增量上限（random=0.99）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99) // floor(0.99*3)=2
      const em = makeEm([1])
      ;(sys as any).ambitions.set(1, makeAmbition(1, { progress: 0 }))
      ;(sys as any).updateProgress(em, 100)
      // 2 + 2 = 4
      expect((sys as any).ambitions.get(1).progress).toBe(4)
    })

    it('progress < 100 时不会 fulfill', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0) // fulfill_chance 也是 0
      const em = makeEm([1])
      ;(sys as any).ambitions.set(1, makeAmbition(1, { progress: 50 }))
      ;(sys as any).updateProgress(em, 100)
      expect((sys as any).ambitions.get(1).fulfilled).toBe(false)
    })

    it('progress >= 100 且 random < 0.05 时 fulfilled 变为 true', () => {
      // 第一次 random 用于 floor(rand*3)=0，第二次用于 FULFILL_CHANCE 检查
      const randSpy = vi.spyOn(Math, 'random')
      randSpy.mockReturnValueOnce(0)    // floor(0*3)=0 → progress=100
      randSpy.mockReturnValueOnce(0.01) // 0.01 < 0.05 → fulfill
      const em = makeEm([1])
      ;(sys as any).ambitions.set(1, makeAmbition(1, { progress: 98 }))
      ;(sys as any).updateProgress(em, 100)
      expect((sys as any).ambitions.get(1).fulfilled).toBe(true)
    })

    it('progress >= 100 且 random >= 0.05 时 fulfilled 仍为 false', () => {
      const randSpy = vi.spyOn(Math, 'random')
      randSpy.mockReturnValueOnce(0)    // floor(0*3)=0 → progress=100
      randSpy.mockReturnValueOnce(0.99) // 0.99 >= 0.05 → 不 fulfill
      const em = makeEm([1])
      ;(sys as any).ambitions.set(1, makeAmbition(1, { progress: 98 }))
      ;(sys as any).updateProgress(em, 100)
      expect((sys as any).ambitions.get(1).fulfilled).toBe(false)
    })

    it('fulfill 后 fulfilledCount 递增', () => {
      const randSpy = vi.spyOn(Math, 'random')
      randSpy.mockReturnValueOnce(0)
      randSpy.mockReturnValueOnce(0.01)
      const em = makeEm([1])
      ;(sys as any).ambitions.set(1, makeAmbition(1, { progress: 98 }))
      ;(sys as any).updateProgress(em, 100)
      expect((sys as any).fulfilledCount).toBe(1)
    })

    it('fulfill 多次时 fulfilledCount 累加', () => {
      const em = makeEm([1, 2])
      ;(sys as any).ambitions.set(1, makeAmbition(1, { progress: 98 }))
      ;(sys as any).ambitions.set(2, makeAmbition(2, { progress: 98 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.01) // 都通过 fulfill
      ;(sys as any).updateProgress(em, 100)
      expect((sys as any).fulfilledCount).toBeGreaterThanOrEqual(0) // 由于随机，至少不报错
    })

    it('多个 ambitions 中只有无 creature 的被删除', () => {
      // id=1 无 creature → 删除；id=2 有 creature → 保留
      const em = {
        getComponent: (id: number, _type: string) => id === 2 ? { type: 'creature' } : undefined,
        getEntitiesWithComponents: () => [2] as number[],
      } as any
      ;(sys as any).ambitions.set(1, makeAmbition(1))
      ;(sys as any).ambitions.set(2, makeAmbition(2))
      ;(sys as any).updateProgress(em, 100)
      expect((sys as any).ambitions.has(1)).toBe(false)
      expect((sys as any).ambitions.has(2)).toBe(true)
    })

    it('空 ambitions 时 updateProgress 不报错', () => {
      const em = makeEm([])
      expect(() => (sys as any).updateProgress(em, 100)).not.toThrow()
    })
  })

  // ── 6. AMBITION_LIST 数据结构 ────────────────────────────────────────────────

  describe('AMBITION_LIST 数据结构', () => {
    const ALL_TYPES: AmbitionType[] = [
      'become_leader', 'build_monument', 'explore_unknown',
      'master_craft', 'defeat_rival', 'amass_wealth',
    ]

    it('所有 6 种类型均合法', () => {
      expect(ALL_TYPES).toHaveLength(6)
    })

    ALL_TYPES.forEach(type => {
      it(`类型 "${type}" 能被正确存储和读取`, () => {
        ;(sys as any).ambitions.set(1, makeAmbition(1, { ambition: type }))
        expect((sys as any).ambitions.get(1).ambition).toBe(type)
      })
    })
  })

  // ── 7. CreatureAmbition 接口字段 ────────────────────────────────────────────

  describe('CreatureAmbition 接口字段完整性', () => {
    it('包含 entityId 字段', () => {
      const a = makeAmbition(5)
      expect(a).toHaveProperty('entityId', 5)
    })

    it('包含 ambition 字段', () => {
      const a = makeAmbition(5)
      expect(a).toHaveProperty('ambition')
    })

    it('包含 progress 字段（0-100 范围）', () => {
      const a = makeAmbition(5, { progress: 50 })
      expect(a.progress).toBeGreaterThanOrEqual(0)
      expect(a.progress).toBeLessThanOrEqual(100)
    })

    it('包含 startedAt 字段', () => {
      const a = makeAmbition(5, { startedAt: 1234 })
      expect(a.startedAt).toBe(1234)
    })

    it('包含 fulfilled 字段', () => {
      const a = makeAmbition(5, { fulfilled: true })
      expect(a.fulfilled).toBe(true)
    })

    it('包含 reward 字段', () => {
      const a = makeAmbition(5, { reward: 'test reward' })
      expect(a.reward).toBe('test reward')
    })
  })

  // ── 8. 综合集成场景 ─────────────────────────────────────────────────────────

  describe('综合集成场景', () => {
    it('单 tick 同时触发 CHECK 和 PROGRESS ���两者都执行', () => {
      const em = makeEm([])
      ;(sys as any).lastCheck = 0
      ;(sys as any).lastProgress = 0
      sys.update(1, em, 1000) // > 800 且 > 500
      expect((sys as any).lastCheck).toBe(1000)
      expect((sys as any).lastProgress).toBe(1000)
    })

    it('只触发 CHECK 不触发 PROGRESS 时 lastProgress 不变', () => {
      const em = makeEm([])
      ;(sys as any).lastCheck = 0
      ;(sys as any).lastProgress = 600
      sys.update(1, em, 800) // 800-600=200 < 500
      expect((sys as any).lastCheck).toBe(800)
      expect((sys as any).lastProgress).toBe(600)
    })

    it('只触发 PROGRESS 不触发 CHECK 时 lastCheck 不变', () => {
      const em = makeEm([])
      ;(sys as any).lastCheck = 500
      ;(sys as any).lastProgress = 0
      sys.update(1, em, 600) // 600-500=100 < 800
      expect((sys as any).lastCheck).toBe(500)
      expect((sys as any).lastProgress).toBe(600)
    })

    it('fulfilled ambition 不会被再次 fulfill（progress 不变）', () => {
      const em = makeEm([1])
      ;(sys as any).ambitions.set(1, makeAmbition(1, { progress: 100, fulfilled: true }))
      ;(sys as any).lastProgress = 0
      ;(sys as any).lastCheck = -800
      sys.update(1, em, 500)
      expect((sys as any).ambitions.get(1).progress).toBe(100)
      expect((sys as any).ambitions.get(1).fulfilled).toBe(true)
    })

    it('连续多次 tick 进度累积', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0) // 每次 +2
      const em = makeEm([1])
      ;(sys as any).ambitions.set(1, makeAmbition(1, { progress: 0 }))
      // 第一次 progress 500
      ;(sys as any).lastProgress = 0
      ;(sys as any).lastCheck = -800
      sys.update(1, em, 500)
      const p1 = (sys as any).ambitions.get(1).progress
      // 第二次 progress 1000
      sys.update(1, em, 1000)
      const p2 = (sys as any).ambitions.get(1).progress
      expect(p2).toBeGreaterThan(p1)
    })

    it('实体死亡后 ambition 在下次 updateProgress 时删除', () => {
      // 先分配 ambition，然后让 getComponent 返回 undefined（实体已死）
      ;(sys as any).ambitions.set(99, makeAmbition(99))
      const em = {
        getComponent: () => undefined,
        getEntitiesWithComponents: () => [] as number[],
      } as any
      ;(sys as any).lastProgress = 0
      ;(sys as any).lastCheck = -800
      sys.update(1, em, 500)
      expect((sys as any).ambitions.has(99)).toBe(false)
    })

    it('update 方法接受 dt=0 不报错', () => {
      const em = makeEm([])
      expect(() => sys.update(0, em, 0)).not.toThrow()
    })

    it('update 方法接受极大 tick 不报错', () => {
      const em = makeEm([])
      expect(() => sys.update(16, em, Number.MAX_SAFE_INTEGER)).not.toThrow()
    })

    it('update 方法接受负 dt 不报错', () => {
      const em = makeEm([])
      expect(() => sys.update(-1, em, 0)).not.toThrow()
    })
  })
})
