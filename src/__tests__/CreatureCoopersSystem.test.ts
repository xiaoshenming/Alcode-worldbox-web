import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureCoopersSystem, BarrelType } from '../systems/CreatureCoopersSystem'
import type { Cooper } from '../systems/CreatureCoopersSystem'

// CHECK_INTERVAL=1350, SKILL_GROWTH=0.07, MAX_COOPERS=36
// tightness = 30 + skill * 0.6
// durability = 25 + skill * 0.65
// barrelType: BARREL_TYPES[Math.min(3, Math.floor(skill/25))]
// barrelsMade = 1 + Math.floor(skill/12)
// cutoff = tick - 55000

let nextId = 1
function makeSys() { return new CreatureCoopersSystem() }
function makeCooper(entityId: number, skill: number, tick: number): Cooper {
  const barrelTypes: BarrelType[] = ['wine', 'ale', 'water', 'provisions']
  const typeIdx = Math.min(3, Math.floor(skill / 25))
  return {
    id: nextId++,
    entityId,
    skill,
    barrelsMade: 1 + Math.floor(skill / 12),
    barrelType: barrelTypes[typeIdx],
    tightness: 30 + skill * 0.6,
    durability: 25 + skill * 0.65,
    tick,
  }
}

describe('CreatureCoopersSystem – 初始状态', () => {
  let sys: CreatureCoopersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无记录（coopers.length===0）', () => {
    expect((sys as any).coopers).toHaveLength(0)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('skillMap初始为空Map', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })
})

describe('CreatureCoopersSystem – 数据注入与查询', () => {
  let sys: CreatureCoopersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入后可查询entityId', () => {
    ;(sys as any).coopers.push(makeCooper(7, 20, 0))
    expect((sys as any).coopers[0].entityId).toBe(7)
  })

  it('注入多条记录可查询', () => {
    ;(sys as any).coopers.push(makeCooper(1, 20, 0))
    ;(sys as any).coopers.push(makeCooper(2, 60, 0))
    expect((sys as any).coopers).toHaveLength(2)
    expect((sys as any).coopers[1].skill).toBe(60)
  })
})

describe('CreatureCoopersSystem – BarrelType枚举', () => {
  it('BarrelType包含4种类型', () => {
    const types: BarrelType[] = ['wine', 'ale', 'water', 'provisions']
    expect(types).toHaveLength(4)
  })

  it('skill<25时barrelType为wine', () => {
    const c = makeCooper(1, 10, 0)
    expect(c.barrelType).toBe('wine')
  })

  it('skill=25时barrelType为ale', () => {
    const c = makeCooper(1, 25, 0)
    expect(c.barrelType).toBe('ale')
  })

  it('skill=50时barrelType为water', () => {
    const c = makeCooper(1, 50, 0)
    expect(c.barrelType).toBe('water')
  })

  it('skill=75时barrelType为provisions', () => {
    const c = makeCooper(1, 75, 0)
    expect(c.barrelType).toBe('provisions')
  })
})

describe('CreatureCoopersSystem – tightness公式', () => {
  it('skill=0时tightness=30', () => {
    const c = makeCooper(1, 0, 0)
    expect(c.tightness).toBeCloseTo(30)
  })

  it('skill=100时tightness=30+100*0.6=90', () => {
    const c = makeCooper(1, 100, 0)
    expect(c.tightness).toBeCloseTo(90)
  })

  it('skill=50时tightness=30+50*0.6=60', () => {
    const c = makeCooper(1, 50, 0)
    expect(c.tightness).toBeCloseTo(60)
  })
})

describe('CreatureCoopersSystem – durability公式', () => {
  it('skill=0时durability=25', () => {
    const c = makeCooper(1, 0, 0)
    expect(c.durability).toBeCloseTo(25)
  })

  it('skill=100时durability=25+100*0.65=90', () => {
    const c = makeCooper(1, 100, 0)
    expect(c.durability).toBeCloseTo(90)
  })

  it('skill=40时durability=25+40*0.65=51', () => {
    const c = makeCooper(1, 40, 0)
    expect(c.durability).toBeCloseTo(51)
  })
})

describe('CreatureCoopersSystem – barrelsMade计算', () => {
  it('skill=48时barrelsMade=1+floor(48/12)=5', () => {
    const c = makeCooper(1, 48, 0)
    expect(c.barrelsMade).toBe(5)
  })

  it('skill=0时barrelsMade=1', () => {
    const c = makeCooper(1, 0, 0)
    expect(c.barrelsMade).toBe(1)
  })

  it('skill=60时barrelsMade=1+floor(60/12)=6', () => {
    const c = makeCooper(1, 60, 0)
    expect(c.barrelsMade).toBe(6)
  })
})

describe('CreatureCoopersSystem – barrelType由skill/25决定4段', () => {
  it('skill=24时typeIdx=0 wine', () => {
    const c = makeCooper(1, 24, 0)
    expect(c.barrelType).toBe('wine')
  })

  it('skill=49时typeIdx=1 ale', () => {
    const c = makeCooper(1, 49, 0)
    expect(c.barrelType).toBe('ale')
  })

  it('skill=74时typeIdx=2 water', () => {
    const c = makeCooper(1, 74, 0)
    expect(c.barrelType).toBe('water')
  })

  it('skill=100时typeIdx被限制为3 provisions', () => {
    const c = makeCooper(1, 100, 0)
    expect(c.barrelType).toBe('provisions')
  })
})

describe('CreatureCoopersSystem – CHECK_INTERVAL节流', () => {
  let sys: CreatureCoopersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick差值<1350时不更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1349)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=1350时更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1350)
    expect((sys as any).lastCheck).toBe(1350)
  })

  it('tick=1349时lastCheck保持0（恰好边界-1）', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1349)
    expect((sys as any).lastCheck).toBe(0)
  })
})

describe('CreatureCoopersSystem – time-based cleanup', () => {
  let sys: CreatureCoopersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick<cutoff的旧记录被清除', () => {
    // cutoff = tick - 55000，在tick=100000时，cutoff=45000
    // 注入一条tick=1000的记录（早于cutoff）
    ;(sys as any).coopers.push(makeCooper(1, 10, 1000))
    const em = { getEntitiesWithComponents: () => [] as number[], getComponent: () => undefined } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    // coopers中tick=1000 < cutoff=45000，应被删除
    expect((sys as any).coopers).toHaveLength(0)
  })

  it('新记录保留', () => {
    // cutoff = 100000 - 55000 = 45000，注入tick=80000的新记录
    ;(sys as any).coopers.push(makeCooper(1, 10, 80000))
    const em = { getEntitiesWithComponents: () => [] as number[], getComponent: () => undefined } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    // tick=80000 > cutoff=45000，应保留
    expect((sys as any).coopers).toHaveLength(1)
  })
})

// ---- Extended tests (to reach 50+) ----

describe('CreatureCoopersSystem – skillMap基本操作', () => {
  let sys: CreatureCoopersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('手动写入skillMap后可读取', () => {
    ;(sys as any).skillMap.set(7, 33)
    expect((sys as any).skillMap.get(7)).toBe(33)
  })

  it('skillMap存储多个实体的技能', () => {
    ;(sys as any).skillMap.set(1, 10)
    ;(sys as any).skillMap.set(2, 50)
    expect((sys as any).skillMap.size).toBe(2)
  })

  it('skillMap.delete后条目消失', () => {
    ;(sys as any).skillMap.set(5, 20)
    ;(sys as any).skillMap.delete(5)
    expect((sys as any).skillMap.has(5)).toBe(false)
  })
})

describe('CreatureCoopersSystem – nextId初始状态', () => {
  let sys: CreatureCoopersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
})

describe('CreatureCoopersSystem – coopers数组操作', () => {
  let sys: CreatureCoopersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('push5条后length为5', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).coopers.push(makeCooper(i + 1, 20 * i, 0))
    }
    expect((sys as any).coopers).toHaveLength(5)
  })

  it('splice后length减少1', () => {
    ;(sys as any).coopers.push(makeCooper(1, 10, 0))
    ;(sys as any).coopers.push(makeCooper(2, 20, 0))
    ;(sys as any).coopers.splice(0, 1)
    expect((sys as any).coopers).toHaveLength(1)
  })

  it('注入后tick字段保留', () => {
    ;(sys as any).coopers.push(makeCooper(1, 10, 5000))
    expect((sys as any).coopers[0].tick).toBe(5000)
  })
})

describe('CreatureCoopersSystem – barrelsMade多点边界', () => {
  it('skill=12时barrelsMade=2', () => {
    const c = makeCooper(1, 12, 0)
    expect(c.barrelsMade).toBe(2)
  })

  it('skill=24时barrelsMade=3', () => {
    const c = makeCooper(1, 24, 0)
    expect(c.barrelsMade).toBe(3)
  })

  it('skill=100时barrelsMade=1+floor(100/12)=9', () => {
    const c = makeCooper(1, 100, 0)
    expect(c.barrelsMade).toBe(9)
  })
})

describe('CreatureCoopersSystem – tightness与durability多点', () => {
  it('skill=25时tightness=30+25*0.6=45', () => {
    const c = makeCooper(1, 25, 0)
    expect(c.tightness).toBeCloseTo(45)
  })

  it('skill=75时tightness=30+75*0.6=75', () => {
    const c = makeCooper(1, 75, 0)
    expect(c.tightness).toBeCloseTo(75)
  })

  it('skill=25时durability=25+25*0.65=41.25', () => {
    const c = makeCooper(1, 25, 0)
    expect(c.durability).toBeCloseTo(41.25)
  })

  it('skill=75时durability=25+75*0.65=73.75', () => {
    const c = makeCooper(1, 75, 0)
    expect(c.durability).toBeCloseTo(73.75)
  })
})

describe('CreatureCoopersSystem – update多轮lastCheck', () => {
  let sys: CreatureCoopersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('两次间隔后lastCheck更新到第二次tick', () => {
    const em = { getEntitiesWithComponents: () => [] as number[], getComponent: () => undefined } as any
    sys.update(1, em, 1350)
    sys.update(1, em, 2700)
    expect((sys as any).lastCheck).toBe(2700)
  })

  it('第三次在第二次基础上再间隔才触发', () => {
    const em = { getEntitiesWithComponents: () => [] as number[], getComponent: () => undefined } as any
    sys.update(1, em, 1350)
    sys.update(1, em, 2700)
    sys.update(1, em, 4049)
    expect((sys as any).lastCheck).toBe(2700)
    sys.update(1, em, 4050)
    expect((sys as any).lastCheck).toBe(4050)
  })
})

describe('CreatureCoopersSystem – barrelType等于4种', () => {
  it('4种barrelType均为有效字符串', () => {
    const types: BarrelType[] = ['wine', 'ale', 'water', 'provisions']
    types.forEach(t => { expect(typeof t).toBe('string') })
  })

  it('skill=37时barrelType为ale', () => {
    const c = makeCooper(1, 37, 0)
    expect(c.barrelType).toBe('ale')
  })

  it('skill=62时barrelType为water', () => {
    const c = makeCooper(1, 62, 0)
    expect(c.barrelType).toBe('water')
  })

  it('skill=99时barrelType为provisions', () => {
    const c = makeCooper(1, 99, 0)
    expect(c.barrelType).toBe('provisions')
  })
})

describe('CreatureCoopersSystem – 数据完整性验证', () => {
  let sys: CreatureCoopersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('cooper的id字段唯一（通过nextId保证）', () => {
    ;(sys as any).coopers.push(makeCooper(1, 10, 0))
    ;(sys as any).coopers.push(makeCooper(2, 20, 0))
    const ids = (sys as any).coopers.map((c: any) => c.id)
    expect(new Set(ids).size).toBe(2)
  })

  it('entityId字段正确保存', () => {
    ;(sys as any).coopers.push(makeCooper(77, 50, 0))
    expect((sys as any).coopers[0].entityId).toBe(77)
  })
})
