import { Model, DataTypes } from 'sequelize'
import { DATABASE_MODELS } from '../../constants/model-names.js'
import { Account } from '../accounts/model.js'
import { Auction } from '../auctions/model.js'
import { getModelConfig } from '../../utils/db.js'

export class Favourite extends Model {
  declare accountId: string
  declare auctionId: string

  declare readonly createdAt: Date
  declare readonly updatedAt: Date

  declare readonly account: Account
  declare readonly auction: Auction

  static initModel = initModel
  static initAssociations = initAssociations
}

function initModel(): void {
  const modelConfig = getModelConfig(DATABASE_MODELS.ACCOUNT_FAVOURITES)
  Favourite.init(
    {
      accountId: {
        type: DataTypes.UUID,
        primaryKey: true,
      },
      auctionId: {
        type: DataTypes.UUID,
        primaryKey: true,
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
    },
    modelConfig
  )
}

function initAssociations() {
  Favourite.belongsTo(Account, {
    foreignKey: 'accountId',
    onDelete: 'cascade',
    as: 'account',
  })
  Favourite.belongsTo(Auction, {
    foreignKey: 'auctionId',
    onDelete: 'cascade',
    as: 'auction',
  })
}
