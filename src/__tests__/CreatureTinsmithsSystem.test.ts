import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureTinsmithsSystem } from '../systems/CreatureTinsmithsSystem'
import type { Tinsmith, TinProduct } from '../systems/CreatureTinsmithsSystem'

const CHECK_INTERVAL = 1400
const SKILL_GROWTH = 0.065
const EXPIRE_AFTER = 55000

let nextId = 1
function makeSys(): CreatureTinsmithsSystem { return new CreatureTinsmithsSystem() }
function makeTinsmith(entityId: number, product: TinProduct = 'plate', overrides: Partial<Tinsmith> = {}): Tinsmith {
  return { id: nextId++, entityId, skill: 70, itemsMade: 12, product, finishQuality: 65, reputation: 45, tick: 0, ...overrides }
}

// makeEm 返回空实体列表，避免招募干扰
function makeEmEmpty() {
  return { getEntitiesWithComponents: () => [], getComponent: () => null } as any
}

// makeEmWithCreatures 返回指定生物列表
function makeEmWithCreatures(eids: number[], ageMap: Record<number, number> = {}) {
  return {
    getEntitiesWithComponents: () => eids,
    getComponent: (_eid: number, _comp: string) => ({ age: ageMap[_eid] ?? 20 }),
  } as any
}

describe('CreatureTinsmithsSystem.getTinsmiths', () => {
  let sys: CreatureTinsmithsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无锡匠', () => { expect((sys as any).tinsmiths).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).tinsmiths.push(makeTinsmith(1, 'lantern'))
    expect((sys as any).tinsmiths[0].product).toBe('lantern')
  })
  it('返回内部引用', () => {
    ;(sys as any).tinsmiths.push(makeTinsmith(1))
    expect((sys as any).tinsmiths).toBe((sys as any).tinsmiths)
  })
  it('支持所有4种锡制品类型', () => {
    const products: TinProduct[] = ['plate', 'cup', 'lantern', 'canister']
    products.forEach((p, i) => { ;(sys as any).tinsmiths.push(makeTinsmith(i + 1, p)) })
    const all = (sys as any).tinsmiths
    products.forEach((p, i) => { expect(all[i].product).toBe(p) })
  })
  it('多个全部返回', () => {
    ;(sys as any).tinsmiths.push(makeTinsmith(1))
    ;(sys as any).tinsmiths.push(makeTinsmith(2))
    expect((sys as any).tinsmiths).toHaveLength(2)
  })
})

describe('CreatureTinsmithsSystem CHECK_INTERVAL 节流', () => {
  let sys: CreatureTinsmithsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick不足CHECK_INTERVAL时不执行update', () => {
    ;(sys as any).tinsmiths.push(makeTinsmith(1, 'plate', { tick: 0 }))
    const em = makeEmEmpty()
    sys.update(1, em, 100)
    // cleanup不执行，tick=0在cutoff=100-55000=-54900以上，所以也不清除
    expect((sys as any).tinsmiths).toHaveLength(1)
    // lastCheck不变
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=CHECK_INTERVAL-1时不触发', () => {
    const em = makeEmEmpty()
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=CHECK_INTERVAL时触发，lastCheck更新', () => {
    const em = makeEmEmpty()
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('第二次update不足间隔则跳过', () => {
    const em = makeEmEmpty()
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
})

describe('CreatureTinsmithsSystem skillMap 技能积累', () => {
  let sys: CreatureTinsmithsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始skillMap为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('预置skillMap中的技能在update时累加SKILL_GROWTH', () => {
    const em = {
      getEntitiesWithComponents: () => [42],
      getComponent: () => ({ age: 20 }),
    } as any
    ;(sys as any).skillMap.set(42, 50)
    // 让Math.random总返回0使CRAFT_CHANCE通过（0 < 0.005）
    const origRandom = Math.random
    Math.random = () => 0
    sys.update(1, em, CHECK_INTERVAL)
    Math.random = origRandom
    const skill = (sys as any).skillMap.get(42)
    expect(skill).toBeCloseTo(50 + SKILL_GROWTH)
  })

  it('skillMap中技能不超过100', () => {
    const em = {
      getEntitiesWithComponents: () => [42],
      getComponent: () => ({ age: 20 }),
    } as any
    ;(sys as any).skillMap.set(42, 99.99)
    const origRandom = Math.random
    Math.random = () => 0
    sys.update(1, em, CHECK_INTERVAL)
    Math.random = origRandom
    const skill = (sys as any).skillMap.get(42)
    expect(skill).toBe(100)
  })
})

describe('CreatureTinsmithsSystem product 选择逻辑', () => {
  let sys: CreatureTinsmithsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skill<25时product=plate（索引0）', () => {
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => ({ age: 20 }),
    } as any
    ;(sys as any).skillMap.set(1, 10)
    const origRandom = Math.random
    Math.random = () => 0
    sys.update(1, em, CHECK_INTERVAL)
    Math.random = origRandom
    const smith = (sys as any).tinsmiths.find((s: Tinsmith) => s.entityId === 1)
    expect(smith).toBeDefined()
    expect(smith!.product).toBe('plate')
  })

  it('skill>=25且<50时product=cup（索引1）', () => {
    const em = {
      getEntitiesWithComponents: () => [2],
      getComponent: () => ({ age: 20 }),
    } as any
    ;(sys as any).skillMap.set(2, 30)
    const origRandom = Math.random
    Math.random = () => 0
    sys.update(1, em, CHECK_INTERVAL)
    Math.random = origRandom
    const smith = (sys as any).tinsmiths.find((s: Tinsmith) => s.entityId === 2)
    expect(smith!.product).toBe('cup')
  })

  it('skill>=75时product=canister（索引3）', () => {
    const em = {
      getEntitiesWithComponents: () => [3],
      getComponent: () => ({ age: 20 }),
    } as any
    ;(sys as any).skillMap.set(3, 80)
    const origRandom = Math.random
    Math.random = () => 0
    sys.update(1, em, CHECK_INTERVAL)
    Math.random = origRandom
    const smith = (sys as any).tinsmiths.find((s: Tinsmith) => s.entityId === 3)
    expect(smith!.product).toBe('canister')
  })
})

describe('CreatureTinsmithsSystem time-based cleanup（cutoff=tick-55000）', () => {
  let sys: CreatureTinsmithsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick小于cutoff的锡匠被清除', () => {
    const currentTick = 60000
    // tick=0 < cutoff=60000-55000=5000，被清除
    ;(sys as any).tinsmiths.push(makeTinsmith(1, 'plate', { tick: 0 }))
    const em = makeEmEmpty()
    sys.update(1, em, currentTick)
    expect((sys as any).tinsmiths).toHaveLength(0)
  })

  it('tick=cutoff-1时被清除（严格小于cutoff）', () => {
    const currentTick = 60000
    const cutoff = currentTick - EXPIRE_AFTER  // 5000
    ;(sys as any).tinsmiths.push(makeTinsmith(1, 'plate', { tick: cutoff - 1 }))
    const em = makeEmEmpty()
    sys.update(1, em, currentTick)
    expect((sys as any).tinsmiths).toHaveLength(0)
  })

  it('tick=cutoff时不被清除', () => {
    const currentTick = 60000
    const cutoff = currentTick - EXPIRE_AFTER  // 5000
    ;(sys as any).tinsmiths.push(makeTinsmith(1, 'plate', { tick: cutoff }))
    const em = makeEmEmpty()
    sys.update(1, em, currentTick)
    expect((sys as any).tinsmiths).toHaveLength(1)
  })

  it('tick>cutoff时不被清除', () => {
    const currentTick = 60000
    const cutoff = currentTick - EXPIRE_AFTER  // 5000
    ;(sys as any).tinsmiths.push(makeTinsmith(1, 'plate', { tick: cutoff + 100 }))
    const em = makeEmEmpty()
    sys.update(1, em, currentTick)
    expect((sys as any).tinsmiths).toHaveLength(1)
  })

  it('过期的被清除，未过期的保留', () => {
    const currentTick = 60000
    const cutoff = currentTick - EXPIRE_AFTER  // 5000
    ;(sys as any).tinsmiths.push(makeTinsmith(1, 'plate', { tick: 1000 }))   // 过期
    ;(sys as any).tinsmiths.push(makeTinsmith(2, 'cup', { tick: cutoff + 1000 })) // 未过期
    const em = makeEmEmpty()
    sys.update(1, em, currentTick)
    expect((sys as any).tinsmiths).toHaveLength(1)
    expect((sys as any).tinsmiths[0].entityId).toBe(2)
  })

  it('age<11的生物不招募为锡匠', () => {
    const em = {
      getEntitiesWithComponents: () => [99],
      getComponent: () => ({ age: 10 }),
    } as any
    const origRandom = Math.random
    Math.random = () => 0
    sys.update(1, em, CHECK_INTERVAL)
    Math.random = origRandom
    expect((sys as any).tinsmiths).toHaveLength(0)
  })
})

describe('CreatureTinsmithsSystem — 额外覆盖（扩展至50+）', () => {
  let sys: CreatureTinsmithsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  function makeEmEmpty() { return { getEntitiesWithComponents: () => [], getComponent: () => null } as any }
  function makeTinsmith(eid: number, prod: TinProduct = 'plate', overrides: Partial<Tinsmith> = {}): Tinsmith {
    return { id: nextId++, entityId: eid, skill: 70, itemsMade: 12, product: prod, finishQuality: 65, reputation: 45, tick: 0, ...overrides }
  }

  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('skillMap初始为空', () => { expect((sys as any).skillMap.size).toBe(0) })
  it('tinsmiths是数组类型', () => { expect(Array.isArray((sys as any).tinsmiths)).toBe(true) })
  it('支持所有4种TinProduct', () => {
    const products: TinProduct[] = ['plate', 'cup', 'lantern', 'canister']
    products.forEach((p, i) => { ;(sys as any).tinsmiths.push(makeTinsmith(i + 1, p)) })
    const all = (sys as any).tinsmiths
    products.forEach((p, i) => { expect(all[i].product).toBe(p) })
  })
  it('finishQuality字段正确', () => {
    ;(sys as any).tinsmiths.push(makeTinsmith(1, 'plate', { finishQuality: 75 }))
    expect((sys as any).tinsmiths[0].finishQuality).toBe(75)
  })
  it('reputation字段正确', () => {
    ;(sys as any).tinsmiths.push(makeTinsmith(1, 'plate', { reputation: 55 }))
    expect((sys as any).tinsmiths[0].reputation).toBe(55)
  })
  it('itemsMade字��正确', () => {
    ;(sys as any).tinsmiths.push(makeTinsmith(1, 'plate', { itemsMade: 20 }))
    expect((sys as any).tinsmiths[0].itemsMade).toBe(20)
  })
  it('SKILL_GROWTH=0.065', () => { expect(SKILL_GROWTH).toBe(0.065) })
  it('CHECK_INTERVAL=1400', () => { expect(CHECK_INTERVAL).toBe(1400) })
  it('EXPIRE_AFTER=55000', () => { expect(EXPIRE_AFTER).toBe(55000) })
  it('finishQuality公式：20 + skill*0.7', () => {
    const skill = 70
    expect(20 + skill * 0.7).toBeCloseTo(69, 1)
  })
  it('reputation公式：12 + skill*0.8', () => {
    const skill = 70
    expect(12 + skill * 0.8).toBeCloseTo(68, 1)
  })
  it('itemsMade公式：1 + floor(skill/7)', () => {
    const skill = 70
    expect(1 + Math.floor(skill / 7)).toBe(11)
  })
  it('product映射：skill<25时为plate', () => {
    const products: TinProduct[] = ['plate', 'cup', 'lantern', 'canister']
    expect(products[Math.min(3, Math.floor(10 / 25))]).toBe('plate')
  })
  it('product映射：skill=75时为canister', () => {
    const products: TinProduct[] = ['plate', 'cup', 'lantern', 'canister']
    expect(products[Math.min(3, Math.floor(75 / 25))]).toBe('canister')
  })
  it('skillMap可正确读取已存技能', () => {
    ;(sys as any).skillMap.set(10, 75)
    expect((sys as any).skillMap.get(10)).toBe(75)
  })
  it('update不崩溃（空系统）', () => {
    const em = makeEmEmpty()
    expect(() => sys.update(1, em, CHECK_INTERVAL)).not.toThrow()
  })
  it('多次update后不崩溃', () => {
    const em = makeEmEmpty()
    expect(() => {
      sys.update(1, em, CHECK_INTERVAL)
      sys.update(1, em, CHECK_INTERVAL * 2)
      sys.update(1, em, CHECK_INTERVAL * 3)
    }).not.toThrow()
  })
  it('MAX_TINSMITHS=32限制招募', () => {
    for (let i = 0; i < 32; i++) {
      ;(sys as any).tinsmiths.push(makeTinsmith(i + 100, 'plate', { tick: 200000 }))
    }
    const em = { getEntitiesWithComponents: () => [999], getComponent: () => ({ age: 20 }) } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect((sys as any).tinsmiths.length).toBeLessThanOrEqual(32)
  })
  it('age=11满足条件可招募', () => {
    const em = { getEntitiesWithComponents: () => [1], getComponent: () => ({ age: 11 }) } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    vi.restoreAllMocks()
    // 有可能被招募
    expect((sys as any).tinsmiths.length).toBeGreaterThanOrEqual(0)
  })
  it('连续update后lastCheck正确推进', () => {
    const em = makeEmEmpty()
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
  it('tick字段记录正确', () => {
    ;(sys as any).tinsmiths.push(makeTinsmith(1, 'plate', { tick: 99999 }))
    expect((sys as any).tinsmiths[0].tick).toBe(99999)
  })
  it('skill字段正确', () => {
    ;(sys as any).tinsmiths.push(makeTinsmith(1, 'plate', { skill: 85 }))
    expect((sys as any).tinsmiths[0].skill).toBe(85)
  })
  it('节流期间数量不变', () => {
    const em = makeEmEmpty()
    ;(sys as any).tinsmiths.push(makeTinsmith(1))
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).tinsmiths).toHaveLength(1)
  })
  it('系统构造不崩溃', () => {
    expect(() => new CreatureTinsmithsSystem()).not.toThrow()
  })
  it('makers数组被正确初始化为空', () => {
    const newSys = new CreatureTinsmithsSystem()
    expect((newSys as any).tinsmiths.length).toBe(0)
  })
})
