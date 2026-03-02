import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureVisionSystem } from '../systems/CreatureVisionSystem'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

// BASE_VISION=8, CHECK_INTERVAL=300
// TERRAIN_VISION_MOD: FOREST=-3, MOUNTAIN=+4, DEEP_WATER=+2, SNOW=+1, SAND=+2

function makeSys() { return new CreatureVisionSystem() }

function makeWorld(defaultTile: TileType = TileType.GRASS) {
  return {
    getTile: (_x: number, _y: number) => defaultTile,
  } as any
}

function makeWorldWithTile(tileMap: Map<string, TileType>) {
  return {
    getTile: (x: number, y: number) => tileMap.get(`${Math.floor(x)},${Math.floor(y)}`) ?? TileType.GRASS,
  } as any
}

function spawnCreature(em: EntityManager, x: number, y: number): number {
  const id = em.createEntity()
  em.addComponent(id, { type: 'position', x, y } as any)
  em.addComponent(id, { type: 'creature', species: 'human', speed: 1, damage: 1, isHostile: false, name: 'Test', age: 0, maxAge: 100, gender: 'male' } as any)
  return id
}

// Helper: trigger update by setting lastCheck to force execution
function triggerUpdate(sys: CreatureVisionSystem, em: EntityManager, world: any, tick = 1000) {
  ;(sys as any).lastCheck = tick - 300  // 恰好触发
  sys.update(1, world, em, tick)
}

describe('CreatureVisionSystem', () => {
  let sys: CreatureVisionSystem

  beforeEach(() => { sys = makeSys() })

  it('初始化成功', () => { expect(sys).toBeInstanceOf(CreatureVisionSystem) })

  // ── 草地地形视野（无修正） ──────────────────────────────────────────────────

  it('草地地形：effectiveRange = BASE_VISION(8)', () => {
    const em = new EntityManager()
    const id = spawnCreature(em, 10, 10)
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    const vd = (sys as any).visionMap.get(id)
    expect(vd).toBeDefined()
    expect(vd.effectiveRange).toBe(8)
  })

  // ── 各地形视野修正 ──────────────────────────────────────────────────────────

  it('森林地形：effectiveRange = 8-3=5', () => {
    const em = new EntityManager()
    const id = spawnCreature(em, 5, 5)
    const tileMap = new Map([['5,5', TileType.FOREST]])
    triggerUpdate(sys, em, makeWorldWithTile(tileMap))
    const vd = (sys as any).visionMap.get(id)
    expect(vd.effectiveRange).toBe(5)
  })

  it('山地地形：effectiveRange = 8+4=12', () => {
    const em = new EntityManager()
    const id = spawnCreature(em, 5, 5)
    const tileMap = new Map([['5,5', TileType.MOUNTAIN]])
    triggerUpdate(sys, em, makeWorldWithTile(tileMap))
    const vd = (sys as any).visionMap.get(id)
    expect(vd.effectiveRange).toBe(12)
  })

  it('沙地地形：effectiveRange = 8+2=10', () => {
    const em = new EntityManager()
    const id = spawnCreature(em, 5, 5)
    const tileMap = new Map([['5,5', TileType.SAND]])
    triggerUpdate(sys, em, makeWorldWithTile(tileMap))
    const vd = (sys as any).visionMap.get(id)
    expect(vd.effectiveRange).toBe(10)
  })

  it('雪地地形：effectiveRange = 8+1=9', () => {
    const em = new EntityManager()
    const id = spawnCreature(em, 5, 5)
    const tileMap = new Map([['5,5', TileType.SNOW]])
    triggerUpdate(sys, em, makeWorldWithTile(tileMap))
    const vd = (sys as any).visionMap.get(id)
    expect(vd.effectiveRange).toBe(9)
  })

  // ── 视野范围内外实体检测 ────────────────────────────────────────────────────

  it('视野内的实体出现在visibleEntities中', () => {
    const em = new EntityManager()
    const id1 = spawnCreature(em, 10, 10)
    const id2 = spawnCreature(em, 15, 10)  // 距离5 < 8
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    const vd = (sys as any).visionMap.get(id1)
    expect(vd.visibleEntities).toContain(id2)
  })

  it('视野外的实体不出现在visibleEntities中', () => {
    const em = new EntityManager()
    const id1 = spawnCreature(em, 10, 10)
    const id2 = spawnCreature(em, 30, 10)  // 距离20 > 8
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    const vd = (sys as any).visionMap.get(id1)
    expect(vd.visibleEntities).not.toContain(id2)
  })

  it('自身不出现在visibleEntities中', () => {
    const em = new EntityManager()
    const id1 = spawnCreature(em, 10, 10)
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    const vd = (sys as any).visionMap.get(id1)
    expect(vd.visibleEntities).not.toContain(id1)
  })

  // ── CHECK_INTERVAL 节流 ─────────────────────────────────────────────────────

  it('tick间隔未到CHECK_INTERVAL(300)时不更新', () => {
    const em = new EntityManager()
    spawnCreature(em, 10, 10)
    // lastCheck=0, tick=100, 差值100<300
    sys.update(1, makeWorld(), em, 100)
    expect((sys as any).visionMap.size).toBe(0)
  })

  it('tick间隔达到CHECK_INTERVAL时更新', () => {
    const em = new EntityManager()
    spawnCreature(em, 10, 10)
    ;(sys as any).lastCheck = 0
    sys.update(1, makeWorld(), em, 300)
    expect((sys as any).visionMap.size).toBe(1)
  })

  // ── effectiveRange 最小值限制 ────────────────────────────────────────────────

  it('effectiveRange最小为2', () => {
    const em = new EntityManager()
    const id = spawnCreature(em, 5, 5)
    triggerUpdate(sys, em, makeWorld(TileType.FOREST))
    const vd = (sys as any).visionMap.get(id)
    expect(vd.effectiveRange).toBeGreaterThanOrEqual(2)
  })
})
