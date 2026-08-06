
const mouvement = {
  body: {
    idVariante: { required: true, type: 'number' },
    typeMouvement: { required: true, type: 'string', enum: ['entree', 'sortie', 'ajustement'] },
    quantite: { required: true, type: 'number' },
    motif: { required: false, type: 'string', maxLength: 300 },
  },
};

module.exports = { mouvement };
