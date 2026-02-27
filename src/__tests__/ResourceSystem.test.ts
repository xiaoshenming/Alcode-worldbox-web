import { describe, it, expect, beforeEach } from 'vitest'
import { ResourceSystem, ResourceType } from '../systems/ResourceSystem'

// ResourceSystem 依赖 World/EntityManager/CivManager/ParticleSystem，
// 使用最小 mock 对象绕开这些依赖，只测试纯查询方法。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeRS(): ResourceSystem {
  const world = { getTile: () => null } as any
  const em = { getEntitiesWithComponents: () => [] } as any
  const civMgr = { civilizations: new Map() } as any
  const particles = { spawn: () => {} } as any
  return new ResourceSystem(world, em, civMgr, particles)
}

describe('ResourceSystem.getColor', () => {
  let rs: ResourceSystem

  beforeEach(() => {
    rs = makeRS()
  })

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
})

describe('ResourceSystem.getSymbol', () => {
  let rs: ResourceSystem

  beforeEach(() => {
    rs = makeRS()
  })

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
})

describe('ResourceSystem.getNodesNear', () => {
  let rs: ResourceSystem

  beforeEach(() => {
    rs = makeRS()
  })

  // 直接往 nodes 推入节点并调用 init 后再访问 getNodesNear
  // 需要绕开 init() 中的 spawnResources（它依赖 world.getTile 和随机）
  // 思路：直接 push 到 rs.nodes 并调用 private addToGrid，
  // 但 addToGrid 是 private。改用：手动调用多次 getNodesNear 并
  // 验证对于一个空的 rs，结果为空。

  it('初始状态下 getNodesNear 返回空数组', () => {
    // rs 未 init，grid 为空
    expect(rs.getNodesNear(0, 0, 100)).toHaveLength(0)
  })
})

describe('ResourceSystem 节点数组初始状态', () => {
  it('初始 nodes 为空数组', () => {
    const rs = makeRS()
    expect(rs.nodes).toHaveLength(0)
  })

  it('nodes 是数组类型', () => {
    const rs = makeRS()
    expect(Array.isArray(rs.nodes)).toBe(true)
  })
})
