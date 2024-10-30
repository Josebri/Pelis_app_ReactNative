const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const router = express.Router();

const JWT_SECRET = "your_secret_key";

const validateEmail = (email) => {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
};

// Registro de usuarios
router.post("/register", async (req, res) => {
	const { first_name, last_name, username, email, password } = req.body;

	if (!first_name || !last_name || !username || !email || !password) {
		return res.status(400).json({ error: "All fields are required." });
	}

	if (first_name.length > 100 || last_name.length > 100 || username.length > 100 || email.length > 100 || password.length > 100) {
		return res.status(400).json({ error: "Fields cannot exceed 100 characters." });
	}

	if (username.length < 6) {
		return res.status(400).json({ error: "Username must be at least 6 characters long." });
	}

	if (password.length < 8) {
		return res.status(400).json({ error: "Password must be at least 8 characters long." });
	}

	if (!validateEmail(email)) {
		return res.status(400).json({ error: "Invalid email format." });
	}

	try {
		const existingUser = await pool.query("SELECT * FROM users WHERE email = $1 OR username = $2", [email, username]);

		if (existingUser.rows.length > 0) {
			if (existingUser.rows[0].email === email) {
				return res.status(400).json({ error: "Email is already registered." });
			} else if (existingUser.rows[0].username === username) {
				return res.status(400).json({ error: "Username is already taken." });
			}
		}

		const hashedPassword = await bcrypt.hash(password, 10);
		const result = await pool.query("INSERT INTO users (first_name, last_name, username, email, password) VALUES ($1, $2, $3, $4, $5) RETURNING *", [first_name, last_name, username, email, hashedPassword]);
		const user = result.rows[0];
		res.status(201).json({ message: "User registered", user });
	} catch (error) {
		res.status(500).json({ error: "Error registering user" });
	}
});

// Login de usuarios
router.post("/login", async (req, res) => {
	const { emailOrUsername, password } = req.body;

	if (!emailOrUsername || !password) {
		return res.status(400).json({ error: "All fields are required." });
	}

	try {
		const result = await pool.query("SELECT * FROM users WHERE email = $1 OR username = $2", [emailOrUsername, emailOrUsername]);
		const user = result.rows[0];

		if (!user) {
			return res.status(404).json({ error: "User not found." });
		}

		const isValidPassword = await bcrypt.compare(password, user.password);
		if (!isValidPassword) {
			return res.status(401).json({ error: "Invalid password." });
		}

		const token = jwt.sign({ userId: user.user_id }, JWT_SECRET, { expiresIn: "1h" });
		res.json({ token, message: "Login successful" });
	} catch (error) {
		res.status(500).json({ error: "Error logging in" });
	}
});

module.exports = router;
