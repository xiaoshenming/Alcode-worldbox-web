import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EntityInspectorSystem } from '../systems/EntityInspectorSystem'

function makeSys() { return new EntityInspectorSystem() }

// 辅助：构建 mock CanvasRenderingContext2D
function makeCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
    textBaseline: '',
    globalAlpha: 1,
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 50 }),
  } as unknown as CanvasRenderingContext2D
}

describe('EntityInspectorSystem — 初始状态', () => {
  let sys: EntityInspectorSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('初始 panelOpen 为 false', () => {
    expect((sys as any).panelOpen).toBe(false)
  })

  it('初始 entityId 为 null', () => {
    expect((sys as any).entityId).toBeNull()
  })

  it('初始 tree 为空数组', () => {
    expect((sys as any).tree).toHaveLength(0)
  })

  it('初始 scrollOffset 为 0', () => {
    expect((sys as any).scrollOffset).toBe(0)
  })

  it('初始 _entityHeaderStr 为 Entity #-', () => {
    expect((sys as any)._entityHeaderStr).toBe('Entity #-')
  })

  it('初始 _flatBuf 为空数组', () => {
    expect((sys as any)._flatBuf).toHaveLength(0)
  })

  it('初始 _flatDirty 为 true', () => {
    expect((sys as any)._flatDirty).toBe(true)
  })

  it('isPanelOpen() 初始返回 false', () => {
    expect(sys.isPanelOpen()).toBe(false)
  })
})

describe('EntityInspectorSystem — togglePanel()', () => {
  let sys: EntityInspectorSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('第一次 toggle 后面板为 open', () => {
    sys.togglePanel()
    expect(sys.isPanelOpen()).toBe(true)
  })

  it('两次 toggle 后面板回到 closed', () => {
    sys.togglePanel()
    sys.togglePanel()
    expect(sys.isPanelOpen()).toBe(false)
  })

  it('三次 toggle 后面板为 open', () => {
    sys.togglePanel()
    sys.togglePanel()
    sys.togglePanel()
    expect(sys.isPanelOpen()).toBe(true)
  })

  it('toggle 不改变 entityId', () => {
    sys.togglePanel()
    expect((sys as any).entityId).toBeNull()
  })
})

describe('EntityInspectorSystem — inspect()', () => {
  let sys: EntityInspectorSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('inspect 设置 entityId', () => {
    sys.inspect(1, { pos: { x: 0, y: 0 } })
    expect((sys as any).entityId).toBe(1)
  })

  it('inspect 后 panelOpen 变为 true', () => {
    sys.inspect(42, {})
    expect(sys.isPanelOpen()).toBe(true)
  })

  it('inspect 更新 _entityHeaderStr', () => {
    sys.inspect(99, {})
    expect((sys as any)._entityHeaderStr).toBe('Entity #99')
  })

  it('inspect 重置 scrollOffset 为 0', () => {
    ;(sys as any).scrollOffset = 100
    sys.inspect(1, {})
    expect((sys as any).scrollOffset).toBe(0)
  })

  it('inspect 将 _flatDirty 置为 true', () => {
    sys.inspect(1, {})
    expect((sys as any)._flatDirty).toBe(true)
  })

  it('inspect 后 tree 非空（有组件时）', () => {
    sys.inspect(1, { health: { hp: 100, maxHp: 100 } })
    expect((sys as any).tree.length).toBeGreaterThan(0)
  })

  it('inspect 空组件对象时 tree 为空', () => {
    sys.inspect(1, {})
    expect((sys as any).tree).toHaveLength(0)
  })

  it('inspect 覆盖之前的 entityId', () => {
    sys.inspect(1, {})
    sys.inspect(2, {})
    expect((sys as any).entityId).toBe(2)
  })

  it('inspect 覆盖后 _entityHeaderStr 更新', () => {
    sys.inspect(1, {})
    sys.inspect(77, {})
    expect((sys as any)._entityHeaderStr).toBe('Entity #77')
  })
})

describe('EntityInspectorSystem — close()', () => {
  let sys: EntityInspectorSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('close 后 panelOpen 为 false', () => {
    sys.inspect(1, { a: { v: 1 } })
    sys.close()
    expect(sys.isPanelOpen()).toBe(false)
  })

  it('close 后 entityId 为 null', () => {
    sys.inspect(1, {})
    sys.close()
    expect((sys as any).entityId).toBeNull()
  })

  it('close 后 tree 为空', () => {
    sys.inspect(1, { a: { v: 1 } })
    sys.close()
    expect((sys as any).tree).toHaveLength(0)
  })

  it('close 后 _flatDirty 为 true', () => {
    sys.inspect(1, {})
    ;(sys as any)._flatDirty = false
    sys.close()
    expect((sys as any)._flatDirty).toBe(true)
  })

  it('未 inspect 时 close 不抛出', () => {
    expect(() => sys.close()).not.toThrow()
  })
})

describe('EntityInspectorSystem — buildTree() 私有方法', () => {
  let sys: EntityInspectorSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('基本字符串值生成叶节点', () => {
    sys.inspect(1, { name: { value: 'hero' } as any })
    const tree = (sys as any).tree as any[]
    expect(tree.some((n: any) => n.key === 'name')).toBe(true)
  })

  it('嵌套对象生成有 children 的节点', () => {
    sys.inspect(1, { pos: { x: 10, y: 20 } })
    const tree = (sys as any).tree as any[]
    const pos = tree.find((n: any) => n.key === 'pos')
    expect(pos).toBeDefined()
    expect(pos.children.length).toBeGreaterThan(0)
  })

  it('数组值展开为 [i] 子节点', () => {
    sys.inspect(1, { tags: ['a', 'b', 'c'] as any })
    const tree = (sys as any).tree as any[]
    const tags = tree.find((n: any) => n.key.startsWith('tags'))
    expect(tags).toBeDefined()
    expect(tags.children.length).toBe(3)
  })

  it('null 值生成 value 为 "null" 的叶节点', () => {
    sys.inspect(1, { empty: null as any })
    const tree = (sys as any).tree as any[]
    const empty = tree.find((n: any) => n.key === 'empty')
    expect(empty?.value).toBe('null')
  })

  it('undefined 值生成 value 为 "undefined" 的叶节点', () => {
    sys.inspect(1, { missing: undefined as any })
    const tree = (sys as any).tree as any[]
    const m = tree.find((n: any) => n.key === 'missing')
    expect(m?.value).toBe('undefined')
  })

  it('数组节点显示长度', () => {
    sys.inspect(1, { items: [1, 2, 3, 4, 5] as any })
    const tree = (sys as any).tree as any[]
    const items = tree.find((n: any) => n.key.includes('(5)'))
    expect(items).toBeDefined()
  })

  it('数组超过10个元素时最多取前10', () => {
    const big = new Array(15).fill(0).map((_, i) => i)
    sys.inspect(1, { big: big as any })
    const tree = (sys as any).tree as any[]
    const node = tree.find((n: any) => n.key.startsWith('big'))
    expect(node?.children.length).toBe(10)
  })

  it('深度0的对象子节点默认 expanded', () => {
    sys.inspect(1, { pos: { x: 1, y: 2 } })
    const tree = (sys as any).tree as any[]
    const pos = tree.find((n: any) => n.key === 'pos')
    expect(pos?.expanded).toBe(true)
  })

  it('深度1的对象子节点默认不 expanded', () => {
    sys.inspect(1, { outer: { inner: { a: 1 } } })
    const tree = (sys as any).tree as any[]
    const outer = tree.find((n: any) => n.key === 'outer')
    const inner = outer?.children.find((n: any) => n.key === 'inner')
    expect(inner?.expanded).toBe(false)
  })

  it('数字值作为字符串存储', () => {
    sys.inspect(1, { score: 42 as any })
    const tree = (sys as any).tree as any[]
    const score = tree.find((n: any) => n.key === 'score')
    expect(score?.value).toBe('42')
  })

  it('布尔值作为字符串存储', () => {
    sys.inspect(1, { alive: true as any })
    const tree = (sys as any).tree as any[]
    const alive = tree.find((n: any) => n.key === 'alive')
    expect(alive?.value).toBe('true')
  })

  it('新建叶节点 keyWidth 初始为 0', () => {
    sys.inspect(1, { hp: 100 as any })
    const tree = (sys as any).tree as any[]
    const hp = tree.find((n: any) => n.key === 'hp')
    expect(hp?.keyWidth).toBe(0)
  })
})

describe('EntityInspectorSystem — rebuildFlatBuf() / flattenInto()', () => {
  let sys: EntityInspectorSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('inspect 后 flatBuf 包含顶层节点', () => {
    sys.inspect(1, { hp: 100 as any, mp: 50 as any })
    ;(sys as any).rebuildFlatBuf()
    expect((sys as any)._flatBuf.length).toBeGreaterThanOrEqual(2)
  })

  it('展开的父节点也会将子节点加入 flatBuf', () => {
    sys.inspect(1, { pos: { x: 1, y: 2 } })
    ;(sys as any).rebuildFlatBuf()
    // pos 默认 expanded，x 和 y 会进入 flatBuf
    expect((sys as any)._flatBuf.length).toBeGreaterThanOrEqual(3)
  })

  it('未展开的父节点子节点不进入 flatBuf', () => {
    sys.inspect(1, { arr: [1, 2, 3] as any })
    ;(sys as any).rebuildFlatBuf()
    // arr 默认 expanded=false
    const flatBuf = (sys as any)._flatBuf as any[]
    const depthOnes = flatBuf.filter((r: any) => r.depth > 0)
    expect(depthOnes.length).toBe(0)
  })

  it('flatBuf depth 值正确反映嵌套层级', () => {
    sys.inspect(1, { pos: { x: 1, y: 2 } })
    ;(sys as any).rebuildFlatBuf()
    const flatBuf = (sys as any)._flatBuf as any[]
    const posRow = flatBuf.find((r: any) => r.node.key === 'pos')
    const xRow = flatBuf.find((r: any) => r.node.key === 'x')
    expect(posRow?.depth).toBe(0)
    expect(xRow?.depth).toBe(1)
  })
})

describe('EntityInspectorSystem — render() 调用安全性', () => {
  let sys: EntityInspectorSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('面板关闭时 render 不调用 ctx.save', () => {
    const ctx = makeCtx()
    sys.render(ctx, 800, 600)
    expect(ctx.save).not.toHaveBeenCalled()
  })

  it('inspect 后 render 调用 ctx.save', () => {
    const ctx = makeCtx()
    sys.inspect(1, { a: { v: 1 } })
    sys.render(ctx, 800, 600)
    expect(ctx.save).toHaveBeenCalled()
  })

  it('inspect 后 render 调用 ctx.restore', () => {
    const ctx = makeCtx()
    sys.inspect(1, { a: { v: 1 } })
    sys.render(ctx, 800, 600)
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('inspect 后 render 调用 ctx.fillText（header）', () => {
    const ctx = makeCtx()
    sys.inspect(1, { a: { v: 1 } })
    sys.render(ctx, 800, 600)
    expect(ctx.fillText).toHaveBeenCalled()
  })

  it('render 后 _flatDirty 变为 false', () => {
    const ctx = makeCtx()
    sys.inspect(1, { a: { v: 1 } })
    sys.render(ctx, 800, 600)
    expect((sys as any)._flatDirty).toBe(false)
  })

  it('close 后 render 不调用 ctx.save', () => {
    const ctx = makeCtx()
    sys.inspect(1, { a: { v: 1 } })
    sys.close()
    sys.render(ctx, 800, 600)
    expect(ctx.save).not.toHaveBeenCalled()
  })

  it('render 在多种屏幕尺寸下不抛出', () => {
    const ctx = makeCtx()
    sys.inspect(1, { a: { v: 1 } })
    expect(() => sys.render(ctx, 1920, 1080)).not.toThrow()
    expect(() => sys.render(ctx, 320, 240)).not.toThrow()
  })
})

describe('EntityInspectorSystem — 综合场景', () => {
  let sys: EntityInspectorSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('inspect → close → inspect 循环正常', () => {
    sys.inspect(1, { a: { v: 1 } })
    sys.close()
    sys.inspect(2, { b: { v: 2 } })
    expect((sys as any).entityId).toBe(2)
    expect(sys.isPanelOpen()).toBe(true)
  })

  it('inspect → toggle(关闭) → isPanelOpen 为 false', () => {
    sys.inspect(1, {})
    sys.togglePanel()
    expect(sys.isPanelOpen()).toBe(false)
  })

  it('多组件数据正确建树', () => {
    sys.inspect(5, {
      position: { x: 10, y: 20 },
      health: { hp: 80, maxHp: 100 },
      velocity: { vx: 1.5, vy: -2.0 },
    })
    const tree = (sys as any).tree as any[]
    expect(tree).toHaveLength(3)
  })

  it('极大 entityId 不崩溃', () => {
    expect(() => sys.inspect(Number.MAX_SAFE_INTEGER, {})).not.toThrow()
  })

  it('组件值为数字0时叶节点 value 为 "0"', () => {
    sys.inspect(1, { count: 0 as any })
    const tree = (sys as any).tree as any[]
    const count = tree.find((n: any) => n.key === 'count')
    expect(count?.value).toBe('0')
  })
})
