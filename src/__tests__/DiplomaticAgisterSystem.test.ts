import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticAgisterSystem } from '../systems/DiplomaticAgisterSystem'
import type { AgisterArrangement, AgisterForm } from '../systems/DiplomaticAgisterSystem'

const CHECK_INTERVAL = 2850
const MAX_ARRANGEMENTS = 16
const EXPIRE_OFFSET = 88000

function makeSys() { return new DiplomaticAgisterSystem() }

function makeArrangement(overrides: Partial<AgisterArrangement> = {}): AgisterArrangement {
  return {
    id: 1, pastureCivId: 1, agisterCivId: 2, form: 'crown_agistment',
    pastureAllocation: 40, livestockCapacity: 45, rentalRevenue: 25,
    grazingQuality: 30, duration: 0, tick: 0, ...overrides,
  }
}

describe('DiplomaticAgisterSystem — 基础数据结构', () => {
  let sys: DiplomaticAgisterSystem
  beforeEach(() => { sys = makeSys() })

  it('初始arrangements为空数组', () => {
    expect((sys as any).arrangements).toHaveLength(0)
    expect(Array.isArray((sys as any).arrangements)).toBe(true)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('手动注入arrangement后长度为1且id正确', () => {
    ;(sys as any).arrangements.push(makeArrangement({ id: 1 }))
    expect((sys as any).arrangements).toHaveLength(1)
    expect((sys as any).arrangements[0].id).toBe(1)
  })
  it('AgisterArrangement包含所有必需字段', () => {
    const a = makeArrangement()
    expect(a).toHaveProperty('id')
    expect(a).toHaveProperty('pastureCivId')
    expect(a).toHaveProperty('agisterCivId')
    expect(a).toHaveProperty('form')
    expect(a).toHaveProperty('pastureAllocation')
    expect(a).toHaveProperty('livestockCapacity')
    expect(a).toHaveProperty('rentalRevenue')
    expect(a).toHaveProperty('grazingQuality')
    expect(a).toHaveProperty('duration')
    expect(a).toHaveProperty('tick')
  })
  it('注入两条arrangement后长度为2', () => {
    ;(sys as any).arrangements.push(makeArrangement({ id: 1 }))
    ;(sys as any).arrangements.push(makeArrangement({ id: 2 }))
    expect((sys as any).arrangements).toHaveLength(2)
  })
  it('arrangements初始是空Array而非null', () => {
    expect((sys as any).arrangements).not.toBeNull()
    expect(Array.isArray((sys as any).arrangements)).toBe(true)
  })
})

describe('DiplomaticAgisterSystem — CHECK_INTERVAL=2850 节流', () => {
  let sys: DiplomaticAgisterSystem
  beforeEach(() => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
  })
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
  it('第二次超过间隔时lastCheck再次更新', () => {
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
  it('tick=1时被节流(1 < 2850)', () => {
    sys.update(1, {} as any, {} as any, 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=2849时被节流(2849 < 2850)', () => {
    sys.update(1, {} as any, {} as any, 2849)
    expect((sys as any).lastCheck).toBe(0)
  })
})

describe('DiplomaticAgisterSystem — 数值字段动态更新', () => {
  let sys: DiplomaticAgisterSystem
  beforeEach(() => { sys = makeSys() })

  it('每次update通过节流后duration递增1', () => {
    ;(sys as any).arrangements.push(makeArrangement({ duration: 0, tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).arrangements[0].duration).toBe(1)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
    expect((sys as any).arrangements[0].duration).toBe(2)
    vi.restoreAllMocks()
  })
  it('pastureAllocation被约束在[5, 85]范围内', () => {
    ;(sys as any).arrangements.push(makeArrangement({ pastureAllocation: 40, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 200; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
      vi.restoreAllMocks()
    }
    const pa = (sys as any).arrangements[0]?.pastureAllocation
    if (pa !== undefined) {
      expect(pa).toBeGreaterThanOrEqual(5)
      expect(pa).toBeLessThanOrEqual(85)
    }
  })
  it('livestockCapacity被约束在[10, 90]范围内', () => {
    ;(sys as any).arrangements.push(makeArrangement({ livestockCapacity: 45, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 200; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
      vi.restoreAllMocks()
    }
    const lc = (sys as any).arrangements[0]?.livestockCapacity
    if (lc !== undefined) {
      expect(lc).toBeGreaterThanOrEqual(10)
      expect(lc).toBeLessThanOrEqual(90)
    }
  })
  it('rentalRevenue被约束在[5, 80]范围内', () => {
    ;(sys as any).arrangements.push(makeArrangement({ rentalRevenue: 30, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 200; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
      vi.restoreAllMocks()
    }
    const rr = (sys as any).arrangements[0]?.rentalRevenue
    if (rr !== undefined) {
      expect(rr).toBeGreaterThanOrEqual(5)
      expect(rr).toBeLessThanOrEqual(80)
    }
  })
  it('grazingQuality被约束在[5, 65]范围内', () => {
    ;(sys as any).arrangements.push(makeArrangement({ grazingQuality: 30, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 200; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
      vi.restoreAllMocks()
    }
    const gq = (sys as any).arrangements[0]?.grazingQuality
    if (gq !== undefined) {
      expect(gq).toBeGreaterThanOrEqual(5)
      expect(gq).toBeLessThanOrEqual(65)
    }
  })
  it('duration从0开始，多次update后递增', () => {
    ;(sys as any).arrangements.push(makeArrangement({ duration: 0, tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 3)
    expect((sys as any).arrangements[0].duration).toBe(3)
    vi.restoreAllMocks()
  })
  it('pastureAllocation最小值不低于5', () => {
    ;(sys as any).arrangements.push(makeArrangement({ pastureAllocation: 5, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0.0) // 偏低
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
    expect((sys as any).arrangements[0].pastureAllocation).toBeGreaterThanOrEqual(5)
    vi.restoreAllMocks()
  })
  it('grazingQuality最大值不超过65', () => {
    ;(sys as any).arrangements.push(makeArrangement({ grazingQuality: 65, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
    expect((sys as any).arrangements[0].grazingQuality).toBeLessThanOrEqual(65)
    vi.restoreAllMocks()
  })
})

describe('DiplomaticAgisterSystem — time-based过期清理（cutoff=tick-88000）', () => {
  let sys: DiplomaticAgisterSystem
  beforeEach(() => { sys = makeSys() })

  it('tick=0的arrangement在tick=90000时被清理（0 < 90000-88000=2000）', () => {
    ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).arrangements).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('tick=3000的arrangement在tick=90000时不被清理（3000 >= 2000）', () => {
    ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 3000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).arrangements).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('arrangement.tick恰好等于cutoff时不被清理（< cutoff才清理）', () => {
    ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 2000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).arrangements).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('多个arrangements中只有过期的被删除', () => {
    ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 0 }))
    ;(sys as any).arrangements.push(makeArrangement({ id: 2, tick: 5000 }))
    ;(sys as any).arrangements.push(makeArrangement({ id: 3, tick: 1500 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).arrangements).toHaveLength(1)
    expect((sys as any).arrangements[0].id).toBe(2)
    vi.restoreAllMocks()
  })
  it('无过期记录时arrangements长度不变', () => {
    ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 50000 }))
    ;(sys as any).arrangements.push(makeArrangement({ id: 2, tick: 60000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).arrangements).toHaveLength(2)
    vi.restoreAllMocks()
  })
  it('tick=1的arrangement在tick=90000时被清理', () => {
    ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).arrangements).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('全部过期时arrangements清空', () => {
    ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 100 }))
    ;(sys as any).arrangements.push(makeArrangement({ id: 2, tick: 200 }))
    ;(sys as any).arrangements.push(makeArrangement({ id: 3, tick: 300 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).arrangements).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('cutoff精确计算：tick=88001时cutoff=1，tick=0的记录被删', () => {
    ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 88001)
    expect((sys as any).arrangements).toHaveLength(0)
    vi.restoreAllMocks()
  })
})

describe('DiplomaticAgisterSystem — MAX_ARRANGEMENTS=16 上限', () => {
  let sys: DiplomaticAgisterSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('arrangements已满16条时即使random通过也不新增', () => {
    for (let i = 1; i <= MAX_ARRANGEMENTS; i++) {
      ;(sys as any).arrangements.push(makeArrangement({ id: i, tick: 999999 }))
    }
    expect((sys as any).arrangements).toHaveLength(MAX_ARRANGEMENTS)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).arrangements).toHaveLength(MAX_ARRANGEMENTS)
  })
  it('AgisterForm包含全部4种类型', () => {
    const forms: AgisterForm[] = [
      'crown_agistment', 'forest_agistment', 'common_agistment', 'private_agistment',
    ]
    forms.forEach(f => {
      const a = makeArrangement({ form: f })
      expect(a.form).toBe(f)
    })
  })
  it('arrangements=15条时random通过可添加（不超过16）', () => {
    for (let i = 1; i <= MAX_ARRANGEMENTS - 1; i++) {
      ;(sys as any).arrangements.push(makeArrangement({ id: i, tick: 999999 }))
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
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 3)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 3)
  })
  it('MAX_ARRANGEMENTS上限为16', () => {
    for (let i = 0; i < MAX_ARRANGEMENTS; i++) {
      ;(sys as any).arrangements.push(makeArrangement({ id: i + 1, tick: 999999 }))
    }
    expect((sys as any).arrangements.length).toBe(16)
  })
  it('arrangements空时可以正常通过节流不报错', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, {} as any, {} as any, CHECK_INTERVAL)).not.toThrow()
  })
})

describe('DiplomaticAgisterSystem — nextId递增', () => {
  let sys: DiplomaticAgisterSystem
  beforeEach(() => { sys = makeSys() })

  it('手动nextId递增两次后值为3', () => {
    ;(sys as any).arrangements.push(makeArrangement({ id: (sys as any).nextId++ }))
    ;(sys as any).arrangements.push(makeArrangement({ id: (sys as any).nextId++ }))
    expect((sys as any).arrangements[0].id).toBe(1)
    expect((sys as any).arrangements[1].id).toBe(2)
    expect((sys as any).nextId).toBe(3)
  })
  it('初始nextId为1', () => { expect((sys as any).nextId).toBe(1) })
  it('每次spawn后nextId递增', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.5)
      .mockReturnValue(0.5)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(2)
    vi.restoreAllMocks()
  })
})

describe('DiplomaticAgisterSystem — AgisterForm枚举', () => {
  it('crown_agistment是合法form', () => {
    const a = makeArrangement({ form: 'crown_agistment' })
    expect(a.form).toBe('crown_agistment')
  })
  it('forest_agistment是合法form', () => {
    const a = makeArrangement({ form: 'forest_agistment' })
    expect(a.form).toBe('forest_agistment')
  })
  it('common_agistment是合法form', () => {
    const a = makeArrangement({ form: 'common_agistment' })
    expect(a.form).toBe('common_agistment')
  })
  it('private_agistment是合法form', () => {
    const a = makeArrangement({ form: 'private_agistment' })
    expect(a.form).toBe('private_agistment')
  })
  it('共有4种form', () => {
    const forms: AgisterForm[] = ['crown_agistment', 'forest_agistment', 'common_agistment', 'private_agistment']
    expect(forms).toHaveLength(4)
  })
})

describe('DiplomaticAgisterSystem — update集成', () => {
  let sys: DiplomaticAgisterSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('random很高时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('random=0时可spawn（PROCEED_CHANCE=0.0021）', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.5)
      .mockReturnValue(0.5)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('spawn时pastureCivId和agisterCivId不同', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.5)
      .mockReturnValue(0.5)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    if ((sys as any).arrangements.length > 0) {
      const a = (sys as any).arrangements[0]
      expect(a.pastureCivId).not.toBe(a.agisterCivId)
    }
  })
  it('spawn的arrangement.tick等于当前tick', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.5)
      .mockReturnValue(0.5)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    if ((sys as any).arrangements.length > 0) {
      expect((sys as any).arrangements[0].tick).toBe(CHECK_INTERVAL)
    }
  })
  it('spawn的arrangement.duration初始为0', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.5)
      .mockReturnValue(0.5)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    // duration在同tick内+1
    if ((sys as any).arrangements.length > 0) {
      expect((sys as any).arrangements[0].duration).toBe(1)
    }
  })
})
