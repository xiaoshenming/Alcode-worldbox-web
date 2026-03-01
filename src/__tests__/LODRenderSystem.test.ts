import { describe, it, expect, beforeEach } from 'vitest'
import { LODRenderSystem } from '../systems/LODRenderSystem'
function makeSys() { return new LODRenderSystem() }
describe('LODRenderSystem', () => {
  let sys: LODRenderSystem
  beforeEach(() => { sys = makeSys() })
  it('getLOD返回LOD级别', () => { expect(typeof sys.getLOD()).toBe('string') })
  it('初始currentLOD与getLOD()一致', () => { expect((sys as any).currentLOD).toBe(sys.getLOD()) })
  it('setThresholds不崩溃', () => { expect(() => sys.setThresholds({ full: 2 })).not.toThrow() })
})
