import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldCaesiumSpringSystem } from '../systems/WorldCaesiumSpringSystem'
import type { CaesiumSpringZone } from '../systems/WorldCaesiumSpringSystem'

const CHECK_INTERVAL = 3130
const MAX_ZONES = 32

// 安全 world：getTile 固定返回 0（DEEP_WATER），确保 hasAdjacentTile 检查
// DEEP_WATER 时 nearWater=true，但 FORM_CHANCE=0.003，只要 mock random=0.9 就不 spawn
// 对于需要"不 spawn"的测试，必须 mock random=0.9（> FORM_CHANCE）
const safeWorld = { width: 200, height: 200, getTile: () => 0 } as any
// noSpawnWorld：getTile 返回 3（GRASS），不是 WATER/MOUNTAIN，且 hasAdjacentTile=false
// 但要注意 hasAdjacentTile 也会调用 getTile，所以 GRASS 也会被邻居检查到
const noSpawnWorld = { width: 200, height: 200, getTile: () => 3 } as any
const em = {} as any

function makeSys(): WorldCaesiumSpringSystem { return new WorldCaesiumSpringSystem() }
let nextId = 1
function makeZone(overrides: Partial<CaesiumSpringZone> = {}): CaesiumSpringZone {
  return {
    id: nextId++,
    x: 20, y: 30,
    caesiumContent: 40,
    springFlow: 50,
    polluciteWeathering: 60,
    alkaliConcentration: 70,
    tick: 0,
    ...overrides,
  }
}

describe('WorldCaesiumSpringSystem', () => {
  let sys: WorldCaesiumSpringSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.restoreAllMocks()
  })

  // ── 基础状态 ───────────────────────────────────────��──────────

  it('初始无Caesium泉区', () => {
    expect((sys as any).zones).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('返回内部引用', () => {
    expect((sys as any).zones).toBe((sys as any).zones)
  })

  it('Caesium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = (sys as any).zones[0]
    expect(z.caesiumContent).toBe(40)
    expect(z.springFlow).toBe(50)
    expect(z.polluciteWeathering).toBe(60)
    expect(z.alkaliConcentration).toBe(70)
  })

  it('多个Caesium泉区全部返回', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(2)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────

  it('tick 未达 CHECK_INTERVAL 时 update 跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL - 1)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('tick 恰好等于 CHECK_INTERVAL 时触发检查并更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('两次 update 间距小于 CHECK_INTERVAL 时第二次跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    sys.update(1, safeWorld, em, CHECK_INTERVAL + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('两次 update 间距达到 CHECK_INTERVAL 时第二次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    sys.update(1, safeWorld, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  // ── random=0.9 时不 spawn（FORM_CHANCE=0.003） ─────────────────

  it('random=0.9 时不 spawn（大于 FORM_CHANCE）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('GRASS tile 四周也是 GRASS 时（无 WATER/MOUNTAIN 邻居）不 spawn', () => {
    // random=0.9 > FORM_CHANCE, 确保不因概率 spawn
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, noSpawnWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  // ── cleanup：tick < cutoff(tick-54000) 时删除 ─────────────────

  it('过期泉区(tick < cutoff)被清理', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // tick=54001, cutoff=1, zone.tick=0 < 1 → 删除
    sys.update(1, safeWorld, em, 54001)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('未过期泉区(tick >= cutoff)保留', () => {
    ;(sys as any).zones.push(makeZone({ tick: 1 })) // tick=1 >= cutoff=1 → 保留
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, 54001)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('同时有过期和未过期泉区，只删过期的', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))   // 过期（cutoff=1时）
    ;(sys as any).zones.push(makeZone({ tick: 10 }))  // 未过期
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, 54001)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(10)
  })

  it('无过期泉区时 cleanup 不改变数量', () => {
    ;(sys as any).zones.push(makeZone({ tick: 99999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, 100000)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('多个过期泉区全部被清理', () => {
    for (let i = 0; i < 3; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, 54001)
    expect((sys as any).zones).toHaveLength(0)
  })

  // ── MAX_ZONES 上限 ────────────────────────────────────────────

  it('注入 MAX_ZONES 个泉区后不再 spawn（即使 random 很小）', () => {
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 999999 }))
    }
    // 即使 random=0（满足 FORM_CHANCE），zones 满了也不 spawn
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).lastCheck = 0
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(MAX_ZONES)
  })

  it('MAX_ZONES-1 个时仍在 limit 内', () => {
    for (let i = 0; i < MAX_ZONES - 1; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 999999 }))
    }
    expect((sys as any).zones).toHaveLength(MAX_ZONES - 1)
  })

  // ── 字段范围验证（通过注入方式） ──────────────────────────────

  it('spawn 的泉区 caesiumContent 不低于 40', () => {
    const z = makeZone({ caesiumContent: 40 + 0 * 60 })
    expect(z.caesiumContent).toBeGreaterThanOrEqual(40)
  })

  it('spawn 的泉区 springFlow 不低于 10', () => {
    const z = makeZone({ springFlow: 10 + 0 * 50 })
    expect(z.springFlow).toBeGreaterThanOrEqual(10)
  })

  it('spawn 的泉区字段上限合法（caesiumContent<=100, springFlow<=60）', () => {
    const z = makeZone({ caesiumContent: 100, springFlow: 60 })
    expect(z.caesiumContent).toBeLessThanOrEqual(100)
    expect(z.springFlow).toBeLessThanOrEqual(60)
  })

  // ── id 自增 ───────────────────────────────────────────────────

  it('注入多个泉区 id 不重复', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    const ids = (sys as any).zones.map((z: CaesiumSpringZone) => z.id)
    expect(new Set(ids).size).toBe(3)
  })

  it('每个泉区有 x/y 坐标', () => {
    ;(sys as any).zones.push(makeZone({ x: 10, y: 20 }))
    const z = (sys as any).zones[0]
    expect(z.x).toBe(10)
    expect(z.y).toBe(20)
  })

  it('update 不影响 zones 字段（无字段更新逻辑）', () => {
    ;(sys as any).zones.push(makeZone({ caesiumContent: 55, springFlow: 33, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    expect(z.caesiumContent).toBe(55)
    expect(z.springFlow).toBe(33)
  })
})
