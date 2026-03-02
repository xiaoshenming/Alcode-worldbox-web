import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureBobbinWinderSystem } from '../systems/CreatureBobbinWinderSystem'
import type { BobbinWinder } from '../systems/CreatureBobbinWinderSystem'

// CHECK_INTERVAL=2520, RECRUIT_CHANCE=0.0019, MAX_WINDERS=13
// 技能递增: windingSpeed+0.02, tensionAccuracy+0.015, consistency+0.01
// cleanup: windingSpeed<=4 时删除

let nextId = 1
function makeSys(): CreatureBobbinWinderSystem { return new CreatureBobbinWinderSystem() }
function makeWinder(entityId: number, overrides: Partial<BobbinWinder> = {}): BobbinWinder {
  return { id: nextId++, entityId, windingSpeed: 30, tensionAccuracy: 25, threadCapacity: 20, consistency: 35, tick: 0, ...overrides }
}

describe('CreatureBobbinWinderSystem', () => {
  let sys: CreatureBobbinWinderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ── 基础数据测试 ────────────────────────────────────────────────────────────

  it('初始无绕线师', () => { expect((sys as any).winders).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).winders.push(makeWinder(1))
    expect((sys as any).winders[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).winders.push(makeWinder(1))
    expect((sys as any).winders).toBe((sys as any).winders)
  })

  it('多个全部返回', () => {
    ;(sys as any).winders.push(makeWinder(1))
    ;(sys as any).winders.push(makeWinder(2))
    expect((sys as any).winders).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const w = makeWinder(10, { windingSpeed: 80, tensionAccuracy: 75, threadCapacity: 70, consistency: 65 })
    ;(sys as any).winders.push(w)
    const r = (sys as any).winders[0]
    expect(r.windingSpeed).toBe(80)
    expect(r.tensionAccuracy).toBe(75)
    expect(r.threadCapacity).toBe(70)
    expect(r.consistency).toBe(65)
  })

  it('BobbinWinder对象拥有id字段', () => {
    const w = makeWinder(5)
    ;(sys as any).winders.push(w)
    expect((sys as any).winders[0].id).toBeDefined()
    expect(typeof (sys as any).winders[0].id).toBe('number')
  })

  it('BobbinWinder对象拥有tick字段', () => {
    const w = makeWinder(5, { tick: 5678 })
    ;(sys as any).winders.push(w)
    expect((sys as any).winders[0].tick).toBe(5678)
  })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('winders是数组类型', () => {
    expect(Array.isArray((sys as any).winders)).toBe(true)
  })

  it('三个绕线师各自entityId独立', () => {
    ;(sys as any).winders.push(makeWinder(10))
    ;(sys as any).winders.push(makeWinder(20))
    ;(sys as any).winders.push(makeWinder(30))
    const ids = (sys as any).winders.map((w: BobbinWinder) => w.entityId)
    expect(ids).toEqual([10, 20, 30])
  })

  it('注入的windingSpeed可以为0', () => {
    ;(sys as any).winders.push(makeWinder(1, { windingSpeed: 0 }))
    expect((sys as any).winders[0].windingSpeed).toBe(0)
  })

  it('注入的tensionAccuracy可以为0', () => {
    ;(sys as any).winders.push(makeWinder(1, { tensionAccuracy: 0 }))
    expect((sys as any).winders[0].tensionAccuracy).toBe(0)
  })

  it('注入的consistency可以为0', () => {
    ;(sys as any).winders.push(makeWinder(1, { consistency: 0 }))
    expect((sys as any).winders[0].consistency).toBe(0)
  })

  // ── CHECK_INTERVAL 节流 ────────────────────────────────────────────────────

  it('tick差值<CHECK_INTERVAL(2520)时不更新lastCheck', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2000)  // 2000 < 2520
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(2520)时更新lastCheck', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)  // 2520 >= 2520
    expect((sys as any).lastCheck).toBe(2520)
  })

  it('tick差值恰好等于CHECK_INTERVAL减1时跳过', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2519)  // 2519 < 2520
    expect((sys as any).lastCheck).toBe(0)
  })

  it('lastCheck=1000，tick=3520时触发（差值=2520）', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 1000
    sys.update(1, em, 3520)  // 3520-1000=2520 >= 2520
    expect((sys as any).lastCheck).toBe(3520)
  })

  it('lastCheck=1000，tick=3519时不触发（差值=2519）', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 1000
    sys.update(1, em, 3519)  // 3519-1000=2519 < 2520
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('lastCheck=5000，tick=100时不触发（差值为负）', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 5000
    sys.update(1, em, 100)  // 100-5000=-4900 < 2520
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('连续两次update且间隔足够时lastCheck更新两次', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).lastCheck).toBe(2520)
    sys.update(1, em, 5040)
    expect((sys as any).lastCheck).toBe(5040)
  })

  it('连续两次update间隔不足时第二次lastCheck不变', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).lastCheck).toBe(2520)
    sys.update(1, em, 4000)  // 4000-2520=1480 < 2520
    expect((sys as any).lastCheck).toBe(2520)
  })

  it('tick=0时不触发（差值=0）', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 0)  // 0-0=0 < 2520
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2521时触发（差值=2521>2520）', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2521)
    expect((sys as any).lastCheck).toBe(2521)
  })

  // ── 技能递增 ──────────────────────────────────────────────────────────────

  it('update后windingSpeed+0.02', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { windingSpeed: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders[0].windingSpeed).toBeCloseTo(50.02, 5)
  })

  it('update后tensionAccuracy+0.015', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { tensionAccuracy: 40 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders[0].tensionAccuracy).toBeCloseTo(40.015, 5)
  })

  it('update后consistency+0.01', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { consistency: 30 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders[0].consistency).toBeCloseTo(30.01, 5)
  })

  it('windingSpeed上限为100', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { windingSpeed: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders[0].windingSpeed).toBe(100)
  })

  it('tensionAccuracy上限为100', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { tensionAccuracy: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders[0].tensionAccuracy).toBe(100)
  })

  it('consistency上限为100', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { consistency: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders[0].consistency).toBe(100)
  })

  it('windingSpeed=100时保持100不超出', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { windingSpeed: 100 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders[0].windingSpeed).toBe(100)
  })

  it('tensionAccuracy=100时保持100不超出', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { tensionAccuracy: 100 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders[0].tensionAccuracy).toBe(100)
  })

  it('consistency=100时保持100不超出', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { consistency: 100 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders[0].consistency).toBe(100)
  })

  it('threadCapacity不在update中变化', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { threadCapacity: 55 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders[0].threadCapacity).toBe(55)
  })

  it('多个绕线师全部递增技能', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { windingSpeed: 10 }))
    ;(sys as any).winders.push(makeWinder(2, { windingSpeed: 20 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders[0].windingSpeed).toBeCloseTo(10.02, 5)
    expect((sys as any).winders[1].windingSpeed).toBeCloseTo(20.02, 5)
  })

  it('两次update各自递增一次', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { windingSpeed: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    sys.update(1, em, 5040)
    expect((sys as any).winders[0].windingSpeed).toBeCloseTo(50.04, 5)
  })

  it('技能不触发时不变（tick不足）', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { windingSpeed: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1000)  // 不触发
    expect((sys as any).winders[0].windingSpeed).toBe(50)
  })

  it('windingSpeed从5递增到5.02', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { windingSpeed: 5 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders[0].windingSpeed).toBeCloseTo(5.02, 5)
  })

  // ── cleanup: windingSpeed<=4 时删除 ──────────────────────────────────────

  it('cleanup: windingSpeed<=4时删除（先+0.02后比较，3.98+0.02=4.00<=4）', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { windingSpeed: 3.98 }))  // 3.98+0.02=4.00<=4，删除
    ;(sys as any).winders.push(makeWinder(2, { windingSpeed: 30 }))    // 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders.length).toBe(1)
    expect((sys as any).winders[0].entityId).toBe(2)
  })

  it('cleanup: windingSpeed刚好>4时保留', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { windingSpeed: 3.99 }))  // 3.99+0.02=4.01>4，保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders.length).toBe(1)
  })

  it('cleanup: 全部技能过低时清空', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { windingSpeed: 1 }))
    ;(sys as any).winders.push(makeWinder(2, { windingSpeed: 2 }))
    ;(sys as any).winders.push(makeWinder(3, { windingSpeed: 3 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders.length).toBe(0)
  })

  it('cleanup: windingSpeed=0时被删除', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { windingSpeed: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders.length).toBe(0)
  })

  it('cleanup: windingSpeed=3.98时被删除（3.98+0.02=4<=4）', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { windingSpeed: 3.98 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders.length).toBe(0)
  })

  it('cleanup: windingSpeed=4.01时保留（4.01+0.02=4.03>4）', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { windingSpeed: 4.01 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders.length).toBe(1)
  })

  it('cleanup只删除低技能的，高技能的保留顺序', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { windingSpeed: 1 }))   // 删除
    ;(sys as any).winders.push(makeWinder(2, { windingSpeed: 50 }))  // 保留
    ;(sys as any).winders.push(makeWinder(3, { windingSpeed: 2 }))   // 删除
    ;(sys as any).winders.push(makeWinder(4, { windingSpeed: 60 }))  // 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    const remaining = (sys as any).winders as BobbinWinder[]
    expect(remaining.length).toBe(2)
    expect(remaining.map(w => w.entityId)).toEqual([2, 4])
  })

  it('cleanup: windingSpeed=5时保留（5>4）', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { windingSpeed: 5 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders.length).toBe(1)
  })

  it('cleanup: 先递增后清理，windingSpeed=4时（4+0.02=4.02>4）不删除', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { windingSpeed: 4 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders.length).toBe(1)
    expect((sys as any).winders[0].windingSpeed).toBeCloseTo(4.02, 5)
  })

  it('cleanup: 3.97+0.02=3.99<=4，被删除', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { windingSpeed: 3.97 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders.length).toBe(0)
  })

  // ── 随机招募 ──────────────────────────────────────────────────────────────

  it('random=0.5时不招募（0.5>=RECRUIT_CHANCE=0.0019）', () => {
    const em = {} as any
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders.length).toBe(0)
  })

  it('random=0时招募一个绕线师', () => {
    const em = {} as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders.length).toBe(1)
  })

  it('招募后nextId递增', () => {
    const em = {} as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    const prevId = (sys as any).nextId
    sys.update(1, em, 2520)
    expect((sys as any).nextId).toBe(prevId + 1)
  })

  it('MAX_WINDERS=13时不继续招募', () => {
    const em = {} as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 13; i++) {
      ;(sys as any).winders.push(makeWinder(i + 1, { windingSpeed: 50 }))
    }
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders.length).toBe(13)
  })

  it('招募时tick被记录', () => {
    const em = {} as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders[0].tick).toBe(2520)
  })

  it('招募时windingSpeed在[10,35)范围内', () => {
    const em = {} as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    if ((sys as any).winders.length > 0) {
      const speed = (sys as any).winders[0].windingSpeed
      expect(speed).toBeGreaterThanOrEqual(10)
      expect(speed).toBeLessThan(35)
    }
  })

  it('招募时threadCapacity在[20,50)范围内', () => {
    const em = {} as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    if ((sys as any).winders.length > 0) {
      const cap = (sys as any).winders[0].threadCapacity
      expect(cap).toBeGreaterThanOrEqual(20)
      expect(cap).toBeLessThan(50)
    }
  })

  it('招募时entityId在[0,500)范围内', () => {
    const em = {} as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    if ((sys as any).winders.length > 0) {
      const eid = (sys as any).winders[0].entityId
      expect(eid).toBeGreaterThanOrEqual(0)
      expect(eid).toBeLessThan(500)
    }
  })

  // ── 多次 update 累积状态 ──────────────────────────────────────────────────

  it('三次update后windingSpeed累积+0.06', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { windingSpeed: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    sys.update(1, em, 5040)
    sys.update(1, em, 7560)
    expect((sys as any).winders[0].windingSpeed).toBeCloseTo(50.06, 4)
  })

  it('三次update后tensionAccuracy累积+0.045', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { tensionAccuracy: 40 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    sys.update(1, em, 5040)
    sys.update(1, em, 7560)
    expect((sys as any).winders[0].tensionAccuracy).toBeCloseTo(40.045, 4)
  })

  it('三次update后consistency累积+0.03', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { consistency: 30 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    sys.update(1, em, 5040)
    sys.update(1, em, 7560)
    expect((sys as any).winders[0].consistency).toBeCloseTo(30.03, 4)
  })

  it('windingSpeed接近100时不超出（多次更新）', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { windingSpeed: 99.96 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    sys.update(1, em, 5040)
    sys.update(1, em, 7560)
    expect((sys as any).winders[0].windingSpeed).toBe(100)
  })

  // ── 混合场景 ──────────────────────────────────────────────────────────────

  it('混合场景：部分删除部分保留并递增', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { windingSpeed: 3 }))   // 3+0.02=3.02<=4，删除
    ;(sys as any).winders.push(makeWinder(2, { windingSpeed: 50 }))  // 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders.length).toBe(1)
    expect((sys as any).winders[0].windingSpeed).toBeCloseTo(50.02, 5)
  })

  it('空数组update后仍为空', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders.length).toBe(0)
  })

  it('update不改变winders中对象的entityId', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(99, { windingSpeed: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders[0].entityId).toBe(99)
  })

  it('update不改变winders中对象的id', () => {
    const em = {} as any
    const w = makeWinder(1, { windingSpeed: 50 })
    const originalId = w.id
    ;(sys as any).winders.push(w)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders[0].id).toBe(originalId)
  })

  it('update不改变winders中对象的tick', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { windingSpeed: 50, tick: 9999 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders[0].tick).toBe(9999)
  })

  it('不触发时不改变任何技能', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { windingSpeed: 50, tensionAccuracy: 40, consistency: 30 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1000)  // 不触发
    expect((sys as any).winders[0].windingSpeed).toBe(50)
    expect((sys as any).winders[0].tensionAccuracy).toBe(40)
    expect((sys as any).winders[0].consistency).toBe(30)
  })

  it('10个绕线师全部高技能update后全部保留', () => {
    const em = {} as any
    for (let i = 0; i < 10; i++) {
      ;(sys as any).winders.push(makeWinder(i + 1, { windingSpeed: 50 + i }))
    }
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders.length).toBe(10)
  })

  it('update方法存在且可调用', () => {
    expect(typeof sys.update).toBe('function')
  })

  // ── 边界值测试 ────────────────────────────────────────────────────────────

  it('windingSpeed=4.02时保留（>4）', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { windingSpeed: 4 }))  // 4+0.02=4.02 > 4
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders.length).toBe(1)
  })

  it('windingSpeed极大值（100）触发update后还是100', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { windingSpeed: 100, tensionAccuracy: 100, consistency: 100 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders[0].windingSpeed).toBe(100)
    expect((sys as any).winders[0].tensionAccuracy).toBe(100)
    expect((sys as any).winders[0].consistency).toBe(100)
  })

  it('最大13个绕线师全部高技能update后全部保留', () => {
    const em = {} as any
    for (let i = 0; i < 13; i++) {
      ;(sys as any).winders.push(makeWinder(i + 1, { windingSpeed: 50 + i }))
    }
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders.length).toBe(13)
  })
})
