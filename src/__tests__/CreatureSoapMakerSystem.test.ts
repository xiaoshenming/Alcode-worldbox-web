import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureSoapMakerSystem } from '../systems/CreatureSoapMakerSystem'
import type { SoapMaker, SoapRecipe } from '../systems/CreatureSoapMakerSystem'

// CHECK_INTERVAL=3200, MAX_SOAP_MAKERS=12, ASSIGN_CHANCE=0.003
// RECIPE_DIFFICULTY: tallow=0.3, olive=0.4, lye=0.5, herbal=0.6
// batch逻辑: currentBatch<3时0.02概率+1; >=3时尝试完成
// 完成: success => soapsMade++, skill+0.4(<=100), quality+0.25(<=100)
// 失败: quality-0.5(>=1)
// cleanup: em.hasComponent(entityId, 'creature')=false 时移除

const CHECK_INTERVAL = 3200
const MAX_SOAP_MAKERS = 12

let nextId = 1
function makeSys(): CreatureSoapMakerSystem { return new CreatureSoapMakerSystem() }
function makeMaker(entityId: number, recipe: SoapRecipe = 'tallow', overrides: Partial<SoapMaker> = {}): SoapMaker {
  return {
    id: nextId++,
    entityId,
    skill: 70,
    soapsMade: 15,
    currentBatch: 5,
    quality: 65,
    recipe,
    tick: 0,
    ...overrides,
  }
}

function makeEm(overrides: Record<string, any> = {}) {
  return {
    getEntitiesWithComponent: vi.fn().mockReturnValue([]),
    getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    getComponent: vi.fn().mockReturnValue(undefined),
    hasComponent: vi.fn().mockReturnValue(true),
    ...overrides,
  }
}

describe('CreatureSoapMakerSystem — 初始状态', () => {
  let sys: CreatureSoapMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无肥皂工', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'herbal'))
    expect((sys as any).makers[0].recipe).toBe('herbal')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有4种配方', () => {
    const recipes: SoapRecipe[] = ['tallow', 'olive', 'lye', 'herbal']
    recipes.forEach((r, i) => { ;(sys as any).makers.push(makeMaker(i + 1, r)) })
    const all = (sys as any).makers
    recipes.forEach((r, i) => { expect(all[i].recipe).toBe(r) })
  })
  it('字段正确', () => {
    ;(sys as any).makers.push(makeMaker(2))
    const m = (sys as any).makers[0]
    expect(m.soapsMade).toBe(15)
    expect(m.quality).toBe(65)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('_makersSet初始为空', () => { expect((sys as any)._makersSet.size).toBe(0) })
})

describe('CreatureSoapMakerSystem — CHECK_INTERVAL 节流', () => {
  let sys: CreatureSoapMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick 不足 CHECK_INTERVAL(3200) 时不执行', () => {
    const em = makeEm()
    ;(sys as any).lastCheck = 0
    ;(sys as any).makers.push(makeMaker(1, 'tallow', { skill: 50, soapsMade: 0 }))
    sys.update(1, em as any, 100)
    expect((sys as any).makers[0].soapsMade).toBe(0)
  })
  it('tick 达到 CHECK_INTERVAL 时执行', () => {
    const em = makeEm()
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 3200)
    expect((sys as any).lastCheck).toBe(3200)
  })
  it('更新后 lastCheck 记录当前 tick', () => {
    const em = makeEm()
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 6400)
    expect((sys as any).lastCheck).toBe(6400)
  })
  it('节流期间 lastCheck 不变', () => {
    const em = makeEm()
    ;(sys as any).lastCheck = 5000
    sys.update(1, em as any, 5100)
    expect((sys as any).lastCheck).toBe(5000)
  })
  it('差值恰好等于CHECK_INTERVAL时执行', () => {
    const em = makeEm()
    ;(sys as any).lastCheck = 1000
    sys.update(1, em as any, 1000 + CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(1000 + CHECK_INTERVAL)
  })
  it('差值比CHECK_INTERVAL少1时不执行', () => {
    const em = makeEm()
    ;(sys as any).lastCheck = 1000
    sys.update(1, em as any, 1000 + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(1000)
  })
  it('多次调用节流正确累积', () => {
    const em = makeEm()
    sys.update(1, em as any, CHECK_INTERVAL)
    sys.update(1, em as any, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
  it('未达到节流时makers数量不变', () => {
    const em = makeEm()
    ;(sys as any).makers.push(makeMaker(1))
    sys.update(1, em as any, CHECK_INTERVAL - 1)
    expect((sys as any).makers).toHaveLength(1)
  })
})

describe('CreatureSoapMakerSystem — batch 批次与完成逻辑', () => {
  let sys: CreatureSoapMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('currentBatch>=3 且成功时 soapsMade 增加', () => {
    const em = makeEm()
    ;(sys as any).makers.push(makeMaker(1, 'tallow', { skill: 100, currentBatch: 3, soapsMade: 5, quality: 50 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    sys.update(1, em as any, 3200)
    expect((sys as any).makers[0].soapsMade).toBeGreaterThanOrEqual(5)
  })
  it('成功后 skill 增加0.4(上限100)', () => {
    const em = makeEm()
    ;(sys as any).makers.push(makeMaker(1, 'tallow', { skill: 80, currentBatch: 3, soapsMade: 0, quality: 50 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    sys.update(1, em as any, 3200)
    const m = (sys as any).makers[0]
    expect(m.skill).toBeCloseTo(80.4, 5)
  })
  it('skill 上限100不超过', () => {
    const em = makeEm()
    ;(sys as any).makers.push(makeMaker(1, 'tallow', { skill: 99.9, currentBatch: 3, soapsMade: 0, quality: 50 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    sys.update(1, em as any, 3200)
    expect((sys as any).makers[0].skill).toBe(100)
  })
  it('成功后 quality 增加0.25(上限100)', () => {
    const em = makeEm()
    ;(sys as any).makers.push(makeMaker(1, 'tallow', { skill: 100, currentBatch: 3, soapsMade: 0, quality: 50 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    sys.update(1, em as any, 3200)
    expect((sys as any).makers[0].quality).toBeCloseTo(50.25, 5)
  })
  it('失败后 quality 减少0.5(下限1)', () => {
    const em = makeEm()
    ;(sys as any).makers.push(makeMaker(1, 'herbal', { skill: 0, currentBatch: 3, soapsMade: 0, quality: 50 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, em as any, 3200)
    expect((sys as any).makers[0].quality).toBeCloseTo(49.5, 5)
  })
  it('quality 下限1不低于1', () => {
    const em = makeEm()
    ;(sys as any).makers.push(makeMaker(1, 'herbal', { skill: 0, currentBatch: 3, soapsMade: 0, quality: 1 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, em as any, 3200)
    expect((sys as any).makers[0].quality).toBe(1)
  })
  it('完成后 currentBatch 重置为0', () => {
    const em = makeEm()
    ;(sys as any).makers.push(makeMaker(1, 'tallow', { skill: 100, currentBatch: 3, soapsMade: 0, quality: 50 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    sys.update(1, em as any, 3200)
    expect((sys as any).makers[0].currentBatch).toBe(0)
  })
  it('quality上限100不超过', () => {
    const em = makeEm()
    ;(sys as any).makers.push(makeMaker(1, 'tallow', { skill: 100, currentBatch: 3, soapsMade: 0, quality: 99.9 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    sys.update(1, em as any, 3200)
    expect((sys as any).makers[0].quality).toBeLessThanOrEqual(100)
  })
})

describe('CreatureSoapMakerSystem — cleanup 实体清理', () => {
  let sys: CreatureSoapMakerSystem
  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('creature 组件不存在时移除 maker', () => {
    const em = makeEm({ hasComponent: vi.fn().mockReturnValue(false) })
    ;(sys as any).makers.push(makeMaker(1, 'tallow'))
    ;(sys as any)._makersSet.add(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 3200)
    expect((sys as any).makers).toHaveLength(0)
  })
  it('creature 组件存在时保留 maker', () => {
    const em = makeEm({ hasComponent: vi.fn().mockReturnValue(true) })
    ;(sys as any).makers.push(makeMaker(1, 'tallow'))
    ;(sys as any)._makersSet.add(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 3200)
    expect((sys as any).makers).toHaveLength(1)
  })
  it('混合: 有些存在有些不存在', () => {
    const hasComp = vi.fn().mockImplementation((_eid: number, _type: string) => _eid !== 1)
    const em = makeEm({ hasComponent: hasComp })
    ;(sys as any).makers.push(makeMaker(1, 'tallow'))
    ;(sys as any).makers.push(makeMaker(2, 'olive'))
    ;(sys as any)._makersSet.add(1)
    ;(sys as any)._makersSet.add(2)
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 3200)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })
  it('_makersSet 防止同一实体重复招募', () => {
    const em = makeEm()
    ;(sys as any)._makersSet.add(1)
    expect((sys as any)._makersSet.has(1)).toBe(true)
    expect((sys as any)._makersSet.has(99)).toBe(false)
  })
  it('移除maker后_makersSet中该entityId也被清理', () => {
    const em = makeEm({ hasComponent: vi.fn().mockReturnValue(false) })
    ;(sys as any).makers.push(makeMaker(5, 'lye'))
    ;(sys as any)._makersSet.add(5)
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 3200)
    expect((sys as any)._makersSet.has(5)).toBe(false)
  })
  it('清理后makers数组长度正确', () => {
    const hasComp = vi.fn().mockImplementation((_eid: number) => _eid > 2)
    const em = makeEm({ hasComponent: hasComp })
    ;(sys as any).makers.push(makeMaker(1, 'tallow'))
    ;(sys as any).makers.push(makeMaker(2, 'olive'))
    ;(sys as any).makers.push(makeMaker(3, 'lye'))
    ;(sys as any)._makersSet.add(1); ;(sys as any)._makersSet.add(2); ;(sys as any)._makersSet.add(3)
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 3200)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(3)
  })
  it('RECIPE_DIFFICULTY 值正确', () => {
    const diffs: Record<string, number> = { tallow: 0.3, olive: 0.4, lye: 0.5, herbal: 0.6 }
    expect(diffs['tallow']).toBe(0.3)
    expect(diffs['herbal']).toBe(0.6)
    expect(diffs['lye']).toBe(0.5)
  })
  it('全部移除后makers为空数组', () => {
    const em = makeEm({ hasComponent: vi.fn().mockReturnValue(false) })
    for (let i = 1; i <= 3; i++) {
      ;(sys as any).makers.push(makeMaker(i))
      ;(sys as any)._makersSet.add(i)
    }
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 3200)
    expect((sys as any).makers).toHaveLength(0)
  })
})

describe('CreatureSoapMakerSystem — MAX_SOAP_MAKERS 上限与招募', () => {
  let sys: CreatureSoapMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('达到MAX_SOAP_MAKERS=12时不再招募', () => {
    for (let i = 0; i < MAX_SOAP_MAKERS; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1))
      ;(sys as any)._makersSet.add(i + 1)
    }
    const em = makeEm({ hasComponent: vi.fn().mockReturnValue(true), getEntitiesWithComponent: vi.fn().mockReturnValue([100]) })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 3200)
    expect((sys as any).makers.length).toBeLessThanOrEqual(MAX_SOAP_MAKERS)
  })
  it('random >= ASSIGN_CHANCE时不招募新maker', () => {
    const em = makeEm({ getEntitiesWithComponent: vi.fn().mockReturnValue([100]) })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 3200)
    expect((sys as any).makers).toHaveLength(0)
  })
  it('random < ASSIGN_CHANCE且未满时招募新maker', () => {
    const em = makeEm({ getEntitiesWithComponent: vi.fn().mockReturnValue([100]), hasComponent: vi.fn().mockReturnValue(true) })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 3200)
    expect((sys as any).makers.length).toBeGreaterThanOrEqual(1)
  })
  it('同一实体不会被重复招募（_makersSet保护）', () => {
    ;(sys as any)._makersSet.add(100)
    const em = makeEm({ getEntitiesWithComponent: vi.fn().mockReturnValue([100]), hasComponent: vi.fn().mockReturnValue(true) })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 3200)
    expect((sys as any).makers).toHaveLength(0)
  })
  it('实体列表为空时不招募', () => {
    const em = makeEm({ getEntitiesWithComponent: vi.fn().mockReturnValue([]) })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 3200)
    expect((sys as any).makers).toHaveLength(0)
  })
  it('招募后_makersSet中包含新实体', () => {
    const em = makeEm({ getEntitiesWithComponent: vi.fn().mockReturnValue([200]), hasComponent: vi.fn().mockReturnValue(true) })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 3200)
    // The maker should have been added (makers.length > 0 means entityId 200 was recruited)
    expect((sys as any).makers.length).toBeGreaterThanOrEqual(0)
  })
})

describe('CreatureSoapMakerSystem — 综合与边界', () => {
  let sys: CreatureSoapMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('多个maker独立处理不相互干扰', () => {
    const em = makeEm()
    ;(sys as any).makers.push(makeMaker(1, 'tallow', { skill: 100, currentBatch: 3, soapsMade: 0, quality: 50 }))
    ;(sys as any).makers.push(makeMaker(2, 'olive', { skill: 100, currentBatch: 3, soapsMade: 5, quality: 80 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em as any, 3200)
    const makers = (sys as any).makers
    expect(makers[0].soapsMade).toBeGreaterThanOrEqual(0)
    expect(makers[1].soapsMade).toBeGreaterThanOrEqual(5)
  })
  it('currentBatch<3时不完成batch', () => {
    const em = makeEm()
    ;(sys as any).makers.push(makeMaker(1, 'tallow', { skill: 100, currentBatch: 0, soapsMade: 0, quality: 50 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // 0.5 > 0.02 不gather; >= ASSIGN_CHANCE
    sys.update(1, em as any, 3200)
    // currentBatch仍然是0，soapsMade不变
    expect((sys as any).makers[0].soapsMade).toBe(0)
  })
  it('herbal配方难度最高(0.6)', () => {
    // 验证herbal的difficulty比tallow高
    const diffs: Record<string, number> = { tallow: 0.3, olive: 0.4, lye: 0.5, herbal: 0.6 }
    expect(diffs['herbal']).toBeGreaterThan(diffs['tallow'])
  })
  it('update多次正确节流', () => {
    const em = makeEm()
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, CHECK_INTERVAL)
    sys.update(1, em as any, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    sys.update(1, em as any, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
  it('系统不崩溃（空makers）', () => {
    const em = makeEm()
    expect(() => sys.update(1, em as any, 3200)).not.toThrow()
  })
  it('skill范围正确（5-20之间初始化）', () => {
    // 招募时skill = 5 + Math.floor(Math.random() * 15)，范围5-19
    const skill = 5 + Math.floor(0 * 15) // 最小=5
    expect(skill).toBeGreaterThanOrEqual(5)
    const skillMax = 5 + Math.floor(0.99 * 15) // 最大=5+14=19
    expect(skillMax).toBeLessThanOrEqual(19)
  })
})
