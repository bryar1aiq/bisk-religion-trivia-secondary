/**
 * Islamic Quiz Contest Format
 * - Round 1: numbered questions (25)
 * - Round 2: prophet guessing with 4 hints (6)
 * - Round 3: speed round question bank (24; max 12 per team)
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
  { id: 1, question: 'What was the name of the idol especially worshipped by the people of Prophet Nuh عليه السلام mentioned first in Surah Nuh (71:23)?', answer: 'Wadd' },
  { id: 2, question: 'Who made the calf for the people of Prophet Musa عليه السلام?', answer: 'Samiri' },
  { id: 3, question: 'What was the name of the well into which Prophet Yusuf عليه السلام was thrown (according to classical reports)?', answer: 'Ghayabah' },
  { id: 4, question: 'On which mountain did the Ark of Prophet Nuh عليه السلام rest?', answer: 'Judi' },
  { id: 5, question: 'What was the name of the town destroyed along with the people of Prophet Lut عليه السلام?', answer: 'Sodom' },
  { id: 6, question: 'What was the name of the righteous servant who met Prophet Musa عليه السلام (Surah Al-Kahf)?', answer: 'Khidr' },
  { id: 7, question: 'What was the name of the king who argued about Lordship with Prophet Ibrahim عليه السلام?', answer: 'Namrud' },
  { id: 8, question: 'What was the name of the queen who met Prophet Sulayman عليه السلام?', answer: 'Bilqis' },
  { id: 9, question: 'What was the name of the father of Prophet Ibrahim عليه السلام as mentioned in the Qur’an?', answer: 'Azar' },
  { id: 10, question: 'What was the name of the valley where Prophet Ibrahim عليه السلام left Hajar and Isma‘il?', answer: 'Bakkah' },
  { id: 11, question: 'What was the occupation of the prison companion of Prophet Yusuf عليه السلام who was executed?', answer: 'Baker' },
  { id: 12, question: 'What was the title of the tyrant ruler pursuing Prophet Musa عليه السلام?', answer: 'Firawn' },
  { id: 13, question: 'What was the name of the brother who assisted Prophet Musa عليه السلام?', answer: 'Harun' },
  { id: 14, question: 'What was the name of the son of Prophet Nuh عليه السلام who refused to board the Ark (according to tafsir)?', answer: 'Kan‘an' },
  { id: 15, question: 'What was the name of the mosque mentioned in the Night Journey of Prophet Muhammad ﷺ?', answer: 'Aqsa' },
  { id: 16, question: 'What was the name of the book revealed to Prophet Dawud عليه السلام?', answer: 'Zabur' },
  { id: 17, question: 'What was the name of the she-camel sent as a sign to the people of Prophet Salih عليه السلام?', answer: 'Naqah' },
  { id: 18, question: 'What was the name of the angel who brought revelation to Prophet Muhammad ﷺ?', answer: 'Jibril' },
  { id: 19, question: 'What was the name of the mother of Prophet Isa عليه السلام?', answer: 'Maryam' },
  { id: 20, question: 'What was the name of the tribe to which Prophet Hud عليه السلام was sent?', answer: "'Ad" },
  { id: 21, question: 'What was the name of the tribe to which Prophet Salih عليه السلام was sent?', answer: 'Thamud' },
  { id: 22, question: 'What was the name of the father of Prophet Yahya عليه السلام?', answer: 'Zakariyya' },
  { id: 23, question: 'What was the name of the mountain where Prophet Musa عليه السلام received the Torah?', answer: 'Tur' },
  { id: 24, question: 'Which prophet hosted the angels before they went to the people of Prophet Lut عليه السلام?', answer: 'Ibrahim' },
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
