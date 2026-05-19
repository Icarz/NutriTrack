import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClientNew from './pages/ClientNew';
import ClientEdit from './pages/ClientEdit';
import ClientDetail from './pages/ClientDetail';
import DietPlan from './pages/DietPlan';
import ProgressLog from './pages/ProgressLog';
import AdminPanel from './pages/AdminPanel';

function Protected({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/clients/new" element={<Protected><ClientNew /></Protected>} />
        <Route path="/clients/:id/edit" element={<Protected><ClientEdit /></Protected>} />
        <Route path="/clients/:id" element={<Protected><ClientDetail /></Protected>} />
        <Route path="/clients/:id/plan/new" element={<Protected><DietPlan /></Protected>} />
        <Route path="/clients/:id/plan/:planId" element={<Protected><DietPlan /></Protected>} />
        <Route path="/clients/:id/log" element={<Protected><ProgressLog /></Protected>} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
