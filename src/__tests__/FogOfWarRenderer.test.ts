import { describe, it, expect, beforeEach } from 'vitest'
import { FogOfWarRenderer } from '../systems/FogOfWarRenderer'
function makeSys() { return new FogOfWarRenderer() }
describe('FogOfWarRenderer', () => {
  let sys: FogOfWarRenderer
  beforeEach(() => { sys = makeSys() })
  it('初始animTime为0', () => { expect((sys as any).animTime).toBe(0) })
})
