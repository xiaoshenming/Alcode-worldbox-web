import { describe, it, expect, beforeEach } from 'vitest'
import { EventNotificationSystem } from '../systems/EventNotificationSystem'
function makeSys() { return new EventNotificationSystem() }
describe('EventNotificationSystem', () => {
  let sys: EventNotificationSystem
  beforeEach(() => { sys = makeSys() })
  it('getRecentEvents初始为空', () => { expect(sys.getRecentEvents(10)).toHaveLength(0) })
  it('clear 不崩溃', () => { expect(() => sys.clear()).not.toThrow() })
  it('getRecentEvents count=0 返回空数组', () => { expect(sys.getRecentEvents(0)).toHaveLength(0) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('histVisible初始为false', () => { expect((sys as any).histVisible).toBe(false) })
})
