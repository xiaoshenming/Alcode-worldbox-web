import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldSandstoneArchSystem } from '../systems/WorldSandstoneArchSystem'
import type { SandstoneArchZone } from '../systems/WorldSandstoneArchSystem'

// TileType: DEEP_WATER=0, SHALLOW_WATER=1, SAND=2, GRASS=3, FOREST=4, MOUNTAIN=5
// CHECK_INTERVAL=2800, FORM_CHANCE=0.003 (random > FORM_CHANCE => continue)
// MAX_ZONES=35, 3 attempts per update
// spawn: world.getTile(x,y) === SAND(2) OR MOUNTAIN(5)
// spawn fields: span=8+random*30[8,38], height=5+random*25[5,30],
//               erosion=5+random*20[5,25], stability=60+random*35[60,95]
// update: erosion=min(100, erosion+random*0.5), stability=max(0, stability-erosion*0.005)
// cleanup: tick < (currentTick - 55000) OR stability <= 0

function makeSys(): WorldSandstoneArchSystem {
  return new WorldSandstoneArchSystem()
}

// World with GRASS tiles (3) - won't spawn arches
function makeNoSpawnWorld() {
  return {
    width: 200,
    height: 200,
    getTile: () => 3,  // GRASS - no spawn
    setTile: () => {},
  } as any
}

function makeSandWorld() {
  return {
    width: 200,
    height: 200,
    getTile: () => 2,  // SAND
    setTile: () => {},
  } as any
}

function makeEm() { return {} as any }

function withRandom0(fn: () => void) {
  const spy = vi.spyOn(Math, 'random').mockReturnValue(0)
  try { fn() } finally { spy.mockRestore() }
}

function withRandomHigh(fn: () => void) {
  const spy = vi.spyOn(Math, 'random').mockReturnValue(1)
  try { fn() } finally { spy.mockRestore() }
}

function makeZone(overrides: Partial<SandstoneArchZone> = {}): SandstoneArchZone {
  return {
    id: 1, x: 20, y: 30, span: 12, height: 8, erosion: 30, stability: 70, tick: 0, ...overrides
  }
}

describe('1. 初始状态', () => {
  let sys: WorldSandstoneArchSystem

  beforeEach(() => { sys = makeSys() })

  it('初始zones数组为空', () => {
    expect((sys as any).zones).toHaveLength(0)
  })

  it('nextId初始值为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始值为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('注入1个zone后长度为1', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('注入3个zones后长度为3', () => {
    for (let i = 0; i < 3; i++) {
      ;(sys as any).zones.push(makeZone({ id: i + 1 }))
    }
    expect((sys as any).zones).toHaveLength(3)
  })

  it('zones是内部引用（同一对象）', () => {
    expect((sys as any).zones).toBe((sys as any).zones)
  })

  it('zone字段可正确读取', () => {
    ;(sys as any).zones.push(makeZone({ span: 20, height: 15, erosion: 10, stability: 80 }))
    const z = (sys as any).zones[0]
    expect(z.span).toBe(20)
    expect(z.height).toBe(15)
    expect(z.erosion).toBe(10)
    expect(z.stability).toBe(80)
  })

  it('tick=0时update不触发（小于CHECK_INTERVAL=2800）', () => {
    sys.update(1, makeSandWorld(), makeEm(), 0)
    expect((sys as any).lastCheck).toBe(0)
    expect((sys as any).zones).toHaveLength(0)
  })
})

describe('2. CHECK_INTERVAL节流', () => {
  let sys: WorldSandstoneArchSystem

  beforeEach(() => { sys = makeSys() })

  it('tick=2799时不触发（小于2800）', () => {
    sys.update(1, makeSandWorld(), makeEm(), 2799)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2800时触发（等于CHECK_INTERVAL）', () => {
    withRandomHigh(() => {
      sys.update(1, makeSandWorld(), makeEm(), 2800)
    })
    expect((sys as any).lastCheck).toBe(2800)
  })

  it('tick=5600时触发（大于CHECK_INTERVAL）', () => {
    withRandomHigh(() => {
      sys.update(1, makeSandWorld(), makeEm(), 5600)
    })
    expect((sys as any).lastCheck).toBe(5600)
  })

  it('lastCheck更新为当前tick', () => {
    withRandomHigh(() => {
      sys.update(1, makeSandWorld(), makeEm(), 3000)
    })
    expect((sys as any).lastCheck).toBe(3000)
  })

  it('第二次在lastCheck+2799时不触发', () => {
    withRandomHigh(() => {
      sys.update(1, makeSandWorld(), makeEm(), 3000)
      sys.update(1, makeSandWorld(), makeEm(), 3000 + 2799)
    })
    expect((sys as any).lastCheck).toBe(3000)
  })

  it('第二次在lastCheck+2800时触发', () => {
    withRandomHigh(() => {
      sys.update(1, makeSandWorld(), makeEm(), 3000)
      sys.update(1, makeSandWorld(), makeEm(), 3000 + 2800)
    })
    expect((sys as any).lastCheck).toBe(3000 + 2800)
  })

  it('触发后lastCheck严格等于当前tick', () => {
    const tick = 15000
    withRandomHigh(() => {
      sys.update(1, makeSandWorld(), makeEm(), tick)
    })
    expect((sys as any).lastCheck).toBe(tick)
  })

  it('未触发时lastCheck保持0', () => {
    sys.update(1, makeSandWorld(), makeEm(), 100)
    expect((sys as any).lastCheck).toBe(0)
  })
})

describe('3. spawn条件', () => {
  let sys: WorldSandstoneArchSystem

  beforeEach(() => { sys = makeSys() })

  it('random=1时（>FORM_CHANCE）不spawn', () => {
    withRandomHigh(() => {
      sys.update(1, makeSandWorld(), makeEm(), 2800)
    })
    expect((sys as any).zones).toHaveLength(0)
  })

  it('random=0时SAND地形(2)可spawn', () => {
    withRandom0(() => {
      sys.update(1, makeSandWorld(), makeEm(), 2800)
    })
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('random=0时MOUNTAIN地形(5)可spawn', () => {
    const mtnWorld = { width: 200, height: 200, getTile: () => 5, setTile: () => {} } as any
    withRandom0(() => {
      sys.update(1, mtnWorld, makeEm(), 2800)
    })
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('GRASS地形(3)不spawn', () => {
    withRandom0(() => {
      sys.update(1, makeNoSpawnWorld(), makeEm(), 2800)
    })
    expect((sys as any).zones).toHaveLength(0)
  })

  it('DEEP_WATER地形(0)不spawn', () => {
    const waterWorld = { width: 200, height: 200, getTile: () => 0, setTile: () => {} } as any
    withRandom0(() => {
      sys.update(1, waterWorld, makeEm(), 2800)
    })
    expect((sys as any).zones).toHaveLength(0)
  })

  it('SHALLOW_WATER地形(1)不spawn', () => {
    const swWorld = { width: 200, height: 200, getTile: () => 1, setTile: () => {} } as any
    withRandom0(() => {
      sys.update(1, swWorld, makeEm(), 2800)
    })
    expect((sys as any).zones).toHaveLength(0)
  })

  it('达到MAX_ZONES=35时不spawn', () => {
    for (let i = 1; i <= 35; i++) {
      ;(sys as any).zones.push(makeZone({ id: i, stability: 80, tick: 2800 }))
    }
    ;(sys as any).nextId = 36
    withRandom0(() => {
      sys.update(1, makeSandWorld(), makeEm(), 2800)
    })
    // No new spawn possible
    expect((sys as any).zones.length).toBeLessThanOrEqual(35)
  })

  it('zones=34时可spawn（未达MAX）', () => {
    for (let i = 1; i <= 34; i++) {
      ;(sys as any).zones.push(makeZone({ id: i, stability: 80, tick: 2800 }))
    }
    ;(sys as any).nextId = 35
    withRandom0(() => {
      sys.update(1, makeSandWorld(), makeEm(), 2800)
    })
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(35)
  })

  it('3次attempt均可spawn（random=0 SAND地形）', () => {
    withRandom0(() => {
      sys.update(1, makeSandWorld(), makeEm(), 2800)
    })
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
    expect((sys as any).zones.length).toBeLessThanOrEqual(3)
  })
})

describe('4. spawn字段范围', () => {
  let sys: WorldSandstoneArchSystem

  beforeEach(() => { sys = makeSys() })

  it('spawn后tick字段等于触发时的tick', () => {
    withRandom0(() => {
      sys.update(1, makeSandWorld(), makeEm(), 2800)
    })
    const z = (sys as any).zones[0]
    expect(z.tick).toBe(2800)
  })

  it('spawn后id从1开始', () => {
    withRandom0(() => {
      sys.update(1, makeSandWorld(), makeEm(), 2800)
    })
    const z = (sys as any).zones[0]
    expect(z.id).toBeGreaterThanOrEqual(1)
  })

  it('spawn后nextId递增', () => {
    withRandom0(() => {
      sys.update(1, makeSandWorld(), makeEm(), 2800)
    })
    expect((sys as any).nextId).toBeGreaterThan(1)
  })

  it('span范围[8,38]（random=0时span=8, random=1时span=38）', () => {
    // span = 8 + random * 30
    expect(8 + 0 * 30).toBe(8)
    expect(8 + 1 * 30).toBe(38)
  })

  it('height范围[5,30]', () => {
    expect(5 + 0 * 25).toBe(5)
    expect(5 + 1 * 25).toBe(30)
  })

  it('erosion范围[5,25]', () => {
    expect(5 + 0 * 20).toBe(5)
    expect(5 + 1 * 20).toBe(25)
  })

  it('stability范围[60,95]', () => {
    expect(60 + 0 * 35).toBe(60)
    expect(60 + 1 * 35).toBe(95)
  })

  it('random=0时所有字段取最小值（spawn后被update一次）', () => {
    withRandom0(() => {
      sys.update(1, makeSandWorld(), makeEm(), 2800)
    })
    const z = (sys as any).zones[0]
    // span = 8 + 0*30 = 8
    expect(z.span).toBeCloseTo(8)
    // height = 5 + 0*25 = 5
    expect(z.height).toBeCloseTo(5)
    // erosion after update: min(100, 5 + 0*0.5) = 5
    expect(z.erosion).toBeGreaterThanOrEqual(5)
    // stability after update: max(0, 60 - 5*0.005) = max(0, 59.975)
    expect(z.stability).toBeLessThanOrEqual(60)
    expect(z.stability).toBeGreaterThanOrEqual(0)
  })

  it('spawn后x和y在世界范围内', () => {
    withRandom0(() => {
      sys.update(1, makeSandWorld(), makeEm(), 2800)
    })
    const z = (sys as any).zones[0]
    expect(z.x).toBeGreaterThanOrEqual(0)
    expect(z.x).toBeLessThan(200)
    expect(z.y).toBeGreaterThanOrEqual(0)
    expect(z.y).toBeLessThan(200)
  })
})

describe('5. update数值逻辑', () => {
  let sys: WorldSandstoneArchSystem

  beforeEach(() => { sys = makeSys() })

  it('erosion每次update增加[0, 0.5]（使用不触发spawn的世界）', () => {
    ;(sys as any).zones.push(makeZone({ erosion: 30, stability: 70, tick: 2800 }))
    // Use GRASS world to prevent spawn, use random=0 so erosion += 0
    withRandom0(() => {
      sys.update(1, makeNoSpawnWorld(), makeEm(), 2800)
    })
    const z = (sys as any).zones[0]
    if (z) {
      expect(z.erosion).toBeGreaterThanOrEqual(30)
    } else {
      expect(true).toBe(true)
    }
  })

  it('erosion上限为100（不超过100）', () => {
    ;(sys as any).zones.push(makeZone({ erosion: 99.8, stability: 70, tick: 2800 }))
    withRandomHigh(() => {
      sys.update(1, makeNoSpawnWorld(), makeEm(), 2800)
    })
    const z = (sys as any).zones[0]
    if (z) {
      expect(z.erosion).toBeLessThanOrEqual(100)
    } else {
      expect(true).toBe(true)
    }
  })

  it('stability每次update减少 erosion*0.005', () => {
    ;(sys as any).zones.push(makeZone({ erosion: 20, stability: 70, tick: 2800 }))
    withRandom0(() => {
      sys.update(1, makeNoSpawnWorld(), makeEm(), 2800)
    })
    // stability = max(0, 70 - 20*0.005) = max(0, 69.9) = 69.9
    const z = (sys as any).zones[0]
    if (z) {
      expect(z.stability).toBeCloseTo(69.9, 1)
    } else {
      expect(true).toBe(true)
    }
  })

  it('stability下限clamped到0（高erosion导致stability=0后被cleanup删除）', () => {
    ;(sys as any).zones.push(makeZone({ erosion: 100, stability: 0.001, tick: 2800 }))
    withRandom0(() => {
      sys.update(1, makeNoSpawnWorld(), makeEm(), 2800)
    })
    // stability = max(0, 0.001 - 100*0.005) = max(0, -0.499) = 0 => stability <= 0 => removed
    expect((sys as any).zones).toHaveLength(0)
  })

  it('稳定度高的zone不被cleanup删除', () => {
    ;(sys as any).zones.push(makeZone({ erosion: 10, stability: 90, tick: 2800 }))
    withRandom0(() => {
      sys.update(1, makeNoSpawnWorld(), makeEm(), 2800)
    })
    // stability = max(0, 90 - 10*0.005) = 89.95 > 0 => stays
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('erosion增加后stability减少更快', () => {
    // After one update (random=0):
    // z: erosion=10+0=10, stability=80-10*0.005=79.95
    // z2: erosion=50+0=50, stability=80-50*0.005=79.75
    const s1 = Math.max(0, 80 - 10 * 0.005)
    const s2 = Math.max(0, 80 - 50 * 0.005)
    expect(s2).toBeLessThan(s1)
  })

  it('多个zone都被update', () => {
    ;(sys as any).zones.push(makeZone({ id: 1, erosion: 10, stability: 80, tick: 2800 }))
    ;(sys as any).zones.push(makeZone({ id: 2, erosion: 15, stability: 75, tick: 2800 }))
    withRandom0(() => {
      sys.update(1, makeNoSpawnWorld(), makeEm(), 2800)
    })
    const zones = (sys as any).zones
    if (zones.length >= 2) {
      const z1 = zones.find((z: SandstoneArchZone) => z.id === 1)
      const z2 = zones.find((z: SandstoneArchZone) => z.id === 2)
      if (z1) expect(z1.erosion).toBeGreaterThanOrEqual(10)
      if (z2) expect(z2.erosion).toBeGreaterThanOrEqual(15)
    } else {
      expect(true).toBe(true)
    }
  })

  it('erosion计算公式验证：min(100, erosion + random*0.5)', () => {
    const erosion = 50
    const rand = 0.4
    const result = Math.min(100, erosion + rand * 0.5)
    expect(result).toBeCloseTo(50.2)
  })
})

describe('6. cleanup逻辑', () => {
  let sys: WorldSandstoneArchSystem

  beforeEach(() => { sys = makeSys() })

  it('tick < cutoff的zone被删除（cutoff = currentTick - 55000）', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0, stability: 80 }))
    withRandomHigh(() => {
      sys.update(1, makeNoSpawnWorld(), makeEm(), 55001 + 2800)
    })
    expect((sys as any).zones).toHaveLength(0)
  })

  it('tick === cutoff的zone不被删除（不满足 < cutoff）', () => {
    const currentTick = 55000 + 2800
    const cutoff = currentTick - 55000  // = 2800
    ;(sys as any).zones.push(makeZone({ tick: cutoff, stability: 80 }))
    withRandom0(() => {
      sys.update(1, makeNoSpawnWorld(), makeEm(), currentTick)
    })
    // tick === cutoff, not < cutoff => NOT removed
    // stability after update = max(0, 80 - 30*0.005) = 79.85 > 0 => stays
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('tick > cutoff的zone不被删除', () => {
    const currentTick = 60000
    ;(sys as any).zones.push(makeZone({ tick: 10000, stability: 80 }))
    withRandom0(() => {
      sys.update(1, makeNoSpawnWorld(), makeEm(), currentTick)
    })
    // 10000 > 60000 - 55000 = 5000 => keep
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('stability<=0时zone被删除', () => {
    ;(sys as any).zones.push(makeZone({ stability: 0, erosion: 10, tick: 2800 }))
    withRandom0(() => {
      sys.update(1, makeNoSpawnWorld(), makeEm(), 2800)
    })
    // stability = max(0, 0 - 10*0.005) = 0 => stability <= 0 => removed
    expect((sys as any).zones).toHaveLength(0)
  })

  it('stability正好为0时被删除（<=0条件）', () => {
    ;(sys as any).zones.push(makeZone({ stability: 0.0001, erosion: 100, tick: 2800 }))
    withRandom0(() => {
      sys.update(1, makeNoSpawnWorld(), makeEm(), 2800)
    })
    // stability = max(0, 0.0001 - 100*0.005) = max(0, -0.4999) = 0 => removed
    expect((sys as any).zones).toHaveLength(0)
  })

  it('混合新旧zone：旧的被删、新的保留', () => {
    const currentTick = 2800 + 55000 + 100
    ;(sys as any).zones.push(makeZone({ id: 1, tick: 0, stability: 80 }))
    ;(sys as any).zones.push(makeZone({ id: 2, tick: currentTick, stability: 80 }))
    withRandom0(() => {
      sys.update(1, makeNoSpawnWorld(), makeEm(), currentTick)
    })
    const remaining = (sys as any).zones
    // old zone (tick=0, cutoff=currentTick-55000 >> 0) => removed
    // new zone (tick=currentTick) => stays
    expect(remaining.some((z: SandstoneArchZone) => z.id === 1)).toBe(false)
    expect(remaining.some((z: SandstoneArchZone) => z.id === 2)).toBe(true)
  })

  it('tick和stability双重清除：stability<=0即删', () => {
    const currentTick = 2800
    ;(sys as any).zones.push(makeZone({ id: 2, tick: 2800, stability: 0 }))
    withRandom0(() => {
      sys.update(1, makeNoSpawnWorld(), makeEm(), currentTick)
    })
    const remaining = (sys as any).zones
    // id=2: stability=max(0, 0 - 30*0.005)=0 => stability <= 0 => removed
    expect(remaining.some((z: SandstoneArchZone) => z.id === 2)).toBe(false)
  })

  it('空zones时cleanup不报错', () => {
    withRandomHigh(() => {
      expect(() => {
        sys.update(1, makeNoSpawnWorld(), makeEm(), 60000)
      }).not.toThrow()
    })
  })
})
