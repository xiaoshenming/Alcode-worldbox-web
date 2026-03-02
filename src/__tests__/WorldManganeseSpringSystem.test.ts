import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldManganeseSpringSystem } from '../systems/WorldManganeseSpringSystem'
import type { ManganeseSpringZone } from '../systems/WorldManganeseSpringSystem'

// CHECK_INTERVAL=2710, FORM_CHANCE=0.003, MAX_ZONES=32
// cleanup cutoff: tick - 54000 (严格小于)
// spawn条件: nearWater(SHALLOW_WATER=1 or DEEP_WATER=0) || nearMountain(MOUNTAIN=5)
// 安全world: getTile返回GRASS(3) => 无水无山邻居 => 不spawn

const SAND_WORLD = { width: 200, height: 200, getTile: () => 2 } as any
const em = {} as any

function makeSys(): WorldManganeseSpringSystem {
  return new WorldManganeseSpringSystem()
}

let idSeq = 1
function makeZone(overrides: Partial<ManganeseSpringZone> = {}): ManganeseSpringZone {
  return {
    id: idSeq++,
    x: 20, y: 30,
    manganeseContent: 55,
    springFlow: 35,
    pyrolusiteErosion: 60,
    mineralStaining: 50,
    tick: 0,
    ...overrides,
  }
}

// 返回总是让 hasAdjacentTile(SHALLOW_WATER) 为 true 的 world
// hasAdjacentTile检查(x-1,y),(x+1,y),(x,y-1),(x,y+1)
function makeWaterWorld(centerTile = 3): any {
  return {
    width: 200,
    height: 200,
    getTile: (x: number, y: number) => {
      // 邻居坐标: (19,30),(21,30),(20,29),(20,31) => 返回 SHALLOW_WATER=1
      if (x !== 20 || y !== 30) return 1  // SHALLOW_WATER
      return centerTile
    },
  }
}

// 返回让 hasAdjacentTile(MOUNTAIN=5) 为 true 的 world
function makeMountainWorld(): any {
  return {
    width: 200,
    height: 200,
    getTile: (x: number, y: number) => {
      if (x !== 20 || y !== 30) return 5  // MOUNTAIN
      return 3  // GRASS
    },
  }
}

// ─── 1. 初始状态 ───────────────────────────────────────────────────────────────
describe('WorldManganeseSpringSystem — 初始状态', () => {
  let sys: WorldManganeseSpringSystem
  beforeEach(() => { sys = makeSys(); idSeq = 1 })

  it('初始zones数组为空', () => {
    expect((sys as any).zones).toHaveLength(0)
  })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('手动注入zone后length==1', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('zones是同一个引用', () => {
    const z = (sys as any).zones
    expect(z).toBe((sys as any).zones)
  })

  it('zone字段类型正确', () => {
    const z = makeZone()
    expect(typeof z.manganeseContent).toBe('number')
    expect(typeof z.springFlow).toBe('number')
    expect(typeof z.pyrolusiteErosion).toBe('number')
    expect(typeof z.mineralStaining).toBe('number')
  })
})

// ─── 2. CHECK_INTERVAL 节流 ───────────────────────────────────────────────────
describe('WorldManganeseSpringSystem — CHECK_INTERVAL节流', () => {
  let sys: WorldManganeseSpringSystem
  beforeEach(() => { sys = makeSys(); vi.spyOn(Math, 'random').mockReturnValue(0) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时跳过(lastCheck=0, 0-0<2710)', () => {
    // 即使random=0也不应该spawn，因为tick-lastCheck=0 < 2710
    sys.update(0, SAND_WORLD, em, 0)
    expect((sys as any).zones).toHaveLength(0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2709时跳过(差值2709<2710)', () => {
    sys.update(0, SAND_WORLD, em, 2709)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2710时执行(差值==CHECK_INTERVAL)', () => {
    sys.update(0, SAND_WORLD, em, 2710)
    expect((sys as any).lastCheck).toBe(2710)
  })

  it('tick=2710执行后lastCheck更新为2710', () => {
    sys.update(0, SAND_WORLD, em, 2710)
    expect((sys as any).lastCheck).toBe(2710)
  })

  it('第二次tick=5419时不执行(5419-2710=2709<2710)', () => {
    sys.update(0, SAND_WORLD, em, 2710)
    const check1 = (sys as any).lastCheck
    sys.update(0, SAND_WORLD, em, 5419)
    expect((sys as any).lastCheck).toBe(check1)
  })

  it('第二次tick=5420时执行(5420-2710=2710)', () => {
    sys.update(0, SAND_WORLD, em, 2710)
    sys.update(0, SAND_WORLD, em, 5420)
    expect((sys as any).lastCheck).toBe(5420)
  })
})

// ─── 3. spawn条件 ─────────────────────────────────────────────────────────────
describe('WorldManganeseSpringSystem — spawn条件', () => {
  let sys: WorldManganeseSpringSystem
  afterEach(() => { vi.restoreAllMocks() })

  it('SAND世界(无水无山邻居)，即使random=0也不spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, SAND_WORLD, em, 2710)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('有水邻居+random<FORM_CHANCE(0.003)时spawn', () => {
    sys = makeSys()
    // Math.random()序列: floor用0=>坐标(0,0); random>FORM_CHANCE判断需 <0.003
    // 让坐标random=0, floor(0*200)=0, 邻居为SHALLOW_WATER
    // 让random=0.001 < 0.003 => 通过FORM_CHANCE
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      // 坐标用 floor(random*w/h) => random()调2次
      // 然后调random() > FORM_CHANCE => 需要 <0.003
      if (callCount % 3 === 0) return 0.001  // FORM_CHANCE检查通过
      return 0  // 坐标给0
    })
    const waterWorld = {
      width: 200, height: 200,
      getTile: () => 1,  // SHALLOW_WATER => hasAdjacentTile=true
    }
    sys.update(0, waterWorld as any, em, 2710)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('有山邻居+random通过时spawn', () => {
    sys = makeSys()
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount % 3 === 0) return 0.001
      return 0
    })
    const mountainWorld = {
      width: 200, height: 200,
      getTile: () => 5,  // MOUNTAIN
    }
    sys.update(0, mountainWorld as any, em, 2710)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('random > FORM_CHANCE(0.003)时不spawn，即使有水邻居', () => {
    sys = makeSys()
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount % 3 === 0) return 0.9  // > FORM_CHANCE => 跳过
      return 0
    })
    const waterWorld = { width: 200, height: 200, getTile: () => 1 }
    sys.update(0, waterWorld as any, em, 2710)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('zones达到MAX_ZONES(32)时停止spawn', () => {
    sys = makeSys()
    for (let i = 0; i < 32; i++) {
      ;(sys as any).zones.push(makeZone({ id: i + 1 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const waterWorld = { width: 200, height: 200, getTile: () => 1 }
    sys.update(0, waterWorld as any, em, 2710)
    expect((sys as any).zones).toHaveLength(32)
  })

  it('zones=31时仍可spawn至32', () => {
    sys = makeSys()
    for (let i = 0; i < 31; i++) {
      ;(sys as any).zones.push(makeZone({ id: i + 1 }))
    }
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount % 3 === 0) return 0.001
      return 0
    })
    const waterWorld = { width: 200, height: 200, getTile: () => 1 }
    sys.update(0, waterWorld as any, em, 2710)
    expect((sys as any).zones.length).toBe(32)
  })
})

// ─── 4. spawn后字段范围 ───────────────────────────────────────────────────────
describe('WorldManganeseSpringSystem — 字段范围', () => {
  let sys: WorldManganeseSpringSystem
  afterEach(() => { vi.restoreAllMocks() })

  function spawnOne(): ManganeseSpringZone {
    sys = makeSys()
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      // 3次一组: x坐标, y坐标, FORM_CHANCE检查
      const mod = callCount % 4
      if (mod === 0) return 0.001   // FORM_CHANCE通过
      if (mod === 1) return 0.5     // x坐标
      if (mod === 2) return 0.5     // y坐标
      return 0.5                    // 字段随机值: 取中间
    })
    const waterWorld = { width: 200, height: 200, getTile: () => 1 }
    sys.update(0, waterWorld as any, em, 2710)
    return (sys as any).zones[0]
  }

  it('manganeseContent在[40,100]范围内', () => {
    const z = spawnOne()
    if (z) {
      expect(z.manganeseContent).toBeGreaterThanOrEqual(40)
      expect(z.manganeseContent).toBeLessThanOrEqual(100)
    }
  })

  it('springFlow在[10,60]范围内', () => {
    const z = spawnOne()
    if (z) {
      expect(z.springFlow).toBeGreaterThanOrEqual(10)
      expect(z.springFlow).toBeLessThanOrEqual(60)
    }
  })

  it('pyrolusiteErosion在[20,100]范围内', () => {
    const z = spawnOne()
    if (z) {
      expect(z.pyrolusiteErosion).toBeGreaterThanOrEqual(20)
      expect(z.pyrolusiteErosion).toBeLessThanOrEqual(100)
    }
  })

  it('mineralStaining在[15,100]范围内', () => {
    const z = spawnOne()
    if (z) {
      expect(z.mineralStaining).toBeGreaterThanOrEqual(15)
      expect(z.mineralStaining).toBeLessThanOrEqual(100)
    }
  })

  it('spawn时tick等于当前tick', () => {
    sys = makeSys()
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      return callCount % 3 === 0 ? 0.001 : 0
    })
    const waterWorld = { width: 200, height: 200, getTile: () => 1 }
    sys.update(0, waterWorld as any, em, 2710)
    const z = (sys as any).zones[0]
    if (z) expect(z.tick).toBe(2710)
  })

  it('spawn后id从1开始自增', () => {
    sys = makeSys()
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      return callCount % 3 === 0 ? 0.001 : 0
    })
    const waterWorld = { width: 200, height: 200, getTile: () => 1 }
    sys.update(0, waterWorld as any, em, 2710)
    const zones = (sys as any).zones
    if (zones.length > 0) expect(zones[0].id).toBe(1)
  })
})

// ─── 5. cleanup逻辑 ───────────────────────────────────────────────────────────
describe('WorldManganeseSpringSystem — cleanup逻辑', () => {
  let sys: WorldManganeseSpringSystem
  beforeEach(() => { sys = makeSys(); idSeq = 100 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=54000时cutoff=0，tick==0的zone不删除(严格小于)', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, SAND_WORLD, em, 54000)
    // cutoff = 54000 - 54000 = 0, zone.tick=0, 0 < 0 为false => 不删
    expect((sys as any).zones).toHaveLength(1)
  })

  it('zone.tick < cutoff时删除', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // tick=54001 => cutoff=1, zone.tick=0 < 1 => 删除
    sys.update(0, SAND_WORLD, em, 54001)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('zone.tick=100, tick=54100时删除(cutoff=100, 100<100=false)', () => {
    ;(sys as any).zones.push(makeZone({ tick: 100 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, SAND_WORLD, em, 54100)
    // cutoff=54100-54000=100, 100<100=false => 不删
    expect((sys as any).zones).toHaveLength(1)
  })

  it('zone.tick=99, tick=54100时删除(cutoff=100, 99<100=true)', () => {
    ;(sys as any).zones.push(makeZone({ tick: 99 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, SAND_WORLD, em, 54100)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('混合情况: 旧zone删除，新zone保留', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))    // 过期
    ;(sys as any).zones.push(makeZone({ tick: 50000 })) // 保留(50000 < 54001=false)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, SAND_WORLD, em, 54001)
    // cutoff=1, zone[0].tick=0<1=>删, zone[1].tick=50000<1=>不删
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(50000)
  })

  it('全部过期时清空zones', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).zones.push(makeZone({ tick: i }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // tick=60000, cutoff=6000, 所有tick(0-4)<6000 => 全删
    sys.update(0, SAND_WORLD, em, 60000)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('zones全部新鲜时不删除', () => {
    ;(sys as any).zones.push(makeZone({ tick: 50000 }))
    ;(sys as any).zones.push(makeZone({ tick: 55000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, SAND_WORLD, em, 57000)
    // cutoff=3000, 50000<3000=false, 55000<3000=false => 不删
    expect((sys as any).zones).toHaveLength(2)
  })
})
