const Prospecto = require("../models/prospecto.model"); 
const VentaProspecto = require("../models/ventaProspecto.model"); 
const { Op } = require("sequelize");

const obtenerIndicadores = async (req, res) => {
  try {
    // Ahora recibimos "meses" (en plural, ej: "1,2,3")
    const { anio, meses, inversionMarketing = 600 } = req.query;
    
    if (!anio) {
      return res.status(400).json({ message: "EL AÑO ES REQUERIDO" });
    }
    const anioNum = parseInt(anio, 10);

    // Convertir el string "1,2,3" a un arreglo [1, 2, 3]
    let mesesArray = [];
    if (meses && typeof meses === 'string' && meses.trim() !== "") {
      mesesArray = meses.split(",").map(m => parseInt(m.trim(), 10)).filter(m => !isNaN(m));
    }

    if (mesesArray.length === 0) {
      return res.status(400).json({ message: "DEBES SELECCIONAR AL MENOS UN MES" });
    }

    // Calcular el rango de fechas (desde el mes menor hasta el mes mayor)
    const mesMin = Math.min(...mesesArray);
    const mesMax = Math.max(...mesesArray);

    const fechaInicio = new Date(anioNum, mesMin - 1, 1);
    const fechaFin = new Date(anioNum, mesMax, 0, 23, 59, 59);

    // 2. Tasa de Conversión de Leads
    const totalLeads = await Prospecto.count({
      where: {
        created_at: { [Op.between]: [fechaInicio, fechaFin] },
        eliminado: 0
      }
    });

    const totalClientesNuevos = await VentaProspecto.count({
      where: {
        fecha_cierre: { [Op.between]: [fechaInicio, fechaFin] },
        monto_cierre: { [Op.gt]: 0 },
        eliminado: 0
      }
    });

    let tasaConversion = 0;
    if (totalLeads > 0) {
      tasaConversion = (totalClientesNuevos / totalLeads) * 100;
    }

    // 3. Costo de Adquisición de Clientes (CAC)
    let cac = 0;
    if (totalClientesNuevos > 0) {
      cac = Number(inversionMarketing) / totalClientesNuevos;
    }

    // 4. Valor de Vida del Cliente (CLV)
    // 👇 AQUÍ ESTABA EL ERROR (Ya está sin el espacio)
    const ventasDelRango = await VentaProspecto.findAll({
      where: {
        fecha_cierre: { [Op.between]: [fechaInicio, fechaFin] },
        monto_cierre: { [Op.gt]: 0 },
        eliminado: 0
      },
      attributes: ['monto_cierre']
    });

    let clv = 0;
    if (ventasDelRango.length > 0) {
      const sumaVentas = ventasDelRango.reduce((acc, venta) => acc + Number(venta.monto_cierre), 0);
      clv = sumaVentas / ventasDelRango.length;
    }

    // 5. Tasa de Retención (Estimada)
    const tasaRetencion = 85;

    return res.json({
      totalLeads,
      totalClientesNuevos,
      tasaConversion: Math.round(tasaConversion * 100) / 100,
      cac: Math.round(cac * 100) / 100,
      clv: Math.round(clv * 100) / 100,
      tasaRetencion,
      csat: "PENDIENTE (FORMS)"
    });

  } catch (error) {
    console.error("Error obteniendo indicadores:", error);
    return res.status(500).json({ message: "ERROR CALCULANDO KPIS", error: error.message });
  }
};

module.exports = { obtenerIndicadores };