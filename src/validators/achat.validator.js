const creer = {
  body: {
    idFournisseur: { required: true, type: 'number' },
    lignes: { required: true, type: 'array' },
    montantTotal: { required: true, type: 'number' },
  },
};

module.exports = { creer };