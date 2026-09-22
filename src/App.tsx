import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { GardeAnimateur } from './auth/GardeAnimateur'
import { Layout } from './components/Layout'
import { Accueil } from './pages/Accueil'
import { Connexion } from './pages/Connexion'
import { Animateur } from './pages/Animateur'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Accueil />} />
            <Route path="/connexion" element={<Connexion />} />
            <Route
              path="/animateur"
              element={
                <GardeAnimateur>
                  <Animateur />
                </GardeAnimateur>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  )
}
