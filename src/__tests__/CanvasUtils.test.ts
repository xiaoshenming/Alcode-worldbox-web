import { describe, it, expect } from 'vitest'

describe('CanvasUtils', () => {
  it('roundRect可以导入', async () => {
    const mod = await import('../utils/CanvasUtils')
    expect(typeof mod.roundRect).toBe('function')
  })

  it('roundRect接受正确的参数数量', async () => {
    const { roundRect } = await import('../utils/CanvasUtils')
    expect(roundRect.length).toBe(6)
  })
})
