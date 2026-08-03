export interface Project {
  id: string
  title: string
  description: string | null
  coverImage?: string | null
  wordGoal: number
  wordCountBaseline: number
  wordCountBaselineDate: string | null
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
  flaw: string | null
  secrets: string | null
  avatarUrl: string | null
  role: 'PROTAGONIST' | 'ANTAGONIST' | 'MENTOR' | null
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
  history: string | null
  politics: string | null
  sensoryDetails: string | null
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
  outline: string | null
  tags: string[]
  order: number
  visibility: 'PRIVATE' | 'FAMILY'
  chapterId: string
  familyId: string
  authorId: string
  createdAt: string
  updatedAt: string
}

// C9: a named, switchable alternate draft of a chapter. The chapter's own
// content/wordCount is the implicit "Original" version and has no row here.
export interface ChapterVersion {
  id: string
  name: string
  content: any
  wordCount: number
  chapterId: string
  familyId: string
  authorId: string
  createdAt: string
  updatedAt: string
}

export interface TimelineEvent {
  id: string
  title: string
  description: string | null
  date: string | null
  order: number
  type: 'LORE' | 'PLOT'
  visibility: 'PRIVATE' | 'FAMILY'
  projectId: string | null
  familyId: string
  authorId: string
  createdAt: string
  updatedAt: string
}

export interface LoreEntry {
  id: string
  title: string
  content: string | null
  category: string | null
  visibility: 'PRIVATE' | 'FAMILY'
  projectId: string | null
  familyId: string
  authorId: string
  createdAt: string
  updatedAt: string
}

export interface Idea {
  id: string
  title: string
  content: string | null
  tags: string[]
  visibility: 'PRIVATE' | 'FAMILY'
  projectId: string | null
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

export interface Comment {
  id: string
  content: string
  visibility: 'PRIVATE' | 'FAMILY'
  resolved: boolean
  chapterId: string
  familyId: string
  authorId: string
  createdAt: string
  updatedAt: string
  author?: { name: string | null }
}

export interface UserSettings {
  focusModeEnabled: boolean
  spellcheckEnabled: boolean
  spellcheckLocale: string | null
}

export interface CommentPopoverState {
  comment: Comment | null
  position: { x: number, y: number }
  visible: boolean
}

export interface CommentActions {
  updateComment: (id: string, content: string, visibility: 'PRIVATE' | 'FAMILY') => void
  toggleResolved: (id: string, resolved: boolean) => void
  deleteComment: (id: string, onDeleted?: () => void) => void
}

export interface QuickCardState {
  character: Character | null
  position: { x: number, y: number }
  visible: boolean
}

export interface PlaceQuickCardState {
  place: Place | null
  position: { x: number, y: number }
  visible: boolean
}

export interface ItemQuickCardState {
  item: Item | null
  position: { x: number, y: number }
  visible: boolean
}
