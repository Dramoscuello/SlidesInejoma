import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomeStudent from './pages/HomeStudent';
import LoginAdmin from './pages/LoginAdmin';
import GradeManagement from './pages/GradeManagement';
import PresenterMode from './pages/PresenterMode';
import StudentProjection from './pages/StudentProjection';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomeStudent />} />
        <Route path="/student/:code" element={<StudentProjection />} />
        <Route path="/login" element={<LoginAdmin />} />

        {/* Protected Admin Routes */}
        <Route
          path="/admin/grades"
          element={
            <ProtectedRoute>
              <GradeManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/presenter/:presentationId"
          element={
            <ProtectedRoute>
              <PresenterMode />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
