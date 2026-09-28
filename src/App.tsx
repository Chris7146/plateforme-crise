import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { GardeAnimateur } from './auth/GardeAnimateur'
import { Layout } from './components/Layout'
import { Accueil } from './pages/Accueil'
import { CodesEquipes } from './pages/CodesEquipes'
import { Connexion } from './pages/Connexion'
import { EditeurExercice } from './pages/EditeurExercice'
import { Exercices } from './pages/Exercices'
import { Participant } from './pages/Participant'
import { SessionDetail } from './pages/SessionDetail'
import { Sessions } from './pages/Sessions'

/** Route animateur : la garde vérifie le rôle en base, jamais l'interface seule. */
function Animateur({ children }: { children: React.ReactNode }) {
  return <GardeAnimateur>{children}</GardeAnimateur>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Accueil />} />
            <Route path="/connexion" element={<Connexion />} />
            <Route path="/participant/:id" element={<Participant />} />

            <Route
              path="/animateur"
              element={<Animateur><Navigate to="/animateur/sessions" replace /></Animateur>}
            />
            <Route
              path="/animateur/exercices"
              element={<Animateur><Exercices /></Animateur>}
            />
            <Route
              path="/animateur/exercices/:id"
              element={<Animateur><EditeurExercice /></Animateur>}
            />
            <Route
              path="/animateur/sessions"
              element={<Animateur><Sessions /></Animateur>}
            />
            <Route
              path="/animateur/sessions/:id"
              element={<Animateur><SessionDetail /></Animateur>}
            />
            <Route
              path="/animateur/sessions/:id/codes"
              element={<Animateur><CodesEquipes /></Animateur>}
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  )
}
