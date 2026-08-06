
const creer = {
  body: {
    libelle: { required: true, type: 'string', maxLength: 200 },
    categorie: { required: false, type: 'string', maxLength: 50 },
    montant: { required: true, type: 'number' },
  },
};

const modifier = {
  body: {
    libelle: { required: false, type: 'string', maxLength: 200 },
    categorie: { required: false, type: 'string', maxLength: 50 },
    montant: { required: false, type: 'number' },
  },
};

module.exports = { creer, modifier };
