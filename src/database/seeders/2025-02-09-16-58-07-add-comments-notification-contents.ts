import sequelize from 'sequelize'
import { NotificationContent } from '../../modules/auxiliary-models/notification-content.js'
import { NotificationTypes } from '../../lib/notifications/types.js'

const NEW_REPLY_COMMENT_NOTIFICATION = {
  title: {
    en: 'New reply to your comment',
    ro: 'Răspuns nou la comentariul tău',
    fr: 'Nouvelle réponse à votre commentaire',
    de: 'Neue Antwort auf Ihren Kommentar',
    it: 'Nuova risposta al tuo commento',
    es: 'Nueva respuesta a tu comentario',
    ja: 'あなたのコメントへの新しい返信',
    ar: 'رد جديد على تعليقك',
  },
  description: {
    en: '{{userName}} added a new reply to your comment.',
    ro: '{{userName}} a adăugat un răspuns nou la comentariul tău.',
    fr: '{{userName}} a ajouté une nouvelle réponse à votre commentaire.',
    de: '{{userName}} hat eine neue Antwort auf Ihren Kommentar hinzugefügt.',
    it: '{{userName}} ha aggiunto una nuova risposta al tuo commento.',
    es: '{{userName}} agregó una nueva respuesta a tu comentario.',
    ja: '{{userName}} があなたのコメントに新しい返信を追加しました。',
    ar: '{{userName}} قد أضاف إجابة جديدة على تعليقك.',
  },
}

const NEW_COMMENT_NOTIFICATION = {
  title: {
    en: 'New comment on your auction',
    ro: 'Comentariu nou la licitația ta',
    fr: 'Nouveau commentaire sur votre enchère',
    de: 'Neuer Kommentar zu Ihrer Auktion',
    it: 'Nuovo commento sulla tua asta',
    es: 'Nuevo comentario en tu subasta',
    ja: 'あなたのオークションへの新しいコメント',
    ar: 'تعليق جديد على إعلانك',
  },
  description: {
    en: '{{userName}} added a new comment to your auction.',
    ro: '{{userName}} a adăugat un comentariu nou la licitația ta.',
    fr: '{{userName}} a ajouté un nouveau commentaire à votre enchère.',
    de: '{{userName}} hat einen neuen Kommentar zu Ihrer Auktion hinzugefügt.',
    it: '{{userName}} ha aggiunto un nuovo commento alla tua asta.',
    es: '{{userName}} agregó un nuevo comentario a tu subasta.',
    ja: '{{userName}} があなたのオークションに新しいコメントを追加しました。',
    ar: '{{userName}} قد أضاف تعليق جديد على إعلانك.',
  },
}

const COMMENT_ON_SAME_AUCTION_NOTIFICATION = {
  title: {
    en: 'New comment on auction you commented',
    ro: 'Comentariu nou la licitația la care ai comentat',
    fr: "Nouveau commentaire sur l'enchère que vous avez commentée",
    de: 'Neuer Kommentar zur Auktion, die Sie kommentiert haben',
    it: "Nuovo commento all'asta che hai commentato",
    es: 'Nuevo comentario en la subasta que comentaste',
    ja: 'あなたがコメントしたオークションへの新しいコメント',
    ar: 'تعليق جديد على إعلان تعليقته',
  },
  description: {
    en: '{{userName}} added a new comment to an auction you commented as well.',
    ro: '{{userName}} a adăugat un comentariu nou la o licitație la care ai comentat și tu.',
    fr: '{{userName}} a ajouté un nouveau commentaire à une enchère que vous avez également commentée.',
    de: '{{userName}} hat einen neuen Kommentar zu einer Auktion hinzugefügt, die Sie ebenfalls kommentiert haben.',
    it: "{{userName}} ha aggiunto un nuovo commento a un'asta che hai commentato anche tu.",
    es: '{{userName}} agregó un nuevo comentario a una subasta que también comentaste.',
    ja: '{{userName}} があなたもコメントしたオークションに新しいコメントを追加しました。',
    ar: '{{userName}} قد أضاف تعليق جديد على إعلان تعليقته',
  },
}

export async function up({ context: queryInterface }: { context: sequelize.QueryInterface }) {
  const transaction = await queryInterface.sequelize.transaction()

  try {
    await NotificationContent.create(
      {
        type: NotificationTypes.NEW_COMMENT_ON_AUCTION,
        title: NEW_COMMENT_NOTIFICATION.title,
        description: NEW_COMMENT_NOTIFICATION.description,
        enabled: true,
      },
      { transaction }
    )

    await NotificationContent.create(
      {
        type: NotificationTypes.REPLY_ON_AUCTION_COMMENT,
        title: NEW_REPLY_COMMENT_NOTIFICATION.title,
        description: NEW_REPLY_COMMENT_NOTIFICATION.description,
        enabled: true,
      },
      { transaction }
    )

    await NotificationContent.create(
      {
        type: NotificationTypes.COMMENT_ON_SAME_AUCTION,
        title: COMMENT_ON_SAME_AUCTION_NOTIFICATION.title,
        description: COMMENT_ON_SAME_AUCTION_NOTIFICATION.description,
        enabled: true,
      },
      { transaction }
    )
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
