import { describe, it, expect, beforeEach } from 'vitest'
import { ResourceFlowSystem } from '../systems/ResourceFlowSystem'

function makeSys() { return new ResourceFlowSystem() }

describe('ResourceFlowSystem', () => {
  let sys: ResourceFlowSystem
  beforeEach(() => { sys = makeSys() })

  it('初始routes为空', () => { expect((sys as any).routes).toHaveLength(0) })

  it('addRoute 返回递增的 ID', () => {
    const id1 = sys.addRoute(0, 0, 10, 10, 'food', 50)
    const id2 = sys.addRoute(0, 0, 20, 20, 'wood', 30)
    expect(id2).toBe(id1 + 1)
  })

  it('addRoute 后 routes 数量增加', () => {
    sys.addRoute(0, 0, 10, 10, 'food', 50)
    expect((sys as any).routes).toHaveLength(1)
    sys.addRoute(5, 5, 15, 15, 'wood', 20)
    expect((sys as any).routes).toHaveLength(2)
  })

  it('removeRoute 后 routes 数量减少', () => {
    const id = sys.addRoute(0, 0, 10, 10, 'food', 50)
    sys.removeRoute(id)
    expect((sys as any).routes).toHaveLength(0)
  })

  it('removeRoute 不存在的 ID 不崩溃', () => {
    expect(() => sys.removeRoute(9999)).not.toThrow()
  })

  it('addRoute 存储正确的路线信息', () => {
    const id = sys.addRoute(1, 2, 3, 4, 'gold', 100)
    const route = (sys as any).routes.find((r: any) => r.id === id)
    expect(route).toBeDefined()
    expect(route.fromX).toBe(1)
    expect(route.fromY).toBe(2)
    expect(route.toX).toBe(3)
    expect(route.toY).toBe(4)
    expect(route.resourceType).toBe('gold')
    expect(route.amount).toBe(100)
  })
})
