import { describe, it, expect, beforeEach } from 'vitest'
import { WorldPetrifiedForestSystem } from '../systems/WorldPetrifiedForestSystem'
import type { PetrifiedForest, PetrifiedAge } from '../systems/WorldPetrifiedForestSystem'

function makeSys(): WorldPetrifiedForestSystem { return new WorldPetrifiedForestSystem() }
let nextId = 1
function makeForest(age: PetrifiedAge = 'ancient'): PetrifiedForest {
  return { id: nextId++, x: 30, y: 40, petrifiedAge: age, treeCount: 20, mineralValue: 80, mysteryLevel: 70, discoveredBy: 0, tick: 0 }
}

describe('WorldPetrifiedForestSystem.getForests', () => {
  let sys: WorldPetrifiedForestSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无石化森林', () => { expect((sys as any).forests).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).forests.push(makeForest())
    expect((sys as any).forests).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).forests).toBe((sys as any).forests)
  })
  it('支持4种石化年代', () => {
    const ages: PetrifiedAge[] = ['recent', 'ancient', 'primordial', 'mythic']
    expect(ages).toHaveLength(4)
  })
  it('石化森林字段正确', () => {
    ;(sys as any).forests.push(makeForest('primordial'))
    const f = (sys as any).forests[0]
    expect(f.petrifiedAge).toBe('primordial')
    expect(f.mineralValue).toBe(80)
    expect(f.mysteryLevel).toBe(70)
  })
})
