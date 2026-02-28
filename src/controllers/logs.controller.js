const { Op } = require("sequelize");
const LogAcceso = require("../models/LogAcceso.model");
const LogActividad = require("../models/LogActividad.model");
const Usuario = require("../models/Usuario.model");

/**
 * GET /api/logs/acceso - Lista accesos (ingresos al sistema).
 * Query: cedula_usuario, fecha_desde, fecha_hasta, page, limit.
 * Solo admin.
 */
const listarAccesos = async (req, res) => {
  try {
    const { cedula_usuario, fecha_desde, fecha_hasta, page = 1, limit = 50 } = req.query;
    const where = {};
    if (cedula_usuario) where.cedula_usuario = cedula_usuario;
    if (fecha_desde || fecha_hasta) {
      where.fecha_ingreso = {};
      if (fecha_desde) where.fecha_ingreso[Op.gte] = new Date(fecha_desde);
      if (fecha_hasta) where.fecha_ingreso[Op.lte] = new Date(`${fecha_hasta}T23:59:59`);
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const { count, rows } = await LogAcceso.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset,
      order: [["fecha_ingreso", "DESC"]],
      include: [{ model: Usuario, as: "usuario", attributes: ["cedula_ruc", "nombre", "email"] }],
    });
    return res.json({ total: count, accesos: rows });
  } catch (error) {
    console.error("Error listarAccesos:", error);
    return res.status(500).json({ message: "Error al listar accesos.", error: error.message });
  }
};

/**
 * GET /api/logs/actividad - Lista actividades (acciones en el CRM).
 * Query: cedula_usuario, modulo, fecha_desde, fecha_hasta, page, limit.
 * Solo admin.
 */
const listarActividades = async (req, res) => {
  try {
    const { cedula_usuario, modulo, fecha_desde, fecha_hasta, page = 1, limit = 50 } = req.query;
    const where = {};
    if (cedula_usuario) where.cedula_usuario = cedula_usuario;
    if (modulo) where.modulo = modulo;
    if (fecha_desde || fecha_hasta) {
      where.created_at = {};
      if (fecha_desde) where.created_at[Op.gte] = new Date(fecha_desde);
      if (fecha_hasta) where.created_at[Op.lte] = new Date(`${fecha_hasta}T23:59:59`);
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const { count, rows } = await LogActividad.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset,
      order: [["created_at", "DESC"]],
      include: [{ model: Usuario, as: "usuario", attributes: ["cedula_ruc", "nombre"] }],
    });
    return res.json({ total: count, actividades: rows });
  } catch (error) {
    console.error("Error listarActividades:", error);
    return res.status(500).json({ message: "Error al listar actividades.", error: error.message });
  }
};

module.exports = { listarAccesos, listarActividades };
