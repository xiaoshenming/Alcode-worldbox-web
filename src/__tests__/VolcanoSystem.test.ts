import { describe, it, expect, beforeEach, vi } from 'vitest'
import { VolcanoSystem } from '../systems/VolcanoSystem'
import type { Volcano, LavaFlow } from '../systems/VolcanoSystem'

// ─────────────────────────────────── 辅助工厂 ─────────────────────────────────────
function makeSys(): VolcanoSystem { return new VolcanoSystem() }

let _nextId = 1
function makeVolcano(overrides: Partial<Volcano> = {}): Volcano {
  return {
    id: _nextId++,
    x: 10, y: 10,
    pressure: 50,
    pressureRate: 0.5,
    active: false,
    eruptionTick: 0,
    eruptionDuration: 200,
    dormantUntil: 0,
    lavaFlows: [],
    ...overrides,
  }
}

function makeLavaFlow(overrides: Partial<LavaFlow> = {}): LavaFlow {
  return {
    x: 10, y: 10,
    dx: 0.5, dy: 0.5,
    heat: 80,
    age: 0,
    ...overrides,
  }
}

/** 轻量世界 mock */
function makeWorld(width = 50, height = 50, defaultTile = 3) {
  const grid = new Uint8Array(width * height).fill(defaultTile)
  return {
    width,
    height,
    getTile: (x: number, y: number) => grid[y * width + x] ?? -1,
    setTile: vi.fn((x: number, y: number, t: number) => { grid[y * width + x] = t }),
  }
}

/** 轻量 ParticleSystem mock */
function makeParticles() {
  return { spawnExplosion: vi.fn() }
}

// ─────────────────────────────────────────────
// getVolcanoes 基础
// ─────────────────────────────────────────────
describe('VolcanoSystem.getVolcanoes 基础', () => {
  let sys: VolcanoSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('初始无火山', () => { expect(sys.getVolcanoes()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).volcanoes.push(makeVolcano())
    expect(sys.getVolcanoes()).toHaveLength(1)
  })
  it('返回同一引用（只读数组）', () => {
    ;(sys as any).volcanoes.push(makeVolcano())
    expect(sys.getVolcanoes()).toBe(sys.getVolcanoes())
  })
  it('火山 pressure 字段正确', () => {
    ;(sys as any).volcanoes.push(makeVolcano({ pressure: 50 }))
    expect(sys.getVolcanoes()[0].pressure).toBe(50)
  })
  it('火山 active 字段正确', () => {
    ;(sys as any).volcanoes.push(makeVolcano({ active: false }))
    expect(sys.getVolcanoes()[0].active).toBe(false)
  })
  it('火山 lavaFlows 初始为空', () => {
    ;(sys as any).volcanoes.push(makeVolcano())
    expect(sys.getVolcanoes()[0].lavaFlows).toHaveLength(0)
  })
  it('多个火山全部返回', () => {
    ;(sys as any).volcanoes.push(makeVolcano())
    ;(sys as any).volcanoes.push(makeVolcano())
    expect(sys.getVolcanoes()).toHaveLength(2)
  })
})

// ─────────────────────────────────────────────
// createVolcano
// ─────────────────────────────────────────────
describe('VolcanoSystem.createVolcano', () => {
  let sys: VolcanoSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('createVolcano 返回 Volcano 对象', () => {
    const v = sys.createVolcano(10, 10)
    expect(v).not.toBeNull()
    expect(v).toBeDefined()
  })
  it('createVolcano 后 getVolcanoes 长度为 1', () => {
    sys.createVolcano(10, 10)
    expect(sys.getVolcanoes()).toHaveLength(1)
  })
  it('创建的火山 x 坐标正确', () => {
    const v = sys.createVolcano(30, 20)
    expect(v!.x).toBe(30)
  })
  it('创建的火山 y 坐标正确', () => {
    const v = sys.createVolcano(30, 20)
    expect(v!.y).toBe(20)
  })
  it('创建的火山 active=false', () => {
    const v = sys.createVolcano(10, 10)
    expect(v!.active).toBe(false)
  })
  it('创建的火山 pressure 在 [0,30) 范围', () => {
    const v = sys.createVolcano(10, 10)
    expect(v!.pressure).toBeGreaterThanOrEqual(0)
    expect(v!.pressure).toBeLessThan(30)
  })
  it('创建的火山 pressureRate 在 [0.02, 0.07] 范围', () => {
    const v = sys.createVolcano(10, 10)
    expect(v!.pressureRate).toBeGreaterThanOrEqual(0.02)
    expect(v!.pressureRate).toBeLessThan(0.07)
  })
  it('创建的火山 eruptionDuration >= 300', () => {
    const v = sys.createVolcano(10, 10)
    expect(v!.eruptionDuration).toBeGreaterThanOrEqual(300)
  })
  it('创建的火山 dormantUntil=0', () => {
    const v = sys.createVolcano(10, 10)
    expect(v!.dormantUntil).toBe(0)
  })
  it('创建的火山 lavaFlows 为空', () => {
    const v = sys.createVolcano(10, 10)
    expect(v!.lavaFlows).toHaveLength(0)
  })
  it('达到 MAX_VOLCANOES=10 时 createVolcano 返回 null', () => {
    for (let i = 0; i < 10; i++) {
      sys.createVolcano(i * 30, i * 30)
    }
    const result = sys.createVolcano(999, 999)
    expect(result).toBeNull()
  })
  it('距离过近时 createVolcano 返回 null（< 20 格）', () => {
    sys.createVolcano(10, 10)
    // dx=5,dy=0 → distance²=25 < 400
    const result = sys.createVolcano(15, 10)
    expect(result).toBeNull()
  })
  it('距离足够时 createVolcano 成功', () => {
    sys.createVolcano(10, 10)
    // dx=25,dy=0 → distance²=625 > 400
    const result = sys.createVolcano(35, 10)
    expect(result).not.toBeNull()
  })
  it('createVolcano 分配递增 id', () => {
    const v1 = sys.createVolcano(10, 10)
    const v2 = sys.createVolcano(50, 50)
    expect(v2!.id).toBeGreaterThan(v1!.id)
  })
})

// ─────────────────────────────────────────────
// startEruption / endEruption（私有方法）
// ─────────────────────────────────────────────
describe('VolcanoSystem 私有方法 startEruption/endEruption', () => {
  let sys: VolcanoSystem
  beforeEach(() => { sys = makeSys() })

  it('startEruption 将 active 置为 true', () => {
    const v = makeVolcano()
    ;(sys as any).startEruption(v, 1000)
    expect(v.active).toBe(true)
  })
  it('startEruption 记录 eruptionTick', () => {
    const v = makeVolcano()
    ;(sys as any).startEruption(v, 1000)
    expect(v.eruptionTick).toBe(1000)
  })
  it('startEruption 将 pressure 清零', () => {
    const v = makeVolcano({ pressure: 100 })
    ;(sys as any).startEruption(v, 0)
    expect(v.pressure).toBe(0)
  })
  it('startEruption 清空 lavaFlows', () => {
    const v = makeVolcano()
    v.lavaFlows.push(makeLavaFlow())
    ;(sys as any).startEruption(v, 0)
    expect(v.lavaFlows).toHaveLength(0)
  })
  it('endEruption 将 active 置为 false', () => {
    const v = makeVolcano({ active: true })
    ;(sys as any).endEruption(v, 2000)
    expect(v.active).toBe(false)
  })
  it('endEruption 设置 dormantUntil >= tick+2000', () => {
    const v = makeVolcano({ active: true })
    ;(sys as any).endEruption(v, 500)
    expect(v.dormantUntil).toBeGreaterThanOrEqual(2500)
  })
  it('endEruption 重置 eruptionDuration >= 300', () => {
    const v = makeVolcano({ active: true })
    ;(sys as any).endEruption(v, 0)
    expect(v.eruptionDuration).toBeGreaterThanOrEqual(300)
  })
})

// ─────────────────────────────────────────────
// spreadLava（私有方法）
// ─────────────────────────────────────────────
describe('VolcanoSystem 私有方法 spreadLava', () => {
  let sys: VolcanoSystem
  beforeEach(() => { sys = makeSys() })

  it('spreadLava 向 lavaFlows 添加一条', () => {
    const v = makeVolcano()
    const world = makeWorld()
    ;(sys as any).spreadLava(v, world)
    expect(v.lavaFlows).toHaveLength(1)
  })
  it('新 lavaFlow heat=100', () => {
    const v = makeVolcano()
    const world = makeWorld()
    ;(sys as any).spreadLava(v, world)
    expect(v.lavaFlows[0].heat).toBe(100)
  })
  it('新 lavaFlow age=0', () => {
    const v = makeVolcano()
    const world = makeWorld()
    ;(sys as any).spreadLava(v, world)
    expect(v.lavaFlows[0].age).toBe(0)
  })
  it('新 lavaFlow 起点等于火山坐标', () => {
    const v = makeVolcano({ x: 20, y: 30 })
    const world = makeWorld()
    ;(sys as any).spreadLava(v, world)
    expect(v.lavaFlows[0].x).toBe(20)
    expect(v.lavaFlows[0].y).toBe(30)
  })
  it('达到 MAX_LAVA_PER_VOLCANO=80 时 spreadLava 不添加', () => {
    const v = makeVolcano()
    const world = makeWorld()
    for (let i = 0; i < 80; i++) {
      v.lavaFlows.push(makeLavaFlow())
    }
    ;(sys as any).spreadLava(v, world)
    expect(v.lavaFlows).toHaveLength(80)
  })
})

// ─────────────────────────────────────────────
// updateLavaFlows（私有方法）
// ─────────────────────────────────────────────
describe('VolcanoSystem 私有方法 updateLavaFlows', () => {
  let sys: VolcanoSystem
  beforeEach(() => { sys = makeSys() })

  it('lavaFlow age 每次加 1', () => {
    const v = makeVolcano()
    v.lavaFlows.push(makeLavaFlow({ heat: 50, age: 0 }))
    const world = makeWorld()
    ;(sys as any).updateLavaFlows(v, world)
    expect(v.lavaFlows[0].age).toBe(1)
  })
  it('lavaFlow heat 每帧减少', () => {
    const v = makeVolcano()
    v.lavaFlows.push(makeLavaFlow({ heat: 50, age: 0 }))
    const world = makeWorld()
    ;(sys as any).updateLavaFlows(v, world)
    expect(v.lavaFlows[0].heat).toBeLessThan(50)
  })
  it('heat <= 0 时 lavaFlow 被移除', () => {
    const v = makeVolcano({ x: 5, y: 5 })
    v.lavaFlows.push(makeLavaFlow({ heat: 0.1, x: 5, y: 5 }))
    const world = makeWorld()
    ;(sys as any).updateLavaFlows(v, world)
    expect(v.lavaFlows).toHaveLength(0)
  })
  it('lava 冷却成石头后 world.setTile 被调用', () => {
    const v = makeVolcano({ x: 5, y: 5 })
    v.lavaFlows.push(makeLavaFlow({ heat: 0.1, x: 5, y: 5 }))
    const world = makeWorld(20, 20, 3) // GRASS
    ;(sys as any).updateLavaFlows(v, world)
    expect(world.setTile).toHaveBeenCalled()
  })
  it('lava 进入水域（tile=0）触发 setTile(STONE=5)', () => {
    const v = makeVolcano({ x: 5, y: 5 })
    const world = makeWorld(20, 20, 0) // all DEEP_WATER
    v.lavaFlows.push(makeLavaFlow({ heat: 50, x: 5, y: 5 }))
    ;(sys as any).updateLavaFlows(v, world)
    // tile=0 → water, should convert to STONE=5
    expect(world.setTile).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 5)
  })
  it('越界 lavaFlow 被移除', () => {
    const v = makeVolcano()
    // 放在边界外
    v.lavaFlows.push(makeLavaFlow({ heat: 80, x: -10, y: -10 }))
    const world = makeWorld(20, 20, 3)
    ;(sys as any).updateLavaFlows(v, world)
    expect(v.lavaFlows).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────
// update 主循环
// ───────────────────────────────────────��─────
describe('VolcanoSystem.update 主循环', () => {
  let sys: VolcanoSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('dormant 火山 pressure 增加', () => {
    const v = makeVolcano({ pressure: 10, pressureRate: 1, dormantUntil: 0 })
    ;(sys as any).volcanoes.push(v)
    const world = makeWorld()
    const particles = makeParticles()
    sys.update(1, world as any, particles as any)
    expect(v.pressure).toBeGreaterThan(10)
  })
  it('dormantUntil 未到时 pressure 不增加', () => {
    const v = makeVolcano({ pressure: 10, pressureRate: 1, dormantUntil: 9999 })
    ;(sys as any).volcanoes.push(v)
    const world = makeWorld()
    const particles = makeParticles()
    sys.update(1, world as any, particles as any)
    expect(v.pressure).toBe(10)
  })
  it('pressure 达到 100 时触发 startEruption', () => {
    const v = makeVolcano({ pressure: 99.9, pressureRate: 5, dormantUntil: 0 })
    ;(sys as any).volcanoes.push(v)
    const world = makeWorld()
    const particles = makeParticles()
    sys.update(1, world as any, particles as any)
    expect(v.active).toBe(true)
  })
  it('eruption 超过 eruptionDuration 后停止', () => {
    const v = makeVolcano({ active: true, eruptionTick: 0, eruptionDuration: 5 })
    ;(sys as any).volcanoes.push(v)
    const world = makeWorld()
    const particles = makeParticles()
    sys.update(10, world as any, particles as any) // elapsed=10 > 5
    expect(v.active).toBe(false)
  })
  it('eruption 期间在 LAVA_SPREAD_INTERVAL 倍数 tick 扩散熔岩', () => {
    const v = makeVolcano({ active: true, eruptionTick: 0, eruptionDuration: 9999 })
    ;(sys as any).volcanoes.push(v)
    const world = makeWorld()
    const particles = makeParticles()
    // LAVA_SPREAD_INTERVAL = 30，tick=30 时触发
    sys.update(30, world as any, particles as any)
    expect(v.lavaFlows.length).toBeGreaterThan(0)
  })
  it('eruption 期间 particles.spawnExplosion 被调用', () => {
    const v = makeVolcano({ active: true, eruptionTick: 0, eruptionDuration: 9999 })
    ;(sys as any).volcanoes.push(v)
    const world = makeWorld()
    const particles = makeParticles()
    // tick % 20 === 0 时调用
    sys.update(20, world as any, particles as any)
    expect(particles.spawnExplosion).toHaveBeenCalled()
  })
  it('dormant 且 pressure > 70 时低概率调用 spawnExplosion', () => {
    // 强制 Math.random 返回 0 使条件必然触发
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const v = makeVolcano({ pressure: 75, pressureRate: 0.01, dormantUntil: 0 })
    ;(sys as any).volcanoes.push(v)
    const world = makeWorld()
    const particles = makeParticles()
    sys.update(1, world as any, particles as any)
    expect(particles.spawnExplosion).toHaveBeenCalled()
    vi.restoreAllMocks()
  })
  it('无火山时 update 不崩溃', () => {
    const world = makeWorld()
    const particles = makeParticles()
    expect(() => sys.update(1, world as any, particles as any)).not.toThrow()
  })
  it('update 后 eruptionTick 在 startEruption 时更新', () => {
    const v = makeVolcano({ pressure: 99.9, pressureRate: 5, dormantUntil: 0 })
    ;(sys as any).volcanoes.push(v)
    const world = makeWorld()
    const particles = makeParticles()
    sys.update(42, world as any, particles as any)
    expect(v.eruptionTick).toBe(42)
  })
})

// ─────────────────────────────────────────────
// autoPlaceVolcanoes（需要合适的 World mock）
// ─────────────────────────────────────────────
describe('VolcanoSystem.autoPlaceVolcanoes', () => {
  let sys: VolcanoSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('已有 3 个火山时 autoPlaceVolcanoes 不创建新的', () => {
    ;(sys as any).volcanoes.push(makeVolcano({ x: 10, y: 10 }))
    ;(sys as any).volcanoes.push(makeVolcano({ x: 80, y: 80 }))
    ;(sys as any).volcanoes.push(makeVolcano({ x: 150, y: 150 }))
    const world = makeWorld(200, 200, 6) // all MOUNTAIN
    sys.autoPlaceVolcanoes(world as any)
    expect(sys.getVolcanoes()).toHaveLength(3)
  })
  it('全部 GRASS 地图中 autoPlaceVolcanoes 不创建（无候选山地）', () => {
    const world = makeWorld(200, 200, 3) // all GRASS
    sys.autoPlaceVolcanoes(world as any)
    expect(sys.getVolcanoes()).toHaveLength(0)
  })
  it('autoPlaceVolcanoes 不崩溃', () => {
    const world = makeWorld(100, 100, 3)
    expect(() => sys.autoPlaceVolcanoes(world as any)).not.toThrow()
  })
})
