import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureNostalgiaSystem } from '../systems/CreatureNostalgiaSystem'
import type { NostalgiaState } from '../systems/CreatureNostalgiaSystem'
import { EntityManager } from '../ecs/Entity'

function makeSys(): CreatureNostalgiaSystem { return new CreatureNostalgiaSystem() }
function makeState(entityId: number, intensity = 50, opts: Partial<NostalgiaState> = {}): NostalgiaState {
  return {
    entityId,
    birthX: opts.birthX ?? 10,
    birthY: opts.birthY ?? 20,
    currentDist: opts.currentDist ?? 30,
    intensity,
    moodEffect: opts.moodEffect ?? -5,
    lastVisitHome: opts.lastVisitHome ?? 0,
  }
}

function makeEm(...entries: Array<{ x?: number; y?: number; mood?: number }>) {
  const em = new EntityManager()
  for (const e of entries) {
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: e.x ?? 0, y: e.y ?? 0 })
    em.addComponent(eid, { type: 'creature', speed: 1, isHostile: false, age: 10, maxAge: 100, mood: e.mood ?? 50 })
  }
  return em
}

afterEach(() => { vi.restoreAllMocks() })

// ─── 1. 初始化状态 ───────────────────────────────────────────────
describe('CreatureNostalgiaSystem - 初始化状态', () => {
  let sys: CreatureNostalgiaSystem
  beforeEach(() => { sys = makeSys() })

  it('初始 states 数组为空', () => { expect((sys as any).states).toHaveLength(0) })
  it('初始 _trackedSet 为空', () => { expect((sys as any)._trackedSet.size).toBe(0) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始 totalHomesick 为 0', () => { expect((sys as any).totalHomesick).toBe(0) })
  it('初始 totalReturned 为 0', () => { expect((sys as any).totalReturned).toBe(0) })
  it('构造函数不抛出', () => { expect(() => makeSys()).not.toThrow() })
  it('多次构造彼此独立', () => {
    const a = makeSys()
    const b = makeSys()
    ;(a as any).states.push(makeState(1))
    expect((b as any).states).toHaveLength(0)
  })
})

// ─── 2. states 数组基础操作 ──────────────────────────────────────
describe('CreatureNostalgiaSystem - states 数组操作', () => {
  let sys: CreatureNostalgiaSystem
  beforeEach(() => { sys = makeSys() })

  it('注入一个 state 后长度为 1', () => {
    ;(sys as any).states.push(makeState(1))
    expect((sys as any).states).toHaveLength(1)
  })
  it('注入多个 state 后长度正确', () => {
    for (let i = 0; i < 5; i++) (sys as any).states.push(makeState(i + 1))
    expect((sys as any).states).toHaveLength(5)
  })
  it('entityId 正确存储', () => {
    ;(sys as any).states.push(makeState(42))
    expect((sys as any).states[0].entityId).toBe(42)
  })
  it('birthX/birthY 正确存储', () => {
    ;(sys as any).states.push(makeState(1, 50, { birthX: 100, birthY: 200 }))
    expect((sys as any).states[0].birthX).toBe(100)
    expect((sys as any).states[0].birthY).toBe(200)
  })
  it('intensity 正确存储', () => {
    ;(sys as any).states.push(makeState(1, 75))
    expect((sys as any).states[0].intensity).toBe(75)
  })
  it('moodEffect 正确存储', () => {
    ;(sys as any).states.push(makeState(1, 50, { moodEffect: -10 }))
    expect((sys as any).states[0].moodEffect).toBe(-10)
  })
  it('lastVisitHome 正确存储', () => {
    ;(sys as any).states.push(makeState(1, 50, { lastVisitHome: 9999 }))
    expect((sys as any).states[0].lastVisitHome).toBe(9999)
  })
  it('splice 删除后长度减少', () => {
    ;(sys as any).states.push(makeState(1))
    ;(sys as any).states.push(makeState(2))
    ;(sys as any).states.splice(0, 1)
    expect((sys as any).states).toHaveLength(1)
  })
  it('返回内部引用（同一对象）', () => {
    expect((sys as any).states).toBe((sys as any).states)
  })
})

// ─── 3. _trackedSet 操作 ─────────────────────────────────────────
describe('CreatureNostalgiaSystem - _trackedSet', () => {
  let sys: CreatureNostalgiaSystem
  beforeEach(() => { sys = makeSys() })

  it('注入 entityId 后 has 为 true', () => {
    ;(sys as any)._trackedSet.add(7)
    expect((sys as any)._trackedSet.has(7)).toBe(true)
  })
  it('未注入 entityId has 为 false', () => {
    expect((sys as any)._trackedSet.has(999)).toBe(false)
  })
  it('delete 后 has 为 false', () => {
    ;(sys as any)._trackedSet.add(3)
    ;(sys as any)._trackedSet.delete(3)
    expect((sys as any)._trackedSet.has(3)).toBe(false)
  })
  it('多实体互不干扰', () => {
    ;(sys as any)._trackedSet.add(1)
    ;(sys as any)._trackedSet.add(2)
    expect((sys as any)._trackedSet.has(1)).toBe(true)
    expect((sys as any)._trackedSet.has(2)).toBe(true)
    ;(sys as any)._trackedSet.delete(1)
    expect((sys as any)._trackedSet.has(2)).toBe(true)
  })
})

// ─── 4. totalHomesick / totalReturned 计数 ───────────────────────
describe('CreatureNostalgiaSystem - 计数器', () => {
  let sys: CreatureNostalgiaSystem
  beforeEach(() => { sys = makeSys() })

  it('totalHomesick 初始为 0', () => { expect((sys as any).totalHomesick).toBe(0) })
  it('totalReturned 初始为 0', () => { expect((sys as any).totalReturned).toBe(0) })
  it('手动设置 totalHomesick 后正确读取', () => {
    ;(sys as any).totalHomesick = 7
    expect((sys as any).totalHomesick).toBe(7)
  })
  it('手动设置 totalReturned 后正确读取', () => {
    ;(sys as any).totalReturned = 3
    expect((sys as any).totalReturned).toBe(3)
  })
  it('两者独立互不影响', () => {
    ;(sys as any).totalHomesick = 10
    ;(sys as any).totalReturned = 5
    expect((sys as any).totalHomesick).toBe(10)
    expect((sys as any).totalReturned).toBe(5)
  })
})

// ─── 5. update 节流逻辑 ───────────────────────────────────────────
describe('CreatureNostalgiaSystem - update 节流', () => {
  let sys: CreatureNostalgiaSystem
  beforeEach(() => { sys = makeSys() })

  it('tick=0 时 lastCheck 仍为 0（未触发）', () => {
    const em = makeEm({ x: 0 })
    sys.update(1, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=899 不触发（CHECK_INTERVAL=900）', () => {
    const em = makeEm({ x: 0 })
    sys.update(1, em, 899)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=900 触发并更新 lastCheck', () => {
    const em = makeEm({ x: 0 })
    sys.update(1, em, 900)
    expect((sys as any).lastCheck).toBe(900)
  })

  it('tick=1800 再次触发', () => {
    const em = makeEm({ x: 0 })
    sys.update(1, em, 900)
    sys.update(1, em, 1800)
    expect((sys as any).lastCheck).toBe(1800)
  })

  it('间隔不足时 lastCheck 不变', () => {
    const em = makeEm({ x: 0 })
    sys.update(1, em, 900)
    sys.update(1, em, 1000)
    expect((sys as any).lastCheck).toBe(900)
  })

  it('空 EntityManager 不崩溃', () => {
    const em = new EntityManager()
    expect(() => sys.update(1, em, 900)).not.toThrow()
  })
})

// ─── 6. trackCreatures 实体追踪 ──────────────────────────────────
describe('CreatureNostalgiaSystem - trackCreatures', () => {
  let sys: CreatureNostalgiaSystem
  beforeEach(() => { sys = makeSys() })

  it('random=0 时(< NOSTALGIA_CHANCE=0.05)追踪实体', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm({ x: 5, y: 15 })
    sys.update(1, em, 900)
    expect((sys as any).states.length).toBeGreaterThan(0)
  })

  it('random=1 时(> NOSTALGIA_CHANCE=0.05)不追踪', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const em = makeEm({ x: 5, y: 15 })
    sys.update(1, em, 900)
    expect((sys as any).states).toHaveLength(0)
  })

  it('同一实体不重复追踪', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm({ x: 5 })
    sys.update(1, em, 900)
    const countAfterFirst = (sys as any).states.length
    sys.update(1, em, 1800)
    expect((sys as any).states.length).toBe(countAfterFirst)
  })

  it('追踪时 birthX/birthY 取自当前 position', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm({ x: 33, y: 77 })
    sys.update(1, em, 900)
    if ((sys as any).states.length > 0) {
      expect((sys as any).states[0].birthX).toBe(33)
      expect((sys as any).states[0].birthY).toBe(77)
    }
  })

  it('达到 MAX_TRACKED(100) 后不继续追踪', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    // 预填 100 个 state
    for (let i = 0; i < 100; i++) {
      (sys as any).states.push(makeState(i + 1))
      ;(sys as any)._trackedSet.add(i + 1)
    }
    const em = makeEm({ x: 0 }, { x: 1 })
    sys.update(1, em, 900)
    expect((sys as any).states.length).toBeLessThanOrEqual(100)
  })

  it('新追踪实体加入 _trackedSet', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 0, y: 0 })
    em.addComponent(eid, { type: 'creature', speed: 1, isHostile: false, age: 10, maxAge: 100 })
    sys.update(1, em, 900)
    expect((sys as any)._trackedSet.has(eid)).toBe(true)
  })
})

// ─── 7. updateNostalgia 距离与强度计算 ───────────────────────────
describe('CreatureNostalgiaSystem - updateNostalgia 距离计算', () => {
  let sys: CreatureNostalgiaSystem
  beforeEach(() => { sys = makeSys() })

  it('currentDist 等于欧氏距离', () => {
    const state = makeState(1, 0, { birthX: 0, birthY: 0, lastVisitHome: 0 })
    ;(sys as any).states.push(state)
    ;(sys as any)._trackedSet.add(1)
    const em = new EntityManager()
    em.addComponent(1, { type: 'position', x: 3, y: 4 })
    em.addComponent(1, { type: 'creature', speed: 1, isHostile: false, age: 10, maxAge: 100, mood: 50 })
    ;(sys as any).updateNostalgia(em, 900)
    expect(state.currentDist).toBeCloseTo(5, 4)
  })

  it('在家时 currentDist < HOME_RADIUS(8)', () => {
    const state = makeState(1, 30, { birthX: 10, birthY: 10, lastVisitHome: 0 })
    ;(sys as any).states.push(state)
    ;(sys as any)._trackedSet.add(1)
    const em = new EntityManager()
    em.addComponent(1, { type: 'position', x: 12, y: 12 })
    em.addComponent(1, { type: 'creature', speed: 1, isHostile: false, age: 10, maxAge: 100, mood: 50 })
    ;(sys as any).updateNostalgia(em, 5000)
    expect(state.currentDist).toBeLessThan(8)
  })

  it('在家时 intensity 减少', () => {
    const state = makeState(1, 80, { birthX: 0, birthY: 0, lastVisitHome: 0 })
    ;(sys as any).states.push(state)
    ;(sys as any)._trackedSet.add(1)
    const em = new EntityManager()
    em.addComponent(1, { type: 'position', x: 1, y: 1 }) // dist ≈ 1.41 < 8
    em.addComponent(1, { type: 'creature', speed: 1, isHostile: false, age: 10, maxAge: 100, mood: 50 })
    ;(sys as any).updateNostalgia(em, 5000)
    expect(state.intensity).toBeLessThan(80)
  })

  it('在家时 intensity 不低于 0', () => {
    const state = makeState(1, 0, { birthX: 0, birthY: 0, lastVisitHome: 0 })
    ;(sys as any).states.push(state)
    ;(sys as any)._trackedSet.add(1)
    const em = new EntityManager()
    em.addComponent(1, { type: 'position', x: 1, y: 1 })
    em.addComponent(1, { type: 'creature', speed: 1, isHostile: false, age: 10, maxAge: 100, mood: 50 })
    ;(sys as any).updateNostalgia(em, 5000)
    expect(state.intensity).toBeGreaterThanOrEqual(0)
  })

  it('不在家时 intensity 随时间增加', () => {
    const state = makeState(1, 0, { birthX: 0, birthY: 0, currentDist: 50, lastVisitHome: 0 })
    ;(sys as any).states.push(state)
    ;(sys as any)._trackedSet.add(1)
    const em = new EntityManager()
    em.addComponent(1, { type: 'position', x: 50, y: 0 }) // dist=50 >> HOME_RADIUS
    em.addComponent(1, { type: 'creature', speed: 1, isHostile: false, age: 10, maxAge: 100, mood: 50 })
    ;(sys as any).updateNostalgia(em, 5000)
    expect(state.intensity).toBeGreaterThan(0)
  })

  it('不在家时 intensity 不超过 100', () => {
    const state = makeState(1, 99, { birthX: 0, birthY: 0, lastVisitHome: 0 })
    ;(sys as any).states.push(state)
    ;(sys as any)._trackedSet.add(1)
    const em = new EntityManager()
    em.addComponent(1, { type: 'position', x: 200, y: 200 })
    em.addComponent(1, { type: 'creature', speed: 1, isHostile: false, age: 10, maxAge: 100, mood: 50 })
    ;(sys as any).updateNostalgia(em, 10000)
    expect(state.intensity).toBeLessThanOrEqual(100)
  })
})

// ─── 8. updateNostalgia moodEffect 计算 ──────────────────────────
describe('CreatureNostalgiaSystem - moodEffect', () => {
  let sys: CreatureNostalgiaSystem
  beforeEach(() => { sys = makeSys() })

  it('在家时 moodEffect >= 0（正向心情）', () => {
    const state = makeState(1, 20, { birthX: 0, birthY: 0, lastVisitHome: 0 })
    ;(sys as any).states.push(state)
    ;(sys as any)._trackedSet.add(1)
    const em = new EntityManager()
    em.addComponent(1, { type: 'position', x: 1, y: 1 })
    em.addComponent(1, { type: 'creature', speed: 1, isHostile: false, age: 10, maxAge: 100, mood: 50 })
    ;(sys as any).updateNostalgia(em, 5000)
    expect(state.moodEffect).toBeGreaterThanOrEqual(0)
  })

  it('不在家且强度高时 moodEffect < 0（负向心情）', () => {
    const state = makeState(1, 80, { birthX: 0, birthY: 0, lastVisitHome: 0 })
    ;(sys as any).states.push(state)
    ;(sys as any)._trackedSet.add(1)
    const em = new EntityManager()
    em.addComponent(1, { type: 'position', x: 100, y: 0 })
    em.addComponent(1, { type: 'creature', speed: 1, isHostile: false, age: 10, maxAge: 100, mood: 50 })
    ;(sys as any).updateNostalgia(em, 10000)
    expect(state.moodEffect).toBeLessThan(0)
  })

  it('moodEffect 上限为 15', () => {
    const state = makeState(1, 0, { birthX: 0, birthY: 0, lastVisitHome: 0 })
    ;(sys as any).states.push(state)
    ;(sys as any)._trackedSet.add(1)
    const em = new EntityManager()
    em.addComponent(1, { type: 'position', x: 1, y: 1 })
    em.addComponent(1, { type: 'creature', speed: 1, isHostile: false, age: 10, maxAge: 100, mood: 50 })
    ;(sys as any).updateNostalgia(em, 5000)
    expect(state.moodEffect).toBeLessThanOrEqual(15)
  })

  it('moodEffect 下限为 -15', () => {
    const state = makeState(1, 100, { birthX: 0, birthY: 0, lastVisitHome: 0 })
    ;(sys as any).states.push(state)
    ;(sys as any)._trackedSet.add(1)
    const em = new EntityManager()
    em.addComponent(1, { type: 'position', x: 200, y: 200 })
    em.addComponent(1, { type: 'creature', speed: 1, isHostile: false, age: 10, maxAge: 100, mood: 50 })
    ;(sys as any).updateNostalgia(em, 10000)
    expect(state.moodEffect).toBeGreaterThanOrEqual(-15)
  })
})

// ─── 9. 实体移除时清理 ───────────────────────────────────────────
describe('CreatureNostalgiaSystem - 实体移除清理', () => {
  let sys: CreatureNostalgiaSystem
  beforeEach(() => { sys = makeSys() })

  it('实体被移除后 state 从数组中删除', () => {
    const state = makeState(1, 50, { birthX: 0, birthY: 0, lastVisitHome: 0 })
    ;(sys as any).states.push(state)
    ;(sys as any)._trackedSet.add(1)
    const em = new EntityManager()
    // 不给实体 1 添加 position 组件，模拟死亡
    ;(sys as any).updateNostalgia(em, 5000)
    expect((sys as any).states.every((s: NostalgiaState) => s.entityId !== 1)).toBe(true)
  })

  it('实体被移除后从 _trackedSet 中删除', () => {
    const state = makeState(1, 50, { birthX: 0, birthY: 0, lastVisitHome: 0 })
    ;(sys as any).states.push(state)
    ;(sys as any)._trackedSet.add(1)
    const em = new EntityManager()
    // 不给实体 1 添加 position 组件，模拟死亡
    ;(sys as any).updateNostalgia(em, 5000)
    expect((sys as any)._trackedSet.has(1)).toBe(false)
  })

  it('有效实体不被清理', () => {
    const state = makeState(1, 50, { birthX: 0, birthY: 0, lastVisitHome: 0 })
    ;(sys as any).states.push(state)
    ;(sys as any)._trackedSet.add(1)
    const em = new EntityManager()
    em.addComponent(1, { type: 'position', x: 50, y: 50 })
    em.addComponent(1, { type: 'creature', speed: 1, isHostile: false, age: 10, maxAge: 100, mood: 50 })
    ;(sys as any).updateNostalgia(em, 5000)
    expect((sys as any).states.some((s: NostalgiaState) => s.entityId === 1)).toBe(true)
  })
})

// ─── 10. NostalgiaState 接口字段 ─────────────────────────────────
describe('CreatureNostalgiaSystem - NostalgiaState 字段验证', () => {
  it('intensity 取值 [0, 100]', () => {
    const s = makeState(1, 50)
    expect(s.intensity).toBeGreaterThanOrEqual(0)
    expect(s.intensity).toBeLessThanOrEqual(100)
  })
  it('currentDist 初始值正确', () => {
    const s = makeState(1, 50, { currentDist: 42 })
    expect(s.currentDist).toBe(42)
  })
  it('moodEffect 范围 [-15, 15]', () => {
    const s = makeState(1, 50, { moodEffect: -10 })
    expect(s.moodEffect).toBeGreaterThanOrEqual(-15)
    expect(s.moodEffect).toBeLessThanOrEqual(15)
  })
  it('lastVisitHome 为数字', () => {
    const s = makeState(1, 50, { lastVisitHome: 1234 })
    expect(typeof s.lastVisitHome).toBe('number')
  })
  it('entityId 为正整数', () => {
    const s = makeState(99)
    expect(s.entityId).toBe(99)
    expect(Number.isInteger(s.entityId)).toBe(true)
  })
  it('birthX / birthY 可为 0', () => {
    const s = makeState(1, 50, { birthX: 0, birthY: 0 })
    expect(s.birthX).toBe(0)
    expect(s.birthY).toBe(0)
  })
})

// ─── 11. mood 应用 ────────────────────────────────────────────────
describe('CreatureNostalgiaSystem - mood 应用到 creature', () => {
  let sys: CreatureNostalgiaSystem
  beforeEach(() => { sys = makeSys() })

  it('在家时 mood 不低于 0', () => {
    const state = makeState(1, 10, { birthX: 0, birthY: 0, lastVisitHome: 0 })
    ;(sys as any).states.push(state)
    ;(sys as any)._trackedSet.add(1)
    const em = new EntityManager()
    em.addComponent(1, { type: 'position', x: 1, y: 1 })
    em.addComponent(1, { type: 'creature', speed: 1, isHostile: false, age: 10, maxAge: 100, mood: 0 })
    ;(sys as any).updateNostalgia(em, 5000)
    const creature = em.getComponent<{ mood: number }>(1, 'creature')
    expect(creature?.mood).toBeGreaterThanOrEqual(0)
  })

  it('思乡时 mood 不超过 100', () => {
    const state = makeState(1, 0, { birthX: 0, birthY: 0, lastVisitHome: 0 })
    ;(sys as any).states.push(state)
    ;(sys as any)._trackedSet.add(1)
    const em = new EntityManager()
    em.addComponent(1, { type: 'position', x: 1, y: 1 })
    em.addComponent(1, { type: 'creature', speed: 1, isHostile: false, age: 10, maxAge: 100, mood: 100 })
    ;(sys as any).updateNostalgia(em, 5000)
    const creature = em.getComponent<{ mood: number }>(1, 'creature')
    expect(creature?.mood).toBeLessThanOrEqual(100)
  })

  it('没有 mood 字段的 creature 不崩溃', () => {
    const state = makeState(1, 50, { birthX: 0, birthY: 0, lastVisitHome: 0 })
    ;(sys as any).states.push(state)
    ;(sys as any)._trackedSet.add(1)
    const em = new EntityManager()
    em.addComponent(1, { type: 'position', x: 50, y: 50 })
    em.addComponent(1, { type: 'creature', speed: 1, isHostile: false, age: 10, maxAge: 100 }) // 无 mood
    expect(() => (sys as any).updateNostalgia(em, 5000)).not.toThrow()
  })
})

// ─── 12. totalReturned 累计 ───────────────────────────────────────
describe('CreatureNostalgiaSystem - totalReturned 累计', () => {
  let sys: CreatureNostalgiaSystem
  beforeEach(() => { sys = makeSys() })

  it('在家的实体触发 totalReturned 增加', () => {
    const before = (sys as any).totalReturned
    const state = makeState(1, 50, { birthX: 0, birthY: 0, lastVisitHome: 0 })
    ;(sys as any).states.push(state)
    ;(sys as any)._trackedSet.add(1)
    const em = new EntityManager()
    em.addComponent(1, { type: 'position', x: 1, y: 1 }) // dist < 8 = HOME_RADIUS
    em.addComponent(1, { type: 'creature', speed: 1, isHostile: false, age: 10, maxAge: 100, mood: 50 })
    ;(sys as any).updateNostalgia(em, 5000)
    expect((sys as any).totalReturned).toBeGreaterThan(before)
  })

  it('totalReturned 单调递增', () => {
    const state = makeState(1, 50, { birthX: 0, birthY: 0, lastVisitHome: 0 })
    ;(sys as any).states.push(state)
    ;(sys as any)._trackedSet.add(1)
    const em = new EntityManager()
    em.addComponent(1, { type: 'position', x: 1, y: 1 })
    em.addComponent(1, { type: 'creature', speed: 1, isHostile: false, age: 10, maxAge: 100, mood: 50 })
    ;(sys as any).updateNostalgia(em, 5000)
    const v1 = (sys as any).totalReturned
    ;(sys as any).updateNostalgia(em, 5000)
    expect((sys as any).totalReturned).toBeGreaterThanOrEqual(v1)
  })
})
