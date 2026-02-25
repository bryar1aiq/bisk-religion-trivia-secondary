import type { Language } from './questions'

export interface DialogStrings {
  questionLabel: string
  correctAnswer: string
  doneNextStudent: string
  backKeepLater: string
  closingIn: string
  second: string
  seconds: string
  closeNow: string
  closeNowAria: string
  backKeepLaterAria: string
  noAnswer: string
  noQuestionPlaceholder: string
}

export const DIALOG_STRINGS: Record<Language, DialogStrings> = {
  en: {
    questionLabel: 'Question',
    correctAnswer: 'Correct answer',
    doneNextStudent: 'Done — next student',
    backKeepLater: 'Back (keep for later)',
    closingIn: 'Closing in',
    second: 'second',
    seconds: 'seconds',
    closeNow: 'Close now',
    closeNowAria: 'Close now',
    backKeepLaterAria: 'Back (keep for later)',
    noAnswer: '(No answer provided)',
    noQuestionPlaceholder: '(No question for this number)',
  },
  ku: {
    questionLabel: 'پرسیار',
    correctAnswer: 'وەڵامی ڕاست',
    doneNextStudent: 'تەواو — قوتابی داهاتوو',
    backKeepLater: 'گەڕانەوە (بۆ دواتر)',
    closingIn: 'داخستن لە',
    second: 'چرکە',
    seconds: 'چرکە',
    closeNow: 'ئێستا دابخە',
    closeNowAria: 'ئێستا دابخە',
    backKeepLaterAria: 'گەڕانەوە (بۆ دواتر)',
    noAnswer: '(وەڵام نەدراوە)',
    noQuestionPlaceholder: '(پرسیار بۆ ئەم ژمارەیە نییە)',
  },
  ar: {
    questionLabel: 'سؤال',
    correctAnswer: 'الجواب الصحيح',
    doneNextStudent: 'تم — الطالب التالي',
    backKeepLater: 'رجوع (احتفظ لاحقاً)',
    closingIn: 'يُغلق خلال',
    second: 'ثانية',
    seconds: 'ثوانٍ',
    closeNow: 'أغلق الآن',
    closeNowAria: 'أغلق الآن',
    backKeepLaterAria: 'رجوع (احتفظ لاحقاً)',
    noAnswer: '(لم يُقدم جواب)',
    noQuestionPlaceholder: '(لا يوجد سؤال لهذا الرقم)',
  },
}

export function getDialogStrings(lang: Language): DialogStrings {
  return DIALOG_STRINGS[lang]
}
