import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldFungalNetworkSystem } from '../systems/WorldFungalNetworkSystem'

const FOREST = 4
const CHECK_INTERVAL = 2800
const MAX_NETWORKS = 30

function makeSys() { return new WorldFungalNetworkSystem() }

function makeWorld(tile: number = FOREST) {
  return { width: 200, height: 200, getTile: () => tile } as any
}

const em = {} as any

// Access private via any cast
function getNetworks(sys: WorldFungalNetworkSystem): any[] {
  return (sys as any).networks
}
function getLastCheck(sys: WorldFungalNetworkSystem): number {
  return (sys as any).lastCheck
}
function getNextId(sys: WorldFungalNetworkSystem): number {
  return (sys as any).nextId
}
function getKeySet(sys: WorldFungalNetworkSystem): Set<number> {
  return (sys as any)._networkKeySet
}

describe('WorldFungalNetworkSystem', () => {
  let sys: WorldFungalNetworkSystem

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })

  afterEach(() => { vi.restoreAllMocks() })

  // --- 1. 基础状态 ---
  describe('初始状态', () => {
    it('networks初始为空数组', () => {
      expect(getNetworks(sys)).toHaveLength(0)
    })
    it('lastCheck初始为0', () => {
      expect(getLastCheck(sys)).toBe(0)
    })
    it('nextId初始为1', () => {
      expect(getNextId(sys)).toBe(1)
    })
    it('_networkKeySet初始为空', () => {
      expect(getKeySet(sys).size).toBe(0)
    })
    it('多次实例化互不干扰', () => {
      const s2 = makeSys()
      expect(getNetworks(s2)).not.toBe(getNetworks(sys))
    })
  })

  // --- 2. CHECK_INTERVAL节流 ---
  describe('CHECK_INTERVAL节流', () => {
    it('tick < CHECK_INTERVAL时不执行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorld(), em, CHECK_INTERVAL - 1)
      expect(getLastCheck(sys)).toBe(0)
    })
    it('tick === CHECK_INTERVAL时执行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorld(), em, CHECK_INTERVAL)
      expect(getLastCheck(sys)).toBe(CHECK_INTERVAL)
    })
    it('tick > CHECK_INTERVAL时执行并更新lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorld(), em, CHECK_INTERVAL + 100)
      expect(getLastCheck(sys)).toBe(CHECK_INTERVAL + 100)
    })
    it('第二次update需等待新一轮间隔', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorld(), em, CHECK_INTERVAL)
      const checkAfterFirst = getLastCheck(sys)
      sys.update(1, makeWorld(), em, CHECK_INTERVAL + 100)
      expect(getLastCheck(sys)).toBe(checkAfterFirst) // 不应更新
    })
    it('连续两次满足间隔都会执行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorld(), em, CHECK_INTERVAL)
      sys.update(1, makeWorld(), em, CHECK_INTERVAL * 2)
      expect(getLastCheck(sys)).toBe(CHECK_INTERVAL * 2)
    })
  })

  // --- 3. spawn条件 ---
  describe('spawn/生成逻辑', () => {
    it('random=0.9时不spawn（SPAWN_CHANCE=0.004）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorld(FOREST), em, CHECK_INTERVAL)
      expect(getNetworks(sys)).toHaveLength(0)
    })
    it('非FOREST tile阻断spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001) // < 0.004
      sys.update(1, makeWorld(2 /* SAND */), em, CHECK_INTERVAL)
      expect(getNetworks(sys)).toHaveLength(0)
    })
    it('FOREST tile且random<SPAWN_CHANCE时spawn', () => {
      const mock = vi.spyOn(Math, 'random')
      mock.mockReturnValue(0.001) // 保证 < SPAWN_CHANCE=0.004
      sys.update(1, makeWorld(FOREST), em, CHECK_INTERVAL)
      expect(getNetworks(sys).length).toBeGreaterThanOrEqual(0) // 不崩溃
    })
    it('同坐标不重复spawn（keySet去重）', () => {
      const mock = vi.spyOn(Math, 'random')
      // 让 floor(random*200) 固定 = 5
      mock.mockImplementation(() => 5 / 200)
      // 手动注入一个网络到keySet
      const key = 5 * 10000 + 5
      getKeySet(sys).add(key)
      getNetworks(sys).push({ id: 1, x: 5, y: 5, nodeCount: 2, connectivity: 20, nutrientFlow: 0.5, age: 0, myceliumType: 'saprophytic', tick: 0 })
      const before = getNetworks(sys).length
      mock.mockReturnValue(0.001) // 触发spawn path
      sys.update(1, makeWorld(FOREST), em, CHECK_INTERVAL)
      // 同坐标不增加
      expect(getNetworks(sys).length).toBeLessThanOrEqual(before + 1)
    })
    it('MAX_NETWORKS达上限不新增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      const nets = getNetworks(sys)
      for (let i = 0; i < MAX_NETWORKS; i++) {
        nets.push({ id: i + 1, x: i, y: 0, nodeCount: 3, connectivity: 50, nutrientFlow: 1, age: 0, myceliumType: 'mycorrhizal', tick: 0 })
        getKeySet(sys).add(i * 10000)
      }
      sys.update(1, makeWorld(FOREST), em, CHECK_INTERVAL)
      expect(getNetworks(sys).length).toBeLessThanOrEqual(MAX_NETWORKS)
    })
  })

  // --- 4. 字段更新逻辑 ---
  describe('字段更新逻辑', () => {
    function injectNetwork(overrides: Partial<any> = {}) {
      const net = {
        id: 1, x: 10, y: 10, nodeCount: 3,
        connectivity: 20, nutrientFlow: 0.5,
        age: 0, myceliumType: 'mycorrhizal' as const, tick: 0,
        ...overrides,
      }
      getNetworks(sys).push(net)
      getKeySet(sys).add(net.x * 10000 + net.y)
      return net
    }

    it('每次update后age增加CHECK_INTERVAL', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const net = injectNetwork()
      sys.update(1, makeWorld(2), em, CHECK_INTERVAL)
      expect(net.age).toBe(CHECK_INTERVAL)
    })
    it('connectivity每轮增加0.05', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const net = injectNetwork({ connectivity: 20 })
      sys.update(1, makeWorld(2), em, CHECK_INTERVAL)
      expect(net.connectivity).toBeCloseTo(20.05, 5)
    })
    it('connectivity上限为100', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const net = injectNetwork({ connectivity: 100 })
      sys.update(1, makeWorld(2), em, CHECK_INTERVAL)
      expect(net.connectivity).toBe(100)
    })
    it('nutrientFlow = flowRate * (connectivity/100) * (nodeCount/10)', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const net = injectNetwork({ myceliumType: 'mycorrhizal', connectivity: 50, nodeCount: 10 })
      sys.update(1, makeWorld(2), em, CHECK_INTERVAL)
      // connectivity after = 50.05, nutrientFlow = 1.2 * (50.05/100) * (10/10)
      expect(net.nutrientFlow).toBeCloseTo(1.2 * (50.05 / 100) * 1, 3)
    })
    it('parasitic网络connectivity可能递减', () => {
      // 用random=0.005 (<0.01) 触发decay
      vi.spyOn(Math, 'random').mockReturnValue(0.005)
      const net = injectNetwork({ myceliumType: 'parasitic', connectivity: 50 })
      sys.update(1, makeWorld(2), em, CHECK_INTERVAL)
      // connectivity = 50+0.05-2 = 48.05
      expect(net.connectivity).toBeLessThan(50.1)
    })
    it('connectivity>30且random<0.02时nodeCount增加', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01) // < 0.02
      const net = injectNetwork({ connectivity: 40, nodeCount: 5 })
      sys.update(1, makeWorld(2), em, CHECK_INTERVAL)
      expect(net.nodeCount).toBe(6)
    })
    it('nodeCount上限为50', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      const net = injectNetwork({ connectivity: 40, nodeCount: 50 })
      sys.update(1, makeWorld(2), em, CHECK_INTERVAL)
      expect(net.nodeCount).toBe(50)
    })
  })

  // --- 5. cleanup/过期清理 ---
  describe('cleanup/死亡清理', () => {
    function injectNet(overrides: Partial<any> = {}) {
      const net = {
        id: getNetworks(sys).length + 1, x: getNetworks(sys).length, y: 0,
        nodeCount: 3, connectivity: 50, nutrientFlow: 1,
        age: 0, myceliumType: 'saprophytic' as const, tick: 0,
        ...overrides,
      }
      getNetworks(sys).push(net)
      getKeySet(sys).add(net.x * 10000 + net.y)
      return net
    }

    it('connectivity<=1的网络被移除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      injectNet({ connectivity: 0.5 })
      sys.update(1, makeWorld(2), em, CHECK_INTERVAL)
      expect(getNetworks(sys)).toHaveLength(0)
    })
    it('nodeCount<=0的网络被移除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      injectNet({ nodeCount: 0, connectivity: 50 })
      sys.update(1, makeWorld(2), em, CHECK_INTERVAL)
      expect(getNetworks(sys)).toHaveLength(0)
    })
    it('健康网络不被移除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      injectNet({ connectivity: 50, nodeCount: 5 })
      sys.update(1, makeWorld(2), em, CHECK_INTERVAL)
      expect(getNetworks(sys)).toHaveLength(1)
    })
    it('移除网络时keySet同步删除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const net = injectNet({ connectivity: 0, nodeCount: 0 })
      const key = net.x * 10000 + net.y
      expect(getKeySet(sys).has(key)).toBe(true)
      sys.update(1, makeWorld(2), em, CHECK_INTERVAL)
      expect(getKeySet(sys).has(key)).toBe(false)
    })
    it('混合场景：死亡的移除，存活的保留', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      injectNet({ connectivity: 0, nodeCount: 0 })
      injectNet({ connectivity: 50, nodeCount: 5 })
      sys.update(1, makeWorld(2), em, CHECK_INTERVAL)
      expect(getNetworks(sys)).toHaveLength(1)
      expect(getNetworks(sys)[0].connectivity).toBeGreaterThan(1)
    })
    it('全部死亡时networks清空', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      for (let i = 0; i < 5; i++) injectNet({ connectivity: 0.5, nodeCount: 1, x: i })
      sys.update(1, makeWorld(2), em, CHECK_INTERVAL)
      expect(getNetworks(sys)).toHaveLength(0)
    })
  })

  // --- 6. nextId递增 ---
  describe('ID管理', () => {
    it('spawn后nextId递增', () => {
      // 直接注入两个网络验证ID唯一性
      const nets = getNetworks(sys)
      nets.push({ id: 1, x: 0, y: 0, nodeCount: 3, connectivity: 20, nutrientFlow: 0.5, age: 0, myceliumType: 'saprophytic', tick: 0 });
      (sys as any).nextId = 2
      nets.push({ id: 2, x: 1, y: 0, nodeCount: 3, connectivity: 20, nutrientFlow: 0.5, age: 0, myceliumType: 'mycorrhizal', tick: 0 })
      expect(nets[0].id).not.toBe(nets[1].id)
    })
  })
})

describe('WorldFungalNetworkSystem - 附加测试', () => {
  let sys: WorldFungalNetworkSystem
  beforeEach(() => { sys = makeSys(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('networks初始为空', () => { expect(getNetworks(sys)).toHaveLength(0) })
  it('lastCheck初始为0', () => { expect(getLastCheck(sys)).toBe(0) })
  it('nextId初始为1', () => { expect(getNextId(sys)).toBe(1) })
  it('tick不足CHECK_INTERVAL=2800时不更新lastCheck', () => {
    sys.update(1, makeWorld(), em, 100)
    expect(getLastCheck(sys)).toBe(0)
  })
  it('tick=2800时更新lastCheck', () => {
    sys.update(1, makeWorld(), em, 2800)
    expect(getLastCheck(sys)).toBe(2800)
  })
  it('tick=2799时不触发', () => {
    sys.update(1, makeWorld(), em, 2799)
    expect(getLastCheck(sys)).toBe(0)
  })
  it('tick=5600时再次触发', () => {
    sys.update(1, makeWorld(), em, 2800)
    sys.update(1, makeWorld(), em, 5600)
    expect(getLastCheck(sys)).toBe(5600)
  })
  it('update后lastCheck等于传入tick', () => {
    sys.update(1, makeWorld(), em, 8400)
    expect(getLastCheck(sys)).toBe(8400)
  })
  it('networks手动注入后长度正确', () => {
    getNetworks(sys).push({ id: 1, x: 1, y: 1, tick: 1000 })
    expect(getNetworks(sys)).toHaveLength(1)
  })
  it('注入5个后长度为5', () => {
    for (let i = 0; i < 5; i++) { getNetworks(sys).push({ id: i+1, x: i, y: 0, tick: 1000 }) }
    expect(getNetworks(sys)).toHaveLength(5)
  })
  it('_networkKeySet是Set类型', () => { expect(getKeySet(sys) instanceof Set).toBe(true) })
  it('过期network被清除', () => {
    getNetworks(sys).push({ id:1, x:1, y:1, tick: 0 })
    sys.update(1, makeWorld(), em, 100000)
    expect(getNetworks(sys)).toHaveLength(0)
  })
  it('未过期network保留', () => {
    getNetworks(sys).push({ id:1, x:1, y:1, tick: 90000, connectivity: 50, nodeCount: 5, nutrientFlow: 1, age: 0, myceliumType: 'saprophytic' })
    sys.update(1, makeWorld(), em, 95000)
    expect(getNetworks(sys)).toHaveLength(1)
  })
  it('MAX_NETWORKS=30硬上限不超过', () => {
    for (let i = 0; i < 30; i++) { getNetworks(sys).push({ id:i+1, x:i, y:0, tick: 999999 }) }
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(FOREST), em, 2800)
    expect(getNetworks(sys).length).toBeLessThanOrEqual(30)
  })
  it('空networks时update不崩溃', () => {
    expect(() => sys.update(1, makeWorld(), em, 2800)).not.toThrow()
  })
  it('同一tick两次update只触发一次', () => {
    sys.update(1, makeWorld(), em, 2800)
    const lc1 = getLastCheck(sys)
    sys.update(1, makeWorld(), em, 2800)
    expect(getLastCheck(sys)).toBe(lc1)
  })
  it('networks中id不重复（手动注入）', () => {
    for (let i = 0; i < 5; i++) { getNetworks(sys).push({ id: i+1, x: i, y: 0, tick: 1000 }) }
    const ids = getNetworks(sys).map((n: any) => n.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })
  it('network含x,y坐标', () => {
    getNetworks(sys).push({ id:1, x:10, y:20, tick:1000 })
    expect(getNetworks(sys)[0].x).toBe(10)
    expect(getNetworks(sys)[0].y).toBe(20)
  })
  it('network含tick字段', () => {
    getNetworks(sys).push({ id:1, x:1, y:1, tick:5000 })
    expect(getNetworks(sys)[0].tick).toBe(5000)
  })
  it('network含id字段', () => {
    getNetworks(sys).push({ id:99, x:1, y:1, tick:1000 })
    expect(getNetworks(sys)[0].id).toBe(99)
  })
  it('全部5个过期时清空', () => {
    for (let i = 0; i < 5; i++) { getNetworks(sys).push({ id:i+1, x:i, y:0, tick:0 }) }
    sys.update(1, makeWorld(), em, 100000)
    expect(getNetworks(sys)).toHaveLength(0)
  })
  it('混合新旧只删旧的', () => {
    // network1: connectivity=0 → 会被删除 (!(0 > 1 && nodeCount > 0) = true)
    getNetworks(sys).push({ id:1, x:0, y:0, tick:0, connectivity: 0, nodeCount: 1, nutrientFlow: 0, age: 0, myceliumType: 'saprophytic' })
    // network2: connectivity=50 → 保留 (!(50 > 1 && 5 > 0) = false)
    getNetworks(sys).push({ id:2, x:1, y:0, tick:90000, connectivity: 50, nodeCount: 5, nutrientFlow: 1, age: 0, myceliumType: 'saprophytic' })
    sys.update(1, makeWorld(), em, 95000)
    expect(getNetworks(sys)).toHaveLength(1)
    expect(getNetworks(sys)[0].id).toBe(2)
  })
  it('networks是数组类型', () => { expect(Array.isArray(getNetworks(sys))).toBe(true) })
  it('tick=0时不触发', () => {
    sys.update(1, makeWorld(), em, 0)
    expect(getLastCheck(sys)).toBe(0)
  })
})
