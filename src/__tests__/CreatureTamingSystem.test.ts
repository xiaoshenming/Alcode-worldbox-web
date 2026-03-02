import { describe, it, expect, beforeEach } from 'vitest'
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

describe('CreatureTamingSystem', () => {
  let sys: CreatureTamingSystem

  beforeEach(() => { sys = makeSys() })

  // ── 原有5个测试（保留）──

  it('getTamedAnimals初始为空', () => {
    expect(sys.getTamedAnimals(1)).toHaveLength(0)
  })

  it('注入Tamed状态后getTamedAnimals返回数据', () => {
    pushRecord(sys, { animalId: 2, ownerId: 1 })
    expect(sys.getTamedAnimals(1)).toHaveLength(1)
  })

  it('isTamed 未驯化的动物返回false', () => {
    expect(sys.isTamed(999)).toBe(false)
  })

  it('注入Tamed状态后isTamed返回true', () => {
    pushRecord(sys, { animalId: 2, ownerId: 1, state: Tamed })
    expect(sys.isTamed(2)).toBe(true)
  })

  it('getBonus 未知拥有者返回0或1', () => {
    const bonus = sys.getBonus(999, 'attack')
    expect(typeof bonus).toBe('number')
  })

  // ── 新增测试 ──

  // getTamedAnimals 过滤
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

  // isTamed
  it('isTamed对Taming状态返回false', () => {
    pushRecord(sys, { animalId: 7, ownerId: 1, state: Taming, progress: 0.9 })
    expect(sys.isTamed(7)).toBe(false)
  })

  it('isTamed对Wild状态返回false', () => {
    pushRecord(sys, { animalId: 8, ownerId: 1, state: Wild })
    expect(sys.isTamed(8)).toBe(false)
  })

  // getBonus
  it('getBonus horse驯化后返回移速加成', () => {
    pushRecord(sys, { animalId: 20, ownerId: 1, animalType: 'horse', state: Tamed })
    const bonus = sys.getBonus(1, '移速')
    expect(bonus).toBeGreaterThan(0)
  })

  it('getBonus wolf驯化后返回战斗加成', () => {
    pushRecord(sys, { animalId: 21, ownerId: 1, animalType: 'wolf', state: Tamed })
    const bonus = sys.getBonus(1, '战斗')
    expect(bonus).toBeGreaterThan(0)
  })

  it('getBonus Taming状态不计入加成', () => {
    pushRecord(sys, { animalId: 22, ownerId: 1, animalType: 'horse', state: Taming, progress: 0.99 })
    const bonus = sys.getBonus(1, '移速')
    expect(bonus).toBe(0)
  })

  it('getBonus 多只驯化动物加成叠加', () => {
    pushRecord(sys, { animalId: 30, ownerId: 1, animalType: 'wolf', state: Tamed })
    pushRecord(sys, { animalId: 31, ownerId: 1, animalType: 'wolf', state: Tamed })
    const bonus = sys.getBonus(1, '战斗')
    // 两只wolf战斗+15%叠加 => 0.30
    expect(bonus).toBeCloseTo(0.30, 5)
  })

  // removeEntity
  it('removeEntity移除动物后isTamed返回false', () => {
    pushRecord(sys, { animalId: 40, ownerId: 1, state: Tamed })
    expect(sys.isTamed(40)).toBe(true)
    sys.removeEntity(40)
    expect(sys.isTamed(40)).toBe(false)
  })

  it('removeEntity移除拥有者后其动物记录一并清除', () => {
    pushRecord(sys, { animalId: 50, ownerId: 5, state: Tamed })
    sys.removeEntity(5) // ownerId=5的记录被删
    expect(sys.getTamedAnimals(5)).toHaveLength(0)
  })

  it('removeEntity不影响其他记录', () => {
    pushRecord(sys, { animalId: 60, ownerId: 1, state: Tamed })
    pushRecord(sys, { animalId: 61, ownerId: 2, state: Tamed })
    sys.removeEntity(60)
    expect(sys.getTamedAnimals(2)).toHaveLength(1)
  })

  // update - CHECK_INTERVAL节流
  it('update在非CHECK_INTERVAL倍数tick时不处理记录', () => {
    pushRecord(sys, { animalId: 70, ownerId: 1, state: Taming, progress: 0, startTick: 0 })
    sys.update(1) // tick=1，不是30的倍数，不处理
    const r = (sys as any).records[0]
    expect(r.state).toBe(Taming)
  })

  it('update在CHECK_INTERVAL整数倍tick时处理记录', () => {
    // wolf tameTicks=300，经过300tick后驯化完成
    pushRecord(sys, { animalId: 71, ownerId: 1, state: Taming, progress: 0, startTick: 0, animalType: 'wolf' })
    sys.update(TAME_CHECK_INTERVAL) // 第一次触发
    sys.update(TAME_CHECK_INTERVAL * 2) // 第二次触发
    // startTick=0，tick=60，progress=60/300=0.2, 未完成
    const r = (sys as any).records[0]
    expect(r.state).toBe(Taming)
  })

  it('update驯化进度达到1时状态变为Tamed', () => {
    // wolf tameTicks=300，startTick=0，tick=300 => progress=1
    pushRecord(sys, { animalId: 72, ownerId: 1, state: Taming, progress: 0, startTick: 0, animalType: 'wolf' })
    sys.update(300) // tick=300，progress=300/300=1 => Tamed
    const r = (sys as any).records[0]
    expect(r.state).toBe(Tamed)
  })

  it('update驯化完成后animalId加入_tamedSet', () => {
    pushRecord(sys, { animalId: 73, ownerId: 1, state: Taming, progress: 0, startTick: 0, animalType: 'deer' })
    // deer tameTicks=150，tick=150 => 完成
    sys.update(150)
    expect(sys.isTamed(73)).toBe(true)
  })

  // handleKeyDown
  it('handleKeyDown Shift+T切换visible并返回true', () => {
    const ev = { shiftKey: true, key: 'T' } as KeyboardEvent
    expect(sys.handleKeyDown(ev)).toBe(true)
  })

  it('handleKeyDown 非Shift+T返回false', () => {
    const ev = { shiftKey: false, key: 'T' } as KeyboardEvent
    expect(sys.handleKeyDown(ev)).toBe(false)
  })
})
