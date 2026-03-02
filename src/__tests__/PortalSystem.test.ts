import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { PortalSystem } from '../systems/PortalSystem'
import type { Portal } from '../systems/PortalSystem'
import { EntityManager, PositionComponent } from '../ecs/Entity'

function makeSys(): PortalSystem { return new PortalSystem() }

let _nextId = 1
function makePortal(overrides: Partial<Portal> = {}): Portal {
  const id = overrides.id ?? _nextId++
  return {
    id,
    x: overrides.x ?? 10,
    y: overrides.y ?? 10,
    pairedId: overrides.pairedId ?? id + 1,
    color: overrides.color ?? '#8b5cf6',
    active: overrides.active ?? true,
    cooldown: overrides.cooldown ?? 0,
  }
}

function injectPortal(sys: PortalSystem, p: Portal): void {
  ;(sys as any).portals.set(p.id, p)
}

function makeEM(): EntityManager { return new EntityManager() }

// ── getPortalCount ────────────────────────────────────────────────────────────
describe('getPortalCount - 传送门数量', () => {
  let sys: PortalSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始数量为 0', () => {
    expect(sys.getPortalCount()).toBe(0)
  })

  it('注入 1 个后为 1', () => {
    injectPortal(sys, makePortal())
    expect(sys.getPortalCount()).toBe(1)
  })

  it('注入 5 个后为 5', () => {
    for (let i = 0; i < 5; i++) injectPortal(sys, makePortal())
    expect(sys.getPortalCount()).toBe(5)
  })

  it('clear() 后回到 0', () => {
    injectPortal(sys, makePortal())
    sys.clear()
    expect(sys.getPortalCount()).toBe(0)
  })
})

// ── getPortals ────────────────────────────────────────────────────────────────
describe('getPortals - 获取所有传送门', () => {
  let sys: PortalSystem
  beforeEach(() => { sys = makeSys(); _nextId = 10 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始返回空数组', () => {
    expect(sys.getPortals()).toHaveLength(0)
  })

  it('注入后返回正确数量', () => {
    injectPortal(sys, makePortal())
    injectPortal(sys, makePortal())
    expect(sys.getPortals()).toHaveLength(2)
  })

  it('返回结果是内部缓冲引用（复用 _portalsBuf）', () => {
    injectPortal(sys, makePortal())
    const r1 = sys.getPortals()
    const r2 = sys.getPortals()
    expect(r1).toBe(r2)
  })

  it('传送门字段 active 正确', () => {
    injectPortal(sys, makePortal({ active: true }))
    expect(sys.getPortals()[0].active).toBe(true)
  })

  it('传送门字段 pairedId 正确', () => {
    injectPortal(sys, makePortal({ id: 20, pairedId: 21 }))
    const r = sys.getPortals().find(p => p.id === 20)
    expect(r?.pairedId).toBe(21)
  })

  it('传送门字段 color 正确', () => {
    injectPortal(sys, makePortal({ color: '#ef4444' }))
    expect(sys.getPortals()[0].color).toBe('#ef4444')
  })

  it('非活跃传送门也被返回（getPortals 不过滤）', () => {
    injectPortal(sys, makePortal({ active: false }))
    expect(sys.getPortals()).toHaveLength(1)
  })
})

// ── getPortalAt ───────────────────────────────────────────────────────────────
describe('getPortalAt - 坐标查询', () => {
  let sys: PortalSystem
  beforeEach(() => { sys = makeSys(); _nextId = 50 })
  afterEach(() => { vi.restoreAllMocks() })

  it('空系统返回 null', () => {
    expect(sys.getPortalAt(5, 5)).toBeNull()
  })

  it('精确坐标命中', () => {
    const p = makePortal({ x: 5, y: 5 })
    injectPortal(sys, p)
    expect(sys.getPortalAt(5, 5)).not.toBeNull()
  })

  it('在 TELEPORT_RADIUS(1.5) 范围内命中', () => {
    const p = makePortal({ x: 10, y: 10 })
    injectPortal(sys, p)
    // dx=1, dy=1 → dist²=2 < 1.5²=2.25
    expect(sys.getPortalAt(11, 11)).not.toBeNull()
  })

  it('超出 TELEPORT_RADIUS 范围返回 null', () => {
    const p = makePortal({ x: 10, y: 10 })
    injectPortal(sys, p)
    // dx=2, dy=0 → dist²=4 > 2.25
    expect(sys.getPortalAt(12, 10)).toBeNull()
  })

  it('返回的对象是传送门本身', () => {
    const p = makePortal({ x: 5, y: 5 })
    injectPortal(sys, p)
    expect(sys.getPortalAt(5, 5)).toBe(p)
  })

  it('多个传送门时返回最先找到的匹配项', () => {
    const p1 = makePortal({ x: 5, y: 5 })
    const p2 = makePortal({ x: 5, y: 5 })
    injectPortal(sys, p1)
    injectPortal(sys, p2)
    const result = sys.getPortalAt(5, 5)
    expect(result).not.toBeNull()
  })

  it('距离恰好等于 TELEPORT_RADIUS 时命中（≤ 判断）', () => {
    // dx=1.5, dy=0 → dist²=2.25 = 1.5² → 应命中（使用 <= ）
    const p = makePortal({ x: 10, y: 10 })
    injectPortal(sys, p)
    expect(sys.getPortalAt(11.5, 10)).not.toBeNull()
  })
})

// ── clear ─────────────────────────────────────────────────────────────────────
describe('clear - 清理状态', () => {
  let sys: PortalSystem
  beforeEach(() => { sys = makeSys(); _nextId = 70 })
  afterEach(() => { vi.restoreAllMocks() })

  it('clear 后 portals 为空', () => {
    injectPortal(sys, makePortal())
    sys.clear()
    expect((sys as any).portals.size).toBe(0)
  })

  it('clear 后 entityCooldowns 为空', () => {
    ;(sys as any).entityCooldowns.set(99, 1000)
    sys.clear()
    expect((sys as any).entityCooldowns.size).toBe(0)
  })

  it('clear 后 flashes 为空', () => {
    ;(sys as any).flashes.push({ x: 0, y: 0, life: 10, maxLife: 20, color: '#fff' })
    sys.clear()
    expect((sys as any).flashes).toHaveLength(0)
  })

  it('clear 后 pairCount 为 0', () => {
    ;(sys as any).pairCount = 5
    sys.clear()
    expect((sys as any).pairCount).toBe(0)
  })

  it('clear 后所有粒子 life 置为 0', () => {
    // 激活第一个粒子
    ;(sys as any).particles[0].life = 10
    sys.clear()
    const allDead = (sys as any).particles.every((p: any) => p.life === 0)
    expect(allDead).toBe(true)
  })

  it('clear 后 getPortalCount 返回 0', () => {
    injectPortal(sys, makePortal())
    injectPortal(sys, makePortal())
    sys.clear()
    expect(sys.getPortalCount()).toBe(0)
  })
})

// ── update - cooldown 递减 ────────────────────────────────────────────────────
describe('update - portal cooldown 递减', () => {
  let sys: PortalSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEM(); _nextId = 90 })
  afterEach(() => { vi.restoreAllMocks() })

  it('cooldown > 0 每 tick 递减 1', () => {
    const p = makePortal({ cooldown: 5 })
    injectPortal(sys, p)
    sys.update(em, 1)
    expect(p.cooldown).toBe(4)
  })

  it('cooldown 为 0 时不变成负数', () => {
    const p = makePortal({ cooldown: 0 })
    injectPortal(sys, p)
    sys.update(em, 1)
    expect(p.cooldown).toBe(0)
  })

  it('cooldown = 1 时经 1 tick 变为 0', () => {
    const p = makePortal({ cooldown: 1 })
    injectPortal(sys, p)
    sys.update(em, 1)
    expect(p.cooldown).toBe(0)
  })
})

// ── update - 传送机制 ────────────────────────────────────────────────────────
describe('update - 实体传送', () => {
  let sys: PortalSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEM(); _nextId = 200 })
  afterEach(() => { vi.restoreAllMocks() })

  function addEntityAt(x: number, y: number): number {
    const eid = em.createEntity()
    em.addComponent<PositionComponent>(eid, { type: 'position', x, y })
    return eid
  }

  it('实体位于传送门范围内时被传送到配对传送门', () => {
    const pA: Portal = { id: 200, x: 10, y: 10, pairedId: 201, color: '#fff', active: true, cooldown: 0 }
    const pB: Portal = { id: 201, x: 50, y: 50, pairedId: 200, color: '#fff', active: true, cooldown: 0 }
    injectPortal(sys, pA)
    injectPortal(sys, pB)

    const eid = addEntityAt(10, 10)
    sys.update(em, 1)

    const pos = em.getComponent<PositionComponent>(eid, 'position')!
    expect(pos.x).toBe(50)
    expect(pos.y).toBe(50)
  })

  it('传送后实体设置 cooldown，不再立即二次传送', () => {
    const pA: Portal = { id: 210, x: 10, y: 10, pairedId: 211, color: '#fff', active: true, cooldown: 0 }
    const pB: Portal = { id: 211, x: 50, y: 50, pairedId: 210, color: '#fff', active: true, cooldown: 0 }
    injectPortal(sys, pA)
    injectPortal(sys, pB)

    const eid = addEntityAt(10, 10)
    sys.update(em, 1)

    // 传送后 pB 也有 cooldown，tick=2 时实体在 pB 位置但两个门都有 cooldown
    const posAfter = em.getComponent<PositionComponent>(eid, 'position')!
    expect(posAfter.x).toBe(50)
    // entityCooldowns 应记录该实体
    expect((sys as any).entityCooldowns.has(eid)).toBe(true)
  })

  it('inactive 传送门不触发传送', () => {
    const pA: Portal = { id: 220, x: 10, y: 10, pairedId: 221, color: '#fff', active: false, cooldown: 0 }
    const pB: Portal = { id: 221, x: 50, y: 50, pairedId: 220, color: '#fff', active: true, cooldown: 0 }
    injectPortal(sys, pA)
    injectPortal(sys, pB)

    const eid = addEntityAt(10, 10)
    sys.update(em, 1)

    const pos = em.getComponent<PositionComponent>(eid, 'position')!
    expect(pos.x).toBe(10)
    expect(pos.y).toBe(10)
  })

  it('传送门 cooldown > 0 时不触发传送', () => {
    const pA: Portal = { id: 230, x: 10, y: 10, pairedId: 231, color: '#fff', active: true, cooldown: 5 }
    const pB: Portal = { id: 231, x: 50, y: 50, pairedId: 230, color: '#fff', active: true, cooldown: 0 }
    injectPortal(sys, pA)
    injectPortal(sys, pB)

    const eid = addEntityAt(10, 10)
    sys.update(em, 1)

    const pos = em.getComponent<PositionComponent>(eid, 'position')!
    expect(pos.x).toBe(10)
  })

  it('配对传送门不存在时不传送', () => {
    const pA: Portal = { id: 240, x: 10, y: 10, pairedId: 999, color: '#fff', active: true, cooldown: 0 }
    injectPortal(sys, pA)

    const eid = addEntityAt(10, 10)
    sys.update(em, 1)

    const pos = em.getComponent<PositionComponent>(eid, 'position')!
    expect(pos.x).toBe(10)
  })

  it('传送后触发出发点 flash', () => {
    const pA: Portal = { id: 250, x: 10, y: 10, pairedId: 251, color: '#ff0', active: true, cooldown: 0 }
    const pB: Portal = { id: 251, x: 80, y: 80, pairedId: 250, color: '#00f', active: true, cooldown: 0 }
    injectPortal(sys, pA)
    injectPortal(sys, pB)

    addEntityAt(10, 10)
    sys.update(em, 1)

    // 传送产生 2 个 flash（出发 + 到达）
    expect((sys as any).flashes.length).toBeGreaterThanOrEqual(2)
  })

  it('实体在 entityCooldown 期间不再传送', () => {
    const pA: Portal = { id: 260, x: 10, y: 10, pairedId: 261, color: '#fff', active: true, cooldown: 0 }
    const pB: Portal = { id: 261, x: 50, y: 50, pairedId: 260, color: '#fff', active: true, cooldown: 0 }
    injectPortal(sys, pA)
    injectPortal(sys, pB)

    const eid = addEntityAt(10, 10)
    // 设置 entityCooldown 未过期
    ;(sys as any).entityCooldowns.set(eid, 9999)
    sys.update(em, 1)

    // 实体不应被传送
    const pos = em.getComponent<PositionComponent>(eid, 'position')!
    expect(pos.x).toBe(10)
  })
})

// ── update - 粒子系统 ─────────────────────────────────────────────────────────
describe('update - 粒子 life 递减', () => {
  let sys: PortalSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEM(); _nextId = 300 })
  afterEach(() => { vi.restoreAllMocks() })

  it('active 粒子 life 每 tick 递减 1', () => {
    ;(sys as any).particles[0].life = 10
    ;(sys as any).particles[0].maxLife = 10
    sys.update(em, 1)
    expect((sys as any).particles[0].life).toBe(9)
  })

  it('life <= 0 的粒子不被处理（不变成负值）', () => {
    ;(sys as any).particles[0].life = 0
    sys.update(em, 1)
    expect((sys as any).particles[0].life).toBe(0)
  })

  it('粒子位置每 tick 按速度更新', () => {
    const p = (sys as any).particles[0]
    p.x = 5; p.y = 5; p.vx = 1; p.vy = -1; p.life = 5; p.maxLife = 5
    sys.update(em, 1)
    expect(p.x).toBe(6)
    expect(p.y).toBe(4)
  })
})

// ── update - flash 衰减 ───────────────────────────────────────────────────────
describe('update - teleportFlash 衰减', () => {
  let sys: PortalSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEM(); _nextId = 350 })
  afterEach(() => { vi.restoreAllMocks() })

  it('flash life 每 tick 递减 1', () => {
    ;(sys as any).flashes.push({ x: 0, y: 0, life: 5, maxLife: 5, color: '#fff' })
    sys.update(em, 1)
    expect((sys as any).flashes[0].life).toBe(4)
  })

  it('flash life 归零后被移除', () => {
    ;(sys as any).flashes.push({ x: 0, y: 0, life: 1, maxLife: 5, color: '#fff' })
    sys.update(em, 1)
    expect((sys as any).flashes).toHaveLength(0)
  })

  it('多个 flash 独立衰减', () => {
    ;(sys as any).flashes.push({ x: 0, y: 0, life: 3, maxLife: 5, color: '#fff' })
    ;(sys as any).flashes.push({ x: 1, y: 1, life: 1, maxLife: 5, color: '#f00' })
    sys.update(em, 1)
    // 第二个 flash 应被移除
    expect((sys as any).flashes).toHaveLength(1)
    expect((sys as any).flashes[0].life).toBe(2)
  })
})

// ── entityCooldowns 清理 ──────────────────────────────────────────────────────
describe('update - entityCooldowns 定期清理', () => {
  let sys: PortalSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEM(); _nextId = 400 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=120 时清理过期的 entityCooldowns', () => {
    ;(sys as any).entityCooldowns.set(500, 50) // 过期：expiry=50 < tick=120
    sys.update(em, 120)
    expect((sys as any).entityCooldowns.has(500)).toBe(false)
  })

  it('tick=120 时未过期的 cooldown 保留', () => {
    ;(sys as any).entityCooldowns.set(600, 200) // 未过期：expiry=200 > tick=120
    sys.update(em, 120)
    expect((sys as any).entityCooldowns.has(600)).toBe(true)
  })

  it('tick 非 120 的倍数时不清理', () => {
    ;(sys as any).entityCooldowns.set(700, 1) // 即使过期也不清理
    sys.update(em, 119)
    expect((sys as any).entityCooldowns.has(700)).toBe(true)
  })
})

// ── animTick ──────────────────────────────────────────────────────────────────
describe('update - animTick 同步', () => {
  let sys: PortalSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEM() })
  afterEach(() => { vi.restoreAllMocks() })

  it('update 调用后 animTick 等于传入的 tick', () => {
    sys.update(em, 42)
    expect((sys as any).animTick).toBe(42)
  })

  it('多次 update 后 animTick 跟随最后一次 tick', () => {
    sys.update(em, 1)
    sys.update(em, 99)
    expect((sys as any).animTick).toBe(99)
  })
})

// ── 粒子池大小与初始化 ────────────────────────────────────────────────────────
describe('PortalSystem - 初始状态与粒子池', () => {
  let sys: PortalSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('粒子池大小为 MAX_PARTICLES(256)', () => {
    expect((sys as any).particles).toHaveLength(256)
  })

  it('粒子池初始 life 全为 0', () => {
    const allDead = (sys as any).particles.every((p: any) => p.life === 0)
    expect(allDead).toBe(true)
  })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('pairCount 初始为 0', () => {
    expect((sys as any).pairCount).toBe(0)
  })

  it('entityCooldowns 初始为空 Map', () => {
    expect((sys as any).entityCooldowns.size).toBe(0)
  })

  it('flashes 初始为空数组', () => {
    expect((sys as any).flashes).toHaveLength(0)
  })

  it('_drawnSet 初始为空 Set', () => {
    expect((sys as any)._drawnSet.size).toBe(0)
  })
})
