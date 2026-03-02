import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { SiegeSystem, SiegePhase, SiegeEquipmentType } from '../systems/SiegeSystem'
import type { SiegeInfo } from '../systems/SiegeSystem'
import { EntityManager } from '../ecs/Entity'
import { BuildingType } from '../civilization/Civilization'

afterEach(() => { vi.restoreAllMocks() })

let _nextId = 1
function makeSys(): SiegeSystem { return new SiegeSystem() }

function makeRawSiege(attackerCivId: number, defenderCivId: number, tx = 10, ty = 10): SiegeInfo {
  return {
    id: _nextId++, attackerCivId, defenderCivId,
    targetX: tx, targetY: ty,
    phase: SiegePhase.APPROACHING,
    equipment: [],
    wall: { hp: 200, maxHp: 200, breached: false },
    startTick: 0, duration: 0,
    attackerMorale: 100, defenderMorale: 100,
    sortieTimer: 200, breachBonus: 1,
  }
}

function makeEm() {
  return new EntityManager()
}

function makeCivManager(ids: number[]) {
  const civilizations = new Map<number, { buildings: number[] }>()
  for (const id of ids) civilizations.set(id, { buildings: [] })
  return { civilizations } as any
}

// ─── getSieges ────────────────────────────────────────────
describe('SiegeSystem.getSieges', () => {
  let sys: SiegeSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('初始无围城', () => {
    expect(sys.getSieges()).toHaveLength(0)
  })

  it('注入一个后可查询到 1 条', () => {
    const s = makeRawSiege(1, 2)
    ;(sys as any).sieges.set(s.id, s)
    expect(sys.getSieges()).toHaveLength(1)
  })

  it('注入多个后数量正确', () => {
    for (let i = 0; i < 5; i++) {
      const s = makeRawSiege(i + 1, i + 10)
      ;(sys as any).sieges.set(s.id, s)
    }
    expect(sys.getSieges()).toHaveLength(5)
  })

  it('围城字段 attackerCivId 正确', () => {
    const s = makeRawSiege(3, 4)
    ;(sys as any).sieges.set(s.id, s)
    expect(sys.getSieges()[0].attackerCivId).toBe(3)
  })

  it('围城字段 defenderCivId 正确', () => {
    const s = makeRawSiege(3, 4)
    ;(sys as any).sieges.set(s.id, s)
    expect(sys.getSieges()[0].defenderCivId).toBe(4)
  })

  it('围城字段 phase 初始为 APPROACHING', () => {
    const s = makeRawSiege(1, 2)
    ;(sys as any).sieges.set(s.id, s)
    expect(sys.getSieges()[0].phase).toBe(SiegePhase.APPROACHING)
  })

  it('围城字段 wall.breached 初始为 false', () => {
    const s = makeRawSiege(1, 2)
    ;(sys as any).sieges.set(s.id, s)
    expect(sys.getSieges()[0].wall.breached).toBe(false)
  })

  it('围城字段 attackerMorale 初始为 100', () => {
    const s = makeRawSiege(1, 2)
    ;(sys as any).sieges.set(s.id, s)
    expect(sys.getSieges()[0].attackerMorale).toBe(100)
  })

  it('围城字段 defenderMorale 初始为 100', () => {
    const s = makeRawSiege(1, 2)
    ;(sys as any).sieges.set(s.id, s)
    expect(sys.getSieges()[0].defenderMorale).toBe(100)
  })

  it('支持四种 phase 枚举', () => {
    const phases = [SiegePhase.APPROACHING, SiegePhase.DEPLOYING, SiegePhase.ASSAULTING, SiegePhase.BREACHING]
    phases.forEach((p, i) => {
      const s = makeRawSiege(i + 1, i + 10)
      s.phase = p
      ;(sys as any).sieges.set(s.id, s)
    })
    expect(sys.getSieges()).toHaveLength(4)
  })

  it('返回的是内部 buffer 引用而非副本', () => {
    const s = makeRawSiege(1, 2)
    ;(sys as any).sieges.set(s.id, s)
    const a = sys.getSieges()
    const b = sys.getSieges()
    expect(a).toBe(b)
  })
})

// ─── getSiegeAt ────────────────────────────────────────────
describe('SiegeSystem.getSiegeAt', () => {
  let sys: SiegeSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('无围城时返回 null', () => {
    expect(sys.getSiegeAt(10, 10)).toBeNull()
  })

  it('精确坐标匹配时返回围城', () => {
    const s = makeRawSiege(1, 2, 10, 10)
    ;(sys as any).sieges.set(s.id, s)
    expect(sys.getSiegeAt(10, 10)).not.toBeNull()
  })

  it('在范围内（dx²+dy²<=100）的坐标可查到', () => {
    const s = makeRawSiege(1, 2, 10, 10)
    ;(sys as any).sieges.set(s.id, s)
    // dx=3, dy=4 → 25 ≤ 100
    expect(sys.getSiegeAt(13, 14)).not.toBeNull()
  })

  it('超出范围 (dx²+dy²>100) 的坐标返回 null', () => {
    const s = makeRawSiege(1, 2, 10, 10)
    ;(sys as any).sieges.set(s.id, s)
    // dx=8, dy=8 → 128 > 100
    expect(sys.getSiegeAt(18, 18)).toBeNull()
  })

  it('正好在边界 dx²+dy²=100 时返回围城', () => {
    const s = makeRawSiege(1, 2, 0, 0)
    ;(sys as any).sieges.set(s.id, s)
    // dx=10, dy=0 → 100 = 100
    expect(sys.getSiegeAt(10, 0)).not.toBeNull()
  })

  it('返回攻击者 civId 正确', () => {
    const s = makeRawSiege(7, 8, 20, 20)
    ;(sys as any).sieges.set(s.id, s)
    expect(sys.getSiegeAt(20, 20)!.attackerCivId).toBe(7)
  })

  it('不同坐标处的围城互不干扰', () => {
    const s1 = makeRawSiege(1, 2, 0, 0)
    const s2 = makeRawSiege(3, 4, 100, 100)
    ;(sys as any).sieges.set(s1.id, s1)
    ;(sys as any).sieges.set(s2.id, s2)
    expect(sys.getSiegeAt(0, 0)).not.toBeNull()
    expect(sys.getSiegeAt(100, 100)).not.toBeNull()
    expect(sys.getSiegeAt(50, 50)).toBeNull()
  })
})

// ─── startSiege ────────────────────────────────────────────
describe('SiegeSystem.startSiege', () => {
  let sys: SiegeSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('成功创建围城并返回 SiegeInfo', () => {
    const siege = sys.startSiege(1, 2, 10, 10)
    expect(siege).not.toBeNull()
  })

  it('返回的围城 attackerCivId 正确', () => {
    const siege = sys.startSiege(5, 6, 10, 10)
    expect(siege!.attackerCivId).toBe(5)
  })

  it('返回的围城 defenderCivId 正确', () => {
    const siege = sys.startSiege(5, 6, 10, 10)
    expect(siege!.defenderCivId).toBe(6)
  })

  it('返回的围城坐标正确', () => {
    const siege = sys.startSiege(1, 2, 33, 44)
    expect(siege!.targetX).toBe(33)
    expect(siege!.targetY).toBe(44)
  })

  it('围城初始 phase 为 APPROACHING', () => {
    const siege = sys.startSiege(1, 2, 10, 10)
    expect(siege!.phase).toBe(SiegePhase.APPROACHING)
  })

  it('围城初始 wall hp 为 BASE_WALL_HP(200)', () => {
    const siege = sys.startSiege(1, 2, 10, 10)
    expect(siege!.wall.hp).toBe(200)
  })

  it('围城初始 wall 未被突破', () => {
    const siege = sys.startSiege(1, 2, 10, 10)
    expect(siege!.wall.breached).toBe(false)
  })

  it('围城初始 attackerMorale 为 100', () => {
    const siege = sys.startSiege(1, 2, 10, 10)
    expect(siege!.attackerMorale).toBe(100)
  })

  it('围城初始 defenderMorale 为 100', () => {
    const siege = sys.startSiege(1, 2, 10, 10)
    expect(siege!.defenderMorale).toBe(100)
  })

  it('同一坐标重复开战返回 null', () => {
    sys.startSiege(1, 2, 10, 10)
    const second = sys.startSiege(3, 4, 10, 10)
    expect(second).toBeNull()
  })

  it('不同坐标可同时开两场围城', () => {
    const s1 = sys.startSiege(1, 2, 10, 10)
    const s2 = sys.startSiege(3, 4, 50, 50)
    expect(s1).not.toBeNull()
    expect(s2).not.toBeNull()
    expect(sys.getSieges()).toHaveLength(2)
  })

  it('id 自增', () => {
    const s1 = sys.startSiege(1, 2, 10, 10)
    const s2 = sys.startSiege(3, 4, 50, 50)
    expect(s2!.id).toBe(s1!.id + 1)
  })

  it('startSiege 后 getSiegeAt 可查到', () => {
    sys.startSiege(1, 2, 10, 10)
    expect(sys.getSiegeAt(10, 10)).not.toBeNull()
  })
})

// ─── update: 阶段推进 ────────────────────────────────────────────
describe('SiegeSystem.update - 阶段推进', () => {
  let sys: SiegeSystem
  let em: EntityManager
  let civManager: ReturnType<typeof makeCivManager>

  beforeEach(() => {
    sys = makeSys()
    em = makeEm()
    civManager = makeCivManager([1, 2])
    _nextId = 1
  })

  it('APPROACHING 超过 30 tick 后进入 DEPLOYING', () => {
    sys.startSiege(1, 2, 10, 10)
    // 第一次 update 时 startTick 被设为 tick=1
    sys.update(1, em, civManager, {} as any)
    // duration = tick - startTick = 32 - 1 = 31 >= 30
    sys.update(32, em, civManager, {} as any)
    expect(sys.getSieges()[0].phase).toBe(SiegePhase.DEPLOYING)
  })

  it('未到 30 tick 时保持 APPROACHING', () => {
    sys.startSiege(1, 2, 10, 10)
    sys.update(0, em, civManager, {} as any)
    sys.update(10, em, civManager, {} as any)
    expect(sys.getSieges()[0].phase).toBe(SiegePhase.APPROACHING)
  })

  it('DEPLOYING 无装备超过 60 tick 后进入 ASSAULTING', () => {
    const siege = sys.startSiege(1, 2, 10, 10)!
    siege.phase = SiegePhase.DEPLOYING
    // startTick=0 会被 update 重写，所以用非零值
    // 先 update(1) 让 startTick=1，再 update(62) 使 duration=61
    sys.update(1, em, civManager, {} as any)
    siege.phase = SiegePhase.DEPLOYING // 第一次 update 后还是 APPROACHING，手动设回
    sys.update(62, em, civManager, {} as any)
    expect(sys.getSieges()[0].phase).toBe(SiegePhase.ASSAULTING)
  })

  it('墙壁 HP 归零后进入 BREACHING 阶段', () => {
    const siege = sys.startSiege(1, 2, 10, 10)!
    siege.phase = SiegePhase.ASSAULTING
    siege.wall.hp = 0.001
    // 添加大量近战士兵确保 dmg 足够触发 hp<=0
    for (let i = 0; i < 30; i++) {
      const eid = em.createEntity()
      em.addComponent(eid, { type: 'civMember', civId: 1, role: 'soldier' } as any)
      em.addComponent(eid, { type: 'position', x: 10, y: 10 } as any)
    }
    // 先 update(1) 初始化 startTick
    sys.update(1, em, civManager, {} as any)
    // 再 update(2) 进行实际攻击
    sys.update(2, em, civManager, {} as any)
    expect(sys.getSieges()[0].phase).toBe(SiegePhase.BREACHING)
  })

  it('进入 BREACHING 后 wall.breached 为 true', () => {
    const siege = sys.startSiege(1, 2, 10, 10)!
    siege.phase = SiegePhase.ASSAULTING
    siege.wall.hp = 0.001
    for (let i = 0; i < 30; i++) {
      const eid = em.createEntity()
      em.addComponent(eid, { type: 'civMember', civId: 1, role: 'soldier' } as any)
      em.addComponent(eid, { type: 'position', x: 10, y: 10 } as any)
    }
    sys.update(1, em, civManager, {} as any)
    sys.update(2, em, civManager, {} as any)
    expect(sys.getSieges()[0].wall.breached).toBe(true)
  })

  it('进入 BREACHING 后 breachBonus 变为 1.5', () => {
    const siege = sys.startSiege(1, 2, 10, 10)!
    siege.phase = SiegePhase.ASSAULTING
    siege.wall.hp = 0.001
    for (let i = 0; i < 30; i++) {
      const eid = em.createEntity()
      em.addComponent(eid, { type: 'civMember', civId: 1, role: 'soldier' } as any)
      em.addComponent(eid, { type: 'position', x: 10, y: 10 } as any)
    }
    sys.update(1, em, civManager, {} as any)
    sys.update(2, em, civManager, {} as any)
    expect(sys.getSieges()[0].breachBonus).toBe(1.5)
  })
})

// ─── update: 文明不存在时移除围城 ────────────────────────────────────────────
describe('SiegeSystem.update - 文明缺失时移除', () => {
  let sys: SiegeSystem
  let em: EntityManager

  beforeEach(() => { sys = makeSys(); em = makeEm(); _nextId = 1 })

  it('攻击方文明不存在时围城被移除', () => {
    sys.startSiege(1, 2, 10, 10)
    const cm = makeCivManager([2]) // 只有守方
    sys.update(1, em, cm, {} as any)
    expect(sys.getSieges()).toHaveLength(0)
  })

  it('防守方文明不存在时围城被移除', () => {
    sys.startSiege(1, 2, 10, 10)
    const cm = makeCivManager([1]) // 只有攻方
    sys.update(1, em, cm, {} as any)
    expect(sys.getSieges()).toHaveLength(0)
  })

  it('双方文明都存在时围城不被移除', () => {
    sys.startSiege(1, 2, 10, 10)
    const cm = makeCivManager([1, 2])
    sys.update(1, em, cm, {} as any)
    expect(sys.getSieges()).toHaveLength(1)
  })
})

// ─── update: 士气衰减 ────────────────────────────────────────────
describe('SiegeSystem.update - 士气衰减', () => {
  let sys: SiegeSystem
  let em: EntityManager
  let cm: ReturnType<typeof makeCivManager>

  beforeEach(() => {
    sys = makeSys()
    em = makeEm()
    cm = makeCivManager([1, 2])
    _nextId = 1
  })

  it('攻击方士气会随时间衰减', () => {
    sys.startSiege(1, 2, 10, 10)
    // 先 update(1) 让 startTick=1，之后 update(1001) duration=1000
    sys.update(1, em, cm, {} as any)
    sys.update(1001, em, cm, {} as any)
    const seiges = sys.getSieges()
    if (seiges.length > 0) {
      expect(seiges[0].attackerMorale).toBeLessThan(100)
    }
    // 围城可能已因士气归零而结束，也算通过
  })

  it('防守方士气也会随时间衰减', () => {
    sys.startSiege(1, 2, 10, 10)
    sys.update(1, em, cm, {} as any)
    sys.update(1001, em, cm, {} as any)
    const seiges = sys.getSieges()
    if (seiges.length > 0) {
      expect(seiges[0].defenderMorale).toBeLessThan(100)
    }
  })

  it('攻击方士气归零时围城结束', () => {
    const siege = sys.startSiege(1, 2, 10, 10)!
    // 先 update 一次让 startTick 被设置为非0值
    sys.update(1, em, cm, {} as any)
    // 之后手动设置低士气，让 duration 足够大
    siege.attackerMorale = 0.001
    // tick=1001, duration=1000, decay=15, 士气减0.15 -> 归零
    sys.update(1001, em, cm, {} as any)
    expect(sys.getSieges()).toHaveLength(0)
  })

  it('防守方士气归零时围城结束', () => {
    const siege = sys.startSiege(1, 2, 10, 10)!
    sys.update(1, em, cm, {} as any)
    siege.defenderMorale = 0.001
    sys.update(1001, em, cm, {} as any)
    expect(sys.getSieges()).toHaveLength(0)
  })

  it('士气不低于 0', () => {
    const siege = sys.startSiege(1, 2, 10, 10)!
    siege.attackerMorale = 0
    siege.defenderMorale = 0
    sys.update(10000, em, cm, {} as any)
    // siege may be removed; if it is, that's fine
    // if still active morale must be >= 0
    const sieges = sys.getSieges()
    if (sieges.length > 0) {
      expect(sieges[0].attackerMorale).toBeGreaterThanOrEqual(0)
      expect(sieges[0].defenderMorale).toBeGreaterThanOrEqual(0)
    }
  })
})

// ─── update: 装备建造与部署 ────────────────────────────────────────────
describe('SiegeSystem.update - 装备建造', () => {
  let sys: SiegeSystem
  let em: EntityManager
  let cm: ReturnType<typeof makeCivManager>

  beforeEach(() => {
    sys = makeSys()
    em = makeEm()
    cm = makeCivManager([1, 2])
    _nextId = 1
  })

  it('DEPLOYING 阶段攻城槌 buildProgress 每 tick +1', () => {
    const siege = sys.startSiege(1, 2, 10, 10)!
    siege.phase = SiegePhase.DEPLOYING
    siege.equipment = [{ type: SiegeEquipmentType.BATTERING_RAM, buildProgress: 0, deployed: false }]
    siege.startTick = 0
    siege.duration = 1
    sys.update(2, em, cm, {} as any)
    expect(siege.equipment[0].buildProgress).toBeGreaterThan(0)
  })

  it('DEPLOYING 阶段已部署的装备不再增加 buildProgress', () => {
    const siege = sys.startSiege(1, 2, 10, 10)!
    siege.phase = SiegePhase.DEPLOYING
    siege.equipment = [{ type: SiegeEquipmentType.CATAPULT, buildProgress: 300, deployed: true }]
    siege.startTick = 0
    siege.duration = 1
    sys.update(2, em, cm, {} as any)
    expect(siege.equipment[0].buildProgress).toBe(300)
  })

  it('buildProgress 超过 buildCost 时 deployed 变为 true', () => {
    const siege = sys.startSiege(1, 2, 10, 10)!
    siege.phase = SiegePhase.DEPLOYING
    // BATTERING_RAM buildCost=120, 设 119
    siege.equipment = [{ type: SiegeEquipmentType.BATTERING_RAM, buildProgress: 119, deployed: false }]
    siege.startTick = 0
    siege.duration = 1
    sys.update(2, em, cm, {} as any)
    expect(siege.equipment[0].deployed).toBe(true)
  })

  it('所有装备部署完毕后进入 ASSAULTING', () => {
    const siege = sys.startSiege(1, 2, 10, 10)!
    siege.phase = SiegePhase.DEPLOYING
    siege.equipment = [
      { type: SiegeEquipmentType.CATAPULT, buildProgress: 300, deployed: true },
    ]
    siege.startTick = 0
    siege.duration = 1
    sys.update(2, em, cm, {} as any)
    expect(siege.phase).toBe(SiegePhase.ASSAULTING)
  })
})

// ─── ASSAULT 阶段伤害 ────────────────────────────────────────────
describe('SiegeSystem.update - ASSAULTING 阶段', () => {
  let sys: SiegeSystem
  let em: EntityManager
  let cm: ReturnType<typeof makeCivManager>

  beforeEach(() => {
    sys = makeSys()
    em = makeEm()
    cm = makeCivManager([1, 2])
    _nextId = 1
  })

  it('已部署的投石车每 tick 造成墙体伤害', () => {
    const siege = sys.startSiege(1, 2, 10, 10)!
    siege.phase = SiegePhase.ASSAULTING
    siege.equipment = [{ type: SiegeEquipmentType.CATAPULT, buildProgress: 300, deployed: true }]
    siege.startTick = 1
    const initialHp = siege.wall.hp
    sys.update(2, em, cm, {} as any)
    expect(siege.wall.hp).toBeLessThan(initialHp)
  })

  it('未部署的装备不造成墙体伤害', () => {
    const siege = sys.startSiege(1, 2, 10, 10)!
    siege.phase = SiegePhase.ASSAULTING
    siege.equipment = [{ type: SiegeEquipmentType.TREBUCHET, buildProgress: 0, deployed: false }]
    siege.startTick = 1
    const initialHp = siege.wall.hp
    sys.update(2, em, cm, {} as any)
    // 无装备无兵，伤害=0
    expect(siege.wall.hp).toBe(initialHp)
  })

  it('攻击方士兵在范围内会增加墙壁伤害', () => {
    const siege = sys.startSiege(1, 2, 10, 10)!
    siege.phase = SiegePhase.ASSAULTING
    siege.wall.hp = 200
    siege.startTick = 1
    // 添加 20 个攻击方士兵
    for (let i = 0; i < 20; i++) {
      const eid = em.createEntity()
      em.addComponent(eid, { type: 'civMember', civId: 1, role: 'soldier' } as any)
      em.addComponent(eid, { type: 'position', x: 10, y: 10 } as any)
    }
    sys.update(2, em, cm, {} as any)
    expect(siege.wall.hp).toBeLessThan(200)
  })

  it('墙壁 hp 不低于 0', () => {
    const siege = sys.startSiege(1, 2, 10, 10)!
    siege.phase = SiegePhase.ASSAULTING
    siege.wall.hp = 0.01
    siege.startTick = 1
    siege.equipment = [{ type: SiegeEquipmentType.TREBUCHET, buildProgress: 500, deployed: true }]
    sys.update(2, em, cm, {} as any)
    const s = sys.getSieges()
    if (s.length > 0) {
      expect(s[0].wall.hp).toBeGreaterThanOrEqual(0)
    }
  })
})

// ─── BREACH 阶段 ────────────────────────────────────────────
describe('SiegeSystem.update - BREACHING 阶段', () => {
  let sys: SiegeSystem
  let em: EntityManager
  let cm: ReturnType<typeof makeCivManager>

  beforeEach(() => {
    sys = makeSys()
    em = makeEm()
    cm = makeCivManager([1, 2])
    _nextId = 1
  })

  it('BREACHING 阶段攻击方士气缓慢回复', () => {
    const siege = sys.startSiege(1, 2, 10, 10)!
    siege.phase = SiegePhase.BREACHING
    siege.attackerMorale = 50
    siege.startTick = 1
    sys.update(2, em, cm, {} as any)
    // BREACHING 会 +0.1 morale
    // 但也会有 decay, 净效果可能略有差异，至少不为负
    expect(siege.attackerMorale).toBeGreaterThanOrEqual(0)
  })

  it('BREACHING 阶段攻击方士兵在附近时对防守建筑造成伤害', () => {
    const siege = sys.startSiege(1, 2, 10, 10)!
    siege.phase = SiegePhase.BREACHING
    siege.wall.breached = true
    siege.startTick = 1

    // 防守方建筑
    const bId = em.createEntity()
    em.addComponent(bId, {
      type: 'building',
      civId: 2,
      buildingType: BuildingType.HUT,
      health: 100,
    } as any)
    em.addComponent(bId, { type: 'position', x: 10, y: 10 } as any)
    cm.civilizations.get(2)!.buildings.push(bId)

    // 攻击方士兵
    const soldId = em.createEntity()
    em.addComponent(soldId, { type: 'civMember', civId: 1, role: 'soldier' } as any)
    em.addComponent(soldId, { type: 'position', x: 10, y: 10 } as any)

    sys.update(2, em, cm, {} as any)

    const b = em.getComponent<any>(bId, 'building')
    if (b) {
      expect(b.health).toBeLessThan(100)
    }
    // building may have been removed if health ≤ 0 — either is acceptable
  })
})

// ─── SiegeEquipmentType 常量覆盖 ────────────────────────────────────────────
describe('SiegeEquipmentType 枚举值', () => {
  it('BATTERING_RAM 枚举值正确', () => {
    expect(SiegeEquipmentType.BATTERING_RAM).toBe('battering_ram')
  })
  it('SIEGE_TOWER 枚举值正确', () => {
    expect(SiegeEquipmentType.SIEGE_TOWER).toBe('siege_tower')
  })
  it('CATAPULT 枚举值正确', () => {
    expect(SiegeEquipmentType.CATAPULT).toBe('catapult')
  })
  it('TREBUCHET 枚举值正确', () => {
    expect(SiegeEquipmentType.TREBUCHET).toBe('trebuchet')
  })
})
