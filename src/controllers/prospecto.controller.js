const { Sequelize, Op } = require("sequelize");
const ExcelJS = require("exceljs");
const Prospecto = require("../models/Prospecto.model");
const Usuario = require("../models/Usuario.model");
const OrigenProspecto = require("../models/OrigenProspecto.model");
const CategoriaProspecto = require("../models/CategoriaProspecto.model");
const VentaProspecto = require("../models/VentaProspecto.model");
const SeguimientoVenta = require("../models/SeguimientoVenta.model");
const EstadoProspecto = require("../models/EstadoProspecto.model");
const { registrarActividad, agregarHistorialProspecto } = require("../utils/audit");

// Obtener prospectos con filtros
const obtenerProspectos = async (req, res) => {
  try {
    const { cedula_ruc, rol } = req.usuario;
    const {
      cedula_vendedora, estado, fechaInicio, fechaFin, sector, id_categoria,
      ciudad, provincia, page = 1, limit = 20
    } = req.query;

    const whereClause = { eliminado: 0 };

    // Si el usuario es una vendedora, solo obtiene sus prospectos
    if (rol === "vendedora") {
      whereClause.cedula_vendedora = cedula_ruc;
    } else if (cedula_vendedora) {
      // Si el admin selecciona una vendedora en el filtro
      whereClause.cedula_vendedora = cedula_vendedora;
    }

    if (sector) whereClause.sector = sector;
    if (req.query.sin_categoria === "true") {
      whereClause.id_categoria = null;
    } else if (id_categoria) {
      whereClause.id_categoria = id_categoria;
    }
    if (fechaInicio && fechaFin) {
      whereClause.created_at = {
        [Op.between]: [new Date(fechaInicio), new Date(`${fechaFin}T23:59:59`)],
      };
    }
    if (ciudad) whereClause.ciudad = ciudad;
    if (provincia) whereClause.provincia = provincia;
    if (req.query.nombre) {
      whereClause.nombre = { [Op.like]: `%${req.query.nombre}%` };
    }


    const offset = (parseInt(page) - 1) * parseInt(limit);
    const includeVentas = {
      model: VentaProspecto,
      as: "ventas",
      attributes: ["id_venta", "monto_cierre", "monto_proyectado", "abierta", "objetivo", "id_estado"],
      where: { eliminado: 0 },
      required: !!estado,
      include: [
        {
          model: SeguimientoVenta,
          as: "seguimientos",
          where: { eliminado: 0 },
          required: false
        }
      ]
    };


    // si hay estados en la query, los filtramos desde VentaProspecto
    if (estado) {
      includeVentas.where.id_estado = Array.isArray(estado)
        ? { [Op.in]: estado.map(e => parseInt(e)) }
        : parseInt(estado);
    }

    includeVentas.include.push({
      model: EstadoProspecto,
      as: "estado_venta",
      attributes: ["id_estado", "nombre"]
    });


    const todosLosProspectos = await Prospecto.findAll({
      where: whereClause,

      include: [
        { model: Usuario, as: "vendedora_prospecto", attributes: ["nombre", "estado"] },
        { model: OrigenProspecto, as: "origen_prospecto", attributes: ["descripcion"] },
        { model: CategoriaProspecto, as: "categoria_prospecto", attributes: ["nombre"] },
        includeVentas
      ],
      attributes: {
        include: ["empleados"]
      }
    });

    // Ordenar solo si se pidió por próximo contacto
    if (req.query.orden === "proximo_contacto") {
      todosLosProspectos.sort((a, b) => {
        const fechaA = a.ventas?.flatMap(v => v.seguimientos || [])
          .filter(s => s.estado === "pendiente")
          .sort((s1, s2) => new Date(s1.fecha_programada) - new Date(s2.fecha_programada))[0]?.fecha_programada;

        const fechaB = b.ventas?.flatMap(v => v.seguimientos || [])
          .filter(s => s.estado === "pendiente")
          .sort((s1, s2) => new Date(s1.fecha_programada) - new Date(s2.fecha_programada))[0]?.fecha_programada;

        if (!fechaA && !fechaB) return 0;
        if (!fechaA) return 1;
        if (!fechaB) return -1;
        return new Date(fechaA) - new Date(fechaB);
      });
    } else {
      // Por defecto ordenar por fecha de creación DESC
      todosLosProspectos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    // Paginado manual
    const total = todosLosProspectos.length;
    const prospectosPagina = todosLosProspectos.slice(offset, offset + parseInt(limit));

    res.json({
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      prospectos: prospectosPagina
    });


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

// Crear un prospecto

const crearProspecto = async (req, res) => {
  try {
    console.log("Usuario autenticado en crearProspecto:", req.usuario);

    // Si es vendedora y está inactiva, no puede crear
    const vendedoraLogueada = await Usuario.findByPk(req.usuario.cedula_ruc);
    if (req.usuario.rol === "vendedora" && vendedoraLogueada.estado === 0) {
      return res.status(403).json({ message: "No puede crear prospectos. Su cuenta está inactiva." });
    }

    const toUpper = (text) => typeof text === "string" ? text.toUpperCase() : text;

    const {
      cedula_ruc,
      id_origen,
      id_categoria,
      cedula_vendedora,
      created_at,
      empleados,
      monto_proyectado
    } = req.body;

    const nombre = toUpper(req.body.nombre);
    const nombre_contacto = toUpper(req.body.nombre_contacto);
    const correo = toUpper(req.body.correo);
    const telefono = toUpper(req.body.telefono);
    const direccion = toUpper(req.body.direccion);
    const provincia = toUpper(req.body.provincia);
    const ciudad = toUpper(req.body.ciudad);
    const sector = toUpper(req.body.sector);
    const descripcion = toUpper(req.body.descripcion);
    const nota = toUpper(req.body.nota);


    //  Asignación de vendedora
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

    // Buscar si el origen es "Aumento de Portafolio"
    const origenAumento = await OrigenProspecto.findByPk(id_origen);
    const esAumentoPortafolio = origenAumento?.descripcion?.toLowerCase() === "aumento de portafolio";

    // Validar duplicado por cédula solo si NO es "Aumento de Portafolio"
    if (!esAumentoPortafolio && cedula_ruc) {
      const existente = await Prospecto.findOne({
        where: { cedula_ruc, eliminado: 0 }
      });
      if (existente) {
        return res.status(400).json({ message: "Ya existe un prospecto con esa cédula o RUC." });
      }
    }

    // Validar duplicado por nombre solo si NO es "Aumento de Portafolio"
    if (!esAumentoPortafolio) {
      const duplicado = await Prospecto.findOne({
        where: { nombre, eliminado: 0 }
      });
      if (duplicado) {
        return res.status(400).json({ message: "Ya existe un prospecto con ese nombre." });
      }
    }



    // Obtener estado inicial "Captación/ensayo"
    const estadoInicial = await EstadoProspecto.findOne({ where: { nombre: "Captación/ensayo" } });
    if (!estadoInicial) {
      return res.status(500).json({ message: "Estado 'Captación/ensayo' no está registrado en la base de datos." });
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
      archivo: req.file ? req.file.path : null,
      cedula_vendedora: asignarVendedora,
      created_at: fechaCreacion,
      empleados,
      eliminado: 0,
    });

    // Crear automáticamente una prospección (venta) con objetivo
    if (!req.body.objetivo || req.body.objetivo.trim().length < 1) {
      return res.status(400).json({ message: "Debes proporcionar un objetivo válido para la prospección." });
    }

    const id_categoria_venta = req.body.id_categoria_venta ? parseInt(req.body.id_categoria_venta, 10) : null;
    const nuevaVenta = await VentaProspecto.create({
      id_prospecto: nuevoProspecto.id_prospecto,
      objetivo: req.body.objetivo,
      id_estado: estadoInicial.id_estado,
      id_categoria_venta: id_categoria_venta || null,
      cedula_vendedora: asignarVendedora,
      monto_proyectado: monto_proyectado || null,
      abierta: 1,
      eliminado: 0,
    });

    const cedula = req.usuario?.cedula_ruc;
    const msgHistorial = `Creó el prospecto ${nuevoProspecto.nombre} y abrió prospección: ${req.body.objetivo}`;
    await registrarActividad(cedula, { modulo: "prospecto", accion: "crear", referencia_id: nuevoProspecto.id_prospecto, descripcion: msgHistorial });
    await agregarHistorialProspecto(nuevoProspecto.id_prospecto, cedula, "evento", msgHistorial);

    res.status(201).json({
      message: "Prospecto y prospección creados exitosamente",
      prospecto: nuevoProspecto,
      venta: nuevaVenta
    });
  } catch (error) {
    console.error("Error en crearProspecto:", error);
    res.status(500).json({ message: "Error al crear prospecto", error });
  }
};


// Actualizar un prospecto
const actualizarProspecto = async (req, res) => {
  const toUpper = (text) => typeof text === "string" ? text.toUpperCase() : text;

  try {
    if (req.body.empleados !== undefined && req.body.empleados < 0) {
      return res.status(400).json({ message: "El número de empleados no puede ser negativo" });
    }
    if (req.body.monto_proyectado !== undefined && req.body.monto_proyectado < 0) {
      return res.status(400).json({ message: "El monto proyectado no puede ser negativo" });
    }

    const { id_prospecto } = req.params;
    const {
      nombre, nombre_contacto, correo, telefono, direccion, provincia, ciudad, sector,
      id_origen, id_categoria, descripcion, id_estado, nota, cedula_vendedora
    } = req.body;

    const prospecto = await Prospecto.findByPk(id_prospecto);
    if (!prospecto) {
      return res.status(404).json({ message: "Prospecto no encontrado" });
    }

    // Validar que la vendedora asignada esté activa
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


    prospecto.nombre = nombre ? toUpper(nombre) : prospecto.nombre;
    prospecto.nombre_contacto = nombre_contacto ? toUpper(nombre_contacto) : prospecto.nombre_contacto;
    prospecto.correo = correo ? toUpper(correo) : prospecto.correo;
    prospecto.telefono = telefono ? toUpper(telefono) : prospecto.telefono;
    prospecto.direccion = direccion ? toUpper(direccion) : prospecto.direccion;
    prospecto.provincia = provincia ? toUpper(provincia) : prospecto.provincia;
    prospecto.ciudad = ciudad ? toUpper(ciudad) : prospecto.ciudad;
    prospecto.sector = sector ? toUpper(sector) : prospecto.sector;
    prospecto.descripcion = descripcion ? toUpper(descripcion) : prospecto.descripcion;
    prospecto.nota = nota ? toUpper(nota) : prospecto.nota;

    prospecto.id_origen = id_origen ?? prospecto.id_origen;
    prospecto.id_categoria = id_categoria ?? prospecto.id_categoria;
    prospecto.empleados = req.body.empleados ?? prospecto.empleados;
    prospecto.monto_proyectado = req.body.monto_proyectado ?? prospecto.monto_proyectado;
    prospecto.cedula_vendedora = vendedoraAsignada;

    if (req.file) {
      prospecto.archivo = req.file.path;
    }


    await prospecto.save();

    await registrarActividad(req.usuario?.cedula_ruc, { modulo: "prospecto", accion: "editar", referencia_id: parseInt(id_prospecto, 10), descripcion: `Actualizó el prospecto ${prospecto.nombre}` });

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
    const { razon } = req.body; // viene del frontend

    if (!razon || razon.trim().length < 3) {
      return res.status(400).json({ message: "Debe proporcionar una razón válida para eliminar el prospecto." });
    }

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

    // Solo permitir eliminar si no tiene prospecciones abiertas
    if (prospecto.ventas.some(v => v.abierta === 1 && v.eliminado === 0)) {
      return res.status(400).json({ message: "No se puede eliminar el prospecto. Tiene prospecciones activas." });
    }



    // Marcar prospecto como eliminado y guardar razón
    prospecto.eliminado = 1;
    prospecto.razon_eliminacion = razon;
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

    await registrarActividad(req.usuario?.cedula_ruc, { modulo: "prospecto", accion: "eliminar", referencia_id: parseInt(id_prospecto, 10), descripcion: `Eliminó el prospecto ${prospecto.nombre}. Razón: ${razon}` });

    res.json({ message: "Prospecto eliminado lógicamente con razón registrada." });
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
    const { id_categoria, sin_categoria } = req.query;

    const whereClause = { eliminado: 0 };

    if (rol === "vendedora") {
      whereClause.cedula_vendedora = cedula_ruc;
    } else if (cedula_vendedora) {
      whereClause.cedula_vendedora = cedula_vendedora;
    }

    if (sector) whereClause.sector = sector;
    if (sin_categoria === "true") {
      whereClause.id_categoria = null;
    } else if (id_categoria) {
      whereClause.id_categoria = id_categoria;
    }

    if (fechaInicio && fechaFin) {
      whereClause.created_at = {
        [Op.between]: [new Date(fechaInicio), new Date(`${fechaFin}T23:59:59`)],
      };
    }

    const prospectos = await Prospecto.findAll({
      where: whereClause,
      include: [

        { model: Usuario, as: "vendedora_prospecto", attributes: ["nombre"] },
        { model: OrigenProspecto, as: "origen_prospecto", attributes: ["descripcion"] },
        {
          model: VentaProspecto,
          as: "ventas",
          where: {
            eliminado: 0,
            ...(estado ? {
              id_estado: Array.isArray(estado)
                ? { [Op.in]: estado.map(e => parseInt(e)) }
                : parseInt(estado)
            } : {})
          },

          required: !!estado,
          include: [
            {
              model: SeguimientoVenta,
              as: "seguimientos",
              where: { eliminado: 0 },
              required: false
            },
            {
              model: EstadoProspecto,
              as: "estado_venta",
              attributes: ["id_estado", "nombre"]
            }
          ]
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
      { header: "Objetivo", key: "objetivo", width: 25 },
      { header: "Monto Proyectado", key: "monto_proyectado", width: 20 },
      { header: "Estado", key: "estado", width: 15 },
      { header: "Vendedora", key: "vendedora", width: 20 },
      { header: "Origen", key: "origen", width: 20 },
      { header: "Última Nota", key: "ultima_nota", width: 40 },
      { header: "Próximo Contacto", key: "proximo_contacto", width: 20 },
      { header: "Fecha de Creación", key: "fecha_creacion", width: 20 },
      { header: "Monto de Cierre", key: "monto_cierre", width: 20 },
      { header: "Fecha de Cierre", key: "fecha_cierre", width: 20 },

    ];

    prospectos.forEach((p) => {
      if (!p.ventas || p.ventas.length === 0) {
        sheet.addRow({
          id_prospecto: p.id_prospecto,
          nombre: p.nombre,
          nombre_contacto: p.nombre_contacto || "No registrado",
          correo: p.correo || "No registrado",
          telefono: p.telefono,
          direccion: p.direccion || "No registrada",
          sector: p.sector || "No registrado",
          objetivo: "Sin objetivo",
          monto_proyectado: "No definido",
          estado: "Sin estado",
          vendedora: p.vendedora_prospecto?.nombre || "No asignada",
          origen: p.origen_prospecto?.descripcion || "Desconocido",
          ultima_nota: "Sin nota",
          proximo_contacto: "Sin programar",
          fecha_creacion: new Date(p.created_at).toLocaleDateString("es-EC", { timeZone: "UTC" }),
          monto_cierre: "No cerrado",
          fecha_cierre: "No cerrada",
        });
      } else {
        p.ventas.forEach((venta) => {
          const ultimaNota = venta.seguimientos?.[0]?.nota || "Sin nota";
          const proximo = venta.seguimientos
            ?.filter((s) => s.estado === "pendiente")
            ?.sort((a, b) => new Date(a.fecha_programada) - new Date(b.fecha_programada))[0]
            ?.fecha_programada;

          const estadoVenta = venta.estado_venta?.nombre;
          const montoCierre = venta.monto_cierre;
          const fechaCierre = venta.fecha_cierre
            ? new Date(venta.fecha_cierre).toLocaleDateString("es-EC")
            : "No cerrada";

          sheet.addRow({
            id_prospecto: p.id_prospecto,
            nombre: p.nombre,
            nombre_contacto: p.nombre_contacto || "No registrado",
            correo: p.correo || "No registrado",
            telefono: p.telefono,
            direccion: p.direccion || "No registrada",
            sector: p.sector || "No registrado",
            empleados: p.empleados || "No registrado",
            objetivo: venta.objetivo || "Sin objetivo",
            monto_proyectado: venta.monto_proyectado ?? "No definido",
            estado:
              estadoVenta?.toLowerCase() === "cierre de venta" && montoCierre
                ? `Ganado ($${parseFloat(montoCierre).toFixed(2)})`
                : estadoVenta || "Sin estado",
            vendedora: p.vendedora_prospecto?.nombre || "No asignada",
            origen: p.origen_prospecto?.descripcion || "Desconocido",
            ultima_nota: ultimaNota,
            proximo_contacto: proximo
              ? new Date(proximo).toLocaleString("es-EC", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })
              : "Sin programar",
            fecha_creacion: new Date(p.created_at).toLocaleDateString("es-EC", { timeZone: "UTC" }),
            monto_cierre: montoCierre ?? "No cerrado",
            fecha_cierre: fechaCierre,
          });
        });
      }
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
