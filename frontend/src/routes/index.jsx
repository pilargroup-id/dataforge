import { BrowserRouter } from 'react-router-dom';

import { PermissionsProvider } from '../context/PermissionsContext.jsx';
import RouteConfig from './routeConfig.jsx';

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <PermissionsProvider>
        <RouteConfig />
      </PermissionsProvider>
    </BrowserRouter>
  );
}
