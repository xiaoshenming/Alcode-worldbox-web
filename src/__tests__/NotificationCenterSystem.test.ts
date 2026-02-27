import { describe, it, expect, beforeEach } from 'vitest'
import { NotificationCenterSystem } from '../systems/NotificationCenterSystem'
function makeSys() { return new NotificationCenterSystem() }
describe('NotificationCenterSystem', () => {
  let sys: NotificationCenterSystem
  beforeEach(() => { sys = makeSys() })
  it('初始histOpen为false', () => { expect((sys as any).histOpen).toBe(false) })
  it('getClickedNotification无点击返回null', () => {
    expect(sys.getClickedNotification(-999, -999, 1920)).toBeNull()
  })
  it('push 不崩溃', () => {
    expect(() => sys.push('Test message', 'info')).not.toThrow()
  })
  it('push 带坐标不崩溃', () => {
    expect(() => sys.push('Test message', 'warning', 10, 20)).not.toThrow()
  })
  it('cursor初始为0', () => { expect((sys as any).cursor).toBe(0) })
})
