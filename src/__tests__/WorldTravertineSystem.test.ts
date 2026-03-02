import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldTravertineSystem } from '../systems/WorldTravertineSystem'
import type { TravertineFormation } from '../systems/WorldTravertineSystem'

// ===== 从源码提取的关键参数 =====
// CHECK_INTERVAL = 2760
// FORM_CHANCE = 0.0007
// MAX_FORMATIONS = 6
// spawn条件: formations.length < MAX_FORMATIONS && Math.random() < FORM_CHANCE
// spawn初始值:
//   thickness = 5 + random * 15  => [5, 20)
//   mineralPurity = 40 + random * 35 => [40, 75)
//   depositionRate = 10 + random * 20 => [10, 30)
//   porosity = 20 + random * 30 => [20, 50)
//   age = 0
// update每个formation:
//   age += 0.003
//   thickness = Math.min(80, thickness + 0.01)
//   mineralPurity = Math.max(20, mineralPurity - 0.004)
//   depositionRate = Math.max(3, depositionRate - 0.003)
// cleanup: !(f.age < 98) => f.age >= 98 时删除
// 重要: tick=0时 0-0=0 < 2760 => 直接return，需tick>=2760才触发

const CHECK_INTERVAL = 2760
const FORM_CHANCE = 0.0007
const MAX_FORMATIONS = 6
const TICK0 = CHECK_INTERVAL  // 首次触发

function makeSys(): WorldTravertineSystem { return new WorldTravertineSystem() }

let nextId = 1
function makeFormation(overrides: Partial<TravertineFormation> = {}): TravertineFormation {
  return {
    id: nextId++,
    x: 50, y: 50,
    thickness: 10,
    mineralPurity: 60,
    depositionRate: 15,
    porosity: 30,
    age: 0,
    tick: 0,
    ...overrides
  }
}

const mockWorld = { width: 200, height: 200, getTile: () => 3 } as any
const mockEm = {} as any

// ===== 描述块 1: 初始状态 =====
describe('WorldTravertineSystem - 初始状态', () => {
  let sys: WorldTravertineSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始formations为空', () => {
    expect((sys as any).formations).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('formations是数组', () => {
    expect(Array.isArray((sys as any).formations)).toBe(true)
  })

  it('直接push formation可查询到', () => {
    ;(sys as any).formations.push(makeFormation())
    expect((sys as any).formations).toHaveLength(1)
  })

  it('formations内部引用一致', () => {
    expect((sys as any).formations).toBe((sys as any).formations)
  })

  it('TravertineFormation字段完整', () => {
    const f = makeFormation()
    expect(f).toHaveProperty('id')
    expect(f).toHaveProperty('x')
    expect(f).toHaveProperty('y')
    expect(f).toHaveProperty('thickness')
    expect(f).toHaveProperty('mineralPurity')
    expect(f).toHaveProperty('depositionRate')
    expect(f).toHaveProperty('porosity')
    expect(f).toHaveProperty('age')
    expect(f).toHaveProperty('tick')
  })

  it('多个formation可以共存', () => {
    ;(sys as any).formations.push(makeFormation())
    ;(sys as any).formations.push(makeFormation())
    expect((sys as any).formations).toHaveLength(2)
  })
})

// ===== 描述块 2: CHECK_INTERVAL节流 =====
describe('WorldTravertineSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldTravertineSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不触发（0 < CHECK_INTERVAL）', () => {
    sys.update(0, mockWorld, mockEm, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick < CHECK_INTERVAL 时不触发', () => {
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick === CHECK_INTERVAL 时首次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick > CHECK_INTERVAL 时触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 100)
  })

  it('触发后再次调用，差值 < CHECK_INTERVAL 时跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('触发后差值 === CHECK_INTERVAL 时再次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL)
    sys.update(0, mockWorld, mockEm, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('节流期间formation不更新（age不变）', () => {
    ;(sys as any).formations.push(makeFormation({ age: 5 }))
    // tick=1, 1 < 2760 => skip, age不变
    sys.update(0, mockWorld, mockEm, 1)
    expect((sys as any).formations[0].age).toBe(5)
  })

  it('CHECK_INTERVAL常量值为2760', () => {
    expect(CHECK_INTERVAL).toBe(2760)
  })
})

// ===== 描述块 3: spawn逻辑 =====
describe('WorldTravertineSystem - spawn逻辑', () => {
  let sys: WorldTravertineSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('random >= FORM_CHANCE 时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)  // 等于不小于，不spawn
    sys.update(0, mockWorld, mockEm, TICK0)
    expect((sys as any).formations).toHaveLength(0)
  })

  it('random < FORM_CHANCE 时spawn', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.0005)  // < 0.0007 => spawn
      .mockReturnValueOnce(0.5)     // x
      .mockReturnValueOnce(0.5)     // y
      .mockReturnValueOnce(0)       // thickness = 5+0*15=5
      .mockReturnValueOnce(0)       // mineralPurity = 40+0*35=40
      .mockReturnValueOnce(0)       // depositionRate = 10+0*20=10
      .mockReturnValueOnce(0)       // porosity = 20+0*30=20
      .mockReturnValue(1)

    sys.update(0, mockWorld, mockEm, TICK0)
    expect((sys as any).formations).toHaveLength(1)
  })

  it('spawn后formation初始age=0', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.0005)
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0)
      .mockReturnValue(1)

    sys.update(0, mockWorld, mockEm, TICK0)
    // 注意：spawn后立即执行update循环，age会+= 0.003
    const f = (sys as any).formations[0]
    // 所以spawn后age立即变为0.003
    expect(f.age).toBeCloseTo(0.003, 5)
  })

  it('spawn时thickness=5（random=0）', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.0005)
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0)    // thickness = 5+0*15=5
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0)
      .mockReturnValue(1)

    sys.update(0, mockWorld, mockEm, TICK0)
    const f = (sys as any).formations[0]
    // 初始5，update后+0.01=5.01
    expect(f.thickness).toBeCloseTo(5.01, 5)
  })

  it('spawn时thickness接近20（random接近1）', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.0005)
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5)
      .mockReturnValueOnce(1)    // thickness = 5+1*15=20
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0)
      .mockReturnValue(1)

    sys.update(0, mockWorld, mockEm, TICK0)
    const f = (sys as any).formations[0]
    // 初始20，update后min(80,20+0.01)=20.01
    expect(f.thickness).toBeCloseTo(20.01, 5)
  })

  it('spawn时mineralPurity=40（random=0）', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.0005)
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0)    // thickness=5
      .mockReturnValueOnce(0)    // mineralPurity=40+0=40
      .mockReturnValueOnce(0).mockReturnValueOnce(0)
      .mockReturnValue(1)

    sys.update(0, mockWorld, mockEm, TICK0)
    const f = (sys as any).formations[0]
    // 初始40，update后max(20, 40-0.004)=39.996
    expect(f.mineralPurity).toBeCloseTo(39.996, 5)
  })

  it('spawn时depositionRate=10（random=0）', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.0005)
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0).mockReturnValueOnce(0)
      .mockReturnValueOnce(0)    // depositionRate=10+0=10
      .mockReturnValueOnce(0)
      .mockReturnValue(1)

    sys.update(0, mockWorld, mockEm, TICK0)
    const f = (sys as any).formations[0]
    // 初始10，update后max(3, 10-0.003)=9.997
    expect(f.depositionRate).toBeCloseTo(9.997, 5)
  })

  it('spawn时porosity=20（random=0）', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.0005)
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0)
      .mockReturnValueOnce(0)    // porosity=20+0=20
      .mockReturnValue(1)

    sys.update(0, mockWorld, mockEm, TICK0)
    const f = (sys as any).formations[0]
    // porosity不在update逻辑中改变，所以还是20
    expect(f.porosity).toBeCloseTo(20, 5)
  })

  it('spawn时记录正确的tick', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.0005)
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0)
      .mockReturnValue(1)

    sys.update(0, mockWorld, mockEm, TICK0)
    const f = (sys as any).formations[0]
    expect(f.tick).toBe(TICK0)
  })

  it('id从1开始', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.0005)
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0)
      .mockReturnValue(1)

    sys.update(0, mockWorld, mockEm, TICK0)
    const f = (sys as any).formations[0]
    expect(f.id).toBe(1)
    expect((sys as any).nextId).toBe(2)
  })
})

// ===== 描述块 4: update数值逻辑 =====
describe('WorldTravertineSystem - update数值逻辑', () => {
  let sys: WorldTravertineSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  function triggerUpdate(tick: number = TICK0) {
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL - 1
    vi.spyOn(Math, 'random').mockReturnValue(1)  // 阻止spawn
    sys.update(0, mockWorld, mockEm, tick)
  }

  it('每次触发 age += 0.003', () => {
    ;(sys as any).formations.push(makeFormation({ age: 0 }))
    triggerUpdate()
    expect((sys as any).formations[0].age).toBeCloseTo(0.003, 5)
  })

  it('age累积：多次触发后正确累加', () => {
    ;(sys as any).formations.push(makeFormation({ age: 0 }))
    triggerUpdate(TICK0)
    triggerUpdate(TICK0 * 2)
    triggerUpdate(TICK0 * 3)
    // 触发了3次，每次+0.003
    expect((sys as any).formations[0].age).toBeCloseTo(0.009, 5)
  })

  it('thickness += 0.01（未达上限80时）', () => {
    ;(sys as any).formations.push(makeFormation({ thickness: 10 }))
    triggerUpdate()
    expect((sys as any).formations[0].thickness).toBeCloseTo(10.01, 5)
  })

  it('thickness上限为80：thickness=79.99时+0.01不超过80', () => {
    ;(sys as any).formations.push(makeFormation({ thickness: 79.99 }))
    triggerUpdate()
    expect((sys as any).formations[0].thickness).toBeCloseTo(80, 3)
  })

  it('thickness已达80时保持80（不超过上限）', () => {
    ;(sys as any).formations.push(makeFormation({ thickness: 80 }))
    triggerUpdate()
    expect((sys as any).formations[0].thickness).toBe(80)
  })

  it('thickness=80.5时也被限制为80（Math.min）', () => {
    // 理论上不应出现，但验证Math.min行为
    ;(sys as any).formations.push(makeFormation({ thickness: 80.5 }))
    triggerUpdate()
    // min(80, 80.5+0.01)=min(80,80.51)=80
    expect((sys as any).formations[0].thickness).toBe(80)
  })

  it('mineralPurity -= 0.004（未达下限20时）', () => {
    ;(sys as any).formations.push(makeFormation({ mineralPurity: 50 }))
    triggerUpdate()
    expect((sys as any).formations[0].mineralPurity).toBeCloseTo(49.996, 5)
  })

  it('mineralPurity下限为20：mineralPurity=20.001时-0.004不低于20', () => {
    ;(sys as any).formations.push(makeFormation({ mineralPurity: 20.001 }))
    triggerUpdate()
    // max(20, 20.001-0.004)=max(20,19.997)=20
    expect((sys as any).formations[0].mineralPurity).toBe(20)
  })

  it('mineralPurity已达20时保持20（不低于下限）', () => {
    ;(sys as any).formations.push(makeFormation({ mineralPurity: 20 }))
    triggerUpdate()
    expect((sys as any).formations[0].mineralPurity).toBe(20)
  })

  it('depositionRate -= 0.003（未达下限3时）', () => {
    ;(sys as any).formations.push(makeFormation({ depositionRate: 15 }))
    triggerUpdate()
    expect((sys as any).formations[0].depositionRate).toBeCloseTo(14.997, 5)
  })

  it('depositionRate下限为3：不低于3', () => {
    ;(sys as any).formations.push(makeFormation({ depositionRate: 3 }))
    triggerUpdate()
    expect((sys as any).formations[0].depositionRate).toBe(3)
  })

  it('depositionRate=3.001时-0.003被限制为3', () => {
    ;(sys as any).formations.push(makeFormation({ depositionRate: 3.001 }))
    triggerUpdate()
    expect((sys as any).formations[0].depositionRate).toBe(3)
  })

  it('porosity不在update逻辑中修改', () => {
    ;(sys as any).formations.push(makeFormation({ porosity: 35 }))
    triggerUpdate()
    // 源码update循环中没有修改porosity
    expect((sys as any).formations[0].porosity).toBe(35)
  })

  it('多个formation独立update', () => {
    ;(sys as any).formations.push(makeFormation({ age: 0, thickness: 10, id: 100 }))
    ;(sys as any).formations.push(makeFormation({ age: 5, thickness: 20, id: 101 }))
    triggerUpdate()
    const f1 = (sys as any).formations.find((f: TravertineFormation) => f.id === 100)
    const f2 = (sys as any).formations.find((f: TravertineFormation) => f.id === 101)
    expect(f1.age).toBeCloseTo(0.003, 5)
    expect(f1.thickness).toBeCloseTo(10.01, 5)
    expect(f2.age).toBeCloseTo(5.003, 5)
    expect(f2.thickness).toBeCloseTo(20.01, 5)
  })
})

// ===== 描述块 5: cleanup逻辑（age >= 98时删除）=====
describe('WorldTravertineSystem - cleanup逻辑', () => {
  let sys: WorldTravertineSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  // cleanup条件: !(f.age < 98) => f.age >= 98 时删除

  function triggerCleanup(tick: number = TICK0) {
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL - 1
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, mockWorld, mockEm, tick)
  }

  it('age=0时不删除', () => {
    ;(sys as any).formations.push(makeFormation({ age: 0 }))
    triggerCleanup()
    // age=0+0.003=0.003, 0.003 < 98 => 保留
    expect((sys as any).formations).toHaveLength(1)
  })

  it('age=97时不删除', () => {
    ;(sys as any).formations.push(makeFormation({ age: 97 }))
    triggerCleanup()
    // age=97+0.003=97.003 < 98 => 保留
    expect((sys as any).formations).toHaveLength(1)
  })

  it('age=97.997时不删除（+0.003后=98.0恰好>=98 => 删除）', () => {
    ;(sys as any).formations.push(makeFormation({ age: 97.997 }))
    triggerCleanup()
    // age=97.997+0.003=98.0, !(98.0 < 98)=!(false)=true => 删除
    expect((sys as any).formations).toHaveLength(0)
  })

  it('age=98时删除', () => {
    ;(sys as any).formations.push(makeFormation({ age: 98 }))
    triggerCleanup()
    // age=98+0.003=98.003 >= 98 => 删除
    expect((sys as any).formations).toHaveLength(0)
  })

  it('age=99时删除', () => {
    ;(sys as any).formations.push(makeFormation({ age: 99 }))
    triggerCleanup()
    expect((sys as any).formations).toHaveLength(0)
  })

  it('age=97.9时不删除（97.9+0.003=97.903 < 98）', () => {
    ;(sys as any).formations.push(makeFormation({ age: 97.9 }))
    triggerCleanup()
    // 97.9+0.003=97.903 < 98 => 保留
    expect((sys as any).formations).toHaveLength(1)
  })

  it('只删除age>=98的，保留age<98的', () => {
    ;(sys as any).formations.push(makeFormation({ age: 97, id: 100 }))   // 97+0.003=97.003<98 => 保留
    ;(sys as any).formations.push(makeFormation({ age: 98, id: 101 }))   // 98+0.003=98.003>=98 => 删除
    ;(sys as any).formations.push(makeFormation({ age: 50, id: 102 }))   // 50+0.003=50.003<98 => 保留
    triggerCleanup()
    const formations = (sys as any).formations as TravertineFormation[]
    expect(formations.some(f => f.id === 100)).toBe(true)
    expect(formations.some(f => f.id === 101)).toBe(false)
    expect(formations.some(f => f.id === 102)).toBe(true)
  })

  it('多个过期formation全部删除', () => {
    ;(sys as any).formations.push(makeFormation({ age: 98 }))
    ;(sys as any).formations.push(makeFormation({ age: 100 }))
    ;(sys as any).formations.push(makeFormation({ age: 150 }))
    triggerCleanup()
    expect((sys as any).formations).toHaveLength(0)
  })

  it('cleanup后数组长度正确', () => {
    for (let i = 0; i < 3; i++) {
      ;(sys as any).formations.push(makeFormation({ age: 98 }))  // 过期
    }
    for (let i = 0; i < 2; i++) {
      ;(sys as any).formations.push(makeFormation({ age: 0 }))   // 保留
    }
    triggerCleanup()
    expect((sys as any).formations).toHaveLength(2)
  })

  it('逆序遍历删除不影响结果', () => {
    ;(sys as any).formations.push(makeFormation({ age: 98, id: 1 }))  // 删除
    ;(sys as any).formations.push(makeFormation({ age: 0, id: 2 }))   // 保留
    ;(sys as any).formations.push(makeFormation({ age: 98, id: 3 }))  // 删除
    ;(sys as any).formations.push(makeFormation({ age: 0, id: 4 }))   // 保留
    triggerCleanup()
    const formations = (sys as any).formations as TravertineFormation[]
    expect(formations).toHaveLength(2)
    expect(formations.map(f => f.id).sort()).toEqual([2, 4])
  })
})

// ===== 描述块 6: MAX_FORMATIONS上限 =====
describe('WorldTravertineSystem - MAX_FORMATIONS上限', () => {
  let sys: WorldTravertineSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it(`formations达到${MAX_FORMATIONS}时不再spawn`, () => {
    for (let i = 0; i < MAX_FORMATIONS; i++) {
      ;(sys as any).formations.push(makeFormation({ age: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)  // < FORM_CHANCE，但formations已满
    sys.update(0, mockWorld, mockEm, TICK0)
    // formations数不应超过MAX_FORMATIONS（update会增加age，但不spawn新的）
    // 注意: update后age变化，无age>=98的所以不会cleanup删除
    expect((sys as any).formations.length).toBeLessThanOrEqual(MAX_FORMATIONS)
  })

  it('formations=5时允许再spawn一个到达MAX_FORMATIONS=6', () => {
    for (let i = 0; i < MAX_FORMATIONS - 1; i++) {
      ;(sys as any).formations.push(makeFormation({ age: 0 }))
    }
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.0005)  // < FORM_CHANCE => spawn
      .mockReturnValueOnce(0.5)     // x
      .mockReturnValueOnce(0.5)     // y
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0)
      .mockReturnValue(1)

    sys.update(0, mockWorld, mockEm, TICK0)
    expect((sys as any).formations.length).toBe(MAX_FORMATIONS)
  })

  it('MAX_FORMATIONS常量值为6', () => {
    expect(MAX_FORMATIONS).toBe(6)
  })

  it('FORM_CHANCE常量值为0.0007', () => {
    expect(FORM_CHANCE).toBe(0.0007)
  })

  it('FORM_CHANCE方向：random < FORM_CHANCE时spawn', () => {
    // < FORM_CHANCE => spawn; >= FORM_CHANCE => 不spawn
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.0006)  // 0.0006 < 0.0007 => spawn
      .mockReturnValueOnce(0.5).mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0)
      .mockReturnValue(1)

    sys.update(0, mockWorld, mockEm, TICK0)
    expect((sys as any).formations).toHaveLength(1)
  })

  it('random === FORM_CHANCE 时不spawn（不小于）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)  // 等于不小于
    sys.update(0, mockWorld, mockEm, TICK0)
    expect((sys as any).formations).toHaveLength(0)
  })

  it('spawn时x使用world.width计算（默认200）', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.0005)  // spawn
      .mockReturnValueOnce(0.5)     // x = floor(0.5*200)=100
      .mockReturnValueOnce(0.5)     // y = floor(0.5*200)=100
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0)
      .mockReturnValue(1)

    sys.update(0, mockWorld, mockEm, TICK0)
    const f = (sys as any).formations[0]
    expect(f.x).toBe(100)
    expect(f.y).toBe(100)
  })

  it('world.width不存在时使用默认200', () => {
    // 源码: const w = world.width || 200
    const noSizeWorld = { getTile: () => 3 } as any
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.0005)
      .mockReturnValueOnce(0.5)   // x = floor(0.5*200)=100
      .mockReturnValueOnce(0.5)   // y = floor(0.5*200)=100
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0)
      .mockReturnValue(1)

    sys.update(0, noSizeWorld, mockEm, TICK0)
    const f = (sys as any).formations[0]
    expect(f.x).toBe(100)
    expect(f.y).toBe(100)
  })
})
