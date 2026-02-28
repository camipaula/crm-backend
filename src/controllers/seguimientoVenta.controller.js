const Prospecto = require("../models/Prospecto.model");
const SeguimientoVenta = require("../models/SeguimientoVenta.model");
const VentaProspecto = require("../models/VentaProspecto.model");
const Usuario = require("../models/Usuario.model");
const TipoSeguimiento = require("../models/TipoSeguimiento.model");
const EstadoProspecto = require("../models/EstadoProspecto.model");
const { registrarActividad, agregarHistorialProspecto } = require("../utils/audit");
const { Op } = require("sequelize");
const ExcelJS = require("exceljs");
const { enviarCorreoCierre } = require("../utils/correoUtils");

function parseLocalDatetime(datetimeStr) {
  const [datePart, timePart] = datetimeStr.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute)); // UTC real
}

// Obtener todos los seguimientos
const obtenerSeguimientos = async (req, res) => {
  try {
    const seguimientos = await SeguimientoVenta.findAll({
      where: { eliminado: 0 },
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

    const seguimiento = await SeguimientoVenta.findOne({
      where: { id_seguimiento, eliminado: 0 }, // Solo los no eliminados
      include: [
        {
          model: VentaProspecto,
          as: "venta",
          include: [
            {
              model: Prospecto,
              as: "prospecto"
            },
            {
              model: EstadoProspecto,
              as: "estado_venta",
              attributes: ["nombre"]
            }
          ]
        },
        {
          model: TipoSeguimiento,
          as: "tipo_seguimiento"
        }
      ]

    });

    if (!seguimiento) {
      return res.status(404).json({ message: "Seguimiento no encontrado" });
    }

    res.json(seguimiento);
  } catch (error) {
    console.error("Error al obtener seguimiento:", error);
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
          where: { cedula_vendedora: cedula_ruc }
        },
        {
          model: EstadoProspecto,
          as: "estado_venta", //  nuevo include correcto
          attributes: ["nombre"]
        },
        {
          model: SeguimientoVenta,
          as: "seguimientos",
          where: { eliminado: 0 },
          required: false,
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
        eliminado: 0
      },
      attributes: [
        "id_seguimiento",
        "fecha_programada",
        "duracion_minutos",
        "id_tipo",
        "motivo",
        "nota",
        "cedula_vendedora",
        "estado",
        "resultado"
      ],
      include: [
        {
          model: VentaProspecto,
          as: "venta",
          attributes: ["objetivo"],
          include: [
            {
              model: Prospecto,
              as: "prospecto",
              attributes: ["nombre"]
            },
            {
              model: EstadoProspecto,
              as: "estado_venta",
              attributes: ["nombre"]
            }
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
    const {
      id_venta,
      cedula_vendedora,
      fecha_programada,
      id_tipo,
      motivo,
      nota,
      duracion_minutos
    } = req.body;

    const fechaUTC = parseLocalDatetime(fecha_programada);

    const hoy = new Date();
    const maxFecha = new Date();
    maxFecha.setFullYear(hoy.getFullYear() + 1);

    if (fechaUTC > maxFecha) {
      return res.status(400).json({ message: "La fecha programada no puede ser mayor a un año desde hoy." });
    }

    const vendedoraAsignada = await Usuario.findByPk(cedula_vendedora);
    if (!vendedoraAsignada || vendedoraAsignada.estado === 0) {
      return res.status(400).json({ message: "No se puede asignar seguimiento a una vendedora inactiva." });
    }

    const nuevoSeguimiento = await SeguimientoVenta.create({
      id_venta,
      cedula_vendedora,
      fecha_programada: fechaUTC,
      duracion_minutos: Number.isInteger(duracion_minutos) ? duracion_minutos : 30,
      id_tipo,
      motivo: motivo?.toUpperCase(),
      nota: nota?.toUpperCase(),
      estado: "pendiente",
    });

    const cedula = req.usuario?.cedula_ruc;
    const venta = await VentaProspecto.findByPk(id_venta, { attributes: ["id_prospecto"] });
    const msg = motivo ? `Registró seguimiento: ${motivo}` : "Registró un seguimiento.";
    await registrarActividad(cedula, { modulo: "seguimiento", accion: "crear", referencia_id: nuevoSeguimiento.id_seguimiento, descripcion: msg });
    if (venta?.id_prospecto) {
      await agregarHistorialProspecto(venta.id_prospecto, cedula, "evento", msg);
    }

    res.status(201).json({
      message: "Seguimiento creado exitosamente",
      seguimiento: nuevoSeguimiento,
    });
  } catch (error) {
    console.error("Error al crear seguimiento:", error);
    res.status(500).json({ message: "Error al crear seguimiento", error });
  }
};


//Crear seguimiento con fecha automatica
const crearSeguimientoConHoraAutomatica = async (req, res) => {
  try {
    const { id_venta, cedula_vendedora, fecha_programada, id_tipo, motivo, nota } = req.body;

    if (!fecha_programada || !/^\d{4}-\d{2}-\d{2}$/.test(fecha_programada)) {
      return res.status(400).json({ message: "Se debe enviar la fecha en formato yyyy-mm-dd." });
    }

    const fechaSinHora = fecha_programada.split("T")[0];

    const bloques = [];
    for (let h = 8; h < 21; h++) {

      bloques.push(`${h.toString().padStart(2, "0")}:00`);
    }

    const yaAgendados = await SeguimientoVenta.findAll({
      where: {
        cedula_vendedora,
        eliminado: 0,
        estado: "pendiente",
        fecha_programada: {
          [Op.between]: [
            new Date(`${fechaSinHora}T00:00:00`),
            new Date(`${fechaSinHora}T23:59:59`)
          ]
        }
      }
    });

    const horasOcupadas = yaAgendados.map(s =>
      new Date(s.fecha_programada).toISOString().substring(11, 16)
    );

    const bloqueDisponible = bloques.find(hora => !horasOcupadas.includes(hora));

    if (!bloqueDisponible) {
      return res.status(400).json({ message: "No hay bloques disponibles ese día para la vendedora." });
    }

    const [hour, minute] = bloqueDisponible.split(":").map(Number);
    const [year, month, day] = fechaSinHora.split("-").map(Number);



    // Crea como UTC directamente para que se guarde como 08:00 real en la base
    const fechaFinal = new Date(Date.UTC(year, month - 1, day, hour, minute));


    const hoy = new Date();
    const maxFecha = new Date();
    maxFecha.setFullYear(hoy.getFullYear() + 1);

    if (fechaFinal > maxFecha) {
      return res.status(400).json({ message: "La fecha programada no puede ser mayor a un año desde hoy." });
    }


    const vendedora = await Usuario.findByPk(cedula_vendedora);
    if (!vendedora || vendedora.estado === 0) {
      return res.status(400).json({ message: "La vendedora está inactiva o no existe." });
    }

    const nuevoSeguimiento = await SeguimientoVenta.create({
      id_venta,
      cedula_vendedora,
      fecha_programada: fechaFinal,
      id_tipo,
      motivo: motivo?.toUpperCase(),
      nota: nota?.toUpperCase(),
      estado: "pendiente",
    });

    const cedula = req.usuario?.cedula_ruc;
    const venta = await VentaProspecto.findByPk(id_venta, { attributes: ["id_prospecto"] });
    const msg = motivo ? `Registró seguimiento: ${motivo}` : "Registró un seguimiento.";
    await registrarActividad(cedula, { modulo: "seguimiento", accion: "crear", referencia_id: nuevoSeguimiento.id_seguimiento, descripcion: msg });
    if (venta?.id_prospecto) {
      await agregarHistorialProspecto(venta.id_prospecto, cedula, "evento", msg);
    }

    console.log("HORA LOCAL:", fechaFinal.toString());
    console.log("ISO (UTC):", fechaFinal.toISOString());

    console.log(`Hora asignada automáticamente: ${fechaFinal.toISOString()} para vendedora ${cedula_vendedora}`);

    const horaImprimir = fechaFinal.toISOString().substring(11, 16);
    const [hora, minuto] = horaImprimir.split(":").map(Number);
    const esAM = hora < 12;
    const hora12 = hora % 12 === 0 ? 12 : hora % 12;
    const formatoFinal = `${hora12.toString().padStart(2, "0")}:${minuto.toString().padStart(2, "0")} ${esAM ? "a.m." : "p.m."}`;


    res.status(201).json({
      message: `Seguimiento creado exitosamente a las ${formatoFinal}`,
      seguimiento: nuevoSeguimiento,
      hora_formateada: formatoFinal
    });



  } catch (error) {
    console.error("Error al crear seguimiento automático:", error);
    res.status(500).json({ message: "Error al crear seguimiento", error });
  }
};






// Registrar el resultado de un seguimiento
const registrarResultadoSeguimiento = async (req, res) => {
  try {
    const { id_seguimiento } = req.params;
    const { resultado, nota, estado, monto_cierre } = req.body;

    const seguimiento = await SeguimientoVenta.findByPk(id_seguimiento, {
      include: [
        {
          model: VentaProspecto,
          as: "venta",
          include: [{ model: Prospecto, as: "prospecto" }],
        },
      ],
    });

    if (!seguimiento || seguimiento.eliminado === 1) {
      return res.status(404).json({ message: "Seguimiento no encontrado" });
    }

    // Marcar el seguimiento como realizado
    seguimiento.resultado = resultado?.toUpperCase();
    seguimiento.nota = nota?.toUpperCase();

    seguimiento.estado = "realizado";
    await seguimiento.save();

    // Obtener la venta y el prospecto
    const venta = seguimiento.venta;
    const prospecto = venta.prospecto;

    // Buscar el nuevo estado
    const nuevoEstado = await EstadoProspecto.findOne({ where: { nombre: estado } });
    if (!nuevoEstado) {
      return res.status(400).json({ message: `El estado '${estado}' no está registrado.` });
    }

    // Asignar el estado a la venta
    venta.id_estado = nuevoEstado.id_estado;

    // Si el estado es Cierre de venta o Competencia, cerrar la venta
    if (estado === "Cierre de venta") {
      if (!monto_cierre) {
        return res.status(400).json({ message: "Debes enviar el monto de cierre para una venta ganada." });
      }
      venta.abierta = 0;
      venta.fecha_cierre = new Date();
      venta.monto_cierre = monto_cierre;
    } else if (estado === "Competencia") {
      venta.abierta = 0;
      venta.fecha_cierre = new Date();
    }

    await venta.save();

    // RESPUESTA
    res.json({
      message: "Seguimiento actualizado correctamente",
      seguimiento,
      venta,
      prospecto,
    });

    // Enviar correo si es necesario (sin bloquear al usuario)
    if (estado === "Cierre de venta") {
      enviarCorreoCierre({ prospecto, estado: "Cierre de venta", monto: monto_cierre }).catch(console.error);
    } else if (estado === "Competencia") {
      enviarCorreoCierre({ prospecto, estado: "Competencia", monto: 0 }).catch(console.error);
    }

  } catch (error) {
    console.error("Error al actualizar seguimiento:", error);
    res.status(500).json({ message: "Error al actualizar seguimiento", error });
  }
};



/*// Eliminar un seguimiento
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
};*/

// Eliminar un seguimiento
const eliminarSeguimiento = async (req, res) => {
  try {
    const { id_seguimiento } = req.params;

    const seguimiento = await SeguimientoVenta.findByPk(id_seguimiento);
    if (!seguimiento || seguimiento.eliminado === 1) {
      return res.status(404).json({ message: "Seguimiento no encontrado" });
    }

    seguimiento.eliminado = 1;
    await seguimiento.save();

    res.json({ message: "Seguimiento eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar seguimiento:", error);
    res.status(500).json({ message: "Error al eliminar seguimiento", error });
  }
};



// Obtener el historial de seguimientos de una venta específica
const obtenerHistorialPorVenta = async (req, res) => {
  try {
    const { id_venta } = req.params;

    const historial = await SeguimientoVenta.findAll({
      where: { id_venta, eliminado: 0 },
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

    const whereClause = { eliminado: 0 };

    if (cedula_vendedora) {
      whereClause["$venta.prospecto.cedula_vendedora$"] = cedula_vendedora;
    }

    if (id_prospecto) {
      whereClause["$venta.id_prospecto$"] = id_prospecto;
    }

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
          attributes: ["objetivo"],
          include: [
            {
              model: Prospecto,
              as: "prospecto",
              attributes: ["nombre"]
            },
            {
              model: EstadoProspecto,
              as: "estado_venta",
              attributes: ["nombre"]
            }
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

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Seguimientos");

    sheet.columns = [
      { header: "ID", key: "id_seguimiento", width: 10 },
      { header: "Prospecto", key: "prospecto", width: 20 },
      { header: "Estado Prospecto", key: "estado_prospecto", width: 20 }, // ✅ nuevo campo
      { header: "Vendedora", key: "vendedora", width: 20 },
      { header: "Venta", key: "venta", width: 30 },
      { header: "Fecha Programada", key: "fecha_programada", width: 20 },
      { header: "Tipo de Seguimiento", key: "tipo_seguimiento", width: 25 },
      { header: "Estado", key: "estado", width: 15 },
      { header: "Resultado", key: "resultado", width: 20 },
      { header: "Nota", key: "nota", width: 40 },
    ];

    seguimientos.forEach((s) => {
      sheet.addRow({
        id_seguimiento: s.id_seguimiento,
        prospecto: s.venta?.prospecto?.nombre || "Sin Prospecto",
        estado_prospecto: s.venta?.estado_venta?.nombre || "Sin estado",
        vendedora: s.vendedora_seguimiento?.nombre || "No asignada",
        venta: s.venta?.objetivo || "Sin Venta",
        fecha_programada: s.fecha_programada
          ? new Date(s.fecha_programada).toLocaleDateString("es-EC")
          : "Sin fecha",
        tipo_seguimiento: s.tipo_seguimiento?.descripcion || "Sin tipo",
        estado: s.estado,
        resultado: s.resultado || "Pendiente",
        nota: s.nota || "Sin nota",
      });
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=seguimientos.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error al exportar seguimientos:", error);
    res.status(500).json({ message: "Error al exportar seguimientos", error });
  }
};

const obtenerAgendaGeneral = async (req, res) => {
  try {
    const { cedula_vendedora } = req.query;

    let whereCondition = {};
    if (cedula_vendedora) {
      whereCondition.cedula_vendedora = cedula_vendedora;
    }

    const agenda = await SeguimientoVenta.findAll({
      where: { estado: "pendiente", eliminado: 0, ...whereCondition },
      attributes: ["id_seguimiento", "fecha_programada", "duracion_minutos", "id_tipo", "motivo", "nota", "cedula_vendedora", "estado", "resultado"], // ✅ incluye duracion_minutos

      include: [
        {
          model: VentaProspecto,
          as: "venta",
          attributes: ["objetivo"],
          include: [
            {
              model: Prospecto,
              as: "prospecto",
              attributes: ["nombre"]
            },
            {
              model: EstadoProspecto,
              as: "estado_venta",
              attributes: ["nombre"]
            }
          ],
        },

        {
          model: Usuario,
          as: "vendedora_seguimiento",
          attributes: ["nombre", "cedula_ruc"],
        },
        {
          model: TipoSeguimiento,
          as: "tipo_seguimiento",
          attributes: ["descripcion"],
        },
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

    const seguimiento = await SeguimientoVenta.findByPk(id_seguimiento, {
      include: [
        {
          model: VentaProspecto,
          as: "venta",
          include: [
            {
              model: Prospecto,
              as: "prospecto",
              attributes: ["nombre"]
            },
            {
              model: EstadoProspecto,
              as: "estado_venta",
              attributes: ["nombre"]
            }
          ]

        }
      ]
    });

    if (!seguimiento || seguimiento.eliminado === 1) {
      return res.status(404).json({ message: "Seguimiento no encontrado" });
    }


    if (seguimiento.estado !== "pendiente") {
      return res.status(400).json({ message: "Solo se pueden editar seguimientos pendientes" });
    }

    if (fecha_programada) {
      seguimiento.fecha_programada = parseLocalDatetime(fecha_programada);
    }


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
  editarSeguimiento,
  crearSeguimientoConHoraAutomatica
};
