import sequelize from 'sequelize'
import { NotificationTypes } from '../../lib/notifications/types.js'
import { NotificationContent } from '../../modules/auxiliary-models/notification-content.js'

const NOTIFICATIONS = {
  [NotificationTypes.MY_AUCTION_STARTED]: {
    title: {
      en: 'One of your auction started',
      ro: 'Una dintre licitațiile tale a început',
      fr: 'Une de vos enchères a commencé',
      de: 'Eine Ihrer Auktionen hat begonnen',
      it: 'Una delle tue aste è iniziata',
      es: 'Una de tus subastas ha comenzado',
      ja: 'あなたのオークションの1つが開始されました',
      ar: 'بدأت إحدى مزاداتك',
    },
    description: {
      en: 'Your auction has started. Good luck!',
      ro: 'Licitația ta a început. Mult noroc!',
      fr: 'Votre enchère a commencé. Bonne chance!',
      de: 'Ihre Auktion hat begonnen. Viel Glück!',
      it: 'La tua asta è iniziata. Buona fortuna!',
      es: 'Tu subasta ha comenzado. ¡Buena suerte!',
      ja: 'あなたのオークションが開始されました。 がんばろう！',
      ar: 'بدأت مزادك. حظا طيبا!',
    },
  },
  [NotificationTypes.AUCTION_FROM_FAVOURITES_STARTED]: {
    title: {
      en: 'One of your favourite auctions started',
      ro: 'Una dintre licitațiile tale favorite a început',
      fr: 'Une de vos enchères favorites a commencé',
      de: 'Eine Ihrer Lieblingsauktionen hat begonnen',
      it: 'Una delle tue aste preferite è iniziata',
      es: 'Una de tus subastas favoritas ha comenzado',
      ja: 'お気に入りのオークションの1つが開始されました',
      ar: 'بدأت إحدى مزاداتك المفضلة',
    },
    description: {
      en: 'One of your favourite auctions has started. Good luck!',
      ro: 'Una dintre licitațiile tale favorite a început. Mult noroc!',
      fr: 'Une de vos enchères favorites a commencé. Bonne chance!',
      de: 'Eine Ihrer Lieblingsauktionen hat begonnen. Viel Glück!',
      it: 'Una delle tue aste preferite è iniziata. Buona fortuna!',
      es: 'Una de tus subastas favoritas ha comenzado. ¡Buena suerte!',
      ja: 'お気に入りのオークションの1つが開始されました。 がんばろう！',
      ar: 'بدأت إحدى مزاداتك المفضلة. حظا طيبا!',
    },
  },
}

export async function up({ context: queryInterface }: { context: sequelize.QueryInterface }) {
  const transaction = await queryInterface.sequelize.transaction()

  try {
    for (const [type, { title, description }] of Object.entries(NOTIFICATIONS)) {
      await NotificationContent.create(
        {
          type,
          title,
          description,
        },
        { transaction }
      )
    }
    await transaction.commit()
  } catch (error) {
    console.error(error)
    await transaction.rollback()
    throw error
  }
}

export async function down({ context: queryInterface }: { context: sequelize.QueryInterface }) {
  const transaction = await queryInterface.sequelize.transaction()

  try {
    // Make sure you add your down seed/migration here and use the above created transaction if necessary

    await transaction.commit()
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}
