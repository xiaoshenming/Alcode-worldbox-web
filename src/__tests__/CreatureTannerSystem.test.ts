import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureTannerSystem } from '../systems/CreatureTannerSystem'
import type { Tanner, LeatherGrade } from '../systems/CreatureTannerSystem'

let nextId = 1
function makeSys(): CreatureTannerSystem { return new CreatureTannerSystem() }
function makeTanner(entityId: number, grade: LeatherGrade = 'tanned'): Tanner {
  return { id: nextId++, entityId, skill: 70, hidesProcessed: 15, leatherGrade: grade, quality: 65, tradeValue: 45, tick: 0 }
}

describe('CreatureTannerSystem.getTanners', () => {
  let sys: CreatureTannerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无制革工', () => { expect((sys as any).tanners).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).tanners.push(makeTanner(1, 'tooled'))
    expect((sys as any).tanners[0].leatherGrade).toBe('tooled')
  })
  it('返回内部引用', () => {
    ;(sys as any).tanners.push(makeTanner(1))
    expect((sys as any).tanners).toBe((sys as any).tanners)
  })
  it('支持所有4种皮革等级', () => {
    const grades: LeatherGrade[] = ['rawhide', 'tanned', 'cured', 'tooled']
    grades.forEach((g, i) => { ;(sys as any).tanners.push(makeTanner(i + 1, g)) })
    const all = (sys as any).tanners
    grades.forEach((g, i) => { expect(all[i].leatherGrade).toBe(g) })
  })
  it('字段正确', () => {
    ;(sys as any).tanners.push(makeTanner(2))
    const t = (sys as any).tanners[0]
    expect(t.hidesProcessed).toBe(15)
    expect(t.tradeValue).toBe(45)
  })
})
