import sequelize from 'sequelize'
import { NotificationTypes } from '../../lib/notifications/types.js'
import { NotificationContent } from '../../modules/auxiliary-models/notification-content.js'

const NOTIFICATIONS = {
  [NotificationTypes.AUCTION_ADDED_TO_FAVOURITES]: {
    title: {
      en: 'Auction added to favourites',
      ro: 'Licitație adăugată la favorite',
      fr: 'Enchère ajoutée aux favoris',
      de: 'Auktion zu Favoriten hinzugefügt',
      it: 'Asta aggiunta ai preferiti',
      es: 'Subasta añadida a favoritos',
      ja: 'お気に入りに追加されたオークション',
    },
    description: {
      en: `{{userName}} added your auction to favourites`,
      ro: `{{userName}} a adăugat licitația ta la favorite`,
      fr: `{{userName}} a ajouté votre enchère aux favoris`,
      de: `{{userName}} hat Ihre Auktion zu den Favoriten hinzugefügt`,
      it: `{{userName}} ha aggiunto la tua asta ai preferiti`,
      es: `{{userName}} añadió tu subasta a favoritos`,
      ja: `{{userName}} さんがお気に入りにオークションを追加しました`,
    },
  },
  [NotificationTypes.NEW_AUCTION_FROM_FOLLOWING]: {
    title: {
      en: 'New auction from someone you follow',
      ro: 'Licitație nouă',
      fr: "Nouvelle enchère d'une personne que vous suivez",
      de: 'Neue Auktion von jemandem, dem Sie folgen',
      it: 'Nuova asta da qualcuno che segui',
      es: 'Nueva subasta de alguien que sigues',
      ja: 'フォローしている人からの新しいオークション',
    },
    description: {
      en: `{{auctionCreatorName}} created a new auction!`,
      ro: `{{auctionCreatorName}} a creat o licitație nouă!`,
      fr: `{{auctionCreatorName}} a créé une nouvelle enchère!`,
      de: `{{auctionCreatorName}} hat eine neue Auktion erstellt!`,
      it: `{{auctionCreatorName}} ha creato una nuova asta!`,
      es: `{{auctionCreatorName}} ha creado una nueva subasta!`,
      ja: `{{auctionCreatorName}} さんが新しいオークションを作成しました！`,
    },
  },
  [NotificationTypes.AUCTION_UPDATED]: {
    title: {
      en: 'Auction updated',
      ro: 'Licitație updatată',
      fr: 'Enchère mise à jour',
      de: 'Auktion aktualisiert',
      it: 'Asta aggiornata',
      es: 'Subasta actualizada',
      ja: 'オークションが更新されました',
    },
    description: {
      en: 'An auction you bid on has been updated',
      ro: 'O licitație la care ai licitat a fost updatată',
      fr: 'Une enchère sur laquelle vous avez enchéri a été mise à jour',
      de: 'Eine Auktion, auf die Sie geboten haben, wurde aktualisiert',
      it: "Un'asta su cui hai fatto un'offerta è stata aggiornata",
      es: 'Una subasta en la que has pujado ha sido actualizada',
      ja: '入札したオークションが更新されました',
    },
  },
  [NotificationTypes.BID_ACCEPTED_ON_AUCTION]: {
    title: {
      en: 'Your bid was accepted',
      ro: 'Oferta ta a fost acceptată',
      fr: 'Votre offre a été acceptée',
      de: 'Ihr Gebot wurde angenommen',
      it: 'La tua offerta è stata accettata',
      es: 'Tu oferta fue aceptada',
      ja: '入札が受け入れられました',
    },
    description: {
      en: 'Your bid was chosen as the winner of an auction',
      ro: 'Oferta ta a fost aleasă câștigătoare la o licitație',
      fr: "Votre offre a été choisie comme gagnante d'une enchère",
      de: 'Ihr Gebot wurde als Gewinner einer Auktion ausgewählt',
      it: "La tua offerta è stata scelta come vincitrice di un'asta",
      es: 'Tu oferta fue elegida como la ganadora de una subasta',
      ja: 'あなたの入札がオークションの勝者として選ばれました',
    },
  },
  [NotificationTypes.AUCTION_FROM_FAVOURITES_HAS_BID]: {
    title: {
      en: 'Auction from favourites has a new bid',
      ro: 'Licitația din favorite are o nouă ofertă',
      fr: 'Une enchère de vos favoris a une nouvelle offre',
      de: 'Auktion aus den Favoriten hat ein neues Gebot',
      it: "L'asta dai preferiti ha una nuova offerta",
      es: 'Una subasta de tus favoritos tiene una nueva oferta',
      ja: 'お気に入りのオークションに新しい入札がありました',
    },
    description: {
      en: 'A new bid was added to an auction you added to favourites',
      ro: 'O nouă ofertă a fost adăugată la o licitație pe care ai adăugat-o la favorite',
      fr: 'Une nouvelle offre a été ajoutée à une enchère que vous avez ajoutée aux favoris',
      de: 'Ein neues Gebot wurde zu einer Auktion hinzugefügt, die Sie zu den Favoriten hinzugefügt haben',
      it: "Una nuova offerta è stata aggiunta a un'asta che hai aggiunto ai preferiti",
      es: 'Se añadió una nueva oferta a una subasta que agregaste a favoritos',
      ja: 'お気に入りに追加したオークションに新しい入札が追加されました',
    },
  },
  [NotificationTypes.BID_REJECTED_ON_AUCTION]: {
    title: {
      en: 'Your bid was rejected',
      ro: 'Oferta ta a fost respinsă',
      fr: 'Votre offre a été rejetée',
      de: 'Ihr Gebot wurde abgelehnt',
      it: 'La tua offerta è stata respinta',
      es: 'Tu oferta fue rechazada',
      ja: '入札が拒否されました',
    },
    description: {
      en: 'Unfortunately your bid was rejected for an auction',
      ro: 'Din păcate oferta ta a fost respinsă pentru o licitație',
      fr: 'Malheureusement, votre offre a été rejetée pour une enchère',
      de: 'Leider wurde Ihr Gebot für eine Auktion abgelehnt',
      it: "Sfortunatamente la tua offerta è stata respinta per un'asta",
      es: 'Desafortunadamente, tu oferta fue rechazada para una subasta',
      ja: '残念ながら、あなたの入札はオークションで拒否されました',
    },
  },
  [NotificationTypes.BID_REMOVED_ON_AUCTION]: {
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
  },
  [NotificationTypes.BID_WAS_SEEN]: {
    title: {
      en: 'Your bid was seen',
      ro: 'Oferta a fost văzută',
      fr: 'Votre offre a été vue',
      de: 'Ihr Gebot wurde gesehen',
      it: 'La tua offerta è stata vista',
      es: 'Tu oferta fue vista',
      ja: 'あなたの入札が見られました',
    },
    description: {
      en: 'Your bid was seen by the auction creator. You will be notified if your bid is accepted or rejected',
      ro: 'Oferta pe care ai facut-o a fost văzută de către creatorul licitației. Vei primi o altă notificare dacă oferta este acceptată sau respinsă',
      fr: "Votre offre a été vue par le créateur de l'enchère. Vous serez notifié si votre offre est acceptée ou rejetée",
      de: 'Ihr Gebot wurde vom Auktionsersteller gesehen. Sie werden benachrichtigt, wenn Ihr Gebot angenommen oder abgelehnt wird',
      it: "La tua offerta è stata vista dal creatore dell'asta. Verrai notificato se la tua offerta sarà accettata o rifiutata",
      es: 'Tu oferta fue vista por el creador de la subasta. Serás notificado si tu oferta es aceptada o rechazada',
      ja: 'あなたの入札はオークションの作成者によって見られました。入札が承認または拒否された場合に通知されます',
    },
  },
  [NotificationTypes.SOMEONE_ELSE_ADDED_BID_TO_SAME_AUCTION]: {
    title: {
      en: 'Bid to the same auction was added',
      ro: 'A fost adăugată o ofertă la aceeași licitație',
      fr: 'Une offre à la même enchère a été ajoutée',
      de: 'Gebot zur gleichen Auktion hinzugefügt',
      it: "Aggiunta un'offerta alla stessa asta",
      es: 'Se añadió una oferta a la misma subasta',
      ja: '同じオークションに入札が追加されました',
    },
    description: {
      en: 'A new bid was added to an auction you bid on',
      ro: 'O nouă ofertă a fost adăugată la o licitație la care ai licitat și tu',
      fr: 'Une nouvelle offre a été ajoutée à une enchère sur laquelle vous avez enchéri',
      de: 'Ein neues Gebot wurde zu einer Auktion hinzugefügt, auf die Sie geboten haben',
      it: "Una nuova offerta è stata aggiunta a un'asta su cui hai fatto un'offerta",
      es: 'Se añadió una nueva oferta a una subasta en la que pujastе',
      ja: 'あなたが入札したオークションに新しい入札が追加されました',
    },
  },
  [NotificationTypes.FAVOURITE_AUCTION_PRICE_CHANGE]: {
    title: {
      en: '👀 Favourite auction price change',
      ro: '👀 Prețul licitației favorite a fost modificat',
      fr: "👀 Changement de prix d'enchère favorite",
      de: '👀 Preisänderung der Favoritenauktion',
      it: "👀 Cambio di prezzo dell'asta preferita",
      es: '👀 Cambio de precio de subasta favorita',
      ja: '👀 お気に入りのオークションの価格変更',
    },
    description: {
      en: `One of your favourite auction price has been changed from {{oldPrice}} to {{newPrice}}`,
      ro: `Prețul uneia dintre licitațiile tale favorite a fost modificat de la {{oldPrice}} la {{newPrice}}`,
      fr: `Le prix de l'une de vos enchères favorites a été modifié de {{oldPrice}} à {{newPrice}}`,
      de: `Der Preis einer Ihrer Favoritenauktionen wurde von {{oldPrice}} auf {{newPrice}} geändert`,
      it: `Il prezzo di una delle tue aste preferite è stato modificato da {{oldPrice}} a {{newPrice}}`,
      es: `El precio de una de tus subastas favoritas ha sido modificado de {{oldPrice}} a {{newPrice}}`,
      ja: `お気に入りのオークションの価格が {{oldPrice}} から {{newPrice}} に変更されました`,
    },
  },
  [NotificationTypes.NEW_BID_ON_AUCTION]: {
    title: {
      en: 'New bid on your auction',
      ro: 'Ofertă nouă la licitația ta',
      fr: 'Nouvelle offre sur votre enchère',
      de: 'Neues Gebot auf Ihrer Auktion',
      it: 'Nuova offerta sulla tua asta',
      es: 'Nueva oferta en tu subasta',
      ja: 'あなたのオークションに新しい入札',
    },
    description: {
      en: 'A new bid was added to one of your auctions',
      ro: 'O nouă ofertă a fost adăugată la una dintre licitațiile tale',
      fr: "Une nouvelle offre a été ajoutée à l'une de vos enchères",
      de: 'Ein neues Gebot wurde zu einer Ihrer Auktionen hinzugefügt',
      it: 'Una nuova offerta è stata aggiunta a una delle tue aste',
      es: 'Se añadió una nueva oferta a una de tus subastas',
      ja: 'あなたのオークションの1つに新しい入札が追加されました',
    },
  },
  [NotificationTypes.NEW_FOLLOWER]: {
    title: {
      en: 'New follower',
      ro: 'Urmăritor nou',
      fr: 'Nouveau suiveur',
      de: 'Neuer Follower',
      it: 'Nuovo follower',
      es: 'Nuevo seguidor',
      ja: '新しいフォロワー',
    },
    description: {
      en: `{{followerName}} started following you`,
      ro: `{{followerName}} a fost adăugat la urmăritorii tăi`,
      fr: `{{followerName}} a commencé à vous suivre`,
      de: `{{followerName}} hat angefangen, Ihnen zu folgen`,
      it: `{{followerName}} ha iniziato a seguirti`,
      es: `{{followerName}} ha comenzado a seguirte`,
      ja: `{{followerName}} さんがあなたをフォローし始めました`,
    },
  },
  [NotificationTypes.NEW_MESSAGE]: {
    title: {
      en: '💬 New message',
      ro: '💬 Mesaj nou',
      fr: '💬 Nouveau message',
      de: '💬 Neue Nachricht',
      it: '💬 Nuovo messaggio',
      es: '💬 Nuevo mensaje',
      ja: '💬 新しいメッセージ',
    },
    description: {
      en: 'You have a new message from someone',
      ro: 'Ai un mesaj nou de la cineva',
      fr: "Vous avez un nouveau message de quelqu'un",
      de: 'Sie haben eine neue Nachricht von jemandem',
      it: 'Hai un nuovo messaggio da qualcuno',
      es: 'Tienes un nuevo mensaje de alguien',
      ja: '誰かから新しいメッセージがあります',
    },
  },
  [NotificationTypes.REVIEW_RECEIVED]: {
    title: {
      en: 'You received a new review',
      ro: 'Ai primit o nouă recenzie',
      fr: 'Vous avez reçu un nouvel avis',
      de: 'Sie haben eine neue Bewertung erhalten',
      it: 'Hai ricevuto una nuova recensione',
      es: 'Has recibido una nueva reseña',
      ja: '新しいレビューを受け取りました',
    },
    description: {
      en: 'You received a new review from another user',
      ro: 'Ai primit o nouă recenzie de la un alt utilizator',
      fr: "Vous avez reçu un nouvel avis d'un autre utilisateur",
      de: 'Sie haben eine neue Bewertung von einem anderen Nutzer erhalten',
      it: 'Hai ricevuto una nuova recensione da un altro utente',
      es: 'Has recibido una nueva reseña de otro usuario',
      ja: '別のユーザーから新しいレビューを受け取りました',
    },
  },
  [NotificationTypes.NEW_OFFER_ON_AUCTION]: {
    title: {
      en: '💰 New offer received',
      ro: '💰 Ofertă nouă primită',
      fr: '💰 Nouvelle offre reçue',
      de: '💰 Neues Angebot erhalten',
      it: '💰 Nuova offerta ricevuta',
      es: '💰 Nueva oferta recibida',
      ja: '💰 新しいオファーを受信',
    },
    description: {
      en: 'You received a new offer on your auction',
      ro: 'Ai primit o nouă ofertă la licitația ta',
      fr: 'Vous avez reçu une nouvelle offre sur votre enchère',
      de: 'Sie haben ein neues Angebot für Ihre Auktion erhalten',
      it: 'Hai ricevuto una nuova offerta per la tua asta',
      es: 'Has recibido una nueva oferta en tu subasta',
      ja: 'あなたのオークションに新しいオファーを受け取りました',
    },
  },
}

export async function up({
  context: queryInterface,
}: {
  context: sequelize.QueryInterface
}) {
  const transaction = await queryInterface.sequelize.transaction()

  try {
    for (const [type, { title, description }] of Object.entries(
      NOTIFICATIONS
    )) {
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

export async function down({
  context: queryInterface,
}: {
  context: sequelize.QueryInterface
}) {
  const transaction = await queryInterface.sequelize.transaction()

  try {
    // Make sure you add your down seed/migration here and use the above created transaction if necessary

    await transaction.commit()
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}
