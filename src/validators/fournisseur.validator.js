const creer = {
  body: {
    nom: { required: true, type: 'string', maxLength: 200 },
    contact: { required: false, type: 'string', maxLength: 120 },
    email: { required: false, type: 'string', maxLength: 200, format: 'email' },
    telephone: { required: false, type: 'string', maxLength: 30 },
    adresse: { required: false, type: 'string', maxLength: 300 },
  },
};

const modifier = {
  body: {
    nom: { required: false, type: 'string', maxLength: 200 },
    contact: { required: false, type: 'string', maxLength: 120 },
    email: { required: false, type: 'string', maxLength: 200, format: 'email' },
    telephone: { required: false, type: 'string', maxLength: 30 },
    adresse: { required: false, type: 'string', maxLength: 300 },
  },
};

module.exports = { creer, modifier };