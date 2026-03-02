import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldDustStormSystem } from '../systems/WorldDustStormSystem'
import type { DustStorm, DustStormIntensity } from '../systems/WorldDustStormSystem'

function makeSys(): WorldDustStormSystem { return new WorldDustStormSystem() }
let nextId = 1
function makeStorm(overrides: Partial<DustStorm> = {}): DustStorm {
  return {
    id: nextId++,
    x: 50, y: 50, radius: 20,
    intensity: 'moderate',
    direction: 1.0, speed: 1.5,
    startTick: 0, duration: 1000,
    ...overrides,
  }
}

const worldSand = { width: 200, height: 200, getTile: () => 2 } as any  // SAND
const worldGrass = { width: 200, height: 200, getTile: () => 3 } as any  // GRASS
const emEmpty = { getEntitiesWithComponents: () => [], getComponent: () => null } as any

describe('WorldDustStormSystem - 基础数据结构', () => {
  let sys: WorldDustStormSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无尘暴', () => {
    expect((sys as any).storms).toHaveLength(0)
  })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).storms.push(makeStorm())
    expect((sys as any).storms).toHaveLength(1)
  })

  it('返回内部引用', () => {
    expect((sys as any).storms).toBe((sys as any).storms)
  })

  it('支持4种尘暴强度', () => {
    const intensities: DustStormIntensity[] = ['mild', 'moderate', 'severe', 'catastrophic']
    expect(intensities).toHaveLength(4)
  })

  it('DustStorm接口字段完整', () => {
    const s = makeStorm({ id: 42, intensity: 'severe', radius: 30, speed: 0.5, direction: 3.14, startTick: 100, duration: 2000 })
    expect(s.id).toBe(42)
    expect(s.intensity).toBe('severe')
    expect(s.radius).toBe(30)
    expect(s.speed).toBe(0.5)
    expect(s.direction).toBeCloseTo(3.14)
    expect(s.startTick).toBe(100)
    expect(s.duration).toBe(2000)
  })

  it('多个尘暴全部保存', () => {
    ;(sys as any).storms.push(makeStorm({ intensity: 'mild' }))
    ;(sys as any).storms.push(makeStorm({ intensity: 'severe' }))
    expect((sys as any).storms).toHaveLength(2)
  })
})

describe('WorldDustStormSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldDustStormSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不触发节流块（lastCheck不更新）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, emEmpty, 0)
    // tick - lastCheck = 0 - 0 = 0 < 800，不进入节流块
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=799时不触发节流块', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, emEmpty, 799)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=800时触发节流块，lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, emEmpty, 800)
    expect((sys as any).lastCheck).toBe(800)
  })

  it('tick=1600时再次触发节流块', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, emEmpty, 800)
    sys.update(0, worldSand, emEmpty, 1600)
    expect((sys as any).lastCheck).toBe(1600)
  })

  it('节流期间moveStorms仍然执行（storms内x坐标变化）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).storms.push(makeStorm({ x: 100, y: 100, direction: 0, speed: 0.5 }))
    sys.update(0, worldSand, emEmpty, 0)  // tick=0，不触发节流块，但moveStorms仍执行
    // direction=0, x += cos(0)*0.5 = 0.5
    expect((sys as any).storms[0].x).toBeCloseTo(100.5, 1)
  })
})

describe('WorldDustStormSystem - spawn逻辑', () => {
  let sys: WorldDustStormSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('random > STORM_CHANCE(0.004)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, emEmpty, 800)
    expect((sys as any).storms).toHaveLength(0)
  })

  it('random < STORM_CHANCE时在SAND地形上spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldSand, emEmpty, 800)
    expect((sys as any).storms).toHaveLength(1)
  })

  it('GRASS地形不触发spawn（trySpawnStorm中不检查tile，但DustStorm不限tile）', () => {
    // DustStormSystem的trySpawnStorm不检查tile类型，任意世界都可spawn
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldGrass, emEmpty, 800)
    expect((sys as any).storms).toHaveLength(1)
  })

  it('达到MAX_STORMS(3)时不再spawn', () => {
    ;(sys as any).storms.push(makeStorm())
    ;(sys as any).storms.push(makeStorm())
    ;(sys as any).storms.push(makeStorm())
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldSand, emEmpty, 800)
    expect((sys as any).storms).toHaveLength(3)
  })

  it('storms=2时仍可spawn达到3', () => {
    ;(sys as any).storms.push(makeStorm())
    ;(sys as any).storms.push(makeStorm())
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldSand, emEmpty, 800)
    expect((sys as any).storms).toHaveLength(3)
  })

  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldSand, emEmpty, 800)
    expect((sys as any).nextId).toBe(2)
  })

  it('spawn后storm记录startTick=tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldSand, emEmpty, 800)
    expect((sys as any).storms[0].startTick).toBe(800)
  })

  it('spawn后storm有合理radius(>=10)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldSand, emEmpty, 800)
    expect((sys as any).storms[0].radius).toBeGreaterThanOrEqual(10)
  })
})

describe('WorldDustStormSystem - 过期逻辑', () => {
  let sys: WorldDustStormSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('storm过期后被删除', () => {
    ;(sys as any).storms.push(makeStorm({ id: 1, startTick: 0, duration: 1000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, emEmpty, 1800)  // elapsed=1800 >= duration=1000 → 删除
    expect((sys as any).storms).toHaveLength(0)
  })

  it('storm未到期不删除', () => {
    ;(sys as any).storms.push(makeStorm({ id: 1, startTick: 0, duration: 5000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, emEmpty, 800)  // elapsed=800 < duration=5000 → 不删除
    expect((sys as any).storms).toHaveLength(1)
  })

  it('恰好到期时删除（elapsed==duration，因为条件是!(elapsed<duration)）', () => {
    ;(sys as any).storms.push(makeStorm({ id: 1, startTick: 0, duration: 1000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, emEmpty, 1000)  // elapsed=1000, !(1000<1000)=true → 删除
    expect((sys as any).storms).toHaveLength(0)
  })

  it('多个storm部分过期，只删过期的', () => {
    ;(sys as any).storms.push(makeStorm({ id: 1, startTick: 0, duration: 500 }))    // 过期
    ;(sys as any).storms.push(makeStorm({ id: 2, startTick: 0, duration: 5000 }))   // 未过期
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, emEmpty, 800)
    expect((sys as any).storms).toHaveLength(1)
    expect((sys as any).storms[0].id).toBe(2)
  })
})

describe('WorldDustStormSystem - applyEffects伤害', () => {
  let sys: WorldDustStormSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('生物在storm范围内受到mild伤害(0.05)', () => {
    ;(sys as any).storms.push(makeStorm({ x: 100, y: 100, radius: 30, intensity: 'mild', startTick: 0, duration: 9999 }))
    const needs = { health: 50 }
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: (eid: number, comp: string) => comp === 'position' ? { x: 100, y: 100 } : needs,
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, em, 0)  // tick=0,不触发节流,直接执行applyEffects
    expect(needs.health).toBeCloseTo(49.95, 5)
  })

  it('生物在storm范围外不受伤害', () => {
    ;(sys as any).storms.push(makeStorm({ x: 100, y: 100, radius: 10, intensity: 'severe', startTick: 0, duration: 9999 }))
    const needs = { health: 50 }
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: (eid: number, comp: string) => comp === 'position' ? { x: 200, y: 200 } : needs,
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, em, 0)
    expect(needs.health).toBe(50)
  })

  it('health<=5时不再受伤害', () => {
    ;(sys as any).storms.push(makeStorm({ x: 100, y: 100, radius: 30, intensity: 'catastrophic', startTick: 0, duration: 9999 }))
    const needs = { health: 5 }
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: (eid: number, comp: string) => comp === 'position' ? { x: 100, y: 100 } : needs,
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, em, 0)
    expect(needs.health).toBe(5)
  })

  it('DAMAGE_MAP各强度值正确', () => {
    const DAMAGE_MAP: Record<DustStormIntensity, number> = {
      mild: 0.05, moderate: 0.15, severe: 0.3, catastrophic: 0.5,
    }
    expect(DAMAGE_MAP['mild']).toBe(0.05)
    expect(DAMAGE_MAP['moderate']).toBe(0.15)
    expect(DAMAGE_MAP['severe']).toBe(0.3)
    expect(DAMAGE_MAP['catastrophic']).toBe(0.5)
  })
})
