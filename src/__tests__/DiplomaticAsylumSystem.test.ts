import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticAsylumSystem } from '../systems/DiplomaticAsylumSystem'
function makeSys() { return new DiplomaticAsylumSystem() }
describe('DiplomaticAsylumSystem', () => {
  let sys: DiplomaticAsylumSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getRequests为空', () => { expect(sys.getRequests()).toHaveLength(0) })
  it('注入后getRequests返回数据', () => {
    ;(sys as any).requests.push({ id: 1 })
    expect(sys.getRequests()).toHaveLength(1)
  })
})
