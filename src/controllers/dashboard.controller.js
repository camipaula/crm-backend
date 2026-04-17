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

// ACTUALIZADO CON TUS NUEVOS NOMBRES DE LA BASE DE DATOS
const ORDEN_ESTADOS = [
  "Captación",
  "Citas",
  "Cotizaciones/ensayo",
  "Seguimiento",
  "Cierre de venta",
  "Prospección declinada",
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

    // 1. Consulta principal (Respetando el filtro de fechas)
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

    const ventasGanadas = ventas.filter(v => v.estado_venta?.nombre === "Cierre de venta");
    const ventasPerdidas = ventas.filter(v => {
      const estado = (v.estado_venta?.nombre || "").toLowerCase().trim();
      return estado === "competencia" || estado === "prospección declinada" || estado === "prospeccion declinada";
    });
    const ventasCerradas = ventas.filter(v => v.abierta === 0);
    const ventasAbiertasReales = ventas.filter(v => v.abierta === 1);
    const totalVentasAbiertas = ventasAbiertasReales.length;

    const valorPipeline = ventasAbiertasReales.reduce((acc, v) => acc + (Number(v.monto_proyectado) || 0), 0);

    const porcentajeGanadas = totalVentas > 0 ? (ventasGanadas.length / totalVentas) * 100 : 0;
    const porcentajePerdidas = totalVentas > 0 ? (ventasPerdidas.length / totalVentas) * 100 : 0;
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
        numero_empleados: v.prospecto.empleados ?? "No registrado",
      };
    });

    const promedioDiasCierre = tablaCierres.length > 0
      ? Math.round(tablaCierres.reduce((sum, r) => sum + r.dias, 0) / tablaCierres.length) : 0;
    const promedioMontoCierre = tablaCierres.length > 0
      ? Math.round(tablaCierres.reduce((sum, r) => sum + (r.monto || 0), 0) / tablaCierres.length) : 0;

    const normalizarTexto = (texto) => {
      if (!texto) return "";
      return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    };

    const resumenEstadosVenta = {};
    ORDEN_ESTADOS.forEach(estado => resumenEstadosVenta[estado] = 0); 
    
    ventas.forEach(v => {
      const estadoDB = normalizarTexto(v.estado_venta?.nombre);
      const estadoCoincidente = ORDEN_ESTADOS.find(e => normalizarTexto(e) === estadoDB);
      if (estadoCoincidente) {
        resumenEstadosVenta[estadoCoincidente]++;
      }
    });

    const graficoEstadosProspecto = ORDEN_ESTADOS.map(estado => ({
      estado,
      cantidad: resumenEstadosVenta[estado],
      porcentaje: totalVentas > 0 ? ((resumenEstadosVenta[estado] / totalVentas) * 100).toFixed(2) : 0,
    }));

    const metricasVendedorasMap = {};
    ventas.forEach(v => {
      const nombreVend = v.prospecto?.vendedora_prospecto?.nombre || "No asignada";
      if (!metricasVendedorasMap[nombreVend]) {
        metricasVendedorasMap[nombreVend] = { ganadas: 0, perdidas: 0, abiertas: 0, montoGenerado: 0 };
      }
      
      if (v.estado_venta?.nombre === "Cierre de venta") {
        metricasVendedorasMap[nombreVend].ganadas++;
        metricasVendedorasMap[nombreVend].montoGenerado += (Number(v.monto_cierre) || 0);
      } else if (v.abierta === 1) {
        metricasVendedorasMap[nombreVend].abiertas++;
      } else {
        metricasVendedorasMap[nombreVend].perdidas++;
      }
    });

    const rendimientoVendedoras = Object.entries(metricasVendedorasMap).map(([nombre, stats]) => {
      const totalGestionadas = stats.ganadas + stats.perdidas;
      const winRate = totalGestionadas > 0 ? ((stats.ganadas / totalGestionadas) * 100).toFixed(1) : 0;
      return { vendedora: nombre, ...stats, winRate: parseFloat(winRate) };
    }).sort((a, b) => b.montoGenerado - a.montoGenerado); 

    // =========================================================
    // 2. NUEVA CONSULTA: Gráfica YoY (IGNORA EL FILTRO DE FECHAS)
    // =========================================================
    // Traemos TODAS las ventas (sin importar fecha_inicio/fecha_fin) pero respetando
    // si el admin filtró por vendedora, ciudad, etc.
    const ventasAnuales = await VentaProspecto.findAll({
      where: { eliminado: 0 }, 
      include: [
        {
          model: Prospecto,
          as: "prospecto",
          where: filtrosProspecto, // Respeta vendedora, sector, ciudad
          required: true
        },
        {
          model: EstadoProspecto,
          as: "estado_venta",
          attributes: ["nombre"]
        }
      ]
    });

    const ventasAnualesGanadas = ventasAnuales.filter(v => v.estado_venta?.nombre === "Cierre de venta");

    const datosYoY = {};
    const mesesAbreviados = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    
    mesesAbreviados.forEach(m => { datosYoY[m] = { mes: m }; });

    const anioActual = new Date().getFullYear();
    const anioPasado = anioActual - 1;

    ventasAnualesGanadas.forEach(v => {
      const fecha = new Date(v.fecha_cierre || v.created_at);
      const mesNombre = mesesAbreviados[fecha.getMonth()];
      const anioVenta = fecha.getFullYear();
      
      if (anioVenta === anioActual || anioVenta === anioPasado) {
        if (!datosYoY[mesNombre][anioVenta]) {
          datosYoY[mesNombre][anioVenta] = 0;
        }
        datosYoY[mesNombre][anioVenta] += (Number(v.monto_cierre) || 0);
      }
    });

    const comparativaAnual = Object.values(datosYoY);
    // =========================================================

    const resumenCategorias = {};
    ventas.forEach(v => {
      const categoria = v.prospecto?.categoria_prospecto?.nombre || "Sin categoría";
      resumenCategorias[categoria] = (resumenCategorias[categoria] || 0) + 1;
    });
    const graficoCategorias = Object.entries(resumenCategorias).map(([categoria, cantidad]) => ({ categoria, cantidad }));

    const graficoVentas = [
      { estado: "Abiertas", cantidad: totalVentasAbiertas, descripcion: "En pipeline" },
      { estado: "Ganadas", cantidad: ventasGanadas.length, descripcion: "Cierre de venta" },
      { estado: "Perdidas", cantidad: ventasPerdidas.length, descripcion: "Perdidas o Declinadas" },
    ];

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

    const tablaAbiertas = ventasAbiertasReales.map(v => {
      const prospecto = v.prospecto;
      const vendedora = prospecto?.vendedora_prospecto?.nombre || "No asignada";
      const siguienteSeguimiento = (v.seguimientos || [])
        .filter(s => s.estado === "pendiente")
        .sort((a, b) => new Date(a.fecha_programada) - new Date(b.fecha_programada))[0];
      const tipoSeguimiento = siguienteSeguimiento?.tipo_seguimiento?.descripcion || "-";
      const fechaSeguimiento = siguienteSeguimiento?.fecha_programada
        ? new Date(siguienteSeguimiento.fecha_programada).toLocaleDateString("es-EC") : "-";

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

    const tablaDeclinadas = ventas.filter(v => v.estado_venta?.nombre === "Prospección declinada" || v.estado_venta?.nombre === "Competencia")
    .map(v => ({
      id_venta: v.id_venta,
      prospecto: v.prospecto.nombre,
      fecha_apertura: new Date(v.created_at),
      fecha_cierre: v.fecha_cierre ? new Date(v.fecha_cierre) : null,
      motivo_declinacion: v.motivo_declinacion || "Sin motivo registrado",
      observacion_declinacion: v.observacion_declinacion || "Sin observación",
      estado: v.estado_venta?.nombre,
      vendedora: v.prospecto?.vendedora_prospecto?.nombre || "No asignada"
    }));

    return res.json({
      totalVentas,
      totalVentasAbiertas,
      totalVentasGanadas: ventasGanadas.length,
      totalVentasPerdidas: ventasPerdidas.length,
      totalVentasCerradas: ventasCerradas.length,
      valorPipeline, 
      porcentajeGanadas,
      porcentajePerdidas,
      promedioDiasCierre,
      promedioMontoCierre,
      rendimientoVendedoras, 
      comparativaAnual, 
      graficoVentas,
      graficoEstadosProspecto, 
      graficoCategorias,
      tablaCierres,
      tablaCompetencia,
      tablaAbiertas,
      tablaDeclinadas,
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