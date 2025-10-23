import express from "express";
import cors from "cors";

const app = express();
const PORT = 5001;

// Enable CORS
app.use(cors({
  origin: "http://localhost:5173" // Replace with your React app's URL
}));

// Root route
app.get("/", (req, res) => {
  res.send("Backend is running successfully 🚀 LOLLOLL THIS WORKRED");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});