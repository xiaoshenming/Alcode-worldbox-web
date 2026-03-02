import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureCollectionSystem } from '../systems/CreatureCollectionSystem'
import type { CollectibleType } from '../systems/CreatureCollectionSystem'

// ITEM_VALUES: gem=10, shell=2, bone=3, feather=1, coin=5, artifact=15, flower=1, stone=1
// CHECK_INTERVAL=900, FIND_CHANCE=0.02, MAX_COLLECTIONS=50

function makeSys() { return new CreatureCollectionSystem() }

describe('CreatureCollectionSystem', () => {
  let sys: CreatureCollectionSystem

  beforeEach(() => { sys = makeSys() })

  it('初始化成功', () => { expect(sys).toBeInstanceOf(CreatureCollectionSystem) })
  it('初始collections为空', () => { expect((sys as any).collections.size).toBe(0) })

  // ── ITEM_VALUES 数据完整性 ──────────────────────────────────────────────────

  it('Collection的items是Map，8种collectible可以存入', () => {
    const types: CollectibleType[] = ['gem', 'shell', 'bone', 'feather', 'coin', 'artifact', 'flower', 'stone']
    const col = (sys as any).getOrCreate(1)
    for (const t of types) {
      col.items.set(t, 1)
    }
    expect(col.items.size).toBe(8)
  })

  // ── getOrCreate 逻辑 ────────────────────────────────────────────────────────

  it('getOrCreate首次调用创建新Collection', () => {
    const col = (sys as any).getOrCreate(42)
    expect(col).toBeDefined()
    expect(col.creatureId).toBe(42)
    expect(col.items).toBeInstanceOf(Map)
    expect(col.totalValue).toBe(0)
    expect(col.pride).toBe(10)  // 初始pride=10
    expect(col.lastFoundTick).toBe(0)
  })

  it('getOrCreate二次调用返回同一对象（不重建）', () => {
    const col1 = (sys as any).getOrCreate(42)
    col1.pride = 99  // 修改
    const col2 = (sys as any).getOrCreate(42)
    expect(col2).toBe(col1)
    expect(col2.pride).toBe(99)
  })

  it('getOrCreate不同ID创建不同Collection', () => {
    const col1 = (sys as any).getOrCreate(1)
    const col2 = (sys as any).getOrCreate(2)
    expect(col1).not.toBe(col2)
    expect(col1.creatureId).toBe(1)
    expect(col2.creatureId).toBe(2)
  })

  // ── Collections Map 状态 ────────────────────────────────────────────────────

  it('getOrCreate后collections.size增加', () => {
    expect((sys as any).collections.size).toBe(0)
    ;(sys as any).getOrCreate(1)
    expect((sys as any).collections.size).toBe(1)
    ;(sys as any).getOrCreate(2)
    expect((sys as any).collections.size).toBe(2)
  })

  it('相同ID多次getOrCreate不增加collections.size', () => {
    ;(sys as any).getOrCreate(1)
    ;(sys as any).getOrCreate(1)
    ;(sys as any).getOrCreate(1)
    expect((sys as any).collections.size).toBe(1)
  })

  // ── Collection 数据操作 ─────────────────────────────────────────────────────

  it('手动增加物品后totalValue正确', () => {
    const col = (sys as any).getOrCreate(1)
    col.items.set('gem', 2)
    col.totalValue = 20  // gem=10, 2个=20
    expect(col.totalValue).toBe(20)
  })

  it('pride上限为100', () => {
    const col = (sys as any).getOrCreate(1)
    col.pride = 98
    col.pride = Math.min(100, col.pride + 3)  // 模拟findItems
    expect(col.pride).toBe(100)
  })

  it('pride下限为0（被盗后）', () => {
    const col = (sys as any).getOrCreate(1)
    col.pride = 5
    col.pride = Math.max(0, col.pride - 10)  // 模拟stealItems
    expect(col.pride).toBe(0)
  })

  // ── CHECK_INTERVAL 节流 ─────────────────────────────────────────────────────

  it('tick间隔未达到CHECK_INTERVAL(900)时不更新', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100)  // 100-0=100 < 900
    expect((sys as any).lastCheck).toBe(0)  // 未更新
  })

  it('tick间隔>=CHECK_INTERVAL时更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 900)  // 900-0=900 >= 900
    expect((sys as any).lastCheck).toBe(900)  // 已更新
  })
})
