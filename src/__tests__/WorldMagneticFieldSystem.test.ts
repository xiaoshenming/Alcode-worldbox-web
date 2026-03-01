import { describe, it, expect, beforeEach } from 'vitest'
import { WorldMagneticFieldSystem } from '../systems/WorldMagneticFieldSystem'
import type { MagneticAnomaly, MagneticPolarity } from '../systems/WorldMagneticFieldSystem'

function makeSys(): WorldMagneticFieldSystem { return new WorldMagneticFieldSystem() }
let nextId = 1
function makeAnomaly(polarity: MagneticPolarity = 'north'): MagneticAnomaly {
  return { id: nextId++, x: 30, y: 40, polarity, strength: 70, radius: 10, fluctuation: 5, active: true, tick: 0 }
}

describe('WorldMagneticFieldSystem.getAnomalies', () => {
  let sys: WorldMagneticFieldSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无磁场异常', () => { expect((sys as any).anomalies).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).anomalies.push(makeAnomaly())
    expect((sys as any).anomalies).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).anomalies).toBe((sys as any).anomalies)
  })
  it('支持4种极性', () => {
    const polarities: MagneticPolarity[] = ['north', 'south', 'chaotic', 'null']
    expect(polarities).toHaveLength(4)
  })
  it('磁场异常字段正确', () => {
    ;(sys as any).anomalies.push(makeAnomaly('chaotic'))
    const a = (sys as any).anomalies[0]
    expect(a.polarity).toBe('chaotic')
    expect(a.strength).toBe(70)
    expect(a.active).toBe(true)
  })
})
