import admin from 'firebase-admin'
import { Account } from '../../../modules/accounts/model.js'
import { Auction } from '../../../modules/auctions/model.js'
import { Notification } from '../../../modules/notifications/model.js'
import { FCMNotificationItem, NotificationTypes } from '../types.js'
import { NotificationContent } from '../../../modules/auxiliary-models/notification-content.js'
import { WebSubscriptions } from '../../../web-subscriptions.js'
import { WebSocketInstance } from '../../../ws/instance.js'
import { WebsocketEvents } from '../../../ws/socket-module.js'

class BidRemovedNotification implements FCMNotificationItem {
  content = {
    title: {
      en: 'Bid removed from your auction',
      ro: 'Ofertă ștearsă',
      fr: 'Offre retirée de votre enchère',
      de: 'Gebot von Ihrer Auktion entfernt',
      it: 'Offerta rimossa dalla tua asta',
      es: 'Oferta eliminada de tu subasta',
      ja: 'あなたのオークションから入札が削除されました',
    },
    description: {
      en: 'A bid was removed from one of your auctions',
      ro: 'O ofertă a fost ștearsă de la una dintre licitațiile tale',
      fr: "Une offre a été retirée de l'une de vos enchères",
      de: 'Ein Gebot wurde von einer Ihrer Auktionen entfernt',
      it: "Un'offerta è stata rimossa da una delle tue aste",
      es: 'Se eliminó una oferta de una de tus subastas',
      ja: 'あなたのオークションの1つから入札が削除されました',
    },
  }

  send = async (auctionId: string) => {
    try {
      const auction = await Auction.findByPk(auctionId)
      const ownerOfAuction = await Account.findByPk(auction.accountId)
      if (!ownerOfAuction) {
        return
      }

      const language = (ownerOfAuction.meta.appLanguage || 'en') as string
      const notificationContent = await NotificationContent.findByPk(
        NotificationTypes.BID_REMOVED_ON_AUCTION
      )
      if (!notificationContent || !notificationContent.enabled) {
        return
      }

      if (
        ownerOfAuction.allowedNotifications.BID_REMOVED_ON_AUCTION === false
      ) {
        return
      }

      let notification = new Notification({
        accountId: ownerOfAuction.id,
        type: NotificationTypes.BID_REMOVED_ON_AUCTION,
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
            type: NotificationTypes.BID_REMOVED_ON_AUCTION,
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
      console.error('Coult not send bid deleted notification', error)
    }
  }
}

const notificationInstance = new BidRemovedNotification()
export { notificationInstance as BidRemovedNotification }
