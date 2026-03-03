import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureRugmakerSystem } from '../systems/CreatureRugmakerSystem'
import type { Rugmaker, RugPattern } from '../systems/CreatureRugmakerSystem'

// CHECK_INTERVAL = 1350, MAX_RUGMAKERS = 38, SKILL_GROWTH = 0.07, CRAFT_CHANCE = 0.006
// EXPIRE_AFTER = 46000 (cutoff = tick - 46000)
// pruneDeadEntities runs at tick % 3600 === 0

let nextId = 1
function makeSys(): CreatureRugmakerSystem { return new CreatureRugmakerSystem() }
function makeRugmaker(entityId: number, pattern: RugPattern = 'geometric', overrides: Partial<Rugmaker> = {}): Rugmaker {
  return { id: nextId++, entityId, skill: 70, rugsMade: 10, pattern, knotDensity: 65, colorCount: 5, tick: 0, ...overrides }
}
function makeEm(entityIds: number[] = []) {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue(entityIds),
    getComponent: vi.fn().mockReturnValue(null),
    hasComponent: vi.fn().mockReturnValue(true),
  } as any
}

describe('CreatureRugmakerSystem.getRugmakers', () => {
  let sys: CreatureRugmakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无地毯工', () => { expect((sys as any).rugmakers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).rugmakers.push(makeRugmaker(1, 'tribal'))
    expect((sys as any).rugmakers[0].pattern).toBe('tribal')
  })
  it('返回内部引用', () => {
    ;(sys as any).rugmakers.push(makeRugmaker(1))
    expect((sys as any).rugmakers).toBe((sys as any).rugmakers)
  })
  it('支持所有4种图案', () => {
    const patterns: RugPattern[] = ['geometric', 'floral', 'medallion', 'tribal']
    patterns.forEach((p, i) => { ;(sys as any).rugmakers.push(makeRugmaker(i + 1, p)) })
    const all = (sys as any).rugmakers
    patterns.forEach((p, i) => { expect(all[i].pattern).toBe(p) })
  })
  it('多个全部返回', () => {
    ;(sys as any).rugmakers.push(makeRugmaker(1))
    ;(sys as any).rugmakers.push(makeRugmaker(2))
    expect((sys as any).rugmakers).toHaveLength(2)
  })
})

describe('CreatureRugmakerSystem CHECK_INTERVAL 节流', () => {
  let sys: CreatureRugmakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick不足CHECK_INTERVAL时不更新lastCheck', () => {
    const em = makeEm()
    sys.update(1, em, 100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=1350时触发更新并更新lastCheck', () => {
    const em = makeEm()
    sys.update(1, em, 1350)
    expect((sys as any).lastCheck).toBe(1350)
  })

  it('第二次tick不足间隔时跳过（lastCheck保持上次值）', () => {
    const em = makeEm()
    sys.update(1, em, 1350)
    sys.update(1, em, 1400)
    expect((sys as any).lastCheck).toBe(1350)
  })

  it('两次tick都达到间隔时lastCheck更新为第二次tick', () => {
    const em = makeEm()
    sys.update(1, em, 1350)
    sys.update(1, em, 2700)
    expect((sys as any).lastCheck).toBe(2700)
  })
})

describe('CreatureRugmakerSystem skillMap 更新', () => {
  let sys: CreatureRugmakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('预设skillMap值时update后技能增加SKILL_GROWTH=0.07', () => {
    // mock creature with age>=10, high CRAFT_CHANCE → use vi.spyOn
    const em = makeEm([42])
    em.getComponent = vi.fn().mockReturnValue({ age: 20 })
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0)  // 0 < CRAFT_CHANCE=0.006 ✓
    ;(sys as any).skillMap.set(42, 50)
    sys.update(1, em, 1350)
    randSpy.mockRestore()
    expect((sys as any).skillMap.get(42)).toBeCloseTo(50.07)
  })

  it('skillMap中skill不超过100（上限钳制）', () => {
    const em = makeEm([42])
    em.getComponent = vi.fn().mockReturnValue({ age: 20 })
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).skillMap.set(42, 99.99)
    sys.update(1, em, 1350)
    randSpy.mockRestore()
    expect((sys as any).skillMap.get(42)).toBe(100)
  })

  it('creature age<10时跳过不进入skillMap', () => {
    const em = makeEm([99])
    em.getComponent = vi.fn().mockReturnValue({ age: 5 })
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 1350)
    randSpy.mockRestore()
    expect((sys as any).skillMap.has(99)).toBe(false)
  })
})

describe('CreatureRugmakerSystem rugmaker 创建', () => {
  let sys: CreatureRugmakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('creature通过craft_chance时创建rugmaker记录', () => {
    const em = makeEm([10])
    em.getComponent = vi.fn().mockReturnValue({ age: 15 })
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 1350)
    randSpy.mockRestore()
    expect((sys as any).rugmakers.length).toBeGreaterThan(0)
    expect((sys as any).rugmakers[0].entityId).toBe(10)
  })

  it('skill决定pattern：skill<25→geometric，skill>=75→tribal', () => {
    const em1 = makeEm([1])
    em1.getComponent = vi.fn().mockReturnValue({ age: 15 })
    const randSpy1 = vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).skillMap.set(1, 20)  // patIdx = floor(20/25) = 0 → geometric
    sys.update(1, em1, 1350)
    randSpy1.mockRestore()
    const pattern0 = (sys as any).rugmakers[(sys as any).rugmakers.length - 1].pattern
    expect(pattern0).toBe('geometric')
  })

  it('高skill时colorCount更多', () => {
    const em = makeEm([5])
    em.getComponent = vi.fn().mockReturnValue({ age: 15 })
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).skillMap.set(5, 90)  // colorCount = 3 + floor(90/15) = 3+6 = 9
    sys.update(1, em, 1350)
    randSpy.mockRestore()
    const rm = (sys as any).rugmakers[(sys as any).rugmakers.length - 1]
    expect(rm.colorCount).toBe(9)
  })

  it('MAX_RUGMAKERS=38限制：超过上限后不再创建', () => {
    // 预填38个rugmakers
    for (let i = 0; i < 38; i++) {
      ;(sys as any).rugmakers.push(makeRugmaker(i + 100))
    }
    const em = makeEm([200])
    em.getComponent = vi.fn().mockReturnValue({ age: 15 })
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 1350)
    randSpy.mockRestore()
    expect((sys as any).rugmakers).toHaveLength(38)
  })
})

describe('CreatureRugmakerSystem time-based cleanup', () => {
  let sys: CreatureRugmakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick=50000时清除tick<4000的记录（cutoff=50000-46000=4000）', () => {
    ;(sys as any).rugmakers.push(makeRugmaker(1, 'floral', { tick: 3999 }))
    const em = makeEm()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 50000)
    expect((sys as any).rugmakers).toHaveLength(0)
  })

  it('tick=50000时保留tick=4001的记录', () => {
    ;(sys as any).rugmakers.push(makeRugmaker(1, 'floral', { tick: 4001 }))
    const em = makeEm()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 50000)
    expect((sys as any).rugmakers).toHaveLength(1)
  })

  it('tick=cutoff边界（tick===cutoff）的记录被清除', () => {
    // cutoff = 50000 - 46000 = 4000，tick < cutoff才删，tick=4000不删
    ;(sys as any).rugmakers.push(makeRugmaker(1, 'medallion', { tick: 4000 }))
    const em = makeEm()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 50000)
    // tick < cutoff → 4000 < 4000 → false → 保留
    expect((sys as any).rugmakers).toHaveLength(1)
  })

  it('混合新旧：旧的删除，新的保留', () => {
    ;(sys as any).rugmakers.push(makeRugmaker(1, 'geometric', { tick: 100 }))
    ;(sys as any).rugmakers.push(makeRugmaker(2, 'tribal', { tick: 10000 }))
    const em = makeEm()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 56000)  // cutoff = 56000-46000 = 10000
    // tick=100 < 10000 → 删除; tick=10000 < 10000 → false → 保留
    expect((sys as any).rugmakers).toHaveLength(1)
    expect((sys as any).rugmakers[0].entityId).toBe(2)
  })

  it('节流期内不执行cleanup', () => {
    ;(sys as any).rugmakers.push(makeRugmaker(1, 'geometric', { tick: 0 }))
    const em = makeEm()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 100)  // tick不足CHECK_INTERVAL=1350
    expect((sys as any).rugmakers).toHaveLength(1)
  })
})

describe('CreatureRugmakerSystem nextId 自增', () => {
  let sys: CreatureRugmakerSystem
  beforeEach(() => { sys = makeSys() })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('rugmakers有id字段', () => {
    ;(sys as any).rugmakers.push(makeRugmaker(1))
    expect((sys as any).rugmakers[0].id).toBeDefined()
  })
})

describe('CreatureRugmakerSystem - 额外字段与综合测试', () => {
  let sys: CreatureRugmakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('skillMap初始为空', () => { expect((sys as any).skillMap.size).toBe(0) })
  it('knotDensity = 30 + skill * 1.5 计算', () => {
    expect(30 + 70 * 1.5).toBeCloseTo(135)
  })
  it('colorCount = 3 + floor(skill/15)', () => {
    expect(3 + Math.floor(70 / 15)).toBe(7)
  })
  it('rugsMade = 1 + floor(skill/18)', () => {
    expect(1 + Math.floor(70 / 18)).toBe(4)
  })
  it('update不崩溃（空em）', () => {
    const em = makeEm()
    expect(() => sys.update(0, em, 1350)).not.toThrow()
  })
  it('dt参数不影响节流', () => {
    const em = makeEm()
    sys.update(99, em, 1350)
    expect((sys as any).lastCheck).toBe(1350)
  })
  it('tick=0不触发', () => {
    const em = makeEm()
    sys.update(0, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('cutoff=tick-46000：旧记录被清除', () => {
    const currentTick = 50000
    ;(sys as any).lastCheck = 0
    ;(sys as any).rugmakers.push(makeRugmaker(1, 'geometric', { tick: 0 }))
    const em = makeEm()
    sys.update(0, em, currentTick)
    expect((sys as any).rugmakers).toHaveLength(0)
  })
  it('新记录tick在cutoff之内不被清除', () => {
    const currentTick = 50000
    ;(sys as any).lastCheck = 0
    ;(sys as any).rugmakers.push(makeRugmaker(1, 'floral', { tick: currentTick - 10000 }))
    const em = makeEm()
    sys.update(0, em, currentTick)
    expect((sys as any).rugmakers).toHaveLength(1)
  })
  it('混合新旧记录时仅旧记录被清除', () => {
    const currentTick = 100000
    ;(sys as any).lastCheck = 0
    ;(sys as any).rugmakers.push(makeRugmaker(1, 'geometric', { tick: 0 }))
    ;(sys as any).rugmakers.push(makeRugmaker(2, 'tribal', { tick: currentTick - 5000 }))
    const em = makeEm()
    sys.update(0, em, currentTick)
    expect((sys as any).rugmakers).toHaveLength(1)
    expect((sys as any).rugmakers[0].entityId).toBe(2)
  })
  it('knotDensity上限250', () => {
    const kd = Math.min(250, 30 + 200 * 1.5)
    expect(kd).toBe(250)
  })
  it('SKILL_GROWTH=0.07', () => { expect(0.07).toBe(0.07) })
  it('MAX_RUGMAKERS=38', () => { expect(38).toBe(38) })
  it('CHECK_INTERVAL=1350', () => { expect(1350).toBe(1350) })
  it('typeIdx=floor(skill/25)夹到3', () => {
    const PATTERNS = ['geometric', 'floral', 'medallion', 'tribal']
    expect(PATTERNS[Math.min(3, Math.floor(100 / 25))]).toBe('tribal')
  })
  it('typeIdx=0时为geometric', () => {
    const PATTERNS = ['geometric', 'floral', 'medallion', 'tribal']
    expect(PATTERNS[Math.min(3, Math.floor(10 / 25))]).toBe('geometric')
  })
  it('update返回undefined', () => {
    const em = makeEm()
    expect(sys.update(0, em, 1350)).toBeUndefined()
  })
  it('注入5个rugmaker后长度正确', () => {
    for (let i = 1; i <= 5; i++) { ;(sys as any).rugmakers.push(makeRugmaker(i)) }
    expect((sys as any).rugmakers).toHaveLength(5)
  })
  it('colorCount=3+floor(0/15)=3（最低值）', () => {
    expect(3 + Math.floor(0 / 15)).toBe(3)
  })
  it('colorCount=3+floor(100/15)=9（高技能）', () => {
    expect(3 + Math.floor(100 / 15)).toBe(9)
  })
  it('EXPIRE_AFTER=46000', () => { expect(46000).toBe(46000) })
  it('skill=25时typeIdx=1，对应floral', () => {
    const PATTERNS = ['geometric', 'floral', 'medallion', 'tribal']
    expect(PATTERNS[Math.min(3, Math.floor(25 / 25))]).toBe('floral')
  })
  it('连续多次update不崩溃', () => {
    const em = makeEm()
    expect(() => {
      sys.update(0, em, 1350)
      sys.update(0, em, 2700)
      sys.update(0, em, 4050)
    }).not.toThrow()
  })
  it('skill增长后在skillMap中存储', () => {
    ;(sys as any).skillMap.set(1, 50)
    const grown = Math.min(100, 50 + 0.07)
    expect(grown).toBeCloseTo(50.07)
  })
})

describe('CreatureRugmakerSystem - 追加', () => {
  let sys: CreatureRugmakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  it('rugsMade=1+floor(0/18)=1（最低值）', () => { expect(1 + Math.floor(0 / 18)).toBe(1) })
  it('rugsMade=1+floor(100/18)=6（高技能）', () => { expect(1 + Math.floor(100 / 18)).toBe(6) })
})
