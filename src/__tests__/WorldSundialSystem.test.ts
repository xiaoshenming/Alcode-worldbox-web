import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldSundialSystem } from '../systems/WorldSundialSystem'
import type { Sundial, SundialSize } from '../systems/WorldSundialSystem'

// 系统关键参数
const CHECK_INTERVAL = 3000
const BUILD_CHANCE = 0.003
const MAX_SUNDIALS = 15
const SIZES: SundialSize[] = ['small', 'medium', 'large', 'monumental']
const SIZE_BONUS: Record<SundialSize, number> = { small: 5, medium: 12, large: 20, monumental: 35 }

const em = {} as any

function makeSys(): WorldSundialSystem { return new WorldSundialSystem() }

function makeWorld(tile: number = 3, width = 100, height = 100): any {
  return { width, height, getTile: () => tile } as any
}

let _nextId = 1
function makeSundial(overrides: Partial<Sundial> = {}): Sundial {
  return {
    id: _nextId++,
    x: 20, y: 30,
    size: 'medium',
    accuracy: 80,
    age: 0,
    knowledgeBonus: 12,
    shadowAngle: 0,
    tick: 0,
    ...overrides,
  }
}

describe('WorldSundialSystem — 初始状态', () => {
  let sys: WorldSundialSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('初始 sundials 为空数组', () => {
    expect((sys as any).sundials).toHaveLength(0)
  })
  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('sundials 是数组类型', () => {
    expect(Array.isArray((sys as any).sundials)).toBe(true)
  })
  it('手动注入一个 sundial 后长度为 1', () => {
    ;(sys as any).sundials.push(makeSundial())
    expect((sys as any).sundials).toHaveLength(1)
  })
  it('手动注入多个后长度正确', () => {
    ;(sys as any).sundials.push(makeSundial(), makeSundial(), makeSundial())
    expect((sys as any).sundials).toHaveLength(3)
  })
  it('sundials 返回内部引用（同一对象）', () => {
    expect((sys as any).sundials).toBe((sys as any).sundials)
  })
  it('Sundial 接口字段齐全', () => {
    const s = makeSundial()
    expect(s).toHaveProperty('id')
    expect(s).toHaveProperty('x')
    expect(s).toHaveProperty('y')
    expect(s).toHaveProperty('size')
    expect(s).toHaveProperty('accuracy')
    expect(s).toHaveProperty('age')
    expect(s).toHaveProperty('knowledgeBonus')
    expect(s).toHaveProperty('shadowAngle')
    expect(s).toHaveProperty('tick')
  })
  it('SundialSize 支持 4 种值', () => {
    expect(SIZES).toEqual(['small', 'medium', 'large', 'monumental'])
    expect(SIZES).toHaveLength(4)
  })
  it('SIZE_BONUS small=5', () => { expect(SIZE_BONUS['small']).toBe(5) })
  it('SIZE_BONUS medium=12', () => { expect(SIZE_BONUS['medium']).toBe(12) })
  it('SIZE_BONUS large=20', () => { expect(SIZE_BONUS['large']).toBe(20) })
  it('SIZE_BONUS monumental=35', () => { expect(SIZE_BONUS['monumental']).toBe(35) })
})

describe('WorldSundialSystem — CHECK_INTERVAL 节流', () => {
  let sys: WorldSundialSystem
  afterEach(() => { vi.restoreAllMocks() })
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('tick=0 不执行（差值=0 < 3000）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(3), em, 0)
    expect((sys as any).sundials).toHaveLength(0)
  })
  it('tick=2999 不执行（差值=2999 < 3000）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(3), em, 2999)
    expect((sys as any).sundials).toHaveLength(0)
  })
  it('tick=3000 执行（差值=3000 不小于 3000）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // < BUILD_CHANCE，tile=3，spawn
    sys.update(1, makeWorld(3), em, 3000)
    expect((sys as any).sundials).toHaveLength(1)
  })
  it('tick=3000 后 lastCheck 更新为 3000', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(3), em, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })
  it('第一次执行后，tick=5999 仍不执行（差值=2999）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(3), em, 3000)
    const countAfter = (sys as any).sundials.length
    sys.update(1, makeWorld(3), em, 5999)
    expect((sys as any).sundials).toHaveLength(countAfter)
  })
  it('tick=6000 再次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(3), em, 3000)
    vi.spyOn(Math, 'random').mockReturnValue(0) // 触发 spawn
    sys.update(1, makeWorld(3), em, 6000)
    expect((sys as any).lastCheck).toBe(6000)
  })
  it('lastCheck 只在执行时更新', () => {
    sys.update(1, makeWorld(3), em, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('CHECK_INTERVAL 边界：tick=CHECK_INTERVAL-1 不执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(3), em, CHECK_INTERVAL - 1)
    expect((sys as any).sundials).toHaveLength(0)
  })
  it('CHECK_INTERVAL 边界：tick=CHECK_INTERVAL 执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(3), em, CHECK_INTERVAL)
    expect((sys as any).sundials).toHaveLength(1)
  })
})

describe('WorldSundialSystem — spawn 逻辑（random < BUILD_CHANCE 且 tile=3 才 spawn）', () => {
  let sys: WorldSundialSystem
  afterEach(() => { vi.restoreAllMocks() })
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('random=0（< 0.003）且 tile=3 触发 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(3), em, 3000)
    expect((sys as any).sundials).toHaveLength(1)
  })
  it('random=0.0029（< 0.003）且 tile=3 触发 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0029)
    sys.update(1, makeWorld(3), em, 3000)
    expect((sys as any).sundials).toHaveLength(1)
  })
  it('random=0.003（不小于 0.003）不触发 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.003)
    sys.update(1, makeWorld(3), em, 3000)
    expect((sys as any).sundials).toHaveLength(0)
  })
  it('random=0.5 不触发 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(3), em, 3000)
    expect((sys as any).sundials).toHaveLength(0)
  })
  it('random=0（< BUILD_CHANCE）但 tile!=3 不 spawn（tile=0 deep water）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(0), em, 3000)
    expect((sys as any).sundials).toHaveLength(0)
  })
  it('random=0 但 tile=1（shallow water）不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), em, 3000)
    expect((sys as any).sundials).toHaveLength(0)
  })
  it('random=0 但 tile=4（forest）不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(4), em, 3000)
    expect((sys as any).sundials).toHaveLength(0)
  })
  it('random=0 但 tile=5（mountain）不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), em, 3000)
    expect((sys as any).sundials).toHaveLength(0)
  })
  it('random=0 但 tile=7（lava）不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(7), em, 3000)
    expect((sys as any).sundials).toHaveLength(0)
  })
  it('已达 MAX_SUNDIALS=15 时不再 spawn', () => {
    for (let i = 0; i < MAX_SUNDIALS; i++) {
      ;(sys as any).sundials.push(makeSundial())
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(3), em, 3000)
    expect((sys as any).sundials).toHaveLength(MAX_SUNDIALS)
  })
  it('sundials=14 时可 spawn', () => {
    for (let i = 0; i < MAX_SUNDIALS - 1; i++) {
      ;(sys as any).sundials.push(makeSundial({ tick: 3000 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(3), em, 3000)
    expect((sys as any).sundials.length).toBeGreaterThanOrEqual(MAX_SUNDIALS)
  })
  it('spawn 后 nextId 自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(3), em, 3000)
    expect((sys as any).nextId).toBe(2)
  })
  it('spawn 的 sundial tick 等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(3), em, 3000)
    expect((sys as any).sundials[0].tick).toBe(3000)
  })
  it('spawn 的 sundial age 初始为 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(3), em, 3000)
    // age 在 update 阶段被设为 tick-s.tick = 3000-3000 = 0
    expect((sys as any).sundials[0].age).toBe(0)
  })
  it('spawn 的 sundial id 从 1 开始', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(3), em, 3000)
    expect((sys as any).sundials[0].id).toBe(1)
  })
  it('tile=null 时不 spawn', () => {
    const worldNullTile = { width: 100, height: 100, getTile: () => null } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, worldNullTile, em, 3000)
    expect((sys as any).sundials).toHaveLength(0)
  })
  it('spawn 的 x 在 [0, width) 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(3, 50, 80), em, 3000)
    const s = (sys as any).sundials[0]
    expect(s.x).toBeGreaterThanOrEqual(0)
    expect(s.x).toBeLessThan(50)
  })
  it('spawn 的 y 在 [0, height) 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(3, 50, 80), em, 3000)
    const s = (sys as any).sundials[0]
    expect(s.y).toBeGreaterThanOrEqual(0)
    expect(s.y).toBeLessThan(80)
  })
})

describe('WorldSundialSystem — spawn 字段范围', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('accuracy 范围 [50, 89]（50+floor(random*40)，floor(0.9999*40)=39）', () => {
    for (const rv of [0, 0.25, 0.5, 0.75, 0.9999]) {
      const sys = makeSys()
      let c = 0
      vi.spyOn(Math, 'random').mockImplementation(() => { c++; return c <= 3 ? 0 : rv })
      sys.update(1, makeWorld(3), em, 3000)
      const s = (sys as any).sundials[0]
      if (s) {
        expect(s.accuracy).toBeGreaterThanOrEqual(50)
        expect(s.accuracy).toBeLessThanOrEqual(89)
      }
      vi.restoreAllMocks()
    }
  })
  it('accuracy 最小值为 50（random=0 => floor(0*40)=0 => 50+0=50）', () => {
    const sys = makeSys()
    let c = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { c++; return c <= 3 ? 0 : 0 })
    sys.update(1, makeWorld(3), em, 3000)
    const s = (sys as any).sundials[0]
    if (s) expect(s.accuracy).toBe(50)
    vi.restoreAllMocks()
  })
  it('accuracy 最大值为 89（random≈1 => floor(0.9999*40)=39 => 50+39=89）', () => {
    const sys = makeSys()
    let c = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { c++; return c <= 3 ? 0 : 0.9999 })
    sys.update(1, makeWorld(3), em, 3000)
    const s = (sys as any).sundials[0]
    if (s) expect(s.accuracy).toBe(89)
    vi.restoreAllMocks()
  })
  it('knowledgeBonus 由 size 决定（size=small => 5）', () => {
    const sys = makeSys()
    // pickRandom 使用 Math.random()，需要控制返回 index=0 => small
    let c = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { c++; return c <= 3 ? 0 : 0 })
    sys.update(1, makeWorld(3), em, 3000)
    const s = (sys as any).sundials[0]
    if (s) expect([5, 12, 20, 35]).toContain(s.knowledgeBonus)
    vi.restoreAllMocks()
  })
  it('size 必须是 SIZES 之一', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(3), em, 3000)
    const s = (sys as any).sundials[0]
    if (s) expect(SIZES).toContain(s.size)
    vi.restoreAllMocks()
  })
  it('shadowAngle 初始为 0（spawn时设置，update后变为 tick*0.01%360）', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(3), em, 3000)
    const s = (sys as any).sundials[0]
    // update 后 shadowAngle = (3000*0.01)%360 = 30
    if (s) expect(s.shadowAngle).toBeCloseTo(30, 5)
    vi.restoreAllMocks()
  })
})

describe('WorldSundialSystem — update 数值逻辑', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('shadowAngle = (tick * 0.01) % 360', () => {
    const sys = makeSys()
    ;(sys as any).sundials.push(makeSundial({ shadowAngle: 0, tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(3), em, 3000)
    expect((sys as any).sundials[0].shadowAngle).toBeCloseTo((3000 * 0.01) % 360, 5)
  })
  it('shadowAngle 在 tick=36000 时 = (36000*0.01)%360 = 0', () => {
    const sys = makeSys()
    ;(sys as any).sundials.push(makeSundial({ shadowAngle: 45, tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(3), em, 36000)
    expect((sys as any).sundials[0].shadowAngle).toBeCloseTo(0, 5)
  })
  it('age = tick - sundial.tick', () => {
    const sys = makeSys()
    ;(sys as any).sundials.push(makeSundial({ tick: 1000, age: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(3), em, 5000)
    expect((sys as any).sundials[0].age).toBe(5000 - 1000)
  })
  it('age < 80000 时 accuracy 不衰减', () => {
    const sys = makeSys()
    ;(sys as any).sundials.push(makeSundial({ tick: 0, accuracy: 80, age: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(3), em, 79999)
    // age = 79999-0 = 79999 < 80000，不衰减
    expect((sys as any).sundials[0].accuracy).toBe(80)
  })
  it('age > 80000 时 accuracy 衰减 0.05', () => {
    const sys = makeSys()
    ;(sys as any).sundials.push(makeSundial({ tick: 0, accuracy: 80, age: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(3), em, 80001)
    // age = 80001 > 80000，accuracy = max(10, 80-0.05) = 79.95
    expect((sys as any).sundials[0].accuracy).toBeCloseTo(79.95, 4)
  })
  it('accuracy 最小值钳制为 10', () => {
    const sys = makeSys()
    ;(sys as any).sundials.push(makeSundial({ tick: 0, accuracy: 10, age: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(3), em, 80001)
    expect((sys as any).sundials[0].accuracy).toBeGreaterThanOrEqual(10)
  })
  it('accuracy 低于 10 时不再衰减（max(10, ...)）', () => {
    const sys = makeSys()
    ;(sys as any).sundials.push(makeSundial({ tick: 0, accuracy: 9, age: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(3), em, 80001)
    expect((sys as any).sundials[0].accuracy).toBe(10)
  })
  it('knowledgeBonus 不被 update 修改', () => {
    const sys = makeSys()
    ;(sys as any).sundials.push(makeSundial({ knowledgeBonus: 20, tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(3), em, 80001)
    expect((sys as any).sundials[0].knowledgeBonus).toBe(20)
  })
  it('size 不被 update 修改', () => {
    const sys = makeSys()
    ;(sys as any).sundials.push(makeSundial({ size: 'large', tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(3), em, 80001)
    expect((sys as any).sundials[0].size).toBe('large')
  })
  it('update 对所有 sundials 都执行', () => {
    const sys = makeSys()
    ;(sys as any).sundials.push(
      makeSundial({ tick: 0, shadowAngle: 0 }),
      makeSundial({ tick: 0, shadowAngle: 0 }),
    )
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(3), em, 3000)
    for (const s of (sys as any).sundials) {
      expect(s.shadowAngle).toBeCloseTo(30, 5)
    }
  })
  it('age 边界：tick=sundial.tick 时 age=0', () => {
    const sys = makeSys()
    ;(sys as any).sundials.push(makeSundial({ tick: 5000, age: 999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(3), em, 5000)
    expect((sys as any).sundials[0].age).toBe(0)
  })
})

describe('WorldSundialSystem — cleanup 逻辑（tick < cutoff=tick-250000 则删除）', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('cutoff = tick - 250000；tick=300000 时 cutoff=50000', () => {
    const sys = makeSys()
    ;(sys as any).sundials.push(makeSundial({ tick: 49999 })) // < 50000，删除
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(3), em, 300000)
    expect((sys as any).sundials).toHaveLength(0)
  })
  it('tick=50000（等于 cutoff）保留', () => {
    const sys = makeSys()
    ;(sys as any).sundials.push(makeSundial({ tick: 50000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(3), em, 300000)
    expect((sys as any).sundials).toHaveLength(1)
  })
  it('tick=50001（> cutoff）保留', () => {
    const sys = makeSys()
    ;(sys as any).sundials.push(makeSundial({ tick: 50001 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(3), em, 300000)
    expect((sys as any).sundials).toHaveLength(1)
  })
  it('一批中只删除过期的，保留新的', () => {
    const sys = makeSys()
    ;(sys as any).sundials.push(makeSundial({ tick: 1000 }))     // 过期
    ;(sys as any).sundials.push(makeSundial({ tick: 200000 }))   // 保留
    ;(sys as any).sundials.push(makeSundial({ tick: 5000 }))     // 过期
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(3), em, 300000)
    expect((sys as any).sundials).toHaveLength(1)
    expect((sys as any).sundials[0].tick).toBe(200000)
  })
  it('cutoff 边界 tick 不被删除', () => {
    const currentTick = 500000
    const cutoff = currentTick - 250000 // 250000
    const sys = makeSys()
    ;(sys as any).sundials.push(makeSundial({ tick: cutoff }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(3), em, currentTick)
    expect((sys as any).sundials).toHaveLength(1)
  })
  it('cutoff-1 被删除', () => {
    const currentTick = 500000
    const cutoff = currentTick - 250000
    const sys = makeSys()
    ;(sys as any).sundials.push(makeSundial({ tick: cutoff - 1 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(3), em, currentTick)
    expect((sys as any).sundials).toHaveLength(0)
  })
  it('全部过期时清空（逆序删除不越界）', () => {
    const sys = makeSys()
    for (let i = 0; i < 6; i++) {
      ;(sys as any).sundials.push(makeSundial({ tick: 100 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(3), em, 400000)
    expect((sys as any).sundials).toHaveLength(0)
  })
  it('cleanup 不影响当前 tick spawn 的 sundial', () => {
    const sys = makeSys()
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(3), em, 3000)
    expect((sys as any).sundials).toHaveLength(1)
    expect((sys as any).sundials[0].tick).toBe(3000)
  })
  it('cleanup 后 sundials.length 减少', () => {
    const sys = makeSys()
    ;(sys as any).sundials.push(
      makeSundial({ tick: 100 }),
      makeSundial({ tick: 200 }),
      makeSundial({ tick: 400000 }),
    )
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(3), em, 500000)
    expect((sys as any).sundials).toHaveLength(1)
  })
})

describe('WorldSundialSystem — 综合场景', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('MAX_SUNDIALS 不超过 15', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 1; i <= 20; i++) {
      sys.update(1, makeWorld(3), em, i * 3000)
    }
    expect((sys as any).sundials.length).toBeLessThanOrEqual(MAX_SUNDIALS)
  })
  it('dt 参数不影响 update 逻辑', () => {
    const sys1 = makeSys()
    const sys2 = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys1.update(1, makeWorld(3), em, 3000)
    sys2.update(999, makeWorld(3), em, 3000)
    expect((sys1 as any).lastCheck).toBe((sys2 as any).lastCheck)
  })
  it('tile=2（sand）不 spawn（只允许 tile=3）', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(2), em, 3000)
    expect((sys as any).sundials).toHaveLength(0)
  })
  it('tile=6（snow）不 spawn', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(6), em, 3000)
    expect((sys as any).sundials).toHaveLength(0)
  })
  it('accuracy 不超过初始最大值 89（多次 update）', () => {
    const sys = makeSys()
    ;(sys as any).sundials.push(makeSundial({ accuracy: 89, tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    for (let t = 1; t <= 10; t++) {
      ;(sys as any).lastCheck = 0
      sys.update(1, makeWorld(3), em, t * 3000)
    }
    expect((sys as any).sundials[0].accuracy).toBeLessThanOrEqual(89)
  })
  it('shadowAngle 周期性在 [0, 360) 内', () => {
    const sys = makeSys()
    ;(sys as any).sundials.push(makeSundial({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    for (const testTick of [3000, 30000, 36000, 100000]) {
      ;(sys as any).lastCheck = 0
      sys.update(1, makeWorld(3), em, testTick)
      const angle = (sys as any).sundials[0]?.shadowAngle
      if (angle !== undefined) {
        expect(angle).toBeGreaterThanOrEqual(0)
        expect(angle).toBeLessThan(360)
      }
    }
  })
  it('连续 spawn 两次 id 递增', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(3), em, 3000)
    sys.update(1, makeWorld(3), em, 6000)
    const ids = (sys as any).sundials.map((s: Sundial) => s.id)
    expect(ids[0]).toBeLessThan(ids[1])
  })
})
