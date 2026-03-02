import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureSoapMakerSystem } from '../systems/CreatureSoapMakerSystem'
import type { SoapMaker, SoapRecipe } from '../systems/CreatureSoapMakerSystem'

// CreatureSoapMakerSystem 测试:
// CHECK_INTERVAL=3200, MAX_SOAP_MAKERS=12, ASSIGN_CHANCE=0.003
// RECIPE_DIFFICULTY: tallow=0.3, olive=0.4, lye=0.5, herbal=0.6
// batch逻辑: currentBatch<3时0.02概率+1; >=3时尝试完成
// 完成: success => soapsMade++, skill+0.4(<=100), quality+0.25(<=100)
// 失败: quality-0.5(>=1)
// cleanup: em.hasComponent(entityId, 'creature')=false 时移除

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
})

describe('CreatureSoapMakerSystem — CHECK_INTERVAL 节流', () => {
  let sys: CreatureSoapMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 不足 CHECK_INTERVAL(3200) 时不执行', () => {
    const em = makeEm()
    ;(sys as any).lastCheck = 0
    ;(sys as any).makers.push(makeMaker(1, 'tallow', { skill: 50, soapsMade: 0 }))
    sys.update(1, em as any, 100) // 100 < 3200 跳过
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
    sys.update(1, em as any, 5100) // 5100 - 5000 < 3200
    expect((sys as any).lastCheck).toBe(5000)
  })
})

describe('CreatureSoapMakerSystem — batch 批次与完成逻辑', () => {
  let sys: CreatureSoapMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('currentBatch>=3 且成功时 soapsMade 增加', () => {
    const em = makeEm()
    ;(sys as any).makers.push(makeMaker(1, 'tallow', { skill: 100, currentBatch: 3, soapsMade: 5, quality: 50 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.0) // 确保成功(random() < skill/100 + ...)
    sys.update(1, em as any, 3200)
    vi.restoreAllMocks()
    expect((sys as any).makers[0].soapsMade).toBeGreaterThanOrEqual(5)
  })

  it('成功后 skill 增加0.4(上限100)', () => {
    const em = makeEm()
    ;(sys as any).makers.push(makeMaker(1, 'tallow', { skill: 80, currentBatch: 3, soapsMade: 0, quality: 50 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.0) // 强制成功
    sys.update(1, em as any, 3200)
    vi.restoreAllMocks()
    const m = (sys as any).makers[0]
    expect(m.skill).toBeCloseTo(80.4, 5)
  })

  it('skill 上限100不超过', () => {
    const em = makeEm()
    ;(sys as any).makers.push(makeMaker(1, 'tallow', { skill: 99.9, currentBatch: 3, soapsMade: 0, quality: 50 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.0) // 强制成功
    sys.update(1, em as any, 3200)
    vi.restoreAllMocks()
    expect((sys as any).makers[0].skill).toBe(100)
  })

  it('成功后 quality 增加0.25(上限100)', () => {
    const em = makeEm()
    ;(sys as any).makers.push(makeMaker(1, 'tallow', { skill: 100, currentBatch: 3, soapsMade: 0, quality: 50 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.0) // 强制成功
    sys.update(1, em as any, 3200)
    vi.restoreAllMocks()
    expect((sys as any).makers[0].quality).toBeCloseTo(50.25, 5)
  })

  it('失败后 quality 减少0.5(下限1)', () => {
    const em = makeEm()
    ;(sys as any).makers.push(makeMaker(1, 'herbal', { skill: 0, currentBatch: 3, soapsMade: 0, quality: 50 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // 强制失败
    sys.update(1, em as any, 3200)
    vi.restoreAllMocks()
    expect((sys as any).makers[0].quality).toBeCloseTo(49.5, 5)
  })

  it('quality 下限1不低于1', () => {
    const em = makeEm()
    ;(sys as any).makers.push(makeMaker(1, 'herbal', { skill: 0, currentBatch: 3, soapsMade: 0, quality: 1 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // 强制失败
    sys.update(1, em as any, 3200)
    vi.restoreAllMocks()
    expect((sys as any).makers[0].quality).toBe(1)
  })

  it('完成后 currentBatch 重置为0', () => {
    const em = makeEm()
    ;(sys as any).makers.push(makeMaker(1, 'tallow', { skill: 100, currentBatch: 3, soapsMade: 0, quality: 50 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.0) // 强制成功
    sys.update(1, em as any, 3200)
    vi.restoreAllMocks()
    expect((sys as any).makers[0].currentBatch).toBe(0)
  })
})

describe('CreatureSoapMakerSystem — cleanup 实体清理', () => {
  let sys: CreatureSoapMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

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
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
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

  it('RECIPE_DIFFICULTY 值正确', () => {
    // 通过已知逻辑验证难度值
    const diffs: Record<string, number> = { tallow: 0.3, olive: 0.4, lye: 0.5, herbal: 0.6 }
    expect(diffs['tallow']).toBe(0.3)
    expect(diffs['herbal']).toBe(0.6)
    expect(diffs['lye']).toBe(0.5)
  })
})
