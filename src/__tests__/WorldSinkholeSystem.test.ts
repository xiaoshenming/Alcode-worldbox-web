import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldSinkholeSystem } from '../systems/WorldSinkholeSystem'
import type { Sinkhole, SinkholeStage } from '../systems/WorldSinkholeSystem'
import { EntityManager } from '../ecs/Entity'

let shNextId = 1
function makeSys(): WorldSinkholeSystem { return new WorldSinkholeSystem() }
function makeSinkhole(
  stage: SinkholeStage = 'active',
  x = 10, y = 10,
  radius = 3, depth = 50,
  startTick = 0, duration = 1000,
): Sinkhole {
  return { id: shNextId++, x, y, radius, depth, stage, startTick, duration }
}
function makeWorld(tile = 5) {
  return { width: 200, height: 200, getTile: (_x: number, _y: number) => tile }
}
function makeEm(): EntityManager { return new EntityManager() }

// ─────────────────────────────────────────────
// 1. 初始状态
// ─────────────────────────────────────────────
describe('WorldSinkholeSystem 初始状态', () => {
  let sys: WorldSinkholeSystem
  beforeEach(() => { sys = makeSys(); shNextId = 1 })

  it('初始 sinkholes 为空', () => { expect((sys as any).sinkholes).toHaveLength(0) })
  it('初始 nextId === 1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始 lastCheck === 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('getActiveSinkholes() 初始为空', () => { expect(sys.getActiveSinkholes()).toHaveLength(0) })
  it('sinkholes 是数组', () => { expect(Array.isArray((sys as any).sinkholes)).toBe(true) })
  it('_activeBuf 初始为空', () => { expect((sys as any)._activeBuf).toHaveLength(0) })
  it('_activeSinkholesBuf 初始为空', () => { expect((sys as any)._activeSinkholesBuf).toHaveLength(0) })
})

// ─────────────────────────────────────────────
// 2. 节流控制 (CHECK_INTERVAL = 1200)
// ─────────────────────────────────────────────
describe('WorldSinkholeSystem 节流控制', () => {
  let sys: WorldSinkholeSystem
  beforeEach(() => { sys = makeSys(); shNextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick 未到 lastCheck+1200 时不触发 trySpawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001) // 极小值——理论上会 spawn
    ;(sys as any).lastCheck = 0
    sys.update(1, makeWorld(), makeEm(), 500) // tick 500 < 1200
    expect((sys as any).sinkholes).toHaveLength(0)
  })

  it('tick 恰好达到 lastCheck+1200 时触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    ;(sys as any).lastCheck = 0
    sys.update(1, makeWorld(), makeEm(), 1200)
    expect((sys as any).lastCheck).toBe(1200)
  })

  it('lastCheck 被更新为当前 tick', () => {
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEm(), 1200)
    expect((sys as any).lastCheck).toBe(1200)
  })

  it('未到间隔时 sinkholes 不增加', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    ;(sys as any).lastCheck = 1000
    sys.update(1, makeWorld(), makeEm(), 1100) // diff=100 < 1200
    expect((sys as any).sinkholes).toHaveLength(0)
  })

  it('到达间隔后 lastCheck 更新', () => {
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEm(), 2400)
    expect((sys as any).lastCheck).toBe(2400)
  })
})

// ─────────────────────────────────────────────
// 3. trySpawnSinkhole 条件
// ─────────────────────────────────────────────
describe('WorldSinkholeSystem trySpawnSinkhole 条件', () => {
  let sys: WorldSinkholeSystem
  beforeEach(() => { sys = makeSys(); shNextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('Math.random > SINKHOLE_CHANCE(0.003) 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).trySpawnSinkhole(makeWorld(), 100)
    expect((sys as any).sinkholes).toHaveLength(0)
  })

  it('Math.random <= 0.003 时尝试 spawn', () => {
    const calls: number[] = []
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      // 第一次调用（chance check）返回极小值触发 spawn
      if (callCount === 1) return 0.001
      return 0.5 // 其余坐标/半径/深度/持续时间
    })
    ;(sys as any).trySpawnSinkhole(makeWorld(), 100)
    expect((sys as any).sinkholes).toHaveLength(1)
  })

  it('tile=0（深水）不生成天坑', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 1) return 0.001
      return 0.5
    })
    ;(sys as any).trySpawnSinkhole(makeWorld(0), 100)
    expect((sys as any).sinkholes).toHaveLength(0)
  })

  it('tile=1（浅水）不生成天坑', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 1) return 0.001
      return 0.5
    })
    ;(sys as any).trySpawnSinkhole(makeWorld(1), 100)
    expect((sys as any).sinkholes).toHaveLength(0)
  })

  it('陆地（tile=5）可以生成天坑', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 1) return 0.001
      return 0.5
    })
    ;(sys as any).trySpawnSinkhole(makeWorld(), 100)
    expect((sys as any).sinkholes).toHaveLength(1)
  })

  it('已有 MAX_SINKHOLES=8 时不再生成', () => {
    for (let i = 0; i < 8; i++) {
      ;(sys as any).sinkholes.push(makeSinkhole('active', i * 20, 10))
    }
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      return callCount === 1 ? 0.001 : 0.5
    })
    ;(sys as any).trySpawnSinkhole(makeWorld(), 100)
    expect((sys as any).sinkholes).toHaveLength(8)
  })

  it('getTile 未定义时不抛错', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      return callCount++ === 0 ? 0.001 : 0.5
    })
    const world = { width: 200, height: 200 } // 无 getTile
    expect(() => { ;(sys as any).trySpawnSinkhole(world, 100) }).not.toThrow()
  })
})

// ─────────────────────────────────────────────
// 4. spawn 后字段值正确
// ─────────────────────────────────────────────
describe('WorldSinkholeSystem spawn 后字段值', () => {
  let sys: WorldSinkholeSystem
  beforeEach(() => { sys = makeSys(); shNextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  function spawnOne(tick = 100): Sinkhole {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 1) return 0.001 // chance 检查
      return 0.5 // 其余
    })
    ;(sys as any).trySpawnSinkhole(makeWorld(), tick)
    return (sys as any).sinkholes[0]
  }

  it('stage 初始为 "forming"', () => {
    expect(spawnOne().stage).toBe('forming')
  })

  it('startTick 正确', () => {
    expect(spawnOne(999).startTick).toBe(999)
  })

  it('radius 在 2-4 范围内', () => {
    const s = spawnOne()
    expect(s.radius).toBeGreaterThanOrEqual(2)
    expect(s.radius).toBeLessThanOrEqual(4)
  })

  it('depth 在 10-50 范围内', () => {
    const s = spawnOne()
    expect(s.depth).toBeGreaterThanOrEqual(10)
    expect(s.depth).toBeLessThan(51)
  })

  it('duration 在 2000-4000 范围内', () => {
    const s = spawnOne()
    expect(s.duration).toBeGreaterThanOrEqual(2000)
    expect(s.duration).toBeLessThanOrEqual(4000)
  })

  it('id 从 nextId 分配，正整数', () => {
    ;(sys as any).nextId = 5
    const s = spawnOne()
    expect(s.id).toBe(5)
    expect((sys as any).nextId).toBe(6)
  })

  it('x 坐标在 [0, world.width) 范围内', () => {
    const s = spawnOne()
    expect(s.x).toBeGreaterThanOrEqual(0)
    expect(s.x).toBeLessThan(200)
  })

  it('y 坐标在 [0, world.height) 范围内', () => {
    const s = spawnOne()
    expect(s.y).toBeGreaterThanOrEqual(0)
    expect(s.y).toBeLessThan(200)
  })
})

// ─────────────────────────────────────────────
// 5. updateStages 阶段转换
// ─────────────────────────────────────────────
describe('WorldSinkholeSystem updateStages 阶段转换', () => {
  let sys: WorldSinkholeSystem
  beforeEach(() => { sys = makeSys(); shNextId = 1 })

  it('elapsed < 0.2*duration 时 stage="forming"', () => {
    const s = makeSinkhole('active', 10, 10, 3, 50, 0, 1000)
    ;(sys as any).sinkholes.push(s)
    ;(sys as any).updateStages(100) // elapsed=100, progress=0.1 < 0.2
    expect(s.stage).toBe('forming')
  })

  it('forming 阶段 depth 递增 0.5', () => {
    const s = makeSinkhole('forming', 10, 10, 3, 50, 0, 1000)
    ;(sys as any).sinkholes.push(s)
    ;(sys as any).updateStages(100) // progress=0.1 => forming
    expect(s.depth).toBe(50.5)
  })

  it('0.2 <= progress < 0.7 时 stage="active"', () => {
    const s = makeSinkhole('forming', 10, 10, 3, 50, 0, 1000)
    ;(sys as any).sinkholes.push(s)
    ;(sys as any).updateStages(400) // progress=0.4
    expect(s.stage).toBe('active')
  })

  it('0.7 <= progress < 1.0 时 stage="collapsing"', () => {
    const s = makeSinkhole('active', 10, 10, 3, 50, 0, 1000)
    ;(sys as any).sinkholes.push(s)
    ;(sys as any).updateStages(800) // progress=0.8
    expect(s.stage).toBe('collapsing')
  })

  it('collapsing 阶段 depth 递减 1', () => {
    const s = makeSinkhole('active', 10, 10, 3, 50, 0, 1000)
    ;(sys as any).sinkholes.push(s)
    ;(sys as any).updateStages(800)
    expect(s.depth).toBe(49)
  })

  it('progress >= 1.0 时 stage="filled"', () => {
    const s = makeSinkhole('collapsing', 10, 10, 3, 5, 0, 1000)
    ;(sys as any).sinkholes.push(s)
    ;(sys as any).updateStages(1001) // progress >= 1
    expect(s.stage).toBe('filled')
  })

  it('filled 的天坑被从数组移除', () => {
    const s = makeSinkhole('collapsing', 10, 10, 3, 5, 0, 1000)
    ;(sys as any).sinkholes.push(s)
    ;(sys as any).updateStages(1001)
    expect((sys as any).sinkholes).toHaveLength(0)
  })

  it('forming 阶段 depth 不超过 100', () => {
    const s = makeSinkhole('forming', 10, 10, 3, 100, 0, 1000)
    ;(sys as any).sinkholes.push(s)
    ;(sys as any).updateStages(50) // progress=0.05 => forming
    expect(s.depth).toBe(100) // Math.min(100, 100+0.5)=100
  })

  it('collapsing 阶段 depth 不低于 0', () => {
    const s = makeSinkhole('active', 10, 10, 3, 0, 0, 1000)
    ;(sys as any).sinkholes.push(s)
    ;(sys as any).updateStages(800)
    expect(s.depth).toBe(0) // Math.max(0, 0-1)=0
  })

  it('多个天坑分别更新', () => {
    const s1 = makeSinkhole('forming', 10, 10, 3, 50, 0, 1000)
    const s2 = makeSinkhole('active', 50, 50, 3, 50, 0, 1000)
    ;(sys as any).sinkholes.push(s1, s2)
    ;(sys as any).updateStages(100)
    // 两个天坑都是 startTick=0, elapsed=100, progress=0.1 => forming
    expect(s1.stage).toBe('forming')
    expect(s2.stage).toBe('forming')
  })

  it('不同 startTick 的天坑阶段不同', () => {
    const s1 = makeSinkhole('forming', 10, 10, 3, 50, 0, 1000) // progress=0.5 => active
    const s2 = makeSinkhole('forming', 50, 50, 3, 50, 300, 1000) // progress=0.2 => active
    ;(sys as any).sinkholes.push(s1, s2)
    ;(sys as any).updateStages(500)
    expect(s1.stage).toBe('active') // elapsed=500, progress=0.5
    expect(s2.stage).toBe('active') // elapsed=200, progress=0.2
  })

  it('depth 递增不超过 100 上限', () => {
    const s = makeSinkhole('forming', 10, 10, 3, 99.8, 0, 1000)
    ;(sys as any).sinkholes.push(s)
    ;(sys as any).updateStages(50) // forming => depth+0.5
    expect(s.depth).toBe(100)
  })
})

// ─────────────────────────────────────────────
// 6. applyDamage / cleanup 逻辑
// ─────────────────────────────────────────────
describe('WorldSinkholeSystem applyDamage', () => {
  let sys: WorldSinkholeSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); shNextId = 1; em = makeEm() })

  it('无天坑时 applyDamage 不抛错', () => {
    expect(() => { ;(sys as any).applyDamage(em) }).not.toThrow()
  })

  it('只有 forming 天坑不造成伤害', () => {
    ;(sys as any).sinkholes.push(makeSinkhole('forming'))
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 10, y: 10 })
    em.addComponent(eid, { type: 'needs', health: 1.0 })
    ;(sys as any).applyDamage(em)
    expect(em.getComponent(eid, 'needs')).toMatchObject({ health: 1.0 })
  })

  it('active 天坑对范围内生物造成伤害', () => {
    const s = makeSinkhole('active', 10, 10, 3, 100)
    ;(sys as any).sinkholes.push(s)
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 10, y: 10 })
    em.addComponent(eid, { type: 'needs', health: 1.0 })
    ;(sys as any).applyDamage(em)
    const health = (em.getComponent(eid, 'needs') as any).health
    expect(health).toBeLessThan(1.0)
  })

  it('生物在 threshold 外不受伤', () => {
    const s = makeSinkhole('active', 10, 10, 3, 100) // threshold = 4+3=7
    ;(sys as any).sinkholes.push(s)
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 100, y: 100 }) // 远
    em.addComponent(eid, { type: 'needs', health: 1.0 })
    ;(sys as any).applyDamage(em)
    expect((em.getComponent(eid, 'needs') as any).health).toBe(1.0)
  })

  it('伤害量与 depth 成正比', () => {
    const sDeep = makeSinkhole('active', 10, 10, 3, 100)  // depth=100
    const sShallow = makeSinkhole('active', 50, 50, 3, 10) // depth=10
    ;(sys as any).sinkholes.push(sDeep, sShallow)

    const eid1 = em.createEntity()
    em.addComponent(eid1, { type: 'position', x: 10, y: 10 })
    em.addComponent(eid1, { type: 'needs', health: 1.0 })

    const eid2 = em.createEntity()
    em.addComponent(eid2, { type: 'position', x: 50, y: 50 })
    em.addComponent(eid2, { type: 'needs', health: 1.0 })

    ;(sys as any).applyDamage(em)
    const h1 = (em.getComponent(eid1, 'needs') as any).health
    const h2 = (em.getComponent(eid2, 'needs') as any).health
    // 深度大的天坑伤害更多
    expect(1.0 - h1).toBeGreaterThan(1.0 - h2)
  })

  it('collapsing 天坑不进入活跃列表（不造成伤害）', () => {
    ;(sys as any).sinkholes.push(makeSinkhole('collapsing'))
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 10, y: 10 })
    em.addComponent(eid, { type: 'needs', health: 1.0 })
    ;(sys as any).applyDamage(em)
    expect((em.getComponent(eid, 'needs') as any).health).toBe(1.0)
  })

  it('filled 天坑不造成伤害', () => {
    ;(sys as any).sinkholes.push(makeSinkhole('filled'))
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 10, y: 10 })
    em.addComponent(eid, { type: 'needs', health: 1.0 })
    ;(sys as any).applyDamage(em)
    expect((em.getComponent(eid, 'needs') as any).health).toBe(1.0)
  })

  it('filled 阶段天坑被 updateStages 清除', () => {
    const s = makeSinkhole('active', 10, 10, 3, 50, 0, 100)
    ;(sys as any).sinkholes.push(s)
    ;(sys as any).updateStages(101) // progress >= 1 => filled => removed
    expect((sys as any).sinkholes).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────
// 7. MAX_SINKHOLES 上限
// ─────────────────────────────────────────────
describe('WorldSinkholeSystem MAX_SINKHOLES 上限', () => {
  let sys: WorldSinkholeSystem
  beforeEach(() => { sys = makeSys(); shNextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('8 个时 trySpawnSinkhole 直接返回', () => {
    for (let i = 0; i < 8; i++) {
      ;(sys as any).sinkholes.push(makeSinkhole('active', i * 20, 10))
    }
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      return callCount++ === 0 ? 0.001 : 0.5
    })
    ;(sys as any).trySpawnSinkhole(makeWorld(), 100)
    expect((sys as any).sinkholes).toHaveLength(8)
  })

  it('7 个时还可以 spawn 一个', () => {
    for (let i = 0; i < 7; i++) {
      ;(sys as any).sinkholes.push(makeSinkhole('active', i * 20, 10))
    }
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      return callCount++ === 0 ? 0.001 : 0.5
    })
    ;(sys as any).trySpawnSinkhole(makeWorld(), 100)
    expect((sys as any).sinkholes).toHaveLength(8)
  })

  it('超过 8 个后 trySpawnSinkhole 不再增加', () => {
    for (let i = 0; i < 9; i++) {
      ;(sys as any).sinkholes.push(makeSinkhole('active', i * 15, 10))
    }
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      return callCount++ === 0 ? 0.001 : 0.5
    })
    ;(sys as any).trySpawnSinkhole(makeWorld(), 100)
    expect((sys as any).sinkholes).toHaveLength(9)
  })
})

// ─────────────────────────────────────────────
// 8. getActiveSinkholes & 边界验证
// ─────────────────────────────────────────────
describe('WorldSinkholeSystem getActiveSinkholes 边界验证', () => {
  let sys: WorldSinkholeSystem
  beforeEach(() => { sys = makeSys(); shNextId = 1 })

  it('只返回 stage=active 的天坑', () => {
    ;(sys as any).sinkholes.push(makeSinkhole('active'))
    ;(sys as any).sinkholes.push(makeSinkhole('forming'))
    ;(sys as any).sinkholes.push(makeSinkhole('collapsing'))
    ;(sys as any).sinkholes.push(makeSinkhole('filled'))
    expect(sys.getActiveSinkholes()).toHaveLength(1)
  })

  it('全部 forming 时 getActiveSinkholes 为空', () => {
    ;(sys as any).sinkholes.push(makeSinkhole('forming'))
    ;(sys as any).sinkholes.push(makeSinkhole('forming'))
    expect(sys.getActiveSinkholes()).toHaveLength(0)
  })

  it('多个 active 天坑全部返回', () => {
    ;(sys as any).sinkholes.push(makeSinkhole('active'))
    ;(sys as any).sinkholes.push(makeSinkhole('active'))
    ;(sys as any).sinkholes.push(makeSinkhole('active'))
    expect(sys.getActiveSinkholes()).toHaveLength(3)
  })

  it('getActiveSinkholes 每次返回同一缓冲区对象', () => {
    const r1 = sys.getActiveSinkholes()
    const r2 = sys.getActiveSinkholes()
    expect(r1).toBe(r2)
  })

  it('多实例 sinkholes 互不影响', () => {
    const sys2 = makeSys()
    ;(sys as any).sinkholes.push(makeSinkhole('active'))
    expect((sys2 as any).sinkholes).toHaveLength(0)
  })

  it('update 全流程不抛错（无 sinkholes）', () => {
    expect(() => sys.update(1, makeWorld(), makeEm(), 1200)).not.toThrow()
  })

  it('update 全流程不抛错（有天坑）', () => {
    ;(sys as any).sinkholes.push(makeSinkhole('active'))
    expect(() => sys.update(1, makeWorld(), makeEm(), 1200)).not.toThrow()
  })

  it('世界宽高默认为 200（world 无 width/height）', () => {
    vi.spyOn(Math, 'random').mockImplementation(() => 0.001)
    const worldNoSize = { getTile: () => 5 }
    expect(() => { ;(sys as any).trySpawnSinkhole(worldNoSize, 100) }).not.toThrow()
    vi.restoreAllMocks()
  })

  it('4 种 SinkholeStage 均合法', () => {
    const stages: SinkholeStage[] = ['forming', 'active', 'collapsing', 'filled']
    expect(stages).toHaveLength(4)
  })

  it('nextId 每次 spawn 递增', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      return callCount++ === 0 ? 0.001 : 0.5
    })
    ;(sys as any).trySpawnSinkhole(makeWorld(), 100)
    expect((sys as any).nextId).toBe(2)
    vi.restoreAllMocks()
  })

  it('DAMAGE_RADIUS 为 4', () => {
    // 验证伤害半径常量 threshold = DAMAGE_RADIUS(4) + radius(3) = 7
    const s = makeSinkhole('active', 10, 10, 3, 100) // threshold = 4+3=7
    ;(sys as any).sinkholes.push(s)
    const localEm = makeEm()
    const eid = localEm.createEntity()
    localEm.addComponent(eid, { type: 'position', x: 16, y: 10 }) // dx=6, 6²=36 < 49
    localEm.addComponent(eid, { type: 'needs', health: 1.0 })
    ;(sys as any).applyDamage(localEm)
    expect((localEm.getComponent(eid, 'needs') as any).health).toBeLessThan(1.0)
  })

  it('DAMAGE_AMOUNT 为 0.3', () => {
    // 验证伤害量常量
    const s = makeSinkhole('active', 10, 10, 3, 100) // depth=100 => damage=0.3*1.0=0.3
    ;(sys as any).sinkholes.push(s)
    const localEm = makeEm()
    const eid = localEm.createEntity()
    localEm.addComponent(eid, { type: 'position', x: 10, y: 10 })
    localEm.addComponent(eid, { type: 'needs', health: 1.0 })
    ;(sys as any).applyDamage(localEm)
    expect((localEm.getComponent(eid, 'needs') as any).health).toBeCloseTo(0.7, 1)
  })
})
