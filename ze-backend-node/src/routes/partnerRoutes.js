import express from "express";
import { db } from "../db.js";

export const router = express.Router();

/* ---------------- Criar parceiro ---------------- */
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
    console.error("Erro ao criar parceiro:", err);
    res.status(500).json({ error: "Erro ao criar parceiro" });
  }
});

/* ---------------- Listar todos ---------------- */
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM partners");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar parceiros" });
  }
});

/* ---------------- Buscar por ID ---------------- */
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

/* ---------------- Atualizar parceiro ---------------- */
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

/* ---------------- Deletar parceiro ---------------- */
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

// Buscar parceiro mais próximo (corrigido e testado)
router.get("/search", async (req, res) => {
  const { long, lat } = req.query;

  if (!long || !lat) {
    return res.status(400).json({ error: "É necessário informar long e lat." });
  }

  try {
    const [rows] = await db.query("SELECT * FROM partners");

    if (rows.length === 0) {
      return res.status(404).json({ error: "Nenhum parceiro cadastrado." });
    }

    const userLat = parseFloat(lat);
    const userLong = parseFloat(long);

    // Função para calcular distância (Haversine)
    const distancia = (lat1, lon1, lat2, lon2) => {
      const R = 6371; // raio da Terra em km
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    let maisProximo = null;
    let menorDistancia = Infinity;

    for (const partner of rows) {
      let address;

      // 🚨 Garantia total: converte string JSON ou pega direto o objeto
      try {
        if (typeof partner.address === "string") {
          address = JSON.parse(partner.address);
        } else if (Buffer.isBuffer(partner.address)) {
          address = JSON.parse(partner.address.toString());
        } else {
          address = partner.address;
        }
      } catch (err) {
        console.error("Erro ao converter address:", partner.address);
        continue; // pula este parceiro se não conseguir ler o JSON
      }

      if (!address || !address.coordinates || !Array.isArray(address.coordinates)) {
        console.warn("Parceiro com address inválido:", partner.id);
        continue;
      }

      const [partnerLong, partnerLat] = address.coordinates;

      const dist = distancia(
        partnerLat,  // latitude do parceiro
        partnerLong, // longitude do parceiro
        userLat,     // latitude do usuário
        userLong     // longitude do usuário
      );

      if (dist < menorDistancia) {
        menorDistancia = dist;
        maisProximo = partner;
      }
    }

    if (!maisProximo) {
      return res.status(404).json({ error: "Parceiro não encontrado" });
    }

    res.json({
      parceiroMaisProximo: maisProximo,
      distanciaKm: menorDistancia.toFixed(4),
    });
  } catch (err) {
    console.error("Erro ao buscar parceiro mais próximo:", err);
    res.status(500).json({ error: "Erro ao buscar parceiro mais próximo." });
  }
});

