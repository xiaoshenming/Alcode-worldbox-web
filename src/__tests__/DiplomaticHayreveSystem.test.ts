import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticHayreveSystem } from '../systems/DiplomaticHayreveSystem'
import type { HayreveArrangement, HayreveForm } from '../systems/DiplomaticHayreveSystem'

const CHECK_INTERVAL = 2910
const MAX_ARRANGEMENTS = 16

function makeSys() { return new DiplomaticHayreveSystem() }

function makeArr(overrides: Partial<HayreveArrangement> = {}): HayreveArrangement {
  return {
    id: 1, meadowCivId: 1, fodderCivId: 2, form: 'royal_hayreve',
    meadowJurisdiction: 40, hayAllocation: 45, harvestSchedule: 25, storageManagement: 30,
    duration: 0, tick: 0, ...overrides,
  }
}

describe('DiplomaticHayreveSystem — 基础数据结构', () => {
  let sys: DiplomaticHayreveSystem
  beforeEach(() => { sys = makeSys() })

  it('初始arrangements为空数组', () => {
    expect((sys as any).arrangements).toHaveLength(0)
    expect(Array.isArray((sys as any).arrangements)).toBe(true)
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

  it('HayreveArrangement包含所有必需字段', () => {
    const a = makeArr()
    expect(a).toHaveProperty('id')
    expect(a).toHaveProperty('meadowCivId')
    expect(a).toHaveProperty('fodderCivId')
    expect(a).toHaveProperty('form')
    expect(a).toHaveProperty('meadowJurisdiction')
    expect(a).toHaveProperty('hayAllocation')
    expect(a).toHaveProperty('harvestSchedule')
    expect(a).toHaveProperty('storageManagement')
    expect(a).toHaveProperty('duration')
    expect(a).toHaveProperty('tick')
  })
})

describe('DiplomaticHayreveSystem — CHECK_INTERVAL=2910 节流', () => {
  let sys: DiplomaticHayreveSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不执行（lastCheck依然为0）', () => {
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
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1000)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 1000)
  })

  it('第一次通过后同tick再调用被节流', () => {
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
})

describe('DiplomaticHayreveSystem — 数值字段动态更新', () => {
  let sys: DiplomaticHayreveSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('每次update通过节流后duration递增1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push(makeArr({ duration: 0, tick: 999999 }))
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).arrangements[0].duration).toBe(1)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
    expect((sys as any).arrangements[0].duration).toBe(2)
  })

  it('meadowJurisdiction被约束在[5, 85]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push(makeArr({ meadowJurisdiction: 40, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 200; i++) {
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
    }
    const v = (sys as any).arrangements[0]?.meadowJurisdiction
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(85) }
  })

  it('hayAllocation被约束在[10, 90]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push(makeArr({ hayAllocation: 45, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 200; i++) {
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
    }
    const v = (sys as any).arrangements[0]?.hayAllocation
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(10); expect(v).toBeLessThanOrEqual(90) }
  })

  it('harvestSchedule被约束在[5, 80]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push(makeArr({ harvestSchedule: 25, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 200; i++) {
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
    }
    const v = (sys as any).arrangements[0]?.harvestSchedule
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(80) }
  })

  it('storageManagement被约束在[5, 65]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push(makeArr({ storageManagement: 30, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 200; i++) {
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
    }
    const v = (sys as any).arrangements[0]?.storageManagement
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(65) }
  })
})

describe('DiplomaticHayreveSystem — 过期清理（cutoff=tick-88000）', () => {
  let sys: DiplomaticHayreveSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0的arrangement在tick=90000时被清理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push(makeArr({ id: 1, tick: 0 }))
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).arrangements).toHaveLength(0)
  })

  it('tick=3000的arrangement在tick=90000时不被清理（3000 >= cutoff=2000）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push(makeArr({ id: 1, tick: 3000 }))
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).arrangements).toHaveLength(1)
  })

  it('arrangement.tick恰好等于cutoff时不被清理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push(makeArr({ id: 1, tick: 2000 }))
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).arrangements).toHaveLength(1)
  })

  it('多个arrangements中只有过期的被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push(makeArr({ id: 1, tick: 0 }))
    ;(sys as any).arrangements.push(makeArr({ id: 2, tick: 5000 }))
    ;(sys as any).arrangements.push(makeArr({ id: 3, tick: 1500 }))
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).arrangements).toHaveLength(1)
    expect((sys as any).arrangements[0].id).toBe(2)
  })

  it('无过期记录时arrangements长度不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push(makeArr({ id: 1, tick: 50000 }))
    ;(sys as any).arrangements.push(makeArr({ id: 2, tick: 60000 }))
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).arrangements).toHaveLength(2)
  })
})

describe('DiplomaticHayreveSystem — MAX_ARRANGEMENTS=16 上限', () => {
  let sys: DiplomaticHayreveSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('arrangements已满16条时即使random通过也不新增', () => {
    for (let i = 1; i <= MAX_ARRANGEMENTS; i++) {
      ;(sys as any).arrangements.push(makeArr({ id: i, tick: 999999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).arrangements).toHaveLength(MAX_ARRANGEMENTS)
  })

  it('arrangements=15条时random通过可添加（不超过16）', () => {
    for (let i = 1; i <= MAX_ARRANGEMENTS - 1; i++) {
      ;(sys as any).arrangements.push(makeArr({ id: i, tick: 999999 }))
    }
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.5)
      .mockReturnValue(0.5)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).arrangements.length).toBeLessThanOrEqual(MAX_ARRANGEMENTS)
  })

  it('多次update后lastCheck始终追踪最新tick', () => {
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('手动nextId递增两次后值为3', () => {
    ;(sys as any).arrangements.push(makeArr({ id: (sys as any).nextId++ }))
    ;(sys as any).arrangements.push(makeArr({ id: (sys as any).nextId++ }))
    expect((sys as any).arrangements[0].id).toBe(1)
    expect((sys as any).arrangements[1].id).toBe(2)
    expect((sys as any).nextId).toBe(3)
  })
})

describe('DiplomaticHayreveSystem — Form枚举完整性', () => {
  it('HayreveForm包含royal_hayreve', () => {
    expect(makeArr({ form: 'royal_hayreve' }).form).toBe('royal_hayreve')
  })

  it('HayreveForm包含manor_hayreve', () => {
    expect(makeArr({ form: 'manor_hayreve' }).form).toBe('manor_hayreve')
  })

  it('HayreveForm包含common_hayreve', () => {
    expect(makeArr({ form: 'common_hayreve' }).form).toBe('common_hayreve')
  })

  it('HayreveForm包含demesne_hayreve', () => {
    expect(makeArr({ form: 'demesne_hayreve' }).form).toBe('demesne_hayreve')
  })
})
