import { describe, it, expect, beforeEach } from 'vitest'
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
})

describe('CreatureHarnessmakerSystem — CHECK_INTERVAL (2610)', () => {
  let sys: CreatureHarnessmakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 差值 < 2610 不触发（先推进 lastCheck，再测小差值）', () => {
    const em = {} as any
    // 先触发一次：lastCheck 被设为 10000
    sys.update(0, em, 10000)
    // 再以 10000 + 2609 调用，差值 2609 < 2610，不触发
    ;(sys as any).harnessmakers.push(makeHm(1, 70))
    const before = (sys as any).harnessmakers[0].leatherStitching
    sys.update(0, em, 10000 + 2609)
    expect((sys as any).harnessmakers[0].leatherStitching).toBe(before)
  })

  it('tick 差值 >= 2610 触发 update（技能被递增）', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 70))
    // 从 lastCheck=0 出发，tick=2610 触发
    triggerOnce(sys, 2610)
    expect((sys as any).harnessmakers[0].leatherStitching).toBeCloseTo(70 + 0.02)
  })
})

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
})

describe('CreatureHarnessmakerSystem — cleanup (leatherStitching <= 4)', () => {
  let sys: CreatureHarnessmakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('leatherStitching = 3.98，递增后 = 4.00，等于 4，被删除', () => {
    ;(sys as any).harnessmakers.push(makeHm(1, 3.98))
    triggerOnce(sys, 2610)
    // 3.98 + 0.02 = 4.00 <= 4 → 删除
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
})
