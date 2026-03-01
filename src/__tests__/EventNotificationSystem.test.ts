import { describe, it, expect, beforeEach } from 'vitest'
import { EventNotificationSystem } from '../systems/EventNotificationSystem'
function makeSys() { return new EventNotificationSystem() }
describe('EventNotificationSystem', () => {
  let sys: EventNotificationSystem
  beforeEach(() => { sys = makeSys() })
  it('histCount初始为0', () => { expect((sys as any).histCount).toBe(0) })
  it('clear 不崩溃', () => { expect(() => sys.clear()).not.toThrow() })
  it('histBuf初始全null', () => { expect((sys as any).histBuf[0]).toBeNull() })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('histVisible初始为false', () => { expect((sys as any).histVisible).toBe(false) })
})
