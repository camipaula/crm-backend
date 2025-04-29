  const VentaProspecto = require("../models/VentaProspecto.model");
  const Prospecto = require("../models/Prospecto.model");
  const SeguimientoVenta = require("../models/SeguimientoVenta.model");
  const TipoSeguimiento = require("../models/TipoSeguimiento.model");
  const EstadoProspecto = require("../models/EstadoProspecto.model");
  const Usuario = require("../models/Usuario.model");
  const { Op } = require("sequelize");

  // Obtener todas las ventas de prospectos con sus seguimientos
  const obtenerVentas = async (req, res) => {
    try {
      const ventas = await VentaProspecto.findAll({
        where: { eliminado: 0 },
        include: [
          {
            model: Prospecto,
            as: "prospecto",
            attributes: ["id_prospecto", "nombre", "nombre_contacto", "correo", "telefono", "cedula_vendedora"],
            include: [
              {
                model: EstadoProspecto,
                as: "estado_prospecto",
                attributes: ["nombre"],
              },
              {
                model: Usuario,
                as: "vendedora_prospecto",
                attributes: ["nombre", "estado"],
              }
            ]
          },
          {
            model: SeguimientoVenta,
            as: "seguimientos",
            where: { eliminado: 0 },
            required: false,
            include: [
              {
                model: TipoSeguimiento,
                as: "tipo_seguimiento",
                attributes: ["descripcion"],
              },
            ],
          },
        ],
      });

      res.json(ventas);
    } catch (error) {
      console.error(" Error al obtener ventas:", error);
      res.status(500).json({ message: "Error al obtener ventas", error });
    }
  };



  // Obtener todas las ventas de un prospecto específico
  const obtenerVentasPorProspecto = async (req, res) => {
    try {
      const { id_prospecto } = req.params;

      const ventas = await VentaProspecto.findAll({
        where: {
          id_prospecto,
          eliminado: 0
        },
        attributes: ["id_venta", "objetivo", "abierta", "fecha_cierre", "monto_cierre"],

        include: [
          {
            model: Prospecto,
            as: "prospecto",
            attributes: ["id_prospecto", "nombre", "nombre_contacto", "correo", "telefono", "cedula_vendedora"],
            include: [
              {
                model: EstadoProspecto,
                as: "estado_prospecto",
                attributes: ["nombre"]
              },
              {
                model: Usuario,
                as: "vendedora_prospecto",
                attributes: ["nombre", "estado"],
              }
            ]
          },
          {
            model: SeguimientoVenta,
            as: "seguimientos",
            where: { eliminado: 0 },
            required: false,
            include: [
              {
                model: TipoSeguimiento,
                as: "tipo_seguimiento",
                attributes: ["descripcion"]
              }
            ]
          }
        ],
      });

      if (!ventas.length) {
        return res.status(404).json({ message: "No hay ventas para este prospecto" });
      }

      res.json(ventas);
    } catch (error) {
      console.error(" Error al obtener ventas del prospecto:", error);
      res.status(500).json({ message: "Error al obtener ventas del prospecto", error });
    }
  };


  // Obtener una venta específica por ID
  const obtenerVentaPorId = async (req, res) => {
    try {
      const { id_venta } = req.params;

      const venta = await VentaProspecto.findByPk(id_venta, {
        include: [
          {
            model: Prospecto,
            as: "prospecto",
            attributes: ["id_prospecto", "nombre", "nombre_contacto", "correo", "telefono", "direccion", "cedula_vendedora", "created_at"],
            include: [
              {
                model: EstadoProspecto,
                as: "estado_prospecto",
                attributes: ["nombre"]
              },
              {
                model: Usuario,
                as: "vendedora_prospecto",
                attributes: ["nombre", "estado"]
              }
            ]
          },
          {
            model: SeguimientoVenta,
            as: "seguimientos",
            where: { eliminado: 0 },
            required: false,
            include: [
              { model: TipoSeguimiento, as: "tipo_seguimiento", attributes: ["descripcion"] }
            ]
          },
        ],
      });


      if (!venta || venta.eliminado === 1) {
        return res.status(404).json({ message: "Venta no encontrada" });
      }


      res.json(venta);
    } catch (error) {
      console.error("Error al obtener venta:", error);
      res.status(500).json({ message: "Error al obtener venta", error });
    }
  };



  // Crear una nueva venta para un prospecto
  const crearVenta = async (req, res) => {
    try {
      const { id_prospecto, objetivo } = req.body;

      const nuevaVenta = await VentaProspecto.create({
        id_prospecto,
        objetivo,
        abierta: 1,
        eliminado: 0,
      });
      res.status(201).json({ id_venta: nuevaVenta.id_venta });
    } catch (error) {
      console.error(" Error al crear venta:", error);
      res.status(500).json({ message: "Error al crear venta", error });
    }
  };



  // Cerrar una venta (marcar como cerrada)

  const cerrarVenta = async (req, res) => {
    try {
      const { id_venta } = req.params;

      const venta = await VentaProspecto.findByPk(id_venta);
      if (!venta) return res.status(404).json({ message: "Venta no encontrada" });

      venta.abierta = 0;
      venta.fecha_cierre = new Date();
      await venta.save();

      res.json({ message: "Venta cerrada exitosamente" });
    } catch (error) {
      console.error(" Error al cerrar venta:", error);
      res.status(500).json({ message: "Error al cerrar venta", error });
    }
  };

  // Editar el objetivo de una venta
  const editarObjetivoVenta = async (req, res) => {
    try {
      const { id_venta } = req.params;
      const { objetivo } = req.body;

      const venta = await VentaProspecto.findByPk(id_venta);
      if (!venta) return res.status(404).json({ message: "Venta no encontrada" });

      venta.objetivo = objetivo;
      await venta.save();

      res.json({ message: "Objetivo actualizado correctamente", venta });
    } catch (error) {
      console.error("Error al editar objetivo:", error);
      res.status(500).json({ message: "Error al editar objetivo", error });
    }
  };


  /*// Eliminar una venta
  const eliminarVenta = async (req, res) => {
    try {
      const { id_venta } = req.params;

      const deleted = await VentaProspecto.destroy({ where: { id_venta } });

      if (!deleted) return res.status(404).json({ message: "Venta no encontrada" });

      res.json({ message: "Venta eliminada correctamente" });
    } catch (error) {
      console.error(" Error al eliminar venta:", error);
      res.status(500).json({ message: "Error al eliminar venta", error });
    }
  };*/

  // Eliminar una venta (eliminación lógica)
  const eliminarVenta = async (req, res) => {
    try {
      // Validar si el usuario tiene permiso (debe ser admin)
      if (req.usuario.rol !== "admin") {
        return res.status(403).json({ message: "Acceso denegado. Solo la administradora puede eliminar ventas." });
      }

      const { id_venta } = req.params;

      const venta = await VentaProspecto.findByPk(id_venta, {
        include: {
          model: SeguimientoVenta,
          as: "seguimientos"
        }
      });

      if (!venta || venta.eliminado === 1) {
        return res.status(404).json({ message: "Venta no encontrada" });
      }

      // Eliminar lógicamente la venta
      venta.eliminado = 1;
      await venta.save();

      // Eliminar lógicamente los seguimientos relacionados
      for (const seguimiento of venta.seguimientos) {
        seguimiento.eliminado = 1;
        await seguimiento.save();
      }

      res.json({ message: "Venta y seguimientos eliminados correctamente" });
    } catch (error) {
      console.error("Error al eliminar venta:", error);
      res.status(500).json({ message: "Error al eliminar venta", error });
    }
  };





  const obtenerProspeccionesAgrupadas = async (req, res) => {
    try {
      const { cedula_vendedora, estado_prospeccion, page = 1, limit = 10, seguimiento, nombre } = req.query;

      const whereVenta = { eliminado: 0 };
      if (estado_prospeccion === "abiertas") whereVenta.abierta = 1;
      if (estado_prospeccion === "cerradas") whereVenta.abierta = 0;

      const prospectoWhere = {};

      if (cedula_vendedora && cedula_vendedora !== "undefined") {
        prospectoWhere.cedula_vendedora = cedula_vendedora;
      }
      
      if (nombre) {
        prospectoWhere.nombre = { [Op.like]: `%${nombre}%` };
      }
      


      let rows = await VentaProspecto.findAll({
        subQuery: false,
        where: whereVenta,
        order: [["created_at", "DESC"]],
        include: [
          {
            model: Prospecto,
            as: "prospecto",
            attributes: ["id_prospecto", "nombre", "cedula_vendedora"],
            where: Object.keys(prospectoWhere).length ? prospectoWhere : undefined,
            include: [
              { model: EstadoProspecto, as: "estado_prospecto", attributes: ["nombre"] },
              { model: Usuario, as: "vendedora_prospecto", attributes: ["nombre", "estado"] }
            ],
          },
          {
            model: SeguimientoVenta,
            as: "seguimientos",
            where: { eliminado: 0 },
            required: false,
            include: [
              { model: TipoSeguimiento, as: "tipo_seguimiento", attributes: ["descripcion"] }
            ],
          },
        ],
      });

      // 🔥 Si hay filtro de seguimiento, filtras en memoria
      if (seguimiento && seguimiento !== "todos") {
        rows = rows.filter((venta) => {
          const seguimientos = venta.seguimientos || [];
          if (seguimientos.length === 0) return seguimiento === "sin_seguimiento";
      
          // 🔥 Buscar el pendiente más próximo
          const pendientes = seguimientos
            .filter(s => s.estado === "pendiente")
            .sort((a, b) => new Date(a.fecha_programada) - new Date(b.fecha_programada));
      
          if (pendientes.length > 0) {
            const siguientePendiente = pendientes[0];
            const fechaProgramada = new Date(siguientePendiente.fecha_programada);
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            fechaProgramada.setHours(0, 0, 0, 0);
      
            const diffDias = (fechaProgramada - hoy) / (1000 * 60 * 60 * 24);
      
            switch (seguimiento) {
              case "vencido":
                return diffDias < 0;
              case "hoy":
                return diffDias === 0;
              case "proximo":
                return diffDias > 0 && diffDias <= 7;
              case "futuro":
                return diffDias > 7;
              default:
                return false;
            }
          }
      
          // 🔥 Si no hay pendientes, buscar el último realizado
          const realizados = seguimientos
            .filter(s => s.estado === "realizado")
            .sort((a, b) => new Date(b.fecha_programada) - new Date(a.fecha_programada));
      
          if (realizados.length > 0) {
            return seguimiento === "realizado";
          }
      
          // 🔥 Si no hay nada, es sin seguimiento
          return seguimiento === "sin_seguimiento";
        });
      }
      

      // 🔥 Siempre después del filtro calcula paginación
      const total = rows.length;
      const paginados = rows.slice((page - 1) * limit, page * limit);

      res.json({
        total,
        totalPages: Math.ceil(total / limit),
        page: parseInt(page),
        prospecciones: paginados
      });

    } catch (error) {
      console.error("Error al obtener prospecciones agrupadas:", error);
      res.status(500).json({ message: "Error al obtener prospecciones", error });
    }
  };



  module.exports = {
    obtenerVentas,
    obtenerVentasPorProspecto,
    obtenerVentaPorId,
    crearVenta,
    cerrarVenta,
    eliminarVenta,
    editarObjetivoVenta,
    obtenerProspeccionesAgrupadas
  };
