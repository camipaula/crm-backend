const Usuario = require("./Usuario.model");
const Prospecto = require("./Prospecto.model");
const OrigenProspecto = require("./OrigenProspecto.model");
const VentaProspecto = require("./VentaProspecto.model");
const SeguimientoVenta = require("./SeguimientoVenta.model");
const TipoSeguimiento = require("./TipoSeguimiento.model");

// Relación Usuario - Prospecto (1 a muchos)
Usuario.hasMany(Prospecto, { foreignKey: "cedula_vendedora", as: "prospectos_vendedora", onDelete: "CASCADE" });
Prospecto.belongsTo(Usuario, { foreignKey: "cedula_vendedora", as: "vendedora_prospecto" });

// Relación Prospecto - OrigenProspecto (1 a 1)
OrigenProspecto.hasMany(Prospecto, { foreignKey: "id_origen", as: "prospectos_origen", onDelete: "SET NULL" });
Prospecto.belongsTo(OrigenProspecto, { foreignKey: "id_origen", as: "origen_prospecto" });

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

module.exports = { 
    Usuario, 
    Prospecto, 
    OrigenProspecto, 
    VentaProspecto, 
    SeguimientoVenta, 
    TipoSeguimiento 
};
