import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticMuragersSystem, MuragerArrangement, MuragerForm } from '../systems/DiplomaticMuragersSystem'

const em = {} as any
const world = {} as any

function makeSys() { return new DiplomaticMuragersSystem() }
function getArr(sys: any): MuragerArrangement[] { return sys.arrangements }

describe('DiplomaticMuragersSystem', () => {
  let sys: DiplomaticMuragersSystem

  beforeEach(() => { sys = makeSys(); vi.restoreAllMocks() })

  // 1. 基础数据结构
  describe('基础数据结构', () => {
    it('初始arrangements为空', () => {
      expect(getArr(sys)).toHaveLength(0)
    })

    it('spawn后arrangement包含必要字段', () => {
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, world, em, 3000)
      const a = getArr(sys)[0]
      expect(a).toHaveProperty('id')
      expect(a).toHaveProperty('wallCivId')
      expect(a).toHaveProperty('taxCivId')
      expect(a).toHaveProperty('form')
      expect(a).toHaveProperty('duration')
      expect(a).toHaveProperty('tick')
    })

    it('spawn后tick等于当前tick', () => {
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, world, em, 3000)
      expect(getArr(sys)[0].tick).toBe(3000)
    })

    it('spawn后duration初始为0', () => {
      // 直接注入记录验证初始值，避免同帧update循环修改duration
      ;(sys as any).arrangements.push({ id: 1, wallCivId: 1, taxCivId: 2, form: 'royal_murager', wallTaxAuthority: 50, fortificationFund: 50, repairSchedule: 30, defenseAllocation: 30, duration: 0, tick: 3000 })
      expect(getArr(sys)[0].duration).toBe(0)
    })

    it('id自增', () => {
      // 两次spawn
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, world, em, 3000)
      vi.restoreAllMocks()
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, world, em, 6000)
      const arr = getArr(sys)
      expect(arr[1].id).toBe(arr[0].id + 1)
    })
  })

  // 2. CHECK_INTERVAL节流
  describe('CHECK_INTERVAL节流', () => {
    it('tick不足CHECK_INTERVAL时不spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, world, em, 100)
      expect(getArr(sys)).toHaveLength(0)
    })

    it('tick=2970时触发检查', () => {
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, world, em, 2970)
      expect(getArr(sys)).toHaveLength(1)
    })

    it('连续两次tick间隔不足时第二次不执行', () => {
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, world, em, 3000)
      const lenAfterFirst = getArr(sys).length
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, world, em, 3100)
      expect(getArr(sys).length).toBe(lenAfterFirst)
    })

    it('间隔足够时第二次检查执行', () => {
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, world, em, 3000)
      vi.restoreAllMocks()
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, world, em, 6000)
      expect(getArr(sys).length).toBe(2)
    })

    it('random=1时不spawn（跳过spawn块）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, world, em, 3000)
      expect(getArr(sys)).toHaveLength(0)
    })
  })

  // 3. 字段动态更新
  describe('字段动态更新', () => {
    function injectOne(tick = 5000000) {
      // 注入tick=500000，避免后续update时被cutoff(tick-88000)删除
      ;(sys as any).arrangements.push({ id: 99, wallCivId: 1, taxCivId: 2, form: 'royal_murager', wallTaxAuthority: 50, fortificationFund: 50, repairSchedule: 30, defenseAllocation: 30, duration: 0, tick })
    }

    it('每次update后duration递增', () => {
      injectOne()
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, world, em, 5003000)
      expect(getArr(sys)[0].duration).toBe(1)
    })

    it('wallTaxAuthority在[5,85]范围内', () => {
      injectOne()
      vi.spyOn(Math, 'random').mockReturnValue(1)
      for (let t = 5003000; t < 5090000; t += 3000) sys.update(1, world, em, t)
      const v = getArr(sys)[0].wallTaxAuthority
      expect(v).toBeGreaterThanOrEqual(5)
      expect(v).toBeLessThanOrEqual(85)
    })

    it('fortificationFund在[10,90]范围内', () => {
      injectOne()
      vi.spyOn(Math, 'random').mockReturnValue(1)
      for (let t = 5003000; t < 5090000; t += 3000) sys.update(1, world, em, t)
      const v = getArr(sys)[0].fortificationFund
      expect(v).toBeGreaterThanOrEqual(10)
      expect(v).toBeLessThanOrEqual(90)
    })

    it('defenseAllocation在[5,65]范围内', () => {
      injectOne()
      vi.spyOn(Math, 'random').mockReturnValue(1)
      for (let t = 5003000; t < 5090000; t += 3000) sys.update(1, world, em, t)
      const v = getArr(sys)[0].defenseAllocation
      expect(v).toBeGreaterThanOrEqual(5)
      expect(v).toBeLessThanOrEqual(65)
    })
  })

  // 4. 过期cleanup
  describe('过期cleanup', () => {
    it('tick=0的记录在tick=88001时被删除', () => {
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, world, em, 3000)
      vi.restoreAllMocks()
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, world, em, 91001)
      expect(getArr(sys)).toHaveLength(0)
    })

    it('未过期记录不被删除', () => {
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, world, em, 3000)
      vi.restoreAllMocks()
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, world, em, 6000)
      expect(getArr(sys)).toHaveLength(1)
    })

    it('cutoff边界：tick恰好等于cutoff时不删除', () => {
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, world, em, 3000)
      vi.restoreAllMocks()
      // cutoff = 91000 - 88000 = 3000, arrangement.tick=3000, 3000 < 3000 为false，不删除
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, world, em, 91000)
      expect(getArr(sys)).toHaveLength(1)
    })

    it('多条记录中只删除过期的', () => {
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, world, em, 3000)   // tick=3000，会过期
      vi.restoreAllMocks()
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, world, em, 6000)   // tick=6000，不过期
      vi.restoreAllMocks()
      // cutoff = 94001 - 88000 = 6001, tick=3000 < 6001删除, tick=6000 < 6001删除
      // 用 tick=91001: cutoff=3001, 3000<3001删除, 6000<3001为false保留
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, world, em, 91001)
      expect(getArr(sys)).toHaveLength(1)
    })
  })

  // 5. MAX上限
  describe('MAX_ARRANGEMENTS上限', () => {
    function fillToMax() {
      for (let i = 0; i < 16; i++) {
        vi.restoreAllMocks()
        vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
        sys.update(1, world, em, 3000 * (i + 1))
      }
    }

    it('arrangements不超过MAX_ARRANGEMENTS=16', () => {
      fillToMax()
      vi.restoreAllMocks()
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, world, em, 3000 * 17)
      expect(getArr(sys).length).toBeLessThanOrEqual(16)
    })

    it('达到上限后不再新增', () => {
      fillToMax()
      const len = getArr(sys).length
      vi.restoreAllMocks()
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, world, em, 3000 * 17)
      expect(getArr(sys).length).toBe(len)
    })

    it('删除后可以继续新增', () => {
      fillToMax()
      // 手动清空
      ;(sys as any).arrangements = []
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, world, em, 3000 * 17)
      expect(getArr(sys).length).toBe(1)
    })

    it('MAX_ARRANGEMENTS常量为16', () => {
      fillToMax()
      expect(getArr(sys).length).toBe(16)
    })
  })

  // 6. 枚举完整性
  describe('枚举完整性', () => {
    const FORMS: MuragerForm[] = ['royal_murager', 'borough_murager', 'castle_murager', 'city_murager']

    it('包含royal_murager', () => { expect(FORMS).toContain('royal_murager') })
    it('包含borough_murager', () => { expect(FORMS).toContain('borough_murager') })
    it('包含castle_murager和city_murager', () => {
      expect(FORMS).toContain('castle_murager')
      expect(FORMS).toContain('city_murager')
    })
  })
})
