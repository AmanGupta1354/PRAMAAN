import { Navigate, Route, Routes } from 'react-router-dom'
import { Guard, Shell } from './components/Shell'
import Landing from './pages/Landing'
import Login from './pages/auth/Login'
import PublicVerify from './pages/public/PublicVerify'
import InstDashboard from './pages/institution/Dashboard'
import AppList from './pages/institution/AppList'
import NewApplication from './pages/institution/NewApplication'
import AppDetail from './pages/institution/AppDetail'
import VerifyPipeline from './pages/institution/VerifyPipeline'
import Proofs from './pages/institution/Proofs'
import Notifications from './pages/institution/Notifications'
import OfficerDashboard from './pages/officer/Dashboard'
import Queue from './pages/officer/Queue'
import Review from './pages/officer/Review'
import Planner from './pages/officer/Planner'
import AuditLog from './pages/admin/AuditLog'
import Rulesets from './pages/admin/Rulesets'
import Checklists from './pages/admin/Checklists'
import UsersPage from './pages/admin/Users'
import Sources from './pages/admin/Sources'
import Accuracy from './pages/admin/Accuracy'
import DemoData from './pages/admin/DemoData'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/verify" element={<PublicVerify />} />
      <Route path="/verify/:proofId" element={<PublicVerify />} />

      <Route element={<Guard roles={['institution']} />}>
        <Route path="/institution" element={<Shell area="institution" />}>
          <Route index element={<InstDashboard />} />
          <Route path="applications" element={<AppList />} />
          <Route path="applications/new" element={<NewApplication />} />
          <Route path="applications/:id" element={<AppDetail />} />
          <Route path="applications/:id/verify" element={<VerifyPipeline />} />
          <Route path="proofs" element={<Proofs />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>
      </Route>

      <Route element={<Guard roles={['scrutiny', 'senior', 'admin', 'auditor']} />}>
        <Route path="/officer" element={<Shell area="officer" />}>
          <Route index element={<Guard roles={['scrutiny', 'senior', 'admin']}><OfficerDashboard /></Guard>} />
          <Route path="queue" element={<Queue />} />
          <Route path="review/:id" element={<Review />} />
          <Route path="planner" element={<Guard roles={['scrutiny', 'senior', 'admin']}><Planner /></Guard>} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="admin/rulesets" element={<Guard roles={['admin']}><Rulesets /></Guard>} />
          <Route path="admin/checklists" element={<Guard roles={['admin']}><Checklists /></Guard>} />
          <Route path="admin/users" element={<Guard roles={['admin']}><UsersPage /></Guard>} />
          <Route path="admin/sources" element={<Guard roles={['admin']}><Sources /></Guard>} />
          <Route path="admin/accuracy" element={<Guard roles={['admin']}><Accuracy /></Guard>} />
          <Route path="admin/demo" element={<Guard roles={['admin']}><DemoData /></Guard>} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
