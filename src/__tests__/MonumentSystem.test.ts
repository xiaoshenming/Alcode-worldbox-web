import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { MonumentSystem } from '../systems/MonumentSystem'

function makeSys(): MonumentSystem { return new MonumentSystem() }

/** 快捷构造纪念碑数据（向 private monuments 注入） */
function makeMonument(
  civId: number,
  type: string = 'obelisk',
  completed: boolean = true,
  overrides: Record<string, unknown> = {}
) {
  return {
    id: Math.floor(Math.random() * 9999) + 1,
    type,
    name: `Monument_${type}_${civId}`,
    nameLabel: `Monument_${type}_${civId} (label)`,
    civId,
    x: 5, y: 5,
    buildProgress: completed ? 1.0 : 0.5,
    buildProgressStr: completed ? '100' : '50',
    durability: 1.0,
    radius: 10,
    buffs: [{ type: 'morale', value: 0.2, label: 'morale+20%' }],
    createdTick: 0,
    completed,
    ...overrides,
  }
}

function pushMonument(sys: MonumentSystem, ...args: Parameters<typeof makeMonument>) {
  ;(sys as any).monuments.push(makeMonument(...args))
}

// ─────────────────────────────────────────────
describe('MonumentSystem — 初始状态', () => {
  let sys: MonumentSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('monuments 数组初始为空', () => {
    expect((sys as any).monuments).toHaveLength(0)
  })

  it('visible 初始为 false', () => {
    expect((sys as any).visible).toBe(false)
  })

  it('scrollY 初始为 0', () => {
    expect((sys as any).scrollY).toBe(0)
  })

  it('getMonumentsForCiv 初始返回空数组', () => {
    expect(sys.getMonumentsForCiv(1)).toHaveLength(0)
  })

  it('getCompletedMonuments 初始返回空数组', () => {
    expect(sys.getCompletedMonuments()).toHaveLength(0)
  })

  it('getBuffsAt 初始返回空数组', () => {
    expect(sys.getBuffsAt(0, 0)).toHaveLength(0)
  })

  it('_doneCount 初始为 0', () => {
    expect((sys as any)._doneCount).toBe(0)
  })
})

// ─────────────────────────────────────────────
describe('MonumentSystem.getMonumentsForCiv', () => {
  let sys: MonumentSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('注入 1 个纪念碑后返回长度 1', () => {
    pushMonument(sys, 1)
    expect(sys.getMonumentsForCiv(1)).toHaveLength(1)
  })

  it('不同文明的纪念碑互相隔离', () => {
    pushMonument(sys, 1)
    pushMonument(sys, 2)
    expect(sys.getMonumentsForCiv(1)).toHaveLength(1)
    expect(sys.getMonumentsForCiv(2)).toHaveLength(1)
  })

  it('civId=99 时返回空（没有该文明）', () => {
    pushMonument(sys, 1)
    expect(sys.getMonumentsForCiv(99)).toHaveLength(0)
  })

  it('同一文明注入 3 个返回 3 个', () => {
    pushMonument(sys, 1)
    pushMonument(sys, 1)
    pushMonument(sys, 1)
    expect(sys.getMonumentsForCiv(1)).toHaveLength(3)
  })

  it('支持 5 种类型全部归同一文明', () => {
    ;['obelisk', 'statue', 'temple', 'arch', 'lighthouse'].forEach(t =>
      pushMonument(sys, 7, t)
    )
    expect(sys.getMonumentsForCiv(7)).toHaveLength(5)
  })

  it('返回的数组包含正确的 civId', () => {
    pushMonument(sys, 42)
    const result = sys.getMonumentsForCiv(42)
    expect(result[0].civId).toBe(42)
  })

  it('多次调用返回相同长度（缓冲区复用不出错）', () => {
    pushMonument(sys, 1)
    pushMonument(sys, 1)
    sys.getMonumentsForCiv(1)
    expect(sys.getMonumentsForCiv(1)).toHaveLength(2)
  })

  it('completed=false 的纪念碑也被纳入 getMonumentsForCiv', () => {
    pushMonument(sys, 3, 'arch', false)
    expect(sys.getMonumentsForCiv(3)).toHaveLength(1)
  })

  it('返回结果是 readonly（对象引用可读）', () => {
    pushMonument(sys, 1)
    const result = sys.getMonumentsForCiv(1)
    expect(result[0]).toBeDefined()
  })
})

// ─────────────────────────────────────────────
describe('MonumentSystem.getCompletedMonuments', () => {
  let sys: MonumentSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('只有未完成时返回空', () => {
    pushMonument(sys, 1, 'obelisk', false)
    expect(sys.getCompletedMonuments()).toHaveLength(0)
  })

  it('只有已完成时返回全部', () => {
    pushMonument(sys, 1, 'obelisk', true)
    pushMonument(sys, 2, 'statue', true)
    expect(sys.getCompletedMonuments()).toHaveLength(2)
  })

  it('混合时只返回 completed=true 的', () => {
    pushMonument(sys, 1, 'obelisk', true)
    pushMonument(sys, 2, 'statue', false)
    expect(sys.getCompletedMonuments()).toHaveLength(1)
  })

  it('3 完成 2 未完成 → 返回 3', () => {
    pushMonument(sys, 1, 'obelisk', true)
    pushMonument(sys, 1, 'arch', true)
    pushMonument(sys, 1, 'temple', true)
    pushMonument(sys, 1, 'statue', false)
    pushMonument(sys, 1, 'lighthouse', false)
    expect(sys.getCompletedMonuments()).toHaveLength(3)
  })

  it('返回的每项 completed 均为 true', () => {
    pushMonument(sys, 1, 'obelisk', true)
    pushMonument(sys, 2, 'statue', false)
    for (const m of sys.getCompletedMonuments()) {
      expect(m.completed).toBe(true)
    }
  })

  it('多次调用结果一致（缓冲区复用）', () => {
    pushMonument(sys, 1, 'obelisk', true)
    sys.getCompletedMonuments()
    expect(sys.getCompletedMonuments()).toHaveLength(1)
  })
})

// ─────────────────────────────────────────────
describe('MonumentSystem.getBuffsAt', () => {
  let sys: MonumentSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('无纪念碑时返回空数组', () => {
    expect(sys.getBuffsAt(5, 5)).toHaveLength(0)
  })

  it('已完成且点在半径内返回增益', () => {
    pushMonument(sys, 1, 'obelisk', true, { x: 0, y: 0, radius: 10 })
    const buffs = sys.getBuffsAt(0, 0)
    expect(buffs.length).toBeGreaterThan(0)
  })

  it('已完成但点在半径外不返回增益', () => {
    pushMonument(sys, 1, 'obelisk', true, { x: 0, y: 0, radius: 5 })
    expect(sys.getBuffsAt(100, 100)).toHaveLength(0)
  })

  it('未完成纪念碑不提供增益（即使在范围内）', () => {
    pushMonument(sys, 1, 'obelisk', false, { x: 0, y: 0, radius: 100 })
    expect(sys.getBuffsAt(0, 0)).toHaveLength(0)
  })

  it('边界点（距离=radius）应被纳入（<=）', () => {
    pushMonument(sys, 1, 'obelisk', true, { x: 0, y: 0, radius: 5, buffs: [{ type: 'culture', value: 0.1, label: 'c' }] })
    // 距离恰好 = 5 → dx*dx+dy*dy = 25 <= 25
    const buffs = sys.getBuffsAt(5, 0)
    expect(buffs.length).toBeGreaterThan(0)
  })

  it('略超出边界（距离=radius+1）不纳入', () => {
    pushMonument(sys, 1, 'obelisk', true, { x: 0, y: 0, radius: 5 })
    expect(sys.getBuffsAt(6, 0)).toHaveLength(0)
  })

  it('两个覆盖同一点的纪念碑叠加增益', () => {
    pushMonument(sys, 1, 'obelisk', true, { x: 0, y: 0, radius: 10, buffs: [{ type: 'morale', value: 0.1, label: 'm1' }] })
    pushMonument(sys, 2, 'statue', true, { x: 0, y: 0, radius: 10, buffs: [{ type: 'culture', value: 0.2, label: 'c1' }] })
    expect(sys.getBuffsAt(0, 0)).toHaveLength(2)
  })

  it('返回的增益对象包含 type 和 value 字段', () => {
    pushMonument(sys, 1, 'obelisk', true, { x: 0, y: 0, radius: 10 })
    const [buff] = sys.getBuffsAt(0, 0)
    expect(buff).toHaveProperty('type')
    expect(buff).toHaveProperty('value')
  })

  it('temple 有两个 buff，均被返回', () => {
    pushMonument(sys, 1, 'temple', true, {
      x: 0, y: 0, radius: 20,
      buffs: [{ type: 'morale', value: 0.1, label: 'morale+10%' }, { type: 'culture', value: 0.1, label: 'culture+10%' }]
    })
    expect(sys.getBuffsAt(0, 0)).toHaveLength(2)
  })
})

// ─────────────────────────────────────────────
describe('MonumentSystem.update — 建造进度', () => {
  let sys: MonumentSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick 不是 60 的倍数时 update 不做任何事', () => {
    pushMonument(sys, 1, 'obelisk', false, { buildProgress: 0, createdTick: 0 })
    sys.update(1) // 不是60的倍数
    expect((sys as any).monuments[0].buildProgress).toBe(0)
  })

  it('tick=0 时（60的倍数）更新 buildProgress', () => {
    // createdTick=0, tick=0, 理论上 progress=0
    pushMonument(sys, 1, 'obelisk', false, { buildProgress: 0, createdTick: 0 })
    sys.update(0)
    expect((sys as any).monuments[0].buildProgress).toBeGreaterThanOrEqual(0)
  })

  it('已完成的纪念碑 durability 会缓慢降低', () => {
    pushMonument(sys, 1, 'obelisk', true, { durability: 1.0 })
    sys.update(60) // 60 是 BUILD_CHECK_INTERVAL 的倍数
    expect((sys as any).monuments[0].durability).toBeLessThan(1.0)
  })

  it('durability 不低于 0.1（clamp）', () => {
    pushMonument(sys, 1, 'obelisk', true, { durability: 0.1 })
    for (let t = 60; t <= 600; t += 60) sys.update(t)
    expect((sys as any).monuments[0].durability).toBeGreaterThanOrEqual(0.1)
  })

  it('update 不崩溃（空 monuments）', () => {
    expect(() => sys.update(60)).not.toThrow()
  })

  it('buildProgress clamp 不超过 1', () => {
    // obelisk buildTicks=800，tick=10000远超
    pushMonument(sys, 1, 'obelisk', false, { buildProgress: 0, createdTick: 0 })
    sys.update(9600) // 9600 % 60 === 0
    expect((sys as any).monuments[0].buildProgress).toBeLessThanOrEqual(1)
  })

  it('buildProgress 达到 1 时 completed 变为 true', () => {
    // obelisk buildTicks=800；tick=800，createdTick=0 → progress=1
    pushMonument(sys, 1, 'obelisk', false, { buildProgress: 0, createdTick: 0 })
    sys.update(840) // 840 % 60 === 0，tick-createdTick=840 > 800
    expect((sys as any).monuments[0].completed).toBe(true)
  })
})

// ─────────────────────────────────────────────
describe('MonumentSystem.handleKeyDown', () => {
  let sys: MonumentSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  function makeEvent(key: string, shiftKey: boolean): KeyboardEvent {
    return { key, shiftKey } as KeyboardEvent
  }

  it('Shift+U 返回 true', () => {
    expect(sys.handleKeyDown(makeEvent('u', true))).toBe(true)
  })

  it('Shift+U 切换 visible 为 true（初始 false）', () => {
    sys.handleKeyDown(makeEvent('u', true))
    expect((sys as any).visible).toBe(true)
  })

  it('两次 Shift+U 关闭 visible', () => {
    sys.handleKeyDown(makeEvent('u', true))
    sys.handleKeyDown(makeEvent('u', true))
    expect((sys as any).visible).toBe(false)
  })

  it('Shift+U 重置 scrollY 为 0', () => {
    ;(sys as any).scrollY = 100
    sys.handleKeyDown(makeEvent('u', true))
    expect((sys as any).scrollY).toBe(0)
  })

  it('非 Shift+U 返回 false', () => {
    expect(sys.handleKeyDown(makeEvent('u', false))).toBe(false)
  })

  it('Shift+其他键返回 false', () => {
    expect(sys.handleKeyDown(makeEvent('a', true))).toBe(false)
  })

  it('不带 Shift 的 U 不改变 visible', () => {
    sys.handleKeyDown(makeEvent('u', false))
    expect((sys as any).visible).toBe(false)
  })
})

// ─────────────────────────────────────────────
describe('MonumentSystem.render', () => {
  let sys: MonumentSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  function makeCtx() {
    return {
      save: vi.fn(), restore: vi.fn(),
      beginPath: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
      fillRect: vi.fn(), fillText: vi.fn(),
      roundRect: vi.fn(), arc: vi.fn(), rect: vi.fn(), clip: vi.fn(),
      fillStyle: '', strokeStyle: '', lineWidth: 0,
      font: '', textAlign: 'left' as CanvasTextAlign,
      textBaseline: 'alphabetic' as CanvasTextBaseline,
      globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D
  }

  it('visible=false 时 render 不调用 ctx.fill', () => {
    const ctx = makeCtx()
    sys.render(ctx)
    expect(ctx.fill).not.toHaveBeenCalled()
  })

  it('visible=true 时 render 调用 ctx.fill', () => {
    const ctx = makeCtx()
    ;(sys as any).visible = true
    sys.render(ctx)
    expect(ctx.fill).toHaveBeenCalled()
  })

  it('visible=false 时不崩溃', () => {
    const ctx = makeCtx()
    expect(() => sys.render(ctx)).not.toThrow()
  })

  it('visible=true 且无纪念碑时渲染"暂无纪念碑"文字', () => {
    const ctx = makeCtx()
    ;(sys as any).visible = true
    sys.render(ctx)
    const texts: string[] = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.map((c: any[]) => c[0] as string)
    expect(texts.some(t => t.includes('暂无纪念碑'))).toBe(true)
  })

  it('有纪念碑时渲染其 nameLabel', () => {
    const ctx = makeCtx()
    ;(sys as any).visible = true
    pushMonument(sys, 1, 'obelisk', true, { nameLabel: 'TestLabel' })
    sys.render(ctx)
    const texts: string[] = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.map((c: any[]) => c[0] as string)
    expect(texts.some(t => t.includes('TestLabel'))).toBe(true)
  })
})

// ─────────────────────────────────────────────
describe('MonumentSystem._rebuildHeaderCache', () => {
  let sys: MonumentSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('注入 2 完成 1 未完成后 _doneCount 正确', () => {
    pushMonument(sys, 1, 'obelisk', true)
    pushMonument(sys, 1, 'statue', true)
    pushMonument(sys, 1, 'arch', false)
    ;(sys as any)._rebuildHeaderCache()
    expect((sys as any)._doneCount).toBe(2)
  })

  it('_headerStr 包含 done/total 格式', () => {
    pushMonument(sys, 1, 'obelisk', true)
    ;(sys as any)._rebuildHeaderCache()
    expect((sys as any)._headerStr).toContain('1/1')
  })

  it('全部未完成时 _doneCount 为 0', () => {
    pushMonument(sys, 1, 'obelisk', false)
    pushMonument(sys, 1, 'statue', false)
    ;(sys as any)._rebuildHeaderCache()
    expect((sys as any)._doneCount).toBe(0)
  })
})
