require('dotenv').config({ quiet: true })
const { init, seed } = require('./db')

init()
seed()
console.log('Database seeded')
