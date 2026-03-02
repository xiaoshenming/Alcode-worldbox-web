import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldAgeSystem } from '../systems/WorldAgeSystem'
import type { WorldEpoch, ColorOverlay } from '../systems/WorldAgeSystem'
import { TileType } from '../utils/Constants'

// ===== 从源码提取的关键参数 =====
// EPOCH_CONFIGS:
//   PRIMORDIAL: startTick=0,  endTick=500,   disasterFreq=2.0, resourceRegen=0.4, driftChance=0.06, spawnRate=0.3
//   ANCIENT:    startTick=500, endTick=2000,  disasterFreq=1.2, resourceRegen=1.2, driftChance=0.04, spawnRate=0.8
//   CLASSICAL:  startTick=2000,endTick=5000,  disasterFreq=1.0, resourceRegen=1.0, driftChance=0.02, spawnRate=1.0
//   MEDIEVAL:   startTick=5000,endTick=10000, disasterFreq=0.8, resourceRegen=0.9, driftChance=0.015,spawnRate=1.1
//   MODERN:     startTick=10000,endTick=Inf,  disasterFreq=0.6, resourceRegen=0.7, driftChance=0.01, spawnRate=1.3
// DRIFT_INTERVAL = 300
// SAMPLE_RATIO = 0.02
// getEpochProgress: endTick=Infinity => min(1, elapsed/20000)
// getColorOverlay: ticksIntoEpoch < 200 => interpolate from prev epoch
// overlay: PRIMORDIAL={r:180,g:60,b:20,a:0.08}, ANCIENT={r:40,g:120,b:30,a:0.05}
//          CLASSICAL={r:200,g:180,b:120,a:0.03}, MEDIEVAL={r:100,g:90,b:70,a:0.04}
//          MODERN={r:140,g:140,b:160,a:0.06}

function makeSys(): WorldAgeSystem { return new WorldAgeSystem() }

function makeMockWorld(tileMap: Record<string, TileType> = {}, w = 200, h = 200) {
  return {
    width: w,
    height: h,
    getTile: vi.fn().mockImplementation((x: number, y: number) => {
      return tileMap[`${x},${y}`] ?? TileType.GRASS
    }),
    setTile: vi.fn(),
  } as any
}

function makeSimpleWorld(tile: TileType = TileType.GRASS) {
  return {
    width: 200,
    height: 200,
    getTile: vi.fn().mockReturnValue(tile),
    setTile: vi.fn(),
  } as any
}

// ========================================================
// 1. 初始状态
// ========================================================
describe('WorldAgeSystem - 初始状态', () => {
  let sys: WorldAgeSystem

  beforeEach(() => { sys = makeSys() })

  it('初始worldTick为0', () => {
    expect((sys as any).worldTick).toBe(0)
  })

  it('初始currentEpochIndex为0', () => {
    expect((sys as any).currentEpochIndex).toBe(0)
  })

  it('初始当前时代为PRIMORDIAL', () => {
    expect(sys.getCurrentEpoch()).toBe('PRIMORDIAL')
  })

  it('初始显示名为太初', () => {
    expect(sys.getEpochDisplayName()).toBe('太初')
  })

  it('初始灾难频率为2.0', () => {
    expect(sys.getDisasterFrequencyModifier()).toBe(2.0)
  })

  it('初始getWorldAge返回0', () => {
    expect(sys.getWorldAge()).toBe(0)
  })

  it('初始getEpochProgress返回[0,1]范围内的值', () => {
    const p = sys.getEpochProgress()
    expect(p).toBeGreaterThanOrEqual(0)
    expect(p).toBeLessThanOrEqual(1)
  })

  it('初始getColorOverlay返回有效对象', () => {
    const o = sys.getColorOverlay()
    expect(o).toHaveProperty('r')
    expect(o).toHaveProperty('g')
    expect(o).toHaveProperty('b')
    expect(o).toHaveProperty('a')
  })

  it('初始sampleCount > 0', () => {
    expect((sys as any).sampleCount).toBeGreaterThan(0)
  })
})

// ========================================================
// 2. 时代切换 - 节流与tick映射
// ========================================================
describe('WorldAgeSystem - 时代切换', () => {
  let sys: WorldAgeSystem

  beforeEach(() => { sys = makeSys() })

  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0 => PRIMORDIAL', () => {
    sys.update(0, makeSimpleWorld())
    expect(sys.getCurrentEpoch()).toBe('PRIMORDIAL')
  })

  it('tick=499 => PRIMORDIAL', () => {
    sys.update(499, makeSimpleWorld())
    expect(sys.getCurrentEpoch()).toBe('PRIMORDIAL')
  })

  it('tick=500 => ANCIENT', () => {
    sys.update(500, makeSimpleWorld())
    expect(sys.getCurrentEpoch()).toBe('ANCIENT')
  })

  it('tick=1999 => ANCIENT', () => {
    sys.update(1999, makeSimpleWorld())
    expect(sys.getCurrentEpoch()).toBe('ANCIENT')
  })

  it('tick=2000 => CLASSICAL', () => {
    sys.update(2000, makeSimpleWorld())
    expect(sys.getCurrentEpoch()).toBe('CLASSICAL')
  })

  it('tick=4999 => CLASSICAL', () => {
    sys.update(4999, makeSimpleWorld())
    expect(sys.getCurrentEpoch()).toBe('CLASSICAL')
  })

  it('tick=5000 => MEDIEVAL', () => {
    sys.update(5000, makeSimpleWorld())
    expect(sys.getCurrentEpoch()).toBe('MEDIEVAL')
  })

  it('tick=9999 => MEDIEVAL', () => {
    sys.update(9999, makeSimpleWorld())
    expect(sys.getCurrentEpoch()).toBe('MEDIEVAL')
  })

  it('tick=10000 => MODERN', () => {
    sys.update(10000, makeSimpleWorld())
    expect(sys.getCurrentEpoch()).toBe('MODERN')
  })

  it('tick=99999 => MODERN', () => {
    sys.update(99999, makeSimpleWorld())
    expect(sys.getCurrentEpoch()).toBe('MODERN')
  })

  it('update后getWorldAge返回当前tick', () => {
    sys.update(1234, makeSimpleWorld())
    expect(sys.getWorldAge()).toBe(1234)
  })
})

// ========================================================
// 3. DRIFT_INTERVAL节流
// ========================================================
describe('WorldAgeSystem - DRIFT_INTERVAL节流', () => {
  let sys: WorldAgeSystem

  afterEach(() => { vi.restoreAllMocks() })

  beforeEach(() => { sys = makeSys() })

  it('tick=0时不触发地形漂移', () => {
    const world = makeSimpleWorld()
    sys.update(0, world)
    expect(world.setTile).not.toHaveBeenCalled()
  })

  it('tick=300时触发地形漂移', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // 让chance通过
    const world = makeSimpleWorld(TileType.FOREST)
    sys.update(300, world)
    // PRIMORDIAL epoch: forest => grass (prob=0.2, random=0 < 0.2 => convert)
    expect(world.setTile).toHaveBeenCalled()
  })

  it('tick=299时不触发地形漂移', () => {
    const world = makeSimpleWorld()
    sys.update(299, world)
    expect(world.setTile).not.toHaveBeenCalled()
  })

  it('tick=600时再次触发地形漂移（ANCIENT时代LAVA=>MOUNTAIN）', () => {
    // ANCIENT时代: driftAncient: LAVA + random<0.15 => MOUNTAIN，random=0<0.15 => yes
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeSimpleWorld(TileType.LAVA)
    sys.update(600, world)
    expect(world.setTile).toHaveBeenCalled()
  })

  it('tick非300倍数时不触发漂移', () => {
    const world = makeSimpleWorld()
    sys.update(301, world)
    expect(world.setTile).not.toHaveBeenCalled()
  })
})

// ========================================================
// 4. getDisasterFrequencyModifier各时代值
// ========================================================
describe('WorldAgeSystem - getDisasterFrequencyModifier', () => {
  let sys: WorldAgeSystem

  beforeEach(() => { sys = makeSys() })

  it('PRIMORDIAL时代返回2.0', () => {
    sys.update(0, makeSimpleWorld())
    expect(sys.getDisasterFrequencyModifier()).toBe(2.0)
  })

  it('ANCIENT时代返回1.2', () => {
    sys.update(500, makeSimpleWorld())
    expect(sys.getDisasterFrequencyModifier()).toBe(1.2)
  })

  it('CLASSICAL时代返回1.0', () => {
    sys.update(2000, makeSimpleWorld())
    expect(sys.getDisasterFrequencyModifier()).toBe(1.0)
  })

  it('MEDIEVAL时代返回0.8', () => {
    sys.update(5000, makeSimpleWorld())
    expect(sys.getDisasterFrequencyModifier()).toBe(0.8)
  })

  it('MODERN时代返回0.6', () => {
    sys.update(10000, makeSimpleWorld())
    expect(sys.getDisasterFrequencyModifier()).toBe(0.6)
  })

  it('灾难频率从PRIMORDIAL到MODERN单调递减', () => {
    const values: number[] = []
    const ticks = [0, 500, 2000, 5000, 10000]
    for (const t of ticks) {
      sys.update(t, makeSimpleWorld())
      values.push(sys.getDisasterFrequencyModifier())
    }
    for (let i = 0; i < values.length - 1; i++) {
      expect(values[i]).toBeGreaterThan(values[i + 1])
    }
  })
})

// ========================================================
// 5. getTerrainDriftChance各时代值
// ========================================================
describe('WorldAgeSystem - getTerrainDriftChance', () => {
  let sys: WorldAgeSystem

  beforeEach(() => { sys = makeSys() })

  it('PRIMORDIAL时代driftChance=0.06', () => {
    sys.update(0, makeSimpleWorld())
    expect(sys.getTerrainDriftChance()).toBe(0.06)
  })

  it('ANCIENT时代driftChance=0.04', () => {
    sys.update(500, makeSimpleWorld())
    expect(sys.getTerrainDriftChance()).toBe(0.04)
  })

  it('CLASSICAL时代driftChance=0.02', () => {
    sys.update(2000, makeSimpleWorld())
    expect(sys.getTerrainDriftChance()).toBe(0.02)
  })

  it('MEDIEVAL时代driftChance=0.015', () => {
    sys.update(5000, makeSimpleWorld())
    expect(sys.getTerrainDriftChance()).toBe(0.015)
  })

  it('MODERN时代driftChance=0.01', () => {
    sys.update(10000, makeSimpleWorld())
    expect(sys.getTerrainDriftChance()).toBe(0.01)
  })

  it('driftChance从PRIMORDIAL到MODERN单调递减', () => {
    const values: number[] = []
    const ticks = [0, 500, 2000, 5000, 10000]
    for (const t of ticks) {
      sys.update(t, makeSimpleWorld())
      values.push(sys.getTerrainDriftChance())
    }
    for (let i = 0; i < values.length - 1; i++) {
      expect(values[i]).toBeGreaterThan(values[i + 1])
    }
  })
})

// ========================================================
// 6. getColorOverlay各时代值
// ========================================================
describe('WorldAgeSystem - getColorOverlay', () => {
  let sys: WorldAgeSystem

  beforeEach(() => { sys = makeSys() })

  it('PRIMORDIAL时代r=180', () => {
    sys.update(0, makeSimpleWorld())
    const o = sys.getColorOverlay()
    expect(o.r).toBe(180)
  })

  it('PRIMORDIAL时代g=60', () => {
    sys.update(0, makeSimpleWorld())
    const o = sys.getColorOverlay()
    expect(o.g).toBe(60)
  })

  it('PRIMORDIAL时代b=20', () => {
    sys.update(0, makeSimpleWorld())
    const o = sys.getColorOverlay()
    expect(o.b).toBe(20)
  })

  it('PRIMORDIAL时代a=0.08', () => {
    sys.update(0, makeSimpleWorld())
    const o = sys.getColorOverlay()
    expect(o.a).toBeCloseTo(0.08, 5)
  })

  it('完全进入ANCIENT时代后overlay为ANCIENT的值', () => {
    // ticksIntoEpoch >= 200 => 完全切换
    sys.update(700, makeSimpleWorld()) // 700-500=200 >= 200
    const o = sys.getColorOverlay()
    expect(o.r).toBe(40)
    expect(o.g).toBe(120)
    expect(o.b).toBe(30)
    expect(o.a).toBeCloseTo(0.05, 5)
  })

  it('刚进入ANCIENT时代（过渡期）overlay是插值', () => {
    // tick=600, ticksIntoEpoch=100 < 200 => 插值
    sys.update(600, makeSimpleWorld())
    const o = sys.getColorOverlay()
    // r应在PRIMORDIAL(180)和ANCIENT(40)之间
    expect(o.r).toBeGreaterThan(40)
    expect(o.r).toBeLessThan(180)
  })

  it('getColorOverlay返回同一个缓冲对象（避免GC）', () => {
    sys.update(0, makeSimpleWorld())
    const a = sys.getColorOverlay()
    const b = sys.getColorOverlay()
    expect(a).toBe(b)
  })

  it('CLASSICAL时代r=200', () => {
    sys.update(2200, makeSimpleWorld()) // 2200-2000=200 >= 200
    const o = sys.getColorOverlay()
    expect(o.r).toBe(200)
  })

  it('MODERN时代a=0.06', () => {
    sys.update(10200, makeSimpleWorld()) // 10200-10000=200 >= 200
    const o = sys.getColorOverlay()
    expect(o.a).toBeCloseTo(0.06, 5)
  })
})

// ========================================================
// 7. getEpochProgress
// ========================================================
describe('WorldAgeSystem - getEpochProgress', () => {
  let sys: WorldAgeSystem

  beforeEach(() => { sys = makeSys() })

  it('PRIMORDIAL开始时progress=0', () => {
    sys.update(0, makeSimpleWorld())
    expect(sys.getEpochProgress()).toBeCloseTo(0, 5)
  })

  it('PRIMORDIAL结束时progress=1', () => {
    sys.update(499, makeSimpleWorld())
    // (499-0)/(500-0) = 0.998
    expect(sys.getEpochProgress()).toBeCloseTo(0.998, 2)
  })

  it('ANCIENT中间时progress=0.5', () => {
    // startTick=500, endTick=2000, duration=1500, midTick=500+750=1250
    sys.update(1250, makeSimpleWorld())
    expect(sys.getEpochProgress()).toBeCloseTo(0.5, 2)
  })

  it('MODERN时代progress最终=1（有上限）', () => {
    // elapsed / 20000 >= 1 when tick >= 10000+20000 = 30000
    sys.update(30001, makeSimpleWorld())
    expect(sys.getEpochProgress()).toBe(1)
  })

  it('MODERN时代progress值在[0,1]范围内', () => {
    sys.update(12000, makeSimpleWorld())
    const p = sys.getEpochProgress()
    expect(p).toBeGreaterThanOrEqual(0)
    expect(p).toBeLessThanOrEqual(1)
  })

  it('进度值不超过1', () => {
    sys.update(499, makeSimpleWorld())
    expect(sys.getEpochProgress()).toBeLessThanOrEqual(1)
  })

  it('进度值不低于0', () => {
    sys.update(0, makeSimpleWorld())
    expect(sys.getEpochProgress()).toBeGreaterThanOrEqual(0)
  })
})

// ========================================================
// 8. 时代显示名
// ========================================================
describe('WorldAgeSystem - getEpochDisplayName', () => {
  let sys: WorldAgeSystem

  beforeEach(() => { sys = makeSys() })

  it('PRIMORDIAL显示名为太初', () => {
    sys.update(0, makeSimpleWorld())
    expect(sys.getEpochDisplayName()).toBe('太初')
  })

  it('ANCIENT显示名为远古', () => {
    sys.update(500, makeSimpleWorld())
    expect(sys.getEpochDisplayName()).toBe('远古')
  })

  it('CLASSICAL显示名为古典', () => {
    sys.update(2000, makeSimpleWorld())
    expect(sys.getEpochDisplayName()).toBe('古典')
  })

  it('MEDIEVAL显示名为中世纪', () => {
    sys.update(5000, makeSimpleWorld())
    expect(sys.getEpochDisplayName()).toBe('中世纪')
  })

  it('MODERN显示名为现代', () => {
    sys.update(10000, makeSimpleWorld())
    expect(sys.getEpochDisplayName()).toBe('现代')
  })

  it('getEpochDisplayName返回字符串', () => {
    expect(typeof sys.getEpochDisplayName()).toBe('string')
  })

  it('5种时代均有合法显示名', () => {
    const ticks = [0, 500, 2000, 5000, 10000]
    const names = ['太初', '远古', '古典', '中世纪', '现代']
    for (let i = 0; i < ticks.length; i++) {
      sys.update(ticks[i], makeSimpleWorld())
      expect(sys.getEpochDisplayName()).toBe(names[i])
    }
  })
})

// ========================================================
// 额外边界验证
// ========================================================
describe('WorldAgeSystem - 边界验证', () => {
  let sys: WorldAgeSystem

  beforeEach(() => { sys = makeSys() })

  afterEach(() => { vi.restoreAllMocks() })

  it('WorldEpoch类型包含5个有效值', () => {
    const epochs: WorldEpoch[] = ['PRIMORDIAL', 'ANCIENT', 'CLASSICAL', 'MEDIEVAL', 'MODERN']
    expect(epochs).toHaveLength(5)
  })

  it('update不崩溃（tick=0）', () => {
    expect(() => sys.update(0, makeSimpleWorld())).not.toThrow()
  })

  it('update不崩溃（tick=99999）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    expect(() => sys.update(99999, makeSimpleWorld())).not.toThrow()
  })

  it('连续update后worldTick始终等于最新tick', () => {
    sys.update(100, makeSimpleWorld())
    sys.update(500, makeSimpleWorld())
    sys.update(2000, makeSimpleWorld())
    expect(sys.getWorldAge()).toBe(2000)
  })

  it('MODERN时代灾难频率 < PRIMORDIAL', () => {
    const sys1 = makeSys()
    sys1.update(0, makeSimpleWorld())
    const primordialFreq = sys1.getDisasterFrequencyModifier()

    const sys2 = makeSys()
    sys2.update(10000, makeSimpleWorld())
    const modernFreq = sys2.getDisasterFrequencyModifier()

    expect(modernFreq).toBeLessThan(primordialFreq)
  })

  it('overlay颜色值r在[0,255]范围', () => {
    const ticks = [0, 500, 2000, 5000, 10000]
    for (const t of ticks) {
      sys.update(t, makeSimpleWorld())
      const o = sys.getColorOverlay()
      expect(o.r).toBeGreaterThanOrEqual(0)
      expect(o.r).toBeLessThanOrEqual(255)
    }
  })

  it('overlay颜色值a在[0,1]范围', () => {
    const ticks = [0, 500, 2000, 5000, 10000]
    for (const t of ticks) {
      sys.update(t, makeSimpleWorld())
      const o = sys.getColorOverlay()
      expect(o.a).toBeGreaterThanOrEqual(0)
      expect(o.a).toBeLessThanOrEqual(1)
    }
  })
})
