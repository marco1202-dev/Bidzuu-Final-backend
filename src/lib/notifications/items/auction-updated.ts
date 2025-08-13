import admin from 'firebase-admin'
import { Account } from '../../../modules/accounts/model.js'
import { Auction } from '../../../modules/auctions/model.js'
import { Notification } from '../../../modules/notifications/model.js'
import { FCMNotificationItem, NotificationTypes } from '../types.js'
import { Op } from 'sequelize'
import { Bid } from '../../../modules/bids/model.js'
import { NotificationContent } from '../../../modules/auxiliary-models/notification-content.js'
import { WebSubscriptions } from '../../../web-subscriptions.js'
import { WebSocketInstance } from '../../../ws/instance.js'
import { WebsocketEvents } from '../../../ws/socket-module.js'

class AuctionUpdatedNotification implements FCMNotificationItem {
  send = async (auction: Auction) => {
    try {
      const auctionBids = await Bid.findAll({
        where: { auctionId: auction.id },
        attributes: ['bidderId'],
      })

      if (!auctionBids.length) {
        return
      }

      const notificationContent = await NotificationContent.findByPk(
        NotificationTypes.AUCTION_UPDATED
      )
      if (!notificationContent || !notificationContent.enabled) {
        return
      }

      const accountsToSendNotification = await Account.findAll({
        where: { id: { [Op.in]: auctionBids.map((bid) => bid.bidderId) } },
        attributes: [
          'id',
          'email',
          'meta',
          'deviceFCMToken',
          'allowedNotifications',
        ],
      })

      const uniqueAccounts = accountsToSendNotification.filter(
        (account, index, self) =>
          index === self.findIndex((t) => t.id === account.id)
      )

      const promises = uniqueAccounts.map(async (account) => {
        if (account.id === auction.accountId) {
          return Promise.resolve([]) as Promise<unknown>
        }

        if (account.allowedNotifications.AUCTION_UPDATED === false) {
          return Promise.resolve([]) as Promise<unknown>
        }

        let notification = new Notification({
          accountId: account.id,
          type: NotificationTypes.AUCTION_UPDATED,
          entityId: auction.id,
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
          const language = (account.meta.appLanguage || 'en') as string

          return admin.messaging().send({
            token: account.deviceFCMToken,
            notification: {
              title: notification.title[language] ?? notification.title['en'],
              body:
                notification.description[language] ??
                notification.description['en'],
            },
            data: {
              notificationId: notification.id,
              type: NotificationTypes.AUCTION_UPDATED,
              auctionId: auction.id,
              accountId: account.id,
            },
            android: {
              notification: {
                color: '#D94F30',
              },
            },
          }) as Promise<unknown>
        }
      })
      await Promise.all(promises)
    } catch (error) {
      console.error('Coult not send new auction notification', error)
    }
  }
}

const notificationInstance = new AuctionUpdatedNotification()
export { notificationInstance as AuctionUpdatedNotification }
