import { BrowserRouter } from 'react-router-dom';

import { PermissionsProvider } from '../context/PermissionsContext.jsx';
import AuthGate from './AuthGate.jsx';
import RouteConfig from './routeConfig.jsx';

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <AuthGate>
        <PermissionsProvider>
          <RouteConfig />
        </PermissionsProvider>
      </AuthGate>
    </BrowserRouter>
  );
}
