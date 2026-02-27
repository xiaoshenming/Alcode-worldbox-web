import { describe, it, expect, beforeEach } from 'vitest'
import { EventNotificationSystem } from '../systems/EventNotificationSystem'
function makeSys() { return new EventNotificationSystem() }
describe('EventNotificationSystem', () => {
  let sys: EventNotificationSystem
  beforeEach(() => { sys = makeSys() })
  it('getRecentEvents初始为空', () => { expect(sys.getRecentEvents(10)).toHaveLength(0) })
})
