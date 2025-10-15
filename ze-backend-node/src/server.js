import express from "express";
import { router as partnerRoutes } from "./routes/partnerRoutes.js";

const app = express();
app.use(express.json());

// 👇 aqui está o segredo
app.use("/partners", partnerRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});
