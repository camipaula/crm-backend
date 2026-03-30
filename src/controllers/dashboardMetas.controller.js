const ForecastMensual = require("../models/ForecastMensual.model");
const Usuario = require("../models/Usuario.model");
const CategoriaVenta = require("../models/CategoriaVenta.model");

const includeVendedoraCategoria = [
  { model: Usuario, as: "vendedora", attributes: ["cedula_ruc", "nombre"] },
  { model: CategoriaVenta, as: "categoria_venta", attributes: ["id_categoria_venta", "nombre"] },
];

/**
 * Suma montos de una lista de forecasts (monto_proyectado puede venir como getter Number).
 */
const sumar = (lista) =>
  lista.reduce((acc, f) => acc + (Number(f.monto_proyectado) || 0), 0);

/**
 * GET /api/dashboard/metas?anio=2026&mes=1&cedula_vendedora=123
 * Dashboard de metas (forecast). Solo datos de meta; luego se podrá comparar con ventas reales.
 * - anio: requerido
 * - mes: opcional. Si se envía, los KPIs "del mes" se calculan para ese mes.
 * - cedula_vendedora: opcional. Filtra todas las metas por esa vendedora.
 */
const obtenerDashboardMetas = async (req, res) => {
  try {
    const { anio, mes, cedula_vendedora } = req.query;
    if (!anio) {
      return res.status(400).json({ message: "Se requiere el parámetro anio." });
    }
    const anioNum = parseInt(anio, 10);
    const mesNum = mes != null && mes !== "" ? parseInt(mes, 10) : null;
    if (mesNum != null && (mesNum < 1 || mesNum > 12)) {
      return res.status(400).json({ message: "Mes debe estar entre 1 y 12." });
    }
    const vendedoraFiltro = cedula_vendedora && String(cedula_vendedora).trim() ? String(cedula_vendedora).trim() : null;

    const where = { anio: anioNum };
    if (vendedoraFiltro) where.cedula_vendedora = vendedoraFiltro;

    const forecasts = await ForecastMensual.findAll({
      where,
      include: includeVendedoraCategoria,
      order: [
        ["mes", "ASC"],
        ["cedula_vendedora", "ASC"],
        ["id_categoria_venta", "ASC"],
      ],
    });

    const delMes = mesNum != null ? forecasts.filter((f) => f.mes === mesNum) : [];
    const metaTotalMes = sumar(delMes);
    const metaAcumuladaAnio = sumar(forecasts);

    // Meta total por vendedora (del año; si hay mes, también del mes)
    const porVendedoraAnio = {};
    const porVendedoraMes = {};
    forecasts.forEach((f) => {
      const ced = f.cedula_vendedora;
      const nombre = f.vendedora?.nombre || ced;
      const monto = Number(f.monto_proyectado) || 0;
      if (!porVendedoraAnio[ced]) porVendedoraAnio[ced] = { cedula_vendedora: ced, nombre, total: 0 };
      porVendedoraAnio[ced].total += monto;
      if (f.mes === mesNum) {
        if (!porVendedoraMes[ced]) porVendedoraMes[ced] = { cedula_vendedora: ced, nombre, total: 0 };
        porVendedoraMes[ced].total += monto;
      }
    });
    const metaPorVendedoraAnio = Object.values(porVendedoraAnio).sort((a, b) => b.total - a.total);
    const metaPorVendedoraMes =
      mesNum != null
        ? Object.values(porVendedoraMes).sort((a, b) => b.total - a.total)
        : null;

    // Meta total por categoría (año y opcionalmente mes)
    const porCategoriaAnio = {};
    const porCategoriaMes = {};
    forecasts.forEach((f) => {
      const id = f.id_categoria_venta;
      const nombre = f.categoria_venta?.nombre || `Categoría ${id}`;
      const monto = Number(f.monto_proyectado) || 0;
      if (!porCategoriaAnio[id]) porCategoriaAnio[id] = { id_categoria_venta: id, nombre, total: 0 };
      porCategoriaAnio[id].total += monto;
      if (f.mes === mesNum) {
        if (!porCategoriaMes[id]) porCategoriaMes[id] = { id_categoria_venta: id, nombre, total: 0 };
        porCategoriaMes[id].total += monto;
      }
    });
    const metaPorCategoriaAnio = Object.values(porCategoriaAnio).sort((a, b) => b.total - a.total);
    const metaPorCategoriaMes =
      mesNum != null
        ? Object.values(porCategoriaMes).sort((a, b) => b.total - a.total)
        : null;

    // Meta por mes (desglose del año para gráficos)
    const porMes = {};
    for (let m = 1; m <= 12; m++) porMes[m] = { mes: m, total: 0 };
    forecasts.forEach((f) => {
      porMes[f.mes].total += Number(f.monto_proyectado) || 0;
    });
    const metaPorMes = Object.values(porMes);

    // Promedio mensual del año (para KPI)
    const mesesConMeta = metaPorMes.filter((m) => m.total > 0).length;
    const metaPromedioMensualAnio = mesesConMeta > 0 ? metaAcumuladaAnio / mesesConMeta : 0;

    // Cantidad de vendedoras con meta en el año
    const cantidadVendedorasConMeta = metaPorVendedoraAnio.length;
    const cantidadCategoriasConMeta = metaPorCategoriaAnio.length;

    return res.json({
      periodo: {
        anio: anioNum,
        mes: mesNum,
        cedula_vendedora: vendedoraFiltro,
      },
      kpis: {
        metaTotalMes: mesNum != null ? Math.round(metaTotalMes * 100) / 100 : null,
        metaAcumuladaAnio: Math.round(metaAcumuladaAnio * 100) / 100,
        metaPromedioMensualAnio: Math.round(metaPromedioMensualAnio * 100) / 100,
        cantidadVendedorasConMeta,
        cantidadCategoriasConMeta,
      },
      metaPorVendedora: {
        delAnio: metaPorVendedoraAnio.map((v) => ({
          ...v,
          total: Math.round(v.total * 100) / 100,
        })),
        delMes: metaPorVendedoraMes?.map((v) => ({
          ...v,
          total: Math.round(v.total * 100) / 100,
        })) ?? null,
      },
      metaPorCategoria: {
        delAnio: metaPorCategoriaAnio.map((c) => ({
          ...c,
          total: Math.round(c.total * 100) / 100,
        })),
        delMes: metaPorCategoriaMes?.map((c) => ({
          ...c,
          total: Math.round(c.total * 100) / 100,
        })) ?? null,
      },
      metaPorMes: metaPorMes.map((m) => ({
        ...m,
        total: Math.round(m.total * 100) / 100,
      })),
    });
  } catch (error) {
    console.error("Error en dashboard metas:", error);
    return res
      .status(500)
      .json({ message: "Error obteniendo dashboard de metas", error: error.message });
  }
};

module.exports = { obtenerDashboardMetas };
