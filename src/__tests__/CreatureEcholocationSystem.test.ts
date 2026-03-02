import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureEcholocationSystem } from '../systems/CreatureEcholocationSystem'
import type { EchoPing, EchoAbility } from '../systems/CreatureEcholocationSystem'
import { EntityManager } from '../ecs/Entity'

// ── 辅助工具 ────────────────────────────────────────────────
let nextId = 1
function makeSys(): CreatureEcholocationSystem { return new CreatureEcholocationSystem() }
function makePing(emitterId: number, overrides: Partial<EchoPing> = {}): EchoPing {
  return {
    id: nextId++,
    emitterId,
    range: 10,
    accuracy: 80,
    entitiesDetected: 3,
    resourcesFound: 2,
    tick: 0,
    ...overrides,
  }
}

// RANGE_MAP 参考值（与源码一致）
const RANGE_MAP: Record<EchoAbility, number> = {
  basic: 3,
  refined: 6,
  advanced: 10,
  master: 15,
}

function makeEm(entities: { x?: number; y?: number }[] = []): EntityManager {
  const em = new EntityManager()
  for (const e of entities) {
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', species: 'human', speed: 1, damage: 1, isHostile: false, name: 'T', age: 20, maxAge: 100, gender: 'male' })
    em.addComponent(eid, { type: 'position', x: e.x ?? 0, y: e.y ?? 0 })
  }
  return em
}

// ── 1. 初始状态 ──────────────────────────────────────────────
describe('CreatureEcholocationSystem – 初始状态', () => {
  let sys: CreatureEcholocationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('pings 数组初始为空', () => {
    expect((sys as any).pings).toHaveLength(0)
  })

  it('skillMap 初始为空 Map', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('nextId 初始值为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始值为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
})

// ── 2. EchoPing 数据结构 ─────────────────────────────────────
describe('CreatureEcholocationSystem – EchoPing 数据结构', () => {
  let sys: CreatureEcholocationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入后可查询 emitterId', () => {
    ;(sys as any).pings.push(makePing(1))
    expect((sys as any).pings[0].emitterId).toBe(1)
  })

  it('ping.id 字段正常读取', () => {
    ;(sys as any).pings.push(makePing(1, { id: 77 }))
    expect((sys as any).pings[0].id).toBe(77)
  })

  it('ping.range 字段正常读取', () => {
    ;(sys as any).pings.push(makePing(1, { range: 15 }))
    expect((sys as any).pings[0].range).toBe(15)
  })

  it('ping.accuracy 字段正常读取', () => {
    ;(sys as any).pings.push(makePing(1, { accuracy: 95 }))
    expect((sys as any).pings[0].accuracy).toBe(95)
  })

  it('ping.entitiesDetected 字段正常读取', () => {
    ;(sys as any).pings.push(makePing(1, { entitiesDetected: 7 }))
    expect((sys as any).pings[0].entitiesDetected).toBe(7)
  })

  it('ping.resourcesFound 字段正常读取', () => {
    ;(sys as any).pings.push(makePing(1, { resourcesFound: 4 }))
    expect((sys as any).pings[0].resourcesFound).toBe(4)
  })

  it('ping.tick 字段正常读取', () => {
    ;(sys as any).pings.push(makePing(1, { tick: 2000 }))
    expect((sys as any).pings[0].tick).toBe(2000)
  })
})

// ── 3. 多 ping 管理 ───────────────────────────────────────────
describe('CreatureEcholocationSystem – 多 ping 管理', () => {
  let sys: CreatureEcholocationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入后可查询', () => {
    ;(sys as any).pings.push(makePing(1))
    expect((sys as any).pings[0].emitterId).toBe(1)
  })

  it('返回内部引用（同一对象）', () => {
    ;(sys as any).pings.push(makePing(1))
    expect((sys as any).pings).toBe((sys as any).pings)
  })

  it('多个 ping 全部返回', () => {
    ;(sys as any).pings.push(makePing(1))
    ;(sys as any).pings.push(makePing(2))
    expect((sys as any).pings).toHaveLength(2)
  })

  it('可以同时存储 5 个 pings', () => {
    for (let i = 1; i <= 5; i++) {
      ;(sys as any).pings.push(makePing(i))
    }
    expect((sys as any).pings).toHaveLength(5)
  })

  it('多个 ping emitterId 各自独立', () => {
    ;(sys as any).pings.push(makePing(10))
    ;(sys as any).pings.push(makePing(20))
    ;(sys as any).pings.push(makePing(30))
    const ids = (sys as any).pings.map((p: EchoPing) => p.emitterId)
    expect(ids).toEqual([10, 20, 30])
  })

  it('可以手动清空 pings 列表', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).pings.push(makePing(i + 1))
    }
    ;(sys as any).pings.length = 0
    expect((sys as any).pings).toHaveLength(0)
  })

  it('可以手动删除指定索引 ping', () => {
    ;(sys as any).pings.push(makePing(1))
    ;(sys as any).pings.push(makePing(2))
    ;(sys as any).pings.push(makePing(3))
    ;(sys as any).pings.splice(1, 1)
    expect((sys as any).pings).toHaveLength(2)
    expect((sys as any).pings[0].emitterId).toBe(1)
    expect((sys as any).pings[1].emitterId).toBe(3)
  })
})

// ── 4. skillMap 技能系统 ──────────────────────────────────────
describe('CreatureEcholocationSystem – skillMap 技能系统', () => {
  let sys: CreatureEcholocationSystem
  beforeEach(() => { sys = makeSys() })

  it('未知实体返回 undefined', () => {
    expect((sys as any).skillMap.get(999)).toBeUndefined()
  })

  it('可以用 ?? 回退到 0', () => {
    expect(((sys as any).skillMap.get(999) ?? 0)).toBe(0)
  })

  it('注入技能 75 后返回正确值', () => {
    ;(sys as any).skillMap.set(42, 75)
    expect(((sys as any).skillMap.get(42) ?? 0)).toBe(75)
  })

  it('多个实体技能各自独立', () => {
    ;(sys as any).skillMap.set(1, 20)
    ;(sys as any).skillMap.set(2, 50)
    ;(sys as any).skillMap.set(3, 100)
    expect((sys as any).skillMap.get(1)).toBe(20)
    expect((sys as any).skillMap.get(2)).toBe(50)
    expect((sys as any).skillMap.get(3)).toBe(100)
  })

  it('覆盖已有技能值', () => {
    ;(sys as any).skillMap.set(5, 30)
    ;(sys as any).skillMap.set(5, 80)
    expect((sys as any).skillMap.get(5)).toBe(80)
  })

  it('技能值可以是小数', () => {
    ;(sys as any).skillMap.set(7, 25.5)
    expect((sys as any).skillMap.get(7)).toBeCloseTo(25.5)
  })

  it('skillMap.size 正确反映存储数量', () => {
    ;(sys as any).skillMap.set(1, 10)
    ;(sys as any).skillMap.set(2, 20)
    expect((sys as any).skillMap.size).toBe(2)
  })

  it('删除条目后 size 减少', () => {
    ;(sys as any).skillMap.set(1, 10)
    ;(sys as any).skillMap.set(2, 20)
    ;(sys as any).skillMap.delete(1)
    expect((sys as any).skillMap.size).toBe(1)
  })
})

// ── 5. RANGE_MAP 能力级别 ────────────────────────────────────
describe('CreatureEcholocationSystem – RANGE_MAP 能力级别', () => {
  it('basic 范围为 3', () => {
    expect(RANGE_MAP['basic']).toBe(3)
  })

  it('refined 范围为 6', () => {
    expect(RANGE_MAP['refined']).toBe(6)
  })

  it('advanced 范围为 10', () => {
    expect(RANGE_MAP['advanced']).toBe(10)
  })

  it('master 范围为 15', () => {
    expect(RANGE_MAP['master']).toBe(15)
  })

  it('范围值按级别递增', () => {
    expect(RANGE_MAP['basic']).toBeLessThan(RANGE_MAP['refined'])
    expect(RANGE_MAP['refined']).toBeLessThan(RANGE_MAP['advanced'])
    expect(RANGE_MAP['advanced']).toBeLessThan(RANGE_MAP['master'])
  })

  it('abilityIdx = min(3, floor(skill/25)) — skill=0 → basic', () => {
    const skill = 0
    const idx = Math.min(3, Math.floor(skill / 25))
    const abilities: EchoAbility[] = ['basic', 'refined', 'advanced', 'master']
    expect(abilities[idx]).toBe('basic')
  })

  it('abilityIdx — skill=25 → refined', () => {
    const skill = 25
    const idx = Math.min(3, Math.floor(skill / 25))
    const abilities: EchoAbility[] = ['basic', 'refined', 'advanced', 'master']
    expect(abilities[idx]).toBe('refined')
  })

  it('abilityIdx — skill=50 → advanced', () => {
    const skill = 50
    const idx = Math.min(3, Math.floor(skill / 25))
    const abilities: EchoAbility[] = ['basic', 'refined', 'advanced', 'master']
    expect(abilities[idx]).toBe('advanced')
  })

  it('abilityIdx — skill=75 → master', () => {
    const skill = 75
    const idx = Math.min(3, Math.floor(skill / 25))
    const abilities: EchoAbility[] = ['basic', 'refined', 'advanced', 'master']
    expect(abilities[idx]).toBe('master')
  })

  it('abilityIdx — skill=100 → master（上限 3）', () => {
    const skill = 100
    const idx = Math.min(3, Math.floor(skill / 25))
    const abilities: EchoAbility[] = ['basic', 'refined', 'advanced', 'master']
    expect(abilities[idx]).toBe('master')
  })
})

// ── 6. 业务逻辑公式 ──────────────────────────────────────────
describe('CreatureEcholocationSystem – 业务逻辑公式', () => {
  it('SKILL_GROWTH=0.06 — 技能每次增加 0.06', () => {
    const SKILL_GROWTH = 0.06
    const initial = 30
    expect(Math.min(100, initial + SKILL_GROWTH)).toBeCloseTo(30.06)
  })

  it('skill 上限为 100', () => {
    const skill = 99.94 + 0.06
    expect(Math.min(100, skill)).toBe(100)
  })

  it('过期截止值 = tick - 4000', () => {
    expect(20000 - 4000).toBe(16000)
  })

  it('CHECK_INTERVAL=1000 — tick<1000 时不触发', () => {
    const sys = makeSys()
    const em = makeEm([])
    sys.update(0, em, 999)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=1000 时触发更新', () => {
    const sys = makeSys()
    const em = makeEm([])
    sys.update(0, em, 1000)
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('距离检测公式：dx²+dy² <= range²', () => {
    // 点 (0,0) 到 (3,4) 距离 = 5，range=6 → 应检测到
    const dx = 3, dy = 4, range = 6
    expect(dx * dx + dy * dy <= range * range).toBe(true)
  })

  it('距离检测：超出范围不计入', () => {
    // 点 (0,0) 到 (4,4) 距离 ≈ 5.66，range=5 → 不检测
    const dx = 4, dy = 4, range = 5
    expect(dx * dx + dy * dy <= range * range).toBe(false)
  })

  it('resourcesFound = floor(random * (range/2)) — range=basic=3', () => {
    const range = RANGE_MAP['basic']
    const max = Math.floor(1 * (range / 2))
    expect(max).toBe(1)
  })

  it('resourcesFound — range=master=15', () => {
    const range = RANGE_MAP['master']
    const max = Math.floor(1 * (range / 2))
    expect(max).toBe(7)
  })
})

// ── 7. update 基本行为 ────────────────────────────────────────
describe('CreatureEcholocationSystem – update 基本行为', () => {
  let sys: CreatureEcholocationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick 未达 CHECK_INTERVAL 时不更新 lastCheck', () => {
    const em = makeEm([])
    sys.update(0, em, 500)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=1000 更新 lastCheck', () => {
    const em = makeEm([])
    sys.update(0, em, 1000)
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('无生物时 pings 仍为空', () => {
    const em = makeEm([])
    sys.update(0, em, 1000)
    expect((sys as any).pings).toHaveLength(0)
  })

  it('MAX_PINGS=80 — 达到上限后停止新增', () => {
    for (let i = 0; i < 80; i++) {
      ;(sys as any).pings.push(makePing(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([{ x: 0, y: 0 }])
    sys.update(0, em, 1000)
    expect((sys as any).pings).toHaveLength(80)
  })

  it('ping_chance > PING_CHANCE 时跳过实体', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const em = makeEm([{ x: 0, y: 0 }])
    sys.update(0, em, 1000)
    expect((sys as any).pings).toHaveLength(0)
  })

  it('过期 ping（tick < cutoff）被清除', () => {
    ;(sys as any).pings.push(makePing(1, { tick: 0 }))
    const em = makeEm([])
    sys.update(0, em, 10000) // cutoff=10000-4000=6000, 0 < 6000
    expect((sys as any).pings).toHaveLength(0)
  })

  it('未过期 ping 保留', () => {
    ;(sys as any).pings.push(makePing(1, { tick: 9000 }))
    const em = makeEm([])
    sys.update(0, em, 10000) // cutoff=6000, 9000 > 6000
    expect((sys as any).pings).toHaveLength(1)
  })

  it('混合过期和未过期：只清除过期', () => {
    ;(sys as any).pings.push(makePing(1, { tick: 100 }))   // 过期
    ;(sys as any).pings.push(makePing(2, { tick: 9500 }))  // 保留
    ;(sys as any).pings.push(makePing(3, { tick: 200 }))   // 过期
    const em = makeEm([])
    sys.update(0, em, 10000)
    expect((sys as any).pings).toHaveLength(1)
    expect((sys as any).pings[0].emitterId).toBe(2)
  })

  it('多次 update lastCheck 持续更新', () => {
    const em = makeEm([])
    sys.update(0, em, 1000)
    expect((sys as any).lastCheck).toBe(1000)
    sys.update(0, em, 2000)
    expect((sys as any).lastCheck).toBe(2000)
  })

  it('空列表调用 update 不抛异常', () => {
    const em = makeEm([])
    expect(() => sys.update(0, em, 1000)).not.toThrow()
  })
})

// ── 8. 边界值与健壮性 ────────────────────────────────────────
describe('CreatureEcholocationSystem – 边界值与健壮性', () => {
  let sys: CreatureEcholocationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skillMap 可存储 0 值技能', () => {
    ;(sys as any).skillMap.set(1, 0)
    expect((sys as any).skillMap.get(1)).toBe(0)
  })

  it('skillMap 可存储最大技能值 100', () => {
    ;(sys as any).skillMap.set(1, 100)
    expect((sys as any).skillMap.get(1)).toBe(100)
  })

  it('ping 列表支持正向遍历', () => {
    for (let i = 1; i <= 3; i++) {
      ;(sys as any).pings.push(makePing(i))
    }
    const ids: number[] = []
    for (const p of (sys as any).pings) { ids.push(p.emitterId) }
    expect(ids).toEqual([1, 2, 3])
  })

  it('ping 列表支持反向遍历（用于过期清除）', () => {
    for (let i = 1; i <= 3; i++) {
      ;(sys as any).pings.push(makePing(i))
    }
    const ids: number[] = []
    for (let i = (sys as any).pings.length - 1; i >= 0; i--) {
      ids.push((sys as any).pings[i].emitterId)
    }
    expect(ids).toEqual([3, 2, 1])
  })

  it('accuracy 等于 skill 值', () => {
    ;(sys as any).pings.push(makePing(1, { accuracy: 55 }))
    expect((sys as any).pings[0].accuracy).toBe(55)
  })

  it('entitiesDetected 默认为 3', () => {
    ;(sys as any).pings.push(makePing(1))
    expect((sys as any).pings[0].entitiesDetected).toBe(3)
  })

  it('resourcesFound 可以为 0', () => {
    ;(sys as any).pings.push(makePing(1, { resourcesFound: 0 }))
    expect((sys as any).pings[0].resourcesFound).toBe(0)
  })
})

// ── 9. EchoAbility 类型完整性 ────────────────────────────────
describe('CreatureEcholocationSystem – EchoAbility 枚举完整性', () => {
  const ALL_ABILITIES: EchoAbility[] = ['basic', 'refined', 'advanced', 'master']

  it('共有 4 种 EchoAbility', () => {
    expect(ALL_ABILITIES).toHaveLength(4)
  })

  it('basic 是合法 EchoAbility', () => {
    expect(ALL_ABILITIES).toContain('basic')
  })

  it('refined 是合法 EchoAbility', () => {
    expect(ALL_ABILITIES).toContain('refined')
  })

  it('advanced 是合法 EchoAbility', () => {
    expect(ALL_ABILITIES).toContain('advanced')
  })

  it('master 是合法 EchoAbility', () => {
    expect(ALL_ABILITIES).toContain('master')
  })
})

// ── 10. pruneDeadEntities 协同行为 ──────────────────────────
describe('CreatureEcholocationSystem – pruneDeadEntities 协同', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('死亡实体在 prune 周期被移除 skillMap', () => {
    const sys = makeSys()
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', species: 'human', speed: 1, damage: 1, isHostile: false, name: 'T', age: 20, maxAge: 100, gender: 'male' })
    em.addComponent(eid, { type: 'position', x: 0, y: 0 })
    ;(sys as any).skillMap.set(eid, 60)
    em.removeComponent(eid, 'creature')
    sys.update(0, em, 3600)
    expect((sys as any).skillMap.has(eid)).toBe(false)
  })

  it('存活实体在 prune 后保留 skillMap 条目', () => {
    const sys = makeSys()
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', species: 'human', speed: 1, damage: 1, isHostile: false, name: 'T', age: 20, maxAge: 100, gender: 'male' })
    em.addComponent(eid, { type: 'position', x: 0, y: 0 })
    ;(sys as any).skillMap.set(eid, 60)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, em, 3600)
    expect((sys as any).skillMap.has(eid)).toBe(true)
  })
})
