/**
 * Tenant Scoping Middleware
 * Automatically injects tenant_id into all queries via req.tenantId
 * This ensures complete data isolation between tenants
 */
function tenantMiddleware(req, res, next) {
  if (!req.user || !req.user.tenantId) {
    return res.status(403).json({ error: 'Tenant context not found.' });
  }

  req.tenantId = req.user.tenantId;
  next();
}

module.exports = tenantMiddleware;
