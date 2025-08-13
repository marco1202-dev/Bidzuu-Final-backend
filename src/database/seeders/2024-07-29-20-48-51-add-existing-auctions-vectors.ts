import sequelize from 'sequelize'
import { Auction } from '../../modules/auctions/model.js'
import { VectorsManager } from '../../lib/vectors-manager.js'
import { Category } from '../../modules/categories/model.js'

export async function up({
  context: queryInterface,
}: {
  context: sequelize.QueryInterface
}) {
  const transaction = await queryInterface.sequelize.transaction()

  try {
    const allCategories = await Category.findAll({ transaction })
    const auctions = await Auction.findAll({ transaction })

    for (const auction of auctions) {
      const category = allCategories.find(
        (category) => category.id === auction.mainCategoryId
      )
      const subCategory = allCategories.find(
        (category) => category.id === auction.subCategoryId
      )

      const vectors = await VectorsManager.createAuctionVector(
        auction,
        category,
        subCategory
      )

      await Auction.update(
        { vectors },
        { where: { id: auction.id }, transaction }
      )
    }
    await transaction.commit()
  } catch (error) {
    console.error(error)
    await transaction.rollback()
    throw error
  }
}

export async function down({
  context: queryInterface,
}: {
  context: sequelize.QueryInterface
}) {
  const transaction = await queryInterface.sequelize.transaction()

  try {
    await transaction.commit()
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}
