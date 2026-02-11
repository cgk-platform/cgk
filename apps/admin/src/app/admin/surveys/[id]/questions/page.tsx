'use client'

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@cgk/ui'
import {
  ArrowLeft,
  Plus,
  GripVertical,
  Trash2,
  CircleDot,
  CheckSquare,
  Type,
  AlignLeft,
  Star,
  Gauge,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  GitBranch,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'

import type {
  SurveyQuestion,
  Survey,
  QuestionType,
  CreateQuestionInput,
  UpdateQuestionInput,
  QuestionOption,
  ConditionalLogic,
} from '@/lib/surveys'
import { QUESTION_TYPE_LABELS } from '@/lib/surveys'

const QUESTION_TYPE_ICONS: Record<QuestionType, typeof CircleDot> = {
  single_select: CircleDot,
  multi_select: CheckSquare,
  text: Type,
  textarea: AlignLeft,
  rating: Star,
  nps: Gauge,
  email: Mail,
  phone: Phone,
}

export default function QuestionsPage() {
  const params = useParams()
  const surveyId = params.id as string

  const [survey, setSurvey] = useState<Survey | null>(null)
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showNewQuestion, setShowNewQuestion] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [surveyRes, questionsRes] = await Promise.all([
        fetch(`/api/admin/surveys/${surveyId}`),
        fetch(`/api/admin/surveys/${surveyId}/questions`),
      ])

      const [surveyData, questionsData] = await Promise.all([
        surveyRes.json(),
        questionsRes.json(),
      ])

      if (surveyRes.ok) setSurvey(surveyData.survey)
      if (questionsRes.ok) setQuestions(questionsData.questions)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }, [surveyId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreateQuestion = async (input: CreateQuestionInput) => {
    try {
      const response = await fetch(`/api/admin/surveys/${surveyId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (response.ok) {
        const data = await response.json()
        setQuestions([...questions, data.question])
        setShowNewQuestion(false)
      }
    } catch (error) {
      console.error('Failed to create question:', error)
    }
  }

  const handleUpdateQuestion = async (questionId: string, input: UpdateQuestionInput) => {
    try {
      const response = await fetch(`/api/admin/surveys/questions/${questionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (response.ok) {
        const data = await response.json()
        setQuestions(questions.map((q) => (q.id === questionId ? data.question : q)))
        setEditingId(null)
      }
    } catch (error) {
      console.error('Failed to update question:', error)
    }
  }

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return

    try {
      const response = await fetch(`/api/admin/surveys/questions/${questionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setQuestions(questions.filter((q) => q.id !== questionId))
      }
    } catch (error) {
      console.error('Failed to delete question:', error)
    }
  }

  const handleReorder = async (startIndex: number, endIndex: number) => {
    const reordered = [...questions]
    const [removed] = reordered.splice(startIndex, 1)
    reordered.splice(endIndex, 0, removed)

    setQuestions(reordered)

    const orderMap: Record<string, number> = {}
    reordered.forEach((q, i) => {
      orderMap[q.id] = i
    })

    try {
      await fetch(`/api/admin/surveys/${surveyId}/questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderMap }),
      })
    } catch (error) {
      console.error('Failed to reorder questions:', error)
    }
  }

  if (loading) {
    return <QuestionsSkeleton />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/admin/surveys/${surveyId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Questions</h1>
            <p className="text-muted-foreground">{survey?.name}</p>
          </div>
        </div>
        <Button onClick={() => setShowNewQuestion(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Question
        </Button>
      </div>

      {questions.length === 0 && !showNewQuestion ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CircleDot className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No questions yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first question to start building the survey
            </p>
            <Button className="mt-4" onClick={() => setShowNewQuestion(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              index={index}
              isEditing={editingId === question.id}
              questions={questions}
              onEdit={() => setEditingId(question.id)}
              onSave={(input) => handleUpdateQuestion(question.id, input)}
              onCancel={() => setEditingId(null)}
              onDelete={() => handleDeleteQuestion(question.id)}
              onMoveUp={() => index > 0 && handleReorder(index, index - 1)}
              onMoveDown={() => index < questions.length - 1 && handleReorder(index, index + 1)}
            />
          ))}

          {showNewQuestion && (
            <NewQuestionCard
              questions={questions}
              onSave={handleCreateQuestion}
              onCancel={() => setShowNewQuestion(false)}
            />
          )}
        </div>
      )}
    </div>
  )
}

function QuestionCard({
  question,
  index,
  isEditing,
  questions,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  question: SurveyQuestion
  index: number
  isEditing: boolean
  questions: SurveyQuestion[]
  onEdit: () => void
  onSave: (input: UpdateQuestionInput) => void
  onCancel: () => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const Icon = QUESTION_TYPE_ICONS[question.question_type]

  if (isEditing) {
    return (
      <QuestionEditor
        question={question}
        questions={questions}
        onSave={onSave}
        onCancel={onCancel}
      />
    )
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center gap-1 pt-1">
            <button
              onClick={onMoveUp}
              disabled={index === 0}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <button
              onClick={onMoveDown}
              disabled={index === questions.length - 1}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {QUESTION_TYPE_LABELS[question.question_type]}
              </span>
              {question.required && (
                <Badge variant="secondary" className="text-xs">
                  Required
                </Badge>
              )}
              {question.is_attribution_question && (
                <Badge className="bg-purple-100 text-purple-700 text-xs">
                  Attribution
                </Badge>
              )}
              {question.show_when && (
                <Badge variant="outline" className="text-xs gap-1">
                  <GitBranch className="h-3 w-3" />
                  Conditional
                </Badge>
              )}
            </div>

            <p className="mt-1 font-medium">{question.question_text}</p>

            {question.help_text && (
              <p className="mt-0.5 text-sm text-muted-foreground">{question.help_text}</p>
            )}

            {question.options.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {question.options.slice(0, 5).map((opt) => (
                  <span
                    key={opt.id}
                    className="rounded-full bg-muted px-2 py-0.5 text-xs"
                  >
                    {opt.label}
                  </span>
                ))}
                {question.options.length > 5 && (
                  <span className="text-xs text-muted-foreground">
                    +{question.options.length - 5} more
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function NewQuestionCard({
  questions,
  onSave,
  onCancel,
}: {
  questions: SurveyQuestion[]
  onSave: (input: CreateQuestionInput) => void
  onCancel: () => void
}) {
  return (
    <QuestionEditor
      questions={questions}
      onSave={(input) => onSave(input as CreateQuestionInput)}
      onCancel={onCancel}
    />
  )
}

function QuestionEditor({
  question,
  questions,
  onSave,
  onCancel,
}: {
  question?: SurveyQuestion
  questions: SurveyQuestion[]
  onSave: (input: UpdateQuestionInput | CreateQuestionInput) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    question_text: question?.question_text || '',
    help_text: question?.help_text || '',
    question_type: question?.question_type || 'single_select' as QuestionType,
    options: question?.options || [],
    required: question?.required || false,
    is_attribution_question: question?.is_attribution_question || false,
    show_when: question?.show_when || null,
  })
  const [showConditional, setShowConditional] = useState(!!question?.show_when)

  const needsOptions = ['single_select', 'multi_select'].includes(formData.question_type)
  const previousQuestions = questions.filter(
    (q) =>
      q.id !== question?.id &&
      ['single_select', 'multi_select'].includes(q.question_type),
  )

  const addOption = () => {
    const newOption: QuestionOption = {
      id: `opt_${Date.now()}`,
      label: '',
      value: '',
    }
    setFormData({ ...formData, options: [...formData.options, newOption] })
  }

  const updateOption = (index: number, field: keyof QuestionOption, value: string | boolean) => {
    const options = [...formData.options]
    options[index] = { ...options[index], [field]: value }
    if (field === 'label' && typeof value === 'string') {
      options[index].value = value.toLowerCase().replace(/[^a-z0-9]+/g, '_')
    }
    setFormData({ ...formData, options })
  }

  const removeOption = (index: number) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index),
    })
  }

  const handleSave = () => {
    if (!formData.question_text.trim()) return

    const input: UpdateQuestionInput = {
      question_text: formData.question_text,
      help_text: formData.help_text || undefined,
      question_type: formData.question_type,
      options: needsOptions ? formData.options : [],
      required: formData.required,
      is_attribution_question: formData.is_attribution_question,
      show_when: showConditional ? formData.show_when : null,
    }

    onSave(input)
  }

  return (
    <Card className="border-primary">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {question ? 'Edit Question' : 'New Question'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Question Type</label>
            <select
              value={formData.question_type}
              onChange={(e) =>
                setFormData({ ...formData, question_type: e.target.value as QuestionType })
              }
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.required}
                onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm">Required</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_attribution_question}
                onChange={(e) =>
                  setFormData({ ...formData, is_attribution_question: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm">Attribution Question</span>
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Question Text</label>
          <input
            type="text"
            value={formData.question_text}
            onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
            placeholder="e.g., How did you hear about us?"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Help Text (Optional)</label>
          <input
            type="text"
            value={formData.help_text}
            onChange={(e) => setFormData({ ...formData, help_text: e.target.value })}
            placeholder="Additional context for the question"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {needsOptions && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Options</label>
            <div className="space-y-2">
              {formData.options.map((opt, index) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={opt.label}
                    onChange={(e) => updateOption(index, 'label', e.target.value)}
                    placeholder="Option label"
                    className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={opt.isOther || false}
                      onChange={(e) => updateOption(index, 'isOther', e.target.checked)}
                      className="h-3 w-3 rounded border-gray-300"
                    />
                    Other
                  </label>
                  <button
                    onClick={() => removeOption(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addOption}>
                <Plus className="mr-1 h-3 w-3" />
                Add Option
              </Button>
            </div>
          </div>
        )}

        {previousQuestions.length > 0 && (
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showConditional}
                onChange={(e) => {
                  setShowConditional(e.target.checked)
                  if (!e.target.checked) {
                    setFormData({ ...formData, show_when: null })
                  }
                }}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium">Show conditionally</span>
            </label>

            {showConditional && (
              <div className="ml-6 grid gap-2 md:grid-cols-3">
                <select
                  value={formData.show_when?.questionId || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      show_when: {
                        questionId: e.target.value,
                        operator: formData.show_when?.operator || 'equals',
                        value: formData.show_when?.value || '',
                      },
                    })
                  }
                  className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select question...</option>
                  {previousQuestions.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.question_text.slice(0, 40)}...
                    </option>
                  ))}
                </select>

                <select
                  value={formData.show_when?.operator || 'equals'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      show_when: {
                        ...formData.show_when!,
                        operator: e.target.value as ConditionalLogic['operator'],
                      },
                    })
                  }
                  className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="equals">Equals</option>
                  <option value="not_equals">Not Equals</option>
                  <option value="contains">Contains</option>
                </select>

                <select
                  value={
                    typeof formData.show_when?.value === 'string'
                      ? formData.show_when.value
                      : ''
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      show_when: {
                        ...formData.show_when!,
                        value: e.target.value,
                      },
                    })
                  }
                  className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select value...</option>
                  {previousQuestions
                    .find((q) => q.id === formData.show_when?.questionId)
                    ?.options.map((opt) => (
                      <option key={opt.id} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!formData.question_text.trim()}>
            {question ? 'Save Changes' : 'Add Question'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function QuestionsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-8 w-8 animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-5 w-64 animate-pulse rounded bg-muted" />
                <div className="flex gap-1">
                  <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
                  <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
