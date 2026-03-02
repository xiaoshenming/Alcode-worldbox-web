import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AutoSaveSystem } from '../systems/AutoSaveSystem'
import { SaveSystem } from '../game/SaveSystem'

// ---- minimal stubs ----

function makeWorld(tick = 0) {
  return { tick } as any
}

function makeEm(population = 0) {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue(
      Array.from({ length: population }, (_, i) => i + 1)
    ),
  } as any
}

function makeCivManager(civCount = 0) {
  return {
    civilizations: { size: civCount } as any,
  } as any
}

function makeResources() {
  return {} as any
}

function makeSys() {
  return new AutoSaveSystem()
}

describe('AutoSaveSystem', () => {
  let sys: AutoSaveSystem

  beforeEach(() => {
    sys = makeSys()
    vi.spyOn(SaveSystem, 'save').mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ---- 初始状态 ----

  describe('初始状态', () => {
    it('getInterval 返回正整数', () => {
      expect(sys.getInterval()).toBeGreaterThan(0)
    })

    it('getInterval 默认值大于100 ticks', () => {
      expect(sys.getInterval()).toBeGreaterThan(100)
    })

    it('getInterval 默认值为3000', () => {
      expect(sys.getInterval()).toBe(3000)
    })

    it('getLastSaveTime 初始为0', () => {
      expect(sys.getLastSaveTime()).toBe(0)
    })

    it('ticksSinceLastSave 初始为0', () => {
      expect((sys as any).ticksSinceLastSave).toBe(0)
    })

    it('lastSaveOk 初始为true', () => {
      expect((sys as any).lastSaveOk).toBe(true)
    })

    it('prevSnapshot 初始为null', () => {
      expect((sys as any).prevSnapshot).toBeNull()
    })

    it('indicatorAlpha 初始为0', () => {
      expect((sys as any).indicatorAlpha).toBe(0)
    })

    it('indicatorTimer 初始为0', () => {
      expect((sys as any).indicatorTimer).toBe(0)
    })

    it('_savingTextWidth 初始为0', () => {
      expect((sys as any)._savingTextWidth).toBe(0)
    })

    it('_savedTextWidth 初始为0', () => {
      expect((sys as any)._savedTextWidth).toBe(0)
    })
  })

  // ---- update 计时器行为 ----

  describe('update 计时器行为', () => {
    it('每次 update 递增 ticksSinceLastSave', () => {
      sys.update(0, makeWorld(), makeEm(), makeCivManager(), makeResources())
      expect((sys as any).ticksSinceLastSave).toBe(1)
    })

    it('连续3次 update 后 ticksSinceLastSave 递增到3（interval未到）', () => {
      for (let i = 0; i < 3; i++) {
        sys.update(i, makeWorld(i), makeEm(), makeCivManager(), makeResources())
      }
      expect((sys as any).ticksSinceLastSave).toBe(3)
    })

    it('interval 内不触发 SaveSystem.save', () => {
      for (let i = 0; i < 100; i++) {
        sys.update(i, makeWorld(i), makeEm(), makeCivManager(), makeResources())
      }
      expect(SaveSystem.save).not.toHaveBeenCalled()
    })

    it('达到 interval 时重置 ticksSinceLastSave 为0', () => {
      const interval = sys.getInterval()
      for (let i = 0; i < interval; i++) {
        sys.update(i, makeWorld(i), makeEm(), makeCivManager(), makeResources())
      }
      expect((sys as any).ticksSinceLastSave).toBe(0)
    })

    it('达到 interval 且世界有变化时触发 SaveSystem.save', () => {
      const interval = sys.getInterval()
      for (let i = 0; i < interval; i++) {
        sys.update(i, makeWorld(i), makeEm(5), makeCivManager(1), makeResources())
      }
      expect(SaveSystem.save).toHaveBeenCalled()
    })

    it('世界无变化（snapshot 相同）时不触发 save', () => {
      const interval = sys.getInterval()
      const world = makeWorld(42)
      const em = makeEm(5)
      const civ = makeCivManager(1)
      // 先触发第一次 save 建立 snapshot
      for (let i = 0; i < interval; i++) {
        sys.update(i, world, em, civ, makeResources())
      }
      const callsAfterFirst = (SaveSystem.save as any).mock.calls.length
      // 再运行一个 interval — world.tick、population、civCount 都没变
      for (let i = 0; i < interval; i++) {
        sys.update(i, world, em, civ, makeResources())
      }
      // 不应该再次 save
      expect((SaveSystem.save as any).mock.calls.length).toBe(callsAfterFirst)
    })

    it('SaveSystem.save 被以 auto 槽调用', () => {
      const interval = sys.getInterval()
      for (let i = 0; i < interval; i++) {
        sys.update(i, makeWorld(i), makeEm(3), makeCivManager(1), makeResources())
      }
      expect(SaveSystem.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        'auto'
      )
    })
  })

  // ---- triggerSave ----

  describe('triggerSave', () => {
    it('直接调用 triggerSave 会调用 SaveSystem.save', () => {
      sys.triggerSave(makeWorld(), makeEm(), makeCivManager(), makeResources())
      expect(SaveSystem.save).toHaveBeenCalled()
    })

    it('save 成功后 lastSaveTime > 0', () => {
      vi.spyOn(SaveSystem, 'save').mockReturnValue(true)
      sys.triggerSave(makeWorld(), makeEm(), makeCivManager(), makeResources())
      expect(sys.getLastSaveTime()).toBeGreaterThan(0)
    })

    it('save 失败后 lastSaveTime 保持为0', () => {
      vi.spyOn(SaveSystem, 'save').mockReturnValue(false)
      sys.triggerSave(makeWorld(), makeEm(), makeCivManager(), makeResources())
      expect(sys.getLastSaveTime()).toBe(0)
    })

    it('save 成功后 lastSaveOk 为true', () => {
      vi.spyOn(SaveSystem, 'save').mockReturnValue(true)
      sys.triggerSave(makeWorld(), makeEm(), makeCivManager(), makeResources())
      expect((sys as any).lastSaveOk).toBe(true)
    })

    it('save 失败后 lastSaveOk 为false', () => {
      vi.spyOn(SaveSystem, 'save').mockReturnValue(false)
      sys.triggerSave(makeWorld(), makeEm(), makeCivManager(), makeResources())
      expect((sys as any).lastSaveOk).toBe(false)
    })

    it('triggerSave 后 prevSnapshot 不为null', () => {
      vi.spyOn(SaveSystem, 'save').mockReturnValue(true)
      sys.triggerSave(makeWorld(5), makeEm(3), makeCivManager(2), makeResources())
      expect((sys as any).prevSnapshot).not.toBeNull()
    })

    it('save 成功后 prevSnapshot 记录正确的 tick', () => {
      vi.spyOn(SaveSystem, 'save').mockReturnValue(true)
      sys.triggerSave(makeWorld(77), makeEm(0), makeCivManager(0), makeResources())
      expect((sys as any).prevSnapshot.tick).toBe(77)
    })

    it('save 失败后 prevSnapshot 不更新', () => {
      vi.spyOn(SaveSystem, 'save').mockReturnValue(false)
      sys.triggerSave(makeWorld(99), makeEm(0), makeCivManager(0), makeResources())
      // prevSnapshot remains null since save failed and takeSnapshot is not called
      expect((sys as any).prevSnapshot).toBeNull()
    })
  })

  // ---- 指示器状态 ----

  describe('指示器动画状态', () => {
    it('刚实例化时 indicatorState 为 Hidden (0)', () => {
      expect((sys as any).indicatorState).toBe(0)
    })

    it('triggerSave 成功后 indicatorState 变为 Saved (2)', () => {
      vi.spyOn(SaveSystem, 'save').mockReturnValue(true)
      sys.triggerSave(makeWorld(), makeEm(), makeCivManager(), makeResources())
      expect((sys as any).indicatorState).toBe(2) // IndicatorState.Saved
    })

    it('triggerSave 失败后 indicatorState 变为 Hidden (0)', () => {
      vi.spyOn(SaveSystem, 'save').mockReturnValue(false)
      sys.triggerSave(makeWorld(), makeEm(), makeCivManager(), makeResources())
      expect((sys as any).indicatorState).toBe(0) // IndicatorState.Hidden
    })

    it('save 成功后 indicatorAlpha 为1', () => {
      vi.spyOn(SaveSystem, 'save').mockReturnValue(true)
      sys.triggerSave(makeWorld(), makeEm(), makeCivManager(), makeResources())
      expect((sys as any).indicatorAlpha).toBe(1)
    })

    it('save 成功后 indicatorTimer > 0', () => {
      vi.spyOn(SaveSystem, 'save').mockReturnValue(true)
      sys.triggerSave(makeWorld(), makeEm(), makeCivManager(), makeResources())
      expect((sys as any).indicatorTimer).toBeGreaterThan(0)
    })

    it('advanceIndicator 每帧递减 indicatorTimer', () => {
      vi.spyOn(SaveSystem, 'save').mockReturnValue(true)
      sys.triggerSave(makeWorld(), makeEm(), makeCivManager(), makeResources())
      const timerBefore = (sys as any).indicatorTimer
      ;(sys as any).advanceIndicator()
      expect((sys as any).indicatorTimer).toBe(timerBefore - 1)
    })

    it('indicatorTimer 归零后 alpha 开始递减', () => {
      vi.spyOn(SaveSystem, 'save').mockReturnValue(true)
      sys.triggerSave(makeWorld(), makeEm(), makeCivManager(), makeResources())
      // 耗尽 timer
      const timer = (sys as any).indicatorTimer
      for (let i = 0; i < timer; i++) {
        ;(sys as any).advanceIndicator()
      }
      // 再推进一帧，alpha 应开始减少
      const alphaBefore = (sys as any).indicatorAlpha
      ;(sys as any).advanceIndicator()
      expect((sys as any).indicatorAlpha).toBeLessThan(alphaBefore)
    })

    it('Hidden 状态下 alpha > 0 时，advanceIndicator 减少 alpha', () => {
      ;(sys as any).indicatorState = 0 // Hidden
      ;(sys as any).indicatorAlpha = 0.5
      ;(sys as any).advanceIndicator()
      expect((sys as any).indicatorAlpha).toBeLessThan(0.5)
    })
  })

  // ---- render 方法 ----

  describe('render', () => {
    function makeCtx() {
      return {
        canvas: { width: 800 },
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        fill: vi.fn(),
        fillText: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        arcTo: vi.fn(),
        closePath: vi.fn(),
        measureText: vi.fn().mockReturnValue({ width: 60 }),
        globalAlpha: 1,
        fillStyle: '',
        font: '',
        textAlign: '',
        textBaseline: '',
      } as any
    }

    it('Hidden 且 alpha=0 时 render 不调用 ctx.save', () => {
      const ctx = makeCtx()
      sys.render(ctx)
      expect(ctx.save).not.toHaveBeenCalled()
    })

    it('有内容显示时 render 调用 ctx.save 和 ctx.restore', () => {
      vi.spyOn(SaveSystem, 'save').mockReturnValue(true)
      sys.triggerSave(makeWorld(), makeEm(), makeCivManager(), makeResources())
      const ctx = makeCtx()
      sys.render(ctx)
      expect(ctx.save).toHaveBeenCalled()
      expect(ctx.restore).toHaveBeenCalled()
    })

    it('render 在 Saved 状态下调用 fillText', () => {
      vi.spyOn(SaveSystem, 'save').mockReturnValue(true)
      sys.triggerSave(makeWorld(), makeEm(), makeCivManager(), makeResources())
      const ctx = makeCtx()
      sys.render(ctx)
      expect(ctx.fillText).toHaveBeenCalled()
    })

    it('save 成功时 fillStyle 使用绿色系 (#8f8)', () => {
      vi.spyOn(SaveSystem, 'save').mockReturnValue(true)
      sys.triggerSave(makeWorld(), makeEm(), makeCivManager(), makeResources())
      const ctx = makeCtx()
      sys.render(ctx)
      expect(ctx.fillStyle).toBe('#8f8')
    })

    it('save 失败时 indicatorState 为 Hidden，indicatorTimer 为 0', () => {
      vi.spyOn(SaveSystem, 'save').mockReturnValue(false)
      sys.triggerSave(makeWorld(), makeEm(), makeCivManager(), makeResources())
      expect((sys as any).indicatorState).toBe(0) // Hidden
      expect((sys as any).indicatorTimer).toBe(0)
    })

    it('alpha <= 0.01 时 render 提前返回', () => {
      ;(sys as any).indicatorAlpha = 0.005
      ;(sys as any).indicatorState = 2 // Saved
      const ctx = makeCtx()
      sys.render(ctx)
      expect(ctx.save).not.toHaveBeenCalled()
    })
  })

  // ---- change detection (hasChanged) ----

  describe('hasChanged 变更检测', () => {
    it('首次调用 hasChanged 时无 snapshot，返回true', () => {
      const result = (sys as any).hasChanged(makeWorld(0), makeEm(0), makeCivManager(0))
      expect(result).toBe(true)
    })

    it('tick 变化时 hasChanged 返回true', () => {
      ;(sys as any).prevSnapshot = { tick: 0, population: 5, civCount: 1 }
      const world = makeWorld(1)
      const em = makeEm(5)
      const civ = makeCivManager(1)
      expect((sys as any).hasChanged(world, em, civ)).toBe(true)
    })

    it('population 变化时 hasChanged 返回true', () => {
      ;(sys as any).prevSnapshot = { tick: 0, population: 5, civCount: 1 }
      const world = makeWorld(0)
      const em = makeEm(10) // 不同数量
      const civ = makeCivManager(1)
      expect((sys as any).hasChanged(world, em, civ)).toBe(true)
    })

    it('civCount 变化时 hasChanged 返回true', () => {
      ;(sys as any).prevSnapshot = { tick: 0, population: 5, civCount: 1 }
      const world = makeWorld(0)
      const em = makeEm(5)
      const civ = makeCivManager(3) // 不同数量
      expect((sys as any).hasChanged(world, em, civ)).toBe(true)
    })

    it('无变化时 hasChanged 返回false', () => {
      ;(sys as any).prevSnapshot = { tick: 0, population: 5, civCount: 2 }
      const world = makeWorld(0)
      const em = makeEm(5)
      const civ = makeCivManager(2)
      expect((sys as any).hasChanged(world, em, civ)).toBe(false)
    })
  })

  // ---- takeSnapshot ----

  describe('takeSnapshot', () => {
    it('takeSnapshot 创建 prevSnapshot', () => {
      ;(sys as any).takeSnapshot(makeWorld(10), makeEm(4), makeCivManager(2))
      expect((sys as any).prevSnapshot).not.toBeNull()
    })

    it('takeSnapshot 记录正确的 tick', () => {
      ;(sys as any).takeSnapshot(makeWorld(42), makeEm(0), makeCivManager(0))
      expect((sys as any).prevSnapshot.tick).toBe(42)
    })

    it('takeSnapshot 记录正确的 population', () => {
      ;(sys as any).takeSnapshot(makeWorld(0), makeEm(7), makeCivManager(0))
      expect((sys as any).prevSnapshot.population).toBe(7)
    })

    it('takeSnapshot 记录正确的 civCount', () => {
      ;(sys as any).takeSnapshot(makeWorld(0), makeEm(0), makeCivManager(3))
      expect((sys as any).prevSnapshot.civCount).toBe(3)
    })

    it('takeSnapshot 可以重复调用更新 snapshot', () => {
      ;(sys as any).takeSnapshot(makeWorld(1), makeEm(1), makeCivManager(1))
      ;(sys as any).takeSnapshot(makeWorld(99), makeEm(99), makeCivManager(9))
      expect((sys as any).prevSnapshot.tick).toBe(99)
    })
  })
})
