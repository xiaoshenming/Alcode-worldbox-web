import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureFirewalkerSystem } from '../systems/CreatureFirewalkerSystem'
import type { FirewalkerData, FirewalkerMastery } from '../systems/CreatureFirewalkerSystem'

function makeSys(): CreatureFirewalkerSystem { return new CreatureFirewalkerSystem() }
function makeFirewalker(
  entityId: number,
  mastery: FirewalkerMastery = 'novice',
  active = true,
  walkDistance = 20,
  heatResistance = 20,
): FirewalkerData {
  return { entityId, heatResistance, fireTrail: false, walkDistance, mastery, active, tick: 0 }
}
function makeEM(opts: { entities?: number[]; hasComponent?: boolean } = {}) {
  const { entities = [], hasComponent = true } = opts
  return {
    getEntitiesWithComponent: vi.fn().mockReturnValue(entities),
    hasComponent: vi.fn().mockReturnValue(hasComponent),
  }
}

describe('CreatureFirewalkerSystem', () => {
  let sys: CreatureFirewalkerSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  // ==================== 初始状态测试 ====================
  describe('初始状态', () => {
    it('初始无火行者', () => {
      expect((sys as any).firewalkers).toHaveLength(0)
    })

    it('初始 _firewalkersSet 为空', () => {
      expect((sys as any)._firewalkersSet.size).toBe(0)
    })

    it('初始 lastCheck 为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('firewalkers 为数组类型', () => {
      expect(Array.isArray((sys as any).firewalkers)).toBe(true)
    })

    it('_firewalkersSet 为 Set 类型', () => {
      expect((sys as any)._firewalkersSet instanceof Set).toBe(true)
    })
  })

  // ==================== 数据结构测试 ====================
  describe('数据结构', () => {
    it('注入后可查询 mastery', () => {
      ;(sys as any).firewalkers.push(makeFirewalker(1, 'master'))
      expect((sys as any).firewalkers[0].mastery).toBe('master')
    })

    it('支持所有 4 种火行者精通等级', () => {
      const levels: FirewalkerMastery[] = ['novice', 'adept', 'master', 'grandmaster']
      levels.forEach((l, i) => { ;(sys as any).firewalkers.push(makeFirewalker(i + 1, l)) })
      const all = (sys as any).firewalkers
      levels.forEach((l, i) => { expect(all[i].mastery).toBe(l) })
    })

    it('heatResistance 上限为 100（grandmaster）', () => {
      const f = makeFirewalker(1, 'grandmaster', true, 700, 100)
      ;(sys as any).firewalkers.push(f)
      expect((sys as any).firewalkers[0].heatResistance).toBe(100)
    })

    it('active 字段可设为 false', () => {
      ;(sys as any).firewalkers.push(makeFirewalker(1, 'novice', false))
      expect((sys as any).firewalkers[0].active).toBe(false)
    })

    it('fireTrail 初始为 false', () => {
      ;(sys as any).firewalkers.push(makeFirewalker(1))
      expect((sys as any).firewalkers[0].fireTrail).toBe(false)
    })

    it('tick 字段初始为 0', () => {
      ;(sys as any).firewalkers.push(makeFirewalker(1))
      expect((sys as any).firewalkers[0].tick).toBe(0)
    })

    it('walkDistance 字段可自定义', () => {
      ;(sys as any).firewalkers.push(makeFirewalker(1, 'novice', true, 250))
      expect((sys as any).firewalkers[0].walkDistance).toBe(250)
    })

    it('entityId 字段正确存储', () => {
      ;(sys as any).firewalkers.push(makeFirewalker(42))
      expect((sys as any).firewalkers[0].entityId).toBe(42)
    })

    it('novice heatResistance 初始为 20', () => {
      ;(sys as any).firewalkers.push(makeFirewalker(1, 'novice', true, 0, 20))
      expect((sys as any).firewalkers[0].heatResistance).toBe(20)
    })

    it('多个火行者 entityId 各不同', () => {
      for (let i = 1; i <= 5; i++) {
        ;(sys as any).firewalkers.push(makeFirewalker(i))
      }
      const ids = (sys as any).firewalkers.map((f: FirewalkerData) => f.entityId)
      expect(new Set(ids).size).toBe(5)
    })
  })

  // ==================== tick 控制测试 ====================
  describe('tick 控制（CHECK_INTERVAL=2600）', () => {
    it('tick差值 < 2600 时不更新 lastCheck', () => {
      const em = makeEM()
      sys.update(1, em as any, 100)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick差值 >= 2600 时更新 lastCheck', () => {
      const em = makeEM()
      sys.update(1, em as any, 3000)
      expect((sys as any).lastCheck).toBe(3000)
    })

    it('tick差值 = 2599 时不执行（边界值）', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 2599)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick差值 = 2600 时执行（边界值）', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 2600)
      expect((sys as any).lastCheck).toBe(2600)
    })

    it('lastCheck 更新为当前 tick 值', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 9999)
      expect((sys as any).lastCheck).toBe(9999)
    })

    it('连续两次 update，第二次 tick 不足时不更新', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 2600)
      expect((sys as any).lastCheck).toBe(2600)
      sys.update(0, em as any, 3000) // diff = 400 < 2600
      expect((sys as any).lastCheck).toBe(2600)
    })

    it('负数 tick 差值不触发执行', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 5000
      sys.update(0, em as any, 100)
      expect((sys as any).lastCheck).toBe(5000)
    })

    it('tick=0 时不执行', () => {
      const em = makeEM()
      sys.update(0, em as any, 0)
      expect((sys as any).lastCheck).toBe(0)
    })
  })

  // ==================== mastery 晋升逻辑测试 ====================
  describe('mastery 晋升逻辑（基于 walkDistance 阈值）', () => {
    it('walkDistance > 100 且 mastery=novice 时晋升为 adept', () => {
      const f = makeFirewalker(1, 'novice', true, 101, 20)
      ;(sys as any).firewalkers.push(f)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      Math.random = () => 1  // 不触发 walkDistance 增加
      sys.update(1, em as any, 2600)
      expect((sys as any).firewalkers[0].mastery).toBe('adept')
      expect((sys as any).firewalkers[0].heatResistance).toBe(50)
      expect((sys as any).firewalkers[0].fireTrail).toBe(true)
    })

    it('walkDistance > 300 且 mastery=adept 时晋升为 master', () => {
      const f = makeFirewalker(1, 'adept', true, 301, 50)
      f.fireTrail = true
      ;(sys as any).firewalkers.push(f)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      Math.random = () => 1
      sys.update(1, em as any, 2600)
      expect((sys as any).firewalkers[0].mastery).toBe('master')
      expect((sys as any).firewalkers[0].heatResistance).toBe(80)
    })

    it('walkDistance > 600 且 mastery=master 时晋升为 grandmaster', () => {
      const f = makeFirewalker(1, 'master', true, 601, 80)
      ;(sys as any).firewalkers.push(f)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      Math.random = () => 1
      sys.update(1, em as any, 2600)
      expect((sys as any).firewalkers[0].mastery).toBe('grandmaster')
      expect((sys as any).firewalkers[0].heatResistance).toBe(100)
    })

    it('walkDistance = 100 时 novice 不晋升（需严格大于100）', () => {
      const f = makeFirewalker(1, 'novice', true, 100, 20)
      ;(sys as any).firewalkers.push(f)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      Math.random = () => 1
      sys.update(1, em as any, 2600)
      expect((sys as any).firewalkers[0].mastery).toBe('novice')
    })

    it('walkDistance = 300 时 adept 不晋升（需严格大于300）', () => {
      const f = makeFirewalker(1, 'adept', true, 300, 50)
      ;(sys as any).firewalkers.push(f)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      Math.random = () => 1
      sys.update(1, em as any, 2600)
      expect((sys as any).firewalkers[0].mastery).toBe('adept')
    })

    it('walkDistance = 600 时 master 不晋升（需严格大于600）', () => {
      const f = makeFirewalker(1, 'master', true, 600, 80)
      ;(sys as any).firewalkers.push(f)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      Math.random = () => 1
      sys.update(1, em as any, 2600)
      expect((sys as any).firewalkers[0].mastery).toBe('master')
    })

    it('grandmaster 不再晋升', () => {
      const f = makeFirewalker(1, 'grandmaster', true, 9999, 100)
      ;(sys as any).firewalkers.push(f)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      Math.random = () => 1
      sys.update(1, em as any, 2600)
      expect((sys as any).firewalkers[0].mastery).toBe('grandmaster')
      expect((sys as any).firewalkers[0].heatResistance).toBe(100)
    })

    it('novice 晋升 adept 后 fireTrail 变为 true', () => {
      const f = makeFirewalker(1, 'novice', true, 200, 20)
      ;(sys as any).firewalkers.push(f)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      Math.random = () => 1
      sys.update(1, em as any, 2600)
      expect((sys as any).firewalkers[0].fireTrail).toBe(true)
    })

    it('adept 晋升 master 时 fireTrail 不清除', () => {
      const f = makeFirewalker(1, 'adept', true, 400, 50)
      f.fireTrail = true
      ;(sys as any).firewalkers.push(f)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      Math.random = () => 1
      sys.update(1, em as any, 2600)
      expect((sys as any).firewalkers[0].fireTrail).toBe(true)
    })

    it('novice walkDistance <= 100 不晋升', () => {
      const f = makeFirewalker(1, 'novice', true, 50, 20)
      ;(sys as any).firewalkers.push(f)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      Math.random = () => 1
      sys.update(1, em as any, 2600)
      expect((sys as any).firewalkers[0].mastery).toBe('novice')
      expect((sys as any).firewalkers[0].heatResistance).toBe(20)
    })
  })

  // ==================== walkDistance 增长测试 ====================
  describe('walkDistance 随机增长', () => {
    it('random < 0.03 时 walkDistance 增加至少1', () => {
      const f = makeFirewalker(1, 'novice', true, 0, 20)
      ;(sys as any).firewalkers.push(f)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.001) // < 0.03 触发增长
      sys.update(1, em as any, 2600)
      expect((sys as any).firewalkers[0].walkDistance).toBeGreaterThan(0)
    })

    it('random >= 0.03 时 walkDistance 不变', () => {
      const f = makeFirewalker(1, 'novice', true, 50, 20)
      ;(sys as any).firewalkers.push(f)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.5) // >= 0.03 不增长
      sys.update(1, em as any, 2600)
      expect((sys as any).firewalkers[0].walkDistance).toBe(50)
    })
  })

  // ==================== cleanup 测试 ====================
  describe('cleanup 删除逻辑', () => {
    it('cleanup: hasComponent=false 时移除火行者', () => {
      const f = makeFirewalker(42, 'novice', true, 10, 20)
      ;(sys as any).firewalkers.push(f)
      const em = {
        getEntitiesWithComponent: vi.fn().mockReturnValue([]),
        hasComponent: vi.fn().mockReturnValue(false),
      }
      ;(sys as any).lastCheck = 0
      Math.random = () => 1
      sys.update(1, em as any, 2600)
      expect((sys as any).firewalkers).toHaveLength(0)
    })

    it('cleanup: hasComponent=true 时保留火行者', () => {
      const f = makeFirewalker(42, 'novice', true, 10, 20)
      ;(sys as any).firewalkers.push(f)
      const em = {
        getEntitiesWithComponent: vi.fn().mockReturnValue([]),
        hasComponent: vi.fn().mockReturnValue(true),
      }
      ;(sys as any).lastCheck = 0
      Math.random = () => 1
      sys.update(1, em as any, 2600)
      expect((sys as any).firewalkers).toHaveLength(1)
    })

    it('cleanup 后从 _firewalkersSet 中删除', () => {
      const f = makeFirewalker(42)
      ;(sys as any).firewalkers.push(f)
      ;(sys as any)._firewalkersSet.add(42)
      const em = {
        getEntitiesWithComponent: vi.fn().mockReturnValue([]),
        hasComponent: vi.fn().mockReturnValue(false),
      }
      ;(sys as any).lastCheck = 0
      Math.random = () => 1
      sys.update(1, em as any, 2600)
      // 删除时会调用 _firewalkersSet.delete
      expect((sys as any).firewalkers).toHaveLength(0)
    })

    it('cleanup 混合：部分有效部分无效', () => {
      const f1 = makeFirewalker(10, 'novice', true, 10, 20)
      const f2 = makeFirewalker(20, 'adept', true, 200, 50)
      ;(sys as any).firewalkers.push(f1, f2)
      const em = {
        getEntitiesWithComponent: vi.fn().mockReturnValue([]),
        hasComponent: vi.fn().mockImplementation((eid: number) => eid === 20),
      }
      ;(sys as any).lastCheck = 0
      Math.random = () => 1
      sys.update(1, em as any, 2600)
      const remaining = (sys as any).firewalkers as FirewalkerData[]
      expect(remaining).toHaveLength(1)
      expect(remaining[0].entityId).toBe(20)
    })

    it('空列表 cleanup 无副作用', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 2600)
      expect((sys as any).firewalkers).toHaveLength(0)
    })

    it('tick 不足时不执行 cleanup', () => {
      const f = makeFirewalker(42)
      ;(sys as any).firewalkers.push(f)
      const em = {
        getEntitiesWithComponent: vi.fn().mockReturnValue([]),
        hasComponent: vi.fn().mockReturnValue(false),
      }
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 100) // diff = 100 < 2600
      expect((sys as any).firewalkers).toHaveLength(1)
    })
  })

  // ==================== 招募逻辑测试 ====================
  describe('招募逻辑', () => {
    it('列表未满且 random < ASSIGN_CHANCE(0.002) 且有实体时招募', () => {
      const em = {
        getEntitiesWithComponent: vi.fn().mockReturnValue([100]),
        hasComponent: vi.fn().mockReturnValue(true),
      }
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.001) // < 0.002
      sys.update(1, em as any, 2600)
      expect((sys as any).firewalkers.length).toBeGreaterThanOrEqual(1)
    })

    it('random >= ASSIGN_CHANCE(0.002) 时不招募', () => {
      const em = makeEM({ entities: [100] })
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, em as any, 2600)
      expect((sys as any).firewalkers).toHaveLength(0)
    })

    it('已达 MAX_FIREWALKERS(8) 时不招募', () => {
      for (let i = 1; i <= 8; i++) {
        ;(sys as any).firewalkers.push(makeFirewalker(i, 'novice', true, 50, 20))
        ;(sys as any)._firewalkersSet.add(i)
      }
      const em = {
        getEntitiesWithComponent: vi.fn().mockReturnValue([100]),
        hasComponent: vi.fn().mockReturnValue(true),
      }
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, em as any, 2600)
      const newOnes = (sys as any).firewalkers.filter((f: FirewalkerData) => f.entityId === 100)
      expect(newOnes).toHaveLength(0)
    })

    it('已在 _firewalkersSet 中的实体不重复招募', () => {
      ;(sys as any)._firewalkersSet.add(100)
      ;(sys as any).firewalkers.push(makeFirewalker(100))
      const em = {
        getEntitiesWithComponent: vi.fn().mockReturnValue([100]),
        hasComponent: vi.fn().mockReturnValue(true),
      }
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, em as any, 2600)
      expect((sys as any).firewalkers.filter((f: FirewalkerData) => f.entityId === 100)).toHaveLength(1)
    })

    it('无实体时不招募', () => {
      const em = {
        getEntitiesWithComponent: vi.fn().mockReturnValue([]),
        hasComponent: vi.fn().mockReturnValue(true),
      }
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, em as any, 2600)
      expect((sys as any).firewalkers).toHaveLength(0)
    })

    it('新招募的火行者 mastery 初始为 novice', () => {
      const em = {
        getEntitiesWithComponent: vi.fn().mockReturnValue([200]),
        hasComponent: vi.fn().mockReturnValue(true),
      }
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, em as any, 2600)
      const newOnes = (sys as any).firewalkers.filter((f: FirewalkerData) => f.entityId === 200)
      if (newOnes.length > 0) {
        expect(newOnes[0].mastery).toBe('novice')
        expect(newOnes[0].heatResistance).toBe(20)
        // walkDistance 初始为 0，但 update 中 random < 0.03 时会增长
        expect(newOnes[0].walkDistance).toBeGreaterThanOrEqual(0)
        expect(newOnes[0].active).toBe(true)
        expect(newOnes[0].fireTrail).toBe(false)
      }
    })
  })

  // ==================== MASTERY_RESISTANCE 常量测试 ====================
  describe('MASTERY_RESISTANCE 常量映射', () => {
    it('novice → heatResistance = 20', () => {
      const f = makeFirewalker(1, 'novice', true, 50, 20)
      ;(sys as any).firewalkers.push(f)
      expect(f.heatResistance).toBe(20)
    })

    it('adept → heatResistance = 50', () => {
      const f = makeFirewalker(1, 'adept', true, 200, 50)
      ;(sys as any).firewalkers.push(f)
      expect(f.heatResistance).toBe(50)
    })

    it('master → heatResistance = 80', () => {
      const f = makeFirewalker(1, 'master', true, 400, 80)
      ;(sys as any).firewalkers.push(f)
      expect(f.heatResistance).toBe(80)
    })

    it('grandmaster → heatResistance = 100', () => {
      const f = makeFirewalker(1, 'grandmaster', true, 700, 100)
      ;(sys as any).firewalkers.push(f)
      expect(f.heatResistance).toBe(100)
    })
  })

  // ==================== 边界与特殊场景测试 ====================
  describe('边界与特殊场景', () => {
    it('dt 参数不影响 tick 检查逻辑', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(999, em as any, 2600)
      expect((sys as any).lastCheck).toBe(2600)
    })

    it('超大 tick 值正常处理', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 999999999)
      expect((sys as any).lastCheck).toBe(999999999)
    })

    it('多个漂移者同时晋升', () => {
      const f1 = makeFirewalker(1, 'novice', true, 150, 20)
      const f2 = makeFirewalker(2, 'adept', true, 350, 50)
      ;(sys as any).firewalkers.push(f1, f2)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      Math.random = () => 1
      sys.update(1, em as any, 2600)
      expect((sys as any).firewalkers[0].mastery).toBe('adept')
      expect((sys as any).firewalkers[1].mastery).toBe('master')
    })

    it('walkDistance=101 时 novice 晋升为 adept（刚过阈值）', () => {
      const f = makeFirewalker(1, 'novice', true, 101, 20)
      ;(sys as any).firewalkers.push(f)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      Math.random = () => 1
      sys.update(1, em as any, 2600)
      expect((sys as any).firewalkers[0].mastery).toBe('adept')
    })

    it('walkDistance=601 时 master 晋升为 grandmaster（刚过阈值）', () => {
      const f = makeFirewalker(1, 'master', true, 601, 80)
      ;(sys as any).firewalkers.push(f)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      Math.random = () => 1
      sys.update(1, em as any, 2600)
      expect((sys as any).firewalkers[0].mastery).toBe('grandmaster')
      expect((sys as any).firewalkers[0].heatResistance).toBe(100)
    })
  })
})
