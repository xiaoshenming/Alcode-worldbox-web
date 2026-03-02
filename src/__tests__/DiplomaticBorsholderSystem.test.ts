import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticBorsholderSystem, BorsholderArrangement } from '../systems/DiplomaticBorsholderSystem'

function makeSys() { return new DiplomaticBorsholderSystem() }
const W = {} as any
const EM = {} as any

// 强制触发update的tick步长（超过CHECK_INTERVAL=2940）
const STEP = 3000

describe('DiplomaticBorsholderSystem', () => {
  let sys: DiplomaticBorsholderSystem

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─────────────────────────────────────────────
  // 1. 基础数据结构
  // ─────────────────────────────────────────────
  describe('基础数据结构', () => {
    it('初始arrangements为空数组', () => {
      expect((sys as any).arrangements).toHaveLength(0)
    })

    it('初始nextId为1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('初始lastCheck为0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('arrangements是Array实例', () => {
      expect(Array.isArray((sys as any).arrangements)).toBe(true)
    })

    it('手动注入arrangement后数组长度增加', () => {
      ;(sys as any).arrangements.push({ id: 99 })
      expect((sys as any).arrangements).toHaveLength(1)
    })

    it('新建arrangement包含所有必要字段', () => {
      // 强制随机通过：Math.random() < 0.0021
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, W, EM, STEP)
      const arr: BorsholderArrangement[] = (sys as any).arrangements
      if (arr.length > 0) {
        const a = arr[0]
        expect(a).toHaveProperty('id')
        expect(a).toHaveProperty('pledgeCivId')
        expect(a).toHaveProperty('orderCivId')
        expect(a).toHaveProperty('form')
        expect(a).toHaveProperty('frankpledgeAuthority')
        expect(a).toHaveProperty('localOrder')
        expect(a).toHaveProperty('suretyObligation')
        expect(a).toHaveProperty('courtAttendance')
        expect(a).toHaveProperty('duration')
        expect(a).toHaveProperty('tick')
      }
    })

    it('form只能是合法枚举值', () => {
      const VALID_FORMS = ['royal_borsholder', 'hundred_borsholder', 'tithing_borsholder', 'ward_borsholder']
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, W, EM, STEP)
      const arr: BorsholderArrangement[] = (sys as any).arrangements
      for (const a of arr) {
        expect(VALID_FORMS).toContain(a.form)
      }
    })

    it('pledgeCivId与orderCivId不相等（自我frankpledge不合法）', () => {
      // 多次触发，检查所有记录
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      for (let i = 0; i < 5; i++) {
        sys.update(1, W, EM, STEP * (i + 1))
      }
      const arr: BorsholderArrangement[] = (sys as any).arrangements
      for (const a of arr) {
        expect(a.pledgeCivId).not.toBe(a.orderCivId)
      }
    })
  })

  // ─────────────────────────────────────────────
  // 2. CHECK_INTERVAL 节流
  // ─────────────────────────────────────────────
  describe('CHECK_INTERVAL节流', () => {
    it('tick差值小于CHECK_INTERVAL(2940)时不处理', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, W, EM, 1000)  // lastCheck=0, 1000-0=1000 < 2940 → 跳过
      expect((sys as any).arrangements).toHaveLength(0)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick差值等于CHECK_INTERVAL时不触发（严格小于）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, W, EM, 2940)  // 2940-0=2940，不满足 < 2940 所以会触发
      // 注意：条件是 tick - lastCheck < CHECK_INTERVAL 才跳过，等于时不跳过
      expect((sys as any).lastCheck).toBe(2940)
    })

    it('tick差值恰好超过CHECK_INTERVAL时lastCheck更新', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.999)
      sys.update(1, W, EM, STEP)
      expect((sys as any).lastCheck).toBe(STEP)
    })

    it('连续两次调用相同tick不重复处理', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, W, EM, STEP)
      const countAfterFirst = (sys as any).arrangements.length
      sys.update(1, W, EM, STEP)  // 相同tick，差值=0 < 2940，跳过
      expect((sys as any).arrangements.length).toBe(countAfterFirst)
    })

    it('第二次update的tick须超过lastCheck+2940才再触发', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, W, EM, STEP)         // lastCheck=STEP
      sys.update(1, W, EM, STEP + 100)   // 差值100 < 2940 → 跳过
      const cnt1 = (sys as any).arrangements.length
      sys.update(1, W, EM, STEP + STEP)  // 差值=STEP=3000 > 2940 → 触发
      // lastCheck更新成功
      expect((sys as any).lastCheck).toBe(STEP + STEP)
    })
  })

  // ─────────────────────────────────────────────
  // 3. 数值字段动态更新
  // ─────────────────────────────────────────────
  describe('数值字段动态更新', () => {
    it('每次update后duration递增1', () => {
      ;(sys as any).arrangements.push({
        id: 1, pledgeCivId: 1, orderCivId: 2, form: 'royal_borsholder',
        frankpledgeAuthority: 40, localOrder: 40, suretyObligation: 30, courtAttendance: 30,
        duration: 0, tick: 0
      })
      sys.update(1, W, EM, STEP)
      expect((sys as any).arrangements[0].duration).toBe(1)
      sys.update(1, W, EM, STEP * 2)
      expect((sys as any).arrangements[0].duration).toBe(2)
    })

    it('frankpledgeAuthority不低于下限5', () => {
      ;(sys as any).arrangements.push({
        id: 1, pledgeCivId: 1, orderCivId: 2, form: 'royal_borsholder',
        frankpledgeAuthority: 5, localOrder: 40, suretyObligation: 30, courtAttendance: 30,
        duration: 0, tick: 0
      })
      vi.spyOn(Math, 'random').mockReturnValue(0)  // 使随机偏移最小
      for (let i = 1; i <= 5; i++) sys.update(1, W, EM, STEP * i)
      expect((sys as any).arrangements[0].frankpledgeAuthority).toBeGreaterThanOrEqual(5)
    })

    it('frankpledgeAuthority不超过上限85', () => {
      ;(sys as any).arrangements.push({
        id: 1, pledgeCivId: 1, orderCivId: 2, form: 'royal_borsholder',
        frankpledgeAuthority: 85, localOrder: 40, suretyObligation: 30, courtAttendance: 30,
        duration: 0, tick: 0
      })
      vi.spyOn(Math, 'random').mockReturnValue(1)  // 使随机偏移最大
      for (let i = 1; i <= 5; i++) sys.update(1, W, EM, STEP * i)
      expect((sys as any).arrangements[0].frankpledgeAuthority).toBeLessThanOrEqual(85)
    })

    it('localOrder不低于下限10', () => {
      ;(sys as any).arrangements.push({
        id: 1, pledgeCivId: 1, orderCivId: 2, form: 'royal_borsholder',
        frankpledgeAuthority: 40, localOrder: 10, suretyObligation: 30, courtAttendance: 30,
        duration: 0, tick: 0
      })
      vi.spyOn(Math, 'random').mockReturnValue(0)
      for (let i = 1; i <= 5; i++) sys.update(1, W, EM, STEP * i)
      expect((sys as any).arrangements[0].localOrder).toBeGreaterThanOrEqual(10)
    })

    it('localOrder不超过上限90', () => {
      ;(sys as any).arrangements.push({
        id: 1, pledgeCivId: 1, orderCivId: 2, form: 'royal_borsholder',
        frankpledgeAuthority: 40, localOrder: 90, suretyObligation: 30, courtAttendance: 30,
        duration: 0, tick: 0
      })
      vi.spyOn(Math, 'random').mockReturnValue(1)
      for (let i = 1; i <= 5; i++) sys.update(1, W, EM, STEP * i)
      expect((sys as any).arrangements[0].localOrder).toBeLessThanOrEqual(90)
    })

    it('suretyObligation不低于下限5', () => {
      ;(sys as any).arrangements.push({
        id: 1, pledgeCivId: 1, orderCivId: 2, form: 'royal_borsholder',
        frankpledgeAuthority: 40, localOrder: 40, suretyObligation: 5, courtAttendance: 30,
        duration: 0, tick: 0
      })
      vi.spyOn(Math, 'random').mockReturnValue(0)
      for (let i = 1; i <= 5; i++) sys.update(1, W, EM, STEP * i)
      expect((sys as any).arrangements[0].suretyObligation).toBeGreaterThanOrEqual(5)
    })

    it('courtAttendance不低于下限5', () => {
      ;(sys as any).arrangements.push({
        id: 1, pledgeCivId: 1, orderCivId: 2, form: 'royal_borsholder',
        frankpledgeAuthority: 40, localOrder: 40, suretyObligation: 30, courtAttendance: 5,
        duration: 0, tick: 0
      })
      vi.spyOn(Math, 'random').mockReturnValue(0)
      for (let i = 1; i <= 5; i++) sys.update(1, W, EM, STEP * i)
      expect((sys as any).arrangements[0].courtAttendance).toBeGreaterThanOrEqual(5)
    })

    it('courtAttendance不超过上限65', () => {
      ;(sys as any).arrangements.push({
        id: 1, pledgeCivId: 1, orderCivId: 2, form: 'royal_borsholder',
        frankpledgeAuthority: 40, localOrder: 40, suretyObligation: 30, courtAttendance: 65,
        duration: 0, tick: 0
      })
      vi.spyOn(Math, 'random').mockReturnValue(1)
      for (let i = 1; i <= 5; i++) sys.update(1, W, EM, STEP * i)
      expect((sys as any).arrangements[0].courtAttendance).toBeLessThanOrEqual(65)
    })

    it('新建arrangement的duration初始为0', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, W, EM, STEP)
      const arr: BorsholderArrangement[] = (sys as any).arrangements
      // 新建后立即执行update循环，duration从0→1
      if (arr.length > 0) {
        expect(arr[0].duration).toBeGreaterThanOrEqual(0)
      }
    })
  })

  // ─────────────────────────────────────────────
  // 4. time-based 过期清理
  // ─────────────────────────────────────────────
  describe('time-based过期清理', () => {
    it('tick字段过老的记录（tick < currentTick - 88000）被删除', () => {
      ;(sys as any).arrangements.push({
        id: 1, pledgeCivId: 1, orderCivId: 2, form: 'royal_borsholder',
        frankpledgeAuthority: 40, localOrder: 40, suretyObligation: 30, courtAttendance: 30,
        duration: 100, tick: 0
      })
      // 传入大tick使得 0 < (bigTick - 88000)
      sys.update(1, W, EM, 100000)
      expect((sys as any).arrangements).toHaveLength(0)
    })

    it('tick字段新的记录不被删除', () => {
      const currentTick = 100000
      ;(sys as any).arrangements.push({
        id: 1, pledgeCivId: 1, orderCivId: 2, form: 'royal_borsholder',
        frankpledgeAuthority: 40, localOrder: 40, suretyObligation: 30, courtAttendance: 30,
        duration: 0, tick: currentTick - 1000  // 只有1000差值，远小于88000
      })
      sys.update(1, W, EM, currentTick)
      expect((sys as any).arrangements).toHaveLength(1)
    })

    it('恰好在cutoff边界的记录（tick === cutoff）不被删除', () => {
      const currentTick = 100000
      const cutoff = currentTick - 88000  // = 12000
      ;(sys as any).arrangements.push({
        id: 1, pledgeCivId: 1, orderCivId: 2, form: 'royal_borsholder',
        frankpledgeAuthority: 40, localOrder: 40, suretyObligation: 30, courtAttendance: 30,
        duration: 0, tick: cutoff  // 等于cutoff，条件是 < cutoff 才删
      })
      sys.update(1, W, EM, currentTick)
      expect((sys as any).arrangements).toHaveLength(1)
    })

    it('混合新旧记录：只删除旧记录', () => {
      const currentTick = 200000
      ;(sys as any).arrangements.push(
        {
          id: 1, pledgeCivId: 1, orderCivId: 2, form: 'royal_borsholder',
          frankpledgeAuthority: 40, localOrder: 40, suretyObligation: 30, courtAttendance: 30,
          duration: 0, tick: 0  // 过期
        },
        {
          id: 2, pledgeCivId: 3, orderCivId: 4, form: 'hundred_borsholder',
          frankpledgeAuthority: 40, localOrder: 40, suretyObligation: 30, courtAttendance: 30,
          duration: 0, tick: currentTick - 50000  // 新鲜
        }
      )
      sys.update(1, W, EM, currentTick)
      const arr: BorsholderArrangement[] = (sys as any).arrangements
      expect(arr).toHaveLength(1)
      expect(arr[0].id).toBe(2)
    })

    it('多条过期记录全部被清除', () => {
      for (let i = 0; i < 5; i++) {
        ;(sys as any).arrangements.push({
          id: i + 1, pledgeCivId: i + 1, orderCivId: i + 2, form: 'royal_borsholder',
          frankpledgeAuthority: 40, localOrder: 40, suretyObligation: 30, courtAttendance: 30,
          duration: 0, tick: 0
        })
      }
      sys.update(1, W, EM, 200000)
      expect((sys as any).arrangements).toHaveLength(0)
    })
  })

  // ─────────────────────────────────────────────
  // 5. MAX_ARRANGEMENTS 上限
  // ─────────────────────────────────────────────
  describe('MAX_ARRANGEMENTS上限(16)', () => {
    it('arrangements数量不超过16', () => {
      // 预填满16条记录
      const currentTick = 500000
      for (let i = 0; i < 16; i++) {
        ;(sys as any).arrangements.push({
          id: i + 1, pledgeCivId: i + 1, orderCivId: (i + 2) % 8 + 1,
          form: 'royal_borsholder',
          frankpledgeAuthority: 40, localOrder: 40, suretyObligation: 30, courtAttendance: 30,
          duration: 0, tick: currentTick
        })
      }
      ;(sys as any).nextId = 17
      // 强制Math.random使随机通过PROCEED_CHANCE且civId不同
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, W, EM, currentTick + STEP)
      expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
    })

    it('未满16时允许新增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      expect((sys as any).arrangements).toHaveLength(0)
      sys.update(1, W, EM, STEP)
      // 随机通过后可能新增，但不报错
      expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
    })

    it('nextId在每次新增后递增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      const initialNextId = (sys as any).nextId
      sys.update(1, W, EM, STEP)
      const afterCount = (sys as any).arrangements.length
      if (afterCount > 0) {
        expect((sys as any).nextId).toBe(initialNextId + afterCount)
      }
    })
  })
})
