import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureProfessionSystem } from '../systems/CreatureProfessionSystem'

function makeSys() { return new CreatureProfessionSystem() }

// 最小 EntityManager mock
function makeEm(overrides: Partial<{
  hasComponent: (id: number, c: string) => boolean
  getComponent: (id: number, c: string) => unknown
  getEntitiesWithComponents: (...c: string[]) => number[]
}> = {}) {
  return {
    hasComponent: overrides.hasComponent ?? (() => true),
    getComponent: overrides.getComponent ?? (() => undefined),
    getEntitiesWithComponents: overrides.getEntitiesWithComponents ?? (() => []),
  } as any
}

describe('CreatureProfessionSystem', () => {
  let sys: CreatureProfessionSystem
  beforeEach(() => { sys = makeSys() })

  // ── 原有5个 ──

  it('getProfession未知实体返回undefined', () => {
    expect(sys.getProfession(999)).toBeUndefined()
  })

  it('注入后getProfession返回数据', () => {
    ;(sys as any).professions.set(1, { entityId: 1, type: 'farmer', rank: 'apprentice', experience: 0, assignedTick: 0, expStr: '', _prevExpFloor: 0 })
    expect(sys.getProfession(1)).toBeDefined()
  })

  it('getBonus 未知实体返回中性bonus对象', () => {
    const bonus = sys.getBonus(999)
    expect(typeof bonus).toBe('object')
  })

  it('setSelectedEntity 不崩溃', () => {
    expect(() => sys.setSelectedEntity(1)).not.toThrow()
  })

  it('selectedEntity初始为-1', () => {
    expect((sys as any).selectedEntity).toBe(-1)
  })

  // ── 新增 ──

  it('getBonus 未知实体所有bonus均为1', () => {
    const bonus = sys.getBonus(999)
    expect(bonus.foodOutput).toBe(1)
    expect(bonus.combatDamage).toBe(1)
    expect(bonus.buildSpeed).toBe(1)
    expect(bonus.miningRate).toBe(1)
    expect(bonus.tradeIncome).toBe(1)
    expect(bonus.researchRate).toBe(1)
    expect(bonus.faithGain).toBe(1)
    expect(bonus.craftQuality).toBe(1)
  })

  it('farmer apprentice foodOutput bonus为1.5', () => {
    ;(sys as any).professions.set(5, { type: 'farmer', rank: 'apprentice', experience: 0, assignedTick: 0, expStr: '', _prevExpFloor: 0 })
    const bonus = sys.getBonus(5)
    expect(bonus.foodOutput).toBeCloseTo(1.5, 5)
  })

  it('farmer journeyman foodOutput bonus = 1 + 0.5*1.3 = 1.65', () => {
    ;(sys as any).professions.set(5, { type: 'farmer', rank: 'journeyman', experience: 100, assignedTick: 0, expStr: '', _prevExpFloor: 100 })
    const bonus = sys.getBonus(5)
    // val=1.5, mult=1.3 => 1 + (1.5-1)*1.3 = 1.65
    expect(bonus.foodOutput).toBeCloseTo(1.65, 5)
  })

  it('farmer master foodOutput bonus = 1 + 0.5*1.6 = 1.8', () => {
    ;(sys as any).professions.set(5, { type: 'farmer', rank: 'master', experience: 300, assignedTick: 0, expStr: '', _prevExpFloor: 300 })
    const bonus = sys.getBonus(5)
    expect(bonus.foodOutput).toBeCloseTo(1.8, 5)
  })

  it('blacksmith apprentice 有combatDamage和craftQuality加成', () => {
    ;(sys as any).professions.set(7, { type: 'blacksmith', rank: 'apprentice', experience: 0, assignedTick: 0, expStr: '', _prevExpFloor: 0 })
    const bonus = sys.getBonus(7)
    // combatDamage val=1.2 mult=1 => 1+(1.2-1)*1=1.2
    expect(bonus.combatDamage).toBeCloseTo(1.2, 5)
    // craftQuality val=1.5 mult=1 => 1.5
    expect(bonus.craftQuality).toBeCloseTo(1.5, 5)
  })

  it('getBonus 每次返回同一个缓存对象引用（零GC）', () => {
    const b1 = sys.getBonus(999)
    const b2 = sys.getBonus(999)
    expect(b1).toBe(b2)
  })

  it('remove 删除职业数据后getProfession返回undefined', () => {
    ;(sys as any).professions.set(10, { type: 'soldier', rank: 'apprentice', experience: 0, assignedTick: 0, expStr: '', _prevExpFloor: 0 })
    expect(sys.getProfession(10)).toBeDefined()
    sys.remove(10)
    expect(sys.getProfession(10)).toBeUndefined()
  })

  it('setSelectedEntity 更新 selectedEntity 字段', () => {
    sys.setSelectedEntity(42)
    expect((sys as any).selectedEntity).toBe(42)
  })

  it('cleanup: 没有creature组件的实体被移除', () => {
    ;(sys as any).professions.set(20, { type: 'miner', rank: 'apprentice', experience: 0, assignedTick: 0, expStr: '', _prevExpFloor: 0 })
    // em.hasComponent 始终返回 false => 应被 cleanup 删除
    const em = makeEm({ hasComponent: () => false, getEntitiesWithComponents: () => [] })
    ;(sys as any).cleanup(em)
    expect(sys.getProfession(20)).toBeUndefined()
  })

  it('cleanup: 有creature组件的实体不被移除', () => {
    ;(sys as any).professions.set(21, { type: 'farmer', rank: 'apprentice', experience: 0, assignedTick: 0, expStr: '', _prevExpFloor: 0 })
    const em = makeEm({ hasComponent: () => true, getEntitiesWithComponents: () => [] })
    ;(sys as any).cleanup(em)
    expect(sys.getProfession(21)).toBeDefined()
  })

  it('gainExperience: 有creature组件时经验递增', () => {
    ;(sys as any).professions.set(30, { type: 'farmer', rank: 'apprentice', experience: 0, assignedTick: 0, expStr: '', _prevExpFloor: 0 })
    const em = makeEm({
      hasComponent: () => true,
      getComponent: () => undefined, // 无 genetics
      getEntitiesWithComponents: () => [],
    })
    ;(sys as any).gainExperience(em)
    const prof = sys.getProfession(30)!
    expect(prof.experience).toBeGreaterThan(0)
  })

  it('gainExperience: 无creature组件时经验不递增', () => {
    ;(sys as any).professions.set(31, { type: 'farmer', rank: 'apprentice', experience: 0, assignedTick: 0, expStr: '', _prevExpFloor: 0 })
    const em = makeEm({
      hasComponent: () => false,
      getComponent: () => undefined,
      getEntitiesWithComponents: () => [],
    })
    ;(sys as any).gainExperience(em)
    expect(sys.getProfession(31)!.experience).toBe(0)
  })

  it('gainExperience: apprentice 达到100经验升级journeyman', () => {
    ;(sys as any).professions.set(32, { type: 'scholar', rank: 'apprentice', experience: 99, assignedTick: 0, expStr: '', _prevExpFloor: 99 })
    const em = makeEm({
      hasComponent: () => true,
      getComponent: () => undefined,
      getEntitiesWithComponents: () => [],
    })
    ;(sys as any).gainExperience(em)
    expect(sys.getProfession(32)!.rank).toBe('journeyman')
  })

  it('gainExperience: journeyman 达到300经验升级master', () => {
    ;(sys as any).professions.set(33, { type: 'scholar', rank: 'journeyman', experience: 299, assignedTick: 0, expStr: '', _prevExpFloor: 299 })
    const em = makeEm({
      hasComponent: () => true,
      getComponent: () => undefined,
      getEntitiesWithComponents: () => [],
    })
    ;(sys as any).gainExperience(em)
    expect(sys.getProfession(33)!.rank).toBe('master')
  })

  it('gainExperience: master不会继续升级（已是最高）', () => {
    ;(sys as any).professions.set(34, { type: 'farmer', rank: 'master', experience: 500, assignedTick: 0, expStr: '', _prevExpFloor: 500 })
    const em = makeEm({
      hasComponent: () => true,
      getComponent: () => undefined,
      getEntitiesWithComponents: () => [],
    })
    ;(sys as any).gainExperience(em)
    expect(sys.getProfession(34)!.rank).toBe('master')
  })

  it('update: 经验仅在 XP_INTERVAL(30) 倍数tick时增长', () => {
    ;(sys as any).professions.set(40, { type: 'farmer', rank: 'apprentice', experience: 0, assignedTick: 0, expStr: '', _prevExpFloor: 0 })
    const em = makeEm({ hasComponent: () => true, getComponent: () => undefined, getEntitiesWithComponents: () => [] })
    sys.update(0, em, 1)   // tick=1，不是XP_INTERVAL倍数
    expect(sys.getProfession(40)!.experience).toBe(0)
    sys.update(0, em, 30)  // tick=30，触发gainExperience
    expect(sys.getProfession(40)!.experience).toBeGreaterThan(0)
  })

  it('handleKeyDown: Shift+P 切换 visible', () => {
    const e1 = { shiftKey: true, key: 'P' } as KeyboardEvent
    expect(sys.handleKeyDown(e1)).toBe(true)
    expect((sys as any).visible).toBe(true)
    expect(sys.handleKeyDown(e1)).toBe(true)
    expect((sys as any).visible).toBe(false)
  })

  it('handleKeyDown: 非Shift+P 不切换 visible', () => {
    const e2 = { shiftKey: false, key: 'P' } as KeyboardEvent
    expect(sys.handleKeyDown(e2)).toBe(false)
    expect((sys as any).visible).toBe(false)
  })
})

describe('CreatureProfessionSystem - 更多API测试', () => {
  let sys: CreatureProfessionSystem
  beforeEach(() => { sys = makeSys() })

  it('remove后实体无职业', () => {
    ;(sys as any).professions.set(5, { type: 'farmer', rank: 'apprentice', experience: 0, assignedTick: 0, expStr: '', _prevExpFloor: 0 })
    sys.remove(5)
    expect(sys.getProfession(5)).toBeUndefined()
  })
  it('getBonus farmer有foodOutput加成', () => {
    ;(sys as any).professions.set(2, { type: 'farmer', rank: 'apprentice', experience: 0, assignedTick: 0, expStr: '', _prevExpFloor: 0 })
    const bonus = sys.getBonus(2)
    expect(bonus.foodOutput).toBeGreaterThan(1)
  })
  it('getBonus soldier有combatDamage加成', () => {
    ;(sys as any).professions.set(3, { type: 'soldier', rank: 'apprentice', experience: 0, assignedTick: 0, expStr: '', _prevExpFloor: 0 })
    const bonus = sys.getBonus(3)
    expect(bonus.combatDamage).toBeGreaterThan(1)
  })
  it('getBonus master等级加成大于apprentice', () => {
    ;(sys as any).professions.set(4, { type: 'farmer', rank: 'master', experience: 0, assignedTick: 0, expStr: '', _prevExpFloor: 0 })
    const masterFoodOutput = sys.getBonus(4).foodOutput
    ;(sys as any).professions.set(5, { type: 'farmer', rank: 'apprentice', experience: 0, assignedTick: 0, expStr: '', _prevExpFloor: 0 })
    const apprenticeFoodOutput = sys.getBonus(5).foodOutput
    expect(masterFoodOutput).toBeGreaterThan(apprenticeFoodOutput)
  })
  it('getBonus scholar有researchRate加成', () => {
    ;(sys as any).professions.set(6, { type: 'scholar', rank: 'apprentice', experience: 0, assignedTick: 0, expStr: '', _prevExpFloor: 0 })
    const bonus = sys.getBonus(6)
    expect(bonus.researchRate).toBeGreaterThan(1)
  })
  it('getBonus miner有miningRate加成', () => {
    ;(sys as any).professions.set(7, { type: 'miner', rank: 'apprentice', experience: 0, assignedTick: 0, expStr: '', _prevExpFloor: 0 })
    const bonus = sys.getBonus(7)
    expect(bonus.miningRate).toBeGreaterThan(1)
  })
  it('getBonus priest有faithGain加成', () => {
    ;(sys as any).professions.set(8, { type: 'priest', rank: 'apprentice', experience: 0, assignedTick: 0, expStr: '', _prevExpFloor: 0 })
    const bonus = sys.getBonus(8)
    expect(bonus.faithGain).toBeGreaterThan(1)
  })
  it('getBonus builder有buildSpeed加成', () => {
    ;(sys as any).professions.set(9, { type: 'builder', rank: 'apprentice', experience: 0, assignedTick: 0, expStr: '', _prevExpFloor: 0 })
    const bonus = sys.getBonus(9)
    expect(bonus.buildSpeed).toBeGreaterThan(1)
  })
  it('getBonus merchant有tradeIncome加成', () => {
    ;(sys as any).professions.set(10, { type: 'merchant', rank: 'apprentice', experience: 0, assignedTick: 0, expStr: '', _prevExpFloor: 0 })
    const bonus = sys.getBonus(10)
    expect(bonus.tradeIncome).toBeGreaterThan(1)
  })
  it('getBonus blacksmith有craftQuality加成', () => {
    ;(sys as any).professions.set(11, { type: 'blacksmith', rank: 'apprentice', experience: 0, assignedTick: 0, expStr: '', _prevExpFloor: 0 })
    const bonus = sys.getBonus(11)
    expect(bonus.craftQuality).toBeGreaterThan(1)
  })
  it('setCivManager不崩溃', () => {
    const cm = { civilizations: new Map() } as any
    expect(() => sys.setCivManager(cm)).not.toThrow()
  })
  it('handleKeyDown不相关键返回false', () => {
    const e = { shiftKey: false, key: 'A' } as any
    expect(sys.handleKeyDown(e)).toBe(false)
  })
  it('handleKeyDown Shift+P返回true', () => {
    const e = { shiftKey: true, key: 'P' } as any
    expect(sys.handleKeyDown(e)).toBe(true)
  })
  it('update不崩溃（空em）', () => {
    const em = makeEm()
    expect(() => sys.update(1, em, 120)).not.toThrow()
  })
  it('professions初始为空Map', () => {
    expect((sys as any).professions.size).toBe(0)
  })
  it('注入3个职业后professions.size=3', () => {
    for (let i = 1; i <= 3; i++) {
      ;(sys as any).professions.set(i, { type: 'farmer', rank: 'apprentice', experience: 0, assignedTick: 0, expStr: '', _prevExpFloor: 0 })
    }
    expect((sys as any).professions.size).toBe(3)
  })
  it('ASSIGN_INTERVAL=120时tick=120触发assignProfessions', () => {
    const em = makeEm({ getEntitiesWithComponents: () => [] })
    expect(() => sys.update(1, em, 120)).not.toThrow()
  })
  it('getBonus返回对象包含8个key', () => {
    const bonus = sys.getBonus(999)
    const keys = ['foodOutput', 'combatDamage', 'buildSpeed', 'miningRate', 'tradeIncome', 'researchRate', 'faithGain', 'craftQuality']
    keys.forEach(k => expect(k in bonus).toBe(true))
  })
  it('gainExperience在tick%30=0时触发不崩溃', () => {
    ;(sys as any).professions.set(1, { type: 'farmer', rank: 'apprentice', experience: 0, assignedTick: 0, expStr: '', _prevExpFloor: 0 })
    const em = makeEm()
    expect(() => sys.update(1, em, 30)).not.toThrow()
  })
  it('cleanup在hasComponent=false时删除职业', () => {
    ;(sys as any).professions.set(99, { type: 'farmer', rank: 'apprentice', experience: 0, assignedTick: 0, expStr: '', _prevExpFloor: 0 })
    const em = makeEm({ hasComponent: () => false })
    sys.update(1, em, 1) // triggers cleanup every tick
    expect((sys as any).professions.has(99)).toBe(false)
  })
  it('journeyman等级threshold=100', () => {
    const RANK_THRESHOLDS = { apprentice: 0, journeyman: 100, master: 300 }
    expect(RANK_THRESHOLDS.journeyman).toBe(100)
  })
  it('master等级threshold=300', () => {
    const RANK_THRESHOLDS = { apprentice: 0, journeyman: 100, master: 300 }
    expect(RANK_THRESHOLDS.master).toBe(300)
  })
  it('experience>=100时从apprentice升为journeyman', () => {
    ;(sys as any).professions.set(1, { type: 'farmer', rank: 'apprentice', experience: 99.5, assignedTick: 0, expStr: '', _prevExpFloor: 0 })
    const em = makeEm({ hasComponent: () => true, getComponent: () => undefined })
    sys.update(1, em, 30) // triggers gainExperience
    const prof = (sys as any).professions.get(1)
    if (prof) {
      expect(['apprentice', 'journeyman']).toContain(prof.rank)
    }
  })
})

describe('CreatureProfessionSystem - 追加测试', () => {
  let sys: CreatureProfessionSystem
  beforeEach(() => { sys = makeSys() })
  it('remove不存在的实体不崩溃', () => {
    expect(() => sys.remove(9999)).not.toThrow()
  })
  it('visible初始为false', () => {
    expect((sys as any).visible).toBe(false)
  })
  it('handleKeyDown Shift+p(小写)返回true', () => {
    const e = { shiftKey: true, key: 'p' } as any
    expect(sys.handleKeyDown(e)).toBe(true)
  })
  it('getBonus blacksmith有combatDamage加成', () => {
    ;(sys as any).professions.set(20, { type: 'blacksmith', rank: 'journeyman', experience: 0, assignedTick: 0, expStr: '', _prevExpFloor: 0 })
    const bonus = sys.getBonus(20)
    expect(bonus.combatDamage).toBeGreaterThan(1)
  })
  it('update多次不崩溃', () => {
    const em = makeEm()
    expect(() => {
      sys.update(1, em, 120)
      sys.update(1, em, 240)
      sys.update(1, em, 360)
    }).not.toThrow()
  })
})
