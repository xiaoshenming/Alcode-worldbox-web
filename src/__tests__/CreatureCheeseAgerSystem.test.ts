import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureCheeseAgerSystem } from '../systems/CreatureCheeseAgerSystem'
import type { CheeseAgerData, CheeseVariety } from '../systems/CreatureCheeseAgerSystem'

function makeSys(): CreatureCheeseAgerSystem { return new CreatureCheeseAgerSystem() }
function makeAger(entityId: number, variety: CheeseVariety = 'cheddar', skill = 50, bestAge = 0, tick = 0): CheeseAgerData {
  return { entityId, cheesesAging: 3, bestAge, variety, skill, active: true, tick }
}

/** hasComponent 返回 true，防止 ager 被当作"死亡实体"删除 */
function makePersistEM() {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    getEntitiesWithComponent: vi.fn().mockReturnValue([]),
    getComponent: vi.fn().mockReturnValue(null),
    hasComponent: vi.fn().mockReturnValue(true),
  } as any
}

function makeEmptyEM() {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    getEntitiesWithComponent: vi.fn().mockReturnValue([]),
    getComponent: vi.fn().mockReturnValue(null),
    hasComponent: vi.fn().mockReturnValue(false),
  } as any
}

describe('CreatureCheeseAgerSystem - 基础状态', () => {
  let sys: CreatureCheeseAgerSystem
  beforeEach(() => { sys = makeSys() })

  it('初始无奶酪熟成师记录', () => {
    expect((sys as any).agers).toHaveLength(0)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('注入后可查询 variety', () => {
    ;(sys as any).agers.push(makeAger(1, 'brie'))
    expect((sys as any).agers[0].variety).toBe('brie')
  })

  it('支持所有 4 种奶酪品种', () => {
    const varieties: CheeseVariety[] = ['cheddar', 'brie', 'gouda', 'blue']
    varieties.forEach((v, i) => { ;(sys as any).agers.push(makeAger(i + 1, v)) })
    const all = (sys as any).agers
    varieties.forEach((v, i) => { expect(all[i].variety).toBe(v) })
  })

  it('active 字段默认为 true', () => {
    ;(sys as any).agers.push(makeAger(1))
    expect((sys as any).agers[0].active).toBe(true)
  })

  it('active=false 可以被注入', () => {
    ;(sys as any).agers.push({ ...makeAger(1), active: false })
    expect((sys as any).agers[0].active).toBe(false)
  })
})

describe('CreatureCheeseAgerSystem - CHECK_INTERVAL 与 update', () => {
  let sys: CreatureCheeseAgerSystem
  beforeEach(() => { sys = makeSys() })

  it('tick 差值 < 3200 时，update 直接返回，lastCheck 不变', () => {
    const em = makePersistEM()
    ;(sys as any).lastCheck = 1000
    sys.update(1, em, 4199)
    expect((sys as any).lastCheck).toBe(1000)
    expect(em.getEntitiesWithComponent).not.toHaveBeenCalled()
  })

  it('tick 差值 >= 3200 时，lastCheck 更新为当前 tick', () => {
    const em = makePersistEM()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3200)
    expect((sys as any).lastCheck).toBe(3200)
  })

  it('tick 差值 = 3199 时不更新（边界值）', () => {
    const em = makePersistEM()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3199)
    expect((sys as any).lastCheck).toBe(0)
  })
})

describe('CreatureCheeseAgerSystem - 老化逻辑', () => {
  let sys: CreatureCheeseAgerSystem
  beforeEach(() => { sys = makeSys() })

  it('active=false 的记录，skill 不增加', () => {
    const em = makePersistEM()
    const ager = { ...makeAger(1, 'cheddar', 50, 0, 0), active: false }
    ;(sys as any).agers.push(ager)
    const skillBefore = (sys as any).agers[0].skill
    sys.update(1, em, 5000)
    expect((sys as any).agers[0].skill).toBe(skillBefore)
  })

  it('cheddar (rate=1.0)：elapsed=5000 → currentAge=5 > bestAge=0 → bestAge 更新为 5', () => {
    const em = makePersistEM()
    ;(sys as any).agers.push(makeAger(1, 'cheddar', 50, 0, 0))
    // tick=5000 时，elapsed=5000-0=5000，currentAge=5000*1.0*0.001=5
    sys.update(1, em, 5000)
    expect((sys as any).agers[0].bestAge).toBeCloseTo(5, 5)
  })

  it('cheddar：bestAge 更新后 skill += 0.1', () => {
    const em = makePersistEM()
    ;(sys as any).agers.push(makeAger(1, 'cheddar', 50, 0, 0))
    sys.update(1, em, 5000)
    // skill 应增加 0.1
    expect((sys as any).agers[0].skill).toBeCloseTo(50.1, 5)
  })

  it('brie (rate=1.5)：elapsed=5000 → currentAge=7.5 > cheddar的5，老化更快', () => {
    const em = makePersistEM()
    ;(sys as any).agers.push(makeAger(1, 'brie', 50, 0, 0))
    sys.update(1, em, 5000)
    // currentAge = 5000 * 1.5 * 0.001 = 7.5
    expect((sys as any).agers[0].bestAge).toBeCloseTo(7.5, 5)
  })

  it('gouda (rate=0.8)：elapsed=5000 → currentAge=4.0，比 cheddar 慢', () => {
    const em = makePersistEM()
    ;(sys as any).agers.push(makeAger(1, 'gouda', 50, 0, 0))
    sys.update(1, em, 5000)
    // currentAge = 5000 * 0.8 * 0.001 = 4.0
    expect((sys as any).agers[0].bestAge).toBeCloseTo(4.0, 5)
  })

  it('brie 老化速度 > cheddar > gouda（相同 elapsed）', () => {
    const em = makePersistEM()
    ;(sys as any).agers.push(makeAger(1, 'brie',   50, 0, 0))
    ;(sys as any).agers.push(makeAger(2, 'cheddar', 50, 0, 0))
    ;(sys as any).agers.push(makeAger(3, 'gouda',  50, 0, 0))
    ;(sys as any)._agersSet = new Set() // 重置 set
    sys.update(1, em, 5000)
    const [brie, cheddar, gouda] = (sys as any).agers
    expect(brie.bestAge).toBeGreaterThan(cheddar.bestAge)
    expect(cheddar.bestAge).toBeGreaterThan(gouda.bestAge)
  })

  it('currentAge <= bestAge 时，skill 不增加', () => {
    const em = makePersistEM()
    // bestAge=10 已经很高，elapsed=5000, cheddar rate=1.0 → currentAge=5 < 10
    ;(sys as any).agers.push(makeAger(1, 'cheddar', 50, 10, 0))
    sys.update(1, em, 5000)
    expect((sys as any).agers[0].skill).toBe(50) // 不变
    expect((sys as any).agers[0].bestAge).toBe(10) // 不变
  })

  it('死亡实体（hasComponent=false）的 ager 被删除', () => {
    const em = makeEmptyEM() // hasComponent returns false
    ;(sys as any).agers.push(makeAger(1, 'cheddar', 50, 0, 0))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 5000)
    expect((sys as any).agers).toHaveLength(0)
  })
})
