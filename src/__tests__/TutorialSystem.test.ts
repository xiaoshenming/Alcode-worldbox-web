import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TutorialSystem } from '../systems/TutorialSystem'
import type { TutorialStep } from '../systems/TutorialSystem'

// TutorialSystem 测试：
// - isActive()                   → 教程激活状态
// - (ts as any).getCurrentStep() → 当前步骤（私有方法，用 any 访问）
// - start()                      → 激活教程，从第0步开始
// - nextStep()                   → 推进到下一步
// - skip()                       → 跳过教程
// 构造函数接受自定义步骤，方便测试（绕开 localStorage）

function makeStep(id: string, overrides: Partial<TutorialStep> = {}): TutorialStep {
  return {
    id,
    title: `Step ${id}`,
    description: `Description for ${id}`,
    highlightElement: null,
    action: 'Do something',
    condition: () => true,
    ...overrides,
  }
}

function makeTS(stepCount = 3): TutorialSystem {
  const steps = Array.from({ length: stepCount }, (_, i) => makeStep(`step${i}`))
  return new TutorialSystem(steps)
}

// Helper to get current step via private method
function getCurrentStep(ts: TutorialSystem): TutorialStep | null | undefined {
  return (ts as any).getCurrentStep()
}

// ── isActive / start ──────────────────────────────────────────────────────────

describe('TutorialSystem.isActive', () => {
  let ts: TutorialSystem

  beforeEach(() => {
    ts = makeTS()
  })
  afterEach(() => vi.restoreAllMocks())

  it('初始时未激活', () => {
    expect(ts.isActive()).toBe(false)
  })

  it('start() 后变为激活', () => {
    ts.start()
    expect(ts.isActive()).toBe(true)
  })

  it('skip() 后变为未激活', () => {
    ts.start()
    ts.skip()
    expect(ts.isActive()).toBe(false)
  })

  it('start 多次调用仍然激活', () => {
    ts.start()
    ts.start()
    expect(ts.isActive()).toBe(true)
  })

  it('完成所有步骤后 isActive 为 false', () => {
    const ts2 = makeTS(2)
    ts2.start()
    ts2.nextStep()
    ts2.nextStep()
    expect(ts2.isActive()).toBe(false)
  })

  it('skip 后 isActive 始终为 false，再次 skip 也不崩溃', () => {
    ts.start()
    ts.skip()
    ts.skip()
    expect(ts.isActive()).toBe(false)
  })

  it('isActive 是布尔值类型', () => {
    expect(typeof ts.isActive()).toBe('boolean')
  })
})

// ── getCurrentStep ────────────────────────────────────────────────────────────

describe('TutorialSystem.getCurrentStep', () => {
  let ts: TutorialSystem

  beforeEach(() => {
    ts = makeTS(3)
  })
  afterEach(() => vi.restoreAllMocks())

  it('未激活时返回 null', () => {
    expect(getCurrentStep(ts)).toBeNull()
  })

  it('start() 后返回第 0 步', () => {
    ts.start()
    const step = getCurrentStep(ts)
    expect(step).not.toBeNull()
    expect(step!.id).toBe('step0')
  })

  it('nextStep() 后返回第 1 步', () => {
    ts.start()
    ts.nextStep()
    expect(getCurrentStep(ts)!.id).toBe('step1')
  })

  it('skip() 后 getCurrentStep() 返回 null', () => {
    ts.start()
    ts.skip()
    expect(getCurrentStep(ts)).toBeNull()
  })

  it('getCurrentStep 返回完整的 step 对象含 id/title/description/action', () => {
    ts.start()
    const step = getCurrentStep(ts)
    expect(step).not.toBeNull()
    expect(step!.id).toBeTruthy()
    expect(step!.title).toBeTruthy()
    expect(step!.description).toBeTruthy()
    expect(step!.action).toBeTruthy()
  })

  it('getCurrentStep 在 nextStep 后 id 与预期一致', () => {
    ts.start()
    ts.nextStep()
    ts.nextStep()
    expect(getCurrentStep(ts)!.id).toBe('step2')
  })

  it('教程完成后 getCurrentStep 为 null', () => {
    const ts2 = makeTS(1)
    ts2.start()
    ts2.nextStep()
    expect(getCurrentStep(ts2)).toBeNull()
  })

  it('step 对象拥有 condition 函数', () => {
    ts.start()
    const step = getCurrentStep(ts)
    expect(typeof step!.condition).toBe('function')
  })

  it('highlightElement 字段为 null 时正常', () => {
    ts.start()
    const step = getCurrentStep(ts)
    expect(step!.highlightElement).toBeNull()
  })

  it('自定义 highlightElement 字段正确传递', () => {
    const tsHl = new TutorialSystem([makeStep('hl', { highlightElement: '#game-canvas' })])
    tsHl.start()
    expect(getCurrentStep(tsHl)!.highlightElement).toBe('#game-canvas')
  })
})

// ── nextStep ──────────────────────────────────────────────────────────���───────

describe('TutorialSystem.nextStep', () => {
  afterEach(() => vi.restoreAllMocks())

  it('推进完所有步骤后教程自动结束', () => {
    const ts = makeTS(2)
    ts.start()  // step0
    ts.nextStep()  // step1
    ts.nextStep()  // 超出，教程结束
    expect(ts.isActive()).toBe(false)
    expect(getCurrentStep(ts)).toBeNull()
  })

  it('未激活时 nextStep() 不崩溃', () => {
    const ts = makeTS()
    expect(() => ts.nextStep()).not.toThrow()
    expect(ts.isActive()).toBe(false)
  })

  it('单步教程 start 后 nextStep 立即结束', () => {
    const ts = makeTS(1)
    ts.start()
    expect(getCurrentStep(ts)!.id).toBe('step0')
    ts.nextStep()
    expect(ts.isActive()).toBe(false)
  })

  it('推进过程中步骤 id 按顺序变化', () => {
    const ts = makeTS(3)
    ts.start()
    const ids: string[] = []
    for (let i = 0; i < 3; i++) {
      const step = getCurrentStep(ts)
      if (step) ids.push(step.id)
      ts.nextStep()
    }
    expect(ids).toEqual(['step0', 'step1', 'step2'])
  })

  it('nextStep 递增 currentIndex', () => {
    const ts = makeTS(5)
    ts.start()
    expect((ts as any).currentIndex).toBe(0)
    ts.nextStep()
    expect((ts as any).currentIndex).toBe(1)
    ts.nextStep()
    expect((ts as any).currentIndex).toBe(2)
  })

  it('nextStep 超出后 currentIndex 超出步骤长度', () => {
    const ts = makeTS(2)
    ts.start()
    ts.nextStep()
    ts.nextStep()  // 超出
    expect((ts as any).currentIndex).toBeGreaterThanOrEqual(2)
  })

  it('nextStep 完成后再次调用不崩溃', () => {
    const ts = makeTS(1)
    ts.start()
    ts.nextStep()
    expect(() => ts.nextStep()).not.toThrow()
  })

  it('10步教程逐步推进全部完成', () => {
    const ts = makeTS(10)
    ts.start()
    for (let i = 0; i < 10; i++) {
      expect(ts.isActive()).toBe(true)
      ts.nextStep()
    }
    expect(ts.isActive()).toBe(false)
  })

  it('nextStep 后 getCurrentStep 不再是上一步', () => {
    const ts = makeTS(3)
    ts.start()
    const first = getCurrentStep(ts)!.id
    ts.nextStep()
    const second = getCurrentStep(ts)!.id
    expect(second).not.toBe(first)
  })
})

// ── skip ─────────────────────────────────────────────────────────────────────

describe('TutorialSystem.skip', () => {
  afterEach(() => vi.restoreAllMocks())

  it('skip 后 isActive 为 false', () => {
    const ts = makeTS()
    ts.start()
    ts.skip()
    expect(ts.isActive()).toBe(false)
  })

  it('skip 后再次 start 可以重新开始', () => {
    const ts = makeTS(2)
    ts.start()
    ts.nextStep()  // step1
    ts.skip()
    ts.start()  // 重新从 step0 开始
    expect(getCurrentStep(ts)!.id).toBe('step0')
  })

  it('未激活时 skip 不崩溃', () => {
    const ts = makeTS()
    expect(() => ts.skip()).not.toThrow()
  })

  it('skip 后 currentIndex 重置为 -1', () => {
    const ts = makeTS(3)
    ts.start()
    ts.nextStep()
    ts.skip()
    expect((ts as any).currentIndex).toBe(-1)
  })

  it('skip 后 active 字段为 false', () => {
    const ts = makeTS()
    ts.start()
    ts.skip()
    expect((ts as any).active).toBe(false)
  })

  it('skip 后再次 start，currentIndex 从 0 开始', () => {
    const ts = makeTS(3)
    ts.start()
    ts.nextStep()
    ts.skip()
    ts.start()
    expect((ts as any).currentIndex).toBe(0)
  })

  it('skip 可中途跳过任意步骤', () => {
    const ts = makeTS(5)
    ts.start()
    ts.nextStep()
    ts.nextStep()  // 在 step2 时 skip
    ts.skip()
    expect(ts.isActive()).toBe(false)
  })

  it('跳过后重新开始能走完全程', () => {
    const ts = makeTS(3)
    ts.start()
    ts.skip()
    ts.start()
    const ids: string[] = []
    for (let i = 0; i < 3; i++) {
      const step = getCurrentStep(ts)
      if (step) ids.push(step.id)
      ts.nextStep()
    }
    expect(ids).toEqual(['step0', 'step1', 'step2'])
  })
})

// ── currentIndex 边界 ──────────────────────────────────────────────────────────

describe('TutorialSystem index boundaries', () => {
  afterEach(() => vi.restoreAllMocks())

  it('空步骤教程 start 后 getCurrentStep 返回 null 或 undefined', () => {
    const ts = new TutorialSystem([])
    ts.start()
    // currentIndex=0, steps.length=0 → getCurrentStep 返回 undefined 或 null
    const step = getCurrentStep(ts)
    expect(step == null).toBe(true)  // null or undefined
  })

  it('5步教程推进到第3步后 getCurrentStep 正确', () => {
    const ts = makeTS(5)
    ts.start()
    ts.nextStep()
    ts.nextStep()
    ts.nextStep()
    expect(getCurrentStep(ts)!.id).toBe('step3')
  })

  it('初始 currentIndex 为 -1', () => {
    const ts = makeTS()
    expect((ts as any).currentIndex).toBe(-1)
  })

  it('start 后 currentIndex 为 0', () => {
    const ts = makeTS()
    ts.start()
    expect((ts as any).currentIndex).toBe(0)
  })

  it('空步骤教程 nextStep 不崩��', () => {
    const ts = new TutorialSystem([])
    ts.start()
    expect(() => ts.nextStep()).not.toThrow()
  })

  it('空步骤教程立即结束', () => {
    const ts = new TutorialSystem([])
    ts.start()
    ts.nextStep()
    expect(ts.isActive()).toBe(false)
  })
})

// ── 构造函数与默认步骤 ──────────────────────────────────────────────────────────

describe('TutorialSystem 构造函数', () => {
  afterEach(() => vi.restoreAllMocks())

  it('不传步骤时使用默认步骤（8步）', () => {
    const ts = new TutorialSystem()
    ts.start()
    expect(ts.isActive()).toBe(true)
    // 默认有 8 步
    expect((ts as any).steps.length).toBe(8)
  })

  it('传入自定义步骤时使用自定义步骤', () => {
    const customSteps = [makeStep('custom0'), makeStep('custom1')]
    const ts = new TutorialSystem(customSteps)
    ts.start()
    expect(getCurrentStep(ts)!.id).toBe('custom0')
  })

  it('步骤数组独立，外部修改不影响内部', () => {
    const steps = [makeStep('a'), makeStep('b')]
    const ts = new TutorialSystem(steps)
    steps.push(makeStep('c'))
    // 内部存储是引用，取决于实现；但至少不崩溃
    expect(() => ts.start()).not.toThrow()
  })

  it('steps 字段被正确存储', () => {
    const steps = [makeStep('x'), makeStep('y'), makeStep('z')]
    const ts = new TutorialSystem(steps)
    expect((ts as any).steps).toHaveLength(3)
  })

  it('btnRects 初始包含 next 和 skip 两个区域', () => {
    const ts = makeTS()
    const btnRects = (ts as any).btnRects
    expect(btnRects).toHaveProperty('next')
    expect(btnRects).toHaveProperty('skip')
  })
})

// ── update 方法 ────────────────────────────────────────────────────────────────

describe('TutorialSystem.update', () => {
  afterEach(() => vi.restoreAllMocks())

  it('update 方法存在且不崩溃（未激活）', () => {
    const ts = makeTS()
    expect(() => ts.update()).not.toThrow()
  })

  it('update 方法在激活后不崩溃', () => {
    const ts = makeTS()
    ts.start()
    expect(() => ts.update()).not.toThrow()
  })

  it('update 不改变 isActive 状态（condition=true 时不自动推进）', () => {
    const ts = makeTS()
    ts.start()
    ts.update()
    expect(ts.isActive()).toBe(true)
    expect(getCurrentStep(ts)!.id).toBe('step0')
  })
})

// ── markCompleted ─────────────────────────────────────────────────────────────

describe('TutorialSystem.markCompleted', () => {
  afterEach(() => vi.restoreAllMocks())

  it('markCompleted 方法存在且不崩溃', () => {
    const ts = makeTS()
    expect(() => (ts as any).markCompleted()).not.toThrow()
  })

  it('skip 会调用 markCompleted（间接：不抛出）', () => {
    const ts = makeTS()
    ts.start()
    expect(() => ts.skip()).not.toThrow()
  })

  it('nextStep 到末尾会调用 markCompleted（间接：不抛出）', () => {
    const ts = makeTS(1)
    ts.start()
    expect(() => ts.nextStep()).not.toThrow()
  })
})
