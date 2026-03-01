import { describe, it, expect, beforeEach } from 'vitest'
import { NotificationCenterSystem } from '../systems/NotificationCenterSystem'
function makeSys() { return new NotificationCenterSystem() }
describe('NotificationCenterSystem', () => {
  let sys: NotificationCenterSystem
  beforeEach(() => { sys = makeSys() })
  it('初始histOpen为false', () => { expect((sys as any).histOpen).toBe(false) })
  it('初始pool无active槽', () => {
    const pool = (sys as any).pool
    expect(pool.every((e: any) => !e.active)).toBe(true)
  })
  it('push 不崩溃', () => {
    expect(() => sys.push('Test message', 'info')).not.toThrow()
  })
  it('push 带坐标不崩溃', () => {
    expect(() => sys.push('Test message', 'warning', 10, 20)).not.toThrow()
  })
  it('cursor初始为0', () => { expect((sys as any).cursor).toBe(0) })
})
