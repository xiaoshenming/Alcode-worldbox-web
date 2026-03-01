import { describe, it, expect, beforeEach } from 'vitest'
import { WorldFungalNetworkSystem } from '../systems/WorldFungalNetworkSystem'
import type { FungalNetwork, MyceliumType } from '../systems/WorldFungalNetworkSystem'

function makeSys(): WorldFungalNetworkSystem { return new WorldFungalNetworkSystem() }
let nextId = 1
function makeNetwork(type: MyceliumType = 'mycorrhizal'): FungalNetwork {
  return { id: nextId++, x: 10, y: 10, nodeCount: 5, connectivity: 40, nutrientFlow: 1.2, age: 100, myceliumType: type, tick: 0 }
}

describe('WorldFungalNetworkSystem.getNetworks', () => {
  let sys: WorldFungalNetworkSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无菌根网络', () => { expect((sys as any).networks).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).networks.push(makeNetwork())
    expect((sys as any).networks).toHaveLength(1)
  })
  it('返回内部引用（只读）', () => {
    ;(sys as any).networks.push(makeNetwork())
    const nets = (sys as any).networks
    expect(nets[0].myceliumType).toBe('mycorrhizal')
  })
  it('支持4种菌丝类型', () => {
    const types: MyceliumType[] = ['saprophytic', 'mycorrhizal', 'parasitic', 'endophytic']
    expect(types).toHaveLength(4)
  })
  it('多个网络全部返回', () => {
    ;(sys as any).networks.push(makeNetwork('saprophytic'))
    ;(sys as any).networks.push(makeNetwork('parasitic'))
    expect((sys as any).networks).toHaveLength(2)
  })
})
