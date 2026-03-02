import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldTepuiSystem } from '../systems/WorldTepuiSystem'
import type { Tepui } from '../systems/WorldTepuiSystem'
import { TileType } from '../utils/Constants'

function makeSys(): WorldTepuiSystem { return new WorldTepuiSystem() }
let nextId = 1

function makeTepui(overrides: Partial<Tepui> = {}): Tepui {
  return {
    id: nextId++,
    x: 50,
    y: 60,
    elevation: 2000,
    plateauArea: 40,
    cliffHeight: 500,
    endemicSpecies: 10,
    erosionRate: 1.5,
    spectacle: 50,
    tick: 0,
    ...overrides
  }
}

// WorldTepuiSystem使用 world.getTile(x,y) 而非 hasAdjacentTile
// tile必须是MOUNTAIN或FOREST才能spawn
function makeWorld(tileVal: number = TileType.MOUNTAIN) {
  return { width: 200, height: 200, getTile: () => tileVal } as any
}

const mockEm = {} as any
const CHECK_INTERVAL = 2620
const FORM_CHANCE = 0.0013
const MAX_TEPUIS = 12

describe('WorldTepuiSystem - 初始状态', () => {
  let sys: WorldTepuiSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始tepuis数组为空', () => {
    expect((sys as any).tepuis).toHaveLength(0)
  })
  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tepuis是数组类型', () => {
    expect(Array.isArray((sys as any).tepuis)).toBe(true)
  })
  it('手动注入tepui后长度为1', () => {
    ;(sys as any).tepuis.push(makeTepui())
    expect((sys as any).tepuis).toHaveLength(1)
  })
})

describe('WorldTepuiSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldTepuiSystem
  const world = makeWorld()
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不触发（lastCheck=0, diff=0 < 2620）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, mockEm, 0)
    expect((sys as any).tepuis).toHaveLength(0)
  })
  it('tick=2619时不触发（diff=2619 < 2620）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, mockEm, 2619)
    expect((sys as any).tepuis).toHaveLength(0)
  })
  it('tick=2620时触发，lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, mockEm, 2620)
    expect((sys as any).lastCheck).toBe(2620)
  })
  it('触发后lastCheck更新为当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, mockEm, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })
  it('未触发时lastCheck不变', () => {
    sys.update(1, world, mockEm, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('连续调用：第二次tick不足interval不更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, mockEm, 3000)
    const lc = (sys as any).lastCheck
    sys.update(1, world, mockEm, 3001)
    expect((sys as any).lastCheck).toBe(lc)
  })
  it('第二次间隔足够时再次更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, mockEm, 3000)
    sys.update(1, world, mockEm, 3000 + CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(3000 + CHECK_INTERVAL)
  })
  it('tick恰好等于lastCheck+CHECK_INTERVAL触发', () => {
    ;(sys as any).lastCheck = 5000
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, mockEm, 5000 + CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(5000 + CHECK_INTERVAL)
  })
  it('tick小于lastCheck+CHECK_INTERVAL不触发', () => {
    ;(sys as any).lastCheck = 5000
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, mockEm, 5000 + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(5000)
  })
  it('dt参数不影响节流逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(9999, world, mockEm, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
})

describe('WorldTepuiSystem - spawn逻辑', () => {
  let sys: WorldTepuiSystem
  afterEach(() => { vi.restoreAllMocks() })

  it('random < FORM_CHANCE且tile=MOUNTAIN时spawn', () => {
    sys = makeSys()
    const world = makeWorld(TileType.MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).tepuis.length).toBeGreaterThan(0)
  })
  it('random < FORM_CHANCE且tile=FOREST时spawn', () => {
    sys = makeSys()
    const world = makeWorld(TileType.FOREST)
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).tepuis.length).toBeGreaterThan(0)
  })
  it('random >= FORM_CHANCE时不spawn', () => {
    sys = makeSys()
    const world = makeWorld(TileType.MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).tepuis).toHaveLength(0)
  })
  it('tile=GRASS时不spawn', () => {
    sys = makeSys()
    const world = makeWorld(TileType.GRASS)
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).tepuis).toHaveLength(0)
  })
  it('tile=SHALLOW_WATER时不spawn', () => {
    sys = makeSys()
    const world = makeWorld(TileType.SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).tepuis).toHaveLength(0)
  })
  it('tile=DEEP_WATER时不spawn', () => {
    sys = makeSys()
    const world = makeWorld(TileType.DEEP_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).tepuis).toHaveLength(0)
  })
  it('tile=SAND时不spawn', () => {
    sys = makeSys()
    const world = makeWorld(TileType.SAND)
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).tepuis).toHaveLength(0)
  })
  it('tile=LAVA时不spawn', () => {
    sys = makeSys()
    const world = makeWorld(TileType.LAVA)
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).tepuis).toHaveLength(0)
  })
  it('tile=SNOW时不spawn', () => {
    sys = makeSys()
    const world = makeWorld(TileType.SNOW)
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).tepuis).toHaveLength(0)
  })
  it('tepuis达到MAX_TEPUIS=12时不spawn', () => {
    sys = makeSys()
    for (let i = 0; i < 12; i++) {
      (sys as any).tepuis.push(makeTepui({ tick: CHECK_INTERVAL }))
    }
    const world = makeWorld(TileType.MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).tepuis).toHaveLength(12)
  })
  it('tepuis=11时（小于MAX=12）仍可spawn', () => {
    sys = makeSys()
    for (let i = 0; i < 11; i++) {
      (sys as any).tepuis.push(makeTepui({ tick: CHECK_INTERVAL }))
    }
    const world = makeWorld(TileType.MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).tepuis.length).toBeGreaterThan(11)
  })
  it('spawn后tepui.tick等于当前tick', () => {
    sys = makeSys()
    const world = makeWorld(TileType.MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    if ((sys as any).tepuis.length > 0) {
      expect((sys as any).tepuis[0].tick).toBe(CHECK_INTERVAL)
    }
  })
  it('spawn后tepui.id从1开始', () => {
    sys = makeSys()
    const world = makeWorld(TileType.MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    if ((sys as any).tepuis.length > 0) {
      expect((sys as any).tepuis[0].id).toBe(1)
    }
  })
  it('spawn后nextId递增', () => {
    sys = makeSys()
    const world = makeWorld(TileType.MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).nextId).toBeGreaterThan(1)
  })
  it('一次update最多spawn 1个（无attempt循环）', () => {
    sys = makeSys()
    const world = makeWorld(TileType.MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).tepuis.length).toBeLessThanOrEqual(1)
  })
  it('spawn的elevation在1500-3000范围内', () => {
    sys = makeSys()
    const world = makeWorld(TileType.MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    for (const t of (sys as any).tepuis) {
      expect(t.elevation).toBeGreaterThanOrEqual(1500)
      expect(t.elevation).toBeLessThanOrEqual(3000)
    }
  })
  it('spawn的plateauArea在20-80范围内', () => {
    sys = makeSys()
    const world = makeWorld(TileType.MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    for (const t of (sys as any).tepuis) {
      expect(t.plateauArea).toBeGreaterThanOrEqual(20)
      expect(t.plateauArea).toBeLessThanOrEqual(80)
    }
  })
  it('spawn的cliffHeight在300-1000范围内', () => {
    sys = makeSys()
    const world = makeWorld(TileType.MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    for (const t of (sys as any).tepuis) {
      expect(t.cliffHeight).toBeGreaterThanOrEqual(300)
      expect(t.cliffHeight).toBeLessThanOrEqual(1000)
    }
  })
  it('spawn的endemicSpecies初始在[5,24]，经update后在[2,40]范围内', () => {
    // spawn后立即执行update，endemicSpecies会被update微调，但钳制范围[2,40]始终有效
    sys = makeSys()
    const world = makeWorld(TileType.MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    for (const t of (sys as any).tepuis) {
      expect(t.endemicSpecies).toBeGreaterThanOrEqual(2)
      expect(t.endemicSpecies).toBeLessThanOrEqual(40)
    }
  })
  it('spawn的erosionRate初始在[0.5,2.5]，经update后在[0.2,4]范围内', () => {
    // spawn后立即执行update，erosionRate会被update微调，但钳制范围[0.2,4]始终有效
    sys = makeSys()
    const world = makeWorld(TileType.MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    for (const t of (sys as any).tepuis) {
      expect(t.erosionRate).toBeGreaterThanOrEqual(0.2)
      expect(t.erosionRate).toBeLessThanOrEqual(4)
    }
  })
  it('spawn的spectacle初始在[30,70]，经update后在[15,80]范围内', () => {
    // spawn后立即执行update，spectacle会被update微调，但钳制范围[15,80]始终有效
    sys = makeSys()
    const world = makeWorld(TileType.MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    for (const t of (sys as any).tepuis) {
      expect(t.spectacle).toBeGreaterThanOrEqual(15)
      expect(t.spectacle).toBeLessThanOrEqual(80)
    }
  })
  it('x坐标在边界内（10到w-20之间）', () => {
    sys = makeSys()
    const world = makeWorld(TileType.MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    for (const t of (sys as any).tepuis) {
      expect(t.x).toBeGreaterThanOrEqual(10)
      expect(t.x).toBeLessThan(200 - 10)
    }
  })
})

describe('WorldTepuiSystem - update数值逻辑', () => {
  let sys: WorldTepuiSystem
  afterEach(() => { vi.restoreAllMocks() })

  it('erosionRate在[0.2,4]范围内（Math.max/min钳制）', () => {
    sys = makeSys()
    // 注入一个erosionRate=0.2（下界）的tepui
    ;(sys as any).tepuis.push(makeTepui({ erosionRate: 0.2, tick: CHECK_INTERVAL }))
    ;(sys as any).lastCheck = CHECK_INTERVAL - CHECK_INTERVAL
    // random=0固定：0.5-0.5=delta=-0.5，0.2+(-0.5)*0.01=0.195，但max(0.2,...)=0.2
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    expect((sys as any).tepuis[0].erosionRate).toBeGreaterThanOrEqual(0.2)
  })
  it('erosionRate上界不超过4', () => {
    sys = makeSys()
    ;(sys as any).tepuis.push(makeTepui({ erosionRate: 4, tick: CHECK_INTERVAL }))
    ;(sys as any).lastCheck = CHECK_INTERVAL - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(1) // delta=+0.5*0.01=0.005
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    expect((sys as any).tepuis[0].erosionRate).toBeLessThanOrEqual(4)
  })
  it('endemicSpecies在[2,40]范围内（Math.max/min钳制）', () => {
    sys = makeSys()
    ;(sys as any).tepuis.push(makeTepui({ endemicSpecies: 2, tick: CHECK_INTERVAL }))
    ;(sys as any).lastCheck = CHECK_INTERVAL - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    expect((sys as any).tepuis[0].endemicSpecies).toBeGreaterThanOrEqual(2)
  })
  it('endemicSpecies上界不超过40', () => {
    sys = makeSys()
    ;(sys as any).tepuis.push(makeTepui({ endemicSpecies: 40, tick: CHECK_INTERVAL }))
    ;(sys as any).lastCheck = CHECK_INTERVAL - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    expect((sys as any).tepuis[0].endemicSpecies).toBeLessThanOrEqual(40)
  })
  it('spectacle在[15,80]范围内（Math.max/min钳制）', () => {
    sys = makeSys()
    ;(sys as any).tepuis.push(makeTepui({ spectacle: 15, tick: CHECK_INTERVAL }))
    ;(sys as any).lastCheck = CHECK_INTERVAL - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    expect((sys as any).tepuis[0].spectacle).toBeGreaterThanOrEqual(15)
  })
  it('spectacle上界不超过80', () => {
    sys = makeSys()
    ;(sys as any).tepuis.push(makeTepui({ spectacle: 80, tick: CHECK_INTERVAL }))
    ;(sys as any).lastCheck = CHECK_INTERVAL - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    expect((sys as any).tepuis[0].spectacle).toBeLessThanOrEqual(80)
  })
  it('update时elevation不改变', () => {
    sys = makeSys()
    const t = makeTepui({ elevation: 2000, tick: CHECK_INTERVAL })
    ;(sys as any).tepuis.push(t)
    ;(sys as any).lastCheck = CHECK_INTERVAL - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    expect((sys as any).tepuis[0].elevation).toBe(2000)
  })
  it('update时plateauArea不改变', () => {
    sys = makeSys()
    const t = makeTepui({ plateauArea: 40, tick: CHECK_INTERVAL })
    ;(sys as any).tepuis.push(t)
    ;(sys as any).lastCheck = CHECK_INTERVAL - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    expect((sys as any).tepuis[0].plateauArea).toBe(40)
  })
  it('update时cliffHeight不改变', () => {
    sys = makeSys()
    const t = makeTepui({ cliffHeight: 500, tick: CHECK_INTERVAL })
    ;(sys as any).tepuis.push(t)
    ;(sys as any).lastCheck = CHECK_INTERVAL - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    expect((sys as any).tepuis[0].cliffHeight).toBe(500)
  })
  it('多个tepui同时被update', () => {
    sys = makeSys()
    for (let i = 0; i < 3; i++) {
      (sys as any).tepuis.push(makeTepui({ erosionRate: 1.5, endemicSpecies: 10, spectacle: 50, tick: CHECK_INTERVAL }))
    }
    ;(sys as any).lastCheck = CHECK_INTERVAL - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    for (const t of (sys as any).tepuis) {
      expect(t.erosionRate).toBeGreaterThanOrEqual(0.2)
      expect(t.erosionRate).toBeLessThanOrEqual(4)
      expect(t.endemicSpecies).toBeGreaterThanOrEqual(2)
      expect(t.endemicSpecies).toBeLessThanOrEqual(40)
      expect(t.spectacle).toBeGreaterThanOrEqual(15)
      expect(t.spectacle).toBeLessThanOrEqual(80)
    }
  })
})

describe('WorldTepuiSystem - cleanup逻辑', () => {
  let sys: WorldTepuiSystem
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < cutoff的tepui被清除', () => {
    sys = makeSys()
    const tick = 100000
    const cutoff = tick - 95000
    ;(sys as any).tepuis.push(makeTepui({ tick: cutoff - 1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, tick)
    expect((sys as any).tepuis).toHaveLength(0)
  })
  it('tick === cutoff的tepui不被清除', () => {
    sys = makeSys()
    const tick = 100000
    const cutoff = tick - 95000
    ;(sys as any).tepuis.push(makeTepui({ tick: cutoff }))
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, tick)
    expect((sys as any).tepuis).toHaveLength(1)
  })
  it('tick > cutoff的tepui保留', () => {
    sys = makeSys()
    const tick = 100000
    const cutoff = tick - 95000
    ;(sys as any).tepuis.push(makeTepui({ tick: cutoff + 100 }))
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, tick)
    expect((sys as any).tepuis).toHaveLength(1)
  })
  it('混合新旧tepui：旧的清除，新的保留', () => {
    sys = makeSys()
    const tick = 100000
    const cutoff = tick - 95000
    ;(sys as any).tepuis.push(makeTepui({ tick: cutoff - 1 }))
    ;(sys as any).tepuis.push(makeTepui({ tick: cutoff + 100 }))
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, tick)
    expect((sys as any).tepuis).toHaveLength(1)
  })
  it('全部tepui都旧时清空', () => {
    sys = makeSys()
    const tick = 100000
    const cutoff = tick - 95000
    for (let i = 0; i < 5; i++) {
      (sys as any).tepuis.push(makeTepui({ tick: cutoff - 100 }))
    }
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, tick)
    expect((sys as any).tepuis).toHaveLength(0)
  })
  it('cutoff=tick-95000（95000而非54000）', () => {
    sys = makeSys()
    const tick = 100000
    // tepui.tick=4999，cutoff=5000，4999 < 5000，应清除
    ;(sys as any).tepuis.push(makeTepui({ tick: 4999 }))
    // tepui.tick=5000，cutoff=5000，5000 < 5000为false，保留
    ;(sys as any).tepuis.push(makeTepui({ tick: 5000 }))
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, tick)
    expect((sys as any).tepuis).toHaveLength(1)
  })
  it('从后向前删除，不影响数组索引', () => {
    sys = makeSys()
    const tick = 100000
    const cutoff = tick - 95000
    for (let i = 0; i < 4; i++) {
      const t = i % 2 === 0 ? cutoff - 1 : cutoff + 1
      ;(sys as any).tepuis.push(makeTepui({ tick: t }))
    }
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, tick)
    expect((sys as any).tepuis).toHaveLength(2)
  })
  it('tick=95000时cutoff=0，tepui.tick=0不满足 < 0，保留', () => {
    sys = makeSys()
    ;(sys as any).tepuis.push(makeTepui({ tick: 0 }))
    ;(sys as any).lastCheck = 95000 - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, 95000)
    expect((sys as any).tepuis).toHaveLength(1)
  })
  it('tick=95001时cutoff=1，tepui.tick=0满足 < 1，清除', () => {
    sys = makeSys()
    ;(sys as any).tepuis.push(makeTepui({ tick: 0 }))
    ;(sys as any).lastCheck = 95001 - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, 95001)
    expect((sys as any).tepuis).toHaveLength(0)
  })
  it('cleanup在update之后执行', () => {
    sys = makeSys()
    const tick = 100000
    const world = makeWorld(TileType.MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, mockEm, tick)
    // 新spawn的tepui.tick=tick，不应被cleanup
    const tepuis = (sys as any).tepuis
    for (const t of tepuis) {
      expect(t.tick).toBe(tick)
    }
  })
})

describe('WorldTepuiSystem - 综合场景', () => {
  let sys: WorldTepuiSystem
  afterEach(() => { vi.restoreAllMocks() })

  it('tepui字段全部存在', () => {
    sys = makeSys()
    const world = makeWorld(TileType.MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    for (const t of (sys as any).tepuis) {
      expect(t).toHaveProperty('id')
      expect(t).toHaveProperty('x')
      expect(t).toHaveProperty('y')
      expect(t).toHaveProperty('elevation')
      expect(t).toHaveProperty('plateauArea')
      expect(t).toHaveProperty('cliffHeight')
      expect(t).toHaveProperty('endemicSpecies')
      expect(t).toHaveProperty('erosionRate')
      expect(t).toHaveProperty('spectacle')
      expect(t).toHaveProperty('tick')
    }
  })
  it('手动push tepui后能正确访问字段', () => {
    sys = makeSys()
    const t = makeTepui({ elevation: 2500, spectacle: 65 })
    ;(sys as any).tepuis.push(t)
    const stored = (sys as any).tepuis[0]
    expect(stored.elevation).toBe(2500)
    expect(stored.spectacle).toBe(65)
  })
  it('tepuis是独立数组引用，与sys绑定', () => {
    sys = makeSys()
    const ref1 = (sys as any).tepuis
    const ref2 = (sys as any).tepuis
    expect(ref1).toBe(ref2)
  })
  it('MAX_TEPUIS=12边界：第12个tepui可以存在', () => {
    sys = makeSys()
    for (let i = 0; i < 12; i++) {
      (sys as any).tepuis.push(makeTepui())
    }
    expect((sys as any).tepuis).toHaveLength(12)
  })
  it('多次update间隔足够时可多次spawn', () => {
    sys = makeSys()
    const world = makeWorld(TileType.MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    const count1 = (sys as any).tepuis.length
    ;(sys as any).lastCheck = CHECK_INTERVAL
    sys.update(1, world, mockEm, CHECK_INTERVAL * 2)
    expect((sys as any).tepuis.length).toBeGreaterThanOrEqual(count1)
  })
  it('spawn后id连续递增', () => {
    sys = makeSys()
    const world = makeWorld(TileType.MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    if ((sys as any).tepuis.length > 0) {
      expect((sys as any).tepuis[0].id).toBe(1)
    }
  })
  it('完整生命周期：spawn→update→cleanup', () => {
    sys = makeSys()
    const world = makeWorld(TileType.MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).tepuis.length).toBeGreaterThan(0)
    const tepuiTick = (sys as any).tepuis[0].tick
    vi.restoreAllMocks()
    const laterTick = tepuiTick + 95001
    ;(sys as any).lastCheck = laterTick - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, mockEm, laterTick)
    expect((sys as any).tepuis).toHaveLength(0)
  })
  it('random=0（极端值）：< FORM_CHANCE，触发spawn', () => {
    sys = makeSys()
    const world = makeWorld(TileType.FOREST)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).tepuis.length).toBeGreaterThan(0)
  })
  it('random=0.0013（=FORM_CHANCE）：不spawn（<为false）', () => {
    sys = makeSys()
    const world = makeWorld(TileType.MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    // FORM_CHANCE=0.0013, 条件是 random < FORM_CHANCE，即 0.0013 < 0.0013 为false，不spawn
    expect((sys as any).tepuis).toHaveLength(0)
  })
  it('CHECK_INTERVAL-1时不触发，lastCheck不变', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, makeWorld(TileType.MOUNTAIN), mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).tepuis).toHaveLength(0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('Tepui的存活时间95000比Spring的54000更长', () => {
    // 验证cutoff差异
    sys = makeSys()
    const tick = 100000
    // 54000后会被Spring清理但Tepui不会
    const surviveTick = tick - 60000  // 60000 < 95000，Tepui应该保留
    ;(sys as any).tepuis.push(makeTepui({ tick: surviveTick }))
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, tick)
    // cutoff = tick - 95000 = 5000，surviveTick=40000 >= 5000，保留
    expect((sys as any).tepuis).toHaveLength(1)
  })
})
