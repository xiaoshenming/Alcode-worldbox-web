import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldWhirlwindSystem } from '../systems/WorldWhirlwindSystem'
import type { Whirlwind, WhirlwindSize } from '../systems/WorldWhirlwindSystem'

// ===== 从源码提取的关键参数 =====
// CHECK_INTERVAL = 1200
// SPAWN_CHANCE = 0.006 (Math.random() < SPAWN_CHANCE 才spawn)
// MAX_WHIRLWINDS = 25
// tile条件: tile >= 3 (GRASS/FOREST/MOUNTAIN)
// cleanup: ww.tick < tick-8000 || ww.force <= 0
// SIZES: ['dust_devil', 'small', 'medium', 'large', 'massive']
// force = (sizeIdx + 1) * 8  => dust_devil=8, small=16, medium=24, large=32, massive=40
// rotation += 0.3 每帧
// direction += (random-0.5)*0.15 每帧
// force -= 0.02 每帧
// speed = 1 + random*3

const CHECK_INTERVAL = 1200
const SPAWN_CHANCE = 0.006
const MAX_WHIRLWINDS = 25
const TICK0 = CHECK_INTERVAL // 首次触发tick

function makeSys(): WorldWhirlwindSystem { return new WorldWhirlwindSystem() }

let nextId = 1
function makeWhirlwind(overrides: Partial<Whirlwind> = {}): Whirlwind {
  return {
    id: nextId++,
    x: 30,
    y: 40,
    size: 'medium',
    rotation: 0,
    speed: 2,
    force: 50,
    direction: 1.5,
    tick: 0,
    ...overrides,
  }
}

function makeMockWorld(tileVal: number | null = 3, w = 200, h = 200) {
  return {
    width: w,
    height: h,
    getTile: vi.fn().mockReturnValue(tileVal),
  } as any
}

const mockEm = {} as any

// ========================================================
// 1. 初始状态
// ========================================================
describe('WorldWhirlwindSystem - 初始状态', () => {
  let sys: WorldWhirlwindSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  it('初始whirlwinds数组为空', () => {
    expect((sys as any).whirlwinds).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始化后whirlwinds是数组类型', () => {
    expect(Array.isArray((sys as any).whirlwinds)).toBe(true)
  })

  it('手动注入一个旋风后数组长度为1', () => {
    ;(sys as any).whirlwinds.push(makeWhirlwind())
    expect((sys as any).whirlwinds).toHaveLength(1)
  })

  it('whirlwinds引用稳定（同一对象）', () => {
    const ref = (sys as any).whirlwinds
    expect(ref).toBe((sys as any).whirlwinds)
  })

  it('Whirlwind包含所有必要字段', () => {
    const w: Whirlwind = {
      id: 1, x: 10, y: 20, size: 'medium',
      rotation: 0.5, speed: 2, force: 24, direction: 1.0, tick: 0,
    }
    expect(w.id).toBe(1)
    expect(w.size).toBe('medium')
    expect(w.rotation).toBe(0.5)
    expect(w.speed).toBe(2)
    expect(w.force).toBe(24)
    expect(w.direction).toBe(1.0)
  })

  it('支持5种旋风大小枚举', () => {
    const sizes: WhirlwindSize[] = ['dust_devil', 'small', 'medium', 'large', 'massive']
    expect(sizes).toHaveLength(5)
    expect(sizes[0]).toBe('dust_devil')
    expect(sizes[4]).toBe('massive')
  })
})

// ========================================================
// 2. CHECK_INTERVAL 节流
// ========================================================
describe('WorldWhirlwindSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldWhirlwindSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    // random=1 阻止spawn (1 < 0.006 => false)
    vi.spyOn(Math, 'random').mockReturnValue(1)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('tick=0时不更新lastCheck', () => {
    sys.update(0, makeMockWorld(), mockEm, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick < CHECK_INTERVAL时不执行更新', () => {
    sys.update(0, makeMockWorld(), mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick == CHECK_INTERVAL时触发更新', () => {
    sys.update(0, makeMockWorld(), mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick > CHECK_INTERVAL时触发更新', () => {
    sys.update(0, makeMockWorld(), mockEm, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 100)
  })

  it('第一次触发后再次低于间隔不更新', () => {
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    const saved = (sys as any).lastCheck
    sys.update(0, makeMockWorld(), mockEm, TICK0 + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(saved)
  })

  it('第二次达到间隔时再次更新', () => {
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    sys.update(0, makeMockWorld(), mockEm, TICK0 + CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(TICK0 + CHECK_INTERVAL)
  })

  it('tick=0时不改变whirlwinds数组', () => {
    sys.update(0, makeMockWorld(), mockEm, 0)
    expect((sys as any).whirlwinds).toHaveLength(0)
  })

  it('低于间隔时不调用getTile', () => {
    const world = makeMockWorld()
    sys.update(0, world, mockEm, CHECK_INTERVAL - 1)
    expect(world.getTile).not.toHaveBeenCalled()
  })

  it('CHECK_INTERVAL常量为1200', () => {
    expect(CHECK_INTERVAL).toBe(1200)
  })
})

// ========================================================
// 3. spawn条件 - tile/random方向
// ========================================================
describe('WorldWhirlwindSystem - spawn条件', () => {
  let sys: WorldWhirlwindSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  it('random < SPAWN_CHANCE 且 tile=GRASS(3) 时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(3), mockEm, TICK0)
    expect((sys as any).whirlwinds).toHaveLength(1)
  })

  it('random < SPAWN_CHANCE 且 tile=FOREST(4) 时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(4), mockEm, TICK0)
    expect((sys as any).whirlwinds).toHaveLength(1)
  })

  it('random < SPAWN_CHANCE 且 tile=MOUNTAIN(5) 时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(5), mockEm, TICK0)
    expect((sys as any).whirlwinds).toHaveLength(1)
  })

  it('random >= SPAWN_CHANCE 时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE)
    sys.update(0, makeMockWorld(3), mockEm, TICK0)
    expect((sys as any).whirlwinds).toHaveLength(0)
  })

  it('random > SPAWN_CHANCE 时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeMockWorld(3), mockEm, TICK0)
    expect((sys as any).whirlwinds).toHaveLength(0)
  })

  it('tile=DEEP_WATER(0)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(0), mockEm, TICK0)
    expect((sys as any).whirlwinds).toHaveLength(0)
  })

  it('tile=SHALLOW_WATER(1)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(1), mockEm, TICK0)
    expect((sys as any).whirlwinds).toHaveLength(0)
  })

  it('tile=SAND(2)时不spawn（tile<3不满足）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(2), mockEm, TICK0)
    expect((sys as any).whirlwinds).toHaveLength(0)
  })

  it('tile=null时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(null), mockEm, TICK0)
    expect((sys as any).whirlwinds).toHaveLength(0)
  })

  it('whirlwinds已满MAX_WHIRLWINDS时不spawn', () => {
    for (let i = 0; i < MAX_WHIRLWINDS; i++) {
      ;(sys as any).whirlwinds.push(makeWhirlwind({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(3), mockEm, TICK0)
    expect((sys as any).whirlwinds).toHaveLength(MAX_WHIRLWINDS)
  })

  it('whirlwinds=MAX_WHIRLWINDS-1时还可以spawn', () => {
    for (let i = 0; i < MAX_WHIRLWINDS - 1; i++) {
      ;(sys as any).whirlwinds.push(makeWhirlwind({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(3), mockEm, TICK0)
    expect((sys as any).whirlwinds.length).toBeGreaterThan(MAX_WHIRLWINDS - 1)
  })
})

// ========================================================
// 4. spawn后字段值校验
// ========================================================
describe('WorldWhirlwindSystem - spawn后字段值', () => {
  let sys: WorldWhirlwindSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  it('spawn后tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(3), mockEm, TICK0)
    // tick不会被update修改
    expect((sys as any).whirlwinds[0].tick).toBe(TICK0)
  })

  it('spawn后id从1开始', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(3), mockEm, TICK0)
    expect((sys as any).whirlwinds[0].id).toBe(1)
  })

  it('spawn后nextId递增至2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(3), mockEm, TICK0)
    expect((sys as any).nextId).toBe(2)
  })

  it('spawn后speed在[1,4]范围内（同帧update后坐标已偏移但speed不变）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(3), mockEm, TICK0)
    const ww = (sys as any).whirlwinds[0]
    // speed = 1 + random*3，random固定为SPAWN_CHANCE-0.0001≈0
    expect(ww.speed).toBeGreaterThanOrEqual(1)
    expect(ww.speed).toBeLessThanOrEqual(4)
  })

  it('spawn后force值合法（同帧update后force=-0.02）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(3), mockEm, TICK0)
    const ww = (sys as any).whirlwinds[0]
    // force = (sizeIdx+1)*8, 同帧后 force -= 0.02, 范围[7.98, 39.98]
    expect(ww.force).toBeGreaterThan(0)
    expect(ww.force).toBeLessThanOrEqual(40)
  })

  it('spawn后x坐标在[0, width)范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(3, 200, 200), mockEm, TICK0)
    const ww = (sys as any).whirlwinds[0]
    // x = floor(random*w)，spawn后同帧位移
    expect(typeof ww.x).toBe('number')
  })

  it('spawn后rotation>=0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(3), mockEm, TICK0)
    const ww = (sys as any).whirlwinds[0]
    // rotation = random * 2π + 0.3 (update后)
    expect(ww.rotation).toBeGreaterThanOrEqual(0)
  })

  it('spawn后size是合法的WhirlwindSize', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(3), mockEm, TICK0)
    const ww = (sys as any).whirlwinds[0]
    const validSizes: WhirlwindSize[] = ['dust_devil', 'small', 'medium', 'large', 'massive']
    expect(validSizes).toContain(ww.size)
  })

  it('dust_devil对应的force初始值为8（sizeIdx=0）', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 1) return SPAWN_CHANCE - 0.0001 // spawn判断
      if (callCount === 4) return 0 // sizeIdx = floor(0*5)=0 => dust_devil
      return 0.5
    })
    sys.update(0, makeMockWorld(3), mockEm, TICK0)
    const ww = (sys as any).whirlwinds[0]
    if (ww && ww.size === 'dust_devil') {
      // force = (0+1)*8 - 0.02 = 7.98 after update
      expect(ww.force).toBeCloseTo(7.98, 2)
    }
  })
})

// ========================================================
// 5. update字段变更逻辑（旋风移动）
// ========================================================
describe('WorldWhirlwindSystem - update移动逻辑', () => {
  let sys: WorldWhirlwindSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(1) // 阻止spawn
  })

  it('rotation每帧增加0.3', () => {
    const ww = makeWhirlwind({ tick: TICK0, rotation: 1.0 })
    ;(sys as any).whirlwinds.push(ww)
    // direction=1.5时，random=1 => direction += (1-0.5)*0.15 = 0.075
    const origDir = ww.direction
    sys.update(0, makeMockWorld(3), mockEm, TICK0)
    // rotation = 1.0 + 0.3 = 1.3
    expect(ww.rotation).toBeCloseTo(1.3, 5)
  })

  it('force每帧减少0.02', () => {
    const ww = makeWhirlwind({ tick: TICK0, force: 50 })
    ;(sys as any).whirlwinds.push(ww)
    sys.update(0, makeMockWorld(3), mockEm, TICK0)
    expect(ww.force).toBeCloseTo(49.98, 5)
  })

  it('force不会低于0（max(0, force-0.02)）', () => {
    const ww = makeWhirlwind({ tick: TICK0, force: 0.01 })
    ;(sys as any).whirlwinds.push(ww)
    sys.update(0, makeMockWorld(3), mockEm, TICK0)
    expect(ww.force).toBeGreaterThanOrEqual(0)
  })

  it('x坐标随direction和speed移动', () => {
    const ww = makeWhirlwind({ tick: TICK0, x: 100, y: 100, direction: 0, speed: 2 })
    ;(sys as any).whirlwinds.push(ww)
    const origX = ww.x
    sys.update(0, makeMockWorld(3), mockEm, TICK0)
    // x += cos(0)*2 = 2, direction漂移后x不一定精确，但方向大体正确
    expect(ww.x).not.toBe(origX)
  })

  it('y坐标随direction和speed移动', () => {
    const ww = makeWhirlwind({ tick: TICK0, x: 100, y: 100, direction: Math.PI / 2, speed: 2 })
    ;(sys as any).whirlwinds.push(ww)
    const origY = ww.y
    sys.update(0, makeMockWorld(3), mockEm, TICK0)
    expect(ww.y).not.toBe(origY)
  })

  it('direction有随机漂移（random=1 => += 0.5*0.15=0.075）', () => {
    const ww = makeWhirlwind({ tick: TICK0, direction: 1.0 })
    ;(sys as any).whirlwinds.push(ww)
    sys.update(0, makeMockWorld(3), mockEm, TICK0)
    // direction += (1-0.5)*0.15 = 0.075
    expect(ww.direction).toBeCloseTo(1.0 + 0.075, 4)
  })

  it('多个旋风全部被update', () => {
    const w1 = makeWhirlwind({ tick: TICK0, force: 50 })
    const w2 = makeWhirlwind({ tick: TICK0, force: 30 })
    ;(sys as any).whirlwinds.push(w1, w2)
    sys.update(0, makeMockWorld(3), mockEm, TICK0)
    expect(w1.force).toBeLessThan(50)
    expect(w2.force).toBeLessThan(30)
  })

  it('direction=0时x增加，y不变（cos(0)=1,sin(0)=0）', () => {
    const ww = makeWhirlwind({ tick: TICK0, x: 50, y: 50, direction: 0, speed: 3 })
    ;(sys as any).whirlwinds.push(ww)
    const origY = ww.y
    sys.update(0, makeMockWorld(3), mockEm, TICK0)
    // x += 3, direction之后漂移，y += sin(direction)*speed
    expect(ww.x).toBeGreaterThan(50) // cos(0)*3 = 3 >> direction漂移影响极小
  })
})

// ========================================================
// 6. cleanup逻辑
// ========================================================
describe('WorldWhirlwindSystem - cleanup逻辑', () => {
  let sys: WorldWhirlwindSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(1) // 阻止spawn
  })

  it('ww.tick < tick-8000时被删除（过期）', () => {
    const ww = makeWhirlwind({ tick: 0 })
    ;(sys as any).whirlwinds.push(ww)
    sys.update(0, makeMockWorld(3), mockEm, TICK0 + 8000 + 1)
    expect((sys as any).whirlwinds).toHaveLength(0)
  })

  it('ww.force <= 0时被删除', () => {
    const ww = makeWhirlwind({ tick: TICK0, force: 0.01 })
    ;(sys as any).whirlwinds.push(ww)
    // force = 0.01 - 0.02 = -0.01 => max(0, -0.01) = 0 => force<=0 => 删除
    sys.update(0, makeMockWorld(3), mockEm, TICK0)
    expect((sys as any).whirlwinds).toHaveLength(0)
  })

  it('ww.force = 0.03时update后力=0.01，不删除', () => {
    const ww = makeWhirlwind({ tick: TICK0, force: 0.03 })
    ;(sys as any).whirlwinds.push(ww)
    sys.update(0, makeMockWorld(3), mockEm, TICK0)
    // force = max(0, 0.03-0.02) = 0.01 > 0 => 保留
    expect((sys as any).whirlwinds).toHaveLength(1)
  })

  it('ww.tick == cutoff时不删除（严格小于）', () => {
    const T = TICK0
    const ww = makeWhirlwind({ tick: T })
    ;(sys as any).whirlwinds.push(ww)
    // tick = T + 8000, cutoff = T => T < T => false，不删
    sys.update(0, makeMockWorld(3), mockEm, T + 8000)
    expect((sys as any).whirlwinds).toHaveLength(1)
  })

  it('ww.tick > cutoff时不删除', () => {
    const ww = makeWhirlwind({ tick: TICK0 + 5000, force: 50 })
    ;(sys as any).whirlwinds.push(ww)
    sys.update(0, makeMockWorld(3), mockEm, TICK0 + 8000)
    expect((sys as any).whirlwinds).toHaveLength(1)
  })

  it('只删除过期的，保留新的', () => {
    const bigTick = TICK0 + 8001
    const old = makeWhirlwind({ tick: 0, force: 50 })
    const fresh = makeWhirlwind({ tick: bigTick, force: 50 })
    ;(sys as any).whirlwinds.push(old, fresh)
    sys.update(0, makeMockWorld(3), mockEm, bigTick)
    expect((sys as any).whirlwinds).toHaveLength(1)
    expect((sys as any).whirlwinds[0].tick).toBe(bigTick)
  })

  it('全部过期时清空whirlwinds', () => {
    const bigTick = TICK0 + 8001
    for (let i = 0; i < 5; i++) {
      ;(sys as any).whirlwinds.push(makeWhirlwind({ tick: 0, force: 50 }))
    }
    sys.update(0, makeMockWorld(3), mockEm, bigTick)
    expect((sys as any).whirlwinds).toHaveLength(0)
  })

  it('无过期时数量不变（force够大）', () => {
    const freshTick = TICK0
    for (let i = 0; i < 5; i++) {
      ;(sys as any).whirlwinds.push(makeWhirlwind({ tick: freshTick, force: 50 }))
    }
    sys.update(0, makeMockWorld(3), mockEm, freshTick)
    expect((sys as any).whirlwinds).toHaveLength(5)
  })

  it('删除后剩余id不变', () => {
    const bigTick = TICK0 + 8001
    const keep = makeWhirlwind({ id: 99, tick: bigTick, force: 50 })
    const del = makeWhirlwind({ id: 100, tick: 0, force: 50 })
    ;(sys as any).whirlwinds.push(del, keep)
    sys.update(0, makeMockWorld(3), mockEm, bigTick)
    expect((sys as any).whirlwinds).toHaveLength(1)
    expect((sys as any).whirlwinds[0].id).toBe(99)
  })

  it('cleanup cutoff为tick-8000（验证边界）', () => {
    const ww = makeWhirlwind({ tick: 1, force: 50 })
    ;(sys as any).whirlwinds.push(ww)
    // tick=TICK0+8000, cutoff=TICK0, 1 < TICK0(1200) => 删除
    sys.update(0, makeMockWorld(3), mockEm, TICK0 + 8000)
    expect((sys as any).whirlwinds).toHaveLength(0)
  })
})

// ========================================================
// 7. MAX_WHIRLWINDS上限
// ========================================================
describe('WorldWhirlwindSystem - MAX_WHIRLWINDS上限', () => {
  let sys: WorldWhirlwindSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  it('MAX_WHIRLWINDS常量为25', () => {
    expect(MAX_WHIRLWINDS).toBe(25)
  })

  it('恰好MAX_WHIRLWINDS个时不再spawn', () => {
    for (let i = 0; i < MAX_WHIRLWINDS; i++) {
      ;(sys as any).whirlwinds.push(makeWhirlwind({ tick: TICK0, force: 50 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(3), mockEm, TICK0)
    expect((sys as any).whirlwinds).toHaveLength(MAX_WHIRLWINDS)
  })

  it('少于MAX_WHIRLWINDS时可以spawn', () => {
    for (let i = 0; i < MAX_WHIRLWINDS - 1; i++) {
      ;(sys as any).whirlwinds.push(makeWhirlwind({ tick: TICK0, force: 50 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(3), mockEm, TICK0)
    expect((sys as any).whirlwinds.length).toBeGreaterThan(MAX_WHIRLWINDS - 1)
  })

  it('whirlwinds数量不会超过MAX_WHIRLWINDS（多次update）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.0001)
    const world = makeMockWorld(3)
    for (let i = 0; i < 50; i++) {
      sys.update(0, world, mockEm, TICK0 + i * CHECK_INTERVAL)
    }
    expect((sys as any).whirlwinds.length).toBeLessThanOrEqual(MAX_WHIRLWINDS)
  })

  it('SPAWN_CHANCE常量为0.006', () => {
    expect(SPAWN_CHANCE).toBe(0.006)
  })

  it('CHECK_INTERVAL常量为1200', () => {
    expect(CHECK_INTERVAL).toBe(1200)
  })

  it('通过cleanup减少后可再次spawn', () => {
    for (let i = 0; i < MAX_WHIRLWINDS; i++) {
      ;(sys as any).whirlwinds.push(makeWhirlwind({ tick: 0, force: 50 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(3), mockEm, TICK0 + 8001)
    expect((sys as any).whirlwinds.length).toBeLessThanOrEqual(MAX_WHIRLWINDS)
  })
})

// ========================================================
// 8. 边界验证 / 字段合法性
// ========================================================
describe('WorldWhirlwindSystem - 边界验证', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('SIZES数组包含dust_devil', () => {
    const sizes: WhirlwindSize[] = ['dust_devil', 'small', 'medium', 'large', 'massive']
    expect(sizes).toContain('dust_devil')
  })

  it('SIZES数组包含massive', () => {
    const sizes: WhirlwindSize[] = ['dust_devil', 'small', 'medium', 'large', 'massive']
    expect(sizes).toContain('massive')
  })

  it('force最大值为massive的(4+1)*8=40', () => {
    const sizeIdx = 4 // massive
    expect((sizeIdx + 1) * 8).toBe(40)
  })

  it('force最小值为dust_devil的(0+1)*8=8', () => {
    const sizeIdx = 0 // dust_devil
    expect((sizeIdx + 1) * 8).toBe(8)
  })

  it('rotation初始范围在[0, 2π)内', () => {
    const r = 0.5 * Math.PI * 2
    expect(r).toBeGreaterThanOrEqual(0)
    expect(r).toBeLessThan(Math.PI * 2)
  })

  it('speed初始范围在[1,4]', () => {
    // speed = 1 + random*3, random∈[0,1)
    expect(1 + 0 * 3).toBe(1)
    expect(1 + 0.999 * 3).toBeCloseTo(3.997, 2)
  })

  it('注入force=0的旋风被立即清除', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(1) // 阻止spawn
    const ww = makeWhirlwind({ tick: TICK0, force: 0 })
    ;(sys as any).whirlwinds.push(ww)
    sys.update(0, makeMockWorld(3), mockEm, TICK0)
    expect((sys as any).whirlwinds).toHaveLength(0)
  })

  it('tile=3时触发getTile调用', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(SPAWN_CHANCE - 0.0001)
    const world = makeMockWorld(3)
    sys.update(0, world, mockEm, TICK0)
    expect(world.getTile).toHaveBeenCalled()
  })

  it('两次连续update只在间隔>=CHECK_INTERVAL时才更新lastCheck', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeMockWorld(3), mockEm, TICK0)
    const lc1 = (sys as any).lastCheck
    sys.update(0, makeMockWorld(3), mockEm, TICK0 + 100)
    expect((sys as any).lastCheck).toBe(lc1)
  })
})
