import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticIndulgenceSystem } from '../systems/DiplomaticIndulgenceSystem'
function makeSys() { return new DiplomaticIndulgenceSystem() }
describe('DiplomaticIndulgenceSystem', () => {
  let sys: DiplomaticIndulgenceSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getGrants为空', () => { expect(sys.getGrants()).toHaveLength(0) })
  it('注入后getGrants返回数据', () => {
    ;(sys as any).grants.push({ id: 1 })
    expect(sys.getGrants()).toHaveLength(1)
  })
})
