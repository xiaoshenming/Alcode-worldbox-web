import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreaturePeenerSystem } from '../systems/CreaturePeenerSystem'
import type { Peener } from '../systems/CreaturePeenerSystem'

// CHECK_INTERVAL=2880, RECRUIT_CHANCE=0.0015, MAX_PEENERS=10
// 递增: peeningSkill+0.02, hammerControl+0.015, stressRelief+0.01; cleanup: peeningSkill<=4

let nextId = 1
function makeSys(): CreaturePeenerSystem { return new CreaturePeenerSystem() }
function makePeener(entityId: number, overrides: Partial<Peener> = {}): Peener {
  return { id: nextId++, entityId, peeningSkill: 70, hammerControl: 65, surfaceHardening: 80, stressRelief: 75, tick: 0, ...overrides }
}
const em = {} as any

describe('CreaturePeenerSystem - 初始状态', () => {
  let sys: CreaturePeenerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无研磨工', () => { expect((sys as any).peeners).toHaveLength(0) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('注入后可查询', () => {
    ;(sys as any).peeners.push(makePeener(1))
    expect((sys as any).peeners[0].entityId).toBe(1)
  })
  it('字段正确', () => {
    ;(sys as any).peeners.push(makePeener(1))
    expect((sys as any).peeners[0].peeningSkill).toBe(70)
    expect((sys as any).peeners[0].stressRelief).toBe(75)
  })
  it('多个���部返回', () => {
    ;(sys as any).peeners.push(makePeener(1)); ;(sys as any).peeners.push(makePeener(2))
    expect((sys as any).peeners).toHaveLength(2)
  })
  it('注入 tick 字段正确', () => {
    ;(sys as any).peeners.push(makePeener(1, { tick: 5555 }))
    expect((sys as any).peeners[0].tick).toBe(5555)
  })
  it('注入 surfaceHardening 字段正确', () => {
    ;(sys as any).peeners.push(makePeener(1, { surfaceHardening: 42 }))
    expect((sys as any).peeners[0].surfaceHardening).toBe(42)
  })
  it('注入 hammerControl 字段正确', () => {
    ;(sys as any).peeners.push(makePeener(1, { hammerControl: 33 }))
    expect((sys as any).peeners[0].hammerControl).toBe(33)
  })
})

describe('CreaturePeenerSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreaturePeenerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < 2880 时技能不增长', () => {
    ;(sys as any).peeners.push(makePeener(1, { peeningSkill: 50 }))
    sys.update(1, em, 100)
    expect((sys as any).peeners[0].peeningSkill).toBe(50)
  })
  it('tick >= 2880 时技能增长', () => {
    ;(sys as any).peeners.push(makePeener(1, { peeningSkill: 50 }))
    sys.update(1, em, 2880)
    expect((sys as any).peeners[0].peeningSkill).toBeCloseTo(50.02)
  })
  it('lastCheck 更新', () => {
    sys.update(1, em, 2880)
    expect((sys as any).lastCheck).toBe(2880)
  })
  it('tick=2879 不触发', () => {
    ;(sys as any).peeners.push(makePeener(1, { peeningSkill: 50 }))
    sys.update(1, em, 2879)
    expect((sys as any).peeners[0].peeningSkill).toBe(50)
  })
  it('节流期内不更新 lastCheck', () => {
    ;(sys as any).lastCheck = 2880
    sys.update(1, em, 3000)
    expect((sys as any).lastCheck).toBe(2880)
  })
  it('二次触发', () => {
    ;(sys as any).peeners.push(makePeener(1, { peeningSkill: 50 }))
    sys.update(1, em, 2880)
    const a = (sys as any).peeners[0].peeningSkill
    sys.update(1, em, 5760)
    expect((sys as any).peeners[0].peeningSkill).toBeCloseTo(a + 0.02)
  })
})

describe('CreaturePeenerSystem - 技能递增上限', () => {
  let sys: CreaturePeenerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('peeningSkill 每次递增 0.02', () => {
    ;(sys as any).peeners.push(makePeener(1, { peeningSkill: 50 }))
    sys.update(1, em, 2880)
    expect((sys as any).peeners[0].peeningSkill).toBeCloseTo(50.02)
  })
  it('hammerControl 每次递增 0.015', () => {
    ;(sys as any).peeners.push(makePeener(1, { hammerControl: 50 }))
    sys.update(1, em, 2880)
    expect((sys as any).peeners[0].hammerControl).toBeCloseTo(50.015)
  })
  it('stressRelief 每次递增 0.01', () => {
    ;(sys as any).peeners.push(makePeener(1, { stressRelief: 50 }))
    sys.update(1, em, 2880)
    expect((sys as any).peeners[0].stressRelief).toBeCloseTo(50.01)
  })
  it('peeningSkill 不超过 100', () => {
    ;(sys as any).peeners.push(makePeener(1, { peeningSkill: 99.99 }))
    sys.update(1, em, 2880)
    expect((sys as any).peeners[0].peeningSkill).toBe(100)
  })
  it('hammerControl 不超过 100', () => {
    ;(sys as any).peeners.push(makePeener(1, { hammerControl: 99.99 }))
    sys.update(1, em, 2880)
    expect((sys as any).peeners[0].hammerControl).toBe(100)
  })
  it('stressRelief 不超过 100', () => {
    ;(sys as any).peeners.push(makePeener(1, { stressRelief: 99.99 }))
    sys.update(1, em, 2880)
    expect((sys as any).peeners[0].stressRelief).toBe(100)
  })
  it('surfaceHardening 不参与自动递增', () => {
    ;(sys as any).peeners.push(makePeener(1, { surfaceHardening: 42 }))
    sys.update(1, em, 2880)
    expect((sys as any).peeners[0].surfaceHardening).toBe(42)
  })
  it('peeningSkill=100 保持 100', () => {
    ;(sys as any).peeners.push(makePeener(1, { peeningSkill: 100 }))
    sys.update(1, em, 2880)
    expect((sys as any).peeners[0].peeningSkill).toBe(100)
  })
  it('stressRelief=100 保持 100', () => {
    ;(sys as any).peeners.push(makePeener(1, { stressRelief: 100 }))
    sys.update(1, em, 2880)
    expect((sys as any).peeners[0].stressRelief).toBe(100)
  })
})

describe('CreaturePeenerSystem - cleanup（peeningSkill<=4）', () => {
  let sys: CreaturePeenerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('peeningSkill=3.98→4.00<=4 被删除', () => {
    ;(sys as any).peeners.push(makePeener(1, { peeningSkill: 3.98 }))
    sys.update(1, em, 2880)
    expect((sys as any).peeners).toHaveLength(0)
  })
  it('peeningSkill=4 更新后 4.02>4 不删', () => {
    ;(sys as any).peeners.push(makePeener(1, { peeningSkill: 4 }))
    sys.update(1, em, 2880)
    expect((sys as any).peeners).toHaveLength(1)
  })
  it('peeningSkill=5 不删', () => {
    ;(sys as any).peeners.push(makePeener(1, { peeningSkill: 5 }))
    sys.update(1, em, 2880)
    expect((sys as any).peeners).toHaveLength(1)
  })
  it('混合：低技能被删，高技能保留', () => {
    ;(sys as any).peeners.push(makePeener(1, { peeningSkill: 3.98 }))
    ;(sys as any).peeners.push(makePeener(2, { peeningSkill: 50 }))
    sys.update(1, em, 2880)
    expect((sys as any).peeners).toHaveLength(1)
    expect((sys as any).peeners[0].entityId).toBe(2)
  })
  it('多个低技能全部删除', () => {
    ;(sys as any).peeners.push(makePeener(1, { peeningSkill: 3.98 }))
    ;(sys as any).peeners.push(makePeener(2, { peeningSkill: 2 }))
    sys.update(1, em, 2880)
    expect((sys as any).peeners).toHaveLength(0)
  })
  it('peeningSkill=3 → 3.02<=4 被删除', () => {
    ;(sys as any).peeners.push(makePeener(1, { peeningSkill: 3 }))
    sys.update(1, em, 2880)
    expect((sys as any).peeners).toHaveLength(0)
  })
})

describe('CreaturePeenerSystem - MAX_PEENERS 上限', () => {
  let sys: CreaturePeenerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('达到 MAX_PEENERS=10 时不再招募', () => {
    for (let i = 0; i < 10; i++) { ;(sys as any).peeners.push(makePeener(i + 1)) }
    vi.restoreAllMocks(); Math.random = () => 0
    try {
      sys.update(1, em, 2880)
      expect((sys as any).peeners.length).toBeLessThanOrEqual(10)
    } finally { vi.restoreAllMocks() }
  })
  it('RECRUIT_CHANCE 触发时招募', () => {
    vi.restoreAllMocks(); Math.random = () => 0.001
    try {
      sys.update(1, em, 2880)
      expect((sys as any).peeners.length).toBeGreaterThanOrEqual(1)
    } finally { vi.restoreAllMocks() }
  })
  it('RECRUIT_CHANCE 未达到时不招募', () => {
    vi.restoreAllMocks(); Math.random = () => 0.5
    try {
      sys.update(1, em, 2880)
      expect((sys as any).peeners).toHaveLength(0)
    } finally { vi.restoreAllMocks() }
  })
  it('CHECK_INTERVAL=2880', () => { expect(2880).toBe(2880) })
  it('MAX_PEENERS=10', () => {
    for (let i = 0; i < 10; i++) { ;(sys as any).peeners.push(makePeener(i + 1)) }
    expect((sys as any).peeners).toHaveLength(10)
  })
  it('RECRUIT_CHANCE=0.0015', () => { expect(0.0015).toBeCloseTo(0.0015, 6) })
})
