const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Usuario = require("./Usuario.model");
const OrigenProspecto = require("./OrigenProspecto.model");

const Prospecto = sequelize.define("Prospecto", {
    id_prospecto: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    cedula_ruc: {
        type: DataTypes.STRING(20),
        allowNull: true,  
    },
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    correo: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    telefono: {
        type: DataTypes.STRING(20),
        allowNull: true,
    },
    direccion: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    provincia: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    ciudad: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    sector: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    id_origen: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: OrigenProspecto,
            key: "id_origen"
        },
        onDelete: "SET NULL",
    },
    nota: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    estado: {
        type: DataTypes.ENUM("nuevo", "interesado", "ganado", "perdido", "archivado"),
        allowNull: false,
        defaultValue: "nuevo",
    },
    cedula_vendedora: {
        type: DataTypes.STRING(20),
        allowNull: false,
        references: {
            model: Usuario,
            key: "cedula_ruc"
        },
        onDelete: "CASCADE",
    }
}, {
    tableName: "prospecto",
    timestamps: true,  
    underscored: true, 
    createdAt: "created_at",  
    updatedAt: "updated_at",  
});

module.exports = Prospecto;
