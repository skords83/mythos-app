import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { NodeSelection, type EditorState } from '@tiptap/pm/state'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { findTopLevelBlockAt, moveTopLevelBlock } from '../blockDragHandleExtension'

// Pure-logic tests only. Hover positioning, rAF-coalesced mousemove handling, and
// native-dragstart suppression require real layout/coords and are not testable in
// jsdom — verify those manually in the browser instead.

function buildEditor(html: string): Editor {
  return new Editor({ extensions: [StarterKit, Image], content: html })
}

// Finds the start position of the first top-level child matching `predicate`.
// Avoids hand-computed position arithmetic in the tests below.
function findBlockPos(doc: ProseMirrorNode, predicate: (node: ProseMirrorNode) => boolean): number {
  let found = -1
  doc.forEach((node, pos) => {
    if (found === -1 && predicate(node)) found = pos
  })
  if (found === -1) throw new Error('No matching top-level block found')
  return found
}

function docTexts(doc: ProseMirrorNode): string[] {
  const texts: string[] = []
  doc.forEach(node => texts.push(node.textContent))
  return texts
}

describe('findTopLevelBlockAt', () => {
  it('resolves a position inside a nested list item to the top-level list', () => {
    const { state } = buildEditor('<p>Intro</p><ul><li>One</li><li>Two</li></ul><p>Outro</p>')
    const listPos = findBlockPos(state.doc, n => n.type.name === 'bulletList')

    const found = findTopLevelBlockAt(state.doc, listPos + 3)

    expect(found).not.toBeNull()
    expect(found!.node.type.name).toBe('bulletList')
    expect(found!.index).toBe(1)
  })

  it('resolves to the surrounding paragraph for an otherwise empty document', () => {
    const { state } = buildEditor('')
    const found = findTopLevelBlockAt(state.doc, 0)
    expect(found).not.toBeNull()
    expect(found!.node.type.name).toBe('paragraph')
  })
})

describe('moveTopLevelBlock', () => {
  function threeParagraphState(): EditorState {
    return buildEditor('<p>First</p><p>Second</p><p>Third</p>').state
  }

  it('moves a middle paragraph to the top without merging into a neighbor', () => {
    const state = threeParagraphState()
    const secondPos = findBlockPos(state.doc, n => n.textContent === 'Second')

    const tr = moveTopLevelBlock(state, secondPos, 0)

    expect(tr).not.toBeNull()
    expect(docTexts(tr!.doc)).toEqual(['Second', 'First', 'Third'])
  })

  it('moves the first block to the end of the document', () => {
    const state = threeParagraphState()

    const tr = moveTopLevelBlock(state, 0, state.doc.content.size)

    expect(tr).not.toBeNull()
    expect(docTexts(tr!.doc)).toEqual(['Second', 'Third', 'First'])
  })

  it('moves a whole bulletList as one unit, keeping all list items intact', () => {
    const { state } = buildEditor('<p>Intro</p><ul><li>One</li><li>Two</li></ul><p>Outro</p>')
    const listPos = findBlockPos(state.doc, n => n.type.name === 'bulletList')

    const tr = moveTopLevelBlock(state, listPos, 0)

    expect(tr).not.toBeNull()
    const movedList = tr!.doc.firstChild!
    expect(movedList.type.name).toBe('bulletList')
    expect(movedList.childCount).toBe(2)
    expect(movedList.child(0).textContent).toBe('One')
    expect(movedList.child(1).textContent).toBe('Two')
  })

  it('returns null when dropping a block onto/into itself', () => {
    const state = buildEditor('<p>First</p><p>Second</p>').state
    const firstPos = findBlockPos(state.doc, n => n.textContent === 'First')
    const firstEnd = firstPos + state.doc.child(0).nodeSize

    const tr = moveTopLevelBlock(state, firstPos, firstEnd - 1)

    expect(tr).toBeNull()
  })

  it('returns null for a net-zero move (dropped back at its own boundary)', () => {
    const state = buildEditor('<p>First</p><p>Second</p>').state
    const firstSize = state.doc.firstChild!.nodeSize

    const tr = moveTopLevelBlock(state, firstSize, firstSize)

    expect(tr).toBeNull()
  })

  it('sets a NodeSelection on the moved block after a successful move', () => {
    const state = threeParagraphState()
    const secondPos = findBlockPos(state.doc, n => n.textContent === 'Second')

    const tr = moveTopLevelBlock(state, secondPos, 0)

    expect(tr).not.toBeNull()
    expect(tr!.selection).toBeInstanceOf(NodeSelection)
    expect((tr!.selection as NodeSelection).node.textContent).toBe('Second')
  })

  it('moves an image node cleanly', () => {
    const { state } = buildEditor('<p>Before</p><img src="https://example.com/a.png" /><p>After</p>')
    const imgPos = findBlockPos(state.doc, n => n.type.name === 'image')

    const tr = moveTopLevelBlock(state, imgPos, 0)

    expect(tr).not.toBeNull()
    expect(tr!.doc.firstChild!.type.name).toBe('image')
  })
})
