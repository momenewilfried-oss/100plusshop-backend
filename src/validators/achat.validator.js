const creer = {
  body: {
    idFournisseur: { required: true, type: 'number' },
    lignes: { required: true, type: 'array' },
    // montantTotal calculé côté serveur — ne pas exiger
    montantTotal: { required: false, type: 'number' },
  },
};

module.exports = { creer };