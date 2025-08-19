import admin from 'firebase-admin'
import { Account } from '../../../modules/accounts/model.js'
import { Auction } from '../../../modules/auctions/model.js'
import { Notification } from '../../../modules/notifications/model.js'
import { FCMNotificationItem, NotificationTypes } from '../types.js'
import { NotificationContent } from '../../../modules/auxiliary-models/notification-content.js'
import { WebSubscriptions } from '../../../web-subscriptions.js'
import { WebSocketInstance } from '../../../ws/instance.js'
import { WebsocketEvents } from '../../../ws/socket-module.js'

class NewOfferOnAuctionNotification implements FCMNotificationItem {
  send = async (auction: Auction, offererId: string, offerAmount: number, offerMessage?: string) => {
    try {
      console.log(`[NEW_OFFER] Starting notification for auction ${auction.id}, offerer ${offererId}`)

      const ownerOfAuction = await Account.findByPk(auction.accountId)
      if (!ownerOfAuction) {
        console.error(`[NEW_OFFER] Auction owner not found for auction ${auction.id}`)
        return
      }

      console.log(`[NEW_OFFER] Found auction owner: ${ownerOfAuction.id}`)

      const language = (ownerOfAuction.meta.appLanguage || 'en') as string
      console.log(`[NEW_OFFER] User language: ${language}`)
      console.log(`[NEW_OFFER] Looking up notification content for type: ${NotificationTypes.NEW_OFFER_ON_AUCTION}`)

      // Try to find notification content by type
      let notificationContent = await NotificationContent.findByPk(
        NotificationTypes.NEW_OFFER_ON_AUCTION
      )

      // If not found by primary key, try to find by type
      if (!notificationContent) {
        console.log(`[NEW_OFFER] Not found by primary key, trying to find by type`)
        notificationContent = await NotificationContent.findOne({
          where: { type: NotificationTypes.NEW_OFFER_ON_AUCTION }
        })
      }

      // If still not found, create it manually
      if (!notificationContent) {
        console.log(`[NEW_OFFER] Notification content not found, creating it manually`)
        try {
          notificationContent = await NotificationContent.create({
            type: NotificationTypes.NEW_OFFER_ON_AUCTION,
            title: {
              en: '💰 New offer received',
              fr: '💰 Nouvelle offre reçue',
              ro: '💰 Ofertă nouă primită',
              de: '💰 Neues Angebot erhalten',
              it: '💰 Nuova offerta ricevuta',
              es: '💰 Nueva oferta recibida',
              ja: '💰 新しいオファーを受信'
            },
            description: {
              en: 'You received a new offer on your auction',
              fr: 'Vous avez reçu une nouvelle offre sur votre enchère',
              ro: 'Ai primit o nouă ofertă la licitația ta',
              de: 'Sie haben ein neues Angebot für Ihre Auktion erhalten',
              it: 'Hai ricevuto una nuova offerta per la tua asta',
              es: 'Has recibido una nueva oferta en tu subasta',
              ja: 'あなたのオークションに新しいオファーを受け取りました'
            },
            enabled: true
          })
          console.log(`[NEW_OFFER] Created notification content successfully`)
        } catch (error) {
          console.error(`[NEW_OFFER] Failed to create notification content:`, error)
          // If we can't create the content, use fallback content
          notificationContent = {
            type: NotificationTypes.NEW_OFFER_ON_AUCTION,
            title: { en: '💰 New offer received' },
            description: { en: 'You received a new offer on your auction' },
            enabled: true
          } as any
        }
      }

      console.log(`[NEW_OFFER] Notification content lookup result:`, notificationContent)

      // Ensure we have valid notification content
      if (!notificationContent || !notificationContent.enabled) {
        console.error(`[NEW_OFFER] Still no valid notification content, using hardcoded fallback`)
        notificationContent = {
          type: NotificationTypes.NEW_OFFER_ON_AUCTION,
          title: { en: '💰 New offer received' },
          description: { en: 'You received a new offer on your auction' },
          enabled: true
        } as any
      }

      // Validate notification content structure
      console.log(`[NEW_OFFER] Final notification content:`, {
        type: notificationContent.type,
        title: notificationContent.title,
        description: notificationContent.description,
        enabled: notificationContent.enabled,
        titleKeys: Object.keys(notificationContent.title || {}),
        descriptionKeys: Object.keys(notificationContent.description || {})
      })

      // Ensure title and description are valid
      if (!notificationContent.title || !notificationContent.description) {
        console.error(`[NEW_OFFER] Invalid notification content structure`)
        return
      }

      if (ownerOfAuction.allowedNotifications.NEW_OFFER_ON_AUCTION === false) {
        console.log(`[NEW_OFFER] User ${ownerOfAuction.id} has disabled offer notifications`)
        return
      }

      console.log(`[NEW_OFFER] Creating notification for user ${ownerOfAuction.id}`)

      // Validate notification type
      console.log(`[NEW_OFFER] Notification type: ${NotificationTypes.NEW_OFFER_ON_AUCTION}`)
      console.log(`[NEW_OFFER] Valid notification types:`, Object.values(NotificationTypes))

      let notification = new Notification({
        accountId: ownerOfAuction.id,
        type: NotificationTypes.NEW_OFFER_ON_AUCTION,
        entityId: auction.id,
        title: notificationContent.title,
        description: notificationContent.description,
        initiatedByAccountId: offererId,
        read: false,
      })

      console.log(`[NEW_OFFER] Notification object created:`, {
        accountId: notification.accountId,
        type: notification.type,
        entityId: notification.entityId,
        title: notification.title,
        description: notification.description,
        initiatedByAccountId: notification.initiatedByAccountId,
        read: notification.read
      })

      try {
        notification = await notification.save()
        console.log(`[NEW_OFFER] Notification created successfully with ID: ${notification.id}`)

        // Test: Try to fetch the notification back from database
        const savedNotification = await Notification.findByPk(notification.id)
        if (savedNotification) {
          console.log(`[NEW_OFFER] Successfully retrieved notification from database:`, {
            id: savedNotification.id,
            accountId: savedNotification.accountId,
            type: savedNotification.type,
            entityId: savedNotification.entityId,
            read: savedNotification.read,
            createdAt: savedNotification.createdAt
          })
        } else {
          console.error(`[NEW_OFFER] Failed to retrieve notification from database after save`)
        }

      } catch (saveError) {
        console.error(`[NEW_OFFER] Failed to save notification:`, saveError)
        console.error(`[NEW_OFFER] Save error details:`, {
          message: saveError.message,
          stack: saveError.stack,
          notificationData: {
            accountId: notification.accountId,
            type: notification.type,
            entityId: notification.entityId,
            initiatedByAccountId: notification.initiatedByAccountId
          }
        })
        return
      }

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
            body: notification.description[language] ?? notification.description['en'],
          },
          data: {
            auctionId: auction.id,
            notificationId: notification.id,
            type: NotificationTypes.NEW_OFFER_ON_AUCTION,
            accountId: ownerOfAuction.id,
            offererId: offererId,
            offerAmount: offerAmount.toString(),
            offerMessage: offerMessage || '',
          },
          android: {
            notification: {
              color: '#D94F30',
            },
          },
        })
        console.log(`[NEW_OFFER] FCM notification sent to device`)
      } else {
        console.log(`[NEW_OFFER] No FCM token for user ${ownerOfAuction.id}`)
      }

      console.log(`[NEW_OFFER] Notification process completed successfully`)
    } catch (error) {
      console.error('Could not send new offer on auction notification:', error)
      console.error('Error details:', {
        auctionId: auction?.id,
        offererId,
        offerAmount,
        offerMessage,
        error: error.message,
        stack: error.stack
      })
    }
  }
}

const notificationInstance = new NewOfferOnAuctionNotification()
export { notificationInstance as NewOfferOnAuctionNotification }
