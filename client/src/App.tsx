import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LoginPage } from "@/pages/LoginPage";
import { SignUpPage } from "@/pages/SignUpPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { AnalysisPage } from "@/pages/AnalysisPage";
import { ChatPage } from "@/pages/ChatPage";
import { MockDefensePage } from "@/pages/MockDefensePage";
import { RecommendationsPage } from "@/pages/RecommendationsPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analysis/:manuscriptId"
            element={
              <ProtectedRoute>
                <AnalysisPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:manuscriptId"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mock-defense/:manuscriptId"
            element={
              <ProtectedRoute>
                <MockDefensePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recommendations/:manuscriptId"
            element={
              <ProtectedRoute>
                <RecommendationsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
