const ANIMATIONS = [
  {
    id: 'pushup',
    label: 'Push-up',
    aliases: ['push up', 'pushup', 'pushups', 'press up', 'pressup'],
    cue: 'Keep a straight line from head to heels. Bend the elbows to lower the chest, then press the floor away.',
  },
  {
    id: 'squat',
    label: 'Squat',
    aliases: ['squat', 'squats', 'back squat', 'front squat', 'barbell squat', 'goblet squat', 'barbell back squat'],
    cue: 'Sit the hips back and down. Knees track over the toes, then stand by driving through the floor.',
  },
  {
    id: 'benchpress',
    label: 'Bench press',
    aliases: [
      'bench press', 'benchpress', 'barbell bench press', 'dumbbell bench press',
      'incline dumbbell press', 'incline press', 'chest press',
    ],
    cue: 'Lower the bar to mid-chest under control, then press it to lockout without bouncing.',
  },
  {
    id: 'bicepscurl',
    label: 'Biceps curl',
    aliases: [
      'biceps curl', 'bicep curl', 'barbell biceps curl', 'barbell curl',
      'dumbbell curl', 'hammer curl',
    ],
    cue: 'Pin the elbows. Curl the load to the shoulder, then lower without swinging.',
  },
  {
    id: 'shoulderpress',
    label: 'Shoulder press',
    aliases: [
      'shoulder press', 'overhead press', 'military press',
      'barbell overhead press', 'dumbbell shoulder press', 'ohp',
    ],
    cue: 'Brace the ribcage. Press the load overhead, then lower it to the shoulders.',
  },
  {
    id: 'pullup',
    label: 'Pull-up',
    aliases: ['pull up', 'pullup', 'pullups', 'chin up', 'chinup'],
    cue: 'Hang long, then pull the elbows down until the chin clears the bar. Lower under control.',
  },
  {
    id: 'lunge',
    label: 'Lunge',
    aliases: ['lunge', 'lunges', 'walking lunge', 'forward lunge', 'reverse lunge', 'split squat'],
    cue: 'Step forward, bend both knees, then push back to standing without collapsing the torso.',
  },
  {
    id: 'plank',
    label: 'Plank',
    aliases: ['plank', 'front plank', 'forearm plank', 'hollow hold'],
    cue: 'Hold a rigid line from head to heels. Breathe steadily without letting the hips sag.',
  },
  {
    id: 'latpulldown',
    label: 'Lat pulldown',
    aliases: ['lat pulldown', 'lat pull down', 'latpulldown', 'pulldown'],
    cue: 'Sit tall. Pull the bar to the upper chest, then return it with control.',
  },
  {
    id: 'dumbbellrow',
    label: 'Dumbbell row',
    aliases: [
      'dumbbell row', 'db row', 'one arm row', 'one arm dumbbell row',
      'single arm row', 'bent over row', 'barbell row', 'seated cable row', 'cable row',
    ],
    cue: 'Hinge and brace. Row the load to the hip, then lower it without rotating the torso.',
  },
]

export function normalizeExerciseName(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function aliasHits(normalized, alias) {
  if (normalized === alias) return true
  const words = alias.split(' ').filter(Boolean)
  if (words.length >= 2) return normalized.includes(alias)
  return normalized.split(' ').includes(alias)
}

export function resolveExerciseAnimation(value = '') {
  const normalized = normalizeExerciseName(value)
  if (!normalized) {
    return { id: 'unknown', label: 'Movement', cue: 'No movement preview for this exercise yet.', animated: false }
  }

  let match = null
  let matchLength = -1
  for (const animation of ANIMATIONS) {
    for (const alias of animation.aliases) {
      const key = normalizeExerciseName(alias)
      if (!aliasHits(normalized, key)) continue
      if (key.length > matchLength) {
        match = animation
        matchLength = key.length
      }
    }
  }

  if (!match) {
    return {
      id: 'unknown',
      label: value,
      cue: 'Static reference — a dedicated animation is not available for this movement.',
      animated: false,
    }
  }

  return { ...match, animated: true }
}

export const SUPPORTED_ANIMATION_IDS = ANIMATIONS.map((item) => item.id)
