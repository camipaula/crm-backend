const ForecastMensual = require("../models/ForecastMensual.model");
const VentaRealMensual = require("../models/VentaRealMensual.model");
const Usuario = require("../models/Usuario.model");
const CategoriaVenta = require("../models/CategoriaVenta.model");

const r2 = (n) => (n != null && Number.isFinite(n) ? Math.round(n * 100) / 100 : null);

/**
 * GET /api/dashboard/metas-comparacion
 * Query params: anio, meses (opcional, ej: 1,2,3), cedula_vendedora (opcional), id_categoria_venta (opcional)
 */
const obtenerMetasComparacion = async (req, res) => {
  try {
    const { anio, meses, cedula_vendedora, id_categoria_venta } = req.query;

    if (!anio) {
      return res.status(400).json({ message: "Se requiere el parámetro anio." });
    }
    const anioNum = parseInt(anio, 10);
    
    // Convertir el string "1,2,3" a un arreglo de números [1, 2, 3]
    let mesesArray = [];
    if (meses && typeof meses === 'string' && meses.trim() !== "") {
      mesesArray = meses.split(",").map(m => parseInt(m.trim(), 10)).filter(m => m >= 1 && m <= 12);
    }

    const vendedoraFiltro = cedula_vendedora && String(cedula_vendedora).trim()
      ? String(cedula_vendedora).trim()
      : null;
    const categoriaFiltro = id_categoria_venta && id_categoria_venta !== ""
      ? parseInt(id_categoria_venta, 10)
      : null;

    // ── Filtros Forecast ────────────────────────────────────────
    const whereForecast = { anio: anioNum };
    if (vendedoraFiltro) whereForecast.cedula_vendedora = vendedoraFiltro;
    if (categoriaFiltro) whereForecast.id_categoria_venta = categoriaFiltro;

    // ── Resolver id_usuario del filtro de vendedora ─────────────
    let idUsuarioFiltro = null;
    if (vendedoraFiltro) {
      const u = await Usuario.findOne({
        where: { cedula_ruc: vendedoraFiltro },
        attributes: ["id_usuario"],
      });
      idUsuarioFiltro = u ? u.id_usuario : -1;
    }

    // ── Filtros Ventas Reales ───────────────────────────────────
    const whereVenta = { anio: anioNum };
    if (idUsuarioFiltro !== null) whereVenta.id_usuario = idUsuarioFiltro;
    if (categoriaFiltro) whereVenta.id_categoria_venta = categoriaFiltro;

    // ── Consultas paralelas ─────────────────────────────────────
    const [forecasts, ventasReales, categorias] = await Promise.all([
      ForecastMensual.findAll({
        where: whereForecast,
        include: [
          { model: Usuario, as: "vendedora", attributes: ["id_usuario", "cedula_ruc", "nombre"] },
          { model: CategoriaVenta, as: "categoria_venta", attributes: ["id_categoria_venta", "nombre"] },
        ],
        order: [["mes", "ASC"], ["cedula_vendedora", "ASC"], ["id_categoria_venta", "ASC"]],
      }),
      VentaRealMensual.findAll({
        where: whereVenta,
        include: [
          { model: Usuario, as: "usuario", attributes: ["id_usuario", "cedula_ruc", "nombre"], required: false },
          { model: CategoriaVenta, as: "categoria_venta", attributes: ["id_categoria_venta", "nombre"] },
        ],
        order: [["mes", "ASC"], ["codigo_vendedora_externo", "ASC"], ["id_categoria_venta", "ASC"]],
      }),
      CategoriaVenta.findAll({ attributes: ["id_categoria_venta", "nombre"], order: [["nombre", "ASC"]] }),
    ]);

    const NOMBRES_MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    function key(idUsuario, codigoExterno, idCat) {
      if (idUsuario) return `CRM_ID_${idUsuario}-CAT_${idCat}`;
      return `EXTERNO_${codigoExterno}-CAT_${idCat}`;
    }

    const map = {};

    // 1. Cargar metas
    forecasts.forEach((f) => {
      if (!f.vendedora) return;
      const idUsuario = f.vendedora.id_usuario;
      const idCat = f.id_categoria_venta;
      const k = key(idUsuario, null, idCat);

      if (!map[k]) {
        map[k] = {
          id_usuario: idUsuario,
          cedula_ruc: f.cedula_vendedora,
          codigo_vendedora_externo: "En CRM (Sin código)",
          nombre: f.vendedora.nombre,
          id_categoria_venta: idCat,
          categoria: f.categoria_venta?.nombre || `Categoría ${idCat}`,
          metaAnio: 0, metaMes: 0,
          realAnio: 0, realMes: 0,
          tipo: "solo_meta",
        };
      }
      const monto = Number(f.monto_proyectado) || 0;
      map[k].metaAnio += monto;
      if (mesesArray.length > 0 && mesesArray.includes(f.mes)) map[k].metaMes += monto;
    });

    // 2. Cargar ventas reales
    ventasReales.forEach((v) => {
      const idUsuario = v.id_usuario;
      const codigoExterno = v.codigo_vendedora_externo;
      const idCat = v.id_categoria_venta;
      const k = key(idUsuario, codigoExterno, idCat);

      if (!map[k]) {
        map[k] = {
          id_usuario: idUsuario,
          cedula_ruc: v.usuario?.cedula_ruc ?? null,
          codigo_vendedora_externo: codigoExterno,
          nombre: v.usuario?.nombre ?? `(EXT) ${codigoExterno}`,
          id_categoria_venta: idCat,
          categoria: v.categoria_venta?.nombre || `Categoría ${idCat}`,
          metaAnio: 0, metaMes: 0,
          realAnio: 0, realMes: 0,
          tipo: idUsuario ? "solo_real" : "solo_real_externa",
        };
      }

      const monto = Number(v.total_vendido) || 0;
      map[k].realAnio += monto;
      if (mesesArray.length > 0 && mesesArray.includes(v.mes)) map[k].realMes += monto;

      if (idUsuario && map[k].codigo_vendedora_externo === "En CRM (Sin código)") {
        map[k].codigo_vendedora_externo = codigoExterno;
      }
    });

    // 3. Determinar tipo final
    Object.values(map).forEach((row) => {
      const tieneMeta = row.metaAnio > 0;
      const tieneReal = row.realAnio > 0;
      if (tieneMeta && tieneReal) row.tipo = "match";
      else if (tieneMeta) row.tipo = "solo_meta";
      else row.tipo = "solo_real_externa";
    });

    const comparacionPorVendedora = Object.values(map).map((row) => {
      const metaAnio = r2(row.metaAnio);
      const realAnio = r2(row.realAnio);
      const metaMes = mesesArray.length > 0 ? r2(row.metaMes) : null;
      const realMes = mesesArray.length > 0 ? r2(row.realMes) : null;
      const cumplimientoAnio = metaAnio > 0 && realAnio != null ? r2(realAnio / metaAnio) : null;
      const cumplimientoMes = (mesesArray.length > 0 && metaMes > 0 && realMes != null) ? r2(realMes / metaMes) : null;

      return {
        tipo: row.tipo,
        cedula_ruc: row.cedula_ruc,
        codigo_vendedora_externo: row.codigo_vendedora_externo,
        nombre: row.nombre,
        id_categoria_venta: row.id_categoria_venta,
        categoria: row.categoria,
        metaAnio, realAnio, cumplimientoAnio,
        metaMes, realMes, cumplimientoMes,
      };
    }).sort((a, b) => (b.realAnio ?? 0) - (a.realAnio ?? 0));

    const metaPorMes = {};
    const realPorMes = {};
    for (let m = 1; m <= 12; m++) { metaPorMes[m] = 0; realPorMes[m] = 0; }

    forecasts.forEach((f) => { metaPorMes[f.mes] += Number(f.monto_proyectado) || 0; });
    ventasReales.forEach((v) => { realPorMes[v.mes] += Number(v.total_vendido) || 0; });

    const comparacionPorMes = [1,2,3,4,5,6,7,8,9,10,11,12].map((m) => {
      const meta = r2(metaPorMes[m]);
      const real = r2(realPorMes[m]);
      const diferencia = r2(real - meta);
      const cumplimiento = meta > 0 ? r2(real / meta) : null;
      return { mes: m, mesLabel: NOMBRES_MESES[m - 1], meta, real, diferencia, cumplimiento };
    });

    const catMap = {};
    Object.values(map).forEach((row) => {
      const k = row.id_categoria_venta;
      if (!catMap[k]) catMap[k] = { id_categoria_venta: k, categoria: row.categoria, meta: 0, real: 0 };
      catMap[k].meta += mesesArray.length > 0 ? row.metaMes : row.metaAnio;
      catMap[k].real += mesesArray.length > 0 ? row.realMes : row.realAnio;
    });

    const comparacionPorCategoria = Object.values(catMap).map((c) => ({
      id_categoria_venta: c.id_categoria_venta,
      categoria: c.categoria,
      meta: r2(c.meta),
      real: r2(c.real),
      cumplimiento: c.meta > 0 ? r2(c.real / c.meta) : null,
    })).sort((a, b) => (b.real ?? 0) - (a.real ?? 0));

    const metaAcumuladaAnio = Object.values(metaPorMes).reduce((a, b) => a + b, 0);
    const realAcumuladaAnio = Object.values(realPorMes).reduce((a, b) => a + b, 0);
    const metaTotalMes = mesesArray.length > 0 ? mesesArray.reduce((acc, m) => acc + (metaPorMes[m] || 0), 0) : null;
    const realTotalMes = mesesArray.length > 0 ? mesesArray.reduce((acc, m) => acc + (realPorMes[m] || 0), 0) : null;
    const cumplimientoMes = (metaTotalMes > 0 && realTotalMes != null) ? r2(realTotalMes / metaTotalMes) : null;
    const cumplimientoAnio = metaAcumuladaAnio > 0 ? r2(realAcumuladaAnio / metaAcumuladaAnio) : null;

    return res.json({
      periodo: { anio: anioNum, meses: mesesArray, cedula_vendedora: vendedoraFiltro, id_categoria_venta: categoriaFiltro },
      kpis: {
        metaTotalMes: r2(metaTotalMes),
        realTotalMes: r2(realTotalMes),
        cumplimientoMes,
        metaAcumuladaAnio: r2(metaAcumuladaAnio),
        realAcumuladaAnio: r2(realAcumuladaAnio),
        cumplimientoAnio,
      },
      comparacionPorVendedora,
      comparacionPorMes,
      comparacionPorCategoria,
      categorias: categorias.map(c => ({ id_categoria_venta: c.id_categoria_venta, nombre: c.nombre })),
    });
  } catch (error) {
    console.error("Error en dashboard metas-comparación:", error);
    return res.status(500).json({ message: "Error obteniendo comparación meta vs real", error: error.message });
  }
};

module.exports = { obtenerMetasComparacion };