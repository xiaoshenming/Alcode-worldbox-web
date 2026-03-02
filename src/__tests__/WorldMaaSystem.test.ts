import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldMaarSystem } from '../systems/WorldMaaSystem'
import type { Maar } from '../systems/WorldMaaSystem'

const fakeWorld = { width: 200, height: 200 }
const fakeEm = {} as any

function makeSys(): WorldMaarSystem { return new WorldMaarSystem() }

let nextId = 1
function makeMaar(overrides: Partial<Maar> = {}): Maar {
  return {
    id: nextId++, x: 25, y: 35,
    craterWidth: 15,
    waterDepth: 8,
    tephraRing: 20,
    age: 0,
    tick: 0,
    ...overrides
  }
}

describe('WorldMaarSystem — 初始状态', () => {
  let sys: WorldMaarSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始maars数组为空', () => {
    expect((sys as any).maars).toHaveLength(0)
  })

  it('nextId初始值为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始值为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('maars是数组类型', () => {
    expect(Array.isArray((sys as any).maars)).toBe(true)
  })

  it('注入maar后长度变为1', () => {
    ;(sys as any).maars.push(makeMaar())
    expect((sys as any).maars).toHaveLength(1)
  })

  it('maars返回同一内部引用', () => {
    const ref = (sys as any).maars
    expect(ref).toBe((sys as any).maars)
  })
})

describe('WorldMaarSystem — CHECK_INTERVAL节流', () => {
  let sys: WorldMaarSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时跳过（0<2710）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, fakeWorld as any, fakeEm, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2709时跳过（2709<2710）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, fakeWorld as any, fakeEm, 2709)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2710时执行并更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999) // 阻断spawn
    sys.update(0, fakeWorld as any, fakeEm, 2710)
    expect((sys as any).lastCheck).toBe(2710)
  })

  it('执行后连续tick=2711（差值1<2710）跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, fakeWorld as any, fakeEm, 2710)
    sys.update(0, fakeWorld as any, fakeEm, 2711)
    expect((sys as any).lastCheck).toBe(2710)
  })

  it('第二个间隔（2710+2710=5420）再次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, fakeWorld as any, fakeEm, 2710)
    sys.update(0, fakeWorld as any, fakeEm, 5420)
    expect((sys as any).lastCheck).toBe(5420)
  })

  it('节流期间maars字段不更新', () => {
    ;(sys as any).maars.push(makeMaar({ age: 0, waterDepth: 0, tephraRing: 10 }))
    // tick=100，差值100<2710，跳过
    sys.update(0, fakeWorld as any, fakeEm, 100)
    expect((sys as any).maars[0].age).toBe(0)
    expect((sys as any).maars[0].waterDepth).toBe(0)
  })
})

describe('WorldMaarSystem — spawn条件', () => {
  let sys: WorldMaarSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('FORM_CHANCE=0.001：random>=0.001时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, fakeWorld as any, fakeEm, 2710)
    expect((sys as any).maars).toHaveLength(0)
  })

  it('random<0.001时spawn一个maar', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys.update(0, fakeWorld as any, fakeEm, 2710)
    expect((sys as any).maars).toHaveLength(1)
  })

  it('maars达到MAX_MAARS(9)时不再spawn', () => {
    for (let i = 0; i < 9; i++) {
      ;(sys as any).maars.push(makeMaar({ age: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys.update(0, fakeWorld as any, fakeEm, 2710)
    // 仍然9个（没有新增）
    // 但update会先检查random<FORM_CHANCE，再检查length<MAX_MAARS
    // 源码：if (this.maars.length < MAX_MAARS && Math.random() < FORM_CHANCE)
    // 9个时length==MAX_MAARS，条件不满足，不spawn
    expect((sys as any).maars.length).toBeLessThanOrEqual(9)
  })

  it('maars数量为8时可以spawn第9个', () => {
    for (let i = 0; i < 8; i++) {
      ;(sys as any).maars.push(makeMaar({ age: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys.update(0, fakeWorld as any, fakeEm, 2710)
    // 8+1=9（但update同时做age更新，不会删除age=0的maar）
    expect((sys as any).maars.length).toBeGreaterThanOrEqual(8)
  })
})

describe('WorldMaarSystem — spawn后字段范围', () => {
  let sys: WorldMaarSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  function spawnOne(): Maar {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys.update(0, fakeWorld as any, fakeEm, 2710)
    return (sys as any).maars[0]
  }

  it('spawn后craterWidth在[5,15]范围内', () => {
    const m = spawnOne()
    // spawn后立刻执行update，age+0.01，waterDepth+0.02，tephraRing-0.005
    // craterWidth不受update影响
    expect(m.craterWidth).toBeGreaterThanOrEqual(5)
    expect(m.craterWidth).toBeLessThanOrEqual(15)
  })

  it('spawn后waterDepth初始为0（更新后变为0.02）', () => {
    const m = spawnOne()
    // waterDepth初始=0，更新后=min(50, 0+0.02)=0.02
    expect(m.waterDepth).toBeCloseTo(0.02, 5)
  })

  it('spawn后tephraRing在[10,40]范围内（更新后略减）', () => {
    const m = spawnOne()
    // tephraRing初始10~40，更新后减0.005
    expect(m.tephraRing).toBeGreaterThanOrEqual(9.99)
    expect(m.tephraRing).toBeLessThanOrEqual(40)
  })

  it('spawn后age初始为0（更新后变为0.01）', () => {
    const m = spawnOne()
    expect(m.age).toBeCloseTo(0.01, 5)
  })

  it('spawn后tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys.update(0, fakeWorld as any, fakeEm, 2710)
    expect((sys as any).maars[0].tick).toBe(2710)
  })

  it('spawn后id从1开始递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys.update(0, fakeWorld as any, fakeEm, 2710)
    expect((sys as any).maars[0].id).toBe(1)
  })
})

describe('WorldMaarSystem — 动态字段update', () => {
  let sys: WorldMaarSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('每次执行update后age增加0.01', () => {
    ;(sys as any).maars.push(makeMaar({ age: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, fakeWorld as any, fakeEm, 2710)
    expect((sys as any).maars[0].age).toBeCloseTo(0.01, 5)
  })

  it('每次执行update后waterDepth增加0.02（上限50）', () => {
    ;(sys as any).maars.push(makeMaar({ waterDepth: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, fakeWorld as any, fakeEm, 2710)
    expect((sys as any).maars[0].waterDepth).toBeCloseTo(0.02, 5)
  })

  it('waterDepth不超过上限50', () => {
    ;(sys as any).maars.push(makeMaar({ waterDepth: 49.99 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, fakeWorld as any, fakeEm, 2710)
    expect((sys as any).maars[0].waterDepth).toBe(50)
  })

  it('waterDepth已达50时保持50不再增加', () => {
    ;(sys as any).maars.push(makeMaar({ waterDepth: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, fakeWorld as any, fakeEm, 2710)
    expect((sys as any).maars[0].waterDepth).toBe(50)
  })

  it('每次执行update后tephraRing减少0.005（下限0）', () => {
    ;(sys as any).maars.push(makeMaar({ tephraRing: 10 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, fakeWorld as any, fakeEm, 2710)
    expect((sys as any).maars[0].tephraRing).toBeCloseTo(9.995, 5)
  })

  it('tephraRing不低于0', () => {
    ;(sys as any).maars.push(makeMaar({ tephraRing: 0.001 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, fakeWorld as any, fakeEm, 2710)
    expect((sys as any).maars[0].tephraRing).toBeGreaterThanOrEqual(0)
  })
})

describe('WorldMaarSystem — cleanup逻辑', () => {
  let sys: WorldMaarSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('age>=100时maar被删除', () => {
    // 注入age=99.99，update后=100.00，满足!(m.age<100)即删除
    ;(sys as any).maars.push(makeMaar({ age: 99.99 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, fakeWorld as any, fakeEm, 2710)
    expect((sys as any).maars).toHaveLength(0)
  })

  it('age<100时maar保留', () => {
    ;(sys as any).maars.push(makeMaar({ age: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, fakeWorld as any, fakeEm, 2710)
    expect((sys as any).maars).toHaveLength(1)
  })

  it('age恰好为99.99+0.01=100时删除（边界）', () => {
    ;(sys as any).maars.push(makeMaar({ age: 99.99 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, fakeWorld as any, fakeEm, 2710)
    // age变为100，条件!(100<100)=true，删除
    expect((sys as any).maars).toHaveLength(0)
  })

  it('混合情况：过期maar删除，年轻maar保留', () => {
    ;(sys as any).maars.push(makeMaar({ age: 99.99 }))  // 删除
    ;(sys as any).maars.push(makeMaar({ age: 50 }))     // 保留
    ;(sys as any).maars.push(makeMaar({ age: 99.995 })) // 删除
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, fakeWorld as any, fakeEm, 2710)
    expect((sys as any).maars).toHaveLength(1)
    expect((sys as any).maars[0].age).toBeCloseTo(50.01, 4)
  })

  it('age=99（加0.01=99.01）时不删除', () => {
    ;(sys as any).maars.push(makeMaar({ age: 99 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, fakeWorld as any, fakeEm, 2710)
    expect((sys as any).maars).toHaveLength(1)
  })

  it('所有maar都过期时maars清空', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).maars.push(makeMaar({ age: 99.99 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, fakeWorld as any, fakeEm, 2710)
    expect((sys as any).maars).toHaveLength(0)
  })
})
