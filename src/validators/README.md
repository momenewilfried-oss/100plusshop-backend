Validators scaffolding

Place idiomatic validators in this folder and use `validateRequest(schema)` middleware
to attach validation to routes. Schemas are plain JS objects describing `body`,
`params` and `query` expected shapes. This scaffolding is intentionally simple and
non-intrusive — it does not change route wiring by itself.

Example usage in a route (non-activated):

const { validateRequest } = require('../validators/validateRequest');
const produitSchema = require('../validators/produit.validator');

router.post('/', validateRequest(produitSchema.create), creerProduit);

The middleware will throw a ValidationError (via `next(err)`) which is handled
by the global error handler.
