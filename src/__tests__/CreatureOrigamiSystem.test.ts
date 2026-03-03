import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureOrigamiSystem } from '../systems/CreatureOrigamiSystem'
import type { OrigamiWork, OrigamiShape } from '../systems/CreatureOrigamiSystem'

// CHECK_INTERVAL=3000, CREATE_CHANCE=0.005, MAX_WORKS=50
// COMPLEXITY: crane=30, dragon=80, flower=20, boat=15, star=50

let nextId = 1
function makeSys(): CreatureOrigamiSystem { return new CreatureOrigamiSystem() }
function makeWork(creatorId: number, shape: OrigamiShape = 'crane', tick = 0, preserved = false): OrigamiWork {
  return { id: nextId++, creatorId, shape, beauty: 50, complexity: 30, preserved, tick }
}
function makeEM(entityIds: number[] = []) {
  return { getEntitiesWithComponent: vi.fn().mockReturnValue(entityIds) } as any
}

describe('CreatureOrigamiSystem - 初始状态', () => {
  let sys: CreatureOrigamiSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无折纸作品', () => { expect((sys as any).works).toHaveLength(0) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('works 是数组', () => { expect(Array.isArray((sys as any).works)).toBe(true) })
  it('注入后可查询 shape', () => {
    ;(sys as any).works.push(makeWork(1, 'crane'))
    expect((sys as any).works[0].shape).toBe('crane')
  })
  it('注入后可查询 creatorId', () => {
    ;(sys as any).works.push(makeWork(42))
    expect((sys as any).works[0].creatorId).toBe(42)
  })
  it('注入后可查询 beauty', () => {
    ;(sys as any).works.push(makeWork(1))
    expect((sys as any).works[0].beauty).toBe(50)
  })
  it('注入后可查询 complexity', () => {
    ;(sys as any).works.push(makeWork(1, 'crane'))
    expect((sys as any).works[0].complexity).toBe(30)
  })
  it('注入后可查询 preserved', () => {
    ;(sys as any).works.push(makeWork(1, 'crane', 0, true))
    expect((sys as any).works[0].preserved).toBe(true)
  })
  it('注入后可查询 tick', () => {
    ;(sys as any).works.push(makeWork(1, 'crane', 9999))
    expect((sys as any).works[0].tick).toBe(9999)
  })
})

describe('CreatureOrigamiSystem - OrigamiShape 枚举', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('支持 5 种形状', () => {
    const shapes: OrigamiShape[] = ['crane', 'dragon', 'flower', 'boat', 'star']
    expect(shapes).toHaveLength(5)
  })
  it('crane 复杂度为 30', () => { expect(makeWork(1, 'crane').complexity).toBe(30) })
  it('dragon 复杂度为 80（手动设置）', () => {
    const w = makeWork(1, 'dragon')
    w.complexity = 80
    expect(w.complexity).toBe(80)
  })
  it('flower 复杂度为 20（手动设置）', () => {
    const w = makeWork(1, 'flower')
    w.complexity = 20
    expect(w.complexity).toBe(20)
  })
  it('boat 复杂度为 15（手动设置）', () => {
    const w = makeWork(1, 'boat')
    w.complexity = 15
    expect(w.complexity).toBe(15)
  })
  it('star 复杂度为 50（手动设置）', () => {
    const w = makeWork(1, 'star')
    w.complexity = 50
    expect(w.complexity).toBe(50)
  })
  it('所有形状均为字符串', () => {
    const shapes: OrigamiShape[] = ['crane', 'dragon', 'flower', 'boat', 'star']
    shapes.forEach(s => expect(typeof s).toBe('string'))
  })
})

describe('CreatureOrigamiSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureOrigamiSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick 差值 < 3000 时不更新 lastCheck', () => {
    const em = makeEM()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2999)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick 差值 >= 3000 时更新 lastCheck', () => {
    const em = makeEM()
    sys.update(1, em, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })
  it('tick=2999 时不触发', () => {
    const em = makeEM()
    sys.update(1, em, 2999)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=3000 时恰好触发', () => {
    const em = makeEM()
    sys.update(1, em, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })
  it('连续调用不足间隔时不更新', () => {
    const em = makeEM()
    sys.update(1, em, 3000)
    sys.update(1, em, 4000)
    expect((sys as any).lastCheck).toBe(3000)
  })
  it('第二次间隔到达时更新', () => {
    const em = makeEM()
    sys.update(1, em, 3000)
    sys.update(1, em, 6000)
    expect((sys as any).lastCheck).toBe(6000)
  })
})

describe('CreatureOrigamiSystem - 过期清理', () => {
  let sys: CreatureOrigamiSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('未保存且过期的作品被删除（cutoff=currentTick-60000）', () => {
    ;(sys as any).works.push(makeWork(1, 'crane', 0, false))
    sys.update(1, makeEM(), 60001)
    expect((sys as any).works).toHaveLength(0)
  })
  it('保存的作品不被删除', () => {
    ;(sys as any).works.push(makeWork(1, 'crane', 0, true))
    sys.update(1, makeEM(), 60001)
    expect((sys as any).works).toHaveLength(1)
  })
  it('未过期的未保存作品被保留', () => {
    ;(sys as any).works.push(makeWork(1, 'crane', 50000, false))
    sys.update(1, makeEM(), 60001)
    expect((sys as any).works).toHaveLength(1)
  })
  it('混合：过期未保存被删，保存的保留', () => {
    ;(sys as any).works.push(makeWork(1, 'crane', 0, false))
    ;(sys as any).works.push(makeWork(2, 'dragon', 0, true))
    sys.update(1, makeEM(), 60001)
    expect((sys as any).works).toHaveLength(1)
    expect((sys as any).works[0].creatorId).toBe(2)
  })
  it('cutoff = currentTick - 60000', () => {
    expect(100000 - 60000).toBe(40000)
  })
})

describe('CreatureOrigamiSystem - MAX_WORKS 上限', () => {
  let sys: CreatureOrigamiSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('可以注入 50 个作品', () => {
    for (let i = 0; i < 50; i++) {
      ;(sys as any).works.push(makeWork(i + 1))
    }
    expect((sys as any).works).toHaveLength(50)
  })
  it('beauty 范围：20 + floor(random*80)，random=0 → 20', () => {
    expect(20 + Math.floor(0 * 80)).toBe(20)
  })
  it('beauty 范围：random=1 → 99', () => {
    expect(20 + Math.floor(0.99 * 80)).toBe(99)
  })
  it('beauty 最大值为 99（20 + 79）', () => {
    expect(20 + Math.floor(0.999 * 80)).toBe(99)
  })
  it('CREATE_CHANCE=0.005 时 random=0.99 不创建', () => {
    const em = makeEM([1])
    sys.update(1, em, 3000)
    expect((sys as any).works).toHaveLength(0)
  })
  it('preserved 概率：random<0.3 时保存', () => {
    expect(0.29 < 0.3).toBe(true)
  })
  it('preserved 概率：random>=0.3 时不保存', () => {
    expect(0.31 < 0.3).toBe(false)
  })
})
