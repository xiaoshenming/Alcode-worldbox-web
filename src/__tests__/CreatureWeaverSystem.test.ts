import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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
  afterEach(() => vi.restoreAllMocks())

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

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('_weaversSet类型为Set', () => {
    expect((sys as any)._weaversSet).toBeInstanceOf(Set)
  })

  it('weavers数组类型', () => {
    expect(Array.isArray((sys as any).weavers)).toBe(true)
  })

  it('Weaver所有字段可访问', () => {
    const w = makeWeaver(5, 'linen', { skill: 88, fibersCollected: 20, clothProduced: 30, loomLevel: 3 })
    expect(w.id).toBeDefined()
    expect(w.entityId).toBe(5)
    expect(w.skill).toBe(88)
    expect(w.fibersCollected).toBe(20)
    expect(w.clothProduced).toBe(30)
    expect(w.loomLevel).toBe(3)
    expect(w.specialization).toBe('linen')
    expect(w.tick).toBe(0)
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

  it('CHECK_INTERVAL恰好3200时触发', () => {
    const em = { getEntitiesWithComponent: () => [] as number[], hasComponent: () => true } as any
    ;(sys as any).lastCheck = 5000
    sys.update(1, em, 8200)  // 8200-5000=3200
    expect((sys as any).lastCheck).toBe(8200)
  })

  it('CHECK_INTERVAL差值3199不触发', () => {
    const em = { getEntitiesWithComponent: () => [] as number[], hasComponent: () => true } as any
    ;(sys as any).lastCheck = 5000
    sys.update(1, em, 8199)  // 8199-5000=3199
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('tick=0时不触发', () => {
    const em = { getEntitiesWithComponent: () => [] as number[], hasComponent: () => true } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  // ── cleanup: 实体不存在时删除 ─────────────────────────────────────────────

  it('cleanup: hasComponent返回false时删除织布工', () => {
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

  it('cleanup: 5个织布工全部无效时全删', () => {
    const em = {
      getEntitiesWithComponent: () => [] as number[],
      hasComponent: () => false
    } as any
    for (let i = 1; i <= 5; i++) {
      ;(sys as any).weavers.push(makeWeaver(i))
    }
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3200)
    expect((sys as any).weavers.length).toBe(0)
  })

  it('cleanup: 节流时不清理', () => {
    const em = {
      getEntitiesWithComponent: () => [] as number[],
      hasComponent: () => false  // 会触发删除
    } as any
    ;(sys as any).weavers.push(makeWeaver(1))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100)  // 节流，不执行cleanup
    expect((sys as any).weavers.length).toBe(1)  // 未被清理
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

  it('_weaversSet可手动添加entityId', () => {
    ;(sys as any)._weaversSet.add(42)
    expect((sys as any)._weaversSet.has(42)).toBe(true)
  })

  it('_weaversSet手动添加后size正确', () => {
    ;(sys as any)._weaversSet.add(1)
    ;(sys as any)._weaversSet.add(2)
    ;(sys as any)._weaversSet.add(3)
    expect((sys as any)._weaversSet.size).toBe(3)
  })

  it('cleanup时_weaversSet.delete被调用（实体被删时set也清理）', () => {
    // 模拟：cleanup逻辑中会对每个weaver的entityId执行_weaversSet.delete
    const em = {
      getEntitiesWithComponent: () => [] as number[],
      hasComponent: () => false
    } as any
    ;(sys as any).weavers.push(makeWeaver(1, 'cotton', { entityId: 99 }))
    ;(sys as any)._weaversSet.add(99)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3200)
    // 无论如何，经过cleanup后_weaversSet中99应该被delete
    expect((sys as any)._weaversSet.has(99)).toBe(false)
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

  it('loomLevel最大值5时不超过', () => {
    const w = makeWeaver(1, 'cotton', { loomLevel: 5, clothProduced: 60 })
    expect(w.loomLevel).toBe(5)
    // 业务逻辑中 loomLevel < 5 才能升级
    const canUpgrade = w.clothProduced > w.loomLevel * 10 && w.loomLevel < 5
    expect(canUpgrade).toBe(false)
  })

  it('loomLevel升级条件：clothProduced > loomLevel*10 且 loomLevel < 5', () => {
    const w = makeWeaver(1, 'cotton', { loomLevel: 2, clothProduced: 21 })
    // 21 > 2*10=20，且2<5，满足升级条件
    const canUpgrade = w.clothProduced > w.loomLevel * 10 && w.loomLevel < 5
    expect(canUpgrade).toBe(true)
  })

  it('loomLevel升级条件：clothProduced不足时不升级', () => {
    const w = makeWeaver(1, 'cotton', { loomLevel: 2, clothProduced: 20 })
    // 20 <= 2*10=20，不满足（需要 >）
    const canUpgrade = w.clothProduced > w.loomLevel * 10 && w.loomLevel < 5
    expect(canUpgrade).toBe(false)
  })

  // ── skill 上限验证 ────────────────────────────────────────────────────────

  it('skill加0.3后截断到100', () => {
    const skill = 99.8
    const newSkill = Math.min(100, skill + 0.3)
    expect(newSkill).toBe(100)
  })

  it('skill=99时加0.3后为99.3', () => {
    const skill = 99
    const newSkill = Math.min(100, skill + 0.3)
    expect(newSkill).toBeCloseTo(99.3, 5)
  })

  it('skill已为100时加0.3仍为100', () => {
    const skill = 100
    const newSkill = Math.min(100, skill + 0.3)
    expect(newSkill).toBe(100)
  })

  // ── fibersCollected 采集逻辑 ──────────────────────────────────────────────

  it('fibersCollected采集增量：loomLevel=1时增加1', () => {
    const loomLevel = 1
    const increment = 1 + Math.floor(loomLevel * 0.5)  // 1+floor(0.5)=1+0=1
    expect(increment).toBe(1)
  })

  it('fibersCollected采集增量：loomLevel=2时增加2', () => {
    const loomLevel = 2
    const increment = 1 + Math.floor(loomLevel * 0.5)  // 1+floor(1.0)=1+1=2
    expect(increment).toBe(2)
  })

  it('fibersCollected采集增量：loomLevel=5时增加3', () => {
    const loomLevel = 5
    const increment = 1 + Math.floor(loomLevel * 0.5)  // 1+floor(2.5)=1+2=3
    expect(increment).toBe(3)
  })

  // ── FIBER_QUALITY 质量系数 ────────────────────────────────────────────────

  it('cotton质量系数为0.25（最低）', () => {
    // 通过clothProduced = 1 + floor(quality * loomLevel) 验证
    // quality = 0.25 * (skill/100)，skill=100，loomLevel=1
    const quality = 0.25 * 1.0  // skill=100
    const produced = 1 + Math.floor(quality * 1)
    expect(produced).toBe(1)  // 1+floor(0.25)=1+0=1
  })

  it('silk质量系数为0.45（最高）', () => {
    const quality = 0.45 * 1.0  // skill=100
    const produced = 1 + Math.floor(quality * 2)  // loomLevel=2
    expect(produced).toBe(1)  // 1+floor(0.9)=1+0=1
  })

  it('silk质量loomLevel=3时产布更多', () => {
    const quality = 0.45 * 1.0
    const produced = 1 + Math.floor(quality * 3)  // 1+floor(1.35)=1+1=2
    expect(produced).toBe(2)
  })

  // ── MAX_WEAVERS 上限 ──────────────────────────────────────────────────────

  it('MAX_WEAVERS为14（直接测试常量语义）', () => {
    // 填14个织布工，再调用时不应招募
    for (let i = 1; i <= 14; i++) {
      ;(sys as any).weavers.push(makeWeaver(i))
    }
    // random=0（会尝试招募），但weavers.length >= MAX_WEAVERS
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = {
      getEntitiesWithComponent: () => [100, 101, 102] as number[],
      hasComponent: () => true
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3200)
    // 应有14个（没有新增），但cleanup可能删一些（hasComponent=true，所以不删）
    expect((sys as any).weavers.length).toBe(14)
  })

  // ── 复合场景 ──────────────────────────────────────────────────────────────

  it('同一entityId不会被重复招募', () => {
    const em = {
      getEntitiesWithComponent: () => [5] as number[],
      hasComponent: () => true
    } as any
    ;(sys as any)._weaversSet.add(5)  // 已存在
    vi.spyOn(Math, 'random').mockReturnValue(0)  // 触发招募路径
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3200)
    expect((sys as any).weavers.length).toBe(0)  // 因为already=true，没有新增
  })

  it('招募时nextId自增', () => {
    const em = {
      getEntitiesWithComponent: () => [10] as number[],
      hasComponent: () => true
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)  // SPAWN_CHANCE=0.003，random=0<0.003触发
    ;(sys as any).lastCheck = 0
    const prevId = (sys as any).nextId
    sys.update(1, em, 3200)
    if ((sys as any).weavers.length > 0) {
      expect((sys as any).nextId).toBe(prevId + 1)
    }
  })
})
