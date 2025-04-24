const { Sequelize, Op } = require("sequelize");
const Prospecto = require("../models/Prospecto.model");
const VentaProspecto = require("../models/VentaProspecto.model");
const EstadoProspecto = require("../models/EstadoProspecto.model");
const Usuario = require("../models/Usuario.model");

const estadosInteres = ["interesado", "cita", "proformado", "ensayo"];

const obtenerDashboard = async (req, res) => {
  try {
    const {
      fecha_inicio,
      fecha_fin,
      cedula_vendedora,
      id_categoria,
      id_origen,
      sector,
      ciudad
    } = req.query;

    const filtrosVenta = { eliminado: 0 };
    const filtrosProspecto = { eliminado: 0 };

    // Validar fechas antes de usarlas
    if (fecha_inicio && fecha_fin) {
      filtrosVenta.created_at = {
        [Op.between]: [new Date(fecha_inicio), new Date(fecha_fin)]
      };
      
    }

    if (cedula_vendedora) filtrosProspecto.cedula_vendedora = cedula_vendedora;
    if (id_categoria) filtrosProspecto.id_categoria = id_categoria;
    if (id_origen) filtrosProspecto.id_origen = id_origen;
    if (sector) filtrosProspecto.sector = sector;
    if (ciudad) filtrosProspecto.ciudad = ciudad;

    // Buscar ventas con prospecto y sus relaciones
    const ventas = await VentaProspecto.findAll({
      where: filtrosVenta,
      include: [
        {
          model: Prospecto,
          as: "prospecto",
          where: filtrosProspecto,
          required: true,
          include: [
            { model: EstadoProspecto, as: "estado_prospecto", attributes: ["nombre"] },
            { model: Usuario, as: "vendedora_prospecto", attributes: ["nombre"] }
          ]
        }
      ]
    });

    const totalVentas = ventas.length;
    const ventasCerradas = ventas.filter(v => v.abierta === 0);

    const ventasGanadas = ventasCerradas.filter(v => 
      v.prospecto.estado_prospecto?.nombre === "ganado"
    );
    const ventasPerdidas = ventasCerradas.filter(v => v.prospecto.estado_prospecto?.nombre === "perdido");

    const totalVentasAbiertas = ventas.filter(v => v.abierta === 1).length;

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
        prospecto: v.prospecto.nombre,
        fecha_apertura: creada,
        fecha_cierre: cerrada,
        dias,
        monto: v.monto_cierre || 0,
      };
    });


    
    const promedioDiasCierre = tablaCierres.length > 0
      ? Math.round(tablaCierres.reduce((sum, r) => sum + r.dias, 0) / tablaCierres.length)
      : 0;

    const promedioMontoCierre = tablaCierres.length > 0
      ? Math.round(tablaCierres.reduce((sum, r) => sum + (r.monto || 0), 0) / tablaCierres.length)
      : 0;




      const graficoVentas = [
        { estado: "Abiertas", cantidad: totalVentasAbiertas },
        { estado: "Ganadas", cantidad: ventasGanadas.length },
        { estado: "Perdidas", cantidad: ventasPerdidas.length }
      ];

    // Todos los prospectos para graficar estados
    const estadosProspectos = await Prospecto.findAll({
      where: filtrosProspecto,
      include: [
        { model: EstadoProspecto, as: "estado_prospecto", attributes: ["nombre"] }
      ]
    });

    const resumenEstados = {};
    estadosProspectos.forEach(p => {
      const estado = p.estado_prospecto?.nombre || "Desconocido";
      resumenEstados[estado] = (resumenEstados[estado] || 0) + 1;
    });

    const graficoEstadosProspecto = Object.entries(resumenEstados).map(([estado, cantidad]) => ({
      estado,
      cantidad
    }));

    const prospectosConInteres = estadosProspectos.filter(p =>
      estadosInteres.includes(p.estado_prospecto?.nombre)
    );

    const cerradosDesdeInteres = ventasCerradas.filter(v =>
      estadosInteres.includes(v.prospecto.estado_prospecto?.nombre)
    );

    const totalInteresados = prospectosConInteres.length;
    const porcentajeInteres = estadosProspectos.length > 0
      ? (totalInteresados / estadosProspectos.length) * 100
      : 0;

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
        graficoVentas,
        graficoEstadosProspecto,
        interes: {
          total: totalInteresados,
          porcentaje: porcentajeInteres,
          cerrados: ventasGanadas.filter(v =>
            estadosInteres.includes(v.prospecto.estado_prospecto?.nombre)
          ).length
        }
      });
      
      
      
  } catch (error) {
    console.error(" Error en dashboard:", error);
    return res.status(500).json({ message: "Error obteniendo dashboard", error: error.message });
  }
};

module.exports = { obtenerDashboard };
