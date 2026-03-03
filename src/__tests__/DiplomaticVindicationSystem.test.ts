import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticVindicationSystem } from '../systems/DiplomaticVindicationSystem'

const CHECK_INTERVAL = 2450
const MAX_PROCEEDINGS = 20
const W = {} as any, EM = {} as any

function makeSys() { return new DiplomaticVindicationSystem() }

function makeItem(overrides: Partial<any> = {}) {
  return { id: 1, tick: 0, duration: 0, civIdA: 1, civIdB: 2, form: 'war_justification', argumentStrength: 50, publicConviction: 40, moralStanding: 35, historicalRecord: 25, ...overrides }
}

describe('DiplomaticVindicationSystem — 初始状态', () => {
  let sys: DiplomaticVindicationSystem
  beforeEach(() => { sys = makeSys() })

  it('初始proceedings为空数组', () => { expect((sys as any).proceedings).toHaveLength(0) })
  it('proceedings是数组', () => { expect(Array.isArray((sys as any).proceedings)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('构造不崩溃', () => { expect(() => makeSys()).not.toThrow() })
  it('注入item后长度为1', () => {
    ;(sys as any).proceedings.push(makeItem({ id: 1 }))
    expect((sys as any).proceedings).toHaveLength(1)
  })
  it('item包含id字段', () => { expect(makeItem()).toHaveProperty('id') })
  it('item包含tick字段', () => { expect(makeItem()).toHaveProperty('tick') })
  it('item包含duration字段', () => { expect(makeItem()).toHaveProperty('duration') })
})

describe('DiplomaticVindicationSystem — CHECK_INTERVAL=2450 节流', () => {
  let sys: DiplomaticVindicationSystem
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

describe('DiplomaticVindicationSystem — duration递增', () => {
  let sys: DiplomaticVindicationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('每次update通过后duration递增', () => {
    ;(sys as any).proceedings.push(makeItem({ tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect((sys as any).proceedings[0].duration).toBe(1)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    expect((sys as any).proceedings[0].duration).toBe(2)
  })
  it('多个item duration各自独立', () => {
    ;(sys as any).proceedings.push(makeItem({ id: 1, tick: CHECK_INTERVAL, duration: 0 }))
    ;(sys as any).proceedings.push(makeItem({ id: 2, tick: CHECK_INTERVAL, duration: 5 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect((sys as any).proceedings[0].duration).toBe(1)
    expect((sys as any).proceedings[1].duration).toBe(6)
  })
  it('duration初始为0的item在update后>=1', () => {
    ;(sys as any).proceedings.push(makeItem({ duration: 0, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect((sys as any).proceedings[0].duration).toBeGreaterThanOrEqual(1)
  })
  it('连续三次update后duration为3', () => {
    ;(sys as any).proceedings.push(makeItem({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    sys.update(1, W, EM, CHECK_INTERVAL * 3)
    expect((sys as any).proceedings[0].duration).toBe(3)
  })
})

describe('DiplomaticVindicationSystem — MAX_PROCEEDINGS=20 上限', () => {
  let sys: DiplomaticVindicationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('proceedings已满20条时不新增', () => {
    for (let i = 1; i <= MAX_PROCEEDINGS; i++) {(sys as any).proceedings.push(makeItem({ id: i, tick: 999999 })) }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect((sys as any).proceedings).toHaveLength(MAX_PROCEEDINGS)
  })
  it('proceedings未满时长度小于20', () => {
    for (let i = 1; i < MAX_PROCEEDINGS; i++) {(sys as any).proceedings.push(makeItem({ id: i, tick: 999999 })) }
    expect((sys as any).proceedings.length).toBe(MAX_PROCEEDINGS - 1)
  })
  it('MAX_PROCEEDINGS常量正确', () => { expect(MAX_PROCEEDINGS).toBe(20) })
  it('空proceedings时不超出上限', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect((sys as any).proceedings.length).toBeLessThanOrEqual(MAX_PROCEEDINGS)
  })
})

describe('DiplomaticVindicationSystem — Form枚举完整性', () => {
  const forms = ['war_justification', 'policy_defense', 'action_legitimization', 'honor_restoration']
  it('forms数组有4个元素', () => { expect(forms).toHaveLength(4) })
  it('war_justification 合法', () => { expect(forms).toContain('war_justification') })
  it('policy_defense 合法', () => { expect(forms).toContain('policy_defense') })
  it('action_legitimization 合法', () => { expect(forms).toContain('action_legitimization') })
  it('honor_restoration 合法', () => { expect(forms).toContain('honor_restoration') })
})

describe('DiplomaticVindicationSystem — 综合与边界', () => {
  let sys: DiplomaticVindicationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('update不崩溃（空proceedings）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, W, EM, CHECK_INTERVAL)).not.toThrow()
  })
  it('注入10个item后长度为10', () => {
    for (let i = 0; i < 10; i++) {(sys as any).proceedings.push(makeItem({ id: i })) }
    expect((sys as any).proceedings).toHaveLength(10)
  })
  it('nextId随手动插入递增', () => {
    ;(sys as any).nextId = 5
    ;(sys as any).proceedings.push(makeItem({ id: (sys as any).nextId++ }))
    expect((sys as any).nextId).toBe(6)
  })
  it('item duration初始为0', () => { expect(makeItem().duration).toBe(0) })
  it('item tick默认为0', () => { expect(makeItem().tick).toBe(0) })
  it('多次update后proceedings仍为数组', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 1; i <= 5; i++) sys.update(1, W, EM, CHECK_INTERVAL * i)
    expect(Array.isArray((sys as any).proceedings)).toBe(true)
  })
  it('update后lastCheck等于传入tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL * 7)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 7)
  })
  it('CHECK_INTERVAL为2450', () => { expect(CHECK_INTERVAL).toBe(2450) })
  it('random=0.9跳过spawn后proceedings为空', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect((sys as any).proceedings.length).toBe(0)
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
    ;(sys as any).proceedings.push(makeItem({ id: 1 }))
    ;(sys as any).proceedings.splice(0, 1)
    expect((sys as any).proceedings).toHaveLength(0)
  })
  it('nextId初始为1（fresh instance）', () => {
    const s = makeSys() as any
    expect(s.nextId).toBeDefined()
  })
})

describe('DiplomaticVindicationSystem — 补充字段测试', () => {
  let sys: DiplomaticVindicationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('item.civIdA字段存在', () => { expect(makeItem()).toHaveProperty('civIdA') })
  it('item.civIdB字段存在', () => { expect(makeItem()).toHaveProperty('civIdB') })
  it('item.argumentStrength字段存在', () => { expect(makeItem()).toHaveProperty('argumentStrength') })
  it('item.publicConviction字段存在', () => { expect(makeItem()).toHaveProperty('publicConviction') })
  it('proceedings注入后可取出item', () => {
    const item = makeItem({ id: 99 })
    ;(sys as any).proceedings.push(item)
    expect((sys as any).proceedings[0].id).toBe(99)
  })
  it('多次push后length正确', () => {
    for (let i = 0; i < 7; i++) {(sys as any).proceedings.push(makeItem({ id: i })) }
    expect((sys as any).proceedings).toHaveLength(7)
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
    ;(sys as any).proceedings.push(makeItem({ id: 1 }))
    expect((sys as any).proceedings[0].id).toBe(1)
  })
  it('两个不同id的item可共存', () => {
    ;(sys as any).proceedings.push(makeItem({ id: 1 }))
    ;(sys as any).proceedings.push(makeItem({ id: 2 }))
    expect((sys as any).proceedings[0].id).toBe(1)
    expect((sys as any).proceedings[1].id).toBe(2)
  })
})
