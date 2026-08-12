import { BrowserRouter } from 'react-router-dom';

import RouteConfig from './routeConfig.jsx';

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <RouteConfig />
    </BrowserRouter>
  );
}
