import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { GardeAnimateur } from './auth/GardeAnimateur'
import { Layout } from './components/Layout'
import { Accueil } from './pages/Accueil'
import { Connexion } from './pages/Connexion'
import { EditeurExercice } from './pages/EditeurExercice'
import { Exercices } from './pages/Exercices'

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
                  <Navigate to="/animateur/exercices" replace />
                </GardeAnimateur>
              }
            />
            <Route
              path="/animateur/exercices"
              element={
                <GardeAnimateur>
                  <Exercices />
                </GardeAnimateur>
              }
            />
            <Route
              path="/animateur/exercices/:id"
              element={
                <GardeAnimateur>
                  <EditeurExercice />
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
