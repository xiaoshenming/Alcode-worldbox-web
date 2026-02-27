import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureMasonrySystem } from '../systems/CreatureMasonrySystem'
import type { MasonryProject, StoneProject, ProjectPhase } from '../systems/CreatureMasonrySystem'

let nextId = 1
function makeSys(): CreatureMasonrySystem { return new CreatureMasonrySystem() }
function makeProject(masonId: number, type: StoneProject = 'wall', phase: ProjectPhase = 'building'): MasonryProject {
  return { id: nextId++, masonId, type, phase, x: 10, y: 10, quality: 70, progress: 50 }
}

describe('CreatureMasonrySystem.getProjects', () => {
  let sys: CreatureMasonrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无工程', () => { expect(sys.getProjects()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).projects.push(makeProject(1, 'tower'))
    expect(sys.getProjects()[0].type).toBe('tower')
  })
  it('返回内部引用', () => {
    ;(sys as any).projects.push(makeProject(1))
    expect(sys.getProjects()).toBe((sys as any).projects)
  })
  it('支持所有 5 种工程类型', () => {
    const types: StoneProject[] = ['wall', 'tower', 'monument', 'bridge', 'aqueduct']
    types.forEach((t, i) => { ;(sys as any).projects.push(makeProject(i + 1, t)) })
    const all = sys.getProjects()
    types.forEach((t, i) => { expect(all[i].type).toBe(t) })
  })
  it('支持所有 4 种阶段', () => {
    const phases: ProjectPhase[] = ['quarrying', 'shaping', 'building', 'complete']
    phases.forEach((p, i) => { ;(sys as any).projects.push(makeProject(i + 1, 'wall', p)) })
    const all = sys.getProjects()
    phases.forEach((p, i) => { expect(all[i].phase).toBe(p) })
  })
})
