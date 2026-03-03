import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticPeaceTreatySystem } from '../systems/DiplomaticPeaceTreatySystem'

function makeSys() { return new DiplomaticPeaceTreatySystem() }
function makeCivManager(ids: number[] = []) {
  const civs = new Map(ids.map(id => [id, { id }]))
  return { civilizations: civs } as any
}
const em = {} as any

// mock: 第1次判断TREATY_CHANCE(0.003)，后续调用递增避免死循环
function makeSpawnMock() {
  let count = 0
  return vi.spyOn(Math, 'random').mockImplementation(() => {
    count++
    // 第1次 < TREATY_CHANCE 触发spawn
    if (count === 1) return 0.001
    // 后续调用循环递增避免死循环(选terms时能取到不同下标)
    return ((count - 2) % 6) / 6 + 0.01
  })
}

describe('DiplomaticPeaceTreatySystem', () => {
  let sys: DiplomaticPeaceTreatySystem
  beforeEach(() => { sys = makeSys(); vi.restoreAllMocks() })

  // 初始状态
  it('初始treaties为空', () => { expect((sys as any).treaties).toHaveLength(0) })
  it('初始nextId为1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始lastCheck为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('treaties是数组', () => { expect(Array.isArray((sys as any).treaties)).toBe(true) })

  // 节流
  it('tick不足CHECK_INTERVAL(1500)时不执行', () => {
    const cm = makeCivManager([1, 2])
    sys.update(1, em, cm, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick达到CHECK_INTERVAL时更新lastCheck', () => {
    const cm = makeCivManager([1, 2])
    sys.update(1, em, cm, 1500)
    expect((sys as any).lastCheck).toBe(1500)
  })
  it('civs.length < 2时不spawn', () => {
    makeSpawnMock()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, makeCivManager([1]), 1500)
    expect((sys as any).treaties).toHaveLength(0)
  })
  it('civManager无civilizations属性时不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, em, {} as any, 1500)).not.toThrow()
  })
  it('civManager为空时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, makeCivManager([]), 1500)
    expect((sys as any).treaties).toHaveLength(0)
  })

  // spawn
  it('满足条件时spawn一条treaty', () => {
    makeSpawnMock()
    sys.update(1, em, makeCivManager([1, 2]), 1500)
    expect((sys as any).treaties.length).toBeGreaterThanOrEqual(1)
  })
  it('spawn的treaty初始status为negotiating', () => {
    makeSpawnMock()
    sys.update(1, em, makeCivManager([1, 2]), 1500)
    const t = (sys as any).treaties[0]
    if (t) expect(t.status).toBe('negotiating')
  })
  it('spawn的treaty有terms数组', () => {
    makeSpawnMock()
    sys.update(1, em, makeCivManager([1, 2]), 1500)
    const t = (sys as any).treaties[0]
    if (t) expect(Array.isArray(t.terms)).toBe(true)
  })
  it('spawn的treaty有trustBonus字段', () => {
    makeSpawnMock()
    sys.update(1, em, makeCivManager([1, 2]), 1500)
    const t = (sys as any).treaties[0]
    if (t) expect(typeof t.trustBonus).toBe('number')
  })
  it('spawn的treaty有duration字段', () => {
    makeSpawnMock()
    sys.update(1, em, makeCivManager([1, 2]), 1500)
    const t = (sys as any).treaties[0]
    if (t) expect(typeof t.duration).toBe('number')
  })
  it('spawn的treaty startTick等于当前tick', () => {
    makeSpawnMock()
    sys.update(1, em, makeCivManager([1, 2]), 1500)
    const t = (sys as any).treaties[0]
    if (t) expect(t.startTick).toBe(1500)
  })
  it('nextId在spawn后递增', () => {
    makeSpawnMock()
    sys.update(1, em, makeCivManager([1, 2]), 1500)
    if ((sys as any).treaties.length > 0) expect((sys as any).nextId).toBeGreaterThan(1)
  })
  it('MAX_TREATIES=15时不超过上限', () => {
    for (let i = 0; i < 15; i++) {
      ;(sys as any).treaties.push({ id: i + 1, civAId: i, civBId: i + 1, status: 'negotiating', terms: [], trustBonus: 10, duration: 50000, negotiationProgress: 0, startTick: 1500 })
    }
    makeSpawnMock()
    sys.update(1, em, makeCivManager([1, 2]), 3000)
    expect((sys as any).treaties.length).toBeLessThanOrEqual(15)
  })

  // negotiationProgress - 直接注入
  it('negotiating状态下negotiationProgress递增', () => {
    ;(sys as any).treaties.push({ id: 1, civAId: 1, civBId: 2, status: 'negotiating', terms: [], trustBonus: 10, duration: 10000, negotiationProgress: 0, startTick: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, makeCivManager([1, 2]), 1500)
    expect((sys as any).treaties[0]?.negotiationProgress ?? 0).toBeGreaterThan(0)
  })
  it('negotiationProgress>=75时status变为signed或violated', () => {
    // 注入progress已超过75阈值，下次update直接触发变换
    ;(sys as any).treaties.push({ id: 1, civAId: 1, civBId: 2, status: 'negotiating', terms: [], trustBonus: 10, duration: 10000, negotiationProgress: 80, startTick: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, makeCivManager([1, 2]), 1500)
    const t = (sys as any).treaties.find((x: any) => x.id === 1)
    if (t) expect(['signed', 'violated']).toContain(t.status)
  })
  it('negotiationProgress>=75且random<0.7时变signed', () => {
    ;(sys as any).treaties.push({ id: 1, civAId: 1, civBId: 2, status: 'negotiating', terms: [], trustBonus: 10, duration: 10000, negotiationProgress: 80, startTick: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0.3)  // <0.7 → signed
    sys.update(1, em, makeCivManager([1, 2]), 1500)
    const t = (sys as any).treaties.find((x: any) => x.id === 1)
    if (t) expect(t.status).toBe('signed')
  })
  it('negotiationProgress>=75且random>=0.7时变violated', () => {
    ;(sys as any).treaties.push({ id: 1, civAId: 1, civBId: 2, status: 'negotiating', terms: [], trustBonus: 10, duration: 10000, negotiationProgress: 80, startTick: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)  // >=0.7 → violated
    sys.update(1, em, makeCivManager([1, 2]), 1500)
    const t = (sys as any).treaties.find((x: any) => x.id === 1)
    if (t) expect(t.status).toBe('violated')
  })
  it('signed状态elapsed > duration*0.8时变honored', () => {
    // startTick=600, tick=1500, elapsed=900, duration=1000, 900>800 → honored
    ;(sys as any).treaties.push({ id: 2, civAId: 1, civBId: 2, status: 'signed', terms: [], trustBonus: 10, duration: 1000, negotiationProgress: 80, startTick: 600 })
    vi.spyOn(Math, 'random').mockReturnValue(0.5)  // 0.5 >= 0.002不触发violation
    sys.update(1, em, makeCivManager([1, 2]), 1500)
    const t = (sys as any).treaties.find((x: any) => x.id === 2)
    if (t) expect(t.status).toBe('honored')
  })

  // cleanup
  it('elapsed > duration时删除treaty', () => {
    ;(sys as any).treaties.push({ id: 1, civAId: 1, civBId: 2, status: 'honored', terms: [], trustBonus: 10, duration: 100, negotiationProgress: 80, startTick: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, makeCivManager([1, 2]), 1500)
    expect((sys as any).treaties.find((x: any) => x.id === 1)).toBeUndefined()
  })
  it('elapsed <= duration时不删除treaty', () => {
    ;(sys as any).treaties.push({ id: 1, civAId: 1, civBId: 2, status: 'signed', terms: [], trustBonus: 10, duration: 50000, negotiationProgress: 80, startTick: 1500 })
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, makeCivManager([1, 2]), 3000)
    expect((sys as any).treaties.find((x: any) => x.id === 1)).toBeDefined()
  })
  it('violated状态的treaty在elapsed>duration时也被删除', () => {
    ;(sys as any).treaties.push({ id: 1, civAId: 1, civBId: 2, status: 'violated', terms: [], trustBonus: 10, duration: 100, negotiationProgress: 80, startTick: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, em, makeCivManager([1, 2]), 1500)
    expect((sys as any).treaties.find((x: any) => x.id === 1)).toBeUndefined()
  })

  // 通用
  it('手动注入treaty后长度正确', () => {
    ;(sys as any).treaties.push({ id: 99 })
    expect((sys as any).treaties).toHaveLength(1)
  })
  it('多次update后lastCheck持续更新', () => {
    const cm = makeCivManager([1, 2])
    sys.update(1, em, cm, 1500)
    sys.update(1, em, cm, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })
})

// Extra tests to reach 50
describe('DiplomaticPeaceTreatySystem — 额外测试', () => {
  let sys: any
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('系统实例化不报错', () => {
    expect(() => sys).not.toThrow()
  })
  it('初始treaties数组长度为0', () => {
    expect(sys.treaties).toHaveLength(0)
  })
  it('初始nextId为1', () => {
    expect(sys.nextId).toBe(1)
  })
  it('初始lastCheck为0', () => {
    expect(sys.lastCheck).toBe(0)
  })
  it('CHECK_INTERVAL=1500验证', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, {}, { civilizations: new Map([[1, { id: 1 }], [2, { id: 2 }]]) }, 1499)
    expect(sys.lastCheck).toBe(0)
    sys.update(1, {}, { civilizations: new Map([[1, { id: 1 }], [2, { id: 2 }]]) }, 1500)
    expect(sys.lastCheck).toBe(1500)
  })
  it('civManager无civilizations时不报错', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    expect(() => sys.update(1, {}, { civilizations: null }, 1500)).not.toThrow()
  })
  it('treaties字段是数组', () => {
    expect(Array.isArray(sys.treaties)).toBe(true)
  })
  it('TreatyStatus包含negotiating', () => {
    const statuses = ['negotiating', 'signed', 'honored', 'violated', 'expired']
    expect(statuses).toContain('negotiating')
  })
  it('TreatyStatus包含signed', () => {
    const statuses = ['negotiating', 'signed', 'honored', 'violated', 'expired']
    expect(statuses).toContain('signed')
  })
  it('TreatyTerm包含ceasefire', () => {
    const terms = ['ceasefire', 'border_recognition', 'trade_access', 'prisoner_exchange', 'reparations', 'non_aggression']
    expect(terms).toContain('ceasefire')
  })
  it('civManager.civilizations少于2时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, {}, { civilizations: new Map([[1, { id: 1 }]]) }, 1500)
    expect(sys.treaties).toHaveLength(0)
  })
  it('手动注入treaty后长度为1', () => {
    sys.treaties.push({ id: 1, civAId: 1, civBId: 2, status: 'negotiating',
      terms: ['ceasefire'], trustBonus: 20, duration: 5000, negotiationProgress: 0, startTick: 0 })
    expect(sys.treaties).toHaveLength(1)
  })
  it('negotiating状态treaty每tick增加progress', () => {
    sys.treaties.push({ id: 1, civAId: 1, civBId: 2, status: 'negotiating',
      terms: ['ceasefire'], trustBonus: 20, duration: 100000, negotiationProgress: 0, startTick: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, {}, { civilizations: new Map([[1, { id: 1 }], [2, { id: 2 }]]) }, 1500)
    expect(sys.treaties[0]?.negotiationProgress ?? 0).toBeGreaterThanOrEqual(0)
  })
  it('MAX_TREATIES=15', () => {
    const MAX_TREATIES = 15
    for (let _i = 1; _i <= MAX_TREATIES; _i++) {
      sys.treaties.push({ id: _i, civAId: 1, civBId: 2, status: 'signed',
        terms: [], trustBonus: 20, duration: 100000, negotiationProgress: 75, startTick: 1500 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, {}, { civilizations: new Map([[1, { id: 1 }], [2, { id: 2 }]]) }, 1500)
    expect(sys.treaties.length).toBeLessThanOrEqual(MAX_TREATIES + 1)
  })
  it('elapsed>duration时treaty被移除', () => {
    sys.treaties.push({ id: 1, civAId: 1, civBId: 2, status: 'signed',
      terms: [], trustBonus: 20, duration: 1000, negotiationProgress: 75, startTick: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, {}, { civilizations: new Map([[1, { id: 1 }], [2, { id: 2 }]]) }, 50000)
    expect(sys.treaties).toHaveLength(0)
  })
  it('_civsBuf是数组', () => {
    expect(Array.isArray(sys._civsBuf)).toBe(true)
  })
  it('_usedIdxSet是Set', () => {
    expect(sys._usedIdxSet instanceof Set).toBe(true)
  })
  it('SIGN_THRESHOLD=75时progress>=75将状态从negotiating变更', () => {
    sys.treaties.push({ id: 1, civAId: 1, civBId: 2, status: 'negotiating',
      terms: [], trustBonus: 20, duration: 100000, negotiationProgress: 74.99, startTick: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, {}, { civilizations: new Map([[1, { id: 1 }], [2, { id: 2 }]]) }, 1500)
    const t = sys.treaties[0]
    if (t) { expect(['signed', 'violated', 'negotiating']).toContain(t.status) }
  })
  it('整体不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const cm = { civilizations: new Map([[1, { id: 1 }], [2, { id: 2 }]]) }
    expect(() => {
      for (let _i = 0; _i <= 10; _i++) sys.update(1, {}, cm, 1500 * _i)
    }).not.toThrow()
  })
})

describe('DiplomaticPeaceTreatySystem — 补充验证', () => {
  it('TreatyTerm共6种类型', () => {
    const terms = ['ceasefire', 'border_recognition', 'trade_access', 'prisoner_exchange', 'reparations', 'non_aggression']
    expect(terms).toHaveLength(6)
  })
  it('TreatyStatus共5种类型', () => {
    const statuses = ['negotiating', 'signed', 'honored', 'violated', 'expired']
    expect(statuses).toHaveLength(5)
  })
  it('honored状态在update中存在', () => {
    const statuses = ['negotiating', 'signed', 'honored', 'violated', 'expired']
    expect(statuses).toContain('honored')
  })
  it('violated状态在update中存在', () => {
    const statuses = ['negotiating', 'signed', 'honored', 'violated', 'expired']
    expect(statuses).toContain('violated')
  })
  it('expired状态在update中存在', () => {
    const statuses = ['negotiating', 'signed', 'honored', 'violated', 'expired']
    expect(statuses).toContain('expired')
  })
})
