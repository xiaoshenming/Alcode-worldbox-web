import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureHammermanSystem } from '../systems/CreatureHammermanSystem'
import type { Hammerman } from '../systems/CreatureHammermanSystem'

let nextId = 1
function makeSys(): CreatureHammermanSystem { return new CreatureHammermanSystem() }
function makeHammerman(entityId: number, hammeringSkill = 70, rhythmControl = 60, strikeForce = 80, metalShaping = 65): Hammerman {
  return { id: nextId++, entityId, hammeringSkill, rhythmControl, strikeForce, metalShaping, tick: 0 }
}

// 最小 em stub，tick 差值 < CHECK_INTERVAL 时只需传空对象
function makeEmStub() {
  return {} as any
}

describe('CreatureHammermanSystem — 数据结构', () => {
  let sys: CreatureHammermanSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无锤工', () => {
    expect((sys as any).hammermen).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).hammermen.push(makeHammerman(1))
    expect((sys as any).hammermen[0].entityId).toBe(1)
  })

  it('多个全部返回', () => {
    ;(sys as any).hammermen.push(makeHammerman(1))
    ;(sys as any).hammermen.push(makeHammerman(2))
    expect((sys as any).hammermen).toHaveLength(2)
  })

  it('四字段完整性验证', () => {
    ;(sys as any).hammermen.push(makeHammerman(5))
    const h = (sys as any).hammermen[0]
    expect(h.hammeringSkill).toBe(70)
    expect(h.rhythmControl).toBe(60)
    expect(h.strikeForce).toBe(80)
    expect(h.metalShaping).toBe(65)
  })
})

describe('CreatureHammermanSystem — CHECK_INTERVAL 节流 (2910)', () => {
  let sys: CreatureHammermanSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 差值 < 2910 时不更新 lastCheck', () => {
    const em = makeEmStub()
    sys.update(0, em, 0)     // lastCheck = 0
    const before = (sys as any).lastCheck
    sys.update(0, em, 2909)  // 差值 2909 < 2910，跳过
    expect((sys as any).lastCheck).toBe(before)
  })

  it('tick 差值 >= 2910 时更新 lastCheck', () => {
    const em = makeEmStub()
    sys.update(0, em, 0)
    sys.update(0, em, 2910)  // 差值恰好 = 2910
    expect((sys as any).lastCheck).toBe(2910)
  })

  it('连续触发两次 lastCheck 正确递进', () => {
    const em = makeEmStub()
    sys.update(0, em, 2910)
    sys.update(0, em, 5820)
    expect((sys as any).lastCheck).toBe(5820)
  })
})

describe('CreatureHammermanSystem — 技能递增', () => {
  let sys: CreatureHammermanSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('update 后 hammeringSkill +0.02', () => {
    const h = makeHammerman(1, 50)
    ;(sys as any).hammermen.push(h)
    sys.update(0, makeEmStub(), 2910)
    // 先递增再 cleanup；skill=50 >> 4，不会被清除
    expect((sys as any).hammermen[0].hammeringSkill).toBeCloseTo(50.02, 5)
  })

  it('update 后 rhythmControl +0.015', () => {
    const h = makeHammerman(1, 50, 40)
    ;(sys as any).hammermen.push(h)
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).hammermen[0].rhythmControl).toBeCloseTo(40.015, 5)
  })

  it('update 后 metalShaping +0.01', () => {
    const h = makeHammerman(1, 50, 60, 80, 30)
    ;(sys as any).hammermen.push(h)
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).hammermen[0].metalShaping).toBeCloseTo(30.01, 5)
  })

  it('hammeringSkill 上限为 100（不超过）', () => {
    const h = makeHammerman(1, 99.99)
    ;(sys as any).hammermen.push(h)
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).hammermen[0].hammeringSkill).toBe(100)
  })

  it('rhythmControl 上限为 100', () => {
    const h = makeHammerman(1, 50, 99.99)
    ;(sys as any).hammermen.push(h)
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).hammermen[0].rhythmControl).toBe(100)
  })
})

describe('CreatureHammermanSystem — cleanup 逻辑', () => {
  let sys: CreatureHammermanSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('hammeringSkill <= 4 时锤工被删除', () => {
    // 初始 skill=4.0，递增后=4.02 > 4，不会被删
    // 需要初始 skill=3.98，递增后=4.00，正好等于 4 => 删除
    const h = makeHammerman(1, 3.98)
    ;(sys as any).hammermen.push(h)
    sys.update(0, makeEmStub(), 2910)
    // 3.98 + 0.02 = 4.00，4.00 <= 4 => 删除
    expect((sys as any).hammermen).toHaveLength(0)
  })

  it('hammeringSkill > 4 时锤工保留', () => {
    const h = makeHammerman(1, 4.01)
    ;(sys as any).hammermen.push(h)
    sys.update(0, makeEmStub(), 2910)
    // 4.01 + 0.02 = 4.03 > 4 => 保留
    expect((sys as any).hammermen).toHaveLength(1)
  })

  it('cleanup 在递增之后执行（先增后删）', () => {
    // skill=4.0：先 +0.02 => 4.02，4.02 > 4，不删
    const h = makeHammerman(1, 4.0)
    ;(sys as any).hammermen.push(h)
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).hammermen).toHaveLength(1)
    expect((sys as any).hammermen[0].hammeringSkill).toBeCloseTo(4.02, 5)
  })
})
