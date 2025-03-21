const { Sequelize, Op } = require("sequelize");
const Prospecto = require("../models/Prospecto.model");
const SeguimientoVenta = require("../models/SeguimientoVenta.model");
const VentaProspecto = require("../models/VentaProspecto.model");
const Usuario = require("../models/Usuario.model");
const CategoriaProspecto = require("../models/CategoriaProspecto.model");

const obtenerDashboard = async (req, res) => {
  try {
    const { cedula_vendedora, mes } = req.query;
    let filtroVendedora = {};

    if (cedula_vendedora) {
      filtroVendedora = { cedula_vendedora };
    }

    // 1️⃣ Prospectos por Estado
    const prospectosPorEstado = await Prospecto.findAll({
      where: filtroVendedora,
      attributes: ["estado", [Sequelize.fn("COUNT", Sequelize.col("estado")), "cantidad"]],
      group: ["estado"],
    });

    // 2️⃣ Ventas Abiertas vs Cerradas
    const ventasAbiertasCerradas = await VentaProspecto.findAll({
      attributes: [
        [Sequelize.literal("CASE WHEN abierta = 1 THEN 'Abiertas' ELSE 'Cerradas' END"), "estado"],
        [Sequelize.fn("COUNT", Sequelize.col("id_venta")), "cantidad"],
      ],
      group: ["estado"],
    });

    // 3️⃣ Seguimientos Realizados vs Pendientes
    const seguimientosRealizadosPendientes = await SeguimientoVenta.findAll({
      attributes: ["estado", [Sequelize.fn("COUNT", Sequelize.col("estado")), "cantidad"]],
      group: ["estado"],
    });

    // 4️⃣ Prospectos por Categoría
    const prospectosPorCategoria = await Prospecto.findAll({
      attributes: [
        [Sequelize.col("categoria_prospecto.nombre"), "categoria"], // Nombre de la categoría
        [Sequelize.fn("COUNT", Sequelize.col("Prospecto.id_categoria")), "cantidad"], // Contar prospectos
      ],
      group: ["Prospecto.id_categoria", "categoria_prospecto.nombre"],
      include: [{ model: CategoriaProspecto, as: "categoria_prospecto", attributes: [] }], // Unir con categoría
    });
    

    // 5️⃣ Prospectos Nuevos por Mes y Vendedora
    let filtroFecha = {};
    if (mes) {
      filtroFecha = Sequelize.where(Sequelize.fn("MONTH", Sequelize.col("created_at")), mes);
    }

    const prospectosNuevos = await Prospecto.findAll({
      where: { ...filtroVendedora, ...filtroFecha },
      attributes: [
        "cedula_vendedora",
        [Sequelize.fn("COUNT", Sequelize.col("id_prospecto")), "cantidad"],
      ],
      group: ["cedula_vendedora"],
      include: [{ model: Usuario, as: "vendedora_prospecto", attributes: ["nombre"] }],
    });

    res.json({
      prospectosPorEstado,
      ventasAbiertasCerradas,
      seguimientosRealizadosPendientes,
      prospectosPorCategoria,
      prospectosNuevos,
    });
  } catch (error) {
    console.error("Error obteniendo dashboard:", error);
    res.status(500).json({ message: "Error obteniendo dashboard", error });
  }
};

module.exports = { obtenerDashboard };
