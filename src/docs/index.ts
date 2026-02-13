import YAML from 'yamljs'
import path from 'path'

// Use __dirname to get the current directory
const currentDir = process.cwd()
const docsPath = path.join(currentDir, 'src', 'docs')

// Load principal configuration
const swaggerConfig = YAML.load(path.join(docsPath, 'swagger.config.yml'))

// Load documentation
const authDoc = YAML.load(path.join(docsPath, 'auth.route.doc.yml'))
const cardDoc = YAML.load(path.join(docsPath, 'card.route.doc.yml'))
const deckDoc = YAML.load(path.join(docsPath, 'deck.route.doc.yml'))

export const swaggerDocument = {
  ...swaggerConfig,
  paths: {
    ...authDoc.paths,
    ...cardDoc.paths,
    ...deckDoc.paths,
  },
}
