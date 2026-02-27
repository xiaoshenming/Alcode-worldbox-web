import { describe, it, expect, beforeEach } from 'vitest'
import { EditorEnhancedSystem } from '../systems/EditorEnhancedSystem'
function makeSys() { return new EditorEnhancedSystem() }
describe('EditorEnhancedSystem', () => {
  let sys: EditorEnhancedSystem
  beforeEach(() => { sys = makeSys() })
  it('getBrushSize返回正数', () => { expect(sys.getBrushSize()).toBeGreaterThan(0) })
  it('setBrushSize 可以设置画笔大小', () => {
    sys.setBrushSize(5)
    expect(sys.getBrushSize()).toBe(5)
  })
  it('setBrushSize 超出最大值时被 clamp 到 20', () => {
    sys.setBrushSize(100)
    expect(sys.getBrushSize()).toBe(20)
  })
  it('setBrushSize 低于最小值时被 clamp 到 1', () => {
    sys.setBrushSize(0)
    expect(sys.getBrushSize()).toBe(1)
  })
  it('adjustBrushSize 增加画笔大小', () => {
    const before = sys.getBrushSize()
    sys.adjustBrushSize(2)
    expect(sys.getBrushSize()).toBe(before + 2)
  })
})
