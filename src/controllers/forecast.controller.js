const ForecastMensual = require("../models/ForecastMensual.model");
const Usuario = require("../models/Usuario.model");
const CategoriaVenta = require("../models/CategoriaVenta.model");

const includeVendedoraCategoria = [
  { model: Usuario, as: "vendedora", attributes: ["cedula_ruc", "nombre"] },
  { model: CategoriaVenta, as: "categoria_venta", attributes: ["id_categoria_venta", "nombre"] },
];

/**
 * POST - Crear forecast (solo admin).
 * Body: anio, mes, cedula_vendedora, id_categoria_venta, monto_proyectado
 */
const createForecast = async (req, res) => {
  try {
    const { anio, mes, cedula_vendedora, id_categoria_venta, monto_proyectado } = req.body;

    if (!anio || !mes || !cedula_vendedora || !id_categoria_venta || monto_proyectado == null) {
      return res.status(400).json({
        message: "Faltan datos: anio, mes, cedula_vendedora, id_categoria_venta, monto_proyectado son requeridos.",
      });
    }

    const mesNum = parseInt(mes, 10);
    const anioNum = parseInt(anio, 10);
    if (mesNum < 1 || mesNum > 12) {
      return res.status(400).json({ message: "Mes debe estar entre 1 y 12." });
    }

    const existente = await ForecastMensual.findOne({
      where: {
        anio: anioNum,
        mes: mesNum,
        cedula_vendedora,
        id_categoria_venta,
      },
    });
    if (existente) {
      return res.status(409).json({
        message: "Ya existe un forecast para esa vendedora, categoría, año y mes. Use actualizar.",
        id_forecast: existente.id_forecast,
      });
    }

    const forecast = await ForecastMensual.create({
      anio: anioNum,
      mes: mesNum,
      cedula_vendedora,
      id_categoria_venta: parseInt(id_categoria_venta, 10),
      monto_proyectado: parseFloat(monto_proyectado),
    });

    const conRelaciones = await ForecastMensual.findByPk(forecast.id_forecast, {
      include: includeVendedoraCategoria,
    });
    return res.status(201).json(conRelaciones);
  } catch (error) {
    console.error("Error al crear forecast:", error);
    return res.status(500).json({ message: "Error al crear forecast", error: error.message });
  }
};

/**
 * PUT /:id_forecast - Actualizar forecast (solo admin).
 * Body: monto_proyectado (opcionalmente anio, mes, cedula_vendedora, id_categoria_venta)
 */
const updateForecast = async (req, res) => {
  try {
    const { id_forecast } = req.params;
    const { monto_proyectado, anio, mes, cedula_vendedora, id_categoria_venta } = req.body;

    const forecast = await ForecastMensual.findByPk(id_forecast);
    if (!forecast) {
      return res.status(404).json({ message: "Forecast no encontrado." });
    }

    if (monto_proyectado != null) forecast.monto_proyectado = parseFloat(monto_proyectado);
    if (anio != null) forecast.anio = parseInt(anio, 10);
    if (mes != null) forecast.mes = parseInt(mes, 10);
    if (cedula_vendedora != null) forecast.cedula_vendedora = cedula_vendedora;
    if (id_categoria_venta != null) forecast.id_categoria_venta = parseInt(id_categoria_venta, 10);

    await forecast.save();

    const conRelaciones = await ForecastMensual.findByPk(forecast.id_forecast, {
      include: includeVendedoraCategoria,
    });
    return res.json(conRelaciones);
  } catch (error) {
    console.error("Error al actualizar forecast:", error);
    return res.status(500).json({ message: "Error al actualizar forecast", error: error.message });
  }
};

/**
 * GET ?anio=&mes= - Por mes (anio y mes requeridos para "by month").
 * GET ?anio= - Por año (todos los registros del año para la tabla del dashboard).
 */
const getForecastByMonth = async (req, res) => {
  try {
    const { anio, mes } = req.query;
    if (!anio || !mes) {
      return res.status(400).json({ message: "Se requieren anio y mes." });
    }
    const anioNum = parseInt(anio, 10);
    const mesNum = parseInt(mes, 10);

    const list = await ForecastMensual.findAll({
      where: { anio: anioNum, mes: mesNum },
      include: includeVendedoraCategoria,
      order: [
        ["cedula_vendedora", "ASC"],
        ["id_categoria_venta", "ASC"],
      ],
    });
    return res.json(list);
  } catch (error) {
    console.error("Error al obtener forecast por mes:", error);
    return res.status(500).json({ message: "Error al obtener forecast por mes", error: error.message });
  }
};

/**
 * GET ?anio= - Todos los registros del año (para armar la tabla por vendedora/categoría/meses).
 */
const getForecastByYear = async (req, res) => {
  try {
    const { anio } = req.query;
    if (!anio) {
      return res.status(400).json({ message: "Se requiere anio." });
    }
    const anioNum = parseInt(anio, 10);

    const list = await ForecastMensual.findAll({
      where: { anio: anioNum },
      include: includeVendedoraCategoria,
      order: [
        ["cedula_vendedora", "ASC"],
        ["id_categoria_venta", "ASC"],
        ["mes", "ASC"],
      ],
    });
    return res.json(list);
  } catch (error) {
    console.error("Error al obtener forecast por año:", error);
    return res.status(500).json({ message: "Error al obtener forecast por año", error: error.message });
  }
};

/**
 * GET /vendedora/:cedula_vendedora ?anio= - Por vendedora (anio opcional).
 */
const getForecastBySeller = async (req, res) => {
  try {
    const { cedula_vendedora } = req.params;
    const { anio } = req.query;

    const where = { cedula_vendedora };
    if (anio) where.anio = parseInt(anio, 10);

    const list = await ForecastMensual.findAll({
      where,
      include: includeVendedoraCategoria,
      order: [
        ["anio", "ASC"],
        ["mes", "ASC"],
        ["id_categoria_venta", "ASC"],
      ],
    });
    return res.json(list);
  } catch (error) {
    console.error("Error al obtener forecast por vendedora:", error);
    return res.status(500).json({ message: "Error al obtener forecast por vendedora", error: error.message });
  }
};

/**
 * GET / - Listar con filtros opcionales: anio, mes, cedula_vendedora.
 * Si solo se envía anio, sirve para la tabla del dashboard (todos los meses del año).
 */
const listarForecasts = async (req, res) => {
  try {
    const { anio, mes, cedula_vendedora } = req.query;
    const where = {};
    if (anio) where.anio = parseInt(anio, 10);
    if (mes) where.mes = parseInt(mes, 10);
    if (cedula_vendedora) where.cedula_vendedora = cedula_vendedora;

    const list = await ForecastMensual.findAll({
      where: Object.keys(where).length ? where : undefined,
      include: includeVendedoraCategoria,
      order: [
        ["anio", "DESC"],
        ["mes", "DESC"],
        ["cedula_vendedora", "ASC"],
        ["id_categoria_venta", "ASC"],
      ],
    });
    return res.json(list);
  } catch (error) {
    console.error("Error al listar forecasts:", error);
    return res.status(500).json({ message: "Error al listar forecasts", error: error.message });
  }
};

const upsertForecastsBulk = async (req, res) => {
  try {
    const { cambios } = req.body;
    if (!cambios || !Array.isArray(cambios) || cambios.length === 0) {
      return res.status(400).json({ message: "No se enviaron cambios para guardar." });
    }

    // Iteramos sobre todos los cambios enviados desde la tabla de React
    for (const item of cambios) {
      const { anio, mes, cedula_vendedora, id_categoria_venta, monto_proyectado } = item;

      // Buscar si ya existe el registro
      const existente = await ForecastMensual.findOne({
        where: {
          anio: parseInt(anio, 10),
          mes: parseInt(mes, 10),
          cedula_vendedora,
          id_categoria_venta: parseInt(id_categoria_venta, 10)
        }
      });

      if (existente) {
        // Si existe y el monto es diferente, lo actualizamos
        if (existente.monto_proyectado !== parseFloat(monto_proyectado)) {
          existente.monto_proyectado = parseFloat(monto_proyectado);
          await existente.save();
        }
      } else {
        // Si no existe, lo creamos
        await ForecastMensual.create({
          anio: parseInt(anio, 10),
          mes: parseInt(mes, 10),
          cedula_vendedora,
          id_categoria_venta: parseInt(id_categoria_venta, 10),
          monto_proyectado: parseFloat(monto_proyectado)
        });
      }
    }

    return res.status(200).json({ message: "Metas actualizadas masivamente con éxito." });
  } catch (error) {
    console.error("Error en upsertForecastsBulk:", error);
    return res.status(500).json({ message: "Error al actualizar las metas masivamente", error: error.message });
  }
};

module.exports = {
  createForecast,
  updateForecast,
  getForecastByMonth,
  getForecastByYear,
  getForecastBySeller,
  listarForecasts,
  upsertForecastsBulk,
};
