import admin from 'firebase-admin'
import { Account } from '../../../modules/accounts/model.js'
import { Notification } from '../../../modules/notifications/model.js'
import { FCMNotificationItem, NotificationTypes } from '../types.js'
import { NotificationContent } from '../../../modules/auxiliary-models/notification-content.js'
import { WebSubscriptions } from '../../../web-subscriptions.js'
import { WebSocketInstance } from '../../../ws/instance.js'
import { WebsocketEvents } from '../../../ws/socket-module.js'

class NewReviewNotification implements FCMNotificationItem {
  send = async (accountId: string) => {
    try {
      const account = await Account.findByPk(accountId)
      if (!account) {
        return
      }

      const language = (account.meta.appLanguage || 'en') as string
      const notificationContent = await NotificationContent.findByPk(
        NotificationTypes.REVIEW_RECEIVED
      )
      if (!notificationContent || !notificationContent.enabled) {
        return
      }

      if (account.allowedNotifications.REVIEW_RECEIVED === false) {
        return
      }

      let notification = new Notification({
        accountId: accountId,
        type: NotificationTypes.REVIEW_RECEIVED,
        entityId: accountId,
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
            notificationId: notification.id,
            type: NotificationTypes.REVIEW_RECEIVED,
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
      console.error('Coult not send review added notification', error)
    }
  }
}

const notificationInstance = new NewReviewNotification()
export { notificationInstance as NewReviewNotification }
