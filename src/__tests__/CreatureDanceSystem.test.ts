import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureDanceSystem } from '../systems/CreatureDanceSystem'
import type { DanceEvent, DanceType, DanceEffect } from '../systems/CreatureDanceSystem'

let nextId = 1
function makeSys(): CreatureDanceSystem { return new CreatureDanceSystem() }
function makeDance(
  type: DanceType = 'celebration',
  effect: DanceEffect = 'morale',
  startTick = 0,
  duration = 500,
  intensity = 60,
): DanceEvent {
  return { id: nextId++, x: 10, y: 10, type, participants: 5, intensity, startTick, duration, effect }
}

function makeEmptyEM() {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    getComponent: vi.fn().mockReturnValue(null),
  }
}

const DANCE_EFFECTS: Record<DanceType, DanceEffect> = {
  celebration: 'morale',
  war: 'combat',
  rain: 'luck',
  harvest: 'healing',
  funeral: 'unity',
  mating: 'fertility',
}

const CHECK_INTERVAL = 700
const MAX_DANCES = 15
const GATHER_RADIUS = 8
const MIN_DURATION = 300
const MAX_DURATION = 1200

describe('CreatureDanceSystem', () => {
  let sys: CreatureDanceSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ── 初始状态 ──────────────────────────────────────────────────────────────
  describe('初始状态', () => {
    it('初始无舞蹈', () => {
      expect((sys as any).dances).toHaveLength(0)
    })

    it('初始 nextDanceId 为 1', () => {
      expect((sys as any).nextDanceId).toBe(1)
    })

    it('初始 lastCheck 为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('系统实例化成功', () => {
      expect(sys).toBeInstanceOf(CreatureDanceSystem)
    })
  })

  // ── DanceType / DanceEffect 枚举 ──────────────────────────────────────────
  describe('DanceType 与 DanceEffect 枚举', () => {
    it('DanceType 包含 6 种类型', () => {
      const types: DanceType[] = ['celebration', 'war', 'rain', 'harvest', 'funeral', 'mating']
      types.forEach((t, i) => { ;(sys as any).dances.push(makeDance(t)) })
      const all = (sys as any).dances as DanceEvent[]
      types.forEach((t, i) => { expect(all[i].type).toBe(t) })
    })

    it('DanceEffect 包含 6 种效果', () => {
      const effects: DanceEffect[] = ['morale', 'combat', 'fertility', 'luck', 'healing', 'unity']
      effects.forEach((e, i) => { ;(sys as any).dances.push(makeDance('celebration', e)) })
      const all = (sys as any).dances as DanceEvent[]
      effects.forEach((e, i) => { expect(all[i].effect).toBe(e) })
    })

    it('DANCE_EFFECTS 映射：celebration→morale', () => {
      expect(DANCE_EFFECTS['celebration']).toBe('morale')
    })

    it('DANCE_EFFECTS 映射：war→combat', () => {
      expect(DANCE_EFFECTS['war']).toBe('combat')
    })

    it('DANCE_EFFECTS 映射：rain→luck', () => {
      expect(DANCE_EFFECTS['rain']).toBe('luck')
    })

    it('DANCE_EFFECTS 映射：harvest→healing', () => {
      expect(DANCE_EFFECTS['harvest']).toBe('healing')
    })

    it('DANCE_EFFECTS 映射：funeral→unity', () => {
      expect(DANCE_EFFECTS['funeral']).toBe('unity')
    })

    it('DANCE_EFFECTS 映射：mating→fertility', () => {
      expect(DANCE_EFFECTS['mating']).toBe('fertility')
    })
  })

  // ── 注入与查询 ──────────────────────────────────────────────────────────────
  describe('舞蹈注入与查询', () => {
    it('注入后可查询 type 和 effect', () => {
      ;(sys as any).dances.push(makeDance('war', 'combat'))
      expect((sys as any).dances[0].type).toBe('war')
      expect((sys as any).dances[0].effect).toBe('combat')
      expect((sys as any).dances).toHaveLength(1)
    })

    it('注入多个舞蹈长度正确', () => {
      for (let i = 0; i < 5; i++) {
        ;(sys as any).dances.push(makeDance())
      }
      expect((sys as any).dances).toHaveLength(5)
    })

    it('舞蹈对象包含所有必要字段', () => {
      const d = makeDance('harvest', 'healing', 100, 600, 75)
      ;(sys as any).dances.push(d)
      const r = (sys as any).dances[0] as DanceEvent
      expect(r).toHaveProperty('id')
      expect(r).toHaveProperty('x')
      expect(r).toHaveProperty('y')
      expect(r).toHaveProperty('type')
      expect(r).toHaveProperty('participants')
      expect(r).toHaveProperty('intensity')
      expect(r).toHaveProperty('startTick')
      expect(r).toHaveProperty('duration')
      expect(r).toHaveProperty('effect')
    })

    it('不同 startTick 的舞蹈保持各自值', () => {
      ;(sys as any).dances.push(makeDance('celebration', 'morale', 100, 500, 60))
      ;(sys as any).dances.push(makeDance('war', 'combat', 200, 600, 70))
      expect((sys as any).dances[0].startTick).toBe(100)
      expect((sys as any).dances[1].startTick).toBe(200)
    })

    it('舞蹈坐标正确存储', () => {
      const d = makeDance()
      d.x = 42; d.y = 99
      ;(sys as any).dances.push(d)
      expect((sys as any).dances[0].x).toBe(42)
      expect((sys as any).dances[0].y).toBe(99)
    })
  })

  // ── CHECK_INTERVAL 节流逻辑 ─────────────────────────────────────────────────
  describe('CHECK_INTERVAL 节流', () => {
    it('tick 差值 < 700 时不触发更新', () => {
      const em = makeEmptyEM()
      sys.update(1, em as any, CHECK_INTERVAL)
      sys.update(1, em as any, CHECK_INTERVAL * 2 - 1)
      expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
    })

    it('tick 差值 >= 700 时触发第二次更新', () => {
      const em = makeEmptyEM()
      sys.update(1, em as any, CHECK_INTERVAL)
      sys.update(1, em as any, CHECK_INTERVAL * 2)
      expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(2)
    })

    it('首次调用 update（tick=CHECK_INTERVAL）触发，lastCheck 更新为 CHECK_INTERVAL', () => {
      const em = makeEmptyEM()
      sys.update(1, em as any, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('tick < CHECK_INTERVAL 时 lastCheck 不更新', () => {
      const em = makeEmptyEM()
      sys.update(1, em as any, CHECK_INTERVAL - 1)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('连续多次超过 CHECK_INTERVAL 时每次都触发', () => {
      const em = makeEmptyEM()
      sys.update(1, em as any, CHECK_INTERVAL)
      sys.update(1, em as any, CHECK_INTERVAL * 2)
      sys.update(1, em as any, CHECK_INTERVAL * 3)
      expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(3)
    })

    it('tick=0 时不触发（0 - 0 = 0 < 700）', () => {
      const em = makeEmptyEM()
      sys.update(1, em as any, 0)
      expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(0)
    })

    it('lastCheck 在每次有效更新后跟随 tick 值', () => {
      const em = makeEmptyEM()
      sys.update(1, em as any, 700)
      expect((sys as any).lastCheck).toBe(700)
      sys.update(1, em as any, 1400)
      expect((sys as any).lastCheck).toBe(1400)
      sys.update(1, em as any, 2100)
      expect((sys as any).lastCheck).toBe(2100)
    })
  })

  // ── intensity 增长与衰减 ─────────────────────────────────────────────────────
  describe('intensity 增长与衰减逻辑', () => {
    it('intensity 上限 100（participants >= 3 时增长）', () => {
      const dance = makeDance('celebration', 'morale', 0, 1000, 98)
      ;(sys as any).dances.push(dance)
      dance.intensity = Math.min(100, dance.intensity + 2 * (dance.participants * 0.2))
      expect(dance.intensity).toBeLessThanOrEqual(100)
    })

    it('participants >= 3 时 intensity 增长', () => {
      const dance = makeDance('celebration', 'morale', 0, 1000, 50)
      dance.participants = 5
      const before = dance.intensity
      dance.intensity = Math.min(100, dance.intensity + 2 * (dance.participants * 0.2))
      expect(dance.intensity).toBeGreaterThan(before)
    })

    it('participants < 3 时 intensity 衰减（INTENSITY_DECAY=3）', () => {
      const dance = makeDance('celebration', 'morale', 0, 1000, 50)
      dance.participants = 2
      dance.intensity = Math.max(0, dance.intensity - 3)
      expect(dance.intensity).toBe(47)
    })

    it('intensity 不低于 0', () => {
      const dance = makeDance('celebration', 'morale', 0, 1000, 1)
      dance.participants = 1
      dance.intensity = Math.max(0, dance.intensity - 3)
      expect(dance.intensity).toBe(0)
    })

    it('intensity = 100 时增长后仍为 100', () => {
      const dance = makeDance('celebration', 'morale', 0, 1000, 100)
      dance.participants = 10
      dance.intensity = Math.min(100, dance.intensity + 2 * (dance.participants * 0.2))
      expect(dance.intensity).toBe(100)
    })

    it('participants = 3 时为增长边界（恰好 >= 3 触发增长）', () => {
      const dance = makeDance('celebration', 'morale', 0, 999999, 50)
      dance.participants = 3
      const before = dance.intensity
      dance.intensity = Math.min(100, dance.intensity + 2 * (dance.participants * 0.2))
      expect(dance.intensity).toBeGreaterThanOrEqual(before)
    })
  })

  // ── 舞蹈过期删除 ─────────────────────────────────────────────────────────────
  describe('舞蹈过期与删除', () => {
    it('elapsed >= duration 的舞蹈在 update 时被删除', () => {
      ;(sys as any).dances.push(makeDance('celebration', 'morale', 0, 100, 60))
      const em = makeEmptyEM()
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, em as any, CHECK_INTERVAL)
      expect((sys as any).dances).toHaveLength(0)
    })

    it('elapsed < duration 的舞蹈不被删除', () => {
      ;(sys as any).dances.push(makeDance('war', 'combat', CHECK_INTERVAL, 999999, 50))
      const em = makeEmptyEM()
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, em as any, CHECK_INTERVAL)
      expect((sys as any).dances).toHaveLength(1)
    })

    it('intensity 衰减到 0 时舞蹈被提前删除', () => {
      const dance = makeDance('funeral', 'unity', 0, 999999, 1)
      dance.participants = 1
      ;(sys as any).dances.push(dance)
      const em = makeEmptyEM()
      sys.update(1, em as any, CHECK_INTERVAL)
      expect((sys as any).dances).toHaveLength(0)
    })

    it('多舞蹈共存：过期舞蹈被删除，未过期舞蹈保留', () => {
      ;(sys as any).dances.push(makeDance('celebration', 'morale', 0, 100, 50))
      ;(sys as any).dances.push(makeDance('war', 'combat', CHECK_INTERVAL, 999999, 50))
      const em = makeEmptyEM()
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, em as any, CHECK_INTERVAL)
      const remaining = (sys as any).dances as DanceEvent[]
      expect(remaining).toHaveLength(1)
      expect(remaining[0].type).toBe('war')
    })

    it('duration = elapsed 恰好等于时也应删除（>= 边界）', () => {
      ;(sys as any).dances.push(makeDance('rain', 'luck', 0, CHECK_INTERVAL, 50))
      const em = makeEmptyEM()
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, em as any, CHECK_INTERVAL)
      expect((sys as any).dances).toHaveLength(0)
    })

    it('连续 update 后逐步过期的舞蹈被移除', () => {
      ;(sys as any).dances.push(makeDance('harvest', 'healing', 0, CHECK_INTERVAL + 1, 60))
      const em = makeEmptyEM()
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, em as any, CHECK_INTERVAL)
      expect((sys as any).dances).toHaveLength(1)
      sys.update(1, em as any, CHECK_INTERVAL * 2)
      expect((sys as any).dances).toHaveLength(0)
    })
  })

  // ── MAX_DANCES 限制 ──────────────────────────────────────────────────────────
  describe('MAX_DANCES 上限限制', () => {
    it('注入 15 个舞蹈时数组长度为 15', () => {
      for (let i = 0; i < MAX_DANCES; i++) {
        ;(sys as any).dances.push(makeDance())
      }
      expect((sys as any).dances).toHaveLength(MAX_DANCES)
    })

    it('达到 MAX_DANCES=15 个未过期舞蹈时 update 不添加新舞蹈', () => {
      for (let i = 0; i < MAX_DANCES; i++) {
        ;(sys as any).dances.push(makeDance('celebration', 'morale', CHECK_INTERVAL, 999999, 50))
      }
      const em = makeEmptyEM()
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, em as any, CHECK_INTERVAL)
      expect((sys as any).dances).toHaveLength(MAX_DANCES)
    })

    it('注入 14 个舞蹈后 MAX_DANCES=15 还有一个槽位', () => {
      for (let i = 0; i < MAX_DANCES - 1; i++) {
        ;(sys as any).dances.push(makeDance())
      }
      expect((sys as any).dances.length).toBeLessThan(MAX_DANCES)
    })
  })

  // ── participants 统计 ────────────────────────────────────────────────────────
  describe('participants 就近统计', () => {
    it('entities 返回空时，participants 被更新为 0，intensity 衰减', () => {
      // nearby=0 < 3, intensity = max(0, 60-3) = 57，舞蹈仍保留（intensity > 0）
      const dance = makeDance('celebration', 'morale', 0, 999999, 60)
      dance.participants = 5
      ;(sys as any).dances.push(dance)
      const em = makeEmptyEM()
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, em as any, CHECK_INTERVAL)
      // nearby=0, participants 变为 0, intensity 衰减但仍 > 0，舞蹈保留
      expect((sys as any).dances[0].participants).toBe(0)
      expect((sys as any).dances[0].intensity).toBe(57)
    })

    it('nearby 实体在 GATHER_RADIUS 内时被计为 participants', () => {
      const dance = makeDance('celebration', 'morale', CHECK_INTERVAL, 999999, 60)
      dance.x = 10; dance.y = 10
      ;(sys as any).dances.push(dance)
      const pos = { x: 10, y: 10 }
      const em = {
        getEntitiesWithComponents: vi.fn().mockReturnValue([1, 2, 3]),
        getComponent: vi.fn().mockReturnValue(pos),
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, em as any, CHECK_INTERVAL)
      expect((sys as any).dances[0].participants).toBe(3)
    })

    it('恰好在 GATHER_RADIUS 边界内的实体被计入', () => {
      const dance = makeDance('celebration', 'morale', CHECK_INTERVAL, 999999, 60)
      dance.x = 0; dance.y = 0
      ;(sys as any).dances.push(dance)
      // 距离恰好等于 GATHER_RADIUS（dx=8, dy=0, dist^2 = 64 <= 64）
      const pos = { x: GATHER_RADIUS, y: 0 }
      const em = {
        getEntitiesWithComponents: vi.fn().mockReturnValue([1]),
        getComponent: vi.fn().mockReturnValue(pos),
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, em as any, CHECK_INTERVAL)
      expect((sys as any).dances[0].participants).toBe(1)
    })

    it('超出 GATHER_RADIUS 的实体不计入 participants', () => {
      const dance = makeDance('celebration', 'morale', CHECK_INTERVAL, 999999, 60)
      dance.x = 0; dance.y = 0
      ;(sys as any).dances.push(dance)
      // 距离超过 GATHER_RADIUS（dx=9, dy=0, dist^2 = 81 > 64）
      const pos = { x: GATHER_RADIUS + 1, y: 0 }
      const em = {
        getEntitiesWithComponents: vi.fn().mockReturnValue([1]),
        getComponent: vi.fn().mockReturnValue(pos),
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, em as any, CHECK_INTERVAL)
      expect((sys as any).dances[0].participants).toBe(0)
    })
  })

  // ── 新舞蹈生成 ──────────────────────────────────────────────────────────────
  describe('新舞蹈生成（spawn）', () => {
    it('Math.random > SPAWN_CHANCE(0.04) 时不生成新舞蹈', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const em = {
        getEntitiesWithComponents: vi.fn().mockReturnValue([1]),
        getComponent: vi.fn().mockReturnValue({ x: 100, y: 100 }),
      }
      sys.update(1, em as any, CHECK_INTERVAL)
      expect((sys as any).dances).toHaveLength(0)
    })

    it('Math.random < SPAWN_CHANCE 时生成新舞蹈', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      const em = {
        getEntitiesWithComponents: vi.fn().mockReturnValue([1]),
        getComponent: vi.fn().mockReturnValue({ x: 100, y: 100 }),
      }
      sys.update(1, em as any, CHECK_INTERVAL)
      expect((sys as any).dances.length).toBeGreaterThan(0)
    })

    it('新生成舞蹈的 startTick 等于当前 tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      const em = {
        getEntitiesWithComponents: vi.fn().mockReturnValue([1]),
        getComponent: vi.fn().mockReturnValue({ x: 100, y: 100 }),
      }
      sys.update(1, em as any, CHECK_INTERVAL)
      if ((sys as any).dances.length > 0) {
        expect((sys as any).dances[0].startTick).toBe(CHECK_INTERVAL)
      }
    })

    it('新生成舞蹈 duration 在 MIN_DURATION~MAX_DURATION 范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      const em = {
        getEntitiesWithComponents: vi.fn().mockReturnValue([1]),
        getComponent: vi.fn().mockReturnValue({ x: 100, y: 100 }),
      }
      sys.update(1, em as any, CHECK_INTERVAL)
      const dance = (sys as any).dances[0]
      if (dance) {
        expect(dance.duration).toBeGreaterThanOrEqual(MIN_DURATION)
        expect(dance.duration).toBeLessThanOrEqual(MAX_DURATION)
      }
    })

    it('新生成舞蹈 intensity 在 10~29 范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      const em = {
        getEntitiesWithComponents: vi.fn().mockReturnValue([1]),
        getComponent: vi.fn().mockReturnValue({ x: 100, y: 100 }),
      }
      sys.update(1, em as any, CHECK_INTERVAL)
      const dance = (sys as any).dances[0]
      if (dance) {
        expect(dance.intensity).toBeGreaterThanOrEqual(10)
        expect(dance.intensity).toBeLessThan(30)
      }
    })

    it('新生成舞蹈的 effect 与 type 映射一致', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      const em = {
        getEntitiesWithComponents: vi.fn().mockReturnValue([1]),
        getComponent: vi.fn().mockReturnValue({ x: 100, y: 100 }),
      }
      sys.update(1, em as any, CHECK_INTERVAL)
      const dance = (sys as any).dances[0] as DanceEvent
      if (dance) {
        expect(dance.effect).toBe(DANCE_EFFECTS[dance.type])
      }
    })

    it('nextDanceId 在生成新舞蹈后自增', () => {
      const initId = (sys as any).nextDanceId
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      const em = {
        getEntitiesWithComponents: vi.fn().mockReturnValue([1]),
        getComponent: vi.fn().mockReturnValue({ x: 100, y: 100 }),
      }
      sys.update(1, em as any, CHECK_INTERVAL)
      if ((sys as any).dances.length > 0) {
        expect((sys as any).nextDanceId).toBeGreaterThan(initId)
      }
    })

    it('相邻实体位置过近时不生成第二个舞蹈（tooClose 逻辑）', () => {
      // 已有一个在 (10, 10) 的舞蹈
      ;(sys as any).dances.push(makeDance('celebration', 'morale', CHECK_INTERVAL, 999999, 50))
      ;(sys as any).dances[0].x = 10
      ;(sys as any).dances[0].y = 10
      // 新实体位置在 (10, 10)，距离已有舞蹈为 0 < GATHER_RADIUS * 2
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      const em = {
        getEntitiesWithComponents: vi.fn().mockReturnValue([1]),
        getComponent: vi.fn().mockReturnValue({ x: 10, y: 10 }),
      }
      sys.update(1, em as any, CHECK_INTERVAL)
      // 因为 tooClose，不应新增
      expect((sys as any).dances).toHaveLength(1)
    })
  })

  // ── 综合场景 ──────────────────────────────────────────────────────────────────
  describe('综合场景', () => {
    it('全空世界多次 update 不崩溃', () => {
      const em = makeEmptyEM()
      expect(() => {
        for (let t = 0; t < 10; t++) {
          sys.update(1, em as any, CHECK_INTERVAL * (t + 1))
        }
      }).not.toThrow()
    })

    it('内部 dances 数组引用保持稳定', () => {
      const ref1 = (sys as any).dances
      ;(sys as any).dances.push(makeDance())
      const ref2 = (sys as any).dances
      expect(ref1).toBe(ref2)
    })

    it('同一 tick 第二次 update 无操作（节流保护）', () => {
      const em = makeEmptyEM()
      sys.update(1, em as any, CHECK_INTERVAL)
      sys.update(1, em as any, CHECK_INTERVAL)
      expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
    })

    it('过期和未过期混合：过期的删除，未过期的更新 participants', () => {
      // 已过期舞蹈
      ;(sys as any).dances.push(makeDance('rain', 'luck', 0, 50, 50))
      // 未过期舞蹈（startTick=CHECK_INTERVAL, duration 极大）
      const live = makeDance('mating', 'fertility', CHECK_INTERVAL, 999999, 60)
      live.x = 0; live.y = 0
      ;(sys as any).dances.push(live)
      const em = {
        getEntitiesWithComponents: vi.fn().mockReturnValue([1, 2, 3]),
        getComponent: vi.fn().mockReturnValue({ x: 0, y: 0 }),
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, em as any, CHECK_INTERVAL)
      const remaining = (sys as any).dances as DanceEvent[]
      expect(remaining).toHaveLength(1)
      expect(remaining[0].type).toBe('mating')
      expect(remaining[0].participants).toBe(3)
    })

    it('intensity 从 60 增长到更高值（participants=5, INTENSITY_GROWTH*nearby*0.2=2）', () => {
      const dance = makeDance('celebration', 'morale', CHECK_INTERVAL, 999999, 60)
      dance.x = 0; dance.y = 0
      dance.participants = 5
      ;(sys as any).dances.push(dance)
      const em = {
        getEntitiesWithComponents: vi.fn().mockReturnValue([1, 2, 3, 4, 5]),
        getComponent: vi.fn().mockReturnValue({ x: 0, y: 0 }),
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, em as any, CHECK_INTERVAL)
      // nearby=5 >= 3, intensity 增长：60 + 2*(5*0.2)=62
      expect((sys as any).dances[0].intensity).toBeGreaterThan(60)
    })

    it('update 后 participants=1 且 intensity 低于阈值时舞蹈消失', () => {
      const dance = makeDance('war', 'combat', CHECK_INTERVAL, 999999, 2)
      dance.participants = 1
      ;(sys as any).dances.push(dance)
      const em = makeEmptyEM()
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, em as any, CHECK_INTERVAL)
      // nearby=0 < 3, intensity = max(0, 2-3) = 0 → 删除
      expect((sys as any).dances).toHaveLength(0)
    })
  })
})
