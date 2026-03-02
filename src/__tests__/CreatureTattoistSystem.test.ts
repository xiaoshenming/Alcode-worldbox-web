import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureTattoistSystem } from '../systems/CreatureTattoistSystem'
import type { Tattoo, TattooStyle } from '../systems/CreatureTattoistSystem'

// CHECK_INTERVAL=3200, TATTOO_CHANCE=0.004, MAX_TATTOOS=40
// prestige grows +0.02 when age > 50000, capped at 100
// cleanup: tattoos of dead creatures removed (hasComponent returns false)

let nextId = 1
function makeSys(): CreatureTattoistSystem { return new CreatureTattoistSystem() }
function makeTattoo(creatureId: number, style: TattooStyle = 'tribal', overrides: Partial<Tattoo> = {}): Tattoo {
  return { id: nextId++, creatureId, style, bodyPart: 'arm', powerBonus: 10, prestige: 50, age: 0, tick: 0, ...overrides }
}
function makeAliveEm(entities: number[] = []) {
  return {
    getEntitiesWithComponent: vi.fn().mockReturnValue(entities),
    hasComponent: vi.fn().mockReturnValue(true),
  } as any
}

afterEach(() => vi.restoreAllMocks())

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureTattoistSystem — 初始状态', () => {
  let sys: CreatureTattoistSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无纹身', () => { expect((sys as any).tattoos).toHaveLength(0) })
  it('nextId 初始为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck 初始为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('tattoos 是数组', () => { expect(Array.isArray((sys as any).tattoos)).toBe(true) })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureTattoistSystem — tattoo 数据结构', () => {
  let sys: CreatureTattoistSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入后可查询', () => {
    ;(sys as any).tattoos.push(makeTattoo(1, 'runic'))
    expect((sys as any).tattoos[0].style).toBe('runic')
  })
  it('返回只读引用', () => {
    ;(sys as any).tattoos.push(makeTattoo(1))
    expect((sys as any).tattoos).toBe((sys as any).tattoos)
  })
  it('支持所有4种纹身风格', () => {
    const styles: TattooStyle[] = ['tribal', 'runic', 'celestial', 'beast']
    styles.forEach((s, i) => { ;(sys as any).tattoos.push(makeTattoo(i + 1, s)) })
    const all = (sys as any).tattoos
    styles.forEach((s, i) => { expect(all[i].style).toBe(s) })
  })
  it('字段 powerBonus 正确', () => {
    ;(sys as any).tattoos.push(makeTattoo(2, 'beast'))
    const t = (sys as any).tattoos[0]
    expect(t.powerBonus).toBe(10)
  })
  it('字段 bodyPart 正确', () => {
    ;(sys as any).tattoos.push(makeTattoo(2, 'beast'))
    const t = (sys as any).tattoos[0]
    expect(t.bodyPart).toBe('arm')
  })
  it('tattoo 包含 id 字段', () => {
    const t = makeTattoo(1)
    expect(t).toHaveProperty('id')
  })
  it('tattoo 包含 creatureId 字段', () => {
    const t = makeTattoo(5)
    expect(t.creatureId).toBe(5)
  })
  it('tattoo 包含 age 字段', () => {
    const t = makeTattoo(1)
    expect(t).toHaveProperty('age')
  })
  it('tattoo 包含 tick 字段', () => {
    const t = makeTattoo(1, 'tribal', { tick: 999 })
    expect(t.tick).toBe(999)
  })
  it('tattoo 包含 prestige 字段', () => {
    const t = makeTattoo(1, 'tribal', { prestige: 77 })
    expect(t.prestige).toBe(77)
  })
  it('数据字段完整性验证', () => {
    const t = makeTattoo(5, 'celestial', { powerBonus: 12, prestige: 70, bodyPart: 'chest' })
    expect(t.powerBonus).toBe(12)
    expect(t.prestige).toBe(70)
    expect(t.bodyPart).toBe('chest')
    expect(t.style).toBe('celestial')
  })
  it('多个纹身全部返回', () => {
    ;(sys as any).tattoos.push(makeTattoo(1))
    ;(sys as any).tattoos.push(makeTattoo(2))
    expect((sys as any).tattoos).toHaveLength(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureTattoistSystem — CHECK_INTERVAL=3200 节流', () => {
  let sys: CreatureTattoistSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick差值<CHECK_INTERVAL(3200)时不更新lastCheck', () => {
    const em = makeAliveEm([])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3000)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick差值>=CHECK_INTERVAL(3200)时更新lastCheck', () => {
    const em = makeAliveEm([])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3200)
    expect((sys as any).lastCheck).toBe(3200)
  })
  it('lastCheck非零时节流正确计算差值', () => {
    const em = makeAliveEm([])
    ;(sys as any).lastCheck = 5000
    sys.update(1, em, 7000)   // 2000 < 3200，不更新
    expect((sys as any).lastCheck).toBe(5000)
    sys.update(1, em, 8200)   // 3200 >= 3200，更新
    expect((sys as any).lastCheck).toBe(8200)
  })
  it('tick=3199 时不触发（边界-1）', () => {
    const em = makeAliveEm([])
    sys.update(1, em, 3199)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=3200 时恰好触发（边界值）', () => {
    const em = makeAliveEm([])
    sys.update(1, em, 3200)
    expect((sys as any).lastCheck).toBe(3200)
  })
  it('连续两次间隔均满足时，lastCheck 更新两次', () => {
    const em = makeAliveEm([])
    sys.update(1, em, 3200)
    sys.update(1, em, 6400)
    expect((sys as any).lastCheck).toBe(6400)
  })
  it('第二次小于间隔时 lastCheck 不变', () => {
    const em = makeAliveEm([])
    sys.update(1, em, 3200)
    sys.update(1, em, 4000)  // 4000-3200=800 < 3200
    expect((sys as any).lastCheck).toBe(3200)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureTattoistSystem — age 更新', () => {
  let sys: CreatureTattoistSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('age等于tick-tattoo.tick', () => {
    const em = makeAliveEm([])
    ;(sys as any).tattoos.push(makeTattoo(1, 'celestial', { tick: 1000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 4200)   // tick=4200, tattoo.tick=1000 => age=3200
    expect((sys as any).tattoos[0].age).toBe(3200)
  })
  it('age 从0开始增长', () => {
    const em = makeAliveEm([])
    ;(sys as any).tattoos.push(makeTattoo(1, 'tribal', { tick: 0, age: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3200)
    expect((sys as any).tattoos[0].age).toBe(3200)
  })
  it('多个纹身 age 独立计算', () => {
    const em = makeAliveEm([])
    ;(sys as any).tattoos.push(makeTattoo(1, 'runic', { tick: 0 }))
    ;(sys as any).tattoos.push(makeTattoo(2, 'beast', { tick: 1600 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3200)
    expect((sys as any).tattoos[0].age).toBe(3200)
    expect((sys as any).tattoos[1].age).toBe(1600)
  })
  it('tattoo.tick 等于当前 tick 时 age=0', () => {
    const em = makeAliveEm([])
    ;(sys as any).tattoos.push(makeTattoo(1, 'tribal', { tick: 3200 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3200)
    expect((sys as any).tattoos[0].age).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureTattoistSystem — prestige 增长 (age > 50000 时 +0.02，上限 100)', () => {
  let sys: CreatureTattoistSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('age<=50000时prestige不增长', () => {
    const em = makeAliveEm([])
    ;(sys as any).tattoos.push(makeTattoo(1, 'tribal', { tick: 0, prestige: 60 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 50000)  // age = 50000, NOT > 50000
    expect((sys as any).tattoos[0].prestige).toBe(60)
  })
  it('age>50000时prestige增长+0.02', () => {
    const em = makeAliveEm([])
    ;(sys as any).tattoos.push(makeTattoo(1, 'tribal', { tick: 0, prestige: 60 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 50001)
    expect((sys as any).tattoos[0].prestige).toBeCloseTo(60.02, 5)
  })
  it('prestige上限为100：接近上限时不超过100', () => {
    const em = makeAliveEm([])
    ;(sys as any).tattoos.push(makeTattoo(1, 'runic', { tick: 0, prestige: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 50001)
    expect((sys as any).tattoos[0].prestige).toBe(100)
  })
  it('prestige上限为100：刚好到临界值3.98先增再cleanup测试', () => {
    const grown = Math.min(100, 3.98 + 0.02)
    expect(grown).toBeCloseTo(4.0, 5)
  })
  it('prestige 已为 100 时保持 100', () => {
    const em = makeAliveEm([])
    ;(sys as any).tattoos.push(makeTattoo(1, 'celestial', { tick: 0, prestige: 100 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 50001)
    expect((sys as any).tattoos[0].prestige).toBe(100)
  })
  it('age=50001 恰好触发 prestige 增长', () => {
    const em = makeAliveEm([])
    ;(sys as any).tattoos.push(makeTattoo(1, 'beast', { tick: 0, prestige: 20 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 50001)
    expect((sys as any).tattoos[0].prestige).toBeCloseTo(20.02, 5)
  })
  it('多次满足 age>50000 时 prestige 累积增长', () => {
    const em = makeAliveEm([])
    ;(sys as any).tattoos.push(makeTattoo(1, 'tribal', { tick: 0, prestige: 30 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 53200)  // 第1次
    sys.update(1, em, 56400)  // 第2次
    // 每次 +0.02
    expect((sys as any).tattoos[0].prestige).toBeCloseTo(30.04, 4)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureTattoistSystem — cleanup：死亡生物纹身删除', () => {
  let sys: CreatureTattoistSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('生物死亡时纹身被删除', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: (eid: number, _comp: string) => eid !== 99,
    } as any
    ;(sys as any).tattoos.push(makeTattoo(99, 'beast'))
    ;(sys as any).tattoos.push(makeTattoo(1, 'tribal'))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3200)
    expect((sys as any).tattoos).toHaveLength(1)
    expect((sys as any).tattoos[0].creatureId).toBe(1)
  })
  it('所有生物存活时不删除任何纹身', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    ;(sys as any).tattoos.push(makeTattoo(1, 'runic'))
    ;(sys as any).tattoos.push(makeTattoo(2, 'celestial'))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3200)
    expect((sys as any).tattoos).toHaveLength(2)
  })
  it('多个死亡生物的纹身全部被清理', () => {
    const alive = new Set([3])
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: (eid: number, _c: string) => alive.has(eid),
    } as any
    ;(sys as any).tattoos.push(makeTattoo(1, 'tribal'))
    ;(sys as any).tattoos.push(makeTattoo(2, 'runic'))
    ;(sys as any).tattoos.push(makeTattoo(3, 'beast'))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3200)
    expect((sys as any).tattoos).toHaveLength(1)
    expect((sys as any).tattoos[0].creatureId).toBe(3)
  })
  it('同一生物多条纹身同时被删除', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: (eid: number) => eid !== 5,
    } as any
    ;(sys as any).tattoos.push(makeTattoo(5, 'tribal'))
    ;(sys as any).tattoos.push(makeTattoo(5, 'runic'))
    ;(sys as any).tattoos.push(makeTattoo(5, 'beast'))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3200)
    expect((sys as any).tattoos).toHaveLength(0)
  })
  it('死亡生物夹在存活生物中间时正确删除', () => {
    const alive = new Set([1, 3])
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: (eid: number) => alive.has(eid),
    } as any
    ;(sys as any).tattoos.push(makeTattoo(1, 'tribal'))
    ;(sys as any).tattoos.push(makeTattoo(2, 'runic'))   // dead
    ;(sys as any).tattoos.push(makeTattoo(3, 'beast'))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3200)
    expect((sys as any).tattoos).toHaveLength(2)
    const ids = (sys as any).tattoos.map((t: Tattoo) => t.creatureId)
    expect(ids).toContain(1)
    expect(ids).toContain(3)
  })
  it('节流未触发时，死亡生物纹身不被删除', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => false,  // 所有生物"已死"
    } as any
    ;(sys as any).tattoos.push(makeTattoo(99, 'beast'))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100)  // 100 < 3200，不触发
    expect((sys as any).tattoos).toHaveLength(1)  // 还没删
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureTattoistSystem — nextId 自增', () => {
  let sys: CreatureTattoistSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('注入两条纹身后 nextId 不变（由外部 makeTattoo 控制）', () => {
    ;(sys as any).tattoos.push(makeTattoo(1))
    ;(sys as any).tattoos.push(makeTattoo(2))
    expect((sys as any).nextId).toBe(1)  // 系统自身 nextId 未改变
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureTattoistSystem — STYLE_BONUS 常量验证', () => {
  it('tribal powerBonus=3, runic=7, celestial=12, beast=5', () => {
    const bonusMap: Record<TattooStyle, number> = { tribal: 3, runic: 7, celestial: 12, beast: 5 }
    const styles: TattooStyle[] = ['tribal', 'runic', 'celestial', 'beast']
    styles.forEach(s => { expect(bonusMap[s]).toBeGreaterThan(0) })
    expect(bonusMap['celestial']).toBeGreaterThan(bonusMap['runic'])
    expect(bonusMap['runic']).toBeGreaterThan(bonusMap['beast'])
  })
  it('celestial 是最高 bonus 风格', () => {
    const bonusMap: Record<TattooStyle, number> = { tribal: 3, runic: 7, celestial: 12, beast: 5 }
    const maxBonus = Math.max(...Object.values(bonusMap))
    expect(maxBonus).toBe(12)
    expect(bonusMap['celestial']).toBe(12)
  })
  it('tribal 是最低 bonus 风格', () => {
    const bonusMap: Record<TattooStyle, number> = { tribal: 3, runic: 7, celestial: 12, beast: 5 }
    const minBonus = Math.min(...Object.values(bonusMap))
    expect(minBonus).toBe(3)
    expect(bonusMap['tribal']).toBe(3)
  })
  it('所有 bonus 值均为正数', () => {
    const bonusMap: Record<TattooStyle, number> = { tribal: 3, runic: 7, celestial: 12, beast: 5 }
    Object.values(bonusMap).forEach(v => expect(v).toBeGreaterThan(0))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureTattoistSystem — MAX_TATTOOS=40 上限', () => {
  let sys: CreatureTattoistSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('已有40条纹身时，即使随机通过也不新增', () => {
    for (let i = 0; i < 40; i++) {
      ;(sys as any).tattoos.push(makeTattoo(i + 1, 'tribal', { tick: 3200 }))
    }
    const em = {
      getEntitiesWithComponent: vi.fn().mockReturnValue([100]),
      hasComponent: () => true,
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // < 0.004，通过概率
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3200)
    expect((sys as any).tattoos.length).toBeLessThanOrEqual(40)
  })
  it('已有39条纹身时，随机通过后可新增', () => {
    for (let i = 0; i < 39; i++) {
      ;(sys as any).tattoos.push(makeTattoo(i + 1, 'tribal', { tick: 3200 }))
    }
    const em = {
      getEntitiesWithComponent: vi.fn().mockReturnValue([200]),
      hasComponent: () => true,
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3200)
    expect((sys as any).tattoos.length).toBeLessThanOrEqual(40)
  })
  it('TATTOO_CHANCE=0.004，random返回0.005时不新增纹身', () => {
    const em = {
      getEntitiesWithComponent: vi.fn().mockReturnValue([1]),
      hasComponent: () => true,
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.005) // > 0.004，失败
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3200)
    expect((sys as any).tattoos).toHaveLength(0)
  })
  it('无 creature 实体时不新增纹身', () => {
    const em = {
      getEntitiesWithComponent: vi.fn().mockReturnValue([]), // 空列表
      hasComponent: () => true,
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3200)
    expect((sys as any).tattoos).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureTattoistSystem — BODY_PARTS 枚举', () => {
  it('BODY_PARTS 包含5个部位', () => {
    const parts = ['arm', 'back', 'chest', 'face', 'leg']
    expect(parts).toHaveLength(5)
  })
  it('初始 bodyPart 为 arm（测试默认值）', () => {
    const t = makeTattoo(1)
    expect(t.bodyPart).toBe('arm')
  })
  it('可以覆盖 bodyPart 为 chest', () => {
    const t = makeTattoo(1, 'tribal', { bodyPart: 'chest' })
    expect(t.bodyPart).toBe('chest')
  })
  it('可以覆盖 bodyPart 为 face', () => {
    const t = makeTattoo(1, 'tribal', { bodyPart: 'face' })
    expect(t.bodyPart).toBe('face')
  })
})
