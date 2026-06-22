import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Recommendations from './pages/Recommendations';
import UrgentAlerts from './pages/UrgentAlerts';
import RiskDashboard from './pages/RiskDashboard';
import News from './pages/News';
import MarketCausality from './pages/MarketCausality';
import EmergingCompanies from './pages/EmergingCompanies';
import CompanyAnalysis from './pages/CompanyAnalysis';
import AssetClasses from './pages/AssetClasses';
import AgentControlCenter from './pages/AgentControlCenter';
import Alerts from './pages/Alerts';
import Assistant from './pages/Assistant';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/recommendations" element={<Recommendations />} />
        <Route path="/urgent-alerts" element={<UrgentAlerts />} />
        <Route path="/risk" element={<RiskDashboard />} />
        <Route path="/news" element={<News />} />
        <Route path="/causality" element={<MarketCausality />} />
        <Route path="/emerging" element={<EmergingCompanies />} />
        <Route path="/company" element={<CompanyAnalysis />} />
        <Route path="/company/:id" element={<CompanyAnalysis />} />
        <Route path="/assets" element={<AssetClasses />} />
        <Route path="/agents" element={<AgentControlCenter />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
