import { describe, it, expect } from 'vitest'
// WeatherSystem 需要 World/ParticleSystem/EntityManager 依赖，验证模块可导入
describe('WeatherSystem', () => {
  it('模块可以导入', async () => {
    const mod = await import('../systems/WeatherSystem')
    expect(mod.WeatherSystem).toBeDefined()
  })
})
