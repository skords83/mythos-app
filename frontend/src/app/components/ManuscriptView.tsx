'use client'

import { MutableRefObject, useEffect, useRef, useState } from 'react'
import { RichTextEditor, CommentEditorApi } from './RichTextEditor'
import { ReferencePanel } from './ReferencePanel'
import { ScenesPanel } from './ScenesPanel'
import { CommentsPanel } from './CommentsPanel'
import { Chapter, Character, Comment, CommentActions, Item, Place } from './types'
import { ChapterDraft } from '@/lib/chapterDraftStore'
import { DraftRecoveryBanner } from './DraftRecoveryBanner'
import { TEXT_PRIMARY, TEXT_MUTED, ACCENT, RADIUS } from '@/lib/theme'
import type { MentionClickResult } from '@/lib/tiptap/mentionClick'
import { useComments } from '../hooks/useComments'

type SidePanel = 'none' | 'reference' | 'comments'

interface ManuscriptViewProps {
  selectedChapter: Chapter | null
  chapters: Chapter[]
  places: Place[]
  items: Item[]
  editorContent: string
  setEditorContent: (content: string) => void
  onTitleChange: (title: string) => void
  onCreateChapter: () => void
  editorSetContentRef: MutableRefObject<((content: string) => void) | null>
  pendingDraft: ChapterDraft | null
  onRestoreDraft: () => void
  onDiscardDraft: () => void
  characters: Character[]
  onMentionClick: (result: MentionClickResult) => void
  onCommentClick: (payload: { comment: Comment; position: { x: number; y: number } }) => void
  commentActionsRef: MutableRefObject<CommentActions | null>
  focusMode: boolean
  showError: (message: string) => void
  requestConfirm: (title: string, message: string, onConfirm: () => void) => void
  onConfirmed: () => void
}

export function ManuscriptView({
  selectedChapter,
  chapters,
  places,
  items,
  editorContent,
  setEditorContent,
  onTitleChange,
  onCreateChapter,
  editorSetContentRef,
  pendingDraft,
  onRestoreDraft,
  onDiscardDraft,
  characters,
  onMentionClick,
  onCommentClick,
  commentActionsRef,
  focusMode,
  showError,
  requestConfirm,
  onConfirmed,
}: ManuscriptViewProps) {
  const [sidePanel, setSidePanel] = useState<SidePanel>('none')
  const splitScreenOpen = sidePanel !== 'none'

  const { comments, updateComment, toggleResolved, deleteComment, addComment } = useComments({
    chapterId: selectedChapter?.id ?? null,
    showError,
    requestConfirm,
    onConfirmed,
  })

  const commentEditorApiRef = useRef<CommentEditorApi | null>(null)

  useEffect(() => {
    commentActionsRef.current = {
      updateComment,
      toggleResolved: (id, resolved) => {
        toggleResolved(id, resolved)
        commentEditorApiRef.current?.setResolved(id, resolved)
      },
      deleteComment: (id, onDeleted) => {
        deleteComment(id, () => {
          commentEditorApiRef.current?.removeMark(id)
          onDeleted?.()
        })
      },
    }
  }, [updateComment, toggleResolved, deleteComment, commentActionsRef])

  return (
    <div className={`${splitScreenOpen ? 'max-w-6xl' : 'max-w-3xl'} mx-auto px-8 py-12 relative`}>
      {selectedChapter ? (
        <div className={splitScreenOpen ? 'flex gap-6 items-start' : ''}>
          <div className={splitScreenOpen ? 'flex-1 min-w-0' : ''}>
            {pendingDraft && pendingDraft.chapterId === selectedChapter.id && (
              <DraftRecoveryBanner draft={pendingDraft} onRestore={onRestoreDraft} onDiscard={onDiscardDraft} />
            )}
            <input
              type="text"
              placeholder="Kapiteltitel..."
              value={selectedChapter.title}
              onChange={(e) => onTitleChange(e.target.value)}
              className={`w-full text-3xl font-serif font-bold bg-transparent border-none outline-none placeholder-zinc-400 dark:placeholder-zinc-600 ${TEXT_PRIMARY} mb-8`}
            />
            <RichTextEditor
              content={editorContent}
              onChange={setEditorContent}
              placeholder="Beginne zu schreiben... (@ für Charaktere, Orte, Objekte)"
              onEditorReady={(setter) => { editorSetContentRef.current = setter }}
              characters={characters}
              places={places}
              items={items}
              onMentionClick={onMentionClick}
              splitScreenActive={sidePanel === 'reference'}
              onToggleSplitScreen={() => setSidePanel((p) => (p === 'reference' ? 'none' : 'reference'))}
              typewriterMode={focusMode}
              onCommentClick={(result) => {
                const comment = comments.find((c) => c.id === result.commentId)
                if (comment) onCommentClick({ comment, position: result.position })
              }}
              commentsPanelActive={sidePanel === 'comments'}
              onToggleCommentsPanel={() => setSidePanel((p) => (p === 'comments' ? 'none' : 'comments'))}
              onAddComment={addComment}
              onCommentEditorReady={(api) => { commentEditorApiRef.current = api }}
            />
            <ScenesPanel
              chapterId={selectedChapter.id}
              characters={characters}
              places={places}
              items={items}
              showError={showError}
              requestConfirm={requestConfirm}
              onConfirmed={onConfirmed}
            />
          </div>
          {sidePanel === 'reference' && (
            <ReferencePanel
              chapters={chapters}
              characters={characters}
              places={places}
              currentChapterId={selectedChapter.id}
              onClose={() => setSidePanel('none')}
            />
          )}
          {sidePanel === 'comments' && (
            <CommentsPanel
              comments={comments}
              anchoredCommentIds={commentEditorApiRef.current?.getAnchoredIds() ?? new Set()}
              onClose={() => setSidePanel('none')}
              onJump={(commentId) => commentEditorApiRef.current?.jumpTo(commentId)}
              onToggleResolved={(commentId, resolved) => commentActionsRef.current?.toggleResolved(commentId, resolved)}
              onDelete={(commentId) => commentActionsRef.current?.deleteComment(commentId)}
            />
          )}
        </div>
      ) : (
        <div className={`text-center py-12 ${TEXT_MUTED}`}>
          <p>Erstelle ein neues Kapitel, um zu beginnen.</p>
          <button
            onClick={onCreateChapter}
            className={`mt-4 px-4 py-2 ${ACCENT} text-white ${RADIUS} transition-colors`}
          >
            Kapitel erstellen
          </button>
        </div>
      )}
    </div>
  )
}
