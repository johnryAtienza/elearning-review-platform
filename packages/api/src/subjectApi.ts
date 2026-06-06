import config from '@s-class/config'
import type { Subject } from '@s-class/types/subjects'
import { SUBJECTS } from './data/subjects'
import { apiClient } from './apiClient'
import * as subjectService from './subject.service'

// Provider router for Subject data. REST path strings ('/courses') are
// retained verbatim — URL migration is out of scope this sprint. Mock and
// Supabase providers use the new domain vocabulary.
export const subjectApi = {
  async getAll(): Promise<Subject[]> {
    if (config.api.useMock)                    return SUBJECTS
    if (config.auth.provider === 'supabase')   return subjectService.getSubjects()
    return apiClient.get<Subject[]>('/courses')
  },

  async getById(id: string): Promise<Subject | undefined> {
    if (config.api.useMock)                    return SUBJECTS.find((c) => c.id === id)
    if (config.auth.provider === 'supabase')   return subjectService.getSubjectById(id)
    return apiClient.get<Subject>(`/courses/${id}`)
  },

  async getByIdAdmin(id: string): Promise<Subject | undefined> {
    if (config.api.useMock)                    return SUBJECTS.find((c) => c.id === id)
    if (config.auth.provider === 'supabase')   return subjectService.getSubjectByIdAdmin(id)
    return apiClient.get<Subject>(`/courses/${id}`)
  },
}
