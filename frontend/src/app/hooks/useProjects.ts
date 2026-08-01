import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Project } from '../components/types'

interface UseProjectsArgs {
  isCheckingAuth: boolean
  showError: (message: string) => void
}

export function useProjects({ isCheckingAuth, showError }: UseProjectsArgs) {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(isCheckingAuth)

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.status === 401) {
        router.push('/login')
        return
      }
      if (!response.ok) {
        showError('Projekte konnten nicht geladen werden.')
        setIsLoading(false)
        return
      }
      const data = await response.json()
      const projectList: Project[] = data.projects
      setProjects(projectList)
      const storedProjectId = localStorage.getItem('selectedProjectId')
      if (storedProjectId) {
        const selectedProj = projectList.find((p: Project) => p.id === storedProjectId)
        if (selectedProj) {
          setSelectedProject(selectedProj)
        } else if (projectList.length > 0) {
          setSelectedProject(projectList[0])
        }
        localStorage.removeItem('selectedProjectId')
      } else if (projectList.length > 0 && !selectedProject) {
        setSelectedProject(projectList[0])
      }
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading projects:', error)
      showError('Projekte konnten nicht geladen werden.')
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isCheckingAuth) {
      loadProjects()
    }
  }, [isCheckingAuth])

  const createProject = async (title: string, description: string, wordGoal: number) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, wordGoal })
      })
      if (!response.ok) {
        showError('Projekt konnte nicht erstellt werden.')
        return
      }
      const newProject = await response.json()
      setProjects([newProject, ...projects])
      setSelectedProject(newProject)
      await fetch('/api/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Kapitel 1', projectId: newProject.id })
      })
      return newProject
    } catch (error) {
      console.error('Error creating project:', error)
      showError('Projekt konnte nicht erstellt werden.')
    }
  }

  const updateProject = async (id: string, title: string, description: string, wordGoal: number, coverImage?: string) => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, wordGoal, coverImage })
      })
      if (!response.ok) {
        showError('Projekt konnte nicht gespeichert werden.')
        return
      }
      const updatedProject = await response.json()
      setProjects(projects.map(p => p.id === id ? updatedProject : p))
      if (selectedProject?.id === id) {
        setSelectedProject(updatedProject)
      }
    } catch (error) {
      console.error('Error updating project:', error)
      showError('Projekt konnte nicht gespeichert werden.')
    }
  }

  const rolloverDailyWordCount = async (id: string, baseline: number, date: string) => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordCountBaseline: baseline, wordCountBaselineDate: date })
      })
      if (!response.ok) return
      const updatedProject = await response.json()
      setProjects(projects.map(p => p.id === id ? updatedProject : p))
      if (selectedProject?.id === id) {
        setSelectedProject(updatedProject)
      }
    } catch (error) {
      console.error('Error rolling over daily word count:', error)
    }
  }

  const deleteProject = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
      if (!response.ok) {
        showError('Projekt konnte nicht gelöscht werden.')
        return
      }
      setProjects(projects.filter(p => p.id !== projectId))
      if (selectedProject?.id === projectId) {
        setSelectedProject(null)
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      showError('Projekt konnte nicht gelöscht werden.')
    }
  }

  return {
    projects,
    selectedProject,
    setSelectedProject,
    isLoading,
    setIsLoading,
    loadProjects,
    createProject,
    updateProject,
    rolloverDailyWordCount,
    deleteProject,
  }
}
