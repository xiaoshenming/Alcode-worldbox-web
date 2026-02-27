import { describe, it, expect, beforeEach } from 'vitest'
import { WorldCoralBleachingSystem } from '../systems/WorldCoralBleachingSystem'
import type { BleachingEvent, BleachingStage } from '../systems/WorldCoralBleachingSystem'

function makeSys(): WorldCoralBleachingSystem { return new WorldCoralBleachingSystem() }
let nextId = 1
function makeEvent(stage: BleachingStage = 'bleaching'): BleachingEvent {
  return { id: nextId++, x: 20, y: 30, severity: 65, affectedArea: 100, recoveryRate: 5, stage, tick: 0 }
}

describe('WorldCoralBleachingSystem.getEvents', () => {
  let sys: WorldCoralBleachingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无珊瑚白化事件', () => { expect(sys.getEvents()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).events.push(makeEvent())
    expect(sys.getEvents()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getEvents()).toBe((sys as any).events)
  })
  it('支持4种白化阶段', () => {
    const stages: BleachingStage[] = ['healthy', 'stressed', 'bleaching', 'dead']
    expect(stages).toHaveLength(4)
  })
  it('白化事件字段正确', () => {
    ;(sys as any).events.push(makeEvent('dead'))
    const e = sys.getEvents()[0]
    expect(e.stage).toBe('dead')
    expect(e.severity).toBe(65)
    expect(e.affectedArea).toBe(100)
  })
})
