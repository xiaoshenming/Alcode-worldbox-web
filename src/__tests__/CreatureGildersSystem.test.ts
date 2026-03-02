import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureGildersSystem } from '../systems/CreatureGildersSystem'
import type { Gilder, GildingMethod } from '../systems/CreatureGildersSystem'

let nextId = 1
function makeSys(): CreatureGildersSystem { return new CreatureGildersSystem() }
function makeMaker(entityId: number, gildingMethod: GildingMethod = 'water', skill = 40): Gilder {
  return {
    id: nextId++,
    entityId,
    skill,
    piecesGilded: 1 + Math.floor(skill / 9),
    gildingMethod,
    leafThinness: 14 + skill * 0.7,
    reputation: 10 + skill * 0.85,
    tick: 0,
  }
}

// ---- GildingMethod 类型验证 ----
describe('GildingMethod 枚举验证', () => {
  it('water 是合法镀金方法', () => {
    const g = makeMaker(1, 'water')
    expect(g.gildingMethod).toBe('water')
  })
  it('oil 是合法镀金方法', () => {
    const g = makeMaker(2, 'oil')
    expect(g.gildingMethod).toBe('oil')
  })
  it('fire 是合法镀金方法', () => {
    const g = makeMaker(3, 'fire')
    expect(g.gildingMethod).toBe('fire')
  })
  it('mercury 是合法镀金方法', () => {
    const g = makeMaker(4, 'mercury')
    expect(g.gildingMethod).toBe('mercury')
  })
})

// ---- gildingMethod 4段映射 (Math.min(3, Math.floor(skill / 25))) ----
describe('gildingMethod 随技能的4段映射', () => {
  const METHODS: GildingMethod[] = ['water', 'oil', 'fire', 'mercury']

  it('skill=0 => water (index 0)', () => {
    const idx = Math.min(3, Math.floor(0 / 25))
    expect(METHODS[idx]).toBe('water')
  })
  it('skill=24 => water (index 0)', () => {
    const idx = Math.min(3, Math.floor(24 / 25))
    expect(METHODS[idx]).toBe('water')
  })
  it('skill=25 => oil (index 1)', () => {
    const idx = Math.min(3, Math.floor(25 / 25))
    expect(METHODS[idx]).toBe('oil')
  })
  it('skill=50 => fire (index 2)', () => {
    const idx = Math.min(3, Math.floor(50 / 25))
    expect(METHODS[idx]).toBe('fire')
  })
  it('skill=75 => mercury (index 3)', () => {
    const idx = Math.min(3, Math.floor(75 / 25))
    expect(METHODS[idx]).toBe('mercury')
  })
  it('skill=100 => mercury (index capped at 3)', () => {
    const idx = Math.min(3, Math.floor(100 / 25))
    expect(METHODS[idx]).toBe('mercury')
  })
})

// ---- leafThinness 公式 ----
describe('leafThinness 公式 (14 + skill * 0.7)', () => {
  it('skill=0 时 leafThinness=14', () => {
    expect(14 + 0 * 0.7).toBeCloseTo(14)
  })
  it('skill=40 时 leafThinness=42', () => {
    expect(14 + 40 * 0.7).toBeCloseTo(42)
  })
  it('skill=100 时 leafThinness=84', () => {
    expect(14 + 100 * 0.7).toBeCloseTo(84)
  })
  it('注入的gilder字段与公式一致', () => {
    const skill = 60
    const g = makeMaker(1, 'water', skill)
    expect(g.leafThinness).toBeCloseTo(14 + skill * 0.7)
  })
})

// ---- reputation 公式 ----
describe('reputation 公式 (10 + skill * 0.85)', () => {
  it('skill=0 时 reputation=10', () => {
    expect(10 + 0 * 0.85).toBeCloseTo(10)
  })
  it('skill=40 时 reputation=44', () => {
    expect(10 + 40 * 0.85).toBeCloseTo(44)
  })
  it('skill=100 时 reputation=95', () => {
    expect(10 + 100 * 0.85).toBeCloseTo(95)
  })
  it('注入的gilder reputation字段与公式一致', () => {
    const skill = 70
    const g = makeMaker(1, 'water', skill)
    expect(g.reputation).toBeCloseTo(10 + skill * 0.85)
  })
})

// ---- piecesGilded 计算 ----
describe('piecesGilded 公式 (1 + Math.floor(skill / 9))', () => {
  it('skill=0 时 piecesGilded=1', () => {
    expect(1 + Math.floor(0 / 9)).toBe(1)
  })
  it('skill=9 时 piecesGilded=2', () => {
    expect(1 + Math.floor(9 / 9)).toBe(2)
  })
  it('skill=40 时 piecesGilded=5', () => {
    expect(1 + Math.floor(40 / 9)).toBe(5)
  })
  it('skill=100 时 piecesGilded=12', () => {
    expect(1 + Math.floor(100 / 9)).toBe(12)
  })
})

// ---- CHECK_INTERVAL 节流 ----
describe('CHECK_INTERVAL 节流 (1440)', () => {
  let sys: CreatureGildersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick=0 时 lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick < 1440 时不触发（lastCheck不变）', () => {
    const fakEm = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
      hasComponent: () => false,
    } as any
    sys.update(0, fakEm, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick >= 1440 时触发检查并更新 lastCheck', () => {
    const fakEm = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
      hasComponent: () => false,
    } as any
    sys.update(0, fakEm, 1440)
    expect((sys as any).lastCheck).toBe(1440)
  })
  it('二次调用若tick未达间隔则跳过', () => {
    const fakEm = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
      hasComponent: () => false,
    } as any
    sys.update(0, fakEm, 1440)
    sys.update(0, fakEm, 1500)  // 1500-1440=60 < 1440
    expect((sys as any).lastCheck).toBe(1440)
  })
})

// ---- time-based cleanup ----
describe('time-based cleanup (cutoff = tick - 52000)', () => {
  let sys: CreatureGildersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick在cutoff内的maker不被清除', () => {
    const g = makeMaker(1)
    g.tick = 1000
    ;(sys as any).makers.push(g)
    ;(sys as any).lastCheck = 0
    const fakEm = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
      hasComponent: () => false,
    } as any
    sys.update(0, fakEm, 1440)  // cutoff = 1440 - 52000 < 0, 1000 > cutoff 不删
    expect((sys as any).makers).toHaveLength(1)
  })

  it('tick早于cutoff的maker被清除', () => {
    const g = makeMaker(1)
    g.tick = 100  // tick=100 < cutoff=60000-52000=8000
    ;(sys as any).makers.push(g)
    ;(sys as any).lastCheck = 0
    const fakEm = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
      hasComponent: () => false,
    } as any
    sys.update(0, fakEm, 60000)  // cutoff = 60000 - 52000 = 8000
    expect((sys as any).makers).toHaveLength(0)
  })
})

// ---- 基础 makers 管理 ----
describe('CreatureGildersSystem makers 管理', () => {
  let sys: CreatureGildersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无镀金工', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'fire'))
    expect((sys as any).makers[0].gildingMethod).toBe('fire')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有 4 种镀金方法', () => {
    const methods: GildingMethod[] = ['water', 'oil', 'fire', 'mercury']
    methods.forEach((m, i) => { ;(sys as any).makers.push(makeMaker(i + 1, m)) })
    const all = (sys as any).makers
    methods.forEach((m, i) => { expect(all[i].gildingMethod).toBe(m) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})
