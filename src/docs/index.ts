import YAML from 'yamljs'
import path from 'path'
import {fileURLToPath} from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load main config
const swaggerConfig = YAML.load(path.join(__dirname, 'swagger.config.yml'))

// Load all docs
const authDoc = YAML.load(path.join(__dirname, 'auth.route.doc.yml'))
const cardDoc = YAML.load(path.join(__dirname, 'card.route.doc.yml'))
const deckDoc = YAML.load(path.join(__dirname, 'deck.route.doc.yml')) 

// Fusion all paths
export const swaggerDocument = {
    ...swaggerConfig,
    paths: {
        ...authDoc.paths,
        ...cardDoc.paths,
        ...deckDoc.paths
    }
}