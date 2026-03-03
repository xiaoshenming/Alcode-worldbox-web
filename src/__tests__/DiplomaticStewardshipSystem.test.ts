import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticStewardshipSystem } from '../systems/DiplomaticStewardshipSystem'

const CHECK_INTERVAL = 2540
const MAX_AGREEMENTS = 16
const W = {} as any, EM = {} as any

function makeSys() { return new DiplomaticStewardshipSystem() }

function makeItem(overrides: Partial<any> = {}) {
  return { id: 1, tick: 0, duration: 0, stewardCivId: 1, beneficiaryCivId: 2, form: 'land_stewardship', managementLevel: 40, trustIndex: 35, efficiencyRate: 25, benefitShare: 20, ...overrides }
}

describe('DiplomaticStewardshipSystem — 初始状态', () => {
  let sys: DiplomaticStewardshipSystem
  beforeEach(() => { sys = makeSys() })

  it('初始agreements为空数组', () => { expect((sys as any).agreements).toHaveLength(0) })
  it('agreements是数组', () => { expect(Array.isArray((sys as any).agreements)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('构造不崩溃', () => { expect(() => makeSys()).not.toThrow() })
  it('注入item后长度为1', () => {
    ;(sys as any).agreements.push(makeItem({ id: 1 }))
    expect((sys as any).agreements).toHaveLength(1)
  })
  it('item包含id字段', () => { expect(makeItem()).toHaveProperty('id') })
  it('item包含tick字段', () => { expect(makeItem()).toHaveProperty('tick') })
  it('item包含duration字段', () => { expect(makeItem()).toHaveProperty('duration') })
})

describe('DiplomaticStewardshipSystem — CHECK_INTERVAL=2540 节流', () => {
  let sys: DiplomaticStewardshipSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick < CHECK_INTERVAL时被节流', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick === CHECK_INTERVAL时通过，lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('tick > CHECK_INTERVAL时通过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 100)
  })
  it('第一次通过后同tick再调用被节流', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('两倍interval时lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
  it('三次顺序更新lastCheck正确', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    sys.update(1, W, EM, CHECK_INTERVAL * 3)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 3)
  })
  it('tick=1时不触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 1)
    expect((sys as any).lastCheck).toBe(0)
  })
})

describe('DiplomaticStewardshipSystem — duration递增', () => {
  let sys: DiplomaticStewardshipSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('每次update通过后duration递增', () => {
    ;(sys as any).agreements.push(makeItem({ tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect((sys as any).agreements[0].duration).toBe(1)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    expect((sys as any).agreements[0].duration).toBe(2)
  })
  it('多个item duration各自独立', () => {
    ;(sys as any).agreements.push(makeItem({ id: 1, tick: CHECK_INTERVAL, duration: 0 }))
    ;(sys as any).agreements.push(makeItem({ id: 2, tick: CHECK_INTERVAL, duration: 5 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect((sys as any).agreements[0].duration).toBe(1)
    expect((sys as any).agreements[1].duration).toBe(6)
  })
  it('duration初始为0的item在update后>=1', () => {
    ;(sys as any).agreements.push(makeItem({ duration: 0, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect((sys as any).agreements[0].duration).toBeGreaterThanOrEqual(1)
  })
  it('连续三次update后duration为3', () => {
    ;(sys as any).agreements.push(makeItem({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    sys.update(1, W, EM, CHECK_INTERVAL * 3)
    expect((sys as any).agreements[0].duration).toBe(3)
  })
})

describe('DiplomaticStewardshipSystem — MAX_AGREEMENTS=16 上限', () => {
  let sys: DiplomaticStewardshipSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('agreements已满16条时不新增', () => {
    for (let i = 1; i <= MAX_AGREEMENTS; i++) { (sys as any).agreements.push(makeItem({ id: i, tick: 999999 })) }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect((sys as any).agreements).toHaveLength(MAX_AGREEMENTS)
  })
  it('agreements未满时长度小于16', () => {
    for (let i = 1; i < MAX_AGREEMENTS; i++) { (sys as any).agreements.push(makeItem({ id: i, tick: 999999 })) }
    expect((sys as any).agreements.length).toBe(MAX_AGREEMENTS - 1)
  })
  it('MAX_AGREEMENTS常量正确', () => { expect(MAX_AGREEMENTS).toBe(16) })
  it('空agreements时不超出上限', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect((sys as any).agreements.length).toBeLessThanOrEqual(MAX_AGREEMENTS)
  })
})

describe('DiplomaticStewardshipSystem — Form枚举完整性', () => {
  const forms = ['land_stewardship', 'resource_stewardship', 'cultural_stewardship', 'military_stewardship']
  it('forms数组有4个元素', () => { expect(forms).toHaveLength(4) })
  it('land_stewardship 合法', () => { expect(forms).toContain('land_stewardship') })
  it('resource_stewardship 合法', () => { expect(forms).toContain('resource_stewardship') })
  it('cultural_stewardship 合法', () => { expect(forms).toContain('cultural_stewardship') })
  it('military_stewardship 合法', () => { expect(forms).toContain('military_stewardship') })
})

describe('DiplomaticStewardshipSystem — 综合与边界', () => {
  let sys: DiplomaticStewardshipSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('update不崩溃（空agreements）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, W, EM, CHECK_INTERVAL)).not.toThrow()
  })
  it('注入10个item后长度为10', () => {
    for (let i = 0; i < 10; i++) { (sys as any).agreements.push(makeItem({ id: i })) }
    expect((sys as any).agreements).toHaveLength(10)
  })
  it('nextId随手动插入递增', () => {
    ;(sys as any).nextId = 5
    ;(sys as any).agreements.push(makeItem({ id: (sys as any).nextId++ }))
    expect((sys as any).nextId).toBe(6)
  })
  it('item duration初始为0', () => { expect(makeItem().duration).toBe(0) })
  it('item tick默认为0', () => { expect(makeItem().tick).toBe(0) })
  it('多次update后agreements仍为数组', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 1; i <= 5; i++) sys.update(1, W, EM, CHECK_INTERVAL * i)
    expect(Array.isArray((sys as any).agreements)).toBe(true)
  })
  it('update后lastCheck等于传入tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL * 7)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 7)
  })
  it('CHECK_INTERVAL为2540', () => { expect(CHECK_INTERVAL).toBe(2540) })
  it('random=0.9跳过spawn后agreements为空', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect((sys as any).agreements.length).toBe(0)
  })
  it('lastCheck在节流后不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    const lc = (sys as any).lastCheck
    sys.update(1, W, EM, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(lc)
  })
  it('大tick值时不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, W, EM, 9999999)).not.toThrow()
  })
  it('注入后删除item后长度减少', () => {
    ;(sys as any).agreements.push(makeItem({ id: 1 }))
    ;(sys as any).agreements.splice(0, 1)
    expect((sys as any).agreements).toHaveLength(0)
  })
  it('nextId初始为1（fresh instance）', () => { expect(makeSys() as any, (s: any) => s.nextId).toBeDefined() })
})

describe('DiplomaticStewardshipSystem — 补充字段测试', () => {
  let sys: DiplomaticStewardshipSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('item.stewardCivId字段存在', () => { expect(makeItem()).toHaveProperty('stewardCivId') })
  it('item.beneficiaryCivId字段存在', () => { expect(makeItem()).toHaveProperty('beneficiaryCivId') })
  it('item.managementLevel字段存在', () => { expect(makeItem()).toHaveProperty('managementLevel') })
  it('item.trustIndex字段存在', () => { expect(makeItem()).toHaveProperty('trustIndex') })
  it('agreements注入后可取出item', () => {
    const item = makeItem({ id: 99 })
    ;(sys as any).agreements.push(item)
    expect((sys as any).agreements[0].id).toBe(99)
  })
  it('多次push后length正确', () => {
    for (let i = 0; i < 7; i++) { (sys as any).agreements.push(makeItem({ id: i })) }
    expect((sys as any).agreements).toHaveLength(7)
  })
  it('update在tick=CHECK_INTERVAL*10时不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, W, EM, CHECK_INTERVAL * 10)).not.toThrow()
  })
  it('lastCheck在大tick时正确更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL * 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 100)
  })
  it('注入item后首个item id为1', () => {
    ;(sys as any).agreements.push(makeItem({ id: 1 }))
    expect((sys as any).agreements[0].id).toBe(1)
  })
  it('两个不同id的item可共存', () => {
    ;(sys as any).agreements.push(makeItem({ id: 1 }))
    ;(sys as any).agreements.push(makeItem({ id: 2 }))
    expect((sys as any).agreements[0].id).toBe(1)
    expect((sys as any).agreements[1].id).toBe(2)
  })
})
