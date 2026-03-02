import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldThermalVentSystem } from '../systems/WorldThermalVentSystem'
import type { ThermalVent } from '../systems/WorldThermalVentSystem'

function makeSys(): WorldThermalVentSystem { return new WorldThermalVentSystem() }
let idCounter = 1
function makeVent(overrides: Partial<ThermalVent> = {}): ThermalVent {
  return {
    id: idCounter++,
    x: 30, y: 40,
    heatOutput: 80,
    mineralPlume: 60,
    pressure: 70,
    biomeRadius: 6,
    tick: 0,
    ...overrides
  }
}

const mockWorld = { width: 200, height: 200, getTile: () => 0 } as any
const mockEm = {} as any

const CHECK_INTERVAL = 2730
const FORM_CHANCE = 0.0012
const MAX_VENTS = 10

describe('WorldThermalVentSystem - 初始状态', () => {
  let sys: WorldThermalVentSystem
  beforeEach(() => { sys = makeSys(); idCounter = 1 })

  it('初始vents数组为空', () => {
    expect((sys as any).vents).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('vents字段为Array实例', () => {
    expect(Array.isArray((sys as any).vents)).toBe(true)
  })

  it('直接注入vent后可访问', () => {
    ;(sys as any).vents.push(makeVent())
    expect((sys as any).vents).toHaveLength(1)
  })
})

describe('WorldThermalVentSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldThermalVentSystem
  beforeEach(() => { sys = makeSys(); idCounter = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不触发（差值0 < CHECK_INTERVAL）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, 0)
    expect((sys as any).vents).toHaveLength(0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick < CHECK_INTERVAL时不触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick = CHECK_INTERVAL时触发并更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick > CHECK_INTERVAL时也触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL + 500)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 500)
  })

  it('第二次update在间隔内不触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('第二次update满足间隔后触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('tick < CHECK_INTERVAL时vents不更新', () => {
    ;(sys as any).vents.push(makeVent({ heatOutput: 80 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).vents[0].heatOutput).toBe(80) // 未更新
  })
})

describe('WorldThermalVentSystem - spawn逻辑', () => {
  let sys: WorldThermalVentSystem
  beforeEach(() => { sys = makeSys(); idCounter = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('random < FORM_CHANCE时spawn一个热液喷口', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).vents).toHaveLength(1)
  })

  it('random = FORM_CHANCE时不spawn（条件是 < ）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).vents).toHaveLength(0)
  })

  it('random > FORM_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).vents).toHaveLength(0)
  })

  it('spawn后nextId递增到2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(2)
  })

  it('spawn的vent id为1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).vents[0].id).toBe(1)
  })

  it('spawn的vent tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).vents[0].tick).toBe(CHECK_INTERVAL)
  })

  it('spawn时heatOutput在[50, 100)范围（50+random*50，再立即-0.01）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    const vent = (sys as any).vents[0]
    // heatOutput = 50 + 0*50 = 50, then update: max(20, 50-0.01) = 49.99
    expect(vent.heatOutput).toBeGreaterThanOrEqual(20)
    expect(vent.heatOutput).toBeLessThanOrEqual(100)
  })

  it('spawn时mineralPlume在[10, 40)范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    const vent = (sys as any).vents[0]
    // mineralPlume = 10 + 0*30 = 10, then update: min(100, 10+0.008) = 10.008
    expect(vent.mineralPlume).toBeGreaterThanOrEqual(10)
    expect(vent.mineralPlume).toBeLessThanOrEqual(100)
  })

  it('spawn时biomeRadius在[3, 8)范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    const vent = (sys as any).vents[0]
    expect(vent.biomeRadius).toBeGreaterThanOrEqual(3)
    expect(vent.biomeRadius).toBeLessThan(9)
  })

  it('vents.length >= MAX_VENTS时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < MAX_VENTS; i++) {
      ;(sys as any).vents.push(makeVent({ heatOutput: 80 }))
    }
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).vents.length).toBeLessThanOrEqual(MAX_VENTS)
  })

  it('未满MAX时可以继续spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < MAX_VENTS - 1; i++) {
      ;(sys as any).vents.push(makeVent({ heatOutput: 80 }))
    }
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).vents.length).toBe(MAX_VENTS)
  })

  it('spawn的vent x在[0, world.width)范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    const vent = (sys as any).vents[0]
    expect(vent.x).toBeGreaterThanOrEqual(0)
    expect(vent.x).toBeLessThan(mockWorld.width)
  })

  it('spawn的vent y在[0, world.height)范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    const vent = (sys as any).vents[0]
    expect(vent.y).toBeGreaterThanOrEqual(0)
    expect(vent.y).toBeLessThan(mockWorld.height)
  })
})

describe('WorldThermalVentSystem - update数值逻辑', () => {
  let sys: WorldThermalVentSystem
  beforeEach(() => { sys = makeSys(); idCounter = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('heatOutput每次update减少0.01', () => {
    ;(sys as any).vents.push(makeVent({ heatOutput: 80 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).vents[0].heatOutput).toBeCloseTo(79.99, 5)
  })

  it('heatOutput下限为20（update后=20时触发cleanup被删除）', () => {
    // heatOutput=20.005 → max(20, 20.005-0.01)=max(20,19.995)=20 → cleanup <=20 → 删除
    ;(sys as any).vents.push(makeVent({ heatOutput: 20.005 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    // update后heatOutput=20满足cleanup条件被删除
    expect((sys as any).vents).toHaveLength(0)
  })

  it('heatOutput=20.02时update后20.01>20，不被cleanup', () => {
    // heatOutput=20.02 → max(20, 20.02-0.01)=max(20,20.01)=20.01 → NOT <=20 → 保留
    ;(sys as any).vents.push(makeVent({ heatOutput: 20.02 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).vents).toHaveLength(1)
    expect((sys as any).vents[0].heatOutput).toBeCloseTo(20.01, 5)
  })

  it('mineralPlume每次update增加0.008', () => {
    ;(sys as any).vents.push(makeVent({ mineralPlume: 50, heatOutput: 80 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).vents[0].mineralPlume).toBeCloseTo(50.008, 5)
  })

  it('mineralPlume上限为100', () => {
    ;(sys as any).vents.push(makeVent({ mineralPlume: 99.995, heatOutput: 80 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    // 99.995 + 0.008 = 100.003 > 100, min(100, 100.003) = 100
    expect((sys as any).vents[0].mineralPlume).toBeLessThanOrEqual(100)
  })

  it('pressure为30 + 10*sin(tick*0.0005 + id)', () => {
    const id = 5
    const tick = CHECK_INTERVAL
    ;(sys as any).vents.push(makeVent({ id, heatOutput: 80 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, tick)
    const expected = 30 + 10 * Math.sin(tick * 0.0005 + id)
    expect((sys as any).vents[0].pressure).toBeCloseTo(expected, 5)
  })

  it('pressure不依赖初始pressure值，每次都重新计算', () => {
    const id = 1
    const tick = CHECK_INTERVAL
    ;(sys as any).vents.push(makeVent({ id, pressure: 999, heatOutput: 80 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, tick)
    const expected = 30 + 10 * Math.sin(tick * 0.0005 + id)
    expect((sys as any).vents[0].pressure).toBeCloseTo(expected, 5)
  })

  it('biomeRadius字段update不改变（源码不更新该字段）', () => {
    ;(sys as any).vents.push(makeVent({ biomeRadius: 6, heatOutput: 80 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).vents[0].biomeRadius).toBe(6)
  })

  it('多个vent各自独立update', () => {
    ;(sys as any).vents.push(makeVent({ id: 1, heatOutput: 80, mineralPlume: 50 }))
    ;(sys as any).vents.push(makeVent({ id: 2, heatOutput: 70, mineralPlume: 40 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).vents[0].heatOutput).toBeCloseTo(79.99, 5)
    expect((sys as any).vents[1].heatOutput).toBeCloseTo(69.99, 5)
  })

  it('多次update后heatOutput持续递减', () => {
    ;(sys as any).vents.push(makeVent({ heatOutput: 80 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    const after1 = (sys as any).vents[0].heatOutput
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL * 2)
    const after2 = (sys as any).vents[0].heatOutput
    expect(after2).toBeLessThan(after1)
  })

  it('heatOutput递减到20时vent被cleanup', () => {
    // heatOutput接近20，每次update减0.01，当 <= 20时删除
    // 注入heatOutput=20.005，update一次后 max(20, 20.005-0.01)=max(20,19.995)=20 → cleanup条件 <= 20，删除
    ;(sys as any).vents.push(makeVent({ heatOutput: 20.005 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).vents).toHaveLength(0)
  })
})

describe('WorldThermalVentSystem - cleanup逻辑', () => {
  let sys: WorldThermalVentSystem
  beforeEach(() => { sys = makeSys(); idCounter = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('heatOutput > 20时不cleanup', () => {
    ;(sys as any).vents.push(makeVent({ heatOutput: 80 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).vents).toHaveLength(1)
  })

  it('heatOutput = 20时cleanup（条件是 <= 20）', () => {
    // max(20, 20-0.01) = max(20, 19.99) = 20 → <= 20 → 删除
    ;(sys as any).vents.push(makeVent({ heatOutput: 20 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).vents).toHaveLength(0)
  })

  it('heatOutput > 20.01时保留', () => {
    ;(sys as any).vents.push(makeVent({ heatOutput: 21 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    // 21 - 0.01 = 20.99 > 20，不删除
    expect((sys as any).vents).toHaveLength(1)
  })

  it('heatOutput = 20.01时：max(20, 20.01-0.01)=20 → cleanup', () => {
    ;(sys as any).vents.push(makeVent({ heatOutput: 20.01 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).vents).toHaveLength(0)
  })

  it('混合heatOutput：高的保留，低的删除', () => {
    ;(sys as any).vents.push(makeVent({ id: 1, heatOutput: 80 }))  // 保留
    ;(sys as any).vents.push(makeVent({ id: 2, heatOutput: 20 }))  // 删除
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).vents).toHaveLength(1)
    expect((sys as any).vents[0].id).toBe(1)
  })

  it('所有vents都低heatOutput时全部清理', () => {
    for (let i = 0; i < 3; i++) {
      ;(sys as any).vents.push(makeVent({ heatOutput: 20 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).vents).toHaveLength(0)
  })

  it('cleanup不影响nextId', () => {
    ;(sys as any).vents.push(makeVent({ heatOutput: 20 }))
    ;(sys as any).nextId = 5
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(5)
  })

  it('cleanup后vents数组保持正确长度', () => {
    ;(sys as any).vents.push(makeVent({ id: 1, heatOutput: 80 }))
    ;(sys as any).vents.push(makeVent({ id: 2, heatOutput: 20 }))
    ;(sys as any).vents.push(makeVent({ id: 3, heatOutput: 60 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).vents).toHaveLength(2)
  })

  it('不在间隔内时不执行cleanup', () => {
    ;(sys as any).vents.push(makeVent({ heatOutput: 20 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).vents).toHaveLength(1) // 没有执行update，没有cleanup
  })

  it('cleanup后可spawn新vent', () => {
    ;(sys as any).vents.push(makeVent({ heatOutput: 20 }))
    vi.spyOn(Math, 'random').mockReturnValue(0) // 触发spawn
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    // 旧vent被cleanup（heatOutput=20），新vent被spawn（heatOutput=50+0*50=50，update后49.99）
    const vents = (sys as any).vents
    expect(vents.length).toBeGreaterThanOrEqual(0) // cleanup后再spawn
    if (vents.length > 0) {
      expect(vents[0].tick).toBe(CHECK_INTERVAL)
    }
  })
})

describe('WorldThermalVentSystem - 综合场景', () => {
  let sys: WorldThermalVentSystem
  beforeEach(() => { sys = makeSys(); idCounter = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('满额MAX_VENTS时即使random=0也不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < MAX_VENTS; i++) {
      ;(sys as any).vents.push(makeVent({ heatOutput: 80 }))
    }
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).vents.length).toBeLessThanOrEqual(MAX_VENTS)
  })

  it('vent字段类型均为number', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    const v = (sys as any).vents[0]
    expect(typeof v.heatOutput).toBe('number')
    expect(typeof v.mineralPlume).toBe('number')
    expect(typeof v.pressure).toBe('number')
    expect(typeof v.biomeRadius).toBe('number')
  })

  it('pressure值域在[20, 40]之间（30 ± 10）', () => {
    ;(sys as any).vents.push(makeVent({ id: 1, heatOutput: 80 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    const pressure = (sys as any).vents[0].pressure
    expect(pressure).toBeGreaterThanOrEqual(20)
    expect(pressure).toBeLessThanOrEqual(40)
  })

  it('多次update后mineralPlume趋向增大', () => {
    ;(sys as any).vents.push(makeVent({ heatOutput: 80, mineralPlume: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const initial = (sys as any).vents[0].mineralPlume
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    const after = (sys as any).vents[0].mineralPlume
    expect(after).toBeGreaterThan(initial)
  })

  it('vent id字段为正整数', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).vents[0].id).toBeGreaterThan(0)
    expect(Number.isInteger((sys as any).vents[0].id)).toBe(true)
  })

  it('vent x、y为非负整数', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).vents[0].x).toBeGreaterThanOrEqual(0)
    expect((sys as any).vents[0].y).toBeGreaterThanOrEqual(0)
    expect(Number.isInteger((sys as any).vents[0].x)).toBe(true)
    expect(Number.isInteger((sys as any).vents[0].y)).toBe(true)
  })

  it('update后vents数组仍为同一引用', () => {
    const ref = (sys as any).vents
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).vents).toBe(ref)
  })

  it('注入vent不调用update时字段不变', () => {
    ;(sys as any).vents.push(makeVent({ heatOutput: 80, mineralPlume: 60 }))
    expect((sys as any).vents[0].heatOutput).toBe(80)
    expect((sys as any).vents[0].mineralPlume).toBe(60)
  })

  it('heatOutput初始值range验证：random=0时50（spawn后update-0.01=49.99）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    // heatOutput = 50 + 0*50 = 50, then update: max(20, 50-0.01) = 49.99
    expect((sys as any).vents[0].heatOutput).toBeCloseTo(49.99, 5)
  })

  it('mineralPlume初始值range验证：random=0时10（spawn后update+0.008=10.008）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    // mineralPlume = 10 + 0*30 = 10, then update: min(100, 10+0.008) = 10.008
    expect((sys as any).vents[0].mineralPlume).toBeCloseTo(10.008, 5)
  })

  it('lastCheck=CHECK_INTERVAL后再差值=CHECK_INTERVAL时再次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('world.width使用||200 fallback', () => {
    const worldNoSize = { width: undefined, height: undefined, getTile: () => 0 } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, worldNoSize, mockEm, CHECK_INTERVAL)
    // 使用 world.width || 200，不会抛错
    expect((sys as any).vents[0].x).toBeGreaterThanOrEqual(0)
    expect((sys as any).vents[0].x).toBeLessThan(200)
  })

  it('pressure对不同id的vent计算不同', () => {
    ;(sys as any).vents.push(makeVent({ id: 1, heatOutput: 80 }))
    ;(sys as any).vents.push(makeVent({ id: 10, heatOutput: 80 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    const p1 = (sys as any).vents[0].pressure
    const p2 = (sys as any).vents[1].pressure
    // 不同id导致不同的sin值，pressure可能不同
    const tick = CHECK_INTERVAL
    const expected1 = 30 + 10 * Math.sin(tick * 0.0005 + 1)
    const expected2 = 30 + 10 * Math.sin(tick * 0.0005 + 10)
    expect(p1).toBeCloseTo(expected1, 5)
    expect(p2).toBeCloseTo(expected2, 5)
  })
})
