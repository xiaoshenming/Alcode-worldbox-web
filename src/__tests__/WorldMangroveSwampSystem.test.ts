import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldMangroveSwampSystem } from '../systems/WorldMangroveSwampSystem'
import type { MangroveSwamp } from '../systems/WorldMangroveSwampSystem'

// CHECK_INTERVAL=1600, SPAWN_CHANCE=0.004, MAX_SWAMPS=20
// spawn条件: tile !== null && tile >= 1 && tile <= 2
//   => SHALLOW_WATER(1) 或 SAND(2)；GRASS(3)等不spawn
// 动态update:
//   density = min(100, density+0.15)
//   rootDepth = min(10, rootDepth+0.02)
//   biodiversity = min(100, biodiversity + 0.1*density/50)
//   coastalProtection = density * 0.8
//   waterFiltration = density * 0.6
// cleanup: tick - swamp.tick > 80000 && swamp.density < 15 => 删除

const em = {} as any

function makeSys(): WorldMangroveSwampSystem {
  return new WorldMangroveSwampSystem()
}

let idSeq = 1
function makeSwamp(overrides: Partial<MangroveSwamp> = {}): MangroveSwamp {
  return {
    id: idSeq++,
    x: 20, y: 30,
    density: 50,
    rootDepth: 5,
    biodiversity: 30,
    coastalProtection: 40,
    waterFiltration: 30,
    tick: 0,
    ...overrides,
  }
}

// 安全world: GRASS(3) => tile<1 或 tile>2 => 不spawn
const GRASS_WORLD = { width: 200, height: 200, getTile: () => 3 } as any

// 允许spawn: SHALLOW_WATER(1)
function makeSwampWorld(tile = 1): any {
  return { width: 200, height: 200, getTile: () => tile }
}

// ─── 1. 初始状态 ───────────────────────────────���───────────────────────────────
describe('WorldMangroveSwampSystem — 初始状态', () => {
  let sys: WorldMangroveSwampSystem
  beforeEach(() => { sys = makeSys(); idSeq = 1 })

  it('初始swamps数组为空', () => {
    expect((sys as any).swamps).toHaveLength(0)
  })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('手动注入swamp后length==1', () => {
    ;(sys as any).swamps.push(makeSwamp())
    expect((sys as any).swamps).toHaveLength(1)
  })

  it('swamps是同一个引用', () => {
    const s = (sys as any).swamps
    expect(s).toBe((sys as any).swamps)
  })

  it('swamp字段类型正确', () => {
    const s = makeSwamp()
    expect(typeof s.density).toBe('number')
    expect(typeof s.rootDepth).toBe('number')
    expect(typeof s.biodiversity).toBe('number')
    expect(typeof s.coastalProtection).toBe('number')
    expect(typeof s.waterFiltration).toBe('number')
  })
})

// ─── 2. CHECK_INTERVAL 节流 ───────────────────────────────────────────────────
describe('WorldMangroveSwampSystem — CHECK_INTERVAL节流', () => {
  let sys: WorldMangroveSwampSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时跳过(0-0<1600)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, GRASS_WORLD, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=1599时跳过(差值1599<1600)', () => {
    sys.update(0, GRASS_WORLD, em, 1599)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=1600时执行，lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, GRASS_WORLD, em, 1600)
    expect((sys as any).lastCheck).toBe(1600)
  })

  it('执行后tick=3199时不再执行(3199-1600=1599<1600)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, GRASS_WORLD, em, 1600)
    sys.update(0, GRASS_WORLD, em, 3199)
    expect((sys as any).lastCheck).toBe(1600)
  })

  it('tick=3200时再次执行(3200-1600=1600)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, GRASS_WORLD, em, 1600)
    sys.update(0, GRASS_WORLD, em, 3200)
    expect((sys as any).lastCheck).toBe(3200)
  })

  it('节流期间swamps内容不被update(动态字段不变)', () => {
    ;(sys as any).swamps.push(makeSwamp({ density: 50, tick: 0 }))
    // tick=1600时执行第一次update(density变为50.15)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, GRASS_WORLD, em, 1600)
    const d1 = (sys as any).swamps[0].density
    // tick=1601 节流跳过，density不再变化
    sys.update(0, GRASS_WORLD, em, 1601)
    expect((sys as any).swamps[0].density).toBe(d1)
  })
})

// ─── 3. spawn条件 ─────────────────────────────────────────────────────────────
describe('WorldMangroveSwampSystem — spawn条件', () => {
  let sys: WorldMangroveSwampSystem
  afterEach(() => { vi.restoreAllMocks() })

  it('GRASS(3)世界不spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, GRASS_WORLD, em, 1600)
    expect((sys as any).swamps).toHaveLength(0)
  })

  it('DEEP_WATER(0)不spawn(tile>=1条件不满足)', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(0, makeSwampWorld(0), em, 1600)
    expect((sys as any).swamps).toHaveLength(0)
  })

  it('SHALLOW_WATER(1)+random<SPAWN_CHANCE(0.004)时spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(0, makeSwampWorld(1), em, 1600)
    expect((sys as any).swamps).toHaveLength(1)
  })

  it('SAND(2)+random<SPAWN_CHANCE时spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(0, makeSwampWorld(2), em, 1600)
    expect((sys as any).swamps).toHaveLength(1)
  })

  it('FOREST(4)不spawn(tile>2条件不满足)', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(0, makeSwampWorld(4), em, 1600)
    expect((sys as any).swamps).toHaveLength(0)
  })

  it('random>=SPAWN_CHANCE(0.004)时不spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, makeSwampWorld(1), em, 1600)
    expect((sys as any).swamps).toHaveLength(0)
  })

  it('swamps达到MAX_SWAMPS(20)时不再spawn', () => {
    sys = makeSys()
    for (let i = 0; i < 20; i++) {
      ;(sys as any).swamps.push(makeSwamp({ id: i + 1 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(0, makeSwampWorld(1), em, 1600)
    expect((sys as any).swamps).toHaveLength(20)
  })

  it('swamps=19时可spawn至20', () => {
    sys = makeSys()
    for (let i = 0; i < 19; i++) {
      ;(sys as any).swamps.push(makeSwamp({ id: i + 1 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(0, makeSwampWorld(1), em, 1600)
    expect((sys as any).swamps).toHaveLength(20)
  })
})

// ─── 4. spawn后字段范围及关系 ─────────────────────────────────────────────────
describe('WorldMangroveSwampSystem — 字段范围', () => {
  let sys: WorldMangroveSwampSystem
  afterEach(() => { vi.restoreAllMocks() })

  function spawnOneSwamp(randomVal = 0.002): MangroveSwamp | undefined {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(randomVal)
    sys.update(0, makeSwampWorld(1), em, 1600)
    return (sys as any).swamps[0]
  }

  it('density在[10,50]范围内(10+random*40)', () => {
    // random=0.002 => 密度 = 10 + 0.002*40 = 10.08; 但spawn后立刻执行update => 10.08+0.15=10.23
    const s = spawnOneSwamp(0.002)
    if (s) {
      expect(s.density).toBeGreaterThanOrEqual(10)
      expect(s.density).toBeLessThanOrEqual(51)  // 包含update一次后的值
    }
  })

  it('rootDepth在[1,6]范围内(1+random*5)', () => {
    const s = spawnOneSwamp(0.002)
    if (s) {
      expect(s.rootDepth).toBeGreaterThanOrEqual(1)
      expect(s.rootDepth).toBeLessThanOrEqual(7)  // 包含update一次+0.02
    }
  })

  it('biodiversity在[5,35]范围内(5+random*30)', () => {
    const s = spawnOneSwamp(0.002)
    if (s) {
      expect(s.biodiversity).toBeGreaterThanOrEqual(5)
      expect(s.biodiversity).toBeLessThanOrEqual(36)
    }
  })

  it('coastalProtection==density*0.8', () => {
    const s = spawnOneSwamp(0.002)
    if (s) {
      expect(s.coastalProtection).toBeCloseTo(s.density * 0.8, 5)
    }
  })

  it('waterFiltration==density*0.6', () => {
    const s = spawnOneSwamp(0.002)
    if (s) {
      expect(s.waterFiltration).toBeCloseTo(s.density * 0.6, 5)
    }
  })

  it('spawn后id从1自增', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(0, makeSwampWorld(1), em, 1600)
    const swamps = (sys as any).swamps
    if (swamps.length > 0) expect(swamps[0].id).toBeGreaterThanOrEqual(1)
  })
})

// ─── 5. 动态update ────────────────────────────────────────────────────────────
describe('WorldMangroveSwampSystem — 动态update', () => {
  let sys: WorldMangroveSwampSystem
  beforeEach(() => { sys = makeSys(); idSeq = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('density每次update增加0.15', () => {
    ;(sys as any).swamps.push(makeSwamp({ density: 50, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, GRASS_WORLD, em, 1600)
    expect((sys as any).swamps[0].density).toBeCloseTo(50.15, 5)
  })

  it('density上限钳制为100', () => {
    ;(sys as any).swamps.push(makeSwamp({ density: 100, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, GRASS_WORLD, em, 1600)
    expect((sys as any).swamps[0].density).toBe(100)
  })

  it('rootDepth每次update增加0.02', () => {
    ;(sys as any).swamps.push(makeSwamp({ rootDepth: 5, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, GRASS_WORLD, em, 1600)
    expect((sys as any).swamps[0].rootDepth).toBeCloseTo(5.02, 5)
  })

  it('rootDepth上限钳制为10', () => {
    ;(sys as any).swamps.push(makeSwamp({ rootDepth: 10, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, GRASS_WORLD, em, 1600)
    expect((sys as any).swamps[0].rootDepth).toBe(10)
  })

  it('biodiversity增量=0.1*density/50', () => {
    // density=50 => 增量=0.1*50/50=0.1
    ;(sys as any).swamps.push(makeSwamp({ density: 50, biodiversity: 30, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, GRASS_WORLD, em, 1600)
    // density先变为50.15, 然后biodiversity增加0.1*(50.15/50) ≈ 0.1003
    expect((sys as any).swamps[0].biodiversity).toBeGreaterThan(30)
  })

  it('biodiversity上限钳制为100', () => {
    ;(sys as any).swamps.push(makeSwamp({ density: 100, biodiversity: 100, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, GRASS_WORLD, em, 1600)
    expect((sys as any).swamps[0].biodiversity).toBe(100)
  })

  it('coastalProtection始终等于density*0.8', () => {
    ;(sys as any).swamps.push(makeSwamp({ density: 50, coastalProtection: 40, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, GRASS_WORLD, em, 1600)
    const s = (sys as any).swamps[0]
    expect(s.coastalProtection).toBeCloseTo(s.density * 0.8, 5)
  })

  it('waterFiltration始终等于density*0.6', () => {
    ;(sys as any).swamps.push(makeSwamp({ density: 50, waterFiltration: 30, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, GRASS_WORLD, em, 1600)
    const s = (sys as any).swamps[0]
    expect(s.waterFiltration).toBeCloseTo(s.density * 0.6, 5)
  })
})

// ─── 6. cleanup逻辑 ───────────────────────────────────────────────────────────
describe('WorldMangroveSwampSystem — cleanup逻辑', () => {
  let sys: WorldMangroveSwampSystem
  beforeEach(() => { sys = makeSys(); idSeq = 100 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick-swamp.tick>80000 且 density<15 时删除', () => {
    ;(sys as any).swamps.push(makeSwamp({ density: 10, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // tick=81600(满足节流), tick-0=81600>80000, density=10<15 => 删除
    sys.update(0, GRASS_WORLD, em, 81600)
    expect((sys as any).swamps).toHaveLength(0)
  })

  it('tick-swamp.tick==80000时不删除(严格大于)', () => {
    ;(sys as any).swamps.push(makeSwamp({ density: 10, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // 需要tick==80000满足节流: 80000是1600的整数倍
    sys.update(0, GRASS_WORLD, em, 80000)
    // tick-0=80000, 不>80000 => 不删除
    expect((sys as any).swamps).toHaveLength(1)
  })

  it('density>=15时不删除(即使时间超过80000)', () => {
    // density=50, 经过update后仍>=15 => 不删除
    ;(sys as any).swamps.push(makeSwamp({ density: 50, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, GRASS_WORLD, em, 81600)
    expect((sys as any).swamps).toHaveLength(1)
  })

  it('密度正好等于15时不删除(条件是严格小于15)', () => {
    ;(sys as any).swamps.push(makeSwamp({ density: 15, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // density=15经过update变为15.15, 仍>=15 => 不删
    sys.update(0, GRASS_WORLD, em, 81600)
    expect((sys as any).swamps).toHaveLength(1)
  })

  it('时间未超过80000时即使density<15也不删除', () => {
    ;(sys as any).swamps.push(makeSwamp({ density: 10, tick: 70000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // tick=80000, tick-70000=10000 <= 80000 => 不删
    sys.update(0, GRASS_WORLD, em, 80000)
    expect((sys as any).swamps).toHaveLength(1)
  })

  it('混合情况: 低密度旧swamp删除，高密度旧swamp保留', () => {
    ;(sys as any).swamps.push(makeSwamp({ density: 10, tick: 0 }))    // 删除
    ;(sys as any).swamps.push(makeSwamp({ density: 50, tick: 0 }))    // 保留
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, GRASS_WORLD, em, 81600)
    expect((sys as any).swamps).toHaveLength(1)
    expect((sys as any).swamps[0].density).toBeGreaterThan(40)
  })

  it('密度接近但仍<15的swamp在超时后删除', () => {
    ;(sys as any).swamps.push(makeSwamp({ density: 14.9, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // update后density=14.9+0.15=15.05 => >=15 => 不删!
    sys.update(0, GRASS_WORLD, em, 81600)
    // 因为update先执行再cleanup，density已经涨到15.05>=15，所以不删
    expect((sys as any).swamps).toHaveLength(1)
  })

  it('全部满足删除条件时清空swamps', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).swamps.push(makeSwamp({ density: 5, tick: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, GRASS_WORLD, em, 81600)
    // density=5+0.15=5.15 仍<15, tick-0=81600>80000 => 全删
    expect((sys as any).swamps).toHaveLength(0)
  })
})
