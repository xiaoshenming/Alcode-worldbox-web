import { describe, it, expect, beforeEach } from 'vitest'
import { CropSystem } from '../systems/CropSystem'
import type { CropField, CropType, CropStage } from '../systems/CropSystem'
import { Season } from '../systems/SeasonSystem'

function makeSys(): CropSystem { return new CropSystem() }
function makeCrop(cropType: CropType = 'wheat', stage: CropStage = 'growing'): CropField {
  return {
    x: 5, y: 5, civId: 1, cropType,
    growth: 50, stage, plantedSeason: Season.Spring, yield: 8
  }
}

describe('CropSystem.getCropFields', () => {
  let sys: CropSystem
  beforeEach(() => { sys = makeSys() })

  it('初始无农田', () => { expect(sys.getCropFields()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).fields.push(makeCrop())
    expect(sys.getCropFields()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).fields.push(makeCrop())
    expect(sys.getCropFields()).toBe((sys as any).fields)
  })
  it('支持4种作物类型', () => {
    const types: CropType[] = ['wheat', 'corn', 'rice', 'potato']
    types.forEach(t => { ;(sys as any).fields.push(makeCrop(t)) })
    const all = sys.getCropFields()
    types.forEach((t, i) => { expect(all[i].cropType).toBe(t) })
  })
  it('支持5种生长阶段', () => {
    const stages: CropStage[] = ['planted', 'growing', 'mature', 'harvested', 'dead']
    stages.forEach(s => { ;(sys as any).fields.push(makeCrop('wheat', s)) })
    expect(sys.getCropFields()).toHaveLength(5)
  })
  it('作物字段正确', () => {
    ;(sys as any).fields.push(makeCrop('corn'))
    const f = sys.getCropFields()[0]
    expect(f.cropType).toBe('corn')
    expect(f.growth).toBe(50)
  })
})
