import { Routes, Route } from 'react-router-dom';

import AppLayout from '../layouts/AppLayout';

import ConvertPage from '../pages/convert/ConvertPage.jsx';
import MasterPermission from '../pages/master/MasterPermission.jsx';
import RequireModuleAccess from './RequireModuleAccess.jsx';

export default function RouteConfig() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<ConvertPage />} />
        <Route path="Convert" element={<ConvertPage />} />
        <Route
          path="Master/UserPermission"
          element={
            <RequireModuleAccess moduleCode="ADMINISTRATION">
              <MasterPermission />
            </RequireModuleAccess>
          }
        />
        <Route path="*" element={<ConvertPage />} />
      </Route>
    </Routes>
  );
}
