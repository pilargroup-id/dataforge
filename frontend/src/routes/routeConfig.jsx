import { Routes, Route } from 'react-router-dom';

import AppLayout from '../layouts/AppLayout';

import ConvertPage from '../pages/convert/ConvertPage.jsx';
import MasterPermission from '../pages/master/MasterPermission.jsx';

export default function RouteConfig() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<ConvertPage />} />
        <Route path="Convert" element={<ConvertPage />} />
        <Route path="Master/UserPermission" element={<MasterPermission />} />
        <Route path="*" element={<ConvertPage />} />
      </Route>
    </Routes>
  );
}
