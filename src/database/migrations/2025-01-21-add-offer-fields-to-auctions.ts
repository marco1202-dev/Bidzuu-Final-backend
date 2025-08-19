import { QueryInterface, DataTypes } from 'sequelize'

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  await context.addColumn('auctions', 'acceptedOfferId', {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'offers',
      key: 'id',
    },
  })

  await context.addColumn('auctions', 'acceptedOfferAt', {
    type: DataTypes.DATE,
    allowNull: true,
  })
}

export async function down({ context }: { context: QueryInterface }): Promise<void> {
  await context.removeColumn('auctions', 'acceptedOfferId')
  await context.removeColumn('auctions', 'acceptedOfferAt')
}
