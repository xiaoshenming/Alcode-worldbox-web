/** KeybindSystem - customizable keyboard shortcut system with localStorage persistence */

const STORAGE_KEY = 'worldbox_keybinds';

interface Binding {
  action: string;
  defaultKey: string;
  key: string;
  description: string;
}

export class KeybindSystem {
  private bindings: Map<string, Binding> = new Map();
  private panelOpen = false;
  private waitingForKey: string | null = null;
  private scrollOffset = 0;

  constructor() {
    this.registerDefaults();
    this.loadFromStorage();
  }

  private registerDefaults(): void {
    this.register('pause', 'Space', 'Toggle pause');
    this.register('speed1', '1', 'Speed 1x');
    this.register('speed2', '2', 'Speed 2x');
    this.register('speed5', '3', 'Speed 5x');
    this.register('save', 'Ctrl+S', 'Save game');
    this.register('load', 'Ctrl+L', 'Load game');
    this.register('undo', 'Ctrl+Z', 'Undo');
    this.register('toggleGrid', 'G', 'Toggle grid');
    this.register('toggleFog', 'F', 'Toggle fog of war');
    this.register('togglePerf', 'F3', 'Toggle perf stats');
    this.register('help', 'F1', 'Help overlay');
    this.register('screenshot', 'F12', 'Screenshot');
  }

  /** Register a keybinding. Does not overwrite user-customized keys on load. */
  register(action: string, defaultKey: string, description: string): void {
    if (this.bindings.has(action)) return;
    this.bindings.set(action, { action, defaultKey, key: defaultKey, description });
  }

  /** Rebind an action to a new key combo. Returns false if the key conflicts with another action. */
  rebind(action: string, newKey: string): boolean {
    const normalized = this.normalizeKey(newKey);
    const conflict = this.getAction(normalized);
    if (conflict && conflict !== action) return false;
    const binding = this.bindings.get(action);
    if (!binding) return false;
    binding.key = normalized;
    this.saveToStorage();
    return true;
  }

  /** Get the current key combo for an action. */
  getKey(action: string): string {
    return this.bindings.get(action)?.key ?? '';
  }

  /** Find which action is bound to a key combo, or null. */
  getAction(key: string): string | null {
    const normalized = this.normalizeKey(key);
    for (const b of this.bindings.values()) {
      if (b.key === normalized) return b.action;
    }
    return null;
  }

  /** Check if a KeyboardEvent matches the binding for a given action. */
  isPressed(e: KeyboardEvent, action: string): boolean {
    const binding = this.bindings.get(action);
    if (!binding) return false;
    return this.eventToCombo(e) === binding.key;
  }

  /** Reset all bindings to their defaults and clear storage. */
  resetToDefaults(): void {
    for (const b of this.bindings.values()) {
      b.key = b.defaultKey;
    }
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
  }

  /** Return all bindings as a flat array. */
  getAllBindings(): Array<{ action: string; key: string; description: string }> {
    const result: Array<{ action: string; key: string; description: string }> = [];
    for (const b of this.bindings.values()) {
      result.push({ action: b.action, key: b.key, description: b.description });
    }
    return result;
  }

  togglePanel(): void { this.panelOpen = !this.panelOpen; this.waitingForKey = null; this.scrollOffset = 0; }
  isPanelOpen(): boolean { return this.panelOpen; }

  /** Handle keyboard input for the rebind panel. Returns true if the event was consumed. */
  handlePanelInput(e: KeyboardEvent): boolean {
    if (!this.panelOpen) return false;
    if (e.key === 'Escape') {
      if (this.waitingForKey) { this.waitingForKey = null; return true; }
      this.panelOpen = false;
      return true;
    }
    if (this.waitingForKey) {
      const combo = this.eventToCombo(e);
      if (combo === 'Escape') { this.waitingForKey = null; return true; }
      this.rebind(this.waitingForKey, combo);
      this.waitingForKey = null;
      return true;
    }
    return false;
  }

  /** Handle mouse click on the rebind panel. Call with canvas-relative coords. */
  handlePanelClick(x: number, y: number, screenW: number, screenH: number): boolean {
    if (!this.panelOpen) return false;
    const pw = Math.min(500, screenW - 40);
    const ph = Math.min(400, screenH - 40);
    const px = (screenW - pw) / 2;
    const py = (screenH - ph) / 2;
    if (x < px || x > px + pw || y < py || y > py + ph) { this.panelOpen = false; return true; }

    const entries = this.getAllBindings();
    const rowH = 28;
    const headerH = 50;
    const footerH = 36;
    // Reset button
    const resetY = py + ph - footerH + 6;
    if (y >= resetY && y <= resetY + 24 && x >= px + pw / 2 - 60 && x <= px + pw / 2 + 60) {
      this.resetToDefaults();
      return true;
    }
    // Row clicks
    const ry = y - py - headerH + this.scrollOffset;
    const idx = Math.floor(ry / rowH);
    if (idx >= 0 && idx < entries.length) {
      this.waitingForKey = entries[idx].action;
    }
    return true;
  }

  /** Handle scroll on the panel. */
  handlePanelScroll(deltaY: number): boolean {
    if (!this.panelOpen) return false;
    this.scrollOffset = Math.max(0, this.scrollOffset + deltaY * 0.5);
    return true;
  }

  /** Render the keybind configuration panel overlay. */
  render(ctx: CanvasRenderingContext2D, screenW: number, screenH: number): void {
    if (!this.panelOpen) return;
    // Backdrop
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, screenW, screenH);

    const pw = Math.min(500, screenW - 40);
    const ph = Math.min(400, screenH - 40);
    const px = (screenW - pw) / 2;
    const py = (screenH - ph) / 2;

    // Panel bg
    ctx.fillStyle = '#1a1a2e';
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 8);
    ctx.fill();
    ctx.stroke();

    // Title
    ctx.fillStyle = '#7ec8e3';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Keybind Settings', px + pw / 2, py + 28);

    // Column headers
    const headerY = py + 46;
    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Action', px + 12, headerY);
    ctx.fillText('Key', px + pw * 0.55, headerY);
    ctx.fillText('(click row to rebind)', px + pw * 0.75, headerY);

    // Clip rows
    const rowH = 28;
    const headerH = 50;
    const footerH = 36;
    const bodyH = ph - headerH - footerH;
    ctx.save();
    ctx.beginPath();
    ctx.rect(px, py + headerH, pw, bodyH);
    ctx.clip();

    const entries = this.getAllBindings();
    for (let i = 0; i < entries.length; i++) {
      const ry = py + headerH + i * rowH - this.scrollOffset;
      if (ry + rowH < py + headerH || ry > py + headerH + bodyH) continue;

      // Zebra stripe
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(px + 4, ry, pw - 8, rowH);
      }
      // Highlight waiting row
      const isWaiting = this.waitingForKey === entries[i].action;
      ctx.fillStyle = isWaiting ? '#ffd700' : '#ccc';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(entries[i].description, px + 12, ry + 18);

      ctx.fillStyle = isWaiting ? '#ff6b6b' : '#ffd700';
      ctx.fillText(isWaiting ? '[ press a key... ]' : entries[i].key, px + pw * 0.55, ry + 18);
    }
    ctx.restore();

    // Footer: reset button
    const btnX = px + pw / 2 - 60;
    const btnY = py + ph - footerH + 6;
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, 120, 24, 4);
    ctx.fill();
    ctx.fillStyle = '#ef5350';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Reset Defaults', px + pw / 2, btnY + 16);

    // Hint
    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    ctx.fillText('ESC to close | Click outside to dismiss', px + pw / 2, py + ph - 4);
  }

  // --- Private helpers ---

  private normalizeKey(key: string): string {
    return key.split('+').map(p => p.trim()).filter(Boolean)
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join('+');
  }

  private eventToCombo(e: KeyboardEvent): string {
    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    let k = e.key;
    if (k === ' ') k = 'Space';
    if (k.length === 1) k = k.toUpperCase();
    if (!['Control', 'Shift', 'Alt', 'Meta'].includes(k)) parts.push(k);
    return parts.join('+');
  }

  private saveToStorage(): void {
    const data: Record<string, string> = {};
    for (const b of this.bindings.values()) {
      if (b.key !== b.defaultKey) data[b.action] = b.key;
    }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* noop */ }
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data: Record<string, string> = JSON.parse(raw);
      for (const [action, key] of Object.entries(data)) {
        const binding = this.bindings.get(action);
        if (binding) binding.key = this.normalizeKey(key);
      }
    } catch { /* corrupted data, ignore */ }
  }
}
