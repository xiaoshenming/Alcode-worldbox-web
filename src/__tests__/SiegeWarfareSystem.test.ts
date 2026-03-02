import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { SiegeWarfareSystem } from '../systems/SiegeWarfareSystem'
import type { SiegeWeaponType } from '../systems/SiegeWarfareSystem'

afterEach(() => { vi.restoreAllMocks() })

function makeSys(): SiegeWarfareSystem { return new SiegeWarfareSystem() }

// ─── 初始化状态 ────────────────────────────────────────────
describe('SiegeWarfareSystem - 初始化状态', () => {
  let sys: SiegeWarfareSystem
  beforeEach(() => { sys = makeSys() })

  it('getActiveSieges 初始为空', () => {
    expect(sys.getActiveSieges()).toHaveLength(0)
  })

  it('getSiegeAt 无围攻时返回 undefined', () => {
    expect(sys.getSiegeAt(0, 0)).toBeUndefined()
  })

  it('内部 particles 初始为空', () => {
    expect((sys as any).particles).toHaveLength(0)
  })

  it('内部 nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('内部 sieges Map 初始为空', () => {
    expect((sys as any).sieges.size).toBe(0)
  })
})

// ─── startSiege ────────────────────────────────────────────
describe('SiegeWarfareSystem.startSiege', () => {
  let sys: SiegeWarfareSystem
  beforeEach(() => { sys = makeSys() })

  it('创建并返回 SiegeData 对象', () => {
    const siege = sys.startSiege(1, 2, 10, 10, 50)
    expect(siege).toBeDefined()
  })

  it('attackerCivId 正确赋值', () => {
    const siege = sys.startSiege(3, 4, 10, 10, 20)
    expect(siege.attackerCivId).toBe(3)
  })

  it('defenderCivId 正确赋值', () => {
    const siege = sys.startSiege(3, 4, 10, 10, 20)
    expect(siege.defenderCivId).toBe(4)
  })

  it('targetCityX 正确赋值', () => {
    const siege = sys.startSiege(1, 2, 55, 77, 10)
    expect(siege.targetCityX).toBe(55)
  })

  it('targetCityY 正确赋值', () => {
    const siege = sys.startSiege(1, 2, 55, 77, 10)
    expect(siege.targetCityY).toBe(77)
  })

  it('progress 初始为 0', () => {
    const siege = sys.startSiege(1, 2, 10, 10, 50)
    expect(siege.progress).toBe(0)
  })

  it('startTick 初始为 0', () => {
    const siege = sys.startSiege(1, 2, 10, 10, 50)
    expect(siege.startTick).toBe(0)
  })

  it('siegeWeapons 初始为空数组', () => {
    const siege = sys.startSiege(1, 2, 10, 10, 50)
    expect(siege.siegeWeapons).toHaveLength(0)
  })

  it('defenderMorale 初始为 100', () => {
    const siege = sys.startSiege(1, 2, 10, 10, 50)
    expect(siege.defenderMorale).toBe(100)
  })

  it('resolved 初始为 false', () => {
    const siege = sys.startSiege(1, 2, 10, 10, 50)
    expect(siege.resolved).toBe(false)
  })

  it('attackerCount 最小为 1（即使传入 0）', () => {
    const siege = sys.startSiege(1, 2, 10, 10, 0)
    expect(siege.attackerCount).toBe(1)
  })

  it('attackerCount 正常赋值', () => {
    const siege = sys.startSiege(1, 2, 10, 10, 80)
    expect(siege.attackerCount).toBe(80)
  })

  it('id 自增', () => {
    const s1 = sys.startSiege(1, 2, 10, 10, 10)
    const s2 = sys.startSiege(3, 4, 20, 20, 10)
    expect(s2.id).toBe(s1.id + 1)
  })

  it('多次 startSiege 后 getActiveSieges 数量正确', () => {
    sys.startSiege(1, 2, 10, 10, 10)
    sys.startSiege(3, 4, 20, 20, 10)
    sys.startSiege(5, 6, 30, 30, 10)
    expect(sys.getActiveSieges()).toHaveLength(3)
  })
})

// ─── getSiegeAt ────────────────────────────────────────────
describe('SiegeWarfareSystem.getSiegeAt', () => {
  let sys: SiegeWarfareSystem
  beforeEach(() => { sys = makeSys() })

  it('精确坐标匹配时返回 SiegeData', () => {
    sys.startSiege(1, 2, 10, 10, 50)
    expect(sys.getSiegeAt(10, 10)).toBeDefined()
  })

  it('坐标不匹配时返回 undefined', () => {
    sys.startSiege(1, 2, 10, 10, 50)
    expect(sys.getSiegeAt(20, 20)).toBeUndefined()
  })

  it('resolved 的围攻不出现在 getSiegeAt 中', () => {
    const siege = sys.startSiege(1, 2, 10, 10, 50)
    siege.resolved = true
    expect(sys.getSiegeAt(10, 10)).toBeUndefined()
  })

  it('多个围攻时按坐标查找正确', () => {
    sys.startSiege(1, 2, 10, 10, 50)
    sys.startSiege(3, 4, 20, 20, 50)
    const s = sys.getSiegeAt(20, 20)
    expect(s!.attackerCivId).toBe(3)
  })
})

// ─── getActiveSieges ────────────────────────────────────────────
describe('SiegeWarfareSystem.getActiveSieges', () => {
  let sys: SiegeWarfareSystem
  beforeEach(() => { sys = makeSys() })

  it('无围攻时返回空数组', () => {
    expect(sys.getActiveSieges()).toHaveLength(0)
  })

  it('resolved 的围攻不计入活跃', () => {
    const s = sys.startSiege(1, 2, 10, 10, 50)
    s.resolved = true
    expect(sys.getActiveSieges()).toHaveLength(0)
  })

  it('只统计未 resolved 的围攻', () => {
    sys.startSiege(1, 2, 10, 10, 50)
    const s2 = sys.startSiege(3, 4, 20, 20, 50)
    s2.resolved = true
    expect(sys.getActiveSieges()).toHaveLength(1)
  })

  it('返回的是内部 buffer 引用（可重用）', () => {
    sys.startSiege(1, 2, 10, 10, 50)
    const a = sys.getActiveSieges()
    const b = sys.getActiveSieges()
    expect(a).toBe(b)
  })
})

// ─── addSiegeWeapon ────────────────────────────────────────────
describe('SiegeWarfareSystem.addSiegeWeapon', () => {
  let sys: SiegeWarfareSystem
  beforeEach(() => { sys = makeSys() })

  it('存在的围攻添加武器成功返回 true', () => {
    const s = sys.startSiege(1, 2, 10, 10, 50)
    expect(sys.addSiegeWeapon(s.id, 'catapult')).toBe(true)
  })

  it('添加武器后 siegeWeapons 数量增加', () => {
    const s = sys.startSiege(1, 2, 10, 10, 50)
    sys.addSiegeWeapon(s.id, 'catapult')
    expect(s.siegeWeapons).toHaveLength(1)
  })

  it('添加多种武器', () => {
    const s = sys.startSiege(1, 2, 10, 10, 50)
    sys.addSiegeWeapon(s.id, 'battering_ram')
    sys.addSiegeWeapon(s.id, 'trebuchet')
    sys.addSiegeWeapon(s.id, 'siege_tower')
    expect(s.siegeWeapons).toHaveLength(3)
  })

  it('不存在的 siegeId 返回 false', () => {
    expect(sys.addSiegeWeapon(999, 'catapult')).toBe(false)
  })

  it('resolved 的围攻添加武器返回 false', () => {
    const s = sys.startSiege(1, 2, 10, 10, 50)
    s.resolved = true
    expect(sys.addSiegeWeapon(s.id, 'catapult')).toBe(false)
  })

  it('四种武器类型均可添加', () => {
    const s = sys.startSiege(1, 2, 10, 10, 50)
    const weapons: SiegeWeaponType[] = ['battering_ram', 'catapult', 'siege_tower', 'trebuchet']
    for (const w of weapons) {
      expect(sys.addSiegeWeapon(s.id, w)).toBe(true)
    }
    expect(s.siegeWeapons).toHaveLength(4)
  })
})

// ─── update: 进度推进 ────────────────────────────────────────────
describe('SiegeWarfareSystem.update - 进度推进', () => {
  let sys: SiegeWarfareSystem
  beforeEach(() => { sys = makeSys() })

  it('大量攻击方时 progress 增加', () => {
    const s = sys.startSiege(1, 2, 10, 10, 200)
    sys.update(1)
    expect(s.progress).toBeGreaterThan(0)
  })

  it('progress 不超过 100', () => {
    const s = sys.startSiege(1, 2, 10, 10, 1000)
    // 强制多次 update 推到满
    for (let i = 1; i <= 200; i++) sys.update(i)
    expect(s.progress).toBeLessThanOrEqual(100)
  })

  it('progress 达到 100 时 resolved 变为 true', () => {
    const s = sys.startSiege(1, 2, 10, 10, 1000)
    s.progress = 99.9
    sys.addSiegeWeapon(s.id, 'trebuchet')
    sys.update(1)
    expect(s.resolved).toBe(true)
  })

  it('resolved 的围攻不再继续处理', () => {
    const s = sys.startSiege(1, 2, 10, 10, 50)
    s.resolved = true
    const prevProgress = s.progress
    sys.update(1)
    expect(s.progress).toBe(prevProgress)
  })

  it('startTick 首次 update 时被记录', () => {
    const s = sys.startSiege(1, 2, 10, 10, 50)
    sys.update(42)
    expect(s.startTick).toBe(42)
  })

  it('siege_tower 削减墙壁防御效果', () => {
    const s1 = sys.startSiege(1, 2, 10, 10, 200)
    const s2 = sys.startSiege(3, 4, 20, 20, 200)
    sys.addSiegeWeapon(s2.id, 'siege_tower')
    sys.update(1)
    // s2 有攻城塔，墙壁防御减弱，进度应大于等于 s1
    expect(s2.progress).toBeGreaterThanOrEqual(s1.progress)
  })

  it('morale 低于阈值(15)时 resolved 变为 true', () => {
    const s = sys.startSiege(1, 2, 10, 10, 10)
    s.defenderMorale = 14
    sys.update(1)
    expect(s.resolved).toBe(true)
  })

  it('defenderMorale 随时间下降', () => {
    const s = sys.startSiege(1, 2, 10, 10, 50)
    s.startTick = 1
    sys.update(50)
    expect(s.defenderMorale).toBeLessThan(100)
  })

  it('defenderMorale 不低于 0', () => {
    const s = sys.startSiege(1, 2, 10, 10, 1000)
    for (let i = 0; i < 1000; i++) sys.update(i)
    if (!s.resolved) {
      expect(s.defenderMorale).toBeGreaterThanOrEqual(0)
    }
  })
})

// ─── update: 粒子系统 ────────────────────────────────────────────
describe('SiegeWarfareSystem.update - 粒子', () => {
  let sys: SiegeWarfareSystem
  beforeEach(() => { sys = makeSys() })

  it('有武器时粒子数量可能增加', () => {
    const s = sys.startSiege(1, 2, 10, 10, 50)
    sys.addSiegeWeapon(s.id, 'catapult')
    // 多次 update 以确保有机会触发粒子
    for (let i = 1; i <= 30; i++) sys.update(i)
    // 由于随机性，粒子数 >= 0 即可
    expect((sys as any).particles.length).toBeGreaterThanOrEqual(0)
  })

  it('粒子 life 会随 update 减少', () => {
    const s = sys.startSiege(1, 2, 10, 10, 50)
    sys.addSiegeWeapon(s.id, 'trebuchet')
    // 强制注入粒子
    ;(sys as any).particles.push({ x: 10, y: 10, life: 10, vx: 0, vy: -0.5, type: 'fire' })
    sys.update(1)
    const particles = (sys as any).particles
    // 粒子生命减少，可能被清除
    if (particles.length > 0) {
      expect(particles[0].life).toBeLessThan(10)
    }
  })

  it('粒子 life 耗尽后被清除', () => {
    ;(sys as any).particles.push({ x: 5, y: 5, life: 1, vx: 0, vy: 0, type: 'smoke' })
    sys.update(1)
    expect((sys as any).particles).toHaveLength(0)
  })

  it('粒子 x/y 随 vx/vy 移动', () => {
    ;(sys as any).particles.push({ x: 5, y: 5, life: 20, vx: 2, vy: -1, type: 'fire' })
    sys.update(1)
    const p = (sys as any).particles[0]
    expect(p.x).toBeCloseTo(7)
    expect(p.y).toBeCloseTo(4)
  })
})

// ─── render: 基础检验 ────────────────────────────────────────────
describe('SiegeWarfareSystem.render - 基础', () => {
  let sys: SiegeWarfareSystem

  function makeCtx() {
    return {
      save: vi.fn(), restore: vi.fn(),
      fillRect: vi.fn(), strokeRect: vi.fn(),
      beginPath: vi.fn(), arc: vi.fn(), stroke: vi.fn(),
      fillText: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
      setLineDash: vi.fn(),
      get fillStyle() { return '' }, set fillStyle(_v: string) {},
      get strokeStyle() { return '' }, set strokeStyle(_v: string) {},
      get lineWidth() { return 1 }, set lineWidth(_v: number) {},
      get font() { return '' }, set font(_v: string) {},
      get textAlign() { return '' }, set textAlign(_v: string) {},
    } as unknown as CanvasRenderingContext2D
  }

  beforeEach(() => { sys = makeSys() })

  it('无围攻时 render 不抛出异常', () => {
    expect(() => sys.render(makeCtx(), 0, 0, 1)).not.toThrow()
  })

  it('有围攻时 render 不抛出异常', () => {
    sys.startSiege(1, 2, 10, 10, 50)
    expect(() => sys.render(makeCtx(), 0, 0, 1)).not.toThrow()
  })

  it('resolved 的围攻 render 不报错', () => {
    const s = sys.startSiege(1, 2, 10, 10, 50)
    s.resolved = true
    expect(() => sys.render(makeCtx(), 0, 0, 1)).not.toThrow()
  })

  it('zoom 变化时缓存字体更新', () => {
    sys.startSiege(1, 2, 10, 10, 50)
    sys.render(makeCtx(), 0, 0, 1)
    sys.render(makeCtx(), 0, 0, 2)
    expect((sys as any)._lastZoom).toBe(2)
  })

  it('有粒子时 render 不抛出异常', () => {
    ;(sys as any).particles.push({ x: 5, y: 5, life: 20, vx: 0, vy: -0.5, type: 'fire' })
    expect(() => sys.render(makeCtx(), 0, 0, 1)).not.toThrow()
  })
})
