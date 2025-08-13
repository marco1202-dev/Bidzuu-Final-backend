import admin from 'firebase-admin'
import { Account } from '../../../modules/accounts/model.js'
import { Auction } from '../../../modules/auctions/model.js'
import { Notification } from '../../../modules/notifications/model.js'
import { FCMNotificationItem, NotificationTypes } from '../types.js'
import { Favourite } from '../../../modules/favourites/model.js'
import { Op } from 'sequelize'
import { NotificationContent } from '../../../modules/auxiliary-models/notification-content.js'
import { replaceNotificationPlaceholders } from '../utils.js'
import { WebSubscriptions } from '../../../web-subscriptions.js'
import { WebSocketInstance } from '../../../ws/instance.js'
import { WebsocketEvents } from '../../../ws/socket-module.js'

class FavouriteAuctionPriceChangeNotification implements FCMNotificationItem {
  send = async (
    owner: Account,
    auction: Auction,
    oldPrice: number,
    newPrice: number
  ) => {
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
            .filter((el) => el !== owner.id && el !== auction.accountId)
        ),
      ]

      if (!uniqueAccountIds.length) {
        return
      }

      const notificationFromSameUserSendInLastMin = await Notification.findOne({
        where: {
          type: NotificationTypes.FAVOURITE_AUCTION_PRICE_CHANGE,
          initiatedByAccountId: owner.id,
          entityId: auction.id,
          createdAt: {
            [Op.gte]: new Date(new Date().getTime() - 60 * 1000),
          },
        },
      })

      if (notificationFromSameUserSendInLastMin) {
        return
      }

      const notificationContent = await NotificationContent.findByPk(
        NotificationTypes.FAVOURITE_AUCTION_PRICE_CHANGE
      )
      if (!notificationContent || !notificationContent.enabled) {
        return
      }

      const description = Object.keys(notificationContent.description).reduce(
        (acc: Record<string, string>, lang) => {
          acc[lang] = replaceNotificationPlaceholders(
            notificationContent.description[lang],
            { oldPrice: oldPrice.toString(), newPrice: newPrice.toString() }
          )
          return acc
        },
        {}
      )

      for (const accountId of uniqueAccountIds) {
        const account = await Account.findByPk(accountId)
        if (!account) {
          return
        }

        if (
          account.allowedNotifications.FAVOURITE_AUCTION_PRICE_CHANGE === false
        ) {
          return
        }

        const language = (account.meta.appLanguage || 'en') as string

        let notification = new Notification({
          accountId,
          type: NotificationTypes.FAVOURITE_AUCTION_PRICE_CHANGE,
          entityId: auction.id,
          initiatedByAccountId: owner.id,
          title: notificationContent.title,
          description: description,
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
              type: NotificationTypes.FAVOURITE_AUCTION_PRICE_CHANGE,
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
      console.error('Could not send favourite price change notification', error)
    }
  }
}

const notificationInstance = new FavouriteAuctionPriceChangeNotification()
export { notificationInstance as FavouriteAuctionPriceChangeNotification }
