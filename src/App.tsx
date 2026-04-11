import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { AppDataProvider } from '@/contexts/AppDataContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AdminRoute } from '@/components/auth/AdminRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { MoradoresPage } from '@/pages/MoradoresPage'
import { QuotasPage } from '@/pages/QuotasPage'
import { OcorrenciasPage } from '@/pages/OcorrenciasPage'
import { ComunicadosPage } from '@/pages/ComunicadosPage'
import { DocumentosPage } from '@/pages/DocumentosPage'
import { ContabilidadePage } from '@/pages/ContabilidadePage'
import { ManutencoesPage } from '@/pages/ManutencoesPage'

function App() {
  return (
    <AuthProvider>
    <AppDataProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminRoute><DashboardPage /></AdminRoute>} />
            <Route path="moradores" element={<AdminRoute><MoradoresPage /></AdminRoute>} />
            <Route path="quotas" element={<QuotasPage />} />
            <Route path="ocorrencias" element={<OcorrenciasPage />} />
            <Route path="comunicados" element={<ComunicadosPage />} />
            <Route path="documentos" element={<DocumentosPage />} />
            <Route path="contabilidade" element={<ContabilidadePage />} />
            <Route path="manutencoes" element={<ManutencoesPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppDataProvider>
    </AuthProvider>
  )
}

export default App
