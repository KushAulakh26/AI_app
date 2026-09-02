import { Route, Routes } from "react-router-dom"
import HomeRoute from "./pages/Home/index.tsx"
import ModelGenRoute from "./pages/ModelGen/index.tsx"
import LoginRoute from "./pages/Login/index.tsx"
import RegisterRoute from "./pages/Register/index.tsx"
import ForgotPasswordRoute from "./pages/ForgotPassword/index.tsx"
import ResetPasswordRoute from "./pages/ResetPassword/index.tsx"
import SceneRoute from "./pages/Scene/index.tsx"
import CopywritingRoute from "./pages/Copywriting/index.tsx"
import DetailRoute from "./pages/Detail/index.tsx"
import VideoRoute from "./pages/Video/index.tsx"
import ToolsRoute from "./pages/Tools/index.tsx"
import WorksRoute from "./pages/Works/index.tsx"
import SettingsRoute from "./pages/Settings/index.tsx"
import AdminRoute from "./pages/Admin/index.tsx"

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/model-gen" element={<ModelGenRoute />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/register" element={<RegisterRoute />} />
      <Route path="/forgot-password" element={<ForgotPasswordRoute />} />
      <Route path="/reset-password" element={<ResetPasswordRoute />} />
      <Route path="/scene" element={<SceneRoute />} />
      <Route path="/copywriting" element={<CopywritingRoute />} />
      <Route path="/detail" element={<DetailRoute />} />
      <Route path="/video" element={<VideoRoute />} />
      <Route path="/tools" element={<ToolsRoute />} />
      <Route path="/works" element={<WorksRoute />} />
      <Route path="/settings" element={<SettingsRoute />} />
      <Route path="/admin" element={<AdminRoute />} />
      <Route path="*" element={<HomeRoute />} />
    </Routes>
  )
}

export default App
