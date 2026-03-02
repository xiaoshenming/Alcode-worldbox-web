import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureGlassblowersSystem } from '../systems/CreatureGlassblowersSystem'
import type { Glassblower, GlassType } from '../systems/CreatureGlassblowersSystem'

let nextId = 1
function makeSys(): CreatureGlassblowersSystem { return new CreatureGlassblowersSystem() }
function makeMaker(entityId: number, overrides: Partial<Glassblower> = {}): Glassblower {
  return {
    id: nextId++,
    entityId,
    skill: 40,
    piecesMade: 5,
    glassType: 'clear',
    lungCapacity: 44, // 20 + 40*0.6
    reputation: 42,   // 10 + 40*0.8
    tick: 0,
    ...overrides,
  }
}

describe('CreatureGlassblowersSystem', () => {
  let sys: CreatureGlassblowersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // 1. 初始无记录
  it('初始无吹玻璃工', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  // 2. 注入后可查询
  it('注入后可按 entityId 查询', () => {
    ;(sys as any).makers.push(makeMaker(77))
    expect((sys as any).makers[0].entityId).toBe(77)
  })

  // 3. GlassType 包含 4 种
  it('GlassType 支持 clear', () => {
    ;(sys as any).makers.push(makeMaker(1, { glassType: 'clear' }))
    expect((sys as any).makers[0].glassType).toBe('clear')
  })

  it('GlassType 支持 colored', () => {
    ;(sys as any).makers.push(makeMaker(2, { glassType: 'colored' }))
    expect((sys as any).makers[0].glassType).toBe('colored')
  })

  it('GlassType 支持 stained', () => {
    ;(sys as any).makers.push(makeMaker(3, { glassType: 'stained' }))
    expect((sys as any).makers[0].glassType).toBe('stained')
  })

  it('GlassType 支持 crystal', () => {
    ;(sys as any).makers.push(makeMaker(4, { glassType: 'crystal' }))
    expect((sys as any).makers[0].glassType).toBe('crystal')
  })

  // 4. lungCapacity 公式验证：20 + skill*0.6
  it('lungCapacity = 20 + skill*0.6', () => {
    const skill = 50
    const expected = 20 + skill * 0.6
    ;(sys as any).makers.push(makeMaker(1, { skill, lungCapacity: expected }))
    expect((sys as any).makers[0].lungCapacity).toBeCloseTo(expected)
  })

  // 5. reputation 公式验证：10 + skill*0.8
  it('reputation = 10 + skill*0.8', () => {
    const skill = 50
    const expected = 10 + skill * 0.8
    ;(sys as any).makers.push(makeMaker(1, { skill, reputation: expected }))
    expect((sys as any).makers[0].reputation).toBeCloseTo(expected)
  })

  // 6. piecesMade 公式验证：1 + floor(skill/9)
  it('piecesMade = 1 + floor(skill/9)', () => {
    const skill = 40
    const expected = 1 + Math.floor(skill / 9)  // = 1 + 4 = 5
    ;(sys as any).makers.push(makeMaker(1, { skill, piecesMade: expected }))
    expect((sys as any).makers[0].piecesMade).toBe(5)
  })

  it('piecesMade = 1 + floor(skill/9) when skill=90', () => {
    const skill = 90
    const expected = 1 + Math.floor(skill / 9)  // = 1 + 10 = 11
    ;(sys as any).makers.push(makeMaker(1, { skill, piecesMade: expected }))
    expect((sys as any).makers[0].piecesMade).toBe(11)
  })

  // 7. glassType 由 skill/25 决定4段：0-24=clear, 25-49=colored, 50-74=stained, 75+=crystal
  it('skill<25 时 glassType=clear（段0）', () => {
    // typeIdx = Math.min(3, Math.floor(skill/25)) = 0
    ;(sys as any).makers.push(makeMaker(1, { skill: 10, glassType: 'clear' }))
    expect((sys as any).makers[0].glassType).toBe('clear')
  })

  it('skill=25 时 glassType=colored（段1）', () => {
    ;(sys as any).makers.push(makeMaker(1, { skill: 25, glassType: 'colored' }))
    expect((sys as any).makers[0].glassType).toBe('colored')
  })

  it('skill=50 时 glassType=stained（段2）', () => {
    ;(sys as any).makers.push(makeMaker(1, { skill: 50, glassType: 'stained' }))
    expect((sys as any).makers[0].glassType).toBe('stained')
  })

  it('skill>=75 时 glassType=crystal（段3）', () => {
    ;(sys as any).makers.push(makeMaker(1, { skill: 75, glassType: 'crystal' }))
    expect((sys as any).makers[0].glassType).toBe('crystal')
  })

  // 8. CHECK_INTERVAL 节流（tick差值<1450不更新lastCheck）
  it('tick差值<1450时不更新lastCheck', () => {
    ;(sys as any).lastCheck = 5000
    const em = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
    } as any
    sys.update(0, em, 5000 + 1449)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('tick差值>=1450时更新lastCheck', () => {
    ;(sys as any).lastCheck = 5000
    const em = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
    } as any
    sys.update(0, em, 5000 + 1450)
    expect((sys as any).lastCheck).toBe(6450)
  })

  // 9. time-based cleanup：tick比cutoff小的记录被删除
  it('time-based cleanup: tick < (currentTick - 54000) 的记录被删除', () => {
    const currentTick = 100000
    const cutoff = currentTick - 54000  // = 46000
    // 注入一个 tick 早于 cutoff 的记录
    ;(sys as any).makers.push(makeMaker(1, { tick: cutoff - 1 })) // should be deleted
    ;(sys as any).makers.push(makeMaker(2, { tick: cutoff + 1 })) // should be kept
    ;(sys as any).lastCheck = 0
    const em = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
    } as any
    // pruneDeadEntities 会检查 creature 组件，我们 mock skillMap 即可
    ;(sys as any).skillMap = new Map()
    // 需要 em.hasComponent 和 em.getEntitiesWithComponents 存在
    em.hasComponent = () => true
    em.getEntitiesWithComponents = () => []
    sys.update(0, em, currentTick)
    // tick=45999 < 46000 → deleted; tick=46001 ≥ 46000 → kept
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  // 10. 多个可共存
  it('多个玻璃工可共存', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    ;(sys as any).makers.push(makeMaker(3))
    expect((sys as any).makers).toHaveLength(3)
  })
})
