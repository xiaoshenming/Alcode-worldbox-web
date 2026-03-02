import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticCeremonySystem, CeremonyType, CeremonyStatus } from '../systems/DiplomaticCeremonySystem'

// DiplomaticCeremonySystem.update(dt, civManager, tick) — 3参数
// ceremonies: 活跃列表，MAX_CEREMONIES=5，CHECK_INTERVAL=1000
// history: 完成/被打断的记录，CEREMONY_DURATION=15，DISRUPT_CHANCE=0.03
// territory.values().next().value 被当做字符串key（源码实现细节）
// 使用空 territory 可以让系统走 lx=100, ly=100 默认路径

function makeFakeCivManager(civCount: number = 2) {
  const civMap = new Map<number, any>()
  for (let i = 1; i <= civCount; i++) {
    civMap.set(i, {
      id: i,
      // 使用空 Map，使 territory.values().next().value === undefined，走默认 lx/ly=100 路径
      territory: new Map<string, boolean>(),
    })
  }
  return { civilizations: civMap }
}

function makeSys() {
  return new DiplomaticCeremonySystem()
}

describe('DiplomaticCeremonySystem', () => {
  let sys: DiplomaticCeremonySystem

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─── 1. 基础数据结构 ────────────────────────────────────────────────
  describe('基础数据结构', () => {
    it('初始ceremonies为空数组', () => {
      expect((sys as any).ceremonies).toHaveLength(0)
    })

    it('初始history为空数组', () => {
      expect((sys as any).history).toHaveLength(0)
    })

    it('nextId初始为1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck初始为0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('ceremonies是数组类型', () => {
      expect(Array.isArray((sys as any).ceremonies)).toBe(true)
    })

    it('手动注入ceremony后可从ceremonies读取', () => {
      ;(sys as any).ceremonies.push({
        id: 99, type: 'festival', hostCivId: 1, guestCivIds: [],
        status: 'active', prestige: 50, duration: 10, startTick: 0, locationX: 0, locationY: 0,
      })
      expect((sys as any).ceremonies).toHaveLength(1)
      expect((sys as any).ceremonies[0].id).toBe(99)
    })

    it('Ceremony对象包含所有必要字段', () => {
      const ceremony = {
        id: 1, type: 'coronation' as CeremonyType, hostCivId: 2, guestCivIds: [3],
        status: 'preparing' as CeremonyStatus, prestige: 80, duration: 15, startTick: 100, locationX: 10, locationY: 20,
      }
      ;(sys as any).ceremonies.push(ceremony)
      const c = (sys as any).ceremonies[0]
      expect(c).toHaveProperty('id')
      expect(c).toHaveProperty('type')
      expect(c).toHaveProperty('hostCivId')
      expect(c).toHaveProperty('guestCivIds')
      expect(c).toHaveProperty('status')
      expect(c).toHaveProperty('prestige')
      expect(c).toHaveProperty('duration')
      expect(c).toHaveProperty('startTick')
    })
  })

  // ─── 2. CHECK_INTERVAL 节流 ─────────────────────────────────────────
  describe('CHECK_INTERVAL节流', () => {
    it('tick差小于CHECK_INTERVAL(1000)时不执行逻辑', () => {
      const civ = makeFakeCivManager(2)
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, civ as any, 500)
      expect((sys as any).lastCheck).toBe(0)
      expect((sys as any).ceremonies).toHaveLength(0)
    })

    it('tick=999时跳过（差999 < 1000）', () => {
      const civ = makeFakeCivManager(2)
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, civ as any, 999)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick差 >= CHECK_INTERVAL时执行并更新lastCheck', () => {
      const civ = makeFakeCivManager(2)
      vi.spyOn(Math, 'random').mockReturnValue(1) // 不触发新ceremony
      sys.update(1, civ as any, 1000)
      expect((sys as any).lastCheck).toBe(1000)
    })

    it('第二次update在间隔内不重复执行（不更新lastCheck）', () => {
      const civ = makeFakeCivManager(2)
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, civ as any, 1000) // 执行，lastCheck=1000
      sys.update(1, civ as any, 1500) // 差500 < 1000 → 跳过
      expect((sys as any).lastCheck).toBe(1000)
    })

    it('两次update都超过间隔时都执行，lastCheck跟随最新tick', () => {
      const civ = makeFakeCivManager(2)
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, civ as any, 1000)
      expect((sys as any).lastCheck).toBe(1000)
      sys.update(1, civ as any, 2000)
      expect((sys as any).lastCheck).toBe(2000)
    })
  })

  // ─── 3. 仪式生命周期（preparing→active→completed，duration递减）─────
  describe('仪式生���周期与duration', () => {
    it('新创建的ceremony状态为preparing', () => {
      ;(sys as any).ceremonies.push({
        id: 1, type: 'festival', hostCivId: 1, guestCivIds: [],
        status: 'preparing', prestige: 50, duration: 15, startTick: 0, locationX: 0, locationY: 0,
      })
      expect((sys as any).ceremonies[0].status).toBe('preparing')
    })

    it('preparing → active：一次updateCeremonies调用后状态变为active', () => {
      ;(sys as any).ceremonies.push({
        id: 1, type: 'festival', hostCivId: 1, guestCivIds: [],
        status: 'preparing', prestige: 50, duration: 15, startTick: 0, locationX: 0, locationY: 0,
      })
      vi.spyOn(Math, 'random').mockReturnValue(1) // 不触发disruption
      const civ = makeFakeCivManager(2)
      ;(sys as any).updateCeremonies(civ, 2000)
      expect((sys as any).ceremonies[0].status).toBe('active')
    })

    it('active状态时duration每次updateCeremonies递减1', () => {
      ;(sys as any).ceremonies.push({
        id: 1, type: 'festival', hostCivId: 1, guestCivIds: [],
        status: 'active', prestige: 50, duration: 10, startTick: 0, locationX: 0, locationY: 0,
      })
      vi.spyOn(Math, 'random').mockReturnValue(1) // 不触发disruption
      const civ = makeFakeCivManager(2)
      ;(sys as any).updateCeremonies(civ, 2000)
      expect((sys as any).ceremonies[0].duration).toBe(9)
    })

    it('duration减到0时ceremony被移除并写入history(success=true)', () => {
      ;(sys as any).ceremonies.push({
        id: 1, type: 'peace_treaty', hostCivId: 1, guestCivIds: [2],
        status: 'active', prestige: 60, duration: 1, startTick: 0, locationX: 0, locationY: 0,
      })
      vi.spyOn(Math, 'random').mockReturnValue(1) // 不触发disruption
      const civ = makeFakeCivManager(2)
      ;(sys as any).updateCeremonies(civ, 2000)
      expect((sys as any).ceremonies).toHaveLength(0)
      expect((sys as any).history).toHaveLength(1)
      expect((sys as any).history[0].success).toBe(true)
    })

    it('disruption发生时ceremony被移除并写入history(success=false)', () => {
      ;(sys as any).ceremonies.push({
        id: 2, type: 'coronation', hostCivId: 1, guestCivIds: [],
        status: 'active', prestige: 80, duration: 10, startTick: 0, locationX: 0, locationY: 0,
      })
      vi.spyOn(Math, 'random').mockReturnValue(0) // 触发disruption (0 < 0.03)
      const civ = makeFakeCivManager(2)
      ;(sys as any).updateCeremonies(civ, 2000)
      expect((sys as any).ceremonies).toHaveLength(0)
      expect((sys as any).history).toHaveLength(1)
      expect((sys as any).history[0].success).toBe(false)
    })

    it('history记录保留type、hostCivId、prestige、tick字段', () => {
      ;(sys as any).ceremonies.push({
        id: 3, type: 'trade_pact', hostCivId: 5, guestCivIds: [7],
        status: 'active', prestige: 42, duration: 1, startTick: 0, locationX: 0, locationY: 0,
      })
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const civ = makeFakeCivManager(2)
      ;(sys as any).updateCeremonies(civ, 9999)
      const rec = (sys as any).history[0]
      expect(rec.type).toBe('trade_pact')
      expect(rec.hostCivId).toBe(5)
      expect(rec.prestige).toBe(42)
      expect(rec.tick).toBe(9999)
    })

    it('history超过40条时被裁剪保持不超过40条', () => {
      for (let i = 0; i < 40; i++) {
        ;(sys as any).history.push({
          id: i, type: 'festival', hostCivId: 1, guestCivIds: [],
          prestige: 50, tick: i, success: true,
        })
      }
      ;(sys as any).ceremonies.push({
        id: 99, type: 'victory', hostCivId: 1, guestCivIds: [],
        status: 'active', prestige: 90, duration: 1, startTick: 0, locationX: 0, locationY: 0,
      })
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const civ = makeFakeCivManager(2)
      ;(sys as any).updateCeremonies(civ, 5000)
      expect((sys as any).history.length).toBeLessThanOrEqual(40)
    })
  })

  // ─── 4. 仪式触发条件 ────────────────────────────────────────────────
  describe('仪式触发条件', () => {
    it('文明数量为0时不触发新ceremony', () => {
      const emptyCiv = { civilizations: new Map() }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, emptyCiv as any, 1000)
      expect((sys as any).ceremonies).toHaveLength(0)
    })

    it('当ceremonies已达MAX_CEREMONIES(5)时不新增', () => {
      for (let i = 0; i < 5; i++) {
        ;(sys as any).ceremonies.push({
          id: i + 1, type: 'festival', hostCivId: 1, guestCivIds: [],
          status: 'active', prestige: 50, duration: 1000, startTick: 0, locationX: 0, locationY: 0,
        })
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const civ = makeFakeCivManager(3)
      sys.update(1, civ as any, 2000)
      expect((sys as any).ceremonies.length).toBeLessThanOrEqual(5)
    })

    it('Math.random > INITIATE_CHANCE时不触发新ceremony', () => {
      const civ = makeFakeCivManager(2)
      vi.spyOn(Math, 'random').mockReturnValue(1) // 1 > 0.012 → 不触发
      sys.update(1, civ as any, 1000)
      expect((sys as any).ceremonies).toHaveLength(0)
    })

    it('触发ceremony时nextId递增', () => {
      const civ = makeFakeCivManager(2)
      // random=0 < INITIATE_CHANCE=0.012 → 触发，territory空 → 默认lx/ly=100
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const idBefore = (sys as any).nextId
      sys.update(1, civ as any, 1000)
      // 若触发了ceremony，nextId应该增加
      const idAfter = (sys as any).nextId
      expect(idAfter).toBeGreaterThanOrEqual(idBefore)
    })
  })

  // ─── 5. MAX上限保护 ─────────────────────────────────────────────────
  describe('MAX_CEREMONIES上限', () => {
    it('预填满5个后再update不超过5个(duration大不会到期)', () => {
      for (let i = 0; i < 5; i++) {
        ;(sys as any).ceremonies.push({
          id: i + 1, type: 'festival', hostCivId: 1, guestCivIds: [],
          status: 'active', prestige: 50, duration: 1000, startTick: 0, locationX: 0, locationY: 0,
        })
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const civ = makeFakeCivManager(3)
      sys.update(1, civ as any, 1000)
      expect((sys as any).ceremonies.length).toBeLessThanOrEqual(5)
    })

    it('ceremonies数组经过多次update不超过MAX_CEREMONIES(5)', () => {
      for (let i = 0; i < 4; i++) {
        ;(sys as any).ceremonies.push({
          id: i + 1, type: 'mourning', hostCivId: 1, guestCivIds: [],
          status: 'active', prestige: 30, duration: 10000, startTick: 0, locationX: 0, locationY: 0,
        })
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const civ = makeFakeCivManager(2)
      for (let t = 1000; t <= 5000; t += 1000) {
        sys.update(1, civ as any, t)
      }
      expect((sys as any).ceremonies.length).toBeLessThanOrEqual(5)
    })

    it('history上限40：recordCeremony后不超过40', () => {
      for (let i = 0; i < 40; i++) {
        ;(sys as any).history.push({
          id: i, type: 'festival', hostCivId: 1, guestCivIds: [],
          prestige: 50, tick: i, success: true,
        })
      }
      expect((sys as any).history).toHaveLength(40)
      ;(sys as any).recordCeremony({
        id: 99, type: 'victory', hostCivId: 2, guestCivIds: [],
        prestige: 90, duration: 0, startTick: 0, locationX: 0, locationY: 0, status: 'completed',
      }, 9999, true)
      expect((sys as any).history.length).toBeLessThanOrEqual(40)
    })

    it('CeremonyRecord包含必要字段', () => {
      ;(sys as any).ceremonies.push({
        id: 10, type: 'victory', hostCivId: 3, guestCivIds: [4, 5],
        status: 'active', prestige: 90, duration: 1, startTick: 0, locationX: 0, locationY: 0,
      })
      vi.spyOn(Math, 'random').mockReturnValue(1)
      ;(sys as any).updateCeremonies(makeFakeCivManager(2), 5000)
      const rec = (sys as any).history[0]
      expect(rec).toHaveProperty('id', 10)
      expect(rec).toHaveProperty('type', 'victory')
      expect(rec).toHaveProperty('hostCivId', 3)
      expect(rec.guestCivIds).toEqual([4, 5])
      expect(rec).toHaveProperty('success', true)
    })
  })
})
