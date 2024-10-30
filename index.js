const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const commentRoutes = require("./routes/comments");
const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);

app.use("/comments", commentRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
