import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureRangerSystem } from '../systems/CreatureRangerSystem'
import type { Ranger, RangerSpecialty } from '../systems/CreatureRangerSystem'

let nextId = 1
function makeSys(): CreatureRangerSystem { return new CreatureRangerSystem() }
function makeRanger(creatureId: number, specialty: RangerSpecialty = 'scout', overrides: Partial<Ranger> = {}): Ranger {
  return { id: nextId++, creatureId, specialty, patrolRadius: 10, alertness: 70, threatsDetected: 5, experience: 50, tick: 0, ...overrides }
}

/** 构造最简 EntityManager mock */
function makeEm(ids: number[] = [], hasComponentFn?: (id: number, type: string) => boolean) {
  return {
    getEntitiesWithComponent: vi.fn().mockReturnValue(ids),
    getEntitiesWithComponents: vi.fn().mockReturnValue(ids),
    hasComponent: vi.fn().mockImplementation(hasComponentFn ?? (() => true)),
  } as any
}

const CHECK_INTERVAL = 2600

describe('CreatureRangerSystem — 基础状态', () => {
  let sys: CreatureRangerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无巡逻者', () => { expect((sys as any).rangers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).rangers.push(makeRanger(1, 'tracker'))
    expect((sys as any).rangers[0].specialty).toBe('tracker')
  })
  it('返回内部引用', () => {
    ;(sys as any).rangers.push(makeRanger(1))
    expect((sys as any).rangers).toBe((sys as any).rangers)
  })
  it('支持所有4种专业', () => {
    const specs: RangerSpecialty[] = ['scout', 'tracker', 'warden', 'sentinel']
    specs.forEach((s, i) => { ;(sys as any).rangers.push(makeRanger(i + 1, s)) })
    const all = (sys as any).rangers
    specs.forEach((s, i) => { expect(all[i].specialty).toBe(s) })
  })
  it('多个全部返回', () => {
    ;(sys as any).rangers.push(makeRanger(1))
    ;(sys as any).rangers.push(makeRanger(2))
    expect((sys as any).rangers).toHaveLength(2)
  })
})

describe('CreatureRangerSystem — CHECK_INTERVAL 节流', () => {
  let sys: CreatureRangerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 未达 CHECK_INTERVAL 时不处理（lastCheck 保持 0）', () => {
    const em = makeEm([1])
    ;(sys as any).rangers.push(makeRanger(1))
    const before = (sys as any).rangers.length
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).rangers).toHaveLength(before)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 恰好等于 CHECK_INTERVAL 时触发更新并更新 lastCheck', () => {
    const em = makeEm([]) // 无实体，不会招募
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('超过 CHECK_INTERVAL 再次触发后 lastCheck 随 tick 更新', () => {
    const em = makeEm([])
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('两次 tick 间隔不足时不会重复更新', () => {
    const em = makeEm([])
    sys.update(1, em, CHECK_INTERVAL)
    const lastCheckAfterFirst = (sys as any).lastCheck
    sys.update(1, em, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(lastCheckAfterFirst)
  })
})

describe('CreatureRangerSystem — 技能增长与上限', () => {
  let sys: CreatureRangerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('experience 和 alertness 不超过 100 上限', () => {
    // 注入 experience=99.9, alertness=99.95 的 ranger，强制让随机检测触发
    const ranger = makeRanger(1, 'scout', { experience: 99.9, alertness: 99.95, creatureId: 1 })
    ;(sys as any).rangers.push(ranger)
    // mock Math.random 使 0.02 概率检测分支一定触发
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const em = makeEm([], () => true)
    sys.update(1, em, CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect(ranger.experience).toBeLessThanOrEqual(100)
    expect(ranger.alertness).toBeLessThanOrEqual(100)
  })

  it('experience 增长时 threatsDetected 同步递增', () => {
    const ranger = makeRanger(1, 'scout', { experience: 0, threatsDetected: 0, creatureId: 1 })
    ;(sys as any).rangers.push(ranger)
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const em = makeEm([], () => true)
    const beforeThreats = ranger.threatsDetected
    sys.update(1, em, CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect(ranger.threatsDetected).toBeGreaterThan(beforeThreats)
  })

  it('experience > 50 时 patrolRadius 随经验扩大', () => {
    // 使用 warden（baseRadius=10），experience=60
    const ranger = makeRanger(1, 'warden', { experience: 60, patrolRadius: 10, creatureId: 1 })
    ;(sys as any).rangers.push(ranger)
    // 让随机检测不触发（random=0.05 > 0.02 不会检测威胁，但 experience 已经 >50）
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    const em = makeEm([], () => true)
    sys.update(1, em, CHECK_INTERVAL)
    vi.restoreAllMocks()
    // SPEC_RADIUS[warden]=10，experience=60, patrolRadius = min(50, 10 + floor(60*0.2)) = min(50,22)=22
    expect(ranger.patrolRadius).toBe(22)
  })

  it('experience <= 50 时 patrolRadius 不变', () => {
    const ranger = makeRanger(1, 'scout', { experience: 40, patrolRadius: 20, creatureId: 1 })
    ;(sys as any).rangers.push(ranger)
    vi.spyOn(Math, 'random').mockReturnValue(0.05) // 不触发检测
    const em = makeEm([], () => true)
    sys.update(1, em, CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect(ranger.patrolRadius).toBe(20)
  })

  it('patrolRadius 扩大不超过 50 上限', () => {
    // experience=200（人为设置），让公式溢出
    const ranger = makeRanger(1, 'sentinel', { experience: 200, patrolRadius: 30, creatureId: 1 })
    ;(sys as any).rangers.push(ranger)
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    const em = makeEm([], () => true)
    sys.update(1, em, CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect(ranger.patrolRadius).toBeLessThanOrEqual(50)
  })
})

describe('CreatureRangerSystem — cleanup（生物消失后移除）', () => {
  let sys: CreatureRangerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('生物 ID 不再有 creature 组件时，ranger 被移除', () => {
    ;(sys as any).rangers.push(makeRanger(99, 'scout'))
    // hasComponent 返回 false，表示该生物已死
    const em = makeEm([], () => false)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).rangers).toHaveLength(0)
  })

  it('部分生物死亡时只移除对应 ranger', () => {
    ;(sys as any).rangers.push(makeRanger(1, 'scout'))
    ;(sys as any).rangers.push(makeRanger(2, 'tracker'))
    const em = makeEm([], (id: number) => id === 2) // 只有 id=2 存活
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    const rangers = (sys as any).rangers as Ranger[]
    expect(rangers).toHaveLength(1)
    expect(rangers[0].creatureId).toBe(2)
  })

  it('所有生物存活时 rangers 长度不变', () => {
    ;(sys as any).rangers.push(makeRanger(1, 'warden'))
    ;(sys as any).rangers.push(makeRanger(2, 'sentinel'))
    const em = makeEm([], () => true) // 全部存活
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).rangers).toHaveLength(2)
  })

  it('cleanup 不影响 nextId 计数', () => {
    ;(sys as any).rangers.push(makeRanger(1))
    const idBefore = (sys as any).nextId
    const em = makeEm([], () => false)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(idBefore)
  })
})

describe('CreatureRangerSystem — 招募上限', () => {
  let sys: CreatureRangerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('已达 MAX_RANGERS(25) 时不再招募', () => {
    for (let i = 1; i <= 25; i++) {
      ;(sys as any).rangers.push(makeRanger(i, 'scout'))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0) // 使概率检查通过
    const em = makeEm([100], () => true)
    sys.update(1, em, CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect((sys as any).rangers).toHaveLength(25)
  })
})
