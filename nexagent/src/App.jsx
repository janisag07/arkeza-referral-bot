import { useHashRoute } from './hooks.js'
import {
  Nav, Hero, TrustBar, Systems, Pipeline, RoiCalc,
  Process, Pricing, Faq, Contact, Footer,
} from './sections.jsx'
import { Chat } from './chat.jsx'
import { Dashboard } from './dashboard.jsx'
import { Impressum, Datenschutz } from './legal.jsx'

export default function App() {
  const route = useHashRoute()

  if (route === 'intern') return <Dashboard />
  if (route === 'impressum') return <Impressum />
  if (route === 'datenschutz') return <Datenschutz />

  return (
    <>
      <Nav />
      <main>
        <Hero />
        <TrustBar />
        <Systems />
        <Pipeline />
        <RoiCalc />
        <Process />
        <Pricing />
        <Faq />
        <Contact />
      </main>
      <Footer />
      <Chat />
    </>
  )
}
