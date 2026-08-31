import { Navigate } from 'react-router-dom';

import { usePermissions } from '../context/PermissionsContext.jsx';

export default function RequireModuleAccess({ moduleCode, children }) {
  const { loading, hasModule } = usePermissions();

  if (loading) {
    return null;
  }

  if (!hasModule(moduleCode)) {
    return <Navigate to="/Convert/ExcelToJSONL" replace />;
  }

  return children;
}
