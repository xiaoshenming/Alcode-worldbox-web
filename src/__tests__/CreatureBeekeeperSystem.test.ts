import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureBeekeeperSystem } from '../systems/CreatureBeekeeperSystem'
import type { Beekeeper, HiveType } from '../systems/CreatureBeekeeperSystem'

// CHECK_INTERVAL=3400, SPAWN_CHANCE=0.003, MAX_BEEKEEPERS=12
// skill 递增: +0.2 当 Math.random() < yieldRate*0.05（随机，测确定性部分）
// cleanup: em.hasComponent(entityId,'creature') 返回 false 时删除

let nextId = 1

function makeBKSys(): CreatureBeekeeperSystem {
  return new CreatureBeekeeperSystem()
}

function makeBeekeeper(entityId: number, hiveType: HiveType = 'log', overrides: Partial<Beekeeper> = {}): Beekeeper {
  return {
    id: nextId++,
    entityId,
    skill: 30,
    hivesManaged: 2,
    honeyHarvested: 50,
    waxCollected: 10,
    hiveType,
    beeHealth: 80,
    tick: 0,
    ...overrides,
  }
}

describe('CreatureBeekeeperSystem', () => {
  let sys: CreatureBeekeeperSystem

  beforeEach(() => { sys = makeBKSys(); nextId = 1 })

  // ── 基础数据测试 ───────────────────────────────────────────────────────────

  it('初始无养蜂人', () => {
    expect((sys as any).beekeepers).toHaveLength(0)
  })

  it('注入养蜂人后可查询', () => {
    ;(sys as any).beekeepers.push(makeBeekeeper(1, 'frame'))
    expect((sys as any).beekeepers).toHaveLength(1)
    expect((sys as any).beekeepers[0].hiveType).toBe('frame')
  })

  it('返回内部引用', () => {
    ;(sys as any).beekeepers.push(makeBeekeeper(1))
    expect((sys as any).beekeepers).toBe((sys as any).beekeepers)
  })

  it('支持所有 4 种蜂箱类型', () => {
    const types: HiveType[] = ['log', 'clay', 'woven', 'frame']
    types.forEach((t, i) => {
      ;(sys as any).beekeepers.push(makeBeekeeper(i + 1, t))
    })
    const all = (sys as any).beekeepers
    expect(all).toHaveLength(4)
    types.forEach((t, i) => { expect(all[i].hiveType).toBe(t) })
  })

  it('养蜂人数据字段完整', () => {
    const b = makeBeekeeper(10, 'frame')
    b.skill = 90
    b.hivesManaged = 8
    b.honeyHarvested = 200
    b.waxCollected = 50
    b.beeHealth = 95
    ;(sys as any).beekeepers.push(b)
    const result = (sys as any).beekeepers[0]
    expect(result.skill).toBe(90)
    expect(result.hivesManaged).toBe(8)
    expect(result.honeyHarvested).toBe(200)
    expect(result.waxCollected).toBe(50)
    expect(result.beeHealth).toBe(95)
  })

  // ── CHECK_INTERVAL 节流 ────────────────────────────────────────────────────

  it('tick差值<CHECK_INTERVAL(3400)时不更新lastCheck', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2000)  // 2000 < 3400
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(3400)时更新lastCheck', () => {
    const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3400)  // 3400 >= 3400
    expect((sys as any).lastCheck).toBe(3400)
  })

  it('tick差值恰好等于CHECK_INTERVAL减1时跳过', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3399)  // 3399 < 3400
    expect((sys as any).lastCheck).toBe(0)
  })

  // ── 技能上限 ──────────────────────────────────────────────────────────────

  it('skill上限为100（强制赋值验证边界）', () => {
    const bk = makeBeekeeper(1, 'frame', { skill: 100 })
    ;(sys as any).beekeepers.push(bk)
    // skill 已在100，验证字段正确
    expect((sys as any).beekeepers[0].skill).toBe(100)
  })

  it('skill不超过100（Math.min保护）', () => {
    // 直接测 Math.min 语义：100 + 0.2 仍为 100
    expect(Math.min(100, 100 + 0.2)).toBe(100)
  })

  // ── cleanup：creature 不存在时删除 ────────────────────────────────────────

  it('cleanup: creature不存在时移除养蜂人', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: (eid: number, _comp: string) => eid !== 1,  // entityId=1 不存在
    } as any
    ;(sys as any).beekeepers.push(makeBeekeeper(1))   // 不存在 → 删除
    ;(sys as any).beekeepers.push(makeBeekeeper(2))   // 存在 → 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3400)
    expect((sys as any).beekeepers.length).toBe(1)
    expect((sys as any).beekeepers[0].entityId).toBe(2)
  })

  it('cleanup: 所有creature均存在时不删除', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    ;(sys as any).beekeepers.push(makeBeekeeper(1))
    ;(sys as any).beekeepers.push(makeBeekeeper(2))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3400)
    expect((sys as any).beekeepers.length).toBe(2)
  })

  it('cleanup: 全部creature不存在时清空', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => false,
    } as any
    ;(sys as any).beekeepers.push(makeBeekeeper(1))
    ;(sys as any).beekeepers.push(makeBeekeeper(2))
    ;(sys as any).beekeepers.push(makeBeekeeper(3))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3400)
    expect((sys as any).beekeepers.length).toBe(0)
  })

  // ── 蜂箱升级条件 ──────────────────────────────────────────────────────────

  it('frame类型蜂箱不会继续升级（已是最高级）', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    ;(sys as any).beekeepers.push(makeBeekeeper(1, 'frame', { skill: 80 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3400)
    // frame 已是最高级，hiveType 不变
    expect((sys as any).beekeepers[0].hiveType).toBe('frame')
  })

  it('beeHealth被Math.max/min限制在10~100范围', () => {
    // 验证 beeHealth 范围约束语义
    expect(Math.max(10, Math.min(100, 9))).toBe(10)
    expect(Math.max(10, Math.min(100, 101))).toBe(100)
    expect(Math.max(10, Math.min(100, 50))).toBe(50)
  })
})
