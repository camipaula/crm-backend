const VentaRealMensual = require("../models/VentaRealMensual.model");
const Usuario = require("../models/Usuario.model");
const MatchVendedora = require("../models/MatchVendedora.model"); 

/**
 * POST /api/ventas/sincronizar?anio=2026
 * 1. Llama a la API externa
 * 2. Recorre el JSON
 * 3. Busca ÚNICAMENTE en la tabla de Match manual (MatchVendedora).
 * 4. NADA DE AUTO-MATCH por cédula.
 */
const sincronizarVentasReales = async (req, res) => {
  try {
    const anio = req.query.anio ? parseInt(req.query.anio, 10) : null;
    if (!anio || Number.isNaN(anio)) {
      return res.status(400).json({ message: "Se requiere el parámetro anio (ej: ?anio=2026)." });
    }

    const apiUrl = process.env.VENTAS_REALES_API_URL;
    if (!apiUrl || !apiUrl.trim()) {
      return res.status(500).json({
        message: "No está configurada VENTAS_REALES_API_URL en .env.",
      });
    }
    const url = apiUrl.includes("?") 
      ? `${apiUrl}&id_anio=${anio}` 
      : `${apiUrl}?id_anio=${anio}`;
      
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(502).json({
        message: `La API externa respondió con estado ${response.status}.`,
      });
    }

    const raw = await response.json();
    const items = Array.isArray(raw) ? raw : raw?.data ?? raw?.ventas ?? [];
    if (!Array.isArray(items)) {
      return res.status(502).json({
        message: "La API externa no devolvió un array de ventas.",
      });
    }

    let creados = 0;
    let actualizados = 0;

    for (const item of items) {
      const anioNum = parseInt(String(item.anio || anio), 10);
      const mesRaw = item.mes != null ? String(item.mes) : "";
      const mesNum = mesRaw === "" ? NaN : parseInt(mesRaw, 10);
      if (Number.isNaN(mesNum) || mesNum < 1 || mesNum > 12) continue;

      const codigo_vendedora_externo = String(item.cedula_vendedora ?? "").trim();
      
      // 🌟 AQUÍ ATRAPAMOS EL NOMBRE QUE AÑADIÓ LA API 🌟
      const nombre_vendedora_externo = item.nombre_vendedora ? String(item.nombre_vendedora).trim() : null;

      const id_categoria_venta = parseInt(String(item.id_categoria_venta ?? 0), 10);
      if (!codigo_vendedora_externo || Number.isNaN(id_categoria_venta)) continue;

      const total_vendido = Number(item.total_vendido);
      const totalVendidoValido = Number.isFinite(total_vendido) ? total_vendido : 0;

      // 🛑 --- LÓGICA DE MATCH 100% MANUAL --- 🛑
      let id_usuario = null;

      // Solo buscamos en la tabla de matches manuales
      const matchGuardado = await MatchVendedora.findByPk(codigo_vendedora_externo);
      
      if (matchGuardado) {
        id_usuario = matchGuardado.id_usuario;
      }

      const existente = await VentaRealMensual.findOne({
        where: {
          anio: anioNum,
          mes: mesNum,
          codigo_vendedora_externo,
          id_categoria_venta,
        },
      });

      if (existente) {
        existente.total_vendido = Math.round(totalVendidoValido * 100) / 100;
        existente.id_usuario = id_usuario;
        // 🌟 ACTUALIZAMOS EL NOMBRE POR SI CAMBIÓ 🌟
        existente.nombre_vendedora_externo = nombre_vendedora_externo; 
        
        await existente.save();
        actualizados += 1;
      } else {
        await VentaRealMensual.create({
          anio: anioNum,
          mes: mesNum,
          codigo_vendedora_externo,
          nombre_vendedora_externo, // 🌟 GUARDAMOS EL NOMBRE AL CREAR 🌟
          id_usuario, 
          id_categoria_venta,
          total_vendido: Math.round(totalVendidoValido * 100) / 100,
        });
        creados += 1;
      }
    }

    return res.json({
      message: "Sincronización completada.",
      anio,
      procesados: items.length,
      creados,
      actualizados,
    });
  } catch (error) {
    console.error("Error al sincronizar ventas reales:", error);
    return res.status(500).json({
      message: "Error al sincronizar ventas reales",
      error: error.message,
    });
  }
};

// ==========================================
// MATCH MANUAL DE VENDEDORAS
// ==========================================
// MATCH MANUAL DE VENDEDORAS (Soporta múltiples códigos)
const hacerMatchVendedora = async (req, res) => {
  try {
    const { id_usuario, codigos_externos } = req.body; 

    if (!id_usuario || !Array.isArray(codigos_externos)) {
      return res.status(400).json({
        message: "id_usuario y codigos_externos (array) son requeridos"
      });
    }

    // 1. ELIMINAR matches previos de este usuario para evitar duplicidad
    await MatchVendedora.destroy({ where: { id_usuario } });

    // 2. DESVINCULAR ventas previas de este usuario (limpieza)
    await VentaRealMensual.update(
      { id_usuario: null },
      { where: { id_usuario } }
    );

    // 3. CREAR los nuevos matches (uno por cada código en el array)
    const nuevosMatches = codigos_externos.map(codigo => ({
      id_usuario,
      codigo_vendedora_externo: codigo
    }));
    await MatchVendedora.bulkCreate(nuevosMatches);

    // 4. VINCULAR todas las ventas de esos códigos al usuario
    await VentaRealMensual.update(
      { id_usuario },
      { where: { codigo_vendedora_externo: codigos_externos } }
    );

    res.json({
      message: `Match guardado para ${codigos_externos.length} códigos.`
    });

  } catch (error) {
    console.error("Error haciendo match:", error);
    res.status(500).json({ message: "Error haciendo match", error: error.message });
  }
};

const obtenerMatchesVendedoras = async (req, res) => {
  try {
    const matches = await MatchVendedora.findAll();
    const agrupados = matches.reduce((acc, curr) => {
      if (!acc[curr.id_usuario]) acc[curr.id_usuario] = [];
      acc[curr.id_usuario].push(curr.codigo_vendedora_externo);
      return acc;
    }, {});
    
    const result = Object.keys(agrupados).map(id => ({
      id_usuario: parseInt(id),
      codigos: agrupados[id]
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const obtenerCodigosExternos = async (req, res) => {
  try {
    const codigos = await VentaRealMensual.findAll({
      // 🌟 AQUÍ PEDIMOS A LA BD QUE NOS TRAIGA TAMBIÉN EL NOMBRE 🌟
      attributes: ["codigo_vendedora_externo", "nombre_vendedora_externo"], 
      
      // 🌟 AGRUPAMOS POR AMBOS PARA QUE NO DE ERROR DE SQL 🌟
      group: ["codigo_vendedora_externo", "nombre_vendedora_externo"] 
    });

    res.json(codigos);
  } catch (error) {
    console.error("Error obteniendo códigos externos:", error);
    res.status(500).json({
      message: "Error obteniendo códigos externos",
      error: error.message
    });
  }
};

module.exports = { 
  sincronizarVentasReales, 
  hacerMatchVendedora,
  obtenerCodigosExternos,
  obtenerMatchesVendedoras 
};