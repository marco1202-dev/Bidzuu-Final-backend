import admin from 'firebase-admin'
import { Account } from '../../../modules/accounts/model.js'
import { Auction } from '../../../modules/auctions/model.js'
import { Notification } from '../../../modules/notifications/model.js'
import { FCMNotificationItem, NotificationTypes } from '../types.js'
import {
  generateNameForAccount,
  replaceNotificationPlaceholders,
} from '../utils.js'
import { NotificationContent } from '../../../modules/auxiliary-models/notification-content.js'
import { WebSubscriptions } from '../../../web-subscriptions.js'
import { WebSocketInstance } from '../../../ws/instance.js'
import { WebsocketEvents } from '../../../ws/socket-module.js'

class AuctionAddedToFavouritesNotification implements FCMNotificationItem {
  send = async (addedByAccount: Account, auction: Auction) => {
    try {
      const account = await Account.findByPk(auction.accountId)
      if (!account) {
        return
      }

      if (addedByAccount.id === account.id) {
        return
      }

      // If the notification was already sent, don't send it again from the same user
      const notificationFromSameUserSent = await Notification.findOne({
        where: {
          type: NotificationTypes.AUCTION_ADDED_TO_FAVOURITES,
          initiatedByAccountId: addedByAccount.id,
          accountId: account.id,
          entityId: auction.id,
        },
      })

      if (notificationFromSameUserSent) {
        return
      }

      const notificationContent = await NotificationContent.findByPk(
        NotificationTypes.AUCTION_ADDED_TO_FAVOURITES
      )
      if (!notificationContent || !notificationContent.enabled) {
        return
      }

      const language = (account.meta.appLanguage || 'en') as string
      const userName = generateNameForAccount(
        addedByAccount,
        language as string
      )
      const description = Object.keys(notificationContent.description).reduce(
        (acc: Record<string, string>, lang) => {
          acc[lang] = replaceNotificationPlaceholders(
            notificationContent.description[lang],
            { userName }
          )
          return acc
        },
        {}
      )

      if (account.allowedNotifications.AUCTION_ADDED_TO_FAVOURITES === false) {
        return
      }

      let notification = new Notification({
        accountId: account.id,
        type: NotificationTypes.AUCTION_ADDED_TO_FAVOURITES,
        entityId: auction.id,
        initiatedByAccountId: addedByAccount.id,
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
            type: NotificationTypes.AUCTION_ADDED_TO_FAVOURITES,
            accountId: account.id,
          },
          android: {
            notification: {
              color: '#D94F30',
            },
          },
        })
      }
    } catch (error) {
      console.error('Could auction added to favourites notification', error)
    }
  }
}

const notificationInstance = new AuctionAddedToFavouritesNotification()
export { notificationInstance as AuctionAddedToFavouritesNotification }
