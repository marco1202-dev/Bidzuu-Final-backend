import admin from 'firebase-admin'
import { Account } from '../../../modules/accounts/model.js'
import { Auction } from '../../../modules/auctions/model.js'
import { Notification } from '../../../modules/notifications/model.js'
import { FCMNotificationItem, NotificationTypes } from '../types.js'
import { NotificationContent } from '../../../modules/auxiliary-models/notification-content.js'
import { WebSubscriptions } from '../../../web-subscriptions.js'
import { WebSocketInstance } from '../../../ws/instance.js'
import { WebsocketEvents } from '../../../ws/socket-module.js'

class NewBidOnAuctionNotification implements FCMNotificationItem {
  send = async (auction: Auction) => {
    try {
      const ownerOfAuction = await Account.findByPk(auction.accountId)
      if (!ownerOfAuction) {
        return
      }

      const language = (ownerOfAuction.meta.appLanguage || 'en') as string

      const notificationContent = await NotificationContent.findByPk(
        NotificationTypes.NEW_BID_ON_AUCTION
      )
      if (!notificationContent || !notificationContent.enabled) {
        return
      }

      if (ownerOfAuction.allowedNotifications.NEW_BID_ON_AUCTION === false) {
        return
      }

      let notification = new Notification({
        accountId: ownerOfAuction.id,
        type: NotificationTypes.NEW_BID_ON_AUCTION,
        entityId: auction.id,
        title: notificationContent.title,
        description: notificationContent.description,
      })
      notification = await notification.save()

      const socketInstance = WebSocketInstance.getInstance()
      socketInstance.sendEventToAccount(
        ownerOfAuction.id,
        WebsocketEvents.NEW_NOTIFICATION,
        { ...notification }
      )

      WebSubscriptions.sendNotificationToAccount(
        ownerOfAuction.id,
        notification
      )

      if (ownerOfAuction.deviceFCMToken) {
        await admin.messaging().send({
          token: ownerOfAuction.deviceFCMToken,
          notification: {
            title: notification.title[language] ?? notification.title['en'],
            body:
              notification.description[language] ??
              notification.description['en'],
          },
          data: {
            notificationId: notification.id,
            type: NotificationTypes.NEW_BID_ON_AUCTION,
            auctionId: auction.id,
            accountId: ownerOfAuction.id,
          },
          android: {
            notification: {
              color: '#D94F30',
            },
          },
        })
      }
    } catch (error) {
      console.error('Coult not send new bid on auction notification', error)
    }
  }
}

const notificationInstance = new NewBidOnAuctionNotification()
export { notificationInstance as NewBidOnAuctionNotification }
