import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureScribeSystem } from '../systems/CreatureScribeSystem'
import type { HistoricalRecord, RecordType } from '../systems/CreatureScribeSystem'

let nextId = 1
function makeSys(): CreatureScribeSystem { return new CreatureScribeSystem() }
function makeRecord(scribeId: number, type: RecordType = 'battle'): HistoricalRecord {
  return { id: nextId++, scribeId, type, importance: 70, accuracy: 80, civId: 1, tick: 0 }
}

describe('CreatureScribeSystem.getRecords', () => {
  let sys: CreatureScribeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无历史记录', () => { expect(sys.getRecords()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).records.push(makeRecord(1, 'discovery'))
    expect(sys.getRecords()[0].type).toBe('discovery')
  })
  it('返回内部引用', () => {
    ;(sys as any).records.push(makeRecord(1))
    expect(sys.getRecords()).toBe((sys as any).records)
  })
  it('支持所有5种记录类型', () => {
    const types: RecordType[] = ['battle', 'discovery', 'founding', 'disaster', 'treaty']
    types.forEach((t, i) => { ;(sys as any).records.push(makeRecord(i + 1, t)) })
    expect(sys.getRecords()).toHaveLength(5)
  })
  it('多个全部返回', () => {
    ;(sys as any).records.push(makeRecord(1))
    ;(sys as any).records.push(makeRecord(2))
    expect(sys.getRecords()).toHaveLength(2)
  })
})
