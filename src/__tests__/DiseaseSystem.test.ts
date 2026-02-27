import { describe, it, expect, beforeEach } from 'vitest'
import { DiseaseSystem } from '../systems/DiseaseSystem'

function makeSys() { return new DiseaseSystem() }

describe('DiseaseSystem', () => {
  let sys: DiseaseSystem
  beforeEach(() => { sys = makeSys() })

  it('初始tickCounter为0', () => { expect((sys as any).tickCounter).toBe(0) })
  it('初始_outbreakGrid为空Map', () => { expect((sys as any)._outbreakGrid.size).toBe(0) })
  it('totalInfected初始为0', () => { expect(sys.totalInfected).toBe(0) })
  it('totalDeaths初始为0', () => { expect(sys.totalDeaths).toBe(0) })
  it('totalRecovered初始为0', () => { expect(sys.totalRecovered).toBe(0) })
  it('totalInfected类型为number', () => { expect(typeof sys.totalInfected).toBe('number') })
  it('totalDeaths与totalRecovered初始均不为负数', () => {
    expect(sys.totalDeaths).toBeGreaterThanOrEqual(0)
    expect(sys.totalRecovered).toBeGreaterThanOrEqual(0)
  })
})
