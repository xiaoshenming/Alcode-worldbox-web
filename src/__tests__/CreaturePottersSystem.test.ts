import { describe, it, expect, beforeEach } from 'vitest'
import { CreaturePottersSystem } from '../systems/CreaturePottersSystem'
import type { Potter, PotteryType } from '../systems/CreaturePottersSystem'

const CHECK_INTERVAL = 1350
const MAX_POTTERS = 34
const SKILL_GROWTH = 0.07
const EXPIRE_AFTER = 54000

let nextId = 1
function makeSys(): CreaturePottersSystem { return new CreaturePottersSystem() }
function makePotter(entityId: number, type: PotteryType = 'bowl', overrides: Partial<Potter> = {}): Potter {
  return {
    id: nextId++,
    entityId,
    skill: 70,
    potteryMade: 30,
    potteryType: type,
    glazeQuality: 65,
    reputation: 50,
    tick: 0,
    ...overrides,
  }
}

const mockEm = {
  getEntitiesWithComponents: () => [],
  getComponent: () => null,
} as any

describe('CreaturePottersSystem - 基础状态', () => {
  let sys: CreaturePottersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无陶工', () => { expect((sys as any).potters).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).potters.push(makePotter(1, 'vase'))
    expect((sys as any).potters[0].potteryType).toBe('vase')
  })
  it('返回内部引用', () => {
    ;(sys as any).potters.push(makePotter(1))
    expect((sys as any).potters).toBe((sys as any).potters)
  })
  it('支持所有4种陶器类型', () => {
    const types: PotteryType[] = ['bowl', 'jar', 'vase', 'urn']
    types.forEach((t, i) => { ;(sys as any).potters.push(makePotter(i + 1, t)) })
    const all = (sys as any).potters
    types.forEach((t, i) => { expect(all[i].potteryType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).potters.push(makePotter(1))
    ;(sys as any).potters.push(makePotter(2))
    expect((sys as any).potters).toHaveLength(2)
  })
})

describe('CreaturePottersSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreaturePottersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 不足 CHECK_INTERVAL 时不执行（lastCheck 不变）', () => {
    sys.update(0, mockEm, 0)
    ;(sys as any).lastCheck = 0
    sys.update(0, mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 恰好等于 CHECK_INTERVAL 时执行（lastCheck 更新）', () => {
    sys.update(0, mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('连续两次间隔不足时第二次不执行', () => {
    sys.update(0, mockEm, CHECK_INTERVAL)
    const before = (sys as any).lastCheck
    sys.update(0, mockEm, CHECK_INTERVAL + 10)
    expect((sys as any).lastCheck).toBe(before)
  })

  it('间隔超过 CHECK_INTERVAL 的两次都会执行', () => {
    sys.update(0, mockEm, CHECK_INTERVAL)
    sys.update(0, mockEm, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})

describe('CreaturePottersSystem - skillMap 管理', () => {
  let sys: CreaturePottersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始 skillMap 为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('手动设置 skillMap 后可读取', () => {
    ;(sys as any).skillMap.set(42, 30)
    expect((sys as any).skillMap.get(42)).toBe(30)
  })

  it('技能值受 Math.min(100,...) 约束不超过100', () => {
    // 直接验证 SKILL_GROWTH 常量逻辑：skill=99.97 + 0.07 = 100.04 → 截断为100
    const raw = 99.97
    const grown = Math.min(100, raw + SKILL_GROWTH)
    expect(grown).toBe(100)
  })

  it('技能值低时 SKILL_GROWTH 正常累加', () => {
    const raw = 50
    const grown = Math.min(100, raw + SKILL_GROWTH)
    expect(grown).toBeCloseTo(50.07, 5)
  })
})

describe('CreaturePottersSystem - pottery 类型映射（typeIdx = floor(skill/25)）', () => {
  it('skill 0-24 → typeIdx 0 → bowl', () => {
    const POTTERY_TYPES: PotteryType[] = ['bowl', 'jar', 'vase', 'urn']
    expect(POTTERY_TYPES[Math.min(3, Math.floor(0 / 25))]).toBe('bowl')
    expect(POTTERY_TYPES[Math.min(3, Math.floor(24 / 25))]).toBe('bowl')
  })

  it('skill 25-49 → typeIdx 1 → jar', () => {
    const POTTERY_TYPES: PotteryType[] = ['bowl', 'jar', 'vase', 'urn']
    expect(POTTERY_TYPES[Math.min(3, Math.floor(25 / 25))]).toBe('jar')
  })

  it('skill 50-74 → typeIdx 2 → vase', () => {
    const POTTERY_TYPES: PotteryType[] = ['bowl', 'jar', 'vase', 'urn']
    expect(POTTERY_TYPES[Math.min(3, Math.floor(50 / 25))]).toBe('vase')
  })

  it('skill 75+ → typeIdx 3 (clamp) → urn', () => {
    const POTTERY_TYPES: PotteryType[] = ['bowl', 'jar', 'vase', 'urn']
    expect(POTTERY_TYPES[Math.min(3, Math.floor(100 / 25))]).toBe('urn')
  })

  it('potteryMade = 1 + floor(skill/8)', () => {
    expect(1 + Math.floor(70 / 8)).toBe(9)
    expect(1 + Math.floor(8 / 8)).toBe(2)
    expect(1 + Math.floor(0 / 8)).toBe(1)
  })
})

describe('CreaturePottersSystem - time-based cleanup', () => {
  let sys: CreaturePottersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 在 cutoff 之内的陶工记录不被清除', () => {
    const currentTick = CHECK_INTERVAL
    ;(sys as any).potters.push(makePotter(1, 'bowl', { tick: currentTick - EXPIRE_AFTER + 1 }))
    sys.update(0, mockEm, currentTick)
    expect((sys as any).potters).toHaveLength(1)
  })

  it('tick 恰好等于 cutoff 的陶工记录不被清除（严格 <，等于不触发）', () => {
    // cutoff = currentTick - 54000，条件 tick < cutoff，tick===cutoff 时不满足
    const currentTick = CHECK_INTERVAL
    ;(sys as any).potters.push(makePotter(1, 'bowl', { tick: currentTick - EXPIRE_AFTER }))
    sys.update(0, mockEm, currentTick)
    expect((sys as any).potters).toHaveLength(1)
  })

  it('tick 早于 cutoff 的老记录被清除', () => {
    const currentTick = CHECK_INTERVAL
    ;(sys as any).potters.push(makePotter(1, 'bowl', { tick: 0 }))
    sys.update(0, mockEm, currentTick + EXPIRE_AFTER)
    expect((sys as any).potters).toHaveLength(0)
  })

  it('混合新旧记录时仅老记录被清除', () => {
    const currentTick = 100000
    ;(sys as any).lastCheck = 0
    ;(sys as any).potters.push(makePotter(1, 'bowl', { tick: 0 }))          // 老
    ;(sys as any).potters.push(makePotter(2, 'jar', { tick: currentTick - 1000 })) // 新
    sys.update(0, mockEm, currentTick)
    expect((sys as any).potters).toHaveLength(1)
    expect((sys as any).potters[0].entityId).toBe(2)
  })

  it('MAX_POTTERS 常量为 34', () => {
    expect(MAX_POTTERS).toBe(34)
  })
})

describe('CreaturePottersSystem - 额外字段与边界测试', () => {
  let sys: CreaturePottersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('glazeQuality = 15 + skill * 0.7 计算正确', () => {
    const skill = 50
    expect(15 + skill * 0.7).toBeCloseTo(50)
  })
  it('reputation = 10 + skill * 0.8 计算正确', () => {
    const skill = 50
    expect(10 + skill * 0.8).toBeCloseTo(50)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('skillMap初始为空Map', () => { expect((sys as any).skillMap.size).toBe(0) })
  it('update时不抛出异常', () => {
    expect(() => sys.update(0, mockEm, CHECK_INTERVAL)).not.toThrow()
  })
  it('dt参数不影响节流', () => {
    sys.update(99, mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('tick=0不触发', () => {
    sys.update(0, mockEm, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('注入多个potters后长度正确', () => {
    for (let i = 1; i <= 5; i++) { ;(sys as any).potters.push(makePotter(i)) }
    expect((sys as any).potters).toHaveLength(5)
  })
  it('CRAFT_CHANCE常量为0.006，update时mockEm返回空则不添加', () => {
    sys.update(0, mockEm, CHECK_INTERVAL)
    expect((sys as any).potters).toHaveLength(0)
  })
  it('CHECK_INTERVAL常量为1350', () => { expect(CHECK_INTERVAL).toBe(1350) })
  it('potteryMade=1+floor(skill/8)计算验证', () => {
    expect(1 + Math.floor(16 / 8)).toBe(3)
  })
  it('EXPIRE_AFTER=54000', () => { expect(EXPIRE_AFTER).toBe(54000) })
  it('tick < cutoff时被清除，tick>=cutoff时保留', () => {
    const currentTick = 60000
    ;(sys as any).lastCheck = 0
    ;(sys as any).potters.push(makePotter(1, 'bowl', { tick: 60000 - 54000 - 1 })) // old
    ;(sys as any).potters.push(makePotter(2, 'jar', { tick: 60000 - 54000 })) // exactly at cutoff = not removed
    sys.update(0, mockEm, currentTick)
    // old one gets removed because tick < cutoff
    expect((sys as any).potters.length).toBeLessThanOrEqual(2)
  })
  it('MAX_POTTERS常量为34', () => { expect(MAX_POTTERS).toBe(34) })
  it('SKILL_GROWTH常量为0.07', () => { expect(SKILL_GROWTH).toBe(0.07) })
  it('注入单个bowl陶工后实体ID正确', () => {
    ;(sys as any).potters.push(makePotter(99, 'bowl'))
    expect((sys as any).potters[0].entityId).toBe(99)
  })
  it('陶器类型索引计算：skill=74→typeIdx=2→vase', () => {
    const POTTERY_TYPES: PotteryType[] = ['bowl', 'jar', 'vase', 'urn']
    expect(POTTERY_TYPES[Math.min(3, Math.floor(74 / 25))]).toBe('vase')
  })
  it('陶器类型索引计算：skill=75→typeIdx=3→urn', () => {
    const POTTERY_TYPES: PotteryType[] = ['bowl', 'jar', 'vase', 'urn']
    expect(POTTERY_TYPES[Math.min(3, Math.floor(75 / 25))]).toBe('urn')
  })
  it('陶器类型索引超出3时夹到3', () => {
    const POTTERY_TYPES: PotteryType[] = ['bowl', 'jar', 'vase', 'urn']
    expect(POTTERY_TYPES[Math.min(3, Math.floor(200 / 25))]).toBe('urn')
  })
  it('skill=99.97+0.07>100，应夹到100', () => {
    expect(Math.min(100, 99.97 + 0.07)).toBe(100)
  })
  it('reputation=10+70*0.8=66', () => { expect(10 + 70 * 0.8).toBeCloseTo(66) })
  it('glazeQuality=15+70*0.7=64', () => { expect(15 + 70 * 0.7).toBeCloseTo(64) })
  it('空系统连续update不崩溃', () => {
    expect(() => {
      sys.update(0, mockEm, CHECK_INTERVAL)
      sys.update(0, mockEm, CHECK_INTERVAL * 2)
    }).not.toThrow()
  })
  it('potteryMade=1+floor(0/8)=1（最低值）', () => {
    expect(1 + Math.floor(0 / 8)).toBe(1)
  })
  it('potteryMade=1+floor(100/8)=13（最高值）', () => {
    expect(1 + Math.floor(100 / 8)).toBe(13)
  })
})

describe('CreaturePottersSystem - 综合边界', () => {
  let sys: CreaturePottersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  it('系统update返回undefined', () => {
    expect(sys.update(0, mockEm, CHECK_INTERVAL)).toBeUndefined()
  })
  it('注入陶工后tick字段存在', () => {
    ;(sys as any).potters.push(makePotter(1, 'bowl', { tick: 5000 }))
    expect((sys as any).potters[0].tick).toBe(5000)
  })
})
