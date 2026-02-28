const path = require("path");
const fs = require("fs");
const { Op } = require("sequelize");
const Documento = require("../models/Documento.model");
const Prospecto = require("../models/Prospecto.model");
const { registrarActividad } = require("../utils/audit");

const TIPOS_VALIDOS = ["propuesta", "contrato", "correo", "formulario", "interno", "otro"];

/**
 * Regla de visibilidad:
 * - General (id_prospecto null): todos pueden ver/subir.
 * - Por prospecto (id_prospecto = X): admin y la vendedora de ese prospecto pueden ver (da igual quién suba).
 */

/**
 * POST /documentos - Subir archivo.
 * Body (form): archivo, tipo, alcance ("general" | "prospecto"), id_prospecto (si alcance=prospecto).
 * Opcional: id_venta (solo para orden, no cambia visibilidad).
 */
const subirDocumento = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Debe enviar un archivo (campo 'archivo')." });
    }

    const { tipo, alcance, id_prospecto, id_venta } = req.body;
    if (!tipo || !TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({
        message: "El campo 'tipo' es obligatorio y debe ser uno de: " + TIPOS_VALIDOS.join(", "),
      });
    }

    const esGeneral = alcance === "general" || !alcance || !id_prospecto || String(id_prospecto).trim() === "";
    const idProspectoNum = esGeneral ? null : parseInt(id_prospecto, 10);
    if (!esGeneral && (isNaN(idProspectoNum) || idProspectoNum <= 0)) {
      return res.status(400).json({ message: "Si el alcance es por prospecto, debe enviar un id_prospecto válido." });
    }

    const subido_por = req.usuario?.cedula_ruc || null;
    const nombre = req.file.originalname || path.basename(req.file.filename);
    const ruta_archivo = req.file.filename;
    const mime_type = req.file.mimetype || null;
    const tamanio = req.file.size ? parseInt(req.file.size, 10) : null;

    const doc = await Documento.create({
      nombre,
      tipo,
      ruta_archivo,
      mime_type,
      tamanio,
      id_prospecto: idProspectoNum,
      id_venta: id_venta ? parseInt(id_venta, 10) : null,
      subido_por,
    });

    await registrarActividad(subido_por, { modulo: "documento", accion: "subir", referencia_id: doc.id_documento, descripcion: `Subió documento: ${nombre} (${tipo})${esGeneral ? " [General]" : ""}` });

    return res.status(201).json(doc);
  } catch (error) {
    console.error("Error subirDocumento:", error);
    return res.status(500).json({ message: "Error al subir el documento.", error: error.message });
  }
};

/**
 * GET /documentos - Listar documentos que el usuario puede ver.
 * General (id_prospecto null): todos. Por prospecto: admin o vendedora de ese prospecto.
 * Query: alcance=general | alcance=prospecto&id_prospecto=X, tipo, id_venta, page, limit
 */
const listarDocumentos = async (req, res) => {
  try {
    const { alcance, id_prospecto, id_venta, tipo, page = 1, limit = 50 } = req.query;
    const rol = req.usuario?.rol;
    const cedula = req.usuario?.cedula_ruc;

    const where = { eliminado: 0 };
    if (id_venta) where.id_venta = parseInt(id_venta, 10);
    if (tipo && TIPOS_VALIDOS.includes(tipo)) where.tipo = tipo;

    if (alcance === "general") {
      where.id_prospecto = null;
    } else if (id_prospecto) {
      where.id_prospecto = parseInt(id_prospecto, 10);
    }

    if (rol !== "admin") {
      const idsProspectosMios = cedula
        ? (await Prospecto.findAll({ where: { cedula_vendedora: cedula, eliminado: 0 }, attributes: ["id_prospecto"] })).map((p) => p.id_prospecto)
        : [];
      where[Op.or] = [
        { id_prospecto: null },
        ...(idsProspectosMios.length ? [{ id_prospecto: { [Op.in]: idsProspectosMios } }] : []),
      ];
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const { count, rows } = await Documento.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset,
      order: [["created_at", "DESC"]],
    });

    return res.json({ total: count, documentos: rows });
  } catch (error) {
    console.error("Error listarDocumentos:", error);
    return res.status(500).json({ message: "Error al listar documentos.", error: error.message });
  }
};

/**
 * GET /prospectos/:id_prospecto/documentos - Documentos de un prospecto.
 * Solo admin o la vendedora asignada a ese prospecto pueden ver.
 */
const listarDocumentosPorProspecto = async (req, res) => {
  try {
    const id_prospecto = parseInt(req.params.id_prospecto, 10);
    if (!id_prospecto) {
      return res.status(400).json({ message: "id_prospecto inválido." });
    }

    const rol = req.usuario?.rol;
    const cedula = req.usuario?.cedula_ruc;

    if (rol !== "admin") {
      const prospecto = await Prospecto.findByPk(id_prospecto, { attributes: ["cedula_vendedora"] });
      if (!prospecto) return res.status(404).json({ message: "Prospecto no encontrado." });
      if (prospecto.cedula_vendedora !== cedula) {
        return res.status(403).json({ message: "Solo la vendedora del prospecto o admin pueden ver sus documentos." });
      }
    }

    const documentos = await Documento.findAll({
      where: { id_prospecto, eliminado: 0 },
      order: [["created_at", "DESC"]],
    });

    return res.json(documentos);
  } catch (error) {
    console.error("Error listarDocumentosPorProspecto:", error);
    return res.status(500).json({ message: "Error al listar documentos del prospecto.", error: error.message });
  }
};

/**
 * GET /documentos/:id/archivo - Descarga. General = todos; por prospecto = admin o vendedora del prospecto.
 */
const descargarArchivo = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const doc = await Documento.findOne({ where: { id_documento: id, eliminado: 0 } });
    if (!doc) {
      return res.status(404).json({ message: "Documento no encontrado o ya eliminado." });
    }

    const rol = req.usuario?.rol;
    const cedula = req.usuario?.cedula_ruc;
    if (rol !== "admin") {
      const esGeneral = doc.id_prospecto == null;
      let esMiProspecto = false;
      if (doc.id_prospecto && cedula) {
        const prospecto = await Prospecto.findByPk(doc.id_prospecto, { attributes: ["cedula_vendedora"] });
        esMiProspecto = prospecto && prospecto.cedula_vendedora === cedula;
      }
      if (!esGeneral && !esMiProspecto) {
        return res.status(403).json({ message: "No tiene permiso para descargar este documento." });
      }
    }

    const uploadsDir = path.join(process.cwd(), "uploads");
    const filePath = path.join(uploadsDir, doc.ruta_archivo);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Archivo no encontrado en el servidor." });
    }

    const nombreSeguro = (doc.nombre || "documento").replace(/"/g, "");
    res.setHeader("Content-Disposition", `attachment; filename="${nombreSeguro}"`);
    if (doc.mime_type) {
      res.setHeader("Content-Type", doc.mime_type);
    }
    res.sendFile(filePath);
  } catch (error) {
    console.error("Error descargarArchivo:", error);
    return res.status(500).json({ message: "Error al descargar el archivo.", error: error.message });
  }
};

/**
 * DELETE /documentos/:id - Soft delete. Misma regla: general = todos; por prospecto = admin o vendedora.
 */
const eliminarDocumento = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const doc = await Documento.findOne({ where: { id_documento: id, eliminado: 0 } });
    if (!doc) {
      return res.status(404).json({ message: "Documento no encontrado o ya eliminado." });
    }

    const rol = req.usuario?.rol;
    const cedula = req.usuario?.cedula_ruc;
    if (rol !== "admin") {
      const esGeneral = doc.id_prospecto == null;
      let esMiProspecto = false;
      if (doc.id_prospecto && cedula) {
        const prospecto = await Prospecto.findByPk(doc.id_prospecto, { attributes: ["cedula_vendedora"] });
        esMiProspecto = prospecto && prospecto.cedula_vendedora === cedula;
      }
      if (!esGeneral && !esMiProspecto) {
        return res.status(403).json({ message: "No tiene permiso para eliminar este documento." });
      }
    }

    doc.eliminado = 1;
    await doc.save();

    await registrarActividad(req.usuario?.cedula_ruc, { modulo: "documento", accion: "eliminar", referencia_id: id, descripcion: `Eliminó documento: ${doc.nombre}` });

    const uploadsDir = path.join(process.cwd(), "uploads");
    const filePath = path.join(uploadsDir, doc.ruta_archivo);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.warn("No se pudo borrar el archivo físico:", filePath, e.message);
      }
    }

    return res.json({ message: "Documento eliminado.", id_documento: id });
  } catch (error) {
    console.error("Error eliminarDocumento:", error);
    return res.status(500).json({ message: "Error al eliminar el documento.", error: error.message });
  }
};

/**
 * GET /documentos/opciones - Para el combobox de alcance al subir.
 * Devuelve: { general: { value: "general", label }, prospectos: [ { id_prospecto, nombre } ] }
 * Admin: todos los prospectos. Vendedora: solo sus prospectos.
 */
const opcionesAlcance = async (req, res) => {
  try {
    const rol = req.usuario?.rol;
    const cedula = req.usuario?.cedula_ruc;

    const whereProspecto = { eliminado: 0 };
    if (rol !== "admin" && cedula) whereProspecto.cedula_vendedora = cedula;

    const prospectos = await Prospecto.findAll({
      where: whereProspecto,
      attributes: ["id_prospecto", "nombre"],
      order: [["nombre", "ASC"]],
    });

    return res.json({
      general: { value: "general", label: "General (visible para todos)" },
      prospectos: prospectos.map((p) => ({ id_prospecto: p.id_prospecto, nombre: p.nombre })),
    });
  } catch (error) {
    console.error("Error opcionesAlcance:", error);
    return res.status(500).json({ message: "Error al obtener opciones.", error: error.message });
  }
};

module.exports = {
  subirDocumento,
  listarDocumentos,
  listarDocumentosPorProspecto,
  opcionesAlcance,
  descargarArchivo,
  eliminarDocumento,
};
