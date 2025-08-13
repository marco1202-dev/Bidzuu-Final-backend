import admin from 'firebase-admin'
import { Account } from '../../../modules/accounts/model.js'
import { Notification } from '../../../modules/notifications/model.js'
import { FCMNotificationItem, NotificationTypes } from '../types.js'
import { Bid } from '../../../modules/bids/model.js'
import { NotificationContent } from '../../../modules/auxiliary-models/notification-content.js'
import { WebSubscriptions } from '../../../web-subscriptions.js'
import { WebSocketInstance } from '../../../ws/instance.js'
import { WebsocketEvents } from '../../../ws/socket-module.js'

class BidAcceptedNotification implements FCMNotificationItem {
  send = async (bid: Bid) => {
    try {
      const ownerOfAuction = await Account.findByPk(bid.bidderId)
      if (!ownerOfAuction) {
        return
      }

      const language = (ownerOfAuction.meta.appLanguage || 'en') as string

      const notificationContent = await NotificationContent.findByPk(
        NotificationTypes.BID_ACCEPTED_ON_AUCTION
      )
      if (!notificationContent || !notificationContent.enabled) {
        return
      }

      if (
        ownerOfAuction.allowedNotifications.BID_ACCEPTED_ON_AUCTION === false
      ) {
        return
      }

      let notification = new Notification({
        accountId: ownerOfAuction.id,
        type: NotificationTypes.BID_ACCEPTED_ON_AUCTION,
        entityId: bid.auctionId,
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
            type: NotificationTypes.BID_ACCEPTED_ON_AUCTION,
            auctionId: bid.auctionId,
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
      console.error('Coult not send bid accepted notification', error)
    }
  }
}

const notificationInstance = new BidAcceptedNotification()
export { notificationInstance as BidAcceptedNotification }
