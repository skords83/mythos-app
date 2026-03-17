'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { Bold, Italic, List, Quote, Heading1, Heading2, Undo, Redo, Image as ImageIcon } from 'lucide-react'
import { useEffect, useRef } from 'react'

interface RichTextEditorProps {
  chapterId?: string
  content: string
  onChange: (content: string) => void
  placeholder?: string
}

export function RichTextEditor({ content, onChange, placeholder = 'Beginne zu schreiben...', chapterId }: RichTextEditorProps) {
  const editor = useEditor({
extensions: [
    StarterKit,
    Placeholder.configure({
      placeholder,
    }),
    Image,
  ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
  })

  useEffect(() => {
    if (editor) {
      editor.commands.setContent(content || '')
    }
  }, [chapterId, editor])

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

  if (!editor) {
    return null
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-[#1A1A1B]">
      <div className="flex items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#262626]">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
            editor.isActive('bold') ? 'bg-gray-200 dark:bg-gray-700 text-[#4A7C59]' : ''
          }`}
          title="Fett"
        >
          <Bold size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
            editor.isActive('italic') ? 'bg-gray-200 dark:bg-gray-700 text-[#4A7C59]' : ''
          }`}
          title="Kursiv"
        >
          <Italic size={16} />
        </button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
            editor.isActive('heading', { level: 1 }) ? 'bg-gray-200 dark:bg-gray-700 text-[#4A7C59]' : ''
          }`}
          title="Überschrift 1"
        >
          <Heading1 size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
            editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 dark:bg-gray-700 text-[#4A7C59]' : ''
          }`}
          title="Überschrift 2"
        >
          <Heading2 size={16} />
        </button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
            editor.isActive('bulletList') ? 'bg-gray-200 dark:bg-gray-700 text-[#4A7C59]' : ''
          }`}
          title="Aufzählung"
        >
          <List size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
            editor.isActive('blockquote') ? 'bg-gray-200 dark:bg-gray-700 text-[#4A7C59]' : ''
          }`}
          title="Zitat"
        >
          <Quote size={16} />
        </button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          title="Rückgängig"
        >
          <Undo size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          title="Wiederholen"
        >
<Redo size={16} />
</button>
<input
  ref={imageInputRef}
  type="file"
  accept="image/*"
  onChange={handleImageUpload}
  className="hidden"
/>
<button
  onClick={() => imageInputRef.current?.click()}
  className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
  title="Bild einfügen"
>
  <ImageIcon size={16} />
</button>
</div>
<EditorContent editor={editor} className="min-h-[400px]" />
    </div>
  )
}