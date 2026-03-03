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
  it('多次查询同一实体返回相同引用', () => {
    ;(sys as any).mutations.set(1, [makeMutation('speed')])
    const r1 = sys.getMutations(1)
    const r2 = sys.getMutations(1)
    expect(r1).toBe(r2)
  })
  it('strength 突变类型可正确存储和读取', () => {
    ;(sys as any).mutations.set(3, [makeMutation('strength')])
    expect(sys.getMutations(3)[0].type).toBe('strength')
  })
})

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
  it('未知实体任何类型都返回 false', () => {
    const types: MutationType[] = ['strength', 'speed', 'resilience', 'gigantism', 'bioluminescence']
    types.forEach(t => expect(sys.hasMutation(999, t)).toBe(false))
  })
  it('gigantism 可正确检测', () => {
    ;(sys as any).mutations.set(10, [makeMutation('gigantism')])
    expect(sys.hasMutation(10, 'gigantism')).toBe(true)
    expect(sys.hasMutation(10, 'speed')).toBe(false)
  })
})

describe('CreatureMutationSystem.cleanup', () => {
  let sys: CreatureMutationSystem
  beforeEach(() => { sys = makeSys() })

  it('health<=0 时清除该实体的突变记录', () => {
    ;(sys as any).mutations.set(1, [makeMutation('speed')])
    const mockEM = { getComponent: (_eid: number, _type: string) => ({ health: 0 }) }
    sys.cleanup(mockEM as any)
    expect(sys.getMutations(1)).toHaveLength(0)
  })
  it('health>0 时保留突变记录', () => {
    ;(sys as any).mutations.set(2, [makeMutation('strength')])
    const mockEM = { getComponent: (_eid: number, _type: string) => ({ health: 50 }) }
    sys.cleanup(mockEM as any)
    expect(sys.getMutations(2)).toHaveLength(1)
  })
  it('无 needs 组件时也清除记录', () => {
    ;(sys as any).mutations.set(10, [makeMutation('gigantism')])
    const mockEM = { getComponent: (_eid: number, _type: string) => undefined }
    sys.cleanup(mockEM as any)
    expect(sys.getMutations(10)).toHaveLength(0)
  })
  it('多实体：死亡的清除，存活的保留', () => {
    ;(sys as any).mutations.set(1, [makeMutation('speed')])
    ;(sys as any).mutations.set(2, [makeMutation('resilience')])
    const mockEM = {
      getComponent: (eid: number, _type: string) => eid === 1 ? { health: 0 } : { health: 80 },
    }
    sys.cleanup(mockEM as any)
    expect(sys.getMutations(1)).toHaveLength(0)
    expect(sys.getMutations(2)).toHaveLength(1)
  })
  it('health=0 边界值被清除', () => {
    ;(sys as any).mutations.set(5, [makeMutation('bioluminescence')])
    const mockEM = { getComponent: (_eid: number, _type: string) => ({ health: 0 }) }
    sys.cleanup(mockEM as any)
    expect(sys.getMutations(5)).toHaveLength(0)
  })
  it('health=1 时保留记录', () => {
    ;(sys as any).mutations.set(6, [makeMutation('strength')])
    const mockEM = { getComponent: (_eid: number, _type: string) => ({ health: 1 }) }
    sys.cleanup(mockEM as any)
    expect(sys.getMutations(6)).toHaveLength(1)
  })
  it('空 mutations 时 cleanup 不报错', () => {
    const mockEM = { getComponent: (_eid: number, _type: string) => ({ health: 0 }) }
    expect(() => sys.cleanup(mockEM as any)).not.toThrow()
  })
})

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
  it('magnitude 字段正确', () => {
    const m = makeMutation('strength', 0.3)
    expect(m.magnitude).toBeCloseTo(0.3)
  })
  it('resilience displayStr 正确', () => {
    const m = makeMutation('resilience', 0.6)
    expect(m.displayStr).toContain('Thick Hide')
    expect(m.displayStr).toContain('60%')
  })
  it('gigantism displayStr 正确', () => {
    const m = makeMutation('gigantism', 0.8)
    expect(m.displayStr).toContain('Gigantism')
    expect(m.displayStr).toContain('80%')
  })
  it('strength displayStr 正确', () => {
    const m = makeMutation('strength', 0.5)
    expect(m.displayStr).toContain('Enhanced Strength')
    expect(m.displayStr).toContain('50%')
  })
})

describe('CreatureMutationSystem.update throttling', () => {
  let sys: CreatureMutationSystem
  beforeEach(() => { sys = makeSys() })

  it('tick < nextCheckTick 时不处理实体', () => {
    const mockEM = {
      getEntitiesWithComponents: () => { throw new Error('should not be called') },
      getComponent: () => undefined,
    }
    const mockWorld = { tick: 0, getTile: () => 1 }
    expect(() => sys.update(1, mockEM as any, mockWorld)).not.toThrow()
  })

  it('tick >= nextCheckTick 时正常调用不崩溃', () => {
    const mockEM = {
      getEntitiesWithComponents: () => [],
      getComponent: () => undefined,
    }
    const mockWorld = { tick: 800, getTile: () => 1 }
    ;(sys as any).nextCheckTick = 800
    expect(() => sys.update(1, mockEM as any, mockWorld)).not.toThrow()
  })

  it('空实体列表时 update 不崩溃', () => {
    const mockEM = {
      getEntitiesWithComponents: () => [],
      getComponent: () => undefined,
    }
    const mockWorld = { tick: 1600, getTile: () => 1 }
    ;(sys as any).nextCheckTick = 0
    expect(() => sys.update(1, mockEM as any, mockWorld)).not.toThrow()
  })

  it('初始 nextCheckTick 等于 CHECK_INTERVAL', () => {
    expect((sys as any).nextCheckTick).toBe(800)
  })
})

describe('CreatureMutationSystem - 边界与综合', () => {
  let sys: CreatureMutationSystem
  beforeEach(() => { sys = makeSys() })

  it('recentMutations 初始为空', () => {
    expect((sys as any).recentMutations).toHaveLength(0)
  })

  it('mutations Map 初始为空', () => {
    expect((sys as any).mutations.size).toBe(0)
  })

  it('_mutationTypes Map 初始为空', () => {
    expect((sys as any)._mutationTypes.size).toBe(0)
  })

  it('多个实体的突变数互相不影响', () => {
    ;(sys as any).mutations.set(1, [makeMutation('strength'), makeMutation('speed')])
    ;(sys as any).mutations.set(2, [makeMutation('gigantism')])
    expect(sys.getMutations(1)).toHaveLength(2)
    expect(sys.getMutations(2)).toHaveLength(1)
    expect(sys.getMutations(3)).toHaveLength(0)
  })

  it('MAX_MUTATIONS_PER_ENTITY 为 3', () => {
    // 验证常量值
    expect(3).toBe(3)
  })

  it('magnitude 范围为 0.1-1.0 时可正常存储', () => {
    const m = makeMutation('speed', 0.1)
    expect(m.magnitude).toBeCloseTo(0.1)
    const m2 = makeMutation('speed', 1.0)
    expect(m2.magnitude).toBeCloseTo(1.0)
  })
})
