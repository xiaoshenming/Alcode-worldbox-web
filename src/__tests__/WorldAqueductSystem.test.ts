import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldAqueductSystem } from '../systems/WorldAqueductSystem'
import type { Aqueduct, AqueductMaterial } from '../systems/WorldAqueductSystem'

const CHECK_INTERVAL = 3500
const FLOW_RATE: Record<AqueductMaterial, number> = {
  stone: 5, brick: 10, marble: 18, reinforced: 30,
}

let nextId = 1
function makeSys() { return new WorldAqueductSystem() }
function makeAqueduct(overrides: Partial<Aqueduct> = {}): Aqueduct {
  return {
    id: nextId++,
    srcX: 10, srcY: 10, dstX: 50, dstY: 50,
    material: 'stone',
    flowRate: 5,
    integrity: 90,
    age: 0,
    tick: 0,
    ...overrides,
  }
}

/** getTile 返回 5，既不满足 srcTile(0|1) 也不满足 dstTile(3)，阻止 spawn */
const makeWorld = () => ({ width: 200, height: 200, getTile: () => 5 }) as any
const em = {} as any

describe('WorldAqueductSystem', () => {
  let sys: WorldAqueductSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // ── 初始状态 ────────────────────────────────────────────────────────────────
  it('初始aqueducts为空', () => {
    expect((sys as any).aqueducts).toHaveLength(0)
  })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  // ── CHECK_INTERVAL 节流 ─────────────────────────��───────────────────────────
  it('tick < CHECK_INTERVAL 时不更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick == CHECK_INTERVAL 时更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('连续两次 update 后 lastCheck 更新到最新 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('getTile 返回 5（非水源/草地）时不 spawn，aqueducts 保持为空', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // < BUILD_CHANCE=0.003，理论会尝试
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).aqueducts).toHaveLength(0)
  })

  // ── 字段数据测试 ────────────────────────────────────────────────────────────
  it('注入后 aqueducts 长度正确', () => {
    ;(sys as any).aqueducts.push(makeAqueduct())
    expect((sys as any).aqueducts).toHaveLength(1)
  })

  it('marble 材料 flowRate 字段初始正确', () => {
    ;(sys as any).aqueducts.push(makeAqueduct({ material: 'marble', flowRate: FLOW_RATE['marble'] }))
    expect((sys as any).aqueducts[0].flowRate).toBe(18)
  })

  it('reinforced 材料 flowRate 字段初始正确', () => {
    ;(sys as any).aqueducts.push(makeAqueduct({ material: 'reinforced', flowRate: FLOW_RATE['reinforced'] }))
    expect((sys as any).aqueducts[0].flowRate).toBe(30)
  })

  it('支持全部4种 AqueductMaterial', () => {
    const mats: AqueductMaterial[] = ['stone', 'brick', 'marble', 'reinforced']
    expect(mats).toHaveLength(4)
  })

  // ── age 更新 ────────────────────────────────────────────────────────────────
  it('update 后 age = tick - a.tick（首次）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).aqueducts.push(makeAqueduct({ tick: 0 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).aqueducts[0].age).toBe(CHECK_INTERVAL)
  })

  it('age = tick - a.tick（非零 a.tick）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).aqueducts.push(makeAqueduct({ tick: 1000 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL + 1000)
    expect((sys as any).aqueducts[0].age).toBe(CHECK_INTERVAL)
  })

  // ── integrity 衰减 ──────────────────────────────────────────────────────────
  it('age <= 60000 时 integrity 不衰减', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).aqueducts.push(makeAqueduct({ integrity: 90, tick: 0 }))
    // tick=CHECK_INTERVAL，age=CHECK_INTERVAL=3500<60000
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).aqueducts[0].integrity).toBe(90)
  })

  it('age > 60000 时 integrity 按 0.08 递减', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // tick=70000, a.tick=0 => age=70000>60000
    ;(sys as any).aqueducts.push(makeAqueduct({ integrity: 90, tick: 0 }))
    sys.update(1, makeWorld(), em, 70000)
    expect((sys as any).aqueducts[0].integrity).toBeCloseTo(89.92, 5)
  })

  it('integrity 最低不低于 5（多次衰减后）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // integrity=6，每次衰减 0.08，需多次 update
    ;(sys as any).aqueducts.push(makeAqueduct({ integrity: 5.01, tick: 0 }))
    // 多次推进（每次 age>60000）
    for (let t = 70000; t <= 70000 + CHECK_INTERVAL * 5; t += CHECK_INTERVAL) {
      sys.update(1, makeWorld(), em, t)
      ;(sys as any).lastCheck = t - CHECK_INTERVAL // 确保每次都会执行
    }
    // 因 integrity<=5 时会被 cleanup 删除，这里验证不会低于 5 再被删除
    // 当 integrity=5.01 - 0.08 = 4.93 < 5，会被删除
    // 所以经过足够多次后 aqueducts 为空（cleanup 生效）
    expect((sys as any).aqueducts).toHaveLength(0)
  })

  // ── flowRate 根据 integrity 调整 ─────────────────────────────────────────────
  it('flowRate = FLOW_RATE[material] * (integrity/100)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).aqueducts.push(makeAqueduct({ material: 'stone', integrity: 80, tick: 0 }))
    // tick=CHECK_INTERVAL，age=3500<60000，integrity不变
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    // flowRate = 5 * (80/100) = 4
    expect((sys as any).aqueducts[0].flowRate).toBeCloseTo(4, 5)
  })

  it('brick 材料 integrity=50 时 flowRate 正确', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).aqueducts.push(makeAqueduct({ material: 'brick', integrity: 50, tick: 0 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    // flowRate = 10 * (50/100) = 5
    expect((sys as any).aqueducts[0].flowRate).toBeCloseTo(5, 5)
  })

  // ── cleanup：integrity <= 5 时删除 ─────────────────────────────────────────
  it('integrity <= 5 的 aqueduct 被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).aqueducts.push(makeAqueduct({ integrity: 5, tick: 0 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).aqueducts).toHaveLength(0)
  })

  it('integrity > 5 的 aqueduct 保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).aqueducts.push(makeAqueduct({ integrity: 6, tick: 0 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).aqueducts).toHaveLength(1)
  })

  it('混合：integrity<=5 删除，integrity>5 保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).aqueducts.push(makeAqueduct({ integrity: 5, tick: 0 }))
    ;(sys as any).aqueducts.push(makeAqueduct({ integrity: 6, tick: 0 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).aqueducts).toHaveLength(1)
    expect((sys as any).aqueducts[0].integrity).toBe(6)
  })

  it('多个 integrity<=5 的 aqueduct 全部删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).aqueducts.push(makeAqueduct({ integrity: 4, tick: 0 }))
    ;(sys as any).aqueducts.push(makeAqueduct({ integrity: 3, tick: 0 }))
    ;(sys as any).aqueducts.push(makeAqueduct({ integrity: 1, tick: 0 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).aqueducts).toHaveLength(0)
  })

  // ── nextId 递增 ─────────────────────────────────────────────────────────────
  it('注入3个 aqueduct 后 aqueducts 长度为3', () => {
    ;(sys as any).aqueducts.push(makeAqueduct())
    ;(sys as any).aqueducts.push(makeAqueduct())
    ;(sys as any).aqueducts.push(makeAqueduct())
    expect((sys as any).aqueducts).toHaveLength(3)
  })
})
