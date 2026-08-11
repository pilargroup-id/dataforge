const R = require('../utils/response.util');
const PermissionService = require('../services/permission.service');
const ConverterRegistry = require('../converters/converter.registry');
const dataforgeConfig = require('../config/dataforge.config');
const { isPastTimeToday } = require('../utils/date.util');

async function requireSupportedConversionAndPermission(req, res, next) {
  try {
    const source = String(req.params.sourceFormat || '').toUpperCase();
    const target = String(req.params.targetFormat || '').toUpperCase();
    const converter = ConverterRegistry.resolve(source, target);

    if (!converter) {
      return R.badRequest(res, 'The requested conversion format is not supported', {
        code: 'CONVERSION_NOT_SUPPORTED',
        source_format: source,
        target_format: target,
      });
    }

    if (isPastTimeToday(dataforgeConfig.expiry.lastConversionStart)) {
      return R.badRequest(res, 'New conversion batches are closed for today', {
        code: 'DAILY_CONVERSION_CLOSED',
        last_conversion_start_time: dataforgeConfig.expiry.lastConversionStart,
      });
    }

    const submodule = converter.permissionCode;
    const permission = await PermissionService.hasPermission(req.user, 'CONVERT', submodule);
    if (!permission.allowed) {
      return R.forbidden(res, 'Permission denied', {
        code: 'PERMISSION_DENIED',
        module: 'CONVERT',
        submodule,
      });
    }

    req.converter = converter;
    req.conversionPermission = permission;
    req.sourceFormat = source;
    req.targetFormat = target;
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { requireSupportedConversionAndPermission };
