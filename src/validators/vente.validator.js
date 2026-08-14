const creer = {
  body: {
    idClient: { required: false, type: 'number' },
    clientLibre: { required: false, type: 'string', maxLength: 200 },
    remiseGlobale: { required: false, type: 'number' },
    modePaiementPrincipal: { required: true, type: 'string' },
    lignes: { required: true, type: 'array' },
  },
};

module.exports = { creer };
