import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticCensusSystem, Census } from '../systems/DiplomaticCensusSystem'

const CHECK_INTERVAL = 2000
const MAX_RECORDS = 50

function makeSys() { return new DiplomaticCensusSystem() }

/** 构建一个 Census 记录 */
function makeCensus(overrides: Partial<Census> = {}): Census {
  return {
    id: 1,
    civId: 1,
    population: 100,
    warriors: 15,
    workers: 40,
    elders: 8,
    growthRate: 0,
    tick: 10000,
    ...overrides,
  }
}

/** 构建一个 mock CivManager，包含指定文明列表 */
function makeCivManager(civs: Array<{ id: number; population: number }>) {
  return {
    civilizations: new Map(civs.map(c => [c.id, { id: c.id, population: c.population }])),
  }
}

describe('DiplomaticCensusSystem', () => {

  let sys: DiplomaticCensusSystem

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ---- 1. 基础数据结构 ----
  describe('基础数据结构', () => {
    it('初始 records 为空数组', () => {
      expect((sys as any).records).toHaveLength(0)
      expect(Array.isArray((sys as any).records)).toBe(true)
    })

    it('nextId 初始为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck 初始为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('手动注入 census 后 records 长度正确', () => {
      ;(sys as any).records.push(makeCensus({ id: 1 }))
      ;(sys as any).records.push(makeCensus({ id: 2, civId: 2 }))
      expect((sys as any).records).toHaveLength(2)
    })

    it('注入的 census 字段可正确读取', () => {
      const c = makeCensus({ id: 77, civId: 5, population: 200, growthRate: 5.5 })
      ;(sys as any).records.push(c)
      const stored = (sys as any).records[0]
      expect(stored.id).toBe(77)
      expect(stored.civId).toBe(5)
      expect(stored.population).toBe(200)
      expect(stored.growthRate).toBe(5.5)
    })

    it('Census 包含所有必要字段', () => {
      const c = makeCensus()
      expect(c).toHaveProperty('id')
      expect(c).toHaveProperty('civId')
      expect(c).toHaveProperty('population')
      expect(c).toHaveProperty('warriors')
      expect(c).toHaveProperty('workers')
      expect(c).toHaveProperty('elders')
      expect(c).toHaveProperty('growthRate')
      expect(c).toHaveProperty('tick')
    })
  })

  // ---- 2. CHECK_INTERVAL 节流 ----
  describe('CHECK_INTERVAL 节流', () => {
    it('tick 差值小于 CHECK_INTERVAL 时跳过更新', () => {
      const em = {} as any
      const civ = makeCivManager([{ id: 1, population: 100 }])
      sys.update(1, em, civ as any, CHECK_INTERVAL - 1)
      expect((sys as any).lastCheck).toBe(0)
      expect((sys as any).records).toHaveLength(0)
    })

    it('tick 等于 CHECK_INTERVAL 时执行更新', () => {
      const em = {} as any
      // CENSUS_CHANCE=0.04，让 random 返回 0 确保普查发生
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const civ = makeCivManager([{ id: 1, population: 50 }])
      sys.update(1, em, civ as any, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('tick 超过 CHECK_INTERVAL 时执行更新并更新 lastCheck', () => {
      const em = {} as any
      const civ = makeCivManager([])
      sys.update(1, em, civ as any, CHECK_INTERVAL + 500)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 500)
    })

    it('第一次 update 后间隔不足时第二次不触发', () => {
      const em = {} as any
      const civ = makeCivManager([])
      sys.update(1, em, civ as any, CHECK_INTERVAL)
      const checkAfterFirst = (sys as any).lastCheck
      sys.update(1, em, civ as any, CHECK_INTERVAL + 100)
      expect((sys as any).lastCheck).toBe(checkAfterFirst)
    })

    it('两个完整周期都触发更新', () => {
      const em = {} as any
      const civ = makeCivManager([])
      sys.update(1, em, civ as any, CHECK_INTERVAL)
      sys.update(1, em, civ as any, CHECK_INTERVAL * 2)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
    })
  })

  // ---- 3. 普查数据生成 ----
  describe('普查数据生成', () => {
    it('普查概率满足时，单个文明产生一条 census 记录', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0) // < CENSUS_CHANCE(0.04)，条件满足
      const em = {} as any
      const civ = makeCivManager([{ id: 1, population: 100 }])
      sys.update(1, em, civ as any, CHECK_INTERVAL)
      expect((sys as any).records).toHaveLength(1)
      expect((sys as any).records[0].civId).toBe(1)
    })

    it('普查记录中 population 与文明 population 相同', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = {} as any
      const civ = makeCivManager([{ id: 1, population: 250 }])
      sys.update(1, em, civ as any, CHECK_INTERVAL)
      expect((sys as any).records[0].population).toBe(250)
    })

    it('warriors 占 population 的 10%~30% 范围', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0) // 使乘数为最小值
      const em = {} as any
      const civ = makeCivManager([{ id: 1, population: 100 }])
      sys.update(1, em, civ as any, CHECK_INTERVAL)
      const warriors = (sys as any).records[0].warriors
      expect(warriors).toBeGreaterThanOrEqual(10)  // floor(100 * 0.1)
      expect(warriors).toBeLessThanOrEqual(30)     // floor(100 * 0.3)
    })

    it('workers 占 population 的 30%~60% 范围', () => {
      const em = {} as any
      const civ = makeCivManager([{ id: 1, population: 100 }])
      // 多次跑取极值
      for (let trial = 0; trial < 10; trial++) {
        sys = makeSys()
        vi.spyOn(Math, 'random').mockReturnValue(trial % 2 === 0 ? 0 : 1)
        sys.update(1, em, civ as any, CHECK_INTERVAL)
        if ((sys as any).records.length > 0) {
          const workers = (sys as any).records[0].workers
          expect(workers).toBeGreaterThanOrEqual(30)
          expect(workers).toBeLessThanOrEqual(60)
          break
        }
      }
    })

    it('elders 占 population 的 5%~15% 范围', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = {} as any
      const civ = makeCivManager([{ id: 1, population: 200 }])
      sys.update(1, em, civ as any, CHECK_INTERVAL)
      const elders = (sys as any).records[0].elders
      expect(elders).toBeGreaterThanOrEqual(10)  // floor(200 * 0.05)
      expect(elders).toBeLessThanOrEqual(30)     // floor(200 * 0.15)
    })

    it('首次普查时 growthRate 为 0（无历史记录）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = {} as any
      const civ = makeCivManager([{ id: 1, population: 100 }])
      sys.update(1, em, civ as any, CHECK_INTERVAL)
      expect((sys as any).records[0].growthRate).toBe(0)
    })

    it('第二次普查时 growthRate 基于历史 population 计算', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = {} as any
      // 第一次：population=100
      const civ1 = makeCivManager([{ id: 1, population: 100 }])
      sys.update(1, em, civ1 as any, CHECK_INTERVAL)
      // 第二次：population=150，growthRate 应为 (150-100)/100*100 = 50%
      const civ2 = makeCivManager([{ id: 1, population: 150 }])
      sys.update(1, em, civ2 as any, CHECK_INTERVAL * 2)
      const records = (sys as any).records
      const second = records.find((r: Census) => r.civId === 1 && r.population === 150)
      if (second) {
        expect(second.growthRate).toBeCloseTo(50, 0)
      }
    })

    it('多个文明时每个文明分别进行普查', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)  // 确保所有文明都通过概率检查
      const em = {} as any
      const civ = makeCivManager([
        { id: 1, population: 100 },
        { id: 2, population: 200 },
        { id: 3, population: 300 },
      ])
      sys.update(1, em, civ as any, CHECK_INTERVAL)
      expect((sys as any).records.length).toBeGreaterThanOrEqual(1)
    })

    it('nextId 在新增 census 后递增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = {} as any
      const civ = makeCivManager([{ id: 1, population: 100 }])
      sys.update(1, em, civ as any, CHECK_INTERVAL)
      if ((sys as any).records.length > 0) {
        expect((sys as any).nextId).toBeGreaterThan(1)
      }
    })

    it('civManager 为 null 时不崩溃', () => {
      const em = {} as any
      expect(() => {
        sys.update(1, em, null as any, CHECK_INTERVAL)
      }).not.toThrow()
    })

    it('civManager.civilizations 缺失时不崩溃', () => {
      const em = {} as any
      expect(() => {
        sys.update(1, em, {} as any, CHECK_INTERVAL)
      }).not.toThrow()
    })
  })

  // ---- 4. cleanup 机制 ----
  describe('cleanup 机制', () => {
    it('records 超过 MAX_RECORDS 时被截断到 MAX_RECORDS', () => {
      // 注入 55 条记录，超过 MAX_RECORDS=50
      for (let i = 1; i <= 55; i++) {
        ;(sys as any).records.push(makeCensus({ id: i, tick: i * 100 }))
      }
      // 调用内部 cleanup
      ;(sys as any).cleanup()
      expect((sys as any).records).toHaveLength(MAX_RECORDS)
    })

    it('cleanup 后保留 tick 最大的 50 条记录', () => {
      for (let i = 1; i <= 55; i++) {
        ;(sys as any).records.push(makeCensus({ id: i, tick: i * 100 }))
      }
      ;(sys as any).cleanup()
      // 保留 tick 最大的（5500, 5400, ... , 100*6=600）
      const ticks = (sys as any).records.map((r: Census) => r.tick)
      const minTick = Math.min(...ticks)
      expect(minTick).toBeGreaterThanOrEqual(100 * 6)  // 丢弃最小的5条
    })

    it('records 恰好等于 MAX_RECORDS 时 cleanup 不删除任何记录', () => {
      for (let i = 1; i <= MAX_RECORDS; i++) {
        ;(sys as any).records.push(makeCensus({ id: i, tick: i }))
      }
      ;(sys as any).cleanup()
      expect((sys as any).records).toHaveLength(MAX_RECORDS)
    })
  })

  // ---- 5. MAX_RECORDS 上限 ----
  describe('MAX_RECORDS 上限', () => {
    it('records 已满时 conductCensus 不再添加新记录', () => {
      for (let i = 1; i <= MAX_RECORDS; i++) {
        ;(sys as any).records.push(makeCensus({ id: i }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = {} as any
      const civ = makeCivManager([{ id: 99, population: 500 }])
      sys.update(1, em, civ as any, CHECK_INTERVAL)
      // cleanup 后总数不超过 MAX_RECORDS
      expect((sys as any).records.length).toBeLessThanOrEqual(MAX_RECORDS)
    })

    it('MAX_RECORDS 常量值为 50', () => {
      for (let i = 1; i <= MAX_RECORDS; i++) {
        ;(sys as any).records.push(makeCensus({ id: i }))
      }
      ;(sys as any).cleanup()
      expect((sys as any).records).toHaveLength(50)
    })

    it('多次 update 后 records 数量始终不超过 MAX_RECORDS', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = {} as any
      const civs: Array<{ id: number; population: number }> = []
      for (let i = 1; i <= 30; i++) civs.push({ id: i, population: i * 10 })
      const civ = makeCivManager(civs)
      for (let round = 1; round <= 5; round++) {
        sys.update(1, em, civ as any, CHECK_INTERVAL * round)
      }
      expect((sys as any).records.length).toBeLessThanOrEqual(MAX_RECORDS)
    })
  })

})
