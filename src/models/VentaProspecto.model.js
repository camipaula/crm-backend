const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Prospecto = require("./Prospecto.model");
//const EstadoProspecto = require("./EstadoProspecto.model");

const VentaProspecto = sequelize.define("VentaProspecto", {
    id_venta: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    id_prospecto: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Prospecto,
            key: "id_prospecto"
        },
        onDelete: "CASCADE",
    },
    objetivo: {
        type: DataTypes.STRING(255),
        allowNull: false,  
    },
    abierta: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1,  // 1 = abierta, 0 = cerrada
    },    
    fecha_cierre: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    monto_cierre: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        get() {
          const rawValue = this.getDataValue("monto_cierre");
          return rawValue !== null ? parseFloat(rawValue) : null;
        },
      },
      /*id_estado: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: EstadoProspecto,
          key: "id_estado",
        },
        onDelete: "SET NULL",
      },*/
       
    eliminado: {
        type: DataTypes.TINYINT,
        defaultValue: 0
      }      
}, {
    tableName: "venta_prospecto",
    timestamps: true,  
    underscored: true, 
    createdAt: "created_at",  
    updatedAt: "updated_at",  
});

// Relación con Prospecto
VentaProspecto.belongsTo(Prospecto, { foreignKey: "id_prospecto" });

module.exports = VentaProspecto;
