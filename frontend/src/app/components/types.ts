export interface Project {
  id: string
  title: string
  description: string | null
  coverImage?: string | null
  wordGoal: number
  createdAt: string
  updatedAt: string
  _count?: {
    chapters: number
    characters: number
  }
}

export interface Chapter {
  id: string
  title: string
  content: any
  order: number
  wordCount: number
  projectId: string
  createdAt: string
  updatedAt: string
}

export interface Character {
  id: string
  name: string
  appearance: string | null
  personality: string | null
  backstory: string | null
  motivation: string | null
  avatarUrl: string | null
  visibility: 'PRIVATE' | 'FAMILY'
  projectId: string | null
  familyId: string
  authorId: string
  createdAt: string
  updatedAt: string
}

export interface PlaceImage {
  id: string
  placeId: string
  url: string
  createdAt: string
}

export interface Place {
  id: string
  name: string
  description: string | null
  location: string | null
  climate: string | null
  importance: string | null
  visibility: 'PRIVATE' | 'FAMILY'
  projectId: string | null
  familyId: string
  authorId: string
  parentId: string | null
  images: PlaceImage[]
  createdAt: string
  updatedAt: string
}

export interface Item {
  id: string
  name: string
  description: string | null
  origin: string | null
  significance: string | null
  visibility: 'PRIVATE' | 'FAMILY'
  projectId: string | null
  familyId: string
  authorId: string
  createdAt: string
  updatedAt: string
}

export interface Faction {
  id: string
  name: string
  description: string | null
  goal: string | null
  visibility: 'PRIVATE' | 'FAMILY'
  projectId: string | null
  familyId: string
  authorId: string
  createdAt: string
  updatedAt: string
}

export interface Scene {
  id: string
  name: string
  description: string | null
  order: number
  visibility: 'PRIVATE' | 'FAMILY'
  chapterId: string
  familyId: string
  authorId: string
  createdAt: string
  updatedAt: string
}

export interface Note {
  id: string
  title: string
  content: string
  chapterId: string
  createdAt: string
  updatedAt: string
}

export interface QuickCardState {
  character: Character | null
  position: { x: number, y: number }
  visible: boolean
}
