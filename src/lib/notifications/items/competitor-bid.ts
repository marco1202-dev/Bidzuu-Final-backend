import admin from 'firebase-admin'
import { Account } from '../../../modules/accounts/model.js'
import { Notification } from '../../../modules/notifications/model.js'
import { FCMNotificationItem, NotificationTypes } from '../types.js'
import { Op } from 'sequelize'
import { Auction } from '../../../modules/auctions/model.js'
import { Bid } from '../../../modules/bids/model.js'
import { NotificationContent } from '../../../modules/auxiliary-models/notification-content.js'
import { WebSubscriptions } from '../../../web-subscriptions.js'
import { WebSocketInstance } from '../../../ws/instance.js'
import { WebsocketEvents } from '../../../ws/socket-module.js'

class BidCompetitionNotification implements FCMNotificationItem {
  send = async (auction: Auction, curentAccountId: string) => {
    try {
      const allBidsFromAuction = await Bid.findAll({
        where: {
          auctionId: auction.id,
          bidderId: { [Op.ne]: curentAccountId },
        },
        attributes: ['bidderId'],
      })

      if (!allBidsFromAuction.length) {
        return
      }

      const accountsToSendNotification = await Account.findAll({
        where: {
          id: { [Op.in]: allBidsFromAuction.map((bid) => bid.bidderId) },
        },
        attributes: [
          'id',
          'email',
          'meta',
          'deviceFCMToken',
          'allowedNotifications',
        ],
      })

      if (!accountsToSendNotification.length) {
        return
      }

      const uniqueAccounts = accountsToSendNotification.filter(
        (account, index, self) =>
          index === self.findIndex((t) => t.id === account.id)
      )

      const notificationContent = await NotificationContent.findByPk(
        NotificationTypes.SOMEONE_ELSE_ADDED_BID_TO_SAME_AUCTION
      )
      if (!notificationContent || !notificationContent.enabled) {
        return
      }

      const promises = uniqueAccounts.map(async (account) => {
        if (account.id === auction.accountId) {
          return Promise.resolve([]) as Promise<unknown>
        }

        if (
          account.allowedNotifications
            .SOMEONE_ELSE_ADDED_BID_TO_SAME_AUCTION === false
        ) {
          return Promise.resolve([]) as Promise<unknown>
        }

        let notification = new Notification({
          accountId: account.id,
          type: NotificationTypes.SOMEONE_ELSE_ADDED_BID_TO_SAME_AUCTION,
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

          try {
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
                type: NotificationTypes.SOMEONE_ELSE_ADDED_BID_TO_SAME_AUCTION,
                auctionId: auction.id,
                accountId: account.id,
              },
              android: {
                notification: {
                  color: '#D94F30',
                },
              },
            })
            return Promise.resolve([]) as Promise<unknown>
          } catch (error) {
            return Promise.resolve([]) as Promise<unknown>
          }
        }
      })

      await Promise.all(promises)
    } catch (error) {
      console.error(
        'Could not send someone else added bid to same auction notification',
        error
      )
    }
  }
}

const notificationInstance = new BidCompetitionNotification()
export { notificationInstance as BidCompetitionNotification }
