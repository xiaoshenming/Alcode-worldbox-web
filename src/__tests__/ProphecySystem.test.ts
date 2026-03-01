import { describe, it, expect, beforeEach } from 'vitest'
import { ProphecySystem } from '../systems/ProphecySystem'

function makeSys(): ProphecySystem { return new ProphecySystem() }
// ProphecyState is const enum: Active=0, Fulfilled=1, Failed=2, Expired=3
function makeProphecy(type: string, state: number = 0) {
  return {
    id: 1, type, text: 'A prophecy', state,
    createdTick: 0, deadlineTick: 1000, probability: 0.7, probabilityStr: '70',
    civId: -1, notified: false
  }
}

describe('ProphecySystem getters', () => {
  let sys: ProphecySystem
  beforeEach(() => { sys = makeSys() })

  it('初始无活跃预言', () => { expect((sys as any).prophecies).toHaveLength(0) })
  it('注入后可查询prophecies', () => {
    ;(sys as any).prophecies.push(makeProphecy('disaster'))
    expect((sys as any).prophecies).toHaveLength(1)
  })
  it('prophecies是内部数组', () => {
    ;(sys as any).prophecies.push(makeProphecy('war'))
    expect((sys as any).prophecies).toBe((sys as any).prophecies)
  })
  it('初始history为空', () => { expect(sys.getHistory()).toHaveLength(0) })
  it('注入history后可查询', () => {
    ;(sys as any).history.push(makeProphecy('hero', 1))
    expect(sys.getHistory()).toHaveLength(1)
  })
  it('支持7种预言类型', () => {
    const types = ['disaster', 'war', 'prosperity', 'hero', 'doom', 'plague', 'miracle']
    types.forEach(t => { ;(sys as any).prophecies.push(makeProphecy(t)) })
    expect((sys as any).prophecies).toHaveLength(7)
  })
})
