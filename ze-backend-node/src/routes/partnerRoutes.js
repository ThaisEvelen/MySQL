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

// Buscar parceiro por ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query("SELECT * FROM partners WHERE id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Parceiro não encontrado" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar parceiro" });
  }
});
// Listar todos os parceiros
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM partners");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar parceiros" });
  }
});
// Atualizar parceiro existente
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { tradingName, ownerName, document, coverageArea, address } = req.body;

  try {
    const sql = `
      UPDATE partners 
      SET tradingName = ?, ownerName = ?, document = ?, coverageArea = ?, address = ?
      WHERE id = ?
    `;

    const [result] = await db.query(sql, [
      tradingName,
      ownerName,
      document,
      JSON.stringify(coverageArea),
      JSON.stringify(address),
      id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Parceiro não encontrado para atualizar" });
    }

    res.json({ message: "Parceiro atualizado com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar parceiro" });
  }
});
// Deletar parceiro
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query("DELETE FROM partners WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Parceiro não encontrado para deletar" });
    }

    res.json({ message: "Parceiro deletado com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao deletar parceiro" });
  }
});
