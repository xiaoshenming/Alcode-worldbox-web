import { describe, it, expect, beforeEach } from 'vitest'
import { CinematicModeSystem } from '../systems/CinematicModeSystem'
function makeSys() { return new CinematicModeSystem() }
describe('CinematicModeSystem', () => {
  let sys: CinematicModeSystem
  beforeEach(() => { sys = makeSys() })
  it('初始active为false', () => { expect((sys as any).active).toBe(false) })
  it('初始points为空', () => { expect((sys as any).points).toHaveLength(0) })
  it('isActive 初始返回false', () => { expect(sys.isActive()).toBe(false) })
  it('addInterestPoint 后 points 增加', () => {
    sys.addInterestPoint(10, 20, 'TestPoint')
    expect((sys as any).points).toHaveLength(1)
  })
  it('addInterestPoint 存储正确坐标', () => {
    sys.addInterestPoint(10, 20, 'TestPoint')
    const pt = (sys as any).points[0]
    expect(pt.x).toBe(10)
    expect(pt.y).toBe(20)
    expect(pt.label).toBe('TestPoint')
  })
  it('handleKey c 切换active状态', () => {
    sys.handleKey('c')
    expect((sys as any).active).toBe(true)
    sys.handleKey('c')
    expect((sys as any).active).toBe(false)
  })
  it('update() 非激活时返回null', () => {
    expect(sys.update(0)).toBeNull()
  })
})
