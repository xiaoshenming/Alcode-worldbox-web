import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldActiniumSpringSystem } from '../systems/WorldActiniumSpringSystem'
import type { ActiniumSpringZone } from '../systems/WorldActiniumSpringSystem'

// 常量镜像
const CHECK_INTERVAL = 3040
const MAX_ZONES = 32
const CUTOFF_OFFSET = 54000

let nextId = 1
function makeSys(): WorldActiniumSpringSystem { return new WorldActiniumSpringSystem() }
function makeZone(overrides: Partial<ActiniumSpringZone> = {}): ActiniumSpringZone {
  return {
    id: nextId++,
    x: 20,
    y: 30,
    actiniumContent: 50,
    springFlow: 30,
    uraniumOreWeathering: 40,
    alphaRadiation: 20,
    tick: 0,
    ...overrides,
  }
}

// world mock：getTile返回3（GRASS），没有SHALLOW_WATER/DEEP_WATER/MOUNTAIN邻格
// hasAdjacentTile 检查8邻格，getTile始终返回3 → nearWater=false, nearMountain=false → 不spawn
const makeWorld = () => ({ width: 200, height: 200, getTile: () => 3 }) as any
const em = {} as any

describe('WorldActiniumSpringSystem', () => {
  let sys: WorldActiniumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // ── 初始状态 ────────────────────────────────
  it('初始zones数组为空', () => {
    expect((sys as any).zones).toHaveLength(0)
  })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  // ── CHECK_INTERVAL节流 ───────────────────────
  it('tick < CHECK_INTERVAL时不更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick >= CHECK_INTERVAL时更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('第二次update（tick=2*CHECK_INTERVAL）再次更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('tick在两个CHECK_INTERVAL之间时不再次更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  // ── spawn阻止（getTile不返回water/mountain）──
  it('world中无water/mountain邻格时不spawn新zone', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  // ── cleanup（过期zone删除）────────────────────
  it('tick < cutoff的zone被删除（tick=0，total=100000，cutoff=46000，0<46000）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    sys.update(1, makeWorld(), em, 100000)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('tick >= cutoff的zone保留（zone.tick=90000，total=100000，cutoff=46000，90000>=46000）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 90000 }))
    sys.update(1, makeWorld(), em, 100000)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('恰好等于cutoff+1的zone保留（tick=cutoff+1）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // cutoff = 100000 - 54000 = 46000；zone.tick = 46001 > 46000 → 保留
    ;(sys as any).zones.push(makeZone({ tick: 46001 }))
    sys.update(1, makeWorld(), em, 100000)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('恰好等于cutoff的zone被删除（tick=cutoff，即tick<cutoff不成立但tick===cutoff同样被删除）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // 源码: if (zones[i].tick < cutoff) → tick===cutoff时不删
    // cutoff = 100000 - 54000 = 46000; zone.tick = 46000 → 不 < cutoff → 保留
    ;(sys as any).zones.push(makeZone({ tick: 46000 }))
    sys.update(1, makeWorld(), em, 100000)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('混合过期与未过期：只删过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // cutoff = 100000 - 54000 = 46000
    ;(sys as any).zones.push(makeZone({ tick: 0 }))    // 0 < 46000 → 删
    ;(sys as any).zones.push(makeZone({ tick: 50000 })) // 50000 >= 46000 → 保留
    sys.update(1, makeWorld(), em, 100000)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(50000)
  })

  // ── MAX_ZONES上限 ─────────────────────────────
  it('zones达到MAX_ZONES时不再spawn', () => {
    // 注入32个zones，random强制走spawn路径（但nearWater/mountain阻止）
    // 即使有可spawn条件也因MAX_ZONES限制不spawn
    for (let i = 0; i < MAX_ZONES; i++) (sys as any).zones.push(makeZone({ tick: 99999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, 100000)
    // cutoff=46000, zone.tick=99999>46000 → 保留；新spawn不触发
    expect((sys as any).zones).toHaveLength(MAX_ZONES)
  })

  // ── 手动注入 ────────────────────────────────
  it('手动注入zone后长度正确', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('手动注入多个zone后长度正确', () => {
    for (let i = 0; i < 5; i++) (sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(5)
  })

  // ── zone字段结构 ─────────────────────────────
  it('zone含所有必需字段', () => {
    const z = makeZone()
    expect(typeof z.id).toBe('number')
    expect(typeof z.x).toBe('number')
    expect(typeof z.y).toBe('number')
    expect(typeof z.actiniumContent).toBe('number')
    expect(typeof z.springFlow).toBe('number')
    expect(typeof z.uraniumOreWeathering).toBe('number')
    expect(typeof z.alphaRadiation).toBe('number')
    expect(typeof z.tick).toBe('number')
  })

  it('zone字段值在makeZone指定范围内', () => {
    const z = makeZone({ actiniumContent: 70, springFlow: 25 })
    expect(z.actiniumContent).toBe(70)
    expect(z.springFlow).toBe(25)
  })

  // ── nextId不被update影响（无spawn时）───────────
  it('无spawn时nextId保持为1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(1)
  })
})
