import { describe, it, expect, beforeEach } from 'vitest'
import { WorldEventTimelineSystem } from '../systems/WorldEventTimelineSystem'

function makeSys(): WorldEventTimelineSystem { return new WorldEventTimelineSystem() }

describe('WorldEventTimelineSystem', () => {
  let sys: WorldEventTimelineSystem
  beforeEach(() => { sys = makeSys() })

  it('初始eventCount为0', () => { expect(sys.eventCount).toBe(0) })
  it('注入事件后eventCount增加', () => {
    ;(sys as any).events.push({ id: 'e1', tick: 100, label: 'test', icon: '⚡', color: '#fff', category: 'disaster' })
    expect(sys.eventCount).toBe(1)
  })
  it('初始isVisible为false', () => { expect(sys.isVisible).toBe(false) })
  it('注入visible后isVisible为true', () => {
    ;(sys as any).visible = true
    expect(sys.isVisible).toBe(true)
  })
  it('visible初始为false', () => { expect((sys as any).visible).toBe(false) })
})
