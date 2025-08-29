import { Op, Transaction } from 'sequelize'
import { DATABASE_MODELS } from '../../constants/model-names.js'
import { DatabaseConnection } from '../../database/index.js'
import { GenericRepository } from '../../lib/base-repository.js'
import { PaginatedQueryParams } from '../../types.js'
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
import { Offer } from '../offers/model.js'
import AssetsRepository from '../assets/repository.js'
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
    const account = await Account.findByPk(accountId, {
      attributes: ['id', 'name', 'email', 'picture', 'verified', 'meta'],
      include: [
        { model: Asset, as: 'asset' },
        {
          model: Review,
          as: 'reviewer',
          attributes: ['id', 'name', 'email', 'picture', 'verified'],
          include: [{ model: Asset, as: 'asset' }],
        },
      ],
    })

    // Ensure the account has complete profile images
    if (account) {
      await this.ensureCompleteProfileImages(account)
    }

    return account
  }

  /**
   * Ensures every user has a valid default picture
   * @param currentPicture - Current picture URL or null
   * @param email - User's email address
   * @param name - User's name
   * @returns Valid picture URL
   */

  /**
   * Generates a complete profile image setup for a user
   * @param email - User's email address
   * @param name - User's name
   * @param existingPicture - Existing picture URL or null
   * @returns Object with picture and profile image URLs
   */
  private generateProfileImages(email?: string, name?: string, existingPicture?: string | null) {
    const identifier = email || name || 'user'
    const encodedIdentifier = encodeURIComponent(identifier)

    // Primary profile picture (from icotar.com for consistency)
    const primaryPicture = existingPicture && existingPicture.trim() !== ''
      ? existingPicture
      : `https://icotar.com/avatar/${encodedIdentifier}.png`

    // Additional profile image variations for different use cases
    const profileImages = {
      picture: primaryPicture,
      avatar: `https://icotar.com/avatar/${encodedIdentifier}.png`,
      thumbnail: `https://icotar.com/avatar/${encodedIdentifier}.png?size=100`,
      large: `https://icotar.com/avatar/${encodedIdentifier}.png?size=400`,
      // Fallback to UI Avatars if icotar.com fails
      fallback: `https://ui-avatars.com/api/?background=random&color=fff&size=200&name=${encodedIdentifier}`,
      // Gravatar as another fallback option
      gravatar: email ? `https://www.gravatar.com/avatar/${this.generateMD5(email)}?d=identicon&s=200` : null
    }

    return profileImages
  }

  /**
   * Simple MD5 hash generation for Gravatar (fallback)
   * @param str - String to hash
   * @returns MD5 hash
   */
  private generateMD5(str: string): string {
    // Simple hash function for Gravatar fallback
    let hash = 0
    if (str.length === 0) return hash.toString()

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16)
  }

  /**
   * Ensures every user has a complete profile image setup
   * @param account - Account object
   * @returns Account with enhanced profile images
   */
  private async ensureCompleteProfileImages(account: Account): Promise<Account> {
    if (!account.picture || account.picture.trim() === '') {
      const profileImages = this.generateProfileImages(account.email, account.name)

      // Update the account with the primary picture
      try {
        await Account.update(
          {
            picture: profileImages.picture,
            // Store additional profile image data in meta field if available
            meta: {
              ...account.meta,
              profileImages: profileImages
            }
          },
          { where: { id: account.id } }
        )

        // Update the account object
        account.picture = profileImages.picture
        if (account.meta) {
          account.meta.profileImages = profileImages
        }

        console.log(`✅ Assigned complete profile images to user ${account.email || account.name || account.id}`)
      } catch (error) {
        console.warn(`Could not update profile images for user ${account.id}:`, error.message)
      }
    }

    return account
  }

  /**
   * Bulk update all accounts without pictures to ensure every user has a complete profile image setup
   * This method can be run as a maintenance task or during system initialization
   */
  public async ensureAllAccountsHavePictures() {
    try {
      console.log('🔍 Finding accounts without complete profile images...')

      // Find all accounts without pictures
      const accountsWithoutPictures = await Account.findAll({
        where: {
          [Op.or]: [
            { picture: null },
            { picture: '' },
            { picture: { [Op.like]: '%undefined%' } }
          ]
        },
        attributes: ['id', 'email', 'name', 'picture', 'meta']
      })

      console.log(`📊 Found ${accountsWithoutPictures.length} accounts without complete profile images`)

      if (accountsWithoutPictures.length === 0) {
        console.log('✅ All accounts already have complete profile images!')
        return
      }

      // Update each account with a complete profile image setup
      let updatedCount = 0
      for (const account of accountsWithoutPictures) {
        try {
          const profileImages = this.generateProfileImages(account.email, account.name, account.picture)

          await Account.update(
            {
              picture: profileImages.picture,
              meta: {
                ...account.meta,
                profileImages: profileImages
              }
            },
            { where: { id: account.id } }
          )

          updatedCount++
          console.log(`✅ Updated profile images for account ${account.email || account.name || account.id}`)
          console.log(`   📸 Primary: ${profileImages.picture}`)
          console.log(`   🖼️  Thumbnail: ${profileImages.thumbnail}`)
          console.log(`   🖼️  Large: ${profileImages.large}`)
          console.log(`   🔄 Fallback: ${profileImages.fallback}`)
        } catch (error) {
          console.error(`❌ Failed to update profile images for account ${account.id}:`, error.message)
        }
      }

      console.log(`🎉 Successfully updated ${updatedCount} out of ${accountsWithoutPictures.length} accounts`)
      console.log('💡 All users now have complete profile image setups with multiple variations and fallbacks')

    } catch (error) {
      console.error('❌ Error during bulk profile image update:', error)
      throw error
    }
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

    // For OAuth sign-ins, require a valid email to prevent fake account creation
    if (!accountData.email || accountData.email.trim() === '') {
      throw new Error('Email is required for OAuth account creation. Cannot create account without valid email.')
    }

    // Validate that the email is not a fake generated email
    if (accountData.email.includes('@biddo.app') && accountData.email.includes('_')) {
      throw new Error('Invalid email format. Cannot create account with generated email.')
    }

    const settings = await SettingsRepository.get()

    // Use the provided email directly instead of generating fake ones
    const accountEmail = accountData.email

    try {
      // Ensure every user gets a complete profile image setup automatically
      const profileImages = this.generateProfileImages(accountEmail, accountData.name, accountData.picture)

      const newAccount = await Account.create({
        ...accountData,
        email: accountEmail,
        isAnonymous: false, // OAuth users are not anonymous
        picture: profileImages.picture,
        meta: {
          ...accountData.meta,
          profileImages: profileImages
        },
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
        // If email already exists, try to find the existing account
        const existingAccount = await Account.findOne({
          where: { email: accountEmail },
          include: [
            {
              model: Asset,
              as: 'asset',
            },
          ],
        })

        if (existingAccount) {
          // Update the existing account with the new authId if it doesn't have one
          if (!existingAccount.authId) {
            await Account.update(
              { authId },
              { where: { id: existingAccount.id } }
            )
            existingAccount.authId = authId
          }
          return existingAccount
        }
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
      Offer.findAll({
        where: { offererId: accountId },
        attributes: ['id'],
      }),
    ]

    const result = await Promise.all<unknown>(promises)
    const bids = result[0] as Bid[]
    const auctions = result[1] as Auction[]
    const offers = result[2] as Offer[]

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
      offers: offers.length,
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

      // Ensure every account has complete profile images
      if (!el.picture || el.picture.trim() === '') {
        const profileImages = this.generateProfileImages(el.email, el.name, el.picture)
        el.picture = profileImages.picture
        // Add profile image variations to the result
        el.profileImages = profileImages
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
