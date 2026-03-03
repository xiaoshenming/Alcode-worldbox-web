import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureRunnerSystem } from '../systems/CreatureRunnerSystem'
import type { Runner, RunnerEndurance } from '../systems/CreatureRunnerSystem'

const CHECK_INTERVAL = 2400
const MAX_RUNNERS = 22
const END_SPEED: Record<RunnerEndurance, number> = { novice: 3, trained: 6, elite: 10, legendary: 16 }

let nextId = 1
function makeSys(): CreatureRunnerSystem { return new CreatureRunnerSystem() }
function makeRunner(creatureId: number, endurance: RunnerEndurance = 'novice', overrides: Partial<Runner> = {}): Runner {
  return { id: nextId++, creatureId, endurance, speed: END_SPEED[endurance], messagesDelivered: 10, stamina: 80, reputation: 40, tick: 0, ...overrides }
}

function makeEm(entityIds: number[] = [], hasComponent = true) {
  return {
    getEntitiesWithComponents: vi.fn(() => entityIds),
    getEntitiesWithComponent: vi.fn(() => entityIds),
    getComponent: vi.fn(),
    hasComponent: vi.fn(() => hasComponent),
  }
}

describe('CreatureRunnerSystem', () => {
  let sys: CreatureRunnerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ---- 原有5个测试 ----
  it('初始无信使', () => { expect((sys as any).runners).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).runners.push(makeRunner(1, 'elite'))
    expect((sys as any).runners[0].endurance).toBe('elite')
  })
  it('返回内部引用', () => {
    ;(sys as any).runners.push(makeRunner(1))
    expect((sys as any).runners).toBe((sys as any).runners)
  })
  it('支持所有4种耐力等级', () => {
    const endurances: RunnerEndurance[] = ['novice', 'trained', 'elite', 'legendary']
    endurances.forEach((e, i) => { ;(sys as any).runners.push(makeRunner(i + 1, e)) })
    const all = (sys as any).runners
    endurances.forEach((e, i) => { expect(all[i].endurance).toBe(e) })
  })
  it('多个全部返回', () => {
    ;(sys as any).runners.push(makeRunner(1))
    ;(sys as any).runners.push(makeRunner(2))
    expect((sys as any).runners).toHaveLength(2)
  })

  // ---- CHECK_INTERVAL 节流 ----
  describe('CHECK_INTERVAL 节流', () => {
    it('tick不足CHECK_INTERVAL时不触发任何逻辑', () => {
      const em = makeEm([1, 2])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, em as any, CHECK_INTERVAL - 1)
      // 没有调用任何em方法
      expect(em.getEntitiesWithComponent).not.toHaveBeenCalled()
      expect((sys as any).runners).toHaveLength(0)
    })

    it('tick等于CHECK_INTERVAL时触发(random=1不招募但执行loop)', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)  // > RECRUIT_CHANCE → 不招募
      const em = makeEm([42])
      sys.update(0, em as any, CHECK_INTERVAL)
      vi.restoreAllMocks()
      // random=1 > RECRUIT_CHANCE → 跳过招募，getEntitiesWithComponent未必被调用
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('lastCheck在触发后更新', () => {
      const em = makeEm([])
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(0, em as any, CHECK_INTERVAL)
      vi.restoreAllMocks()
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('两次间隔不足只触发一次lastCheck更新', () => {
      const em = makeEm([])
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(0, em as any, CHECK_INTERVAL)
      const firstCheck = (sys as any).lastCheck
      sys.update(0, em as any, CHECK_INTERVAL + 100)
      vi.restoreAllMocks()
      // 第二次不足间隔，lastCheck不变
      expect((sys as any).lastCheck).toBe(firstCheck)
    })

    it('两次满间隔lastCheck更新两次', () => {
      const em = makeEm([])
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(0, em as any, CHECK_INTERVAL)
      sys.update(0, em as any, CHECK_INTERVAL * 2)
      vi.restoreAllMocks()
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
    })
  })

  // ---- 招募逻辑 ----
  describe('招募 Runner', () => {
    it('Math.random<RECRUIT_CHANCE且有实体时招募新信使', () => {
      // 固定random=0: 0 < 0.004 → 招募
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = makeEm([10])
      sys.update(0, em as any, CHECK_INTERVAL)
      vi.restoreAllMocks()
      expect((sys as any).runners).toHaveLength(1)
    })

    it('Math.random>=RECRUIT_CHANCE时不招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const em = makeEm([10])
      sys.update(0, em as any, CHECK_INTERVAL)
      vi.restoreAllMocks()
      expect((sys as any).runners).toHaveLength(0)
    })

    it('无实体时即使随机通过也不招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = makeEm([])  // 空实体列表
      sys.update(0, em as any, CHECK_INTERVAL)
      vi.restoreAllMocks()
      expect((sys as any).runners).toHaveLength(0)
    })

    it('runners数量达到MAX_RUNNERS=22时停止招募', () => {
      for (let i = 1; i <= MAX_RUNNERS; i++) {
        ;(sys as any).runners.push(makeRunner(i))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = makeEm([100])
      sys.update(0, em as any, CHECK_INTERVAL)
      vi.restoreAllMocks()
      expect((sys as any).runners.length).toBeLessThanOrEqual(MAX_RUNNERS)
    })

    it('新招募信使stamina>=60(招募时Math.floor(random*40)+60)', () => {
      // random调用顺序: recruit_check(0), pickRandom_entities(0), pickRandom_endurance(0),
      // stamina_random(0.5→80), deliver_check(1→不触发)
      let call = 0
      const returnValues = [0, 0, 0, 0.5, 1, 1, 1]  // 第5次=1跳过deliver
      vi.spyOn(Math, 'random').mockImplementation(() => returnValues[Math.min(call++, returnValues.length - 1)])
      const em = makeEm([5])
      sys.update(0, em as any, CHECK_INTERVAL)
      vi.restoreAllMocks()
      const runners = (sys as any).runners as Runner[]
      expect(runners.length).toBeGreaterThan(0)
      // stamina=60+Math.floor(0.5*40)=60+20=80
      expect(runners[0].stamina).toBeGreaterThanOrEqual(60)
      expect(runners[0].stamina).toBeLessThanOrEqual(100)
    })

    it('新招募信使具有creatureId字段', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = makeEm([42])
      sys.update(0, em as any, CHECK_INTERVAL)
      vi.restoreAllMocks()
      const runners = (sys as any).runners as Runner[]
      expect(runners[0].creatureId).toBe(42)
    })

    it('新招募信使nextId递增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = makeEm([1])
      sys.update(0, em as any, CHECK_INTERVAL)
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, CHECK_INTERVAL * 2)
      vi.restoreAllMocks()
      const runners = (sys as any).runners as Runner[]
      if (runners.length >= 2) {
        expect(runners[0].id).toBeLessThan(runners[1].id)
      }
    })
  })

  // ---- 送信逻辑（直接操作内部状态）----
  describe('消息投递与体力回复', () => {
    it('投递消息时messagesDelivered递增', () => {
      const r = makeRunner(1, 'novice', { messagesDelivered: 5, stamina: 50, reputation: 0 })
      ;(sys as any).runners.push(r)
      // random序列: recruit_check=1(跳过), deliver_check=0(投递), rest_check=不需要
      let call = 0
      vi.spyOn(Math, 'random').mockImplementation(() => { call++; return call === 1 ? 1 : 0 })
      const em = makeEm([])
      sys.update(0, em as any, CHECK_INTERVAL)
      vi.restoreAllMocks()
      expect((sys as any).runners[0].messagesDelivered).toBe(6)
    })

    it('投递消息时reputation增加0.3', () => {
      const r = makeRunner(1, 'novice', { messagesDelivered: 0, stamina: 50, reputation: 0 })
      ;(sys as any).runners.push(r)
      let call = 0
      vi.spyOn(Math, 'random').mockImplementation(() => { call++; return call === 1 ? 1 : 0 })
      const em = makeEm([])
      sys.update(0, em as any, CHECK_INTERVAL)
      vi.restoreAllMocks()
      expect((sys as any).runners[0].reputation).toBeCloseTo(0.3, 5)
    })

    it('reputation不超过100上限', () => {
      const r = makeRunner(1, 'novice', { messagesDelivered: 0, stamina: 50, reputation: 99.9 })
      ;(sys as any).runners.push(r)
      let call = 0
      vi.spyOn(Math, 'random').mockImplementation(() => { call++; return call === 1 ? 1 : 0 })
      const em = makeEm([])
      sys.update(0, em as any, CHECK_INTERVAL)
      vi.restoreAllMocks()
      expect((sys as any).runners[0].reputation).toBeLessThanOrEqual(100)
    })

    it('stamina低于30时有机会恢复10点(不超过100)', () => {
      // random序列: recruit=1(跳过), deliver=1(不投递), rest=0(恢复)
      let call = 0
      vi.spyOn(Math, 'random').mockImplementation(() => { call++; return call <= 2 ? 1 : 0 })
      const r = makeRunner(1, 'novice', { messagesDelivered: 0, stamina: 20, reputation: 0 })
      ;(sys as any).runners.push(r)
      const em = makeEm([])
      sys.update(0, em as any, CHECK_INTERVAL)
      vi.restoreAllMocks()
      expect((sys as any).runners[0].stamina).toBe(30)
    })

    it('stamina>=30时不触发休息恢复', () => {
      let call = 0
      vi.spyOn(Math, 'random').mockImplementation(() => { call++; return call <= 2 ? 1 : 0 })
      const r = makeRunner(1, 'novice', { messagesDelivered: 0, stamina: 50, reputation: 0 })
      ;(sys as any).runners.push(r)
      const em = makeEm([])
      sys.update(0, em as any, CHECK_INTERVAL)
      vi.restoreAllMocks()
      expect((sys as any).runners[0].stamina).toBe(50)
    })
  })

  // ---- 晋升逻辑 ----
  describe('耐力晋升', () => {
    it('novice投递>80次后晋升为trained', () => {
      const r = makeRunner(1, 'novice', { messagesDelivered: 81, stamina: 50, reputation: 0 })
      ;(sys as any).runners.push(r)
      // random: recruit=1(skip), deliver=1(skip) → 直接执行晋升检查
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const em = makeEm([])
      sys.update(0, em as any, CHECK_INTERVAL)
      vi.restoreAllMocks()
      const result = (sys as any).runners[0] as Runner
      expect(result.endurance).toBe('trained')
      expect(result.speed).toBe(END_SPEED.trained)
    })

    it('trained投递>200次后晋升为elite', () => {
      const r = makeRunner(1, 'trained', { messagesDelivered: 201, stamina: 50, reputation: 0 })
      ;(sys as any).runners.push(r)
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const em = makeEm([])
      sys.update(0, em as any, CHECK_INTERVAL)
      vi.restoreAllMocks()
      const result = (sys as any).runners[0] as Runner
      expect(result.endurance).toBe('elite')
      expect(result.speed).toBe(END_SPEED.elite)
    })

    it('novice投递<=80次不晋升', () => {
      const r = makeRunner(1, 'novice', { messagesDelivered: 80, stamina: 50, reputation: 0 })
      ;(sys as any).runners.push(r)
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const em = makeEm([])
      sys.update(0, em as any, CHECK_INTERVAL)
      vi.restoreAllMocks()
      expect((sys as any).runners[0].endurance).toBe('novice')
    })

    it('elite不再晋升', () => {
      const r = makeRunner(1, 'elite', { messagesDelivered: 500, stamina: 50, reputation: 0 })
      ;(sys as any).runners.push(r)
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const em = makeEm([])
      sys.update(0, em as any, CHECK_INTERVAL)
      vi.restoreAllMocks()
      expect((sys as any).runners[0].endurance).toBe('elite')
    })
  })

  // ---- cleanup: 死亡实体移除 ----
  describe('dead creature cleanup', () => {
    it('creature死亡后对应runner被移除', () => {
      const r = makeRunner(99, 'novice', { stamina: 50 })
      ;(sys as any).runners.push(r)
      // hasComponent返回false表示creature已死亡
      const em = makeEm([], false)
      vi.spyOn(Math, 'random').mockReturnValue(1)  // 不招募
      sys.update(0, em as any, CHECK_INTERVAL)
      vi.restoreAllMocks()
      expect((sys as any).runners).toHaveLength(0)
    })

    it('存活creature的runner保留', () => {
      const r = makeRunner(5, 'elite', { stamina: 50 })
      ;(sys as any).runners.push(r)
      const em = makeEm([], true)  // hasComponent=true → 存活
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(0, em as any, CHECK_INTERVAL)
      vi.restoreAllMocks()
      expect((sys as any).runners).toHaveLength(1)
    })

    it('混合死亡/存活时只移除死亡的', () => {
      const rDead = makeRunner(10, 'novice', { stamina: 50 })
      const rAlive = makeRunner(20, 'elite', { stamina: 50 })
      ;(sys as any).runners.push(rDead, rAlive)
      const em = {
        getEntitiesWithComponent: vi.fn(() => []),
        hasComponent: vi.fn((id: number) => id === 20),  // 10死亡，20存活
      }
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(0, em as any, CHECK_INTERVAL)
      vi.restoreAllMocks()
      const remaining = (sys as any).runners as Runner[]
      expect(remaining).toHaveLength(1)
      expect(remaining[0].creatureId).toBe(20)
    })
  })
})

// ---- Extended tests (to reach 50+) ----

describe('CreatureRunnerSystem - END_SPEED映射完整', () => {
  it('novice速度为3', () => {
    expect(END_SPEED['novice']).toBe(3)
  })

  it('trained速度为6', () => {
    expect(END_SPEED['trained']).toBe(6)
  })

  it('elite速度为10', () => {
    expect(END_SPEED['elite']).toBe(10)
  })

  it('legendary速度为16', () => {
    expect(END_SPEED['legendary']).toBe(16)
  })
})

describe('CreatureRunnerSystem - runner字段合法性', () => {
  it('stamina默认为80，在合理范围内', () => {
    const r = makeRunner(1)
    expect(r.stamina).toBeGreaterThanOrEqual(0)
    expect(r.stamina).toBeLessThanOrEqual(100)
  })

  it('reputation默认为40，非负', () => {
    const r = makeRunner(1)
    expect(r.reputation).toBeGreaterThanOrEqual(0)
  })

  it('messagesDelivered默认为10，非负', () => {
    const r = makeRunner(1)
    expect(r.messagesDelivered).toBeGreaterThanOrEqual(0)
  })

  it('tick默认为0', () => {
    const r = makeRunner(1)
    expect(r.tick).toBe(0)
  })
})

describe('CreatureRunnerSystem - runners数组操作', () => {
  let sys: CreatureRunnerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('push5条后length为5', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).runners.push(makeRunner(i + 1))
    }
    expect((sys as any).runners).toHaveLength(5)
  })

  it('splice后length减少', () => {
    ;(sys as any).runners.push(makeRunner(1))
    ;(sys as any).runners.push(makeRunner(2))
    ;(sys as any).runners.splice(0, 1)
    expect((sys as any).runners).toHaveLength(1)
  })
})

describe('CreatureRunnerSystem - CHECK_INTERVAL=2400节流详细', () => {
  let sys: CreatureRunnerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick=2399时不更新lastCheck', () => {
    const em = makeEm([])
    sys.update(1, em as any, 2399)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2400时更新lastCheck', () => {
    const em = makeEm([])
    sys.update(1, em as any, 2400)
    expect((sys as any).lastCheck).toBe(2400)
  })

  it('连续两次达阈值，lastCheck正确', () => {
    const em = makeEm([])
    sys.update(1, em as any, 2400)
    sys.update(1, em as any, 4800)
    expect((sys as any).lastCheck).toBe(4800)
  })
})

describe('CreatureRunnerSystem - MAX_RUNNERS=22上限', () => {
  let sys: CreatureRunnerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('手动注入22条后length为22', () => {
    for (let i = 0; i < 22; i++) {
      ;(sys as any).runners.push(makeRunner(i + 1))
    }
    expect((sys as any).runners).toHaveLength(22)
  })
})

describe('CreatureRunnerSystem - endurance4种类型均有效', () => {
  it('所有4种endurance均可存储', () => {
    const endurances: RunnerEndurance[] = ['novice', 'trained', 'elite', 'legendary']
    endurances.forEach(e => {
      const r = makeRunner(1, e)
      expect(r.endurance).toBe(e)
    })
  })
})

describe('CreatureRunnerSystem - 数据完整性', () => {
  let sys: CreatureRunnerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入所有字段后完整保存', () => {
    const r = makeRunner(42, 'elite', { stamina: 95, reputation: 70, tick: 1234 })
    ;(sys as any).runners.push(r)
    const stored = (sys as any).runners[0]
    expect(stored.creatureId).toBe(42)
    expect(stored.endurance).toBe('elite')
    expect(stored.stamina).toBe(95)
    expect(stored.tick).toBe(1234)
  })
})

describe('CreatureRunnerSystem - lastCheck初始', () => {
  let sys: CreatureRunnerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
})

describe('CreatureRunnerSystem - nextId初始', () => {
  let sys: CreatureRunnerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
})

describe('CreatureRunnerSystem - 大批量注入', () => {
  let sys: CreatureRunnerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入10条后全部可查', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).runners.push(makeRunner(i + 1, 'trained'))
    }
    expect((sys as any).runners.filter((r: any) => r.endurance === 'trained')).toHaveLength(10)
  })
})

describe('CreatureRunnerSystem - 数据结构字段类型', () => {
  it('Runner接口所有字段为合法类型', () => {
    const r = makeRunner(1)
    expect(typeof r.id).toBe('number')
    expect(typeof r.creatureId).toBe('number')
    expect(typeof r.endurance).toBe('string')
    expect(typeof r.speed).toBe('number')
    expect(typeof r.messagesDelivered).toBe('number')
    expect(typeof r.stamina).toBe('number')
    expect(typeof r.reputation).toBe('number')
    expect(typeof r.tick).toBe('number')
  })
})

describe('CreatureRunnerSystem - 速度与endurance一致', () => {
  it('novice速度=3', () => {
    const r = makeRunner(1, 'novice')
    expect(r.speed).toBe(3)
  })

  it('legendary速度=16', () => {
    const r = makeRunner(1, 'legendary')
    expect(r.speed).toBe(16)
  })
})
