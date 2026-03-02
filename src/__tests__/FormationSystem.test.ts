import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FormationSystem } from '../systems/FormationSystem'
import type { Formation, FormationType } from '../systems/FormationSystem'
import { EntityManager } from '../ecs/Entity'
import type { PositionComponent } from '../ecs/Entity'

// ─── 辅助工厂 ─────────────────────────────────────────────────────────────────

let nextId = 1

function makeSys(): FormationSystem {
  return new FormationSystem()
}

function makeFormation(
  civId: number,
  type: FormationType = 'line',
  members: number[] = [1, 2, 3],
  morale = 100
): Formation {
  return {
    id: nextId++,
    civId,
    type,
    centerX: 10,
    centerY: 10,
    members,
    morale,
    facing: 0,
  }
}

function makeWorld() {
  return { tick: 0 } as any
}

/** 创建实体并挂 position 组件 */
function makeEntityWithPos(em: EntityManager, x: number, y: number): number {
  const id = em.createEntity()
  em.addComponent<PositionComponent>(id, { type: 'position', x, y })
  return id
}

/** 创建带 needs 组件的实体 */
function makeEntityWithPosAndNeeds(em: EntityManager, x: number, y: number, health = 100): number {
  const id = makeEntityWithPos(em, x, y)
  em.addComponent(id, { type: 'needs', hunger: 0, health })
  return id
}

// ─── 测试：初始状态 ───────────────────────────────────────────────────────────

describe('FormationSystem — 初始状态', () => {
  let sys: FormationSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('可以被实例化', () => {
    expect(sys).toBeDefined()
  })

  it('初始 formations 为空 Map', () => {
    expect((sys as any).formations.size).toBe(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('_lastZoom 初始为 -1', () => {
    expect((sys as any)._lastZoom).toBe(-1)
  })

  it('_iconFont 初始为空字符串', () => {
    expect((sys as any)._iconFont).toBe('')
  })

  it('_formationsBuf 初始为空数组', () => {
    expect((sys as any)._formationsBuf).toEqual([])
  })

  it('_bonusBuf 初始 attack 为 1', () => {
    expect((sys as any)._bonusBuf.attack).toBe(1)
  })

  it('_bonusBuf 初始 defense 为 1', () => {
    expect((sys as any)._bonusBuf.defense).toBe(1)
  })

  it('_bonusBuf 初始 speed 为 1', () => {
    expect((sys as any)._bonusBuf.speed).toBe(1)
  })

  it('_renderPosXBuf 初始为空数组', () => {
    expect((sys as any)._renderPosXBuf).toEqual([])
  })

  it('_renderPosYBuf 初始为空数组', () => {
    expect((sys as any)._renderPosYBuf).toEqual([])
  })
})

// ─── 测试：getFormations ──────────────────────────────────────────────────────

describe('FormationSystem — getFormations()', () => {
  let sys: FormationSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无阵型', () => {
    expect(sys.getFormations()).toHaveLength(0)
  })

  it('注入 1 个阵型后返回 1 个', () => {
    const f = makeFormation(1)
    ;(sys as any).formations.set(f.id, f)
    expect(sys.getFormations()).toHaveLength(1)
  })

  it('注入 3 个阵型后返回 3 个', () => {
    for (let i = 0; i < 3; i++) {
      const f = makeFormation(i + 1)
      ;(sys as any).formations.set(f.id, f)
    }
    expect(sys.getFormations()).toHaveLength(3)
  })

  it('返回的阵型包含正确的 civId', () => {
    const f = makeFormation(42)
    ;(sys as any).formations.set(f.id, f)
    expect(sys.getFormations()[0].civId).toBe(42)
  })

  it('返回的阵型包含正确的 type', () => {
    const f = makeFormation(1, 'wedge')
    ;(sys as any).formations.set(f.id, f)
    expect(sys.getFormations()[0].type).toBe('wedge')
  })

  it('返回的阵型包含正确的 members', () => {
    const f = makeFormation(1, 'line', [10, 20, 30])
    ;(sys as any).formations.set(f.id, f)
    expect(sys.getFormations()[0].members).toEqual([10, 20, 30])
  })

  it('getFormations() 返回的是数组', () => {
    expect(Array.isArray(sys.getFormations())).toBe(true)
  })

  it('支持5种阵型类型全部存入', () => {
    const types: FormationType[] = ['line', 'wedge', 'circle', 'square', 'scatter']
    types.forEach((t, i) => {
      const f = makeFormation(i + 1, t)
      ;(sys as any).formations.set(f.id, f)
    })
    expect(sys.getFormations()).toHaveLength(5)
  })

  it('getFormations() 使用内部缓冲区（同一个数组引用）', () => {
    const result1 = sys.getFormations()
    const result2 = sys.getFormations()
    expect(result1).toBe(result2) // 同一个 _formationsBuf 引用
  })
})

// ─── 测试：createFormation ────────────────────────────────────────────────────

describe('FormationSystem — createFormation()', () => {
  let sys: FormationSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('空 members 返回 -1', () => {
    expect(sys.createFormation(1, 'line', [])).toBe(-1)
  })

  it('有效 members 返回正数 ID', () => {
    const id = sys.createFormation(1, 'line', [1, 2, 3])
    expect(id).toBeGreaterThan(0)
  })

  it('创建后阵型存在于 formations Map', () => {
    const id = sys.createFormation(1, 'circle', [4, 5])
    expect((sys as any).formations.has(id)).toBe(true)
  })

  it('创建后阵型 morale 初始为 100', () => {
    const id = sys.createFormation(1, 'wedge', [1])
    expect((sys as any).formations.get(id).morale).toBe(100)
  })

  it('创建后阵型 facing 初始为 0', () => {
    const id = sys.createFormation(1, 'line', [1, 2])
    expect((sys as any).formations.get(id).facing).toBe(0)
  })

  it('创建后 nextId 递增', () => {
    const id1 = sys.createFormation(1, 'line', [1])
    const id2 = sys.createFormation(1, 'line', [2])
    expect(id2).toBe(id1 + 1)
  })

  it('members 被深拷贝（不共享引用）', () => {
    const members = [1, 2, 3]
    const id = sys.createFormation(1, 'line', members)
    members.push(4)
    expect((sys as any).formations.get(id).members).toHaveLength(3)
  })

  it('创建的阵型 civId 正确', () => {
    const id = sys.createFormation(7, 'square', [10])
    expect((sys as any).formations.get(id).civId).toBe(7)
  })

  it('创建的阵型 type 正确', () => {
    const id = sys.createFormation(1, 'scatter', [10, 20])
    expect((sys as any).formations.get(id).type).toBe('scatter')
  })

  it('centerX 初始为 0', () => {
    const id = sys.createFormation(1, 'line', [1])
    expect((sys as any).formations.get(id).centerX).toBe(0)
  })

  it('centerY 初始为 0', () => {
    const id = sys.createFormation(1, 'line', [1])
    expect((sys as any).formations.get(id).centerY).toBe(0)
  })
})

// ─── 测试：getFormationBonus ──────────────────────────────────────────────────

describe('FormationSystem — getFormationBonus()', () => {
  let sys: FormationSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('不存在的阵型返回 attack=1.0', () => {
    expect(sys.getFormationBonus(999).attack).toBe(1.0)
  })

  it('不存在的阵型返回 defense=1.0', () => {
    expect(sys.getFormationBonus(999).defense).toBe(1.0)
  })

  it('不存在的阵型返回 speed=1.0', () => {
    expect(sys.getFormationBonus(999).speed).toBe(1.0)
  })

  it('line 阵型 attack > 1.0', () => {
    const f = makeFormation(1, 'line')
    ;(sys as any).formations.set(f.id, f)
    expect(sys.getFormationBonus(f.id).attack).toBeGreaterThan(1.0)
  })

  it('line 阵型 defense >= 1.0', () => {
    const f = makeFormation(1, 'line')
    ;(sys as any).formations.set(f.id, f)
    expect(sys.getFormationBonus(f.id).defense).toBeGreaterThanOrEqual(1.0)
  })

  it('wedge 阵型 attack 最高', () => {
    const f = makeFormation(1, 'wedge')
    ;(sys as any).formations.set(f.id, f)
    const bonus = sys.getFormationBonus(f.id)
    expect(bonus.attack).toBeGreaterThan(1.2)
  })

  it('circle 阵型 defense > 1.0', () => {
    const f = makeFormation(1, 'circle')
    ;(sys as any).formations.set(f.id, f)
    expect(sys.getFormationBonus(f.id).defense).toBeGreaterThan(1.0)
  })

  it('circle 阵型 defense 高于 line 阵型', () => {
    const f1 = makeFormation(1, 'circle')
    const f2 = makeFormation(2, 'line')
    ;(sys as any).formations.set(f1.id, f1)
    ;(sys as any).formations.set(f2.id, f2)
    expect(sys.getFormationBonus(f1.id).defense).toBeGreaterThan(sys.getFormationBonus(f2.id).defense)
  })

  it('square 阵型 attack 和 defense 均 >= 1.0', () => {
    const f = makeFormation(1, 'square')
    ;(sys as any).formations.set(f.id, f)
    const bonus = sys.getFormationBonus(f.id)
    expect(bonus.attack).toBeGreaterThanOrEqual(1.0)
    expect(bonus.defense).toBeGreaterThanOrEqual(1.0)
  })

  it('scatter 阵型 defense < 1.0（负面加成）', () => {
    const f = makeFormation(1, 'scatter')
    ;(sys as any).formations.set(f.id, f)
    expect(sys.getFormationBonus(f.id).defense).toBeLessThan(1.0)
  })

  it('scatter 阵型 speed > 1.0', () => {
    const f = makeFormation(1, 'scatter')
    ;(sys as any).formations.set(f.id, f)
    expect(sys.getFormationBonus(f.id).speed).toBeGreaterThan(1.0)
  })

  it('morale=0 时加成降低到 70%（moraleScale=0.7）', () => {
    const f = makeFormation(1, 'line', [1, 2, 3], 0)
    ;(sys as any).formations.set(f.id, f)
    const bonus = sys.getFormationBonus(f.id)
    // line attack base = 1.2, moraleScale at 0 = 0.7 => 1.2 * 0.7 = 0.84
    expect(bonus.attack).toBeCloseTo(1.2 * 0.7)
  })

  it('morale=100 时加成为满值（moraleScale=1.0）', () => {
    const f = makeFormation(1, 'line', [1, 2, 3], 100)
    ;(sys as any).formations.set(f.id, f)
    const bonus = sys.getFormationBonus(f.id)
    expect(bonus.attack).toBeCloseTo(1.2)
  })

  it('morale=50 时加成为中间值', () => {
    const f = makeFormation(1, 'circle', [1], 50)
    ;(sys as any).formations.set(f.id, f)
    const bonus = sys.getFormationBonus(f.id)
    // moraleScale = 0.7 + 0.3 * 0.5 = 0.85, circle defense = 1.3 * 0.85
    expect(bonus.defense).toBeCloseTo(1.3 * 0.85)
  })

  it('speed 加成不受 morale 影响', () => {
    const f1 = makeFormation(1, 'scatter', [1], 0)
    const f2 = makeFormation(2, 'scatter', [1], 100)
    ;(sys as any).formations.set(f1.id, f1)
    ;(sys as any).formations.set(f2.id, f2)
    const b1 = sys.getFormationBonus(f1.id)
    const b2 = sys.getFormationBonus(f2.id)
    expect(b1.speed).toBe(b2.speed)
  })

  it('getFormationBonus 返回同一个缓冲对象', () => {
    const f = makeFormation(1, 'line')
    ;(sys as any).formations.set(f.id, f)
    const r1 = sys.getFormationBonus(f.id)
    const r2 = sys.getFormationBonus(f.id)
    expect(r1).toBe(r2) // 同一个 _bonusBuf 引用
  })
})

// ─── 测试：getFormationForEntity ──────────────────────────────────────────────

describe('FormationSystem — getFormationForEntity()', () => {
  let sys: FormationSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('实体不在任何阵型中时返回 null', () => {
    expect(sys.getFormationForEntity(999)).toBeNull()
  })

  it('实体在阵型中时返回对应阵型', () => {
    const f = makeFormation(1, 'line', [10, 20, 30])
    ;(sys as any).formations.set(f.id, f)
    expect(sys.getFormationForEntity(20)).toBe(f)
  })

  it('实体在首位时可以被找到', () => {
    const f = makeFormation(1, 'line', [5, 6, 7])
    ;(sys as any).formations.set(f.id, f)
    expect(sys.getFormationForEntity(5)).not.toBeNull()
  })

  it('实体在末位时可以被找到', () => {
    const f = makeFormation(1, 'line', [5, 6, 7])
    ;(sys as any).formations.set(f.id, f)
    expect(sys.getFormationForEntity(7)).not.toBeNull()
  })

  it('返回的阵型 id 正确', () => {
    const f = makeFormation(1, 'wedge', [100, 200])
    ;(sys as any).formations.set(f.id, f)
    const found = sys.getFormationForEntity(100)
    expect(found?.id).toBe(f.id)
  })

  it('多个阵型时返回正确的那个', () => {
    const f1 = makeFormation(1, 'line', [1, 2])
    const f2 = makeFormation(2, 'circle', [3, 4])
    ;(sys as any).formations.set(f1.id, f1)
    ;(sys as any).formations.set(f2.id, f2)
    expect(sys.getFormationForEntity(3)).toBe(f2)
    expect(sys.getFormationForEntity(1)).toBe(f1)
  })
})

// ─── 测试：update() — 成员管理 ───────────────────────────────────────────────

describe('FormationSystem — update() 成员管理', () => {
  let sys: FormationSystem
  let em: EntityManager

  beforeEach(() => { sys = makeSys(); em = new EntityManager(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('update() 不崩溃（空阵型）', () => {
    expect(() => sys.update(em, makeWorld(), 0)).not.toThrow()
  })

  it('无 position 组件的成员被移除', () => {
    const id = sys.createFormation(1, 'line', [99, 100])
    // 不添加 position 组件
    sys.update(em, makeWorld(), 0)
    const f = (sys as any).formations.get(id)
    expect(f?.members ?? []).toHaveLength(0)
  })

  it('所有成员死亡后阵型自动解散', () => {
    const id = sys.createFormation(1, 'line', [99])
    sys.update(em, makeWorld(), 0)
    expect((sys as any).formations.has(id)).toBe(false)
  })

  it('有效 position 成员保留', () => {
    const eid = makeEntityWithPos(em, 5, 5)
    const id = sys.createFormation(1, 'line', [eid])
    sys.update(em, makeWorld(), 0)
    const f = (sys as any).formations.get(id)
    expect(f?.members).toContain(eid)
  })

  it('update() 后 centerX 更新为成员平均 x', () => {
    const eid1 = makeEntityWithPos(em, 4, 0)
    const eid2 = makeEntityWithPos(em, 6, 0)
    const id = sys.createFormation(1, 'line', [eid1, eid2])
    sys.update(em, makeWorld(), 0)
    const f = (sys as any).formations.get(id)
    expect(f?.centerX).toBeCloseTo(5) // (4+6)/2=5
  })

  it('update() 后 centerY 更新为成员平均 y', () => {
    const eid1 = makeEntityWithPos(em, 0, 10)
    const eid2 = makeEntityWithPos(em, 0, 20)
    const id = sys.createFormation(1, 'line', [eid1, eid2])
    sys.update(em, makeWorld(), 0)
    const f = (sys as any).formations.get(id)
    expect(f?.centerY).toBeCloseTo(15)
  })

  it('单成员 center 等于成员位置', () => {
    const eid = makeEntityWithPos(em, 7, 8)
    const id = sys.createFormation(1, 'circle', [eid])
    sys.update(em, makeWorld(), 0)
    const f = (sys as any).formations.get(id)
    expect(f?.centerX).toBeCloseTo(7)
    expect(f?.centerY).toBeCloseTo(8)
  })
})

// ─── 测试：update() �� 士气系统 ───────────────────────────────────────────────

describe('FormationSystem — update() 士气系统', () => {
  let sys: FormationSystem
  let em: EntityManager

  beforeEach(() => { sys = makeSys(); em = new EntityManager(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('无战斗时士气缓慢恢复', () => {
    const eid = makeEntityWithPosAndNeeds(em, 5, 5, 100) // health=100
    const id = sys.createFormation(1, 'line', [eid])
    ;(sys as any).formations.get(id).morale = 50
    sys.update(em, makeWorld(), 0)
    expect((sys as any).formations.get(id).morale).toBeGreaterThan(50)
  })

  it('成员 health < 50 时士气下降（战斗状态）', () => {
    const eid = makeEntityWithPosAndNeeds(em, 5, 5, 30) // health=30 < 50
    const id = sys.createFormation(1, 'line', [eid])
    ;(sys as any).formations.get(id).morale = 80
    sys.update(em, makeWorld(), 0)
    expect((sys as any).formations.get(id).morale).toBeLessThan(80)
  })

  it('士气不超过 100', () => {
    const eid = makeEntityWithPosAndNeeds(em, 5, 5, 100)
    const id = sys.createFormation(1, 'line', [eid])
    ;(sys as any).formations.get(id).morale = 100
    sys.update(em, makeWorld(), 0)
    expect((sys as any).formations.get(id).morale).toBeLessThanOrEqual(100)
  })

  it('士气不低于 0', () => {
    const eid = makeEntityWithPosAndNeeds(em, 5, 5, 10) // 战斗状态
    const id = sys.createFormation(1, 'line', [eid])
    ;(sys as any).formations.get(id).morale = 0
    for (let i = 0; i < 50; i++) sys.update(em, makeWorld(), i)
    const f = (sys as any).formations.get(id)
    if (f) expect(f.morale).toBeGreaterThanOrEqual(0)
  })
})

// ─── 测试：calcMemberTarget 各阵型位置计算 ────────────────────────────────────

describe('FormationSystem — calcMemberTarget() 各阵型', () => {
  let sys: FormationSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('calcMemberTarget 方法存在', () => {
    expect(typeof (sys as any).calcMemberTarget).toBe('function')
  })

  it('members 为空时 calcMemberTarget 返回 false', () => {
    const f: Formation = { id: 1, civId: 1, type: 'line', centerX: 0, centerY: 0, members: [], morale: 100, facing: 0 }
    expect((sys as any).calcMemberTarget(f, 0)).toBe(false)
  })

  it('line 阵型 calcMemberTarget 返回 true', () => {
    const f = makeFormation(1, 'line', [1, 2, 3])
    expect((sys as any).calcMemberTarget(f, 0)).toBe(true)
  })

  it('wedge 阵型第 0 个成员在中心（lx=0, ly=0）', () => {
    const f: Formation = { id: 1, civId: 1, type: 'wedge', centerX: 10, centerY: 10, members: [0, 1, 2], morale: 100, facing: 0 }
    ;(sys as any).calcMemberTarget(f, 0)
    expect((sys as any)._tx).toBeCloseTo(10)
    expect((sys as any)._ty).toBeCloseTo(10)
  })

  it('circle 阵型单成员在中心', () => {
    const f: Formation = { id: 1, civId: 1, type: 'circle', centerX: 5, centerY: 5, members: [1], morale: 100, facing: 0 }
    ;(sys as any).calcMemberTarget(f, 0)
    expect((sys as any)._tx).toBeCloseTo(5)
    expect((sys as any)._ty).toBeCloseTo(5)
  })

  it('square 阵型返回 true', () => {
    const f = makeFormation(1, 'square', [1, 2, 3, 4])
    expect((sys as any).calcMemberTarget(f, 0)).toBe(true)
  })

  it('scatter 阵型 calcMemberTarget 返回 true', () => {
    const f = makeFormation(1, 'scatter', [1, 2, 3])
    expect((sys as any).calcMemberTarget(f, 0)).toBe(true)
  })

  it('scatter 阵型位置确定性（相同 seed 相同结果）', () => {
    const f: Formation = { id: 42, civId: 1, type: 'scatter', centerX: 0, centerY: 0, members: [1], morale: 100, facing: 0 }
    ;(sys as any).calcMemberTarget(f, 0)
    const tx1 = (sys as any)._tx
    const ty1 = (sys as any)._ty
    ;(sys as any).calcMemberTarget(f, 0)
    const tx2 = (sys as any)._tx
    const ty2 = (sys as any)._ty
    expect(tx1).toBeCloseTo(tx2)
    expect(ty1).toBeCloseTo(ty2)
  })

  it('line 阵型不同 index 产生不同 ty 位置', () => {
    const f = makeFormation(1, 'line', [1, 2, 3])
    ;(sys as any).calcMemberTarget(f, 0)
    const ty0 = (sys as any)._ty
    ;(sys as any).calcMemberTarget(f, 2)
    const ty2 = (sys as any)._ty
    expect(ty0).not.toBeCloseTo(ty2)
  })

  it('facing=0 时 line 阵型成员沿 Y 方向排列', () => {
    const f: Formation = { id: 1, civId: 1, type: 'line', centerX: 10, centerY: 10, members: [1, 2, 3], morale: 100, facing: 0 }
    ;(sys as any).calcMemberTarget(f, 0)
    const tx = (sys as any)._tx
    // facing=0 => cos=1, sin=0; lx=0 => tx=centerX+0=10
    expect(tx).toBeCloseTo(10)
  })
})

// ─── 测试：render() ────────────────────────────────────────────────────────────

describe('FormationSystem — render()', () => {
  let sys: FormationSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  function makeFakeCtx() {
    return {
      canvas: { width: 800, height: 600 },
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      fillRect: vi.fn(),
      closePath: vi.fn(),
      textAlign: 'center',
      font: '',
      globalAlpha: 1,
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 1,
    } as any
  }

  it('render() 不崩溃（无阵型）', () => {
    const ctx = makeFakeCtx()
    expect(() => sys.render(ctx, 0, 0, 1)).not.toThrow()
  })

  it('无阵型时 ctx.save 不被调用', () => {
    const ctx = makeFakeCtx()
    sys.render(ctx, 0, 0, 1)
    expect(ctx.save).not.toHaveBeenCalled()
  })

  it('有阵型时 ctx.save 被调用', () => {
    const f = makeFormation(1, 'line')
    ;(sys as any).formations.set(f.id, f)
    const ctx = makeFakeCtx()
    sys.render(ctx, 0, 0, 1)
    expect(ctx.save).toHaveBeenCalled()
  })

  it('有阵型时 ctx.restore 被调用', () => {
    const f = makeFormation(1, 'circle')
    ;(sys as any).formations.set(f.id, f)
    const ctx = makeFakeCtx()
    sys.render(ctx, 0, 0, 1)
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('有阵型时 ctx.fillText 被调用（绘制图标）', () => {
    const f = makeFormation(1, 'line')
    ;(sys as any).formations.set(f.id, f)
    const ctx = makeFakeCtx()
    sys.render(ctx, 0, 0, 1)
    expect(ctx.fillText).toHaveBeenCalled()
  })

  it('zoom 改变时 _lastZoom 更新', () => {
    const f = makeFormation(1, 'line')
    ;(sys as any).formations.set(f.id, f)
    const ctx = makeFakeCtx()
    sys.render(ctx, 0, 0, 2.5)
    expect((sys as any)._lastZoom).toBe(2.5)
  })

  it('zoom 改变时 _iconFont 重新计算', () => {
    const f = makeFormation(1, 'line')
    ;(sys as any).formations.set(f.id, f)
    const ctx = makeFakeCtx()
    sys.render(ctx, 0, 0, 2)
    expect((sys as any)._iconFont).toContain('monospace')
  })

  it('morale > 50 时 render 过程中使用蓝色 strokeStyle', () => {
    const f = makeFormation(1, 'line', [1, 2, 3], 80)
    ;(sys as any).formations.set(f.id, f)
    const ctx = makeFakeCtx()
    const usedColors: string[] = []
    // 追踪所有 strokeStyle 赋值
    let _strokeStyle = ''
    Object.defineProperty(ctx, 'strokeStyle', {
      get: () => _strokeStyle,
      set: (v: string) => { _strokeStyle = v; usedColors.push(v) },
      configurable: true,
    })
    sys.render(ctx, 0, 0, 1)
    expect(usedColors).toContain('#4fc3f7')
  })

  it('morale <= 50 时 render 过程中使用橙色 strokeStyle', () => {
    const f = makeFormation(1, 'line', [1, 2, 3], 30)
    ;(sys as any).formations.set(f.id, f)
    const ctx = makeFakeCtx()
    const usedColors: string[] = []
    let _strokeStyle = ''
    Object.defineProperty(ctx, 'strokeStyle', {
      get: () => _strokeStyle,
      set: (v: string) => { _strokeStyle = v; usedColors.push(v) },
      configurable: true,
    })
    sys.render(ctx, 0, 0, 1)
    expect(usedColors).toContain('#ff8a65')
  })

  it('fillRect 被调用（士气条）', () => {
    const f = makeFormation(1, 'line')
    ;(sys as any).formations.set(f.id, f)
    const ctx = makeFakeCtx()
    sys.render(ctx, 0, 0, 1)
    expect(ctx.fillRect).toHaveBeenCalled()
  })
})
