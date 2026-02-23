"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */

    await queryInterface.createTable(
      "requests",
      {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        id_user: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: "users",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        user_request: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        category: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        email_request: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        department: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        ticket_status: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        user_process: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        priority: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        start_process_ticket: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        end_date_ticket: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
      },
      {
        underscored: true,
      }
    );
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */

    await queryInterface.dropTable("requests");
  },
};
