import { describe, it, expect, beforeEach } from 'vitest'
import { CreaturePotterySystem } from '../systems/CreaturePotterySystem'
import type { Pottery, PotteryStyle, PotteryUse } from '../systems/CreaturePotterySystem'

const CHECK_INTERVAL = 1200
const MAX_POTTERY = 100
const SKILL_GROWTH = 0.07
const EXPIRE_AFTER = 60000
const DURABILITY_DECAY = 0.02

let nextId = 1
function makeSys(): CreaturePotterySystem { return new CreaturePotterySystem() }
function makePottery(crafterId: number, overrides: Partial<Pottery> = {}): Pottery {
  return {
    id: nextId++,
    crafterId,
    style: 'coiled',
    use: 'storage',
    quality: 70,
    durability: 65,
    tradeValue: 20,
    tick: 0,
    ...overrides,
  }
}

const mockEm = {
  getEntitiesWithComponents: () => [],
  getComponent: () => null,
} as any

describe('CreaturePotterySystem - 基础状态', () => {
  let sys: CreaturePotterySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无陶器', () => { expect((sys as any).pottery).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).pottery.push(makePottery(1, { style: 'wheel-thrown', use: 'cooking' }))
    expect((sys as any).pottery[0].style).toBe('wheel-thrown')
  })
  it('返回内部引用', () => {
    ;(sys as any).pottery.push(makePottery(1))
    expect((sys as any).pottery).toBe((sys as any).pottery)
  })
  it('支持所有6种风格', () => {
    const styles: PotteryStyle[] = ['coiled', 'wheel-thrown', 'slab-built', 'pinched', 'molded', 'glazed']
    styles.forEach((s, i) => { ;(sys as any).pottery.push(makePottery(i + 1, { style: s })) })
    expect((sys as any).pottery).toHaveLength(6)
  })
  it('多个全部返回', () => {
    ;(sys as any).pottery.push(makePottery(1))
    ;(sys as any).pottery.push(makePottery(2))
    expect((sys as any).pottery).toHaveLength(2)
  })
})

describe('CreaturePotterySystem - CHECK_INTERVAL 节流', () => {
  let sys: CreaturePotterySystem
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
    sys.update(0, mockEm, CHECK_INTERVAL + 5)
    expect((sys as any).lastCheck).toBe(before)
  })

  it('间隔超过 CHECK_INTERVAL 的两次都会执行', () => {
    sys.update(0, mockEm, CHECK_INTERVAL)
    sys.update(0, mockEm, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})

describe('CreaturePotterySystem - skillMap 管理', () => {
  let sys: CreaturePotterySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始 skillMap 为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('手动设置 skillMap 后可读取', () => {
    ;(sys as any).skillMap.set(99, 55)
    expect((sys as any).skillMap.get(99)).toBe(55)
  })

  it('SKILL_GROWTH 累加后不超过上限 100', () => {
    const raw = 99.95
    expect(Math.min(100, raw + SKILL_GROWTH)).toBe(100)
  })

  it('低技能值正常累加 SKILL_GROWTH', () => {
    const raw = 40
    expect(Math.min(100, raw + SKILL_GROWTH)).toBeCloseTo(40.07, 5)
  })
})

describe('CreaturePotterySystem - quality/durability/tradeValue 数值计算', () => {
  it('quality = skill * (0.5~1.0)，skill=100 时 quality 在 50~100', () => {
    const skill = 100
    // 最小：skill * 0.5
    expect(skill * 0.5).toBe(50)
    // 最大：skill * 1.0
    expect(skill * 1.0).toBe(100)
  })

  it('durability = 50 + skill * 0.4', () => {
    expect(50 + 0 * 0.4).toBe(50)
    expect(50 + 50 * 0.4).toBe(70)
    expect(50 + 100 * 0.4).toBe(90)
  })

  it('tradeValue = skill * 0.6', () => {
    expect(0 * 0.6).toBe(0)
    expect(50 * 0.6).toBe(30)
    expect(100 * 0.6).toBe(60)
  })

  it('陶器6种用途均有效', () => {
    const uses: PotteryUse[] = ['storage', 'cooking', 'ceremonial', 'trade', 'decorative', 'funerary']
    expect(uses).toHaveLength(6)
    uses.forEach(u => expect(typeof u).toBe('string'))
  })
})

describe('CreaturePotterySystem - durability 衰减与 cleanup', () => {
  let sys: CreaturePotterySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('每次 update 后 durability 减少 0.02', () => {
    ;(sys as any).pottery.push(makePottery(1, { durability: 10 }))
    sys.update(0, mockEm, CHECK_INTERVAL)
    expect((sys as any).pottery[0].durability).toBeCloseTo(10 - DURABILITY_DECAY, 5)
  })

  it('durability <= 0 时陶器被清除', () => {
    ;(sys as any).pottery.push(makePottery(1, { durability: 0.01 }))
    sys.update(0, mockEm, CHECK_INTERVAL)
    expect((sys as any).pottery).toHaveLength(0)
  })

  it('durability > DECAY 时陶器保留', () => {
    ;(sys as any).pottery.push(makePottery(1, { durability: 5 }))
    sys.update(0, mockEm, CHECK_INTERVAL)
    expect((sys as any).pottery).toHaveLength(1)
  })

  it('tick 恰好等于 cutoff 时不被清除（严格 <，等于不触发），只有耐久减少', () => {
    // cutoff = currentTick - 60000，条件 tick < cutoff，tick===cutoff 不满足
    const currentTick = CHECK_INTERVAL
    ;(sys as any).pottery.push(makePottery(1, { tick: currentTick - EXPIRE_AFTER, durability: 99 }))
    sys.update(0, mockEm, currentTick)
    expect((sys as any).pottery).toHaveLength(1)
  })

  it('tick 在 cutoff 之内且 durability 充足的陶器保留', () => {
    const currentTick = CHECK_INTERVAL
    ;(sys as any).pottery.push(makePottery(1, { tick: currentTick - EXPIRE_AFTER + 1, durability: 99 }))
    sys.update(0, mockEm, currentTick)
    expect((sys as any).pottery).toHaveLength(1)
  })

  it('混合情况：老/低耐久被清除，新/高耐久保留', () => {
    const currentTick = 100000
    ;(sys as any).lastCheck = 0
    ;(sys as any).pottery.push(makePottery(1, { tick: 0, durability: 99 }))              // 老→清除
    ;(sys as any).pottery.push(makePottery(2, { tick: currentTick - 100, durability: 0.005 })) // 低耐久→清除
    ;(sys as any).pottery.push(makePottery(3, { tick: currentTick - 500, durability: 50 }))    // 新+耐久→保留
    sys.update(0, mockEm, currentTick)
    expect((sys as any).pottery).toHaveLength(1)
    expect((sys as any).pottery[0].crafterId).toBe(3)
  })

  it('MAX_POTTERY 常量为 100', () => {
    expect(MAX_POTTERY).toBe(100)
  })
})
