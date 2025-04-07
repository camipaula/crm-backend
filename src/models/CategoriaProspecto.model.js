const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const CategoriaProspecto = sequelize.define("CategoriaProspecto", {
    id_categoria: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: false,
    }
}, {
    tableName: "categoria_prospecto",
    timestamps: false
});

module.exports = CategoriaProspecto;
