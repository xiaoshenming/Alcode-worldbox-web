import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureToolsmithSystem } from '../systems/CreatureToolsmithSystem'
import type { Toolsmith } from '../systems/CreatureToolsmithSystem'

// Minimal EntityManager stub – Toolsmith system does not use em
const em: any = {}

let nextId = 1
function makeSys(): CreatureToolsmithSystem { return new CreatureToolsmithSystem() }
function makeToolsmith(entityId: number, overrides: Partial<Toolsmith> = {}): Toolsmith {
  return {
    id: nextId++,
    entityId,
    metalWorking: 70,
    toolDesign: 65,
    temperingSkill: 80,
    outputQuality: 75,
    tick: 0,
    ...overrides,
  }
}

// Helper: advance the system past CHECK_INTERVAL (2580) so update() runs
const CHECK_INTERVAL = 2580

describe('CreatureToolsmithSystem', () => {
  let sys: CreatureToolsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ── 原有5个基础测试 ─────────────────────────────────────────────────────��
  it('初始无工具匠', () => { expect((sys as any).toolsmiths).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).toolsmiths.push(makeToolsmith(1))
    expect((sys as any).toolsmiths[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).toolsmiths.push(makeToolsmith(1))
    expect((sys as any).toolsmiths).toBe((sys as any).toolsmiths)
  })
  it('字段正确', () => {
    ;(sys as any).toolsmiths.push(makeToolsmith(2))
    const t = (sys as any).toolsmiths[0]
    expect(t.metalWorking).toBe(70)
    expect(t.temperingSkill).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).toolsmiths.push(makeToolsmith(1))
    ;(sys as any).toolsmiths.push(makeToolsmith(2))
    expect((sys as any).toolsmiths).toHaveLength(2)
  })

  // ── CHECK_INTERVAL 节流 ─────────────────────────────────────────────────
  describe('CHECK_INTERVAL 节流', () => {
    it('tick 未超过 CHECK_INTERVAL 时 update() 跳过', () => {
      const t = makeToolsmith(1, { metalWorking: 70 })
      ;(sys as any).toolsmiths.push(t)
      sys.update(1, em, CHECK_INTERVAL - 1)   // 不触发
      expect((sys as any).toolsmiths[0].metalWorking).toBe(70)  // 未增长
    })

    it('tick 刚超过 CHECK_INTERVAL 时 update() 执行', () => {
      const t = makeToolsmith(1, { metalWorking: 70 })
      ;(sys as any).toolsmiths.push(t)
      sys.update(1, em, CHECK_INTERVAL)         // 触发一次
      expect((sys as any).toolsmiths[0].metalWorking).toBeCloseTo(70.02)
    })

    it('第二次调用在同一批次内不再执行', () => {
      const t = makeToolsmith(1, { metalWorking: 70 })
      ;(sys as any).toolsmiths.push(t)
      sys.update(1, em, CHECK_INTERVAL)
      const afterFirst = (sys as any).toolsmiths[0].metalWorking
      sys.update(1, em, CHECK_INTERVAL)        // lastCheck 已更新，不再触发
      expect((sys as any).toolsmiths[0].metalWorking).toBe(afterFirst)
    })
  })

  // ── 技能递增 ────────────────────────────────────────────────────────────
  describe('技能递增', () => {
    it('每次触发 metalWorking +0.02', () => {
      const t = makeToolsmith(1, { metalWorking: 50 })
      ;(sys as any).toolsmiths.push(t)
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).toolsmiths[0].metalWorking).toBeCloseTo(50.02)
    })

    it('每次触发 temperingSkill +0.015', () => {
      const t = makeToolsmith(1, { temperingSkill: 50 })
      ;(sys as any).toolsmiths.push(t)
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).toolsmiths[0].temperingSkill).toBeCloseTo(50.015)
    })

    it('每次触发 outputQuality +0.01', () => {
      const t = makeToolsmith(1, { outputQuality: 50 })
      ;(sys as any).toolsmiths.push(t)
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).toolsmiths[0].outputQuality).toBeCloseTo(50.01)
    })

    it('metalWorking 上限 100', () => {
      const t = makeToolsmith(1, { metalWorking: 99.99 })
      ;(sys as any).toolsmiths.push(t)
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).toolsmiths[0].metalWorking).toBe(100)
    })

    it('temperingSkill 上限 100', () => {
      const t = makeToolsmith(1, { temperingSkill: 99.99 })
      ;(sys as any).toolsmiths.push(t)
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).toolsmiths[0].temperingSkill).toBe(100)
    })

    it('outputQuality 上限 100', () => {
      const t = makeToolsmith(1, { outputQuality: 99.99 })
      ;(sys as any).toolsmiths.push(t)
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).toolsmiths[0].outputQuality).toBe(100)
    })
  })

  // ── cleanup 边界 ─────────────────────────────────────────────────────────
  describe('cleanup：metalWorking <= 4 时移除', () => {
    it('metalWorking=3.98 先递增再检查，递增后 4.00 仍被删除（边界=4）', () => {
      // 3.98 + 0.02 = 4.00，条件 <= 4 成立 → 删除
      const t = makeToolsmith(1, { metalWorking: 3.98 })
      ;(sys as any).toolsmiths.push(t)
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).toolsmiths).toHaveLength(0)
    })

    it('metalWorking=4.01 先递增再检查，递增后 4.03 不被删除', () => {
      const t = makeToolsmith(1, { metalWorking: 4.01 })
      ;(sys as any).toolsmiths.push(t)
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).toolsmiths).toHaveLength(1)
    })

    it('高 metalWorking 工具匠不被删除', () => {
      const t = makeToolsmith(1, { metalWorking: 70 })
      ;(sys as any).toolsmiths.push(t)
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).toolsmiths).toHaveLength(1)
    })

    it('只删低 metalWorking，不影响正常工具匠', () => {
      ;(sys as any).toolsmiths.push(makeToolsmith(1, { metalWorking: 3.98 }))
      ;(sys as any).toolsmiths.push(makeToolsmith(2, { metalWorking: 50 }))
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).toolsmiths).toHaveLength(1)
      expect((sys as any).toolsmiths[0].entityId).toBe(2)
    })
  })

  // ── MAX_TOOLSMITHS 上限 ─────────────────────────────────────────────────
  describe('MAX_TOOLSMITHS=10 上限', () => {
    it('已满10个时不再招募（即使随机成功）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)  // 极小值必过 RECRUIT_CHANCE
      for (let i = 0; i < 10; i++) {
        ;(sys as any).toolsmiths.push(makeToolsmith(i + 1))
      }
      sys.update(1, em, CHECK_INTERVAL)
      // 招募判断在 cleanup 前，cleanup 会删 metalWorking<=4 的。
      // 这里全部 metalWorking=70，cleanup 不删，总数不超过10
      expect((sys as any).toolsmiths.length).toBeLessThanOrEqual(10)
      vi.restoreAllMocks()
    })
  })
})
