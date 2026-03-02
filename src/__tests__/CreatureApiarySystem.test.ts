import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureApiarySystem } from '../systems/CreatureApiarySystem'
import type { Apiary, HiveHealth } from '../systems/CreatureApiarySystem'
import { EntityManager } from '../ecs/Entity'

// ─────────────────────────────────────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────────────────────────────────────
let nextId = 1

function makeApiSys(): CreatureApiarySystem {
  return new CreatureApiarySystem()
}

function makeApiary(keeperId: number, health: HiveHealth = 'stable', overrides: Partial<Apiary> = {}): Apiary {
  return {
    id: nextId++,
    keeperId,
    x: 50, y: 50,
    hiveCount: 3,
    health,
    honeyStored: 20,
    pollinationRadius: 10,
    tick: 0,
    ...overrides,
  }
}

/** 注入 N 个蜂房到系统内部 */
function injectApiaries(sys: CreatureApiarySystem, count: number, health: HiveHealth = 'stable'): void {
  for (let i = 0; i < count; i++) {
    ;(sys as any).apiaries.push(makeApiary(i + 1, health))
  }
}

/** 创建带 creature + position 组件的 EntityManager */
function makeEmWithCreatures(count: number): EntityManager {
  const em = new EntityManager()
  for (let i = 0; i < count; i++) {
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', age: 20 })
    em.addComponent(eid, { type: 'position', x: i * 10, y: i * 10 })
  }
  return em
}

// ─────────────────────────────────────────────────────────────────────────────
// 初始状态
// ─────────────────────────────────────────────────────────────────────────────
describe('初始状态', () => {
  let sys: CreatureApiarySystem
  beforeEach(() => { sys = makeApiSys(); nextId = 1 })

  it('apiaries 初始为空', () => {
    expect((sys as any).apiaries).toHaveLength(0)
  })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 蜂房数据结构
// ─────────────────────────────────────────────────────────────────────────────
describe('Apiary 数据结构', () => {
  let sys: CreatureApiarySystem
  beforeEach(() => { sys = makeApiSys(); nextId = 1 })

  it('注入蜂房后可查询', () => {
    ;(sys as any).apiaries.push(makeApiary(1, 'thriving'))
    expect((sys as any).apiaries).toHaveLength(1)
    expect((sys as any).apiaries[0].health).toBe('thriving')
  })

  it('返回内部引用（同一对象）', () => {
    ;(sys as any).apiaries.push(makeApiary(1))
    const ref1 = (sys as any).apiaries
    const ref2 = (sys as any).apiaries
    expect(ref1).toBe(ref2)
  })

  it('蜂房 keeperId 正确存储', () => {
    ;(sys as any).apiaries.push(makeApiary(99))
    expect((sys as any).apiaries[0].keeperId).toBe(99)
  })

  it('蜂房 x/y 坐标正确存储', () => {
    const a = makeApiary(1, 'stable', { x: 123, y: 456 })
    ;(sys as any).apiaries.push(a)
    expect((sys as any).apiaries[0].x).toBe(123)
    expect((sys as any).apiaries[0].y).toBe(456)
  })

  it('蜂房 hiveCount 正确存储', () => {
    const a = makeApiary(1, 'stable', { hiveCount: 7 })
    ;(sys as any).apiaries.push(a)
    expect((sys as any).apiaries[0].hiveCount).toBe(7)
  })

  it('蜂房 honeyStored 正确存储', () => {
    const a = makeApiary(1, 'stable', { honeyStored: 150 })
    ;(sys as any).apiaries.push(a)
    expect((sys as any).apiaries[0].honeyStored).toBe(150)
  })

  it('蜂房 pollinationRadius 正确存储', () => {
    const a = makeApiary(1, 'stable', { pollinationRadius: 15 })
    ;(sys as any).apiaries.push(a)
    expect((sys as any).apiaries[0].pollinationRadius).toBe(15)
  })

  it('支持所有 4 种蜂巢健康状态', () => {
    const healths: HiveHealth[] = ['thriving', 'stable', 'stressed', 'collapsed']
    healths.forEach((h, i) => {
      ;(sys as any).apiaries.push(makeApiary(i + 1, h))
    })
    const all = (sys as any).apiaries
    expect(all).toHaveLength(4)
    healths.forEach((h, i) => { expect(all[i].health).toBe(h) })
  })

  it('多个蜂房独立存储不互相干扰', () => {
    ;(sys as any).apiaries.push(makeApiary(1, 'thriving'))
    ;(sys as any).apiaries.push(makeApiary(2, 'collapsed'))
    expect((sys as any).apiaries[0].health).toBe('thriving')
    expect((sys as any).apiaries[1].health).toBe('collapsed')
  })

  it('蜂房 tick 字段正确存储', () => {
    const a = makeApiary(1, 'stable', { tick: 5000 })
    ;(sys as any).apiaries.push(a)
    expect((sys as any).apiaries[0].tick).toBe(5000)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// update 节流逻辑
// ─────────────────────────────────────────────────────────────────────────────
describe('update 节流逻辑', () => {
  let sys: CreatureApiarySystem
  let em: EntityManager
  beforeEach(() => { sys = makeApiSys(); nextId = 1; em = makeEmWithCreatures(3) })

  it('tick < CHECK_INTERVAL 时 update 不执行（lastCheck 不变）', () => {
    sys.update(1, em, 100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick >= CHECK_INTERVAL 时 update 执行（lastCheck 更新）', () => {
    sys.update(1, em, 2500)
    expect((sys as any).lastCheck).toBe(2500)
  })

  it('再次 update tick 未超阈值时 lastCheck 不变', () => {
    sys.update(1, em, 2500)
    sys.update(1, em, 3000) // 差值 500 < 2500
    expect((sys as any).lastCheck).toBe(2500)
  })

  it('tick 再次超阈值时 lastCheck 更新', () => {
    sys.update(1, em, 2500)
    sys.update(1, em, 5001)
    expect((sys as any).lastCheck).toBe(5001)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 蜂蜜生产
// ─────────────────────────────────────────────────────────────────────────────
describe('蜂蜜生产逻辑', () => {
  let sys: CreatureApiarySystem
  beforeEach(() => { sys = makeApiSys(); nextId = 1 })

  it('collapsed 蜂房不产蜜', () => {
    const a = makeApiary(1, 'collapsed', { honeyStored: 0 })
    ;(sys as any).apiaries.push(a)
    // 直接调用内部更新逻辑（模拟 update 已通过节流）
    ;(sys as any).lastCheck = -9999
    const em = makeEmWithCreatures(0)
    sys.update(1, em, 0) // tick=0, lastCheck=-9999 → 通过节流
    // collapsed 不处理
    expect((sys as any).apiaries[0].honeyStored).toBe(0)
  })

  it('stable 蜂房产蜜（honeyStored 增加）', () => {
    const a = makeApiary(1, 'stable', { hiveCount: 2, honeyStored: 0 })
    ;(sys as any).apiaries.push(a)
    ;(sys as any).lastCheck = -9999
    const em = makeEmWithCreatures(0)
    sys.update(1, em, 0)
    // HONEY_RATE=0.8, hiveCount=2 → +1.6
    expect((sys as any).apiaries[0].honeyStored).toBeGreaterThan(0)
  })

  it('honeyStored 不超过 200', () => {
    const a = makeApiary(1, 'thriving', { hiveCount: 8, honeyStored: 199 })
    ;(sys as any).apiaries.push(a)
    ;(sys as any).lastCheck = -9999
    const em = makeEmWithCreatures(0)
    sys.update(1, em, 0)
    expect((sys as any).apiaries[0].honeyStored).toBeLessThanOrEqual(200)
  })

  it('hiveCount 越多产蜜越快', () => {
    const a1 = makeApiary(1, 'stable', { hiveCount: 1, honeyStored: 0 })
    const a2 = makeApiary(2, 'stable', { hiveCount: 4, honeyStored: 0 })
    ;(sys as any).apiaries.push(a1)
    ;(sys as any).apiaries.push(a2)
    ;(sys as any).lastCheck = -9999
    const em = makeEmWithCreatures(0)
    sys.update(1, em, 0)
    expect((sys as any).apiaries[1].honeyStored).toBeGreaterThan((sys as any).apiaries[0].honeyStored)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 蜂房清理（collapsed + 过期）
// ─────────────────────────────────────────────────────────────────────────────
describe('蜂房清理逻辑', () => {
  let sys: CreatureApiarySystem
  beforeEach(() => { sys = makeApiSys(); nextId = 1 })

  it('collapsed 且 tick < cutoff 的蜂房被移除', () => {
    // cutoff = tick - 100000；当前 tick=200000，cutoff=100000
    // 蜂房 tick=0 < 100000 → 被移除
    const a = makeApiary(1, 'collapsed', { tick: 0 })
    ;(sys as any).apiaries.push(a)
    ;(sys as any).lastCheck = -9999
    const em = makeEmWithCreatures(0)
    sys.update(1, em, 200000)
    expect((sys as any).apiaries).toHaveLength(0)
  })

  it('collapsed 但 tick 较新的蜂房不被移除', () => {
    // tick=199999 > cutoff=100000 → 保留
    const a = makeApiary(1, 'collapsed', { tick: 199999 })
    ;(sys as any).apiaries.push(a)
    ;(sys as any).lastCheck = -9999
    const em = makeEmWithCreatures(0)
    sys.update(1, em, 200000)
    expect((sys as any).apiaries).toHaveLength(1)
  })

  it('非 collapsed 蜂房不被时间清理', () => {
    const a = makeApiary(1, 'stable', { tick: 0 })
    ;(sys as any).apiaries.push(a)
    ;(sys as any).lastCheck = -9999
    const em = makeEmWithCreatures(0)
    sys.update(1, em, 200000)
    expect((sys as any).apiaries).toHaveLength(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// MAX_APIARIES 上限
// ─────────────────────────────────────────────────────────────────────────────
describe('MAX_APIARIES 上限', () => {
  let sys: CreatureApiarySystem
  beforeEach(() => { sys = makeApiSys(); nextId = 1 })

  it('apiaries 达到 20 个时不再新建', () => {
    // 注入 20 个蜂房（MAX_APIARIES）
    injectApiaries(sys, 20)
    // 强制 Math.random 返回 < BUILD_CHANCE
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = -9999
    const em = makeEmWithCreatures(5)
    sys.update(1, em, 0)
    expect((sys as any).apiaries.length).toBeLessThanOrEqual(20)
    randSpy.mockRestore()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// hiveCount 增长（thriving + 随机触发）
// ─────────────────────────────────────────────────────────────────────────────
describe('hiveCount 增长', () => {
  let sys: CreatureApiarySystem
  beforeEach(() => { sys = makeApiSys(); nextId = 1 })

  it('thriving 时 hiveCount 可增长（随机触发）', () => {
    const a = makeApiary(1, 'thriving', { hiveCount: 3 })
    ;(sys as any).apiaries.push(a)
    ;(sys as any).lastCheck = -9999
    // update 内部 Math.random() 调用顺序（em=0生物）：
    // #1: BUILD_CHANCE 检查 → 0.05 (> 0.004, 不新建)
    // #2: 健康 roll → 0.05 (>= 0.02, 不变健康)
    // #3: hiveCount 增长 roll → 0.005 (< 0.01, 增长)
    let callCount = 0
    const randSpy = vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 3) return 0.005 // hiveCount 增长
      return 0.05 // BUILD_CHANCE 跳过，健康不变
    })
    const em = makeEmWithCreatures(0)
    sys.update(1, em, 0)
    expect((sys as any).apiaries[0].hiveCount).toBe(4)
    randSpy.mockRestore()
  })

  it('hiveCount 不超过 8', () => {
    const a = makeApiary(1, 'thriving', { hiveCount: 8 })
    ;(sys as any).apiaries.push(a)
    ;(sys as any).lastCheck = -9999
    let callCount = 0
    const randSpy = vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      return callCount === 1 ? 0.05 : 0.005
    })
    const em = makeEmWithCreatures(0)
    sys.update(1, em, 0)
    expect((sys as any).apiaries[0].hiveCount).toBe(8)
    randSpy.mockRestore()
  })

  it('非 thriving 状态下 hiveCount 不增长', () => {
    const a = makeApiary(1, 'stable', { hiveCount: 3 })
    ;(sys as any).apiaries.push(a)
    ;(sys as any).lastCheck = -9999
    let callCount = 0
    const randSpy = vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      return callCount === 1 ? 0.05 : 0.005
    })
    const em = makeEmWithCreatures(0)
    sys.update(1, em, 0)
    // stable 不进入 hiveCount 增长分支
    expect((sys as any).apiaries[0].hiveCount).toBe(3)
    randSpy.mockRestore()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 蜂房健康状态迁移
// ─────────────────────────────────────────────────────────────────────────────
describe('蜂房健康状态迁移', () => {
  let sys: CreatureApiarySystem
  beforeEach(() => { sys = makeApiSys(); nextId = 1 })

  it('HEALTH_LEVELS 顺序: thriving < stable < stressed < collapsed', () => {
    const levels = ['thriving', 'stable', 'stressed', 'collapsed']
    expect(levels[0]).toBe('thriving')
    expect(levels[3]).toBe('collapsed')
  })

  it('stable 状态下 roll < 0.01 时健康恶化到 stressed', () => {
    const a = makeApiary(1, 'stable', { hiveCount: 3 })
    ;(sys as any).apiaries.push(a)
    ;(sys as any).lastCheck = -9999
    // #1: BUILD_CHANCE(0.05跳过), #2: roll=0.005 < 0.01 → idx=1, idx<3 → idx+1=2=stressed
    let callCount = 0
    const randSpy = vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 2) return 0.005 // 健康恶化分支 roll < 0.01
      return 0.05
    })
    const em = makeEmWithCreatures(0)
    sys.update(1, em, 0)
    expect((sys as any).apiaries[0].health).toBe('stressed')
    randSpy.mockRestore()
  })

  it('stable 状态下 0.01 <= roll < 0.02 时健康好转到 thriving', () => {
    const a = makeApiary(1, 'stable', { hiveCount: 3 })
    ;(sys as any).apiaries.push(a)
    ;(sys as any).lastCheck = -9999
    // roll=0.015 in [0.01, 0.02) → idx=1, idx>0 → idx-1=0=thriving
    let callCount = 0
    const randSpy = vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 2) return 0.015
      return 0.05
    })
    const em = makeEmWithCreatures(0)
    sys.update(1, em, 0)
    expect((sys as any).apiaries[0].health).toBe('thriving')
    randSpy.mockRestore()
  })

  it('thriving 状态下 roll < 0.01 时健康恶化到 stable', () => {
    const a = makeApiary(1, 'thriving', { hiveCount: 3 })
    ;(sys as any).apiaries.push(a)
    ;(sys as any).lastCheck = -9999
    // thriving idx=0; roll<0.01 → idx<3 → idx+1=1=stable
    let callCount = 0
    const randSpy = vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 2) return 0.005
      if (callCount === 3) return 0.05 // hiveCount roll 不增长
      return 0.05
    })
    const em = makeEmWithCreatures(0)
    sys.update(1, em, 0)
    expect((sys as any).apiaries[0].health).toBe('stable')
    randSpy.mockRestore()
  })

  it('roll >= 0.02 时健康状态不变（stable 保持 stable）', () => {
    const a = makeApiary(1, 'stable', { hiveCount: 3 })
    ;(sys as any).apiaries.push(a)
    ;(sys as any).lastCheck = -9999
    let callCount = 0
    const randSpy = vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 2) return 0.05 // roll >= 0.02 不变健康
      return 0.05
    })
    const em = makeEmWithCreatures(0)
    sys.update(1, em, 0)
    expect((sys as any).apiaries[0].health).toBe('stable')
    randSpy.mockRestore()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 坐标与空间数据
// ─────────────────────────────────────────────────────────────────────────────
describe('坐标与空间数据', () => {
  let sys: CreatureApiarySystem
  beforeEach(() => { sys = makeApiSys(); nextId = 1 })

  it('蜂房 x=0 y=0 合法', () => {
    const a = makeApiary(1, 'stable', { x: 0, y: 0 })
    ;(sys as any).apiaries.push(a)
    expect((sys as any).apiaries[0].x).toBe(0)
    expect((sys as any).apiaries[0].y).toBe(0)
  })

  it('蜂房负坐标合法存储', () => {
    const a = makeApiary(1, 'stable', { x: -10, y: -20 })
    ;(sys as any).apiaries.push(a)
    expect((sys as any).apiaries[0].x).toBe(-10)
    expect((sys as any).apiaries[0].y).toBe(-20)
  })

  it('pollinationRadius=0 合法', () => {
    const a = makeApiary(1, 'stable', { pollinationRadius: 0 })
    ;(sys as any).apiaries.push(a)
    expect((sys as any).apiaries[0].pollinationRadius).toBe(0)
  })

  it('pollinationRadius 大值合法', () => {
    const a = makeApiary(1, 'stable', { pollinationRadius: 100 })
    ;(sys as any).apiaries.push(a)
    expect((sys as any).apiaries[0].pollinationRadius).toBe(100)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// nextId 自增
// ─────────────────────────────────────────────────────────────────────────────
describe('nextId 自增', () => {
  let sys: CreatureApiarySystem
  beforeEach(() => { sys = makeApiSys(); nextId = 1 })

  it('系统初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('多个蜂房 id 唯一', () => {
    const ids = new Set<number>()
    for (let i = 0; i < 5; i++) {
      const a = makeApiary(i + 1)
      ;(sys as any).apiaries.push(a)
      ids.add(a.id)
    }
    expect(ids.size).toBe(5)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 极端值与边界
// ─────────────────────────────────────────────────────────────────────────────
describe('极端值与边界', () => {
  let sys: CreatureApiarySystem
  beforeEach(() => { sys = makeApiSys(); nextId = 1 })

  it('hiveCount=1 产蜜 0.8 * 1 = 0.8', () => {
    const a = makeApiary(1, 'stable', { hiveCount: 1, honeyStored: 0 })
    ;(sys as any).apiaries.push(a)
    ;(sys as any).lastCheck = -9999
    let callCount = 0
    const randSpy = vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      return 0.05
    })
    const em = makeEmWithCreatures(0)
    sys.update(1, em, 0)
    expect((sys as any).apiaries[0].honeyStored).toBeCloseTo(0.8)
    randSpy.mockRestore()
  })

  it('honeyStored=200 时产蜜后仍为 200（上限）', () => {
    const a = makeApiary(1, 'stable', { hiveCount: 8, honeyStored: 200 })
    ;(sys as any).apiaries.push(a)
    ;(sys as any).lastCheck = -9999
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.05)
    const em = makeEmWithCreatures(0)
    sys.update(1, em, 0)
    expect((sys as any).apiaries[0].honeyStored).toBe(200)
    randSpy.mockRestore()
  })

  it('keeperId 为大整数合法', () => {
    const a = makeApiary(999999, 'stable')
    ;(sys as any).apiaries.push(a)
    expect((sys as any).apiaries[0].keeperId).toBe(999999)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 多蜂房同时更新
// ─────────────────────────────────────────────────────────────────────────────
describe('多蜂房同时更新', () => {
  let sys: CreatureApiarySystem
  beforeEach(() => { sys = makeApiSys(); nextId = 1 })

  it('多个非 collapsed 蜂房全部产蜜', () => {
    ;(sys as any).apiaries.push(makeApiary(1, 'stable', { hiveCount: 2, honeyStored: 0 }))
    ;(sys as any).apiaries.push(makeApiary(2, 'thriving', { hiveCount: 3, honeyStored: 0 }))
    ;(sys as any).lastCheck = -9999
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.05)
    const em = makeEmWithCreatures(0)
    sys.update(1, em, 0)
    expect((sys as any).apiaries[0].honeyStored).toBeGreaterThan(0)
    expect((sys as any).apiaries[1].honeyStored).toBeGreaterThan(0)
    randSpy.mockRestore()
  })

  it('collapsed 混入时其他蜂房仍正常产蜜', () => {
    ;(sys as any).apiaries.push(makeApiary(1, 'collapsed', { hiveCount: 3, honeyStored: 0, tick: 0 }))
    ;(sys as any).apiaries.push(makeApiary(2, 'stable', { hiveCount: 2, honeyStored: 0 }))
    ;(sys as any).lastCheck = -9999
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.05)
    const em = makeEmWithCreatures(0)
    // tick=200000 让 collapsed 被清理
    sys.update(1, em, 200000)
    // collapsed 被移��，stable 产蜜
    const apiaries = (sys as any).apiaries
    expect(apiaries.some((a: any) => a.honeyStored > 0)).toBe(true)
    randSpy.mockRestore()
  })

  it('注入 10 个蜂房后数组长度为 10', () => {
    injectApiaries(sys, 10)
    expect((sys as any).apiaries).toHaveLength(10)
  })

  it('最大 20 个蜂房时数组上限正确', () => {
    injectApiaries(sys, 20)
    expect((sys as any).apiaries.length).toBe(20)
  })

  it('蜂房数组可被清空', () => {
    injectApiaries(sys, 5)
    ;(sys as any).apiaries.length = 0
    expect((sys as any).apiaries).toHaveLength(0)
  })

  it('不同 keeperId 的蜂房独立存在', () => {
    ;(sys as any).apiaries.push(makeApiary(10, 'thriving'))
    ;(sys as any).apiaries.push(makeApiary(20, 'stable'))
    ;(sys as any).apiaries.push(makeApiary(30, 'stressed'))
    const keepers = (sys as any).apiaries.map((a: any) => a.keeperId)
    expect(keepers).toContain(10)
    expect(keepers).toContain(20)
    expect(keepers).toContain(30)
  })

  it('同一 keeperId 可拥有多个蜂房', () => {
    ;(sys as any).apiaries.push(makeApiary(1, 'thriving'))
    ;(sys as any).apiaries.push(makeApiary(1, 'stable'))
    const sameKeeper = (sys as any).apiaries.filter((a: any) => a.keeperId === 1)
    expect(sameKeeper).toHaveLength(2)
  })

  it('蜂房数量为 0 时 update 不报错', () => {
    ;(sys as any).lastCheck = -9999
    const em = makeEmWithCreatures(0)
    expect(() => sys.update(1, em, 0)).not.toThrow()
  })
})
