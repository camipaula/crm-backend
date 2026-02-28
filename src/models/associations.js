const Usuario = require("./Usuario.model");
const Prospecto = require("./Prospecto.model");
const OrigenProspecto = require("./OrigenProspecto.model");
const CategoriaProspecto = require("./CategoriaProspecto.model");
const VentaProspecto = require("./VentaProspecto.model");
const SeguimientoVenta = require("./SeguimientoVenta.model");
const TipoSeguimiento = require("./TipoSeguimiento.model");
const EstadoProspecto = require("./EstadoProspecto.model");
const CategoriaVenta = require("./CategoriaVenta.model");
const Documento = require("./Documento.model");
const LogAcceso = require("./LogAcceso.model");
const LogActividad = require("./LogActividad.model");
const ProspectoHistorial = require("./ProspectoHistorial.model");

// Relación Usuario - Prospecto (1 a muchos)
Usuario.hasMany(Prospecto, { foreignKey: "cedula_vendedora", as: "prospectos_vendedora", onDelete: "CASCADE" });
Prospecto.belongsTo(Usuario, { foreignKey: "cedula_vendedora", as: "vendedora_prospecto" });

// Relación Prospecto - OrigenProspecto (1 a 1)
OrigenProspecto.hasMany(Prospecto, { foreignKey: "id_origen", as: "prospectos_origen", onDelete: "SET NULL" });
Prospecto.belongsTo(OrigenProspecto, { foreignKey: "id_origen", as: "origen_prospecto" });

// Relación Prospecto - CategoriaProspecto (1 a 1)
CategoriaProspecto.hasMany(Prospecto, { foreignKey: "id_categoria", as: "prospectos_categoria", onDelete: "SET NULL" });
Prospecto.belongsTo(CategoriaProspecto, { foreignKey: "id_categoria", as: "categoria_prospecto" });


// Relación Prospecto - VentaProspecto (1 a muchos)
Prospecto.hasMany(VentaProspecto, { foreignKey: "id_prospecto", as: "ventas", onDelete: "CASCADE" });
VentaProspecto.belongsTo(Prospecto, { foreignKey: "id_prospecto", as: "prospecto" });

// Relación VentaProspecto - SeguimientoVenta (1 a muchos)
VentaProspecto.hasMany(SeguimientoVenta, { foreignKey: "id_venta", as: "seguimientos", onDelete: "CASCADE" });
SeguimientoVenta.belongsTo(VentaProspecto, { foreignKey: "id_venta", as: "venta" });

// Relación Usuario - SeguimientoVenta (1 a muchos)
Usuario.hasMany(SeguimientoVenta, { foreignKey: "cedula_vendedora", as: "mis_seguimientos", onDelete: "CASCADE" });
SeguimientoVenta.belongsTo(Usuario, { foreignKey: "cedula_vendedora", as: "vendedora_seguimiento" });

// Relación TipoSeguimiento - SeguimientoVenta (1 a muchos)
TipoSeguimiento.hasMany(SeguimientoVenta, { foreignKey: "id_tipo", as: "seguimientos_tipo", onDelete: "CASCADE" });
SeguimientoVenta.belongsTo(TipoSeguimiento, { foreignKey: "id_tipo", as: "tipo_seguimiento" });



// Relaciones estado y venta 

VentaProspecto.belongsTo(EstadoProspecto, { foreignKey: "id_estado", as: "estado_venta" });
VentaProspecto.belongsTo(CategoriaVenta, { foreignKey: "id_categoria_venta", as: "categoria_venta" });
CategoriaVenta.hasMany(VentaProspecto, { foreignKey: "id_categoria_venta", as: "ventas", onDelete: "SET NULL" });
Usuario.hasMany(VentaProspecto, { foreignKey: "cedula_vendedora", as: "ventas_asignadas", onDelete: "SET NULL" });
VentaProspecto.belongsTo(Usuario, { foreignKey: "cedula_vendedora", as: "vendedora_venta" });
// Relación con Prospecto
VentaProspecto.belongsTo(Prospecto, { foreignKey: "id_prospecto" });

// Documentos: Prospecto, Venta, Usuario
Prospecto.hasMany(Documento, { foreignKey: "id_prospecto", as: "documentos", onDelete: "SET NULL" });
Documento.belongsTo(Prospecto, { foreignKey: "id_prospecto", as: "prospecto" });
VentaProspecto.hasMany(Documento, { foreignKey: "id_venta", as: "documentos", onDelete: "SET NULL" });
Documento.belongsTo(VentaProspecto, { foreignKey: "id_venta", as: "venta" });
Usuario.hasMany(Documento, { foreignKey: "subido_por", as: "documentos_subidos", onDelete: "SET NULL" });
Documento.belongsTo(Usuario, { foreignKey: "subido_por", as: "usuario" });

// Logs y auditoría
Usuario.hasMany(LogAcceso, { foreignKey: "cedula_usuario", onDelete: "CASCADE" });
LogAcceso.belongsTo(Usuario, { foreignKey: "cedula_usuario", as: "usuario" });
Usuario.hasMany(LogActividad, { foreignKey: "cedula_usuario", onDelete: "CASCADE" });
LogActividad.belongsTo(Usuario, { foreignKey: "cedula_usuario", as: "usuario" });

// Historial del prospecto (eventos + notas)
Prospecto.hasMany(ProspectoHistorial, { foreignKey: "id_prospecto", as: "historial", onDelete: "CASCADE" });
ProspectoHistorial.belongsTo(Prospecto, { foreignKey: "id_prospecto", as: "prospecto" });
Usuario.hasMany(ProspectoHistorial, { foreignKey: "cedula_usuario", as: "historiales", onDelete: "CASCADE" });
ProspectoHistorial.belongsTo(Usuario, { foreignKey: "cedula_usuario", as: "usuario" });

module.exports = {
  Usuario,
  Prospecto,
  OrigenProspecto,
  VentaProspecto,
  CategoriaVenta,
  SeguimientoVenta,
  TipoSeguimiento,
  EstadoProspecto,
  Documento,
  LogAcceso,
  LogActividad,
  ProspectoHistorial,
};
