import { describe, it, expect, beforeEach } from 'vitest'
import { TerraformingSystem } from '../systems/TerraformingSystem'
function makeSys() { return new TerraformingSystem() }
describe('TerraformingSystem', () => {
  let sys: TerraformingSystem
  beforeEach(() => { sys = makeSys() })
  it('getActiveEffects初始为空', () => { expect(sys.getActiveEffects()).toHaveLength(0) })
  it('注入后getActiveEffects返回数据', () => {
    ;(sys as any).effects.push({ id: 1, type: 'raise', x: 0, y: 0, radius: 3, duration: 10, tick: 0 })
    expect(sys.getActiveEffects()).toHaveLength(1)
  })
})
