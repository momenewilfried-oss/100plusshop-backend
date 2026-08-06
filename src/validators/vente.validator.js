const creer = {
  body: {
    // Client optionnel : vente anonyme autorisée (id_client NULL en base)
    idClient: { required: false, type: 'number' },
    remiseGlobale: { required: false, type: 'number' },
    modePaiementPrincipal: { required: true, type: 'string' },
    lignes: { required: true, type: 'array' },
  },
};

module.exports = { creer };