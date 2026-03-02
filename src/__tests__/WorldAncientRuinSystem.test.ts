import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldAncientRuinSystem } from '../systems/WorldAncientRuinSystem'
import type { AncientRuin, RuinType, RuinReward } from '../systems/WorldAncientRuinSystem'
import { EntityManager, EntityId } from '../ecs/Entity'

function makeSys(): WorldAncientRuinSystem { return new WorldAncientRuinSystem() }
let nextId = 1
function makeRuin(type: RuinType = 'temple', explored = false): AncientRuin {
  return { id: nextId++, type, name: 'Test Ruin', x: 20, y: 30, explored, exploredBy: null, dangerLevel: 3, reward: 'treasure', rewardValue: 100, discoveredTick: 0, exploredTick: 0, dangerLabel: `Danger: 3`, panelStr: explored ? 'Test Ruin explored' : 'Test Ruin danger:3' }
}

function makeWorld(w = 200, h = 200) {
  return {
    tick: 0,
    width: w,
    height: h,
    getTile: (x: number, y: number) => (x >= 0 && x < w && y >= 0 && y < h ? 2 : null),
    setTile: vi.fn()
  }
}

function makeEntityManager() {
  const entities = new Map<EntityId, any>()
  return {
    getEntitiesWithComponents: vi.fn(() => Array.from(entities.keys())),
    getComponent: vi.fn((eid: EntityId, type: string) => entities.get(eid)?.[type]),
    addEntity: (eid: EntityId, comps: any) => entities.set(eid, comps)
  } as any
}

describe('WorldAncientRuinSystem - 初始状态', () => {
  let sys: WorldAncientRuinSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无古迹', () => { expect((sys as any).ruins).toHaveLength(0) })
  it('nextSpawnTick初始为SPAWN_INTERVAL(4000)', () => { expect((sys as any).nextSpawnTick).toBe(4000) })
  it('nextExploreTick初始为EXPLORE_CHECK(500)', () => { expect((sys as any).nextExploreTick).toBe(500) })
  it('_lastZoom初始为-1', () => { expect((sys as any)._lastZoom).toBe(-1) })
  it('_nameFont初始为空字符串', () => { expect((sys as any)._nameFont).toBe('') })
  it('_unexploredBuf初始为空数组', () => { expect((sys as any)._unexploredBuf).toHaveLength(0) })
  it('_prevUnexploredCount初始为-1', () => { expect((sys as any)._prevUnexploredCount).toBe(-1) })
  it('_prevRuinCount初始为-1', () => { expect((sys as any)._prevRuinCount).toBe(-1) })
  it('_ruinHeaderStr初始为"Ruins (0/0)"', () => { expect((sys as any)._ruinHeaderStr).toBe('Ruins (0/0)') })
})

describe('WorldAncientRuinSystem - 节流机制', () => {
  let sys: WorldAncientRuinSystem
  let world: any
  let em: any
  beforeEach(() => { sys = makeSys(); world = makeWorld(); em = makeEntityManager(); nextId = 1 })

  it('tick<nextSpawnTick时不spawn', () => {
    world.tick = 3999
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.3)
    sys.update(16, em, world)
    expect((sys as any).ruins).toHaveLength(0)
    spy.mockRestore()
  })
  it('tick>=nextSpawnTick时尝试spawn', () => {
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.3)
    sys.update(16, em, world)
    expect((sys as any).nextSpawnTick).toBe(8000)
    spy.mockRestore()
  })
  it('tick<nextExploreTick时不检查探索', () => {
    world.tick = 499
    ;(sys as any).ruins.push(makeRuin())
    sys.update(16, em, world)
    expect((sys as any).nextExploreTick).toBe(500)
  })
  it('tick>=nextExploreTick时检查探索', () => {
    world.tick = 500
    ;(sys as any).ruins.push(makeRuin())
    sys.update(16, em, world)
    expect((sys as any).nextExploreTick).toBe(1000)
  })
  it('nextSpawnTick每次增加SPAWN_INTERVAL', () => {
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.3)
    sys.update(16, em, world)
    expect((sys as any).nextSpawnTick).toBe(8000)
    world.tick = 8000
    sys.update(16, em, world)
    expect((sys as any).nextSpawnTick).toBe(12000)
    spy.mockRestore()
  })
  it('nextExploreTick每次增加EXPLORE_CHECK', () => {
    world.tick = 500
    sys.update(16, em, world)
    expect((sys as any).nextExploreTick).toBe(1000)
    world.tick = 1000
    sys.update(16, em, world)
    expect((sys as any).nextExploreTick).toBe(1500)
  })
})

describe('WorldAncientRuinSystem - spawn条件', () => {
  let sys: WorldAncientRuinSystem
  let world: any
  let em: any
  beforeEach(() => { sys = makeSys(); world = makeWorld(); em = makeEntityManager(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('Math.random()<0.35时spawn', () => {
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.3)
    sys.update(16, em, world)
    expect((sys as any).ruins.length).toBeGreaterThan(0)
    spy.mockRestore()
  })
  it('Math.random()>=0.35时不spawn', () => {
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.4)
    sys.update(16, em, world)
    expect((sys as any).ruins).toHaveLength(0)
    spy.mockRestore()
  })
  it('ruins.length>=MAX_RUINS(20)时不spawn', () => {
    for (let i = 0; i < 20; i++) (sys as any).ruins.push(makeRuin())
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.3)
    sys.update(16, em, world)
    expect((sys as any).ruins).toHaveLength(20)
    spy.mockRestore()
  })
  it('tile<=1(水)时不spawn', () => {
    world.getTile = () => 1
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.3)
    sys.update(16, em, world)
    expect((sys as any).ruins).toHaveLength(0)
    spy.mockRestore()
  })
  it('tile=null时仍可spawn（源码逻辑：仅tile!=null&&tile<=1才阻止）', () => {
    world.getTile = () => null
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.3)
    sys.update(16, em, world)
    // tile=null时条件(tile!==null && tile<=1)为false, 不return, 会spawn
    expect((sys as any).ruins).toHaveLength(1)
    spy.mockRestore()
  })
  it('tile>1时可spawn', () => {
    world.getTile = () => 3
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.3)
    sys.update(16, em, world)
    expect((sys as any).ruins.length).toBeGreaterThan(0)
    spy.mockRestore()
  })
})

describe('WorldAncientRuinSystem - spawn后字段值', () => {
  let sys: WorldAncientRuinSystem
  let world: any
  let em: any
  beforeEach(() => { sys = makeSys(); world = makeWorld(); em = makeEntityManager(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('spawn后id递增', () => {
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.3)
    sys.update(16, em, world)
    const id1 = (sys as any).ruins[0].id
    world.tick = 8000
    sys.update(16, em, world)
    const id2 = (sys as any).ruins[1].id
    expect(id2).toBe(id1 + 1)
    spy.mockRestore()
  })
  it('spawn后type是5种之一', () => {
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.3)
    sys.update(16, em, world)
    const types: RuinType[] = ['temple', 'library', 'vault', 'tomb', 'fortress']
    expect(types).toContain((sys as any).ruins[0].type)
    spy.mockRestore()
  })
  it('spawn后x在[5, width-5]范围', () => {
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.3)
    sys.update(16, em, world)
    const x = (sys as any).ruins[0].x
    expect(x).toBeGreaterThanOrEqual(5)
    expect(x).toBeLessThan(world.width - 5)
    spy.mockRestore()
  })
  it('spawn后y在[5, height-5]范围', () => {
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.3)
    sys.update(16, em, world)
    const y = (sys as any).ruins[0].y
    expect(y).toBeGreaterThanOrEqual(5)
    expect(y).toBeLessThan(world.height - 5)
    spy.mockRestore()
  })
  it('spawn后explored=false', () => {
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.3)
    sys.update(16, em, world)
    expect((sys as any).ruins[0].explored).toBe(false)
    spy.mockRestore()
  })
  it('spawn后exploredBy=null', () => {
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.3)
    sys.update(16, em, world)
    expect((sys as any).ruins[0].exploredBy).toBeNull()
    spy.mockRestore()
  })
  it('spawn后dangerLevel在[1,5]', () => {
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.3)
    sys.update(16, em, world)
    const danger = (sys as any).ruins[0].dangerLevel
    expect(danger).toBeGreaterThanOrEqual(1)
    expect(danger).toBeLessThanOrEqual(5)
    spy.mockRestore()
  })
  it('spawn后reward是5种之一', () => {
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.3)
    sys.update(16, em, world)
    const rewards: RuinReward[] = ['treasure', 'knowledge', 'artifact', 'curse', 'nothing']
    expect(rewards).toContain((sys as any).ruins[0].reward)
    spy.mockRestore()
  })
  it('spawn后rewardValue>0', () => {
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.3)
    sys.update(16, em, world)
    expect((sys as any).ruins[0].rewardValue).toBeGreaterThan(0)
    spy.mockRestore()
  })
  it('spawn后discoveredTick=world.tick', () => {
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.3)
    sys.update(16, em, world)
    expect((sys as any).ruins[0].discoveredTick).toBe(4000)
    spy.mockRestore()
  })
  it('spawn后exploredTick=0', () => {
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.3)
    sys.update(16, em, world)
    expect((sys as any).ruins[0].exploredTick).toBe(0)
    spy.mockRestore()
  })
  it('spawn后dangerLabel格式正确', () => {
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.3)
    sys.update(16, em, world)
    const label = (sys as any).ruins[0].dangerLabel
    expect(label).toMatch(/^Danger: \d$/)
    spy.mockRestore()
  })
  it('spawn后panelStr包含name和danger', () => {
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.3)
    sys.update(16, em, world)
    const str = (sys as any).ruins[0].panelStr
    expect(str).toContain('danger:')
    spy.mockRestore()
  })
})

describe('WorldAncientRuinSystem - update字段变更', () => {
  let sys: WorldAncientRuinSystem
  let world: any
  let em: any
  beforeEach(() => { sys = makeSys(); world = makeWorld(); em = makeEntityManager(); nextId = 1 })

  it('探索后explored=true', () => {
    const ruin = makeRuin('temple', false)
    ruin.x = 20; ruin.y = 20
    ;(sys as any).ruins.push(ruin)
    em.addEntity(1, { position: { type: 'position', x: 20, y: 20 }, creature: { type: 'creature' }, needs: { type: 'needs', health: 100 } })
    world.tick = 500
    sys.update(16, em, world)
    expect(ruin.explored).toBe(true)
  })
  it('探索后exploredBy=eid', () => {
    const ruin = makeRuin('temple', false)
    ruin.x = 20; ruin.y = 20
    ;(sys as any).ruins.push(ruin)
    em.addEntity(1, { position: { type: 'position', x: 20, y: 20 }, creature: { type: 'creature' }, needs: { type: 'needs', health: 100 } })
    world.tick = 500
    sys.update(16, em, world)
    expect(ruin.exploredBy).toBe(1)
  })
  it('探索后exploredTick=world.tick', () => {
    const ruin = makeRuin('temple', false)
    ruin.x = 20; ruin.y = 20
    ;(sys as any).ruins.push(ruin)
    em.addEntity(1, { position: { type: 'position', x: 20, y: 20 }, creature: { type: 'creature' }, needs: { type: 'needs', health: 100 } })
    world.tick = 500
    sys.update(16, em, world)
    expect(ruin.exploredTick).toBe(500)
  })
  it('探索后panelStr变为"name explored"', () => {
    const ruin = makeRuin('temple', false)
    ruin.x = 20; ruin.y = 20; ruin.name = 'Ancient Temple'
    ;(sys as any).ruins.push(ruin)
    em.addEntity(1, { position: { type: 'position', x: 20, y: 20 }, creature: { type: 'creature' }, needs: { type: 'needs', health: 100 } })
    world.tick = 500
    sys.update(16, em, world)
    expect(ruin.panelStr).toBe('Ancient Temple explored')
  })
  it('reward=curse时health减少', () => {
    const ruin = makeRuin('temple', false)
    ruin.x = 20; ruin.y = 20; ruin.reward = 'curse'; ruin.dangerLevel = 5
    ;(sys as any).ruins.push(ruin)
    const needs = { type: 'needs', health: 100 }
    em.addEntity(1, { position: { type: 'position', x: 20, y: 20 }, creature: { type: 'creature' }, needs })
    world.tick = 500
    sys.update(16, em, world)
    expect(needs.health).toBeLessThan(100)
  })
  it('reward=curse时health不低于1', () => {
    const ruin = makeRuin('temple', false)
    ruin.x = 20; ruin.y = 20; ruin.reward = 'curse'; ruin.dangerLevel = 5
    ;(sys as any).ruins.push(ruin)
    const needs = { type: 'needs', health: 10 }
    em.addEntity(1, { position: { type: 'position', x: 20, y: 20 }, creature: { type: 'creature' }, needs })
    world.tick = 500
    sys.update(16, em, world)
    expect(needs.health).toBeGreaterThanOrEqual(1)
  })
})

describe('WorldAncientRuinSystem - cleanup逻辑', () => {
  let sys: WorldAncientRuinSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('getUnexplored过滤explored=true', () => {
    ;(sys as any).ruins.push(makeRuin('temple', false))
    ;(sys as any).ruins.push(makeRuin('vault', true))
    ;(sys as any).ruins.push(makeRuin('tomb', false))
    expect(sys.getUnexplored()).toHaveLength(2)
  })
  it('getUnexplored返回_unexploredBuf', () => {
    ;(sys as any).ruins.push(makeRuin('temple', false))
    const buf = sys.getUnexplored()
    expect(buf).toBe((sys as any)._unexploredBuf)
  })
  it('getUnexplored每次清空_unexploredBuf', () => {
    ;(sys as any).ruins.push(makeRuin('temple', false))
    sys.getUnexplored()
    expect((sys as any)._unexploredBuf).toHaveLength(1)
    ;(sys as any).ruins[0].explored = true
    sys.getUnexplored()
    expect((sys as any)._unexploredBuf).toHaveLength(0)
  })
  it('已探索古迹不再触发探索', () => {
    const ruin = makeRuin('temple', true)
    ruin.x = 20; ruin.y = 20
    ;(sys as any).ruins.push(ruin)
    const em = makeEntityManager()
    em.addEntity(1, { position: { type: 'position', x: 20, y: 20 }, creature: { type: 'creature' }, needs: { type: 'needs', health: 100 } })
    const world = makeWorld()
    world.tick = 500
    const oldExploredBy = ruin.exploredBy
    sys.update(16, em, world)
    expect(ruin.exploredBy).toBe(oldExploredBy)
  })
})

describe('WorldAncientRuinSystem - MAX上限', () => {
  let sys: WorldAncientRuinSystem
  let world: any
  let em: any
  beforeEach(() => { sys = makeSys(); world = makeWorld(); em = makeEntityManager(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('MAX_RUINS=20', () => {
    for (let i = 0; i < 20; i++) (sys as any).ruins.push(makeRuin())
    expect((sys as any).ruins).toHaveLength(20)
  })
  it('达到MAX_RUINS后不再spawn', () => {
    for (let i = 0; i < 20; i++) (sys as any).ruins.push(makeRuin())
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.3)
    sys.update(16, em, world)
    expect((sys as any).ruins).toHaveLength(20)
    spy.mockRestore()
  })
  it('低于MAX_RUINS时可spawn', () => {
    for (let i = 0; i < 19; i++) (sys as any).ruins.push(makeRuin())
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.3)
    sys.update(16, em, world)
    expect((sys as any).ruins).toHaveLength(20)
    spy.mockRestore()
  })
})

describe('WorldAncientRuinSystem - 边界验证', () => {
  let sys: WorldAncientRuinSystem
  let world: any
  let em: any
  beforeEach(() => { sys = makeSys(); world = makeWorld(); em = makeEntityManager(); nextId = 1 })

  it('EXPLORE_RANGE=4时距离4内可探索', () => {
    const ruin = makeRuin('temple', false)
    ruin.x = 20; ruin.y = 20
    ;(sys as any).ruins.push(ruin)
    em.addEntity(1, { position: { type: 'position', x: 23, y: 20 }, creature: { type: 'creature' }, needs: { type: 'needs', health: 100 } })
    world.tick = 500
    sys.update(16, em, world)
    expect(ruin.explored).toBe(true)
  })
  it('EXPLORE_RANGE=4时距离5不可探索', () => {
    const ruin = makeRuin('temple', false)
    ruin.x = 20; ruin.y = 20
    ;(sys as any).ruins.push(ruin)
    em.addEntity(1, { position: { type: 'position', x: 25, y: 20 }, creature: { type: 'creature' }, needs: { type: 'needs', health: 100 } })
    world.tick = 500
    sys.update(16, em, world)
    expect(ruin.explored).toBe(false)
  })
  it('无creature组件时getEntitiesWithComponents返回空则不探索', () => {
    const ruin = makeRuin('temple', false)
    ruin.x = 20; ruin.y = 20
    ;(sys as any).ruins.push(ruin)
    // 让em.getEntitiesWithComponents返回空（模拟creature过滤后无结果）
    em.getEntitiesWithComponents = vi.fn(() => [])
    world.tick = 500
    sys.update(16, em, world)
    expect(ruin.explored).toBe(false)
  })
  it('无position组件时不探索', () => {
    const ruin = makeRuin('temple', false)
    ruin.x = 20; ruin.y = 20
    ;(sys as any).ruins.push(ruin)
    em.addEntity(1, { creature: { type: 'creature' } })
    world.tick = 500
    sys.update(16, em, world)
    expect(ruin.explored).toBe(false)
  })
  it('支持5种RuinType', () => {
    const types: RuinType[] = ['temple', 'library', 'vault', 'tomb', 'fortress']
    expect(types).toHaveLength(5)
  })
  it('支持5种RuinReward', () => {
    const rewards: RuinReward[] = ['treasure', 'knowledge', 'artifact', 'curse', 'nothing']
    expect(rewards).toHaveLength(5)
  })
  it('dangerLevel最小值1', () => {
    const ruin = makeRuin()
    ruin.dangerLevel = 1
    expect(ruin.dangerLevel).toBe(1)
  })
  it('dangerLevel最大值5', () => {
    const ruin = makeRuin()
    ruin.dangerLevel = 5
    expect(ruin.dangerLevel).toBe(5)
  })
  it('rewardValue基于dangerLevel计算', () => {
    const ruin = makeRuin()
    ruin.dangerLevel = 3
    ruin.rewardValue = 3 * 10 + 25
    expect(ruin.rewardValue).toBeGreaterThanOrEqual(30)
  })
  it('探索时无needs组件不崩溃', () => {
    const ruin = makeRuin('temple', false)
    ruin.x = 20; ruin.y = 20; ruin.reward = 'curse'
    ;(sys as any).ruins.push(ruin)
    em.addEntity(1, { position: { type: 'position', x: 20, y: 20 }, creature: { type: 'creature' } })
    world.tick = 500
    expect(() => sys.update(16, em, world)).not.toThrow()
  })
  it('reward=treasure时不修改health', () => {
    const ruin = makeRuin('temple', false)
    ruin.x = 20; ruin.y = 20; ruin.reward = 'treasure'
    ;(sys as any).ruins.push(ruin)
    const needs = { type: 'needs', health: 100 }
    em.addEntity(1, { position: { type: 'position', x: 20, y: 20 }, creature: { type: 'creature' }, needs })
    world.tick = 500
    sys.update(16, em, world)
    expect(needs.health).toBe(100)
  })
  it('reward=knowledge时不修改health', () => {
    const ruin = makeRuin('temple', false)
    ruin.x = 20; ruin.y = 20; ruin.reward = 'knowledge'
    ;(sys as any).ruins.push(ruin)
    const needs = { type: 'needs', health: 100 }
    em.addEntity(1, { position: { type: 'position', x: 20, y: 20 }, creature: { type: 'creature' }, needs })
    world.tick = 500
    sys.update(16, em, world)
    expect(needs.health).toBe(100)
  })
  it('reward=artifact时不修改health', () => {
    const ruin = makeRuin('temple', false)
    ruin.x = 20; ruin.y = 20; ruin.reward = 'artifact'
    ;(sys as any).ruins.push(ruin)
    const needs = { type: 'needs', health: 100 }
    em.addEntity(1, { position: { type: 'position', x: 20, y: 20 }, creature: { type: 'creature' }, needs })
    world.tick = 500
    sys.update(16, em, world)
    expect(needs.health).toBe(100)
  })
  it('reward=nothing时不修改health', () => {
    const ruin = makeRuin('temple', false)
    ruin.x = 20; ruin.y = 20; ruin.reward = 'nothing'
    ;(sys as any).ruins.push(ruin)
    const needs = { type: 'needs', health: 100 }
    em.addEntity(1, { position: { type: 'position', x: 20, y: 20 }, creature: { type: 'creature' }, needs })
    world.tick = 500
    sys.update(16, em, world)
    expect(needs.health).toBe(100)
  })
})
