import { describe, it, expect, beforeEach } from 'vitest'
import { WorldMigrationRouteSystem } from '../systems/WorldMigrationRouteSystem'
import type { MigrationRoute } from '../systems/WorldMigrationRouteSystem'

function makeSys(): WorldMigrationRouteSystem { return new WorldMigrationRouteSystem() }
let nextId = 1
function makeRoute(): MigrationRoute {
  return { id: nextId++, waypoints: [{x:10,y:20},{x:30,y:40}], type: 'animal', species: 'deer', active: true, season: 'spring', travelerCount: 5 }
}

describe('WorldMigrationRouteSystem.getRoutes', () => {
  let sys: WorldMigrationRouteSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无迁徙路线', () => { expect(sys.getRoutes()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).routes.push(makeRoute())
    expect(sys.getRoutes()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getRoutes()).toBe((sys as any).routes)
  })
  it('路线字段正确', () => {
    ;(sys as any).routes.push(makeRoute())
    const r = sys.getRoutes()[0]
    expect(r.type).toBe('animal')
    expect(r.species).toBe('deer')
    expect(r.season).toBe('spring')
  })
  it('getActiveRoutes只返回active路线', () => {
    const r1 = makeRoute()
    const r2 = { ...makeRoute(), active: false }
    ;(sys as any).routes.push(r1, r2)
    expect(sys.getActiveRoutes()).toHaveLength(1)
    expect(sys.getActiveRoutes()[0].active).toBe(true)
  })
  it('getRouteCount返回总数', () => {
    ;(sys as any).routes.push(makeRoute(), makeRoute())
    expect(sys.getRouteCount()).toBe(2)
  })
})
