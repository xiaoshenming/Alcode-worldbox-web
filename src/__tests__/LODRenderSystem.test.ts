import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { LODRenderSystem } from '../systems/LODRenderSystem'
import type { LODLevel } from '../systems/LODRenderSystem'

// DEFAULT_THRESHOLDS: full=20, medium=10, low=4
// zoom >= full → 'full', zoom >= medium → 'medium', zoom >= low → 'low', else → 'icon'

function makeSys() { return new LODRenderSystem() }
function makeCamera(zoom: number) { return { zoom } as any }

describe('LODRenderSystem 基础构造', () => {
  let sys: LODRenderSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('getLOD返回LOD级别', () => { expect(typeof sys.getLOD()).toBe('string') })
  it('初始currentLOD与getLOD()一致', () => { expect((sys as any).currentLOD).toBe(sys.getLOD()) })
  it('setThresholds不崩溃', () => { expect(() => sys.setThresholds({ full: 2 })).not.toThrow() })
  it('初始 currentLOD 为 full（默认阈值 full=20，初始值）', () => {
    expect(sys.getLOD()).toBe('full')
  })
  it('getLOD 返回值为4种 LODLevel 之一', () => {
    const valid: LODLevel[] = ['full', 'medium', 'low', 'icon']
    expect(valid).toContain(sys.getLOD())
  })
  it('初始 thresholds 为默认值', () => {
    expect((sys as any).thresholds.full).toBe(20)
    expect((sys as any).thresholds.medium).toBe(10)
    expect((sys as any).thresholds.low).toBe(4)
  })
  it('多次实例化互不干扰', () => {
    const s1 = makeSys()
    const s2 = makeSys()
    s1.setThresholds({ full: 5 })
    expect((s2 as any).thresholds.full).toBe(20)
  })
})

describe('LODRenderSystem update：默认��值 LOD 级别计算', () => {
  let sys: LODRenderSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('zoom>=20时LOD为full', () => {
    sys.update(makeCamera(20))
    expect(sys.getLOD()).toBe('full')
  })

  it('zoom>20时LOD为full', () => {
    sys.update(makeCamera(30))
    expect(sys.getLOD()).toBe('full')
  })

  it('zoom=10时LOD为medium（>=10且<20）', () => {
    sys.update(makeCamera(10))
    expect(sys.getLOD()).toBe('medium')
  })

  it('zoom=15时LOD为medium', () => {
    sys.update(makeCamera(15))
    expect(sys.getLOD()).toBe('medium')
  })

  it('zoom=4时LOD为low（>=4且<10）', () => {
    sys.update(makeCamera(4))
    expect(sys.getLOD()).toBe('low')
  })

  it('zoom=7时LOD为low', () => {
    sys.update(makeCamera(7))
    expect(sys.getLOD()).toBe('low')
  })

  it('zoom=3时LOD为icon（<4）', () => {
    sys.update(makeCamera(3))
    expect(sys.getLOD()).toBe('icon')
  })

  it('zoom=1时LOD为icon', () => {
    sys.update(makeCamera(1))
    expect(sys.getLOD()).toBe('icon')
  })

  it('zoom=0时LOD为icon', () => {
    sys.update(makeCamera(0))
    expect(sys.getLOD()).toBe('icon')
  })

  it('zoom=0.001时LOD为icon（极小值）', () => {
    sys.update(makeCamera(0.001))
    expect(sys.getLOD()).toBe('icon')
  })

  it('zoom=19.999时LOD为medium（恰好低于full阈值）', () => {
    sys.update(makeCamera(19.999))
    expect(sys.getLOD()).toBe('medium')
  })

  it('zoom=9.999时LOD为low（恰好低于medium阈值）', () => {
    sys.update(makeCamera(9.999))
    expect(sys.getLOD()).toBe('low')
  })

  it('zoom=3.999时LOD为icon（恰好低于low阈值）', () => {
    sys.update(makeCamera(3.999))
    expect(sys.getLOD()).toBe('icon')
  })

  it('zoom=4.001时LOD为low（恰好高于low阈值）', () => {
    sys.update(makeCamera(4.001))
    expect(sys.getLOD()).toBe('low')
  })

  it('zoom=10.001时LOD为medium（恰好高于medium阈值）', () => {
    sys.update(makeCamera(10.001))
    expect(sys.getLOD()).toBe('medium')
  })

  it('zoom=20.001时LOD为full（恰好高于full阈值）', () => {
    sys.update(makeCamera(20.001))
    expect(sys.getLOD()).toBe('full')
  })

  it('zoom=100时LOD为full（超大缩放）', () => {
    sys.update(makeCamera(100))
    expect(sys.getLOD()).toBe('full')
  })

  it('zoom=1000时LOD为full（极大值）', () => {
    sys.update(makeCamera(1000))
    expect(sys.getLOD()).toBe('full')
  })

  it('zoom=-1时LOD为icon（负值）', () => {
    sys.update(makeCamera(-1))
    expect(sys.getLOD()).toBe('icon')
  })

  it('zoom=-100时LOD为icon（极大负值）', () => {
    sys.update(makeCamera(-100))
    expect(sys.getLOD()).toBe('icon')
  })
})

describe('LODRenderSystem setThresholds：自定义阈值', () => {
  let sys: LODRenderSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('setThresholds后新阈值生效', () => {
    sys.setThresholds({ full: 2, medium: 1, low: 0.5 })
    sys.update(makeCamera(2))
    expect(sys.getLOD()).toBe('full')
  })

  it('setThresholds部分覆盖：只修改full，其余保持默认', () => {
    sys.setThresholds({ full: 5 })
    sys.update(makeCamera(8))
    expect(sys.getLOD()).toBe('full')  // 8 >= 5 (new full threshold)
  })

  it('setThresholds后zoom低于新阈值降级', () => {
    sys.setThresholds({ full: 50 })
    sys.update(makeCamera(20))  // 20 < 50 → not full; 20 >= 10 → medium
    expect(sys.getLOD()).toBe('medium')
  })

  it('setThresholds只修改medium', () => {
    sys.setThresholds({ medium: 5 })
    sys.update(makeCamera(7))  // 7 >= 5 → medium; 7 < 20 → not full
    expect(sys.getLOD()).toBe('medium')
  })

  it('setThresholds只修改low', () => {
    sys.setThresholds({ low: 8 })
    sys.update(makeCamera(5))  // 5 < 8 → icon
    expect(sys.getLOD()).toBe('icon')
  })

  it('setThresholds修改low后高于新low但低于medium', () => {
    sys.setThresholds({ low: 2 })
    sys.update(makeCamera(3))  // 3 >= 2 → low; 3 < 10 → not medium
    expect(sys.getLOD()).toBe('low')
  })

  it('setThresholds全覆盖后正确工作', () => {
    sys.setThresholds({ full: 100, medium: 50, low: 10 })
    sys.update(makeCamera(100))
    expect(sys.getLOD()).toBe('full')
    sys.update(makeCamera(50))
    expect(sys.getLOD()).toBe('medium')
    sys.update(makeCamera(10))
    expect(sys.getLOD()).toBe('low')
    sys.update(makeCamera(5))
    expect(sys.getLOD()).toBe('icon')
  })

  it('setThresholds传入空对象不改变阈值', () => {
    sys.setThresholds({})
    expect((sys as any).thresholds.full).toBe(20)
    expect((sys as any).thresholds.medium).toBe(10)
    expect((sys as any).thresholds.low).toBe(4)
  })

  it('连续多次setThresholds只有最后一次生效', () => {
    sys.setThresholds({ full: 50 })
    sys.setThresholds({ full: 30 })
    sys.setThresholds({ full: 15 })
    expect((sys as any).thresholds.full).toBe(15)
    sys.update(makeCamera(15))
    expect(sys.getLOD()).toBe('full')
  })

  it('setThresholds后内部 thresholds 字段正确更新', () => {
    sys.setThresholds({ full: 99, medium: 55, low: 11 })
    expect((sys as any).thresholds.full).toBe(99)
    expect((sys as any).thresholds.medium).toBe(55)
    expect((sys as any).thresholds.low).toBe(11)
  })

  it('setThresholds极小阈值：zoom=0.1时可能达到full', () => {
    sys.setThresholds({ full: 0.1, medium: 0.05, low: 0.01 })
    sys.update(makeCamera(0.1))
    expect(sys.getLOD()).toBe('full')
  })

  it('setThresholds极大阈值：zoom=1000仍低于full', () => {
    sys.setThresholds({ full: 9999, medium: 5000, low: 1000 })
    sys.update(makeCamera(1000))
    expect(sys.getLOD()).toBe('low')
  })
})

describe('LODRenderSystem update：LOD 切换与连续性', () => {
  let sys: LODRenderSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('连续update可以切换LOD级别', () => {
    sys.update(makeCamera(25))
    expect(sys.getLOD()).toBe('full')
    sys.update(makeCamera(5))
    expect(sys.getLOD()).toBe('low')
    sys.update(makeCamera(1))
    expect(sys.getLOD()).toBe('icon')
    sys.update(makeCamera(12))
    expect(sys.getLOD()).toBe('medium')
  })

  it('4种LODLevel值均可由update产生', () => {
    const levels = new Set<LODLevel>()
    sys.update(makeCamera(25)); levels.add(sys.getLOD())
    sys.update(makeCamera(12)); levels.add(sys.getLOD())
    sys.update(makeCamera(5));  levels.add(sys.getLOD())
    sys.update(makeCamera(1));  levels.add(sys.getLOD())
    expect(levels.size).toBe(4)
  })

  it('update 后 currentLOD 字段与 getLOD() 保持一致', () => {
    sys.update(makeCamera(12))
    expect((sys as any).currentLOD).toBe(sys.getLOD())
  })

  it('full→icon→full 来回切换正确', () => {
    sys.update(makeCamera(25))
    expect(sys.getLOD()).toBe('full')
    sys.update(makeCamera(1))
    expect(sys.getLOD()).toBe('icon')
    sys.update(makeCamera(25))
    expect(sys.getLOD()).toBe('full')
  })

  it('medium→low→medium 来回切换正确', () => {
    sys.update(makeCamera(15))
    expect(sys.getLOD()).toBe('medium')
    sys.update(makeCamera(5))
    expect(sys.getLOD()).toBe('low')
    sys.update(makeCamera(15))
    expect(sys.getLOD()).toBe('medium')
  })

  it('update 不改变 thresholds', () => {
    sys.update(makeCamera(5))
    expect((sys as any).thresholds.full).toBe(20)
    expect((sys as any).thresholds.medium).toBe(10)
    expect((sys as any).thresholds.low).toBe(4)
  })

  it('同一zoom值多次update结果相同（幂等）', () => {
    sys.update(makeCamera(7))
    const first = sys.getLOD()
    sys.update(makeCamera(7))
    expect(sys.getLOD()).toBe(first)
  })

  it('update 后 getLOD 立即生效（同步）', () => {
    sys.update(makeCamera(2))
    expect(sys.getLOD()).toBe('icon')
  })

  it('阈值边界 zoom 精确等于 full 时为 full', () => {
    sys.update(makeCamera(20))
    expect(sys.getLOD()).toBe('full')
  })

  it('阈值边界 zoom 精确等于 medium 时为 medium', () => {
    sys.update(makeCamera(10))
    expect(sys.getLOD()).toBe('medium')
  })

  it('阈值边界 zoom 精确等于 low 时为 low', () => {
    sys.update(makeCamera(4))
    expect(sys.getLOD()).toBe('low')
  })
})

describe('LODRenderSystem LODLevel 完整性', () => {
  afterEach(() => vi.restoreAllMocks())

  it('4种LODLevel值均不同', () => {
    const levels: LODLevel[] = ['full', 'medium', 'low', 'icon']
    const set = new Set(levels)
    expect(set.size).toBe(4)
  })

  it('LODLevel 均为字符串类型', () => {
    const levels: LODLevel[] = ['full', 'medium', 'low', 'icon']
    for (const l of levels) expect(typeof l).toBe('string')
  })

  it('setThresholds不影响已有LOD值直到下次update', () => {
    const sys = makeSys()
    sys.update(makeCamera(12))
    const before = sys.getLOD()
    sys.setThresholds({ full: 100 })
    // 没有再次 update，LOD 不变
    expect(sys.getLOD()).toBe(before)
  })

  it('全部阈值相等时 zoom 等于该值结果为 full', () => {
    const sys = makeSys()
    sys.setThresholds({ full: 10, medium: 10, low: 10 })
    sys.update(makeCamera(10))
    expect(sys.getLOD()).toBe('full')
  })

  it('zoom=NaN 时不抛出（健壮性）', () => {
    const sys = makeSys()
    expect(() => sys.update(makeCamera(NaN))).not.toThrow()
  })
})
