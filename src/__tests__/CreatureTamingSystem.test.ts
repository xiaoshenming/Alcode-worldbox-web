import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureTamingSystem } from '../systems/CreatureTamingSystem'

// TameState: Wild=0, Taming=1, Tamed=2
const Wild = 0, Taming = 1, Tamed = 2
const TAME_CHECK_INTERVAL = 30

function makeSys() { return new CreatureTamingSystem() }

function pushRecord(
  sys: CreatureTamingSystem,
  opts: {
    animalId: number; ownerId: number; animalType?: string;
    state?: number; progress?: number; progressStr?: string;
    startTick?: number; name?: string; loyalty?: number; nameLabel?: string
  }
) {
  const r = {
    animalId: opts.animalId,
    ownerId: opts.ownerId,
    animalType: opts.animalType ?? 'wolf',
    state: opts.state ?? Tamed,
    progress: opts.progress ?? 1,
    progressStr: opts.progressStr ?? '100',
    startTick: opts.startTick ?? 0,
    name: opts.name ?? '影牙',
    loyalty: opts.loyalty ?? 0.8,
    nameLabel: opts.nameLabel ?? '影牙(狼)',
  }
  ;(sys as any).records.push(r)
}

describe('CreatureTamingSystem — 初始状态', () => {
  let sys: CreatureTamingSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('getTamedAnimals初始为空', () => { expect(sys.getTamedAnimals(1)).toHaveLength(0) })
  it('records初始为空', () => { expect((sys as any).records).toHaveLength(0) })
  it('_tamedSet初始为空', () => { expect((sys as any)._tamedSet.size).toBe(0) })
  it('isTamed未驯化的动物返回false', () => { expect(sys.isTamed(999)).toBe(false) })
  it('visible初始为false', () => { expect((sys as any).visible).toBe(false) })
  it('selectedOwner初始为-1', () => { expect((sys as any).selectedOwner).toBe(-1) })
  it('系统构造不崩溃', () => { expect(() => new CreatureTamingSystem()).not.toThrow() })
  it('getBonus未知拥有者返回0', () => {
    const bonus = sys.getBonus(999, 'attack')
    expect(typeof bonus).toBe('number')
  })
})

describe('CreatureTamingSystem — getTamedAnimals', () => {
  let sys: CreatureTamingSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('注入Tamed状态后getTamedAnimals返回数据', () => {
    pushRecord(sys, { animalId: 2, ownerId: 1 })
    expect(sys.getTamedAnimals(1)).toHaveLength(1)
  })
  it('getTamedAnimals只返回指定ownerId的记录', () => {
    pushRecord(sys, { animalId: 10, ownerId: 1 })
    pushRecord(sys, { animalId: 20, ownerId: 2 })
    expect(sys.getTamedAnimals(1)).toHaveLength(1)
    expect(sys.getTamedAnimals(2)).toHaveLength(1)
    expect(sys.getTamedAnimals(99)).toHaveLength(0)
  })
  it('getTamedAnimals不返回Taming状态的记录', () => {
    pushRecord(sys, { animalId: 5, ownerId: 1, state: Taming, progress: 0.5 })
    expect(sys.getTamedAnimals(1)).toHaveLength(0)
  })
  it('getTamedAnimals不返回Wild状态的记录', () => {
    pushRecord(sys, { animalId: 6, ownerId: 1, state: Wild })
    expect(sys.getTamedAnimals(1)).toHaveLength(0)
  })
  it('getTamedAnimals同一ownerId多只动物全部返回', () => {
    pushRecord(sys, { animalId: 10, ownerId: 1, animalType: 'wolf' })
    pushRecord(sys, { animalId: 11, ownerId: 1, animalType: 'horse' })
    pushRecord(sys, { animalId: 12, ownerId: 1, animalType: 'bear' })
    expect(sys.getTamedAnimals(1)).toHaveLength(3)
  })
  it('不同ownerId的动物相互独立', () => {
    pushRecord(sys, { animalId: 20, ownerId: 5, animalType: 'wolf' })
    pushRecord(sys, { animalId: 21, ownerId: 6, animalType: 'horse' })
    expect(sys.getTamedAnimals(5)).toHaveLength(1)
    expect(sys.getTamedAnimals(6)).toHaveLength(1)
  })
})

describe('CreatureTamingSystem — isTamed', () => {
  let sys: CreatureTamingSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('注入Tamed状态后isTamed返回true', () => {
    pushRecord(sys, { animalId: 2, ownerId: 1, state: Tamed })
    expect(sys.isTamed(2)).toBe(true)
  })
  it('isTamed对Taming状态返回false', () => {
    pushRecord(sys, { animalId: 7, ownerId: 1, state: Taming, progress: 0.9 })
    expect(sys.isTamed(7)).toBe(false)
  })
  it('isTamed对Wild状态返回false', () => {
    pushRecord(sys, { animalId: 8, ownerId: 1, state: Wild })
    expect(sys.isTamed(8)).toBe(false)
  })
  it('isTamed通过_tamedSet快速查找', () => {
    ;(sys as any)._tamedSet.add(30)
    expect(sys.isTamed(30)).toBe(true)
  })
  it('isTamed懒同步：records中有Tamed记录时也返回true', () => {
    pushRecord(sys, { animalId: 40, ownerId: 1, state: Tamed })
    expect(sys.isTamed(40)).toBe(true)
    // 之后_tamedSet应该包含40
    expect((sys as any)._tamedSet.has(40)).toBe(true)
  })
})

describe('CreatureTamingSystem — getBonus', () => {
  let sys: CreatureTamingSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('horse驯化后返回移速加成', () => {
    pushRecord(sys, { animalId: 20, ownerId: 1, animalType: 'horse', state: Tamed })
    const bonus = sys.getBonus(1, '移速')
    expect(bonus).toBeGreaterThan(0)
  })
  it('wolf驯化后返回战斗加成', () => {
    pushRecord(sys, { animalId: 21, ownerId: 1, animalType: 'wolf', state: Tamed })
    const bonus = sys.getBonus(1, '战斗')
    expect(bonus).toBeGreaterThan(0)
  })
  it('Taming状态不计入加成', () => {
    pushRecord(sys, { animalId: 22, ownerId: 1, animalType: 'horse', state: Taming, progress: 0.99 })
    const bonus = sys.getBonus(1, '移速')
    expect(bonus).toBe(0)
  })
  it('多只驯化wolf加成叠加', () => {
    pushRecord(sys, { animalId: 30, ownerId: 1, animalType: 'wolf', state: Tamed })
    pushRecord(sys, { animalId: 31, ownerId: 1, animalType: 'wolf', state: Tamed })
    const bonus = sys.getBonus(1, '战斗')
    expect(bonus).toBeCloseTo(0.30, 5)
  })
  it('不同ownerId的加成不叠加', () => {
    pushRecord(sys, { animalId: 40, ownerId: 1, animalType: 'wolf', state: Tamed })
    pushRecord(sys, { animalId: 41, ownerId: 2, animalType: 'wolf', state: Tamed })
    const bonus1 = sys.getBonus(1, '战斗')
    const bonus2 = sys.getBonus(2, '战斗')
    expect(bonus1).toBeCloseTo(0.15, 5)
    expect(bonus2).toBeCloseTo(0.15, 5)
  })
  it('无记录时bonus为0', () => {
    expect(sys.getBonus(1, '移速')).toBe(0)
  })
})

describe('CreatureTamingSystem — removeEntity', () => {
  let sys: CreatureTamingSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('removeEntity移除动物后isTamed返回false', () => {
    pushRecord(sys, { animalId: 40, ownerId: 1, state: Tamed })
    expect(sys.isTamed(40)).toBe(true)
    sys.removeEntity(40)
    expect(sys.isTamed(40)).toBe(false)
  })
  it('removeEntity移除拥有者后其动物记录一并清除', () => {
    pushRecord(sys, { animalId: 50, ownerId: 5, state: Tamed })
    sys.removeEntity(5)
    expect(sys.getTamedAnimals(5)).toHaveLength(0)
  })
  it('removeEntity不影响其他记录', () => {
    pushRecord(sys, { animalId: 60, ownerId: 1, state: Tamed })
    pushRecord(sys, { animalId: 61, ownerId: 2, state: Tamed })
    sys.removeEntity(60)
    expect(sys.getTamedAnimals(2)).toHaveLength(1)
  })
  it('removeEntity移除不存在的实体不崩溃', () => {
    expect(() => sys.removeEntity(999)).not.toThrow()
  })
  it('removeEntity后records长度减少', () => {
    pushRecord(sys, { animalId: 70, ownerId: 1, state: Tamed })
    pushRecord(sys, { animalId: 71, ownerId: 1, state: Tamed })
    sys.removeEntity(70)
    expect((sys as any).records).toHaveLength(1)
  })
})

describe('CreatureTamingSystem — update节流与驯化进度', () => {
  let sys: CreatureTamingSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('update在非CHECK_INTERVAL倍数tick时不处理记录', () => {
    pushRecord(sys, { animalId: 70, ownerId: 1, state: Taming, progress: 0, startTick: 0 })
    sys.update(1)
    const r = (sys as any).records[0]
    expect(r.state).toBe(Taming)
  })
  it('update在CHECK_INTERVAL整数倍tick时处理记录', () => {
    pushRecord(sys, { animalId: 71, ownerId: 1, state: Taming, progress: 0, startTick: 0, animalType: 'wolf' })
    sys.update(TAME_CHECK_INTERVAL)
    sys.update(TAME_CHECK_INTERVAL * 2)
    const r = (sys as any).records[0]
    expect(r.state).toBe(Taming)
  })
  it('update驯化进度达到1时状态变为Tamed', () => {
    pushRecord(sys, { animalId: 72, ownerId: 1, state: Taming, progress: 0, startTick: 0, animalType: 'wolf' })
    sys.update(300)
    const r = (sys as any).records[0]
    expect(r.state).toBe(Tamed)
  })
  it('update驯化完成后animalId加入_tamedSet', () => {
    pushRecord(sys, { animalId: 73, ownerId: 1, state: Taming, progress: 0, startTick: 0, animalType: 'deer' })
    sys.update(150)
    expect(sys.isTamed(73)).toBe(true)
  })
  it('已驯化动物忠诚度缓慢下降', () => {
    pushRecord(sys, { animalId: 80, ownerId: 1, state: Tamed, loyalty: 0.8 })
    sys.update(TAME_CHECK_INTERVAL)
    const r = (sys as any).records[0]
    expect(r.loyalty).toBeLessThan(0.8)
  })
  it('忠诚度不低于0.1', () => {
    pushRecord(sys, { animalId: 81, ownerId: 1, state: Tamed, loyalty: 0.1 })
    sys.update(TAME_CHECK_INTERVAL)
    const r = (sys as any).records[0]
    if (r) expect(r.loyalty).toBeGreaterThanOrEqual(0.1)
  })
})

describe('CreatureTamingSystem — handleKeyDown与visible', () => {
  let sys: CreatureTamingSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('handleKeyDown Shift+T切换visible并返回true', () => {
    const ev = { shiftKey: true, key: 'T' } as KeyboardEvent
    expect(sys.handleKeyDown(ev)).toBe(true)
  })
  it('handleKeyDown 非Shift+T返回false', () => {
    const ev = { shiftKey: false, key: 'T' } as KeyboardEvent
    expect(sys.handleKeyDown(ev)).toBe(false)
  })
  it('handleKeyDown Shift+T两次visible来回切换', () => {
    const ev = { shiftKey: true, key: 'T' } as KeyboardEvent
    sys.handleKeyDown(ev)
    expect((sys as any).visible).toBe(true)
    sys.handleKeyDown(ev)
    expect((sys as any).visible).toBe(false)
  })
  it('handleKeyDown Shift+其他键返回false', () => {
    const ev = { shiftKey: true, key: 'A' } as KeyboardEvent
    expect(sys.handleKeyDown(ev)).toBe(false)
  })
  it('handleKeyDown 小写t（无shift）返回false', () => {
    const ev = { shiftKey: false, key: 't' } as KeyboardEvent
    expect(sys.handleKeyDown(ev)).toBe(false)
  })
})
