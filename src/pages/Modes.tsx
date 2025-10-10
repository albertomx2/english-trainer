import { Link } from 'react-router-dom'

export default function Modes() {
  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Modos</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <ModeCard title="Flashcards (SRS)" to="/study?mode=flashcards" desc="Repaso espaciado con Fácil/Medio/Difícil." />
        <ModeCard title="Type-it" to="/study?mode=typeit" desc="Escribe la palabra/definición. Tolerancia a typos." />
        <ModeCard title="Cloze" to="/study?mode=cloze" desc="Completa la frase del ejemplo." />
        <ModeCard title="Rapid Fire" to="/study?mode=rapid" desc="Respuestas rápidas 30/60s." />
        <ModeCard title="Use-it (IA)" to="/study?mode=useit" desc="Escribe una frase y te doy feedback." />
        {/* NUEVO */}
        <ModeCard title="Reading (IA)" to="/study?mode=reading" desc="Genera un texto con tus palabras y 5 preguntas tipo test." />
        <ModeCard title="Listening (IA/YouTube)" to="/study?mode=listen" desc="Escucha y responde. IA o vídeo de YouTube." />
        <ModeCard title="Añadir palabra" to="/add-word" desc="Crea palabras nuevas (IA opcional para completar campos)." />
      </div>
    </div>
  )
}

function ModeCard({ title, desc, to }: { title: string; desc: string; to: string }) {
  return (
    <Link to={to} className="block border rounded-xl p-4 hover:bg-gray-50">
      <div className="font-medium">{title}</div>
      <div className="text-sm text-gray-600">{desc}</div>
    </Link>
  )
}
