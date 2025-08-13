import admin from 'firebase-admin'
import { Account } from '../../../modules/accounts/model.js'
import { Auction } from '../../../modules/auctions/model.js'
import { Notification } from '../../../modules/notifications/model.js'
import { FCMNotificationItem, NotificationTypes } from '../types.js'
import { NotificationContent } from '../../../modules/auxiliary-models/notification-content.js'
import { WebSubscriptions } from '../../../web-subscriptions.js'
import { WebSocketInstance } from '../../../ws/instance.js'
import { WebsocketEvents } from '../../../ws/socket-module.js'
import { generateNameForAccount, replaceNotificationPlaceholders } from '../utils.js'

class NewCommentOnAuctionNotification implements FCMNotificationItem {
  send = async (auctionId: string, initiatedBy: string) => {
    try {
      const auction = await Auction.findByPk(auctionId)
      if (!auction) {
        return
      }

      if (auction.accountId === initiatedBy) {
        return
      }

      const account = await Account.findByPk(auction.accountId)
      const language = (account.meta.appLanguage || 'en') as string

      const notificationContent = await NotificationContent.findByPk(
        NotificationTypes.NEW_COMMENT_ON_AUCTION
      )
      if (!notificationContent || !notificationContent.enabled) {
        return
      }

      if (account.allowedNotifications.NEW_COMMENT_ON_AUCTION === false) {
        return
      }

      const latestNotification = await Notification.findOne({
        where: {
          accountId: auction.accountId,
          entityId: auction.id,
          initiatedByAccountId: initiatedBy,
          type: NotificationTypes.NEW_COMMENT_ON_AUCTION,
        },
        order: [['createdAt', 'DESC']],
        limit: 1,
      })

      const timeDifference = latestNotification
        ? new Date().getTime() - latestNotification.createdAt.getTime()
        : 0

      // Notification is not older than 1 minute
      if (latestNotification && timeDifference < 1000 * 60 * 1) {
        return
      }

      const userName = generateNameForAccount(account, language as string)
      const description = Object.keys(notificationContent.description).reduce(
        (acc: Record<string, string>, lang) => {
          acc[lang] = replaceNotificationPlaceholders(notificationContent.description[lang], {
            userName,
          })
          return acc
        },
        {}
      )

      let notification = new Notification({
        accountId: account.id,
        type: NotificationTypes.NEW_COMMENT_ON_AUCTION,
        entityId: auction.id,
        title: notificationContent.title,
        description: description,
        initiatedByAccountId: initiatedBy,
      })
      notification = await notification.save()

      const socketInstance = WebSocketInstance.getInstance()
      socketInstance.sendEventToAccount(account.id, WebsocketEvents.NEW_NOTIFICATION, {
        ...notification,
      })

      WebSubscriptions.sendNotificationToAccount(account.id, notification)

      if (account.deviceFCMToken) {
        await admin.messaging().send({
          token: account.deviceFCMToken,
          notification: {
            title: notification.title[language] ?? notification.title['en'],
            body: notification.description[language] ?? notification.description['en'],
          },
          data: {
            notificationId: notification.id,
            type: NotificationTypes.NEW_COMMENT_ON_AUCTION,
            auctionId: auction.id,
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
      console.error('Coult not send new comment on auction notification', error)
    }
  }
}

const notificationInstance = new NewCommentOnAuctionNotification()
export { notificationInstance as NewCommentOnAuctionNotification }
