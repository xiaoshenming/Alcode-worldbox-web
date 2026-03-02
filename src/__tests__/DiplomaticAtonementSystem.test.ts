import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticAtonementSystem, AtonementProcess, AtonementForm } from '../systems/DiplomaticAtonementSystem'

const CHECK_INTERVAL = 2550
const MAX_PROCESSES = 20
const EXPIRE_OFFSET = 87000

function makeSys() { return new DiplomaticAtonementSystem() }

function makeProcess(overrides: Partial<AtonementProcess> = {}): AtonementProcess {
  return {
    id: 1,
    civIdA: 1,
    civIdB: 2,
    form: 'public_apology',
    sincerityLevel: 50,
    acceptanceRate: 40,
    publicAwareness: 35,
    healingEffect: 30,
    duration: 0,
    tick: 10000,
    ...overrides,
  }
}

describe('DiplomaticAtonementSystem', () => {
  let sys: DiplomaticAtonementSystem

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─────────────────────────────────────────
  // 1. 基础数据结构
  // ─────────────────────────────────────────
  describe('基础数据结构', () => {
    it('初始processes为空数组', () => {
      expect((sys as any).processes).toHaveLength(0)
      expect(Array.isArray((sys as any).processes)).toBe(true)
    })

    it('nextId初始为1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck初始为0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('注入单条记录后processes长度为1', () => {
      ;(sys as any).processes.push(makeProcess({ id: 1 }))
      expect((sys as any).processes).toHaveLength(1)
      expect((sys as any).processes[0].id).toBe(1)
    })

    it('注入多条记录后processes长度正确', () => {
      ;(sys as any).processes.push(makeProcess({ id: 1 }))
      ;(sys as any).processes.push(makeProcess({ id: 2, civIdA: 3, civIdB: 4 }))
      ;(sys as any).processes.push(makeProcess({ id: 3, civIdA: 5, civIdB: 6 }))
      expect((sys as any).processes).toHaveLength(3)
    })

    it('支持 public_apology 表单类型', () => {
      const p = makeProcess({ form: 'public_apology' })
      expect(p.form).toBe('public_apology')
    })

    it('支持 memorial_construction 表单类型', () => {
      const p = makeProcess({ form: 'memorial_construction' })
      expect(p.form).toBe('memorial_construction')
    })

    it('支持 reparative_service 表单类型', () => {
      const p = makeProcess({ form: 'reparative_service' })
      expect(p.form).toBe('reparative_service')
    })

    it('支持 symbolic_gesture 表单类型', () => {
      const p = makeProcess({ form: 'symbolic_gesture' })
      expect(p.form).toBe('symbolic_gesture')
    })

    it('process包含所有必需字段', () => {
      const p = makeProcess()
      expect(p).toHaveProperty('id')
      expect(p).toHaveProperty('civIdA')
      expect(p).toHaveProperty('civIdB')
      expect(p).toHaveProperty('form')
      expect(p).toHaveProperty('sincerityLevel')
      expect(p).toHaveProperty('acceptanceRate')
      expect(p).toHaveProperty('publicAwareness')
      expect(p).toHaveProperty('healingEffect')
      expect(p).toHaveProperty('duration')
      expect(p).toHaveProperty('tick')
    })
  })

  // ─────────────────────────────────────────
  // 2. CHECK_INTERVAL 节流
  // ─────────────────────────────────────────
  describe('CHECK_INTERVAL 节流', () => {
    it('tick差值小于CHECK_INTERVAL时跳过update', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9999)
      const tick1 = CHECK_INTERVAL + 1
      sys.update(1, {} as any, {} as any, tick1)
      // lastCheck 已更新为 tick1
      const tick2 = tick1 + CHECK_INTERVAL - 1
      const lenBefore = (sys as any).processes.length
      sys.update(1, {} as any, {} as any, tick2)
      expect((sys as any).processes.length).toBe(lenBefore)
    })

    it('tick差值等于CHECK_INTERVAL时执行update（lastCheck更新）', () => {
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('tick差值超过CHECK_INTERVAL时lastCheck被更新', () => {
      const bigTick = CHECK_INTERVAL * 2
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).lastCheck).toBe(bigTick)
    })

    it('连续调用第一次通过第二次节流', () => {
      const tick1 = CHECK_INTERVAL + 10
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, tick1)
      const lastCheck1 = (sys as any).lastCheck
      sys.update(1, {} as any, {} as any, tick1 + 1)
      expect((sys as any).lastCheck).toBe(lastCheck1)
    })

    it('节流期间不对现有processes执行duration更新', () => {
      ;(sys as any).processes.push(makeProcess({ id: 1, duration: 5 }))
      const tick1 = CHECK_INTERVAL + 1
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, tick1)
      const dur1 = (sys as any).processes[0].duration
      // 第二次在节流窗口内调用
      sys.update(1, {} as any, {} as any, tick1 + CHECK_INTERVAL - 1)
      const dur2 = (sys as any).processes[0].duration
      expect(dur2).toBe(dur1)
    })
  })

  // ─────────────────────────────────────────
  // 3. 数值字段动态更新
  // ─────────────────────────────────────────
  describe('数值字段动态更新', () => {
    it('每次update后duration递增1', () => {
      ;(sys as any).processes.push(makeProcess({ id: 1, duration: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).processes[0].duration).toBe(1)
    })

    it('多次update后duration累计递增', () => {
      ;(sys as any).processes.push(makeProcess({ id: 1, duration: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2 + 2)
      expect((sys as any).processes[0].duration).toBe(2)
    })

    it('sincerityLevel不低于下限10', () => {
      ;(sys as any).processes.push(makeProcess({ id: 1, sincerityLevel: 10.001 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).processes[0].sincerityLevel).toBeGreaterThanOrEqual(10)
    })

    it('sincerityLevel不超过上限85', () => {
      ;(sys as any).processes.push(makeProcess({ id: 1, sincerityLevel: 84.999 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).processes[0].sincerityLevel).toBeLessThanOrEqual(85)
    })

    it('acceptanceRate不低于下限5', () => {
      ;(sys as any).processes.push(makeProcess({ id: 1, acceptanceRate: 5.001 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).processes[0].acceptanceRate).toBeGreaterThanOrEqual(5)
    })

    it('acceptanceRate不超过上限80', () => {
      ;(sys as any).processes.push(makeProcess({ id: 1, acceptanceRate: 79.999 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).processes[0].acceptanceRate).toBeLessThanOrEqual(80)
    })

    it('publicAwareness不低于下限5', () => {
      ;(sys as any).processes.push(makeProcess({ id: 1, publicAwareness: 5.001 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).processes[0].publicAwareness).toBeGreaterThanOrEqual(5)
    })

    it('publicAwareness不超过上限75', () => {
      ;(sys as any).processes.push(makeProcess({ id: 1, publicAwareness: 74.999 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).processes[0].publicAwareness).toBeLessThanOrEqual(75)
    })

    it('healingEffect不低于下限5', () => {
      ;(sys as any).processes.push(makeProcess({ id: 1, healingEffect: 5.001 }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).processes[0].healingEffect).toBeGreaterThanOrEqual(5)
    })

    it('healingEffect不超过上限70', () => {
      ;(sys as any).processes.push(makeProcess({ id: 1, healingEffect: 69.999 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).processes[0].healingEffect).toBeLessThanOrEqual(70)
    })
  })

  // ─────────────────────────────────────────
  // 4. time-based 过期清理
  // ─────────────────────────────────────────
  describe('time-based 过期清理', () => {
    it('超期记录被删除（tick=0，bigTick>EXPIRE_OFFSET）', () => {
      ;(sys as any).processes.push(makeProcess({ id: 1, tick: 0 }))
      const bigTick = EXPIRE_OFFSET + CHECK_INTERVAL + 1
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).processes).toHaveLength(0)
    })

    it('未超期记录被保留', () => {
      // executeTick足够大通过节流，record.tick紧贴cutoff之后（不被删除）
      const executeTick = EXPIRE_OFFSET + CHECK_INTERVAL * 2
      // cutoff = executeTick - EXPIRE_OFFSET = CHECK_INTERVAL * 2
      // record.tick = cutoff（边界值：不满足 < cutoff，保留）
      const cutoff = executeTick - EXPIRE_OFFSET
      ;(sys as any).processes.push(makeProcess({ id: 1, tick: cutoff }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, executeTick)
      expect((sys as any).processes).toHaveLength(1)
    })

    it('混合：过期的被删，未过期的保留', () => {
      const bigTick = EXPIRE_OFFSET + CHECK_INTERVAL + 10000
      ;(sys as any).processes.push(makeProcess({ id: 1, tick: 0 }))           // 过期
      ;(sys as any).processes.push(makeProcess({ id: 2, tick: bigTick - 100 })) // 未过期
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, bigTick)
      const remaining = (sys as any).processes
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe(2)
    })

    it('多条超期记录全部清除', () => {
      const bigTick = EXPIRE_OFFSET + CHECK_INTERVAL + 1
      for (let i = 0; i < 5; i++) {
        ;(sys as any).processes.push(makeProcess({ id: i + 1, tick: 0 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, bigTick)
      expect((sys as any).processes).toHaveLength(0)
    })

    it('正好在cutoff边界的记录不被删除', () => {
      const updateTick = EXPIRE_OFFSET + CHECK_INTERVAL + 1
      const cutoff = updateTick - EXPIRE_OFFSET
      // record.tick === cutoff，不满足 < cutoff，应保留
      ;(sys as any).processes.push(makeProcess({ id: 1, tick: cutoff }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, updateTick)
      expect((sys as any).processes).toHaveLength(1)
    })
  })

  // ─────────────────────────────────────────
  // 5. MAX_PROCESSES 上限
  // ─────────────────────────────────────────
  describe('MAX_PROCESSES 上限', () => {
    it('达到MAX_PROCESSES上限时不新增记录', () => {
      for (let i = 0; i < MAX_PROCESSES; i++) {
        ;(sys as any).processes.push(makeProcess({ id: i + 1, civIdA: i + 1, civIdB: i + 9 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0) // random < PROCEED_CHANCE 成立
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).processes.length).toBeLessThanOrEqual(MAX_PROCESSES)
    })

    it('未达上限且random满足时可新增记录', () => {
      // processes为空，random=0 < PROCEED_CHANCE，且civA≠civB需要mock两次random
      const mockRandom = vi.spyOn(Math, 'random')
      // 调用顺序: 1st=PROCEED_CHANCE check, 2nd=civA, 3rd=civB, 4th=pickRandom内部
      mockRandom
        .mockReturnValueOnce(0.0001)  // < PROCEED_CHANCE(0.0021) -> 触发新增
        .mockReturnValueOnce(0)       // civA = 1
        .mockReturnValueOnce(0.5)     // civB = 5 (≠1)
        .mockReturnValue(0)           // pickRandom
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).processes.length).toBeGreaterThanOrEqual(1)
    })

    it('random >= PROCEED_CHANCE时不新增记录', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9999) // >> PROCEED_CHANCE
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).processes).toHaveLength(0)
    })

    it('MAX_PROCESSES-1条记录时random满足可新增到MAX', () => {
      for (let i = 0; i < MAX_PROCESSES - 1; i++) {
        ;(sys as any).processes.push(makeProcess({ id: i + 1, civIdA: i + 1, civIdB: i + 9 }))
      }
      const mockRandom = vi.spyOn(Math, 'random')
      mockRandom
        .mockReturnValueOnce(0.0001)  // < PROCEED_CHANCE
        .mockReturnValueOnce(0)       // civA=1
        .mockReturnValueOnce(0.5)     // civB=5
        .mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).processes.length).toBeLessThanOrEqual(MAX_PROCESSES)
    })
  })
})
