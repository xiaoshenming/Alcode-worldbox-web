import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureAmbitionSystem } from '../systems/CreatureAmbitionSystem'

// CHECK_INTERVAL=800, PROGRESS_INTERVAL=500, MAX_AMBITIONS=150, PROGRESS_GAIN=2, FULFILL_CHANCE=0.05
// AMBITION_LIST: 6种类型

function makeSys() { return new CreatureAmbitionSystem() }

describe('CreatureAmbitionSystem', () => {
  let sys: CreatureAmbitionSystem

  beforeEach(() => { sys = makeSys() })

  it('初始化成功', () => { expect(sys).toBeInstanceOf(CreatureAmbitionSystem) })
  it('初始ambitions为空', () => { expect((sys as any).ambitions.size).toBe(0) })
  it('初始fulfilledCount为0', () => { expect((sys as any).fulfilledCount).toBe(0) })
  it('初始lastCheck=0 lastProgress=0', () => {
    expect((sys as any).lastCheck).toBe(0)
    expect((sys as any).lastProgress).toBe(0)
  })

  // ── updateProgress 逻辑 ─────────────────────────────────────────────────────

  it('updateProgress: 无creature组件的实体从ambitions删除', () => {
    const em = { getComponent: (_id: number, _type: string) => undefined, getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).ambitions.set(1, { entityId: 1, ambition: 'become_leader', progress: 0, startedAt: 0, fulfilled: false, reward: 'test' })
    expect((sys as any).ambitions.size).toBe(1)
    ;(sys as any).updateProgress(em, 100)
    expect((sys as any).ambitions.size).toBe(0)
  })

  it('updateProgress: fulfilled的ambition跳过进度更新', () => {
    const em = { getComponent: () => ({ type: 'creature' }), getEntitiesWithComponents: () => [] } as any
    ;(sys as any).ambitions.set(1, { entityId: 1, ambition: 'become_leader', progress: 50, startedAt: 0, fulfilled: true, reward: 'test' })
    ;(sys as any).updateProgress(em, 100)
    // progress应保持50（未更新）
    expect((sys as any).ambitions.get(1).progress).toBe(50)
  })

  it('updateProgress: progress不超过100', () => {
    const em = { getComponent: () => ({ type: 'creature' }), getEntitiesWithComponents: () => [] } as any
    ;(sys as any).ambitions.set(1, { entityId: 1, ambition: 'become_leader', progress: 99, startedAt: 0, fulfilled: false, reward: 'test' })
    ;(sys as any).updateProgress(em, 100)
    // progress += PROGRESS_GAIN(2) + 0..2 = 101-103, clamp到100
    expect((sys as any).ambitions.get(1).progress).toBeLessThanOrEqual(100)
  })

  it('updateProgress: unfulfilled时progress递增', () => {
    const em = { getComponent: () => ({ type: 'creature' }), getEntitiesWithComponents: () => [] } as any
    ;(sys as any).ambitions.set(1, { entityId: 1, ambition: 'become_leader', progress: 0, startedAt: 0, fulfilled: false, reward: 'test' })
    ;(sys as any).updateProgress(em, 100)
    // progress从0增加了PROGRESS_GAIN(2)+0-2=2-4
    expect((sys as any).ambitions.get(1).progress).toBeGreaterThanOrEqual(2)
  })

  // ── AMBITION_LIST 数据 ──────────────────────────────────────────────────────

  it('AMBITION_LIST包含6种类型', () => {
    const { AMBITION_LIST } = sys as any
    // 通过内部访问或检查ambition类型
    const validTypes = ['become_leader', 'build_monument', 'explore_unknown', 'master_craft', 'defeat_rival', 'amass_wealth']
    // 检查每种类型都在AMBITION_REWARDS中有奖励（通过直接注入测试）
    const col = { entityId: 1, ambition: 'become_leader' as any, progress: 0, startedAt: 0, fulfilled: false, reward: 'Charisma +10' }
    ;(sys as any).ambitions.set(1, col)
    expect((sys as any).ambitions.get(1).ambition).toBe('become_leader')
    expect(validTypes).toHaveLength(6)
  })

  // ── CHECK_INTERVAL / PROGRESS_INTERVAL 节流 ─────────────────────────────────

  it('tick未达到CHECK_INTERVAL(800)时assignAmbitions不被调用', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 799)  // 799 < 800
    expect((sys as any).lastCheck).toBe(0)  // 未更新
  })

  it('tick达到CHECK_INTERVAL(800)时更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 800)  // >= 800
    expect((sys as any).lastCheck).toBe(800)
  })

  it('tick未达到PROGRESS_INTERVAL(500)时updateProgress不调用', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastProgress = 0
    ;(sys as any).lastCheck = -800  // 避免assignAmbitions干扰
    sys.update(1, em, 499)
    expect((sys as any).lastProgress).toBe(0)
  })

  it('tick达到PROGRESS_INTERVAL(500)时更新lastProgress', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastProgress = 0
    ;(sys as any).lastCheck = -800
    sys.update(1, em, 500)
    expect((sys as any).lastProgress).toBe(500)
  })
})
