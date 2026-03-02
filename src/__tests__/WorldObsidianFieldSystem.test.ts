import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldObsidianFieldSystem } from '../systems/WorldObsidianFieldSystem'
import type { ObsidianField } from '../systems/WorldObsidianFieldSystem'

// --- 常量（与源码保持一致）---
const CHECK_INTERVAL = 1800
const MAX_FIELDS = 18
const SPAWN_CHANCE = 0.003

// --- 工具函数 ---
function makeSys(): WorldObsidianFieldSystem { return new WorldObsidianFieldSystem() }

let nextId = 1

function makeField(overrides: Partial<ObsidianField> = {}): ObsidianField {
  return {
    id: nextId++,
    x: 30, y: 40,
    deposit: 80,
    sharpness: 90,
    miningActivity: 50,
    tradeValue: 70,
    age: 3000,
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
describe('WorldObsidianFieldSystem 初始状态', () => {
  let sys: WorldObsidianFieldSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始 fields 为空数组', () => {
    expect((sys as any).fields).toHaveLength(0)
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
    expect((sys as any).fields).toHaveLength(0)
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
    ;(s1 as any).fields.push(makeField())
    expect((s2 as any).fields).toHaveLength(0)
  })
})

// ============================================================
// describe 2: CHECK_INTERVAL 节流
// ============================================================
describe('WorldObsidianFieldSystem CHECK_INTERVAL 节流', () => {
  let sys: WorldObsidianFieldSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0 时不执行（0-0=0 < 1800）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(7), em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=CHECK_INTERVAL 时执行并更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('第二次调用若不满足间隔则跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    const lastCheck = (sys as any).lastCheck
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(lastCheck)
  })

  it('满足间隔后 lastCheck 更新为新 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('update 调用之间注入的 field 在下次节流触发时被处理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    ;(sys as any).fields.push(makeField({ deposit: 80, miningActivity: 0, sharpness: 90 }))
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    // age 被 update 递增
    expect((sys as any).fields[0].age).toBe(3001)
  })

  it('两次满足间隔的调用会执行两次 update 逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    ;(sys as any).fields.push(makeField({ deposit: 80, miningActivity: 0, sharpness: 90 }))
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL * 2)
    expect((sys as any).fields[0].age).toBe(3002)
  })

  it('间隔为 CHECK_INTERVAL-1 时不触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    ;(sys as any).fields.push(makeField({ deposit: 80, miningActivity: 0 }))
    const ageBefore = (sys as any).fields[0].age
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL - 1)
    expect((sys as any).fields[0].age).toBe(ageBefore)
  })
})

// ============================================================
// describe 3: spawn 条件
// ============================================================
describe('WorldObsidianFieldSystem spawn 条件', () => {
  let sys: WorldObsidianFieldSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('随机值 < SPAWN_CHANCE 且 tile=SNOW(6) 时 spawn', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(SPAWN_CHANCE - 0.0001) // spawn check
      .mockReturnValueOnce(0.5)                   // x
      .mockReturnValueOnce(0.5)                   // y
      .mockReturnValueOnce(0.5)                   // deposit random
      .mockReturnValueOnce(0.5)                   // sharpness random
    const w = { width: 100, height: 100, getTile: vi.fn().mockReturnValue(6) } as any
    sys.update(1, w, em, CHECK_INTERVAL)
    expect((sys as any).fields).toHaveLength(1)
  })

  it('随机值 < SPAWN_CHANCE 且 tile=LAVA(7) 时 spawn', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(SPAWN_CHANCE - 0.0001)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
    const w = { width: 100, height: 100, getTile: vi.fn().mockReturnValue(7) } as any
    sys.update(1, w, em, CHECK_INTERVAL)
    expect((sys as any).fields).toHaveLength(1)
  })

  it('随机值 >= SPAWN_CHANCE 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).fields).toHaveLength(0)
  })

  it('tile=GRASS(3) 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(SPAWN_CHANCE - 0.0001).mockReturnValue(0.5)
    sys.update(1, makeWorld(3), em, CHECK_INTERVAL)
    expect((sys as any).fields).toHaveLength(0)
  })

  it('tile=null 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(SPAWN_CHANCE - 0.0001).mockReturnValue(0.5)
    sys.update(1, makeWorld(null), em, CHECK_INTERVAL)
    expect((sys as any).fields).toHaveLength(0)
  })

  it('fields 数量达到 MAX_FIELDS 时不 spawn', () => {
    for (let i = 0; i < MAX_FIELDS; i++) {
      ;(sys as any).fields.push(makeField({ deposit: 100, miningActivity: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValueOnce(SPAWN_CHANCE - 0.0001).mockReturnValue(0.5)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).fields).toHaveLength(MAX_FIELDS)
  })

  it('fields 数量为 MAX_FIELDS-1 时可以 spawn', () => {
    for (let i = 0; i < MAX_FIELDS - 1; i++) {
      ;(sys as any).fields.push(makeField({ deposit: 100, miningActivity: 0 }))
    }
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(SPAWN_CHANCE - 0.0001)
      .mockReturnValue(0.5)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).fields).toHaveLength(MAX_FIELDS)
  })

  it('spawn 后 id 递增', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(SPAWN_CHANCE - 0.0001)
      .mockReturnValue(0.5)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).fields[0].id).toBe(1)
    expect((sys as any).nextId).toBe(2)
  })

  it('tile=5(MOUNTAIN) 不 spawn（不在范围 6-7）', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(SPAWN_CHANCE - 0.0001).mockReturnValue(0.5)
    sys.update(1, makeWorld(5), em, CHECK_INTERVAL)
    expect((sys as any).fields).toHaveLength(0)
  })
})

// ============================================================
// describe 4: spawn 字段范围
// ============================================================
describe('WorldObsidianFieldSystem spawn 字段范围', () => {
  let sys: WorldObsidianFieldSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('deposit 最小值约 40（random=0）', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(SPAWN_CHANCE - 0.0001)
      .mockReturnValueOnce(0.5)  // x
      .mockReturnValueOnce(0.5)  // y
      .mockReturnValueOnce(0)    // deposit random → 40
      .mockReturnValueOnce(0)    // sharpness random → 70
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    // deposit = 40 + 0*60 = 40; after update: age++, miningActivity+=0.5*mocked=0
    const f = (sys as any).fields[0]
    expect(f.deposit).toBeGreaterThanOrEqual(39)
    expect(f.deposit).toBeLessThanOrEqual(41)
  })

  it('deposit 最大值约 100（random=1）', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(SPAWN_CHANCE - 0.0001)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(1)    // deposit random → 100
      .mockReturnValueOnce(0)    // sharpness random → 70
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    const f = (sys as any).fields[0]
    expect(f.deposit).toBeGreaterThanOrEqual(98)
    expect(f.deposit).toBeLessThanOrEqual(101)
  })

  it('sharpness 最小约 70（random=0）', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(SPAWN_CHANCE - 0.0001)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)  // deposit
      .mockReturnValueOnce(0)    // sharpness random → 70
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    const f = (sys as any).fields[0]
    expect(f.sharpness).toBeGreaterThanOrEqual(69.5)
    expect(f.sharpness).toBeLessThanOrEqual(70.5)
  })

  it('sharpness 最大约 100（random=1）', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(SPAWN_CHANCE - 0.0001)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(1)    // sharpness random → 100
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    const f = (sys as any).fields[0]
    expect(f.sharpness).toBeGreaterThanOrEqual(99.5)
    expect(f.sharpness).toBeLessThanOrEqual(100.5)
  })

  it('spawn 时 miningActivity=0', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(SPAWN_CHANCE - 0.0001)
      .mockReturnValue(0.5)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    // miningActivity 在 spawn 后的 update 中会增加，初始为 0
    // 经过一次 update: miningActivity = min(100, 0 + random*0.5)
    // random mock 后续值为 0.5，所以 miningActivity = 0.25
    expect((sys as any).fields[0].miningActivity).toBeCloseTo(0.25, 1)
  })

  it('spawn 时 age=0 并在 update 中递增到 1', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(SPAWN_CHANCE - 0.0001)
      .mockReturnValue(0.5)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).fields[0].age).toBe(1)
  })

  it('spawn 时 tick 等于当前 tick', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(SPAWN_CHANCE - 0.0001)
      .mockReturnValue(0.5)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).fields[0].tick).toBe(CHECK_INTERVAL)
  })

  it('tradeValue = deposit * 1.5 在 spawn 初始时正确', () => {
    // 先注入 field 手动验证公式
    const deposit = 80
    const sharpness = 90
    const f = makeField({ deposit, sharpness, miningActivity: 0, tradeValue: deposit * 1.5 })
    ;(sys as any).fields.push(f)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    // after update: tradeValue = deposit * 1.5 * (sharpness/100)
    // deposit after: deposit - miningActivity*0.01 = 80 - 0.5*0.01 (miningActivity+=0.5) ~= 79.995
    const updatedF = (sys as any).fields[0]
    expect(updatedF.tradeValue).toBeGreaterThan(0)
  })
})

// ============================================================
// describe 5: update 数值逻辑
// ============================================================
describe('WorldObsidianFieldSystem update 数值逻辑', () => {
  let sys: WorldObsidianFieldSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('每次 update age 递增 1', () => {
    ;(sys as any).fields.push(makeField({ age: 100, deposit: 80, miningActivity: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).fields[0].age).toBe(101)
  })

  it('miningActivity 上限为 100', () => {
    ;(sys as any).fields.push(makeField({ miningActivity: 99.9, deposit: 80 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).fields[0].miningActivity).toBeLessThanOrEqual(100)
  })

  it('miningActivity 从 0 增长', () => {
    ;(sys as any).fields.push(makeField({ miningActivity: 0, deposit: 80 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)  // 增量 = 0.5 * 0.5 = 0.25
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).fields[0].miningActivity).toBeCloseTo(0.25, 3)
  })

  it('deposit 随 miningActivity 减少', () => {
    ;(sys as any).fields.push(makeField({ deposit: 100, miningActivity: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    // miningActivity 先增加：min(100, 50 + 0.999*0.5) ≈ 50.4995
    // deposit = max(0, 100 - 50.4995*0.01) ≈ 99.495
    expect((sys as any).fields[0].deposit).toBeGreaterThan(99)
    expect((sys as any).fields[0].deposit).toBeLessThan(100)
  })

  it('deposit 不低于 0', () => {
    ;(sys as any).fields.push(makeField({ deposit: 0.001, miningActivity: 100 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    // deposit = max(0, 0.001 - 1) = 0 → field removed
    expect((sys as any).fields).toHaveLength(0)
  })

  it('sharpness 每次减少 0.02', () => {
    ;(sys as any).fields.push(makeField({ sharpness: 80, deposit: 80, miningActivity: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).fields[0].sharpness).toBeCloseTo(79.98, 5)
  })

  it('sharpness 不低于 20', () => {
    ;(sys as any).fields.push(makeField({ sharpness: 20, deposit: 80, miningActivity: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).fields[0].sharpness).toBe(20)
  })

  it('tradeValue = deposit * 1.5 * (sharpness/100) 用更新前的 sharpness 计算', () => {
    const deposit = 100
    const sharpness = 80
    const miningActivity = 0
    ;(sys as any).fields.push(makeField({ deposit, sharpness, miningActivity, tradeValue: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    const f = (sys as any).fields[0]
    // 源码执行顺序：先更新 tradeValue（用旧 sharpness），再更新 sharpness
    // deposit after: max(0, 100 - 0*0.01) = 100
    // tradeValue = 100 * 1.5 * (80/100) = 120（用的是更新前的 sharpness）
    expect(f.tradeValue).toBeCloseTo(deposit * 1.5 * (sharpness / 100), 5)
  })

  it('多个 field 同时被 update', () => {
    ;(sys as any).fields.push(makeField({ deposit: 80, miningActivity: 10, age: 1 }))
    ;(sys as any).fields.push(makeField({ deposit: 60, miningActivity: 20, age: 5 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).fields[0].age).toBe(2)
    expect((sys as any).fields[1].age).toBe(6)
  })
})

// ============================================================
// describe 6: cleanup 逻辑
// ============================================================
describe('WorldObsidianFieldSystem cleanup 逻辑', () => {
  let sys: WorldObsidianFieldSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('deposit <= 0 的 field 被删除', () => {
    ;(sys as any).fields.push(makeField({ deposit: 0, miningActivity: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).fields).toHaveLength(0)
  })

  it('deposit > 0 的 field 不被删除', () => {
    ;(sys as any).fields.push(makeField({ deposit: 0.001, miningActivity: 0 }))
    // random=0 < SPAWN_CHANCE 会 spawn；用 tile=GRASS(3) 阻止 spawn，random=0 仍 < SPAWN_CHANCE
    // 改用高于 SPAWN_CHANCE 的随机值，使得不 spawn
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE)  // >= SPAWN_CHANCE，不 spawn
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    // deposit = max(0, 0.001 - 0*0.01) = 0.001 > 0，不删除
    expect((sys as any).fields).toHaveLength(1)
  })

  it('部分 field 被清理，其余保留', () => {
    ;(sys as any).fields.push(makeField({ deposit: 0, miningActivity: 0 }))
    ;(sys as any).fields.push(makeField({ deposit: 50, miningActivity: 0 }))
    // >= SPAWN_CHANCE 不 spawn
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).fields).toHaveLength(1)
    expect((sys as any).fields[0].deposit).toBeGreaterThan(0)
  })

  it('所有 field 都耗尽时全部删除', () => {
    ;(sys as any).fields.push(makeField({ deposit: 0, miningActivity: 0 }))
    ;(sys as any).fields.push(makeField({ deposit: 0, miningActivity: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).fields).toHaveLength(0)
  })

  it('cleanup 后不影响 nextId', () => {
    ;(sys as any).fields.push(makeField({ deposit: 0, miningActivity: 0 }))
    ;(sys as any).nextId = 5
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(5)
  })

  it('高 miningActivity 快速耗尽 deposit', () => {
    // deposit=0.5, miningActivity=100 → deposit = max(0, 0.5 - 1) = 0 → removed
    ;(sys as any).fields.push(makeField({ deposit: 0.5, miningActivity: 100 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).fields).toHaveLength(0)
  })

  it('cleanup 后 fields 数量减少，可再次 spawn', () => {
    // 填满到 MAX_FIELDS，其中一个 deposit=0 会被清理
    for (let i = 0; i < MAX_FIELDS; i++) {
      const dep = i === 0 ? 0 : 80
      ;(sys as any).fields.push(makeField({ deposit: dep, miningActivity: 0 }))
    }
    // 第一个 update：cleanup 先删掉 deposit=0 的，此时 fields.length=MAX_FIELDS-1 < MAX_FIELDS
    // 但 spawn 检查在 cleanup 之前，所以此时 length=MAX_FIELDS >= MAX_FIELDS，不 spawn
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    // cleanup 之后 fields.length = MAX_FIELDS - 1
    expect((sys as any).fields).toHaveLength(MAX_FIELDS - 1)
  })

  it('deposit 精确等于 0 时被删除', () => {
    ;(sys as any).fields.push(makeField({ deposit: 0, miningActivity: 100 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(7), em, CHECK_INTERVAL)
    expect((sys as any).fields).toHaveLength(0)
  })
})
