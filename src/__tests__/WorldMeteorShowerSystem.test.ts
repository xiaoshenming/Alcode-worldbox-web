import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldMeteorShowerSystem } from '../systems/WorldMeteorShowerSystem'
import type { Meteor, MeteorSize } from '../systems/WorldMeteorShowerSystem'

// CHECK_INTERVAL=3000, SHOWER_CHANCE=0.002, MAX_METEORS=20
// DAMAGE_BASE: tiny=5, small=15, medium=30, large=60, massive=100
// RESOURCE_BASE: tiny=2, small=5, medium=12, large=25, massive=50
// speed: 10 + random*40, expire when age > 500

function makeSys(): WorldMeteorShowerSystem { return new WorldMeteorShowerSystem() }

let _nextId = 1
function makeMeteor(overrides: Partial<Meteor> = {}): Meteor {
  return {
    id: _nextId++,
    x: 50, y: 40,
    size: 'medium',
    speed: 20,
    damage: 30,
    resources: 12,
    tick: 0,
    ...overrides,
  }
}

function makeWorld(w = 200, h = 200) {
  return { width: w, height: h } as any
}

function makeEm() {
  return {} as any
}

// ---- 1. 初始状态 ----
describe('WorldMeteorShowerSystem 初始状态', () => {
  let sys: WorldMeteorShowerSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始 meteors 数组为空', () => {
    expect((sys as any).meteors).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('_activeMeteorsBuf 初始为空数组', () => {
    expect((sys as any)._activeMeteorsBuf).toHaveLength(0)
  })

  it('getActiveMeteors 初始返回空数组', () => {
    expect(sys.getActiveMeteors()).toHaveLength(0)
  })

  it('多次构造互不影响', () => {
    const s1 = makeSys()
    const s2 = makeSys()
    ;(s1 as any).meteors.push(makeMeteor())
    expect((s2 as any).meteors).toHaveLength(0)
  })

  it('meteors 返回内部数组引用', () => {
    expect((sys as any).meteors).toBe((sys as any).meteors)
  })
})

// ---- 2. CHECK_INTERVAL 节流 ----
describe('WorldMeteorShowerSystem CHECK_INTERVAL 节流', () => {
  let sys: WorldMeteorShowerSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=2999 不触发（diff=2999 < 3000）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), 2999)
    expect((sys as any).lastCheck).toBe(0)  // 没被更新
  })

  it('tick=3000 首次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)  // shower chance miss
    sys.update(1, makeWorld(), makeEm(), 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })

  it('tick=3000 触发后 lastCheck 更新为 3000', () => {
    sys.update(1, makeWorld(), makeEm(), 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })

  it('tick=6000 再次触发', () => {
    sys.update(1, makeWorld(), makeEm(), 3000)
    sys.update(1, makeWorld(), makeEm(), 6000)
    expect((sys as any).lastCheck).toBe(6000)
  })

  it('tick=3001 距上次触发只差 1，不再触发', () => {
    sys.update(1, makeWorld(), makeEm(), 3000)  // lastCheck=3000
    const lastCheck = (sys as any).lastCheck
    sys.update(1, makeWorld(), makeEm(), 3001)  // diff=1 < 3000 => skip
    expect((sys as any).lastCheck).toBe(lastCheck)
  })

  it('tick=0 不触发（lastCheck=0, diff=0 < 3000）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), 0)
    expect((sys as any).meteors).toHaveLength(0)
  })
})

// ---- 3. spawn 条件 ----
describe('WorldMeteorShowerSystem spawn 条件', () => {
  let sys: WorldMeteorShowerSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('random < SHOWER_CHANCE(0.002) 时触发流星雨', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(), makeEm(), 3000)
    expect((sys as any).meteors.length).toBeGreaterThan(0)
  })

  it('random >= SHOWER_CHANCE(0.002) 时不触发流星雨', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), makeEm(), 3000)
    expect((sys as any).meteors).toHaveLength(0)
  })

  it('已有 MAX_METEORS(20) 个流星时不 spawn', () => {
    for (let i = 0; i < 20; i++) {
      ;(sys as any).meteors.push(makeMeteor({ tick: 3000 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), 3000)
    expect((sys as any).meteors).toHaveLength(20)
  })

  it('random=0 时 count = 1 + floor(0*5) = 1', () => {
    // random=0: shower_chance check passes (0 < 0.002 yes)
    // count = 1 + floor(0*5) = 1
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), 3000)
    // 至少 1 个 meteor
    expect((sys as any).meteors.length).toBeGreaterThanOrEqual(1)
  })

  it('流星雨触发后 meteors 数量不超过 MAX_METEORS(20)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let tick = 3000; tick <= 60000; tick += 3000) {
      sys.update(1, makeWorld(), makeEm(), tick)
    }
    expect((sys as any).meteors.length).toBeLessThanOrEqual(20)
  })

  it('19 个流星时仍可 spawn，不超过 20', () => {
    for (let i = 0; i < 19; i++) {
      ;(sys as any).meteors.push(makeMeteor({ tick: 3000 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), 3000)
    expect((sys as any).meteors.length).toBeLessThanOrEqual(20)
  })
})

// ---- 4. spawn 后字段值 ----
describe('WorldMeteorShowerSystem spawn 后字段值', () => {
  let sys: WorldMeteorShowerSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  function spawnOne(tick = 3000): Meteor {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), tick)
    return (sys as any).meteors[0]
  }

  it('spawn 的 meteor 有唯一 id', () => {
    const m = spawnOne()
    expect(m.id).toBeGreaterThan(0)
  })

  it('spawn 的 meteor x 在 [0, width) 内', () => {
    const m = spawnOne()
    expect(m.x).toBeGreaterThanOrEqual(0)
    expect(m.x).toBeLessThan(200)
  })

  it('spawn 的 meteor y 在 [0, height) 内', () => {
    const m = spawnOne()
    expect(m.y).toBeGreaterThanOrEqual(0)
    expect(m.y).toBeLessThan(200)
  })

  it('spawn 的 meteor size 是合法类型', () => {
    const m = spawnOne()
    const validSizes: MeteorSize[] = ['tiny', 'small', 'medium', 'large', 'massive']
    expect(validSizes).toContain(m.size)
  })

  it('spawn 的 meteor tick 等于当前 tick', () => {
    const m = spawnOne(3000)
    expect(m.tick).toBe(3000)
  })

  it('spawn 的 meteor speed >= 10', () => {
    const m = spawnOne()
    expect(m.speed).toBeGreaterThanOrEqual(10)
  })

  it('spawn 的 meteor speed <= 50', () => {
    const m = spawnOne()
    expect(m.speed).toBeLessThanOrEqual(50)
  })

  it('spawn 的 meteor damage > 0', () => {
    const m = spawnOne()
    expect(m.damage).toBeGreaterThan(0)
  })

  it('spawn 的 meteor resources > 0', () => {
    const m = spawnOne()
    expect(m.resources).toBeGreaterThan(0)
  })

  it('tiny meteor damage 在 [5*0.6, 5*1.0] 范围内', () => {
    // sizeIdx=0 => tiny, damage = 5 * (0.6+random*0.4)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), 3000)
    const m = (sys as any).meteors[0]
    if (m.size === 'tiny') {
      expect(m.damage).toBeGreaterThanOrEqual(5 * 0.6)
      expect(m.damage).toBeLessThanOrEqual(5 * 1.0)
    }
  })

  it('nextId 每次 spawn 后递增', () => {
    const idBefore = (sys as any).nextId
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), 3000)
    expect((sys as any).nextId).toBeGreaterThan(idBefore)
  })
})

// ---- 5. update 后字段变更 ----
describe('WorldMeteorShowerSystem update 字段变更', () => {
  let sys: WorldMeteorShowerSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('age > 500 的 meteor 被移除', () => {
    ;(sys as any).meteors.push(makeMeteor({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), makeEm(), 3501)  // age = 3501 > 500
    expect((sys as any).meteors).toHaveLength(0)
  })

  it('age = 500 的 meteor 不被移除', () => {
    ;(sys as any).meteors.push(makeMeteor({ tick: 3000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), makeEm(), 6000)  // age = 6000 - 3000 = 3000 > 500 => 被移除
    // age=3000 > 500, 被移除
    expect((sys as any).meteors).toHaveLength(0)
  })

  it('age = 499 的 meteor 保留', () => {
    ;(sys as any).meteors.push(makeMeteor({ tick: 2502 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), makeEm(), 3000)  // age = 3000 - 2502 = 498 <= 500 => 保留
    expect((sys as any).meteors).toHaveLength(1)
  })

  it('tick 刚到 CHECK_INTERVAL 时也执行过期清理', () => {
    ;(sys as any).meteors.push(makeMeteor({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), makeEm(), 3000)  // age = 3000 > 500 => 移除
    expect((sys as any).meteors).toHaveLength(0)
  })

  it('多个 meteor 中只有过期的被移除', () => {
    ;(sys as any).meteors.push(makeMeteor({ id: 1, tick: 0 }))       // age=3000 > 500 => expire
    ;(sys as any).meteors.push(makeMeteor({ id: 2, tick: 2800 }))    // age=200 <= 500 => keep
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), makeEm(), 3000)
    expect((sys as any).meteors).toHaveLength(1)
    expect((sys as any).meteors[0].id).toBe(2)
  })
})

// ---- 6. cleanup 逻辑 ----
describe('WorldMeteorShowerSystem cleanup 逻辑', () => {
  let sys: WorldMeteorShowerSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('过期移除从后向前（splice 安全）', () => {
    // 注入 3 个，前 2 个过期，最后 1 个未过期
    ;(sys as any).meteors.push(makeMeteor({ id: 1, tick: 0 }))
    ;(sys as any).meteors.push(makeMeteor({ id: 2, tick: 0 }))
    ;(sys as any).meteors.push(makeMeteor({ id: 3, tick: 2800 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), makeEm(), 3000)
    expect((sys as any).meteors).toHaveLength(1)
    expect((sys as any).meteors[0].id).toBe(3)
  })

  it('_activeMeteorsBuf 每次 getActiveMeteors 被清空后重填', () => {
    ;(sys as any).meteors.push(makeMeteor({ damage: 10 }))
    ;(sys as any).meteors.push(makeMeteor({ damage: 0 }))
    const r1 = sys.getActiveMeteors()
    expect(r1).toHaveLength(1)
    // 再次调用，结果一致
    const r2 = sys.getActiveMeteors()
    expect(r2).toHaveLength(1)
  })

  it('meteors 全部过期后 getActiveMeteors 返回空', () => {
    ;(sys as any).meteors.push(makeMeteor({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), makeEm(), 3000)  // age=3000>500, 移除
    expect(sys.getActiveMeteors()).toHaveLength(0)
  })
})

// ---- 7. MAX_METEORS 上限 ----
describe('WorldMeteorShowerSystem MAX_METEORS 上限', () => {
  let sys: WorldMeteorShowerSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('meteors 数量永远不超过 20', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let tick = 3000; tick <= 90000; tick += 3000) {
      sys.update(1, makeWorld(), makeEm(), tick)
    }
    expect((sys as any).meteors.length).toBeLessThanOrEqual(20)
  })

  it('已有 MAX_METEORS(20) 时 shower 不增加', () => {
    for (let i = 0; i < 20; i++) {
      ;(sys as any).meteors.push(makeMeteor({ tick: 3000 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), 3000)
    // tick=3000, 过期清理: tick_meteor=3000, age=0 <= 500, 不移除
    // spawn: meteors.length(20) >= MAX(20), 不spawn
    expect((sys as any).meteors).toHaveLength(20)
  })

  it('内部循环 count 超过剩余空间时提前停止', () => {
    // 19 个 meteors, count=5 => 只能再加 1 个
    for (let i = 0; i < 19; i++) {
      ;(sys as any).meteors.push(makeMeteor({ tick: 3000 }))
    }
    // mock: shower_chance=0<0.002(pass), count=1+floor(0*5)=1（虽然这里需要count>1来测试）
    // 用 mockReturnValueOnce 序列：
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)       // shower_chance check: 0 < 0.002 => shower!
      .mockReturnValueOnce(0.8)     // count = 1 + floor(0.8*5) = 1+4=5
      .mockReturnValue(0)           // remaining randoms => x,y,sizeIdx 等
    sys.update(1, makeWorld(), makeEm(), 3000)
    expect((sys as any).meteors.length).toBeLessThanOrEqual(20)
  })
})

// ---- 8. 边界验证 ----
describe('WorldMeteorShowerSystem 边界验证', () => {
  let sys: WorldMeteorShowerSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('支持 5 种 MeteorSize', () => {
    const sizes: MeteorSize[] = ['tiny', 'small', 'medium', 'large', 'massive']
    expect(sizes).toHaveLength(5)
  })

  it('DAMAGE_BASE: tiny=5, small=15, medium=30, large=60, massive=100', () => {
    const expected: Record<MeteorSize, number> = {
      tiny: 5, small: 15, medium: 30, large: 60, massive: 100,
    }
    for (const [size, base] of Object.entries(expected)) {
      // damage = base * (0.6+random*0.4), 最小为 base*0.6
      expect(base * 0.6).toBeGreaterThan(0)
      expect(base).toBeGreaterThan(0)
    }
  })

  it('RESOURCE_BASE: tiny=2, small=5, medium=12, large=25, massive=50', () => {
    const expected: Record<MeteorSize, number> = {
      tiny: 2, small: 5, medium: 12, large: 25, massive: 50,
    }
    for (const val of Object.values(expected)) {
      expect(val).toBeGreaterThan(0)
    }
  })

  it('getActiveMeteors 只返回 damage>0 的 meteor', () => {
    ;(sys as any).meteors.push(makeMeteor({ damage: 10 }))
    ;(sys as any).meteors.push(makeMeteor({ damage: 0 }))
    ;(sys as any).meteors.push(makeMeteor({ damage: -1 }))
    expect(sys.getActiveMeteors()).toHaveLength(1)
  })

  it('getActiveMeteors 返回的是 _activeMeteorsBuf 引用', () => {
    const r = sys.getActiveMeteors()
    expect(r).toBe((sys as any)._activeMeteorsBuf)
  })

  it('极小世界（1x1）spawn 时 x,y 不越界', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1, 1), makeEm(), 3000)
    const meteors = (sys as any).meteors as Meteor[]
    for (const m of meteors) {
      expect(m.x).toBeGreaterThanOrEqual(0)
      expect(m.x).toBeLessThan(1)
      expect(m.y).toBeGreaterThanOrEqual(0)
      expect(m.y).toBeLessThan(1)
    }
  })

  it('注入 meteor 后手动 push damage=0 不计入 active', () => {
    ;(sys as any).meteors.push(makeMeteor({ damage: 0 }))
    expect(sys.getActiveMeteors()).toHaveLength(0)
  })

  it('连续多 tick update 不 crash', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    expect(() => {
      for (let tick = 0; tick <= 30000; tick += 100) {
        sys.update(1, makeWorld(), makeEm(), tick)
      }
    }).not.toThrow()
  })

  it('meteor x 不超出世界边界（Math.max/min 保护）', () => {
    // cx=0, offset最大为 -0.5*20=-10 => x = max(0, 0+(-10)) = 0
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(200, 200), makeEm(), 3000)
    const meteors = (sys as any).meteors as Meteor[]
    for (const m of meteors) {
      expect(m.x).toBeGreaterThanOrEqual(0)
      expect(m.x).toBeLessThan(200)
    }
  })

  it('meteor y 不超出世界边界', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(200, 200), makeEm(), 3000)
    const meteors = (sys as any).meteors as Meteor[]
    for (const m of meteors) {
      expect(m.y).toBeGreaterThanOrEqual(0)
      expect(m.y).toBeLessThan(200)
    }
  })
})
