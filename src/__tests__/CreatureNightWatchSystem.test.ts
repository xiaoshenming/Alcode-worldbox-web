import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureNightWatchSystem } from '../systems/CreatureNightWatchSystem'
import type { WatchShift, NightWatch } from '../systems/CreatureNightWatchSystem'

// CHECK_INTERVAL=900, WATCH_CHANCE=0.03, MAX_WATCHES=70
// 班次权重: dusk=0.35, midnight=0.35, dawn=0.3
// processThreats: 触发概率=vigilance/500, 触发后vigilance+2, 上限100

function makeSys() { return new CreatureNightWatchSystem() }

function makeWatch(id: number, sentryId = id, shift: WatchShift = 'midnight', vigilance = 50): NightWatch {
  return { id, sentryId, shift, vigilance, threatsSpotted: 0, tick: id * 100 }
}

describe('CreatureNightWatchSystem', () => {
  let sys: CreatureNightWatchSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  // ── 初始化 ───────────────────────────────────────────────────────────────

  describe('初始化状态', () => {
    it('初始化不崩溃', () => { expect(sys).toBeDefined() })

    it('内部watches初始为空数组', () => {
      expect((sys as any).watches).toBeInstanceOf(Array)
      expect((sys as any).watches.length).toBe(0)
    })

    it('nextId初始为1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck初始为0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('getRecent(10)初始返回空数组', () => {
      expect(sys.getRecent(10)).toEqual([])
    })

    it('getRecent(0)初始时watches为空返回空数组', () => {
      // watches为空时 slice(-0) = slice(0) = []
      expect(sys.getRecent(0)).toEqual([])
    })
  })

  // ── CHECK_INTERVAL 节流 ──────────────────────────────────────────────────

  describe('CHECK_INTERVAL节流逻辑', () => {
    it('tick差值<CHECK_INTERVAL(900)时不更新lastCheck', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 800)  // 800-0=800 < 900
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick差值>=CHECK_INTERVAL(900)时更新lastCheck', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 900)  // 900-0=900 >= 900
      expect((sys as any).lastCheck).toBe(900)
    })

    it('tick差值恰好等于899时不触发', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      ;(sys as any).lastCheck = 1
      sys.update(1, em, 900)  // 900-1=899 < 900
      expect((sys as any).lastCheck).toBe(1)
    })

    it('tick差值恰好等于900时触发', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      ;(sys as any).lastCheck = 100
      sys.update(1, em, 1000)  // 1000-100=900 >= 900
      expect((sys as any).lastCheck).toBe(1000)
    })

    it('tick差值远超CHECK_INTERVAL时也触发', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 9000)
      expect((sys as any).lastCheck).toBe(9000)
    })

    it('连续两次update，第二次差值不足时不再触发', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 900)   // 触发，lastCheck=900
      sys.update(1, em, 1700)  // 1700-900=800 < 900，不触发
      expect((sys as any).lastCheck).toBe(900)
    })

    it('连续两次update，第二次差值足够时再触发', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 900)   // 触发，lastCheck=900
      sys.update(1, em, 1800)  // 1800-900=900 >= 900，触发
      expect((sys as any).lastCheck).toBe(1800)
    })
  })

  // ── pruneOld 截断逻辑 ────────────────────────────────────────────────────

  describe('pruneOld截断逻辑', () => {
    it('watches数量<=70时不截断', () => {
      const watches = (sys as any).watches as NightWatch[]
      for (let i = 0; i < 70; i++) {
        watches.push(makeWatch(i + 1, i, 'midnight', 50))
      }
      ;(sys as any).pruneOld()
      expect(watches.length).toBe(70)
    })

    it('watches数量>70时截断到70', () => {
      const watches = (sys as any).watches as NightWatch[]
      for (let i = 0; i < 78; i++) {
        watches.push(makeWatch(i + 1, i, 'dusk', 40))
      }
      ;(sys as any).pruneOld()
      expect(watches.length).toBe(70)
    })

    it('pruneOld保留最新记录（从头部删除）', () => {
      const watches = (sys as any).watches as NightWatch[]
      for (let i = 0; i < 75; i++) {
        watches.push(makeWatch(i + 1, i, 'dawn', 60))
      }
      ;(sys as any).pruneOld()
      expect(watches.length).toBe(70)
      expect(watches[0].id).toBe(6)
      expect(watches[69].id).toBe(75)
    })

    it('watches恰好71时截断为70，删除第1条', () => {
      const watches = (sys as any).watches as NightWatch[]
      for (let i = 0; i < 71; i++) {
        watches.push(makeWatch(i + 1))
      }
      ;(sys as any).pruneOld()
      expect(watches.length).toBe(70)
      expect(watches[0].id).toBe(2)
    })

    it('watches为0时pruneOld不崩溃', () => {
      expect(() => (sys as any).pruneOld()).not.toThrow()
      expect((sys as any).watches.length).toBe(0)
    })

    it('watches为1时pruneOld不截断', () => {
      ;(sys as any).watches.push(makeWatch(1))
      ;(sys as any).pruneOld()
      expect((sys as any).watches.length).toBe(1)
    })

    it('watches超过MAX_WATCHES很多时正确截断到70', () => {
      const watches = (sys as any).watches as NightWatch[]
      for (let i = 0; i < 200; i++) {
        watches.push(makeWatch(i + 1))
      }
      ;(sys as any).pruneOld()
      expect(watches.length).toBe(70)
      expect(watches[0].id).toBe(131)
      expect(watches[69].id).toBe(200)
    })
  })

  // ── getRecent ────────────────────────────────────────────────────────────

  describe('getRecent方法', () => {
    it('getRecent(3)从末尾返回最近3条记录', () => {
      const watches = (sys as any).watches as NightWatch[]
      for (let i = 1; i <= 5; i++) {
        watches.push({ id: i, sentryId: i, shift: 'midnight', vigilance: 50, threatsSpotted: 0, tick: i * 100 })
      }
      const recent = sys.getRecent(3)
      expect(recent.length).toBe(3)
      expect(recent[0].id).toBe(3)
      expect(recent[2].id).toBe(5)
    })

    it('getRecent(1)只返回最后1条', () => {
      const watches = (sys as any).watches as NightWatch[]
      watches.push({ id: 1, sentryId: 1, shift: 'dusk', vigilance: 50, threatsSpotted: 0, tick: 0 })
      watches.push({ id: 2, sentryId: 2, shift: 'dawn', vigilance: 60, threatsSpotted: 1, tick: 100 })
      const recent = sys.getRecent(1)
      expect(recent).toHaveLength(1)
      expect(recent[0].id).toBe(2)
    })

    it('watches数量少于count时getRecent返回全部', () => {
      const watches = (sys as any).watches as NightWatch[]
      watches.push({ id: 1, sentryId: 1, shift: 'dawn', vigilance: 50, threatsSpotted: 0, tick: 100 })
      const recent = sys.getRecent(10)
      expect(recent.length).toBe(1)
    })

    it('getRecent返回的是数组切片（不是原数组）', () => {
      const watches = (sys as any).watches as NightWatch[]
      for (let i = 1; i <= 5; i++) {
        watches.push(makeWatch(i))
      }
      const recent = sys.getRecent(3)
      expect(recent).not.toBe(watches)
    })

    it('getRecent(5)在watches有10条时返回后5条', () => {
      const watches = (sys as any).watches as NightWatch[]
      for (let i = 1; i <= 10; i++) {
        watches.push(makeWatch(i))
      }
      const recent = sys.getRecent(5)
      expect(recent.length).toBe(5)
      expect(recent[0].id).toBe(6)
      expect(recent[4].id).toBe(10)
    })

    it('getRecent(0)：JS中slice(-0)等于slice(0)，返回全部元素', () => {
      // JS语义：-0 === 0，[].slice(-0) 等价于 slice(0)，返回所有元素
      const watches = (sys as any).watches as NightWatch[]
      for (let i = 1; i <= 5; i++) {
        watches.push(makeWatch(i))
      }
      expect(sys.getRecent(0).length).toBe(5)
    })

    it('getRecent(70)在watches有70条时返回全部70条', () => {
      const watches = (sys as any).watches as NightWatch[]
      for (let i = 1; i <= 70; i++) {
        watches.push(makeWatch(i))
      }
      const recent = sys.getRecent(70)
      expect(recent.length).toBe(70)
    })
  })

  // ── processThreats vigilance 递增 ───────────────────────────────────────

  describe('processThreats威胁处理', () => {
    it('processThreats中vigilance上限100', () => {
      const watches = (sys as any).watches as NightWatch[]
      const w: NightWatch = { id: 1, sentryId: 1, shift: 'midnight', vigilance: 99, threatsSpotted: 0, tick: 0 }
      watches.push(w)
      for (let i = 0; i < 100; i++) {
        ;(sys as any).processThreats()
      }
      expect(w.vigilance).toBeLessThanOrEqual(100)
    })

    it('processThreats触发后threatsSpotted增加', () => {
      const watches = (sys as any).watches as NightWatch[]
      const w: NightWatch = { id: 1, sentryId: 1, shift: 'midnight', vigilance: 100, threatsSpotted: 0, tick: 0 }
      watches.push(w)
      // 高vigilance(100)时触发概率=100/500=0.2，多次调用大概率触发
      vi.spyOn(Math, 'random').mockReturnValue(0.1)  // 0.1 < 100/500=0.2，必然触发
      ;(sys as any).processThreats()
      expect(w.threatsSpotted).toBe(1)
    })

    it('processThreats不触发时threatsSpotted不变', () => {
      const watches = (sys as any).watches as NightWatch[]
      const w: NightWatch = { id: 1, sentryId: 1, shift: 'midnight', vigilance: 50, threatsSpotted: 5, tick: 0 }
      watches.push(w)
      // vigilance=50时触发概率=50/500=0.1，mock random=0.5不触发
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      ;(sys as any).processThreats()
      expect(w.threatsSpotted).toBe(5)
    })

    it('processThreats触发时vigilance+2', () => {
      const watches = (sys as any).watches as NightWatch[]
      const w: NightWatch = { id: 1, sentryId: 1, shift: 'midnight', vigilance: 50, threatsSpotted: 0, tick: 0 }
      watches.push(w)
      vi.spyOn(Math, 'random').mockReturnValue(0.05)  // 0.05 < 50/500=0.1，触发
      ;(sys as any).processThreats()
      expect(w.vigilance).toBe(52)
    })

    it('processThreats：watches为空时不崩溃', () => {
      expect(() => (sys as any).processThreats()).not.toThrow()
    })

    it('processThreats对多个watches分别处理', () => {
      const watches = (sys as any).watches as NightWatch[]
      const w1: NightWatch = { id: 1, sentryId: 1, shift: 'midnight', vigilance: 50, threatsSpotted: 0, tick: 0 }
      const w2: NightWatch = { id: 2, sentryId: 2, shift: 'dusk', vigilance: 50, threatsSpotted: 0, tick: 0 }
      watches.push(w1, w2)
      // 触发概率=0.1，mock 0.05触发
      vi.spyOn(Math, 'random').mockReturnValue(0.05)
      ;(sys as any).processThreats()
      expect(w1.threatsSpotted).toBe(1)
      expect(w2.threatsSpotted).toBe(1)
    })

    it('processThreats：vigilance=0时触发概率为0，不触发', () => {
      const watches = (sys as any).watches as NightWatch[]
      const w: NightWatch = { id: 1, sentryId: 1, shift: 'midnight', vigilance: 0, threatsSpotted: 0, tick: 0 }
      watches.push(w)
      // 任何random值都>=0，触发概率=0/500=0
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).processThreats()
      // random=0 < 0/500=0 是 false，不触发
      expect(w.threatsSpotted).toBe(0)
    })

    it('processThreats：vigilance接近上限时clamp到100', () => {
      const watches = (sys as any).watches as NightWatch[]
      const w: NightWatch = { id: 1, sentryId: 1, shift: 'midnight', vigilance: 100, threatsSpotted: 0, tick: 0 }
      watches.push(w)
      vi.spyOn(Math, 'random').mockReturnValue(0.01)  // 必然触发
      ;(sys as any).processThreats()
      expect(w.vigilance).toBe(100)  // Math.min(100, 100+2) = 100
    })
  })

  // ── WatchShift 类型完整性 ────────────────────────────────────────────────

  describe('WatchShift类型', () => {
    it('WatchShift包含dusk、midnight、dawn三种', () => {
      const shifts: WatchShift[] = ['dusk', 'midnight', 'dawn']
      expect(shifts.length).toBe(3)
      const watches = (sys as any).watches as NightWatch[]
      for (const shift of shifts) {
        watches.push({ id: 1, sentryId: 1, shift, vigilance: 50, threatsSpotted: 0, tick: 0 })
      }
      expect(watches.length).toBe(3)
    })

    it('dusk班次watch可正常存入', () => {
      const w: NightWatch = makeWatch(1, 1, 'dusk')
      ;(sys as any).watches.push(w)
      expect((sys as any).watches[0].shift).toBe('dusk')
    })

    it('midnight班次watch可正常存入', () => {
      const w: NightWatch = makeWatch(1, 1, 'midnight')
      ;(sys as any).watches.push(w)
      expect((sys as any).watches[0].shift).toBe('midnight')
    })

    it('dawn班次watch可正常存入', () => {
      const w: NightWatch = makeWatch(1, 1, 'dawn')
      ;(sys as any).watches.push(w)
      expect((sys as any).watches[0].shift).toBe('dawn')
    })
  })

  // ── NightWatch 字段完整性 ────────────────────────────────────────────────

  describe('NightWatch接口字段', () => {
    it('NightWatch包含id、sentryId、shift、vigilance、threatsSpotted、tick字段', () => {
      const w: NightWatch = { id: 1, sentryId: 10, shift: 'dusk', vigilance: 75, threatsSpotted: 3, tick: 500 }
      expect(w.id).toBe(1)
      expect(w.sentryId).toBe(10)
      expect(w.shift).toBe('dusk')
      expect(w.vigilance).toBe(75)
      expect(w.threatsSpotted).toBe(3)
      expect(w.tick).toBe(500)
    })

    it('vigilance字段取值范围0-100', () => {
      const watches = (sys as any).watches as NightWatch[]
      const w: NightWatch = { id: 1, sentryId: 1, shift: 'midnight', vigilance: 0, threatsSpotted: 0, tick: 0 }
      watches.push(w)
      expect(w.vigilance).toBeGreaterThanOrEqual(0)
      expect(w.vigilance).toBeLessThanOrEqual(100)
    })

    it('threatsSpotted初始值可为0', () => {
      const w: NightWatch = makeWatch(1)
      expect(w.threatsSpotted).toBe(0)
    })
  })

  // ── assignWatches 生成逻辑 ───────────────────────────────────────────────

  describe('assignWatches生成逻辑', () => {
    it('assignWatches：实体触发时nextId递增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)  // 0 <= WATCH_CHANCE(0.03)，必然通过
      const em = { getEntitiesWithComponents: () => [1, 2] as number[] } as any
      const before = (sys as any).nextId
      ;(sys as any).assignWatches(em, 1000)
      expect((sys as any).nextId).toBeGreaterThan(before)
    })

    it('assignWatches：random>WATCH_CHANCE时不生成watch', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)  // 1 > 0.03，跳过所有实体
      const em = { getEntitiesWithComponents: () => [1, 2, 3] as number[] } as any
      ;(sys as any).assignWatches(em, 1000)
      expect((sys as any).watches.length).toBe(0)
    })

    it('assignWatches：实体列表为空时不生成watch', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      ;(sys as any).assignWatches(em, 1000)
      expect((sys as any).watches.length).toBe(0)
    })

    it('assignWatches生成的watch含正确的sentryId', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)  // 必然触发
      const em = { getEntitiesWithComponents: () => [42] as number[] } as any
      ;(sys as any).assignWatches(em, 500)
      expect((sys as any).watches[0].sentryId).toBe(42)
    })

    it('assignWatches生成的watch tick等于当前tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = { getEntitiesWithComponents: () => [1] as number[] } as any
      ;(sys as any).assignWatches(em, 1234)
      expect((sys as any).watches[0].tick).toBe(1234)
    })

    it('assignWatches生成的watch vigilance在20-80范围内', () => {
      // vigilance = 20 + Math.random() * 60，mock random=0.5 => 20+30=50
      const mockRandom = vi.spyOn(Math, 'random')
      mockRandom.mockReturnValueOnce(0)   // WATCH_CHANCE check: 0 <= 0.03，触发
      mockRandom.mockReturnValue(0.5)     // vigilance = 20 + 0.5*60 = 50
      const em = { getEntitiesWithComponents: () => [1] as number[] } as any
      ;(sys as any).assignWatches(em, 100)
      const v = (sys as any).watches[0].vigilance
      expect(v).toBeGreaterThanOrEqual(20)
      expect(v).toBeLessThanOrEqual(80)
    })
  })

  // ── update 完整流程 ──────────────────────────────────────────────────────

  describe('update完整流程', () => {
    it('update触发时调用assignWatches、processThreats、pruneOld', () => {
      const assignSpy = vi.spyOn(sys as any, 'assignWatches')
      const threatSpy = vi.spyOn(sys as any, 'processThreats')
      const pruneSpy = vi.spyOn(sys as any, 'pruneOld')
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      sys.update(1, em, 900)
      expect(assignSpy).toHaveBeenCalledOnce()
      expect(threatSpy).toHaveBeenCalledOnce()
      expect(pruneSpy).toHaveBeenCalledOnce()
    })

    it('update不触发时不调用assignWatches', () => {
      const assignSpy = vi.spyOn(sys as any, 'assignWatches')
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      sys.update(1, em, 800)
      expect(assignSpy).not.toHaveBeenCalled()
    })

    it('update传入的dt参数不影响节流判断', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      ;(sys as any).lastCheck = 0
      sys.update(999, em, 800)  // dt=999但tick=800不满足
      expect((sys as any).lastCheck).toBe(0)
    })
  })

  // ── 边界条件与健壮性 ─────────────────────────────────────────────────────

  describe('边界条件与健壮性', () => {
    it('getRecent(负数)不崩溃', () => {
      ;(sys as any).watches.push(makeWatch(1))
      expect(() => sys.getRecent(-1)).not.toThrow()
    })

    it('watches截断后getRecent仍正确', () => {
      const watches = (sys as any).watches as NightWatch[]
      for (let i = 1; i <= 80; i++) {
        watches.push(makeWatch(i))
      }
      ;(sys as any).pruneOld()  // 截断到70
      const recent = sys.getRecent(5)
      expect(recent.length).toBe(5)
      expect(recent[4].id).toBe(80)
    })

    it('多次pruneOld幂等，不会进一步缩减', () => {
      const watches = (sys as any).watches as NightWatch[]
      for (let i = 1; i <= 70; i++) {
        watches.push(makeWatch(i))
      }
      ;(sys as any).pruneOld()
      ;(sys as any).pruneOld()
      expect(watches.length).toBe(70)
    })

    it('processThreats在大量watches时不崩溃', () => {
      const watches = (sys as any).watches as NightWatch[]
      for (let i = 1; i <= 70; i++) {
        watches.push(makeWatch(i, i, 'midnight', 50))
      }
      expect(() => (sys as any).processThreats()).not.toThrow()
    })

    it('不同sentryId的watch可以共存', () => {
      const watches = (sys as any).watches as NightWatch[]
      watches.push(makeWatch(1, 100, 'dusk'))
      watches.push(makeWatch(2, 200, 'midnight'))
      watches.push(makeWatch(3, 300, 'dawn'))
      expect(watches[0].sentryId).toBe(100)
      expect(watches[1].sentryId).toBe(200)
      expect(watches[2].sentryId).toBe(300)
    })

    it('同一sentryId可以有多个watch记录', () => {
      const watches = (sys as any).watches as NightWatch[]
      watches.push(makeWatch(1, 42, 'dusk'))
      watches.push(makeWatch(2, 42, 'midnight'))
      expect(watches.filter(w => w.sentryId === 42).length).toBe(2)
    })
  })
})
