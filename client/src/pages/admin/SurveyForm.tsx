import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Palette, Eye } from 'lucide-react'

// ─── Theme Config Types ───────────────────────────────────────────────────────

interface ThemeConfig {
  bgType: 'solid' | 'gradient'
  bgColor: string
  bgGradientColor: string
  accentColor: string
  textColor: string
}

const DEFAULT_THEME: ThemeConfig = {
  bgType: 'solid',
  bgColor: '#111813',
  bgGradientColor: '#1A2820',
  accentColor: '#C3D790',
  textColor: '#E8F0E8',
}

// ─── Sortable Item ────────────────────────────────────────────────────────────

function SortableItem({ id, children }: { id: number; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  )
}

// ─── Theme Preview ────────────────────────────────────────────────────────────

function SurveyThemePreview({ theme }: { theme: ThemeConfig }) {
  const bg = theme.bgType === 'gradient'
    ? `linear-gradient(135deg, ${theme.bgColor} 0%, ${theme.bgGradientColor} 100%)`
    : theme.bgColor

  return (
    <div
      className="rounded-xl overflow-hidden h-full flex flex-col"
      style={{ border: '1px solid rgba(58,77,64,0.35)' }}
      style={{ background: bg, minHeight: '340px' }}
    >
      {/* Mock survey header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full" style={{ background: theme.accentColor }} />
          <div className="h-2 rounded" style={{ background: `${theme.accentColor}40`, width: '80px' }} />
        </div>
        {/* Progress bar */}
        <div className="h-1 rounded-full mb-1" style={{ background: `${theme.accentColor}30` }}>
          <div className="h-full rounded-full w-2/5 transition-all" style={{ background: theme.accentColor }} />
        </div>
        <p className="text-xs mt-1" style={{ color: `${theme.accentColor}80` }}>2 of 5</p>
      </div>

      {/* Mock question card */}
      <div className="flex-1 px-6 pb-6">
        <div
          className="rounded-xl p-5 border"
          style={{
            background: `rgba(255,255,255,0.05)`,
            borderColor: `${theme.accentColor}25`,
          }}
        >
          <p className="text-sm font-medium mb-4" style={{ color: theme.textColor }}>
            How would you rate your overall experience?
          </p>
          <div className="space-y-2">
            {['Excellent', 'Good', 'Average'].map((opt, i) => (
              <div
                key={opt}
                className="px-3 py-2 rounded-lg text-xs flex items-center gap-2 border transition-all"
                style={{
                  background: i === 0 ? `${theme.accentColor}20` : 'transparent',
                  borderColor: i === 0 ? `${theme.accentColor}60` : `${theme.accentColor}20`,
                  color: i === 0 ? theme.accentColor : theme.textColor,
                  opacity: i === 0 ? 1 : 0.7,
                }}
              >
                <div
                  className="w-3 h-3 rounded-full border flex-shrink-0"
                  style={{ borderColor: i === 0 ? theme.accentColor : `${theme.accentColor}40`, background: i === 0 ? theme.accentColor : 'transparent' }}
                />
                {opt}
              </div>
            ))}
          </div>
        </div>

        {/* Mock next button */}
        <button
          className="mt-4 w-full py-2.5 rounded-lg text-xs font-semibold transition-all"
          style={{ background: theme.accentColor, color: '#111813' }}
        >
          Next →
        </button>
      </div>
    </div>
  )
}

// ─── Theme Customizer Panel ───────────────────────────────────────────────────

function ThemeCustomizer({ theme, onChange }: { theme: ThemeConfig; onChange: (t: ThemeConfig) => void }) {
  const set = (key: keyof ThemeConfig, value: string) => onChange({ ...theme, [key]: value })

  const presets: { name: string; config: ThemeConfig }[] = [
    {
      name: 'Forest Night',
      config: { bgType: 'solid', bgColor: '#111813', bgGradientColor: '#1A2820', accentColor: '#C3D790', textColor: '#E8F0E8' },
    },
    {
      name: 'Deep Ocean',
      config: { bgType: 'gradient', bgColor: '#0A1628', bgGradientColor: '#0D2240', accentColor: '#60A5FA', textColor: '#E2E8F0' },
    },
    {
      name: 'Midnight',
      config: { bgType: 'solid', bgColor: '#0F0F14', bgGradientColor: '#1A1A28', accentColor: '#A78BFA', textColor: '#F1F0FF' },
    },
    {
      name: 'Warm Slate',
      config: { bgType: 'gradient', bgColor: '#1C1917', bgGradientColor: '#292524', accentColor: '#FB923C', textColor: '#FAFAF9' },
    },
  ]

  return (
    <div className="space-y-6">
      {/* Presets */}
      <div>
        <p className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Presets</p>
        <div className="grid grid-cols-2 gap-2">
          {presets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => onChange(preset.config)}
              className="flex items-center gap-2.5 p-2.5 rounded-lg transition-all duration-150 text-left group"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(58,77,64,0.35)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(195,215,144,0.25)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(58,77,64,0.35)')}
            >
              <div
                className="w-7 h-7 rounded-md flex-shrink-0"
                style={{
                  background: preset.config.bgType === 'gradient'
                    ? `linear-gradient(135deg, ${preset.config.bgColor}, ${preset.config.bgGradientColor})`
                    : preset.config.bgColor,
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div className="w-full h-full rounded-md flex items-end justify-end p-0.5">
                  <div className="w-3 h-1.5 rounded-sm" style={{ background: preset.config.accentColor }} />
                </div>
              </div>
              <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors duration-150">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Background */}
      <div>
        <p className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Background</p>
        <div className="flex gap-2 mb-3">
          {(['solid', 'gradient'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => set('bgType', type)}
              className="flex-1 py-1.5 text-sm rounded-md capitalize transition-all duration-150"
              style={
                theme.bgType === type
                  ? { background: 'rgba(195,215,144,0.12)', border: '1px solid rgba(195,215,144,0.3)', color: '#C3D790' }
                  : { background: 'transparent', border: '1px solid rgba(58,77,64,0.5)', color: '#8FA08A' }
              }
            >
              {type}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <ColorRow
            label={theme.bgType === 'gradient' ? 'Start color' : 'Background color'}
            value={theme.bgColor}
            onChange={(v) => set('bgColor', v)}
          />
          {theme.bgType === 'gradient' && (
            <ColorRow
              label="End color"
              value={theme.bgGradientColor}
              onChange={(v) => set('bgGradientColor', v)}
            />
          )}
        </div>
      </div>

      {/* Colors */}
      <div>
        <p className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Colors</p>
        <div className="space-y-2">
          <ColorRow label="Accent / Button" value={theme.accentColor} onChange={(v) => set('accentColor', v)} />
          <ColorRow label="Text color" value={theme.textColor} onChange={(v) => set('textColor', v)} />
        </div>
      </div>
    </div>
  )
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <label className="relative cursor-pointer flex-shrink-0">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
        <div
          className="w-8 h-8 rounded-lg border border-forest-700/60 hover:border-forest-accent/50 transition-colors duration-150 shadow-sm"
          style={{ background: value }}
        />
      </label>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-secondary">{label}</p>
      </div>
      <input
        type="text"
        value={value.toUpperCase()}
        onChange={(e) => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) onChange(e.target.value) }}
        className="w-20 h-8 px-2 rounded-md font-mono text-sm focus:outline-none transition-colors duration-150"
        style={{ background: '#1A2820', border: '1px solid rgba(58,77,64,0.5)', color: '#E8F0E8' }}
        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(195,215,144,0.4)')}
        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(58,77,64,0.5)')}
      />
    </div>
  )
}

// ─── Main Form ────────────────────────────────────────────────────────────────

interface SurveyFormData {
  title: string
  briefingCenterId: number | null
  tourTypeId: number | null
  isActive: boolean
  questionnaireIds: number[]
  themeConfig: ThemeConfig
}

export default function SurveyForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = !!id

  const [formData, setFormData] = useState<SurveyFormData>({
    title: '',
    briefingCenterId: null,
    tourTypeId: null,
    isActive: true,
    questionnaireIds: [],
    themeConfig: { ...DEFAULT_THEME },
  })

  const [activeTab, setActiveTab] = useState<'details' | 'theme'>('details')
  const [error, setError] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const { data: surveyData } = useQuery({
    queryKey: ['survey', id],
    queryFn: () => api.surveys.get(Number(id)),
    enabled: isEditing,
  })

  const { data: centersData } = useQuery({
    queryKey: ['centers'],
    queryFn: api.centers.list,
  })

  const { data: tourTypesData } = useQuery({
    queryKey: ['tour-types'],
    queryFn: api.tourTypes.list,
  })

  const { data: questionnairesData } = useQuery({
    queryKey: ['questionnaires'],
    queryFn: api.questionnaires.list,
  })

  useEffect(() => {
    if (surveyData?.survey) {
      const s = surveyData.survey
      let parsedTheme = { ...DEFAULT_THEME }
      if (s.themeConfig) {
        try { parsedTheme = { ...DEFAULT_THEME, ...JSON.parse(s.themeConfig) } } catch { /* keep default */ }
      }
      setFormData({
        title: s.title,
        briefingCenterId: s.briefingCenterId,
        tourTypeId: s.tourTypeId,
        isActive: s.isActive,
        questionnaireIds: s.surveyQuestionnaires
          ?.sort((a: any, b: any) => a.order - b.order)
          .map((sq: any) => sq.questionnaireId) || [],
        themeConfig: parsedTheme,
      })
    }
  }, [surveyData])

  const createMutation = useMutation({
    mutationFn: api.surveys.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
      navigate('/admin/surveys')
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to create survey. A survey may already exist for this center/tour type combination.')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.surveys.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
      navigate('/admin/surveys')
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to update survey')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const data = {
      title: formData.title,
      briefingCenterId: formData.briefingCenterId,
      tourTypeId: formData.tourTypeId,
      isActive: formData.isActive,
      themeConfig: JSON.stringify(formData.themeConfig),
      questionnaires: formData.questionnaireIds.map((qId, index) => ({
        questionnaireId: qId,
        order: index,
      })),
    }

    if (isEditing) {
      updateMutation.mutate({ id: Number(id), data })
    } else {
      createMutation.mutate(data)
    }
  }

  const toggleQuestionnaire = (qId: number) => {
    setFormData(prev => ({
      ...prev,
      questionnaireIds: prev.questionnaireIds.includes(qId)
        ? prev.questionnaireIds.filter(id => id !== qId)
        : [...prev.questionnaireIds, qId],
    }))
  }

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (active.id !== over?.id) {
      setFormData(prev => {
        const oldIndex = prev.questionnaireIds.indexOf(active.id)
        const newIndex = prev.questionnaireIds.indexOf(over.id)
        return { ...prev, questionnaireIds: arrayMove(prev.questionnaireIds, oldIndex, newIndex) }
      })
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div className="animate-fade-in">
      <h1 className="page-header">
        {isEditing ? 'Edit Survey' : 'Create Survey'}
      </h1>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-900/30 border border-red-700/50 text-red-300 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Two-column layout when editing */}
        <div className={`gap-6 ${isEditing ? 'flex flex-col xl:flex-row' : ''}`}>

          {/* Left column: form */}
          <div className={isEditing ? 'flex-1 min-w-0' : 'max-w-3xl'}>

            {/* Tab bar (only when editing) */}
            {isEditing && (
              <div className="flex gap-1 p-1 rounded-lg mb-6 w-fit" style={{ background: '#1A2820', border: '1px solid rgba(58,77,64,0.35)' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-150"
                  style={activeTab === 'details'
                    ? { background: '#141F19', color: '#E8F0E8', border: '1px solid rgba(58,77,64,0.4)' }
                    : { background: 'transparent', color: '#8FA08A', border: '1px solid transparent' }}
                >
                  Survey Details
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('theme')}
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-150"
                  style={activeTab === 'theme'
                    ? { background: '#141F19', color: '#E8F0E8', border: '1px solid rgba(58,77,64,0.4)' }
                    : { background: 'transparent', color: '#8FA08A', border: '1px solid transparent' }}
                >
                  <Palette size={14} />
                  Theme
                </button>
              </div>
            )}

            {/* Details tab (always shown when not editing; only shown when activeTab === 'details' when editing) */}
            {(!isEditing || activeTab === 'details') && (
              <>
                {/* Survey Details Card */}
                <div className="card mb-6">
                  <h2 className="section-header mb-6">Survey Details</h2>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="title" className="label">Title</label>
                      <input
                        id="title"
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="input"
                        placeholder="e.g., SJ In-Person Tour Survey"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="center" className="label">Briefing Center</label>
                        <select
                          id="center"
                          value={formData.briefingCenterId || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, briefingCenterId: e.target.value ? Number(e.target.value) : null }))}
                          className="input"
                          required
                        >
                          <option value="">Select center...</option>
                          {centersData?.centers?.map((center: any) => (
                            <option key={center.id} value={center.id}>{center.name} ({center.code})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="tourType" className="label">Tour Type</label>
                        <select
                          id="tourType"
                          value={formData.tourTypeId || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, tourTypeId: e.target.value ? Number(e.target.value) : null }))}
                          className="input"
                          required
                        >
                          <option value="">Select type...</option>
                          {tourTypesData?.tourTypes?.map((type: any) => (
                            <option key={type.id} value={type.id}>{type.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 py-1">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                        className="w-4 h-4 rounded"
                      />
                      <label htmlFor="isActive" className="text-sm text-text-secondary cursor-pointer">
                        Survey is active and accepting responses
                      </label>
                    </div>
                  </div>
                </div>

                {/* Select Questionnaires */}
                <div className="card mb-6">
                  <h2 className="section-header mb-1">Select Questionnaires</h2>
                  <p className="text-text-secondary text-sm mb-5">
                    Choose which questionnaires to include in this survey
                  </p>
                  <div className="space-y-2">
                    {questionnairesData?.questionnaires?.map((q: any) => (
                      <label
                        key={q.id}
                        className="flex items-center p-4 rounded-lg cursor-pointer transition-all duration-150"
                        style={formData.questionnaireIds.includes(q.id)
                          ? { border: '2px solid rgba(195,215,144,0.45)', background: 'rgba(195,215,144,0.06)' }
                          : { border: '2px solid rgba(58,77,64,0.35)', background: 'transparent' }
                        }
                      >
                        <input
                          type="checkbox"
                          checked={formData.questionnaireIds.includes(q.id)}
                          onChange={() => toggleQuestionnaire(q.id)}
                          className="w-4 h-4 rounded flex-shrink-0"
                        />
                        <div className="ml-3 flex-1">
                          <p className={`font-medium text-sm ${formData.questionnaireIds.includes(q.id) ? 'text-forest-accent' : 'text-text-primary'}`}>
                            {q.title}
                          </p>
                          <p className="text-xs text-text-muted mt-0.5">
                            {q.questions?.length || 0} questions
                            {q.isFollowAlong && ' · Follow-along'}
                            {q.isHostLed && ' · Host-led'}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Questionnaire Order */}
                {formData.questionnaireIds.length > 0 && (
                  <div className="card mb-6">
                    <h2 className="section-header mb-1">Questionnaire Order</h2>
                    <p className="text-text-secondary text-sm mb-5">Drag to reorder</p>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={formData.questionnaireIds} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                          {formData.questionnaireIds.map((qId, index) => {
                            const q = questionnairesData?.questionnaires?.find((x: any) => x.id === qId)
                            if (!q) return null
                            return (
                              <SortableItem key={qId} id={qId}>
                                <div className="flex items-center p-4 rounded-lg cursor-move transition-colors duration-150 group"
                  style={{ background: '#1A2820', border: '1px solid rgba(58,77,64,0.35)' }}>
                                  <GripVertical size={16} className="text-text-muted mr-3 group-hover:text-text-secondary transition-colors" />
                                  <span className="w-6 h-6 bg-forest-accent/20 text-forest-accent border border-forest-accent/30 rounded-full flex items-center justify-center text-xs font-semibold mr-3 flex-shrink-0">
                                    {index + 1}
                                  </span>
                                  <p className="font-medium text-text-primary text-sm">{q.title}</p>
                                </div>
                              </SortableItem>
                            )
                          })}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                )}
              </>
            )}

            {/* Theme tab (only when editing) */}
            {isEditing && activeTab === 'theme' && (
              <div className="card mb-6">
                <div className="flex items-center gap-2 mb-6">
                  <Palette size={16} className="text-forest-accent" />
                  <h2 className="section-header">Survey Theme</h2>
                </div>
                <ThemeCustomizer
                  theme={formData.themeConfig}
                  onChange={(t) => setFormData(prev => ({ ...prev, themeConfig: t }))}
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/admin/surveys')}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
              >
                {isSubmitting ? 'Saving...' : isEditing ? 'Update Survey' : 'Create Survey'}
              </button>
            </div>
          </div>

          {/* Right column: preview (only when editing) */}
          {isEditing && (
            <div className="xl:w-80 xl:flex-shrink-0">
              <div className="xl:sticky xl:top-8">
                <div className="card">
                  <div className="flex items-center gap-2 mb-4">
                    <Eye size={15} className="text-forest-accent" />
                    <h3 className="text-sm font-semibold text-text-primary">Theme Preview</h3>
                  </div>
                  <SurveyThemePreview theme={formData.themeConfig} />
                  <p className="text-xs text-text-muted mt-3 text-center">
                    Live preview of the survey respondent experience
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
