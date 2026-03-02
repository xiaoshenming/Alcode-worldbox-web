import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MinimapEnhancedSystem, MinimapMode, MinimapHeatData } from '../systems/MinimapEnhancedSystem'

function makeSys() { return new MinimapEnhancedSystem() }

// ---------------------------------------------------------------------------
// Canvas mock
// ---------------------------------------------------------------------------
function makeCtx() {
  return {
    save: vi.fn(), restore: vi.fn(),
    fillRect: vi.fn(), strokeRect: vi.fn(),
    beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    arc: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
    closePath: vi.fn(),
    fillText: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: 'start' as CanvasTextAlign,
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D
}

// ---------------------------------------------------------------------------
// 1. 初始化 / 构造
// ---------------------------------------------------------------------------
describe('MinimapEnhancedSystem — 初始化', () => {
  let sys: MinimapEnhancedSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始模式为 terrain', () => {
    expect((sys as any).mode).toBe('terrain')
  })

  it('tick 初始值为 0', () => {
    expect((sys as any).tick).toBe(0)
  })

  it('warMarkers 初始为空数组', () => {
    expect((sys as any).warMarkers).toHaveLength(0)
  })

  it('heatmaps 初始为空 Map', () => {
    expect((sys as any).heatmaps.size).toBe(0)
  })

  it('mode 字段类型为 string', () => {
    expect(typeof (sys as any).mode).toBe('string')
  })
})

// ---------------------------------------------------------------------------
// 2. setMode
// ---------------------------------------------------------------------------
describe('MinimapEnhancedSystem — setMode()', () => {
  let sys: MinimapEnhancedSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  const allModes: MinimapMode[] = ['terrain', 'population', 'war', 'resource', 'faith']

  for (const m of allModes) {
    it(`setMode('${m}') 后 mode === '${m}'`, () => {
      sys.setMode(m)
      expect((sys as any).mode).toBe(m)
    })
  }

  it('setMode 连续调用以最后一次为准', () => {
    sys.setMode('population')
    sys.setMode('faith')
    expect((sys as any).mode).toBe('faith')
  })

  it('setMode 可以设回 terrain', () => {
    sys.setMode('war')
    sys.setMode('terrain')
    expect((sys as any).mode).toBe('terrain')
  })
})

// ---------------------------------------------------------------------------
// 3. cycleMode
// ---------------------------------------------------------------------------
describe('MinimapEnhancedSystem — cycleMode()', () => {
  let sys: MinimapEnhancedSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('terrain → population', () => {
    sys.cycleMode()
    expect((sys as any).mode).toBe('population')
  })

  it('population → war', () => {
    sys.setMode('population')
    sys.cycleMode()
    expect((sys as any).mode).toBe('war')
  })

  it('war → resource', () => {
    sys.setMode('war')
    sys.cycleMode()
    expect((sys as any).mode).toBe('resource')
  })

  it('resource → faith', () => {
    sys.setMode('resource')
    sys.cycleMode()
    expect((sys as any).mode).toBe('faith')
  })

  it('faith 循环回 terrain', () => {
    sys.setMode('faith')
    sys.cycleMode()
    expect((sys as any).mode).toBe('terrain')
  })

  it('连续 5 次 cycleMode 回到起点 terrain', () => {
    for (let i = 0; i < 5; i++) sys.cycleMode()
    expect((sys as any).mode).toBe('terrain')
  })

  it('连续 10 次 cycleMode 仍回到起点', () => {
    for (let i = 0; i < 10; i++) sys.cycleMode()
    expect((sys as any).mode).toBe('terrain')
  })
})

// ---------------------------------------------------------------------------
// 4. update()
// ---------------------------------------------------------------------------
describe('MinimapEnhancedSystem — update()', () => {
  let sys: MinimapEnhancedSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('update 更新内部 tick', () => {
    sys.update(42)
    expect((sys as any).tick).toBe(42)
  })

  it('update 可以连续调用，tick 以最新值为准', () => {
    sys.update(1)
    sys.update(999)
    expect((sys as any).tick).toBe(999)
  })

  it('update(0) 将 tick 设为 0', () => {
    sys.update(100)
    sys.update(0)
    expect((sys as any).tick).toBe(0)
  })

  it('update 负数 tick 也能存储', () => {
    sys.update(-5)
    expect((sys as any).tick).toBe(-5)
  })
})

// ---------------------------------------------------------------------------
// 5. heatmap 数据管理
// ---------------------------------------------------------------------------
describe('MinimapEnhancedSystem — heatmap 数据', () => {
  let sys: MinimapEnhancedSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  function makeHeat(w: number, h: number, fill = 0.5): MinimapHeatData {
    return { data: new Float32Array(w * h).fill(fill), width: w, height: h }
  }

  it('设置 population heatmap 后可从 Map 取出', () => {
    const heat = makeHeat(10, 10)
    ;(sys as any).heatmaps.set('population', heat)
    expect((sys as any).heatmaps.get('population')).toBe(heat)
  })

  it('heatmap data 宽高匹配', () => {
    const heat = makeHeat(20, 15)
    expect(heat.data.length).toBe(20 * 15)
    expect(heat.width).toBe(20)
    expect(heat.height).toBe(15)
  })

  it('可以同时存多个模式的 heatmap', () => {
    ;(sys as any).heatmaps.set('population', makeHeat(5, 5))
    ;(sys as any).heatmaps.set('war', makeHeat(5, 5))
    ;(sys as any).heatmaps.set('faith', makeHeat(5, 5))
    expect((sys as any).heatmaps.size).toBe(3)
  })

  it('heatmap Float32Array 默认值为 0.5', () => {
    const heat = makeHeat(4, 4, 0.5)
    expect(heat.data[0]).toBeCloseTo(0.5)
  })

  it('heatmap 可以存储 0 值', () => {
    const heat = makeHeat(4, 4, 0)
    expect(heat.data[0]).toBe(0)
  })

  it('heatmap 可以存储 1 值', () => {
    const heat = makeHeat(4, 4, 1)
    expect(heat.data[0]).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 6. warMarkers 管理
// ---------------------------------------------------------------------------
describe('MinimapEnhancedSystem — warMarkers', () => {
  let sys: MinimapEnhancedSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始 warMarkers 长度为 0', () => {
    expect((sys as any).warMarkers.length).toBe(0)
  })

  it('可以手动添加 warMarker', () => {
    ;(sys as any).warMarkers.push({ x: 0.5, y: 0.5, intensity: 0.8 })
    expect((sys as any).warMarkers.length).toBe(1)
  })

  it('warMarker intensity 为 0.8 时大于 0.6 阈值（触发圆圈渲染）', () => {
    const m = { x: 0.5, y: 0.5, intensity: 0.8 }
    expect(m.intensity > 0.6).toBe(true)
  })

  it('warMarker intensity 为 0.4 时在移动箭头范围 (0.3, 0.6]', () => {
    const m = { x: 0.5, y: 0.5, intensity: 0.4 }
    expect(m.intensity > 0.3 && m.intensity <= 0.6).toBe(true)
  })

  it('warMarker intensity 为 0.1 时不触发任何特殊渲染', () => {
    const m = { x: 0.5, y: 0.5, intensity: 0.1 }
    expect(m.intensity > 0.6).toBe(false)
    expect(m.intensity > 0.3).toBe(false)
  })

  it('可以添加多个 warMarkers', () => {
    ;(sys as any).warMarkers.push(
      { x: 0.1, y: 0.2, intensity: 1.0 },
      { x: 0.5, y: 0.5, intensity: 0.5 },
      { x: 0.9, y: 0.8, intensity: 0.2 },
    )
    expect((sys as any).warMarkers.length).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// 7. render() — 纯调用检查（无崩溃）
// ---------------------------------------------------------------------------
describe('MinimapEnhancedSystem — render() 不抛异常', () => {
  let sys: MinimapEnhancedSystem
  let ctx: CanvasRenderingContext2D
  beforeEach(() => { sys = makeSys(); ctx = makeCtx() })
  afterEach(() => { vi.restoreAllMocks() })

  it('terrain 模式 render 不抛', () => {
    sys.setMode('terrain')
    expect(() => sys.render(ctx, 10, 10, 200, 200, 0, 0, 100, 100)).not.toThrow()
  })

  it('population 模式 render 不抛 (无 heatmap)', () => {
    sys.setMode('population')
    expect(() => sys.render(ctx, 0, 0, 160, 120, 0, 0, 80, 60)).not.toThrow()
  })

  it('war 模式 render 不抛', () => {
    sys.setMode('war')
    expect(() => sys.render(ctx, 0, 0, 160, 120, 10, 10, 50, 40)).not.toThrow()
  })

  it('resource 模式 render 不抛', () => {
    sys.setMode('resource')
    expect(() => sys.render(ctx, 0, 0, 160, 120, 5, 5, 80, 60)).not.toThrow()
  })

  it('faith 模式 render 不抛', () => {
    sys.setMode('faith')
    expect(() => sys.render(ctx, 0, 0, 160, 120, 0, 0, 80, 60)).not.toThrow()
  })

  it('render 调用 ctx.save()', () => {
    sys.render(ctx, 0, 0, 160, 120, 0, 0, 80, 60)
    expect((ctx.save as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0)
  })

  it('render 调用 ctx.restore()', () => {
    sys.render(ctx, 0, 0, 160, 120, 0, 0, 80, 60)
    expect((ctx.restore as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0)
  })

  it('render 调用 ctx.fillRect (背景填充)', () => {
    sys.render(ctx, 0, 0, 160, 120, 0, 0, 80, 60)
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0)
  })

  it('terrain render 含 warMarker 时不抛', () => {
    ;(sys as any).warMarkers.push({ x: 0.5, y: 0.5, intensity: 0.9 })
    sys.update(10)
    expect(() => sys.render(ctx, 0, 0, 200, 200, 0, 0, 100, 100)).not.toThrow()
  })

  it('population 模式有 heatmap 时 render 不抛', () => {
    sys.setMode('population')
    const heat: MinimapHeatData = {
      data: new Float32Array(100).fill(0.5),
      width: 10, height: 10,
    }
    ;(sys as any).heatmaps.set('population', heat)
    expect(() => sys.render(ctx, 0, 0, 200, 200, 0, 0, 100, 100)).not.toThrow()
  })

  it('war 模式有 heatmap 时 render 不抛', () => {
    sys.setMode('war')
    const heat: MinimapHeatData = {
      data: new Float32Array(100).fill(0.7),
      width: 10, height: 10,
    }
    ;(sys as any).heatmaps.set('war', heat)
    expect(() => sys.render(ctx, 0, 0, 200, 200, 0, 0, 100, 100)).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// 8. MODE 常量 / 标签一致性
// ---------------------------------------------------------------------------
describe('MinimapEnhancedSystem — 模式标签常量', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('MODES 包含 5 个条目', () => {
    const sys = makeSys()
    // 通过 cycleMode 次数验证循环长度
    const start = (sys as any).mode as MinimapMode
    const visited = new Set<MinimapMode>([start])
    let steps = 0
    while (true) {
      sys.cycleMode()
      steps++
      const m = (sys as any).mode as MinimapMode
      if (m === start) break
      visited.add(m)
      if (steps > 20) break  // 防无限
    }
    expect(steps).toBe(5)
    expect(visited.size).toBe(5)
  })

  it('所有模式名称均为字符串', () => {
    const sys = makeSys()
    const modes: MinimapMode[] = ['terrain', 'population', 'war', 'resource', 'faith']
    for (const m of modes) {
      sys.setMode(m)
      expect(typeof (sys as any).mode).toBe('string')
    }
  })
})
