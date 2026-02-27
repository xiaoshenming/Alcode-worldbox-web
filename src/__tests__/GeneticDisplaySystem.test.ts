import { describe, it, expect, beforeEach } from 'vitest'
import { GeneticDisplaySystem } from '../systems/GeneticDisplaySystem'
import { EntityManager } from '../ecs/Entity'
function makeSys() { return new GeneticDisplaySystem() }
describe('GeneticDisplaySystem', () => {
  let sys: GeneticDisplaySystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = new EntityManager() })
  it('可以实例化', () => { expect(sys).toBeDefined() })
  it('getTraits 未知实体返回空数组', () => {
    expect(sys.getTraits(999, em)).toHaveLength(0)
  })
  it('getFamilyTree 未知实体返回null', () => {
    expect(sys.getFamilyTree(999, em)).toBeNull()
  })
})
