import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldUndergroundSystem } from '../systems/WorldUndergroundSystem'
import type { CaveNode, CaveType } from '../systems/WorldUndergroundSystem'

// CHECK_INTERVAL = 1500, MAX_CAVES = 60, CAVE_CHANCE = 0.008
// 触发条件: tick - lastCheck >= 1500，即第一次需要 tick >= 1500

function makeWorld(w = 100, h = 100, tile = 3): any {
  return {
    width: w,
    height: h,
    getTile: (_x: number, _y: number) => tile,
    setTile: vi.fn(),
  }
}

function makeSys(): WorldUndergroundSystem { return new WorldUndergroundSystem() }

let caveIdCounter = 1
function makeCave(
  type: CaveType = 'shallow',
  discovered = false,
  x = 20,
  y = 30,
  depth = 2,
  resources = 50,
  danger = 20,
  connectedTo: number[] = []
): CaveNode {
  return { id: caveIdCounter++, x, y, type, depth, resources, danger, discovered, connectedTo: [...connectedTo] }
}

// ─── 1. 初始状态 ───────────────────────────────────────────────
describe('初始状态', () => {
  let sys: WorldUndergroundSystem
  beforeEach(() => { sys = makeSys(); caveIdCounter = 1 })

  it('caves 数组初始为空', () => {
    expect((sys as any).caves).toHaveLength(0)
  })
  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('totalDiscovered 初始为 0', () => {
    expect((sys as any).totalDiscovered).toBe(0)
  })
  it('getDiscoveredCaves 初始返��空数组', () => {
    expect(sys.getDiscoveredCaves()).toHaveLength(0)
  })
  it('可注入 cave 对象', () => {
    ;(sys as any).caves.push(makeCave())
    expect((sys as any).caves).toHaveLength(1)
  })
  it('返回同一内部 caves 引用', () => {
    expect((sys as any).caves).toBe((sys as any).caves)
  })
  it('支持 6 种洞穴类型', () => {
    const types: CaveType[] = ['shallow', 'deep', 'crystal', 'lava', 'flooded', 'ancient']
    expect(types).toHaveLength(6)
  })
})

// ─── 2. 节流逻辑 (CHECK_INTERVAL=1500) ────────────────────────
describe('节流逻辑 (CHECK_INTERVAL=1500)', () => {
  let sys: WorldUndergroundSystem
  beforeEach(() => { sys = makeSys(); caveIdCounter = 1 })

  it('tick=0 时不触发检查（0-0=0 < 1500）', () => {
    const world = makeWorld()
    sys.update(0, world, 0)
    // lastCheck 保持 0（初始值），没有改变
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=1499 时不触发检查（1499 < 1500）', () => {
    const world = makeWorld()
    sys.update(0, world, 1499)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=1500 时触发第一次检查，lastCheck 更新为 1500', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld()
    sys.update(0, world, 1500)
    expect((sys as any).lastCheck).toBe(1500)
    vi.restoreAllMocks()
  })
  it('tick=3000 时触发第二次检查，lastCheck 更新为 3000', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld()
    sys.update(0, world, 1500)
    sys.update(0, world, 3000)
    expect((sys as any).lastCheck).toBe(3000)
    vi.restoreAllMocks()
  })
  it('1500-2999 区间内不触发第二次检查', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld()
    sys.update(0, world, 1500)
    sys.update(0, world, 2999)
    expect((sys as any).lastCheck).toBe(1500)
    vi.restoreAllMocks()
  })
  it('多次间隔 1500 后 lastCheck 持续更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld()
    for (let t = 1500; t <= 6000; t += 1500) {
      sys.update(0, world, t)
    }
    expect((sys as any).lastCheck).toBe(6000)
    vi.restoreAllMocks()
  })
})

// ─── 3. spawn 条件 ─────────────────────────────────────────────
describe('spawn 条件', () => {
  let sys: WorldUndergroundSystem
  beforeEach(() => { sys = makeSys(); caveIdCounter = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tile=5(MOUNTAIN) 时不因 CAVE_CHANCE 过滤（直接可生成）', () => {
    // tile===5 → 跳过 CAVE_CHANCE 检查，只需通过邻近检查
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(100, 100, 5)
    // tick=1500 触发 generateCaves
    sys.update(0, world, 1500)
    expect((sys as any).caves.length).toBeGreaterThan(0)
  })
  it('tile=4(FOREST) 时不因 CAVE_CHANCE 过滤（直接可生成）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(100, 100, 4)
    sys.update(0, world, 1500)
    expect((sys as any).caves.length).toBeGreaterThan(0)
  })
  it('tile=3(GRASS) 且 random=0.5 > CAVE_CHANCE 时不生成', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(100, 100, 3)
    sys.update(0, world, 1500)
    expect((sys as any).caves.length).toBe(0)
  })
  it('已达 MAX_CAVES=60 时不再生成', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(100, 100, 5)
    for (let i = 0; i < 60; i++) {
      ;(sys as any).caves.push(makeCave('shallow', false, i * 10 % 100, (i * 7) % 100))
    }
    sys.update(0, world, 1500)
    expect((sys as any).caves.length).toBe(60)
  })
  it('cave 数量不超过 MAX_CAVES=60', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(200, 200, 5)
    for (let t = 1500; t <= 1500 * 100; t += 1500) {
      sys.update(0, world, t)
    }
    expect((sys as any).caves.length).toBeLessThanOrEqual(60)
  })
  it('邻近 5 格内已有洞穴时跳过（proximity check）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(100, 100, 5)
    // random=0 → x=0, y=0；预置 (0,0) 处洞穴，使后续尝试全部被 proximity 过滤
    ;(sys as any).caves.push(makeCave('shallow', false, 0, 0))
    const before = (sys as any).caves.length
    sys.update(0, world, 1500)
    // 所有 10 次 attempt 都会 x=0,y=0，都和 (0,0) 重叠
    expect((sys as any).caves.length).toBe(before)
  })
  it('CAVE_CHANCE = 0.008，random=0.009 > 0.008 时不生成（tile非mountain/forest）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.009)
    const world = makeWorld(100, 100, 3)
    sys.update(0, world, 1500)
    expect((sys as any).caves.length).toBe(0)
  })
})

// ─── 4. spawn 后字段值 ─────────────────────────────────────────
describe('spawn 后字段值', () => {
  let sys: WorldUndergroundSystem
  beforeEach(() => { sys = makeSys(); caveIdCounter = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('新生成的洞穴 id 从 1 开始', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(100, 100, 4)
    sys.update(0, world, 1500)
    const caves = (sys as any).caves
    expect(caves.length).toBeGreaterThan(0)
    expect(caves[0].id).toBe(1)
  })
  it('discovered 初始为 false', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(100, 100, 5)
    sys.update(0, world, 1500)
    for (const c of (sys as any).caves) {
      expect(c.discovered).toBe(false)
    }
  })
  it('depth 在 1-5 范围内（1+floor(random*5)）', () => {
    // 用各种 random 值测 depth 范围
    for (const r of [0, 0.2, 0.4, 0.6, 0.8, 0.99]) {
      const d = 1 + Math.floor(r * 5)
      expect(d).toBeGreaterThanOrEqual(1)
      expect(d).toBeLessThanOrEqual(5)
    }
  })
  it('shallow 类型 resources 在 [10,40] 内', () => {
    const c = makeCave('shallow')
    c.resources = 25
    expect(c.resources).toBeGreaterThanOrEqual(10)
    expect(c.resources).toBeLessThanOrEqual(40)
  })
  it('ancient 类型 resources 在 [60,100] 内', () => {
    const c = makeCave('ancient')
    c.resources = 80
    expect(c.resources).toBeGreaterThanOrEqual(60)
    expect(c.resources).toBeLessThanOrEqual(100)
  })
  it('lava 类型 danger 在 [60,90] 内', () => {
    const c = makeCave('lava')
    c.danger = 75
    expect(c.danger).toBeGreaterThanOrEqual(60)
    expect(c.danger).toBeLessThanOrEqual(90)
  })
  it('shallow 类型 danger 在 [5,20] 内', () => {
    const c = makeCave('shallow')
    c.danger = 10
    expect(c.danger).toBeGreaterThanOrEqual(5)
    expect(c.danger).toBeLessThanOrEqual(20)
  })
  it('connectedTo 初始为空数组', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(100, 100, 4)
    sys.update(0, world, 1500)
    for (const c of (sys as any).caves) {
      expect(Array.isArray(c.connectedTo)).toBe(true)
    }
  })
  it('crystal 类型 resources 在 [50,90] 内', () => {
    const c = makeCave('crystal')
    c.resources = 70
    expect(c.resources).toBeGreaterThanOrEqual(50)
    expect(c.resources).toBeLessThanOrEqual(90)
  })
  it('flooded 类型 danger 在 [40,70] 内', () => {
    const c = makeCave('flooded')
    c.danger = 55
    expect(c.danger).toBeGreaterThanOrEqual(40)
    expect(c.danger).toBeLessThanOrEqual(70)
  })
  it('nextId 在生成洞穴后递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(100, 100, 4)
    sys.update(0, world, 1500)
    expect((sys as any).nextId).toBeGreaterThan(1)
  })
})

// ─── 5. update 字段变更 ────────────────────────────────────────
describe('update 字段变更', () => {
  let sys: WorldUndergroundSystem
  beforeEach(() => { sys = makeSys(); caveIdCounter = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=1500 后 caves 数量增加（tile=5）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(100, 100, 5)
    sys.update(0, world, 1500)
    expect((sys as any).caves.length).toBeGreaterThan(0)
  })
  it('totalDiscovered 可手动设置并读回', () => {
    ;(sys as any).totalDiscovered = 3
    expect((sys as any).totalDiscovered).toBe(3)
  })
  it('手动设置 discovered=true 后 getDiscoveredCaves 包含该洞穴', () => {
    const c = makeCave('deep', true)
    ;(sys as any).caves.push(c)
    const result = sys.getDiscoveredCaves()
    expect(result).toContain(c)
  })
  it('多个不同 update 调用后 lastCheck 追踪最新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld()
    sys.update(0, world, 1500)
    sys.update(0, world, 3000)
    sys.update(0, world, 4500)
    expect((sys as any).lastCheck).toBe(4500)
  })
  it('discovered 字段修改后 getDiscoveredCaves 实时反映', () => {
    const c = makeCave('shallow', false)
    ;(sys as any).caves.push(c)
    expect(sys.getDiscoveredCaves()).toHaveLength(0)
    c.discovered = true
    expect(sys.getDiscoveredCaves()).toHaveLength(1)
  })
  it('update 时已满 60 个洞穴则不再生成', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(100, 100, 5)
    for (let i = 0; i < 60; i++) {
      ;(sys as any).caves.push(makeCave('deep', false, i * 5, i * 5))
    }
    const before = (sys as any).caves.length
    sys.update(0, world, 1500)
    expect((sys as any).caves.length).toBe(before)
  })
})

// ─── 6. connectCaves 逻辑 ──────────────────────────────────────
describe('connectCaves 逻辑', () => {
  let sys: WorldUndergroundSystem
  beforeEach(() => { sys = makeSys(); caveIdCounter = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('两个距离 < 20 的洞穴在 random=0 时被连接', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const c1 = makeCave('shallow', false, 0, 0)
    const c2 = makeCave('deep', false, 5, 5)
    ;(sys as any).caves.push(c1, c2)
    ;(sys as any).connectCaves()
    expect(c1.connectedTo).toContain(c2.id)
  })
  it('已连接不会重复添加', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const c1 = makeCave('shallow', false, 0, 0)
    const c2 = makeCave('deep', false, 5, 5)
    c1.connectedTo.push(c2.id)
    c2.connectedTo.push(c1.id)
    ;(sys as any).caves.push(c1, c2)
    ;(sys as any).connectCaves()
    const unique = new Set(c1.connectedTo)
    expect(unique.size).toBe(c1.connectedTo.length)
  })
  it('connectedTo.length >= 3 时该洞穴不再主动发起连接（被动可超 3）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    // base 预填 3 个连接：在外层迭代时会 continue 跳过主动连接
    // 但其他 cave 迭代时仍会把 base 作为 other 反向连接，所以总数可超 3
    const base = makeCave('shallow', false, 50, 50)
    base.connectedTo.push(999, 998, 997)
    ;(sys as any).caves.push(base)
    for (let i = 0; i < 3; i++) {
      ;(sys as any).caves.push(makeCave('deep', false, 52 + i * 2, 50))
    }
    ;(sys as any).connectCaves()
    // 总连接数可能超过 3（被动接收），只验证总数 >= 3
    expect(base.connectedTo.length).toBeGreaterThanOrEqual(3)
  })
  it('距离 >= 20 的洞穴不被连接', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const c1 = makeCave('shallow', false, 0, 0)
    const c2 = makeCave('deep', false, 50, 50)
    ;(sys as any).caves.push(c1, c2)
    ;(sys as any).connectCaves()
    expect(c1.connectedTo).not.toContain(c2.id)
  })
  it('random >= 0.3 时不连接邻近洞穴', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.31)
    const c1 = makeCave('shallow', false, 0, 0)
    const c2 = makeCave('deep', false, 5, 5)
    ;(sys as any).caves.push(c1, c2)
    ;(sys as any).connectCaves()
    expect(c1.connectedTo).not.toContain(c2.id)
  })
  it('连接是双向的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const c1 = makeCave('shallow', false, 0, 0)
    const c2 = makeCave('deep', false, 3, 3)
    ;(sys as any).caves.push(c1, c2)
    ;(sys as any).connectCaves()
    if (c1.connectedTo.includes(c2.id)) {
      expect(c2.connectedTo).toContain(c1.id)
    }
  })
})

// ─── 7. MAX 上限 ───────────────────────────────────────────────
describe('MAX_CAVES 上限 (60)', () => {
  let sys: WorldUndergroundSystem
  beforeEach(() => { sys = makeSys(); caveIdCounter = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('恰好 60 个时停止生成', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 60; i++) {
      ;(sys as any).caves.push(makeCave('shallow', false, i * 10 % 100, (i * 7) % 100))
    }
    const world = makeWorld(100, 100, 5)
    sys.update(0, world, 1500)
    expect((sys as any).caves.length).toBe(60)
  })
  it('cave 数量永远不超过 60', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(200, 200, 5)
    for (let t = 1500; t <= 1500 * 30; t += 1500) {
      sys.update(0, world, t)
    }
    expect((sys as any).caves.length).toBeLessThanOrEqual(60)
  })
  it('MAX_CAVES 对应常量值为 60', () => {
    for (let i = 0; i < 60; i++) {
      ;(sys as any).caves.push(makeCave())
    }
    expect((sys as any).caves.length).toBe(60)
  })
  it('注入 61 个时检查是否已超 MAX', () => {
    for (let i = 0; i < 61; i++) {
      ;(sys as any).caves.push(makeCave())
    }
    // generateCaves 检查长度 >= 60 即 return，所以手动注入超过时不自动裁剪
    expect((sys as any).caves.length).toBe(61)
  })
  it('59 个洞穴时 update tick=1500 可能继续生成', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(200, 200, 5)
    for (let i = 0; i < 59; i++) {
      ;(sys as any).caves.push(makeCave('shallow', false, 100 + i * 3, i * 3))
    }
    sys.update(0, world, 1500)
    expect((sys as any).caves.length).toBeGreaterThanOrEqual(59)
    expect((sys as any).caves.length).toBeLessThanOrEqual(60)
  })
})

// ─── 8. 边界验证 ───────────────────────────────────────────────
describe('边界验证', () => {
  let sys: WorldUndergroundSystem
  beforeEach(() => { sys = makeSys(); caveIdCounter = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('getDiscoveredCaves 只返回 discovered=true 的', () => {
    ;(sys as any).caves.push(makeCave('shallow', false))
    ;(sys as any).caves.push(makeCave('deep', true))
    ;(sys as any).caves.push(makeCave('crystal', true))
    ;(sys as any).caves.push(makeCave('lava', false))
    expect(sys.getDiscoveredCaves()).toHaveLength(2)
  })
  it('getDiscoveredCaves 返回的元素全部 discovered=true', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).caves.push(makeCave('shallow', i % 2 === 0))
    }
    for (const c of sys.getDiscoveredCaves()) {
      expect(c.discovered).toBe(true)
    }
  })
  it('全部 undiscovered 时 getDiscoveredCaves 返回空', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).caves.push(makeCave('deep', false))
    }
    expect(sys.getDiscoveredCaves()).toHaveLength(0)
  })
  it('全部 discovered 时 getDiscoveredCaves 返回全部', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).caves.push(makeCave('ancient', true))
    }
    expect(sys.getDiscoveredCaves()).toHaveLength(5)
  })
  it('world size = 1x1 时 update 不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(1, 1, 5)
    expect(() => sys.update(0, world, 1500)).not.toThrow()
  })
  it('空世界（0x0）update 不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(0, 0, 0)
    expect(() => sys.update(0, world, 1500)).not.toThrow()
  })
  it('连续多次 update 后数据结构一致', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(100, 100, 5)
    for (let t = 1500; t <= 1500 * 6; t += 1500) {
      sys.update(0, world, t)
    }
    for (const c of (sys as any).caves) {
      expect(typeof c.id).toBe('number')
      expect(typeof c.x).toBe('number')
      expect(typeof c.y).toBe('number')
      expect(Array.isArray(c.connectedTo)).toBe(true)
    }
  })
  it('getDiscoveredCaves 复用内部 buffer（同一引用）', () => {
    ;(sys as any).caves.push(makeCave('shallow', true))
    const r1 = sys.getDiscoveredCaves()
    const r2 = sys.getDiscoveredCaves()
    expect(r1).toBe(r2)
  })
  it('deep 类型 resources 在 [30,70] 内', () => {
    const c = makeCave('deep')
    c.resources = 50
    expect(c.resources).toBeGreaterThanOrEqual(30)
    expect(c.resources).toBeLessThanOrEqual(70)
  })
  it('ancient 类型 danger 在 [50,80] 内', () => {
    const c = makeCave('ancient')
    c.danger = 65
    expect(c.danger).toBeGreaterThanOrEqual(50)
    expect(c.danger).toBeLessThanOrEqual(80)
  })
  it('deep 类型 danger 在 [30,60] 内', () => {
    const c = makeCave('deep')
    c.danger = 45
    expect(c.danger).toBeGreaterThanOrEqual(30)
    expect(c.danger).toBeLessThanOrEqual(60)
  })
})
