import sequelize, { Op } from 'sequelize'
import { Auction } from '../../modules/auctions/model.js'

export async function up({ context: queryInterface }: { context: sequelize.QueryInterface }) {
  const transaction = await queryInterface.sequelize.transaction()

  try {
    const auctionsToUpdate = await Auction.findAll({
      where: {
        startAt: { [Op.eq]: null },
        startedAt: { [Op.eq]: null },
      },
    })

    for (const auction of auctionsToUpdate) {
      auction.startedAt = auction.createdAt
      await auction.save({ transaction })
    }

    await transaction.commit()
  } catch (error) {
    console.error(error)
    await transaction.rollback()
    throw error
  }
}

export async function down({ context: queryInterface }: { context: sequelize.QueryInterface }) {
  const transaction = await queryInterface.sequelize.transaction()

  try {
    await transaction.commit()
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}
