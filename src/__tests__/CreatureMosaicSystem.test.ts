import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureMosaicSystem } from '../systems/CreatureMosaicSystem'
import type { Mosaic, MosaicStyle, MosaicMaterial } from '../systems/CreatureMosaicSystem'

let nextId = 1
function makeSys(): CreatureMosaicSystem { return new CreatureMosaicSystem() }
function makeMosaic(artistId: number, style: MosaicStyle = 'geometric', material: MosaicMaterial = 'stone'): Mosaic {
  return { id: nextId++, artistId, style, material, beauty: 70, size: 10, completeness: 100, tick: 0 }
}

describe('CreatureMosaicSystem.getMosaics', () => {
  let sys: CreatureMosaicSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无马赛克', () => { expect(sys.getMosaics()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).mosaics.push(makeMosaic(1, 'figurative', 'glass'))
    expect(sys.getMosaics()[0].style).toBe('figurative')
    expect(sys.getMosaics()[0].material).toBe('glass')
  })
  it('返回内部引用', () => {
    ;(sys as any).mosaics.push(makeMosaic(1))
    expect(sys.getMosaics()).toBe((sys as any).mosaics)
  })
  it('支持所有 4 种风格', () => {
    const styles: MosaicStyle[] = ['geometric', 'figurative', 'abstract', 'narrative']
    styles.forEach((s, i) => { ;(sys as any).mosaics.push(makeMosaic(i + 1, s)) })
    const all = sys.getMosaics()
    styles.forEach((s, i) => { expect(all[i].style).toBe(s) })
  })
})
