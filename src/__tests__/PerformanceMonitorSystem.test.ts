import { describe, it, expect } from 'vitest'
// PerformanceMonitorSystem 在构造函数中调用 window.addEventListener，需要 DOM 环境
describe('PerformanceMonitorSystem', () => {
  it('模块可以导入', async () => {
    const mod = await import('../systems/PerformanceMonitorSystem')
    expect(mod.PerformanceMonitorSystem).toBeDefined()
  })
})
