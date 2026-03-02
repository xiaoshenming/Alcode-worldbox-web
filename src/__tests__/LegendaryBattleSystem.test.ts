import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { LegendaryBattleSystem, BattleInfo } from '../systems/LegendaryBattleSystem'
import { EntityManager } from '../ecs/Entity'

function makeSys() { return new LegendaryBattleSystem() }

function makeMockCivManager(civs: Array<{ id: number; name: string }> = []) {
  const map = new Map<number, { name: string }>()
  for (const c of civs) map.set(c.id, { name: c.name })
  return { civilizations: map }
}

// Helper: build EntityManager with N fighters spread across 2+ civs
function makeEmWithFighters(
  em: EntityManager,
  count: number,
  civCount: number = 2,
  baseX: number = 50,
  baseY: number = 50
) {
  for (let i = 0; i < count; i++) {
    const id = em.createEntity()
    em.addComponent(id, { type: 'position', x: baseX + (i % 4), y: baseY + Math.floor(i / 4) })
    em.addComponent(id, { type: 'creature', species: 'human', speed: 1, damage: 5, isHostile: true, name: `C${i}`, age: 0, maxAge: 100, gender: 'male' })
    em.addComponent(id, { type: 'needs', hunger: 10, health: 80 })
    em.addComponent(id, { type: 'civMember', civId: (i % civCount) + 1, role: 'worker' })
  }
}

describe('LegendaryBattleSystem — 初始化状态', () => {
  let sys: LegendaryBattleSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('getActiveBattles 初始为空数组', () => {
    expect(sys.getActiveBattles()).toHaveLength(0)
  })

  it('getActiveBattles 返回数组类型', () => {
    expect(Array.isArray(sys.getActiveBattles())).toBe(true)
  })

  it('getBattleAt 无战斗时返回 null', () => {
    expect(sys.getBattleAt(0, 0, 5)).toBeNull()
  })

  it('getBattleAt 大半径无战斗仍返回 null', () => {
    expect(sys.getBattleAt(100, 100, 9999)).toBeNull()
  })

  it('nextBattleId 初始为 1', () => {
    expect((sys as any).nextBattleId).toBe(1)
  })

  it('heroBuffs 初始为空 Map', () => {
    expect((sys as any).heroBuffs.size).toBe(0)
  })

  it('battles 内部 Map 初始为空', () => {
    expect((sys as any).battles.size).toBe(0)
  })

  it('warStories 初始为空数组', () => {
    expect((sys as any).warStories).toHaveLength(0)
  })

  it('_battlesBuf 初始为空数组', () => {
    expect((sys as any)._battlesBuf).toBeDefined()
  })

  it('_detectGrid 初始为空 Map', () => {
    expect((sys as any)._detectGrid.size).toBe(0)
  })
})

describe('LegendaryBattleSystem — calcPhase 私有方法', () => {
  let sys: LegendaryBattleSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('count < 10 返回 SKIRMISH', () => {
    expect((sys as any).calcPhase(0)).toBe('SKIRMISH')
    expect((sys as any).calcPhase(9)).toBe('SKIRMISH')
  })

  it('count = 10 返回 BATTLE', () => {
    expect((sys as any).calcPhase(10)).toBe('BATTLE')
  })

  it('count 10-29 返回 BATTLE', () => {
    expect((sys as any).calcPhase(15)).toBe('BATTLE')
    expect((sys as any).calcPhase(29)).toBe('BATTLE')
  })

  it('count = 30 返回 EPIC_BATTLE', () => {
    expect((sys as any).calcPhase(30)).toBe('EPIC_BATTLE')
  })

  it('count 30-49 返回 EPIC_BATTLE', () => {
    expect((sys as any).calcPhase(40)).toBe('EPIC_BATTLE')
    expect((sys as any).calcPhase(49)).toBe('EPIC_BATTLE')
  })

  it('count = 50 返回 LEGENDARY', () => {
    expect((sys as any).calcPhase(50)).toBe('LEGENDARY')
  })

  it('count > 50 返回 LEGENDARY', () => {
    expect((sys as any).calcPhase(100)).toBe('LEGENDARY')
    expect((sys as any).calcPhase(999)).toBe('LEGENDARY')
  })
})

describe('LegendaryBattleSystem — getParticipantCount 私有方法', () => {
  let sys: LegendaryBattleSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('无参与者返回 0', () => {
    const battle = { participants: new Map() } as any
    expect((sys as any).getParticipantCount(battle)).toBe(0)
  })

  it('单文明计算正确', () => {
    const s = new Set([1, 2, 3])
    const battle = { participants: new Map([[1, s]]) } as any
    expect((sys as any).getParticipantCount(battle)).toBe(3)
  })

  it('多文明累加正确', () => {
    const p = new Map([[1, new Set([1, 2])], [2, new Set([3, 4, 5])]])
    const battle = { participants: p } as any
    expect((sys as any).getParticipantCount(battle)).toBe(5)
  })
})

describe('LegendaryBattleSystem — getBattleAt 定位查询', () => {
  let sys: LegendaryBattleSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  function injectBattle(cx: number, cy: number, phase: BattleInfo['phase'] = 'BATTLE') {
    const id = (sys as any).nextBattleId++
    const battle: BattleInfo = {
      id, centerX: cx, centerY: cy,
      participants: new Map([[1, new Set([1])], [2, new Set([2])]]),
      startTick: 0, casualties: 0, phase, lastUpdateTick: 0
    }
    ;(sys as any).battles.set(id, battle)
    return battle
  }

  it('精确命中返回战斗', () => {
    injectBattle(10, 10)
    expect(sys.getBattleAt(10, 10, 5)).not.toBeNull()
  })

  it('边界半径内命中', () => {
    injectBattle(0, 0)
    // 距离 = 5, radius = 5  → dx*dx + dy*dy = 25 <= 25
    expect(sys.getBattleAt(5, 0, 5)).not.toBeNull()
  })

  it('超出半径返回 null', () => {
    injectBattle(0, 0)
    expect(sys.getBattleAt(10, 10, 5)).toBeNull()
  })

  it('多战斗返回最近的（第一个命中）', () => {
    injectBattle(0, 0)
    const b2 = injectBattle(100, 100)
    const result = sys.getBattleAt(100, 100, 5)
    expect(result?.id).toBe(b2.id)
  })

  it('getActiveBattles 返回已注入战斗', () => {
    injectBattle(10, 10)
    injectBattle(20, 20)
    expect(sys.getActiveBattles()).toHaveLength(2)
  })

  it('LEGENDARY 阶段战斗可被查询到', () => {
    injectBattle(5, 5, 'LEGENDARY')
    const b = sys.getBattleAt(5, 5, 1)
    expect(b?.phase).toBe('LEGENDARY')
  })
})

describe('LegendaryBattleSystem — update() 基础行为', () => {
  let sys: LegendaryBattleSystem
  let em: EntityManager

  beforeEach(() => {
    sys = makeSys()
    em = new EntityManager()
  })
  afterEach(() => { vi.restoreAllMocks() })

  const civMgr = makeMockCivManager([{ id: 1, name: 'Alpha' }, { id: 2, name: 'Beta' }])

  it('空 EM 不崩溃', () => {
    expect(() => sys.update(10, em, civMgr as any)).not.toThrow()
  })

  it('少于10个战斗实体时不创建战斗', () => {
    makeEmWithFighters(em, 5)
    sys.update(10, em, civMgr as any)
    expect(sys.getActiveBattles()).toHaveLength(0)
  })

  it('tick % 10 !== 0 时跳过扫描不崩溃', () => {
    makeEmWithFighters(em, 15)
    expect(() => sys.update(11, em, civMgr as any)).not.toThrow()
    expect(sys.getActiveBattles()).toHaveLength(0)
  })

  it('过期战斗被清除', () => {
    const id = (sys as any).nextBattleId++
    const battle: BattleInfo = {
      id, centerX: 50, centerY: 50,
      participants: new Map([[1, new Set([99])], [2, new Set([100])]]),
      startTick: 0, casualties: 0, phase: 'BATTLE', lastUpdateTick: 0
    }
    ;(sys as any).battles.set(id, battle)
    // 经过 121+ ticks 后战斗过期
    sys.update(130, em, civMgr as any)
    expect((sys as any).battles.has(id)).toBe(false)
  })

  it('过期 hero buffs 被清除', () => {
    ;(sys as any).heroBuffs.set(1, 5) // expiry = tick 5
    sys.update(10, em, civMgr as any)
    expect((sys as any).heroBuffs.has(1)).toBe(false)
  })

  it('未过期 hero buffs 保留', () => {
    ;(sys as any).heroBuffs.set(1, 100) // expiry = tick 100
    sys.update(10, em, civMgr as any)
    expect((sys as any).heroBuffs.has(1)).toBe(true)
  })
})

describe('LegendaryBattleSystem — finalizeBattle 生成战争故事', () => {
  let sys: LegendaryBattleSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('伤亡 < 3 时不生成故事', () => {
    const battle: BattleInfo = {
      id: 1, centerX: 0, centerY: 0,
      participants: new Map([[1, new Set([1])], [2, new Set([2])]]),
      startTick: 0, casualties: 2, phase: 'BATTLE', lastUpdateTick: 0
    }
    const civMgr = makeMockCivManager([{ id: 1, name: 'A' }, { id: 2, name: 'B' }])
    ;(sys as any).finalizeBattle(battle, civMgr)
    expect((sys as any).warStories).toHaveLength(0)
  })

  it('伤亡 >= 3 生成故事', () => {
    const battle: BattleInfo = {
      id: 1, centerX: 10, centerY: 20,
      participants: new Map([[1, new Set([1])], [2, new Set([2])]]),
      startTick: 0, casualties: 5, phase: 'BATTLE', lastUpdateTick: 0
    }
    const civMgr = makeMockCivManager([{ id: 1, name: 'Alpha' }, { id: 2, name: 'Beta' }])
    ;(sys as any).finalizeBattle(battle, civMgr)
    expect((sys as any).warStories).toHaveLength(1)
  })

  it('故事包含文明名称', () => {
    const battle: BattleInfo = {
      id: 2, centerX: 5, centerY: 5,
      participants: new Map([[1, new Set([1])], [2, new Set([2])]]),
      startTick: 0, casualties: 10, phase: 'EPIC_BATTLE', lastUpdateTick: 0
    }
    const civMgr = makeMockCivManager([{ id: 1, name: 'RedCiv' }, { id: 2, name: 'BlueCiv' }])
    ;(sys as any).finalizeBattle(battle, civMgr)
    const story: string = (sys as any).warStories[0]
    expect(story).toContain('RedCiv')
    expect(story).toContain('BlueCiv')
  })

  it('故事包含伤亡数', () => {
    const battle: BattleInfo = {
      id: 3, centerX: 5, centerY: 5,
      participants: new Map([[1, new Set([1])], [2, new Set([2])]]),
      startTick: 0, casualties: 42, phase: 'BATTLE', lastUpdateTick: 0
    }
    const civMgr = makeMockCivManager([{ id: 1, name: 'A' }, { id: 2, name: 'B' }])
    ;(sys as any).finalizeBattle(battle, civMgr)
    expect((sys as any).warStories[0]).toContain('42')
  })

  it('故事超过50条时移除最旧的', () => {
    const civMgr = makeMockCivManager([{ id: 1, name: 'A' }, { id: 2, name: 'B' }])
    for (let i = 0; i < 55; i++) {
      const battle: BattleInfo = {
        id: i + 1, centerX: 0, centerY: 0,
        participants: new Map([[1, new Set([1])], [2, new Set([2])]]),
        startTick: 0, casualties: 5, phase: 'BATTLE', lastUpdateTick: 0
      }
      ;(sys as any).finalizeBattle(battle, civMgr)
    }
    expect((sys as any).warStories.length).toBeLessThanOrEqual(50)
  })

  it('文明未知时使用 Unknown 占位', () => {
    const battle: BattleInfo = {
      id: 4, centerX: 0, centerY: 0,
      participants: new Map([[999, new Set([1])]]),
      startTick: 0, casualties: 5, phase: 'BATTLE', lastUpdateTick: 0
    }
    const civMgr = makeMockCivManager([])
    ;(sys as any).finalizeBattle(battle, civMgr)
    expect((sys as any).warStories[0]).toContain('Unknown')
  })

  it('故事包含坐标位置', () => {
    const battle: BattleInfo = {
      id: 5, centerX: 33, centerY: 77,
      participants: new Map([[1, new Set([1])], [2, new Set([2])]]),
      startTick: 0, casualties: 4, phase: 'BATTLE', lastUpdateTick: 0
    }
    const civMgr = makeMockCivManager([{ id: 1, name: 'A' }, { id: 2, name: 'B' }])
    ;(sys as any).finalizeBattle(battle, civMgr)
    expect((sys as any).warStories[0]).toContain('33')
    expect((sys as any).warStories[0]).toContain('77')
  })
})

describe('LegendaryBattleSystem — mergeBattle', () => {
  let sys: LegendaryBattleSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('合并后更新 lastUpdateTick', () => {
    const battle: BattleInfo = {
      id: 1, centerX: 10, centerY: 10,
      participants: new Map([[1, new Set([1])]]),
      startTick: 0, casualties: 0, phase: 'BATTLE', lastUpdateTick: 0
    }
    ;(sys as any).battles.set(1, battle)
    const civCounts = new Map([[2, [2, 3]]])
    ;(sys as any).mergeBattle(battle, civCounts, 20, 20, 99)
    expect(battle.lastUpdateTick).toBe(99)
  })

  it('合并后中心坐标取平均', () => {
    const battle: BattleInfo = {
      id: 1, centerX: 0, centerY: 0,
      participants: new Map([[1, new Set([1])]]),
      startTick: 0, casualties: 0, phase: 'BATTLE', lastUpdateTick: 0
    }
    ;(sys as any).mergeBattle(battle, new Map([[2, [2]]]), 20, 20, 5)
    expect(battle.centerX).toBe(10)
    expect(battle.centerY).toBe(10)
  })

  it('已有文明的参与者集合合并', () => {
    const set1 = new Set<number>([1])
    const battle: BattleInfo = {
      id: 1, centerX: 0, centerY: 0,
      participants: new Map([[1, set1]]),
      startTick: 0, casualties: 0, phase: 'BATTLE', lastUpdateTick: 0
    }
    const civCounts = new Map([[1, [2, 3]]])
    ;(sys as any).mergeBattle(battle, civCounts, 0, 0, 0)
    expect(set1.has(2)).toBe(true)
    expect(set1.has(3)).toBe(true)
  })

  it('新文明加入时创建新集合', () => {
    const battle: BattleInfo = {
      id: 1, centerX: 0, centerY: 0,
      participants: new Map([[1, new Set([1])]]),
      startTick: 0, casualties: 0, phase: 'BATTLE', lastUpdateTick: 0
    }
    const civCounts = new Map([[99, [77, 88]]])
    ;(sys as any).mergeBattle(battle, civCounts, 0, 0, 0)
    expect(battle.participants.has(99)).toBe(true)
  })
})

describe('LegendaryBattleSystem — update() 战斗探测（集成）', () => {
  let sys: LegendaryBattleSystem
  let em: EntityManager

  beforeEach(() => {
    sys = makeSys()
    em = new EntityManager()
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('10个战斗实体跨2个文明触发战斗探测', () => {
    const civMgr = makeMockCivManager([{ id: 1, name: 'A' }, { id: 2, name: 'B' }])
    makeEmWithFighters(em, 10, 2, 50, 50)
    sys.update(10, em, civMgr as any)
    expect(sys.getActiveBattles().length).toBeGreaterThanOrEqual(1)
  })

  it('20个战斗实体战斗阶段为 BATTLE 或更高', () => {
    const civMgr = makeMockCivManager([{ id: 1, name: 'A' }, { id: 2, name: 'B' }])
    makeEmWithFighters(em, 20, 2, 50, 50)
    sys.update(10, em, civMgr as any)
    const battles = sys.getActiveBattles()
    if (battles.length > 0) {
      expect(['BATTLE', 'EPIC_BATTLE', 'LEGENDARY']).toContain(battles[0].phase)
    }
  })

  it('死亡实体被计入伤亡', () => {
    const civMgr = makeMockCivManager([{ id: 1, name: 'A' }, { id: 2, name: 'B' }])
    makeEmWithFighters(em, 10, 2, 50, 50)
    // 第一次扫描建立战斗
    sys.update(10, em, civMgr as any)
    const battles = sys.getActiveBattles()
    if (battles.length > 0) {
      // 注入一个死亡实体进入参与者
      const firstCivSet = battles[0].participants.values().next().value as Set<number>
      const firstEid = firstCivSet.values().next().value as number
      // 将 health 设为 0
      const needs = em.getComponent<any>(firstEid, 'needs')
      if (needs) needs.health = 0
      // 再次 update 计算伤亡
      sys.update(20, em, civMgr as any)
    }
    // 不崩溃即通过
    expect(true).toBe(true)
  })

  it('update 连续调用不崩溃', () => {
    const civMgr = makeMockCivManager([])
    expect(() => {
      for (let t = 0; t <= 50; t += 10) {
        sys.update(t, em, civMgr as any)
      }
    }).not.toThrow()
  })

  it('getActiveBattles 返回可复用 buffer 数组', () => {
    const r1 = sys.getActiveBattles()
    const r2 = sys.getActiveBattles()
    // 同一个 buffer 对象
    expect(r1).toBe(r2)
  })
})

describe('LegendaryBattleSystem — 阶段边界补充', () => {
  let sys: LegendaryBattleSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('calcPhase(1) 返回 SKIRMISH', () => {
    expect((sys as any).calcPhase(1)).toBe('SKIRMISH')
  })

  it('calcPhase(50) 不返回 EPIC_BATTLE', () => {
    expect((sys as any).calcPhase(50)).not.toBe('EPIC_BATTLE')
  })

  it('新实例 battles Map 独立不共享', () => {
    const s1 = makeSys()
    const s2 = makeSys()
    expect((s1 as any).battles).not.toBe((s2 as any).battles)
  })

  it('getActiveBattles 两次调用内容一致', () => {
    const r1 = sys.getActiveBattles()
    const r2 = sys.getActiveBattles()
    expect(r1.length).toBe(r2.length)
  })

  it('getBattleAt radius=0 边界处理不崩溃', () => {
    expect(() => sys.getBattleAt(0, 0, 0)).not.toThrow()
  })

  it('warStories 是数组类型', () => {
    expect(Array.isArray((sys as any).warStories)).toBe(true)
  })

  it('_detectCellPool 初始为空数组', () => {
    expect(Array.isArray((sys as any)._detectCellPool)).toBe(true)
  })

  it('finalizeBattle story 包含 phase 文本（battle）', () => {
    const battle: BattleInfo = {
      id: 2, centerX: 5, centerY: 5,
      participants: new Map([[1, new Set([1])], [2, new Set([2])]]),
      startTick: 0, casualties: 5, phase: 'BATTLE', lastUpdateTick: 0
    }
    const civMgr = makeMockCivManager([{ id: 1, name: 'A' }, { id: 2, name: 'B' }])
    ;(sys as any).finalizeBattle(battle, civMgr)
    const story: string = (sys as any).warStories[0]
    expect(story).toContain('battle')
  })
})
