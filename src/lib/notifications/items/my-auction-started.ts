import { Account } from '../../../modules/accounts/model.js'
import { Auction } from '../../../modules/auctions/model.js'
import { NotificationContent } from '../../../modules/auxiliary-models/notification-content.js'
import { Notification } from '../../../modules/notifications/model.js'
import { WebSubscriptions } from '../../../web-subscriptions.js'
import { WebSocketInstance } from '../../../ws/instance.js'
import { WebsocketEvents } from '../../../ws/socket-module.js'
import { FCMNotificationItem, NotificationTypes } from '../types.js'
import admin from 'firebase-admin'

class MyAuctionStartedNotification implements FCMNotificationItem {
  send = async (auction: Auction) => {
    try {
      const notificationContent = await NotificationContent.findByPk(
        NotificationTypes.MY_AUCTION_STARTED
      )
      if (!notificationContent || !notificationContent.enabled) {
        return
      }

      const account = await Account.findByPk(auction.accountId)
      if (!account) {
        return
      }

      if (account.allowedNotifications.MY_AUCTION_STARTED === false) {
        return
      }

      const language = (account.meta.appLanguage || 'en') as string

      let notification = new Notification({
        accountId: account.id,
        type: NotificationTypes.MY_AUCTION_STARTED,
        entityId: auction.id,
        title: notificationContent.title,
        description: notificationContent.description,
      })

      notification = await notification.save()

      const socketInstance = WebSocketInstance.getInstance()

      socketInstance.sendEventToAccount(account.id, WebsocketEvents.MY_AUCTION_STARTED, {
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
            auctionId: auction.id,
            notificationId: notification.id,
            type: NotificationTypes.MY_AUCTION_STARTED,
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
      console.error(`Error sending my auction started notification: ${error}`)
    }
  }
}

const notificationInstance = new MyAuctionStartedNotification()
export { notificationInstance as MyAuctionStartedNotification }
