const { Pool } = require("pg");

const pool = new Pool({
	user: "postgres",
	host: "localhost",
	database: "pelis_app",
	password: "29930427",
	port: 5432,
});

module.exports = pool;
