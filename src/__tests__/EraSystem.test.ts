import { describe, it, expect, beforeEach } from 'vitest'
import { EraSystem } from '../systems/EraSystem'
import type { EraName } from '../systems/EraSystem'

function makeSys(): EraSystem { return new EraSystem() }

describe('EraSystem.getEra', () => {
  let sys: EraSystem
  beforeEach(() => { sys = makeSys() })

  it('未注入时返回stone时代', () => {
    expect(sys.getEra(1)).toBe('stone')
  })
  it('注入后可查询指定文明时代', () => {
    ;(sys as any).civEras.set(1, 'medieval' as EraName)
    expect(sys.getEra(1)).toBe('medieval')
  })
  it('支持5种时代', () => {
    const eras: EraName[] = ['stone', 'bronze', 'iron', 'medieval', 'renaissance']
    eras.forEach((e, i) => { ;(sys as any).civEras.set(i + 1, e) })
    eras.forEach((e, i) => { expect(sys.getEra(i + 1)).toBe(e) })
  })
  it('不同文明时代相互独立', () => {
    ;(sys as any).civEras.set(1, 'stone' as EraName)
    ;(sys as any).civEras.set(2, 'renaissance' as EraName)
    expect(sys.getEra(1)).toBe('stone')
    expect(sys.getEra(2)).toBe('renaissance')
  })
  it('未登记文明返回stone默认值', () => {
    expect(sys.getEra(999)).toBe('stone')
  })
})
