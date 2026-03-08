export interface Project {
  id: string
  title: string
  description: string | null
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
  description: string | null
  motivation: string | null
  projectId: string
  createdAt: string
  updatedAt: string
}

export interface Place {
  id: string
  name: string
  description: string | null
  location: string | null
  climate: string | null
  importance: string | null
  projectId: string
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
