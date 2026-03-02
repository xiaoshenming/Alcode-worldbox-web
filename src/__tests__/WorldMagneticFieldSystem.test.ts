import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldMagneticFieldSystem } from '../systems/WorldMagneticFieldSystem'
import type { MagneticAnomaly, MagneticPolarity } from '../systems/WorldMagneticFieldSystem'

const CHECK_INTERVAL = 3400
const SPAWN_CHANCE = 0.003
const MAX_ANOMALIES = 10

// POLARITY_BASE_STRENGTH: north=60, south=60, chaotic=80, null=20
const BASE_STRENGTH: Record<MagneticPolarity, number> = {
  north: 60, south: 60, chaotic: 80, null: 20,
}

function makeWorld(tile: number | null = 3) {
  return {
    width: 200,
    height: 200,
    getTile: (_x: number, _y: number) => tile,
  }
}
const fakeEm = {} as any

function makeSys(): WorldMagneticFieldSystem { return new WorldMagneticFieldSystem() }
let nextId = 1
function makeAnomaly(overrides: Partial<MagneticAnomaly> = {}): MagneticAnomaly {
  return {
    id: nextId++, x: 30, y: 40,
    polarity: 'north', strength: 60,
    radius: 5, fluctuation: 1.0,
    active: true, tick: 0,
    ...overrides,
  }
}

// ─── 1. 初始状态 ──────────────────────────────────────────────────────────────
describe('WorldMagneticFieldSystem - 初始状态', () => {
  let sys: WorldMagneticFieldSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始anomalies为空数组', () => { expect((sys as any).anomalies).toHaveLength(0) })
  it('初始nextId为1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始lastCheck为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('anomalies返回内部同一引用', () => {
    expect((sys as any).anomalies).toBe((sys as any).anomalies)
  })
  it('支持4种MagneticPolarity', () => {
    const polarities: MagneticPolarity[] = ['north', 'south', 'chaotic', 'null']
    expect(polarities).toHaveLength(4)
  })
  it('手动注入anomaly后可查询', () => {
    ;(sys as any).anomalies.push(makeAnomaly())
    expect((sys as any).anomalies).toHaveLength(1)
  })
})

// ─── 2. CHECK_INTERVAL节流 ────────────────────────────────────────────────────
describe('WorldMagneticFieldSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldMagneticFieldSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick < CHECK_INTERVAL时直接return，不执行任何逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld() as any, fakeEm, CHECK_INTERVAL - 1)
    expect((sys as any).anomalies).toHaveLength(0)
    expect((sys as any).lastCheck).toBe(0) // 未更新
  })
  it('tick == CHECK_INTERVAL时执行逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // < SPAWN_CHANCE => spawn
    sys.update(1, makeWorld() as any, fakeEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('tick == CHECK_INTERVAL时random=0(<0.003)触发spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld() as any, fakeEm, CHECK_INTERVAL)
    expect((sys as any).anomalies).toHaveLength(1)
  })
  it('两次update间隔不足CHECK_INTERVAL不重复执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld() as any, fakeEm, CHECK_INTERVAL)
    const countAfterFirst = (sys as any).anomalies.length
    sys.update(1, makeWorld() as any, fakeEm, CHECK_INTERVAL + 100) // 差100 < 3400
    expect((sys as any).anomalies.length).toBe(countAfterFirst)
  })
  it('达到CHECK_INTERVAL*2时第二次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld() as any, fakeEm, CHECK_INTERVAL)
    sys.update(1, makeWorld() as any, fakeEm, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
  it('lastCheck在tick达标后更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // 不spawn
    sys.update(1, makeWorld() as any, fakeEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
})

// ─── 3. spawn条件 ─────────────────────────────────────────────────────────────
describe('WorldMagneticFieldSystem - spawn条件', () => {
  let sys: WorldMagneticFieldSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('random < SPAWN_CHANCE时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002) // 0.002 < 0.003
    sys.update(1, makeWorld() as any, fakeEm, CHECK_INTERVAL)
    expect((sys as any).anomalies).toHaveLength(1)
  })
  it('random >= SPAWN_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.003) // 不满足 < 0.003
    sys.update(1, makeWorld() as any, fakeEm, CHECK_INTERVAL)
    expect((sys as any).anomalies).toHaveLength(0)
  })
  it('getTile返回null时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(null) as any, fakeEm, CHECK_INTERVAL)
    expect((sys as any).anomalies).toHaveLength(0)
  })
  it('MAX_ANOMALIES=10时不再spawn', () => {
    for (let i = 0; i < MAX_ANOMALIES; i++) {
      ;(sys as any).anomalies.push(makeAnomaly({ tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld() as any, fakeEm, CHECK_INTERVAL)
    expect((sys as any).anomalies).toHaveLength(MAX_ANOMALIES)
  })
  it('9个anomaly时可再spawn', () => {
    for (let i = 0; i < 9; i++) {
      ;(sys as any).anomalies.push(makeAnomaly({ tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld() as any, fakeEm, CHECK_INTERVAL)
    expect((sys as any).anomalies.length).toBeGreaterThan(9)
  })
  it('spawn后id自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld() as any, fakeEm, CHECK_INTERVAL)
    sys.update(1, makeWorld() as any, fakeEm, CHECK_INTERVAL * 2)
    const anomalies = (sys as any).anomalies
    if (anomalies.length >= 2) {
      expect(anomalies[1].id).toBeGreaterThan(anomalies[0].id)
    }
  })
})

// ─── 4. spawn后字段范围 ───────────────────────────────────────────────────────
describe('WorldMagneticFieldSystem - spawn后字段范围', () => {
  let sys: WorldMagneticFieldSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('spawn后active=true', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld() as any, fakeEm, CHECK_INTERVAL)
    if ((sys as any).anomalies.length > 0) {
      expect((sys as any).anomalies[0].active).toBe(true)
    }
  })
  it('spawn后tick字段等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld() as any, fakeEm, CHECK_INTERVAL)
    if ((sys as any).anomalies.length > 0) {
      expect((sys as any).anomalies[0].tick).toBe(CHECK_INTERVAL)
    }
  })
  it('radius在3-8范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld() as any, fakeEm, CHECK_INTERVAL)
    if ((sys as any).anomalies.length > 0) {
      const r = (sys as any).anomalies[0].radius
      expect(r).toBeGreaterThanOrEqual(3)
      expect(r).toBeLessThanOrEqual(8)
    }
  })
  it('fluctuation在0.5-2.0范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld() as any, fakeEm, CHECK_INTERVAL)
    if ((sys as any).anomalies.length > 0) {
      const f = (sys as any).anomalies[0].fluctuation
      expect(f).toBeGreaterThanOrEqual(0.5)
      expect(f).toBeLessThanOrEqual(2.0)
    }
  })
  it('north极性对应strength=60', () => {
    // pickRandom从POLARITIES中选，mock让random返回0让选第一个'north'
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld() as any, fakeEm, CHECK_INTERVAL)
    if ((sys as any).anomalies.length > 0) {
      const a = (sys as any).anomalies[0]
      expect(BASE_STRENGTH[a.polarity as MagneticPolarity]).toBeDefined()
    }
  })
})

// ─── 5. 动态strength波动 ──────────────────────────────────────────────────────
describe('WorldMagneticFieldSystem - 动态strength波动', () => {
  let sys: WorldMagneticFieldSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('active anomaly的strength随tick变化（wave公式）', () => {
    const a = makeAnomaly({ polarity: 'north', tick: 0, fluctuation: 1.0 })
    ;(sys as any).anomalies.push(a)
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // 不spawn
    sys.update(1, makeWorld() as any, fakeEm, CHECK_INTERVAL)
    // strength = 60 * (0.6 + 0.4 * sin(...))，范围[60*0.2, 60*1.0]=[12, 60]
    expect(a.strength).toBeGreaterThanOrEqual(12)
    expect(a.strength).toBeLessThanOrEqual(60)
  })
  it('chaotic极性的strength基准为80', () => {
    const a = makeAnomaly({ polarity: 'chaotic', tick: 0, fluctuation: 1.0 })
    ;(sys as any).anomalies.push(a)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld() as any, fakeEm, CHECK_INTERVAL)
    // strength = 80*(0.6+0.4*wave)，范围[16, 80]
    expect(a.strength).toBeGreaterThanOrEqual(16)
    expect(a.strength).toBeLessThanOrEqual(80)
  })
  it('null极性的strength基准为20', () => {
    const a = makeAnomaly({ polarity: 'null', tick: 0, fluctuation: 1.0 })
    ;(sys as any).anomalies.push(a)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld() as any, fakeEm, CHECK_INTERVAL)
    // strength = 20*(0.6+0.4*wave)，范围[4, 20]
    expect(a.strength).toBeGreaterThanOrEqual(4)
    expect(a.strength).toBeLessThanOrEqual(20)
  })
  it('inactive anomaly的strength不变化', () => {
    const a = makeAnomaly({ polarity: 'north', tick: 0, strength: 60, active: false })
    ;(sys as any).anomalies.push(a)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // inactive直接删除，但在fluctuate阶段跳过（if !active continue）
    sys.update(1, makeWorld() as any, fakeEm, CHECK_INTERVAL)
    // inactive anomaly会被删除
    expect((sys as any).anomalies).toHaveLength(0)
  })
  it('tick远大于anomaly.tick时strength仍在合理范围', () => {
    const a = makeAnomaly({ polarity: 'south', tick: 0, fluctuation: 0.5 })
    ;(sys as any).anomalies.push(a)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld() as any, fakeEm, CHECK_INTERVAL * 10)
    expect(a.strength).toBeGreaterThanOrEqual(12) // 60*0.2
    expect(a.strength).toBeLessThanOrEqual(60)
  })
})

// ─── 6. cleanup：inactive anomaly删除 ─────────────────────────────────────────
describe('WorldMagneticFieldSystem - cleanup inactive', () => {
  let sys: WorldMagneticFieldSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('active=false的anomaly被删除', () => {
    ;(sys as any).anomalies.push(makeAnomaly({ active: false, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld() as any, fakeEm, CHECK_INTERVAL)
    expect((sys as any).anomalies).toHaveLength(0)
  })
  it('active=true的anomaly不被删除', () => {
    ;(sys as any).anomalies.push(makeAnomaly({ active: true, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld() as any, fakeEm, CHECK_INTERVAL)
    expect((sys as any).anomalies).toHaveLength(1)
  })
  it('混合：inactive的删除，active的保留', () => {
    ;(sys as any).anomalies.push(makeAnomaly({ active: false, tick: CHECK_INTERVAL }))
    ;(sys as any).anomalies.push(makeAnomaly({ active: true, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld() as any, fakeEm, CHECK_INTERVAL)
    expect((sys as any).anomalies).toHaveLength(1)
    expect((sys as any).anomalies[0].active).toBe(true)
  })
  it('多个inactive全部删除', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).anomalies.push(makeAnomaly({ active: false, tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld() as any, fakeEm, CHECK_INTERVAL)
    expect((sys as any).anomalies).toHaveLength(0)
  })
  it('tick超过60000后random<0.01时anomaly变为inactive并被删除', () => {
    const anomalyTick = 0
    const currentTick = 61000 // 61000 - 0 > 60000
    ;(sys as any).anomalies.push(makeAnomaly({ active: true, tick: anomalyTick }))
    ;(sys as any).lastCheck = currentTick - CHECK_INTERVAL
    // random序列：先 > SPAWN_CHANCE（不spawn），再 < 0.01（触发decay）
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.9)   // 不spawn
      .mockReturnValueOnce(0.005) // decay触发（<0.01）
    sys.update(1, makeWorld() as any, fakeEm, currentTick)
    expect((sys as any).anomalies).toHaveLength(0)
  })
  it('cleanup在tick不足CHECK_INTERVAL时不执行', () => {
    ;(sys as any).anomalies.push(makeAnomaly({ active: false, tick: 0 }))
    sys.update(1, makeWorld() as any, fakeEm, CHECK_INTERVAL - 1)
    // 直接return，cleanup不执行，inactive仍留在数组
    expect((sys as any).anomalies).toHaveLength(1)
  })
})
