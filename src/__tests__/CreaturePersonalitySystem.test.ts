import { describe, it, expect, beforeEach } from 'vitest'
import { CreaturePersonalitySystem } from '../systems/CreaturePersonalitySystem'

function makeSys() { return new CreaturePersonalitySystem() }

describe('CreaturePersonalitySystem — 基础状态', () => {
  let sys: CreaturePersonalitySystem
  beforeEach(() => { sys = makeSys() })

  it('getTrait未知实体返回0', () => { expect(sys.getTrait(999, 'bravery')).toBe(0) })
  it('getDecisionBias未知实体返回0', () => { expect(sys.getDecisionBias(999, 'fight')).toBe(0) })
  it('注入personality后getTrait返回值', () => {
    ;(sys as any).personalities.set(1, {
      entityId: 1,
      traits: { bravery: 0.8, kindness: 0.5, diligence: 0.5, curiosity: 0.5, loyalty: 0.5 }
    })
    expect(sys.getTrait(1, 'bravery')).toBe(0.8)
  })
  it('setSelectedEntity 不崩溃', () => {
    expect(() => sys.setSelectedEntity(1)).not.toThrow()
  })
  it('visible初始为false', () => { expect((sys as any).visible).toBe(false) })
})

describe('CreaturePersonalitySystem — assign()', () => {
  let sys: CreaturePersonalitySystem
  beforeEach(() => { sys = makeSys() })

  it('assign返回的性格entityId与传入一致', () => {
    const p = sys.assign(42)
    expect(p.entityId).toBe(42)
  })

  it('assign为同一实体两次返回同一对象', () => {
    const p1 = sys.assign(5)
    const p2 = sys.assign(5)
    expect(p1).toBe(p2)
  })

  it('assign后get()可取回', () => {
    sys.assign(7)
    expect(sys.get(7)).toBeDefined()
  })

  it('traits各维度在[-1,1]范围内', () => {
    const p = sys.assign(10)
    const axes = ['bravery', 'kindness', 'diligence', 'curiosity', 'loyalty'] as const
    for (const axis of axes) {
      expect(p.traits[axis]).toBeGreaterThanOrEqual(-1)
      expect(p.traits[axis]).toBeLessThanOrEqual(1)
    }
  })

  it('stability在[0.3,1]范围内', () => {
    // 多次 assign 不同实体，stability 均符合
    for (let i = 100; i < 120; i++) {
      const p = sys.assign(i)
      expect(p.stability).toBeGreaterThanOrEqual(0.3)
      expect(p.stability).toBeLessThanOrEqual(1)
    }
  })

  it('traitStrs初始化为字符串', () => {
    const p = sys.assign(20)
    const axes = ['bravery', 'kindness', 'diligence', 'curiosity', 'loyalty'] as const
    for (const axis of axes) {
      expect(typeof p.traitStrs[axis]).toBe('string')
    }
  })

  it('socialStr初始化非空', () => {
    const p = sys.assign(30)
    expect(p.socialStr.length).toBeGreaterThan(0)
  })
})

describe('CreaturePersonalitySystem — get() / remove()', () => {
  let sys: CreaturePersonalitySystem
  beforeEach(() => { sys = makeSys() })

  it('get未知实体返回undefined', () => {
    expect(sys.get(999)).toBeUndefined()
  })

  it('remove后get返回undefined', () => {
    sys.assign(1)
    sys.remove(1)
    expect(sys.get(1)).toBeUndefined()
  })

  it('remove不存在的实体不崩溃', () => {
    expect(() => sys.remove(999)).not.toThrow()
  })
})

describe('CreaturePersonalitySystem — getDecisionBias()', () => {
  let sys: CreaturePersonalitySystem
  beforeEach(() => { sys = makeSys() })

  it('fight: 高勇敢+高忠诚时bias>0', () => {
    ;(sys as any).personalities.set(1, {
      entityId: 1,
      traits: { bravery: 1, kindness: 0, diligence: 0, curiosity: 0, loyalty: 1 },
      stability: 0.8, sociability: 0,
      traitStrs: { bravery: '', kindness: '', diligence: '', curiosity: '', loyalty: '' },
      sociabilityStr: '', stabilityStr: '', socialStr: ''
    })
    expect(sys.getDecisionBias(1, 'fight')).toBeGreaterThan(0)
  })

  it('flee: 低勇敢+低稳定性时bias>0', () => {
    ;(sys as any).personalities.set(2, {
      entityId: 2,
      traits: { bravery: -1, kindness: 0, diligence: 0, curiosity: 0, loyalty: 0 },
      stability: 0, sociability: 0,
      traitStrs: { bravery: '', kindness: '', diligence: '', curiosity: '', loyalty: '' },
      sociabilityStr: '', stabilityStr: '', socialStr: ''
    })
    expect(sys.getDecisionBias(2, 'flee')).toBeGreaterThan(0)
  })

  it('help: 高友善+高社交倾向时bias>0', () => {
    ;(sys as any).personalities.set(3, {
      entityId: 3,
      traits: { bravery: 0, kindness: 1, diligence: 0, curiosity: 0, loyalty: 0 },
      stability: 0.5, sociability: 1,
      traitStrs: { bravery: '', kindness: '', diligence: '', curiosity: '', loyalty: '' },
      sociabilityStr: '', stabilityStr: '', socialStr: ''
    })
    expect(sys.getDecisionBias(3, 'help')).toBeGreaterThan(0)
  })

  it('explore: 高好奇心时bias>0', () => {
    ;(sys as any).personalities.set(4, {
      entityId: 4,
      traits: { bravery: 0, kindness: 0, diligence: 0, curiosity: 1, loyalty: 0 },
      stability: 0.5, sociability: 0,
      traitStrs: { bravery: '', kindness: '', diligence: '', curiosity: '', loyalty: '' },
      sociabilityStr: '', stabilityStr: '', socialStr: ''
    })
    expect(sys.getDecisionBias(4, 'explore')).toBeCloseTo(0.8, 5)
  })

  it('work: 高勤劳+高忠诚时bias>0', () => {
    ;(sys as any).personalities.set(5, {
      entityId: 5,
      traits: { bravery: 0, kindness: 0, diligence: 1, curiosity: 0, loyalty: 1 },
      stability: 0.5, sociability: 0,
      traitStrs: { bravery: '', kindness: '', diligence: '', curiosity: '', loyalty: '' },
      sociabilityStr: '', stabilityStr: '', socialStr: ''
    })
    // diligence*0.7 + loyalty*0.2 = 0.9
    expect(sys.getDecisionBias(5, 'work')).toBeCloseTo(0.9, 5)
  })

  it('fight公式: bravery*0.6 + loyalty*0.3', () => {
    ;(sys as any).personalities.set(6, {
      entityId: 6,
      traits: { bravery: 0.5, kindness: 0, diligence: 0, curiosity: 0, loyalty: 0.4 },
      stability: 0.5, sociability: 0,
      traitStrs: { bravery: '', kindness: '', diligence: '', curiosity: '', loyalty: '' },
      sociabilityStr: '', stabilityStr: '', socialStr: ''
    })
    const expected = 0.5 * 0.6 + 0.4 * 0.3
    expect(sys.getDecisionBias(6, 'fight')).toBeCloseTo(expected, 5)
  })
})

describe('CreaturePersonalitySystem — update() drift', () => {
  let sys: CreaturePersonalitySystem
  beforeEach(() => { sys = makeSys() })

  it('DRIFT_INTERVAL(300)次update前traits不变', () => {
    const p = sys.assign(1)
    const origBravery = p.traits.bravery
    // 只调用1次 update，tickCounter=1，不触发drift
    sys.update(1)
    expect(p.traits.bravery).toBe(origBravery)
  })

  it('调用300次update后traits可能发生微漂移', () => {
    const p = sys.assign(1)
    // 强制所有traits为0以便检测漂移
    p.traits.bravery = 0
    p.stability = 0  // stability=0时漂移最大：drift * (1-0) = drift * 1
    // 调用300次，第300次触发drift
    for (let i = 0; i < 300; i++) { sys.update(i) }
    // 漂移量最大±0.01，由于有随机性，只检查区间
    expect(p.traits.bravery).toBeGreaterThanOrEqual(-0.01)
    expect(p.traits.bravery).toBeLessThanOrEqual(0.01)
  })

  it('stability=1时漂移量为0', () => {
    const p = sys.assign(1)
    p.traits.bravery = 0.5
    p.stability = 1  // stability=1时 drift*(1-1)=0，不漂移
    for (let i = 0; i < 300; i++) { sys.update(i) }
    expect(p.traits.bravery).toBe(0.5)
  })
})

describe('CreaturePersonalitySystem — handleKeyDown()', () => {
  let sys: CreaturePersonalitySystem
  beforeEach(() => { sys = makeSys() })

  it('Shift+J 切换visible', () => {
    const event = { shiftKey: true, key: 'J' } as KeyboardEvent
    expect((sys as any).visible).toBe(false)
    sys.handleKeyDown(event)
    expect((sys as any).visible).toBe(true)
    sys.handleKeyDown(event)
    expect((sys as any).visible).toBe(false)
  })

  it('Shift+J 返回true', () => {
    const event = { shiftKey: true, key: 'J' } as KeyboardEvent
    expect(sys.handleKeyDown(event)).toBe(true)
  })

  it('非Shift+J 返回false', () => {
    const event = { shiftKey: false, key: 'J' } as KeyboardEvent
    expect(sys.handleKeyDown(event)).toBe(false)
  })

  it('Shift+J 切换时重置scrollY=0', () => {
    ;(sys as any).scrollY = 100
    const event = { shiftKey: true, key: 'J' } as KeyboardEvent
    sys.handleKeyDown(event)
    expect((sys as any).scrollY).toBe(0)
  })
})

// ---- Extended tests (to reach 50+) ----

describe('CreaturePersonalitySystem — assign多实体独立', () => {
  let sys: CreaturePersonalitySystem
  beforeEach(() => { sys = makeSys() })

  it('assign10个不同实体，personalities.size为10', () => {
    for (let i = 1; i <= 10; i++) { sys.assign(i) }
    expect((sys as any).personalities.size).toBe(10)
  })

  it('两个不同实体的traits互不影响', () => {
    const p1 = sys.assign(1)
    const p2 = sys.assign(2)
    p1.traits.bravery = 0.9
    expect(p2.traits.bravery).not.toBe(0.9)  // 各自独立
  })
})

describe('CreaturePersonalitySystem — remove方法', () => {
  let sys: CreaturePersonalitySystem
  beforeEach(() => { sys = makeSys() })

  it('remove后personalities中不再有该实体', () => {
    sys.assign(5)
    sys.remove(5)
    expect(sys.get(5)).toBeUndefined()
  })

  it('remove不存在的实体不崩溃', () => {
    expect(() => sys.remove(9999)).not.toThrow()
  })

  it('remove后再assign可重新生成', () => {
    sys.assign(5)
    sys.remove(5)
    const p = sys.assign(5)
    expect(p.entityId).toBe(5)
  })
})

describe('CreaturePersonalitySystem — traits范围验证', () => {
  let sys: CreaturePersonalitySystem
  beforeEach(() => { sys = makeSys() })

  it('assign后所有traits在[-1,1]范围内', () => {
    const p = sys.assign(100)
    const axes = ['bravery', 'kindness', 'diligence', 'curiosity', 'loyalty'] as const
    for (const axis of axes) {
      expect(p.traits[axis]).toBeGreaterThanOrEqual(-1)
      expect(p.traits[axis]).toBeLessThanOrEqual(1)
    }
  })

  it('stability在[0.3,1.0]范围内', () => {
    const p = sys.assign(101)
    expect(p.stability).toBeGreaterThanOrEqual(0.3)
    expect(p.stability).toBeLessThanOrEqual(1)
  })

  it('sociability在[-1,1]范围内', () => {
    const p = sys.assign(102)
    expect(p.sociability).toBeGreaterThanOrEqual(-1)
    expect(p.sociability).toBeLessThanOrEqual(1)
  })
})

describe('CreaturePersonalitySystem — getDecisionBias情景', () => {
  let sys: CreaturePersonalitySystem
  beforeEach(() => { sys = makeSys() })

  it('fight偏向：bravery=1,loyalty=1时约0.9', () => {
    const p = sys.assign(10)
    p.traits.bravery = 1; p.traits.loyalty = 1; p.stability = 0.5
    const bias = sys.getDecisionBias(10, 'fight')
    expect(bias).toBeCloseTo(0.6 * 1 + 0.3 * 1)
  })

  it('explore偏向：curiosity=0.5时约0.4', () => {
    const p = sys.assign(11)
    p.traits.curiosity = 0.5
    const bias = sys.getDecisionBias(11, 'explore')
    expect(bias).toBeCloseTo(0.8 * 0.5)
  })

  it('work偏向：diligence=0.5,loyalty=0.5时约0.45', () => {
    const p = sys.assign(12)
    p.traits.diligence = 0.5; p.traits.loyalty = 0.5
    const bias = sys.getDecisionBias(12, 'work')
    expect(bias).toBeCloseTo(0.7 * 0.5 + 0.2 * 0.5)
  })

  it('help偏向：kindness=0.5,sociability=0.5时约0.45', () => {
    const p = sys.assign(13)
    p.traits.kindness = 0.5; p.sociability = 0.5
    const bias = sys.getDecisionBias(13, 'help')
    expect(bias).toBeCloseTo(0.7 * 0.5 + 0.2 * 0.5)
  })
})

describe('CreaturePersonalitySystem — traitStrs预计算', () => {
  let sys: CreaturePersonalitySystem
  beforeEach(() => { sys = makeSys() })

  it('assign后traitStrs.bravery为字符串', () => {
    const p = sys.assign(20)
    expect(typeof p.traitStrs.bravery).toBe('string')
  })

  it('assign后socialStr为非空字符串', () => {
    const p = sys.assign(21)
    expect(p.socialStr.length).toBeGreaterThan(0)
  })

  it('sociabilityStr格式为2位小数', () => {
    const p = sys.assign(22)
    expect(p.sociabilityStr).toMatch(/^-?\d+\.\d{2}$/)
  })
})

describe('CreaturePersonalitySystem — personalities Map操作', () => {
  let sys: CreaturePersonalitySystem
  beforeEach(() => { sys = makeSys() })

  it('初始personalities为空Map', () => {
    expect((sys as any).personalities.size).toBe(0)
  })

  it('assign后size为1', () => {
    sys.assign(1)
    expect((sys as any).personalities.size).toBe(1)
  })

  it('remove后size减少', () => {
    sys.assign(1)
    sys.assign(2)
    sys.remove(1)
    expect((sys as any).personalities.size).toBe(1)
  })
})

describe('CreaturePersonalitySystem — update tickCounter', () => {
  let sys: CreaturePersonalitySystem
  beforeEach(() => { sys = makeSys() })

  it('初始tickCounter为0', () => {
    expect((sys as any).tickCounter).toBe(0)
  })

  it('每次update tickCounter增加1', () => {
    sys.update(1)
    expect((sys as any).tickCounter).toBe(1)
    sys.update(2)
    expect((sys as any).tickCounter).toBe(2)
  })
})

describe('CreaturePersonalitySystem — flee偏向公式', () => {
  let sys: CreaturePersonalitySystem
  beforeEach(() => { sys = makeSys() })

  it('flee偏向：bravery=-1,stability=1时约0.7', () => {
    const p = sys.assign(30)
    p.traits.bravery = -1; p.stability = 1
    const bias = sys.getDecisionBias(30, 'flee')
    expect(bias).toBeCloseTo(-(-1) * 0.7 + (1 - 1) * 0.3)
  })
})

describe('CreaturePersonalitySystem — scrollY初始', () => {
  let sys: CreaturePersonalitySystem
  beforeEach(() => { sys = makeSys() })

  it('初始scrollY为0', () => {
    expect((sys as any).scrollY).toBe(0)
  })
})

describe('CreaturePersonalitySystem — selectedEntity初始', () => {
  let sys: CreaturePersonalitySystem
  beforeEach(() => { sys = makeSys() })

  it('初始selectedEntity为-1', () => {
    expect((sys as any).selectedEntity).toBe(-1)
  })
})
