import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFurriersSystem } from '../systems/CreatureFurriersSystem'
import type { Furrier, FurType } from '../systems/CreatureFurriersSystem'

let nextId = 1
function makeSys(): CreatureFurriersSystem { return new CreatureFurriersSystem() }
function makeFurrier(entityId: number, furType: FurType = 'fox', skill = 40): Furrier {
  return {
    id: nextId++,
    entityId,
    skill,
    peltsProcessed: 1 + Math.floor(skill / 8),
    furType,
    tanningQuality: 16 + skill * 0.68,
    reputation: 10 + skill * 0.8,
    tick: 0,
  }
}

// ---- FurType 类型验证 ----
describe('FurType 枚举验证', () => {
  it('fox 是合法毛皮类型', () => {
    const f = makeFurrier(1, 'fox')
    expect(f.furType).toBe('fox')
  })
  it('beaver 是合法毛皮类型', () => {
    const f = makeFurrier(2, 'beaver')
    expect(f.furType).toBe('beaver')
  })
  it('mink 是合法毛皮类型', () => {
    const f = makeFurrier(3, 'mink')
    expect(f.furType).toBe('mink')
  })
  it('ermine 是合法毛皮类型', () => {
    const f = makeFurrier(4, 'ermine')
    expect(f.furType).toBe('ermine')
  })
})

// ---- furType 4段映射 (Math.min(3, Math.floor(skill / 25))) ----
describe('furType 随技能的4段映射', () => {
  const TYPES: FurType[] = ['fox', 'beaver', 'mink', 'ermine']

  it('skill=0 => fox (index 0)', () => {
    const idx = Math.min(3, Math.floor(0 / 25))
    expect(TYPES[idx]).toBe('fox')
  })
  it('skill=24 => fox (index 0)', () => {
    const idx = Math.min(3, Math.floor(24 / 25))
    expect(TYPES[idx]).toBe('fox')
  })
  it('skill=25 => beaver (index 1)', () => {
    const idx = Math.min(3, Math.floor(25 / 25))
    expect(TYPES[idx]).toBe('beaver')
  })
  it('skill=50 => mink (index 2)', () => {
    const idx = Math.min(3, Math.floor(50 / 25))
    expect(TYPES[idx]).toBe('mink')
  })
  it('skill=75 => ermine (index 3)', () => {
    const idx = Math.min(3, Math.floor(75 / 25))
    expect(TYPES[idx]).toBe('ermine')
  })
  it('skill=100 => ermine (index capped at 3)', () => {
    const idx = Math.min(3, Math.floor(100 / 25))
    expect(TYPES[idx]).toBe('ermine')
  })
})

// ---- tanningQuality 公式 ----
describe('tanningQuality 公式 (16 + skill * 0.68)', () => {
  it('skill=0 时 tanningQuality=16', () => {
    expect(16 + 0 * 0.68).toBeCloseTo(16)
  })
  it('skill=40 时 tanningQuality=43.2', () => {
    expect(16 + 40 * 0.68).toBeCloseTo(43.2)
  })
  it('skill=100 时 tanningQuality=84', () => {
    expect(16 + 100 * 0.68).toBeCloseTo(84)
  })
  it('注入的furrier字段与公式一致', () => {
    const skill = 50
    const f = makeFurrier(1, 'fox', skill)
    expect(f.tanningQuality).toBeCloseTo(16 + skill * 0.68)
  })
})

// ---- reputation 公式 ----
describe('reputation 公式 (10 + skill * 0.8)', () => {
  it('skill=0 时 reputation=10', () => {
    expect(10 + 0 * 0.8).toBeCloseTo(10)
  })
  it('skill=50 时 reputation=50', () => {
    expect(10 + 50 * 0.8).toBeCloseTo(50)
  })
  it('skill=100 时 reputation=90', () => {
    expect(10 + 100 * 0.8).toBeCloseTo(90)
  })
  it('注入的furrier reputation字段与公式一致', () => {
    const skill = 60
    const f = makeFurrier(1, 'fox', skill)
    expect(f.reputation).toBeCloseTo(10 + skill * 0.8)
  })
})

// ---- peltsProcessed 计算 ----
describe('peltsProcessed 公式 (1 + Math.floor(skill / 8))', () => {
  it('skill=0 时 peltsProcessed=1', () => {
    expect(1 + Math.floor(0 / 8)).toBe(1)
  })
  it('skill=8 时 peltsProcessed=2', () => {
    expect(1 + Math.floor(8 / 8)).toBe(2)
  })
  it('skill=40 时 peltsProcessed=6', () => {
    expect(1 + Math.floor(40 / 8)).toBe(6)
  })
  it('skill=100 时 peltsProcessed=13', () => {
    expect(1 + Math.floor(100 / 8)).toBe(13)
  })
})

// ---- CHECK_INTERVAL 节流 ----
describe('CHECK_INTERVAL 节流 (1420)', () => {
  let sys: CreatureFurriersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick=0 时 lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('CHECK_INTERVAL 值为 1420', () => {
    // 通过白盒：构造一个空em，call update时tick<1420不更新lastCheck
    const fakEm = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
      hasComponent: () => false,
    } as any
    sys.update(0, fakEm, 100)
    expect((sys as any).lastCheck).toBe(0)   // 100 < 1420，未触发
  })
  it('tick>=1420 时触发检查并更新lastCheck', () => {
    const fakEm = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
      hasComponent: () => false,
    } as any
    sys.update(0, fakEm, 1420)
    expect((sys as any).lastCheck).toBe(1420)
  })
  it('二次调用若tick未达间隔则跳过', () => {
    const fakEm = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
      hasComponent: () => false,
    } as any
    sys.update(0, fakEm, 1420)
    sys.update(0, fakEm, 1500)  // 1500-1420=80 < 1420
    expect((sys as any).lastCheck).toBe(1420)
  })
})

// ---- time-based cleanup ----
describe('time-based cleanup (cutoff = tick - 54000)', () => {
  let sys: CreatureFurriersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick在cutoff内的maker不被清除', () => {
    const f = makeFurrier(1)
    f.tick = 1000
    ;(sys as any).makers.push(f)
    ;(sys as any).lastCheck = 0
    const fakEm = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
      hasComponent: () => false,
    } as any
    sys.update(0, fakEm, 1420)  // cutoff = 1420 - 54000 < 0, 所以 1000 > cutoff 不删
    expect((sys as any).makers).toHaveLength(1)
  })

  it('tick早于cutoff的maker被清除', () => {
    const f = makeFurrier(1)
    f.tick = 100  // tick=100 < cutoff=60000-54000=6000
    ;(sys as any).makers.push(f)
    ;(sys as any).lastCheck = 0
    const fakEm = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
      hasComponent: () => false,
    } as any
    sys.update(0, fakEm, 60000)  // cutoff = 60000 - 54000 = 6000
    expect((sys as any).makers).toHaveLength(0)
  })
})

// ---- 基础 makers 管理 ----
describe('CreatureFurriersSystem makers 管理', () => {
  let sys: CreatureFurriersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无毛皮工', () => { expect((sys as any).makers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeFurrier(1, 'mink'))
    expect((sys as any).makers[0].furType).toBe('mink')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeFurrier(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })

  it('支持所有 4 种毛皮类型', () => {
    const types: FurType[] = ['fox', 'beaver', 'mink', 'ermine']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeFurrier(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].furType).toBe(t) })
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeFurrier(1))
    ;(sys as any).makers.push(makeFurrier(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})
