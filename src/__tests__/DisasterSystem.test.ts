import { describe, it, expect } from 'vitest'
// DisasterSystem 需要 World/ParticleSystem/EntityManager 依赖，验证模块可导入
describe('DisasterSystem', () => {
  it('模块可以导入', async () => {
    const mod = await import('../systems/DisasterSystem')
    expect(mod.DisasterSystem).toBeDefined()
  })
})
