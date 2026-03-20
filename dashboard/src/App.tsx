import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route
                path="/"
                element={
                  <div className="p-8">
                    <h1 className="text-2xl font-bold">Dashboard</h1>
                    <p className="text-slate-500">Coming in Task 3...</p>
                  </div>
                }
              />
              <Route
                path="/incidents"
                element={<div className="p-8">Incidents page placeholder</div>}
              />
              <Route
                path="/personnel"
                element={<div className="p-8">Personnel page placeholder</div>}
              />
              <Route
                path="/shifts"
                element={<div className="p-8">Shifts page placeholder</div>}
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
