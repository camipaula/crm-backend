const LogAcceso = require("../models/LogAcceso.model");
const LogActividad = require("../models/LogActividad.model");
const ProspectoHistorial = require("../models/ProspectoHistorial.model");

/**
 * Registrar ingreso al sistema (llamar después de login exitoso).
 * @param {string} cedula_usuario
 * @param {object} req - request de Express (para ip y user-agent)
 */
async function registrarLogAcceso(cedula_usuario, req) {
  try {
    const ip = req.ip || req.connection?.remoteAddress || (req.headers && req.headers["x-forwarded-for"]) || null;
    const user_agent = req.get ? req.get("User-Agent") : (req.headers && req.headers["user-agent"]) || null;
    await LogAcceso.create({
      cedula_usuario,
      fecha_ingreso: new Date(),
      ip: ip ? String(ip).substring(0, 45) : null,
      user_agent: user_agent || null,
    });
  } catch (e) {
    console.error("Error registrarLogAcceso:", e.message);
  }
}

/**
 * Registrar una acción en el CRM (crear, editar, eliminar, etc.).
 * @param {string} cedula_usuario
 * @param {object} opts - { modulo, accion, referencia_id, descripcion }
 */
async function registrarActividad(cedula_usuario, opts = {}) {
  if (!cedula_usuario) return;
  try {
    await LogActividad.create({
      cedula_usuario,
      modulo: opts.modulo || null,
      accion: opts.accion || null,
      referencia_id: opts.referencia_id != null ? opts.referencia_id : null,
      descripcion: opts.descripcion || null,
    });
  } catch (e) {
    console.error("Error registrarActividad:", e.message);
  }
}

/**
 * Agregar entrada al historial del prospecto (evento automático o nota del usuario).
 * @param {number} id_prospecto
 * @param {string} cedula_usuario
 * @param {'evento'|'nota'} tipo
 * @param {string} mensaje
 */
async function agregarHistorialProspecto(id_prospecto, cedula_usuario, tipo, mensaje) {
  if (!id_prospecto || !cedula_usuario || !mensaje || !["evento", "nota"].includes(tipo)) return;
  try {
    await ProspectoHistorial.create({
      id_prospecto,
      cedula_usuario,
      tipo,
      mensaje: String(mensaje).trim(),
    });
  } catch (e) {
    console.error("Error agregarHistorialProspecto:", e.message);
  }
}

module.exports = {
  registrarLogAcceso,
  registrarActividad,
  agregarHistorialProspecto,
};
