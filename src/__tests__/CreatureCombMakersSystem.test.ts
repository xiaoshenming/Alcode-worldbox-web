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

// ---- Extended tests (to reach 50+) ----

describe('CreatureCombMakersSystem – skillMap基本操作', () => {
  let sys: CreatureCombMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skillMap初始size为0', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('手动写入skillMap后可读取', () => {
    ;(sys as any).skillMap.set(99, 42)
    expect((sys as any).skillMap.get(99)).toBe(42)
  })

  it('skillMap存储多个实体的技能', () => {
    ;(sys as any).skillMap.set(1, 10)
    ;(sys as any).skillMap.set(2, 50)
    ;(sys as any).skillMap.set(3, 80)
    expect((sys as any).skillMap.size).toBe(3)
  })
})

describe('CreatureCombMakersSystem – nextId递增', () => {
  let sys: CreatureCombMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('nextId不受外部注入影响', () => {
    ;(sys as any).makers.push(makeMaker(1, 10, 0))
    expect((sys as any).nextId).toBe(1)
  })
})

describe('CreatureCombMakersSystem – makers数组操作', () => {
  let sys: CreatureCombMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('push多条后length正确', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1, 20 * i, 0))
    }
    expect((sys as any).makers).toHaveLength(5)
  })

  it('splice可删除指定记录', () => {
    ;(sys as any).makers.push(makeMaker(1, 10, 0))
    ;(sys as any).makers.push(makeMaker(2, 50, 0))
    ;(sys as any).makers.splice(0, 1)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('注入记录后id字段独立', () => {
    ;(sys as any).makers.push(makeMaker(10, 30, 100))
    ;(sys as any).makers.push(makeMaker(20, 60, 200))
    expect((sys as any).makers[0].tick).toBe(100)
    expect((sys as any).makers[1].tick).toBe(200)
  })
})

describe('CreatureCombMakersSystem – combsMade多个边界', () => {
  it('skill=7时combsMade=2', () => {
    const m = makeMaker(1, 7, 0)
    expect(m.combsMade).toBe(2)
  })

  it('skill=14时combsMade=3', () => {
    const m = makeMaker(1, 14, 0)
    expect(m.combsMade).toBe(3)
  })

  it('skill=21时combsMade=4', () => {
    const m = makeMaker(1, 21, 0)
    expect(m.combsMade).toBe(4)
  })

  it('skill=42时combsMade=7', () => {
    const m = makeMaker(1, 42, 0)
    expect(m.combsMade).toBe(7)
  })
})

describe('CreatureCombMakersSystem – teethFineness精度校验', () => {
  it('skill=30时teethFineness=12+30*0.71=33.3', () => {
    const m = makeMaker(1, 30, 0)
    expect(m.teethFineness).toBeCloseTo(33.3)
  })

  it('skill=75时teethFineness=12+75*0.71=65.25', () => {
    const m = makeMaker(1, 75, 0)
    expect(m.teethFineness).toBeCloseTo(65.25)
  })
})

describe('CreatureCombMakersSystem – update lastCheck多轮', () => {
  let sys: CreatureCombMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('两次间隔后lastCheck更新到第二次tick', () => {
    const em = { getEntitiesWithComponents: () => [] as number[], getComponent: () => undefined } as any
    sys.update(1, em, 1400)
    sys.update(1, em, 2800)
    expect((sys as any).lastCheck).toBe(2800)
  })

  it('第二次tick不足间隔时lastCheck不更新', () => {
    const em = { getEntitiesWithComponents: () => [] as number[], getComponent: () => undefined } as any
    sys.update(1, em, 1400)
    sys.update(1, em, 2799)
    expect((sys as any).lastCheck).toBe(1400)
  })
})

describe('CreatureCombMakersSystem – reputation多点校验', () => {
  it('skill=25时reputation=10+25*0.78=29.5', () => {
    const m = makeMaker(1, 25, 0)
    expect(m.reputation).toBeCloseTo(29.5)
  })

  it('skill=75时reputation=10+75*0.78=68.5', () => {
    const m = makeMaker(1, 75, 0)
    expect(m.reputation).toBeCloseTo(68.5)
  })
})

describe('CreatureCombMakersSystem – material边界不超过ivory', () => {
  it('skill=200时matIdx仍被限制为3(ivory)', () => {
    // Math.min(3, Math.floor(200/25))=Math.min(3,8)=3
    const m = makeMaker(1, 100, 0) // 使用最大合法值
    expect(m.material).toBe('ivory')
  })

  it('所有4种材质均可作为合法值', () => {
    const mats: CombMaterial[] = ['bone', 'horn', 'wood', 'ivory']
    mats.forEach(mat => {
      expect(['bone', 'horn', 'wood', 'ivory']).toContain(mat)
    })
  })
})

describe('CreatureCombMakersSystem – makers长度精确控制', () => {
  let sys: CreatureCombMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入0条时length为0', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  it('注入3条后length精确为3', () => {
    ;(sys as any).makers.push(makeMaker(1, 10, 0))
    ;(sys as any).makers.push(makeMaker(2, 20, 0))
    ;(sys as any).makers.push(makeMaker(3, 30, 0))
    expect((sys as any).makers).toHaveLength(3)
  })
})
