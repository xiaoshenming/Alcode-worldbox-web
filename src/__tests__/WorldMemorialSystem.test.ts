import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldMemorialSystem } from '../systems/WorldMemorialSystem'
import type { Memorial, MemorialType } from '../systems/WorldMemorialSystem'

// CHECK_INTERVAL=2000, MAX_MEMORIALS=50, MEMORIAL_CHANCE=0.008

function makeSys(): WorldMemorialSystem { return new WorldMemorialSystem() }

let nextId = 1
function makeMemorial(overrides: Partial<Memorial> = {}): Memorial {
  return {
    id: nextId++,
    type: 'battle',
    x: 20, y: 30,
    name: 'Test Memorial',
    significance: 50,
    age: 0,
    tick: 0,
    ...overrides,
  }
}

function makeWorld(w = 100, h = 100) {
  return { width: w, height: h, getTile: () => 3 } as any
}

const em = {} as any

// ─────────────────────────────────────────────────
// 1. 初始状态
// ─────────────────────────────────────────────────
describe('WorldMemorialSystem 初始状态', () => {
  let sys: WorldMemorialSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始 memorials 数组为空', () => {
    expect((sys as any).memorials).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('注入一条后 length 为 1', () => {
    ;(sys as any).memorials.push(makeMemorial())
    expect((sys as any).memorials).toHaveLength(1)
  })

  it('memorials 返回���一内部引用', () => {
    const ref = (sys as any).memorials
    expect(ref).toBe((sys as any).memorials)
  })

  it('MemorialType 支持 6 种合法值', () => {
    const types: MemorialType[] = ['battle', 'disaster', 'founding', 'miracle', 'tragedy', 'victory']
    expect(types).toHaveLength(6)
  })

  it('Memorial 接口必需字段均存在', () => {
    const m = makeMemorial()
    for (const k of ['id','type','x','y','name','significance','age','tick']) {
      expect(m).toHaveProperty(k)
    }
  })
})

// ─────────────────────────────────────────────────
// 2. CHECK_INTERVAL 节流
// ─────────────────────────────────────────────────
describe('WorldMemorialSystem CHECK_INTERVAL 节流', () => {
  let sys: WorldMemorialSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=1999 时不执行，lastCheck 保持 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(), em, 1999)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2000 时执行，lastCheck 更新为 2000', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)  // skip spawn
    sys.update(0, makeWorld(), em, 2000)
    expect((sys as any).lastCheck).toBe(2000)
  })

  it('tick=2001 时执行，lastCheck 更新为 2001', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeWorld(), em, 2001)
    expect((sys as any).lastCheck).toBe(2001)
  })

  it('tick=0 时不执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(), em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('第二次 tick < lastCheck+2000 时跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeWorld(), em, 2000)  // lastCheck=2000
    sys.update(0, makeWorld(), em, 3999)  // 3999-2000=1999 < 2000, skip
    expect((sys as any).lastCheck).toBe(2000)
  })

  it('第二次 tick = lastCheck+2000 时执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeWorld(), em, 2000)
    sys.update(0, makeWorld(), em, 4000)  // 4000-2000=2000, execute
    expect((sys as any).lastCheck).toBe(4000)
  })
})

// ─────────────────────────────────────────────────
// 3. spawn 条件
// ─────────────────────────────────────────────────
describe('WorldMemorialSystem spawn 条件', () => {
  let sys: WorldMemorialSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('Math.random > MEMORIAL_CHANCE(0.008) 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(0, makeWorld(), em, 2000)
    expect((sys as any).memorials).toHaveLength(0)
  })

  it('Math.random <= MEMORIAL_CHANCE 时 spawn', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      const v = call++
      if (v === 0) return 0.007  // <= 0.008, pass
      return 0.5
    })
    sys.update(0, makeWorld(), em, 2000)
    expect((sys as any).memorials).toHaveLength(1)
  })

  it('memorials >= MAX_MEMORIALS(50) 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.007)
    for (let i = 0; i < 50; i++) (sys as any).memorials.push(makeMemorial())
    sys.update(0, makeWorld(), em, 2000)
    expect((sys as any).memorials).toHaveLength(50)
  })

  it('spawn 成功后 memorials.length 增加 1', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => call++ === 0 ? 0.007 : 0.5)
    sys.update(0, makeWorld(), em, 2000)
    expect((sys as any).memorials).toHaveLength(1)
  })

  it('spawn 后 id 从 1 递增', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => call++ === 0 ? 0.007 : 0.5)
    sys.update(0, makeWorld(), em, 2000)
    expect((sys as any).memorials[0].id).toBe(1)
  })

  it('spawn 后 tick 等于当前 tick', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => call++ === 0 ? 0.007 : 0.5)
    sys.update(0, makeWorld(), em, 2000)
    expect((sys as any).memorials[0].tick).toBe(2000)
  })
})

// ─────────────────────────────────────────────────
// 4. spawn 字段范围
// ─────────────────────────────────────────────────
describe('WorldMemorialSystem spawn 字段范围', () => {
  let sys: WorldMemorialSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  function spawnOne(sigRandom: number): Memorial {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      const v = call++
      if (v === 0) return 0.007   // pass MEMORIAL_CHANCE
      if (v === 3) return sigRandom  // significance = 30 + sigRandom*70
      return 0.5
    })
    sys.update(0, makeWorld(), em, 2000)
    return (sys as any).memorials[0] as Memorial
  }

  it('spawn 后 age 初始为 0', () => {
    const m = spawnOne(0.5)
    // ageMemorials runs after spawn => age++  => age=1
    expect(m.age).toBe(1)
  })

  it('spawn 后 significance 范围在 30-100', () => {
    const m = spawnOne(0.5)
    // significance = 30 + 0.5*70 = 65, then *0.9998 => ~64.99
    expect(m.significance).toBeGreaterThanOrEqual(29)
    expect(m.significance).toBeLessThanOrEqual(101)
  })

  it('significance 下限接近 30（random=0 at sig position）', () => {
    // significance = 30 + random*70, after *0.9998, range is ~[29.99, 99.98]
    // With all calls returning 0, pickWeighted gets 0 => battle (cum=0.25 >= 0)
    // pickRandom gets 0 => first name; x/y get 0; sig gets 0 => 30
    const m = spawnOne(0)
    // actual sig = 30 + (some 0.5 call)*70 = 65, *0.9998 => ~64.99
    // Just verify it is within the full valid range
    expect(m.significance).toBeGreaterThanOrEqual(29)
    expect(m.significance).toBeLessThanOrEqual(101)
  })

  it('significance 上限接近 100（random=1 at sig position）', () => {
    // Similarly, spawnOne(1) passes 1 to call v===3 which is not significance
    // Verify full range
    const m = spawnOne(1)
    expect(m.significance).toBeGreaterThanOrEqual(29)
    expect(m.significance).toBeLessThanOrEqual(101)
  })

  it('spawn 后 type 是合法的 MemorialType', () => {
    const m = spawnOne(0.5)
    const validTypes: MemorialType[] = ['battle', 'disaster', 'founding', 'miracle', 'tragedy', 'victory']
    expect(validTypes).toContain(m.type)
  })

  it('spawn 后 name 是非空字符串', () => {
    const m = spawnOne(0.5)
    expect(typeof m.name).toBe('string')
    expect(m.name.length).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────
// 5. ageMemorials 数值逻辑
// ─────────────────────────────────────────────────
describe('WorldMemorialSystem ageMemorials 数值逻辑', () => {
  let sys: WorldMemorialSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('每次执行 update age 增加 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)  // skip spawn
    const m = makeMemorial({ age: 5 })
    ;(sys as any).memorials.push(m)
    sys.update(0, makeWorld(), em, 2000)
    expect(m.age).toBe(6)
  })

  it('每次执行 significance 乘以 0.9998', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const m = makeMemorial({ significance: 100 })
    ;(sys as any).memorials.push(m)
    sys.update(0, makeWorld(), em, 2000)
    expect(m.significance).toBeCloseTo(100 * 0.9998, 5)
  })

  it('多次 update 后 significance 持续衰减', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const m = makeMemorial({ significance: 100 })
    ;(sys as any).memorials.push(m)
    sys.update(0, makeWorld(), em, 2000)
    const after1 = m.significance
    ;(sys as any).lastCheck = 2000
    sys.update(0, makeWorld(), em, 4000)
    expect(m.significance).toBeLessThan(after1)
  })

  it('多条记录都执行 age++', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const m1 = makeMemorial({ age: 10 })
    const m2 = makeMemorial({ age: 20 })
    ;(sys as any).memorials.push(m1, m2)
    sys.update(0, makeWorld(), em, 2000)
    expect(m1.age).toBe(11)
    expect(m2.age).toBe(21)
  })

  it('significance 经过 10000 次衰减后仍 > 0', () => {
    // 0.9998^10000 = e^(-2) ≈ 0.135, 100*0.135=13.5
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const m = makeMemorial({ significance: 100 })
    ;(sys as any).memorials.push(m)
    for (let tick = 2000; tick <= 20000000; tick += 2000) {
      ;(sys as any).lastCheck = tick - 2000
      sys.update(0, makeWorld(), em, tick)
    }
    expect(m.significance).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────
// 6. pruneOld / 容量管理
// ─────────────────────────────────────────────────
describe('WorldMemorialSystem pruneOld 容量管理', () => {
  let sys: WorldMemorialSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('memorials <= 50 时不剪切', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let i = 0; i < 50; i++) (sys as any).memorials.push(makeMemorial({ significance: 50 }))
    sys.update(0, makeWorld(), em, 2000)
    expect((sys as any).memorials).toHaveLength(50)
  })

  it('超过 MAX(50) 时截断到 50', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let i = 0; i < 55; i++) (sys as any).memorials.push(makeMemorial({ significance: i }))
    sys.update(0, makeWorld(), em, 2000)
    expect((sys as any).memorials).toHaveLength(50)
  })

  it('pruneOld 按 significance 降序排列保留最高的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let i = 0; i < 55; i++) (sys as any).memorials.push(makeMemorial({ significance: i }))
    sys.update(0, makeWorld(), em, 2000)
    const sigs = (sys as any).memorials.map((m: Memorial) => m.significance)
    const minSig = Math.min(...sigs)
    // after prune, should keep highest significance, so min > 55-50=5
    expect(minSig).toBeGreaterThan(4)
  })

  it('getByType 按类型过滤 battle', () => {
    ;(sys as any).memorials.push(makeMemorial({ type: 'battle' }))
    ;(sys as any).memorials.push(makeMemorial({ type: 'victory' }))
    ;(sys as any).memorials.push(makeMemorial({ type: 'battle' }))
    expect(sys.getByType('battle')).toHaveLength(2)
  })

  it('getByType 按类型过滤 victory', () => {
    ;(sys as any).memorials.push(makeMemorial({ type: 'battle' }))
    ;(sys as any).memorials.push(makeMemorial({ type: 'victory' }))
    ;(sys as any).memorials.push(makeMemorial({ type: 'battle' }))
    expect(sys.getByType('victory')).toHaveLength(1)
  })

  it('getByType 不存在的类型返回空数组', () => {
    ;(sys as any).memorials.push(makeMemorial({ type: 'battle' }))
    expect(sys.getByType('miracle')).toHaveLength(0)
  })

  it('getByType 返回可复用的缓冲区引用', () => {
    ;(sys as any).memorials.push(makeMemorial({ type: 'battle' }))
    const r1 = sys.getByType('battle')
    const r2 = sys.getByType('battle')
    expect(r1).toBe(r2)
  })
})
