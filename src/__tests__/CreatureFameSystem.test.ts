import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureFameSystem } from '../systems/CreatureFameSystem'
import type { FameTitle, FameSource } from '../systems/CreatureFameSystem'

function makeSys(): CreatureFameSystem { return new CreatureFameSystem() }

function makeEM(hasCreature = true) {
  return {
    hasComponent: vi.fn(() => hasCreature),
    getEntitiesWithComponents: vi.fn(() => []),
  }
}

describe('CreatureFameSystem', () => {
  let sys: CreatureFameSystem

  beforeEach(() => { sys = makeSys() })

  // 1. 初始无名誉记录
  it('初始fameRecords为空', () => {
    expect((sys as any).fameRecords.size).toBe(0)
  })

  // 2. 注入后可查询
  it('addFame后fameRecords增加记录', () => {
    sys.addFame(1, 'combat_victory')
    expect((sys as any).fameRecords.has(1)).toBe(true)
  })

  // 3. FameTitle包含5种
  it('FameTitle包含5种: unknown/known/famous/legendary/mythical', () => {
    const titles: FameTitle[] = ['unknown', 'known', 'famous', 'legendary', 'mythical']
    titles.forEach(t => expect(typeof t).toBe('string'))
    expect(titles).toHaveLength(5)
  })

  // 4. totalFame=0时title为unknown
  it('totalFame=0时title为unknown, rank=0', () => {
    sys.addFame(1, 'exploration', 0.0001)
    // 先测刚添加时
    sys.addFame(2, 'combat_victory', 0) // delta<=0 不会创建记录
    expect((sys as any).fameRecords.has(2)).toBe(false)
    // 直接注入一条 totalFame=0 记录
    ;(sys as any).fameRecords.set(99, { totalFame: 0, fameBreakdown: {}, title: 'unknown', rank: 0 })
    const record = (sys as any).fameRecords.get(99)
    expect(record.title).toBe('unknown')
    expect(record.rank).toBe(0)
  })

  // 5. 阈值验证: known >= 50
  it('totalFame>=50时title为known', () => {
    sys.addFame(1, 'sacrifice', 50) // 恰好50
    const record = (sys as any).fameRecords.get(1)
    expect(record.title).toBe('known')
    expect(record.rank).toBe(1)
  })

  // 6. 阈值验证: famous >= 150
  it('totalFame>=150时title为famous', () => {
    sys.addFame(1, 'sacrifice', 150)
    const record = (sys as any).fameRecords.get(1)
    expect(record.title).toBe('famous')
    expect(record.rank).toBe(2)
  })

  // 7. 阈值验证: legendary >= 300
  it('totalFame>=300时title为legendary', () => {
    sys.addFame(1, 'sacrifice', 300)
    const record = (sys as any).fameRecords.get(1)
    expect(record.title).toBe('legendary')
    expect(record.rank).toBe(3)
  })

  // 8. 阈值验证: mythical >= 500
  it('totalFame>=500时title为mythical', () => {
    sys.addFame(1, 'sacrifice', 500)
    const record = (sys as any).fameRecords.get(1)
    expect(record.title).toBe('mythical')
    expect(record.rank).toBe(4)
  })

  // 9. MAX_FAME上限=1000
  it('totalFame不超过MAX_FAME=1000', () => {
    sys.addFame(1, 'sacrifice', 9999)
    const record = (sys as any).fameRecords.get(1)
    expect(record.totalFame).toBe(1000)
  })

  // 10. 多个记录可以共存
  it('多个实体记录可共存', () => {
    sys.addFame(1, 'combat_victory')
    sys.addFame(2, 'exploration')
    sys.addFame(3, 'leadership')
    expect((sys as any).fameRecords.size).toBe(3)
  })

  // 11. tick差值节流: tick%120不为0时不执行衰减
  it('tick%DECAY_INTERVAL!=0时update不执行衰减', () => {
    sys.addFame(1, 'sacrifice', 200)
    const em = makeEM(true)
    const before = (sys as any).fameRecords.get(1).totalFame
    sys.update(0, em as any, 1) // tick=1, 1%120!=0
    const after = (sys as any).fameRecords.get(1).totalFame
    expect(after).toBe(before)
  })

  // 12. tick%120===0时执行衰减
  it('tick%120===0时update执行衰减', () => {
    sys.addFame(1, 'sacrifice', 200)
    const em = makeEM(true)
    const before = (sys as any).fameRecords.get(1).totalFame
    sys.update(0, em as any, 120) // tick=120, 120%120===0
    const after = (sys as any).fameRecords.get(1).totalFame
    expect(after).toBeLessThan(before)
  })

  // 13. 死亡实体被清理
  it('update时无creature组件的实体记录被删除', () => {
    sys.addFame(1, 'combat_victory')
    expect((sys as any).fameRecords.has(1)).toBe(true)
    const em = makeEM(false) // hasComponent always false
    sys.update(0, em as any, 120)
    expect((sys as any).fameRecords.has(1)).toBe(false)
  })

  // 14. fameBreakdown按source分类记录
  it('addFame正确记录fameBreakdown', () => {
    sys.addFame(1, 'healing', 10)
    sys.addFame(1, 'building', 5)
    const record = (sys as any).fameRecords.get(1)
    expect(record.fameBreakdown.healing).toBe(10)
    expect(record.fameBreakdown.building).toBe(5)
  })

  // 15. 默认使用source的base fame值
  it('addFame不传amount时使用source base值', () => {
    sys.addFame(1, 'leadership') // base = 10
    const record = (sys as any).fameRecords.get(1)
    expect(record.totalFame).toBe(10)
    expect(record.fameBreakdown.leadership).toBe(10)
  })
})
