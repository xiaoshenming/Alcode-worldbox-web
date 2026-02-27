import { describe, it, expect, beforeEach } from 'vitest'
import { WorldIrrigationSystem } from '../systems/WorldIrrigationSystem'
import type { IrrigationChannel, ChannelState } from '../systems/WorldIrrigationSystem'

function makeSys(): WorldIrrigationSystem { return new WorldIrrigationSystem() }
let nextId = 1
function makeChannel(state: ChannelState = 'flowing'): IrrigationChannel {
  return { id: nextId++, startX: 0, startY: 0, endX: 10, endY: 10, state, flowRate: 1.5, siltLevel: 10, length: 20, tick: 0 }
}

describe('WorldIrrigationSystem.getChannels', () => {
  let sys: WorldIrrigationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无水渠', () => { expect(sys.getChannels()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).channels.push(makeChannel())
    expect(sys.getChannels()).toHaveLength(1)
  })
  it('返回只读引用', () => {
    ;(sys as any).channels.push(makeChannel())
    expect(sys.getChannels()[0].state).toBe('flowing')
  })
  it('支持4种渠道状态', () => {
    const states: ChannelState[] = ['planned', 'digging', 'flowing', 'silted']
    expect(states).toHaveLength(4)
  })
  it('多条水渠全部返回', () => {
    ;(sys as any).channels.push(makeChannel('planned'))
    ;(sys as any).channels.push(makeChannel('flowing'))
    ;(sys as any).channels.push(makeChannel('silted'))
    expect(sys.getChannels()).toHaveLength(3)
  })
})
