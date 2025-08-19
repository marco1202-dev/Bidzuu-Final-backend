import { Account } from '../../modules/accounts/model.js'
import { Notification } from '../../modules/notifications/model.js'
import { AuctionAddedToFavouritesNotification } from './items/auction-added-to-favourites.js'
import { AuctionFromFollowingAccountNotification } from './items/auction-from-following.js'
import { AuctionUpdatedNotification } from './items/auction-updated.js'
import { BidAcceptedNotification } from './items/bid-accepted.js'
import { BidOnFavouriteAuctionNotification } from './items/bid-on-favourite-auction.js'
import { BidRejectedNotification } from './items/bid-rejected.js'
import { BidRemovedNotification } from './items/bid-removed.js'
import { BidWasSeenNotification } from './items/bid-seen.js'
import { BidCompetitionNotification } from './items/competitor-bid.js'
import { FavouriteAuctionPriceChangeNotification } from './items/favourite-price-change.js'
import { NewBidOnAuctionNotification } from './items/new-bid.js'
import { NewFollowerNotification } from './items/new-follower.js'
import { NewMessageNotification } from './items/new-message.js'
import { NewReviewNotification } from './items/new-review.js'
import admin from 'firebase-admin'
import { NotificationTypes } from './types.js'
import { MyAuctionStartedNotification } from './items/my-auction-started.js'
import { FavouriteAuctionStartedNotification } from './items/favourite-auction-started.js'
import { AccountWasVerifiedNotification } from './items/account-verified.js'
import { NewCommentOnAuctionNotification } from './items/new-comment.js'
import { NewCommentReplyNotification } from './items/new-comment-reply.js'
import { CommentOnSameAuctionNotification } from './items/comment-on-same-auction.js'
import { NewOfferOnAuctionNotification } from './items/new-offer.js'

class FCMNotificationService {
  sendAuctionAddedToFavourites = AuctionAddedToFavouritesNotification.send
  sendNewBidOnAuction = NewBidOnAuctionNotification.send
  sendAuctionUpdated = AuctionUpdatedNotification.send
  sendBidRemoved = BidRemovedNotification.send
  sendBidAccepted = BidAcceptedNotification.send
  sendBidRejected = BidRejectedNotification.send
  sendNewReview = NewReviewNotification.send
  sendNewMessage = NewMessageNotification.send
  sendSomeoneElseAddedBidToAuction = BidCompetitionNotification.send
  sendBidWasSeen = BidWasSeenNotification.send
  sendNewFollower = NewFollowerNotification.send
  sendNewBidOnFavouriteAuction = BidOnFavouriteAuctionNotification.send
  sendNewAuctionFromFollowingAccount = AuctionFromFollowingAccountNotification.send
  sendFavouriteAuctionPriceChange = FavouriteAuctionPriceChangeNotification.send
  sendMyAuctionStarted = MyAuctionStartedNotification.send
  sendFavouriteAuctionStarted = FavouriteAuctionStartedNotification.send
  sendAccountWasVerifiedNotification = AccountWasVerifiedNotification.send
  sendNewCommentOnAuction = NewCommentOnAuctionNotification.send
  sendCommentReply = NewCommentReplyNotification.send
  sendCommentOnSameAuction = CommentOnSameAuctionNotification.send
  sendNewOfferOnAuction = NewOfferOnAuctionNotification.send

  // Offer notification methods for offer status changes
  sendOfferAccepted = async (offer: any) => {
    try {
      const account = await Account.findByPk(offer.offererId)
      if (!account || !account.deviceFCMToken) {
        return false
      }

      const notification = new Notification({
        accountId: account.id,
        type: NotificationTypes.SYSTEM,
        title: { en: 'Offer Accepted!', fr: 'Offre acceptée !' },
        description: {
          en: `Your offer of ${offer.amount} has been accepted!`,
          fr: `Votre offre de ${offer.amount} a été acceptée !`
        },
        entityId: offer.auctionId,
      })

      await notification.save()

      const language = (account.meta.appLanguage || 'en') as string
      await admin.messaging().send({
        token: account.deviceFCMToken,
        notification: {
          title: notification.title[language] ?? notification.title['en'],
          body: notification.description[language] ?? notification.description['en'],
        },
        data: {
          notificationId: notification.id,
          type: NotificationTypes.SYSTEM,
          accountId: account.id,
          offerId: offer.id,
          auctionId: offer.auctionId,
        },
        android: {
          notification: {
            color: '#D94F30',
          },
        },
      })

      return true
    } catch (error) {
      console.error('Could not send offer accepted notification:', error)
      return false
    }
  }

  sendOfferRejected = async (offer: any) => {
    try {
      const account = await Account.findByPk(offer.offererId)
      if (!account || !account.deviceFCMToken) {
        return false
      }

      const notification = new Notification({
        accountId: account.id,
        type: NotificationTypes.SYSTEM,
        title: { en: 'Offer Rejected', fr: 'Offre rejetée' },
        description: {
          en: `Your offer of ${offer.amount} has been rejected`,
          fr: `Votre offre de ${offer.amount} a été rejetée`
        },
        entityId: offer.auctionId,
      })

      await notification.save()

      const language = (account.meta.appLanguage || 'en') as string
      await admin.messaging().send({
        token: account.deviceFCMToken,
        notification: {
          title: notification.title[language] ?? notification.title['en'],
          body: notification.description[language] ?? notification.description['en'],
        },
        data: {
          notificationId: notification.id,
          type: NotificationTypes.SYSTEM,
          accountId: account.id,
          offerId: offer.id,
          auctionId: offer.auctionId,
        },
        android: {
          notification: {
            color: '#D94F30',
          },
        },
      })

      return true
    } catch (error) {
      console.error('Could not send offer rejected notification:', error)
      return false
    }
  }

  sendOfferCountered = async (offer: any) => {
    try {
      const account = await Account.findByPk(offer.offererId)
      if (!account || !account.deviceFCMToken) {
        return false
      }

      const notification = new Notification({
        accountId: account.id,
        type: NotificationTypes.SYSTEM,
        title: { en: 'Counter Offer Received', fr: 'Contre-offre reçue' },
        description: {
          en: `You received a counter offer of ${offer.counterOfferAmount}`,
          fr: `Vous avez reçu une contre-offre de ${offer.counterOfferAmount}`
        },
        entityId: offer.auctionId,
      })

      await notification.save()

      const language = (account.meta.appLanguage || 'en') as string
      await admin.messaging().send({
        token: account.deviceFCMToken,
        notification: {
          title: notification.title[language] ?? notification.title['en'],
          body: notification.description[language] ?? notification.description['en'],
        },
        data: {
          notificationId: notification.id,
          type: NotificationTypes.SYSTEM,
          accountId: account.id,
          offerId: offer.id,
          auctionId: offer.auctionId,
        },
        android: {
          notification: {
            color: '#D94F30',
          },
        },
      })

      return true
    } catch (error) {
      console.error('Could not send offer countered notification:', error)
      return false
    }
  }

  sendSystemNotification = async (
    accountIds: string[],
    title: Record<string, string>,
    description: Record<string, string>
  ) => {
    if (!accountIds.length) {
      return 0
    }

    if (!title || typeof title !== 'object' || !Object.keys(title).length) {
      return 0
    }

    if (!description || typeof description !== 'object' || !Object.keys(description).length) {
      return 0
    }

    let sentNotifications = 0
    for (const accountId of accountIds) {
      try {
        const account = await Account.findByPk(accountId)
        if (!account || !account.deviceFCMToken) {
          continue
        }

        let notification = new Notification({
          accountId,
          type: NotificationTypes.SYSTEM,
          title,
          description,
        })

        notification = await notification.save()

        const language = (account.meta.appLanguage || 'en') as string
        await admin.messaging().send({
          token: account.deviceFCMToken,
          notification: {
            title: notification.title[language] ?? notification.title['en'],
            body: notification.description[language] ?? notification.description['en'],
          },
          data: {
            notificationId: notification.id,
            type: NotificationTypes.SYSTEM,
            accountId: account.id,
          },
          android: {
            notification: {
              color: '#D94F30',
            },
          },
        })

        sentNotifications += 1
      } catch (error) { }
    }

    return sentNotifications
  }

  resendNotification = async (notificationId: string) => {
    const notification = await Notification.findByPk(notificationId)
    if (!notification) {
      return false
    }

    const account = await Account.findByPk(notification.accountId)
    if (!account || !account.deviceFCMToken) {
      return false
    }

    const notificationAllowed = account.allowedNotifications[notification.type]
    if (notificationAllowed === false) {
      return false
    }

    const language = (account.meta.appLanguage || 'en') as string

    await admin.messaging().send({
      token: account.deviceFCMToken,
      notification: {
        title: notification.title[language] ?? notification.title['en'],
        body: notification.description[language] ?? notification.description['en'],
      },
      data: {
        auctionId: notification.entityId,
        notificationId: notification.id,
        type: notification.type,
        accountId: account.id,
      },
      android: {
        notification: {
          color: '#D94F30',
        },
      },
    })

    return true
  }
}

const fcMNotificationService = new FCMNotificationService()
Object.freeze(fcMNotificationService)

export { fcMNotificationService as FCMNotificationService }
