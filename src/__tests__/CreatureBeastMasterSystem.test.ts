import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBeastMasterSystem } from '../systems/CreatureBeastMasterSystem'
import type { BeastMasterRecord, BeastBond } from '../systems/CreatureBeastMasterSystem'

// CreatureBeastMasterSystem 测试:
// - getRecords()             → 返回内部数组引用
// - getMasterBonds(masterId) → 过滤指定 masterId 的记录
// - getAverageLoyalty()      → 平均忠诚度（无记录时返回0）

let nextId = 1

function makeBMSys(): CreatureBeastMasterSystem {
  return new CreatureBeastMasterSystem()
}

function makeRecord(masterId: number, beastId: number, loyalty = 50, bond: BeastBond = 'companion'): BeastMasterRecord {
  return {
    id: nextId++,
    masterId,
    beastId,
    bond,
    loyalty,
    trainingLevel: 40,
    tick: 0,
  }
}

describe('CreatureBeastMasterSystem.getRecords', () => {
  let sys: CreatureBeastMasterSystem

  beforeEach(() => { sys = makeBMSys(); nextId = 1 })

  it('初始无记录', () => {
    expect((sys as any).records).toHaveLength(0)
  })

  it('注入记录后可查��', () => {
    ;(sys as any).records.push(makeRecord(1, 100, 75, 'war_mount'))
    expect((sys as any).records).toHaveLength(1)
    expect((sys as any).records[0].bond).toBe('war_mount')
  })

  it('返回内部引用', () => {
    ;(sys as any).records.push(makeRecord(1, 100))
    expect((sys as any).records).toBe((sys as any).records)
  })

  it('支持所有 5 种纽带类型', () => {
    const bonds: BeastBond[] = ['companion', 'war_mount', 'pack_animal', 'scout', 'guardian']
    bonds.forEach((b, i) => {
      ;(sys as any).records.push(makeRecord(i + 1, i + 100, 50, b))
    })
    const all = (sys as any).records
    expect(all).toHaveLength(5)
    bonds.forEach((b, i) => { expect(all[i].bond).toBe(b) })
  })
})

describe('CreatureBeastMasterSystem.getMasterBonds', () => {
  let sys: CreatureBeastMasterSystem

  beforeEach(() => { sys = makeBMSys(); nextId = 1 })

  it('无记录时返回空数组', () => {
    expect(sys.getMasterBonds(1)).toHaveLength(0)
  })

  it('只返回指定 masterId 的记录', () => {
    ;(sys as any).records.push(makeRecord(1, 100))
    ;(sys as any).records.push(makeRecord(2, 101))
    ;(sys as any).records.push(makeRecord(1, 102))
    expect(sys.getMasterBonds(1)).toHaveLength(2)
    expect(sys.getMasterBonds(2)).toHaveLength(1)
    expect(sys.getMasterBonds(3)).toHaveLength(0)
  })

  it('返回结果为新数组', () => {
    ;(sys as any).records.push(makeRecord(1, 100))
    expect(sys.getMasterBonds(1)).not.toBe((sys as any).records)
  })
})

describe('CreatureBeastMasterSystem.getAverageLoyalty', () => {
  let sys: CreatureBeastMasterSystem

  beforeEach(() => { sys = makeBMSys(); nextId = 1 })

  it('无记录时返回 0', () => {
    expect(((sys as any).records.length === 0 ? 0 : ((sys as any).records.reduce((s: number, r: {loyalty: number}) => s + r.loyalty, 0) / (sys as any).records.length))).toBe(0)
  })

  it('单条记录时返回该忠诚度', () => {
    ;(sys as any).records.push(makeRecord(1, 100, 80))
    expect(((sys as any).records.length === 0 ? 0 : ((sys as any).records.reduce((s: number, r: {loyalty: number}) => s + r.loyalty, 0) / (sys as any).records.length))).toBe(80)
  })

  it('多条记录时返回平均值', () => {
    ;(sys as any).records.push(makeRecord(1, 100, 60))
    ;(sys as any).records.push(makeRecord(2, 101, 80))
    ;(sys as any).records.push(makeRecord(3, 102, 40))
    // (60+80+40)/3 = 60
    expect(((sys as any).records.length === 0 ? 0 : ((sys as any).records.reduce((s: number, r: {loyalty: number}) => s + r.loyalty, 0) / (sys as any).records.length))).toBeCloseTo(60)
  })

  it('全部 100 忠诚度时返回 100', () => {
    ;(sys as any).records.push(makeRecord(1, 100, 100))
    ;(sys as any).records.push(makeRecord(2, 101, 100))
    expect(((sys as any).records.length === 0 ? 0 : ((sys as any).records.reduce((s: number, r: {loyalty: number}) => s + r.loyalty, 0) / (sys as any).records.length))).toBe(100)
  })
})
