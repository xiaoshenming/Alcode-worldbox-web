import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EvolutionVisualSystem, EvolutionNode, EvolutionEvent } from '../systems/EvolutionVisualSystem'

function makeSys() { return new EvolutionVisualSystem() }

function makeNode(overrides: Partial<EvolutionNode> = {}): EvolutionNode {
  return {
    id: 1,
    species: 'human',
    parentId: null,
    appearTick: 0,
    population: 10,
    avgTraits: {},
    mutations: [],
    ...overrides,
  }
}

function makeEvent(overrides: Partial<EvolutionEvent> = {}): EvolutionEvent {
  return {
    tick: 0,
    species: 'human',
    mutation: 'fast',
    description: 'Faster movement',
    ...overrides,
  }
}

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
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    closePath: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 50 }),
  } as unknown as CanvasRenderingContext2D
}

describe('EvolutionVisualSystem — 初始状态', () => {
  let sys: EvolutionVisualSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('初始 nodes 为空 Map', () => {
    expect((sys as any).nodes.size).toBe(0)
  })

  it('初始 events 为空数组', () => {
    expect((sys as any).events).toHaveLength(0)
  })

  it('初始 notifs 为空数组', () => {
    expect((sys as any).notifs).toHaveLength(0)
  })

  it('初始 visible 为 false', () => {
    expect((sys as any).visible).toBe(false)
  })

  it('初始 scrollY 为 0', () => {
    expect((sys as any).scrollY).toBe(0)
  })

  it('isVisible() 初始返回 false', () => {
    expect(sys.isVisible()).toBe(false)
  })

  it('初始 _minT 为 Infinity', () => {
    expect((sys as any)._minT).toBe(Infinity)
  })

  it('初始 _maxT 为 -Infinity', () => {
    expect((sys as any)._maxT).toBe(-Infinity)
  })

  it('初始 _layoutDirty 为 true', () => {
    expect((sys as any)._layoutDirty).toBe(true)
  })

  it('初始 _layoutCache 为空数组', () => {
    expect((sys as any)._layoutCache).toHaveLength(0)
  })
})

describe('EvolutionVisualSystem — toggle() / isVisible()', () => {
  let sys: EvolutionVisualSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('toggle 后 visible 为 true', () => {
    sys.toggle()
    expect(sys.isVisible()).toBe(true)
  })

  it('两次 toggle 后 visible 回到 false', () => {
    sys.toggle()
    sys.toggle()
    expect(sys.isVisible()).toBe(false)
  })

  it('三次 toggle 后 visible 为 true', () => {
    sys.toggle()
    sys.toggle()
    sys.toggle()
    expect(sys.isVisible()).toBe(true)
  })
})

describe('EvolutionVisualSystem — addNode()', () => {
  let sys: EvolutionVisualSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('addNode 后 nodes.size 增加', () => {
    sys.addNode(makeNode())
    expect((sys as any).nodes.size).toBe(1)
  })

  it('addNode 多次后 nodes.size 正确', () => {
    sys.addNode(makeNode({ id: 1 }))
    sys.addNode(makeNode({ id: 2 }))
    sys.addNode(makeNode({ id: 3 }))
    expect((sys as any).nodes.size).toBe(3)
  })

  it('addNode 存储 nodeInfoStr', () => {
    sys.addNode(makeNode({ id: 1, population: 42, appearTick: 10 }))
    const stored = (sys as any).nodes.get(1)
    expect(stored.nodeInfoStr).toBe('pop:42 t:10')
  })

  it('addNode 存储 traitStr（无特征时为空）', () => {
    sys.addNode(makeNode({ id: 1, avgTraits: {} }))
    const stored = (sys as any).nodes.get(1)
    expect(stored.traitStr).toBe('')
  })

  it('addNode 存储 traitStr（有特征时格式正确）', () => {
    sys.addNode(makeNode({ id: 1, avgTraits: { speed: 3.7, str: 1.0 } }))
    const stored = (sys as any).nodes.get(1)
    expect(stored.traitStr).toContain('spe:4')
  })

  it('addNode 只取前3个特征构建 traitStr', () => {
    sys.addNode(makeNode({
      id: 1,
      avgTraits: { a: 1, b: 2, c: 3, d: 4, e: 5 },
    }))
    const stored = (sys as any).nodes.get(1)
    // traitStr 最多包含3个字段
    const parts = (stored.traitStr as string).split(' ')
    expect(parts.length).toBeLessThanOrEqual(3)
  })

  it('addNode 将 _layoutDirty 置为 true', () => {
    ;(sys as any)._layoutDirty = false
    sys.addNode(makeNode())
    expect((sys as any)._layoutDirty).toBe(true)
  })

  it('addNode 同 id 覆盖已有节点', () => {
    sys.addNode(makeNode({ id: 1, population: 10 }))
    sys.addNode(makeNode({ id: 1, population: 99 }))
    expect((sys as any).nodes.size).toBe(1)
    expect((sys as any).nodes.get(1).population).toBe(99)
  })

  it('addNode 存储副本，修改原对象不影响存储', () => {
    const node = makeNode({ id: 1, population: 10 })
    sys.addNode(node)
    node.population = 999
    expect((sys as any).nodes.get(1).population).toBe(10)
  })
})

describe('EvolutionVisualSystem — updatePopulation()', () => {
  let sys: EvolutionVisualSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('updatePopulation 更新已存在节点的 population', () => {
    sys.addNode(makeNode({ id: 1, population: 10 }))
    sys.updatePopulation(1, 50)
    expect((sys as any).nodes.get(1).population).toBe(50)
  })

  it('updatePopulation 更新 nodeInfoStr', () => {
    sys.addNode(makeNode({ id: 1, population: 10, appearTick: 5 }))
    sys.updatePopulation(1, 88)
    expect((sys as any).nodes.get(1).nodeInfoStr).toBe('pop:88 t:5')
  })

  it('updatePopulation 将 _layoutDirty 置为 true', () => {
    sys.addNode(makeNode({ id: 1 }))
    ;(sys as any)._layoutDirty = false
    sys.updatePopulation(1, 20)
    expect((sys as any)._layoutDirty).toBe(true)
  })

  it('updatePopulation 不存在的 id 不抛出', () => {
    expect(() => sys.updatePopulation(999, 50)).not.toThrow()
  })

  it('updatePopulation population 为 0 时正常', () => {
    sys.addNode(makeNode({ id: 1, population: 10 }))
    sys.updatePopulation(1, 0)
    expect((sys as any).nodes.get(1).population).toBe(0)
  })
})

describe('EvolutionVisualSystem — pushEvent()', () => {
  let sys: EvolutionVisualSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('pushEvent 后 events 数组增加', () => {
    sys.pushEvent(makeEvent())
    expect((sys as any).events).toHaveLength(1)
  })

  it('pushEvent 多次后 events 长度正确', () => {
    sys.pushEvent(makeEvent({ tick: 0 }))
    sys.pushEvent(makeEvent({ tick: 10 }))
    sys.pushEvent(makeEvent({ tick: 20 }))
    expect((sys as any).events).toHaveLength(3)
  })

  it('pushEvent 更新 _minT 为最小 tick', () => {
    sys.pushEvent(makeEvent({ tick: 50 }))
    sys.pushEvent(makeEvent({ tick: 10 }))
    sys.pushEvent(makeEvent({ tick: 30 }))
    expect((sys as any)._minT).toBe(10)
  })

  it('pushEvent 更新 _maxT 为最大 tick', () => {
    sys.pushEvent(makeEvent({ tick: 10 }))
    sys.pushEvent(makeEvent({ tick: 100 }))
    sys.pushEvent(makeEvent({ tick: 50 }))
    expect((sys as any)._maxT).toBe(100)
  })

  it('pushEvent 设置 _minTStr 格式正确', () => {
    sys.pushEvent(makeEvent({ tick: 42 }))
    expect((sys as any)._minTStr).toBe('t:42')
  })

  it('pushEvent 后 notifs 增加', () => {
    sys.pushEvent(makeEvent())
    expect((sys as any).notifs).toHaveLength(1)
  })

  it('pushEvent 超过 MAX_NOTIF(3) 时旧 notif 被移除', () => {
    sys.pushEvent(makeEvent({ tick: 0 }))
    sys.pushEvent(makeEvent({ tick: 1 }))
    sys.pushEvent(makeEvent({ tick: 2 }))
    sys.pushEvent(makeEvent({ tick: 3 }))
    expect((sys as any).notifs).toHaveLength(3)
  })

  it('pushEvent 存储 speciesMutStr', () => {
    sys.pushEvent(makeEvent({ species: 'elf', mutation: 'sharp' }))
    const notif = (sys as any).notifs[0]
    expect(notif.speciesMutStr).toBe('elf: sharp')
  })

  it('pushEvent 初始 startTick 为 -1', () => {
    sys.pushEvent(makeEvent())
    const notif = (sys as any).notifs[0]
    expect(notif.startTick).toBe(-1)
  })

  it('pushEvent 初始 alpha 为 1', () => {
    sys.pushEvent(makeEvent())
    const notif = (sys as any).notifs[0]
    expect(notif.alpha).toBe(1)
  })
})

describe('EvolutionVisualSystem — update()', () => {
  let sys: EvolutionVisualSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('update 时首次设置 startTick', () => {
    sys.pushEvent(makeEvent())
    sys.update(5)
    const notif = (sys as any).notifs[0]
    expect(notif.startTick).toBe(5)
  })

  it('update 在 NOTIF_DUR 内 notif 仍存在', () => {
    sys.pushEvent(makeEvent())
    sys.update(0)
    sys.update(50)
    expect((sys as any).notifs).toHaveLength(1)
  })

  it('update 超过 NOTIF_DUR(90) 后 notif 被移除', () => {
    sys.pushEvent(makeEvent())
    sys.update(0)
    sys.update(100)
    expect((sys as any).notifs).toHaveLength(0)
  })

  it('update 在淡出阶段 alpha < 1', () => {
    sys.pushEvent(makeEvent())
    sys.update(0)
    // NOTIF_DUR=90, 淡出从 90-30=60 tick开始
    sys.update(75)
    const notif = (sys as any).notifs[0]
    expect(notif.alpha).toBeLessThan(1)
  })

  it('update 早期阶段 alpha 为 1', () => {
    sys.pushEvent(makeEvent())
    sys.update(0)
    sys.update(30)
    const notif = (sys as any).notifs[0]
    expect(notif.alpha).toBe(1)
  })

  it('无 notifs 时 update 不抛出', () => {
    expect(() => sys.update(100)).not.toThrow()
  })
})

describe('EvolutionVisualSystem — buildLayout() 私有方法', () => {
  let sys: EvolutionVisualSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('无节点时 buildLayout 返回空数组', () => {
    const layout = (sys as any).buildLayout()
    expect(layout).toHaveLength(0)
  })

  it('单根节点 buildLayout 返回一个根', () => {
    sys.addNode(makeNode({ id: 1, parentId: null }))
    const layout = (sys as any).buildLayout()
    expect(layout).toHaveLength(1)
  })

  it('父子节点关系正确构建', () => {
    sys.addNode(makeNode({ id: 1, parentId: null }))
    sys.addNode(makeNode({ id: 2, parentId: 1 }))
    const layout = (sys as any).buildLayout()
    expect(layout[0].children).toHaveLength(1)
  })

  it('多个根节点时返回多个根', () => {
    sys.addNode(makeNode({ id: 1, parentId: null }))
    sys.addNode(makeNode({ id: 2, parentId: null }))
    const layout = (sys as any).buildLayout()
    expect(layout).toHaveLength(2)
  })
})

describe('EvolutionVisualSystem — render() 调用安全性', () => {
  let sys: EvolutionVisualSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('不可见时 render 不调用 ctx.save（tree 部分）', () => {
    const ctx = makeCtx()
    sys.render(ctx, 800, 600)
    // save 可能被 renderNotifs 调用（notifs 为空时不调用）
    expect(ctx.save).not.toHaveBeenCalled()
  })

  it('toggle 后 render 调用 ctx.save', () => {
    const ctx = makeCtx()
    sys.toggle()
    sys.render(ctx, 800, 600)
    expect(ctx.save).toHaveBeenCalled()
  })

  it('有 notif 时 render 调用 ctx.save（renderNotifs）', () => {
    const ctx = makeCtx()
    sys.pushEvent(makeEvent())
    sys.render(ctx, 800, 600)
    expect(ctx.save).toHaveBeenCalled()
  })

  it('render 在不同屏幕尺寸下不抛出', () => {
    const ctx = makeCtx()
    sys.toggle()
    expect(() => sys.render(ctx, 1920, 1080)).not.toThrow()
    expect(() => sys.render(ctx, 400, 300)).not.toThrow()
  })

  it('有 nodes 时 render 不抛出', () => {
    const ctx = makeCtx()
    sys.toggle()
    sys.addNode(makeNode({ id: 1 }))
    expect(() => sys.render(ctx, 800, 600)).not.toThrow()
  })

  it('有 events 时 render 不抛出', () => {
    const ctx = makeCtx()
    sys.toggle()
    sys.pushEvent(makeEvent())
    expect(() => sys.render(ctx, 800, 600)).not.toThrow()
  })
})

describe('EvolutionVisualSystem — 综合场景', () => {
  let sys: EvolutionVisualSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('addNode + updatePopulation + pushEvent 组合不抛出', () => {
    sys.addNode(makeNode({ id: 1 }))
    sys.updatePopulation(1, 100)
    sys.pushEvent(makeEvent({ tick: 5 }))
    expect((sys as any).nodes.size).toBe(1)
    expect((sys as any).events).toHaveLength(1)
  })

  it('多物种节点正确存储', () => {
    sys.addNode(makeNode({ id: 1, species: 'human' }))
    sys.addNode(makeNode({ id: 2, species: 'elf' }))
    sys.addNode(makeNode({ id: 3, species: 'dwarf' }))
    expect((sys as any).nodes.size).toBe(3)
  })

  it('toggle 开/关 再 render 不崩溃', () => {
    const ctx = makeCtx()
    sys.toggle()
    sys.render(ctx, 800, 600)
    sys.toggle()
    sys.render(ctx, 800, 600)
    expect(true).toBe(true)
  })

  it('pushEvent 连续推 3 个 notif 后第 4 个时 notifs 长度为 3', () => {
    for (let i = 0; i < 4; i++) {
      sys.pushEvent(makeEvent({ tick: i }))
    }
    expect((sys as any).notifs).toHaveLength(3)
  })

  it('_minT 始终保持最小 tick 值', () => {
    sys.pushEvent(makeEvent({ tick: 200 }))
    sys.pushEvent(makeEvent({ tick: 5 }))
    sys.pushEvent(makeEvent({ tick: 100 }))
    expect((sys as any)._minT).toBe(5)
  })

  it('_maxT 始终保持最大 tick 值', () => {
    sys.pushEvent(makeEvent({ tick: 1 }))
    sys.pushEvent(makeEvent({ tick: 500 }))
    sys.pushEvent(makeEvent({ tick: 200 }))
    expect((sys as any)._maxT).toBe(500)
  })
})
