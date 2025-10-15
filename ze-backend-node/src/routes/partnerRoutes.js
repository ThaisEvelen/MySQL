import express from "express";
import { db } from "../db.js";

export const router = express.Router();

// Criar novo parceiro
router.post("/", async (req, res) => {
  const { id, tradingName, ownerName, document, coverageArea, address } = req.body;

  try {
    const sql = `INSERT INTO partners (id, tradingName, ownerName, document, coverageArea, address)
                 VALUES (?, ?, ?, ?, ?, ?)`;
    await db.query(sql, [
      id,
      tradingName,
      ownerName,
      document,
      JSON.stringify(coverageArea),
      JSON.stringify(address)
    ]);

    res.status(201).json({ message: "Parceiro criado com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar parceiro" });
  }
});
