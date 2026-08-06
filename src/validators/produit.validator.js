const create = {
  body: {
    reference: { required: true, type: 'string', maxLength: 80 },
    nom: { required: true, type: 'string', maxLength: 200, minLength: 1 },
    description: { required: false, type: 'string', maxLength: 2000 },
    prixVente: { required: true, type: 'number', min: 0.01 },
    prixAchat: { required: false, type: 'number', min: 0 },
  },
};

const update = {
  body: {
    nom: { required: false, type: 'string', maxLength: 200, minLength: 1 },
    description: { required: false, type: 'string', maxLength: 2000 },
    prixVente: { required: false, type: 'number', min: 0.01 },
    prixAchat: { required: false, type: 'number', min: 0 },
  },
};

const createVariante = {
  body: {
    taille: { required: false, type: 'string', maxLength: 50 },
    couleur: { required: false, type: 'string', maxLength: 50 },
    stock: { required: false, type: 'number', min: 0 },
    prixVente: { required: false, type: 'number', min: 0.01 },
    prixAchat: { required: false, type: 'number', min: 0 },
  },
};

module.exports = { create, update, createVariante };