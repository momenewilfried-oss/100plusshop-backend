const creer = {
  body: {
    nom: { required: true, type: 'string', maxLength: 120 },
    prenom: { required: true, type: 'string', maxLength: 120 },
    email: { required: true, type: 'string', maxLength: 200, format: 'email' },
    motDePasse: { required: true, type: 'string', minLength: 8, maxLength: 200 },
    idRole: { required: true, type: 'number' },
    telephone: { required: false, type: 'string', maxLength: 30 },
  },
};

const modifier = {
  body: {
    nom: { required: false, type: 'string', maxLength: 120 },
    prenom: { required: false, type: 'string', maxLength: 120 },
    telephone: { required: false, type: 'string', maxLength: 30 },
    idRole: { required: false, type: 'number' },
    statut: { required: false, type: 'string', enum: ['actif', 'inactif', 'supprime'] },
    motDePasse: { required: false, type: 'string', minLength: 8, maxLength: 200 },
    email: { required: false, type: 'string', maxLength: 200, format: 'email' },
  },
};

module.exports = { creer, modifier };