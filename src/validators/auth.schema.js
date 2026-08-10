const register = {
  body: {
    nom: { required: true, type: 'string', maxLength: 120 },
    prenom: { required: true, type: 'string', maxLength: 120 },
    email: { required: true, type: 'string', maxLength: 200 },
    motDePasse: { required: true, type: 'string', maxLength: 200 },
    telephone: { required: false, type: 'string', maxLength: 30 },
  },
};

const login = {
  body: {
    email: { required: true, type: 'string' },
    motDePasse: { required: true, type: 'string' },
    remember: { required: false },
    resterConnecte: { required: false },
  },
};

module.exports = { register, login };