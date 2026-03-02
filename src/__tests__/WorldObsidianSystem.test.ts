import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldObsidianSystem } from '../systems/WorldObsidianSystem'
import type { ObsidianDeposit, ObsidianQuality } from '../systems/WorldObsidianSystem'

// --- 常量（与源码保持一致）---
const CHECK_INTERVAL = 4200
const MAX_DEPOSITS = 10
const SPAWN_CHANCE = 0.002

// QUALITY_VALUE（与源码一致）
const QUALITY_VALUE: Record<ObsidianQuality, number> = {
  rough: 5, polished: 15, flawless: 30, legendary: 60,
}

// QUALITIES 数组（源码中4个元素，pickRandom使用Math.random()*length）
const QUALITIES: ObsidianQuality[] = ['rough', 'polished', 'flawless', 'legendary']

// --- 工具函数 ---
function makeSys(): WorldObsidianSystem { return new WorldObsidianSystem() }

let nextId = 1

function makeDeposit(quality: ObsidianQuality = 'polished', overrides: Partial<ObsidianDeposit> = {}): ObsidianDeposit {
  return {
    id: nextId++,
    x: 20, y: 30,
    quality,
    reserves: 500,
    harvestRate: QUALITY_VALUE[quality] * 0.1,
    age: 1000,
    tick: 0,
    ...overrides,
  }
}

function makeWorld(tile: number | null = 7) {
  return { width: 100, height: 100, getTile: vi.fn().mockReturnValue(tile) } as any
}
const em = {} as any

// ============================================================
// describe 1: 初始状态
// ============================================================
describe('WorldObsidianSystem 初始状态', () => {
  let sys: WorldObsidianSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始 deposits 为空数组', () => {
    expect((sys as any).deposits).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick < CHECK_INTERVAL 时不执行任何逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL - 1)
    expect((sys as any).deposits).toHaveLength(0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick == CHECK_INTERVAL 时执行检查', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('构造函数产生的实例相互独立', () => {
    const s1 = makeSys()
    const s2 = makeSys()
    ;(s1 as any).deposits.push(makeDeposit())
    expect((s2 as any).deposits).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).deposits.push(makeDeposit())
    expect((sys as any).deposits).toHaveLength(1)
  })
})

// ============================================================
// describe 2: CHECK_INTERVAL 节流
// ============================================================
describe('WorldObsidianSystem CHECK_INTERVAL 节流', () => {
  let sys: WorldObsidianSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0 时不执行（0-0=0 < 4200）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(7), em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=CHECK_INTERVAL 时执行并更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('第二次调用间隔不足时跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('满足间隔后 lastCheck 更新为新 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('节流期间注入的 deposit 在下次触发时 age 被更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    ;(sys as any).deposits.push(makeDeposit('polished', { tick: CHECK_INTERVAL, age: 0 }))
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    // age = tick - d.tick = CHECK_INTERVAL - CHECK_INTERVAL = 0
    expect((sys as any).deposits[0].age).toBe(0)
  })

  it('间隔为 CHECK_INTERVAL-1 时不触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    ;(sys as any).deposits.push(makeDeposit('polished', { age: 999, tick: 0 }))
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL - 1)
    // 不触发，age 不变
    expect((sys as any).deposits[0].age).toBe(999)
  })

  it('两次满足间隔的调用执行两次 update 逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    ;(sys as any).deposits.push(makeDeposit('polished', { tick: 0 }))
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    const age1 = (sys as any).deposits[0].age
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL * 2)
    const age2 = (sys as any).deposits[0].age
    expect(age2).toBeGreaterThan(age1)
  })
})

// ============================================================
// describe 3: spawn 条件
// ============================================================
describe('WorldObsidianSystem spawn 条件', () => {
  let sys: WorldObsidianSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('随机值 < SPAWN_CHANCE 且 tile=LAVA(7) 时 spawn', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(SPAWN_CHANCE - 0.0001)  // spawn check
      .mockReturnValueOnce(0.5)                     // x
      .mockReturnValueOnce(0.5)                     // y
      .mockReturnValue(0)                           // quality random, reserves random
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).deposits).toHaveLength(1)
  })

  it('随机值 < SPAWN_CHANCE 且 tile=MOUNTAIN(5) 时 spawn', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(SPAWN_CHANCE - 0.0001)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValue(0)
    sys.update(1, makeWorld(5), em, CHECK_INTERVAL)
    expect((sys as any).deposits).toHaveLength(1)
  })

  it('随机值 >= SPAWN_CHANCE 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).deposits).toHaveLength(0)
  })

  it('tile=GRASS(3) 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(SPAWN_CHANCE - 0.0001).mockReturnValue(0.5)
    sys.update(1, makeWorld(3), em, CHECK_INTERVAL)
    expect((sys as any).deposits).toHaveLength(0)
  })

  it('tile=null 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(SPAWN_CHANCE - 0.0001).mockReturnValue(0.5)
    sys.update(1, makeWorld(null), em, CHECK_INTERVAL)
    expect((sys as any).deposits).toHaveLength(0)
  })

  it('deposits 数量达到 MAX_DEPOSITS 时不 spawn', () => {
    for (let i = 0; i < MAX_DEPOSITS; i++) {
      ;(sys as any).deposits.push(makeDeposit('polished', { reserves: 500 }))
    }
    vi.spyOn(Math, 'random').mockReturnValueOnce(SPAWN_CHANCE - 0.0001).mockReturnValue(0.5)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).deposits).toHaveLength(MAX_DEPOSITS)
  })

  it('deposits 数量为 MAX_DEPOSITS-1 时可以 spawn', () => {
    for (let i = 0; i < MAX_DEPOSITS - 1; i++) {
      ;(sys as any).deposits.push(makeDeposit('polished', { reserves: 500 }))
    }
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(SPAWN_CHANCE - 0.0001)
      .mockReturnValue(0.5)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).deposits).toHaveLength(MAX_DEPOSITS)
  })

  it('spawn 后 id 递增', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(SPAWN_CHANCE - 0.0001)
      .mockReturnValue(0)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).deposits[0].id).toBe(1)
    expect((sys as any).nextId).toBe(2)
  })

  it('tile=SNOW(6) 时不 spawn（不是 5 或 7）', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(SPAWN_CHANCE - 0.0001).mockReturnValue(0.5)
    sys.update(1, makeWorld(6), em, CHECK_INTERVAL)
    expect((sys as any).deposits).toHaveLength(0)
  })
})

// ============================================================
// describe 4: spawn 字段范围
// ============================================================
describe('WorldObsidianSystem spawn 字段范围', () => {
  let sys: WorldObsidianSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('质量为 rough 时 harvestRate = 5 * 0.1 = 0.5', () => {
    // pickRandom: random() * 4 = 0 → floor(0) = 0 → QUALITIES[0] = 'rough'
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(SPAWN_CHANCE - 0.0001)
      .mockReturnValueOnce(0.5)  // x
      .mockReturnValueOnce(0.5)  // y
      .mockReturnValueOnce(0)    // quality: 0*4=0 → 'rough'
      .mockReturnValue(0)        // reserves random
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).deposits[0].quality).toBe('rough')
    expect((sys as any).deposits[0].harvestRate).toBeCloseTo(0.5, 5)
  })

  it('质量为 legendary 时 harvestRate = 60 * 0.1 = 6', () => {
    // pickRandom: random() * 4 = 3.9... → floor = 3 → QUALITIES[3] = 'legendary'
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(SPAWN_CHANCE - 0.0001)
      .mockReturnValueOnce(0.5)  // x
      .mockReturnValueOnce(0.5)  // y
      .mockReturnValueOnce(0.99) // quality: 0.99*4=3.96 → floor=3 → 'legendary'
      .mockReturnValue(0)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).deposits[0].quality).toBe('legendary')
    expect((sys as any).deposits[0].harvestRate).toBeCloseTo(6, 5)
  })

  it('reserves 最小值约 50（random=0 → 50+floor(0*150)=50）', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(SPAWN_CHANCE - 0.0001)
      .mockReturnValueOnce(0.5)  // x
      .mockReturnValueOnce(0.5)  // y
      .mockReturnValueOnce(0.5)  // quality
      .mockReturnValueOnce(0)    // reserves random → floor(0*150)=0 → 50
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).deposits[0].reserves).toBe(50)
  })

  it('reserves 最大值约 199（random接近1）', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(SPAWN_CHANCE - 0.0001)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.99)  // reserves: floor(0.99*150)=148 → 50+148=198
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).deposits[0].reserves).toBeGreaterThanOrEqual(190)
    expect((sys as any).deposits[0].reserves).toBeLessThanOrEqual(200)
  })

  it('spawn 时 age = 0', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(SPAWN_CHANCE - 0.0001)
      .mockReturnValue(0.5)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    // age = tick - d.tick, 立即 update 后: age = CHECK_INTERVAL - CHECK_INTERVAL = 0
    expect((sys as any).deposits[0].age).toBe(0)
  })

  it('spawn 时 tick 等于当前 tick', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(SPAWN_CHANCE - 0.0001)
      .mockReturnValue(0.5)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).deposits[0].tick).toBe(CHECK_INTERVAL)
  })

  it('支持4种品质类型', () => {
    const qualities: ObsidianQuality[] = ['rough', 'polished', 'flawless', 'legendary']
    expect(qualities).toHaveLength(4)
    expect(QUALITY_VALUE['rough']).toBe(5)
    expect(QUALITY_VALUE['legendary']).toBe(60)
  })
})

// ============================================================
// describe 5: update 数值逻辑
// ============================================================
describe('WorldObsidianSystem update 数值逻辑', () => {
  let sys: WorldObsidianSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('age = tick - d.tick（随 tick 更新）', () => {
    const spawnTick = 0
    ;(sys as any).deposits.push(makeDeposit('polished', { tick: spawnTick, age: 0, reserves: 500 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)  // >= SPAWN_CHANCE, mining check < 0.005 => false
    // 但 0.999 > 0.005，所以 reserves 不减少
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).deposits[0].age).toBe(CHECK_INTERVAL - spawnTick)
  })

  it('mining 概率 0.005：random < 0.005 时 reserves 减少 1', () => {
    ;(sys as any).deposits.push(makeDeposit('polished', { reserves: 500, tick: 0 }))
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(SPAWN_CHANCE)  // spawn check: >= SPAWN_CHANCE，不 spawn
      .mockReturnValueOnce(0.004)          // mining check: < 0.005，减少
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).deposits[0].reserves).toBe(499)
  })

  it('mining 概率 0.005：random >= 0.005 时 reserves 不减少', () => {
    ;(sys as any).deposits.push(makeDeposit('polished', { reserves: 500, tick: 0 }))
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(SPAWN_CHANCE)  // spawn check
      .mockReturnValueOnce(0.005)          // mining check: >= 0.005，不减少
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).deposits[0].reserves).toBe(500)
  })

  it('reserves 不低于 0（mining 导致耗尽后被 cleanup）', () => {
    ;(sys as any).deposits.push(makeDeposit('polished', { reserves: 1, tick: 0 }))
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(SPAWN_CHANCE)
      .mockReturnValueOnce(0.004)  // mining: reserves - 1 = 0 → cleanup 删除
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).deposits).toHaveLength(0)
  })

  it('reserves 精确等于 0 时被 cleanup 删除', () => {
    ;(sys as any).deposits.push(makeDeposit('polished', { reserves: 0, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).deposits).toHaveLength(0)
  })

  it('多个 deposit 同时被 update', () => {
    ;(sys as any).deposits.push(makeDeposit('rough', { reserves: 500, tick: 0 }))
    ;(sys as any).deposits.push(makeDeposit('legendary', { reserves: 300, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE)  // 不 spawn，不 mining
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).deposits[0].age).toBe(CHECK_INTERVAL)
    expect((sys as any).deposits[1].age).toBe(CHECK_INTERVAL)
  })

  it('age 在每次 update 时重新计算为 tick - d.tick', () => {
    ;(sys as any).deposits.push(makeDeposit('polished', { tick: CHECK_INTERVAL, age: 0, reserves: 500 }))
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    // age = CHECK_INTERVAL - CHECK_INTERVAL = 0
    expect((sys as any).deposits[0].age).toBe(0)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL * 2)
    // age = CHECK_INTERVAL * 2 - CHECK_INTERVAL = CHECK_INTERVAL
    expect((sys as any).deposits[0].age).toBe(CHECK_INTERVAL)
  })

  it('reserves 不会变成负数', () => {
    ;(sys as any).deposits.push(makeDeposit('polished', { reserves: 1, tick: 0 }))
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(SPAWN_CHANCE)
      .mockReturnValueOnce(0.004)  // mining: 1-1=0 → cleanup
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    // reserves = max(0, 1-1) = 0 → 被 cleanup 删除
    expect((sys as any).deposits).toHaveLength(0)
  })

  it('harvestRate 不会被 update 修改', () => {
    const hr = QUALITY_VALUE['flawless'] * 0.1
    ;(sys as any).deposits.push(makeDeposit('flawless', { harvestRate: hr, reserves: 500, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).deposits[0].harvestRate).toBe(hr)
  })
})

// ============================================================
// describe 6: cleanup 逻辑
// ============================================================
describe('WorldObsidianSystem cleanup 逻辑', () => {
  let sys: WorldObsidianSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('reserves <= 0 的 deposit 被删除', () => {
    ;(sys as any).deposits.push(makeDeposit('polished', { reserves: 0, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).deposits).toHaveLength(0)
  })

  it('reserves > 0 的 deposit 不被删除', () => {
    ;(sys as any).deposits.push(makeDeposit('polished', { reserves: 1, tick: 0 }))
    // spawn check: SPAWN_CHANCE (0.002) >= SPAWN_CHANCE，不 spawn
    // mining check: 需要 >= 0.005 才不触发 mining
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(SPAWN_CHANCE)  // spawn: not triggered
      .mockReturnValueOnce(0.005)          // mining: 0.005 >= 0.005, not triggered
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).deposits).toHaveLength(1)
  })

  it('部分 deposit 被清理，其余保留', () => {
    ;(sys as any).deposits.push(makeDeposit('rough', { reserves: 0, tick: 0 }))
    ;(sys as any).deposits.push(makeDeposit('polished', { reserves: 100, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).deposits).toHaveLength(1)
    expect((sys as any).deposits[0].reserves).toBeGreaterThan(0)
  })

  it('所有 deposit 都耗尽时全部删除', () => {
    ;(sys as any).deposits.push(makeDeposit('rough', { reserves: 0, tick: 0 }))
    ;(sys as any).deposits.push(makeDeposit('polished', { reserves: 0, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).deposits).toHaveLength(0)
  })

  it('cleanup 后不影响 nextId', () => {
    ;(sys as any).deposits.push(makeDeposit('polished', { reserves: 0, tick: 0 }))
    ;(sys as any).nextId = 5
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(5)
  })

  it('cleanup 前 spawn 检查基于当前数量（cleanup 在 spawn 之后）', () => {
    // 填满 MAX_DEPOSITS，其中一个 reserves=0 会被 cleanup
    for (let i = 0; i < MAX_DEPOSITS; i++) {
      const res = i === 0 ? 0 : 500
      ;(sys as any).deposits.push(makeDeposit('polished', { reserves: res, tick: 0 }))
    }
    // spawn 检查时 length=MAX_DEPOSITS，不满足 < MAX_DEPOSITS，不 spawn
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.0001)  // < SPAWN_CHANCE 但会被 >= MAX_DEPOSITS 阻止
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    // cleanup 删除 reserves=0 的那个，剩余 MAX_DEPOSITS-1
    expect((sys as any).deposits).toHaveLength(MAX_DEPOSITS - 1)
  })

  it('reserves 精确等于 1 时减为 0 后被删除', () => {
    ;(sys as any).deposits.push(makeDeposit('polished', { reserves: 1, tick: 0 }))
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(SPAWN_CHANCE)  // 不 spawn
      .mockReturnValueOnce(0.004)          // mining: reserves = max(0, 1-1) = 0 → deleted
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).deposits).toHaveLength(0)
  })

  it('quality 和 harvestRate 不影响 cleanup 判断', () => {
    const qualities: ObsidianQuality[] = ['rough', 'polished', 'flawless', 'legendary']
    for (const q of qualities) {
      ;(sys as any).deposits.push(makeDeposit(q, { reserves: 0, tick: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).deposits).toHaveLength(0)
  })
})
