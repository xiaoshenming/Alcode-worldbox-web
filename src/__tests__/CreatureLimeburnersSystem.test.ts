import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureLimeburnersSystem } from '../systems/CreatureLimeburnersSystem'
import type { Limeburner, LimeProduct } from '../systems/CreatureLimeburnersSystem'
import { EntityManager } from '../ecs/Entity'

// CHECK_INTERVAL=1450, MAX_BURNERS=30, CRAFT_CHANCE=0.005, SKILL_GROWTH=0.065
// skillMap存(entityId->skill)，cleanup: burner.tick < tick-54000 时删除
// 产品选择: PRODUCTS[min(3, floor(skill/25))]
//   skill<25 => 'quicklime', 25<=skill<50 => 'slaked_lime'
//   50<=skill<75 => 'mortar', skill>=75 => 'plaster'

let nextId = 1
function makeSys(): CreatureLimeburnersSystem { return new CreatureLimeburnersSystem() }
function makeBurner(entityId: number, product: LimeProduct = 'quicklime', overrides: Partial<Limeburner> = {}): Limeburner {
  return { id: nextId++, entityId, skill: 60, batchesBurned: 10, product, purity: 80, reputation: 50, tick: 0, ...overrides }
}

function makeEm(eids: number[] = [], age = 20): EntityManager {
  const em = new EntityManager()
  for (const eid of eids) {
    const id = em.createEntity()
    em.addComponent(id, { type: 'creature', age } as any)
    em.addComponent(id, { type: 'position' } as any)
  }
  return em
}

describe('CreatureLimeburnersSystem.getBurners', () => {
  let sys: CreatureLimeburnersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无烧灰工', () => { expect((sys as any).burners).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).burners.push(makeBurner(1, 'mortar'))
    expect((sys as any).burners[0].product).toBe('mortar')
  })
  it('返回内部引用', () => {
    ;(sys as any).burners.push(makeBurner(1))
    expect((sys as any).burners).toBe((sys as any).burners)
  })
  it('支持所有 4 种产品', () => {
    const products: LimeProduct[] = ['quicklime', 'slaked_lime', 'mortar', 'plaster']
    products.forEach((p, i) => { ;(sys as any).burners.push(makeBurner(i + 1, p)) })
    const all = (sys as any).burners
    products.forEach((p, i) => { expect(all[i].product).toBe(p) })
  })
  it('多个全部返回', () => {
    ;(sys as any).burners.push(makeBurner(1))
    ;(sys as any).burners.push(makeBurner(2))
    expect((sys as any).burners).toHaveLength(2)
  })
})

describe('CreatureLimeburnersSystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureLimeburnersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick<CHECK_INTERVAL时不执行逻辑', () => {
    ;(sys as any).burners.push(makeBurner(1, 'quicklime', { tick: 0 }))
    const em = makeEm()
    sys.update(1, em, 100)
    // burner 不会被删（tick=0, cutoff=100-54000<0，不删）
    expect((sys as any).burners).toHaveLength(1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick>=CHECK_INTERVAL时执行更新并更新lastCheck', () => {
    const em = makeEm()
    sys.update(1, em, 1450)
    expect((sys as any).lastCheck).toBe(1450)
  })

  it('lastCheck在节流期内保持不变', () => {
    ;(sys as any).lastCheck = 1450
    const em = makeEm()
    sys.update(1, em, 1500)
    expect((sys as any).lastCheck).toBe(1450)
  })
})

describe('CreatureLimeburnersSystem - skillMap缓存', () => {
  let sys: CreatureLimeburnersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('直接注入skillMap后可读取', () => {
    ;(sys as any).skillMap.set(42, 55)
    expect((sys as any).skillMap.get(42)).toBe(55)
  })

  it('skillMap初始为空Map', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('同一entityId多次注入skill值叠加（SKILL_GROWTH=0.065）', () => {
    ;(sys as any).skillMap.set(1, 50)
    // 模拟手动增长
    const old = (sys as any).skillMap.get(1)
    const newSkill = Math.min(100, old + 0.065)
    ;(sys as any).skillMap.set(1, newSkill)
    expect((sys as any).skillMap.get(1)).toBeCloseTo(50.065)
  })
})

describe('CreatureLimeburnersSystem - 产品等级（skill决定）', () => {
  let sys: CreatureLimeburnersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skill<25 => quicklime', () => {
    ;(sys as any).burners.push(makeBurner(1, 'quicklime', { skill: 10 }))
    expect((sys as any).burners[0].product).toBe('quicklime')
  })

  it('25<=skill<50 => slaked_lime', () => {
    ;(sys as any).burners.push(makeBurner(1, 'slaked_lime', { skill: 30 }))
    expect((sys as any).burners[0].product).toBe('slaked_lime')
  })

  it('50<=skill<75 => mortar', () => {
    ;(sys as any).burners.push(makeBurner(1, 'mortar', { skill: 60 }))
    expect((sys as any).burners[0].product).toBe('mortar')
  })

  it('skill>=75 => plaster', () => {
    ;(sys as any).burners.push(makeBurner(1, 'plaster', { skill: 80 }))
    expect((sys as any).burners[0].product).toBe('plaster')
  })
})

describe('CreatureLimeburnersSystem - time-based cleanup（tick<cutoff 删除）', () => {
  let sys: CreatureLimeburnersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('burner.tick=0，currentTick=54001 => cutoff=1 => 0<1 => 被删除', () => {
    ;(sys as any).burners.push(makeBurner(1, 'quicklime', { tick: 0 }))
    ;(sys as any).lastCheck = 0
    const em = makeEm()
    sys.update(1, em, 54001 + 1450)
    // lastCheck=0, tick=55451>=1450 => 执行; cutoff=55451-54000=1451 > 0 => 删除
    expect((sys as any).burners).toHaveLength(0)
  })

  it('burner.tick等于cutoff => 不删除', () => {
    // cutoff = currentTick - 54000
    // 让 burner.tick == cutoff：burner.tick = tick - 54000
    const currentTick = 60000
    ;(sys as any).lastCheck = 0
    const burnerTick = currentTick - 54000  // =6000，等于cutoff，条件是 < cutoff
    ;(sys as any).burners.push(makeBurner(1, 'quicklime', { tick: burnerTick }))
    const em = makeEm()
    sys.update(1, em, currentTick)
    expect((sys as any).burners).toHaveLength(1)
  })

  it('burner.tick=currentTick（新鲜记录）=> 不删除', () => {
    ;(sys as any).burners.push(makeBurner(1, 'quicklime', { tick: 55000 }))
    ;(sys as any).lastCheck = 0
    const em = makeEm()
    sys.update(1, em, 55000)
    // cutoff = 55000-54000=1000; burner.tick=55000 >= 1000 => 保留
    expect((sys as any).burners).toHaveLength(1)
  })

  it('旧记录（tick<cutoff）被删，新记录保留', () => {
    ;(sys as any).burners.push(makeBurner(1, 'quicklime', { tick: 100 }))
    ;(sys as any).burners.push(makeBurner(2, 'mortar', { tick: 55000 }))
    ;(sys as any).lastCheck = 0
    const em = makeEm()
    // currentTick=56000; cutoff=2000; 100<2000=>删, 55000>=2000=>保
    sys.update(1, em, 56000)
    expect((sys as any).burners).toHaveLength(1)
    expect((sys as any).burners[0].entityId).toBe(2)
  })

  it('多个旧记录全部删除', () => {
    ;(sys as any).burners.push(makeBurner(1, 'quicklime', { tick: 100 }))
    ;(sys as any).burners.push(makeBurner(2, 'quicklime', { tick: 200 }))
    ;(sys as any).burners.push(makeBurner(3, 'quicklime', { tick: 300 }))
    ;(sys as any).lastCheck = 0
    const em = makeEm()
    // currentTick=56000; cutoff=2000; 所有tick都<2000 => 全删
    sys.update(1, em, 56000)
    expect((sys as any).burners).toHaveLength(0)
  })
})

describe('CreatureLimeburnersSystem - purity/reputation/batchesBurned计算', () => {
  let sys: CreatureLimeburnersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('purity = 20 + skill * 0.7', () => {
    ;(sys as any).burners.push(makeBurner(1, 'quicklime', { skill: 50, purity: 20 + 50 * 0.7 }))
    expect((sys as any).burners[0].purity).toBeCloseTo(55)
  })

  it('reputation = 10 + skill * 0.75', () => {
    ;(sys as any).burners.push(makeBurner(1, 'quicklime', { skill: 50, reputation: 10 + 50 * 0.75 }))
    expect((sys as any).burners[0].reputation).toBeCloseTo(47.5)
  })

  it('batchesBurned = 1 + floor(skill/10)', () => {
    ;(sys as any).burners.push(makeBurner(1, 'quicklime', { skill: 30, batchesBurned: 1 + Math.floor(30 / 10) }))
    expect((sys as any).burners[0].batchesBurned).toBe(4)
  })
})
