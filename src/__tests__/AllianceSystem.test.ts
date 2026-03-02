import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AllianceSystem } from '../systems/AllianceSystem'
import type { Alliance } from '../systems/AllianceSystem'

function makeAS(): AllianceSystem { return new AllianceSystem() }

function makeAlliance(id: number, members: number[], overrides: Partial<Alliance> = {}): Alliance {
  return {
    id,
    name: `Alliance-${id}`,
    members: new Set(members),
    createdTick: 0,
    isFederation: false,
    federationTick: 0,
    ...overrides,
  }
}

// 构建最小文明对象
function makeCiv(id: number, overrides: any = {}) {
  return {
    id,
    name: `Civ-${id}`,
    resources: { food: 100, wood: 80, stone: 60, gold: 40 },
    relations: new Map<number, number>(),
    techLevel: 1,
    population: 100,
    diplomaticStance: 'neutral' as const,
    research: { progress: 0 },
    ...overrides,
  }
}

function makeCivManager(civs: any[] = []) {
  const map = new Map<number, any>()
  for (const civ of Object.values(civs)) map.set((civ as any).id, civ)
  return { civilizations: map }
}

function makeEmptyMocks() {
  return {
    cm: { civilizations: new Map() },
    em: { getComponent: () => undefined, getEntitiesWithComponents: () => [] },
    world: {},
    particles: {},
  }
}

describe('AllianceSystem — 初始状态', () => {
  let as: AllianceSystem
  beforeEach(() => { as = makeAS() })
  afterEach(() => vi.restoreAllMocks())

  it('alliances初始为空数组', () => {
    expect((as as any).alliances).toHaveLength(0)
  })

  it('alliances是Array类型', () => {
    expect(Array.isArray((as as any).alliances)).toBe(true)
  })

  it('TICK_INTERVAL初始为180', () => {
    expect((as as any).TICK_INTERVAL).toBe(180)
  })

  it('FEDERATION_THRESHOLD初始为5000', () => {
    expect((as as any).FEDERATION_THRESHOLD).toBe(5000)
  })

  it('RELATION_ALLY_MIN初始为50', () => {
    expect((as as any).RELATION_ALLY_MIN).toBe(50)
  })

  it('RELATION_LEAVE_THRESHOLD初始为0', () => {
    expect((as as any).RELATION_LEAVE_THRESHOLD).toBe(0)
  })

  it('TECH_SHARE_RATE初始为0.005', () => {
    expect((as as any).TECH_SHARE_RATE).toBeCloseTo(0.005)
  })

  it('_civToAlliance初始为空Map', () => {
    expect((as as any)._civToAlliance.size).toBe(0)
  })

  it('_civsBuf初始为空数组', () => {
    expect((as as any)._civsBuf).toHaveLength(0)
  })

  it('_toRemoveBuf初始为空数组', () => {
    expect((as as any)._toRemoveBuf).toHaveLength(0)
  })
})

describe('AllianceSystem — Alliance 数据注入', () => {
  let as: AllianceSystem
  beforeEach(() => { as = makeAS() })
  afterEach(() => vi.restoreAllMocks())

  it('注入一个联盟后alliances长度为1', () => {
    ;(as as any).alliances.push(makeAlliance(1, [10, 20]))
    expect((as as any).alliances).toHaveLength(1)
  })

  it('注入多个联盟时alliances长度正确', () => {
    ;(as as any).alliances.push(makeAlliance(1, [10, 20]))
    ;(as as any).alliances.push(makeAlliance(2, [30, 40]))
    ;(as as any).alliances.push(makeAlliance(3, [50, 60, 70]))
    expect((as as any).alliances).toHaveLength(3)
  })

  it('联盟id字段正确', () => {
    ;(as as any).alliances.push(makeAlliance(5, [1, 2]))
    expect((as as any).alliances[0].id).toBe(5)
  })

  it('联盟name字段正确', () => {
    ;(as as any).alliances.push(makeAlliance(1, [1, 2], { name: 'Iron League' }))
    expect((as as any).alliances[0].name).toBe('Iron League')
  })

  it('联盟members是Set类型', () => {
    ;(as as any).alliances.push(makeAlliance(1, [10, 20]))
    expect((as as any).alliances[0].members).toBeInstanceOf(Set)
  })

  it('联盟members.has()查询正确', () => {
    ;(as as any).alliances.push(makeAlliance(1, [10, 20]))
    expect((as as any).alliances[0].members.has(10)).toBe(true)
    expect((as as any).alliances[0].members.has(20)).toBe(true)
    expect((as as any).alliances[0].members.has(99)).toBe(false)
  })

  it('isFederation默认为false', () => {
    ;(as as any).alliances.push(makeAlliance(1, [10, 20]))
    expect((as as any).alliances[0].isFederation).toBe(false)
  })

  it('isFederation可设为true', () => {
    ;(as as any).alliances.push(makeAlliance(1, [10, 20], { isFederation: true }))
    expect((as as any).alliances[0].isFederation).toBe(true)
  })

  it('federationTick默认为0', () => {
    ;(as as any).alliances.push(makeAlliance(1, [10, 20]))
    expect((as as any).alliances[0].federationTick).toBe(0)
  })

  it('federationTick可设置非零值', () => {
    ;(as as any).alliances.push(makeAlliance(1, [10, 20], { federationTick: 5000 }))
    expect((as as any).alliances[0].federationTick).toBe(5000)
  })

  it('createdTick默认为0', () => {
    ;(as as any).alliances.push(makeAlliance(1, [10, 20]))
    expect((as as any).alliances[0].createdTick).toBe(0)
  })

  it('createdTick可设置', () => {
    ;(as as any).alliances.push(makeAlliance(1, [10, 20], { createdTick: 1000 }))
    expect((as as any).alliances[0].createdTick).toBe(1000)
  })
})

describe('AllianceSystem — 成员查找逻辑', () => {
  let as: AllianceSystem
  beforeEach(() => { as = makeAS() })
  afterEach(() => vi.restoreAllMocks())

  it('civId不在任何联盟时查找返回undefined', () => {
    ;(as as any).alliances.push(makeAlliance(1, [10, 20]))
    const found = (as as any).alliances.find((a: Alliance) => a.members.has(99))
    expect(found).toBeUndefined()
  })

  it('多联盟时civId在正确联盟中', () => {
    ;(as as any).alliances.push(makeAlliance(1, [10, 20]))
    ;(as as any).alliances.push(makeAlliance(2, [30, 40]))
    const found10 = (as as any).alliances.find((a: Alliance) => a.members.has(10))
    const found30 = (as as any).alliances.find((a: Alliance) => a.members.has(30))
    expect(found10?.id).toBe(1)
    expect(found30?.id).toBe(2)
  })

  it('三成员联盟所有成员都能找到', () => {
    ;(as as any).alliances.push(makeAlliance(1, [5, 6, 7]))
    for (const id of [5, 6, 7]) {
      const found = (as as any).alliances.find((a: Alliance) => a.members.has(id))
      expect(found?.id).toBe(1)
    }
  })

  it('联盟为空时没有任何成员可找到', () => {
    const a = makeAlliance(1, [])
    ;(as as any).alliances.push(a)
    const found = (as as any).alliances.find((a: Alliance) => a.members.has(1))
    expect(found).toBeUndefined()
  })
})

describe('AllianceSystem — update() 基础行为', () => {
  let as: AllianceSystem
  beforeEach(() => { as = makeAS() })
  afterEach(() => vi.restoreAllMocks())

  it('update()空状态不崩溃', () => {
    const { cm, em, world, particles } = makeEmptyMocks()
    expect(() => as.update(cm as any, em as any, world as any, particles as any, 0)).not.toThrow()
  })

  it('tick不是180的倍数时update()直接返回', () => {
    const { cm, em, world, particles } = makeEmptyMocks()
    ;(as as any).alliances.push(makeAlliance(1, [10, 20]))
    as.update(cm as any, em as any, world as any, particles as any, 1) // tick=1 不触发
    expect((as as any).alliances).toHaveLength(1) // 未被清理
  })

  it('tick=180时update()执行清理逻辑', () => {
    const { cm, em, world, particles } = makeEmptyMocks()
    // 一个成员的联盟（size<2）应被清除
    ;(as as any).alliances.push(makeAlliance(1, [10]))
    as.update(cm as any, em as any, world as any, particles as any, 180)
    expect((as as any).alliances).toHaveLength(0)
  })

  it('tick=360时update()执行', () => {
    const { cm, em, world, particles } = makeEmptyMocks()
    expect(() => as.update(cm as any, em as any, world as any, particles as any, 360)).not.toThrow()
  })

  it('tick=0时update()执行（0 % 180 === 0）', () => {
    const { cm, em, world, particles } = makeEmptyMocks()
    expect(() => as.update(cm as any, em as any, world as any, particles as any, 0)).not.toThrow()
  })

  it('多次update()连续调用不崩溃', () => {
    const { cm, em, world, particles } = makeEmptyMocks()
    for (let i = 0; i < 5; i++) {
      expect(() => as.update(cm as any, em as any, world as any, particles as any, i * 180)).not.toThrow()
    }
  })
})

describe('AllianceSystem — cleanupDeadMembers', () => {
  let as: AllianceSystem
  beforeEach(() => { as = makeAS() })
  afterEach(() => vi.restoreAllMocks())

  it('成员文明不存在时从联盟移除', () => {
    const alliance = makeAlliance(1, [10, 20])
    ;(as as any).alliances.push(alliance)
    const cm = { civilizations: new Map([[10, makeCiv(10)]]) } // 20不存在
    const em = makeEmptyMocks().em
    as.update(cm as any, em as any, {} as any, {} as any, 180)
    expect(alliance.members.has(20)).toBe(false)
  })

  it('移除死亡成员后size<2时联盟解散', () => {
    ;(as as any).alliances.push(makeAlliance(1, [10, 20]))
    const cm = { civilizations: new Map() } // 两个成员都不存在
    const em = makeEmptyMocks().em
    as.update(cm as any, em as any, {} as any, {} as any, 180)
    expect((as as any).alliances).toHaveLength(0)
  })

  it('两个成员都存在时联盟不解散', () => {
    ;(as as any).alliances.push(makeAlliance(1, [10, 20]))
    const civ10 = makeCiv(10)
    const civ20 = makeCiv(20)
    civ10.relations.set(20, 60)
    civ20.relations.set(10, 60)
    const cm = { civilizations: new Map([[10, civ10], [20, civ20]]) }
    const em = makeEmptyMocks().em
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // 不触发随机事件
    as.update(cm as any, em as any, {} as any, {} as any, 180)
    expect((as as any).alliances).toHaveLength(1)
  })
})

describe('AllianceSystem — checkMemberLeave', () => {
  let as: AllianceSystem
  beforeEach(() => { as = makeAS() })
  afterEach(() => vi.restoreAllMocks())

  it('成员对盟友关系为负数时离开联盟', () => {
    const alliance = makeAlliance(1, [10, 20])
    ;(as as any).alliances.push(alliance)
    const civ10 = makeCiv(10)
    const civ20 = makeCiv(20)
    civ10.relations.set(20, -10) // 负关系，应离开
    civ20.relations.set(10, 60)
    const cm = { civilizations: new Map([[10, civ10], [20, civ20]]) }
    const em = makeEmptyMocks().em
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    as.update(cm as any, em as any, {} as any, {} as any, 180)
    // civ10因关系为负离开，联盟size变1，联盟解散
    expect((as as any).alliances).toHaveLength(0)
  })

  it('关系为0时成员离开（threshold=0，0 < 0 为false，不触发）', () => {
    const alliance = makeAlliance(1, [10, 20])
    ;(as as any).alliances.push(alliance)
    const civ10 = makeCiv(10)
    const civ20 = makeCiv(20)
    civ10.relations.set(20, 0) // 恰好等于threshold=0，不触发离开
    civ20.relations.set(10, 0)
    const cm = { civilizations: new Map([[10, civ10], [20, civ20]]) }
    const em = makeEmptyMocks().em
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    as.update(cm as any, em as any, {} as any, {} as any, 180)
    // 两人关系=0，都不离开，联盟继续
    expect((as as any).alliances).toHaveLength(1)
  })
})

describe('AllianceSystem — tryFederationUpgrade', () => {
  let as: AllianceSystem
  beforeEach(() => { as = makeAS() })
  afterEach(() => vi.restoreAllMocks())

  it('成员≥3且存在5000+ ticks时升级为Federation', () => {
    const alliance = makeAlliance(1, [1, 2, 3], { createdTick: 0, isFederation: false })
    ;(as as any).alliances.push(alliance)
    const civ1 = makeCiv(1); const civ2 = makeCiv(2); const civ3 = makeCiv(3)
    civ1.relations.set(2, 60); civ1.relations.set(3, 60)
    civ2.relations.set(1, 60); civ2.relations.set(3, 60)
    civ3.relations.set(1, 60); civ3.relations.set(2, 60)
    const cm = { civilizations: new Map([[1, civ1], [2, civ2], [3, civ3]]) }
    const em = makeEmptyMocks().em
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // 不触发随机战争/联盟
    // tick=5220: 5220 % 180 = 0 (触发update), 5220 >= 5000 (满足federation条件)
    as.update(cm as any, em as any, {} as any, {} as any, 5220)
    expect(alliance.isFederation).toBe(true)
  })

  it('成员<3时不升级Federation', () => {
    const alliance = makeAlliance(1, [1, 2], { createdTick: 0, isFederation: false })
    ;(as as any).alliances.push(alliance)
    const civ1 = makeCiv(1); const civ2 = makeCiv(2)
    civ1.relations.set(2, 60); civ2.relations.set(1, 60)
    const cm = { civilizations: new Map([[1, civ1], [2, civ2]]) }
    const em = makeEmptyMocks().em
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    as.update(cm as any, em as any, {} as any, {} as any, 5180)
    expect(alliance.isFederation).toBe(false)
  })

  it('tick未达到5000时不升级Federation', () => {
    const alliance = makeAlliance(1, [1, 2, 3], { createdTick: 0, isFederation: false })
    ;(as as any).alliances.push(alliance)
    const civ1 = makeCiv(1); const civ2 = makeCiv(2); const civ3 = makeCiv(3)
    civ1.relations.set(2, 60); civ1.relations.set(3, 60)
    civ2.relations.set(1, 60); civ2.relations.set(3, 60)
    civ3.relations.set(1, 60); civ3.relations.set(2, 60)
    const cm = { civilizations: new Map([[1, civ1], [2, civ2], [3, civ3]]) }
    const em = makeEmptyMocks().em
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    as.update(cm as any, em as any, {} as any, {} as any, 180) // tick=180 < 5000
    expect(alliance.isFederation).toBe(false)
  })

  it('已是Federation的联盟不重复升级', () => {
    const alliance = makeAlliance(1, [1, 2, 3], { createdTick: 0, isFederation: true, federationTick: 5000 })
    ;(as as any).alliances.push(alliance)
    const civ1 = makeCiv(1); const civ2 = makeCiv(2); const civ3 = makeCiv(3)
    civ1.relations.set(2, 60); civ1.relations.set(3, 60)
    civ2.relations.set(1, 60); civ2.relations.set(3, 60)
    civ3.relations.set(1, 60); civ3.relations.set(2, 60)
    const cm = { civilizations: new Map([[1, civ1], [2, civ2], [3, civ3]]) }
    const em = makeEmptyMocks().em
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const prevTick = alliance.federationTick
    as.update(cm as any, em as any, {} as any, {} as any, 6000)
    expect(alliance.federationTick).toBe(prevTick) // 未变
  })

  it('Federation升级后federationTick被设置', () => {
    const alliance = makeAlliance(1, [1, 2, 3], { createdTick: 0, isFederation: false })
    ;(as as any).alliances.push(alliance)
    const civ1 = makeCiv(1); const civ2 = makeCiv(2); const civ3 = makeCiv(3)
    civ1.relations.set(2, 60); civ1.relations.set(3, 60)
    civ2.relations.set(1, 60); civ2.relations.set(3, 60)
    civ3.relations.set(1, 60); civ3.relations.set(2, 60)
    const cm = { civilizations: new Map([[1, civ1], [2, civ2], [3, civ3]]) }
    const em = makeEmptyMocks().em
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    // tick=5220: 5220 % 180 = 0 (触发), 5220 >= 5000 (满足federation)
    as.update(cm as any, em as any, {} as any, {} as any, 5220)
    expect(alliance.federationTick).toBe(5220)
  })
})

describe('AllianceSystem — applyFederationBonuses', () => {
  let as: AllianceSystem
  beforeEach(() => { as = makeAS() })
  afterEach(() => vi.restoreAllMocks())

  it('Federation中低techLevel成员的research.progress增加', () => {
    const alliance = makeAlliance(1, [1, 2], { isFederation: true })
    ;(as as any).alliances.push(alliance)
    const civ1 = makeCiv(1, { techLevel: 1, research: { progress: 0 } })
    const civ2 = makeCiv(2, { techLevel: 3, research: { progress: 0 } })
    civ1.relations.set(2, 60); civ2.relations.set(1, 60)
    const cm = { civilizations: new Map([[1, civ1], [2, civ2]]) }
    const em = makeEmptyMocks().em
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    as.update(cm as any, em as any, {} as any, {} as any, 180)
    expect(civ1.research.progress).toBeGreaterThan(0)
  })

  it('非Federation联盟不应用tech bonus', () => {
    const alliance = makeAlliance(1, [1, 2], { isFederation: false })
    ;(as as any).alliances.push(alliance)
    const civ1 = makeCiv(1, { techLevel: 1, research: { progress: 0 } })
    const civ2 = makeCiv(2, { techLevel: 3, research: { progress: 0 } })
    civ1.relations.set(2, 60); civ2.relations.set(1, 60)
    const cm = { civilizations: new Map([[1, civ1], [2, civ2]]) }
    const em = makeEmptyMocks().em
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    as.update(cm as any, em as any, {} as any, {} as any, 180)
    expect(civ1.research.progress).toBe(0)
  })

  it('同techLevel时无bonus应用', () => {
    const alliance = makeAlliance(1, [1, 2], { isFederation: true })
    ;(as as any).alliances.push(alliance)
    const civ1 = makeCiv(1, { techLevel: 2, research: { progress: 0 } })
    const civ2 = makeCiv(2, { techLevel: 2, research: { progress: 0 } })
    civ1.relations.set(2, 60); civ2.relations.set(1, 60)
    const cm = { civilizations: new Map([[1, civ1], [2, civ2]]) }
    const em = makeEmptyMocks().em
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    as.update(cm as any, em as any, {} as any, {} as any, 180)
    expect(civ1.research.progress).toBe(0)
    expect(civ2.research.progress).toBe(0)
  })
})

describe('AllianceSystem — _civToAlliance 反向索引', () => {
  let as: AllianceSystem
  beforeEach(() => { as = makeAS() })
  afterEach(() => vi.restoreAllMocks())

  it('update后_civToAlliance被正确建立', () => {
    const alliance = makeAlliance(1, [10, 20])
    ;(as as any).alliances.push(alliance)
    const civ10 = makeCiv(10); const civ20 = makeCiv(20)
    civ10.relations.set(20, 60); civ20.relations.set(10, 60)
    const cm = { civilizations: new Map([[10, civ10], [20, civ20]]) }
    const em = makeEmptyMocks().em
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    as.update(cm as any, em as any, {} as any, {} as any, 180)
    const civToAlliance = (as as any)._civToAlliance
    expect(civToAlliance.get(10)).toBe(alliance)
    expect(civToAlliance.get(20)).toBe(alliance)
  })

  it('update后_civToAlliance不包含已解散联盟的成员', () => {
    ;(as as any).alliances.push(makeAlliance(1, [10])) // size=1，会被清除
    const cm = { civilizations: new Map([[10, makeCiv(10)]]) }
    const em = makeEmptyMocks().em
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    as.update(cm as any, em as any, {} as any, {} as any, 180)
    expect((as as any)._civToAlliance.get(10)).toBeUndefined()
  })

  it('初始_civToAlliance为空Map', () => {
    expect((as as any)._civToAlliance).toBeInstanceOf(Map)
    expect((as as any)._civToAlliance.size).toBe(0)
  })
})

describe('AllianceSystem — Alliance 接口字段完整性', () => {
  afterEach(() => vi.restoreAllMocks())

  it('Alliance接口包含id字段', () => {
    const a = makeAlliance(42, [1, 2])
    expect(a.id).toBe(42)
  })

  it('Alliance接口包含name字段', () => {
    const a = makeAlliance(1, [1, 2], { name: 'Storm Alliance' })
    expect(a.name).toBe('Storm Alliance')
  })

  it('Alliance接口members是Set<number>', () => {
    const a = makeAlliance(1, [5, 10])
    expect(a.members).toBeInstanceOf(Set)
    expect(a.members.size).toBe(2)
  })

  it('Alliance接口createdTick为数字', () => {
    const a = makeAlliance(1, [1, 2], { createdTick: 999 })
    expect(typeof a.createdTick).toBe('number')
    expect(a.createdTick).toBe(999)
  })

  it('Alliance接口isFederation为布尔', () => {
    const a = makeAlliance(1, [1, 2])
    expect(typeof a.isFederation).toBe('boolean')
  })

  it('Alliance接口federationTick为数字', () => {
    const a = makeAlliance(1, [1, 2], { federationTick: 12345 })
    expect(typeof a.federationTick).toBe('number')
  })

  it('makeAlliance正确展开overrides', () => {
    const a = makeAlliance(1, [1, 2], { isFederation: true, federationTick: 7000, name: 'Golden Federation' })
    expect(a.isFederation).toBe(true)
    expect(a.federationTick).toBe(7000)
    expect(a.name).toBe('Golden Federation')
  })
})
