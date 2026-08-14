const creer = {
  body: {
    nom: { required: true, type: 'string', maxLength: 100, minLength: 1 },
    description: { required: false, type: 'string', maxLength: 2000 },
  },
};

module.exports = { creer };
