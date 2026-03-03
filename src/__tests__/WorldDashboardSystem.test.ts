import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldDashboardSystem } from '../systems/WorldDashboardSystem'

function makeSys(): WorldDashboardSystem { return new WorldDashboardSystem() }

describe('WorldDashboardSystem - visibility', () => {
  let sys: WorldDashboardSystem
  beforeEach(() => { sys = makeSys() })

  it('初始isVisible返回false', () => { expect(sys.isVisible()).toBe(false) })
  it('toggle后isVisible为true', () => {
    sys.toggle()
    expect(sys.isVisible()).toBe(true)
  })
  it('再次toggle后isVisible为false', () => {
    sys.toggle()
    sys.toggle()
    expect(sys.isVisible()).toBe(false)
  })
  it('3次toggle后isVisible为true', () => {
    sys.toggle(); sys.toggle(); sys.toggle()
    expect(sys.isVisible()).toBe(true)
  })
  it('4次toggle后isVisible为false', () => {
    sys.toggle(); sys.toggle(); sys.toggle(); sys.toggle()
    expect(sys.isVisible()).toBe(false)
  })
})

describe('WorldDashboardSystem - 初始内部状态', () => {
  let sys: WorldDashboardSystem
  beforeEach(() => { sys = makeSys() })

  it('activeTab初始为religion', () => { expect((sys as any).activeTab).toBe('religion') })
  it('popSamples初始为空数组', () => { expect((sys as any).popSamples).toHaveLength(0) })
  it('popCount初始为0', () => { expect((sys as any).popCount).toBe(0) })
  it('popWriteIndex初始为0', () => { expect((sys as any).popWriteIndex).toBe(0) })
  it('religionData初始为空Map', () => {
    expect((sys as any).religionData.size).toBe(0)
  })
  it('powerData初始为空数组', () => {
    expect((sys as any).powerData).toHaveLength(0)
  })
})

describe('WorldDashboardSystem - addPopulationSample基础', () => {
  let sys: WorldDashboardSystem
  beforeEach(() => { sys = makeSys() })

  it('添加1个sample后popCount=1', () => {
    sys.addPopulationSample(1000, { human: 100 })
    expect((sys as any).popCount).toBe(1)
  })
  it('添加1个sample后popSamples.length=1', () => {
    sys.addPopulationSample(1000, { human: 50 })
    expect((sys as any).popSamples).toHaveLength(1)
  })
  it('添加多个sample后popCount正确', () => {
    for (let i = 0; i < 5; i++) sys.addPopulationSample(i * 100, { human: i * 10 })
    expect((sys as any).popCount).toBe(5)
  })
  it('sample的tick字段正确存储', () => {
    sys.addPopulationSample(9999, { elf: 20 })
    expect((sys as any).popSamples[0].tick).toBe(9999)
  })
  it('sample的populations字段正确存储', () => {
    sys.addPopulationSample(100, { orc: 77 })
    expect((sys as any).popSamples[0].populations.orc).toBe(77)
  })
  it('sample的entries字段存在且正确', () => {
    sys.addPopulationSample(100, { dwarf: 42 })
    const entries = (sys as any).popSamples[0].entries
    expect(entries).toBeDefined()
    expect(entries[0][0]).toBe('dwarf')
    expect(entries[0][1]).toBe(42)
  })
})

describe('WorldDashboardSystem - 环形缓冲区(MAX_POP_SAMPLES=60)', () => {
  let sys: WorldDashboardSystem
  beforeEach(() => { sys = makeSys() })

  it('60个sample后popCount=60', () => {
    for (let i = 0; i < 60; i++) sys.addPopulationSample(i * 100, { human: i })
    expect((sys as any).popCount).toBe(60)
  })
  it('65个sample后popCount仍为60（不超过MAX_POP_SAMPLES）', () => {
    for (let i = 0; i < 65; i++) sys.addPopulationSample(i * 100, { human: i * 10 })
    expect((sys as any).popCount).toBe(60)
  })
  it('60个sample后popWriteIndex为0（未触发环形写入）', () => {
    for (let i = 0; i < 60; i++) sys.addPopulationSample(i * 100, { human: i })
    // 刚好60个时popSamples.length=60，但未触发环形写入，popWriteIndex还是0
    expect((sys as any).popWriteIndex).toBe(0)
  })
  it('61个sample后popWriteIndex为1', () => {
    for (let i = 0; i < 61; i++) sys.addPopulationSample(i * 100, { human: i * 10 })
    expect((sys as any).popWriteIndex).toBe(1)
  })
  it('62个sample后popWriteIndex为2', () => {
    for (let i = 0; i < 62; i++) sys.addPopulationSample(i * 100, { human: i * 10 })
    expect((sys as any).popWriteIndex).toBe(2)
  })
  it('120个sample后popWriteIndex回绕为0（60%60=0）', () => {
    for (let i = 0; i < 120; i++) sys.addPopulationSample(i * 100, { human: i * 10 })
    expect((sys as any).popWriteIndex).toBe(0)
  })
  it('addPopulationSample后_orderedDirty=true', () => {
    ;(sys as any)._orderedDirty = false
    sys.addPopulationSample(100, { human: 10 })
    expect((sys as any)._orderedDirty).toBe(true)
  })
})

describe('WorldDashboardSystem - 扩展覆盖', () => {
  let sys: WorldDashboardSystem
  beforeEach(() => { sys = new WorldDashboardSystem() })
  afterEach(() => { vi.restoreAllMocks() })

  it('扩展-5次toggle后isVisible为true', () => {
    for (let i = 0; i < 5; i++) { sys.toggle() }
    expect(sys.isVisible()).toBe(true)
  })
  it('扩展-10次toggle后isVisible为false', () => {
    for (let i = 0; i < 10; i++) { sys.toggle() }
    expect(sys.isVisible()).toBe(false)
  })
  it('扩展-addPopulationSample增加popCount', () => {
    sys.addPopulationSample(1, { human: 10 })
    sys.addPopulationSample(2, { human: 20 })
    expect((sys as any).popCount).toBe(2)
  })
  it('扩展-addPopulationSample后popSamples正确', () => {
    sys.addPopulationSample(100, { elf: 5 })
    expect((sys as any).popSamples[0].populations.elf).toBe(5)
  })
  it('扩展-popSamples初始为空', () => {
    expect((sys as any).popSamples).toHaveLength(0)
  })
  it('扩展-popCount初始为0', () => {
    expect((sys as any).popCount).toBe(0)
  })
  it('扩展-60个sample后popCount=60', () => {
    for (let i = 0; i < 60; i++) { sys.addPopulationSample(i, { human: i }) }
    expect((sys as any).popCount).toBe(60)
  })
  it('扩展-70个sample后popCount仍为60', () => {
    for (let i = 0; i < 70; i++) { sys.addPopulationSample(i, { human: i }) }
    expect((sys as any).popCount).toBe(60)
  })
  it('扩展-addPopulationSample后_orderedDirty=true', () => {
    ;(sys as any)._orderedDirty = false
    sys.addPopulationSample(1, { human: 1 })
    expect((sys as any)._orderedDirty).toBe(true)
  })
  it('扩展-61个sample后popWriteIndex=1', () => {
    for (let i = 0; i < 61; i++) { sys.addPopulationSample(i, { human: i }) }
    expect((sys as any).popWriteIndex).toBe(1)
  })
  it('扩展-120个sample后popWriteIndex=0', () => {
    for (let i = 0; i < 120; i++) { sys.addPopulationSample(i, { human: i }) }
    expect((sys as any).popWriteIndex).toBe(0)
  })
  it('扩展-religionData初始为空Map', () => {
    expect((sys as any).religionData.size).toBe(0)
  })
  it('扩展-powerData初始为空数组', () => {
    expect((sys as any).powerData).toHaveLength(0)
  })
  it('扩展-activeTab初始为religion', () => {
    expect((sys as any).activeTab).toBe('religion')
  })
  it('扩展-sample的entries正确', () => {
    sys.addPopulationSample(1, { dwarf: 7 })
    const entry = (sys as any).popSamples[0].entries[0]
    expect(entry[0]).toBe('dwarf')
    expect(entry[1]).toBe(7)
  })
  it('扩展-popWriteIndex初始为0', () => {
    expect((sys as any).popWriteIndex).toBe(0)
  })
  it('扩展-sample的tick字段正确', () => {
    sys.addPopulationSample(9999, { orc: 3 })
    expect((sys as any).popSamples[0].tick).toBe(9999)
  })
  it('扩展-62个sample后popWriteIndex=2', () => {
    for (let i = 0; i < 62; i++) { sys.addPopulationSample(i, { human: i }) }
    expect((sys as any).popWriteIndex).toBe(2)
  })
  it('扩展-sample populations是独立副本', () => {
    const pops = { human: 5 }
    sys.addPopulationSample(1, pops)
    pops.human = 999
    expect((sys as any).popSamples[0].populations.human).toBe(5)
  })
  it('扩展-65个sample后popCount仍为60', () => {
    for (let i = 0; i < 65; i++) { sys.addPopulationSample(i * 100, { human: i * 10 }) }
    expect((sys as any).popCount).toBe(60)
  })
  it('扩展-60个sample后popWriteIndex为0', () => {
    for (let i = 0; i < 60; i++) { sys.addPopulationSample(i * 100, { human: i }) }
    expect((sys as any).popWriteIndex).toBe(0)
  })
  it('扩展-直接注入religionData后可读取', () => {
    ;(sys as any).religionData.set('sun', 10)
    expect((sys as any).religionData.get('sun')).toBe(10)
  })
  it('扩展-直接注入powerData后可读取', () => {
    ;(sys as any).powerData.push({ name: 'A', power: 100 })
    expect((sys as any).powerData).toHaveLength(1)
  })
  it('扩展-isVisible初始为false', () => {
    expect(sys.isVisible()).toBe(false)
  })
  it('扩展-addPopulationSample后sample的populations字段正确', () => {
    sys.addPopulationSample(100, { orc: 77 })
    expect((sys as any).popSamples[0].populations.orc).toBe(77)
  })
  it('扩展-toggle一次后visible=true', () => {
    sys.toggle()
    expect(sys.isVisible()).toBe(true)
  })
})
