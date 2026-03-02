import { describe, it, expect, beforeEach } from 'vitest'
import { LODRenderSystem } from '../systems/LODRenderSystem'
import type { LODLevel } from '../systems/LODRenderSystem'

// DEFAULT_THRESHOLDS: full=20, medium=10, low=4
// zoom >= full → 'full', zoom >= medium → 'medium', zoom >= low → 'low', else → 'icon'

function makeSys() { return new LODRenderSystem() }
function makeCamera(zoom: number) { return { zoom } as any }

describe('LODRenderSystem', () => {
  let sys: LODRenderSystem

  beforeEach(() => { sys = makeSys() })

  it('getLOD返回LOD级别', () => { expect(typeof sys.getLOD()).toBe('string') })
  it('初始currentLOD与getLOD()一致', () => { expect((sys as any).currentLOD).toBe(sys.getLOD()) })
  it('setThresholds不崩溃', () => { expect(() => sys.setThresholds({ full: 2 })).not.toThrow() })

  // ── update: LOD级别计算（默认阈值 full=20, medium=10, low=4）────────────

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

  // ── setThresholds: 自定义阈值 ───────────────────────────────────────────

  it('setThresholds后新阈值生效', () => {
    sys.setThresholds({ full: 2, medium: 1, low: 0.5 })
    sys.update(makeCamera(2))
    expect(sys.getLOD()).toBe('full')
  })

  it('setThresholds部分覆盖：只修改full，其余保持默认', () => {
    sys.setThresholds({ full: 5 })  // medium=10, low=4不变
    // zoom=8: >=4但<10 → 'low' (8 < new full=5? 不，8>=5所以medium不会... 等等)
    // full=5, medium=10不变 → zoom=8: 8<10所以不是medium，8>=4所以low? 不，full=5，8>=5 → full!
    sys.update(makeCamera(8))
    expect(sys.getLOD()).toBe('full')  // 8 >= 5 (new full threshold)
  })

  it('setThresholds后zoom低于新阈值降级', () => {
    sys.setThresholds({ full: 50 })
    sys.update(makeCamera(20))  // 20 < 50 → not full; 20 >= 10 → medium
    expect(sys.getLOD()).toBe('medium')
  })

  // ── LODLevel 完整性 ──────────────────────────────────────────────────────

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
})
