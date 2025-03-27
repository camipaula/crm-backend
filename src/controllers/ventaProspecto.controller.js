const VentaProspecto = require("../models/VentaProspecto.model");
const Prospecto = require("../models/Prospecto.model");
const SeguimientoVenta = require("../models/SeguimientoVenta.model");
const TipoSeguimiento = require("../models/TipoSeguimiento.model");

// Obtener todas las ventas de prospectos con sus seguimientos
const obtenerVentas = async (req, res) => {
  try {
    const ventas = await VentaProspecto.findAll({
      include: [
        {
          model: Prospecto,
          as: "prospecto",
          attributes: ["id_prospecto", "nombre","nombre_contacto", "correo", "telefono"], 
        },
        {
          model: SeguimientoVenta,
          as: "seguimientos",
          include: [
            {
              model: TipoSeguimiento,
              as: "tipo_seguimiento",
              attributes: ["descripcion"],
            },
          ],
        },
      ],
    });

    res.json(ventas);
  } catch (error) {
    console.error(" Error al obtener ventas:", error);
    res.status(500).json({ message: "Error al obtener ventas", error });
  }
};



// Obtener todas las ventas de un prospecto específico
const obtenerVentasPorProspecto = async (req, res) => {
  try {
    const { id_prospecto } = req.params;

    const ventas = await VentaProspecto.findAll({
      where: { id_prospecto },
      include: [
        {
          model: SeguimientoVenta,
          as: "seguimientos",
          include: [
            {
              model: TipoSeguimiento,
              as: "tipo_seguimiento",
              attributes: ["descripcion"],
            },
          ],
        },
      ],
    });

    if (!ventas.length) {
      return res.status(404).json({ message: "No hay ventas para este prospecto" });
    }

    res.json(ventas);
  } catch (error) {
    console.error(" Error al obtener ventas del prospecto:", error);
    res.status(500).json({ message: "Error al obtener ventas del prospecto", error });
  }
};


// Obtener una venta específica por ID
const obtenerVentaPorId = async (req, res) => {
  try {
    const { id_venta } = req.params;

    const venta = await VentaProspecto.findByPk(id_venta, {
      include: [
        { 
          model: Prospecto, 
          as: "prospecto", 
          attributes: ["nombre","nombre_contacto", "correo", "telefono", "cedula_vendedora"] 
        },
        { 
          model: SeguimientoVenta, 
          as: "seguimientos",
          include: [{ model: TipoSeguimiento, as: "tipo_seguimiento", attributes: ["descripcion"] }]
        },
      ],
    });

    if (!venta) {
      return res.status(404).json({ message: "Venta no encontrada" });
    }

    res.json(venta);
  } catch (error) {
    console.error("Error al obtener venta:", error);
    res.status(500).json({ message: "Error al obtener venta", error });
  }
};



// Crear una nueva venta para un prospecto
const crearVenta = async (req, res) => {
  try {
    const { id_prospecto, objetivo } = req.body;

    const nuevaVenta = await VentaProspecto.create({
      id_prospecto,
      objetivo,
      abierta: 1, // Se inicia como abierta
    });

    res.status(201).json({ message: "Venta creada exitosamente", venta: nuevaVenta });
  } catch (error) {
    console.error(" Error al crear venta:", error);
    res.status(500).json({ message: "Error al crear venta", error });
  }
};

// Cerrar una venta (marcar como cerrada)
const cerrarVenta = async (req, res) => {
  try {
    const { id_venta } = req.params;

    const venta = await VentaProspecto.findByPk(id_venta);
    if (!venta) return res.status(404).json({ message: "Venta no encontrada" });

    venta.abierta = 0;
    venta.fecha_cierre = new Date();
    await venta.save();

    res.json({ message: "Venta cerrada exitosamente" });
  } catch (error) {
    console.error(" Error al cerrar venta:", error);
    res.status(500).json({ message: "Error al cerrar venta", error });
  }
};

// Editar el objetivo de una venta
const editarObjetivoVenta = async (req, res) => {
  try {
    const { id_venta } = req.params;
    const { objetivo } = req.body;

    const venta = await VentaProspecto.findByPk(id_venta);
    if (!venta) return res.status(404).json({ message: "Venta no encontrada" });

    venta.objetivo = objetivo;
    await venta.save();

    res.json({ message: "Objetivo actualizado correctamente", venta });
  } catch (error) {
    console.error("Error al editar objetivo:", error);
    res.status(500).json({ message: "Error al editar objetivo", error });
  }
};


// Eliminar una venta
const eliminarVenta = async (req, res) => {
  try {
    const { id_venta } = req.params;

    const deleted = await VentaProspecto.destroy({ where: { id_venta } });

    if (!deleted) return res.status(404).json({ message: "Venta no encontrada" });

    res.json({ message: "Venta eliminada correctamente" });
  } catch (error) {
    console.error(" Error al eliminar venta:", error);
    res.status(500).json({ message: "Error al eliminar venta", error });
  }
};


const obtenerProspeccionesAgrupadas = async (req, res) => {
  try {
    const { cedula_vendedora, estado_prospeccion } = req.query;

    // Construimos la condición de filtrado
    let whereVenta = {};
    if (estado_prospeccion === "abiertas") whereVenta.abierta = 1;
    if (estado_prospeccion === "cerradas") whereVenta.abierta = 0;

    const ventas = await VentaProspecto.findAll({
      where: whereVenta,
      include: [
        {
          model: Prospecto,
          as: "prospecto",
          attributes: ["id_prospecto", "nombre", "estado"], // 🔹 Agregamos el estado del prospecto
          where: cedula_vendedora ? { cedula_vendedora } : undefined, // Filtrar por vendedora si se envía
        },
        {
          model: SeguimientoVenta,
          as: "seguimientos",
          include: [
            { model: TipoSeguimiento, as: "tipo_seguimiento", attributes: ["descripcion"] },
          ],
          order: [["fecha_programada", "DESC"]], // Ordenar para obtener el último
          limit: 1, // Solo el último seguimiento
        },
      ],
    });

    res.json(ventas);
  } catch (error) {
    console.error(" Error al obtener prospecciones agrupadas:", error);
    res.status(500).json({ message: "Error al obtener prospecciones", error });
  }
};


module.exports = {
  obtenerVentas,
  obtenerVentasPorProspecto,
  obtenerVentaPorId,
  crearVenta,
  cerrarVenta,
  eliminarVenta,
  editarObjetivoVenta,
  obtenerProspeccionesAgrupadas
};
