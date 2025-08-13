import admin from 'firebase-admin'
import { Account } from '../../../modules/accounts/model.js'
import { Auction } from '../../../modules/auctions/model.js'
import { Notification } from '../../../modules/notifications/model.js'
import { FCMNotificationItem, NotificationTypes } from '../types.js'
import { Favourite } from '../../../modules/favourites/model.js'
import { Op } from 'sequelize'
import { NotificationContent } from '../../../modules/auxiliary-models/notification-content.js'
import { WebSubscriptions } from '../../../web-subscriptions.js'
import { WebSocketInstance } from '../../../ws/instance.js'
import { WebsocketEvents } from '../../../ws/socket-module.js'

class BidOnFavouriteAuctionNotification implements FCMNotificationItem {
  send = async (bidder: Account, auction: Auction) => {
    try {
      const favourites = await Favourite.findAll({
        where: {
          auctionId: auction.id,
        },
      })

      if (!favourites.length) {
        return
      }

      const uniqueAccountIds = [
        ...new Set(
          favourites
            .map((el) => el.accountId)
            .filter((el) => el !== bidder.id && el !== auction.accountId)
        ),
      ]

      if (!uniqueAccountIds.length) {
        return
      }

      const notificationFromSameUserSendInLast2Mins =
        await Notification.findOne({
          where: {
            type: NotificationTypes.AUCTION_FROM_FAVOURITES_HAS_BID,
            initiatedByAccountId: bidder.id,
            entityId: auction.id,
            createdAt: {
              [Op.gte]: new Date(new Date().getTime() - 2 * 60 * 1000),
            },
          },
        })

      if (notificationFromSameUserSendInLast2Mins) {
        return
      }

      const notificationContent = await NotificationContent.findByPk(
        NotificationTypes.AUCTION_FROM_FAVOURITES_HAS_BID
      )
      if (!notificationContent || !notificationContent.enabled) {
        return
      }

      for (const accountId of uniqueAccountIds) {
        const account = await Account.findByPk(accountId)
        if (!account) {
          return
        }

        if (
          account.allowedNotifications.AUCTION_FROM_FAVOURITES_HAS_BID === false
        ) {
          return
        }

        const language = (account.meta.appLanguage || 'en') as string

        let notification = new Notification({
          accountId,
          type: NotificationTypes.AUCTION_FROM_FAVOURITES_HAS_BID,
          entityId: auction.id,
          initiatedByAccountId: bidder.id,
          title: notificationContent.title,
          description: notificationContent.description,
        })

        notification = await notification.save()

        const socketInstance = WebSocketInstance.getInstance()
        socketInstance.sendEventToAccount(
          account.id,
          WebsocketEvents.NEW_NOTIFICATION,
          { ...notification }
        )

        WebSubscriptions.sendNotificationToAccount(account.id, notification)

        if (account.deviceFCMToken) {
          await admin.messaging().send({
            token: account.deviceFCMToken,
            notification: {
              title: notification.title[language] ?? notification.title['en'],
              body:
                notification.description[language] ??
                notification.description['en'],
            },
            data: {
              auctionId: auction.id,
              notificationId: notification.id,
              type: NotificationTypes.AUCTION_FROM_FAVOURITES_HAS_BID,
              accountId: account.id,
            },
            android: {
              notification: {
                color: '#D94F30',
              },
            },
          })
        }
      }
    } catch (error) {
      console.error(
        'Could not send new bid on favourite auction notification',
        error
      )
    }
  }
}

const notificationInstance = new BidOnFavouriteAuctionNotification()
export { notificationInstance as BidOnFavouriteAuctionNotification }
