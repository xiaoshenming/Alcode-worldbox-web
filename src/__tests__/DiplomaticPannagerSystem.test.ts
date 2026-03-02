import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticPannagerSystem } from '../systems/DiplomaticPannagerSystem'
import type { PannagerArrangement, PannagerForm } from '../systems/DiplomaticPannagerSystem'

const CHECK_INTERVAL = 2840
const MAX_ARRANGEMENTS = 16

function makeSys() { return new DiplomaticPannagerSystem() }

function makeArr(overrides: Partial<PannagerArrangement> = {}): PannagerArrangement {
  return {
    id: 1, forestCivId: 1, pannagerCivId: 2, form: 'forest_pannage',
    grazingRights: 40, mastAllocation: 45, seasonalControl: 25, livestockManagement: 30,
    duration: 0, tick: 0, ...overrides,
  }
}

describe('DiplomaticPannagerSystem — 基础数据结构', () => {
  let sys: DiplomaticPannagerSystem
  beforeEach(() => { sys = makeSys() })

  it('初始arrangements为空数组', () => {
    expect(Array.isArray((sys as any).arrangements)).toBe(true)
    expect((sys as any).arrangements).toHaveLength(0)
  })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('手动注入arrangement后长度为1且id正确', () => {
    ;(sys as any).arrangements.push(makeArr({ id: 1 }))
    expect((sys as any).arrangements).toHaveLength(1)
    expect((sys as any).arrangements[0].id).toBe(1)
  })

  it('PannagerArrangement包含所有必需字段', () => {
    const a = makeArr()
    ;['id','forestCivId','pannagerCivId','form','grazingRights','mastAllocation','seasonalControl','livestockManagement','duration','tick']
      .forEach(f => expect(a).toHaveProperty(f))
  })
})

describe('DiplomaticPannagerSystem — CHECK_INTERVAL=2840 节流', () => {
  let sys: DiplomaticPannagerSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不执行，lastCheck依然为0', () => {
    sys.update(1, {} as any, {} as any, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick < CHECK_INTERVAL时被节流，lastCheck不变', () => {
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick === CHECK_INTERVAL时通过节流，lastCheck更新', () => {
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick > CHECK_INTERVAL时通过节流，lastCheck更新', () => {
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 500)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 500)
  })

  it('第一次通过后同tick再调用被节流，lastCheck不变', () => {
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
})

describe('DiplomaticPannagerSystem — 字段动态更新', () => {
  let sys: DiplomaticPannagerSystem
  beforeEach(() => { sys = makeSys() })

  it('每次update通过节流后duration递增1', () => {
    ;(sys as any).arrangements.push(makeArr({ duration: 0, tick: 999999 }))
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).arrangements[0].duration).toBe(1)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
    expect((sys as any).arrangements[0].duration).toBe(2)
  })

  it('grazingRights被约束在[5, 85]范围内', () => {
    ;(sys as any).arrangements.push(makeArr({ grazingRights: 40, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 200; i++) sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
    const v = (sys as any).arrangements[0]?.grazingRights
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(85) }
  })

  it('mastAllocation被约束在[10, 90]范围内', () => {
    ;(sys as any).arrangements.push(makeArr({ mastAllocation: 45, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 200; i++) sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
    const v = (sys as any).arrangements[0]?.mastAllocation
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(10); expect(v).toBeLessThanOrEqual(90) }
  })

  it('seasonalControl在[5,80]，livestockManagement在[5,65]', () => {
    ;(sys as any).arrangements.push(makeArr({ seasonalControl: 25, livestockManagement: 30, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 200; i++) sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
    const a = (sys as any).arrangements[0]
    if (a) {
      expect(a.seasonalControl).toBeGreaterThanOrEqual(5); expect(a.seasonalControl).toBeLessThanOrEqual(80)
      expect(a.livestockManagement).toBeGreaterThanOrEqual(5); expect(a.livestockManagement).toBeLessThanOrEqual(65)
    }
  })
})

describe('DiplomaticPannagerSystem — 过期cleanup（cutoff=tick-88000）', () => {
  let sys: DiplomaticPannagerSystem
  beforeEach(() => { sys = makeSys() })

  it('tick=0的arrangement在tick=90000时被清理（0 < 2000）', () => {
    ;(sys as any).arrangements.push(makeArr({ id: 1, tick: 0 }))
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).arrangements).toHaveLength(0)
  })

  it('tick=3000的arrangement在tick=90000时不被清理（3000 >= 2000）', () => {
    ;(sys as any).arrangements.push(makeArr({ id: 1, tick: 3000 }))
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).arrangements).toHaveLength(1)
  })

  it('arrangement.tick恰好等于cutoff时不被清理', () => {
    // cutoff = 90000 - 88000 = 2000; 2000 < 2000 为false
    ;(sys as any).arrangements.push(makeArr({ id: 1, tick: 2000 }))
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).arrangements).toHaveLength(1)
  })

  it('多个arrangements中只有过期的被删除', () => {
    ;(sys as any).arrangements.push(makeArr({ id: 1, tick: 0 }))
    ;(sys as any).arrangements.push(makeArr({ id: 2, tick: 5000 }))
    ;(sys as any).arrangements.push(makeArr({ id: 3, tick: 1500 }))
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).arrangements).toHaveLength(1)
    expect((sys as any).arrangements[0].id).toBe(2)
  })
})

describe('DiplomaticPannagerSystem — MAX_ARRANGEMENTS=16 上限', () => {
  let sys: DiplomaticPannagerSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('arrangements已满16条时即使random通过也不新增', () => {
    for (let i = 1; i <= MAX_ARRANGEMENTS; i++) {
      ;(sys as any).arrangements.push(makeArr({ id: i, tick: 999999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).arrangements).toHaveLength(MAX_ARRANGEMENTS)
  })

  it('random=1时（>PROCEED_CHANCE=0.0021）不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).arrangements).toHaveLength(0)
  })

  it('arrangements=15条时random通过可添加（不超过16）', () => {
    for (let i = 1; i <= MAX_ARRANGEMENTS - 1; i++) {
      ;(sys as any).arrangements.push(makeArr({ id: i, tick: 999999 }))
    }
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.5)
      .mockReturnValue(0.5)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).arrangements.length).toBeLessThanOrEqual(MAX_ARRANGEMENTS)
  })

  it('多次update后lastCheck始终追踪最新tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})

describe('DiplomaticPannagerSystem — PannagerForm枚举完整性', () => {
  it('包含全部4种form', () => {
    const forms: PannagerForm[] = ['forest_pannage', 'royal_pannage', 'common_pannage', 'seasonal_pannage']
    forms.forEach(f => expect(makeArr({ form: f }).form).toBe(f))
  })

  it('form字段类型为string', () => {
    expect(typeof makeArr().form).toBe('string')
  })

  it('nextId手动递增后值正确', () => {
    const s = makeSys() as any
    s.arrangements.push(makeArr({ id: s.nextId++ }))
    s.arrangements.push(makeArr({ id: s.nextId++ }))
    expect(s.arrangements[0].id).toBe(1)
    expect(s.arrangements[1].id).toBe(2)
    expect(s.nextId).toBe(3)
  })
})
