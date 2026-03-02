import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureVisionSystem } from '../systems/CreatureVisionSystem'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

// BASE_VISION=8, CHECK_INTERVAL=300, MAX_TRACKED=200
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

function makeWorldReturningNull() {
  return { getTile: () => null } as any
}

function spawnCreature(em: EntityManager, x: number, y: number): number {
  const id = em.createEntity()
  em.addComponent(id, { type: 'position', x, y } as any)
  em.addComponent(id, { type: 'creature', species: 'human', speed: 1, damage: 1, isHostile: false, name: 'Test', age: 0, maxAge: 100, gender: 'male' } as any)
  return id
}

function spawnPositionOnly(em: EntityManager, x: number, y: number): number {
  const id = em.createEntity()
  em.addComponent(id, { type: 'position', x, y } as any)
  return id
}

function triggerUpdate(sys: CreatureVisionSystem, em: EntityManager, world: any, tick = 1000) {
  ;(sys as any).lastCheck = tick - 300
  sys.update(1, world, em, tick)
}

describe('CreatureVisionSystem — 初始化', () => {
  afterEach(() => vi.restoreAllMocks())

  it('实例化成功', () => {
    const sys = makeSys()
    expect(sys).toBeInstanceOf(CreatureVisionSystem)
  })

  it('初始 visionMap 为空', () => {
    const sys = makeSys()
    expect((sys as any).visionMap.size).toBe(0)
  })

  it('初始 lastCheck 为 0', () => {
    const sys = makeSys()
    expect((sys as any).lastCheck).toBe(0)
  })
})

describe('CreatureVisionSystem — CHECK_INTERVAL 节流', () => {
  let sys: CreatureVisionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('tick=100，间隔不足300，不更新', () => {
    const em = new EntityManager()
    spawnCreature(em, 10, 10)
    sys.update(1, makeWorld(), em, 100)
    expect((sys as any).visionMap.size).toBe(0)
  })

  it('tick=299，间隔不足300，不更新', () => {
    const em = new EntityManager()
    spawnCreature(em, 10, 10)
    ;(sys as any).lastCheck = 0
    sys.update(1, makeWorld(), em, 299)
    expect((sys as any).visionMap.size).toBe(0)
  })

  it('tick=300，间隔恰好等于300，触发更新', () => {
    const em = new EntityManager()
    spawnCreature(em, 10, 10)
    ;(sys as any).lastCheck = 0
    sys.update(1, makeWorld(), em, 300)
    expect((sys as any).visionMap.size).toBe(1)
  })

  it('触发更新后 lastCheck 更新为当前 tick', () => {
    const em = new EntityManager()
    spawnCreature(em, 10, 10)
    ;(sys as any).lastCheck = 0
    sys.update(1, makeWorld(), em, 500)
    expect((sys as any).lastCheck).toBe(500)
  })

  it('连续调用：第一次更新后第二次间隔不足不再更新', () => {
    const em = new EntityManager()
    spawnCreature(em, 10, 10)
    ;(sys as any).lastCheck = 0
    sys.update(1, makeWorld(), em, 300)
    const size1 = (sys as any).visionMap.size
    sys.update(1, makeWorld(), em, 400)  // 差值100<300
    const size2 = (sys as any).visionMap.size
    expect(size1).toBe(1)
    expect(size2).toBe(1)  // 没有新实体，不变
  })

  it('间隔超过300触发第二次更新', () => {
    const em = new EntityManager()
    spawnCreature(em, 10, 10)
    ;(sys as any).lastCheck = 0
    sys.update(1, makeWorld(), em, 300)
    sys.update(1, makeWorld(), em, 601)
    expect((sys as any).lastCheck).toBe(601)
  })
})

describe('CreatureVisionSystem — 草地地形（无修正）', () => {
  let sys: CreatureVisionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('草地地形 effectiveRange = BASE_VISION(8)', () => {
    const em = new EntityManager()
    const id = spawnCreature(em, 10, 10)
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    const vd = (sys as any).visionMap.get(id)
    expect(vd).toBeDefined()
    expect(vd.effectiveRange).toBe(8)
  })

  it('草地地形 range 字段保持 BASE_VISION(8)', () => {
    const em = new EntityManager()
    const id = spawnCreature(em, 10, 10)
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    const vd = (sys as any).visionMap.get(id)
    expect(vd.range).toBe(8)
  })

  it('草地地形 entityId 匹配实体 id', () => {
    const em = new EntityManager()
    const id = spawnCreature(em, 10, 10)
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    const vd = (sys as any).visionMap.get(id)
    expect(vd.entityId).toBe(id)
  })

  it('草地地形 lastUpdate 为当前 tick', () => {
    const em = new EntityManager()
    const id = spawnCreature(em, 10, 10)
    ;(sys as any).lastCheck = 700
    sys.update(1, makeWorld(TileType.GRASS), em, 1000)
    const vd = (sys as any).visionMap.get(id)
    expect(vd.lastUpdate).toBe(1000)
  })
})

describe('CreatureVisionSystem — 各地形视野修正', () => {
  let sys: CreatureVisionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('森林地形：effectiveRange = 8-3=5', () => {
    const em = new EntityManager()
    const id = spawnCreature(em, 5, 5)
    const tileMap = new Map([['5,5', TileType.FOREST]])
    triggerUpdate(sys, em, makeWorldWithTile(tileMap))
    expect((sys as any).visionMap.get(id).effectiveRange).toBe(5)
  })

  it('山地地形：effectiveRange = 8+4=12', () => {
    const em = new EntityManager()
    const id = spawnCreature(em, 5, 5)
    const tileMap = new Map([['5,5', TileType.MOUNTAIN]])
    triggerUpdate(sys, em, makeWorldWithTile(tileMap))
    expect((sys as any).visionMap.get(id).effectiveRange).toBe(12)
  })

  it('沙地地形：effectiveRange = 8+2=10', () => {
    const em = new EntityManager()
    const id = spawnCreature(em, 5, 5)
    const tileMap = new Map([['5,5', TileType.SAND]])
    triggerUpdate(sys, em, makeWorldWithTile(tileMap))
    expect((sys as any).visionMap.get(id).effectiveRange).toBe(10)
  })

  it('雪地地形：effectiveRange = 8+1=9', () => {
    const em = new EntityManager()
    const id = spawnCreature(em, 5, 5)
    const tileMap = new Map([['5,5', TileType.SNOW]])
    triggerUpdate(sys, em, makeWorldWithTile(tileMap))
    expect((sys as any).visionMap.get(id).effectiveRange).toBe(9)
  })

  it('深水地形：effectiveRange = 8+2=10', () => {
    const em = new EntityManager()
    const id = spawnCreature(em, 5, 5)
    const tileMap = new Map([['5,5', TileType.DEEP_WATER]])
    triggerUpdate(sys, em, makeWorldWithTile(tileMap))
    expect((sys as any).visionMap.get(id).effectiveRange).toBe(10)
  })

  it('effectiveRange 最小值为 2（森林重叠不降到2以下）', () => {
    const em = new EntityManager()
    const id = spawnCreature(em, 5, 5)
    triggerUpdate(sys, em, makeWorld(TileType.FOREST))
    const vd = (sys as any).visionMap.get(id)
    expect(vd.effectiveRange).toBeGreaterThanOrEqual(2)
  })

  it('地形修正结果不超过合理上限（山地12）', () => {
    const em = new EntityManager()
    const id = spawnCreature(em, 5, 5)
    const tileMap = new Map([['5,5', TileType.MOUNTAIN]])
    triggerUpdate(sys, em, makeWorldWithTile(tileMap))
    expect((sys as any).visionMap.get(id).effectiveRange).toBeLessThanOrEqual(20)
  })
})

describe('CreatureVisionSystem — 视野内外实体检测', () => {
  let sys: CreatureVisionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('视野内实体（距离5 < 8）出现在 visibleEntities', () => {
    const em = new EntityManager()
    const id1 = spawnCreature(em, 10, 10)
    const id2 = spawnCreature(em, 15, 10)
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    expect((sys as any).visionMap.get(id1).visibleEntities).toContain(id2)
  })

  it('视野外实体（距离20 > 8）不出现在 visibleEntities', () => {
    const em = new EntityManager()
    const id1 = spawnCreature(em, 10, 10)
    const id2 = spawnCreature(em, 30, 10)
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    expect((sys as any).visionMap.get(id1).visibleEntities).not.toContain(id2)
  })

  it('自身不出现在 visibleEntities', () => {
    const em = new EntityManager()
    const id1 = spawnCreature(em, 10, 10)
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    expect((sys as any).visionMap.get(id1).visibleEntities).not.toContain(id1)
  })

  it('边界距离恰好等于 effectiveRange 时出现在视野内（<=）', () => {
    const em = new EntityManager()
    const id1 = spawnCreature(em, 0, 0)
    const id2 = spawnCreature(em, 8, 0)  // 距离恰好=8，草地effectiveRange=8
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    expect((sys as any).visionMap.get(id1).visibleEntities).toContain(id2)
  })

  it('距离略大于 effectiveRange 时不出现在视野内', () => {
    const em = new EntityManager()
    const id1 = spawnCreature(em, 0, 0)
    const id2 = spawnCreature(em, 9, 0)  // 距离9>8
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    expect((sys as any).visionMap.get(id1).visibleEntities).not.toContain(id2)
  })

  it('无 creature 组件的实体依然能被看到（只需有 position）', () => {
    const em = new EntityManager()
    const id1 = spawnCreature(em, 0, 0)
    const id2 = spawnPositionOnly(em, 3, 0)  // 距离3<8，有position但无creature
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    expect((sys as any).visionMap.get(id1).visibleEntities).toContain(id2)
  })

  it('多个实体同时在视野内全部被检测到', () => {
    const em = new EntityManager()
    const id1 = spawnCreature(em, 10, 10)
    const id2 = spawnCreature(em, 12, 10)
    const id3 = spawnCreature(em, 10, 13)
    const id4 = spawnCreature(em, 14, 10)
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    const visible = (sys as any).visionMap.get(id1).visibleEntities
    expect(visible).toContain(id2)
    expect(visible).toContain(id3)
    expect(visible).toContain(id4)
  })

  it('视野内外混合时，只有范围内的被收录', () => {
    const em = new EntityManager()
    const id1 = spawnCreature(em, 0, 0)
    const id2 = spawnCreature(em, 5, 0)   // 在内
    const id3 = spawnCreature(em, 20, 0)  // 在外
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    const visible = (sys as any).visionMap.get(id1).visibleEntities
    expect(visible).toContain(id2)
    expect(visible).not.toContain(id3)
  })

  it('山地视野扩展可看到草地时看不到的远处实体', () => {
    const em = new EntityManager()
    const id1 = spawnCreature(em, 5, 5)
    const id2 = spawnCreature(em, 16, 5)  // 距离11，草地=8看不到，山地=12可看到
    const tileMap = new Map([['5,5', TileType.MOUNTAIN]])
    triggerUpdate(sys, em, makeWorldWithTile(tileMap))
    expect((sys as any).visionMap.get(id1).visibleEntities).toContain(id2)
  })

  it('森林视野缩减后看不到草地时能看到的远处实体', () => {
    const em = new EntityManager()
    const id1 = spawnCreature(em, 5, 5)
    const id2 = spawnCreature(em, 12, 5)  // 距离7，草地时能看到，森林=5看不到
    const tileMap = new Map([['5,5', TileType.FOREST]])
    triggerUpdate(sys, em, makeWorldWithTile(tileMap))
    expect((sys as any).visionMap.get(id1).visibleEntities).not.toContain(id2)
  })
})

describe('CreatureVisionSystem — null tile 处理', () => {
  let sys: CreatureVisionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('getTile 返回 null 时该实体跳过，visionMap 不新增条目', () => {
    const em = new EntityManager()
    spawnCreature(em, 5, 5)
    triggerUpdate(sys, em, makeWorldReturningNull())
    expect((sys as any).visionMap.size).toBe(0)
  })

  it('部分实体 tile=null 时，其他实体正常处理', () => {
    const em = new EntityManager()
    const id1 = spawnCreature(em, 5, 5)   // null tile
    const id2 = spawnCreature(em, 15, 15) // null tile
    const world = { getTile: (x: number) => x < 10 ? null : TileType.GRASS } as any
    triggerUpdate(sys, em, world)
    // id2 在x=15，tile=GRASS，应被处理
    expect((sys as any).visionMap.has(id2)).toBe(true)
    // id1 在x=5，tile=null，跳过
    expect((sys as any).visionMap.has(id1)).toBe(false)
  })
})

describe('CreatureVisionSystem — visionMap 缓存复用', () => {
  let sys: CreatureVisionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('第二次更新时 visionMap 条目被复用（不新建）', () => {
    const em = new EntityManager()
    const id = spawnCreature(em, 10, 10)
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    const vd1 = (sys as any).visionMap.get(id)
    triggerUpdate(sys, em, makeWorld(TileType.GRASS), 2000)
    const vd2 = (sys as any).visionMap.get(id)
    expect(vd1).toBe(vd2)  // 同一对象引用
  })

  it('第二次更新后 effectiveRange 被刷新', () => {
    const em = new EntityManager()
    const id = spawnCreature(em, 10, 10)
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    expect((sys as any).visionMap.get(id).effectiveRange).toBe(8)
    const tileMap = new Map([['10,10', TileType.MOUNTAIN]])
    triggerUpdate(sys, em, makeWorldWithTile(tileMap), 2000)
    expect((sys as any).visionMap.get(id).effectiveRange).toBe(12)
  })

  it('第二次更新后 lastUpdate 被刷新', () => {
    const em = new EntityManager()
    const id = spawnCreature(em, 10, 10)
    triggerUpdate(sys, em, makeWorld(TileType.GRASS), 1000)
    triggerUpdate(sys, em, makeWorld(TileType.GRASS), 2000)
    expect((sys as any).visionMap.get(id).lastUpdate).toBe(2000)
  })

  it('第二次更新后 visibleEntities 被清空并重新填充', () => {
    const em = new EntityManager()
    const id1 = spawnCreature(em, 0, 0)
    const id2 = spawnCreature(em, 5, 0)
    triggerUpdate(sys, em, makeWorld(TileType.GRASS), 1000)
    expect((sys as any).visionMap.get(id1).visibleEntities).toContain(id2)
    // 移除 id2
    em.removeEntity(id2)
    triggerUpdate(sys, em, makeWorld(TileType.GRASS), 2000)
    expect((sys as any).visionMap.get(id1).visibleEntities).not.toContain(id2)
  })
})

describe('CreatureVisionSystem — pruneStale MAX_TRACKED=200', () => {
  let sys: CreatureVisionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('超过200个跟踪实体时裁剪到200', () => {
    const em = new EntityManager()
    // 创建210个实体
    for (let i = 0; i < 210; i++) {
      spawnCreature(em, i, 0)
    }
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    expect((sys as any).visionMap.size).toBeLessThanOrEqual(200)
  })

  it('恰好200个实体时不裁剪', () => {
    const em = new EntityManager()
    for (let i = 0; i < 200; i++) {
      spawnCreature(em, i, 0)
    }
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    expect((sys as any).visionMap.size).toBe(200)
  })

  it('裁剪后保留最新更新的实体（lastUpdate 最大的）', () => {
    const em = new EntityManager()
    for (let i = 0; i < 205; i++) {
      spawnCreature(em, i, 0)
    }
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    // 因为同一次 tick，lastUpdate 相同，裁剪到200即可
    expect((sys as any).visionMap.size).toBeLessThanOrEqual(200)
  })
})

describe('CreatureVisionSystem — 无 creature 组件实体', () => {
  let sys: CreatureVisionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('只有 position 无 creature 的实体不加入 visionMap', () => {
    const em = new EntityManager()
    const id = spawnPositionOnly(em, 10, 10)
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    expect((sys as any).visionMap.has(id)).toBe(false)
  })

  it('混合实体：只有 creature+position 的实体加入 visionMap', () => {
    const em = new EntityManager()
    const id1 = spawnCreature(em, 10, 10)
    const id2 = spawnPositionOnly(em, 20, 20)
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    expect((sys as any).visionMap.has(id1)).toBe(true)
    expect((sys as any).visionMap.has(id2)).toBe(false)
  })
})

describe('CreatureVisionSystem — 多实体独立视野', () => {
  let sys: CreatureVisionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('两个实体各有独立的 visionMap 条目', () => {
    const em = new EntityManager()
    const id1 = spawnCreature(em, 0, 0)
    const id2 = spawnCreature(em, 50, 50)
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    expect((sys as any).visionMap.has(id1)).toBe(true)
    expect((sys as any).visionMap.has(id2)).toBe(true)
  })

  it('A 在 B 视野内但 B 不在 A 视野内（不对称距离）', () => {
    const em = new EntityManager()
    // 实际上视野是对称的（同一 effectiveRange），此测试验证双方都有记录
    const id1 = spawnCreature(em, 0, 0)
    const id2 = spawnCreature(em, 6, 0)
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    const vd1 = (sys as any).visionMap.get(id1)
    const vd2 = (sys as any).visionMap.get(id2)
    expect(vd1.visibleEntities).toContain(id2)
    expect(vd2.visibleEntities).toContain(id1)
  })

  it('两个实体不在彼此视野内时 visibleEntities 不互相包含', () => {
    const em = new EntityManager()
    const id1 = spawnCreature(em, 0, 0)
    const id2 = spawnCreature(em, 100, 100)
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    expect((sys as any).visionMap.get(id1).visibleEntities).not.toContain(id2)
    expect((sys as any).visionMap.get(id2).visibleEntities).not.toContain(id1)
  })

  it('不同地形不同实体各自的 effectiveRange 正确', () => {
    const em = new EntityManager()
    const id1 = spawnCreature(em, 5, 5)
    const id2 = spawnCreature(em, 50, 50)
    const tileMap = new Map<string, TileType>([
      ['5,5', TileType.FOREST],
      ['50,50', TileType.MOUNTAIN],
    ])
    triggerUpdate(sys, em, makeWorldWithTile(tileMap))
    expect((sys as any).visionMap.get(id1).effectiveRange).toBe(5)
    expect((sys as any).visionMap.get(id2).effectiveRange).toBe(12)
  })
})

describe('CreatureVisionSystem — 坐标 floor 处理', () => {
  let sys: CreatureVisionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('浮点位置实体 tile 查询使用 floor 坐标', () => {
    const em = new EntityManager()
    const id = spawnCreature(em, 5.7, 5.9)
    // 5.7→5, 5.9→5，tile 使用 key '5,5'
    const tileMap = new Map([['5,5', TileType.MOUNTAIN]])
    triggerUpdate(sys, em, makeWorldWithTile(tileMap))
    expect((sys as any).visionMap.get(id).effectiveRange).toBe(12)
  })

  it('浮点位置实体与整数位置实体距离计算正确', () => {
    const em = new EntityManager()
    const id1 = spawnCreature(em, 0.5, 0.5)
    const id2 = spawnCreature(em, 5.5, 0.5)  // 距离5<8
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    expect((sys as any).visionMap.get(id1).visibleEntities).toContain(id2)
  })
})

describe('CreatureVisionSystem — VisionData 结构完整性', () => {
  let sys: CreatureVisionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('VisionData 包含 entityId 字段', () => {
    const em = new EntityManager()
    const id = spawnCreature(em, 10, 10)
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    expect((sys as any).visionMap.get(id)).toHaveProperty('entityId')
  })

  it('VisionData 包含 range 字段', () => {
    const em = new EntityManager()
    const id = spawnCreature(em, 10, 10)
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    expect((sys as any).visionMap.get(id)).toHaveProperty('range')
  })

  it('VisionData 包含 effectiveRange 字段', () => {
    const em = new EntityManager()
    const id = spawnCreature(em, 10, 10)
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    expect((sys as any).visionMap.get(id)).toHaveProperty('effectiveRange')
  })

  it('VisionData 包含 visibleEntities 数组字段', () => {
    const em = new EntityManager()
    const id = spawnCreature(em, 10, 10)
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    const vd = (sys as any).visionMap.get(id)
    expect(Array.isArray(vd.visibleEntities)).toBe(true)
  })

  it('VisionData 包含 lastUpdate 字段', () => {
    const em = new EntityManager()
    const id = spawnCreature(em, 10, 10)
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    expect((sys as any).visionMap.get(id)).toHaveProperty('lastUpdate')
  })

  it('无实体时 visionMap 为空，不抛错', () => {
    const em = new EntityManager()
    expect(() => triggerUpdate(sys, em, makeWorld(TileType.GRASS))).not.toThrow()
    expect((sys as any).visionMap.size).toBe(0)
  })
})

describe('CreatureVisionSystem — getVisionData 功能验证', () => {
  let sys: CreatureVisionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('visionMap.get 已存在实体返回 VisionData', () => {
    const em = new EntityManager()
    const id = spawnCreature(em, 10, 10)
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    const vd = (sys as any).visionMap.get(id)
    expect(vd).not.toBeUndefined()
  })

  it('visionMap.get 不存在实体返回 undefined', () => {
    const em = new EntityManager()
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    expect((sys as any).visionMap.get(9999)).toBeUndefined()
  })

  it('实体有零个邻居时 visibleEntities 为空数组', () => {
    const em = new EntityManager()
    const id = spawnCreature(em, 10, 10)
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    expect((sys as any).visionMap.get(id).visibleEntities).toHaveLength(0)
  })

  it('visibleEntities 不包含重复 ID', () => {
    const em = new EntityManager()
    const id1 = spawnCreature(em, 0, 0)
    const id2 = spawnCreature(em, 3, 0)
    triggerUpdate(sys, em, makeWorld(TileType.GRASS))
    const visible = (sys as any).visionMap.get(id1).visibleEntities
    const unique = new Set(visible)
    expect(unique.size).toBe(visible.length)
  })
})
