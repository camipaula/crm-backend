const { Sequelize, Op } = require("sequelize");
const Prospecto = require("../models/Prospecto.model");
const VentaProspecto = require("../models/VentaProspecto.model");
const EstadoProspecto = require("../models/EstadoProspecto.model");
const Usuario = require("../models/Usuario.model");

const estadosInteres = ["En Planeación", "En Atracción"];

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
            { model: Usuario, as: "vendedora_prospecto", attributes: ["nombre"] }
          ]
        },
        {
          model: EstadoProspecto,
          as: "estado_venta", // 👈 nuevo include correcto
          attributes: ["nombre"]
        }
      ]
    });
    

    const totalVentas = ventas.length;
    const ventasCerradas = ventas.filter(v => v.abierta === 0);

    const ventasGanadas = ventasCerradas.filter(v => 
      v.estado_venta?.nombre === "Cierre"
    );
    
    const ventasPerdidas = ventas.filter(v => 
  v.estado_venta?.nombre === "Competencia"
);

    
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
        id_venta: v.id_venta, 
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

      const resumenEstadosVenta = {};
      ventas.forEach(v => {
        const estado = v.estado_venta?.nombre || "Desconocido";
        resumenEstadosVenta[estado] = (resumenEstadosVenta[estado] || 0) + 1;
      });
      
      const graficoEstadosProspecto = Object.entries(resumenEstadosVenta).map(([estado, cantidad]) => ({
        estado,
        cantidad,
        porcentaje: totalVentas > 0 ? ((cantidad / totalVentas) * 100).toFixed(2) : 0
      }));
      
      // Filtrar prospecciones en competencia
const tablaCompetencia = ventasPerdidas.map(v => ({
  id_venta: v.id_venta,
  prospecto: v.prospecto.nombre,
  fecha_apertura: new Date(v.created_at),
estado: v.estado_venta?.nombre || "Sin estado"
}));

const tablaAbiertas = ventas
  .filter(v => v.abierta === 1)
  .map(v => ({
    prospecto: v.prospecto.nombre,
    fecha_apertura: new Date(v.created_at),
    estado: v.estado_venta?.nombre || "Sin estado"
  }));


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
      });
      
      
      
  } catch (error) {
    console.error(" Error en dashboard:", error);
    return res.status(500).json({ message: "Error obteniendo dashboard", error: error.message });
  }
};

module.exports = { obtenerDashboard };
