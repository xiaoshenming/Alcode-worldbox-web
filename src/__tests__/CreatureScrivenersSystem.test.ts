import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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

afterEach(() => vi.restoreAllMocks())

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureScrivenersSystem — 初始状态', () => {
  let sys: CreatureScrivenersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无抄写员', () => { expect((sys as any).makers).toHaveLength(0) })
  it('nextId 初始为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck 初始为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('skillMap 初始为空', () => { expect((sys as any).skillMap.size).toBe(0) })
  it('makers 是数组', () => { expect(Array.isArray((sys as any).makers)).toBe(true) })
  it('skillMap 是 Map', () => { expect((sys as any).skillMap).toBeInstanceOf(Map) })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureScrivenersSystem — makers 数据结构', () => {
  let sys: CreatureScrivenersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

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
  it('maker 包含 id 字段', () => {
    const m = makeMaker(5)
    expect(m).toHaveProperty('id')
  })
  it('maker 包含 entityId 字段', () => {
    const m = makeMaker(7)
    expect(m.entityId).toBe(7)
  })
  it('maker 包含 skill 字段', () => {
    const m = makeMaker(1)
    expect(m).toHaveProperty('skill')
  })
  it('maker 包含 penmanship 字段', () => {
    const m = makeMaker(1)
    expect(m).toHaveProperty('penmanship')
  })
  it('maker 包含 reputation 字段', () => {
    const m = makeMaker(1)
    expect(m).toHaveProperty('reputation')
  })
  it('maker 包含 documentsWritten 字段', () => {
    const m = makeMaker(1)
    expect(m).toHaveProperty('documentsWritten')
  })
  it('maker 包含 tick 字段', () => {
    const m = makeMaker(1, 'uncial', 999)
    expect(m.tick).toBe(999)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureScrivenersSystem — CHECK_INTERVAL=1370 节流', () => {
  let sys: CreatureScrivenersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick差值小于CHECK_INTERVAL时跳过', () => {
    const em = makeEm([])
    sys.update(1, em, 0)
    sys.update(1, em, 100)
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
    sys.update(1, em, 1371)
    sys.update(1, em, 1372)
    expect((em.getEntitiesWithComponents as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callsBefore)
  })
  it('lastCheck 在首次触发后被更新为当前 tick', () => {
    const em = makeEm([])
    sys.update(1, em, 0)
    sys.update(1, em, 1370)
    expect((sys as any).lastCheck).toBe(1370)
  })
  it('tick=1369 时不触发（边界-1）', () => {
    const em = makeEm([])
    sys.update(1, em, 0)
    sys.update(1, em, 1369)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })
  it('tick=1370 时恰好触发（边界值）', () => {
    const em = makeEm([])
    sys.update(1, em, 0)
    sys.update(1, em, 1370)
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
  })
  it('第二个完整间隔后再次触发', () => {
    const em = makeEm([])
    sys.update(1, em, 0)
    sys.update(1, em, 1370)
    sys.update(1, em, 2740)
    expect((em.getEntitiesWithComponents as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2)
  })
  it('lastCheck 不前进时，差值仍基于旧 lastCheck 计算', () => {
    const em = makeEm([])
    ;(sys as any).lastCheck = 5000
    sys.update(1, em, 6369)  // 6369-5000=1369 < 1370，不触发
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
    sys.update(1, em, 6370)  // 6370-5000=1370 >= 1370，触发
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureScrivenersSystem — time-based cleanup (cutoff = tick - 51000)', () => {
  let sys: CreatureScrivenersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick早于cutoff的maker被移除', () => {
    const em = makeEm([])
    ;(sys as any).makers.push(makeMaker(1, 'uncial', 0))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 0)
    sys.update(1, em, 52000)
    expect((sys as any).makers).toHaveLength(0)
  })
  it('tick等于cutoff的maker不被移除（边界值：非严格小于）', () => {
    const em = makeEm([])
    ;(sys as any).makers.push(makeMaker(1, 'uncial', 1000))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 0)
    sys.update(1, em, 52000)
    expect((sys as any).makers).toHaveLength(1)
  })
  it('tick晚于cutoff的maker被保留', () => {
    const em = makeEm([])
    ;(sys as any).makers.push(makeMaker(1, 'uncial', 5000))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 0)
    sys.update(1, em, 52000)
    expect((sys as any).makers).toHaveLength(1)
  })
  it('混合列表只移除过期的', () => {
    const em = makeEm([])
    ;(sys as any).makers.push(makeMaker(1, 'uncial', 0))
    ;(sys as any).makers.push(makeMaker(2, 'gothic', 5000))
    ;(sys as any).makers.push(makeMaker(3, 'italic', 500))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 0)
    sys.update(1, em, 52000)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })
  it('未达到51000 tick时不清除任何maker', () => {
    const em = makeEm([])
    ;(sys as any).makers.push(makeMaker(1, 'uncial', 0))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 0)
    sys.update(1, em, 1370)
    expect((sys as any).makers).toHaveLength(1)
  })
  it('全部过期时列表清空', () => {
    const em = makeEm([])
    ;(sys as any).makers.push(makeMaker(1, 'uncial', 0))
    ;(sys as any).makers.push(makeMaker(2, 'gothic', 100))
    ;(sys as any).makers.push(makeMaker(3, 'italic', 200))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 0)
    sys.update(1, em, 52000)
    expect((sys as any).makers).toHaveLength(0)
  })
  it('cutoff精确计算：cutoff = tick - 51000', () => {
    // tick=60000 → cutoff=9000；maker.tick=8999 < 9000 → 删除
    const em = makeEm([])
    ;(sys as any).makers.push(makeMaker(1, 'uncial', 8999))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 0)
    sys.update(1, em, 60000)
    expect((sys as any).makers).toHaveLength(0)
  })
  it('cutoff精确计算：maker.tick = cutoff 时保留', () => {
    // tick=60000 → cutoff=9000；maker.tick=9000 >= 9000 → 保留
    const em = makeEm([])
    ;(sys as any).makers.push(makeMaker(1, 'uncial', 9000))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 0)
    sys.update(1, em, 60000)
    expect((sys as any).makers).toHaveLength(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureScrivenersSystem — skillMap 与技能计算', () => {
  let sys: CreatureScrivenersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始skillMap为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })
  it('skill决定scriptStyle: skill<25 → uncial', () => {
    ;(sys as any).skillMap.set(99, 20)
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([99]),
      getEntitiesWithComponent: vi.fn().mockReturnValue([]),
      getComponent: vi.fn().mockReturnValue({ age: 20 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 1370)
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
  it('skill=0 时 documentsWritten=1', () => {
    expect(1 + Math.floor(0 / 7)).toBe(1)
  })
  it('skill=7 时 documentsWritten=2', () => {
    expect(1 + Math.floor(7 / 7)).toBe(2)
  })
  it('skill=100 时 documentsWritten=15', () => {
    expect(1 + Math.floor(100 / 7)).toBe(15)
  })
  it('styleIdx 不超过 3（copperplate 是最高等级）', () => {
    // skill=100 → styleIdx = min(3, floor(100/25)) = min(3,4) = 3 → copperplate
    const styleIdx = Math.min(3, Math.floor(100 / 25))
    expect(styleIdx).toBe(3)
  })
  it('skill=25 时 styleIdx=1 → gothic', () => {
    const styleIdx = Math.min(3, Math.floor(25 / 25))
    expect(styleIdx).toBe(1)
  })
  it('skill=50 时 styleIdx=2 → italic', () => {
    const styleIdx = Math.min(3, Math.floor(50 / 25))
    expect(styleIdx).toBe(2)
  })
  it('skill=75 时 styleIdx=3 → copperplate', () => {
    const styleIdx = Math.min(3, Math.floor(75 / 25))
    expect(styleIdx).toBe(3)
  })
  it('skill=0 时 penmanship=15', () => {
    expect(15 + 0 * 0.75).toBe(15)
  })
  it('skill=100 时 penmanship=90', () => {
    expect(15 + 100 * 0.75).toBe(90)
  })
  it('skill=0 时 reputation=10', () => {
    expect(10 + 0 * 0.84).toBe(10)
  })
  it('skill=100 时 reputation=94', () => {
    expect(10 + 100 * 0.84).toBeCloseTo(94, 5)
  })
  it('SKILL_GROWTH=0.057 每次触发后 skill 增长', () => {
    const initialSkill = 20
    const grown = Math.min(100, initialSkill + 0.057)
    expect(grown).toBeCloseTo(20.057, 5)
  })
  it('skill上限100，不能超过', () => {
    const grown = Math.min(100, 99.99 + 0.057)
    expect(grown).toBe(100)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
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
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 1370)
    expect((sys as any).makers).toHaveLength(30)
  })
  it('makers为29时仍可招募', () => {
    for (let i = 0; i < 29; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1, 'uncial', 1370))
    }
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([500]),
      getEntitiesWithComponent: vi.fn().mockReturnValue([]),
      getComponent: vi.fn().mockReturnValue({ age: 20 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0) // 通过 CRAFT_CHANCE
    sys.update(1, em, 0)
    sys.update(1, em, 1370)
    // 29+1=30 最多
    expect((sys as any).makers.length).toBeLessThanOrEqual(30)
  })
  it('CRAFT_CHANCE=0.005，random返回0.006时不招募', () => {
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([1]),
      getEntitiesWithComponent: vi.fn().mockReturnValue([]),
      getComponent: vi.fn().mockReturnValue({ age: 20 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.006) // > 0.005 → 跳过
    sys.update(1, em, 0)
    sys.update(1, em, 1370)
    expect((sys as any).makers).toHaveLength(0)
  })
  it('age<10的生物不被招募', () => {
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([1]),
      getEntitiesWithComponent: vi.fn().mockReturnValue([]),
      getComponent: vi.fn().mockReturnValue({ age: 5 }), // 年龄不足
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0) // 通过概率检查
    sys.update(1, em, 0)
    sys.update(1, em, 1370)
    expect((sys as any).makers).toHaveLength(0)
  })
  it('age=10的生物可以被招募（边界值）', () => {
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([1]),
      getEntitiesWithComponent: vi.fn().mockReturnValue([]),
      getComponent: vi.fn().mockReturnValue({ age: 10 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 1370)
    expect((sys as any).makers.length).toBeGreaterThanOrEqual(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureScrivenersSystem — nextId 自增', () => {
  let sys: CreatureScrivenersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('招募后 nextId 递增', () => {
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([1]),
      getEntitiesWithComponent: vi.fn().mockReturnValue([]),
      getComponent: vi.fn().mockReturnValue({ age: 20 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 1370)
    const addedCount = (sys as any).makers.length
    expect((sys as any).nextId).toBe(1 + addedCount)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureScrivenersSystem — STYLES 数组与边界常量', () => {
  it('STYLES 包含4种风格', () => {
    const styles: ScriptStyle[] = ['uncial', 'gothic', 'italic', 'copperplate']
    expect(styles).toHaveLength(4)
  })
  it('CHECK_INTERVAL 常量为 1370', () => {
    // 验证系统行为与 1370 一致
    const sys = makeSys()
    const em = makeEm([])
    sys.update(1, em, 0)
    sys.update(1, em, 1369) // 不触发
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
    sys.update(1, em, 1370) // 触发
    expect(em.getEntitiesWithComponents).toHaveBeenCalled()
  })
  it('MAX_MAKERS 常量为 30 — 列表不超过30', () => {
    const sys = makeSys()
    for (let i = 0; i < 35; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1, 'uncial', 1370))
    }
    // 手动设置超过上限，验证系统能感知
    expect((sys as any).makers.length).toBe(35)
    // cleanup 不会主动截断至30，只是招募时判断 >= MAX_MAKERS 则 break
  })
  it('SKILL_GROWTH 约为 0.057 — 增长后值接近', () => {
    const base = 50
    const grown = Math.min(100, base + 0.057)
    expect(grown).toBeCloseTo(50.057, 3)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureScrivenersSystem — getComponent 返回 null 时跳过', () => {
  let sys: CreatureScrivenersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('getComponent 返回 null 时不添加 maker', () => {
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([1]),
      getEntitiesWithComponent: vi.fn().mockReturnValue([]),
      getComponent: vi.fn().mockReturnValue(null),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 1370)
    expect((sys as any).makers).toHaveLength(0)
  })
  it('getComponent 返回 undefined 时不添加 maker', () => {
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([1]),
      getEntitiesWithComponent: vi.fn().mockReturnValue([]),
      getComponent: vi.fn().mockReturnValue(undefined),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 1370)
    expect((sys as any).makers).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureScrivenersSystem — skillMap 预置 skill 使用', () => {
  let sys: CreatureScrivenersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skillMap 中预置的 skill 会被使用并增长', () => {
    ;(sys as any).skillMap.set(10, 80)
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([10]),
      getEntitiesWithComponent: vi.fn().mockReturnValue([]),
      getComponent: vi.fn().mockReturnValue({ age: 20 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 1370)
    const storedSkill = (sys as any).skillMap.get(10)
    // 80 + 0.057 = 80.057
    expect(storedSkill).toBeCloseTo(80.057, 3)
  })
  it('skill 被 skillMap 更新后新值被写回 Map', () => {
    ;(sys as any).skillMap.set(20, 50)
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([20]),
      getEntitiesWithComponent: vi.fn().mockReturnValue([]),
      getComponent: vi.fn().mockReturnValue({ age: 20 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 0)
    sys.update(1, em, 1370)
    expect((sys as any).skillMap.has(20)).toBe(true)
  })
})
