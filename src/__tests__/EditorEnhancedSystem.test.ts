import { describe, it, expect, beforeEach } from 'vitest'
import { EditorEnhancedSystem } from '../systems/EditorEnhancedSystem'
function makeSys() { return new EditorEnhancedSystem() }
describe('EditorEnhancedSystem', () => {
  let sys: EditorEnhancedSystem
  beforeEach(() => { sys = makeSys() })
  it('getBrushSize返回正数', () => { expect(sys.getBrushSize()).toBeGreaterThan(0) })
})
