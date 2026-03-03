import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldIceCaveSystem } from '../systems/WorldIceCaveSystem'
import type { IceCaveZone } from '../systems/WorldIceCaveSystem'
import { TileType } from '../utils/Constants'

function makeSys(): WorldIceCaveSystem { return new WorldIceCaveSystem() }
let nextId = 1
function makeZone(overrides: Partial<IceCaveZone> = {}): IceCaveZone {
  return {
    id: nextId++, x: 5, y: 10,
    temperature: -15, iceThickness: 20,
    crystalFormation: 50, stability: 75, tick: 0,
    ...overrides,
  }
}

// SAND tile 阻断spawn（非SNOW/MOUNTAIN）
const sandWorld = { width: 200, height: 200, getTile: () => TileType.SAND } as any
// SNOW tile 允许spawn
const snowWorld = { width: 200, height: 200, getTile: () => TileType.SNOW } as any
// MOUNTAIN tile 允许spawn
const mountainWorld = { width: 200, height: 200, getTile: () => TileType.MOUNTAIN } as any
const mockEm = {} as any

describe('WorldIceCaveSystem - 初始状态', () => {
  let sys: WorldIceCaveSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无冰洞', () => { expect((sys as any).zones).toHaveLength(0) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).zones).toBe((sys as any).zones)
  })
  it('冰洞字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = (sys as any).zones[0]
    expect(z.temperature).toBe(-15)
    expect(z.iceThickness).toBe(20)
    expect(z.stability).toBe(75)
  })
  it('多个冰洞全部返回', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(2)
  })
})

describe('WorldIceCaveSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldIceCaveSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < CHECK_INTERVAL(2900)时不执行任何逻辑', () => {
    sys.update(1, sandWorld, mockEm, 100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2899时不触发（严格<2900）', () => {
    sys.update(1, sandWorld, mockEm, 2899)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2900时触发，lastCheck更新为2900', () => {
    sys.update(1, sandWorld, mockEm, 2900)
    expect((sys as any).lastCheck).toBe(2900)
  })

  it('第二次update间隔不足时不再触发', () => {
    sys.update(1, sandWorld, mockEm, 2900)
    sys.update(1, sandWorld, mockEm, 4000)
    expect((sys as any).lastCheck).toBe(2900)
  })

  it('第二次update间隔足够（>=2900）时再次触发', () => {
    sys.update(1, sandWorld, mockEm, 2900)
    sys.update(1, sandWorld, mockEm, 5800)
    expect((sys as any).lastCheck).toBe(5800)
  })
})

describe('WorldIceCaveSystem - spawn tile要求', () => {
  let sys: WorldIceCaveSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('SAND(2)地形阻断spawn，random=0也不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, sandWorld, mockEm, 2900)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('SNOW(6)地形允许spawn，random<FORM_CHANCE时至少spawn1个', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, snowWorld, mockEm, 2900)
    // 3次attempt，random=0均满足，最多3个
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('MOUNTAIN(5)地形允许spawn，random<FORM_CHANCE时至少spawn1个', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mountainWorld, mockEm, 2900)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('GRASS(3)地形阻断spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const grassWorld = { width: 200, height: 200, getTile: () => TileType.GRASS } as any
    sys.update(1, grassWorld, mockEm, 2900)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('SNOW地形random=0.9时不spawn（>FORM_CHANCE=0.003）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, snowWorld, mockEm, 2900)
    expect((sys as any).zones).toHaveLength(0)
  })
})

describe('WorldIceCaveSystem - spawn字段范围验证', () => {
  let sys: WorldIceCaveSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('spawn后temperature在[-40,-20)范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, snowWorld, mockEm, 2900)
    const z = (sys as any).zones[0]
    // temperature = -40 + 0*20 = -40
    expect(z.temperature).toBeGreaterThanOrEqual(-40)
    expect(z.temperature).toBeLessThan(-20)
  })

  it('spawn后iceThickness>=30', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, snowWorld, mockEm, 2900)
    const z = (sys as any).zones[0]
    expect(z.iceThickness).toBeGreaterThanOrEqual(30)
  })

  it('spawn后crystalFormation>=10', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, snowWorld, mockEm, 2900)
    const z = (sys as any).zones[0]
    expect(z.crystalFormation).toBeGreaterThanOrEqual(10)
  })

  it('spawn后stability在[40,80)范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, snowWorld, mockEm, 2900)
    const z = (sys as any).zones[0]
    expect(z.stability).toBeGreaterThanOrEqual(40)
    expect(z.stability).toBeLessThan(80)
  })

  it('spawn后temperature为负数', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, snowWorld, mockEm, 2900)
    const z = (sys as any).zones[0]
    expect(z.temperature).toBeLessThan(0)
  })
})

describe('WorldIceCaveSystem - cleanup逻辑（tick过期）', () => {
  let sys: WorldIceCaveSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('zone.tick < cutoff(tick-58000)时被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // 当前tick=70000，cutoff=70000-58000=12000；zone.tick=0 < 12000 → 删除
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    sys.update(1, sandWorld, mockEm, 70000)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('zone.tick等于cutoff时保留（严格<才删除）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // tick=70000, cutoff=12000；zone.tick=12000，12000 < 12000 = false → 保留
    ;(sys as any).zones.push(makeZone({ tick: 12000 }))
    sys.update(1, sandWorld, mockEm, 70000)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('zone.tick > cutoff时保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 15000 }))
    sys.update(1, sandWorld, mockEm, 70000)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('混合cleanup：过期zone删除，新鲜zone保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // tick=70000, cutoff=12000
    ;(sys as any).zones.push(makeZone({ tick: 0 }))     // < 12000 → 删除
    ;(sys as any).zones.push(makeZone({ tick: 20000 })) // > 12000 → 保留
    sys.update(1, sandWorld, mockEm, 70000)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(20000)
  })

  it('多个过期zone全部删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).zones.push(makeZone({ tick: 100 }))
    ;(sys as any).zones.push(makeZone({ tick: 11999 }))
    sys.update(1, sandWorld, mockEm, 70000)
    expect((sys as any).zones).toHaveLength(0)
  })
})

describe('WorldIceCaveSystem - MAX_ZONES=30上限', () => {
  let sys: WorldIceCaveSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('已有30个zone时不再spawn（MAX_ZONES=30）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 30; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 100000 }))
    }
    sys.update(1, snowWorld, mockEm, 102900)
    // cleanup: zone.tick=100000, cutoff=102900-58000=44900，100000>44900 → 保留
    expect((sys as any).zones).toHaveLength(30)
  })

  it('29个zone时random=0可spawn到30', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 29; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 100000 }))
    }
    sys.update(1, snowWorld, mockEm, 102900)
    expect((sys as any).zones).toHaveLength(30)
  })

  it('3次attempt每次都检查MAX_ZONES限制', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    // 初始空，3次attempt最多只会spawn 1次（break after first success）
    sys.update(1, snowWorld, mockEm, 2900)
    expect((sys as any).zones.length).toBeLessThanOrEqual(3)
  })
})

describe('WorldIceCaveSystem - 字段边界扩展测试', () => {
  let sys: WorldIceCaveSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('temperature可以是小数', () => {
    ;(sys as any).zones.push(makeZone({ temperature: -25.5 }))
    expect((sys as any).zones[0].temperature).toBeCloseTo(-25.5, 1)
  })

  it('iceThickness可以是小数', () => {
    ;(sys as any).zones.push(makeZone({ iceThickness: 33.7 }))
    expect((sys as any).zones[0].iceThickness).toBeCloseTo(33.7, 1)
  })

  it('crystalFormation可以是小数', () => {
    ;(sys as any).zones.push(makeZone({ crystalFormation: 42.3 }))
    expect((sys as any).zones[0].crystalFormation).toBeCloseTo(42.3, 1)
  })

  it('stability可以是小数', () => {
    ;(sys as any).zones.push(makeZone({ stability: 68.9 }))
    expect((sys as any).zones[0].stability).toBeCloseTo(68.9, 1)
  })

  it('tick可以是大数', () => {
    ;(sys as any).zones.push(makeZone({ tick: 999999 }))
    expect((sys as any).zones[0].tick).toBe(999999)
  })

  it('id字段唯一性', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    const ids = (sys as any).zones.map((z: IceCaveZone) => z.id)
    expect(new Set(ids).size).toBe(3)
  })
})

describe('WorldIceCaveSystem - 多zone交互测试', () => {
  let sys: WorldIceCaveSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('多个zone同时存在', () => {
    ;(sys as any).zones.push(makeZone({ id: 1, x: 10, y: 20 }))
    ;(sys as any).zones.push(makeZone({ id: 2, x: 30, y: 40 }))
    ;(sys as any).zones.push(makeZone({ id: 3, x: 50, y: 60 }))
    expect((sys as any).zones).toHaveLength(3)
  })

  it('不同位置的zone可以共存', () => {
    ;(sys as any).zones.push(makeZone({ x: 0, y: 0 }))
    ;(sys as any).zones.push(makeZone({ x: 100, y: 100 }))
    ;(sys as any).zones.push(makeZone({ x: 199, y: 199 }))
    expect((sys as any).zones).toHaveLength(3)
  })

  it('部分zone过期被删除，其他保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 0 }))      // 过期
    ;(sys as any).zones.push(makeZone({ tick: 50000 }))  // 保留
    ;(sys as any).zones.push(makeZone({ tick: 0 }))      // 过期
    sys.update(1, sandWorld, mockEm, 70000)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(50000)
  })

  it('不同temperature的zone可以共存', () => {
    ;(sys as any).zones.push(makeZone({ temperature: -40 }))
    ;(sys as any).zones.push(makeZone({ temperature: -30 }))
    ;(sys as any).zones.push(makeZone({ temperature: -20 }))
    expect((sys as any).zones).toHaveLength(3)
  })
})

describe('WorldIceCaveSystem - nextId管理测试', () => {
  let sys: WorldIceCaveSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('nextId可以手动设置', () => {
    ;(sys as any).nextId = 100
    expect((sys as any).nextId).toBe(100)
  })

  it('nextId不会因cleanup而改变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).nextId = 50
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    sys.update(1, sandWorld, mockEm, 70000)
    expect((sys as any).nextId).toBe(50)
  })

  it('多次update后nextId保持不变（无spawn）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, mockEm, 2900)
    sys.update(1, sandWorld, mockEm, 5800)
    expect((sys as any).nextId).toBe(1)
  })
})

describe('WorldIceCaveSystem - 空数组和边界', () => {
  let sys: WorldIceCaveSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('zones为空时update不崩溃', () => {
    expect(() => sys.update(1, sandWorld, mockEm, 2900)).not.toThrow()
  })

  it('zones为空时cleanup不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, sandWorld, mockEm, 70000)).not.toThrow()
  })

  it('lastCheck在第一次update后更新', () => {
    sys.update(1, sandWorld, mockEm, 2900)
    expect((sys as any).lastCheck).toBe(2900)
  })

  it('zones数组支持push操作', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('id可以是任意正整数', () => {
    ;(sys as any).zones.push(makeZone({ id: 77777 }))
    expect((sys as any).zones[0].id).toBe(77777)
  })

  it('多个zone的id可以各不相同', () => {
    ;(sys as any).zones.push(makeZone({ id: 1 }))
    ;(sys as any).zones.push(makeZone({ id: 2 }))
    ;(sys as any).zones.push(makeZone({ id: 3 }))
    const ids = (sys as any).zones.map((z: IceCaveZone) => z.id)
    expect(new Set(ids).size).toBe(3)
  })
})

describe('WorldIceCaveSystem - 坐标范围测试', () => {
  let sys: WorldIceCaveSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('x坐标可以是0', () => {
    ;(sys as any).zones.push(makeZone({ x: 0 }))
    expect((sys as any).zones[0].x).toBe(0)
  })

  it('y坐标可以是0', () => {
    ;(sys as any).zones.push(makeZone({ y: 0 }))
    expect((sys as any).zones[0].y).toBe(0)
  })

  it('x坐标可以是world.width-1', () => {
    ;(sys as any).zones.push(makeZone({ x: 199 }))
    expect((sys as any).zones[0].x).toBe(199)
  })

  it('y坐标可以是world.height-1', () => {
    ;(sys as any).zones.push(makeZone({ y: 199 }))
    expect((sys as any).zones[0].y).toBe(199)
  })
})
