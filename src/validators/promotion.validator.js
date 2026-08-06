
const creer = {
  body: {
    nom: { required: true, type: 'string', maxLength: 200 },
    type: { required: true, type: 'string', enum: ['pourcentage', 'montant'] },
    valeur: { required: true, type: 'number' },
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
    valeur: { required: false, type: 'number' },
    statut: { required: false, type: 'string' },
  },
};

module.exports = { creer, modifier };
