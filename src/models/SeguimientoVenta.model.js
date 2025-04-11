const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const VentaProspecto = require("./VentaProspecto.model");
const Usuario = require("./Usuario.model");
const TipoSeguimiento = require("./TipoSeguimiento.model");

const SeguimientoVenta = sequelize.define("SeguimientoVenta", {
    id_seguimiento: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    id_venta: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: VentaProspecto,
            key: "id_venta"
        },
        onDelete: "CASCADE",
    },
    cedula_vendedora: {
        type: DataTypes.STRING(20),
        allowNull: false,
        references: {
            model: Usuario,
            key: "cedula_ruc"
        },
        onDelete: "CASCADE",
    },
    fecha_programada: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    id_tipo: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: TipoSeguimiento,
            key: "id_tipo"
        },
        onDelete: "CASCADE",
    },
    resultado: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    motivo: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    nota: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    estado: {
        type: DataTypes.ENUM("pendiente", "realizado", "cancelado"),
        allowNull: false,
        defaultValue: "pendiente",
    },
    eliminado: {
        type: DataTypes.TINYINT,
        defaultValue: 0
      }      
}, {
    tableName: "seguimiento_venta",
    timestamps: true,  
    underscored: true, 
    createdAt: "created_at",  
    updatedAt: "updated_at",  
});

// Relación con VentaProspecto y Usuario
SeguimientoVenta.belongsTo(VentaProspecto, { foreignKey: "id_venta" });
SeguimientoVenta.belongsTo(Usuario, { foreignKey: "cedula_vendedora" });
SeguimientoVenta.belongsTo(TipoSeguimiento, { foreignKey: "id_tipo" });

module.exports = SeguimientoVenta;
