import { describe, it, expect, beforeEach } from 'vitest'
import { WorldEventSystem } from '../systems/WorldEventSystem'

function makeSys(): WorldEventSystem { return new WorldEventSystem() }

describe('WorldEventSystem', () => {
  let sys: WorldEventSystem
  beforeEach(() => { sys = makeSys() })

  it('初始screenOverlay为null', () => {
    expect(sys.getScreenOverlay()).toBeNull()
  })
  it('注入screenOverlay后可查询', () => {
    ;(sys as any).screenOverlay = { color: '#ff0000', alpha: 0.5 }
    const o = sys.getScreenOverlay()
    expect(o).not.toBeNull()
    expect(o!.color).toBe('#ff0000')
    expect(o!.alpha).toBe(0.5)
  })
  it('初始activeEvents为空', () => {
    expect(sys.getActiveEvents()).toHaveLength(0)
  })
  it('初始eventHistory为空', () => {
    expect(sys.getEventHistory()).toHaveLength(0)
  })
  it('注入eventHistory后可查询', () => {
    ;(sys as any).eventHistory.push({ id: 'flood', name: '洪水', tick: 500 })
    const h = sys.getEventHistory()
    expect(h).toHaveLength(1)
    expect(h[0].id).toBe('flood')
  })
})
