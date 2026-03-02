import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldPyroclasticFlowSystem } from '../systems/WorldPyroclasticFlowSystem'
import type { PyroclasticFlow } from '../systems/WorldPyroclasticFlowSystem'

function makeSys(): WorldPyroclasticFlowSystem { return new WorldPyroclasticFlowSystem() }
let nextId = 1
function makeFlow(overrides: Partial<PyroclasticFlow> = {}): PyroclasticFlow {
  return {
    id: nextId++, x: 30, y: 40, speed: 15, temperature: 800,
    density: 3, reachDistance: 20, tick: 0,
    ...overrides,
  }
}

function makeWorld() {
  return { width: 200, height: 200, getTile: () => 7 } as any
}

const em = {} as any

describe('WorldPyroclasticFlowSystem - 初始状态', () => {
  let sys: WorldPyroclasticFlowSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无火成碎屑流', () => {
    expect((sys as any).flows).toHaveLength(0)
  })
  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('注入后 flows 长度为 1', () => {
    ;(sys as any).flows.push(makeFlow())
    expect((sys as any).flows).toHaveLength(1)
  })
  it('flows 返回内部引用', () => {
    expect((sys as any).flows).toBe((sys as any).flows)
  })
  it('火成碎屑流 temperature 字段正确', () => {
    ;(sys as any).flows.push(makeFlow())
    expect((sys as any).flows[0].temperature).toBe(800)
  })
  it('火成碎屑流 speed 字段正确', () => {
    ;(sys as any).flows.push(makeFlow())
    expect((sys as any).flows[0].speed).toBe(15)
  })
  it('火成碎屑流 reachDistance 字段正��', () => {
    ;(sys as any).flows.push(makeFlow())
    expect((sys as any).flows[0].reachDistance).toBe(20)
  })
  it('多个流全部返回', () => {
    ;(sys as any).flows.push(makeFlow(), makeFlow())
    expect((sys as any).flows).toHaveLength(2)
  })
})

describe('WorldPyroclasticFlowSystem - CHECK_INTERVAL 节流', () => {
  let sys: WorldPyroclasticFlowSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick < CHECK_INTERVAL(2700) 时不执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), em, 2699)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick = CHECK_INTERVAL(2700) 时执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, 2700)
    expect((sys as any).lastCheck).toBe(2700)
  })
  it('tick > CHECK_INTERVAL 时执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })
  it('执行后 lastCheck 更新为当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, 8100)
    expect((sys as any).lastCheck).toBe(8100)
  })
  it('节流期间不修改已有 flows', () => {
    ;(sys as any).flows.push(makeFlow({ speed: 15, temperature: 800 }))
    sys.update(1, makeWorld(), em, 100)
    expect((sys as any).flows[0].speed).toBe(15)
    expect((sys as any).flows[0].temperature).toBe(800)
  })
  it('连续两次节流间隔各执行一次', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, 2700)
    expect((sys as any).lastCheck).toBe(2700)
    sys.update(1, makeWorld(), em, 5400)
    expect((sys as any).lastCheck).toBe(5400)
  })
  it('第二次调用 tick 未超过间隔时不再执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, 2700)
    sys.update(1, makeWorld(), em, 2701)
    expect((sys as any).lastCheck).toBe(2700)
  })
  it('间隔恰好到达时不漏执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, 2700)
    sys.update(1, makeWorld(), em, 5400)
    expect((sys as any).lastCheck).toBe(5400)
  })
})

describe('WorldPyroclasticFlowSystem - spawn 条件', () => {
  let sys: WorldPyroclasticFlowSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('FORM_CHANCE=0.0007，random=0 时 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), em, 2700)
    expect((sys as any).flows.length).toBeGreaterThanOrEqual(1)
  })
  it('random >= FORM_CHANCE(0.0007) 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0007)
    sys.update(1, makeWorld(), em, 2700)
    expect((sys as any).flows).toHaveLength(0)
  })
  it('random = 0.001 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(), em, 2700)
    expect((sys as any).flows).toHaveLength(0)
  })
  it('flows 达到 MAX_FLOWS(6) 时不再 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 6; i++) {
      ;(sys as any).flows.push(makeFlow({ speed: 15 }))
    }
    sys.update(1, makeWorld(), em, 2700)
    expect((sys as any).flows.length).toBe(6)
  })
  it('flows = 5 时可再 spawn 一个', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 5; i++) {
      ;(sys as any).flows.push(makeFlow({ speed: 15 }))
    }
    sys.update(1, makeWorld(), em, 2700)
    expect((sys as any).flows.length).toBeGreaterThanOrEqual(5)
  })
  it('不需要检查 tile 类型，任何世界都可 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const grassWorld = { width: 100, height: 100, getTile: () => 3 } as any
    sys.update(1, grassWorld, em, 2700)
    expect((sys as any).flows.length).toBeGreaterThanOrEqual(1)
  })
  it('spawn 时 x/y 坐标在 world 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const smallWorld = { width: 50, height: 50, getTile: () => 0 } as any
    sys.update(1, smallWorld, em, 2700)
    const f = (sys as any).flows[0]
    expect(f.x).toBeGreaterThanOrEqual(0)
    expect(f.x).toBeLessThan(50)
    expect(f.y).toBeGreaterThanOrEqual(0)
    expect(f.y).toBeLessThan(50)
  })
  it('world 无 width/height 时使用默认值 200', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const noSizeWorld = { getTile: () => 0 } as any
    sys.update(1, noSizeWorld, em, 2700)
    const f = (sys as any).flows[0]
    expect(f.x).toBeGreaterThanOrEqual(0)
    expect(f.x).toBeLessThan(200)
  })
  it('spawn 后 id 从 1 开始单调递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), em, 2700)
    expect((sys as any).flows[0].id).toBe(1)
  })
})

describe('WorldPyroclasticFlowSystem - spawn 字段范围', () => {
  let sys: WorldPyroclasticFlowSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('spawn 后 reachDistance 初始为 0，经 update 后增加', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), em, 2700)
    const f = (sys as any).flows[0]
    // reachDistance=0，update后+=speed*0.005=(40-0.2)*0.005=0.199
    expect(f.reachDistance).toBeCloseTo(0.199, 2)
  })
  it('spawn speed 范围接近 [40,100]（update后略减）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), em, 2700)
    const f = (sys as any).flows[0]
    // speed=40, update后-=0.2，约39.8
    expect(f.speed).toBeGreaterThanOrEqual(39)
    expect(f.speed).toBeLessThanOrEqual(100)
  })
  it('spawn temperature 范围接近 [300,700]（update后略减）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), em, 2700)
    const f = (sys as any).flows[0]
    // temperature=300, update后-=0.5，约299.5
    expect(f.temperature).toBeGreaterThanOrEqual(299)
    expect(f.temperature).toBeLessThanOrEqual(700)
  })
  it('spawn density 范围接近 [20,60]（update后略减）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), em, 2700)
    const f = (sys as any).flows[0]
    // density=20, update后-=0.05，约19.95
    expect(f.density).toBeGreaterThanOrEqual(19)
    expect(f.density).toBeLessThanOrEqual(60)
  })
  it('spawn tick 等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), em, 2700)
    const f = (sys as any).flows[0]
    expect(f.tick).toBe(2700)
  })
  it('spawn 后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), em, 2700)
    expect((sys as any).nextId).toBe(2)
  })
  it('两次 spawn 后 nextId 为 3', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), em, 2700)
    sys.update(1, makeWorld(), em, 5400)
    expect((sys as any).nextId).toBe(3)
  })
})

describe('WorldPyroclasticFlowSystem - update 数值逻辑', () => {
  let sys: WorldPyroclasticFlowSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('speed 每次 update 减少 0.2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).flows.push(makeFlow({ speed: 10 }))
    sys.update(1, makeWorld(), em, 2700)
    expect((sys as any).flows[0].speed).toBeCloseTo(9.8)
  })
  it('speed 被 max(0,...) 钳制不会低于 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // speed=1.5，update后 max(0,1.5-0.2)=1.3 > 1，不触发 cleanup
    ;(sys as any).flows.push(makeFlow({ speed: 1.5 }))
    sys.update(1, makeWorld(), em, 2700)
    expect((sys as any).flows[0].speed).toBeGreaterThanOrEqual(0)
    expect((sys as any).flows[0].speed).toBeCloseTo(1.3)
  })
  it('temperature 每次 update 减少 0.5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).flows.push(makeFlow({ speed: 15, temperature: 800 }))
    sys.update(1, makeWorld(), em, 2700)
    expect((sys as any).flows[0].temperature).toBeCloseTo(799.5)
  })
  it('temperature 最低为 50', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).flows.push(makeFlow({ speed: 15, temperature: 50.1 }))
    sys.update(1, makeWorld(), em, 2700)
    expect((sys as any).flows[0].temperature).toBeGreaterThanOrEqual(50)
  })
  it('temperature = 50 时不再下降', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).flows.push(makeFlow({ speed: 15, temperature: 50 }))
    sys.update(1, makeWorld(), em, 2700)
    expect((sys as any).flows[0].temperature).toBe(50)
  })
  it('reachDistance 每次 update 增加 speed * 0.005', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).flows.push(makeFlow({ speed: 20, reachDistance: 10 }))
    sys.update(1, makeWorld(), em, 2700)
    // speed先-=0.2变19.8，然后reachDistance+=19.8*0.005=0.099
    expect((sys as any).flows[0].reachDistance).toBeCloseTo(10.099)
  })
  it('reachDistance 上限为 100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).flows.push(makeFlow({ speed: 60, reachDistance: 99.9 }))
    sys.update(1, makeWorld(), em, 2700)
    expect((sys as any).flows[0].reachDistance).toBeLessThanOrEqual(100)
  })
  it('density 每次 update 减少 0.05', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).flows.push(makeFlow({ speed: 15, density: 10 }))
    sys.update(1, makeWorld(), em, 2700)
    expect((sys as any).flows[0].density).toBeCloseTo(9.95)
  })
  it('density 不会低于 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).flows.push(makeFlow({ speed: 15, density: 0.01 }))
    sys.update(1, makeWorld(), em, 2700)
    expect((sys as any).flows[0].density).toBeGreaterThanOrEqual(0)
  })
})

describe('WorldPyroclasticFlowSystem - cleanup 逻辑', () => {
  let sys: WorldPyroclasticFlowSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('speed <= 1 时删除流（speed=1，update后=0.8<=1）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).flows.push(makeFlow({ speed: 1 }))
    sys.update(1, makeWorld(), em, 2700)
    expect((sys as any).flows).toHaveLength(0)
  })
  it('speed = 0 时删除流', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).flows.push(makeFlow({ speed: 0 }))
    sys.update(1, makeWorld(), em, 2700)
    expect((sys as any).flows).toHaveLength(0)
  })
  it('speed update后 > 1 时保留流', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).flows.push(makeFlow({ speed: 15 }))
    sys.update(1, makeWorld(), em, 2700)
    // speed=15-0.2=14.8 > 1，保留
    expect((sys as any).flows).toHaveLength(1)
  })
  it('speed = 1.2 时 update后 = 1.0 <= 1，删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).flows.push(makeFlow({ speed: 1.2 }))
    sys.update(1, makeWorld(), em, 2700)
    // speed=1.2-0.2=1.0 <= 1，删除
    expect((sys as any).flows).toHaveLength(0)
  })
  it('speed = 1.21 update后为 1.01 > 1，保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).flows.push(makeFlow({ speed: 1.21 }))
    sys.update(1, makeWorld(), em, 2700)
    // speed=1.21-0.2=1.01 > 1，保留
    expect((sys as any).flows).toHaveLength(1)
  })
  it('多个流中只删除满足条件的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).flows.push(makeFlow({ speed: 1 }))
    ;(sys as any).flows.push(makeFlow({ speed: 15 }))
    sys.update(1, makeWorld(), em, 2700)
    expect((sys as any).flows).toHaveLength(1)
    expect((sys as any).flows[0].speed).toBeGreaterThan(1)
  })
  it('空 flows 时 cleanup 不报错', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, makeWorld(), em, 2700)).not.toThrow()
  })
  it('cleanup 后 nextId 不重置', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).nextId = 7
    ;(sys as any).flows.push(makeFlow({ speed: 1 }))
    sys.update(1, makeWorld(), em, 2700)
    expect((sys as any).nextId).toBe(7)
  })
})
