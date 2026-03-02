import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureWeaverSystem } from '../systems/CreatureWeaverSystem'
import type { Weaver, FiberType } from '../systems/CreatureWeaverSystem'

// CHECK_INTERVAL=3200, SPAWN_CHANCE=0.003, MAX_WEAVERS=14
// 织布时skill+0.3（上限100），loomLevel满足条件时升级
// cleanup: em.hasComponent(entityId, 'creature')为false时删除

let nextId = 1
function makeSys(): CreatureWeaverSystem { return new CreatureWeaverSystem() }
function makeWeaver(entityId: number, fiber: FiberType = 'cotton', overrides: Partial<Weaver> = {}): Weaver {
  return { id: nextId++, entityId, skill: 70, fibersCollected: 50, clothProduced: 12, loomLevel: 2, specialization: fiber, tick: 0, ...overrides }
}

describe('CreatureWeaverSystem', () => {
  let sys: CreatureWeaverSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ── 基础数据结构 ──────────────────────────────────────────────────────────

  it('初始无织布工', () => { expect((sys as any).weavers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).weavers.push(makeWeaver(1, 'silk'))
    expect((sys as any).weavers[0].specialization).toBe('silk')
  })
  it('返回只读引用', () => {
    ;(sys as any).weavers.push(makeWeaver(1))
    expect((sys as any).weavers).toBe((sys as any).weavers)
  })
  it('支持所有4种纤维类型', () => {
    const fibers: FiberType[] = ['cotton', 'silk', 'wool', 'linen']
    fibers.forEach((f, i) => { ;(sys as any).weavers.push(makeWeaver(i + 1, f)) })
    const all = (sys as any).weavers
    fibers.forEach((f, i) => { expect(all[i].specialization).toBe(f) })
  })
  it('字段正确', () => {
    ;(sys as any).weavers.push(makeWeaver(2, 'wool'))
    const w = (sys as any).weavers[0]
    expect(w.fibersCollected).toBe(50)
    expect(w.loomLevel).toBe(2)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────────────────

  it('tick差值<CHECK_INTERVAL(3200)时不更新lastCheck', () => {
    const em = { getEntitiesWithComponent: () => [] as number[], hasComponent: () => true } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3199)  // 3199 < 3200
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(3200)时更新lastCheck', () => {
    const em = { getEntitiesWithComponent: () => [] as number[], hasComponent: () => true } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3200)  // 3200 >= 3200
    expect((sys as any).lastCheck).toBe(3200)
  })

  it('节流时织布工数据不变', () => {
    const em = { getEntitiesWithComponent: () => [] as number[], hasComponent: () => true } as any
    ;(sys as any).weavers.push(makeWeaver(1, 'cotton', { skill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100)  // 100 < 3200，节流
    expect((sys as any).weavers[0].skill).toBe(50)
  })

  // ── cleanup: 实体不存在时删除 ─────────────────────────────────────────────

  it('cleanup: hasComponent返回false时删除织布工', () => {
    // getEntitiesWithComponent返回[]避免招募干扰
    const em = {
      getEntitiesWithComponent: () => [] as number[],
      hasComponent: (_id: number, _type: string) => false
    } as any
    ;(sys as any).weavers.push(makeWeaver(1, 'cotton', { skill: 70 }))
    ;(sys as any).weavers.push(makeWeaver(2, 'silk', { skill: 80 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3200)
    expect((sys as any).weavers.length).toBe(0)
  })

  it('cleanup: hasComponent返回true时保留织布工', () => {
    const em = {
      getEntitiesWithComponent: () => [] as number[],
      hasComponent: (_id: number, _type: string) => true
    } as any
    ;(sys as any).weavers.push(makeWeaver(1, 'cotton', { skill: 70 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3200)
    expect((sys as any).weavers.length).toBe(1)
  })

  it('cleanup: 部分实体不存在时只删对应织布工', () => {
    const em = {
      getEntitiesWithComponent: () => [] as number[],
      hasComponent: (id: number, _type: string) => id !== 1  // entityId=1的不存在
    } as any
    ;(sys as any).weavers.push(makeWeaver(1))  // entityId=1，删除
    ;(sys as any).weavers.push(makeWeaver(2))  // entityId=2，保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3200)
    expect((sys as any).weavers.length).toBe(1)
    expect((sys as any).weavers[0].entityId).toBe(2)
  })

  // ── _weaversSet 防重复招募 ────────────────────────────────────────────────

  it('初始_weaversSet为空', () => {
    expect((sys as any)._weaversSet.size).toBe(0)
  })

  it('手动注入weaver时_weaversSet未同步（仅update路径维护）', () => {
    ;(sys as any).weavers.push(makeWeaver(1))
    // 直接注入不走update，_weaversSet不自动同步
    expect((sys as any)._weaversSet.size).toBe(0)
  })

  // ── loomLevel 字段验证 ────────────────────────────────────────────────────

  it('多种loomLevel数据注入正确', () => {
    ;(sys as any).weavers.push(makeWeaver(1, 'cotton', { loomLevel: 1 }))
    ;(sys as any).weavers.push(makeWeaver(2, 'silk', { loomLevel: 5 }))
    expect((sys as any).weavers[0].loomLevel).toBe(1)
    expect((sys as any).weavers[1].loomLevel).toBe(5)
  })

  it('多个织布工同时存在', () => {
    for (let i = 1; i <= 5; i++) {
      ;(sys as any).weavers.push(makeWeaver(i))
    }
    expect((sys as any).weavers.length).toBe(5)
  })
})
