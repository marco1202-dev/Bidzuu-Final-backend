import { Op, Transaction } from 'sequelize'
import { DATABASE_MODELS } from '../../constants/model-names.js'
import { DatabaseConnection } from '../../database/index.js'
import { GenericRepository } from '../../lib/base-repository.js'
import { PaginatedQueryParams } from '../../types.js'
import { generateAnonymousEmail } from '../../utils/generic.js'
import { Account } from './model.js'
import { Review } from '../reviews/model.js'
import { Follower } from '../followers/model.js'
import { Report } from '../reports/model.js'
import { Favourite } from '../favourites/model.js'
import { ChatMessage } from '../auxiliary-models/chat-message.js'
import { ChatGroup } from '../chat/model.js'
import { SearchHistoryItem } from '../search-history/model.js'
import { Notification } from '../notifications/model.js'
import { Auction } from '../auctions/model.js'
import { AuctionsRepository } from '../auctions/repository.js'
import { Bid } from '../bids/model.js'
import { BidRepository } from '../bids/repository.js'
import { AssetsRepository } from '../assets/repository.js'
import { Asset } from '../assets/model.js'
import { LastSeenAuction } from '../last-seen/model.js'
import { AuctionSimilarity } from '../auction-similarities/model.js'
import { PushSubscription } from '../auxiliary-models/push-subscription.js'
import { ChatGroupAuction } from '../auction-similarities/chat-group-auctions.js'
import { Comment } from '../comments/entity.js'
import { SettingsRepository } from '../settings/repository.js'

class AccountsRepository extends GenericRepository<Account> {
  constructor() {
    super(Account)
  }

  public async getOneWithDetails(accountId: string) {
    return await Account.findByPk(accountId, {
      attributes: ['id', 'name', 'email', 'picture', 'verified'],
      include: [
        { model: Asset, as: 'asset' },
        {
          model: Review,
          as: 'receivedReviews',
          order: [['createdAt', 'DESC']],
          limit: 2,
          include: [
            {
              model: Account,
              as: 'reviewer',
              attributes: ['id', 'name', 'email', 'picture', 'verified'],
              include: [{ model: Asset, as: 'asset' }],
            },
          ],
        },
      ],
    })
  }

  public async findOneOrCreate(
    authId: string,
    accountData: Partial<Account>,
    identities: Record<string, string[]>,
    phone?: string
  ) {
    const result = await Account.findOne({
      where: { authId },
      include: [
        {
          model: Asset,
          as: 'asset',
        },
      ],
    })

    if (result?.id) {
      return result
    }

    const settings = await SettingsRepository.get()

    // Generate a unique email that doesn't conflict with existing ones
    let accountEmail = accountData.email ?? generateAnonymousEmail()
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      try {
        const existingAccount = await Account.findOne({
          where: { email: accountEmail }
        })

        if (!existingAccount) {
          // Email is unique, we can use it
          break
        }

        // Generate a new email with a timestamp to ensure uniqueness
        accountEmail = `${generateAnonymousEmail().split('@')[0]}_${Date.now()}@biddo.app`
        attempts++
      } catch (error) {
        console.error('Error checking email uniqueness:', error)
        // Fallback to timestamp-based email
        accountEmail = `user_${Date.now()}@biddo.app`
        break
      }
    }

    try {
      const newAccount = await Account.create({
        ...accountData,
        email: accountEmail,
        isAnonymous: !accountData.email,
        picture: `https://icotar.com/avatar/${accountEmail}.png`,
        lastTriviaDataResetAt: new Date(),
        selectedCurrencyId: settings?.defaultCurrencyId,
        phone,
      })

      // Return the newly created account with asset include
      return await Account.findByPk(newAccount.id, {
        include: [
          {
            model: Asset,
            as: 'asset',
          },
        ],
      })
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        // If we still get a unique constraint error, try one more time with a timestamp
        const fallbackEmail = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@biddo.app`

        const newAccount = await Account.create({
          ...accountData,
          email: fallbackEmail,
          isAnonymous: !accountData.email,
          picture: `https://icotar.com/avatar/${fallbackEmail}.png`,
          lastTriviaDataResetAt: new Date(),
          selectedCurrencyId: settings?.defaultCurrencyId,
          phone,
        })

        return await Account.findByPk(newAccount.id, {
          include: [
            {
              model: Asset,
              as: 'asset',
            },
          ],
        })
      }

      throw error
    }
  }

  public async getStats(accountId: string) {
    const promises = [
      Bid.findAll({
        where: { bidderId: accountId },
        attributes: ['id', 'isAccepted', 'isRejected'],
      }),
      Auction.findAll({
        where: { accountId },
        attributes: ['id', 'acceptedBidId', 'expiresAt'],
      }),
    ]

    const result = await Promise.all<unknown>(promises)
    const bids = result[0] as Bid[]
    const auctions = result[1] as Auction[]

    const acceptedBids = bids.filter((bid) => bid.isAccepted)
    const rejectedBids = bids.filter((bid) => bid.isRejected)
    const activeAuctions = auctions.filter(
      (auction) => auction.expiresAt > new Date() && !auction.acceptedBidId
    )
    const closedAuctions = auctions.filter(
      (auction) => auction.expiresAt <= new Date() || auction.acceptedBidId
    )

    return {
      auctions: auctions.length,
      bids: bids.length,
      acceptedBids: acceptedBids.length,
      rejectedBids: rejectedBids.length,
      activeAuctions: activeAuctions.length,
      closedAuctions: closedAuctions.length,
    }
  }

  public async search(paginationParams: PaginatedQueryParams) {
    const { query, page, perPage } = paginationParams

    const QUERY = `
      SELECT ${DATABASE_MODELS.ACCOUNTS}.id, email, name, picture, verified, ${DATABASE_MODELS.ASSETS}.id as "assetId", ${DATABASE_MODELS.ASSETS}.path
      FROM ${DATABASE_MODELS.ACCOUNTS}
      LEFT JOIN ${DATABASE_MODELS.ASSETS} ON ${DATABASE_MODELS.ACCOUNTS}."assetId" = ${DATABASE_MODELS.ASSETS}.id
      WHERE name ILIKE $1 OR email ILIKE $1  
      ORDER BY POSITION($2::text IN name), name
      DESC
      LIMIT $3
      OFFSET $4
    `

    const result = await DatabaseConnection.getInstance().query(QUERY, {
      bind: [`%${query}%`, query, perPage, page * perPage],
    })

    return result[0].map((el) => {
      if (el.email) {
        const [localPart] = (el.email ?? '').split('@')
        el.email = `${localPart}@${'*'.repeat(7)}`
      }

      if (el.path) {
        el.asset = {
          path: el.path,
        }
      }

      return el
    })
  }

  public async blockAccount(currentAccountId: string, accountToBlock: string) {
    return await DatabaseConnection.getInstance().transaction(async (transaction: Transaction) => {
      const existingAccount = await Account.findByPk(currentAccountId, {
        transaction,
      })

      const blockedAccounts = existingAccount?.blockedAccounts || []
      if (blockedAccounts.includes(accountToBlock)) {
        return
      }

      blockedAccounts.push(accountToBlock)

      await super.update(
        { id: currentAccountId },
        {
          blockedAccounts,
        },
        transaction
      )
    })
  }

  public async unblockAccount(currentAccountId: string, accountToUnblock: string) {
    return await DatabaseConnection.getInstance().transaction(async (transaction: Transaction) => {
      const existingAccount = await Account.findByPk(currentAccountId, {
        transaction,
      })

      const blockedAccounts = existingAccount?.blockedAccounts || []
      const index = blockedAccounts.indexOf(accountToUnblock)
      if (index === -1) {
        return
      }

      blockedAccounts.splice(index, 1)

      await super.update(
        { id: currentAccountId },
        {
          blockedAccounts,
        },
        transaction
      )
    })
  }

  public async deleteAccountData(
    accountId: string,
    transaction?: Transaction,
    commitTransaction = true
  ) {
    transaction = transaction || (await DatabaseConnection.getInstance().transaction())

    try {
      await PushSubscription.destroy({ where: { accountId }, transaction })

      await Review.destroy({
        where: {
          [Op.or]: { fromAccountId: accountId, toAccountId: accountId },
        },
        transaction,
      })

      await Follower.destroy({
        where: { [Op.or]: { followerId: accountId, followingId: accountId } },
        transaction,
      })

      await LastSeenAuction.destroy({ where: { accountId }, transaction })

      await Report.update({ reportedBy: null }, { where: { reportedBy: accountId }, transaction })

      await Favourite.destroy({ where: { accountId }, transaction })

      const chatGroups = await ChatGroup.findAll({
        where: {
          [Op.or]: { firstAccountId: accountId, secondAccountId: accountId },
        },
        attributes: ['id'],
        transaction,
      })

      const chatGroupIds = chatGroups.map((el) => el.id)
      const assetTypeMessages = await ChatMessage.findAll({
        where: {
          chatGroupId: { [Op.in]: chatGroupIds },
          type: 'assets',
        },
        transaction,
      })

      if (assetTypeMessages.length) {
        const assetsToRemove = assetTypeMessages.reduce((acc, el) => {
          acc.push(...el.assetIds)
          return acc
        }, [] as string[])

        for (const assetId of assetsToRemove) {
          await AssetsRepository.removeAsset(assetId, transaction)
        }
      }

      await ChatMessage.destroy({
        where: {
          chatGroupId: { [Op.in]: chatGroupIds },
        },
        transaction,
      })

      await ChatGroupAuction.destroy({
        where: {
          chatGroupId: { [Op.in]: chatGroupIds },
        },
        transaction,
      })

      await ChatGroup.destroy({
        where: {
          id: { [Op.in]: chatGroupIds },
        },
        transaction,
      })

      await SearchHistoryItem.destroy({
        where: { accountId },
        transaction,
      })

      await Notification.destroy({
        where: { accountId },
        transaction,
      })

      const accountAuctions = await Auction.findAll({
        where: { accountId },
        attributes: ['id'],
        transaction,
      })

      const auctionIds = accountAuctions.map((el) => el.id)
      await AuctionSimilarity.destroy({
        where: {
          [Op.or]: {
            auctionId1: { [Op.in]: auctionIds },
            auctionId2: { [Op.in]: auctionIds },
          },
        },
        transaction,
      })

      const auctionDeletePromises = auctionIds.map((auctionId) =>
        AuctionsRepository.deleteAuction(auctionId, transaction, false)
      )

      await Promise.all(auctionDeletePromises)

      await Comment.destroy({
        where: { accountId },
        transaction,
      })

      const accountBids = await Bid.findAll({
        where: { bidderId: accountId },
        include: { model: Auction },
        transaction,
      })

      const bidDeletePromises = accountBids.map((bid) => {
        return BidRepository.deleteBid(bid, transaction, false)
      })

      await Promise.all(bidDeletePromises)
      await Account.destroy({ where: { id: accountId }, transaction })

      if (commitTransaction) {
        await transaction.commit()
      }
    } catch (error) {
      if (commitTransaction) {
        console.error('Coult not commit transaction - delete account', error)
        await transaction.rollback()
      } else {
        throw error
      }
    }
  }

  public async hasVerificationRequest(accountId: string) {
    const result = await Account.findByPk(accountId, {
      attributes: ['verificationRequestedAt'],
    })

    return !!result?.verificationRequestedAt
  }

  public async requestVerification(accountId: string) {
    return await Account.update(
      { verificationRequestedAt: new Date() },
      {
        where: { id: accountId },
      }
    )
  }

  public async updateWithPreferences(
    account: Partial<Account>,
    profileAsset: Express.Multer.File | null
  ): Promise<Account> {
    return await DatabaseConnection.getInstance().transaction(async (transaction: Transaction) => {
      const existingAccount = await Account.findByPk(account.id as string, {
        transaction,
      })
      const existingMeta = existingAccount.meta

      await super.update(
        { id: account.id },
        {
          ...account,
          ...(account.meta ? { ...existingMeta, ...account.meta } : {}),
        },
        transaction
      )

      if (profileAsset) {
        await this.storeAccountAsset(profileAsset, account.id as string, transaction)
      }

      return await Account.findOne({
        where: { id: account.id },
        include: [
          {
            model: Asset,
            as: 'asset',
          },
        ],
        transaction,
      })
    })
  }

  private async storeAccountAsset(
    asset: Express.Multer.File,
    accountId: string,
    transaction: Transaction
  ) {
    const createdAsset = await AssetsRepository.storeAsset(asset, transaction)
    if (!createdAsset) {
      return
    }

    const existingAccount = await Account.findByPk(accountId, { transaction })
    await Account.update({ assetId: createdAsset.id }, { where: { id: accountId }, transaction })

    if (existingAccount.assetId) {
      await AssetsRepository.removeAsset(existingAccount.assetId, transaction)
    }
  }
}

const accountRepositoryInstance = new AccountsRepository()
Object.freeze(accountRepositoryInstance)

export { accountRepositoryInstance as AccountsRepository }
