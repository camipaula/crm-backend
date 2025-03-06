const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const OrigenProspecto = sequelize.define("OrigenProspecto", {
    id_origen: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    descripcion: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
    }
}, {
    tableName: "origen_prospecto",
    timestamps: false,
    underscored: true,
});

module.exports = OrigenProspecto;
