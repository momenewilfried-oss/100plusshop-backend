function autoriserRoles(...rolesAutorises) {
  return (req, res, next) => {
    const role = String(req.utilisateur?.role || '').toLowerCase();
    const ok = rolesAutorises.map((r) => String(r).toLowerCase()).includes(role);

    if (!req.utilisateur || !ok) {
      return res.status(403).json({
        message: 'Accès refusé pour ce rôle',
        role: req.utilisateur?.role || null,
        requis: rolesAutorises,
      });
    }
    next();
  };
}

module.exports = autoriserRoles;
