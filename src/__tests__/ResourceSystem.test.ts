import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ResourceSystem, ResourceType } from '../systems/ResourceSystem'
import type { ResourceNode } from '../systems/ResourceSystem'

// ResourceSystem 依赖 World/EntityManager/CivManager/ParticleSystem，
// 使用最小 mock 对象绕开这些依赖，只测试纯查询方法。
function makeRS(): ResourceSystem {
  const world = { getTile: () => null } as any
  const em = { getEntitiesWithComponents: () => [] } as any
  const civMgr = { civilizations: new Map() } as any
  const particles = { spawn: () => {} } as any
  return new ResourceSystem(world, em, civMgr, particles)
}

function makeNode(
  x: number, y: number,
  type: ResourceType = 'tree',
  amount = 40, maxAmount = 40
): ResourceNode {
  return { x, y, type, amount, maxAmount }
}

// 向 ResourceSystem 注入节点并同步进 grid（通过调用私有 addToGrid）
function injectNode(rs: ResourceSystem, node: ResourceNode): void {
  rs.nodes.push(node)
  ;(rs as any).addToGrid(node)
}

describe('ResourceSystem 初始化状态', () => {
  let rs: ResourceSystem

  beforeEach(() => { rs = makeRS() })
  afterEach(() => vi.restoreAllMocks())

  it('初始 nodes 为空数组', () => {
    expect(rs.nodes).toHaveLength(0)
  })

  it('nodes 是数组类型', () => {
    expect(Array.isArray(rs.nodes)).toBe(true)
  })

  it('初始 grid 为空 Map', () => {
    expect((rs as any).grid instanceof Map).toBe(true)
    expect((rs as any).grid.size).toBe(0)
  })

  it('initialized 初始为 false', () => {
    expect((rs as any).initialized).toBe(false)
  })

  it('_nodesNearBuf 初始为空数组', () => {
    expect(Array.isArray((rs as any)._nodesNearBuf)).toBe(true)
    expect((rs as any)._nodesNearBuf).toHaveLength(0)
  })
})

describe('ResourceSystem.getColor', () => {
  let rs: ResourceSystem

  beforeEach(() => { rs = makeRS() })
  afterEach(() => vi.restoreAllMocks())

  it('tree 颜色以 # 开头', () => {
    expect(rs.getColor('tree')).toMatch(/^#/)
  })

  it('stone 颜色以 # 开头', () => {
    expect(rs.getColor('stone')).toMatch(/^#/)
  })

  it('berry 颜色以 # 开头', () => {
    expect(rs.getColor('berry')).toMatch(/^#/)
  })

  it('gold_ore 颜色以 # 开头', () => {
    expect(rs.getColor('gold_ore')).toMatch(/^#/)
  })

  it('所有类型颜色格式为 #RRGGBB', () => {
    const types: ResourceType[] = ['tree', 'stone', 'berry', 'gold_ore']
    for (const t of types) {
      expect(rs.getColor(t)).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it('tree 颜色为深绿色 #1a5a1a', () => {
    expect(rs.getColor('tree')).toBe('#1a5a1a')
  })

  it('stone 颜色为灰色 #888899', () => {
    expect(rs.getColor('stone')).toBe('#888899')
  })

  it('berry 颜色为玫红色 #cc4488', () => {
    expect(rs.getColor('berry')).toBe('#cc4488')
  })

  it('gold_ore 颜色为金色 #ffcc00', () => {
    expect(rs.getColor('gold_ore')).toBe('#ffcc00')
  })

  it('不同类型有不同颜色', () => {
    const colors = new Set([
      rs.getColor('tree'),
      rs.getColor('stone'),
      rs.getColor('berry'),
      rs.getColor('gold_ore'),
    ])
    expect(colors.size).toBe(4)
  })
})

describe('ResourceSystem.getSymbol', () => {
  let rs: ResourceSystem

  beforeEach(() => { rs = makeRS() })
  afterEach(() => vi.restoreAllMocks())

  it('所有类型符号是非空字符串', () => {
    const types: ResourceType[] = ['tree', 'stone', 'berry', 'gold_ore']
    for (const t of types) {
      const sym = rs.getSymbol(t)
      expect(typeof sym).toBe('string')
      expect(sym.length).toBeGreaterThan(0)
    }
  })

  it('不同类型有不同符号', () => {
    const symbols = new Set([
      rs.getSymbol('tree'),
      rs.getSymbol('stone'),
      rs.getSymbol('berry'),
      rs.getSymbol('gold_ore'),
    ])
    expect(symbols.size).toBe(4)
  })

  it('tree 符号为 ♣', () => {
    expect(rs.getSymbol('tree')).toBe('♣')
  })

  it('stone 符号为 ◆', () => {
    expect(rs.getSymbol('stone')).toBe('◆')
  })

  it('berry 符号为 ●', () => {
    expect(rs.getSymbol('berry')).toBe('●')
  })

  it('gold_ore 符号为 ★', () => {
    expect(rs.getSymbol('gold_ore')).toBe('★')
  })

  it('getSymbol 返回字符串类型', () => {
    expect(typeof rs.getSymbol('tree')).toBe('string')
  })
})

describe('ResourceSystem.getNodesNear 基础场景', () => {
  let rs: ResourceSystem

  beforeEach(() => { rs = makeRS() })
  afterEach(() => vi.restoreAllMocks())

  it('初始状态下 getNodesNear 返回空数组', () => {
    expect(rs.getNodesNear(0, 0, 100)).toHaveLength(0)
  })

  it('节点在范围内时被返回', () => {
    injectNode(rs, makeNode(5, 5))
    const result = rs.getNodesNear(5, 5, 10)
    expect(result).toHaveLength(1)
  })

  it('节点在范围外时不被返回', () => {
    injectNode(rs, makeNode(100, 100))
    const result = rs.getNodesNear(0, 0, 5)
    expect(result).toHaveLength(0)
  })

  it('边界上的节点（距离恰好等于 range）被包含', () => {
    injectNode(rs, makeNode(10, 0))
    // 距离 = 10，rangeSq = 100，dx*dx+dy*dy=100 <= 100 → 包含
    const result = rs.getNodesNear(0, 0, 10)
    expect(result).toHaveLength(1)
  })

  it('返回的是 _nodesNearBuf 引用', () => {
    const result1 = rs.getNodesNear(0, 0, 100)
    const result2 = rs.getNodesNear(0, 0, 100)
    expect(result1).toBe(result2)
  })
})

describe('ResourceSystem.getNodesNear 多节点场景', () => {
  let rs: ResourceSystem

  beforeEach(() => { rs = makeRS() })
  afterEach(() => vi.restoreAllMocks())

  it('只返回范围内的节点，不返回范围外的', () => {
    injectNode(rs, makeNode(0, 0))
    injectNode(rs, makeNode(50, 50))
    const result = rs.getNodesNear(0, 0, 5)
    expect(result).toHaveLength(1)
    expect(result[0].x).toBe(0)
    expect(result[0].y).toBe(0)
  })

  it('多个节点在范围内都被返回', () => {
    injectNode(rs, makeNode(0, 0))
    injectNode(rs, makeNode(1, 1))
    injectNode(rs, makeNode(2, 2))
    const result = rs.getNodesNear(1, 1, 5)
    expect(result).toHaveLength(3)
  })

  it('不同类型的节点混合时都能找到', () => {
    injectNode(rs, makeNode(0, 0, 'tree'))
    injectNode(rs, makeNode(1, 0, 'stone'))
    injectNode(rs, makeNode(0, 1, 'berry'))
    injectNode(rs, makeNode(1, 1, 'gold_ore'))
    const result = rs.getNodesNear(0, 0, 15)
    expect(result).toHaveLength(4)
  })

  it('range=0 时只有同坐标节点被包含', () => {
    injectNode(rs, makeNode(5, 5))
    injectNode(rs, makeNode(6, 5))
    const result = rs.getNodesNear(5, 5, 0)
    // dx=0,dy=0 → 0<=0 包含; dx=1,dy=0 → 1>0 不包含
    expect(result).toHaveLength(1)
  })

  it('大范围时所有节点都被返回', () => {
    for (let i = 0; i < 10; i++) {
      injectNode(rs, makeNode(i * 5, i * 5))
    }
    const result = rs.getNodesNear(0, 0, 1000)
    expect(result).toHaveLength(10)
  })
})

describe('ResourceSystem 私有 gridKey 方法', () => {
  let rs: ResourceSystem

  beforeEach(() => { rs = makeRS() })
  afterEach(() => vi.restoreAllMocks())

  it('相同格子内的坐标返回相同 key', () => {
    const k1 = (rs as any).gridKey(0, 0)
    const k2 = (rs as any).gridKey(5, 5)
    expect(k1).toBe(k2)
  })

  it('不同格子返回不同 key', () => {
    const k1 = (rs as any).gridKey(0, 0)
    const k2 = (rs as any).gridKey(20, 0)
    expect(k1).not.toBe(k2)
  })

  it('gridKey 返回数字类型', () => {
    const key = (rs as any).gridKey(10, 10)
    expect(typeof key).toBe('number')
  })

  it('负坐标也能产生合法 key（不抛错）', () => {
    expect(() => (rs as any).gridKey(-5, -5)).not.toThrow()
  })
})

describe('ResourceSystem 私有 addToGrid/removeFromGrid 方法', () => {
  let rs: ResourceSystem

  beforeEach(() => { rs = makeRS() })
  afterEach(() => vi.restoreAllMocks())

  it('addToGrid 后 grid 包含对应 key', () => {
    const node = makeNode(0, 0)
    ;(rs as any).addToGrid(node)
    const key = (rs as any).gridKey(0, 0)
    expect((rs as any).grid.has(key)).toBe(true)
  })

  it('addToGrid 同格子两个节点都保存', () => {
    const n1 = makeNode(0, 0)
    const n2 = makeNode(1, 1)
    ;(rs as any).addToGrid(n1)
    ;(rs as any).addToGrid(n2)
    const key = (rs as any).gridKey(0, 0)
    expect((rs as any).grid.get(key)).toHaveLength(2)
  })

  it('removeFromGrid 后节点从 grid 移除', () => {
    const node = makeNode(0, 0)
    ;(rs as any).addToGrid(node)
    ;(rs as any).removeFromGrid(node)
    const key = (rs as any).gridKey(0, 0)
    expect((rs as any).grid.has(key)).toBe(false)
  })

  it('removeFromGrid 不存在的节点不报错', () => {
    const node = makeNode(0, 0)
    expect(() => (rs as any).removeFromGrid(node)).not.toThrow()
  })

  it('removeFromGrid 单元格清空后 key 也被删除', () => {
    const node = makeNode(0, 0)
    ;(rs as any).addToGrid(node)
    ;(rs as any).removeFromGrid(node)
    const key = (rs as any).gridKey(0, 0)
    expect((rs as any).grid.has(key)).toBe(false)
  })

  it('移除一个节点后同格其他节点保留', () => {
    const n1 = makeNode(0, 0)
    const n2 = makeNode(2, 2)
    ;(rs as any).addToGrid(n1)
    ;(rs as any).addToGrid(n2)
    ;(rs as any).removeFromGrid(n1)
    const key = (rs as any).gridKey(0, 0)
    const cell = (rs as any).grid.get(key)
    expect(cell).toHaveLength(1)
    expect(cell[0]).toBe(n2)
  })
})

describe('ResourceSystem nodes 数组手动操作', () => {
  let rs: ResourceSystem

  beforeEach(() => { rs = makeRS() })
  afterEach(() => vi.restoreAllMocks())

  it('手动 push 节点后 nodes 长度增加', () => {
    rs.nodes.push(makeNode(0, 0))
    expect(rs.nodes).toHaveLength(1)
  })

  it('节点字段存储正确', () => {
    const node = makeNode(3, 7, 'gold_ore', 25, 30)
    rs.nodes.push(node)
    const stored = rs.nodes[0]
    expect(stored.x).toBe(3)
    expect(stored.y).toBe(7)
    expect(stored.type).toBe('gold_ore')
    expect(stored.amount).toBe(25)
    expect(stored.maxAmount).toBe(30)
  })

  it('可以通过 splice 移除节点', () => {
    rs.nodes.push(makeNode(0, 0))
    rs.nodes.push(makeNode(1, 1))
    rs.nodes.splice(0, 1)
    expect(rs.nodes).toHaveLength(1)
  })

  it('maxAmount 大于等于 amount', () => {
    const node = makeNode(0, 0, 'stone', 30, 50)
    expect(node.amount).toBeLessThanOrEqual(node.maxAmount)
  })
})

describe('ResourceSystem init 方法', () => {
  afterEach(() => vi.restoreAllMocks())

  it('init 执行后 initialized 为 true', () => {
    const world = { getTile: () => null } as any
    const em = { getEntitiesWithComponents: () => [] } as any
    const civMgr = { civilizations: new Map() } as any
    const particles = { spawn: () => {} } as any
    const rs = new ResourceSystem(world, em, civMgr, particles)
    rs.init()
    expect((rs as any).initialized).toBe(true)
  })

  it('重复调用 init 不报错', () => {
    const world = { getTile: () => null } as any
    const em = { getEntitiesWithComponents: () => [] } as any
    const civMgr = { civilizations: new Map() } as any
    const particles = { spawn: () => {} } as any
    const rs = new ResourceSystem(world, em, civMgr, particles)
    rs.init()
    expect(() => rs.init()).not.toThrow()
  })
})
