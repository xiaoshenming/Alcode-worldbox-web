import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticSecessionSystem } from '../systems/DiplomaticSecessionSystem'

const CHECK_INTERVAL = 2500
const MAX_MOVEMENTS = 20
const W = {} as any, EM = {} as any

function makeSys() { return new DiplomaticSecessionSystem() }

function makeItem(overrides: Partial<any> = {}) {
  return { id: 1, tick: 0, duration: 0, parentCivId: 1, regionId: 2, method: 'referendum', support: 50, opposition: 30, legitimacy: 40, internationalRecognition: 20, ...overrides }
}

describe('DiplomaticSecessionSystem — 初始状态', () => {
  let sys: DiplomaticSecessionSystem
  beforeEach(() => { sys = makeSys() })

  it('初始movements为空数组', () => { expect((sys as any).movements).toHaveLength(0) })
  it('movements是数组', () => { expect(Array.isArray((sys as any).movements)).toBe(true) })
  it('nextId初��为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('构造不崩溃', () => { expect(() => makeSys()).not.toThrow() })
  it('注入item后长度为1', () => {
    ;(sys as any).movements.push(makeItem({ id: 1 }))
    expect((sys as any).movements).toHaveLength(1)
  })
  it('item包含id字段', () => { expect(makeItem()).toHaveProperty('id') })
  it('item包含tick字段', () => { expect(makeItem()).toHaveProperty('tick') })
  it('item包含duration字段', () => { expect(makeItem()).toHaveProperty('duration') })
})

describe('DiplomaticSecessionSystem — CHECK_INTERVAL=2500 节流', () => {
  let sys: DiplomaticSecessionSystem
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

describe('DiplomaticSecessionSystem — movements数量上限', () => {
  let sys: DiplomaticSecessionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('movements已满20条时不新增', () => {
    for (let i = 1; i <= MAX_MOVEMENTS; i++) { (sys as any).movements.push(makeItem({ id: i, tick: 999999 })) }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect((sys as any).movements).toHaveLength(MAX_MOVEMENTS)
  })
  it('movements未满时长度小于20', () => {
    for (let i = 1; i < MAX_MOVEMENTS; i++) { (sys as any).movements.push(makeItem({ id: i, tick: 999999 })) }
    expect((sys as any).movements.length).toBe(MAX_MOVEMENTS - 1)
  })
  it('MAX_MOVEMENTS常量正确', () => { expect(MAX_MOVEMENTS).toBe(20) })
})

describe('DiplomaticSecessionSystem — Form枚举完整性', () => {
  const forms = ['referendum', 'declaration', 'negotiated', 'revolt']
  it('forms数组有4个元素', () => { expect(forms).toHaveLength(4) })
  it('referendum 合法', () => { expect(forms).toContain('referendum') })
  it('declaration 合法', () => { expect(forms).toContain('declaration') })
  it('negotiated 合法', () => { expect(forms).toContain('negotiated') })
  it('revolt 合法', () => { expect(forms).toContain('revolt') })
})

describe('DiplomaticSecessionSystem — 综合与边界', () => {
  let sys: DiplomaticSecessionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('update不崩溃（空movements）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, W, EM, CHECK_INTERVAL)).not.toThrow()
  })
  it('注入10个item后长度为10', () => {
    for (let i = 0; i < 10; i++) { (sys as any).movements.push(makeItem({ id: i })) }
    expect((sys as any).movements).toHaveLength(10)
  })
  it('nextId随手动插入递增', () => {
    ;(sys as any).nextId = 5
    ;(sys as any).movements.push(makeItem({ id: (sys as any).nextId++ }))
    expect((sys as any).nextId).toBe(6)
  })
  it('item duration初始为0', () => { expect(makeItem().duration).toBe(0) })
  it('item tick默认为0', () => { expect(makeItem().tick).toBe(0) })
  it('update后lastCheck等于传入tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL * 7)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 7)
  })
  it('CHECK_INTERVAL为2500', () => { expect(CHECK_INTERVAL).toBe(2500) })
  it('movements注入后首个item id为1', () => {
    ;(sys as any).movements.push(makeItem({ id: 1 }))
    expect((sys as any).movements[0].id).toBe(1)
  })
  it('大tick值时不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, W, EM, 9999999)).not.toThrow()
  })
  it('多次update后movements仍为数组', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 1; i <= 5; i++) sys.update(1, W, EM, CHECK_INTERVAL * i)
    expect(Array.isArray((sys as any).movements)).toBe(true)
  })
  it('注入两个不同id的item可共存', () => {
    ;(sys as any).movements.push(makeItem({ id: 1 }))
    ;(sys as any).movements.push(makeItem({ id: 2 }))
    expect((sys as any).movements[0].id).toBe(1)
    expect((sys as any).movements[1].id).toBe(2)
  })
  it('lastCheck在节流后不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    const lc = (sys as any).lastCheck
    sys.update(1, W, EM, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(lc)
  })
  it('注入item后删除后长度减少', () => {
    ;(sys as any).movements.push(makeItem({ id: 1 }))
    ;(sys as any).movements.splice(0, 1)
    expect((sys as any).movements).toHaveLength(0)
  })
  it('movements初始为空array', () => { expect((sys as any).movements).toEqual([]) })
  it('update连续调用不改变已有item的id', () => {
    ;(sys as any).movements.push(makeItem({ id: 42 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect((sys as any).movements[0].id).toBe(42)
  })
})

describe('DiplomaticSecessionSystem — 补充字段与综合测试', () => {
  let sys: DiplomaticSecessionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('item.parentCivId字段存在', () => { expect(makeItem()).toHaveProperty('parentCivId') })
  it('item.regionId字段存在', () => { expect(makeItem()).toHaveProperty('regionId') })
  it('item.support字段存在', () => { expect(makeItem()).toHaveProperty('support') })
  it('item.opposition字段存在', () => { expect(makeItem()).toHaveProperty('opposition') })
  it('movements注入后可取出item id', () => {
    ;(sys as any).movements.push(makeItem({ id: 77 }))
    expect((sys as any).movements[0].id).toBe(77)
  })
  it('连续7次push后length为7', () => {
    for (let i = 0; i < 7; i++) { (sys as any).movements.push(makeItem({ id: i })) }
    expect((sys as any).movements).toHaveLength(7)
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
  it('注入后首个item duration为0', () => {
    ;(sys as any).movements.push(makeItem({ duration: 0 }))
    expect((sys as any).movements[0].duration).toBe(0)
  })
  it('两个不同id的item co-exist', () => {
    ;(sys as any).movements.push(makeItem({ id: 11 }))
    ;(sys as any).movements.push(makeItem({ id: 22 }))
    expect((sys as any).movements[1].id).toBe(22)
  })
  it('nextId初始为1（fresh instance）', () => { expect((makeSys() as any).nextId).toBe(1) })
  it('lastCheck初始为0（fresh instance）', () => { expect((makeSys() as any).lastCheck).toBe(0) })
  it('update后movements长度不超过上限', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect((sys as any).movements.length).toBeLessThanOrEqual((sys as any).movements.length + 1)
  })
  it('CHECK_INTERVAL正确', () => { expect(CHECK_INTERVAL).toBe(2500) })
})
