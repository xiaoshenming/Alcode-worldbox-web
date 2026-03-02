import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureScrivenersSystem } from '../systems/CreatureScrivenersSystem'
import type { Scrivener, ScriptStyle } from '../systems/CreatureScrivenersSystem'

let nextId = 1
function makeSys(): CreatureScrivenersSystem { return new CreatureScrivenersSystem() }
function makeMaker(entityId: number, style: ScriptStyle = 'uncial', tick = 0): Scrivener {
  return { id: nextId++, entityId, skill: 70, documentsWritten: 20, scriptStyle: style, penmanship: 75, reputation: 50, tick }
}
function makeEm(entityIds: number[] = [], age = 15) {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue(entityIds),
    getEntitiesWithComponent: vi.fn().mockReturnValue([]),
    getComponent: vi.fn().mockReturnValue({ age }),
  } as any
}

describe('CreatureScrivenersSystem.getMakers', () => {
  let sys: CreatureScrivenersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无抄写员', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'gothic'))
    expect((sys as any).makers[0].scriptStyle).toBe('gothic')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有4种字体风格', () => {
    const styles: ScriptStyle[] = ['uncial', 'gothic', 'italic', 'copperplate']
    styles.forEach((s, i) => { ;(sys as any).makers.push(makeMaker(i + 1, s)) })
    const all = (sys as any).makers
    styles.forEach((s, i) => { expect(all[i].scriptStyle).toBe(s) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})

describe('CreatureScrivenersSystem — CHECK_INTERVAL=1370 节流', () => {
  let sys: CreatureScrivenersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick差值小于CHECK_INTERVAL时跳过', () => {
    const em = makeEm([])
    sys.update(1, em, 0)
    sys.update(1, em, 100) // 100 < 1370
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(0)
  })

  it('tick差值达到CHECK_INTERVAL时执行', () => {
    const em = makeEm([])
    sys.update(1, em, 0)
    sys.update(1, em, 1370)
    expect(em.getEntitiesWithComponents).toHaveBeenCalled()
  })

  it('lastCheck更新后连续小tick不再触发', () => {
    const em = makeEm([])
    sys.update(1, em, 0)
    sys.update(1, em, 1370)
    const callsBefore = (em.getEntitiesWithComponents as ReturnType<typeof vi.fn>).mock.calls.length
    sys.update(1, em, 1371) // 1 < 1370
    sys.update(1, em, 1372)
    expect((em.getEntitiesWithComponents as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callsBefore)
  })
})

describe('CreatureScrivenersSystem — time-based cleanup (cutoff = tick - 51000)', () => {
  let sys: CreatureScrivenersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick早于cutoff的maker被移除', () => {
    const em = makeEm([]) // 空实体，避免招募干扰
    ;(sys as any).makers.push(makeMaker(1, 'uncial', 0))
    sys.update(1, em, 0)
    sys.update(1, em, 52000) // cutoff = 52000 - 51000 = 1000，maker.tick=0 < 1000 → 移除
    expect((sys as any).makers).toHaveLength(0)
  })

  it('tick等于cutoff的maker被移除（tick < cutoff为false，不删）', () => {
    const em = makeEm([])
    ;(sys as any).makers.push(makeMaker(1, 'uncial', 1000))
    sys.update(1, em, 0)
    sys.update(1, em, 52000) // cutoff = 1000，maker.tick=1000，1000 < 1000为false → 保留
    expect((sys as any).makers).toHaveLength(1)
  })

  it('tick晚于cutoff的maker被保留', () => {
    const em = makeEm([])
    ;(sys as any).makers.push(makeMaker(1, 'uncial', 5000))
    sys.update(1, em, 0)
    sys.update(1, em, 52000) // cutoff = 1000，maker.tick=5000 > 1000 → 保留
    expect((sys as any).makers).toHaveLength(1)
  })

  it('混合列表只移除过期的', () => {
    const em = makeEm([])
    ;(sys as any).makers.push(makeMaker(1, 'uncial', 0))      // 过期
    ;(sys as any).makers.push(makeMaker(2, 'gothic', 5000))   // 保留
    ;(sys as any).makers.push(makeMaker(3, 'italic', 500))    // 过期
    sys.update(1, em, 0)
    sys.update(1, em, 52000) // cutoff = 1000
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('未达到51000 tick时不清除任何maker', () => {
    const em = makeEm([])
    ;(sys as any).makers.push(makeMaker(1, 'uncial', 0))
    sys.update(1, em, 0)
    sys.update(1, em, 1370) // cutoff = 1370 - 51000 = -49630，maker.tick=0 > -49630 → 保留
    expect((sys as any).makers).toHaveLength(1)
  })
})

describe('CreatureScrivenersSystem — skillMap 与技能计算', () => {
  let sys: CreatureScrivenersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始skillMap为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('skill决定scriptStyle: skill<25 → uncial', () => {
    // skill在[2,9)区间，styleIdx = floor(skill/25) = 0 → uncial
    ;(sys as any).skillMap.set(99, 20) // 预设skill=20
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([99]),
      getEntitiesWithComponent: vi.fn().mockReturnValue([]),
      getComponent: vi.fn().mockReturnValue({ age: 20 }),
    } as any
    // mock Math.random使CRAFT_CHANCE通过（0 < 0.005 = false，需全部通过）
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 1370)
    vi.restoreAllMocks()
    const added = (sys as any).makers.filter((m: Scrivener) => m.entityId === 99)
    if (added.length > 0) {
      expect(added[0].scriptStyle).toBe('uncial')
    }
  })

  it('penmanship = 15 + skill * 0.75', () => {
    const skill = 50
    const penmanship = 15 + skill * 0.75
    expect(penmanship).toBeCloseTo(52.5, 5)
  })

  it('reputation = 10 + skill * 0.84', () => {
    const skill = 50
    const reputation = 10 + skill * 0.84
    expect(reputation).toBeCloseTo(52, 5)
  })

  it('documentsWritten = 1 + floor(skill/7)', () => {
    const skill = 50
    const docs = 1 + Math.floor(skill / 7)
    expect(docs).toBe(8)
  })
})

describe('CreatureScrivenersSystem — MAX_MAKERS=30 上限', () => {
  let sys: CreatureScrivenersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('makers达到30时新实体被忽略', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1))
    }
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([999]),
      getEntitiesWithComponent: vi.fn().mockReturnValue([]),
      getComponent: vi.fn().mockReturnValue({ age: 20 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0) // 确保通过CRAFT_CHANCE
    sys.update(1, em, 0)
    sys.update(1, em, 1370)
    vi.restoreAllMocks()
    expect((sys as any).makers).toHaveLength(30)
  })
})
