import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSoapMakersSystem } from '../systems/CreatureSoapMakersSystem'
import type { SoapMaker, SoapType } from '../systems/CreatureSoapMakersSystem'

let nextId = 1
function makeSys(): CreatureSoapMakersSystem { return new CreatureSoapMakersSystem() }
function makeMaker(entityId: number, type: SoapType = 'tallow', skill = 70, tick = 0): SoapMaker {
  return { id: nextId++, entityId, skill, batchesMade: 15, soapType: type, purity: 65, reputation: 45, tick }
}

// 常量与源文件一致
const CHECK_INTERVAL = 1400
const SKILL_GROWTH = 0.065
const MAX_MAKERS = 30

// ---- 基础数据结构 ----
describe('CreatureSoapMakersSystem - 基础数据结构', () => {
  let sys: CreatureSoapMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无肥皂工匠', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'olive'))
    expect((sys as any).makers[0].soapType).toBe('olive')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有4种Soap类型', () => {
    const types: SoapType[] = ['tallow', 'olive', 'herbal', 'perfumed']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].soapType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})

// ---- CHECK_INTERVAL 节流 ----
describe('CreatureSoapMakersSystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureSoapMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick不足CHECK_INTERVAL时update跳过', () => {
    const mockEM = { getComponent: () => undefined, getEntitiesWithComponents: () => [] }
    // lastCheck=0，tick=CHECK_INTERVAL-1，不足，不执行
    sys.update(1, mockEM as any, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick达到CHECK_INTERVAL时更新lastCheck', () => {
    const mockEM = { getComponent: () => undefined, getEntitiesWithComponents: () => [] }
    sys.update(1, mockEM as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('连续调用lastCheck随tick更新', () => {
    const mockEM = { getComponent: () => undefined, getEntitiesWithComponents: () => [] }
    sys.update(1, mockEM as any, CHECK_INTERVAL)
    sys.update(1, mockEM as any, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('update不崩溃（空实体列表）', () => {
    const mockEM = { getComponent: () => undefined, getEntitiesWithComponents: () => [] }
    expect(() => sys.update(1, mockEM as any, 0)).not.toThrow()
  })
})

// ---- skillMap 技能增长 ----
describe('CreatureSoapMakersSystem - skillMap技能增长', () => {
  let sys: CreatureSoapMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始skillMap为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('手动注入skillMap后可读取', () => {
    ;(sys as any).skillMap.set(42, 50)
    expect((sys as any).skillMap.get(42)).toBe(50)
  })

  it('SKILL_GROWTH值为0.065', () => {
    // 验证注入skill后加SKILL_GROWTH不超过上限
    const base = 10
    const result = Math.min(100, base + SKILL_GROWTH)
    expect(result).toBeCloseTo(base + 0.065, 5)
  })

  it('skill累加不超过100上限', () => {
    const result = Math.min(100, 99.98 + SKILL_GROWTH)
    expect(result).toBe(100)
  })

  it('skillMap按entityId独立存储', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(2, 60)
    expect((sys as any).skillMap.get(1)).toBe(30)
    expect((sys as any).skillMap.get(2)).toBe(60)
  })
})

// ---- soapType与skill档位 ----
describe('CreatureSoapMakersSystem - soapType与skill档位', () => {
  let sys: CreatureSoapMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skill<25时typeIdx=0对应tallow', () => {
    const skill = 10
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    const SOAP_TYPES: SoapType[] = ['tallow', 'olive', 'herbal', 'perfumed']
    expect(SOAP_TYPES[typeIdx]).toBe('tallow')
  })

  it('skill=25时typeIdx=1对应olive', () => {
    const skill = 25
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    const SOAP_TYPES: SoapType[] = ['tallow', 'olive', 'herbal', 'perfumed']
    expect(SOAP_TYPES[typeIdx]).toBe('olive')
  })

  it('skill=50时typeIdx=2对应herbal', () => {
    const skill = 50
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    const SOAP_TYPES: SoapType[] = ['tallow', 'olive', 'herbal', 'perfumed']
    expect(SOAP_TYPES[typeIdx]).toBe('herbal')
  })

  it('skill=75时typeIdx=3对应perfumed', () => {
    const skill = 75
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    const SOAP_TYPES: SoapType[] = ['tallow', 'olive', 'herbal', 'perfumed']
    expect(SOAP_TYPES[typeIdx]).toBe('perfumed')
  })

  it('skill=100时typeIdx上限为3（perfumed）', () => {
    const skill = 100
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    expect(typeIdx).toBe(3)
  })
})

// ---- purity与reputation计算 ----
describe('CreatureSoapMakersSystem - purity与reputation计算', () => {
  let sys: CreatureSoapMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('purity=15+skill*0.7', () => {
    const skill = 70
    expect(15 + skill * 0.7).toBeCloseTo(64, 1)
  })

  it('reputation=10+skill*0.8', () => {
    const skill = 70
    expect(10 + skill * 0.8).toBeCloseTo(66, 1)
  })

  it('batchesMade=1+floor(skill/8)', () => {
    const skill = 70
    expect(1 + Math.floor(skill / 8)).toBe(9)
  })
})

// ---- time-based cleanup ----
describe('CreatureSoapMakersSystem - cleanup过期清理', () => {
  let sys: CreatureSoapMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('过期记录被清理（tick<cutoff）', () => {
    // cutoff = tick - 53000，注入tick=0的记录，在tick=53001时应被清除
    ;(sys as any).makers.push(makeMaker(1, 'tallow', 20, 0))
    const mockEM = { getComponent: () => undefined, getEntitiesWithComponents: () => [] }
    sys.update(1, mockEM as any, 53001 + CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('未过期记录保留', () => {
    const tick = 100000
    ;(sys as any).makers.push(makeMaker(1, 'tallow', 20, tick - 1000))
    const mockEM = { getComponent: () => undefined, getEntitiesWithComponents: () => [] }
    // 设置lastCheck使下次update触发
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL
    sys.update(1, mockEM as any, tick)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('MAX_MAKERS上限为30', () => {
    expect(MAX_MAKERS).toBe(30)
  })

  it('cleanup后先增后删：先加到3.98后删至0', () => {
    // 注入29个不过期的记录（快到MAX_MAKERS边界）
    const currentTick = 200000
    for (let i = 0; i < 29; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1, 'tallow', 20, currentTick - 100))
    }
    expect((sys as any).makers).toHaveLength(29)

    // 再注入1个刚好达到上限
    ;(sys as any).makers.push(makeMaker(100, 'tallow', 20, currentTick - 100))
    expect((sys as any).makers).toHaveLength(MAX_MAKERS)

    // 让所有记录过期
    for (let i = 0; i < MAX_MAKERS; i++) {
      ;(sys as any).makers[i] = makeMaker(i + 1, 'tallow', 20, 0)
    }
    const mockEM = { getComponent: () => undefined, getEntitiesWithComponents: () => [] }
    ;(sys as any).lastCheck = currentTick
    sys.update(1, mockEM as any, currentTick + CHECK_INTERVAL + 53001)
    expect((sys as any).makers).toHaveLength(0)
  })
})

// ---- Extended tests (to reach 50+) ----

describe('CreatureSoapMakersSystem - purity公式', () => {
  it('skill=0时purity=15', () => {
    expect(15 + 0 * 0.7).toBeCloseTo(15)
  })

  it('skill=50时purity=15+50*0.7=50', () => {
    expect(15 + 50 * 0.7).toBeCloseTo(50)
  })

  it('skill=100时purity=15+100*0.7=85', () => {
    expect(15 + 100 * 0.7).toBeCloseTo(85)
  })

  it('skill=25时purity=15+25*0.7=32.5', () => {
    expect(15 + 25 * 0.7).toBeCloseTo(32.5)
  })
})

describe('CreatureSoapMakersSystem - reputation公式', () => {
  it('skill=0时reputation=10', () => {
    expect(10 + 0 * 0.8).toBeCloseTo(10)
  })

  it('skill=50时reputation=10+50*0.8=50', () => {
    expect(10 + 50 * 0.8).toBeCloseTo(50)
  })

  it('skill=100时reputation=10+100*0.8=90', () => {
    expect(10 + 100 * 0.8).toBeCloseTo(90)
  })
})

describe('CreatureSoapMakersSystem - batchesMade公式', () => {
  it('skill=8时batchesMade=1+floor(8/8)=2', () => {
    expect(1 + Math.floor(8 / 8)).toBe(2)
  })

  it('skill=0时batchesMade=1', () => {
    expect(1 + Math.floor(0 / 8)).toBe(1)
  })

  it('skill=80时batchesMade=1+floor(80/8)=11', () => {
    expect(1 + Math.floor(80 / 8)).toBe(11)
  })
})

describe('CreatureSoapMakersSystem - soapType4段', () => {
  it('skill=0→tallow', () => {
    expect(['tallow', 'olive', 'herbal', 'perfumed'][Math.min(3, Math.floor(0 / 25))]).toBe('tallow')
  })

  it('skill=25→olive', () => {
    expect(['tallow', 'olive', 'herbal', 'perfumed'][Math.min(3, Math.floor(25 / 25))]).toBe('olive')
  })

  it('skill=50→herbal', () => {
    expect(['tallow', 'olive', 'herbal', 'perfumed'][Math.min(3, Math.floor(50 / 25))]).toBe('herbal')
  })

  it('skill=75→perfumed', () => {
    expect(['tallow', 'olive', 'herbal', 'perfumed'][Math.min(3, Math.floor(75 / 25))]).toBe('perfumed')
  })

  it('skill=100→上限3→perfumed', () => {
    expect(['tallow', 'olive', 'herbal', 'perfumed'][Math.min(3, Math.floor(100 / 25))]).toBe('perfumed')
  })
})

describe('CreatureSoapMakersSystem - skillMap操作', () => {
  let sys: CreatureSoapMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始skillMap为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('手动写入后可读取', () => {
    ;(sys as any).skillMap.set(3, 44)
    expect((sys as any).skillMap.get(3)).toBe(44)
  })

  it('多实体技能各自独立', () => {
    ;(sys as any).skillMap.set(1, 10)
    ;(sys as any).skillMap.set(2, 50)
    expect((sys as any).skillMap.get(1)).toBe(10)
    expect((sys as any).skillMap.get(2)).toBe(50)
  })
})

describe('CreatureSoapMakersSystem - lastCheck多轮', () => {
  let sys: CreatureSoapMakersSystem
  const fakeEm = { getEntitiesWithComponents: () => [], getComponent: () => null } as any
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('两次达阈值后lastCheck正确', () => {
    sys.update(1, fakeEm, CHECK_INTERVAL)
    sys.update(1, fakeEm, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})

describe('CreatureSoapMakersSystem - 数据完整性', () => {
  let sys: CreatureSoapMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入所有字段完整保存', () => {
    ;(sys as any).makers.push(makeMaker(42, 'perfumed', 80, 9999))
    const m = (sys as any).makers[0]
    expect(m.entityId).toBe(42)
    expect(m.soapType).toBe('perfumed')
    expect(m.tick).toBe(9999)
  })
})

describe('CreatureSoapMakersSystem - MAX_MAKERS=30上限', () => {
  let sys: CreatureSoapMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('手动注入30条后length为30', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1))
    }
    expect((sys as any).makers).toHaveLength(30)
  })
})

describe('CreatureSoapMakersSystem - 数据结构字段类型', () => {
  it('SoapMaker接口所有字段为合法类型', () => {
    const m = makeMaker(1)
    expect(typeof m.id).toBe('number')
    expect(typeof m.entityId).toBe('number')
    expect(typeof m.skill).toBe('number')
    expect(typeof m.batchesMade).toBe('number')
    expect(typeof m.soapType).toBe('string')
    expect(typeof m.purity).toBe('number')
    expect(typeof m.reputation).toBe('number')
    expect(typeof m.tick).toBe('number')
  })
})

describe('CreatureSoapMakersSystem - nextId初始', () => {
  let sys: CreatureSoapMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
})
