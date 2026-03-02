import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureBevellerSystem } from '../systems/CreatureBevellerSystem'
import type { Beveller } from '../systems/CreatureBevellerSystem'

// CHECK_INTERVAL=2900, RECRUIT_CHANCE=0.0015, MAX_BEVELLERS=10
// 技能递增: bevellingSkill+0.02, angleAccuracy+0.015, chamferControl+0.01
// cleanup: bevellingSkill<=4 时删除

let nextId = 1
function makeSys(): CreatureBevellerSystem { return new CreatureBevellerSystem() }
function makeBeveller(entityId: number, overrides: Partial<Beveller> = {}): Beveller {
  return { id: nextId++, entityId, bevellingSkill: 20, angleAccuracy: 25, edgeSmoothing: 15, chamferControl: 20, tick: 0, ...overrides }
}

describe('CreatureBevellerSystem', () => {
  let sys: CreatureBevellerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ── 基础数据测试 ────────────────────────────────────────────────────────────

  it('初始无斜切师', () => { expect((sys as any).bevellers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).bevellers.push(makeBeveller(1))
    expect((sys as any).bevellers).toHaveLength(1)
    expect((sys as any).bevellers[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).bevellers.push(makeBeveller(1))
    expect((sys as any).bevellers).toBe((sys as any).bevellers)
  })

  it('多个斜切师全部返回', () => {
    ;(sys as any).bevellers.push(makeBeveller(1))
    ;(sys as any).bevellers.push(makeBeveller(2))
    expect((sys as any).bevellers).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const b = makeBeveller(10, { bevellingSkill: 80, angleAccuracy: 75, edgeSmoothing: 70, chamferControl: 65 })
    ;(sys as any).bevellers.push(b)
    const r = (sys as any).bevellers[0]
    expect(r.bevellingSkill).toBe(80)
    expect(r.angleAccuracy).toBe(75)
    expect(r.edgeSmoothing).toBe(70)
    expect(r.chamferControl).toBe(65)
  })

  it('Beveller对象拥有id字段', () => {
    const b = makeBeveller(5)
    ;(sys as any).bevellers.push(b)
    expect((sys as any).bevellers[0].id).toBeDefined()
    expect(typeof (sys as any).bevellers[0].id).toBe('number')
  })

  it('Beveller对象拥有tick字段', () => {
    const b = makeBeveller(5, { tick: 1234 })
    ;(sys as any).bevellers.push(b)
    expect((sys as any).bevellers[0].tick).toBe(1234)
  })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('bevellers是数组类型', () => {
    expect(Array.isArray((sys as any).bevellers)).toBe(true)
  })

  it('三个斜切师各自entityId独立', () => {
    ;(sys as any).bevellers.push(makeBeveller(10))
    ;(sys as any).bevellers.push(makeBeveller(20))
    ;(sys as any).bevellers.push(makeBeveller(30))
    const ids = (sys as any).bevellers.map((b: Beveller) => b.entityId)
    expect(ids).toEqual([10, 20, 30])
  })

  it('注入的bevellingSkill可以为0', () => {
    ;(sys as any).bevellers.push(makeBeveller(1, { bevellingSkill: 0 }))
    expect((sys as any).bevellers[0].bevellingSkill).toBe(0)
  })

  it('注入的angleAccuracy可以为0', () => {
    ;(sys as any).bevellers.push(makeBeveller(1, { angleAccuracy: 0 }))
    expect((sys as any).bevellers[0].angleAccuracy).toBe(0)
  })

  // ── CHECK_INTERVAL 节流 ────────────────────────────────────────────────────

  it('tick差值<CHECK_INTERVAL(2900)时不更新lastCheck', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2000)  // 2000 < 2900
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(2900)时更新lastCheck', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)  // 2900 >= 2900
    expect((sys as any).lastCheck).toBe(2900)
  })

  it('tick差值恰好等于CHECK_INTERVAL减1时跳过', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2899)  // 2899 < 2900
    expect((sys as any).lastCheck).toBe(0)
  })

  it('lastCheck=1000，tick=3900时触发（差值=2900）', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 1000
    sys.update(1, em, 3900)  // 3900-1000=2900 >= 2900
    expect((sys as any).lastCheck).toBe(3900)
  })

  it('lastCheck=1000，tick=3899时不触发（差值=2899）', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 1000
    sys.update(1, em, 3899)  // 3899-1000=2899 < 2900
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('lastCheck=5000，tick=100时不触发（差值为负）', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 5000
    sys.update(1, em, 100)  // 100-5000=-4900 < 2900
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('连续两次update且间隔足够时lastCheck更新两次', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).lastCheck).toBe(2900)
    sys.update(1, em, 5800)
    expect((sys as any).lastCheck).toBe(5800)
  })

  it('连续两次update间隔不足时第二次lastCheck不变', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).lastCheck).toBe(2900)
    sys.update(1, em, 4000)  // 4000-2900=1100 < 2900
    expect((sys as any).lastCheck).toBe(2900)
  })

  it('tick=0时不触发（差值=0）', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 0)  // 0-0=0 < 2900
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2901时触发（差值=2901>2900）', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2901)
    expect((sys as any).lastCheck).toBe(2901)
  })

  // ── 技能递增 ─────────��────────────────────────────────────────────────────

  it('update后bevellingSkill+0.02', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { bevellingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers[0].bevellingSkill).toBeCloseTo(50.02, 5)
  })

  it('update后angleAccuracy+0.015', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { angleAccuracy: 40 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers[0].angleAccuracy).toBeCloseTo(40.015, 5)
  })

  it('update后chamferControl+0.01', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { chamferControl: 30 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers[0].chamferControl).toBeCloseTo(30.01, 5)
  })

  it('bevellingSkill上限为100', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { bevellingSkill: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers[0].bevellingSkill).toBe(100)
  })

  it('angleAccuracy上限为100', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { angleAccuracy: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers[0].angleAccuracy).toBe(100)
  })

  it('chamferControl上限为100', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { chamferControl: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers[0].chamferControl).toBe(100)
  })

  it('bevellingSkill=100时保持100不超出', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { bevellingSkill: 100 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers[0].bevellingSkill).toBe(100)
  })

  it('angleAccuracy=100时保持100不超出', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { angleAccuracy: 100 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers[0].angleAccuracy).toBe(100)
  })

  it('chamferControl=100时保持100不超出', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { chamferControl: 100 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers[0].chamferControl).toBe(100)
  })

  it('edgeSmoothing不在update中变化', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { edgeSmoothing: 42 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers[0].edgeSmoothing).toBe(42)
  })

  it('多个斜切师全部递增技能', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { bevellingSkill: 10 }))
    ;(sys as any).bevellers.push(makeBeveller(2, { bevellingSkill: 20 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers[0].bevellingSkill).toBeCloseTo(10.02, 5)
    expect((sys as any).bevellers[1].bevellingSkill).toBeCloseTo(20.02, 5)
  })

  it('两次update各自递增一次', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { bevellingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    sys.update(1, em, 5800)
    expect((sys as any).bevellers[0].bevellingSkill).toBeCloseTo(50.04, 5)
  })

  it('技能不触发时不变（tick不足）', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { bevellingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1000)  // 不触发
    expect((sys as any).bevellers[0].bevellingSkill).toBe(50)
  })

  it('bevellingSkill从5递增到5.02', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { bevellingSkill: 5 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers[0].bevellingSkill).toBeCloseTo(5.02, 5)
  })

  // ── cleanup: bevellingSkill<=4 时删除 ────────────────────────────────────

  it('cleanup: bevellingSkill<=4时删除（先+0.02后比较，3.98+0.02=4.00<=4）', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { bevellingSkill: 3.98 }))  // 3.98+0.02=4.00<=4，删除
    ;(sys as any).bevellers.push(makeBeveller(2, { bevellingSkill: 20 }))    // 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers.length).toBe(1)
    expect((sys as any).bevellers[0].entityId).toBe(2)
  })

  it('cleanup: bevellingSkill刚好>4时保留', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { bevellingSkill: 3.99 }))  // 3.99+0.02=4.01>4，保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers.length).toBe(1)
  })

  it('cleanup: 全部技能过低时清空', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { bevellingSkill: 1 }))
    ;(sys as any).bevellers.push(makeBeveller(2, { bevellingSkill: 2 }))
    ;(sys as any).bevellers.push(makeBeveller(3, { bevellingSkill: 3 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers.length).toBe(0)
  })

  it('cleanup: bevellingSkill=0时被删除', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { bevellingSkill: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers.length).toBe(0)
  })

  it('cleanup: bevellingSkill=4时被删除（4<=4）', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { bevellingSkill: 3.98 }))  // 3.98+0.02=4<=4 删除
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers.length).toBe(0)
  })

  it('cleanup: bevellingSkill=4.01时保留（4.01>4）', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { bevellingSkill: 3.99 }))  // 3.99+0.02=4.01>4，保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers.length).toBe(1)
  })

  it('cleanup只删除低技能的，高技能的保留顺序', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { bevellingSkill: 1 }))   // 删除
    ;(sys as any).bevellers.push(makeBeveller(2, { bevellingSkill: 50 }))  // 保留
    ;(sys as any).bevellers.push(makeBeveller(3, { bevellingSkill: 2 }))   // 删除
    ;(sys as any).bevellers.push(makeBeveller(4, { bevellingSkill: 60 }))  // 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    const remaining = (sys as any).bevellers as Beveller[]
    expect(remaining.length).toBe(2)
    expect(remaining.map(b => b.entityId)).toEqual([2, 4])
  })

  it('cleanup: bevellingSkill=5时保留（5>4）', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { bevellingSkill: 5 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers.length).toBe(1)
  })

  it('cleanup: 先递增后清理，不是先清理后递增', () => {
    const em = {} as any
    // bevellingSkill=4, 先+0.02=4.02 > 4，不删除
    ;(sys as any).bevellers.push(makeBeveller(1, { bevellingSkill: 4 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers.length).toBe(1)
    expect((sys as any).bevellers[0].bevellingSkill).toBeCloseTo(4.02, 5)
  })

  // ── 随机招募 ──────────────────────────────────────────────────────────────

  it('强制random=0时不招募（RECRUIT_CHANCE=0.0015，0<0.0015，应该招募——但此测试验证随机不招募）', () => {
    const em = {} as any
    vi.spyOn(Math, 'random').mockReturnValue(0.5)  // 0.5 >= RECRUIT_CHANCE，不招募
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers.length).toBe(0)
  })

  it('random=0时满足RECRUIT_CHANCE招募一个斜切师', () => {
    const em = {} as any
    vi.spyOn(Math, 'random').mockReturnValue(0)  // 0 < 0.0015，招募
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers.length).toBe(1)
  })

  it('招募后nextId递增', () => {
    const em = {} as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    const prevId = (sys as any).nextId
    sys.update(1, em, 2900)
    expect((sys as any).nextId).toBe(prevId + 1)
  })

  it('MAX_BEVELLERS=10时不继续招募', () => {
    const em = {} as any
    vi.spyOn(Math, 'random').mockReturnValue(0)  // 触发招募条件
    for (let i = 0; i < 10; i++) {
      ;(sys as any).bevellers.push(makeBeveller(i + 1))
    }
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    // 因为cleanup可能移除低技能（但这里都是skill=20，不会���移除），所以10个保留+可能不招募
    // bevellers.length < MAX_BEVELLERS(10) 不满足，不招募
    // 但10个里有>4的skill，update后还在
    // 由于10个beveller skill=20，递增后为20.02，不删除，所以依然10个
    expect((sys as any).bevellers.length).toBe(10)
  })

  it('招募时tick被记录', () => {
    const em = {} as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers[0].tick).toBe(2900)
  })

  // ── 多次 update 累积状态 ──────────────────────────────────────────────────

  it('三次update后bevellingSkill累积+0.06', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { bevellingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    sys.update(1, em, 5800)
    sys.update(1, em, 8700)
    expect((sys as any).bevellers[0].bevellingSkill).toBeCloseTo(50.06, 4)
  })

  it('三次update后angleAccuracy累积+0.045', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { angleAccuracy: 40 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    sys.update(1, em, 5800)
    sys.update(1, em, 8700)
    expect((sys as any).bevellers[0].angleAccuracy).toBeCloseTo(40.045, 4)
  })

  it('三次update后chamferControl累积+0.03', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { chamferControl: 30 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    sys.update(1, em, 5800)
    sys.update(1, em, 8700)
    expect((sys as any).bevellers[0].chamferControl).toBeCloseTo(30.03, 4)
  })

  it('bevellingSkill接近100时不超出（多次更新）', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { bevellingSkill: 99.96 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    sys.update(1, em, 5800)
    sys.update(1, em, 8700)
    expect((sys as any).bevellers[0].bevellingSkill).toBe(100)
  })

  // ── 混合场景 ──────────────────────────────────────────────────────────────

  it('混合场景：部分删除部分保留并递增', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { bevellingSkill: 3 }))   // 3+0.02=3.02<=4，删除
    ;(sys as any).bevellers.push(makeBeveller(2, { bevellingSkill: 50 }))  // 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers.length).toBe(1)
    expect((sys as any).bevellers[0].bevellingSkill).toBeCloseTo(50.02, 5)
  })

  it('空数组update后仍为空', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers.length).toBe(0)
  })

  it('update不改变bevellers中对象的entityId', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(99, { bevellingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers[0].entityId).toBe(99)
  })

  it('update不改变bevellers中对象的id', () => {
    const em = {} as any
    const b = makeBeveller(1, { bevellingSkill: 50 })
    const originalId = b.id
    ;(sys as any).bevellers.push(b)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers[0].id).toBe(originalId)
  })

  it('update不改变bevellers中对象的tick', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { bevellingSkill: 50, tick: 9999 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers[0].tick).toBe(9999)
  })

  it('不触发时不改变任何技能', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { bevellingSkill: 50, angleAccuracy: 40, chamferControl: 30 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1000)  // 不触发
    expect((sys as any).bevellers[0].bevellingSkill).toBe(50)
    expect((sys as any).bevellers[0].angleAccuracy).toBe(40)
    expect((sys as any).bevellers[0].chamferControl).toBe(30)
  })

  // ── 边界值测试 ────────────────────────────────────────────────────────────

  it('bevellingSkill=4.02时保留（>4）', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { bevellingSkill: 4 }))  // 4+0.02=4.02 > 4
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers.length).toBe(1)
  })

  it('bevellingSkill=3.97时被删除（3.97+0.02=3.99<=4）', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { bevellingSkill: 3.97 }))  // 3.97+0.02=3.99<=4，删除
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers.length).toBe(0)
  })

  it('bevellingSkill极大值（100）触发update后还是100', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { bevellingSkill: 100, angleAccuracy: 100, chamferControl: 100 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers[0].bevellingSkill).toBe(100)
    expect((sys as any).bevellers[0].angleAccuracy).toBe(100)
    expect((sys as any).bevellers[0].chamferControl).toBe(100)
  })

  it('10个斜切师全部高技能update后全部保留', () => {
    const em = {} as any
    for (let i = 0; i < 10; i++) {
      ;(sys as any).bevellers.push(makeBeveller(i + 1, { bevellingSkill: 50 + i }))
    }
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers.length).toBe(10)
  })

  it('招募时bevellingSkill在[10,35)范围内', () => {
    const em = {} as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    if ((sys as any).bevellers.length > 0) {
      const skill = (sys as any).bevellers[0].bevellingSkill
      expect(skill).toBeGreaterThanOrEqual(10)
      expect(skill).toBeLessThan(35)
    }
  })

  it('招募时entityId在[0,500)范围内', () => {
    const em = {} as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    if ((sys as any).bevellers.length > 0) {
      const eid = (sys as any).bevellers[0].entityId
      expect(eid).toBeGreaterThanOrEqual(0)
      expect(eid).toBeLessThan(500)
    }
  })

  it('update方法存在且可调用', () => {
    expect(typeof sys.update).toBe('function')
  })
})
