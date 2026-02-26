import { SaveSystem } from './SaveSystem'
import { World } from './World'
import { EntityManager } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'
import { ResourceSystem } from '../systems/ResourceSystem'

export interface SaveLoadDeps {
  world: World
  em: EntityManager
  civManager: CivManager
  resources: ResourceSystem
}

export function showSaveLoadPanel(mode: 'save' | 'load', deps: SaveLoadDeps): void {
  let panel = document.getElementById('saveLoadPanel')
  if (panel) { panel.remove(); return }

  panel = document.createElement('div')
  panel.id = 'saveLoadPanel'
  panel.className = 'panel'
  Object.assign(panel.style, {
    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
    width: '320px', zIndex: '350', fontSize: '12px', lineHeight: '1.8', padding: '12px'
  })

  const titleEl = document.createElement('div')
  titleEl.style.cssText = 'font-weight:bold;font-size:14px;margin-bottom:8px;text-align:center'
  titleEl.textContent = mode === 'save' ? 'Save Game' : 'Load Game'
  panel.appendChild(titleEl)

  const metas = SaveSystem.getAllSlotMeta()
  const slots: Array<number | 'auto'> = ['auto', 1, 2, 3]

  for (const slot of slots) {
    const meta = metas.find(m => m.slot === slot)
    const label = slot === 'auto' ? 'Autosave' : `Slot ${slot}`
    const hasSave = SaveSystem.hasSave(slot)
    const info = meta
      ? `${new Date(meta.timestamp).toLocaleString()} | Pop: ${meta.population} | Civs: ${meta.civCount}`
      : (hasSave ? 'Save data found' : 'Empty')

    const row = document.createElement('div')
    row.style.cssText = 'display:flex;align-items:center;gap:6px;margin:4px 0;padding:4px;background:rgba(255,255,255,0.05);border-radius:4px'

    const infoDiv = document.createElement('div')
    infoDiv.style.flex = '1'
    const labelEl2 = document.createElement('div')
    labelEl2.style.fontWeight = 'bold'
    labelEl2.textContent = label
    const detailEl = document.createElement('div')
    detailEl.style.cssText = 'opacity:0.6;font-size:10px'
    detailEl.textContent = info
    infoDiv.appendChild(labelEl2)
    infoDiv.appendChild(detailEl)
    row.appendChild(infoDiv)

    if (mode === 'save' && slot !== 'auto') {
      const btn = document.createElement('button')
      btn.textContent = 'Save'
      btn.style.cssText = 'padding:2px 8px;cursor:pointer'
      btn.addEventListener('click', () => {
        const ok = SaveSystem.save(deps.world, deps.em, deps.civManager, deps.resources, slot)
        btn.textContent = ok ? 'Saved!' : 'Failed'
        setTimeout(() => { if (panel!.parentNode) panel!.remove() }, 800)
      })
      row.appendChild(btn)
    } else if (mode === 'load' && hasSave) {
      const loadBtn = document.createElement('button')
      loadBtn.textContent = 'Load'
      loadBtn.style.cssText = 'padding:2px 8px;cursor:pointer'
      loadBtn.addEventListener('click', () => {
        const ok = SaveSystem.load(deps.world, deps.em, deps.civManager, deps.resources, slot)
        if (ok) deps.world.markFullDirty()
        loadBtn.textContent = ok ? 'Loaded!' : 'Failed'
        setTimeout(() => { if (panel!.parentNode) panel!.remove() }, 800)
      })
      row.appendChild(loadBtn)
      if (slot !== 'auto') {
        const delBtn = document.createElement('button')
        delBtn.textContent = 'Del'
        delBtn.style.cssText = 'padding:2px 8px;cursor:pointer;color:#f66'
        delBtn.addEventListener('click', () => {
          SaveSystem.deleteSave(slot)
          if (panel!.parentNode) panel!.remove()
          showSaveLoadPanel(mode, deps)
        })
        row.appendChild(delBtn)
      }
    }
    panel.appendChild(row)
  }

  const closeRow = document.createElement('div')
  closeRow.style.cssText = 'text-align:center;margin-top:8px'
  const closeBtn = document.createElement('button')
  closeBtn.textContent = 'Close'
  closeBtn.style.cssText = 'padding:2px 16px;cursor:pointer'
  closeBtn.addEventListener('click', () => { if (panel!.parentNode) panel!.remove() })
  closeRow.appendChild(closeBtn)
  panel.appendChild(closeRow)

  document.body.appendChild(panel)
}
