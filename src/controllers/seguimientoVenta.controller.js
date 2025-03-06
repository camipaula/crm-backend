const Prospecto = require("../models/Prospecto.model");
const SeguimientoVenta = require("../models/SeguimientoVenta.model");
const VentaProspecto = require("../models/VentaProspecto.model");
const Usuario = require("../models/Usuario.model");
const TipoSeguimiento = require("../models/TipoSeguimiento.model");
const { Op } = require("sequelize");

// Obtener todos los seguimientos
const obtenerSeguimientos = async (req, res) => {
  try {
    const seguimientos = await SeguimientoVenta.findAll({
      include: [
        { model: VentaProspecto, as: "venta", attributes: ["objetivo"] },
        { model: Usuario, as: "vendedora_seguimiento", attributes: ["nombre"] },
        { model: TipoSeguimiento, as: "tipo_seguimiento", attributes: ["descripcion"] },
      ],
    });

    res.json(seguimientos);
  } catch (error) {
    console.error(" Error al obtener seguimientos:", error);
    res.status(500).json({ message: "Error al obtener seguimientos", error });
  }
};

// Obtener un seguimiento específico por ID
const obtenerSeguimientoPorId = async (req, res) => {
  try {
    const { id_seguimiento } = req.params;

    const seguimiento = await SeguimientoVenta.findByPk(id_seguimiento, {
      include: [
        { model: VentaProspecto, as: "venta", include: [{ model: Prospecto, as: "prospecto" }] },
        { model: TipoSeguimiento, as: "tipo_seguimiento" },
      ],
    });

    if (!seguimiento) {
      return res.status(404).json({ message: "Seguimiento no encontrado" });
    }

    res.json(seguimiento);
  } catch (error) {
    console.error(" Error al obtener seguimiento:", error);
    res.status(500).json({ message: "Error al obtener seguimiento", error });
  }
};

//Obtener seguimiento por vendedora 
const obtenerSeguimientosPorVendedora = async (req, res) => {
  const { cedula_ruc } = req.params;
  try {
    const ventas = await VentaProspecto.findAll({
      include: [
        {
          model: Prospecto,
          as: "prospecto",
          where: { cedula_vendedora: cedula_ruc } // Filtramos aquí por la vendedora
        },
        {
          model: SeguimientoVenta,
          as: "seguimientos",
          include: [{ model: TipoSeguimiento, as: "tipo_seguimiento" }]
        }
      ],
    });
    res.json(ventas);
  } catch (error) {
    console.error(" Error detallado:", error);
    res.status(500).json({ message: "Error obteniendo seguimientos", error });
  }
};


// Obtener la agenda de una vendedora (para el calendario en frontend)
const obtenerAgendaPorVendedora = async (req, res) => {
  try {
    const { cedula_vendedora } = req.params;
    
    const agenda = await SeguimientoVenta.findAll({
      where: {
        cedula_vendedora,
        estado: "pendiente",  // Solo los seguimientos que aún no han sido realizados o cancelados
      },
      include: [
        { model: VentaProspecto, as: "venta", attributes: ["objetivo"] },
        { model: TipoSeguimiento, as: "tipo_seguimiento", attributes: ["descripcion"] },
      ],
      order: [["fecha_programada", "ASC"]], // Ordenamos por la fecha más cercana
    });

    res.json(agenda);
  } catch (error) {
    console.error(" Error al obtener agenda de vendedora:", error);
    res.status(500).json({ message: "Error al obtener agenda", error });
  }
};

// Crear un seguimiento para una venta
const crearSeguimiento = async (req, res) => {
  try {
    const { id_venta, cedula_vendedora, fecha_programada, id_tipo, motivo, nota } = req.body;

    const nuevoSeguimiento = await SeguimientoVenta.create({
      id_venta,
      cedula_vendedora,
      fecha_programada,
      id_tipo,
      motivo,
      nota,
      estado: "pendiente",
    });

    res.status(201).json({ message: "Seguimiento creado exitosamente", seguimiento: nuevoSeguimiento });
  } catch (error) {
    console.error(" Error al crear seguimiento:", error);
    res.status(500).json({ message: "Error al crear seguimiento", error });
  }
};

// Registrar el resultado de un seguimiento (antes `registrarResultadoContacto`)
const registrarResultadoSeguimiento = async (req, res) => {
  try {
    const { id_seguimiento } = req.params;
    const { resultado, nota, estado } = req.body; // 🔹 Ahora también recibimos estado

    const seguimiento = await SeguimientoVenta.findByPk(id_seguimiento);
    if (!seguimiento) return res.status(404).json({ message: "Seguimiento no encontrado" });

    if (estado === "cancelado") {
      seguimiento.estado = "cancelado";
      seguimiento.resultado = resultado || "Cancelado";
      if (nota) seguimiento.nota = nota;
    } else {
      seguimiento.resultado = resultado;
      if (nota) seguimiento.nota = nota;
      seguimiento.estado = "realizado"; // 
    }

    await seguimiento.save();

    res.json({ message: "Seguimiento actualizado correctamente", seguimiento });
  } catch (error) {
    console.error(" Error al actualizar seguimiento:", error);
    res.status(500).json({ message: "Error al actualizar seguimiento", error });
  }
};


// Eliminar un seguimiento
const eliminarSeguimiento = async (req, res) => {
  try {
    const { id_seguimiento } = req.params;

    const deleted = await SeguimientoVenta.destroy({ where: { id_seguimiento } });

    if (!deleted) return res.status(404).json({ message: "Seguimiento no encontrado" });

    res.json({ message: "Seguimiento eliminado correctamente" });
  } catch (error) {
    console.error(" Error al eliminar seguimiento:", error);
    res.status(500).json({ message: "Error al eliminar seguimiento", error });
  }
};

// Obtener el historial de seguimientos de una venta específica
const obtenerHistorialPorVenta = async (req, res) => {
  try {
    const { id_venta } = req.params;

    const historial = await SeguimientoVenta.findAll({
      where: { id_venta },
      include: [{ model: TipoSeguimiento, as: "tipo_seguimiento", attributes: ["descripcion"] }],
      order: [["fecha_programada", "DESC"]],
    });

    if (!historial.length) {
      return res.status(404).json({ message: "No hay seguimientos para esta venta" });
    }

    res.json(historial);
  } catch (error) {
    console.error(" Error al obtener historial de la venta:", error);
    res.status(500).json({ message: "Error al obtener historial de la venta", error });
  }
};


// Obtener todos los tipos de seguimiento
const obtenerTiposSeguimiento = async (req, res) => {
  try {
    const tipos = await TipoSeguimiento.findAll();
    res.json(tipos);
  } catch (error) {
    console.error(" Error al obtener tipos de seguimiento:", error);
    res.status(500).json({ message: "Error al obtener tipos de seguimiento", error });
  }
};

module.exports = {
  obtenerSeguimientos,
  obtenerSeguimientoPorId,
  obtenerSeguimientosPorVendedora,
  obtenerAgendaPorVendedora, 
  crearSeguimiento,
  registrarResultadoSeguimiento, 
  eliminarSeguimiento,
  obtenerHistorialPorVenta,
  obtenerTiposSeguimiento
};
