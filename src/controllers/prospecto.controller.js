const { Sequelize, Op } = require("sequelize");
const Prospecto = require("../models/Prospecto.model");
const Usuario = require("../models/Usuario.model");
const OrigenProspecto = require("../models/OrigenProspecto.model");
const VentaProspecto = require("../models/VentaProspecto.model");
const SeguimientoVenta = require("../models/SeguimientoVenta.model");

// Obtener prospectos con filtros
const obtenerProspectos = async (req, res) => {
  try {
    const { cedula_vendedora, estado, fechaInicio, fechaFin, sector } = req.query;
    const whereClause = {};

    if (cedula_vendedora) whereClause.cedula_vendedora = cedula_vendedora;
    if (estado) whereClause.estado = Array.isArray(estado) ? { [Op.in]: estado } : estado;
    if (sector) whereClause.sector = sector;
    if (fechaInicio && fechaFin) {
      whereClause.created_at = {
        [Op.between]: [new Date(fechaInicio), new Date(`${fechaFin}T23:59:59`)],
      };
    }

    const prospectos = await Prospecto.findAll({
      where: whereClause,
      include: [
        {
          model: Usuario,
          as: "vendedora_prospecto",
          attributes: ["nombre"],
        },
        {
          model: OrigenProspecto,
          as: "origen_prospecto",
          attributes: ["descripcion"],
        },
        {
          model: VentaProspecto,
          as: "ventas",
          include: [
            {
              model: SeguimientoVenta,
              as: "seguimientos",
              attributes: ["nota", "fecha_programada", "estado"],
            },
          ],
        },
      ],
    });

    res.json(prospectos);
  } catch (error) {
    console.error("Error al obtener prospectos:", error);
    res.status(500).json({ message: "Error al obtener prospectos", error });
  }
};




// Obtener un prospecto por ID
const obtenerProspectoPorId = async (req, res) => {
  try {
    const { id_prospecto } = req.params;

    const prospecto = await Prospecto.findByPk(id_prospecto, {
      include: [
        { model: Usuario, as: "vendedora_prospecto", attributes: ["nombre"] },
        { model: OrigenProspecto, as: "origen_prospecto", attributes: ["descripcion"] },
        { model: VentaProspecto, as: "ventas", include: [{ model: SeguimientoVenta, as: "seguimientos" }] }
      ],
    });

    if (!prospecto) {
      return res.status(404).json({ message: "Prospecto no encontrado" });
    }

    res.json(prospecto);
  } catch (error) {
    console.error(" Error en obtenerProspectoPorId:", error);
    res.status(500).json({ message: "Error al obtener el prospecto", error });
  }
};

// Obtener prospectos por vendedora
const obtenerProspectosPorVendedora = async (req, res) => {
  try {
    const { cedula_vendedora } = req.params;

    const prospectos = await Prospecto.findAll({
      where: { cedula_vendedora },
      include: [{ model: VentaProspecto, as: "ventas", include: [{ model: SeguimientoVenta, as: "seguimientos" }] }],
    });

    res.json(prospectos);
  } catch (error) {
    console.error(" Error al obtener prospectos por vendedora:", error);
    res.status(500).json({ message: "Error al obtener prospectos por vendedora", error });
  }
};

// Obtener prospectos por estado
const obtenerProspectosPorEstado = async (req, res) => {
  try {
    const { estado } = req.params;

    const prospectos = await Prospecto.findAll({
      where: { estado },
      include: [{ model: VentaProspecto, as: "ventas", include: [{ model: SeguimientoVenta, as: "seguimientos" }] }],
    });

    res.json(prospectos);
  } catch (error) {
    console.error(" Error al obtener prospectos por estado:", error);
    res.status(500).json({ message: "Error al obtener prospectos por estado", error });
  }
};

// Crear un prospecto
const crearProspecto = async (req, res) => {
  try {
    console.log("Usuario autenticado en crearProspecto:", req.usuario);

    const {
      cedula_ruc, nombre, correo, telefono, direccion, provincia,
      ciudad, sector, id_origen, nota, estado, cedula_vendedora
    } = req.body;

    let asignarVendedora = cedula_vendedora;

    if (req.usuario.rol === "vendedora") {
      asignarVendedora = req.usuario.cedula_ruc;
    } else if (!asignarVendedora) {
      return res.status(400).json({ message: "Debe asignar una vendedora al prospecto." });
    }

    const nuevoProspecto = await Prospecto.create({
      cedula_ruc,
      nombre,
      correo,
      telefono,
      direccion,
      provincia,
      ciudad,
      sector,
      id_origen,
      nota,
      estado,
      cedula_vendedora: asignarVendedora,
    });

    res.status(201).json({ message: "Prospecto creado exitosamente", prospecto: nuevoProspecto });
  } catch (error) {
    console.error(" Error en crearProspecto:", error);
    res.status(500).json({ message: "Error al crear prospecto", error });
  }
};

// Actualizar un prospecto
const actualizarProspecto = async (req, res) => {
  try {
    const { id_prospecto } = req.params;

    const [updated] = await Prospecto.update(req.body, { where: { id_prospecto } });

    if (!updated) {
      return res.status(404).json({ message: "Prospecto no encontrado o sin cambios." });
    }

    res.json({ message: "Prospecto actualizado correctamente." });
  } catch (error) {
    console.error(" Error al actualizar prospecto:", error);
    res.status(500).json({ message: "Error al actualizar prospecto", error });
  }
};

// Eliminar un prospecto
const eliminarProspecto = async (req, res) => {
  try {
    const { id_prospecto } = req.params;
    const deleted = await Prospecto.destroy({ where: { id_prospecto } });

    if (!deleted) return res.status(404).json({ message: "Prospecto no encontrado" });

    res.json({ message: "Prospecto eliminado correctamente" });
  } catch (error) {
    console.error(" Error al eliminar prospecto:", error);
    res.status(500).json({ message: "Error al eliminar prospecto", error });
  }
};

// Obtener todos los sectores únicos de los prospectos
const obtenerSectores = async (req, res) => {
  try {
    const sectores = await Prospecto.findAll({
      attributes: [[Sequelize.fn("DISTINCT", Sequelize.col("sector")), "sector"]],
      where: { sector: { [Op.ne]: null } },
      order: [["sector", "ASC"]],
    });

    if (sectores.length === 0) {
      return res.status(404).json({ message: "No hay sectores disponibles" });
    }

    res.json(sectores.map((s) => s.sector));
  } catch (error) {
    console.error("Error al obtener sectores:", error);
    res.status(500).json({ message: "Error al obtener sectores", error });
  }
};

module.exports = {
  obtenerProspectos,
  obtenerProspectoPorId,
  obtenerProspectosPorVendedora,
  obtenerProspectosPorEstado,
  crearProspecto,
  actualizarProspecto,
  eliminarProspecto,
  obtenerSectores,
};
