
const creer = {
  body: {
    nom: { required: false, type: 'string', maxLength: 120 },
    prenom: { required: false, type: 'string', maxLength: 120 },
    telephone: { required: false, type: 'string', maxLength: 30 },
    email: { required: false, type: 'string', maxLength: 200 },
  },
};

const modifier = {
  body: {
    nom: { required: false, type: 'string', maxLength: 120 },
    prenom: { required: false, type: 'string', maxLength: 120 },
    telephone: { required: false, type: 'string', maxLength: 30 },
    email: { required: false, type: 'string', maxLength: 200 },
  },
};

module.exports = { creer, modifier };
