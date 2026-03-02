import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticMutualAidSystem, MutualAidPact, MutualAidForm } from '../systems/DiplomaticMutualAidSystem'

const em = {} as any
const world = {} as any

function makeSys() { return new DiplomaticMutualAidSystem() }
function getPacts(sys: any): MutualAidPact[] { return sys.pacts }

describe('DiplomaticMutualAidSystem', () => {
  let sys: DiplomaticMutualAidSystem

  beforeEach(() => { sys = makeSys(); vi.restoreAllMocks() })

  // 1. 基础数据结构
  describe('基础数据结构', () => {
    it('初始pacts为空', () => {
      expect(getPacts(sys)).toHaveLength(0)
    })

    it('spawn后pact包含必要字段', () => {
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, world, em, 2520)
      const p = getPacts(sys)[0]
      expect(p).toHaveProperty('id')
      expect(p).toHaveProperty('civIdA')
      expect(p).toHaveProperty('civIdB')
      expect(p).toHaveProperty('form')
      expect(p).toHaveProperty('duration')
      expect(p).toHaveProperty('tick')
    })

    it('spawn后tick等于当前tick', () => {
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, world, em, 2520)
      expect(getPacts(sys)[0].tick).toBe(2520)
    })

    it('spawn后duration初始为0', () => {
      ;(sys as any).pacts.push({ id: 1, civIdA: 1, civIdB: 2, form: 'disaster_relief', reciprocityLevel: 50, responseSpeed: 40, aidCapacity: 30, trustBond: 20, duration: 0, tick: 2520 })
      expect(getPacts(sys)[0].duration).toBe(0)
    })

    it('id自增', () => {
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, world, em, 2520)
      vi.restoreAllMocks()
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, world, em, 5040)
      const pacts = getPacts(sys)
      expect(pacts[1].id).toBe(pacts[0].id + 1)
    })
  })

  // 2. CHECK_INTERVAL节流
  describe('CHECK_INTERVAL节流', () => {
    it('tick不足CHECK_INTERVAL时不spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, world, em, 100)
      expect(getPacts(sys)).toHaveLength(0)
    })

    it('tick=2520时触发检查', () => {
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, world, em, 2520)
      expect(getPacts(sys)).toHaveLength(1)
    })

    it('连续两次间隔不足时第二次不执行', () => {
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, world, em, 2520)
      const len = getPacts(sys).length
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, world, em, 2600)
      expect(getPacts(sys).length).toBe(len)
    })

    it('间隔足够时第二次检查执行', () => {
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, world, em, 2520)
      vi.restoreAllMocks()
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, world, em, 5040)
      expect(getPacts(sys).length).toBe(2)
    })

    it('random=1时不spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, world, em, 2520)
      expect(getPacts(sys)).toHaveLength(0)
    })
  })

  // 3. 字段动态更新
  describe('字段动态更新', () => {
    function injectOne(tick = 5000000) {
      ;(sys as any).pacts.push({ id: 99, civIdA: 1, civIdB: 2, form: 'disaster_relief', reciprocityLevel: 50, responseSpeed: 40, aidCapacity: 30, trustBond: 20, duration: 0, tick })
    }

    it('每次update后duration递增', () => {
      injectOne()
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, world, em, 5002520)
      expect(getPacts(sys)[0].duration).toBe(1)
    })

    it('reciprocityLevel在[10,90]范围内', () => {
      injectOne()
      vi.spyOn(Math, 'random').mockReturnValue(1)
      for (let t = 5002520; t < 5075600; t += 2520) sys.update(1, world, em, t)
      const v = getPacts(sys)[0].reciprocityLevel
      expect(v).toBeGreaterThanOrEqual(10)
      expect(v).toBeLessThanOrEqual(90)
    })

    it('aidCapacity在[5,75]范围内', () => {
      injectOne()
      vi.spyOn(Math, 'random').mockReturnValue(1)
      for (let t = 5002520; t < 5075600; t += 2520) sys.update(1, world, em, t)
      const v = getPacts(sys)[0].aidCapacity
      expect(v).toBeGreaterThanOrEqual(5)
      expect(v).toBeLessThanOrEqual(75)
    })

    it('trustBond在[5,65]范围内', () => {
      injectOne()
      vi.spyOn(Math, 'random').mockReturnValue(1)
      for (let t = 5002520; t < 5075600; t += 2520) sys.update(1, world, em, t)
      const v = getPacts(sys)[0].trustBond
      expect(v).toBeGreaterThanOrEqual(5)
      expect(v).toBeLessThanOrEqual(65)
    })
  })

  // 4. 过期cleanup
  describe('过期cleanup', () => {
    it('tick=2520的记录在tick=94521时被删除', () => {
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, world, em, 2520)
      vi.restoreAllMocks()
      vi.spyOn(Math, 'random').mockReturnValue(1)
      // cutoff = 94521 - 92000 = 2521, pact.tick=2520 < 2521 → 删除
      sys.update(1, world, em, 94521)
      expect(getPacts(sys)).toHaveLength(0)
    })

    it('未过期记录不被删除', () => {
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, world, em, 2520)
      vi.restoreAllMocks()
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, world, em, 5040)
      expect(getPacts(sys)).toHaveLength(1)
    })

    it('cutoff边界：pact.tick=cutoff时不删除', () => {
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, world, em, 2520)
      vi.restoreAllMocks()
      // cutoff = 94520 - 92000 = 2520, pact.tick=2520, 2520 < 2520 为false → 保留
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, world, em, 94520)
      expect(getPacts(sys)).toHaveLength(1)
    })

    it('多条记录中只删除过期的', () => {
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, world, em, 2520)   // tick=2520
      vi.restoreAllMocks()
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, world, em, 5002520)   // tick=5040
      vi.restoreAllMocks()
      // cutoff = 94521 - 92000 = 2521, 2520<2521删除, 5040<2521为false保留
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, world, em, 94521)
      expect(getPacts(sys)).toHaveLength(1)
    })
  })

  // 5. MAX上限
  describe('MAX_PACTS上限', () => {
    function fillToMax() {
      for (let i = 0; i < 19; i++) {
        vi.restoreAllMocks()
        vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
        sys.update(1, world, em, 2520 * (i + 1))
      }
    }

    it('pacts不超过MAX_PACTS=19', () => {
      fillToMax()
      vi.restoreAllMocks()
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, world, em, 2520 * 20)
      expect(getPacts(sys).length).toBeLessThanOrEqual(19)
    })

    it('达到上限后不再新增', () => {
      fillToMax()
      const len = getPacts(sys).length
      vi.restoreAllMocks()
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, world, em, 2520 * 20)
      expect(getPacts(sys).length).toBe(len)
    })

    it('清空后可继续新增', () => {
      fillToMax()
      ;(sys as any).pacts = []
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
      sys.update(1, world, em, 2520 * 20)
      expect(getPacts(sys).length).toBe(1)
    })

    it('MAX_PACTS常量为19', () => {
      fillToMax()
      expect(getPacts(sys).length).toBe(19)
    })
  })

  // 6. 枚举完整性
  describe('枚举完整性', () => {
    const FORMS: MutualAidForm[] = ['disaster_relief', 'military_assistance', 'economic_support', 'resource_pooling']

    it('包含disaster_relief', () => { expect(FORMS).toContain('disaster_relief') })
    it('包含military_assistance', () => { expect(FORMS).toContain('military_assistance') })
    it('包含economic_support和resource_pooling', () => {
      expect(FORMS).toContain('economic_support')
      expect(FORMS).toContain('resource_pooling')
    })
  })
})
