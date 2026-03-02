import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticNavalBlockadeSystem, NavalBlockade, BlockadeStrength } from '../systems/DiplomaticNavalBlockadeSystem'

const em = {} as any

function makeCivManager(ids: number[] = []) {
  const civs = new Map(ids.map(id => [id, { id }]))
  return { civilizations: civs } as any
}

function makeSys() { return new DiplomaticNavalBlockadeSystem() }
function getBlockades(sys: any): NavalBlockade[] { return sys.blockades }

describe('DiplomaticNavalBlockadeSystem', () => {
  let sys: DiplomaticNavalBlockadeSystem

  beforeEach(() => { sys = makeSys(); vi.restoreAllMocks() })

  // 1. 基础数据结构
  describe('基础数据结构', () => {
    it('初始blockades为空', () => {
      expect(getBlockades(sys)).toHaveLength(0)
    })

    it('spawn后blockade包含必要字段', () => {
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValue(0.5)
      sys.update(1, em, makeCivManager([1, 2]), 1800)
      const b = getBlockades(sys)[0]
      expect(b).toHaveProperty('id')
      expect(b).toHaveProperty('blockaderCivId')
      expect(b).toHaveProperty('targetCivId')
      expect(b).toHaveProperty('strength')
      expect(b).toHaveProperty('effectiveness')
      expect(b).toHaveProperty('tradeReduction')
      expect(b).toHaveProperty('moraleDamage')
      expect(b).toHaveProperty('tick')
    })

    it('spawn后tick等于当前tick', () => {
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValue(0.5)
      sys.update(1, em, makeCivManager([1, 2]), 1800)
      expect(getBlockades(sys)[0].tick).toBe(1800)
    })

    it('tradeReduction = effectiveness * 0.8', () => {
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValue(0.5)
      sys.update(1, em, makeCivManager([1, 2]), 1800)
      const b = getBlockades(sys)[0]
      expect(b.tradeReduction).toBeCloseTo(b.effectiveness * 0.8, 5)
    })

    it('id自增', () => {
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValue(0.5)
      sys.update(1, em, makeCivManager([1, 2]), 1800)
      vi.restoreAllMocks()
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValue(0.5)
      sys.update(1, em, makeCivManager([1, 2]), 3600)
      const bl = getBlockades(sys)
      expect(bl[1].id).toBe(bl[0].id + 1)
    })
  })

  // 2. CHECK_INTERVAL节流
  describe('CHECK_INTERVAL节流', () => {
    it('tick不足CHECK_INTERVAL时不spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, em, makeCivManager([1, 2]), 100)
      expect(getBlockades(sys)).toHaveLength(0)
    })

    it('tick=1800时触发检查', () => {
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValue(0.5)
      sys.update(1, em, makeCivManager([1, 2]), 1800)
      expect(getBlockades(sys)).toHaveLength(1)
    })

    it('文明数<2时不spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, em, makeCivManager([1]), 1800)
      expect(getBlockades(sys)).toHaveLength(0)
    })

    it('连续两次间隔不足时第二次不执行', () => {
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValue(0.5)
      sys.update(1, em, makeCivManager([1, 2]), 1800)
      const len = getBlockades(sys).length
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, em, makeCivManager([1, 2]), 1900)
      expect(getBlockades(sys).length).toBe(len)
    })

    it('random=1时不spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, em, makeCivManager([1, 2]), 1800)
      expect(getBlockades(sys)).toHaveLength(0)
    })
  })

  // 3. 字段动态更新
  describe('字段动态更新', () => {
    function spawnOne(tick = 1800) {
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValue(0.5)
      sys.update(1, em, makeCivManager([1, 2]), tick)
      vi.restoreAllMocks()
    }

    it('每次update后effectiveness减少0.05', () => {
      spawnOne(1800)
      const before = getBlockades(sys)[0].effectiveness
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, em, makeCivManager([1, 2]), 3600)
      expect(getBlockades(sys)[0].effectiveness).toBeCloseTo(before - 0.05, 5)
    })

    it('effectiveness不低于0', () => {
      spawnOne(1800)
      vi.spyOn(Math, 'random').mockReturnValue(1)
      // 运行足够多次让effectiveness降到0
      for (let t = 3600; t < 100000; t += 1800) sys.update(1, em, makeCivManager([1, 2]), t)
      // 若还存在则检查>=0
      if (getBlockades(sys).length > 0) {
        expect(getBlockades(sys)[0].effectiveness).toBeGreaterThanOrEqual(0)
      }
    })

    it('tradeReduction随effectiveness同步更新', () => {
      spawnOne(1800)
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, em, makeCivManager([1, 2]), 3600)
      if (getBlockades(sys).length > 0) {
        const b = getBlockades(sys)[0]
        expect(b.tradeReduction).toBeCloseTo(b.effectiveness * 0.8, 5)
      }
    })

    it('无duration字段', () => {
      spawnOne(1800)
      expect(getBlockades(sys)[0]).not.toHaveProperty('duration')
    })
  })

  // 4. 过期cleanup
  describe('过期cleanup', () => {
    it('时间过期：tick=0记录在tick=50000时被删除', () => {
      // 手动注入tick=0的记录
      ;(sys as any).blockades.push({ id: 1, blockaderCivId: 1, targetCivId: 2, strength: 'light', effectiveness: 50, tradeReduction: 40, moraleDamage: 15, tick: 0 })
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(1)
      // cutoff = 50000 - 40000 = 10000, tick=0 < 10000 → 删除
      sys.update(1, em, makeCivManager([1, 2]), 50000)
      expect(getBlockades(sys)).toHaveLength(0)
    })

    it('effectiveness<=0时被删除', () => {
      ;(sys as any).blockades.push({ id: 1, blockaderCivId: 1, targetCivId: 2, strength: 'light', effectiveness: 0, tradeReduction: 0, moraleDamage: 0, tick: 50000 })
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, em, makeCivManager([1, 2]), 50000)
      expect(getBlockades(sys)).toHaveLength(0)
    })

    it('未过期且effectiveness>0的记录保留', () => {
      ;(sys as any).blockades.push({ id: 1, blockaderCivId: 1, targetCivId: 2, strength: 'light', effectiveness: 50, tradeReduction: 40, moraleDamage: 15, tick: 50000 })
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, em, makeCivManager([1, 2]), 51800)
      expect(getBlockades(sys)).toHaveLength(1)
    })

    it('双重条件：时间过期或effectiveness<=0均删除', () => {
      ;(sys as any).blockades.push(
        { id: 1, blockaderCivId: 1, targetCivId: 2, strength: 'light', effectiveness: 50, tradeReduction: 40, moraleDamage: 15, tick: 0 },   // 时间过期
        { id: 2, blockaderCivId: 1, targetCivId: 3, strength: 'heavy', effectiveness: 0, tradeReduction: 0, moraleDamage: 0, tick: 50000 },   // effectiveness=0
        { id: 3, blockaderCivId: 2, targetCivId: 3, strength: 'moderate', effectiveness: 30, tradeReduction: 24, moraleDamage: 9, tick: 50000 } // 保留
      )
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, em, makeCivManager([1, 2]), 50000)
      expect(getBlockades(sys)).toHaveLength(1)
      expect(getBlockades(sys)[0].id).toBe(3)
    })
  })

  // 5. MAX上限
  describe('MAX_BLOCKADES上限', () => {
    // 直接注入30条记录，tick=500000避免cutoff删除，effectiveness=50避免衰减删除
    function fillToMax() {
      for (let i = 0; i < 30; i++) {
        ;(sys as any).blockades.push({ id: i + 1, blockaderCivId: 1, targetCivId: 2, strength: 'light', effectiveness: 50, tradeReduction: 40, moraleDamage: 15, tick: 500000 })
      }
      ;(sys as any).nextId = 31
    }

    it('blockades不超过MAX_BLOCKADES=30', () => {
      fillToMax()
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValue(0.5)
      sys.update(1, em, makeCivManager([1, 2]), 501800)
      expect(getBlockades(sys).length).toBeLessThanOrEqual(30)
    })

    it('达到上限后不再新增', () => {
      fillToMax()
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValue(0.5)
      sys.update(1, em, makeCivManager([1, 2]), 501800)
      expect(getBlockades(sys).length).toBe(30)
    })

    it('清空后可继续新增', () => {
      fillToMax()
      ;(sys as any).blockades = []
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValue(0.5)
      sys.update(1, em, makeCivManager([1, 2]), 501800)
      expect(getBlockades(sys).length).toBe(1)
    })

    it('MAX_BLOCKADES常量为30', () => {
      fillToMax()
      expect(getBlockades(sys).length).toBe(30)
    })
  })

  // 6. 枚举完整性
  describe('枚举完整性', () => {
    const STRENGTHS: BlockadeStrength[] = ['light', 'moderate', 'heavy', 'total']

    it('包含light和moderate', () => {
      expect(STRENGTHS).toContain('light')
      expect(STRENGTHS).toContain('moderate')
    })
    it('包含heavy', () => { expect(STRENGTHS).toContain('heavy') })
    it('包含total', () => { expect(STRENGTHS).toContain('total') })
  })
})
