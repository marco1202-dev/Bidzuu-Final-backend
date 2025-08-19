import sequelize from 'sequelize'
import { DataTypes, Model } from 'sequelize'
import { DATABASE_MODELS } from '../../constants/model-names.js'
import { getModelConfig } from '../../utils/db.js'
import { Account } from '../accounts/model.js'

export class VerificationRequest extends Model {
  declare id: string
  declare accountId: string
  declare firstName: string
  declare lastName: string
  declare address: string
  declare city: string
  declare state: string
  declare zipCode: string
  declare mobileNumber: string
  declare dateOfBirth: string
  declare country: string
  declare idCardImageUrl: string
  declare extractedData: Record<string, any>
  declare status: 'pending' | 'approved' | 'rejected'
  declare adminNotes?: string
  declare reviewedBy?: string
  declare reviewedAt?: Date
  declare readonly createdAt: Date
  declare readonly updatedAt: Date

  // Associations
  declare readonly account: Account

  static initModel = initModel
  static initAssociations = initAssociations
}

function initModel(): void {
  const modelConfig = getModelConfig(DATABASE_MODELS.VERIFICATION_REQUESTS)
  VerificationRequest.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      accountId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: DATABASE_MODELS.ACCOUNTS,
          key: 'id',
        },
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      city: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      state: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      zipCode: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      mobileNumber: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      dateOfBirth: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      country: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      idCardImageUrl: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      extractedData: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      adminNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      reviewedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: DATABASE_MODELS.ACCOUNTS,
          key: 'id',
        },
      },
      reviewedAt: {
        type: DataTypes.DATE,
        allowNull: true,
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
  VerificationRequest.belongsTo(Account, {
    foreignKey: 'accountId',
    as: 'account',
  })
}

export default VerificationRequest
