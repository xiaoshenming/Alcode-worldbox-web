import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WaterAnimationSystem } from '../systems/WaterAnimationSystem'
import { TileType } from '../utils/Constants'

// ── Minimal World mock ──────────────────────────────────────────────────────
function makeWorld(w: number, h: number, fillTile: TileType = TileType.GRASS) {
  const tiles: TileType[][] = []
  for (let y = 0; y < h; y++) {
    tiles[y] = []
    for (let x = 0; x < w; x++) tiles[y][x] = fillTile
  }
  return { width: w, height: h, tiles }
}

function makeCoastalWorld(w: number, h: number) {
  const world = makeWorld(w, h, TileType.GRASS)
  // Row 0–1 = deep water, row 2 = shallow water, rest = land
  for (let x = 0; x < w; x++) {
    world.tiles[0][x] = TileType.DEEP_WATER
    world.tiles[1][x] = TileType.DEEP_WATER
    if (h > 2) world.tiles[2][x] = TileType.SHALLOW_WATER
  }
  return world
}

function makeSys() { return new WaterAnimationSystem() }

// ── 1. Constructor / initial state ─────────────────────────────────────────
describe('WaterAnimationSystem — 初始状态', () => {
  let sys: WaterAnimationSystem
  beforeEach(() => { sys = makeSys() })

  it('time 初始为 0', () => {
    expect((sys as any).time).toBe(0)
  })

  it('foamParticles 初始为空数组', () => {
    expect((sys as any).foamParticles).toHaveLength(0)
  })

  it('_foamPool 初始为空', () => {
    expect((sys as any)._foamPool).toHaveLength(0)
  })

  it('MAX_FOAM 为 512', () => {
    expect((sys as any).MAX_FOAM).toBe(512)
  })

  it('WAVE_CACHE_INTERVAL 为 4', () => {
    expect((sys as any).WAVE_CACHE_INTERVAL).toBe(4)
  })

  it('COAST_CACHE_INTERVAL 为 120', () => {
    expect((sys as any).COAST_CACHE_INTERVAL).toBe(120)
  })

  it('CACHE_INTERVAL 为 5', () => {
    expect((sys as any).CACHE_INTERVAL).toBe(5)
  })

  it('frameCounter 初始为 0', () => {
    expect((sys as any).frameCounter).toBe(0)
  })

  it('coastCacheTick 初始为 -1', () => {
    expect((sys as any).coastCacheTick).toBe(-1)
  })

  it('waveCache 初始为 null', () => {
    expect((sys as any).waveCache).toBeNull()
  })

  it('waterCache 初始为 null', () => {
    expect((sys as any).waterCache).toBeNull()
  })

  it('coastGridWidth 初始为 0', () => {
    expect((sys as any).coastGridWidth).toBe(0)
  })

  it('coastGridHeight 初始为 0', () => {
    expect((sys as any).coastGridHeight).toBe(0)
  })

  it('coastGrid 初始为空 Uint8Array', () => {
    expect((sys as any).coastGrid).toBeInstanceOf(Uint8Array)
    expect((sys as any).coastGrid.length).toBe(0)
  })
})

// ── 2. SIN_TABLE ─────────────────────────────────────────────────────────────
describe('WaterAnimationSystem — SIN_TABLE', () => {
  let sys: WaterAnimationSystem
  beforeEach(() => { sys = makeSys() })

  it('SIN_TABLE 已定义', () => {
    expect((sys as any).SIN_TABLE).toBeDefined()
  })

  it('SIN_TABLE 为 Float32Array', () => {
    expect((sys as any).SIN_TABLE).toBeInstanceOf(Float32Array)
  })

  it('SIN_TABLE 大小为 256', () => {
    expect((sys as any).SIN_TABLE.length).toBe(256)
  })

  it('SIN_TABLE[0] 接近 0（sin(0)）', () => {
    expect((sys as any).SIN_TABLE[0]).toBeCloseTo(0, 4)
  })

  it('SIN_TABLE[64] 接近 1（sin(π/2)）', () => {
    expect((sys as any).SIN_TABLE[64]).toBeCloseTo(1, 4)
  })

  it('SIN_TABLE[128] 接近 0（sin(π)）', () => {
    expect((sys as any).SIN_TABLE[128]).toBeCloseTo(0, 3)
  })

  it('SIN_TABLE[192] 接近 -1（sin(3π/2)）', () => {
    expect((sys as any).SIN_TABLE[192]).toBeCloseTo(-1, 4)
  })

  it('SIN_TABLE 值域在 [-1, 1]', () => {
    const table: Float32Array = (sys as any).SIN_TABLE
    for (let i = 0; i < table.length; i++) {
      expect(table[i]).toBeGreaterThanOrEqual(-1.001)
      expect(table[i]).toBeLessThanOrEqual(1.001)
    }
  })
})

// ── 3. fastSin ────────────────────────────────────────────────────────────────
describe('WaterAnimationSystem — fastSin', () => {
  let sys: WaterAnimationSystem
  beforeEach(() => { sys = makeSys() })

  it('fastSin(0) ≈ 0', () => {
    expect((sys as any).fastSin(0)).toBeCloseTo(0, 2)
  })

  it('fastSin(π/2) ≈ 1', () => {
    expect((sys as any).fastSin(Math.PI / 2)).toBeCloseTo(1, 2)
  })

  it('fastSin(π) ≈ 0', () => {
    expect((sys as any).fastSin(Math.PI)).toBeCloseTo(0, 2)
  })

  it('fastSin(3π/2) ≈ -1', () => {
    expect((sys as any).fastSin(3 * Math.PI / 2)).toBeCloseTo(-1, 2)
  })

  it('fastSin(2π) ≈ 0（周期性）', () => {
    expect((sys as any).fastSin(2 * Math.PI)).toBeCloseTo(0, 2)
  })

  it('fastSin 负数输入正常工作', () => {
    const v: number = (sys as any).fastSin(-Math.PI / 2)
    expect(v).toBeCloseTo(-1, 2)
  })

  it('fastSin 大数输入正常工作（周期折叠）', () => {
    const v: number = (sys as any).fastSin(100 * Math.PI + Math.PI / 2)
    expect(v).toBeCloseTo(1, 2)
  })
})

// ── 4. update — time 推进 ────────────────────────────────────────────────────
describe('WaterAnimationSystem — update time 推进', () => {
  let sys: WaterAnimationSystem
  const world = makeWorld(10, 10)
  beforeEach(() => { sys = makeSys() })

  it('update(tick=0) 后 time = 0', () => {
    sys.update(0, world as any)
    expect((sys as any).time).toBeCloseTo(0)
  })

  it('update(tick=50) 后 time = 1.0', () => {
    sys.update(50, world as any)
    expect((sys as any).time).toBeCloseTo(1.0)
  })

  it('update(tick=100) 后 time = 2.0', () => {
    sys.update(100, world as any)
    expect((sys as any).time).toBeCloseTo(2.0)
  })

  it('time = tick * 0.02', () => {
    sys.update(37, world as any)
    expect((sys as any).time).toBeCloseTo(37 * 0.02)
  })
})

// ── 5. update — coastCache 重建 ──────────────────────────────────────────────
describe('WaterAnimationSystem — coastCache 重建', () => {
  let sys: WaterAnimationSystem
  beforeEach(() => { sys = makeSys() })

  it('首次 update(tick=120) 触发 coastCache 重建（coastCacheTick 更新）', () => {
    // coastCacheTick starts at -1, so 120 - (-1) = 121 >= 120 → rebuild
    const world = makeWorld(5, 5)
    sys.update(120, world as any)
    expect((sys as any).coastCacheTick).toBe(120)
  })

  it('coastGridWidth 在重建后等于 world.width', () => {
    const world = makeWorld(8, 6)
    sys.update(120, world as any)
    expect((sys as any).coastGridWidth).toBe(8)
  })

  it('coastGridHeight 在重建后等于 world.height', () => {
    const world = makeWorld(8, 6)
    sys.update(120, world as any)
    expect((sys as any).coastGridHeight).toBe(6)
  })

  it('coastGrid 长度 = width × height', () => {
    const world = makeWorld(5, 4)
    sys.update(120, world as any)
    const grid: Uint8Array = (sys as any).coastGrid
    expect(grid.length).toBe(20)
  })

  it('纯陆地地图：coastGrid 全为 0', () => {
    const world = makeWorld(5, 5, TileType.GRASS)
    sys.update(120, world as any)
    const grid: Uint8Array = (sys as any).coastGrid
    for (let i = 0; i < grid.length; i++) expect(grid[i]).toBe(0)
  })

  it('纯海洋地图（内部格）：coastGrid center = 0（无陆地邻居）', () => {
    const world = makeWorld(5, 5, TileType.DEEP_WATER)
    sys.update(120, world as any)
    const grid: Uint8Array = (sys as any).coastGrid
    expect(grid[2 * 5 + 2]).toBe(0) // center tile — no land neighbor
  })

  it('海岸地图：邻近陆地的水格 coastGrid = 1', () => {
    const world = makeCoastalWorld(5, 5)
    sys.update(120, world as any)
    const grid: Uint8Array = (sys as any).coastGrid
    // Row 2 (shallow water) is adjacent to row 3 (grass) → should be coast
    expect(grid[2 * 5 + 0]).toBe(1)
  })

  it('在 COAST_CACHE_INTERVAL 内再次 update 不重建（coastCacheTick 不变）', () => {
    const world = makeWorld(5, 5)
    sys.update(120, world as any) // triggers rebuild, coastCacheTick = 120
    const firstTick = (sys as any).coastCacheTick
    sys.update(170, world as any) // 170 - 120 = 50 < 120, no rebuild
    expect((sys as any).coastCacheTick).toBe(firstTick)
  })

  it('超过 COAST_CACHE_INTERVAL 时再次重建（coastCacheTick 更新）', () => {
    const world = makeWorld(5, 5)
    sys.update(120, world as any)
    sys.update(240, world as any) // 240 - 120 = 120 >= 120 → rebuild
    expect((sys as any).coastCacheTick).toBe(240)
  })
})

// ── 6. update — waveCache 失效 ───────────────────────────────────────────────
describe('WaterAnimationSystem — waveCache 失效', () => {
  let sys: WaterAnimationSystem
  const world = makeWorld(5, 5)
  beforeEach(() => { sys = makeSys() })

  it('update 后 waveCache 仍为 null（未手动填入时）', () => {
    sys.update(0, world as any)
    expect((sys as any).waveCache).toBeNull()
  })

  it('手动注入 waveCache 后，超过 WAVE_CACHE_INTERVAL 即失效', () => {
    ;(sys as any).waveCache = { tick: 0, values: new Float32Array(4) }
    sys.update(4, world as any) // diff >= 4
    expect((sys as any).waveCache).toBeNull()
  })

  it('差值 < WAVE_CACHE_INTERVAL 时不失效', () => {
    const cache = { tick: 10, values: new Float32Array(4) }
    ;(sys as any).waveCache = cache
    sys.update(12, world as any) // diff = 2 < 4
    expect((sys as any).waveCache).not.toBeNull()
  })
})

// ── 7. foamParticle 生命周期 ─────────────────────────────────────────────────
describe('WaterAnimationSystem — foamParticle 生命周期', () => {
  let sys: WaterAnimationSystem
  beforeEach(() => { sys = makeSys() })

  it('update 若 tick%3≠0 且无粒子，仍保持空', () => {
    const world = makeCoastalWorld(5, 5)
    sys.update(0, world as any) // build coast
    sys.update(1, world as any) // tick%3=1, no spawn
    // 0 foam particles from tick 1
    expect((sys as any).foamParticles.length).toBeGreaterThanOrEqual(0)
  })

  it('粒子 age 随 update 递增', () => {
    const p = { x: 0, y: 0, age: 0, maxAge: 100, size: 1, dx: 0, dy: 0 }
    ;(sys as any).foamParticles.push(p)
    const world = makeWorld(5, 5)
    sys.update(1, world as any)
    expect(p.age).toBe(1)
  })

  it('粒子位置随 dx/dy 移动', () => {
    const p = { x: 10, y: 20, age: 0, maxAge: 100, size: 1, dx: 2, dy: 3 }
    ;(sys as any).foamParticles.push(p)
    const world = makeWorld(5, 5)
    sys.update(1, world as any)
    expect(p.x).toBeCloseTo(12)
    expect(p.y).toBeCloseTo(23)
  })

  it('粒子 dx/dy 随 update 乘 0.96 衰减', () => {
    const p = { x: 0, y: 0, age: 0, maxAge: 100, size: 1, dx: 1, dy: 1 }
    ;(sys as any).foamParticles.push(p)
    const world = makeWorld(5, 5)
    sys.update(1, world as any)
    expect(p.dx).toBeCloseTo(0.96)
    expect(p.dy).toBeCloseTo(0.96)
  })

  it('粒子 age >= maxAge 后被移除', () => {
    const p = { x: 0, y: 0, age: 99, maxAge: 100, size: 1, dx: 0, dy: 0 }
    ;(sys as any).foamParticles.push(p)
    const world = makeWorld(5, 5)
    sys.update(1, world as any) // age becomes 100 >= maxAge → removed
    expect((sys as any).foamParticles.length).toBe(0)
  })

  it('死亡粒子回收进 _foamPool', () => {
    const p = { x: 0, y: 0, age: 99, maxAge: 100, size: 1, dx: 0, dy: 0 }
    ;(sys as any).foamParticles.push(p)
    const world = makeWorld(5, 5)
    sys.update(1, world as any)
    expect((sys as any)._foamPool.length).toBe(1)
  })

  it('foamParticles 长度不超过 MAX_FOAM', () => {
    const world = makeCoastalWorld(20, 20)
    // Run many ticks to attempt spawn
    for (let t = 0; t < 1000; t += 3) {
      sys.update(t, world as any)
    }
    expect((sys as any).foamParticles.length).toBeLessThanOrEqual(512)
  })
})

// ── 8. hasLandNeighbor ────────────────────────────────────────────────────────
describe('WaterAnimationSystem — hasLandNeighbor', () => {
  let sys: WaterAnimationSystem
  beforeEach(() => { sys = makeSys() })

  it('四周皆为水时返回 false', () => {
    const world = makeWorld(3, 3, TileType.DEEP_WATER)
    expect((sys as any).hasLandNeighbor(1, 1, world)).toBe(false)
  })

  it('有一个陆地邻居时返回 true', () => {
    const world = makeWorld(3, 3, TileType.DEEP_WATER)
    world.tiles[0][1] = TileType.GRASS
    expect((sys as any).hasLandNeighbor(1, 1, world)).toBe(true)
  })

  it('边界格（x=0）不越界', () => {
    const world = makeWorld(3, 3, TileType.DEEP_WATER)
    world.tiles[0][1] = TileType.GRASS
    expect(() => (sys as any).hasLandNeighbor(0, 1, world)).not.toThrow()
  })

  it('边界格（y=0）不越界', () => {
    const world = makeWorld(3, 3, TileType.DEEP_WATER)
    expect(() => (sys as any).hasLandNeighbor(1, 0, world)).not.toThrow()
  })

  it('浅水邻居不算陆地', () => {
    const world = makeWorld(3, 3, TileType.DEEP_WATER)
    world.tiles[0][1] = TileType.SHALLOW_WATER
    expect((sys as any).hasLandNeighbor(1, 1, world)).toBe(false)
  })

  it('岩浆邻居算陆地（非水）', () => {
    const world = makeWorld(3, 3, TileType.DEEP_WATER)
    world.tiles[1][2] = TileType.LAVA
    expect((sys as any).hasLandNeighbor(1, 1, world)).toBe(true)
  })
})

// ── 9. DIRS_4 静态属性 ────────────────────────────────────────────────────────
describe('WaterAnimationSystem — DIRS_4', () => {
  it('DIRS_4 包含四个方向', () => {
    const dirs = (WaterAnimationSystem as any).DIRS_4
    expect(dirs).toHaveLength(4)
  })

  it('DIRS_4 包含 [-1,0]', () => {
    const dirs: [number, number][] = (WaterAnimationSystem as any).DIRS_4
    expect(dirs.some(([dx, dy]) => dx === -1 && dy === 0)).toBe(true)
  })

  it('DIRS_4 包含 [1,0]', () => {
    const dirs: [number, number][] = (WaterAnimationSystem as any).DIRS_4
    expect(dirs.some(([dx, dy]) => dx === 1 && dy === 0)).toBe(true)
  })

  it('DIRS_4 包含 [0,-1]', () => {
    const dirs: [number, number][] = (WaterAnimationSystem as any).DIRS_4
    expect(dirs.some(([dx, dy]) => dx === 0 && dy === -1)).toBe(true)
  })

  it('DIRS_4 包含 [0,1]', () => {
    const dirs: [number, number][] = (WaterAnimationSystem as any).DIRS_4
    expect(dirs.some(([dx, dy]) => dx === 0 && dy === 1)).toBe(true)
  })
})
