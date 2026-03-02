import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureLineageSystem } from '../systems/CreatureLineageSystem'

function makeSys() { return new CreatureLineageSystem() }

// ─── 1. 初始状态 ──────────────────────────────────────────────────────────────
describe('CreatureLineageSystem — 初始状态', () => {
  let sys: CreatureLineageSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('初始 records 为空 Map', () => { expect((sys as any).records.size).toBe(0) })
  it('初始 panelOpen 为 false', () => { expect((sys as any).panelOpen).toBe(false) })
  it('初始 selectedId 为 -1', () => { expect((sys as any).selectedId).toBe(-1) })
  it('初始 nodes 为空数组', () => { expect((sys as any).nodes).toHaveLength(0) })
  it('初始 _panelSW 为 0', () => { expect((sys as any)._panelSW).toBe(0) })
  it('初始 _panelSH 为 0', () => { expect((sys as any)._panelSH).toBe(0) })
})

// ─── 2. registerBirth — 基础注册 ──────────────────────────────────────────────
describe('CreatureLineageSystem.registerBirth — 基础注册', () => {
  let sys: CreatureLineageSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('registerBirth 后 records 增加 1', () => {
    sys.registerBirth(1, 0, 0, 'Aria', 'human')
    expect((sys as any).records.size).toBe(1)
  })
  it('记录保���正确的 name', () => {
    sys.registerBirth(1, 0, 0, 'Aria', 'human')
    expect((sys as any).records.get(1).name).toBe('Aria')
  })
  it('记录保存正确的 species', () => {
    sys.registerBirth(1, 0, 0, 'Aria', 'elf')
    expect((sys as any).records.get(1).species).toBe('elf')
  })
  it('新生物 alive 为 true', () => {
    sys.registerBirth(1, 0, 0, 'Aria', 'human')
    expect((sys as any).records.get(1).alive).toBe(true)
  })
  it('记录保存正确的 parentA', () => {
    sys.registerBirth(3, 1, 2, 'Child', 'human')
    expect((sys as any).records.get(3).parentA).toBe(1)
  })
  it('记录保存正确的 parentB', () => {
    sys.registerBirth(3, 1, 2, 'Child', 'human')
    expect((sys as any).records.get(3).parentB).toBe(2)
  })
  it('新生物 children 为空数组', () => {
    sys.registerBirth(1, 0, 0, 'Aria', 'human')
    expect((sys as any).records.get(1).children).toHaveLength(0)
  })
  it('记录的 id 与 childId 一致', () => {
    sys.registerBirth(42, 0, 0, 'X', 'orc')
    expect((sys as any).records.get(42).id).toBe(42)
  })
  it('注册多个生物 records 数量正确', () => {
    sys.registerBirth(1, 0, 0, 'A', 'human')
    sys.registerBirth(2, 0, 0, 'B', 'elf')
    sys.registerBirth(3, 0, 0, 'C', 'dwarf')
    expect((sys as any).records.size).toBe(3)
  })
  it('重复注册同一 childId 覆盖旧记录', () => {
    sys.registerBirth(1, 0, 0, 'Old', 'human')
    sys.registerBirth(1, 0, 0, 'New', 'elf')
    expect((sys as any).records.get(1).name).toBe('New')
  })
})

// ─── 3. registerBirth — 父母 children 更新 ────────────────────────────────────
describe('CreatureLineageSystem.registerBirth — 父母 children 更新', () => {
  let sys: CreatureLineageSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('父 A 存在时 children 中加入 childId', () => {
    sys.registerBirth(1, 0, 0, 'ParentA', 'human')
    sys.registerBirth(3, 1, 2, 'Child', 'human')
    expect((sys as any).records.get(1).children).toContain(3)
  })
  it('父 B 存在时 children 中加入 childId', () => {
    sys.registerBirth(2, 0, 0, 'ParentB', 'human')
    sys.registerBirth(3, 1, 2, 'Child', 'human')
    expect((sys as any).records.get(2).children).toContain(3)
  })
  it('parentA === parentB 时只加一次', () => {
    sys.registerBirth(1, 0, 0, 'Parent', 'human')
    sys.registerBirth(3, 1, 1, 'Child', 'human')
    expect((sys as any).records.get(1).children).toHaveLength(1)
  })
  it('父不存在时不崩溃', () => {
    expect(() => sys.registerBirth(3, 999, 888, 'Child', 'human')).not.toThrow()
  })
  it('多个子女均出现在父的 children', () => {
    sys.registerBirth(1, 0, 0, 'Dad', 'human')
    sys.registerBirth(10, 1, 0, 'C1', 'human')
    sys.registerBirth(11, 1, 0, 'C2', 'human')
    const children = (sys as any).records.get(1).children
    expect(children).toContain(10)
    expect(children).toContain(11)
  })
  it('三代链：祖父 → 父 → 孙', () => {
    sys.registerBirth(1, 0, 0, 'Grandpa', 'human')
    sys.registerBirth(2, 1, 0, 'Father', 'human')
    sys.registerBirth(3, 2, 0, 'Son', 'human')
    expect((sys as any).records.get(1).children).toContain(2)
    expect((sys as any).records.get(2).children).toContain(3)
  })
})

// ─── 4. registerDeath ─────────────────────────────────────────────────────────
describe('CreatureLineageSystem.registerDeath', () => {
  let sys: CreatureLineageSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('注册后 alive 为 false', () => {
    sys.registerBirth(1, 0, 0, 'Aria', 'human')
    sys.registerDeath(1)
    expect((sys as any).records.get(1).alive).toBe(false)
  })
  it('对不存在的 id 调用不崩溃', () => {
    expect(() => sys.registerDeath(999)).not.toThrow()
  })
  it('死亡后记录仍在 Map 中', () => {
    sys.registerBirth(1, 0, 0, 'Aria', 'human')
    sys.registerDeath(1)
    expect((sys as any).records.has(1)).toBe(true)
  })
  it('多次死亡调用不崩溃', () => {
    sys.registerBirth(1, 0, 0, 'Aria', 'human')
    sys.registerDeath(1)
    expect(() => sys.registerDeath(1)).not.toThrow()
    expect((sys as any).records.get(1).alive).toBe(false)
  })
  it('一个死亡不影响另一个', () => {
    sys.registerBirth(1, 0, 0, 'A', 'human')
    sys.registerBirth(2, 0, 0, 'B', 'human')
    sys.registerDeath(1)
    expect((sys as any).records.get(2).alive).toBe(true)
  })
})

// ─── 5. handleKey ─────────────────────────────────────────────────────────────
describe('CreatureLineageSystem.handleKey', () => {
  let sys: CreatureLineageSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('按 l 时 panelOpen 从 false 变 true', () => {
    sys.handleKey('l')
    expect((sys as any).panelOpen).toBe(true)
  })
  it('按 L 时 panelOpen 从 false 变 true', () => {
    sys.handleKey('L')
    expect((sys as any).panelOpen).toBe(true)
  })
  it('按 l 两次切回 false', () => {
    sys.handleKey('l')
    sys.handleKey('l')
    expect((sys as any).panelOpen).toBe(false)
  })
  it('handleKey l 返回 true', () => {
    expect(sys.handleKey('l')).toBe(true)
  })
  it('handleKey L 返回 true', () => {
    expect(sys.handleKey('L')).toBe(true)
  })
  it('其他按键返回 false', () => {
    expect(sys.handleKey('a')).toBe(false)
  })
  it('其他按键不改变 panelOpen', () => {
    sys.handleKey('x')
    expect((sys as any).panelOpen).toBe(false)
  })
  it('按 Escape 返回 false', () => {
    expect(sys.handleKey('Escape')).toBe(false)
  })
  it('连续切换 3 次后 panelOpen 为 true', () => {
    sys.handleKey('l')
    sys.handleKey('l')
    sys.handleKey('l')
    expect((sys as any).panelOpen).toBe(true)
  })
  it('按 L 后再按 l 再 toggles', () => {
    sys.handleKey('L')
    sys.handleKey('l')
    expect((sys as any).panelOpen).toBe(false)
  })
})

// ─── 6. panelRect 缓存逻辑 ────────────────────────────────────────────────────
describe('CreatureLineageSystem — panelRect 缓存', () => {
  let sys: CreatureLineageSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('第一次调用后 _panelSW/_panelSH 更新', () => {
    ;(sys as any).panelRect(800, 600)
    expect((sys as any)._panelSW).toBe(800)
    expect((sys as any)._panelSH).toBe(600)
  })
  it('屏幕尺寸不变时返回缓存对象', () => {
    const a = (sys as any).panelRect(800, 600)
    const b = (sys as any).panelRect(800, 600)
    expect(a).toBe(b)
  })
  it('屏幕尺寸变化时重新计算', () => {
    (sys as any).panelRect(800, 600)
    ;(sys as any).panelRect(1024, 768)
    expect((sys as any)._panelSW).toBe(1024)
    expect((sys as any)._panelSH).toBe(768)
  })
  it('panel 宽度不超过 600', () => {
    const r = (sys as any).panelRect(2000, 2000)
    expect(r.w).toBeLessThanOrEqual(600)
  })
  it('panel 高度不超过 450', () => {
    const r = (sys as any).panelRect(2000, 2000)
    expect(r.h).toBeLessThanOrEqual(450)
  })
  it('小屏幕时 panel 留 40px 边距', () => {
    const r = (sys as any).panelRect(300, 300)
    expect(r.w).toBeLessThanOrEqual(300 - 40)
    expect(r.h).toBeLessThanOrEqual(300 - 40)
  })
  it('panel 居中 x 坐标正确', () => {
    const r = (sys as any).panelRect(800, 600)
    expect(r.x).toBeCloseTo((800 - r.w) / 2)
  })
  it('panel 居中 y 坐标正确', () => {
    const r = (sys as any).panelRect(800, 600)
    expect(r.y).toBeCloseTo((600 - r.h) / 2)
  })
})

// ─── 7. buildTree 与 subtreeWidth ─────────────────────────────────────────────
describe('CreatureLineageSystem — buildTree & subtreeWidth', () => {
  let sys: CreatureLineageSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('只有根节点时 tree.children 为空', () => {
    sys.registerBirth(1, 0, 0, 'Root', 'human')
    const tree = (sys as any).buildTree(1, 0)
    expect(tree.children).toHaveLength(0)
  })
  it('深度 2 时 children 为空（不再递归）', () => {
    sys.registerBirth(1, 0, 0, 'Root', 'human')
    sys.registerBirth(2, 1, 0, 'Child', 'human')
    const tree = (sys as any).buildTree(2, 2)
    expect(tree.children).toHaveLength(0)
  })
  it('有一个子代时 children 长度为 1', () => {
    sys.registerBirth(1, 0, 0, 'Parent', 'human')
    sys.registerBirth(2, 1, 0, 'Child', 'human')
    const tree = (sys as any).buildTree(1, 0)
    expect(tree.children).toHaveLength(1)
  })
  it('无记录的 id 构建空 tree', () => {
    const tree = (sys as any).buildTree(999, 0)
    expect(tree.id).toBe(999)
    expect(tree.children).toHaveLength(0)
  })
  it('subtreeWidth 无子节点时返回 NW(120)', () => {
    const tree = { id: 1, children: [] }
    expect((sys as any).subtreeWidth(tree)).toBe(120)
  })
  it('subtreeWidth 有子节点时 >= NW', () => {
    sys.registerBirth(1, 0, 0, 'P', 'human')
    sys.registerBirth(2, 1, 0, 'C1', 'human')
    sys.registerBirth(3, 1, 0, 'C2', 'human')
    const tree = (sys as any).buildTree(1, 0)
    expect((sys as any).subtreeWidth(tree)).toBeGreaterThanOrEqual(120)
  })
})

// ─── 8. treeBounds 边界计算 ───────────────────────────────────────────────────
describe('CreatureLineageSystem — treeBounds', () => {
  let sys: CreatureLineageSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('nodes 为空时 w=0, h=0', () => {
    const b = (sys as any).treeBounds()
    expect(b.w).toBe(0)
    expect(b.h).toBe(0)
  })
  it('nodes 为空时 minX=0, minY=0', () => {
    const b = (sys as any).treeBounds()
    expect(b.minX).toBe(0)
    expect(b.minY).toBe(0)
  })
  it('单节点时 w=节点宽, h=节点高', () => {
    ;(sys as any).nodes = [{ id: 1, x: 10, y: 20, w: 120, h: 48 }]
    const b = (sys as any).treeBounds()
    expect(b.w).toBe(120)
    expect(b.h).toBe(48)
  })
  it('两节点时 w 为它们的跨度', () => {
    ;(sys as any).nodes = [
      { id: 1, x: 0, y: 0, w: 120, h: 48 },
      { id: 2, x: 200, y: 0, w: 120, h: 48 },
    ]
    const b = (sys as any).treeBounds()
    expect(b.w).toBe(320) // 0 to 200+120
  })
  it('返回的是重用对象（同一引用）', () => {
    const a = (sys as any).treeBounds()
    const b = (sys as any).treeBounds()
    expect(a).toBe(b)
  })
})

// ─── 9. render — 不崩溃 ──────────────────────────────────────────────────────
describe('CreatureLineageSystem.render — 不崩溃', () => {
  let sys: CreatureLineageSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  function makeFakeCtx() {
    return {
      save: vi.fn(), restore: vi.fn(), fillText: vi.fn(),
      beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(),
      fill: vi.fn(), roundRect: vi.fn(),
      fillStyle: '', strokeStyle: '', lineWidth: 0, font: '', textAlign: '',
    } as unknown as CanvasRenderingContext2D
  }

  it('panelOpen=false 时 render 不调用 ctx 方法', () => {
    const ctx = makeFakeCtx()
    sys.render(ctx, 800, 600)
    expect((ctx.save as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0)
  })
  it('panelOpen=true 无 selectedId 时不崩溃', () => {
    sys.handleKey('l')
    const ctx = makeFakeCtx()
    expect(() => sys.render(ctx, 800, 600)).not.toThrow()
  })
  it('panelOpen=true 有 selectedId 无 children 不崩溃', () => {
    sys.registerBirth(1, 0, 0, 'Root', 'human')
    ;(sys as any).selectedId = 1
    sys.handleKey('l')
    const ctx = makeFakeCtx()
    expect(() => sys.render(ctx, 800, 600)).not.toThrow()
  })
  it('panelOpen=true 有完整族谱不崩溃', () => {
    sys.registerBirth(1, 0, 0, 'GrandPa', 'human')
    sys.registerBirth(2, 1, 0, 'Father', 'human')
    sys.registerBirth(3, 2, 0, 'Son', 'human')
    ;(sys as any).selectedId = 2
    sys.handleKey('l')
    const ctx = makeFakeCtx()
    expect(() => sys.render(ctx, 800, 600)).not.toThrow()
  })
})
