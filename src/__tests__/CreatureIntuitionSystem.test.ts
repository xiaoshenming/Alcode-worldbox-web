import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureIntuitionSystem } from '../systems/CreatureIntuitionSystem'
import type { Intuition, IntuitionSense } from '../systems/CreatureIntuitionSystem'

// BASE_ACCURACY=20, WISDOM_ACCURACY_BONUS=0.6, CHECK_INTERVAL=700, MAX_INTUITIONS=80
// getWisdom: min(100, 50 + age*0.3)
// applyIntuitionEffect: danger→health+bonus, opportunity/treasure/weather/betrayal/death→+bonus*0.5

function makeSys() { return new CreatureIntuitionSystem() }

function makeIntuition(id: number, sense: IntuitionSense = 'danger', accuracy = 60): Intuition {
  return { id, entityId: 1, sense, accuracy, triggered: false, tick: 0 }
}

function makeNeeds(health = 50) {
  return { type: 'needs', health, hunger: 0 } as any
}

afterEach(() => vi.restoreAllMocks())

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureIntuitionSystem — 初始化', () => {
  let sys: CreatureIntuitionSystem
  beforeEach(() => { sys = makeSys() })

  it('初始化成功', () => { expect(sys).toBeInstanceOf(CreatureIntuitionSystem) })
  it('初始intuitions为空', () => { expect((sys as any).intuitions.length).toBe(0) })
  it('初始nextId=1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始lastCheck=0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('intuitions是数组', () => { expect(Array.isArray((sys as any).intuitions)).toBe(true) })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureIntuitionSystem — getWisdom', () => {
  let sys: CreatureIntuitionSystem
  beforeEach(() => { sys = makeSys() })

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
    const creature = {} as any
    expect((sys as any).getWisdom(creature)).toBe(50)
  })

  it('getWisdom(age=50): 50+15=65', () => {
    const creature = { age: 50 } as any
    expect((sys as any).getWisdom(creature)).toBe(65)
  })

  it('getWisdom(age=167): 50+167*0.3=100.1 clamp→100', () => {
    const creature = { age: 167 } as any
    expect((sys as any).getWisdom(creature)).toBe(100)
  })

  it('getWisdom(age=1): 50+0.3=50.3', () => {
    const creature = { age: 1 } as any
    expect((sys as any).getWisdom(creature)).toBeCloseTo(50.3)
  })

  it('getWisdom(age=166): 50+49.8=99.8', () => {
    const creature = { age: 166 } as any
    expect((sys as any).getWisdom(creature)).toBeCloseTo(99.8)
  })

  it('age负数时使用负值（50+负数<50）', () => {
    const creature = { age: -10 } as any
    // 50 + (-10)*0.3 = 47
    expect((sys as any).getWisdom(creature)).toBeCloseTo(47)
  })
})

// ──────────────────────────��──────────────────────────────────────────────────
describe('CreatureIntuitionSystem — applyIntuitionEffect', () => {
  let sys: CreatureIntuitionSystem
  beforeEach(() => { sys = makeSys() })

  it('danger类型给health+bonus(accuracy*0.05)', () => {
    const needs = makeNeeds(50)
    const intuition = makeIntuition(1, 'danger', 60)  // bonus=3
    ;(sys as any).applyIntuitionEffect(needs, intuition)
    expect(needs.health).toBe(53)
  })

  it('opportunity类型给health+bonus*0.5', () => {
    const needs = makeNeeds(50)
    const intuition = makeIntuition(1, 'opportunity', 60)  // bonus=3, *0.5=1.5
    ;(sys as any).applyIntuitionEffect(needs, intuition)
    expect(needs.health).toBeCloseTo(51.5)
  })

  it('treasure类型给health+bonus*0.5', () => {
    const needs = makeNeeds(50)
    const intuition = makeIntuition(1, 'treasure', 80)  // bonus=4, *0.5=2
    ;(sys as any).applyIntuitionEffect(needs, intuition)
    expect(needs.health).toBeCloseTo(52)
  })

  it('weather类型给health+bonus*0.5', () => {
    const needs = makeNeeds(50)
    const intuition = makeIntuition(1, 'weather', 60)  // bonus=3, *0.5=1.5
    ;(sys as any).applyIntuitionEffect(needs, intuition)
    expect(needs.health).toBeCloseTo(51.5)
  })

  it('betrayal类型给health+bonus*0.5', () => {
    const needs = makeNeeds(50)
    const intuition = makeIntuition(1, 'betrayal', 60)
    ;(sys as any).applyIntuitionEffect(needs, intuition)
    expect(needs.health).toBeCloseTo(51.5)
  })

  it('death类型给health+bonus*0.5', () => {
    const needs = makeNeeds(50)
    const intuition = makeIntuition(1, 'death', 60)
    ;(sys as any).applyIntuitionEffect(needs, intuition)
    expect(needs.health).toBeCloseTo(51.5)
  })

  it('health不超过100(clamp) - danger', () => {
    const needs = makeNeeds(99)
    const intuition = makeIntuition(1, 'danger', 100)  // bonus=5, 99+5=104 → clamp到100
    ;(sys as any).applyIntuitionEffect(needs, intuition)
    expect(needs.health).toBe(100)
  })

  it('health不超过100(clamp) - opportunity', () => {
    const needs = makeNeeds(99)
    const intuition = makeIntuition(1, 'opportunity', 100)  // bonus*0.5=2.5, 99+2.5=101.5 → 100
    ;(sys as any).applyIntuitionEffect(needs, intuition)
    expect(needs.health).toBe(100)
  })

  it('health=100 时不变（danger）', () => {
    const needs = makeNeeds(100)
    const intuition = makeIntuition(1, 'danger', 60)
    ;(sys as any).applyIntuitionEffect(needs, intuition)
    expect(needs.health).toBe(100)
  })

  it('accuracy=0 时 bonus=0，health 不变', () => {
    const needs = makeNeeds(50)
    const intuition = makeIntuition(1, 'danger', 0)
    ;(sys as any).applyIntuitionEffect(needs, intuition)
    expect(needs.health).toBe(50)
  })

  it('accuracy=100 时 danger bonus=5，health 正确增加', () => {
    const needs = makeNeeds(50)
    const intuition = makeIntuition(1, 'danger', 100)
    ;(sys as any).applyIntuitionEffect(needs, intuition)
    expect(needs.health).toBe(55)
  })

  it('accuracy=20 时 danger bonus=1，health 增加 1', () => {
    const needs = makeNeeds(50)
    const intuition = makeIntuition(1, 'danger', 20)
    ;(sys as any).applyIntuitionEffect(needs, intuition)
    expect(needs.health).toBeCloseTo(51)
  })

  it('treasure accuracy=40 → bonus=2 → health+1', () => {
    const needs = makeNeeds(50)
    const intuition = makeIntuition(1, 'treasure', 40)  // bonus=2, *0.5=1
    ;(sys as any).applyIntuitionEffect(needs, intuition)
    expect(needs.health).toBeCloseTo(51)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureIntuitionSystem — pruneOld', () => {
  let sys: CreatureIntuitionSystem
  beforeEach(() => { sys = makeSys() })

  it('pruneOld: <=MAX_INTUITIONS(80)时不截断', () => {
    for (let i = 1; i <= 80; i++) (sys as any).intuitions.push(makeIntuition(i))
    ;(sys as any).pruneOld()
    expect((sys as any).intuitions.length).toBeLessThanOrEqual(80)
  })

  it('pruneOld: >80时先删triggered再截断', () => {
    for (let i = 1; i <= 90; i++) {
      const intu = makeIntuition(i)
      intu.triggered = i <= 10
      ;(sys as any).intuitions.push(intu)
    }
    ;(sys as any).pruneOld()
    expect((sys as any).intuitions.length).toBeLessThanOrEqual(80)
  })

  it('pruneOld: 恰好80个不触发截断', () => {
    for (let i = 1; i <= 80; i++) (sys as any).intuitions.push(makeIntuition(i))
    ;(sys as any).pruneOld()
    expect((sys as any).intuitions.length).toBe(80)
  })

  it('pruneOld: 79个时不删除任何', () => {
    for (let i = 1; i <= 79; i++) (sys as any).intuitions.push(makeIntuition(i))
    ;(sys as any).pruneOld()
    expect((sys as any).intuitions.length).toBe(79)
  })

  it('pruneOld: 超出80且全为triggered时全部删除', () => {
    for (let i = 1; i <= 85; i++) {
      const intu = makeIntuition(i)
      intu.triggered = true
      ;(sys as any).intuitions.push(intu)
    }
    ;(sys as any).pruneOld()
    expect((sys as any).intuitions.length).toBe(0)
  })

  it('pruneOld: 超出80但triggered不足，最终截断到80', () => {
    // 添加85个，只有2个triggered
    for (let i = 1; i <= 85; i++) {
      const intu = makeIntuition(i)
      intu.triggered = i <= 2
      ;(sys as any).intuitions.push(intu)
    }
    ;(sys as any).pruneOld()
    // 删掉2个triggered后剩83个，仍超过80，再截断到80
    expect((sys as any).intuitions.length).toBe(80)
  })

  it('pruneOld: 空列表时安全运行', () => {
    expect(() => (sys as any).pruneOld()).not.toThrow()
    expect((sys as any).intuitions.length).toBe(0)
  })

  it('pruneOld: triggered=false 的元素不被删除', () => {
    for (let i = 1; i <= 85; i++) {
      const intu = makeIntuition(i)
      intu.triggered = false
      ;(sys as any).intuitions.push(intu)
    }
    ;(sys as any).pruneOld()
    // 没有triggered可删，直接截断到80
    expect((sys as any).intuitions.length).toBe(80)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureIntuitionSystem — CHECK_INTERVAL 节流', () => {
  let sys: CreatureIntuitionSystem
  beforeEach(() => { sys = makeSys() })

  it('tick未达到CHECK_INTERVAL(700)时不���新', () => {
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

  it('恰好差值700触发', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 700)
    expect((sys as any).lastCheck).toBe(700)
  })

  it('差值699不触发，lastCheck 保持为0', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    sys.update(1, em, 699)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('多次调用累积推进 lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    sys.update(1, em, 700)
    sys.update(1, em, 1400)
    expect((sys as any).lastCheck).toBe(1400)
  })

  it('大tick值正常触发', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    sys.update(1, em, 999_999)
    expect((sys as any).lastCheck).toBe(999_999)
  })

  it('tick=0不触发', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    sys.update(1, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureIntuitionSystem — generateIntuitions 逻辑', () => {
  let sys: CreatureIntuitionSystem
  beforeEach(() => { sys = makeSys() })

  it('已满MAX_INTUITIONS(80)时不生成新直觉', () => {
    for (let i = 1; i <= 80; i++) (sys as any).intuitions.push(makeIntuition(i))
    const em = { getEntitiesWithComponents: () => [1] } as any
    ;(sys as any).generateIntuitions(em, 100)
    expect((sys as any).intuitions.length).toBe(80)
  })

  it('无实体时不生成直觉', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).generateIntuitions(em, 100)
    expect((sys as any).intuitions.length).toBe(0)
  })

  it('实体无 creature 组件时不生成直觉', () => {
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: (_eid: number, type: string) => type === 'creature' ? null : makeNeeds(50),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0) // 触发生成条件
    ;(sys as any).generateIntuitions(em, 100)
    expect((sys as any).intuitions.length).toBe(0)
  })

  it('实体无 needs 组件时不生成直觉', () => {
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: (_eid: number, type: string) => type === 'needs' ? null : { age: 50 },
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).generateIntuitions(em, 100)
    expect((sys as any).intuitions.length).toBe(0)
  })

  it('实体health<=0时不生成直觉', () => {
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: (_eid: number, type: string) =>
        type === 'creature' ? { age: 50 } : { health: 0, hunger: 0 },
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).generateIntuitions(em, 100)
    expect((sys as any).intuitions.length).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureIntuitionSystem — processIntuitions 逻辑', () => {
  let sys: CreatureIntuitionSystem
  beforeEach(() => { sys = makeSys() })

  it('已触发的直觉不再处理', () => {
    const intu = makeIntuition(1, 'danger', 100)
    intu.triggered = true
    ;(sys as any).intuitions.push(intu)
    const em = {
      getComponent: () => null,
    } as any
    // 直接调用 processIntuitions，已触发的应跳过
    ;(sys as any).processIntuitions(em)
    // triggered=true 时跳过，不会重新处理
    expect(intu.triggered).toBe(true)
  })

  it('实体不存在时将直觉标记为已触发', () => {
    const intu = makeIntuition(1, 'danger', 60)
    ;(sys as any).intuitions.push(intu)
    const em = {
      getComponent: () => null,
    } as any
    ;(sys as any).processIntuitions(em)
    expect(intu.triggered).toBe(true)
  })

  it('实体health<=0时将直觉标记为已触发', () => {
    const intu = makeIntuition(1, 'danger', 60)
    ;(sys as any).intuitions.push(intu)
    const em = {
      getComponent: (_eid: number, type: string) =>
        type === 'creature' ? { age: 50 } : { health: 0, hunger: 0 },
    } as any
    ;(sys as any).processIntuitions(em)
    expect(intu.triggered).toBe(true)
  })

  it('triggerChance=accuracy/400，accuracy=400 时必触发(random=0)', () => {
    const intu = makeIntuition(1, 'danger', 400)  // triggerChance=1.0
    ;(sys as any).intuitions.push(intu)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const needs = makeNeeds(50)
    const em = {
      getComponent: (_eid: number, type: string) =>
        type === 'creature' ? { age: 50 } : needs,
    } as any
    ;(sys as any).processIntuitions(em)
    expect(intu.triggered).toBe(true)
  })

  it('triggerChance接近0时(accuracy=1)，random=0.999时不触发', () => {
    const intu = makeIntuition(1, 'danger', 1)  // triggerChance=1/400=0.0025
    ;(sys as any).intuitions.push(intu)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    const needs = makeNeeds(50)
    const em = {
      getComponent: (_eid: number, type: string) =>
        type === 'creature' ? { age: 50 } : needs,
    } as any
    ;(sys as any).processIntuitions(em)
    expect(intu.triggered).toBe(false)
  })
})
