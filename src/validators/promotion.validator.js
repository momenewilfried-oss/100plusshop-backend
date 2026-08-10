const creer = {
  body: {
    nom: { required: true, type: 'string', maxLength: 200 },
    type: { required: true, type: 'string', enum: ['pourcentage', 'montant'] },
    valeur: { required: true, type: 'number', min: 0.01, max: 100 },
    dateDebut: { required: false, type: 'string' },
    dateFin: { required: false, type: 'string' },
    date_debut: { required: false, type: 'string' },
    date_fin: { required: false, type: 'string' },
  },
};

const modifier = {
  body: {
    nom: { required: false, type: 'string', maxLength: 200 },
    type: { required: false, type: 'string', enum: ['pourcentage', 'montant'] },
    valeur: { required: false, type: 'number', min: 0.01, max: 100 },
    statut: { required: false, type: 'string' },
  },
};

module.exports = { creer, modifier };