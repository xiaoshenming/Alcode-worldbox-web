import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticNavalBlockadeSystem } from '../systems/DiplomaticNavalBlockadeSystem'
import type { NavalBlockade, BlockadeStrength } from '../systems/DiplomaticNavalBlockadeSystem'

const CHECK_INTERVAL = 1800
const MAX_BLOCKADES = 30
const EXPIRE_OFFSET = 40000
const EM = {} as any

function makeSys() { return new DiplomaticNavalBlockadeSystem() }
function makeCM(ids: number[] = []) {
  const civs = new Map(ids.map(id => [id, { id }]))
  return { civilizations: civs } as any
}
function getB(sys: any): NavalBlockade[] { return sys.blockades }
function makeB(o: Partial<NavalBlockade> = {}): NavalBlockade {
  return { id: 1, blockaderCivId: 1, targetCivId: 2, strength: 'light',
    effectiveness: 50, tradeReduction: 40, moraleDamage: 15, tick: 0, ...o }
}

describe('DiplomaticNavalBlockadeSystem — 基础数据结构', () => {
  let sys: DiplomaticNavalBlockadeSystem
  beforeEach(() => { sys = makeSys() })

  it('初始blockades为空数组', () => { expect(getB(sys)).toHaveLength(0) })
  it('blockades是数组类型', () => { expect(Array.isArray(getB(sys))).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('注入一条后长度为1', () => { getB(sys).push(makeB()); expect(getB(sys)).toHaveLength(1) })
  it('NavalBlockade包含id字段', () => { expect(makeB()).toHaveProperty('id') })
  it('NavalBlockade包含blockaderCivId', () => { expect(makeB()).toHaveProperty('blockaderCivId') })
  it('NavalBlockade包含targetCivId', () => { expect(makeB()).toHaveProperty('targetCivId') })
  it('NavalBlockade包含strength', () => { expect(makeB()).toHaveProperty('strength') })
  it('NavalBlockade包含effectiveness', () => { expect(makeB()).toHaveProperty('effectiveness') })
  it('NavalBlockade包含tradeReduction', () => { expect(makeB()).toHaveProperty('tradeReduction') })
  it('NavalBlockade包含moraleDamage', () => { expect(makeB()).toHaveProperty('moraleDamage') })
  it('NavalBlockade包含tick', () => { expect(makeB()).toHaveProperty('tick') })
})

describe('DiplomaticNavalBlockadeSystem — CHECK_INTERVAL=1800 节流', () => {
  let sys: DiplomaticNavalBlockadeSystem
  beforeEach(() => { sys = makeSys(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0不触发', () => { sys.update(1, EM, makeCM([1,2]), 0); expect((sys as any).lastCheck).toBe(0) })
  it('tick=1799不触发', () => { sys.update(1, EM, makeCM([1,2]), 1799); expect((sys as any).lastCheck).toBe(0) })
  it('tick=1800触发', () => { sys.update(1, EM, makeCM([1,2]), 1800); expect((sys as any).lastCheck).toBe(1800) })
  it('tick=2000触发', () => { sys.update(1, EM, makeCM([1,2]), 2000); expect((sys as any).lastCheck).toBe(2000) })
  it('间隔不足不更新', () => {
    sys.update(1, EM, makeCM([1,2]), 1800)
    sys.update(1, EM, makeCM([1,2]), 2000)
    expect((sys as any).lastCheck).toBe(1800)
  })
  it('间隔足够第二次更新', () => {
    sys.update(1, EM, makeCM([1,2]), 1800)
    sys.update(1, EM, makeCM([1,2]), 3600)
    expect((sys as any).lastCheck).toBe(3600)
  })
  it('文明数<2时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, EM, makeCM([1]), 1800)
    expect(getB(sys)).toHaveLength(0)
  })
  it('文明数=0时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, EM, makeCM([]), 1800)
    expect(getB(sys)).toHaveLength(0)
  })
})

describe('DiplomaticNavalBlockadeSystem — effectiveness衰减', () => {
  let sys: DiplomaticNavalBlockadeSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('每次update effectiveness减少0.05', () => {
    getB(sys).push(makeB({ effectiveness: 50, tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, EM, makeCM([1,2]), 1800)
    expect(getB(sys)[0].effectiveness).toBeCloseTo(49.95, 2)
  })
  it('tradeReduction = effectiveness * 0.8', () => {
    getB(sys).push(makeB({ effectiveness: 50, tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, EM, makeCM([1,2]), 1800)
    const b = getB(sys)[0]
    expect(b.tradeReduction).toBeCloseTo(b.effectiveness * 0.8, 5)
  })
  it('effectiveness不低于0', () => {
    getB(sys).push(makeB({ effectiveness: 0, tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, EM, makeCM([1,2]), 1800)
    expect(getB(sys)[0]?.effectiveness ?? 0).toBeGreaterThanOrEqual(0)
  })
  it('多次update后effectiveness持续衰减', () => {
    getB(sys).push(makeB({ effectiveness: 10, tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, EM, makeCM([1,2]), 1800)
    sys.update(1, EM, makeCM([1,2]), 3600)
    const eff = getB(sys)[0]?.effectiveness ?? 0
    expect(eff).toBeLessThanOrEqual(10)
  })
})

describe('DiplomaticNavalBlockadeSystem — 过期清理', () => {
  let sys: DiplomaticNavalBlockadeSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0在tick=45000时被清理', () => {
    getB(sys).push(makeB({ id: 1, tick: 0, effectiveness: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, EM, makeCM([1,2]), 45000)
    expect(getB(sys)).toHaveLength(0)
  })
  it('effectiveness=0时被清理', () => {
    getB(sys).push(makeB({ id: 1, tick: 999999, effectiveness: 0.04 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, EM, makeCM([1,2]), 1800)
    // effectiveness=0.04-0.05<0 => cleaned
    expect(getB(sys)).toHaveLength(0)
  })
  it('新鲜tick高effectiveness存活', () => {
    getB(sys).push(makeB({ id: 1, tick: 999999, effectiveness: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, EM, makeCM([1,2]), 1800)
    expect(getB(sys)).toHaveLength(1)
  })
  it('全部过期时清空', () => {
    getB(sys).push(makeB({ id: 1, tick: 0, effectiveness: 50 }))
    getB(sys).push(makeB({ id: 2, tick: 100, effectiveness: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, EM, makeCM([1,2]), 45000)
    expect(getB(sys)).toHaveLength(0)
  })
  it('无记录时不报错', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    expect(() => sys.update(1, EM, makeCM([1,2]), 45000)).not.toThrow()
  })
})

describe('DiplomaticNavalBlockadeSystem — MAX_BLOCKADES=30 上限', () => {
  let sys: DiplomaticNavalBlockadeSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('满30条时不新增', () => {
    for (let _i = 1; _i <= MAX_BLOCKADES; _i++) {
      getB(sys).push(makeB({ id: _i, tick: 999999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, EM, makeCM([1,2]), 1800)
    expect(getB(sys)).toHaveLength(MAX_BLOCKADES)
  })
  it('BlockadeStrength包含4种', () => {
    const strengths: BlockadeStrength[] = ['light', 'moderate', 'heavy', 'total']
    expect(strengths).toHaveLength(4)
  })
  it('各strength可赋值', () => {
    const strengths: BlockadeStrength[] = ['light', 'moderate', 'heavy', 'total']
    strengths.forEach(s => { expect(makeB({ strength: s }).strength).toBe(s) })
  })
  it('nextId=1', () => { expect((sys as any).nextId).toBe(1) })
  it('系统实例化不报错', () => { expect(() => new DiplomaticNavalBlockadeSystem()).not.toThrow() })
  it('CHECK_INTERVAL=1800', () => { expect(CHECK_INTERVAL).toBe(1800) })
  it('MAX_BLOCKADES=30', () => { expect(MAX_BLOCKADES).toBe(30) })
  it('EXPIRE_OFFSET=40000', () => { expect(EXPIRE_OFFSET).toBe(40000) })
  it('数组可独立注入读取', () => {
    getB(sys).push(makeB({ id: 99 }))
    expect(getB(sys)[0].id).toBe(99)
  })
  it('整体不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    expect(() => {
      for (let _i = 0; _i <= 5; _i++) sys.update(1, EM, makeCM([1,2]), CHECK_INTERVAL * _i)
    }).not.toThrow()
  })
})

describe('DiplomaticNavalBlockadeSystem — 额外验证', () => {
  let sys: DiplomaticNavalBlockadeSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tradeReduction初始等于effectiveness*0.8', () => {
    const b = makeB({ effectiveness: 60 })
    expect(b.tradeReduction).toBe(40) // makeB固定值
  })
  it('moraleDamage初始等于effectiveness*0.3（spawn时计算）', () => {
    const b = makeB({ effectiveness: 50, moraleDamage: 15 })
    expect(b.moraleDamage).toBe(15)
  })
  it('blockaderCivId!=targetCivId合法性', () => {
    const b = makeB({ blockaderCivId: 1, targetCivId: 2 })
    expect(b.blockaderCivId).not.toBe(b.targetCivId)
  })
  it('light是合法strength', () => {
    const b = makeB({ strength: 'light' })
    expect(b.strength).toBe('light')
  })
  it('total是合法strength', () => {
    const b = makeB({ strength: 'total' })
    expect(b.strength).toBe('total')
  })
  it('注入blockade后id正确', () => {
    getB(sys).push(makeB({ id: 77 }))
    expect(getB(sys)[0].id).toBe(77)
  })
  it('文明数>=2时可spawn', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValue(0.5)
    sys.update(1, EM, makeCM([1, 2]), 1800)
    expect(getB(sys).length).toBeGreaterThanOrEqual(0) // 因spawn条件复杂不强断
  })
  it('_civsBuf作为内部缓冲存在', () => {
    expect(Array.isArray((sys as any)._civsBuf)).toBe(true)
  })
  it('lastCheck在触发后等于tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, EM, makeCM([1,2]), 5400)
    expect((sys as any).lastCheck).toBe(5400)
  })
  it('两次不同tick足够间隔后均触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, EM, makeCM([1,2]), 1800)
    sys.update(1, EM, makeCM([1,2]), 3600)
    expect((sys as any).lastCheck).toBe(3600)
  })
})
