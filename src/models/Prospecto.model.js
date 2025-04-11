    const { DataTypes } = require("sequelize");
    const sequelize = require("../config/database");
    const Usuario = require("./Usuario.model");
    const OrigenProspecto = require("./OrigenProspecto.model");
    const CategoriaProspecto = require("./CategoriaProspecto.model"); 

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
        nombre_contacto: {
            type: DataTypes.STRING(100),
            allowNull: true,
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
        id_categoria: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: CategoriaProspecto,
                key: "id_categoria"
            },
            onDelete: "SET NULL",
        },
        descripcion: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        nota: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        archivo: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        id_estado: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
              model: 'estado_prospecto',
              key: 'id_estado',
            }
          },          
        cedula_vendedora: {
            type: DataTypes.STRING(20),
            allowNull: true,
            references: {
                model: Usuario,
                key: "cedula_ruc"
            },
            onDelete: "SET NULL", // Si se borra la vendedora, el campo se pone en NULL
        },
        eliminado: {
            type: DataTypes.TINYINT,
            defaultValue: 0
          }          
    }, {
        tableName: "prospecto",
        timestamps: true,  
        underscored: true, 
        createdAt: "created_at",  
        updatedAt: "updated_at",  
    });

    module.exports = Prospecto;
