import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldIrrigationSystem } from '../systems/WorldIrrigationSystem'
import type { IrrigationChannel, ChannelState } from '../systems/WorldIrrigationSystem'

const CHECK_INTERVAL = 3000
const MAX_CHANNELS = 25
const SILT_RATE = 0.2

function makeSys(): WorldIrrigationSystem { return new WorldIrrigationSystem() }
let nextId = 1
function makeChannel(overrides: Partial<IrrigationChannel> = {}): IrrigationChannel {
  return {
    id: nextId++,
    startX: 0, startY: 0,
    endX: 10, endY: 10,
    state: 'planned',
    flowRate: 50,
    siltLevel: 0,
    length: 10,
    tick: 0,
    ...overrides
  }
}

// 阻断spawn：tile!=3（GRASS），无法满足中心tile===3条件
function blockWorld() {
  return { width: 100, height: 100, getTile: () => 5 }
}
// null tile world，任何getTile返回null
function nullTileWorld() {
  return { width: 100, height: 100, getTile: () => null }
}
const emMock = {} as any

describe('WorldIrrigationSystem - 初始状态', () => {
  let sys: WorldIrrigationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始channels为空数组', () => {
    expect((sys as any).channels).toHaveLength(0)
  })
  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('channels是数组类型', () => {
    expect(Array.isArray((sys as any).channels)).toBe(true)
  })
  it('可以正常实例化系统', () => {
    expect(sys).toBeInstanceOf(WorldIrrigationSystem)
  })
})

describe('WorldIrrigationSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldIrrigationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick不足CHECK_INTERVAL时不执行更新', () => {
    ;(sys as any).channels.push(makeChannel({ state: 'planned' }))
    ;(sys as any).update(0, blockWorld(), emMock, CHECK_INTERVAL - 1)
    // state未发生变化
    expect((sys as any).channels[0].state).toBe('planned')
  })
  it('tick==CHECK_INTERVAL时会执行（差值不满足严格小于）', () => {
    // lastCheck=0, tick=3000: 3000-0=3000 不 < 3000，因此会执行并更新lastCheck
    ;(sys as any).update(0, blockWorld(), emMock, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('tick超过CHECK_INTERVAL时lastCheck被更新', () => {
    const tick = CHECK_INTERVAL + 1
    ;(sys as any).update(0, blockWorld(), emMock, tick)
    expect((sys as any).lastCheck).toBe(tick)
  })
  it('更新后lastCheck精确等于传入tick', () => {
    const tick = CHECK_INTERVAL * 4 + 77
    ;(sys as any).update(0, blockWorld(), emMock, tick)
    expect((sys as any).lastCheck).toBe(tick)
  })
  it('连续调用第二次在新间隔前不触发', () => {
    const tick1 = CHECK_INTERVAL + 1
    ;(sys as any).update(0, blockWorld(), emMock, tick1)
    const lc = (sys as any).lastCheck
    ;(sys as any).update(0, blockWorld(), emMock, tick1 + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(lc)
  })
  it('lastCheck被手动设置后，差值不足时不触发', () => {
    ;(sys as any).lastCheck = 10000
    ;(sys as any).channels.push(makeChannel({ state: 'planned' }))
    const before = (sys as any).channels[0].state
    ;(sys as any).update(0, blockWorld(), emMock, 10000 + CHECK_INTERVAL - 1)
    expect((sys as any).channels[0].state).toBe(before)
  })
})

describe('WorldIrrigationSystem - spawn条件（阻断）', () => {
  let sys: WorldIrrigationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tile=MOUNTAIN(5)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).update(0, blockWorld(), emMock, CHECK_INTERVAL + 1)
    vi.restoreAllMocks()
    expect((sys as any).channels).toHaveLength(0)
  })
  it('tile=null时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).update(0, nullTileWorld(), emMock, CHECK_INTERVAL + 1)
    vi.restoreAllMocks()
    expect((sys as any).channels).toHaveLength(0)
  })
  it('tile=GRASS(3)但周围无水时不spawn', () => {
    // 中心tile=3，周围getTile全返回3（非<=1），无水
    const world = { width: 100, height: 100, getTile: () => 3 }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).update(0, world, emMock, CHECK_INTERVAL + 1)
    vi.restoreAllMocks()
    expect((sys as any).channels).toHaveLength(0)
  })
  it('random>=BUILD_CHANCE(0.003)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    ;(sys as any).update(0, blockWorld(), emMock, CHECK_INTERVAL + 1)
    vi.restoreAllMocks()
    expect((sys as any).channels).toHaveLength(0)
  })
})

describe('WorldIrrigationSystem - spawn字段注入验证', () => {
  let sys: WorldIrrigationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入planned状态channel字段正确', () => {
    ;(sys as any).channels.push(makeChannel({ state: 'planned', flowRate: 0, siltLevel: 0, length: 5 }))
    const c = (sys as any).channels[0]
    expect(c.state).toBe('planned')
    expect(c.flowRate).toBe(0)
    expect(c.siltLevel).toBe(0)
    expect(c.length).toBe(5)
  })
  it('注入channel有startX/startY/endX/endY', () => {
    ;(sys as any).channels.push(makeChannel({ startX: 1, startY: 2, endX: 8, endY: 9 }))
    const c = (sys as any).channels[0]
    expect(c.startX).toBe(1)
    expect(c.startY).toBe(2)
    expect(c.endX).toBe(8)
    expect(c.endY).toBe(9)
  })
  it('4种ChannelState类型均合法', () => {
    const states: ChannelState[] = ['planned', 'digging', 'flowing', 'silted']
    expect(states).toHaveLength(4)
    for (const s of states) {
      ;(sys as any).channels.push(makeChannel({ state: s }))
    }
    expect((sys as any).channels).toHaveLength(4)
  })
  it('初始state为planned时flowRate初始为0', () => {
    ;(sys as any).channels.push(makeChannel({ state: 'planned', flowRate: 0 }))
    expect((sys as any).channels[0].flowRate).toBe(0)
  })
  it('初始state为planned时siltLevel初始为0', () => {
    ;(sys as any).channels.push(makeChannel({ state: 'planned', siltLevel: 0 }))
    expect((sys as any).channels[0].siltLevel).toBe(0)
  })
})

describe('WorldIrrigationSystem - state转换逻辑', () => {
  let sys: WorldIrrigationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('planned状态random<0.1时转变为digging', () => {
    ;(sys as any).channels.push(makeChannel({ state: 'planned' }))
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    ;(sys as any).update(0, blockWorld(), emMock, CHECK_INTERVAL + 1)
    vi.restoreAllMocks()
    expect((sys as any).channels[0].state).toBe('digging')
  })
  it('planned状态random>=0.1时保持planned', () => {
    ;(sys as any).channels.push(makeChannel({ state: 'planned' }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).update(0, blockWorld(), emMock, CHECK_INTERVAL + 1)
    vi.restoreAllMocks()
    expect((sys as any).channels[0].state).toBe('planned')
  })
  it('digging状态random<0.05时转变为flowing，并设置flowRate', () => {
    ;(sys as any).channels.push(makeChannel({ state: 'digging', flowRate: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    ;(sys as any).update(0, blockWorld(), emMock, CHECK_INTERVAL + 1)
    vi.restoreAllMocks()
    expect((sys as any).channels[0].state).toBe('flowing')
    expect((sys as any).channels[0].flowRate).toBeGreaterThanOrEqual(50)
    expect((sys as any).channels[0].flowRate).toBeLessThanOrEqual(100)
  })
  it('digging状态random>=0.05时保持digging', () => {
    ;(sys as any).channels.push(makeChannel({ state: 'digging' }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).update(0, blockWorld(), emMock, CHECK_INTERVAL + 1)
    vi.restoreAllMocks()
    expect((sys as any).channels[0].state).toBe('digging')
  })
  it('flowing状态每次siltLevel增加SILT_RATE(0.2)', () => {
    ;(sys as any).channels.push(makeChannel({ state: 'flowing', siltLevel: 10, flowRate: 60 }))
    ;(sys as any).update(0, blockWorld(), emMock, CHECK_INTERVAL + 1)
    expect((sys as any).channels[0].siltLevel).toBeCloseTo(10.2, 5)
  })
  it('flowing状态siltLevel>80时转为silted', () => {
    ;(sys as any).channels.push(makeChannel({ state: 'flowing', siltLevel: 80.5, flowRate: 60 }))
    ;(sys as any).update(0, blockWorld(), emMock, CHECK_INTERVAL + 1)
    expect((sys as any).channels[0].state).toBe('silted')
  })
  it('flowing状态flowRate随siltLevel增加而减小，下限为5', () => {
    // siltLevel很大时flowRate应不低于5
    ;(sys as any).channels.push(makeChannel({ state: 'flowing', siltLevel: 9000, flowRate: 5 }))
    ;(sys as any).update(0, blockWorld(), emMock, CHECK_INTERVAL + 1)
    expect((sys as any).channels[0].flowRate).toBeGreaterThanOrEqual(5)
  })
  it('silted状态random<0.02时恢复flowing，siltLevel重置为10', () => {
    ;(sys as any).channels.push(makeChannel({ state: 'silted', siltLevel: 90, flowRate: 5 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    ;(sys as any).update(0, blockWorld(), emMock, CHECK_INTERVAL + 1)
    vi.restoreAllMocks()
    expect((sys as any).channels[0].state).toBe('flowing')
    expect((sys as any).channels[0].siltLevel).toBe(10)
    expect((sys as any).channels[0].flowRate).toBeGreaterThanOrEqual(30)
    expect((sys as any).channels[0].flowRate).toBeLessThanOrEqual(60)
  })
  it('silted状态random>=0.02时保持silted', () => {
    ;(sys as any).channels.push(makeChannel({ state: 'silted', siltLevel: 90 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).update(0, blockWorld(), emMock, CHECK_INTERVAL + 1)
    vi.restoreAllMocks()
    expect((sys as any).channels[0].state).toBe('silted')
  })
})

describe('WorldIrrigationSystem - MAX_CHANNELS上限', () => {
  let sys: WorldIrrigationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('达到MAX_CHANNELS(25)后不再spawn', () => {
    for (let i = 0; i < MAX_CHANNELS; i++) {
      ;(sys as any).channels.push(makeChannel())
    }
    const world = {
      width: 100, height: 100,
      getTile: (x: number, y: number) => {
        if (x === 50 && y === 50) return 3
        if (Math.abs(x - 50) <= 1 && Math.abs(y - 50) <= 1) return 1
        return 3
      }
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).update(0, world, emMock, CHECK_INTERVAL + 1)
    vi.restoreAllMocks()
    expect((sys as any).channels).toHaveLength(MAX_CHANNELS)
  })
  it('MAX_CHANNELS常量为25', () => {
    expect(MAX_CHANNELS).toBe(25)
  })
})

describe('WorldIrrigationSystem - cleanup过期记录', () => {
  let sys: WorldIrrigationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick-200000之前的channel被清除（严格小于cutoff）', () => {
    const tick = 300000
    ;(sys as any).channels.push(makeChannel({ tick: tick - 200001 }))
    ;(sys as any).update(0, blockWorld(), emMock, tick)
    expect((sys as any).channels).toHaveLength(0)
  })
  it('tick-200000之后的channel不被清除', () => {
    const tick = 300000
    ;(sys as any).channels.push(makeChannel({ tick: tick - 199999 }))
    ;(sys as any).update(0, blockWorld(), emMock, tick)
    expect((sys as any).channels).toHaveLength(1)
  })
  it('恰好在cutoff(tick-200000)处的channel不被清除（严格小于，等于不删）', () => {
    // cutoff = tick - 200000; 条件 channel.tick < cutoff
    // 当 channel.tick == cutoff 时不满足严格小于，不删除
    const tick = 300000
    ;(sys as any).channels.push(makeChannel({ tick: tick - 200000 }))
    ;(sys as any).update(0, blockWorld(), emMock, tick)
    expect((sys as any).channels).toHaveLength(1)
  })
  it('混合新旧channel，只清除旧的', () => {
    const tick = 300000
    ;(sys as any).channels.push(makeChannel({ tick: tick - 200001 })) // old
    ;(sys as any).channels.push(makeChannel({ tick: tick - 1000 }))   // new
    ;(sys as any).update(0, blockWorld(), emMock, tick)
    expect((sys as any).channels).toHaveLength(1)
  })
  it('清除后剩余channel状态完整', () => {
    const tick = 300000
    ;(sys as any).channels.push(makeChannel({ tick: tick - 200001, state: 'flowing' })) // old
    ;(sys as any).channels.push(makeChannel({ tick: tick - 100, state: 'silted' }))     // new
    ;(sys as any).update(0, blockWorld(), emMock, tick)
    expect((sys as any).channels[0].state).toBe('silted')
  })
  it('全部过期时清空数组', () => {
    const tick = 300000
    ;(sys as any).channels.push(makeChannel({ tick: tick - 200001 }))
    ;(sys as any).channels.push(makeChannel({ tick: tick - 300000 }))
    ;(sys as any).update(0, blockWorld(), emMock, tick)
    expect((sys as any).channels).toHaveLength(0)
  })
})
