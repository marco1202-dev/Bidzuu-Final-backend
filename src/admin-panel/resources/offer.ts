import { Offer } from '../../modules/offers/model.js'

export const createOfferResource = () => {
  return {
    resource: Offer,
    options: {
      navigation: {
        name: 'General',
        icon: 'Home',
      },
      properties: {
        id: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },
        auctionId: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
        offererId: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
        amount: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
        message: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
        status: {
          isVisible: { list: true, filter: true, show: true, edit: true },
          availableValues: [
            { value: 'pending', label: 'Pending' },
            { value: 'accepted', label: 'Accepted' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'countered', label: 'Countered' },
          ],
        },
        rejectionReason: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
        counterOfferAmount: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
        counterOfferMessage: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
        currencyId: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
        initialPriceInDollars: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
        usedExchangeRateId: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
        createdAt: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },
        updatedAt: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },
      },
      listProperties: [
        'id',
        'auctionId',
        'offererId',
        'amount',
        'status',
        'currencyId',
        'createdAt',
      ],
      editProperties: [
        'auctionId',
        'offererId',
        'amount',
        'message',
        'status',
        'rejectionReason',
        'counterOfferAmount',
        'counterOfferMessage',
        'currencyId',
        'initialPriceInDollars',
        'usedExchangeRateId',
      ],
      showProperties: [
        'id',
        'auctionId',
        'offererId',
        'amount',
        'message',
        'status',
        'rejectionReason',
        'counterOfferAmount',
        'counterOfferMessage',
        'currencyId',
        'initialPriceInDollars',
        'usedExchangeRateId',
        'createdAt',
        'updatedAt',
      ],
      filterProperties: [
        'id',
        'auctionId',
        'offererId',
        'status',
        'currencyId',
        'createdAt',
        'updatedAt',
      ],
    },
  }
}
