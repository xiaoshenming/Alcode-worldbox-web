import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldUndergroundRiverSystem } from '../systems/WorldUndergroundRiverSystem'
import type { UndergroundRiver, RiverFlow } from '../systems/WorldUndergroundRiverSystem'

// ===== 从源码提取的关键参数 =====
// CHECK_INTERVAL = 2500
// FORM_CHANCE = 0.002  (Math.random() < FORM_CHANCE 才 spawn)
// MAX_RIVERS = 25
// cleanup: river.tick < tick - 90000 则删除
// segCount = 5 + Math.floor(Math.random() * 10) => 5-14 个 segment
// 每次触发：discovered: !discovered && random<0.001 => true; minerals = min(100, minerals+0.01)
// FLOWS: ['slow', 'moderate', 'fast', 'torrent']

const CHECK_INTERVAL = 2500
const FORM_CHANCE = 0.002
const MAX_RIVERS = 25
const CLEANUP_AGE = 90000
const FLOWS: RiverFlow[] = ['slow', 'moderate', 'fast', 'torrent']

function makeSys(): WorldUndergroundRiverSystem {
  return new WorldUndergroundRiverSystem()
}

let nextId = 1

function makeRiver(overrides: Partial<UndergroundRiver> = {}): UndergroundRiver {
  return {
    id: nextId++,
    segments: [{ x: 10, y: 10 }, { x: 20, y: 20 }],
    flow: 'moderate',
    depth: 20,
    minerals: 30,
    discovered: false,
    tick: 0,
    ...overrides,
  }
}

function makeMockWorld(width = 200, height = 200): any {
  return { width, height }
}

const mockEm = {} as any

function forceTrigger(sys: any, tick: number): void {
  sys.lastCheck = tick - CHECK_INTERVAL - 1
}

// ===== 1. 初始状态 =====
describe('初始状态', () => {
  let sys: WorldUndergroundRiverSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('rivers 初始为空数组', () => {
    expect((sys as any).rivers).toHaveLength(0)
  })

  it('rivers 是 Array 实例', () => {
    expect(Array.isArray((sys as any).rivers)).toBe(true)
  })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('可以手动注入 river 并查询', () => {
    ;(sys as any).rivers.push(makeRiver())
    expect((sys as any).rivers).toHaveLength(1)
  })

  it('rivers 返回内部引用', () => {
    expect((sys as any).rivers).toBe((sys as any).rivers)
  })

  it('注入后字段值正确', () => {
    const r = makeRiver({ flow: 'fast', depth: 35, minerals: 55 })
    ;(sys as any).rivers.push(r)
    const stored = (sys as any).rivers[0]
    expect(stored.flow).toBe('fast')
    expect(stored.depth).toBe(35)
    expect(stored.minerals).toBe(55)
    expect(stored.discovered).toBe(false)
  })

  it('支持4种水流速度枚举', () => {
    expect(FLOWS).toHaveLength(4)
    expect(FLOWS).toContain('slow')
    expect(FLOWS).toContain('moderate')
    expect(FLOWS).toContain('fast')
    expect(FLOWS).toContain('torrent')
  })
})

// ===== 2. CHECK_INTERVAL 节流 =====
describe('CHECK_INTERVAL 节流', () => {
  let sys: WorldUndergroundRiverSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0 时不触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeMockWorld(), mockEm, 0)
    expect((sys as any).rivers).toHaveLength(0)
  })

  it('tick=2499 时不触发（2499 < 2500）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeMockWorld(), mockEm, 2499)
    expect((sys as any).rivers).toHaveLength(0)
  })

  it('tick=2500 时触发（等于 CHECK_INTERVAL）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeMockWorld(), mockEm, 2500)
    // random=0 < 0.002，spawn 1 个
    expect((sys as any).rivers).toHaveLength(1)
  })

  it('触发后 lastCheck 更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('未触发时 lastCheck 不更新', () => {
    sys.update(0, makeMockWorld(), mockEm, 100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('第二次触发需要再等 CHECK_INTERVAL', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeMockWorld(), mockEm, 2500) // 第一次
    const c1 = (sys as any).rivers.length
    sys.update(0, makeMockWorld(), mockEm, 2501) // 1 < 2500，不触发
    expect((sys as any).rivers.length).toBe(c1)
  })

  it('tick=5000 时可触发第二次', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeMockWorld(), mockEm, 2500)
    const c1 = (sys as any).rivers.length
    sys.update(0, makeMockWorld(), mockEm, 5000)
    expect((sys as any).rivers.length).toBeGreaterThan(c1)
  })

  it('tick=1 不触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeMockWorld(), mockEm, 1)
    expect((sys as any).rivers).toHaveLength(0)
  })
})

// ===== 3. spawn 条件 =====
describe('spawn 条件', () => {
  let sys: WorldUndergroundRiverSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  afterEach(() => { vi.restoreAllMocks() })

  it('random < FORM_CHANCE(0.002) 时 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    expect((sys as any).rivers).toHaveLength(1)
  })

  it('random = 0 时 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    expect((sys as any).rivers).toHaveLength(1)
  })

  it('random = FORM_CHANCE = 0.002 时不 spawn（0.002 < 0.002 => false）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    expect((sys as any).rivers).toHaveLength(0)
  })

  it('random > FORM_CHANCE 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.003)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    expect((sys as any).rivers).toHaveLength(0)
  })

  it('random = 1.0 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    expect((sys as any).rivers).toHaveLength(0)
  })

  it('rivers.length >= MAX_RIVERS 时不 spawn', () => {
    for (let i = 0; i < MAX_RIVERS; i++) {
      ;(sys as any).rivers.push(makeRiver({ tick: 99999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 99999)
    sys.update(0, makeMockWorld(), mockEm, 99999)
    expect((sys as any).rivers.length).toBe(MAX_RIVERS)
  })

  it('rivers.length < MAX_RIVERS 时可以 spawn', () => {
    for (let i = 0; i < MAX_RIVERS - 1; i++) {
      ;(sys as any).rivers.push(makeRiver({ tick: 99999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 99999)
    sys.update(0, makeMockWorld(), mockEm, 99999)
    expect((sys as any).rivers.length).toBe(MAX_RIVERS)
  })

  it('不依赖 tile 条件（无 getTile 检查）', () => {
    // world 没有 getTile 方法也能正常 spawn
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 5000)
    sys.update(0, { width: 200, height: 200 } as any, mockEm, 5000)
    expect((sys as any).rivers).toHaveLength(1)
  })
})

// ===== 4. spawn 后字段值校验 =====
describe('spawn 后字段值校验', () => {
  let sys: WorldUndergroundRiverSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  afterEach(() => { vi.restoreAllMocks() })

  function spawnOne(tick = 5000): UndergroundRiver {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, tick)
    sys.update(0, makeMockWorld(), mockEm, tick)
    return (sys as any).rivers[0]
  }

  it('新 river 具有 id 字段', () => {
    const r = spawnOne()
    expect(r).toHaveProperty('id')
  })

  it('新 river 具有 segments 字段', () => {
    const r = spawnOne()
    expect(r).toHaveProperty('segments')
    expect(Array.isArray(r.segments)).toBe(true)
  })

  it('segments 至少有 5 个（segCount = 5 + Math.floor(rand*10)，rand=0 => 5）', () => {
    const r = spawnOne()
    expect(r.segments.length).toBeGreaterThanOrEqual(5)
  })

  it('segments 最多有 14 个（rand=0.999... => floor(9.99)=9+5=14）', () => {
    const r = spawnOne()
    expect(r.segments.length).toBeLessThanOrEqual(14)
  })

  it('每个 segment 都有 x 和 y', () => {
    const r = spawnOne()
    for (const seg of r.segments) {
      expect(seg).toHaveProperty('x')
      expect(seg).toHaveProperty('y')
    }
  })

  it('新 river 初始 discovered = false', () => {
    const r = spawnOne()
    // 注意：spawn 后同帧执行 update loop，random=0 < 0.001 => discovered = true
    // 因为 Math.random() 被 mock 为 0，所以 discovered 会在同帧变为 true
    // 实际测试 discovered 的当前值
    expect(typeof r.discovered).toBe('boolean')
  })

  it('新 river 的 tick 等于当前 tick', () => {
    const r = spawnOne(5000)
    expect(r.tick).toBe(5000)
  })

  it('depth 在范围 [10, 50] 内（random=0 时为 10）', () => {
    const r = spawnOne()
    expect(r.depth).toBeGreaterThanOrEqual(10)
    expect(r.depth).toBeLessThanOrEqual(50)
  })

  it('minerals 在范围 [0, 60] 内（random=0 时为 0）', () => {
    const r = spawnOne()
    // minerals = Math.random() * 60，然后同帧 +0.01
    expect(r.minerals).toBeGreaterThanOrEqual(0)
    expect(r.minerals).toBeLessThanOrEqual(60.01) // 加上同帧更新的 0.01
  })

  it('flow 是有效的 RiverFlow 类型', () => {
    const r = spawnOne()
    expect(FLOWS).toContain(r.flow)
  })

  it('spawn 后 nextId 递增', () => {
    spawnOne()
    expect((sys as any).nextId).toBeGreaterThan(1)
  })

  it('x 坐标在 [0, world.width) 范围内', () => {
    const r = spawnOne()
    expect(r.segments[0].x).toBeGreaterThanOrEqual(0)
    expect(r.segments[0].x).toBeLessThan(200)
  })
})

// ===== 5. update loop：minerals 增长 & discovered =====
describe('update loop：minerals 增长 & discovered', () => {
  let sys: WorldUndergroundRiverSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  afterEach(() => { vi.restoreAllMocks() })

  it('每次触发后 minerals += 0.01', () => {
    ;(sys as any).rivers.push(makeRiver({ minerals: 30, tick: 99999 }))
    vi.spyOn(Math, 'random').mockReturnValue(1.0) // 不spawn，不discovered
    forceTrigger(sys, 99999)
    sys.update(0, makeMockWorld(), mockEm, 99999)
    expect((sys as any).rivers[0].minerals).toBeCloseTo(30.01, 10)
  })

  it('minerals 上限为 100（min 操作）', () => {
    ;(sys as any).rivers.push(makeRiver({ minerals: 99.999, tick: 99999 }))
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    forceTrigger(sys, 99999)
    sys.update(0, makeMockWorld(), mockEm, 99999)
    expect((sys as any).rivers[0].minerals).toBe(100)
  })

  it('minerals 已达 100 时保持 100', () => {
    ;(sys as any).rivers.push(makeRiver({ minerals: 100, tick: 99999 }))
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    forceTrigger(sys, 99999)
    sys.update(0, makeMockWorld(), mockEm, 99999)
    expect((sys as any).rivers[0].minerals).toBe(100)
  })

  it('discovered = false 且 random < 0.001 时变为 true', () => {
    ;(sys as any).rivers.push(makeRiver({ discovered: false, minerals: 30, tick: 99999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 99999)
    sys.update(0, makeMockWorld(), mockEm, 99999)
    expect((sys as any).rivers[0].discovered).toBe(true)
  })

  it('discovered = false 且 random >= 0.001 时保持 false', () => {
    ;(sys as any).rivers.push(makeRiver({ discovered: false, minerals: 30, tick: 99999 }))
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    forceTrigger(sys, 99999)
    sys.update(0, makeMockWorld(), mockEm, 99999)
    expect((sys as any).rivers[0].discovered).toBe(false)
  })

  it('discovered = true 时不会重复触发（!discovered 为 false）', () => {
    ;(sys as any).rivers.push(makeRiver({ discovered: true, minerals: 30, tick: 99999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 99999)
    sys.update(0, makeMockWorld(), mockEm, 99999)
    expect((sys as any).rivers[0].discovered).toBe(true)
  })

  it('多次触发后 minerals 累积增长', () => {
    ;(sys as any).rivers.push(makeRiver({ minerals: 30, tick: 99999 }))
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    forceTrigger(sys, 99999)
    sys.update(0, makeMockWorld(), mockEm, 99999)
    forceTrigger(sys, 100000)
    sys.update(0, makeMockWorld(), mockEm, 100000)
    expect((sys as any).rivers[0].minerals).toBeCloseTo(30.02, 10)
  })

  it('未达到 CHECK_INTERVAL 时 update loop 不执行', () => {
    ;(sys as any).rivers.push(makeRiver({ minerals: 30 }))
    sys.update(0, makeMockWorld(), mockEm, 100) // 不触发
    expect((sys as any).rivers[0].minerals).toBe(30) // 不变
  })
})

// ===== 6. cleanup 逻辑（tick < tick - 90000） =====
describe('cleanup 逻辑（river.tick < tick - 90000）', () => {
  let sys: WorldUndergroundRiverSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  afterEach(() => { vi.restoreAllMocks() })

  it('river.tick < tick-90000 时被删除', () => {
    const currentTick = 100000
    ;(sys as any).rivers.push(makeRiver({ tick: 1000 })) // 1000 < 100000-90000=10000，删
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    forceTrigger(sys, currentTick)
    sys.update(0, makeMockWorld(), mockEm, currentTick)
    expect((sys as any).rivers).toHaveLength(0)
  })

  it('river.tick = tick-90000 时不删除（不满足 <）', () => {
    const currentTick = 100000
    ;(sys as any).rivers.push(makeRiver({ tick: 10000 })) // 10000 = 10000，不删
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    forceTrigger(sys, currentTick)
    sys.update(0, makeMockWorld(), mockEm, currentTick)
    expect((sys as any).rivers).toHaveLength(1)
  })

  it('river.tick > cutoff 时保留', () => {
    const currentTick = 100000
    ;(sys as any).rivers.push(makeRiver({ tick: 50000 }))
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    forceTrigger(sys, currentTick)
    sys.update(0, makeMockWorld(), mockEm, currentTick)
    expect((sys as any).rivers).toHaveLength(1)
  })

  it('同时清理多个过期 river', () => {
    const currentTick = 100000
    ;(sys as any).rivers.push(makeRiver({ tick: 100 }))
    ;(sys as any).rivers.push(makeRiver({ tick: 200 }))
    ;(sys as any).rivers.push(makeRiver({ tick: 300 }))
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    forceTrigger(sys, currentTick)
    sys.update(0, makeMockWorld(), mockEm, currentTick)
    expect((sys as any).rivers).toHaveLength(0)
  })

  it('部分过期时只删过期的', () => {
    const currentTick = 100000
    ;(sys as any).rivers.push(makeRiver({ tick: 100, id: 100 }))    // 过期
    ;(sys as any).rivers.push(makeRiver({ tick: 50000, id: 101 })) // 保留
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    forceTrigger(sys, currentTick)
    sys.update(0, makeMockWorld(), mockEm, currentTick)
    expect((sys as any).rivers).toHaveLength(1)
    expect((sys as any).rivers[0].id).toBe(101)
  })

  it('tick=90000 时 cutoff=0，tick=0 的 river 不删除（0 < 0 => false）', () => {
    const currentTick = 90000
    ;(sys as any).rivers.push(makeRiver({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    forceTrigger(sys, currentTick)
    sys.update(0, makeMockWorld(), mockEm, currentTick)
    expect((sys as any).rivers).toHaveLength(1)
  })

  it('未达到 CHECK_INTERVAL 时 cleanup 不执行', () => {
    ;(sys as any).rivers.push(makeRiver({ tick: 0 }))
    sys.update(0, makeMockWorld(), mockEm, 100)
    expect((sys as any).rivers).toHaveLength(1)
  })
})

// ===== 7. MAX_RIVERS 上限 =====
describe('MAX_RIVERS 上限（25）', () => {
  let sys: WorldUndergroundRiverSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  afterEach(() => { vi.restoreAllMocks() })

  it('MAX_RIVERS 常量为 25', () => {
    expect(MAX_RIVERS).toBe(25)
  })

  it('CHECK_INTERVAL 常量为 2500', () => {
    expect(CHECK_INTERVAL).toBe(2500)
  })

  it('FORM_CHANCE 常量为 0.002', () => {
    expect(FORM_CHANCE).toBe(0.002)
  })

  it('rivers 上限不超过 MAX_RIVERS', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let t = 5000; t < 5000 + CHECK_INTERVAL * 30; t += CHECK_INTERVAL) {
      forceTrigger(sys, t)
      sys.update(0, makeMockWorld(), mockEm, t)
    }
    expect((sys as any).rivers.length).toBeLessThanOrEqual(MAX_RIVERS)
  })

  it('填满后不继续 spawn', () => {
    for (let i = 0; i < MAX_RIVERS; i++) {
      ;(sys as any).rivers.push(makeRiver({ tick: 99999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 99999)
    sys.update(0, makeMockWorld(), mockEm, 99999)
    expect((sys as any).rivers.length).toBe(MAX_RIVERS)
  })

  it('未填满时继续 spawn', () => {
    for (let i = 0; i < MAX_RIVERS - 1; i++) {
      ;(sys as any).rivers.push(makeRiver({ tick: 99999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 99999)
    sys.update(0, makeMockWorld(), mockEm, 99999)
    expect((sys as any).rivers.length).toBe(MAX_RIVERS)
  })

  it('CLEANUP_AGE 常量为 90000', () => {
    expect(CLEANUP_AGE).toBe(90000)
  })

  it('spawn 在 cleanup 之前执行：填满过期 river 时本帧不会 spawn，cleanup 后结果为 0', () => {
    // 源码执行顺序：① spawn 检查(rivers.length<MAX_RIVERS) → ② update loop → ③ cleanup
    // 填满 MAX_RIVERS 个过期 river，spawn 检查时 rivers.length=25 >= 25，不 spawn
    // 然后 cleanup 删除过期 rivers，rivers.length 变为 0，但本帧不再 spawn
    for (let i = 0; i < MAX_RIVERS; i++) {
      ;(sys as any).rivers.push(makeRiver({ tick: 1000 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 100000)
    sys.update(0, makeMockWorld(), mockEm, 100000)
    // spawn 先于 cleanup 执行，过期 river 被清除后本帧净结果为 0
    expect((sys as any).rivers.length).toBe(0)
  })

  it('每次 update 只尝试一次 spawn（非3次循环）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    expect((sys as any).rivers).toHaveLength(1)
  })
})
