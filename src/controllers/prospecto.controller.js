const { Sequelize, Op } = require("sequelize");
const ExcelJS = require("exceljs");
const Prospecto = require("../models/Prospecto.model");
const Usuario = require("../models/Usuario.model");
const OrigenProspecto = require("../models/OrigenProspecto.model");
const CategoriaProspecto = require("../models/CategoriaProspecto.model");
const VentaProspecto = require("../models/VentaProspecto.model");
const SeguimientoVenta = require("../models/SeguimientoVenta.model");
const EstadoProspecto = require("../models/EstadoProspecto.model");

// Obtener prospectos con filtros
const obtenerProspectos = async (req, res) => {
  try {
    const { cedula_ruc, rol } = req.usuario; // Cedula del usuario logueado
    const { cedula_vendedora, estado, fechaInicio, fechaFin, sector, id_categoria, ciudad, provincia } = req.query;

    const whereClause = {};
    whereClause.eliminado = 0;

    // Si el usuario es una vendedora, solo obtiene sus prospectos
    if (rol === "vendedora") {
      whereClause.cedula_vendedora = cedula_ruc;
    } else if (cedula_vendedora) {
      // Si el admin selecciona una vendedora en el filtro
      whereClause.cedula_vendedora = cedula_vendedora;
    }

    if (estado) whereClause.id_estado = Array.isArray(estado) ? { [Op.in]: estado } : estado;
    if (sector) whereClause.sector = sector;
    if (id_categoria) whereClause.id_categoria = id_categoria;
    if (fechaInicio && fechaFin) {
      whereClause.created_at = {
        [Op.between]: [new Date(fechaInicio), new Date(`${fechaFin}T23:59:59`)],
      };
    }
    if (ciudad) whereClause.ciudad = ciudad;
    if (provincia) whereClause.provincia = provincia;


    const prospectos = await Prospecto.findAll({
      where: whereClause,
      include: [
        { model: EstadoProspecto, as: "estado_prospecto", attributes: ["nombre"] },
        { model: Usuario, as: "vendedora_prospecto", attributes: ["nombre", "estado"] },
        { model: OrigenProspecto, as: "origen_prospecto", attributes: ["descripcion"] },
        { model: CategoriaProspecto, as: "categoria_prospecto", attributes: ["nombre"] },
        {
          model: VentaProspecto,
          as: "ventas",
          where: { eliminado: 0 },
          required: false,
          include: [{
            model: SeguimientoVenta,
            as: "seguimientos",
            where: { eliminado: 0 },
            required: false
          }]
        }

      ],
    });

    res.json(prospectos);
  } catch (error) {
    console.error("Error al obtener prospectos:", error);
    res.status(500).json({ message: "Error al obtener prospectos", error });
  }
};




// Obtener un prospecto por ID
const obtenerProspectoPorId = async (req, res) => {
  try {
    const { id_prospecto } = req.params;

    const prospecto = await Prospecto.findByPk(id_prospecto, {
      include: [
        { model: Usuario, as: "vendedora_prospecto", attributes: ["nombre", "estado"] },
        { model: OrigenProspecto, as: "origen_prospecto", attributes: ["descripcion"] },
        { model: CategoriaProspecto, as: "categoria_prospecto", attributes: ["nombre"] },
        { model: EstadoProspecto, as: "estado_prospecto", attributes: ["nombre"] },

        {
          model: VentaProspecto,
          as: "ventas",
          where: { eliminado: 0 },
          required: false,
          include: [{
            model: SeguimientoVenta,
            as: "seguimientos",
            where: { eliminado: 0 },
            required: false
          }]
        }
      ],
    });

    // Validar si existe y si NO está eliminado
    if (!prospecto || prospecto.eliminado === 1) {
      return res.status(404).json({ message: "Prospecto no encontrado" });
    }

    res.json(prospecto);
  } catch (error) {
    console.error(" Error en obtenerProspectoPorId:", error);
    res.status(500).json({ message: "Error al obtener el prospecto", error });
  }
};

// Obtener prospectos por vendedora
const obtenerProspectosPorVendedora = async (req, res) => {
  try {
    const { cedula_vendedora } = req.params;

    const prospectos = await Prospecto.findAll({
      where: {
        cedula_vendedora,
        eliminado: 0,
      },
      include: [
        { model: CategoriaProspecto, as: "categoria_prospecto", attributes: ["nombre"] },
        { model: EstadoProspecto, as: "estado_prospecto", attributes: ["nombre"] },

        {
          model: VentaProspecto,
          as: "ventas",
          where: { eliminado: 0 },
          required: false,
          include: [{
            model: SeguimientoVenta,
            as: "seguimientos",
            where: { eliminado: 0 },
            required: false
          }]
        }
      ],
    });

    res.json(prospectos);
  } catch (error) {
    console.error(" Error al obtener prospectos por vendedora:", error);
    res.status(500).json({ message: "Error al obtener prospectos por vendedora", error });
  }
};

// Obtener prospectos por estado
const obtenerProspectosPorEstado = async (req, res) => {
  try {
    const { estado } = req.params;
    const prospectos = await Prospecto.findAll({
      where: {
        id_estado,
        eliminado: 0,
      },
      include: [
        { model: CategoriaProspecto, as: "categoria_prospecto", attributes: ["nombre"] },
        { model: EstadoProspecto, as: "estado_prospecto", attributes: ["nombre"] },

        {
          model: VentaProspecto,
          as: "ventas",
          where: { eliminado: 0 },
          required: false,
          include: [{
            model: SeguimientoVenta,
            as: "seguimientos",
            where: { eliminado: 0 },
            required: false
          }]
        }
      ],
    });

    res.json(prospectos);
  } catch (error) {
    console.error(" Error al obtener prospectos por estado:", error);
    res.status(500).json({ message: "Error al obtener prospectos por estado", error });
  }
};

// Crear un prospecto

const crearProspecto = async (req, res) => {
  try {
    console.log("Usuario autenticado en crearProspecto:", req.usuario);

    // Si es vendedora y está inactiva, no puede crear
    const vendedoraLogueada = await Usuario.findByPk(req.usuario.cedula_ruc);
    if (req.usuario.rol === "vendedora" && vendedoraLogueada.estado === 0) {
      return res.status(403).json({ message: "No puede crear prospectos. Su cuenta está inactiva." });
    }

    const {
      cedula_ruc,
      nombre,
      nombre_contacto,
      correo,
      telefono,
      direccion,
      provincia,
      ciudad,
      sector,
      id_origen,
      id_categoria,
      descripcion,
      nota,
      cedula_vendedora,
      created_at,
    } = req.body;

    // 🔁 Asignación de vendedora
    let asignarVendedora = cedula_vendedora;
    if (req.usuario.rol === "vendedora") {
      asignarVendedora = req.usuario.cedula_ruc;
    } else if (!asignarVendedora) {
      return res.status(400).json({ message: "Debe asignar una vendedora al prospecto." });
    }

    // Validar que la vendedora asignada esté activa
    const vendedoraAsignada = await Usuario.findByPk(asignarVendedora);
    if (!vendedoraAsignada || vendedoraAsignada.estado === 0) {
      return res.status(400).json({ message: "No se puede asignar una vendedora inactiva al prospecto." });
    }

    // Fecha
    const fechaCreacion = created_at ? new Date(created_at) : new Date();

    // Validar duplicado por cédula
    if (cedula_ruc) {
      const existente = await Prospecto.findOne({
        where: { cedula_ruc, eliminado: 0 }
      });
      if (existente) {
        return res.status(400).json({ message: "Ya existe un prospecto con esa cédula o RUC." });
      }
    }


    // Validar duplicado por nombre
    const duplicado = await Prospecto.findOne({
      where: { nombre, eliminado: 0 }
    });
    if (duplicado) {
      return res.status(400).json({ message: "Ya existe un prospecto con ese nombre." });
    }

    // Obtener estado "nuevo"
    const estadoNuevo = await EstadoProspecto.findOne({ where: { nombre: "nuevo" } });
    if (!estadoNuevo) {
      return res.status(500).json({ message: "Estado 'nuevo' no está registrado en la base de datos." });
    }

    // Crear prospecto
    const nuevoProspecto = await Prospecto.create({
      cedula_ruc,
      nombre,
      nombre_contacto,
      correo,
      telefono,
      direccion,
      provincia,
      ciudad,
      sector,
      id_origen,
      id_categoria,
      descripcion,
      nota,
      id_estado: estadoNuevo.id_estado,
      archivo: req.file ? req.file.path : null,
      cedula_vendedora: asignarVendedora,
      created_at: fechaCreacion,
      eliminado: 0,
    });

    res.status(201).json({ message: "Prospecto creado exitosamente", prospecto: nuevoProspecto });
  } catch (error) {
    console.error("Error en crearProspecto:", error);
    res.status(500).json({ message: "Error al crear prospecto", error });
  }
};


// Actualizar un prospecto
const actualizarProspecto = async (req, res) => {
  try {
    const { id_prospecto } = req.params;
    const {
      nombre, nombre_contacto, correo, telefono, direccion, provincia, ciudad, sector,
      id_origen, id_categoria, descripcion, id_estado, nota, cedula_vendedora
    } = req.body;

    const prospecto = await Prospecto.findByPk(id_prospecto);
    if (!prospecto) {
      return res.status(404).json({ message: "Prospecto no encontrado" });
    }

    // 🟨 Validar que la vendedora asignada esté activa
    const vendedoraAsignada = cedula_vendedora === "" ? null : cedula_vendedora;
    if (vendedoraAsignada) {
      const vendedora = await Usuario.findByPk(vendedoraAsignada);
      if (!vendedora || vendedora.rol !== "vendedora") {
        return res.status(400).json({ message: "La vendedora asignada no existe" });
      }
      if (vendedora.estado === 0) {
        return res.status(400).json({ message: "No se puede asignar una vendedora inactiva" });
      }
    }

    prospecto.nombre = nombre ?? prospecto.nombre;
    prospecto.nombre_contacto = nombre_contacto ?? prospecto.nombre_contacto;
    prospecto.correo = correo ?? prospecto.correo;
    prospecto.telefono = telefono ?? prospecto.telefono;
    prospecto.direccion = direccion ?? prospecto.direccion;
    prospecto.provincia = provincia ?? prospecto.provincia;
    prospecto.ciudad = ciudad ?? prospecto.ciudad;
    prospecto.sector = sector ?? prospecto.sector;
    prospecto.id_origen = id_origen ?? prospecto.id_origen;
    prospecto.id_categoria = id_categoria ?? prospecto.id_categoria;
    prospecto.descripcion = descripcion ?? prospecto.descripcion;
    prospecto.id_estado = id_estado ?? prospecto.id_estado;
    prospecto.nota = nota ?? prospecto.nota;
    prospecto.cedula_vendedora = vendedoraAsignada;

    if (req.file) {
      prospecto.archivo = req.file.path;
    }

    await prospecto.save();

    res.json({ message: "Prospecto actualizado correctamente", prospecto });
  } catch (error) {
    console.error("Error al actualizar prospecto:", error);
    res.status(500).json({ message: "Error al actualizar prospecto", error });
  }
};


// Eliminar (lógicamente) un prospecto y sus ventas y seguimientos
const eliminarProspecto = async (req, res) => {
  try {
    const { id_prospecto } = req.params;

    const prospecto = await Prospecto.findByPk(id_prospecto, {
      include: {
        model: VentaProspecto,
        as: "ventas",
        include: {
          model: SeguimientoVenta,
          as: "seguimientos"
        }
      }
    });

    if (!prospecto || prospecto.eliminado === 1) {
      return res.status(404).json({ message: "Prospecto no encontrado o ya fue eliminado" });
    }

    // Marcar prospecto como eliminado
    prospecto.eliminado = 1;
    await prospecto.save();

    // Marcar ventas y seguimientos como eliminados
    for (const venta of prospecto.ventas) {
      venta.eliminado = 1;
      await venta.save();

      for (const seguimiento of venta.seguimientos) {
        seguimiento.eliminado = 1;
        await seguimiento.save();
      }
    }

    res.json({ message: "Prospecto y ventas eliminadas lógicamente" });
  } catch (error) {
    console.error("Error al eliminar prospecto:", error);
    res.status(500).json({ message: "Error al eliminar prospecto", error });
  }
};



/*// Eliminar un prospecto de la base de datos 
const eliminarProspecto = async (req, res) => {
  try {
    const { id_prospecto } = req.params;
    const deleted = await Prospecto.destroy({ where: { id_prospecto } });

    if (!deleted) return res.status(404).json({ message: "Prospecto no encontrado" });

    res.json({ message: "Prospecto eliminado correctamente" });
  } catch (error) {
    console.error(" Error al eliminar prospecto:", error);
    res.status(500).json({ message: "Error al eliminar prospecto", error });
  }
};*/

// Obtener todos los sectores únicos de los prospectos
const obtenerSectores = async (req, res) => {
  try {
    const sectores = await Prospecto.findAll({
      attributes: [[Sequelize.fn("DISTINCT", Sequelize.col("sector")), "sector"]],
      where: {
        eliminado: 0,
        sector: { [Op.ne]: null }
      }
      ,
      order: [["sector", "ASC"]],
    });

    if (sectores.length === 0) {
      return res.status(404).json({ message: "No hay sectores disponibles" });
    }

    res.json(sectores.map((s) => s.sector));
  } catch (error) {
    console.error("Error al obtener sectores:", error);
    res.status(500).json({ message: "Error al obtener sectores", error });
  }
};


const obtenerOrigenes = async (req, res) => {
  try {
    const origenes = await OrigenProspecto.findAll({ order: [["id_origen", "ASC"]] });
    res.json(origenes);
  } catch (error) {
    console.error("Error al obtener orígenes:", error);
    res.status(500).json({ message: "Error al obtener orígenes", error });
  }
};

const obtenerProspectosPorCategoria = async (req, res) => {
  try {
    const { id_categoria } = req.params;

    const prospectos = await Prospecto.findAll({
      where: {
        id_categoria,
        eliminado: 0
      }
      ,
      include: [
        { model: Usuario, as: "vendedora_prospecto", attributes: ["nombre"] },
        { model: OrigenProspecto, as: "origen_prospecto", attributes: ["descripcion"] },
        { model: CategoriaProspecto, as: "categoria_prospecto", attributes: ["nombre"] },
        {
          model: VentaProspecto,
          as: "ventas",
          where: { eliminado: 0 },
          required: false,
          include: [{
            model: SeguimientoVenta,
            as: "seguimientos",
            where: { eliminado: 0 },
            required: false
          }]
        }

      ],
    });

    res.json(prospectos);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener prospectos por categoría", error });
  }
};


// Exportar prospectos a Excel
const exportarProspectos = async (req, res) => {
  try {
    const { cedula_ruc, rol } = req.usuario;
    const { cedula_vendedora, estado, fechaInicio, fechaFin, sector } = req.query;

    const whereClause = { eliminado: 0 };

    if (rol === "vendedora") {
      whereClause.cedula_vendedora = cedula_ruc;
    } else if (cedula_vendedora) {
      whereClause.cedula_vendedora = cedula_vendedora;
    }

    if (estado) whereClause.id_estado = Array.isArray(estado) ? { [Op.in]: estado } : estado;
    if (sector) whereClause.sector = sector;
    if (fechaInicio && fechaFin) {
      whereClause.created_at = {
        [Op.between]: [new Date(fechaInicio), new Date(`${fechaFin}T23:59:59`)],
      };
    }

    const prospectos = await Prospecto.findAll({
      where: whereClause,
      include: [
        { model: EstadoProspecto, as: "estado_prospecto", attributes: ["nombre"] },

        { model: Usuario, as: "vendedora_prospecto", attributes: ["nombre"] },
        { model: OrigenProspecto, as: "origen_prospecto", attributes: ["descripcion"] },
        {
          model: VentaProspecto,
          as: "ventas",
          where: { eliminado: 0 },
          required: false, // para que traiga prospectos aunque no tengan ventas
          include: [{
            model: SeguimientoVenta,
            as: "seguimientos",
            where: { eliminado: 0 },
            required: false
          }]
        }

      ],
    });

    // 🔹 Si no hay prospectos, devolver un JSON en lugar de error 404
    if (prospectos.length === 0) {
      return res.status(200).json({ message: "No hay prospectos que coincidan con los filtros aplicados" });
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Prospectos");

    sheet.columns = [
      { header: "ID", key: "id_prospecto", width: 10 },
      { header: "Nombre", key: "nombre", width: 20 },
      { header: "Nombre Contacto", key: "nombre_contacto", width: 20 },
      { header: "Correo", key: "correo", width: 25 },
      { header: "Teléfono", key: "telefono", width: 15 },
      { header: "Dirección", key: "direccion", width: 30 },
      { header: "Sector", key: "sector", width: 15 },
      { header: "Estado", key: "estado", width: 15 },
      { header: "Vendedora", key: "vendedora", width: 20 },
      { header: "Origen", key: "origen", width: 20 },
      { header: "Última Nota", key: "ultima_nota", width: 40 },
      { header: "Próximo Contacto", key: "proximo_contacto", width: 20 },
    ];

    prospectos.forEach((p) => {
      const ultimaNota = p.ventas?.[0]?.seguimientos?.[0]?.nota ?? "Sin nota";
      const proximoContacto = p.ventas
        ?.flatMap((venta) => venta.seguimientos || [])
        .filter((s) => s.estado === "pendiente")
        .sort((a, b) => new Date(a.fecha_programada) - new Date(b.fecha_programada))[0]
        ?.fecha_programada;

      sheet.addRow({
        id_prospecto: p.id_prospecto,
        nombre: p.nombre,
        nombre_contacto: p.nombre_contacto || "No registrado",
        correo: p.correo || "No registrado",
        telefono: p.telefono,
        direccion: p.direccion || "No registrada",
        sector: p.sector || "No registrado",
        estado: p.estado_prospecto?.nombre || "Sin estado",
        vendedora: p.vendedora_prospecto?.nombre || "No asignada",
        origen: p.origen_prospecto?.descripcion || "Desconocido",
        ultima_nota: ultimaNota,
        proximo_contacto: proximoContacto ? new Date(proximoContacto).toLocaleDateString("es-EC") : "Sin programar",
      });
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=prospectos.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error al exportar prospectos:", error);
    res.status(500).json({ message: "Error al exportar prospectos", error });
  }
};

const obtenerEstadosProspecto = async (req, res) => {
  try {
    const estados = await EstadoProspecto.findAll({ order: [["id_estado", "ASC"]] });
    res.json(estados);
  } catch (error) {
    console.error("Error al obtener estados de prospecto:", error);
    res.status(500).json({ message: "Error al obtener los estados", error });
  }
};

const obtenerCiudades = async (req, res) => {
  try {
    const ciudades = await Prospecto.findAll({
      attributes: [[Sequelize.fn("DISTINCT", Sequelize.col("ciudad")), "ciudad"]],
      where: {
        eliminado: 0,
        ciudad: { [Op.ne]: null }
      },
      order: [["ciudad", "ASC"]],
    });

    res.json(ciudades.map((c) => c.ciudad));
  } catch (error) {
    console.error("Error al obtener ciudades:", error);
    res.status(500).json({ message: "Error al obtener ciudades", error });
  }
};

const obtenerProvincias = async (req, res) => {
  try {
    const provincias = await Prospecto.findAll({
      attributes: [[Sequelize.fn("DISTINCT", Sequelize.col("provincia")), "provincia"]],
      where: {
        eliminado: 0,
        provincia: { [Op.ne]: null }
      },
      order: [["provincia", "ASC"]],
    });

    res.json(provincias.map((p) => p.provincia));
  } catch (error) {
    console.error("Error al obtener provincias:", error);
    res.status(500).json({ message: "Error al obtener provincias", error });
  }
};


module.exports = {
  obtenerProspectos,
  obtenerProspectoPorId,
  obtenerProspectosPorVendedora,
  obtenerProspectosPorEstado,
  crearProspecto,
  actualizarProspecto,
  eliminarProspecto,
  obtenerSectores,
  obtenerOrigenes,
  obtenerProspectosPorCategoria,
  exportarProspectos,
  obtenerEstadosProspecto,
  obtenerCiudades,
  obtenerProvincias
};
