import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureSleepwalkSystem } from '../systems/CreatureSleepwalkSystem'
import type { Sleepwalker } from '../systems/CreatureSleepwalkSystem'
import { EntityManager } from '../ecs/Entity'

// ─── helpers ─────────────────────────────────────────────────────────────────
let nextId = 1
function makeSys(): CreatureSleepwalkSystem { return new CreatureSleepwalkSystem() }
function makeSleepwalker(entityId: number, startTick = 0, duration = 300, distance = 5, direction = 1.57): Sleepwalker {
  return { id: nextId++, entityId, startTick, distance, direction, duration }
}
function makeEm(): EntityManager { return new EntityManager() }
function addCreatureWithPos(em: EntityManager, x = 10, y = 10): number {
  const eid = em.createEntity()
  em.addComponent(eid, { type: 'creature', species: 'human', speed: 1, damage: 1, isHostile: false })
  em.addComponent(eid, { type: 'position', x, y })
  return eid
}

// ─── 1. 初始状态 ─────────────────────────────────────────────────────────────
describe('CreatureSleepwalkSystem – 初始状态', () => {
  afterEach(() => vi.restoreAllMocks())

  it('sleepwalkers 初始为空数组', () => {
    const sys = makeSys()
    expect((sys as any).sleepwalkers).toHaveLength(0)
  })
  it('_sleepSet 初始为空 Set', () => {
    const sys = makeSys()
    expect((sys as any)._sleepSet.size).toBe(0)
  })
  it('_sleepMap 初始为空 Map', () => {
    const sys = makeSys()
    expect((sys as any)._sleepMap.size).toBe(0)
  })
  it('nextId 初始为 1', () => {
    const sys = makeSys()
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck 初始为 0', () => {
    const sys = makeSys()
    expect((sys as any).lastCheck).toBe(0)
  })
  it('两个实例互相独立', () => {
    const a = makeSys()
    const b = makeSys()
    ;(a as any).sleepwalkers.push(makeSleepwalker(1))
    expect((b as any).sleepwalkers).toHaveLength(0)
  })
})

// ─── 2. 注入 / 查询 sleepwalkers ─────────────────────────────────────────────
describe('CreatureSleepwalkSystem – sleepwalkers 注入与查询', () => {
  let sys: CreatureSleepwalkSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入 1 条后 length === 1', () => {
    ;(sys as any).sleepwalkers.push(makeSleepwalker(1))
    expect((sys as any).sleepwalkers).toHaveLength(1)
  })
  it('entityId 字段正确保存', () => {
    ;(sys as any).sleepwalkers.push(makeSleepwalker(42))
    expect((sys as any).sleepwalkers[0].entityId).toBe(42)
  })
  it('startTick 字段正确保存', () => {
    ;(sys as any).sleepwalkers.push(makeSleepwalker(1, 9999))
    expect((sys as any).sleepwalkers[0].startTick).toBe(9999)
  })
  it('duration 字段正确保存', () => {
    ;(sys as any).sleepwalkers.push(makeSleepwalker(1, 0, 600))
    expect((sys as any).sleepwalkers[0].duration).toBe(600)
  })
  it('distance 字段正确保存', () => {
    ;(sys as any).sleepwalkers.push(makeSleepwalker(1, 0, 300, 12))
    expect((sys as any).sleepwalkers[0].distance).toBe(12)
  })
  it('direction 字段正确保存', () => {
    ;(sys as any).sleepwalkers.push(makeSleepwalker(1, 0, 300, 5, 3.14))
    expect((sys as any).sleepwalkers[0].direction).toBeCloseTo(3.14)
  })
  it('多条注入顺序保持', () => {
    ;(sys as any).sleepwalkers.push(makeSleepwalker(1))
    ;(sys as any).sleepwalkers.push(makeSleepwalker(2))
    expect((sys as any).sleepwalkers[0].entityId).toBe(1)
    expect((sys as any).sleepwalkers[1].entityId).toBe(2)
  })
  it('id 字段唯一', () => {
    nextId = 1
    ;(sys as any).sleepwalkers.push(makeSleepwalker(1))
    ;(sys as any).sleepwalkers.push(makeSleepwalker(2))
    const ids = (sys as any).sleepwalkers.map((s: Sleepwalker) => s.id)
    expect(new Set(ids).size).toBe(2)
  })
})

// ─── 3. getSleepwalker ────────────────────────────────────────────────────────
describe('CreatureSleepwalkSystem – getSleepwalker', () => {
  let sys: CreatureSleepwalkSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('无梦游者时返回 undefined', () => {
    expect(sys.getSleepwalker(999)).toBeUndefined()
  })
  it('按 entityId 通过 _sleepMap 查询', () => {
    const sw = makeSleepwalker(1)
    ;(sys as any).sleepwalkers.push(sw)
    ;(sys as any)._sleepMap.set(1, sw)
    expect(sys.getSleepwalker(1)?.entityId).toBe(1)
  })
  it('fallback 到数组扫描', () => {
    const sw = makeSleepwalker(7)
    ;(sys as any).sleepwalkers.push(sw)
    // 不设置 _sleepMap，走 fallback
    expect(sys.getSleepwalker(7)?.entityId).toBe(7)
  })
  it('fallback 后将结果缓存进 _sleepMap', () => {
    const sw = makeSleepwalker(7)
    ;(sys as any).sleepwalkers.push(sw)
    sys.getSleepwalker(7)
    expect((sys as any)._sleepMap.has(7)).toBe(true)
  })
  it('fallback 后将 entityId 加入 _sleepSet', () => {
    const sw = makeSleepwalker(7)
    ;(sys as any).sleepwalkers.push(sw)
    sys.getSleepwalker(7)
    expect((sys as any)._sleepSet.has(7)).toBe(true)
  })
  it('查询不存在时不修改 _sleepMap', () => {
    const before = (sys as any)._sleepMap.size
    sys.getSleepwalker(999)
    expect((sys as any)._sleepMap.size).toBe(before)
  })
  it('返回的对象包含全部字段', () => {
    const sw = makeSleepwalker(3, 100, 400, 8, 2.0)
    ;(sys as any).sleepwalkers.push(sw)
    ;(sys as any)._sleepMap.set(3, sw)
    const result = sys.getSleepwalker(3)!
    expect(result.startTick).toBe(100)
    expect(result.duration).toBe(400)
    expect(result.distance).toBe(8)
    expect(result.direction).toBeCloseTo(2.0)
  })
})

// ─── 4. expireSleepwalkers ───────────────────────────────────────────────────
describe('CreatureSleepwalkSystem – expireSleepwalkers', () => {
  let sys: CreatureSleepwalkSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  function expire(s: CreatureSleepwalkSystem, tick: number) {
    (s as any).expireSleepwalkers(tick)
  }

  it('未到期的梦游者被保留', () => {
    const sw = makeSleepwalker(1, 0, 300)
    ;(sys as any).sleepwalkers.push(sw)
    ;(sys as any)._sleepSet.add(1)
    ;(sys as any)._sleepMap.set(1, sw)
    expire(sys, 100) // 100 - 0 = 100 < 300
    expect((sys as any).sleepwalkers).toHaveLength(1)
  })
  it('到期的梦游者被移除', () => {
    const sw = makeSleepwalker(1, 0, 300)
    ;(sys as any).sleepwalkers.push(sw)
    ;(sys as any)._sleepSet.add(1)
    ;(sys as any)._sleepMap.set(1, sw)
    expire(sys, 300) // 300 - 0 = 300, !(300 < 300) → 过期
    expect((sys as any).sleepwalkers).toHaveLength(0)
  })
  it('到期时 _sleepSet 清理', () => {
    const sw = makeSleepwalker(1, 0, 300)
    ;(sys as any).sleepwalkers.push(sw)
    ;(sys as any)._sleepSet.add(1)
    ;(sys as any)._sleepMap.set(1, sw)
    expire(sys, 300)
    expect((sys as any)._sleepSet.has(1)).toBe(false)
  })
  it('到期时 _sleepMap 清理', () => {
    const sw = makeSleepwalker(1, 0, 300)
    ;(sys as any).sleepwalkers.push(sw)
    ;(sys as any)._sleepSet.add(1)
    ;(sys as any)._sleepMap.set(1, sw)
    expire(sys, 300)
    expect((sys as any)._sleepMap.has(1)).toBe(false)
  })
  it('混合到期和未到期只移除到期的', () => {
    const sw1 = makeSleepwalker(1, 0, 300)
    const sw2 = makeSleepwalker(2, 0, 1000)
    ;(sys as any).sleepwalkers.push(sw1, sw2)
    ;(sys as any)._sleepSet.add(1); ;(sys as any)._sleepSet.add(2)
    ;(sys as any)._sleepMap.set(1, sw1); ;(sys as any)._sleepMap.set(2, sw2)
    expire(sys, 300) // sw1 到期，sw2 未到期
    expect((sys as any).sleepwalkers).toHaveLength(1)
    expect((sys as any).sleepwalkers[0].entityId).toBe(2)
  })
  it('空数组 expire 不报错', () => {
    expect(() => expire(sys, 9999)).not.toThrow()
  })
  it('刚好到期时 duration 等于 elapsed', () => {
    const sw = makeSleepwalker(1, 500, 300)
    ;(sys as any).sleepwalkers.push(sw)
    ;(sys as any)._sleepSet.add(1)
    ;(sys as any)._sleepMap.set(1, sw)
    expire(sys, 800) // 800-500=300, !(300<300) → 过期
    expect((sys as any).sleepwalkers).toHaveLength(0)
  })
})

// ─── 5. moveSleepwalkers ─────────────────────────────────────────────────────
describe('CreatureSleepwalkSystem – moveSleepwalkers', () => {
  let sys: CreatureSleepwalkSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); nextId = 1; em = makeEm() })
  afterEach(() => vi.restoreAllMocks())

  function move(s: CreatureSleepwalkSystem, emInst: EntityManager) {
    (s as any).moveSleepwalkers(emInst)
  }

  it('无 position 组件的梦游者被跳过', () => {
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', species: 'human', speed: 1, damage: 1, isHostile: false })
    const sw = makeSleepwalker(eid, 0, 300, 0, 0)
    ;(sys as any).sleepwalkers.push(sw)
    expect(() => move(sys, em)).not.toThrow()
  })
  it('有 position 组件时位置发生变化', () => {
    const eid = addCreatureWithPos(em, 10, 10)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const sw = makeSleepwalker(eid, 0, 300, 0, 0)
    ;(sys as any).sleepwalkers.push(sw)
    move(sys, em)
    const pos = em.getComponent<{ type: string; x: number; y: number }>(eid, 'position')!
    // direction=0, x += cos(0)*0.3 = 0.3
    expect(pos.x).toBeCloseTo(10.3, 1)
  })
  it('y 坐标随 direction sin 变化', () => {
    const eid = addCreatureWithPos(em, 10, 10)
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // drift=0
    const sw = makeSleepwalker(eid, 0, 300, 0, Math.PI / 2) // direction=π/2
    ;(sys as any).sleepwalkers.push(sw)
    move(sys, em)
    const pos = em.getComponent<{ type: string; x: number; y: number }>(eid, 'position')!
    // y += sin(π/2)*0.3 = 0.3
    expect(pos.y).toBeCloseTo(10.3, 1)
  })
  it('distance 每帧递增 WANDER_SPEED(0.3)', () => {
    const eid = addCreatureWithPos(em, 10, 10)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const sw = makeSleepwalker(eid, 0, 300, 0, 0)
    ;(sys as any).sleepwalkers.push(sw)
    move(sys, em)
    expect(sw.distance).toBeCloseTo(0.3, 5)
  })
  it('direction 每帧有小幅漂移', () => {
    const eid = addCreatureWithPos(em, 10, 10)
    const original = 1.0
    const sw = makeSleepwalker(eid, 0, 300, 0, original)
    ;(sys as any).sleepwalkers.push(sw)
    vi.spyOn(Math, 'random').mockReturnValue(0) // drift = (0-0.5)*0.3 = -0.15
    move(sys, em)
    expect(sw.direction).toBeCloseTo(original - 0.15, 5)
  })
  it('多个梦游者各自独立移动', () => {
    const e1 = addCreatureWithPos(em, 0, 0)
    const e2 = addCreatureWithPos(em, 100, 100)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const sw1 = makeSleepwalker(e1, 0, 300, 0, 0)
    const sw2 = makeSleepwalker(e2, 0, 300, 0, Math.PI)
    ;(sys as any).sleepwalkers.push(sw1, sw2)
    move(sys, em)
    const p1 = em.getComponent<{ type: string; x: number; y: number }>(e1, 'position')!
    const p2 = em.getComponent<{ type: string; x: number; y: number }>(e2, 'position')!
    expect(p1.x).toBeCloseTo(0.3, 1)  // cos(0)*0.3
    expect(p2.x).toBeCloseTo(99.7, 1) // 100 + cos(π)*0.3
  })
})

// ─── 6. startSleepwalking – update 触发 ─────────────────────────────────────
describe('CreatureSleepwalkSystem – startSleepwalking (via update)', () => {
  let sys: CreatureSleepwalkSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); nextId = 1; em = makeEm() })
  afterEach(() => vi.restoreAllMocks())

  it('tick 间隔不足 CHECK_INTERVAL(600) 时不启动检查', () => {
    const spy = vi.spyOn(sys as any, 'startSleepwalking')
    sys.update(1, em, 0)
    sys.update(1, em, 300)
    expect(spy).not.toHaveBeenCalled()
  })
  it('间隔满足时执行 startSleepwalking', () => {
    const spy = vi.spyOn(sys as any, 'startSleepwalking')
    sys.update(1, em, 0)
    sys.update(1, em, 600)
    expect(spy).toHaveBeenCalledOnce()
  })
  it('无 creature+position 实体时不产生梦游', () => {
    sys.update(1, em, 0)
    sys.update(1, em, 600)
    expect((sys as any).sleepwalkers).toHaveLength(0)
  })
  it('random > SLEEPWALK_CHANCE(0.008) 时不产生梦游', () => {
    addCreatureWithPos(em)
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, em, 0)
    sys.update(1, em, 600)
    expect((sys as any).sleepwalkers).toHaveLength(0)
  })
  it('random <= SLEEPWALK_CHANCE 时产生梦游', () => {
    addCreatureWithPos(em)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 600)
    expect((sys as any).sleepwalkers.length).toBeGreaterThan(0)
  })
  it('已在 _sleepSet 中的实体不重复加入', () => {
    const eid = addCreatureWithPos(em)
    ;(sys as any)._sleepSet.add(eid)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 600)
    expect((sys as any).sleepwalkers).toHaveLength(0)
  })
  it('达到 MAX_SLEEPWALKERS(30) 时停止添加', () => {
    // 使用足够长的 duration（999999），避免 expireSleepwalkers 在 tick=600 时删除
    for (let i = 0; i < 30; i++) {
      const sw = makeSleepwalker(i, 0, 999999)
      ;(sys as any).sleepwalkers.push(sw)
      ;(sys as any)._sleepSet.add(i)
      ;(sys as any)._sleepMap.set(i, sw)
    }
    const before = (sys as any).sleepwalkers.length
    addCreatureWithPos(em, 5, 5)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 600)
    // 不应超过 MAX_SLEEPWALKERS
    expect((sys as any).sleepwalkers.length).toBeLessThanOrEqual(30)
    expect((sys as any).sleepwalkers.length).toBe(before)
  })
  it('新梦游者 duration 在 300-799 范围内', () => {
    addCreatureWithPos(em)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 600)
    const sleepwalkers = (sys as any).sleepwalkers as Sleepwalker[]
    sleepwalkers.forEach(sw => {
      expect(sw.duration).toBeGreaterThanOrEqual(300)
      expect(sw.duration).toBeLessThan(800)
    })
  })
  it('新梦游者加入 _sleepSet', () => {
    const eid = addCreatureWithPos(em)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 600)
    if ((sys as any).sleepwalkers.length > 0) {
      expect((sys as any)._sleepSet.has(eid)).toBe(true)
    }
  })
  it('新梦游者加入 _sleepMap', () => {
    const eid = addCreatureWithPos(em)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 600)
    if ((sys as any).sleepwalkers.length > 0) {
      expect((sys as any)._sleepMap.has(eid)).toBe(true)
    }
  })
  it('lastCheck 正确更新', () => {
    sys.update(1, em, 0)
    sys.update(1, em, 600)
    expect((sys as any).lastCheck).toBe(600)
  })
  it('update 每次都调用 moveSleepwalkers', () => {
    const spy = vi.spyOn(sys as any, 'moveSleepwalkers')
    sys.update(1, em, 0)
    sys.update(1, em, 100) // 间隔不足，但 move 仍然被调用
    expect(spy).toHaveBeenCalledTimes(2)
  })
  it('新梦游者 id 自增', () => {
    addCreatureWithPos(em, 5, 5)
    addCreatureWithPos(em, 6, 6)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 600)
    const sleepwalkers = (sys as any).sleepwalkers as Sleepwalker[]
    if (sleepwalkers.length >= 2) {
      expect(sleepwalkers[0].id).not.toBe(sleepwalkers[1].id)
    }
  })
})

// ─── 7. _sleepSet / _sleepMap 同步 ───────────────────────────────────────────
describe('CreatureSleepwalkSystem – _sleepSet/_sleepMap 同步', () => {
  let sys: CreatureSleepwalkSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('expireSleepwalkers 后 _sleepSet 和 _sleepMap 都清理', () => {
    const sw = makeSleepwalker(1, 0, 300)
    ;(sys as any).sleepwalkers.push(sw)
    ;(sys as any)._sleepSet.add(1)
    ;(sys as any)._sleepMap.set(1, sw)
    ;(sys as any).expireSleepwalkers(300)
    expect((sys as any)._sleepSet.has(1)).toBe(false)
    expect((sys as any)._sleepMap.has(1)).toBe(false)
  })
  it('保留的梦游者 _sleepSet 中仍存在', () => {
    const sw = makeSleepwalker(1, 0, 1000)
    ;(sys as any).sleepwalkers.push(sw)
    ;(sys as any)._sleepSet.add(1)
    ;(sys as any)._sleepMap.set(1, sw)
    ;(sys as any).expireSleepwalkers(100) // 未到期
    expect((sys as any)._sleepSet.has(1)).toBe(true)
  })
})
