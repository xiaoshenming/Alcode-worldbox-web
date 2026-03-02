import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BiomeEvolutionSystem } from '../systems/BiomeEvolutionSystem'
import { EntityManager } from '../ecs/Entity'
import { TileType, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'
import { BuildingType } from '../civilization/Civilization'

// ===== 工厂函数 =====

function makeSys(): BiomeEvolutionSystem {
  return new BiomeEvolutionSystem()
}

interface MockWorld {
  width: number
  height: number
  tileMap: Map<string, TileType>
  getTile: (x: number, y: number) => TileType | null
  setTile: (x: number, y: number, t: TileType) => void
}

function makeMockWorld(defaultTile: TileType = TileType.GRASS): MockWorld {
  const tileMap = new Map<string, TileType>()
  return {
    width: 20,
    height: 20,
    tileMap,
    getTile(x: number, y: number): TileType | null {
      const key = `${x},${y}`
      if (tileMap.has(key)) return tileMap.get(key)!
      if (x < 0 || y < 0 || x >= 20 || y >= 20) return null
      return defaultTile
    },
    setTile(x: number, y: number, t: TileType): void {
      tileMap.set(`${x},${y}`, t)
    },
  }
}

function makeMockParticles() {
  return { spawnEvolution: vi.fn(), spawn: vi.fn() }
}

function makeMockCivManager() {
  return { civilizations: new Map() }
}

/** 在 EVOLUTION_INTERVAL=600 的 tick 上调用 update */
function runAtEvolutionTick(
  sys: BiomeEvolutionSystem,
  world: ReturnType<typeof makeMockWorld>,
  em: EntityManager,
  particles: ReturnType<typeof makeMockParticles>,
  tickMultiplier = 1
): void {
  sys.update(world as any, makeMockCivManager() as any, em, particles as any, 600 * tickMultiplier)
}

describe('BiomeEvolutionSystem', () => {
  let sys: BiomeEvolutionSystem
  let em: EntityManager

  beforeEach(() => {
    sys = makeSys()
    em = new EntityManager()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ===== 初始状态 =====
  describe('初始状态', () => {
    it('可以实例化', () => {
      expect(sys).toBeDefined()
    })

    it('sampleCount 为正整数', () => {
      const sc = (sys as any).sampleCount
      expect(sc).toBeGreaterThan(0)
      expect(Number.isInteger(sc)).toBe(true)
    })

    it('sampleCount 等于 WORLD_WIDTH * WORLD_HEIGHT * 0.05 取整', () => {
      const expected = Math.floor(WORLD_WIDTH * WORLD_HEIGHT * 0.05)
      expect((sys as any).sampleCount).toBe(expected)
    })

    it('内部 _popDensity 初始为空 Map', () => {
      expect((sys as any)._popDensity.size).toBe(0)
    })

    it('内部 _buildingMap 初始为空 Map', () => {
      expect((sys as any)._buildingMap.size).toBe(0)
    })

    it('内部 _neighborsBuf 初始为空数组', () => {
      expect((sys as any)._neighborsBuf).toEqual([])
    })

    it('内部 _neighborSet 初始为空 Set', () => {
      expect((sys as any)._neighborSet.size).toBe(0)
    })

    it('sampleCount 的类型为 number', () => {
      expect(typeof (sys as any).sampleCount).toBe('number')
    })
  })

  // ===== update 调度逻辑 =====
  describe('update() 调度逻辑', () => {
    it('tick=0 时调用不崩溃', () => {
      const world = makeMockWorld()
      const particles = makeMockParticles()
      expect(() => sys.update(world as any, makeMockCivManager() as any, em, particles as any, 0)).not.toThrow()
    })

    it('tick 不是 600 倍数时不执行演化（setTile 不被调用）', () => {
      const world = makeMockWorld()
      const particles = makeMockParticles()
      const setTileSpy = vi.spyOn(world, 'setTile')
      // tick=1 不是 600 的倍数
      sys.update(world as any, makeMockCivManager() as any, em, particles as any, 1)
      expect(setTileSpy).not.toHaveBeenCalled()
    })

    it('tick=600 时执行演化（触发演化路径）', () => {
      const world = makeMockWorld()
      const particles = makeMockParticles()
      // 让 Math.random 始终返回 0（确保触发转变）
      vi.spyOn(Math, 'random').mockReturnValue(0)
      // 不崩溃即可
      expect(() => sys.update(world as any, makeMockCivManager() as any, em, particles as any, 600)).not.toThrow()
    })

    it('tick=1200 时执行演化', () => {
      const world = makeMockWorld()
      const particles = makeMockParticles()
      expect(() => sys.update(world as any, makeMockCivManager() as any, em, particles as any, 1200)).not.toThrow()
    })

    it('连续多个 tick 调用不崩溃', () => {
      const world = makeMockWorld()
      const particles = makeMockParticles()
      expect(() => {
        for (let i = 0; i < 10; i++) {
          sys.update(world as any, makeMockCivManager() as any, em, particles as any, i * 600)
        }
      }).not.toThrow()
    })

    it('空实体管理器下��化不崩溃', () => {
      const world = makeMockWorld()
      const particles = makeMockParticles()
      expect(() => runAtEvolutionTick(sys, world, em, particles)).not.toThrow()
    })

    it('tick 非 1200 倍数时不触发熔岩冷却', () => {
      // tick=600 不是 1200 倍数，熔岩不应该改变
      const world = makeMockWorld(TileType.LAVA)
      const particles = makeMockParticles()
      vi.spyOn(Math, 'random').mockReturnValue(0) // random < 0.3 恒成立
      const setTileSpy = vi.spyOn(world, 'setTile')
      sys.update(world as any, makeMockCivManager() as any, em, particles as any, 600)
      // tick=600 不满足 isLavaCoolTick，熔岩冷却路径不触发
      const lavaToMountain = setTileSpy.mock.calls.some(
        ([, , t]) => t === TileType.MOUNTAIN
      )
      expect(lavaToMountain).toBe(false)
    })
  })

  // ===== naturalEvolution (通过私有方法直接测试) =====
  describe('naturalEvolution 自然演化逻辑', () => {
    it('SAND 旁有 GRASS 且 random < 0.08：沙子变草地', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      const ns = new Set<TileType>([TileType.GRASS])
      const result = (sys as any).naturalEvolution(TileType.SAND, [], ns)
      expect(result).toBe(TileType.GRASS)
    })

    it('SAND 旁有 GRASS 但 random >= 0.08：不变', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const ns = new Set<TileType>([TileType.GRASS])
      const result = (sys as any).naturalEvolution(TileType.SAND, [], ns)
      expect(result).toBeNull()
    })

    it('SAND 旁无 GRASS：不变', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      const ns = new Set<TileType>([TileType.MOUNTAIN])
      const result = (sys as any).naturalEvolution(TileType.SAND, [], ns)
      expect(result).toBeNull()
    })

    it('GRASS 旁有 FOREST 且 random < 0.05：草地变森林', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      const ns = new Set<TileType>([TileType.FOREST])
      const result = (sys as any).naturalEvolution(TileType.GRASS, [], ns)
      expect(result).toBe(TileType.FOREST)
    })

    it('GRASS 旁有 FOREST 但 random >= 0.05：不扩展', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1)
      const ns = new Set<TileType>([TileType.FOREST])
      const result = (sys as any).naturalEvolution(TileType.GRASS, [], ns)
      expect(result).toBeNull()
    })

    it('GRASS 无水无森林且 random < 0.03：荒漠化变沙', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      const ns = new Set<TileType>([TileType.MOUNTAIN])
      const result = (sys as any).naturalEvolution(TileType.GRASS, [], ns)
      expect(result).toBe(TileType.SAND)
    })

    it('GRASS 有 SHALLOW_WATER 时不荒漠化', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      const ns = new Set<TileType>([TileType.SHALLOW_WATER])
      const result = (sys as any).naturalEvolution(TileType.GRASS, [], ns)
      expect(result).toBeNull()
    })

    it('GRASS 有 DEEP_WATER 时不荒漠化', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      const ns = new Set<TileType>([TileType.DEEP_WATER])
      const result = (sys as any).naturalEvolution(TileType.GRASS, [], ns)
      expect(result).toBeNull()
    })

    it('SHALLOW_WATER 旁有陆地且 random < 0.02：变沙滩', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      const ns = new Set<TileType>([TileType.GRASS])
      const result = (sys as any).naturalEvolution(TileType.SHALLOW_WATER, [], ns)
      expect(result).toBe(TileType.SAND)
    })

    it('SHALLOW_WATER 旁无陆地：不变', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      const ns = new Set<TileType>([TileType.DEEP_WATER])
      const result = (sys as any).naturalEvolution(TileType.SHALLOW_WATER, [], ns)
      expect(result).toBeNull()
    })

    it('SHALLOW_WATER 旁有陆地但 random >= 0.02：不变', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const ns = new Set<TileType>([TileType.MOUNTAIN])
      const result = (sys as any).naturalEvolution(TileType.SHALLOW_WATER, [], ns)
      expect(result).toBeNull()
    })

    it('MOUNTAIN 类型不参与自然演化（返回null）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      const ns = new Set<TileType>([TileType.GRASS])
      const result = (sys as any).naturalEvolution(TileType.MOUNTAIN, [], ns)
      expect(result).toBeNull()
    })

    it('DEEP_WATER 类型不参与自然演化', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      const ns = new Set<TileType>([TileType.GRASS])
      const result = (sys as any).naturalEvolution(TileType.DEEP_WATER, [], ns)
      expect(result).toBeNull()
    })

    it('LAVA 类型不参与自然演化', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      const ns = new Set<TileType>([TileType.MOUNTAIN])
      const result = (sys as any).naturalEvolution(TileType.LAVA, [], ns)
      expect(result).toBeNull()
    })
  })

  // ===== erosion =====
  describe('erosion 侵蚀逻辑', () => {
    it('SAND 旁有2个水邻居且 random < 0.02：变 SHALLOW_WATER', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      const neighbors = [TileType.SHALLOW_WATER, TileType.DEEP_WATER, TileType.GRASS]
      const result = (sys as any).erosion(TileType.SAND, neighbors)
      expect(result).toBe(TileType.SHALLOW_WATER)
    })

    it('SAND 旁只有1个水邻居：不侵蚀', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      const neighbors = [TileType.SHALLOW_WATER, TileType.GRASS, TileType.MOUNTAIN]
      const result = (sys as any).erosion(TileType.SAND, neighbors)
      expect(result).toBeNull()
    })

    it('SAND 旁有2个水邻居但 random >= 0.02：不侵蚀', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const neighbors = [TileType.SHALLOW_WATER, TileType.DEEP_WATER]
      const result = (sys as any).erosion(TileType.SAND, neighbors)
      expect(result).toBeNull()
    })

    it('MOUNTAIN 旁有3个非山邻居且 random < 0.01：山脉侵蚀为草地', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.005)
      const neighbors = [TileType.GRASS, TileType.FOREST, TileType.SAND, TileType.MOUNTAIN]
      const result = (sys as any).erosion(TileType.MOUNTAIN, neighbors)
      expect(result).toBe(TileType.GRASS)
    })

    it('MOUNTAIN 旁少于3个非山邻居：不侵蚀', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.005)
      const neighbors = [TileType.GRASS, TileType.MOUNTAIN, TileType.MOUNTAIN, TileType.SNOW]
      const result = (sys as any).erosion(TileType.MOUNTAIN, neighbors)
      expect(result).toBeNull()
    })

    it('GRASS 类型不参与侵蚀', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const neighbors = [TileType.SHALLOW_WATER, TileType.DEEP_WATER]
      const result = (sys as any).erosion(TileType.GRASS, neighbors)
      expect(result).toBeNull()
    })

    it('SNOW 邻居不计入山脉非山计数', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.005)
      // 3个SNOW邻居，SNOW不算非山，不足3个非山
      const neighbors = [TileType.SNOW, TileType.SNOW, TileType.SNOW]
      const result = (sys as any).erosion(TileType.MOUNTAIN, neighbors)
      expect(result).toBeNull()
    })
  })

  // ===== getLocalDensity =====
  describe('getLocalDensity 人口密度计算', () => {
    it('空的密度图返回0', () => {
      const map = new Map<number, number>()
      const density = (sys as any).getLocalDensity(map, 40, 40, 6)
      expect(density).toBe(0)
    })

    it('同一格子内有生物：密度大于0', () => {
      const map = new Map<number, number>()
      // x=40,y=40 的 8x8 cell key: floor(40/8)*10000 + floor(40/8) = 5*10000+5 = 50005
      map.set(50005, 3)
      const density = (sys as any).getLocalDensity(map, 40, 40, 6)
      expect(density).toBeGreaterThan(0)
    })

    it('远处的生物不计入本地密度', () => {
      const map = new Map<number, number>()
      // 远处格子 (x=200, y=200)
      map.set(Math.floor(200 / 8) * 10000 + Math.floor(200 / 8), 10)
      // 查询 (0,0) 的密度，radius=6 覆盖不到
      const density = (sys as any).getLocalDensity(map, 0, 0, 6)
      expect(density).toBe(0)
    })
  })

  // ===== hasBuildingNearby =====
  describe('hasBuildingNearby 建筑邻近检测', () => {
    it('指定坐标有目标建筑时返回true', () => {
      const map = new Map<number, BuildingType>()
      map.set(5 * 10000 + 5, BuildingType.FARM)
      const result = (sys as any).hasBuildingNearby(map, 5, 5, 2, BuildingType.FARM)
      expect(result).toBe(true)
    })

    it('范围内无目标建筑时返回false', () => {
      const map = new Map<number, BuildingType>()
      map.set(100 * 10000 + 100, BuildingType.FARM)
      const result = (sys as any).hasBuildingNearby(map, 5, 5, 2, BuildingType.FARM)
      expect(result).toBe(false)
    })

    it('建筑类型不匹配时返回false', () => {
      const map = new Map<number, BuildingType>()
      map.set(5 * 10000 + 5, BuildingType.MINE)
      const result = (sys as any).hasBuildingNearby(map, 5, 5, 2, BuildingType.FARM)
      expect(result).toBe(false)
    })

    it('边界半径内的建筑也能检测到', () => {
      const map = new Map<number, BuildingType>()
      // (5+4, 5) 在 radius=4 边界上
      map.set(9 * 10000 + 5, BuildingType.MINE)
      const result = (sys as any).hasBuildingNearby(map, 5, 5, 4, BuildingType.MINE)
      expect(result).toBe(true)
    })

    it('空 buildingMap 返回false', () => {
      const map = new Map<number, BuildingType>()
      expect((sys as any).hasBuildingNearby(map, 5, 5, 3, BuildingType.FARM)).toBe(false)
    })
  })

  // ===== emitParticle =====
  describe('emitParticle 粒子发射', () => {
    it('有对应颜色的 tileType 会调用 particles.spawn', () => {
      const particles = makeMockParticles()
      ;(sys as any).emitParticle(particles, 5, 5, TileType.GRASS)
      expect(particles.spawn).toHaveBeenCalledTimes(1)
    })

    it('没有对应颜色的 tileType 不调用 particles.spawn', () => {
      const particles = makeMockParticles()
      // SNOW 没有在 TERRAIN_PARTICLE_COLOR 中定义
      ;(sys as any).emitParticle(particles, 5, 5, TileType.SNOW)
      expect(particles.spawn).not.toHaveBeenCalled()
    })

    it('GRASS 粒子颜色参数正确', () => {
      const particles = makeMockParticles()
      ;(sys as any).emitParticle(particles, 10, 20, TileType.GRASS)
      expect(particles.spawn).toHaveBeenCalledWith(10.5, 20.5, 3, '#5aac5a', 0.8)
    })

    it('FOREST 粒子颜色参数正确', () => {
      const particles = makeMockParticles()
      ;(sys as any).emitParticle(particles, 0, 0, TileType.FOREST)
      expect(particles.spawn).toHaveBeenCalledWith(0.5, 0.5, 3, '#1a5a1a', 0.8)
    })
  })

  // ===== buildPopDensityMap =====
  describe('buildPopDensityMap 人口密度图构建', () => {
    it('空实体管理器：密度图为空', () => {
      const map = new Map<number, number>()
      ;(sys as any).buildPopDensityMap(em, map)
      expect(map.size).toBe(0)
    })

    it('有生物实体时：密度图非空', () => {
      const id = em.createEntity()
      // EntityManager.addComponent 接受包含 type 字段的 Component 对象
      em.addComponent(id, { type: 'position', x: 40, y: 40 } as any)
      em.addComponent(id, { type: 'creature', species: 'human' } as any)
      const map = new Map<number, number>()
      ;(sys as any).buildPopDensityMap(em, map)
      expect(map.size).toBeGreaterThan(0)
    })

    it('同格子多个生物时密度累加', () => {
      for (let i = 0; i < 3; i++) {
        const id = em.createEntity()
        em.addComponent(id, { type: 'position', x: 40, y: 40 } as any)
        em.addComponent(id, { type: 'creature', species: 'human' } as any)
      }
      const map = new Map<number, number>()
      ;(sys as any).buildPopDensityMap(em, map)
      const key = Math.floor(40 / 8) * 10000 + Math.floor(40 / 8)
      expect(map.get(key)).toBe(3)
    })

    it('每次调用前清空旧数据', () => {
      const map = new Map<number, number>()
      map.set(99999, 999) // 旧数据
      ;(sys as any).buildPopDensityMap(em, map)
      expect(map.has(99999)).toBe(false)
    })
  })

  // ===== buildBuildingMap =====
  describe('buildBuildingMap 建筑图构建', () => {
    it('空实体管理器：建筑图为空', () => {
      const map = new Map<number, BuildingType>()
      ;(sys as any).buildBuildingMap(em, map)
      expect(map.size).toBe(0)
    })

    it('有建筑实体时：建筑图非空', () => {
      const id = em.createEntity()
      em.addComponent(id, { type: 'position', x: 10, y: 10 } as any)
      em.addComponent(id, { type: 'building', buildingType: BuildingType.FARM } as any)
      const map = new Map<number, BuildingType>()
      ;(sys as any).buildBuildingMap(em, map)
      expect(map.size).toBeGreaterThan(0)
    })

    it('建筑类型正确存储', () => {
      const id = em.createEntity()
      em.addComponent(id, { type: 'position', x: 5, y: 7 } as any)
      em.addComponent(id, { type: 'building', buildingType: BuildingType.MINE } as any)
      const map = new Map<number, BuildingType>()
      ;(sys as any).buildBuildingMap(em, map)
      const key = Math.floor(5) * 10000 + Math.floor(7)
      expect(map.get(key)).toBe(BuildingType.MINE)
    })

    it('每次调用前清空旧数据', () => {
      const map = new Map<number, BuildingType>()
      map.set(99999, BuildingType.CASTLE)
      ;(sys as any).buildBuildingMap(em, map)
      expect(map.has(99999)).toBe(false)
    })
  })

  // ===== getNeighborTypes =====
  describe('getNeighborTypes 邻居类型收集', () => {
    it('中间位置有4个有效邻居', () => {
      const world = makeMockWorld(TileType.GRASS)
      const result = (sys as any).getNeighborTypes(world, 5, 5)
      expect(result.length).toBe(4)
    })

    it('_neighborSet 正确填充', () => {
      const world = makeMockWorld(TileType.GRASS)
      ;(sys as any).getNeighborTypes(world, 5, 5)
      const ns: Set<TileType> = (sys as any)._neighborSet
      expect(ns.has(TileType.GRASS)).toBe(true)
    })

    it('每次调用后 _neighborsBuf 被重置', () => {
      const world = makeMockWorld(TileType.GRASS)
      ;(sys as any).getNeighborTypes(world, 5, 5)
      const buf1 = (sys as any)._neighborsBuf.length
      ;(sys as any).getNeighborTypes(world, 5, 5)
      const buf2 = (sys as any)._neighborsBuf.length
      expect(buf1).toBe(buf2)
    })

    it('边界位置返回少于4个邻居（越界返回null被过滤）', () => {
      const world = makeMockWorld(TileType.GRASS)
      // 角落位置，DIRS=4方向，越界的不计入
      const result = (sys as any).getNeighborTypes(world, 0, 0)
      expect(result.length).toBeLessThan(4)
    })
  })
})
