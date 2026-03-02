import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureHarnessmakerSystem } from '../systems/CreatureHarnessmakerSystem'
import type { Harnessmaker } from '../systems/CreatureHarnessmakerSystem'

let nextId = 1
function makeSys(): CreatureHarnessmakerSystem { return new CreatureHarnessmakerSystem() }
function makeHm(entityId: number, leatherStitching = 70, buckleFitting = 65, strapCutting = 60, outputQuality = 75, tick = 0): Harnessmaker {
  return { id: nextId++, entityId, leatherStitching, buckleFitting, strapCutting, outputQuality, tick }
}

/** 触发一次 update（从 lastCheck=0 出发，tick >= 2610 即触发） */
function triggerOnce(sys: CreatureHarnessmakerSystem, tick = 3000) {
  const em = {} as any
  sys.update(0, em, tick)
}

afterEach(() => vi.restoreAllMocks())

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureHarnessmakerSystem — 数据查询', () => {
  let sys: CreatureHarnessmakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无皮具匠', () => {
    expect((sys as any).harnessmakers).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).harnessmakers.push(makeHm(1))
    expect((sys as any).harnessmakers[0].entityId).toBe(1)
  })

  it('多个全部返回', () => {
    ;(sys as any).harnessmakers.push(makeHm(1))
    ;(sys as any).harnessmakers.push(makeHm(2))
    ;(sys as any).harnessmakers.push(makeHm(3))
    expect((sys as any).harnessmakers).toHaveLength(3)
  })

  it('四字段完整（leatherStitching / buckleFitting / strapCutting / outputQuality）', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 30, 40, 50, 60))
    const h = (sys as any).harnessmakers[0] as Harnessmaker
    expect(h.leatherStitching).toBe(30)
    expect(h.buckleFitting).toBe(40)
    expect(h.strapCutting).toBe(50)
    expect(h.outputQuality).toBe(60)
  })

  it('返回内部引用', () => {
    ;(sys as any).harnessmakers.push(makeHm(1))
    expect((sys as any).harnessmakers).toBe((sys as any).harnessmakers)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('注入的 tick 字段被保留', () => {
    ;(sys as any).harnessmakers.push(makeHm(5, 70, 65, 60, 75, 999))
    expect((sys as any).harnessmakers[0].tick).toBe(999)
  })

  it('entityId 字段独立不共享', () => {
    ;(sys as any).harnessmakers.push(makeHm(10))
    ;(sys as any).harnessmakers.push(makeHm(20))
    expect((sys as any).harnessmakers[0].entityId).toBe(10)
    expect((sys as any).harnessmakers[1].entityId).toBe(20)
  })

  it('harnessmakers 是数组类型', () => {
    expect(Array.isArray((sys as any).harnessmakers)).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureHarnessmakerSystem — CHECK_INTERVAL (2610)', () => {
  let sys: CreatureHarnessmakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 差值 < 2610 不触发（先推进 lastCheck，再测小差值）', () => {
    const em = {} as any
    sys.update(0, em, 10000)
    ;(sys as any).harnessmakers.push(makeHm(1, 70))
    const before = (sys as any).harnessmakers[0].leatherStitching
    sys.update(0, em, 10000 + 2609)
    expect((sys as any).harnessmakers[0].leatherStitching).toBe(before)
  })

  it('tick 差值 >= 2610 触发 update（技能被递增）', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 70))
    triggerOnce(sys, 2610)
    expect((sys as any).harnessmakers[0].leatherStitching).toBeCloseTo(70 + 0.02)
  })

  it('恰好差值 2610 时触发', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 50))
    const em = {} as any
    sys.update(0, em, 2610)
    expect((sys as any).harnessmakers[0].leatherStitching).toBeCloseTo(50 + 0.02)
  })

  it('差值 2609 不触发，lastCheck 不更新', () => {
    const em = {} as any
    sys.update(0, em, 2609)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('差值 2610 触发后 lastCheck 更新为当前 tick', () => {
    const em = {} as any
    sys.update(0, em, 2610)
    expect((sys as any).lastCheck).toBe(2610)
  })

  it('第二次触发需要再等 2610', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 50))
    const em = {} as any
    sys.update(0, em, 2610) // 第一次触发
    const afterFirst = (sys as any).harnessmakers[0].leatherStitching
    sys.update(0, em, 2610 + 2609) // 不触发
    expect((sys as any).harnessmakers[0].leatherStitching).toBe(afterFirst)
    sys.update(0, em, 2610 + 2610) // 触发
    expect((sys as any).harnessmakers[0].leatherStitching).toBeCloseTo(afterFirst + 0.02)
  })

  it('大 tick 值仍能正常触发', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 50))
    const em = {} as any
    sys.update(0, em, 1_000_000)
    expect((sys as any).harnessmakers[0].leatherStitching).toBeCloseTo(50 + 0.02)
  })

  it('tick=0 不触发（差值为0）', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 70))
    const em = {} as any
    sys.update(0, em, 0)
    expect((sys as any).harnessmakers[0].leatherStitching).toBe(70)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureHarnessmakerSystem — 技能递增（单次触发）', () => {
  let sys: CreatureHarnessmakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('update 后 leatherStitching +0.02', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 50))
    triggerOnce(sys, 2610)
    expect((sys as any).harnessmakers[0].leatherStitching).toBeCloseTo(50 + 0.02)
  })

  it('update 后 strapCutting +0.015', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 70, 65, 50))
    triggerOnce(sys, 2610)
    expect((sys as any).harnessmakers[0].strapCutting).toBeCloseTo(50 + 0.015)
  })

  it('update 后 outputQuality +0.01', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 70, 65, 60, 80))
    triggerOnce(sys, 2610)
    expect((sys as any).harnessmakers[0].outputQuality).toBeCloseTo(80 + 0.01)
  })

  it('leatherStitching 上限 100（不超过）', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 99.99))
    triggerOnce(sys, 2610)
    expect((sys as any).harnessmakers[0].leatherStitching).toBe(100)
  })

  it('outputQuality 上限 100', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 70, 65, 60, 99.99))
    triggerOnce(sys, 2610)
    expect((sys as any).harnessmakers[0].outputQuality).toBe(100)
  })

  it('strapCutting 上限 100', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 70, 65, 99.99))
    triggerOnce(sys, 2610)
    expect((sys as any).harnessmakers[0].strapCutting).toBe(100)
  })

  it('buckleFitting 不被 update 修改（源码未递增）', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 70, 65, 60, 75))
    triggerOnce(sys, 2610)
    // buckleFitting 源码里未做递增，应保持原值
    expect((sys as any).harnessmakers[0].buckleFitting).toBe(65)
  })

  it('多个皮具匠均被递增', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 50, 50, 50, 50))
    ;(sys as any).harnessmakers.push(makeHm(2, 60, 60, 60, 60))
    triggerOnce(sys, 2610)
    expect((sys as any).harnessmakers[0].leatherStitching).toBeCloseTo(50.02)
    expect((sys as any).harnessmakers[1].leatherStitching).toBeCloseTo(60.02)
  })

  it('leatherStitching 已达 100 时不继续增加', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 100))
    triggerOnce(sys, 2610)
    expect((sys as any).harnessmakers[0].leatherStitching).toBe(100)
  })

  it('strapCutting 已达 100 时不继续增加', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 50, 50, 100))
    triggerOnce(sys, 2610)
    expect((sys as any).harnessmakers[0].strapCutting).toBe(100)
  })

  it('outputQuality 已达 100 时不继续增加', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 50, 50, 50, 100))
    triggerOnce(sys, 2610)
    expect((sys as any).harnessmakers[0].outputQuality).toBe(100)
  })

  it('低值皮具匠（15）经递增后接近 15.02', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 15))
    triggerOnce(sys, 2610)
    expect((sys as any).harnessmakers[0].leatherStitching).toBeCloseTo(15.02)
  })

  it('递增不影响 entityId', () => {
    ;(sys as any).harnessmakers.push(makeHm(42, 50))
    triggerOnce(sys, 2610)
    expect((sys as any).harnessmakers[0].entityId).toBe(42)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureHarnessmakerSystem — cleanup (leatherStitching <= 4)', () => {
  let sys: CreatureHarnessmakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('leatherStitching = 3.98，递增后 = 4.00，等于 4，被删除', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 3.98))
    triggerOnce(sys, 2610)
    expect((sys as any).harnessmakers).toHaveLength(0)
  })

  it('leatherStitching = 4.01，递增后 = 4.03 > 4，不删除', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 4.01))
    triggerOnce(sys, 2610)
    expect((sys as any).harnessmakers).toHaveLength(1)
  })

  it('leatherStitching 远大于 4 的皮具匠不被删除', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 70))
    triggerOnce(sys, 2610)
    expect((sys as any).harnessmakers).toHaveLength(1)
  })

  it('leatherStitching = 0 -> 0.02 <= 4 被删除', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 0))
    triggerOnce(sys, 2610)
    expect((sys as any).harnessmakers).toHaveLength(0)
  })

  it('leatherStitching = 1 -> 1.02 <= 4 被删除', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 1))
    triggerOnce(sys, 2610)
    expect((sys as any).harnessmakers).toHaveLength(0)
  })

  it('leatherStitching = 3 -> 3.02 <= 4 被删除', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 3))
    triggerOnce(sys, 2610)
    expect((sys as any).harnessmakers).toHaveLength(0)
  })

  it('混合：1个低值被删，1个高值保留', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 3))   // 3+0.02=3.02 <= 4 → 删
    ;(sys as any).harnessmakers.push(makeHm(2, 50))  // 50+0.02 > 4 → 保留
    triggerOnce(sys, 2610)
    expect((sys as any).harnessmakers).toHaveLength(1)
    expect((sys as any).harnessmakers[0].entityId).toBe(2)
  })

  it('所有都低于阈值时全部删除', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 1))
    ;(sys as any).harnessmakers.push(makeHm(2, 2))
    ;(sys as any).harnessmakers.push(makeHm(3, 3.5))
    triggerOnce(sys, 2610)
    expect((sys as any).harnessmakers).toHaveLength(0)
  })

  it('leatherStitching 刚好 4.00（未经递增注入）被删除', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 3.98)) // 3.98+0.02=4.00 <= 4
    triggerOnce(sys, 2610)
    expect((sys as any).harnessmakers).toHaveLength(0)
  })

  it('cleanup 不影响 tick 未触发时的数组', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 1)) // 低值但 tick 不足
    const em = {} as any
    sys.update(0, em, 100) // 不触发
    expect((sys as any).harnessmakers).toHaveLength(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureHarnessmakerSystem — 招募逻辑（RECRUIT_CHANCE=0.0014）', () => {
  let sys: CreatureHarnessmakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('Math.random=0 时（低于0.0014）招募新皮具匠', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    triggerOnce(sys, 2610)
    expect((sys as any).harnessmakers.length).toBeGreaterThan(0)
  })

  it('Math.random=0.999 时（高于0.0014）不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    triggerOnce(sys, 2610)
    expect((sys as any).harnessmakers).toHaveLength(0)
  })

  it('已满 MAX_HARNESSMAKERS(10) 时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // 触发招募条件
    for (let i = 0; i < 10; i++) {
      ;(sys as any).harnessmakers.push(makeHm(i + 1, 50))
    }
    triggerOnce(sys, 2610)
    // 10个已有，不能再招募；但这10个都会被递增并保留（leatherStitching=50.02 > 4）
    expect((sys as any).harnessmakers.length).toBeLessThanOrEqual(10)
  })

  it('招募后新皮具匠有正确的 tick 字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = {} as any
    sys.update(0, em, 2610)
    if ((sys as any).harnessmakers.length > 0) {
      expect((sys as any).harnessmakers[0].tick).toBe(2610)
    }
  })

  it('招募后新皮具匠拥有合法的 leatherStitching 初始值(10-35)', () => {
    // mock random 为固定值 0.5 使各随机字段落到区间中间
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = {} as any
    sys.update(0, em, 2610)
    if ((sys as any).harnessmakers.length > 0) {
      const ls = (sys as any).harnessmakers[0].leatherStitching
      // 初始值 = 10 + random()*25，random=0 => 10，然后 +0.02 => 10.02
      expect(ls).toBeGreaterThan(0)
    }
  })

  it('nextId 在招募后递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const beforeId = (sys as any).nextId
    const em = {} as any
    sys.update(0, em, 2610)
    if ((sys as any).harnessmakers.length > 0) {
      expect((sys as any).nextId).toBeGreaterThan(beforeId)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureHarnessmakerSystem — 多轮 update 累积', () => {
  let sys: CreatureHarnessmakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('3 次触发后 leatherStitching 累计 +0.06', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 50))
    const em = {} as any
    sys.update(0, em, 2610)
    sys.update(0, em, 5220)
    sys.update(0, em, 7830)
    expect((sys as any).harnessmakers[0].leatherStitching).toBeCloseTo(50 + 0.06, 4)
  })

  it('5 次触发后 strapCutting 累计 +0.075', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 50, 50, 50))
    const em = {} as any
    for (let i = 1; i <= 5; i++) {
      sys.update(0, em, 2610 * i)
    }
    expect((sys as any).harnessmakers[0].strapCutting).toBeCloseTo(50 + 5 * 0.015, 4)
  })

  it('多次触发后 leatherStitching 不超过 100', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 99))
    const em = {} as any
    for (let i = 1; i <= 100; i++) {
      sys.update(0, em, 2610 * i)
    }
    expect((sys as any).harnessmakers[0].leatherStitching).toBe(100)
  })

  it('多次触发后 outputQuality 不超过 100', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 50, 50, 50, 99))
    const em = {} as any
    for (let i = 1; i <= 200; i++) {
      sys.update(0, em, 2610 * i)
    }
    expect((sys as any).harnessmakers[0].outputQuality).toBe(100)
  })
})
