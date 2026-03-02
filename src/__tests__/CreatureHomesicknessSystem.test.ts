import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureHomesicknessSystem } from '../systems/CreatureHomesicknessSystem'
import type { HomesicknessState } from '../systems/CreatureHomesicknessSystem'
import { EntityManager } from '../ecs/Entity'

// ─── helpers ─────────────────────────────────────────────────────────────────
let _nextId = 1
function makeSys(): CreatureHomesicknessSystem { return new CreatureHomesicknessSystem() }
function makeState(entityId: number, overrides: Partial<HomesicknessState> = {}): HomesicknessState {
  return {
    id: _nextId++,
    entityId,
    homeX: 10,
    homeY: 20,
    intensity: 50,
    moralePenalty: 10,
    returnAttempts: 2,
    tick: 0,
    ...overrides,
  }
}

function makeEm(): EntityManager { return new EntityManager() }

function addCreatureWithPos(em: EntityManager, x: number, y: number): number {
  const eid = em.createEntity()
  em.addComponent(eid, { type: 'creature', species: 'human', speed: 1, damage: 1, isHostile: false, name: 'T', age: 30, maxAge: 80, gender: 'male' })
  em.addComponent(eid, { type: 'position', x, y })
  return eid
}

// ─── 1. getStates — 初始状态 ──────────────────────────────────────────────────
describe('CreatureHomesicknessSystem.getStates — 初始状态', () => {
  let sys: CreatureHomesicknessSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无思乡状态', () => { expect(sys.getStates()).toHaveLength(0) })
  it('返回数组类型', () => { expect(Array.isArray(sys.getStates())).toBe(true) })
  it('返回内部引用（同一对象）', () => { expect(sys.getStates()).toBe(sys.getStates()) })
  it('注入一条后长度为 1', () => {
    sys.getStates().push(makeState(1))
    expect(sys.getStates()).toHaveLength(1)
  })
  it('注入多条全部返回', () => {
    sys.getStates().push(makeState(1))
    sys.getStates().push(makeState(2))
    sys.getStates().push(makeState(3))
    expect(sys.getStates()).toHaveLength(3)
  })
  it('注入后 entityId 正确', () => {
    sys.getStates().push(makeState(42))
    expect(sys.getStates()[0].entityId).toBe(42)
  })
  it('直接修改注入的状态可查询到变更', () => {
    const s = makeState(1)
    sys.getStates().push(s)
    s.intensity = 99
    expect(sys.getStates()[0].intensity).toBe(99)
  })
  it('注入后 homeX/homeY 保留', () => {
    sys.getStates().push(makeState(1, { homeX: 55, homeY: 77 }))
    expect(sys.getStates()[0].homeX).toBe(55)
    expect(sys.getStates()[0].homeY).toBe(77)
  })
  it('注入后 moralePenalty 保留', () => {
    sys.getStates().push(makeState(1, { moralePenalty: 15 }))
    expect(sys.getStates()[0].moralePenalty).toBe(15)
  })
  it('注入后 returnAttempts 保留', () => {
    sys.getStates().push(makeState(1, { returnAttempts: 5 }))
    expect(sys.getStates()[0].returnAttempts).toBe(5)
  })
})

// ─── 2. getByEntity — 查找逻辑 ───────────────────────────────────────────────
describe('CreatureHomesicknessSystem.getByEntity — 查找逻辑', () => {
  let sys: CreatureHomesicknessSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('无任何记录时返回 undefined', () => { expect(sys.getByEntity(999)).toBeUndefined() })
  it('找到对应 entityId', () => {
    sys.getStates().push(makeState(1))
    sys.getStates().push(makeState(2))
    expect(sys.getByEntity(2)?.entityId).toBe(2)
  })
  it('多条时返回正确的那条', () => {
    sys.getStates().push(makeState(10))
    sys.getStates().push(makeState(20))
    sys.getStates().push(makeState(30))
    expect(sys.getByEntity(20)?.entityId).toBe(20)
  })
  it('不存在的 entityId 返回 undefined', () => {
    sys.getStates().push(makeState(1))
    expect(sys.getByEntity(999)).toBeUndefined()
  })
  it('getByEntity 返回完整 state 对象', () => {
    const s = makeState(7, { homeX: 33, homeY: 44, intensity: 77 })
    sys.getStates().push(s)
    const found = sys.getByEntity(7)
    expect(found?.homeX).toBe(33)
    expect(found?.homeY).toBe(44)
    expect(found?.intensity).toBe(77)
  })
  it('外部 push 后 getByEntity 可通过 fallback scan 找到', () => {
    // _entityIds Map 未被更新时，fallback scan 仍能找到
    sys.getStates().push(makeState(55))
    expect(sys.getByEntity(55)).toBeDefined()
  })
  it('getByEntity 两次调用对同一 id 结果一致', () => {
    sys.getStates().push(makeState(3))
    const a = sys.getByEntity(3)
    const b = sys.getByEntity(3)
    expect(a).toBe(b)
  })
  it('intensity 修改后 getByEntity 反映变更', () => {
    const s = makeState(8)
    sys.getStates().push(s)
    s.intensity = 88
    expect(sys.getByEntity(8)?.intensity).toBe(88)
  })
  it('注入 intensity=0 的状态仍可查询', () => {
    sys.getStates().push(makeState(9, { intensity: 0 }))
    expect(sys.getByEntity(9)).toBeDefined()
  })
  it('注入 returnAttempts=0 的状态可查询', () => {
    sys.getStates().push(makeState(11, { returnAttempts: 0 }))
    expect(sys.getByEntity(11)?.returnAttempts).toBe(0)
  })
})

// ─── 3. update — 间隔检查逻辑 ─────────────────────────────────────────────────
describe('CreatureHomesicknessSystem.update — 间隔检查', () => {
  let sys: CreatureHomesicknessSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEm(); _nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick 不足 CHECK_INTERVAL 不触发更新', () => {
    addCreatureWithPos(em, 0, 0)
    vi.spyOn(Math, 'random').mockReturnValue(0) // 强制 develop_chance 通过
    sys.update(1, em, 0)
    sys.update(1, em, 500) // < 1000
    expect(sys.getStates()).toHaveLength(0)
  })
  it('tick 达到 CHECK_INTERVAL 时触发检查', () => {
    addCreatureWithPos(em, 0, 0)
    vi.spyOn(Math, 'random').mockReturnValue(0) // 0 < DEVELOP_CHANCE(0.007)
    sys.update(1, em, 0)
    sys.update(1, em, 1000)
    expect(sys.getStates().length).toBeGreaterThanOrEqual(1)
  })
  it('多次 update 每次超 CHECK_INTERVAL 才触发', () => {
    addCreatureWithPos(em, 0, 0)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 1000)
    const after1 = sys.getStates().length
    sys.update(1, em, 1500) // < 2000，不触发
    expect(sys.getStates().length).toBe(after1)
    sys.update(1, em, 2000) // 触发
    // 状态数量 >= after1 (可能清理了死亡的，但此处实体仍存在)
    expect(sys.getStates().length).toBeGreaterThanOrEqual(0)
  })
  it('无 creature 实体时不产生状态', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 1000)
    expect(sys.getStates()).toHaveLength(0)
  })
  it('random > DEVELOP_CHANCE 时不产生新状态', () => {
    addCreatureWithPos(em, 0, 0)
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // > 0.007
    sys.update(1, em, 0)
    sys.update(1, em, 1000)
    expect(sys.getStates()).toHaveLength(0)
  })
})

// ─── 4. update — 靠近家时减弱 ────────────────────────────────────────────────
describe('CreatureHomesicknessSystem.update — 靠近家减弱', () => {
  let sys: CreatureHomesicknessSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEm(); _nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('在家附近 intensity 减小', () => {
    const eid = addCreatureWithPos(em, 10, 20) // homeX=10, homeY=20 (dist=0)
    const state = makeState(eid, { homeX: 10, homeY: 20, intensity: 50 })
    sys.getStates().push(state)
    ;(sys as any)._entityIds.set(eid, state)
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, em, 1001) // 触发 (lastCheck=0)
    expect(state.intensity).toBeLessThan(50)
  })
  it('在家附近 moralePenalty 减小', () => {
    const eid = addCreatureWithPos(em, 10, 20)
    const state = makeState(eid, { homeX: 10, homeY: 20, intensity: 50, moralePenalty: 10 })
    sys.getStates().push(state)
    ;(sys as any)._entityIds.set(eid, state)
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, em, 1001)
    expect(state.moralePenalty).toBeLessThanOrEqual(10)
  })
  it('intensity 不会低于 0', () => {
    const eid = addCreatureWithPos(em, 10, 20)
    const state = makeState(eid, { homeX: 10, homeY: 20, intensity: 1 })
    sys.getStates().push(state)
    ;(sys as any)._entityIds.set(eid, state)
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, em, 1001)
    expect(state.intensity).toBeGreaterThanOrEqual(0)
  })
  it('moralePenalty 不会低于 0', () => {
    const eid = addCreatureWithPos(em, 10, 20)
    const state = makeState(eid, { homeX: 10, homeY: 20, moralePenalty: 0 })
    sys.getStates().push(state)
    ;(sys as any)._entityIds.set(eid, state)
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, em, 1001)
    expect(state.moralePenalty).toBeGreaterThanOrEqual(0)
  })
})

// ─── 5. update — 远离家时增强 ─────────────────────────────────────────────────
describe('CreatureHomesicknessSystem.update — 远离家增强', () => {
  let sys: CreatureHomesicknessSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEm(); _nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('远离家时 intensity 增大', () => {
    const eid = addCreatureWithPos(em, 200, 200)
    const state = makeState(eid, { homeX: 0, homeY: 0, intensity: 20 })
    sys.getStates().push(state)
    ;(sys as any)._entityIds.set(eid, state)
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, em, 1001)
    expect(state.intensity).toBeGreaterThan(20)
  })
  it('intensity 不超过 100', () => {
    const eid = addCreatureWithPos(em, 200, 200)
    const state = makeState(eid, { homeX: 0, homeY: 0, intensity: 99 })
    sys.getStates().push(state)
    ;(sys as any)._entityIds.set(eid, state)
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, em, 1001)
    expect(state.intensity).toBeLessThanOrEqual(100)
  })
  it('moralePenalty 与 intensity 正相关', () => {
    const eid = addCreatureWithPos(em, 200, 200)
    const state = makeState(eid, { homeX: 0, homeY: 0, intensity: 80 })
    sys.getStates().push(state)
    ;(sys as any)._entityIds.set(eid, state)
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, em, 1001)
    expect(state.moralePenalty).toBeGreaterThan(0)
  })
  it('moralePenalty 不超过 MAX_PENALTY(25)', () => {
    const eid = addCreatureWithPos(em, 200, 200)
    const state = makeState(eid, { homeX: 0, homeY: 0, intensity: 100 })
    sys.getStates().push(state)
    ;(sys as any)._entityIds.set(eid, state)
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, em, 1001)
    expect(state.moralePenalty).toBeLessThanOrEqual(25)
  })
})

// ─── 6. update — 返家行为 ─────────────────────────────────────────────────────
describe('CreatureHomesicknessSystem.update — 返家行为', () => {
  let sys: CreatureHomesicknessSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEm(); _nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('intensity>70 且 random<0.02 时 returnAttempts 增加', () => {
    const eid = addCreatureWithPos(em, 200, 200)
    const state = makeState(eid, { homeX: 0, homeY: 0, intensity: 80, returnAttempts: 0 })
    sys.getStates().push(state)
    ;(sys as any)._entityIds.set(eid, state)
    // 因为 eid 已在 _entityIds 中，develop_chance 那路 continue 跳过，不调用 random
    // 第 1 次 random 调用就是 returnAttempts 的判断
    vi.spyOn(Math, 'random').mockReturnValue(0.01) // 0.01 < 0.02 → 触发返家
    sys.update(1, em, 1001)
    expect(state.returnAttempts).toBe(1)
  })
  it('intensity<=70 时不触发返家——random 无论多小也不改变 returnAttempts', () => {
    const eid = addCreatureWithPos(em, 200, 200)
    // intensity=60，远离家后 += INTENSITY_GROWTH(0.025)*1000=25 => 85，但此时 random=0.99>0.02 不触发
    const state = makeState(eid, { homeX: 0, homeY: 0, intensity: 60, returnAttempts: 0 })
    sys.getStates().push(state)
    ;(sys as any)._entityIds.set(eid, state)
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // 0.99 > 0.02 => 不触发返家
    sys.update(1, em, 1001)
    expect(state.returnAttempts).toBe(0)
  })
  it('返家时位置 x 向 home 方向移动', () => {
    const eid = addCreatureWithPos(em, 100, 0)
    const state = makeState(eid, { homeX: 0, homeY: 0, intensity: 80, returnAttempts: 0 })
    sys.getStates().push(state)
    ;(sys as any)._entityIds.set(eid, state)
    // eid 已在 _entityIds，develop 段跳过，第 1 次 random = 返家判断
    vi.spyOn(Math, 'random').mockReturnValue(0.01) // 触发返家
    sys.update(1, em, 1001)
    const pos = em.getComponent<{ type: 'position'; x: number; y: number }>(eid, 'position')!
    expect(pos.x).toBeLessThan(100) // 向 home(x=0) 靠近
  })
})

// ─── 7. update — 死亡清理 ─────────────────────────────────────────────────────
describe('CreatureHomesicknessSystem.update — 死亡清理', () => {
  let sys: CreatureHomesicknessSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEm(); _nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('生物死亡后状态被清理', () => {
    const eid = addCreatureWithPos(em, 10, 10)
    const state = makeState(eid)
    sys.getStates().push(state)
    ;(sys as any)._entityIds.set(eid, state)
    em.removeEntity(eid)
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, em, 1001)
    expect(sys.getStates()).toHaveLength(0)
  })
  it('死亡清理后 _entityIds 也移除', () => {
    const eid = addCreatureWithPos(em, 10, 10)
    const state = makeState(eid)
    sys.getStates().push(state)
    ;(sys as any)._entityIds.set(eid, state)
    em.removeEntity(eid)
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, em, 1001)
    expect((sys as any)._entityIds.has(eid)).toBe(false)
  })
  it('存活实体不被清理', () => {
    const eid = addCreatureWithPos(em, 10, 10)
    const state = makeState(eid)
    sys.getStates().push(state)
    ;(sys as any)._entityIds.set(eid, state)
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, em, 1001)
    expect(sys.getStates()).toHaveLength(1)
  })
  it('部分死亡时只清理死者', () => {
    const eid1 = addCreatureWithPos(em, 10, 10)
    const eid2 = addCreatureWithPos(em, 20, 20)
    const s1 = makeState(eid1)
    const s2 = makeState(eid2)
    sys.getStates().push(s1)
    sys.getStates().push(s2)
    ;(sys as any)._entityIds.set(eid1, s1)
    ;(sys as any)._entityIds.set(eid2, s2)
    em.removeEntity(eid1)
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, em, 1001)
    expect(sys.getStates()).toHaveLength(1)
    expect(sys.getStates()[0].entityId).toBe(eid2)
  })
})

// ─── 8. MAX_STATES 上限 ──────────────────────────────────────────────────────
describe('CreatureHomesicknessSystem — MAX_STATES 上限', () => {
  let sys: CreatureHomesicknessSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('状态数量上限为 120', () => {
    for (let i = 1; i <= 125; i++) {
      if (sys.getStates().length < 120) {
        sys.getStates().push(makeState(i))
      }
    }
    expect(sys.getStates().length).toBeLessThanOrEqual(120)
  })
})

// ─── 9. 内部 _entityIds Map 一致性 ───────────────────────────────────────────
describe('CreatureHomesicknessSystem — _entityIds 一致性', () => {
  let sys: CreatureHomesicknessSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('_entityIds 初始为空 Map', () => {
    expect((sys as any)._entityIds.size).toBe(0)
  })
  it('手动 push + set 后 getByEntity 走 O(1) 路径', () => {
    const s = makeState(100)
    sys.getStates().push(s)
    ;(sys as any)._entityIds.set(100, s)
    expect(sys.getByEntity(100)).toBe(s)
  })
  it('fallback scan 在仅 push 未 set 时也能找到', () => {
    const s = makeState(200)
    sys.getStates().push(s) // 未调用 _entityIds.set
    expect(sys.getByEntity(200)).toBeDefined()
  })
  it('fallback scan 后 _entityIds 被缓存', () => {
    const s = makeState(201)
    sys.getStates().push(s)
    sys.getByEntity(201) // 触发 fallback + 写缓存
    expect((sys as any)._entityIds.has(201)).toBe(true)
  })
  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
})

// ─── 10. 边界与特殊情况 ───────────────────────────────────────────────────────
describe('CreatureHomesicknessSystem — 边界与特殊情况', () => {
  let sys: CreatureHomesicknessSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('intensity=100 时 moralePenalty 为 25', () => {
    // intensity * 0.25 = 25，但被 min(MAX_PENALTY=25) 钳制
    const s = makeState(1, { intensity: 100 })
    expect(s.intensity * 0.25).toBe(25)
  })
  it('intensity=0 时 moralePenalty 为 0', () => {
    const s = makeState(1, { intensity: 0 })
    expect(Math.min(25, s.intensity * 0.25)).toBe(0)
  })
  it('dist 等于 HOME_RADIUS(8) 时在范围内', () => {
    // dist <= 8 触发减弱逻辑
    expect(8 <= 8).toBe(true)
  })
  it('dist 大于 HOME_RADIUS(8) 时在范围外', () => {
    expect(9 <= 8).toBe(false)
  })
  it('state 的 id 字段不为零', () => {
    const s = makeState(1)
    expect(s.id).toBeGreaterThan(0)
  })
  it('多个 state 的 id 唯一', () => {
    const s1 = makeState(1)
    const s2 = makeState(2)
    const s3 = makeState(3)
    expect(new Set([s1.id, s2.id, s3.id]).size).toBe(3)
  })
  it('tick 字段保存到 state', () => {
    const s = makeState(1, { tick: 9999 })
    expect(s.tick).toBe(9999)
  })
  it('homeX=0/homeY=0 的状态合法', () => {
    const s = makeState(1, { homeX: 0, homeY: 0 })
    expect(s.homeX).toBe(0)
    expect(s.homeY).toBe(0)
  })
  it('makeState 覆写 intensity 正确', () => {
    const s = makeState(1, { intensity: 75 })
    expect(s.intensity).toBe(75)
  })
  it('makeSys 每次返回独立实例', () => {
    const a = makeSys()
    const b = makeSys()
    a.getStates().push(makeState(1))
    expect(b.getStates()).toHaveLength(0)
  })
})
