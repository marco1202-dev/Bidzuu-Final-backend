import { fn, col, Op, Transaction } from 'sequelize'
import { GenericRepository } from '../../lib/base-repository.js'
import { Auction } from '../auctions/model.js'
import { Category } from './model.js'
import { DATABASE_MODELS } from '../../constants/model-names.js'
import { DatabaseConnection } from '../../database/index.js'
import { AuctionsRepository } from '../auctions/repository.js'
import { Asset } from '../assets/model.js'
import { getDataFromCache, setDataInCache } from '../../api/middlewares/cache.js'

class CategoriesRepository extends GenericRepository<Category> {
  constructor() {
    super(Category)
  }

  public async getAllWithoutCount() {
    const cachedData = await getDataFromCache('categories')
    if (cachedData) {
      return JSON.parse(cachedData)
    }

    const categories = await Category.findAll({
      attributes: ['id', 'name', 'parentCategoryId'],
    })

    setDataInCache('categories', JSON.stringify(categories))
    return categories
  }

  // When removing a category, we are removing all the
  // auctions from that category
  public async deleteCategory(categoryId: string) {
    return await DatabaseConnection.getInstance().transaction(async (transaction: Transaction) => {
      const auctionsWithThisCategory = await Auction.findAll({
        attributes: ['id', 'mainCategoryId', 'subCategoryId'],
        where: {
          [Op.or]: {
            mainCategoryId: categoryId,
            subCategoryId: categoryId,
          },
        },
        transaction,
      })

      for (const auctionToDelete of auctionsWithThisCategory) {
        await AuctionsRepository.deleteAuction(auctionToDelete.id, transaction, false)
      }
      // We also need to remove all the subcategories
      await Category.destroy({
        where: { parentCategoryId: categoryId },
        transaction,
      })

      await Category.destroy({ where: { id: categoryId }, transaction })
    })
  }

  public async findAllWithAuctionsCount(): Promise<(Category & { auctionsCount: number })[]> {
    const categories = await Category.findAll({
      attributes: {
        include: [
          // Count of auctions where the category is the main category
          [fn('COUNT', col('mainCategoryAuctions.id')), 'mainCategoryAuctionCount'],
          // Count of auctions where the category is the sub category
          [fn('COUNT', col('subCategoryAuctions.id')), 'subCategoryAuctionCount'],
        ],
        exclude: ['vectors'],
      },
      include: [
        {
          model: Asset,
          as: 'asset',
        },
        {
          model: Auction,
          as: 'mainCategoryAuctions',
          attributes: [],
          where: { expiresAt: { [Op.gt]: new Date() }, acceptedBidId: null },
          required: false,
        },
        {
          model: Auction,
          as: 'subCategoryAuctions',
          attributes: [],
          where: { expiresAt: { [Op.gt]: new Date() }, acceptedBidId: null },
          required: false,
        },
      ],
      group: [`${DATABASE_MODELS.CATEGORIES}.id`, `asset.id`],
      order: [['createdAt', 'ASC']],
    })

    return categories.map((category) => {
      const data = category.toJSON()
      delete data.vector

      data.auctionsCount = data.parentCategoryId
        ? data.subCategoryAuctionCount
        : data.mainCategoryAuctionCount

      delete data.mainCategoryAuctionCount
      delete data.subCategoryAuctionCount
      return data
    })
  }

  public async getVectorsForCategories(categoryIds: string[]) {
    const categories = await Category.findAll({
      where: { id: categoryIds },
      attributes: ['vector'],
    })

    return categories.map((category) => category.vector)
  }
}

const categoriesRepositoryInstance = new CategoriesRepository()
Object.freeze(categoriesRepositoryInstance)

export { categoriesRepositoryInstance as CategoriesRepository }
