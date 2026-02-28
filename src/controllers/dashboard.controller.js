const { Sequelize, Op } = require("sequelize");
const Prospecto = require("../models/Prospecto.model");
const VentaProspecto = require("../models/VentaProspecto.model");
const EstadoProspecto = require("../models/EstadoProspecto.model");
const Usuario = require("../models/Usuario.model");
const SeguimientoVenta = require("../models/SeguimientoVenta.model");
const CategoriaProspecto = require("../models/CategoriaProspecto.model");
const OrigenProspecto = require("../models/OrigenProspecto.model");
const TipoSeguimiento = require("../models/TipoSeguimiento.model");

const ESTADOS_CIERRE = "Cierre de venta";
const ORDEN_ESTADOS = [
  "Captación/ensayo",
  "Citas",
  "Cotizaciones",
  "Seguimiento",
  "Cierre de venta",
];

const obtenerDashboard = async (req, res) => {
  try {
    const {
      fecha_inicio,
      fecha_fin,
      cedula_vendedora,
      id_categoria,
      id_origen,
      sector,
      ciudad,
    } = req.query;

    const filtrosVenta = { eliminado: 0 };
    const filtrosProspecto = { eliminado: 0 };

    if (fecha_inicio && fecha_fin) {
      const fechaInicioDate = new Date(fecha_inicio);
      const fechaFinDate = new Date(fecha_fin);
      fechaFinDate.setHours(23, 59, 59, 999);
      filtrosVenta.created_at = {
        [Op.between]: [fechaInicioDate, fechaFinDate],
      };
    }

    if (cedula_vendedora) filtrosProspecto.cedula_vendedora = cedula_vendedora;
    if (id_categoria) filtrosProspecto.id_categoria = id_categoria;
    if (id_origen) filtrosProspecto.id_origen = id_origen;
    if (sector) filtrosProspecto.sector = sector;
    if (ciudad) filtrosProspecto.ciudad = ciudad;

    // Opciones de filtros para mostrar bien a la vista en el front
    const [vendedoras, categorias, origenes] = await Promise.all([
      Usuario.findAll({
        where: { rol: "vendedora", estado: 1 },
        attributes: ["cedula_ruc", "nombre"],
        order: [["nombre", "ASC"]],
      }),
      CategoriaProspecto.findAll({
        attributes: ["id_categoria", "nombre"],
        order: [["nombre", "ASC"]],
      }),
      OrigenProspecto.findAll({
        attributes: ["id_origen", "descripcion"],
        order: [["id_origen", "ASC"]],
      }),
    ]);

    // Buscar ventas con prospecto y sus relaciones
    const ventas = await VentaProspecto.findAll({
      where: filtrosVenta,
      include: [
        {
          model: Prospecto,
          as: "prospecto",
          where: filtrosProspecto,
          required: true,
          attributes: ["nombre", "empleados"],
          include: [
            { model: Usuario, as: "vendedora_prospecto", attributes: ["nombre"] },
            { model: CategoriaProspecto, as: "categoria_prospecto", attributes: ["nombre"] }

          ]
        },
        {
          model: EstadoProspecto,
          as: "estado_venta",
          attributes: ["nombre"]
        },
        {
          model: SeguimientoVenta,
          as: "seguimientos",
          where: { eliminado: 0 },
          required: false,
          order: [["fecha_programada", "DESC"]],
          limit: 1,
          include: [
            {
              model: TipoSeguimiento,
              as: "tipo_seguimiento",
              attributes: ["descripcion"]
            }
          ]
        }

      ]
    });



    const totalVentas = ventas.length;
    const ventasGanadas = ventas.filter(v => v.estado_venta?.nombre === ESTADOS_CIERRE);
    const ventasPerdidas = ventas.filter(v => v.estado_venta?.nombre === "Competencia");
    const ventasCerradas = ventas.filter(v => v.abierta === 0);

    // Abiertas = todas las que NO están en Cierre de venta (aún en pipeline)
    const totalVentasAbiertas = ventas.filter(
      v => v.estado_venta?.nombre !== ESTADOS_CIERRE
    ).length;

    const porcentajeGanadas = totalVentas > 0
      ? (ventasGanadas.length / totalVentas) * 100
      : 0;

    const porcentajePerdidas = totalVentas > 0
      ? (ventasPerdidas.length / totalVentas) * 100
      : 0;

    const porcentajeCerradas = totalVentas > 0 ? (ventasCerradas.length / totalVentas) * 100 : 0;

    const tablaCierres = ventasGanadas.map(v => {
      const creada = new Date(v.created_at);
      const cerrada = v.fecha_cierre ? new Date(v.fecha_cierre) : null;
      const dias = cerrada ? Math.ceil((cerrada - creada) / (1000 * 60 * 60 * 24)) : 0;
      return {
        id_venta: v.id_venta,
        prospecto: v.prospecto.nombre,
        fecha_apertura: creada,
        fecha_cierre: cerrada,
        dias,
        monto_proyectado: v.monto_proyectado ?? null,
        monto: v.monto_cierre || 0,
        numero_empleados: v.prospecto.empleados !== null && v.prospecto.empleados !== undefined
          ? v.prospecto.empleados
          : "No registrado",
      };
    });



    const promedioDiasCierre = tablaCierres.length > 0
      ? Math.round(tablaCierres.reduce((sum, r) => sum + r.dias, 0) / tablaCierres.length)
      : 0;

    const promedioMontoCierre = tablaCierres.length > 0
      ? Math.round(tablaCierres.reduce((sum, r) => sum + (r.monto || 0), 0) / tablaCierres.length)
      : 0;


    // Agrupar prospectos por categoría
    const resumenCategorias = {};

    ventas.forEach(v => {
      const categoria = v.prospecto?.categoria_prospecto?.nombre || "Sin categoría";
      resumenCategorias[categoria] = (resumenCategorias[categoria] || 0) + 1;
    });

    const graficoCategorias = Object.entries(resumenCategorias).map(([nombre, cantidad]) => ({
      categoria: nombre,
      cantidad
    }));


    const graficoVentas = [
      { estado: "Abiertas", cantidad: totalVentasAbiertas, descripcion: "En pipeline (no cerradas)" },
      { estado: "Ganadas", cantidad: ventasGanadas.length, descripcion: "Cierre de venta" },
      { estado: "Perdidas", cantidad: ventasPerdidas.length, descripcion: "Competencia" },
    ];

    const resumenEstadosVenta = {};
    ventas.forEach(v => {
      const estado = v.estado_venta?.nombre || "Desconocido";
      resumenEstadosVenta[estado] = (resumenEstadosVenta[estado] || 0) + 1;
    });

    const normalizarEstado = (estado) =>
      ORDEN_ESTADOS.find(e => e.toLowerCase() === (estado || "").toLowerCase()) || estado;

    const graficoEstadosProspecto = Object.entries(resumenEstadosVenta)
      .map(([estado, cantidad]) => ({
        estado: normalizarEstado(estado),
        cantidad,
        porcentaje: totalVentas > 0 ? ((cantidad / totalVentas) * 100).toFixed(2) : 0,
      }))
      .sort(
        (a, b) =>
          ORDEN_ESTADOS.indexOf(normalizarEstado(a.estado)) -
          ORDEN_ESTADOS.indexOf(normalizarEstado(b.estado))
      );


    // Filtrar prospecciones en competencia
    const tablaCompetencia = ventasPerdidas.map(v => {
      const ultimoSeguimiento = v.seguimientos?.[0];

      return {
        id_venta: v.id_venta,
        prospecto: v.prospecto.nombre,
        fecha_apertura: new Date(v.created_at),
        estado: v.estado_venta?.nombre || "Sin estado",
        ultimo_resultado: ultimoSeguimiento?.resultado || "Sin resultado"
      };
    });


    const tablaAbiertas = ventas
      .filter(v => v.estado_venta?.nombre !== ESTADOS_CIERRE)
      .map(v => {
        const prospecto = v.prospecto;
        const vendedora = prospecto?.vendedora_prospecto?.nombre || "No asignada";

        const siguienteSeguimiento = (v.seguimientos || [])
          .filter(s => s.estado === "pendiente")
          .sort((a, b) => new Date(a.fecha_programada) - new Date(b.fecha_programada))[0];

        const tipoSeguimiento = siguienteSeguimiento?.tipo_seguimiento?.descripcion || "-";
        const fechaSeguimiento = siguienteSeguimiento?.fecha_programada
          ? new Date(siguienteSeguimiento.fecha_programada).toLocaleDateString("es-EC")
          : "-";

        return {
          id_venta: v.id_venta,
          prospecto: prospecto.nombre,
          numero_empleados: prospecto.empleados ?? "No registrado",
          fecha_apertura: new Date(v.created_at),
          estado: v.estado_venta?.nombre || "-",
          motivo: siguienteSeguimiento?.motivo || "-",
          proximo_paso: `${tipoSeguimiento} ${fechaSeguimiento}`,
          vendedora: vendedora,
          objetivo: v.objetivo,
      nota: siguienteSeguimiento?.nota || "-",
        };
      });



    return res.json({
      totalVentas,
      totalVentasAbiertas,
      totalVentasGanadas: ventasGanadas.length,
      totalVentasPerdidas: ventasPerdidas.length,
      totalVentasCerradas: ventasCerradas.length,
      porcentajeGanadas,
      porcentajePerdidas,
      promedioDiasCierre,
      promedioMontoCierre,
      tablaCierres,
      tablaCompetencia,
      tablaAbiertas,
      graficoVentas,
      graficoEstadosProspecto,
      graficoCategorias,
      filtrosAplicados: {
        fecha_inicio: fecha_inicio || null,
        fecha_fin: fecha_fin || null,
        cedula_vendedora: cedula_vendedora || null,
        id_categoria: id_categoria || null,
        id_origen: id_origen || null,
        sector: sector || null,
        ciudad: ciudad || null,
      },
      filtrosDisponibles: {
        vendedoras: vendedoras.map((u) => ({ cedula_ruc: u.cedula_ruc, nombre: u.nombre })),
        categorias: categorias.map((c) => ({ id_categoria: c.id_categoria, nombre: c.nombre })),
        origenes: origenes.map((o) => ({ id_origen: o.id_origen, descripcion: o.descripcion })),
      },
    });



  } catch (error) {
    console.error(" Error en dashboard:", error);
    return res.status(500).json({ message: "Error obteniendo dashboard", error: error.message });
  }
};

module.exports = { obtenerDashboard };
