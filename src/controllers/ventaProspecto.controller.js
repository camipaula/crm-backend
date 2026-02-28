const VentaProspecto = require("../models/VentaProspecto.model");
const Prospecto = require("../models/Prospecto.model");
const SeguimientoVenta = require("../models/SeguimientoVenta.model");
const TipoSeguimiento = require("../models/TipoSeguimiento.model");
const EstadoProspecto = require("../models/EstadoProspecto.model");
const Usuario = require("../models/Usuario.model");
const { registrarActividad, agregarHistorialProspecto } = require("../utils/audit");

const { Op } = require("sequelize");

const ESTADO_INICIAL_VENTA = "Captación/ensayo";

// Obtener todas las ventas de prospectos con sus seguimientos
const obtenerVentas = async (req, res) => {
  try {
    const ventas = await VentaProspecto.findAll({
      where: { eliminado: 0 },
      include: [
        {
          model: Prospecto,
          as: "prospecto",
          attributes: ["id_prospecto", "nombre", "nombre_contacto", "correo", "telefono", "cedula_vendedora"],
          include: [
            {
              model: EstadoProspecto,
              as: "estado_venta",
              attributes: ["id_estado", "nombre"]
            },
            {
              model: Usuario,
              as: "vendedora_prospecto",
              attributes: ["nombre", "estado"],
            }
          ]
        },
        {
          model: SeguimientoVenta,
          as: "seguimientos",
          where: { eliminado: 0 },
          required: false,
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
      where: {
        id_prospecto,
        eliminado: 0
      },
      attributes: ["id_venta", "objetivo", "abierta", "fecha_cierre", "monto_cierre", "monto_proyectado"],

      include: [
        {
          model: EstadoProspecto, // AGREGADO
          as: "estado_venta",
          attributes: ["id_estado", "nombre"]
        },
        {
          model: Prospecto,
          as: "prospecto",
          attributes: ["id_prospecto", "nombre", "nombre_contacto", "correo", "telefono", "cedula_vendedora"],
          include: [
            {
              model: Usuario,
              as: "vendedora_prospecto",
              attributes: ["nombre", "estado"],
            }
          ]
        },
        {
          model: SeguimientoVenta,
          as: "seguimientos",
          where: { eliminado: 0 },
          required: false,
          include: [
            {
              model: TipoSeguimiento,
              as: "tipo_seguimiento",
              attributes: ["descripcion"]
            }
          ]
        }
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
          model: EstadoProspecto,
          as: "estado_venta",
          attributes: ["id_estado", "nombre"]
        },
        {

          model: Prospecto,
          as: "prospecto",
          attributes: ["id_prospecto", "nombre", "nombre_contacto", "correo", "telefono", "direccion", "cedula_vendedora", "created_at"],
          include: [

            {
              model: Usuario,
              as: "vendedora_prospecto",
              attributes: ["nombre", "estado"]
            }
          ]
        },
        {
          model: SeguimientoVenta,
          as: "seguimientos",
          where: { eliminado: 0 },
          required: false,
          include: [
            { model: TipoSeguimiento, as: "tipo_seguimiento", attributes: ["descripcion"] }
          ]
        },
      ],
    });


    if (!venta || venta.eliminado === 1) {
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
    const { id_prospecto, objetivo, monto_proyectado, id_categoria_venta, cedula_vendedora } = req.body;

    if (!id_prospecto) {
      return res.status(400).json({ message: "Falta id_prospecto." });
    }
    if (!objetivo || String(objetivo).trim() === "") {
      return res.status(400).json({ message: "El objetivo es obligatorio." });
    }

    const estadoInicial = await EstadoProspecto.findOne({ where: { nombre: ESTADO_INICIAL_VENTA } });
    if (!estadoInicial) {
      return res.status(500).json({
        message: `No se encontró el estado '${ESTADO_INICIAL_VENTA}' en la base de datos. Verifica que exista en la tabla estado_prospecto.`,
      });
    }

    const prospecto = await Prospecto.findByPk(id_prospecto, { attributes: ["cedula_vendedora"] });
    if (!prospecto) {
      return res.status(404).json({ message: "Prospecto no encontrado." });
    }
    const vendedoraVenta = cedula_vendedora || prospecto.cedula_vendedora || null;
    const idCategoriaVenta = id_categoria_venta ? parseInt(id_categoria_venta, 10) : null;

    const nuevaVenta = await VentaProspecto.create({
      id_prospecto,
      objetivo: String(objetivo).trim(),
      abierta: 1,
      eliminado: 0,
      id_estado: estadoInicial.id_estado,
      id_categoria_venta: idCategoriaVenta,
      cedula_vendedora: vendedoraVenta,
      monto_proyectado: monto_proyectado != null ? parseFloat(monto_proyectado) : null,
    });

    const cedula = req.usuario?.cedula_ruc;
    await registrarActividad(cedula, { modulo: "venta", accion: "crear", referencia_id: nuevaVenta.id_venta, descripcion: `Abrió prospección: ${objetivo}` });
    await agregarHistorialProspecto(parseInt(id_prospecto, 10), cedula, "evento", `Abrió prospección: ${objetivo}`);

    res.status(201).json({ id_venta: nuevaVenta.id_venta });
  } catch (error) {
    console.error(" Error al crear venta:", error);
    const msg = error.message || "Error al crear venta";
    return res.status(500).json({ message: msg, error: error.message });
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

    const cedula = req.usuario?.cedula_ruc;
    await registrarActividad(cedula, { modulo: "venta", accion: "cerrar venta", referencia_id: venta.id_venta, descripcion: "Cerro la venta" });
    if (venta.id_prospecto) {
      await agregarHistorialProspecto(venta.id_prospecto, cedula, "evento", "Cerro la prospección.");
    }

    res.json({ message: "Venta cerrada exitosamente" });
  } catch (error) {
    console.error(" Error al cerrar venta:", error);
    res.status(500).json({ message: "Error al cerrar venta", error });
  }
};

// Editar el objetivo de una venta
// Editar objetivo y monto_proyectado
const editarObjetivoVenta = async (req, res) => {
  try {
    const { id_venta } = req.params;
    const { objetivo, monto_proyectado } = req.body;

    const venta = await VentaProspecto.findByPk(id_venta);
    if (!venta) return res.status(404).json({ message: "Venta no encontrada" });

    venta.objetivo = objetivo ?? venta.objetivo;
    if (monto_proyectado !== undefined) {
      if (monto_proyectado < 0) return res.status(400).json({ message: "El monto proyectado no puede ser negativo" });
      venta.monto_proyectado = monto_proyectado;
    }

    await venta.save();

    await registrarActividad(req.usuario?.cedula_ruc, { modulo: "venta", accion: "editar objetivo", referencia_id: venta.id_venta, descripcion: `Editó objetivo: ${venta.objetivo}` });

    res.json({ message: "Objetivo y monto proyectado actualizados", venta });
  } catch (error) {
    console.error("Error al editar objetivo:", error);
    res.status(500).json({ message: "Error al editar objetivo", error });
  }
};


/*// Eliminar una venta
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
};*/

// Eliminar una venta (eliminación lógica)
const eliminarVenta = async (req, res) => {
  try {
    // Validar si el usuario tiene permiso (debe ser admin)
    if (req.usuario.rol !== "admin") {
      return res.status(403).json({ message: "Acceso denegado. Solo la administradora puede eliminar ventas." });
    }

    const { id_venta } = req.params;

    const venta = await VentaProspecto.findByPk(id_venta, {
      include: {
        model: SeguimientoVenta,
        as: "seguimientos"
      }
    });

    if (!venta || venta.eliminado === 1) {
      return res.status(404).json({ message: "Venta no encontrada" });
    }

    // Eliminar lógicamente la venta
    venta.eliminado = 1;
    await venta.save();

    // Eliminar lógicamente los seguimientos relacionados
    for (const seguimiento of venta.seguimientos) {
      seguimiento.eliminado = 1;
      await seguimiento.save();
    }

    await registrarActividad(req.usuario?.cedula_ruc, { modulo: "venta", accion: "eliminar", referencia_id: venta.id_venta, descripcion: "Eliminó la venta" });

    res.json({ message: "Venta y seguimientos eliminados correctamente" });
  } catch (error) {
    console.error("Error al eliminar venta:", error);
    res.status(500).json({ message: "Error al eliminar venta", error });
  }
};





const obtenerProspeccionesAgrupadas = async (req, res) => {
  try {
    const { cedula_vendedora, estado_prospeccion, page = 1, limit = 10, seguimiento, nombre } = req.query;

    const whereVenta = { eliminado: 0 };
    if (estado_prospeccion === "abiertas") whereVenta.abierta = 1;
    if (estado_prospeccion === "cerradas") whereVenta.abierta = 0;

    const prospectoWhere = {};

    if (cedula_vendedora && cedula_vendedora !== "undefined") {
      prospectoWhere.cedula_vendedora = cedula_vendedora;
    }

    if (nombre) {
      prospectoWhere.nombre = { [Op.like]: `%${nombre}%` };
    }



    let rows = await VentaProspecto.findAll({
      subQuery: false,
      where: whereVenta,
      order: [["created_at", "DESC"]],
      include: [
        {
          model: Prospecto,
          as: "prospecto",
          attributes: ["id_prospecto", "nombre", "cedula_vendedora"],
          where: Object.keys(prospectoWhere).length ? prospectoWhere : undefined,
          include: [
            { model: Usuario, as: "vendedora_prospecto", attributes: ["nombre", "estado"] }
          ],
        },
        {
          model: EstadoProspecto,
          as: "estado_venta", // esta sí es válida porque está en VentaProspecto
          attributes: ["id_estado", "nombre"]
        },
        {
          model: SeguimientoVenta,
          as: "seguimientos",
          where: { eliminado: 0 },
          required: false,
          include: [
            { model: TipoSeguimiento, as: "tipo_seguimiento", attributes: ["descripcion"] }
          ],
        },
      ],
    });

    // Si hay filtro de seguimiento, filtras en memoria
    if (seguimiento && seguimiento !== "todos") {
      rows = rows.filter((venta) => {
        const seguimientos = venta.seguimientos || [];
        if (seguimientos.length === 0) return seguimiento === "sin_seguimiento";

        // Buscar el pendiente más próximo
        const pendientes = seguimientos
          .filter(s => s.estado === "pendiente")
          .sort((a, b) => new Date(a.fecha_programada) - new Date(b.fecha_programada));

        if (pendientes.length > 0) {
          const siguientePendiente = pendientes[0];
          const fechaProgramada = new Date(siguientePendiente.fecha_programada);
          const hoy = new Date();
          hoy.setHours(0, 0, 0, 0);
          fechaProgramada.setHours(0, 0, 0, 0);

          const diffDias = (fechaProgramada - hoy) / (1000 * 60 * 60 * 24);

          switch (seguimiento) {
            case "vencido":
              return diffDias < 0;
            case "hoy":
              return diffDias === 0;
            case "proximo":
              return diffDias > 0 && diffDias <= 7;
            case "futuro":
              return diffDias > 7;
            default:
              return false;
          }
        }

        // Si no hay pendientes, buscar el último realizado
        const realizados = seguimientos
          .filter(s => s.estado === "realizado")
          .sort((a, b) => new Date(b.fecha_programada) - new Date(a.fecha_programada));

        if (realizados.length > 0) {
          return seguimiento === "realizado";
        }

        // Si no hay nada, es sin seguimiento
        return seguimiento === "sin_seguimiento";
      });
    }


    // Siempre después del filtro calcula paginación
    const total = rows.length;
    const paginados = rows.slice((page - 1) * limit, page * limit);

    res.json({
      total,
      totalPages: Math.ceil(total / limit),
      page: parseInt(page),
      prospecciones: paginados
    });

  } catch (error) {
    console.error("Error al obtener prospecciones agrupadas:", error);
    res.status(500).json({ message: "Error al obtener prospecciones", error });
  }
};


// Actualizar el monto de una venta ganada
const actualizarMontoCierre = async (req, res) => {
  try {
    const { id_venta, monto } = req.body;

    const venta = await VentaProspecto.findByPk(id_venta);
    if (!venta || venta.eliminado === 1) {
      return res.status(404).json({ message: "Venta no encontrada" });
    }

    venta.monto_cierre = monto;
    await venta.save();

    res.json({ message: "Monto de cierre actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar monto de cierre:", error);
    res.status(500).json({ message: "Error al actualizar monto", error });
  }
};

const reabrirVenta = async (req, res) => {
  try {
    const { id_venta } = req.params;
    const { nota, fecha_programada } = req.body;

    const venta = await VentaProspecto.findByPk(id_venta, {
      include: [
        { model: EstadoProspecto, as: "estado_venta" },
        { model: Prospecto, as: "prospecto" },
      ],
    });

    if (!venta || venta.eliminado === 1) {
      return res.status(404).json({ message: "Venta no encontrada" });
    }

    if (venta.abierta === 1) {
      return res.status(400).json({ message: "La venta ya está abierta" });
    }

    if (!venta.estado_venta || venta.estado_venta.nombre !== "Competencia") {
      return res.status(400).json({ message: "Solo se pueden reabrir ventas en estado 'Competencia'" });
    }

    const estadoInicial = await EstadoProspecto.findOne({ where: { nombre: ESTADO_INICIAL_VENTA } });
    if (!estadoInicial) {
      return res.status(500).json({ message: `No se encontró el estado '${ESTADO_INICIAL_VENTA}' en la base de datos` });
    }

    venta.abierta = 1;
    venta.fecha_cierre = null;
    venta.id_estado = estadoInicial.id_estado;
    await venta.save();

    await SeguimientoVenta.create({
      id_venta: venta.id_venta,
      cedula_vendedora: venta.prospecto.cedula_vendedora,
      fecha_programada: new Date(fecha_programada),
      id_tipo: 5,
      motivo: "Reapertura",
      resultado: "Reabierto",
      nota,
      estado: "realizado",
    });

    const cedula = req.usuario?.cedula_ruc;
    await registrarActividad(cedula, { modulo: "venta", accion: "reabrir venta", referencia_id: venta.id_venta, descripcion: "Reabrió la venta" });
    if (venta.id_prospecto) {
      await agregarHistorialProspecto(venta.id_prospecto, cedula, "evento", "Reabrió la prospección.");
    }

    res.json({ message: "Venta reabierta exitosamente" });
  } catch (error) {
    console.error("Error al reabrir venta:", error);
    res.status(500).json({ message: "Error al reabrir venta", error });
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
  obtenerProspeccionesAgrupadas,
  actualizarMontoCierre,
  reabrirVenta
};
