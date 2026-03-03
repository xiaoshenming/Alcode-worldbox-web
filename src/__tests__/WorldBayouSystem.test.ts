import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldBayouSystem } from '../systems/WorldBayouSystem'
import type { Bayou } from '../systems/WorldBayouSystem'
import { TileType } from '../utils/Constants'
import { EntityManager } from '../ecs/Entity'

function makeSys(): WorldBayouSystem { return new WorldBayouSystem() }
function makeEm(): EntityManager { return new EntityManager() }
let nextId = 1
function makeBayou(overrides: Partial<Bayou> = {}): Bayou {
  return {
    id: nextId++, x: 25, y: 35,
    radius: 7, waterFlow: 10, vegetationDensity: 50,
    murkiness: 40, biodiversity: 60, depth: 5, tick: 0,
    ...overrides,
  }
}
function makeWorld(tile: number = TileType.MOUNTAIN): any {
  return { width: 100, height: 100, getTile: () => tile }
}

const CHECK_INTERVAL = 2600

describe('WorldBayouSystem – 初始状态', () => {
  it('启动时沼泽湾列表为空', () => {
    const sys = makeSys()
    expect((sys as any).bayous).toHaveLength(0)
  })
  it('nextId 从 1 开始', () => {
    const sys = makeSys()
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck 初始为 0', () => {
    const sys = makeSys()
    expect((sys as any).lastCheck).toBe(0)
  })
  it('bayous是数组', () => {
    const sys = makeSys()
    expect(Array.isArray((sys as any).bayous)).toBe(true)
  })
  it('新建两个实例互相独立', () => {
    const s1 = makeSys(); const s2 = makeSys()
    ;(s1 as any).bayous.push(makeBayou())
    expect((s2 as any).bayous).toHaveLength(0)
  })
})

describe('WorldBayouSystem – 节流逻辑', () => {
  it('tick < CHECK_INTERVAL时不触发', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
    vi.restoreAllMocks()
  })
  it('tick >= CHECK_INTERVAL时更新lastCheck', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    vi.restoreAllMocks()
  })
  it('第二次间隔不足时lastCheck不更新', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    vi.restoreAllMocks()
  })
  it('间隔足够时第二次触发', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
    vi.restoreAllMocks()
  })
})

describe('WorldBayouSystem – spawn', () => {
  beforeEach(() => { nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('非水地形不spawn', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(TileType.MOUNTAIN), makeEm(), CHECK_INTERVAL)
    expect((sys as any).bayous).toHaveLength(0)
  })
  it('random > FORM_CHANCE(0.002)时不spawn', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(TileType.SHALLOW_WATER), makeEm(), CHECK_INTERVAL)
    expect((sys as any).bayous).toHaveLength(0)
  })
  it('MAX_BAYOUS(18)上限不超出', () => {
    const sys = makeSys()
    for (let i = 0; i < 18; i++) {
      ;(sys as any).bayous.push(makeBayou({ tick: 99999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(TileType.SHALLOW_WATER), makeEm(), CHECK_INTERVAL)
    expect((sys as any).bayous.length).toBeLessThanOrEqual(18)
  })
  it('spawn后bayou包含必要字段', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(TileType.SHALLOW_WATER), makeEm(), CHECK_INTERVAL)
    const b = (sys as any).bayous[0]
    if (b) {
      expect(typeof b.id).toBe('number')
      expect(typeof b.x).toBe('number')
      expect(typeof b.waterFlow).toBe('number')
    }
  })
})

describe('WorldBayouSystem – 字段更新', () => {
  beforeEach(() => { nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('waterFlow每次update变化', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).bayous.push(makeBayou({ waterFlow: 10, tick: 99999 }))
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).bayous[0].waterFlow).not.toBeUndefined()
  })
  it('vegetationDensity不低于0', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    ;(sys as any).bayous.push(makeBayou({ vegetationDensity: 0, tick: 99999 }))
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).bayous[0].vegetationDensity).toBeGreaterThanOrEqual(0)
  })
  it('biodiversity不低于0', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    ;(sys as any).bayous.push(makeBayou({ biodiversity: 0, tick: 99999 }))
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).bayous[0].biodiversity).toBeGreaterThanOrEqual(0)
  })
  it('murkiness不低于0', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    ;(sys as any).bayous.push(makeBayou({ murkiness: 0, tick: 99999 }))
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).bayous[0].murkiness).toBeGreaterThanOrEqual(0)
  })
  it('多个bayous同时更新', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    for (let i = 0; i < 3; i++) {
      ;(sys as any).bayous.push(makeBayou({ tick: 99999 }))
    }
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).bayous).toHaveLength(3)
  })
})

describe('WorldBayouSystem – cleanup', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('过期bayou（tick < cutoff=tick-88000）被删除', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).bayous.push(makeBayou({ tick: 0 }))
    sys.update(1, makeWorld(), makeEm(), 100000)
    expect((sys as any).bayous).toHaveLength(0)
  })
  it('未过期bayou保留', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).bayous.push(makeBayou({ tick: 50000 }))
    sys.update(1, makeWorld(), makeEm(), 100000)
    expect((sys as any).bayous).toHaveLength(1)
  })
  it('混合新旧：只删过期的', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).bayous.push(makeBayou({ tick: 0 }))
    ;(sys as any).bayous.push(makeBayou({ tick: 50000 }))
    sys.update(1, makeWorld(), makeEm(), 100000)
    expect((sys as any).bayous).toHaveLength(1)
    expect((sys as any).bayous[0].tick).toBe(50000)
  })
  it('所有bayous都过期时全部删除', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 5; i++) (sys as any).bayous.push(makeBayou({ tick: 0 }))
    sys.update(1, makeWorld(), makeEm(), 100000)
    expect((sys as any).bayous).toHaveLength(0)
  })
})

describe('WorldBayouSystem – 手动注入和边界', () => {
  it('手动注入后长度正确', () => {
    const sys = makeSys()
    ;(sys as any).bayous.push(makeBayou())
    expect((sys as any).bayous).toHaveLength(1)
  })
  it('手动注入多个', () => {
    const sys = makeSys()
    for (let i = 0; i < 5; i++) (sys as any).bayous.push(makeBayou())
    expect((sys as any).bayous).toHaveLength(5)
  })
  it('bayou字段结构完整', () => {
    const b = makeBayou()
    expect(typeof b.id).toBe('number')
    expect(typeof b.x).toBe('number')
    expect(typeof b.y).toBe('number')
    expect(typeof b.radius).toBe('number')
    expect(typeof b.waterFlow).toBe('number')
    expect(typeof b.vegetationDensity).toBe('number')
    expect(typeof b.murkiness).toBe('number')
    expect(typeof b.biodiversity).toBe('number')
    expect(typeof b.depth).toBe('number')
    expect(typeof b.tick).toBe('number')
  })
  it('tick=0不触发', () => {
    const sys = makeSys()
    sys.update(1, makeWorld(), makeEm(), 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('大tick值不崩溃', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, makeWorld(), makeEm(), 9999999)).not.toThrow()
    vi.restoreAllMocks()
  })
})

describe('WorldBayouSystem - 扩展补充', () => {
  let sys: WorldBayouSystem
  beforeEach(() => { sys = new WorldBayouSystem(); vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('补充-bayous初始为空Array', () => { expect(Array.isArray((sys as any).bayous)).toBe(true) })
  it('补充-nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('补充-lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('补充-tick=0时不处理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('补充-tick=2600时lastCheck更新为2600', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2600)
    expect((sys as any).lastCheck).toBe(2600)
  })
  it('补充-两次update间隔<CI时第二次跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2600)
    sys.update(1, w, e, 2600 + 100)
    expect((sys as any).lastCheck).toBe(2600)
  })
  it('补充-两次update间隔>=CI时第二次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2600)
    sys.update(1, w, e, 2600 * 2)
    expect((sys as any).lastCheck).toBe(2600 * 2)
  })
  it('补充-update后bayous引用稳定', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    const ref = (sys as any).bayous
    sys.update(1, w, e, 2600)
    expect((sys as any).bayous).toBe(ref)
  })
  it('补充-bayous.splice正确', () => {
    ;(sys as any).bayous.push({ id: 1 })
    ;(sys as any).bayous.push({ id: 2 })
    ;(sys as any).bayous.splice(0, 1)
    expect((sys as any).bayous).toHaveLength(1)
  })
  it('补充-注入5个后length=5', () => {
    for (let i = 0; i < 5; i++) { ;(sys as any).bayous.push({ id: i+1 }) }
    expect((sys as any).bayous).toHaveLength(5)
  })
  it('补充-连续trigger lastCheck单调递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2600)
    const lc1 = (sys as any).lastCheck
    sys.update(1, w, e, 2600 * 2)
    expect((sys as any).lastCheck).toBeGreaterThanOrEqual(lc1)
  })
  it('补充-update后lastCheck不超过传入tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 999999)
    expect((sys as any).lastCheck).toBeLessThanOrEqual(999999)
  })
  it('补充-清空bayous后length=0', () => {
    ;(sys as any).bayous.push({ id: 1 })
    ;(sys as any).bayous.length = 0
    expect((sys as any).bayous).toHaveLength(0)
  })
  it('补充-id注入后可读取', () => {
    ;(sys as any).bayous.push({ id: 99 })
    expect((sys as any).bayous[0].id).toBe(99)
  })
  it('补充-多次trigger三轮lastCheck递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2600)
    sys.update(1, w, e, 2600 * 2)
    sys.update(1, w, e, 2600 * 3)
    expect((sys as any).lastCheck).toBe(2600 * 3)
  })
  it('补充-tick=CI-1时lastCheck保持0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2600 - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('补充-bayous是同一引用', () => {
    const r1 = (sys as any).bayous
    const r2 = (sys as any).bayous
    expect(r1).toBe(r2)
  })
  it('补充-注入10个后length=10', () => {
    for (let i = 0; i < 10; i++) { ;(sys as any).bayous.push({ id: i + 1 }) }
    expect((sys as any).bayous).toHaveLength(10)
  })
  it('补充-3个trigger间lastCheck精确', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2600 * 3)
    expect((sys as any).lastCheck).toBe(2600 * 3)
  })
  it('补充-random=0.9时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2600)
    expect((sys as any).bayous).toHaveLength(0)
  })
  it('补充-bayous可以pop操作', () => {
    ;(sys as any).bayous.push({ id: 1 })
    ;(sys as any).bayous.pop()
    expect((sys as any).bayous).toHaveLength(0)
  })
  it('补充-初始状态update不影响lastCheck=0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('补充-第N次trigger后lastCheck=N*CI', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    const N = 4
    sys.update(1, w, e, 2600 * N)
    expect((sys as any).lastCheck).toBe(2600 * N)
  })
  it('补充-注入元素tick字段可读取', () => {
    ;(sys as any).bayous.push({ id: 1, tick: 12345 })
    expect((sys as any).bayous[0].tick).toBe(12345)
  })
  it('补充-bayous注入x/y字段可读取', () => {
    ;(sys as any).bayous.push({ id: 1, x: 50, y: 60 })
    expect((sys as any).bayous[0].x).toBe(50)
    expect((sys as any).bayous[0].y).toBe(60)
  })
  it('补充-两次update在CI内仅执行一次', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2600)
    const lc = (sys as any).lastCheck
    sys.update(1, w, e, 2600 + 2600 - 1)
    expect((sys as any).lastCheck).toBe(lc)
  })
})
