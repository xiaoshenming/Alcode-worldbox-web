import { describe, it, expect, beforeEach } from 'vitest'
import { FortificationRenderer } from '../systems/FortificationRenderer'
function makeSys() { return new FortificationRenderer() }
describe('FortificationRenderer', () => {
  let sys: FortificationRenderer
  beforeEach(() => { sys = makeSys() })
  it('初始fortifications为空', () => { expect((sys as any).fortifications).toHaveLength(0) })
  it('初始animTime为0', () => { expect((sys as any).animTime).toBe(0) })
})
