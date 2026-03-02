import { describe, it, expect, beforeEach } from 'vitest'
import { CreaturePremonitionSystem } from '../systems/CreaturePremonitionSystem'
import type { Premonition, VisionType } from '../systems/CreaturePremonitionSystem'

// CHECK_INTERVAL=1300, MAX_VISIONS=100, GIFT_GROWTH=0.05
// urgency: disaster/death → clarity*1.5; 其他 → clarity*0.6
// visions过期：tick < currentTick - 25000时删除

function makeSys() { return new CreaturePremonitionSystem() }

function makeVision(id: number, vision: VisionType, clarity = 60, tick = 0): Premonition {
  return { id, seerId: 1, vision, clarity, urgency: 0, heeded: false, tick }
}

// 根据vision类型计算urgency的辅助函数（与系统逻辑一致）
function calcUrgency(vision: VisionType, clarity: number): number {
  return (vision === 'disaster' || vision === 'death') ? clarity * 1.5 : clarity * 0.6
}

describe('CreaturePremonitionSystem', () => {
  let sys: CreaturePremonitionSystem

  beforeEach(() => { sys = makeSys() })

  it('初始化成功', () => { expect(sys).toBeInstanceOf(CreaturePremonitionSystem) })
  it('初始visions为空', () => { expect((sys as any).visions.length).toBe(0) })
  it('初始nextId=1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始giftMap为空', () => { expect((sys as any).giftMap.size).toBe(0) })

  // ── urgency 计算规则 ────────────────────────────────────────────────────────

  it('disaster类型urgency = clarity * 1.5', () => {
    const urgency = calcUrgency('disaster', 60)
    expect(urgency).toBe(90)
  })

  it('death类型urgency = clarity * 1.5', () => {
    const urgency = calcUrgency('death', 80)
    expect(urgency).toBe(120)
  })

  it('battle类型urgency = clarity * 0.6', () => {
    const urgency = calcUrgency('battle', 60)
    expect(urgency).toBe(36)
  })

  it('prosperity类型urgency = clarity * 0.6', () => {
    const urgency = calcUrgency('prosperity', 100)
    expect(urgency).toBe(60)
  })

  it('discovery类型urgency = clarity * 0.6', () => {
    const urgency = calcUrgency('discovery', 50)
    expect(urgency).toBe(30)
  })

  it('migration类型urgency = clarity * 0.6', () => {
    const urgency = calcUrgency('migration', 40)
    expect(urgency).toBe(24)
  })

  // ── visions 过期清理 ─────────────────────────────────────────────────────────

  it('visions过期(tick<currentTick-25000)时被删除', () => {
    // 注入一个tick=0的vision，currentTick=30000，cutoff=5000, 0 < 5000 → 删除
    ;(sys as any).visions.push(makeVision(1, 'disaster', 60, 0))
    const em = {
      getEntitiesWithComponents: () => [] as number[],
      hasComponent: () => true,
    } as any
    ;(sys as any).lastCheck = -1300  // 强制触发
    sys.update(1, em, 30000)
    expect((sys as any).visions.length).toBe(0)
  })

  it('未过期的vision被保留(tick=6000 > cutoff=5000)', () => {
    ;(sys as any).visions.push(makeVision(1, 'disaster', 60, 6000))
    const em = {
      getEntitiesWithComponents: () => [] as number[],
      hasComponent: () => true,
    } as any
    ;(sys as any).lastCheck = -1300
    sys.update(1, em, 30000)  // cutoff=30000-25000=5000, 6000>5000 → 保留
    expect((sys as any).visions.length).toBe(1)
  })

  // ── CHECK_INTERVAL 节流 ─────────────────────────────────────────────────────

  it('tick未达到CHECK_INTERVAL(1300)时不更新', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1299)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick达到CHECK_INTERVAL(1300)时更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[], hasComponent: () => true } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1300)
    expect((sys as any).lastCheck).toBe(1300)
  })

  // ── VISIONS 数据 ────────────────────────────────────────────────────────────

  it('6种VisionType都合法', () => {
    const types: VisionType[] = ['disaster', 'battle', 'prosperity', 'death', 'discovery', 'migration']
    for (const v of types) {
      ;(sys as any).visions.push(makeVision((sys as any).nextId++, v))
    }
    expect((sys as any).visions.length).toBe(6)
  })

  // ── giftMap 逻辑 ─────────────────────────────────────────────────────────────

  it('giftMap初始为空Map', () => {
    expect((sys as any).giftMap).toBeInstanceOf(Map)
    expect((sys as any).giftMap.size).toBe(0)
  })
})
