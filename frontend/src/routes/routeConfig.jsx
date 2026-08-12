import { Routes, Route } from 'react-router-dom';

import AppLayout from '../layouts/AppLayout';

import ChartTemplatePage from '../pages/ChartTemplatePage.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import TableTemplatePage from '../pages/TableTemplatePage.jsx';

// pages
import Page1 from '../pages/page1/Page1.jsx';
import Page2 from '../pages/page2/Page2.jsx';
import Page3 from '../pages/page3/Page3.jsx';

import IconsPage from '../pages/icons/IconsPage.jsx';
import FormsPage from '../pages/forms/FormsPage.jsx';

export default function RouteConfig() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Page1 />} />
        <Route path="Menu1" element={<Page1 />} />
        <Route path="Page1" element={<Page1 />} />
        <Route path="Page2" element={<Page2 />} />
        <Route path="Page3" element={<Page3 />} />
        <Route path="Table" element={<TableTemplatePage />} />
        <Route path="Table" element={<TableTemplatePage />} />
        <Route path="TableActions" element={<TableTemplatePage />} />
        <Route path="users" element={<TableTemplatePage />} />
        <Route path="Chart" element={<ChartTemplatePage />} />
        <Route path="forms" element={<FormsPage />} />
        <Route path="Forms" element={<FormsPage />} />
        <Route path="icons" element={<IconsPage />} />
        <Route path="*" element={<DashboardPage />} />
      </Route>
    </Routes>
  );
}
