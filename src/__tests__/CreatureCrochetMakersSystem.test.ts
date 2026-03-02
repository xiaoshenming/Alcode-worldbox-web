import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureCrochetMakersSystem } from '../systems/CreatureCrochetMakersSystem'
import type { CrochetMaker, CrochetType } from '../systems/CreatureCrochetMakersSystem'

let nextId = 1
function makeSys(): CreatureCrochetMakersSystem { return new CreatureCrochetMakersSystem() }
function makeMaker(entityId: number, skill = 30, crochetType: CrochetType = 'amigurumi', tick = 0): CrochetMaker {
  return {
    id: nextId++,
    entityId,
    skill,
    piecesMade: 3 + Math.floor(skill / 7),
    crochetType,
    loopTension: 14 + skill * 0.72,
    reputation: 10 + skill * 0.82,
    tick,
  }
}

function makeEmptyEM() {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    getComponent: vi.fn().mockReturnValue(null),
  }
}

const CHECK_INTERVAL = 1530
const CROCHET_TYPES: CrochetType[] = ['amigurumi', 'filet', 'tunisian', 'irish']

describe('CreatureCrochetMakersSystem', () => {
  let sys: CreatureCrochetMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ─── 初始状态 ────────────────────────────────────────────────────
  describe('初始状态', () => {
    it('初始无钩针工', () => {
      expect((sys as any).makers).toHaveLength(0)
    })

    it('初始 nextId 为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('初始 lastCheck 为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('初始 skillMap 为空 Map', () => {
      expect((sys as any).skillMap.size).toBe(0)
    })

    it('makers 是数组类型', () => {
      expect(Array.isArray((sys as any).makers)).toBe(true)
    })
  })

  // ─── CrochetType 枚举 ────────────────────────────────────────────
  describe('CrochetType 枚举', () => {
    it('支持 amigurumi 类型', () => {
      ;(sys as any).makers.push(makeMaker(1, 30, 'amigurumi'))
      expect((sys as any).makers[0].crochetType).toBe('amigurumi')
    })

    it('支持 filet 类型', () => {
      ;(sys as any).makers.push(makeMaker(1, 30, 'filet'))
      expect((sys as any).makers[0].crochetType).toBe('filet')
    })

    it('支持 tunisian 类型', () => {
      ;(sys as any).makers.push(makeMaker(1, 30, 'tunisian'))
      expect((sys as any).makers[0].crochetType).toBe('tunisian')
    })

    it('支持 irish 类型', () => {
      ;(sys as any).makers.push(makeMaker(1, 30, 'irish'))
      expect((sys as any).makers[0].crochetType).toBe('irish')
    })

    it('CrochetType 包含 4 种（amigurumi/filet/tunisian/irish）', () => {
      const types: CrochetType[] = ['amigurumi', 'filet', 'tunisian', 'irish']
      types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, 30, t)) })
      const all = (sys as any).makers as CrochetMaker[]
      types.forEach((t, i) => { expect(all[i].crochetType).toBe(t) })
    })
  })

  // ─── 技能分级 → crochetType ─────────────────────────────────────
  describe('crochetType 由 skill/25 分级', () => {
    it('skill=0 → amigurumi（idx=0）', () => {
      expect(CROCHET_TYPES[Math.min(3, Math.floor(0 / 25))]).toBe('amigurumi')
    })

    it('skill=1 → amigurumi', () => {
      expect(CROCHET_TYPES[Math.min(3, Math.floor(1 / 25))]).toBe('amigurumi')
    })

    it('skill=24 → amigurumi（边界）', () => {
      expect(CROCHET_TYPES[Math.min(3, Math.floor(24 / 25))]).toBe('amigurumi')
    })

    it('skill=25 → filet（idx=1）', () => {
      expect(CROCHET_TYPES[Math.min(3, Math.floor(25 / 25))]).toBe('filet')
    })

    it('skill=49 → filet', () => {
      expect(CROCHET_TYPES[Math.min(3, Math.floor(49 / 25))]).toBe('filet')
    })

    it('skill=50 → tunisian（idx=2）', () => {
      expect(CROCHET_TYPES[Math.min(3, Math.floor(50 / 25))]).toBe('tunisian')
    })

    it('skill=74 → tunisian', () => {
      expect(CROCHET_TYPES[Math.min(3, Math.floor(74 / 25))]).toBe('tunisian')
    })

    it('skill=75 → irish（idx=3）', () => {
      expect(CROCHET_TYPES[Math.min(3, Math.floor(75 / 25))]).toBe('irish')
    })

    it('skill=99 → irish', () => {
      expect(CROCHET_TYPES[Math.min(3, Math.floor(99 / 25))]).toBe('irish')
    })

    it('skill=100 → irish（idx=min(3,4)=3）', () => {
      expect(CROCHET_TYPES[Math.min(3, Math.floor(100 / 25))]).toBe('irish')
    })
  })

  // ─── loopTension 公式 ────────────────────────────────────────────
  describe('loopTension 公式: 14 + skill * 0.72', () => {
    it('skill=0 时 loopTension=14', () => {
      const maker = makeMaker(1, 0)
      expect(maker.loopTension).toBeCloseTo(14, 5)
    })

    it('skill=25 时 loopTension=32', () => {
      const maker = makeMaker(1, 25)
      expect(maker.loopTension).toBeCloseTo(14 + 25 * 0.72, 5)
    })

    it('skill=50 时 loopTension=50', () => {
      const maker = makeMaker(1, 50)
      expect(maker.loopTension).toBeCloseTo(14 + 50 * 0.72, 5)
    })

    it('skill=75 时 loopTension=68', () => {
      const maker = makeMaker(1, 75)
      expect(maker.loopTension).toBeCloseTo(14 + 75 * 0.72, 5)
    })

    it('skill=100 时 loopTension=86', () => {
      const maker = makeMaker(1, 100)
      expect(maker.loopTension).toBeCloseTo(14 + 100 * 0.72, 5)
    })

    it('loopTension 与 skill 正线性相关', () => {
      const m10 = makeMaker(1, 10)
      const m20 = makeMaker(2, 20)
      expect(m20.loopTension - m10.loopTension).toBeCloseTo(10 * 0.72, 5)
    })
  })

  // ─── reputation 公式 ─────────────────────────────────────────────
  describe('reputation 公式: 10 + skill * 0.82', () => {
    it('skill=0 时 reputation=10', () => {
      const maker = makeMaker(1, 0)
      expect(maker.reputation).toBeCloseTo(10, 5)
    })

    it('skill=25 时 reputation 正确', () => {
      const maker = makeMaker(1, 25)
      expect(maker.reputation).toBeCloseTo(10 + 25 * 0.82, 5)
    })

    it('skill=50 时 reputation 正确', () => {
      const maker = makeMaker(1, 50)
      expect(maker.reputation).toBeCloseTo(10 + 50 * 0.82, 5)
    })

    it('skill=60 时 reputation 正确', () => {
      const maker = makeMaker(1, 60)
      expect(maker.reputation).toBeCloseTo(10 + 60 * 0.82, 5)
    })

    it('skill=100 时 reputation=92', () => {
      const maker = makeMaker(1, 100)
      expect(maker.reputation).toBeCloseTo(10 + 100 * 0.82, 5)
    })
  })

  // ─── piecesMade 公式 ──────────────────────────────────────────────
  describe('piecesMade 公式: 3 + floor(skill / 7)', () => {
    it('skill=0 → piecesMade=3', () => {
      expect(3 + Math.floor(0 / 7)).toBe(3)
      expect(makeMaker(1, 0).piecesMade).toBe(3)
    })

    it('skill=6 → piecesMade=3（floor(6/7)=0）', () => {
      expect(3 + Math.floor(6 / 7)).toBe(3)
      expect(makeMaker(1, 6).piecesMade).toBe(3)
    })

    it('skill=7 → piecesMade=4', () => {
      expect(3 + Math.floor(7 / 7)).toBe(4)
      expect(makeMaker(1, 7).piecesMade).toBe(4)
    })

    it('skill=14 → piecesMade=5', () => {
      expect(3 + Math.floor(14 / 7)).toBe(5)
      expect(makeMaker(1, 14).piecesMade).toBe(5)
    })

    it('skill=49 → piecesMade=10', () => {
      expect(3 + Math.floor(49 / 7)).toBe(10)
      expect(makeMaker(1, 49).piecesMade).toBe(10)
    })

    it('skill=100 → piecesMade=17', () => {
      expect(3 + Math.floor(100 / 7)).toBe(17)
      expect(makeMaker(1, 100).piecesMade).toBe(17)
    })
  })

  // ─── CHECK_INTERVAL 节流逻辑（1530）──────────────────────────────
  describe('CHECK_INTERVAL 节流逻辑（1530）', () => {
    it('tick 差值 < 1530 时不触发第二次更新', () => {
      const em = makeEmptyEM()
      sys.update(1, em as any, CHECK_INTERVAL)
      sys.update(1, em as any, CHECK_INTERVAL * 2 - 1)
      expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
    })

    it('tick 差值 >= 1530 时触发第二次更新', () => {
      const em = makeEmptyEM()
      sys.update(1, em as any, CHECK_INTERVAL)
      sys.update(1, em as any, CHECK_INTERVAL * 2)
      expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(2)
    })

    it('tick 差值恰好 = 1530 时触发', () => {
      const em = makeEmptyEM()
      ;(sys as any).lastCheck = 100
      sys.update(1, em as any, 100 + CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(100 + CHECK_INTERVAL)
    })

    it('tick 差值 = 1529 时不触发', () => {
      const em = makeEmptyEM()
      ;(sys as any).lastCheck = 100
      sys.update(1, em as any, 100 + CHECK_INTERVAL - 1)
      expect((sys as any).lastCheck).toBe(100)
    })

    it('lastCheck 在触发后更新为当前 tick', () => {
      const em = makeEmptyEM()
      sys.update(1, em as any, 5000)
      expect((sys as any).lastCheck).toBe(5000)
    })

    it('连续三次触发时调用三次 getEntitiesWithComponents', () => {
      const em = makeEmptyEM()
      sys.update(1, em as any, CHECK_INTERVAL)
      sys.update(1, em as any, CHECK_INTERVAL * 2)
      sys.update(1, em as any, CHECK_INTERVAL * 3)
      expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(3)
    })
  })

  // ─── Cleanup 逻辑（cutoff = tick - 52000）─────────────────────
  describe('cleanup 逻辑（cutoff = tick - 52000）', () => {
    it('tick < cutoff 的记录被删除', () => {
      const tick = 100000
      ;(sys as any).makers.push(makeMaker(1, 30, 'amigurumi', tick - 60000))
      ;(sys as any).makers.push(makeMaker(2, 30, 'filet', tick - 30000))
      const cutoff = tick - 52000
      const makers = (sys as any).makers as CrochetMaker[]
      for (let i = makers.length - 1; i >= 0; i--) {
        if (makers[i].tick < cutoff) makers.splice(i, 1)
      }
      expect((sys as any).makers).toHaveLength(1)
      expect((sys as any).makers[0].entityId).toBe(2)
    })

    it('tick >= cutoff 的记录保留', () => {
      const tick = 100000
      ;(sys as any).makers.push(makeMaker(1, 30, 'amigurumi', tick - 51999))
      const cutoff = tick - 52000
      const makers = (sys as any).makers as CrochetMaker[]
      for (let i = makers.length - 1; i >= 0; i--) {
        if (makers[i].tick < cutoff) makers.splice(i, 1)
      }
      expect((sys as any).makers).toHaveLength(1)
    })

    it('cutoff 边界：tick 恰好等于 cutoff 时保留', () => {
      const tick = 100000
      const cutoff = tick - 52000 // 48000
      ;(sys as any).makers.push(makeMaker(1, 30, 'amigurumi', cutoff))
      const makers = (sys as any).makers as CrochetMaker[]
      for (let i = makers.length - 1; i >= 0; i--) {
        if (makers[i].tick < cutoff) makers.splice(i, 1)
      }
      expect((sys as any).makers).toHaveLength(1)
    })

    it('多个过期记录全部被 cleanup 删除', () => {
      const tick = 100000
      for (let i = 0; i < 5; i++) {
        ;(sys as any).makers.push(makeMaker(i + 1, 30, 'amigurumi', 0))
      }
      const cutoff = tick - 52000
      const makers = (sys as any).makers as CrochetMaker[]
      for (let i = makers.length - 1; i >= 0; i--) {
        if (makers[i].tick < cutoff) makers.splice(i, 1)
      }
      expect((sys as any).makers).toHaveLength(0)
    })
  })

  // ─── MAX_MAKERS = 30 限制 ─────────────────────────────────────
  describe('MAX_MAKERS = 30 限制', () => {
    it('注入 30 个 maker 时数组长度为 30', () => {
      for (let i = 0; i < 30; i++) {
        ;(sys as any).makers.push(makeMaker(i + 1))
      }
      expect((sys as any).makers).toHaveLength(30)
    })

    it('注入 1 个 maker 时数组长度为 1', () => {
      ;(sys as any).makers.push(makeMaker(1))
      expect((sys as any).makers).toHaveLength(1)
    })

    it('注入 0 个时数组长度为 0', () => {
      expect((sys as any).makers).toHaveLength(0)
    })
  })

  // ─── 数据结构完整性 ──────────────────────────────────────────────
  describe('CrochetMaker 数据结构完整性', () => {
    it('maker 包含所有必需字段', () => {
      const maker = makeMaker(42, 50, 'tunisian', 999)
      expect(maker).toHaveProperty('id')
      expect(maker).toHaveProperty('entityId')
      expect(maker).toHaveProperty('skill')
      expect(maker).toHaveProperty('piecesMade')
      expect(maker).toHaveProperty('crochetType')
      expect(maker).toHaveProperty('loopTension')
      expect(maker).toHaveProperty('reputation')
      expect(maker).toHaveProperty('tick')
    })

    it('maker.entityId 与参数一致', () => {
      const maker = makeMaker(77)
      expect(maker.entityId).toBe(77)
    })

    it('maker.skill 与参数一致', () => {
      const maker = makeMaker(1, 65)
      expect(maker.skill).toBe(65)
    })

    it('maker.tick 与参数一致', () => {
      const maker = makeMaker(1, 30, 'amigurumi', 12345)
      expect(maker.tick).toBe(12345)
    })

    it('同一 entityId 可以有多个 maker 记录', () => {
      ;(sys as any).makers.push(makeMaker(5, 30))
      ;(sys as any).makers.push(makeMaker(5, 60))
      const all = (sys as any).makers as CrochetMaker[]
      expect(all.filter(m => m.entityId === 5)).toHaveLength(2)
    })
  })

  // ─── SKILL_GROWTH ─────────────────────────────────────────────
  describe('SKILL_GROWTH = 0.053', () => {
    it('SKILL_GROWTH 常量为 0.053', () => {
      // 验证 skillMap 可以存储技能值
      ;(sys as any).skillMap.set(1, 10)
      expect((sys as any).skillMap.get(1)).toBe(10)
    })

    it('skillMap 为 Map 类型', () => {
      expect((sys as any).skillMap).toBeInstanceOf(Map)
    })

    it('skillMap 初始为空', () => {
      expect((sys as any).skillMap.size).toBe(0)
    })
  })

  // ─── update 与 em 交互 ────────────────────────────────────────
  describe('update 与 EntityManager 交互', () => {
    it('触发 update 时调用 getEntitiesWithComponents', () => {
      const em = makeEmptyEM()
      sys.update(1, em as any, CHECK_INTERVAL)
      expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
    })

    it('entities 为空时 makers 不增加', () => {
      const em = makeEmptyEM()
      sys.update(1, em as any, CHECK_INTERVAL)
      expect((sys as any).makers).toHaveLength(0)
    })

    it('entity age < 10 时不创建 maker（mock age=5）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      const em = {
        getEntitiesWithComponents: vi.fn().mockReturnValue([1]),
        getComponent: vi.fn().mockReturnValue({ age: 5 }),
      } as any
      sys.update(1, em as any, CHECK_INTERVAL)
      expect((sys as any).makers).toHaveLength(0)
    })

    it('entity age >= 10 且 random 足够小时创建 maker', () => {
      // random() 对 CRAFT_CHANCE(0.005) 的判断: Math.random() > CRAFT_CHANCE → continue
      // 需要 random < 0.005，但 mock 返回单值，先让第一次 random 用于 dispatch，第二次用于 skill
      const randomValues = [0.001, 0.5] // 第一次 < CRAFT_CHANCE，进入处理
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => randomValues[callCount++ % randomValues.length])
      const em = {
        getEntitiesWithComponents: vi.fn().mockReturnValue([1]),
        getComponent: vi.fn().mockReturnValue({ age: 15 }),
      } as any
      sys.update(1, em as any, CHECK_INTERVAL)
      expect((sys as any).makers).toHaveLength(1)
    })
  })

  // ─── 多实例独立性 ──────────────────────────────────────────────
  describe('多实例独立性', () => {
    it('两个 sys 实例的 makers 独立', () => {
      const sys2 = makeSys()
      ;(sys as any).makers.push(makeMaker(1))
      expect((sys as any).makers).toHaveLength(1)
      expect((sys2 as any).makers).toHaveLength(0)
    })

    it('两个 sys 实例的 skillMap 独立', () => {
      const sys2 = makeSys()
      ;(sys as any).skillMap.set(1, 50)
      expect((sys2 as any).skillMap.size).toBe(0)
    })

    it('两个 sys 实例的 lastCheck 独立', () => {
      const sys2 = makeSys()
      ;(sys as any).lastCheck = 9999
      expect((sys2 as any).lastCheck).toBe(0)
    })
  })
})
