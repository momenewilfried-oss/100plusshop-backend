const { ApiError } = require('./error-handler');

class ValidationError extends ApiError {
  constructor(details) {
    super(400, 'Validation échouée', details || null);
  }
}

class AuthenticationError extends ApiError {
  constructor(message = 'Authentification requise') {
    super(401, message);
  }
}

class AuthorizationError extends ApiError {
  constructor(message = 'Accès refusé') {
    super(403, message);
  }
}

class NotFoundError extends ApiError {
  constructor(message = 'Ressource introuvable') {
    super(404, message);
  }
}

class ConflictError extends ApiError {
  constructor(message = 'Conflit') {
    super(409, message);
  }
}

class BusinessError extends ApiError {
  constructor(message = 'Erreur métier') {
    super(422, message);
  }
}

class DatabaseError extends ApiError {
  constructor(message = 'Erreur base de données') {
    super(500, message);
  }
}

module.exports = {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessError,
  DatabaseError,
};
