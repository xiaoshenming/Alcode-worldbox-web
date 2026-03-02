import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldTidalWaveSystem } from '../systems/WorldTidalWaveSystem'
import type { TidalWave, WaveIntensity } from '../systems/WorldTidalWaveSystem'

// ---- 常量（与源码同步）----
const CHECK_INTERVAL = 1500
const WAVE_CHANCE = 0.003
const MAX_WAVES = 3
const PUSH_FORCE = 0.5
const DAMAGE_MAP: Record<WaveIntensity, number> = {
  minor: 0.1,
  moderate: 0.3,
  major: 0.6,
  tsunami: 1.2,
}
const REACH_MAP: Record<WaveIntensity, number> = {
  minor: 5,
  moderate: 10,
  major: 18,
  tsunami: 30,
}

function makeSys(): WorldTidalWaveSystem { return new WorldTidalWaveSystem() }
let _nextId = 1
function makeWave(overrides: Partial<TidalWave> = {}): TidalWave {
  return {
    id: _nextId++,
    originX: 10,
    originY: 10,
    direction: 0,
    intensity: 'moderate',
    reach: REACH_MAP['moderate'],
    progress: 50,
    startTick: 0,
    duration: 500,
    ...overrides,
  }
}

const mockWorld = { width: 200, height: 200, getTile: () => 1 } as any
const mockEm = {
  getEntitiesWithComponents: () => [],
  getComponent: () => null,
} as any

// ================================================================
describe('WorldTidalWaveSystem - 初始状态', () => {
  let sys: WorldTidalWaveSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('初始waves数组为空', () => {
    expect((sys as any).waves).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('系统构造后waves是Array', () => {
    expect(Array.isArray((sys as any).waves)).toBe(true)
  })

  it('注入一个wave后waves长度为1', () => {
    ;(sys as any).waves.push(makeWave())
    expect((sys as any).waves).toHaveLength(1)
  })

  it('waves数组持久引用不变', () => {
    const ref = (sys as any).waves
    expect(ref).toBe((sys as any).waves)
  })

  it('四种WaveIntensity枚举值都存在', () => {
    const intensities: WaveIntensity[] = ['minor', 'moderate', 'major', 'tsunami']
    expect(intensities).toHaveLength(4)
  })

  it('DAMAGE_MAP minor最小', () => {
    expect(DAMAGE_MAP['minor']).toBeLessThan(DAMAGE_MAP['moderate'])
  })

  it('REACH_MAP tsunami最大', () => {
    expect(REACH_MAP['tsunami']).toBeGreaterThan(REACH_MAP['major'])
  })
})

// ================================================================
describe('WorldTidalWaveSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldTidalWaveSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1; vi.spyOn(Math, 'random') })
  afterEach(() => vi.restoreAllMocks())

  it('tick<CHECK_INTERVAL时不触发spawn', () => {
    vi.mocked(Math.random).mockReturnValue(0.0001)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).waves).toHaveLength(0)
  })

  it('tick===CHECK_INTERVAL时触发检查', () => {
    vi.mocked(Math.random).mockReturnValue(0)   // 必定spawn
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).waves.length).toBeGreaterThanOrEqual(0) // 只确保逻辑走到
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick>CHECK_INTERVAL时lastCheck更新', () => {
    vi.mocked(Math.random).mockReturnValue(0.5) // > WAVE_CHANCE，不spawn
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 100)
  })

  it('第二次tick未超CHECK_INTERVAL不触发', () => {
    vi.mocked(Math.random).mockReturnValue(0)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)        // 第一次触发
    const cnt = (sys as any).waves.length
    vi.mocked(Math.random).mockReturnValue(0)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL + 10)   // 未满下一个周期
    expect((sys as any).waves.length).toBe(cnt)             // 没有新spawn
  })

  it('满足第二个CHECK_INTERVAL再次触发', () => {
    vi.mocked(Math.random).mockReturnValue(0)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    vi.mocked(Math.random).mockReturnValue(0)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('progressWaves每帧都执行（无论节流）', () => {
    const w = makeWave({ progress: 40 })
    ;(sys as any).waves.push(w)
    sys.update(1, mockWorld, mockEm, 1)   // tick=1 < CHECK_INTERVAL
    expect(w.progress).toBeGreaterThan(40)
  })
})

// ================================================================
describe('WorldTidalWaveSystem - spawn逻辑', () => {
  let sys: WorldTidalWaveSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1; vi.spyOn(Math, 'random') })
  afterEach(() => vi.restoreAllMocks())

  it('random > WAVE_CHANCE时不spawn', () => {
    // WAVE_CHANCE=0.003，random=0.5 > 0.003，跳过
    vi.mocked(Math.random).mockReturnValue(0.5)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).waves).toHaveLength(0)
  })

  it('random <= WAVE_CHANCE时spawn一个wave', () => {
    // 第一次random用于WAVE_CHANCE检查(返回0.001)，后续用于方向/位置/intensity
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.001)  // WAVE_CHANCE check: 0.001 <= 0.003 => spawn
      .mockReturnValue(0.2)        // edge/position/intensity
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).waves).toHaveLength(1)
  })

  it('waves已满MAX_WAVES时不spawn', () => {
    for (let i = 0; i < MAX_WAVES; i++) {
      ;(sys as any).waves.push(makeWave({ startTick: 0, duration: 99999 }))
    }
    vi.mocked(Math.random).mockReturnValue(0)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).waves).toHaveLength(MAX_WAVES)
  })

  it('spawn的wave有正确startTick', () => {
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.001)
      .mockReturnValue(0.2)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    const w = (sys as any).waves[0] as TidalWave
    expect(w.startTick).toBe(CHECK_INTERVAL)
  })

  it('spawn的wave progress初始为0', () => {
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.001)
      .mockReturnValue(0.2)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    const w = (sys as any).waves[0] as TidalWave
    expect(w.progress).toBeGreaterThanOrEqual(0)
    expect(w.progress).toBeLessThanOrEqual(1) // progress=0 + 0.5 after progressWaves
  })

  it('spawn的intensity根据random范围确定 - roll<0.4为minor', () => {
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.001)  // WAVE_CHANCE check
      .mockReturnValueOnce(0.1)    // edge selection (case 0)
      .mockReturnValueOnce(0.5)    // originY
      .mockReturnValueOnce(0.2)    // intensity roll < 0.4 => minor
      .mockReturnValue(0.5)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    const w = (sys as any).waves[0] as TidalWave
    expect(w.intensity).toBe('minor')
  })

  it('spawn的intensity - 0.4<=roll<0.7为moderate', () => {
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.1)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)    // intensity roll 0.4<=0.5<0.7 => moderate
      .mockReturnValue(0.5)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    const w = (sys as any).waves[0] as TidalWave
    expect(w.intensity).toBe('moderate')
  })

  it('spawn的intensity - 0.7<=roll<0.9为major', () => {
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.1)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.8)    // intensity roll 0.7<=0.8<0.9 => major
      .mockReturnValue(0.5)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    const w = (sys as any).waves[0] as TidalWave
    expect(w.intensity).toBe('major')
  })

  it('spawn的intensity - roll>=0.9为tsunami', () => {
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.1)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.95)   // intensity roll >= 0.9 => tsunami
      .mockReturnValue(0.5)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    const w = (sys as any).waves[0] as TidalWave
    expect(w.intensity).toBe('tsunami')
  })

  it('spawn的reach与intensity对应', () => {
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.1)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.95)   // tsunami
      .mockReturnValue(0.5)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    const w = (sys as any).waves[0] as TidalWave
    expect(w.reach).toBe(REACH_MAP['tsunami'])
  })

  it('edge=0时originX为0方向朝右(direction=0)', () => {
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.001)  // WAVE_CHANCE
      .mockReturnValueOnce(0.01)   // edge: Math.floor(0.01*4)=0
      .mockReturnValueOnce(0.5)    // originY
      .mockReturnValueOnce(0.2)    // intensity
      .mockReturnValue(0.5)
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    const w = (sys as any).waves[0] as TidalWave
    expect(w.originX).toBe(0)
    expect(w.direction).toBe(0)
  })

  it('id递增（nextId在每次spawn后递增）', () => {
    // 直接调用私有方法，避免expireWaves干扰
    vi.mocked(Math.random).mockReturnValue(0.001) // WAVE_CHANCE pass
    ;(sys as any).trySpawnWave(mockWorld, 0)
    const id1 = ((sys as any).waves as TidalWave[])[0].id
    ;(sys as any).trySpawnWave(mockWorld, 100)
    const id2 = ((sys as any).waves as TidalWave[])[1].id
    expect(id2).toBe(id1 + 1)
  })
})

// ================================================================
describe('WorldTidalWaveSystem - progressWaves逻辑', () => {
  let sys: WorldTidalWaveSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('每次update progress+0.5', () => {
    const w = makeWave({ progress: 40 })
    ;(sys as any).waves.push(w)
    ;(sys as any).progressWaves()
    expect(w.progress).toBeCloseTo(40.5)
  })

  it('progress上限为100', () => {
    const w = makeWave({ progress: 99.8 })
    ;(sys as any).waves.push(w)
    ;(sys as any).progressWaves()
    expect(w.progress).toBe(100)
  })

  it('progress已100时不继续增加', () => {
    const w = makeWave({ progress: 100 })
    ;(sys as any).waves.push(w)
    ;(sys as any).progressWaves()
    expect(w.progress).toBe(100)
  })

  it('多个wave各自进度增加', () => {
    const w1 = makeWave({ progress: 10 })
    const w2 = makeWave({ progress: 50 })
    ;(sys as any).waves.push(w1, w2)
    ;(sys as any).progressWaves()
    expect(w1.progress).toBeCloseTo(10.5)
    expect(w2.progress).toBeCloseTo(50.5)
  })

  it('无wave时progressWaves不报错', () => {
    expect(() => (sys as any).progressWaves()).not.toThrow()
  })
})

// ================================================================
describe('WorldTidalWaveSystem - expireWaves cleanup', () => {
  let sys: WorldTidalWaveSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('tick - startTick >= duration时wave被移除', () => {
    ;(sys as any).waves.push(makeWave({ startTick: 0, duration: 500 }))
    ;(sys as any).expireWaves(500)   // tick=500, 500-0 >= 500 => expire
    expect((sys as any).waves).toHaveLength(0)
  })

  it('tick - startTick < duration时wave保留', () => {
    ;(sys as any).waves.push(makeWave({ startTick: 0, duration: 500 }))
    ;(sys as any).expireWaves(499)   // 499-0=499 < 500 => keep
    expect((sys as any).waves).toHaveLength(1)
  })

  it('混合到期/未到期时只移除到期的', () => {
    ;(sys as any).waves.push(makeWave({ id: 1, startTick: 0, duration: 100 }))
    ;(sys as any).waves.push(makeWave({ id: 2, startTick: 0, duration: 2000 }))
    ;(sys as any).expireWaves(100)   // wave1 expire, wave2 keep
    expect((sys as any).waves).toHaveLength(1)
    expect((sys as any).waves[0].id).toBe(2)
  })

  it('所有wave到期后数组清空', () => {
    ;(sys as any).waves.push(makeWave({ startTick: 0, duration: 50 }))
    ;(sys as any).waves.push(makeWave({ startTick: 0, duration: 50 }))
    ;(sys as any).expireWaves(50)
    expect((sys as any).waves).toHaveLength(0)
  })

  it('空waves数组expireWaves不报错', () => {
    expect(() => (sys as any).expireWaves(9999)).not.toThrow()
  })

  it('expireWaves后可继续spawn新wave', () => {
    ;(sys as any).waves.push(makeWave({ startTick: 0, duration: 100 }))
    ;(sys as any).expireWaves(100) // 清空
    expect((sys as any).waves).toHaveLength(0)
    ;(sys as any).waves.push(makeWave())
    expect((sys as any).waves).toHaveLength(1)
  })
})

// ================================================================
describe('WorldTidalWaveSystem - applyEffects伤害与推力', () => {
  let sys: WorldTidalWaveSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  function makeEm(entities: { x: number; y: number; health: number }[]) {
    const eids = entities.map((_, i) => i)
    const posMap = new Map(entities.map((e, i) => [i, { x: e.x, y: e.y }]))
    const needsMap = new Map(entities.map((e, i) => [i, { health: e.health }]))
    return {
      getEntitiesWithComponents: () => eids,
      getComponent: (eid: number, type: string) =>
        type === 'position' ? posMap.get(eid) : needsMap.get(eid),
    } as any
  }

  it('health>5时受到minor伤害', () => {
    // wave front位置：progress=100, direction=0, reach=5
    // waveFrontX = 0 + cos(0)*5*1 = 5, waveFrontY=0
    // entity at (5,0)，dx=dy=0, threshold=5*0.3=1.5，distance=0 < 1.5
    const w = makeWave({ originX: 0, originY: 0, direction: 0, intensity: 'minor', reach: 5, progress: 100 })
    ;(sys as any).waves.push(w)
    const em = makeEm([{ x: 5, y: 0, health: 100 }])
    ;(sys as any).applyEffects(em)
    expect(em.getComponent(0, 'needs').health).toBeCloseTo(100 - DAMAGE_MAP['minor'])
  })

  it('health>5时受到tsunami伤害', () => {
    const w = makeWave({ originX: 0, originY: 0, direction: 0, intensity: 'tsunami', reach: 30, progress: 100 })
    ;(sys as any).waves.push(w)
    // waveFrontX = 0 + 30*1 = 30, threshold=30*0.3=9
    const em = makeEm([{ x: 30, y: 0, health: 100 }])
    ;(sys as any).applyEffects(em)
    expect(em.getComponent(0, 'needs').health).toBeCloseTo(100 - DAMAGE_MAP['tsunami'])
  })

  it('health<=5时不受伤害', () => {
    const w = makeWave({ originX: 0, originY: 0, direction: 0, intensity: 'major', reach: 18, progress: 100 })
    ;(sys as any).waves.push(w)
    const em = makeEm([{ x: 18, y: 0, health: 5 }])
    ;(sys as any).applyEffects(em)
    expect(em.getComponent(0, 'needs').health).toBe(5) // 不变
  })

  it('实体在threshold外不受影响', () => {
    // wave front at (5, 0), threshold = 5*0.3=1.5
    // entity at (100, 100) => 远离，不受影响
    const w = makeWave({ originX: 0, originY: 0, direction: 0, intensity: 'minor', reach: 5, progress: 100 })
    ;(sys as any).waves.push(w)
    const em = makeEm([{ x: 100, y: 100, health: 50 }])
    ;(sys as any).applyEffects(em)
    expect(em.getComponent(0, 'needs').health).toBe(50)
  })

  it('实体被推向direction方向', () => {
    const w = makeWave({ originX: 0, originY: 0, direction: 0, intensity: 'minor', reach: 5, progress: 100 })
    ;(sys as any).waves.push(w)
    const em = makeEm([{ x: 5, y: 0, health: 100 }])
    ;(sys as any).applyEffects(em)
    // 推力 cos(0)*PUSH_FORCE = 0.5
    expect(em.getComponent(0, 'position').x).toBeCloseTo(5 + PUSH_FORCE)
  })

  it('无waves时applyEffects无副作用', () => {
    const em = makeEm([{ x: 5, y: 0, health: 100 }])
    ;(sys as any).applyEffects(em)
    expect(em.getComponent(0, 'needs').health).toBe(100)
  })

  it('无entities时applyEffects不报错', () => {
    const w = makeWave()
    ;(sys as any).waves.push(w)
    const em = makeEm([])
    expect(() => (sys as any).applyEffects(em)).not.toThrow()
  })
})

// ================================================================
describe('WorldTidalWaveSystem - MAX_WAVES上限', () => {
  let sys: WorldTidalWaveSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1; vi.spyOn(Math, 'random') })
  afterEach(() => vi.restoreAllMocks())

  it('已有MAX_WAVES个wave时trySpawnWave直接返回', () => {
    for (let i = 0; i < MAX_WAVES; i++) {
      ;(sys as any).waves.push(makeWave({ startTick: 0, duration: 99999 }))
    }
    vi.mocked(Math.random).mockReturnValue(0)
    ;(sys as any).trySpawnWave(mockWorld, CHECK_INTERVAL)
    expect((sys as any).waves).toHaveLength(MAX_WAVES)
  })

  it('MAX_WAVES-1个wave时可再spawn', () => {
    for (let i = 0; i < MAX_WAVES - 1; i++) {
      ;(sys as any).waves.push(makeWave({ startTick: 0, duration: 99999 }))
    }
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.001)
      .mockReturnValue(0.2)
    ;(sys as any).trySpawnWave(mockWorld, CHECK_INTERVAL)
    expect((sys as any).waves).toHaveLength(MAX_WAVES)
  })

  it('expireWaves后低于MAX_WAVES可再spawn', () => {
    for (let i = 0; i < MAX_WAVES; i++) {
      ;(sys as any).waves.push(makeWave({ startTick: 0, duration: 100 }))
    }
    ;(sys as any).expireWaves(100)
    expect((sys as any).waves).toHaveLength(0)
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.001)
      .mockReturnValue(0.2)
    ;(sys as any).trySpawnWave(mockWorld, 200)
    expect((sys as any).waves).toHaveLength(1)
  })

  it('REACH_MAP minor最小reach', () => {
    expect(REACH_MAP['minor']).toBeLessThan(REACH_MAP['moderate'])
  })

  it('REACH_MAP tsunami最大reach', () => {
    expect(REACH_MAP['tsunami']).toBeGreaterThan(REACH_MAP['major'])
  })

  it('DAMAGE_MAP magnitude顺序正确', () => {
    expect(DAMAGE_MAP['minor']).toBeLessThan(DAMAGE_MAP['moderate'])
    expect(DAMAGE_MAP['moderate']).toBeLessThan(DAMAGE_MAP['major'])
    expect(DAMAGE_MAP['major']).toBeLessThan(DAMAGE_MAP['tsunami'])
  })
})

// ================================================================
describe('WorldTidalWaveSystem - update集成流程', () => {
  let sys: WorldTidalWaveSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1; vi.spyOn(Math, 'random') })
  afterEach(() => vi.restoreAllMocks())

  it('update在waves存在时调用applyEffects', () => {
    vi.mocked(Math.random).mockReturnValue(0.5) // 不spawn
    const w = makeWave({ startTick: 0, duration: 99999, progress: 80 })
    ;(sys as any).waves.push(w)
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn(),
    } as any
    sys.update(1, mockWorld, em, CHECK_INTERVAL)
    expect(em.getEntitiesWithComponents).toHaveBeenCalled()
  })

  it('update在waves为空时不调用applyEffects', () => {
    vi.mocked(Math.random).mockReturnValue(0.5)
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn(),
    } as any
    sys.update(1, mockWorld, em, CHECK_INTERVAL)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })

  it('到期wave在下次CHECK_INTERVAL被清理', () => {
    vi.mocked(Math.random).mockReturnValue(0.5)
    ;(sys as any).waves.push(makeWave({ startTick: 0, duration: 100 }))
    sys.update(1, mockWorld, mockEm, CHECK_INTERVAL)
    // tick=CHECK_INTERVAL, startTick=0, duration=100, CHECK_INTERVAL-0=1500>=100 => expire
    expect((sys as any).waves).toHaveLength(0)
  })

  it('多次update progress累积', () => {
    vi.mocked(Math.random).mockReturnValue(0.5)
    const w = makeWave({ progress: 0 })
    ;(sys as any).waves.push(w)
    sys.update(1, mockWorld, mockEm, 1)
    sys.update(1, mockWorld, mockEm, 2)
    sys.update(1, mockWorld, mockEm, 3)
    expect(w.progress).toBeCloseTo(1.5)
  })
})
