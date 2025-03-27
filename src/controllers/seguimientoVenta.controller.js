const Prospecto = require("../models/Prospecto.model");
const SeguimientoVenta = require("../models/SeguimientoVenta.model");
const VentaProspecto = require("../models/VentaProspecto.model");
const Usuario = require("../models/Usuario.model");
const TipoSeguimiento = require("../models/TipoSeguimiento.model");
const { Op } = require("sequelize");
const ExcelJS = require("exceljs");

function parseLocalDatetime(datetimeStr) {
  // datetimeStr: "2025-03-27T10:00"
  const [datePart, timePart] = datetimeStr.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  return new Date(year, month - 1, day, hour, minute); // Date en hora local
}


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
        estado: "pendiente",
      },
      include: [
        {
          model: VentaProspecto,
          as: "venta",
          attributes: ["objetivo"],
          include: [
            {
              model: Prospecto,
              as: "prospecto",
              attributes: ["nombre"],
            },
          ],
        },
        { model: TipoSeguimiento, as: "tipo_seguimiento", attributes: ["descripcion"] },
      ],
      order: [["fecha_programada", "ASC"]],
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

    const fechaUTC = parseLocalDatetime(fecha_programada);

const nuevoSeguimiento = await SeguimientoVenta.create({
  id_venta,
  cedula_vendedora,
  fecha_programada: fechaUTC, // Esto ya será en hora local
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

// Registrar el resultado de un seguimiento
const registrarResultadoSeguimiento = async (req, res) => {
  try {
    const { id_seguimiento } = req.params;
    const { resultado, nota, estado } = req.body; // Recibimos el nuevo estado del prospecto

    // Buscar el seguimiento con la venta y el prospecto
    const seguimiento = await SeguimientoVenta.findByPk(id_seguimiento, {
      include: [
        {
          model: VentaProspecto,
          as: "venta",
          include: [{ model: Prospecto, as: "prospecto" }],
        },
      ],
    });

    if (!seguimiento) return res.status(404).json({ message: "Seguimiento no encontrado" });

    // Marcar el seguimiento como realizado
    seguimiento.resultado = resultado;
    seguimiento.nota = nota;
    seguimiento.estado = "realizado";
    await seguimiento.save();

    const venta = seguimiento.venta;
    const prospecto = venta.prospecto;

    // 🔹 Si el estado del prospecto es "ganado" o "perdido", cerrar la venta
    if (["ganado", "perdido"].includes(estado)) {
      venta.abierta = 0;
      venta.fecha_cierre = new Date();
      await venta.save();

      // 🔹 Verificar si el prospecto tiene otra venta abierta
      const tieneOtraVentaAbierta = await VentaProspecto.findOne({
        where: { id_prospecto: prospecto.id_prospecto, abierta: 1 },
      });

      // Si hay otra venta abierta, lo dejamos como interesado, si no, lo ponemos como ganado o perdido
      prospecto.estado = tieneOtraVentaAbierta ? "interesado" : estado;
    } else {
      // Si no es cierre de venta, simplemente actualizamos con el estado enviado
      prospecto.estado = estado;
    }

    await prospecto.save();


    res.json({ message: "Seguimiento actualizado correctamente", seguimiento, venta, prospecto });
  } catch (error) {
    console.error("Error al actualizar seguimiento:", error);
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

// Exportar Seguimientos a Excel con filtros
const exportarSeguimientos = async (req, res) => {
  try {
    const { cedula_vendedora, id_prospecto, estado_venta } = req.query;

    const whereClause = {};

    // Filtrar por vendedora si se proporciona
    if (cedula_vendedora) {
      whereClause["$venta.prospecto.cedula_vendedora$"] = cedula_vendedora;
    }

    // Filtrar por prospecto si se proporciona
    if (id_prospecto) {
      whereClause["$venta.id_prospecto$"] = id_prospecto;
    }

    // Filtrar por estado de la venta si se proporciona
    if (estado_venta === "abiertas") {
      whereClause["$venta.abierta$"] = 1;
    } else if (estado_venta === "cerradas") {
      whereClause["$venta.abierta$"] = 0;
    }

    const seguimientos = await SeguimientoVenta.findAll({
      where: whereClause,
      include: [
        {
          model: VentaProspecto,
          as: "venta",
          attributes: ["objetivo"], // Nombre de la venta
          include: [
            { model: Prospecto, as: "prospecto", attributes: ["nombre"] },
          ],
        },
        { model: Usuario, as: "vendedora_seguimiento", attributes: ["nombre"] },
        { model: TipoSeguimiento, as: "tipo_seguimiento", attributes: ["descripcion"] },
      ],
      order: [["fecha_programada", "ASC"]],
    });

    if (seguimientos.length === 0) {
      return res.status(404).json({ message: "No hay seguimientos que coincidan con los filtros aplicados" });
    }

    // Crear un nuevo libro de Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Seguimientos");

    // Definir encabezados
    sheet.columns = [
      { header: "ID", key: "id_seguimiento", width: 10 },
      { header: "Prospecto", key: "prospecto", width: 20 },
      { header: "Vendedora", key: "vendedora", width: 20 },
      { header: "Venta", key: "venta", width: 30 }, // Nueva columna con el nombre de la venta
      { header: "Fecha Programada", key: "fecha_programada", width: 20 },
      { header: "Tipo de Seguimiento", key: "tipo_seguimiento", width: 25 },
      { header: "Estado", key: "estado", width: 15 },
      { header: "Resultado", key: "resultado", width: 20 },
      { header: "Nota", key: "nota", width: 40 },
    ];

    // Agregar datos a las filas
    seguimientos.forEach((s) => {
      sheet.addRow({
        id_seguimiento: s.id_seguimiento,
        prospecto: s.venta?.prospecto?.nombre || "Sin Prospecto",
        vendedora: s.vendedora_seguimiento?.nombre || "No asignada",
        venta: s.venta?.objetivo || "Sin Venta", // Aquí agregamos el nombre de la venta
        fecha_programada: s.fecha_programada ? new Date(s.fecha_programada).toLocaleDateString("es-EC") : "Sin fecha",
        tipo_seguimiento: s.tipo_seguimiento?.descripcion || "Sin tipo",
        estado: s.estado,
        resultado: s.resultado || "Pendiente",
        nota: s.nota || "Sin nota",
      });
    });

    // Configurar la respuesta HTTP para descargar el archivo
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=seguimientos.xlsx");

    // Enviar el archivo
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error al exportar seguimientos:", error);
    res.status(500).json({ message: "Error al exportar seguimientos", error });
  }
};

const obtenerAgendaGeneral = async (req, res) => {
  try {
    const { cedula_vendedora } = req.query; // 🔹 Si hay filtro por vendedora

    let whereCondition = {};
    if (cedula_vendedora) {
      whereCondition.cedula_vendedora = cedula_vendedora;
    }

    const agenda = await SeguimientoVenta.findAll({
      where: { estado: "pendiente", ...whereCondition }, // 🔹 Solo seguimientos pendientes
      include: [
        {
          model: VentaProspecto,
          as: "venta",
          attributes: ["objetivo"],
          include: [
            {
              model: Prospecto,
              as: "prospecto",
              attributes: ["nombre"],
            },
          ],
        },
        { model: Usuario, as: "vendedora_seguimiento", attributes: ["nombre", "cedula_ruc"] },
        { model: TipoSeguimiento, as: "tipo_seguimiento", attributes: ["descripcion"] },
      ],
      order: [["fecha_programada", "ASC"]],
    });

    res.json(agenda);
  } catch (error) {
    console.error("Error al obtener agenda general:", error);
    res.status(500).json({ message: "Error al obtener agenda", error });
  }
};

// Editar un seguimiento pendiente
const editarSeguimiento = async (req, res) => {
  try {
    const { id_seguimiento } = req.params;
    const { fecha_programada, id_tipo, motivo } = req.body;

    const seguimiento = await SeguimientoVenta.findByPk(id_seguimiento);

    if (!seguimiento) {
      return res.status(404).json({ message: "Seguimiento no encontrado" });
    }

    if (seguimiento.estado !== "pendiente") {
      return res.status(400).json({ message: "Solo se pueden editar seguimientos pendientes" });
    }
    
    if (fecha_programada) {
      seguimiento.fecha_programada = parseLocalDatetime(fecha_programada);
    }
    

    seguimiento.fecha_programada = fecha_programada || seguimiento.fecha_programada;
    seguimiento.id_tipo = id_tipo || seguimiento.id_tipo;
    seguimiento.motivo = motivo || seguimiento.motivo;

    await seguimiento.save();

    res.json({ message: "Seguimiento actualizado correctamente", seguimiento });
  } catch (error) {
    console.error("Error al editar seguimiento:", error);
    res.status(500).json({ message: "Error al editar seguimiento", error });
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
  obtenerTiposSeguimiento,
  exportarSeguimientos,
  obtenerAgendaGeneral,
  editarSeguimiento
};
