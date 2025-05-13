const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Usuario = sequelize.define("Usuario", {
    cedula_ruc: {
        type: DataTypes.STRING(20),
        primaryKey: true,
        allowNull: false,
    },
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    rol: {
        type: DataTypes.ENUM("vendedora", "admin", "lectura"),
        allowNull: false,
    },
    estado: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1, // 1 = activo, 0 = inactivo
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    }
}, {
    tableName: "usuario",
    timestamps: true,  // Permite que Sequelize maneje `created_at`
    createdAt: "created_at",  // Le decimos que use `created_at`
    updatedAt: false,  // No usa `updated_at` en la base de datos
    underscored: true,
});

module.exports = Usuario;
