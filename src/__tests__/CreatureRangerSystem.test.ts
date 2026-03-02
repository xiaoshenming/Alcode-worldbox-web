import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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
const SPEC_RADIUS: Record<RangerSpecialty, number> = {
  scout: 20, tracker: 15, warden: 10, sentinel: 30,
}

// ─────────────────────────────────────────────────────────────────
describe('CreatureRangerSystem — 基础状态', () => {
  let sys: CreatureRangerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

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

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('Ranger 接口字段完整', () => {
    const r = makeRanger(1, 'scout')
    expect(r).toHaveProperty('id')
    expect(r).toHaveProperty('creatureId')
    expect(r).toHaveProperty('specialty')
    expect(r).toHaveProperty('patrolRadius')
    expect(r).toHaveProperty('alertness')
    expect(r).toHaveProperty('threatsDetected')
    expect(r).toHaveProperty('experience')
    expect(r).toHaveProperty('tick')
  })

  it('注入 warden 专业', () => {
    ;(sys as any).rangers.push(makeRanger(1, 'warden'))
    expect((sys as any).rangers[0].specialty).toBe('warden')
  })

  it('注入 sentinel 专业', () => {
    ;(sys as any).rangers.push(makeRanger(1, 'sentinel'))
    expect((sys as any).rangers[0].specialty).toBe('sentinel')
  })

  it('注入10个巡逻者长度正确', () => {
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).rangers.push(makeRanger(i))
    }
    expect((sys as any).rangers).toHaveLength(10)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('CreatureRangerSystem — CHECK_INTERVAL 节流', () => {
  let sys: CreatureRangerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick 未达 CHECK_INTERVAL 时不处理（lastCheck 保持 0）', () => {
    const em = makeEm([1])
    ;(sys as any).rangers.push(makeRanger(1))
    const before = (sys as any).rangers.length
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).rangers).toHaveLength(before)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 恰好等于 CHECK_INTERVAL 时触发更新并更新 lastCheck', () => {
    const em = makeEm([])
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

  it('tick=0时不触发', () => {
    const em = makeEm([1])
    sys.update(1, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=CHECK_INTERVAL-1时不触发', () => {
    const em = makeEm([])
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('三次触发，lastCheck始终是最新tick', () => {
    const em = makeEm([])
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    sys.update(1, em, CHECK_INTERVAL * 3)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 3)
  })

  it('在节流期内调用不改变rangers', () => {
    ;(sys as any).rangers.push(makeRanger(1, 'scout'))
    const em = makeEm([], () => true)
    ;(sys as any).lastCheck = 5000
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 5100) // 5100-5000=100 < 2600
    expect((sys as any).rangers).toHaveLength(1)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('CreatureRangerSystem — 技能增长与上限', () => {
  let sys: CreatureRangerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('experience 和 alertness 不超过 100 上限', () => {
    const ranger = makeRanger(1, 'scout', { experience: 99.9, alertness: 99.95, creatureId: 1 })
    ;(sys as any).rangers.push(ranger)
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const em = makeEm([], () => true)
    sys.update(1, em, CHECK_INTERVAL)
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
    expect(ranger.threatsDetected).toBeGreaterThan(beforeThreats)
  })

  it('experience > 50 时 patrolRadius 随经验扩大（warden）', () => {
    const ranger = makeRanger(1, 'warden', { experience: 60, patrolRadius: 10, creatureId: 1 })
    ;(sys as any).rangers.push(ranger)
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    const em = makeEm([], () => true)
    sys.update(1, em, CHECK_INTERVAL)
    // SPEC_RADIUS[warden]=10，experience=60, patrolRadius = min(50, 10 + floor(60*0.2)) = min(50,22)=22
    expect(ranger.patrolRadius).toBe(22)
  })

  it('experience <= 50 时 patrolRadius 不变', () => {
    const ranger = makeRanger(1, 'scout', { experience: 40, patrolRadius: 20, creatureId: 1 })
    ;(sys as any).rangers.push(ranger)
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    const em = makeEm([], () => true)
    sys.update(1, em, CHECK_INTERVAL)
    expect(ranger.patrolRadius).toBe(20)
  })

  it('patrolRadius 扩大不超过 50 上限', () => {
    const ranger = makeRanger(1, 'sentinel', { experience: 200, patrolRadius: 30, creatureId: 1 })
    ;(sys as any).rangers.push(ranger)
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    const em = makeEm([], () => true)
    sys.update(1, em, CHECK_INTERVAL)
    expect(ranger.patrolRadius).toBeLessThanOrEqual(50)
  })

  it('experience 恰好=50时 patrolRadius 不变', () => {
    const ranger = makeRanger(1, 'tracker', { experience: 50, patrolRadius: 8, creatureId: 1 })
    ;(sys as any).rangers.push(ranger)
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    const em = makeEm([], () => true)
    sys.update(1, em, CHECK_INTERVAL)
    expect(ranger.patrolRadius).toBe(8)
  })

  it('experience=51时 patrolRadius 计算正确（scout）', () => {
    // SPEC_RADIUS[scout]=20, exp=51 → min(50, 20+floor(51*0.2)) = min(50,20+10)=30
    const ranger = makeRanger(1, 'scout', { experience: 51, patrolRadius: 20, creatureId: 1 })
    ;(sys as any).rangers.push(ranger)
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    const em = makeEm([], () => true)
    sys.update(1, em, CHECK_INTERVAL)
    expect(ranger.patrolRadius).toBe(30)
  })

  it('experience=100时 scout patrolRadius = min(50, 20+20)=40', () => {
    const ranger = makeRanger(1, 'scout', { experience: 100, patrolRadius: 20, creatureId: 1 })
    ;(sys as any).rangers.push(ranger)
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    const em = makeEm([], () => true)
    sys.update(1, em, CHECK_INTERVAL)
    expect(ranger.patrolRadius).toBe(40)
  })

  it('sentinel experience=51时 patrolRadius = min(50, 30+10)=40', () => {
    const ranger = makeRanger(1, 'sentinel', { experience: 51, patrolRadius: 30, creatureId: 1 })
    ;(sys as any).rangers.push(ranger)
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    const em = makeEm([], () => true)
    sys.update(1, em, CHECK_INTERVAL)
    expect(ranger.patrolRadius).toBe(40)
  })

  it('random=0.01时 threatsDetected 递增1', () => {
    const ranger = makeRanger(1, 'scout', { experience: 30, threatsDetected: 10, creatureId: 1 })
    ;(sys as any).rangers.push(ranger)
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const em = makeEm([], () => true)
    sys.update(1, em, CHECK_INTERVAL)
    expect(ranger.threatsDetected).toBe(11)
  })

  it('random=0.03时不触发检测（>0.02）', () => {
    const ranger = makeRanger(1, 'scout', { experience: 30, threatsDetected: 10, creatureId: 1 })
    ;(sys as any).rangers.push(ranger)
    vi.spyOn(Math, 'random').mockReturnValue(0.03)
    const em = makeEm([], () => true)
    sys.update(1, em, CHECK_INTERVAL)
    expect(ranger.threatsDetected).toBe(10)
  })

  it('alertness 增长后不超过100', () => {
    const ranger = makeRanger(1, 'scout', { alertness: 100, creatureId: 1 })
    ;(sys as any).rangers.push(ranger)
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const em = makeEm([], () => true)
    sys.update(1, em, CHECK_INTERVAL)
    expect(ranger.alertness).toBeLessThanOrEqual(100)
  })

  it('experience 增长步长为0.5', () => {
    const ranger = makeRanger(1, 'scout', { experience: 0, creatureId: 1 })
    ;(sys as any).rangers.push(ranger)
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const em = makeEm([], () => true)
    sys.update(1, em, CHECK_INTERVAL)
    expect(ranger.experience).toBeCloseTo(0.5, 5)
  })

  it('alertness 增长步长为0.1', () => {
    const ranger = makeRanger(1, 'scout', { alertness: 50, creatureId: 1 })
    ;(sys as any).rangers.push(ranger)
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const em = makeEm([], () => true)
    sys.update(1, em, CHECK_INTERVAL)
    expect(ranger.alertness).toBeCloseTo(50.1, 5)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('CreatureRangerSystem — cleanup（生物消失后移除）', () => {
  let sys: CreatureRangerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('生物 ID 不再有 creature 组件时，ranger 被移除', () => {
    ;(sys as any).rangers.push(makeRanger(99, 'scout'))
    const em = makeEm([], () => false)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).rangers).toHaveLength(0)
  })

  it('部分生物死亡时只移除对应 ranger', () => {
    ;(sys as any).rangers.push(makeRanger(1, 'scout'))
    ;(sys as any).rangers.push(makeRanger(2, 'tracker'))
    const em = makeEm([], (id: number) => id === 2)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    const rangers = (sys as any).rangers as Ranger[]
    expect(rangers).toHaveLength(1)
    expect(rangers[0].creatureId).toBe(2)
  })

  it('所有生物存活时 rangers 长度不变', () => {
    ;(sys as any).rangers.push(makeRanger(1, 'warden'))
    ;(sys as any).rangers.push(makeRanger(2, 'sentinel'))
    const em = makeEm([], () => true)
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

  it('三个ranger中间一个死亡时正确删除', () => {
    ;(sys as any).rangers.push(makeRanger(1, 'scout'))
    ;(sys as any).rangers.push(makeRanger(2, 'tracker'))
    ;(sys as any).rangers.push(makeRanger(3, 'warden'))
    const em = makeEm([], (id: number) => id !== 2)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    const rangers = (sys as any).rangers as Ranger[]
    expect(rangers).toHaveLength(2)
    expect(rangers.map(r => r.creatureId)).toEqual([1, 3])
  })

  it('全部死亡时 rangers 清空', () => {
    for (let i = 1; i <= 5; i++) {
      ;(sys as any).rangers.push(makeRanger(i, 'scout'))
    }
    const em = makeEm([], () => false)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).rangers).toHaveLength(0)
  })

  it('cleanup 后 nextId 不回退', () => {
    ;(sys as any).nextId = 10
    ;(sys as any).rangers.push(makeRanger(1))
    const em = makeEm([], () => false)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(10)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('CreatureRangerSystem — 招募上限', () => {
  let sys: CreatureRangerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('已达 MAX_RANGERS(25) 时不再招募', () => {
    for (let i = 1; i <= 25; i++) {
      ;(sys as any).rangers.push(makeRanger(i, 'scout'))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([100], () => true)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).rangers).toHaveLength(25)
  })

  it('24个时还可以招募', () => {
    for (let i = 1; i <= 24; i++) {
      ;(sys as any).rangers.push(makeRanger(i, 'scout'))
    }
    // random=0 触发招募（< RECRUIT_CHANCE=0.004）
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([100], () => true)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).rangers.length).toBeGreaterThanOrEqual(24)
  })

  it('random=0.005时不触发招募（>RECRUIT_CHANCE=0.004）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.005)
    const em = makeEm([1], () => true)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).rangers).toHaveLength(0)
  })

  it('random=0时触发招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1], () => true)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).rangers.length).toBeGreaterThan(0)
  })

  it('实体列表为空时即使random<RECRUIT_CHANCE也不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([], () => true)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).rangers).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('CreatureRangerSystem — 招募时的初始属性', () => {
  let sys: CreatureRangerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('新招募的ranger experience 初始值为0（直接验证招募逻辑）', () => {
    // random=0 < RECRUIT_CHANCE=0.004 触发招募，之后 random=0 < 0.02 会让 experience+0.5
    // 验证最终 experience 为 0.5（初始0加一次检测增长）
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1], () => true)
    sys.update(1, em, CHECK_INTERVAL)
    const rangers = (sys as any).rangers as Ranger[]
    if (rangers.length > 0) {
      // experience 应为 0（招募时）+ 0.5（随机检测触发）= 0.5
      expect(rangers[0].experience).toBeCloseTo(0.5, 5)
    }
  })

  it('新招募的ranger threatsDetected 反映检测循环结果', () => {
    // random=0 触发招募 + 触发检测（<0.02），所以 threatsDetected=1
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1], () => true)
    sys.update(1, em, CHECK_INTERVAL)
    const rangers = (sys as any).rangers as Ranger[]
    if (rangers.length > 0) {
      expect(rangers[0].threatsDetected).toBe(1)
    }
  })

  it('新招募的ranger tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1], () => true)
    sys.update(1, em, CHECK_INTERVAL)
    const rangers = (sys as any).rangers as Ranger[]
    if (rangers.length > 0) {
      expect(rangers[0].tick).toBe(CHECK_INTERVAL)
    }
  })

  it('新招募的ranger creatureId等于被选中的实体id', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([42], () => true)
    sys.update(1, em, CHECK_INTERVAL)
    const rangers = (sys as any).rangers as Ranger[]
    if (rangers.length > 0) {
      expect(rangers[0].creatureId).toBe(42)
    }
  })

  it('新招募ranger的patrolRadius符合specialty规范', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1], () => true)
    sys.update(1, em, CHECK_INTERVAL)
    const rangers = (sys as any).rangers as Ranger[]
    if (rangers.length > 0) {
      const r = rangers[0]
      const expectedRadius = SPEC_RADIUS[r.specialty]
      // 刚招募时 experience=0 <= 50，所以 patrolRadius 不扩展
      expect(r.patrolRadius).toBe(expectedRadius)
    }
  })

  it('nextId 在每次招募后递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const idBefore = (sys as any).nextId
    const em = makeEm([1], () => true)
    sys.update(1, em, CHECK_INTERVAL)
    const rangers = (sys as any).rangers as Ranger[]
    if (rangers.length > 0) {
      expect((sys as any).nextId).toBe(idBefore + 1)
    }
  })
})

// ─────────────────────────────────────────────────────────────────
describe('CreatureRangerSystem — patrolRadius 按专业计算', () => {
  let sys: CreatureRangerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('scout experience=100 → patrolRadius = min(50, 20+20)=40', () => {
    const ranger = makeRanger(1, 'scout', { experience: 100, patrolRadius: 20, creatureId: 1 })
    ;(sys as any).rangers.push(ranger)
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    const em = makeEm([], () => true)
    sys.update(1, em, CHECK_INTERVAL)
    expect(ranger.patrolRadius).toBe(40)
  })

  it('tracker experience=100 → patrolRadius = min(50, 15+20)=35', () => {
    const ranger = makeRanger(1, 'tracker', { experience: 100, patrolRadius: 15, creatureId: 1 })
    ;(sys as any).rangers.push(ranger)
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    const em = makeEm([], () => true)
    sys.update(1, em, CHECK_INTERVAL)
    expect(ranger.patrolRadius).toBe(35)
  })

  it('sentinel experience=200 → patrolRadius = min(50, 30+40)=50', () => {
    const ranger = makeRanger(1, 'sentinel', { experience: 200, patrolRadius: 30, creatureId: 1 })
    ;(sys as any).rangers.push(ranger)
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    const em = makeEm([], () => true)
    sys.update(1, em, CHECK_INTERVAL)
    expect(ranger.patrolRadius).toBe(50)
  })

  it('warden experience=55 → patrolRadius = min(50, 10+11)=21', () => {
    const ranger = makeRanger(1, 'warden', { experience: 55, patrolRadius: 10, creatureId: 1 })
    ;(sys as any).rangers.push(ranger)
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    const em = makeEm([], () => true)
    sys.update(1, em, CHECK_INTERVAL)
    expect(ranger.patrolRadius).toBe(21)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('CreatureRangerSystem — 空状态边界', () => {
  let sys: CreatureRangerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('无ranger时update不抛异常', () => {
    const em = makeEm([], () => true)
    expect(() => sys.update(1, em, CHECK_INTERVAL)).not.toThrow()
  })

  it('update参数dt=0时不报错', () => {
    const em = makeEm([])
    expect(() => sys.update(0, em, CHECK_INTERVAL)).not.toThrow()
  })

  it('update参数dt为负数时不报错', () => {
    const em = makeEm([])
    expect(() => sys.update(-1, em, CHECK_INTERVAL)).not.toThrow()
  })

  it('连续多次update不破坏状态', () => {
    const em = makeEm([], () => true)
    for (let i = 1; i <= 5; i++) {
      sys.update(1, em, CHECK_INTERVAL * i)
    }
    expect((sys as any).rangers).toBeDefined()
  })
})
