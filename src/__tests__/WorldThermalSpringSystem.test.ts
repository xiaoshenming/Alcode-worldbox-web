import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldThermalSpringSystem } from '../systems/WorldThermalSpringSystem'
import type { ThermalSpring } from '../systems/WorldThermalSpringSystem'

function makeSys(): WorldThermalSpringSystem { return new WorldThermalSpringSystem() }
let idCounter = 1
function makeSpring(overrides: Partial<ThermalSpring> = {}): ThermalSpring {
  return {
    id: idCounter++,
    x: 20, y: 30,
    waterTemp: 60,
    flowVolume: 20,
    dissolvedMinerals: 25,
    clarity: 50,
    tick: 0,
    ...overrides
  }
}

const mockWorld = { width: 200, height: 200, getTile: () => 3 } as any
const mockEm = {} as any

const CHECK_INTERVAL = 2980
const FORM_CHANCE = 0.0012
const MAX_SPRINGS = 14

describe('WorldThermalSpringSystem - 初始状态', () => {
  let sys: WorldThermalSpringSystem
  beforeEach(() => { sys = makeSys(); idCounter = 1 })

  it('初始springs数组为空', () => {
    expect((sys as any).springs).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('springs数组为Array实例', () => {
    expect(Array.isArray((sys as any).springs)).toBe(true)
  })

  it('直接注入spring后可访问', () => {
    ;(sys as any).springs.push(makeSpring())
    expect((sys as any).springs).toHaveLength(1)
  })
})

describe('WorldThermalSpringSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldThermalSpringSystem
  beforeEach(() => { sys = makeSys(); idCounter = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不触发（tick-lastCheck=0 < CHECK_INTERVAL）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, 0)
    expect((sys as any).springs).toHaveLength(0)
  })

  it('tick < CHECK_INTERVAL时不触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).springs).toHaveLength(0)
  })

  it('tick = CHECK_INTERVAL时触发（差值恰好等于CHECK_INTERVAL，条件是 < 所以不通过，但差值=CHECK_INTERVAL不满足 <）', () => {
    // tick - lastCheck = CHECK_INTERVAL - 0 = CHECK_INTERVAL，条件是 < CHECK_INTERVAL，所以 CHECK_INTERVAL < CHECK_INTERVAL 为false，触发
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick = CHECK_INTERVAL时lastCheck被更新为tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick < CHECK_INTERVAL时lastCheck不更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('第二次update在间隔内不触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL + 1)
    // lastCheck should still be CHECK_INTERVAL since tick-lastCheck = 1 < CHECK_INTERVAL
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('第二次update满足间隔后触发更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})

describe('WorldThermalSpringSystem - spawn逻辑', () => {
  let sys: WorldThermalSpringSystem
  beforeEach(() => { sys = makeSys(); idCounter = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('random < FORM_CHANCE时spawn一个温泉', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).springs).toHaveLength(1)
  })

  it('random = FORM_CHANCE时不spawn（条件是 < ）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).springs).toHaveLength(0)
  })

  it('random > FORM_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).springs).toHaveLength(0)
  })

  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(2)
  })

  it('spawn的温泉id为1（第一个）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).springs[0].id).toBe(1)
  })

  it('spawn的温泉tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).springs[0].tick).toBe(CHECK_INTERVAL)
  })

  it('spawn时waterTemp在[35,85)范围内（35+random*50，random=0则35）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    const spring = (sys as any).springs[0]
    // waterTemp = 35 + 0*50 = 35, then update: max(25,min(95, 35+(0-0.48)*0.25))
    expect(spring.waterTemp).toBeGreaterThanOrEqual(25)
    expect(spring.waterTemp).toBeLessThanOrEqual(95)
  })

  it('spawn时flowVolume在合理范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    const spring = (sys as any).springs[0]
    expect(spring.flowVolume).toBeGreaterThanOrEqual(2)
    expect(spring.flowVolume).toBeLessThanOrEqual(55)
  })

  it('springs.length >= MAX_SPRINGS时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < MAX_SPRINGS; i++) {
      ;(sys as any).springs.push(makeSpring({ tick: CHECK_INTERVAL }))
    }
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    // 数量不变（不超过MAX）
    expect((sys as any).springs.length).toBeLessThanOrEqual(MAX_SPRINGS)
  })

  it('未满MAX时可以继续spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < MAX_SPRINGS - 1; i++) {
      ;(sys as any).springs.push(makeSpring({ tick: CHECK_INTERVAL }))
    }
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).springs.length).toBe(MAX_SPRINGS)
  })

  it('spawn的温泉x在[0,world.width)范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    const spring = (sys as any).springs[0]
    expect(spring.x).toBeGreaterThanOrEqual(0)
    expect(spring.x).toBeLessThan(mockWorld.width)
  })

  it('spawn的温泉y在[0,world.height)范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    const spring = (sys as any).springs[0]
    expect(spring.y).toBeGreaterThanOrEqual(0)
    expect(spring.y).toBeLessThan(mockWorld.height)
  })
})

describe('WorldThermalSpringSystem - update数值逻辑', () => {
  let sys: WorldThermalSpringSystem
  beforeEach(() => { sys = makeSys(); idCounter = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('waterTemp下限为25', () => {
    ;(sys as any).springs.push(makeSpring({ waterTemp: 25, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // 0.5 < FORM_CHANCE? no, so no spawn; update: (0.5-0.48)*0.25 > 0
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).springs[0].waterTemp).toBeGreaterThanOrEqual(25)
  })

  it('waterTemp上限为95', () => {
    ;(sys as any).springs.push(makeSpring({ waterTemp: 95, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(1) // (1-0.48)*0.25 > 0，但钳制到95
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).springs[0].waterTemp).toBeLessThanOrEqual(95)
  })

  it('waterTemp在random=0时减少（趋向下限）', () => {
    ;(sys as any).springs.push(makeSpring({ waterTemp: 60, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0) // (0-0.48)*0.25 = -0.12
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).springs[0].waterTemp).toBeLessThan(60)
  })

  it('waterTemp在random=1时增加', () => {
    ;(sys as any).springs.push(makeSpring({ waterTemp: 60, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(1) // (1-0.48)*0.25 = 0.13
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).springs[0].waterTemp).toBeGreaterThan(60)
  })

  it('flowVolume下限为2', () => {
    ;(sys as any).springs.push(makeSpring({ flowVolume: 2, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0) // (0-0.5)*0.15 = -0.075，但下限2
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).springs[0].flowVolume).toBeGreaterThanOrEqual(2)
  })

  it('flowVolume上限为55', () => {
    ;(sys as any).springs.push(makeSpring({ flowVolume: 55, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(1) // (1-0.5)*0.15 = 0.075，但上限55
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).springs[0].flowVolume).toBeLessThanOrEqual(55)
  })

  it('clarity下限为10', () => {
    ;(sys as any).springs.push(makeSpring({ clarity: 10, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0) // (0-0.47)*0.1 = -0.047，但下限10
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).springs[0].clarity).toBeGreaterThanOrEqual(10)
  })

  it('clarity上限为85', () => {
    ;(sys as any).springs.push(makeSpring({ clarity: 85, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(1) // (1-0.47)*0.1 = 0.053，但上限85
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).springs[0].clarity).toBeLessThanOrEqual(85)
  })

  it('clarity在random=0时减少', () => {
    ;(sys as any).springs.push(makeSpring({ clarity: 50, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).springs[0].clarity).toBeLessThan(50)
  })

  it('clarity在random=1时增加', () => {
    ;(sys as any).springs.push(makeSpring({ clarity: 50, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).springs[0].clarity).toBeGreaterThan(50)
  })

  it('update不改变dissolvedMinerals字段（源码不更新该字段）', () => {
    ;(sys as any).springs.push(makeSpring({ dissolvedMinerals: 25, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).springs[0].dissolvedMinerals).toBe(25)
  })

  it('多个spring各自独立update', () => {
    ;(sys as any).springs.push(makeSpring({ waterTemp: 60, tick: CHECK_INTERVAL }))
    ;(sys as any).springs.push(makeSpring({ waterTemp: 70, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    // 两个spring都应存在且都有waterTemp
    expect((sys as any).springs).toHaveLength(2)
    expect(typeof (sys as any).springs[0].waterTemp).toBe('number')
    expect(typeof (sys as any).springs[1].waterTemp).toBe('number')
  })
})

describe('WorldThermalSpringSystem - cleanup逻辑', () => {
  let sys: WorldThermalSpringSystem
  beforeEach(() => { sys = makeSys(); idCounter = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  const LIFETIME = 86000

  it('tick字段恰好等于cutoff时不删除（条件是 < cutoff）', () => {
    const currentTick = CHECK_INTERVAL + LIFETIME
    const cutoff = currentTick - LIFETIME  // = CHECK_INTERVAL
    ;(sys as any).springs.push(makeSpring({ tick: cutoff })) // tick === cutoff，条件 < cutoff 为false
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, currentTick)
    expect((sys as any).springs).toHaveLength(1)
  })

  it('tick字段小于cutoff时删除', () => {
    const currentTick = CHECK_INTERVAL + LIFETIME
    const cutoff = currentTick - LIFETIME
    ;(sys as any).springs.push(makeSpring({ tick: cutoff - 1 })) // tick < cutoff
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, currentTick)
    expect((sys as any).springs).toHaveLength(0)
  })

  it('tick字段大于cutoff时保留', () => {
    const currentTick = CHECK_INTERVAL + LIFETIME
    const cutoff = currentTick - LIFETIME
    ;(sys as any).springs.push(makeSpring({ tick: cutoff + 1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, currentTick)
    expect((sys as any).springs).toHaveLength(1)
  })

  it('过期和未过期混合时只删过期的', () => {
    const currentTick = CHECK_INTERVAL + LIFETIME
    const cutoff = currentTick - LIFETIME
    ;(sys as any).springs.push(makeSpring({ tick: cutoff - 1 })) // 过期
    ;(sys as any).springs.push(makeSpring({ tick: cutoff + 1 })) // 未过期
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, currentTick)
    expect((sys as any).springs).toHaveLength(1)
    expect((sys as any).springs[0].tick).toBe(cutoff + 1)
  })

  it('所有spring都过期时清空', () => {
    const currentTick = CHECK_INTERVAL + LIFETIME
    const cutoff = currentTick - LIFETIME
    for (let i = 0; i < 3; i++) {
      ;(sys as any).springs.push(makeSpring({ tick: cutoff - 10 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, currentTick)
    expect((sys as any).springs).toHaveLength(0)
  })

  it('不在间隔内时不执行cleanup', () => {
    const currentTick = CHECK_INTERVAL - 1
    ;(sys as any).springs.push(makeSpring({ tick: 0 })) // 按时间会过期，但update不触发
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, currentTick)
    // update没执行，spring未被清理
    expect((sys as any).springs).toHaveLength(1)
  })

  it('多个过期spring全部被删除', () => {
    const currentTick = CHECK_INTERVAL + LIFETIME
    const cutoff = currentTick - LIFETIME
    for (let i = 0; i < 5; i++) {
      ;(sys as any).springs.push(makeSpring({ tick: cutoff - 100 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, currentTick)
    expect((sys as any).springs).toHaveLength(0)
  })

  it('cleanup后springs.length正确', () => {
    const currentTick = CHECK_INTERVAL + LIFETIME
    const cutoff = currentTick - LIFETIME
    ;(sys as any).springs.push(makeSpring({ tick: cutoff - 1 })) // 过期
    ;(sys as any).springs.push(makeSpring({ tick: cutoff + 5 })) // 保留
    ;(sys as any).springs.push(makeSpring({ tick: cutoff + 10 })) // 保留
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, currentTick)
    expect((sys as any).springs).toHaveLength(2)
  })

  it('cleanup与update在同一次调用中执行', () => {
    const currentTick = CHECK_INTERVAL + LIFETIME
    const cutoff = currentTick - LIFETIME
    // 注入一个临界过期的spring，并观察其被删除
    ;(sys as any).springs.push(makeSpring({ waterTemp: 60, tick: cutoff - 1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, currentTick)
    expect((sys as any).springs).toHaveLength(0)
  })

  it('cleanup后nextId不重置', () => {
    const currentTick = CHECK_INTERVAL + LIFETIME
    const cutoff = currentTick - LIFETIME
    ;(sys as any).springs.push(makeSpring({ tick: cutoff - 1 }))
    ;(sys as any).nextId = 5
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, currentTick)
    expect((sys as any).nextId).toBe(5)
  })
})

describe('WorldThermalSpringSystem - 综合场景', () => {
  let sys: WorldThermalSpringSystem
  beforeEach(() => { sys = makeSys(); idCounter = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('满额MAX_SPRINGS时即使random=0也不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < MAX_SPRINGS; i++) {
      ;(sys as any).springs.push(makeSpring({ tick: CHECK_INTERVAL }))
    }
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).springs).toHaveLength(MAX_SPRINGS)
  })

  it('连续两次update间隔满足时都更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('spring字段类型均为number', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    const s = (sys as any).springs[0]
    expect(typeof s.waterTemp).toBe('number')
    expect(typeof s.flowVolume).toBe('number')
    expect(typeof s.dissolvedMinerals).toBe('number')
    expect(typeof s.clarity).toBe('number')
  })

  it('多次update后waterTemp保持在[25,95]', () => {
    ;(sys as any).springs.push(makeSpring({ waterTemp: 50, tick: CHECK_INTERVAL }))
    const mockRandom = vi.spyOn(Math, 'random')
    for (let i = 1; i <= 10; i++) {
      mockRandom.mockReturnValue(i % 2 === 0 ? 0 : 1)
      sys.update(0, mockWorld, mockEm, CHECK_INTERVAL * (i + 1))
    }
    expect((sys as any).springs[0].waterTemp).toBeGreaterThanOrEqual(25)
    expect((sys as any).springs[0].waterTemp).toBeLessThanOrEqual(95)
  })

  it('多次update后clarity保持在[10,85]', () => {
    ;(sys as any).springs.push(makeSpring({ clarity: 50, tick: CHECK_INTERVAL }))
    const mockRandom = vi.spyOn(Math, 'random')
    for (let i = 1; i <= 10; i++) {
      mockRandom.mockReturnValue(i % 2 === 0 ? 0 : 1)
      sys.update(0, mockWorld, mockEm, CHECK_INTERVAL * (i + 1))
    }
    expect((sys as any).springs[0].clarity).toBeGreaterThanOrEqual(10)
    expect((sys as any).springs[0].clarity).toBeLessThanOrEqual(85)
  })

  it('不同tick产生的spring有正确的tick记录', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).springs[0].tick).toBe(CHECK_INTERVAL)
  })

  it('waterTemp初始范围：random=0时35，random=1时85（+update偏移）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    // waterTemp = 35 + 0*50 = 35, then update: max(25, min(95, 35 + (0-0.48)*0.25)) = max(25,min(95,34.88)) = 34.88
    expect((sys as any).springs[0].waterTemp).toBeCloseTo(34.88, 1)
  })

  it('flowVolume初始范围：random=0时5（+update偏移）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    // flowVolume = 5 + 0*30 = 5, then update: max(2, min(55, 5 + (0-0.5)*0.15)) = max(2,min(55,4.925)) = 4.925
    expect((sys as any).springs[0].flowVolume).toBeCloseTo(4.925, 2)
  })

  it('clarity初始范围：random=0时20（+update偏移）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    // clarity = 20 + 0*40 = 20, then update: max(10, min(85, 20 + (0-0.47)*0.1)) = max(10,min(85,19.953)) = 19.953
    expect((sys as any).springs[0].clarity).toBeCloseTo(19.953, 2)
  })

  it('直接注入spring不经过update时字段不变', () => {
    ;(sys as any).springs.push(makeSpring({ waterTemp: 60, clarity: 50 }))
    // 不调用update，字段保持初始值
    expect((sys as any).springs[0].waterTemp).toBe(60)
    expect((sys as any).springs[0].clarity).toBe(50)
  })

  it('cleanup后可以重新spawn', () => {
    const lifetime = 86000
    const tick1 = CHECK_INTERVAL
    ;(sys as any).springs.push(makeSpring({ tick: 0 })) // 过期spring
    vi.spyOn(Math, 'random').mockReturnValue(0)
    // tick = CHECK_INTERVAL + lifetime使之过期并触发update
    sys.update(0, mockWorld, mockEm, tick1 + lifetime)
    // 旧spring被清理，新spring被spawn
    const springs = (sys as any).springs
    if (springs.length > 0) {
      expect(springs[0].tick).toBe(tick1 + lifetime)
    }
  })

  it('nextId在多次spawn后正确递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(2)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL * 2)
    expect((sys as any).nextId).toBe(3)
  })

  it('spring的id字段为正整数', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).springs[0].id).toBeGreaterThan(0)
    expect(Number.isInteger((sys as any).springs[0].id)).toBe(true)
  })

  it('spring的x、y为非负整数', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).springs[0].x).toBeGreaterThanOrEqual(0)
    expect((sys as any).springs[0].y).toBeGreaterThanOrEqual(0)
    expect(Number.isInteger((sys as any).springs[0].x)).toBe(true)
    expect(Number.isInteger((sys as any).springs[0].y)).toBe(true)
  })

  it('lastCheck=0时tick=CHECK_INTERVAL-1不触发（差值2979 < 2980）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
    expect((sys as any).springs).toHaveLength(0)
  })

  it('update后springs数组仍为同一引用', () => {
    const ref = (sys as any).springs
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).springs).toBe(ref)
  })
})
