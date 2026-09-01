import { Navigate } from 'react-router-dom';

import { usePermissions } from '../context/PermissionsContext.jsx';

export default function RequireIT({ children }) {
  const { loading, isIT } = usePermissions();

  if (loading) {
    return null;
  }

  if (!isIT) {
    return <Navigate to="/Convert/ExcelToJSONL" replace />;
  }

  return children;
}
