import { describe, it, expect, beforeEach } from 'vitest'
import { ResourceFlowSystem } from '../systems/ResourceFlowSystem'
function makeSys() { return new ResourceFlowSystem() }
describe('ResourceFlowSystem', () => {
  let sys: ResourceFlowSystem
  beforeEach(() => { sys = makeSys() })
  it('初始routes为空', () => { expect((sys as any).routes).toHaveLength(0) })
})
