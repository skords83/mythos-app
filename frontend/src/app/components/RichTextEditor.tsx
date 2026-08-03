'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { Bold, Italic, List, Quote, Heading1, Heading2, Undo, Redo, Image as ImageIcon, ArrowUp, ArrowDown, SeparatorHorizontal, Columns2, MessageSquarePlus, MessageSquare } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { SURFACE, SURFACE_ALT, HAIRLINE, DIVIDER, ICON_PROPS } from '@/lib/theme'
import { ToolButton } from './ToolButton'
import { CharacterMention } from '@/lib/tiptap/characterMentionExtension'
import { EntityMention } from '@/lib/tiptap/entityMentionExtension'
import { createMentionSuggestion, MentionableData } from '@/lib/tiptap/mentionSuggestion'
import { resolveMentionClick, MentionClickResult } from '@/lib/tiptap/mentionClick'
import { resolveCommentClick, CommentClickResult } from '@/lib/tiptap/commentClick'
import { CommentMark, applyCommentResolvedState, removeCommentMark, commentIdsInDoc } from '@/lib/tiptap/commentMark'
import { BlockDragHandle, findTopLevelBlockAt, moveTopLevelBlock } from '@/lib/tiptap/blockDragHandleExtension'
import { PassiveEntityDetection, PassiveDetectionDataRef } from '@/lib/tiptap/passiveEntityDetection'
import { NewCommentInput } from './NewCommentInput'
import type { Character, Item, Place, Comment } from './types'

export interface CommentEditorApi {
  jumpTo: (commentId: string) => void
  setResolved: (commentId: string, resolved: boolean) => void
  removeMark: (commentId: string) => void
  getAnchoredIds: () => Set<string>
}

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
  spellcheckEnabled?: boolean
  spellcheckLocale?: string | null
  onCommentClick: (result: CommentClickResult) => void
  commentsPanelActive: boolean
  onToggleCommentsPanel: () => void
  onAddComment: (content: string, visibility: 'PRIVATE' | 'FAMILY') => Promise<Comment | null>
  onCommentEditorReady?: (api: CommentEditorApi) => void
}

export function RichTextEditor({ content, onChange, placeholder = 'Beginne zu schreiben...', onEditorReady, characters, places, items, onMentionClick, splitScreenActive, onToggleSplitScreen, typewriterMode = false, spellcheckEnabled = true, spellcheckLocale = null, onCommentClick, commentsPanelActive, onToggleCommentsPanel, onAddComment, onCommentEditorReady }: RichTextEditorProps) {
  // useEditor has no deps array below (editor is created once) — mirror useChapters.ts's
  // stale-closure fix so suggestion filtering and click handling always see current data.
  const mentionDataRef = useRef<MentionableData>({ characters, places, items })
  useEffect(() => { mentionDataRef.current = { characters, places, items } }, [characters, places, items])

  // C8: passive entity detection reuses the same characters/places/items props —
  // no new component props needed, it just flags names already known elsewhere in the project.
  const passiveDataRef: PassiveDetectionDataRef = useRef({
    candidates: [
      ...characters.map((c) => ({ id: c.id, name: c.name, kind: 'CHARACTER' as const })),
      ...places.map((p) => ({ id: p.id, name: p.name, kind: 'PLACE' as const })),
      ...items.map((i) => ({ id: i.id, name: i.name, kind: 'ITEM' as const })),
    ],
  })
  useEffect(() => {
    passiveDataRef.current = {
      candidates: [
        ...characters.map((c) => ({ id: c.id, name: c.name, kind: 'CHARACTER' as const })),
        ...places.map((p) => ({ id: p.id, name: p.name, kind: 'PLACE' as const })),
        ...items.map((i) => ({ id: i.id, name: i.name, kind: 'ITEM' as const })),
      ],
    }
  }, [characters, places, items])

  const onMentionClickRef = useRef(onMentionClick)
  useEffect(() => { onMentionClickRef.current = onMentionClick }, [onMentionClick])

  const onCommentClickRef = useRef(onCommentClick)
  useEffect(() => { onCommentClickRef.current = onCommentClick }, [onCommentClick])

  const [newCommentDraft, setNewCommentDraft] = useState<{ from: number; to: number; position: { x: number; y: number } } | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Image,
      CharacterMention.configure({
        suggestion: createMentionSuggestion(mentionDataRef),
      }),
      EntityMention,
      CommentMark,
      BlockDragHandle,
      PassiveEntityDetection.configure({ dataRef: passiveDataRef }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[400px] leading-loose pt-10 pr-12 pb-16 pl-12',
      },
      handleClickOn: (_view, _pos, node, _nodePos, event) => {
        const result = resolveMentionClick(node, event)
        if (!result) return false
        onMentionClickRef.current(result)
        return true
      },
      handleClick: (view, pos, event) => {
        const marks = view.state.doc.resolve(pos).marks()
        const result = resolveCommentClick(marks, event)
        if (!result) return false
        onCommentClickRef.current(result)
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

  useEffect(() => {
    if (editor && onCommentEditorReady) {
      onCommentEditorReady({
        jumpTo: (commentId: string) => {
          let target: { from: number; to: number } | null = null
          editor.state.doc.descendants((node, pos) => {
            if (target) return false
            const mark = node.marks.find(m => m.type.name === 'comment' && m.attrs.commentId === commentId)
            if (mark) target = { from: pos, to: pos + node.nodeSize }
            return true
          })
          if (!target) return
          editor.chain().focus().setTextSelection(target).scrollIntoView().run()
        },
        setResolved: (commentId: string, resolved: boolean) => applyCommentResolvedState(editor, commentId, resolved),
        removeMark: (commentId: string) => removeCommentMark(editor, commentId),
        getAnchoredIds: () => commentIdsInDoc(editor),
      })
    }
  }, [editor])

  // C12: editor is created once with no deps, so spellcheck/dictionary changes are
  // applied directly to the ProseMirror DOM node rather than recreating the editor.
  useEffect(() => {
    if (!editor) return
    editor.view.dom.setAttribute('spellcheck', spellcheckEnabled ? 'true' : 'false')
    if (spellcheckLocale) {
      editor.view.dom.setAttribute('lang', spellcheckLocale)
    } else {
      editor.view.dom.removeAttribute('lang')
    }
  }, [editor, spellcheckEnabled, spellcheckLocale])

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

  const openNewCommentInput = () => {
    if (!editor || editor.state.selection.empty) return
    const { from, to } = editor.state.selection
    const coords = editor.view.coordsAtPos(from)
    setNewCommentDraft({ from, to, position: { x: coords.left, y: coords.bottom } })
  }

  const submitNewComment = async (draftContent: string, visibility: 'PRIVATE' | 'FAMILY') => {
    if (!editor || !newCommentDraft) return
    const created = await onAddComment(draftContent, visibility)
    if (created) {
      editor
        .chain()
        .focus()
        .setTextSelection({ from: newCommentDraft.from, to: newCommentDraft.to })
        .setMark('comment', { commentId: created.id, resolved: false })
        .setTextSelection(newCommentDraft.to)
        .run()
    }
    setNewCommentDraft(null)
  }

  if (!editor) return null

  return (
    <div className={SURFACE}>
      <div className={`flex items-center gap-1 p-2 border-b ${HAIRLINE} ${SURFACE_ALT} sticky top-0 z-10`}>
        <ToolButton onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')} title="Fett"><Bold {...ICON_PROPS} /></ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')} title="Kursiv"><Italic {...ICON_PROPS} /></ToolButton>
        <div className={`w-px h-6 ${DIVIDER} mx-1`} />
        <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })} title="Überschrift 1"><Heading1 {...ICON_PROPS} /></ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })} title="Überschrift 2"><Heading2 {...ICON_PROPS} /></ToolButton>
        <div className={`w-px h-6 ${DIVIDER} mx-1`} />
        <ToolButton onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')} title="Aufzählung"><List {...ICON_PROPS} /></ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')} title="Zitat"><Quote {...ICON_PROPS} /></ToolButton>
        <div className={`w-px h-6 ${DIVIDER} mx-1`} />
        <ToolButton onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Szenentrenner"><SeparatorHorizontal {...ICON_PROPS} /></ToolButton>
        <div className={`w-px h-6 ${DIVIDER} mx-1`} />
        <ToolButton onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()} className="disabled:opacity-50"
          title="Rückgängig"><Undo {...ICON_PROPS} /></ToolButton>
        <ToolButton onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()} className="disabled:opacity-50"
          title="Wiederholen"><Redo {...ICON_PROPS} /></ToolButton>
        <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        <ToolButton onClick={() => imageInputRef.current?.click()}
          title="Bild einfügen"><ImageIcon {...ICON_PROPS} /></ToolButton>
        <div className={`w-px h-6 ${DIVIDER} mx-1`} />
        <ToolButton onClick={() => moveSelectedBlock('up')}
          disabled={!canMoveUp} className="disabled:opacity-50"
          title="Block nach oben verschieben"><ArrowUp {...ICON_PROPS} /></ToolButton>
        <ToolButton onClick={() => moveSelectedBlock('down')}
          disabled={!canMoveDown} className="disabled:opacity-50"
          title="Block nach unten verschieben"><ArrowDown {...ICON_PROPS} /></ToolButton>
        <div className={`w-px h-6 ${DIVIDER} mx-1`} />
        <ToolButton onClick={openNewCommentInput}
          disabled={editor.state.selection.empty} className="disabled:opacity-50"
          title="Kommentar hinzufügen"><MessageSquarePlus {...ICON_PROPS} /></ToolButton>
        <ToolButton onClick={onToggleCommentsPanel}
          active={commentsPanelActive} title="Kommentare"><MessageSquare {...ICON_PROPS} /></ToolButton>
        <div className={`w-px h-6 ${DIVIDER} mx-1`} />
        <ToolButton onClick={onToggleSplitScreen}
          active={splitScreenActive} title="Referenz-Modus (Split-Screen)"><Columns2 {...ICON_PROPS} /></ToolButton>
      </div>
      <EditorContent editor={editor} />
      {newCommentDraft && (
        <NewCommentInput
          position={newCommentDraft.position}
          onCancel={() => setNewCommentDraft(null)}
          onSubmit={submitNewComment}
        />
      )}
    </div>
  )
}
