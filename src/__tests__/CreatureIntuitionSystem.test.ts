import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureIntuitionSystem } from '../systems/CreatureIntuitionSystem'
import type { Intuition, IntuitionSense } from '../systems/CreatureIntuitionSystem'

// BASE_ACCURACY=20, WISDOM_ACCURACY_BONUS=0.6, CHECK_INTERVAL=700, MAX_INTUITIONS=80
// getWisdom: min(100, 50 + age*0.3)
// applyIntuitionEffect: danger→health+bonus, opportunity/treasure→+bonus*0.5

function makeSys() { return new CreatureIntuitionSystem() }

function makeIntuition(id: number, sense: IntuitionSense = 'danger', accuracy = 60): Intuition {
  return { id, entityId: 1, sense, accuracy, triggered: false, tick: 0 }
}

function makeNeeds(health = 50) {
  return { type: 'needs', health, hunger: 0 } as any
}

describe('CreatureIntuitionSystem', () => {
  let sys: CreatureIntuitionSystem

  beforeEach(() => { sys = makeSys() })

  it('初始化成功', () => { expect(sys).toBeInstanceOf(CreatureIntuitionSystem) })
  it('初始intuitions为空', () => { expect((sys as any).intuitions.length).toBe(0) })
  it('初始nextId=1', () => { expect((sys as any).nextId).toBe(1) })

  // ── getWisdom 逻辑 ──────────────────────────────────────────────────────────

  it('getWisdom(age=0): min(100, 50+0*0.3)=50', () => {
    const creature = { age: 0 } as any
    expect((sys as any).getWisdom(creature)).toBe(50)
  })

  it('getWisdom(age=100): min(100, 50+100*0.3)=80', () => {
    const creature = { age: 100 } as any
    expect((sys as any).getWisdom(creature)).toBe(80)
  })

  it('getWisdom(age=200): min(100, 50+200*0.3)=100(clamp)', () => {
    const creature = { age: 200 } as any
    expect((sys as any).getWisdom(creature)).toBe(100)
  })

  it('getWisdom: age未定义时=0→wisdom=50', () => {
    const creature = {} as any  // age undefined → 0
    expect((sys as any).getWisdom(creature)).toBe(50)
  })

  // ── applyIntuitionEffect 逻辑 ────────────────────────────────────────────────

  it('applyIntuitionEffect: danger类型给health+bonus(accuracy*0.05)', () => {
    const needs = makeNeeds(50)
    const intuition = makeIntuition(1, 'danger', 60)  // bonus=60*0.05=3
    ;(sys as any).applyIntuitionEffect(needs, intuition)
    expect(needs.health).toBe(53)
  })

  it('applyIntuitionEffect: opportunity类型给health+bonus*0.5', () => {
    const needs = makeNeeds(50)
    const intuition = makeIntuition(1, 'opportunity', 60)  // bonus=3, *0.5=1.5
    ;(sys as any).applyIntuitionEffect(needs, intuition)
    expect(needs.health).toBeCloseTo(51.5)
  })

  it('applyIntuitionEffect: treasure类型给health+bonus*0.5', () => {
    const needs = makeNeeds(50)
    const intuition = makeIntuition(1, 'treasure', 80)  // bonus=4, *0.5=2
    ;(sys as any).applyIntuitionEffect(needs, intuition)
    expect(needs.health).toBeCloseTo(52)
  })

  it('applyIntuitionEffect: health不超过100(clamp)', () => {
    const needs = makeNeeds(99)
    const intuition = makeIntuition(1, 'danger', 100)  // bonus=5, 99+5=104 → clamp到100
    ;(sys as any).applyIntuitionEffect(needs, intuition)
    expect(needs.health).toBe(100)
  })

  // ── pruneOld 逻辑 ────────────────────────────────────────────────────────────

  it('pruneOld: <=MAX_INTUITIONS(80)时不截断', () => {
    for (let i = 1; i <= 80; i++) (sys as any).intuitions.push(makeIntuition(i))
    ;(sys as any).pruneOld()
    expect((sys as any).intuitions.length).toBeLessThanOrEqual(80)
  })

  it('pruneOld: >80时先删triggered再截断', () => {
    // 推90个，其中10个已触发
    for (let i = 1; i <= 90; i++) {
      const intu = makeIntuition(i)
      intu.triggered = i <= 10  // id=1-10 triggered
      ;(sys as any).intuitions.push(intu)
    }
    ;(sys as any).pruneOld()
    // 删掉10个triggered后剩80个，不需要再截断
    expect((sys as any).intuitions.length).toBeLessThanOrEqual(80)
  })

  // ── CHECK_INTERVAL 节流 ─────────────────────────────────────────────────────

  it('tick未达到CHECK_INTERVAL(700)时不更新', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 699)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick达到CHECK_INTERVAL(700)时更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 700)
    expect((sys as any).lastCheck).toBe(700)
  })
})
