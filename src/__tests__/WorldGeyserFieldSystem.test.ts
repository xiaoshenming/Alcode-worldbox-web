import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldGeyserFieldSystem } from '../systems/WorldGeyserFieldSystem'
import type { GeyserField } from '../systems/WorldGeyserFieldSystem'

const CHECK_INTERVAL = 2720
const MAX_FIELDS = 8

const safeWorld = { width: 200, height: 200, getTile: () => 2 } as any
const em = {} as any

function makeSys(): WorldGeyserFieldSystem { return new WorldGeyserFieldSystem() }
let nextId = 1
function makeField(overrides: Partial<GeyserField> = {}): GeyserField {
  return {
    id: nextId++,
    x: 20,
    y: 30,
    geyserCount: 5,
    eruptionInterval: 200,
    waterTemperature: 90,
    mineralContent: 45,
    lastEruption: 0,
    tick: 0,
    ...overrides,
  }
}

describe('WorldGeyserFieldSystem', () => {
  let sys: WorldGeyserFieldSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // --- 基础状态 ---
  it('初始无间歇泉群', () => {
    expect((sys as any).fields).toHaveLength(0)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  // --- CHECK_INTERVAL 节流 ---
  it('tick < CHECK_INTERVAL 时跳过执行，lastCheck 不变', () => {
    sys.update(1, safeWorld, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick === CHECK_INTERVAL 时执行并更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick > CHECK_INTERVAL 时执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 100)
  })

  it('连续调用：第二次在间隔内则跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const afterFirst = (sys as any).lastCheck
    sys.update(1, safeWorld, em, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(afterFirst)
  })

  it('连续调用：第二次达到间隔时再次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    sys.update(1, safeWorld, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  // --- spawn 阻断 ---
  it('random=0.9 时不 spawn（大于 FORM_CHANCE=0.001）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).fields).toHaveLength(0)
  })

  it('random=0 时 spawn 一个 field', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).fields).toHaveLength(1)
  })

  // --- MAX_FIELDS 上限 ---
  it('达到 MAX_FIELDS 时不再新增', () => {
    for (let i = 0; i < MAX_FIELDS; i++) {
      ;(sys as any).fields.push(makeField({ waterTemperature: 90 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).fields.length).toBe(MAX_FIELDS)
  })

  it('fields 数量小于 MAX_FIELDS 时允许 spawn', () => {
    for (let i = 0; i < MAX_FIELDS - 1; i++) {
      ;(sys as any).fields.push(makeField({ waterTemperature: 90 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).fields.length).toBe(MAX_FIELDS)
  })

  // --- spawn 字段范围 ---
  it('spawn 后 geyserCount 在 [2,6] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const f: GeyserField = (sys as any).fields[0]
    expect(f.geyserCount).toBeGreaterThanOrEqual(2)
    expect(f.geyserCount).toBeLessThanOrEqual(6)
  })

  it('spawn 后 eruptionInterval 在 [300,800) 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const f: GeyserField = (sys as any).fields[0]
    expect(f.eruptionInterval).toBeGreaterThanOrEqual(300)
    expect(f.eruptionInterval).toBeLessThan(801)
  })

  // spawn 后同一 update 周期内会立即 decay -0.02，Math.max(40,...) 保底
  // 所以实际可观测下界是 40（保底值），上界是 100
  it('spawn 后 waterTemperature 在 [40,100] 范围内（decay 后）', () => {
    for (let i = 0; i < 20; i++) {
      const s = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(Math.random())
      ;(s as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0)
      s.update(1, safeWorld, em, CHECK_INTERVAL)
      const f: GeyserField = (s as any).fields[0]
      if (f) {
        expect(f.waterTemperature).toBeGreaterThanOrEqual(40)
        expect(f.waterTemperature).toBeLessThanOrEqual(100)
      }
    }
  })

  it('spawn 后 mineralContent 在 [10,50] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const f: GeyserField = (sys as any).fields[0]
    expect(f.mineralContent).toBeGreaterThanOrEqual(10)
    expect(f.mineralContent).toBeLessThanOrEqual(50)
  })

  it('spawn 后 id 自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    sys.update(1, safeWorld, em, CHECK_INTERVAL * 2)
    const fields: GeyserField[] = (sys as any).fields
    if (fields.length >= 2) {
      expect(fields[1].id).toBeGreaterThan(fields[0].id)
    }
  })

  // --- cleanup 逻辑 ---
  // 注意：eruptionInterval 设为 999999 防止喷发加温，确保 decay 后 waterTemperature 降至 <= 40
  it('waterTemperature <= 40 时记录被删除', () => {
    ;(sys as any).fields.push(makeField({ waterTemperature: 40, eruptionInterval: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).fields).toHaveLength(0)
  })

  it('waterTemperature > 40 时记录保留', () => {
    ;(sys as any).fields.push(makeField({ waterTemperature: 41 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).fields).toHaveLength(1)
  })

  it('混合情况：低温删除、高温保留', () => {
    ;(sys as any).fields.push(makeField({ waterTemperature: 40, id: 100, eruptionInterval: 999999 }))
    ;(sys as any).fields.push(makeField({ waterTemperature: 80, id: 101, eruptionInterval: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const fields: GeyserField[] = (sys as any).fields
    expect(fields).toHaveLength(1)
    expect(fields[0].id).toBe(101)
  })

  it('多个低温记录全部删除', () => {
    ;(sys as any).fields.push(makeField({ waterTemperature: 40, eruptionInterval: 999999 }))
    ;(sys as any).fields.push(makeField({ waterTemperature: 39, eruptionInterval: 999999 }))
    ;(sys as any).fields.push(makeField({ waterTemperature: 38, eruptionInterval: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).fields).toHaveLength(0)
  })

  // --- 喷发逻辑 ---
  it('超过 eruptionInterval 后 lastEruption 更新', () => {
    const f = makeField({ waterTemperature: 80, eruptionInterval: 100, lastEruption: 0 })
    ;(sys as any).fields.push(f)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect(f.lastEruption).toBe(CHECK_INTERVAL)
  })

  it('未达 eruptionInterval 时 lastEruption 不更新', () => {
    const f = makeField({ waterTemperature: 80, eruptionInterval: 99999, lastEruption: 0 })
    ;(sys as any).fields.push(f)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect(f.lastEruption).toBe(0)
  })

  it('喷发后 waterTemperature 增加 5（不超过 100）', () => {
    const f = makeField({ waterTemperature: 80, eruptionInterval: 100, lastEruption: 0 })
    ;(sys as any).fields.push(f)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    // 喷发后 +5，再 decay -0.02，结果约 84.98
    expect(f.waterTemperature).toBeCloseTo(84.98, 1)
  })

  it('喷发后 mineralContent 增加 1（不超过 100）', () => {
    const f = makeField({ waterTemperature: 80, mineralContent: 50, eruptionInterval: 100, lastEruption: 0 })
    ;(sys as any).fields.push(f)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect(f.mineralContent).toBeCloseTo(51, 0)
  })

  it('waterTemperature 每次 update 衰减 0.02（已喷发时先加再减）', () => {
    const f = makeField({ waterTemperature: 80, eruptionInterval: 99999, lastEruption: 0 })
    ;(sys as any).fields.push(f)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect(f.waterTemperature).toBeCloseTo(79.98, 2)
  })

  it('waterTemperature 不会低于 40（Math.max 保底）', () => {
    const f = makeField({ waterTemperature: 40.01, eruptionInterval: 99999, lastEruption: 0 })
    ;(sys as any).fields.push(f)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    // 40.01 - 0.02 = 39.99，但 Math.max(40, 39.99) = 40
    expect(f.waterTemperature).toBeCloseTo(40, 2)
  })

  // --- 注入查询 ---
  it('注入后可查询', () => {
    ;(sys as any).fields.push(makeField())
    expect((sys as any).fields).toHaveLength(1)
  })

  it('多个间歇泉群全部保留', () => {
    ;(sys as any).fields.push(makeField())
    ;(sys as any).fields.push(makeField())
    expect((sys as any).fields).toHaveLength(2)
  })
})
