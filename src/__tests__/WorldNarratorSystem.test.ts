import { describe, it, expect, beforeEach } from 'vitest'
import { WorldNarratorSystem } from '../systems/WorldNarratorSystem'

function makeSys(): WorldNarratorSystem { return new WorldNarratorSystem() }

describe('WorldNarratorSystem.getEntries', () => {
  let sys: WorldNarratorSystem
  beforeEach(() => { sys = makeSys() })

  it('初始无叙事条目', () => { expect(sys.getEntries()).toHaveLength(0) })
  it('addNarrative后增加', () => {
    sys.addNarrative('war', '战争爆发了', 100)
    expect(sys.getEntries()).toHaveLength(1)
  })
  it('条目字段正确', () => {
    sys.addNarrative('disaster', '洪水来袭', 200, 4)
    const e = sys.getEntries()[0]
    expect(e.type).toBe('disaster')
    expect(e.text).toBe('洪水来袭')
    expect(e.tick).toBe(200)
    expect(e.importance).toBe(4)
    expect(e.read).toBe(false)
  })
  it('返回只读引用', () => {
    expect(sys.getEntries()).toBe((sys as any).entries)
  })
})

describe('WorldNarratorSystem.getUnreadCount', () => {
  let sys: WorldNarratorSystem
  beforeEach(() => { sys = makeSys() })

  it('初始未读数为0', () => { expect(sys.getUnreadCount()).toBe(0) })
  it('addNarrative后增加', () => {
    sys.addNarrative('hero', '英雄崛起', 100)
    sys.addNarrative('rise', '文明崛起', 200)
    expect(sys.getUnreadCount()).toBe(2)
  })
})
