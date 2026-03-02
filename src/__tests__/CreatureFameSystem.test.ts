import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureFameSystem } from '../systems/CreatureFameSystem'
import type { FameTitle, FameSource, FameRecord } from '../systems/CreatureFameSystem'

function makeSys(): CreatureFameSystem { return new CreatureFameSystem() }

function makeEM(hasCreature = true) {
  return {
    hasComponent: vi.fn(() => hasCreature),
    getEntitiesWithComponents: vi.fn(() => []),
  }
}

describe('CreatureFameSystem', () => {
  let sys: CreatureFameSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  // ============================================================
  // 一、初始状态测试
  // ============================================================
  describe('初始状态', () => {
    it('初始 fameRecords 为空 Map', () => {
      expect((sys as any).fameRecords.size).toBe(0)
    })

    it('fameRecords 是 Map 实例', () => {
      expect((sys as any).fameRecords).toBeInstanceOf(Map)
    })
  })

  // ============================================================
  // 二、addFame 基础行为
  // ============================================================
  describe('addFame 基础行为', () => {
    it('addFame 后 fameRecords 包含该实体', () => {
      sys.addFame(1, 'combat_victory')
      expect((sys as any).fameRecords.has(1)).toBe(true)
    })

    it('addFame 不传 amount 时使用 source 的 base 值（combat_victory=8）', () => {
      sys.addFame(1, 'combat_victory')
      expect((sys as any).fameRecords.get(1).totalFame).toBe(8)
    })

    it('addFame 不传 amount 时使用 source 的 base 值（exploration=3）', () => {
      sys.addFame(1, 'exploration')
      expect((sys as any).fameRecords.get(1).totalFame).toBe(3)
    })

    it('addFame 不传 amount 时使用 source 的 base 值（building=5）', () => {
      sys.addFame(1, 'building')
      expect((sys as any).fameRecords.get(1).totalFame).toBe(5)
    })

    it('addFame 不传 amount 时使用 source 的 base 值（healing=4）', () => {
      sys.addFame(1, 'healing')
      expect((sys as any).fameRecords.get(1).totalFame).toBe(4)
    })

    it('addFame 不传 amount 时使用 source 的 base 值（leadership=10）', () => {
      sys.addFame(1, 'leadership')
      expect((sys as any).fameRecords.get(1).totalFame).toBe(10)
    })

    it('addFame 不传 amount 时使用 source 的 base 值（sacrifice=20）', () => {
      sys.addFame(1, 'sacrifice')
      expect((sys as any).fameRecords.get(1).totalFame).toBe(20)
    })

    it('addFame 传入 amount 时使用自定义值', () => {
      sys.addFame(1, 'combat_victory', 100)
      expect((sys as any).fameRecords.get(1).totalFame).toBe(100)
    })

    it('同一实体多次 addFame 累加 totalFame', () => {
      sys.addFame(1, 'combat_victory', 30)
      sys.addFame(1, 'exploration', 20)
      expect((sys as any).fameRecords.get(1).totalFame).toBe(50)
    })

    it('addFame delta<=0 时不创建记录（amount=0）', () => {
      sys.addFame(2, 'combat_victory', 0)
      expect((sys as any).fameRecords.has(2)).toBe(false)
    })

    it('addFame delta<=0 时不创建记录（amount 负数）', () => {
      sys.addFame(3, 'combat_victory', -5)
      expect((sys as any).fameRecords.has(3)).toBe(false)
    })

    it('不同实体各自独立记录', () => {
      sys.addFame(1, 'combat_victory', 30)
      sys.addFame(2, 'exploration', 20)
      sys.addFame(3, 'leadership', 10)
      expect((sys as any).fameRecords.size).toBe(3)
      expect((sys as any).fameRecords.get(1).totalFame).toBe(30)
      expect((sys as any).fameRecords.get(2).totalFame).toBe(20)
      expect((sys as any).fameRecords.get(3).totalFame).toBe(10)
    })
  })

  // ============================================================
  // 三、fameBreakdown 按 source 分类记录
  // ============================================================
  describe('fameBreakdown 按 source 记录', () => {
    it('addFame(healing,10) 后 breakdown.healing=10', () => {
      sys.addFame(1, 'healing', 10)
      expect((sys as any).fameRecords.get(1).fameBreakdown.healing).toBe(10)
    })

    it('addFame(building,5) 后 breakdown.building=5', () => {
      sys.addFame(1, 'building', 5)
      expect((sys as any).fameRecords.get(1).fameBreakdown.building).toBe(5)
    })

    it('多 source 各自记录在 fameBreakdown 中', () => {
      sys.addFame(1, 'healing', 10)
      sys.addFame(1, 'building', 5)
      const record = (sys as any).fameRecords.get(1)
      expect(record.fameBreakdown.healing).toBe(10)
      expect(record.fameBreakdown.building).toBe(5)
    })

    it('同一 source 多次累加 breakdown', () => {
      sys.addFame(1, 'combat_victory', 8)
      sys.addFame(1, 'combat_victory', 12)
      expect((sys as any).fameRecords.get(1).fameBreakdown.combat_victory).toBe(20)
    })

    it('初始 breakdown 所有 source 均为 0', () => {
      sys.addFame(1, 'combat_victory', 5)
      const bd = (sys as any).fameRecords.get(1).fameBreakdown
      expect(bd.exploration).toBe(0)
      expect(bd.building).toBe(0)
      expect(bd.healing).toBe(0)
      expect(bd.leadership).toBe(0)
      expect(bd.sacrifice).toBe(0)
    })

    it('exploration source breakdown 正确记录', () => {
      sys.addFame(1, 'exploration', 15)
      expect((sys as any).fameRecords.get(1).fameBreakdown.exploration).toBe(15)
    })

    it('leadership source breakdown 正确记录', () => {
      sys.addFame(1, 'leadership')
      expect((sys as any).fameRecords.get(1).fameBreakdown.leadership).toBe(10)
    })

    it('sacrifice source breakdown 正确记录', () => {
      sys.addFame(1, 'sacrifice')
      expect((sys as any).fameRecords.get(1).fameBreakdown.sacrifice).toBe(20)
    })
  })

  // ============================================================
  // 四、FameTitle 阈值与 rank 测试
  // ============================================================
  describe('FameTitle 阈值与 rank', () => {
    it('totalFame=0 时 title=unknown, rank=0', () => {
      ;(sys as any).fameRecords.set(99, {
        totalFame: 0,
        fameBreakdown: {},
        title: 'unknown',
        rank: 0,
      })
      const r = (sys as any).fameRecords.get(99)
      expect(r.title).toBe('unknown')
      expect(r.rank).toBe(0)
    })

    it('totalFame=49 时 title=unknown, rank=0', () => {
      sys.addFame(1, 'sacrifice', 49)
      const r = (sys as any).fameRecords.get(1)
      expect(r.title).toBe('unknown')
      expect(r.rank).toBe(0)
    })

    it('totalFame=50 时 title=known, rank=1', () => {
      sys.addFame(1, 'sacrifice', 50)
      const r = (sys as any).fameRecords.get(1)
      expect(r.title).toBe('known')
      expect(r.rank).toBe(1)
    })

    it('totalFame=100 时 title=known, rank=1', () => {
      sys.addFame(1, 'sacrifice', 100)
      const r = (sys as any).fameRecords.get(1)
      expect(r.title).toBe('known')
      expect(r.rank).toBe(1)
    })

    it('totalFame=149 时 title=known, rank=1', () => {
      sys.addFame(1, 'sacrifice', 149)
      const r = (sys as any).fameRecords.get(1)
      expect(r.title).toBe('known')
      expect(r.rank).toBe(1)
    })

    it('totalFame=150 时 title=famous, rank=2', () => {
      sys.addFame(1, 'sacrifice', 150)
      const r = (sys as any).fameRecords.get(1)
      expect(r.title).toBe('famous')
      expect(r.rank).toBe(2)
    })

    it('totalFame=299 时 title=famous, rank=2', () => {
      sys.addFame(1, 'sacrifice', 299)
      const r = (sys as any).fameRecords.get(1)
      expect(r.title).toBe('famous')
      expect(r.rank).toBe(2)
    })

    it('totalFame=300 时 title=legendary, rank=3', () => {
      sys.addFame(1, 'sacrifice', 300)
      const r = (sys as any).fameRecords.get(1)
      expect(r.title).toBe('legendary')
      expect(r.rank).toBe(3)
    })

    it('totalFame=499 时 title=legendary, rank=3', () => {
      sys.addFame(1, 'sacrifice', 499)
      const r = (sys as any).fameRecords.get(1)
      expect(r.title).toBe('legendary')
      expect(r.rank).toBe(3)
    })

    it('totalFame=500 时 title=mythical, rank=4', () => {
      sys.addFame(1, 'sacrifice', 500)
      const r = (sys as any).fameRecords.get(1)
      expect(r.title).toBe('mythical')
      expect(r.rank).toBe(4)
    })

    it('totalFame=999 时 title=mythical, rank=4', () => {
      sys.addFame(1, 'sacrifice', 999)
      const r = (sys as any).fameRecords.get(1)
      expect(r.title).toBe('mythical')
      expect(r.rank).toBe(4)
    })

    it('FameTitle 联合类型包含5个值', () => {
      const titles: FameTitle[] = ['unknown', 'known', 'famous', 'legendary', 'mythical']
      expect(titles).toHaveLength(5)
      titles.forEach(t => expect(typeof t).toBe('string'))
    })
  })

  // ============================================================
  // 五、MAX_FAME 上限测试
  // ============================================================
  describe('MAX_FAME 上限', () => {
    it('addFame 超过 MAX_FAME=1000 时截断', () => {
      sys.addFame(1, 'sacrifice', 9999)
      expect((sys as any).fameRecords.get(1).totalFame).toBe(1000)
    })

    it('addFame 恰好到 MAX_FAME=1000 不截断', () => {
      sys.addFame(1, 'sacrifice', 1000)
      expect((sys as any).fameRecords.get(1).totalFame).toBe(1000)
    })

    it('多次 addFame 累计超过 MAX_FAME 时截断', () => {
      sys.addFame(1, 'sacrifice', 600)
      sys.addFame(1, 'sacrifice', 600)
      expect((sys as any).fameRecords.get(1).totalFame).toBe(1000)
    })

    it('超过 MAX_FAME 后 title 为 mythical', () => {
      sys.addFame(1, 'sacrifice', 9999)
      expect((sys as any).fameRecords.get(1).title).toBe('mythical')
    })
  })

  // ============================================================
  // 六、update / tick 节流测试
  // ============================================================
  describe('update tick 节流 (DECAY_INTERVAL=120)', () => {
    it('tick%120!=0 时 update 不执行衰减（tick=1）', () => {
      sys.addFame(1, 'sacrifice', 200)
      const em = makeEM(true)
      const before = (sys as any).fameRecords.get(1).totalFame
      sys.update(0, em as any, 1)
      expect((sys as any).fameRecords.get(1).totalFame).toBe(before)
    })

    it('tick%120!=0 时 update 不执行衰减（tick=60）', () => {
      sys.addFame(1, 'sacrifice', 200)
      const em = makeEM(true)
      const before = (sys as any).fameRecords.get(1).totalFame
      sys.update(0, em as any, 60)
      expect((sys as any).fameRecords.get(1).totalFame).toBe(before)
    })

    it('tick%120!=0 时 update 不执行衰减（tick=119）', () => {
      sys.addFame(1, 'sacrifice', 200)
      const em = makeEM(true)
      const before = (sys as any).fameRecords.get(1).totalFame
      sys.update(0, em as any, 119)
      expect((sys as any).fameRecords.get(1).totalFame).toBe(before)
    })

    it('tick%120===0 时 update 执行衰减（tick=120）', () => {
      sys.addFame(1, 'sacrifice', 200)
      const em = makeEM(true)
      const before = (sys as any).fameRecords.get(1).totalFame
      sys.update(0, em as any, 120)
      expect((sys as any).fameRecords.get(1).totalFame).toBeLessThan(before)
    })

    it('tick%120===0 时 update 执行衰减（tick=240）', () => {
      sys.addFame(1, 'sacrifice', 200)
      const em = makeEM(true)
      const before = (sys as any).fameRecords.get(1).totalFame
      sys.update(0, em as any, 240)
      expect((sys as any).fameRecords.get(1).totalFame).toBeLessThan(before)
    })

    it('tick=0 时 update 执行衰减（0%120===0）', () => {
      sys.addFame(1, 'sacrifice', 200)
      const em = makeEM(true)
      const before = (sys as any).fameRecords.get(1).totalFame
      sys.update(0, em as any, 0)
      // 0%120===0，会衰减，但 totalFame=200>0 所以减少
      expect((sys as any).fameRecords.get(1).totalFame).toBeLessThan(before)
    })
  })

  // ============================================================
  // 七、衰减行为测试
  // ============================================================
  describe('衰减行为 (DECAY_RATE=0.005)', () => {
    it('衰减后 totalFame 减少 totalFame*0.005', () => {
      sys.addFame(1, 'sacrifice', 200)
      const em = makeEM(true)
      sys.update(0, em as any, 120)
      const r = (sys as any).fameRecords.get(1)
      expect(r.totalFame).toBeCloseTo(200 - 200 * 0.005, 5)
    })

    it('totalFame=0 时衰减后仍为 0（不变为负）', () => {
      ;(sys as any).fameRecords.set(1, {
        totalFame: 0,
        fameBreakdown: { combat_victory: 0, exploration: 0, building: 0, healing: 0, leadership: 0, sacrifice: 0 },
        title: 'unknown',
        rank: 0,
      })
      const em = makeEM(true)
      sys.update(0, em as any, 120)
      expect((sys as any).fameRecords.get(1).totalFame).toBe(0)
    })

    it('衰减后 fameBreakdown 各 source 按比例减少', () => {
      sys.addFame(1, 'combat_victory', 100)
      const em = makeEM(true)
      sys.update(0, em as any, 120)
      const bd = (sys as any).fameRecords.get(1).fameBreakdown
      expect(bd.combat_victory).toBeCloseTo(100 - 100 * 0.005, 5)
    })

    it('衰减后 fameBreakdown 中为 0 的 source 不变为负', () => {
      sys.addFame(1, 'combat_victory', 100)
      const em = makeEM(true)
      sys.update(0, em as any, 120)
      const bd = (sys as any).fameRecords.get(1).fameBreakdown
      expect(bd.exploration).toBe(0)
      expect(bd.building).toBe(0)
    })

    it('衰减后 title 根据新 totalFame 更新（mythical→legendary）', () => {
      sys.addFame(1, 'sacrifice', 501)
      // 衰减：501 - 501*0.005 = 498.495 < 500 -> 降为 legendary
      const em = makeEM(true)
      sys.update(0, em as any, 120)
      const r = (sys as any).fameRecords.get(1)
      expect(r.title).toBe('legendary')
    })

    it('衰减后不跨越阈值时 title 不变（famous→famous）', () => {
      sys.addFame(1, 'sacrifice', 200)
      const em = makeEM(true)
      sys.update(0, em as any, 120)
      // 200 - 200*0.005 = 199 > 150 -> 仍 famous
      const r = (sys as any).fameRecords.get(1)
      expect(r.title).toBe('famous')
    })
  })

  // ============================================================
  // 八、死亡实体清理测试
  // ============================================================
  describe('死亡实体清理', () => {
    it('update 时无 creature 组件的实体记录被删除', () => {
      sys.addFame(1, 'combat_victory')
      const em = makeEM(false)
      sys.update(0, em as any, 120)
      expect((sys as any).fameRecords.has(1)).toBe(false)
    })

    it('有 creature 组件的实体在 update 后保留记录', () => {
      sys.addFame(1, 'combat_victory')
      const em = makeEM(true)
      sys.update(0, em as any, 120)
      expect((sys as any).fameRecords.has(1)).toBe(true)
    })

    it('混合场景：部分实体存活部分死亡', () => {
      sys.addFame(1, 'combat_victory', 50)
      sys.addFame(2, 'combat_victory', 50)
      const em = {
        hasComponent: vi.fn((id: number) => id === 1), // 只有1存活
      }
      sys.update(0, em as any, 120)
      expect((sys as any).fameRecords.has(1)).toBe(true)
      expect((sys as any).fameRecords.has(2)).toBe(false)
    })

    it('所有实体都死亡时 fameRecords 变空', () => {
      sys.addFame(1, 'combat_victory', 50)
      sys.addFame(2, 'exploration', 50)
      sys.addFame(3, 'leadership', 50)
      const em = makeEM(false)
      sys.update(0, em as any, 120)
      expect((sys as any).fameRecords.size).toBe(0)
    })

    it('死亡清理只在 tick%DECAY_INTERVAL===0 时执行', () => {
      sys.addFame(1, 'combat_victory', 50)
      const em = makeEM(false)
      // tick=1 不触发衰减，死亡清理也不执行
      sys.update(0, em as any, 1)
      expect((sys as any).fameRecords.has(1)).toBe(true)
    })
  })

  // ============================================================
  // 九、多实体并发行为
  // ============================================================
  describe('多实体并发行为', () => {
    it('大量实体并存时数量正确', () => {
      for (let i = 1; i <= 100; i++) {
        sys.addFame(i, 'combat_victory', i)
      }
      expect((sys as any).fameRecords.size).toBe(100)
    })

    it('实体 ID 为边界值（0）时仍能正常记录', () => {
      sys.addFame(0, 'combat_victory', 10)
      expect((sys as any).fameRecords.has(0)).toBe(true)
    })

    it('实体 ID 为大整数时仍能正常记录', () => {
      sys.addFame(999999, 'combat_victory', 10)
      expect((sys as any).fameRecords.has(999999)).toBe(true)
    })

    it('多次调用 addFame 后 title 随 totalFame 正确更新', () => {
      sys.addFame(1, 'sacrifice', 40)      // 40 -> unknown
      expect((sys as any).fameRecords.get(1).title).toBe('unknown')
      sys.addFame(1, 'sacrifice', 20)      // 60 -> known
      expect((sys as any).fameRecords.get(1).title).toBe('known')
      sys.addFame(1, 'sacrifice', 100)     // 160 -> famous
      expect((sys as any).fameRecords.get(1).title).toBe('famous')
      sys.addFame(1, 'sacrifice', 200)     // 360 -> legendary
      expect((sys as any).fameRecords.get(1).title).toBe('legendary')
      sys.addFame(1, 'sacrifice', 200)     // 560 -> mythical
      expect((sys as any).fameRecords.get(1).title).toBe('mythical')
    })
  })

  // ============================================================
  // 十、FameRecord 结构完整性
  // ============================================================
  describe('FameRecord 结构完整性', () => {
    it('新建记录包含 totalFame/fameBreakdown/title/rank 四个字段', () => {
      sys.addFame(1, 'combat_victory', 10)
      const r: FameRecord = (sys as any).fameRecords.get(1)
      expect(r).toHaveProperty('totalFame')
      expect(r).toHaveProperty('fameBreakdown')
      expect(r).toHaveProperty('title')
      expect(r).toHaveProperty('rank')
    })

    it('新建记录 fameBreakdown 包含全部 6 个 source', () => {
      sys.addFame(1, 'combat_victory', 10)
      const bd = (sys as any).fameRecords.get(1).fameBreakdown
      const sources: FameSource[] = ['combat_victory', 'exploration', 'building', 'healing', 'leadership', 'sacrifice']
      sources.forEach(s => expect(s in bd).toBe(true))
    })

    it('初始 rank 应为 0（未传阈值的情况）', () => {
      sys.addFame(1, 'combat_victory', 5) // <50 -> rank=0
      expect((sys as any).fameRecords.get(1).rank).toBe(0)
    })

    it('rank 值范围为 0-4', () => {
      const amounts = [5, 50, 150, 300, 500]
      const ranks = [0, 1, 2, 3, 4]
      amounts.forEach((amt, idx) => {
        const id = idx + 100
        sys.addFame(id, 'sacrifice', amt)
        expect((sys as any).fameRecords.get(id).rank).toBe(ranks[idx])
      })
    })
  })
})
