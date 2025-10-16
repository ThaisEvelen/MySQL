import express from "express";
import { db } from "../db.js";
import * as turf from "@turf/turf";

export const router = express.Router();

/* ---------------- Criar parceiro ---------------- */
router.post("/", async (req, res) => {
  const { id, tradingName, ownerName, document, coverageArea, address } = req.body;

  try {
    // 🔎 Verifica duplicidade de ID ou documento
    const [existe] = await db.query(
      "SELECT * FROM partners WHERE id = ? OR document = ?",
      [id, document]
    );

    if (existe.length > 0) {
      return res.status(400).json({ error: "ID ou documento já cadastrado." });
    }

    // 💾 Faz a inserção se não houver duplicata
    const sql = `
      INSERT INTO partners (id, tradingName, ownerName, document, coverageArea, address)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
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

/* ---------------- Buscar parceiro mais próximo ---------------- */
router.get("/search", async (req, res) => {
  console.log("✅ Entrou na rota /partners/search");

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
    const ponto = turf.point([userLong, userLat]);

    // Função para calcular a distância (Haversine)
    const distanciaKm = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
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
    let menorDist = Infinity;

    for (const partner of rows) {
      // 🗺️ Lê o coverageArea
      let coverageArea;
      try {
        coverageArea =
          typeof partner.coverageArea === "string"
            ? JSON.parse(partner.coverageArea)
            : partner.coverageArea;
      } catch (err) {
        console.error("Erro ao interpretar coverageArea:", partner.id);
        continue;
      }

      if (
        !coverageArea ||
        !coverageArea.coordinates ||
        !Array.isArray(coverageArea.coordinates)
      ) {
        console.warn("Parceiro sem área válida:", partner.id);
        continue;
      }

      const area = turf.multiPolygon(coverageArea.coordinates);
      const dentroDaArea = turf.booleanPointInPolygon(ponto, area);

      if (!dentroDaArea) {
        console.log(`❌ Ponto fora da cobertura do parceiro ${partner.id}`);
        continue; // pula se o ponto não estiver dentro da área
      }

      // 📍 Extrai coordenadas do endereço
      let pLat, pLng;
      try {
        const address =
          typeof partner.address === "string"
            ? JSON.parse(partner.address)
            : partner.address;
        if (address && Array.isArray(address.coordinates)) {
          pLng = parseFloat(address.coordinates[0]);
          pLat = parseFloat(address.coordinates[1]);
        }
      } catch (err) {
        console.error("Erro ao ler address:", partner.id);
        continue;
      }

      if (isNaN(pLat) || isNaN(pLng)) {
        console.log(`⚠️ Parceiro ${partner.id} sem coordenadas válidas`);
        continue;
      }

      // Calcula a distância
      const dist = distanciaKm(userLat, userLong, pLat, pLng);
      console.log(`📍 Parceiro ${partner.id}: ${pLat},${pLng} → dist = ${dist}`);

      if (dist < menorDist) {
        menorDist = dist;
        maisProximo = partner;
      }
    }

    if (!maisProximo) {
      return res.status(404).json({ error: "Nenhum parceiro cobre esta área." });
    }

    return res.json({
      mensagem: "Parceiro encontrado dentro da área de cobertura!",
      parceiroMaisProximo: maisProximo,
      distanciaKm: menorDist.toFixed(4)
    });
  } catch (err) {
    console.error("Erro ao buscar parceiro mais próximo:", err);
    return res.status(500).json({ error: "Erro ao buscar parceiro mais próximo." });
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

