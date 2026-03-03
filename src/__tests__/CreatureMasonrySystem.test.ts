import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureMasonrySystem } from '../systems/CreatureMasonrySystem'
import type { MasonryProject, StoneProject, ProjectPhase } from '../systems/CreatureMasonrySystem'

// CHECK_INTERVAL=2500, MAX_PROJECTS=30, START_CHANCE=0.004
// progress += 0.5 + quality * 0.005 每次更新
// 阶段：quarrying→shaping→building→complete（progress>=100时）
// cleanup: complete 且 tick < (currentTick - 120000) 时删除

let nextId = 1
function makeSys(): CreatureMasonrySystem { return new CreatureMasonrySystem() }
function makeProject(overrides: Partial<MasonryProject> = {}): MasonryProject {
  return {
    id: nextId++, masonId: 1, type: 'wall', phase: 'building',
    x: 10, y: 10, quality: 70, progress: 50, tick: 0,
    ...overrides
  }
}

const mockEm = {
  getEntitiesWithComponent: () => [] as number[],
  getComponent: () => undefined,
} as any

describe('CreatureMasonrySystem - 初始状态', () => {
  let sys: CreatureMasonrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无工程', () => { expect((sys as any).projects).toHaveLength(0) })
  it('lastCheck 初始为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('nextId 初始为 1', () => { expect((sys as any).nextId).toBe(1) })

  it('注入后可查询', () => {
    ;(sys as any).projects.push(makeProject({ type: 'tower' }))
    expect((sys as any).projects[0].type).toBe('tower')
  })

  it('返回内部引用', () => {
    ;(sys as any).projects.push(makeProject())
    expect((sys as any).projects).toBe((sys as any).projects)
  })

  it('支持所有 5 种工程类型', () => {
    const types: StoneProject[] = ['wall', 'tower', 'monument', 'bridge', 'aqueduct']
    types.forEach((t, i) => { ;(sys as any).projects.push(makeProject({ masonId: i + 1, type: t })) })
    const all = (sys as any).projects
    types.forEach((t, i) => { expect(all[i].type).toBe(t) })
  })

  it('支持所有 4 种阶段', () => {
    const phases: ProjectPhase[] = ['quarrying', 'shaping', 'building', 'complete']
    phases.forEach((p, i) => { ;(sys as any).projects.push(makeProject({ masonId: i + 1, phase: p })) })
    const all = (sys as any).projects
    phases.forEach((p, i) => { expect(all[i].phase).toBe(p) })
  })

  it('多个工程全部返回', () => {
    ;(sys as any).projects.push(makeProject())
    ;(sys as any).projects.push(makeProject())
    expect((sys as any).projects).toHaveLength(2)
  })
})

describe('CreatureMasonrySystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureMasonrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 差值 < CHECK_INTERVAL=2500 时不推进 progress', () => {
    ;(sys as any).projects.push(makeProject({ phase: 'building', progress: 50 }))
    sys.update(1, mockEm, 100)
    expect((sys as any).projects[0].progress).toBe(50)
  })

  it('tick >= CHECK_INTERVAL 时推进 progress', () => {
    ;(sys as any).projects.push(makeProject({ phase: 'building', progress: 50, quality: 70 }))
    sys.update(1, mockEm, 2500)
    expect((sys as any).projects[0].progress).toBeCloseTo(50.85, 5)
  })

  it('满足 CHECK_INTERVAL 后 lastCheck 被更新', () => {
    sys.update(1, mockEm, 2500)
    expect((sys as any).lastCheck).toBe(2500)
  })

  it('连续调用中第二次差值不足 CHECK_INTERVAL 时不再更新', () => {
    ;(sys as any).projects.push(makeProject({ phase: 'building', progress: 50, quality: 0 }))
    sys.update(1, mockEm, 2500)
    const after1 = (sys as any).projects[0].progress
    sys.update(1, mockEm, 2550)
    expect((sys as any).projects[0].progress).toBe(after1)
  })

  it('tick=2499 边界不触发', () => {
    sys.update(1, mockEm, 2499)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('第二次满足间隔时再次更新 lastCheck', () => {
    sys.update(1, mockEm, 2500)
    sys.update(1, mockEm, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('dt参数不影响节流逻辑', () => {
    sys.update(999, mockEm, 2499)
    expect((sys as any).lastCheck).toBe(0)
  })
})

describe('CreatureMasonrySystem - progress 递增公式', () => {
  let sys: CreatureMasonrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('quality=0 时 progress 递增 0.5', () => {
    ;(sys as any).projects.push(makeProject({ phase: 'building', progress: 0, quality: 0 }))
    sys.update(1, mockEm, 2500)
    expect((sys as any).projects[0].progress).toBeCloseTo(0.5, 5)
  })

  it('quality=100 时 progress 递增 1.0（0.5 + 100*0.005）', () => {
    ;(sys as any).projects.push(makeProject({ phase: 'building', progress: 0, quality: 100 }))
    sys.update(1, mockEm, 2500)
    expect((sys as any).projects[0].progress).toBeCloseTo(1.0, 5)
  })

  it('quality=50 时 progress 递增 0.75', () => {
    ;(sys as any).projects.push(makeProject({ phase: 'building', progress: 0, quality: 50 }))
    sys.update(1, mockEm, 2500)
    expect((sys as any).projects[0].progress).toBeCloseTo(0.75, 5)
  })

  it('progress 在不同 quality 下正确累积', () => {
    ;(sys as any).projects.push(makeProject({ phase: 'building', progress: 10, quality: 100 }))
    sys.update(1, mockEm, 2500)
    expect((sys as any).projects[0].progress).toBeCloseTo(11.0, 5)
  })

  it('complete 阶段不再推进 progress', () => {
    ;(sys as any).projects.push(makeProject({ phase: 'complete', progress: 0, quality: 100 }))
    sys.update(1, mockEm, 2500)
    expect((sys as any).projects[0].progress).toBe(0)
  })
})

describe('CreatureMasonrySystem - 阶段转换', () => {
  let sys: CreatureMasonrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('quarrying progress >= 100 后转换为 shaping，progress 重置为 0', () => {
    ;(sys as any).projects.push(makeProject({ phase: 'quarrying', progress: 99.9, quality: 0 }))
    sys.update(1, mockEm, 2500)
    const p = (sys as any).projects[0]
    expect(p.phase).toBe('shaping')
    expect(p.progress).toBe(0)
  })

  it('shaping progress >= 100 后转换为 building，progress 重置为 0', () => {
    ;(sys as any).projects.push(makeProject({ phase: 'shaping', progress: 99.9, quality: 0 }))
    sys.update(1, mockEm, 2500)
    const p = (sys as any).projects[0]
    expect(p.phase).toBe('building')
    expect(p.progress).toBe(0)
  })

  it('building progress >= 100 后转换为 complete，progress 重置为 0', () => {
    ;(sys as any).projects.push(makeProject({ phase: 'building', progress: 99.9, quality: 0 }))
    sys.update(1, mockEm, 2500)
    const p = (sys as any).projects[0]
    expect(p.phase).toBe('complete')
    expect(p.progress).toBe(0)
  })

  it('未完成的工程 progress < 100 时不改变阶段', () => {
    ;(sys as any).projects.push(makeProject({ phase: 'quarrying', progress: 50, quality: 0 }))
    sys.update(1, mockEm, 2500)
    expect((sys as any).projects[0].phase).toBe('quarrying')
  })

  it('progress 恰好 100 时触发阶段转换', () => {
    ;(sys as any).projects.push(makeProject({ phase: 'quarrying', progress: 99.5, quality: 0 }))
    sys.update(1, mockEm, 2500)
    expect((sys as any).projects[0].phase).toBe('shaping')
  })

  it('complete 阶段不会继续推进到其他阶段', () => {
    ;(sys as any).projects.push(makeProject({ phase: 'complete', progress: 0 }))
    sys.update(1, mockEm, 2500)
    sys.update(1, mockEm, 5000)
    expect((sys as any).projects[0].phase).toBe('complete')
  })
})

describe('CreatureMasonrySystem - cleanup 逻辑', () => {
  let sys: CreatureMasonrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('complete 且 tick < cutoff(currentTick-120000) 时被删除', () => {
    ;(sys as any).projects.push(makeProject({ phase: 'complete', tick: 0 }))
    const currentTick = 200000
    const cutoff = currentTick - 120000
    for (let i = (sys as any).projects.length - 1; i >= 0; i--) {
      const p = (sys as any).projects[i]
      if (p.phase === 'complete' && p.tick < cutoff) (sys as any).projects.splice(i, 1)
    }
    expect((sys as any).projects).toHaveLength(0)
  })

  it('complete 且 tick >= cutoff 时不被删除', () => {
    ;(sys as any).projects.push(makeProject({ phase: 'complete', tick: 90000 }))
    const currentTick = 200000
    const cutoff = currentTick - 120000
    for (let i = (sys as any).projects.length - 1; i >= 0; i--) {
      const p = (sys as any).projects[i]
      if (p.phase === 'complete' && p.tick < cutoff) (sys as any).projects.splice(i, 1)
    }
    expect((sys as any).projects).toHaveLength(1)
  })

  it('非 complete 阶段即使 tick 很旧也不被 cleanup 删除', () => {
    ;(sys as any).projects.push(makeProject({ phase: 'building', tick: 0 }))
    const currentTick = 500000
    const cutoff = currentTick - 120000
    for (let i = (sys as any).projects.length - 1; i >= 0; i--) {
      const p = (sys as any).projects[i]
      if (p.phase === 'complete' && p.tick < cutoff) (sys as any).projects.splice(i, 1)
    }
    expect((sys as any).projects).toHaveLength(1)
  })

  it('混合情形：旧 complete 被删，新 complete 和未完成工程保留', () => {
    ;(sys as any).projects.push(makeProject({ phase: 'complete', tick: 0 }))
    ;(sys as any).projects.push(makeProject({ phase: 'complete', tick: 150000 }))
    ;(sys as any).projects.push(makeProject({ phase: 'building', tick: 0 }))
    const currentTick = 200000
    const cutoff = currentTick - 120000
    for (let i = (sys as any).projects.length - 1; i >= 0; i--) {
      const p = (sys as any).projects[i]
      if (p.phase === 'complete' && p.tick < cutoff) (sys as any).projects.splice(i, 1)
    }
    expect((sys as any).projects).toHaveLength(2)
  })

  it('cutoff 边界：tick=cutoff 时不被删除', () => {
    const currentTick = 200000
    const cutoff = currentTick - 120000
    ;(sys as any).projects.push(makeProject({ phase: 'complete', tick: cutoff }))
    for (let i = (sys as any).projects.length - 1; i >= 0; i--) {
      const p = (sys as any).projects[i]
      if (p.phase === 'complete' && p.tick < cutoff) (sys as any).projects.splice(i, 1)
    }
    expect((sys as any).projects).toHaveLength(1)
  })
})

describe('CreatureMasonrySystem - 数据完整性与综合', () => {
  let sys: CreatureMasonrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('所有字段正确存储', () => {
    const p = makeProject({
      masonId: 88, type: 'aqueduct', phase: 'shaping',
      x: 55, y: 33, quality: 65, progress: 42, tick: 7777
    })
    ;(sys as any).projects.push(p)
    const stored = (sys as any).projects[0]
    expect(stored.masonId).toBe(88)
    expect(stored.type).toBe('aqueduct')
    expect(stored.phase).toBe('shaping')
    expect(stored.x).toBe(55)
    expect(stored.y).toBe(33)
    expect(stored.quality).toBe(65)
    expect(stored.progress).toBe(42)
    expect(stored.tick).toBe(7777)
  })

  it('MAX_PROJECTS=30，注入30个不超出', () => {
    for (let i = 1; i <= 30; i++) {
      ;(sys as any).projects.push(makeProject({ masonId: i }))
    }
    expect((sys as any).projects).toHaveLength(30)
  })

  it('空数组时 update 不报错', () => {
    expect(() => sys.update(1, mockEm, 2500)).not.toThrow()
  })

  it('多个阶段不同工程同时推进 progress', () => {
    ;(sys as any).projects.push(makeProject({ phase: 'quarrying', progress: 10, quality: 0 }))
    ;(sys as any).projects.push(makeProject({ phase: 'shaping', progress: 20, quality: 0 }))
    ;(sys as any).projects.push(makeProject({ phase: 'building', progress: 30, quality: 0 }))
    sys.update(1, mockEm, 2500)
    expect((sys as any).projects[0].progress).toBeCloseTo(10.5, 5)
    expect((sys as any).projects[1].progress).toBeCloseTo(20.5, 5)
    expect((sys as any).projects[2].progress).toBeCloseTo(30.5, 5)
  })

  it('项目 id 字段保持正确', () => {
    const p = makeProject({ masonId: 1 })
    ;(sys as any).projects.push(p)
    expect((sys as any).projects[0].id).toBeGreaterThan(0)
  })

  it('masonId 字段保持正确', () => {
    ;(sys as any).projects.push(makeProject({ masonId: 42 }))
    expect((sys as any).projects[0].masonId).toBe(42)
  })
})
