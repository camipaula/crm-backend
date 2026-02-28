const ProspectoHistorial = require("../models/ProspectoHistorial.model");
const Prospecto = require("../models/Prospecto.model");
const Usuario = require("../models/Usuario.model");
const { agregarHistorialProspecto } = require("../utils/audit");

/**
 * GET /api/prospectos/:id_prospecto/historial - Lista historial del prospecto (eventos + notas).
 */
const listarHistorial = async (req, res) => {
  try {
    const id_prospecto = parseInt(req.params.id_prospecto, 10);
    if (!id_prospecto) {
      return res.status(400).json({ message: "id_prospecto inválido." });
    }

    const existe = await Prospecto.findByPk(id_prospecto);
    if (!existe) {
      return res.status(404).json({ message: "Prospecto no encontrado." });
    }

    const historial = await ProspectoHistorial.findAll({
      where: { id_prospecto },
      order: [["created_at", "ASC"]],
      include: [{ model: Usuario, as: "usuario", attributes: ["cedula_ruc", "nombre"] }],
    });
    return res.json(historial);
  } catch (error) {
    console.error("Error listarHistorial:", error);
    return res.status(500).json({ message: "Error al listar historial.", error: error.message });
  }
};

/**
 * POST /api/prospectos/:id_prospecto/historial - Agrega una nota al historial del prospecto.
 * Body: { mensaje }
 */
const agregarNota = async (req, res) => {
  try {
    const id_prospecto = parseInt(req.params.id_prospecto, 10);
    const { mensaje } = req.body;
    const cedula = req.usuario?.cedula_ruc;

    if (!cedula) {
      return res.status(401).json({ message: "Usuario no autenticado." });
    }
    if (!id_prospecto) {
      return res.status(400).json({ message: "id_prospecto inválido." });
    }
    if (!mensaje || typeof mensaje !== "string" || !mensaje.trim()) {
      return res.status(400).json({ message: "El campo 'mensaje' es obligatorio." });
    }

    const existe = await Prospecto.findByPk(id_prospecto);
    if (!existe) {
      return res.status(404).json({ message: "Prospecto no encontrado." });
    }

    await agregarHistorialProspecto(id_prospecto, cedula, "nota", mensaje.trim());
    const ultimo = await ProspectoHistorial.findOne({
      where: { id_prospecto },
      order: [["created_at", "DESC"]],
      include: [{ model: Usuario, as: "usuario", attributes: ["cedula_ruc", "nombre"] }],
    });
    return res.status(201).json(ultimo);
  } catch (error) {
    console.error("Error agregarNota:", error);
    return res.status(500).json({ message: "Error al agregar nota.", error: error.message });
  }
};

module.exports = { listarHistorial, agregarNota };
