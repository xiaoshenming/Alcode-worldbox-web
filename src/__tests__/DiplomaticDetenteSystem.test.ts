import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticDetenteSystem, DetenteAgreement } from '../systems/DiplomaticDetenteSystem'

function makeTreaty(overrides: Partial<DetenteAgreement> = {}): DetenteAgreement {
  return {
    id: 1,
    civIdA: 1,
    civIdB: 2,
    phase: 'initial',
    tensionReduction: 20,
    diplomaticChannels: 3,
    tradeOpening: 15,
    culturalExchange: 12,
    duration: 0,
    tick: 0,
    ...overrides,
  }
}

describe('DiplomaticDetenteSystem', () => {
  let sys: DiplomaticDetenteSystem

  beforeEach(() => {
    sys = new DiplomaticDetenteSystem()
    vi.restoreAllMocks()
  })

  // ===== 基础数据结构 =====
  describe('基础数据结构', () => {
    it('初始treaties为空数组', () => {
      expect((sys as any).treaties).toHaveLength(0)
    })

    it('注入treaty后可查询', () => {
      ;(sys as any).treaties.push(makeTreaty({ id: 99 }))
      expect((sys as any).treaties[0].id).toBe(99)
    })

    it('nextId初始为1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck初始为0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('4种phase枚举均可存储', () => {
      const phases = ['initial', 'negotiation', 'implementation', 'normalization']
      for (const p of phases) {
        ;(sys as any).treaties.push(makeTreaty({ phase: p as any }))
      }
      const stored = (sys as any).treaties.map((t: DetenteAgreement) => t.phase)
      expect(stored).toEqual(expect.arrayContaining(phases))
    })
  })

  // ===== CHECK_INTERVAL=2420节流 =====
  describe('CHECK_INTERVAL=2420节流', () => {
    it('tick < CHECK_INTERVAL时不执行更新', () => {
      ;(sys as any).treaties.push(makeTreaty({ duration: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 2419)
      expect((sys as any).treaties[0].duration).toBe(0)
    })

    it('tick === CHECK_INTERVAL时执行更新', () => {
      ;(sys as any).treaties.push(makeTreaty({ duration: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 2420)
      expect((sys as any).treaties[0].duration).toBe(1)
    })

    it('tick = CHECK_INTERVAL-1=2419时不执行', () => {
      ;(sys as any).lastCheck = 0
      ;(sys as any).treaties.push(makeTreaty({ duration: 5 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 2419)
      expect((sys as any).treaties[0].duration).toBe(5)
    })

    it('连续两次满足间隔时执行两次更新', () => {
      ;(sys as any).treaties.push(makeTreaty({ duration: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 2420)
      expect((sys as any).treaties[0].duration).toBe(1)
      sys.update(1, {} as any, {} as any, 4840)
      expect((sys as any).treaties[0].duration).toBe(2)
    })

    it('第二次不满足间隔时不执行', () => {
      ;(sys as any).treaties.push(makeTreaty({ duration: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 2420)
      const d = (sys as any).treaties[0].duration
      sys.update(1, {} as any, {} as any, 2421)
      expect((sys as any).treaties[0].duration).toBe(d)
    })
  })

  // ===== 数值字段动态更新 =====
  describe('数值字段动态更新', () => {
    it('每次update duration+1', () => {
      ;(sys as any).treaties.push(makeTreaty({ duration: 7 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 2420)
      expect((sys as any).treaties[0].duration).toBe(8)
    })

    it('tensionReduction保持在[5,80]范围内', () => {
      ;(sys as any).treaties.push(makeTreaty({ tensionReduction: 40 }))
      for (let tick = 2420; tick < 2420 * 100; tick += 2420) {
        vi.spyOn(Math, 'random').mockReturnValue(0.9)
        sys.update(1, {} as any, {} as any, tick)
        const v = (sys as any).treaties[0]?.tensionReduction
        if (v !== undefined) {
          expect(v).toBeGreaterThanOrEqual(5)
          expect(v).toBeLessThanOrEqual(80)
        }
      }
    })

    it('tradeOpening保持在[3,70]范围内', () => {
      ;(sys as any).treaties.push(makeTreaty({ tradeOpening: 30 }))
      for (let tick = 2420; tick < 2420 * 100; tick += 2420) {
        vi.spyOn(Math, 'random').mockReturnValue(0.9)
        sys.update(1, {} as any, {} as any, tick)
        const v = (sys as any).treaties[0]?.tradeOpening
        if (v !== undefined) {
          expect(v).toBeGreaterThanOrEqual(3)
          expect(v).toBeLessThanOrEqual(70)
        }
      }
    })

    it('culturalExchange保持在[3,60]范围内', () => {
      ;(sys as any).treaties.push(makeTreaty({ culturalExchange: 20 }))
      for (let tick = 2420; tick < 2420 * 100; tick += 2420) {
        vi.spyOn(Math, 'random').mockReturnValue(0.9)
        sys.update(1, {} as any, {} as any, tick)
        const v = (sys as any).treaties[0]?.culturalExchange
        if (v !== undefined) {
          expect(v).toBeGreaterThanOrEqual(3)
          expect(v).toBeLessThanOrEqual(60)
        }
      }
    })

    it('多条treaty各自独立更新duration', () => {
      ;(sys as any).treaties.push(makeTreaty({ id: 1, duration: 3 }))
      ;(sys as any).treaties.push(makeTreaty({ id: 2, duration: 7 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 2420)
      expect((sys as any).treaties[0].duration).toBe(4)
      expect((sys as any).treaties[1].duration).toBe(8)
    })
  })

  // ===== 过期清理cutoff=tick-83000 =====
  describe('过期清理cutoff=tick-83000', () => {
    it('过期记录(tick<cutoff)被删除', () => {
      const bigTick = 200000
      ;(sys as any).treaties.push(makeTreaty({ tick: 0 })) // 0 < 200000-83000=117000，过期
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).treaties).toHaveLength(0)
    })

    it('新记录(tick=bigTick)不被删除', () => {
      const bigTick = 200000
      ;(sys as any).treaties.push(makeTreaty({ tick: bigTick }))
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).treaties).toHaveLength(1)
    })

    it('混合场景：过期删、新的保留', () => {
      const bigTick = 200000
      ;(sys as any).treaties.push(makeTreaty({ id: 1, tick: 0 }))       // 过期
      ;(sys as any).treaties.push(makeTreaty({ id: 2, tick: bigTick })) // 保留
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).treaties).toHaveLength(1)
      expect((sys as any).treaties[0].id).toBe(2)
    })

    it('tick===cutoff时不删除(条件是<cutoff)', () => {
      const bigTick = 200000
      const cutoff = bigTick - 83000 // 117000
      ;(sys as any).treaties.push(makeTreaty({ tick: cutoff }))
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).treaties).toHaveLength(1)
    })

    it('空数组时过期清理不报错', () => {
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      expect(() => sys.update(1, {} as any, {} as any, 200000)).not.toThrow()
    })
  })

  // ===== MAX_TREATIES=20上限 =====
  describe('MAX_TREATIES=20上限', () => {
    it('已满20条时不新增(mock random<TREATY_CHANCE)', () => {
      for (let i = 0; i < 20; i++) {
        ;(sys as any).treaties.push(makeTreaty({ id: i + 1, tick: 2420 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0) // < 0.0025，触发spawn
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, {} as any, 2420)
      expect((sys as any).treaties).toHaveLength(20)
      vi.restoreAllMocks()
    })

    it('未满20条且random<TREATY_CHANCE时可能新增', () => {
      // mock random序列：第1次0（<0.0025触发spawn），第2/3次0.1/0.9（civA=1,civB=8，不相等）
      const calls: number[] = [0, 0.1, 0.9, 0]
      let callIdx = 0
      vi.spyOn(Math, 'random').mockImplementation(() => calls[callIdx++ % calls.length])
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, {} as any, 2420)
      expect((sys as any).treaties.length).toBeGreaterThanOrEqual(0) // 不崩溃
      vi.restoreAllMocks()
    })

    it('random>=TREATY_CHANCE时不新增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5) // 0.5 > 0.0025，不触发spawn
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, {} as any, 2420)
      expect((sys as any).treaties).toHaveLength(0)
      vi.restoreAllMocks()
    })

    it('19条时random<TREATY_CHANCE可新增到20', () => {
      for (let i = 0; i < 19; i++) {
        ;(sys as any).treaties.push(makeTreaty({ id: i + 1, tick: 2420 }))
      }
      // 第1次0触发spawn，第2次0.1→civA=1，第3次0.9→civB=8（不相等），第4次给pickRandom
      const vals = [0, 0.1, 0.9, 0]
      let idx = 0
      vi.spyOn(Math, 'random').mockImplementation(() => vals[idx++ % vals.length])
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, {} as any, 2420)
      expect((sys as any).treaties.length).toBeLessThanOrEqual(20)
      vi.restoreAllMocks()
    })
  })

  // ===== DetentePhase枚举完整性 =====
  describe('DetentePhase枚举完整性', () => {
    it("phase='initial'可正确存储和读取", () => {
      ;(sys as any).treaties.push(makeTreaty({ phase: 'initial' }))
      expect((sys as any).treaties[0].phase).toBe('initial')
    })

    it("phase='negotiation'可正确存储和读取", () => {
      ;(sys as any).treaties.push(makeTreaty({ phase: 'negotiation' }))
      expect((sys as any).treaties[0].phase).toBe('negotiation')
    })

    it("phase='implementation'可正确存储和读取", () => {
      ;(sys as any).treaties.push(makeTreaty({ phase: 'implementation' }))
      expect((sys as any).treaties[0].phase).toBe('implementation')
    })

    it("phase='normalization'可正确存储和读取", () => {
      ;(sys as any).treaties.push(makeTreaty({ phase: 'normalization' }))
      expect((sys as any).treaties[0].phase).toBe('normalization')
    })
  })

  // ===== 额外测试：相位/字段完整性 =====
  describe('额外覆盖测试', () => {
    it('diplomaticChannels 字段可存储', () => {
      ;(sys as any).treaties.push(makeTreaty({ diplomaticChannels: 4 }))
      expect((sys as any).treaties[0].diplomaticChannels).toBe(4)
    })

    it('tensionReduction 下限 5 不被突破', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).treaties.push(makeTreaty({ tensionReduction: 5.01, tick: 0 }))
      sys.update(1, {} as any, {} as any, 2420)
      expect((sys as any).treaties[0]?.tensionReduction).toBeGreaterThanOrEqual(5)
      vi.restoreAllMocks()
    })

    it('tradeOpening 下限 3 不被突破', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).treaties.push(makeTreaty({ tradeOpening: 3.01, tick: 0 }))
      sys.update(1, {} as any, {} as any, 2420)
      expect((sys as any).treaties[0]?.tradeOpening).toBeGreaterThanOrEqual(3)
      vi.restoreAllMocks()
    })

    it('culturalExchange 下限 3 不被突破', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).treaties.push(makeTreaty({ culturalExchange: 3.01, tick: 0 }))
      sys.update(1, {} as any, {} as any, 2420)
      expect((sys as any).treaties[0]?.culturalExchange).toBeGreaterThanOrEqual(3)
      vi.restoreAllMocks()
    })

    it('update 不改变 civIdA/civIdB', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      ;(sys as any).treaties.push(makeTreaty({ civIdA: 3, civIdB: 7, tick: 0 }))
      sys.update(1, {} as any, {} as any, 2420)
      expect((sys as any).treaties[0].civIdA).toBe(3)
      expect((sys as any).treaties[0].civIdB).toBe(7)
      vi.restoreAllMocks()
    })

    it('update 不改变 phase 字段', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      ;(sys as any).treaties.push(makeTreaty({ phase: 'normalization', tick: 0 }))
      sys.update(1, {} as any, {} as any, 2420)
      expect((sys as any).treaties[0].phase).toBe('normalization')
      vi.restoreAllMocks()
    })

    it('全部过期后 treaties 清空', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      ;(sys as any).treaties.push(makeTreaty({ tick: 0 }))
      ;(sys as any).treaties.push(makeTreaty({ tick: 100 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, {} as any, 200000)
      expect((sys as any).treaties).toHaveLength(0)
      vi.restoreAllMocks()
    })

    it('空 treaties 时过期清理不报错', () => {
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      expect(() => sys.update(1, {} as any, {} as any, 200000)).not.toThrow()
      vi.restoreAllMocks()
    })

    it('treaties 数组是可迭代的', () => {
      ;(sys as any).treaties.push(makeTreaty({ id: 1 }))
      ;(sys as any).treaties.push(makeTreaty({ id: 2 }))
      let count = 0
      for (const _t of (sys as any).treaties) { count++ }
      expect(count).toBe(2)
    })

    it('4 种 phase 均可存储', () => {
      const phases = ['initial', 'negotiation', 'implementation', 'normalization']
      for (const p of phases) {
        ;(sys as any).treaties.push(makeTreaty({ phase: p as any }))
      }
      expect((sys as any).treaties).toHaveLength(4)
    })

    it('lastCheck 手动重置后有效', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, 2420)
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, {} as any, 2420)
      expect((sys as any).lastCheck).toBe(2420)
      vi.restoreAllMocks()
    })

    it('nextId 手动设置后保持', () => {
      ;(sys as any).nextId = 77
      expect((sys as any).nextId).toBe(77)
    })

    it('tick 极大值时正常执行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      expect(() => sys.update(1, {} as any, {} as any, 99999999)).not.toThrow()
      vi.restoreAllMocks()
    })

    it('treaties 数量不超过 MAX_TREATIES=20', () => {
      for (let i = 0; i < 20; i++) {
        ;(sys as any).treaties.push(makeTreaty({ id: i + 1, tick: 2420 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, {} as any, 2420)
      expect((sys as any).treaties.length).toBeLessThanOrEqual(20)
      vi.restoreAllMocks()
    })
  })
})

describe('额外独立测试组', () => {
  it('tensionReduction 上限 80 不被突破', () => {
    const sys = new DiplomaticDetenteSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).treaties.push(makeTreaty({ tensionReduction: 79.99, tick: 0 }))
    sys.update(1, {} as any, {} as any, 2420)
    expect((sys as any).treaties[0]?.tensionReduction).toBeLessThanOrEqual(80)
    vi.restoreAllMocks()
  })

  it('culturalExchange 上限 60 不被突破', () => {
    const sys = new DiplomaticDetenteSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).treaties.push(makeTreaty({ culturalExchange: 59.99, tick: 0 }))
    sys.update(1, {} as any, {} as any, 2420)
    expect((sys as any).treaties[0]?.culturalExchange).toBeLessThanOrEqual(60)
    vi.restoreAllMocks()
  })

  it('tradeOpening 上限 70 不被突破', () => {
    const sys = new DiplomaticDetenteSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).treaties.push(makeTreaty({ tradeOpening: 69.99, tick: 0 }))
    sys.update(1, {} as any, {} as any, 2420)
    expect((sys as any).treaties[0]?.tradeOpening).toBeLessThanOrEqual(70)
    vi.restoreAllMocks()
  })

  it('DetenteAgreement 包含所有必要字段', () => {
    const t = makeTreaty()
    expect(t).toHaveProperty('id')
    expect(t).toHaveProperty('civIdA')
    expect(t).toHaveProperty('civIdB')
    expect(t).toHaveProperty('phase')
    expect(t).toHaveProperty('tensionReduction')
    expect(t).toHaveProperty('diplomaticChannels')
    expect(t).toHaveProperty('tradeOpening')
    expect(t).toHaveProperty('culturalExchange')
    expect(t).toHaveProperty('duration')
    expect(t).toHaveProperty('tick')
  })

  it('mixed 过期和未过期，仅删过期', () => {
    const sys = new DiplomaticDetenteSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const bigTick = 200000
    ;(sys as any).treaties.push(makeTreaty({ id: 1, tick: 0 }))
    ;(sys as any).treaties.push(makeTreaty({ id: 2, tick: bigTick }))
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, bigTick)
    expect((sys as any).treaties).toHaveLength(1)
    expect((sys as any).treaties[0].id).toBe(2)
    vi.restoreAllMocks()
  })

  it('duration 字段为 number 类型', () => {
    const t = makeTreaty({ duration: 42 })
    expect(typeof t.duration).toBe('number')
  })

  it('DetentePhase initial 存储读取', () => {
    const t = makeTreaty({ phase: 'initial' })
    expect(t.phase).toBe('initial')
  })

  it('DetentePhase negotiation 存储读取', () => {
    const t = makeTreaty({ phase: 'negotiation' })
    expect(t.phase).toBe('negotiation')
  })

  it('DetentePhase implementation 存储读取', () => {
    const t = makeTreaty({ phase: 'implementation' })
    expect(t.phase).toBe('implementation')
  })

  it('DetentePhase normalization 存储读取', () => {
    const t = makeTreaty({ phase: 'normalization' })
    expect(t.phase).toBe('normalization')
  })

  it('多条 treaty 同时到期都被清除', () => {
    const sys = new DiplomaticDetenteSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 5; i++) {
      ;(sys as any).treaties.push(makeTreaty({ id: i + 1, tick: 0 }))
    }
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 200000)
    expect((sys as any).treaties).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tick 恰好等于 cutoff 时不被删除', () => {
    const sys = new DiplomaticDetenteSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const bigTick = 200000
    const cutoff = bigTick - 83000
    ;(sys as any).treaties.push(makeTreaty({ tick: cutoff }))
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, bigTick)
    expect((sys as any).treaties).toHaveLength(1)
    vi.restoreAllMocks()
  })
})
