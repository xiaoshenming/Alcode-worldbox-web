import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldMudVolcanoSystem } from '../systems/WorldMudVolcanoSystem'
import type { MudVolcano } from '../systems/WorldMudVolcanoSystem'

// ─── helpers ──────────────────────────────────────────────────────────────────
function makeSys(): WorldMudVolcanoSystem { return new WorldMudVolcanoSystem() }

function makeWorld(): { width: number; height: number } {
  return { width: 200, height: 200 }
}

function makeEM() { return {} as any }

function pushVolcano(sys: WorldMudVolcanoSystem, override: Partial<MudVolcano> = {}): MudVolcano {
  const v: MudVolcano = {
    id: (sys as any).nextId++,
    x: 25, y: 35,
    eruptionForce: 30,
    mudDepth: 40,
    gasEmission: 15,
    dormancy: 0,
    tick: 0,
    ...override,
  }
  ;(sys as any).volcanos.push(v)
  return v
}

// ─── 1. 初始状态 ──────────────────────────────────────────────────────────────
describe('WorldMudVolcanoSystem 初始状态', () => {
  let sys: WorldMudVolcanoSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('volcanos 初始为空数组', () => {
    expect((sys as any).volcanos).toHaveLength(0)
  })

  it('nextId 初始值为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始值为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('volcanos 是数组类型', () => {
    expect(Array.isArray((sys as any).volcanos)).toBe(true)
  })

  it('多次构造实例互不影响', () => {
    const sys2 = makeSys()
    pushVolcano(sys)
    expect((sys2 as any).volcanos).toHaveLength(0)
  })

  it('注入一条后长度为 1', () => {
    pushVolcano(sys)
    expect((sys as any).volcanos).toHaveLength(1)
  })

  it('注入多条后长度正确', () => {
    pushVolcano(sys); pushVolcano(sys); pushVolcano(sys)
    expect((sys as any).volcanos).toHaveLength(3)
  })
})

// ─── 2. CHECK_INTERVAL 节流（2650）───────────────────────────────────────────
describe('WorldMudVolcanoSystem CHECK_INTERVAL 节流', () => {
  let sys: WorldMudVolcanoSystem
  const em = makeEM()
  const world = makeWorld()

  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0 时不执行（差值 0 < 2650）', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world as any, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2649 时不执行（差值 < 2650）', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world as any, em, 2649)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2650 时恰好执行（差值 >= 2650）', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(1) // 不触发spawn
    sys.update(1, world as any, em, 2650)
    expect((sys as any).lastCheck).toBe(2650)
  })

  it('第一次执行后 lastCheck 更新为当前 tick', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, em, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('第二次调用不满 2650 时不更新 lastCheck', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, em, 5000)
    sys.update(1, world as any, em, 7649)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('第二次满足间隔时 lastCheck 更新', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, em, 5000)
    sys.update(1, world as any, em, 7650)
    expect((sys as any).lastCheck).toBe(7650)
  })
})

// ─── 3. spawn 条件 ────────────────────────────────────────────────────────────
describe('WorldMudVolcanoSystem spawn 条件', () => {
  let sys: WorldMudVolcanoSystem
  const em = makeEM()
  const world = makeWorld()

  afterEach(() => { vi.restoreAllMocks() })

  it('random < FORM_CHANCE(0.0013) → 生成泥火山', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValue(0.5)
    sys.update(1, world as any, em, 2650)
    expect((sys as any).volcanos).toHaveLength(1)
  })

  it('random >= FORM_CHANCE(0.0013) → 不生成泥火山', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.002).mockReturnValue(0.5)
    sys.update(1, world as any, em, 2650)
    expect((sys as any).volcanos).toHaveLength(0)
  })

  it('random = 0.0013 精确边界 → 不生成（< 不满足 =）', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.0013).mockReturnValue(0.5)
    sys.update(1, world as any, em, 2650)
    expect((sys as any).volcanos).toHaveLength(0)
  })

  it('已达 MAX_VOLCANOS(10) → 不再生成', () => {
    sys = makeSys()
    // dormancy=0, 每次update +0.01，cleanup条件 dormancy>=100
    // 但eruptionForce>20且random<0.05可能触发mudDepth++
    // 需要让10个volcano存活：dormancy足够小
    for (let i = 0; i < 10; i++) pushVolcano(sys, { dormancy: 0, eruptionForce: 5 })
    // eruptionForce=5 <= 20 不触发mudDepth增加
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.0001).mockReturnValue(1)
    sys.update(1, world as any, em, 2650)
    expect((sys as any).volcanos).toHaveLength(10)
  })

  it('9 条时还可再生成一条（未达上限）', () => {
    sys = makeSys()
    for (let i = 0; i < 9; i++) pushVolcano(sys, { dormancy: 0, eruptionForce: 5 })
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.0001).mockReturnValue(1)
    sys.update(1, world as any, em, 2650)
    expect((sys as any).volcanos).toHaveLength(10)
  })

  it('world 未设宽高时使用默认 200x200', () => {
    sys = makeSys()
    const emptyWorld = {} as any
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.0001).mockReturnValue(0.5)
    sys.update(1, emptyWorld, em, 2650)
    const v = (sys as any).volcanos[0]
    expect(v.x).toBeGreaterThanOrEqual(0)
    expect(v.x).toBeLessThan(200)
  })
})

// ─── 4. spawn 后字段范围 ──────────────────────────────────────────────────────
describe('WorldMudVolcanoSystem spawn 后字段范围', () => {
  let sys: WorldMudVolcanoSystem
  const em = makeEM()
  const world = makeWorld()

  afterEach(() => { vi.restoreAllMocks() })

  // spawn后立即执行update loop:
  // eruptionForce = max(0, f - 0.03)
  // dormancy += 0.01
  // if eruptionForce > 20 && random < 0.05: mudDepth += 2

  function spawnWithRandom(r: number): MudVolcano {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.0001).mockReturnValue(r)
    sys.update(1, world as any, em, 2650)
    return (sys as any).volcanos[0]
  }

  it('id 从 1 开始', () => {
    expect(spawnWithRandom(0.5).id).toBe(1)
  })

  it('tick 等于当前 tick(2650)', () => {
    expect(spawnWithRandom(0.5).tick).toBe(2650)
  })

  it('dormancy 初始为 0，spawn后update变为 0.01', () => {
    const v = spawnWithRandom(0.5)
    expect(v.dormancy).toBeCloseTo(0.01, 5)
  })

  it('eruptionForce spawn 范围 [10,50]（10+r*40）→ update后 -0.03', () => {
    const v = spawnWithRandom(0.5)
    // spawn: 10 + 0.5*40 = 30, update: max(0, 30-0.03) = 29.97
    expect(v.eruptionForce).toBeCloseTo(29.97, 3)
  })

  it('eruptionForce 最小值 spawn=10（r=0）→ update后 9.97', () => {
    const v = spawnWithRandom(0)
    // r=0: eruptionForce = 10+0*40=10, update: max(0,10-0.03)=9.97
    expect(v.eruptionForce).toBeCloseTo(9.97, 3)
  })

  it('mudDepth spawn 范围 [20,50]（20+r*30）', () => {
    const v = spawnWithRandom(0.5)
    // spawn: 20+0.5*30=35, eruptionForce=29.97>20, r=0.5>=0.05 → 不触发mudDepth++
    expect(v.mudDepth).toBeCloseTo(35, 3)
  })

  it('gasEmission spawn 范围 [5,30]（5+r*25）', () => {
    const v = spawnWithRandom(0.5)
    expect(v.gasEmission).toBeCloseTo(17.5, 2)
  })

  it('nextId 在每次 spawn 后递增', () => {
    spawnWithRandom(0.5)
    expect((sys as any).nextId).toBe(2)
  })
})

// ─── 5. update 数值逻辑 ───────────────────────────────────────────────────────
describe('WorldMudVolcanoSystem update 数值逻辑', () => {
  let sys: WorldMudVolcanoSystem
  const em = makeEM()
  const world = makeWorld()

  afterEach(() => { vi.restoreAllMocks() })

  it('eruptionForce 每次 update 减 0.03', () => {
    sys = makeSys()
    pushVolcano(sys, { eruptionForce: 25, dormancy: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(1) // > 0.05 不触发
    sys.update(1, world as any, em, 2650)
    expect((sys as any).volcanos[0].eruptionForce).toBeCloseTo(24.97, 4)
  })

  it('eruptionForce 下限为 0', () => {
    sys = makeSys()
    pushVolcano(sys, { eruptionForce: 0.01, dormancy: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, em, 2650)
    expect((sys as any).volcanos[0].eruptionForce).toBeGreaterThanOrEqual(0)
  })

  it('dormancy 每次 update +0.01', () => {
    sys = makeSys()
    pushVolcano(sys, { eruptionForce: 5, dormancy: 10 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, em, 2650)
    expect((sys as any).volcanos[0].dormancy).toBeCloseTo(10.01, 5)
  })

  it('eruptionForce > 20 且 random < 0.05 时 mudDepth +2', () => {
    sys = makeSys()
    pushVolcano(sys, { eruptionForce: 25, mudDepth: 40, dormancy: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0.04) // < 0.05 → 触发
    sys.update(1, world as any, em, 2650)
    // eruptionForce update: max(0,25-0.03)=24.97 > 20
    // mudDepth = min(100, 40+2) = 42
    expect((sys as any).volcanos[0].mudDepth).toBe(42)
  })

  it('eruptionForce > 20 且 random >= 0.05 时 mudDepth 不变', () => {
    sys = makeSys()
    pushVolcano(sys, { eruptionForce: 25, mudDepth: 40, dormancy: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0.06) // >= 0.05 → 不触发
    sys.update(1, world as any, em, 2650)
    expect((sys as any).volcanos[0].mudDepth).toBe(40)
  })

  it('eruptionForce <= 20 时即使 random < 0.05 也不触发 mudDepth', () => {
    sys = makeSys()
    // eruptionForce=20.02, update后 max(0,20.02-0.03)=19.99 <= 20 → 不触发
    pushVolcano(sys, { eruptionForce: 20.02, mudDepth: 40, dormancy: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0.04)
    sys.update(1, world as any, em, 2650)
    expect((sys as any).volcanos[0].mudDepth).toBe(40)
  })

  it('mudDepth 上限为 100（min(100,...)）', () => {
    sys = makeSys()
    pushVolcano(sys, { eruptionForce: 25, mudDepth: 99, dormancy: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0.04) // 触发 mudDepth+2
    sys.update(1, world as any, em, 2650)
    expect((sys as any).volcanos[0].mudDepth).toBeLessThanOrEqual(100)
  })

  it('多个火山都会被 update', () => {
    sys = makeSys()
    pushVolcano(sys, { eruptionForce: 30, dormancy: 5, mudDepth: 40 })
    pushVolcano(sys, { eruptionForce: 10, dormancy: 3, mudDepth: 30 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, em, 2650)
    expect((sys as any).volcanos[0].dormancy).toBeCloseTo(5.01, 5)
    expect((sys as any).volcanos[1].dormancy).toBeCloseTo(3.01, 5)
  })
})

// ─── 6. cleanup 逻辑 ──────────────────────────────────────────────────────────
describe('WorldMudVolcanoSystem cleanup 逻辑', () => {
  let sys: WorldMudVolcanoSystem
  const em = makeEM()
  const world = makeWorld()

  afterEach(() => { vi.restoreAllMocks() })

  // cleanup 条件: !(v.dormancy < 100) → dormancy >= 100 时删除

  it('dormancy=100 时被删除（!(100 < 100) = true）', () => {
    sys = makeSys()
    pushVolcano(sys, { dormancy: 100, eruptionForce: 5 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, em, 2650)
    // update后 dormancy=100.01 >= 100 → 删除
    expect((sys as any).volcanos).toHaveLength(0)
  })

  it('dormancy=99.99 时 +0.01=100 >= 100 → 被 cleanup 删除', () => {
    sys = makeSys()
    pushVolcano(sys, { dormancy: 99.99, eruptionForce: 5 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, em, 2650)
    // 99.99+0.01=100 → cleanup: !(100<100)=true → 删除
    expect((sys as any).volcanos).toHaveLength(0)
  })

  it('dormancy=99.98 时 +0.01=99.99 < 100 → 保留', () => {
    sys = makeSys()
    pushVolcano(sys, { dormancy: 99.98, eruptionForce: 5 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, em, 2650)
    // 99.98+0.01=99.99 < 100 → 保留
    expect((sys as any).volcanos).toHaveLength(1)
  })

  it('dormancy=200 时被删除', () => {
    sys = makeSys()
    pushVolcano(sys, { dormancy: 200, eruptionForce: 5 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, em, 2650)
    expect((sys as any).volcanos).toHaveLength(0)
  })

  it('只删过期的，保留未过期的', () => {
    sys = makeSys()
    pushVolcano(sys, { dormancy: 100, eruptionForce: 5 }) // 过期 → 删
    pushVolcano(sys, { dormancy: 10, eruptionForce: 5 })  // 未过期 → 保留
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, em, 2650)
    expect((sys as any).volcanos).toHaveLength(1)
    expect((sys as any).volcanos[0].dormancy).toBeCloseTo(10.01, 5)
  })

  it('全部过期时数组为空', () => {
    sys = makeSys()
    for (let i = 0; i < 5; i++) pushVolcano(sys, { dormancy: 100, eruptionForce: 5 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, em, 2650)
    expect((sys as any).volcanos).toHaveLength(0)
  })

  it('无过期记录时长度不变', () => {
    sys = makeSys()
    pushVolcano(sys, { dormancy: 1, eruptionForce: 5 })
    pushVolcano(sys, { dormancy: 2, eruptionForce: 5 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, em, 2650)
    expect((sys as any).volcanos).toHaveLength(2)
  })
})
