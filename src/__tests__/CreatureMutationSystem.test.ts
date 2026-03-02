import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureMutationSystem } from '../systems/CreatureMutationSystem'
import type { Mutation, MutationType } from '../systems/CreatureMutationSystem'

function makeSys(): CreatureMutationSystem { return new CreatureMutationSystem() }
function makeMutation(type: MutationType = 'strength', magnitude = 0.5, tick = 0): Mutation {
  const magnitudeStr = (magnitude * 100).toFixed(0)
  const labels: Record<MutationType, string> = {
    strength: 'Enhanced Strength', speed: 'Hyper Speed', resilience: 'Thick Hide',
    gigantism: 'Gigantism', bioluminescence: 'Bioluminescence',
  }
  return { type, magnitude, tick, magnitudeStr, displayStr: `* ${labels[type]} (${magnitudeStr}%)` }
}

// ─── getMutations ────────────────────────────────────────────────────────────
describe('CreatureMutationSystem.getMutations', () => {
  let sys: CreatureMutationSystem
  beforeEach(() => { sys = makeSys() })

  it('未知实体返回空数组', () => { expect(sys.getMutations(999)).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).mutations.set(1, [makeMutation('speed')])
    expect(sys.getMutations(1)).toHaveLength(1)
    expect(sys.getMutations(1)[0].type).toBe('speed')
  })
  it('支持所有 5 种突变类型', () => {
    const types: MutationType[] = ['strength', 'speed', 'resilience', 'gigantism', 'bioluminescence']
    ;(sys as any).mutations.set(1, types.map(t => makeMutation(t)))
    expect(sys.getMutations(1)).toHaveLength(5)
    types.forEach((t, i) => { expect(sys.getMutations(1)[i].type).toBe(t) })
  })
  it('返回的数组与内部引用一致', () => {
    const arr = [makeMutation('gigantism')]
    ;(sys as any).mutations.set(1, arr)
    expect(sys.getMutations(1)).toBe(arr)
  })
  it('不同实体的突变互相独立', () => {
    ;(sys as any).mutations.set(1, [makeMutation('strength')])
    ;(sys as any).mutations.set(2, [makeMutation('speed'), makeMutation('resilience')])
    expect(sys.getMutations(1)).toHaveLength(1)
    expect(sys.getMutations(2)).toHaveLength(2)
  })
  it('空数组实体返回空', () => {
    ;(sys as any).mutations.set(5, [])
    expect(sys.getMutations(5)).toHaveLength(0)
  })
})

// ─── hasMutation ─────────────────────────────────────────────────────────────
describe('CreatureMutationSystem.hasMutation', () => {
  let sys: CreatureMutationSystem
  beforeEach(() => { sys = makeSys() })

  it('无突变返回 false', () => { expect(sys.hasMutation(1, 'strength')).toBe(false) })
  it('有对应突变返回 true', () => {
    ;(sys as any).mutations.set(1, [makeMutation('gigantism')])
    expect(sys.hasMutation(1, 'gigantism')).toBe(true)
    expect(sys.hasMutation(1, 'speed')).toBe(false)
  })
  it('O(1) 类型索引：注入 _mutationTypes 后走快速路径', () => {
    const typeSet = new Set<MutationType>(['bioluminescence'])
    ;(sys as any)._mutationTypes.set(7, typeSet)
    expect(sys.hasMutation(7, 'bioluminescence')).toBe(true)
    expect(sys.hasMutation(7, 'strength')).toBe(false)
  })
  it('fallback路径：仅注入 mutations 无 _mutationTypes 时仍正确', () => {
    ;(sys as any).mutations.set(3, [makeMutation('resilience')])
    expect(sys.hasMutation(3, 'resilience')).toBe(true)
    expect(sys.hasMutation(3, 'gigantism')).toBe(false)
  })
  it('5 种类型均可正确检测', () => {
    const types: MutationType[] = ['strength', 'speed', 'resilience', 'gigantism', 'bioluminescence']
    ;(sys as any).mutations.set(9, types.map(t => makeMutation(t)))
    types.forEach(t => expect(sys.hasMutation(9, t)).toBe(true))
  })
})

// ─── cleanup ─────────────────────────────────────────────────────────────────
describe('CreatureMutationSystem.cleanup', () => {
  let sys: CreatureMutationSystem
  beforeEach(() => { sys = makeSys() })

  it('health<=0 时清除该实体的突变记录', () => {
    ;(sys as any).mutations.set(1, [makeMutation('speed')])
    const mockEM = {
      getComponent: (_eid: number, _type: string) => ({ health: 0 }),
    }
    sys.cleanup(mockEM as any)
    expect(sys.getMutations(1)).toHaveLength(0)
  })
  it('health>0 时保留突变记录', () => {
    ;(sys as any).mutations.set(2, [makeMutation('strength')])
    const mockEM = {
      getComponent: (_eid: number, _type: string) => ({ health: 50 }),
    }
    sys.cleanup(mockEM as any)
    expect(sys.getMutations(2)).toHaveLength(1)
  })
  it('无 needs 组件时也清除记录', () => {
    ;(sys as any).mutations.set(10, [makeMutation('gigantism')])
    const mockEM = {
      getComponent: (_eid: number, _type: string) => undefined,
    }
    sys.cleanup(mockEM as any)
    expect(sys.getMutations(10)).toHaveLength(0)
  })
  it('多实体：死亡的清除，存活的保留', () => {
    ;(sys as any).mutations.set(1, [makeMutation('speed')])    // will die
    ;(sys as any).mutations.set(2, [makeMutation('resilience')]) // will survive
    const mockEM = {
      getComponent: (eid: number, _type: string) => eid === 1 ? { health: 0 } : { health: 80 },
    }
    sys.cleanup(mockEM as any)
    expect(sys.getMutations(1)).toHaveLength(0)
    expect(sys.getMutations(2)).toHaveLength(1)
  })
})

// ─── Mutation 数据结构 ────────────────────────────────────────────────────────
describe('Mutation data integrity', () => {
  it('magnitudeStr 是 magnitude*100 的整数字符串', () => {
    const m = makeMutation('strength', 0.75)
    expect(m.magnitudeStr).toBe('75')
  })
  it('displayStr 包含标签和百分比', () => {
    const m = makeMutation('speed', 0.4)
    expect(m.displayStr).toContain('Hyper Speed')
    expect(m.displayStr).toContain('40%')
  })
  it('bioluminescence displayStr 正确', () => {
    const m = makeMutation('bioluminescence', 1.0)
    expect(m.displayStr).toContain('Bioluminescence')
    expect(m.displayStr).toContain('100%')
  })
  it('tick 字段正确记录', () => {
    const m = makeMutation('resilience', 0.5, 9999)
    expect(m.tick).toBe(9999)
  })
})

// ─── update：节流行为 (CHECK_INTERVAL=800) ────────────────────────────────────
describe('CreatureMutationSystem.update throttling', () => {
  let sys: CreatureMutationSystem
  beforeEach(() => { sys = makeSys() })

  it('tick < nextCheckTick 时不处理实体', () => {
    const mockEM = {
      getEntitiesWithComponents: () => { throw new Error('should not be called') },
      getComponent: () => undefined,
    }
    const mockWorld = { tick: 0, getTile: () => 1 }
    // nextCheckTick 初始为 CHECK_INTERVAL(800)，tick=0 < 800，不应调用 getEntitiesWithComponents
    expect(() => sys.update(1, mockEM as any, mockWorld)).not.toThrow()
  })
  it('tick >= nextCheckTick 时正常调用不崩溃', () => {
    const mockEM = {
      getEntitiesWithComponents: () => [],
      getComponent: () => undefined,
    }
    const mockWorld = { tick: 800, getTile: () => 1 }
    // 强制设置 nextCheckTick 为 800
    ;(sys as any).nextCheckTick = 800
    expect(() => sys.update(1, mockEM as any, mockWorld)).not.toThrow()
  })
})
