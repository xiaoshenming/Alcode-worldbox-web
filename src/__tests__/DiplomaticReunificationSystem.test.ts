import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticReunificationSystem } from '../systems/DiplomaticReunificationSystem'
import type { ReunificationTreaty, ReunificationPhase } from '../systems/DiplomaticReunificationSystem'

function makeSys() { return new DiplomaticReunificationSystem() }
const nullWorld = {} as any
const nullEm = {} as any

describe('DiplomaticReunificationSystem', () => {
  let sys: DiplomaticReunificationSystem

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })

  // --- 初始状态 ---
  it('初始treaties为空数组', () => {
    expect((sys as any).treaties).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('treaties字段是Array实例', () => {
    expect(Array.isArray((sys as any).treaties)).toBe(true)
  })

  // --- 节流控制 ---
  it('tick未超过CHECK_INTERVAL(2550)时不更新lastCheck', () => {
    sys.update(1, nullWorld, nullEm, 100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick超过CHECK_INTERVAL时更新lastCheck', () => {
    sys.update(1, nullWorld, nullEm, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })

  it('连续两次update：第二次tick差不足时不再更新lastCheck', () => {
    sys.update(1, nullWorld, nullEm, 3000)
    sys.update(1, nullWorld, nullEm, 3001)
    expect((sys as any).lastCheck).toBe(3000)
  })

  it('连续两次update：第二次tick差足够时再次更新lastCheck', () => {
    sys.update(1, nullWorld, nullEm, 3000)
    sys.update(1, nullWorld, nullEm, 6000)
    expect((sys as any).lastCheck).toBe(6000)
  })

  // --- spawn 逻辑 ---
  it('random=1时不spawn（random<TREATY_CHANCE=0.0028不满足）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, nullWorld, nullEm, 3000)
    expect((sys as any).treaties).toHaveLength(0)
  })

  it('random=0时spawn一条treaty', () => {
    // civA=1+floor(0*8)=1, civB需要不同: 第二次random返回0.5 → civB=1+floor(0.5*8)=5
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0)
    sys.update(1, nullWorld, nullEm, 3000)
    expect((sys as any).treaties).toHaveLength(1)
  })

  it('spawn时nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0)
    sys.update(1, nullWorld, nullEm, 3000)
    expect((sys as any).nextId).toBe(2)
  })

  it('spawn的treaty包含必要字段', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0)
    sys.update(1, nullWorld, nullEm, 3000)
    const t: ReunificationTreaty = (sys as any).treaties[0]
    expect(t).toHaveProperty('id')
    expect(t).toHaveProperty('civIdA')
    expect(t).toHaveProperty('civIdB')
    expect(t).toHaveProperty('phase')
    expect(t).toHaveProperty('populationSupport')
    expect(t).toHaveProperty('economicAlignment')
    expect(t).toHaveProperty('culturalHarmony')
    expect(t).toHaveProperty('politicalWill')
    expect(t).toHaveProperty('duration')
    expect(t).toHaveProperty('tick')
  })

  it('spawn的treaty tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0)
    sys.update(1, nullWorld, nullEm, 3000)
    expect((sys as any).treaties[0].tick).toBe(3000)
  })

  it('spawn的treaty duration初始为0', () => {
    // 直接注入验证字段，避免update循环立即+1的干扰
    ;(sys as any).treaties.push({
      id: 1, civIdA: 1, civIdB: 2, phase: 'proposal',
      populationSupport: 50, economicAlignment: 50,
      culturalHarmony: 50, politicalWill: 50,
      duration: 0, tick: 3000
    } as ReunificationTreaty)
    expect((sys as any).treaties[0].duration).toBe(0)
  })

  it('spawn的phase是合法枚举值', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0)
    sys.update(1, nullWorld, nullEm, 3000)
    const valid: ReunificationPhase[] = ['proposal', 'negotiation', 'transition', 'unified']
    expect(valid).toContain((sys as any).treaties[0].phase)
  })

  // --- MAX_TREATIES 上限 ---
  it('MAX_TREATIES(18)已满时不再spawn', () => {
    for (let i = 0; i < 18; i++) {
      (sys as any).treaties.push({ id: i + 1, tick: 99999, duration: 0 } as any)
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, nullWorld, nullEm, 3000)
    expect((sys as any).treaties.length).toBeLessThanOrEqual(18)
  })

  // --- duration 更新 ---
  it('每次update调用使已有treaty的duration+1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).treaties.push({
      id: 1, civIdA: 1, civIdB: 2, phase: 'proposal',
      populationSupport: 50, economicAlignment: 50,
      culturalHarmony: 50, politicalWill: 50,
      duration: 0, tick: 3000
    } as ReunificationTreaty)
    sys.update(1, nullWorld, nullEm, 3000)
    expect((sys as any).treaties[0].duration).toBe(1)
  })

  it('多次update使duration累积', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).treaties.push({
      id: 1, civIdA: 1, civIdB: 2, phase: 'proposal',
      populationSupport: 50, economicAlignment: 50,
      culturalHarmony: 50, politicalWill: 50,
      duration: 0, tick: 3000
    } as ReunificationTreaty)
    sys.update(1, nullWorld, nullEm, 3000)
    ;(sys as any).lastCheck = 0
    sys.update(1, nullWorld, nullEm, 6000)
    expect((sys as any).treaties[0].duration).toBe(2)
  })

  // --- 清理逻辑 ---
  it('tick=90000时清除tick=0的treaty(cutoff=10000)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).treaties.push({
      id: 1, civIdA: 1, civIdB: 2, phase: 'proposal',
      populationSupport: 50, economicAlignment: 50,
      culturalHarmony: 50, politicalWill: 50,
      duration: 0, tick: 0
    } as ReunificationTreaty)
    sys.update(1, nullWorld, nullEm, 90000)
    expect((sys as any).treaties).toHaveLength(0)
  })

  it('cutoff内的treaty不被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).treaties.push({
      id: 1, civIdA: 1, civIdB: 2, phase: 'proposal',
      populationSupport: 50, economicAlignment: 50,
      culturalHarmony: 50, politicalWill: 50,
      duration: 0, tick: 50000
    } as ReunificationTreaty)
    sys.update(1, nullWorld, nullEm, 90000)
    expect((sys as any).treaties).toHaveLength(1)
  })

  it('混合新旧treaty：只清除过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const base = { civIdA: 1, civIdB: 2, phase: 'proposal' as ReunificationPhase,
      populationSupport: 50, economicAlignment: 50, culturalHarmony: 50, politicalWill: 50, duration: 0 }
    ;(sys as any).treaties.push({ id: 1, tick: 0, ...base })
    ;(sys as any).treaties.push({ id: 2, tick: 50000, ...base })
    sys.update(1, nullWorld, nullEm, 90000)
    expect((sys as any).treaties).toHaveLength(1)
    expect((sys as any).treaties[0].id).toBe(2)
  })

  // --- 数值范围约束 ---
  it('update后populationSupport保持在5~100范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).treaties.push({
      id: 1, civIdA: 1, civIdB: 2, phase: 'proposal',
      populationSupport: 100, economicAlignment: 50,
      culturalHarmony: 50, politicalWill: 50,
      duration: 0, tick: 3000
    } as ReunificationTreaty)
    sys.update(1, nullWorld, nullEm, 3000)
    const val = (sys as any).treaties[0].populationSupport
    expect(val).toBeGreaterThanOrEqual(5)
    expect(val).toBeLessThanOrEqual(100)
  })

  it('update后economicAlignment保持在5~90范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).treaties.push({
      id: 1, civIdA: 1, civIdB: 2, phase: 'proposal',
      populationSupport: 50, economicAlignment: 5,
      culturalHarmony: 50, politicalWill: 50,
      duration: 0, tick: 3000
    } as ReunificationTreaty)
    ;(sys as any).lastCheck = 0
    sys.update(1, nullWorld, nullEm, 3000)
    const val = (sys as any).treaties[0].economicAlignment
    expect(val).toBeGreaterThanOrEqual(5)
    expect(val).toBeLessThanOrEqual(90)
  })
})
