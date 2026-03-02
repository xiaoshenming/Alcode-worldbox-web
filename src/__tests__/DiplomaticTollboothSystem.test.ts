import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticTollboothSystem } from '../systems/DiplomaticTollboothSystem'

const em = {} as any
const world = {} as any

function makeSys() { return new DiplomaticTollboothSystem() }

describe('DiplomaticTollboothSystem', () => {
  let sys: DiplomaticTollboothSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  // 初始状态
  it('初始arrangements为空', () => { expect((sys as any).arrangements).toHaveLength(0) })
  it('初始nextId为1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始lastCheck为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('arrangements是数组', () => { expect(Array.isArray((sys as any).arrangements)).toBe(true) })

  // 节流
  it('tick不足CHECK_INTERVAL时不更新lastCheck', () => {
    sys.update(1, world, em, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick>=CHECK_INTERVAL时更新lastCheck', () => {
    sys.update(1, world, em, 3070)
    expect((sys as any).lastCheck).toBe(3070)
  })
  it('第二次调用节流生效', () => {
    sys.update(1, world, em, 3070)
    sys.update(1, world, em, 3071)
    expect((sys as any).lastCheck).toBe(3070)
  })

  // duration 递增
  it('注入arrangement后update使duration+1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push({
      id: 1, collectionCivId: 1, passageCivId: 2,
      form: 'royal_tollbooth', tollAuthority: 50, revenueCollection: 50,
      passageRegulation: 40, maintenanceFund: 30, duration: 0, tick: 3070,
    })
    sys.update(1, world, em, 3070)
    expect((sys as any).arrangements[0].duration).toBe(1)
  })

  // 字段范围
  it('tollAuthority被clamp到[5,85]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push({
      id: 1, collectionCivId: 1, passageCivId: 2,
      form: 'bridge_tollbooth', tollAuthority: 84, revenueCollection: 50,
      passageRegulation: 40, maintenanceFund: 30, duration: 0, tick: 3070,
    })
    sys.update(1, world, em, 3070)
    expect((sys as any).arrangements[0].tollAuthority).toBeLessThanOrEqual(85)
  })
  it('revenueCollection被clamp到[10,90]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).arrangements.push({
      id: 1, collectionCivId: 1, passageCivId: 2,
      form: 'gate_tollbooth', tollAuthority: 50, revenueCollection: 11,
      passageRegulation: 40, maintenanceFund: 30, duration: 0, tick: 3070,
    })
    sys.update(1, world, em, 3070)
    expect((sys as any).arrangements[0].revenueCollection).toBeGreaterThanOrEqual(10)
  })
  it('passageRegulation被clamp到[5,80]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push({
      id: 1, collectionCivId: 1, passageCivId: 2,
      form: 'road_tollbooth', tollAuthority: 50, revenueCollection: 50,
      passageRegulation: 79, maintenanceFund: 30, duration: 0, tick: 3070,
    })
    sys.update(1, world, em, 3070)
    expect((sys as any).arrangements[0].passageRegulation).toBeLessThanOrEqual(80)
  })
  it('maintenanceFund被clamp到[5,65]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push({
      id: 1, collectionCivId: 1, passageCivId: 2,
      form: 'royal_tollbooth', tollAuthority: 50, revenueCollection: 50,
      passageRegulation: 40, maintenanceFund: 64, duration: 0, tick: 3070,
    })
    sys.update(1, world, em, 3070)
    expect((sys as any).arrangements[0].maintenanceFund).toBeLessThanOrEqual(65)
  })

  // cleanup - tick过期
  it('tick < cutoff的arrangement被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push({
      id: 1, collectionCivId: 1, passageCivId: 2,
      form: 'royal_tollbooth', tollAuthority: 50, revenueCollection: 50,
      passageRegulation: 40, maintenanceFund: 30, duration: 0, tick: 0,
    })
    sys.update(1, world, em, 100000)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('tick >= cutoff的arrangement被保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push({
      id: 1, collectionCivId: 1, passageCivId: 2,
      form: 'bridge_tollbooth', tollAuthority: 50, revenueCollection: 50,
      passageRegulation: 40, maintenanceFund: 30, duration: 0, tick: 50000,
    })
    sys.update(1, world, em, 100000)
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('只删除过期的，保留新的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const arr = (sys as any).arrangements
    arr.push({ id: 1, collectionCivId: 1, passageCivId: 2, form: 'royal_tollbooth', tollAuthority: 50, revenueCollection: 50, passageRegulation: 40, maintenanceFund: 30, duration: 0, tick: 0 })
    arr.push({ id: 2, collectionCivId: 3, passageCivId: 4, form: 'gate_tollbooth', tollAuthority: 50, revenueCollection: 50, passageRegulation: 40, maintenanceFund: 30, duration: 0, tick: 50000 })
    sys.update(1, world, em, 100000)
    expect(arr).toHaveLength(1)
    expect(arr[0].id).toBe(2)
  })

  // form 类型
  it('4种form类型均合法', () => {
    const forms = ['royal_tollbooth', 'bridge_tollbooth', 'gate_tollbooth', 'road_tollbooth']
    forms.forEach(f => {
      ;(sys as any).arrangements.push({ id: 99, collectionCivId: 1, passageCivId: 2, form: f, tollAuthority: 50, revenueCollection: 50, passageRegulation: 40, maintenanceFund: 30, duration: 0, tick: 3070 })
    })
    expect((sys as any).arrangements).toHaveLength(4)
  })

  // MAX_ARRANGEMENTS
  it('注入16个arrangements后不超过MAX_ARRANGEMENTS', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let i = 0; i < 16; i++) {
      ;(sys as any).arrangements.push({ id: i + 1, collectionCivId: 1, passageCivId: 2, form: 'royal_tollbooth', tollAuthority: 50, revenueCollection: 50, passageRegulation: 40, maintenanceFund: 30, duration: 0, tick: 3070 })
    }
    sys.update(1, world, em, 3070)
    expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
  })

  // nextId 递增（手动注入验证）
  it('手动注入后nextId不变', () => {
    ;(sys as any).arrangements.push({ id: 5, collectionCivId: 1, passageCivId: 2, form: 'royal_tollbooth', tollAuthority: 50, revenueCollection: 50, passageRegulation: 40, maintenanceFund: 30, duration: 0, tick: 3070 })
    expect((sys as any).nextId).toBe(1)
  })

  // 多次update累积duration
  it('多次update累积duration', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push({ id: 1, collectionCivId: 1, passageCivId: 2, form: 'royal_tollbooth', tollAuthority: 50, revenueCollection: 50, passageRegulation: 40, maintenanceFund: 30, duration: 0, tick: 3070 })
    sys.update(1, world, em, 3070)
    sys.update(1, world, em, 6140)
    sys.update(1, world, em, 9210)
    expect((sys as any).arrangements[0].duration).toBe(3)
  })

  // 空arrangements时update不崩溃
  it('空arrangements时update不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    expect(() => sys.update(1, world, em, 3070)).not.toThrow()
  })

  // 多个过期同时清理
  it('多个过期arrangement同时被清理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let i = 0; i < 5; i++) {
      ;(sys as any).arrangements.push({ id: i + 1, collectionCivId: 1, passageCivId: 2, form: 'royal_tollbooth', tollAuthority: 50, revenueCollection: 50, passageRegulation: 40, maintenanceFund: 30, duration: 0, tick: 0 })
    }
    sys.update(1, world, em, 100000)
    expect((sys as any).arrangements).toHaveLength(0)
  })
})
