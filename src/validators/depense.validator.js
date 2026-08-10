const CATEGORIES = ['loyer', 'salaires', 'fournitures', 'marketing', 'transport', 'autre'];

const creer = {
  body: {
    libelle: { required: true, type: 'string', maxLength: 200 },
    categorie: { required: false, type: 'string', maxLength: 50, enum: CATEGORIES },
    montant: { required: true, type: 'number', min: 0.01 },
    dateDepense: { required: false, type: 'string', maxLength: 40 },
  },
};

const modifier = {
  body: {
    libelle: { required: false, type: 'string', maxLength: 200 },
    categorie: { required: false, type: 'string', maxLength: 50, enum: CATEGORIES },
    montant: { required: false, type: 'number', min: 0.01 },
    dateDepense: { required: false, type: 'string', maxLength: 40 },
  },
};

module.exports = { creer, modifier, CATEGORIES };