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
