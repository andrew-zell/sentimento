interface Question {
  id: number
  text: string
  type: string
  options: any
  isRequired: boolean
}

interface QuestionRendererProps {
  question: Question
  value: any
  onChange: (value: any) => void
}

export default function QuestionRenderer({ question, value, onChange }: QuestionRendererProps) {
  return (
    <div>
      <h2 className="text-xl md:text-2xl font-display font-semibold text-gray-900 mb-6">
        {question.text}
        {question.isRequired && <span className="text-red-500 ml-1">*</span>}
      </h2>
      
      {question.type === 'multiple_choice' && (
        <MultipleChoiceInput
          options={question.options?.options || []}
          value={value}
          onChange={onChange}
        />
      )}
      
      {question.type === 'emoji' && (
        <EmojiInput
          options={question.options?.options || ['😍', '😊', '😐', '😕', '😢']}
          value={value}
          onChange={onChange}
        />
      )}
      
      {question.type === 'multi_select' && (
        <MultiSelectInput
          options={question.options?.options || []}
          maxSelections={question.options?.max_selections}
          value={value || []}
          onChange={onChange}
        />
      )}
      
      {question.type === 'text' && (
        <TextInput
          placeholder={question.options?.placeholder || 'Share your thoughts...'}
          maxLength={question.options?.max_length || 1000}
          value={value || ''}
          onChange={onChange}
        />
      )}
    </div>
  )
}

function MultipleChoiceInput({ 
  options, 
  value, 
  onChange 
}: { 
  options: string[]
  value: string
  onChange: (value: string) => void 
}) {
  return (
    <div className="space-y-3">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`w-full text-left px-5 py-4 rounded-xl border-2 survey-option
            ${value === option 
              ? 'border-blue-100 bg-blue-100/5 shadow-glow' 
              : 'border-gray-200 hover:border-gray-300'
            }`}
        >
          <span className="font-medium text-gray-900">{option}</span>
        </button>
      ))}
    </div>
  )
}

function EmojiInput({ 
  options, 
  value, 
  onChange 
}: { 
  options: string[]
  value: string
  onChange: (value: string) => void 
}) {
  // Reverse order so positive sentiment is on the right
  const reversedOptions = [...options].reverse()
  
  return (
    <div className="flex justify-center gap-2 md:gap-4 flex-wrap">
      {reversedOptions.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onChange(emoji)}
          className={`emoji-option ${value === emoji ? 'selected' : ''}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}

function MultiSelectInput({ 
  options, 
  maxSelections,
  value, 
  onChange 
}: { 
  options: string[]
  maxSelections?: number
  value: string[]
  onChange: (value: string[]) => void 
}) {
  const handleToggle = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter(v => v !== option))
    } else if (!maxSelections || value.length < maxSelections) {
      onChange([...value, option])
    }
  }
  
  return (
    <div className="space-y-3">
      {maxSelections && (
        <p className="text-sm text-gray-500 mb-4">
          Select up to {maxSelections} options
        </p>
      )}
      {options.map((option) => (
        <button
          key={option}
          onClick={() => handleToggle(option)}
          className={`w-full text-left px-5 py-4 rounded-xl border-2 survey-option flex items-center
            ${value.includes(option) 
              ? 'border-blue-100 bg-blue-100/5 shadow-glow' 
              : 'border-gray-200 hover:border-gray-300'
            }`}
        >
          <span className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center
            ${value.includes(option) 
              ? 'border-blue-100 bg-blue-100' 
              : 'border-gray-300'
            }`}
          >
            {value.includes(option) && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </span>
          <span className="font-medium text-gray-900">{option}</span>
        </button>
      ))}
    </div>
  )
}

function TextInput({ 
  placeholder, 
  maxLength,
  value, 
  onChange 
}: { 
  placeholder: string
  maxLength: number
  value: string
  onChange: (value: string) => void 
}) {
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={4}
        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 
                   font-body text-base text-gray-900 resize-none
                   transition-all duration-150
                   focus:outline-none focus:border-blue-100 focus:ring-2 focus:ring-blue-100/20
                   placeholder:text-gray-400"
      />
      <p className="text-sm text-gray-500 mt-2 text-right">
        {value.length} / {maxLength}
      </p>
    </div>
  )
}

