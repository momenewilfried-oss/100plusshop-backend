const creer = {
  body: {
    idClient: { required: true, type: 'number' },
    remiseGlobale: { required: false, type: 'number' },
    modePaiementPrincipal: { required: true, type: 'string' },
    lignes: { required: true, type: 'array' },
  },
};

module.exports = { creer };