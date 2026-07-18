import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Item, Project } from '../components/types'

interface UseItemsArgs {
  selectedProject: Project | null
  showError: (message: string) => void
  requestConfirm: (title: string, message: string, onConfirm: () => void) => void
  onConfirmed: () => void
}

export function useItems({ selectedProject, showError, requestConfirm, onConfirmed }: UseItemsArgs) {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>([])
  const [editingItem, setEditingItem] = useState<Item | null>(null)

  const loadItems = async (projectId: string) => {
    try {
      const response = await fetch(`/api/items?projectId=${projectId}`)
      if (response.status === 401) {
        router.push('/login')
        return
      }
      if (!response.ok) {
        showError('Items konnten nicht geladen werden.')
        setItems([])
        return
      }
      const data = await response.json()
      setItems(data)
    } catch (error) {
      console.error('Error loading items:', error)
      showError('Items konnten nicht geladen werden.')
      setItems([])
    }
  }

  useEffect(() => {
    if (selectedProject) {
      loadItems(selectedProject.id)
    } else {
      setItems([])
    }
  }, [selectedProject])

  const addItem = async (name: string, description: string, origin: string, significance: string, visibility: 'PRIVATE' | 'FAMILY') => {
    if (!selectedProject) return
    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, origin, significance, visibility, projectId: selectedProject.id })
      })
      if (!response.ok) {
        showError('Item konnte nicht erstellt werden.')
        return
      }
      const newItem = await response.json()
      setItems([newItem, ...items])
    } catch (error) {
      console.error('Error adding item:', error)
      showError('Item konnte nicht erstellt werden.')
    }
  }

  const updateItem = async (id: string, name: string, description: string, origin: string, significance: string, visibility: 'PRIVATE' | 'FAMILY') => {
    try {
      const response = await fetch(`/api/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, origin, significance, visibility })
      })
      if (!response.ok) {
        showError('Item konnte nicht gespeichert werden.')
        return
      }
      const updated = await response.json()
      setItems(items.map(i => i.id === id ? updated : i))
    } catch (error) {
      console.error('Error updating item:', error)
      showError('Item konnte nicht gespeichert werden.')
    }
  }

  const deleteItem = (itemId: string) => {
    requestConfirm('Item löschen', 'Möchtest du dieses Item wirklich löschen?', async () => {
      onConfirmed()
      try {
        const response = await fetch(`/api/items/${itemId}`, { method: 'DELETE' })
        if (!response.ok) {
          showError('Item konnte nicht gelöscht werden.')
          return
        }
        setItems(items.filter(i => i.id !== itemId))
      } catch (error) {
        console.error('Error deleting item:', error)
        showError('Item konnte nicht gelöscht werden.')
      }
    })
  }

  return {
    items,
    editingItem,
    setEditingItem,
    addItem,
    updateItem,
    deleteItem,
  }
}
