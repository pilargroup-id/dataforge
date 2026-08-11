const dataforgeConfig = require('../config/dataforge.config');

function isITUser(user) {
  const departments = Array.isArray(user?.departments) ? user.departments : [];
  return departments.some(
    (department) => String(department?.code || '').toUpperCase() === dataforgeConfig.access.itDepartmentCode.toUpperCase()
  );
}

function getUserScopeContext(user) {
  const departments = Array.isArray(user?.departments) ? user.departments : [];
  const companies = Array.isArray(user?.companies) ? user.companies : [];

  return {
    userId: user?.id ? String(user.id) : null,
    departmentIds: departments
      .map((department) => department?.id)
      .filter((id) => id !== undefined && id !== null)
      .map(String),
    companyIds: companies
      .map((company) => company?.id)
      .filter(Boolean)
      .map(String),
  };
}

module.exports = {
  isITUser,
  getUserScopeContext,
};
