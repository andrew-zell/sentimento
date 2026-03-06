import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, ChevronDown, ChevronRight, X, Plus } from 'lucide-react'

interface Question {
  id?: number
  text: string
  type: 'multiple_choice' | 'emoji' | 'multi_select' | 'text'
  options: any
  isRequired: boolean
  tempId?: string
}

interface FormData {
  title: string
  description: string
  isFollowAlong: boolean
  isHostLed: boolean
  questions: Question[]
}

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'emoji', label: 'Emoji Rating' },
  { value: 'multi_select', label: 'Multi-Select' },
  { value: 'text', label: 'Text Response' },
]

const DEFAULT_OPTIONS = {
  multiple_choice: { options: ['Excellent', 'Good', 'Fair', 'Poor'] },
  emoji: { options: ['😍', '😊', '😐', '😕', '😢'] },
  multi_select: { options: ['Option 1', 'Option 2', 'Option 3'], max_selections: 3 },
  text: { placeholder: 'Share your thoughts...', max_length: 1000 },
}

function SortableQuestion({ question, index, onUpdate, onDelete }: {
  question: Question
  index: number
  onUpdate: (updates: Partial<Question>) => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: question.id || question.tempId! })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div ref={setNodeRef} style={{ ...style, border: '1px solid rgba(58,77,64,0.35)', background: 'rgba(26,40,32,0.4)' }} className="rounded-xl mb-3 overflow-hidden">
      {/* Question header */}
      <div className="flex items-center gap-3 p-4">
        <span
          {...attributes}
          {...listeners}
          className="text-text-muted cursor-move hover:text-text-secondary transition-colors duration-150 flex-shrink-0"
        >
          <GripVertical size={16} />
        </span>
        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0" style={{ background: 'rgba(195,215,144,0.15)', color: '#C3D790', border: '1px solid rgba(195,215,144,0.2)' }}>
          {index + 1}
        </span>
        <input
          type="text"
          value={question.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          className="flex-1 bg-transparent font-medium text-text-primary placeholder:text-text-muted focus:outline-none text-sm"
          placeholder="Question text..."
        />
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-text-muted hover:text-text-secondary transition-colors duration-150 p-1 flex-shrink-0"
        >
          {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="text-text-muted hover:text-red-400 transition-colors duration-150 p-1 flex-shrink-0"
        >
          <X size={15} />
        </button>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4" style={{ borderTop: '1px solid rgba(58,77,64,0.3)' }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Question Type</label>
              <select
                value={question.type}
                onChange={(e) => {
                  const newType = e.target.value as Question['type']
                  onUpdate({ type: newType, options: DEFAULT_OPTIONS[newType] })
                }}
                className="input"
              >
                {QUESTION_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={question.isRequired}
                  onChange={(e) => onUpdate({ isRequired: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-text-secondary">Required</span>
              </label>
            </div>
          </div>

          {(question.type === 'multiple_choice' || question.type === 'multi_select') && (
            <div>
              <label className="label">Options</label>
              <div className="space-y-2">
                {question.options?.options?.map((opt: string, i: number) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOptions = [...question.options.options]
                        newOptions[i] = e.target.value
                        onUpdate({ options: { ...question.options, options: newOptions } })
                      }}
                      className="input flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newOptions = question.options.options.filter((_: string, idx: number) => idx !== i)
                        onUpdate({ options: { ...question.options, options: newOptions } })
                      }}
                      className="text-text-muted hover:text-red-400 transition-colors duration-150 px-2"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const newOptions = [...(question.options?.options || []), '']
                    onUpdate({ options: { ...question.options, options: newOptions } })
                  }}
                  className="link-accent text-sm flex items-center gap-1"
                >
                  <Plus size={13} />
                  Add option
                </button>
              </div>
              {question.type === 'multi_select' && (
                <div className="mt-3">
                  <label className="label">Max selections</label>
                  <input
                    type="number"
                    min="1"
                    value={question.options?.max_selections || 3}
                    onChange={(e) => onUpdate({ options: { ...question.options, max_selections: parseInt(e.target.value) } })}
                    className="input w-24"
                  />
                </div>
              )}
            </div>
          )}

          {question.type === 'emoji' && (
            <div>
              <label className="label">Emoji Options</label>
              <div className="flex gap-2 flex-wrap">
                {question.options?.options?.map((emoji: string, i: number) => (
                  <input
                    key={i}
                    type="text"
                    value={emoji}
                    onChange={(e) => {
                      const newOptions = [...question.options.options]
                      newOptions[i] = e.target.value
                      onUpdate({ options: { ...question.options, options: newOptions } })
                    }}
                    className="w-14 h-12 text-center text-2xl rounded-lg focus:outline-none transition-colors duration-150"
                    style={{ background: '#1A2820', border: '1px solid rgba(58,77,64,0.4)' }}
                  />
                ))}
              </div>
            </div>
          )}

          {question.type === 'text' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Placeholder</label>
                <input
                  type="text"
                  value={question.options?.placeholder || ''}
                  onChange={(e) => onUpdate({ options: { ...question.options, placeholder: e.target.value } })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Max Length</label>
                <input
                  type="number"
                  min="1"
                  value={question.options?.max_length || 1000}
                  onChange={(e) => onUpdate({ options: { ...question.options, max_length: parseInt(e.target.value) } })}
                  className="input"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function QuestionnaireForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = !!id

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    isFollowAlong: false,
    isHostLed: false,
    questions: [],
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const { data: questionnaireData } = useQuery({
    queryKey: ['questionnaire', id],
    queryFn: () => api.questionnaires.get(Number(id)),
    enabled: isEditing,
  })

  useEffect(() => {
    if (questionnaireData?.questionnaire) {
      const q = questionnaireData.questionnaire
      setFormData({
        title: q.title,
        description: q.description || '',
        isFollowAlong: q.isFollowAlong,
        isHostLed: q.isHostLed || false,
        questions: q.questions?.sort((a: any, b: any) => a.order - b.order).map((question: any) => ({
          id: question.id,
          text: question.text,
          type: question.type,
          options: question.options,
          isRequired: question.isRequired,
        })) || [],
      })
    }
  }, [questionnaireData])

  const createMutation = useMutation({
    mutationFn: api.questionnaires.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] })
      navigate('/admin/questionnaires')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.questionnaires.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] })
      navigate('/admin/questionnaires')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      title: formData.title,
      description: formData.description || null,
      isFollowAlong: formData.isFollowAlong,
      isHostLed: formData.isHostLed,
      questions: formData.questions.map((q, index) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.options,
        isRequired: q.isRequired,
        order: index,
      })),
    }
    if (isEditing) {
      updateMutation.mutate({ id: Number(id), data })
    } else {
      createMutation.mutate(data)
    }
  }

  const addQuestion = () => {
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, {
        tempId: `temp-${Date.now()}`,
        text: '',
        type: 'multiple_choice',
        options: DEFAULT_OPTIONS.multiple_choice,
        isRequired: false,
      }],
    }))
  }

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => i === index ? { ...q, ...updates } : q),
    }))
  }

  const deleteQuestion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }))
  }

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (active.id !== over?.id) {
      setFormData(prev => {
        const oldIndex = prev.questions.findIndex(q => (q.id || q.tempId) === active.id)
        const newIndex = prev.questions.findIndex(q => (q.id || q.tempId) === over.id)
        return { ...prev, questions: arrayMove(prev.questions, oldIndex, newIndex) }
      })
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div className="animate-fade-in">
      <h1 className="page-header">
        {isEditing ? 'Edit Questionnaire' : 'Create Questionnaire'}
      </h1>

      <form onSubmit={handleSubmit} className="max-w-3xl">
        <div className="card mb-6">
          <h2 className="section-header mb-6">Questionnaire Details</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="label">Title</label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="input"
                placeholder="e.g., In-Person Experience Questions"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="label">Description (optional)</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="input min-h-[80px] resize-none"
                placeholder="Brief description of this questionnaire..."
              />
            </div>

            <div className="space-y-3 pt-1">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  id="isFollowAlong"
                  checked={formData.isFollowAlong}
                  onChange={(e) => setFormData(prev => ({ ...prev, isFollowAlong: e.target.checked }))}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors duration-150">
                  This is a follow-along / pulse questionnaire
                </span>
              </label>

              <div>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    id="isHostLed"
                    checked={formData.isHostLed}
                    onChange={(e) => setFormData(prev => ({ ...prev, isHostLed: e.target.checked }))}
                    className="w-4 h-4 rounded mt-0.5"
                  />
                  <div>
                    <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors duration-150">
                      Host-led questionnaire
                    </span>
                    <p className="text-xs text-text-muted mt-0.5">
                      A tour host will control when participants can advance to each question. Participants join a lobby and wait for the host to start.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="section-header">Questions</h2>
              <p className="text-text-secondary text-sm mt-0.5">
                Add and arrange questions for this questionnaire
              </p>
            </div>
            <button type="button" onClick={addQuestion} className="btn-secondary !py-2 !px-4 flex items-center gap-2 text-sm">
              <Plus size={15} />
              Add Question
            </button>
          </div>

          {formData.questions.length === 0 ? (
            <div className="text-center py-12 text-text-secondary text-sm">
              No questions yet. Click "Add Question" to get started.
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={formData.questions.map(q => q.id || q.tempId!)}
                strategy={verticalListSortingStrategy}
              >
                {formData.questions.map((question, index) => (
                  <SortableQuestion
                    key={question.id || question.tempId}
                    question={question}
                    index={index}
                    onUpdate={(updates) => updateQuestion(index, updates)}
                    onDelete={() => deleteQuestion(index)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/admin/questionnaires')} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Questionnaire' : 'Create Questionnaire'}
          </button>
        </div>
      </form>
    </div>
  )
}
