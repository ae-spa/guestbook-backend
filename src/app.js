import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import entriesRouter from "./routes/entries.js";
import { errorHandler } from "./middleware/errorHandler.js";
import "./db.js"; // DB 초기화

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.json({ 
    message: "Guestbook API", 
    endpoints: {
      health: "/health",
      entries: "/api/entries"
    }
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use("/api/entries", entriesRouter);

app.use((req, res) => {
  res
    .status(404)
    .json({ error: { code: "NOT_FOUND", message: "Route not found" } });
});

app.use(errorHandler);
export default app;
