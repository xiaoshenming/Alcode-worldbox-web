import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldSandstormSystem } from '../systems/WorldSandstormSystem'
import type { Sandstorm, StormSeverity } from '../systems/WorldSandstormSystem'

// CHECK_INTERVAL=1600, STORM_CHANCE=0.005, MAX_STORMS=15
// tile===3 (GRASS) to spawn, update moves x/y by cos/sin*speed, direction drifts
// cleanup: cutoff = tick-12000, removes if storm.tick < cutoff

function makeSys(): WorldSandstormSystem { return new WorldSandstormSystem() }

function makeWorld(tileValue: number | null = 3) {
  return {
    width: 100,
    height: 100,
    getTile: (_x: number, _y: number) => tileValue,
  } as any
}

function makeEM() { return {} as any }

let stormIdCounter = 1
function makeStorm(severity: StormSeverity = 'moderate', tick = 0): Sandstorm {
  return {
    id: stormIdCounter++,
    x: 30, y: 40,
    radius: 15,
    severity,
    direction: 0.5,
    speed: 2,
    damage: 20,
    tick,
  }
}

describe('WorldSandstormSystem - 初始状态', () => {
  let sys: WorldSandstormSystem
  beforeEach(() => { sys = makeSys(); stormIdCounter = 1 })

  it('初始storms数组为空', () => {
    expect((sys as any).storms).toHaveLength(0)
  })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('注入一个storm后长度为1', () => {
    ;(sys as any).storms.push(makeStorm())
    expect((sys as any).storms).toHaveLength(1)
  })

  it('注入后可查询id字段', () => {
    ;(sys as any).storms.push(makeStorm('mild'))
    expect((sys as any).storms[0].id).toBe(1)
  })

  it('注入多个storm后长度正确', () => {
    ;(sys as any).storms.push(makeStorm('mild'))
    ;(sys as any).storms.push(makeStorm('severe'))
    ;(sys as any).storms.push(makeStorm('catastrophic'))
    expect((sys as any).storms).toHaveLength(3)
  })

  it('storms是内部数组引用', () => {
    const ref = (sys as any).storms
    expect(ref).toBe((sys as any).storms)
  })

  it('支持全部4种StormSeverity枚举值', () => {
    const severities: StormSeverity[] = ['mild', 'moderate', 'severe', 'catastrophic']
    severities.forEach(s => {
      const storm = makeStorm(s)
      expect(storm.severity).toBe(s)
    })
  })
})

describe('WorldSandstormSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldSandstormSystem
  let world: any
  let em: any
  beforeEach(() => {
    sys = makeSys()
    world = makeWorld(3)
    em = makeEM()
    stormIdCounter = 1
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  it('tick=0不触发（lastCheck=0,0-0<1600）', () => {
    sys.update(1, world, em, 0)
    expect((sys as any).storms).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tick=1599不触发（1599-0<1600）', () => {
    sys.update(1, world, em, 1599)
    expect((sys as any).storms).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tick=1600触发（1600-0不小于1600）', () => {
    sys.update(1, world, em, 1600)
    expect((sys as any).lastCheck).toBe(1600)
    vi.restoreAllMocks()
  })

  it('触发后lastCheck更新为当前tick', () => {
    sys.update(1, world, em, 2000)
    expect((sys as any).lastCheck).toBe(2000)
    vi.restoreAllMocks()
  })

  it('第二次tick-lastCheck<1600时不再触发', () => {
    sys.update(1, world, em, 2000)
    const after = (sys as any).storms.length
    sys.update(1, world, em, 3000)
    // 3000-2000=1000 < 1600, 不触发
    expect((sys as any).storms).toHaveLength(after)
    vi.restoreAllMocks()
  })

  it('第二次tick>=lastCheck+1600时再次触发', () => {
    sys.update(1, world, em, 2000)
    sys.update(1, world, em, 3600) // 3600-2000=1600 触发
    expect((sys as any).lastCheck).toBe(3600)
    vi.restoreAllMocks()
  })

  it('tick不足时lastCheck不变', () => {
    sys.update(1, world, em, 500)
    expect((sys as any).lastCheck).toBe(0)
    vi.restoreAllMocks()
  })

  it('tick恰好等于CHECK_INTERVAL时执行', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 1600)
    expect((sys as any).lastCheck).toBe(1600)
    vi.restoreAllMocks()
  })
})

describe('WorldSandstormSystem - spawn条件', () => {
  let sys: WorldSandstormSystem
  let world: any
  let em: any
  beforeEach(() => {
    sys = makeSys()
    em = makeEM()
    stormIdCounter = 1
  })

  it('random>=STORM_CHANCE(0.005)不spawn', () => {
    world = makeWorld(3)
    vi.spyOn(Math, 'random').mockReturnValue(0.005)
    sys.update(1, world, em, 1600)
    expect((sys as any).storms).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('random=0且tile=3(GRASS)时spawn', () => {
    world = makeWorld(3)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, em, 1600)
    expect((sys as any).storms).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('tile=0(DEEP_WATER)不spawn', () => {
    world = makeWorld(0)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, em, 1600)
    expect((sys as any).storms).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tile=1(SHALLOW_WATER)不spawn', () => {
    world = makeWorld(1)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, em, 1600)
    expect((sys as any).storms).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tile=2(SAND)不spawn（源码tile===3才生成）', () => {
    world = makeWorld(2)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, em, 1600)
    expect((sys as any).storms).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tile=null不spawn', () => {
    world = makeWorld(null)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, em, 1600)
    expect((sys as any).storms).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('storms达到MAX_STORMS(15)时不再spawn', () => {
    world = makeWorld(3)
    for (let i = 0; i < 15; i++) {
      ;(sys as any).storms.push(makeStorm())
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, em, 1600)
    expect((sys as any).storms.length).toBeLessThanOrEqual(15)
    vi.restoreAllMocks()
  })

  it('storms=14时可以继续spawn', () => {
    world = makeWorld(3)
    for (let i = 0; i < 14; i++) {
      ;(sys as any).storms.push(makeStorm('mild', 1600))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, em, 1600)
    expect((sys as any).storms.length).toBeGreaterThanOrEqual(14)
    vi.restoreAllMocks()
  })

  it('tile=5(MOUNTAIN)不spawn', () => {
    world = makeWorld(5)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, em, 1600)
    expect((sys as any).storms).toHaveLength(0)
    vi.restoreAllMocks()
  })
})

describe('WorldSandstormSystem - spawn字段范围', () => {
  let sys: WorldSandstormSystem
  let world: any
  let em: any
  beforeEach(() => {
    sys = makeSys()
    world = makeWorld(3)
    em = makeEM()
    stormIdCounter = 1
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  it('spawn后storms长度为1', () => {
    sys.update(1, world, em, 1600)
    expect((sys as any).storms).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('spawn后id从1开始', () => {
    sys.update(1, world, em, 1600)
    expect((sys as any).storms[0].id).toBe(1)
    vi.restoreAllMocks()
  })

  it('spawn后nextId递增为2', () => {
    sys.update(1, world, em, 1600)
    expect((sys as any).nextId).toBe(2)
    vi.restoreAllMocks()
  })

  it('spawn后tick记录为当前tick', () => {
    sys.update(1, world, em, 1600)
    expect((sys as any).storms[0].tick).toBe(1600)
    vi.restoreAllMocks()
  })

  it('random=0时severity为mild（sevIdx=0）', () => {
    sys.update(1, world, em, 1600)
    // random=0 => sevIdx=floor(0*4)=0 => 'mild', damage=1*10=10
    expect((sys as any).storms[0].severity).toBe('mild')
    vi.restoreAllMocks()
  })

  it('random=0时damage为10（sevIdx=0,damage=(0+1)*10）', () => {
    sys.update(1, world, em, 1600)
    expect((sys as any).storms[0].damage).toBe(10)
    vi.restoreAllMocks()
  })

  it('spawn后radius在[8,22]范围内', () => {
    vi.restoreAllMocks()
    // 使用真实random测试多次
    for (let i = 0; i < 5; i++) {
      const s = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(0)
      s.update(1, world, em, 1600)
      const storm = (s as any).storms[0]
      if (storm) {
        expect(storm.radius).toBeGreaterThanOrEqual(8)
        expect(storm.radius).toBeLessThanOrEqual(22)
      }
      vi.restoreAllMocks()
    }
  })

  it('spawn后speed在[0.5,2.5]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, em, 1600)
    const storm = (sys as any).storms[0]
    // speed = 0.5 + random*2, random=0 => speed=0.5
    expect(storm.speed).toBeGreaterThanOrEqual(0.5)
    expect(storm.speed).toBeLessThanOrEqual(2.5)
    vi.restoreAllMocks()
  })

  it('连续两次触发id递增', () => {
    sys.update(1, world, em, 1600)
    sys.update(1, world, em, 3200)
    const storms = (sys as any).storms
    if (storms.length >= 2) {
      expect(storms[1].id).toBeGreaterThan(storms[0].id)
    }
    vi.restoreAllMocks()
  })
})

describe('WorldSandstormSystem - update数值逻辑', () => {
  let sys: WorldSandstormSystem
  let world: any
  let em: any
  beforeEach(() => {
    sys = makeSys()
    world = makeWorld(3)
    em = makeEM()
    stormIdCounter = 1
  })

  it('update后x沿direction移动（cos*speed）', () => {
    const storm: Sandstorm = { id: 1, x: 50, y: 50, radius: 10, severity: 'mild', direction: 0, speed: 2, damage: 10, tick: 0 }
    ;(sys as any).storms.push(storm)
    ;(sys as any).lastCheck = -1600 // 使下次tick触发
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // random=0.5: (0.5-0.5)*0.1=0 direction不变
    sys.update(1, world, em, 1600)
    // x += cos(0)*2 = 52
    expect((sys as any).storms[0].x).toBeCloseTo(52, 5)
    vi.restoreAllMocks()
  })

  it('update后y沿direction移动（sin*speed）', () => {
    const storm: Sandstorm = { id: 1, x: 50, y: 50, radius: 10, severity: 'mild', direction: 0, speed: 2, damage: 10, tick: 0 }
    ;(sys as any).storms.push(storm)
    ;(sys as any).lastCheck = -1600
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, em, 1600)
    // y += sin(0)*2 = 0, so y stays 50
    expect((sys as any).storms[0].y).toBeCloseTo(50, 5)
    vi.restoreAllMocks()
  })

  it('update后direction因随机游走改变', () => {
    const dir0 = Math.PI / 4
    const storm: Sandstorm = { id: 1, x: 50, y: 50, radius: 10, severity: 'mild', direction: dir0, speed: 1, damage: 10, tick: 0 }
    ;(sys as any).storms.push(storm)
    ;(sys as any).lastCheck = -1600
    vi.spyOn(Math, 'random').mockReturnValue(0) // (0-0.5)*0.1 = -0.05
    sys.update(1, world, em, 1600)
    const newDir = (sys as any).storms[0].direction
    expect(newDir).toBeCloseTo(dir0 - 0.05, 5)
    vi.restoreAllMocks()
  })

  it('多个storm都被update（x都移动）', () => {
    const s1: Sandstorm = { id: 1, x: 10, y: 10, radius: 5, severity: 'mild', direction: 0, speed: 1, damage: 10, tick: 0 }
    const s2: Sandstorm = { id: 2, x: 20, y: 20, radius: 5, severity: 'mild', direction: 0, speed: 1, damage: 10, tick: 0 }
    ;(sys as any).storms.push(s1, s2)
    ;(sys as any).lastCheck = -1600
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, em, 1600)
    expect((sys as any).storms[0].x).toBeCloseTo(11, 4)
    expect((sys as any).storms[1].x).toBeCloseTo(21, 4)
    vi.restoreAllMocks()
  })

  it('speed=0时x不移动', () => {
    const storm: Sandstorm = { id: 1, x: 50, y: 50, radius: 10, severity: 'mild', direction: 0, speed: 0, damage: 10, tick: 0 }
    ;(sys as any).storms.push(storm)
    ;(sys as any).lastCheck = -1600
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, em, 1600)
    expect((sys as any).storms[0].x).toBeCloseTo(50, 5)
    vi.restoreAllMocks()
  })

  it('random=1时direction增加0.05', () => {
    const dir0 = 1.0
    const storm: Sandstorm = { id: 1, x: 50, y: 50, radius: 10, severity: 'mild', direction: dir0, speed: 1, damage: 10, tick: 0 }
    ;(sys as any).storms.push(storm)
    ;(sys as any).lastCheck = -1600
    vi.spyOn(Math, 'random').mockReturnValue(1) // (1-0.5)*0.1=0.05
    sys.update(1, world, em, 1600)
    expect((sys as any).storms[0].direction).toBeCloseTo(dir0 + 0.05, 5)
    vi.restoreAllMocks()
  })

  it('tick不足时update不执行', () => {
    const storm: Sandstorm = { id: 1, x: 50, y: 50, radius: 10, severity: 'mild', direction: 0, speed: 5, damage: 10, tick: 0 }
    ;(sys as any).storms.push(storm)
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 500) // 500-0=500 < 1600
    expect((sys as any).storms[0].x).toBe(50)
  })

  it('tick恰好足够时update执行', () => {
    const storm: Sandstorm = { id: 1, x: 50, y: 50, radius: 10, severity: 'mild', direction: 0, speed: 2, damage: 10, tick: 0 }
    ;(sys as any).storms.push(storm)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, em, 1600)
    expect((sys as any).storms[0].x).toBeCloseTo(52, 5)
    vi.restoreAllMocks()
  })
})

describe('WorldSandstormSystem - cleanup逻辑', () => {
  let sys: WorldSandstormSystem
  let world: any
  let em: any
  beforeEach(() => {
    sys = makeSys()
    world = makeWorld(null) // null tile：不spawn新storm
    em = makeEM()
    stormIdCounter = 1
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })

  it('tick=14000时cutoff=2000，storm.tick=1999被删除', () => {
    ;(sys as any).storms.push({ ...makeStorm('mild', 1999) })
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 14000)
    expect((sys as any).storms).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tick=14000时cutoff=2000，storm.tick=2000不被删除（不小于cutoff）', () => {
    ;(sys as any).storms.push({ ...makeStorm('mild', 2000) })
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 14000)
    expect((sys as any).storms).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('storm.tick=cutoff-1被删除', () => {
    ;(sys as any).storms.push({ ...makeStorm('mild', 0) })
    ;(sys as any).lastCheck = 0
    // tick=13000 => cutoff=1000, storm.tick=0 < 1000 => 删除
    sys.update(1, world, em, 13000)
    expect((sys as any).storms).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('storm.tick等于cutoff时保留', () => {
    // tick=13000 => cutoff=1000, storm.tick=1000 => 不删除
    ;(sys as any).storms.push({ ...makeStorm('mild', 1000) })
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 13000)
    expect((sys as any).storms).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('新旧混合：旧的删除新的保留', () => {
    // tick=20000 => cutoff=8000
    ;(sys as any).storms.push({ ...makeStorm('mild', 100) }) // 旧：tick=100 < 8000 => 删除
    ;(sys as any).storms.push({ ...makeStorm('mild', 9000) }) // 新：tick=9000 >= 8000 => 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 20000)
    expect((sys as any).storms).toHaveLength(1)
    expect((sys as any).storms[0].tick).toBe(9000)
    vi.restoreAllMocks()
  })

  it('全部storm都太旧时清空数组', () => {
    ;(sys as any).storms.push({ ...makeStorm('mild', 0) })
    ;(sys as any).storms.push({ ...makeStorm('mild', 1) })
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 15000) // cutoff=3000, 0<3000,1<3000 => 全删
    expect((sys as any).storms).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('3个storm：2个旧1个新，清理后剩1个', () => {
    // tick=20000 => cutoff=8000
    ;(sys as any).storms.push({ ...makeStorm('mild', 1000) }) // < 8000 删
    ;(sys as any).storms.push({ ...makeStorm('mild', 2000) }) // < 8000 删
    ;(sys as any).storms.push({ ...makeStorm('mild', 10000) }) // >= 8000 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 20000)
    expect((sys as any).storms).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('tick不足时cleanup不执行', () => {
    ;(sys as any).storms.push({ ...makeStorm('mild', 0) })
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 500) // 500-0=500 < 1600，不执行
    expect((sys as any).storms).toHaveLength(1)
    vi.restoreAllMocks()
  })
})
