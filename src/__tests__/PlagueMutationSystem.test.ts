import { describe, it, expect, beforeEach } from 'vitest'
import { PlagueMutationSystem } from '../systems/PlagueMutationSystem'

function makeSys(): PlagueMutationSystem { return new PlagueMutationSystem() }
let nextId = 1
function makeStrain(extinct: boolean = false) {
  return {
    id: nextId++,
    name: 'Plague-1',
    parentId: 0,
    infectRate: 0.3,
    lethality: 0.1,
    mutationRate: 0.05,
    symptoms: ['fever', 'cough'],
    infected: 5,
    deaths: 1,
    createdTick: 0,
    extinct
  }
}

describe('PlagueMutationSystem.getActiveStrains', () => {
  let sys: PlagueMutationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无毒株', () => { expect(sys.getActiveStrains()).toHaveLength(0) })
  it('注入非灭绝毒株后可查询', () => {
    ;(sys as any).strains.push(makeStrain(false))
    expect(sys.getActiveStrains()).toHaveLength(1)
  })
  it('灭绝的毒株不返回', () => {
    ;(sys as any).strains.push(makeStrain(true))
    expect(sys.getActiveStrains()).toHaveLength(0)
  })
  it('返回过滤结果（不是内部引用）', () => {
    ;(sys as any).strains.push(makeStrain(false))
    const result = sys.getActiveStrains()
    expect(result).not.toBe((sys as any).strains)
  })
  it('毒株字段正确', () => {
    ;(sys as any).strains.push(makeStrain(false))
    const s = sys.getActiveStrains()[0]
    expect(s.infectRate).toBe(0.3)
    expect(s.symptoms).toHaveLength(2)
  })
  it('6种症状类型', () => {
    const symptoms = ['fever', 'cough', 'rash', 'weakness', 'madness', 'blindness']
    const strain = makeStrain(false)
    strain.symptoms = symptoms as any
    ;(sys as any).strains.push(strain)
    expect(sys.getActiveStrains()[0].symptoms).toHaveLength(6)
  })
})
