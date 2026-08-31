import { Navigate, Routes, Route } from 'react-router-dom';

import AppLayout from '../layouts/AppLayout';

import ExcelToJsonlPage from '../pages/convert/excel-to-jsonl/ExcelToJsonlPage.jsx';
import ExcelToPdfPage from '../pages/convert/excel-to-pdf/ExcelToPdfPage.jsx';
import ExcelToXmlPage from '../pages/convert/excel-to-xml/ExcelToXmlPage.jsx';
import MasterPermission from '../pages/master/MasterPermission.jsx';
import RequireModuleAccess from './RequireModuleAccess.jsx';

const DEFAULT_CONVERT_PATH = '/Convert/ExcelToJSONL';

export default function RouteConfig() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to={DEFAULT_CONVERT_PATH} replace />} />
        <Route path="Convert" element={<Navigate to={DEFAULT_CONVERT_PATH} replace />} />
        <Route path="Convert/ExcelToJSONL" element={<ExcelToJsonlPage />} />
        <Route path="Convert/ExcelToPDF" element={<ExcelToPdfPage />} />
        <Route path="Convert/ExcelToXML" element={<ExcelToXmlPage />} />
        <Route
          path="Master/UserPermission"
          element={
            <RequireModuleAccess moduleCode="ADMINISTRATION">
              <MasterPermission />
            </RequireModuleAccess>
          }
        />
        <Route path="*" element={<Navigate to={DEFAULT_CONVERT_PATH} replace />} />
      </Route>
    </Routes>
  );
}
