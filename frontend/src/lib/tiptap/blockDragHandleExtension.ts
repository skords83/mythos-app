import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, NodeSelection, type EditorState, type Transaction, type PluginView } from '@tiptap/pm/state'
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { DIVIDER } from '@/lib/theme'

const pluginKey = new PluginKey<DragState>('blockDragHandle')
const GUTTER_WIDTH = 28

interface DragState {
  dragging: boolean
  sourcePos: number | null
  dropIndicatorPos: number | null
}

const idleState: DragState = { dragging: false, sourcePos: null, dropIndicatorPos: null }

export function findTopLevelBlockAt(doc: ProseMirrorNode, pos: number): { node: ProseMirrorNode; pos: number; index: number } | null {
  if (doc.childCount === 0) return null
  const clamped = Math.max(0, Math.min(pos, doc.content.size))

  let offset = 0
  for (let i = 0; i < doc.childCount; i++) {
    const child = doc.child(i)
    const end = offset + child.nodeSize
    if (clamped < end || i === doc.childCount - 1) {
      return { node: child, pos: offset, index: i }
    }
    offset = end
  }
  return null
}

export function moveTopLevelBlock(state: EditorState, blockPos: number, targetPos: number): Transaction | null {
  const node = state.doc.nodeAt(blockPos)
  if (!node) return null

  const from = blockPos
  const to = blockPos + node.nodeSize

  // Dragging a block onto/into itself is a no-op.
  if (targetPos >= from && targetPos <= to) return null

  const tr = state.tr.delete(from, to)
  const mappedTarget = tr.mapping.map(targetPos)

  // Net-zero move (e.g. dropped immediately adjacent to its own original slot).
  if (mappedTarget === from) return null

  tr.insert(mappedTarget, node)

  try {
    // `mappedTarget` is already the position the node was inserted at within
    // `tr`'s current doc — do not map it again through `tr.mapping`, which
    // accumulates the delete step too and would double-shift the position.
    tr.setSelection(NodeSelection.create(tr.doc, mappedTarget))
  } catch {
    // Fall back to whatever selection ProseMirror mapped by default.
  }

  return tr
}

// Resolves where a drop should land: before or after the top-level block currently
// under the cursor, decided by whether clientY is above or below that block's vertical midpoint.
function resolveDropBoundary(view: EditorView, clientY: number): number {
  const doc = view.state.doc
  const coordsPos = view.posAtCoords({ left: view.dom.getBoundingClientRect().left + GUTTER_WIDTH + 4, top: clientY })
  if (!coordsPos) return doc.content.size

  const found = findTopLevelBlockAt(doc, coordsPos.pos)
  if (!found) return doc.content.size

  const blockDom = view.nodeDOM(found.pos)
  if (blockDom instanceof HTMLElement) {
    const rect = blockDom.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    return clientY < midY ? found.pos : found.pos + found.node.nodeSize
  }

  return found.pos
}

class BlockDragHandleView implements PluginView {
  private handle: HTMLButtonElement
  private view: EditorView
  private rafId: number | null = null
  private pendingClientY: number | null = null
  private hoveredBlockPos: number | null = null

  constructor(view: EditorView) {
    this.view = view
    this.handle = document.createElement('button')
    this.handle.type = 'button'
    this.handle.setAttribute('aria-hidden', 'true')
    this.handle.tabIndex = -1
    this.handle.className =
      'absolute w-5 h-5 flex items-center justify-center border border-zinc-300 dark:border-zinc-700 rounded-none bg-stone-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-grab text-zinc-400 dark:text-zinc-500 select-none'
    this.handle.style.display = 'none'
    this.handle.style.zIndex = '10'
    this.handle.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>'

    const parent = view.dom.parentElement
    if (parent) {
      parent.appendChild(this.handle)
    }

    this.handle.addEventListener('mousedown', this.onHandleMouseDown)
  }

  private onHandleMouseDown = (event: MouseEvent) => {
    event.preventDefault()
    if (this.hoveredBlockPos === null) return
    this.handle.classList.add('cursor-grabbing')
    const tr = this.view.state.tr.setMeta(pluginKey, {
      dragging: true,
      sourcePos: this.hoveredBlockPos,
      dropIndicatorPos: this.hoveredBlockPos,
    } as DragState)
    tr.setMeta('addToHistory', false)
    this.view.dispatch(tr)

    const onMouseMove = (moveEvent: MouseEvent) => this.onDragMouseMove(moveEvent)
    const onMouseUp = (upEvent: MouseEvent) => {
      this.onDragMouseUp(upEvent)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  private onDragMouseMove(event: MouseEvent) {
    const target = resolveDropBoundary(this.view, event.clientY)
    const tr = this.view.state.tr.setMeta(pluginKey, {
      ...pluginKey.getState(this.view.state),
      dropIndicatorPos: target,
    } as DragState)
    tr.setMeta('addToHistory', false)
    this.view.dispatch(tr)
  }

  private onDragMouseUp(_event: MouseEvent) {
    const dragState = pluginKey.getState(this.view.state)
    this.handle.classList.remove('cursor-grabbing')

    if (dragState?.dragging && dragState.sourcePos !== null && dragState.dropIndicatorPos !== null) {
      const moveTr = moveTopLevelBlock(this.view.state, dragState.sourcePos, dragState.dropIndicatorPos)
      if (moveTr) {
        this.view.dispatch(moveTr)
      }
    }

    const resetTr = this.view.state.tr.setMeta(pluginKey, idleState)
    resetTr.setMeta('addToHistory', false)
    this.view.dispatch(resetTr)
  }

  handleMouseMove(event: MouseEvent) {
    if (pluginKey.getState(this.view.state)?.dragging) return
    this.pendingClientY = event.clientY
    if (this.rafId !== null) return
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null
      if (this.pendingClientY === null) return
      this.positionHandle(this.pendingClientY)
    })
  }

  handleMouseLeave() {
    this.hoveredBlockPos = null
    this.handle.style.display = 'none'
  }

  handleDragStart(event: DragEvent) {
    // All reordering goes through this handle's custom mouse-driven flow.
    // Suppress native HTML5 drag (e.g. Image nodes ship `draggable: true`).
    if (!pluginKey.getState(this.view.state)?.dragging) {
      event.preventDefault()
    }
  }

  private positionHandle(clientY: number) {
    const coordsPos = this.view.posAtCoords({ left: this.view.dom.getBoundingClientRect().left + GUTTER_WIDTH + 4, top: clientY })
    if (!coordsPos) {
      this.handle.style.display = 'none'
      this.hoveredBlockPos = null
      return
    }

    const found = findTopLevelBlockAt(this.view.state.doc, coordsPos.pos)
    if (!found) {
      this.handle.style.display = 'none'
      this.hoveredBlockPos = null
      return
    }

    const blockDom = this.view.nodeDOM(found.pos)
    if (!(blockDom instanceof HTMLElement)) {
      this.handle.style.display = 'none'
      this.hoveredBlockPos = null
      return
    }

    const parent = this.view.dom.parentElement
    if (!parent) return

    const parentRect = parent.getBoundingClientRect()
    const blockRect = blockDom.getBoundingClientRect()

    this.hoveredBlockPos = found.pos
    this.handle.style.display = 'flex'
    // Fixed offset within the editor's left gutter (see RichTextEditor.tsx's `pl-9`
    // content padding) — deliberately not derived from blockRect.left, which points
    // at the block's text start, not the gutter.
    this.handle.style.left = '6px'
    this.handle.style.top = `${blockRect.top - parentRect.top + (blockRect.height - 20) / 2}px`
  }

  destroy() {
    this.handle.removeEventListener('mousedown', this.onHandleMouseDown)
    this.handle.remove()
    if (this.rafId !== null) cancelAnimationFrame(this.rafId)
  }
}

export const BlockDragHandle = Extension.create({
  name: 'blockDragHandle',

  addProseMirrorPlugins() {
    let pluginView: BlockDragHandleView | null = null

    return [
      new Plugin<DragState>({
        key: pluginKey,

        state: {
          init: () => idleState,
          apply(tr, value) {
            const meta = tr.getMeta(pluginKey) as DragState | undefined
            if (meta) return meta
            if (tr.docChanged && value.dragging && value.sourcePos !== null && value.dropIndicatorPos !== null) {
              return {
                dragging: value.dragging,
                sourcePos: tr.mapping.map(value.sourcePos),
                dropIndicatorPos: tr.mapping.map(value.dropIndicatorPos),
              }
            }
            return value
          },
        },

        props: {
          decorations(state) {
            const dragState = pluginKey.getState(state)
            if (!dragState?.dragging || dragState.dropIndicatorPos === null) return DecorationSet.empty
            const indicator = document.createElement('div')
            indicator.className = `h-[3px] w-full ${DIVIDER} pointer-events-none`
            return DecorationSet.create(state.doc, [Decoration.widget(dragState.dropIndicatorPos, indicator, { side: -1 })])
          },

          handleDOMEvents: {
            mousemove(_view, event) {
              pluginView?.handleMouseMove(event as MouseEvent)
              return false
            },
            mouseleave() {
              pluginView?.handleMouseLeave()
              return false
            },
            dragstart(_view, event) {
              pluginView?.handleDragStart(event as DragEvent)
              return false
            },
          },
        },

        view(editorView) {
          pluginView = new BlockDragHandleView(editorView)
          return pluginView
        },
      }),
    ]
  },
})
