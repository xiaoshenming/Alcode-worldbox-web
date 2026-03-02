import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureCombMakersSystem, CombMaterial } from '../systems/CreatureCombMakersSystem'
import type { CombMaker } from '../systems/CreatureCombMakersSystem'

// CHECK_INTERVAL=1400, SKILL_GROWTH=0.057, MAX_MAKERS=30
// teethFineness = 12 + skill * 0.71
// reputation = 10 + skill * 0.78
// material: MATERIALS[Math.min(3, Math.floor(skill/25))]
// combsMade = 1 + Math.floor(skill/7)
// cutoff = tick - 51500

let nextId = 1
function makeSys() { return new CreatureCombMakersSystem() }
function makeMaker(entityId: number, skill: number, tick: number): CombMaker {
  const matIdx = Math.min(3, Math.floor(skill / 25))
  const materials: CombMaterial[] = ['bone', 'horn', 'wood', 'ivory']
  return {
    id: nextId++,
    entityId,
    skill,
    combsMade: 1 + Math.floor(skill / 7),
    material: materials[matIdx],
    teethFineness: 12 + skill * 0.71,
    reputation: 10 + skill * 0.78,
    tick,
  }
}

describe('CreatureCombMakersSystem – 初始状态', () => {
  let sys: CreatureCombMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无记录', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('skillMap初始为空Map', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })
})

describe('CreatureCombMakersSystem – 数据注入与查询', () => {
  let sys: CreatureCombMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入后可查询entityId', () => {
    ;(sys as any).makers.push(makeMaker(42, 10, 0))
    expect((sys as any).makers[0].entityId).toBe(42)
  })

  it('注入多条记录可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 20, 0))
    ;(sys as any).makers.push(makeMaker(2, 50, 0))
    expect((sys as any).makers).toHaveLength(2)
    expect((sys as any).makers[1].skill).toBe(50)
  })
})

describe('CreatureCombMakersSystem – CombMaterial枚举', () => {
  it('CombMaterial包含4种材质', () => {
    const materials: CombMaterial[] = ['bone', 'horn', 'wood', 'ivory']
    expect(materials).toHaveLength(4)
  })

  it('skill<25时material为bone', () => {
    const m = makeMaker(1, 10, 0)
    expect(m.material).toBe('bone')
  })

  it('skill=25时material为horn', () => {
    const m = makeMaker(1, 25, 0)
    expect(m.material).toBe('horn')
  })

  it('skill=50时material为wood', () => {
    const m = makeMaker(1, 50, 0)
    expect(m.material).toBe('wood')
  })

  it('skill=75时material为ivory', () => {
    const m = makeMaker(1, 75, 0)
    expect(m.material).toBe('ivory')
  })
})

describe('CreatureCombMakersSystem – teethFineness公式', () => {
  let sys: CreatureCombMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skill=0时teethFineness=12', () => {
    const m = makeMaker(1, 0, 0)
    expect(m.teethFineness).toBeCloseTo(12)
  })

  it('skill=100时teethFineness=12+100*0.71=83', () => {
    const m = makeMaker(1, 100, 0)
    expect(m.teethFineness).toBeCloseTo(83)
  })

  it('skill=50时teethFineness=12+50*0.71=47.5', () => {
    const m = makeMaker(1, 50, 0)
    expect(m.teethFineness).toBeCloseTo(47.5)
  })
})

describe('CreatureCombMakersSystem – reputation公式', () => {
  let sys: CreatureCombMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skill=0时reputation=10', () => {
    const m = makeMaker(1, 0, 0)
    expect(m.reputation).toBeCloseTo(10)
  })

  it('skill=100时reputation=10+100*0.78=88', () => {
    const m = makeMaker(1, 100, 0)
    expect(m.reputation).toBeCloseTo(88)
  })

  it('skill=50时reputation=10+50*0.78=49', () => {
    const m = makeMaker(1, 50, 0)
    expect(m.reputation).toBeCloseTo(49)
  })
})

describe('CreatureCombMakersSystem – combsMade计算', () => {
  it('skill=49时combsMade=1+floor(49/7)=8', () => {
    const m = makeMaker(1, 49, 0)
    expect(m.combsMade).toBe(8)
  })

  it('skill=0时combsMade=1', () => {
    const m = makeMaker(1, 0, 0)
    expect(m.combsMade).toBe(1)
  })

  it('skill=70时combsMade=1+floor(70/7)=11', () => {
    const m = makeMaker(1, 70, 0)
    expect(m.combsMade).toBe(11)
  })
})

describe('CreatureCombMakersSystem – material由skill/25决定4段', () => {
  it('skill=24时matIdx=0 bone', () => {
    const m = makeMaker(1, 24, 0)
    expect(m.material).toBe('bone')
  })

  it('skill=49时matIdx=1 horn', () => {
    const m = makeMaker(1, 49, 0)
    expect(m.material).toBe('horn')
  })

  it('skill=74时matIdx=2 wood', () => {
    const m = makeMaker(1, 74, 0)
    expect(m.material).toBe('wood')
  })

  it('skill=100时matIdx被限制为3 ivory', () => {
    const m = makeMaker(1, 100, 0)
    expect(m.material).toBe('ivory')
  })
})

describe('CreatureCombMakersSystem – CHECK_INTERVAL节流', () => {
  let sys: CreatureCombMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick差值<1400时不更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1399)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=1400时更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1400)
    expect((sys as any).lastCheck).toBe(1400)
  })

  it('tick=1399时lastCheck保持0（恰好边界-1）', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1399)
    expect((sys as any).lastCheck).toBe(0)
  })
})

describe('CreatureCombMakersSystem – time-based cleanup', () => {
  let sys: CreatureCombMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick<cutoff的旧记录被清除', () => {
    // cutoff = tick - 51500，在tick=100000时，cutoff=48500
    // 注入一条tick=1000的记录（早于cutoff）
    ;(sys as any).makers.push(makeMaker(1, 10, 1000))
    const em = { getEntitiesWithComponents: () => [] as number[], getComponent: () => undefined } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    // makers中tick=1000 < cutoff=48500，应被删除
    expect((sys as any).makers).toHaveLength(0)
  })

  it('新记录保留', () => {
    // cutoff = 100000 - 51500 = 48500，注入tick=90000的新记录
    ;(sys as any).makers.push(makeMaker(1, 10, 90000))
    const em = { getEntitiesWithComponents: () => [] as number[], getComponent: () => undefined } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    // tick=90000 > cutoff=48500，应保留
    expect((sys as any).makers).toHaveLength(1)
  })
})
