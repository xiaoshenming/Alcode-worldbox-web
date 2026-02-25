/** HelpOverlaySystem - toggleable keyboard shortcut overlay (F1 / H) */
export class HelpOverlaySystem {
  private visible = false
  private el: HTMLDivElement | null = null

  private readonly shortcuts: Array<{ key: string; desc: string }> = [
    { key: '1 / 2 / 3 / 4', desc: 'Speed: 1x / 2x / 5x / Pause' },
    { key: 'Space', desc: 'Toggle pause' },
    { key: 'Q / W / E / D', desc: 'Tool category: Terrain / Creature / Nature / Disaster' },
    { key: '[ / ]', desc: 'Decrease / Increase brush size' },
    { key: 'R', desc: 'Reset world' },
    { key: 'T', desc: 'Toggle territory overlay' },
    { key: 'M', desc: 'Toggle mute' },
    { key: 'Ctrl+S', desc: 'Save game' },
    { key: 'Ctrl+L', desc: 'Load game' },
    { key: 'Escape', desc: 'Close panel / Deselect tool' },
    { key: 'F1 / H', desc: 'Toggle this help overlay' },
  ]

  toggle(): void {
    this.visible = !this.visible
    if (this.visible) this.show()
    else this.hide()
  }

  isVisible(): boolean {
    return this.visible
  }

  private show(): void {
    if (this.el) { this.el.style.display = 'flex'; return }

    this.el = document.createElement('div')
    this.el.id = 'helpOverlay'
    Object.assign(this.el.style, {
      position: 'fixed', inset: '0', zIndex: '500',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', color: '#eee',
      fontFamily: 'monospace', fontSize: '13px',
    })

    const box = document.createElement('div')
    Object.assign(box.style, {
      background: '#1a1a2e', border: '1px solid #444',
      borderRadius: '10px', padding: '20px 28px',
      maxWidth: '420px', width: '100%',
    })

    const title = document.createElement('div')
    title.textContent = '⌨ Keyboard Shortcuts'
    Object.assign(title.style, {
      fontSize: '16px', fontWeight: 'bold', marginBottom: '14px',
      textAlign: 'center', color: '#7ec8e3',
    })
    box.appendChild(title)

    for (const s of this.shortcuts) {
      const row = document.createElement('div')
      Object.assign(row.style, {
        display: 'flex', justifyContent: 'space-between',
        padding: '4px 0', borderBottom: '1px solid #333',
      })
      const keyEl = document.createElement('span')
      keyEl.textContent = s.key
      keyEl.style.color = '#ffd700'
      const descEl = document.createElement('span')
      descEl.textContent = s.desc
      descEl.style.color = '#ccc'
      row.appendChild(keyEl)
      row.appendChild(descEl)
      box.appendChild(row)
    }

    const hint = document.createElement('div')
    hint.textContent = 'Press F1 or H to close'
    Object.assign(hint.style, {
      marginTop: '12px', textAlign: 'center',
      fontSize: '11px', color: '#888',
    })
    box.appendChild(hint)

    this.el.appendChild(box)
    this.el.addEventListener('click', () => this.toggle())
    document.body.appendChild(this.el)
  }

  private hide(): void {
    if (this.el) this.el.style.display = 'none'
    this.visible = false
  }
}
