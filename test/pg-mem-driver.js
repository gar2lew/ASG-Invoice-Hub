const { newDb } = require('pg-mem');

const mem = newDb();
module.exports = mem.adapters.createPg();
