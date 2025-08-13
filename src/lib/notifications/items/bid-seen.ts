import admin from 'firebase-admin'
import { Account } from '../../../modules/accounts/model.js'
import { Notification } from '../../../modules/notifications/model.js'
import { FCMNotificationItem, NotificationTypes } from '../types.js'
import { Bid } from '../../../modules/bids/model.js'
import { NotificationContent } from '../../../modules/auxiliary-models/notification-content.js'
import { WebSubscriptions } from '../../../web-subscriptions.js'
import { WebSocketInstance } from '../../../ws/instance.js'
import { WebsocketEvents } from '../../../ws/socket-module.js'

class BidWasSeenNotification implements FCMNotificationItem {
  send = async (auctionId: string, bids: Bid[]) => {
    const uniqueAccountBids = bids.filter(
      (bid, index, self) =>
        index === self.findIndex((t) => t.bidderId === bid.bidderId)
    )

    try {
      for (const bid of uniqueAccountBids) {
        const account = await Account.findByPk(bid.bidderId)
        if (!account) {
          return
        }

        const language = (account.meta.appLanguage || 'en') as string
        const notificationContent = await NotificationContent.findByPk(
          NotificationTypes.BID_WAS_SEEN
        )
        if (!notificationContent || !notificationContent.enabled) {
          return
        }

        if (account.allowedNotifications.BID_WAS_SEEN === false) {
          return
        }

        let notification = new Notification({
          accountId: account.id,
          type: NotificationTypes.BID_WAS_SEEN,
          entityId: auctionId,
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

        try {
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
                notificationId: notification.id,
                type: NotificationTypes.BID_WAS_SEEN,
                auctionId,
                accountId: account.id,
              },
              android: {
                notification: {
                  color: '#D94F30',
                },
              },
            })
          }
          return Promise.resolve([]) as Promise<unknown>
        } catch (error) {
          return Promise.resolve([]) as Promise<unknown>
        }
      }
    } catch (error) {
      console.error('Coult not send bids were seen notifications', error)
    }
  }
}

const notificationInstance = new BidWasSeenNotification()
export { notificationInstance as BidWasSeenNotification }
