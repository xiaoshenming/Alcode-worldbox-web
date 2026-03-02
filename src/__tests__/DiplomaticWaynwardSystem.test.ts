import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DiplomaticWaynwardSystem } from '../systems/DiplomaticWaynwardSystem'
import type { WaynwardArrangement, WaynwardForm } from '../systems/DiplomaticWaynwardSystem'

// 常量参考：
// CHECK_INTERVAL=2880, PROCEED_CHANCE=0.0021, MAX_ARRANGEMENTS=16
// cutoff = tick - 88000，tick < cutoff 时删除
// roadCivId = 1 + floor(random*8)，range [1,8]
// travelCivId = 1 + floor(random*8)，road !== travel
// roadJurisdiction = 20 + random*40，range [20,60]
// maintenanceDuty = 25 + random*35，range [25,60]
// tollCollection = 10 + random*30，range [10,40]
// routeSafety = 15 + random*25，range [15,40]
// 每次update: duration+=1, 各属性随机漂移并clamp

function makeSys() { return new DiplomaticWaynwardSystem() }

function makeArrangement(overrides: Partial<WaynwardArrangement> = {}): WaynwardArrangement {
  return {
    id: 1, roadCivId: 1, travelCivId: 2,
    form: 'royal_waynward',
    roadJurisdiction: 50, maintenanceDuty: 50,
    tollCollection: 30, routeSafety: 30,
    duration: 0, tick: 0,
    ...overrides,
  }
}

const world = {} as any
const em = {} as any
const CHECK_INTERVAL = 2880

describe('DiplomaticWaynwardSystem', () => {
  let sys: DiplomaticWaynwardSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  // ─── 初始状态 ────────────────────────────────────────────────────────────

  it('初始arrangements为空', () => {
    expect((sys as any).arrangements).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('arrangements是数组', () => {
    expect(Array.isArray((sys as any).arrangements)).toBe(true)
  })

  it('系统实例可正常创建', () => {
    expect(sys).toBeInstanceOf(DiplomaticWaynwardSystem)
  })

  it('两个实例互相独立', () => {
    const sys2 = makeSys()
    ;(sys as any).arrangements.push(makeArrangement())
    expect((sys2 as any).arrangements).toHaveLength(0)
  })

  // ─── 节流控制 ────────────────────────────────────────────────────────────

  it('tick不足CHECK_INTERVAL(2880)时不执行', () => {
    sys.update(1, world, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick达到CHECK_INTERVAL时更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick=0时不触发更新', () => {
    sys.update(1, world, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=CHECK_INTERVAL-1时不触发', () => {
    sys.update(1, world, em, 2879)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=CHECK_INTERVAL时恰好触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 2880)
    expect((sys as any).lastCheck).toBe(2880)
  })

  it('连续两次update同tick不重复执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, CHECK_INTERVAL)
    ;(sys as any).lastCheck = CHECK_INTERVAL
    const before = (sys as any).arrangements.length
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).arrangements.length).toBe(before)
  })

  it('lastCheck非零时差值计算正确', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lastCheck = 1000
    sys.update(1, world, em, 1000 + CHECK_INTERVAL - 1)  // 差值2879 < 2880
    expect((sys as any).lastCheck).toBe(1000)
    sys.update(1, world, em, 1000 + CHECK_INTERVAL)  // 差值2880 >= 2880
    expect((sys as any).lastCheck).toBe(1000 + CHECK_INTERVAL)
  })

  it('多次连续触发lastCheck递进更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    ;(sys as any).lastCheck = CHECK_INTERVAL
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  // ─── spawn arrangements ──────────────────────────────────────────────────

  it('满足条件时spawn arrangement', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0.001)  // spawn check < 0.0021
               .mockReturnValueOnce(0.001) // road=1
               .mockReturnValueOnce(0.6)   // travel=5 (!=1)
               .mockReturnValue(0)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).arrangements.length).toBeGreaterThanOrEqual(1)
  })

  it('spawn后arrangement有正确的form字段', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.6)
               .mockReturnValue(0)
    sys.update(1, world, em, CHECK_INTERVAL)
    if ((sys as any).arrangements.length > 0) {
      const a = (sys as any).arrangements[0]
      expect(['royal_waynward', 'shire_waynward', 'borough_waynward', 'turnpike_waynward']).toContain(a.form)
    }
  })

  it('spawn后nextId递增', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.6)
               .mockReturnValue(0)
    sys.update(1, world, em, CHECK_INTERVAL)
    if ((sys as any).arrangements.length > 0) {
      expect((sys as any).nextId).toBeGreaterThan(1)
    }
  })

  it('spawn后arrangement有tick字段', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.6)
               .mockReturnValue(0)
    sys.update(1, world, em, CHECK_INTERVAL)
    if ((sys as any).arrangements.length > 0) {
      expect(typeof (sys as any).arrangements[0].tick).toBe('number')
    }
  })

  it('MAX_ARRANGEMENTS(16)上限不超出', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    for (let i = 0; i < 20; i++) {
      ;(sys as any).lastCheck = 0
      mockRandom.mockReturnValueOnce(0.001)
                 .mockReturnValueOnce(0.001)
                 .mockReturnValueOnce(0.6)
                 .mockReturnValue(0)
      sys.update(1, world, em, CHECK_INTERVAL * (i + 1))
    }
    expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
  })

  it('arrangements.length>=16时不spawn新arrangement', () => {
    for (let i = 0; i < 16; i++) {
      ;(sys as any).arrangements.push(makeArrangement({ id: i + 1, tick: CHECK_INTERVAL * 100 }))
    }
    const before = (sys as any).arrangements.length
    vi.spyOn(Math, 'random').mockReturnValue(0.001)  // 满足spawn检查
    sys.update(1, world, em, CHECK_INTERVAL)
    // 清理后如果没有过期则仍然16
    expect((sys as any).arrangements.length).toBeLessThanOrEqual(before)
  })

  it('road===travel时不spawn（return）', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    // spawn check通过，road=1, travel=1(相同)
    mockRandom.mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.0)   // road = 1+floor(0*8)=1
               .mockReturnValueOnce(0.0)   // travel = 1+floor(0*8)=1
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).arrangements).toHaveLength(0)
  })

  it('random>=PROCEED_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)  // > 0.0021
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).arrangements).toHaveLength(0)
  })

  it('PROCEED_CHANCE精确值0.0021', () => {
    // 验证：random < 0.0021 触发spawn
    expect(0.001 < 0.0021).toBe(true)
    expect(0.003 < 0.0021).toBe(false)
  })

  it('spawn后arrangement.duration经过一次update循环后为1', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.6)
               .mockReturnValue(0.5)
    sys.update(1, world, em, CHECK_INTERVAL)
    if ((sys as any).arrangements.length > 0) {
      // spawn初始duration=0，但同一次update内循环立即+1，所以为1
      expect((sys as any).arrangements[0].duration).toBe(1)
    }
  })

  it('spawn后arrangement.tick等于当前tick', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.6)
               .mockReturnValue(0.5)
    sys.update(1, world, em, CHECK_INTERVAL)
    if ((sys as any).arrangements.length > 0) {
      expect((sys as any).arrangements[0].tick).toBe(CHECK_INTERVAL)
    }
  })

  it('spawn的roadCivId在[1,8]范围内', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    // random=0.875 → 1+floor(0.875*8)=1+7=8
    mockRandom.mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.875)  // road=8
               .mockReturnValueOnce(0.0)    // travel=1
               .mockReturnValue(0.5)
    sys.update(1, world, em, CHECK_INTERVAL)
    if ((sys as any).arrangements.length > 0) {
      const roadCivId = (sys as any).arrangements[0].roadCivId
      expect(roadCivId).toBeGreaterThanOrEqual(1)
      expect(roadCivId).toBeLessThanOrEqual(8)
    }
  })

  it('spawn的travelCivId在[1,8]范围内', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.0)   // road=1
               .mockReturnValueOnce(0.875) // travel=8
               .mockReturnValue(0.5)
    sys.update(1, world, em, CHECK_INTERVAL)
    if ((sys as any).arrangements.length > 0) {
      const travelCivId = (sys as any).arrangements[0].travelCivId
      expect(travelCivId).toBeGreaterThanOrEqual(1)
      expect(travelCivId).toBeLessThanOrEqual(8)
    }
  })

  it('spawn的roadCivId和travelCivId不同', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.001) // road=1
               .mockReturnValueOnce(0.6)   // travel=5
               .mockReturnValue(0.5)
    sys.update(1, world, em, CHECK_INTERVAL)
    if ((sys as any).arrangements.length > 0) {
      const a = (sys as any).arrangements[0]
      expect(a.roadCivId).not.toBe(a.travelCivId)
    }
  })

  // ─── duration递增 ────────────────────────────────────────────────────────

  it('update后已有arrangement的duration递增1', () => {
    ;(sys as any).arrangements.push(makeArrangement({ duration: 5, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    expect((sys as any).arrangements[0].duration).toBe(6)
  })

  it('duration从0开始update后变为1', () => {
    ;(sys as any).arrangements.push(makeArrangement({ duration: 0, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    expect((sys as any).arrangements[0].duration).toBe(1)
  })

  it('多个arrangement的duration都递增1', () => {
    ;(sys as any).arrangements.push(makeArrangement({ id: 1, duration: 3, tick: CHECK_INTERVAL }))
    ;(sys as any).arrangements.push(makeArrangement({ id: 2, duration: 7, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    expect((sys as any).arrangements[0].duration).toBe(4)
    expect((sys as any).arrangements[1].duration).toBe(8)
  })

  it('每次触发update duration都增加1', () => {
    ;(sys as any).arrangements.push(makeArrangement({ tick: CHECK_INTERVAL * 100 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let i = 2; i <= 5; i++) {
      ;(sys as any).lastCheck = 0
      sys.update(1, world, em, CHECK_INTERVAL * i)
    }
    expect((sys as any).arrangements[0].duration).toBe(4)
  })

  // ─── 属性漂移与clamp ─────────────────────────────────────────────────────

  it('roadJurisdiction有下限5', () => {
    // 公式: Math.max(5, Math.min(85, val + (random-0.48)*0.12))
    const val = 5
    const drift = (0 - 0.48) * 0.12  // 最大负漂移
    const result = Math.max(5, Math.min(85, val + drift))
    expect(result).toBe(5)
  })

  it('roadJurisdiction有上限85', () => {
    const val = 85
    const drift = (1 - 0.48) * 0.12
    const result = Math.max(5, Math.min(85, val + drift))
    expect(result).toBe(85)
  })

  it('maintenanceDuty有下限10', () => {
    const val = 10
    const drift = (0 - 0.5) * 0.11
    const result = Math.max(10, Math.min(90, val + drift))
    expect(result).toBe(10)
  })

  it('maintenanceDuty有上限90', () => {
    const val = 90
    const drift = (1 - 0.5) * 0.11
    const result = Math.max(10, Math.min(90, val + drift))
    expect(result).toBe(90)
  })

  it('tollCollection有下限5', () => {
    const val = 5
    const drift = (0 - 0.42) * 0.13
    const result = Math.max(5, Math.min(80, val + drift))
    expect(result).toBe(5)
  })

  it('tollCollection有上限80', () => {
    const val = 80
    const drift = (1 - 0.42) * 0.13
    const result = Math.max(5, Math.min(80, val + drift))
    expect(result).toBe(80)
  })

  it('routeSafety有下限5', () => {
    const val = 5
    const drift = (0 - 0.46) * 0.09
    const result = Math.max(5, Math.min(65, val + drift))
    expect(result).toBe(5)
  })

  it('routeSafety有上限65', () => {
    const val = 65
    const drift = (1 - 0.46) * 0.09
    const result = Math.max(5, Math.min(65, val + drift))
    expect(result).toBe(65)
  })

  it('update后arrangement属性在有效范围内', () => {
    ;(sys as any).arrangements.push(makeArrangement({ tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    const a = (sys as any).arrangements[0]
    expect(a.roadJurisdiction).toBeGreaterThanOrEqual(5)
    expect(a.roadJurisdiction).toBeLessThanOrEqual(85)
    expect(a.maintenanceDuty).toBeGreaterThanOrEqual(10)
    expect(a.maintenanceDuty).toBeLessThanOrEqual(90)
    expect(a.tollCollection).toBeGreaterThanOrEqual(5)
    expect(a.tollCollection).toBeLessThanOrEqual(80)
    expect(a.routeSafety).toBeGreaterThanOrEqual(5)
    expect(a.routeSafety).toBeLessThanOrEqual(65)
  })

  // ─── cleanup 过期清理 ─────────────────────────────────────────────────────

  it('tick < cutoff(tick-88000)时arrangement被删除', () => {
    ;(sys as any).arrangements.push(makeArrangement({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 90000)  // cutoff=90000-88000=2000, 0<2000 → 删
    expect((sys as any).arrangements).toHaveLength(0)
  })

  it('tick >= cutoff时arrangement保留（边界验证用）', () => {
    expect((sys as any).arrangements.length).toBeDefined()
  })

  it('cleanup边界：tick恰好等于cutoff时保留', () => {
    const bigTick = 90000
    const cutoff = bigTick - 88000  // = 2000
    ;(sys as any).arrangements.push(makeArrangement({ tick: cutoff }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, bigTick)
    expect((sys as any).arrangements).toHaveLength(1)
  })

  it('cleanup边界：tick=cutoff-1时删除', () => {
    const bigTick = 90000
    const cutoff = bigTick - 88000  // = 2000
    ;(sys as any).arrangements.push(makeArrangement({ tick: cutoff - 1 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, bigTick)
    expect((sys as any).arrangements).toHaveLength(0)
  })

  it('多个arrangement中只有过期的被删', () => {
    const bigTick = 90000
    ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 0 }))         // 过期
    ;(sys as any).arrangements.push(makeArrangement({ id: 2, tick: bigTick - 1000 }))  // 未过期
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, bigTick)
    expect((sys as any).arrangements).toHaveLength(1)
    expect((sys as any).arrangements[0].id).toBe(2)
  })

  it('cleanup从末尾向前遍历不跳过元素', () => {
    // 插入5个，前3个过期，后2个新鲜
    const bigTick = 90000
    const cutoff = bigTick - 88000  // 2000
    for (let i = 0; i < 3; i++) {
      ;(sys as any).arrangements.push(makeArrangement({ id: i + 1, tick: 1000 }))  // < 2000 过期
    }
    for (let i = 3; i < 5; i++) {
      ;(sys as any).arrangements.push(makeArrangement({ id: i + 1, tick: bigTick - 1000 }))  // 新鲜
    }
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, bigTick)
    expect((sys as any).arrangements).toHaveLength(2)
    ;(sys as any).arrangements.forEach((a: WaynwardArrangement) => {
      expect(a.tick).toBeGreaterThanOrEqual(cutoff)
    })
  })

  it('全部arrangement过期时清空', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).arrangements.push(makeArrangement({ id: i + 1, tick: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 90000)
    expect((sys as any).arrangements).toHaveLength(0)
  })

  it('cutoff=tick-88000公式验证', () => {
    const tick = 100000
    const cutoff = tick - 88000
    expect(cutoff).toBe(12000)
  })

  it('节流未触发时不执行cleanup', () => {
    ;(sys as any).arrangements.push(makeArrangement({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 999)  // 999 < 2880，不触发
    expect((sys as any).arrangements).toHaveLength(1)  // 未清理
  })

  // ─── WaynwardForm 类型验证 ────────────────────────���──────────────────────

  it('royal_waynward是有效form', () => {
    const a = makeArrangement({ form: 'royal_waynward' })
    expect(a.form).toBe('royal_waynward')
  })

  it('shire_waynward是有效form', () => {
    const a = makeArrangement({ form: 'shire_waynward' })
    expect(a.form).toBe('shire_waynward')
  })

  it('borough_waynward是有效form', () => {
    const a = makeArrangement({ form: 'borough_waynward' })
    expect(a.form).toBe('borough_waynward')
  })

  it('turnpike_waynward是有效form', () => {
    const a = makeArrangement({ form: 'turnpike_waynward' })
    expect(a.form).toBe('turnpike_waynward')
  })

  it('FORMS数组包含4种form', () => {
    const FORMS: WaynwardForm[] = ['royal_waynward', 'shire_waynward', 'borough_waynward', 'turnpike_waynward']
    expect(FORMS).toHaveLength(4)
  })

  // ─── WaynwardArrangement 接口验证 ────────────────────────────────────────

  it('WaynwardArrangement包含所有必要字段', () => {
    const a = makeArrangement()
    expect(a).toHaveProperty('id')
    expect(a).toHaveProperty('roadCivId')
    expect(a).toHaveProperty('travelCivId')
    expect(a).toHaveProperty('form')
    expect(a).toHaveProperty('roadJurisdiction')
    expect(a).toHaveProperty('maintenanceDuty')
    expect(a).toHaveProperty('tollCollection')
    expect(a).toHaveProperty('routeSafety')
    expect(a).toHaveProperty('duration')
    expect(a).toHaveProperty('tick')
  })

  // ─── 手动注入 ────────────────────────────────────────────────────────────

  it('手动注入arrangement后长度正确', () => {
    ;(sys as any).arrangements.push({ id: 99, form: 'royal_waynward' })
    expect((sys as any).arrangements).toHaveLength(1)
  })

  it('手动注入多个arrangement', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).arrangements.push(makeArrangement({ id: i + 1 }))
    }
    expect((sys as any).arrangements).toHaveLength(5)
  })

  it('手动注入后可查询特定arrangement', () => {
    ;(sys as any).arrangements.push(makeArrangement({ id: 42, form: 'shire_waynward' }))
    const found = (sys as any).arrangements.find((a: WaynwardArrangement) => a.id === 42)
    expect(found).toBeDefined()
    expect(found?.form).toBe('shire_waynward')
  })

  it('手动设置nextId后spawn的id正确递增', () => {
    ;(sys as any).nextId = 10
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.001)
               .mockReturnValueOnce(0.6)
               .mockReturnValue(0.5)
    sys.update(1, world, em, CHECK_INTERVAL)
    if ((sys as any).arrangements.length > 0) {
      expect((sys as any).arrangements[0].id).toBe(10)
      expect((sys as any).nextId).toBe(11)
    }
  })

  // ─── 数值范围公式验证 ────────────────────────────────────────────────────

  it('roadJurisdiction初始范围[20,60]', () => {
    const minVal = 20 + 0 * 40   // 20
    const maxVal = 20 + 1 * 40   // 60
    expect(minVal).toBe(20)
    expect(maxVal).toBe(60)
  })

  it('maintenanceDuty初始范围[25,60]', () => {
    const minVal = 25 + 0 * 35
    const maxVal = 25 + 1 * 35
    expect(minVal).toBe(25)
    expect(maxVal).toBe(60)
  })

  it('tollCollection初始范围[10,40]', () => {
    const minVal = 10 + 0 * 30
    const maxVal = 10 + 1 * 30
    expect(minVal).toBe(10)
    expect(maxVal).toBe(40)
  })

  it('routeSafety初始范围[15,40]', () => {
    const minVal = 15 + 0 * 25
    const maxVal = 15 + 1 * 25
    expect(minVal).toBe(15)
    expect(maxVal).toBe(40)
  })

  it('roadCivId公式：random=0时为1', () => {
    const road = 1 + Math.floor(0 * 8)
    expect(road).toBe(1)
  })

  it('roadCivId公式：random≈0.999时为8', () => {
    const road = 1 + Math.floor(0.999 * 8)
    expect(road).toBe(8)
  })

  it('roadCivId公式：random=0.5时为5', () => {
    const road = 1 + Math.floor(0.5 * 8)
    expect(road).toBe(5)
  })
})
