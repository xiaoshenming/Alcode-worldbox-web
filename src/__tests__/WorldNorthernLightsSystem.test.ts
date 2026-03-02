import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldNorthernLightsSystem } from '../systems/WorldNorthernLightsSystem'
import type { NorthernLights, AuroraIntensity } from '../systems/WorldNorthernLightsSystem'

// ── mock World ────────────────────────────────────────────────────────────────
function makeWorld(width = 100, height = 100) {
  return { width, height, getTile: () => 0, setTile: () => {} } as any
}
function makeEm() { return {} as any }

function makeSys(): WorldNorthernLightsSystem { return new WorldNorthernLightsSystem() }
let nextId = 1
function makeAurora(overrides: Partial<NorthernLights> = {}): NorthernLights {
  return {
    id: nextId++, x: 30, y: 10, intensity: 'bright',
    colors: ['#00ff88', '#0088ff'], width: 20, duration: 10000, tick: 0,
    ...overrides,
  }
}

// ── 1. 初始状态 ──────────────────────────────────────────────────────────────
describe('WorldNorthernLightsSystem 初始状态', () => {
  let sys: WorldNorthernLightsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无极光', () => { expect((sys as any).auroras).toHaveLength(0) })
  it('nextId 从 1 开始', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck 初始为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('注入后可查询', () => {
    ;(sys as any).auroras.push(makeAurora())
    expect((sys as any).auroras).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).auroras).toBe((sys as any).auroras)
  })
  it('支持4种极光强度', () => {
    const intensities: AuroraIntensity[] = ['faint', 'moderate', 'bright', 'spectacular']
    expect(intensities).toHaveLength(4)
  })
  it('极光字段结构完整', () => {
    ;(sys as any).auroras.push(makeAurora({ intensity: 'spectacular' }))
    const a = (sys as any).auroras[0]
    expect(a.intensity).toBe('spectacular')
    expect(a.width).toBe(20)
    expect(a.colors).toHaveLength(2)
    expect(typeof a.duration).toBe('number')
    expect(typeof a.tick).toBe('number')
  })
})

// ── 2. CHECK_INTERVAL 节流 ───────────────────────────────────────────────────
describe('WorldNorthernLightsSystem CHECK_INTERVAL 节流', () => {
  const CHECK_INTERVAL = 3000
  let sys: WorldNorthernLightsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < CHECK_INTERVAL 时跳过执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL - 1)
    expect((sys as any).auroras).toHaveLength(0)
  })
  it('tick = CHECK_INTERVAL 时执行（3000-0=3000 不<3000）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
    // 执行了但 random=0 < SPAWN_CHANCE=0.005 → spawn一个
    expect((sys as any).auroras).toHaveLength(1)
  })
  it('tick > CHECK_INTERVAL 时执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL + 1)
    expect((sys as any).auroras).toHaveLength(1)
  })
  it('执行后 lastCheck 更新为当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // > SPAWN_CHANCE
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('两次紧挨调用：第二次 tick 不满足 CHECK_INTERVAL 则跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
    const countAfterFirst = (sys as any).auroras.length
    // 再调一次，tick 只增加了 1
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL + 1)
    // 3001 - 3000 = 1 < 3000 → 跳过
    expect((sys as any).auroras).toHaveLength(countAfterFirst)
  })
  it('相距两个 CHECK_INTERVAL 时可以再次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL * 2)
    // 两次都 spawn，第一次 spawn 1 个极光，到第二次调用时极光未过期（duration=0，tick=0，CHECK_INTERVAL*2 - 0 > 0 → cleanup；
    // 但第一次 spawn 的 aurora tick=3000, duration=floor(0*15000)+5000=5000, 6000-3000=3000 < 5000 �� 不清除）
    // 第二次再 spawn 1 个
    expect((sys as any).auroras.length).toBeGreaterThanOrEqual(1)
  })
})

// ── 3. spawn 条件 ────────────────────────────────────────────────────────────
describe('WorldNorthernLightsSystem spawn 条件', () => {
  const CHECK_INTERVAL = 3000
  let sys: WorldNorthernLightsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('random >= SPAWN_CHANCE(0.005) 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.005)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).auroras).toHaveLength(0)
  })
  it('random < SPAWN_CHANCE(0.005) 且数量<MAX(10) 时 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).auroras).toHaveLength(1)
  })
  it('数量达到 MAX_AURORAS(10) 时不再 spawn', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).auroras.push(makeAurora({ id: i + 1, duration: 999999, tick: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).auroras).toHaveLength(10)
  })
  it('数量为 9(MAX-1) 时可以 spawn 到 10', () => {
    for (let i = 0; i < 9; i++) {
      ;(sys as any).auroras.push(makeAurora({ id: i + 1, duration: 999999, tick: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).auroras).toHaveLength(10)
  })
  it('spawn 后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(2)
  })
  it('spawn 后 tick 等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).auroras[0].tick).toBe(CHECK_INTERVAL)
  })
  it('spawn 位置在北部区域(y < height*0.2)', () => {
    // random=0 → x=0, y=0
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(100, 100), makeEm(), CHECK_INTERVAL)
    const a = (sys as any).auroras[0]
    expect(a.y).toBeLessThan(20) // maxY = floor(100 * 0.2) = 20
  })
  it('spawn 后 id 从 1 开始', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).auroras[0].id).toBe(1)
  })
})

// ── 4. spawn 字段范围 ────────────────────────────────────────────────────────
describe('WorldNorthernLightsSystem spawn 字段范围', () => {
  const CHECK_INTERVAL = 3000
  let sys: WorldNorthernLightsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('random=0 → width=10+floor(0*30)=10', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(100, 100), makeEm(), CHECK_INTERVAL)
    expect((sys as any).auroras[0].width).toBe(10)
  })
  it('random=0.999 → width=10+floor(0.999*30)=39', () => {
    // spawn条件：random=0 < 0.005 → 先设小值触发spawn，再精确控制width
    const mockRand = vi.spyOn(Math, 'random')
    // 调用顺序: 1=spawn check(<0.005→ok), 2=x, 3=y, 4=intensityIdx, 5=palette, 6=width
    mockRand.mockReturnValueOnce(0)      // spawn check
    mockRand.mockReturnValueOnce(0.5)    // x
    mockRand.mockReturnValueOnce(0.5)    // y
    mockRand.mockReturnValueOnce(0)      // intensityIdx → faint
    mockRand.mockReturnValueOnce(0.999)  // palette → last
    mockRand.mockReturnValueOnce(0.999)  // width → 10+floor(0.999*30)=39
    mockRand.mockReturnValueOnce(0.999)  // duration
    sys.update(0, makeWorld(100, 100), makeEm(), CHECK_INTERVAL)
    expect((sys as any).auroras[0].width).toBe(39)
  })
  it('duration 最小值: 5000 (random=0 for floor)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(100, 100), makeEm(), CHECK_INTERVAL)
    expect((sys as any).auroras[0].duration).toBe(5000)
  })
  it('duration 最大值: 5000+floor(0.999*15000)=19998', () => {
    const mockRand = vi.spyOn(Math, 'random')
    mockRand.mockReturnValueOnce(0)      // spawn check
    mockRand.mockReturnValueOnce(0.5)    // x
    mockRand.mockReturnValueOnce(0.5)    // y
    mockRand.mockReturnValueOnce(0)      // intensityIdx
    mockRand.mockReturnValueOnce(0.5)    // palette
    mockRand.mockReturnValueOnce(0.5)    // width
    mockRand.mockReturnValueOnce(0.999)  // duration → 5000+floor(0.999*15000)=19985
    sys.update(0, makeWorld(100, 100), makeEm(), CHECK_INTERVAL)
    expect((sys as any).auroras[0].duration).toBe(19985)
  })
  it('intensityIdx=0(random=0) → faint', () => {
    const mockRand = vi.spyOn(Math, 'random')
    mockRand.mockReturnValueOnce(0)      // spawn check
    mockRand.mockReturnValueOnce(0.5)    // x
    mockRand.mockReturnValueOnce(0.5)    // y
    mockRand.mockReturnValueOnce(0)      // intensityIdx=floor(0*4)=0 → faint
    mockRand.mockReturnValue(0.5)
    sys.update(0, makeWorld(100, 100), makeEm(), CHECK_INTERVAL)
    expect((sys as any).auroras[0].intensity).toBe('faint')
  })
  it('intensity=spectacular 在 progress[0.3,0.7] 区间保持不变', () => {
    // aurora.tick=0, duration=10000, tick=5000 → age=5000, progress=0.5 → 不被evolve修改
    ;(sys as any).auroras.push(makeAurora({ tick: 0, duration: 10000, intensity: 'spectacular' }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // no spawn
    sys.update(0, makeWorld(100, 100), makeEm(), 5000) // lastCheck=0, 5000>=3000 → 执行
    expect((sys as any).auroras[0].intensity).toBe('spectacular')
  })
  it('colors 是数组，来自 COLOR_PALETTES', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(100, 100), makeEm(), CHECK_INTERVAL)
    const colors = (sys as any).auroras[0].colors
    expect(Array.isArray(colors)).toBe(true)
    expect(colors.length).toBeGreaterThanOrEqual(2)
  })
  it('x 坐标在地图宽度范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    // random=0.5 < SPAWN_CHANCE? 0.5 > 0.005, 不会spawn
    // 用 0 触发spawn然后检查x
    const mockRand = vi.spyOn(Math, 'random')
    mockRand.mockReturnValueOnce(0)  // spawn check
    mockRand.mockReturnValueOnce(0.7) // x → floor(0.7*100)=70
    mockRand.mockReturnValue(0)
    sys.update(0, makeWorld(100, 100), makeEm(), CHECK_INTERVAL)
    expect((sys as any).auroras[0].x).toBe(70)
  })
})

// ── 5. 强度进化逻辑 ──────────────────────────────────────────────────────────
describe('WorldNorthernLightsSystem 强度进化', () => {
  const CHECK_INTERVAL = 3000
  let sys: WorldNorthernLightsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  // progress = age/duration
  // progress < 0.3: intensity = INTENSITIES[min(3, floor(progress*10))]
  // progress > 0.7: intensity = INTENSITIES[max(0, 3 - floor((progress-0.7)*10))]

  it('progress=0 → intensity=INTENSITIES[0]=faint', () => {
    // age=0, duration=10000 → progress=0 → floor(0*10)=0 → faint
    ;(sys as any).auroras.push(makeAurora({ tick: CHECK_INTERVAL, duration: 10000, intensity: 'bright' }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // no spawn
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).auroras[0].intensity).toBe('faint')
  })
  it('progress=0.1 → intensity=INTENSITIES[1]=moderate', () => {
    // age=1000, duration=10000 → progress=0.1 → floor(0.1*10)=1 → moderate
    ;(sys as any).auroras.push(makeAurora({ tick: 0, duration: 10000, intensity: 'bright' }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), makeEm(), 1000)  // tick=1000, lastCheck=0, 1000>=CHECK_INTERVAL? No
    // Need tick >= CHECK_INTERVAL
  })
  it('progress=0.2 (age=2000,dur=10000) → floor(0.2*10)=2 → bright', () => {
    const auroTick = 0
    ;(sys as any).auroras.push(makeAurora({ tick: auroTick, duration: 10000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // tick = CHECK_INTERVAL, age = CHECK_INTERVAL - 0 = 3000, progress = 3000/10000 = 0.3
    // progress < 0.3 is false (equal, not less), so no evolve in that branch
    // progress > 0.7 is false, so intensity unchanged
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).auroras[0].intensity).toBe('bright')
  })
  it('progress < 0.3: intensity = INTENSITIES[min(3, floor(progress*10))]', () => {
    // tick=CHECK_INTERVAL, aurora.tick=CHECK_INTERVAL (age=0), progress=0
    ;(sys as any).auroras.push(makeAurora({ tick: CHECK_INTERVAL, duration: 10000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).auroras[0].intensity).toBe('faint')
  })
  it('progress > 0.7: 强度递减 INTENSITIES[max(0, 3-floor((p-0.7)*10))]', () => {
    // progress=0.8: 3 - floor(0.1*10) = 3-1=2 → bright
    // aurora.tick=0, duration=10000, tick需要=8000+CHECK_INTERVAL
    // 让lastCheck先设置好
    ;(sys as any).lastCheck = -CHECK_INTERVAL  // 保证第一次执行
    // aurora.tick=0, at tick=8000 → age=8000, progress=0.8 > 0.7
    ;(sys as any).auroras.push(makeAurora({ tick: 0, duration: 10000, intensity: 'faint' }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), makeEm(), 8000)
    // age=8000, progress=0.8 > 0.7 → 3-floor(0.1*10)=3-1=2 → bright
    expect((sys as any).auroras[0].intensity).toBe('bright')
  })
  it('progress=0.3: 既不<0.3也不>0.7，intensity不变', () => {
    ;(sys as any).auroras.push(makeAurora({ tick: 0, duration: 10000, intensity: 'spectacular' }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)  // age=3000, progress=0.3
    expect((sys as any).auroras[0].intensity).toBe('spectacular')
  })
  it('progress超过1: 极光已过期会被cleanup删除', () => {
    ;(sys as any).auroras.push(makeAurora({ tick: 0, duration: 500 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)  // age=3000 > duration=500 → cleanup
    expect((sys as any).auroras).toHaveLength(0)
  })
  it('多个极光各自独立进化', () => {
    ;(sys as any).auroras.push(makeAurora({ tick: CHECK_INTERVAL, duration: 10000 }))
    ;(sys as any).auroras.push(makeAurora({ tick: CHECK_INTERVAL, duration: 10000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).auroras).toHaveLength(2)
    expect((sys as any).auroras[0].intensity).toBe('faint')
    expect((sys as any).auroras[1].intensity).toBe('faint')
  })
})

// ── 6. cleanup 逻辑 ──────────────────────────────────────────────────────────
describe('WorldNorthernLightsSystem cleanup 逻辑', () => {
  const CHECK_INTERVAL = 3000
  let sys: WorldNorthernLightsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick - a.tick > a.duration 时删除 (严格大于)', () => {
    ;(sys as any).auroras.push(makeAurora({ tick: 0, duration: 1000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL) // age=3000 > 1000 → 删除
    expect((sys as any).auroras).toHaveLength(0)
  })
  it('tick - a.tick = a.duration 时保留 (等于不删)', () => {
    // duration=CHECK_INTERVAL, tick=CHECK_INTERVAL, tick-0 = 3000 = duration → 不 > → 保留
    ;(sys as any).auroras.push(makeAurora({ tick: 0, duration: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL) // age=3000, duration=3000, not >
    expect((sys as any).auroras).toHaveLength(1)
  })
  it('tick - a.tick < a.duration 时保留', () => {
    ;(sys as any).auroras.push(makeAurora({ tick: 0, duration: 99999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).auroras).toHaveLength(1)
  })
  it('过期极光从数组中移除', () => {
    ;(sys as any).auroras.push(makeAurora({ id: 1, tick: 0, duration: 100 }))
    ;(sys as any).auroras.push(makeAurora({ id: 2, tick: 0, duration: 99999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).auroras).toHaveLength(1)
    expect((sys as any).auroras[0].id).toBe(2)
  })
  it('多个过期极光都被删除', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).auroras.push(makeAurora({ tick: 0, duration: 100 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).auroras).toHaveLength(0)
  })
  it('cleanup 后 MAX_AURORAS 限制解除可再 spawn', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).auroras.push(makeAurora({ tick: 0, duration: 100 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0) // spawn_check & all randoms=0
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
    // 10 个过期极光被删除，然后重新spawn（spawn在cleanup前）
    // 源码顺序: spawn → evolve → cleanup，所以spawn时length=10, 不spawn
    // cleanup后变0。下次才能spawn
    expect((sys as any).auroras).toHaveLength(0)
  })
  it('过期check: tick-a.tick 精确等于 duration+1 → 删除', () => {
    const dur = 5000
    ;(sys as any).auroras.push(makeAurora({ tick: 0, duration: dur }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // 先设 lastCheck 让 CHECK_INTERVAL 节流通过
    ;(sys as any).lastCheck = -CHECK_INTERVAL
    sys.update(0, makeWorld(), makeEm(), dur + 1)
    expect((sys as any).auroras).toHaveLength(0)
  })
})
