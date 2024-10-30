const express = require("express");
const pool = require("../config/db");
const router = express.Router();

// Crear comentario
router.post("/create", async (req, res) => {
	const { user_id, movie_id, comment, rating } = req.body;

	if (!comment || comment.trim().length === 0) {
		return res.status(400).json({ error: "Comment cannot be empty." });
	}

	if (comment.length > 300) {
		return res.status(400).json({ error: "Comment cannot exceed 300 characters." });
	}

	if (rating < 0 || rating > 10) {
		return res.status(400).json({ error: "Rating must be between 0 and 10." });
	}

	try {
		const result = await pool.query("INSERT INTO comments (user_id, movie_id, comment, rating) VALUES ($1, $2, $3, $4) RETURNING *", [user_id, movie_id, comment, rating]);
		const newComment = result.rows[0];
		res.status(201).json({ message: "Comment created", comment: newComment });
	} catch (error) {
		res.status(500).json({ error: "Error creating comment" });
	}
});

// Leer todos los comentarios de una película
router.get("/movie/:movie_id", async (req, res) => {
	const { movie_id } = req.params;
	try {
		const result = await pool.query("SELECT * FROM comments WHERE movie_id = $1", [movie_id]);
		res.json(result.rows);
	} catch (error) {
		res.status(500).json({ error: "Error fetching comments" });
	}
});

// Actualizar comentario
router.put("/update/:comment_id", async (req, res) => {
	const { comment_id } = req.params;
	const { comment, rating } = req.body;

	if (!comment || comment.trim().length === 0) {
		return res.status(400).json({ error: "Comment cannot be empty." });
	}

	if (comment.length > 300) {
		return res.status(400).json({ error: "Comment cannot exceed 300 characters." });
	}

	if (rating < 0 || rating > 10) {
		return res.status(400).json({ error: "Rating must be between 0 and 10." });
	}

	try {
		const result = await pool.query("UPDATE comments SET comment = $1, rating = $2 WHERE comment_id = $3 RETURNING *", [comment, rating, comment_id]);
		const updatedComment = result.rows[0];
		res.json({ message: "Comment updated", comment: updatedComment });
	} catch (error) {
		res.status(500).json({ error: "Error updating comment" });
	}
});

router.delete("/delete/:comment_id", async (req, res) => {
	const { comment_id } = req.params;
	try {
		await pool.query("DELETE FROM comments WHERE comment_id = $1", [comment_id]);
		res.json({ message: "Comment deleted" });
	} catch (error) {
		res.status(500).json({ error: "Error deleting comment" });
	}
});

module.exports = router;
