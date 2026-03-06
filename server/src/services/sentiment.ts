// Sentiment scoring service
// Phase 1: Rule-based scoring for emoji/rating questions
// Phase 2 Ready: Interface designed to swap in AI sentiment analysis

const EMOJI_SCORES: Record<string, number> = {
  '😍': 1.0,
  '😊': 0.75,
  '😐': 0.5,
  '😕': 0.25,
  '😢': 0.0,
}

const RATING_SCORES: Record<string, number> = {
  'Excellent': 1.0,
  'Very Good': 0.85,
  'Good': 0.7,
  'Fair': 0.5,
  'Poor': 0.25,
  'Very Poor': 0.0,
}

export function calculateSentiment(questionType: string, value: any): number | null {
  if (questionType === 'emoji') {
    const emoji = typeof value === 'string' ? value : value?.selected
    return EMOJI_SCORES[emoji] ?? null
  }
  
  if (questionType === 'multiple_choice') {
    const choice = typeof value === 'string' ? value : value?.selected
    return RATING_SCORES[choice] ?? null
  }
  
  // For text responses, return null (Phase 2 AI integration point)
  if (questionType === 'text') {
    return null // TODO: Integrate AI sentiment analysis
  }
  
  // For multi_select, calculate average of selected options
  if (questionType === 'multi_select') {
    const selections = Array.isArray(value) ? value : value?.selected || []
    if (selections.length === 0) return null
    
    const scores = selections.map((s: string) => RATING_SCORES[s]).filter((s): s is number => s !== undefined)
    if (scores.length === 0) return null
    
    return scores.reduce((a, b) => a + b, 0) / scores.length
  }
  
  return null
}

export function getAverageSentiment(scores: (number | null)[]): number | null {
  const validScores = scores.filter((s): s is number => s !== null)
  if (validScores.length === 0) return null
  return validScores.reduce((a, b) => a + b, 0) / validScores.length
}

