const express = require("express");
const pool = require("../config/db");
const axios = require("axios");
const router = express.Router();

router.get("/search", async (req, res) => {
	const { name, category, releaseDate, rating, sortBy } = req.query;

	let query = "SELECT * FROM movies WHERE 1=1";
	const queryParams = [];

	if (name) {
		queryParams.push(`%${name}%`);
		query += ` AND title ILIKE $${queryParams.length}`;
	}

	if (category) {
		queryParams.push(category);
		query += ` AND category = $${queryParams.length}`;
	}

	if (releaseDate) {
		queryParams.push(releaseDate);
		query += ` AND release_date = $${queryParams.length}`;
	}

	if (rating) {
		queryParams.push(rating);
		query += ` AND rating = $${queryParams.length}`;
	}

	if (sortBy) {
		if (sortBy === "rating") {
			query += " ORDER BY rating DESC";
		} else if (sortBy === "releaseDate") {
			query += " ORDER BY release_date DESC";
		}
	}

	try {
		const localResults = await pool.query(query, queryParams);

		if (localResults.rows.length > 0) {
			res.json(localResults.rows);
		} else {
			const externalResponse = await axios.get("https://api.themoviedb.org/3/search/movie", {
				params: {
					api_key: "lysda1234",
					query: name || "",
					with_genres: category || "",
					primary_release_year: releaseDate || "",
				},
			});

			const externalResults = externalResponse.data.results;

			for (const movie of externalResults) {
				await pool.query(
					`INSERT INTO movies (title, category, release_date, rating) 
					VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
					[movie.title, category, movie.release_date, movie.vote_average]
				);
			}

			res.json(externalResults);
		}
	} catch (error) {
		res.status(500).json({ error: "Error fetching movies" });
	}
});

module.exports = router;
