const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const pool = require("../config/db");
const nodemailer = require("nodemailer");
const router = express.Router();

const JWT_SECRET = "your_secret_key";

// Configuración de Nodemailer
const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: "josebri2002@gmail.com",
		pass: "zvwa gbsc lhfx wnbm",
	},
});

const validateEmail = (email) => {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
};

//generar un código temporal
const generateTempCode = () => {
	return crypto.randomBytes(4).toString("hex");
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

//recuperar contraseña
router.post("/forgot-password", async (req, res) => {
	const { email } = req.body;

	try {
		const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
		const user = result.rows[0];

		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}

		const tempCode = generateTempCode();
		const expiration = Date.now() + 3600000;

		// Guardar el código temporal
		await pool.query("UPDATE users SET temp_code = $1, temp_code_expiration = $2 WHERE email = $3", [tempCode, expiration, email]);

		// Enviar el correo electrónico con el código temporal
		await transporter.sendMail({
			from: "your-email@gmail.com",
			to: email,
			subject: "Password Recovery Code",
			text: `Your password recovery code is: ${tempCode}. It will expire in 1 hour.`,
		});

		res.json({ message: "Recovery code sent to email" });
	} catch (error) {
		res.status(500).json({ error: "Error sending recovery code" });
	}
});

// Validar el código y cambiar la contraseña
router.post("/reset-password", async (req, res) => {
	const { email, tempCode, newPassword, confirmPassword } = req.body;

	if (!email || !tempCode || !newPassword || !confirmPassword) {
		return res.status(400).json({ error: "All fields are required." });
	}

	if (newPassword.length < 8) {
		return res.status(400).json({ error: "Password must be at least 8 characters long." });
	}

	if (newPassword !== confirmPassword) {
		return res.status(400).json({ error: "Passwords do not match." });
	}

	try {
		const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
		const user = result.rows[0];

		if (!user || user.temp_code !== tempCode || Date.now() > user.temp_code_expiration) {
			return res.status(400).json({ error: "Invalid or expired code." });
		}

		const hashedPassword = await bcrypt.hash(newPassword, 10);

		// Actualizar la contraseña y borrar el código temporal
		await pool.query("UPDATE users SET password = $1, temp_code = NULL, temp_code_expiration = NULL WHERE email = $2", [hashedPassword, email]);

		res.json({ message: "Password has been reset successfully" });
	} catch (error) {
		res.status(500).json({ error: "Error resetting password" });
	}
});

module.exports = router;
