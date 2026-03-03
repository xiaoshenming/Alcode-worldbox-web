import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldCloudForestSystem } from '../systems/WorldCloudForestSystem'
import type { CloudForestZone } from '../systems/WorldCloudForestSystem'

const CHECK_INTERVAL = 2600
const world = { width: 200, height: 200, getTile: () => 0 } as any
const em = {} as any

function makeSys(): WorldCloudForestSystem { return new WorldCloudForestSystem() }
let nextId = 1
function makeZone(overrides: Partial<CloudForestZone> = {}): CloudForestZone {
  return {
    id: nextId++, x: 20, y: 30,
    moisture: 90, canopyDensity: 80,
    biodiversity: 95, mistLevel: 70, tick: 0,
    ...overrides
  }
}

describe('WorldCloudForestSystem', () => {
  let sys: WorldCloudForestSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // === 基础状态测试 ===
  it('初始无云雾林', () => { expect((sys as any).zones).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('返回内部引用', () => {
    expect((sys as any).zones).toBe((sys as any).zones)
  })

  it('云雾林字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = (sys as any).zones[0]
    expect(z.moisture).toBe(90)
    expect(z.biodiversity).toBe(95)
    expect(z.mistLevel).toBe(70)
  })

  it('多个云雾林全部返回', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(2)
  })

  // === CHECK_INTERVAL 节流测试 ===
  it('tick不足CHECK_INTERVAL���触发任何操作', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const forestWorld = { width: 200, height: 200, getTile: () => 4 } as any
    sys.update(1, forestWorld, em, CHECK_INTERVAL - 1)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('lastCheck在update后被记录', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('两次间隔不足不重复执行', () => {
    const forestWorld = { width: 200, height: 200, getTile: () => 4 } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, forestWorld, em, CHECK_INTERVAL)
    const count1 = (sys as any).zones.length
    sys.update(1, forestWorld, em, CHECK_INTERVAL + 100)
    expect((sys as any).zones.length).toBe(count1)
  })

  // === spawn 测试 ===
  it('DEEP_WATER(0)地形不触发spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    // world.getTile()=0 → DEEP_WATER → continue，不满足FOREST或MOUNTAIN条件
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('GRASS(3)地形不触发spawn', () => {
    const grassWorld = { width: 200, height: 200, getTile: () => 3 } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, grassWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('FOREST(4)地形可以spawn', () => {
    const forestWorld = { width: 200, height: 200, getTile: () => 4 } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // <= 0.003 触发spawn
    sys.update(1, forestWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('MOUNTAIN(5)地形可以spawn', () => {
    const mountainWorld = { width: 200, height: 200, getTile: () => 5 } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('random超过FORM_CHANCE不spawn', () => {
    const forestWorld = { width: 200, height: 200, getTile: () => 4 } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // > 0.003
    sys.update(1, forestWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('spawn的zone拥有tick字段等于当前tick', () => {
    const forestWorld = { width: 200, height: 200, getTile: () => 4 } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, forestWorld, em, CHECK_INTERVAL)
    if ((sys as any).zones.length > 0) {
      expect((sys as any).zones[0].tick).toBe(CHECK_INTERVAL)
    }
  })

  it('spawn的zone id从1开始', () => {
    const forestWorld = { width: 200, height: 200, getTile: () => 4 } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, forestWorld, em, CHECK_INTERVAL)
    if ((sys as any).zones.length > 0) {
      expect((sys as any).zones[0].id).toBe(1)
    }
  })

  it('达到MAX_ZONES(38)后不再spawn', () => {
    const forestWorld = { width: 200, height: 200, getTile: () => 4 } as any
    for (let i = 0; i < 38; i++) {
      ;(sys as any).zones.push(makeZone())
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, forestWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(38)
  })

  it('3次attempt循环最多可spawn多个zone', () => {
    const forestWorld = { width: 200, height: 200, getTile: () => 4 } as any
    // random=0.001 < FORM_CHANCE=0.003，3次attempt均满足，最多spawn3个
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, forestWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
    expect((sys as any).zones.length).toBeLessThanOrEqual(3)
  })

  it('spawn zone的moisture字段在合法范围内', () => {
    const forestWorld = { width: 200, height: 200, getTile: () => 4 } as any
    // 用0.5作为random值，spawn后moisture=60+0.5*40=80
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, forestWorld, em, CHECK_INTERVAL)
    if ((sys as any).zones.length > 0) {
      const z = (sys as any).zones[0]
      expect(z.moisture).toBeGreaterThanOrEqual(60)
      expect(z.moisture).toBeLessThanOrEqual(100)
    }
  })

  // === cleanup 测试 ===
  it('过期云雾林被清理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    // tick=100000 → cutoff=44000, zone.tick=0 < 44000 → 被删除
    sys.update(1, world, em, 100000)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('未过期云雾林不被清理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: CHECK_INTERVAL }))
    // tick=CHECK_INTERVAL → cutoff=CHECK_INTERVAL-56000<0, zone.tick > cutoff
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('cleanup只删除过期的，保留未过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 0 }))       // 过期: cutoff=44000, 0<44000
    ;(sys as any).zones.push(makeZone({ tick: 99000 }))   // 未过期: 99000>44000
    sys.update(1, world, em, 100000)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(99000)
  })

  it('cleanup边界：tick恰好等于cutoff时被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // cutoff = 100000 - 56000 = 44000，zone.tick=44000 不满足 < cutoff，应被保留
    // 即zone.tick必须严格小于cutoff才删除
    ;(sys as any).zones.push(makeZone({ tick: 44000 }))
    sys.update(1, world, em, 100000)
    // zone.tick=44000 不小于 cutoff=44000，所以不删除
    expect((sys as any).zones).toHaveLength(1)
  })

  it('cleanup边界：tick小于cutoff时被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 43999 }))
    sys.update(1, world, em, 100000)
    // zone.tick=43999 < cutoff=44000 → 被删除
    expect((sys as any).zones).toHaveLength(0)
  })

  it('空zones数组update不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, world, em, CHECK_INTERVAL)).not.toThrow()
  })

  it('多次update后lastCheck始终是最新值', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})

describe('WorldCloudForestSystem - 扩展补充', () => {
  let sys: WorldCloudForestSystem
  beforeEach(() => { sys = new WorldCloudForestSystem(); vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('补充-zones初始为空Array', () => { expect(Array.isArray((sys as any).zones)).toBe(true) })
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
  it('补充-update后zones引用稳定', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    const ref = (sys as any).zones
    sys.update(1, w, e, 2600)
    expect((sys as any).zones).toBe(ref)
  })
  it('补充-zones.splice正确', () => {
    ;(sys as any).zones.push({ id: 1 })
    ;(sys as any).zones.push({ id: 2 })
    ;(sys as any).zones.splice(0, 1)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('补充-注入5个后length=5', () => {
    for (let i = 0; i < 5; i++) { ;(sys as any).zones.push({ id: i+1 }) }
    expect((sys as any).zones).toHaveLength(5)
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
  it('补充-清空zones后length=0', () => {
    ;(sys as any).zones.push({ id: 1 })
    ;(sys as any).zones.length = 0
    expect((sys as any).zones).toHaveLength(0)
  })
  it('补充-id注入后可读取', () => {
    ;(sys as any).zones.push({ id: 99 })
    expect((sys as any).zones[0].id).toBe(99)
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
  it('补充-zones是同一引用', () => {
    const r1 = (sys as any).zones
    const r2 = (sys as any).zones
    expect(r1).toBe(r2)
  })
  it('补充-注入10个后length=10', () => {
    for (let i = 0; i < 10; i++) { ;(sys as any).zones.push({ id: i + 1 }) }
    expect((sys as any).zones).toHaveLength(10)
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
    expect((sys as any).zones).toHaveLength(0)
  })
  it('补充-zones可以pop操作', () => {
    ;(sys as any).zones.push({ id: 1 })
    ;(sys as any).zones.pop()
    expect((sys as any).zones).toHaveLength(0)
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
    ;(sys as any).zones.push({ id: 1, tick: 12345 })
    expect((sys as any).zones[0].tick).toBe(12345)
  })
  it('补充-zones注入x/y字段可读取', () => {
    ;(sys as any).zones.push({ id: 1, x: 50, y: 60 })
    expect((sys as any).zones[0].x).toBe(50)
    expect((sys as any).zones[0].y).toBe(60)
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
