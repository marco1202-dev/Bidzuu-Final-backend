import { Op } from 'sequelize'
import { Account } from '../../../modules/accounts/model.js'
import { Auction } from '../../../modules/auctions/model.js'
import { NotificationContent } from '../../../modules/auxiliary-models/notification-content.js'
import { Favourite } from '../../../modules/favourites/model.js'
import { Notification } from '../../../modules/notifications/model.js'
import { WebSubscriptions } from '../../../web-subscriptions.js'
import { WebSocketInstance } from '../../../ws/instance.js'
import { WebsocketEvents } from '../../../ws/socket-module.js'
import { FCMNotificationItem, NotificationTypes } from '../types.js'
import admin from 'firebase-admin'

class FavouriteAuctionStartedNotification implements FCMNotificationItem {
  send = async (auction: Auction) => {
    try {
      const favourites = await Favourite.findAll({
        where: {
          auctionId: auction.id,
          accountId: { [Op.ne]: auction.accountId },
        },
      })
      if (!favourites.length) {
        return
      }

      const uniqueAccountIds = [...new Set(favourites.map((el) => el.accountId))]
      if (!uniqueAccountIds.length) {
        return
      }

      const notificationContent = await NotificationContent.findByPk(
        NotificationTypes.AUCTION_FROM_FAVOURITES_STARTED
      )
      if (!notificationContent || !notificationContent.enabled) {
        return
      }

      for (const accountId of uniqueAccountIds) {
        const account = await Account.findByPk(accountId)
        if (!account) {
          return
        }

        if (account.allowedNotifications.AUCTION_FROM_FAVOURITES_STARTED === false) {
          return
        }

        const language = (account.meta.appLanguage || 'en') as string

        let notification = new Notification({
          accountId,
          type: NotificationTypes.AUCTION_FROM_FAVOURITES_STARTED,
          entityId: auction.id,
          title: notificationContent.title,
          description: notificationContent.description,
        })

        notification = await notification.save()

        const socketInstance = WebSocketInstance.getInstance()
        socketInstance.sendEventToAccount(
          account.id,
          WebsocketEvents.AUCTION_FROM_FAVOURITES_STARTED,
          {
            ...notification,
          }
        )

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
              type: NotificationTypes.AUCTION_FROM_FAVOURITES_STARTED,
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
      console.error(`Error sending favourite auction started notification: ${error}`)
    }
  }
}

const notificationInstance = new FavouriteAuctionStartedNotification()
export { notificationInstance as FavouriteAuctionStartedNotification }
