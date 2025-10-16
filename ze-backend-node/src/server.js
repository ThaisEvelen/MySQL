import express from "express";
import { router as partnerRoutes } from "./routes/partnerRoutes.js";

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  console.log("➡️ Rota acessada:", req.method, req.originalUrl);
  next();
});

app.use("/partners", partnerRoutes);

console.log("🚀 Teste: este é o server.js que o Node está lendo!"); // <-- aqui

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});
