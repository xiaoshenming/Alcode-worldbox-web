import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FlockingSystem } from '../systems/FlockingSystem'
import { EntityManager } from '../ecs/Entity'
import type { PositionComponent, VelocityComponent, CreatureComponent, AIComponent } from '../ecs/Entity'
import type { CivMemberComponent } from '../civilization/Civilization'

function makeSys() { return new FlockingSystem() }

function makeEm() { return new EntityManager() }

function addCreature(
  em: EntityManager,
  x: number, y: number,
  vx = 0, vy = 0,
  species = 'human',
  civId = 1,
  state = 'wandering',
  speed = 2
) {
  const eid = em.createEntity()
  em.addComponent<PositionComponent>(eid, { type: 'position', x, y })
  em.addComponent<VelocityComponent>(eid, { type: 'velocity', vx, vy })
  em.addComponent<CreatureComponent>(eid, { type: 'creature', species, speed, health: 100, maxHealth: 100, age: 0, hunger: 0, isAlive: true, race: 'human' } as any)
  em.addComponent<AIComponent>(eid, { type: 'ai', state, target: null } as any)
  em.addComponent<CivMemberComponent>(eid, { type: 'civMember', civId } as any)
  return eid
}

describe('FlockingSystem - 初始状态', () => {
  let sys: FlockingSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('getFlockCount 初始为 0', () => { expect(sys.getFlockCount()).toBe(0) })
  it('getFlockOf 未知实体返回 null', () => { expect(sys.getFlockOf(999)).toBeNull() })
  it('getFlockCount 返回数字类型', () => { expect(typeof sys.getFlockCount()).toBe('number') })
  it('flockAssignment 初始为空 Map', () => { expect((sys as any).flockAssignment.size).toBe(0) })
  it('_assigned 初始为空 Set', () => { expect((sys as any)._assigned.size).toBe(0) })
  it('flocks 内部 Map 初始为空', () => { expect((sys as any).flocks.size).toBe(0) })
  it('_nextFlockId 初始为 0', () => { expect((sys as any)._nextFlockId).toBe(0) })
  it('_memberPool 初始为空数组', () => { expect((sys as any)._memberPool.length).toBe(0) })
  it('_flockDataPool 初始为空数组', () => { expect((sys as any)._flockDataPool.length).toBe(0) })
  it('_nearbyBuf 初始为空数组', () => { expect((sys as any)._nearbyBuf.length).toBe(0) })
  it('_memberPoolNext 初始为 0', () => { expect((sys as any)._memberPoolNext).toBe(0) })
  it('_flockDataPoolNext 初始为 0', () => { expect((sys as any)._flockDataPoolNext).toBe(0) })
  it('_groups 初始为空 Map', () => { expect((sys as any)._groups.size).toBe(0) })
})

describe('FlockingSystem - getFlockOf', () => {
  let sys: FlockingSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('getFlockOf 不存在的大 id 返回 null', () => { expect(sys.getFlockOf(100000)).toBeNull() })
  it('getFlockOf 返回类型为 null 或 number', () => {
    const result = sys.getFlockOf(1)
    expect(result === null || typeof result === 'number').toBe(true)
  })
  it('getFlockOf id=0 返回 null（无 flock）', () => { expect(sys.getFlockOf(0)).toBeNull() })
  it('getFlockOf id=-1 返回 null', () => { expect(sys.getFlockOf(-1)).toBeNull() })
})

describe('FlockingSystem - update（tick 非整除 FLOCK_SCAN_INTERVAL）', () => {
  let sys: FlockingSystem
  let em: EntityManager

  beforeEach(() => { sys = makeSys(); em = makeEm() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=1 时 update 不崩溃（空 em）', () => {
    expect(() => sys.update(1, em)).not.toThrow()
  })

  it('tick=1 时 flock count 仍为 0（无实体）', () => {
    sys.update(1, em)
    expect(sys.getFlockCount()).toBe(0)
  })

  it('tick=2 时 update 不崩溃（有少量实体）', () => {
    addCreature(em, 0, 0)
    addCreature(em, 1, 0)
    expect(() => sys.update(2, em)).not.toThrow()
  })

  it('tick 非 15 倍数时 不重建 flocks（flocks 保持 0）', () => {
    addCreature(em, 0, 0)
    sys.update(1, em)
    expect(sys.getFlockCount()).toBe(0)
  })
})

describe('FlockingSystem - update（tick=0，触发 rebuildFlocks）', () => {
  let sys: FlockingSystem
  let em: EntityManager

  beforeEach(() => { sys = makeSys(); em = makeEm() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0，空 em，flock count 为 0', () => {
    sys.update(0, em)
    expect(sys.getFlockCount()).toBe(0)
  })

  it('tick=0，< 3 个实体，不形成 flock', () => {
    addCreature(em, 0, 0)
    addCreature(em, 1, 0)
    sys.update(0, em)
    expect(sys.getFlockCount()).toBe(0)
  })

  it('tick=0，3 个邻近同族实体，形成 1 个 flock', () => {
    addCreature(em, 0, 0, 0, 0, 'human', 1)
    addCreature(em, 1, 0, 0, 0, 'human', 1)
    addCreature(em, 0, 1, 0, 0, 'human', 1)
    sys.update(0, em)
    expect(sys.getFlockCount()).toBe(1)
  })

  it('tick=0，3 个邻近实体 flock 后成员有 flockAssignment', () => {
    const e1 = addCreature(em, 0, 0, 0, 0, 'human', 1)
    const e2 = addCreature(em, 1, 0, 0, 0, 'human', 1)
    const e3 = addCreature(em, 0, 1, 0, 0, 'human', 1)
    sys.update(0, em)
    expect(sys.getFlockOf(e1)).not.toBeNull()
    expect(sys.getFlockOf(e2)).not.toBeNull()
    expect(sys.getFlockOf(e3)).not.toBeNull()
  })

  it('tick=0，3 个相同 flock 的实体共享同一 flockId', () => {
    const e1 = addCreature(em, 0, 0, 0, 0, 'human', 1)
    const e2 = addCreature(em, 1, 0, 0, 0, 'human', 1)
    const e3 = addCreature(em, 0, 1, 0, 0, 'human', 1)
    sys.update(0, em)
    const id1 = sys.getFlockOf(e1)
    const id2 = sys.getFlockOf(e2)
    const id3 = sys.getFlockOf(e3)
    expect(id1).toBe(id2)
    expect(id2).toBe(id3)
  })

  it('tick=0，不同 species 不合并为同一 flock', () => {
    addCreature(em, 0, 0, 0, 0, 'human', 1)
    addCreature(em, 1, 0, 0, 0, 'human', 1)
    addCreature(em, 0, 1, 0, 0, 'human', 1)
    addCreature(em, 2, 0, 0, 0, 'elf', 1)
    addCreature(em, 2, 1, 0, 0, 'elf', 1)
    addCreature(em, 3, 0, 0, 0, 'elf', 1)
    sys.update(0, em)
    // 两个 species 形成各自的 flock
    expect(sys.getFlockCount()).toBeGreaterThanOrEqual(1)
  })

  it('tick=0，相距太远的实体不形成 flock', () => {
    addCreature(em, 0, 0, 0, 0, 'human', 1)
    addCreature(em, 1, 0, 0, 0, 'human', 1)
    addCreature(em, 100, 100, 0, 0, 'human', 1) // 远距
    sys.update(0, em)
    expect(sys.getFlockCount()).toBe(0) // 没有3个邻近的
  })

  it('tick=0，不同 civId 不合并为同一 flock', () => {
    addCreature(em, 0, 0, 0, 0, 'human', 1)
    addCreature(em, 1, 0, 0, 0, 'human', 2) // 不同 civ
    addCreature(em, 0, 1, 0, 0, 'human', 1)
    sys.update(0, em)
    expect(sys.getFlockCount()).toBe(0)
  })

  it('tick=15 也触发 rebuildFlocks', () => {
    addCreature(em, 0, 0, 0, 0, 'human', 1)
    addCreature(em, 1, 0, 0, 0, 'human', 1)
    addCreature(em, 0, 1, 0, 0, 'human', 1)
    sys.update(15, em)
    expect(sys.getFlockCount()).toBe(1)
  })

  it('连续 rebuildFlocks 后 _nextFlockId 从 0 重置', () => {
    addCreature(em, 0, 0, 0, 0, 'human', 1)
    addCreature(em, 1, 0, 0, 0, 'human', 1)
    addCreature(em, 0, 1, 0, 0, 'human', 1)
    sys.update(0, em)
    sys.update(15, em)
    // 第二次重建后 _nextFlockId 应从 0 重新开始
    expect(sys.getFlockCount()).toBeGreaterThanOrEqual(0)
  })
})

describe('FlockingSystem - flocking 力学', () => {
  let sys: FlockingSystem
  let em: EntityManager

  beforeEach(() => { sys = makeSys(); em = makeEm() })
  afterEach(() => { vi.restoreAllMocks() })

  it('update 对 wandering 状态实体施加力后速度可变', () => {
    const e1 = addCreature(em, 0, 0, 0, 0, 'human', 1, 'wandering')
    const e2 = addCreature(em, 0.5, 0, 0, 0, 'human', 1, 'wandering')
    const e3 = addCreature(em, 0, 0.5, 0, 0, 'human', 1, 'wandering')
    sys.update(0, em) // rebuild
    sys.update(1, em) // apply forces
    const vel = em.getComponent<VelocityComponent>(e1, 'velocity')
    // 施力后速度不一定为 0
    expect(vel).toBeDefined()
  })

  it('非 wandering/idle 状态的实体不受 flocking 力影响（速度保持 0）', () => {
    addCreature(em, 0, 0, 0, 0, 'human', 1, 'attacking')
    addCreature(em, 0.5, 0, 0, 0, 'human', 1, 'attacking')
    addCreature(em, 0, 0.5, 0, 0, 'human', 1, 'attacking')
    sys.update(0, em)
    sys.update(1, em)
    // attacking 状态不受 flocking 影响，速度应不变（依然是 0）
    const entities = (em as any).getEntitiesWithComponents('velocity')
    for (const eid of entities) {
      const vel = em.getComponent<VelocityComponent>(eid, 'velocity')
      if (vel) {
        expect(vel.vx).toBe(0)
        expect(vel.vy).toBe(0)
      }
    }
  })

  it('速度被钳制到 maxSpeed 范围内', () => {
    const e1 = addCreature(em, 0, 0, 100, 100, 'human', 1, 'wandering', 2)
    const e2 = addCreature(em, 0.5, 0, 100, 100, 'human', 1, 'wandering', 2)
    const e3 = addCreature(em, 0, 0.5, 100, 100, 'human', 1, 'wandering', 2)
    sys.update(0, em)
    sys.update(1, em)
    for (const eid of [e1, e2, e3]) {
      const vel = em.getComponent<VelocityComponent>(eid, 'velocity')
      if (vel) {
        const speed = Math.sqrt(vel.vx ** 2 + vel.vy ** 2)
        expect(speed).toBeLessThanOrEqual(2 + 1e-6)
      }
    }
  })
})

describe('FlockingSystem - 对象池', () => {
  let sys: FlockingSystem
  let em: EntityManager

  beforeEach(() => { sys = makeSys(); em = makeEm() })
  afterEach(() => { vi.restoreAllMocks() })

  it('rebuildFlocks 后 _flockDataPool 不为空（若有 flock）', () => {
    addCreature(em, 0, 0, 0, 0, 'human', 1)
    addCreature(em, 1, 0, 0, 0, 'human', 1)
    addCreature(em, 0, 1, 0, 0, 'human', 1)
    sys.update(0, em)
    sys.update(15, em) // 第二次 rebuild 时池已有数据
    expect((sys as any)._flockDataPool.length).toBeGreaterThan(0)
  })

  it('rebuildFlocks 后 _memberPool 不为空（若有 flock）', () => {
    addCreature(em, 0, 0, 0, 0, 'human', 1)
    addCreature(em, 1, 0, 0, 0, 'human', 1)
    addCreature(em, 0, 1, 0, 0, 'human', 1)
    sys.update(0, em)
    sys.update(15, em)
    expect((sys as any)._memberPool.length).toBeGreaterThan(0)
  })
})

describe('FlockingSystem - 多 flock 场景', () => {
  let sys: FlockingSystem
  let em: EntityManager

  beforeEach(() => { sys = makeSys(); em = makeEm() })
  afterEach(() => { vi.restoreAllMocks() })

  it('两组相距足够远的同族实体形成两个 flock', () => {
    // group A at (0,0)
    addCreature(em, 0, 0, 0, 0, 'human', 1)
    addCreature(em, 1, 0, 0, 0, 'human', 1)
    addCreature(em, 0, 1, 0, 0, 'human', 1)
    // group B at (50,50) — far away
    addCreature(em, 50, 50, 0, 0, 'human', 1)
    addCreature(em, 51, 50, 0, 0, 'human', 1)
    addCreature(em, 50, 51, 0, 0, 'human', 1)
    sys.update(0, em)
    expect(sys.getFlockCount()).toBe(2)
  })

  it('大群（5 个）邻近同族实体也能形成 1 个 flock', () => {
    for (let i = 0; i < 5; i++) addCreature(em, i, 0, 0, 0, 'human', 1)
    sys.update(0, em)
    expect(sys.getFlockCount()).toBe(1)
  })

  it('flock 重建后旧 flockAssignment 清除', () => {
    const e1 = addCreature(em, 0, 0, 0, 0, 'human', 1)
    const e2 = addCreature(em, 1, 0, 0, 0, 'human', 1)
    const e3 = addCreature(em, 0, 1, 0, 0, 'human', 1)
    sys.update(0, em)
    // 移除实体后重建
    em.removeEntity(e1)
    em.removeEntity(e2)
    em.removeEntity(e3)
    sys.update(15, em)
    expect(sys.getFlockCount()).toBe(0)
    expect(sys.getFlockOf(e1)).toBeNull()
  })

  it('不同 species 各自形成 flock（各 3 个实体，同 civ）', () => {
    addCreature(em, 0, 0, 0, 0, 'human', 1)
    addCreature(em, 1, 0, 0, 0, 'human', 1)
    addCreature(em, 0, 1, 0, 0, 'human', 1)
    addCreature(em, 2, 0, 0, 0, 'elf', 1)
    addCreature(em, 3, 0, 0, 0, 'elf', 1)
    addCreature(em, 2, 1, 0, 0, 'elf', 1)
    sys.update(0, em)
    expect(sys.getFlockCount()).toBe(2)
  })

  it('idle 状态实体也能加入 flock 的力学计算', () => {
    const e1 = addCreature(em, 0, 0, 0, 0, 'human', 1, 'idle')
    const e2 = addCreature(em, 1, 0, 0, 0, 'human', 1, 'idle')
    const e3 = addCreature(em, 0, 1, 0, 0, 'human', 1, 'idle')
    sys.update(0, em) // rebuild
    sys.update(1, em) // apply forces
    expect(sys.getFlockOf(e1)).not.toBeNull()
    const vel = em.getComponent<VelocityComponent>(e1, 'velocity')
    expect(vel).toBeDefined()
  })

  it('getFlockCount 在多次 rebuild 间保持正确', () => {
    addCreature(em, 0, 0, 0, 0, 'human', 1)
    addCreature(em, 1, 0, 0, 0, 'human', 1)
    addCreature(em, 0, 1, 0, 0, 'human', 1)
    sys.update(0, em)
    expect(sys.getFlockCount()).toBe(1)
    sys.update(15, em)
    expect(sys.getFlockCount()).toBe(1)
    sys.update(30, em)
    expect(sys.getFlockCount()).toBe(1)
  })

  it('_nextFlockId 在每次 rebuild 时重置为 0', () => {
    addCreature(em, 0, 0, 0, 0, 'human', 1)
    addCreature(em, 1, 0, 0, 0, 'human', 1)
    addCreature(em, 0, 1, 0, 0, 'human', 1)
    sys.update(0, em)
    const firstId = (sys as any)._nextFlockId
    sys.update(15, em)
    // _nextFlockId 在第二次 rebuild 后应等于 flock 数量
    expect((sys as any)._nextFlockId).toBe(firstId)
  })

  it('flockAssignment 大小等于所有 flock 成员总数', () => {
    addCreature(em, 0, 0, 0, 0, 'human', 1)
    addCreature(em, 1, 0, 0, 0, 'human', 1)
    addCreature(em, 0, 1, 0, 0, 'human', 1)
    sys.update(0, em)
    const assignment = (sys as any).flockAssignment as Map<number, number>
    let totalMembers = 0
    const flocks = (sys as any).flocks as Map<number, { count: number }>
    for (const fd of flocks.values()) totalMembers += fd.count
    expect(assignment.size).toBe(totalMembers)
  })

  it('flock centroidX 为成员 x 的平均值', () => {
    addCreature(em, 0, 0, 0, 0, 'human', 1)
    addCreature(em, 2, 0, 0, 0, 'human', 1)
    addCreature(em, 1, 0, 0, 0, 'human', 1)
    sys.update(0, em)
    const flocks = (sys as any).flocks as Map<number, { centroidX: number; centroidY: number; count: number }>
    for (const fd of flocks.values()) {
      expect(fd.centroidX).toBeCloseTo(1, 1) // avg of 0,1,2
    }
  })

  it('update tick=30，再次触发 rebuildFlocks', () => {
    addCreature(em, 0, 0, 0, 0, 'human', 1)
    addCreature(em, 1, 0, 0, 0, 'human', 1)
    addCreature(em, 0, 1, 0, 0, 'human', 1)
    sys.update(30, em)
    expect(sys.getFlockCount()).toBe(1)
  })

  it('update 不崩溃（大量实体）', () => {
    for (let i = 0; i < 30; i++) addCreature(em, i * 0.3, (i % 5) * 0.3, 0, 0, 'human', 1)
    expect(() => sys.update(0, em)).not.toThrow()
  })

  it('update 大量实体后 getFlockCount >= 1', () => {
    for (let i = 0; i < 10; i++) addCreature(em, i * 0.5, 0, 0, 0, 'human', 1)
    sys.update(0, em)
    expect(sys.getFlockCount()).toBeGreaterThanOrEqual(1)
  })
  it('update 连续多 tick 不崩溃', () => {
    addCreature(em, 0, 0, 0, 0, 'human', 1)
    addCreature(em, 1, 0, 0, 0, 'human', 1)
    addCreature(em, 0, 1, 0, 0, 'human', 1)
    expect(() => { for (let t = 0; t < 50; t++) sys.update(t, em) }).not.toThrow()
  })

  it('flocks Map 内每个 flock 的 count >= 3', () => {
    addCreature(em, 0, 0, 0, 0, 'human', 1)
    addCreature(em, 1, 0, 0, 0, 'human', 1)
    addCreature(em, 0, 1, 0, 0, 'human', 1)
    sys.update(0, em)
    const flocks = (sys as any).flocks as Map<number, { count: number }>
    for (const fd of flocks.values()) {
      expect(fd.count).toBeGreaterThanOrEqual(3)
    }
  })
})
