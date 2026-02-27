import { describe, it, expect, beforeEach } from 'vitest'
import { TutorialSystem } from '../systems/TutorialSystem'
import type { TutorialStep } from '../systems/TutorialSystem'

// TutorialSystem 测试：
// - isActive()           → 教程激活状态
// - getCurrentStep()     → 当前步骤（未激活时为 null）
// - start()              → 激活教程，从第0步开始
// - nextStep()           → 推进到下一步
// - skip()               → 跳过教程
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

// ── isActive / start ──────────────────────────────────────────────────────────

describe('TutorialSystem.isActive', () => {
  let ts: TutorialSystem

  beforeEach(() => {
    ts = makeTS()
  })

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
})

// ── getCurrentStep ────────────────────────────────────────────────────────────

describe('TutorialSystem.getCurrentStep', () => {
  let ts: TutorialSystem

  beforeEach(() => {
    ts = makeTS(3)
  })

  it('未激活时返回 null', () => {
    expect(ts.getCurrentStep()).toBeNull()
  })

  it('start() 后返回第 0 步', () => {
    ts.start()
    const step = ts.getCurrentStep()
    expect(step).not.toBeNull()
    expect(step!.id).toBe('step0')
  })

  it('nextStep() 后返回第 1 步', () => {
    ts.start()
    ts.nextStep()
    expect(ts.getCurrentStep()!.id).toBe('step1')
  })

  it('skip() 后 getCurrentStep() 返回 null', () => {
    ts.start()
    ts.skip()
    expect(ts.getCurrentStep()).toBeNull()
  })
})

// ── nextStep ──────────────────────────────────────────────────────────────────

describe('TutorialSystem.nextStep', () => {
  it('推进完所有步骤后教程自动结束', () => {
    const ts = makeTS(2)
    ts.start()  // step0
    ts.nextStep()  // step1
    ts.nextStep()  // 超出，教程结束
    expect(ts.isActive()).toBe(false)
    expect(ts.getCurrentStep()).toBeNull()
  })

  it('未激活时 nextStep() 不崩溃', () => {
    const ts = makeTS()
    expect(() => ts.nextStep()).not.toThrow()
    expect(ts.isActive()).toBe(false)
  })

  it('单步教程 start 后 nextStep 立即结束', () => {
    const ts = makeTS(1)
    ts.start()
    expect(ts.getCurrentStep()!.id).toBe('step0')
    ts.nextStep()
    expect(ts.isActive()).toBe(false)
  })

  it('推进过程中步骤 id 按顺序变化', () => {
    const ts = makeTS(3)
    ts.start()
    const ids: string[] = []
    for (let i = 0; i < 3; i++) {
      const step = ts.getCurrentStep()
      if (step) ids.push(step.id)
      ts.nextStep()
    }
    expect(ids).toEqual(['step0', 'step1', 'step2'])
  })
})

// ── skip ─────────────────────────────────────────────────────────────────────

describe('TutorialSystem.skip', () => {
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
    expect(ts.getCurrentStep()!.id).toBe('step0')
  })

  it('未激活时 skip 不崩溃', () => {
    const ts = makeTS()
    expect(() => ts.skip()).not.toThrow()
  })
})

// ── currentIndex 边界 ──────────────────────────────────────────────────────────

describe('TutorialSystem index boundaries', () => {
  it('空步骤教程 start 后立即结束', () => {
    const ts = new TutorialSystem([])
    ts.start()
    // currentIndex=0, steps.length=0 → getCurrentStep 返回 null
    expect(ts.getCurrentStep()).toBeNull()
  })

  it('5步教程推进到第3步后 getCurrentStep 正确', () => {
    const ts = makeTS(5)
    ts.start()
    ts.nextStep()
    ts.nextStep()
    ts.nextStep()
    expect(ts.getCurrentStep()!.id).toBe('step3')
  })
})
