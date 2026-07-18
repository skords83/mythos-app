'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { Bold, Italic, List, Quote, Heading1, Heading2, Undo, Redo, Image as ImageIcon, ArrowUp, ArrowDown, SeparatorHorizontal, Columns2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { SURFACE, SURFACE_ALT, RADIUS, BORDER, ACCENT_TEXT, HOVER_SURFACE, ACTIVE_SURFACE, DIVIDER } from '@/lib/theme'
import { CharacterMention } from '@/lib/tiptap/characterMentionExtension'
import { EntityMention } from '@/lib/tiptap/entityMentionExtension'
import { createMentionSuggestion, MentionableData } from '@/lib/tiptap/mentionSuggestion'
import { resolveMentionClick, MentionClickResult } from '@/lib/tiptap/mentionClick'
import { BlockDragHandle, findTopLevelBlockAt, moveTopLevelBlock } from '@/lib/tiptap/blockDragHandleExtension'
import type { Character, Item, Place } from './types'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  onEditorReady?: (setter: (content: string) => void) => void
  characters: Character[]
  places: Place[]
  items: Item[]
  onMentionClick: (result: MentionClickResult) => void
  splitScreenActive: boolean
  onToggleSplitScreen: () => void
  typewriterMode?: boolean
}

export function RichTextEditor({ content, onChange, placeholder = 'Beginne zu schreiben...', onEditorReady, characters, places, items, onMentionClick, splitScreenActive, onToggleSplitScreen, typewriterMode = false }: RichTextEditorProps) {
  // useEditor has no deps array below (editor is created once) — mirror useChapters.ts's
  // stale-closure fix so suggestion filtering and click handling always see current data.
  const mentionDataRef = useRef<MentionableData>({ characters, places, items })
  useEffect(() => { mentionDataRef.current = { characters, places, items } }, [characters, places, items])

  const onMentionClickRef = useRef(onMentionClick)
  useEffect(() => { onMentionClickRef.current = onMentionClick }, [onMentionClick])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Image,
      CharacterMention.configure({
        suggestion: createMentionSuggestion(mentionDataRef),
      }),
      EntityMention,
      BlockDragHandle,
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[400px] pt-4 pr-4 pb-4 pl-9',
      },
      handleClickOn: (_view, _pos, node, _nodePos, event) => {
        const result = resolveMentionClick(node, event)
        if (!result) return false
        onMentionClickRef.current(result)
        return true
      },
    },
  })

  // Setter bei jedem Editor-Mount registrieren
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady((newContent: string) => {
        editor.commands.setContent(newContent || '')
      })
    }
  }, [editor])

  // Schreibmaschinen-Effekt: hält die aktuelle Zeile beim Schreiben vertikal zentriert
  useEffect(() => {
    if (!editor || !typewriterMode) return

    const centerCursor = () => {
      const { from } = editor.state.selection
      const { node } = editor.view.domAtPos(from)
      const el = (node.nodeType === Node.TEXT_NODE ? node.parentElement : node) as HTMLElement | null
      el?.scrollIntoView({ block: 'center' })
    }

    editor.on('transaction', centerCursor)
    centerCursor()
    return () => { editor.off('transaction', centerCursor) }
  }, [editor, typewriterMode])

  const moveSelectedBlock = (direction: 'up' | 'down') => {
    if (!editor) return
    const { state } = editor
    const found = findTopLevelBlockAt(state.doc, state.selection.from)
    if (!found) return

    const { doc } = state
    let targetPos: number | null = null
    if (direction === 'up' && found.index > 0) {
      targetPos = found.pos - doc.child(found.index - 1).nodeSize
    } else if (direction === 'down' && found.index < doc.childCount - 1) {
      targetPos = found.pos + found.node.nodeSize + doc.child(found.index + 1).nodeSize
    }
    if (targetPos === null) return

    const tr = moveTopLevelBlock(state, found.pos, targetPos)
    if (tr) editor.view.dispatch(tr)
  }

  const selectedBlock = editor ? findTopLevelBlockAt(editor.state.doc, editor.state.selection.from) : null
  const canMoveUp = !!selectedBlock && selectedBlock.index > 0
  const canMoveDown = !!selectedBlock && selectedBlock.index < (editor?.state.doc.childCount ?? 0) - 1

  const imageInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) {
        editor.chain().focus().setImage({ src: data.url }).run()
      }
    } catch (err) {
      console.error('Bild-Upload fehlgeschlagen:', err)
    }
    e.target.value = ''
  }

  if (!editor) return null

  return (
    <div className={`${BORDER} ${RADIUS} overflow-hidden ${SURFACE}`}>
      <div className={`flex items-center gap-1 p-2 border-b border-zinc-300 dark:border-zinc-700 ${SURFACE_ALT}`}>
        <button onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors ${editor.isActive('bold') ? `${ACTIVE_SURFACE} ${ACCENT_TEXT}` : ''}`}
          title="Fett"><Bold size={16} /></button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors ${editor.isActive('italic') ? `${ACTIVE_SURFACE} ${ACCENT_TEXT}` : ''}`}
          title="Kursiv"><Italic size={16} /></button>
        <div className={`w-px h-6 ${DIVIDER} mx-1`} />
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors ${editor.isActive('heading', { level: 1 }) ? `${ACTIVE_SURFACE} ${ACCENT_TEXT}` : ''}`}
          title="Überschrift 1"><Heading1 size={16} /></button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors ${editor.isActive('heading', { level: 2 }) ? `${ACTIVE_SURFACE} ${ACCENT_TEXT}` : ''}`}
          title="Überschrift 2"><Heading2 size={16} /></button>
        <div className={`w-px h-6 ${DIVIDER} mx-1`} />
        <button onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors ${editor.isActive('bulletList') ? `${ACTIVE_SURFACE} ${ACCENT_TEXT}` : ''}`}
          title="Aufzählung"><List size={16} /></button>
        <button onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors ${editor.isActive('blockquote') ? `${ACTIVE_SURFACE} ${ACCENT_TEXT}` : ''}`}
          title="Zitat"><Quote size={16} /></button>
        <div className={`w-px h-6 ${DIVIDER} mx-1`} />
        <button onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors`}
          title="Szenentrenner"><SeparatorHorizontal size={16} /></button>
        <div className={`w-px h-6 ${DIVIDER} mx-1`} />
        <button onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors disabled:opacity-50`}
          title="Rückgängig"><Undo size={16} /></button>
        <button onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors disabled:opacity-50`}
          title="Wiederholen"><Redo size={16} /></button>
        <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        <button onClick={() => imageInputRef.current?.click()}
          className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors`}
          title="Bild einfügen"><ImageIcon size={16} /></button>
        <div className={`w-px h-6 ${DIVIDER} mx-1`} />
        <button onClick={() => moveSelectedBlock('up')}
          disabled={!canMoveUp}
          className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors disabled:opacity-50`}
          title="Block nach oben verschieben"><ArrowUp size={16} /></button>
        <button onClick={() => moveSelectedBlock('down')}
          disabled={!canMoveDown}
          className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors disabled:opacity-50`}
          title="Block nach unten verschieben"><ArrowDown size={16} /></button>
        <div className={`w-px h-6 ${DIVIDER} mx-1`} />
        <button onClick={onToggleSplitScreen}
          className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors ${splitScreenActive ? `${ACTIVE_SURFACE} ${ACCENT_TEXT}` : ''}`}
          title="Referenz-Modus (Split-Screen)"><Columns2 size={16} /></button>
      </div>
      <EditorContent editor={editor} className="min-h-[400px] relative" />
    </div>
  )
}