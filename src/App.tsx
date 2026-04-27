import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { AppDataProvider } from '@/contexts/AppDataContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RoleRoute } from '@/components/auth/RoleRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
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
    <BrowserRouter>
      <AuthProvider>
        <AppDataProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<RoleRoute allowedRoles={['admin', 'morador', 'inquilino']}><DashboardPage /></RoleRoute>} />
              <Route path="moradores" element={<RoleRoute allowedRoles={['admin']}><MoradoresPage /></RoleRoute>} />
              <Route path="quotas" element={<RoleRoute allowedRoles={['admin', 'morador']}><QuotasPage /></RoleRoute>} />
              <Route path="ocorrencias" element={<RoleRoute allowedRoles={['admin', 'morador', 'inquilino']}><OcorrenciasPage /></RoleRoute>} />
              <Route path="comunicados" element={<RoleRoute allowedRoles={['admin', 'morador', 'inquilino']}><ComunicadosPage /></RoleRoute>} />
              <Route path="documentos" element={<RoleRoute allowedRoles={['admin', 'morador']}><DocumentosPage /></RoleRoute>} />
              <Route path="contabilidade" element={<RoleRoute allowedRoles={['admin', 'morador']}><ContabilidadePage /></RoleRoute>} />
              <Route path="manutencoes" element={<RoleRoute allowedRoles={['admin', 'morador', 'inquilino']}><ManutencoesPage /></RoleRoute>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppDataProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
