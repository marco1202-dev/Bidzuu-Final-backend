import sequelize, { DataTypes } from 'sequelize'
import { DATABASE_MODELS } from '../../constants/model-names.js'

export async function up({
  context: queryInterface,
}: {
  context: sequelize.QueryInterface
}) {
  const transaction = await queryInterface.sequelize.transaction()

  try {
    await queryInterface.createTable(
      DATABASE_MODELS.ASSETS,
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
        },
        path: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        size: {
          type: sequelize.DataTypes.INTEGER,
          allowNull: false,
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
      { transaction }
    )

    await queryInterface.createTable(
      DATABASE_MODELS.ACCOUNTS,
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        email: {
          type: DataTypes.STRING(100),
          unique: true,
          allowNull: true,
          validate: {
            isEmail: true,
          },
        },
        authId: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        isAnonymous: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        identities: DataTypes.JSON,
        deviceFCMToken: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        picture: DataTypes.TEXT,
        acceptedTermsAndCondition: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        introDone: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        introSkipped: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        assetId: {
          type: DataTypes.UUID,
          references: {
            model: DATABASE_MODELS.ASSETS,
            key: 'id',
          },
          allowNull: true,
        },
        meta: {
          type: DataTypes.JSONB,
          defaultValue: {},
        },
        allowedNotifications: {
          type: DataTypes.JSONB,
          defaultValue: {
            NEW_BID_ON_AUCTION: true,
            AUCTION_UPDATED: true,
            BID_REMOVED_ON_AUCTION: false,
            BID_ACCEPTED_ON_AUCTION: true,
            BID_REJECTED_ON_AUCTION: true,
            REVIEW_RECEIVED: true,
            NEW_MESSAGE: true,
            SYSTEM: true,
            SOMEONE_ELSE_ADDED_BID_TO_SAME_AUCTION: true,
            BID_WAS_SEEN: true,
            NEW_FOLLOWER: true,
            AUCTION_FROM_FAVOURITES_HAS_BID: true,
            NEW_AUCTION_FROM_FOLLOWING: true,
            AUCTION_ADDED_TO_FAVOURITES: true,
            FAVOURITE_AUCTION_PRICE_CHANGE: true,
          },
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
      { transaction }
    )

    await queryInterface.createTable(
      DATABASE_MODELS.NOTIFICATIONS,
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
        },
        accountId: {
          type: DataTypes.UUID,
          references: {
            model: DATABASE_MODELS.ACCOUNTS,
            key: 'id',
          },
        },
        title: {
          type: DataTypes.JSONB,
          allowNull: false,
        },
        description: {
          type: DataTypes.JSONB,
          allowNull: false,
        },
        type: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        initiatedByAccountId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        entityId: {
          type: DataTypes.UUID,
        },
        read: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        readAt: {
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
      { transaction }
    )

    await queryInterface.createTable(
      DATABASE_MODELS.LOCATIONS,
      {
        id: {
          type: DataTypes.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: sequelize.literal('gen_random_uuid()'),
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
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
      { transaction }
    )

    await queryInterface.createTable(
      DATABASE_MODELS.CATEGORIES,
      {
        id: {
          type: DataTypes.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: sequelize.literal('gen_random_uuid()'),
        },
        parentCategoryId: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: DATABASE_MODELS.CATEGORIES,
            key: 'id',
          },
        },
        name: {
          type: DataTypes.JSONB,
          allowNull: false,
        },
        icon: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        details: {
          type: DataTypes.JSONB,
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
      { transaction }
    )

    await queryInterface.createTable(
      DATABASE_MODELS.BIDS,
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
        },
        auctionId: {
          type: DataTypes.UUID,
        },
        bidderId: {
          type: DataTypes.UUID,
          references: {
            model: DATABASE_MODELS.ACCOUNTS,
            key: 'id',
          },
        },
        price: {
          type: DataTypes.DOUBLE,
          allowNull: false,
        },
        description: {
          type: DataTypes.STRING(1000),
          allowNull: true,
        },
        locationPretty: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        locationLat: {
          type: DataTypes.DOUBLE,
          allowNull: false,
        },
        locationLong: {
          type: DataTypes.DOUBLE,
          allowNull: false,
        },
        isRejected: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        rejectionReason: {
          type: DataTypes.STRING(1000),
          allowNull: true,
        },
        isAccepted: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
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
      { transaction }
    )

    await queryInterface.createTable(
      DATABASE_MODELS.AUCTIONS,
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
        },
        accountId: {
          type: DataTypes.UUID,
          references: {
            model: DATABASE_MODELS.ACCOUNTS,
            key: 'id',
          },
        },
        locationId: {
          type: DataTypes.UUID,
          references: {
            model: DATABASE_MODELS.LOCATIONS,
            key: 'id',
          },
        },
        locationPretty: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        locationLat: {
          type: DataTypes.DOUBLE,
          allowNull: false,
        },
        locationLong: {
          type: DataTypes.DOUBLE,
          allowNull: false,
        },
        mainCategoryId: {
          type: DataTypes.UUID,
          references: {
            model: DATABASE_MODELS.CATEGORIES,
            key: 'id',
          },
        },
        subCategoryId: {
          type: DataTypes.UUID,
          references: {
            model: DATABASE_MODELS.CATEGORIES,
            key: 'id',
          },
        },
        title: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        description: {
          type: DataTypes.STRING(1000),
        },
        isNewItem: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
        },
        views: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
        },
        acceptedBidId: {
          type: DataTypes.UUID,
          references: {
            model: DATABASE_MODELS.BIDS,
            key: 'id',
          },
          allowNull: true,
        },
        acceptedBidAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        startingPrice: {
          type: DataTypes.DOUBLE,
          allowNull: false,
        },
        hasCustomStartingPrice: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        lastPrice: {
          type: DataTypes.DOUBLE,
          allowNull: true,
        },
        expiresAt: {
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
      { transaction }
    )

    await queryInterface.createTable(
      DATABASE_MODELS.ACCOUNT_FAVOURITES,
      {
        accountId: {
          type: DataTypes.UUID,
          references: {
            model: DATABASE_MODELS.ACCOUNTS,
            key: 'id',
          },
          primaryKey: true,
        },
        auctionId: {
          type: DataTypes.UUID,
          references: {
            model: DATABASE_MODELS.AUCTIONS,
            key: 'id',
          },
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
      { transaction }
    )

    await queryInterface.createTable(
      DATABASE_MODELS.AUCTION_ASSETS,
      {
        auctionId: {
          type: DataTypes.UUID,
          primaryKey: true,
          references: {
            model: DATABASE_MODELS.AUCTIONS,
            key: 'id',
          },
        },
        assetId: {
          type: DataTypes.UUID,
          primaryKey: true,
          references: {
            model: DATABASE_MODELS.ASSETS,
            key: 'id',
          },
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
      { transaction }
    )

    await queryInterface.createTable(
      DATABASE_MODELS.REVIEWS,
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
        },
        fromAccountId: {
          type: DataTypes.UUID,
          references: {
            model: DATABASE_MODELS.ACCOUNTS,
            key: 'id',
          },
        },
        toAccountId: {
          type: DataTypes.UUID,
          references: {
            model: DATABASE_MODELS.ACCOUNTS,
            key: 'id',
          },
        },
        stars: {
          type: DataTypes.INTEGER,
          validate: {
            min: 1,
            max: 5,
          },
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        auctionId: {
          type: DataTypes.UUID,
          references: {
            model: DATABASE_MODELS.AUCTIONS,
            key: 'id',
          },
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
      { transaction }
    )

    await queryInterface.createTable(
      DATABASE_MODELS.SEARCH_HISTORY,
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
        },
        accountId: {
          type: DataTypes.UUID,
          references: {
            model: DATABASE_MODELS.ACCOUNTS,
            key: 'id',
          },
        },
        searchKey: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        type: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        entityId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        data: {
          type: DataTypes.TEXT,
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
      { transaction }
    )

    await queryInterface.createTable(
      DATABASE_MODELS.CHAT_GROUPS,
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
        },
        firstAccountId: {
          type: DataTypes.UUID,
          references: {
            model: DATABASE_MODELS.ACCOUNTS,
            key: 'id',
          },
          allowNull: false,
        },
        secondAccountId: {
          type: DataTypes.UUID,
          references: {
            model: DATABASE_MODELS.ACCOUNTS,
            key: 'id',
          },
          allowNull: false,
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
      {
        transaction,
        uniqueKeys: {
          action_unique: { fields: ['firstAccountId', 'secondAccountId'] },
        },
      }
    )

    await queryInterface.createTable(
      DATABASE_MODELS.CHAT_MESSAGES,
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
        },
        chatGroupId: {
          type: DataTypes.UUID,
          references: {
            model: DATABASE_MODELS.CHAT_GROUPS,
            key: 'id',
          },
          allowNull: false,
        },
        fromAccountId: {
          type: DataTypes.UUID,
          references: {
            model: DATABASE_MODELS.ACCOUNTS,
            key: 'id',
          },
          allowNull: false,
        },
        message: {
          type: DataTypes.TEXT,
          allowNull: false,
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
      { transaction }
    )

    await queryInterface.createTable(
      DATABASE_MODELS.FOLLOWERS,
      {
        followerId: {
          type: DataTypes.UUID,
          references: {
            model: DATABASE_MODELS.ACCOUNTS,
            key: 'id',
          },
          allowNull: false,
          primaryKey: true,
        },
        followingId: {
          type: DataTypes.UUID,
          references: {
            model: DATABASE_MODELS.ACCOUNTS,
            key: 'id',
          },
          allowNull: false,
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
      {
        transaction,
        uniqueKeys: {
          action_unique: { fields: ['followerId', 'followingId'] },
        },
      }
    )

    await queryInterface.createTable(
      DATABASE_MODELS.REPORTS,
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
        },
        reportedBy: {
          type: DataTypes.UUID,
          references: {
            model: DATABASE_MODELS.ACCOUNTS,
            key: 'id',
          },
        },
        entityName: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        entityId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        reason: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
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
      { transaction }
    )

    await queryInterface.createTable(
      DATABASE_MODELS.LAST_SEEN_AUCTIONS,
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
        },
        accountId: {
          type: DataTypes.UUID,
          references: {
            model: DATABASE_MODELS.ACCOUNTS,
            key: 'id',
          },
        },
        auctionId: {
          type: DataTypes.UUID,
          references: {
            model: DATABASE_MODELS.AUCTIONS,
            key: 'id',
          },
        },
        lastSeenAt: {
          type: DataTypes.DATE,
          allowNull: false,
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
      { transaction }
    )

    await queryInterface.createTable(
      DATABASE_MODELS.FILTERS,
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
        },
        accountId: {
          type: DataTypes.UUID,
          references: {
            model: DATABASE_MODELS.ACCOUNTS,
            key: 'id',
          },
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        type: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        data: {
          type: DataTypes.JSONB,
          allowNull: false,
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
      { transaction }
    )

    await queryInterface.addIndex(DATABASE_MODELS.ACCOUNTS, ['email'], {
      transaction,
      name: 'account_email',
    })
    await queryInterface.addIndex(DATABASE_MODELS.ACCOUNTS, ['name'], {
      transaction,
      name: 'account_name',
    })
    await queryInterface.addIndex(DATABASE_MODELS.AUCTIONS, ['accountId'], {
      transaction,
      name: 'auction_accountId',
    })
    await queryInterface.addIndex(DATABASE_MODELS.BIDS, ['auctionId'], {
      transaction,
      name: 'bid_auctionId',
    })
    await queryInterface.addIndex(DATABASE_MODELS.BIDS, ['bidderId'], {
      transaction,
      name: 'bid_bidderId',
    })
    await queryInterface.addIndex(
      DATABASE_MODELS.CHAT_GROUPS,
      ['firstAccountId'],
      {
        transaction,
        name: 'chat_group_firstAccountId',
      }
    )
    await queryInterface.addIndex(
      DATABASE_MODELS.CHAT_GROUPS,
      ['secondAccountId'],
      {
        transaction,
        name: 'chat_group_secondAccountId',
      }
    )
    await queryInterface.addIndex(DATABASE_MODELS.REVIEWS, ['auctionId'], {
      transaction,
      name: 'review_auctionId',
    })
    await queryInterface.addIndex(DATABASE_MODELS.REVIEWS, ['toAccountId'], {
      transaction,
      name: 'review_toAccountId',
    })
    await queryInterface.addIndex(
      DATABASE_MODELS.SEARCH_HISTORY,
      ['accountId'],
      {
        transaction,
        name: 'search_accountId',
      }
    )

    await queryInterface.addIndex(
      DATABASE_MODELS.LAST_SEEN_AUCTIONS,
      ['accountId'],
      {
        transaction,
        name: 'last_seen_accountId',
      }
    )

    await queryInterface.addIndex(DATABASE_MODELS.FILTERS, ['accountId'], {
      transaction,
      name: 'filter_accountId',
    })

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
    await queryInterface.dropTable(DATABASE_MODELS.FOLLOWERS, { transaction })
    await queryInterface.dropTable(DATABASE_MODELS.CHAT_MESSAGES, {
      transaction,
    })
    await queryInterface.dropTable(DATABASE_MODELS.CHAT_GROUPS, { transaction })
    await queryInterface.dropTable(DATABASE_MODELS.SEARCH_HISTORY, {
      transaction,
    })
    await queryInterface.dropTable(DATABASE_MODELS.REVIEWS, { transaction })
    await queryInterface.dropTable(DATABASE_MODELS.BIDS, { transaction })
    await queryInterface.dropTable(DATABASE_MODELS.AUCTION_ASSETS, {
      transaction,
    })
    await queryInterface.dropTable(DATABASE_MODELS.ACCOUNT_FAVOURITES, {
      transaction,
    })
    await queryInterface.dropTable(DATABASE_MODELS.AUCTIONS, { transaction })
    await queryInterface.dropTable(DATABASE_MODELS.NOTIFICATIONS, {
      transaction,
    })
    await queryInterface.dropTable(DATABASE_MODELS.ASSETS, { transaction })
    await queryInterface.dropTable(DATABASE_MODELS.ACCOUNTS, { transaction })
    await queryInterface.dropTable(DATABASE_MODELS.LOCATIONS, { transaction })
    await queryInterface.dropTable(DATABASE_MODELS.CATEGORIES, { transaction })
    await queryInterface.dropTable(DATABASE_MODELS.REPORTS, { transaction })
    await queryInterface.dropTable(DATABASE_MODELS.LAST_SEEN_AUCTIONS, {
      transaction,
    })
    await queryInterface.dropTable(DATABASE_MODELS.FILTERS, { transaction })

    await queryInterface.removeIndex(
      DATABASE_MODELS.ACCOUNTS,
      'account_email',
      {
        transaction,
      }
    )
    await queryInterface.removeIndex(DATABASE_MODELS.ACCOUNTS, 'account_name', {
      transaction,
    })
    await queryInterface.removeIndex(
      DATABASE_MODELS.AUCTIONS,
      'auction_accountId',
      {
        transaction,
      }
    )
    await queryInterface.removeIndex(DATABASE_MODELS.BIDS, 'bid_auctionId', {
      transaction,
    })
    await queryInterface.removeIndex(DATABASE_MODELS.BIDS, 'bid_bidderId', {
      transaction,
    })
    await queryInterface.removeIndex(
      DATABASE_MODELS.CHAT_GROUPS,
      'chat_group_firstAccountId',
      { transaction }
    )
    await queryInterface.removeIndex(
      DATABASE_MODELS.CHAT_GROUPS,
      'chat_group_secondAccountId',
      { transaction }
    )
    await queryInterface.removeIndex(
      DATABASE_MODELS.REVIEWS,
      'review_auctionId',
      {
        transaction,
      }
    )
    await queryInterface.removeIndex(
      DATABASE_MODELS.REVIEWS,
      'review_toAccountId',
      {
        transaction,
      }
    )
    await queryInterface.removeIndex(
      DATABASE_MODELS.SEARCH_HISTORY,
      'search_accountId',
      { transaction }
    )

    await queryInterface.removeIndex(
      DATABASE_MODELS.LAST_SEEN_AUCTIONS,
      'last_seen_accountId',
      { transaction }
    )

    await queryInterface.removeIndex(
      DATABASE_MODELS.FILTERS,
      'filter_accountId',
      { transaction }
    )

    await transaction.commit()
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}
