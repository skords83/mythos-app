import { render } from '@testing-library/react'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { useEditor } from '@tiptap/react'
import { RichTextEditor } from '../RichTextEditor'

jest.mock('@tiptap/react', () => ({ useEditor: jest.fn(), EditorContent: () => null }))

it('loads current content when the editor becomes ready without resetting subsequent typing', () => {
  const props = {
    content: '', onChange: jest.fn(), onEditorReady: jest.fn(),
    characters: [], places: [], items: [], onMentionClick: jest.fn(),
    splitScreenActive: false, onToggleSplitScreen: jest.fn(),
    onCommentClick: jest.fn(), commentsPanelActive: false,
    onToggleCommentsPanel: jest.fn(), onAddComment: jest.fn(),
  }
  jest.mocked(useEditor).mockReturnValue(null)
  const { rerender, unmount } = render(<RichTextEditor {...props} />)
  const text = '<p>Gespeicherter Kapiteltext</p>'
  rerender(<RichTextEditor {...props} content={text} />)
  const editor = new Editor({ extensions: [StarterKit], content: '' })
  const transaction = jest.fn()
  editor.on('transaction', transaction)
  const update = jest.fn()
  editor.on('update', update)
  jest.mocked(useEditor).mockReturnValue(editor)
  rerender(<RichTextEditor {...props} content={text} />)
  expect(editor.getHTML()).toBe(text)
  expect(props.onEditorReady).toHaveBeenCalledTimes(1)
  expect(update).not.toHaveBeenCalled()

  editor.commands.insertContent('Weiter ')
  const selection = editor.state.selection.from
  const typed = editor.getHTML()
  transaction.mockClear()
  rerender(<RichTextEditor {...props} content={typed} />)
  expect(transaction).not.toHaveBeenCalled()
  expect(editor.getHTML()).toBe(typed)
  expect(editor.state.selection.from).toBe(selection)
  unmount()
  editor.destroy()
})
