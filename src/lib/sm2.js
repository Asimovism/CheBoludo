// quality: 5=perfect recall, 4=correct after hesitation, 3=correct with difficulty,
//          2=incorrect but remembered on seeing answer, 1=incorrect, 0=complete blackout
export function calculateSM2(card, quality) {
  let { ease_factor = 2.5, interval_days = 1, repetitions = 0 } = card

  if (quality >= 3) {
    if (repetitions === 0) interval_days = 1
    else if (repetitions === 1) interval_days = 6
    else interval_days = Math.round(interval_days * ease_factor)
    repetitions += 1
  } else {
    repetitions = 0
    interval_days = 1
  }

  ease_factor += 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  ease_factor = Math.max(1.3, parseFloat(ease_factor.toFixed(2)))

  const next_review = new Date()
  next_review.setDate(next_review.getDate() + interval_days)

  return { ease_factor, interval_days, repetitions, next_review: next_review.toISOString() }
}
