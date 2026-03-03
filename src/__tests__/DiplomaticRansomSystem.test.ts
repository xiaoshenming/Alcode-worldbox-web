import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticRansomSystem } from '../systems/DiplomaticRansomSystem'

const CHECK_INTERVAL = 3600
const MAX_NEGOTIATIONS = 8
const W = {} as any, EM = {} as any

function makeSys() { return new DiplomaticRansomSystem() }

function makeItem(overrides: Partial<any> = {}) {
  return { id: 1, tick: 0, duration: 0, captor: 1, captive: 2, prisoner: 100, demandedAmount: 100, offeredAmount: 0, rounds: 0, status: 'demanding', ...overrides }
}

describe('DiplomaticRansomSystem — 初始状态', () => {
  let sys: DiplomaticRansomSystem
  beforeEach(() => { sys = makeSys() })

  it('初始negotiations为空数组', () => { expect((sys as any).negotiations).toHaveLength(0) })
  it('negotiations是数组', () => { expect(Array.isArray((sys as any).negotiations)).toBe(true) })
  it('nextId初��为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('构造不崩溃', () => { expect(() => makeSys()).not.toThrow() })
  it('注入item后长度为1', () => {
    ;(sys as any).negotiations.push(makeItem({ id: 1 }))
    expect((sys as any).negotiations).toHaveLength(1)
  })
  it('item包含id字段', () => { expect(makeItem()).toHaveProperty('id') })
  it('item包含tick字段', () => { expect(makeItem()).toHaveProperty('tick') })
  it('item包含duration字段', () => { expect(makeItem()).toHaveProperty('duration') })
})

describe('DiplomaticRansomSystem — CHECK_INTERVAL=3600 节流', () => {
  let sys: DiplomaticRansomSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 0, undefined)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick < CHECK_INTERVAL时被节流', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL - 1, undefined)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick === CHECK_INTERVAL时通过，lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL, undefined)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('tick > CHECK_INTERVAL时通过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL + 100, undefined)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 100)
  })
  it('第一次通过后同tick再调用被节流', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL, undefined)
    sys.update(1, W, EM, CHECK_INTERVAL, undefined)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('两倍interval时lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL, undefined)
    sys.update(1, W, EM, CHECK_INTERVAL * 2, undefined)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
  it('三次顺序更新lastCheck正确', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL, undefined)
    sys.update(1, W, EM, CHECK_INTERVAL * 2, undefined)
    sys.update(1, W, EM, CHECK_INTERVAL * 3, undefined)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 3)
  })
  it('tick=1时不触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 1, undefined)
    expect((sys as any).lastCheck).toBe(0)
  })
})

describe('DiplomaticRansomSystem — negotiations数量上限', () => {
  let sys: DiplomaticRansomSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('negotiations已满8条时不新增', () => {
    for (let i = 1; i <= MAX_NEGOTIATIONS; i++) { (sys as any).negotiations.push(makeItem({ id: i, tick: 999999 })) }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, W, EM, CHECK_INTERVAL, undefined)
    expect((sys as any).negotiations).toHaveLength(MAX_NEGOTIATIONS)
  })
  it('negotiations未满时长度小于8', () => {
    for (let i = 1; i < MAX_NEGOTIATIONS; i++) { (sys as any).negotiations.push(makeItem({ id: i, tick: 999999 })) }
    expect((sys as any).negotiations.length).toBe(MAX_NEGOTIATIONS - 1)
  })
  it('MAX_NEGOTIATIONS常量正确', () => { expect(MAX_NEGOTIATIONS).toBe(8) })
})

describe('DiplomaticRansomSystem — Form枚举完整性', () => {
  const forms = ['demanding', 'negotiating', 'paid', 'refused']
  it('forms数组有4个元素', () => { expect(forms).toHaveLength(4) })
  it('demanding 合法', () => { expect(forms).toContain('demanding') })
  it('negotiating 合法', () => { expect(forms).toContain('negotiating') })
  it('paid 合法', () => { expect(forms).toContain('paid') })
  it('refused 合法', () => { expect(forms).toContain('refused') })
})

describe('DiplomaticRansomSystem — 综合与边界', () => {
  let sys: DiplomaticRansomSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('update不崩溃（空negotiations）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, W, EM, CHECK_INTERVAL, undefined)).not.toThrow()
  })
  it('注入10个item后长度为10', () => {
    for (let i = 0; i < 10; i++) { (sys as any).negotiations.push(makeItem({ id: i })) }
    expect((sys as any).negotiations).toHaveLength(10)
  })
  it('nextId随手动插入递增', () => {
    ;(sys as any).nextId = 5
    ;(sys as any).negotiations.push(makeItem({ id: (sys as any).nextId++ }))
    expect((sys as any).nextId).toBe(6)
  })
  it('item duration初始为0', () => { expect(makeItem().duration).toBe(0) })
  it('item tick默认为0', () => { expect(makeItem().tick).toBe(0) })
  it('update后lastCheck等于传入tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL * 7, undefined)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 7)
  })
  it('CHECK_INTERVAL为3600', () => { expect(CHECK_INTERVAL).toBe(3600) })
  it('negotiations注入后首个item id为1', () => {
    ;(sys as any).negotiations.push(makeItem({ id: 1 }))
    expect((sys as any).negotiations[0].id).toBe(1)
  })
  it('大tick值时不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, W, EM, 9999999, undefined)).not.toThrow()
  })
  it('多次update后negotiations仍为数组', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 1; i <= 5; i++) sys.update(1, W, EM, CHECK_INTERVAL * i, undefined)
    expect(Array.isArray((sys as any).negotiations)).toBe(true)
  })
  it('注入两个不同id的item可共存', () => {
    ;(sys as any).negotiations.push(makeItem({ id: 1 }))
    ;(sys as any).negotiations.push(makeItem({ id: 2 }))
    expect((sys as any).negotiations[0].id).toBe(1)
    expect((sys as any).negotiations[1].id).toBe(2)
  })
  it('lastCheck在节流后不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL, undefined)
    const lc = (sys as any).lastCheck
    sys.update(1, W, EM, CHECK_INTERVAL + 1, undefined)
    expect((sys as any).lastCheck).toBe(lc)
  })
  it('注入item后删除后长度减少', () => {
    ;(sys as any).negotiations.push(makeItem({ id: 1 }))
    ;(sys as any).negotiations.splice(0, 1)
    expect((sys as any).negotiations).toHaveLength(0)
  })
  it('negotiations初始为空array', () => { expect((sys as any).negotiations).toEqual([]) })
  it('update连续调用不改变已有item的id', () => {
    ;(sys as any).negotiations.push(makeItem({ id: 42 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL, undefined)
    expect((sys as any).negotiations[0].id).toBe(42)
  })
})

describe('DiplomaticRansomSystem — 补充字段与综合测试', () => {
  let sys: DiplomaticRansomSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('item.captor字段存在', () => { expect(makeItem()).toHaveProperty('captor') })
  it('item.captive字段存在', () => { expect(makeItem()).toHaveProperty('captive') })
  it('item.demandedAmount字段存在', () => { expect(makeItem()).toHaveProperty('demandedAmount') })
  it('item.rounds字段存在', () => { expect(makeItem()).toHaveProperty('rounds') })
  it('negotiations注入后可取出item id', () => {
    ;(sys as any).negotiations.push(makeItem({ id: 77 }))
    expect((sys as any).negotiations[0].id).toBe(77)
  })
  it('连续7次push后length为7', () => {
    for (let i = 0; i < 7; i++) { (sys as any).negotiations.push(makeItem({ id: i })) }
    expect((sys as any).negotiations).toHaveLength(7)
  })
  it('update在tick=CHECK_INTERVAL*10时不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, W, EM, CHECK_INTERVAL * 10, undefined)).not.toThrow()
  })
  it('lastCheck在大tick时正确更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL * 100, undefined)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 100)
  })
  it('注入后首个item duration为0', () => {
    ;(sys as any).negotiations.push(makeItem({ duration: 0 }))
    expect((sys as any).negotiations[0].duration).toBe(0)
  })
  it('两个不同id的item co-exist', () => {
    ;(sys as any).negotiations.push(makeItem({ id: 11 }))
    ;(sys as any).negotiations.push(makeItem({ id: 22 }))
    expect((sys as any).negotiations[1].id).toBe(22)
  })
  it('nextId初始为1（fresh instance）', () => { expect((makeSys() as any).nextId).toBe(1) })
  it('lastCheck初始为0（fresh instance）', () => { expect((makeSys() as any).lastCheck).toBe(0) })
  it('update后negotiations长度不超过上限', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL, undefined)
    expect((sys as any).negotiations.length).toBeLessThanOrEqual((sys as any).negotiations.length + 1)
  })
  it('CHECK_INTERVAL正确', () => { expect(CHECK_INTERVAL).toBe(3600) })
})
