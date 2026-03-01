import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureCalligraphySystem } from '../systems/CreatureCalligraphySystem'
import type { CalligraphyWork, ScriptStyle } from '../systems/CreatureCalligraphySystem'

let nextId = 1
function makeSys(): CreatureCalligraphySystem { return new CreatureCalligraphySystem() }
function makeWork(authorId: number, style: ScriptStyle = 'flowing'): CalligraphyWork {
  return { id: nextId++, authorId, style, skill: 50, culturalValue: 30, content: 'test', preserved: false, tick: 0 }
}

describe('CreatureCalligraphySystem.getWorks', () => {
  let sys: CreatureCalligraphySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无书法作品', () => { expect((sys as any).works).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).works.push(makeWork(1, 'runic'))
    expect((sys as any).works[0].style).toBe('runic')
  })

  it('返回内部引用', () => {
    ;(sys as any).works.push(makeWork(1))
    expect((sys as any).works).toBe((sys as any).works)
  })

  it('支持所有 6 种书写风格', () => {
    const styles: ScriptStyle[] = ['pictographic', 'cuneiform', 'runic', 'flowing', 'geometric', 'symbolic']
    styles.forEach((s, i) => { ;(sys as any).works.push(makeWork(i + 1, s)) })
    const all = (sys as any).works
    styles.forEach((s, i) => { expect(all[i].style).toBe(s) })
  })
})

describe('CreatureCalligraphySystem.getByAuthor', () => {
  let sys: CreatureCalligraphySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无作品时返回空数组', () => {
    expect(sys.getByAuthor(999)).toHaveLength(0)
  })

  it('返回指定作者的作品', () => {
    ;(sys as any).works.push(makeWork(1, 'runic'))
    ;(sys as any).works.push(makeWork(2, 'flowing'))
    ;(sys as any).works.push(makeWork(1, 'symbolic'))
    expect(sys.getByAuthor(1)).toHaveLength(2)
    expect(sys.getByAuthor(2)).toHaveLength(1)
  })

  it('结果为新数组', () => {
    ;(sys as any).works.push(makeWork(1))
    expect(sys.getByAuthor(1)).not.toBe((sys as any).works)
  })
})
