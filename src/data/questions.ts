/**
 * Islamic Quiz Contest Format
 * - Round 1: numbered questions (25)
 * - Round 2: prophet guessing with 4 hints (6)
 * - Round 3: speed round question bank (25)
 *
 * Note: Kurdish/Arabic translations were not provided; we return English for all languages.
 */

export type Language = 'en' | 'ku' | 'ar'

export interface TriviaQuestion {
  id: number
  question: string
  answer: string
}

export interface HintQuestion {
  id: number
  hints: [string, string, string, string]
  answer: string
}

const ROUND1_EN: TriviaQuestion[] = [
  { id: 1, question: 'Who was the first Prophet?', answer: 'Adam' },
  { id: 2, question: 'What was the name of the wife of Adam?', answer: 'Hawwa' },
  { id: 3, question: 'Which Prophet built the Ark?', answer: 'Nuh' },
  { id: 4, question: 'Which Prophet was thrown into fire?', answer: 'Ibrahim' },
  { id: 5, question: 'Who is called Khalilullah?', answer: 'Ibrahim' },
  { id: 6, question: 'Which Prophet was swallowed by a fish?', answer: 'Yunus' },
  { id: 7, question: 'Which Prophet could interpret dreams?', answer: 'Yusuf' },
  { id: 8, question: 'Which Prophet was sold by his brothers?', answer: 'Yusuf' },
  { id: 9, question: 'Which Prophet received the Tawrat?', answer: 'Musa' },
  { id: 10, question: 'Which mountain did Musa receive revelation on?', answer: 'Sinai' },
  { id: 11, question: 'Which Prophet could speak to animals?', answer: 'Sulayman' },
  { id: 12, question: 'Which Prophet could control the wind?', answer: 'Sulayman' },
  { id: 13, question: 'Which Prophet’s miracle was the she-camel?', answer: 'Salih' },
  { id: 14, question: 'Which Prophet was sent to ‘Ad?', answer: 'Hud' },
  { id: 15, question: 'Which Prophet was sent to Thamud?', answer: 'Salih' },
  { id: 16, question: 'In which city was Muhammad ﷺ born?', answer: 'Makkah' },
  { id: 17, question: 'What was the name of his mother?', answer: 'Aminah' },
  { id: 18, question: 'What was the name of the cave of first revelation?', answer: 'Hira' },
  { id: 19, question: 'Which angel brought revelation?', answer: 'Jibreel' },
  { id: 20, question: 'What is the name of the migration to Madinah?', answer: 'Hijrah' },
  { id: 21, question: 'How many Prophets are mentioned in the Qur’an?', answer: '25' },
  { id: 22, question: 'What was the scripture given to Dawud?', answer: 'Zabur' },
  { id: 23, question: 'What was the name of the father of Yusuf?', answer: 'Yaqub' },
  { id: 24, question: 'What was the name of the wife of Ibrahim who was mother of Ismail?', answer: 'Hajar' },
  { id: 25, question: 'What is the name of the well in Makkah?', answer: 'Zamzam' },
]

const ROUND2_EN: HintQuestion[] = [
  {
    id: 1,
    hints: [
      'He was swallowed by a big fish.',
      'He left his people without Allah’s permission.',
      'He made dua in the darkness.',
      'His people later believed in his message.',
    ],
    answer: 'Yunus',
  },
  {
    id: 2,
    hints: [
      'He was thrown into a fire.',
      'The fire became cool for him.',
      'He is called Khalilullah.',
      'He rebuilt the Kaaba with his son.',
    ],
    answer: 'Ibrahim',
  },
  {
    id: 3,
    hints: [
      'He was sold by his brothers.',
      'He lived in Egypt.',
      'He could interpret dreams.',
      'He became a minister of a king.',
    ],
    answer: 'Yusuf',
  },
  {
    id: 4,
    hints: [
      'He received the Tawrat.',
      'His staff turned into a snake.',
      'He spoke to Allah on Mount Sinai.',
      'He led Bani Israel out of Egypt.',
    ],
    answer: 'Musa',
  },
  {
    id: 5,
    hints: [
      'He could speak to animals.',
      'He controlled the wind.',
      'He was both a king and a prophet.',
      'The Queen of Sheba visited him.',
    ],
    answer: 'Sulayman',
  },
  {
    id: 6,
    hints: [
      'He is the final Prophet.',
      'He was born in Makkah.',
      'The Qur’an was revealed to him.',
      'He migrated to Madinah.',
    ],
    answer: 'Muhammad ﷺ',
  },
]

const ROUND3_EN: TriviaQuestion[] = [
  { id: 1, question: 'Which Prophet was known for patience in illness?', answer: 'Ayyub' },
  { id: 2, question: 'Which Prophet’s people were destroyed by a flood?', answer: 'Nuh' },
  { id: 3, question: 'Which Prophet left his family in Makkah?', answer: 'Ibrahim' },
  { id: 4, question: 'Which Prophet helped build the Kaaba with his father?', answer: 'Ismail' },
  { id: 5, question: 'Which Prophet was ordered to sacrifice his son?', answer: 'Ibrahim' },
  { id: 6, question: 'Who was the brother of Musa?', answer: 'Harun' },
  { id: 7, question: 'Which tyrant opposed Musa?', answer: 'Pharaoh (Fir‘awn)' },
  { id: 8, question: 'Which Prophet defeated Jalut?', answer: 'Dawud' },
  { id: 9, question: 'Which Prophet was both king and Prophet after Dawud?', answer: 'Sulayman' },
  { id: 10, question: 'Which Prophet received the Injil?', answer: 'Isa' },
  { id: 11, question: 'Which Prophet warned against cheating in trade?', answer: 'Shu‘ayb' },
  { id: 12, question: 'Which Prophet was raised to the heavens?', answer: 'Isa' },
  { id: 13, question: 'Which Prophet spoke as a baby?', answer: 'Isa' },
  { id: 14, question: 'Which Prophet had a very beautiful voice?', answer: 'Dawud' },
  { id: 15, question: 'Which Prophet rebuilt the Kaaba?', answer: 'Ibrahim' },
  { id: 16, question: 'What was the first mosque built in Madinah?', answer: 'Masjid Quba' },
  { id: 17, question: 'What treaty was signed with Quraysh?', answer: 'Treaty of Hudaybiyyah' },
  { id: 18, question: 'What is the name of the night journey?', answer: 'Isra and Mi‘raj' },
  { id: 19, question: 'In which city did Muhammad ﷺ pass away?', answer: 'Madinah' },
  { id: 20, question: 'What is the final book revealed?', answer: 'The Qur’an' },
  { id: 21, question: 'What was the name of the year Muhammad ﷺ was born?', answer: 'The Year of the Elephant' },
  { id: 22, question: 'What tribe did Muhammad ﷺ belong to?', answer: 'Quraysh' },
  { id: 23, question: 'What was the name of the Prophet’s grandfather?', answer: 'Abdul Muttalib' },
  { id: 24, question: 'What was the name of the Prophet’s uncle who supported him?', answer: 'Abu Talib' },
  { id: 25, question: 'Who is the last Prophet?', answer: 'Muhammad ﷺ' },
]

export function getRound1Questions(_lang: Language): TriviaQuestion[] {
  return ROUND1_EN
}

export function getRound2HintQuestions(_lang: Language): HintQuestion[] {
  return ROUND2_EN
}

export function getRound3SpeedQuestions(_lang: Language): TriviaQuestion[] {
  return ROUND3_EN
}

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ku', label: 'کوردی' },
  { code: 'ar', label: 'العربية' },
]
