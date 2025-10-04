// Utilidades simples de TTS usando Web Speech API.
// No rompe en móviles/PC sin soporte: devuelve false y listo.

export function hasTTS(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function loadVoicesReady(): Promise<SpeechSynthesisVoice[]> {
  return new Promise(resolve => {
    if (!hasTTS()) return resolve([])
    const voices = window.speechSynthesis.getVoices()
    if (voices.length) return resolve(voices)
    window.speechSynthesis.onvoiceschanged = () =>
      resolve(window.speechSynthesis.getVoices())
  })
}

export function pickEnglishVoice(
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  if (!voices.length) return null
  const en = voices.filter(v => v.lang.toLowerCase().startsWith('en'))
  return (
    en.find(v => /en-GB|UK|British/i.test(v.name + v.lang)) ||
    en.find(v => /en-US|US|American/i.test(v.name + v.lang)) ||
    en[0] ||
    voices[0]
  )
}

export function speak(
  text: string,
  voice?: SpeechSynthesisVoice | null,
  opts?: { rate?: number; pitch?: number }
): boolean {
  if (!hasTTS() || !text?.trim()) return false
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  if (voice) u.voice = voice
  u.rate = opts?.rate ?? 1
  u.pitch = opts?.pitch ?? 1
  window.speechSynthesis.speak(u)
  return true
}

export function stop() {
  if (hasTTS()) window.speechSynthesis.cancel()
}
