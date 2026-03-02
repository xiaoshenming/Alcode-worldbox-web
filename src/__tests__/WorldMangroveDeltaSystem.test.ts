import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldMangroveDeltaSystem } from '../systems/WorldMangroveDeltaSystem'
import type { MangroveDelta } from '../systems/WorldMangroveDeltaSystem'

// CHECK_INTERVAL=2700, FORM_CHANCE=0.002, MAX_DELTAS=20
// spawn条件: tile===SHALLOW_WATER(1) || tile===SAND(2)
// 动态update: mangrovesDensity+0.012(cap90), sedimentDeposit+0.008(cap80),
//             biodiversity+0.01(cap95), tidalRange±0.15(clamp[2,30]),
//             salinity±0.1(clamp[5,45])
// cleanup: cutoff = tick - 90000, delta.tick < cutoff => 删除

const em = {} as any

function makeSys(): WorldMangroveDeltaSystem {
  return new WorldMangroveDeltaSystem()
}

let idSeq = 1
function makeDelta(overrides: Partial<MangroveDelta> = {}): MangroveDelta {
  return {
    id: idSeq++,
    x: 25, y: 35,
    radius: 6,
    mangrovesDensity: 50,
    sedimentDeposit: 30,
    tidalRange: 10,
    biodiversity: 50,
    salinity: 20,
    tick: 0,
    ...overrides,
  }
}

// 安全world: getTile返回GRASS(3) => 不满足SHALLOW_WATER||SAND条件
const GRASS_WORLD = { width: 200, height: 200, getTile: () => 3 } as any

// spawn允许world: getTile返回SHALLOW_WATER(1)
function makeShallowWaterWorld(): any {
  return { width: 200, height: 200, getTile: () => 1 }
}

// spawn允许world: getTile返回SAND(2)
function makeSandSpawnWorld(): any {
  return { width: 200, height: 200, getTile: () => 2 }
}

// ─── 1. 初始状态 ────────────────────────���──────────────────────────────────────
describe('WorldMangroveDeltaSystem — 初始状态', () => {
  let sys: WorldMangroveDeltaSystem
  beforeEach(() => { sys = makeSys(); idSeq = 1 })

  it('初始deltas数组为空', () => {
    expect((sys as any).deltas).toHaveLength(0)
  })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('手动注入delta后length==1', () => {
    ;(sys as any).deltas.push(makeDelta())
    expect((sys as any).deltas).toHaveLength(1)
  })

  it('deltas是同一个引用', () => {
    expect((sys as any).deltas).toBe((sys as any).deltas)
  })

  it('delta字段类型正确', () => {
    const d = makeDelta()
    expect(typeof d.mangrovesDensity).toBe('number')
    expect(typeof d.sedimentDeposit).toBe('number')
    expect(typeof d.tidalRange).toBe('number')
    expect(typeof d.biodiversity).toBe('number')
    expect(typeof d.salinity).toBe('number')
  })
})

// ─── 2. CHECK_INTERVAL 节流 ───────────────────────────────────────────────────
describe('WorldMangroveDeltaSystem — CHECK_INTERVAL节流', () => {
  let sys: WorldMangroveDeltaSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时跳过(0-0<2700)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, GRASS_WORLD, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2699时跳过(差值2699<2700)', () => {
    sys.update(0, GRASS_WORLD, em, 2699)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2700时执行，lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, GRASS_WORLD, em, 2700)
    expect((sys as any).lastCheck).toBe(2700)
  })

  it('执行后tick=5399时不执行(5399-2700=2699<2700)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, GRASS_WORLD, em, 2700)
    sys.update(0, GRASS_WORLD, em, 5399)
    expect((sys as any).lastCheck).toBe(2700)
  })

  it('tick=5400时再次执行(5400-2700=2700)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, GRASS_WORLD, em, 2700)
    sys.update(0, GRASS_WORLD, em, 5400)
    expect((sys as any).lastCheck).toBe(5400)
  })

  it('节流期间手动注入的delta不受影响', () => {
    sys.update(0, GRASS_WORLD, em, 2700)
    ;(sys as any).deltas.push(makeDelta())
    sys.update(0, GRASS_WORLD, em, 2701)  // 节流跳过
    expect((sys as any).deltas).toHaveLength(1)
  })
})

// ─── 3. spawn条件 ─────────────────────────────────────────────────────────────
describe('WorldMangroveDeltaSystem — spawn条件', () => {
  let sys: WorldMangroveDeltaSystem
  afterEach(() => { vi.restoreAllMocks() })

  it('GRASS世界(tile=3)不spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, GRASS_WORLD, em, 2700)
    expect((sys as any).deltas).toHaveLength(0)
  })

  it('SHALLOW_WATER(1)+random<FORM_CHANCE(0.002)时spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeShallowWaterWorld(), em, 2700)
    expect((sys as any).deltas).toHaveLength(1)
  })

  it('SAND(2)+random<FORM_CHANCE时spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeSandSpawnWorld(), em, 2700)
    expect((sys as any).deltas).toHaveLength(1)
  })

  it('random>=FORM_CHANCE(0.002)时不spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, makeShallowWaterWorld(), em, 2700)
    expect((sys as any).deltas).toHaveLength(0)
  })

  it('MOUNTAIN(5)不spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const mountainWorld = { width: 200, height: 200, getTile: () => 5 }
    sys.update(0, mountainWorld as any, em, 2700)
    expect((sys as any).deltas).toHaveLength(0)
  })

  it('deltas达到MAX_DELTAS(20)时不再spawn', () => {
    sys = makeSys()
    for (let i = 0; i < 20; i++) {
      ;(sys as any).deltas.push(makeDelta({ id: i + 1 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeShallowWaterWorld(), em, 2700)
    expect((sys as any).deltas).toHaveLength(20)
  })

  it('deltas=19时可spawn至20', () => {
    sys = makeSys()
    for (let i = 0; i < 19; i++) {
      ;(sys as any).deltas.push(makeDelta({ id: i + 1 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeShallowWaterWorld(), em, 2700)
    expect((sys as any).deltas).toHaveLength(20)
  })
})

// ─── 4. spawn后字段范围 ───────────────────────────────────────────────────────
describe('WorldMangroveDeltaSystem — 字段范围', () => {
  let sys: WorldMangroveDeltaSystem
  afterEach(() => { vi.restoreAllMocks() })

  function spawnOneDelta(randomVal = 0.5): MangroveDelta {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(randomVal)
    sys.update(0, makeShallowWaterWorld(), em, 2700)
    return (sys as any).deltas[0]
  }

  it('radius在[4,8]范围内(4+floor(random*5))', () => {
    // 注意: random=0.001 => radius=4+floor(0.001*5)=4
    const d = spawnOneDelta(0.001)
    if (d) {
      expect(d.radius).toBeGreaterThanOrEqual(4)
      expect(d.radius).toBeLessThanOrEqual(8)
    }
  })

  it('mangrovesDensity在[20,60]范围内', () => {
    const d = spawnOneDelta(0.001)
    if (d) {
      expect(d.mangrovesDensity).toBeGreaterThanOrEqual(20)
      expect(d.mangrovesDensity).toBeLessThanOrEqual(60)
    }
  })

  it('sedimentDeposit在[10,40]范围内', () => {
    const d = spawnOneDelta(0.001)
    if (d) {
      expect(d.sedimentDeposit).toBeGreaterThanOrEqual(10)
      expect(d.sedimentDeposit).toBeLessThanOrEqual(40)
    }
  })

  it('tidalRange在clamp范围[2,30]内(spawn初始[5,25]，update后随机波动可能略低于5但被clamp至2)', () => {
    const d = spawnOneDelta(0.001)
    if (d) {
      // spawn: 5+random*20; update: clamp(2, 30, val±0.15) => 下限为2，上限为30
      expect(d.tidalRange).toBeGreaterThanOrEqual(2)
      expect(d.tidalRange).toBeLessThanOrEqual(30)
    }
  })

  it('biodiversity在[30,70]范围内', () => {
    const d = spawnOneDelta(0.001)
    if (d) {
      expect(d.biodiversity).toBeGreaterThanOrEqual(30)
      expect(d.biodiversity).toBeLessThanOrEqual(70)
    }
  })

  it('salinity在clamp范围[5,45]内(spawn初始[15,40]，update后随机波动可能略低于15但被clamp至5)', () => {
    const d = spawnOneDelta(0.001)
    if (d) {
      // spawn: 15+random*25; update: clamp(5, 45, val±0.1) => 下限为5，上限为45
      expect(d.salinity).toBeGreaterThanOrEqual(5)
      expect(d.salinity).toBeLessThanOrEqual(45)
    }
  })
})

// ─── 5. 动态update ────────────────────────────────────────────────────────────
describe('WorldMangroveDeltaSystem — 动态update', () => {
  let sys: WorldMangroveDeltaSystem
  beforeEach(() => { sys = makeSys(); idSeq = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('mangrovesDensity每次update增加0.012', () => {
    ;(sys as any).deltas.push(makeDelta({ mangrovesDensity: 50, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, GRASS_WORLD, em, 2700)
    expect((sys as any).deltas[0].mangrovesDensity).toBeCloseTo(50.012, 5)
  })

  it('mangrovesDensity上限钳制为90', () => {
    ;(sys as any).deltas.push(makeDelta({ mangrovesDensity: 89.995, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, GRASS_WORLD, em, 2700)
    expect((sys as any).deltas[0].mangrovesDensity).toBeLessThanOrEqual(90)
  })

  it('sedimentDeposit每次update增加0.008', () => {
    ;(sys as any).deltas.push(makeDelta({ sedimentDeposit: 30, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, GRASS_WORLD, em, 2700)
    expect((sys as any).deltas[0].sedimentDeposit).toBeCloseTo(30.008, 5)
  })

  it('sedimentDeposit上限钳制为80', () => {
    ;(sys as any).deltas.push(makeDelta({ sedimentDeposit: 80, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, GRASS_WORLD, em, 2700)
    expect((sys as any).deltas[0].sedimentDeposit).toBe(80)
  })

  it('biodiversity每次update增加0.01', () => {
    ;(sys as any).deltas.push(makeDelta({ biodiversity: 50, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, GRASS_WORLD, em, 2700)
    expect((sys as any).deltas[0].biodiversity).toBeCloseTo(50.01, 5)
  })

  it('biodiversity上限钳制为95', () => {
    ;(sys as any).deltas.push(makeDelta({ biodiversity: 95, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, GRASS_WORLD, em, 2700)
    expect((sys as any).deltas[0].biodiversity).toBe(95)
  })

  it('tidalRange不低于2(下限钳制)', () => {
    ;(sys as any).deltas.push(makeDelta({ tidalRange: 2, tick: 0 }))
    // random=0 => Math.random()-0.5=-0.5 => 变化-0.15 => 理论上2-0.15=1.85 被钳制为2
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, GRASS_WORLD, em, 2700)
    expect((sys as any).deltas[0].tidalRange).toBeGreaterThanOrEqual(2)
  })

  it('tidalRange不超过30(上限钳制)', () => {
    ;(sys as any).deltas.push(makeDelta({ tidalRange: 30, tick: 0 }))
    // random=1 => Math.random()-0.5=0.5 => 变化+0.15 => 理论30.15 被钳制为30
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, GRASS_WORLD, em, 2700)
    expect((sys as any).deltas[0].tidalRange).toBeLessThanOrEqual(30)
  })

  it('salinity不低于5(下限钳制)', () => {
    ;(sys as any).deltas.push(makeDelta({ salinity: 5, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, GRASS_WORLD, em, 2700)
    expect((sys as any).deltas[0].salinity).toBeGreaterThanOrEqual(5)
  })

  it('salinity不超过45(上限钳制)', () => {
    ;(sys as any).deltas.push(makeDelta({ salinity: 45, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, GRASS_WORLD, em, 2700)
    expect((sys as any).deltas[0].salinity).toBeLessThanOrEqual(45)
  })
})

// ─── 6. cleanup逻辑 ───────────────────────────────────────────────────────────
describe('WorldMangroveDeltaSystem — cleanup逻辑', () => {
  let sys: WorldMangroveDeltaSystem
  beforeEach(() => { sys = makeSys(); idSeq = 100 })
  afterEach(() => { vi.restoreAllMocks() })

  it('delta.tick==cutoff时不删除(严格小于)', () => {
    // tick=90000 => cutoff=0, delta.tick=0, 0<0=false => 保留
    ;(sys as any).deltas.push(makeDelta({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, GRASS_WORLD, em, 90000)
    expect((sys as any).deltas).toHaveLength(1)
  })

  it('delta.tick<cutoff时删除', () => {
    // tick=90001 => cutoff=1, delta.tick=0, 0<1=true => 删除
    ;(sys as any).deltas.push(makeDelta({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, GRASS_WORLD, em, 90001)
    expect((sys as any).deltas).toHaveLength(0)
  })

  it('delta.tick恰好在cutoff上边界时保留', () => {
    ;(sys as any).deltas.push(makeDelta({ tick: 1000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // tick=91000 => cutoff=1000, delta.tick=1000, 1000<1000=false => 保留
    sys.update(0, GRASS_WORLD, em, 91000)
    expect((sys as any).deltas).toHaveLength(1)
  })

  it('delta.tick=999, tick=91000时删除(cutoff=1000, 999<1000=true)', () => {
    ;(sys as any).deltas.push(makeDelta({ tick: 999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, GRASS_WORLD, em, 91000)
    expect((sys as any).deltas).toHaveLength(0)
  })

  it('混合: 旧delta删除，新delta保留', () => {
    ;(sys as any).deltas.push(makeDelta({ tick: 0 }))      // 过期
    ;(sys as any).deltas.push(makeDelta({ tick: 80000 }))  // 保留
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // tick=90001 => cutoff=1, 0<1=>删, 80000<1=>不删
    sys.update(0, GRASS_WORLD, em, 90001)
    expect((sys as any).deltas).toHaveLength(1)
    expect((sys as any).deltas[0].tick).toBe(80000)
  })

  it('全部过期时清空deltas', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).deltas.push(makeDelta({ tick: i }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // tick=100000 => cutoff=10000, 所有tick(0-4)<10000 => 全删
    sys.update(0, GRASS_WORLD, em, 100000)
    expect((sys as any).deltas).toHaveLength(0)
  })

  it('都是新鲜delta时不删除', () => {
    ;(sys as any).deltas.push(makeDelta({ tick: 80000 }))
    ;(sys as any).deltas.push(makeDelta({ tick: 85000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // tick=90000 => cutoff=0, 80000<0=false, 85000<0=false => 都保留
    sys.update(0, GRASS_WORLD, em, 90000)
    expect((sys as any).deltas).toHaveLength(2)
  })
})
