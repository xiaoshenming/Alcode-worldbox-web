import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldMudPotSystem } from '../systems/WorldMudPotSystem'
import type { MudPot } from '../systems/WorldMudPotSystem'

// ─── helpers ──────────────────────────────────────────────────────────────────
function makeSys(): WorldMudPotSystem { return new WorldMudPotSystem() }

function makeWorld(): { width: number; height: number } {
  return { width: 200, height: 200 }
}

function makeEM() { return {} as any }

function pushPot(sys: WorldMudPotSystem, override: Partial<MudPot> = {}): MudPot {
  const p: MudPot = {
    id: (sys as any).nextId++,
    x: 20, y: 30,
    viscosity: 50, temperature: 70, bubbleRate: 20, acidContent: 15,
    age: 0, tick: 0,
    ...override,
  }
  ;(sys as any).pots.push(p)
  return p
}

// ─── 1. 初始状态 ──────────────────────────────────────────────────────────────
describe('WorldMudPotSystem 初始状态', () => {
  let sys: WorldMudPotSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('pots 初始为空数组', () => {
    expect((sys as any).pots).toHaveLength(0)
  })

  it('nextId 初始值为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始值为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('pots 是数组类型', () => {
    expect(Array.isArray((sys as any).pots)).toBe(true)
  })

  it('多次构造实例互不影响', () => {
    const sys2 = makeSys()
    pushPot(sys)
    expect((sys2 as any).pots).toHaveLength(0)
  })

  it('注入一条后长度为 1', () => {
    pushPot(sys)
    expect((sys as any).pots).toHaveLength(1)
  })

  it('注入多条后长度正确', () => {
    pushPot(sys); pushPot(sys); pushPot(sys)
    expect((sys as any).pots).toHaveLength(3)
  })
})

// ─── 2. CHECK_INTERVAL 节流（2680）────────────────────────────────────────────
describe('WorldMudPotSystem CHECK_INTERVAL 节流', () => {
  let sys: WorldMudPotSystem
  const em = makeEM()
  const world = makeWorld()

  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0 时不执行（差值 0 < 2680）', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world as any, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2679 时不执行（差值 < 2680）', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world as any, em, 2679)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2680 时恰好执行（差值 >= 2680）', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world as any, em, 2680)
    expect((sys as any).lastCheck).toBe(2680)
  })

  it('第一次执行后 lastCheck 更新为当前 tick', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world as any, em, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('第二次调用不满 2680 时不更新 lastCheck', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world as any, em, 5000)
    sys.update(1, world as any, em, 7659)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('第二次满足间隔时 lastCheck 更新', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world as any, em, 5000)
    sys.update(1, world as any, em, 7680)
    expect((sys as any).lastCheck).toBe(7680)
  })
})

// ─── 3. spawn 条件 ────────────────────────────────────────────────────────────
describe('WorldMudPotSystem spawn 条件', () => {
  let sys: WorldMudPotSystem
  const em = makeEM()
  const world = makeWorld()

  afterEach(() => { vi.restoreAllMocks() })

  it('random < FORM_CHANCE(0.0009) → 生成泥泉', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.0008).mockReturnValue(0.5)
    sys.update(1, world as any, em, 2680)
    expect((sys as any).pots).toHaveLength(1)
  })

  it('random >= FORM_CHANCE(0.0009) → 不生成泥泉', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValue(0.5)
    sys.update(1, world as any, em, 2680)
    expect((sys as any).pots).toHaveLength(0)
  })

  it('random = 0.0009 精确边界 → 不生成（< 不满足 =）', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.0009).mockReturnValue(0.5)
    sys.update(1, world as any, em, 2680)
    expect((sys as any).pots).toHaveLength(0)
  })

  it('已达 MAX_POTS(8) → 不再生成', () => {
    sys = makeSys()
    for (let i = 0; i < 8; i++) pushPot(sys)
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.0001).mockReturnValue(0.5)
    sys.update(1, world as any, em, 2680)
    expect((sys as any).pots).toHaveLength(8)
  })

  it('7 条时还可再生成一条（未达上限）', () => {
    sys = makeSys()
    for (let i = 0; i < 7; i++) pushPot(sys)
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.0001).mockReturnValue(0.5)
    sys.update(1, world as any, em, 2680)
    expect((sys as any).pots).toHaveLength(8)
  })

  it('world 未设宽高时使用默认 200x200', () => {
    sys = makeSys()
    const emptyWorld = {} as any // width/height undefined → 200
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.0001).mockReturnValue(0.5)
    sys.update(1, emptyWorld, em, 2680)
    const p = (sys as any).pots[0]
    expect(p.x).toBeGreaterThanOrEqual(0)
    expect(p.x).toBeLessThan(200)
  })
})

// ─── 4. spawn 后字段范围 ──────────────────────────────────────────────────────
describe('WorldMudPotSystem spawn 后字段范围', () => {
  let sys: WorldMudPotSystem
  const em = makeEM()
  const world = makeWorld()

  afterEach(() => { vi.restoreAllMocks() })

  // spawn 后 update 循环立即执行一次：
  // age+=0.005, viscosity±0.1*0.5, temperature-=0.006, bubbleRate小幅±

  function spawnWithRandom(r: number): MudPot {
    sys = makeSys()
    // 第1次: FORM_CHANCE check(pass) → 第2次: x coord → 第3次: y coord
    // 第4次: viscosity → 第5次: temperature → 第6次: bubbleRate → 第7次: acidContent
    // 之后 update loop: viscosity random, bubbleRate random
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.0001).mockReturnValue(r)
    sys.update(1, world as any, em, 2680)
    return (sys as any).pots[0]
  }

  it('id 从 1 开始', () => {
    const p = spawnWithRandom(0.5)
    expect(p.id).toBe(1)
  })

  it('age 初始为 0（spawn时）并在 update 后为 0.005', () => {
    const p = spawnWithRandom(0.5)
    expect(p.age).toBeCloseTo(0.005, 5)
  })

  it('tick 等于当前 tick(2680)', () => {
    const p = spawnWithRandom(0.5)
    expect(p.tick).toBe(2680)
  })

  it('viscosity spawn 范围 [30,70]（r=0 → 30, r=1 → 70）', () => {
    const p = spawnWithRandom(0.5)
    // 30 + 0.5*40 = 50, 再经update最大偏移±0.05
    expect(p.viscosity).toBeGreaterThanOrEqual(10)
    expect(p.viscosity).toBeLessThanOrEqual(90)
  })

  it('temperature spawn 范围 [50,90]（r=0→50, r=1→90）', () => {
    const p = spawnWithRandom(0.5)
    // 50+0.5*40=70, update后 max(30, 70-0.006)≈69.994
    expect(p.temperature).toBeGreaterThanOrEqual(30)
    expect(p.temperature).toBeLessThanOrEqual(90)
  })

  it('bubbleRate spawn 范围 [10,40]', () => {
    const p = spawnWithRandom(0.5)
    expect(p.bubbleRate).toBeGreaterThanOrEqual(5)
    expect(p.bubbleRate).toBeLessThanOrEqual(80)
  })

  it('acidContent spawn 范围 [5,30]（不参与update）', () => {
    const p = spawnWithRandom(0)
    // r=0 → acidContent = 5+0*25 = 5
    expect(p.acidContent).toBeGreaterThanOrEqual(5)
    expect(p.acidContent).toBeLessThanOrEqual(30)
  })

  it('nextId 在每次 spawn 后递增', () => {
    spawnWithRandom(0.5)
    expect((sys as any).nextId).toBe(2)
  })
})

// ─── 5. update 数值逻辑 ───────────────────────────────────────────────────────
describe('WorldMudPotSystem update 数值逻辑', () => {
  let sys: WorldMudPotSystem
  const em = makeEM()
  const world = makeWorld()

  afterEach(() => { vi.restoreAllMocks() })

  it('age 每次 update +0.005', () => {
    sys = makeSys()
    pushPot(sys, { age: 10 })
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world as any, em, 2680)
    expect((sys as any).pots[0].age).toBeCloseTo(10.005, 5)
  })

  it('temperature 每次 update 减 0.006', () => {
    sys = makeSys()
    pushPot(sys, { temperature: 60 })
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world as any, em, 2680)
    expect((sys as any).pots[0].temperature).toBeCloseTo(59.994, 4)
  })

  it('temperature 下限为 30', () => {
    sys = makeSys()
    pushPot(sys, { temperature: 30.003 })
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world as any, em, 2680)
    expect((sys as any).pots[0].temperature).toBeGreaterThanOrEqual(30)
  })

  it('viscosity 随机偏移 r=0.5 → +(0.5-0.5)*0.1 = 0 变化', () => {
    sys = makeSys()
    pushPot(sys, { viscosity: 50 })
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world as any, em, 2680)
    expect((sys as any).pots[0].viscosity).toBeCloseTo(50, 3)
  })

  it('viscosity 上限为 90', () => {
    sys = makeSys()
    pushPot(sys, { viscosity: 89.97 })
    vi.spyOn(Math, 'random').mockReturnValue(1) // (1-0.5)*0.1=+0.05
    sys.update(1, world as any, em, 2680)
    expect((sys as any).pots[0].viscosity).toBeLessThanOrEqual(90)
  })

  it('viscosity 下限为 10', () => {
    sys = makeSys()
    pushPot(sys, { viscosity: 10.03 })
    vi.spyOn(Math, 'random').mockReturnValue(0) // (0-0.5)*0.1=-0.05
    sys.update(1, world as any, em, 2680)
    expect((sys as any).pots[0].viscosity).toBeGreaterThanOrEqual(10)
  })

  it('bubbleRate 下限为 5', () => {
    sys = makeSys()
    pushPot(sys, { bubbleRate: 5.02 })
    vi.spyOn(Math, 'random').mockReturnValue(0) // (0-0.48)*0.08=-0.0384
    sys.update(1, world as any, em, 2680)
    expect((sys as any).pots[0].bubbleRate).toBeGreaterThanOrEqual(5)
  })

  it('bubbleRate 上限为 80', () => {
    sys = makeSys()
    pushPot(sys, { bubbleRate: 79.98 })
    vi.spyOn(Math, 'random').mockReturnValue(1) // (1-0.48)*0.08=+0.0416
    sys.update(1, world as any, em, 2680)
    expect((sys as any).pots[0].bubbleRate).toBeLessThanOrEqual(80)
  })

  it('多个泥泉都会被 update', () => {
    sys = makeSys()
    pushPot(sys, { age: 1, temperature: 60 })
    pushPot(sys, { age: 2, temperature: 65 })
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world as any, em, 2680)
    expect((sys as any).pots[0].age).toBeCloseTo(1.005, 5)
    expect((sys as any).pots[1].age).toBeCloseTo(2.005, 5)
  })
})

// ─── 6. cleanup 逻辑 ──────────────────────────────────────────────────────────
describe('WorldMudPotSystem cleanup 逻辑', () => {
  let sys: WorldMudPotSystem
  const em = makeEM()
  const world = makeWorld()

  afterEach(() => { vi.restoreAllMocks() })

  // cleanup 条件: !(p.age < 90) → age >= 90 时删除

  it('age=89.999+0.005=90.004 >= 90 → cleanup 删除', () => {
    sys = makeSys()
    pushPot(sys, { age: 89.999 })
    // random=1 > FORM_CHANCE(0.0009) → 不触发spawn，update后age=90.004被cleanup
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, em, 2680)
    expect((sys as any).pots).toHaveLength(0)
  })

  it('age=89.99 时保留不删除（+0.005=89.995 < 90）', () => {
    sys = makeSys()
    pushPot(sys, { age: 89.99 })
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world as any, em, 2680)
    // 89.99+0.005=89.995 < 90 → 保留
    expect((sys as any).pots).toHaveLength(1)
  })

  it('age=90 时删除（!( 90 < 90 ) → true）', () => {
    sys = makeSys()
    pushPot(sys, { age: 90 })
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world as any, em, 2680)
    // update后age=90.005，cleanup时 !(90.005<90) → 删除
    expect((sys as any).pots).toHaveLength(0)
  })

  it('age=100 时删除', () => {
    sys = makeSys()
    pushPot(sys, { age: 100 })
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world as any, em, 2680)
    expect((sys as any).pots).toHaveLength(0)
  })

  it('只删过期的，保留未过期的', () => {
    sys = makeSys()
    pushPot(sys, { age: 100 }) // 过期
    pushPot(sys, { age: 5 })   // 未过期
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world as any, em, 2680)
    expect((sys as any).pots).toHaveLength(1)
    expect((sys as any).pots[0].age).toBeCloseTo(5.005, 5)
  })

  it('全部过期时数组为空', () => {
    sys = makeSys()
    for (let i = 0; i < 5; i++) pushPot(sys, { age: 95 })
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world as any, em, 2680)
    expect((sys as any).pots).toHaveLength(0)
  })

  it('无过期记录时长度不变', () => {
    sys = makeSys()
    pushPot(sys, { age: 1 }); pushPot(sys, { age: 2 })
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world as any, em, 2680)
    expect((sys as any).pots).toHaveLength(2)
  })
})
